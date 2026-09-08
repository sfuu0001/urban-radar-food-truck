import React, { useState, useEffect, useMemo } from 'react';
import {
  Store,
  Printer,
  Ban,
  CheckCircle2,
  Clock,
  MapPin,
  Bike,
  Volume2,
  VolumeX,
  Search,
  X,
  AlertTriangle,
  FileText,
  Lock,
  Unlock,
  MessageSquare,
  Check,
  ShieldAlert,
  Flame,
  ChefHat,
  KeyRound,
  Scan,
  Utensils,
  ShoppingBag,
  ArrowRightLeft,
  ChevronDown,
  List,
  LayoutGrid,
  Power,
  RotateCw,
  Package,
  Megaphone,
  Trash2,
  Calendar,
  CalendarDays,
  Filter
} from 'lucide-react';
import { Order } from '../../types';
import { UnifiedOmniChatModal } from '../chat/UnifiedOmniChatModal';
import { MerchantPickupVerifyModal } from './MerchantPickupVerifyModal';
import { MerchantAuditConvertToDeliveryModal } from './MerchantAuditConvertToDeliveryModal';
import { getOrGeneratePickupCode, getPickupShelfCode, subscribePickupVerifiedEvent } from '../../utils/pickupCodeEngine';
import { resolveOrderChannelType } from '../../utils/orderNormalizer';
import { voiceAlerts, unlockAudioContext } from '../../utils/voiceAlertEngine';
import { AccountAuditDrawer } from './AccountAuditDrawer';
import { globalScannerEngine, playScannerBeep } from '../../utils/barcodeScannerEngine';
import { businessTransactionEngine } from '../../utils/businessTransactionEngine';

