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
  KeyRound
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { KdsTicket } from '../../types';
import { UnifiedOmniChatModal } from '../chat/UnifiedOmniChatModal';
import { getOrGeneratePickupCode, getPickupShelfCode } from '../../utils/pickupCodeEngine';

interface MerchantKDSProps {
  tickets: KdsTicket[];
  onFinishTicket: (ticketId: string) => void;
  onToggleItemComplete: (ticketId: string, itemId: string) => void;
  onBatchFinishDish: (dishName: string) => void;
  showToast: (msg: string) => void;
}

export const MerchantKDS: React.FC<MerchantKDSProps> = ({
  tickets,
  onFinishTicket,
  onToggleItemComplete,
  onBatchFinishDish,
  showToast
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'batch'>('grid');
  const [filterType, setFilterType] = useState<'all' | 'dine_in' | 'delivery'>('all');
  const [activeChatTicketNo, setActiveChatTicketNo] = useState<string | null>(null);

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

        {/* SLA Legends */}
        <div className="flex items-center gap-3 text-[11px] text-[#787774]">
          <span className="flex items-center gap-1 text-[#2b593f]">
            <span className="w-2 h-2 rounded-full bg-[#4dab63]" />
            <span>&lt;8m 顺畅</span>
          </span>
          <span className="flex items-center gap-1 text-[#8f6412]">
            <span className="w-2 h-2 rounded-full bg-[#d9730d]" />
            <span>8~15m 备餐高峰</span>
          </span>
          <span className="flex items-center gap-1 text-[#eb5757]">
            <span className="w-2 h-2 rounded-full bg-[#eb5757] animate-ping" />
            <span>&gt;15m 催单超时</span>
          </span>
        </div>
      </div>

      {/* 1. Grid View (Ticket-by-Ticket) */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence>
            {filteredTickets.map((ticket) => {
              const isOvertime = ticket.elapsedMinutes > 15;
              const isWarning = ticket.elapsedMinutes >= 8 && ticket.elapsedMinutes <= 15;
              const allItemsCompleted = ticket.items.every((it) => it.isCompleted);

              let headerBg = 'bg-[#f7f7f5] text-[#37352f]';
              let timerBadge = 'bg-[#edf3ec] text-[#2b593f] border-[#c4dcbc]';

              if (isOvertime) {
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
                    isOvertime ? 'border-[#eb5757] shadow-xs' : 'border-[#e6e6e4]'
                  } flex flex-col justify-between overflow-hidden shadow-2xs`}
                >
                  {/* Ticket Top */}
                  <div>
                    <div className={`p-2.5 flex items-center justify-between border-b border-[#e6e6e4] ${headerBg}`}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs bg-[#37352f] text-white px-1.5 py-0.2 rounded-[2px]">
                          {ticket.ticketNo}
                        </span>
                        <span className="font-bold text-xs">{ticket.tableOrChannel}</span>
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
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-[2px] border ${timerBadge}`}>
                          已下单 {ticket.elapsedMinutes}m
                        </span>
                      </div>
                    </div>

                    {/* Items List for Scratching / Completing */}
                    <div className="p-3 space-y-2">
                      <p className="text-[10px] text-[#787774] font-semibold">点击菜品条目进行划菜标定:</p>
                      <div className="space-y-1.5">
                        {ticket.items.map((it) => (
                          <div
                            key={it.id}
                            onClick={() => onToggleItemComplete(ticket.id, it.id)}
                            className={`p-2 rounded-[3px] border cursor-pointer transition-all flex items-start justify-between gap-2 ${
                              it.isCompleted
                                ? 'bg-[#edf3ec]/60 border-[#c4dcbc] text-[#787774] line-through'
                                : 'bg-[#fbfbfa] border-[#e6e6e4] text-[#37352f] hover:border-[#37352f]'
                            }`}
                          >
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className={`font-bold text-xs ${it.isCompleted ? 'text-[#787774]' : 'text-[#37352f]'}`}>
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
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="font-mono font-bold text-xs bg-white px-1.5 py-0.5 rounded border border-[#d3d1cb]">
                                x{it.quantity}
                              </span>
                              {it.isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-[#4dab63]" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Ticket Footer Action */}
                  <div className="p-2.5 bg-[#fbfbfa] border-t border-[#e6e6e4]">
                    <button
                      type="button"
                      onClick={() => {
                        onFinishTicket(ticket.id);
                        showToast(`工单 ${ticket.ticketNo} 已全部现制完成！`);
                      }}
                      className={`w-full py-1.5 rounded-[3px] font-semibold text-xs flex items-center justify-center gap-1 cursor-pointer transition-all ${
                        allItemsCompleted
                          ? 'bg-[#2b593f] text-white hover:bg-[#204430] shadow-xs'
                          : 'bg-[#37352f] text-white hover:bg-[#201f1d]'
                      }`}
                    >
                      <ChefHat className="w-3.5 h-3.5 text-[#fde047]" />
                      <span>{allItemsCompleted ? '全部出餐 · 呼叫取餐/骑手' : '一键出餐完成'}</span>
                    </button>
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
                        <span className="font-mono font-bold text-[#d9730d]">x{td.qty}份</span>
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

              <button
                type="button"
                onClick={() => {
                  onBatchFinishDish(dishName);
                  showToast(`已批量划菜出锅【${dishName}】共 ${data.totalQty} 份！`);
                }}
                className="w-full py-1.5 bg-[#37352f] hover:bg-[#201f1d] text-white rounded-[3px] font-semibold text-xs flex items-center justify-center gap-1 cursor-pointer transition-all shadow-2xs"
              >
                <Flame className="w-3.5 h-3.5 text-[#fde047]" />
                <span>一键出锅划菜 (出 {data.totalQty} 份)</span>
              </button>
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
    </div>
  );
};
