import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Flame,
  UtensilsCrossed,
  Beef,
  CookingPot,
  Coffee,
  CakeSlice,
  Cookie,
  Sparkles,
  Layers,
  Drumstick,
  Crown,
  ChevronRight,
  ShoppingBag,
  Check,
  Volume2,
  VolumeX,
  Radio
} from 'lucide-react';
import { CategoryType } from '../types';
import { CATEGORY_TAXONOMY, PrimaryCategoryConfig } from '../data/categoryTaxonomy';
import { playCategoryLinkSound, playCategorySnapSound } from '../utils/hapticAudio';

interface DeliveryCategorySidebarProps {
  categories: CategoryType[];
  activeCategory: CategoryType;
  onSelectCategory: (category: CategoryType) => void;
  categoryCounts?: Record<string, number>;
  categoryCartCounts?: Record<string, number>;
  categoryScrollProgress?: number;
  isScrolling?: boolean;
  soundFeedbackEnabled?: boolean;
  onToggleSoundFeedback?: () => void;
}

// 模拟轻触触觉音效反馈 (Web Audio 轻微高频柔和轻击音，营造媲美原生 App 的微交互质感)
const playHapticTap = () => {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(560, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(280, ctx.currentTime + 0.035);
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.035);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  } catch {
    // 忽略音频环境不可用情况
  }
};

// 专用分类矢量图标组件 (统一精简设计，去除非必要的无限循环晃动，保持利落专业)
const CategoryThemedIcon: React.FC<{
  catKey: CategoryType;
  isActive: boolean;
  className?: string;
}> = ({ catKey, isActive, className = 'w-4 h-4' }) => {
  const iconColor = isActive ? 'text-amber-400' : 'text-neutral-600 group-hover:text-neutral-900';

  switch (catKey) {
    case 'popular':
      return <Flame className={`${className} ${iconColor} transition-colors`} />;
    case 'skewers':
      return <UtensilsCrossed className={`${className} ${iconColor} transition-colors`} />;
    case 'yakitori':
      return <Drumstick className={`${className} ${iconColor} transition-colors`} />;
    case 'baked':
      return <Layers className={`${className} ${iconColor} transition-colors`} />;
    case 'western':
      return <Beef className={`${className} ${iconColor} transition-colors`} />;
    case 'mains':
      return <CookingPot className={`${className} ${iconColor} transition-colors`} />;
    case 'drinks':
      return <Coffee className={`${className} ${iconColor} transition-colors`} />;
    case 'desserts':
      return <CakeSlice className={`${className} ${iconColor} transition-colors`} />;
    case 'snacks':
      return <Cookie className={`${className} ${iconColor} transition-colors`} />;
    case 'all':
    default:
      return <Sparkles className={`${className} ${iconColor} transition-colors`} />;
  }
};

// 统一精简的分类图标盒样式
const getCategoryAvatarStyle = (isActive: boolean) => {
  if (isActive) {
    return 'bg-neutral-800 text-amber-400 border border-neutral-700/70 shadow-inner';
  }
  return 'bg-white text-neutral-600 border border-neutral-200/80 shadow-2xs group-hover:bg-neutral-100 group-hover:text-neutral-900 group-hover:border-neutral-300';
};

