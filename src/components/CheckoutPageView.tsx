import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Bike,
  Utensils,
  ShoppingBag,
  MapPin,
  Clock,
  ShieldCheck,
  Plus,
  Minus,
  Trash2,
  ChevronDown,
  Check,
  Edit2,
  Lock,
  Tag,
  Gift,
  CheckCircle2,
  ReceiptText,
  X,
  Sparkles,
  Zap,
  AlignLeft,
  Leaf,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CartItem, BoundTableInfo } from '../types';
import { DiningMode } from './DiningModeSelector';
import { TableBindModal } from './table/TableBindModal';
import { getCurrentBoundTable } from '../utils/tableStorage';
import { useToast } from './ui/ToastContext';
import { PaymentChannelId, PaymentVoucher } from '../types/payment';
import { ElectronicPaymentVoucherModal } from './payment/ElectronicPaymentVoucherModal';
import { PaymentConfirmCashierModal } from './payment/PaymentConfirmCashierModal';
import { matchDishImageUrl } from '../utils/dishImageMatcher';

export interface CheckoutPageViewProps {
  items: CartItem[];
  deliveryAddress: string;
  onChangeAddress: (newAddress: string) => void;
  diningMode: DiningMode;
  onDiningModeChange: (mode: DiningMode) => void;
  isVIPActive: boolean;
  onBackToMenu: () => void;
  onUpdateCartQuantity: (cartItemId: string, newQty: number) => void;
  onRemoveCartItem: (cartItemId: string) => void;
  onCompleteCheckout: (
    orderNotes: string,
    coupon: string,
    paymentMethod: string,
    paymentVoucher?: PaymentVoucher
  ) => string | void;
  onGoToTracking: (orderId?: string) => void;
  onGoToOrders: () => void;
}

type PaymentChannelKey = 'wx' | 'alipay' | 'unionpay' | 'corp';

