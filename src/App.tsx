import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Header } from './components/Header';
import { TruckBanner } from './components/TruckBanner';
import { TruckPullUpMenu } from './components/TruckPullUpMenu';
import { FilterBar } from './components/FilterBar';
import { DishCard } from './components/DishCard';
import { DishListRow } from './components/DishListRow';
import { DishDetailModal } from './components/DishDetailModal';
import { DeliveryCategorySidebar } from './components/DeliveryCategorySidebar';
import { LinkedCategoryFloatingBar } from './components/LinkedCategoryFloatingBar';
import { CartDrawer } from './components/CartDrawer';
import { CartPageView } from './components/CartPageView';
import { CheckoutPageView } from './components/CheckoutPageView';
import { OrderTrackingView } from './components/OrderTrackingView';
import { VIPPerkModal } from './components/VIPPerkModal';
import { AddressSelectorModal } from './components/AddressSelectorModal';
import { BottomNavBar, NavTabType } from './components/BottomNavBar';
import { FilterModal } from './components/FilterModal';
import { BatchActionBar } from './components/BatchActionBar';
import { DiningMode } from './components/DiningModeSelector';
import { UserRole } from './components/RoleSwitcherDropdown';
import { OrdersPageView } from './components/OrdersPageView';
import { ProfilePageView } from './components/ProfilePageView';
import { UserCouponsPageView } from './components/UserCouponsPageView';
import { MerchantSystemView } from './components/merchant/MerchantSystemView';
import { RiderSystemView } from './components/rider/RiderSystemView';
import { PlatformSystemView } from './components/platform/PlatformSystemView';
import { OrderHistoryMessagesModal } from './components/chat/OrderHistoryMessagesModal';
import { OrderHistoryMessagesView } from './components/chat/OrderHistoryMessagesView';
import { CloudbaseStatusModal } from './components/CloudbaseStatusModal';
import { INITIAL_DISHES, INITIAL_ORDERS, INITIAL_TRUCK_INFO } from './data/mockData';
import { CATEGORY_TAXONOMY } from './data/categoryTaxonomy';
import { INITIAL_USER_PROFILE } from './data/mockUser';
import { CategoryType, DishItem, Order, ViewMode, CartItem, TruckInfo, UserProfile, DishVariant } from './types';
import { PaymentVoucher } from './types/payment';
import { FilterOptions, INITIAL_FILTER_OPTIONS } from './types/filter';
import { UtensilsCrossed, RefreshCw, Sparkles, FilterX, CheckSquare, Square } from 'lucide-react';
import { FlyingCartProvider } from './utils/FlyingCartContext';
import { ToastProvider, useToast } from './components/ui/ToastContext';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { DishSkeletonGrid } from './components/ui/DishSkeletonGrid';
import { safeGetStorage, safeSetStorage } from './utils/safeStorage';
import { isOrderMatch, normalizeOrderKey, getCanonicalOrderNo } from './utils/orderNormalizer';
import { getCurrentBoundTable, bindOrderToMerchantTable } from './utils/tableStorage';
import { sendOrderChatMessage } from './utils/chatHub';
import { rematchAllDishImages } from './utils/dishImageMatcher';
import { performAutoLogin } from './utils/autoAuthEngine';
import { StaffRiderPhoneAuthModal } from './components/auth/StaffRiderPhoneAuthModal';
import {
  isMerchantLoggedIn,
  isRiderLoggedIn,
  getMerchantSession,
  getRiderSession,
  logoutMerchant,
  logoutRider,
  MerchantSession,
  RiderSession,
  EVENT_MERCHANT_AUTH_CHANGED,
  EVENT_RIDER_AUTH_CHANGED
} from './utils/staffAndRiderAuthEngine';
import { playCategoryLinkSound, playCategorySnapSound } from './utils/hapticAudio';
import { 
  ensureCloudbaseAuth, 
  fetchDishesFromCloud, 
  fetchOrdersFromCloud, 
  fetchUserProfileFromCloudFunction,
  createCloudOrder, 
  updateCloudOrderStatus, 
  watchCloudOrders,
  notifyOrdersChanged,
  syncSingleModuleToCloud,
  TCB_ENV_ID 
} from './utils/cloudbase';
import { syncEngine } from './utils/syncEngine';
import { globalScannerEngine, ensureDishBarcodes } from './utils/barcodeScannerEngine';
import { INITIAL_TABLES } from './data/posMockData';
import {
  TruckExpandConfig,
  getTruckExpandConfig,
  subscribeTruckExpandConfig,
  hasUserDismissedTruckMenu,
  recordUserDismissedTruckMenu
} from './utils/truckExpandSettings';
import {
  CategoryBrandModalConfig,
  getCategoryBrandConfigs,
  subscribeCategoryBrandConfigs,
  shouldShowCategoryBrandModal,
  recordCategoryBrandModalSeen,
  resetSingleCategorySeenRecord
} from './utils/categoryBrandSettings';
import { CategoryBrandModal } from './components/CategoryBrandModal';
import { StoreCampaignCarousel } from './components/StoreCampaignCarousel';
import {
  MenuDesignSystem,
  getMenuDesignSystem,
  subscribeMenuDesignSystem
} from './utils/menuDesignSystem';
import { DeliveryRangeGuideBanner } from './components/DeliveryRangeGuideBanner';
import { DeliveryRangeModal } from './components/DeliveryRangeModal';
import {
  getActiveTruckConfig,
  evaluateDeliveryRange,
  subscribeTruckConfigs,
  DeliveryRangeEvaluation
} from './utils/truckLocationEngine';
import { DevSimulationProvider } from './context/DevSimulationContext';
import { DevFloatingDock } from './components/dev/DevFloatingDock';
import { DevAuthModal } from './components/dev/DevAuthModal';
import { DevSimulationControlCenter } from './components/dev/DevSimulationControlCenter';

export default function App() {
  return (
    <ErrorBoundary>
      <DevSimulationProvider>
        <ToastProvider>
          <FlyingCartProvider>
            <MainAppContent />
          </FlyingCartProvider>
        </ToastProvider>
      </DevSimulationProvider>
    </ErrorBoundary>
  );
}

