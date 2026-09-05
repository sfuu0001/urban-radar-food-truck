import React from 'react';
import { ArrowLeft, Ticket, ShoppingBag, ClipboardList, User, Compass, Cloud, MessageSquareText } from 'lucide-react';
import { motion } from 'motion/react';
import { DiningModeSelector, DiningMode } from './DiningModeSelector';
import { RoleSwitcherDropdown, UserRole } from './RoleSwitcherDropdown';
import { DeliveryRangeEvaluation } from '../utils/truckLocationEngine';

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
  deliveryEvaluation
}) => {
  const routeConfig = customRouteConfig || getRouteConfig(activeNavTab, previousNavTab, isVIPActive);
  const isSubRoute = activeNavTab !== 'home';

  return (
    <header
      id="main-unified-header"
      className="bg-[#f9f9f7]/95 backdrop-blur-md sticky top-0 z-40 w-full border-b border-[#e2e3e1] shadow-2xs transition-all flex flex-col"
    >
      {/* Primary Top Bar: Dining Mode Dropdown (Left) & Message Form / Role Switcher (Right) */}
      <div className="flex justify-between items-center w-full px-3 sm:px-4 py-2">
        <div className="flex items-center">
          <DiningModeSelector
            currentMode={diningMode}
            onModeChange={onDiningModeChange}
            deliveryAddress={deliveryAddress}
            onChangeAddress={onChangeAddress}
            evaluation={deliveryEvaluation}
            onOpenRangeDetails={onOpenRadar}
          />
        </div>

        {/* Right Controls: Role Switcher Dropdown & Historical Orders Message Form Button */}
        <div className="flex items-center gap-1.5">
          {onOpenMessageForm ? (
            <motion.button
              type="button"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={onOpenMessageForm}
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors cursor-pointer shadow-2xs group shrink-0 ${
                activeNavTab === 'order_messages'
                  ? 'border-neutral-900 bg-[#ffffff] text-neutral-900'
                  : 'border-neutral-300 bg-[#ffffff] hover:bg-neutral-50 text-neutral-800'
              }`}
              title="查看历史订单表单 (支持打开各订单在线消息界面)"
            >
              <div className="relative flex items-center justify-center">
                <MessageSquareText className={`w-4 h-4 shrink-0 group-hover:scale-110 transition-transform ${
                  activeNavTab === 'order_messages' ? 'text-neutral-900' : 'text-neutral-700'
                }`} />
                <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-neutral-900" />
              </div>
            </motion.button>
          ) : onOpenCloudbaseModal ? (
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onOpenCloudbaseModal}
              className="h-8 px-2.5 rounded-full border border-neutral-300 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="腾讯云数据同步"
            >
              <Cloud className="w-3.5 h-3.5 text-neutral-700" />
              <span className="hidden sm:inline">腾讯云同步</span>
              <span className="w-1.5 h-1.5 rounded-full bg-black" />
            </motion.button>
          ) : null}

          <RoleSwitcherDropdown
            currentRole={currentRole}
            onSelectRole={onSelectRole}
            pendingOrdersCount={pendingOrdersCount}
          />
        </div>
      </div>

      {/* Sub-Route Header Bar (Rendered only on sub-views with back navigation) */}
      {isSubRoute && onBackToMenu && (
        <div className="border-t border-[#e8e8e5] bg-white/90 backdrop-blur-md px-3 sm:px-4 py-1.5 flex items-center justify-between">
          <motion.button
            type="button"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            whileHover={{ scale: 1.02, x: -1 }}
            whileTap={{ scale: 0.96 }}
            onClick={onBackToMenu}
            className="group relative overflow-hidden inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white hover:bg-neutral-50 backdrop-blur-md border border-neutral-200 text-[12px] font-bold text-[#1a1c1b] shadow-2xs transition-all cursor-pointer"
            id="sub-header-back-button"
            title={routeConfig?.backText || '返回点餐'}
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-[#1a1c1b] stroke-[2.2]" />
            <span>{routeConfig?.backText || '返回点餐'}</span>
          </motion.button>

          {routeConfig && (
            <div className="flex items-center gap-1.5 text-xs text-neutral-600 font-medium">
              {routeConfig.icon}
              <span className="font-bold text-neutral-900">{routeConfig.title}</span>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
