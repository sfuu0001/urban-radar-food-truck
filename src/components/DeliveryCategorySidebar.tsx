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
      className="w-[72px] xs:w-[78px] sm:w-[84px] md:w-[88px] shrink-0 self-start sticky top-1 sm:top-1.5 z-20 bg-white rounded-none border border-[#D3D1CB] max-h-[calc(100dvh-125px)] overflow-y-auto overscroll-contain select-none shadow-2xs py-1.5 pb-3 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden relative"
      style={{
        WebkitOverflowScrolling: 'touch'
      }}
    >
      {/* 顶部极简当前品类索引与轻量音效开关 */}
      <div className="px-2 py-1 mb-1 border-b border-[#e5e5e7] flex items-center justify-between">
        <span className="text-[9px] font-mono text-neutral-400 font-bold flex items-center gap-0.5">
          <span className="text-neutral-900 font-extrabold">{currentActiveIndex >= 0 ? currentActiveIndex + 1 : 1}</span>
          <span className="text-neutral-300">/</span>
          <span>{categories.length}</span>
        </span>

        {onToggleSoundFeedback && (
          <button
            type="button"
            onClick={onToggleSoundFeedback}
            title={soundFeedbackEnabled ? '点击静音分类触觉音效' : '点击开启分类触觉音效'}
            className={`p-0.5 rounded transition-colors cursor-pointer ${
              soundFeedbackEnabled
                ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-100/60'
                : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-200/60'
            }`}
          >
            {soundFeedbackEnabled ? (
              <Volume2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            ) : (
              <VolumeX className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            )}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1 px-1 relative bg-white">
        {categories.map((catKey) => {
          const config: PrimaryCategoryConfig | undefined = CATEGORY_TAXONOMY[catKey];
          if (!config) return null;

          const isActive = activeCategory === catKey;
          const cartCount = categoryCartCounts[catKey] || 0;
          const dishCount = categoryCounts[catKey] ?? 0;
          const isClicked = justClickedCat === catKey;

          const displayName = config.sidebarName || config.name;

          return (
            <motion.button
              key={catKey}
              type="button"
              data-sidebar-category={catKey}
              whileTap={{ scale: 0.94 }}
              onClick={() => handleItemClick(catKey)}
              onMouseEnter={(e) => handleMouseEnter(e, catKey)}
              onMouseLeave={handleMouseLeave}
              className={`relative w-full min-h-[58px] xs:min-h-[62px] px-1 py-2 flex flex-col items-center justify-center text-center cursor-pointer group rounded-none transition-all ${
                isActive
                  ? 'text-white'
                  : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200/60'
              }`}
            >
              {/* 高亮背景统一设置炭黑色 (Charcoal Black) */}
              {isActive && (
                <motion.div
                  layoutId="deliverySidebarActiveBackground"
                  className="absolute inset-0 bg-[#1A1A17] rounded-none shadow-md shadow-black/15 border border-neutral-800 z-0"
                  transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                />
              )}

              {/* 激活状态下的左侧纯净琥珀金细指示条 */}
              {isActive && (
                <motion.div
                  layoutId="deliverySidebarActiveBar"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[20px] bg-gradient-to-b from-amber-400 to-amber-500 rounded-none shadow-xs z-20"
                  transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                />
              )}

              {/* 细微点击触感波纹 */}
              <AnimatePresence>
                {isClicked && (
                  <motion.div
                    initial={{ scale: 0.88, opacity: 0.5 }}
                    animate={{ scale: 1.15, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="absolute inset-0 rounded-none bg-amber-400/20 pointer-events-none z-10"
                  />
                )}
              </AnimatePresence>

              {/* 极简气泡微标签 (如：爆款、现烤) */}
              {config.bubblePill && (
                <div className="absolute -top-1 right-0.5 z-20 pointer-events-none">
                  <span
                    className={`inline-flex items-center text-[7.5px] font-bold px-1 py-[0.5px] rounded-none leading-none whitespace-nowrap shadow-2xs scale-90 origin-right transition-all ${
                      isActive
                        ? 'bg-amber-400 text-neutral-950 font-black'
                        : 'bg-neutral-200 text-neutral-600 border border-neutral-300/80'
                    }`}
                  >
                    {config.bubblePill}
                  </span>
                </div>
              )}

              {/* 购物车加购数字角标 */}
              {cartCount > 0 && (
                <div className="absolute top-0.5 right-0.5 z-20 pointer-events-none">
                  <motion.span
                    key={cartCount}
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                    className="relative inline-flex items-center justify-center min-w-[15px] h-[15px] bg-red-500 text-white text-[9px] font-black px-1 rounded-none shadow-xs ring-1 ring-white"
                  >
                    {cartCount > 99 ? '99+' : cartCount}
                  </motion.span>
                </div>
              )}

              {/* 核心内容容器 */}
              <div className="relative z-10 flex flex-col items-center justify-center w-full">
                {/* 统一精简图标盒 */}
                <div
                  className={`w-7 h-7 rounded-none flex items-center justify-center mb-1 transition-all duration-150 shrink-0 ${getCategoryAvatarStyle(
                    isActive
                  )}`}
                >
                  <CategoryThemedIcon catKey={catKey} isActive={isActive} className="w-3.5 h-3.5" />
                </div>

                {/* 分类名称 */}
                <span
                  className={`block text-[11px] xs:text-[11.5px] tracking-tight leading-tight transition-colors ${
                    isActive
                      ? 'font-bold text-white'
                      : 'font-medium text-neutral-700 group-hover:text-neutral-950'
                  }`}
                >
                  {displayName}
                </span>

                {/* 在售款数指示 */}
                {dishCount > 0 && (
                  <span
                    className={`text-[8.5px] font-mono mt-0.5 leading-none transition-colors ${
                      isActive ? 'text-neutral-400 font-medium' : 'text-neutral-400'
                    }`}
                  >
                    {dishCount}款
                  </span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* 桌面端悬浮速览卡片 (Hover Peek Card) */}
      <AnimatePresence>
        {hoveredCat && (
          <motion.div
            initial={{ opacity: 0, x: -6, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -6, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{
              top: `${Math.max(10, Math.min(hoveredCat.top - 36, 400))}px`,
              left: '100%'
            }}
            className="hidden md:block absolute ml-2 w-44 bg-neutral-950/95 backdrop-blur-md text-white p-2.5 rounded-none shadow-xl border border-neutral-700/60 z-50 pointer-events-none"
          >
            {(() => {
              const cfg = CATEGORY_TAXONOMY[hoveredCat.key];
              if (!cfg) return null;
              const cartCount = categoryCartCounts[hoveredCat.key] || 0;
              const dishCount = categoryCounts[hoveredCat.key] ?? 0;
              const isCurrent = activeCategory === hoveredCat.key;

              return (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-5 h-5 rounded-none bg-neutral-800 flex items-center justify-center shrink-0">
                        <CategoryThemedIcon
                          catKey={hoveredCat.key}
                          isActive={true}
                          className="w-3 h-3 text-amber-400"
                        />
                      </div>
                      <span className="font-bold text-xs truncate">{cfg.name}</span>
                    </div>
                    {isCurrent ? (
                      <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.2 rounded border border-amber-400/20">
                        浏览中
                      </span>
                    ) : (
                      <span className="text-[9px] text-neutral-400 flex items-center gap-0.5">
                        <span>点击直达</span>
                        <ChevronRight className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>

                  {cfg.tagline && (
                    <p className="text-[9.5px] text-neutral-300 leading-tight line-clamp-2">
                      {cfg.tagline}
                    </p>
                  )}

                  <div className="pt-1 border-t border-neutral-800 flex items-center justify-between text-[9px] font-mono text-neutral-400">
                    <span>在售 {dishCount} 款</span>
                    {cartCount > 0 ? (
                      <span className="text-amber-400 font-bold flex items-center gap-0.5">
                        <ShoppingBag className="w-2.5 h-2.5" />
                        <span>已选 {cartCount} 份</span>
                      </span>
                    ) : (
                      <span className="text-neutral-500">
                        {cfg.bubblePill || '现制料理'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
};