export const DeliveryCategorySidebar: React.FC<DeliveryCategorySidebarProps> = ({
  categories,
  activeCategory,
  onSelectCategory,
  categoryCounts = {},
  categoryCartCounts = {},
  categoryScrollProgress = 0,
  isScrolling = false,
  soundFeedbackEnabled = true,
  onToggleSoundFeedback
}) => {
  const sidebarContainerRef = useRef<HTMLDivElement>(null);
  const [justClickedCat, setJustClickedCat] = useState<CategoryType | null>(null);
  const [hoveredCat, setHoveredCat] = useState<{ key: CategoryType; top: number } | null>(null);
  const [pulseCategory, setPulseCategory] = useState<CategoryType | null>(null);
  const previousActiveCatRef = useRef<CategoryType>(activeCategory);
  const lastSoundTimeRef = useRef<number>(0);

  // 当右侧菜品滚动联动或者点击选中分类发生改变时，自动将选中的侧边项在侧边栏容器内平滑滚动居中
  useEffect(() => {
    const container = sidebarContainerRef.current;
    if (!container || !activeCategory) return;

    const activeItem = container.querySelector<HTMLElement>(
      `[data-sidebar-category="${activeCategory}"]`
    );
    if (activeItem) {
      const containerHeight = container.clientHeight;
      const itemOffsetTop = activeItem.offsetTop;
      const itemHeight = activeItem.clientHeight;
      const targetScroll = itemOffsetTop - containerHeight / 2 + itemHeight / 2;

      container.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: 'smooth'
      });
    }

    if (previousActiveCatRef.current !== activeCategory) {
      previousActiveCatRef.current = activeCategory;
      setPulseCategory(activeCategory);

      const now = Date.now();
      if (soundFeedbackEnabled && now - lastSoundTimeRef.current > 180) {
        const idx = categories.indexOf(activeCategory);
        playCategoryLinkSound(idx >= 0 ? idx : 0);
        lastSoundTimeRef.current = now;
      }

      const timer = setTimeout(() => {
        setPulseCategory(null);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [activeCategory, soundFeedbackEnabled, categories]);

  const handleItemClick = (catKey: CategoryType) => {
    if (soundFeedbackEnabled) {
      playCategorySnapSound();
    }
    setJustClickedCat(catKey);
    setTimeout(() => {
      setJustClickedCat(null);
    }, 350);
    onSelectCategory(catKey);
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>, catKey: CategoryType) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = sidebarContainerRef.current?.getBoundingClientRect();
    const topOffset = containerRect ? rect.top - containerRect.top + rect.height / 2 : rect.top;
    setHoveredCat({ key: catKey, top: topOffset });
  };

  const handleMouseLeave = () => {
    setHoveredCat(null);
  };

  const currentActiveIndex = categories.indexOf(activeCategory);

  return (
    <aside
      ref={sidebarContainerRef}
      className="w-20 shrink-0 self-start sticky top-0 z-20 bg-paper border-r border-line flex flex-col overflow-y-auto no-scrollbar blueprint-grid max-h-[calc(100dvh-125px)] select-none"
      data-purpose="artisan-category-navigator"
      style={{
        WebkitOverflowScrolling: 'touch'
      }}
    >
      {/* 顶部极简当前品类索引与轻量音效开关 */}
      <div className="sticky top-0 bg-paper-card z-10 border-b border-line px-1.5 py-1 flex items-center justify-between font-mono text-[10px]">
        <div className="font-bold tracking-tight text-pitch">
          <span className="text-pitch">{currentActiveIndex >= 0 ? currentActiveIndex + 1 : 1}</span>
          <span className="text-stone-400 text-[8px] mx-0.5">/</span>
          <span className="text-stone-400">{categories.length}</span>
        </div>

        {onToggleSoundFeedback && (
          <button
            type="button"
            onClick={onToggleSoundFeedback}
            aria-label="广播导览提示"
            title={soundFeedbackEnabled ? '点击静音分类触觉音效' : '点击开启分类触觉音效'}
            className="text-amberAccent hover:scale-105 transition-transform p-0.5 cursor-pointer"
          >
            <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path>
            </svg>
          </button>
        )}
      </div>

      <nav className="flex flex-col w-full divide-y divide-line/70">
        {categories.map((catKey, idx) => {
          const config: PrimaryCategoryConfig | undefined = CATEGORY_TAXONOMY[catKey];
          if (!config) return null;

          const isActive = activeCategory === catKey;
          const cartCount = categoryCartCounts[catKey] || 0;
          const dishCount = categoryCounts[catKey] ?? 0;
          const displayName = config.sidebarName || config.name;
          const indexNum = `#${String(idx + 1).padStart(2, '0')}`;

          if (isActive) {
            return (
              <div
                key={catKey}
                data-sidebar-category={catKey}
                data-purpose="active-category-card"
                onClick={() => handleItemClick(catKey)}
                className="w-full relative bg-pitch text-white p-1.5 flex flex-col items-center border-y-2 border-pitch active-blueprint-grid shadow-draft-active cursor-pointer select-none"
              >
                <div className="absolute -left-[1px] top-0 bottom-0 w-[4px] bg-amberAccent"></div>
                <div className="w-7 h-7 border border-stone-600 bg-stone-900 flex items-center justify-center relative mb-0.5 shadow-inner">
                  <CategoryThemedIcon catKey={catKey} isActive={true} className="w-4 h-4 text-amberAccent" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-amberAccent text-pitch text-[8px] font-mono font-black min-w-[14px] h-[14px] px-0.5 flex items-center justify-center border border-pitch leading-none">
                      {cartCount}
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-black tracking-tight text-white leading-none text-center">
                  {displayName}
                </div>
                <span className="text-[8px] font-mono text-amberAccent mt-0.5">
                  {dishCount}款
                </span>
              </div>
            );
          }

          return (
            <button
              key={catKey}
              type="button"
              data-sidebar-category={catKey}
              onClick={() => handleItemClick(catKey)}
              className="group w-full text-left p-1 relative bg-transparent transition-colors hover:bg-stone-100 flex flex-col items-center cursor-pointer select-none"
            >
              <div className="w-7 h-7 border border-line bg-white flex items-center justify-center relative mb-0.5">
                <CategoryThemedIcon catKey={catKey} isActive={false} className="w-4 h-4 text-stone-700" />
                <span className="absolute -bottom-1 -right-0.5 text-[6px] font-mono text-stone-400">
                  {indexNum}
                </span>
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-pitch text-white text-[8px] font-mono font-black min-w-[14px] h-[14px] px-0.5 flex items-center justify-center border border-white leading-none">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-bold tracking-tight text-pitch leading-none text-center">
                {displayName}
              </span>
              <span className="text-[8px] font-mono text-stone-500 mt-0.5">
                {dishCount}款
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

