import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  UtensilsCrossed,
  ShoppingBag,
  ChefHat,
  ShieldAlert,
  Radio,
  Tag,
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  Store,
  Sparkles,
  Bell,
  SlidersHorizontal,
  Scale,
  Package,
  BookOpen,
  RotateCcw,
  Shield,
  ChevronDown,
  Check,
  Layers,
  Cloud,
  Printer,
  Megaphone,
  UserCheck,
  Users,
  BellRing,
  Award,
  MapPin,
  Barcode,
  Menu as MenuIcon,
  MessageSquareText,
  Truck,
  CreditCard,
  Bike,
  GitBranch,
  Palette,
  Bluetooth,
  Crown,
  Smartphone,
  Fingerprint,
  Maximize2,
  Minimize2,
  Clock,
  Activity,
  ShieldCheck,
  ArrowRightLeft,
  Zap
} from 'lucide-react';
import { MerchantSession, maskPhoneNumber } from '../../utils/staffAndRiderAuthEngine';
import { canAccessMerchantTab, getActiveManagerOverride, ROLE_LEVEL_META } from '../../utils/rbacEngine';
import { PermissionDeniedGuard } from '../auth/PermissionDeniedGuard';
import { StaffShiftHandoverModal } from '../auth/StaffShiftHandoverModal';
import { DishItem, Order, TruckInfo, TableItem, KdsTicket, HeldOrder, TableDishItem } from '../../types';
import { INITIAL_TABLES, INITIAL_KDS_TICKETS, INITIAL_HELD_ORDERS } from '../../data/posMockData';
import { resolveOrderChannelType, normalizeOrderKey, isOrderMatch } from '../../utils/orderNormalizer';
import { merchantBackupEngine } from '../../utils/merchantBackupEngine';
import { syncSingleModuleToCloud, pullSingleModuleFromCloud } from '../../utils/cloudbase';
import { CloudbaseStatusModal } from '../CloudbaseStatusModal';
import { OrderHistoryMessagesModal } from '../chat/OrderHistoryMessagesModal';
import { MerchantScannerConsole } from './MerchantScannerConsole';
import { globalScannerEngine } from '../../utils/barcodeScannerEngine';
import { rematchAllDishImages } from '../../utils/dishImageMatcher';
import { getMerchantCommissionConfigs, MerchantCommissionConfig } from '../../utils/commissionEngine';
import { globalVersionEngine } from '../../utils/versionPointerEngine';
import { voiceAlerts } from '../../utils/voiceAlertEngine';
import { onTableCleanedRelease } from '../../utils/tableStorage';

import { MerchantTables } from './MerchantTables';
import { MerchantOrders } from './MerchantOrders';
import { MerchantKDS } from './MerchantKDS';
import { MerchantHeldOrders } from './MerchantHeldOrders';
import { MerchantStallGPS } from './MerchantStallGPS';
import { MerchantMenuChannel } from './MerchantMenuChannel';
import { MerchantAnalytics } from './MerchantAnalytics';
import { MerchantLossHub } from './MerchantLossHub';
import { MerchantInventory } from './MerchantInventory';
import { MerchantCraftSOP } from './MerchantCraftSOP';
import { MerchantShiftRefund } from './MerchantShiftRefund';
import { MerchantAuditLog } from './MerchantAuditLog';
import { MerchantVersionTrackingView } from './MerchantVersionTrackingView';
import { setAvailabilityOverride } from '../../utils/dishAvailability';
import { setDishFieldOverride } from '../../utils/dishFieldOverrides';
import { MerchantCloudSyncView } from './MerchantCloudSyncView';
import { CraftStandardView } from './CraftStandardView';
import { MerchantMarketingHub } from './MerchantMarketingHub';
import { MaterialView } from './MaterialView';
import { ProcessingLossView } from './ProcessingLossView';
import { InventoryView } from './InventoryView';
import { SkuManagementView } from './SkuManagementView';
import { MerchantVoiceControls } from './MerchantVoiceControls';
import { MerchantPrintingHub } from './MerchantPrintingHub';
import { MerchantCallingHub } from './MerchantCallingHub';
import { MerchantContingencyHub } from './MerchantContingencyHub';
import { FranchiseTenantBar } from './FranchiseTenantBar';
import { FranchiseHQModal } from './FranchiseHQModal';
import {
  globalFranchiseEngine,
  FRANCHISE_TENANT_EVENT
} from '../../utils/franchiseTenantEngine';
import { FranchiseTenantContext } from '../../types/franchise';
import { MerchantMemberCRM } from './MerchantMemberCRM';
import { MerchantUserDataCenter } from './MerchantUserDataCenter';
import { getUserDataRecords } from '../../utils/userDataRegistry';
import { MerchantStaffHub } from './MerchantStaffHub';
import { MerchantTruckExpandSettings } from './MerchantTruckExpandSettings';
import { MerchantCategoryBrandSettings } from './MerchantCategoryBrandSettings';
import { MerchantPaymentChannels } from './MerchantPaymentChannels';
import { MerchantMenuDesignSystem } from './MerchantMenuDesignSystem';
import { MerchantMasterControlCenter } from './MerchantMasterControlCenter';
import { MerchantDataFallbackCenter } from './MerchantDataFallbackCenter';
import { AutomatedSentinelDashboard } from '../common/AutomatedSentinelDashboard';
import { automatedSentinel, SentinelSystemState } from '../../utils/automatedSentinelEngine';
import { reactiveSyncBus } from '../../utils/reactiveSyncBus';
import { MerchantSidebar, TabItemConfig } from './MerchantSidebar';
import { OmniAggregatedChatHub } from '../chat/OmniAggregatedChatHub';
import { BluetoothSpeakerModal } from './BluetoothSpeakerModal';
import { globalBluetoothAudio } from '../../utils/bluetoothAudioEngine';
import { BusinessStatusModal } from './BusinessStatusModal';
import { MerchantHardwareHubModal } from './MerchantHardwareHubModal';
import { GlobalQuickCallModal } from './GlobalQuickCallModal';
import {
  BusinessStatusConfig,
  getBusinessStatus,
  toggleBusinessOperating
} from '../../utils/businessStatusEngine';

interface MerchantSystemViewProps {
  dishes: DishItem[];
  orders: Order[];
  truck: TruckInfo;
  initialTab?: MerchantTab;
  onUpdateDishes?: React.Dispatch<React.SetStateAction<DishItem[]>>;
  onAdvanceOrderStatus: (orderId: string, targetStatus?: Order['status'], extraDetails?: Partial<Order>) => void;
  onSyncOrderItems?: (orderNo: string, items: TableDishItem[]) => void;
  onRejectOrder?: (orderId: string, reason: string) => void;
  onDeleteOrder?: (orderId: string, reason?: string) => void;
  onAuditRefund?: (orderId: string, approved: boolean, rejectReason?: string) => void;
  onToggleNonRefundable?: (orderId: string, nonRefundable: boolean) => void;
  onUpdateTruckLocation?: (newLocation: string, radiusKm: number) => void;
  onSwitchRole: (role: 'customer' | 'merchant' | 'rider') => void;
  merchantSession?: MerchantSession | null;
  onOpenPhoneAuth?: () => void;
  onLogoutMerchant?: () => void;
}

export type MerchantTab =
  | 'master_control'
  | 'data_fallback'
  | 'tables'
  | 'orders'
  | 'contingency'
  | 'kds'
  | 'calling'
  | 'printing'
  | 'held'
  | 'scanner'
  | 'payment_channels'
  | 'menu_design'
  | 'marketing'
  | 'category_brands'
  | 'truck_expand'
  | 'members'
  | 'materials'
  | 'craft_standards'
  | 'processing_loss'
  | 'inventory_close'
  | 'sku_params'
  | 'loss'
  | 'inventory'
  | 'sop'
  | 'shifts'
  | 'staff'
  | 'version_tracking'
  | 'cloud_sync'
  | 'sentinel'
  | 'audit'
  | 'gps'
  | 'menu'
  | 'user_data_mgmt'
  | 'analytics';

// Storage helpers
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

