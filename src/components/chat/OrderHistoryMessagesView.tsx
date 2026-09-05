import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  MessageSquare,
  CheckCircle2,
  Bike,
  Flame,
  ChevronRight,
  Copy,
  SlidersHorizontal,
  RefreshCw,
  MapPin,
  ArrowLeft,
  ShoppingBag,
  Check,
  AlertCircle,
  Radio,
  Sparkles,
  QrCode,
  Lock,
  Unlock,
  CheckCheck,
  X
} from 'lucide-react';
import { Order, DishItem } from '../../types';
import {
  getLatestChatMessage,
  getUnreadCountForRole,
  subscribeOrderChat,
  ChatRole
} from '../../utils/chatHub';
import { normalizeOrderKey, isOrderMatch } from '../../utils/orderNormalizer';
import { UnifiedOmniChatModal } from './UnifiedOmniChatModal';
import { ActiveMessageFormModal } from './ActiveMessageFormModal';
import { OmniAggregatedChatHub } from './OmniAggregatedChatHub';

export interface OrderHistoryMessagesViewProps {
  orders: Order[];
  dishes?: DishItem[];
  viewerRole?: 'user' | 'rider' | 'merchant' | 'platform' | 'customer';
  onBackToMenu?: () => void;
  onTrackOrder?: (orderId: string) => void;
  onAdvanceOrderStatus?: (orderId: string, targetStatus?: Order['status'], extraDetails?: Partial<Order>) => void;
  onRejectOrder?: (orderId: string, reason: string) => void;
  onAuditRefund?: (orderId: string, approved: boolean, rejectReason?: string) => void;
  showToast?: (title: string, desc?: string) => void;
}

export type MainTabType = 'all_orders' | 'omni_stream' | 'alerts';
export type FilterStatusType = 'all' | 'cooking' | 'delivering' | 'completed' | 'refund';

// Core 4 showcase orders accurately matching the latest design spec
const SHOWCASE_ORDERS: Order[] = [
  {
    id: 'ord-9821',
    orderNo: 'UR-9821',
    truckId: 'truck-01',
    truckName: '黑曜石 01 号流动餐车',
    customerName: '先锋食客 · 墨客',
    channelType: 'delivery',
    items: [
      { name: '碳烤和牛小汉堡双重奏', quantity: 1, price: 63.0, options: '五分熟' },
      { name: '暗夜虚空冷萃浓缩咖啡', quantity: 1, price: 28.0, options: '标准冰·无糖' }
    ],
    totalAmount: 91,
    status: 'delivering',
    statusText: '配送中',
    createdTime: '12:38:12',
    estimatedDeliveryTime: '12:49:12',
    etaMinutes: 11,
    courierName: '陈志远 (R-8821)',
    courierPhone: '138-1829-9201',
    deliveryAddress: '西藏北路 166 号大悦城商务座 1204 室',
    progressPercent: 75
  },
  {
    id: 'ord-9820',
    orderNo: 'UR-9820',
    truckId: 'truck-01',
    truckName: '黑曜石 01 号车 (已锁定)',
    customerName: '林小姐 (金融大厦)',
    channelType: 'delivery',
    items: [
      { name: '极炙和牛拼盘', quantity: 1, price: 56.0, options: '现烤微辣' }
    ],
    totalAmount: 56,
    status: 'cooking',
    statusText: '餐车制作中',
    createdTime: '12:35:04',
    estimatedDeliveryTime: '12:55:00',
    etaMinutes: 15,
    courierName: '智能调度系统派单中',
    deliveryAddress: '西藏北路 199 号金融大厦 1802 室',
    progressPercent: 45
  },
  {
    id: 'ord-9818',
    orderNo: 'UR-9818',
    truckId: 'truck-01',
    truckName: '天悦荟固定餐位 A-03',
    customerName: '张总 (天悦荟)',
    channelType: 'dine_in',
    items: [
      { name: '主厨特选和牛定食', quantity: 1, price: 128.0, options: '堂食预留' }
    ],
    totalAmount: 128,
    status: 'pending',
    statusText: '算法调度中',
    createdTime: '12:20:19',
    estimatedDeliveryTime: '12:45:00',
    etaMinutes: 25,
    courierName: '匹配最高效运力单元',
    deliveryAddress: '静安区西藏北路 108 号天悦荟 1 楼驻点',
    progressPercent: 20
  },
  {
    id: 'ord-9816',
    orderNo: 'UR-9816',
    truckId: 'truck-01',
    truckName: '01号餐车保温柜',
    customerName: '陈先生',
    channelType: 'pickup',
    items: [
      { name: '招牌炙烤和牛串', quantity: 1, price: 38.0, options: '保温锁鲜' }
    ],
    totalAmount: 38,
    status: 'cooking',
    statusText: '待自提 (保温柜04号)',
    createdTime: '12:15:30',
    estimatedDeliveryTime: '12:25:00',
    etaMinutes: 10,
    courierName: '65°C 恒温锁鲜中',
    deliveryAddress: '静安大悦城北广场流动餐车 01 号保温取餐柜',
    progressPercent: 80
  }
];

