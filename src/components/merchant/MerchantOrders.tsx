import React, { useState, useEffect } from 'react';
import {
  Store,
  Printer,
  Ban,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Bike,
  Volume2,
  VolumeX,
  Zap,
  Search,
  X,
  AlertTriangle,
  FileText,
  Lock,
  Unlock,
  RotateCcw,
  MessageSquare,
  Check,
  ShieldAlert,
  Flame,
  ChefHat,
  KeyRound,
  Scan,
  Utensils,
  ShoppingBag,
  ArrowRightLeft
} from 'lucide-react';
import { Order } from '../../types';
import { UnifiedOmniChatModal } from '../chat/UnifiedOmniChatModal';
import { MerchantPickupVerifyModal } from './MerchantPickupVerifyModal';
import { MerchantAuditConvertToDeliveryModal } from './MerchantAuditConvertToDeliveryModal';
import { getOrGeneratePickupCode, getPickupShelfCode, subscribePickupVerifiedEvent } from '../../utils/pickupCodeEngine';
import { resolveOrderChannelType } from '../../utils/orderNormalizer';

interface MerchantOrdersProps {
  orders: Order[];
  onAcceptOrder?: (orderId: string) => void;
  onAdvanceOrderStatus: (orderId: string, targetStatus?: Order['status'], extraDetails?: Partial<Order>) => void;
  onRejectOrder: (orderId: string, reason: string) => void;
  onAuditRefund?: (orderId: string, approved: boolean, rejectReason?: string) => void;
  onToggleNonRefundable?: (orderId: string, nonRefundable: boolean) => void;
  showToast: (msg: string) => void;
}

function safeGetStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    return fallback;
  }
}

function safeSetStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // ignore
  }
}