// Helper to ensure order list has strictly unique ids
function deduplicateOrders(list: Order[]): Order[] {
  const seen = new Set<string>();
  return list.filter((item) => {
    const cleanId = (item.id || '').replace(/^#/, '');
    const cleanNo = (item.orderNo || '').replace(/^#/, '');
    const key = cleanId || cleanNo;
    if (!key || seen.has(cleanId) || seen.has(cleanNo)) return false;
    if (cleanId) seen.add(cleanId);
    if (cleanNo) seen.add(cleanNo);
    return true;
  });
}

function MainAppContent() {
  const toast = useToast();

  // Core state
  const [truck, setTruck] = useState<TruckInfo>(INITIAL_TRUCK_INFO);
  const [dishes, setDishes] = useState<DishItem[]>(() => {
    const raw = safeGetStorage<DishItem[]>('obsidian_truck_dishes', INITIAL_DISHES);
    return ensureDishBarcodes(rematchAllDishImages(raw));
  });
  const [orders, setOrders] = useState<Order[]>(() => {
    const raw = safeGetStorage<Order[]>('obsidian_truck_orders', INITIAL_ORDERS);
    return deduplicateOrders(raw);
  });
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    return safeGetStorage<UserProfile>('obsidian_user_profile', INITIAL_USER_PROFILE);
  });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid2');
  const [activeCategory, setActiveCategory] = useState<CategoryType>('popular');
  const [categoryScrollProgress, setCategoryScrollProgress] = useState<number>(0);
  const [isScrollingDishes, setIsScrollingDishes] = useState<boolean>(false);
  const [highlightedCategorySection, setHighlightedCategorySection] = useState<CategoryType | null>(null);
  const [soundFeedbackEnabled, setSoundFeedbackEnabled] = useState<boolean>(true);
  const [linkageToastInfo, setLinkageToastInfo] = useState<{
    catName: string;
    icon: string;
    count: number;
  } | null>(null);
  const [activeSubCategory, setActiveSubCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('西藏北路 166 号大悦城商务座 1204 室');
  const [isVIPActive, setIsVIPActive] = useState(true);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);
  const [onlyDiscountFilter, setOnlyDiscountFilter] = useState(false);

  // Dining Mode & Role State
  const [diningMode, setDiningMode] = useState<DiningMode>('delivery');
  const [currentRole, setCurrentRole] = useState<UserRole>('customer');
  const [activeTrackingOrderId, setActiveTrackingOrderId] = useState<string | null>(null);

  // Staff & Rider Phone Authentication Gating States (强制手机号实名登录，设备硬件指纹保持绑定不变)
  const [isStaffRiderAuthModalOpen, setIsStaffRiderAuthModalOpen] = useState(false);
  const [targetAuthRole, setTargetAuthRole] = useState<'merchant' | 'rider'>('merchant');
  const [merchantSession, setMerchantSession] = useState<MerchantSession | null>(() => getMerchantSession());
  const [riderSession, setRiderSession] = useState<RiderSession | null>(() => getRiderSession());

  useEffect(() => {
    const handleMerchantChange = (e: any) => {
      setMerchantSession(e.detail !== undefined ? e.detail : getMerchantSession());
    };
    const handleRiderChange = (e: any) => {
      setRiderSession(e.detail !== undefined ? e.detail : getRiderSession());
    };
    window.addEventListener(EVENT_MERCHANT_AUTH_CHANGED, handleMerchantChange);
    window.addEventListener(EVENT_RIDER_AUTH_CHANGED, handleRiderChange);
    return () => {
      window.removeEventListener(EVENT_MERCHANT_AUTH_CHANGED, handleMerchantChange);
      window.removeEventListener(EVENT_RIDER_AUTH_CHANGED, handleRiderChange);
    };
  }, []);

  // Delivery Range Evaluation & Multi-Truck Engine
  const [truckConfigVersion, setTruckConfigVersion] = useState(0);
  const [isDeliveryRangeModalOpen, setIsDeliveryRangeModalOpen] = useState(false);

  useEffect(() => {
    const unsub = subscribeTruckConfigs(() => {
      setTruckConfigVersion((v) => v + 1);
    });
    return unsub;
  }, []);

  const deliveryEvaluation = useMemo(() => {
    const activeTruck = getActiveTruckConfig();
    return evaluateDeliveryRange(activeTruck, deliveryAddress, diningMode);
  }, [deliveryAddress, diningMode, truckConfigVersion]);

  // Filter & Multi-Select states
  const [filterOptions, setFilterOptions] = useState<FilterOptions>(INITIAL_FILTER_OPTIONS);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedDishIds, setSelectedDishIds] = useState<Set<string>>(new Set());

  // Active modals & Navigation tabs
  const [selectedDishForDetail, setSelectedDishForDetail] = useState<DishItem | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isVIPModalOpen, setIsVIPModalOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isCloudbaseModalOpen, setIsCloudbaseModalOpen] = useState(false);
  const [isMessageFormModalOpen, setIsMessageFormModalOpen] = useState(false);
  const [isPullUpMenuOpen, setIsPullUpMenuOpen] = useState(false);
  const [isCloudbaseConnected, setIsCloudbaseConnected] = useState(false);
  const [cloudbaseAuthUserId, setCloudbaseAuthUserId] = useState<string | undefined>(undefined);
  const [activeNavTab, setActiveNavTab] = useState<NavTabType>('home');
  const [navHistory, setNavHistory] = useState<NavTabType[]>(['home']);

  const navigateTo = (tab: NavTabType) => {
    if (tab === activeNavTab) return;
    setNavHistory((prev) => {
      if (prev[prev.length - 1] === tab) return prev;
      return [...prev, tab];
    });
    setActiveNavTab(tab);
    if (tab !== 'home' && truckExpandConfig.collapseOnNavigate && isPullUpMenuOpen) {
      setIsPullUpMenuOpen(false);
    }
  };

  const handleBackNav = () => {
    setNavHistory((prev) => {
      if (prev.length <= 1) {
        setActiveNavTab('home');
        return ['home'];
      }
      const nextHistory = prev.slice(0, -1);
      const targetTab = nextHistory[nextHistory.length - 1] || 'home';
      setActiveNavTab(targetTab);
      return nextHistory;
    });
  };

  const previousNavTab = useMemo(() => {
    if (navHistory.length >= 2) {
      return navHistory[navHistory.length - 2];
    }
    return 'home';
  }, [navHistory]);

  const [activeCategoryBrandModal, setActiveCategoryBrandModal] = useState<CategoryBrandModalConfig | null>(null);
  const [categoryBrandConfigs, setCategoryBrandConfigs] = useState<Record<string, CategoryBrandModalConfig>>(() =>
    getCategoryBrandConfigs()
  );

  useEffect(() => {
    const unsub = subscribeCategoryBrandConfigs((newConfigs) => {
      setCategoryBrandConfigs(newConfigs);
    });
    return unsub;
  }, []);

  const [menuDesignSystem, setMenuDesignSystem] = useState<MenuDesignSystem>(() =>
    getMenuDesignSystem()
  );
  const [merchantInitialTab, setMerchantInitialTab] = useState<string>('tables');

  useEffect(() => {
    const unsub = subscribeMenuDesignSystem((newDesign) => {
      setMenuDesignSystem(newDesign);
    });
    return unsub;
  }, []);

  // Ensure page resets to top whenever switching navigation tabs to prevent scroll overflow offsets
  const mainScrollContainerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (mainScrollContainerRef.current) {
      mainScrollContainerRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeNavTab]);

  const menuSectionRef = useRef<HTMLDivElement>(null);

  // Initialize Tencent CloudBase
  useEffect(() => {
    let isMounted = true;

    // 1. 匿名鉴权连接
    ensureCloudbaseAuth()
      .then((authRes) => {
        if (!isMounted) return;
        if (authRes.success) {
          setIsCloudbaseConnected(true);
          setCloudbaseAuthUserId(authRes.userId);
          console.log('[TCB] 腾讯云开发后台连接成功! 环境:', TCB_ENV_ID, 'UID:', authRes.userId);
        }
      })
      .catch((err) => {
        console.warn('[TCB] 鉴权初始化异常 (降级本地模式):', err);
      });

    // 2. 从云端拉取菜品
    fetchDishesFromCloud()
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.fromCloud && res.dishes && res.dishes.length > 0) {
          setDishes(res.dishes);
        }
      })
      .catch((err) => {
        console.warn('[TCB] 拉取菜品异常 (使用本地菜品):', err);
      });

    // 3. 从云端拉取订单
    fetchOrdersFromCloud()
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.fromCloud && res.orders && res.orders.length > 0) {
          setOrders(deduplicateOrders(res.orders));
        }
      })
      .catch((err) => {
        console.warn('[TCB] 拉取订单异常 (使用本地订单):', err);
      });

    // 4. 无密码智能硬件指纹自动匹配登录 / 新设备自动建档
    performAutoLogin()
      .then((authResult) => {
        if (!isMounted) return;
        if (authResult.success && authResult.user) {
          setUserProfile(authResult.user);
          // 如果用户有默认地址，自动同步为当前选中的配送地址
          const defaultAddr = authResult.user.addresses?.find((a) => a.isDefault);
          if (defaultAddr) {
            setDeliveryAddress(`${defaultAddr.address} ${defaultAddr.detail}`);
          }
          if (authResult.isNewUser) {
            console.log(`[智能免密] 识别到新设备 (${authResult.hardwareHash})，已自动创建账户:`, authResult.user.uid);
          } else {
            console.log(`[智能免密] 硬件指纹命中 (${authResult.hardwareHash})，已自动免密登录:`, authResult.user.uid);
          }
        }
      })
      .catch((err) => {
        console.warn('[TCB] 自动登录引擎异常 (使用本地资料保底):', err);
        fetchUserProfileFromCloudFunction()
          .then((res) => {
            if (!isMounted) return;
            if (res.success && res.profile) {
              setUserProfile(res.profile);
            }
          })
          .catch(() => {});
      });

    // 5. 实时监听订单变动（三端同步）
    const watcher = watchCloudOrders((liveOrders) => {
      if (!isMounted) return;
      if (liveOrders && liveOrders.length > 0) {
        setOrders(liveOrders);
        syncEngine.broadcast('ORDERS_CHANGED', liveOrders);
      }
    });

    // 6. 订阅五层同步总线 (L5 跨标签页 / 跨端广播监听)
    const unsubSync = syncEngine.subscribe((event) => {
      if (!isMounted) return;
      if (event.type === 'ORDERS_CHANGED' && event.data && Array.isArray(event.data)) {
        setOrders(event.data);
      } else if (event.type === 'DISHES_CHANGED' && event.data && Array.isArray(event.data)) {
        setDishes(event.data);
      } else if (event.type === 'OUTBOX_DRAINED') {
        fetchOrdersFromCloud().then((res) => {
          if (res.orders && res.orders.length > 0 && isMounted) {
            setOrders(res.orders);
          }
        });
      }
    });

    return () => {
      isMounted = false;
      if (watcher) watcher.close();
      unsubSync();
    };
  }, []);

  // Synchronize orders to secure local storage & sync engine whenever changed
  useEffect(() => {
    safeSetStorage('obsidian_truck_orders', orders);
    notifyOrdersChanged(orders);
  }, [orders]);

  // Synchronize dishes to secure local storage & sync engine whenever changed
  useEffect(() => {
    safeSetStorage('obsidian_truck_dishes', dishes);
  }, [dishes]);

  // 监听版本回滚引擎:菜单/订单数据被回滚到历史版本后，从本地权威键重载进 React state
  useEffect(() => {
    const handleDataRestored = (e: Event) => {
      const detail = (e as CustomEvent<{ module?: string; fullRestore?: boolean }>).detail || {};
      if (!detail.module || detail.module === 'dishes' || detail.fullRestore) {
        const fresh = safeGetStorage<DishItem[]>('obsidian_truck_dishes', INITIAL_DISHES);
        setDishes(rematchAllDishImages(ensureDishBarcodes(fresh)));
      }
      if (!detail.module || detail.module === 'orders' || detail.fullRestore) {
        const freshOrders = safeGetStorage<Order[]>('obsidian_truck_orders', INITIAL_ORDERS);
        setOrders(deduplicateOrders(freshOrders));
      }
    };
    window.addEventListener('obsidian_data_restored', handleDataRestored);
    return () => window.removeEventListener('obsidian_data_restored', handleDataRestored);
  }, []);

  // 7. 智能餐车自动展开与多场景智能收起策略引擎
  const [truckExpandConfig, setTruckExpandConfig] = useState<TruckExpandConfig>(() => getTruckExpandConfig());
  const autoExpandTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoCollapseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoExpandedRef = useRef<boolean>(false);

  useEffect(() => {
    const unsub = subscribeTruckExpandConfig((cfg) => {
      setTruckExpandConfig(cfg);
    });
    return () => unsub();
  }, []);

  // 场景 1: 初次进入网页 / 首页倒计时自动展开；若用户曾经关闭过且开启了“记住关闭/防打扰”，则不重复弹出
  useEffect(() => {
    // 仅在顾客端首页且未手动展开时根据商家后台配置触发
    if (currentRole !== 'customer' || activeNavTab !== 'home') {
      if (autoExpandTimerRef.current) {
        clearTimeout(autoExpandTimerRef.current);
        autoExpandTimerRef.current = null;
      }
      return;
    }

    if (isPullUpMenuOpen) {
      return;
    }

    // 关键场景规则 A: 如果用户之前主动关闭了菜单，并且配置了 rememberUserDismissal 或防打扰策略，直接跳过自动弹出
    if (truckExpandConfig.rememberUserDismissal && hasUserDismissedTruckMenu()) {
      return;
    }

    // 关键场景规则 B: 频次策略校验
    if (truckExpandConfig.triggerScene === 'daily_first' && hasAutoExpandedRef.current) {
      return;
    }
    if (truckExpandConfig.triggerScene === 'manual_dismiss_suppress' && hasUserDismissedTruckMenu()) {
      return;
    }

    if (!truckExpandConfig.enableOnNavTabHome) {
      return;
    }

    // A. 直接展开模式 (immediate)
    if (truckExpandConfig.mode === 'immediate') {
      autoExpandTimerRef.current = setTimeout(() => {
        setIsPullUpMenuOpen(true);
        hasAutoExpandedRef.current = true;
        if (truckExpandConfig.hapticFeedback && typeof navigator !== 'undefined' && navigator.vibrate) {
          try { navigator.vibrate(40); } catch {}
        }
      }, 350);
      return;
    }

    // B. 倒计时自动展开模式 (countdown，默认 2 秒)
    if (truckExpandConfig.mode === 'countdown') {
      const delayMs = Math.max(500, (truckExpandConfig.delaySeconds || 2) * 1000);
      autoExpandTimerRef.current = setTimeout(() => {
        setIsPullUpMenuOpen(true);
        hasAutoExpandedRef.current = true;
        if (truckExpandConfig.hapticFeedback && typeof navigator !== 'undefined' && navigator.vibrate) {
          try { navigator.vibrate(40); } catch {}
        }
      }, delayMs);
      return;
    }

    // C. 不展开模式 (disabled) - 保持收起
  }, [currentRole, activeNavTab, isPullUpMenuOpen, truckExpandConfig]);

  // 场景 2: 自动展开后如果配置了自动收起 (autoCollapseAfterSeconds > 0)，自动在指定秒数后平滑收起
  useEffect(() => {
    if (isPullUpMenuOpen && truckExpandConfig.autoCollapseAfterSeconds > 0) {
      if (autoCollapseTimerRef.current) clearTimeout(autoCollapseTimerRef.current);
      autoCollapseTimerRef.current = setTimeout(() => {
        setIsPullUpMenuOpen(false);
      }, truckExpandConfig.autoCollapseAfterSeconds * 1000);
    } else {
      if (autoCollapseTimerRef.current) {
        clearTimeout(autoCollapseTimerRef.current);
        autoCollapseTimerRef.current = null;
      }
    }
    return () => {
      if (autoCollapseTimerRef.current) clearTimeout(autoCollapseTimerRef.current);
    };
  }, [isPullUpMenuOpen, truckExpandConfig.autoCollapseAfterSeconds]);

  // 场景 3: 页面滚动打断 / 自动收起场景
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement | Window;
      const scrollY = target instanceof HTMLElement ? target.scrollTop : window.scrollY;
      if (truckExpandConfig.collapseOnPageScroll && isPullUpMenuOpen) {
        // 用户大幅滚动浏览列表时自动收起餐车浮层
        if (scrollY > 160) {
          setIsPullUpMenuOpen(false);
        }
      }
      // 如果在倒计时期间用户主动滚动且开启了手势打断，则取消本次倒计时弹出
      if (truckExpandConfig.userCancelable && autoExpandTimerRef.current) {
        clearTimeout(autoExpandTimerRef.current);
        autoExpandTimerRef.current = null;
      }
    };

    const scrollContainer = mainScrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isPullUpMenuOpen, truckExpandConfig.collapseOnPageScroll, truckExpandConfig.userCancelable]);

  // 关闭餐车菜单时记录用户主动关闭行为 (供后续场景判断)
  const handleClosePullUpMenu = (isManual = true) => {
    setIsPullUpMenuOpen(false);
    if (isManual) {
      recordUserDismissedTruckMenu(true);
    }
  };

  useEffect(() => {
    return () => {
      if (autoExpandTimerRef.current) clearTimeout(autoExpandTimerRef.current);
      if (autoCollapseTimerRef.current) clearTimeout(autoCollapseTimerRef.current);
    };
  }, []);

  // Initialize Global Hardware Barcode Scanner Engine
  useEffect(() => {
    globalScannerEngine.init(() => ({
      dishes,
      orders,
      tables: INITIAL_TABLES
    }));

    const unsubscribe = globalScannerEngine.subscribe((result) => {
      // If in customer role, trigger smart cart addition or perk activation
      if (currentRole === 'customer') {
        if (result.type === 'dish' && result.matchedData) {
          const dish = result.matchedData as DishItem;
          if (dish.available) {
            setCart((prev) => {
              const existing = prev.find((item) => item.dish.id === dish.id);
              if (existing) {
                return prev.map((item) =>
                  item.dish.id === dish.id ? { ...item, quantity: item.quantity + 1 } : item
                );
              }
              return [
                ...prev,
                {
                  cartItemId: `cart-${dish.id}-${Date.now()}`,
                  dish,
                  quantity: 1,
                  selectedOptions: {},
                  calculatedPrice: dish.price
                }
              ];
            });
            toast.success(`[扫码枪] 已自动加入购物车`, `${dish.name} · ¥${dish.price.toFixed(2)}`);
          } else {
            toast.warning(`[扫码枪] 该菜品已沽清`, `${dish.name} 暂不可点`);
          }
        } else if (result.type === 'member') {
          setIsVIPActive(true);
          toast.success(`[扫码枪] 识别会员身份`, `${result.title} · VIP 9折特权已激活！`);
        } else if (result.type === 'coupon') {
          toast.success(`[扫码枪] 优惠券核销成功`, `${result.title} · 下单立减 ¥10！`);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [dishes, orders, currentRole, toast]);

  // Role selection handler: 骑手端和商家端账号登录必须通过手机号，设备绑定的指纹信息不变
  const handleSelectRole = (role: UserRole) => {
    if (role === 'merchant') {
      if (!isMerchantLoggedIn()) {
        setTargetAuthRole('merchant');
        setIsStaffRiderAuthModalOpen(true);
        return;
      }
    } else if (role === 'rider') {
      if (!isRiderLoggedIn()) {
        setTargetAuthRole('rider');
        setIsStaffRiderAuthModalOpen(true);
        return;
      }
    }
    setCurrentRole(role);
  };

  const handleStaffRiderAuthSuccess = (session: MerchantSession | RiderSession) => {
    if (targetAuthRole === 'merchant') {
      setMerchantSession(session as MerchantSession);
      setCurrentRole('merchant');
    } else {
      setRiderSession(session as RiderSession);
      setCurrentRole('rider');
    }
    setIsStaffRiderAuthModalOpen(false);
  };

  // Toggle dish available state for merchant portal
  const handleToggleDishAvailability = (dishId: string) => {
    const target = dishes.find((d) => d.id === dishId);
    if (target) {
      const nextState = !target.available;
      toast.info(nextState ? `已上架: ${target.name}` : `已下架: ${target.name}`);
    }
    setDishes((prev) =>
      prev.map((d) => {
        if (d.id === dishId) {
          return { ...d, available: !d.available };
        }
        return d;
      })
    );
  };

  // Dining Mode Change
  const handleDiningModeChange = (mode: DiningMode) => {
    setDiningMode(mode);
  };

  // Refresh menu simulation
  const handleRefreshMenu = () => {
    setIsLoadingMenu(true);
    fetchDishesFromCloud().then((res) => {
      setIsLoadingMenu(false);
      if (res.success && res.fromCloud && res.dishes.length > 0) {
        setDishes(res.dishes);
        toast.success('菜单已从腾讯云同步至最新', '餐车实时库存与促销状态已刷新');
      } else {
        toast.success('菜单已同步至最新', '餐车实时库存与促销状态已刷新');
      }
    }).catch(() => {
      setIsLoadingMenu(false);
      toast.success('菜单已同步至最新');
    });
  };

  // Advance order status flow for merchant & rider portals with robust specified order matching & status sync
  const handleAdvanceOrderStatus = (
    orderIdentifier: string,
    targetStatus?: Order['status'],
    extraDetails?: Partial<Order>
  ) => {
    // 1. Strict canonical matching via normalizer (with INITIAL_ORDERS fallback)
    let targetOrder = orders.find((o) => isOrderMatch(o, orderIdentifier));
    let isFromInitial = false;

    if (!targetOrder) {
      targetOrder = INITIAL_ORDERS.find((o) => isOrderMatch(o, orderIdentifier));
      if (targetOrder) {
        isFromInitial = true;
      }
    }

    if (!targetOrder) {
      console.warn(`[handleAdvanceOrderStatus] 未找到匹配订单: ${orderIdentifier}`);
      return;
    }

    // Determine next status
    const nextStatus = targetStatus || (targetOrder.status === 'cooking' ? 'delivering' : 'completed');
    const targetId = targetOrder.id;
    const targetNo = targetOrder.orderNo;

    let updateData: Partial<Order> = {};
    if (nextStatus === 'cooking') {
      toast.success(`订单 ${targetNo} 状态已同步：餐车已接单`, '餐车主理人已确认接单，后厨炭火现制中');
      updateData = {
        status: 'cooking',
        statusText: '餐车已接单 · 现制中',
        merchantAccepted: true,
        progressPercent: 20,
        etaMinutes: extraDetails?.etaMinutes !== undefined ? extraDetails.etaMinutes : 16,
        stepIndex: 1,
        ...extraDetails
      };
      sendOrderChatMessage(targetNo, {
        senderRole: 'merchant',
        senderName: '黑曜石餐车主厨',
        type: 'text',
        text: `【餐车已接单】主理人已接单，炭烤炉台现烤现制中，预计 ${updateData.etaMinutes} 分钟后制作完成！`
      });
    } else if (nextStatus === 'ready') {
      toast.success(`订单 ${targetNo} 状态已同步：已制作完成`, '餐品已封装完毕并置于餐车恒温取餐格，等待骑手取餐');
      updateData = {
        status: 'ready',
        statusText: '已制作完成 · 待取餐',
        merchantAccepted: true,
        progressPercent: 40,
        etaMinutes: extraDetails?.etaMinutes !== undefined ? extraDetails.etaMinutes : 12,
        stepIndex: 2,
        ...extraDetails
      };
      sendOrderChatMessage(targetNo, {
        senderRole: 'merchant',
        senderName: '黑曜石餐车出餐台',
        type: 'text',
        text: '【已制作完成】餐品已完成双层食品级锁温封装，已放入 01 号保温取餐格，呼叫专线骑手取餐！'
      });
    } else if (nextStatus === 'rider_heading') {
      toast.success(`订单 ${targetNo} 状态已同步：骑手正在赶往商家`, '专线骑手已接单，正在全速赶往流动餐车站台');
      updateData = {
        status: 'rider_heading',
        statusText: '骑手正在赶往商家',
        merchantAccepted: true,
        riderAccepted: true,
        progressPercent: 50,
        etaMinutes: extraDetails?.etaMinutes !== undefined ? extraDetails.etaMinutes : 10,
        courierName: extraDetails?.courierName || targetOrder.courierName || '陈志远 (专线骑手 R-8821)',
        courierPhone: extraDetails?.courierPhone || targetOrder.courierPhone || '138-1829-9201',
        stepIndex: 3,
        ...extraDetails
      };
      sendOrderChatMessage(targetNo, {
        senderRole: 'rider',
        senderName: updateData.courierName || '陈志远 (专线骑手 R-8821)',
        type: 'text',
        text: '【骑手已接单】专线骑手已接单，开启高德专线导航，正在全速赶往餐车取餐点！'
      });
    } else if (nextStatus === 'waiting_pickup') {
      toast.success(`订单 ${targetNo} 状态已同步：等待骑手取餐`, '骑手已到达流动餐车，正在出示取件码核验');
      updateData = {
        status: 'waiting_pickup',
        statusText: '等待骑手取餐 · 骑手已到店',
        progressPercent: 60,
        etaMinutes: extraDetails?.etaMinutes !== undefined ? extraDetails.etaMinutes : 9,
        stepIndex: 4,
        ...extraDetails
      };
      sendOrderChatMessage(targetNo, {
        senderRole: 'rider',
        senderName: extraDetails?.courierName || targetOrder.courierName || '陈志远 (专线骑手 R-8821)',
        type: 'text',
        text: '【骑手已到店】已到达流动餐车停靠点，正在向主理人出示取件码核销取餐！'
      });
    } else if (nextStatus === 'picked_up') {
      toast.success(`订单 ${targetNo} 状态已同步：骑手已取餐`, '骑手已完成核验与装箱，贴上锁鲜封签');
      updateData = {
        status: 'picked_up',
        statusText: '骑手已取餐 · 装箱封签',
        merchantAccepted: true,
        riderAccepted: true,
        progressPercent: 70,
        etaMinutes: extraDetails?.etaMinutes !== undefined ? extraDetails.etaMinutes : 8,
        stepIndex: 5,
        ...extraDetails
      };
      sendOrderChatMessage(targetNo, {
        senderRole: 'rider',
        senderName: extraDetails?.courierName || targetOrder.courierName || '陈志远 (专线骑手 R-8821)',
        type: 'text',
        text: '【骑手已取餐】餐品核验无误，已装入 68℃ 恒温智能保温箱贴上锁鲜封签，即将启程配送！'
      });
    } else if (nextStatus === 'delivering') {
      toast.success(
        `订单 ${targetNo} 状态已同步：骑手配送中`,
        `骑手专线极速送餐中（预计 ${extraDetails?.etaMinutes || 6} 分钟送达）`
      );
      updateData = {
        status: 'delivering',
        statusText: '骑手配送中 · 极速专送',
        merchantAccepted: true,
        riderAccepted: true,
        progressPercent: 85,
        stepIndex: 6,
        etaMinutes: extraDetails?.etaMinutes !== undefined ? extraDetails.etaMinutes : 6,
        courierName: extraDetails?.courierName || targetOrder.courierName || '陈志远 (专线骑手 R-8821)',
        courierPhone: extraDetails?.courierPhone || targetOrder.courierPhone || '138-1829-9201',
        ...extraDetails
      };
      sendOrderChatMessage(targetNo, {
        senderRole: 'rider',
        senderName: updateData.courierName || '陈志远 (专线骑手 R-8821)',
        type: 'text',
        text: `【专送出发】骑手已从餐车启程专线飞驰，温控 68°C 保持滚烫，预计 ${updateData.etaMinutes} 分钟内送达！`
      });
    } else if (nextStatus === 'completed') {
      toast.success(
        `订单 ${targetNo} 状态已同步：已送达结算`,
        '骑手已妥投送达，已完成报酬结算并实时同步至前端客户端'
      );
      updateData = {
        status: 'completed',
        statusText: '已妥投送达',
        progressPercent: 100,
        stepIndex: 7,
        etaMinutes: 0,
        estimatedDeliveryTime: '已送达',
        ...extraDetails
      };
      sendOrderChatMessage(targetNo, {
        senderRole: 'rider',
        senderName: extraDetails?.courierName || targetOrder.courierName || '陈志远 (专线骑手 R-8821)',
        type: 'text',
        text: '【送达提醒】您的餐品已顺利妥投送达至指定交付点，保温封签完好，请尽快趁热享用！如有疑问随时在此联络。'
      });
    } else if (nextStatus === 'cancel_requested') {
      toast.info(`订单 ${targetNo}：客户申请终止订单`, '顾客已提交取消申请，等待餐车主理人确认审核');
      updateData = {
        status: 'cancel_requested',
        statusText: '客户申请终止订单',
        refundStatus: 'pending',
        refundReason: extraDetails?.refundReason || '客户申请终止订单',
        refundFeedback: extraDetails?.refundFeedback || '顾客在订单流转中发起了终止订单申请',
        refundAppliedAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        ...extraDetails
      };
      sendOrderChatMessage(targetNo, {
        senderRole: 'system',
        senderName: '系统调度提示',
        type: 'text',
        text: `【终止申请】顾客已提交申请终止订单，理由：${updateData.refundReason}。请餐车主理人加急审核处理！`
      });
    } else if (nextStatus === 'merchant_rejected') {
      toast.error(`订单 ${targetNo}：商家已拒单`, '餐车已驳回订单，款项已全额原路退还至支付账户');
      updateData = {
        status: 'merchant_rejected',
        statusText: '商家已拒单 · 已退款',
        refundStatus: 'approved',
        ...extraDetails
      };
      sendOrderChatMessage(targetNo, {
        senderRole: 'merchant',
        senderName: '餐车站台主理人',
        type: 'text',
        text: '【商家已拒单】非常抱歉，流动餐车因当前客流满负荷或食材售罄无法接单，支付金额已全额原路自动退还！'
      });
    } else if (nextStatus === 'rider_rejected') {
      toast.info(`订单 ${targetNo}：骑手已拒单`, '原骑手因突发路况改派，系统调度中枢正在智能切换骑手');
      updateData = {
        status: 'rider_rejected',
        statusText: '骑手已拒单 · 智能转派中',
        courierName: '系统调度中枢重新匹配中...',
        ...extraDetails
      };
      sendOrderChatMessage(targetNo, {
        senderRole: 'system',
        senderName: '云端调度中枢',
        type: 'text',
        text: '【骑手已拒单】原专送骑手因车辆/突发路况发起转单，系统已记录风控，正在加码补贴重新转派就近骑手！'
      });

      // 自动联动仿真：1.8秒后流转到“正在切换骑手”，再过2.5秒重新由新骑手接单
      setTimeout(() => {
        handleAdvanceOrderStatus(targetNo, 'reassigning_rider', {
          courierName: '调度中枢注入补贴转派中'
        });
        setTimeout(() => {
          handleAdvanceOrderStatus(targetNo, 'rider_heading', {
            courierName: '周强 (特约加急骑手 R-9022)',
            courierPhone: '139-7712-8833'
          });
        }, 2800);
      }, 1800);
    } else if (nextStatus === 'reassigning_rider') {
      toast.info(`订单 ${targetNo}：正在切换骑手`, '调度系统已注入 ¥2.00 调度补贴，正在锁定周边 800m 最优骑手');
      updateData = {
        status: 'reassigning_rider',
        statusText: '正在切换骑手 · 调度中',
        ...extraDetails
      };
      sendOrderChatMessage(targetNo, {
        senderRole: 'system',
        senderName: '云端调度中枢',
        type: 'text',
        text: '【正在切换骑手】已加码 ¥2.00 调度补贴，正在调动周边 800 米高评分专送骑手前往餐车接驾！'
      });
    } else if (nextStatus === 'refunded') {
      toast.info(`订单 ${targetNo}：已全额退款`, '资金已原路退回，订单已关闭');
      updateData = {
        status: 'refunded',
        statusText: '已全额退款',
        refundStatus: 'approved',
        ...extraDetails
      };
    } else {
      updateData = {
        status: nextStatus,
        ...extraDetails
      };
    }

    setOrders((prev) => {
      let updated: Order[];
      if (isFromInitial && !prev.some((o) => isOrderMatch(o, targetId) || isOrderMatch(o, targetNo))) {
        const mergedOrder: Order = { ...targetOrder!, ...updateData };
        updated = [mergedOrder, ...prev];
      } else {
        updated = prev.map((o) => {
          if (isOrderMatch(o, targetId) || isOrderMatch(o, targetNo)) {
            return { ...o, ...updateData };
          }
          return o;
        });
      }
      safeSetStorage('obsidian_truck_orders', updated);
      return updated;
    });

    updateCloudOrderStatus(targetId, updateData, 'merchant_admin');
    if (targetNo && targetNo !== targetId) {
      updateCloudOrderStatus(targetNo, updateData, 'merchant_admin');
    }
  };

  // Merchant Audit Refund Handler
  const handleAuditRefund = (orderId: string, approved: boolean, rejectReason?: string) => {
    const targetOrder = orders.find((o) => isOrderMatch(o, orderId));
    let cloudUpdate: Partial<Order> = {};
    setOrders((prev) =>
      prev.map((o) => {
        if (isOrderMatch(o, orderId)) {
          if (approved) {
            cloudUpdate = {
              status: 'refunded' as const,
              statusText: '已退款',
              refundStatus: 'approved' as const
            };
            return { ...o, ...cloudUpdate };
          } else {
            // Restore status before refund request based on passed step
            const restoredStatus =
              o.refundPassedStep === 3
                ? 'delivering'
                : o.refundPassedStep === 2
                ? 'ready'
                : o.refundPassedStep === 1
                ? 'cooking'
                : 'pending';
            cloudUpdate = {
              status: restoredStatus as any,
              statusText:
                restoredStatus === 'delivering'
                  ? '配送中'
                  : restoredStatus === 'ready'
                  ? '已出餐待取'
                  : restoredStatus === 'cooking'
                  ? '制作中'
                  : '待接单',
              refundStatus: 'rejected' as const,
              refundRejectReason: rejectReason || '商家审核驳回退单'
            };
            return { ...o, ...cloudUpdate };
          }
        }
        return o;
      })
    );
    // 同步审核结果至云端，避免 watch 快照将本地审核回滚
    if (targetOrder && Object.keys(cloudUpdate).length > 0) {
      updateCloudOrderStatus(targetOrder.orderNo || targetOrder.id, cloudUpdate, 'merchant_admin');
    }
    if (approved) {
      toast.success('退单审核已通过', '款项已原路退回至顾客账户');
    } else {
      toast.info('退单申请已驳回', `驳回原因：${rejectReason || '不满足退单条件'}`);
    }
  };

  // Merchant Toggle Non-Refundable Lock Handler
  const handleToggleNonRefundable = (orderId: string, nonRefundable: boolean) => {
    const cleanId = (orderId || '').trim().replace(/^#/, '');
    setOrders((prev) =>
      prev.map((o) => {
        const cleanOrdNo = (o.orderNo || '').trim().replace(/^#/, '');
        const cleanOrdId = (o.id || '').trim().replace(/^#/, '');
        if (cleanOrdId === cleanId || cleanOrdNo === cleanId) {
          return { ...o, nonRefundable };
        }
        return o;
      })
    );
    // 同步不可退锁定状态至云端
    updateCloudOrderStatus(cleanId, { nonRefundable }, 'merchant_admin');
    toast.info(nonRefundable ? '已设置该订单为【不可退单】' : '已解除该订单不可退单锁定');
  };

  // Customer Apply Refund Feedback Handler (客户端只能做申请反馈)
  const handleApplyRefund = (
    orderId: string,
    reason: string,
    feedback: string,
    passedStep: number | string
  ) => {
    const cleanId = (orderId || '').trim().replace(/^#/, '');
    const target = orders.find((o) => {
      const cleanOrdNo = (o.orderNo || '').trim().replace(/^#/, '');
      const cleanOrdId = (o.id || '').trim().replace(/^#/, '');
      return cleanOrdId === cleanId || cleanOrdNo === cleanId;
    });

    if (target?.nonRefundable) {
      toast.error('该订单为不可退单商品', '商家已锁定该订单退款权限，请直接致电商家沟通！');
      return;
    }

    const timeStr = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    const refundPayload: Partial<Order> = {
      status: 'refund_pending' as const,
      statusText: '退单审核中',
      refundStatus: 'pending' as const,
      refundReason: reason,
      refundFeedback: feedback,
      refundPassedStep: typeof passedStep === 'number' ? passedStep : 0,
      refundAppliedAt: timeStr
    };
    setOrders((prev) =>
      prev.map((o) => {
        const cleanOrdNo = (o.orderNo || '').trim().replace(/^#/, '');
        const cleanOrdId = (o.id || '').trim().replace(/^#/, '');
        if (cleanOrdId === cleanId || cleanOrdNo === cleanId) {
          return { ...o, ...refundPayload };
        }
        return o;
      })
    );
    // 同步退款申请至云端 (sanitize 已放行 customer 发起 refund_pending 申请)
    updateCloudOrderStatus(cleanId, refundPayload, 'customer');
    toast.success('退单申请已提交', `已在节点 ${passedStep} 提交反馈，等待商家审核处理`);
  };

  // Update truck GPS & location across customer, merchant and rider portals
  const handleUpdateTruckLocation = (newLocation: string) => {
    setTruck((prev) => ({
      ...prev,
      currentLocationName: newLocation
    }));
    toast.success('餐车停靠位置与GPS已全网广播', `新停靠点：${newLocation}`);
  };

  // Reject / Cancel order flow
  const handleRejectOrder = (orderId: string, reason: string) => {
    const target = orders.find((o) => isOrderMatch(o, orderId));
    // 本地标记为商家拒单终态(而非静默移除)，与云端 watch 保持同步语义
    setOrders((prev) =>
      prev.map((o) => {
        if (isOrderMatch(o, orderId)) {
          return {
            ...o,
            status: 'merchant_rejected' as const,
            statusText: '商家已拒单 · 已退款',
            refundStatus: 'approved' as const,
            rejectionCount: (o.rejectionCount || 0) + 1,
            lastRejectionReason: reason
          };
        }
        return o;
      })
    );
    // 云端同步拒单状态
    if (target) {
      updateCloudOrderStatus(target.orderNo || target.id, {
        status: 'merchant_rejected',
        statusText: '商家已拒单 · 已退款',
        refundStatus: 'approved'
      }, 'merchant_admin');
    }
    toast.error('订单已取消退款', `订单已拒单并原路退款：${reason}`);
  };

  // Active Filter Count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterOptions.priceRange !== 'all') count++;
    if (filterOptions.orderType !== 'all') count++;
    if (filterOptions.onlyAvailable) count++;
    if (filterOptions.hasDiscount || onlyDiscountFilter) count++;
    if (filterOptions.isChefSpecial) count++;
    return count;
  }, [filterOptions, onlyDiscountFilter]);

  // Sequential category taxonomy order for storefront display
  const ORDERED_CATEGORY_KEYS: CategoryType[] = [
    'popular',
    'skewers',
    'yakitori',
    'baked',
    'western',
    'mains',
    'drinks',
    'desserts',
    'snacks'
  ];

  // Group dishes sequentially by category breakpoint for unified continuous flow
  const categorySections = useMemo(() => {
    return ORDERED_CATEGORY_KEYS.map((catKey) => {
      const catDef = CATEGORY_TAXONOMY[catKey];
      if (!catDef) return null;

      const matchingDishes = dishes.filter((dish) => {
        if (!dish.available) return false;

        // Category match
        if (catKey === 'popular') {
          if (!dish.isPopular) return false;
        } else {
          if (dish.category !== catKey) return false;
        }

        // SubCategory match (if active category matches this section and a specific subcategory is selected)
        if (
          activeCategory === catKey &&
          activeSubCategory &&
          activeSubCategory !== 'all' &&
          dish.subCategory &&
          dish.subCategory !== activeSubCategory
        ) {
          return false;
        }

        // Price Range filter
        if (filterOptions.priceRange === '0-30' && dish.price > 30) return false;
        if (filterOptions.priceRange === '30-60' && (dish.price <= 30 || dish.price > 60)) return false;
        if (filterOptions.priceRange === '60+' && dish.price <= 60) return false;

        // Order type filter
        if (filterOptions.orderType === 'delivery' && dish.orderType === 'dine_in') return false;
        if (filterOptions.orderType === 'dine_in' && dish.orderType === 'delivery') return false;

        // Availability filter
        if (filterOptions.onlyAvailable && !dish.available) return false;

        // Discount filter
        if ((filterOptions.hasDiscount || onlyDiscountFilter) && !dish.discountTag && !dish.originalPrice && !dish.prevPrice) {
          return false;
        }

        // Chef Special filter
        if (filterOptions.isChefSpecial && !dish.isChefSpecial && !dish.badgeText?.includes('招牌')) return false;

        // Search match
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesName = dish.name.toLowerCase().includes(q);
          const matchesEn = dish.enName.toLowerCase().includes(q);
          const matchesDesc = dish.description.toLowerCase().includes(q);
          const matchesTag = dish.typeTag.toLowerCase().includes(q) || (dish.badgeText && dish.badgeText.toLowerCase().includes(q));
          if (!matchesName && !matchesEn && !matchesDesc && !matchesTag) {
            return false;
          }
        }

        return true;
      });

      return {
        catKey,
        category: catDef,
        dishes: matchingDishes
      };
    }).filter((section): section is { catKey: CategoryType; category: typeof CATEGORY_TAXONOMY[CategoryType]; dishes: DishItem[] } =>
      section !== null && section.dishes.length > 0
    );
  }, [dishes, activeCategory, activeSubCategory, filterOptions, searchQuery, onlyDiscountFilter]);

  // Dynamic available taxonomy category keys for linked floating bar
  const availableTaxonomyKeys = useMemo(() => {
    const activeKeys = categorySections.map((s) => s.catKey);
    return activeKeys.length > 0 ? activeKeys : ORDERED_CATEGORY_KEYS;
  }, [categorySections]);

  // Aggregated dishes across all visible sequential sections
  const filteredDishes = useMemo(() => {
    return categorySections.flatMap((s) => s.dishes);
  }, [categorySections]);

  // Category counts (front-end customer menu)
  const categoryCounts = useMemo(() => {
    const availableList = dishes.filter((d) => d.available);
    return {
      all: availableList.length,
      popular: availableList.filter((d) => d.isPopular).length,
      skewers: availableList.filter((d) => d.category === 'skewers').length,
      yakitori: availableList.filter((d) => d.category === 'yakitori').length,
      baked: availableList.filter((d) => d.category === 'baked').length,
      western: availableList.filter((d) => d.category === 'western').length,
      mains: availableList.filter((d) => d.category === 'mains').length,
      drinks: availableList.filter((d) => d.category === 'drinks').length,
      desserts: availableList.filter((d) => d.category === 'desserts').length,
      snacks: availableList.filter((d) => d.category === 'snacks').length
    };
  }, [dishes]);

  // Subcategory Counts
  const subCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    dishes.forEach((d) => {
      if (d.available && d.subCategory) {
        counts[d.subCategory] = (counts[d.subCategory] || 0) + 1;
      }
    });
    return counts;
  }, [dishes]);

  // Cart helper totals
  const totalCartCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const totalCartPrice = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.calculatedPrice, 0);
  }, [cart]);

  // Map of dishId -> quantity in cart for quick badge
  const dishQuantitiesInCart = useMemo(() => {
    const map: Record<string, number> = {};
    cart.forEach((item) => {
      map[item.dish.id] = (map[item.dish.id] || 0) + item.quantity;
    });
    return map;
  }, [cart]);

  // Aggregated cart quantities per category for delivery sidebar badges
  const categoryCartCounts = useMemo(() => {
    const map: Record<string, number> = {};
    cart.forEach((item) => {
      const cat = item.dish.category;
      map[cat] = (map[cat] || 0) + item.quantity;
      if (item.dish.isPopular) {
        map.popular = (map.popular || 0) + item.quantity;
      }
    });
    return map;
  }, [cart]);

  // Selected dishes info for batch actions
  const selectedDishes = useMemo(() => {
    return dishes.filter((d) => selectedDishIds.has(d.id));
  }, [dishes, selectedDishIds]);

  const totalSelectedAmount = useMemo(() => {
    return selectedDishes.reduce((sum, d) => sum + d.price, 0);
  }, [selectedDishes]);

  const availableFilteredDishes = useMemo(() => {
    return filteredDishes.filter((d) => d.available);
  }, [filteredDishes]);

  const isAllSelected = useMemo(() => {
    if (availableFilteredDishes.length === 0) return false;
    return availableFilteredDishes.every((d) => selectedDishIds.has(d.id));
  }, [availableFilteredDishes, selectedDishIds]);

  // Multi-select handlers
  const handleToggleSelect = (dish: DishItem) => {
    if (!dish.available) {
      toast.warning('暂不可选', `${dish.name} 现已售罄或暂停供应`);
      return;
    }
    if (!isMultiSelectMode) {
      setIsMultiSelectMode(true);
    }
    setSelectedDishIds((prev) => {
      const next = new Set(prev);
      if (next.has(dish.id)) {
        next.delete(dish.id);
      } else {
        next.add(dish.id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedDishIds(new Set());
      setIsMultiSelectMode(false);
      toast.info('已清空并退出自选');
    } else {
      const allIds = new Set(availableFilteredDishes.map((d) => d.id));
      setSelectedDishIds(allIds);
      setIsMultiSelectMode(true);
      toast.success('已勾选当前所有在售菜品', `共选中 ${allIds.size} 款菜品，可点击下方批量加入购物车`);
    }
  };

  const handleClearSelection = () => {
    setSelectedDishIds(new Set());
  };

  const handleExitMultiSelect = () => {
    setIsMultiSelectMode(false);
    setSelectedDishIds(new Set());
  };

  const handleBatchAddToCart = () => {
    if (selectedDishes.length === 0) return;

    selectedDishes.forEach((dish) => {
      if (dish.available) {
        handleAddToCart(dish, 1, {}, dish.price, false);
      }
    });

    toast.success('批量加购成功', `已将 ${selectedDishes.length} 件餐品加入选购单`);
    handleClearSelection();
    setActiveNavTab('cart');
  };

  // Cart operations
  const handleAddToCart = (
    dish: DishItem,
    quantity: number,
    selectedOptions: Record<string, string>,
    totalPrice: number,
    showToastAlert = true,
    selectedVariant?: DishVariant
  ) => {
    if (!dish.available) {
      toast.error('加购失败', `${dish.name} 暂时缺货`);
      return;
    }

    const optionKey = Object.entries(selectedOptions)
      .sort()
      .map(([k, v]) => `${k}:${v}`)
      .join('|');
    const variantKey = selectedVariant ? `var:${selectedVariant.id}` : '';
    const cartItemId = `${dish.id}-${variantKey}-${optionKey}`;

    setCart((prev) => {
      const existingIdx = prev.findIndex((i) => i.cartItemId === cartItemId);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].quantity += quantity;
        updated[existingIdx].calculatedPrice += totalPrice;
        return updated;
      } else {
        return [
          ...prev,
          {
            cartItemId,
            dish,
            quantity,
            selectedOptions,
            selectedVariant,
            calculatedPrice: totalPrice
          }
        ];
      }
    });

    if (truckExpandConfig.collapseOnAddToCart && isPullUpMenuOpen) {
      setIsPullUpMenuOpen(false);
    }
    if (showToastAlert) {
      const variantTitle = selectedVariant ? ` (${selectedVariant.name})` : '';
      toast.success('已加入选购单', `${dish.name}${variantTitle} x${quantity} (¥${totalPrice.toFixed(2)})`);
    }
  };

  const handleQuickAdd = (dish: DishItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!dish.available) {
      toast.warning('暂不可选', `${dish.name} 已售罄或暂时无法供应`);
      return;
    }

    // If has required options or variants, open modal for customization
    if ((dish.optionGroups && dish.optionGroups.length > 0) || (dish.variants && dish.variants.length > 0)) {
      setSelectedDishForDetail(dish);
      return;
    }

    handleAddToCart(dish, 1, {}, dish.price, true);
    if (truckExpandConfig.collapseOnAddToCart && isPullUpMenuOpen) {
      setIsPullUpMenuOpen(false);
    }
  };

  const handleUpdateCartQuantity = (cartItemId: string, newQty: number) => {
    if (newQty <= 0) {
      setCart((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
      toast.info('已移除餐品');
    } else {
      setCart((prev) =>
        prev.map((item) => {
          if (item.cartItemId === cartItemId) {
            const unitPrice = item.calculatedPrice / item.quantity;
            return {
              ...item,
              quantity: newQty,
              calculatedPrice: unitPrice * newQty
            };
          }
          return item;
        })
      );
    }
  };

  const handleRemoveCartItem = (cartItemId: string) => {
    setCart((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
    toast.info('已从选购单移除');
  };

  const handleClearCart = () => {
    setCart([]);
    toast.info('选购单已清空');
  };

  const handleCheckout = (
    notes: string,
    couponCode?: string,
    paymentMethod?: string,
    paymentVoucher?: PaymentVoucher
  ): string | void => {
    const userUidSuffix = userProfile.uid.slice(-4);
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const isDineIn = diningMode === 'dine_in';
    const isPickup = diningMode === 'pickup';
    const newOrderNo = paymentVoucher?.orderNo || (isDineIn
      ? `UR-DIN-${randomSuffix}`
      : isPickup
      ? `UR-PK-${randomSuffix}`
      : `UR-${randomSuffix}`);

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    const discount = (couponCode || isVIPActive) ? 5 : 0;
    const deliveryFee = diningMode === 'delivery' ? (totalCartPrice >= 80 ? 0 : 5) : 0;
    const finalAmount = Math.max(0, totalCartPrice + deliveryFee - discount);

    const boundTbl = isDineIn ? getCurrentBoundTable() : null;
    const finalDeliveryAddress = isDineIn
      ? `${boundTbl?.zoneLabel || '餐车外摆区'} · ${boundTbl?.code || 'A2'} 号桌 (${boundTbl?.guests || 2}人就餐)`
      : isPickup
      ? '黑曜石流动餐车 01 号（大悦城北座中庭 · 自提专窗）'
      : deliveryAddress;

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNo: newOrderNo,
      userId: userProfile.uid,
      userPhone: userProfile.phone,
      customerName: userProfile.nickname || '先锋食客',
      channelType: diningMode,
      channel: diningMode,
      tableCode: boundTbl?.code || (isDineIn ? 'A2' : undefined),
      tableId: boundTbl?.id || (isDineIn ? 'tbl-2' : undefined),
      tableZone: boundTbl?.zoneLabel || (isDineIn ? '餐车外摆休闲区' : undefined),
      serverName: boundTbl?.serverName || (isDineIn ? '阿豪 (No.02)' : undefined),
      items: cart.map((i) => ({
        name: i.dish.name,
        quantity: i.quantity,
        price: i.calculatedPrice / i.quantity,
        options: Object.values(i.selectedOptions).join(', ')
      })),
      totalAmount: finalAmount,
      paymentMethod: paymentMethod || 'wechat',
      paymentVoucher: paymentVoucher,
      status: 'cooking',
      statusText: isDineIn
        ? '后厨现制出餐中 (堂食)'
        : isVIPActive
        ? 'VIP 优先现制中'
        : '餐车现制中',
      createdTime: timeStr,
      estimatedDeliveryTime: isDineIn ? '约 8-10 分钟传菜上桌' : '约 12 分钟后',
      etaMinutes: isDineIn ? 8 : 12,
      courierName: isDineIn ? undefined : '黑曜石专线急速送餐员 (专线 01)',
      courierPhone: isDineIn ? undefined : '138-1829-9201',
      deliveryAddress: finalDeliveryAddress,
      truckName: truck.name,
      progressPercent: 30
    };

    // 如果是堂食模式，将订单和菜品深度绑定到商家端对应桌台
    if (isDineIn) {
      bindOrderToMerchantTable(
        boundTbl?.code || 'A2',
        newOrderNo,
        cart.map((i) => ({
          name: i.dish.name,
          quantity: i.quantity,
          price: i.calculatedPrice / i.quantity
        })),
        finalAmount,
        boundTbl?.guests || 2
      );
      // 绑定桌台后推送云端桌台集合，保障跨设备商家端可见 (防抖在商家端已有; 此处直接同步一次)
      syncSingleModuleToCloud('tables').catch(() => {});
    }

    setOrders((prev) => [newOrder, ...prev]);
    setActiveTrackingOrderId(newOrder.id);
    createCloudOrder(newOrder, userProfile.uid);
    setCart([]);
    toast.success(
      isDineIn ? '堂食订单已成功提交！' : '订单已成功提交并同步至腾讯云！',
      isDineIn
        ? `订单号 ${newOrderNo} · 已绑定 ${boundTbl?.code || 'A2'} 号桌，后厨火速现制中`
        : `订单号 ${newOrderNo} (UID: ${userProfile.uid.slice(-6)})，餐车正在火速为您现制`
    );
    return newOrderNo;
  };

  const isManualScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleCategorySelect = (cat: CategoryType) => {
    setActiveCategory(cat);
    setActiveSubCategory('all');
    setOnlyDiscountFilter(false);
    setCategoryScrollProgress(0);
    setHighlightedCategorySection(cat);

    if (soundFeedbackEnabled) {
      playCategorySnapSound();
    }

    // Set lock flag so scrollspy doesn't override during smooth scroll animation
    isManualScrollingRef.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isManualScrollingRef.current = false;
      setHighlightedCategorySection(null);
    }, 1100);

    // Smooth scroll to target category section breakpoint
    const sectionEl = document.getElementById(`category-section-${cat}`);
    if (sectionEl) {
      const scrollContainer = mainScrollContainerRef.current;
      if (scrollContainer) {
        const containerTop = scrollContainer.getBoundingClientRect().top;
        const elementTop = sectionEl.getBoundingClientRect().top;
        const currentScroll = scrollContainer.scrollTop;
        const stickyOffset = 6;
        const targetScroll = currentScroll + (elementTop - containerTop) - stickyOffset;
        scrollContainer.scrollTo({
          top: Math.max(0, targetScroll),
          behavior: 'smooth'
        });
      } else {
        const headerEl = document.getElementById('main-unified-header');
        const headerHeight = headerEl ? headerEl.offsetHeight : 52;
        const stickyOffset = headerHeight + 14;
        const elementPosition = sectionEl.getBoundingClientRect().top + window.scrollY;
        const offsetPosition = Math.max(0, elementPosition - stickyOffset);

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }

    // Trigger Category Brand Popup if conditions are met
    if (cat !== 'all' && cat !== 'popular') {
      const brandConfigs = getCategoryBrandConfigs();
      const cfg = brandConfigs[cat];
      if (cfg && shouldShowCategoryBrandModal(cat, cfg)) {
        setActiveCategoryBrandModal(cfg);
        recordCategoryBrandModalSeen(cat);
      }
    }
  };

  const scrollEndTimerRef = useRef<NodeJS.Timeout | null>(null);
  const toastInfoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 联动滚动监听器 (ScrollSpy) — 菜品卡片滚动时实时联动侧边栏与微触感反馈机制
  useEffect(() => {
    if (activeNavTab !== 'home') return;

    let ticking = false;
    const scrollContainer = mainScrollContainerRef.current;

    const handleWindowScrollSpy = () => {
      if (isManualScrollingRef.current) return;

      setIsScrollingDishes(true);
      if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
      scrollEndTimerRef.current = setTimeout(() => {
        setIsScrollingDishes(false);
      }, 250);

      if (!ticking) {
        window.requestAnimationFrame(() => {
          ticking = false;
          if (isManualScrollingRef.current) return;

          const sectionElements = document.querySelectorAll<HTMLElement>('[data-category-section]');
          if (sectionElements.length === 0) return;

          // 计算断点激活线：当在独立滚动主容器中时，以容器顶部+35px为判定线
          const containerRect = scrollContainer?.getBoundingClientRect();
          const headerEl = document.getElementById('main-unified-header');
          const headerRect = headerEl?.getBoundingClientRect();
          const activationThreshold = containerRect
            ? containerRect.top + 35
            : (headerRect ? headerRect.bottom + 25 : 77);

          // 页面触底检测：当到达底部附近时，自动高亮最后一个在售品类（如酥脆小食）
          const isNearBottom = scrollContainer
            ? scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 60
            : window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 160;

          if (isNearBottom) {
            const lastSection = sectionElements[sectionElements.length - 1];
            const lastCat = lastSection?.getAttribute('data-category-section') as CategoryType;
            if (lastCat) {
              if (lastCat !== activeCategory) {
                setActiveCategory(lastCat);
                if (soundFeedbackEnabled) {
                  const idx = ORDERED_CATEGORY_KEYS.indexOf(lastCat);
                  playCategoryLinkSound(idx >= 0 ? idx : 0);
                }
              }
              setCategoryScrollProgress(1);
            }
            return;
          }

          let activeSectionId: CategoryType | null = null;
          let currentSectionProgress = 0;

          // 遍历各个分类断点，找到视口激活线下方/交汇的最优断点，并计算该分类内部的滚动进度
          sectionElements.forEach((el) => {
            const sectionCat = el.getAttribute('data-category-section') as CategoryType;
            const rect = el.getBoundingClientRect();
            // 只要断点的 top 小于等于激活线，说明已经滚动进入此分类
            if (rect.top <= activationThreshold) {
              activeSectionId = sectionCat;
              const sectionHeight = Math.max(rect.height, 1);
              const scrolledPast = activationThreshold - rect.top;
              currentSectionProgress = Math.max(0, Math.min(1, scrolledPast / sectionHeight));
            }
          });

          // 若尚未滚入第一分类或者位于页面顶部区域，默认高亮第一个展示分类
          if (!activeSectionId && sectionElements.length > 0) {
            const firstCat = sectionElements[0].getAttribute('data-category-section') as CategoryType;
            if (firstCat) {
              activeSectionId = firstCat;
              currentSectionProgress = 0;
            }
          }

          if (activeSectionId) {
            setCategoryScrollProgress(Number(currentSectionProgress.toFixed(2)));

            if (activeSectionId !== activeCategory) {
              setActiveCategory(activeSectionId);

              // 触发品类切换反馈 (微触感音效 + 联动提示 HUD)
              if (soundFeedbackEnabled) {
                const idx = ORDERED_CATEGORY_KEYS.indexOf(activeSectionId);
                playCategoryLinkSound(idx >= 0 ? idx : 0);
              }

              const cfg = CATEGORY_TAXONOMY[activeSectionId];
              if (cfg) {
                const count = categoryCounts[activeSectionId] || 0;
                setLinkageToastInfo({
                  catName: cfg.name,
                  icon: cfg.icon || '🍽️',
                  count
                });
                if (toastInfoTimeoutRef.current) clearTimeout(toastInfoTimeoutRef.current);
                toastInfoTimeoutRef.current = setTimeout(() => {
                  setLinkageToastInfo(null);
                }, 1300);
              }
            }
          }
        });
        ticking = true;
      }
    };

    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleWindowScrollSpy, { passive: true });
    }
    window.addEventListener('scroll', handleWindowScrollSpy, { passive: true });
    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleWindowScrollSpy);
      }
      window.removeEventListener('scroll', handleWindowScrollSpy);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
      if (toastInfoTimeoutRef.current) clearTimeout(toastInfoTimeoutRef.current);
    };
  }, [activeNavTab, activeCategory, soundFeedbackEnabled, categoryCounts]);

  const handleScrollToMenu = () => {
    if (menuSectionRef.current) {
      menuSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleNavSelect = (tab: NavTabType) => {
    if (tab === 'home') {
      setNavHistory(['home']);
      setActiveNavTab('home');
      if (mainScrollContainerRef.current) {
        mainScrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigateTo(tab);
    }
    if (tab !== 'home' && truckExpandConfig.collapseOnNavigate && isPullUpMenuOpen) {
      setIsPullUpMenuOpen(false);
    }
  };

  if (currentRole === 'merchant') {
    return (
      <>
        <MerchantSystemView
          dishes={dishes}
          orders={orders}
          truck={truck}
          initialTab={merchantInitialTab as any}
          merchantSession={merchantSession}
          onOpenPhoneAuth={() => {
            setTargetAuthRole('merchant');
            setIsStaffRiderAuthModalOpen(true);
          }}
          onLogoutMerchant={() => {
            logoutMerchant();
            setMerchantSession(null);
            setCurrentRole('customer');
            toast.info('已退出商家工作台');
          }}
          onUpdateDishes={setDishes}
          onAdvanceOrderStatus={handleAdvanceOrderStatus}
          onRejectOrder={handleRejectOrder}
          onUpdateTruckLocation={handleUpdateTruckLocation}
          onSwitchRole={handleSelectRole}
          onAuditRefund={handleAuditRefund}
          onToggleNonRefundable={handleToggleNonRefundable}
        />
        <CloudbaseStatusModal
          isOpen={isCloudbaseModalOpen}
          onClose={() => setIsCloudbaseModalOpen(false)}
          dishes={dishes}
          orders={orders}
          onDishesUpdated={setDishes}
          isConnected={isCloudbaseConnected}
          authUserId={cloudbaseAuthUserId}
        />
        <StaffRiderPhoneAuthModal
          isOpen={isStaffRiderAuthModalOpen}
          role={targetAuthRole}
          onClose={() => setIsStaffRiderAuthModalOpen(false)}
          onSuccess={handleStaffRiderAuthSuccess}
        />
      </>
    );
  }

  if (currentRole === 'rider') {
    return (
      <>
        <RiderSystemView
          orders={orders}
          truck={truck}
          riderSession={riderSession}
          onOpenPhoneAuth={() => {
            setTargetAuthRole('rider');
            setIsStaffRiderAuthModalOpen(true);
          }}
          onLogoutRider={() => {
            logoutRider();
            setRiderSession(null);
            setCurrentRole('customer');
            toast.info('已退出骑士专送工作台');
          }}
          onAdvanceOrderStatus={handleAdvanceOrderStatus}
          onUpdateTruckLocation={handleUpdateTruckLocation}
          onSwitchRole={handleSelectRole}
        />
        <CloudbaseStatusModal
          isOpen={isCloudbaseModalOpen}
          onClose={() => setIsCloudbaseModalOpen(false)}
          dishes={dishes}
          orders={orders}
          onDishesUpdated={setDishes}
          isConnected={isCloudbaseConnected}
          authUserId={cloudbaseAuthUserId}
        />
        <StaffRiderPhoneAuthModal
          isOpen={isStaffRiderAuthModalOpen}
          role={targetAuthRole}
          onClose={() => setIsStaffRiderAuthModalOpen(false)}
          onSuccess={handleStaffRiderAuthSuccess}
        />
      </>
    );
  }

  if (currentRole === 'platform') {
    return (
      <div className="min-h-screen bg-[#f9f9f7] text-[#1a1c1b] flex flex-col antialiased">
        <Header
          cartCount={totalCartCount}
          onOpenCart={() => navigateTo('cart')}
          onOpenRadar={() => navigateTo('tracking')}
          onOpenVIP={() => setIsVIPModalOpen(true)}
          isVIPActive={isVIPActive}
          diningMode={diningMode}
          onDiningModeChange={handleDiningModeChange}
          deliveryAddress={deliveryAddress}
          onChangeAddress={() => setIsAddressModalOpen(true)}
          currentRole={currentRole}
          onSelectRole={handleSelectRole}
          pendingOrdersCount={orders.filter((o) => o.status === 'cooking').length}
          activeNavTab={activeNavTab}
          previousNavTab={previousNavTab}
          onBackToMenu={handleBackNav}
          onOpenCloudbaseModal={() => setIsCloudbaseModalOpen(true)}
          onOpenMessageForm={() => setIsMessageFormModalOpen(true)}
          isCloudbaseConnected={isCloudbaseConnected}
          deliveryEvaluation={deliveryEvaluation}
        />
        <main className="max-w-7xl w-full mx-auto px-2 sm:px-4 py-2 flex-grow">
          <PlatformSystemView
            orders={orders}
            onSelectRole={handleSelectRole}
            showToast={(msg) => toast.info(msg)}
          />
        </main>
        <CloudbaseStatusModal
          isOpen={isCloudbaseModalOpen}
          onClose={() => setIsCloudbaseModalOpen(false)}
          dishes={dishes}
          orders={orders}
          onDishesUpdated={setDishes}
          isConnected={isCloudbaseConnected}
          authUserId={cloudbaseAuthUserId}
        />
        <OrderHistoryMessagesModal
          isOpen={isMessageFormModalOpen}
          onClose={() => setIsMessageFormModalOpen(false)}
          orders={orders}
          dishes={dishes}
          viewerRole={currentRole}
          onAdvanceOrderStatus={handleAdvanceOrderStatus}
          onRejectOrder={handleRejectOrder}
          onAuditRefund={handleAuditRefund}
          showToast={(t, d) => toast.success(t, d)}
          onTrackOrder={() => {
            setIsMessageFormModalOpen(false);
            navigateTo('tracking');
          }}
        />
      </div>
    );
  }

  return (
    <div className="h-screen h-[100dvh] max-h-[100dvh] w-full bg-[#f9f9f7] text-[#1a1c1b] flex flex-col overflow-hidden antialiased">
      {/* Top Header with Dynamic Dining Mode Selector, Role Switcher Dropdown */}
      <div className="shrink-0 w-full z-40">
        <Header
          cartCount={totalCartCount}
          onOpenCart={() => navigateTo('cart')}
          onOpenRadar={() => navigateTo('tracking')}
          onOpenVIP={() => setIsVIPModalOpen(true)}
          isVIPActive={isVIPActive}
          diningMode={diningMode}
          onDiningModeChange={handleDiningModeChange}
          deliveryAddress={deliveryAddress}
          onChangeAddress={() => setIsAddressModalOpen(true)}
          currentRole={currentRole}
          onSelectRole={handleSelectRole}
          pendingOrdersCount={orders.filter((o) => o.status === 'cooking').length}
          activeNavTab={activeNavTab}
          previousNavTab={previousNavTab}
          onBackToMenu={handleBackNav}
          onOpenCloudbaseModal={() => setIsCloudbaseModalOpen(true)}
          onOpenMessageForm={() => {
            if (activeNavTab === 'order_messages') {
              handleBackNav();
            } else {
              navigateTo('order_messages');
            }
          }}
          isCloudbaseConnected={isCloudbaseConnected}
          deliveryEvaluation={deliveryEvaluation}
        />
      </div>

      {/* Main Content Area - Independently scrollable, flex-1, strictly bounded above bottom navbar so navbar never covers content */}
      <main 
        id="main-content-scroll-area"
        ref={mainScrollContainerRef}
        className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden max-w-7xl mx-auto px-1.5 sm:px-3 pt-0 pb-6 sm:pb-8 space-y-1 sm:space-y-1.5 scroll-smooth"
      >
        {activeNavTab === 'checkout' ? (
          <CheckoutPageView
            items={cart}
            deliveryAddress={deliveryAddress}
            onChangeAddress={(addr) => {
              setDeliveryAddress(addr);
              toast.info('配送地址已修改');
            }}
            diningMode={diningMode}
            onDiningModeChange={handleDiningModeChange}
            isVIPActive={isVIPActive}
            onBackToMenu={handleBackNav}
            onUpdateCartQuantity={handleUpdateCartQuantity}
            onRemoveCartItem={handleRemoveCartItem}
            onCompleteCheckout={(notes, coupon, paymentMethod) => {
              return handleCheckout(notes, coupon, paymentMethod) || '';
            }}
            onGoToTracking={(orderId) => {
              if (orderId) setActiveTrackingOrderId(orderId);
              navigateTo('tracking');
            }}
            onGoToOrders={() => navigateTo('orders')}
          />
        ) : activeNavTab === 'cart' ? (
          <CartPageView
            items={cart}
            onUpdateQuantity={handleUpdateCartQuantity}
            onRemoveItem={handleRemoveCartItem}
            onClearCart={handleClearCart}
            onProceedToCheckout={() => navigateTo('checkout')}
            onGoToMenu={handleBackNav}
            deliveryAddress={deliveryAddress}
            onOpenAddress={() => setIsAddressModalOpen(true)}
            isVIPActive={isVIPActive}
            diningMode={diningMode}
            onDiningModeChange={handleDiningModeChange}
            currentRole={currentRole}
            onSelectRole={handleSelectRole}
            dishes={dishes}
            onAddToCart={(dish) => {
              handleAddToCart(dish, 1, {}, dish.price, false);
            }}
            onGoToCategory={(cat, subCat) => {
              handleCategorySelect(cat as CategoryType);
              if (subCat) {
                setActiveSubCategory(subCat);
              }
              navigateTo('home');
            }}
            onCompleteCheckout={(notes, coupon, paymentMethod, voucher) => {
              const res = handleCheckout(notes, coupon, paymentMethod, voucher);
              return typeof res === 'string' ? res : '';
            }}
            onGoToTracking={(orderId) => {
              if (orderId) setActiveTrackingOrderId(orderId);
              navigateTo('tracking');
            }}
          />
        ) : activeNavTab === 'tracking' ? (
          (() => {
            const activeTrackingOrder =
              (activeTrackingOrderId
                ? orders.find((o) => isOrderMatch(o, activeTrackingOrderId)) ||
                  INITIAL_ORDERS.find((o) => isOrderMatch(o, activeTrackingOrderId))
                : null) ||
              orders.find((o) => o.status === 'delivering') ||
              orders.find((o) => o.status === 'cooking') ||
              orders[0];

            return (
              <OrderTrackingView
                orderId={
                  activeTrackingOrder?.orderNo
                    ? `#${activeTrackingOrder.orderNo.replace(/^#/, '')}`
                    : activeTrackingOrder?.id || '#DEL-9912'
                }
                order={activeTrackingOrder}
                truck={truck}
                deliveryAddress={deliveryAddress}
                onBackToMenu={handleBackNav}
                onAdvanceOrderStatus={handleAdvanceOrderStatus}
                onApplyRefund={handleApplyRefund}
              />
            );
          })()
        ) : activeNavTab === 'orders' ? (
          <OrdersPageView
            orders={orders}
            onOpenRadar={(orderId) => {
              if (orderId) setActiveTrackingOrderId(orderId);
              navigateTo('tracking');
            }}
            onOpenVIP={() => setIsVIPModalOpen(true)}
            onGoToMenu={handleBackNav}
            userProfile={userProfile}
            onOrdersUpdated={setOrders}
            onApplyRefund={handleApplyRefund}
            onRefreshOrders={() => {
              setOrders((prev) =>
                prev.map((o) =>
                  o.status === 'cooking'
                    ? { ...o, status: 'delivering', statusText: '配送中', progressPercent: 75, etaMinutes: 6 }
                    : o
                )
              );
              toast.success('订单状态已刷新');
            }}
          />
        ) : activeNavTab === 'profile' ? (
          <ProfilePageView
            onOpenRadar={() => navigateTo('tracking')}
            onOpenVIP={() => setIsVIPModalOpen(true)}
            onOpenAddress={() => setIsAddressModalOpen(true)}
            onOpenCoupons={() => navigateTo('coupons')}
            onOpenCloudSync={() => setIsCloudbaseModalOpen(true)}
            onGoToMenu={handleBackNav}
            currentAddress={deliveryAddress}
            isVIPActive={isVIPActive}
            userProfile={userProfile}
            onProfileUpdated={setUserProfile}
            orders={orders}
            onOrdersUpdated={setOrders}
          />
        ) : activeNavTab === 'coupons' ? (
          <UserCouponsPageView
            onBackToMenu={handleBackNav}
            onGoToCategory={(cat) => {
              handleCategorySelect(cat);
              navigateTo('home');
            }}
            onOpenVIP={() => setIsVIPModalOpen(true)}
            isVIPActive={isVIPActive}
          />
        ) : activeNavTab === 'order_messages' ? (
          <OrderHistoryMessagesView
            orders={orders}
            dishes={dishes}
            viewerRole={currentRole}
            onBackToMenu={handleBackNav}
            onTrackOrder={(ordId) => {
              setActiveTrackingOrderId(ordId);
              navigateTo('tracking');
            }}
            onAdvanceOrderStatus={handleAdvanceOrderStatus}
            onRejectOrder={handleRejectOrder}
            onAuditRefund={handleAuditRefund}
            showToast={(t, d) => toast.success(t, d)}
          />
        ) : (
          <>
            {/* Filters, View Switcher & Search (全新设计设计顶栏) */}
            <div
              ref={menuSectionRef}
              className="relative z-30 bg-white py-2 px-1 sm:px-2 transition-all"
            >
              <FilterBar
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                activeCategory={activeCategory}
                onCategoryChange={handleCategorySelect}
                activeSubCategory={activeSubCategory}
                onSubCategoryChange={setActiveSubCategory}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                categoryCounts={categoryCounts}
                onOpenFilterModal={() => setIsFilterModalOpen(true)}
                activeFilterCount={activeFilterCount}
                isMultiSelectMode={isMultiSelectMode}
                onToggleMultiSelectMode={() => {
                  setIsMultiSelectMode((prev) => {
                    const next = !prev;
                    if (!next) {
                      setSelectedDishIds(new Set());
                      toast.info('已退出自选模式');
                    } else {
                      setSelectedDishIds(new Set());
                      toast.info('已开启自选模式', '请自主点击菜品卡片勾选您心仪的餐品');
                    }
                    return next;
                  });
                }}
                isAllSelected={isAllSelected}
                onToggleSelectAll={handleToggleSelectAll}
                selectedCount={selectedDishes.length}
                allDishes={dishes}
                searchResults={filteredDishes}
                onSelectDish={(d) => setSelectedDishForDetail(d)}
                onQuickAdd={(d, e) => handleQuickAdd(d, e)}
                diningMode={diningMode}
                onlyDiscountFilter={onlyDiscountFilter}
                onToggleDiscountFilter={() => setOnlyDiscountFilter((prev) => !prev)}
                hideHorizontalCategories={true}
              />

              {/* Multi-Select Custom Guide Banner (提醒用户自主点选) */}
              {isMultiSelectMode && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="mt-2 bg-neutral-900 text-white px-3 sm:px-3.5 py-2 rounded-xl text-xs flex items-center justify-between shadow-2xs gap-2 border border-neutral-800"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span className="truncate text-neutral-200">
                      <strong className="text-white">自选模式已开启</strong>：请在菜品卡片上自主点选
                      {selectedDishes.length > 0 ? (
                        <span className="ml-1 text-emerald-400 font-bold">（已勾选 {selectedDishes.length} 款）</span>
                      ) : (
                        <span className="ml-1 text-neutral-400">（点击任意菜品卡片即可勾选）</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {selectedDishes.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDishIds(new Set());
                          toast.info('已清空勾选');
                        }}
                        className="text-neutral-400 hover:text-white underline text-[11px] cursor-pointer"
                      >
                        清空
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setIsMultiSelectMode(false);
                        setSelectedDishIds(new Set());
                        toast.info('已退出自选模式');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-neutral-800 border border-neutral-700 text-white hover:bg-neutral-700 font-semibold text-[11px] shadow-2xs cursor-pointer transition-colors"
                    >
                      退出自选
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Smart Delivery Range Guidance Banner (Prompts user distance, radius, and quick actions) */}
            {diningMode === 'delivery' && (
              <DeliveryRangeGuideBanner
                evaluation={deliveryEvaluation}
                onOpenRangeDetails={() => setIsDeliveryRangeModalOpen(true)}
                onSwitchToPickup={() => {
                  setDiningMode('pickup');
                  toast.info('已切换为到车自提模式 (免配送费/无配送范围限制)');
                }}
                onChangeAddress={() => setIsAddressModalOpen(true)}
              />
            )}

            {/* Menu Dishes Sequential Content: Displayed by Category in Ordered Sequence with Linked Breakpoints */}
            <div className="w-full min-w-0 pt-1">
              {isLoadingMenu ? (
                <DishSkeletonGrid count={6} viewMode={viewMode} />
              ) : categorySections.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border border-[#e2e3e1] space-y-3.5 shadow-xs">
                  <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto text-[#787770] shadow-2xs">
                    <FilterX className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-black">未找到符合条件的菜品</h3>
                    <p className="text-xs text-[#787770] max-w-sm mx-auto mt-1">
                      {onlyDiscountFilter
                        ? '当前分类下暂无专属特惠菜品，可重置特惠筛选或查看全部'
                        : '尝试清除搜索关键词或重置筛选条件，查看黑曜石餐车全部招牌佳肴。'}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCategory('popular');
                        setSearchQuery('');
                        setOnlyDiscountFilter(false);
                        setFilterOptions(INITIAL_FILTER_OPTIONS);
                        toast.info('已重置所有筛选条件');
                      }}
                      className="px-4 py-2 bg-black text-white text-xs font-semibold rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                    >
                      <span>重置并查看全部</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRefreshMenu}
                      className="px-3.5 py-2 bg-neutral-100 text-neutral-800 text-xs font-semibold rounded-xl hover:bg-neutral-200 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>刷新数据</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-1.5 sm:gap-2.5 pt-1">
                  {/* Left Column: Delivery Category Sidebar (外卖专业分类侧边栏，支持动态深度进度轨/触觉音效/角标/联动高亮) */}
                  <DeliveryCategorySidebar
                    categories={ORDERED_CATEGORY_KEYS}
                    activeCategory={activeCategory}
                    onSelectCategory={handleCategorySelect}
                    categoryCounts={categoryCounts}
                    categoryCartCounts={categoryCartCounts}
                    categoryScrollProgress={categoryScrollProgress}
                    isScrolling={isScrollingDishes}
                    soundFeedbackEnabled={soundFeedbackEnabled}
                    onToggleSoundFeedback={() => setSoundFeedbackEnabled((prev) => !prev)}
                  />

                  {/* Right Column: Ordered Category Breakpoints & Dish Stream */}
                  <div className="flex-1 min-w-0 space-y-6 sm:space-y-8">
                    {categorySections.map((section) => {
                      const isCurrentActive = activeCategory === section.catKey;
                      const isHighlighted = highlightedCategorySection === section.catKey;

                      return (
                      <section
                        key={section.catKey}
                        id={`category-section-${section.catKey}`}
                        data-category-section={section.catKey}
                        className="scroll-mt-16 sm:scroll-mt-20 space-y-2.5 sm:space-y-3 transition-all duration-300 rounded-2xl p-1 -m-1"
                      >
                        {/* Category Breakpoint Header or Store Campaign Carousel for popular */}
                        {section.catKey === 'popular' && menuDesignSystem.carousel?.enabled ? (
                          <StoreCampaignCarousel
                            designSystem={menuDesignSystem}
                            categoryName={section.category.name}
                            categoryIcon={section.category.icon}
                            categoryTagline={section.category.tagline}
                            categoryBadge={section.category.badge}
                            categoryBubblePill={section.category.bubblePill}
                            dishCount={section.dishes.length}
                            isCurrentActive={isCurrentActive}
                            isHighlighted={isHighlighted}
                            categoryScrollProgress={categoryScrollProgress}
                            onNavigateCategory={(cat) => handleCategorySelect(cat as any)}
                            onOpenMerchantDesign={() => {
                              setMerchantInitialTab('menu_design');
                              setCurrentRole('merchant');
                            }}
                            onClaimCoupon={(coupon) => {
                              toast.success(`已为您激活【${coupon}】优惠券！`, '结算时将自动应用抵扣');
                            }}
                          />
                        ) : (
                          <div
                            className="relative overflow-hidden flex flex-col px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl transition-all duration-300 bg-white/95 backdrop-blur-xs border border-[#e8e8e6] shadow-2xs hover:border-neutral-300"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-xs sm:text-sm shadow-2xs shrink-0 select-none transition-all duration-300 bg-neutral-900 text-white"
                                >
                                  <span>{section.category.icon}</span>
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <h2
                                      className={`text-xs sm:text-sm tracking-tight transition-colors ${
                                        isCurrentActive ? 'font-black text-neutral-950 scale-101' : 'font-bold text-neutral-800'
                                      }`}
                                    >
                                      {section.category.name}
                                    </h2>
                                    {isCurrentActive && (
                                      <motion.span
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-neutral-900 text-white leading-none shadow-xs flex items-center gap-1"
                                      >
                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                        <span>正在浏览 · 侧栏联动中</span>
                                      </motion.span>
                                    )}
                                    {isHighlighted && (
                                      <motion.span
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-neutral-950 text-neutral-200 leading-none shadow-xs border border-neutral-700"
                                      >
                                        🎯 已精准对齐
                                      </motion.span>
                                    )}
                                    {section.category.bubblePill && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-neutral-900 text-white leading-none shadow-2xs">
                                        {section.category.bubblePill}
                                      </span>
                                    )}
                                    {section.category.badge && (
                                      <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-800 border border-neutral-200">
                                        {section.category.badge}
                                      </span>
                                    )}
                                  </div>
                                  {section.category.tagline && (
                                    <p className="text-[10px] sm:text-[11px] text-[#787770] truncate max-w-xs sm:max-w-md">
                                      {section.category.tagline}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span
                                  className={`text-[10px] sm:text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg border transition-all ${
                                    isCurrentActive
                                      ? 'bg-neutral-900 text-white border-neutral-900 font-bold shadow-2xs'
                                      : 'bg-neutral-100 text-neutral-600 border-neutral-200'
                                  }`}
                                >
                                  {section.dishes.length} 款
                                </span>
                              </div>
                            </div>

                            {/* 联动中在当前分类断点下的微滚动进度指示细轨 */}
                            {isCurrentActive && (
                              <div className="w-full h-1 bg-neutral-100 rounded-full mt-1.5 overflow-hidden">
                                <div
                                  className="h-full bg-neutral-800 rounded-full transition-all duration-75"
                                  style={{ width: `${Math.max(6, Math.min(100, Math.round(categoryScrollProgress * 100)))}%` }}
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Dishes in this Category Section */}
                        {viewMode === 'grid2' ? (
                          <div className="grid grid-cols-2 gap-x-2 sm:gap-x-3 gap-y-2.5 sm:gap-y-3.5 w-full min-w-0">
                            {section.dishes.map((dish) => {
                              const isDishOutOfRange =
                                diningMode === 'delivery' &&
                                deliveryEvaluation.isOutOfRange &&
                                (dish.orderType === 'delivery' || dish.orderType === 'both');

                              return (
                                <DishCard
                                  key={dish.id}
                                  dish={dish}
                                  diningMode={diningMode}
                                  cartQuantity={dishQuantitiesInCart[dish.id] || 0}
                                  onSelect={(d) => setSelectedDishForDetail(d)}
                                  onQuickAdd={(d, e) => handleQuickAdd(d, e)}
                                  isMultiSelectMode={isMultiSelectMode}
                                  isSelected={selectedDishIds.has(dish.id)}
                                  onToggleSelect={(d) => handleToggleSelect(d)}
                                  isOutOfRange={isDishOutOfRange}
                                  deliveryRadiusKm={deliveryEvaluation.radiusKm}
                                  currentDistanceKm={deliveryEvaluation.distanceKm}
                                  onOutOfRangeClick={() => setIsDeliveryRangeModalOpen(true)}
                                />
                              );
                            })}
                          </div>
                        ) : viewMode === 'grid' ? (
                          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-2 sm:gap-x-3 gap-y-2.5 sm:gap-y-3.5 w-full min-w-0">
                            {section.dishes.map((dish) => {
                              const isDishOutOfRange =
                                diningMode === 'delivery' &&
                                deliveryEvaluation.isOutOfRange &&
                                (dish.orderType === 'delivery' || dish.orderType === 'both');

                              return (
                                <DishCard
                                  key={dish.id}
                                  dish={dish}
                                  diningMode={diningMode}
                                  cartQuantity={dishQuantitiesInCart[dish.id] || 0}
                                  onSelect={(d) => setSelectedDishForDetail(d)}
                                  onQuickAdd={(d, e) => handleQuickAdd(d, e)}
                                  isMultiSelectMode={isMultiSelectMode}
                                  isSelected={selectedDishIds.has(dish.id)}
                                  onToggleSelect={(d) => handleToggleSelect(d)}
                                  isOutOfRange={isDishOutOfRange}
                                  deliveryRadiusKm={deliveryEvaluation.radiusKm}
                                  currentDistanceKm={deliveryEvaluation.distanceKm}
                                  onOutOfRangeClick={() => setIsDeliveryRangeModalOpen(true)}
                                />
                              );
                            })}
                          </div>
                        ) : (
                          <div className="space-y-1.5 w-full min-w-0">
                            {section.dishes.map((dish) => {
                              const isDishOutOfRange =
                                diningMode === 'delivery' &&
                                deliveryEvaluation.isOutOfRange &&
                                (dish.orderType === 'delivery' || dish.orderType === 'both');

                              return (
                                <DishListRow
                                  key={dish.id}
                                  dish={dish}
                                  diningMode={diningMode}
                                  cartQuantity={dishQuantitiesInCart[dish.id] || 0}
                                  onSelect={(d) => setSelectedDishForDetail(d)}
                                  onQuickAdd={(d, e) => handleQuickAdd(d, e)}
                                  isMultiSelectMode={isMultiSelectMode}
                                  isSelected={selectedDishIds.has(dish.id)}
                                  onToggleSelect={(d) => handleToggleSelect(d)}
                                  isOutOfRange={isDishOutOfRange}
                                  deliveryRadiusKm={deliveryEvaluation.radiusKm}
                                  currentDistanceKm={deliveryEvaluation.distanceKm}
                                  onOutOfRangeClick={() => setIsDeliveryRangeModalOpen(true)}
                                />
                              );
                            })}
                          </div>
                        )}
                      </section>
                    );
                  })}

                    {/* End of Menu Obsidian Guarantee Card */}
                    <div className="pt-6 pb-6 sm:pb-8 text-center flex flex-col items-center justify-center gap-2 text-neutral-400 select-none">
                      <div className="h-[1px] w-28 bg-gradient-to-r from-transparent via-neutral-300 to-transparent" />
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#e8e8e6] text-[11px] font-semibold text-neutral-600 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span>黑曜石 01 号餐车 · 现制热食全品类已浏览完毕</span>
                      </div>
                      <p className="text-[10px] text-neutral-400 font-mono">
                        全单即点现烹 · 优质食材锁鲜直达
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* 菜品卡片滚动与侧边栏联动反馈悬浮指示器 (Floating Linked Scroll HUD - 已按要求默认删除，保持全屏纯净点单体验；可由后台设计系统按需控制) */}
      <AnimatePresence>
        {((menuDesignSystem.theme.showScrollLinkageHud ?? false) || (truckExpandConfig.showScrollLinkageHud ?? false)) && linkageToastInfo && isScrollingDishes && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
            className="fixed top-14 sm:top-16 left-1/2 -translate-x-1/2 z-45 pointer-events-none"
          >
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-neutral-950/92 backdrop-blur-md text-white rounded-full shadow-xl border border-neutral-700/80 text-xs font-semibold">
              <span className="text-sm select-none">{linkageToastInfo.icon}</span>
              <span className="text-amber-400 font-bold">{linkageToastInfo.catName}</span>
              <span className="text-neutral-400 text-[10.5px] font-mono">
                共 {linkageToastInfo.count} 款 · 浏览 {Math.round(categoryScrollProgress * 100)}%
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Batch Action Bar for Multi-Select */}
      <BatchActionBar
        isMultiSelectMode={isMultiSelectMode}
        selectedCount={selectedDishes.length}
        totalSelectedAmount={totalSelectedAmount}
        isAllSelected={isAllSelected}
        onToggleSelectAll={handleToggleSelectAll}
        onClearSelection={handleClearSelection}
        onBatchAddToCart={handleBatchAddToCart}
        onExitMultiSelect={handleExitMultiSelect}
      />

      {/* Advanced Filter Modal */}
      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        options={filterOptions}
        onChange={setFilterOptions}
        resultCount={filteredDishes.length}
      />

      {/* Modals & Drawers */}
      <DishDetailModal
        dish={selectedDishForDetail}
        diningMode={diningMode}
        isOpen={Boolean(selectedDishForDetail)}
        onClose={() => setSelectedDishForDetail(null)}
        onAddToCart={(d, qty, opts, price, variant) => handleAddToCart(d, qty, opts, price, true, variant)}
        isOutOfRange={diningMode === 'delivery' && deliveryEvaluation.isOutOfRange}
        deliveryRadiusKm={deliveryEvaluation.radiusKm}
        currentDistanceKm={deliveryEvaluation.distanceKm}
        onSwitchToPickup={() => {
          setDiningMode('pickup');
          toast.info('已切换为到车自提模式 (免配送费/无配送范围限制)');
        }}
        onChangeAddress={() => setIsAddressModalOpen(true)}
      />

      {/* Delivery Range Diagnostic & Fleet Switching Modal */}
      <DeliveryRangeModal
        isOpen={isDeliveryRangeModalOpen}
        onClose={() => setIsDeliveryRangeModalOpen(false)}
        evaluation={deliveryEvaluation}
        activeTruck={getActiveTruckConfig()}
        onSwitchToPickup={() => {
          setDiningMode('pickup');
          setIsDeliveryRangeModalOpen(false);
          toast.info('已切换为到车自提模式 (免配送费/无配送范围限制)');
        }}
        onChangeAddress={() => {
          setIsDeliveryRangeModalOpen(false);
          setIsAddressModalOpen(true);
        }}
        onSelectTruck={(truckId) => {
          setTruckConfigVersion((v) => v + 1);
          toast.success('已切换当前选定餐车', '商品配送范围与距离已自动重新评估');
        }}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        onCheckout={handleCheckout}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setActiveNavTab('checkout');
        }}
        deliveryAddress={deliveryAddress}
        onOpenAddress={() => setIsAddressModalOpen(true)}
        isVIPActive={isVIPActive}
        diningMode={diningMode}
        onDiningModeChange={handleDiningModeChange}
        currentRole={currentRole}
        onSelectRole={handleSelectRole}
        pendingOrdersCount={orders.filter((o) => o.status === 'cooking').length}
        dishes={dishes}
        onAddToCart={(dish) => {
          handleAddToCart(dish, 1, {}, dish.price, false);
        }}
        onGoToCategory={(cat, subCat) => {
          handleCategorySelect(cat as CategoryType);
          if (subCat) {
            setActiveSubCategory(subCat);
          }
          navigateTo('home');
        }}
      />

      <VIPPerkModal
        isOpen={isVIPModalOpen}
        onClose={() => setIsVIPModalOpen(false)}
        isVIPActive={isVIPActive}
        onToggleVIP={() => {
          setIsVIPActive((v) => {
            const next = !v;
            toast.info(next ? 'VIP 权益已启用' : 'VIP 权益已暂停');
            return next;
          });
        }}
      />

      <AddressSelectorModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        currentAddress={deliveryAddress}
        onSelectAddress={(addr) => {
          setDeliveryAddress(addr);
          toast.info('配送地址已切换', addr);
        }}
      />

      <CloudbaseStatusModal
        isOpen={isCloudbaseModalOpen}
        onClose={() => setIsCloudbaseModalOpen(false)}
        dishes={dishes}
        orders={orders}
        onDishesUpdated={setDishes}
        onOrdersUpdated={setOrders}
        isConnected={isCloudbaseConnected}
        authUserId={cloudbaseAuthUserId}
      />

      <OrderHistoryMessagesModal
        isOpen={isMessageFormModalOpen}
        onClose={() => setIsMessageFormModalOpen(false)}
        orders={orders}
        dishes={dishes}
        viewerRole={currentRole}
        onAdvanceOrderStatus={handleAdvanceOrderStatus}
        onRejectOrder={handleRejectOrder}
        onAuditRefund={handleAuditRefund}
        showToast={(t, d) => toast.success(t, d)}
        onTrackOrder={() => {
          setIsMessageFormModalOpen(false);
          navigateTo('tracking');
        }}
      />

      {/* Category Brand Popup Showcase Modal */}
      <CategoryBrandModal
        isOpen={Boolean(activeCategoryBrandModal)}
        onClose={() => setActiveCategoryBrandModal(null)}
        config={activeCategoryBrandModal}
        onConfirmStartShopping={() => {
          setActiveCategoryBrandModal(null);
          handleScrollToMenu();
        }}
        onNeverShowAgain={(catId) => {
          recordCategoryBrandModalSeen(catId);
          toast.info('已记录偏好', '下次切换该品类将不再自动弹出品牌介绍');
        }}
      />

      {/* Position #3: Truck Pull-Up Menu / Drawer (Elements moved from #1) */}
      <TruckPullUpMenu
        isOpen={isPullUpMenuOpen}
        onClose={() => handleClosePullUpMenu(true)}
        truck={truck}
        orderCount={orders.length}
        deliveryAddress={deliveryAddress}
        diningMode={diningMode}
        dishes={dishes}
        onSelectDish={(d) => {
          setIsPullUpMenuOpen(false);
          setSelectedDishForDetail(d);
        }}
        onQuickAdd={(d, e) => handleQuickAdd(d, e)}
        onOpenOrders={() => {
          setIsPullUpMenuOpen(false);
          navigateTo('orders');
        }}
        onOpenRadar={() => {
          setIsPullUpMenuOpen(false);
          navigateTo('tracking');
        }}
        onOpenVIP={() => {
          setIsPullUpMenuOpen(false);
          setIsVIPModalOpen(true);
        }}
        onChangeAddress={() => {
          setIsPullUpMenuOpen(false);
          setIsAddressModalOpen(true);
        }}
        onScrollToMenu={() => {
          setIsPullUpMenuOpen(false);
          handleScrollToMenu();
        }}
        onOpenCart={() => {
          setIsPullUpMenuOpen(false);
          navigateTo('cart');
        }}
      />

      {/* Mobile Responsive Bottom Navigation */}
      {activeNavTab !== 'checkout' && (
        <BottomNavBar
          activeTab={activeNavTab}
          onSelectTab={handleNavSelect}
          cartCount={totalCartCount}
          cartTotal={totalCartPrice}
          onOpenCart={() => navigateTo('cart')}
          diningMode={diningMode}
          onDiningModeChange={handleDiningModeChange}
          orders={orders}
          onOpenOrders={() => navigateTo('orders')}
          isVIPActive={isVIPActive}
          onOpenVIP={() => setIsVIPModalOpen(true)}
          deliveryAddress={deliveryAddress}
          onChangeAddress={() => setIsAddressModalOpen(true)}
          currentRole={currentRole}
          onSelectRole={handleSelectRole}
          pendingOrdersCount={orders.filter((o) => o.status === 'cooking').length}
          onOpenCloudbase={() => setIsCloudbaseModalOpen(true)}
          isPullUpMenuOpen={isPullUpMenuOpen}
          onOpenPullUpMenu={() => setIsPullUpMenuOpen((prev) => !prev)}
          onOpenMessageHub={() => navigateTo('order_messages')}
        />
      )}

      {/* Developer Frontend Simulation & Diagnostics Station (Admin Gated) */}
      <DevFloatingDock />
      <DevAuthModal />
      <DevSimulationControlCenter
        orders={orders}
        onAdvanceOrderStatus={handleAdvanceOrderStatus}
        dishes={dishes}
        userProfile={userProfile}
        onProfileUpdated={(up) => setUserProfile(up)}
        onInjectSampleOrder={(type) => {
          const sampleDish = dishes[0] || { name: '炭烤和牛小汉堡', price: 68 };
          const newOrder: Order = {
            id: `ord-sim-${Date.now()}`,
            orderNo: `SIM-${Math.floor(1000 + Math.random() * 9000)}`,
            items: [
              {
                name: sampleDish.name,
                price: sampleDish.price || 68,
                quantity: 2,
                options: '秘制黑椒酱香'
              }
            ],
            totalAmount: (sampleDish.price || 50) * 2,
            status: type === 'cancel_flow' ? 'cancel_requested' : type === 'reassign_flow' ? 'rider_rejected' : 'ready',
            statusText: type === 'cancel_flow' ? '客户申请终止订单' : type === 'reassign_flow' ? '骑手拒单/切换骑手中' : '已制作完成/待取餐',
            createdTime: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
            estimatedDeliveryTime: '约20分钟',
            etaMinutes: 20,
            deliveryAddress: deliveryAddress || '静安区南京西路1601号越洋广场',
            truckName: truck.name,
            progressPercent: type === 'cancel_flow' ? 40 : 35
          };
          setOrders((prev) => [newOrder, ...prev]);
          safeSetStorage('obsidian_truck_orders', [newOrder, ...orders]);
          toast.success(`已注入仿真订单【${newOrder.orderNo}】并进入状态流水！`);
        }}
        onNavigateToTracking={() => navigateTo('tracking')}
      />

      {/* Staff & Rider Phone Login Modal (Mandatory phone verification while preserving hardware fingerprint) */}
      <StaffRiderPhoneAuthModal
        isOpen={isStaffRiderAuthModalOpen}
        role={targetAuthRole}
        onClose={() => setIsStaffRiderAuthModalOpen(false)}
        onSuccess={handleStaffRiderAuthSuccess}
      />
    </div>
  );
}

