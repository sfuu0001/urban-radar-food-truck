export interface CarouselSlide {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  badge?: string;
  couponHighlight?: string;
  buttonText: string;
  actionType: 'scroll_category' | 'filter_keyword' | 'custom_modal' | 'toast';
  actionTarget: string;
  bgGradient: string;
  accentColor: string;
  badgeColor?: string;
  iconName?: string;
  isActive: boolean;
  order: number;
}

export interface MenuCarouselConfig {
  enabled: boolean;
  autoPlay: boolean;
  autoPlayInterval: number; // in milliseconds (e.g. 4000)
  heightMode: 'compact' | 'standard' | 'prominent';
  indicatorStyle: 'dots' | 'bars' | 'counter';
  showCategoryBreakpointBar?: boolean; // 控制轮播底部是否附带分类断点栏（默认已删除/纯净模式）
  slides: CarouselSlide[];
}

export type ThemePresetId = 'obsidian_noir' | 'amber_gold' | 'emerald_fresh' | 'starry_cobalt' | 'crimson_grill' | 'custom';

export interface MenuThemeConfig {
  presetId: ThemePresetId;
  presetName: string;
  primaryColor: string;
  accentColor: string;
  bgMode: 'warm_zinc' | 'clean_white' | 'dark_luxury' | 'soft_paper';
  cardRadius: 'rounded-none' | 'rounded-lg' | 'rounded-xl' | 'rounded-2xl' | 'rounded-3xl';
  cardShadow: 'flat' | 'subtle' | 'elevated';
  priceStyle: 'bold_accent' | 'luxury_minimal' | 'pill_tag';
  showCategorySlogan: boolean;
  showCraftBadge: boolean;
  showStockAlert: boolean;
  showScrollLinkageHud?: boolean; // 菜品滚动联动HUD胶囊（共X款·浏览X%），默认已删除/纯净模式
}

export interface MenuDesignSystem {
  version: string;
  updatedAt: string;
  carousel: MenuCarouselConfig;
  theme: MenuThemeConfig;
}

export const MENU_DESIGN_SYSTEM_STORAGE_KEY = 'obsidian_menu_design_system_v2';
export const MENU_DESIGN_SYSTEM_EVENT = 'obsidian_menu_design_system_changed';

export const DEFAULT_CAROUSEL_SLIDES: CarouselSlide[] = [
  {
    id: 'slide-night-carnival',
    title: '现制夜市狂欢节 · 爆款半价尝鲜',
    subtitle: '全单满 ¥39 立减 ¥8 · 安格斯和牛双重堡限时尝鲜立省¥15',
    tag: 'HOT 限时特惠',
    badge: '官方补贴',
    couponHighlight: '满¥39减¥8',
    buttonText: '立即抢购',
    actionType: 'scroll_category',
    actionTarget: 'popular',
    bgGradient: 'from-[#1c1917] via-[#292524] to-[#7c2d12]',
    accentColor: '#f59e0b',
    badgeColor: '#b45309',
    iconName: 'Flame',
    isActive: true,
    order: 1
  },
  {
    id: 'slide-skewer-feast',
    title: '280℃果木菊花炭烤 · 现串现炙',
    subtitle: '当日冷鲜肉源排酸直达 · 招牌串串买5赠1，配赠九味秘制干碟',
    tag: '招牌必吃',
    badge: '果木现烤',
    couponHighlight: '买5送1',
    buttonText: '选购炭烤',
    actionType: 'scroll_category',
    actionTarget: 'skewers',
    bgGradient: 'from-[#1c1917] via-[#431407] to-[#9a3412]',
    accentColor: '#fb923c',
    badgeColor: '#ea580c',
    iconName: 'Sparkles',
    isActive: true,
    order: 2
  },
  {
    id: 'slide-express-delivery',
    title: '黑曜石极速专送 · 核心商圈免配',
    subtitle: '专业保温箱锁温30分钟必达 · 超时自动赔付¥10无门槛立减金',
    tag: '外卖专享',
    badge: '准时必达',
    couponHighlight: '全免配送费',
    buttonText: '浏览专送',
    actionType: 'scroll_category',
    actionTarget: 'popular',
    bgGradient: 'from-[#0f172a] via-[#1e293b] to-[#1e3a8a]',
    accentColor: '#38bdf8',
    badgeColor: '#0284c7',
    iconName: 'Bike',
    isActive: true,
    order: 3
  },
  {
    id: 'slide-vip-perks',
    title: '黑卡会员专属日 · 每周二享88折',
    subtitle: '入会首单立返100能量积分 · 尊享主厨秘制酱料自选与优先出餐',
    tag: '会员权益',
    badge: '尊贵特权',
    couponHighlight: '全场88折',
    buttonText: '查看特权',
    actionType: 'scroll_category',
    actionTarget: 'popular',
    bgGradient: 'from-[#18181b] via-[#27272a] to-[#713f12]',
    accentColor: '#facc15',
    badgeColor: '#ca8a04',
    iconName: 'Crown',
    isActive: true,
    order: 4
  }
];

