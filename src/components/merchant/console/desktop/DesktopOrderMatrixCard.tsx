import React, { useState } from 'react';
import {
  UtensilsCrossed,
  Bike,
  Store,
  MessageSquare,
  Printer,
  Ban,
  ArrowLeftRight,
  FileEdit,
  Trash2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MapPin,
  CheckCircle2,
  Phone,
  Radio,
  Lock,
  Route,
  Grid3X3,
  Volume2
} from 'lucide-react';
import { Order } from '../../../types';

export interface ConsoleCardOrder extends Order {
  channelType?: 'dine_in' | 'delivery' | 'pickup';
  tableCode?: string;
  tableZone?: string;
  dinerCount?: number;
  pickupLocker?: string;
  riderName?: string;
  riderPhone?: string;
  riderFee?: number;
  platformFee?: number;
  netEarn?: number;
  serverName?: string;
  truckName?: string;
  uid?: string;
}

interface DesktopOrderMatrixCardProps {
  order: ConsoleCardOrder;
  onAdvanceStatus?: (orderId: string) => void;
  onPrintReceipt?: (order: ConsoleCardOrder) => void;
  onCallIntercom?: (order: ConsoleCardOrder) => void;
  onVoidOrder?: (order: ConsoleCardOrder) => void;
  onModifyOrder?: (order: ConsoleCardOrder) => void;
  onDeleteOrder?: (orderId: string) => void;
  onShowDetail?: (order: ConsoleCardOrder) => void;
  onItemCompensate?: (orderId: string, itemName: string) => void;
}

