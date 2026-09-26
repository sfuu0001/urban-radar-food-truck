import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Truck,
  ChevronDown,
  Check,
  Radio,
  RefreshCw,
  Zap,
  Moon,
  AlertTriangle,
  Power,
  UtensilsCrossed,
  ShoppingBag,
  QrCode,
  History,
  Trash2,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Wifi,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  Layers
} from 'lucide-react';
import {
  getAllTruckBusinessStatuses,
  setTruckBusinessStatus,
  DEFAULT_TRUCK_BUSINESS_STATUSES
} from '../../utils/businessStatusEngine';
import { safeGetStorage, safeSetStorage } from '../../utils/safeStorage';

export interface StationChannelState {
  master: boolean;
  dine: boolean;
  delivery: boolean;
  pickup: boolean;
}

export interface AuditLogEntry {
  id: string;
  time: string;
  msg: string;
  stateCode: string;
  colorClass: string;
}

export interface ToastItem {
  id: string;
  message: string;
  isSuccess: boolean;
}

const STATION_NAMES: Record<number, string> = {
  1: '01号·旗舰餐车',
  2: '02号·科技园先锋车',
  3: '03号·潮玩艺术车',
  4: '04号·外滩滨江车',
  5: '05号·后备机动车'
};

const CHANNEL_NAMES: Record<string, string> = {
  dine: '堂食',
  delivery: '外卖',
  pickup: '自提'
};

const INITIAL_STATIONS: Record<number, StationChannelState> = {
  1: { master: true, dine: true, delivery: true, pickup: true },
  2: { master: true, dine: false, delivery: true, pickup: true },
  3: { master: true, dine: true, delivery: false, pickup: true },
  4: { master: false, dine: false, delivery: false, pickup: false },
  5: { master: true, dine: false, delivery: true, pickup: true }
};

interface MerchantPrecisionConsoleV2Props {
  onStationSelect?: (stationId: number) => void;
  selectedTruckId?: string;
  onSwitchToV1?: () => void;
}