export const OrderHistoryMessagesView: React.FC<OrderHistoryMessagesViewProps> = ({
  orders,
  dishes = [],
  viewerRole = 'merchant',
  onBackToMenu,
  onTrackOrder,
  onAdvanceOrderStatus,
  onRejectOrder,
  onAuditRefund,
  showToast = (t, d) => console.log(t, d)
}) => {
  const [activeMainTab, setActiveMainTab] = useState<MainTabType>('all_orders');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatusType>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [chatTick, setChatTick] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Standalone full-page active chat order state (embedded in main content area)
  const [activeStandaloneOrder, setActiveStandaloneOrder] = useState<Order | null>(null);

  // Active chat modal state
  const [chatTargetOrder, setChatTargetOrder] = useState<Order | null>(null);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);

  // Active quick message form state
  const [isMessageFormOpen, setIsMessageFormOpen] = useState(false);

  // Smart locker pickup credential modal
  const [lockerModalOrder, setLockerModalOrder] = useState<Order | null>(null);
  const [isLockerUnlocked, setIsLockerUnlocked] = useState(false);

  // Subscribe to real-time chat updates across all orders
  useEffect(() => {
    const unsub = subscribeOrderChat(undefined, () => {
      setChatTick((t) => t + 1);
    });
    return () => unsub();
  }, []);

  const normalizedRole: ChatRole =
    viewerRole === 'customer' || viewerRole === 'user'
      ? 'user'
      : viewerRole === 'rider'
      ? 'rider'
      : viewerRole === 'platform'
      ? 'platform'
      : 'merchant';

  // Merge default showcase orders with runtime orders, prioritizing runtime updates
  const combinedOrders = useMemo(() => {
    const map = new Map<string, Order>();
    // 1. Put runtime orders first
    orders.forEach((o) => {
      const key = normalizeOrderKey(o.orderNo || o.id);
      if (key) map.set(key, o);
    });
    // 2. Supplement showcase orders if missing
    SHOWCASE_ORDERS.forEach((so) => {
      const key = normalizeOrderKey(so.orderNo || so.id);
      if (key && !map.has(key)) {
        map.set(key, so);
      }
    });
    return Array.from(map.values());
  }, [orders]);

  // Derive live activeStandaloneOrder by matching from combinedOrders to keep chat header / steps fully updated in real-time
  const liveActiveStandaloneOrder = useMemo(() => {
    if (!activeStandaloneOrder) return null;
    const match = combinedOrders.find((o) => isOrderMatch(o, activeStandaloneOrder.orderNo || activeStandaloneOrder.id));
    return match || activeStandaloneOrder;
  }, [activeStandaloneOrder, combinedOrders]);

  const liveChatTargetOrder = useMemo(() => {
    if (!chatTargetOrder) return null;
    const match = combinedOrders.find((o) => isOrderMatch(o, chatTargetOrder.orderNo || chatTargetOrder.id));
    return match || chatTargetOrder;
  }, [chatTargetOrder, combinedOrders]);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return combinedOrders.filter((order) => {
      // 1. Alert filter
      if (activeMainTab === 'alerts') {
        if (order.status !== 'cancelled' && order.refundStatus !== 'pending' && order.status !== 'cooking') {
          return false;
        }
      }

      // 2. Status Filter
      if (statusFilter === 'cooking' && order.status !== 'cooking') return false;
      if (statusFilter === 'delivering' && order.status !== 'delivering') return false;
      if (statusFilter === 'completed' && order.status !== 'completed') return false;
      if (statusFilter === 'refund' && order.status !== 'cancelled' && order.refundStatus !== 'pending') return false;

      // 3. Search Query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const orderNoMatch = (order.orderNo || '').toLowerCase().includes(q);
      const itemsMatch = order.items?.some((i) => (i.name || '').toLowerCase().includes(q));
      const addressMatch = (order.deliveryAddress || '').toLowerCase().includes(q);
      const courierMatch = (order.courierName || '').toLowerCase().includes(q);
      const customerMatch = (order.customerName || '').toLowerCase().includes(q);
      const statusTextMatch = (order.statusText || '').toLowerCase().includes(q);

      return orderNoMatch || itemsMatch || addressMatch || courierMatch || customerMatch || statusTextMatch;
    });
  }, [combinedOrders, activeMainTab, statusFilter, searchQuery]);

  // Copy order no
  const handleCopyOrderNo = (orderNo: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText?.(orderNo);
    showToast('已复制订单号', orderNo);
  };

  // Manual refresh trigger
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setChatTick((t) => t + 1);
      setIsRefreshing(false);
      showToast('协同流与链路状态已同步更新');
    }, 600);
  };

  // If user is currently viewing the standalone online message interface for an order
  if (liveActiveStandaloneOrder) {
    return (
      <div className="w-full max-w-4xl mx-auto px-1 sm:px-3 py-2">
        <UnifiedOmniChatModal
          isOpen={true}
          isInline={true}
          onClose={() => setActiveStandaloneOrder(null)}
          order={liveActiveStandaloneOrder}
          orderNo={liveActiveStandaloneOrder.orderNo.replace(/^#/, '')}
          viewerRole={normalizedRole}
          onAdvanceOrderStatus={onAdvanceOrderStatus}
          onRejectOrder={onRejectOrder}
          onAuditRefund={onAuditRefund}
          showToast={(msg) => showToast(msg)}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto px-2.5 sm:px-4 py-3 sm:py-5 space-y-3 font-sans text-neutral-900">
      {/* 1. Header Section with Title, LIVE pill, Subtitle and Stats */}
      <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-neutral-200/80 shadow-2xs flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          {onBackToMenu && (
            <button
              type="button"
              onClick={onBackToMenu}
              className="w-8 h-8 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="返回点单"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight truncate">
                消息中心聚合
              </h1>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-600 border border-emerald-200/70 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                LIVE
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 font-normal mt-0.5 truncate">
              全链路履约协同 · 实时动态监控
            </p>
          </div>
        </div>

        {/* Right Metric Cluster & Refresh Button */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 text-right">
            <div className="flex flex-col">
              <span className="text-[9.5px] text-neutral-400 leading-tight">活跃协同</span>
              <span className="text-xs sm:text-[13px] font-black text-neutral-900 leading-tight">5单</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9.5px] text-neutral-400 leading-tight">待响应</span>
              <span className="text-xs sm:text-[13px] font-black text-amber-500 leading-tight flex items-center justify-end gap-0.5">
                3条 <span className="text-[10px]">✨</span>
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9.5px] text-neutral-400 leading-tight">准时率</span>
              <span className="text-xs sm:text-[13px] font-black text-emerald-600 leading-tight">99.2%</span>
            </div>
          </div>

          {/* Refresh Action */}
          <button
            type="button"
            onClick={handleRefresh}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition-all cursor-pointer shrink-0"
            title="刷新协同流"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-neutral-900' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Segmented Tab Switcher with Badge & Filter button */}
      <div className="flex items-center justify-between gap-1.5 p-1 bg-[#eeeff0] rounded-2xl border border-neutral-200/60">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5 min-w-0">
          {/* Tab 1: 全部协同单 */}
          <button
            type="button"
            onClick={() => setActiveMainTab('all_orders')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeMainTab === 'all_orders'
                ? 'bg-white text-neutral-950 shadow-2xs font-bold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <span>全部协同单</span>
            <span
              className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                activeMainTab === 'all_orders'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-300 text-neutral-700'
              }`}
            >
              5
            </span>
          </button>

          {/* Tab 2: 即时通讯流 (6) */}
          <button
            type="button"
            onClick={() => setActiveMainTab('omni_stream')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeMainTab === 'omni_stream'
                ? 'bg-white text-neutral-950 shadow-2xs font-bold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span>即时通讯流 (6)</span>
          </button>

          {/* Tab 3: 异常预警 */}
          <button
            type="button"
            onClick={() => setActiveMainTab('alerts')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
              activeMainTab === 'alerts'
                ? 'bg-white text-neutral-950 shadow-2xs font-bold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <span>异常预警</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          </button>
        </div>

        {/* Filter Toggle Button */}
        <button
          type="button"
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={`px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1 transition-all cursor-pointer shrink-0 border ${
            isFilterOpen
              ? 'bg-neutral-900 text-white border-neutral-900 shadow-2xs'
              : 'bg-white text-neutral-700 hover:bg-neutral-50 border-neutral-200/80 shadow-2xs'
          }`}
        >
          <SlidersHorizontal className="w-3 h-3" />
          <span>筛选</span>
        </button>
      </div>

      {/* 3. Link Status Bar & + New Ticket CTA */}
      <div className="flex items-center justify-between gap-2 px-1 py-0.5">
        <div className="flex items-center gap-1.5 text-xs text-neutral-600 font-medium min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="truncate">三端链路正常: 顾客 · 01餐车 · 骑手 · 调度中枢</span>
        </div>

        <button
          type="button"
          onClick={() => setIsMessageFormOpen(true)}
          className="px-3 py-1.5 rounded-xl bg-[#0f172a] hover:bg-black text-white text-xs font-bold flex items-center gap-1 transition-all shadow-2xs cursor-pointer active:scale-95 shrink-0"
        >
          <span className="text-sm font-light leading-none">+</span>
          <span>新建工单</span>
        </button>
      </div>

      {/* Embedded Omni Chat Stream Tab */}
      {activeMainTab === 'omni_stream' ? (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs min-h-[560px] flex flex-col">
          <OmniAggregatedChatHub
            orders={combinedOrders}
            viewerRole={normalizedRole}
            onAdvanceOrderStatus={onAdvanceOrderStatus}
            onRejectOrder={onRejectOrder}
            onAuditRefund={onAuditRefund}
            showToast={(m) => showToast(m)}
            isModalMode={false}
          />
        </div>
      ) : (
        <>
          {/* Filter & Search Dropdown Drawer */}
          <AnimatePresence>
            {isFilterOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white rounded-2xl p-3 border border-neutral-200 shadow-2xs space-y-2.5 overflow-hidden"
              >
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="输入订单号、菜品、顾客姓名、配送地址筛选..."
                    className="w-full h-8 pl-8 pr-7 rounded-xl border border-neutral-200 bg-[#fafaf8] focus:bg-white text-xs font-medium text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all placeholder:text-neutral-400"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-0.5 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5">
                  {[
                    { id: 'all', label: '全部' },
                    { id: 'cooking', label: '制作中' },
                    { id: 'delivering', label: '配送中' },
                    { id: 'completed', label: '已送达' },
                    { id: 'refund', label: '售后/退款' }
                  ].map((tab) => {
                    const isActive = statusFilter === tab.id;
                    return (
                      <button
                        key={`subfilter-${tab.id}`}
                        type="button"
                        onClick={() => setStatusFilter(tab.id as FilterStatusType)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                          isActive
                            ? 'bg-neutral-900 text-white'
                            : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600'
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Cards List */}
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-neutral-200 shadow-2xs flex flex-col items-center justify-center">
              <ShoppingBag className="w-8 h-8 text-neutral-300 mb-2" />
              <p className="text-xs font-bold text-neutral-800">暂无协同订单记录</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">可尝试清空筛选关键词</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order, idx) => {
                const cleanNo = (order.orderNo || '').replace(/^#/, '');
                const unreadCount = getUnreadCountForRole(cleanNo, normalizedRole);

                // Precise key matchers for template styling
                const orderKey = normalizeOrderKey(cleanNo || order.id);
                const is9821 = orderKey === '9821';
                const is98215 = orderKey === '98215';
                const is9820 = orderKey === '9820';
                const is9818 = orderKey === '9818';
                const is9816 = orderKey === '9816';

                const statusStr = String(order.status || '').toLowerCase();
                const isCompleted = statusStr === 'completed' || statusStr === 'delivered' || order.stepIndex === 4;
                const isDelivering = statusStr === 'delivering' || statusStr === 'en route' || order.stepIndex === 3;
                const isReady = statusStr === 'ready' || order.stepIndex === 2;
                const isCooking = statusStr === 'cooking' || statusStr === 'preparing' || order.stepIndex === 1;

                // Dynamic fallbacks if general order
                const channelLabel = is9818
                  ? '堂食预定'
                  : is9816
                  ? '餐车自提'
                  : '外卖';

                const displayAddress =
                  order.deliveryAddress ||
                  (is9821
                    ? '西藏北路 166 号大悦城商务座 1204 室'
                    : is9820
                    ? '西藏北路 199 号金融大厦 1802 室'
                    : is9818
                    ? '静安区西藏北路 108 号天悦荟 1 楼驻点'
                    : '静安大悦城北广场流动餐车 01 号保温取餐柜');

                const formattedTime = order.createdTime || '12:38:12';

                // Stepper Config
                let stepperTheme: 'green' | 'amber' | 'blue' | 'purple' = 'green';
                let steps: { label: string; state: 'done' | 'active' | 'upcoming'; stepNum: number }[] = [];

                if (isCompleted) {
                  stepperTheme = 'green';
                  steps = [
                    { label: '已接单', state: 'done', stepNum: 1 },
                    { label: '餐车制作', state: 'done', stepNum: 2 },
                    { label: '专送妥投', state: 'done', stepNum: 3 },
                    { label: '已送达', state: 'done', stepNum: 4 }
                  ];
                } else if (isDelivering || is9821 || is98215) {
                  stepperTheme = 'green';
                  steps = [
                    { label: '已接单', state: 'done', stepNum: 1 },
                    { label: '餐车制作', state: 'done', stepNum: 2 },
                    { label: '配送中', state: 'active', stepNum: 3 },
                    { label: '已送达', state: 'upcoming', stepNum: 4 }
                  ];
                } else if (is9820 || isCooking || isReady) {
                  stepperTheme = 'amber';
                  steps = [
                    { label: '已接单', state: 'done', stepNum: 1 },
                    { label: isReady ? '出餐完毕' : '制作中', state: 'active', stepNum: 2 },
                    { label: '待配送', state: 'upcoming', stepNum: 3 },
                    { label: '已送达', state: 'upcoming', stepNum: 4 }
                  ];
                } else if (is9818) {
                  stepperTheme = 'blue';
                  steps = [
                    { label: '智能规划', state: 'active', stepNum: 1 },
                    { label: '择桌锁定', state: 'upcoming', stepNum: 2 },
                    { label: '现制备餐', state: 'upcoming', stepNum: 3 },
                    { label: '到席享用', state: 'upcoming', stepNum: 4 }
                  ];
                } else if (is9816) {
                  stepperTheme = 'purple';
                  steps = [
                    { label: '已下单', state: 'done', stepNum: 1 },
                    { label: '制作完毕', state: 'done', stepNum: 2 },
                    { label: '入柜待取', state: 'active', stepNum: 3 },
                    { label: '已取餐', state: 'upcoming', stepNum: 4 }
                  ];
                } else {
                  stepperTheme = 'green';
                  steps = [
                    { label: '已接单', state: 'done', stepNum: 1 },
                    { label: '餐车制作', state: 'done', stepNum: 2 },
                    { label: '配送中', state: 'active', stepNum: 3 },
                    { label: '已送达', state: 'upcoming', stepNum: 4 }
                  ];
                }

                // Header Badges
                let statusBadge1Text = '配送中';
                let statusBadge1Class = 'bg-emerald-50 text-emerald-600 border border-emerald-200/80';
                let statusBadge2Text = '剩 11 分钟';
                let statusBadge2Class = 'bg-emerald-50 text-emerald-600 border border-emerald-200/80';

                if (isCompleted) {
                  statusBadge1Text = '已送达';
                  statusBadge1Class = 'bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold';
                  statusBadge2Text = '履约完成';
                  statusBadge2Class = 'bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold';
                } else if (isDelivering || is9821 || is98215) {
                  statusBadge1Text = '配送中';
                  statusBadge1Class = 'bg-emerald-50 text-emerald-600 border border-emerald-200/80';
                  statusBadge2Text = `剩 ${order.etaMinutes || 11} 分钟`;
                  statusBadge2Class = 'bg-emerald-50 text-emerald-600 border border-emerald-200/80';
                } else if (is9820 || isCooking || isReady) {
                  statusBadge1Text = isReady ? '出餐待取' : '餐车制作中';
                  statusBadge1Class = 'bg-amber-50 text-amber-700 border border-amber-200/80';
                  statusBadge2Text = isReady ? '骑手取餐中' : '倒计时 04:30';
                  statusBadge2Class = 'bg-amber-50 text-amber-700 border border-amber-200/80';
                } else if (is9818) {
                  statusBadge1Text = '算法调度中';
                  statusBadge1Class = 'bg-sky-50 text-sky-700 border border-sky-200/80';
                  statusBadge2Text = '预计 12:45 入座';
                  statusBadge2Class = 'bg-sky-50 text-sky-700 border border-sky-200/80';
                } else if (is9816) {
                  statusBadge1Text = '待自提 (保温柜04号)';
                  statusBadge1Class = 'bg-purple-50 text-purple-700 border border-purple-200/80';
                  statusBadge2Text = '保温中 65°C';
                  statusBadge2Class = 'bg-purple-50 text-purple-700 border border-purple-200/80';
                }

                // Info Box Details
                let infoLeft = `餐车: ${order.truckName || '黑曜石 01 号流动餐车'}`;
                let infoRight = `骑手: ${order.courierName || '陈志远 (R-8821)'}`;
                let infoRightColor = 'text-emerald-700 font-bold';

                if (isCompleted) {
                  infoLeft = `餐车: ${order.truckName || '黑曜石 01 号流动餐车'}`;
                  infoRight = `骑手: ${order.courierName || '陈志远 (R-8821)'} · 已妥投`;
                  infoRightColor = 'text-emerald-700 font-bold';
                } else if (isDelivering || is9821 || is98215) {
                  infoLeft = `餐车: ${order.truckName || '黑曜石 01 号流动餐车'}`;
                  infoRight = `骑手: ${order.courierName || '陈志远 (R-8821)'}`;
                  infoRightColor = 'text-emerald-700 font-bold';
                } else if (is9820 || isCooking || isReady) {
                  infoLeft = `商家: ${order.truckName || '黑曜石 01 号车 (已锁定)'}`;
                  infoRight = isReady ? '出餐完毕: 专线骑手正在取餐' : '预配: 智能调度系统派单中';
                  infoRightColor = 'text-amber-700 font-medium';
                } else if (is9818) {
                  infoLeft = '点位: 天悦荟固定餐位 A-03';
                  infoRight = '算法: 匹配最高效运力单元';
                  infoRightColor = 'text-sky-700 font-medium';
                } else if (is9816) {
                  infoLeft = '核销码: 7892';
                  infoRight = '状态: 65°C 恒温锁鲜中';
                  infoRightColor = 'text-purple-700 font-medium';
                }

                // Bottom quote row
                let quoteRole = '骑手';
                let quoteRoleBadge = 'bg-[#ef4444] text-white';
                let quoteText = '"已到大悦城南楼电梯口，预计3分钟..."';
                let ctaType: 'enter_chat' | 'view_collab' | 'open_locker' = 'enter_chat';
                let ctaBadgeCount = unreadCount;

                if (isCompleted) {
                  quoteRole = '骑手';
                  quoteRoleBadge = 'bg-emerald-600 text-white';
                  quoteText = '"餐品已妥投送达至指定位置，请趁热享用！如有疑问随时沟通。"';
                  ctaType = 'enter_chat';
                  ctaBadgeCount = unreadCount;
                } else if (isDelivering || is9821 || is98215) {
                  quoteRole = '骑手';
                  quoteRoleBadge = 'bg-[#ef4444] text-white';
                  quoteText = '"已到大悦城南楼电梯口，预计3分钟..."';
                  ctaType = 'enter_chat';
                  ctaBadgeCount = unreadCount > 0 ? unreadCount : 4;
                } else if (is9820 || isCooking || isReady) {
                  quoteRole = '餐车';
                  quoteRoleBadge = 'bg-[#1f2937] text-white';
                  quoteText = isReady ? '"餐品已制作打包完毕，正在交付专线骑手..."' : '"您的极炙和牛拼盘已下锅现烤，预计..."';
                  ctaType = 'enter_chat';
                  ctaBadgeCount = unreadCount > 0 ? unreadCount : 2;
                } else if (is9818) {
                  quoteRole = '系统';
                  quoteRoleBadge = 'bg-[#2563eb] text-white';
                  quoteText = '"系统正在为您智能规划最优出餐批次与..."';
                  ctaType = 'view_collab';
                  ctaBadgeCount = 1;
                } else if (is9816) {
                  quoteRole = '保温柜';
                  quoteRoleBadge = 'bg-[#9333ea] text-white';
                  quoteText = '"餐品已入驻保温柜，支持一键开柜或核销码..."';
                  ctaType = 'open_locker';
                  ctaBadgeCount = 1;
                }

                return (
                  <motion.div
                    key={`collab-order-${order.id || cleanNo}-${idx}`}
                    layout
                    onClick={() => {
                      if (is9816) {
                        setLockerModalOrder(order);
                      } else {
                        setActiveStandaloneOrder(order);
                      }
                    }}
                    className={`bg-white border border-neutral-200/90 hover:border-neutral-300 shadow-2xs p-3.5 sm:p-4 flex flex-col gap-3 transition-all cursor-pointer group ${
                      idx === 0 ? 'mb-[6px] pt-[14px] !rounded-none' : 'rounded-2xl'
                    }`}
                    style={
                      idx === 0
                        ? {
                            marginBottom: '6px',
                            paddingTop: '14px',
                            borderRadius: '0px'
                          }
                        : undefined
                    }
                  >
                    {/* Header Row: ID, Tags, Statuses, Price */}
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Order ID Pill */}
                        <div
                          onClick={(e) => handleCopyOrderNo(order.orderNo, e)}
                          className="px-2 py-0.5 bg-neutral-50 hover:bg-neutral-100 text-neutral-800 border border-neutral-200/80 rounded-md text-xs font-bold font-mono flex items-center gap-1 cursor-pointer transition-colors"
                          title="点击复制单号"
                        >
                          <span>#{cleanNo}</span>
                          <Copy className="w-3 h-3 text-neutral-400 hover:text-neutral-700" />
                        </div>

                        {/* Channel Type */}
                        <span
                          className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                            is9818
                              ? 'bg-sky-50 text-sky-700 border border-sky-200/80'
                              : is9816
                              ? 'bg-purple-50 text-purple-700 border border-purple-200/80'
                              : 'bg-neutral-100 text-neutral-700'
                          }`}
                        >
                          {channelLabel}
                        </span>

                        {/* Status Badge 1 */}
                        <span className={`px-2 py-0.5 rounded-md text-xs font-medium flex items-center gap-1 ${statusBadge1Class}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          <span>{statusBadge1Text}</span>
                        </span>

                        {/* Status Badge 2 */}
                        <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${statusBadge2Class}`}>
                          {statusBadge2Text}
                        </span>
                      </div>

                      {/* Right Amount */}
                      <div className="ml-auto flex items-baseline gap-1 shrink-0">
                        <span className="text-[10px] text-neutral-400 font-medium">
                          {is9818 ? '预估' : '实付'} ¥
                        </span>
                        <span className="text-lg font-black text-neutral-900 leading-none">
                          {order.totalAmount || (is9821 ? 91 : is9820 ? 56 : is9818 ? 128 : 38)}
                        </span>
                      </div>
                    </div>

                    {/* Stepper Progress Bar */}
                    <div className="relative pt-1 pb-0.5 px-2">
                      {/* Connecting Lines between circle centers (at top 9px) */}
                      <div className="absolute top-[17px] left-[12.5%] right-[12.5%] h-[2px] z-0 flex">
                        {/* Segment 1 */}
                        <div
                          className={`flex-1 h-full ${
                            steps[0].state === 'done'
                              ? stepperTheme === 'purple'
                                ? 'bg-purple-500'
                                : stepperTheme === 'amber'
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                              : 'bg-neutral-200'
                          }`}
                        />
                        {/* Segment 2 */}
                        <div
                          className={`flex-1 h-full ${
                            steps[1].state === 'done'
                              ? stepperTheme === 'purple'
                                ? 'bg-purple-500'
                                : 'bg-emerald-500'
                              : 'bg-neutral-200'
                          }`}
                        />
                        {/* Segment 3 */}
                        <div
                          className={`flex-1 h-full ${
                            steps[2].state === 'done'
                              ? 'bg-emerald-500'
                              : 'bg-neutral-200'
                          }`}
                        />
                      </div>

                      {/* 4 Step Icons and Labels */}
                      <div className="flex items-center justify-between relative z-10">
                        {steps.map((step, sIdx) => {
                          const isDone = step.state === 'done';
                          const isActive = step.state === 'active';

                          return (
                            <div
                              key={`step-${sIdx}`}
                              className="flex flex-col items-center flex-1"
                            >
                              {/* Circle Icon */}
                              {isDone ? (
                                <div
                                  className={`w-4 h-4 rounded-full flex items-center justify-center text-white shadow-2xs ${
                                    stepperTheme === 'purple'
                                      ? 'bg-purple-600'
                                      : 'bg-emerald-500'
                                  }`}
                                >
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                </div>
                              ) : isActive ? (
                                <div
                                  className={`w-4 h-4 rounded-full flex items-center justify-center ring-2 bg-white ${
                                    stepperTheme === 'green'
                                      ? 'ring-emerald-500 text-emerald-600'
                                      : stepperTheme === 'amber'
                                      ? 'ring-amber-500 text-amber-600'
                                      : stepperTheme === 'blue'
                                      ? 'ring-sky-500 text-sky-600'
                                      : 'ring-purple-500 text-purple-600'
                                  }`}
                                >
                                  <div
                                    className={`w-2 h-2 rounded-full ${
                                      stepperTheme === 'green'
                                        ? 'bg-emerald-500 animate-ping'
                                        : stepperTheme === 'amber'
                                        ? 'bg-amber-500 animate-pulse'
                                        : stepperTheme === 'blue'
                                        ? 'bg-sky-500 animate-pulse'
                                        : 'bg-purple-500 animate-pulse'
                                    }`}
                                  />
                                </div>
                              ) : (
                                <div className="w-4 h-4 rounded-full bg-[#eef0f2] text-neutral-400 flex items-center justify-center text-[10px] font-bold font-mono">
                                  {step.stepNum}
                                </div>
                              )}

                              {/* Label */}
                              <span
                                className={`text-[10px] mt-1 tracking-tight font-medium ${
                                  isActive
                                    ? stepperTheme === 'green'
                                      ? 'text-emerald-700 font-bold'
                                      : stepperTheme === 'amber'
                                      ? 'text-amber-700 font-bold'
                                      : stepperTheme === 'blue'
                                      ? 'text-sky-700 font-bold'
                                      : 'text-purple-700 font-bold'
                                    : isDone
                                    ? 'text-neutral-700'
                                    : 'text-neutral-400'
                                }`}
                              >
                                {step.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Address & Timestamp Row */}
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-neutral-700 font-medium truncate">
                        <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span className="truncate">{displayAddress}</span>
                      </div>
                      <span className="text-[11px] text-neutral-400 font-mono shrink-0">
                        {formattedTime}
                      </span>
                    </div>

                    {/* Info Callout Box (Light Grey) */}
                    <div className="bg-[#f8f9fa] rounded-xl px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-neutral-600">
                      <span className="truncate">{infoLeft}</span>
                      <span className={`truncate ${infoRightColor}`}>{infoRight}</span>
                    </div>

                    {/* Bottom Message Quote & Action CTA Row */}
                    <div className="pt-2 border-t border-neutral-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${quoteRoleBadge}`}
                        >
                          {quoteRole}
                        </span>
                        <span className="text-xs text-neutral-600 truncate font-normal">
                          {quoteText}
                        </span>
                      </div>

                      {/* Right CTA Button */}
                      {ctaType === 'enter_chat' ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveStandaloneOrder(order);
                          }}
                          className={`px-3 py-1.5 ${
                            idx === 0 ? 'rounded-[19px]' : 'rounded-xl'
                          } bg-[#0f172a] hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-2xs active:scale-95`}
                          style={idx === 0 ? { borderRadius: '19px' } : undefined}
                        >
                          <span>进群协同</span>
                          <span className="w-4 h-4 rounded-full bg-[#ef4444] text-white text-[10px] font-bold flex items-center justify-center">
                            {ctaBadgeCount}
                          </span>
                          <ChevronRight className="w-3 h-3 ml-[-2px]" />
                        </button>
                      ) : ctaType === 'view_collab' ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveStandaloneOrder(order);
                          }}
                          className={`px-3 py-1.5 ${
                            idx === 0 ? 'rounded-[19px]' : 'rounded-xl'
                          } bg-[#f1f3f5] hover:bg-[#e2e5e9] text-neutral-800 text-xs font-semibold flex items-center gap-0.5 transition-colors cursor-pointer shrink-0`}
                          style={idx === 0 ? { borderRadius: '19px' } : undefined}
                        >
                          <span>查看协同</span>
                          <ChevronRight className="w-3 h-3 text-neutral-500" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLockerModalOrder(order);
                          }}
                          className={`px-3 py-1.5 ${
                            idx === 0 ? 'rounded-[19px]' : 'rounded-xl'
                          } bg-[#0f172a] hover:bg-black text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0 shadow-2xs active:scale-95`}
                          style={idx === 0 ? { borderRadius: '19px' } : undefined}
                        >
                          <span>核销开柜凭证</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Online Chat Modal triggered for specific order */}
      {liveChatTargetOrder && (
        <UnifiedOmniChatModal
          isOpen={isChatModalOpen}
          onClose={() => {
            setIsChatModalOpen(false);
            setChatTargetOrder(null);
          }}
          order={liveChatTargetOrder}
          orderNo={liveChatTargetOrder.orderNo.replace(/^#/, '')}
          viewerRole={normalizedRole}
          onAdvanceOrderStatus={onAdvanceOrderStatus}
          onRejectOrder={onRejectOrder}
          onAuditRefund={onAuditRefund}
          showToast={(msg) => showToast(msg)}
        />
      )}

      {/* Quick Dispatch / Active Message Form Modal */}
      <ActiveMessageFormModal
        isOpen={isMessageFormOpen}
        onClose={() => setIsMessageFormOpen(false)}
        orders={combinedOrders}
        dishes={dishes}
        viewerRole={viewerRole}
        onAdvanceOrderStatus={onAdvanceOrderStatus}
        showToast={showToast}
        onOpenOmniChat={(ordNo) => {
          setIsMessageFormOpen(false);
          const found = combinedOrders.find((o) => o.orderNo.replace(/^#/, '') === (ordNo || '').replace(/^#/, ''));
          if (found) {
            setActiveStandaloneOrder(found);
          }
        }}
      />

      {/* Smart Locker Pickup Credential Modal */}
      <AnimatePresence>
        {lockerModalOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-neutral-100 flex flex-col items-center text-center space-y-4 relative"
            >
              <button
                type="button"
                onClick={() => {
                  setLockerModalOrder(null);
                  setIsLockerUnlocked(false);
                }}
                className="absolute right-3.5 top-3.5 w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center ring-4 ring-purple-100">
                {isLockerUnlocked ? <Unlock className="w-6 h-6 text-emerald-600" /> : <Lock className="w-6 h-6" />}
              </div>

              <div>
                <h3 className="text-base font-black text-neutral-900">
                  {isLockerUnlocked ? '取餐柜门已弹开' : '餐车智能保温取餐凭证'}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  静安大悦城北广场流动餐车 01 号保温取餐柜 · 04 号格口
                </p>
              </div>

              {/* Locker Passcode Box */}
              <div className="w-full bg-[#f8f6fc] rounded-2xl p-4 border border-purple-100 flex flex-col items-center space-y-2">
                <span className="text-xs text-purple-600 font-semibold">取餐核销码 (4位数)</span>
                <span className="text-3xl font-black font-mono tracking-widest text-purple-900">
                  7892
                </span>
                <span className="text-[11px] text-purple-500 bg-purple-100/60 px-2 py-0.5 rounded-full font-medium">
                  🌡️ 当前温控：65.2°C 恒温锁鲜中
                </span>
              </div>

              {/* Barcode & QR Code representation */}
              <div className="w-full py-2 flex flex-col items-center justify-center gap-1 border-t border-b border-neutral-100">
                <div className="flex items-center gap-1 h-8 opacity-80">
                  {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 4, 2].map((w, i) => (
                    <div key={i} className="bg-neutral-800 h-full rounded-xs" style={{ width: `${w * 1.8}px` }} />
                  ))}
                </div>
                <span className="text-[10px] font-mono text-neutral-400">7892-04-UR9816-LOCK</span>
              </div>

              {/* Simulated Open Locker Door Action */}
              <div className="w-full pt-1">
                {isLockerUnlocked ? (
                  <div className="w-full py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center justify-center gap-1.5 border border-emerald-200">
                    <CheckCheck className="w-4 h-4" />
                    <span>柜门已开启，请及时取走餐品并关好门</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsLockerUnlocked(true);
                      showToast('开柜成功', '取餐柜 04 号格门已自动弹开');
                      if (onAdvanceOrderStatus && lockerModalOrder) {
                        onAdvanceOrderStatus(lockerModalOrder.id || 'ord-9816', 'completed');
                      }
                    }}
                    className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition-all shadow-md cursor-pointer active:scale-98 flex items-center justify-center gap-1.5"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>一键模拟远程开柜</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