export const DesktopOrderMatrixCard: React.FC<DesktopOrderMatrixCardProps> = ({
  order,
  onAdvanceStatus,
  onPrintReceipt,
  onCallIntercom,
  onVoidOrder,
  onModifyOrder,
  onDeleteOrder,
  onShowDetail,
  onItemCompensate
}) => {
  const [isItemsExpanded, setIsItemsExpanded] = useState(true);

  const channel = order.channelType || (order.tableCode ? 'dine_in' : order.pickupCode ? 'pickup' : 'delivery');
  const isDineIn = channel === 'dine_in';
  const isPickup = channel === 'pickup';
  const isDelivery = channel === 'delivery';

  // Compute status presentation
  const isCooking = order.status === 'cooking' || !order.status || order.status === 'pending';
  const isDelivering = order.status === 'shipping' || (isDelivery && !isCooking && order.status !== 'completed');
  const isCompleted = order.status === 'completed';

  const orderTimeStr = order.createdTime || '刚刚';
  const netEarnings = order.netEarn !== undefined ? order.netEarn : (order.totalAmount - (order.platformFee || 0) - (order.riderFee || 0));

  return (
    <div className="bg-white border border-[#c4c7c8] rounded-[3px] flex flex-col justify-between shadow-xs hover:border-[#006494] transition-colors duration-150 select-none font-sans">
      <div className="flex flex-col">
        {/* Card Top Bar */}
        <div className="px-3 py-2 border-b border-[#c4c7c8] bg-[#f9f9f9]/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              style={{ backgroundColor: '#ffffff' }}
              className="font-bold text-[12px] px-2 py-0.5 rounded-[2px] border border-[#c4c7c8]/60 text-[#1a1c1c] truncate"
            >
              {order.orderNo}
            </span>
            {isDineIn && (
              <span className="text-[11px] text-[#006494] bg-[#006494]/10 px-1.5 py-0.5 rounded-[2px] font-semibold shrink-0">
                堂食外摆
              </span>
            )}
            {isPickup && (
              <span className="text-[11px] text-[#ea580c] bg-[#fff7ed] px-1.5 py-0.5 rounded-[2px] font-semibold border border-[#fdba74]/40 shrink-0">
                到车自提
              </span>
            )}
            {isDelivery && (
              <span className="text-[11px] text-[#006494] bg-[#006494]/10 px-1.5 py-0.5 rounded-[2px] font-semibold shrink-0">
                专送 · GPS
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isCooking && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-ping" />
                <span className="text-[11px] font-bold text-[#b45309] bg-[#fff7ed] border border-[#fdba74]/50 px-2 py-0.5 rounded-[2px]">
                  后厨现制中
                </span>
              </>
            )}
            {isDelivering && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[#006494] animate-pulse" />
                <span className="text-[11px] font-bold text-[#006494] bg-[#f0f9ff] border border-[#006494]/30 px-2 py-0.5 rounded-[2px]">
                  专送中 (约6m)
                </span>
              </>
            )}
            {isCompleted && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                <span className="text-[11px] font-bold text-[#059669] bg-[#ecfdf5] border border-[#10b981]/30 px-2 py-0.5 rounded-[2px]">
                  已妥投完成
                </span>
              </>
            )}
          </div>
        </div>

        {/* Meta Dispatch Info */}
        <div
          style={{ backgroundColor: '#fafafa' }}
          className="px-3 py-2 border-b border-[#c4c7c8] text-xs flex flex-col gap-1"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-[#1a1c1c] truncate">
              {isDineIn && (
                <>
                  <span className="text-[#444748] shrink-0">桌台:</span>
                  <strong className="font-bold truncate">
                    {order.tableZone || '餐车外摆区'}·{order.tableCode || 'A2'}号桌 ({order.dinerCount || 3}人)
                  </strong>
                </>
              )}
              {isPickup && (
                <>
                  <span className="text-[#444748] shrink-0">存餐柜位:</span>
                  <strong className="font-bold text-[#006494] truncate">
                    {order.pickupLocker || '02号智能恒温柜'}
                  </strong>
                </>
              )}
              {isDelivery && (
                <>
                  <span className="text-[#444748] shrink-0">履约:</span>
                  <strong className="font-bold truncate">骑手 {order.riderName || '陈志远'}</strong>
                  <span className="text-[#006494] text-[11px] bg-[#006494]/10 px-1.5 py-0.2 rounded-[2px] shrink-0 ml-1 font-semibold">
                    {order.riderPhone || '138****0921'}
                  </span>
                </>
              )}
            </div>

            {isPickup ? (
              <span className="font-bold text-[11px] bg-[#ffedd5] text-[#9a3412] px-1.5 py-0.5 rounded-[2px] shrink-0 border border-[#fdba74]/50">
                自提码: #{order.pickupCode || 'PK-6688'}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onShowDetail?.(order)}
                className="text-[#006494] hover:underline text-[11px] flex items-center shrink-0 ml-1 cursor-pointer font-medium"
              >
                <span>详情</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between text-[#444748] text-[11px]">
            {isDineIn && (
              <>
                <span>服务员: {order.serverName || '阿豪 (No.02)'}</span>
                <span>下单 {orderTimeStr}</span>
              </>
            )}
            {isPickup && (
              <>
                <span>温区: 55°C保温恒湿</span>
                <span>下单 {orderTimeStr}</span>
              </>
            )}
            {isDelivery && (
              <>
                <span>柜格: {order.pickupShelfCode || '03号保温取餐格'}</span>
                <span>下单 {orderTimeStr}</span>
              </>
            )}
          </div>

          <div className="flex items-center justify-between text-[#747878] text-[10px] pt-0.5">
            <span>UID: {order.uid || `tcb_${order.id.slice(-8)}`}</span>
            <span className="flex items-center gap-1">
              <span className="text-[#006494]">{order.truckName || '01号·旗舰车'}</span>
              <CheckCircle2 className="w-3 h-3 text-[#10b981]" />
              <span className="text-[#059669] font-semibold">
                {isPickup ? '自提码已推送' : '允许退单'}
              </span>
            </span>
          </div>
        </div>

        {/* Order Items Section */}
        <div className="p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between border-b border-[#c4c7c8] pb-1.5">
            <div className="flex items-center gap-1.5 text-sm font-bold text-[#1a1c1c]">
              <UtensilsCrossed className="w-4 h-4 text-[#006494]" />
              <span>菜品清单</span>
              <span className="text-xs text-[#444748] font-normal">
                (共{order.items.length}品{order.items.reduce((s, i) => s + i.quantity, 0)}件)
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsItemsExpanded(!isItemsExpanded)}
              className="text-xs text-[#444748] hover:text-[#1a1c1c] bg-[#eeeeee] px-2 py-0.5 rounded-[2px] border border-[#c4c7c8]/60 flex items-center gap-0.5 transition cursor-pointer"
            >
              <span>{isDineIn ? '现制明细' : isPickup ? '自提取餐' : '专送配送'}</span>
              {isItemsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Items list */}
          {isItemsExpanded && (
            <div className="flex flex-col gap-2 text-sm">
              {order.items.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-start justify-between pb-2 ${
                    idx < order.items.length - 1 ? 'border-b border-[#c4c7c8]/30' : ''
                  }`}
                >
                  <div className="flex flex-col pr-2 min-w-0">
                    <span className="font-bold text-[#1a1c1c] text-[13px] truncate">{item.name}</span>
                    <span className="text-[11px] text-[#444748] mt-0.5 truncate">
                      {item.options ? `[${item.options}]` : '[招牌特调口味]'}
                    </span>
                  </div>
                  <div className="flex gap-1.5 shrink-0 items-center">
                    <span className="font-bold text-[#1a1c1c] text-xs">x{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => onItemCompensate?.(order.id, item.name)}
                      className="bg-[#fef2f2] text-[#ba1a1a] hover:bg-[#ba1a1a] hover:text-white border border-[#ba1a1a]/20 px-1.5 py-0.5 rounded-[2px] text-[10px] transition cursor-pointer font-medium"
                      title="后厨划菜或品质异常登记"
                    >
                      划菜补偿
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Location Indicator */}
          <div
            style={{ backgroundColor: '#fafafa' }}
            className="px-2.5 py-1.5 rounded-[3px] border border-[#c4c7c8]/80 flex items-center gap-1.5 text-xs text-[#1a1c1c] mt-1"
          >
            {isDineIn && <MapPin className="w-4 h-4 text-[#006494] shrink-0" />}
            {isPickup && <Store className="w-4 h-4 text-[#ea580c] shrink-0" />}
            {isDelivery && <Bike className="w-4 h-4 text-[#006494] shrink-0" />}
            <span className="truncate text-[11px]">
              {isDineIn && `${order.tableZone || '餐车外摆区'} · ${order.tableCode || 'A2'} 号桌 (${order.dinerCount || 3}人就餐)`}
              {isPickup && `01号·旗舰车自提点 (${order.pickupShelfCode || '大悦城北广场侧面'})`}
              {isDelivery && (order.deliveryAddress || '西藏北路 166 号大悦城商务座 1204 室')}
            </span>
          </div>
        </div>
      </div>

      {/* Financial Tally & Action Dock */}
      <div className="flex flex-col border-t border-[#c4c7c8] bg-[#f9f9f9]">
        <div
          style={{ backgroundColor: '#ffffff' }}
          className="px-3 py-2 flex items-center justify-between border-b border-[#c4c7c8] text-xs"
        >
          <div className="flex flex-col">
            <span className="text-[#444748] text-[11px]">在线微信支付已结算</span>
            <span className="text-[10px] text-[#747878] tracking-tight">
              {isDelivery ? `骑手 ¥${order.riderFee || 15}.0 · 佣金 ¥${order.platformFee || 20.4}` : '骑手 ¥0.0 · 佣金 ¥0.0'}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[11px] text-[#059669] font-bold">
              餐车净得: ¥{netEarnings.toFixed(2)}
            </span>
            <span className="text-base font-bold text-[#1a1c1c] tracking-tight">
              ¥{order.totalAmount.toFixed(2)}
            </span>
          </div>
        </div>

        <div
          style={{ backgroundColor: '#fcfcfc' }}
          className="p-2.5 flex flex-col gap-2"
        >
          {/* 6-Button Icon Utility Row */}
          <div className="grid grid-cols-6 gap-1">
            <button
              type="button"
              style={{ backgroundColor: '#ffffff' }}
              onClick={() => onCallIntercom?.(order)}
              className="h-8 hover:border-[#1a1c1c] border border-[#c4c7c8] rounded-[3px] flex items-center justify-center transition text-[#1a1c1c] cursor-pointer"
              title="对讲呼叫"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onPrintReceipt?.(order)}
              className="h-8 bg-white hover:border-[#1a1c1c] border border-[#c4c7c8] rounded-[3px] flex items-center justify-center transition text-[#1a1c1c] cursor-pointer"
              title="补打客单"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onVoidOrder?.(order)}
              className="h-8 bg-white hover:border-[#1a1c1c] border border-[#c4c7c8] rounded-[3px] flex items-center justify-center transition text-[#1a1c1c] cursor-pointer"
              title="作废订单"
            >
              <Ban className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (isDineIn) onModifyOrder?.(order);
                else if (isPickup) onModifyOrder?.(order);
                else onModifyOrder?.(order);
              }}
              className="h-8 bg-white hover:border-[#1a1c1c] border border-[#c4c7c8] rounded-[3px] flex items-center justify-center transition text-[#1a1c1c] cursor-pointer"
              title={isDineIn ? '换桌转台' : isPickup ? '重新分配柜格' : '重新调度骑手'}
            >
              {isDineIn && <ArrowLeftRight className="w-4 h-4" />}
              {isPickup && <Grid3X3 className="w-4 h-4" />}
              {isDelivery && <Route className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => onModifyOrder?.(order)}
              className="h-8 bg-white hover:border-[#1a1c1c] border border-[#c4c7c8] rounded-[3px] flex items-center justify-center transition text-[#1a1c1c] cursor-pointer"
              title="工单修改"
            >
              <FileEdit className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onDeleteOrder?.(order.id)}
              className="h-8 bg-white hover:border-[#1a1c1c] border border-[#c4c7c8] rounded-[3px] flex items-center justify-center transition text-[#ba1a1a] cursor-pointer"
              title="移入回收站"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Primary Action Buttons (Tailored per Channel) */}
          <div className="flex items-center justify-end gap-1.5 pt-0.5">
            {isDineIn && (
              <button
                type="button"
                onClick={() => onAdvanceStatus?.(order.id)}
                className="h-9 px-3.5 bg-white hover:bg-neutral-50 border border-[#1a1c1c] text-[#1a1c1c] text-xs rounded-[3px] flex items-center justify-center gap-1.5 transition active:scale-[0.99] shadow-2xs font-bold shrink-0 cursor-pointer"
              >
                <UtensilsCrossed className="w-4 h-4 text-[#f59e0b]" />
                <span>制作完成 · 传菜上桌</span>
              </button>
            )}

            {isPickup && (
              <>
                <button
                  type="button"
                  onClick={() => onCallIntercom?.(order)}
                  className="h-9 px-2.5 bg-[#f3f3f4] hover:bg-[#eeeeee] text-[#1a1c1c] border border-[#c4c7c8] text-xs rounded-[3px] flex items-center justify-center gap-1 transition font-bold shrink-0 cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5 text-[#444748]" />
                  <span>叫号取餐</span>
                </button>
                <button
                  type="button"
                  onClick={() => onShowDetail?.(order)}
                  className="h-9 px-2.5 bg-[#f3f3f4] hover:bg-[#eeeeee] text-[#1a1c1c] border border-[#c4c7c8] text-xs rounded-[3px] flex items-center justify-center gap-1 transition font-bold shrink-0 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#006494]" />
                  <span>自提核销</span>
                </button>
                <button
                  type="button"
                  onClick={() => onAdvanceStatus?.(order.id)}
                  className="h-9 px-2.5 bg-[#006494] hover:bg-[#004e75] text-white text-xs rounded-[3px] flex items-center justify-center gap-1 transition font-bold shadow-xs shrink-0 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 text-white" />
                  <span>出餐入柜</span>
                </button>
              </>
            )}

            {isDelivery && (
              <>
                <button
                  type="button"
                  onClick={() => onCallIntercom?.(order)}
                  className="h-9 px-3 bg-[#f3f3f4] hover:bg-[#eeeeee] text-[#1a1c1c] border border-[#c4c7c8] text-xs rounded-[3px] flex items-center justify-center gap-1 transition font-bold shrink-0 cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5 text-[#006494]" />
                  <span>呼叫骑手</span>
                </button>
                <button
                  type="button"
                  onClick={() => onAdvanceStatus?.(order.id)}
                  className="h-9 px-3 bg-white hover:bg-neutral-50 border border-[#1a1c1c] text-[#1a1c1c] text-xs rounded-[3px] flex items-center justify-center gap-1.5 transition active:scale-[0.99] shadow-2xs font-bold shrink-0 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                  <span>送达妥投</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
