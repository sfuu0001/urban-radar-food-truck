import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  UtensilsCrossed,
  ShoppingBag,
  ClipboardList,
  User,
  SlidersHorizontal,
  Bike,
  Flame,
  CheckCircle2,
  ChevronRight,
  MessageSquareText
} from 'lucide-react';
import { motion } from 'motion/react';
import { DiningMode } from './DiningModeSelector';
import { UserRole } from './RoleSwitcherDropdown';
import { Order } from '../types';
import { UnifiedNavDrawer } from './UnifiedNavDrawer';
import { useFlyingCart } from '../utils/FlyingCartContext';
import {
  TruckExpandConfig,
  getTruckExpandConfig,
  subscribeTruckExpandConfig
} from '../utils/truckExpandSettings';
import {
  subscribeOrderChat,
  getUnreadCountForRole
} from '../utils/chatHub';

export type NavTabType = 'home' | 'orders' | 'tracking' | 'profile' | 'checkout' | 'coupons' | 'cart' | 'order_messages';

interface BottomNavBarProps {
  activeTab: NavTabType;
  onSelectTab: (tab: NavTabType) => void;
  cartCount: number;
  cartTotal: number;
  onOpenCart: () => void;
  diningMode: DiningMode;
  onDiningModeChange: (mode: DiningMode) => void;
  orders?: Order[];
  onOpenOrders?: () => void;
  isVIPActive?: boolean;
  onOpenVIP?: () => void;
  deliveryAddress?: string;
  onChangeAddress?: () => void;
  currentRole?: UserRole;
  onSelectRole?: (role: UserRole) => void;
  pendingOrdersCount?: number;
  onOpenCloudbase?: () => void;
  isPullUpMenuOpen?: boolean;
  onOpenPullUpMenu?: () => void;
  onOpenMessageHub?: () => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onSelectTab,
  cartCount,
  cartTotal,
  onOpenCart,
  diningMode,
  onDiningModeChange,
  orders = [],
  onOpenOrders = () => {},
  isVIPActive = false,
  onOpenVIP = () => {},
  deliveryAddress = '北京市朝阳区大悦城北座中庭',
  onChangeAddress = () => {},
  currentRole = 'customer',
  onSelectRole = () => {},
  pendingOrdersCount = 3,
  onOpenCloudbase,
  isPullUpMenuOpen = false,
  onOpenPullUpMenu,
  onOpenMessageHub
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isOpeningMenu2s, setIsOpeningMenu2s] = useState(false);
  const [countdownProgress, setCountdownProgress] = useState(0);
  const [truckExpandConfig, setTruckExpandConfig] = useState<TruckExpandConfig>(() => getTruckExpandConfig());
  const twoSecTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const cartBtnRef = useRef<HTMLButtonElement | null>(null);
  const { registerCartTarget, badgeBounce } = useFlyingCart();
  const [chatTick, setChatTick] = useState(0);

  // Subscribe to real-time chat updates to refresh unread badges
  useEffect(() => {
    const unsub = subscribeOrderChat(undefined, () => {
      setChatTick((t) => t + 1);
    });
    return () => unsub();
  }, []);

  const totalUnreadMessages = useMemo(() => {
    const normalizedRole = currentRole === 'rider' ? 'rider' : currentRole === 'merchant' ? 'merchant' : 'user';
    return orders.reduce((acc, ord) => {
      const ordNo = (ord.orderNo || '').replace(/^#/, '');
      if (!ordNo) return acc;
      return acc + getUnreadCountForRole(ordNo, normalizedRole);
    }, 0);
  }, [orders, currentRole, chatTick]);

  // Subscribe to merchant configuration updates
  useEffect(() => {
    const unsub = subscribeTruckExpandConfig((cfg) => {
      setTruckExpandConfig(cfg);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (cartBtnRef.current) {
      registerCartTarget(cartBtnRef.current);
    }
  }, [registerCartTarget]);

  // Handle Tab 1 (点单按钮) Click: 根据商家后台策略（直接展开 / 倒计时展开 / 不展开）执行
  const handleOrderTabClick = () => {
    onSelectTab('home');

    // If pull up menu is already open, clicking can toggle it or keep it open
    if (isPullUpMenuOpen) {
      if (onOpenPullUpMenu) onOpenPullUpMenu();
      return;
    }

    // Clear any previous timer
    if (twoSecTimerRef.current) {
      clearTimeout(twoSecTimerRef.current);
      twoSecTimerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    // 1. 如果商家后台设置为“直接展开 (immediate)”或“纯手动模式 (disabled)”下点击
    if (truckExpandConfig.mode === 'immediate' || truckExpandConfig.mode === 'disabled' || !truckExpandConfig.enableOnTabClick) {
      if (truckExpandConfig.hapticFeedback && typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(40);
        } catch {}
      }
      if (onOpenPullUpMenu) onOpenPullUpMenu();
      return;
    }

    // 2. 如果商家后台设置为“倒计时自动展开 (countdown)”
    const duration = Math.max(500, (truckExpandConfig.delaySeconds || 2) * 1000);
    setIsOpeningMenu2s(true);
    setCountdownProgress(0);

    const startTime = Date.now();

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setCountdownProgress(pct);
      if (pct >= 100 && progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }, 35);

    twoSecTimerRef.current = setTimeout(() => {
      setIsOpeningMenu2s(false);
      setCountdownProgress(0);
      if (truckExpandConfig.hapticFeedback && typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(40);
        } catch {}
      }
      if (onOpenPullUpMenu) {
        onOpenPullUpMenu();
      }
      twoSecTimerRef.current = null;
    }, duration);
  };

  const handleTouchStart = () => {
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(50);
        } catch {
          // ignore
        }
      }
      if (onOpenPullUpMenu) {
        onOpenPullUpMenu();
      } else {
        setIsDrawerOpen(true);
      }
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      if (twoSecTimerRef.current) clearTimeout(twoSecTimerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  // Dynamically find primary active order directly from live synchronized orders prop
  const deliveringOrders = orders.filter((o) => o.status === 'delivering');
  const cookingOrders = orders.filter((o) => o.status === 'cooking');
  const completedOrders = orders.filter((o) => o.status === 'completed');
  const activeOrders = [...deliveringOrders, ...cookingOrders];

  const primaryActiveOrder =
    deliveringOrders.length > 0
      ? deliveringOrders[0]
      : cookingOrders.length > 0
      ? cookingOrders[0]
      : completedOrders.length > 0
      ? completedOrders[0]
      : orders[0] || null;

  const isDelivering = primaryActiveOrder?.status === 'delivering';
  const isCooking = primaryActiveOrder?.status === 'cooking';
  const isCompleted = primaryActiveOrder?.status === 'completed';

  const activeStatusText = isDelivering
    ? (primaryActiveOrder?.statusText || '配送中')
    : isCooking
    ? (primaryActiveOrder?.statusText || '制作中')
    : isCompleted
    ? '已送达'
    : '就绪';

  const activeTimeText = primaryActiveOrder?.estimatedDeliveryTime
    ? `约${primaryActiveOrder.estimatedDeliveryTime.replace('约', '').replace('后', '').trim()}`
    : isDelivering
    ? (primaryActiveOrder?.etaMinutes ? `${primaryActiveOrder.etaMinutes}分钟` : '12:55')
    : isCooking
    ? (primaryActiveOrder?.etaMinutes ? `${primaryActiveOrder.etaMinutes}分钟` : '12分钟')
    : '已妥投';

  return (
    <>
      <footer 
        id="bottom-navbar-outer-wrapper"
        className="w-full shrink-0 z-30 flex flex-col items-center bg-white border-t border-[#e2e3e1] shadow-[0_-2px_12px_rgba(0,0,0,0.04)] py-1.5 px-2.5 relative select-none"
      >
        {/* Modern Pill Dock Navigation Bar (Clean White Theme - Docked in Page Flow, Non-Floating) */}
        <nav 
          id="bottom-main-dock-nav"
          style={{
            paddingTop: '4px',
            paddingBottom: '3px',
            paddingLeft: '4px',
            paddingRight: '4px',
          }}
          className="w-full max-w-md bg-white border border-[#D3D1CB] shadow-[0_2px_10px_rgba(0,0,0,0.06)] rounded-none flex items-center justify-between pointer-events-auto relative transition-all duration-300"
        >
          
          {/* Tab 1: 点单 / Menu Icon */}
          <div className="relative flex items-center justify-center">
            <motion.button
              id="bottom-nav-order-tab"
              whileHover={{ scale: activeTab === 'home' ? 1.05 : 1.1 }}
              whileTap={{ scale: 0.88 }}
              onClick={handleOrderTabClick}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleTouchStart}
              onMouseUp={handleTouchEnd}
              onMouseLeave={handleTouchEnd}
              onContextMenu={(e) => {
                e.preventDefault();
                if (onOpenPullUpMenu) onOpenPullUpMenu();
                else setIsDrawerOpen(true);
              }}
              title={
                truckExpandConfig.mode === 'immediate'
                  ? '点单 (点击直接展开餐车菜单)'
                  : truckExpandConfig.mode === 'disabled'
                  ? '点单 (点击切换首页/展开餐车)'
                  : `点单 (点击${truckExpandConfig.delaySeconds.toFixed(1)}秒后展开餐车菜单，长按直接打开)`
              }
              className={`relative flex items-center justify-center w-10 h-10 rounded-none transition-colors cursor-pointer select-none ${
                activeTab === 'home'
                  ? 'bg-neutral-200 text-neutral-900 font-medium shadow-2xs border border-neutral-300/60'
                  : 'text-neutral-500 hover:text-black hover:bg-neutral-100'
              }`}
            >
              <UtensilsCrossed
                className={`w-4.5 h-4.5 transition-transform ${
                  activeTab === 'home' ? 'stroke-[2.2] text-neutral-900' : 'stroke-[1.8]'
                }`}
              />
            </motion.button>
          </div>

          {/* Tab 2: 购物车 / Cart Icon */}
          <motion.button
            ref={cartBtnRef}
            id="bottom-nav-cart-tab"
            data-cart-target="true"
            whileHover={{ scale: activeTab === 'cart' ? 1.05 : 1.1 }}
            whileTap={{ scale: 0.88 }}
            onClick={onOpenCart}
            title={cartCount > 0 ? `选购清单 (¥${cartTotal.toFixed(2)})` : '选购清单'}
            className={`relative flex items-center justify-center min-w-[40px] h-10 px-1.5 rounded-none transition-colors cursor-pointer select-none group ${
              activeTab === 'cart'
                ? 'bg-neutral-200 text-neutral-900 font-medium shadow-2xs border border-neutral-300/60'
                : 'text-neutral-500 hover:text-black hover:bg-neutral-100'
            }`}
          >
            <motion.div
              animate={badgeBounce ? { scale: [1, 1.4, 0.85, 1.15, 1], y: [0, -5, 2, 0] } : { scale: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="relative flex items-center justify-center gap-1"
            >
              <div className="relative flex items-center justify-center">
                <ShoppingBag
                  className={`w-4.5 h-4.5 transition-transform ${
                    activeTab === 'cart' ? 'stroke-[2.2] text-neutral-900' : 'stroke-[1.8] group-hover:scale-105'
                  }`}
                />
                {cartCount > 0 && (
                  <motion.span
                    key={cartCount}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute -top-1.5 -right-2 bg-black text-white text-[9.5px] font-black min-w-[15px] h-[15px] px-0.5 rounded-full flex items-center justify-center border-2 border-white shadow-sm leading-none"
                  >
                    {cartCount > 99 ? '99+' : cartCount}
                  </motion.span>
                )}
              </div>

              {/* 当购物车有商品时显示总选购金额 */}
              {cartCount > 0 && cartTotal > 0 && activeTab !== 'cart' && (
                <motion.span
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-[11px] font-black text-black font-mono tracking-tight whitespace-nowrap pl-0.5"
                >
                  ¥{cartTotal.toFixed(0)}
                </motion.span>
              )}
            </motion.div>
          </motion.button>

          {/* Tab: 消息聚合中心 / Message Aggregation Hub */}
          <motion.button
            id="bottom-nav-messages-tab"
            whileHover={{ scale: activeTab === 'order_messages' ? 1.05 : 1.1 }}
            whileTap={{ scale: 0.88 }}
            onClick={() => {
              if (onOpenMessageHub) {
                onOpenMessageHub();
              }
              onSelectTab('order_messages');
            }}
            title={totalUnreadMessages > 0 ? `消息中心聚合 (${totalUnreadMessages}条未读)` : '消息中心聚合'}
            className={`relative flex items-center justify-center w-10 h-10 rounded-none transition-colors cursor-pointer select-none group ${
              activeTab === 'order_messages'
                ? 'bg-neutral-200 text-neutral-900 font-medium shadow-2xs border border-neutral-300/60'
                : 'text-neutral-500 hover:text-black hover:bg-neutral-100'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <MessageSquareText
                className={`w-4.5 h-4.5 transition-transform ${
                  activeTab === 'order_messages' ? 'stroke-[2.2] text-neutral-900' : 'stroke-[1.8] group-hover:scale-105'
                }`}
              />
              {totalUnreadMessages > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[8.5px] font-black min-w-[15px] h-[15px] px-0.5 rounded-full flex items-center justify-center border-2 border-white shadow-sm leading-none animate-pulse">
                  {totalUnreadMessages > 99 ? '99+' : totalUnreadMessages}
                </span>
              )}
            </div>
          </motion.button>

          {/* Center Hub / Service Drawer Floating Action Button */}
          <motion.button
            id="bottom-nav-drawer-center-trigger"
            whileHover={{ scale: 1.1, rotate: 6 }}
            whileTap={{ scale: 0.88 }}
            onClick={() => setIsDrawerOpen(true)}
            title="黑曜石综合服务"
            className="relative flex items-center justify-center w-11 h-11 -my-1.5 rounded-none bg-[#1A1A17] text-white border border-neutral-700/60 shadow-[0_4px_14px_rgba(0,0,0,0.25)] hover:border-neutral-500 hover:shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition-all cursor-pointer select-none group"
          >
            <div className="absolute inset-0 rounded-none bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <SlidersHorizontal className="w-4.5 h-4.5 stroke-[2] group-hover:rotate-45 transition-transform duration-300" />
          </motion.button>

          {/* Tab 3: 订单 / Orders Icon */}
          <div className="relative flex items-center justify-center">
            <motion.button
              id="bottom-nav-orders-tab"
              whileHover={{ scale: activeTab === 'orders' ? 1.05 : 1.1 }}
              whileTap={{ scale: 0.88 }}
              onClick={() => onSelectTab('orders')}
              title={activeOrders.length > 0 ? `历史与进行中订单 (${activeOrders.length}笔进行中)` : '历史与进行中订单'}
              className={`relative flex items-center justify-center w-10 h-10 rounded-none transition-colors cursor-pointer select-none ${
                activeTab === 'orders'
                  ? 'bg-neutral-200 text-neutral-900 font-medium shadow-2xs border border-neutral-300/60'
                  : 'text-neutral-500 hover:text-black hover:bg-neutral-100'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <ClipboardList
                  className={`w-4.5 h-4.5 transition-transform ${
                    activeTab === 'orders' ? 'stroke-[2.2] text-neutral-900' : 'stroke-[1.8]'
                  }`}
                />
                {/* 当有进行中的订单时显示订单数量 */}
                {activeOrders.length > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-amber-500 text-white text-[8.5px] font-black min-w-[15px] h-[15px] px-0.5 rounded-full flex items-center justify-center border-2 border-white shadow-sm leading-none animate-pulse">
                    {activeOrders.length}
                  </span>
                )}
              </div>
            </motion.button>
          </div>

          {/* Tab 4: 个人中心 / Profile Icon */}
          <motion.button
            id="bottom-nav-profile-tab"
            whileHover={{ scale: activeTab === 'profile' ? 1.05 : 1.1 }}
            whileTap={{ scale: 0.88 }}
            onClick={() => onSelectTab('profile')}
            title="会员中心"
            className={`relative flex items-center justify-center w-10 h-10 rounded-none transition-colors cursor-pointer select-none ${
              activeTab === 'profile'
                ? 'bg-neutral-200 text-neutral-900 font-medium shadow-2xs border border-neutral-300/60'
                : 'text-neutral-500 hover:text-black hover:bg-neutral-100'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <User
                className={`w-4.5 h-4.5 transition-transform ${
                  activeTab === 'profile' ? 'stroke-[2.2] text-neutral-900' : 'stroke-[1.8]'
                }`}
              />
              {isVIPActive && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 border-2 border-white" />
              )}
            </div>
          </motion.button>
        </nav>
      </footer>

      {/* Unified Nav Drawer Component */}
      <UnifiedNavDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        diningMode={diningMode}
        onDiningModeChange={onDiningModeChange}
        cartCount={cartCount}
        cartTotal={cartTotal}
        onOpenCart={onOpenCart}
        orders={orders}
        onOpenOrders={onOpenOrders}
        isVIPActive={isVIPActive}
        onOpenVIP={onOpenVIP}
        deliveryAddress={deliveryAddress}
        onChangeAddress={onChangeAddress}
        onOpenCoupons={() => onSelectTab('coupons')}
        currentRole={currentRole}
        onSelectRole={onSelectRole}
        pendingOrdersCount={pendingOrdersCount}
        onNavigateHome={() => onSelectTab('home')}
        onOpenCloudbase={onOpenCloudbase}
      />
    </>
  );
};
