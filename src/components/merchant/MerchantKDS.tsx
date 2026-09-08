import React, { useState } from 'react';
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
  CircleDot
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { KdsTicket, KdsTicketItem } from '../../types';
import { UnifiedOmniChatModal } from '../chat/UnifiedOmniChatModal';
import { getOrGeneratePickupCode, getPickupShelfCode } from '../../utils/pickupCodeEngine';
import { voiceAlerts, unlockAudioContext } from '../../utils/voiceAlertEngine';
import { AccountAuditDrawer } from './AccountAuditDrawer';
import { businessTransactionEngine } from '../../utils/businessTransactionEngine';

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
  const [filterType, setFilterType] = useState<'all' | 'dine_in' | 'delivery'>('all');
  const [activeChatTicketNo, setActiveChatTicketNo] = useState<string | null>(null);

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
      totalDurationText = `耗时 ${cookMin}分28秒`;
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

  return (
    <div className="space-y-3.5 text-xs">
      {/* Control Bar: View Switcher & SLA Legend */}
      <div className="bg-white p-3 rounded-[3px] border border-[#e6e6e4] flex items-center justify-between gap-3 flex-wrap shadow-2xs">
        {/* Left: View Mode Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex bg-[#f1f1ef] p-0.5 rounded-[3px] border border-[#e6e6e4]">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded-[2px] font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-[#37352f] shadow-xs'
                  : 'text-[#787774] hover:text-black'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>按单看板 ({filteredTickets.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('batch')}
              className={`px-3 py-1 rounded-[2px] font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-all ${
                viewMode === 'batch'
                  ? 'bg-white text-[#37352f] shadow-xs'
                  : 'text-[#787774] hover:text-black'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>菜品批量汇总 ({Object.keys(dishAggregates).length}种)</span>
            </button>
          </div>

          {/* Filter Type */}
          <div className="flex items-center gap-1">
            {[
              { id: 'all', label: '全部待做' },
              { id: 'dine_in', label: '堂食外摆' },
              { id: 'delivery', label: '外卖专送' }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterType(f.id as any)}
                className={`px-2.5 py-1 rounded-[3px] text-xs font-semibold cursor-pointer ${
                  filterType === f.id
                    ? 'bg-[#37352f] text-white'
                    : 'bg-[#f1f1ef] text-[#5a5854] hover:bg-[#e8e8e6]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* SLA Legends & Voice Auto Broadcast Toggle */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Auto voice broadcast toggle */}
          <button
            type="button"
            onClick={toggleAutoVoice}
            className={`px-2.5 py-1 rounded-[3px] font-semibold text-xs border flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs ${
              autoVoiceBroadcast
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                : 'bg-neutral-100 text-neutral-600 border-neutral-300 hover:bg-neutral-200'
            }`}
            title="出餐完成时是否自动触发语音外放广播叫号"
          >
            <Volume2 className={`w-3.5 h-3.5 ${autoVoiceBroadcast ? 'text-emerald-700' : 'text-neutral-500'}`} />
            <span>{autoVoiceBroadcast ? '出餐自动外放叫号: 开' : '出餐自动叫号: 关'}</span>
            <span className={`w-1.5 h-1.5 rounded-full ${autoVoiceBroadcast ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'}`} />
          </button>

          <div className="h-4 w-[1px] bg-[#e6e6e4] hidden sm:block" />

          <div className="flex items-center gap-3 text-[11px] text-[#787774]">
            <span className="flex items-center gap-1 text-[#2b593f]">
              <span className="w-2 h-2 rounded-full bg-[#4dab63]" />
              <span>&lt;8m 顺畅</span>
            </span>
            <span className="flex items-center gap-1 text-[#8f6412]">
              <span className="w-2 h-2 rounded-full bg-[#d9730d]" />
              <span>8~15m 高峰</span>
            </span>
            <span className="flex items-center gap-1 text-[#eb5757]">
              <span className="w-2 h-2 rounded-full bg-[#eb5757] animate-ping" />
              <span>&gt;15m 超时</span>
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

              let headerBg = 'bg-[#f7f7f5] text-[#37352f]';
              let timerBadge = 'bg-[#edf3ec] text-[#2b593f] border-[#c4dcbc]';

              if (isUrged) {
                headerBg = 'bg-rose-50 text-rose-800 border-b border-rose-200';
                timerBadge = 'bg-rose-600 text-white animate-bounce font-bold';
              } else if (isOvertime) {
                headerBg = 'bg-[#fbe4e4] text-[#eb5757]';
                timerBadge = 'bg-[#eb5757] text-white animate-pulse';
              } else if (isWarning) {
                headerBg = 'bg-[#fbf3db] text-[#8f6412]';
                timerBadge = 'bg-[#fbf3db] text-[#8f6412] border-[#ecd9a8]';
              }

              return (
                <motion.div
                  key={ticket.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85, y: -20 }}
                  transition={{ duration: 0.25 }}
                  className={`bg-white rounded-[3px] border ${
                    isUrged
                      ? 'border-rose-500 shadow-md ring-2 ring-rose-300/60'
                      : isOvertime
                      ? 'border-[#eb5757] shadow-xs'
                      : 'border-[#e6e6e4]'
                  } flex flex-col justify-between overflow-hidden shadow-2xs`}
                >
                  {/* Ticket Top */}
                  <div>
                    <div className={`p-2.5 flex items-center justify-between border-b border-[#e6e6e4] ${headerBg}`}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs bg-[#37352f] text-white px-1.5 py-0.2 rounded-[2px]">
                          {ticket.ticketNo}
                        </span>
                        <span className="font-bold text-xs">{ticket.tableOrChannel}</span>
                        {isUrged && (
                          <span className="text-[10px] font-bold bg-rose-600 text-white px-1.5 py-0.2 rounded flex items-center gap-0.5 animate-pulse shadow-2xs">
                            <Flame className="w-2.5 h-2.5 fill-current" />
                            <span>加急催单 {ticket.urgeCount ? `x${ticket.urgeCount}` : ''}</span>
                          </span>
                        )}
                        {/* 取件码 */}
                        <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded flex items-center gap-0.5 shadow-2xs">
                          <KeyRound className="w-2.5 h-2.5 text-amber-600" />
                          <span>码: {getOrGeneratePickupCode(ticket.ticketNo, ticket.pickupCode)}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setActiveChatTicketNo(ticket.ticketNo)}
                          className="p-1 text-[#5a5854] hover:text-[#2b593f] hover:bg-white/80 rounded transition-colors cursor-pointer"
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
                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="作废删除此后厨工单"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-[2px] border ${timerBadge}`}>
                          已下单 {ticket.elapsedMinutes}m
                        </span>
                      </div>
                    </div>

                    {/* Items List for Scratching / Completing */}
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-[#787774] font-semibold">点击菜品划菜 · 支持查看菜品全流程时间线:</p>
                      </div>
                      <div className="space-y-2">
                        {ticket.items.map((it) => {
                          const timelineData = getItemTimelineNodes(ticket, it);
                          const isTimelineOpen = !!expandedDishTimelines[`${ticket.id}_${it.id}`];

                          return (
                            <div
                              key={it.id}
                              className={`rounded-[3px] border transition-all overflow-hidden ${
                                it.isCompleted
                                  ? 'bg-[#edf3ec]/60 border-[#c4dcbc]'
                                  : 'bg-[#fbfbfa] border-[#e6e6e4] hover:border-slate-400'
                              }`}
                            >
                              {/* Dish Main Row */}
                              <div className="p-2 flex items-start justify-between gap-2">
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
                                  className="space-y-0.5 min-w-0 flex-1 cursor-pointer select-none"
                                >
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`font-bold text-xs ${it.isCompleted ? 'text-[#787774] line-through' : 'text-[#37352f]'}`}>
                                      {it.dishName}
                                    </span>
                                    {it.options && (
                                      <span className="text-[10px] text-[#787774] truncate">
                                        ({it.options})
                                      </span>
                                    )}
                                  </div>
                                  {it.notes && (
                                    <span className="text-[10px] text-[#d9730d] font-bold block">
                                      ★ 备注: {it.notes}
                                    </span>
                                  )}

                                  {/* Quick summary timing badge */}
                                  <div className="flex items-center gap-2 pt-0.5 text-[10px] font-mono text-slate-500">
                                    <span>下单: {timelineData.orderedAt}</span>
                                    {it.isCompleted ? (
                                      <span className="text-emerald-700 font-bold bg-emerald-100/80 px-1 py-0.2 rounded border border-emerald-300">
                                        出餐: {timelineData.servedAt} ({timelineData.totalDurationText})
                                      </span>
                                    ) : (
                                      <span className="text-amber-700 font-semibold bg-amber-50 px-1 py-0.2 rounded border border-amber-200 flex items-center gap-0.5">
                                        <Flame className="w-2.5 h-2.5 text-amber-600 animate-pulse" />
                                        <span>烹饪中 ({ticket.elapsedMinutes}m)</span>
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
                                    className="p-1 hover:bg-slate-200/70 rounded text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                                    title={isTimelineOpen ? '收起时间线' : '展开从下单到出餐精确时间线'}
                                  >
                                    <Timer className="w-3.5 h-3.5 text-indigo-600" />
                                  </button>

                                  <div
                                    onClick={() => onToggleItemComplete(ticket.id, it.id)}
                                    className="flex items-center gap-1 cursor-pointer"
                                  >
                                    <span className="font-mono font-bold text-xs bg-white px-1.5 py-0.5 rounded border border-[#d3d1cb]">
                                      x{it.quantity}
                                    </span>
                                    {it.isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-[#4dab63]" />}
                                  </div>
                                </div>
                              </div>

                              {/* Collapsible Precision Timeline (精确到每个菜品的时间线) */}
                              {isTimelineOpen && (
                                <div className="p-2.5 bg-white border-t border-slate-200 space-y-2 text-[11px] animate-in fade-in duration-150">
                                  <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                                    <span className="font-bold text-slate-800 flex items-center gap-1">
                                      <Timer className="w-3 h-3 text-indigo-600" />
                                      <span>【{it.dishName}】制作流转时间线 (精确到秒)</span>
                                    </span>
                                    {it.isCompleted && (
                                      <span className="font-mono font-bold text-emerald-700 text-[10px]">
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
                                              node.status === 'completed' ? 'bg-emerald-500' : 'bg-slate-200'
                                            }`}
                                          />
                                        )}

                                        {/* Status Dot */}
                                        <div className="mt-0.5 shrink-0 z-10">
                                          {node.status === 'completed' ? (
                                            <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                                            </div>
                                          ) : node.status === 'current' ? (
                                            <div className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-2xs animate-pulse">
                                              <Flame className="w-2.5 h-2.5" />
                                            </div>
                                          ) : (
                                            <div className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center">
                                              <CircleDot className="w-2.5 h-2.5" />
                                            </div>
                                          )}
                                        </div>

                                        {/* Node Details */}
                                        <div className="flex-1 leading-tight">
                                          <div className="flex items-center justify-between font-medium">
                                            <span className={`text-xs ${node.status === 'completed' ? 'text-slate-900 font-bold' : node.status === 'current' ? 'text-amber-800 font-bold' : 'text-slate-400'}`}>
                                              {node.label}
                                            </span>
                                            <span className="font-mono text-[10.5px] text-slate-500">
                                              {node.timestamp}
                                            </span>
                                          </div>
                                          <div className="text-[10.5px] text-slate-400 flex items-center justify-between mt-0.5 font-mono">
                                            <span>责任岗: {node.operator}</span>
                                            <span className="text-[10px] text-slate-500 italic">{node.note}</span>
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
                  <div className="p-2 bg-[#fbfbfa] border-t border-[#e6e6e4] flex flex-wrap sm:flex-nowrap items-center gap-1.5">
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Manual broadcast button */}
                      <button
                        type="button"
                        onClick={() => handleManualCallOnly(ticket)}
                        className="py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-[3px] font-semibold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors border border-amber-300 shadow-2xs"
                        title="随时外放广播叫号 (自提顾客/外卖骑手/堂食传菜)"
                      >
                        <Megaphone className="w-3.5 h-3.5 text-amber-700" />
                        <span>叫号</span>
                      </button>

                      {/* Discard / Delete ticket */}
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteTargetTicket(ticket);
                          setDeleteReason('顾客撤单/退款作废');
                          setAlsoDeleteOrder(true);
                        }}
                        className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-[3px] font-semibold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors border border-rose-300 shadow-2xs"
                        title="撤单作废此后厨工单"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>作废</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
                      {/* Finish Ticket & Force Voice Call */}
                      <button
                        type="button"
                        onClick={() => handleFinishAndCall(ticket, true)}
                        className={`flex-1 py-1.5 rounded-[3px] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs ${
                          allItemsCompleted
                            ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                            : 'bg-[#2b593f] hover:bg-[#204430] text-white'
                        }`}
                        title="完成此单后厨制作，并立即触发外放语音叫号"
                      >
                        <ChefHat className="w-3.5 h-3.5 text-[#fde047]" />
                        <span>出餐并叫号</span>
                      </button>

                      {/* Silent Finish (Small button for quiet completion) */}
                      <button
                        type="button"
                        onClick={() => handleFinishAndCall(ticket, false)}
                        className="py-1.5 px-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-[3px] font-medium text-[11px] cursor-pointer transition-colors border border-neutral-300 shrink-0"
                        title="静音标记出餐完成 (不外放广播)"
                      >
                        <span>仅出餐</span>
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
              className="bg-white rounded-[3px] border border-[#e6e6e4] p-3.5 space-y-3 shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 border-b border-[#efefed] pb-2">
                  <div>
                    <h4 className="font-bold text-sm text-[#37352f]">{dishName}</h4>
                    <span className="text-[10px] text-[#787774]">跨单批量翻炒制作</span>
                  </div>
                  <span className="font-mono font-bold text-sm bg-[#d9730d] text-white px-2 py-0.5 rounded-[2px]">
                    共需 {data.totalQty} 份
                  </span>
                </div>

                {/* Distribution list */}
                <div className="pt-2 space-y-1.5">
                  <span className="text-[10px] text-[#787774] font-semibold block">分布订单与桌位:</span>
                  <div className="space-y-1">
                    {data.ticketDetails.map((td, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-[#fbfbfa] p-1.5 rounded-[2px] border border-[#e6e6e4] text-[11px]">
                        <span className="font-mono text-[#37352f]">{td.ticketNo} · {td.table}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-[#d9730d]">x{td.qty}份</span>
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
                            className="p-0.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="作废删除此工单"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {data.specialNotes.length > 0 && (
                    <div className="bg-[#fbf3db] p-2 rounded-[2px] border border-[#ecd9a8] text-[10px] text-[#8f6412] space-y-0.5">
                      <span className="font-bold">特殊要求汇总:</span>
                      {data.specialNotes.map((note, nIdx) => (
                        <p key={nIdx}>• {note}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-1.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onBatchFinishDish(dishName);
                    showToast(`已批量划菜出锅【${dishName}】共 ${data.totalQty} 份！`);
                  }}
                  className="flex-1 py-1.5 bg-[#37352f] hover:bg-[#201f1d] text-white rounded-[3px] font-semibold text-xs flex items-center justify-center gap-1 cursor-pointer transition-all shadow-2xs"
                  title="仅标记出锅划菜"
                >
                  <Flame className="w-3.5 h-3.5 text-[#fde047]" />
                  <span>出锅划菜 ({data.totalQty}份)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onBatchFinishDish(dishName);
                    voiceAlerts.speakText(`叮咚！后厨【${dishName}】共 ${data.totalQty} 份现制出锅，请前台与传菜员注意分单上菜取餐！`, { chimeType: 'order' });
                    showToast(`已出锅并广播通知传菜与前台：【${dishName}】共 ${data.totalQty} 份！`);
                  }}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-[3px] font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-all shadow-xs"
                  title="出锅划菜并立即全域语音外放广播"
                >
                  <Megaphone className="w-3.5 h-3.5 text-amber-300" />
                  <span>出锅并广播</span>
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
          <div className="bg-white w-full max-w-md rounded-none border border-rose-400 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-3 bg-rose-600 text-white flex items-center justify-between">
              <span className="font-bold text-xs flex items-center gap-1.5 font-mono">
                <Trash2 className="w-4 h-4" />
                <span>后厨出餐看板 · 作废并删除工单</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setDeleteTargetTicket(null);
                  setCustomDeleteReason('');
                }}
                className="text-rose-100 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3.5 text-xs">
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>后厨排产撤单确认</span>
                </div>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  作废后该工单将立即从后厨出餐大屏与批次翻炒任务中移除，后厨厨师无需继续制作。
                </p>
              </div>

              {/* Ticket details */}
              <div className="bg-[#fbfbfa] p-3 border border-[#e6e6e4] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {deleteTargetTicket.ticketNo}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-600">
                    已下单 {deleteTargetTicket.elapsedMinutes} 分钟 · {deleteTargetTicket.orderTime}
                  </span>
                </div>

                <div className="text-[11px] text-slate-700 pt-1 border-t border-dashed border-slate-200">
                  餐台/渠道: <strong className="text-slate-900">{deleteTargetTicket.tableOrChannel}</strong>
                </div>

                <div className="space-y-1 pt-1">
                  <span className="text-[10px] text-slate-500 font-bold block">待制菜品:</span>
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {deleteTargetTicket.items.map((it) => (
                      <div key={it.id} className="flex justify-between text-[11px] bg-white p-1.5 border border-slate-200">
                        <span className={it.isCompleted ? 'line-through text-slate-400' : 'text-slate-800 font-medium'}>
                          {it.dishName}
                        </span>
                        <span className="font-mono font-bold text-amber-700">x{it.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 block">选择作废原因:</label>
                <select
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-none focus:outline-none text-xs font-medium"
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
                    className="w-full p-2 mt-1.5 bg-slate-50 border border-slate-300 rounded-none focus:outline-none text-xs"
                    autoFocus
                  />
                )}
              </div>

              {/* Also delete order checkbox */}
              <label className="flex items-center gap-2 text-slate-700 cursor-pointer select-none text-[11px] pt-1">
                <input
                  type="checkbox"
                  checked={alsoDeleteOrder}
                  onChange={(e) => setAlsoDeleteOrder(e.target.checked)}
                  className="rounded-none text-rose-600 focus:ring-0"
                />
                <span className="font-semibold text-slate-800">同步在全渠道订单中心彻底删除该笔订单（连带作废）</span>
              </label>
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteTargetTicket(null);
                  setCustomDeleteReason('');
                }}
                className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-none font-semibold cursor-pointer text-xs"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTicket}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-none font-bold cursor-pointer text-xs flex items-center gap-1.5 shadow-xs"
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
