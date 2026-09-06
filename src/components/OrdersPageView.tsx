import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Compass,
  Bell,
  Truck,
  CookingPot,
  Zap,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  Clock,
  MapPin,
  Sparkles,
  ShoppingBag,
  CircleDot,
  Check,
  Store,
  DollarSign,
  Cloud,
  RefreshCw,
  Activity,
  AlertCircle,
  XCircle,
  FileText,
  User,
  Search,
  ShieldCheck,
  Filter,
  Package,
  X,
  Phone,
  Bike,
  Receipt,
  ChefHat,
  MessageSquareText,
  UtensilsCrossed,
  PackageCheck,
  Flame,
  Layers,
  QrCode,
  BellRing
} from 'lucide-react';
import { Order, UserProfile } from '../types';
import { fetchOrdersFromCloudFunction, cancelCloudOrder, updateCloudOrderStatus } from '../utils/cloudbase';
import { CloudFunctionMonitorModal } from './user/CloudFunctionMonitorModal';
import { useToast } from './ui/ToastContext';
import { isOrderMatch } from '../utils/orderNormalizer';
import { getOrderStatusConfig, GranularOrderStatus } from '../utils/orderFlowEngine';
import { useDevSimulation } from '../context/DevSimulationContext';
import { SimulationProbe } from './dev/SimulationProbe';
import { UnifiedOmniChatModal } from './chat/UnifiedOmniChatModal';

