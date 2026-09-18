import React, { useEffect, useRef } from 'react';
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
  Drumstick
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

const CategoryThemedIcon: React.FC<{
  catKey: CategoryType;
  isActive: boolean;
  className?: string;
}> = ({ catKey, isActive, className = 'w-4 h-4' }) => {
  const iconColor = isActive ? 'text-[#FF9900]' : 'text-gray-500';

  switch (catKey) {
    case 'popular':
      return <Flame className={`${className} ${iconColor}`} />;
    case 'skewers':
      return <UtensilsCrossed className={`${className} ${iconColor}`} />;
    case 'yakitori':
      return <Drumstick className={`${className} ${iconColor}`} />;
    case 'baked':
      return <Layers className={`${className} ${iconColor}`} />;
    case 'western':
      return <Beef className={`${className} ${iconColor}`} />;
    case 'mains':
      return <CookingPot className={`${className} ${iconColor}`} />;
    case 'drinks':
      return <Coffee className={`${className} ${iconColor}`} />;
    case 'desserts':
      return <CakeSlice className={`${className} ${iconColor}`} />;
    case 'snacks':
      return <Cookie className={`${className} ${iconColor}`} />;
    case 'all':
    default:
      return <Sparkles className={`${className} ${iconColor}`} />;
  }
};

export const DeliveryCategorySidebar: React.FC<DeliveryCategorySidebarProps> = ({
  categories,
  activeCategory,
  onSelectCategory,
  categoryCounts = {},
  categoryCartCounts = {},
  soundFeedbackEnabled = true,
  onToggleSoundFeedback
}) => {
  const sidebarContainerRef = useRef<HTMLDivElement>(null);
  const previousActiveCatRef = useRef<CategoryType>(activeCategory);
  const lastSoundTimeRef = useRef<number>(0);

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

      const now = Date.now();
      if (soundFeedbackEnabled && now - lastSoundTimeRef.current > 180) {
        const idx = categories.indexOf(activeCategory);
        playCategoryLinkSound(idx >= 0 ? idx : 0);
        lastSoundTimeRef.current = now;
      }
    }
  }, [activeCategory, soundFeedbackEnabled, categories]);

  const handleItemClick = (catKey: CategoryType) => {
    if (soundFeedbackEnabled) {
      playCategorySnapSound();
    }
    onSelectCategory(catKey);
  };

  const currentActiveIndex = categories.indexOf(activeCategory);

  return (
    <aside
      id="delivery-category-sidebar"
      ref={sidebarContainerRef}
      className="sticky top-0 self-start w-[72px] h-[calc(100dvh-125px)] max-h-[calc(100dvh-125px)] bg-[#F7F8FA] border-r border-[#E2E4E8] flex flex-col shrink-0 select-none overflow-y-auto overscroll-contain touch-pan-y no-scrollbar z-30 shadow-2xs"
      style={{
        WebkitOverflowScrolling: 'touch'
      }}
    >
      {/* Top Index & Stats Counter */}
      <div className="py-1.5 px-2 text-center border-b border-[#E2E4E8] flex items-center justify-center space-x-1 text-[10px] font-mono sticky top-0 bg-[#F7F8FA] z-10">
        <span className="font-bold text-black">{currentActiveIndex >= 0 ? currentActiveIndex + 1 : 1}</span>
        <span className="text-gray-400">/</span>
        <span className="text-gray-500">{categories.length}</span>
        <button
          type="button"
          onClick={onToggleSoundFeedback}
          title={soundFeedbackEnabled ? '点击静音提示' : '点击开启提示'}
          className="w-3.5 h-3.5 rounded-full bg-[#FF9900] text-white font-bold inline-flex items-center justify-center text-[9px] scale-90 cursor-pointer"
        >
          !
        </button>
      </div>

      {/* Category List */}
      <nav id="delivery-category-nav" className="flex flex-col text-center divide-y divide-[#ECEEF1] pb-14">
        {categories.map((catKey, idx) => {
          const config: PrimaryCategoryConfig | undefined = CATEGORY_TAXONOMY[catKey];
          if (!config) return null;

          const isActive = activeCategory === catKey;
          const cartCount = categoryCartCounts[catKey] || 0;
          const dishCount = categoryCounts[catKey] ?? 0;
          const displayName = config.sidebarName || config.name;
          const indexStr = `#${String(idx + 1).padStart(2, '0')}`;

          if (isActive) {
            return (
              <button
                key={catKey}
                type="button"
                data-sidebar-category={catKey}
                onClick={() => handleItemClick(catKey)}
                className="py-2.5 px-1 flex flex-col items-center justify-center bg-[#181818] text-white relative shadow-inner cursor-pointer select-none transition-colors"
              >
                <div className="w-5 h-5 flex items-center justify-center text-[#FF9900]">
                  <CategoryThemedIcon catKey={catKey} isActive={true} className="w-4 h-4 text-[#FF9900]" />
                </div>
                <span className="text-[8px] font-mono text-gray-400">{indexStr}</span>
                <span className="text-[10px] font-bold text-white tracking-tight truncate w-full px-0.5">
                  {displayName}
                </span>
                <span className="text-[8px] text-[#FF9900] scale-90 leading-none mt-0.5">
                  {dishCount}款
                </span>
                {cartCount > 0 && (
                  <span className="absolute top-1 right-1 bg-[#FF3B30] text-white text-[8px] font-mono font-bold min-w-[13px] h-[13px] px-0.5 rounded-full flex items-center justify-center leading-none">
                    {cartCount}
                  </span>
                )}
              </button>
            );
          }

          return (
            <button
              key={catKey}
              type="button"
              data-sidebar-category={catKey}
              onClick={() => handleItemClick(catKey)}
              className="py-2.5 px-1 flex flex-col items-center justify-center text-gray-700 relative hover:bg-gray-100 transition-colors cursor-pointer select-none"
            >
              <CategoryThemedIcon catKey={catKey} isActive={false} className="w-4 h-4 text-gray-500" />
              <span className="text-[8px] font-mono text-gray-400 mt-0.5">{indexStr}</span>
              <span className="text-[10px] font-bold tracking-tight text-gray-700 truncate w-full px-0.5">
                {displayName}
              </span>
              <span className="text-[8px] text-gray-400 scale-90 leading-none mt-0.5">
                {dishCount}款
              </span>
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 bg-[#FF3B30] text-white text-[8px] font-mono font-bold min-w-[13px] h-[13px] px-0.5 rounded-full flex items-center justify-center leading-none">
                  {cartCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