export const CheckoutPageView: React.FC<CheckoutPageViewProps> = ({
  items,
  deliveryAddress,
  onChangeAddress,
  diningMode,
  onDiningModeChange,
  isVIPActive,
  onBackToMenu,
  onUpdateCartQuantity,
  onRemoveCartItem,
  onCompleteCheckout,
  onGoToTracking,
  onGoToOrders
}) => {
  const toast = useToast();

  // 视图模式：纯文字 vs 图文详情
  const [isTextOnlyView, setIsTextOnlyView] = useState(true);

  // 手风琴折叠展开状态
  const [isEcoOpen, setIsEcoOpen] = useState(false);
  const [isCouponOpen, setIsCouponOpen] = useState(false);
  const [isCostOpen, setIsCostOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);

  // 底部费用明细抽屉
  const [isCostSheetOpen, setIsCostSheetOpen] = useState(false);

  // 底部安全支付上拉菜单状态 (点击安全支付在上方弹出，复刻1号位置内容)
  const [isPaymentSheetOpen, setIsPaymentSheetOpen] = useState(false);

  // 环保偏好与备注
  const [ecoPref, setEcoPref] = useState<1 | 2>(1); // 1: 提供环保餐具, 2: 无需一次性餐具
  const [remarkInput, setRemarkInput] = useState('');

  // 优惠券状态
  const [couponCode, setCouponCode] = useState(isVIPActive ? 'UR-VIP5' : 'UR-VIP5');
  const [couponDiscount, setCouponDiscount] = useState(5.0);
  const [customCouponInput, setCustomCouponInput] = useState('');

  // 支付渠道状态
  const [selectedChannelKey, setSelectedChannelKey] = useState<PaymentChannelKey | null>('wx');

  // 堂食桌台绑定状态
  const [boundTable, setBoundTable] = useState<BoundTableInfo | null>(() => getCurrentBoundTable());
  const [isTableBindModalOpen, setIsTableBindModalOpen] = useState(false);

  // 地址内联快速切换
  const [isAddressPromptOpen, setIsAddressPromptOpen] = useState(false);
  const [newAddressInput, setNewAddressInput] = useState('');

  // 支付结果与凭证
  const [isPaidSuccess, setIsPaidSuccess] = useState(false);
  const [createdOrderNo, setCreatedOrderNo] = useState('');
  const [completedVoucher, setCompletedVoucher] = useState<PaymentVoucher | null>(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [isCashierModalOpen, setIsCashierModalOpen] = useState(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);

  // 监听桌台全局绑定变更
  useEffect(() => {
    const handleBoundTableChanged = (e: Event) => {
      const customEvent = e as CustomEvent<BoundTableInfo | null>;
      setBoundTable(customEvent.detail ?? getCurrentBoundTable());
    };
    window.addEventListener('obsidian_bound_table_changed', handleBoundTableChanged);
    return () => window.removeEventListener('obsidian_bound_table_changed', handleBoundTableChanged);
  }, []);

  // 支付渠道定义
  const paymentChannels: Record<
    PaymentChannelKey,
    { name: string; discount: number; brandColor: string; bg: string; border: string; activeBorder: string }
  > = {
    wx: {
      name: '微信支付',
      discount: 3.0,
      brandColor: '#07c160',
      bg: '#e8f8ee',
      border: 'border-border-subtle hover:border-[#07c160]/60 bg-surface-card',
      activeBorder: 'border-2 border-[#07c160] bg-[#e8f8ee] shadow-xs'
    },
    alipay: {
      name: '支付宝',
      discount: 2.5,
      brandColor: '#1677ff',
      bg: '#edf5fe',
      border: 'border-border-subtle hover:border-[#1677ff]/60 bg-surface-card',
      activeBorder: 'border-2 border-[#1677ff] bg-[#edf5fe] shadow-xs'
    },
    unionpay: {
      name: '银联卡',
      discount: 2.0,
      brandColor: '#e60012',
      bg: '#faf3f3',
      border: 'border-border-subtle hover:border-[#e60012]/60 bg-surface-card',
      activeBorder: 'border-2 border-[#e60012] bg-[#faf3f3] shadow-xs'
    },
    corp: {
      name: '企业餐补',
      discount: 5.0,
      brandColor: '#d97706',
      bg: '#fef8ed',
      border: 'border-border-subtle hover:border-[#d97706]/70 bg-surface-card',
      activeBorder: 'border-2 border-[#d97706] bg-[#fef8ed] shadow-xs'
    }
  };

  // 费用重算与结算引擎
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.calculatedPrice, 0), [items]);
  const totalQuantity = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

  // 阶梯满减 (满 50 减 6，满 120 减 15)
  const ladderDiscount = useMemo(() => {
    if (subtotal >= 120) return 15.0;
    if (subtotal >= 50) return 6.0;
    return 0.0;
  }, [subtotal]);

  // 配送费规则
  const activeDeliveryFee = useMemo(() => {
    if (totalQuantity === 0 || diningMode !== 'delivery') return 0.0;
    return 5.0;
  }, [totalQuantity, diningMode]);

  // VIP 折扣
  const vipDiscount = isVIPActive ? 3.0 : 0.0;

  // 支付渠道立减
  const channelDiscount = selectedChannelKey ? paymentChannels[selectedChannelKey].discount : 0.0;
  const channelName = selectedChannelKey ? paymentChannels[selectedChannelKey].name : '未选择';

  // 优惠券立减
  const effectiveCoupon = totalQuantity === 0 ? 0 : couponDiscount;

  // 原总额与总优惠
  const originalTotal = subtotal + activeDeliveryFee;
  const totalSaved = ladderDiscount + effectiveCoupon + vipDiscount + channelDiscount;
  const finalAmount = Math.max(0, originalTotal - totalSaved);

  // 环保偏好描述文案
  const ecoPreferenceTitle = ecoPref === 1 ? '提供环保餐具' : '无需一次性餐具';
  const ecoSummaryPreview = remarkInput.trim()
    ? `${ecoPreferenceTitle} · 备注: ${remarkInput.trim()}`
    : `${ecoPreferenceTitle} · 无特殊备注`;

  // 切换履约模式
  const handleFulfillmentSelect = (mode: DiningMode) => {
    onDiningModeChange(mode);
    if (mode === 'dine_in' && !boundTable) {
      setIsTableBindModalOpen(true);
    }
    const label = mode === 'delivery' ? '外卖专送' : mode === 'dine_in' ? '现场堂食' : '到车自提';
    toast.info(`履约方式已切换为: ${label}`);
  };

  // 切换支付渠道
  const handleSelectChannel = (key: PaymentChannelKey) => {
    if (selectedChannelKey === key) {
      setSelectedChannelKey(null);
      toast.info('已取消选择支付方式');
    } else {
      setSelectedChannelKey(key);
      toast.success(`已选用 ${paymentChannels[key].name} · 立减 ¥${paymentChannels[key].discount.toFixed(2)}`);
    }
  };

  // 兑换自定义优惠券
  const handleApplyCustomCoupon = () => {
    const code = customCouponInput.trim().toUpperCase();
    if (!code) {
      toast.warning('请输入兑换码');
      return;
    }

    if (code === 'RADAR10' || code.includes('10')) {
      setCouponDiscount(10.0);
      setCouponCode(code);
      toast.success(`兑换码 [${code}] 兑换成功，已立减 ¥10.00`);
      setCustomCouponInput('');
    } else if (code.includes('VIP') || code === 'UR-VIP5') {
      setCouponDiscount(5.0);
      setCouponCode(code);
      toast.success(`兑换码 [${code}] 生效，已立减 ¥5.00`);
      setCustomCouponInput('');
    } else {
      toast.error('兑换码无效或已过期', '请尝试输入 RADAR10 或 UR-VIP5');
    }
  };

  // 点击安全支付主按钮：在安全支付上方弹出上拉菜单（复刻1号位置内容）
  const handleClickSafePay = () => {
    if (items.length === 0) {
      toast.warning('选购单暂无餐品', '请先返回挑选餐品');
      return;
    }

    if (diningMode === 'dine_in' && !boundTable) {
      toast.warning('请先绑定堂食桌位', '堂食点单需关联桌台，以便餐车后厨精准传菜');
      setIsTableBindModalOpen(true);
      return;
    }

    // 若上拉菜单未展开，则在安全支付上方弹出上拉菜单（复刻1号位置支付方式）
    if (!isPaymentSheetOpen) {
      setIsPaymentSheetOpen(true);
      setIsCostSheetOpen(false); // 互斥关闭费用明细抽屉
    } else {
      // 若已展开，再次点击安全支付则直接进入收银确认
      if (!selectedChannelKey) {
        toast.warning('请先选择支付渠道', '请在上拉菜单中选择微信、支付宝等支付方式');
        return;
      }
      setIsPaymentSheetOpen(false);
      setIsCashierModalOpen(true);
    }
  };

  // 确认并进入安全收银
  // 收银台完成回调
  const handleCashierSuccess = (voucher: PaymentVoucher, channel: PaymentChannelId) => {
    setCompletedVoucher(voucher);
    setIsCashierModalOpen(false);
    setIsPaidSuccess(true);

    const safeChannelKey: PaymentChannelKey =
      channel === 'wechat' ? 'wx' : channel === 'alipay' ? 'alipay' : channel === 'card' ? 'unionpay' : 'corp';
    setSelectedChannelKey(safeChannelKey);

    // 触发系统全流程下单逻辑 (记录入库并广播至云音箱)
    const returnedOrderNo = onCompleteCheckout(
      remarkInput.trim(),
      couponCode,
      channel,
      voucher
    );

    const finalNo = returnedOrderNo || voucher.orderNo;
    setCreatedOrderNo(finalNo);

    toast.success('支付成功 · 存证已入库', `凭证号: ${voucher.voucherNo} · 已通知餐车开始烤制`);
  };

  // 1. 若购物车为空且未支付完成
  if (items.length === 0 && !isPaidSuccess) {
    return (
      <div className="min-h-[85vh] bg-[#F9F9F7] flex items-center justify-center p-4">
        <div className="max-w-[420px] w-full bg-white border border-[#E8E8E6] p-8 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-400">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#1A1C1B]">选购清单暂无餐品</h3>
            <p className="text-xs text-[#7E7E7A] leading-relaxed">
              黑曜石 01 号移动餐车已就绪，快去菜单挑选炭火招牌美味吧！
            </p>
          </div>
          <button
            type="button"
            onClick={onBackToMenu}
            className="w-full py-2.5 bg-[#1A1C1B] hover:bg-black text-white text-xs font-semibold rounded-lg transition-all shadow-sm cursor-pointer inline-flex items-center justify-center gap-2 subtle-rounded"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>返回挑选餐品</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. 支付成功状态页面 (Payment Celebration View)
  if (isPaidSuccess) {
    return (
      <div className="min-h-screen bg-[#F9F9F7] py-6 px-3 flex justify-center selection:bg-charcoal selection:text-white">
        <div className="max-w-[420px] w-full bg-white border border-[#E8E8E6] p-6 shadow-sm text-center space-y-5 relative overflow-hidden">
          {/* Confetti Particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(20)].map((_, i) => {
              const angle = (i / 20) * 360;
              const distance = 80 + Math.random() * 120;
              const rad = (angle * Math.PI) / 180;
              const tx = Math.cos(rad) * distance;
              const ty = Math.sin(rad) * distance;
              const colors = ['#006D36', '#10b981', '#34d399', '#fbf3db', '#d97706', '#1A1C1B'];
              const color = colors[i % colors.length];

              return (
                <motion.div
                  key={i}
                  initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                  animate={{
                    x: tx,
                    y: ty,
                    scale: [0, 1.2, 0.7],
                    opacity: [1, 1, 0],
                    rotate: Math.random() * 360
                  }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  className="absolute top-1/3 left-1/2 rounded-full"
                  style={{
                    width: 6 + Math.random() * 5,
                    height: 6 + Math.random() * 5,
                    backgroundColor: color
                  }}
                />
              );
            })}
          </div>

          {/* SVG Checkmark */}
          <div className="w-16 h-16 rounded-full bg-[#EBF7EF] border-2 border-[#006D36] flex items-center justify-center mx-auto shadow-sm">
            <svg className="w-8 h-8 text-[#006D36]" viewBox="0 0 24 24" fill="none">
              <motion.circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="2"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
              />
              <motion.path
                d="M7 12.5L10.5 16L17 8.5"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.4, delay: 0.35, ease: 'easeOut' }}
              />
            </svg>
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <span className="inline-block px-2.5 py-0.5 bg-[#EBF7EF] text-[#006D36] border border-[#006D36]/20 text-xs font-bold font-mono">
                订单编号：{createdOrderNo || 'UR-8802'}
              </span>
              <span className="inline-block px-2 py-0.5 bg-neutral-100 text-[#1A1C1B] border border-neutral-300 text-[10px] font-bold">
                实付 ¥{finalAmount.toFixed(2)}
              </span>
            </div>

            <h2 className="text-lg font-black text-[#1A1C1B]">
              已向黑曜石餐车发射订单！
            </h2>
            <p className="text-xs text-[#7E7E7A] max-w-sm mx-auto leading-relaxed">
              餐车主厨已接单并进入炭火现制流程。专线配送员正整装待发，预计将在{' '}
              <strong className="text-[#1A1C1B] font-bold">12 分钟内</strong> 送达您的工位。
            </p>

            {/* Escrow & Guarantee Protection Strip */}
            <div className="p-2.5 bg-[#EBF7EF] border border-[#006D36]/30 text-left text-xs max-w-sm mx-auto space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#006D36] flex items-center gap-1 text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#006D36]" />
                  <span>资金清算已对账 · 双轨兜底保全生效</span>
                </span>
                <span className="text-[9.5px] text-[#006D36] font-mono font-bold bg-white px-1 py-0.2 rounded">
                  100% 赔付保障
                </span>
              </div>
              <p className="text-[10px] text-[#006D36]/90 leading-normal">
                已生成唯一电子回执与网联流水凭据，即便网络离线，此凭证享优先无条件出餐保障。
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-col gap-2 max-w-sm mx-auto">
            {completedVoucher && (
              <button
                type="button"
                onClick={() => setIsVoucherModalOpen(true)}
                className="w-full py-2.5 px-3 bg-[#006D36] hover:bg-[#005a2d] text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-98 subtle-rounded"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>查看防伪电子支付凭据 / 对账回执</span>
              </button>
            )}

            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => onGoToTracking(createdOrderNo)}
                className="flex-1 py-2.5 px-3 bg-[#1A1C1B] hover:bg-black text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-98 subtle-rounded"
              >
                <Bike className="w-3.5 h-3.5 text-emerald-400" />
                <span>实时雷达物流追踪</span>
              </button>

              <button
                type="button"
                onClick={onGoToOrders}
                className="flex-1 py-2.5 px-3 bg-white hover:bg-neutral-50 text-[#1A1C1B] border border-[#E8E8E6] font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-98 subtle-rounded"
              >
                <span>查看所有订单</span>
              </button>
            </div>
          </div>
        </div>

        {/* 电子支付凭证弹窗 */}
        <ElectronicPaymentVoucherModal
          isOpen={isVoucherModalOpen}
          onClose={() => setIsVoucherModalOpen(false)}
          voucher={completedVoucher}
          onGoToOrderTracking={() => {
            setIsVoucherModalOpen(false);
            onGoToTracking(createdOrderNo);
          }}
        />
      </div>
    );
  }

  // 3. 全新订单结算主界面 (Conforming to user's exact provided HTML Design)
  return (
    <div className="min-h-screen bg-[#F9F9F7] pb-32 text-[#1A1C1B] font-sans antialiased selection:bg-charcoal selection:text-white">
      <div className="max-w-[420px] mx-auto min-h-screen bg-[#F9F9F7] flex flex-col justify-between relative shadow-sm">
        {/* BEGIN: TopNavigationBar */}
        <header className="sticky top-0 z-30 bg-[#F9F9F7]/90 backdrop-blur-md px-4 py-3.5 border-b border-[#E8E8E6] flex items-center justify-between">
          <button
            type="button"
            aria-label="返回上一页"
            onClick={onBackToMenu}
            className="w-8 h-8 -ml-1 flex items-center justify-center rounded-full hover:bg-black/5 active:scale-95 transition-transform cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#1A1C1B]" />
          </button>
          <h1 className="text-sm font-semibold tracking-tight text-[#1A1C1B]">订单结算</h1>
          <div className="flex items-center gap-1 text-[11px] text-[#7E7E7A] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#006D36]" />
            <span>加密保障</span>
          </div>
        </header>
        {/* END: TopNavigationBar */}

        {/* Main Content Area */}
        <main className="p-3.5 space-y-2.5 flex-1">
          {/* 1. 履约模式与地址 (紧凑一体化) */}
          <section className="bg-white p-3 border border-[#E8E8E6] shadow-sm space-y-2.5">
            {/* 极简轻量分段胶囊 */}
            <div className="grid grid-cols-3 gap-1 p-0.5 bg-[#F9F9F7] border border-[#F0F0EE] text-xs font-medium max-w-[280px] subtle-rounded">
              <button
                type="button"
                id="tab-delivery"
                onClick={() => handleFulfillmentSelect('delivery')}
                className={`py-1.5 px-2 text-center transition-all subtle-rounded-inner flex items-center justify-center gap-1.5 cursor-pointer ${
                  diningMode === 'delivery'
                    ? 'bg-white text-[#1A1C1B] font-semibold shadow-xs border border-charcoal/10'
                    : 'text-[#7E7E7A] hover:text-[#1A1C1B]'
                }`}
              >
                <Bike
                  className={`w-3.5 h-3.5 shrink-0 ${diningMode === 'delivery' ? 'text-[#006D36]' : 'text-[#9E9E98]'}`}
                />
                <span>外卖专送</span>
              </button>

              <button
                type="button"
                id="tab-dinein"
                onClick={() => handleFulfillmentSelect('dine_in')}
                className={`py-1.5 px-2 text-center transition-all subtle-rounded-inner flex items-center justify-center gap-1.5 cursor-pointer ${
                  diningMode === 'dine_in'
                    ? 'bg-white text-[#1A1C1B] font-semibold shadow-xs border border-charcoal/10'
                    : 'text-[#7E7E7A] hover:text-[#1A1C1B]'
                }`}
              >
                <Utensils
                  className={`w-3.5 h-3.5 shrink-0 ${diningMode === 'dine_in' ? 'text-[#006D36]' : 'text-[#9E9E98]'}`}
                />
                <span>现场堂食</span>
              </button>

              <button
                type="button"
                id="tab-pickup"
                onClick={() => handleFulfillmentSelect('pickup')}
                className={`py-1.5 px-2 text-center transition-all subtle-rounded-inner flex items-center justify-center gap-1.5 cursor-pointer ${
                  diningMode === 'pickup'
                    ? 'bg-white text-[#1A1C1B] font-semibold shadow-xs border border-charcoal/10'
                    : 'text-[#7E7E7A] hover:text-[#1A1C1B]'
                }`}
              >
                <ShoppingBag
                  className={`w-3.5 h-3.5 shrink-0 ${diningMode === 'pickup' ? 'text-[#006D36]' : 'text-[#9E9E98]'}`}
                />
                <span>到车自提</span>
              </button>
            </div>

            {/* 地址与履约时效单行展示 */}
            <div className="flex items-center justify-between gap-2.5 pt-0.5 px-0.5">
              <div className="min-w-0 flex-1 flex items-start gap-2">
                <div className="w-7 h-7 bg-[#F9F9F7] border border-[#F0F0EE] flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-[#1A1C1B]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      id="delivery-tag"
                      className="text-[10px] font-semibold text-[#006D36] bg-[#EBF7EF] px-1.5 py-0.5 leading-none flex items-center gap-1 shrink-0"
                    >
                      <Clock className="w-2.5 h-2.5" />
                      {diningMode === 'delivery'
                        ? '约12分送达'
                        : diningMode === 'dine_in'
                        ? '免配送费'
                        : '即刻自提'}
                    </span>
                    <p id="location-text" className="text-xs font-semibold text-[#1A1C1B] truncate">
                      {diningMode === 'delivery'
                        ? deliveryAddress || '静安大悦城北座 1F 中庭黑曜石餐车站'
                        : diningMode === 'dine_in'
                        ? boundTable
                          ? `就餐桌位: ${boundTable.code} 号桌 (${boundTable.zoneLabel})`
                          : '未绑定堂食桌台 (点击选桌)'
                        : '静安大悦城北座 1F 中庭黑曜石餐车专用取餐口'}
                    </p>
                  </div>
                  <p id="location-sub" className="text-[11px] text-[#7E7E7A] mt-1 truncate flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-[#006D36] shrink-0" />
                    {diningMode === 'delivery'
                      ? '专人送至工位前台 · 保温锁鲜'
                      : diningMode === 'dine_in'
                      ? '中庭露营外摆位 · 扫码入座 · 现烹传菜'
                      : '黑曜石餐车专用取餐口取餐 · 提货码秒取'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (diningMode === 'dine_in') {
                    setIsTableBindModalOpen(true);
                  } else if (diningMode === 'delivery') {
                    setIsAddressPromptOpen(true);
                  } else {
                    toast.info('自提点固定为黑曜石 01 号餐车车窗取餐口');
                  }
                }}
                className="text-xs text-[#1A1C1B] font-medium underline underline-offset-2 shrink-0 opacity-80 hover:opacity-100 flex items-center gap-1 py-1 px-1.5 hover:bg-black/5 cursor-pointer"
              >
                <Edit2 className="w-3 h-3 text-[#7E7E7A]" />
                <span>修改</span>
              </button>
            </div>

            {/* 内联修改地址抽屉 */}
            {isAddressPromptOpen && (
              <div className="pt-2 border-t border-[#F0F0EE] flex gap-2 animate-in fade-in duration-150">
                <input
                  type="text"
                  value={newAddressInput}
                  onChange={(e) => setNewAddressInput(e.target.value)}
                  placeholder="输入详细配送地址（如：大悦城商务座 1204 室）"
                  className="flex-1 text-xs border border-[#E8E8E6] bg-white p-2 outline-none focus:border-[#1A1C1B]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newAddressInput.trim()) {
                      onChangeAddress(newAddressInput.trim());
                      setIsAddressPromptOpen(false);
                      toast.success('配送地址已更新');
                    }
                  }}
                  className="px-3 py-1.5 bg-[#1A1C1B] text-white text-xs font-semibold cursor-pointer"
                >
                  确定
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddressPromptOpen(false)}
                  className="px-2 py-1.5 text-xs text-[#7E7E7A] hover:text-[#1A1C1B] cursor-pointer"
                >
                  取消
                </button>
              </div>
            )}
          </section>

          {/* 2. 综合订单卡片 (Unified Order Container) */}
          <section
            id="unified-order-container"
            className="bg-white border border-[#E8E8E6] shadow-sm overflow-hidden divide-y divide-[#F0F0EE]"
          >
            {/* 1. 已选餐品明细 */}
            <div id="meal-card-section" className="p-3 space-y-2.5">
              <div className="flex items-center justify-between border-b border-[#F0F0EE] pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-[#1A1C1B]" />
                  <span className="text-xs font-bold text-[#1A1C1B]">已选餐品明细</span>
                  <span className="text-[10px] text-[#7E7E7A] bg-[#F9F9F7] px-1.5 py-0.5 border border-[#F0F0EE] font-medium">
                    共 {totalQuantity} 件
                  </span>
                </div>
                <button
                  type="button"
                  id="btn-toggle-view-mode"
                  onClick={() => {
                    setIsTextOnlyView(!isTextOnlyView);
                    toast.info(isTextOnlyView ? '已切换至图文详情视图' : '已切换至纯文字紧凑视图');
                  }}
                  className="flex items-center gap-1 text-[11px] font-medium text-[#7E7E7A] hover:text-[#1A1C1B] bg-[#F9F9F7] border border-[#E8E8E6] hover:border-charcoal/30 px-2 py-1 transition-all cursor-pointer subtle-rounded"
                >
                  {isTextOnlyView ? (
                    <AlignLeft className="w-3 h-3 text-[#7E7E7A]" />
                  ) : (
                    <ImageIcon className="w-3 h-3 text-[#7E7E7A]" />
                  )}
                  <span id="view-mode-text">{isTextOnlyView ? '纯文字视图' : '图文详情视图'}</span>
                  <ChevronDown className="w-2.5 h-2.5 text-[#9E9E98]" />
                </button>
              </div>

              {/* 餐品列表循环 */}
              <div className="space-y-3 divide-y divide-[#F0F0EE]/60">
                {items.map((item) => {
                  const dishImg = matchDishImageUrl(item.dish);
                  const itemUnitPrice = item.calculatedPrice / item.quantity;
                  const optionsList = Object.values(item.selectedOptions || {});

                  return (
                    <div
                      key={item.cartItemId}
                      className="flex items-center gap-3 pt-2 first:pt-0"
                      id="meal-item-content"
                    >
                      {/* 缩略图 (纯文字视图下隐藏) */}
                      {!isTextOnlyView && (
                        <div
                          id="meal-thumbnail"
                          className="w-16 h-16 overflow-hidden bg-[#F9F9F7] shrink-0 border border-[#F0F0EE] relative"
                        >
                          <img
                            alt={item.dish.name}
                            className="w-full h-full object-cover"
                            src={dishImg}
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-[#1A1C1B]/80 text-[8px] text-white font-medium flex items-center justify-center gap-0.5 py-0.5">
                            <Sparkles className="w-2 h-2 text-[#d97706]" />
                            <span>主厨现烤</span>
                          </div>
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <h2 className="text-xs font-semibold text-[#1A1C1B] truncate">
                            {item.dish.name}
                          </h2>
                          <span className="shrink-0 inline-flex items-center text-[9px] px-1 py-0.5 bg-[#edf5fe] text-[#1677ff] font-medium">
                            <Check className="w-2.5 h-2.5 mr-0.5" />
                            黑卡臻选
                          </span>
                        </div>
                        <p className="text-[11px] text-[#7E7E7A] mt-0.5 truncate">
                          {optionsList.length > 0 ? optionsList.join(' · ') : 'Truffle Fries · 标准现烤制作'}
                        </p>

                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs font-semibold text-[#1A1C1B]">
                            ¥
                            <span id="single-unit-price" className="text-sm font-bold tracking-tight">
                              {item.calculatedPrice.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-[#9E9E98] font-normal ml-1">
                              (¥{itemUnitPrice.toFixed(2)}/份)
                            </span>
                          </span>

                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center border border-[#E8E8E6] bg-[#F9F9F7]/50 h-6">
                              <button
                                type="button"
                                aria-label="减少份数"
                                onClick={() => {
                                  if (item.quantity <= 1) {
                                    onRemoveCartItem(item.cartItemId);
                                    toast.info(`已移除【${item.dish.name}】`);
                                  } else {
                                    onUpdateCartQuantity(item.cartItemId, item.quantity - 1);
                                  }
                                }}
                                className="w-6 h-full flex items-center justify-center text-[#7E7E7A] hover:text-[#1A1C1B] active:scale-90 transition-transform cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span
                                id="display-quantity"
                                className="w-5 text-center text-xs font-semibold text-[#1A1C1B]"
                              >
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                aria-label="增加份数"
                                onClick={() => onUpdateCartQuantity(item.cartItemId, item.quantity + 1)}
                                className="w-6 h-full flex items-center justify-center text-[#7E7E7A] hover:text-[#1A1C1B] active:scale-90 transition-transform cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <button
                              type="button"
                              aria-label="删除餐品"
                              onClick={() => {
                                onRemoveCartItem(item.cartItemId);
                                toast.info(`已移除【${item.dish.name}】`);
                              }}
                              className="w-6 h-6 flex items-center justify-center border border-[#E8E8E6] bg-[#F9F9F7]/50 text-[#7E7E7A] hover:text-[#1A1C1B] hover:bg-black/5 active:scale-90 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. 备注与环保偏好 */}
            <div className="transition-all">
              <button
                type="button"
                onClick={() => setIsEcoOpen(!isEcoOpen)}
                className="w-full p-3 flex items-center justify-between text-left text-xs text-[#1A1C1B] hover:bg-black/[0.01] cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span className="text-[#7E7E7A] text-[11px] shrink-0 font-medium">备注与偏好</span>
                  <span id="eco-summary-preview" className="text-xs text-[#1A1C1B] font-medium truncate">
                    {ecoSummaryPreview}
                  </span>
                </div>
                <ChevronDown
                  id="eco-accordion-arrow"
                  className={`w-3.5 h-3.5 text-[#9E9E98] shrink-0 rotate-icon ${isEcoOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isEcoOpen && (
                <div
                  id="eco-accordion"
                  className="accordion-content border-t border-[#F0F0EE] p-3 bg-[#F9F9F7]/30 space-y-2.5 animate-in fade-in duration-150"
                >
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* 选项 1 */}
                    <div
                      id="eco-opt-1"
                      onClick={() => {
                        setEcoPref(1);
                        toast.success('已选择环保餐具', '提供玉米淀粉吸管与原木餐具');
                      }}
                      className={`cursor-pointer p-2.5 transition-all flex flex-col justify-between relative overflow-hidden ${
                        ecoPref === 1
                          ? 'border-2 border-[#1A1C1B] bg-white'
                          : 'border border-[#E8E8E6] bg-white hover:border-charcoal/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="w-5 h-5 bg-[#EBF7EF] flex items-center justify-center">
                          <Sparkles className="w-3 h-3 text-[#006D36]" />
                        </div>
                        <span className="text-[9px] font-semibold text-[#006D36] bg-[#EBF7EF] px-1">推荐</span>
                      </div>
                      <span className="font-semibold text-[#1A1C1B]">提供环保餐具</span>
                      <span className="text-[10px] text-[#7E7E7A] mt-0.5">玉米淀粉吸管与原木餐具</span>
                    </div>

                    {/* 选项 2 */}
                    <div
                      id="eco-opt-2"
                      onClick={() => {
                        setEcoPref(2);
                        toast.info('已选择无需餐具', '工位自备餐具，绿色减碳同行');
                      }}
                      className={`cursor-pointer p-2.5 transition-all flex flex-col justify-between ${
                        ecoPref === 2
                          ? 'border-2 border-[#1A1C1B] bg-white'
                          : 'border border-[#E8E8E6] bg-white hover:border-charcoal/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="w-5 h-5 bg-[#F9F9F7] border border-[#F0F0EE] flex items-center justify-center">
                          <Leaf className="w-3 h-3 text-[#7E7E7A]" />
                        </div>
                        <span className="text-[9px] text-[#7E7E7A]">减碳同行</span>
                      </div>
                      <span className="font-semibold text-[#1A1C1B]">无需一次性餐具</span>
                      <span className="text-[10px] text-[#7E7E7A] mt-0.5">工位自备餐具 · 绿色减塑</span>
                    </div>
                  </div>

                  {/* 备注输入 */}
                  <div className="space-y-1.5">
                    <div className="relative">
                      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Edit2 className="w-3.5 h-3.5 text-[#9E9E98]" />
                      </div>
                      <input
                        type="text"
                        id="remark-input"
                        value={remarkInput}
                        onChange={(e) => setRemarkInput(e.target.value)}
                        placeholder="备注 (如：微辣、免葱、放外卖柜)"
                        className="w-full text-xs border border-[#E8E8E6] bg-white py-2.5 pl-8 pr-3 focus:border-[#1A1C1B] focus:ring-0 outline-none transition-colors placeholder:text-[#9E9E98]"
                      />
                    </div>
                    {/* 快捷标签 */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {['少辣', '免葱姜蒜', '多放黑松露', '保温袋密封', '现烤焦香', '放前台桌上'].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            setRemarkInput((prev) => (prev ? `${prev}，${tag}` : tag));
                          }}
                          className="text-[10.5px] px-2 py-0.5 bg-[#F9F9F7] hover:bg-[#E8E8E6] text-[#1A1C1B] border border-[#E8E8E6] cursor-pointer transition-colors"
                        >
                          +{tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. 优惠券与活动 */}
            <div className="transition-all">
              <button
                type="button"
                onClick={() => setIsCouponOpen(!isCouponOpen)}
                className="w-full p-3 flex items-center justify-between text-left text-xs hover:bg-black/[0.01] cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span className="text-[#7E7E7A] text-[11px] shrink-0 font-medium">优惠券</span>
                  <span className="text-xs font-semibold text-[#006D36] truncate">
                    已省 ¥{effectiveCoupon.toFixed(2)}{' '}
                    <span className="text-[#7E7E7A] font-normal">[{couponCode} 优选券]</span>
                  </span>
                </div>
                <ChevronDown
                  id="coupon-accordion-arrow"
                  className={`w-3.5 h-3.5 text-[#9E9E98] shrink-0 rotate-icon ${isCouponOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isCouponOpen && (
                <div
                  id="coupon-accordion"
                  className="accordion-content border-t border-[#F0F0EE] p-3 bg-[#F9F9F7]/30 space-y-2 animate-in fade-in duration-150"
                >
                  <div id="coupon-list-group" className="space-y-2">
                    {/* 券 1 */}
                    <div
                      className={`p-2.5 bg-white flex items-center justify-between transition-all relative overflow-hidden ${
                        couponCode === 'UR-VIP5'
                          ? 'border-2 border-[#1A1C1B]'
                          : 'border border-[#E8E8E6] hover:border-charcoal/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div className="w-8 h-8 bg-[#1A1C1B] text-white flex items-center justify-center shrink-0">
                          <Tag className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[#1A1C1B] truncate">UR-VIP5 优选券</span>
                            {couponCode === 'UR-VIP5' && (
                              <span className="text-[10px] font-semibold text-[#006D36] bg-[#EBF7EF] px-1.5 py-0.5 leading-none flex items-center gap-0.5 shrink-0">
                                <Check className="w-2.5 h-2.5" />
                                使用中
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#7E7E7A] mt-0.5 truncate">无门槛立减 · 全单通用</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold text-[#006D36]">-¥5.00</span>
                        {couponCode === 'UR-VIP5' ? (
                          <span className="text-[11px] font-semibold bg-[#1A1C1B] text-white px-2.5 py-1 flex items-center gap-1 subtle-rounded">
                            <Check className="w-2.5 h-2.5 text-[#006D36]" />
                            已选
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setCouponCode('UR-VIP5');
                              setCouponDiscount(5.0);
                              toast.success('已切换至 [UR-VIP5 优选券]');
                            }}
                            className="text-[11px] font-medium text-[#1A1C1B] border border-[#E8E8E6] bg-[#F9F9F7] hover:bg-black/5 active:scale-95 px-2.5 py-1 subtle-rounded transition-all cursor-pointer"
                          >
                            切换
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 券 2 */}
                    <div
                      className={`p-2.5 bg-white flex items-center justify-between transition-all relative overflow-hidden ${
                        couponCode === 'RADAR-NEW'
                          ? 'border-2 border-[#1A1C1B]'
                          : 'border border-[#E8E8E6] hover:border-charcoal/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div className="w-8 h-8 bg-[#F9F9F7] border border-[#F0F0EE] text-[#1A1C1B] flex items-center justify-center shrink-0">
                          <Gift className="w-4 h-4 text-[#7E7E7A]" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-[#1A1C1B] truncate">RADAR-NEW 新客专享</span>
                            <span className="text-[10px] font-medium text-[#7E7E7A] bg-[#F9F9F7] px-1.5 py-0.5 leading-none border border-[#F0F0EE] shrink-0">
                              满¥50可用
                            </span>
                          </div>
                          <p className="text-[11px] text-[#7E7E7A] mt-0.5 truncate">限首次点单黑曜石餐车餐品</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold text-[#006D36]">-¥8.00</span>
                        {couponCode === 'RADAR-NEW' ? (
                          <span className="text-[11px] font-semibold bg-[#1A1C1B] text-white px-2.5 py-1 flex items-center gap-1 subtle-rounded">
                            <Check className="w-2.5 h-2.5 text-[#006D36]" />
                            已选
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (subtotal < 50) {
                                toast.warning('未满起用门槛', '该券需餐品原价满 ¥50.00 方可使用');
                                return;
                              }
                              setCouponCode('RADAR-NEW');
                              setCouponDiscount(8.0);
                              toast.success('已切换至 [RADAR-NEW] 新客专享券');
                            }}
                            className="text-[11px] font-medium text-[#1A1C1B] border border-[#E8E8E6] bg-[#F9F9F7] hover:bg-black/5 active:scale-95 px-2.5 py-1 subtle-rounded transition-all cursor-pointer"
                          >
                            切换
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 券 3 */}
                    <div
                      className={`p-2.5 bg-white flex items-center justify-between transition-all relative overflow-hidden ${
                        couponCode === 'CHEF-3'
                          ? 'border-2 border-[#1A1C1B]'
                          : 'border border-[#E8E8E6] hover:border-charcoal/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div className="w-8 h-8 bg-[#F9F9F7] border border-[#F0F0EE] text-[#1A1C1B] flex items-center justify-center shrink-0">
                          <Sparkles className="w-4 h-4 text-[#7E7E7A]" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-[#1A1C1B] truncate">CHEF-3 炭烤尝鲜券</span>
                            <span className="text-[10px] font-medium text-[#7E7E7A] bg-[#F9F9F7] px-1.5 py-0.5 leading-none border border-[#F0F0EE] shrink-0">
                              无门槛
                            </span>
                          </div>
                          <p className="text-[11px] text-[#7E7E7A] mt-0.5 truncate">指定主厨汉堡专享折扣</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold text-[#006D36]">-¥3.00</span>
                        {couponCode === 'CHEF-3' ? (
                          <span className="text-[11px] font-semibold bg-[#1A1C1B] text-white px-2.5 py-1 flex items-center gap-1 subtle-rounded">
                            <Check className="w-2.5 h-2.5 text-[#006D36]" />
                            已选
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setCouponCode('CHEF-3');
                              setCouponDiscount(3.0);
                              toast.success('已切换至 [CHEF-3] 尝鲜券');
                            }}
                            className="text-[11px] font-medium text-[#1A1C1B] border border-[#E8E8E6] bg-[#F9F9F7] hover:bg-black/5 active:scale-95 px-2.5 py-1 subtle-rounded transition-all cursor-pointer"
                          >
                            切换
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 兑换码输入框 */}
                  <div className="pt-1 border-t border-[#F0F0EE] space-y-2">
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        id="coupon-input"
                        value={customCouponInput}
                        onChange={(e) => setCustomCouponInput(e.target.value)}
                        placeholder="输入兑换码 (如 RADAR10)"
                        className="flex-1 text-xs border border-[#E8E8E6] bg-white p-2 focus:border-[#1A1C1B] focus:ring-0 outline-none placeholder:text-[#9E9E98]"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCustomCoupon}
                        className="bg-[#1A1C1B] text-white text-xs font-medium px-3.5 py-2 active:scale-95 transition-transform shrink-0 subtle-rounded cursor-pointer"
                      >
                        兑换
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#7E7E7A] pt-0.5">
                      <span>
                        当前生效: <span className="font-semibold text-[#1A1C1B]" id="applied-coupon-label">{couponCode} (立减¥{effectiveCoupon.toFixed(2)})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => toast.info('已为您推荐全局最高抵扣组合', '无门槛立减可叠加满减优惠')}
                        className="text-[#1A1C1B] underline underline-offset-2 hover:opacity-80 cursor-pointer"
                      >
                        优惠规则
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 4. 费用明细 (调整至支付方式上方) */}
            <div className="transition-all">
              <button
                type="button"
                onClick={() => setIsCostOpen(!isCostOpen)}
                className="w-full p-3 flex items-center justify-between text-left text-xs hover:bg-black/[0.01] cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span className="text-[#1A1C1B] font-semibold text-xs shrink-0">费用明细</span>
                  <span className="text-xs text-[#7E7E7A] font-normal truncate">
                    原价 ¥<span id="cost-original-sum">{originalTotal.toFixed(2)}</span> · 已减 ¥
                    <span id="cost-discount-sum">{totalSaved.toFixed(2)}</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] font-semibold text-[#006D36] bg-[#EBF7EF] px-1.5 py-0.5 leading-none">
                    明细
                  </span>
                  <ChevronDown
                    id="cost-accordion-arrow"
                    className={`w-3.5 h-3.5 text-[#9E9E98] rotate-icon ${isCostOpen ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>

              {isCostOpen && (
                <div
                  id="cost-accordion"
                  className="accordion-content border-t border-[#F0F0EE] p-3 bg-[#F9F9F7]/30 space-y-2 text-xs animate-in fade-in duration-150"
                >
                  <div className="flex justify-between items-center text-[#7E7E7A]">
                    <span className="flex items-center gap-1">
                      <ShoppingBag className="w-3 h-3 text-[#9E9E98]" />
                      <span>餐品小计</span> <span id="summary-item-count" className="text-[11px]">({totalQuantity} 件)</span>
                    </span>
                    <span className="text-[#1A1C1B] font-medium">
                      ¥<span id="summary-subtotal">{subtotal.toFixed(2)}</span>
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[#7E7E7A]">
                    <span className="flex items-center gap-1">
                      <Bike className="w-3 h-3 text-[#9E9E98]" />
                      <span>专线配送费</span>
                    </span>
                    <span id="summary-delivery-fee" className="text-[#1A1C1B] font-medium">
                      ¥{activeDeliveryFee.toFixed(2)}
                    </span>
                  </div>

                  {ladderDiscount > 0 && (
                    <div className="flex justify-between items-center text-[#7E7E7A]">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3 text-[#006D36]" />
                        <span>餐车阶梯满减</span>
                      </span>
                      <span className="text-[#006D36] font-medium">
                        -¥<span id="summary-ladder-discount">{ladderDiscount.toFixed(2)}</span>
                      </span>
                    </div>
                  )}

                  {effectiveCoupon > 0 && (
                    <div className="flex justify-between items-center text-[#7E7E7A]">
                      <span className="flex items-center gap-1">
                        <Gift className="w-3 h-3 text-[#006D36]" />
                        <span>优惠券抵扣</span> <span id="summary-coupon-name" className="text-[10px] text-[#9E9E98]">({couponCode})</span>
                      </span>
                      <span className="text-[#006D36] font-medium">
                        -¥<span id="summary-coupon-discount">{effectiveCoupon.toFixed(2)}</span>
                      </span>
                    </div>
                  )}

                  {vipDiscount > 0 && (
                    <div className="flex justify-between items-center text-[#7E7E7A]">
                      <span className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-[#006D36]" />
                        <span>黑金 VIP 专享折扣</span>
                      </span>
                      <span className="text-[#006D36] font-medium">
                        -¥<span id="summary-vip-discount">{vipDiscount.toFixed(2)}</span>
                      </span>
                    </div>
                  )}

                  {channelDiscount > 0 && (
                    <div className="flex justify-between items-center text-[#7E7E7A]">
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-[#006D36]" />
                        <span>支付渠道立减 (<span id="summary-pay-channel-name">{channelName}</span>)</span>
                      </span>
                      <span className="text-[#006D36] font-medium">
                        -¥<span id="summary-pay-channel-discount">{channelDiscount.toFixed(2)}</span>
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 5. 支付方式 (已移动至费用明细正下方) */}
            <div id="payment-module-section" className="transition-all">
              <button
                type="button"
                onClick={() => setIsPayOpen(!isPayOpen)}
                className="w-full p-3 flex items-center justify-between text-left text-xs hover:bg-black/[0.01] cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span className="text-[#7E7E7A] text-[11px] shrink-0 font-medium">支付方式</span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      id="current-pay-preview"
                      className={`text-xs truncate ${selectedChannelKey ? 'font-semibold text-[#1A1C1B]' : 'text-[#7E7E7A]'}`}
                    >
                      {selectedChannelKey
                        ? `${channelName} (立减¥${channelDiscount.toFixed(2)})`
                        : '未选择支付方式'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span id="pay-select-hint" className="text-[11px] text-[#7E7E7A]">
                    切换
                  </span>
                  <ChevronDown
                    id="pay-accordion-arrow"
                    className={`w-3.5 h-3.5 text-[#9E9E98] rotate-icon ${isPayOpen ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>

              {isPayOpen && (
                <div
                  id="pay-accordion"
                  className="accordion-content border-t border-[#F0F0EE] p-3 bg-[#F9F9F7]/30 animate-in fade-in duration-150"
                >
                  <div className="grid grid-cols-4 gap-2" data-purpose="payment-channel-grid">
                    {/* 微信支付 */}
                    <button
                      type="button"
                      id="pay-wx"
                      onClick={() => handleSelectChannel('wx')}
                      className={`pay-option p-2 flex flex-col items-center justify-center gap-1 transition-all relative cursor-pointer subtle-rounded ${
                        selectedChannelKey === 'wx'
                          ? paymentChannels.wx.activeBorder
                          : paymentChannels.wx.border
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full bg-[#07c160] flex items-center justify-center shadow-xs">
                        <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8.691 2.188C3.891 2.188 0 5.478 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.534 1.996c-.05.188.15.342.316.241l2.368-1.428a.63.63 0 0 1 .536-.053c.895.27 1.848.419 2.84.419.467 0 .924-.034 1.372-.095a6.452 6.452 0 0 1-.223-1.688c0-3.69 3.42-6.68 7.64-6.68.328 0 .65.018.968.051C17.702 5.163 13.567 2.188 8.691 2.188zm-2.03 4.29c.633 0 1.146.513 1.146 1.147a1.147 1.147 0 0 1-2.293 0c0-.634.513-1.147 1.147-1.147zm5.156 0c.633 0 1.146.513 1.146 1.147a1.147 1.147 0 0 1-2.292 0c0-.634.513-1.147 1.146-1.147zM16.5 9.774c-3.664 0-6.635 2.502-6.635 5.589 0 1.705.908 3.235 2.32 4.275a.49.49 0 0 1 .17.514l-.412 1.542c-.04.145.116.264.244.186l1.83-1.103a.49.49 0 0 1 .414-.041c.692.208 1.428.322 2.193.322 3.665 0 6.635-2.503 6.635-5.59 0-3.086-2.97-5.588-6.635-5.588zm-1.895 3.327c.489 0 .885.396.885.885a.885.885 0 1 1-1.77 0c0-.49.396-.885.885-.885zm4.128 0c.489 0 .885.396.885.885a.885.885 0 1 1-1.77 0c0-.49.396-.885.885-.885z" />
                        </svg>
                      </div>
                      <span className="text-xs font-bold text-[#07c160]">微信支付</span>
                      <span className="text-[9px] text-[#07c160]/80 font-semibold">-¥3.00</span>
                    </button>

                    {/* 支付宝 */}
                    <button
                      type="button"
                      id="pay-alipay"
                      onClick={() => handleSelectChannel('alipay')}
                      className={`pay-option p-2 flex flex-col items-center justify-center gap-1 transition-all relative cursor-pointer subtle-rounded ${
                        selectedChannelKey === 'alipay'
                          ? paymentChannels.alipay.activeBorder
                          : paymentChannels.alipay.border
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full bg-[#1677ff] flex items-center justify-center shadow-xs">
                        <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.67 15.18c-1.39-.52-3.13-1.2-4.9-1.92 1.07-2.07 1.83-4.4 2.17-6.89h-5.26V4.5h-2.14v1.87H4.88v2.01h5.66c-.32 1.88-.89 3.66-1.68 5.25-1.57-.75-3.03-1.61-4.14-2.55L3.2 12.63c1.54 1.25 3.51 2.35 5.62 3.26C5.9 17.65 3.4 19.34 1.5 20.9l1.6 1.63c2.09-1.66 4.95-3.57 8.35-5.3 2.76 1.34 5.37 2.27 7.54 2.77l1.68-2.12c-.67-.22-1.42-.51-2.22-.92l2.22-1.78z" />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-[#1677ff]">支付宝</span>
                      <span className="text-[9px] text-[#1677ff]/80 font-medium">-¥2.50</span>
                    </button>

                    {/* 银联卡 */}
                    <button
                      type="button"
                      id="pay-unionpay"
                      onClick={() => handleSelectChannel('unionpay')}
                      className={`pay-option p-2 flex flex-col items-center justify-center gap-1 transition-all relative cursor-pointer subtle-rounded ${
                        selectedChannelKey === 'unionpay'
                          ? paymentChannels.unionpay.activeBorder
                          : paymentChannels.unionpay.border
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full bg-[#e60012] flex items-center justify-center shadow-xs">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <rect height="14" rx="2" width="20" x="2" y="5" />
                          <line x1="2" x2="22" y1="10" y2="10" />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-[#b51221]">银联卡</span>
                      <span className="text-[9px] text-[#b51221]/80 font-medium">-¥2.00</span>
                    </button>

                    {/* 企业餐补 */}
                    <button
                      type="button"
                      id="pay-corp"
                      onClick={() => handleSelectChannel('corp')}
                      className={`pay-option p-2 flex flex-col items-center justify-center gap-1 transition-all relative cursor-pointer subtle-rounded ${
                        selectedChannelKey === 'corp'
                          ? paymentChannels.corp.activeBorder
                          : paymentChannels.corp.border
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full bg-[#d97706] flex items-center justify-center shadow-xs">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-[#b45309]">企业餐补</span>
                      <span className="text-[9px] text-[#b45309]/80 font-medium">-¥5.00</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>

        {/* BEGIN: Minimalist Sticky Bottom Bar & Bottom Sheet */}
        {/* Backdrop for detail sheet */}
        <div
          id="cost-sheet-backdrop"
          onClick={() => setIsCostSheetOpen(false)}
          className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${
            isCostSheetOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        />

        {/* Slide-up Detail Sheet */}
        <div
          id="cost-detail-sheet"
          className={`fixed bottom-0 left-0 right-0 z-40 max-w-[420px] mx-auto bg-white border-t border-[#E8E8E6] shadow-lg transition-transform duration-300 ease-out pb-20 ${
            isCostSheetOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <div className="p-3.5 border-b border-[#F0F0EE] flex items-center justify-between bg-[#F9F9F7]">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-3 bg-[#1A1C1B]" />
              <h3 className="text-xs font-bold text-[#1A1C1B] tracking-tight">费用明细</h3>
              <span className="text-[10px] text-[#7E7E7A] bg-white px-1.5 py-0.5 border border-[#F0F0EE] font-medium">
                优惠明细清晰可见
              </span>
            </div>
            <button
              type="button"
              aria-label="关闭费用明细"
              onClick={() => setIsCostSheetOpen(false)}
              className="w-6 h-6 flex items-center justify-center border border-[#E8E8E6] bg-white text-[#7E7E7A] hover:text-[#1A1C1B] hover:bg-black/5 active:scale-95 transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4 space-y-2.5 text-xs bg-white">
            <div className="flex justify-between items-center text-[#7E7E7A]">
              <span className="flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-[#9E9E98]" />
                <span>餐品小计</span> <span id="sheet-item-count" className="text-[11px]">({totalQuantity} 件)</span>
              </span>
              <span className="text-[#1A1C1B] font-semibold">
                ¥<span id="sheet-subtotal">{subtotal.toFixed(2)}</span>
              </span>
            </div>

            <div className="flex justify-between items-center text-[#7E7E7A]">
              <span className="flex items-center gap-1.5">
                <Bike className="w-3.5 h-3.5 text-[#9E9E98]" />
                <span>专线配送费</span>
              </span>
              <span id="sheet-delivery-fee" className="text-[#1A1C1B] font-semibold">
                ¥{activeDeliveryFee.toFixed(2)}
              </span>
            </div>

            {ladderDiscount > 0 && (
              <div className="flex justify-between items-center text-[#7E7E7A]">
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#006D36]" />
                  <span>餐车阶梯满减</span>
                </span>
                <span className="text-[#006D36] font-semibold">
                  -¥<span id="sheet-ladder-discount">{ladderDiscount.toFixed(2)}</span>
                </span>
              </div>
            )}

            {effectiveCoupon > 0 && (
              <div className="flex justify-between items-center text-[#7E7E7A]">
                <span className="flex items-center gap-1.5">
                  <Gift className="w-3.5 h-3.5 text-[#006D36]" />
                  <span>优惠券抵扣</span> <span id="sheet-coupon-name" className="text-[10px] text-[#9E9E98]">({couponCode})</span>
                </span>
                <span className="text-[#006D36] font-semibold">
                  -¥<span id="sheet-coupon-discount">{effectiveCoupon.toFixed(2)}</span>
                </span>
              </div>
            )}

            {vipDiscount > 0 && (
              <div className="flex justify-between items-center text-[#7E7E7A]">
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#006D36]" />
                  <span>黑金 VIP 专享折扣</span>
                </span>
                <span className="text-[#006D36] font-semibold">
                  -¥<span id="sheet-vip-discount">{vipDiscount.toFixed(2)}</span>
                </span>
              </div>
            )}

            {channelDiscount > 0 && (
              <div className="flex justify-between items-center text-[#7E7E7A]">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#006D36]" />
                  <span>支付渠道立减 (<span id="sheet-pay-channel-name">{channelName}</span>)</span>
                </span>
                <span className="text-[#006D36] font-semibold">
                  -¥<span id="sheet-pay-channel-discount">{channelDiscount.toFixed(2)}</span>
                </span>
              </div>
            )}

            <div className="pt-2.5 mt-1 border-t border-[#F0F0EE] flex justify-between items-baseline">
              <span className="text-xs text-[#7E7E7A]">
                共优惠 <span className="font-bold text-[#006D36]">¥<span id="sheet-total-discount">{totalSaved.toFixed(2)}</span></span>
              </span>
              <div className="text-right">
                <span className="text-[11px] text-[#7E7E7A]">待支付 </span>
                <span className="text-base font-black text-[#1A1C1B] tracking-tight">
                  ¥<span id="sheet-final-payable">{finalAmount.toFixed(2)}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 支付方式上拉菜单 (复刻1号位置内容，点击安全支付在上方弹出) */}
        {/* ========================================================================= */}
        {/* 背景遮罩 */}
        <div
          id="payment-sheet-backdrop"
          onClick={() => setIsPaymentSheetOpen(false)}
          className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${
            isPaymentSheetOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        />

        {/* 上拉菜单主体容器 (在安全支付按钮上方滑出，贴合底部工具栏) */}
        <div
          id="payment-channel-sheet"
          className={`fixed bottom-0 left-0 right-0 z-40 max-w-[420px] mx-auto bg-white border-t border-[#E8E8E6] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-out pb-20 rounded-t-2xl overflow-hidden ${
            isPaymentSheetOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          {/* 顶部指示把手 */}
          <div className="pt-2.5 pb-1 flex justify-center bg-[#F9F9F7]">
            <div className="w-10 h-1 rounded-full bg-[#DCDCD8]" />
          </div>

          <div className="px-4 py-2.5 border-b border-[#F0F0EE] flex items-center justify-between bg-[#F9F9F7]">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#006D36]/10 flex items-center justify-center">
                <Lock className="w-3 h-3 text-[#006D36]" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#1A1C1B] tracking-tight">安全支付 · 选择渠道</h3>
                <p className="text-[10px] text-[#7E7E7A]">选择支付方式可享立减优惠</p>
              </div>
            </div>
            <button
              type="button"
              id="btn-close-payment-sheet"
              aria-label="关闭支付方式选择"
              onClick={() => setIsPaymentSheetOpen(false)}
              className="w-6 h-6 flex items-center justify-center border border-[#E8E8E6] bg-white text-[#7E7E7A] hover:text-[#1A1C1B] hover:bg-black/5 active:scale-95 transition-all cursor-pointer rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 1号位置内容完整复刻：4个支付渠道卡片网格 */}
          <div className="p-4 space-y-3 bg-white">
            <div className="grid grid-cols-4 gap-2" data-purpose="sheet-payment-channel-grid">
              {/* 微信支付 */}
              <button
                type="button"
                id="sheet-pay-wx"
                onClick={() => handleSelectChannel('wx')}
                className={`pay-option p-2 flex flex-col items-center justify-center gap-1 transition-all relative cursor-pointer subtle-rounded ${
                  selectedChannelKey === 'wx'
                    ? paymentChannels.wx.activeBorder
                    : paymentChannels.wx.border
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-[#07c160] flex items-center justify-center shadow-xs">
                  <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8.691 2.188C3.891 2.188 0 5.478 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.534 1.996c-.05.188.15.342.316.241l2.368-1.428a.63.63 0 0 1 .536-.053c.895.27 1.848.419 2.84.419.467 0 .924-.034 1.372-.095a6.452 6.452 0 0 1-.223-1.688c0-3.69 3.42-6.68 7.64-6.68.328 0 .65.018.968.051C17.702 5.163 13.567 2.188 8.691 2.188zm-2.03 4.29c.633 0 1.146.513 1.146 1.147a1.147 1.147 0 0 1-2.293 0c0-.634.513-1.147 1.147-1.147zm5.156 0c.633 0 1.146.513 1.146 1.147a1.147 1.147 0 0 1-2.292 0c0-.634.513-1.147 1.146-1.147zM16.5 9.774c-3.664 0-6.635 2.502-6.635 5.589 0 1.705.908 3.235 2.32 4.275a.49.49 0 0 1 .17.514l-.412 1.542c-.04.145.116.264.244.186l1.83-1.103a.49.49 0 0 1 .414-.041c.692.208 1.428.322 2.193.322 3.665 0 6.635-2.503 6.635-5.59 0-3.086-2.97-5.588-6.635-5.588zm-1.895 3.327c.489 0 .885.396.885.885a.885.885 0 1 1-1.77 0c0-.49.396-.885.885-.885zm4.128 0c.489 0 .885.396.885.885a.885.885 0 1 1-1.77 0c0-.49.396-.885.885-.885z" />
                  </svg>
                </div>
                <span className="text-xs font-bold text-[#07c160]">微信支付</span>
                <span className="text-[9px] text-[#07c160]/80 font-semibold">-¥3.00</span>
              </button>

              {/* 支付宝 */}
              <button
                type="button"
                id="sheet-pay-alipay"
                onClick={() => handleSelectChannel('alipay')}
                className={`pay-option p-2 flex flex-col items-center justify-center gap-1 transition-all relative cursor-pointer subtle-rounded ${
                  selectedChannelKey === 'alipay'
                    ? paymentChannels.alipay.activeBorder
                    : paymentChannels.alipay.border
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-[#1677ff] flex items-center justify-center shadow-xs">
                  <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.67 15.18c-1.39-.52-3.13-1.2-4.9-1.92 1.07-2.07 1.83-4.4 2.17-6.89h-5.26V4.5h-2.14v1.87H4.88v2.01h5.66c-.32 1.88-.89 3.66-1.68 5.25-1.57-.75-3.03-1.61-4.14-2.55L3.2 12.63c1.54 1.25 3.51 2.35 5.62 3.26C5.9 17.65 3.4 19.34 1.5 20.9l1.6 1.63c2.09-1.66 4.95-3.57 8.35-5.3 2.76 1.34 5.37 2.27 7.54 2.77l1.68-2.12c-.67-.22-1.42-.51-2.22-.92l2.22-1.78z" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-[#1677ff]">支付宝</span>
                <span className="text-[9px] text-[#1677ff]/80 font-medium">-¥2.50</span>
              </button>

              {/* 银联卡 */}
              <button
                type="button"
                id="sheet-pay-unionpay"
                onClick={() => handleSelectChannel('unionpay')}
                className={`pay-option p-2 flex flex-col items-center justify-center gap-1 transition-all relative cursor-pointer subtle-rounded ${
                  selectedChannelKey === 'unionpay'
                    ? paymentChannels.unionpay.activeBorder
                    : paymentChannels.unionpay.border
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-[#e60012] flex items-center justify-center shadow-xs">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <rect height="14" rx="2" width="20" x="2" y="5" />
                    <line x1="2" x2="22" y1="10" y2="10" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-[#b51221]">银联卡</span>
                <span className="text-[9px] text-[#b51221]/80 font-medium">-¥2.00</span>
              </button>

              {/* 企业餐补 */}
              <button
                type="button"
                id="sheet-pay-corp"
                onClick={() => handleSelectChannel('corp')}
                className={`pay-option p-2 flex flex-col items-center justify-center gap-1 transition-all relative cursor-pointer subtle-rounded ${
                  selectedChannelKey === 'corp'
                    ? paymentChannels.corp.activeBorder
                    : paymentChannels.corp.border
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-[#d97706] flex items-center justify-center shadow-xs">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-[#b45309]">企业餐补</span>
                <span className="text-[9px] text-[#b45309]/80 font-medium">-¥5.00</span>
              </button>
            </div>

            {/* 选中渠道与立减说明 */}
            <div className="p-2.5 bg-[#F9F9F7] rounded border border-[#F0F0EE] flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-[#7E7E7A]">
                <span>已选方式:</span>
                <span className="font-semibold text-[#1A1C1B]">{channelName}</span>
                {channelDiscount > 0 && (
                  <span className="text-[10px] text-[#006D36] bg-[#EBF7EF] px-1.5 py-0.5 rounded font-medium">
                    立减¥{channelDiscount.toFixed(2)}
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-[#7E7E7A] text-[11px]">实付 </span>
                <span className="text-sm font-black text-[#1A1C1B]">¥{finalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* 确认支付由底部固定栏「确认支付」按钮统一承担（避免双重按钮） */}
          </div>
        </div>

        {/* Sticky Fixed Bottom Bar */}
        <footer className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-[#E8E8E6] px-4 py-3">
          <div className="max-w-[420px] mx-auto flex items-center justify-between gap-3">
            {/* 价格与明细快捷展开 */}
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[10px] text-[#7E7E7A] tracking-tight uppercase">实付</span>
                <span className="text-xl font-black text-[#1A1C1B] tracking-tight leading-none">
                  <span className="text-xs font-semibold">¥</span>
                  <span id="final-payable-amount">{finalAmount.toFixed(2)}</span>
                </span>
              </div>
              <button
                type="button"
                id="btn-open-cost-sheet"
                onClick={() => {
                  setIsCostSheetOpen(!isCostSheetOpen);
                  setIsPaymentSheetOpen(false);
                }}
                className="text-[11px] text-[#7E7E7A] hover:text-[#1A1C1B] flex items-center gap-0.5 mt-0.5 text-left cursor-pointer group"
              >
                <span className="group-hover:text-[#1A1C1B] transition-colors">
                  省¥<span id="total-savings">{totalSaved.toFixed(2)}</span> · 明细
                </span>
                <ChevronDown
                  id="footer-detail-arrow"
                  className={`w-3 h-3 text-[#9E9E98] transition-transform duration-200 ${
                    isCostSheetOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>

            {/* 药丸型高反差主操作按钮 */}
            <button
              type="button"
              id="btn-confirm-pay"
              onClick={handleClickSafePay}
              disabled={totalQuantity === 0}
              className={`flex-1 max-w-[200px] h-11 bg-[#1A1C1B] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] transition-all hover:bg-black subtle-rounded cursor-pointer ${
                totalQuantity === 0 ? 'opacity-40 pointer-events-none' : ''
              }`}
            >
              <Lock className="w-3.5 h-3.5 text-white/90" />
              <span>
                {isPaymentSheetOpen ? '确认支付' : '安全支付'} ¥<span id="btn-pay-price">{finalAmount.toFixed(2)}</span>
              </span>
            </button>
          </div>
        </footer>
        {/* END: Minimalist Sticky Bottom Bar */}

        {/* 堂食扫码选桌弹窗 */}
        <TableBindModal
          isOpen={isTableBindModalOpen}
          onClose={() => setIsTableBindModalOpen(false)}
          currentBoundTable={boundTable}
          onConfirmBind={(table) => {
            setBoundTable(table);
            setIsTableBindModalOpen(false);
            toast.success('桌台关联成功', `已绑定【${table.code} 号桌】，后厨将精准送餐`);
          }}
        />

        {/* 确认安全收银台 (Cashier Modal) */}
        <PaymentConfirmCashierModal
          isOpen={isCashierModalOpen}
          onClose={() => setIsCashierModalOpen(false)}
          orderNo={`UR-${Math.floor(1000 + Math.random() * 9000)}`}
          items={items}
          subtotal={subtotal}
          discountAmount={totalSaved}
          deliveryFee={activeDeliveryFee}
          finalAmount={finalAmount}
          diningMode={diningMode}
          deliveryAddress={deliveryAddress}
          tableCode={boundTable?.code}
          initialChannel={
            selectedChannelKey === 'wx'
              ? 'wechat'
              : selectedChannelKey === 'alipay'
              ? 'alipay'
              : selectedChannelKey === 'unionpay'
              ? 'card'
              : 'enterprise'
          }
          onPaymentSuccess={handleCashierSuccess}
          onViewVoucherRequest={(voucher) => {
            setCompletedVoucher(voucher);
            setIsCashierModalOpen(false);
            setIsVoucherModalOpen(true);
          }}
        />
      </div>
    </div>
  );
};