export const THEME_PRESETS: Record<ThemePresetId, MenuThemeConfig> = {
  obsidian_noir: {
    presetId: 'obsidian_noir',
    presetName: '黑曜石黑金 (经典高级沉浸)',
    primaryColor: '#171717',
    accentColor: '#f59e0b',
    bgMode: 'warm_zinc',
    cardRadius: 'rounded-none',
    cardShadow: 'subtle',
    priceStyle: 'bold_accent',
    showCategorySlogan: true,
    showCraftBadge: true,
    showStockAlert: true,
    showScrollLinkageHud: false
  },
  amber_gold: {
    presetId: 'amber_gold',
    presetName: '琥珀暖阳 (温暖美味食欲)',
    primaryColor: '#b45309',
    accentColor: '#d97706',
    bgMode: 'clean_white',
    cardRadius: 'rounded-none',
    cardShadow: 'subtle',
    priceStyle: 'bold_accent',
    showCategorySlogan: true,
    showCraftBadge: true,
    showStockAlert: true,
    showScrollLinkageHud: false
  },
  emerald_fresh: {
    presetId: 'emerald_fresh',
    presetName: '翡翠绿意 (清爽有机自然)',
    primaryColor: '#065f46',
    accentColor: '#10b981',
    bgMode: 'clean_white',
    cardRadius: 'rounded-none',
    cardShadow: 'flat',
    priceStyle: 'pill_tag',
    showCategorySlogan: true,
    showCraftBadge: true,
    showStockAlert: false,
    showScrollLinkageHud: false
  },
  starry_cobalt: {
    presetId: 'starry_cobalt',
    presetName: '星穹深蓝 (赛博夜市潮店)',
    primaryColor: '#1e3a8a',
    accentColor: '#3b82f6',
    bgMode: 'dark_luxury',
    cardRadius: 'rounded-none',
    cardShadow: 'elevated',
    priceStyle: 'bold_accent',
    showCategorySlogan: true,
    showCraftBadge: true,
    showStockAlert: true,
    showScrollLinkageHud: false
  },
  crimson_grill: {
    presetId: 'crimson_grill',
    presetName: '绯红炭火 (热烈喷香炙烤)',
    primaryColor: '#991b1b',
    accentColor: '#ef4444',
    bgMode: 'warm_zinc',
    cardRadius: 'rounded-none',
    cardShadow: 'subtle',
    priceStyle: 'bold_accent',
    showCategorySlogan: true,
    showCraftBadge: true,
    showStockAlert: true,
    showScrollLinkageHud: false
  },
  custom: {
    presetId: 'custom',
    presetName: '自定义自由设计',
    primaryColor: '#171717',
    accentColor: '#f59e0b',
    bgMode: 'warm_zinc',
    cardRadius: 'rounded-none',
    cardShadow: 'subtle',
    priceStyle: 'bold_accent',
    showCategorySlogan: true,
    showCraftBadge: true,
    showStockAlert: true,
    showScrollLinkageHud: false
  }
};

export const DEFAULT_MENU_DESIGN_SYSTEM: MenuDesignSystem = {
  version: '2.0.0',
  updatedAt: new Date().toISOString(),
  carousel: {
    enabled: true,
    autoPlay: true,
    autoPlayInterval: 4500,
    heightMode: 'compact', // 精简流线型紧凑版式 (Streamlined Compact Design)
    indicatorStyle: 'dots',
    showCategoryBreakpointBar: false, // 默认删除附带分类断点条，保持纯净高级轮播形态
    slides: DEFAULT_CAROUSEL_SLIDES
  },
  theme: THEME_PRESETS.obsidian_noir
};

export function getMenuDesignSystem(): MenuDesignSystem {
  try {
    const raw = localStorage.getItem(MENU_DESIGN_SYSTEM_STORAGE_KEY);
    if (!raw) return DEFAULT_MENU_DESIGN_SYSTEM;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_MENU_DESIGN_SYSTEM,
      ...parsed,
      carousel: {
        ...DEFAULT_MENU_DESIGN_SYSTEM.carousel,
        ...(parsed.carousel || {}),
        showCategoryBreakpointBar: parsed.carousel?.showCategoryBreakpointBar === true,
        slides: parsed.carousel?.slides || DEFAULT_CAROUSEL_SLIDES
      },
      theme: {
        ...DEFAULT_MENU_DESIGN_SYSTEM.theme,
        ...(parsed.theme || {}),
        showScrollLinkageHud: parsed.theme?.showScrollLinkageHud === true
      }
    };
  } catch (err) {
    console.warn('[MenuDesignSystem] Failed to read from localStorage, using default:', err);
    return DEFAULT_MENU_DESIGN_SYSTEM;
  }
}

export function saveMenuDesignSystem(newSystem: MenuDesignSystem): void {
  try {
    const toSave: MenuDesignSystem = {
      ...newSystem,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(MENU_DESIGN_SYSTEM_STORAGE_KEY, JSON.stringify(toSave));
    window.dispatchEvent(new CustomEvent(MENU_DESIGN_SYSTEM_EVENT, { detail: toSave }));
  } catch (err) {
    console.error('[MenuDesignSystem] Failed to save to localStorage:', err);
  }
}

export function resetMenuDesignSystemToDefault(): MenuDesignSystem {
  try {
    localStorage.removeItem(MENU_DESIGN_SYSTEM_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(MENU_DESIGN_SYSTEM_EVENT, { detail: DEFAULT_MENU_DESIGN_SYSTEM }));
  } catch (e) {
    // ignore
  }
  return DEFAULT_MENU_DESIGN_SYSTEM;
}

export function subscribeMenuDesignSystem(callback: (config: MenuDesignSystem) => void): () => void {
  const handler = (evt: Event) => {
    const customEvt = evt as CustomEvent<MenuDesignSystem>;
    callback(customEvt.detail || getMenuDesignSystem());
  };
  window.addEventListener(MENU_DESIGN_SYSTEM_EVENT, handler);
  return () => {
    window.removeEventListener(MENU_DESIGN_SYSTEM_EVENT, handler);
  };
}