// Dynamic Step Node Icon Component for 5-Stage Order Progress (下单、商家接单、骑手取件、配送、送达)
const StepNodeIcon: React.FC<{
  stepIndex: number;
  isCurrent: boolean;
  isCompleted: boolean;
  channel?: string;
  sizeClass?: string;
}> = ({ stepIndex, isCurrent, isCompleted, channel = 'delivery', sizeClass = 'w-3.5 h-3.5' }) => {
  const isDineIn = channel === 'dine_in';
  const isPickup = channel === 'pickup';

  if (isCompleted) {
    switch (stepIndex) {
      case 0:
        return <ShoppingBag className={sizeClass} />;
      case 1:
        return isDineIn || isPickup ? <ChefHat className={sizeClass} /> : <CookingPot className={sizeClass} />;
      case 2:
        return isDineIn ? <Flame className={sizeClass} /> : isPickup ? <Flame className={sizeClass} /> : <Package className={sizeClass} />;
      case 3:
        return isDineIn ? <UtensilsCrossed className={sizeClass} /> : isPickup ? <PackageCheck className={sizeClass} /> : <Bike className={sizeClass} />;
      case 4:
        return <CheckCircle2 className={sizeClass} />;
      default:
        return <Check className={sizeClass} />;
    }
  }

  if (isCurrent) {
    switch (stepIndex) {
      case 0: // 下单
        return (
          <motion.div
            animate={{ scale: [1, 1.18, 0.95, 1] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            className="flex items-center justify-center"
          >
            <ShoppingBag className={`${sizeClass} text-amber-300 drop-shadow-[0_0_6px_rgba(252,211,77,0.9)]`} />
          </motion.div>
        );
      case 1: // 接单排产
        return (
          <motion.div
            animate={{ rotate: [0, -8, 8, -4, 0], y: [0, -1.5, 0] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
            className="flex items-center justify-center"
          >
            {isDineIn || isPickup ? (
              <ChefHat className={`${sizeClass} text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.9)]`} />
            ) : (
              <CookingPot className={`${sizeClass} text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.9)]`} />
            )}
          </motion.div>
        );
      case 2: // 现制/打包
        return (
          <motion.div
            animate={{ y: [0, -2, 0], scale: [1, 1.14, 1] }}
            transition={{ repeat: Infinity, duration: 1.7, ease: 'easeInOut' }}
            className="flex items-center justify-center"
          >
            {isDineIn || isPickup ? (
              <Flame className={`${sizeClass} text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.9)]`} />
            ) : (
              <Package className={`${sizeClass} text-sky-300 drop-shadow-[0_0_6px_rgba(125,211,252,0.9)]`} />
            )}
          </motion.div>
        );
      case 3: // 陆续上菜 / 恒温入柜 / 骑手配送
        return (
          <motion.div
            animate={{ x: [0, 2, -1, 0], y: [0, -1, 0] }}
            transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
            className="flex items-center justify-center"
          >
            {isDineIn ? (
              <UtensilsCrossed className={`${sizeClass} text-emerald-300 drop-shadow-[0_0_6px_rgba(110,231,183,0.9)]`} />
            ) : isPickup ? (
              <PackageCheck className={`${sizeClass} text-emerald-300 drop-shadow-[0_0_6px_rgba(110,231,183,0.9)]`} />
            ) : (
              <Bike className={`${sizeClass} text-emerald-300 drop-shadow-[0_0_6px_rgba(110,231,183,0.9)]`} />
            )}
          </motion.div>
        );
      case 4: // 送达 / 齐备 / 已取
        return (
          <motion.div
            animate={{ scale: [1, 1.22, 1], rotate: [0, 6, -6, 0] }}
            transition={{ repeat: Infinity, duration: 1.9, ease: 'easeInOut' }}
            className="flex items-center justify-center"
          >
            <CheckCircle2 className={`${sizeClass} text-emerald-300 drop-shadow-[0_0_8px_rgba(110,231,183,0.95)]`} />
          </motion.div>
        );
      default:
        return <Check className={sizeClass} />;
    }
  }

  // Pending State
  switch (stepIndex) {
    case 0:
      return <ShoppingBag className="w-3 h-3 text-[#9c9b94]" />;
    case 1:
      return isDineIn || isPickup ? <ChefHat className="w-3 h-3 text-[#9c9b94]" /> : <CookingPot className="w-3 h-3 text-[#9c9b94]" />;
    case 2:
      return isDineIn || isPickup ? <Flame className="w-3 h-3 text-[#9c9b94]" /> : <Package className="w-3 h-3 text-[#9c9b94]" />;
    case 3:
      return isDineIn ? <UtensilsCrossed className="w-3 h-3 text-[#9c9b94]" /> : isPickup ? <PackageCheck className="w-3 h-3 text-[#9c9b94]" /> : <Bike className="w-3 h-3 text-[#9c9b94]" />;
    case 4:
      return <CheckCircle2 className="w-3 h-3 text-[#9c9b94]" />;
    default:
      return <span className="w-1.5 h-1.5 rounded-full bg-[#aaa9a0]" />;
  }
};

interface OrdersPageViewProps {
  orders: Order[];
  onOpenRadar?: (orderId?: string) => void;
  onOpenVIP?: () => void;
  onGoToMenu?: () => void;
  onRefreshOrders?: () => void;
  onOrdersUpdated?: (orders: Order[]) => void;
  onApplyRefund?: (orderId: string, reason: string, feedback: string, passedStep: number) => void;
  onOpenMessageCenter?: (orderNo?: string) => void;
  userProfile?: UserProfile;
}

type TabType = 'in_progress' | 'recently_delivered' | 'history';

export const OrdersPageView: React.FC<OrdersPageViewProps> = ({
  orders,
  onOpenRadar,
  onOpenVIP,
  onGoToMenu,
  onRefreshOrders,
  onOrdersUpdated,
  onApplyRefund,
  onOpenMessageCenter,
  userProfile
}) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('in_progress');
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<any | null>(null);
  const [showNotificationToast, setShowNotificationToast] = useState(false);
  const [isPullingCloud, setIsPullingCloud] = useState(false);
  const [isMonitorOpen, setIsMonitorOpen] = useState(false);
  const { isSimulationAllowed, openDevAuthModal } = useDevSimulation();
  const [cancelingOrderId, setCancelingOrderId] = useState<string | null>(null);
  const [chatOrder, setChatOrder] = useState<Order | null>(null);

  // Refund Application Feedback Modal State
  const [refundModalOrder, setRefundModalOrder] = useState<any | null>(null);
  const [refundReason, setRefundReason] = useState<string>('临时有事 / 行程变更');
  const [refundFeedback, setRefundFeedback] = useState<string>('');
  const [isSubmittingRefund, setIsSubmittingRefund] = useState<boolean>(false);

  // UID-based filtering and prefix judgment
  const currentUid = userProfile?.uid || 'tcb_u_88201948';
  const [uidScope, setUidScope] = useState<'my_uid' | 'all'>('my_uid');
  const [uidSearchPrefix, setUidSearchPrefix] = useState<string>('');

  // Filter orders according to UID scope and search prefix
  const scopedOrders = useMemo(() => {
    let list = orders;
    if (uidScope === 'my_uid') {
      list = list.filter((o) => {
        // If order has no userId (legacy/mock), treat as current user's or check if userId matches
        if (!o.userId) return true;
        return (
          o.userId === currentUid ||
          o.userId.startsWith(currentUid) ||
          o.userId === 'tcb_u_88201948' ||
          o.orderNo.includes(currentUid.slice(-4))
        );
      });
    }

    if (uidSearchPrefix.trim()) {
      const prefix = uidSearchPrefix.trim().toLowerCase();
      list = list.filter(
        (o) =>
          (o.userId && o.userId.toLowerCase().includes(prefix)) ||
          o.orderNo.toLowerCase().includes(prefix) ||
          (o.customerName && o.customerName.toLowerCase().includes(prefix)) ||
          (o.userPhone && o.userPhone.includes(prefix))
      );
    }

    if (list.length === 0 && orders.length > 0 && !uidSearchPrefix.trim()) {
      return orders;
    }

    return list;
  }, [orders, uidScope, currentUid, uidSearchPrefix]);

  // Pull orders directly from Cloud Function `orders` / `getOrders`
  const handlePullFromCloudFunction = async () => {
    setIsPullingCloud(true);
    toast.info('正在调用云函数 [orders] 同步最新订单...');
    try {
      const res = await fetchOrdersFromCloudFunction(undefined, uidScope === 'my_uid' ? currentUid : undefined);
      if (res.success && res.orders) {
        if (onOrdersUpdated) {
          onOrdersUpdated(res.orders);
        }
        toast.success(`云函数 [${res.functionName || 'orders'}] 同步成功`, `已同步 UID: ${currentUid.slice(-6)} 下的 ${res.orders.length} 笔订单`);
      } else {
        toast.info('已拉取本地双轨订单', '云函数暂未部署或受网络保护，已启用本地持久化存储');
      }
    } catch (err: any) {
      toast.error('拉取异常', err?.message);
    } finally {
      setIsPullingCloud(false);
      if (onRefreshOrders) onRefreshOrders();
    }
  };

  // Handle Cancel / Refund via Cloud Function
  const handleCancelOrder = async (orderId: string, orderNo: string) => {
    if (!window.confirm(`确定要取消订单 #${orderNo} 吗？款项将原路退回至账户。`)) {
      return;
    }
    setCancelingOrderId(orderId);
    try {
      await cancelCloudOrder(orderId, '用户主动申请退单');
      toast.success(`订单 #${orderNo} 已取消`, '云函数 [cancelOrder] 已同步处理退款');
      if (onRefreshOrders) onRefreshOrders();
    } catch (err: any) {
      toast.error('取消失败', err?.message);
    } finally {
      setCancelingOrderId(null);
    }
  };

  // Default replica items matching screenshot with rich Dine-in & Pickup coverage
  const defaultInProgressOrders = [
    {
      id: 'ord-din-9821',
      title: '餐车外摆 A1 号桌 · 堂食就餐',
      orderNo: 'UR-DIN-9821',
      userId: 'tcb_u_88201948',
      userPhone: '138-8888-9201',
      customerName: '先锋食客',
      channel: 'dine_in',
      channelType: 'dine_in',
      tableCode: 'A1',
      tableZone: '餐车外摆休闲区',
      serverName: '传菜专员小林',
      status: '陆续出餐上桌',
      statusType: 'serving',
      estArrival: '约 5 分钟出齐',
      distance: '堂食台位',
      itemsCount: 3,
      itemsSummary: '碳烤和牛小汉堡双重奏 x 2, 黑曜极夜冷萃冰咖 x 1, 冷萃黑金茉莉提拉米苏 x 1',
      items: [
        { name: '碳烤和牛小汉堡双重奏', quantity: 2, price: 63.0, options: '五分熟, 招牌黑椒汁', serveStatus: 'served', prepProgress: 100, station: '炭火炙烤档', serveTime: '12:35' },
        { name: '黑曜极夜冷萃冰咖', quantity: 1, price: 22.0, options: '少冰, 无糖', serveStatus: 'served', prepProgress: 100, station: '冷饮现调档', serveTime: '12:26' },
        { name: '冷萃黑金茉莉提拉米苏', quantity: 1, price: 38.0, options: '微甜, 加双份可可粉', serveStatus: 'cooking', prepProgress: 75, station: '西点烘焙档' }
      ],
      totalAmount: 186.0,
      hasTopAccent: true,
      stepIndex: 3, // 0: 下单, 1: 接单, 2: 现制, 3: 陆续上菜, 4: 餐品齐备
      courierName: '传菜专员小林',
      courierPhone: '138-0012-9821',
      createdTime: '12:20'
    },
    {
      id: 'ord-pk-8806',
      title: '餐车取餐柜 · 到店自提',
      orderNo: 'UR-PK-8806',
      userId: 'tcb_u_88201948',
      userPhone: '138-8888-9201',
      customerName: '先锋食客',
      channel: 'pickup',
      channelType: 'pickup',
      pickupCode: '8806',
      pickupShelfCode: '01 号智能保温取餐柜 (65℃恒温)',
      status: '出餐待取 (凭码即取)',
      statusType: 'ready',
      estArrival: '已入恒温柜保温',
      distance: '智能恒温柜',
      itemsCount: 2,
      itemsSummary: '果木烟熏黑豚炙烤五花 x 1, 黑曜石松露金黄脆薯 x 1',
      items: [
        { name: '果木烟熏黑豚炙烤五花', quantity: 1, price: 55.0, options: '果木微熏香甜', serveStatus: 'ready_to_serve', prepProgress: 100, station: '已装盒贴封签', serveTime: '12:40' },
        { name: '黑曜石松露金黄脆薯', quantity: 1, price: 32.0, options: '黑松露美乃滋', serveStatus: 'ready_to_serve', prepProgress: 100, station: '01号智能保温格', serveTime: '12:38' }
      ],
      totalAmount: 87.0,
      hasTopAccent: false,
      stepIndex: 3, // 0: 提交, 1: 接单, 2: 现制包装, 3: 出餐待取, 4: 到店已取
      courierName: '餐车取餐柜',
      courierPhone: '139-8822-9804',
      createdTime: '12:30'
    },
    {
      id: 'ord-ur-9821',
      title: '黑曜石 01 号流动餐车',
      orderNo: 'UR-9821',
      userId: 'tcb_u_88201948',
      userPhone: '138-8888-9201',
      customerName: '先锋食客',
      channel: 'delivery',
      channelType: 'delivery',
      status: '骑手配送中',
      statusType: 'en_route',
      estArrival: '12:55:00',
      distance: '1.2 公里',
      itemsCount: 2,
      itemsSummary: '极夜燕麦拿铁 x 1, 现烤肉桂卷 x 1',
      items: [
        { name: '极夜燕麦拿铁', quantity: 1, price: 28.0, options: '标冰', serveStatus: 'ready_to_serve', prepProgress: 100, station: '冷饮现调档' },
        { name: '现烤肉桂卷', quantity: 1, price: 35.0, options: '现烘现烤', serveStatus: 'ready_to_serve', prepProgress: 100, station: '烘焙烤箱' }
      ],
      totalAmount: 91.0,
      hasTopAccent: true,
      stepIndex: 3, // 0: 下单, 1: 商家接单, 2: 骑手取件, 3: 配送, 4: 送达
      courierName: '张专员 (专线急速车 01)',
      courierPhone: '138-0012-9821',
      createdTime: '12:40'
    },
    {
      id: 'ord-ur-9804',
      title: '黑曜石 01 号流动餐车',
      orderNo: 'UR-9804',
      userId: 'tcb_u_88201948',
      userPhone: '138-8888-9201',
      customerName: '先锋食客',
      channel: 'delivery',
      channelType: 'delivery',
      status: '餐车备餐中',
      statusType: 'preparing',
      estArrival: '12 分钟',
      distance: '1.2 公里',
      itemsCount: 1,
      itemsSummary: '黑曜石炭烤双层和牛堡 x 1',
      items: [
        { name: '黑曜石炭烤双层和牛堡', quantity: 1, price: 87.0, options: '全熟', serveStatus: 'cooking', prepProgress: 45, station: '炭火炙烤档' }
      ],
      totalAmount: 87.0,
      hasTopAccent: false,
      stepIndex: 1, // 商家接单
      courierName: '餐车吧台主理人',
      courierPhone: '139-8822-9804',
      createdTime: '12:30'
    }
  ];

  // Recently delivered replica items
  const defaultDeliveredOrders = [
    {
      id: 'ord-ur-4890',
      title: '黑曜石 01 号流动餐车',
      orderNo: 'UR-4890',
      userId: 'tcb_u_88201948',
      userPhone: '138-8888-9201',
      customerName: '先锋食客',
      status: '已送达',
      statusType: 'delivered',
      estArrival: '11:20',
      distance: '0.8 公里',
      itemsCount: 4,
      itemsSummary: '炭烤伊比利亚猪排, 温泉蛋牛油果沙拉, 气泡水x2',
      totalAmount: 186.0,
      hasTopAccent: false,
      stepIndex: 4, // 送达
      courierName: '王专员',
      courierPhone: '136-1234-5678',
      createdTime: '11:00'
    }
  ];

  // History replica items
  const defaultHistoryOrders = [
    {
      id: 'ord-ur-4780',
      title: '黑曜石 01 号流动餐车',
      orderNo: 'UR-4780',
      userId: 'tcb_u_88201948',
      userPhone: '138-8888-9201',
      customerName: '先锋食客',
      status: '已完成',
      statusType: 'delivered',
      estArrival: '昨天 18:30',
      distance: '1.2 公里',
      itemsCount: 2,
      itemsSummary: '黑曜石和牛堡套餐',
      totalAmount: 88.0,
      hasTopAccent: false,
      stepIndex: 4,
      courierName: '王专员',
      courierPhone: '136-1234-5678',
      createdTime: '昨天 18:10'
    },
    {
      id: 'ord-ur-4652',
      title: '黑曜石 02 号流动餐车',
      orderNo: 'UR-4652',
      userId: 'tcb_u_88201948',
      userPhone: '138-8888-9201',
      customerName: '先锋食客',
      status: '已完成',
      statusType: 'delivered',
      estArrival: '前天 12:15',
      distance: '2.1 公里',
      itemsCount: 3,
      itemsSummary: '烟熏低温牛胸肉, 烤芦笋',
      totalAmount: 145.0,
      hasTopAccent: false,
      stepIndex: 4,
      courierName: '李专员',
      courierPhone: '137-9876-5432',
      createdTime: '前天 11:50'
    }
  ];

  // Map real dynamic user orders into the list if they exist (using scopedOrders with UID filtering)
  const dynamicInProgress = scopedOrders
    .filter((o) => {
      const s = (o.status || '') as string;
      return s !== 'completed' && s !== 'delivered' && s !== 'refunded' && s !== 'cancelled' && o.stepIndex !== 7;
    })
    .map((o) => {
      const cfg = getOrderStatusConfig(o.status);
      const isDelivering = o.status === 'delivering';
      const isRefundPending = o.status === 'refund_pending' || o.refundStatus === 'pending' || o.status === 'cancel_requested';

      // 5-stage progress indicator index
      let displayStepIndex = 0;
      if (typeof o.stepIndex === 'number') {
        if (o.stepIndex >= 7) displayStepIndex = 4;
        else if (o.stepIndex >= 6) displayStepIndex = 3;
        else if (o.stepIndex >= 4) displayStepIndex = 2;
        else if (o.stepIndex >= 1) displayStepIndex = 1;
        else displayStepIndex = 0;
      } else if (isDelivering) {
        displayStepIndex = 3;
      } else if (cfg.key === 'ready' || cfg.key === 'waiting_pickup' || cfg.key === 'picked_up') {
        displayStepIndex = 2;
      } else if (cfg.key === 'cooking' || cfg.key === 'rider_heading') {
        displayStepIndex = 1;
      }

      return {
        id: o.id,
        title: o.truckName || '黑曜石 01 号流动餐车',
        orderNo: o.orderNo,
        userId: o.userId || currentUid,
        userPhone: o.userPhone || userProfile?.phone || '138-8888-9201',
        customerName: o.customerName || userProfile?.nickname || '先锋食客',
        channelType: o.channelType || o.channel || 'delivery',
        channel: o.channelType || o.channel || 'delivery',
        tableCode: o.tableCode,
        tableZone: o.tableZone,
        serverName: o.serverName,
        pickupCode: o.pickupCode,
        pickupShelfCode: o.pickupShelfCode,
        items: o.items || [],
        rawOrder: o,
        rawStatus: o.status,
        statusConfig: cfg,
        status: cfg.badgeText || cfg.label,
        statusType: o.status,
        estArrival: o.estimatedDeliveryTime?.replace('约', '')?.replace('后', '')?.trim() || (isDelivering ? '12:55:00' : '10-15 分钟'),
        distance: o.channelType === 'dine_in' ? '堂食台位' : o.channelType === 'pickup' ? '智能取餐柜' : '1.2 公里',
        itemsCount: o.items.reduce((s, i) => s + i.quantity, 0),
        itemsSummary: o.items.map((i) => `${i.name} x ${i.quantity}`).join(', '),
        totalAmount: o.totalAmount,
        hasTopAccent: cfg.key === 'delivering' || cfg.key === 'picked_up' || isDelivering,
        stepIndex: displayStepIndex,
        courierName: o.courierName || (isDelivering ? '陈志远 (专线骑手 R-8821)' : '餐车吧台主理人'),
        courierPhone: o.courierPhone || '138-1829-9201',
        createdTime: o.createdTime || '刚刚',
        nonRefundable: o.nonRefundable,
        refundStatus: o.refundStatus,
        refundReason: o.refundReason,
        refundFeedback: o.refundFeedback,
        refundPassedStep: o.refundPassedStep,
        refundRejectReason: o.refundRejectReason
      };
    });

  const dynamicDelivered = scopedOrders
    .filter((o) => o.status === 'completed' || (o.status as string) === 'delivered' || o.status === 'refunded' || o.stepIndex === 7 || o.stepIndex === 4)
    .map((o) => {
      const cfg = getOrderStatusConfig(o.status || 'completed');
      return {
        id: o.id,
        title: o.truckName || '黑曜石 01 号流动餐车',
        orderNo: o.orderNo,
        userId: o.userId || currentUid,
        userPhone: o.userPhone || userProfile?.phone || '138-8888-9201',
        customerName: o.customerName || userProfile?.nickname || '先锋食客',
        channelType: o.channelType || 'delivery',
        rawStatus: o.status,
        statusConfig: cfg,
        status: cfg.badgeText || (o.status === 'refunded' ? '已退款' : '已送达'),
        statusType: o.status === 'refunded' ? 'refunded' : 'delivered',
        estArrival: o.status === 'refunded' ? '已全额退款' : (o.estimatedDeliveryTime || o.createdTime || '已送达'),
        distance: '1.2 公里',
        itemsCount: o.items.reduce((s, i) => s + i.quantity, 0),
        itemsSummary: o.items.map((i) => `${i.name} x ${i.quantity}`).join(', '),
        totalAmount: o.totalAmount,
        hasTopAccent: false,
        stepIndex: 4,
        courierName: o.courierName || '陈志远 (专线骑手 R-8821)',
        courierPhone: o.courierPhone || '138-1829-9201',
        createdTime: o.createdTime || '已送达',
        nonRefundable: o.nonRefundable,
        refundStatus: o.refundStatus,
        refundReason: o.refundReason,
        refundFeedback: o.refundFeedback,
        refundPassedStep: o.refundPassedStep,
        refundRejectReason: o.refundRejectReason
      };
    });

  const hasRealScopedOrders = scopedOrders.length > 0;
  // If fallback mock is used, filter out any orders that are already completed in live orders
  const syncedDefaultInProgress = defaultInProgressOrders.filter((d) => {
    const match = orders.find((o) => isOrderMatch(o, d.orderNo || d.id));
    if (match && (match.status === 'completed' || match.stepIndex === 4)) {
      return false;
    }
    return true;
  });

  const inProgressList = hasRealScopedOrders ? dynamicInProgress : syncedDefaultInProgress;
  const recentlyDeliveredList = hasRealScopedOrders ? dynamicDelivered : defaultDeliveredOrders;
  const historyList = defaultHistoryOrders;

  const currentDisplayList: any[] =
    activeTab === 'in_progress'
      ? inProgressList
      : activeTab === 'recently_delivered'
      ? recentlyDeliveredList
      : historyList;

  const handleTrackRadar = (order: any) => {
    if (onOpenRadar) {
      onOpenRadar(order.orderNo || order.id);
    } else {
      setSelectedOrderDetail(order);
    }
  };

  const handleBellClick = () => {
    setShowNotificationToast(true);
    setTimeout(() => setShowNotificationToast(false), 2500);
  };

  // Horizontal Step Nodes Flow Component with 5 states (Read-only for client security & anti-tampering)
  const renderHorizontalSteps = (order: any, stepIndex: number) => {
    const channel = order?.channelType || order?.channel || (order?.tableCode ? 'dine_in' : order?.pickupCode ? 'pickup' : 'delivery');
    const isDineIn = channel === 'dine_in';
    const isPickup = channel === 'pickup';

    const steps = isDineIn
      ? [
          { key: 'placed', label: '开台下单', desc: '微信扫码开台支付成功' },
          { key: 'accepted', label: '后厨接单', desc: '炭火档与冷饮档同步排产' },
          { key: 'cooking', label: '炭火现制', desc: '高温炭火慢烘炙烤' },
          { key: 'serving', label: '陆续上菜', desc: '传菜专员核验出餐上桌' },
          { key: 'all_served', label: '餐品齐备', desc: '全单菜品上齐，客享盛宴' }
        ]
      : isPickup
      ? [
          { key: 'placed', label: '提交订单', desc: '支付成功已入库' },
          { key: 'accepted', label: '餐车接单', desc: '餐车主理人排产确认' },
          { key: 'cooking', label: '现制包装', desc: '炭火现制与双层锁鲜封签' },
          { key: 'ready', label: '出餐待取', desc: '放入恒温取餐柜生成取餐码' },
          { key: 'completed', label: '到店已取', desc: '顾客核销取餐履约完成' }
        ]
      : [
          { key: 'placed', label: '下单', desc: '已提交支付' },
          { key: 'accepted', label: '商家接单', desc: '餐车后厨备料制作' },
          { key: 'pickup', label: '出餐待取', desc: '出餐完毕待骑手核验' },
          { key: 'delivering', label: '专送中', desc: '恒温箱极速配送' },
          { key: 'delivered', label: '已送达', desc: '餐品妥投存证' }
        ];

    const isDelivered =
      order?.statusType === 'delivered' ||
      order?.status === 'DELIVERED' ||
      order?.status === 'completed' ||
      stepIndex >= 4;

    const safeStep = Math.max(0, Math.min(stepIndex, 4));
    const progressPercentVal = isDelivered ? 100 : (safeStep / 4) * 100;

    return (
      <div className="pt-2 pb-1.5 px-0.5">
        <div className="flex items-center justify-between text-[10px] text-neutral-500 mb-1.5 px-1 font-mono">
          <span className="flex items-center gap-1 text-emerald-700 font-bold">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>{isDineIn ? '堂食出餐上桌轨迹' : isPickup ? '自提取餐出餐轨迹' : '官方专送实时轨迹'}</span>
          </span>
          <span className="text-[9.5px] text-neutral-400 bg-neutral-100 px-1.5 py-0.2 rounded border border-neutral-200">
            {isDelivered
              ? '履约已终局交付·存证归档'
              : isDineIn
              ? `当前台位 · ${order.tableCode || 'A1'} 号桌`
              : isPickup
              ? `取餐码 #${order.pickupCode || '8806'}`
              : '状态流转由商家与调度推进'}
          </span>
        </div>

        <div className="relative flex items-center justify-between">
          {/* Background Track Line */}
          <div className="absolute top-3.5 left-5 right-5 h-[2.5px] bg-[#e6e6e1] rounded-full z-0" />
          {/* Active Animated Progress Track Line */}
          <motion.div
            className="absolute top-3.5 left-5 h-[2.5px] bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-full z-0 shadow-xs"
            initial={false}
            animate={{ width: isDelivered ? 'calc(100% - 2.5rem)' : `calc(${progressPercentVal}% - 14px)` }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          />

          {steps.map((s, idx) => {
            const isCompleted = isDelivered ? true : idx < safeStep;
            const isCurrent = isDelivered ? idx === 4 : idx === safeStep;
            return (
              <div
                key={s.key}
                onClick={(e) => {
                  e.stopPropagation();
                  toast.info('🔒 官方履约锁控', '订单状态流转仅由餐车主理人与接单骑手授权推进，客户端为实时防篡改存证');
                }}
                title={`阶段:「${s.label}」- ${s.desc} (客户端只读)`}
                className="relative z-10 flex flex-col items-center group cursor-pointer focus:outline-hidden"
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-2xs border ${
                    isCompleted
                      ? 'bg-[#15803d] text-white border-[#15803d] shadow-xs'
                      : isCurrent
                      ? 'bg-black text-white border-black ring-2 ring-emerald-500 ring-offset-2 scale-110 shadow-sm'
                      : 'bg-[#f4f4f0] text-[#888880] border-[#deded8] group-hover:bg-[#ebebe5] group-hover:border-neutral-400'
                  }`}
                >
                  <StepNodeIcon
                    stepIndex={idx}
                    isCurrent={isCurrent && !isDelivered}
                    isCompleted={isCompleted}
                    channel={channel}
                    sizeClass="w-3.5 h-3.5"
                  />
                </div>
                <span
                  className={`text-[10.5px] mt-1.5 font-bold tracking-tight whitespace-nowrap transition-colors ${
                    isDelivered || isCompleted
                      ? 'text-[#15803d] font-black'
                      : isCurrent
                      ? 'text-black font-black drop-shadow-2xs'
                      : 'text-[#8c8b84] group-hover:text-neutral-700'
                  }`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="w-full max-w-md mx-auto min-h-[85vh] bg-[#f9f9f7] text-[#1a1c1b] px-1 py-0 flex flex-col font-sans select-none shrink-0"
    >
      {/* Toast Notification */}
      <AnimatePresence>
        {showNotificationToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-black text-white text-xs px-3.5 py-2 rounded-full shadow-xl flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
            <span>订单实时状态推送已开启</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar */}
      <div className="pt-0.5 pb-1 flex items-center justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-black tracking-tight text-black flex items-center gap-1.5">
            <span>实时订单</span>
            <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
          </h2>
          <p className="text-[11px] text-[#787770] font-medium mt-0.5">
            云函数已直连 · 实时状态推送流
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Pull from Cloud Function Button */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            onClick={handlePullFromCloudFunction}
            disabled={isPullingCloud}
            className="px-2.5 py-1 rounded-full bg-white border border-[#e6e6e4] text-black hover:bg-neutral-100 active:scale-95 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs disabled:opacity-50"
            title="调用云函数拉取最新订单"
          >
            <RefreshCw className={`w-3 h-3 text-emerald-600 ${isPullingCloud ? 'animate-spin' : ''}`} />
            <span>{isPullingCloud ? '拉取中' : '云端拉取'}</span>
          </motion.button>

          {/* Cloud Telemetry Monitor Button (Admin Developer Only) */}
          {isSimulationAllowed && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setIsMonitorOpen(true)}
              className="w-7 h-7 rounded-full bg-white border border-[#e6e6e4] text-black hover:bg-neutral-100 active:scale-95 transition-all cursor-pointer flex items-center justify-center shadow-2xs shrink-0"
              title="云函数调用日志与监控 (开发者模式已解锁)"
            >
              <Activity className="w-3.5 h-3.5 stroke-[1.8] text-sky-600" />
            </motion.button>
          )}

          {/* Bell Icon */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleBellClick}
            className="w-7 h-7 rounded-full bg-white border border-[#e6e6e4] text-black hover:bg-neutral-100 active:scale-95 transition-all cursor-pointer relative flex items-center justify-center shadow-2xs shrink-0"
            title="通知"
          >
            <Bell className="w-3.5 h-3.5 stroke-[1.8]" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#22c55e] ring-2 ring-white" />
          </motion.button>
        </div>
      </div>

      {/* UID First Judgment & Account Binding Filter Bar with Animation */}
      <motion.div
        layout
        className="my-1 p-2 bg-white border border-[#e2e3e1] rounded-none shadow-2xs space-y-1.5 transition-shadow hover:shadow-xs"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-6 h-6 rounded-full bg-neutral-900 text-white flex items-center justify-center shrink-0">
              <User className="w-3 h-3 text-emerald-400" />
            </div>
            <div className="min-w-0 flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#141413] truncate max-w-[80px] sm:max-w-[120px]">
                {userProfile?.nickname || '先锋食客'}
              </span>
              <span className="text-[9.5px] px-1 py-0.2 rounded bg-[#f4f4f2] text-[#55544d] font-mono font-semibold border border-[#e2e3df] shrink-0">
                UID: {currentUid.slice(0, 8)}...
              </span>
            </div>
          </div>

          {/* Segmented Switcher with Clean Tactile Pill Style */}
          <div className="inline-flex items-center p-0.5 bg-[#f4f4f0] rounded-lg border border-[#e5e5e1] gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setUidScope('my_uid')}
              className={`px-2 py-1 rounded-md text-[10.5px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                uidScope === 'my_uid'
                  ? 'bg-white text-black shadow-2xs font-bold'
                  : 'text-[#6e6d66] hover:text-black'
              }`}
            >
              <span>专属</span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                  uidScope === 'my_uid'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-[#e2e2de] text-[#666]'
                }`}
              >
                {orders.filter((o) => !o.userId || o.userId === currentUid || o.userId.startsWith(currentUid) || o.orderNo.includes(currentUid.slice(-4))).length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setUidScope('all')}
              className={`px-2 py-1 rounded-md text-[10.5px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                uidScope === 'all'
                  ? 'bg-white text-black shadow-2xs font-bold'
                  : 'text-[#6e6d66] hover:text-black'
              }`}
            >
              <span>全网</span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                  uidScope === 'all'
                    ? 'bg-sky-100 text-sky-800'
                    : 'bg-[#e2e2de] text-[#666]'
                }`}
              >
                {orders.length}
              </span>
            </button>
          </div>
        </div>

        {/* UID Prefix / Order Search Input with Motion Clear */}
        <div className="relative flex items-center">
          <Search className="w-3 h-3 text-[#999990] absolute left-2 pointer-events-none" />
          <input
            type="text"
            value={uidSearchPrefix}
            onChange={(e) => setUidSearchPrefix(e.target.value)}
            placeholder="输入 UID / 订单号 / 姓名筛选..."
            className="w-full pl-6.5 pr-6 py-1 text-[11px] bg-[#fafaf8] border border-[#e5e5e0] rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all placeholder:text-[#999990] text-[#141413] font-medium"
          />
          <AnimatePresence>
            {uidSearchPrefix && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                type="button"
                onClick={() => setUidSearchPrefix('')}
                className="absolute right-1.5 text-[10px] text-neutral-400 hover:text-black p-0.5 rounded cursor-pointer"
              >
                ✕
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Cloud Function Sync Status Banner with Micro Animation */}
      <motion.div
        whileHover={{ scale: 1.01 }}
        className="my-1 px-3 py-1.5 bg-emerald-50/70 border border-emerald-200/80 rounded-none flex items-center justify-between text-xs text-emerald-950 shadow-2xs"
      >
        <div className="flex items-center gap-1.5">
          <Cloud className="w-3.5 h-3.5 text-emerald-600 shrink-0 animate-pulse" />
          <span className="text-[11px] font-bold">
            云函数端点: <span className="font-mono text-emerald-800">orders / createOrder</span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsMonitorOpen(true)}
          className="text-[10px] font-bold text-emerald-700 hover:underline cursor-pointer flex items-center gap-0.5"
        >
          <span>查看链路</span>
          <ChevronRight className="w-2.5 h-2.5" />
        </button>
      </motion.div>

      {/* Tabs Row with Unified Selection State */}
      <div className="pt-0.5 pb-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('in_progress')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
            activeTab === 'in_progress'
              ? 'bg-sky-50/80 text-sky-600 border-2 border-sky-500 shadow-2xs'
              : 'text-[#55554f] bg-[#eeeee9] border-transparent hover:bg-[#e4e4de]'
          }`}
        >
          <CookingPot className={`w-3.5 h-3.5 ${activeTab === 'in_progress' ? 'text-sky-600' : 'text-[#787770]'}`} />
          <span>进行中</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black ${
              activeTab === 'in_progress' ? 'bg-sky-500 text-white' : 'bg-white text-black'
            }`}
          >
            {inProgressList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('recently_delivered')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
            activeTab === 'recently_delivered'
              ? 'bg-emerald-50/80 text-emerald-600 border-2 border-emerald-500 shadow-2xs'
              : 'text-[#55554f] bg-[#eeeee9] border-transparent hover:bg-[#e4e4de]'
          }`}
        >
          <CheckCircle2 className={`w-3.5 h-3.5 ${activeTab === 'recently_delivered' ? 'text-emerald-600' : 'text-[#787770]'}`} />
          <span>近期送达</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black ${
              activeTab === 'recently_delivered' ? 'bg-emerald-500 text-white' : 'bg-white text-black'
            }`}
          >
            {recentlyDeliveredList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
            activeTab === 'history'
              ? 'bg-amber-50/80 text-amber-600 border-2 border-amber-500 shadow-2xs'
              : 'text-[#55554f] bg-[#eeeee9] border-transparent hover:bg-[#e4e4de]'
          }`}
        >
          <Clock className={`w-3.5 h-3.5 ${activeTab === 'history' ? 'text-amber-600' : 'text-[#787770]'}`} />
          <span>历史订单</span>
        </button>
      </div>

      {/* Orders List Content with Staggered Motion Cards */}
      <div className="space-y-2 pt-0.5 pb-3">
        {currentDisplayList.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-none border border-[#e2e3e1] p-6 text-center space-y-2"
          >
            <ShoppingBag className="w-8 h-8 mx-auto text-[#8c8b84]" />
            <p className="text-xs font-bold text-black">暂无制作中或配送中的进行中订单</p>
            {activeTab === 'in_progress' && recentlyDeliveredList.length > 0 ? (
              <div className="pt-2 pb-1 space-y-2">
                <p className="text-[11px] text-emerald-800 font-bold bg-emerald-50 py-1.5 px-3 rounded-lg border border-emerald-200 inline-block">
                  订单已妥投送达！已实时同步归档至「近期送达」
                </p>
                <div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('recently_delivered')}
                    className="px-4 py-2 bg-[#15803d] hover:bg-[#166534] text-white text-xs font-black rounded-lg cursor-pointer transition-all shadow-xs inline-flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>查看近期已送达订单 ({recentlyDeliveredList.length}) →</span>
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-[#787770]">随时可以通过上方「云端拉取」同步最新记录</p>
            )}
            {onGoToMenu && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={onGoToMenu}
                className="mt-1 px-4 py-1.5 bg-black text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-neutral-800"
              >
                浏览流动餐车菜单
              </motion.button>
            )}
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {currentDisplayList.map((order, idx) => (
              <motion.div
                key={`cust-ord-${order.id || order.orderNo || idx}-${idx}`}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.24, ease: 'easeOut', delay: idx * 0.04 }}
                className="bg-white rounded-none border border-[#e2e3e1] shadow-[0px_1px_6px_rgba(0,0,0,0.02)] relative overflow-hidden transition-shadow hover:shadow-xs"
              >
                {/* Top green accent border if active/en route */}
                {order.hasTopAccent && (
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    className="h-1 bg-[#15803d] w-full absolute top-0 left-0 right-0 origin-left"
                  />
                )}

                <div className="pt-3 sm:pt-3.5 px-0.5 pb-2.5 space-y-2">
                  {/* Header Row: Form-style data-intensive compact banner */}
                  <div className="flex items-center justify-between gap-2 p-2 bg-[#fbfbf9] rounded-none border border-[#e5e5e0] mb-1">
                    {/* Form-style Data Column (Left) */}
                    <div className="min-w-0 flex-1 space-y-1">
                      {/* Top Data Strip: Order No Badge + UID Chip + Channel Tag */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-none bg-[#f0f0ed] text-[#1a1c1b] border border-[#d6d6d0] font-mono text-[11px] font-bold shrink-0">
                          <span className="text-[#8a8984] text-[9.5px] font-normal">单号</span>
                          <span>#{order.orderNo}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-none bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-mono text-[10px] font-semibold shrink-0">
                          <span className="text-emerald-600/70 text-[9px] font-normal">UID:</span>
                          <span>{order.userId ? (order.userId.length > 12 ? `${order.userId.slice(0, 10)}...` : order.userId) : '当前账户'}</span>
                        </span>
                        {order.channel && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-none bg-neutral-100 text-neutral-600 border border-neutral-200 text-[9.5px] font-medium shrink-0">
                            {order.channel === 'dine_in' ? '堂食现制' : order.channel === 'pickup' ? '自提取餐' : '雷达专送'}
                          </span>
                        )}
                        {order.channel === 'dine_in' && order.tableCode && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-none bg-amber-50 text-amber-900 border border-amber-200 text-[9.5px] font-bold shrink-0">
                            <UtensilsCrossed className="w-2.5 h-2.5 text-amber-700" />
                            <span>{order.tableCode}桌</span>
                          </span>
                        )}
                        {order.channel === 'pickup' && (order.pickupCode || order.orderNo) && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-none bg-sky-50 text-sky-900 border border-sky-200 text-[9.5px] font-bold shrink-0">
                            <QrCode className="w-2.5 h-2.5 text-sky-700" />
                            <span>取餐码 #{order.pickupCode || order.orderNo?.slice(-4) || '8806'}</span>
                          </span>
                        )}
                      </div>

                      {/* Main Title & Price & Summary Data Line */}
                      <div className="flex items-center gap-2 min-w-0">
                        <h3 className="text-xs sm:text-[13px] font-bold text-[#1a1c1b] leading-tight truncate">
                          {order.title}
                        </h3>
                        {order.totalAmount !== undefined && (
                          <span className="font-mono text-[11px] font-black text-neutral-900 shrink-0 bg-white px-1 py-0.2 rounded-none border border-neutral-200">
                            ¥{Number(order.totalAmount).toFixed(2)}
                          </span>
                        )}
                        {order.createdTime && (
                          <span className="text-[10px] font-mono text-[#8a8984] shrink-0 hidden xs:inline">
                            {order.createdTime}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status & Attributes Column (Right) */}
                    <div className="shrink-0 flex items-center gap-1">
                      {order.nonRefundable && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-none bg-rose-50 text-rose-700 text-[9.5px] font-bold border border-rose-200/90 shrink-0">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          <span>不可退单</span>
                        </span>
                      )}

                      {(order as any).statusConfig ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[10px] font-bold tracking-tight border shrink-0 ${(order as any).statusConfig.badgeClass}`}
                        >
                          {(order as any).statusConfig.isException ? (
                            <AlertCircle className="w-3 h-3 text-amber-600 animate-pulse" />
                          ) : (order as any).statusConfig.key === 'delivering' ? (
                            <Truck className="w-3 h-3 text-emerald-600 animate-pulse" />
                          ) : (order as any).statusConfig.key === 'rider_heading' || (order as any).statusConfig.key === 'picked_up' ? (
                            <Bike className="w-3 h-3 text-sky-600" />
                          ) : (order as any).statusConfig.key === 'ready' || (order as any).statusConfig.key === 'waiting_pickup' ? (
                            <Package className="w-3 h-3 text-amber-600" />
                          ) : (order as any).statusConfig.key === 'cooking' ? (
                            <CookingPot className="w-3 h-3 text-orange-600 animate-bounce" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          )}
                          <span>{(order as any).statusConfig.shortLabel || (order as any).statusConfig.label}</span>
                        </span>
                      ) : order.statusType === 'refund_pending' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200 shrink-0">
                          <Clock className="w-3 h-3 text-amber-600 animate-spin" />
                          <span>退单审核中</span>
                        </span>
                      ) : order.statusType === 'refunded' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none bg-neutral-100 text-neutral-600 text-[10px] font-bold border border-neutral-300 shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-neutral-500" />
                          <span>已全额退款</span>
                        </span>
                      ) : order.statusType === 'en_route' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none bg-[#e6f4ea] text-[#15803d] text-[10px] font-bold border border-[#c3e6cb] shrink-0">
                          <Truck className="w-3 h-3 fill-current animate-pulse" />
                          <span>骑手配送中</span>
                        </span>
                      ) : order.statusType === 'ready' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200 shrink-0">
                          <Package className="w-3 h-3" />
                          <span>出餐待取</span>
                        </span>
                      ) : order.statusType === 'placed' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none bg-neutral-100 text-neutral-700 text-[10px] font-bold border border-neutral-200 shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-neutral-500" />
                          <span>下单已付</span>
                        </span>
                      ) : order.statusType === 'preparing' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none bg-[#f0f0ed] text-[#4b5563] text-[10px] font-bold border border-[#d8d8d3] shrink-0">
                          <CookingPot className="w-3 h-3" />
                          <span>备料制作中</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none bg-[#e6f4ea] text-[#15803d] text-[10px] font-bold border border-[#c3e6cb] shrink-0">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>已送达完成</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Granular Exception / Status Notice Banner */}
                  {(order as any).statusConfig?.isException && (
                    <div className="p-2 rounded-none bg-amber-50/90 border border-amber-200/90 flex items-start gap-2 mb-1">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                      <div className="text-[11px] leading-snug">
                        <span className="font-bold text-amber-900">{(order as any).statusConfig.label}：</span>
                        <span className="text-amber-800">{(order as any).statusConfig.desc}</span>
                      </div>
                    </div>
                  )}

                  {/* Refund Status Alert Notices */}
                  {order.statusType === 'refund_pending' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-2 bg-amber-50/90 border border-amber-200/90 rounded-none text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-amber-900 font-bold">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span>退单申请审核中 (已在节点 {order.refundPassedStep ?? order.stepIndex ?? 1} 提交反馈)</span>
                        </span>
                        <span className="text-[10px] font-mono text-amber-800">{order.refundAppliedAt || '处理中'}</span>
                      </div>
                      <p className="text-[11px] text-amber-800">
                        <strong>退单原因：</strong>{order.refundReason || '临时有事 / 行程变更'} {order.refundFeedback ? `· ${order.refundFeedback}` : ''}
                      </p>
                      <p className="text-[10px] text-amber-700">客户端已提交申请反馈，待商家审核通过后将原路全额退款。</p>
                    </motion.div>
                  )}

                  {order.refundStatus === 'rejected' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-2 bg-rose-50 border border-rose-200/90 rounded-none text-xs space-y-0.5"
                    >
                      <div className="flex items-center gap-1 text-rose-900 font-bold">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>退单申请已驳回</span>
                      </div>
                      <p className="text-[11px] text-rose-800">
                        <strong>商家驳回说明：</strong>{order.refundRejectReason || '餐品已进入后厨不可逆制作流程，暂不支持退单'}
                      </p>
                    </motion.div>
                  )}

                  {order.statusType === 'refunded' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-2 bg-neutral-100 border border-neutral-200 rounded-none text-xs space-y-0.5"
                    >
                      <div className="flex items-center gap-1 text-neutral-800 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>退款已成功入账</span>
                      </div>
                      <p className="text-[11px] text-neutral-600">
                        已按原支付路径退回 ¥{Number(order.totalAmount || 0).toFixed(2)} 元。
                      </p>
                    </motion.div>
                  )}

                  {/* Horizontal Step Flow Diagram */}
                  <div className="pt-0.5 pb-0.5">
                    {renderHorizontalSteps(order, order.stepIndex ?? (order.statusType === 'en_route' ? 3 : order.statusType === 'delivered' ? 4 : order.statusType === 'ready' ? 2 : 1))}
                  </div>

                  {/* Authoritative State Machine & Anti-Tamper Badge */}
                  <div className="px-2.5 py-1.5 bg-[#f5f5f2] rounded-none border border-[#e5e5df] flex items-center justify-between gap-1.5 text-[10.5px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-4 h-4 rounded-full bg-black text-white flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                      </div>
                      <span className="text-neutral-700 font-bold truncate">
                        {order.statusType === 'en_route'
                          ? `骑手配送履约中 · ${order.courierName || '专线骑手'}`
                          : order.statusType === 'ready'
                          ? '后厨已出餐 · 调度中枢匹配骑手中'
                          : order.statusType === 'preparing'
                          ? '餐车炭火主厨备料制作中'
                          : order.statusType === 'delivered'
                          ? '已妥投完成 · 双向存证已归档'
                          : '订单已接收 · 等待后厨确认'}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono font-bold text-neutral-500 bg-white px-1.5 py-0.5 rounded-none border border-neutral-200 shrink-0">
                      🔒 商家/骑手授权推进
                    </span>
                  </div>

                  {/* Dish Preparation & Serving Progress Panel (出餐制作与上菜进展) */}
                  <div className="p-2.5 bg-[#fafaf7] rounded-none border border-[#e8e8e2] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-black text-neutral-900">
                        {order.channel === 'dine_in' ? (
                          <>
                            <UtensilsCrossed className="w-3.5 h-3.5 text-amber-600" />
                            <span>堂食出餐制作进度</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-none bg-amber-100 text-amber-800 font-bold">
                              {order.tableCode ? `${order.tableCode}号桌` : '堂食'}
                            </span>
                          </>
                        ) : order.channel === 'pickup' ? (
                          <>
                            <PackageCheck className="w-3.5 h-3.5 text-sky-600" />
                            <span>自提打包出餐进度</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-none bg-sky-100 text-sky-800 font-bold">
                              取餐码 #{order.pickupCode || '8806'}
                            </span>
                          </>
                        ) : (
                          <>
                            <CookingPot className="w-3.5 h-3.5 text-emerald-600" />
                            <span>餐车后厨出餐进度</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-none bg-emerald-100 text-emerald-800 font-bold">
                              极速专送
                            </span>
                          </>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleTrackRadar(order)}
                        className="text-[10.5px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-0.5 group cursor-pointer"
                      >
                        <span>流转节点详情</span>
                        <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>

                    {/* Dish Items Status Badges */}
                    <div className="space-y-1.5">
                      {(order.items && order.items.length > 0
                        ? order.items
                        : [
                            {
                              name: order.channel === 'dine_in' ? '碳烤和牛小汉堡双重奏' : order.channel === 'pickup' ? '果木烟熏黑豚炙烤五花' : '极夜燕麦拿铁',
                              quantity: 1,
                              serveStatus: order.channel === 'dine_in' ? 'served' : 'ready_to_serve',
                              prepProgress: 100,
                              station: order.channel === 'dine_in' ? '炭火炙烤档' : order.channel === 'pickup' ? '恒温取餐柜' : '餐车吧台',
                              serveTime: '12:35'
                            },
                            {
                              name: order.channel === 'dine_in' ? '冷萃黑金茉莉提拉米苏' : order.channel === 'pickup' ? '黑曜石松露金黄脆薯' : '现烤肉桂卷',
                              quantity: 1,
                              serveStatus: order.channel === 'dine_in' ? 'cooking' : 'ready_to_serve',
                              prepProgress: order.channel === 'dine_in' ? 75 : 100,
                              station: order.channel === 'dine_in' ? '西点烘焙档' : order.channel === 'pickup' ? '01号智能保温格' : '烘焙烤箱'
                            }
                          ]
                      ).slice(0, 3).map((dishItem: any, itemIdx: number) => {
                        const isServed = dishItem.serveStatus === 'served';
                        const isReady = dishItem.serveStatus === 'ready_to_serve' || dishItem.serveStatus === 'ready';

                        return (
                          <div
                            key={itemIdx}
                            className="flex items-center justify-between text-xs bg-white p-2 rounded-none border border-neutral-200/80 shadow-2xs"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  isServed ? 'bg-emerald-500' : isReady ? 'bg-sky-500' : 'bg-amber-500 animate-pulse'
                                }`}
                              />
                              <span className="font-bold text-neutral-900 truncate text-[11.5px]">{dishItem.name}</span>
                              <span className="text-[10px] text-neutral-400 font-mono">x{dishItem.quantity || 1}</span>
                              {dishItem.station && (
                                <span className="hidden sm:inline-block text-[9.5px] text-neutral-400 font-normal">
                                  ({dishItem.station})
                                </span>
                              )}
                            </div>

                            <div className="shrink-0 flex items-center gap-1.5">
                              {isServed ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-none bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>已上桌{dishItem.serveTime ? ` ${dishItem.serveTime}` : ''}</span>
                                </span>
                              ) : isReady ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-none bg-sky-50 text-sky-700 text-[10px] font-bold border border-sky-200">
                                  <PackageCheck className="w-3 h-3 text-sky-600" />
                                  <span>{order.channel === 'pickup' ? '已入柜保温' : '出餐就绪'}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-none bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
                                  <Flame className="w-3 h-3 text-amber-600 animate-pulse" />
                                  <span>制作中 {dishItem.prepProgress || 65}%</span>
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3-Column Metrics Grid */}
                  <div className="border-t border-[#f0f0ed] pt-1.5">
                    <div className="grid grid-cols-3 text-center sm:text-left gap-1">
                      <div>
                        <span className="block text-[9.5px] tracking-wider text-[#787770] font-bold uppercase mb-0.5">
                          {order.channel === 'dine_in' ? '预计出齐' : order.channel === 'pickup' ? '取餐码' : '预计送达'}
                        </span>
                        <span className="text-xs sm:text-sm font-black text-[#1a1c1b]">
                          {order.channel === 'pickup' ? `#${order.pickupCode || '8806'}` : order.estArrival}
                        </span>
                      </div>

                      <div className="border-x sm:border-x-0 border-[#f0f0ed] px-1 sm:px-0">
                        <span className="block text-[9.5px] tracking-wider text-[#787770] font-bold uppercase mb-0.5">
                          {order.channel === 'dine_in' ? '就餐桌位' : order.channel === 'pickup' ? '取餐位置' : '配送距离'}
                        </span>
                        <span className="text-xs sm:text-sm font-black text-[#1a1c1b]">
                          {order.channel === 'dine_in'
                            ? `${order.tableCode || 'A1'} 号桌`
                            : order.channel === 'pickup'
                            ? '01号智能保温柜'
                            : order.distance}
                        </span>
                      </div>

                      <div>
                        <span className="block text-[9.5px] tracking-wider text-[#787770] font-bold uppercase mb-0.5">
                          餐品数量
                        </span>
                        <span className="text-xs sm:text-sm font-black text-[#1a1c1b]">
                          {order.itemsCount} 份
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Action Button with Motion Feedback */}
                  <div className="pt-0.5 flex items-center gap-1.5">
                    {order.channel === 'dine_in' ? (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={() => handleTrackRadar(order)}
                        className="flex-1 py-1.5 px-3 bg-[#181816] text-white text-xs font-black rounded-none hover:bg-neutral-800 transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <UtensilsCrossed className="w-3.5 h-3.5 text-amber-400" />
                        <span>堂食出餐与流转节点</span>
                      </motion.button>
                    ) : order.channel === 'pickup' ? (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={() => handleTrackRadar(order)}
                        className="flex-1 py-1.5 px-3 bg-[#181816] text-white text-xs font-black rounded-none hover:bg-neutral-800 transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5 text-sky-400" />
                        <span>自提出餐与取餐码</span>
                      </motion.button>
                    ) : order.statusType === 'en_route' ? (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={() => handleTrackRadar(order)}
                        className="flex-1 py-1.5 px-3 bg-black text-white text-xs font-black rounded-none hover:bg-neutral-800 transition-all shadow-2xs flex items-center justify-center cursor-pointer"
                      >
                        雷达追踪
                      </motion.button>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={() => handleTrackRadar(order)}
                        className="flex-1 py-1.5 px-3 bg-[#e8e8e6] text-[#1a1c1b] text-xs font-black rounded-none hover:bg-[#dededc] transition-all flex items-center justify-center cursor-pointer"
                      >
                        查看出餐与流转节点
                      </motion.button>
                    )}

                    {/* Customer Refund Application Feedback Action */}
                    {order.statusType !== 'refunded' && (
                      order.statusType === 'refund_pending' ? (
                        <motion.button
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.96 }}
                          type="button"
                          onClick={() => {
                            setRefundModalOrder(order);
                            setRefundReason(order.refundReason || '临时有事 / 行程变更');
                            setRefundFeedback(order.refundFeedback || '');
                          }}
                          className="px-2.5 py-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-none text-xs font-bold transition-colors cursor-pointer border border-amber-200 shrink-0 flex items-center gap-1"
                          title="查看退单审核详情"
                        >
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>审核中 (查看反馈)</span>
                        </motion.button>
                      ) : order.nonRefundable ? (
                        <motion.button
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.96 }}
                          type="button"
                          onClick={() => {
                            setRefundModalOrder(order);
                          }}
                          className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-none text-xs font-bold transition-colors cursor-pointer border border-neutral-300 shrink-0 flex items-center gap-1"
                          title="该订单已被商家设置为不可退单，点击联系商家协商"
                        >
                          <ShieldCheck className="w-3 h-3 text-rose-600" />
                          <span>不可退单 (联系商家)</span>
                        </motion.button>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.96 }}
                          type="button"
                          onClick={() => {
                            setRefundModalOrder(order);
                            setRefundReason('临时有事 / 行程变更');
                            setRefundFeedback('');
                          }}
                          className="px-2.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-none text-xs font-bold transition-colors cursor-pointer border border-rose-200 shrink-0 flex items-center gap-1"
                          title="在当前状态节点发起退单申请与反馈"
                        >
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                          <span>申请退单 / 反馈</span>
                        </motion.button>
                      )
                    )}

                    {/* 消息中心纯图标按钮 (Message Center Pure Icon Button) */}
                    <motion.button
                      id={`btn-order-msg-center-${order.orderNo || idx}`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={() => setChatOrder(order)}
                      className="h-8 w-8 rounded-none bg-[#f5f5f3] hover:bg-[#eaeae6] active:bg-[#deded8] text-[#2d2c27] hover:text-black border border-[#d8d8d2] transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-2xs relative group"
                      title="消息中心 · 订单联络室"
                      aria-label="消息中心"
                    >
                      <MessageSquareText className="w-4 h-4 text-[#4a4943] group-hover:text-black transition-colors" />
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border-2 border-white shadow-2xs" />
                    </motion.button>
                  </div>

                  {/* Inline Expandable Detail Panel with Motion AnimatePresence */}
                  <AnimatePresence>
                    {selectedOrderDetail?.orderNo === order.orderNo && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                        animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
                        exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                        transition={{ duration: 0.22, ease: 'easeInOut' }}
                        className="mt-2 p-2.5 bg-[#f9f9f7] rounded-none border border-[#e2e3e1] space-y-1.5"
                      >
                        <div className="flex items-center justify-between border-b border-[#ebebe6] pb-1.5 text-xs">
                          <span className="font-bold text-black">餐品清单明细</span>
                          <span className="text-[#787770]">{order.itemsSummary}</span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#787770]">食客 UID 标识</span>
                          <span className="font-mono text-[11px] font-bold text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded-none">
                            {order.userId || currentUid}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#787770]">食客姓名 / 电话</span>
                          <span className="font-bold text-black">
                            {order.customerName || userProfile?.nickname || '先锋食客'} ({order.userPhone || userProfile?.phone || '138-8888-9201'})
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#787770]">专线配送专员 / 吧台</span>
                          <span className="font-bold text-black">{order.courierName} ({order.courierPhone})</span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#787770]">预计履约完成</span>
                          <span className="font-bold text-emerald-700">{order.estArrival}</span>
                        </div>

                        <div className="pt-1 flex gap-2">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="button"
                            onClick={() => handleTrackRadar(order)}
                            className="flex-1 py-1.5 bg-black text-white text-xs font-bold rounded-none hover:bg-neutral-800 transition-colors cursor-pointer"
                          >
                            前往实时雷达地图追踪
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {/* Bottom Promo Banner: Need it faster? */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={onOpenVIP}
          className="bg-black text-white rounded-none p-3 sm:p-3.5 shadow-sm flex items-center justify-between cursor-pointer hover:bg-neutral-900 transition-colors mt-1.5"
        >
          <div className="space-y-0.5 pr-2">
            <h4 className="text-xs sm:text-sm font-black text-white tracking-tight">
              需要更快送达？
            </h4>
            <p className="text-[10px] sm:text-[11px] text-neutral-400 font-medium">
              下次下单开启极速专送与流动餐车站台优先排期
            </p>
          </div>

          <div className="w-8 h-8 rounded-none bg-neutral-900 border border-neutral-800 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-[#22c55e] fill-[#22c55e]" />
          </div>
        </motion.div>
      </div>

      {/* Cloud Function Telemetry Monitor Modal */}
      <CloudFunctionMonitorModal
        isOpen={isMonitorOpen}
        onClose={() => setIsMonitorOpen(false)}
        userProfile={userProfile}
        orders={orders}
        onOrdersUpdated={onOrdersUpdated}
      />

      {/* Customer Refund Application & Feedback Modal (客户端退单申请反馈) */}
      <AnimatePresence>
        {refundModalOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              className="bg-white rounded-2xl max-w-md w-full p-4 shadow-xl border border-neutral-200 space-y-3.5 max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-neutral-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-neutral-900 flex items-center gap-1.5">
                    <AlertCircle className="w-5 h-5 text-rose-600" />
                    <span>退单申请与服务反馈</span>
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    订单号 #{refundModalOrder.orderNo} · {refundModalOrder.title || '黑曜石流动餐车'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRefundModalOrder(null)}
                  className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Non-Refundable Warning if Merchant Locked the Order */}
              {refundModalOrder.nonRefundable ? (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-rose-900 font-black text-sm">
                    <ShieldCheck className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>商家已设置该订单为【不可退单】</span>
                  </div>
                  <p className="text-xs text-rose-800 leading-relaxed">
                    餐车主理人已针对本订单启用不可退单保护（可能由于定制餐品或不可逆备料）。客户端不可直接退款，如确需退单协商，请联系商家由商家端后台审核操作。
                  </p>
                  <div className="pt-1 flex gap-2">
                    <a
                      href="tel:13818299201"
                      className="flex-1 py-2 px-3 bg-rose-600 text-white rounded-lg text-xs font-black flex items-center justify-center gap-1.5 hover:bg-rose-700 transition-colors shadow-2xs"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>致电餐车主理人 (138-1829-9201)</span>
                    </a>
                  </div>
                </div>
              ) : null}

              {/* Passed Step Node Diagram (退单时必须在已经经过的状态节点退单) */}
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-neutral-700">当前经过的状态节点：</span>
                  <span className="font-mono text-emerald-800 font-bold bg-emerald-100/80 px-2 py-0.5 rounded text-[11px]">
                    {refundModalOrder.stepIndex === 0
                      ? '节点 0: 下单支付'
                      : refundModalOrder.stepIndex === 1
                      ? '节点 1: 商家接单制作'
                      : refundModalOrder.stepIndex === 2
                      ? '节点 2: 出餐待取'
                      : refundModalOrder.stepIndex === 3
                      ? '节点 3: 骑手配送中'
                      : '节点 4: 已送达'}
                  </span>
                </div>

                {/* Step indicator pills */}
                <div className="grid grid-cols-5 gap-1 text-center text-[10px] font-bold">
                  {[
                    { name: '下单', icon: <ShoppingBag className="w-3 h-3 mx-auto mb-0.5" /> },
                    { name: '接单制作', icon: <CookingPot className="w-3 h-3 mx-auto mb-0.5" /> },
                    { name: '出餐待取', icon: <Package className="w-3 h-3 mx-auto mb-0.5" /> },
                    { name: '配送中', icon: <Bike className="w-3 h-3 mx-auto mb-0.5" /> },
                    { name: '已送达', icon: <CheckCircle2 className="w-3 h-3 mx-auto mb-0.5" /> }
                  ].map((stepItem, sIdx) => {
                    const currentPassed = (refundModalOrder.stepIndex ?? 1);
                    const isCurrent = currentPassed === sIdx;
                    const isPassed = currentPassed >= sIdx;
                    return (
                      <div
                        key={sIdx}
                        className={`p-1.5 rounded-lg border transition-all flex flex-col items-center justify-center ${
                          isCurrent
                            ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                            : isPassed
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-neutral-100 text-neutral-400 border-neutral-200'
                        }`}
                      >
                        {stepItem.icon}
                        <div className="text-[9px] opacity-80">节点 {sIdx}</div>
                        <div className="truncate">{stepItem.name}</div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-neutral-500">
                  系统将记录您在【节点 {refundModalOrder.stepIndex ?? 1}】提交退单申请，供商家审核核算。
                </p>
              </div>

              {/* Refund Application Form (客户端只能做申请反馈) */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-neutral-700">
                  退单主要原因 (单选)
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: '送达超时 / 配送延迟', color: 'sky' },
                    { id: '临时有事 / 行程变更', color: 'amber' },
                    { id: '餐品口味 / 错送漏送', color: 'rose' },
                    { id: '地址填错 / 重新下单', color: 'emerald' },
                    { id: '误触多下单', color: 'indigo' },
                    { id: '其他问题反馈', color: 'neutral' }
                  ].map((item) => {
                    const isSelected = refundReason === item.id;
                    const colorMap: Record<string, string> = {
                      sky: 'bg-sky-50/70 border-2 border-sky-500 text-sky-600 font-bold shadow-2xs',
                      amber: 'bg-amber-50/70 border-2 border-amber-500 text-amber-600 font-bold shadow-2xs',
                      rose: 'bg-rose-50/70 border-2 border-rose-500 text-rose-600 font-bold shadow-2xs',
                      emerald: 'bg-emerald-50/70 border-2 border-emerald-500 text-emerald-600 font-bold shadow-2xs',
                      indigo: 'bg-indigo-50/70 border-2 border-indigo-500 text-indigo-600 font-bold shadow-2xs',
                      neutral: 'bg-neutral-100 border-2 border-neutral-600 text-black font-bold shadow-2xs'
                    };

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setRefundReason(item.id)}
                        className={`p-2 rounded-xl text-xs text-left transition-all border cursor-pointer ${
                          isSelected
                            ? colorMap[item.color]
                            : 'bg-[#fafaf8] text-neutral-700 border-neutral-200 hover:bg-neutral-100 font-medium'
                        }`}
                      >
                        {item.id}
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-1 pt-1">
                  <label className="block text-xs font-bold text-neutral-700">
                    详细说明与反馈建议 (将同步至商家后台)
                  </label>
                  <textarea
                    rows={3}
                    value={refundFeedback}
                    onChange={(e) => setRefundFeedback(e.target.value)}
                    placeholder="请详细描述您遇到的问题或退款理由，以便餐车主理人快速审核处理..."
                    className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-black transition-all resize-none"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-2 flex items-center gap-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setRefundModalOrder(null)}
                  className="flex-1 py-2.5 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  返回
                </button>

                <button
                  type="button"
                  disabled={isSubmittingRefund || refundModalOrder.nonRefundable}
                  onClick={async () => {
                    if (refundModalOrder.nonRefundable) {
                      toast.error('该订单不可退单', '请直接致电商家沟通！');
                      return;
                    }
                    setIsSubmittingRefund(true);
                    try {
                      const stepIdx = refundModalOrder.stepIndex ?? 1;
                      if (onApplyRefund) {
                        onApplyRefund(refundModalOrder.id || refundModalOrder.orderNo, refundReason, refundFeedback, stepIdx);
                      } else {
                        // fallback to cancelCloudOrder or direct state update
                        await cancelCloudOrder(refundModalOrder.id, refundReason);
                        toast.success('退单申请已提交', `已在节点 ${stepIdx} 提交反馈，等待商家审核处理`);
                      }
                      setRefundModalOrder(null);
                    } catch (err: any) {
                      toast.error('提交失败', err.message || '网络连接异常');
                    } finally {
                      setIsSubmittingRefund(false);
                    }
                  }}
                  className={`flex-1 py-2.5 px-3 text-white rounded-xl text-xs font-black transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer ${
                    refundModalOrder.nonRefundable
                      ? 'bg-neutral-400 cursor-not-allowed opacity-60'
                      : 'bg-rose-600 hover:bg-rose-700 active:scale-[0.99]'
                  }`}
                >
                  {isSubmittingRefund ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>{refundModalOrder.nonRefundable ? '商家已锁定退单' : '提交退单申请与反馈'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 订单三端即时气泡联络室 (消息中心) */}
      {chatOrder && (
        <UnifiedOmniChatModal
          isOpen={!!chatOrder}
          onClose={() => setChatOrder(null)}
          order={chatOrder}
          orderNo={chatOrder.orderNo}
          viewerRole="user"
          showToast={(msg) => toast.info(msg)}
        />
      )}
    </motion.div>
  );
};
