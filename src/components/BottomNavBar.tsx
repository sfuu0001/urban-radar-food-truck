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
import { BottomCartBar } from './BottomCartBar';

export type NavTabType = 'home' | 'orders' | 'tracking' | 'profile' | 'checkout' | 'coupons' | 'cart' | 'order_messages';

interface BottomNavBarProps {
  activeTab: NavTabType;
  onSelectTab: (tab: NavTabType) => void;
  cartCount: number;
  cartTotal: number;
  cartSavings?: number;
  onOpenCart: () => void;
  onProceedToCheckout?: () => void;
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
  cartSavings,
  onOpenCart,
  onProceedToCheckout,
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
  const cartBtnRef = useRef<HTMLDivElement | null>(null);
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
        className="w-full shrink-0 z-30 flex flex-col bg-paper-card border-t-2 border-pitch select-none"
      >
        {/* New Shopping Cart Component directly above the 5-tab Navigation Bar (Faithfully matching image.png) */}
        {(activeTab === 'home' || cartCount > 0) && (
          <BottomCartBar
            cartCount={cartCount}
            cartTotal={cartTotal}
            cartSavings={cartSavings}
            onOpenCart={onOpenCart}
            onProceedToCheckout={onProceedToCheckout}
            cartTargetRef={cartBtnRef}
          />
        )}

        {/* Bottom Industrial Navigation Bar: 5 Equal Columns */}
        <div
          id="bottom-main-dock-nav"
          className="grid grid-cols-5 bg-paper-card pt-0 pb-[2px] px-0 h-[48px] text-center font-mono text-[9px] text-stone-500 border-t border-line"
        >
          {/* Tab 1: 点餐 */}
          <button
            type="button"
            id="bottom-nav-order-tab"
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
            className={`flex flex-col items-center justify-center py-1 relative group cursor-pointer transition-colors ${
              activeTab === 'home'
                ? 'text-pitch border-b-2 border-pitch bg-techTag/30 font-bold'
                : 'text-stone-500 hover:text-pitch'
            }`}
          >
            <div className="w-5 h-5 flex items-center justify-center relative">
              <UtensilsCrossed
                className={`w-4 h-4 transition-all duration-200 group-hover:scale-110 group-active:scale-95 ${
                  activeTab === 'home'
                    ? 'text-pitch stroke-[2.2] scale-105'
                    : 'text-stone-600 stroke-[1.6]'
                }`}
              />
            </div>
            <span className={`mt-0.5 tracking-tight text-[9px] ${activeTab === 'home' ? 'font-bold text-pitch' : 'font-medium'}`}>
              点餐
            </span>
          </button>

          {/* Tab 2: 专送 */}
          <button
            type="button"
            id="bottom-nav-tracking-tab"
            onClick={() => onSelectTab('tracking')}
            className={`flex flex-col items-center justify-center py-1 relative group cursor-pointer transition-colors ${
              activeTab === 'tracking'
                ? 'text-pitch border-b-2 border-pitch bg-techTag/30 font-bold'
                : 'text-stone-500 hover:text-pitch'
            }`}
          >
            <div className="w-5 h-5 flex items-center justify-center relative">
              <Bike
                className={`w-4 h-4 transition-all duration-200 group-hover:scale-110 group-active:scale-95 ${
                  activeTab === 'tracking'
                    ? 'text-pitch stroke-[2.2] scale-105'
                    : 'text-stone-600 stroke-[1.6]'
                }`}
              />
            </div>
            <span className={`mt-0.5 tracking-tight text-[9px] ${activeTab === 'tracking' ? 'font-bold text-pitch' : 'font-medium'}`}>
              专送
            </span>
          </button>