export const MerchantOrders: React.FC<MerchantOrdersProps> = ({
  orders,
  onAcceptOrder,
  onAdvanceOrderStatus,
  onRejectOrder,
  onAuditRefund,
  onToggleNonRefundable,
  showToast
}) => {
  const [activeStatusTab, setActiveStatusTab] = useState<'all' | 'pending' | 'cooking' | 'delivering' | 'completed' | 'refund'>('all');
  const [channelFilter, setChannelFilter] = useState<'all' | 'delivery' | 'dine_in' | 'pickup'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Automations - Default FALSE (Merchant must explicitly enable auto-accept)
  const [isAutoAccept, setIsAutoAccept] = useState<boolean>(() => {
    return safeGetStorage<boolean>('obsidian_merchant_auto_accept', false);
  });
  const [isVoiceBroadcast, setIsVoiceBroadcast] = useState<boolean>(() => {
    return safeGetStorage<boolean>('obsidian_merchant_voice_broadcast', true);
  });

  useEffect(() => {
    safeSetStorage('obsidian_merchant_auto_accept', isAutoAccept);
  }, [isAutoAccept]);

  useEffect(() => {
    safeSetStorage('obsidian_merchant_voice_broadcast', isVoiceBroadcast);
  }, [isVoiceBroadcast]);

  // Modals
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [chatOrder, setChatOrder] = useState<Order | null>(null);
  const [verifyTargetOrder, setVerifyTargetOrder] = useState<Order | null>(null);
  const [auditConvertTargetOrder, setAuditConvertTargetOrder] = useState<Order | null>(null);
  const [rejectOrderTarget, setRejectOrderTarget] = useState<Order | null>(null);
  const [rejectReason, setRejectReason] = useState('食材售罄，无法现制');

  // Refund reject modal
  const [refundRejectTarget, setRefundRejectTarget] = useState<Order | null>(null);
  const [refundRejectReason, setRefundRejectReason] = useState('餐品已下锅高温炙烤，无法中途取消');

  // Handle manual audit to convert dine-in order to rider delivery
  const handleConfirmConvertToDelivery = (
    order: Order,
    deliveryAddress: string,
    customerPhone: string,
    auditReason: string,
    extraDeliveryFee: number
  ) => {
    const updatedTotal = order.totalAmount + extraDeliveryFee;
    onAdvanceOrderStatus(order.orderNo || order.id, 'cooking', {
      channelType: 'delivery',
      channel: 'delivery',
      deliveryAddress,
      userPhone: customerPhone,
      totalAmount: updatedTotal,
      isConvertedFromDineIn: true,
      convertAuditReason: auditReason,
      statusText: '堂食已转外卖专送 · 待呼叫骑手',
      auditLogs: [
        ...(order.auditLogs || []),
        {
          time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
          operator: '主理人阿豪',
          role: 'merchant',
          action: '堂食转外卖专送审核通过',
          note: `转送地址: ${deliveryAddress} | 审核原因: ${auditReason} | 运费加收: ¥${extraDeliveryFee}`
        }
      ]
    });
    showToast(`订单 #${order.orderNo.replace(/^#/, '')} 审核通过！已由堂食成功转为外卖专送，已同步至骑手端抢单池！`);
  };

  // Listen to pickup verification events from scanner or rider
  useEffect(() => {
    const unsubscribe = subscribePickupVerifiedEvent((record) => {
      const target = orders.find((o) => o.id === record.orderId || o.orderNo === record.orderNo);
      if (target && target.status !== 'delivering' && target.status !== 'completed') {
        onAdvanceOrderStatus(target.orderNo || target.id, 'delivering', {
          status: 'delivering',
          stepIndex: 3,
          statusText: '专线骑手配送中',
          pickupVerifiedAt: record.verifiedAt,
          pickupVerifiedBy: record.verifiedBy
        });
      }
    });
    return () => unsubscribe();
  }, [orders, onAdvanceOrderStatus]);

  // Groups
  const pendingOrders = orders.filter((o) => o.status === 'pending' || (o.stepIndex === 0 && !o.merchantAccepted));
  const cookingOrders = orders.filter((o) => o.status === 'cooking' || (o.stepIndex === 1 && o.status !== 'refund_pending'));
  const deliveringOrders = orders.filter((o) => o.status === 'delivering' || o.status === 'ready' || o.stepIndex === 2 || o.stepIndex === 3);
  const completedOrders = orders.filter((o) => o.status === 'completed' || o.status === 'refunded' || o.status === 'cancelled');
  const refundApplicationOrders = orders.filter((o) => o.refundStatus === 'pending' || o.status === 'refund_pending');

  const filteredOrders = orders.filter((o) => {
    if (activeStatusTab === 'pending' && !(o.status === 'pending' || (o.stepIndex === 0 && !o.merchantAccepted))) return false;
    if (activeStatusTab === 'cooking' && !(o.status === 'cooking' || (o.stepIndex === 1 && o.status !== 'refund_pending'))) return false;
    if (activeStatusTab === 'delivering' && !(o.status === 'delivering' || o.status === 'ready' || o.stepIndex === 2 || o.stepIndex === 3)) return false;
    if (activeStatusTab === 'completed' && !(o.status === 'completed' || o.status === 'refunded' || o.status === 'cancelled')) return false;
    if (activeStatusTab === 'refund' && !(o.refundStatus === 'pending' || o.status === 'refund_pending')) return false;

    // Channel Filtering
    const oChannel = resolveOrderChannelType(o);
    if (channelFilter === 'dine_in' && oChannel !== 'dine_in') return false;
    if (channelFilter === 'delivery' && oChannel !== 'delivery') return false;
    if (channelFilter === 'pickup' && oChannel !== 'pickup') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        o.orderNo.toLowerCase().includes(q) ||
        o.deliveryAddress.toLowerCase().includes(q) ||
        (o.userId && o.userId.toLowerCase().includes(q)) ||
        (o.customerName && o.customerName.toLowerCase().includes(q)) ||
        (o.tableCode && o.tableCode.toLowerCase().includes(q)) ||
        (o.userPhone && o.userPhone.includes(q)) ||
        (o.courierName && o.courierName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleToggleLock = (order: Order) => {
    const nextState = !order.nonRefundable;
    if (onToggleNonRefundable) {
      onToggleNonRefundable(order.id, nextState);
    } else {
      onAdvanceOrderStatus(order.orderNo || order.id, order.status, { nonRefundable: nextState });
    }
    showToast(nextState ? `订单 #${order.orderNo} 已锁定为【不可退单】` : `订单 #${order.orderNo} 已恢复【允许申请退单】`);
  };

  const handleAcceptSingleOrder = (order: Order) => {
    onAdvanceOrderStatus(order.orderNo || order.id, 'cooking', {
      merchantAccepted: true,
      stepIndex: 1,
      status: 'cooking',
      statusText: '餐车后厨备餐现制中',
      progressPercent: 35
    });
    if (onAcceptOrder) onAcceptOrder(order.id);
    showToast(`已接单 #${order.orderNo}，工单已下发至 KDS 后厨现制！`);
  };

  const handleApproveRefund = (order: Order) => {
    if (onAuditRefund) {
      onAuditRefund(order.id, true);
    } else {
      onAdvanceOrderStatus(order.orderNo || order.id, 'refunded', {
        status: 'refunded',
        refundStatus: 'approved',
        statusText: '已退款',
        progressPercent: -1
      });
    }
    showToast(`已同意订单 #${order.orderNo} 退单申请，款项已原路退回顾客账户！`);
  };

  const handleRejectRefundSubmit = () => {
    if (!refundRejectTarget) return;
    if (onAuditRefund) {
      onAuditRefund(refundRejectTarget.id, false, refundRejectReason);
    } else {
      const prevStep = refundRejectTarget.refundPassedStep ?? 1;
      const restoredStatus = prevStep >= 3 ? 'delivering' : prevStep >= 1 ? 'cooking' : 'pending';
      onAdvanceOrderStatus(refundRejectTarget.orderNo || refundRejectTarget.id, restoredStatus, {
        status: restoredStatus,
        refundStatus: 'rejected',
        refundRejectReason: refundRejectReason,
        statusText: restoredStatus === 'delivering' ? '专线配送中' : restoredStatus === 'cooking' ? '后厨现制中' : '待商家接单'
      });
    }
    showToast(`已驳回订单 #${refundRejectTarget.orderNo} 退款申请并恢复订单流程`);
    setRefundRejectTarget(null);
  };

  return (
    <div className="space-y-3.5 text-xs">
      {/* Top Control Bar with Automations */}
      <div className="bg-white p-3 rounded-[3px] border border-[#e6e6e4] flex items-center justify-between gap-3 flex-wrap shadow-2xs">
        {/* Automations Switches */}
        <div className="flex items-center gap-2">
          {/* 自动接单开关 (必须有开关按钮，如果没有则是待接单状态) */}
          <button
            type="button"
            onClick={() => {
              const next = !isAutoAccept;
              setIsAutoAccept(next);
              showToast(next ? '已开启极速自动接单（新单自动流入后厨制作）' : '已关闭自动接单（新订单将进入待接单列表）');
            }}
            className={`px-3 py-1.5 rounded-[3px] font-semibold text-xs flex items-center gap-1.5 cursor-pointer border transition-all shadow-2xs ${
              isAutoAccept
                ? 'bg-[#edf3ec] text-[#2b593f] border-[#c4dcbc] hover:bg-[#e1ece0]'
                : 'bg-[#fbe4e4] text-[#c93b3b] border-[#f0c3c3] hover:bg-[#f8d7d7]'
            }`}
            title={isAutoAccept ? '点击关闭自动接单' : '点击开启自动接单'}
          >
            <Zap className={`w-3.5 h-3.5 ${isAutoAccept ? 'text-[#4dab63]' : 'text-[#c93b3b]'}`} />
            <span>自动接单: <strong>{isAutoAccept ? '开启中' : '已关闭 (手动确认)'}</strong></span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsVoiceBroadcast((v) => !v);
              showToast(isVoiceBroadcast ? '已关闭语音播报' : '已开启新订单语音播报');
            }}
            className={`px-2.5 py-1.5 rounded-[3px] font-semibold text-xs flex items-center gap-1.5 cursor-pointer border transition-all ${
              isVoiceBroadcast
                ? 'bg-[#fbf3db] text-[#8f6412] border-[#ecd9a8]'
                : 'bg-[#f1f1ef] text-[#787774] border-[#d3d1cb]'
            }`}
          >
            {isVoiceBroadcast ? <Volume2 className="w-3.5 h-3.5 text-[#d9730d]" /> : <VolumeX className="w-3.5 h-3.5 text-[#9b9a97]" />}
            <span>语音提醒</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#787774] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="搜索单号 / 配送地址 / 顾客..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 bg-[#f7f7f5] border border-[#d3d1cb] rounded-[3px] focus:outline-none focus:border-[#37352f] w-52 sm:w-64 text-xs"
          />
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'all', label: '全部订单', count: orders.length, badge: 'bg-[#37352f] text-white' },
              { id: 'pending', label: '⏳ 待接单确认', count: pendingOrders.length, badge: 'bg-[#d9730d] text-white animate-pulse' },
              { id: 'cooking', label: '制作中 (KDS)', count: cookingOrders.length, badge: 'bg-[#8f6412] text-white' },
              { id: 'delivering', label: '待取/专送中', count: deliveringOrders.length, badge: 'bg-[#2383e2] text-white' },
              { id: 'refund', label: '⚠️ 退单申请审核', count: refundApplicationOrders.length, badge: 'bg-[#eb5757] text-white' },
              { id: 'completed', label: '已完成/已退款', count: completedOrders.length, badge: 'bg-[#2b593f] text-white' }
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveStatusTab(t.id as any)}
                className={`px-3 py-1.5 rounded-[3px] text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                  activeStatusTab === t.id
                    ? 'bg-[#37352f] text-white shadow-xs'
                    : 'bg-white text-[#5a5854] border border-[#e6e6e4] hover:bg-[#efefed]'
                }`}
              >
                <span>{t.label}</span>
                <span className={`text-[10px] font-mono px-1 rounded-[2px] ${t.badge}`}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Channel Segment Bar (堂食 / 外卖 / 自提 分流过滤) */}
        <div className="bg-[#f7f7f5] p-1.5 rounded-[3px] border border-[#e6e6e4] flex items-center justify-between gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-[#787774] px-1">订单分流渠道:</span>
            {[
              { id: 'all', label: '全渠道订单', icon: Store, count: orders.length },
              {
                id: 'dine_in',
                label: '🍽️ 现场堂食',
                icon: Utensils,
                count: orders.filter((o) => resolveOrderChannelType(o) === 'dine_in').length
              },
              {
                id: 'delivery',
                label: '🛵 外卖专送',
                icon: Bike,
                count: orders.filter((o) => resolveOrderChannelType(o) === 'delivery').length
              },
              {
                id: 'pickup',
                label: '🛍️ 到店自提',
                icon: ShoppingBag,
                count: orders.filter((o) => resolveOrderChannelType(o) === 'pickup').length
              }
            ].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setChannelFilter(c.id as any)}
                className={`px-2.5 py-1 rounded-[2px] font-bold text-xs flex items-center gap-1 cursor-pointer transition-all border ${
                  channelFilter === c.id
                    ? 'bg-white text-black border-[#37352f] shadow-xs'
                    : 'bg-transparent text-[#787774] border-transparent hover:text-black hover:bg-white/60'
                }`}
              >
                <span>{c.label}</span>
                <span className="text-[10px] font-mono opacity-80">({c.count})</span>
              </button>
            ))}
          </div>

          <div className="text-[11px] text-[#787774] flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
            <span>堂食订单默认不入骑手池，需审核转送</span>
          </div>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-[3px] p-12 text-center border border-[#e6e6e4] space-y-2">
          <Store className="w-10 h-10 text-[#9b9a97] mx-auto" />
          <h4 className="font-bold text-sm text-[#37352f]">暂无匹配的订单</h4>
          <p className="text-xs text-[#787774]">当前筛选条件下没有待处理的订单</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredOrders.map((order, idx) => {
            const isPending = order.status === 'pending' || (order.stepIndex === 0 && !order.merchantAccepted);
            const isCooking = order.status === 'cooking' || (order.stepIndex === 1 && order.status !== 'refund_pending');
            const isDelivering = order.status === 'delivering' || order.status === 'ready' || order.stepIndex === 2 || order.stepIndex === 3;
            const isCompleted = order.status === 'completed';
            const isRefundPending = order.refundStatus === 'pending' || order.status === 'refund_pending';
            const isRefunded = order.status === 'refunded' || order.status === 'cancelled';

            // Precise Channel Detection (堂食/外卖/自提 严密分流)
            const orderChannel = resolveOrderChannelType(order);
            const isDineIn = orderChannel === 'dine_in';
            const isPickup = orderChannel === 'pickup';
            const isDelivery = orderChannel === 'delivery';

            return (
              <div
                key={`merchant-ord-${order.id || order.orderNo || idx}-${idx}`}
                className={`bg-white rounded-[3px] border p-3.5 space-y-2.5 shadow-2xs transition-colors ${
                  isRefundPending
                    ? 'border-[#eb5757] bg-[#fffaf9]'
                    : isPending
                    ? 'border-[#d9730d] bg-[#fffdfa]'
                    : 'border-[#e6e6e4] hover:border-[#d3d1cb]'
                }`}
              >
                {/* Row 1: Order Meta */}
                <div className="flex items-center justify-between gap-3 border-b border-[#efefed] pb-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-xs bg-[#37352f] text-white px-2 py-0.5 rounded-[2px]">
                      #{order.orderNo.replace('#', '')}
                    </span>
                    {order.truckName && (
                      <span className="text-[10.5px] font-bold bg-[#edf3ec] text-[#2b593f] border border-[#c4dcbc] px-1.5 py-0.5 rounded-[2px] flex items-center gap-1">
                        <Store className="w-3 h-3 text-[#2b593f]" />
                        <span>{order.truckName}</span>
                      </span>
                    )}
                    {order.userId && (
                      <span className="font-mono text-[10px] bg-[#f0f4f8] text-[#1c5598] border border-[#c4d6ec] px-1.5 py-0.5 rounded-[2px]">
                        UID: {order.userId.length > 12 ? `${order.userId.slice(0, 10)}...` : order.userId}
                      </span>
                    )}

                    {/* Precise Channel Badge */}
                    {isDineIn && (
                      <span className="text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-[2px] flex items-center gap-1">
                        <Utensils className="w-3 h-3 text-amber-700" />
                        <span>堂食就餐 · {order.tableCode ? `${order.tableCode} 号桌` : '外摆台位'}</span>
                      </span>
                    )}
                    {isPickup && (
                      <span className="text-[11px] font-bold bg-sky-50 text-sky-900 border border-sky-300 px-2 py-0.5 rounded-[2px] flex items-center gap-1">
                        <ShoppingBag className="w-3 h-3 text-sky-700" />
                        <span>到店自提</span>
                      </span>
                    )}
                    {isDelivery && (
                      <span className="text-[11px] font-semibold bg-[#edf3ec] text-[#2b593f] border border-[#c4dcbc] px-2 py-0.5 rounded-[2px] flex items-center gap-1">
                        <Bike className="w-3 h-3 text-[#2b593f]" />
                        <span>{order.customerName ? `${order.customerName} · 专送` : '外卖专送'}</span>
                      </span>
                    )}

                    {order.isConvertedFromDineIn && (
                      <span className="text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200 px-1.5 py-0.5 rounded-[2px]">
                        堂食转外卖审核已通
                      </span>
                    )}

                    <span className="text-[11px] text-[#787774] font-mono">
                      下单时间: {order.createdTime}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Non-refundable Tag / Switch */}
                    <button
                      type="button"
                      onClick={() => handleToggleLock(order)}
                      className={`px-2 py-0.5 rounded-[2px] text-[10.5px] font-bold flex items-center gap-1 cursor-pointer transition-all border ${
                        order.nonRefundable
                          ? 'bg-[#fbe4e4] text-[#c93b3b] border-[#f0c3c3] hover:bg-[#f8d2d2]'
                          : 'bg-[#f1f1ef] text-[#787774] border-[#d3d1cb] hover:bg-[#e8e8e6]'
                      }`}
                      title={order.nonRefundable ? '该订单已锁定不可退单，点击解除' : '点击将该订单锁定为不可退单'}
                    >
                      {order.nonRefundable ? (
                        <>
                          <Lock className="w-3 h-3 text-[#eb5757]" />
                          <span>不可退单 (已锁定)</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3 h-3 text-[#787774]" />
                          <span>允许申请退单</span>
                        </>
                      )}
                    </button>

                    {/* Channel-Specific Verification / Location Badges */}
                    {isDineIn ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-[2px] flex items-center gap-1 shadow-2xs">
                          <Utensils className="w-3 h-3 text-amber-700 shrink-0" />
                          <span>桌台: {order.tableCode ? `${order.tableCode}号` : 'A2桌'} · {order.tableZone || '外摆区'}</span>
                        </span>
                        <span className="text-[10.5px] text-neutral-600 bg-neutral-100 border border-neutral-200 px-1.5 py-0.5 rounded-[2px]">
                          服务员: {order.serverName || '阿豪 (No.02)'}
                        </span>
                      </div>
                    ) : isPickup ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-mono font-bold bg-sky-50 text-sky-900 border border-sky-300 px-2 py-0.5 rounded-[2px] flex items-center gap-1 shadow-2xs">
                          <KeyRound className="w-3 h-3 text-sky-600 shrink-0" />
                          <span>自提码: #{getOrGeneratePickupCode(order.orderNo, order.pickupCode)}</span>
                        </span>
                        <span className="text-[10.5px] font-mono text-neutral-600 bg-neutral-100 border border-neutral-200 px-1.5 py-0.5 rounded-[2px]">
                          {getPickupShelfCode(order.id || order.orderNo, order.pickupShelfCode)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-mono font-bold bg-amber-50 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-[2px] flex items-center gap-1 shadow-2xs">
                          <KeyRound className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>取件码: {getOrGeneratePickupCode(order.orderNo, order.pickupCode)}</span>
                        </span>
                        <span className="text-[10.5px] font-mono text-neutral-600 bg-neutral-100 border border-neutral-200 px-1.5 py-0.5 rounded-[2px]">
                          {getPickupShelfCode(order.id || order.orderNo, order.pickupShelfCode)}
                        </span>
                      </div>
                    )}

                    {/* Status Badge */}
                    {isPending && (
                      <span className="text-[11px] font-bold bg-[#fbf3db] text-[#8f6412] border border-[#ecd9a8] px-2 py-0.5 rounded-[2px] flex items-center gap-1 animate-pulse">
                        <Clock className="w-3 h-3 text-[#d9730d]" />
                        <span>待商家接单确认</span>
                      </span>
                    )}
                    {isCooking && !isRefundPending && (
                      <span className="text-[11px] font-bold bg-[#fbf3db] text-[#8f6412] border border-[#ecd9a8] px-2 py-0.5 rounded-[2px] flex items-center gap-1">
                        <Flame className="w-3 h-3 text-[#d9730d] animate-bounce" />
                        <span>后厨现制中 (已接单)</span>
                      </span>
                    )}
                    {isDelivering && !isRefundPending && (
                      <span className="text-[11px] font-bold bg-[#edf3f8] text-[#1c5598] border border-[#c4d6ec] px-2 py-0.5 rounded-[2px] flex items-center gap-1">
                        <Bike className="w-3 h-3 text-[#2383e2]" />
                        <span>骑手专送中 (约{order.etaMinutes}m)</span>
                      </span>
                    )}
                    {isRefundPending && (
                      <span className="text-[11px] font-bold bg-[#fbe4e4] text-[#eb5757] border border-[#f0c3c3] px-2 py-0.5 rounded-[2px] flex items-center gap-1 animate-pulse">
                        <AlertTriangle className="w-3 h-3" />
                        <span>食客退单申请审核中</span>
                      </span>
                    )}
                    {isCompleted && (
                      <span className="text-[11px] font-bold bg-[#edf3ec] text-[#2b593f] border border-[#c4dcbc] px-2 py-0.5 rounded-[2px]">
                        ✓ 已妥投交付
                      </span>
                    )}
                    {isRefunded && (
                      <span className="text-[11px] font-bold bg-[#f1f1ef] text-[#787774] border border-[#d3d1cb] px-2 py-0.5 rounded-[2px]">
                        已全额退款取消
                      </span>
                    )}
                  </div>
                </div>

                {/* Refund Application Review Banner (When customer submits refund feedback) */}
                {isRefundPending && (
                  <div className="p-3 bg-[#fff1f0] border border-[#ffccc7] rounded-[3px] space-y-2 text-xs animate-in fade-in">
                    <div className="flex items-center justify-between font-bold text-[#cf1322]">
                      <span className="flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4" />
                        <span>食客提交售后退单申请（审核反馈中）</span>
                      </span>
                      <span className="text-[11px] font-mono text-[#787774]">
                        经过节点: {order.refundPassedStep === 0 ? '待接单阶段' : order.refundPassedStep === 1 ? '后厨制作中' : order.refundPassedStep === 2 ? '待骑手取件' : '配送中'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11.5px] bg-white/80 p-2 rounded-[2px] border border-[#ffa39e]">
                      <div>
                        <span className="text-[#787774]">退单原因: </span>
                        <strong className="text-[#37352f]">{order.refundReason || '食客点单信息变更'}</strong>
                      </div>
                      <div>
                        <span className="text-[#787774]">申请时间: </span>
                        <span className="font-mono text-[#5a5854]">{order.refundAppliedAt || '刚刚'}</span>
                      </div>
                      {order.refundFeedback && (
                        <div className="sm:col-span-2">
                          <span className="text-[#787774]">食客反馈说明: </span>
                          <span className="text-[#37352f] italic">"{order.refundFeedback}"</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setRefundRejectTarget(order)}
                        className="px-3 py-1 bg-white hover:bg-[#fff1f0] text-[#cf1322] border border-[#ffa39e] rounded-[3px] font-semibold text-xs cursor-pointer transition-all"
                      >
                        驳回退单申请
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApproveRefund(order)}
                        className="px-4 py-1 bg-[#cf1322] hover:bg-[#a8071a] text-white rounded-[3px] font-semibold text-xs cursor-pointer transition-all flex items-center gap-1 shadow-2xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>同意退单并原路退款</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Row 2: Content & Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Column 1: Items List */}
                  <div className="space-y-1 md:col-span-2">
                    <div className="bg-[#fbfbfa] p-2 rounded-[3px] border border-[#e6e6e4] space-y-1">
                      {order.items.map((it, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="text-[#37352f] font-semibold">{it.name}</span>
                          <span className="font-mono text-[#5a5854]">x{it.quantity}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-[#5a5854] pt-1">
                      <MapPin className="w-3.5 h-3.5 text-[#eb5757] shrink-0" />
                      <span className="truncate">{order.deliveryAddress}</span>
                    </div>
                  </div>

                  {/* Column 2: Right side info & actions */}
                  <div className="flex flex-col justify-between items-end gap-2 text-right">
                    <div>
                      <span className="text-base font-bold font-mono text-[#2b593f]">
                        ¥{order.totalAmount.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-[#787774] block">在线微信支付已清算</span>
                    </div>

                    {order.merchantNetPayout !== undefined ? (
                      <div className="bg-[#f7f7f5] border border-[#e6e6e4] px-2 py-1 rounded-[2px] text-[10px] text-right space-y-0.5">
                        <div className="text-[#2b593f] font-semibold">
                          餐车净得: <span className="font-bold">¥{order.merchantNetPayout.toFixed(2)}</span>
                        </div>
                        <div className="text-[#787774] font-mono">
                          骑手 ¥{(order.riderDeliveryFee || 0).toFixed(1)} · 佣金 ¥{(order.platformCommission || 0).toFixed(1)}
                        </div>
                      </div>
                    ) : null}

                    {order.courierName && (
                      <div className="text-[11px] text-[#5a5854] flex items-center gap-1">
                        <span>专送骑手: <strong>{order.courierName}</strong></span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 3: Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#efefed] flex-wrap">
                  <button
                    type="button"
                    onClick={() => setChatOrder(order)}
                    className="relative px-3 py-1.5 bg-[#181816] hover:bg-black text-white rounded-[3px] font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs group"
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <MessageSquare className="w-3.5 h-3.5 fill-white text-white" />
                    <span>气泡联络室 (三端互通)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReceiptOrder(order)}
                    className="px-3 py-1.5 bg-white hover:bg-[#efefed] text-[#37352f] border border-[#d3d1cb] rounded-[3px] font-semibold text-xs flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#787774]" />
                    <span>小票预览打印</span>
                  </button>

                  {/* 1. Pending Order Actions */}
                  {isPending && (
                    <>
                      <button
                        type="button"
                        onClick={() => setRejectOrderTarget(order)}
                        className="px-3 py-1.5 bg-[#fbe4e4] hover:bg-[#f0c3c3] text-[#eb5757] rounded-[3px] font-semibold text-xs flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>拒绝接单</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAcceptSingleOrder(order)}
                        className="px-4 py-1.5 bg-[#2b593f] hover:bg-[#204430] text-white rounded-[3px] font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-98"
                      >
                        <ChefHat className="w-3.5 h-3.5 text-[#86efac]" />
                        <span>接单制作 (进入后厨)</span>
                      </button>
                    </>
                  )}

                  {/* 2. Cooking Order Actions */}
                  {isCooking && !isRefundPending && (
                    <>
                      <button
                        type="button"
                        onClick={() => setRejectOrderTarget(order)}
                        className="px-3 py-1.5 bg-[#fbe4e4] hover:bg-[#f0c3c3] text-[#eb5757] rounded-[3px] font-semibold text-xs flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>商家主动退单</span>
                      </button>

                      {/* A. 堂食订单专有操作 (严禁显示呼叫骑手与骑手核销) */}
                      {isDineIn && (
                        <>
                          <button
                            type="button"
                            onClick={() => setAuditConvertTargetOrder(order)}
                            className="px-3 py-1.5 bg-[#f6effe] hover:bg-[#ebdcfc] text-[#7e22ce] border border-[#d8b4fe] rounded-[3px] font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                            title="顾客需临时改为外卖时，由商家核实人工审核转为骑手配送"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5 text-purple-700" />
                            <span>审核转为外卖专送</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              onAdvanceOrderStatus(order.orderNo || order.id, 'delivering', {
                                status: 'delivering',
                                stepIndex: 3,
                                statusText: '堂食陆续出餐上桌中'
                              });
                              showToast(`堂食订单 #${order.orderNo.replace('#', '')} 已制作完成，已通知传菜员送至 ${order.tableCode ? `${order.tableCode} 号桌` : '外摆台位'}！`);
                            }}
                            className="px-4 py-1.5 bg-[#d9730d] hover:bg-[#b55d06] text-white rounded-[3px] font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-98"
                          >
                            <Utensils className="w-3.5 h-3.5 text-white" />
                            <span>制作完成 · 传菜上桌</span>
                          </button>
                        </>
                      )}

                      {/* B. 到店自提专有操作 */}
                      {isPickup && (
                        <>
                          <button
                            type="button"
                            onClick={() => setVerifyTargetOrder(order)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[3px] font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-98"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>自提核销提餐</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              onAdvanceOrderStatus(order.orderNo || order.id, 'delivering', {
                                status: 'delivering',
                                stepIndex: 2,
                                statusText: '餐品已入保温柜待取'
                              });
                              showToast(`自提订单 #${order.orderNo.replace('#', '')} 制作完毕，已放入保温柜，通知食客凭取餐码取餐！`);
                            }}
                            className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-[3px] font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-98"
                          >
                            <ShoppingBag className="w-3.5 h-3.5 text-white" />
                            <span>出餐完成 · 放入保温柜</span>
                          </button>
                        </>
                      )}

                      {/* C. 外卖专送专有操作 (仅限外卖订单显示呼叫骑手与骑手核销) */}
                      {isDelivery && (
                        <>
                          <button
                            type="button"
                            onClick={() => setVerifyTargetOrder(order)}
                            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-[3px] font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-98"
                            title="输入骑手出示的取件码进行核销交付"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>骑手取件核销</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              onAdvanceOrderStatus(order.orderNo || order.id, 'delivering', {
                                status: 'delivering',
                                stepIndex: 3,
                                statusText: '专线骑手配送中'
                              });
                              showToast(`外卖订单 #${order.orderNo.replace('#', '')} 制作完成，已呼叫专线骑手取餐！`);
                            }}
                            className="px-4 py-1.5 bg-[#37352f] hover:bg-[#201f1d] text-white rounded-[3px] font-semibold text-xs flex items-center gap-1 cursor-pointer shadow-2xs active:scale-98"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#4dab63]" />
                            <span>制作完成 · 呼叫骑手</span>
                          </button>
                        </>
                      )}
                    </>
                  )}

                  {/* 3. Delivering / Serving Order Actions */}
                  {isDelivering && !isRefundPending && (
                    <>
                      {isDineIn ? (
                        <button
                          type="button"
                          onClick={() => {
                            onAdvanceOrderStatus(order.orderNo || order.id, 'completed', {
                              status: 'completed',
                              stepIndex: 4,
                              statusText: '餐品全齐·就餐完毕'
                            });
                            showToast(`堂食桌台 ${order.tableCode || 'A1'} 宾客就餐完毕，桌台已重置翻台！`);
                          }}
                          className="px-4 py-1.5 bg-[#2b593f] hover:bg-[#204430] text-white rounded-[3px] font-bold text-xs flex items-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                          <span>餐品齐备 · 结账翻台</span>
                        </button>
                      ) : isPickup ? (
                        <button
                          type="button"
                          onClick={() => {
                            onAdvanceOrderStatus(order.orderNo || order.id, 'completed', {
                              status: 'completed',
                              stepIndex: 4,
                              statusText: '顾客已自提离店'
                            });
                            showToast(`自提订单 #${order.orderNo.replace('#', '')} 顾客已提货，流程已结单！`);
                          }}
                          className="px-4 py-1.5 bg-[#2b593f] hover:bg-[#204430] text-white rounded-[3px] font-bold text-xs flex items-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                          <span>核销完成 · 顾客已自提</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            onAdvanceOrderStatus(order.orderNo || order.id, 'completed', {
                              status: 'completed',
                              stepIndex: 4,
                              statusText: '已送达妥投'
                            });
                            showToast(`外卖订单 #${order.orderNo.replace('#', '')} 骑手已妥投送达！`);
                          }}
                          className="px-4 py-1.5 bg-[#2b593f] hover:bg-[#204430] text-white rounded-[3px] font-semibold text-xs flex items-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                          <span>确认送达</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 1. Modal: 热敏小票云打印预览 (58mm 模拟) */}
      {receiptOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-sm rounded-[3px] border border-[#d3d1cb] shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3 bg-[#f7f7f5] border-b border-[#e6e6e4] flex items-center justify-between">
              <span className="font-bold text-sm text-[#37352f] flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#787774]" />
                <span>热敏小票云打印预览 (58mm)</span>
              </span>
              <button
                type="button"
                onClick={() => setReceiptOrder(null)}
                className="text-[#787774] hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Receipt Simulation Body */}
            <div className="p-4 bg-[#fbfbfa] text-xs font-mono space-y-3 max-h-[70vh] overflow-y-auto notion-scrollbar border-y border-[#e6e6e4]">
              <div className="text-center space-y-1">
                <p className="font-bold text-sm text-[#37352f]">黑曜石 01 号流动餐车</p>
                <p className="text-[11px] text-[#787774]">-- 线上外卖结账制作单 --</p>
              </div>

              <div className="border-t border-dashed border-[#d3d1cb] pt-2 space-y-1 text-[11px]">
                <p>单号: <strong>#{receiptOrder.orderNo.replace('#', '')}</strong></p>
                <p>时间: {receiptOrder.createdTime}</p>
                <p>渠道: 美团专送 / 闪送专线</p>
                <p>不可退单状态: {receiptOrder.nonRefundable ? '已锁定 (不可退单)' : '正常'}</p>
              </div>

              {/* Items */}
              <div className="border-t border-dashed border-[#d3d1cb] pt-2 space-y-1.5">
                <div className="flex justify-between font-bold text-[11px]">
                  <span>品名</span>
                  <span>数量</span>
                  <span>金额</span>
                </div>
                {receiptOrder.items.map((it, i) => (
                  <div key={i} className="flex justify-between text-[11px]">
                    <span className="truncate max-w-[140px]">{it.name}</span>
                    <span>x{it.quantity}</span>
                    <span>¥{(it.price * it.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-[#d3d1cb] pt-2 space-y-1 text-right">
                <p className="text-[11px]">包装费: ¥2.00</p>
                <p className="text-[11px]">配送费: ¥0.00 (首单免运)</p>
                <p className="font-bold text-sm text-[#2b593f] pt-1">
                  实付总额: ¥{receiptOrder.totalAmount.toFixed(2)}
                </p>
              </div>

              <div className="border-t border-dashed border-[#d3d1cb] pt-2 text-[11px] space-y-1">
                <p className="font-bold">送达地址:</p>
                <p className="text-[#5a5854]">{receiptOrder.deliveryAddress}</p>
              </div>

              <div className="border-t border-dashed border-[#d3d1cb] pt-2 text-center text-[10px] text-[#787774]">
                -- 感谢惠顾 · 期待再次光临 --
              </div>
            </div>

            <div className="p-3 bg-[#f7f7f5] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setReceiptOrder(null)}
                className="px-3 py-1.5 bg-white text-[#37352f] border border-[#d3d1cb] rounded-[3px] font-semibold cursor-pointer"
              >
                关闭
              </button>
              <button
                type="button"
                onClick={() => {
                  setReceiptOrder(null);
                  showToast(`已向热敏云打印机发送【${receiptOrder.orderNo}】打印指令！`);
                }}
                className="px-4 py-1.5 bg-[#37352f] text-white rounded-[3px] font-semibold cursor-pointer flex items-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>立即出票</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal: 拒单 / 主动退款 */}
      {rejectOrderTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-sm rounded-[3px] border border-[#d3d1cb] shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3 bg-[#fbe4e4] border-b border-[#f0c3c3] flex items-center justify-between text-[#eb5757]">
              <span className="font-bold text-sm flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>拒单与原路退款</span>
              </span>
              <button
                type="button"
                onClick={() => setRejectOrderTarget(null)}
                className="text-[#eb5757] hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <p className="text-[#5a5854]">
                正在对订单 <strong className="font-mono text-[#37352f]">#{rejectOrderTarget.orderNo.replace('#', '')}</strong> 进行拒单操作，退款将全额原路退还至顾客微信零钱。
              </p>

              <div className="space-y-1">
                <label className="font-semibold text-[#5a5854] block">选择拒单原因:</label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full p-2 bg-[#f7f7f5] border border-[#d3d1cb] rounded-[3px] focus:outline-none"
                >
                  <option value="食材售罄，无法现制">食材售罄，无法现制</option>
                  <option value="餐车爆单，出餐超时">餐车爆单，出餐超时</option>
                  <option value="超出餐车配送辐射范围">超出餐车配送辐射范围</option>
                  <option value="恶劣天气暂停外送">恶劣天气暂停外送</option>
                  <option value="食客电话联系退单">食客电话联系退单</option>
                </select>
              </div>
            </div>

            <div className="p-3 bg-[#f7f7f5] border-t border-[#e6e6e4] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectOrderTarget(null)}
                className="px-3 py-1.5 bg-white text-[#37352f] border border-[#d3d1cb] rounded-[3px] font-semibold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  onRejectOrder(rejectOrderTarget.id, rejectReason);
                  setRejectOrderTarget(null);
                  showToast(`已驳回订单 #${rejectOrderTarget.orderNo} 并原路发起退款`);
                }}
                className="px-4 py-1.5 bg-[#eb5757] hover:bg-[#d44343] text-white rounded-[3px] font-semibold cursor-pointer"
              >
                确认拒单退款
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal: 驳回食客退单申请 */}
      {refundRejectTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-sm rounded-[3px] border border-[#d3d1cb] shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3 bg-[#f7f7f5] border-b border-[#e6e6e4] flex items-center justify-between text-[#37352f]">
              <span className="font-bold text-sm flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-[#d9730d]" />
                <span>驳回食客退单申请</span>
              </span>
              <button
                type="button"
                onClick={() => setRefundRejectTarget(null)}
                className="text-[#787774] hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <p className="text-[#5a5854]">
                正在驳回订单 <strong className="font-mono text-[#37352f]">#{refundRejectTarget.orderNo.replace('#', '')}</strong> 的退款申请。驳回后订单将恢复正常出餐/配送流程并通知食客。
              </p>

              <div className="space-y-1">
                <label className="font-semibold text-[#5a5854] block">填写驳回原因说明:</label>
                <textarea
                  rows={3}
                  value={refundRejectReason}
                  onChange={(e) => setRefundRejectReason(e.target.value)}
                  placeholder="例如：餐品已下锅高温炙烤，无法中途取消..."
                  className="w-full p-2 bg-[#f7f7f5] border border-[#d3d1cb] rounded-[3px] focus:outline-none text-xs"
                />
              </div>
            </div>

            <div className="p-3 bg-[#f7f7f5] border-t border-[#e6e6e4] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRefundRejectTarget(null)}
                className="px-3 py-1.5 bg-white text-[#37352f] border border-[#d3d1cb] rounded-[3px] font-semibold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleRejectRefundSubmit}
                className="px-4 py-1.5 bg-[#37352f] hover:bg-[#201f1d] text-white rounded-[3px] font-semibold cursor-pointer"
              >
                确认驳回申请
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 2. Modal: 订单三端即时气泡联络室 (商家控制台视窗) */}
      {chatOrder && (
        <UnifiedOmniChatModal
          isOpen={!!chatOrder}
          onClose={() => setChatOrder(null)}
          order={chatOrder}
          orderNo={chatOrder.orderNo}
          viewerRole="merchant"
          onAdvanceOrderStatus={onAdvanceOrderStatus}
          onAcceptOrder={onAcceptOrder}
          onRejectOrder={onRejectOrder}
          onAuditRefund={onAuditRefund}
          showToast={showToast}
        />
      )}

      {/* 3. Modal: 骑手取件核销弹窗 */}
      {verifyTargetOrder && (
        <MerchantPickupVerifyModal
          isOpen={!!verifyTargetOrder}
          onClose={() => setVerifyTargetOrder(null)}
          order={verifyTargetOrder}
          onVerifySuccess={(orderId, pickupCode) => {
            onAdvanceOrderStatus(verifyTargetOrder.orderNo || orderId, 'delivering', {
              status: 'delivering',
              stepIndex: 3,
              statusText: '专线骑手配送中',
              pickupVerifiedAt: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
              pickupVerifiedBy: '餐车扫码核销'
            });
            showToast(`订单 #${verifyTargetOrder.orderNo.replace('#', '')} 取件码 ${pickupCode} 验证成功，已交由骑手专送！`);
          }}
          showToast={showToast}
        />
      )}

      {/* 5. Modal: 堂食转外卖专送人工审核弹窗 */}
      {auditConvertTargetOrder && (
        <MerchantAuditConvertToDeliveryModal
          order={auditConvertTargetOrder}
          isOpen={Boolean(auditConvertTargetOrder)}
          onClose={() => setAuditConvertTargetOrder(null)}
          onConfirmConvert={handleConfirmConvertToDelivery}
        />
      )}
    </div>
  );
};

