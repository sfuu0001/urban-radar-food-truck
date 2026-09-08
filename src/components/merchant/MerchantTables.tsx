import React, { useState, useRef, useEffect } from 'react';
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
  Check,
  LayoutGrid,
  Split,
  Percent,
  UserCheck,
  Barcode,
  Search,
  Copy,
  Flame,
  UserPlus,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  ListOrdered,
  QrCode,
  Megaphone,
  Brush,
  ShieldAlert,
  Ban,
  Trash2,
  AlertTriangle,
  FileX,
  ShieldCheck,
  Zap,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { TableItem, TableStatus, TableZone, DishItem, Order, WaitingTableItem, TableDishItem } from '../../types';
import { globalScannerEngine, playScannerBeep } from '../../utils/barcodeScannerEngine';
import { resolveOrderChannelType, normalizeOrderKey } from '../../utils/orderNormalizer';
import { TableDishProgressView } from './TableDishProgressView';
import { TableBatchPrintModal } from './TableBatchPrintModal';
import { voiceAlerts } from '../../utils/voiceAlertEngine';
import { AccountAuditDrawer } from './AccountAuditDrawer';
import { globalVersionEngine } from '../../utils/versionPointerEngine';
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

interface MerchantTablesProps {
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
}

export const MerchantTables: React.FC<MerchantTablesProps> = ({
  tables,
  orders,
  menuItems,
  onOpenTable,
  onCheckoutTable,
  onTransferTable,
  onReleaseTable,
  onUpdateTable,
  onSyncOrderItems,
  onVoidTableOrder,
  showToast
}) => {
  const [selectedZone, setSelectedZone] = useState<TableZone>('all');
  const [isZoneDropdownOpen, setIsZoneDropdownOpen] = useState<boolean>(false);
  const zoneDropdownRef = useRef<HTMLDivElement>(null);
  
  // Search query for orderNo / table code / dish name
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected table for detailed Dish Progress & Flow Nodes view
  const [selectedTableForDetail, setSelectedTableForDetail] = useState<TableItem | null>(null);
  const [detailViewMode, setDetailViewMode] = useState<'split' | 'fullscreen'>('split');

  // Modals state
  const [activeModal, setActiveModal] = useState<'open' | 'bill' | 'transfer' | 'addWaiting' | 'manualTransfer' | 'cleanPrompt' | 'voidOrder' | null>(null);
  const [isBatchPrintModalOpen, setIsBatchPrintModalOpen] = useState<boolean>(false);
  const [selectedTable, setSelectedTable] = useState<TableItem | null>(null);

  // Void Order Modal State
  const [voidTargetTable, setVoidTargetTable] = useState<TableItem | null>(null);
  const [voidReason, setVoidReason] = useState<string>('顾客退单/未就餐离店');
  const [customVoidReason, setCustomVoidReason] = useState<string>('');
  const [voidTargetStatus, setVoidTargetStatus] = useState<'idle' | 'cleaning'>('idle');
  
  // Waiting Queue & Auto-Transfer State
  const [waitingQueue, setWaitingQueue] = useState<WaitingTableItem[]>(() => getWaitingQueue());
  const [autoTransferOnClean, setAutoTransferOnClean] = useState<boolean>(() => getAutoTransferConfig());

  // Add Waiting Form State
  const [waitGuests, setWaitGuests] = useState<number>(2);
  const [waitGuestName, setWaitGuestName] = useState<string>('');
  const [waitPhone, setWaitPhone] = useState<string>('');
  const [waitZone, setWaitZone] = useState<string>('餐车外摆区');

  // Manual Transfer Waiting Form State
  const [waitingToTransfer, setWaitingToTransfer] = useState<WaitingTableItem | null>(null);
  const [transferTargetTableId, setTransferTargetTableId] = useState<string>('');

  // Clean Prompt State (When manual mode cleans a table and waiting queue is not empty)
  const [cleanPromptTable, setCleanPromptTable] = useState<TableItem | null>(null);
  const [cleanPromptCandidates, setCleanPromptCandidates] = useState<WaitingTableItem[]>([]);

  // Open Table Form State
  const [openGuests, setOpenGuests] = useState<number>(2);
  const [openServer, setOpenServer] = useState<string>('小林 (No.04)');

  // Bill Checkout Form State
  const [billDiscount, setBillDiscount] = useState<number>(1.0); // 1.0 = no discount, 0.9 = 9折
  const [isAaSplit, setIsAaSplit] = useState<boolean>(false);
  const [aaGuestCount, setAaGuestCount] = useState<number>(2);

  // Transfer Form State
  const [targetTableId, setTargetTableId] = useState<string>('');

  // Sync waiting queue and auto transfer config from storage events
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

  // Handle Clean Complete with Auto or Manual Transfer
  const handleCleanComplete = (tbl: TableItem) => {
    const activeWaitings = waitingQueue.filter((w) => w.status === 'waiting');

    if (autoTransferOnClean && activeWaitings.length > 0) {
      // 自动纳入转移
      const res = onTableCleanedRelease(tbl.id);
      if (res.transferred && res.waitingItem && res.updatedTable) {
        // 📢 语音叫号通知等位客人就座
        voiceAlerts.speakText(
          `请等位单号 ${res.waitingItem.code}，${res.waitingItem.guests}位贵宾，到 ${res.updatedTable.code} 号桌就座用餐！`,
          { chimeType: 'call' }
        );
        showToast(`【保洁自动转移】桌台 ${res.updatedTable.code} 已自动纳入等位 ${res.waitingItem.code} (${res.waitingItem.guests}人) 入座并语音叫号！`);
      } else {
        onReleaseTable(tbl.id);
        showToast(`桌台 ${tbl.code} 保洁完成，已恢复为空闲状态！`);
      }
    } else if (!autoTransferOnClean && activeWaitings.length > 0) {
      // 手动纳入转移提示弹窗
      setCleanPromptTable(tbl);
      setCleanPromptCandidates(activeWaitings);
      setActiveModal('cleanPrompt');
    } else {
      onReleaseTable(tbl.id);
      showToast(`桌台 ${tbl.code} 保洁完成，已恢复为空闲状态！`);
    }
  };

  // Open manual transfer modal for a waiting entry
  const handleOpenManualTransfer = (w: WaitingTableItem) => {
    setWaitingToTransfer(w);
    // 优先选择空闲桌台
    const idleTbls = tables.filter((t) => t.status === 'idle');
    setTransferTargetTableId(idleTbls.length > 0 ? idleTbls[0].id : (tables[0]?.id || ''));
    setActiveModal('manualTransfer');
  };

  // Close zone dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (zoneDropdownRef.current && !zoneDropdownRef.current.contains(event.target as Node)) {
        setIsZoneDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Hardware Barcode Scanner Listener for Tables & Member Checkout
  useEffect(() => {
    const unsub = globalScannerEngine.subscribe((result) => {
      if (result.type === 'table' && result.matchedData) {
        const tbl = result.matchedData as TableItem;
        if (tbl.status === 'idle') {
          handleOpenModal(tbl);
          showToast(`[扫码枪] 识别桌台 ${tbl.name}，已打开开台弹窗`);
        } else if (tbl.status === 'dining') {
          handleBillModal(tbl);
          showToast(`[扫码枪] 识别桌台 ${tbl.name}，已打开结账单`);
        }
      } else if (result.type === 'member' && activeModal === 'bill') {
        setBillDiscount(0.88);
        showToast(`[扫码枪] 识别会员卡，已自动应用 8.8 折专属 VIP 优惠！`);
      }
    });
    return () => unsub();
  }, [tables, activeModal]);

  // 跨组件联动总线监听 (KDS 出餐同步 / 菜品售罄 / 餐车转场联动)
  useEffect(() => {
    const unsubKds = merchantEventBus.on('merchant:kds_dish_completed', (payload) => {
      // 当 KDS 出餐时，自动同步至桌台列表
      const latestTables = safeGetStorage<TableItem[]>('obsidian_merchant_tables', []);
      if (latestTables.length > 0) {
        latestTables.forEach((t) => {
          const match = payload.ticketNo.includes(t.code) || (t.orderNo && t.orderNo.includes(payload.ticketNo.replace(/^#/, '')));
          if (match && onUpdateTable) {
            onUpdateTable(t);
          }
        });
      }
    });

    const unsubSoldOut = merchantEventBus.on('merchant:dish_sold_out', (payload) => {
      if (payload.isSoldOut) {
        // 校验当前在座桌台是否点了该菜品
        const affectedTables = tables.filter((t) =>
          t.status === 'dining' && t.orderItems?.some((it) => it.name === payload.dishName && it.serveStatus !== 'served')
        );
        if (affectedTables.length > 0) {
          const codes = affectedTables.map((t) => t.code).join('、');
          showToast(`⚠️【沽清预警】「${payload.dishName}」已沽清，在座桌台（${codes}）包含尚未出餐项目，请及时协调换菜！`);
        }
      }
    });

    const unsubStall = merchantEventBus.on('merchant:stall_relocated', (payload) => {
      showToast(`🚚【餐车已转场至 ${payload.stallName}】桌台建议容量: ${payload.maxTables} 桌，已联动重置外摆区！`);
    });

    return () => {
      unsubKds();
      unsubSoldOut();
      unsubStall();
    };
  }, [tables, onUpdateTable]);

  // If detail view is open in fullscreen mode, render TableDishProgressView
  if (selectedTableForDetail && detailViewMode === 'fullscreen') {
    const freshTable = tables.find((t) => t.id === selectedTableForDetail.id) || selectedTableForDetail;
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between bg-white border border-[#d3d1cb] px-3 py-2 rounded-[3px] shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-xs bg-[#37352f] text-white px-2 py-0.5 rounded-[2px]">
              {freshTable.code} 桌
            </span>
            <span className="text-xs text-slate-700 font-semibold">全屏传菜与出餐大屏模式</span>
          </div>
          <button
            type="button"
            onClick={() => setDetailViewMode('split')}
            className="px-2.5 py-1 text-xs font-semibold bg-slate-900 text-white rounded-[3px] hover:bg-black transition-colors flex items-center gap-1 cursor-pointer"
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

  const zoneOptions: { id: TableZone; label: string; count: number }[] = [
    { id: 'all', label: '全部台位', count: tables.length },
    { id: 'patio', label: '餐车外摆区', count: tables.filter((t) => t.zone === 'patio').length },
    { id: 'hall', label: '室内散座', count: tables.filter((t) => t.zone === 'hall').length },
    { id: 'booth', label: '雅致卡座', count: tables.filter((t) => t.zone === 'booth').length }
  ];

  const currentZone = zoneOptions.find((z) => z.id === selectedZone) || zoneOptions[0];

  const filteredTables = tables.filter((t) => {
    if (selectedZone !== 'all' && t.zone !== selectedZone) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const matchOrderNo = t.orderNo?.toLowerCase().includes(q);
    const matchCode = t.code.toLowerCase().includes(q);
    const matchName = t.name.toLowerCase().includes(q);
    const matchServer = t.serverName?.toLowerCase().includes(q);
    const matchDishes = t.orderItems?.some((d) => d.name.toLowerCase().includes(q));

    // Also match associated dine-in order (e.g. order 7078 bound to table A2)
    const matchDineInOrder = (orders || []).some((o) => {
      const channel = resolveOrderChannelType(o);
      if (channel !== 'dine_in') return false;
      const isThisTable = (o.tableCode && o.tableCode.toLowerCase() === t.code.toLowerCase()) ||
        (o.tableId && o.tableId === t.id) ||
        (t.code === 'A2' && (normalizeOrderKey(o.orderNo) === '7078' || normalizeOrderKey(o.id) === '7078'));
      if (!isThisTable) return false;
      return o.orderNo.toLowerCase().includes(q) || (o.items && o.items.some(it => it.name.toLowerCase().includes(q)));
    });

    return Boolean(matchOrderNo || matchCode || matchName || matchServer || matchDishes || matchDineInOrder);
  });

  const idleCount = tables.filter((t) => t.status === 'idle').length;
  const diningCount = tables.filter((t) => t.status === 'dining').length;
  const cleaningCount = tables.filter((t) => t.status === 'cleaning').length;
  const reservedCount = tables.filter((t) => t.status === 'reserved').length;

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

  const handleConfirmVoidOrder = () => {
    if (!voidTargetTable) return;

    const finalReason = voidReason === '自定义输入' ? (customVoidReason.trim() || '前台手动作废') : voidReason;

    // 使用统一业务领域事务管道执行原子级作废 (级联更新桌台 + 订单 + KDS工单 + 版本快照)
    if (onVoidTableOrder) {
      onVoidTableOrder(voidTargetTable.id, finalReason, voidTargetStatus);
    } else {
      businessTransactionEngine.executeVoidTableOrder({
        tableId: voidTargetTable.id,
        reason: finalReason,
        targetStatus: voidTargetStatus,
        operatorName: '前台值班领班',
        showToast
      });
    }

    setActiveModal(null);
    setVoidTargetTable(null);
  };

  // Quick open table button helper
  const handleQuickOpenTable = () => {
    const firstIdle = tables.find(t => t.status === 'idle');
    if (firstIdle) {
      handleOpenModal(firstIdle);
    } else {
      showToast('当前台位已全部满座，可引导顾客在前台取等位候补号！');
    }
  };

  // Clean all cleaning tables helper
  const handleCleanAllTables = () => {
    const cleaningTables = tables.filter(t => t.status === 'cleaning');
    if (cleaningTables.length === 0) {
      showToast('当前没有处于清洁中的桌台');
      return;
    }
    cleaningTables.forEach(t => onReleaseTable(t.id));
    showToast(`已一键完成 ${cleaningTables.length} 张桌台保洁归位，全部恢复为空闲就绪！`);
  };

  return (
    <div className="space-y-3.5 text-xs">
      {/* Top Filter & Search Bar */}
      <div className="bg-white p-2.5 sm:p-3 rounded-[3px] border border-[#e6e6e4] flex items-center justify-between gap-3 flex-wrap lg:flex-nowrap shadow-2xs">
        <div className="flex items-center gap-2 sm:gap-2.5 flex-1 w-full sm:w-auto min-w-0 flex-wrap sm:flex-nowrap">
          {/* Zone Dropdown Selector */}
          <div className="relative shrink-0" ref={zoneDropdownRef}>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-[#787774] shrink-0 text-xs">台区:</span>
              <button
                type="button"
                onClick={() => setIsZoneDropdownOpen(!isZoneDropdownOpen)}
                className="px-2.5 py-1.5 bg-[#f7f7f5] hover:bg-[#efefed] border border-[#d3d1cb] hover:border-[#b8b6af] rounded-[4px] text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-2xs shrink-0"
              >
                <span className="text-[#37352f]">{currentZone.label}</span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-[2px] bg-[#37352f] text-white">
                  {currentZone.count}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#787774] transition-transform duration-200 ${
                    isZoneDropdownOpen ? 'rotate-180 text-[#37352f]' : ''
                  }`}
                />
              </button>
            </div>

            {/* Zone Dropdown Menu */}
            {isZoneDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-[200px] bg-white border border-[#d3d1cb] rounded-[6px] shadow-xl z-50 py-1 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1 text-[10px] font-bold text-[#9b9a97] uppercase tracking-wider border-b border-[#f1f1ef]">
                  选择台位区域
                </div>
                <div className="py-1 space-y-0.5 px-1">
                  {zoneOptions.map((z) => {
                    const isSelected = selectedZone === z.id;
                    return (
                      <button
                        key={z.id}
                        type="button"
                        onClick={() => {
                          setSelectedZone(z.id);
                          setIsZoneDropdownOpen(false);
                        }}
                        className={`w-full px-2.5 py-1.5 rounded-[4px] text-xs font-medium flex items-center justify-between gap-2 transition-colors cursor-pointer text-left ${
                          isSelected
                            ? 'bg-[#37352f] text-white font-semibold'
                            : 'text-[#37352f] hover:bg-[#f1f1ef]'
                        }`}
                      >
                        <span>{z.label}</span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded-[2px] ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-[#e6e6e4] text-[#787774]'
                            }`}
                          >
                            {z.count}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Search Input for OrderNo, Table Code, Dish Name */}
          <div className="relative flex-1 min-w-0 w-full sm:w-auto max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#787774]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索订单号 (如 UR-DIN-9821)、桌台 (A1) 或菜品..."
              className="w-full pl-8 pr-7 py-1.5 bg-[#f7f7f5] hover:bg-[#f1f1ef] focus:bg-white border border-[#d3d1cb] focus:border-[#37352f] rounded-[4px] text-xs transition-colors focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#787774] hover:text-[#1a1c1b] p-0.5 cursor-pointer"
                title="清除搜索"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 4 Status Legends & Batch Print Button */}
        <div className="flex items-center gap-2 sm:gap-3 text-[11px] text-[#787774] flex-wrap sm:flex-nowrap w-full lg:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap overflow-x-auto hide-scrollbar">
            <span className="flex items-center gap-1 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-[#4dab63]" />
              <span>空闲 ({idleCount})</span>
            </span>
            <span className="flex items-center gap-1 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-[#37352f]" />
              <span>就餐中 ({diningCount})</span>
            </span>
            <span className="flex items-center gap-1 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-[#d9730d]" />
              <span>清洁中 ({cleaningCount})</span>
            </span>
            <span className="flex items-center gap-1 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-[#2383e2]" />
              <span>已预订 ({reservedCount})</span>
            </span>
          </div>

          {/* Action Buttons Group (快速开台, 一键保洁全场, 批量打印立牌) */}
          <div className="flex items-center gap-1.5 flex-wrap sm:ml-auto">
            {/* Quick Open Table Button */}
            <button
              type="button"
              onClick={handleQuickOpenTable}
              className="px-2.5 py-1.5 bg-[#37352f] hover:bg-[#201f1c] text-white rounded-[3px] font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
              title="自动寻找空闲桌台并快速开台"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>快速开台</span>
            </button>

            {/* Clean All Cleaning Tables Button */}
            <button
              type="button"
              onClick={handleCleanAllTables}
              className={`px-2.5 py-1.5 rounded-[3px] font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer border shadow-2xs ${
                cleaningCount > 0
                  ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                  : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-50'
              }`}
              title="将全部清洁中的桌台一键恢复为空闲状态"
            >
              <Brush className="w-3.5 h-3.5 text-amber-600" />
              <span>一键保洁 ({cleaningCount})</span>
            </button>

            {/* Batch Print Table Stand QR Button */}
            <button
              type="button"
              onClick={() => setIsBatchPrintModalOpen((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-[3px] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs whitespace-nowrap ${
                isBatchPrintModalOpen
                  ? 'bg-[#1e3e2b] text-white ring-1 ring-emerald-400'
                  : 'bg-[#2b593f] hover:bg-[#204430] text-white'
              }`}
              title="生成并打印所有桌台亚克力立牌二维码"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>{isBatchPrintModalOpen ? '收起立牌中心' : '打印桌码立牌'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Table Batch Print QR Stand Center */}
      {isBatchPrintModalOpen && (
        <TableBatchPrintModal
          isOpen={isBatchPrintModalOpen}
          onClose={() => setIsBatchPrintModalOpen(false)}
          tables={tables}
          isEmbedded={true}
        />
      )}

      {/* Waitlist Queue & Auto/Manual Transfer Control Hub */}
      {(() => {
        const activeWaitings = waitingQueue.filter((w) => w.status === 'waiting');
        const transferredWaitings = waitingQueue.filter((w) => w.status === 'transferred');

        return (
          <div className="bg-white p-3 rounded-[3px] border border-[#d3d1cb] shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap border-b border-[#f1f1ef] pb-2.5">
              {/* Left Title & Status */}
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#37352f] text-white rounded-[2px]">
                  <ListOrdered className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#37352f]">等位桌号队列</span>
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-[2px] ${
                        activeWaitings.length > 0
                          ? 'bg-[#d9730d] text-white'
                          : 'bg-[#e6e6e4] text-[#787774]'
                      }`}
                    >
                      {activeWaitings.length > 0 ? `${activeWaitings.length} 组等位中` : '暂无等位'}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-[#787774] leading-tight mt-0.5">
                    支持食客先取等位号先行点单备餐，桌台清理后可自动或手动转移入座
                  </p>
                </div>
              </div>

              {/* Center & Right: Auto-Transfer Toggle & Add Button */}
              <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap sm:flex-nowrap w-full sm:w-auto justify-between sm:justify-end">
                {/* Auto Transfer Toggle */}
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#f7f7f5] hover:bg-[#efefed] border border-[#d3d1cb] rounded-[3px] cursor-pointer transition-colors"
                  onClick={() => {
                    const nextVal = !autoTransferOnClean;
                    setAutoTransferOnClean(nextVal);
                    setAutoTransferConfig(nextVal);
                    showToast(
                      nextVal
                        ? '已开启【清理后自动转移】：桌台保洁完成后将自动为等位客人分配入座！'
                        : '已切换为【手动转移模式】：桌台保洁完成后将弹出转移推荐供手动确认。'
                    );
                  }}
                  title="点击切换：桌台保洁完成后是否自动纳入等待队列的食客"
                >
                  <span className="text-[11px] font-semibold text-[#5a5854]">
                    桌台清理后自动转移:
                  </span>
                  <div className="flex items-center gap-1">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        autoTransferOnClean ? 'bg-[#2b593f]' : 'bg-[#9b9a97]'
                      }`}
                    />
                    <span
                      className={`text-xs font-bold font-mono ${
                        autoTransferOnClean ? 'text-[#2b593f]' : 'text-[#787774]'
                      }`}
                    >
                      {autoTransferOnClean ? '自动转移 (开)' : '手动确认 (关)'}
                    </span>
                  </div>
                  {autoTransferOnClean ? (
                    <ToggleRight className="w-4 h-4 text-[#2b593f]" />
                  ) : (
                    <ToggleLeft className="w-4 h-4 text-[#9b9a97]" />
                  )}
                </div>

                {/* Add Waiting Table Button */}
                <button
                  type="button"
                  onClick={() => {
                    setWaitGuests(2);
                    setWaitGuestName('');
                    setWaitPhone('');
                    setWaitZone('餐车外摆区');
                    setActiveModal('addWaiting');
                  }}
                  className="px-3 py-1.5 bg-[#37352f] hover:bg-[#201f1d] text-white rounded-[3px] font-medium text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ 登记等位桌号</span>
                </button>
              </div>
            </div>

            {/* Waiting Queue Cards or Empty State */}
            {activeWaitings.length === 0 ? (
              <div className="py-2.5 px-3 bg-[#f7f7f5] rounded-[2px] border border-dashed border-[#d3d1cb] flex items-center justify-between text-xs text-[#787774]">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4dab63]" />
                  <span>当前无等位排队客单。现有桌台翻台与就餐流转正常。</span>
                </div>
                {transferredWaitings.length > 0 && (
                  <span className="text-[10.5px] text-[#9b9a97]">
                    今日已成功转移入座 {transferredWaitings.length} 组等位客人
                  </span>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {activeWaitings.map((w, idx) => {
                  const hasOrder = Boolean(w.orderNo || (w.orderItems && w.orderItems.length > 0));
                  return (
                    <div
                      key={w.id}
                      className="p-2.5 bg-[#fafafa] border border-[#d3d1cb] rounded-[3px] flex flex-col justify-between gap-2 hover:border-[#37352f] transition-all relative group"
                    >
                      {/* Card Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs bg-[#37352f] text-white px-1.5 py-0.2 rounded-[2px]">
                            {w.code}
                          </span>
                          <span className="font-bold text-xs text-[#37352f]">
                            {w.guestName || '等位客人'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#787774]">
                          <span className="flex items-center gap-0.5 font-medium">
                            <Users className="w-3 h-3 text-[#5a5854]" />
                            <span>{w.guests}人</span>
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-0.5 text-[#d9730d] font-mono">
                            <Clock className="w-3 h-3" />
                            <span>{w.elapsedMinutes || 1}m</span>
                          </span>
                        </div>
                      </div>

                      {/* Card Body: Phone, Zone & Pre-order Status */}
                      <div className="space-y-1 text-[11px] text-[#5a5854]">
                        <div className="flex items-center justify-between text-[10.5px]">
                          <span className="text-[#787774]">
                            电话: {w.phone || '到店食客'} · 意向: {w.preferredZone || '外摆区'}
                          </span>
                          <span className="text-[#9b9a97] font-mono">取号 {w.createdAt}</span>
                        </div>

                        {hasOrder ? (
                          <div className="bg-[#edf3ec] p-1.5 rounded-[2px] border border-[#c4dcbc] text-[#2b593f] flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <UtensilsCrossed className="w-3 h-3" />
                              <span className="font-semibold">
                                提前备餐中 ({w.orderItems?.length || 1}道菜)
                              </span>
                            </div>
                            <span className="font-mono font-bold">
                              ¥{(w.totalAmount || 0).toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <div className="bg-[#f7f7f5] p-1 rounded-[2px] text-[#787774] text-[10.5px]">
                            尚未提前点餐 · 等待桌台分配
                          </div>
                        )}
                      </div>

                      {/* Card Actions: Manual Transfer & Cancel */}
                      <div className="flex items-center gap-1.5 pt-1 border-t border-[#e6e6e4]">
                        <button
                          type="button"
                          onClick={() => handleOpenManualTransfer(w)}
                          className="flex-1 py-1 px-2 bg-[#2b593f] hover:bg-[#204430] text-white rounded-[2px] font-medium text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        >
                          <ArrowRightLeft className="w-3 h-3" />
                          <span>手动纳入转移</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            cancelWaitingTable(w.id);
                            showToast(`等位号 ${w.code} 已取消！`);
                          }}
                          className="py-1 px-2 bg-white hover:bg-[#efefed] text-[#787774] hover:text-[#e03e3e] border border-[#d3d1cb] rounded-[2px] text-[11px] cursor-pointer transition-colors"
                          title="取消排队"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* 智能排队叫号与空闲台位敏捷撮合中心 (Smart Queue Match Strip) */}
      {(() => {
        const activeWaitings = waitingQueue.filter((w) => w.status === 'waiting');
        const idleTables = tables.filter((t) => t.status === 'idle');
        if (activeWaitings.length === 0 || idleTables.length === 0) return null;

        const bestWait = activeWaitings[0];
        // 匹配容纳人数相符的最适空桌
        const bestMatchTable =
          [...idleTables].sort((a, b) => {
            const fitA = a.capacity >= bestWait.guests ? 1 : 0;
            const fitB = b.capacity >= bestWait.guests ? 1 : 0;
            if (fitA !== fitB) return fitB - fitA;
            return Math.abs(a.capacity - bestWait.guests) - Math.abs(b.capacity - bestWait.guests);
          })[0] || idleTables[0];

        return (
          <div className="bg-emerald-900 text-white px-3 py-2 rounded-[3px] border border-emerald-800 shadow-xs flex items-center justify-between gap-3 flex-wrap animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="flex items-center gap-1 font-bold text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-[2px] border border-emerald-700/50">
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>智能等位撮合推荐</span>
              </span>
              <span className="text-emerald-100">
                等位 <strong className="text-white font-mono text-xs underline decoration-emerald-400 underline-offset-2">{bestWait.code} 号</strong>
                （{bestWait.guests}人 · 已候补 {bestWait.elapsedMinutes || 1}m）匹配空闲桌台
                <strong className="text-emerald-200 font-bold ml-1">{bestMatchTable.code} 桌</strong> ({bestMatchTable.name} · {bestMatchTable.capacity}人位)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const res = businessTransactionEngine.executeMatchQueueToTable({
                    queueItemId: bestWait.id,
                    tableId: bestMatchTable.id,
                    guestCount: bestWait.guests,
                    showToast
                  });
                  if (res.success && res.table) {
                    onUpdateTable?.(res.table);
                  }
                }}
                className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-[2px] shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
                title="呼叫该等位顾客并直接开台安排就座"
              >
                <Megaphone className="w-3.5 h-3.5" />
                <span>一键叫号·入座开台</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Master-Detail Split Container: Tables Grid (62%) + Dish Progress Side Panel (38%) */}
      <div className="flex flex-col lg:flex-row gap-3 items-start w-full">
        {/* Left: Table Cards Grid */}
        <div className={selectedTableForDetail ? 'w-full lg:w-[62%] min-w-0 transition-all' : 'w-full transition-all'}>
          <div className={`grid gap-3 ${selectedTableForDetail ? 'grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'}`}>
        {filteredTables.map((tbl) => {
          // Check if there is a dine-in order explicitly matched to this table
          const matchedDineInOrder = (orders || []).find((o) => {
            const channel = resolveOrderChannelType(o);
            if (channel !== 'dine_in') return false;
            // 终态订单(已完成/已退款/已取消/商家拒单)不再占用桌台，允许翻台恢复
            if (['completed', 'refunded', 'cancelled', 'merchant_rejected'].includes(o.status)) return false;
            if (tbl.orderNo && (o.orderNo === tbl.orderNo || o.orderNo === `#${tbl.orderNo}` || tbl.orderNo.includes(o.orderNo))) return true;
            if (o.tableCode && o.tableCode.toUpperCase() === tbl.code.toUpperCase()) return true;
            if (o.tableId && o.tableId === tbl.id) return true;
            if (tbl.code === 'A2' && (normalizeOrderKey(o.orderNo) === '7078' || normalizeOrderKey(o.id) === '7078')) return true;
            return false;
          });

          const isEffectiveDining = tbl.status === 'dining' || Boolean(matchedDineInOrder);
          const isIdle = tbl.status === 'idle' && !matchedDineInOrder;
          const isDining = isEffectiveDining;
          const isCleaning = tbl.status === 'cleaning' && !matchedDineInOrder;
          const isReserved = tbl.status === 'reserved' && !matchedDineInOrder;

          const orderNo = matchedDineInOrder
            ? matchedDineInOrder.orderNo.replace(/^#/, '')
            : (tbl.orderNo || `UR-DIN-${tbl.code}-${tbl.elapsedMinutes || '01'}`);

          const orderItems = (tbl.orderItems && tbl.orderItems.length > 0)
            ? tbl.orderItems
            : (matchedDineInOrder
                ? matchedDineInOrder.items.map((it, idx) => ({
                    id: `matched-dish-${idx}`,
                    dishId: it.dishId || `dish-${idx}`,
                    name: it.name,
                    price: it.price,
                    quantity: it.quantity,
                    kitchenStation: 'charcoal' as const,
                    serveStatus: (matchedDineInOrder.stepIndex && matchedDineInOrder.stepIndex >= 3) ? 'served' as const : 'cooking' as const
                  }))
                : []);

          const totalDishes = orderItems.reduce((acc, cur) => acc + cur.quantity, 0);
          const servedDishes = orderItems.filter((d) => d.serveStatus === 'served').reduce((acc, cur) => acc + cur.quantity, 0);
          const servePercent = totalDishes > 0 ? Math.round((servedDishes / totalDishes) * 100) : 0;
          const hasUrged = orderItems.some((d) => d.serveStatus === 'urged');

          const tableForDetail: TableItem = {
            ...tbl,
            status: isEffectiveDining ? 'dining' : tbl.status,
            orderNo,
            orderItems,
            currentGuests: tbl.currentGuests || (matchedDineInOrder ? 2 : tbl.capacity)
          };

          let borderClass = 'border-[#e6e6e4]';
          let bgHeader = 'bg-[#f1f1ef] text-[#37352f]';

          const isCurrentlyActiveInSidePanel = selectedTableForDetail?.id === tbl.id;

          if (isCurrentlyActiveInSidePanel) {
            borderClass = 'ring-2 ring-emerald-600 border-emerald-600 shadow-md';
            bgHeader = 'bg-emerald-800 text-white';
          } else if (isDining) {
            borderClass = 'border-[#37352f] shadow-xs hover:shadow-md';
            bgHeader = 'bg-[#37352f] text-white';
          } else if (isIdle) {
            borderClass = 'border-[#c4dcbc] hover:border-[#4dab63]';
            bgHeader = 'bg-[#edf3ec] text-[#2b593f]';
          } else if (isCleaning) {
            borderClass = 'border-[#ecd9a8]';
            bgHeader = 'bg-[#fbf3db] text-[#8f6412]';
          } else if (isReserved) {
            borderClass = 'border-[#c4d6ec]';
            bgHeader = 'bg-[#edf3f8] text-[#1c5598]';
          }

          return (
            <div
              key={tbl.id}
              onClick={() => {
                if (isDining) {
                  setSelectedTableForDetail(tableForDetail);
                  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                    setTimeout(() => {
                      document.getElementById('pip-dish-progress-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 120);
                  }
                } else if (isIdle) {
                  handleOpenModal(tbl);
                }
              }}
              className={`bg-white rounded-[4px] border ${borderClass} flex flex-col justify-between overflow-hidden transition-all group ${
                isDining ? 'cursor-pointer hover:border-black' : ''
              }`}
              title={isDining ? '点击卡片在右侧画中画查看目前菜品制作情况与状态流转节点' : undefined}
            >
              {/* Card Top */}
              <div>
                <div className={`px-2.5 py-2 flex items-center justify-between gap-1.5 border-b ${bgHeader} min-w-0`}>
                  {/* Left: Code, Name, Active Synergy */}
                  <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                    <span className="font-mono font-bold text-xs sm:text-sm px-1.5 py-0.5 bg-black/15 rounded-[2px] shrink-0 leading-none">
                      {tbl.code}
                    </span>
                    <span className="font-semibold text-xs truncate min-w-0" title={tbl.name}>
                      {tbl.name}
                    </span>
                    {isCurrentlyActiveInSidePanel && (
                      <span className="text-[9px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-[2px] font-bold shrink-0 whitespace-nowrap leading-none">
                        协同中
                      </span>
                    )}
                  </div>

                  {/* Status Badge & QR Stand Action & Quick Void Action */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsBatchPrintModalOpen(true);
                      }}
                      className="p-1 opacity-75 hover:opacity-100 hover:bg-black/10 rounded-[2px] transition-colors cursor-pointer shrink-0"
                      title={`查看/打印 ${tbl.code} 桌点餐二维码`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVoidOrderModal(tableForDetail);
                      }}
                      className="p-1 opacity-75 hover:opacity-100 hover:bg-rose-50 hover:text-rose-600 rounded-[2px] transition-colors cursor-pointer shrink-0"
                      title={`作废/撤销 ${tbl.code} 桌订单`}
                    >
                      <Ban className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[2px] bg-white/90 text-slate-800 shrink-0 whitespace-nowrap shadow-2xs leading-tight">
                      {isDining && `就餐 ${tbl.elapsedMinutes || 12}m`}
                      {isIdle && `空闲·${tbl.capacity}座`}
                      {isCleaning && `保洁 ${tbl.elapsedMinutes}m`}
                      {isReserved && `已预订`}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-2.5 sm:p-3 space-y-2.5 min-w-0">
                  {/* Dine-in Matched Order Banner */}
                  {matchedDineInOrder && (
                    <div className="flex items-center justify-between gap-1.5 bg-amber-50 px-2 py-1.5 rounded-[3px] border border-amber-200 text-[11px] text-amber-900 font-medium min-w-0">
                      <div className="flex items-center gap-1 min-w-0 flex-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="truncate">
                          堂食匹配: <strong className="font-mono">#{matchedDineInOrder.orderNo.replace(/^#/, '')}</strong>
                        </span>
                      </div>
                      <span className="font-bold font-mono text-amber-700 shrink-0 whitespace-nowrap">
                        ¥{matchedDineInOrder.totalAmount.toFixed(1)}
                      </span>
                    </div>
                  )}

                  {/* Dining Details */}
                  {isDining && (
                    <>
                      {/* Prominent Order Number Field (订单号字段功能，便于快速查询与复制) */}
                      <div className="flex items-center justify-between gap-1.5 bg-[#f1f1ef] px-2 py-1.5 rounded-[3px] border border-[#e6e6e4] text-[11px] min-w-0">
                        <span className="text-[#787774] font-medium flex items-center gap-1 shrink-0">
                          <Barcode className="w-3.5 h-3.5 text-[#37352f] shrink-0" />
                          <span>订单号:</span>
                        </span>
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="font-mono font-bold text-[#1a1c1b] tracking-tight truncate max-w-[125px] sm:max-w-none" title={orderNo}>
                            {orderNo}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              try {
                                navigator.clipboard.writeText(orderNo);
                                showToast(`已复制订单号: ${orderNo}`);
                              } catch {
                                showToast(`订单号: ${orderNo}`);
                              }
                            }}
                            className="p-1 hover:bg-black/10 rounded text-[#787774] hover:text-[#1a1c1b] transition-colors cursor-pointer shrink-0"
                            title="复制订单号"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Guest & Server Info */}
                      <div className="flex items-center justify-between text-[11px] text-[#787774] gap-1.5 min-w-0">
                        <span className="flex items-center gap-1 shrink-0">
                          <Users className="w-3 h-3 text-[#37352f] shrink-0" />
                          <span>客数: <strong>{tbl.currentGuests || 2}/{tbl.capacity}人</strong></span>
                        </span>
                        <span className="truncate text-right" title={tbl.serverName || '小林 (No.04)'}>
                          服务: {tbl.serverName || '小林 (No.04)'}
                        </span>
                      </div>

                      {/* Dish Prep & Serving Progress Indicator (菜品出餐制作进展条) */}
                      {orderItems.length > 0 && (
                        <div className="bg-[#fbfbfa] p-2 rounded-[3px] border border-[#e6e6e4] space-y-1.5 min-w-0">
                          <div className="flex items-center justify-between text-[10.5px] gap-1">
                            <span className="text-[#787774] font-medium shrink-0">出餐上菜进展:</span>
                            <span className="font-mono font-bold text-[#2b593f] truncate text-right">
                              已上 {servedDishes}/{totalDishes} 件 ({servePercent}%)
                            </span>
                          </div>

                          <div className="h-1.5 w-full bg-[#e6e6e4] rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 rounded-full ${
                                servePercent === 100
                                  ? 'bg-[#2b593f]'
                                  : hasUrged
                                  ? 'bg-[#e03e3e] animate-pulse'
                                  : 'bg-[#37352f]'
                              }`}
                              style={{ width: `${servePercent}%` }}
                            />
                          </div>

                          {/* Mini Items Status Pill Preview */}
                          <div className="space-y-1 pt-1 border-t border-[#efefed] min-w-0">
                            {orderItems.slice(0, 3).map((item, idx) => {
                              const isItemServed = item.serveStatus === 'served';
                              const isItemUrged = item.serveStatus === 'urged';
                              return (
                                <div key={idx} className="flex items-center justify-between text-[10.5px] gap-1 min-w-0">
                                  <span className="text-[#37352f] truncate flex-1 min-w-0" title={item.name}>
                                    {item.name}
                                  </span>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className="font-mono text-[#787774]">x{item.quantity}</span>
                                    {isItemServed ? (
                                      <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-[#edf3ec] text-[#2b593f] border border-[#c4dcbc] whitespace-nowrap">
                                        已上桌
                                      </span>
                                    ) : isItemUrged ? (
                                      <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-[#fdf2f2] text-[#e03e3e] border border-[#fbd0d0] animate-pulse whitespace-nowrap">
                                        催单中
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-[#fbf3db] text-[#8f6412] border border-[#ecd9a8] whitespace-nowrap">
                                        烹饪中
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                            {orderItems.length > 3 && (
                              <p className="text-[9.5px] text-[#787774] text-center pt-0.5">
                                ...另有 {orderItems.length - 3} 道单品
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Primary Button to Jump to Detail View (点击跳转新界面) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTableForDetail(tbl);
                        }}
                        className="w-full py-1.5 px-2 bg-[#edf3ec] hover:bg-[#ddead8] border border-[#c4dcbc] text-[#2b593f] rounded-[3px] font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer group shadow-2xs whitespace-nowrap min-w-0"
                        title="点击打开菜品出餐制作情况与状态流转节点详情界面"
                      >
                        <UtensilsCrossed className="w-3.5 h-3.5 group-hover:scale-110 transition-transform shrink-0" />
                        <span className="truncate">菜品制作出餐与流转节点</span>
                        <ChevronRight className="w-3 h-3 ml-0.5 shrink-0" />
                      </button>

                      <div className="flex items-center justify-between pt-1 border-t border-[#efefed] min-w-0">
                        <span className="text-[11px] text-[#787774] shrink-0">消费合计:</span>
                        <span className="font-mono font-bold text-sm text-[#2b593f] shrink-0 whitespace-nowrap">
                          ¥{(tbl.totalAmount || 0).toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}

                  {/* Reserved Details */}
                  {isReserved && tbl.reservation && (
                    <div className="space-y-1.5 bg-[#edf3f8] p-2 rounded-[3px] border border-[#c4d6ec] text-[11px] text-[#1c5598]">
                      <p className="font-bold flex items-center justify-between">
                        <span>宾客: {tbl.reservation.guestName}</span>
                        <span className="font-mono text-[10px] bg-[#2383e2] text-white px-1.5 py-0.2 rounded-[2px]">
                          {tbl.reservation.countdownMinutes}m后到
                        </span>
                      </p>
                      <p className="text-[#1c5598]/80">预约到店: {tbl.reservation.timeText}</p>
                      <p className="text-[#1c5598]/80 font-mono">手机号: {tbl.reservation.phone}</p>
                    </div>
                  )}

                  {/* Cleaning Details */}
                  {isCleaning && (
                    <div className="bg-[#fbf3db] p-2.5 rounded-[3px] border border-[#ecd9a8] text-[#8f6412] space-y-1">
                      <p className="font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#d9730d]" />
                        <span>已清洁 {tbl.elapsedMinutes} 分钟</span>
                      </p>
                      <p className="text-[10px]">值班保洁: {tbl.serverName || '巡回专员'}</p>
                    </div>
                  )}

                  {/* Idle Details */}
                  {isIdle && (
                    <div className="bg-[#edf3ec] p-2.5 rounded-[3px] border border-[#c4dcbc] text-[#2b593f] space-y-1">
                      <p className="font-bold">可随时开台扫码点餐</p>
                      <p className="text-[10px] text-[#2b593f]/80">标准 {tbl.capacity} 人位 · 桌码已同步激活</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-2 bg-[#fbfbfa] border-t border-[#e6e6e4] flex items-center gap-1.5 min-w-0">
                {isDining && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBillModal(tbl);
                      }}
                      className="flex-1 min-w-0 py-1 px-1.5 sm:px-2 bg-[#37352f] hover:bg-[#201f1d] text-white rounded-[3px] font-medium text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs whitespace-nowrap"
                    >
                      <ReceiptText className="w-3 h-3 shrink-0" />
                      <span>结账</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTransferModal(tbl);
                      }}
                      className="shrink-0 py-1 px-1.5 sm:px-2 bg-white hover:bg-[#f1f1ef] text-[#37352f] border border-[#d3d1cb] rounded-[3px] font-medium text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
                      title="换桌"
                    >
                      <ArrowRightLeft className="w-3 h-3 text-[#787774] shrink-0" />
                      <span>换桌</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVoidOrderModal(tableForDetail);
                      }}
                      className="shrink-0 py-1 px-1.5 sm:px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-[3px] font-medium text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
                      title="作废此桌订单并释放台位"
                    >
                      <Ban className="w-3 h-3 text-rose-600 shrink-0" />
                      <span>作废</span>
                    </button>
                  </>
                )}

                {isIdle && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenModal(tbl);
                      }}
                      className="flex-1 min-w-0 py-1 px-1.5 sm:px-2 bg-[#2b593f] hover:bg-[#204430] text-white rounded-[3px] font-medium text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs whitespace-nowrap"
                    >
                      <Plus className="w-3 h-3 shrink-0" />
                      <span>开台</span>
                    </button>
                    {waitingQueue.filter((w) => w.status === 'waiting').length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
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
                        className="shrink-0 py-1 px-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-[3px] font-semibold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
                        title={`一键撮合排队第一位顾客 (${waitingQueue.find((w) => w.status === 'waiting')?.code}) 入座`}
                      >
                        <Zap className="w-3 h-3 text-amber-600 fill-amber-500 shrink-0" />
                        <span>撮合叫号</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVoidOrderModal(tableForDetail);
                      }}
                      className="shrink-0 py-1 px-1.5 sm:px-2 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-700 border border-[#d3d1cb] hover:border-rose-200 rounded-[3px] font-medium text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
                      title="作废/重置此台位历史关联单据"
                    >
                      <Ban className="w-3 h-3 text-rose-600 shrink-0" />
                      <span>作废</span>
                    </button>
                  </>
                )}

                {isCleaning && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCleanComplete(tbl);
                      }}
                      className="flex-1 min-w-0 py-1 px-1.5 sm:px-2 bg-[#d9730d] hover:bg-[#b55f0b] text-white rounded-[3px] font-medium text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs whitespace-nowrap"
                    >
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      <span className="truncate">
                        保洁完成
                        {waitingQueue.filter((w) => w.status === 'waiting').length > 0
                          ? autoTransferOnClean
                            ? ' (自动转移)'
                            : ' (转移)'
                          : ''}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVoidOrderModal(tableForDetail);
                      }}
                      className="shrink-0 py-1 px-1.5 sm:px-2 bg-white hover:bg-rose-50 text-rose-700 border border-[#d3d1cb] hover:border-rose-200 rounded-[3px] font-medium text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
                      title="强制作废单据并清台归位"
                    >
                      <Ban className="w-3 h-3 text-rose-600 shrink-0" />
                      <span>作废</span>
                    </button>
                  </>
                )}

                {isReserved && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenTable(tbl.id, 4, '小林 (No.04)');
                        showToast(`预约宾客已入座，桌台 ${tbl.code} 成功开台！`);
                      }}
                      className="flex-1 min-w-0 py-1 px-1.5 sm:px-2 bg-[#2383e2] hover:bg-[#1a66b2] text-white rounded-[3px] font-medium text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs whitespace-nowrap"
                    >
                      <UserCheck className="w-3 h-3 shrink-0" />
                      <span>入座开台</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVoidOrderModal(tableForDetail);
                      }}
                      className="shrink-0 py-1 px-1.5 sm:px-2 bg-white hover:bg-rose-50 text-rose-700 border border-[#d3d1cb] hover:border-rose-200 rounded-[3px] font-medium text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
                      title="作废/取消预订"
                    >
                      <Ban className="w-3 h-3 text-rose-600 shrink-0" />
                      <span>作废</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
          </div>
        </div>

        {/* Right: Picture-in-Picture Table Dish Progress Panel */}
        {selectedTableForDetail && (
          <div
            id="pip-dish-progress-panel"
            className="w-full lg:w-[38%] sticky top-2 z-20 h-[82vh] sm:h-[85vh] lg:h-[88vh] max-h-[88vh] overflow-hidden rounded-[4px] border border-[#d3d1cb] shadow-md bg-white flex flex-col animate-in fade-in slide-in-from-right-3 duration-200"
          >
            <div className="flex items-center justify-between bg-slate-900 text-white px-3 py-2 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs bg-emerald-600 text-white px-1.5 py-0.5 rounded-[2px]">
                  {selectedTableForDetail.code} 桌
                </span>
                <span className="text-xs font-semibold text-slate-200">画中画出餐协同</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setDetailViewMode('fullscreen')}
                  className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="放大为全屏出餐大屏"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTableForDetail(null)}
                  className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="关闭画中画分栏"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {(() => {
              const freshTable = tables.find((t) => t.id === selectedTableForDetail.id) || selectedTableForDetail;
              return (
                <TableDishProgressView
                  isEmbedded={true}
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
                    handleBillModal(tbl);
                  }}
                  onVoidOrder={(tbl) => {
                    handleVoidOrderModal(tbl);
                  }}
                  showToast={showToast}
                />
              );
            })()}
          </div>
        )}
      </div>

      {/* 1. Modal: 快速开台 */}
      {activeModal === 'open' && selectedTable && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-sm rounded-[3px] border border-[#d3d1cb] shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3 bg-[#f7f7f5] border-b border-[#e6e6e4] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm bg-[#37352f] text-white px-1.5 py-0.2 rounded-[2px]">
                  {selectedTable.code}
                </span>
                <span className="font-bold text-sm text-[#37352f]">开台入座</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-[#787774] hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-[#5a5854] block">就餐人数选择:</label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 4, 6].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setOpenGuests(num)}
                      className={`py-2 rounded-[3px] font-semibold border text-center cursor-pointer transition-all ${
                        openGuests === num
                          ? 'bg-[#37352f] text-white border-[#37352f]'
                          : 'bg-[#f7f7f5] text-[#37352f] border-[#e6e6e4] hover:bg-[#efefed]'
                      }`}
                    >
                      {num} 人
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#5a5854] block">值班服务员:</label>
                <select
                  value={openServer}
                  onChange={(e) => setOpenServer(e.target.value)}
                  className="w-full p-2 bg-[#f7f7f5] border border-[#d3d1cb] rounded-[3px] focus:outline-none focus:border-[#37352f]"
                >
                  <option value="小林 (No.04)">小林 (No.04) · 区域主管</option>
                  <option value="阿豪 (No.02)">阿豪 (No.02) · 资深侍应</option>
                  <option value="王店长 (No.01)">王店长 (No.01) · 领班总控</option>
                </select>
              </div>

              <div className="bg-[#edf3ec] p-2.5 rounded-[3px] border border-[#c4dcbc] text-[11px] text-[#2b593f] space-y-0.5">
                <p className="font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#4dab63]" />
                  <span>智能开台联动已就绪</span>
                </p>
                <p>确认开台后，桌边扫码立即可用，餐车厨房 KDS 同步建立联单。</p>
              </div>
            </div>

            <div className="p-3 bg-[#f7f7f5] border-t border-[#e6e6e4] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-3 py-1.5 bg-white text-[#37352f] border border-[#d3d1cb] rounded-[3px] font-semibold cursor-pointer hover:bg-[#efefed]"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenTable(selectedTable.id, openGuests, openServer);
                  setActiveModal(null);
                  showToast(`桌台 ${selectedTable.code} 成功开台 (${openGuests}人)，桌码点餐已激活！`);
                }}
                className="px-4 py-1.5 bg-[#37352f] text-white rounded-[3px] font-semibold cursor-pointer hover:bg-[#201f1d] shadow-2xs"
              >
                确认开台
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal: 账单结账与 AA 均摊 */}
      {activeModal === 'bill' && selectedTable && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-md rounded-[3px] border border-[#d3d1cb] shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3 bg-[#f7f7f5] border-b border-[#e6e6e4] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm bg-[#37352f] text-white px-1.5 py-0.2 rounded-[2px]">
                  {selectedTable.code}
                </span>
                <span className="font-bold text-sm text-[#37352f]">堂食结账</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-[#787774] hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs max-h-[75vh] overflow-y-auto notion-scrollbar">
              {/* Order items list */}
              <div className="space-y-1.5">
                <span className="font-semibold text-[#5a5854] block">消费明细清单:</span>
                <div className="bg-[#fbfbfa] p-2.5 rounded-[3px] border border-[#e6e6e4] space-y-1.5">
                  {(selectedTable.orderItems || []).map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[#37352f]">{it.name}</span>
                        <span className="text-[10px] text-[#787774] font-mono">x{it.quantity}</span>
                      </div>
                      <span className="font-mono font-bold text-[#37352f]">
                        ¥{(it.price * it.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discount Selection */}
              <div className="space-y-1">
                <label className="font-semibold text-[#5a5854] flex items-center gap-1">
                  <Percent className="w-3 h-3 text-[#d9730d]" />
                  <span>整单折扣优惠:</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: '无折扣', val: 1.0 },
                    { label: '9折', val: 0.9 },
                    { label: '8.8折', val: 0.88 },
                    { label: '8折 VIP', val: 0.8 }
                  ].map((d) => (
                    <button
                      key={d.label}
                      type="button"
                      onClick={() => setBillDiscount(d.val)}
                      className={`py-1.5 rounded-[3px] font-semibold border text-center cursor-pointer transition-all ${
                        billDiscount === d.val
                          ? 'bg-[#37352f] text-white border-[#37352f]'
                          : 'bg-[#f7f7f5] text-[#37352f] border-[#e6e6e4]'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* AA Split Toggle */}
              <div className="bg-[#fbf3db] p-2.5 rounded-[3px] border border-[#ecd9a8] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#8f6412] flex items-center gap-1">
                    <Split className="w-3.5 h-3.5 text-[#d9730d]" />
                    <span>启用 AA 均摊计算器</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={isAaSplit}
                    onChange={(e) => setIsAaSplit(e.target.checked)}
                    className="w-4 h-4 accent-[#d9730d] cursor-pointer"
                  />
                </div>

                {isAaSplit && (
                  <div className="flex items-center justify-between pt-1 border-t border-[#ecd9a8]/60 text-xs">
                    <span className="text-[#8f6412]">均摊人数:</span>
                    <div className="flex items-center gap-2">
                      {[2, 3, 4, 5].map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => setAaGuestCount(cnt)}
                          className={`w-6 h-6 rounded-[2px] font-mono font-bold text-xs ${
                            aaGuestCount === cnt ? 'bg-[#d9730d] text-white' : 'bg-white text-[#8f6412] border border-[#ecd9a8]'
                          }`}
                        >
                          {cnt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Calculation Summary */}
              {(() => {
                const rawTotal = selectedTable.totalAmount || 0;
                const finalTotal = rawTotal * billDiscount;
                const perPerson = isAaSplit ? finalTotal / aaGuestCount : finalTotal;

                return (
                  <div className="bg-[#edf3ec] p-3 rounded-[3px] border border-[#c4dcbc] space-y-1.5">
                    <div className="flex items-center justify-between text-[#2b593f]">
                      <span>原价合计:</span>
                      <span className="line-through text-[#787774]">¥{rawTotal.toFixed(2)}</span>
                    </div>
                    {billDiscount < 1.0 && (
                      <div className="flex items-center justify-between text-[#d9730d] font-semibold">
                        <span>折扣优惠减免:</span>
                        <span>-¥{(rawTotal - finalTotal).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm font-bold text-[#2b593f] pt-1 border-t border-[#c4dcbc]">
                      <span>应收总金额:</span>
                      <span className="text-base">¥{finalTotal.toFixed(2)}</span>
                    </div>
                    {isAaSplit && (
                      <div className="flex items-center justify-between text-xs font-bold text-[#8f6412] bg-white/60 p-1.5 rounded-[2px]">
                        <span>AA 人均应付 ({aaGuestCount}人):</span>
                        <span className="text-sm">¥{perPerson.toFixed(2)} /人</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="p-3 bg-[#f7f7f5] border-t border-[#e6e6e4] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-3 py-1.5 bg-white text-[#37352f] border border-[#d3d1cb] rounded-[3px] font-semibold cursor-pointer hover:bg-[#efefed]"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  onCheckoutTable(selectedTable.id, billDiscount, isAaSplit);
                  setActiveModal(null);
                  showToast(`桌台 ${selectedTable.code} 结账完成并自动转为保洁状态，流水已归档！`);
                }}
                className="px-4 py-1.5 bg-[#2b593f] hover:bg-[#204430] text-white rounded-[3px] font-medium text-xs cursor-pointer shadow-2xs flex items-center gap-1 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>确认结账</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal: 换桌并单 */}
      {activeModal === 'transfer' && selectedTable && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-sm rounded-[3px] border border-[#d3d1cb] shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3 bg-[#f7f7f5] border-b border-[#e6e6e4] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm bg-[#37352f] text-white px-1.5 py-0.2 rounded-[2px]">
                  {selectedTable.code}
                </span>
                <span className="font-bold text-sm text-[#37352f]">换桌转单</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-[#787774] hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <p className="text-[#5a5854]">
                当前桌位: <strong className="text-[#37352f]">{selectedTable.name} ({selectedTable.code})</strong>
              </p>

              <div className="space-y-1">
                <label className="font-semibold text-[#5a5854] block">目标转入桌台:</label>
                <select
                  value={targetTableId}
                  onChange={(e) => setTargetTableId(e.target.value)}
                  className="w-full p-2 bg-[#f7f7f5] border border-[#d3d1cb] rounded-[3px] focus:outline-none focus:border-[#37352f]"
                >
                  {tables
                    .filter((t) => t.id !== selectedTable.id && t.status === 'idle')
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.code} - {t.name} ({t.zoneLabel} · {t.capacity}座)
                      </option>
                    ))}
                </select>
              </div>

              <div className="bg-[#fbf3db] p-2.5 rounded-[3px] border border-[#ecd9a8] text-[11px] text-[#8f6412]">
                换桌后，原桌已点菜品、KDS 工单和挂账流水将无缝合并至新桌台，原桌自动转为待保洁。
              </div>
            </div>

            <div className="p-3 bg-[#f7f7f5] border-t border-[#e6e6e4] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-3 py-1.5 bg-white text-[#37352f] border border-[#d3d1cb] rounded-[3px] font-semibold cursor-pointer hover:bg-[#efefed]"
              >
                取消
              </button>
              <button
                type="button"
                disabled={!targetTableId}
                onClick={() => {
                  if (!targetTableId) return;
                  onTransferTable(selectedTable.id, targetTableId);
                  setActiveModal(null);
                  showToast(`成功将订单自 ${selectedTable.code} 转移至目标桌台！`);
                }}
                className="px-4 py-1.5 bg-[#37352f] text-white rounded-[3px] font-medium text-xs cursor-pointer hover:bg-[#201f1d] disabled:opacity-50 transition-colors"
              >
                确认换桌
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal: 登记生成等位桌号 */}
      {activeModal === 'addWaiting' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-sm rounded-[3px] border border-[#d3d1cb] shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3 bg-[#f7f7f5] border-b border-[#e6e6e4] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs bg-[#37352f] text-white px-1.5 py-0.2 rounded-[2px]">
                  NEW WAIT
                </span>
                <span className="font-bold text-sm text-[#37352f]">登记等位桌号</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-[#787774] hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-[#5a5854] block">就餐人数 (位):</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 6, 8].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setWaitGuests(num)}
                      className={`flex-1 py-1 rounded-[3px] border text-xs font-mono font-bold transition-all cursor-pointer ${
                        waitGuests === num
                          ? 'bg-[#37352f] text-white border-[#37352f]'
                          : 'bg-[#f7f7f5] text-[#787774] border-[#d3d1cb] hover:bg-[#efefed]'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#5a5854] block">顾客称呼 / 备注:</label>
                <input
                  type="text"
                  value={waitGuestName}
                  onChange={(e) => setWaitGuestName(e.target.value)}
                  placeholder="例如: 林女士 / 2位窗边"
                  className="w-full p-2 bg-[#f7f7f5] border border-[#d3d1cb] rounded-[3px] focus:outline-none focus:border-[#37352f]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#5a5854] block">联系电话 (选填):</label>
                <input
                  type="text"
                  value={waitPhone}
                  onChange={(e) => setWaitPhone(e.target.value)}
                  placeholder="用于入座短信或现场呼号"
                  className="w-full p-2 bg-[#f7f7f5] border border-[#d3d1cb] rounded-[3px] focus:outline-none focus:border-[#37352f]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#5a5854] block">期望就餐区域:</label>
                <select
                  value={waitZone}
                  onChange={(e) => setWaitZone(e.target.value)}
                  className="w-full p-2 bg-[#f7f7f5] border border-[#d3d1cb] rounded-[3px] focus:outline-none focus:border-[#37352f]"
                >
                  <option value="餐车外摆区">餐车外摆休闲区</option>
                  <option value="室内大厅散座">室内大厅散座</option>
                  <option value="舒适卡座区">舒适卡座区</option>
                  <option value="不限，任意有空位即入">不限，任意有空位即入</option>
                </select>
              </div>

              <div className="bg-[#edf3ec] p-2.5 rounded-[3px] border border-[#c4dcbc] text-[11px] text-[#2b593f]">
                取号后将生成 W 开头的等位桌号，食客可凭等位号先行点单。一旦现有桌台清理完毕，系统将自动或手动转移入座！
              </div>
            </div>

            <div className="p-3 bg-[#f7f7f5] border-t border-[#e6e6e4] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-3 py-1.5 bg-white text-[#37352f] border border-[#d3d1cb] rounded-[3px] font-semibold cursor-pointer hover:bg-[#efefed]"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  const newItem = addWaitingTable({
                    guests: waitGuests,
                    phone: waitPhone || '到店取号',
                    guestName: waitGuestName || `等位食客 (${waitGuests}位)`,
                    preferredZone: waitZone
                  });
                  setActiveModal(null);
                  showToast(`成功生成等位桌号 ${newItem.code} (${newItem.guests}人)！`);
                }}
                className="px-4 py-1.5 bg-[#37352f] text-white rounded-[3px] font-medium text-xs cursor-pointer hover:bg-[#201f1d] transition-colors"
              >
                确认登记
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal: 手动将等位桌号纳入转移 */}
      {activeModal === 'manualTransfer' && waitingToTransfer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-sm rounded-[3px] border border-[#d3d1cb] shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3 bg-[#f7f7f5] border-b border-[#e6e6e4] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs bg-[#2b593f] text-white px-1.5 py-0.2 rounded-[2px]">
                  {waitingToTransfer.code}
                </span>
                <span className="font-bold text-sm text-[#37352f]">手动纳入转移入座</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-[#787774] hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div className="p-2.5 bg-[#f7f7f5] rounded-[3px] border border-[#e6e6e4] space-y-1 text-[#5a5854]">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#37352f]">
                    {waitingToTransfer.guestName || '等位客人'}
                  </span>
                  <span className="font-mono text-[#d9730d]">{waitingToTransfer.guests}人就餐</span>
                </div>
                <div className="text-[11px] text-[#787774] flex items-center justify-between">
                  <span>取号时间: {waitingToTransfer.createdAt}</span>
                  <span>已等待: {waitingToTransfer.elapsedMinutes || 1} 分钟</span>
                </div>
                {waitingToTransfer.orderNo && (
                  <div className="text-[11px] font-medium text-[#2b593f] pt-1 border-t border-[#e6e6e4]">
                    已提前下单: {waitingToTransfer.orderNo} (¥{(waitingToTransfer.totalAmount || 0).toFixed(2)})
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#5a5854] block">目标入座正式桌台:</label>
                <select
                  value={transferTargetTableId}
                  onChange={(e) => setTransferTargetTableId(e.target.value)}
                  className="w-full p-2 bg-[#f7f7f5] border border-[#d3d1cb] rounded-[3px] focus:outline-none focus:border-[#37352f]"
                >
                  {/* 先列出已清理完毕的空闲桌台 */}
                  <optgroup label="✅ 推荐: 当前已清理空闲桌台">
                    {tables
                      .filter((t) => t.status === 'idle')
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.code} 号桌 - {t.name} ({t.zoneLabel} · 容量{t.capacity}人)
                        </option>
                      ))}
                  </optgroup>
                  {/* 若商家需要也可选择其它桌台 */}
                  <optgroup label="其他桌台 (需确认)">
                    {tables
                      .filter((t) => t.status !== 'idle')
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.code} 号桌 - {t.name} ({t.status === 'cleaning' ? '清洁中' : t.status === 'dining' ? '就餐中' : '预订'})
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              <div className="bg-[#edf3ec] p-2.5 rounded-[3px] border border-[#c4dcbc] text-[11px] text-[#2b593f]">
                确认转移后，等位桌号将自动标记为已转移，目标桌台状态转为就餐中，等位订单菜品无缝同步！
              </div>
            </div>

            <div className="p-3 bg-[#f7f7f5] border-t border-[#e6e6e4] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-3 py-1.5 bg-white text-[#37352f] border border-[#d3d1cb] rounded-[3px] font-semibold cursor-pointer hover:bg-[#efefed]"
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
                className="px-4 py-1.5 bg-[#2b593f] hover:bg-[#204430] text-white rounded-[3px] font-medium text-xs cursor-pointer shadow-2xs transition-colors"
              >
                确认转移入座
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal: 保洁完成手动转移引导提示 */}
      {activeModal === 'cleanPrompt' && cleanPromptTable && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-md rounded-[3px] border border-[#d3d1cb] shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3 bg-[#f7f7f5] border-b border-[#e6e6e4] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs bg-[#4dab63] text-white px-1.5 py-0.2 rounded-[2px]">
                  {cleanPromptTable.code} CLEANED
                </span>
                <span className="font-bold text-sm text-[#37352f]">桌台清理完成 · 是否纳入等位转移？</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-[#787774] hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div className="p-2.5 bg-[#edf3ec] rounded-[3px] border border-[#c4dcbc] text-[#2b593f]">
                桌台 <strong className="text-[#37352f]">{cleanPromptTable.code} ({cleanPromptTable.name})</strong> 已保洁完毕！
                当前处于手动确认转移模式，检测到等位队列中有 <strong>{cleanPromptCandidates.length}</strong> 位客人等待就座。
              </div>

              <div className="space-y-1.5">
                <span className="font-semibold text-[#5a5854] block">选择一位客人纳入转移入座:</span>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {cleanPromptCandidates.map((c) => (
                    <div
                      key={c.id}
                      className="p-2 bg-[#f7f7f5] hover:bg-[#efefed] border border-[#d3d1cb] rounded-[3px] flex items-center justify-between gap-2 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs bg-[#37352f] text-white px-1.5 py-0.2 rounded-[2px]">
                          {c.code}
                        </span>
                        <div>
                          <div className="font-bold text-[#37352f]">
                            {c.guestName || '等位客人'} ({c.guests}人)
                          </div>
                          <div className="text-[10.5px] text-[#787774]">
                            等待 {c.elapsedMinutes || 1}分钟 · {c.phone || '到店'} · 期望 {c.preferredZone || '外摆区'}
                          </div>
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
                            showToast(`【手动转移成功】${cleanPromptTable.code} 号桌已安排等位 ${c.code} (${c.guests}人) 入座并语音叫号！`);
                          }
                        }}
                        className="px-2.5 py-1 bg-[#2b593f] hover:bg-[#204430] text-white rounded-[2px] font-medium text-xs cursor-pointer shadow-2xs shrink-0 transition-colors flex items-center gap-1"
                      >
                        <Megaphone className="w-3 h-3 text-[#fde047]" />
                        <span>转移入座并叫号</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-3 bg-[#f7f7f5] border-t border-[#e6e6e4] flex items-center justify-between gap-2">
              <span className="text-[11px] text-[#787774]">或设为空闲供现场新客入座</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onReleaseTable(cleanPromptTable.id);
                    setActiveModal(null);
                    showToast(`桌台 ${cleanPromptTable.code} 已设为空闲，暂不转移等位。`);
                  }}
                  className="px-3 py-1.5 bg-white text-[#37352f] border border-[#d3d1cb] rounded-[3px] font-semibold cursor-pointer hover:bg-[#efefed]"
                >
                  仅恢复为空闲
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal: 堂食台位订单作废与清台确认 */}
      {activeModal === 'voidOrder' && voidTargetTable && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-[4px] border border-[#d3d1cb] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            {/* 顶部警告色标题 */}
            <div className="p-3.5 bg-[#fdf2f2] border-b border-[#fbd0d0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-rose-100 flex items-center justify-center text-rose-700 shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-xs bg-rose-600 text-white px-1.5 py-0.2 rounded-[2px]">
                      {voidTargetTable.code} 桌
                    </span>
                    <span className="font-bold text-sm text-[#1a1c1b]">作废堂食订单确认</span>
                  </div>
                  <p className="text-[11px] text-rose-700">将撤销作废此桌当前在结/就餐订单并重置释放台位</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-[#787774] hover:text-[#1a1c1b] p-1 hover:bg-black/5 rounded cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 模态框主体内容 */}
            <div className="p-4 space-y-3.5 overflow-y-auto text-xs">
              {/* 当前桌台及订单信息概览 */}
              <div className="bg-[#fbfbfa] p-3 rounded-[3px] border border-[#e6e6e4] space-y-2">
                <div className="flex items-center justify-between border-b border-[#efefed] pb-2">
                  <span className="font-bold text-[#37352f] flex items-center gap-1.5">
                    <UtensilsCrossed className="w-3.5 h-3.5 text-[#787774]" />
                    <span>{voidTargetTable.name} ({voidTargetTable.zoneLabel || '外摆区'})</span>
                  </span>
                  <span className="text-[11px] text-[#787774]">
                    容量 {voidTargetTable.capacity} 人位
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[#787774] block">关联订单号:</span>
                    <span className="font-mono font-bold text-[#1a1c1b] break-all">
                      {voidTargetTable.orderNo || `UR-DIN-${voidTargetTable.code}-01`}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#787774] block">消费订单金额:</span>
                    <span className="font-mono font-bold text-rose-600 text-sm">
                      ¥{(voidTargetTable.totalAmount || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* 菜品清单预览 */}
                {voidTargetTable.orderItems && voidTargetTable.orderItems.length > 0 && (
                  <div className="pt-2 border-t border-[#efefed] space-y-1">
                    <div className="flex items-center justify-between text-[10.5px] text-[#787774]">
                      <span>已点菜品明细 ({voidTargetTable.orderItems.length} 项):</span>
                      <span>共 {voidTargetTable.orderItems.reduce((acc, it) => acc + it.quantity, 0)} 件</span>
                    </div>
                    <div className="max-h-24 overflow-y-auto bg-white p-2 rounded-[2px] border border-[#e6e6e4] space-y-1">
                      {voidTargetTable.orderItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[11px]">
                          <span className="text-[#37352f] truncate max-w-[200px]">{item.name}</span>
                          <span className="font-mono text-[#787774]">
                            x{item.quantity} · ¥{(item.price * item.quantity).toFixed(1)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 作废原因单选 */}
              <div className="space-y-1.5">
                <label className="font-bold text-[#37352f] flex items-center gap-1">
                  <FileX className="w-3.5 h-3.5 text-rose-600" />
                  <span>请选择作废原因 (将归档至多账号审计日志):</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    '顾客退单/未就餐离店',
                    '错开桌台/重复录入',
                    '顾客换桌/重新点餐',
                    '菜品售罄/顾客取消',
                    '系统测试/演练订单',
                    '自定义输入'
                  ].map((reason) => {
                    const isSelected = voidReason === reason;
                    return (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => setVoidReason(reason)}
                        className={`px-2.5 py-1.5 rounded-[3px] border text-left text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-rose-50 border-rose-400 text-rose-800 font-semibold'
                            : 'bg-[#f7f7f5] hover:bg-[#efefed] border-[#d3d1cb] text-[#5a5854]'
                        }`}
                      >
                        {reason}
                      </button>
                    );
                  })}
                </div>

                {voidReason === '自定义输入' && (
                  <div className="pt-1">
                    <input
                      type="text"
                      value={customVoidReason}
                      onChange={(e) => setCustomVoidReason(e.target.value)}
                      placeholder="请输入具体作废原因 (如：前台误触、顾客赶时间离开)..."
                      className="w-full p-2 bg-[#f7f7f5] border border-rose-300 rounded-[3px] text-xs focus:outline-none focus:bg-white focus:border-rose-500"
                    />
                  </div>
                )}
              </div>

              {/* 桌台后续状态选择 */}
              <div className="space-y-1.5">
                <label className="font-bold text-[#37352f] block">作废后桌位状态恢复为:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setVoidTargetStatus('idle')}
                    className={`p-2 rounded-[3px] border text-left transition-colors cursor-pointer flex flex-col gap-0.5 ${
                      voidTargetStatus === 'idle'
                        ? 'bg-[#edf3ec] border-[#4dab63] text-[#2b593f]'
                        : 'bg-[#f7f7f5] border-[#d3d1cb] text-[#5a5854] hover:bg-[#efefed]'
                    }`}
                  >
                    <span className="font-bold text-xs flex items-center gap-1">
                      <span>🟢 立即恢复为空闲</span>
                    </span>
                    <span className="text-[10px] text-[#787774]">可随时接待现场新顾客扫码点餐</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVoidTargetStatus('cleaning')}
                    className={`p-2 rounded-[3px] border text-left transition-colors cursor-pointer flex flex-col gap-0.5 ${
                      voidTargetStatus === 'cleaning'
                        ? 'bg-[#fbf3db] border-[#d9730d] text-[#8f6412]'
                        : 'bg-[#f7f7f5] border-[#d3d1cb] text-[#5a5854] hover:bg-[#efefed]'
                    }`}
                  >
                    <span className="font-bold text-xs flex items-center gap-1">
                      <span>🟡 置为保洁清洁中</span>
                    </span>
                    <span className="text-[10px] text-[#787774]">需值班保洁清桌后方可迎客</span>
                  </button>
                </div>
              </div>

              {/* 多账号协同安全回滚提示 */}
              <div className="bg-[#edf3ec] p-2.5 rounded-[3px] border border-[#c4dcbc] text-[#2b593f] flex items-start gap-2 text-[11px]">
                <ShieldCheck className="w-4 h-4 text-[#2b593f] shrink-0 mt-0.5" />
                <div>
                  <strong className="block">已激活多账号防误触审计与数据快照</strong>
                  <span>此作废操作将自动写入版本回溯树。如系员工误操作，您随时可在右侧「审计恢复抽屉」中一键无损还原此桌订单与菜品进度。</span>
                </div>
              </div>
            </div>

            {/* 模态框底部操作 */}
            <div className="p-3 bg-[#f7f7f5] border-t border-[#e6e6e4] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-3 py-1.5 bg-white text-[#37352f] border border-[#d3d1cb] rounded-[3px] font-semibold cursor-pointer hover:bg-[#efefed] transition-colors text-xs"
              >
                放弃返回
              </button>
              <button
                type="button"
                onClick={handleConfirmVoidOrder}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-[3px] font-bold text-xs cursor-pointer shadow-2xs transition-colors flex items-center gap-1.5"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>确认作废订单并清台</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 右侧折叠内嵌式账号操作对比与数据兜底组件 */}
      <AccountAuditDrawer
        currentModule="tables"
        title="堂食桌台操作审计与版本恢复"
        showToast={showToast}
      />
    </div>
  );
};
