import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Truck,
  ChevronDown,
  Check,
  Radio,
  RefreshCw,
  SlidersHorizontal,
  Zap,
  Moon,
  AlertTriangle,
  LayoutList,
  Power,
  LayoutGrid,
  UtensilsCrossed,
  Bike,
  QrCode,
  ChevronRight,
  History,
  Trash2,
  BarChart3
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

interface MerchantPrecisionConsoleProps {
  onStationSelect?: (stationId: number) => void;
  selectedTruckId?: string;
}

export const MerchantPrecisionConsole: React.FC<MerchantPrecisionConsoleProps> = ({
  onStationSelect,
  selectedTruckId
}) => {
  // 0. 数据接线：从业务状态调度引擎初始化全站台通道状态
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

  // 1. Stations State (双向实时绑定 businessStatusEngine)
  const [stations, setStations] = useState<Record<number, StationChannelState>>(loadStationsFromBusinessEngine);

  // 监听全局业务状态总线变更，保持与其他组件（如弹窗/导航栏/顾客端）强同步
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

  // 2. Unit Selector Dropdown State
  const [selectedStationId, setSelectedStationId] = useState<number>(() => {
    if (selectedTruckId) {
      const parsed = parseInt(selectedTruckId.replace('truck-0', ''), 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) return parsed;
    }
    const saved = safeGetStorage('obsidian_merchant_selected_truck', 'truck-01');
    const parsedSaved = parseInt(saved.replace('truck-0', ''), 10);
    return !isNaN(parsedSaved) && parsedSaved >= 1 && parsedSaved <= 5 ? parsedSaved : 1;
  });

  const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 响应外部传入的 selectedTruckId
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

  // 3. KPI Expand State
  const [expandedKpis, setExpandedKpis] = useState<Record<string, boolean>>({});
  const toggleKpi = (kpiKey: string) => {
    setExpandedKpis((prev) => ({ ...prev, [kpiKey]: !prev[kpiKey] }));
  };

  // 4. Bottom Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // 5. Toast System
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const showToast = useCallback((message: string, isSuccess: boolean = true) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, isSuccess }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2400);
  }, []);

  // 6. Audit Log System
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([
    {
      id: 'init',
      time: new Date().toTimeString().split(' ')[0],
      msg: '控制中枢完成启动，5个餐车站点遥测握手成功',
      stateCode: 'READY',
      colorClass: 'text-console-primary'
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
    appendAuditLog('审计缓冲区已清空', 'BUFFER_CLEARED', 'text-console-muted');
    showToast('审计日志展示缓冲区已清空', true);
  };

  // 7. Toggle Channel (数据接线：同步至 businessStatusEngine)
  const toggleChannel = (stationId: number, channelKey: 'dine' | 'delivery' | 'pickup', silent: boolean = false) => {
    const current = stations[stationId] || INITIAL_STATIONS[stationId];
    const nextActive = !current[channelKey];
    const nextStation: StationChannelState = {
      ...current,
      [channelKey]: nextActive
    };

    // Recalculate master
    const anyActive = nextStation.dine || nextStation.delivery || nextStation.pickup;
    nextStation.master = anyActive;

    setStations((prev) => ({
      ...prev,
      [stationId]: nextStation
    }));

    // 数据接线：实时同步至业务状态引擎
    const truckId = `truck-0${stationId}`;
    setTruckBusinessStatus(
      truckId,
      {
        isOpen: nextStation.master,
        dineInOpen: nextStation.dine,
        deliveryOpen: nextStation.delivery,
        pickupOpen: nextStation.pickup
      },
      '主控矩阵'
    );

    if (!silent) {
      const sName = STATION_NAMES[stationId];
      const cName = CHANNEL_NAMES[channelKey];
      const statusZh = nextActive ? '已开启接单' : '已暂停打样';
      showToast(`【${sName}】${cName}渠道${statusZh}`, nextActive);
      appendAuditLog(
        `${sName}: ${cName} -> ${nextActive ? '开启接单' : '打烊休市'}`,
        nextActive ? 'ACTIVE' : 'HALTED',
        nextActive ? 'text-console-primary' : 'text-console-muted'
      );
    }
  };

  // 8. Toggle Master Switch for Station (数据接线：同步至 businessStatusEngine)
  const toggleMasterSwitch = (stationId: number) => {
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

    // 数据接线：实时同步至业务状态引擎
    const truckId = `truck-0${stationId}`;
    setTruckBusinessStatus(
      truckId,
      {
        isOpen: targetState,
        statusLabel: targetState ? '营业中' : '全线打烊',
        closeReason: targetState ? `${STATION_NAMES[stationId]} 恢复全渠道在线接单` : `${STATION_NAMES[stationId]} 主控开关切断打烊`,
        reopenTime: targetState ? '正常接单中' : '待指令恢复',
        dineInOpen: targetState,
        deliveryOpen: targetState,
        pickupOpen: targetState
      },
      '主控矩阵'
    );

    const sName = STATION_NAMES[stationId];
    const msg = targetState ? `【${sName}】总开关：一键全渠道开启` : `【${sName}】总开关：全线休市打样`;
    showToast(msg, targetState);
    appendAuditLog(
      `${sName}: 总开关操作 -> ${targetState ? '全渠道激活' : '全线打烊'}`,
      targetState ? 'ONLINE_ALL' : 'HALTED_ALL',
      targetState ? 'text-console-primary' : 'text-console-danger'
    );
  };

  // 9. Batch Global Operations (数据接线：批量广播 5 大餐车站台)
  const batchSetAll = (openState: boolean) => {
    const updated: Record<number, StationChannelState> = {};
    for (let i = 1; i <= 5; i++) {
      updated[i] = {
        master: openState,
        dine: openState,
        delivery: openState,
        pickup: openState
      };
      // 数据接线：广播每个站台状态
      setTruckBusinessStatus(
        `truck-0${i}`,
        {
          isOpen: openState,
          statusLabel: openState ? '营业中' : '全线打烊',
          closeReason: openState ? '全网餐车站台集中恢复营业' : '晚市全网集中打烊休市',
          reopenTime: openState ? '正常接单中' : '明日 11:00',
          dineInOpen: openState,
          deliveryOpen: openState,
          pickupOpen: openState
        },
        '批处理总线'
      );
    }
    setStations(updated);

    const title = openState ? '一键全网接单' : '晚市全线打样';
    showToast(`批处理完成: ${title}`, openState);
    appendAuditLog(
      `批处理指令: 全网5大餐车站点 ${openState ? '全渠道激活上线' : '统一休市打样'}`,
      openState ? 'BATCH_ON' : 'BATCH_OFF',
      openState ? 'text-console-primary' : 'text-console-muted'
    );
  };

  const emergencyShutdown = () => {
    const updated: Record<number, StationChannelState> = {};
    for (let i = 1; i <= 5; i++) {
      updated[i] = {
        master: false,
        dine: false,
        delivery: false,
        pickup: false
      };
      // 数据接线：气象熔断广播
      setTruckBusinessStatus(
        `truck-0${i}`,
        {
          isOpen: false,
          statusLabel: '气象熔断',
          closeReason: '突发极端气象预警，全网切断供售避险',
          reopenTime: '待气象警报解除',
          dineInOpen: false,
          deliveryOpen: false,
          pickupOpen: false
        },
        '气象熔断总控'
      );
    }
    setStations(updated);

    showToast('⚠️ 气象熔断：全站点已切断供售', false);
    appendAuditLog('极端气象熔断: 已强制关闭所有站点渠道供售', 'EMERGENCY_SHUTDOWN', 'text-console-danger');
  };

  // Station metadata descriptors
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
      descDine: '7桌就餐',
      descDelivery: '双平台正常',
      descPickup: '柜体待取就绪',
      prepLabel: '全渠道营业',
      prepCode: 'ONLINE 0x01'
    },
    2: {
      title: '02号·科技园先锋车',
      location: '高新南十道站 腾讯双子塔东 // 堂食排队过长',
      descDine: '满座限流',
      descDelivery: '外送接单中',
      descPickup: '5格就绪待取',
      prepLabel: '部分限流',
      prepCode: 'THROTTLED'
    },
    3: {
      title: '03号·潮玩艺术车',
      location: 'OCT创意艺术港 潮玩主入口 // 运力拥堵暂缓',
      descDine: '开放现场排号',
      descDelivery: '骑手运力超载',
      descPickup: '小程序立取',
      prepLabel: '晚市备料',
      prepCode: 'PREP // 0x03'
    },
    4: {
      title: '04号·外滩滨江车',
      location: '黄浦滨江流动观景区 // 设备维护保养中',
      descDine: '不接客',
      descDelivery: '外送闭店',
      descPickup: '自检锁定',
      prepLabel: '全线打烊',
      prepCode: 'HALTED 0x00'
    },
    5: {
      title: '05号·后备机动车',
      location: '中央总厨应急机动基地 // 随时响应突发客流',
      descDine: '无外摆席位',
      descDelivery: '溢流应急承接',
      descPickup: '内购专用取餐',
      prepLabel: '部分营业',
      prepCode: 'ONLINE 0x05'
    }
  };

  // Calculate active station count for KPI 1
  const activeStationCount = Object.values(stations).filter((s) => s.master).length;
  const activeStationRatio = Math.round((activeStationCount / 5) * 100);

  return (
    <div
      style={{
        backgroundColor: '#F4F4F2',
        color: '#111827',
        fontFamily: '"Hanken Grotesk", sans-serif'
      }}
      className="min-h-full w-full text-[13px] leading-normal selection:bg-console-primary selection:text-white p-2.5 sm:p-4 lg:p-6 relative antialiased"
    >
      {/* Precision HUD Notification Toast Container */}
      <div id="console-toast-container" className="fixed top-4 right-4 left-4 sm:left-auto sm:right-6 max-w-[420px] ml-auto z-9999 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`console-toast toast-show flex items-center gap-2.5 px-3 py-2 rounded-c border font-mono text-[11px] sm:text-[12px] shadow-lg ${
              toast.isSuccess
                ? 'bg-white border-console-primary/30 text-console-text shadow-cyan-900/10'
                : 'bg-[#FCFCFB] border-console-borderDark text-console-muted shadow-black/5'
            }`}
          >
            <div className="flex items-center gap-1.5 shrink-0">
              {toast.isSuccess ? (
                <CheckCircle2 className="w-4 h-4 text-console-primary shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-console-danger shrink-0" />
              )}
              {toast.isSuccess ? (
                <span className="w-1.5 h-1.5 rounded-full bg-console-accent animate-ping mr-1" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-console-danger mr-1" />
              )}
            </div>
            <span className="font-medium truncate tracking-tight">{toast.message}</span>
          </div>
        ))}
      </div>

      <div className="max-w-[1560px] mx-auto flex flex-col gap-3 sm:gap-4">
        {/* 1. 顶部控制总线与高级遥测选择器 */}
        <header className="bg-console-card border border-console-borderDark/70 rounded-c shadow-sm p-3 sm:px-4 sm:py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
          {/* Left Section: Unit Selector & Hardware Telemetry Link */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 lg:gap-6 w-full lg:w-auto">
            {/* Unit Selector Dropdown Trigger */}
            <div className="flex flex-col w-full sm:w-auto" ref={dropdownRef}>
              <div className="flex items-center gap-1.5 text-console-muted font-mono text-[10px] uppercase tracking-wider mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-console-primary animate-ping" />
                <span className="font-bold text-console-text">UNIT SELECTOR // 站点实时切换</span>
              </div>
              <div className="relative group w-full" id="unit-dropdown-wrapper">
                <button
                  id="unit-dropdown-btn"
                  type="button"
                  onClick={() => setIsUnitDropdownOpen((prev) => !prev)}
                  className="w-full sm:w-auto flex items-center justify-between gap-2.5 px-3 py-2 sm:py-1.5 bg-[#F9F9F8] hover:bg-[#F0F0EE] border border-console-borderDark/80 rounded-c text-console-text font-mono text-[12px] font-semibold transition-all active:scale-[0.98] min-w-full sm:min-w-[280px] cursor-pointer"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Truck className="w-4 h-4 text-console-primary shrink-0" />
                    <span className="tracking-tight truncate" id="current-station-text">
                      {STATION_NAMES[selectedStationId]} ({stations[selectedStationId]?.master ? '营业中' : '已打样'})
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-console-muted group-hover:text-console-text transition-transform duration-200 ${
                      isUnitDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {isUnitDropdownOpen && (
                  <div
                    id="unit-dropdown-menu"
                    className="absolute top-full left-0 mt-1 w-full bg-console-card border border-console-borderDark shadow-xl z-50 flex flex-col py-1 rounded-c transition-all"
                  >
                    {[1, 2, 3, 4, 5].map((uId) => {
                      const isCur = selectedStationId === uId;
                      const sName = STATION_NAMES[uId];
                      const stState = stations[uId];
                      let note = stState?.master ? '营业中' : '已打样';
                      let noteClass = stState?.master ? 'text-console-primary font-semibold' : 'text-console-muted font-semibold';
                      if (stState?.master && (!stState.dine || !stState.delivery || !stState.pickup)) {
                        note = '部分开放';
                        noteClass = 'text-console-warning font-semibold';
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
                            appendAuditLog(`定向关注站点: ${sName}`, 'FOCUS_SWITCH', 'text-console-primary');
                          }}
                          className={`px-3 py-2 font-mono text-[11px] flex items-center justify-between cursor-pointer transition-colors ${
                            isCur
                              ? 'bg-console-primary text-white font-semibold'
                              : 'hover:bg-[#F3F4F6] text-console-text'
                          }`}
                        >
                          <span className="truncate">{sName}</span>
                          {isCur ? (
                            <Check className="w-4 h-4 shrink-0 ml-2" />
                          ) : (
                            <span className={`shrink-0 ml-2 ${noteClass}`}>{note}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Hardware Telemetry Link Badges */}
            <div className="flex items-center gap-4 sm:pl-4 sm:border-l border-console-border py-1 sm:py-0.5 justify-between sm:justify-start">
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5 text-console-primary animate-pulse" />
                  <span className="font-mono text-[10px] text-console-muted font-semibold uppercase">HARDWARE RTK-5G</span>
                </div>
                <span className="font-mono text-[12px] text-console-primary font-bold">99.98% LOCKED</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 text-console-muted" />
                  <span className="font-mono text-[10px] text-console-muted font-semibold uppercase">POS / CLOUD</span>
                </div>
                <span className="font-mono text-[12px] text-console-text font-bold">4ms // ENCRYPTED</span>
              </div>
            </div>
          </div>

          {/* Right Section: Batch Operations Toolbar */}
          <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 border-t lg:border-t-0 border-console-border w-full lg:w-auto">
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 bg-[#F1F1EF] border border-console-borderDark/50 rounded-c font-mono text-[11px] text-console-muted">
              <SlidersHorizontal className="w-3.5 h-3.5 text-console-text" />
              <span className="font-semibold text-console-text">批处理总线:</span>
            </div>
            <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => batchSetAll(true)}
                className="px-2.5 sm:px-3 py-2 sm:py-1.5 bg-console-dark hover:bg-black text-white font-mono text-[11px] font-semibold tracking-wider rounded-c border border-black flex items-center justify-center gap-1 transition-all duration-200 active:scale-95 shadow-sm cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-console-accent animate-pulse" />
                <span className="truncate">全网接单</span>
              </button>
              <button
                type="button"
                onClick={() => batchSetAll(false)}
                className="px-2.5 sm:px-3 py-2 sm:py-1.5 bg-console-card hover:bg-[#F3F4F6] text-console-text font-mono text-[11px] font-semibold tracking-wider rounded-c border border-console-borderDark transition-all duration-200 active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
              >
                <Moon className="w-3.5 h-3.5 text-console-muted" />
                <span className="truncate">全线打样</span>
              </button>
              <button
                type="button"
                onClick={emergencyShutdown}
                className="px-2.5 sm:px-3 py-2 sm:py-1.5 bg-console-danger hover:bg-red-700 text-white font-mono text-[11px] font-semibold tracking-wider rounded-c border border-red-700 transition-all duration-200 active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="truncate">气象熔断</span>
              </button>
            </div>
          </div>
        </header>

        {/* 2. 4宫格遥测 KPI 指标带 */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
          {/* Card 1: Stations Network */}
          <div
            onClick={() => toggleKpi('stations')}
            className={`bg-console-card p-2.5 rounded-c border border-console-borderDark/60 shadow-sm flex flex-col justify-between transition-all duration-300 hover:border-console-primary group cursor-pointer active:scale-[0.99] ${
              expandedKpis['stations'] ? 'ring-1 ring-console-primary' : ''
            }`}
          >
            <div className="flex items-center justify-between text-console-muted font-mono text-[10px] pb-1 border-b border-console-border">
              <span className="font-bold tracking-tight text-console-text flex items-center gap-1 truncate">
                <span className="w-1.5 h-1.5 bg-console-dark rounded-none shrink-0" />
                <span className="truncate">STATIONS // 餐车站网</span>
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <span className="font-mono text-[10px] font-bold text-console-primary bg-console-primaryLight px-1 py-0.5 rounded-c border border-console-primary/20">
                  {activeStationRatio}% 活跃
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-console-muted group-hover:text-console-primary transition-transform duration-200 ${
                    expandedKpis['stations'] ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-[18px] sm:text-[20px] font-bold tracking-tight text-console-text leading-none">
                  {activeStationCount}
                </span>
                <span className="font-mono text-[10px] text-console-muted truncate">/5台在线</span>
              </div>
              <div className="flex items-center gap-0.5 w-12 sm:w-16">
                {[1, 2, 3, 4, 5].map((id) => (
                  <div
                    key={id}
                    className={`h-1 flex-1 rounded-none transition-colors duration-300 ${
                      stations[id]?.master ? 'bg-console-primary' : 'bg-console-borderDark'
                    }`}
                    title={`0${id}号 ${stations[id]?.master ? '在线' : '停运'}`}
                  />
                ))}
              </div>
            </div>
            {expandedKpis['stations'] && (
              <div className="mt-2 pt-1.5 border-t border-console-border flex flex-col gap-1 text-[10px] font-mono text-console-muted">
                <div className="flex justify-between">
                  <span>在网电压:</span>
                  <span className="text-console-text font-bold">380V // OK</span>
                </div>
                <div className="flex justify-between">
                  <span>基带信噪比:</span>
                  <span className="text-console-primary font-bold">42dB SNR</span>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Dine-in Occupancy */}
          <div
            onClick={() => toggleKpi('dinein')}
            className={`bg-console-card p-2.5 rounded-c border border-console-borderDark/60 shadow-sm flex flex-col justify-between transition-all duration-300 hover:border-console-primary group cursor-pointer active:scale-[0.99] ${
              expandedKpis['dinein'] ? 'ring-1 ring-console-primary' : ''
            }`}
          >
            <div className="flex items-center justify-between text-console-muted font-mono text-[10px] pb-1 border-b border-console-border">
              <span className="font-bold tracking-tight text-console-text flex items-center gap-1 truncate">
                <span className="w-1.5 h-1.5 bg-console-primary rounded-none shrink-0" />
                <span className="truncate">DINE-IN // 堂食翻台</span>
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <span className="font-mono text-[10px] font-bold text-console-primary bg-console-primaryLight px-1 py-0.5 rounded-c border border-console-primary/20">
                  4.2次/日
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-console-muted group-hover:text-console-primary transition-transform duration-200 ${
                    expandedKpis['dinein'] ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-[18px] sm:text-[20px] font-bold tracking-tight text-console-primary leading-none">
                  92.4%
                </span>
                <span className="font-mono text-[10px] text-console-muted">座位周转</span>
              </div>
              <div className="w-12 sm:w-16 bg-[#EAEAE8] h-1 rounded-none overflow-hidden">
                <div className="bg-console-primary h-full transition-all duration-500" style={{ width: '92.4%' }} />
              </div>
            </div>
            {expandedKpis['dinein'] && (
              <div className="mt-2 pt-1.5 border-t border-console-border flex flex-col gap-1 text-[10px] font-mono text-console-muted">
                <div className="flex justify-between">
                  <span>在席等待:</span>
                  <span className="text-console-text font-bold">18 位</span>
                </div>
                <div className="flex justify-between">
                  <span>平均驻留:</span>
                  <span className="text-console-primary font-bold">23.5 min</span>
                </div>
              </div>
            )}
          </div>

          {/* Card 3: Delivery SLA */}
          <div
            onClick={() => toggleKpi('delivery')}
            className={`bg-console-card p-2.5 rounded-c border border-console-borderDark/60 shadow-sm flex flex-col justify-between transition-all duration-300 hover:border-console-primary group cursor-pointer active:scale-[0.99] ${
              expandedKpis['delivery'] ? 'ring-1 ring-console-primary' : ''
            }`}
          >
            <div className="flex items-center justify-between text-console-muted font-mono text-[10px] pb-1 border-b border-console-border">
              <span className="font-bold tracking-tight text-console-text flex items-center gap-1 truncate">
                <span className="w-1.5 h-1.5 bg-console-dark rounded-none shrink-0" />
                <span className="truncate">DELIVERY // 外卖履约</span>
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <span className="font-mono text-[10px] font-bold text-console-primary bg-[#F0F6F9] px-1 py-0.5 rounded-c border border-console-primary/20">
                  ▲ 2.1m
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-console-muted group-hover:text-console-primary transition-transform duration-200 ${
                    expandedKpis['delivery'] ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-[18px] sm:text-[20px] font-bold tracking-tight text-console-text leading-none">
                  16.8
                </span>
                <span className="font-mono text-[10px] font-semibold text-console-text">min</span>
              </div>
              <div className="w-12 sm:w-16 bg-[#EAEAE8] h-1 rounded-none overflow-hidden">
                <div className="bg-console-dark h-full transition-all duration-500" style={{ width: '82%' }} />
              </div>
            </div>
            {expandedKpis['delivery'] && (
              <div className="mt-2 pt-1.5 border-t border-console-border flex flex-col gap-1 text-[10px] font-mono text-console-muted">
                <div className="flex justify-between">
                  <span>骑手响应:</span>
                  <span className="text-console-text font-bold">1.4 min</span>
                </div>
                <div className="flex justify-between">
                  <span>延误报警:</span>
                  <span className="text-console-primary font-bold">25.0 min</span>
                </div>
              </div>
            )}
          </div>

          {/* Card 4: Pickup Cabin */}
          <div
            onClick={() => toggleKpi('cabin')}
            className={`bg-console-card p-2.5 rounded-c border border-console-borderDark/60 shadow-sm flex flex-col justify-between transition-all duration-300 hover:border-console-warning group cursor-pointer active:scale-[0.99] ${
              expandedKpis['cabin'] ? 'ring-1 ring-console-warning' : ''
            }`}
          >
            <div className="flex items-center justify-between text-console-muted font-mono text-[10px] pb-1 border-b border-console-border">
              <span className="font-bold tracking-tight text-console-text flex items-center gap-1 truncate">
                <span className="w-1.5 h-1.5 bg-console-warning rounded-none shrink-0" />
                <span className="truncate">CABIN // 智能取餐柜</span>
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <span className="font-mono text-[10px] font-bold text-console-warning bg-console-warningLight px-1 py-0.5 rounded-c border border-console-warning/20">
                  10格空闲
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-console-muted group-hover:text-console-warning transition-transform duration-200 ${
                    expandedKpis['cabin'] ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-[18px] sm:text-[20px] font-bold tracking-tight text-console-warning leading-none">
                  14
                </span>
                <span className="font-mono text-[10px] text-console-muted">格待取 (58%)</span>
              </div>
              <div className="w-12 sm:w-16 bg-[#EAEAE8] h-1 rounded-none overflow-hidden">
                <div className="bg-console-warning h-full transition-all duration-500" style={{ width: '58%' }} />
              </div>
            </div>
            {expandedKpis['cabin'] && (
              <div className="mt-2 pt-1.5 border-t border-console-border flex flex-col gap-1 text-[10px] font-mono text-console-muted">
                <div className="flex justify-between">
                  <span>取件峰值:</span>
                  <span className="text-console-text font-bold">12:15 - 12:45</span>
                </div>
                <div className="flex justify-between">
                  <span>滞留超期:</span>
                  <span className="text-console-warning font-bold">0 件</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 3. 核心控制矩阵表 (MATRIX // 5 站点 x 3 渠道精密开关矩阵) */}
        <section className="bg-console-card border border-console-borderDark/70 rounded-c shadow-sm overflow-hidden">
          {/* Matrix Header */}
          <div className="px-3 sm:px-4 py-2.5 bg-console-card border-b border-console-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-console-primary rounded-none" />
              <h2
                style={{ fontFamily: '"Space Grotesk", sans-serif' }}
                className="text-[13px] sm:text-[14px] font-bold tracking-tight text-console-text"
              >
                流动餐车供售渠道主控矩阵
              </h2>
              <span className="font-mono text-[10px] text-console-muted px-1.5 py-0.5 bg-[#F0F0EE] border border-console-borderDark/40 rounded-c">
                01-05 UNITS
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[10px] text-console-muted">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-console-accent rounded-none" />
                <span className="text-console-text font-medium">营业中 (ONLINE)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-[#E2E2DF] rounded-none" />
                <span className="text-console-muted">休市 (HALTED)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-console-warning rounded-none" />
                <span className="text-console-text font-medium">限流 (THROTTLED)</span>
              </div>
            </div>
          </div>

          {/* Column Structure Header (Desktop Only) */}
          <div className="hidden lg:grid bg-[#F6F6F4] px-4 py-2.5 border-b border-console-borderDark/60 grid-cols-12 gap-3 font-mono text-[11px] font-bold text-console-muted uppercase tracking-wider items-center">
            <div className="col-span-4 flex items-center gap-1.5 text-console-text">
              <LayoutList className="w-4 h-4" />
              <span>餐车站号 / 实体点位 / 空间遥测</span>
            </div>
            <div className="col-span-3 flex items-center gap-1.5 text-console-text">
              <Power className="w-4 h-4" />
              <span>【总开关】KILLSWITCH</span>
            </div>
            <div className="col-span-5 flex items-center justify-between text-console-text">
              <div className="flex items-center gap-1.5">
                <LayoutGrid className="w-4 h-4" />
                <span>【堂食 / 外卖 / 自提 3个独立按钮】CHANNELS</span>
              </div>
              <span className="text-[10px] text-console-muted font-normal lowercase">独立微动效</span>
            </div>
          </div>

          {/* Rows Container */}
          <div className="divide-y divide-console-border">
            {[1, 2, 3, 4, 5].map((stationId) => {
              const s = stations[stationId] || INITIAL_STATIONS[stationId];
              const meta = stationMetadata[stationId];
              const allActive = s.dine && s.delivery && s.pickup;
              const anyActive = s.dine || s.delivery || s.pickup;

              let masterLabel = '全渠道营业';
              let masterCode = `ONLINE 0x0${stationId}`;
              let statusTag = '营业中';
              let statusTagClass = 'bg-console-primary text-white';
              let mobileIndicator = 'ONLINE';
              let mobileIndicatorClass = 'text-console-primary';
              let masterBtnClass = 'bg-console-dark text-white hover:bg-black border-black';
              let masterIconColor = 'text-console-accent';
              let indicatorClass = 'bg-console-accent indicator-active';
              let badgeBg = 'bg-console-dark text-white';

              if (allActive) {
                masterLabel = stationId === 1 ? '全渠道营业' : stationId === 5 ? '全渠道备餐' : '全渠道在线';
                masterCode = `ONLINE 0x0${stationId}`;
                statusTag = '营业中';
                statusTagClass = 'bg-console-primary text-white';
                mobileIndicator = 'ONLINE';
                mobileIndicatorClass = 'text-console-primary';
                masterBtnClass = 'bg-console-dark text-white hover:bg-black border-black';
                masterIconColor = 'text-console-accent';
                indicatorClass = 'bg-console-accent indicator-active';
                badgeBg = 'bg-console-dark text-white';
              } else if (anyActive) {
                masterLabel = stationId === 2 ? '部分限流' : stationId === 3 ? '晚市备料' : '部分营业';
                masterCode = stationId === 3 ? 'PREP // 0x03' : 'THROTTLED';
                statusTag = stationId === 2 ? '部分限流' : stationId === 3 ? '备料打单' : '待命接驳';
                statusTagClass = stationId === 2 ? 'bg-console-warning text-white' : 'bg-console-primaryLight text-console-primary border border-console-primary/30';
                mobileIndicator = 'THROTTLED';
                mobileIndicatorClass = 'text-console-warning';
                masterBtnClass = 'bg-console-card text-console-text hover:bg-[#F3F4F6] border-console-borderDark';
                masterIconColor = 'text-console-primary';
                indicatorClass = 'bg-console-warning indicator-warning';
                badgeBg = 'bg-[#ECECE9] text-console-text';
              } else {
                masterLabel = '全线休市打样';
                masterCode = 'HALTED 0x00';
                statusTag = '已打样';
                statusTagClass = 'bg-[#ECECE9] text-console-muted';
                mobileIndicator = 'HALTED';
                mobileIndicatorClass = 'text-console-muted';
                masterBtnClass = 'bg-console-card text-console-muted hover:bg-[#F3F4F6] border-console-borderDark opacity-60';
                masterIconColor = 'text-console-muted';
                indicatorClass = 'bg-[#A8A29E] indicator-inactive';
                badgeBg = 'bg-[#ECECE9] text-console-muted';
              }

              return (
                <div
                  key={stationId}
                  className={`p-3 sm:p-4 lg:py-3.5 grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-3 items-center transition-colors duration-200 ${
                    selectedStationId === stationId ? 'bg-cyan-50/20' : 'hover:bg-[#FBFBFA]'
                  }`}
                >
                  {/* Col 1: Station Identity */}
                  <div className="lg:col-span-4 flex flex-col justify-center">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-none shrink-0 ${indicatorClass}`} />
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`font-mono text-[10px] font-bold px-1 py-0.5 rounded-c ${badgeBg}`}>
                          0{stationId} UNIT
                        </span>
                        <h3 className="font-bold text-[13px] sm:text-[14px] text-console-text">
                          {meta.title}
                        </h3>
                      </div>
                      <span className={`lg:hidden font-mono text-[9px] px-1.5 py-0.5 font-semibold rounded-c shrink-0 ml-auto ${statusTagClass}`}>
                        {statusTag}
                      </span>
                    </div>
                    <div className="mt-1 font-mono text-[10px] sm:text-[11px] text-console-muted pl-4 truncate">
                      {meta.location}
                    </div>
                  </div>

                  {/* Col 2: Master Switch */}
                  <div className="lg:col-span-3 flex items-center">
                    <button
                      type="button"
                      onClick={() => toggleMasterSwitch(stationId)}
                      className={`w-full py-2 px-3 border rounded-c font-mono text-[11px] flex items-center justify-between transition-all duration-200 active:scale-[0.98] group cursor-pointer ${masterBtnClass}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Power className={`w-4 h-4 group-hover:scale-110 transition-transform duration-200 ${masterIconColor}`} />
                        <div className="flex flex-col text-left truncate">
                          <span className="font-bold text-[11px] sm:text-[12px] truncate leading-tight">
                            {masterLabel}
                          </span>
                          <span className="text-[9px] opacity-70 tracking-wider font-normal truncate">
                            {masterCode}
                          </span>
                        </div>
                      </div>
                      <div className="hidden sm:flex flex-col items-end shrink-0 ml-2">
                        <span className="text-[10px] font-bold">
                          {s.master ? 'ON' : 'OFF'}
                        </span>
                        <span className="text-[8px] opacity-60">MASTER</span>
                      </div>
                    </button>
                  </div>

                  {/* Col 3: 3 Independent Channel Buttons */}
                  <div className="lg:col-span-5 grid grid-cols-3 gap-1.5 sm:gap-2">
                    {/* Dine Button */}
                    <button
                      type="button"
                      onClick={() => toggleChannel(stationId, 'dine')}
                      className={`p-2 min-h-[58px] sm:min-h-[64px] border rounded-c transition-all duration-300 ease-out text-left flex flex-col justify-between active:scale-[0.96] group relative overflow-hidden cursor-pointer ${
                        s.dine ? 'channel-card-active' : 'channel-card-halted'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`font-mono text-[11px] font-bold flex items-center gap-1 ${s.dine ? 'text-console-text' : 'text-console-muted'}`}>
                          <UtensilsCrossed className={`w-3.5 h-3.5 ${s.dine ? 'text-console-primary' : 'text-console-muted'}`} />
                          堂食
                        </span>
                        <div className={`w-6 h-3.5 rounded-full flex items-center px-0.5 transition-colors duration-300 ${
                          s.dine ? 'bg-console-primaryLight border border-console-primary/40' : 'bg-[#E4E4E0] border border-console-borderDark/60'
                        }`}>
                          <div className={`w-2.5 h-2.5 rounded-full switch-knob ${s.dine ? 'is-active indicator-active' : 'is-inactive indicator-inactive'}`} />
                        </div>
                      </div>
                      <div className="mt-1 flex flex-col">
                        <span className={`font-mono text-[11px] font-bold ${s.dine ? 'text-console-primary' : 'text-console-muted'}`}>
                          {s.dine ? '开启中' : '已打烊'}
                        </span>
                        <span className="font-mono text-[9px] sm:text-[10px] text-console-muted truncate">
                          {meta.descDine}
                        </span>
                      </div>
                    </button>

                    {/* Delivery Button */}
                    <button
                      type="button"
                      onClick={() => toggleChannel(stationId, 'delivery')}
                      className={`p-2 min-h-[58px] sm:min-h-[64px] border rounded-c transition-all duration-300 ease-out text-left flex flex-col justify-between active:scale-[0.96] group relative overflow-hidden cursor-pointer ${
                        s.delivery ? 'channel-card-active' : 'channel-card-halted'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`font-mono text-[11px] font-bold flex items-center gap-1 ${s.delivery ? 'text-console-text' : 'text-console-muted'}`}>
                          <Bike className={`w-3.5 h-3.5 ${s.delivery ? 'text-console-primary' : 'text-console-muted'}`} />
                          外卖
                        </span>
                        <div className={`w-6 h-3.5 rounded-full flex items-center px-0.5 transition-colors duration-300 ${
                          s.delivery ? 'bg-console-primaryLight border border-console-primary/40' : 'bg-[#E4E4E0] border border-console-borderDark/60'
                        }`}>
                          <div className={`w-2.5 h-2.5 rounded-full switch-knob ${s.delivery ? 'is-active indicator-active' : 'is-inactive indicator-inactive'}`} />
                        </div>
                      </div>
                      <div className="mt-1 flex flex-col">
                        <span className={`font-mono text-[11px] font-bold ${s.delivery ? 'text-console-primary' : 'text-console-muted'}`}>
                          {s.delivery ? '开启中' : '已打烊'}
                        </span>
                        <span className="font-mono text-[9px] sm:text-[10px] text-console-muted truncate">
                          {meta.descDelivery}
                        </span>
                      </div>
                    </button>

                    {/* Pickup Button */}
                    <button
                      type="button"
                      onClick={() => toggleChannel(stationId, 'pickup')}
                      className={`p-2 min-h-[58px] sm:min-h-[64px] border rounded-c transition-all duration-300 ease-out text-left flex flex-col justify-between active:scale-[0.96] group relative overflow-hidden cursor-pointer ${
                        s.pickup ? 'channel-card-active' : 'channel-card-halted'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`font-mono text-[11px] font-bold flex items-center gap-1 ${s.pickup ? 'text-console-text' : 'text-console-muted'}`}>
                          <QrCode className={`w-3.5 h-3.5 ${s.pickup ? 'text-console-primary' : 'text-console-muted'}`} />
                          自提
                        </span>
                        <div className={`w-6 h-3.5 rounded-full flex items-center px-0.5 transition-colors duration-300 ${
                          s.pickup ? 'bg-console-primaryLight border border-console-primary/40' : 'bg-[#E4E4E0] border border-console-borderDark/60'
                        }`}>
                          <div className={`w-2.5 h-2.5 rounded-full switch-knob ${s.pickup ? 'is-active indicator-active' : 'is-inactive indicator-inactive'}`} />
                        </div>
                      </div>
                      <div className="mt-1 flex flex-col">
                        <span className={`font-mono text-[11px] font-bold ${s.pickup ? 'text-console-primary' : 'text-console-muted'}`}>
                          {s.pickup ? '开启中' : '已打烊'}
                        </span>
                        <span className="font-mono text-[9px] sm:text-[10px] text-console-muted truncate">
                          {meta.descPickup}
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. 底部变形折叠抽屉容器 */}
        <footer className="bg-console-card border border-console-borderDark/60 rounded-c shadow-sm overflow-hidden transition-all duration-300">
          {/* Collapsible Bar Header */}
          <div
            onClick={() => setIsDrawerOpen((prev) => !prev)}
            className="px-3 sm:px-4 py-2.5 bg-[#F6F6F4] hover:bg-[#EEEEEC] cursor-pointer flex items-center justify-between transition-colors select-none"
          >
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <ChevronRight
                className={`w-4 h-4 text-console-primary transition-transform duration-300 shrink-0 ${
                  isDrawerOpen ? 'rotate-90' : ''
                }`}
              />
              <div className="flex items-center gap-1.5 sm:gap-2 truncate">
                <span
                  style={{ fontFamily: '"Space Grotesk", sans-serif' }}
                  className="font-bold text-[12px] sm:text-[13px] text-console-text tracking-tight truncate"
                >
                  底座遥测总线与通道负荷
                </span>
                <span className="px-1.5 py-0.5 bg-[#EAEAE8] text-console-muted font-mono text-[9px] sm:text-[10px] font-semibold rounded-c shrink-0">
                  DRAWER
                </span>
              </div>
              {/* Collapsed Real-time Summary Badge */}
              <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-console-borderDark text-console-muted font-mono text-[11px] truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-console-primary animate-pulse shrink-0" />
                <span className="truncate">
                  最新审计: {auditLogs[0] ? `[${auditLogs[0].time}] ${auditLogs[0].msg}` : '系统控制总线就绪'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <span className="font-mono text-[10px] sm:text-[11px] text-console-muted hidden md:inline">
                {isDrawerOpen ? '点击折叠收起遥测面板' : '点击展开审计与负载图谱'}
              </span>
              <div className={`w-6 h-6 flex items-center justify-center bg-console-card border border-console-borderDark/60 rounded-c transition-transform duration-300 ${isDrawerOpen ? 'rotate-180' : ''}`}>
                <ChevronDown className="w-4 h-4 text-console-text" />
              </div>
            </div>
          </div>

          {/* Morphing Drawer Content */}
          {isDrawerOpen && (
            <div className="border-t border-console-border px-3 sm:px-4 py-4 bg-console-card animate-fadeIn">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
                {/* Audit Log List (8 cols) */}
                <div className="lg:col-span-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-console-border pb-4 lg:pb-0 lg:pr-5">
                  <div className="flex items-center justify-between border-b border-console-border pb-2">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-console-primary" />
                      <span
                        style={{ fontFamily: '"Space Grotesk", sans-serif' }}
                        className="font-bold text-[12px] sm:text-[13px] text-console-text uppercase"
                      >
                        全渠道开关动作日志 (REALTIME AUDIT)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[10px] text-console-muted">
                      <span className="w-1.5 h-1.5 rounded-full bg-console-primary animate-ping" />
                      <span className="hidden sm:inline">REALTIME KERNEL</span>
                    </div>
                  </div>

                  {/* Log Entries */}
                  <div className="flex flex-col gap-1.5 mt-2.5 font-mono text-[10px] sm:text-[11px]">
                    {auditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between py-1.5 px-2.5 bg-[#F8F8F7] border border-console-border rounded-c transition-all"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className={`font-bold ${log.colorClass} shrink-0`}>[{log.time}]</span>
                          <span className="text-console-text truncate">{log.msg}</span>
                        </div>
                        <span className={`${log.colorClass} font-bold text-[10px] shrink-0 ml-2`}>
                          {log.stateCode}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 pt-2 border-t border-console-border flex items-center justify-between font-mono text-[10px] sm:text-[11px] text-console-muted">
                    <span className="truncate">路径: /sys/urban/bus/event.log</span>
                    <button
                      type="button"
                      onClick={clearLogs}
                      className="text-console-primary hover:underline font-bold flex items-center gap-1 active:scale-95 shrink-0 ml-2 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> 清空展示
                    </button>
                  </div>
                </div>

                {/* Channel Pressure Distribution (4 cols) */}
                <div className="lg:col-span-4 flex flex-col justify-between pt-1 lg:pt-0">
                  <div className="flex items-center justify-between border-b border-console-border pb-2">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-console-text" />
                      <span
                        style={{ fontFamily: '"Space Grotesk", sans-serif' }}
                        className="font-bold text-[12px] sm:text-[13px] text-console-text"
                      >
                        通道负载压力分布
                      </span>
                    </div>
                    <span className="px-1.5 py-0.5 bg-[#EAEAE8] text-console-text font-mono text-[10px] font-bold rounded-c">
                      PEAK HOURS
                    </span>
                  </div>

                  {/* Progress Bars */}
                  <div className="flex flex-col gap-2.5 mt-3 font-mono text-[11px]">
                    {/* Dine */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[10px] sm:text-[11px]">
                        <span className="text-console-muted">堂食: 28席 / 32总座</span>
                        <span className="text-console-primary font-bold">87.5%</span>
                      </div>
                      <div className="w-full bg-[#EAEAE8] h-1.5 rounded-none overflow-hidden">
                        <div className="bg-console-primary h-full transition-all duration-500" style={{ width: '87.5%' }} />
                      </div>
                    </div>

                    {/* Delivery */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[10px] sm:text-[11px]">
                        <span className="text-console-muted">外卖: 64单 / 80单承载</span>
                        <span className="text-console-warning font-bold">80.0%</span>
                      </div>
                      <div className="w-full bg-[#EAEAE8] h-1.5 rounded-none overflow-hidden">
                        <div className="bg-console-warning h-full transition-all duration-500" style={{ width: '80%' }} />
                      </div>
                    </div>

                    {/* Pickup */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[10px] sm:text-[11px]">
                        <span className="text-console-muted">自提: 14格 / 24总格</span>
                        <span className="text-console-accent font-bold">58.3%</span>
                      </div>
                      <div className="w-full bg-[#EAEAE8] h-1.5 rounded-none overflow-hidden">
                        <div className="bg-console-accent h-full transition-all duration-500" style={{ width: '58.3%' }} />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-console-border mt-3 flex items-center justify-between font-mono text-[10px] sm:text-[11px]">
                    <span className="text-console-muted">算力: 184件/小时</span>
                    <span className="text-console-primary font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-console-primary animate-pulse" /> 稳健运转
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
