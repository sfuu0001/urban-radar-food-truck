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
  MessageSquareText,
  Truck,
  Lock,
  Unlock,
  ShieldCheck,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
import { safeGetStorage, safeSetStorage } from '../utils/safeStorage';

export type NavTabType = 'home' | 'orders' | 'tracking' | 'profile' | 'checkout' | 'coupons' | 'cart' | 'order_messages' | 'trucks';

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

  // 防误触锁定状态：设计为“整栏全覆盖状态样式”
  const [isNavLocked, setIsNavLocked] = useState<boolean>(() => {
    return safeGetStorage<boolean>('obsidian_bottom_nav_locked', false);
  });
  // 提示用户轻触或滑动解锁的脉冲动效
  const [showLockPrompt, setShowLockPrompt] = useState(false);
  const lockPromptTimerRef = useRef<NodeJS.Timeout | null>(null);

  const toggleNavLock = (locked: boolean) => {
    setIsNavLocked(locked);
    safeSetStorage('obsidian_bottom_nav_locked', locked);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(30);
      } catch {}
    }
  };

  const handleLockedBarClick = () => {
    setShowLockPrompt(true);
    if (lockPromptTimerRef.current) clearTimeout(lockPromptTimerRef.current);
    lockPromptTimerRef.current = setTimeout(() => {
      setShowLockPrompt(false);
    }, 1800);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([20, 30, 20]);
      } catch {}
    }
  };

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
    if (isNavLocked) {
      handleLockedBarClick();
      return;
    }
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
    if (isNavLocked) return;
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
      if (lockPromptTimerRef.current) clearTimeout(lockPromptTimerRef.current);
    };
  }, []);

  // Dynamically find primary active order directly from live synchronized orders prop
  const deliveringOrders = orders.filter((o) => o.status === 'delivering');
  const cookingOrders = orders.filter((o) => o.status === 'cooking');
  const completedOrders = orders.filter((o) => o.status === 'completed');
  const activeOrders = [...deliveringOrders, ...cookingOrders];

  return (
    <>
      {/* 平行常驻底栏总座 (Fixed Parallel Docking Footer) */}
      <footer
        id="bottom-navbar-outer-wrapper"
        className="w-full shrink-0 z-40 flex flex-col bg-white select-none border-t border-[#D5D8DC]"
      >
        {/* 上层平行常驻：购物车结算条 (仅在点餐主界面且购物车非空时呈现，实时订单全屏等界面下隐藏，保留纯净底栏导航) */}
        {activeTab === 'home' && cartCount > 0 && (
          <BottomCartBar
            cartCount={cartCount}
            cartTotal={cartTotal}
            cartSavings={cartSavings}
            onOpenCart={onOpenCart}
            onProceedToCheckout={onProceedToCheckout}
            cartTargetRef={cartBtnRef}
          />
        )}

        {/* 下层平行常驻：系统主导航栏（带有整栏全覆盖防误触锁定状态） */}
        <div
          id="bottom-main-dock-nav"
          className="relative flex justify-around items-center h-[54px] px-1 text-center bg-white border-t border-[#E8EAEE] w-full max-w-xl mx-auto overflow-hidden"
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
            className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors ${
              activeTab === 'home' ? 'text-[#111]' : 'text-gray-400 hover:text-black'
            }`}
          >
            <UtensilsCrossed
              className={`w-5 h-5 stroke-current ${
                activeTab === 'home' ? 'stroke-[2]' : 'stroke-[1.8]'
              }`}
            />
            <span
              className={`text-[10px] tracking-tight mt-0.5 ${
                activeTab === 'home' ? 'font-bold' : ''
              }`}
            >
              点餐
            </span>
          </button>

          {/* Tab 2: 专送 */}
          <button
            type="button"
            id="bottom-nav-tracking-tab"
            onClick={() => {
              if (isNavLocked) {
                handleLockedBarClick();
                return;
              }
              onSelectTab('tracking');
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors ${
              activeTab === 'tracking' ? 'text-[#111]' : 'text-gray-400 hover:text-black'
            }`}
          >
            <Bike
              className={`w-5 h-5 stroke-current ${
                activeTab === 'tracking' ? 'stroke-[2]' : 'stroke-[1.8]'
              }`}
            />
            <span
              className={`text-[10px] tracking-tight mt-0.5 ${
                activeTab === 'tracking' ? 'font-bold' : ''
              }`}
            >
              专送
            </span>
          </button>

          {/* Tab 3: 消息 (切换餐车专属联络室) */}
          <button
            type="button"
            id="bottom-nav-messages-tab"
            onClick={() => {
              if (isNavLocked) {
                handleLockedBarClick();
                return;
              }
              if (onOpenMessageHub) onOpenMessageHub();
              onSelectTab('order_messages');
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors relative ${
              activeTab === 'order_messages' ? 'text-[#111]' : 'text-gray-400 hover:text-black'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <MessageSquareText
                className={`w-5 h-5 stroke-current ${
                  activeTab === 'order_messages' ? 'stroke-[2]' : 'stroke-[1.8]'
                }`}
              />
              <span className="absolute -top-1 -right-2.5 bg-[#FF3B30] text-white font-mono text-[8px] font-bold px-1 rounded-full leading-tight">
                {totalUnreadMessages > 0
                  ? totalUnreadMessages > 9
                    ? '9+'
                    : totalUnreadMessages
                  : '9+'}
              </span>
            </div>
            <span
              className={`text-[10px] tracking-tight mt-0.5 ${
                activeTab === 'order_messages' ? 'font-bold' : ''
              }`}
            >
              消息
            </span>
          </button>

          {/* Tab 4: 餐车 (全域互动动态流与附近餐车站台) */}
          <button
            type="button"
            id="bottom-nav-trucks-tab"
            onClick={() => {
              if (isNavLocked) {
                handleLockedBarClick();
                return;
              }
              onSelectTab('trucks');
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors relative ${
              activeTab === 'trucks' ? 'text-[#111]' : 'text-gray-400 hover:text-black'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <Truck
                className={`w-5 h-5 stroke-current ${
                  activeTab === 'trucks' ? 'stroke-[2]' : 'stroke-[1.8]'
                }`}
              />
              <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-[#00B96B] rounded-full animate-pulse" />
            </div>
            <span
              className={`text-[10px] tracking-tight mt-0.5 ${
                activeTab === 'trucks' ? 'font-bold' : ''
              }`}
            >
              餐车
            </span>
          </button>

          {/* Tab 5: 工单 */}
          <button
            type="button"
            id="bottom-nav-orders-tab"
            onClick={() => {
              if (isNavLocked) {
                handleLockedBarClick();
                return;
              }
              onSelectTab('orders');
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors relative ${
              activeTab === 'orders' ? 'text-[#111]' : 'text-gray-400 hover:text-black'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <ClipboardList
                className={`w-5 h-5 stroke-current ${
                  activeTab === 'orders' ? 'stroke-[2]' : 'stroke-[1.8]'
                }`}
              />
              <span className="absolute -top-1 -right-1.5 bg-[#FF9900] text-white font-mono text-[8px] font-bold px-1 rounded-full leading-tight">
                {activeOrders.length > 0 ? activeOrders.length : 8}
              </span>
            </div>
            <span
              className={`text-[10px] tracking-tight mt-0.5 ${
                activeTab === 'orders' ? 'font-bold' : ''
              }`}
            >
              工单
            </span>
          </button>

          {/* Tab 6: 工匠档案 */}
          <button
            type="button"
            id="bottom-nav-profile-tab"
            onClick={() => {
              if (isNavLocked) {
                handleLockedBarClick();
                return;
              }
              onSelectTab('profile');
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors relative ${
              activeTab === 'profile' ? 'text-[#111]' : 'text-gray-400 hover:text-black'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <User
                className={`w-5 h-5 stroke-current ${
                  activeTab === 'profile' ? 'stroke-[2]' : 'stroke-[1.8]'
                }`}
              />
              <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-[#FF9900] rounded-full" />
            </div>
            <span
              className={`text-[10px] tracking-tight mt-0.5 ${
                activeTab === 'profile' ? 'font-bold' : ''
              }`}
            >
              工匠档案
            </span>
          </button>

          {/* 右端常驻：状态加锁切换触发端点 (Lock Toggle Pill Trigger) */}
          {!isNavLocked && (
            <button
              type="button"
              id="bottom-nav-lock-toggle-btn"
              onClick={() => toggleNavLock(true)}
              className="h-full px-2.5 flex flex-col items-center justify-center bg-[#FAFAFA] hover:bg-[#F0F2F5] border-l border-[#E5E7EB] text-gray-500 hover:text-black transition-colors cursor-pointer shrink-0 group"
              title="切换为防误触全栏锁定模式"
            >
              <Lock className="w-3.5 h-3.5 stroke-[2] text-gray-600 group-hover:text-black transition-transform group-hover:scale-110" />
              <span className="text-[8.5px] font-mono tracking-tighter mt-0.5 text-gray-500">
                锁定
              </span>
            </button>
          )}

          {/* =========================================================================
              【整栏全覆盖状态样式】：防误触锁定遮罩层 (Full Morphing State Overlay)
              平滑滑入覆盖全部 Tab 区域，拦截误触，并支持平滑滑动/轻触一键解锁
             ========================================================================= */}
          <AnimatePresence>
            {isNavLocked && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                id="bottom-navbar-locked-overlay"
                onClick={handleLockedBarClick}
                className={`absolute inset-0 z-50 flex items-center justify-between px-3 bg-[#111111]/96 backdrop-blur-md text-white select-none transition-shadow ${
                  showLockPrompt ? 'ring-2 ring-amber-400/80 shadow-lg' : ''
                }`}
              >
                {/* 状态指示区与防护说明 */}
                <div className="flex items-center space-x-2 min-w-0 pr-2">
                  <div className="w-7 h-7 rounded-sm bg-[#222222] border border-[#333333] flex items-center justify-center shrink-0 text-amber-400">
                    <Lock className="w-3.5 h-3.5 stroke-[2.2]" />
                  </div>
                  <div className="flex flex-col text-left leading-tight min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-bold text-white tracking-tight">
                        导航已防误触锁定
                      </span>
                      <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-1 py-0.2 rounded-xs">
                        PROTECTED
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono truncate">
                      {showLockPrompt ? '⚠️ 请轻触右侧按钮或滑动解除锁定' : '防止点餐及浏览时误触跳页'}
                    </span>
                  </div>
                </div>

                {/* 右侧：平滑解锁状态切换控制器 (Smooth Unlock Toggle Button) */}
                <button
                  type="button"
                  id="bottom-nav-unlock-trigger-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleNavLock(false);
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-neutral-100 text-black rounded-xs text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
                >
                  <Unlock className="w-3.5 h-3.5 stroke-[2.2] text-[#111]" />
                  <span>轻触解锁</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
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
