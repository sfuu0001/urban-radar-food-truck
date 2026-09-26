import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UtensilsCrossed,
  Plus,
  Users,
  Clock,
  ArrowRightLeft,
  ReceiptText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Check,
  Percent,
  Search,
  RefreshCw,
  Brush,
  Ban,
  FileX,
  ShieldCheck,
  Zap,
  Minimize2,
  Maximize2,
  Monitor,
  Terminal,
  Activity,
  Layers,
  ChefHat,
  Flame,
  Radio,
  Copy,
  CheckCheck,
  Megaphone,
  UserPlus,
  ToggleLeft,
  ToggleRight,
  ListOrdered,
  History,
  QrCode,
  AlertTriangle,
  MoreHorizontal
} from 'lucide-react';
import {
  TableItem,
  TableStatus,
  TableZone,
  DishItem,
  Order,
  WaitingTableItem,
  TableDishItem
} from '../../types';
import { globalScannerEngine } from '../../utils/barcodeScannerEngine';
import { resolveOrderChannelType, normalizeOrderKey } from '../../utils/orderNormalizer';
import { TableDishProgressView } from './TableDishProgressView';
import { TableBatchPrintModal } from './TableBatchPrintModal';
import { TableCardSynergyMonitor } from './table/TableCardSynergyMonitor';
import { TableCardSynergyDrawer } from './table/TableCardSynergyDrawer';
import { TableSynergyHeaderPill } from './table/TableSynergyHeaderPill';
import { TableCardSynergyFooterAction } from './table/TableCardSynergyFooterAction';
import { TablePanoramicMonitorModal } from './table/cctv/TablePanoramicMonitorModal';
import { AccountAuditDrawer } from './AccountAuditDrawer';
import { TableSession } from '../../types/tableSession';
import { voiceAlerts } from '../../utils/voiceAlertEngine';
import { businessTransactionEngine } from '../../utils/businessTransactionEngine';
import { safeGetStorage, safeSetStorage } from '../../utils/safeStorage';
import { merchantEventBus } from '../../utils/merchantEventBus';
import {
  getWaitingQueue,
  saveWaitingQueue,
  addWaitingTable,
  cancelWaitingTable,
  transferWaitingToTable,
  getAutoTransferConfig,
  setAutoTransferConfig,
  onTableCleanedRelease
} from '../../utils/tableStorage';

export interface MerchantTablesV2Props {
  tables: TableItem[];
  orders?: Order[];
  menuItems: DishItem[];
  onOpenTable: (tableId: string, guests: number, server: string) => void;
  onCheckoutTable: (tableId: string, discount: number, isAaSplit: boolean) => void;
  onTransferTable: (fromTableId: string, toTableId: string) => void;
  onReleaseTable: (tableId: string) => void;
  onUpdateTable?: (updatedTable: TableItem) => void;
  onSyncOrderItems?: (orderNo: string, items: TableDishItem[]) => void;
  onVoidTableOrder?: (tableId: string, reason: string, targetStatus?: 'idle' | 'cleaning') => void;
  showToast: (msg: string, detail?: string) => void;
  onSwitchToV1?: () => void;
}