          {/* Tab 3: 动态 / 联络室 */}
          <button
            type="button"
            id="bottom-nav-messages-tab"
            onClick={() => {
              if (onOpenMessageHub) {
                onOpenMessageHub();
              }
              onSelectTab('order_messages');
            }}
            title={totalUnreadMessages > 0 ? `消息中心 (${totalUnreadMessages}条未读)` : '消息中心'}
            className={`flex flex-col items-center justify-center py-1 relative group cursor-pointer transition-colors ${
              activeTab === 'order_messages'
                ? 'text-pitch border-b-2 border-pitch bg-techTag/30 font-bold'
                : 'text-stone-500 hover:text-pitch'
            }`}
          >
            <div className="w-5 h-5 flex items-center justify-center relative">
              <MessageSquareText
                className={`w-4 h-4 transition-all duration-200 group-hover:scale-110 group-active:scale-95 ${
                  activeTab === 'order_messages'
                    ? 'text-pitch stroke-[2.2] scale-105'
                    : 'text-stone-600 stroke-[1.6]'
                }`}
              />
              {totalUnreadMessages > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[13px] h-[13px] px-0.5 bg-red-600 text-white text-[7.5px] font-bold font-mono rounded-full border border-white flex items-center justify-center animate-pulse shadow-xs">
                  {totalUnreadMessages > 9 ? '9+' : totalUnreadMessages}
                </span>
              )}
            </div>
            <span className={`mt-0.5 tracking-tight text-[9px] ${activeTab === 'order_messages' ? 'font-bold text-pitch' : 'font-medium'}`}>
              动态
            </span>
          </button>

          {/* Tab 4: 工单 / 订单 */}
          <button
            type="button"
            id="bottom-nav-orders-tab"
            onClick={() => onSelectTab('orders')}
            title={activeOrders.length > 0 ? `历史与工单 (${activeOrders.length}笔在制)` : '工单'}
            className={`flex flex-col items-center justify-center py-1 relative group cursor-pointer transition-colors ${
              activeTab === 'orders'
                ? 'text-pitch border-b-2 border-pitch bg-techTag/30 font-bold'
                : 'text-stone-500 hover:text-pitch'
            }`}
          >
            <div className="w-5 h-5 flex items-center justify-center relative">
              <ClipboardList
                className={`w-4 h-4 transition-all duration-200 group-hover:scale-110 group-active:scale-95 ${
                  activeTab === 'orders'
                    ? 'text-pitch stroke-[2.2] scale-105'
                    : 'text-stone-600 stroke-[1.6]'
                }`}
              />
              {activeOrders.length > 0 && (
                <span className="absolute -top-1 -right-1.5 bg-amber-500 text-white text-[7.5px] font-bold font-mono px-1 py-0 rounded-[1px] leading-tight shadow-xs border border-white">
                  {activeOrders.length}
                </span>
              )}
            </div>
            <span className={`mt-0.5 tracking-tight text-[9px] ${activeTab === 'orders' ? 'font-bold text-pitch' : 'font-medium'}`}>
              工单
            </span>
          </button>

          {/* Tab 5: 工匠档案 / 个人中心 */}
          <button
            type="button"
            id="bottom-nav-profile-tab"
            onClick={() => onSelectTab('profile')}
            title="工匠档案与会员中心"
            className={`flex flex-col items-center justify-center py-1 relative group cursor-pointer transition-colors ${
              activeTab === 'profile'
                ? 'text-pitch border-b-2 border-pitch bg-techTag/30 font-bold'
                : 'text-stone-500 hover:text-pitch'
            }`}
          >
            <div className="w-5 h-5 flex items-center justify-center relative">
              <User
                className={`w-4 h-4 transition-all duration-200 group-hover:scale-110 group-active:scale-95 ${
                  activeTab === 'profile'
                    ? 'text-pitch stroke-[2.2] scale-105'
                    : 'text-stone-600 stroke-[1.6]'
                }`}
              />
              {isVIPActive && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500 border border-white" title="VIP已激活" />
              )}
            </div>
            <span className={`mt-0.5 tracking-tight text-[9px] ${activeTab === 'profile' ? 'font-bold text-pitch' : 'font-medium'}`}>
              工匠档案
            </span>
          </button>
        </div>
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
