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
          className="grid grid-cols-5 bg-paper-card pt-0 pb-[2px] px-0 h-[45.9px] text-center font-mono text-[9px] text-stone-500 border-t border-line"
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
            className={`flex flex-col items-center py-1 relative group cursor-pointer transition-colors ${
              activeTab === 'home'
                ? 'text-pitch border-b-2 border-pitch bg-techTag/30 font-bold'
                : 'text-stone-500 hover:text-pitch'
            }`}
          >
            <div className="w-5 h-5 flex items-center justify-center relative">
              <svg
                className={`w-4 h-4 ${activeTab === 'home' ? 'text-pitch' : 'text-stone-700'}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="square"
                strokeLinejoin="miter"
                viewBox="0 0 24 24"
              >
                <path d="M18 2L6 14l-2 6 6-2L22 6l-4-4z" strokeDasharray="20" strokeDashoffset="0"></path>
                <line x1="15" y1="5" x2="19" y2="9"></line>
                <line x1="4" y1="20" x2="8" y2="16" strokeDasharray="1 1"></line>
              </svg>
              <span className="absolute -top-0.5 -right-0.5 text-[6px] text-stone-400 font-mono">+</span>
            </div>
            <span className="mt-0.5 font-bold tracking-tight text-[9px]">点餐</span>
          </button>

          {/* Tab 2: 专送 */}
          <button
            type="button"
            id="bottom-nav-tracking-tab"
            onClick={() => onSelectTab('tracking')}
            className={`flex flex-col items-center py-1 relative group cursor-pointer transition-colors ${
              activeTab === 'tracking'
                ? 'text-pitch border-b-2 border-pitch bg-techTag/30 font-bold'
                : 'text-stone-500 hover:text-pitch'
            }`}
          >
            <div className="w-5 h-5 flex items-center justify-center relative">
              <svg
                className={`w-4 h-4 ${activeTab === 'tracking' ? 'text-pitch' : 'text-stone-700'}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="square"
                strokeLinejoin="miter"
                viewBox="0 0 24 24"
              >
                <path d="M13 2L4 14h7l-2 8 11-12h-7l2-8z"></path>
                <line x1="2" y1="14" x2="4" y2="14" strokeDasharray="1 1"></line>
                <line x1="20" y1="10" x2="22" y2="10" strokeDasharray="1 1"></line>
              </svg>
            </div>
            <span className="mt-0.5 tracking-tight text-[9px]">专送</span>
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
            className={`flex flex-col items-center py-1 relative group cursor-pointer transition-colors ${
              activeTab === 'order_messages'
                ? 'text-pitch border-b-2 border-pitch bg-techTag/30 font-bold'
                : 'text-stone-500 hover:text-pitch'
            }`}
          >
            <div className="w-5 h-5 flex items-center justify-center relative">
              <svg
                className={`w-4 h-4 ${activeTab === 'order_messages' ? 'text-pitch' : 'text-stone-700'}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="square"
                strokeLinejoin="miter"
                viewBox="0 0 24 24"
              >
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                <line x1="8" y1="12" x2="16" y2="12" strokeDasharray="2 2"></line>
              </svg>
              {totalUnreadMessages > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-600 rounded-full border border-white animate-pulse" />
              )}
            </div>
            <span className="mt-0.5 tracking-tight text-[9px]">动态</span>
          </button>

          {/* Tab 4: 工单 / 订单 */}
          <button
            type="button"
            id="bottom-nav-orders-tab"
            onClick={() => onSelectTab('orders')}
            title={activeOrders.length > 0 ? `历史与工单 (${activeOrders.length}笔在制)` : '工单'}
            className={`flex flex-col items-center py-1 relative group cursor-pointer transition-colors ${
              activeTab === 'orders'
                ? 'text-pitch border-b-2 border-pitch bg-techTag/30 font-bold'
                : 'text-stone-500 hover:text-pitch'
            }`}
          >
            <div className="w-5 h-5 flex items-center justify-center relative">
              <svg
                className={`w-4 h-4 ${activeTab === 'orders' ? 'text-pitch' : 'text-stone-700'}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="square"
                strokeLinejoin="miter"
                viewBox="0 0 24 24"
              >
                <rect x="5" y="4" width="14" height="18" strokeDasharray="20"></rect>
                <path d="M9 4V2h6v2"></path>
                <line x1="8" y1="9" x2="16" y2="9" strokeDasharray="1 1"></line>
                <line x1="8" y1="13" x2="16" y2="13" strokeDasharray="1 1"></line>
                <line x1="8" y1="17" x2="13" y2="17" strokeDasharray="1 1"></line>
              </svg>
              {activeOrders.length > 0 && (
                <span className="absolute -top-0.5 -right-1 bg-amber-500 text-white text-[7px] px-1 font-bold">
                  {activeOrders.length}
                </span>
              )}
            </div>
            <span className="mt-0.5 tracking-tight text-[9px]">工单</span>
          </button>

          {/* Tab 5: 工匠档案 / 个人中心 */}
          <button
            type="button"
            id="bottom-nav-profile-tab"
            onClick={() => onSelectTab('profile')}
            title="工匠档案与会员中心"
            className={`flex flex-col items-center py-1 relative group cursor-pointer transition-colors ${
              activeTab === 'profile'
                ? 'text-pitch border-b-2 border-pitch bg-techTag/30 font-bold'
                : 'text-stone-500 hover:text-pitch'
            }`}
          >
            <div className="w-5 h-5 flex items-center justify-center relative">
              <svg
                className={`w-4 h-4 ${activeTab === 'profile' ? 'text-pitch' : 'text-stone-700'}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="square"
                strokeLinejoin="miter"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="7" r="4"></circle>
                <path d="M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2"></path>
                <line x1="10" y1="18" x2="14" y2="18" strokeDasharray="1 1"></line>
              </svg>
              {isVIPActive && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500 border border-white" />
              )}
            </div>
            <span className="mt-0.5 tracking-tight text-[9px]">工匠档案</span>
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
