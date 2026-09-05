import { safeGetStorage, safeSetStorage } from './safeStorage';

export type TruckExpandMode = 'countdown' | 'immediate' | 'disabled';
export type TruckExpandTarget = 'menu_pullup' | 'banner' | 'both';
export type TruckExpandScene = 'always' | 'daily_first' | 'new_visitor' | 'once_per_session' | 'manual_dismiss_suppress';

export interface TruckExpandConfig {
  /** 展开模式：countdown (倒计时自动展开) | immediate (直接展开) | disabled (不自动展开/手动展开) */
  mode: TruckExpandMode;
  /** 倒计时时长 (秒)，支持 0.5 ~ 15.0 秒，步长 0.5s，默认 2.0 秒 */
  delaySeconds: number;
  /** 展开触达目标：menu_pullup (底部餐车抽屉菜单) | banner (顶部餐车看板) | both (两者联动) */
  target: TruckExpandTarget;
  /** 触发频次策略：always (每次进入首页) | daily_first (每日首次) | new_visitor (仅新客首单) | once_per_session (会话单次) | manual_dismiss_suppress (用户主动关闭后永不重复自动弹出) */
  triggerScene: TruckExpandScene;
  /** 用户手势打断：用户在倒计时期间滚动页面或点击其他区域时是否取消本次自动展开 */
  userCancelable: boolean;
  /** 是否在前台显示倒计时进度环与提示气泡 */
  showCountdownRing: boolean;
  /** 是否渲染底部导航“点单”上方的常驻“X秒后展开餐车/展开餐车菜单”浮动气泡按钮 */
  showPullUpMenuPill: boolean;
  /** 是否渲染底部导航“订单”上方的“配送中/制作中”实时履约状态浮动气泡按钮 */
  showActiveOrderBubble: boolean;
  /** 是否在顾客端菜单滚动时渲染分类联动悬浮指示器气泡HUD（“主食/烧烤 共X款·浏览X%”，默认已删除/纯净模式） */
  showScrollLinkageHud: boolean;
  /** 是否在顾客端菜单主页面渲染左侧“2级齿轮选择器”双栏分类组件 */
  showGearCategoryDial: boolean;
  /** 2级齿轮选择器配色外观主题：white (白色高亮模式) | dark (纯黑机械模式)，默认 white */
  gearDialTheme: 'white' | 'dark';
  /** 展开时是否触发轻微设备触觉震动反馈 */
  hapticFeedback: boolean;
  /** 自动展开后多长时间自动收起 (秒，0 表示不自动收起，默认 0 或由场景设定如 6 秒) */
  autoCollapseAfterSeconds: number;
  /** 用户主动关闭后是否彻底记住，在本次会话/跨会话中不再重复弹出 */
  rememberUserDismissal: boolean;
  /** 首页进入时是否自动执行展开 */
  enableOnNavTabHome: boolean;
  /** 底部点单按钮点击时是否遵循倒计时/直开策略 */
  enableOnTabClick: boolean;
  /** 加购商品后是否自动收起餐车抽屉避免遮挡列表 */
  collapseOnAddToCart: boolean;
  /** 切换子路由或进入购物车/订单页时自动收起 */
  collapseOnNavigate: boolean;
  /** 滚动菜单列表超过阈值时自动收起浮层 */
  collapseOnPageScroll: boolean;
  /** 最后更新时间 */
  updatedAt: string;
}

export const DEFAULT_TRUCK_EXPAND_CONFIG: TruckExpandConfig = {
  mode: 'countdown',
  delaySeconds: 2.0,
  target: 'both',
  triggerScene: 'daily_first',
  userCancelable: true,
  showCountdownRing: true,
  showPullUpMenuPill: true,
  showActiveOrderBubble: true,
  showScrollLinkageHud: false,
  showGearCategoryDial: false,
  gearDialTheme: 'white',
  hapticFeedback: true,
  autoCollapseAfterSeconds: 0,
  rememberUserDismissal: true,
  enableOnNavTabHome: true,
  enableOnTabClick: true,
  collapseOnAddToCart: true,
  collapseOnNavigate: true,
  collapseOnPageScroll: true,
  updatedAt: '2026-08-29 12:00:00'
};

export const TRUCK_EXPAND_STORAGE_KEY = 'obsidian_truck_expand_config';
export const TRUCK_EXPAND_CONFIG_EVENT = 'obsidian_truck_expand_config_changed';
export const TRUCK_USER_DISMISSED_KEY = 'obsidian_truck_pullup_user_dismissed';
export const TRUCK_SESSION_EXPANDED_KEY = 'obsidian_truck_pullup_session_expanded';

/**
 * 检查用户是否曾经主动关闭过餐车菜单（针对场景：用户关闭后下次不再重复自动弹出）
 */
export function hasUserDismissedTruckMenu(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const val = localStorage.getItem(TRUCK_USER_DISMISSED_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

/**
 * 记录用户主动关闭餐车菜单的操作标记
 */
export function recordUserDismissedTruckMenu(permanent: boolean = true): void {
  if (typeof window === 'undefined') return;
  try {
    if (permanent) {
      localStorage.setItem(TRUCK_USER_DISMISSED_KEY, 'true');
    }
    sessionStorage.setItem(TRUCK_SESSION_EXPANDED_KEY, 'true');
  } catch {
    // ignore
  }
}

/**
 * 重置用户关闭记录（供商家后台测试/重置演示使用）
 */
export function resetUserDismissedRecord(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(TRUCK_USER_DISMISSED_KEY);
    sessionStorage.removeItem(TRUCK_SESSION_EXPANDED_KEY);
  } catch {
    // ignore
  }
}

/**
 * 获取当前商家后台配置的餐车自动展开策略
 */
export function getTruckExpandConfig(): TruckExpandConfig {
  const current = safeGetStorage<TruckExpandConfig>(TRUCK_EXPAND_STORAGE_KEY, DEFAULT_TRUCK_EXPAND_CONFIG);
  return {
    ...DEFAULT_TRUCK_EXPAND_CONFIG,
    ...current
  };
}

/**
 * 商家后台保存并全系统广播餐车自动展开策略
 */
export function saveTruckExpandConfig(newConfig: Partial<TruckExpandConfig>): TruckExpandConfig {
  const current = getTruckExpandConfig();
  const merged: TruckExpandConfig = {
    ...current,
    ...newConfig,
    updatedAt: new Date().toLocaleString('zh-CN', { hour12: false })
  };
  safeSetStorage(TRUCK_EXPAND_STORAGE_KEY, merged);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TRUCK_EXPAND_CONFIG_EVENT, { detail: merged }));
  }
  return merged;
}

/**
 * 订阅餐车自动展开配置变动事件
 */
export function subscribeTruckExpandConfig(callback: (config: TruckExpandConfig) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<TruckExpandConfig>;
    if (customEvent.detail) {
      callback(customEvent.detail);
    } else {
      callback(getTruckExpandConfig());
    }
  };
  window.addEventListener(TRUCK_EXPAND_CONFIG_EVENT, handler);
  return () => {
    window.removeEventListener(TRUCK_EXPAND_CONFIG_EVENT, handler);
  };
}

/**
 * 获取策略的中文简要说明
 */
export function getStrategyDescription(config: TruckExpandConfig): string {
  if (config.mode === 'immediate') {
    return '直接展开餐车 (0秒即开)';
  }
  if (config.mode === 'disabled') {
    return '不自动展开 (纯手动触发)';
  }
  return `${config.delaySeconds.toFixed(1)}秒后自动展开餐车`;
}