export const MerchantPrecisionConsoleV2: React.FC<MerchantPrecisionConsoleV2Props> = ({
  onStationSelect,
  selectedTruckId,
  onSwitchToV1
}) => {
  // 1. 初始化站点供售状态（从 businessStatusEngine 读取并双向联动）
  const loadStationsFromBusinessEngine = useCallback((): Record<number, StationChannelState> => {
    try {
      const all = getAllTruckBusinessStatuses();
      const res: Record<number, StationChannelState> = {};
      for (let i = 1; i <= 5; i++) {
        const tid = `truck-0${i}`;
        const cfg = all[tid] || DEFAULT_TRUCK_BUSINESS_STATUSES[tid];
        if (cfg) {
          res[i] = {
            master: cfg.isOpen,
            dine: cfg.dineInOpen !== false,
            delivery: cfg.deliveryOpen !== false,
            pickup: cfg.pickupOpen !== false
          };
        } else {
          res[i] = INITIAL_STATIONS[i] || { master: true, dine: true, delivery: true, pickup: true };
        }
      }
      return res;
    } catch {
      return INITIAL_STATIONS;
    }
  }, []);

  const [stations, setStations] = useState<Record<number, StationChannelState>>(loadStationsFromBusinessEngine);

  useEffect(() => {
    const handleStatusChange = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail?.allStatuses) {
        const all = custom.detail.allStatuses;
        setStations((prev) => {
          const next = { ...prev };
          for (let i = 1; i <= 5; i++) {
            const tid = `truck-0${i}`;
            const cfg = all[tid];
            if (cfg) {
              next[i] = {
                master: cfg.isOpen,
                dine: cfg.dineInOpen !== false,
                delivery: cfg.deliveryOpen !== false,
                pickup: cfg.pickupOpen !== false
              };
            }
          }
          return next;
        });
      } else {
        setStations(loadStationsFromBusinessEngine());
      }
    };

    window.addEventListener('obsidian_business_status_changed', handleStatusChange);
    return () => window.removeEventListener('obsidian_business_status_changed', handleStatusChange);
  }, [loadStationsFromBusinessEngine]);

  // 2. 站点选择器
  const [selectedStationId, setSelectedStationId] = useState<number>(() => {
    if (selectedTruckId) {
      const parsed = parseInt(selectedTruckId.replace('truck-0', ''), 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) return parsed;
    }
    const saved = safeGetStorage('obsidian_merchant_selected_truck', 'truck-01');
    const parsedSaved = parseInt(saved.replace('truck-0', ''), 10);
    return !isNaN(parsedSaved) && parsedSaved >= 1 && parsedSaved <= 5 ? parsedSaved : 1;
  });

  const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedTruckId) {
      const parsed = parseInt(selectedTruckId.replace('truck-0', ''), 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 5 && parsed !== selectedStationId) {
        setSelectedStationId(parsed);
      }
    }
  }, [selectedTruckId, selectedStationId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUnitDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // 3. KPI 展开/折叠状态
  const [expandedKpis, setExpandedKpis] = useState<Record<string, boolean>>({});
  const toggleKpi = (key: string) => {
    setExpandedKpis((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // 4. 底部遥测抽屉状态
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // 5. Toast 提示
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const showToast = useCallback((message: string, isSuccess: boolean = true) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, isSuccess }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2400);
  }, []);

  // 6. 审计日志流水
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([
    {
      id: 'init',
      time: new Date().toTimeString().split(' ')[0],
      msg: '控制中枢完成启动，5个餐车站点遥测握手成功',
      stateCode: 'READY',
      colorClass: 'text-[#006494]'
    }
  ]);

  const appendAuditLog = useCallback((msg: string, stateCode: string, colorClass: string) => {
    const time = new Date().toTimeString().split(' ')[0];
    const newEntry: AuditLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      time,
      msg,
      stateCode,
      colorClass
    };
    setAuditLogs((prev) => [newEntry, ...prev.slice(0, 7)]);
  }, []);

  const clearLogs = () => {
    setAuditLogs([]);
    appendAuditLog('审计缓冲区已清空', 'BUFFER_CLEARED', 'text-[#71767B]');
    showToast('审计日志展示缓冲区已清空', true);
  };

  // 7. 切换单个渠道开关
  const toggleChannel = (stationId: number, channelKey: 'dine' | 'delivery' | 'pickup', silent: boolean = false) => {
    const current = stations[stationId] || INITIAL_STATIONS[stationId];
    const nextActive = !current[channelKey];
    const nextStation: StationChannelState = {
      ...current,
      [channelKey]: nextActive
    };

    const anyActive = nextStation.dine || nextStation.delivery || nextStation.pickup;
    nextStation.master = anyActive;

    setStations((prev) => ({
      ...prev,
      [stationId]: nextStation
    }));

    const truckId = `truck-0${stationId}`;
    setTruckBusinessStatus(
      truckId,
      {
        isOpen: nextStation.master,
        dineInOpen: nextStation.dine,
        deliveryOpen: nextStation.delivery,
        pickupOpen: nextStation.pickup
      },
      '打样主控副本'
    );

    if (!silent) {
      const sName = STATION_NAMES[stationId];
      const cName = CHANNEL_NAMES[channelKey];
      const statusZh = nextActive ? '已开启接单' : '已暂停打样';
      showToast(`【${sName}】${cName}渠道${statusZh}`, nextActive);
      appendAuditLog(
        `${sName}: ${cName} -> ${nextActive ? '开启接单' : '打烊休市'}`,
        nextActive ? 'ACTIVE' : 'HALTED',
        nextActive ? 'text-[#006494]' : 'text-[#71767B]'
      );
    }
  };

  // 8. 切换站点总控开关 (Killswitch)
  const toggleMasterSwitch = (stationId: number, silent: boolean = false) => {
    const current = stations[stationId] || INITIAL_STATIONS[stationId];
    const targetState = !current.master;

    const nextStation: StationChannelState = {
      master: targetState,
      dine: targetState,
      delivery: targetState,
      pickup: targetState
    };

    setStations((prev) => ({
      ...prev,
      [stationId]: nextStation
    }));

    const truckId = `truck-0${stationId}`;
    setTruckBusinessStatus(
      truckId,
      {
        isOpen: targetState,
        dineInOpen: targetState,
        deliveryOpen: targetState,
        pickupOpen: targetState
      },
      '打样主控副本'
    );

    const sName = STATION_NAMES[stationId];
    if (!silent) {
      const msg = targetState ? `【${sName}】总开关：一键全渠道开启` : `【${sName}】总开关：全线休市打样`;
      showToast(msg, targetState);
      appendAuditLog(
        `${sName}: 总开关操作 -> ${targetState ? '全渠道激活' : '全线打烊'}`,
        targetState ? 'ONLINE_ALL' : 'HALTED_ALL',
        targetState ? 'text-[#006494]' : 'text-[#D32F2F]'
      );
    }
  };

  // 9. 批处理：全网接单 / 全线打样
  const batchSetAll = (openState: boolean) => {
    const next: Record<number, StationChannelState> = {};
    for (let i = 1; i <= 5; i++) {
      next[i] = {
        master: openState,
        dine: openState,
        delivery: openState,
        pickup: openState
      };
      setTruckBusinessStatus(
        `truck-0${i}`,
        {
          isOpen: openState,
          dineInOpen: openState,
          deliveryOpen: openState,
          pickupOpen: openState
        },
        '批处理总线'
      );
    }
    setStations(next);
    const title = openState ? '一键全网接单' : '晚市全线打样';
    showToast(`批处理完成: ${title}`, openState);
    appendAuditLog(
      `批处理指令: 全网5大餐车站点 ${openState ? '全渠道激活上线' : '统一休市打样'}`,
      openState ? 'BATCH_ON' : 'BATCH_OFF',
      openState ? 'text-[#006494]' : 'text-[#71767B]'
    );
  };

  // 10. 极端气象熔断
  const emergencyShutdown = () => {
    const updated: Record<number, StationChannelState> = {};
    for (let i = 1; i <= 5; i++) {
      updated[i] = {
        master: false,
        dine: false,
        delivery: false,
        pickup: false
      };
      setTruckBusinessStatus(
        `truck-0${i}`,
        {
          isOpen: false,
          dineInOpen: false,
          deliveryOpen: false,
          pickupOpen: false
        },
        '气象熔断'
      );
    }
    setStations(updated);
    showToast('⚠️ 气象熔断：全站点已切断供售', false);
    appendAuditLog('极端气象熔断: 已强制关闭所有站点渠道供售', 'EMERGENCY_SHUTDOWN', 'text-[#D32F2F]');
  };

  // 站点元数据描述表
  const stationMetadata: Record<
    number,
    {
      title: string;
      location: string;
      descDine: string;
      descDelivery: string;
      descPickup: string;
      prepLabel: string;
      prepCode: string;
    }
  > = {
    1: {
      title: '01号·旗舰餐车',
      location: '前海天幕集市广场 A区-01 // 客流: 142人/h',
      descDine: '7桌就餐 · 翻台旺盛',
      descDelivery: '双平台正常 · 运力充沛',
      descPickup: '智能柜 65°C 恒温保温中',
      prepLabel: '全渠道营业',
      prepCode: 'ONLINE 0x01'
    },
    2: {
      title: '02号·科技园先锋车',
      location: '高新南十道站 腾讯双子塔东 // 堂食排队过长',
      descDine: '满座限流 · 席位饱和 (SEAT_SATURATED)',
      descDelivery: '气象微调 · 降速接单 (WEATHER_THROTTLED)',
      descPickup: '5格待取 · 恒温就绪',
      prepLabel: '部分限流',
      prepCode: 'THROTTLED'
    },
    3: {
      title: '03号·潮玩艺术车',
      location: 'OCT创意艺术港 潮玩主入口 // 运力拥堵暂缓',
      descDine: '高翻台高峰 · 轮候中 (TURNOVER_PEAK)',
      descDelivery: '运力告急 · 派单暂缓 (COURIER_DEPLETED)',
      descPickup: '餐柜满格 · 引导转柜 (LOCKER_FULL)',
      prepLabel: '晚市备料',
      prepCode: 'PREP // 0x03'
    },
    4: {
      title: '04号·外滩滨江车',
      location: '黄浦滨江流动观景区 // 设备维护保养中',
      descDine: '全线打样休市',
      descDelivery: '外送闭店停止',
      descPickup: '自检锁柜维护',
      prepLabel: '全线打烊',
      prepCode: 'HALTED 0x00'
    },
    5: {
      title: '05号·后备机动车',
      location: '中央总厨应急机动基地 // 随时响应突发客流',
      descDine: '驻车待命 · 低能耗态 (POWER_SAVING)',
      descDelivery: '溢流应急承接中',
      descPickup: '冷链保鲜监测正常',
      prepLabel: '部分营业',
      prepCode: 'ONLINE 0x05'
    }
  };

  const activeStationCount = Object.values(stations).filter((s) => s.master).length;
  const activeStationRatio = Math.round((activeStationCount / 5) * 100);

  return (
    <div
      style={{
        backgroundColor: '#F4F4F2',
        color: '#111827',
        fontFamily: '"Space Grotesk", "Hanken Grotesk", sans-serif'
      }}
      className="min-h-full w-full text-[13px] leading-normal p-2 sm:p-4 lg:p-6 relative antialiased selection:bg-[#006494] selection:text-white"
    >
      {/* Toast 提示容器 */}
      <div className="fixed top-4 right-4 left-4 sm:left-auto sm:right-6 max-w-[420px] ml-auto z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2.5 px-3 py-2 rounded-[3px] border text-xs shadow-lg transition-all duration-200 animate-in fade-in slide-in-from-top-2 ${
              toast.isSuccess
                ? 'bg-white border-[#006494]/30 text-[#111827] shadow-cyan-900/10'
                : 'bg-[#FCFCFB] border-[#CCCCCC] text-[#71767B] shadow-black/5'
            }`}
          >
            <div className="flex items-center gap-1.5 shrink-0">
              {toast.isSuccess ? (
                <CheckCircle2 className="w-4 h-4 text-[#006494] shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-[#D32F2F] shrink-0" />
              )}
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  toast.isSuccess ? 'bg-[#3BB4FE] animate-ping' : 'bg-[#D32F2F]'
                }`}
              />
            </div>
            <span className="font-semibold truncate tracking-tight">{toast.message}</span>
          </div>
        ))}
      </div>

      <div className="max-w-[1560px] mx-auto flex flex-col gap-3 sm:gap-4">
        {/* ========================================================================= */}
        {/* 1. 顶部控制总线（手机端专属单排紧凑流动布局 / 桌面端精密对齐）               */}
        {/* ========================================================================= */}
        <header className="bg-white border border-[#E2E2DF] rounded-[4px] shadow-2xs p-2.5 sm:px-4 sm:py-3 flex flex-col gap-2.5">
          {/* 第一行：严格按照图片样式的胶囊主标 + 副本标识 + 桌面模式切换 */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 shrink-0">
              {/* 核心胶囊微标：严格按照上传图片样式 1:1 精确复刻 */}
              <div className="h-8 px-3.5 rounded-full bg-white border border-neutral-900 text-neutral-950 flex items-center gap-1.5 shrink-0 shadow-2xs select-none">
                <Radio className="w-3.5 h-3.5 text-neutral-950 shrink-0" />
                <span className="text-xs font-bold tracking-tight whitespace-nowrap">全渠道供售打样主控</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              </div>

              {/* 副本形态标识 */}
              <span className="px-2 py-0.5 rounded-full bg-[#E8F3FA] text-[#006494] border border-[#006494]/30 text-[10.5px] font-bold tracking-tight whitespace-nowrap">
                V2 专属副本
              </span>
            </div>

            {/* 右端：切回 V1 或辅助控制 */}
            {onSwitchToV1 && (
              <button
                type="button"
                onClick={onSwitchToV1}
                className="h-7 px-2.5 rounded-full bg-white hover:bg-neutral-50 text-neutral-600 border border-neutral-300 text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors shadow-2xs shrink-0"
                title="返回原版主控控制台"
              >
                <Layers className="w-3 h-3 text-neutral-500" />
                <span>切回原版</span>
              </button>
            )}
          </div>

          {/* 第二行（手机端独立平铺 / 桌面端横向一体）：站点切换器 + 硬件遥测 + 批处理三键 */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pt-2 border-t border-[#E2E2DF]/60">
            {/* 左侧：站点选择器 + 遥测链路 */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4 w-full lg:w-auto">
              {/* Unit Selector */}
              <div className="flex flex-col w-full sm:w-auto" ref={dropdownRef}>
                <div className="flex items-center gap-1.5 text-[#71767B] text-[10px] font-bold uppercase tracking-wider mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#006494] animate-ping" />
                  <span className="text-[#111827]">UNIT SELECTOR // 站点实时切换</span>
                </div>
                <div className="relative group w-full">
                  <button
                    type="button"
                    onClick={() => setIsUnitDropdownOpen((prev) => !prev)}
                    className="w-full sm:w-auto h-8 flex items-center justify-between gap-2 px-3 bg-[#F9F9F8] hover:bg-[#F0F0EE] border border-[#CCCCCC] rounded-[3px] text-[#111827] text-xs font-semibold transition-all active:scale-[0.98] min-w-full sm:min-w-[270px] cursor-pointer"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Truck className="w-3.5 h-3.5 text-[#006494] shrink-0" />
                      <span className="tracking-tight truncate font-bold">
                        {STATION_NAMES[selectedStationId]} ({stations[selectedStationId]?.master ? '营业中' : '已打样'})
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-[#71767B] transition-transform duration-200 ${
                        isUnitDropdownOpen ? 'rotate-180 text-[#111827]' : ''
                      }`}
                    />
                  </button>

                  {/* 弹出菜单 Popover */}
                  {isUnitDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-full bg-white border border-[#CCCCCC] shadow-xl z-50 flex flex-col py-1 rounded-[3px] animate-in fade-in zoom-in-95 duration-150">
                      {[1, 2, 3, 4, 5].map((uId) => {
                        const isCur = selectedStationId === uId;
                        const sName = STATION_NAMES[uId];
                        const stState = stations[uId];
                        let note = stState?.master ? '营业中' : '已打样';
                        let noteClass = stState?.master ? 'text-[#006494] font-bold' : 'text-[#71767B] font-semibold';
                        if (stState?.master && (!stState.dine || !stState.delivery || !stState.pickup)) {
                          note = '部分限流';
                          noteClass = 'text-[#C26D00] font-bold';
                        }

                        return (
                          <div
                            key={uId}
                            onClick={() => {
                              setSelectedStationId(uId);
                              setIsUnitDropdownOpen(false);
                              onStationSelect?.(uId);
                              const truckId = `truck-0${uId}`;
                              safeSetStorage('obsidian_merchant_selected_truck', truckId);
                              safeSetStorage('obsidian_active_truck_id', truckId);
                              window.dispatchEvent(new CustomEvent('obsidian_merchant_truck_changed', { detail: { truckId } }));
                              showToast(`终端焦点已定位: ${sName}`, true);
                              appendAuditLog(`定向关注站点: ${sName}`, 'FOCUS_SWITCH', 'text-[#006494]');
                            }}
                            className={`px-3 py-2 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                              isCur ? 'bg-[#006494] text-white font-bold' : 'hover:bg-[#F3F4F6] text-[#111827]'
                            }`}
                          >
                            <span className="truncate">{sName}</span>
                            {isCur ? (
                              <Check className="w-3.5 h-3.5 shrink-0 ml-2" />
                            ) : (
                              <span className={`shrink-0 ml-2 text-[10px] ${noteClass}`}>{note}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Hardware Telemetry Link Badges */}
              <div className="flex items-center gap-4 sm:pl-4 sm:border-l border-[#E2E2DF] py-1 justify-between sm:justify-start">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <Radio className="w-3 h-3 text-[#006494] animate-pulse" />
                    <span className="text-[9.5px] text-[#71767B] font-bold uppercase">HARDWARE RTK-5G</span>
                  </div>
                  <span className="text-xs text-[#006494] font-bold">99.98% LOCKED</span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 text-[#71767B]" />
                    <span className="text-[9.5px] text-[#71767B] font-bold uppercase">POS / CLOUD</span>
                  </div>
                  <span className="text-xs text-[#111827] font-bold">4ms // ENCRYPTED</span>
                </div>
              </div>
            </div>

            {/* 右侧：批处理操作总线（手机端 3 键均匀网格，桌面端行内排布） */}
            <div className="flex items-center gap-1.5 w-full lg:w-auto pt-2 lg:pt-0 border-t lg:border-t-0 border-[#E2E2DF]">
              <div className="grid grid-cols-3 sm:flex sm:items-center gap-1.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => batchSetAll(true)}
                  className="h-8 px-2 sm:px-3 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-[3px] flex items-center justify-center gap-1 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
                  title="开启全网所有餐车各渠道"
                >
                  <Zap className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                  <span className="truncate">全网接单</span>
                </button>
                <button
                  type="button"
                  onClick={() => batchSetAll(false)}
                  className="h-8 px-2 sm:px-3 bg-white hover:bg-neutral-50 text-neutral-700 border border-[#CCCCCC] rounded-[3px] flex items-center justify-center gap-1 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
                  title="关闭全网所有餐车站台渠道"
                >
                  <Moon className="w-3.5 h-3.5 text-neutral-500" />
                  <span className="truncate">全线打样</span>
                </button>
                <button
                  type="button"
                  onClick={emergencyShutdown}
                  className="h-8 px-2 sm:px-3 bg-white hover:bg-rose-50 text-[#D32F2F] border border-rose-300 rounded-[3px] flex items-center justify-center gap-1 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
                  title="紧急关停所有餐车供售通道"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-[#D32F2F]" />
                  <span className="truncate">气象熔断</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* 2. 4宫格遥测 KPI 指标带（手机端 2x2 网格，触控平滑折叠/展开）                */}
        {/* ========================================================================= */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
          {/* Card 1: Stations Network */}
          <div
            onClick={() => toggleKpi('stations')}
            className="bg-white p-2.5 rounded-[3px] border border-[#CCCCCC]/70 shadow-2xs flex flex-col justify-between transition-all hover:border-[#006494] cursor-pointer active:scale-[0.99] select-none"
          >
            <div className="flex items-center justify-between text-[#71767B] text-[10px] pb-1 border-b border-[#E2E2DF]">
              <span className="font-bold tracking-tight text-[#111827] flex items-center gap-1 truncate">
                <span className="w-1.5 h-1.5 bg-[#001020] shrink-0" />
                <span className="truncate">STATIONS // 餐车站网</span>
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] font-bold text-[#006494] bg-[#E8F3FA] px-1 py-0.5 rounded-[2px] border border-[#006494]/20">
                  {activeStationRatio}% 活跃
                </span>
                <ChevronDown
                  className={`w-3 h-3 text-[#71767B] transition-transform duration-200 ${
                    expandedKpis.stations ? 'rotate-180 text-[#006494]' : ''
                  }`}
                />
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] leading-none">
                  {activeStationCount}
                </span>
                <span className="text-[10px] text-[#71767B]">/5台在线</span>
              </div>
              <div className="flex items-center gap-0.5 w-12 sm:w-16">
                {[1, 2, 3, 4, 5].map((id) => (
                  <div
                    key={id}
                    className={`h-1 flex-1 transition-colors duration-300 ${
                      stations[id]?.master ? 'bg-[#006494]' : 'bg-[#CCCCCC]/40'
                    }`}
                    title={`0${id}号 ${stations[id]?.master ? '营业' : '休市'}`}
                  />
                ))}
              </div>
            </div>
            {expandedKpis.stations && (
              <div className="mt-2 pt-1.5 border-t border-[#E2E2DF] flex flex-col gap-1 text-[10px] text-[#71767B] animate-in fade-in duration-150">
                <div className="flex justify-between">
                  <span>在网电压:</span>
                  <span className="text-[#111827] font-bold">380V // OK</span>
                </div>
                <div className="flex justify-between">
                  <span>基带信噪比:</span>
                  <span className="text-[#006494] font-bold">42dB SNR</span>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Dine-in Occupancy */}
          <div
            onClick={() => toggleKpi('dine')}
            className="bg-white p-2.5 rounded-[3px] border border-[#CCCCCC]/70 shadow-2xs flex flex-col justify-between transition-all hover:border-[#006494] cursor-pointer active:scale-[0.99] select-none"
          >
            <div className="flex items-center justify-between text-[#71767B] text-[10px] pb-1 border-b border-[#E2E2DF]">
              <span className="font-bold tracking-tight text-[#111827] flex items-center gap-1 truncate">
                <span className="w-1.5 h-1.5 bg-[#006494] shrink-0" />
                <span className="truncate">DINE-IN // 堂食翻台</span>
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] font-bold text-[#006494] bg-[#E8F3FA] px-1 py-0.5 rounded-[2px] border border-[#006494]/20">
                  4.2次/日
                </span>
                <ChevronDown
                  className={`w-3 h-3 text-[#71767B] transition-transform duration-200 ${
                    expandedKpis.dine ? 'rotate-180 text-[#006494]' : ''
                  }`}
                />
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-[#006494] leading-none">
                  92.4%
                </span>
                <span className="text-[10px] text-[#71767B]">周转率</span>
              </div>
              <div className="w-12 sm:w-16 bg-[#EAEAE8] h-1 overflow-hidden">
                <div className="bg-[#006494] h-full" style={{ width: '92.4%' }} />
              </div>
            </div>
            {expandedKpis.dine && (
              <div className="mt-2 pt-1.5 border-t border-[#E2E2DF] flex flex-col gap-1 text-[10px] text-[#71767B] animate-in fade-in duration-150">
                <div className="flex justify-between">
                  <span>在席等待:</span>
                  <span className="text-[#111827] font-bold">18 位</span>
                </div>
                <div className="flex justify-between">
                  <span>平均驻留:</span>
                  <span className="text-[#006494] font-bold">23.5 min</span>
                </div>
              </div>
            )}
          </div>

          {/* Card 3: Delivery SLA */}
          <div
            onClick={() => toggleKpi('delivery')}
            className="bg-white p-2.5 rounded-[3px] border border-[#CCCCCC]/70 shadow-2xs flex flex-col justify-between transition-all hover:border-[#006494] cursor-pointer active:scale-[0.99] select-none"
          >
            <div className="flex items-center justify-between text-[#71767B] text-[10px] pb-1 border-b border-[#E2E2DF]">
              <span className="font-bold tracking-tight text-[#111827] flex items-center gap-1 truncate">
                <span className="w-1.5 h-1.5 bg-[#001020] shrink-0" />
                <span className="truncate">DELIVERY // 外卖履约</span>
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] font-bold text-[#006494] bg-[#F0F6F9] px-1 py-0.5 rounded-[2px] border border-[#006494]/20">
                  ▲ 2.1m
                </span>
                <ChevronDown
                  className={`w-3 h-3 text-[#71767B] transition-transform duration-200 ${
                    expandedKpis.delivery ? 'rotate-180 text-[#006494]' : ''
                  }`}
                />
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] leading-none">
                  16.8
                </span>
                <span className="text-[10px] text-[#71767B]">min 均时</span>
              </div>
              <div className="w-12 sm:w-16 bg-[#EAEAE8] h-1 overflow-hidden">
                <div className="bg-[#001020] h-full" style={{ width: '82%' }} />
              </div>
            </div>
            {expandedKpis.delivery && (
              <div className="mt-2 pt-1.5 border-t border-[#E2E2DF] flex flex-col gap-1 text-[10px] text-[#71767B] animate-in fade-in duration-150">
                <div className="flex justify-between">
                  <span>骑手响应:</span>
                  <span className="text-[#111827] font-bold">1.4 min</span>
                </div>
                <div className="flex justify-between">
                  <span>延误报警:</span>
                  <span className="text-[#006494] font-bold">25.0 min</span>
                </div>
              </div>
            )}
          </div>

          {/* Card 4: Cabin */}
          <div
            onClick={() => toggleKpi('cabin')}
            className="bg-white p-2.5 rounded-[3px] border border-[#CCCCCC]/70 shadow-2xs flex flex-col justify-between transition-all hover:border-[#C26D00] cursor-pointer active:scale-[0.99] select-none"
          >
            <div className="flex items-center justify-between text-[#71767B] text-[10px] pb-1 border-b border-[#E2E2DF]">
              <span className="font-bold tracking-tight text-[#111827] flex items-center gap-1 truncate">
                <span className="w-1.5 h-1.5 bg-[#C26D00] shrink-0" />
                <span className="truncate">CABIN // 智能取餐柜</span>
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] font-bold text-[#C26D00] bg-[#FFF4E5] px-1 py-0.5 rounded-[2px] border border-[#C26D00]/20">
                  10格空闲
                </span>
                <ChevronDown
                  className={`w-3 h-3 text-[#71767B] transition-transform duration-200 ${
                    expandedKpis.cabin ? 'rotate-180 text-[#C26D00]' : ''
                  }`}
                />
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-[#C26D00] leading-none">
                  14
                </span>
                <span className="text-[10px] text-[#71767B]">格待取 (58%)</span>
              </div>
              <div className="w-12 sm:w-16 bg-[#EAEAE8] h-1 overflow-hidden">
                <div className="bg-[#C26D00] h-full" style={{ width: '58%' }} />
              </div>
            </div>
            {expandedKpis.cabin && (
              <div className="mt-2 pt-1.5 border-t border-[#E2E2DF] flex flex-col gap-1 text-[10px] text-[#71767B] animate-in fade-in duration-150">
                <div className="flex justify-between">
                  <span>柜温控制:</span>
                  <span className="text-[#C26D00] font-bold">62.4℃ // 恒定</span>
                </div>
                <div className="flex justify-between">
                  <span>灭菌状态:</span>
                  <span className="text-[#111827] font-bold">UV // NORMAL</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. 核心主控矩阵：5 大餐车独立工控卡片流（手机端单列 / 桌面端精密栅格）   */}
        {/* ========================================================================= */}
        <section className="bg-white border border-[#CCCCCC]/70 rounded-[4px] shadow-sm overflow-hidden flex flex-col">
          {/* 标题栏与图例说明 */}
          <div className="p-3 sm:px-4 sm:py-3 border-b border-[#E2E2DF] flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-[#FCFCFB]">
            <div className="flex items-center gap-2.5">
              <div className="w-1.5 h-6 bg-[#001020] shrink-0" />
              <div>
                <h2 className="font-bold text-[14px] sm:text-[15px] tracking-tight text-[#111827]">
                  全渠道供售与营业打样主控矩阵
                </h2>
                <p className="text-[10px] sm:text-[11px] text-[#71767B] truncate">
                  STATION OPERATIONAL STATUS &amp; MULTI-CHANNEL MATRIX
                </p>
              </div>
            </div>
            {/* 状态图例 */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] bg-[#F4F4F2] px-2.5 py-1.5 rounded-[3px] border border-[#E2E2DF]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-[#006494] shrink-0" />
                <span className="text-[#111827] font-semibold">激活 (ACTIVE)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-[#8A9096] shrink-0" />
                <span className="text-[#71767B] font-medium">打样 (HALTED)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-[#C26D00] shrink-0" />
                <span className="text-[#111827] font-semibold">限流 (THROTTLED)</span>
              </div>
            </div>
          </div>

          {/* 桌面端专属：表头列结构 */}
          <div className="hidden lg:grid bg-[#F6F6F4] px-4 py-2 border-b border-[#CCCCCC]/60 grid-cols-12 gap-3 text-[11px] font-bold text-[#71767B] uppercase tracking-wider items-center">
            <div className="col-span-4 flex items-center gap-1.5 text-[#111827]">
              <span>餐车站号 / 实体点位 / 空间遥测</span>
            </div>
            <div className="col-span-3 flex items-center gap-1.5 text-[#111827]">
              <span>【总开关】KILLSWITCH</span>
            </div>
            <div className="col-span-5 flex items-center justify-between text-[#111827]">
              <div className="flex items-center gap-1.5">
                <span>【堂食 / 外卖 / 自提 3个独立按钮】CHANNELS</span>
              </div>
              <span className="text-[10px] text-[#71767B] font-normal lowercase">独立微动效</span>
            </div>
          </div>

          {/* 卡片容器：手机端纵向工控卡片流 / 桌面端网格对齐 */}
          <div className="divide-y divide-[#E2E2DF]">
            {[1, 2, 3, 4, 5].map((stId) => {
              const st = stations[stId];
              const meta = stationMetadata[stId];
              const isMasterOn = st?.master;
              const allChannelsOn = st?.dine && st?.delivery && st?.pickup;
              const anyChannelOn = st?.dine || st?.delivery || st?.pickup;

              // 站号徽章颜色
              let badgeBg = 'bg-[#EBEBE8] text-[#111827]';
              if (allChannelsOn) badgeBg = 'bg-[#001020] text-white';
              else if (!anyChannelOn) badgeBg = 'bg-[#E0E0DC] text-[#71767B]';

              // 站点状态标签
              let tagText = '营业中';
              let tagClass = 'bg-[#006494] text-white';
              let codeText = `ONLINE 0x0${stId}`;
              let codeClass = 'text-[#006494]';
              if (!isMasterOn) {
                tagText = '休市打样';
                tagClass = 'bg-[#EAEAE8] text-[#71767B]';
                codeText = 'HALTED 0x00';
                codeClass = 'text-[#71767B]';
              } else if (!allChannelsOn) {
                tagText = '部分限流';
                tagClass = 'bg-[#FFF4E5] text-[#C26D00] border border-[#C26D00]/30';
                codeText = 'THROTTLED';
                codeClass = 'text-[#C26D00]';
              }

              return (
                <div
                  key={stId}
                  className="p-3 sm:px-4 sm:py-3.5 bg-white hover:bg-[#FAF9F7] transition-colors flex flex-col lg:grid lg:grid-cols-12 gap-3 items-stretch lg:items-center"
                >
                  {/* Col 1: 站点基本信息 */}
                  <div className="lg:col-span-4 flex items-center justify-between lg:justify-start gap-3 min-w-0">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center font-bold text-xs sm:text-sm rounded-[3px] shrink-0 transition-all ${badgeBg}`}
                      >
                        0{stId}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs sm:text-[13px] text-[#111827] truncate">
                            {meta.title}
                          </span>
                          <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-[2px] shrink-0 ${tagClass}`}>
                            {tagText}
                          </span>
                        </div>
                        <span className="text-[10px] sm:text-[11px] text-[#71767B] truncate mt-0.5">
                          {meta.location}
                        </span>
                      </div>
                    </div>
                    {/* 手机端右侧状态指示符 */}
                    <span className={`lg:hidden text-[10.5px] font-bold shrink-0 ${codeClass}`}>
                      {codeText}
                    </span>
                  </div>

                  {/* Col 2: 站点总控开关 KILLSWITCH */}
                  <div className="lg:col-span-3 py-1.5 lg:py-0 border-y lg:border-y-0 border-[#E2E2DF]/70 my-0.5 lg:my-0">
                    <div className="flex items-center justify-between lg:justify-start gap-2.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleMasterSwitch(stId)}
                          className={`w-9 h-9 rounded-[3px] border flex items-center justify-center transition-all duration-200 active:scale-90 relative group shrink-0 cursor-pointer ${
                            isMasterOn
                              ? 'bg-[#001020] text-white border-black hover:bg-black'
                              : 'bg-[#EFEFEF] text-[#71767B] border-[#CCCCCC] hover:bg-[#E5E5E5]'
                          }`}
                          title={`0${stId}号总控开关（点击切换）`}
                        >
                          <Power className={`w-4 h-4 transition-transform ${isMasterOn ? 'text-[#3BB4FE] group-hover:scale-110' : 'text-[#71767B]'}`} />
                          <span
                            className={`w-2.5 h-2.5 rounded-full absolute -top-1 -right-1 border border-white transition-all ${
                              isMasterOn ? 'bg-[#3BB4FE] shadow-[0_0_6px_rgba(59,180,254,0.6)] animate-pulse' : 'bg-[#8A9096]'
                            }`}
                          />
                        </button>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11.5px] font-bold text-[#111827] truncate">
                            {isMasterOn ? (allChannelsOn ? '全渠道营业' : '部分限流') : '全线打样休市'}
                          </span>
                          <span className={`text-[10px] font-semibold ${codeClass}`}>
                            {codeText}
                          </span>
                        </div>
                      </div>
                      <span className="lg:hidden text-[10px] text-[#71767B] font-semibold">总控 KILLSWITCH</span>
                    </div>
                  </div>

                  {/* Col 3: 3 大独立供售通道（堂食 / 外卖 / 自提） */}
                  <div className="lg:col-span-5 grid grid-cols-3 gap-1.5 sm:gap-2">
                    {/* 堂食 */}
                    <button
                      type="button"
                      onClick={() => toggleChannel(stId, 'dine')}
                      className={`p-2 min-h-[58px] sm:min-h-[62px] border rounded-[3px] transition-all duration-200 text-left flex flex-col justify-between active:scale-[0.96] group relative cursor-pointer select-none ${
                        st?.dine
                          ? 'bg-white border-[#006494]/35 shadow-2xs'
                          : 'bg-[#F8F8F6] border-[#E2E2DF] opacity-75'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-[11px] font-bold flex items-center gap-1 ${st?.dine ? 'text-[#111827]' : 'text-[#71767B]'}`}>
                          <UtensilsCrossed className={`w-3.5 h-3.5 ${st?.dine ? 'text-[#006494]' : 'text-[#71767B]'}`} />
                          <span>堂食</span>
                        </span>
                        {/* 硬件弹簧滑块 Switch */}
                        <div
                          className={`w-6 h-3.5 border rounded-full flex items-center px-0.5 transition-colors ${
                            st?.dine ? 'bg-[#E8F3FA] border-[#006494]/40' : 'bg-[#E4E4E0] border-[#CCCCCC]'
                          }`}
                        >
                          <div
                            className={`w-2.5 h-2.5 rounded-full transition-transform duration-200 ${
                              st?.dine ? 'translate-x-[10px] bg-[#006494] shadow-[0_0_4px_rgba(0,100,148,0.5)]' : 'translate-x-0 bg-[#8A9096]'
                            }`}
                          />
                        </div>
                      </div>
                      <div className="mt-1 flex flex-col">
                        <span className={`text-[11px] font-bold ${st?.dine ? 'text-[#006494]' : 'text-[#71767B]'}`}>
                          {st?.dine ? '开启中' : '已打样'}
                        </span>
                        <span className="text-[9.5px] text-[#71767B] truncate">{meta.descDine}</span>
                      </div>
                    </button>

                    {/* 外卖 */}
                    <button
                      type="button"
                      onClick={() => toggleChannel(stId, 'delivery')}
                      className={`p-2 min-h-[58px] sm:min-h-[62px] border rounded-[3px] transition-all duration-200 text-left flex flex-col justify-between active:scale-[0.96] group relative cursor-pointer select-none ${
                        st?.delivery
                          ? 'bg-white border-[#006494]/35 shadow-2xs'
                          : 'bg-[#F8F8F6] border-[#E2E2DF] opacity-75'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-[11px] font-bold flex items-center gap-1 ${st?.delivery ? 'text-[#111827]' : 'text-[#71767B]'}`}>
                          <ShoppingBag className={`w-3.5 h-3.5 ${st?.delivery ? 'text-[#006494]' : 'text-[#71767B]'}`} />
                          <span>外卖</span>
                        </span>
                        <div
                          className={`w-6 h-3.5 border rounded-full flex items-center px-0.5 transition-colors ${
                            st?.delivery ? 'bg-[#E8F3FA] border-[#006494]/40' : 'bg-[#E4E4E0] border-[#CCCCCC]'
                          }`}
                        >
                          <div
                            className={`w-2.5 h-2.5 rounded-full transition-transform duration-200 ${
                              st?.delivery ? 'translate-x-[10px] bg-[#006494] shadow-[0_0_4px_rgba(0,100,148,0.5)]' : 'translate-x-0 bg-[#8A9096]'
                            }`}
                          />
                        </div>
                      </div>
                      <div className="mt-1 flex flex-col">
                        <span className={`text-[11px] font-bold ${st?.delivery ? 'text-[#006494]' : 'text-[#71767B]'}`}>
                          {st?.delivery ? '开启中' : '已打样'}
                        </span>
                        <span className="text-[9.5px] text-[#71767B] truncate">{meta.descDelivery}</span>
                      </div>
                    </button>

                    {/* 自提 */}
                    <button
                      type="button"
                      onClick={() => toggleChannel(stId, 'pickup')}
                      className={`p-2 min-h-[58px] sm:min-h-[62px] border rounded-[3px] transition-all duration-200 text-left flex flex-col justify-between active:scale-[0.96] group relative cursor-pointer select-none ${
                        st?.pickup
                          ? 'bg-white border-[#006494]/35 shadow-2xs'
                          : 'bg-[#F8F8F6] border-[#E2E2DF] opacity-75'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-[11px] font-bold flex items-center gap-1 ${st?.pickup ? 'text-[#111827]' : 'text-[#71767B]'}`}>
                          <QrCode className={`w-3.5 h-3.5 ${st?.pickup ? 'text-[#006494]' : 'text-[#71767B]'}`} />
                          <span>自提</span>
                        </span>
                        <div
                          className={`w-6 h-3.5 border rounded-full flex items-center px-0.5 transition-colors ${
                            st?.pickup ? 'bg-[#E8F3FA] border-[#006494]/40' : 'bg-[#E4E4E0] border-[#CCCCCC]'
                          }`}
                        >
                          <div
                            className={`w-2.5 h-2.5 rounded-full transition-transform duration-200 ${
                              st?.pickup ? 'translate-x-[10px] bg-[#006494] shadow-[0_0_4px_rgba(0,100,148,0.5)]' : 'translate-x-0 bg-[#8A9096]'
                            }`}
                          />
                        </div>
                      </div>
                      <div className="mt-1 flex flex-col">
                        <span className={`text-[11px] font-bold ${st?.pickup ? 'text-[#006494]' : 'text-[#71767B]'}`}>
                          {st?.pickup ? '开启中' : '已打样'}
                        </span>
                        <span className="text-[9.5px] text-[#71767B] truncate">{meta.descPickup}</span>
                      </div>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. 底部变形折叠抽屉容器（底座遥测总线与通道负荷 DRAWER）                     */}
        {/* ========================================================================= */}
        <footer className="bg-white border border-[#CCCCCC]/70 rounded-[4px] shadow-sm overflow-hidden transition-all duration-300">
          {/* 折叠触发栏 */}
          <div
            onClick={() => setIsDrawerOpen((prev) => !prev)}
            className="px-3 sm:px-4 py-2.5 bg-[#F6F6F4] hover:bg-[#EEEEEC] cursor-pointer flex items-center justify-between transition-colors select-none"
          >
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <ChevronRight
                className={`w-4 h-4 text-[#006494] transition-transform duration-300 shrink-0 ${
                  isDrawerOpen ? 'rotate-90' : ''
                }`}
              />
              <div className="flex items-center gap-1.5 sm:gap-2 truncate">
                <span className="font-bold text-xs sm:text-[13px] text-[#111827] tracking-tight truncate">
                  底座遥测总线与通道负荷
                </span>
                <span className="px-1.5 py-0.5 bg-[#EAEAE8] text-[#71767B] text-[9.5px] sm:text-[10px] font-bold rounded-[2px] shrink-0">
                  DRAWER
                </span>
              </div>
              {/* 收起态审计摘要 */}
              <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-[#CCCCCC] text-[#71767B] text-[11px] truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-[#006494] animate-pulse shrink-0" />
                <span className="truncate">{auditLogs[0] ? `最新审计: ${auditLogs[0].msg}` : '最新审计: 就绪'}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] sm:text-[11px] text-[#71767B] hidden md:inline">
                {isDrawerOpen ? '点击收起遥测面板' : '点击展开审计与负载图谱'}
              </span>
              <div className="w-6 h-6 flex items-center justify-center bg-white border border-[#CCCCCC]/60 rounded-[2px]">
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#111827] transition-transform duration-300 ${
                    isDrawerOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </div>
          </div>

          {/* 展开内容 */}
          {isDrawerOpen && (
            <div className="border-t border-[#E2E2DF] px-3 sm:px-4 py-3 bg-white animate-in fade-in duration-200">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
                {/* 实时审计流水 (8 栅格) */}
                <div className="lg:col-span-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#E2E2DF] pb-3 lg:pb-0 lg:pr-5">
                  <div className="flex items-center justify-between border-b border-[#E2E2DF] pb-2">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-[#006494]" />
                      <span className="font-bold text-xs sm:text-[13px] text-[#111827] uppercase">
                        全渠道开关动作日志 (REALTIME AUDIT)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-[#71767B]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#006494] animate-ping" />
                      <span className="hidden sm:inline">REALTIME KERNEL</span>
                    </div>
                  </div>

                  {/* 日志条目列表 */}
                  <div className="flex flex-col gap-1 mt-2 max-h-[160px] overflow-y-auto pr-1">
                    {auditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between py-1 px-2 bg-[#F8F8F7] border border-[#E2E2DF] rounded-[2px] text-[10.5px] transition-all"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className={`font-bold ${log.colorClass} shrink-0`}>[{log.time}]</span>
                          <span className="text-[#111827] truncate">{log.msg}</span>
                        </div>
                        <span className={`${log.colorClass} font-bold text-[9.5px] shrink-0 ml-2`}>
                          {log.stateCode}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 pt-2 border-t border-[#E2E2DF] flex items-center justify-between text-[10.5px] text-[#71767B]">
                    <span className="truncate">路径: /sys/urban/bus/event.log</span>
                    <button
                      type="button"
                      onClick={clearLogs}
                      className="text-[#006494] hover:underline font-bold flex items-center gap-1 active:scale-95 shrink-0 ml-2 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>清空展示</span>
                    </button>
                  </div>
                </div>

                {/* 通道负载分布 (4 栅格) */}
                <div className="lg:col-span-4 flex flex-col justify-between pt-1 lg:pt-0">
                  <div className="flex items-center justify-between border-b border-[#E2E2DF] pb-2">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-[#111827]" />
                      <span className="font-bold text-xs sm:text-[13px] text-[#111827]">通道负载压力分布</span>
                    </div>
                    <span className="px-1.5 py-0.5 bg-[#EAEAE8] text-[#111827] text-[10px] font-bold rounded-[2px]">
                      PEAK HOURS
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 mt-2.5 text-[11px]">
                    {/* 堂食 */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[10px] sm:text-[10.5px]">
                        <span className="text-[#71767B]">堂食: 28席 / 32总座</span>
                        <span className="text-[#006494] font-bold">87.5%</span>
                      </div>
                      <div className="w-full bg-[#EAEAE8] h-1.5 overflow-hidden">
                        <div className="bg-[#006494] h-full" style={{ width: '87.5%' }} />
                      </div>
                    </div>

                    {/* 外卖 */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[10px] sm:text-[10.5px]">
                        <span className="text-[#71767B]">外卖: 64单 / 80单承载</span>
                        <span className="text-[#C26D00] font-bold">80.0%</span>
                      </div>
                      <div className="w-full bg-[#EAEAE8] h-1.5 overflow-hidden">
                        <div className="bg-[#C26D00] h-full" style={{ width: '80%' }} />
                      </div>
                    </div>

                    {/* 自提 */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[10px] sm:text-[10.5px]">
                        <span className="text-[#71767B]">自提: 14格 / 24总格</span>
                        <span className="text-[#3BB4FE] font-bold">58.3%</span>
                      </div>
                      <div className="w-full bg-[#EAEAE8] h-1.5 overflow-hidden">
                        <div className="bg-[#3BB4FE] h-full" style={{ width: '58.3%' }} />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E2E2DF] mt-2.5 flex items-center justify-between text-[10px] sm:text-[10.5px]">
                    <span className="text-[#71767B]">算力: 184件/小时</span>
                    <span className="text-[#006494] font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#006494] animate-pulse" />
                      稳健运转
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
};
