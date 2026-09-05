import React from 'react';
import { ArrowLeft, Ticket, ShoppingBag, ClipboardList, User, Compass, Cloud, MessageSquareText } from 'lucide-react';
import { motion } from 'motion/react';
import { DiningModeSelector, DiningMode } from './DiningModeSelector';
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
  previousNavTab = 'home',
  onBackToMenu,
  customRouteConfig,
  onOpenCloudbaseModal,
  onOpenMessageForm,
  isCloudbaseConnected = true,
  deliveryEvaluation,
  searchQuery,
  onSearchChange,
  viewMode = 'grid2',
  onViewModeChange,
  currentTable,
  onSwitchTable,
  activeOrderNo
}) => {
  const routeConfig = customRouteConfig || getRouteConfig(activeNavTab, previousNavTab, isVIPActive);
  const isSubRoute = activeNavTab !== 'home';

  return (
    <div className="w-full flex flex-col shrink-0 z-40 select-none">
      {/* Top Nav: Artisan Architectural Header */}
      <header
        id="main-unified-header"
        className="bg-paper-card border-b border-line px-3 pt-2 pb-2 z-20 flex-shrink-0"
      >
        {/* Top Live Status Row */}
        <div className="flex items-center justify-between text-[10px] font-mono tracking-wider text-pitch border-b border-line pb-1.5 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 bg-pitch shrink-0"></span>
            <span className="font-black uppercase tracking-tight">URBAN RADAR / TOKYO CRAFT</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-pitch">
              <span className="inline-block w-1.5 h-1.5 bg-emeraldAccent rounded-full animate-pulse shrink-0"></span>
              <span className="hidden xs:inline">800°C BICHOTAN #LIVE</span>
              <span className="xs:hidden">#LIVE</span>
            </div>

            {/* Historical Order Messages / Message Hub Trigger */}
            {onOpenMessageForm && (
              <button
                type="button"
                onClick={onOpenMessageForm}
                className={`w-6 h-6 border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                  activeNavTab === 'order_messages'
                    ? 'border-pitch bg-pitch text-white'
                    : 'border-line bg-white hover:bg-stone-100 text-pitch'
                }`}
                title="查看订单协同联络室"
              >
                <MessageSquareText className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Role Switcher Dropdown */}
            <RoleSwitcherDropdown
              currentRole={currentRole}
              onSelectRole={onSelectRole}
              pendingOrdersCount={pendingOrdersCount}
            />
          </div>
        </div>

        {/* 3-Mode Selector & Table Spec Status */}
        <div className="flex items-center justify-between gap-1.5 mb-2">
          <div className="flex items-center border border-pitch bg-white p-0 m-0 shrink-0">
            <button
              type="button"
              onClick={() => onDiningModeChange('delivery')}
              className={`text-[10px] font-mono font-bold px-2 py-0.5 tracking-tight uppercase m-0 border-r border-pitch cursor-pointer transition-colors ${
                diningMode === 'delivery'
                  ? 'bg-pitch text-white'
                  : 'text-stone-600 hover:text-pitch bg-white'
              }`}
            >
              外卖
            </button>
            <button
              type="button"
              onClick={() => onDiningModeChange('dine_in')}
              className={`text-[10px] font-mono font-bold px-2 py-0.5 tracking-tight uppercase m-0 border-r border-line cursor-pointer transition-colors ${
                diningMode === 'dine_in'
                  ? 'bg-pitch text-white'
                  : 'text-stone-600 hover:text-pitch bg-white'
              }`}
            >
              堂食 · 点单
            </button>
            <button
              type="button"
              onClick={() => onDiningModeChange('pickup')}
              className={`text-[10px] font-mono px-2 py-0.5 tracking-tight uppercase m-0 flex items-center gap-0.5 cursor-pointer transition-colors ${
                diningMode === 'pickup'
                  ? 'bg-pitch text-white font-bold'
                  : 'text-stone-500 hover:text-pitch bg-white'
              }`}
            >
              自提▾
            </button>
          </div>

          <div className="flex items-center gap-1 min-w-0">
            <span className="text-[9px] font-mono bg-techTag text-stone-700 px-1 py-0.5 border border-line shrink-0">
              单号 #{activeOrderNo || '8921'}
            </span>
            <button
              type="button"
              onClick={onSwitchTable || onChangeAddress}
              className="text-[10px] font-mono px-2 py-0.5 bg-paper hover:bg-stone-100 border border-pitch text-pitch font-black flex items-center gap-1 transition-colors cursor-pointer truncate"
              title={diningMode === 'delivery' ? deliveryAddress : '点击切换堂食就餐桌号'}
            >
              <span className="w-1.5 h-1.5 bg-emeraldAccent rounded-full shrink-0"></span>
              <span className="truncate">
                {diningMode === 'delivery'
                  ? (deliveryAddress ? deliveryAddress.slice(0, 5) + '…' : '配送点')
                  : `桌号 ${currentTable || 'T-04'}`}
              </span>
              <span className="text-[8px] text-stone-500 border-l border-line pl-1 shrink-0">切换▾</span>
            </button>
          </div>
        </div>

        {/* Industrial Search Bar with Matrix Toggle & Filter (when on home tab and onSearchChange is provided) */}
        {activeNavTab === 'home' && onSearchChange && (
          <div className="flex items-center gap-1.5">
            <div className="flex-1 flex items-center border border-line bg-white px-2 py-1 justify-between shadow-inner">
              <div className="flex-1 flex items-center gap-1.5 text-xs text-stone-400 font-mono min-w-0">
                <svg
                  className="w-3.5 h-3.5 text-stone-600 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                    strokeWidth="2"
                  ></path>
                </svg>
                <input
                  type="text"
                  value={searchQuery || ''}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="检索菜品 / 备长炭 / 序号 [SK-XX]"
                  className="w-full bg-transparent border-none text-[10px] font-mono text-pitch placeholder-stone-400 focus:outline-none focus:ring-0 p-0 m-0"
                />
              </div>
              <span className="text-[8px] font-mono bg-techTag text-stone-600 px-1 py-0.5 border border-line uppercase shrink-0">
                SEARCH
              </span>
            </div>

            {onViewModeChange && (
              <div className="flex items-center border border-line bg-white shrink-0">
                <button
                  type="button"
                  onClick={() => onViewModeChange('grid2')}
                  aria-label="九宫格"
                  className={`p-1 border-r border-line cursor-pointer transition-colors ${
                    viewMode === 'grid2' ? 'bg-pitch text-white' : 'text-stone-500 hover:text-pitch'
                  }`}
                  title="切换双列网格视图"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M4 4h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4zM4 10h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4zM4 16h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4z"></path>
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => onViewModeChange('list')}
                  aria-label="列表"
                  className={`p-1 cursor-pointer transition-colors ${
                    viewMode === 'list' ? 'bg-pitch text-white' : 'text-stone-500 hover:text-pitch'
                  }`}
                  title="切换单列工单列表视图"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"></path>
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Sub-Route Header Bar (Rendered only on sub-views with back navigation) */}
        {isSubRoute && onBackToMenu && (
          <div className="mt-1 pt-1.5 border-t border-line flex items-center justify-between">
            <button
              type="button"
              onClick={onBackToMenu}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-paper hover:bg-stone-100 border border-pitch text-[10px] font-mono font-bold text-pitch transition-colors cursor-pointer"
              id="sub-header-back-button"
              title={routeConfig?.backText || '返回点餐'}
            >
              <ArrowLeft className="w-3 h-3 text-pitch stroke-[2.2]" />
              <span>{routeConfig?.backText || '返回点餐'}</span>
            </button>

            {routeConfig && (
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-pitch font-bold">
                {routeConfig.icon}
                <span>{routeConfig.title}</span>
              </div>
            )}
          </div>
        )}
      </header>

      {/* BEGIN: Obsidian Delivery Craft Banner (SCREEN_2 signature) */}
      <div
        className="bg-pitch text-white px-3 py-1.5 border-b border-pitch flex-shrink-0 active-blueprint-grid shadow-draft-active cursor-pointer"
        onClick={onOpenRadar}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amberAccent animate-ping shrink-0"></span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[11px] font-black tracking-wider text-amberAccent font-mono">
                黑曜极速专送
              </span>
              <span className="text-[9px] font-mono text-stone-300">
                {diningMode === 'delivery'
                  ? deliveryEvaluation?.isOutOfRange
                    ? '超配送范围 · 点击查看'
                    : '30MIN 免配'
                  : '800°C 炭火现烤 · 随叫随到'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[8px] font-mono text-stone-400 border border-stone-600 px-1 py-px">
              {diningMode === 'delivery' ? '专送模式' : diningMode === 'dine_in' ? '堂食模式' : '自提模式'}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenRadar();
              }}
              className="text-[9px] font-mono font-bold bg-amberAccent text-pitch px-1.5 py-0.5 uppercase tracking-wider flex items-center gap-0.5 hover:bg-amber-400 transition-colors cursor-pointer"
            >
              <span>选项</span>
              <span className="text-[8px]">▼</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