export const MerchantSystemView: React.FC<MerchantSystemViewProps> = ({
  dishes,
  orders,
  truck,
  initialTab,
  onUpdateDishes,
  onAdvanceOrderStatus,
  onSyncOrderItems,
  onRejectOrder,
  onDeleteOrder,
  onAuditRefund,
  onToggleNonRefundable,
  onUpdateTruckLocation,
  onSwitchRole,
  merchantSession,
  onOpenPhoneAuth,
  onLogoutMerchant
}) => {
  const [activeTab, setActiveTab] = useState<MerchantTab>(initialTab || 'tables');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() =>
    safeGetStorage<boolean>('obsidian_merchant_sidebar_collapsed', false)
  );
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCloudbaseModalOpen, setIsCloudbaseModalOpen] = useState<boolean>(false);
  const [isMessageFormModalOpen, setIsMessageFormModalOpen] = useState<boolean>(false);
  const [isBluetoothModalOpen, setIsBluetoothModalOpen] = useState<boolean>(false);
  const [isHardwareHubOpen, setIsHardwareHubOpen] = useState<boolean>(false);
  const [isQuickCallModalOpen, setIsQuickCallModalOpen] = useState<boolean>(false);
  const [isShiftHandoverOpen, setIsShiftHandoverOpen] = useState<boolean>(false);
  const [forceRbacTick, setForceRbacTick] = useState<number>(0);
  const [btConfig, setBtConfig] = useState(() => globalBluetoothAudio.getConfig());
  const [activeBtDevice, setActiveBtDevice] = useState(() => globalBluetoothAudio.getActiveDevice());

  // 方案 C：全局快捷键 Alt+C 随时唤出即时叫号广播小窗
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.altKey && (e.key === 'c' || e.key === 'C')) ||
        (e.ctrlKey && e.shiftKey && (e.key === 'c' || e.key === 'C'))
      ) {
        e.preventDefault();
        setIsQuickCallModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleBtUpdate = () => {
      setBtConfig(globalBluetoothAudio.getConfig());
      setActiveBtDevice(globalBluetoothAudio.getActiveDevice());
    };
    window.addEventListener('obsidian_bluetooth_speaker_changed', handleBtUpdate);
    return () => window.removeEventListener('obsidian_bluetooth_speaker_changed', handleBtUpdate);
  }, []);

  // 五维自动化安全中枢 (Sentinel State) 订阅与感知注入
  const [sentinelState, setSentinelState] = useState<SentinelSystemState>(() => automatedSentinel.getState());
  useEffect(() => {
    const unsub = automatedSentinel.subscribe((next) => {
      setSentinelState({ ...next });
    });
    return () => unsub();
  }, []);

  // 1. 感知层自动闭环反馈：依据待出餐单量自动研判后厨负载
  useEffect(() => {
    const cookingOrders = orders.filter((o) => o.status === 'cooking');
    const backlogCount = cookingOrders.length;
    const avgWait = Math.max(5, Math.round(backlogCount * 3.5));
    automatedSentinel.reportKitchenStatus(backlogCount, avgWait);
  }, [orders]);

  // Franchise & Tenant Context
  const [isFranchiseHQModalOpen, setIsFranchiseHQModalOpen] = useState<boolean>(false);
  const [franchiseContext, setFranchiseContext] = useState<FranchiseTenantContext>(() =>
    globalFranchiseEngine.getContext()
  );

  // Multi-Truck Tenant Scope Isolation State
  const allMerchantTruckConfigs = useMemo(() => getMerchantCommissionConfigs(), []);
  const merchantTruckConfigs = useMemo(() => {
    return allMerchantTruckConfigs.filter((t) => franchiseContext.accessibleTruckIds.includes(t.truckId));
  }, [allMerchantTruckConfigs, franchiseContext.accessibleTruckIds]);

  const [selectedTruckId, setSelectedTruckId] = useState<string>(() => {
    const saved = safeGetStorage<string>('obsidian_merchant_selected_truck', 'truck-01');
    const ctx = globalFranchiseEngine.getContext();
    return ctx.accessibleTruckIds.includes(saved) ? saved : (ctx.currentTruckId || 'truck-01');
  });

  useEffect(() => {
    const handleTenant = (e: Event) => {
      const custom = e as CustomEvent<FranchiseTenantContext>;
      const next = custom.detail || globalFranchiseEngine.getContext();
      setFranchiseContext(next);
      if (next.currentTruckId && next.currentTruckId !== selectedTruckId) {
        setSelectedTruckId(next.currentTruckId);
      }
    };
    window.addEventListener(FRANCHISE_TENANT_EVENT, handleTenant);
    return () => window.removeEventListener(FRANCHISE_TENANT_EVENT, handleTenant);
  }, [selectedTruckId]);

  const activeTruckConfig = useMemo(() => {
    return merchantTruckConfigs.find((t) => t.truckId === selectedTruckId) || merchantTruckConfigs[0] || allMerchantTruckConfigs[0];
  }, [merchantTruckConfigs, selectedTruckId, allMerchantTruckConfigs]);

  const handleSelectTruck = (truckId: string) => {
    if (!globalFranchiseEngine.isTruckAccessible(truckId)) {
      showToast(`越权拦截：当前加盟商视角无权访问餐车 [${truckId}]！`);
      return;
    }
    setSelectedTruckId(truckId);
    globalFranchiseEngine.switchTruck(truckId);
    safeSetStorage('obsidian_merchant_selected_truck', truckId);
    const target = allMerchantTruckConfigs.find((t) => t.truckId === truckId);
    showToast(`已切换管理作用域至: 【${target?.truckName || truckId}】`);
  };

  // Subscribe to hardware barcode scanner events in merchant view
  useEffect(() => {
    const unsub = globalScannerEngine.subscribe((result) => {
      if (result.type === 'member') {
        setActiveTab('members');
        showToast(`[扫码枪] 识别会员: ${result.title}，已跳转会员CRM`);
      } else if (result.type === 'order') {
        setActiveTab('orders');
        showToast(`[扫码枪] 识别订单: ${result.title}，已跳转订单中心`);
      } else if (result.type === 'table') {
        setActiveTab('tables');
        showToast(`[扫码枪] 识别桌台: ${result.title}，已跳转堂食管理`);
      } else if (result.type === 'dish') {
        showToast(`[扫码枪] 识别菜品: ${result.title} (${result.subtitle || ''})`);
      } else if (result.type === 'coupon') {
        showToast(`[扫码枪] 核销优惠券: ${result.title}`);
      } else if (result.type === 'material') {
        setActiveTab('materials');
        showToast(`[扫码枪] 识别原料码: ${result.title}，已跳转原物料库存`);
      }
    });
    return () => unsub();
  }, []);

  // Merchant Local/Shared State with persistent local storage
  const [tables, setTables] = useState<TableItem[]>(() =>
    safeGetStorage<TableItem[]>('obsidian_merchant_tables', INITIAL_TABLES)
  );
  const [tickets, setTickets] = useState<KdsTicket[]>(() =>
    safeGetStorage<KdsTicket[]>('obsidian_merchant_tickets', INITIAL_KDS_TICKETS)
  );
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>(() =>
    safeGetStorage<HeldOrder[]>('obsidian_merchant_held_orders', INITIAL_HELD_ORDERS)
  );
  const [localOrders, setLocalOrders] = useState<Order[]>(orders);
  const [isOmniChatHubOpen, setIsOmniChatHubOpen] = useState(false);

  // Business Status (Open / Closed) Master Switch State
  const [businessStatus, setBusinessStatusState] = useState<BusinessStatusConfig>(() => getBusinessStatus());
  const [isBusinessStatusModalOpen, setIsBusinessStatusModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleStatusChanged = (e: Event) => {
      const custom = e as CustomEvent<BusinessStatusConfig>;
      if (custom.detail) {
        setBusinessStatusState(custom.detail);
      } else {
        setBusinessStatusState(getBusinessStatus());
      }
    };
    window.addEventListener('obsidian_business_status_changed', handleStatusChanged);
    return () => window.removeEventListener('obsidian_business_status_changed', handleStatusChanged);
  }, []);
  // 桌台首帧标记:挂载初期先以云端为准，避免本地初始快照直接覆盖云端更新
  const skipFirstTableSyncRef = useRef(true);

  useEffect(() => {
    safeSetStorage('obsidian_merchant_tables', tables);
    // 首次挂载不推送本地初始数据(等待云端拉取结果，防止覆盖其他端更新)
    if (skipFirstTableSyncRef.current) {
      skipFirstTableSyncRef.current = false;
      return;
    }
    // 防抖推送桌台快照至云端集合 obsidian_tables (跨端同步台位占用状态)
    const timer = setTimeout(() => {
      syncSingleModuleToCloud('tables').catch(() => {});
    }, 600);
    return () => clearTimeout(timer);
  }, [tables]);

  // 进入商家端时从云端拉取一次桌台状态，覆盖本地(仅当云端真实存在数据时)
  useEffect(() => {
    pullSingleModuleFromCloud('tables')
      .then((res) => {
        // res.error 为空才代表确实来自云端;本地回退(error 含提示)跳过，避免空转覆盖
        if (res.success && !res.error && res.data && Array.isArray(res.data) && res.data.length > 0) {
          setTables(res.data as TableItem[]);
        }
      })
      .catch(() => {});
  }, []);

  // Listen to external table update events (from client dine-in table binding or order creation)
  useEffect(() => {
    const handleTablesUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<TableItem[]>;
      if (customEvent.detail && Array.isArray(customEvent.detail)) {
        setTables(customEvent.detail);
      } else {
        setTables(safeGetStorage<TableItem[]>('obsidian_merchant_tables', INITIAL_TABLES));
      }
    };
    window.addEventListener('obsidian_tables_updated', handleTablesUpdated);
    return () => window.removeEventListener('obsidian_tables_updated', handleTablesUpdated);
  }, []);

  // 监听版本回滚引擎:桌台数据被回滚后，从权威键 obsidian_merchant_tables 重载并刷新台位矩阵
  useEffect(() => {
    const handleDataRestored = (e: Event) => {
      const detail = (e as CustomEvent<{ module?: string; fullRestore?: boolean }>).detail || {};
      if (!detail.module || detail.module === 'tables' || detail.fullRestore) {
        setTables(safeGetStorage<TableItem[]>('obsidian_merchant_tables', INITIAL_TABLES));
      }
    };
    window.addEventListener('obsidian_data_restored', handleDataRestored);
    return () => window.removeEventListener('obsidian_data_restored', handleDataRestored);
  }, []);

  // Automatic match & sync of dine-in orders (such as Order #7078) to merchant tables
  // + Reverse sync: when a dine-in order reaches a terminal state (completed/refunded/cancelled),
  //   release the bound table to cleaning (requires staff to finish cleaning before idle).
  useEffect(() => {
    const dineInOrders = orders.filter(o => resolveOrderChannelType(o) === 'dine_in');
    if (dineInOrders.length === 0) return;

    const TERMINAL_STATUSES = new Set(['completed', 'refunded', 'cancelled', 'merchant_rejected']);
    const activeDineIn = dineInOrders.filter(o => !TERMINAL_STATUSES.has(o.status));
    const terminalDineIn = dineInOrders.filter(o => TERMINAL_STATUSES.has(o.status));

    setTables(prevTables => {
      let hasChanges = false;
      const nextTables = prevTables.map(tbl => {
        // 1) Forward: bind active dine-in order to an idle/matched table
        const matchingOrder = activeDineIn.find(o => {
          if (o.tableCode && o.tableCode.toUpperCase() === tbl.code.toUpperCase()) return true;
          if (o.tableId && o.tableId === tbl.id) return true;
          if (tbl.code === 'A2' && (normalizeOrderKey(o.orderNo) === '7078' || normalizeOrderKey(o.id) === '7078')) return true;
          return false;
        });

        if (matchingOrder) {
          const cleanOrderNo = matchingOrder.orderNo.replace(/^#/, '');
          if (tbl.orderNo !== cleanOrderNo || tbl.status === 'idle') {
            hasChanges = true;
            return {
              ...tbl,
              status: tbl.status === 'idle' ? ('dining' as const) : tbl.status,
              orderNo: cleanOrderNo,
              currentGuests: tbl.currentGuests || 2,
              serverName: tbl.serverName || '小林 (No.04)',
              orderItems: (tbl.orderItems && tbl.orderItems.length > 0)
                ? tbl.orderItems
                : matchingOrder.items.map((it, idx) => ({
                    id: `matched-dish-${idx}`,
                    dishId: it.dishId || `dish-${idx}`,
                    name: it.name,
                    price: it.price,
                    quantity: it.quantity,
                    kitchenStation: 'charcoal' as const,
                    serveStatus: (matchingOrder.stepIndex && matchingOrder.stepIndex >= 3) ? ('served' as const) : ('cooking' as const)
                  }))
            };
          }
        }

        // 2) Reverse: terminal dine-in order bound to this table -> flip to cleaning + clear items
        //    (only when the table is genuinely bound to that terminal orderNo)
        const boundTerminal = terminalDineIn.find(o => {
          const oNo = (o.orderNo || '').replace(/^#/, '');
          const tblNo = (tbl.orderNo || '').replace(/^#/, '');
          if (!oNo || !tblNo) return false;
          return oNo === tblNo;
        });
        if (boundTerminal) {
          const needsClean = tbl.status !== 'cleaning' || (tbl.orderItems && tbl.orderItems.length > 0);
          if (needsClean) {
            hasChanges = true;
            return {
              ...tbl,
              status: 'cleaning' as const,
              tablePhase: undefined,
              orderItems: [],
              elapsedMinutes: 1
            };
          }
        }
        return tbl;
      });

      return hasChanges ? nextTables : prevTables;
    });
  }, [orders]);

  useEffect(() => {
    safeSetStorage('obsidian_merchant_tickets', tickets);
  }, [tickets]);

  useEffect(() => {
    safeSetStorage('obsidian_merchant_held_orders', heldOrders);
  }, [heldOrders]);

  // Sync localOrders whenever parent orders prop changes and voice alert on new incoming orders
  const prevOrderIdsRef = useRef<Set<string>>(new Set(orders.map(o => o.id)));
  useEffect(() => {
    setLocalOrders(orders);

    const currentIds = new Set(orders.map(o => o.id));
    const newArrivals = orders.filter(o => !prevOrderIdsRef.current.has(o.id));
    if (newArrivals.length > 0) {
      const latest = newArrivals[0];
      // Real-human voice announcement for new self-operated order
      voiceAlerts.newSelfOperatedOrder(
        latest.orderNo || latest.id,
        latest.totalAmount,
        latest.customerName || '自营专送食客'
      );
    }
    prevOrderIdsRef.current = currentIds;
  }, [orders]);

  // Tenant-Scoped Orders for Current Selected Truck
  const scopedOrders = useMemo(() => {
    return localOrders.filter((o) => {
      // Match explicit truckId or fallback to matching truckName substring
      if (o.truckId) {
        return o.truckId === selectedTruckId;
      }
      if (selectedTruckId === 'truck-01') {
        return !o.truckName || o.truckName.includes('01') || o.truckName.includes('南广场');
      }
      if (selectedTruckId === 'truck-02') {
        return o.truckName?.includes('02') || o.truckName?.includes('科技园');
      }
      if (selectedTruckId === 'truck-03') {
        return o.truckName?.includes('03') || o.truckName?.includes('滨江');
      }
      return false;
    });
  }, [localOrders, selectedTruckId]);

  // Tenant-Scoped Tables for Current Selected Truck
  const scopedTables = useMemo(() => {
    return tables.filter((t) => {
      if (t.truckId) {
        return t.truckId === selectedTruckId;
      }
      return selectedTruckId === 'truck-01';
    });
  }, [tables, selectedTruckId]);

  // Sync active cooking orders into KDS tickets dynamically for current truck
  useEffect(() => {
    const cookingOrders = scopedOrders.filter((o) => o.status === 'cooking');
    setTickets((prevTickets) => {
      const existingTicketNos = new Set(prevTickets.map((t) => t.ticketNo.replace('#', '')));
      const newTicketsFromOrders: KdsTicket[] = [];

      cookingOrders.forEach((co) => {
        const cleanNo = co.orderNo.replace('#', '');
        if (!existingTicketNos.has(cleanNo)) {
          newTicketsFromOrders.push({
            id: `kds-${co.id}`,
            ticketNo: co.orderNo.startsWith('#') ? co.orderNo : `#${co.orderNo}`,
            tableOrChannel: `${co.truckName || '餐车'} · 专送`,
            channelType: 'delivery',
            orderTime: co.createdTime || '刚刚',
            elapsedMinutes: 1,
            status: 'cooking',
            items: co.items.map((it, idx) => ({
              id: `item-${co.id}-${idx}`,
              dishName: it.name,
              quantity: it.quantity,
              isCompleted: false
            }))
          });
        }
      });

      if (newTicketsFromOrders.length > 0) {
        return [...prevTickets, ...newTicketsFromOrders];
      }
      return prevTickets;
    });
  }, [scopedOrders]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const allTabsConfig: TabItemConfig[] = [
    // 实时经营 — 营业高峰期的核心作业链路
    { id: 'master_control', label: '商家端总控 (用户监听/流失漏斗/备份兜底)', category: '实时经营', icon: Activity },
    { id: 'data_fallback', label: '实时经营多账号数据兜底与版本恢复', category: '实时经营', icon: ShieldCheck, badgeAlert: true },
    { id: 'tables', label: '堂食台位矩阵', category: '实时经营', icon: UtensilsCrossed, badge: tables.filter(t => t.status === 'dining').length },
    { id: 'orders', label: '全渠道订单中心', category: '实时经营', icon: ShoppingBag, badge: scopedOrders.filter(o => o.status === 'cooking' || o.status === 'pending').length },
    { id: 'kds', label: 'KDS 后厨出餐看板', category: '实时经营', icon: ChefHat, badge: tickets.length },
    { id: 'calling', label: '前台叫号取餐/等位', category: '实时经营', icon: Megaphone },
    { id: 'printing', label: '多档口拆单打印/小票', category: '实时经营', icon: Printer },
    { id: 'held', label: '未结账与挂账风控', category: '实时经营', icon: Clock, badge: heldOrders.length, badgeAlert: true },
    { id: 'contingency', label: '全链路突发情况兜底与审核中枢', category: '实时经营', icon: ShieldAlert, badge: scopedOrders.filter(o => (o.rejectionCount && o.rejectionCount > 0) || o.refundStatus === 'pending' || o.status === 'refund_pending').length, badgeAlert: true },

    // 支付财务与报表
    { id: 'payment_channels', label: '支付渠道与收款对接 (微信/支付宝/云闪付/数币)', category: '支付财务与报表', icon: CreditCard },
    { id: 'shifts', label: '收银交班/退款/预定', category: '支付财务与报表', icon: RotateCcw },
    { id: 'audit', label: '操作审计与离线队列', category: '支付财务与报表', icon: Shield },
    { id: 'analytics', label: '营收与客流大屏 (指定日期/榜单/修改删除)', category: '支付财务与报表', icon: TrendingUp },

    // 菜品供应链 — 菜品、工艺、原料、库存与损耗
    { id: 'menu', label: '菜品多渠道与沽清', category: '菜品供应链', icon: Tag },
    { id: 'menu_design', label: '菜单界面与活动轮播设计系统', category: '菜品供应链', icon: Palette, badge: 1 },
    { id: 'craft_standards', label: '制作工艺与配方标准', category: '菜品供应链', icon: BookOpen },
    { id: 'processing_loss', label: '初加工出肉率核算', category: '菜品供应链', icon: Scale },
    { id: 'materials', label: '原物料与安全库存', category: '菜品供应链', icon: Package },
    { id: 'sku_params', label: '数字参数与标准管理', category: '菜品供应链', icon: Layers },
    { id: 'inventory_close', label: '每日打烊闭环盘点', category: '菜品供应链', icon: Shield },
    { id: 'loss', label: '全链路损耗监控', category: '菜品供应链', icon: TrendingDown },

    // 营销会员
    { id: 'marketing', label: '优惠券发布与营销风控中枢', category: '营销会员', icon: SlidersHorizontal },
    { id: 'category_brands', label: '分类品牌弹窗与类目故事管理', category: '营销会员', icon: Sparkles },
    { id: 'members', label: '会员储值卡与积分资产', category: '营销会员', icon: Users },
    { id: 'user_data_mgmt', label: '用户数据中心 (统一档案)', category: '营销会员', icon: Fingerprint, badge: getUserDataRecords().length },

    // 门店与位置
    { id: 'truck_expand', label: '餐车展开与底栏气泡控制', category: '门店与位置', icon: SlidersHorizontal },
    { id: 'gps', label: '餐车停靠与 GPS 广播', category: '门店与位置', icon: Radio },

    // 系统团队与硬件
    {
      id: 'sentinel',
      label: '五维自动化安全与自闭环中枢 (Sensing-Safety)',
      category: '系统团队与硬件',
      icon: Zap,
      badge: sentinelState.activeDecisions.length,
      badgeAlert: sentinelState.threatLevel !== 'SECURE'
    },
    { id: 'staff', label: '员工花名册与岗位权限', category: '系统团队与硬件', icon: UserCheck },
    { id: 'cloud_sync', label: '腾讯云服务数据同步中枢 (CloudBase)', category: '系统团队与硬件', icon: Cloud },
    { id: 'version_tracking', label: '数据修改指针与版本追踪修复', category: '系统团队与硬件', icon: GitBranch },
    { id: 'scanner', label: '智能扫码枪硬件控制台', category: '系统团队与硬件', icon: Barcode }
  ];

  const currentTabConfig = allTabsConfig.find(t => t.id === activeTab) || allTabsConfig[0];
  const CurrentIcon = currentTabConfig.icon;

  // Categories for grouped menu (ordered by merchant daily workflow)
  const categories = ['实时经营', '支付财务与报表', '菜品供应链', '营销会员', '门店与位置', '系统团队与硬件'];

  // --- Handlers for Tables Matrix ---
  const handleOpenTable = (tableId: string, guests: number, server: string) => {
    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId
          ? {
              ...t,
              status: 'dining',
              currentGuests: guests,
              serverName: server,
              elapsedMinutes: 1,
              totalAmount: 128.0,
              tablePhase: 'cooking',
              orderNo: undefined,
              orderTime: undefined,
              orderItems: [{ name: '碳烤和牛小汉堡双重奏', quantity: 2, price: 128.0 }]
            }
          : t
      )
    );
  };

  const handleCheckoutTable = (tableId: string, discount: number, isAaSplit: boolean) => {
    // 1. 若该桌存在进行中的堂食订单，先联动推进订单至已完成(结账翻台)，保证订单中心与台位矩阵同步
    const boundTable = tables.find((t) => t.id === tableId);
    if (boundTable && boundTable.orderNo) {
      const cleanNo = String(boundTable.orderNo).replace(/^#/, '');
      const matchedOrder = orders.find(
        (o) =>
          resolveOrderChannelType(o) === 'dine_in' &&
          !['completed', 'refunded', 'cancelled', 'merchant_rejected'].includes(o.status) &&
          ((o.orderNo || '').replace(/^#/, '') === cleanNo ||
            (o.tableCode && o.tableCode.toUpperCase() === (boundTable.code || '').toUpperCase()))
      );
      if (matchedOrder && onAdvanceOrderStatus) {
        onAdvanceOrderStatus(matchedOrder.orderNo || matchedOrder.id, 'completed', {
          status: 'completed',
          stepIndex: 4,
          statusText: '餐品全齐·结账翻台'
        });
      }
    }

    // 2. 桌台翻为保洁状态并清空点餐明细与单号残留
    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId
          ? {
              ...t,
              status: 'cleaning',
              elapsedMinutes: 1,
              orderItems: [],
              tablePhase: undefined,
              orderNo: undefined,
              orderTime: undefined,
              currentGuests: undefined
            }
          : t
      )
    );
  };

  const handleTransferTable = (fromTableId: string, toTableId: string) => {
    const fromTable = tables.find((t) => t.id === fromTableId);
    if (!fromTable) return;

    setTables((prev) =>
      prev.map((t) => {
        if (t.id === fromTableId) {
          return { ...t, status: 'cleaning', elapsedMinutes: 1, orderItems: [], orderNo: undefined, orderTime: undefined, tablePhase: undefined, currentGuests: undefined };
        }
        if (t.id === toTableId) {
          return {
            ...t,
            status: 'dining',
            currentGuests: fromTable.currentGuests,
            serverName: fromTable.serverName,
            totalAmount: fromTable.totalAmount,
            orderItems: fromTable.orderItems
          };
        }
        return t;
      })
    );
  };

  const handleReleaseTable = (tableId: string) => {
    const res = onTableCleanedRelease(tableId);
    if (res.transferred && res.waitingItem && res.updatedTable) {
      setTables((prev) => prev.map((t) => (t.id === res.updatedTable!.id ? res.updatedTable! : t)));
      showToast(`桌台 ${res.updatedTable.code} 保洁完成，已自动纳入等位 ${res.waitingItem.code} (${res.waitingItem.guests}人) 入座！`);
    } else {
      setTables((prev) =>
        prev.map((t) =>
          t.id === tableId
            ? {
                ...t,
                status: 'idle',
                elapsedMinutes: 0,
                orderItems: [],
                tablePhase: undefined,
                orderNo: undefined,
                orderTime: undefined,
                totalAmount: undefined,
                currentGuests: undefined,
                serverName: undefined
              }
            : t
        )
      );
    }
  };

  const handleUpdateTable = (updatedTable: TableItem) => {
    setTables((prev) => prev.map((t) => (t.id === updatedTable.id ? updatedTable : t)));
  };

  const handleVoidTableOrder = (tableId: string, reason: string, targetStatus: 'idle' | 'cleaning' = 'idle') => {
    const targetTable = tables.find((t) => t.id === tableId);
    if (!targetTable) return;

    // 1. 若有关联订单，找到并作废/删除
    if (targetTable.orderNo) {
      const cleanOrderNo = String(targetTable.orderNo).replace(/^#/, '');
      const matchedOrder = orders.find(
        (o) =>
          resolveOrderChannelType(o) === 'dine_in' &&
          ((o.orderNo || '').replace(/^#/, '') === cleanOrderNo ||
            (o.tableCode && o.tableCode.toUpperCase() === targetTable.code.toUpperCase()))
      );
      if (matchedOrder) {
        handleDeleteOrder(matchedOrder.orderNo || matchedOrder.id, `堂食台位作废: ${reason}`);
      }
    }

    // 2. 更新桌台状态
    const updatedTable: TableItem = {
      ...targetTable,
      status: targetStatus,
      orderNo: undefined,
      orderTime: undefined,
      orderItems: [],
      totalAmount: 0,
      tablePhase: undefined,
      currentGuests: undefined,
      serverName: undefined,
      elapsedMinutes: 0
    };

    setTables((prev) => prev.map((t) => (t.id === tableId ? updatedTable : t)));

    // 3. 记录多账号协同版本控制快照
    globalVersionEngine.recordDataMutation({
      module: 'tables',
      entityId: targetTable.id,
      entityName: `${targetTable.code} 桌 (${targetTable.name})`,
      actionType: 'void_order',
      beforeData: targetTable,
      afterData: updatedTable,
      customSummary: `作废 ${targetTable.code} 桌堂食订单，原因: ${reason}; 桌位已恢复为 ${targetStatus === 'idle' ? '空闲' : '保洁'}`
    });

    showToast(`桌台 ${targetTable.code} 订单已作废并清台释放！(原因: ${reason})`);
  };

  // --- Handlers for Orders ---
  const handleAcceptOrder = (orderId: string) => {
    showToast(`已接单，工单已自动注入 KDS 后厨制作队列！`);
  };

  const handleRejectOrder = (orderId: string, reason: string) => {
    setLocalOrders((prev) => prev.filter((o) => o.id !== orderId));
    if (onRejectOrder) {
      onRejectOrder(orderId, reason);
    }
  };

  // --- Handlers for KDS ---
  const handleFinishTicket = (ticketId: string) => {
    setTickets((prev) => prev.filter((t) => t.id !== ticketId));
    // Match corresponding order and advance to ready for delivery / delivering
    const matchedOrder = orders.find(
      (o) =>
        o.id === ticketId ||
        `kds-${o.id}` === ticketId ||
        o.orderNo === ticketId ||
        ticketId.includes(o.orderNo) ||
        o.orderNo.includes(ticketId.replace('#', '').replace('kds-', '').replace('DEL-', 'UR-'))
    );
    if (matchedOrder && matchedOrder.status === 'cooking') {
      onAdvanceOrderStatus(matchedOrder.orderNo || matchedOrder.id, 'delivering');
    }
    showToast(`工单出餐完成，已通知专送骑手取餐！`);
  };

  // 全渠道订单中心与后厨删除/作废统一调度
  const handleDeleteOrder = (orderId: string, reason?: string) => {
    // 1. 从商家端本地订单集剔除
    setLocalOrders((prev) => prev.filter((o) => !isOrderMatch(o, orderId)));
    // 2. 从后厨KDS工单队列同步清理关联工单
    const cleanId = orderId.replace(/^#/, '');
    setTickets((prev) => {
      const next = prev.filter((t) => !t.ticketNo.includes(cleanId) && t.id !== orderId);
      safeSetStorage('obsidian_merchant_tickets', next);
      return next;
    });
    // 3. 调用主应用删除持久化
    if (onDeleteOrder) {
      onDeleteOrder(orderId, reason);
    }
  };

  const handleDeleteTicket = (ticketId: string, deleteAssociatedOrder: boolean, reason?: string) => {
    const targetTicket = tickets.find((t) => t.id === ticketId);
    setTickets((prev) => {
      const next = prev.filter((t) => t.id !== ticketId);
      safeSetStorage('obsidian_merchant_tickets', next);
      return next;
    });

    if (targetTicket) {
      merchantBackupEngine.logAction(
        '后厨出餐',
        'delete',
        `作废后厨工单 ${targetTicket.ticketNo}`,
        `桌位/渠道: ${targetTicket.tableOrChannel}, 原因: ${reason || '后厨手动作废删除'}`
      );
    }

    if (deleteAssociatedOrder && targetTicket) {
      const cleanNo = targetTicket.ticketNo.replace(/^#/, '');
      handleDeleteOrder(cleanNo, reason || '后厨出餐看板作废');
    } else {
      showToast(`后厨工单 ${targetTicket?.ticketNo || ticketId} 已从制作队列作废删除！`);
    }
  };

  const handleToggleItemComplete = (ticketId: string, itemId: string) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId) return t;
        return {
          ...t,
          items: t.items.map((it) => (it.id === itemId ? { ...it, isCompleted: !it.isCompleted } : it))
        };
      })
    );
  };

  const handleBatchFinishDish = (dishName: string) => {
    setTickets((prev) =>
      prev.map((t) => ({
        ...t,
        items: t.items.map((it) => (it.dishName === dishName ? { ...it, isCompleted: true } : it))
      }))
    );
  };

  // --- Handlers for Held Orders ---
  const handleResumeCheckout = (heldOrder: HeldOrder) => {
    // 恢复收银：将挂单从风控列表移除并切回桌台/收银视图，便于继续结算
    setHeldOrders((prev) => prev.filter((h) => h.id !== heldOrder.id));
    setActiveTab('tables');
  };

  const handleSendReminder = (orderId: string) => {
    // 真实催付：记录最近一次催付时间（持久化），挂单保留以便追踪回执
    const nowStr = new Date().toLocaleString('zh-CN', { hour12: false });
    setHeldOrders((prev) =>
      prev.map((h) => (h.id === orderId ? { ...h, lastReminderAt: nowStr } : h))
    );
    showToast('已向顾客手机下发催付账单短信通知！');
  };

  const handleConvertToTakeaway = (orderId: string) => {
    // 真实转外带：将堂食挂单标记为外带打包（持久化），释放堂食桌位风控
    setHeldOrders((prev) =>
      prev.map((h) =>
        h.id === orderId
          ? { ...h, convertedToTakeaway: true, tableName: '外带打包', tableCode: '外带' }
          : h
      )
    );
    showToast('挂单已转为外带保温打包，可交付顾客带走！');
  };

  const handleVoidOrder = (orderId: string) => {
    // 真实作废冲正：取消该笔挂账账单（从风控列表移除）
    setHeldOrders((prev) => prev.filter((h) => h.id !== orderId));
    showToast('挂单已作废冲正，相关账单与库存占用已取消！');
  };

  // --- Handlers for GPS ---
  const handleUpdateGPS = (newLocation: string, radiusKm: number) => {
    if (onUpdateTruckLocation) {
      onUpdateTruckLocation(newLocation, radiusKm);
    }
  };

  // --- Handlers for Menu Dishes ---
  const handleToggleAvailability = (dishId: string) => {
    if (onUpdateDishes) {
      const oldDish = dishes.find((d) => d.id === dishId);
      if (oldDish) {
        const policy = globalFranchiseEngine.getPolicy(dishId);
        const ctx = globalFranchiseEngine.getContext();
        if (policy?.isHqLocked && policy.requireHqApprovalForDelist && !ctx.isHqUser && oldDish.available) {
          showToast(`越权拦截：【${oldDish.name}】为总部核心爆品（全国统配），禁止加盟商擅自下架，需向区域督导报备！`);
          return;
        }

        globalVersionEngine.recordDataMutation({
          module: 'dishes',
          entityId: dishId,
          entityName: oldDish.name,
          actionType: 'update',
          beforeData: { id: dishId, available: oldDish.available },
          afterData: { id: dishId, available: !oldDish.available },
          customSummary: `菜品【${oldDish.name}】状态切换为：${!oldDish.available ? '恢复上架供应' : '下架/沽清'}`
        });
        setAvailabilityOverride(dishId, !oldDish.available);
      }
      onUpdateDishes((prev) =>
        prev.map((d) => (d.id === dishId ? { ...d, available: !d.available } : d))
      );
    }
  };

  const handleUpdateDish = (updatedDish: DishItem) => {
    if (onUpdateDishes) {
      const oldDish = dishes.find((d) => d.id === updatedDish.id);
      if (oldDish) {
        if (updatedDish.price !== oldDish.price) {
          const val = globalFranchiseEngine.validateDishPriceUpdate(
            updatedDish.id,
            updatedDish.name,
            updatedDish.price,
            oldDish.price
          );
          if (!val.allowed) {
            showToast(val.reason || '改价失败：超出总部价格合规红线');
            return;
          }
        }
        const policy = globalFranchiseEngine.getPolicy(updatedDish.id);
        const ctx = globalFranchiseEngine.getContext();
        if (policy?.isHqLocked && !ctx.isHqUser && updatedDish.name !== oldDish.name) {
          showToast(`越权拦截：【${oldDish.name}】为总部品牌受保护菜品，加盟商无权更改菜品名称！`);
          return;
        }

        globalVersionEngine.recordDataMutation({
          module: 'dishes',
          entityId: updatedDish.id,
          entityName: updatedDish.name,
          actionType: 'update',
          beforeData: oldDish,
          afterData: updatedDish
        });
        if (typeof updatedDish.available === 'boolean' && updatedDish.available !== oldDish.available) {
          setAvailabilityOverride(updatedDish.id, updatedDish.available);
        }
        // 种下「字段级」本地覆盖：名称/价格/描述/图片/分类/规格/排序等商家改动，
        // 刷新后不会被 fetchDishesFromCloud 的云端覆盖冲掉
        setDishFieldOverride(updatedDish.id, updatedDish);
      }
      onUpdateDishes((prev) =>
        prev.map((d) => (d.id === updatedDish.id ? updatedDish : d))
      );
    }
  };

  const handleAddNewDish = (newDish: Partial<DishItem>) => {
    if (onUpdateDishes) {
      const fullDish: DishItem = {
        id: newDish.id || `dish-${Date.now()}`,
        name: newDish.name || '新品',
        enName: newDish.enName || 'New Dish',
        price: newDish.price || 38.0,
        originalPrice: newDish.originalPrice,
        prevPrice: newDish.prevPrice,
        deliveryDiscount: newDish.deliveryDiscount,
        dineInDiscount: newDish.dineInDiscount,
        deliveryDiscountTag: newDish.deliveryDiscountTag,
        dineInDiscountTag: newDish.dineInDiscountTag,
        discountTag: newDish.discountTag,
        discountRuleNote: newDish.discountRuleNote,
        category: newDish.category || 'mains',
        subCategory: newDish.subCategory,
        subCategoryName: newDish.subCategoryName,
        typeTag: newDish.typeTag || '新品上市',
        badgeText: newDish.badgeText,
        description: newDish.description || '',
        prepTime: newDish.prepTime || '约8m',
        imageUrl: newDish.imageUrl || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
        available: newDish.available !== undefined ? newDish.available : true,
        unavailableReason: newDish.unavailableReason,
        orderType: newDish.orderType || 'both',
        optionGroups: newDish.optionGroups,
        nutrition: newDish.nutrition,
        originSource: newDish.originSource,
        chefNotes: newDish.chefNotes,
        galleryImages: newDish.galleryImages,
        spicinessLevel: newDish.spicinessLevel,
        spicinessOptions: newDish.spicinessOptions,
        flavor: newDish.flavor,
        flavorOptions: newDish.flavorOptions,
        flavorTags: newDish.flavorTags,
        cookingStyle: newDish.cookingStyle,
        cookingStyleOptions: newDish.cookingStyleOptions,
        craftStandardNote: newDish.craftStandardNote,
        customTags: newDish.customTags,
        isCloned: newDish.isCloned
      };

      globalVersionEngine.recordDataMutation({
        module: 'dishes',
        entityId: fullDish.id,
        entityName: fullDish.name,
        actionType: 'create',
        beforeData: null,
        afterData: fullDish
      });

      onUpdateDishes((prev) => [fullDish, ...prev]);
    }
  };

  const handleRematchAllImages = () => {
    const rematched = rematchAllDishImages(dishes);
    if (onUpdateDishes) {
      onUpdateDishes(rematched);
    }
    showToast(`已成功重新匹配全部 ${rematched.length} 道菜品的云端高清实拍美食图！`);
  };

  // 商家底栏 5 大核心入口活跃状态与角标计算
  const cookingOrdersCount = useMemo(() => {
    return scopedOrders.filter((o) => o.status === 'cooking' || o.status === 'pending').length;
  }, [scopedOrders]);

  const riskAlertCount = useMemo(() => {
    const pendingRefunds = scopedOrders.filter(
      (o) => (o.rejectionCount && o.rejectionCount > 0) || o.refundStatus === 'pending' || o.status === 'refund_pending'
    ).length;
    return heldOrders.length + pendingRefunds;
  }, [scopedOrders, heldOrders]);

  const isDishActive = ['menu', 'materials', 'craft_standards', 'processing_loss', 'category_brands', 'truck_expand', 'marketing', 'sku_params', 'inventory'].includes(activeTab);
  const isOrdersActive = ['orders', 'kds', 'tables', 'calling', 'printing', 'scanner'].includes(activeTab);
  const isRiskActive = ['contingency', 'held', 'shifts', 'loss', 'inventory_close', 'audit', 'payment_channels'].includes(activeTab);

  // 侧边栏打开/关闭切换逻辑 (响应式适配移动端抽屉与桌面端折叠)
  const handleToggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsMobileSidebarOpen((prev) => !prev);
    } else {
      setIsSidebarCollapsed((prev) => {
        const next = !prev;
        safeSetStorage('obsidian_merchant_sidebar_collapsed', next);
        return next;
      });
    }
  };

  // Desktop workspace full-width toggle
  const [isFullWidthWorkspace, setIsFullWidthWorkspace] = useState<boolean>(() => {
    try {
      return localStorage.getItem('obsidian_merchant_fullwidth') === 'true';
    } catch {
      return false;
    }
  });

  const toggleFullWidthWorkspace = () => {
    setIsFullWidthWorkspace((prev) => {
      const next = !prev;
      safeSetStorage('obsidian_merchant_fullwidth', next);
      return next;
    });
  };

  // Real-time clock for desktop status bar
  const [currentTime, setCurrentTime] = useState<string>(() =>
    new Date().toLocaleTimeString('zh-CN', { hour12: false })
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('zh-CN', { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isSidebarActive = isMobileSidebarOpen;

  return (
    <div className="h-screen w-full bg-[#f7f7f5] text-[#37352f] flex flex-col font-sans overflow-hidden select-none selection:bg-[#37352f] selection:text-white">
      {/* 1. Global Navigation Top Bar */}
      <header className="h-12 sm:h-13 shrink-0 bg-[#ffffff] border-b border-[#e6e6e4] px-2 sm:px-4 py-1.5 flex items-center justify-between shadow-2xs gap-1.5 sm:gap-3 z-30">
        {/* Left: Mobile Sidebar Toggle + Back + Store Brand + Truck Selector */}
        <div className="flex items-center gap-1 sm:gap-2.5 min-w-0 shrink">
          {/* Mobile Sidebar Toggle Button */}
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="md:hidden p-1.5 bg-[#f1f1ef] hover:bg-[#e8e8e6] text-[#37352f] rounded-[3px] transition-all cursor-pointer border border-[#d3d1cb] flex items-center justify-center shrink-0"
            title="展开28个功能模块侧边栏"
            aria-label="展开功能模块侧边栏"
          >
            <MenuIcon className="w-4 h-4 text-[#37352f]" />
          </button>

          {/* Return to Customer Storefront */}
          <button
            type="button"
            onClick={() => onSwitchRole('customer')}
            className="p-1.5 bg-[#f1f1ef] hover:bg-[#e8e8e6] rounded-[3px] text-[#787774] hover:text-[#37352f] transition-all cursor-pointer flex items-center gap-1 font-semibold text-xs border border-[#d3d1cb] shrink-0"
            title="返回前台顾客点餐"
            aria-label="返回前台顾客点餐"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden md:inline">前台</span>
          </button>

          {/* Vertical Separator */}
          <div className="h-4 w-[1px] bg-[#e6e6e4] shrink-0" />

          {/* Store Brand Badge */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-[3px] bg-[#37352f] text-white flex items-center justify-center font-bold text-xs shrink-0">
              <Store className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs sm:text-sm text-[#37352f] whitespace-nowrap">
                商家总控
              </span>
              <span className="text-[10px] font-mono bg-[#edf3ec] text-[#2b593f] border border-[#c4dcbc] px-1 py-0.2 rounded-[2px] shrink-0 hidden lg:inline-block">
                在线
              </span>
            </div>
          </div>

          <div className="h-4 w-[1px] bg-[#e6e6e4] shrink-0 hidden sm:block" />

          {/* Truck Scope Selector */}
          <div className="flex items-center gap-1 bg-[#f1f1ef] border border-[#d3d1cb] rounded-[4px] px-1.5 py-0.5 shrink-0 max-w-[125px] xs:max-w-[155px] sm:max-w-xs">
            <Truck className="w-3.5 h-3.5 text-[#2b593f] shrink-0" />
            <select
              value={selectedTruckId}
              onChange={(e) => handleSelectTruck(e.target.value)}
              className="bg-transparent text-[11px] sm:text-xs font-bold text-[#37352f] outline-none cursor-pointer truncate max-w-[95px] xs:max-w-[120px] sm:max-w-[170px]"
              title="切换餐车"
            >
              {merchantTruckConfigs.map((t) => (
                <option key={t.truckId} value={t.truckId}>
                  {t.truckId === 'truck-01' ? '01号·旗舰车' : t.truckId === 'truck-02' ? '02号·科技园' : t.truckId === 'truck-03' ? '03号·潮玩站' : t.truckName} ({t.status === 'active' ? '营业' : '审核'})
                </option>
              ))}
            </select>
          </div>

          <div className="h-4 w-[1px] bg-[#e6e6e4] shrink-0 hidden lg:block" />

          {/* Verified Phone Staff Badge */}
          <div className="hidden lg:flex items-center gap-1 bg-[#f1f1ef] border border-[#d3d1cb] rounded-[4px] px-1.5 py-0.5 shrink-0 text-xs">
            <Smartphone className="w-3.5 h-3.5 text-[#2b593f] shrink-0" />
            <span className="font-bold text-[#37352f] truncate max-w-[110px] sm:max-w-none">
              {merchantSession?.name || '张伟 (店长)'}
            </span>
            <span className="font-mono text-[10.5px] text-[#787774] hidden sm:inline">
              {merchantSession?.phone ? maskPhoneNumber(merchantSession.phone) : '138****8000'}
            </span>
            <span
              className="text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-300/60 p-0.5 rounded shrink-0 flex items-center"
              title={`手机号已验证 · 硬件指纹 [${merchantSession?.hardwareHash || 'HW-INVARIANT'}] 绑定`}
            >
              <Fingerprint className="w-2.5 h-2.5 text-emerald-700" />
            </span>
            {/* Shift Handover Button */}
            <button
              type="button"
              onClick={() => setIsShiftHandoverOpen(true)}
              className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 cursor-pointer transition-colors shadow-2xs ml-0.5"
              title="切换在岗员工 / 快速交接班"
            >
              <ArrowRightLeft className="w-2.5 h-2.5 text-amber-700" />
              <span>交接班</span>
            </button>
            {onOpenPhoneAuth && (
              <button
                type="button"
                onClick={onOpenPhoneAuth}
                className="text-[10px] text-blue-700 hover:text-blue-900 underline ml-0.5 font-medium cursor-pointer"
                title="更换登录手机号"
              >
                切换
              </button>
            )}
            {onLogoutMerchant && (
              <button
                type="button"
                onClick={onLogoutMerchant}
                className="text-[10px] text-red-600 hover:text-red-800 underline ml-0.5 font-medium cursor-pointer hidden sm:inline"
                title="退出商家端登录"
              >
                退出
              </button>
            )}
          </div>

          {/* 五维自动化安全中枢常驻胶囊 (Sentinel Status Capsule) */}
          <button
            type="button"
            id="global-sentinel-status-capsule"
            onClick={() => setActiveTab('sentinel')}
            className={`hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] border text-xs font-semibold cursor-pointer transition-all ${
              sentinelState.threatLevel === 'SECURE'
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                : sentinelState.threatLevel === 'CRITICAL'
                ? 'bg-red-50 hover:bg-red-100 text-red-800 border-red-300 animate-pulse'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
            }`}
            title="点击进入五维自动化安全与自闭环中枢 (Sensing-Safety)"
          >
            <Zap className={`w-3.5 h-3.5 ${sentinelState.threatLevel === 'SECURE' ? 'text-emerald-600' : 'text-amber-600'}`} />
            <span className="font-mono">{sentinelState.overallHealthScore}分</span>
            <span className="text-[10px] opacity-80">五维安全</span>
            {sentinelState.activeDecisions.length > 0 && (
              <span className="px-1 py-0.1 rounded text-[9px] bg-red-600 text-white font-bold">
                {sentinelState.activeDecisions.length}
              </span>
            )}
          </button>
        </div>

        {/* Top Right Quick Switches */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* 方案 C：全局顶部常驻即时喊号浮窗入口 */}
          <button
            type="button"
            id="global-header-quick-call-btn"
            onClick={() => setIsQuickCallModalOpen(true)}
            className="px-2 sm:px-2.5 py-1 bg-amber-400 hover:bg-amber-500 active:scale-95 text-slate-950 font-black text-xs rounded-[3px] transition-all cursor-pointer border border-amber-500 flex items-center gap-1.5 shadow-2xs shrink-0"
            title="全域即时叫号广播小窗（自提催取/呼叫骑手/堂食传菜/全域喊客，快捷键: Alt+C）"
          >
            <Megaphone className="w-3.5 h-3.5 text-slate-950 shrink-0" />
            <span className="hidden sm:inline font-bold">喊号广播</span>
            <span className="sm:hidden font-bold">叫号</span>
          </button>

          {/* 特许加盟与总部爆品中枢 */}
          <button
            type="button"
            id="franchise-hq-hub-btn"
            onClick={() => setIsFranchiseHQModalOpen(true)}
            className="px-2 sm:px-2.5 py-1 bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-900 font-bold text-xs rounded-[3px] transition-all cursor-pointer border border-amber-300 flex items-center gap-1.5 shadow-2xs shrink-0"
            title="特许经营与加盟商多租户中枢 · 核心爆品全国强锁定"
          >
            <Crown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="hidden md:inline font-bold">加盟/HQ爆品中枢</span>
            <span className="md:hidden font-bold">加盟</span>
          </button>

          {/* 营业状态总开关 */}
          <button
            type="button"
            onClick={() => setIsBusinessStatusModalOpen(true)}
            className={`px-2 sm:px-2.5 py-1 rounded-[3px] font-bold text-xs transition-all cursor-pointer border flex items-center gap-1.5 shadow-2xs shrink-0 ${
              businessStatus.isOpen
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-900 border-rose-300 animate-pulse'
            }`}
            title="流动餐车营业状态总控（一键打烊/恢复接单）"
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${businessStatus.isOpen ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <span>{businessStatus.isOpen ? '营业中' : '已打烊'}</span>
          </button>

          {/* 协同中枢聚合胶囊 (Mobile & Tablet) */}
          <button
            type="button"
            onClick={() => setIsHardwareHubOpen(true)}
            className="px-2 sm:px-2.5 py-1 bg-[#2b593f]/10 hover:bg-[#2b593f]/20 text-[#2b593f] rounded-[3px] font-bold text-xs transition-all cursor-pointer border border-[#2b593f]/30 flex items-center gap-1.5 shadow-2xs shrink-0 xl:hidden"
            title="打开硬件与协同中枢"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#2b593f] shrink-0" />
            <span>协同</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          </button>

          {/* Desktop Expanded Buttons: Only visible on >= xl screens */}
          <div className="hidden xl:flex items-center gap-1 sm:gap-1.5 shrink-0">
            <MerchantVoiceControls showToast={showToast} />

            {/* Bluetooth Audio Player */}
            <button
              type="button"
              onClick={() => setIsBluetoothModalOpen(true)}
              className={`px-2 py-1 rounded-[3px] font-bold text-xs transition-all cursor-pointer border flex items-center gap-1 shadow-2xs shrink-0 ${
                activeBtDevice && activeBtDevice.status === 'connected'
                  ? 'bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-200'
                  : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-300'
              }`}
              title={`流动餐车蓝牙音箱 · 当前: ${
                activeBtDevice?.status === 'connected' ? activeBtDevice.name : '未连接'
              }`}
            >
              <Bluetooth className={`w-3.5 h-3.5 shrink-0 ${
                activeBtDevice && activeBtDevice.status === 'connected' ? 'text-blue-600' : 'text-neutral-500'
              }`} />
              <span className="hidden md:inline">蓝牙</span>
              {activeBtDevice && activeBtDevice.status === 'connected' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('scanner');
                showToast('已切换至智能扫码枪硬件控制台');
              }}
              className={`px-2 py-1 rounded-[3px] font-bold text-xs transition-all cursor-pointer border flex items-center gap-1 shadow-2xs shrink-0 ${
                activeTab === 'scanner'
                  ? 'bg-[#2b593f] text-white border-[#2b593f]'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
              }`}
              title="智能扫码枪硬件控制台"
            >
              <Barcode className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'scanner' ? 'text-white' : 'text-emerald-700'}`} />
              <span className="hidden md:inline">扫码</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => setIsMessageFormModalOpen(true)}
              className="px-2 py-1 bg-white hover:bg-neutral-50 text-neutral-800 rounded-[3px] font-bold text-xs transition-all cursor-pointer border border-neutral-300 flex items-center gap-1 shadow-2xs group shrink-0"
              title="订单协同消息与历史表单"
            >
              <div className="relative shrink-0">
                <MessageSquareText className="w-3.5 h-3.5 text-emerald-700 shrink-0 group-hover:scale-110 transition-transform" />
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <span className="hidden md:inline">消息</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCloudbaseModalOpen(true)}
              className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-[3px] font-bold text-xs transition-all cursor-pointer border border-sky-200 flex items-center gap-1 shadow-2xs shrink-0"
              title="腾讯云数据同步"
            >
              <Cloud className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span className="hidden md:inline">同步</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            </button>
          </div>

          {/* 骑手端入口 */}
          <button
            type="button"
            onClick={() => onSwitchRole('rider')}
            className="hidden sm:flex px-2 py-1 bg-[#f1f1ef] hover:bg-[#e8e8e6] text-[#37352f] rounded-[3px] font-semibold text-xs transition-all cursor-pointer border border-[#d3d1cb] items-center gap-1 shrink-0"
            title="切换至骑手端配送界面"
          >
            <Bike className="w-3.5 h-3.5 text-[#2b593f] shrink-0" />
            <span className="hidden md:inline">骑手端</span>
            <span className="md:hidden font-bold">骑手</span>
          </button>
        </div>
      </header>

      {/* Franchise & Multi-Tenant Governance Ribbon */}
      <FranchiseTenantBar
        selectedTruckId={selectedTruckId}
        onSelectTruck={handleSelectTruck}
        onOpenHQModal={() => setIsFranchiseHQModalOpen(true)}
        truckConfigs={allMerchantTruckConfigs}
      />

      {/* 2. Main Flex Container: Left Sidebar + Right Workspace */}
      <div className="flex-1 flex flex-row min-h-0 w-full overflow-hidden relative">
        {/* Left Sidebar Navigation */}
        <MerchantSidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            setIsMobileSidebarOpen(false);
          }}
          tabsConfig={allTabsConfig}
          categories={categories}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => {
            setIsSidebarCollapsed((prev) => {
              const next = !prev;
              safeSetStorage('obsidian_merchant_sidebar_collapsed', next);
              return next;
            });
          }}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          truckName={activeTruckConfig?.truckName}
          merchantSession={merchantSession}
        />

        {/* Right Main Dashboard Workspace */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#f7f7f5]">
          {/* Subheader: Active Module Breadcrumb & Quick Pill Bar */}
          <div className="shrink-0 bg-[#ffffff]/95 backdrop-blur-xs border-b border-[#e6e6e4] px-2.5 sm:px-4 py-1.5 shadow-2xs flex items-center justify-between gap-2 z-20">
            {/* Desktop Active Module Indicator Breadcrumb (Hidden on mobile to give full row to quick pill bar) */}
            <div className="hidden md:flex items-center gap-2 min-w-0 text-xs shrink-0">
              <span className="text-[#787774] font-medium">{currentTabConfig.category}</span>
              <span className="text-[#d3d1cb]">/</span>
              <div className="flex items-center gap-1.5 font-bold text-[#201f1d]">
                <CurrentIcon className="w-3.5 h-3.5 text-emerald-700" />
                <span>{currentTabConfig.label}</span>
              </div>
              {currentTabConfig.badge !== undefined && currentTabConfig.badge > 0 && (
                <span
                  className={`text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded-[1px] ${
                    currentTabConfig.badgeAlert
                      ? 'bg-rose-50 text-rose-600 border border-rose-200'
                      : 'bg-[#201f1d] text-white'
                  }`}
                >
                  {currentTabConfig.badge}
                </span>
              )}
            </div>

            {/* Quick Frequent Modules (Desktop & Mobile horizontal scrollable pill bar) & Width Toggle */}
            <div className="flex items-center gap-2 w-full md:w-auto min-w-0 overflow-hidden">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 w-full">
                {(() => {
                  const baseQuickTabs = [
                    { id: 'data_fallback', label: '数据兜底', icon: ShieldCheck, badgeAlert: true },
                    { id: 'tables', label: '堂食台位', icon: UtensilsCrossed, badge: tables.filter(t => t.status === 'dining').length },
                    { id: 'orders', label: '订单', icon: ShoppingBag, badge: scopedOrders.filter(o => o.status === 'cooking' || o.status === 'pending').length },
                    { id: 'contingency', label: '兜底中枢', icon: ShieldAlert, badge: scopedOrders.filter(o => (o.rejectionCount && o.rejectionCount > 0) || o.refundStatus === 'pending' || o.status === 'refund_pending').length, badgeAlert: true },
                    { id: 'kds', label: 'KDS', icon: ChefHat, badge: tickets.length },
                    { id: 'calling', label: '叫号', icon: BellRing },
                    { id: 'truck_expand', label: '展开与底栏', icon: SlidersHorizontal },
                    { id: 'printing', label: '打印', icon: Printer },
                    { id: 'held', label: '未结', icon: ShieldAlert, badge: heldOrders.length, badgeAlert: true },
                    { id: 'members', label: '会员', icon: Award },
                    { id: 'user_data_mgmt', label: '统一档案', icon: Fingerprint },
                    { id: 'staff', label: '员工', icon: Users },
                    { id: 'analytics', label: '报表', icon: TrendingUp },
                    { id: 'gps', label: 'GPS', icon: MapPin }
                  ];

                  const isCurrentInBase = baseQuickTabs.some(t => t.id === activeTab);
                  const displayTabs = !isCurrentInBase && currentTabConfig
                    ? [
                        {
                          id: currentTabConfig.id,
                          label: currentTabConfig.label.replace('矩阵', '').replace('管理', ''),
                          icon: currentTabConfig.icon,
                          badge: currentTabConfig.badge,
                          badgeAlert: currentTabConfig.badgeAlert
                        },
                        ...baseQuickTabs
                      ]
                    : baseQuickTabs;

                  return (
                    <>
                      {displayTabs.map((quick) => {
                        const Icon = quick.icon;
                        const isSelected = activeTab === quick.id;
                        return (
                          <button
                            key={quick.id}
                            type="button"
                            onClick={() => setActiveTab(quick.id as MerchantTab)}
                            className={`px-2 py-1 rounded-[1px] text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                              isSelected
                                ? 'bg-[#201f1d] text-white shadow-xs'
                                : 'text-[#787774] hover:bg-[#efefed] hover:text-[#201f1d]'
                            }`}
                          >
                            <Icon className="w-3 h-3 shrink-0" />
                            <span>{quick.label}</span>
                            {quick.badge !== undefined && quick.badge > 0 && (
                              <span
                                className={`text-[9px] font-mono font-bold px-1 rounded-[1px] ${
                                  isSelected
                                    ? 'bg-white/20 text-white'
                                    : quick.badgeAlert
                                    ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                    : 'bg-[#e6e6e4] text-[#37352f]'
                                }`}
                              >
                                {quick.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => setIsMobileSidebarOpen(true)}
                        className="md:hidden px-2 py-1 rounded-[1px] text-xs font-semibold flex items-center gap-1 text-[#787774] hover:bg-[#efefed] hover:text-[#201f1d] shrink-0 border border-dashed border-[#d3d1cb]"
                        title="展开全部28个功能模块侧边栏"
                      >
                        <MenuIcon className="w-3 h-3 text-[#787774]" />
                        <span className="whitespace-nowrap">全部</span>
                      </button>
                    </>
                  );
                })()}
              </div>

              {/* Desktop Workspace Width Switcher */}
              <button
                type="button"
                onClick={toggleFullWidthWorkspace}
                className="hidden xl:flex p-1.5 hover:bg-[#efefed] text-[#787774] hover:text-[#201f1d] rounded-[3px] transition-all cursor-pointer items-center gap-1 border border-transparent hover:border-[#d3d1cb] shrink-0 text-xs font-medium"
                title={isFullWidthWorkspace ? '切换为标准居中工作台 (Max-W-7xl)' : '切换为全宽铺满工作台 (100% Fluid)'}
              >
                {isFullWidthWorkspace ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5 text-[#5a5854]" />
                    <span className="hidden 2xl:inline text-[11px]">居中</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5 text-[#5a5854]" />
                    <span className="hidden 2xl:inline text-[11px]">全宽</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 3. Main Dashboard Workspace Content */}
          <main className={`flex-1 overflow-y-auto p-2 sm:p-4 lg:p-6 w-full ${
            isFullWidthWorkspace ? 'max-w-none' : 'max-w-7xl mx-auto'
          } pb-3 md:pb-8 custom-scrollbar`}>
        {(() => {
          const accessCheck = canAccessMerchantTab(activeTab, merchantSession);
          if (!accessCheck.allowed) {
            return (
              <PermissionDeniedGuard
                requirement={accessCheck.requirement}
                merchantSession={merchantSession}
                onBackToAllowedTab={() => setActiveTab('orders')}
                onOpenShiftHandover={() => setIsShiftHandoverOpen(true)}
                onOverrideGranted={() => setForceRbacTick((t) => t + 1)}
                showToast={showToast}
              />
            );
          }
          return (
            <>
        {activeTab === 'data_fallback' && (
          <MerchantDataFallbackCenter
            showToast={showToast}
            onNavigateToModule={(mod) => {
              const m = mod as string;
              if (m === 'tables') setActiveTab('tables');
              else if (m === 'orders') setActiveTab('orders');
              else if (m === 'kds') setActiveTab('kds');
              else if (m === 'calling_queue') setActiveTab('calling');
              else if (m === 'dishes') setActiveTab('menu');
              else if (m === 'shifts') setActiveTab('shifts');
              else if (m === 'members') setActiveTab('members');
              else if (m === 'fallback') setActiveTab('data_fallback');
            }}
          />
        )}

        {activeTab === 'tables' && (
          <MerchantTables
            tables={scopedTables}
            orders={scopedOrders}
            menuItems={dishes}
            onOpenTable={handleOpenTable}
            onCheckoutTable={handleCheckoutTable}
            onTransferTable={handleTransferTable}
            onReleaseTable={handleReleaseTable}
            onUpdateTable={handleUpdateTable}
            onSyncOrderItems={onSyncOrderItems}
            onVoidTableOrder={handleVoidTableOrder}
            showToast={showToast}
          />
        )}

        {activeTab === 'orders' && (
          <MerchantOrders
            orders={scopedOrders}
            onAcceptOrder={handleAcceptOrder}
            onAdvanceOrderStatus={onAdvanceOrderStatus}
            onRejectOrder={handleRejectOrder}
            onDeleteOrder={handleDeleteOrder}
            onAuditRefund={onAuditRefund}
            onToggleNonRefundable={onToggleNonRefundable}
            showToast={showToast}
          />
        )}

        {activeTab === 'contingency' && (
          <MerchantContingencyHub
            orders={scopedOrders}
            onAdvanceOrderStatus={onAdvanceOrderStatus}
            onAuditRefund={onAuditRefund}
            showToast={showToast}
          />
        )}

        {activeTab === 'kds' && (
          <MerchantKDS
            tickets={tickets}
            onFinishTicket={handleFinishTicket}
            onDeleteTicket={handleDeleteTicket}
            onToggleItemComplete={handleToggleItemComplete}
            onBatchFinishDish={handleBatchFinishDish}
            showToast={showToast}
          />
        )}

        {activeTab === 'calling' && (
          <MerchantCallingHub
            orders={scopedOrders}
            showToast={showToast}
          />
        )}

        {activeTab === 'printing' && (
          <MerchantPrintingHub
            orders={scopedOrders}
            dishes={dishes}
            showToast={showToast}
          />
        )}

        {activeTab === 'held' && (
          <MerchantHeldOrders
            heldOrders={heldOrders}
            onResumeCheckout={handleResumeCheckout}
            onSendReminder={handleSendReminder}
            onConvertToTakeaway={handleConvertToTakeaway}
            onVoidOrder={handleVoidOrder}
            showToast={showToast}
          />
        )}

        {activeTab === 'materials' && (
          <MaterialView
            showToast={showToast}
          />
        )}

        {activeTab === 'craft_standards' && (
          <CraftStandardView
            showToast={showToast}
          />
        )}

        {activeTab === 'processing_loss' && (
          <ProcessingLossView
            showToast={showToast}
          />
        )}

        {activeTab === 'inventory_close' && (
          <InventoryView
            showToast={showToast}
          />
        )}

        {activeTab === 'sku_params' && (
          <SkuManagementView
            showToast={showToast}
          />
        )}

        {activeTab === 'loss' && (
          <MerchantLossHub
            showToast={showToast}
          />
        )}

        {activeTab === 'inventory' && (
          <MerchantInventory
            showToast={showToast}
            dishes={dishes}
          />
        )}

        {activeTab === 'sop' && (
          <MerchantCraftSOP
            showToast={showToast}
          />
        )}

        {activeTab === 'shifts' && (
          <MerchantShiftRefund
            showToast={showToast}
            orders={localOrders}
            onAuditRefund={onAuditRefund}
          />
        )}

        {activeTab === 'staff' && (
          <MerchantStaffHub
            showToast={showToast}
          />
        )}

        {activeTab === 'cloud_sync' && (
          <MerchantCloudSyncView
            showToast={showToast}
          />
        )}

        {activeTab === 'version_tracking' && (
          <MerchantVersionTrackingView
            showToast={showToast}
          />
        )}

        {activeTab === 'sentinel' && (
          <AutomatedSentinelDashboard
            showToast={showToast}
          />
        )}

        {activeTab === 'audit' && (
          <MerchantAuditLog
            showToast={showToast}
          />
        )}

        {activeTab === 'menu_design' && (
          <MerchantMenuDesignSystem
            onNotify={showToast}
            onPreviewCustomerMenu={() => onSwitchRole('customer')}
          />
        )}

        {activeTab === 'marketing' && (
          <MerchantMarketingHub
            showToast={showToast}
          />
        )}

        {activeTab === 'category_brands' && (
          <MerchantCategoryBrandSettings
            showToast={showToast}
          />
        )}

        {activeTab === 'truck_expand' && (
          <MerchantTruckExpandSettings
            showToast={showToast}
          />
        )}

        {activeTab === 'members' && (
          <MerchantMemberCRM
            showToast={showToast}
          />
        )}

        {activeTab === 'gps' && (
          <MerchantStallGPS
            truck={truck}
            onUpdateLocation={handleUpdateGPS}
            showToast={showToast}
          />
        )}

        {activeTab === 'user_data_mgmt' && (
          <MerchantUserDataCenter
            showToast={showToast}
          />
        )}

        {activeTab === 'menu' && (
          <MerchantMenuChannel
            dishes={dishes}
            onToggleAvailability={handleToggleAvailability}
            onAddNewDish={handleAddNewDish}
            onUpdateDish={handleUpdateDish}
            onRematchAllImages={handleRematchAllImages}
            showToast={showToast}
          />
        )}

        {activeTab === 'scanner' && (
          <MerchantScannerConsole
            dishes={dishes}
            orders={localOrders}
            tables={tables}
            onDishScanned={(scannedDish) => {
              showToast(`[扫码枪] 识别菜品: ${scannedDish.name} (¥${scannedDish.price.toFixed(2)})`);
            }}
            showToast={showToast}
          />
        )}

        {activeTab === 'payment_channels' && (
          <MerchantPaymentChannels
            showToast={showToast}
            truckName={activeTruckConfig?.truckName}
          />
        )}

        {activeTab === 'analytics' && (
          <MerchantAnalytics
            orders={scopedOrders}
            dishes={dishes}
            showToast={showToast}
            onOpenMasterControl={() => setActiveTab('master_control')}
          />
        )}

        {activeTab === 'master_control' && (
          <MerchantMasterControlCenter
            orders={scopedOrders}
            dishes={dishes}
            showToast={showToast}
            onDataRestored={() => {
              showToast('数据已从快照恢复！全系统状态重新校准。');
            }}
          />
        )}
            </>
          );
        })()}
          </main>

          {/* 3.5. 嵌入主内容区底部的直立底部导航栏 (直立无圆角·工整直角·移动端内嵌) */}
          <nav
            id="merchant-embedded-bottom-nav"
            aria-label="商家端内嵌底部导航栏"
            className="md:hidden shrink-0 w-full bg-white border-t border-[#d3d1cb] z-20 select-none shadow-[0_-2px_6px_rgba(0,0,0,0.03)] rounded-none"
          >
            <div className="grid grid-cols-5 divide-x divide-[#ebebe8] h-12 w-full">
              {/* 0. 菜单 (触发侧边栏打开与关闭) */}
              <button
                type="button"
                id="merchant-nav-tab-menu"
                onClick={handleToggleSidebar}
                title={isMobileSidebarOpen || !isSidebarCollapsed ? '关闭侧边栏' : '打开侧边栏'}
                className={`h-full rounded-none flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer select-none relative ${
                  isSidebarActive
                    ? 'bg-[#2b593f] text-white'
                    : 'bg-white text-[#5a5854] hover:bg-[#f7f7f5] hover:text-[#1a1c1b] active:bg-[#efefed]'
                }`}
              >
                <MenuIcon className={`w-4 h-4 shrink-0 ${isSidebarActive ? 'text-white' : 'text-[#6a6864]'}`} />
                <span className="text-[11px] font-semibold tracking-tight whitespace-nowrap">菜单</span>
              </button>

              {/* 1. 菜品管理 */}
              <button
                type="button"
                id="merchant-nav-tab-dish"
                onClick={() => {
                  setActiveTab('menu');
                  setIsMobileSidebarOpen(false);
                }}
                className={`h-full rounded-none flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer select-none relative ${
                  isDishActive && !isSidebarActive
                    ? 'bg-[#2b593f] text-white'
                    : 'bg-white text-[#5a5854] hover:bg-[#f7f7f5] hover:text-[#1a1c1b] active:bg-[#efefed]'
                }`}
              >
                <UtensilsCrossed className={`w-4 h-4 shrink-0 ${isDishActive && !isSidebarActive ? 'text-white' : 'text-[#6a6864]'}`} />
                <span className="text-[11px] font-semibold tracking-tight whitespace-nowrap">菜品管理</span>
              </button>

              {/* 2. 订单 */}
              <button
                type="button"
                id="merchant-nav-tab-orders"
                onClick={() => {
                  setActiveTab('orders');
                  setIsMobileSidebarOpen(false);
                }}
                className={`h-full rounded-none flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer select-none relative ${
                  isOrdersActive && !isSidebarActive
                    ? 'bg-[#2b593f] text-white'
                    : 'bg-white text-[#5a5854] hover:bg-[#f7f7f5] hover:text-[#1a1c1b] active:bg-[#efefed]'
                }`}
              >
                <div className="relative">
                  <ShoppingBag className={`w-4 h-4 shrink-0 ${isOrdersActive && !isSidebarActive ? 'text-white' : 'text-[#6a6864]'}`} />
                  {cookingOrdersCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 px-1 min-w-[14px] h-3.5 flex items-center justify-center text-[9px] font-bold font-mono bg-[#eb5757] text-white rounded-[2px] leading-none shadow-2xs">
                      {cookingOrdersCount}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-semibold tracking-tight whitespace-nowrap">订单</span>
              </button>

              {/* 3. 风控 */}
              <button
                type="button"
                id="merchant-nav-tab-risk"
                onClick={() => {
                  setActiveTab('contingency');
                  setIsMobileSidebarOpen(false);
                }}
                className={`h-full rounded-none flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer select-none relative ${
                  isRiskActive && !isSidebarActive
                    ? 'bg-[#2b593f] text-white'
                    : 'bg-white text-[#5a5854] hover:bg-[#f7f7f5] hover:text-[#1a1c1b] active:bg-[#efefed]'
                }`}
              >
                <div className="relative">
                  <ShieldAlert className={`w-4 h-4 shrink-0 ${isRiskActive && !isSidebarActive ? 'text-white' : 'text-[#d97706]'}`} />
                  {riskAlertCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 px-1 min-w-[14px] h-3.5 flex items-center justify-center text-[9px] font-bold font-mono bg-[#d97706] text-white rounded-[2px] leading-none shadow-2xs">
                      {riskAlertCount}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-semibold tracking-tight whitespace-nowrap">风控</span>
              </button>

              {/* 4. 联络 */}
              <button
                type="button"
                id="merchant-nav-tab-chat"
                onClick={() => {
                  setIsOmniChatHubOpen(true);
                  setIsMobileSidebarOpen(false);
                }}
                className={`h-full rounded-none flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer select-none relative ${
                  isOmniChatHubOpen
                    ? 'bg-[#2b593f] text-white'
                    : 'bg-white text-[#5a5854] hover:bg-[#f7f7f5] hover:text-[#1a1c1b] active:bg-[#efefed]'
                }`}
              >
                <div className="relative">
                  <MessageSquareText className={`w-4 h-4 shrink-0 ${isOmniChatHubOpen ? 'text-white' : 'text-[#6a6864]'}`} />
                  <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-[#4dab63] ring-1.5 ring-white" />
                </div>
                <span className="text-[11px] font-semibold tracking-tight whitespace-nowrap">联络</span>
              </button>
            </div>
          </nav>

          {/* 4. Desktop Workstation Bottom Status Bar (Hidden on Mobile) */}
          <footer className="hidden md:flex h-7 shrink-0 bg-[#ffffff] border-t border-[#e6e6e4] px-3 lg:px-4 items-center justify-between text-[11px] text-[#787774] font-medium z-10 select-none">
            {/* Left: System Readiness & Connectivity */}
            <div className="flex items-center gap-2 lg:gap-3 min-w-0">
              <div className="flex items-center gap-1 text-emerald-700 font-semibold shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>POS 实时联机</span>
              </div>
              <span className="text-[#d3d1cb]">|</span>
              <div className="flex items-center gap-1 text-[#5a5854] shrink-0">
                <Truck className="w-3 h-3 text-[#2b593f]" />
                <span className="truncate">{activeTruckConfig?.truckName || '01号·旗舰车'}</span>
                <span className={`text-[9.5px] px-1 py-0.1 rounded font-mono ${
                  businessStatus.isOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {businessStatus.isOpen ? '营业中' : '已打烊'}
                </span>
              </div>
              <span className="text-[#d3d1cb] hidden lg:inline">|</span>
              <div className="hidden lg:flex items-center gap-1 text-[#5a5854] shrink-0">
                <Cloud className="w-3 h-3 text-sky-600" />
                <span>腾讯云 CloudBase 已就绪</span>
              </div>
              <span className="text-[#d3d1cb] hidden xl:inline">|</span>
              <div className="hidden xl:flex items-center gap-1 text-[#5a5854] shrink-0">
                <Barcode className="w-3 h-3 text-emerald-600" />
                <span>扫码枪即插即用</span>
              </div>
            </div>

            {/* Center / Right: Module hint & Operator & Live Clock */}
            <div className="flex items-center gap-2 lg:gap-3 shrink-0">
              <span className="hidden xl:inline text-[#9b9a97] font-mono text-[10.5px]">
                快捷键: Alt+1~4 切换模块组 | Ctrl+Shift+D 调试中枢
              </span>
              <span className="text-[#d3d1cb] hidden xl:inline">|</span>
              <div className="flex items-center gap-1 text-[#37352f]">
                <Smartphone className="w-3 h-3 text-[#2b593f]" />
                <span>{merchantSession?.name || '张伟 (店长)'}</span>
              </div>
              <span className="text-[#d3d1cb]">|</span>
              <div className="flex items-center gap-1 font-mono text-[#5a5854] font-bold">
                <Clock className="w-3 h-3 text-[#787774]" />
                <span>{currentTime}</span>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* Omni Aggregated Chat Hub Modal */}
      {isOmniChatHubOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-[4px] max-w-5xl w-full h-[88vh] border border-[#e9e9e7] shadow-2xl overflow-hidden flex flex-col">
            <OmniAggregatedChatHub
              orders={localOrders}
              viewerRole="merchant"
              onAdvanceOrderStatus={onAdvanceOrderStatus}
              onRejectOrder={onRejectOrder}
              onAuditRefund={onAuditRefund}
              showToast={showToast}
              onClose={() => setIsOmniChatHubOpen(false)}
              isModalMode={true}
            />
          </div>
        </div>
      )}

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-16 right-5 z-50 bg-[#201f1d] text-white px-4 py-2.5 rounded-[3px] shadow-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150 border border-white/10">
          <Sparkles className="w-4 h-4 text-[#fde047]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Cloudbase Sync Modal */}
      <CloudbaseStatusModal
        isOpen={isCloudbaseModalOpen}
        onClose={() => setIsCloudbaseModalOpen(false)}
        dishes={dishes}
        orders={localOrders}
        onDishesUpdated={(updatedDishes) => {
          if (onUpdateDishes) {
            onUpdateDishes(updatedDishes);
          }
        }}
        isConnected={true}
      />

      {/* Order History Messages Form Modal */}
      <OrderHistoryMessagesModal
        isOpen={isMessageFormModalOpen}
        onClose={() => setIsMessageFormModalOpen(false)}
        orders={localOrders}
        dishes={dishes}
        viewerRole="merchant"
        onAdvanceOrderStatus={onAdvanceOrderStatus}
        onRejectOrder={onRejectOrder}
        onAuditRefund={onAuditRefund}
        showToast={showToast}
      />

      {/* Bluetooth Speaker Link & Binding System Modal */}
      <BluetoothSpeakerModal
        isOpen={isBluetoothModalOpen}
        onClose={() => setIsBluetoothModalOpen(false)}
        showToast={showToast}
      />

      {/* Business Status Master Toggle & Setting Modal */}
      <BusinessStatusModal
        isOpen={isBusinessStatusModalOpen}
        onClose={() => setIsBusinessStatusModalOpen(false)}
        truckName={truck.name}
        onStatusChanged={(newStatus) => {
          setBusinessStatusState(newStatus);
        }}
      />

      {/* Merchant Hardware & Multi-Terminal Hub Modal */}
      <MerchantHardwareHubModal
        isOpen={isHardwareHubOpen}
        onClose={() => setIsHardwareHubOpen(false)}
        activeBtDevice={activeBtDevice}
        btConfig={btConfig}
        onOpenBluetoothModal={() => setIsBluetoothModalOpen(true)}
        onOpenScanner={() => {
          setActiveTab('scanner');
          showToast('已切换至智能扫码枪硬件控制台');
        }}
        onOpenMessageForm={() => setIsMessageFormModalOpen(true)}
        onOpenCloudbaseModal={() => setIsCloudbaseModalOpen(true)}
        onOpenQuickCall={() => setIsQuickCallModalOpen(true)}
        onSwitchToRider={() => onSwitchRole('rider')}
        merchantSession={merchantSession}
        onOpenPhoneAuth={onOpenPhoneAuth}
        onLogoutMerchant={onLogoutMerchant}
        showToast={showToast}
        maskPhoneNumber={maskPhoneNumber}
      />

      {/* Franchise HQ & Multi-Tenant Governance Modal */}
      <FranchiseHQModal
        isOpen={isFranchiseHQModalOpen}
        onClose={() => setIsFranchiseHQModalOpen(false)}
        dishes={dishes}
        showToast={showToast}
        onSelectTruck={handleSelectTruck}
      />

      {/* 方案 C：全局顶部常驻即时喊号浮窗 (全域呼叫广播中枢) */}
      <GlobalQuickCallModal
        isOpen={isQuickCallModalOpen}
        onClose={() => setIsQuickCallModalOpen(false)}
        orders={scopedOrders}
        showToast={showToast}
      />

      {/* 员工在岗交接班与即时岗位权限换乘弹窗 */}
      <StaffShiftHandoverModal
        isOpen={isShiftHandoverOpen}
        onClose={() => setIsShiftHandoverOpen(false)}
        currentSession={merchantSession || null}
        onHandoverSuccess={() => {
          setForceRbacTick((t) => t + 1);
        }}
        showToast={showToast}
      />
    </div>
  );
};
