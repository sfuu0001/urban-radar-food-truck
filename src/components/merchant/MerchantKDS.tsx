import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ChefHat,
  LayoutGrid,
  Layers,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Utensils,
  Bell,
  MessageSquare,
  KeyRound,
  Volume2,
  Megaphone,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
  Timer,
  Check,
  CircleDot,
  ShoppingBag,
  Bike
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { KdsTicket, KdsTicketItem } from '../../types';
import { UnifiedOmniChatModal } from '../chat/UnifiedOmniChatModal';
import { getOrGeneratePickupCode, getPickupShelfCode } from '../../utils/pickupCodeEngine';
import { voiceAlerts, unlockAudioContext } from '../../utils/voiceAlertEngine';
import { AccountAuditDrawer } from './AccountAuditDrawer';
import { businessTransactionEngine } from '../../utils/businessTransactionEngine';
import { UiverseFlameTag } from './uiverse/UiverseDynamicComponents';

interface MerchantKDSProps {
  tickets: KdsTicket[];
  onFinishTicket: (ticketId: string) => void;
  onDeleteTicket?: (ticketId: string, deleteAssociatedOrder: boolean, reason?: string) => void;
  onToggleItemComplete: (ticketId: string, itemId: string) => void;
  onBatchFinishDish: (dishName: string) => void;
  showToast: (msg: string) => void;
}

