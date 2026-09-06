import { safeGetStorage, safeSetStorage } from './safeStorage';

export interface TruckDishStockItem {
  soldOut: boolean;
  dailyStock?: number;
  remainingStock?: number;
  priceOverride?: number;
}

export interface TruckStockData {
  [truckId: string]: {
    [dishId: string]: TruckDishStockItem;
  };
}

const STORAGE_KEY_TRUCK_STOCK = 'obsidian_truck_dish_stock_overrides';
export const TRUCK_STOCK_EVENT = 'obsidian_truck_stock_changed';

/**
 * 获取所有餐车的独立商品库存与沽清配置
 */
export function getTruckStockData(): TruckStockData {
  return safeGetStorage<TruckStockData>(STORAGE_KEY_TRUCK_STOCK, {
    'truck-01': {},
    'truck-02': {},
    'truck-03': {}
  });
}

/**
 * 保存并广播库存配置
 */
export function saveTruckStockData(data: TruckStockData): void {
  safeSetStorage(STORAGE_KEY_TRUCK_STOCK, data);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TRUCK_STOCK_EVENT, { detail: data }));
  }
}

/**
 * 判断指定菜品在指定餐车上是否可用（未售罄且未下架）
 */
export function isDishAvailableForTruck(
  dishId: string,
  truckId: string,
  baseAvailable: boolean = true
): boolean {
  if (!baseAvailable) return false;
  const data = getTruckStockData();
  const truckOverrides = data[truckId];
  if (!truckOverrides) return baseAvailable;
  const dishOverride = truckOverrides[dishId];
  if (!dishOverride) return baseAvailable;
  if (dishOverride.soldOut) return false;
  if (dishOverride.remainingStock !== undefined && dishOverride.remainingStock <= 0) return false;
  return true;
}

/**
 * 切换或设置指定餐车下某菜品的单车独立沽清状态
 */
export function setDishStockForTruck(
  truckId: string,
  dishId: string,
  soldOut: boolean,
  dailyStock?: number,
  remainingStock?: number
): void {
  const data = getTruckStockData();
  if (!data[truckId]) {
    data[truckId] = {};
  }
  data[truckId][dishId] = {
    ...data[truckId][dishId],
    soldOut,
    ...(dailyStock !== undefined ? { dailyStock } : {}),
    ...(remainingStock !== undefined ? { remainingStock } : {})
  };
  saveTruckStockData(data);
}

/**
 * 订阅单车库存变动事件
 */
export function subscribeTruckStock(callback: (data: TruckStockData) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => {
    const custom = e as CustomEvent<TruckStockData>;
    callback(custom.detail || getTruckStockData());
  };
  window.addEventListener(TRUCK_STOCK_EVENT, handler);
  return () => window.removeEventListener(TRUCK_STOCK_EVENT, handler);
}
