import React, { useState, useEffect } from 'react';
import {
  Bike,
  Utensils,
  ChevronDown,
  MessageSquare,
  Search,
  LayoutGrid,
  List,
  Star,
  SlidersHorizontal,
  ShoppingBag,
  Ticket,
  ClipboardList,
  User,
  Compass,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { DiningMode } from './DiningModeSelector';
import { RoleSwitcherDropdown, UserRole } from './RoleSwitcherDropdown';
import { DeliveryRangeEvaluation } from '../utils/truckLocationEngine';
import { ViewMode } from '../types';

export interface HeaderRouteConfig {
  title: string;
  badge?: string;
  backText?: string;
  statusText?: string;
  statusDotColor?: string;
  icon?: React.ReactNode;
}

export const getRouteConfig = (tab?: string, previousTab?: string, isVIP?: boolean): HeaderRouteConfig | null => {
  if (!tab || tab === 'home') return null;

  const getBackLabel = () => {
    if (previousTab === 'cart') return '返回选购清单';
    if (previousTab === 'orders') return '返回订单记录';
    if (previousTab === 'profile') return '返回会员中心';
    if (previousTab === 'tracking') return '返回配送轨迹';
    if (previousTab === 'coupons') return '返回优惠券包';
    if (previousTab === 'checkout') return '返回结算确认';
    return '返回点餐';
  };

  const dynamicBackText = getBackLabel();

  switch (tab) {
    case 'cart':
      return {
        title: '餐车选购清单',
        badge: 'CART',
        backText: dynamicBackText,
        statusText: '黑曜石 01 号车 · 实时制作',
        statusDotColor: 'bg-black',
        icon: <ShoppingBag className="w-3.5 h-3.5 text-neutral-800" />
      };
    case 'coupons':
      return {
        title: '我的优惠券包',
        badge: 'VOUCHERS',
        backText: previousTab === 'profile' ? '返回会员中心' : dynamicBackText,
        statusText: '智能自动抵扣已开启',
        statusDotColor: 'bg-black',
        icon: <Ticket className="w-3.5 h-3.5 text-amber-500" />
      };
    case 'checkout':
      return {
        title: '确认结算下单',
        badge: 'CHECKOUT',
        backText: previousTab === 'cart' ? '返回选购清单' : dynamicBackText,
        statusText: '黑曜石 01 号餐车 · 现制直达',
        statusDotColor: 'bg-black',
        icon: <ShoppingBag className="w-3.5 h-3.5 text-neutral-800" />
      };
    case 'orders':
      return {
        title: '全渠道订单记录',
        badge: 'ORDERS',
        backText: dynamicBackText,
        statusText: '实时订单自动同步',
        statusDotColor: 'bg-black',
        icon: <ClipboardList className="w-3.5 h-3.5 text-black" />
      };
    case 'profile':
      return {
        title: '个人与会员中心',
        badge: isVIP ? 'VIP ELITE' : 'MEMBER',
        backText: dynamicBackText,
        statusText: isVIP ? '黑曜石尊享特权生效中' : '尊享会员权益',
        statusDotColor: isVIP ? 'bg-amber-400' : 'bg-neutral-400',
        icon: <User className="w-3.5 h-3.5 text-amber-500" />
      };
    case 'tracking':
      return {
        title: '实时配送轨迹追踪',
        badge: 'GPS RADAR',
        backText: previousTab === 'orders' ? '返回订单记录' : dynamicBackText,
        statusText: 'GPS 专送实时定位中',
        statusDotColor: 'bg-sky-500',
        icon: <Compass className="w-3.5 h-3.5 text-sky-500" />
      };
    default:
      return {
        title: '详情页面',
        backText: '返回点餐'
      };
  }
};

interface HeaderProps {
  cartCount: number;
  onOpenCart: () => void;
  onOpenRadar: () => void;
  onOpenVIP: () => void;
  isVIPActive: boolean;
  diningMode: DiningMode;
  onDiningModeChange: (mode: DiningMode) => void;
  deliveryAddress: string;
  onChangeAddress: () => void;
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  pendingOrdersCount?: number;
  activeNavTab?: string;
  previousNavTab?: string;
  onBackToMenu?: () => void;
  customRouteConfig?: HeaderRouteConfig;
  onOpenCloudbaseModal?: () => void;
  onOpenMessageForm?: () => void;
  isCloudbaseConnected?: boolean;
  deliveryEvaluation?: DeliveryRangeEvaluation;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  currentTable?: string;
  onSwitchTable?: () => void;
  activeOrderNo?: string;
  onOpenFilterModal?: () => void;
  onlyDiscountFilter?: boolean;
  onToggleDiscountFilter?: () => void;
  onNavigateToPlatformMatrix?: () => void;
  onOpenAuthGate?: (role: 'merchant' | 'rider') => void;
  truckSpotName?: string;
  onOpenPickupDetail?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  cartCount,
  onOpenCart,
  onOpenRadar,
  onOpenVIP,
  isVIPActive,
  diningMode,
  onDiningModeChange,
  deliveryAddress,
  onChangeAddress,
  currentRole,
  onSelectRole,
  pendingOrdersCount = 3,
  activeNavTab = 'home',
  onOpenMessageForm,
  searchQuery,
  onSearchChange,
  viewMode = 'list',
  onViewModeChange,
  currentTable,
  onSwitchTable,
  activeOrderNo,
  onOpenFilterModal,
  onlyDiscountFilter,
  onToggleDiscountFilter,
  onNavigateToPlatformMatrix,
  onOpenAuthGate,
  deliveryEvaluation,
  truckSpotName = '黑曜石01车 · 北座中庭',
  onOpenPickupDetail
}) => {
  const [isFullscreen, setIsFullscreen] = useState(() => {
    if (typeof document !== 'undefined') {
      return !!document.fullscreenElement;
    }
    return false;
  });

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleToggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    } catch {}
  };

  const displayAddress =
    diningMode === 'delivery'
      ? `外送 · ${deliveryAddress || '静安大悦城商务座 1204室'}`
      : diningMode === 'dine_in'
      ? (currentTable ? `堂食 · ${currentTable}` : '堂食 · 请选座开台')
      : `自提 · ${truckSpotName || '黑曜石01车 · 北座中庭'}`;

  const handleTopAddressClick = () => {
    if (diningMode === 'delivery') {
      onChangeAddress();
    } else if (diningMode === 'dine_in') {
      if (onSwitchTable) onSwitchTable();
      else onChangeAddress();
    } else {
      if (onOpenPickupDetail) onOpenPickupDetail();
      else if (onSwitchTable) onSwitchTable();
      else onChangeAddress();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E2E4E8] select-none w-full">
      {/* Row 1: Status Bar / Brand Line */}
      <div className="px-3 pt-2.5 pb-2 flex items-center justify-between gap-1.5 flex-wrap sm:flex-nowrap">
        <button
          type="button"
          onClick={handleTopAddressClick}
          className="flex items-center space-x-1.5 text-left group focus:outline-none cursor-pointer min-w-0"
          title={
            diningMode === 'delivery'
              ? `配送地址: ${deliveryAddress || '静安大悦城商务座 1204室'}`
              : diningMode === 'dine_in'
              ? `堂食桌位: ${currentTable || '点击选桌开台'}`
              : `餐车自提点: ${truckSpotName || '黑曜石01车 · 北座中庭'}`
          }
        >
          <span
            className={`w-2 h-2 rounded-[1px] shrink-0 ${
              diningMode === 'delivery'
                ? 'bg-[#0092D6]'
                : diningMode === 'dine_in'
                ? 'bg-amber-600'
                : 'bg-emerald-600'
            }`}
          />
          <span className="font-bold tracking-tight text-[13px] text-[#121212] truncate max-w-[150px] sm:max-w-[200px]">
            {displayAddress}
          </span>
          <ChevronDown className="w-3 h-3 text-gray-400 group-hover:text-black shrink-0 transition-colors" />
        </button>

        <div className="flex items-center space-x-1.5 shrink-0">
          {/* #LIVE Pill Status */}
          <div className="hidden xs:flex items-center space-x-1 text-[11px] font-mono font-semibold px-1.5 py-0.5 text-[#121212]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse shrink-0" />
            <span>#LIVE</span>
          </div>

          {/* 全屏显示切换按钮 */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="w-7 h-7 flex items-center justify-center border border-[#D5D7DA] bg-white text-[#121212] hover:bg-gray-100 rounded transition-colors shadow-2xs cursor-pointer"
            title={isFullscreen ? '退出全屏' : '全屏显示'}
            aria-label={isFullscreen ? '退出全屏' : '全屏显示'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5 stroke-current" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5 stroke-current" />
            )}
          </button>

          {/* Message Icon */}
          {onOpenMessageForm && (
            <button
              type="button"
              onClick={onOpenMessageForm}
              className={`w-7 h-7 flex items-center justify-center border rounded transition-colors shadow-sm cursor-pointer ${
                activeNavTab === 'order_messages'
                  ? 'border-black bg-black text-white'
                  : 'border-[#D5D7DA] bg-white text-[#121212] hover:bg-gray-100'
              }`}
              title="消息"
            >
              <MessageSquare className="w-4 h-4 stroke-current" />
            </button>
          )}

          {/* 方案 A 融合版：全域工作台与分层授权中枢单点入口 */}
          <RoleSwitcherDropdown
            currentRole={currentRole}
            onSelectRole={onSelectRole}
            pendingOrdersCount={pendingOrdersCount}
            onNavigateToPlatformMatrix={onNavigateToPlatformMatrix}
            onOpenAuthGate={onOpenAuthGate}
          />
        </div>
      </div>

      {/* Row 2: Service Mode & Location Bar */}
      <div className="px-3 py-1.5 flex items-center justify-between border-t border-[#F0F1F3] gap-2 text-xs">
        {/* Order Mode Selector */}
        <div className="flex items-center border border-[#D0D3D8] rounded p-[2px] bg-[#F4F5F7] shrink-0 gap-0.5">
          <button
            type="button"
            onClick={() => onDiningModeChange('delivery')}
            className={`px-2 sm:px-2.5 py-1 rounded font-medium flex items-center space-x-1 cursor-pointer transition-all ${
              diningMode === 'delivery'
                ? 'bg-[#1A1A1A] text-white font-bold shadow-xs'
                : 'text-[#4B5563] hover:text-black hover:bg-white/70'
            }`}
            title="外卖专送 · 极速直送"
          >
            <Bike className="w-3.5 h-3.5 stroke-current shrink-0" />
            <span className="text-[11px] whitespace-nowrap">外卖</span>
          </button>
          <button
            type="button"
            onClick={() => onDiningModeChange('dine_in')}
            className={`px-2 sm:px-2.5 py-1 rounded font-medium flex items-center space-x-1 cursor-pointer transition-all ${
              diningMode === 'dine_in'
                ? 'bg-[#1A1A1A] text-white font-bold shadow-xs'
                : 'text-[#4B5563] hover:text-black hover:bg-white/70'
            }`}
            title="堂食就餐 · 扫码入座"
          >
            <Utensils className="w-3.5 h-3.5 stroke-current shrink-0" />
            <span className="text-[11px] whitespace-nowrap">堂食</span>
          </button>
          <button
            type="button"
            onClick={() => onDiningModeChange('pickup')}
            className={`px-2 sm:px-2.5 py-1 rounded font-medium flex items-center space-x-1 cursor-pointer transition-all ${
              diningMode === 'pickup'
                ? 'bg-[#1A1A1A] text-white font-bold shadow-xs'
                : 'text-[#4B5563] hover:text-black hover:bg-white/70'
            }`}
            title="餐车自提 · 免配送费"
          >
            <ShoppingBag className="w-3.5 h-3.5 stroke-current shrink-0" />
            <span className="text-[11px] whitespace-nowrap">自提</span>
          </button>
        </div>

        {/* Location Badge */}
        <button
          type="button"
          onClick={() => {
            if (diningMode === 'delivery') {
              onChangeAddress();
            } else if (diningMode === 'dine_in') {
              if (onSwitchTable) onSwitchTable();
              else onChangeAddress();
            } else {
              if (onOpenPickupDetail) onOpenPickupDetail();
              else if (onSwitchTable) onSwitchTable();
              else onChangeAddress();
            }
          }}
          className="flex items-center space-x-1 px-2 py-1 border border-[#D0D3D8] hover:border-neutral-400 rounded bg-white hover:bg-neutral-50 active:scale-[0.98] text-[11px] font-medium text-[#111] max-w-[140px] sm:max-w-[170px] truncate cursor-pointer transition-all shadow-2xs group shrink-0"
          title={
            diningMode === 'delivery'
              ? `外卖配送地址: ${deliveryAddress || '静安大悦城'}${deliveryEvaluation?.isOutOfRange ? ' (已超出配送范围)' : ''}`
              : diningMode === 'dine_in'
              ? `堂食桌号: ${currentTable || '点击选桌/扫码开台'}`
              : `餐车自提点: ${truckSpotName || '静安大悦城北座中庭餐车'}`
          }
        >
          {diningMode === 'delivery' ? (
            <>
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  deliveryEvaluation?.isOutOfRange ? 'bg-[#EF4444]' : 'bg-[#04A777]'
                }`}
              />
              <span className="truncate">
                {deliveryAddress
                  ? deliveryAddress.length > 5
                    ? deliveryAddress.slice(0, 5) + '...'
                    : deliveryAddress
                  : '静安大悦城...'}
              </span>
              {deliveryEvaluation?.isOutOfRange ? (
                <span className="text-[9px] text-[#EF4444] font-bold shrink-0">超区</span>
              ) : (
                <span className="text-[9px] text-gray-400 group-hover:text-black shrink-0">切换</span>
              )}
            </>
          ) : diningMode === 'dine_in' ? (
            <>
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  currentTable ? 'bg-[#10B981]' : 'bg-[#F59E0B] animate-pulse'
                }`}
              />
              <span className="truncate">
                {currentTable || '选座开台'}
              </span>
              <span className="text-[9px] text-amber-700 bg-amber-50 px-1 py-0.2 rounded font-medium shrink-0">
                {currentTable ? '换桌' : '扫码'}
              </span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] shrink-0" />
              <span className="truncate">
                {truckSpotName
                  ? truckSpotName.length > 6
                    ? truckSpotName.slice(0, 6) + '...'
                    : truckSpotName
                  : '01车自提点'}
              </span>
              <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded font-medium shrink-0">
                自提点
              </span>
            </>
          )}
        </button>
      </div>

      {/* Row 3: Search & Layout Controls Bar (when on home tab) */}
      {activeNavTab === 'home' && (
        <div className="px-3 py-2 flex items-center space-x-2 border-t border-[#F0F1F3] bg-[#FAFAFA]">
          {/* View Toggle (Grid / List) */}
          {onViewModeChange && (
            <div className="flex items-center border border-[#D0D3D8] rounded overflow-hidden bg-white shrink-0">
              <button
                type="button"
                onClick={() => onViewModeChange('grid2')}
                className={`w-7 h-7 flex items-center justify-center cursor-pointer transition-colors ${
                  viewMode === 'grid2'
                    ? 'bg-[#1A1A1A] text-white'
                    : 'text-gray-400 hover:text-black'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('list')}
                className={`w-7 h-7 flex items-center justify-center cursor-pointer transition-colors ${
                  viewMode === 'list'
                    ? 'bg-[#1A1A1A] text-white'
                    : 'text-gray-400 hover:text-black'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Search Input Bar */}
          <div className="flex-1 flex items-center border border-[#D0D3D8] rounded bg-white px-2.5 h-7">
            <Search className="w-3.5 h-3.5 text-gray-400 mr-2 shrink-0" />
            <input
              type="text"
              value={searchQuery || ''}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              className="w-full bg-transparent text-[11px] placeholder:text-gray-400 focus:outline-none border-none p-0 text-[#111]"
              placeholder="搜索菜品、食材、炭烤、和牛..."
            />
            {/* Favorite & Filter Icons inside search */}
            <div className="flex items-center space-x-2 pl-1 border-l border-gray-100 ml-1 text-gray-400 shrink-0">
              <button
                type="button"
                onClick={onToggleDiscountFilter}
                title="特惠筛选"
                className="cursor-pointer flex items-center justify-center"
              >
                <Star
                  className={`w-3.5 h-3.5 transition-colors ${
                    onlyDiscountFilter
                      ? 'fill-[#FF9900] text-[#FF9900]'
                      : 'text-gray-300 hover:text-[#FF9900]'
                  }`}
                />
              </button>
              <span className="text-gray-200">|</span>
              <button
                type="button"
                onClick={onOpenFilterModal}
                title="高级筛选"
                className="cursor-pointer flex items-center justify-center text-gray-500 hover:text-black transition-colors"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