export const MerchantTablesV2: React.FC<MerchantTablesV2Props> = ({
  tables,
  orders = [],
  menuItems,
  onOpenTable,
  onCheckoutTable,
  onTransferTable,
  onReleaseTable,
  onUpdateTable,
  onSyncOrderItems,
  onVoidTableOrder,
  showToast,
  onSwitchToV1
}) => {
  // 区域筛选
  const [selectedZone, setSelectedZone] = useState<TableZone>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 顶栏条件筛选下拉菜单控制 (超过3个条件时自动生成)
  const [isZoneDropdownOpen, setIsZoneDropdownOpen] = useState<boolean>(false);
  const zoneDropdownRef = useRef<HTMLDivElement>(null);

  // 卡片操作快捷菜单控制 (超过3个动作按键时自动生成)
  const [openCardMenuTableId, setOpenCardMenuTableId] = useState<string | null>(null);
  const cardMenuRef = useRef<HTMLDivElement>(null);

  // 监听外部点击与 Esc 关闭下拉菜单
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (zoneDropdownRef.current && !zoneDropdownRef.current.contains(e.target as Node)) {
        setIsZoneDropdownOpen(false);
      }
      if (cardMenuRef.current && !cardMenuRef.current.contains(e.target as Node)) {
        setOpenCardMenuTableId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsZoneDropdownOpen(false);
        setOpenCardMenuTableId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // 等位队列展开收起控制面板
  const [isWaitingQueueOpen, setIsWaitingQueueOpen] = useState<boolean>(true);

  // 展开菜品列表状态管理 (各桌单独展开)
  const [expandedTableDishes, setExpandedTableDishes] = useState<Record<string, boolean>>({});

  // 订单号已复制高亮反馈
  const [copiedOrderMap, setCopiedOrderMap] = useState<Record<string, boolean>>({});

  // 选中用于出餐大屏 / 详情下钻的桌台
  const [selectedTableForDetail, setSelectedTableForDetail] = useState<TableItem | null>(null);
  const [detailViewMode, setDetailViewMode] = useState<'split' | 'fullscreen'>('split');

  // 模态弹窗状态
  const [activeModal, setActiveModal] = useState<
    'open' | 'bill' | 'transfer' | 'addWaiting' | 'manualTransfer' | 'cleanPrompt' | 'voidOrder' | null
  >(null);
  const [isBatchPrintModalOpen, setIsBatchPrintModalOpen] = useState<boolean>(false);
  const [selectedTable, setSelectedTable] = useState<TableItem | null>(null);
  const [activeSynergySession, setActiveSynergySession] = useState<TableSession | null>(null);
  const [isCctvModalOpen, setIsCctvModalOpen] = useState<boolean>(false);
  const [cctvTargetTable, setCctvTargetTable] = useState<TableItem | null>(null);

  // 作废弹窗
  const [voidTargetTable, setVoidTargetTable] = useState<TableItem | null>(null);
  const [voidReason, setVoidReason] = useState<string>('顾客退单/未就餐离店');
  const [customVoidReason, setCustomVoidReason] = useState<string>('');
  const [voidTargetStatus, setVoidTargetStatus] = useState<'idle' | 'cleaning'>('idle');

  // 等位与自动流转
  const [waitingQueue, setWaitingQueue] = useState<WaitingTableItem[]>(() => getWaitingQueue());
  const [autoTransferOnClean, setAutoTransferOnClean] = useState<boolean>(() => getAutoTransferConfig());

  // 取号等位表单
  const [waitGuests, setWaitGuests] = useState<number>(2);
  const [waitGuestName, setWaitGuestName] = useState<string>('');
  const [waitPhone, setWaitPhone] = useState<string>('');
  const [waitZone, setWaitZone] = useState<string>('餐车外摆区');

  // 手动流转等位表单
  const [waitingToTransfer, setWaitingToTransfer] = useState<WaitingTableItem | null>(null);
  const [transferTargetTableId, setTransferTargetTableId] = useState<string>('');

  // 保洁完成提示 (手动确认模式下)
  const [cleanPromptTable, setCleanPromptTable] = useState<TableItem | null>(null);
  const [cleanPromptCandidates, setCleanPromptCandidates] = useState<WaitingTableItem[]>([]);

  // 开台表单
  const [openGuests, setOpenGuests] = useState<number>(2);
  const [openServer, setOpenServer] = useState<string>('小林 (No.04)');

  // 结账打单表单 (含 AA 均摊与折扣体系)
  const [billDiscount, setBillDiscount] = useState<number>(1.0);
  const [isAaSplit, setIsAaSplit] = useState<boolean>(false);
  const [aaGuestCount, setAaGuestCount] = useState<number>(2);

  // 转台表单
  const [targetTableId, setTargetTableId] = useState<string>('');

  // 监听等位队列与配置变更
  useEffect(() => {
    const handleQueueUpdated = (e: Event) => {
      const detail = (e as CustomEvent<WaitingTableItem[]>).detail;
      if (detail && Array.isArray(detail)) {
        setWaitingQueue(detail);
      } else {
        setWaitingQueue(getWaitingQueue());
      }
    };
    const handleAutoTransferConfig = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      if (typeof detail === 'boolean') {
        setAutoTransferOnClean(detail);
      } else {
        setAutoTransferOnClean(getAutoTransferConfig());
      }
    };
    window.addEventListener('obsidian_waiting_queue_updated', handleQueueUpdated);
    window.addEventListener('obsidian_auto_transfer_config_changed', handleAutoTransferConfig);
    return () => {
      window.removeEventListener('obsidian_waiting_queue_updated', handleQueueUpdated);
      window.removeEventListener('obsidian_auto_transfer_config_changed', handleAutoTransferConfig);
    };
  }, []);

  // 扫码枪硬件事件监听
  useEffect(() => {
    const unsub = globalScannerEngine.subscribe((result) => {
      if (result.type === 'table' && result.matchedData) {
        const tbl = result.matchedData as TableItem;
        if (tbl.status === 'idle') {
          handleOpenModal(tbl);
          showToast(`[工控扫码枪] 识别桌台 ${tbl.name}，已打开开台面板`);
        } else if (tbl.status === 'dining') {
          handleBillModal(tbl);
          showToast(`[工控扫码枪] 识别桌台 ${tbl.name}，已载入结账清单`);
        }
      } else if (result.type === 'member' && activeModal === 'bill') {
        setBillDiscount(0.88);
        showToast(`[工控扫码枪] 识别会员卡，已自动激活 VIP 8.8折专属优惠！`);
      }
    });
    return () => unsub();
  }, [tables, activeModal]);

  // 跨组件事件总线监听 (KDS / 沽清 / 转场)
  useEffect(() => {
    const unsubKds = merchantEventBus.on('merchant:kds_dish_completed', (payload) => {
      const latestTables = safeGetStorage<TableItem[]>('obsidian_merchant_tables', []);
      if (latestTables.length > 0) {
        latestTables.forEach((t) => {
          const match =
            payload.ticketNo.includes(t.code) ||
            (t.orderNo && t.orderNo.includes(payload.ticketNo.replace(/^#/, '')));
          if (match && onUpdateTable) {
            onUpdateTable(t);
          }
        });
      }
    });

    const unsubSoldOut = merchantEventBus.on('merchant:dish_sold_out', (payload) => {
      if (payload.isSoldOut) {
        const affectedTables = tables.filter(
          (t) =>
            t.status === 'dining' &&
            t.orderItems?.some((it) => it.name === payload.dishName && it.serveStatus !== 'served')
        );
        if (affectedTables.length > 0) {
          const codes = affectedTables.map((t) => t.code).join('、');
          showToast(`⚠️【沽清预警】「${payload.dishName}」已沽清，在座桌台（${codes}）包含尚未出餐项目！`);
        }
      }
    });

    const unsubStall = merchantEventBus.on('merchant:stall_relocated', (payload) => {
      showToast(`🚚【餐车已转场至 ${payload.stallName}】桌台建议容量: ${payload.maxTables} 桌，已联动校准外摆区！`);
    });

    return () => {
      unsubKds();
      unsubSoldOut();
      unsubStall();
    };
  }, [tables, onUpdateTable]);

  // 保洁归位逻辑 (自动转移 / 手动确认弹窗)
  const handleCleanComplete = (tbl: TableItem) => {
    const activeWaitings = waitingQueue.filter((w) => w.status === 'waiting');
    if (autoTransferOnClean && activeWaitings.length > 0) {
      const res = onTableCleanedRelease(tbl.id);
      if (res.transferred && res.waitingItem && res.updatedTable) {
        voiceAlerts.speakText(
          `请等位单号 ${res.waitingItem.code}，${res.waitingItem.guests}位贵宾，到 ${res.updatedTable.code} 号桌就座用餐！`,
          { chimeType: 'call' }
        );
        showToast(
          `【保洁自动流转】桌台 ${res.updatedTable.code} 已纳入等位 ${res.waitingItem.code} (${res.waitingItem.guests}人) 并广播叫号！`
        );
      } else {
        onReleaseTable(tbl.id);
        showToast(`桌台 ${tbl.code} 保洁归位，已恢复空闲就绪！`);
      }
    } else if (!autoTransferOnClean && activeWaitings.length > 0) {
      setCleanPromptTable(tbl);
      setCleanPromptCandidates(activeWaitings);
      setActiveModal('cleanPrompt');
    } else {
      onReleaseTable(tbl.id);
      showToast(`桌台 ${tbl.code} 保洁归位，已恢复空闲就绪！`);
    }
  };

  const handleOpenModal = (tbl: TableItem) => {
    setSelectedTable(tbl);
    setOpenGuests(tbl.capacity || 2);
    setActiveModal('open');
  };

  const handleBillModal = (tbl: TableItem) => {
    setSelectedTable(tbl);
    setBillDiscount(1.0);
    setIsAaSplit(false);
    setAaGuestCount(tbl.currentGuests || 2);
    setActiveModal('bill');
  };

  const handleTransferModal = (tbl: TableItem) => {
    setSelectedTable(tbl);
    const availableTarget = tables.find((t) => t.status === 'idle' && t.id !== tbl.id);
    setTargetTableId(availableTarget ? availableTarget.id : '');
    setActiveModal('transfer');
  };

  const handleVoidOrderModal = (tbl: TableItem) => {
    setVoidTargetTable(tbl);
    setVoidReason('顾客退单/未就餐离店');
    setCustomVoidReason('');
    setVoidTargetStatus('idle');
    setActiveModal('voidOrder');
  };

  const handleOpenManualTransfer = (w: WaitingTableItem) => {
    setWaitingToTransfer(w);
    const idleTbls = tables.filter((t) => t.status === 'idle');
    setTransferTargetTableId(idleTbls.length > 0 ? idleTbls[0].id : tables[0]?.id || '');
    setActiveModal('manualTransfer');
  };

  const handleConfirmVoidOrder = () => {
    if (!voidTargetTable) return;
    const finalReason = voidReason === '自定义输入' ? customVoidReason.trim() || '前台手动作废' : voidReason;
    if (onVoidTableOrder) {
      onVoidTableOrder(voidTargetTable.id, finalReason, voidTargetStatus);
    } else {
      businessTransactionEngine.executeVoidTableOrder({
        tableId: voidTargetTable.id,
        reason: finalReason,
        targetStatus: voidTargetStatus,
        operatorName: '工控前台值班领班',
        showToast
      });
    }
    setActiveModal(null);
    setVoidTargetTable(null);
  };

  const handleQuickOpenTable = () => {
    const firstIdle = tables.find((t) => t.status === 'idle');
    if (firstIdle) {
      handleOpenModal(firstIdle);
    } else {
      showToast('当前台位已全部满座，请引导顾客登记等位候补！');
    }
  };

  const handleCleanAllTables = () => {
    const cleaningTables = tables.filter((t) => t.status === 'cleaning');
    if (cleaningTables.length === 0) {
      showToast('当前没有待保洁桌台');
      return;
    }
    cleaningTables.forEach((t) => onReleaseTable(t.id));
    showToast(`已一键归位 ${cleaningTables.length} 张桌台，全部恢复空闲！`);
  };

  const handleCopyOrderNo = (orderNoStr: string) => {
    if (!orderNoStr) return;
    navigator.clipboard?.writeText(orderNoStr);
    setCopiedOrderMap((prev) => ({ ...prev, [orderNoStr]: true }));
    showToast(`单号 ${orderNoStr} 已复制到剪贴板`);
    setTimeout(() => {
      setCopiedOrderMap((prev) => ({ ...prev, [orderNoStr]: false }));
    }, 2000);
  };

  const toggleTableDishesExpand = (tableId: string) => {
    setExpandedTableDishes((prev) => ({
      ...prev,
      [tableId]: !prev[tableId]
    }));
  };

  // 区域定义 (条件筛选选项)
  const zoneOptions: { id: TableZone; label: string; count: number }[] = [
    { id: 'all', label: '全部台位', count: tables.length },
    { id: 'patio', label: '餐车外摆区', count: tables.filter((t) => t.zone === 'patio').length },
    { id: 'hall', label: '室内散座', count: tables.filter((t) => t.zone === 'hall').length },
    { id: 'booth', label: '雅致卡座', count: tables.filter((t) => t.zone === 'booth').length }
  ];

  // 条件按钮超过3个时自动创建下拉菜单栏
  const MAX_VISIBLE_ZONE_BUTTONS = 3;
  const isZoneDropdownNeeded = zoneOptions.length > MAX_VISIBLE_ZONE_BUTTONS;
  const visibleZoneOptions = isZoneDropdownNeeded
    ? zoneOptions.slice(0, MAX_VISIBLE_ZONE_BUTTONS)
    : zoneOptions;
  const overflowZoneOptions = isZoneDropdownNeeded
    ? zoneOptions.slice(MAX_VISIBLE_ZONE_BUTTONS)
    : [];

  const isOverflowZoneSelected = overflowZoneOptions.some((z) => z.id === selectedZone);
  const selectedOverflowZone = overflowZoneOptions.find((z) => z.id === selectedZone);

  // 筛选桌台
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      if (selectedZone !== 'all' && t.zone !== selectedZone) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchOrderNo = t.orderNo?.toLowerCase().includes(q);
      const matchCode = t.code.toLowerCase().includes(q);
      const matchName = t.name.toLowerCase().includes(q);
      const matchServer = t.serverName?.toLowerCase().includes(q);
      const matchDishes = t.orderItems?.some((d) => d.name.toLowerCase().includes(q));

      const matchDineInOrder = (orders || []).some((o) => {
        const channel = resolveOrderChannelType(o);
        if (channel !== 'dine_in') return false;
        const isThisTable =
          (o.tableCode && o.tableCode.toLowerCase() === t.code.toLowerCase()) ||
          (o.tableId && o.tableId === t.id) ||
          (t.code === 'A2' &&
            (normalizeOrderKey(o.orderNo) === '7078' || normalizeOrderKey(o.id) === '7078'));
        if (!isThisTable) return false;
        return (
          o.orderNo.toLowerCase().includes(q) ||
          (o.items && o.items.some((it) => it.name.toLowerCase().includes(q)))
        );
      });

      return Boolean(
        matchOrderNo || matchCode || matchName || matchServer || matchDishes || matchDineInOrder
      );
    });
  }, [tables, selectedZone, searchQuery, orders]);

  // 遥测指标计算
  const totalTablesCount = tables.length;
  const idleCount = tables.filter((t) => t.status === 'idle').length;
  const diningCount = tables.filter((t) => t.status === 'dining').length;
  const cleaningCount = tables.filter((t) => t.status === 'cleaning').length;
  const reservedCount = tables.filter((t) => t.status === 'reserved').length;
  const activeOccupancyRate =
    totalTablesCount > 0 ? Math.round((diningCount / totalTablesCount) * 100) : 0;
  const activeWaitings = useMemo(() => waitingQueue.filter((w) => w.status === 'waiting'), [waitingQueue]);
  const waitingGuestsCount = activeWaitings.length;

  // 智能等位撮合推荐计算 (容量最适空桌)
  const smartMatch = useMemo(() => {
    const idleTables = tables.filter((t) => t.status === 'idle');
    if (activeWaitings.length === 0 || idleTables.length === 0) return null;

    const bestWait = activeWaitings[0];
    const bestMatchTable =
      [...idleTables].sort((a, b) => {
        const fitA = a.capacity >= bestWait.guests ? 1 : 0;
        const fitB = b.capacity >= bestWait.guests ? 1 : 0;
        if (fitA !== fitB) return fitB - fitA;
        return Math.abs(a.capacity - bestWait.guests) - Math.abs(b.capacity - bestWait.guests);
      })[0] || idleTables[0];

    return {
      wait: bestWait,
      table: bestMatchTable
    };
  }, [activeWaitings, tables]);

  // 全屏出餐大屏模式判断
  if (selectedTableForDetail && detailViewMode === 'fullscreen') {
    const freshTable =
      tables.find((t) => t.id === selectedTableForDetail.id) || selectedTableForDetail;
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between bg-white border border-[#CCCCCC] px-3.5 py-2.5 rounded-[3px] shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs bg-neutral-900 text-white px-2 py-0.5 rounded-[3px]">
              {freshTable.code} 桌
            </span>
            <span className="text-xs text-neutral-800 font-bold">全屏传菜与出餐大屏模式</span>
          </div>
          <button
            type="button"
            onClick={() => setDetailViewMode('split')}
            className="px-3 py-1.5 text-xs font-bold bg-neutral-900 text-white rounded-[3px] hover:bg-black transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>还原右侧画中画分栏</span>
          </button>
        </div>
        <TableDishProgressView
          table={freshTable}
          onBack={() => setSelectedTableForDetail(null)}
          onUpdateTable={(updated) => {
            onUpdateTable?.(updated);
            setSelectedTableForDetail(updated);
            if (updated.orderNo && updated.orderItems && onSyncOrderItems) {
              onSyncOrderItems(updated.orderNo, updated.orderItems);
            }
          }}
          onOpenBillModal={(tbl) => {
            setSelectedTableForDetail(null);
            handleBillModal(tbl);
          }}
          onVoidOrder={(tbl) => {
            setSelectedTableForDetail(null);
            handleVoidOrderModal(tbl);
          }}
          showToast={showToast}
        />
      </div>
    );
  }

  return (
    <div className="w-full space-y-3 font-sans text-neutral-900 selection:bg-[#006494]/15">


      {/* ========================================================================= */}
      {/* 2. 全端自适应工业精密台位矩阵 (Responsive Precision Matrix)               */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        {/* 单排一体化调度顶栏 */}
        <div className="bg-white border border-[#CCCCCC] rounded-[3px] p-2.5 shadow-2xs flex items-center justify-between gap-3 overflow-x-auto scrollbar-none flex-nowrap">
          {/* 左侧：主控胶囊 + 区域胶囊按钮组 */}
          <div className="flex items-center gap-2 shrink-0">
            {/* 标志性主控胶囊 */}
            <div className="h-8 px-3 rounded-full border border-neutral-900 bg-white flex items-center gap-2 shadow-2xs shrink-0">
              <UtensilsCrossed className="w-3.5 h-3.5 text-neutral-950" />
              <span className="text-xs font-bold tracking-tight text-neutral-950 whitespace-nowrap">
                堂食台位精密矩阵 V2
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
            </div>

            {/* 分区胶囊筛选 (条件按钮超过3个时自动创建下拉菜单栏) */}
            <div className="flex items-center gap-1.5 shrink-0 relative" ref={zoneDropdownRef}>
              {visibleZoneOptions.map((zone) => {
                const isSelected = selectedZone === zone.id;
                return (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() => {
                      setSelectedZone(zone.id);
                      setIsZoneDropdownOpen(false);
                    }}
                    className={`h-8 px-3 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer shadow-2xs ${
                      isSelected
                        ? 'bg-white border border-emerald-600 text-emerald-700 ring-1.5 ring-emerald-600/15 shadow-xs'
                        : 'bg-white text-neutral-600 border border-[#E2E2DF] hover:bg-neutral-50 hover:text-neutral-900 hover:border-neutral-300'
                    }`}
                  >
                    <span>{zone.label}</span>
                    <span
                      className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-neutral-100 text-neutral-500'
                      }`}
                    >
                      {zone.count}
                    </span>
                  </button>
                );
              })}

              {/* 条件按钮超过3个时自动生成的下拉菜单栏 */}
              {isZoneDropdownNeeded && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsZoneDropdownOpen((prev) => !prev)}
                    className={`h-8 px-3 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer shadow-2xs ${
                      isOverflowZoneSelected
                        ? 'bg-white border border-emerald-600 text-emerald-700 ring-1.5 ring-emerald-600/15 shadow-xs'
                        : 'bg-white text-neutral-600 border border-[#E2E2DF] hover:bg-neutral-50 hover:text-neutral-900 hover:border-neutral-300'
                    }`}
                    title="展开更多分区条件"
                  >
                    <span>
                      {isOverflowZoneSelected && selectedOverflowZone
                        ? selectedOverflowZone.label
                        : '更多分区'}
                    </span>
                    <span
                      className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                        isOverflowZoneSelected
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-neutral-100 text-neutral-500'
                      }`}
                    >
                      {isOverflowZoneSelected && selectedOverflowZone
                        ? selectedOverflowZone.count
                        : `+${overflowZoneOptions.length}`}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        isZoneDropdownOpen ? 'rotate-180 text-emerald-700' : 'text-neutral-400'
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {isZoneDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.96 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="absolute left-0 top-full mt-1.5 min-w-[200px] rounded-xl backdrop-blur-xl bg-white/95 border border-neutral-200/90 shadow-xl shadow-neutral-950/10 p-1.5 z-50 space-y-0.5"
                      >
                        <div className="px-2.5 py-1 text-[10.5px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-100 mb-1 flex items-center justify-between">
                          <span>扩展条件筛选</span>
                          <span className="text-[10px] text-neutral-400">{overflowZoneOptions.length} 个条件</span>
                        </div>
                        {overflowZoneOptions.map((zone) => {
                          const isSelected = selectedZone === zone.id;
                          return (
                            <button
                              key={zone.id}
                              type="button"
                              onClick={() => {
                                setSelectedZone(zone.id);
                                setIsZoneDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-neutral-900/[0.07] text-neutral-950 font-bold'
                                  : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950 font-medium'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isSelected ? 'bg-emerald-600' : 'bg-neutral-300'
                                  }`}
                                />
                                <span>{zone.label}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                    isSelected
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-neutral-100 text-neutral-500'
                                  }`}
                                >
                                  {zone.count}
                                </span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                              </div>
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          {/* 右侧：搜索栏 + 工控操作按钮组 */}
          <div className="flex items-center gap-2 min-w-0">
            {/* 搜索框 */}
            <div className="relative w-40 lg:w-52 shrink-0">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="桌号/单号/菜品/服务员..."
                className="w-full h-8 pl-8 pr-7 text-[16px] md:text-xs bg-[#FAF9F7] border border-[#CCCCCC] rounded-[3px] focus:bg-white focus:border-[#006494] focus:outline-none transition-colors touch-manipulation"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* 一键开台 */}
            <button
              type="button"
              onClick={handleQuickOpenTable}
              className="h-8 px-3 rounded-[3px] bg-[#006494] hover:bg-[#00537A] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>一键开台</span>
            </button>

            {/* 一键保洁 */}
            <button
              type="button"
              onClick={handleCleanAllTables}
              className="h-8 px-2.5 rounded-[3px] bg-white border border-[#CCCCCC] hover:border-neutral-400 text-neutral-800 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              title="一键将所有清洁中的桌台归位"
            >
              <Brush className="w-3.5 h-3.5 text-[#C26D00]" />
              <span className="hidden xl:inline">一键保洁</span>
            </button>

            {/* 等位队列面板折叠切换键 */}
            <button
              type="button"
              onClick={() => setIsWaitingQueueOpen((prev) => !prev)}
              className={`h-8 px-2.5 rounded-[3px] border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                isWaitingQueueOpen
                  ? 'bg-[#006494]/10 border-[#006494] text-[#006494]'
                  : 'bg-white border-[#CCCCCC] hover:border-neutral-400 text-neutral-800'
              }`}
              title="展开/折叠等位候补队列总线"
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>等位队列</span>
              {waitingGuestsCount > 0 && (
                <span className="bg-[#C26D00] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full leading-none">
                  {waitingGuestsCount}
                </span>
              )}
            </button>

            {/* 桌码立牌与批量打印中心 */}
            <button
              type="button"
              onClick={() => setIsBatchPrintModalOpen(true)}
              className="h-8 px-2.5 rounded-[3px] bg-white border border-[#CCCCCC] hover:border-neutral-400 text-neutral-800 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              title="生成并打印全场桌台亚克力立牌点餐二维码"
            >
              <QrCode className="w-3.5 h-3.5 text-neutral-700" />
              <span className="hidden xl:inline">桌码立牌</span>
            </button>

            {/* 全景 CCTV 点餐监控大屏 */}
            <button
              type="button"
              onClick={() => {
                const defaultTbl = tables.find((t) => t.code === 'A2') || tables.find((t) => t.status === 'dining') || tables[0];
                setCctvTargetTable(defaultTbl);
                setIsCctvModalOpen(true);
              }}
              className="h-8 px-2.5 rounded-[3px] bg-[#121316] hover:bg-neutral-800 text-white border border-[#2B303C] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-2xs"
              title="开启桌台全景全链路点餐监控与时序回放大屏"
            >
              <div className="relative flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span className="absolute w-3.5 h-3.5 rounded-full bg-rose-500/30 animate-ping" />
              </div>
              <Radio className="w-3.5 h-3.5 text-[#3BB4FE]" />
              <span>全景CCTV大屏</span>
            </button>

            {/* 切回原版 V1 */}
            {onSwitchToV1 && (
              <button
                type="button"
                onClick={onSwitchToV1}
                className="h-8 px-2.5 rounded-[3px] bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                title="切换回原版堂食台位界面"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#006494]" />
                <span className="inline">切回原版</span>
              </button>
            )}
          </div>
        </div>

        {/* 遥测状态总线 (全端自适应精密发丝线指标带: 手机2列/平板3列/电脑6列) */}
        <div className="bg-white border border-[#CCCCCC] rounded-[3px] p-2.5 shadow-2xs grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-y-2 divide-y sm:divide-y-0 sm:divide-x divide-[#E2E2DF]">
          <div className="px-3 first:pl-1">
            <div className="text-[11px] text-neutral-500 font-medium">总台位数</div>
            <div className="text-base font-bold text-neutral-900 mt-0.5 tracking-tight flex items-baseline gap-1">
              <span>{totalTablesCount}</span>
              <span className="text-[10px] text-neutral-400 font-normal">桌</span>
            </div>
          </div>
          <div className="px-3">
            <div className="text-[11px] text-[#00875A] font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00875A]" />
              <span>空闲待客</span>
            </div>
            <div className="text-base font-bold text-[#00875A] mt-0.5 tracking-tight flex items-baseline gap-1">
              <span>{idleCount}</span>
              <span className="text-[10px] text-[#00875A]/60 font-normal">桌</span>
            </div>
          </div>
          <div className="px-3 pt-2 sm:pt-0">
            <div className="text-[11px] text-[#006494] font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#006494]" />
              <span>在席就餐</span>
            </div>
            <div className="text-base font-bold text-[#006494] mt-0.5 tracking-tight flex items-baseline gap-1">
              <span>{diningCount}</span>
              <span className="text-[10px] text-[#006494]/60 font-normal">桌</span>
            </div>
          </div>
          <div className="px-3 pt-2 sm:pt-0">
            <div className="text-[11px] text-[#C26D00] font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C26D00]" />
              <span>保洁翻台</span>
            </div>
            <div className="text-base font-bold text-[#C26D00] mt-0.5 tracking-tight flex items-baseline gap-1">
              <span>{cleaningCount}</span>
              <span className="text-[10px] text-[#C26D00]/60 font-normal">桌</span>
            </div>
          </div>
          <div className="px-3 pt-2 sm:pt-0">
            <div className="text-[11px] text-[#7B1FA2] font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7B1FA2]" />
              <span>预约锁定</span>
            </div>
            <div className="text-base font-bold text-[#7B1FA2] mt-0.5 tracking-tight flex items-baseline gap-1">
              <span>{reservedCount}</span>
              <span className="text-[10px] text-[#7B1FA2]/60 font-normal">桌</span>
            </div>
          </div>
          <div className="px-3 pt-2 sm:pt-0">
            <div className="text-[11px] text-neutral-600 font-medium flex items-center justify-between">
              <span>实时上座率</span>
              <span className="font-bold text-neutral-900">{activeOccupancyRate}%</span>
            </div>
            <div className="w-full bg-[#E2E2DF] h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div
                className="bg-[#006494] h-full transition-all duration-300 rounded-full"
                style={{ width: `${Math.min(100, activeOccupancyRate)}%` }}
              />
            </div>
          </div>
        </div>

        {/* 智能排队叫号与空闲台位敏捷撮合中心 (Smart Queue Match Strip) */}
        {smartMatch && (
          <div className="bg-[#FAF9F7] border border-[#006494]/40 rounded-[3px] p-2.5 shadow-2xs flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <div className="h-6 px-2 rounded-[3px] bg-[#006494] text-white font-bold flex items-center gap-1 text-[11px] shadow-2xs">
                <Zap className="w-3.5 h-3.5 fill-white" />
                <span>智能等位撮合推荐</span>
              </div>
              <span className="text-neutral-700">
                等位 <strong className="text-neutral-950 font-bold">{smartMatch.wait.code} 号</strong>
                （{smartMatch.wait.guests}人 · 已候补 {smartMatch.wait.elapsedMinutes || 1}m）匹配最适空闲桌台
                <strong className="text-[#006494] font-bold ml-1">{smartMatch.table.code} 桌</strong> ({smartMatch.table.name} · {smartMatch.table.capacity}人位)
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                const res = businessTransactionEngine.executeMatchQueueToTable({
                  queueItemId: smartMatch.wait.id,
                  tableId: smartMatch.table.id,
                  guestCount: smartMatch.wait.guests,
                  showToast
                });
                if (res.success && res.table) {
                  onUpdateTable?.(res.table);
                }
              }}
              className="h-7 px-3 bg-[#006494] hover:bg-[#00537A] text-white font-bold text-xs rounded-[3px] shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
              title="呼叫该等位顾客并直接开台安排就座"
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>一键叫号 · 入座开台</span>
            </button>
          </div>
        )}

        {/* 等位桌号队列与自动转移总线面板 (可折叠) */}
        {isWaitingQueueOpen && (
          <div className="bg-white p-3 rounded-[3px] border border-[#CCCCCC] shadow-2xs space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap border-b border-[#E2E2DF] pb-2.5">
              <div className="flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-[#006494]" />
                <span className="font-bold text-xs text-neutral-900">等位桌号队列总线</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-[2px] ${
                    activeWaitings.length > 0
                      ? 'bg-[#C26D00] text-white'
                      : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                  }`}
                >
                  {activeWaitings.length > 0 ? `${activeWaitings.length} 组排队` : '暂无排队'}
                </span>
                <span className="text-[11px] text-neutral-400 hidden xl:inline">
                  支持食客先取等位号先行点单备餐，桌台清理后自动或手动转移入座
                </span>
              </div>

              {/* 自动转移工控开关 + 取号登记按键 */}
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center gap-2 px-2.5 py-1 bg-[#FAF9F7] hover:bg-neutral-100 border border-[#CCCCCC] rounded-[3px] cursor-pointer transition-colors"
                  onClick={() => {
                    const nextVal = !autoTransferOnClean;
                    setAutoTransferOnClean(nextVal);
                    setAutoTransferConfig(nextVal);
                    showToast(
                      nextVal
                        ? '已开启【保洁后自动转移】：桌台保洁完成后将自动为等位客人分配入座并语音叫号！'
                        : '已切换为【手动确认模式】：桌台保洁完成后将弹出候选名单供手动确认。'
                    );
                  }}
                  title="点击切换：桌台保洁完成后是否自动纳入等待队列的食客"
                >
                  <span className="text-[11px] font-medium text-neutral-600">保洁后自动流转:</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        autoTransferOnClean ? 'bg-[#00875A]' : 'bg-neutral-300'
                      }`}
                    />
                    <span
                      className={`text-xs font-bold ${
                        autoTransferOnClean ? 'text-[#00875A]' : 'text-neutral-500'
                      }`}
                    >
                      {autoTransferOnClean ? '自动流转 (开)' : '手动确认 (关)'}
                    </span>
                  </div>
                  {autoTransferOnClean ? (
                    <ToggleRight className="w-4 h-4 text-[#00875A]" />
                  ) : (
                    <ToggleLeft className="w-4 h-4 text-neutral-400" />
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setActiveModal('addWaiting')}
                  className="h-7 px-2.5 bg-[#006494] hover:bg-[#00537A] text-white rounded-[3px] font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ 登记等位</span>
                </button>
              </div>
            </div>

            {/* 等位卡片流或空状态 */}
            {activeWaitings.length === 0 ? (
              <div className="py-3 px-3 bg-[#FAF9F7] rounded-[3px] border border-dashed border-[#CCCCCC] flex items-center justify-between text-xs text-neutral-500">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00875A]" />
                  <span>当前无等位排队客单。现有桌台翻台与就餐流转正常。</span>
                </div>
                <span className="text-[11px] text-neutral-400">
                  新顾客扫码取号或前台登记后，将在此实时呈现排队与提前备餐状态
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {activeWaitings.map((w) => {
                  const hasOrder = Boolean(w.orderNo || (w.orderItems && w.orderItems.length > 0));
                  return (
                    <div
                      key={w.id}
                      className="p-2.5 bg-[#FAF9F7] border border-[#CCCCCC] hover:border-[#006494] rounded-[3px] shadow-2xs flex flex-col justify-between gap-2 transition-colors"
                    >
                      {/* 卡片头部 */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs bg-neutral-900 text-white px-1.5 py-0.2 rounded-[2px]">
                            {w.code}
                          </span>
                          <span className="font-bold text-xs text-neutral-900 truncate max-w-[120px]">
                            {w.guestName || '等位客人'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                          <span className="font-semibold text-neutral-700">{w.guests}人</span>
                          <span>·</span>
                          <span className="flex items-center gap-0.5 text-neutral-700 font-semibold">
                            <Clock className="w-3 h-3 text-neutral-400" />
                            <span>{w.elapsedMinutes || 1}m</span>
                          </span>
                        </div>
                      </div>

                      {/* 卡片内容 */}
                      <div className="space-y-1 text-[11px] text-neutral-600">
                        <div className="flex items-center justify-between text-[10.5px] text-neutral-500">
                          <span>{w.phone || '现场取号'} · 意向: {w.preferredZone || '外摆区'}</span>
                          <span>取号 {w.createdAt}</span>
                        </div>

                        {hasOrder ? (
                          <div className="bg-white p-1.5 rounded-[2px] border border-[#E2E2DF] text-neutral-800 flex items-center justify-between">
                            <div className="flex items-center gap-1 font-semibold text-[11px] text-[#006494]">
                              <ChefHat className="w-3 h-3 text-[#006494]" />
                              <span>提前备餐中 ({w.orderItems?.length || 1}道菜)</span>
                            </div>
                            <span className="font-bold text-neutral-900 text-[11px]">
                              ¥{(w.totalAmount || 0).toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <div className="bg-white p-1 rounded-[2px] border border-[#E2E2DF] text-neutral-400 text-[10.5px]">
                            未提前点单 · 等待分配就座
                          </div>
                        )}
                      </div>

                      {/* 卡片底部操作 */}
                      <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-[#E2E2DF]">
                        <button
                          type="button"
                          onClick={() => {
                            cancelWaitingTable(w.id);
                            showToast(`等位号 ${w.code} 已取消！`);
                          }}
                          className="h-6.5 px-2 bg-white hover:bg-rose-50 text-neutral-600 hover:text-rose-600 border border-[#CCCCCC] rounded-[2px] text-[11px] font-semibold cursor-pointer transition-colors w-auto"
                        >
                          取消
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenManualTransfer(w)}
                          className="h-6.5 px-2.5 bg-[#006494] hover:bg-[#00537A] text-white rounded-[2px] font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs w-auto"
                        >
                          <ArrowRightLeft className="w-3 h-3" />
                          <span>手动转移入座</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 主体分栏：台位矩阵 + (可选) 右侧画中画出餐时序大屏 */}
        <div className="flex flex-col lg:flex-row items-start gap-3 w-full">
          {/* 左侧：高密度工业台位矩阵卡片流 */}
          <div className={selectedTableForDetail && detailViewMode === 'split' ? 'w-full lg:w-[62%] xl:w-[64%] min-w-0 transition-all' : 'w-full min-w-0 transition-all'}>
            {filteredTables.length === 0 ? (
              <div className="bg-white border border-[#CCCCCC] rounded-[3px] p-12 text-center shadow-2xs space-y-3">
                <UtensilsCrossed className="w-8 h-8 text-neutral-300 mx-auto" />
                <div className="text-sm font-bold text-neutral-700">未检索到匹配的台位</div>
                <p className="text-xs text-neutral-400">
                  可更换分区选项或清除检索关键字重新扫描。
                </p>
              </div>
            ) : (
              <div className={`grid gap-3.5 ${selectedTableForDetail && detailViewMode === 'split' ? 'grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                {filteredTables.map((tbl) => {
                  // 匹配订单项与出餐状态
                  const matchedDineInOrder = orders.find((o) => {
                    const ch = resolveOrderChannelType(o);
                    if (ch !== 'dine_in') return false;
                    return (
                      (o.tableCode && o.tableCode.toLowerCase() === tbl.code.toLowerCase()) ||
                      (o.tableId && o.tableId === tbl.id) ||
                      (tbl.code === 'A2' &&
                        (normalizeOrderKey(o.orderNo) === '7078' ||
                          normalizeOrderKey(o.id) === '7078'))
                    );
                  });

                  const isEffectiveDining = tbl.status === 'dining' || Boolean(matchedDineInOrder);
                  const isDining = isEffectiveDining;
                  const isIdle = tbl.status === 'idle' && !matchedDineInOrder;
                  const isCleaning = tbl.status === 'cleaning';
                  const isReserved = tbl.status === 'reserved';

                  const orderItems =
                    tbl.orderItems && tbl.orderItems.length > 0
                      ? tbl.orderItems
                      : matchedDineInOrder?.items
                      ? matchedDineInOrder.items.map((it, idx) => ({
                          dishId: it.dishId || `dish-${idx}`,
                          name: it.name,
                          price: it.price,
                          quantity: it.quantity,
                          kitchenStation: 'charcoal' as const,
                          serveStatus:
                            matchedDineInOrder.stepIndex && matchedDineInOrder.stepIndex >= 3
                              ? ('served' as const)
                              : ('cooking' as const)
                        }))
                      : [];

                  const totalDishes = orderItems.reduce((acc, cur) => acc + cur.quantity, 0);
                  const servedDishes = orderItems
                    .filter((d) => d.serveStatus === 'served')
                    .reduce((acc, cur) => acc + cur.quantity, 0);
                  const servePercent =
                    totalDishes > 0 ? Math.round((servedDishes / totalDishes) * 100) : 0;
                  const hasUrged = orderItems.some((d) => d.serveStatus === 'urged');

                  // 计算金额
                  const totalAmount =
                    tbl.totalAmount ||
                    matchedDineInOrder?.totalAmount ||
                    orderItems.reduce((acc, cur) => acc + cur.price * cur.quantity, 0);

                  const orderNo = tbl.orderNo || matchedDineInOrder?.orderNo || '';
                  const isDishesExpanded = Boolean(expandedTableDishes[tbl.id]);
                  const displayedDishes = isDishesExpanded ? orderItems : orderItems.slice(0, 3);
                  const isSelectedInDetail = selectedTableForDetail?.id === tbl.id;

                  const zoneLabel =
                    tbl.zone === 'patio'
                      ? '外摆区'
                      : tbl.zone === 'hall'
                      ? '散座区'
                      : tbl.zone === 'booth'
                      ? '卡座区'
                      : '堂食区';

                  return (
                    <div
                      key={tbl.id}
                      className={`bg-white border rounded-[3px] transition-all flex flex-col justify-between shadow-2xs hover:shadow-xs ${
                        isSelectedInDetail
                          ? 'border-[#006494] ring-1.5 ring-[#006494]/20'
                          : 'border-[#CCCCCC] hover:border-neutral-400'
                      }`}
                    >
                      {/* 卡片头部 */}
                      <div className="p-3 border-b border-[#E2E2DF] space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {/* 桌号 */}
                            <span className="text-base font-extrabold text-neutral-950 tracking-tight">
                              {tbl.code}
                            </span>
                            {/* 分区微标 */}
                            <span className="text-[10px] font-semibold text-neutral-500 bg-[#F4F4F2] border border-[#E2E2DF] px-1.5 py-0.2 rounded-[3px]">
                              {zoneLabel}
                            </span>

                            {/* 协同审批与状态胶囊 (TableSynergyHeaderPill) */}
                            <TableSynergyHeaderPill
                              tableCode={tbl.code}
                              tableId={tbl.id}
                              isDining={isDining}
                              onOpenSynergyDrawer={(sess) => setActiveSynergySession(sess)}
                              showToast={showToast}
                            />
                          </div>

                          {/* 状态徽记与快捷工具组 */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* 单桌专属二维码立牌查看/打印按钮 */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsBatchPrintModalOpen(true);
                              }}
                              className="p-1 hover:bg-neutral-100 rounded text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
                              title={`查看/打印 ${tbl.code} 桌台二维码立牌`}
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>

                            {/* 订单作废/撤销快捷按钮 */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVoidOrderModal(tbl);
                              }}
                              className="p-1 hover:bg-rose-50 rounded text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title={`作废/撤销 ${tbl.code} 桌台订单`}
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>

                            {isDining && (
                              <span className="text-[11px] font-bold text-[#006494] bg-[#E1F5FE] border border-[#006494]/30 px-2 py-0.5 rounded-[3px] flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#006494] animate-pulse" />
                                <span>在席就餐</span>
                              </span>
                            )}
                            {isIdle && (
                              <span className="text-[11px] font-bold text-[#00875A] bg-[#E8F5E9] border border-[#00875A]/30 px-2 py-0.5 rounded-[3px] flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#00875A]" />
                                <span>空闲待客</span>
                              </span>
                            )}
                            {isCleaning && (
                              <span className="text-[11px] font-bold text-[#C26D00] bg-[#FFF3E0] border border-[#C26D00]/30 px-2 py-0.5 rounded-[3px] flex items-center gap-1">
                                <Brush className="w-3 h-3 text-[#C26D00]" />
                                <span>待保洁 {tbl.elapsedMinutes ? `${tbl.elapsedMinutes}m` : '4m'}</span>
                              </span>
                            )}
                            {isReserved && (
                              <span className="text-[11px] font-bold text-[#7B1FA2] bg-[#F3E5F5] border border-[#7B1FA2]/30 px-2 py-0.5 rounded-[3px] flex items-center gap-1">
                                <span>已预约 {tbl.reservation ? `${tbl.reservation.countdownMinutes}m到店` : '15m到店'}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 次级元数据行 */}
                        <div className="flex items-center justify-between text-[11px] text-neutral-500">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3 text-neutral-400" />
                              <span className="font-semibold text-neutral-700">
                                {tbl.currentGuests || (isDining ? 2 : tbl.capacity)}/{tbl.capacity}人
                              </span>
                            </span>
                            <span>·</span>
                            <span>{tbl.serverName || '服务: 小林'}</span>
                          </div>

                          {isDining && (
                            <span className="flex items-center gap-1 text-neutral-600 font-medium">
                              <Clock className="w-3 h-3 text-neutral-400" />
                              <span>{tbl.elapsedMinutes || 24}m</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 卡片中段：根据就餐状态呈现 */}
                      <div className="p-3 flex-1 space-y-2.5">
                        {isDining ? (
                          <>
                            {/* 出餐制作进度条 */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-neutral-600 font-medium flex items-center gap-1">
                                  <Flame className={`w-3 h-3 ${hasUrged ? 'text-[#D32F2F]' : 'text-[#006494]'}`} />
                                  <span className={hasUrged ? 'text-[#D32F2F] font-bold' : ''}>
                                    {hasUrged ? '加急催单排产中' : '出餐制作进度'}
                                  </span>
                                </span>
                                <span className="font-bold text-neutral-900">
                                  {servedDishes}/{totalDishes} 道 ({servePercent}%)
                                </span>
                              </div>
                              <div className="w-full bg-[#E2E2DF] h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-300 rounded-full ${
                                    hasUrged
                                      ? 'bg-[#D32F2F] animate-pulse'
                                      : servePercent === 100
                                      ? 'bg-[#00875A]'
                                      : 'bg-[#006494]'
                                  }`}
                                  style={{ width: `${servePercent}%` }}
                                />
                              </div>
                            </div>

                            {/* 菜品单项清单 */}
                            {orderItems.length > 0 ? (
                              <div className="space-y-1.5 pt-1">
                                <div className="space-y-1">
                                  {displayedDishes.map((it, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-between text-xs py-0.5 border-b border-neutral-100 last:border-0"
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="font-semibold text-neutral-800 truncate">
                                          {it.name}
                                        </span>
                                        <span className="text-[11px] text-neutral-400 shrink-0">
                                          x{it.quantity}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="text-[11px] text-neutral-500">
                                          ¥{(it.price * it.quantity).toFixed(2)}
                                        </span>
                                        {it.serveStatus === 'served' ? (
                                          <span className="text-[10px] font-bold text-[#00875A] bg-[#E8F5E9] px-1 py-0.2 rounded-[2px]">
                                            已上齐
                                          </span>
                                        ) : it.serveStatus === 'urged' ? (
                                          <span className="text-[10px] font-bold text-white bg-[#D32F2F] px-1 py-0.2 rounded-[2px] animate-pulse">
                                            催单
                                          </span>
                                        ) : (
                                          <span className="text-[10px] font-bold text-[#006494] bg-[#E1F5FE] px-1 py-0.2 rounded-[2px]">
                                            制作中
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {orderItems.length > 3 && (
                                  <button
                                    type="button"
                                    onClick={() => toggleTableDishesExpand(tbl.id)}
                                    className="w-full text-center text-[11px] text-[#006494] hover:text-[#004B70] font-semibold py-0.5 flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    <span>
                                      {isDishesExpanded
                                        ? '收起菜品明细'
                                        : `查看剩余 ${orderItems.length - 3} 道菜品`}
                                    </span>
                                    {isDishesExpanded ? (
                                      <ChevronUp className="w-3 h-3" />
                                    ) : (
                                      <ChevronDown className="w-3 h-3" />
                                    )}
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="text-center py-3 text-neutral-400 text-xs">
                                刚开台，宾客正在点单中...
                              </div>
                            )}

                            {/* 协同监管指标注入 */}
                            <div className="pt-1 border-t border-[#E2E2DF]">
                              <TableCardSynergyMonitor
                                tableCode={tbl.code}
                                tableId={tbl.id}
                                isDining={isDining}
                                showToast={showToast}
                                onOpenSynergyDrawer={(sess) => setActiveSynergySession(sess)}
                              />
                            </div>
                          </>
                        ) : isIdle ? (
                          <div className="py-4 text-center space-y-2">
                            <div className="w-8 h-8 rounded-full bg-[#E8F5E9] text-[#00875A] mx-auto flex items-center justify-center">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <div className="text-xs font-bold text-neutral-700">台位空闲就绪</div>
                            <p className="text-[11px] text-neutral-400">
                              可容纳 {tbl.capacity} 位宾客，支持即时扫码或前台开台
                            </p>
                            {activeWaitings.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const targetWait = activeWaitings.find((w) => w.guests <= tbl.capacity) || activeWaitings[0];
                                  if (targetWait) {
                                    const res = businessTransactionEngine.executeMatchQueueToTable({
                                      queueItemId: targetWait.id,
                                      tableId: tbl.id,
                                      guestCount: targetWait.guests,
                                      showToast
                                    });
                                    if (res.success && res.table) {
                                      onUpdateTable?.(res.table);
                                    }
                                  }
                                }}
                                className="mt-1 h-6 px-2.5 rounded-[2px] bg-[#006494] hover:bg-[#00537A] text-white text-[11px] font-bold inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                              >
                                <Zap className="w-3 h-3 fill-white" />
                                <span>撮合等位 {activeWaitings[0]?.code} 入座</span>
                              </button>
                            )}
                          </div>
                        ) : isCleaning ? (
                          <div className="py-4 text-center space-y-2">
                            <div className="w-8 h-8 rounded-full bg-[#FFF3E0] text-[#C26D00] mx-auto flex items-center justify-center">
                              <Brush className="w-4 h-4" />
                            </div>
                            <div className="text-xs font-bold text-[#C26D00]">等待保洁消毒归位</div>
                            <p className="text-[11px] text-neutral-500">
                              保洁完成后可一键归位或自动纳入等位宾客
                            </p>
                          </div>
                        ) : (
                          <div className="py-2.5 px-1 space-y-2">
                            <div className="text-center">
                              <div className="w-7 h-7 rounded-full bg-[#F3E5F5] text-[#7B1FA2] mx-auto flex items-center justify-center">
                                <Clock className="w-3.5 h-3.5" />
                              </div>
                              <div className="text-xs font-bold text-[#7B1FA2] mt-1">宾客已预订锁定</div>
                            </div>
                            {tbl.reservation ? (
                              <div className="bg-[#FAF9F7] p-2 rounded-[2px] border border-[#E2E2DF] text-[11px] space-y-1">
                                <div className="flex items-center justify-between font-bold text-neutral-900">
                                  <span>宾客: {tbl.reservation.guestName}</span>
                                  <span className="text-[10px] bg-[#7B1FA2] text-white px-1.5 py-0.2 rounded-full">
                                    {tbl.reservation.countdownMinutes}m后到店
                                  </span>
                                </div>
                                <div className="text-neutral-500 flex items-center justify-between text-[10.5px]">
                                  <span>到店时间: {tbl.reservation.timeText}</span>
                                  <span>电话: {tbl.reservation.phone}</span>
                                </div>
                              </div>
                            ) : (
                              <p className="text-[11px] text-neutral-400 text-center">
                                预订客户到店后，可直接点击下方按键一键转入开台就餐
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* 卡片底栏：操作行动键区域 */}
                      <div className="p-2.5 bg-[#FAF9F7] border-t border-[#E2E2DF] space-y-2">
                        {/* 消费总额与单号 (在就餐态展示) / 空闲与保洁态状态指示 */}
                        {isDining ? (
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1">
                              <span className="text-neutral-500 text-[11px]">
                                {orderNo ? `#${orderNo.replace(/^#/, '')}` : '未开单'}
                              </span>
                              {orderNo && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyOrderNo(orderNo)}
                                  className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
                                  title="复制单号"
                                >
                                  {copiedOrderMap[orderNo] ? (
                                    <CheckCheck className="w-3 h-3 text-[#00875A]" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              )}
                            </div>
                            <span className="font-bold text-neutral-900">
                              消费: ¥{Number(totalAmount || 0).toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 text-neutral-500 text-[11px]">
                              {isCleaning ? (
                                <>
                                  <Clock className="w-3 h-3 text-[#C26D00]" />
                                  <span>保洁翻台中 ({tbl.elapsedMinutes || 1}m)</span>
                                </>
                              ) : isReserved ? (
                                <>
                                  <UtensilsCrossed className="w-3 h-3 text-[#7B1FA2]" />
                                  <span>预约席位待到店</span>
                                </>
                              ) : (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#00875A]" />
                                  <span>标准 {tbl.capacity} 人位 · 台位就绪</span>
                                </>
                              )}
                            </div>
                            <span className="text-[11px] text-neutral-400">
                              {isCleaning ? '待复位' : isReserved ? '预订中' : '可直接开台'}
                            </span>
                          </div>
                        )}

                        {/* 动作按键组：统一不全宽，根据文字自动计算，右侧对齐；超过3个时自动折叠下拉菜单 */}
                        <div className="flex items-center justify-end flex-wrap gap-1.5 text-xs relative">
                          {isDining ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedTableForDetail(tbl);
                                }}
                                className="h-7.5 px-2.5 rounded-[3px] bg-white border border-[#CCCCCC] hover:border-neutral-400 text-neutral-800 font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer w-auto shadow-2xs"
                              >
                                <Activity className="w-3.5 h-3.5 text-[#006494]" />
                                <span>出餐时序</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCctvTargetTable(tbl);
                                  setIsCctvModalOpen(true);
                                }}
                                className="h-7.5 px-2 rounded-[3px] bg-[#121316] hover:bg-neutral-800 text-[#3BB4FE] border border-[#2E333D] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer w-auto shadow-2xs"
                                title="打开桌台全景全链路 CCTV 点餐监控与时序回放"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                <Radio className="w-3 h-3 text-[#3BB4FE]" />
                                <span>CCTV</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleBillModal(tbl)}
                                className="h-7.5 px-3 rounded-[3px] bg-[#006494] hover:bg-[#00537A] text-white font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer w-auto shadow-2xs"
                              >
                                <ReceiptText className="w-3.5 h-3.5" />
                                <span>结账打单</span>
                              </button>

                              {/* 超过3个动作按键时自动生成的下拉菜单栏 */}
                              <div className="relative" ref={openCardMenuTableId === tbl.id ? cardMenuRef : undefined}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenCardMenuTableId(openCardMenuTableId === tbl.id ? null : tbl.id);
                                  }}
                                  className={`h-7.5 px-2 rounded-[3px] border text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer w-auto shadow-2xs ${
                                    openCardMenuTableId === tbl.id
                                      ? 'bg-neutral-900 text-white border-neutral-900'
                                      : 'bg-white border-[#CCCCCC] hover:border-neutral-400 text-neutral-700 hover:text-neutral-900'
                                  }`}
                                  title="更多桌台操作"
                                >
                                  <MoreHorizontal className="w-3.5 h-3.5" />
                                  <span>更多</span>
                                  <ChevronDown
                                    className={`w-3 h-3 transition-transform duration-200 ${
                                      openCardMenuTableId === tbl.id ? 'rotate-180' : ''
                                    }`}
                                  />
                                </button>

                                <AnimatePresence>
                                  {openCardMenuTableId === tbl.id && (
                                    <motion.div
                                      initial={{ opacity: 0, y: -4, scale: 0.95 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      exit={{ opacity: 0, y: -4, scale: 0.95 }}
                                      transition={{ duration: 0.12 }}
                                      className="absolute right-0 bottom-full mb-1.5 w-44 rounded-xl backdrop-blur-xl bg-white/95 border border-neutral-200/90 shadow-xl shadow-neutral-950/10 p-1.5 z-50 space-y-0.5"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="px-2.5 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-100 mb-1 flex items-center justify-between">
                                        <span>桌台更多调度</span>
                                        <span className="font-bold text-neutral-700">{tbl.code} 桌</span>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenCardMenuTableId(null);
                                          setCctvTargetTable(tbl);
                                          setIsCctvModalOpen(true);
                                        }}
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#006494] hover:bg-sky-50 transition-colors cursor-pointer"
                                      >
                                        <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                                        <span>全景 CCTV 监控</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenCardMenuTableId(null);
                                          handleTransferModal(tbl);
                                        }}
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition-colors cursor-pointer"
                                      >
                                        <ArrowRightLeft className="w-3.5 h-3.5 text-neutral-500" />
                                        <span>转台换桌</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenCardMenuTableId(null);
                                          setInspectTableForBatchPrint(tbl);
                                          setIsBatchPrintModalOpen(true);
                                        }}
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition-colors cursor-pointer"
                                      >
                                        <QrCode className="w-3.5 h-3.5 text-neutral-500" />
                                        <span>桌码立牌</span>
                                      </button>

                                      <div className="h-[1px] bg-neutral-100 my-1" />

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenCardMenuTableId(null);
                                          handleVoidOrderModal(tbl);
                                        }}
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                      >
                                        <Ban className="w-3.5 h-3.5 text-rose-500" />
                                        <span>退单作废</span>
                                      </button>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>

                              {/* 协同联络室监管触发器 (若存在活动会话) */}
                              <div className="w-full flex justify-end">
                                <TableCardSynergyFooterAction
                                  tableCode={tbl.code}
                                  onOpenSynergyDrawer={(sess) => setActiveSynergySession(sess)}
                                />
                              </div>
                            </>
                          ) : isIdle ? (
                            <>
                              {waitingQueue.filter((w) => w.status === 'waiting').length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const targetWait = waitingQueue.find((w) => w.status === 'waiting');
                                    if (targetWait) {
                                      const res = businessTransactionEngine.executeMatchQueueToTable({
                                        queueItemId: targetWait.id,
                                        tableId: tbl.id,
                                        guestCount: targetWait.guests,
                                        showToast
                                      });
                                      if (res.success && res.table) {
                                        onUpdateTable?.(res.table);
                                      }
                                    }
                                  }}
                                  className="h-7.5 px-2.5 rounded-[3px] bg-white border border-[#CCCCCC] hover:border-neutral-400 text-neutral-800 text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer w-auto shadow-2xs"
                                  title="撮合排队首位顾客入座"
                                >
                                  <Zap className="w-3.5 h-3.5 text-amber-500 fill-current" />
                                  <span>撮合入座</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenModal(tbl)}
                                className="h-7.5 px-3 rounded-[3px] bg-[#006494] hover:bg-[#00537A] text-white font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer w-auto shadow-2xs"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>开台入座</span>
                              </button>
                            </>
                          ) : isCleaning ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleCleanComplete(tbl)}
                                className="h-7.5 px-3 rounded-[3px] bg-[#00875A] hover:bg-[#00704A] text-white font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer w-auto shadow-2xs"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>保洁完成 · 恢复空闲</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => onOpenTable(tbl.id, tbl.currentGuests || tbl.capacity || 2, tbl.serverName || '小林')}
                                className="h-7.5 px-3 rounded-[3px] bg-[#7B1FA2] hover:bg-[#6A1B9A] text-white font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer w-auto shadow-2xs"
                              >
                                <UtensilsCrossed className="w-3.5 h-3.5" />
                                <span>预约转入座开台</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 右侧：画中画出餐时序分栏 (选中有就餐桌台时展开) */}
          {selectedTableForDetail && detailViewMode === 'split' && (
            <div className="w-full lg:w-[38%] xl:w-[36%] shrink-0 bg-white border border-[#CCCCCC] rounded-[3px] p-3 shadow-2xs space-y-3 sticky top-4">
              <div className="flex items-center justify-between border-b border-[#E2E2DF] pb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs text-neutral-900 bg-neutral-100 border border-neutral-300 px-2 py-0.5 rounded-[2px]">
                    {selectedTableForDetail.code}
                  </span>
                  <span className="text-xs font-bold text-neutral-800">出餐与时序节点监视</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setDetailViewMode('fullscreen')}
                    className="p-1 hover:bg-neutral-100 rounded text-neutral-500 hover:text-neutral-800"
                    title="全屏传菜大屏"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTableForDetail(null)}
                    className="p-1 hover:bg-neutral-100 rounded text-neutral-500 hover:text-neutral-800"
                    title="关闭分栏"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <TableDishProgressView
                table={
                  tables.find((t) => t.id === selectedTableForDetail.id) || selectedTableForDetail
                }
                onBack={() => setSelectedTableForDetail(null)}
                onUpdateTable={(updated) => {
                  onUpdateTable?.(updated);
                  setSelectedTableForDetail(updated);
                  if (updated.orderNo && updated.orderItems && onSyncOrderItems) {
                    onSyncOrderItems(updated.orderNo, updated.orderItems);
                  }
                }}
                onOpenBillModal={(tbl) => {
                  setSelectedTableForDetail(null);
                  handleBillModal(tbl);
                }}
                onVoidOrder={(tbl) => {
                  setSelectedTableForDetail(null);
                  handleVoidOrderModal(tbl);
                }}
                showToast={showToast}
                isEmbedded={true}
              />
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. 模态弹窗系统 (Modals System)                                          */}
      {/* ========================================================================= */}

      {/* 1. 开台就座弹窗 */}
      {activeModal === 'open' && selectedTable && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#CCCCCC] rounded-[3px] shadow-xl w-full max-w-sm p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E2DF] pb-2.5">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-[#006494]" />
                <span className="font-bold text-sm text-neutral-900">
                  开台就座 · {selectedTable.code} 桌
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-600 font-semibold mb-1">用餐宾客人数</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 6, 8].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setOpenGuests(num)}
                      className={`flex-1 h-8 rounded-[3px] border font-bold transition-colors cursor-pointer ${
                        openGuests === num
                          ? 'border-[#006494] bg-[#E1F5FE] text-[#006494]'
                          : 'border-[#CCCCCC] bg-white text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      {num}人
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-neutral-600 font-semibold mb-1">值班服务员</label>
                <select
                  value={openServer}
                  onChange={(e) => setOpenServer(e.target.value)}
                  className="w-full h-8 px-2.5 bg-[#FAF9F7] border border-[#CCCCCC] rounded-[3px] text-xs focus:outline-none focus:border-[#006494]"
                >
                  <option value="小林 (No.04)">小林 (No.04)</option>
                  <option value="阿强 (No.07)">阿强 (No.07)</option>
                  <option value="陈领班 (No.01)">陈领班 (No.01)</option>
                  <option value="前台自助开台">前台自助开台</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="flex-1 h-8 rounded-[3px] border border-[#CCCCCC] text-neutral-700 font-semibold hover:bg-neutral-50 cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenTable(selectedTable.id, openGuests, openServer);
                  setActiveModal(null);
                  showToast(`桌台 ${selectedTable.code} 开台成功！人数: ${openGuests} 人`);
                }}
                className="flex-1 h-8 rounded-[3px] bg-[#006494] hover:bg-[#00537A] text-white font-bold cursor-pointer"
              >
                确认开台
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. 结账打单弹窗 (含 AA 均摊与折扣体系) */}
      {activeModal === 'bill' && selectedTable && (() => {
        const rawTotal =
          selectedTable.totalAmount ||
          selectedTable.orderItems?.reduce((acc, cur) => acc + cur.price * cur.quantity, 0) ||
          0;
        const discountedTotal = rawTotal * billDiscount;
        const savedAmount = rawTotal - discountedTotal;
        const aaPerGuest = aaGuestCount > 0 ? (discountedTotal / aaGuestCount).toFixed(2) : '0.00';

        return (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-[#CCCCCC] rounded-[3px] shadow-xl w-full max-w-md p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E2DF] pb-2.5">
                <div className="flex items-center gap-2">
                  <ReceiptText className="w-4 h-4 text-[#006494]" />
                  <span className="font-bold text-sm text-neutral-900">
                    结账打单 · {selectedTable.code} 桌
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="text-neutral-400 hover:text-neutral-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 账单清单摘要 */}
              <div className="space-y-3 text-xs">
                <div className="bg-[#FAF9F7] border border-[#E2E2DF] rounded-[3px] p-3 space-y-1.5 max-h-36 overflow-y-auto">
                  {selectedTable.orderItems && selectedTable.orderItems.length > 0 ? (
                    selectedTable.orderItems.map((it, i) => (
                      <div key={i} className="flex justify-between items-center text-neutral-700">
                        <span>
                          {it.name} x{it.quantity}
                        </span>
                        <span className="font-semibold">¥{(it.price * it.quantity).toFixed(2)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-neutral-400 py-2">暂无已出菜品明细</div>
                  )}
                </div>

                {/* 优惠折扣选择 */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-neutral-600 font-semibold">折扣优惠选择</label>
                    {savedAmount > 0 && (
                      <span className="text-[11px] text-[#00875A] font-bold">
                        已减免: -¥{savedAmount.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { label: '无折扣', val: 1.0 },
                      { label: '9.5 折', val: 0.95 },
                      { label: '9.0 折', val: 0.9 },
                      { label: '8.8折VIP', val: 0.88 }
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => setBillDiscount(item.val)}
                        className={`h-7.5 rounded-[3px] border font-bold text-xs transition-colors cursor-pointer ${
                          billDiscount === item.val
                            ? 'border-[#006494] bg-[#E1F5FE] text-[#006494]'
                            : 'border-[#CCCCCC] bg-white text-neutral-700 hover:bg-neutral-50'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* AA 均摊计算器 */}
                <div className="bg-[#FAF9F7] border border-[#E2E2DF] rounded-[3px] p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-700 font-semibold text-xs">启用 AA 均摊计算器</span>
                    <input
                      type="checkbox"
                      checked={isAaSplit}
                      onChange={(e) => setIsAaSplit(e.target.checked)}
                      className="rounded cursor-pointer"
                    />
                  </div>

                  {isAaSplit && (
                    <div className="pt-1.5 border-t border-[#E2E2DF] space-y-1.5 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-neutral-500 font-medium">均摊人数:</span>
                        <div className="flex items-center gap-1">
                          {[2, 3, 4, 5, 6, 8].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setAaGuestCount(n)}
                              className={`h-6 px-2 rounded-[2px] border text-[11px] font-bold cursor-pointer ${
                                aaGuestCount === n
                                  ? 'bg-[#006494] text-white border-[#006494]'
                                  : 'bg-white border-[#CCCCCC] text-neutral-700'
                              }`}
                            >
                              {n}人
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-0.5">
                        <span className="text-neutral-700 font-bold">AA 人均应付:</span>
                        <span className="text-[#006494] font-extrabold text-sm">
                          ¥{aaPerGuest} /人
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 应收总额 */}
                <div className="border-t border-[#E2E2DF] pt-2 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-neutral-600">应付折后总额:</span>
                    {rawTotal > discountedTotal && (
                      <span className="line-through text-neutral-400 text-xs">
                        ¥{rawTotal.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <span className="font-extrabold text-[#D32F2F] text-base">
                    ¥{discountedTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 h-8 rounded-[3px] border border-[#CCCCCC] text-neutral-700 font-semibold hover:bg-neutral-50 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onCheckoutTable(selectedTable.id, billDiscount, isAaSplit);
                    setActiveModal(null);
                    showToast(`桌台 ${selectedTable.code} 结账完成，已转入保洁清洁状态！`);
                  }}
                  className="flex-1 h-8 rounded-[3px] bg-[#00875A] hover:bg-[#00704A] text-white font-bold cursor-pointer"
                >
                  完成结算打单
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 3. 转台换桌弹窗 */}
      {activeModal === 'transfer' && selectedTable && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#CCCCCC] rounded-[3px] shadow-xl w-full max-w-sm p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E2DF] pb-2.5">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-[#006494]" />
                <span className="font-bold text-sm text-neutral-900">
                  转台换桌 · 当前 {selectedTable.code} 桌
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-600 font-semibold mb-1">选择目标空闲桌台</label>
                <select
                  value={targetTableId}
                  onChange={(e) => setTargetTableId(e.target.value)}
                  className="w-full h-8 px-2.5 bg-[#FAF9F7] border border-[#CCCCCC] rounded-[3px] text-xs focus:outline-none focus:border-[#006494]"
                >
                  <option value="">-- 请选择目标桌台 --</option>
                  {tables
                    .filter((t) => t.id !== selectedTable.id && t.status === 'idle')
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.code} 桌 ({t.name} · {t.capacity}人)
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="flex-1 h-8 rounded-[3px] border border-[#CCCCCC] text-neutral-700 font-semibold hover:bg-neutral-50 cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                disabled={!targetTableId}
                onClick={() => {
                  onTransferTable(selectedTable.id, targetTableId);
                  setActiveModal(null);
                  showToast(`已成功将 ${selectedTable.code} 转入目标桌台！`);
                }}
                className={`flex-1 h-8 rounded-[3px] font-bold text-white transition-colors cursor-pointer ${
                  targetTableId
                    ? 'bg-[#006494] hover:bg-[#00537A]'
                    : 'bg-neutral-300 cursor-not-allowed'
                }`}
              >
                确认转台
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. 退单作废与清台确认弹窗 (全息核验升级版) */}
      {activeModal === 'voidOrder' && voidTargetTable && (() => {
        const matchedDineInOrder = orders.find((o) => {
          const ch = resolveOrderChannelType(o);
          if (ch !== 'dine_in') return false;
          return (
            (o.tableCode && o.tableCode.toLowerCase() === voidTargetTable.code.toLowerCase()) ||
            (o.tableId && o.tableId === voidTargetTable.id) ||
            (voidTargetTable.code === 'A2' &&
              (normalizeOrderKey(o.orderNo) === '7078' || normalizeOrderKey(o.id) === '7078'))
          );
        });

        const orderItems =
          voidTargetTable.orderItems && voidTargetTable.orderItems.length > 0
            ? voidTargetTable.orderItems
            : matchedDineInOrder?.items
            ? matchedDineInOrder.items.map((it, idx) => ({
                dishId: it.dishId || `dish-${idx}`,
                name: it.name,
                price: it.price,
                quantity: it.quantity,
                kitchenStation: 'charcoal' as const,
                serveStatus:
                  matchedDineInOrder.stepIndex && matchedDineInOrder.stepIndex >= 3
                    ? ('served' as const)
                    : ('cooking' as const)
              }))
            : [];

        const totalAmount =
          voidTargetTable.totalAmount ||
          matchedDineInOrder?.totalAmount ||
          orderItems.reduce((acc, cur) => acc + cur.price * cur.quantity, 0);

        const orderNo = voidTargetTable.orderNo || matchedDineInOrder?.orderNo || `UR-DIN-${voidTargetTable.code}-01`;
        const totalQuantity = orderItems.reduce((acc, it) => acc + it.quantity, 0);

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
            <div className="bg-white border border-[#CCCCCC] rounded-[3px] shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[92vh]">
              {/* 顶部警告色工控标题 */}
              <div className="p-3.5 bg-neutral-900 text-white border-b border-neutral-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-[3px] bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/40">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-xs bg-white text-neutral-950 px-1.5 py-0.2 rounded-[2px]">
                        {voidTargetTable.code} 桌
                      </span>
                      <span className="font-bold text-sm text-white">作废堂食订单与清台核验</span>
                    </div>
                    <p className="text-[10.5px] text-neutral-400 mt-0.5">撤销此桌在席消费、注销制作工单并重置释放台位</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="text-neutral-400 hover:text-white p-1 hover:bg-neutral-800 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 弹窗主体内容：订单概览与菜品明细核验 */}
              <div className="p-4 space-y-3.5 overflow-y-auto text-xs">
                {/* 待作废台位与消费概览卡片 */}
                <div className="bg-[#FAF9F7] p-3 rounded-[3px] border border-[#E2E2DF] space-y-2">
                  <div className="flex items-center justify-between border-b border-[#E2E2DF] pb-2">
                    <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                      <UtensilsCrossed className="w-3.5 h-3.5 text-neutral-600" />
                      <span>{voidTargetTable.name} ({voidTargetTable.zoneLabel || '外摆区'})</span>
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      容量 {voidTargetTable.capacity} 位 · 服务员: {voidTargetTable.serverName || '小林'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-neutral-500 block">关联单号:</span>
                      <span className="font-bold text-neutral-900 break-all">
                        {orderNo}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">待作废消费金额:</span>
                      <span className="font-extrabold text-rose-600 text-sm">
                        ¥{Number(totalAmount || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* 菜品全息清单预览 */}
                  {orderItems.length > 0 ? (
                    <div className="pt-2 border-t border-[#E2E2DF] space-y-1">
                      <div className="flex items-center justify-between text-[10.5px] text-neutral-500">
                        <span>已点菜品明细 ({orderItems.length} 项):</span>
                        <span>共 {totalQuantity} 件</span>
                      </div>
                      <div className="max-h-28 overflow-y-auto bg-white p-2 rounded-[2px] border border-[#E2E2DF] space-y-1 divide-y divide-neutral-100">
                        {orderItems.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[11px] pt-1 first:pt-0">
                            <span className="text-neutral-900 truncate max-w-[210px] font-medium">{item.name}</span>
                            <span className="text-neutral-500 shrink-0 font-semibold">
                              x{item.quantity} · ¥{(item.price * item.quantity).toFixed(1)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-[#E2E2DF] text-neutral-400 text-[10.5px]">
                      当前桌台未录入菜品或处于预开台阶段。
                    </div>
                  )}
                </div>

                {/* 作废原因选择 */}
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">选择作废退单原因</label>
                  <select
                    value={voidReason}
                    onChange={(e) => setVoidReason(e.target.value)}
                    className="w-full h-8 px-2.5 bg-[#FAF9F7] border border-[#CCCCCC] rounded-[3px] text-xs focus:outline-none focus:border-rose-500"
                  >
                    <option value="顾客退单/未就餐离店">顾客退单/未就餐离店</option>
                    <option value="错开桌台/重复录入">错开桌台/重复录入</option>
                    <option value="顾客换桌/重新点餐">顾客换桌/重新点餐</option>
                    <option value="菜品售罄/顾客取消">菜品售罄/顾客取消</option>
                    <option value="系统测试/演练订单">系统测试/演练订单</option>
                    <option value="自定义输入">其他原因 (手动输入)</option>
                  </select>
                </div>

                {voidReason === '自定义输入' && (
                  <input
                    type="text"
                    value={customVoidReason}
                    onChange={(e) => setCustomVoidReason(e.target.value)}
                    placeholder="请输入具体作废退单原因..."
                    className="w-full h-8 px-2.5 bg-[#FAF9F7] border border-[#CCCCCC] rounded-[3px] text-[16px] md:text-xs focus:outline-none focus:border-rose-500 touch-manipulation"
                  />
                )}

                {/* 作废后桌台状态 */}
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">作废后桌台状态恢复为</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setVoidTargetStatus('idle')}
                      className={`flex-1 h-7.5 rounded-[3px] border font-semibold cursor-pointer transition-colors ${
                        voidTargetStatus === 'idle'
                          ? 'border-[#00875A] bg-[#E8F5E9] text-[#00875A]'
                          : 'border-[#CCCCCC] bg-white text-neutral-600 hover:bg-neutral-50'
                      }`}
                    >
                      直接空闲待客
                    </button>
                    <button
                      type="button"
                      onClick={() => setVoidTargetStatus('cleaning')}
                      className={`flex-1 h-7.5 rounded-[3px] border font-semibold cursor-pointer transition-colors ${
                        voidTargetStatus === 'cleaning'
                          ? 'border-[#C26D00] bg-[#FFF3E0] text-[#C26D00]'
                          : 'border-[#CCCCCC] bg-white text-neutral-600 hover:bg-neutral-50'
                      }`}
                    >
                      转入保洁消毒
                    </button>
                  </div>
                </div>

                <div className="bg-[#FAF9F7] p-2.5 rounded-[3px] border border-[#E2E2DF] text-[11px] text-neutral-500 leading-relaxed">
                  作废操作将级联注销后厨 KDS 制作工单，并永久记入前台审计日志。若有误操作，随时可在右侧「审计恢复抽屉」中一键无损撤销回滚。
                </div>
              </div>

              {/* 弹窗底栏操作 */}
              <div className="p-3 bg-[#FAF9F7] border-t border-[#E2E2DF] flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3.5 py-1.5 bg-white border border-[#CCCCCC] text-neutral-700 font-semibold hover:bg-neutral-50 rounded-[3px] cursor-pointer text-xs"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleConfirmVoidOrder}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-[3px] cursor-pointer text-xs shadow-2xs transition-colors flex items-center gap-1.5"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>确认作废整单并清台</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 5. 取号等位弹窗 */}
      {activeModal === 'addWaiting' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#CCCCCC] rounded-[3px] shadow-xl w-full max-w-sm p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E2DF] pb-2.5">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#006494]" />
                <span className="font-bold text-sm text-neutral-900">登记等位候补桌号</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-600 font-semibold mb-1">用餐宾客人数</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={waitGuests}
                  onChange={(e) => setWaitGuests(Number(e.target.value) || 2)}
                  className="w-full h-8 px-2.5 bg-[#FAF9F7] border border-[#CCCCCC] rounded-[3px] text-[16px] md:text-xs focus:outline-none focus:border-[#006494] touch-manipulation"
                />
              </div>
              <div>
                <label className="block text-neutral-600 font-semibold mb-1">贵宾尊称 (选填)</label>
                <input
                  type="text"
                  value={waitGuestName}
                  onChange={(e) => setWaitGuestName(e.target.value)}
                  placeholder="例: 林女士 / 2位"
                  className="w-full h-8 px-2.5 bg-[#FAF9F7] border border-[#CCCCCC] rounded-[3px] text-[16px] md:text-xs focus:outline-none focus:border-[#006494] touch-manipulation"
                />
              </div>
              <div>
                <label className="block text-neutral-600 font-semibold mb-1">联系电话 (选填)</label>
                <input
                  type="text"
                  value={waitPhone}
                  onChange={(e) => setWaitPhone(e.target.value)}
                  placeholder="例: 138****6621"
                  className="w-full h-8 px-2.5 bg-[#FAF9F7] border border-[#CCCCCC] rounded-[3px] text-[16px] md:text-xs focus:outline-none focus:border-[#006494] touch-manipulation"
                />
              </div>
              <div>
                <label className="block text-neutral-600 font-semibold mb-1">意向就餐区域</label>
                <select
                  value={waitZone}
                  onChange={(e) => setWaitZone(e.target.value)}
                  className="w-full h-8 px-2.5 bg-[#FAF9F7] border border-[#CCCCCC] rounded-[3px] text-[16px] md:text-xs focus:outline-none focus:border-[#006494] touch-manipulation"
                >
                  <option value="餐车外摆区">餐车外摆休闲区</option>
                  <option value="室内大厅散座">室内大厅散座</option>
                  <option value="舒适卡座区">舒适卡座区</option>
                  <option value="不限，任意有空位即入">不限，任意有空位即入</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="flex-1 h-8 rounded-[3px] border border-[#CCCCCC] text-neutral-700 font-semibold hover:bg-neutral-50 cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  const newItem = addWaitingTable({
                    guests: waitGuests,
                    guestName: waitGuestName.trim() || `候补贵宾(${waitGuests}人)`,
                    phone: waitPhone.trim(),
                    preferredZone: waitZone
                  });
                  setActiveModal(null);
                  showToast(`等位成功！排队单号: ${newItem.code}，请稍候叫号。`);
                }}
                className="flex-1 h-8 rounded-[3px] bg-[#006494] hover:bg-[#00537A] text-white font-bold cursor-pointer"
              >
                确认登记
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. 手动将等位桌号纳入转移弹窗 */}
      {activeModal === 'manualTransfer' && waitingToTransfer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-sm rounded-[3px] border border-[#CCCCCC] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3.5 bg-[#FAF9F7] border-b border-[#E2E2DF] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs bg-neutral-900 text-white px-2 py-0.5 rounded-[2px]">
                  {waitingToTransfer.code}
                </span>
                <span className="font-bold text-sm text-neutral-900">手动转移等位入座</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-neutral-400 hover:text-neutral-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs text-neutral-800">
              <div className="p-2.5 bg-[#FAF9F7] rounded-[2px] border border-[#E2E2DF] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-neutral-900">
                    {waitingToTransfer.guestName || '等位客人'}
                  </span>
                  <span className="font-bold text-neutral-900">{waitingToTransfer.guests}人就餐</span>
                </div>
                <div className="text-[11px] text-neutral-500 flex items-center justify-between">
                  <span>取号时间: {waitingToTransfer.createdAt}</span>
                  <span>已等待: {waitingToTransfer.elapsedMinutes || 1} 分钟</span>
                </div>
                {waitingToTransfer.orderNo && (
                  <div className="text-[11px] font-bold text-[#006494] pt-1 border-t border-[#E2E2DF]">
                    已提前点餐: {waitingToTransfer.orderNo} (¥{(waitingToTransfer.totalAmount || 0).toFixed(2)})
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-neutral-700 block">选择目标就座桌台:</label>
                <select
                  value={transferTargetTableId}
                  onChange={(e) => setTransferTargetTableId(e.target.value)}
                  className="w-full h-8 px-2 bg-[#FAF9F7] border border-[#CCCCCC] rounded-[3px] text-xs focus:outline-none focus:border-[#006494]"
                >
                  <optgroup label="✅ 推荐: 当前空闲就绪桌台">
                    {tables
                      .filter((t) => t.status === 'idle')
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.code} 桌 - {t.name} (容量{t.capacity}人)
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="其它桌台 (需确认覆盖)">
                    {tables
                      .filter((t) => t.status !== 'idle')
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.code} 桌 - {t.name} ({t.status === 'cleaning' ? '清洁中' : '就餐中'})
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              <div className="text-[11px] text-neutral-500 leading-relaxed">
                确认转移后，等位订单菜品将无缝同步至目标桌台，目标桌台状态自动更新为在席就餐！
              </div>
            </div>

            <div className="p-3 bg-[#FAF9F7] border-t border-[#E2E2DF] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-3.5 py-1.5 bg-white text-neutral-700 border border-[#CCCCCC] rounded-[3px] font-bold cursor-pointer text-xs"
              >
                取消
              </button>
              <button
                type="button"
                disabled={!transferTargetTableId}
                onClick={() => {
                  const res = transferWaitingToTable(waitingToTransfer.id, transferTargetTableId);
                  setActiveModal(null);
                  if (res.success) {
                    showToast(res.message);
                  } else {
                    showToast(res.message || '转移失败，请重试');
                  }
                }}
                className="px-4 py-1.5 bg-[#006494] hover:bg-[#00537A] text-white rounded-[3px] font-bold text-xs cursor-pointer shadow-2xs"
              >
                确认转移入座
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. 保洁完成手动转移引导提示 (Clean Prompt Modal) */}
      {activeModal === 'cleanPrompt' && cleanPromptTable && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-md rounded-[3px] border border-[#CCCCCC] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3.5 bg-[#FAF9F7] border-b border-[#E2E2DF] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs bg-[#00875A] text-white px-2 py-0.5 rounded-[2px]">
                  {cleanPromptTable.code} 桌保洁归位
                </span>
                <span className="font-bold text-sm text-neutral-900">是否立即指派等位宾客入座？</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-neutral-400 hover:text-neutral-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs text-neutral-800">
              <p className="text-neutral-600 leading-relaxed">
                桌台 <strong className="text-neutral-900">{cleanPromptTable.code}</strong> 已保洁归位。当前处于手动确认模式，候补队列中有{' '}
                <strong className="text-[#C26D00]">{cleanPromptCandidates.length}</strong> 组客人等待就座。
              </p>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {cleanPromptCandidates.map((c) => (
                  <div
                    key={c.id}
                    className="p-2 bg-[#FAF9F7] hover:bg-neutral-100 border border-[#E2E2DF] rounded-[3px] flex items-center justify-between gap-2 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs bg-neutral-900 text-white px-1.5 py-0.2 rounded-[2px]">
                          {c.code}
                        </span>
                        <span className="font-bold text-neutral-900">
                          {c.guestName || '等位客人'} ({c.guests}人)
                        </span>
                      </div>
                      <div className="text-[10.5px] text-neutral-400 mt-0.5">
                        等待 {c.elapsedMinutes || 1}分钟 · {c.phone || '现场取号'} · 意向: {c.preferredZone || '外摆区'}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const res = transferWaitingToTable(c.id, cleanPromptTable.id);
                        setActiveModal(null);
                        if (res.success) {
                          voiceAlerts.speakText(
                            `请等位单号 ${c.code}，${c.guests}位贵宾，到 ${cleanPromptTable.code} 号桌就座用餐！`,
                            { chimeType: 'call' }
                          );
                          showToast(`已安排 ${c.code} 贵宾入座 ${cleanPromptTable.code} 桌并叫号！`);
                        }
                      }}
                      className="h-6.5 px-2.5 bg-[#006494] hover:bg-[#00537A] text-white text-[11px] font-bold rounded-[2px] cursor-pointer shrink-0"
                    >
                      指派此单
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-[#FAF9F7] border-t border-[#E2E2DF] flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  onReleaseTable(cleanPromptTable.id);
                  setActiveModal(null);
                  showToast(`桌台 ${cleanPromptTable.code} 已仅恢复为空闲就绪状态。`);
                }}
                className="px-3 py-1.5 bg-white text-neutral-700 border border-[#CCCCCC] rounded-[3px] font-semibold text-xs cursor-pointer hover:bg-neutral-50"
              >
                仅恢复空闲待客
              </button>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-3.5 py-1.5 bg-neutral-900 text-white rounded-[3px] font-bold text-xs cursor-pointer"
              >
                关闭稍后处理
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. 批量立牌打印模态弹窗 */}
      <TableBatchPrintModal
        isOpen={isBatchPrintModalOpen}
        onClose={() => setIsBatchPrintModalOpen(false)}
        tables={tables}
        showToast={showToast}
      />

      {/* 9. 协同会话全景监管抽屉 */}
      {activeSynergySession && (
        <TableCardSynergyDrawer
          session={activeSynergySession}
          onClose={() => setActiveSynergySession(null)}
          showToast={showToast}
          onOpenCctvModal={(sess) => {
            const matchTable = tables.find((t) => t.code === sess.tableCode) || tables[0];
            setCctvTargetTable(matchTable);
            setIsCctvModalOpen(true);
          }}
        />
      )}

      {/* 10. 操作审计与版本回滚抽屉 */}
      <AccountAuditDrawer
        currentModule="tables"
        title="堂食桌台操作审计与快照"
        showToast={showToast}
      />

      {/* 11. 桌台全景全链路点餐监控与时序回放大屏 (Panoramic CCTV Modal) */}
      {isCctvModalOpen && (
        <TablePanoramicMonitorModal
          isOpen={isCctvModalOpen}
          onClose={() => setIsCctvModalOpen(false)}
          table={cctvTargetTable || tables.find((t) => t.code === 'A2') || tables.find((t) => t.status === 'dining') || tables[0]}
          tables={tables}
          onSelectTable={(t) => setCctvTargetTable(t)}
          session={activeSynergySession}
          orders={orders}
          showToast={showToast}
        />
      )}
    </div>
  );
};