export const MerchantKDS: React.FC<MerchantKDSProps> = ({
  tickets,
  onFinishTicket,
  onDeleteTicket,
  onToggleItemComplete,
  onBatchFinishDish,
  showToast
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'batch'>('grid');
  const [filterType, setFilterType] = useState<'all' | 'dine_in' | 'pickup' | 'delivery'>('all');
  const [activeChatTicketNo, setActiveChatTicketNo] = useState<string | null>(null);
  const [isMobileChannelOpen, setIsMobileChannelOpen] = useState(false);
  const [channelDropdownCoords, setChannelDropdownCoords] = useState<{ top: number; left?: number; right?: number }>({ top: 0 });

  // 监听页面滚动与窗口尺寸变化，自动收起手机端制作渠道下拉菜单
  useEffect(() => {
    if (!isMobileChannelOpen) return;
    const handleDismiss = () => setIsMobileChannelOpen(false);
    window.addEventListener('scroll', handleDismiss, { passive: true });
    window.addEventListener('resize', handleDismiss);
    return () => {
      window.removeEventListener('scroll', handleDismiss);
      window.removeEventListener('resize', handleDismiss);
    };
  }, [isMobileChannelOpen]);

  // Expanded timelines map: key is `${ticketId}_${itemId}`
  const [expandedDishTimelines, setExpandedDishTimelines] = useState<Record<string, boolean>>({});

  const toggleDishTimeline = (ticketId: string, itemId: string) => {
    const key = `${ticketId}_${itemId}`;
    setExpandedDishTimelines(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Helper to generate full timeline records from order to completion for any dish item
  const getItemTimelineNodes = (ticket: KdsTicket, item: KdsTicketItem) => {
    const orderTimeStr = item.orderTime || ticket.orderTime || '12:00:00';
    // Parse order time to calculate realistic milestone offsets
    const baseHourMin = orderTimeStr.includes(':') ? orderTimeStr.split(':') : ['12', '00', '00'];
    const h = parseInt(baseHourMin[0] || '12', 10);
    const m = parseInt(baseHourMin[1] || '0', 10);
    const s = parseInt(baseHourMin[2] || '0', 10);

    const formatOffset = (plusMinutes: number, plusSeconds: number = 0) => {
      let totalSeconds = h * 3600 + (m + plusMinutes) * 60 + s + plusSeconds;
      const hh = Math.floor(totalSeconds / 3600) % 24;
      const mm = Math.floor((totalSeconds % 3600) / 60);
      const ss = totalSeconds % 60;
      return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    };

    const orderedAt = item.orderTime || `${orderTimeStr}${orderTimeStr.length <= 5 ? ':00' : ''}`;
    const prepAt = item.prepStartTime || formatOffset(1, 15);
    const cookingAt = item.cookingStartTime || formatOffset(3, 40);
    const servedAt = item.servedTime || (item.isCompleted ? formatOffset(Math.max(4, ticket.elapsedMinutes), 12) : null);

    // Calculate total duration in minutes & seconds if completed
    let totalDurationText = '';
    if (item.isCompleted) {
      const cookMin = Math.max(2, ticket.elapsedMinutes > 0 ? ticket.elapsedMinutes : 6);
      totalDurationText = `耗时${cookMin}分28秒`;
    }

    return {
      orderedAt,
      prepAt,
      cookingAt,
      servedAt,
      totalDurationText,
      nodes: [
        {
          step: 'ordered',
          label: '顾客下单 / 前台接单',
          timestamp: orderedAt,
          operator: ticket.channelType === 'dine_in' ? '桌码扫码点餐' : '前台POS收银/外卖接单',
          status: 'completed',
          note: '工单已下发至 KDS 屏幕'
        },
        {
          step: 'prep',
          label: '备料配菜 / 打荷理单',
          timestamp: prepAt,
          operator: '后厨打荷工位 (陈浩)',
          status: 'completed',
          note: '主辅食材就绪'
        },
        {
          step: 'cooking',
          label: '上灶烹制 / 炭火炙烤',
          timestamp: cookingAt,
          operator: '炭烤主厨 (王师傅)',
          status: item.isCompleted ? 'completed' : 'current',
          note: item.isCompleted ? '火候与风味校验合格' : '🔥 正在明火烹制中'
        },
        {
          step: 'ready',
          label: '装盘质检 / 出餐传菜',
          timestamp: servedAt || '等待出餐装盘',
          operator: item.isCompleted ? '主厨划菜质检' : '待划菜',
          status: item.isCompleted ? 'completed' : 'pending',
          note: item.isCompleted ? '已完成出餐，可取餐/传菜' : '烹饪就绪后将立即标定'
        }
      ]
    };
  };

  // KDS Delete / Discard ticket modal
  const [deleteTargetTicket, setDeleteTargetTicket] = useState<KdsTicket | null>(null);
  const [deleteReason, setDeleteReason] = useState('顾客撤单/退款作废');
  const [customDeleteReason, setCustomDeleteReason] = useState('');
  const [alsoDeleteOrder, setAlsoDeleteOrder] = useState(true);

  const handleConfirmDeleteTicket = () => {
    if (!deleteTargetTicket) return;
    const finalReason = deleteReason === 'other' ? (customDeleteReason.trim() || '后厨工单作废') : deleteReason;
    if (onDeleteTicket) {
      onDeleteTicket(deleteTargetTicket.id, alsoDeleteOrder, finalReason);
    } else {
      onFinishTicket(deleteTargetTicket.id);
    }
    voiceAlerts.speakText(`后厨工单 ${deleteTargetTicket.ticketNo} 已作废删除！`, { chimeType: 'cancel' });
    showToast(`工单 ${deleteTargetTicket.ticketNo} 已从后厨制作队列删除！`);
    setDeleteTargetTicket(null);
    setCustomDeleteReason('');
  };
  const [autoVoiceBroadcast, setAutoVoiceBroadcast] = useState<boolean>(() => {
    try {
      return localStorage.getItem('obsidian_kds_auto_voice') !== 'false';
    } catch {
      return true;
    }
  });

  const toggleAutoVoice = () => {
    setAutoVoiceBroadcast((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('obsidian_kds_auto_voice', String(next));
      } catch {
        // ignore
      }
      showToast(next ? '已开启 KDS 出餐自动语音广播' : '已关闭 KDS 出餐自动语音广播');
      return next;
    });
  };

  const handleFinishAndCall = async (ticket: KdsTicket, forceVoiceCall = false) => {
    // 联动事务：出餐完成同步至桌台与叫号中心
    businessTransactionEngine.executeKdsDishStatusSync({
      ticketId: ticket.id,
      isAllCompleted: true,
      operatorName: 'KDS后厨主厨'
    });

    onFinishTicket(ticket.id);
    const targetType = ticket.channelType === 'dine_in' ? 'dine_in' : ticket.channelType === 'delivery' ? 'delivery' : 'pickup';
    
    // 执行语音广播 (若开启自动叫号或手动点击了出餐并叫号)
    const shouldBroadcast = autoVoiceBroadcast || forceVoiceCall;
    if (shouldBroadcast) {
      await unlockAudioContext();
      if (targetType === 'pickup') {
        const pCode = ticket.pickupCode || ticket.ticketNo.replace(/^#/, '');
        voiceAlerts.callingGuest(pCode, '餐车前台自提处');
      } else if (targetType === 'delivery') {
        voiceAlerts.callRiderForOrder(ticket.ticketNo, '专线/美团骑手');
      } else {
        voiceAlerts.kdsReadyAndCall(ticket.ticketNo, 'dine_in', ticket.tableOrChannel);
      }
    }
    showToast(`工单 ${ticket.ticketNo} 已完成出餐${shouldBroadcast ? '，并触发外放广播叫号' : ''}！`);
  };

  const handleManualCallOnly = async (ticket: KdsTicket) => {
    await unlockAudioContext();
    const targetType = ticket.channelType === 'dine_in' ? 'dine_in' : ticket.channelType === 'delivery' ? 'delivery' : 'pickup';
    if (targetType === 'pickup') {
      const pCode = ticket.pickupCode || ticket.ticketNo.replace(/^#/, '');
      voiceAlerts.callingGuest(pCode, '餐车前台自提处');
    } else if (targetType === 'delivery') {
      voiceAlerts.callRiderForOrder(ticket.ticketNo, '专线/美团骑手');
    } else {
      voiceAlerts.kdsReadyAndCall(ticket.ticketNo, 'dine_in', ticket.tableOrChannel);
    }
    showToast(`已向外放广播呼叫: ${ticket.ticketNo} (${ticket.tableOrChannel})`);
  };


  const filteredTickets = tickets.filter((t) => {
    if (filterType === 'all') return true;
    return t.channelType === filterType;
  });

  // Calculate batch dishes for the batch mode
  const dishAggregates: Record<string, { totalQty: number; ticketDetails: { ticketNo: string; table: string; qty: number }[]; specialNotes: string[] }> = {};

  filteredTickets.forEach((t) => {
    t.items.forEach((item) => {
      if (!item.isCompleted) {
        if (!dishAggregates[item.dishName]) {
          dishAggregates[item.dishName] = {
            totalQty: 0,
            ticketDetails: [],
            specialNotes: []
          };
        }
        dishAggregates[item.dishName].totalQty += item.quantity;
        dishAggregates[item.dishName].ticketDetails.push({
          ticketNo: t.ticketNo,
          table: t.tableOrChannel,
          qty: item.quantity
        });
        if (item.notes && !dishAggregates[item.dishName].specialNotes.includes(item.notes)) {
          dishAggregates[item.dishName].specialNotes.push(item.notes);
        }
      }
    });
  });

  const kdsChannelOptions = [
    { key: 'all', label: '全部待做', count: tickets.length, icon: LayoutGrid, dotColor: 'bg-neutral-900' },
    { key: 'dine_in', label: '堂食外摆', count: tickets.filter(t => t.channelType === 'dine_in').length, icon: Utensils, dotColor: 'bg-amber-500' },
    { key: 'pickup', label: '到车自提', count: tickets.filter(t => t.channelType === 'pickup').length, icon: ShoppingBag, dotColor: 'bg-emerald-500' },
    { key: 'delivery', label: '外卖专送', count: tickets.filter(t => t.channelType === 'delivery').length, icon: Bike, dotColor: 'bg-blue-500' },
  ] as const;

  const currentKdsChannel = kdsChannelOptions.find(o => o.key === filterType) || kdsChannelOptions[0];

  return (
    <div className="pr-7 xl:pr-9 space-y-3.5 text-xs">
      {/* ========================================================================= */}
      {/* 手机端单排极简控制条 (Mobile KDS Single-Row Deck: Strictly Single Row) */}
      {/* ========================================================================= */}
      <div className="sm:hidden bg-white p-2 rounded-xl border border-neutral-200 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-nowrap shrink-0 w-full py-0.5">
          {/* 1. 视图模式切换胶囊 */}
          <div className="flex items-center bg-neutral-100 p-0.5 rounded-full border border-neutral-200 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`h-7 px-2.5 rounded-full text-xs flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap shrink-0 ${
                viewMode === 'grid'
                  ? 'bg-neutral-900 text-white font-bold shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 font-medium'
              }`}
            >
              <LayoutGrid className="w-3 h-3 shrink-0" />
              <span className="whitespace-nowrap">按单 ({filteredTickets.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('batch')}
              className={`h-7 px-2.5 rounded-full text-xs flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap shrink-0 ${
                viewMode === 'batch'
                  ? 'bg-neutral-900 text-white font-bold shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 font-medium'
              }`}
            >
              <Layers className="w-3 h-3 shrink-0" />
              <span className="whitespace-nowrap">汇总 ({Object.keys(dishAggregates).length}种)</span>
            </button>
          </div>

          {/* 2. 美化制作渠道下拉菜单 (Custom Beautiful Channel Popover Trigger) */}
          <div className="shrink-0">
            <button
              type="button"
              id="mobile-kds-channel-trigger"
              onClick={(e) => {
                if (isMobileChannelOpen) {
                  setIsMobileChannelOpen(false);
                } else {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setChannelDropdownCoords({
                    top: rect.bottom + 6,
                    left: Math.max(8, Math.min(rect.left, window.innerWidth - 210)),
                  });
                  setIsMobileChannelOpen(true);
                }
              }}
              className="h-8 px-2.5 bg-white hover:bg-neutral-50 text-neutral-900 border border-neutral-200 hover:border-neutral-900 rounded-full text-xs font-bold flex items-center gap-1.5 shrink-0 whitespace-nowrap shadow-2xs active:scale-95 transition-all cursor-pointer"
            >
              <span className="text-neutral-500 font-normal">渠道:</span>
              <span className="whitespace-nowrap">{currentKdsChannel.label}</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-neutral-100 text-neutral-700">
                {currentKdsChannel.count}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${isMobileChannelOpen ? 'rotate-180 text-neutral-900' : ''}`} />
            </button>
          </div>

          {/* 3. 出餐自动叫号开关胶囊 */}
          <button
            type="button"
            onClick={toggleAutoVoice}
            className={`h-8 px-2.5 text-xs font-bold flex items-center gap-1.5 transition-colors border rounded-full cursor-pointer whitespace-nowrap shrink-0 shadow-2xs ${
              autoVoiceBroadcast
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-white hover:bg-neutral-50 text-neutral-600 border-neutral-200'
            }`}
            title="出餐完成时是否自动触发语音外放广播叫号"
          >
            <Volume2 className={`w-3.5 h-3.5 ${autoVoiceBroadcast ? 'text-emerald-700' : 'text-neutral-400'} shrink-0`} />
            <span className="whitespace-nowrap">叫号: {autoVoiceBroadcast ? '开' : '关'}</span>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${autoVoiceBroadcast ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-300'}`} />
          </button>

          {/* 4. SLA 顺畅/高峰/超时微型指示胶囊 */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="flex items-center gap-1 text-[11px] text-emerald-800 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200 font-bold whitespace-nowrap shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="whitespace-nowrap">&lt;8m 顺畅</span>
            </span>
            <span className="flex items-center gap-1 text-[11px] text-amber-800 bg-amber-50 px-2 py-1 rounded-full border border-amber-200 font-bold whitespace-nowrap shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              <span className="whitespace-nowrap">8~15m 高峰</span>
            </span>
            <span className="flex items-center gap-1 text-[11px] text-rose-800 bg-rose-50 px-2 py-1 rounded-full border border-rose-200 font-bold whitespace-nowrap shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse shrink-0" />
              <span className="whitespace-nowrap">&gt;15m 超时</span>
            </span>
          </div>
        </div>
      </div>

      {/* 手机端全局悬浮菜单 (使用 Portal 挂载到 body，彻底规避 overflow-x-auto 剪裁遮挡) */}
      {typeof document !== 'undefined' && isMobileChannelOpen && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998] bg-black/25 backdrop-blur-[0.5px]"
            onClick={() => setIsMobileChannelOpen(false)}
          />
          <div
            className="fixed z-[9999] w-48 bg-white border border-neutral-200 rounded-xl shadow-2xl p-1.5 animate-in fade-in zoom-in-95 duration-150 space-y-0.5 max-h-[80vh] overflow-y-auto"
            style={{
              top: `${channelDropdownCoords.top}px`,
              left: `${channelDropdownCoords.left}px`,
            }}
          >
            <div className="px-2.5 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-100 mb-1">
              选择制作渠道
            </div>
            {kdsChannelOptions.map((opt) => {
              const isSelected = filterType === opt.key;
              const IconComp = opt.icon;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    setFilterType(opt.key);
                    setIsMobileChannelOpen(false);
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-between transition-colors cursor-pointer text-left ${
                    isSelected ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <IconComp className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-neutral-500'}`} />
                    <span className="whitespace-nowrap">{opt.label}</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-600'}`}>
                      {opt.count}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
        </>,
        document.body
      )}

      {/* 桌面端大屏控制条 (Desktop Deck Style) */}
      <div className="hidden sm:flex bg-white p-3 rounded-lg border border-neutral-200 items-center justify-between gap-3 flex-wrap shadow-2xs">
        {/* Left: View Mode Toggle & Channels */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* View Mode Pills */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5 cursor-pointer transition-all border whitespace-nowrap shrink-0 ${
                viewMode === 'grid'
                  ? 'bg-neutral-900 text-white border-neutral-900 font-bold shadow-xs'
                  : 'bg-white text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 border-neutral-200 font-medium'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">按单看板 ({filteredTickets.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('batch')}
              className={`px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5 cursor-pointer transition-all border whitespace-nowrap shrink-0 ${
                viewMode === 'batch'
                  ? 'bg-neutral-900 text-white border-neutral-900 font-bold shadow-xs'
                  : 'bg-white text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 border-neutral-200 font-medium'
              }`}
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">菜品汇总 ({Object.keys(dishAggregates).length}种)</span>
            </button>
          </div>

          <div className="h-4 w-[1px] bg-neutral-200 block" />

          {/* 桌面端分流渠道平铺标签 */}
          <div className="inline-flex p-1 bg-neutral-100 rounded-lg border border-neutral-200 gap-1 shrink-0">
            {kdsChannelOptions.map((opt) => {
              const isSelected = filterType === opt.key;
              const IconComp = opt.icon;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setFilterType(opt.key)}
                  className={`px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap shrink-0 ${
                    isSelected
                      ? 'bg-white text-neutral-900 font-bold shadow-xs border border-neutral-200/80'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60 font-medium border border-transparent'
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                  <span className="whitespace-nowrap">{opt.label}</span>
                  <span className={`text-[11px] px-1.5 py-0.2 rounded font-mono font-bold shrink-0 ${
                    isSelected ? 'bg-neutral-900 text-white' : 'bg-neutral-200/70 text-neutral-600'
                  }`}>
                    {opt.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: SLA Legends & Voice Auto Broadcast Toggle */}
        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          {/* Auto voice broadcast toggle */}
          <button
            type="button"
            onClick={toggleAutoVoice}
            className={`px-3 py-1.5 rounded-md font-bold text-xs border flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs whitespace-nowrap shrink-0 ${
              autoVoiceBroadcast
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
            }`}
            title="出餐完成时是否自动触发语音外放广播叫号"
          >
            <Volume2 className={`w-3.5 h-3.5 ${autoVoiceBroadcast ? 'text-emerald-700' : 'text-neutral-500'} shrink-0`} />
            <span className="whitespace-nowrap">{autoVoiceBroadcast ? '出餐自动叫号: 开' : '出餐自动叫号: 关'}</span>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${autoVoiceBroadcast ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'}`} />
          </button>

          <div className="h-4 w-[1px] bg-neutral-200 block shrink-0" />

          <div className="flex items-center gap-2 text-xs select-none shrink-0">
            <span className="flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 font-bold whitespace-nowrap shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="whitespace-nowrap">&lt;8m 顺畅</span>
            </span>
            <span className="flex items-center gap-1 text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200 font-bold whitespace-nowrap shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              <span className="whitespace-nowrap">8~15m 高峰</span>
            </span>
            <span className="flex items-center gap-1 text-rose-800 bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-200 font-bold whitespace-nowrap shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping shrink-0" />
              <span className="whitespace-nowrap">&gt;15m 超时</span>
            </span>
          </div>
        </div>
      </div>

      {/* 1. Grid View (Ticket-by-Ticket) */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence>
            {filteredTickets.map((ticket) => {
              const isOvertime = ticket.elapsedMinutes > 15;
              const isWarning = ticket.elapsedMinutes >= 8 && ticket.elapsedMinutes <= 15;
              const isUrged = !!ticket.isUrged;
              const allItemsCompleted = ticket.items.every((it) => it.isCompleted);
              const isDineIn = ticket.channelType === 'dine_in';
              const isPickup = ticket.channelType === 'pickup';
              const isDelivery = ticket.channelType === 'delivery';

              let headerBg = 'bg-neutral-50/70 text-neutral-900 border-b border-neutral-200';
              let timerBadge = 'bg-white text-neutral-700 border-neutral-200 font-bold';

              if (isUrged) {
                headerBg = 'bg-rose-50 text-rose-900 border-b border-rose-200';
                timerBadge = 'bg-rose-600 text-white font-bold animate-bounce shadow-2xs border-rose-600';
              } else if (isOvertime) {
                headerBg = 'bg-rose-50/70 text-rose-900 border-b border-rose-200';
                timerBadge = 'bg-rose-600 text-white font-bold animate-pulse shadow-2xs border-rose-600';
              } else if (isWarning) {
                headerBg = 'bg-amber-50/70 text-amber-900 border-b border-amber-200';
                timerBadge = 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
              }

              const cardBorderClass = isUrged
                ? 'border-rose-400 ring-2 ring-rose-200'
                : isOvertime
                ? 'border-rose-300'
                : isWarning
                ? 'border-amber-300'
                : 'border-neutral-200 hover:border-neutral-400';

              return (
                <motion.div
                  key={ticket.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85, y: -20 }}
                  transition={{ duration: 0.25 }}
                  className={`bg-white rounded-lg border ${cardBorderClass} flex flex-col justify-between overflow-hidden shadow-2xs transition-all`}
                >
                  {/* Ticket Top */}
                  <div>
                    <div className={`p-3 flex items-center justify-between gap-2 ${headerBg}`}>
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
                        <span className="font-mono font-black text-xs bg-neutral-900 text-white px-2 py-0.5 rounded-md shadow-2xs whitespace-nowrap shrink-0">
                          {ticket.ticketNo}
                        </span>

                        {isDineIn ? (
                          <span className="font-bold text-xs bg-neutral-100 text-neutral-900 border border-neutral-300 px-2 py-0.5 rounded-md shadow-2xs flex items-center gap-1.5 whitespace-nowrap shrink-0">
                            <Utensils className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                            <span>{ticket.tableOrChannel || '堂食'}</span>
                          </span>
                        ) : isPickup ? (
                          <span className="font-bold text-xs bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md shadow-2xs flex items-center gap-1.5 whitespace-nowrap shrink-0">
                            <ShoppingBag className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                            <span>自提 #{getOrGeneratePickupCode(ticket.ticketNo, ticket.pickupCode)}</span>
                          </span>
                        ) : (
                          <span className="font-bold text-xs bg-emerald-50 text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded-md shadow-2xs flex items-center gap-1.5 whitespace-nowrap shrink-0">
                            <Bike className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <span>
                              专送
                              {(() => {
                                const clean = (ticket.tableOrChannel || '')
                                  .replace(new RegExp(ticket.ticketNo, 'g'), '')
                                  .replace(/#[A-Za-z0-9-]+/g, '')
                                  .replace(/^外卖专送/, '')
                                  .trim()
                                  .replace(/^[·\s]+/, '');
                                return clean ? ` · ${clean}` : ' · GPS';
                              })()}
                            </span>
                          </span>
                        )}

                        {isUrged && (
                          <span className="whitespace-nowrap shrink-0">
                            <UiverseFlameTag label="加急催单" count={ticket.urgeCount} />
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setActiveChatTicketNo(ticket.ticketNo)}
                          className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors cursor-pointer border border-transparent hover:border-neutral-200 shrink-0"
                          title="打开在线联络气泡"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteTargetTicket(ticket);
                            setDeleteReason('顾客撤单/退款作废');
                            setAlsoDeleteOrder(true);
                          }}
                          className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer border border-transparent hover:border-rose-200 shrink-0"
                          title="作废删除此后厨工单"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <span className={`text-[11px] font-mono px-2 py-0.5 rounded-md border font-bold whitespace-nowrap shrink-0 ${timerBadge}`}>
                          已下单 {ticket.elapsedMinutes}m
                        </span>
                      </div>
                    </div>

                    {/* Items List for Scratching / Completing */}
                    <div className="p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] text-neutral-500 font-medium whitespace-nowrap">点击菜品划菜 · 制作流转时间线:</p>
                      </div>
                      <div className="space-y-2">
                        {ticket.items.map((it) => {
                          const timelineData = getItemTimelineNodes(ticket, it);
                          const isTimelineOpen = !!expandedDishTimelines[`${ticket.id}_${it.id}`];

                          return (
                            <div
                              key={it.id}
                              className={`rounded-md border transition-all overflow-hidden ${
                                it.isCompleted
                                  ? 'bg-neutral-50 border-neutral-200'
                                  : 'bg-white border-neutral-200 hover:border-neutral-400 shadow-2xs'
                              }`}
                            >
                              {/* Dish Main Row */}
                              <div className="p-2.5 flex items-start justify-between gap-2.5">
                                <div
                                  onClick={() => {
                                    onToggleItemComplete(ticket.id, it.id);
                                    // 联动事务：划菜时同步桌台菜品状态
                                    if (!it.isCompleted) {
                                      businessTransactionEngine.executeKdsDishStatusSync({
                                        ticketId: ticket.id,
                                        dishName: it.dishName,
                                        isAllCompleted: false
                                      });
                                    }
                                  }}
                                  className="space-y-1 min-w-0 flex-1 cursor-pointer select-none"
                                >
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`font-bold text-xs ${it.isCompleted ? 'text-neutral-400 line-through font-normal' : 'text-neutral-900'}`}>
                                      {it.dishName}
                                    </span>
                                    {it.options && (
                                      <span className="text-[11px] text-neutral-500 font-normal truncate">
                                        ({it.options})
                                      </span>
                                    )}
                                  </div>
                                  {it.notes && (
                                    <span className="text-[11px] text-amber-700 font-medium block">
                                      ★ 备注: {it.notes}
                                    </span>
                                  )}

                                  {/* Quick summary timing badge - 保证时间戳与出餐耗时胶囊整体单行不折断 */}
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5 text-[11px] font-mono text-neutral-500 font-normal">
                                    <span className="whitespace-nowrap shrink-0">下单: {timelineData.orderedAt}</span>
                                    {it.isCompleted ? (
                                      <span className="text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 whitespace-nowrap shrink-0 inline-flex items-center">
                                        出餐: {timelineData.servedAt} ({timelineData.totalDurationText})
                                      </span>
                                    ) : (
                                      <span className="text-amber-800 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-0.5 whitespace-nowrap shrink-0">
                                        <Flame className="w-2.5 h-2.5 text-amber-600 animate-pulse shrink-0" />
                                        <span className="whitespace-nowrap shrink-0">烹饪中 ({ticket.elapsedMinutes}m)</span>
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {/* Timeline expand toggle button */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleDishTimeline(ticket.id, it.id);
                                    }}
                                    className="p-1.5 hover:bg-neutral-100 rounded-md text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer border border-neutral-200 bg-white shrink-0"
                                    title={isTimelineOpen ? '收起时间线' : '展开从下单到出餐精确时间线'}
                                  >
                                    <Timer className="w-3.5 h-3.5 text-neutral-700" />
                                  </button>

                                  <div
                                    onClick={() => onToggleItemComplete(ticket.id, it.id)}
                                    className="flex items-center gap-1.5 cursor-pointer shrink-0"
                                  >
                                    <span className="font-mono font-black text-xs bg-neutral-100 text-neutral-900 px-2 py-0.5 rounded-md border border-neutral-200 whitespace-nowrap shrink-0">
                                      x{it.quantity}
                                    </span>
                                    {it.isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                                  </div>
                                </div>
                              </div>

                              {/* Collapsible Precision Timeline (精确到每个菜品的时间线) */}
                              {isTimelineOpen && (
                                <div className="p-3 bg-neutral-50 border-t border-neutral-200 space-y-2 text-xs animate-in fade-in duration-150">
                                  <div className="flex items-center justify-between border-b border-neutral-200 pb-1.5">
                                    <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                                      <Timer className="w-3.5 h-3.5 text-neutral-700" />
                                      <span>【{it.dishName}】制作流转时间线</span>
                                    </span>
                                    {it.isCompleted && (
                                      <span className="font-mono font-bold text-emerald-800 text-[11px]">
                                        {timelineData.totalDurationText}
                                      </span>
                                    )}
                                  </div>

                                  <div className="space-y-2 pt-1 pl-1">
                                    {timelineData.nodes.map((node, nIdx) => (
                                      <div key={nIdx} className="flex items-start gap-2 relative">
                                        {/* Timeline line connector */}
                                        {nIdx < timelineData.nodes.length - 1 && (
                                          <div
                                            className={`absolute left-[7px] top-[14px] bottom-[-8px] w-[1.5px] ${
                                              node.status === 'completed' ? 'bg-emerald-500' : 'bg-neutral-200'
                                            }`}
                                          />
                                        )}

                                        {/* Status Dot */}
                                        <div className="mt-0.5 shrink-0 z-10">
                                          {node.status === 'completed' ? (
                                            <div className="w-3.5 h-3.5 rounded bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                                            </div>
                                          ) : node.status === 'current' ? (
                                            <div className="w-3.5 h-3.5 rounded bg-amber-500 text-white flex items-center justify-center shadow-2xs animate-pulse">
                                              <Flame className="w-2.5 h-2.5" />
                                            </div>
                                          ) : (
                                            <div className="w-3.5 h-3.5 rounded bg-neutral-200 text-neutral-500 flex items-center justify-center">
                                              <CircleDot className="w-2.5 h-2.5" />
                                            </div>
                                          )}
                                        </div>

                                        {/* Node Details */}
                                        <div className="flex-1 leading-tight">
                                          <div className="flex items-center justify-between font-normal">
                                            <span className={`text-xs ${node.status === 'completed' ? 'text-neutral-900 font-bold' : node.status === 'current' ? 'text-amber-800 font-bold' : 'text-neutral-400'}`}>
                                              {node.label}
                                            </span>
                                            <span className="font-mono text-[11px] text-neutral-500">
                                              {node.timestamp}
                                            </span>
                                          </div>
                                          <div className="text-[11px] text-neutral-500 flex items-center justify-between mt-0.5 font-mono">
                                            <span>责任岗: {node.operator}</span>
                                            <span className="text-[10px] text-neutral-400 italic">{node.note}</span>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Ticket Footer Action */}
                  <div className="p-2.5 bg-white border-t border-neutral-200 flex flex-wrap sm:flex-nowrap items-center gap-2">
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Manual broadcast button */}
                      <button
                        type="button"
                        onClick={() => handleManualCallOnly(ticket)}
                        className="py-2 px-2.5 bg-white hover:bg-neutral-50 text-neutral-900 rounded-md font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors border border-neutral-200 shadow-2xs leading-none whitespace-nowrap shrink-0"
                        title="随时外放广播叫号 (自提顾客/外卖骑手/堂食传菜)"
                      >
                        <Megaphone className="w-3.5 h-3.5 text-neutral-700 shrink-0" />
                        <span className="whitespace-nowrap">叫号</span>
                      </button>

                      {/* Discard / Delete ticket */}
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteTargetTicket(ticket);
                          setDeleteReason('顾客撤单/退款作废');
                          setAlsoDeleteOrder(true);
                        }}
                        className="py-2 px-2.5 bg-white hover:bg-rose-50 text-neutral-500 hover:text-rose-600 rounded-md font-medium text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors border border-neutral-200 shadow-2xs leading-none whitespace-nowrap shrink-0"
                        title="撤单作废此后厨工单"
                      >
                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="whitespace-nowrap">作废</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
                      {/* Finish Ticket & Force Voice Call (Tactile style) */}
                      <button
                        type="button"
                        onClick={() => handleFinishAndCall(ticket, true)}
                        className={`flex-1 py-2 px-2.5 sm:px-3 rounded-md font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs leading-none whitespace-nowrap ${
                          allItemsCompleted
                            ? 'bg-neutral-900 hover:bg-black text-white'
                            : 'bg-neutral-800 hover:bg-neutral-900 text-white'
                        }`}
                        title="完成此单后厨制作，并立即触发外放语音叫号"
                      >
                        <ChefHat className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        <span className="whitespace-nowrap">出餐并叫号</span>
                      </button>

                      {/* Silent Finish (Small button for quiet completion) */}
                      <button
                        type="button"
                        onClick={() => handleFinishAndCall(ticket, false)}
                        className="py-2 px-2.5 bg-white hover:bg-neutral-50 text-neutral-800 rounded-md font-bold text-xs cursor-pointer transition-colors border border-neutral-200 shrink-0 shadow-2xs leading-none whitespace-nowrap"
                        title="静音标记出餐完成 (不外放广播)"
                      >
                        <span className="whitespace-nowrap">仅出餐</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* 2. Batch Dish View (Flip fry & prep together) */}
      {viewMode === 'batch' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(dishAggregates).map(([dishName, data]) => (
            <div
              key={dishName}
              className="bg-white rounded-lg border border-neutral-200 p-4 space-y-3.5 shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 border-b border-neutral-200 pb-2.5">
                  <div>
                    <h4 className="font-bold text-sm text-neutral-900">{dishName}</h4>
                    <span className="text-[11px] text-neutral-500 font-normal">跨单批量翻炒制作</span>
                  </div>
                  <span className="font-mono font-black text-sm bg-neutral-900 text-white px-2.5 py-1 rounded-md shadow-2xs whitespace-nowrap shrink-0">
                    共需 {data.totalQty} 份
                  </span>
                </div>

                {/* Distribution list */}
                <div className="pt-2.5 space-y-1.5">
                  <span className="text-[11px] text-neutral-500 font-medium block whitespace-nowrap">分布订单与桌位:</span>
                  <div className="space-y-1.5">
                    {data.ticketDetails.map((td, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-neutral-50 p-2 rounded-md border border-neutral-200 text-xs">
                        <span className="font-mono font-bold text-neutral-900 truncate mr-2">{td.ticketNo} · {td.table}</span>
                        <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                          <span className="font-mono font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-xs whitespace-nowrap shrink-0">x{td.qty}份</span>
                          <button
                            type="button"
                            onClick={() => {
                              const fullTicket = tickets.find(t => t.ticketNo === td.ticketNo);
                              if (fullTicket) {
                                setDeleteTargetTicket(fullTicket);
                                setDeleteReason('顾客撤单/退款作废');
                                setAlsoDeleteOrder(true);
                              }
                            }}
                            className="p-1 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer shrink-0"
                            title="作废删除此工单"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {data.specialNotes.length > 0 && (
                    <div className="bg-amber-50/70 p-2.5 rounded-md border border-amber-200 text-xs text-amber-900 space-y-0.5">
                      <span className="font-bold whitespace-nowrap">特殊要求汇总:</span>
                      {data.specialNotes.map((note, nIdx) => (
                        <p key={nIdx}>• {note}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onBatchFinishDish(dishName);
                    showToast(`已批量划菜出锅【${dishName}】共 ${data.totalQty} 份！`);
                  }}
                  className="flex-1 py-2 bg-neutral-900 hover:bg-black text-white rounded-md font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs leading-none whitespace-nowrap"
                  title="仅标记出锅划菜"
                >
                  <Flame className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span className="whitespace-nowrap">出锅划菜 ({data.totalQty}份)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onBatchFinishDish(dishName);
                    voiceAlerts.speakText(`叮咚！后厨【${dishName}】共 ${data.totalQty} 份现制出锅，请前台与传菜员注意分单上菜取餐！`, { chimeType: 'order' });
                    showToast(`已出锅并广播通知传菜与前台：【${dishName}】共 ${data.totalQty} 份！`);
                  }}
                  className="px-3.5 py-2 bg-white hover:bg-neutral-50 text-neutral-900 border border-neutral-200 rounded-md font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs leading-none whitespace-nowrap shrink-0"
                  title="出锅划菜并立即全域语音外放广播"
                >
                  <Megaphone className="w-3.5 h-3.5 text-neutral-700 shrink-0" />
                  <span className="whitespace-nowrap">出锅并广播</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* KDS Instant Chat Bubble Modal */}
      {activeChatTicketNo && (
        <UnifiedOmniChatModal
          isOpen={!!activeChatTicketNo}
          onClose={() => setActiveChatTicketNo(null)}
          orderNo={activeChatTicketNo}
          viewerRole="merchant"
          showToast={showToast}
        />
      )}

      {/* KDS Delete Ticket Modal */}
      {deleteTargetTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-md rounded-lg border border-neutral-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-3.5 bg-neutral-900 text-white flex items-center justify-between">
              <span className="font-bold text-xs flex items-center gap-1.5 font-mono">
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>后厨工单撤单作废</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setDeleteTargetTicket(null);
                  setCustomDeleteReason('');
                }}
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3.5 text-xs">
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 space-y-1 rounded-md">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>后厨排产撤单确认</span>
                </div>
                <p className="text-[11px] text-rose-700 leading-relaxed font-normal">
                  作废后该工单将立即从后厨出餐大屏与批次翻炒任务中移除，后厨厨师无需继续制作。
                </p>
              </div>

              {/* Ticket details */}
              <div className="bg-white p-3 border border-neutral-200 rounded-md space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-neutral-900 text-sm">
                    {deleteTargetTicket.ticketNo}
                  </span>
                  <span className="text-[11px] font-normal text-neutral-500">
                    已下单 {deleteTargetTicket.elapsedMinutes} 分钟 · {deleteTargetTicket.orderTime}
                  </span>
                </div>

                <div className="text-xs text-neutral-700 pt-1 border-t border-dashed border-neutral-200">
                  餐台/渠道: <strong className="text-neutral-900 font-bold">{deleteTargetTicket.tableOrChannel}</strong>
                </div>

                <div className="space-y-1 pt-1">
                  <span className="text-[11px] text-neutral-500 font-medium block">待制菜品:</span>
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {deleteTargetTicket.items.map((it) => (
                      <div key={it.id} className="flex justify-between text-xs bg-neutral-50 p-2 border border-neutral-200 rounded-md">
                        <span className={it.isCompleted ? 'line-through text-neutral-400 font-normal' : 'text-neutral-800 font-medium'}>
                          {it.dishName}
                        </span>
                        <span className="font-mono font-bold text-neutral-900">x{it.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <label className="font-bold text-neutral-800 block">选择作废原因:</label>
                <select
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full p-2 bg-white border border-neutral-200 rounded-md focus:outline-none focus:border-neutral-900 text-xs font-normal"
                >
                  <option value="顾客要求撤单退款">顾客要求撤单退款</option>
                  <option value="前台通知改单/重新下单">前台通知改单 / 重新下单</option>
                  <option value="档口食材临时报损售罄">档口食材临时报损售罄</option>
                  <option value="错误重复录入工单">错误重复录入工单</option>
                  <option value="顾客已超时离场/弃单">顾客已超时离场 / 弃单</option>
                  <option value="other">其他原因 (自定义填写)</option>
                </select>

                {deleteReason === 'other' && (
                  <input
                    type="text"
                    value={customDeleteReason}
                    onChange={(e) => setCustomDeleteReason(e.target.value)}
                    placeholder="请输入具体的作废原因说明..."
                    className="w-full p-2 mt-1.5 bg-white border border-neutral-200 rounded-md focus:outline-none focus:border-neutral-900 text-xs"
                    autoFocus
                  />
                )}
              </div>

              {/* Also delete order checkbox */}
              <label className="flex items-center gap-2 text-neutral-700 cursor-pointer select-none text-[11px] pt-1">
                <input
                  type="checkbox"
                  checked={alsoDeleteOrder}
                  onChange={(e) => setAlsoDeleteOrder(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-0"
                />
                <span className="font-medium text-neutral-800">同步在全渠道订单中心彻底删除该笔订单（连带作废）</span>
              </label>
            </div>

            {/* Footer */}
            <div className="p-3 bg-neutral-50 border-t border-neutral-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteTargetTicket(null);
                  setCustomDeleteReason('');
                }}
                className="px-3.5 py-1.5 bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200 rounded-md font-medium cursor-pointer text-xs shadow-2xs"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTicket}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md font-bold cursor-pointer text-xs flex items-center gap-1.5 shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>确认删除工单</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 右侧折叠内嵌式账号操作对比与数据兜底组件 */}
      <AccountAuditDrawer
        currentModule="kds"
        title="后厨工单操作审计与版本恢复"
        showToast={showToast}
      />
    </div>
  );
};