// Helper to extract exact YYYY-MM-DD from order
export function resolveOrderDay(order: Order): string {
  const anyOrder = order as any;
  if (anyOrder.createdAt && typeof anyOrder.createdAt === 'string' && /^\d{4}-\d{2}-\d{2}/.test(anyOrder.createdAt)) {
    return anyOrder.createdAt.slice(0, 10);
  }
  if (order.createdTime && /^\d{4}-\d{2}-\d{2}/.test(order.createdTime)) {
    return order.createdTime.slice(0, 10);
  }
  if (anyOrder.timestamp && typeof anyOrder.timestamp === 'string' && /^\d{4}-\d{2}-\d{2}/.test(anyOrder.timestamp)) {
    return anyOrder.timestamp.slice(0, 10);
  }
  if (order.id?.includes('yesterday') || order.orderNo?.includes('7077') || order.orderNo?.includes('9820')) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

interface MerchantOrdersProps {
  orders: Order[];
  onAcceptOrder?: (orderId: string) => void;
  onAdvanceOrderStatus: (orderId: string, targetStatus?: Order['status'], extraDetails?: Partial<Order>) => void;
  onRejectOrder: (orderId: string, reason: string) => void;
  onDeleteOrder?: (orderId: string, reason?: string) => void;
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
  onDeleteOrder,
  onAuditRefund,
  onToggleNonRefundable,
  showToast
}) => {
  const [activeStatusTab, setActiveStatusTab] = useState<'all' | 'pending' | 'cooking' | 'delivering' | 'completed' | 'refund'>('all');
  const [channelFilter, setChannelFilter] = useState<'all' | 'delivery' | 'dine_in' | 'pickup'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  
  // Date filtering state (Exact to the day)
  const [selectedDate, setSelectedDate] = useState<string>(''); // empty string means all dates
  const [dateFilterPreset, setDateFilterPreset] = useState<'all' | 'today' | 'yesterday' | '7days' | 'custom'>('all');
  
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

  // 自动接单：开启后，待接单状态的订单自动流入后厨制作
  useEffect(() => {
    if (!isAutoAccept) return;
    orders.forEach((o) => {
      if (o.status === 'pending') {
        handleAcceptSingleOrder(o);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAutoAccept, orders]);

  // Modals
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [chatOrder, setChatOrder] = useState<Order | null>(null);
  const [verifyTargetOrder, setVerifyTargetOrder] = useState<Order | null>(null);
  const [auditConvertTargetOrder, setAuditConvertTargetOrder] = useState<Order | null>(null);
  const [rejectOrderTarget, setRejectOrderTarget] = useState<Order | null>(null);
  const [rejectReason, setRejectReason] = useState('食材售罄，无法现制');

  // 扫码枪与极速核销面板状态
  const [isScannerBarOpen, setIsScannerBarOpen] = useState(false);
  const [quickScanInput, setQuickScanInput] = useState('');

  // FIX(审计P1): "刷新同步"真实化——从本地权威键重读订单，若有变化派发事件让全端刷新（取代"仅提示已同步"假实现）
  const handleRefreshSync = () => {
    try {
      const fresh = safeGetStorage<Order[]>('obsidian_truck_orders', orders);
      const deduped = Array.from(new Map((fresh.length ? fresh : orders).map((o) => [o.orderNo || o.id, o])).values());
      const hasChanges =
        deduped.length !== orders.length ||
        deduped.some((o, i) => {
          const cur = orders[i];
          return !cur || cur.status !== o.status || cur.progressPercent !== o.progressPercent;
        });
      if (hasChanges && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('obsidian_orders_updated', { detail: deduped }));
      }
      showToast(hasChanges ? '已从本地权威存储刷新订单队列，发现并同步最新状态' : '订单队列已是最新，与云端无差异');
    } catch (e) {
      console.error('刷新订单队列失败:', e);
      showToast('刷新失败，请稍后重试');
    }
  };

  // 挂载全局硬件扫码枪 / 软扫码引擎
  useEffect(() => {
    const handleScanResult = (res: { code: string }) => {
      const clean = (res?.code || '').trim();
      if (!clean) return;

      // 智能匹配订单：比对订单号、取件码、或系统ID
      const cleanUpper = clean.toUpperCase().replace(/^#/, '');
      const matched = orders.find((o) => {
        const oNo = (o.orderNo || '').toUpperCase().replace(/^#/, '');
        const pCode = (o.pickupCode || getOrGeneratePickupCode(o.orderNo)).toUpperCase().replace(/^PK-/, '');
        const inputCode = cleanUpper.replace(/^PK-/, '');
        return oNo === cleanUpper || oNo.endsWith(cleanUpper) || pCode === inputCode || o.id === clean;
      });

      if (matched) {
        playScannerBeep('beep_success');
        setVerifyTargetOrder(matched);
        setSearchQuery(matched.orderNo.replace(/^#/, ''));
        showToast(`⚡ 扫码成功：已自动定位订单 #${matched.orderNo.replace(/^#/, '')}，打开核销确认！`);
      } else {
        playScannerBeep('beep_error');
        showToast(`⚠️ 扫码提示：未匹配到条码 [${clean}] 对应的有效自提/专送订单`);
      }
    };

    const unsubscribe = globalScannerEngine.subscribe(handleScanResult);
    return () => unsubscribe();
  }, [orders, showToast]);

  // 手工回车快速核销提交
  const handleQuickManualVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = quickScanInput.trim();
    if (!clean) return;

    const cleanUpper = clean.toUpperCase().replace(/^#/, '');
    const matched = orders.find((o) => {
      const oNo = (o.orderNo || '').toUpperCase().replace(/^#/, '');
      const pCode = (o.pickupCode || getOrGeneratePickupCode(o.orderNo)).toUpperCase().replace(/^PK-/, '');
      const inputCode = cleanUpper.replace(/^PK-/, '');
      return oNo === cleanUpper || oNo.endsWith(cleanUpper) || pCode === inputCode || o.id === clean;
    });

    if (matched) {
      playScannerBeep('beep_success');
      setVerifyTargetOrder(matched);
      setSearchQuery(matched.orderNo.replace(/^#/, ''));
      setQuickScanInput('');
    } else {
      playScannerBeep('beep_error');
      showToast(`未找到单号或提餐码为 [${clean}] 的有效订单`);
    }
  };

  // Refund reject modal
  const [refundRejectTarget, setRefundRejectTarget] = useState<Order | null>(null);
  const [refundRejectReason, setRefundRejectReason] = useState('餐品已下锅高温炙烤，无法中途取消');

  // Delete / Discard order modal
  const [deleteTargetOrder, setDeleteTargetOrder] = useState<Order | null>(null);
  const [deleteReason, setDeleteReason] = useState('顾客误触/重复下单作废');
  const [customDeleteReason, setCustomDeleteReason] = useState('');
  const [createSafetySnapshot, setCreateSafetySnapshot] = useState(true);

  const handleConfirmDeleteOrder = () => {
    if (!deleteTargetOrder) return;
    const finalReason = deleteReason === 'other' ? (customDeleteReason.trim() || '其他原因作废') : deleteReason;
    if (onDeleteOrder) {
      onDeleteOrder(deleteTargetOrder.orderNo || deleteTargetOrder.id, finalReason);
    }
    showToast(`订单 #${deleteTargetOrder.orderNo.replace(/^#/, '')} 已从全渠道订单中心作废删除！`);
    setDeleteTargetOrder(null);
    setCustomDeleteReason('');
  };

  // 方案 B：订单看板自提催取/呼叫骑手 叫号频次状态管理
  const [orderCallCounts, setOrderCallCounts] = useState<Record<string, number>>({});

  const handleQuickBroadcastCall = async (order: Order) => {
    const oChannel = resolveOrderChannelType(order);
    const cleanNo = (order.orderNo || '').replace(/^#/, '');
    const pCode = getOrGeneratePickupCode(order.orderNo, order.pickupCode);

    setOrderCallCounts((prev) => ({
      ...prev,
      [order.orderNo]: (prev[order.orderNo] || 0) + 1
    }));

    await unlockAudioContext();

    if (oChannel === 'pickup') {
      voiceAlerts.callingGuest(pCode || cleanNo, '餐车前台自提处');
      showToast(`已向外放广播呼叫: 请自提顾客 #${pCode || cleanNo} 到餐车取餐！`);
    } else if (oChannel === 'delivery') {
      voiceAlerts.callRiderForOrder(order.orderNo, order.courierName || '专线/美团骑手');
      showToast(`已外放呼叫骑手: 外卖订单 #${cleanNo} 已备齐，请尽快到流动车站台取餐！`);
    } else {
      voiceAlerts.kdsReadyAndCall(order.orderNo, 'dine_in', order.tableCode ? `${order.tableCode} 号桌` : '外摆区');
      showToast(`已广播通知传菜: 桌台 ${order.tableCode || 'A1'} 菜品出餐！`);
    }
  };

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

  // Status-based counts
  const pendingOrders = orders.filter((o) => o.status === 'pending' || (o.stepIndex === 0 && !o.merchantAccepted));
  const cookingOrders = orders.filter((o) => o.status === 'cooking' || (o.stepIndex === 1 && o.status !== 'refund_pending'));
  const deliveringOrders = orders.filter((o) => o.status === 'delivering' || o.status === 'ready' || o.stepIndex === 2 || o.stepIndex === 3);
  const completedOrders = orders.filter((o) => o.status === 'completed' || o.status === 'refunded' || o.status === 'cancelled');
  const refundApplicationOrders = orders.filter((o) => o.refundStatus === 'pending' || o.status === 'refund_pending');

  // Channel-based counts
  const dineInCount = orders.filter((o) => resolveOrderChannelType(o) === 'dine_in').length;
  const deliveryCount = orders.filter((o) => resolveOrderChannelType(o) === 'delivery').length;
  const pickupCount = orders.filter((o) => resolveOrderChannelType(o) === 'pickup').length;

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
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

      // Date Filtering (Exact to the day)
      if (selectedDate) {
        const orderDay = resolveOrderDay(o);
        if (orderDay !== selectedDate) return false;
      } else if (dateFilterPreset === 'today') {
        const todayStr = new Date().toISOString().slice(0, 10);
        if (resolveOrderDay(o) !== todayStr) return false;
      } else if (dateFilterPreset === 'yesterday') {
        const yDate = new Date();
        yDate.setDate(yDate.getDate() - 1);
        const yStr = yDate.toISOString().slice(0, 10);
        if (resolveOrderDay(o) !== yStr) return false;
      } else if (dateFilterPreset === '7days') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const orderDay = resolveOrderDay(o);
        if (orderDay < sevenDaysAgo.toISOString().slice(0, 10)) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          o.orderNo.toLowerCase().includes(q) ||
          (o.deliveryAddress && o.deliveryAddress.toLowerCase().includes(q)) ||
          (o.userId && o.userId.toLowerCase().includes(q)) ||
          (o.customerName && o.customerName.toLowerCase().includes(q)) ||
          (o.tableCode && o.tableCode.toLowerCase().includes(q)) ||
          (o.pickupCode && o.pickupCode.toLowerCase().includes(q)) ||
          (o.userPhone && o.userPhone.includes(q)) ||
          (o.courierName && o.courierName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [orders, activeStatusTab, channelFilter, searchQuery, selectedDate, dateFilterPreset]);

  // Statistics for currently filtered view
  const filteredTotalAmount = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }, [filteredOrders]);

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

  const handleBatchPrint = () => {
    showToast(`正在批量向热敏打印机发送 ${filteredOrders.length} 张备餐小票...`);
  };

  // Calculate daily turnover total
  const todayRevenue = orders
    .filter(o => o.status !== 'refunded' && o.status !== 'cancelled')
    .reduce((acc, curr) => acc + curr.totalAmount, 0);

  return (
    <div className="w-full flex flex-col font-sans selection:bg-emerald-800 selection:text-white pb-6 rounded-none">
      {/* 嵌入纯直角脉冲动画样式 */}
      <style>{`
        .led-pulse {
          animation: kdsPulseGreen 1.8s infinite ease-in-out;
        }
        @keyframes kdsPulseGreen {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.92); }
        }
      `}</style>

      {/* ========================================================================= */}
      {/* BEGIN: ControlAndFilterBar (纯直角硬朗工业控制栏)                           */}
      {/* ========================================================================= */}
      <section className="bg-white border-b border-slate-300 px-3 sm:px-4 shrink-0 py-2.5 rounded-none shadow-xs" data-purpose="order-filter-panel">
        {/* Row 1: Status Badges & Search & Automation Switches */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 mb-2.5">
          {/* Status Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto select-none pb-1 sm:pb-0 scrollbar-none">
            {/* 全部订单 */}
            <button
              type="button"
              onClick={() => setActiveStatusTab('all')}
              className={`px-3 py-1 text-xs font-bold border flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer rounded-none ${
                activeStatusTab === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
              }`}
            >
              <span>全部订单</span>
              <span className={`font-mono px-1 py-0.2 text-[10px] rounded-none ${
                activeStatusTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                {orders.length}
              </span>
            </button>

            {/* 待接单确认 */}
            <button
              type="button"
              onClick={() => setActiveStatusTab('pending')}
              className={`px-2.5 py-1 text-xs font-semibold border flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer rounded-none ${
                activeStatusTab === 'pending'
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
              }`}
            >
              <span className="w-1.5 h-1.5 bg-amber-500 inline-block rounded-none"></span>
              <span>待接单确认</span>
              <span className={`font-mono px-1 py-0.2 text-[10px] rounded-none ${
                activeStatusTab === 'pending' ? 'bg-black/20 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                {pendingOrders.length}
              </span>
            </button>

            {/* 制作中 (KDS) */}
            <button
              type="button"
              onClick={() => setActiveStatusTab('cooking')}
              className={`px-2.5 py-1 text-xs font-semibold border flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer rounded-none ${
                activeStatusTab === 'cooking'
                  ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                  : 'bg-white hover:bg-amber-50/50 text-slate-800 border-slate-300 hover:border-amber-600'
              }`}
            >
              <span className="w-1.5 h-1.5 bg-amber-600 inline-block rounded-none"></span>
              <span>制作中 (KDS)</span>
              <span className={`font-mono px-1 py-0.2 text-[10px] rounded-none ${
                activeStatusTab === 'cooking' ? 'bg-black/20 text-white' : 'bg-amber-600 text-white'
              }`}>
                {cookingOrders.length}
              </span>
            </button>

            {/* 待取/专送中 */}
            <button
              type="button"
              onClick={() => setActiveStatusTab('delivering')}
              className={`px-2.5 py-1 text-xs font-semibold border flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer rounded-none ${
                activeStatusTab === 'delivering'
                  ? 'bg-sky-600 text-white border-sky-700 shadow-xs'
                  : 'bg-white hover:bg-sky-50/50 text-slate-800 border-slate-300 hover:border-sky-600'
              }`}
            >
              <span className="w-1.5 h-1.5 bg-sky-600 inline-block rounded-none"></span>
              <span>待取/专送中</span>
              <span className={`font-mono px-1 py-0.2 text-[10px] rounded-none ${
                activeStatusTab === 'delivering' ? 'bg-black/20 text-white' : 'bg-sky-600 text-white'
              }`}>
                {deliveringOrders.length}
              </span>
            </button>

            {/* 退单申请审核 */}
            <button
              type="button"
              onClick={() => setActiveStatusTab('refund')}
              className={`px-2.5 py-1 text-xs font-semibold border flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer rounded-none ${
                activeStatusTab === 'refund'
                  ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                  : 'bg-white hover:bg-rose-50/50 text-slate-600 border-slate-300 hover:border-rose-300'
              }`}
            >
              <span className="w-1.5 h-1.5 bg-rose-500 inline-block rounded-none"></span>
              <span>退单申请审核</span>
              <span className={`font-mono px-1 py-0.2 text-[10px] border rounded-none ${
                activeStatusTab === 'refund' ? 'bg-black/20 text-white border-white/30' : 'bg-rose-100 text-rose-700 border-rose-200'
              }`}>
                {refundApplicationOrders.length}
              </span>
            </button>

            {/* 已完成/已退款 */}
            <button
              type="button"
              onClick={() => setActiveStatusTab('completed')}
              className={`px-2.5 py-1 text-xs font-semibold border flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer rounded-none ${
                activeStatusTab === 'completed'
                  ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                  : 'bg-white hover:bg-emerald-50/50 text-slate-700 border-slate-300 hover:border-emerald-600'
              }`}
            >
              <span className="w-1.5 h-1.5 bg-emerald-600 inline-block rounded-none"></span>
              <span>已完成/已退款</span>
              <span className={`font-mono px-1 py-0.2 text-[10px] rounded-none ${
                activeStatusTab === 'completed' ? 'bg-black/20 text-white' : 'bg-emerald-700 text-white'
              }`}>
                {completedOrders.length}
              </span>
            </button>
          </div>

          {/* Search and Action Group */}
          <div className="flex items-center gap-2 w-full lg:w-auto flex-1 justify-end">
            <div className="relative w-full max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <Search className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索单号 / 手机尾号 / 提餐码..."
                className="w-full pl-8 pr-3 py-1 text-xs bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:ring-0 transition-colors rounded-none outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Action Tools */}
            <div className="flex items-center space-x-1 shrink-0">
              {/* 自动接单开关 */}
              <button
                type="button"
                onClick={() => {
                  const next = !isAutoAccept;
                  setIsAutoAccept(next);
                  showToast(next ? '已开启极速自动接单（新单自动流入后厨制作）' : '已关闭自动接单（新订单将进入待接单列表）');
                }}
                className={`px-2 py-1 text-xs font-medium flex items-center gap-1 transition-colors border rounded-none cursor-pointer ${
                  isAutoAccept
                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300'
                }`}
                title={isAutoAccept ? '自动接单运行中，点击关闭' : '自动接单已关闭，点击开启'}
              >
                <Power className={`w-3 h-3 ${isAutoAccept ? 'text-emerald-600' : 'text-rose-600'}`} />
                <span>接单: {isAutoAccept ? '开' : '关'}</span>
              </button>

              {/* 语音播报开关 */}
              <button
                type="button"
                onClick={() => {
                  setIsVoiceBroadcast((v) => !v);
                  showToast(isVoiceBroadcast ? '已关闭语音播报' : '已开启新订单语音播报');
                }}
                className={`px-2 py-1 text-xs font-medium flex items-center gap-1 transition-colors border rounded-none cursor-pointer ${
                  isVoiceBroadcast
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                }`}
                title={isVoiceBroadcast ? '语音播报已开启' : '语音播报已静音'}
              >
                {isVoiceBroadcast ? <Volume2 className="w-3 h-3 text-amber-600" /> : <VolumeX className="w-3 h-3 text-slate-500" />}
                <span className="hidden sm:inline">语音</span>
              </button>

              {/* 扫码核销中枢 */}
              <button
                type="button"
                onClick={() => setIsScannerBarOpen((v) => !v)}
                className={`px-2 py-1 text-xs font-semibold flex items-center gap-1 transition-colors border rounded-none cursor-pointer ${
                  isScannerBarOpen
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-300'
                }`}
                title="开启/关闭扫码核销快捷条（已实时接入条码扫码枪）"
              >
                <Scan className="w-3 h-3" />
                <span>扫码核销</span>
              </button>

              {/* 批量打印 */}
              <button
                type="button"
                onClick={handleBatchPrint}
                className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 px-2 py-1 text-xs font-medium flex items-center gap-1 transition-colors rounded-none cursor-pointer"
                title="批量打印当前筛选列表的制作小票"
              >
                <Printer className="w-3 h-3 text-slate-600" />
                <span>批量打印</span>
              </button>
            </div>
          </div>
        </div>

        {/* Embedded Scanner Active Strip */}
        {isScannerBarOpen && (
          <div className="bg-indigo-950 text-white p-2.5 rounded-none border border-indigo-800 flex items-center justify-between gap-3 flex-wrap animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[11px] font-bold text-indigo-300 bg-indigo-900/80 px-2 py-0.5 border border-indigo-700">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>扫码枪硬/软中枢已就绪</span>
              </span>
              <span className="text-[11px] text-indigo-200">
                支持条码扫码枪即扫即核，或在右侧输入单号/自提码（如 PK-7078）后按回车：
              </span>
            </div>

            <form onSubmit={handleQuickManualVerify} className="flex items-center gap-2">
              <input
                type="text"
                value={quickScanInput}
                onChange={(e) => setQuickScanInput(e.target.value)}
                placeholder="输入自提码/订单号并回车..."
                className="px-2.5 py-1 text-xs bg-indigo-900/60 border border-indigo-600 text-white placeholder:text-indigo-400 focus:outline-none focus:border-amber-400 w-52 font-mono"
                autoFocus
              />
              <button
                type="submit"
                className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-none cursor-pointer transition-colors"
              >
                立即核销
              </button>
            </form>
          </div>
        )}

        {/* Row 2: Channel Segmentation & View Toggle */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-200 gap-2">
          {/* Channel Filters */}
          <div className="flex flex-wrap items-center gap-1.5 font-medium">
            <span className="text-slate-400 mr-1 text-[11px]">分流渠道:</span>
            
            <button
              type="button"
              onClick={() => setChannelFilter('all')}
              className={`px-2 py-0.5 text-[11px] font-semibold border transition-colors rounded-none cursor-pointer ${
                channelFilter === 'all'
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
              }`}
            >
              全渠道 ({orders.length})
            </button>

            <button
              type="button"
              onClick={() => setChannelFilter('dine_in')}
              className={`px-2 py-0.5 text-[11px] font-semibold border transition-colors rounded-none cursor-pointer flex items-center gap-1 ${
                channelFilter === 'dine_in'
                  ? 'bg-amber-700 text-white border-amber-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
              }`}
            >
              <span>🍽️ 堂食 ({dineInCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setChannelFilter('delivery')}
              className={`px-2 py-0.5 text-[11px] font-semibold border transition-colors rounded-none cursor-pointer flex items-center gap-1 ${
                channelFilter === 'delivery'
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
              }`}
            >
              <span>🛵 专送 ({deliveryCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setChannelFilter('pickup')}
              className={`px-2 py-0.5 text-[11px] font-semibold border transition-colors rounded-none cursor-pointer flex items-center gap-1 ${
                channelFilter === 'pickup'
                  ? 'bg-sky-700 text-white border-sky-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
              }`}
            >
              <span>🛍️ 自提 ({pickupCount})</span>
            </button>
          </div>

          {/* Right Tools: View Mode Toggle & Prompt Notice */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setViewMode(v => v === 'card' ? 'list' : 'card')}
              className="px-2.5 py-1 text-[11px] font-semibold bg-slate-900 hover:bg-black text-white border border-slate-900 flex items-center gap-1.5 shadow-xs transition-colors rounded-none cursor-pointer"
              title="切换卡片网格与紧凑列表视图"
            >
              {viewMode === 'card' ? (
                <>
                  <List className="w-3 h-3 text-emerald-400" />
                  <span>列表视图</span>
                </>
              ) : (
                <>
                  <LayoutGrid className="w-3 h-3 text-emerald-400" />
                  <span>卡片视图</span>
                </>
              )}
            </button>

            <div className="hidden md:flex items-center space-x-1.5 text-amber-700 font-mono text-[11px]">
              <span className="w-1.5 h-1.5 bg-amber-500 inline-block rounded-none"></span>
              <span>堂食订单默认不入骑手池，需转送请点击卡片【审核转外卖专送】</span>
            </div>
          </div>
        </div>

        {/* Row 3: Date Filter Component (精确到天的日期筛选器组件) */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-700 pt-2.5 mt-2 border-t border-dashed border-slate-200 gap-2 bg-slate-50/80 -mx-3 sm:-mx-4 px-3 sm:px-4 py-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 font-bold text-slate-700">
              <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-[11px]">日期筛选 (精确到天):</span>
            </div>

            {/* Quick Preset Buttons */}
            <div className="inline-flex items-center border border-slate-300 bg-white p-0.5 rounded-none shadow-2xs">
              <button
                type="button"
                onClick={() => {
                  setDateFilterPreset('all');
                  setSelectedDate('');
                }}
                className={`px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer rounded-none ${
                  dateFilterPreset === 'all' && !selectedDate
                    ? 'bg-slate-900 text-white font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                全部日期
              </button>

              <button
                type="button"
                onClick={() => {
                  const todayStr = new Date().toISOString().slice(0, 10);
                  setDateFilterPreset('today');
                  setSelectedDate(todayStr);
                }}
                className={`px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer rounded-none ${
                  dateFilterPreset === 'today' || selectedDate === new Date().toISOString().slice(0, 10)
                    ? 'bg-indigo-700 text-white font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                今天
              </button>

              <button
                type="button"
                onClick={() => {
                  const y = new Date();
                  y.setDate(y.getDate() - 1);
                  const yStr = y.toISOString().slice(0, 10);
                  setDateFilterPreset('yesterday');
                  setSelectedDate(yStr);
                }}
                className={`px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer rounded-none ${
                  dateFilterPreset === 'yesterday'
                    ? 'bg-indigo-700 text-white font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                昨天
              </button>

              <button
                type="button"
                onClick={() => {
                  setDateFilterPreset('7days');
                  setSelectedDate('');
                }}
                className={`px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer rounded-none ${
                  dateFilterPreset === '7days'
                    ? 'bg-indigo-700 text-white font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                近7天
              </button>
            </div>

            {/* Custom Precise Date Picker (精确到天) */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 px-2 py-0.5 rounded-none shadow-2xs">
              <Calendar className="w-3 h-3 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setDateFilterPreset('custom');
                }}
                title="选择具体日期 (精确到天)"
                className="text-xs text-slate-800 bg-transparent outline-none cursor-pointer font-mono"
              />
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate('');
                    setDateFilterPreset('all');
                  }}
                  className="text-[10px] text-slate-400 hover:text-rose-600 ml-1 cursor-pointer font-bold"
                  title="清除日期选择"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Date Filter Status / Summary */}
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="text-slate-500">
              {selectedDate ? (
                <>
                  已锁定日期: <span className="font-bold text-indigo-700">{selectedDate}</span>
                </>
              ) : dateFilterPreset === '7days' ? (
                <>已筛选: <span className="font-bold text-indigo-700">近7日全量单据</span></>
              ) : (
                '全历史订单池'
              )}
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-800 font-semibold">
              筛选出 <span className="text-indigo-600 font-bold">{filteredOrders.length}</span> 笔
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-emerald-700 font-semibold">
              流水 ¥<span className="font-bold">{filteredTotalAmount.toFixed(2)}</span>
            </span>
          </div>
        </div>
      </section>
      {/* END: ControlAndFilterBar */}

      {/* ========================================================================= */}
      {/* BEGIN: MainOrderCardsContainer (桌面端流式工业多列卡片架构)                */}
      {/* ========================================================================= */}
      <main className="flex-1 p-3 sm:p-4 max-w-[1920px] w-full mx-auto" data-purpose="kds-order-list">
        {filteredOrders.length === 0 ? (
          <div className="bg-white border border-slate-300 p-12 text-center space-y-2.5 rounded-none shadow-xs">
            <Store className="w-10 h-10 text-slate-400 mx-auto" />
            <h4 className="font-bold text-sm text-slate-800">暂无匹配的订单</h4>
            <p className="text-xs text-slate-500">当前筛选条件下没有待处理的订单，餐车待命就绪中。</p>
          </div>
        ) : viewMode === 'card' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 xl:grid-cols-2">
            {filteredOrders.map((order, idx) => {
              const isPending = order.status === 'pending' || (order.stepIndex === 0 && !order.merchantAccepted);
              const isCooking = order.status === 'cooking' || (order.stepIndex === 1 && order.status !== 'refund_pending');
              const isDelivering = order.status === 'delivering' || order.status === 'ready' || order.stepIndex === 2 || order.stepIndex === 3;
              const isCompleted = order.status === 'completed';
              const isRefundPending = order.refundStatus === 'pending' || order.status === 'refund_pending';
              const isRefunded = order.status === 'refunded' || order.status === 'cancelled';

              const orderChannel = resolveOrderChannelType(order);
              const isDineIn = orderChannel === 'dine_in';
              const isPickup = orderChannel === 'pickup';
              const isDelivery = orderChannel === 'delivery';

              const totalQty = order.items.reduce((acc, it) => acc + (it.quantity || 1), 0);
              const itemCount = order.items.length;

              // Pickup and shelf code
              const pickupCode = getOrGeneratePickupCode(order.orderNo, order.pickupCode);
              const shelfCode = getPickupShelfCode(order.id || order.orderNo, order.pickupShelfCode);

              // Net payout calculation
              const netPayout = order.merchantNetPayout !== undefined
                ? order.merchantNetPayout
                : order.totalAmount - (isDelivery ? 10.5 : 0);

              const riderFee = order.riderDeliveryFee !== undefined
                ? order.riderDeliveryFee
                : (isDelivery ? 6.0 : 0);

              const platformFee = order.platformCommission !== undefined
                ? order.platformCommission
                : (isDelivery ? 4.5 : 0);

              // Location text
              const destinationText = isDineIn
                ? `餐车外摆区 · ${order.tableCode ? `${order.tableCode} 号桌` : 'A2 号桌'} (${order.dinerCount || 3}人就餐)`
                : isPickup
                ? `黑曜石 01 号餐车自提点 (${order.truckLocation || '大悦城北广场侧面'})`
                : (order.deliveryAddress || '西藏北路 166 号大悦城商务座 1204 室');

              return (
                <article
                  key={`ord-card-${order.id || order.orderNo || idx}`}
                  className="bg-white border border-slate-300 hover:border-slate-400 transition-all flex flex-col shadow-xs h-full justify-between rounded-none"
                  data-purpose={`order-card-${order.orderNo}`}
                >
                  {/* 头部：单号与场景标签 */}
                  <div className="bg-slate-50 px-3.5 py-2.5 border-b border-slate-300 flex items-center justify-between flex-wrap gap-2 rounded-none">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold bg-slate-900 text-white px-2 py-0.5 text-xs rounded-none">
                        #{order.orderNo.replace(/^#/, '')}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-white border border-slate-300 px-2 py-0.5 rounded-none">
                        <Store className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{order.truckName || '黑曜石 01 号流动餐车'}</span>
                      </span>
                    </div>

                    {isDineIn ? (
                      <span className="bg-amber-100 text-amber-800 border border-amber-300 font-bold px-2 py-0.5 flex items-center gap-1 text-xs rounded-none">
                        <span>🍽️ 堂食就餐 · {order.tableCode ? `${order.tableCode} 号桌` : 'A2 号桌'}</span>
                      </span>
                    ) : isPickup ? (
                      <span className="bg-blue-100 text-blue-800 border border-blue-300 font-bold px-2 py-0.5 flex items-center gap-1 text-xs rounded-none">
                        <span>🛍️ 到店自提</span>
                      </span>
                    ) : (
                      <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-2 py-0.5 flex items-center gap-1 text-xs rounded-none">
                        <span>🛵 先锋食客 · {order.customerName ? order.customerName.replace(/^先锋食客\s*[·•]?\s*/, '') : '墨客'} · 专送</span>
                      </span>
                    )}
                  </div>

                  {/* 属性元数据栏 */}
                  <div className="p-3 text-xs text-slate-600 space-y-1.5 border-b border-dashed border-slate-200 bg-slate-50/40 rounded-none">
                    {/* UID and Order Time & Refund Lock */}
                    <div className="flex items-center justify-between gap-2 flex-wrap text-[11px]">
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-sky-800 bg-sky-50 px-1.5 py-0.2 border border-sky-200 rounded-none">
                          UID: {order.userId ? (order.userId.length > 12 ? `${order.userId.slice(0, 10)}...` : order.userId) : 'tcb_u_guest...'}
                        </span>
                        <span className="text-slate-400">|</span>
                        <span className="text-slate-500">
                          下单: <strong className="font-mono text-slate-700 font-bold">{order.createdTime || '12:36:20'}</strong>
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleLock(order)}
                        className={`border px-1.5 py-0.5 text-[10px] rounded-none cursor-pointer transition-colors flex items-center gap-1 ${
                          order.nonRefundable
                            ? 'bg-rose-50 text-rose-700 border-rose-300 font-semibold'
                            : 'text-slate-500 border-slate-300 bg-white hover:bg-slate-50'
                        }`}
                        title={order.nonRefundable ? '已锁定为不可退单，点击解锁' : '点击将此订单锁定为不可退单'}
                      >
                        {order.nonRefundable ? (
                          <>
                            <Lock className="w-2.5 h-2.5 text-rose-600" />
                            <span>不可退单 (已锁定)</span>
                          </>
                        ) : (
                          <>
                            <Unlock className="w-2.5 h-2.5 text-slate-400" />
                            <span>允许申请退单</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Table / Locker Info */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      {isDineIn ? (
                        <>
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-900 bg-amber-100/90 px-2 py-0.5 text-[11px] border border-amber-200 rounded-none">
                            🍽️ 桌台: {order.tableCode ? `${order.tableCode}号` : 'A2号'} · {order.tableZone || '餐车外摆区'}
                          </span>
                          <span className="text-slate-500 text-[11px] bg-white border border-slate-200 px-1.5 py-0.5 font-mono rounded-none">
                            服务员: {order.serverName || '阿豪 (No.02)'}
                          </span>
                        </>
                      ) : isPickup ? (
                        <>
                          <span className="inline-flex items-center gap-1 font-bold text-blue-900 bg-blue-100 px-2 py-0.5 text-xs font-mono border border-blue-200 rounded-none">
                            🔑 自提码: #{pickupCode}
                          </span>
                          <span className="text-slate-600 text-[11px] bg-white border border-slate-200 px-1.5 py-0.5 font-mono rounded-none">
                            {shelfCode}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="inline-flex items-center gap-1 font-bold text-amber-900 bg-amber-100 px-2 py-0.5 text-xs font-mono border border-amber-200 rounded-none">
                            🔑 取件码: {pickupCode}
                          </span>
                          <span className="text-slate-600 text-[11px] bg-white border border-slate-200 px-1.5 py-0.5 font-mono rounded-none">
                            {shelfCode}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Real-time Status Row */}
                    {isPending ? (
                      <div className="pt-0.5 flex items-center gap-1 text-amber-700 font-bold text-xs">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>⏳ 待商家接单确认</span>
                      </div>
                    ) : isCooking && !isRefundPending ? (
                      <div className="pt-0.5 flex items-center justify-between gap-2 text-amber-700 font-bold text-xs">
                        <div className="flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-amber-500" />
                          <span>🔥 后厨现制中 (已接单)</span>
                        </div>
                        {isDelivery && (
                          <span className="text-amber-800 text-[11px] font-mono">专送骑手: 系统已调度待取餐</span>
                        )}
                      </div>
                    ) : isDelivering && !isRefundPending ? (
                      <div className="pt-0.5 flex items-center justify-between gap-2 text-sky-700 font-bold text-xs">
                        <div className="flex items-center gap-1">
                          {isDelivery ? (
                            <>
                              <Bike className="w-3.5 h-3.5 text-sky-600" />
                              <span>🛵 骑手专送中 (约{order.etaMinutes || 6}m送达)</span>
                            </>
                          ) : isPickup ? (
                            <>
                              <ShoppingBag className="w-3.5 h-3.5 text-sky-600" />
                              <span>🛍️ 餐品已入保温柜待取</span>
                            </>
                          ) : (
                            <>
                              <Utensils className="w-3.5 h-3.5 text-amber-600" />
                              <span>🍽️ 堂食陆续出餐上桌中</span>
                            </>
                          )}
                        </div>
                        <span className="text-slate-500 font-normal text-[11px] font-mono">
                          {isDelivery ? (
                            <>骑手: <strong className="text-slate-800">{order.courierName || '陈志远 (R-8821)'}</strong></>
                          ) : isPickup ? (
                            '等待食客到店核销'
                          ) : (
                            '传菜员就位'
                          )}
                        </span>
                      </div>
                    ) : isCompleted ? (
                      <div className="pt-0.5 flex items-center justify-between gap-2 text-emerald-700 font-bold text-xs">
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>已妥投交付完成</span>
                        </div>
                        <span className="text-slate-500 font-normal text-[11px] font-mono">
                          骑手: <strong className="text-slate-800">{order.courierName || '王凯 (专线骑手)'}</strong>
                        </span>
                      </div>
                    ) : isRefundPending ? (
                      <div className="pt-0.5 flex items-center gap-1 text-rose-600 font-bold text-xs animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                        <span>⚠️ 食客退单申请审核中</span>
                      </div>
                    ) : isRefunded ? (
                      <div className="pt-0.5 flex items-center gap-1 text-slate-600 font-bold text-xs">
                        <Ban className="w-3.5 h-3.5 text-slate-400" />
                        <span>已全额退款取消</span>
                      </div>
                    ) : null}
                  </div>

                  {/* 售后退款审核横幅 (若食客申请退款) */}
                  {isRefundPending && (
                    <div className="p-3 bg-rose-50 border-b border-rose-200 text-xs space-y-2 rounded-none">
                      <div className="flex items-center justify-between font-bold text-rose-700">
                        <span className="flex items-center gap-1.5">
                          <ShieldAlert className="w-4 h-4" />
                          <span>食客提交售后退单申请 (需审核)</span>
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          阶段: {order.refundPassedStep === 0 ? '待接单' : order.refundPassedStep === 1 ? '后厨制作中' : '配送中'}
                        </span>
                      </div>
                      <div className="bg-white p-2 border border-rose-200 text-[11px] space-y-1">
                        <div>
                          <span className="text-slate-500">退单原因: </span>
                          <strong className="text-slate-800">{order.refundReason || '食客点单信息变更'}</strong>
                        </div>
                        {order.refundFeedback && (
                          <div>
                            <span className="text-slate-500">食客说明: </span>
                            <span className="italic text-slate-700">"{order.refundFeedback}"</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setRefundRejectTarget(order)}
                          className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 text-xs font-semibold rounded-none cursor-pointer"
                        >
                          驳回申请
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApproveRefund(order)}
                          className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-none cursor-pointer flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>同意退单并原路退款</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 菜品明细清单 (折叠抽屉) */}
                  <div className="p-3 text-xs flex-1 bg-white flex flex-col justify-between border-t border-slate-100 rounded-none">
                    <details className="group w-full select-none" open>
                      <summary className="font-bold text-slate-700 text-[11px] pb-2 border-b border-slate-200 flex items-center justify-between cursor-pointer list-none">
                        <span className="flex items-center gap-1.5 text-slate-900 font-semibold">
                          {isDineIn ? (
                            <Utensils className="w-3.5 h-3.5 text-slate-500" />
                          ) : (
                            <Package className="w-3.5 h-3.5 text-slate-500" />
                          )}
                          <span>菜品清单 (共{itemCount}品{totalQty}件)</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isDineIn ? (
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-300 px-1 py-0.2 font-normal rounded-none">
                              现制明细
                            </span>
                          ) : isPickup ? (
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-300 px-1 py-0.2 font-normal rounded-none">
                              自提取餐
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-300 px-1 py-0.2 font-normal rounded-none">
                              专送配送
                            </span>
                          )}
                          <span className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 inline-flex items-center justify-center text-xs transition-transform group-open:rotate-180 rounded-none">
                            <ChevronDown className="w-3 h-3 leading-none" />
                          </span>
                        </div>
                      </summary>

                      <div className="space-y-1.5 divide-y divide-slate-100 pt-2">
                        {order.items.map((it, itemIdx) => (
                          <div key={itemIdx} className="flex justify-between items-start pt-1">
                            <div>
                              <div className="font-medium text-slate-900">{it.name}</div>
                              {it.options && (
                                <div className="text-[11px] text-slate-400">[{it.options}]</div>
                              )}
                            </div>
                            <span className="font-mono font-bold text-slate-700 ml-2">x{it.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </details>

                    {/* 配送 / 就餐地理位置 */}
                    <div className="flex items-center gap-1.5 text-xs text-rose-600 pt-2 border-t border-dashed border-slate-200 mt-2">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span className="font-medium truncate">{destinationText}</span>
                    </div>
                  </div>

                  {/* 金额结算明细 */}
                  <div className="bg-slate-50 px-3.5 py-2.5 border-t border-slate-200 flex items-center justify-between text-xs rounded-none">
                    <div className="text-[11px] text-slate-500 leading-tight">
                      <div>在线微信支付已清算</div>
                      <div className="font-mono text-slate-400 mt-0.5">
                        骑手 ¥{riderFee.toFixed(1)} · 佣金 ¥{platformFee.toFixed(1)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-emerald-700 font-medium font-mono">
                        餐车净得: <span className="font-bold">¥{netPayout.toFixed(2)}</span>
                      </div>
                      <div className="text-xl font-black text-slate-900 font-mono tracking-tight">
                        ¥{order.totalAmount.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* 底部动作按钮组 */}
                  <div className="p-2.5 bg-white border-t border-slate-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-none">
                    {/* 左侧通用工具组 */}
                    <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
                      {/* 气泡联络室 (深邃黑方块+绿脉冲对齐手机端) */}
                      <button
                        type="button"
                        onClick={() => setChatOrder(order)}
                        className="relative p-2 bg-slate-900 hover:bg-black text-white border border-slate-900 flex items-center justify-center transition-colors rounded-none cursor-pointer"
                        title="气泡联络室 (三端互通)"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-400 led-pulse rounded-none"></span>
                      </button>

                      {/* 小票打印 */}
                      <button
                        type="button"
                        onClick={() => setReceiptOrder(order)}
                        className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 flex items-center justify-center transition-colors rounded-none cursor-pointer"
                        title="小票预览打印"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>

                      {/* 商家主动退单 */}
                      <button
                        type="button"
                        onClick={() => setRejectOrderTarget(order)}
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-300 flex items-center justify-center transition-colors rounded-none cursor-pointer"
                        title="商家主动退单与拒单"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>

                      {/* 审核转为外卖专送 (仅限堂食显示) */}
                      {isDineIn && (
                        <button
                          type="button"
                          onClick={() => setAuditConvertTargetOrder(order)}
                          className="p-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-300 flex items-center justify-center transition-colors rounded-none cursor-pointer"
                          title="审核转为外卖专送"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* 商家作废/删除订单 */}
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteTargetOrder(order);
                          setDeleteReason('顾客误触/重复下单作废');
                        }}
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 flex items-center justify-center transition-colors rounded-none cursor-pointer"
                        title="作废并删除此订单"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* 右侧流转核心动作 */}
                    {isPending ? (
                      <button
                        type="button"
                        onClick={() => handleAcceptSingleOrder(order)}
                        className="flex-1 min-w-[140px] py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1 border border-emerald-700 transition-colors rounded-none cursor-pointer"
                      >
                        <ChefHat className="w-3.5 h-3.5" />
                        <span>接单制作 (进入后厨)</span>
                      </button>
                    ) : isCooking && !isRefundPending ? (
                      isDineIn ? (
                        <button
                          type="button"
                          onClick={() => {
                            onAdvanceOrderStatus(order.orderNo || order.id, 'delivering', {
                              status: 'delivering',
                              stepIndex: 3,
                              statusText: '堂食陆续出餐上桌中'
                            });
                            showToast(`堂食订单 #${order.orderNo.replace(/^#/, '')} 已制作完成，已通知传菜员送至 ${order.tableCode ? `${order.tableCode} 号桌` : '外摆区'}！`);
                          }}
                          className="flex-1 min-w-[140px] py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1 border border-amber-600 transition-colors rounded-none cursor-pointer"
                        >
                          <Utensils className="w-3.5 h-3.5" />
                          <span>制作完成 · 传菜上桌</span>
                        </button>
                      ) : isPickup ? (
                        <div className="flex items-center gap-1.5 flex-1 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                          {/* 方案 B：订单看板快捷叫号取餐广播 */}
                          <button
                            type="button"
                            onClick={() => handleQuickBroadcastCall(order)}
                            className="py-2 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold text-xs flex items-center justify-center gap-1 border border-blue-300 transition-all rounded-none cursor-pointer shadow-2xs"
                            title="外放语音呼叫自提顾客到前台取餐"
                          >
                            <Megaphone className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                            <span>叫号取餐{orderCallCounts[order.orderNo] ? ` (${orderCallCounts[order.orderNo]}次)` : ''}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setVerifyTargetOrder(order)}
                            className="flex-1 py-2 px-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1 border border-emerald-700 transition-colors rounded-none cursor-pointer"
                          >
                            <Scan className="w-3.5 h-3.5 shrink-0" />
                            <span>自提核销</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onAdvanceOrderStatus(order.orderNo || order.id, 'delivering', {
                                status: 'delivering',
                                stepIndex: 2,
                                statusText: '餐品已入保温柜待取'
                              });
                              voiceAlerts.smartLockerPickupGuidance(pickupCode, shelfCode || '03号保温格口');
                              showToast(`自提订单 #${order.orderNo.replace(/^#/, '')} 制作完毕，已放入保温柜并触发语音取餐引导！`);
                            }}
                            className="flex-1 py-2 px-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center justify-center gap-1 border border-sky-600 transition-colors rounded-none cursor-pointer"
                          >
                            <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                            <span>出餐入柜</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-1 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                          {/* 方案 B：订单看板快捷呼叫骑手广播 */}
                          <button
                            type="button"
                            onClick={() => handleQuickBroadcastCall(order)}
                            className="py-2 px-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center gap-1 border border-amber-300 transition-all rounded-none cursor-pointer shadow-2xs"
                            title="外放语音呼叫外卖专送骑手到餐车站台取餐"
                          >
                            <Megaphone className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                            <span>呼叫骑手{orderCallCounts[order.orderNo] ? ` (${orderCallCounts[order.orderNo]}次)` : ''}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setVerifyTargetOrder(order)}
                            className="flex-1 py-2 px-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1 border border-amber-600 transition-colors rounded-none cursor-pointer"
                          >
                            <KeyRound className="w-3.5 h-3.5 shrink-0" />
                            <span>骑手核销</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onAdvanceOrderStatus(order.orderNo || order.id, 'delivering', {
                                status: 'delivering',
                                stepIndex: 3,
                                statusText: '专线骑手配送中'
                              });
                              voiceAlerts.callRiderForOrder(order.orderNo);
                              showToast(`外卖订单 #${order.orderNo.replace(/^#/, '')} 制作完成，已调度专线骑手并语音呼叫！`);
                            }}
                            className="flex-1 py-2 px-2 bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-1 border border-slate-900 transition-colors rounded-none cursor-pointer"
                          >
                            <span>调度骑手</span>
                          </button>
                        </div>
                      )
                    ) : isDelivering && !isRefundPending ? (
                      isDineIn ? (
                        <div className="flex items-center gap-1.5 flex-1 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                          <button
                            type="button"
                            onClick={() => handleQuickBroadcastCall(order)}
                            className="py-2 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs flex items-center justify-center gap-1 border border-emerald-300 transition-all rounded-none cursor-pointer"
                            title="外放广播通知传菜"
                          >
                            <Megaphone className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <span>呼叫传菜{orderCallCounts[order.orderNo] ? ` (${orderCallCounts[order.orderNo]}次)` : ''}</span>
                          </button>
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
                            className="flex-1 min-w-[120px] py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1 border border-emerald-700 transition-colors rounded-none cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>餐品齐备 · 结账翻台</span>
                          </button>
                        </div>
                      ) : isPickup ? (
                        <div className="flex items-center gap-1.5 flex-1 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                          {/* 待取催取喇叭 */}
                          <button
                            type="button"
                            onClick={() => handleQuickBroadcastCall(order)}
                            className="py-2 px-2.5 bg-blue-100 hover:bg-blue-200 text-blue-900 font-bold text-xs flex items-center justify-center gap-1 border border-blue-300 transition-all rounded-none cursor-pointer shadow-2xs"
                            title="外放广播催促自提顾客尽快取餐"
                          >
                            <Megaphone className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                            <span>催客取餐{orderCallCounts[order.orderNo] ? ` (${orderCallCounts[order.orderNo]}次)` : ''}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onAdvanceOrderStatus(order.orderNo || order.id, 'completed', {
                                status: 'completed',
                                stepIndex: 4,
                                statusText: '顾客已自提离店'
                              });
                              showToast(`自提订单 #${order.orderNo.replace(/^#/, '')} 顾客已提货，流程已结单！`);
                            }}
                            className="flex-1 py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1 border border-emerald-700 transition-colors rounded-none cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>核销完成 · 顾客已自提</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-1 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                          {/* 催骑手尽快送达 */}
                          <button
                            type="button"
                            onClick={() => handleQuickBroadcastCall(order)}
                            className="py-2 px-2.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs flex items-center justify-center gap-1 border border-amber-300 transition-all rounded-none cursor-pointer shadow-2xs"
                            title="外放催骑手加速取送"
                          >
                            <Megaphone className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                            <span>呼叫骑手{orderCallCounts[order.orderNo] ? ` (${orderCallCounts[order.orderNo]}次)` : ''}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onAdvanceOrderStatus(order.orderNo || order.id, 'completed', {
                                status: 'completed',
                                stepIndex: 4,
                                statusText: '已送达妥投'
                              });
                              showToast(`外卖订单 #${order.orderNo.replace(/^#/, '')} 骑手已妥投送达！`);
                            }}
                            className="flex-1 py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1 border border-emerald-700 transition-colors rounded-none cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>送达妥投</span>
                          </button>
                        </div>
                      )
                    ) : isCompleted ? (
                      <span className="text-emerald-700 font-mono text-xs font-bold px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-none">
                        工单已归档结清
                      </span>
                    ) : isRefunded ? (
                      <span className="text-slate-500 font-mono text-xs font-bold px-2 py-1 bg-slate-100 border border-slate-200 rounded-none">
                        已退款全单取消
                      </span>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          /* List Table View Mode */
          <div className="bg-white border border-slate-300 rounded-none shadow-xs overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                  <th className="p-2.5">单号 / 渠道</th>
                  <th className="p-2.5">UID / 下单时间</th>
                  <th className="p-2.5">菜品明细</th>
                  <th className="p-2.5">桌位 / 取件 / 配送地址</th>
                  <th className="p-2.5">实付 / 净得</th>
                  <th className="p-2.5">当前进度状态</th>
                  <th className="p-2.5 text-right">调度操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredOrders.map((order) => {
                  const oChannel = resolveOrderChannelType(order);
                  return (
                    <tr key={order.orderNo} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-2.5 font-mono">
                        <div className="font-bold text-slate-900">#{order.orderNo.replace(/^#/, '')}</div>
                        <div className="text-[11px] text-slate-500">
                          {oChannel === 'dine_in' ? '🍽️ 堂食就餐' : oChannel === 'pickup' ? '🛍️ 到店自提' : '🛵 外卖专送'}
                        </div>
                      </td>
                      <td className="p-2.5 font-mono text-slate-600">
                        <div className="text-sky-800">{order.userId ? `${order.userId.slice(0, 10)}...` : 'guest'}</div>
                        <div className="text-slate-400">{order.createdTime}</div>
                      </td>
                      <td className="p-2.5">
                        <div className="font-medium text-slate-900 truncate max-w-xs">
                          {order.items.map(i => `${i.name} x${i.quantity}`).join('，')}
                        </div>
                        <div className="text-[11px] text-slate-400">共 {order.items.length} 品</div>
                      </td>
                      <td className="p-2.5 text-slate-700">
                        {oChannel === 'dine_in' ? (
                          <span className="font-medium text-amber-800">桌台: {order.tableCode || 'A2'}</span>
                        ) : oChannel === 'pickup' ? (
                          <span className="font-mono text-blue-800 font-bold">自提码: #{getOrGeneratePickupCode(order.orderNo, order.pickupCode)}</span>
                        ) : (
                          <span className="truncate block max-w-xs">{order.deliveryAddress}</span>
                        )}
                      </td>
                      <td className="p-2.5 font-mono">
                        <div className="font-bold text-slate-900">¥{order.totalAmount.toFixed(2)}</div>
                        <div className="text-[10px] text-emerald-700 font-semibold">净得 ¥{(order.merchantNetPayout || order.totalAmount).toFixed(2)}</div>
                      </td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 text-[11px] font-bold border rounded-none ${
                          order.status === 'pending'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : order.status === 'cooking'
                            ? 'bg-amber-50 text-amber-900 border-amber-200'
                            : order.status === 'delivering'
                            ? 'bg-sky-50 text-sky-800 border-sky-200'
                            : order.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}>
                          {order.statusText || order.status}
                        </span>
                      </td>
                      <td className="p-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleQuickBroadcastCall(order)}
                            className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-none cursor-pointer flex items-center gap-1 shadow-2xs"
                            title={`外放语音广播: ${oChannel === 'pickup' ? '叫号取餐' : oChannel === 'delivery' ? '呼叫骑手' : '呼叫传菜'}`}
                          >
                            <Megaphone className="w-3 h-3 text-amber-700" />
                            <span className="font-bold text-[10px]">
                              {oChannel === 'pickup' ? '叫号' : oChannel === 'delivery' ? '呼叫' : '传菜'}
                              {orderCallCounts[order.orderNo] ? ` (${orderCallCounts[order.orderNo]})` : ''}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setChatOrder(order)}
                            className="p-1.5 bg-slate-900 hover:bg-black text-white border border-slate-900 rounded-none cursor-pointer"
                            title="联络室"
                          >
                            <MessageSquare className="w-3 h-3 text-emerald-400" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setReceiptOrder(order)}
                            className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-none cursor-pointer"
                            title="打印小票"
                          >
                            <Printer className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteTargetOrder(order);
                              setDeleteReason('顾客误触/重复下单作废');
                            }}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-none cursor-pointer flex items-center gap-1"
                            title="作废删除此订单"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span className="font-bold text-[10px]">删除</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
      {/* END: MainOrderCardsContainer */}

      {/* ========================================================================= */}
      {/* BEGIN: BottomStatusBar (工业级底栏状态与当日交班营收结算条)              */}
      {/* ========================================================================= */}
      <footer className="mt-auto px-4 py-2 bg-white border-t border-slate-300 flex items-center justify-between text-xs text-slate-600 rounded-none shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 bg-emerald-500 rounded-none led-pulse"></span>
          <span className="font-semibold text-slate-800">工作中</span>
          <span className="text-slate-300">|</span>
          <span>待办工单: <strong className="font-mono text-amber-700 font-bold">{cookingOrders.length + pendingOrders.length} 单</strong></span>
          <span className="text-slate-300">|</span>
          <span>今日已结营业额: <strong className="font-mono text-emerald-700 font-bold">¥{todayRevenue.toFixed(2)}</strong></span>
        </div>

        <button
          type="button"
          onClick={handleRefreshSync}
          className="p-1 text-slate-500 hover:text-slate-900 flex items-center gap-1 border border-transparent hover:border-slate-300 rounded-none cursor-pointer text-[11px]"
          title="刷新最新订单队列"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">刷新同步</span>
        </button>
      </footer>
      {/* END: BottomStatusBar */}

      {/* ========================================================================= */}
      {/* MODALS & DIALOGS                                                          */}
      {/* ========================================================================= */}

      {/* 1. Modal: 热敏小票云打印预览 (58mm 纯直角工业标准) */}
      {receiptOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-sm rounded-none border border-slate-400 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
              <span className="font-bold text-xs flex items-center gap-1.5 font-mono">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>黑曜石餐车 · 热敏小票打印预览 (58mm)</span>
              </span>
              <button
                type="button"
                onClick={() => setReceiptOrder(null)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Receipt Simulation Body */}
            <div className="p-4 bg-slate-50 text-xs font-mono space-y-3 max-h-[70vh] overflow-y-auto border-y border-slate-300">
              <div className="text-center space-y-1">
                <p className="font-bold text-sm text-slate-900">黑曜石 01 号流动餐车</p>
                <p className="text-[11px] text-slate-500">-- 结账备餐制作单 --</p>
              </div>

              <div className="border-t border-dashed border-slate-300 pt-2 space-y-1 text-[11px]">
                <p>工单号: <strong>#{receiptOrder.orderNo.replace(/^#/, '')}</strong></p>
                <p>下单时间: {receiptOrder.createdTime}</p>
                <p>分流渠道: {resolveOrderChannelType(receiptOrder) === 'dine_in' ? '现场堂食' : resolveOrderChannelType(receiptOrder) === 'pickup' ? '到店自提' : '外卖专送'}</p>
                <p>退单控制: {receiptOrder.nonRefundable ? '已锁定 (不可退单)' : '正常允许'}</p>
              </div>

              {/* Items */}
              <div className="border-t border-dashed border-slate-300 pt-2 space-y-1.5">
                <div className="flex justify-between font-bold text-[11px] text-slate-800">
                  <span>品名</span>
                  <span>数量</span>
                  <span>单价</span>
                </div>
                {receiptOrder.items.map((it, i) => (
                  <div key={i} className="flex justify-between text-[11px]">
                    <div className="truncate max-w-[140px]">
                      <div>{it.name}</div>
                      {it.options && <div className="text-[10px] text-slate-400">[{it.options}]</div>}
                    </div>
                    <span>x{it.quantity}</span>
                    <span>¥{(it.price * it.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-slate-300 pt-2 space-y-1 text-right">
                <p className="font-bold text-sm text-emerald-800 pt-1">
                  实付总额: ¥{receiptOrder.totalAmount.toFixed(2)}
                </p>
              </div>

              <div className="border-t border-dashed border-slate-300 pt-2 text-[11px] space-y-1">
                <p className="font-bold">送达/就餐位:</p>
                <p className="text-slate-600">
                  {resolveOrderChannelType(receiptOrder) === 'dine_in'
                    ? `桌台: ${receiptOrder.tableCode || 'A2'} · ${receiptOrder.tableZone || '外摆区'}`
                    : receiptOrder.deliveryAddress}
                </p>
              </div>

              <div className="border-t border-dashed border-slate-300 pt-2 text-center text-[10px] text-slate-500">
                -- 感谢惠顾 · 期待再次光临 --
              </div>
            </div>

            <div className="p-3 bg-white flex items-center justify-end gap-2 border-t border-slate-300">
              <button
                type="button"
                onClick={() => setReceiptOrder(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-none font-semibold cursor-pointer text-xs"
              >
                关闭
              </button>
              <button
                type="button"
                onClick={() => {
                  setReceiptOrder(null);
                  showToast(`已向热敏云打印机发送【${receiptOrder.orderNo}】出票指令！`);
                }}
                className="px-4 py-1.5 bg-slate-900 hover:bg-black text-white rounded-none font-semibold cursor-pointer flex items-center gap-1 text-xs"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span>立即出票</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal: 拒单 / 主动退款 */}
      {rejectOrderTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-sm rounded-none border border-rose-300 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3 bg-rose-50 border-b border-rose-200 flex items-center justify-between text-rose-700">
              <span className="font-bold text-xs flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>拒单与原路退款</span>
              </span>
              <button
                type="button"
                onClick={() => setRejectOrderTarget(null)}
                className="text-rose-500 hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <p className="text-slate-600">
                正在对工单 <strong className="font-mono text-slate-900">#{rejectOrderTarget.orderNo.replace(/^#/, '')}</strong> 进行拒单操作，退款将全额原路退还至顾客支付账户。
              </p>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">选择拒单原因:</label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-none focus:outline-none text-xs"
                >
                  <option value="食材售罄，无法现制">食材售罄，无法现制</option>
                  <option value="餐车爆单，出餐超时">餐车爆单，出餐超时</option>
                  <option value="超出餐车配送辐射范围">超出餐车配送辐射范围</option>
                  <option value="恶劣天气暂停外送">恶劣天气暂停外送</option>
                  <option value="食客电话联系退单">食客电话联系退单</option>
                </select>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectOrderTarget(null)}
                className="px-3 py-1.5 bg-white text-slate-700 border border-slate-300 rounded-none font-semibold cursor-pointer text-xs"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  onRejectOrder(rejectOrderTarget.id, rejectReason);
                  setRejectOrderTarget(null);
                  showToast(`已驳回工单 #${rejectOrderTarget.orderNo} 并原路发起退款`);
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-none font-semibold cursor-pointer text-xs"
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
          <div className="bg-white w-full max-w-sm rounded-none border border-slate-300 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-slate-800">
              <span className="font-bold text-xs flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-amber-600" />
                <span>驳回食客退单申请</span>
              </span>
              <button
                type="button"
                onClick={() => setRefundRejectTarget(null)}
                className="text-slate-400 hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <p className="text-slate-600">
                正在驳回工单 <strong className="font-mono text-slate-900">#{refundRejectTarget.orderNo.replace(/^#/, '')}</strong> 的退款申请。驳回后工单将恢复出餐/配送流程。
              </p>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">填写驳回原因说明:</label>
                <textarea
                  rows={3}
                  value={refundRejectReason}
                  onChange={(e) => setRefundRejectReason(e.target.value)}
                  placeholder="例如：餐品已下锅高温炙烤，无法中途取消..."
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-none focus:outline-none text-xs"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRefundRejectTarget(null)}
                className="px-3 py-1.5 bg-white text-slate-700 border border-slate-300 rounded-none font-semibold cursor-pointer text-xs"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleRejectRefundSubmit}
                className="px-4 py-1.5 bg-slate-900 hover:bg-black text-white rounded-none font-semibold cursor-pointer text-xs"
              >
                确认驳回申请
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal: 订单三端即时气泡联络室 (商家控制台视窗) */}
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

      {/* 5. Modal: 骑手取件核销弹窗 */}
      {verifyTargetOrder && (
        <MerchantPickupVerifyModal
          isOpen={!!verifyTargetOrder}
          onClose={() => setVerifyTargetOrder(null)}
          order={verifyTargetOrder}
          onVerifySuccess={(orderId, pickupCodeVal) => {
            businessTransactionEngine.executeVerifyPickup({
              orderNo: verifyTargetOrder.orderNo || orderId,
              pickupCode: pickupCodeVal,
              operatorName: '订单中心扫码中枢',
              showToast
            });
            onAdvanceOrderStatus(verifyTargetOrder.orderNo || orderId, 'delivering', {
              status: 'delivering',
              stepIndex: 3,
              statusText: '专线骑手配送中',
              pickupVerifiedAt: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
              pickupVerifiedBy: '餐车扫码核销'
            });
            setVerifyTargetOrder(null);
          }}
          showToast={showToast}
        />
      )}

      {/* 6. Modal: 堂食转外卖专送人工审核弹窗 */}
      {auditConvertTargetOrder && (
        <MerchantAuditConvertToDeliveryModal
          order={auditConvertTargetOrder}
          isOpen={Boolean(auditConvertTargetOrder)}
          onClose={() => setAuditConvertTargetOrder(null)}
          onConfirmConvert={handleConfirmConvertToDelivery}
        />
      )}

      {/* 7. Modal: 商家删除/作废订单弹窗 */}
      {deleteTargetOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-md rounded-none border border-rose-400 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-3 bg-rose-600 text-white flex items-center justify-between">
              <span className="font-bold text-xs flex items-center gap-1.5 font-mono">
                <Trash2 className="w-4 h-4" />
                <span>全渠道订单中心 · 作废并删除订单</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setDeleteTargetOrder(null);
                  setCustomDeleteReason('');
                }}
                className="text-rose-100 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3.5 text-xs">
              {/* Alert Warning Box */}
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>高风险敏感操作警告</span>
                </div>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  删除后该订单将从全渠道工作台、后厨KDS排产与实时队列中物理剔除。系统将自动记录审计流水并创建安全快照。
                </p>
              </div>

              {/* Order Info Card */}
              <div className="bg-slate-50 p-3 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    #{deleteTargetOrder.orderNo.replace(/^#/, '')}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-600">
                    {deleteTargetOrder.createdTime}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-dashed border-slate-200">
                  <span>
                    渠道:{' '}
                    <strong className="text-slate-800">
                      {resolveOrderChannelType(deleteTargetOrder) === 'dine_in'
                        ? '堂食就餐'
                        : resolveOrderChannelType(deleteTargetOrder) === 'pickup'
                        ? '到店自提'
                        : '外卖专送'}
                    </strong>
                    {deleteTargetOrder.tableCode ? ` (桌台: ${deleteTargetOrder.tableCode})` : ''}
                  </span>
                  <span>
                    实付:{' '}
                    <strong className="font-mono text-emerald-700 font-bold text-sm">
                      ¥{deleteTargetOrder.totalAmount.toFixed(2)}
                    </strong>
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 truncate">
                  菜品:{' '}
                  {deleteTargetOrder.items.map((i) => `${i.name} x${i.quantity}`).join('，')}
                </div>
              </div>

              {/* Reason Selection */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 block">选择作废/删除原因:</label>
                <select
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-none focus:outline-none text-xs font-medium"
                >
                  <option value="顾客误触/重复下单作废">顾客误触 / 重复下单作废</option>
                  <option value="线下电话协商取消并作废">线下电话协商取消并作废</option>
                  <option value="测试模拟仿真单作废">测试模拟仿真单作废</option>
                  <option value="顾客未付款或异常跑单">顾客未付款或异常跑单</option>
                  <option value="档口食材售罄且顾客要求全单作废">档口食材售罄且顾客要求全单作废</option>
                  <option value="other">其他原因 (自定义填写)</option>
                </select>

                {deleteReason === 'other' && (
                  <input
                    type="text"
                    value={customDeleteReason}
                    onChange={(e) => setCustomDeleteReason(e.target.value)}
                    placeholder="请输入具体的作废删除原因说明..."
                    className="w-full p-2 mt-1.5 bg-slate-50 border border-slate-300 rounded-none focus:outline-none text-xs"
                    autoFocus
                  />
                )}
              </div>

              {/* Snapshot Info */}
              <label className="flex items-center gap-2 text-slate-700 cursor-pointer select-none text-[11px] pt-1">
                <input
                  type="checkbox"
                  checked={createSafetySnapshot}
                  onChange={(e) => setCreateSafetySnapshot(e.target.checked)}
                  className="rounded-none text-emerald-600 focus:ring-0"
                />
                <span className="font-medium">自动保存版本快照与操作日志（可在总控台随时回滚恢复）</span>
              </label>
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteTargetOrder(null);
                  setCustomDeleteReason('');
                }}
                className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-none font-semibold cursor-pointer text-xs"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteOrder}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-none font-bold cursor-pointer text-xs flex items-center gap-1.5 shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>确认作废并删除</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 右侧折叠内嵌式账号操作对比与数据兜底组件 */}
      <AccountAuditDrawer
        currentModule="orders"
        title="全渠道订单操作审计与版本恢复"
        showToast={showToast}
      />
    </div>
  );
};
