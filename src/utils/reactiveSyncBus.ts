/**
 * Urban Radar 流动餐车 GPS 极速专送平台 - 全局低延迟反应式数据联动总线 (Reactive Sync Bus)
 * 
 * 核心设计目标:
 * 打通客户端 (Customer)、商家端 (Merchant POS/KDS/Inventory)、骑手端 (Rider) 与平台端 (Platform)
 * 的双向数据感知与页面即时联动，支持跨组件、跨视窗与跨标签页的微秒级事件订阅与自愈分发。
 */

export type ReactiveEventType =
  | 'DISH_PRICE_CHANGED'        // 菜品改价或售罄状态变更 -> 食客端菜单与购物车联动
  | 'KDS_DISH_FINISHED'         // KDS 厨房后厨划单出品 -> 食客端雷达与骑手派送池联动
  | 'TRUCK_LOCATION_MOVED'      // 餐车 GPS 坐标移动或展开收起 -> 全域地图与电子围栏联动
  | 'ORDER_STATUS_MUTATED'      // 订单状态流转 (接单/备餐/骑手在途/已送达) -> 全局联动
  | 'INVENTORY_STOCK_ALERT'     // 原物料低水位或损耗过大 -> 商家后厨与采购联动
  | 'SENTINEL_POLICY_TRIGGERED' // 自动化安全策略触发 (限流/收缩配送半径/熔断) -> 全端联动
  | 'EMERGENCY_PEAK_MITIGATION' // 爆单紧急削峰与排队限流 -> 客户端加购提示与时延调整
  | 'FRANCHISE_POLICY_LOCKED';  // 总部下发爆品配方强锁定 -> 各分舵与餐车工作台锁定

export interface ReactivePayloadMap {
  DISH_PRICE_CHANGED: { dishId: string; newPrice?: number; isSoldOut?: boolean; operator: string };
  KDS_DISH_FINISHED: { orderId: string; dishName: string; station: 'grill' | 'barista'; finishedAt: string };
  TRUCK_LOCATION_MOVED: { truckId: string; coordinates: [number, number]; radiusKm: number; address: string };
  ORDER_STATUS_MUTATED: { orderId: string; oldStatus: string; newStatus: string; updatedAt: string };
  INVENTORY_STOCK_ALERT: { materialId: string; materialName: string; currentStock: number; safeStock: number };
  SENTINEL_POLICY_TRIGGERED: { policyId: string; level: 'info' | 'warning' | 'critical'; title: string; actionApplied: string };
  EMERGENCY_PEAK_MITIGATION: { isActive: boolean; queueDelayMinutes: number; restrictedCategories?: string[]; reason: string };
  FRANCHISE_POLICY_LOCKED: { lockedSkuIds: string[]; lockedPricePolicy: boolean; enforcedBy: string };
}

type EventCallback<T extends ReactiveEventType> = (payload: ReactivePayloadMap[T]) => void;

class ReactiveSyncBusEngine {
  private listeners: Map<ReactiveEventType, Set<EventCallback<any>>> = new Map();
  private broadcastChannel: BroadcastChannel | null = null;
  private channelName = 'urban_radar_reactive_sync_v1';

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel(this.channelName);
        this.broadcastChannel.onmessage = (event) => {
          if (event && event.data && event.data.type) {
            this.dispatchLocal(event.data.type, event.data.payload, false);
          }
        };
      } catch (e) {
        console.warn('[ReactiveBus] BroadcastChannel 初始化受限，使用内存总线:', e);
      }
    }
  }

  /**
   * 订阅特定响应式事件
   */
  public subscribe<T extends ReactiveEventType>(eventType: T, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    const set = this.listeners.get(eventType)!;
    set.add(callback);

    return () => {
      set.delete(callback);
    };
  }

  /**
   * 发布全局事件并同步跨视窗与本窗口所有监听器
   */
  public publish<T extends ReactiveEventType>(eventType: T, payload: ReactivePayloadMap[T]): void {
    // 1. 本地窗口派发
    this.dispatchLocal(eventType, payload, true);

    // 2. 跨窗口/跨标签页广播
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type: eventType, payload });
      } catch (err) {
        console.warn('[ReactiveBus] 跨标签广播异常:', err);
      }
    }
  }

  private dispatchLocal<T extends ReactiveEventType>(
    eventType: T,
    payload: ReactivePayloadMap[T],
    broadcastDomEvent = true
  ): void {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(payload);
        } catch (err) {
          console.error(`[ReactiveBus] 事件处理回调异常 [${eventType}]:`, err);
        }
      });
    }

    // 兼容派发原生 DOM CustomEvent
    if (broadcastDomEvent && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(`reactive_bus:${eventType}`, {
          detail: payload
        })
      );
    }
  }
}

export const reactiveSyncBus = new ReactiveSyncBusEngine();
