import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Flame,
  Sparkles,
  Bike,
  Crown,
  ArrowRight,
  Tag,
  CheckCircle2,
  CheckSquare,
  Square
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CarouselSlide, MenuDesignSystem } from '../utils/menuDesignSystem';

interface StoreCampaignCarouselProps {
  designSystem: MenuDesignSystem;
  categoryName: string;
  categoryIcon: string;
  categoryTagline?: string;
  categoryBadge?: string;
  categoryBubblePill?: string;
  dishCount: number;
  isCurrentActive: boolean;
  isHighlighted: boolean;
  categoryScrollProgress?: number;
  onNavigateCategory: (categoryKey: string) => void;
  onOpenMerchantDesign?: () => void;
  onClaimCoupon?: (code: string) => void;
}

export const StoreCampaignCarousel: React.FC<StoreCampaignCarouselProps> = ({
  designSystem,
  categoryName,
  categoryIcon,
  categoryTagline,
  categoryBadge,
  categoryBubblePill,
  dishCount,
  isCurrentActive,
  isHighlighted,
  categoryScrollProgress = 0,
  onNavigateCategory,
  onOpenMerchantDesign,
  onClaimCoupon
}) => {
  const carouselConfig = designSystem.carousel;
  const activeSlides = useMemo(() => {
    return (carouselConfig?.slides || []).filter((s) => s.isActive);
  }, [carouselConfig]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(carouselConfig?.autoPlay ?? true);
  const [progress, setProgress] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [couponToast, setCouponToast] = useState<string | null>(null);

  const autoPlayInterval = Math.max(2500, carouselConfig?.autoPlayInterval || 4500);
  const progressTimerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Safe bounds check
  const currentSlide: CarouselSlide | undefined = activeSlides[currentIndex] || activeSlides[0];

  const handleNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % Math.max(1, activeSlides.length));
    setProgress(0);
    startTimeRef.current = Date.now();
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + activeSlides.length) % Math.max(1, activeSlides.length));
    setProgress(0);
    startTimeRef.current = Date.now();
  };

  const handleSelectSlide = (idx: number) => {
    setDirection(idx > currentIndex ? 1 : -1);
    setCurrentIndex(idx);
    setProgress(0);
    startTimeRef.current = Date.now();
  };

  // Timer loop for progress bar and automatic advancing
  useEffect(() => {
    if (!isPlaying || activeSlides.length <= 1) {
      setProgress(0);
      return;
    }

    startTimeRef.current = Date.now();
    const intervalMs = 50;

    progressTimerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const currentProgress = Math.min(100, (elapsed / autoPlayInterval) * 100);
      setProgress(currentProgress);

      if (elapsed >= autoPlayInterval) {
        handleNext();
      }
    }, intervalMs);

    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, [currentIndex, isPlaying, autoPlayInterval, activeSlides.length]);

  const handleActionClick = (slide: CarouselSlide) => {
    if (slide.actionType === 'scroll_category') {
      onNavigateCategory(slide.actionTarget || 'popular');
    } else if (slide.actionType === 'custom_modal') {
      if (onClaimCoupon && slide.couponHighlight) {
        onClaimCoupon(slide.couponHighlight);
      }
      setCouponToast(`已为您激活【${slide.title}】专享优惠！`);
      setTimeout(() => setCouponToast(null), 2500);
    } else {
      setCouponToast(`已锁定【${slide.title}】活动专享`);
      setTimeout(() => setCouponToast(null), 2000);
    }
  };

  const renderIcon = (name?: string) => {
    switch (name) {
      case 'Flame':
        return <Flame className="w-3.5 h-3.5" />;
      case 'Sparkles':
        return <Sparkles className="w-3.5 h-3.5" />;
      case 'Bike':
        return <Bike className="w-3.5 h-3.5" />;
      case 'Crown':
        return <Crown className="w-3.5 h-3.5" />;
      default:
        return <Tag className="w-3.5 h-3.5" />;
    }
  };

  // Visual Theme mapping from designSystem
  const cardRadius = designSystem.theme?.cardRadius || 'rounded-none';

  return (
    <div
      className={`relative overflow-hidden flex flex-col transition-all duration-300 ${cardRadius} border border-[#D3D1CB] shadow-2xs hover:border-neutral-300`}
    >
      {/* 1. 店铺轮播活动横幅 (Store Campaign Carousel Banner - 精简流线型设计) */}
      {carouselConfig.enabled && activeSlides.length > 0 && currentSlide && (
        <div
          className="relative w-full overflow-hidden select-none bg-neutral-950 text-white min-h-[58px] sm:min-h-[66px] flex flex-col justify-center px-3 py-2 sm:px-3.5 sm:py-2.5 transition-all cursor-pointer group"
          onClick={() => handleActionClick(currentSlide)}
          onMouseEnter={() => setIsPlaying(false)}
          onMouseLeave={() => setIsPlaying(carouselConfig.autoPlay)}
        >
          {/* Background Animated Gradient Layer */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide.id}
                initial={{ opacity: 0, scale: 1.03 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.35 }}
                className={`absolute inset-0 bg-gradient-to-r ${currentSlide.bgGradient}`}
              />
            </AnimatePresence>

            {/* Subtle Luxury Lighting Overlay */}
            <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white/5 blur-xl pointer-events-none" />
            <div
              className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full blur-xl pointer-events-none opacity-30"
              style={{ backgroundColor: currentSlide.accentColor }}
            />
          </div>

          {/* Streamlined Content: Left (Tag + Title + Subtitle) / Right (CTA + Minimalist Dots) */}
          <div className="relative z-10 flex items-center justify-between gap-2.5">
            {/* Left Content Area */}
            <div className="min-w-0 flex-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide.id}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -3 }}
                  transition={{ duration: 0.22 }}
                  className="space-y-0.5"
                >
                  {/* Top Line: Tag + Coupon Highlight + Title */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Tag badge */}
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-extrabold px-1.5 py-0.5 rounded text-white shadow-2xs leading-none shrink-0"
                      style={{ backgroundColor: currentSlide.badgeColor || '#b45309' }}
                    >
                      {renderIcon(currentSlide.iconName)}
                      <span>{currentSlide.tag}</span>
                    </span>

                    {/* Coupon Highlight Pill */}
                    {currentSlide.couponHighlight && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/15 text-amber-300 border border-amber-400/25 leading-none shrink-0">
                        <span className="w-1 h-1 rounded-full bg-amber-400" />
                        <span>{currentSlide.couponHighlight}</span>
                      </span>
                    )}

                    {/* Bold Title */}
                    <h3 className="text-xs sm:text-sm font-black tracking-tight text-white truncate drop-shadow-xs">
                      {currentSlide.title}
                    </h3>
                  </div>

                  {/* Bottom Line: Subtitle Benefit */}
                  <p className="text-[10.5px] sm:text-[11px] text-neutral-300/85 truncate leading-tight">
                    {currentSlide.subtitle}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Right Action & Indicators */}
            <div className="flex items-center gap-2 shrink-0">
              {/* CTA Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleActionClick(currentSlide);
                }}
                className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-none text-[11px] font-bold text-neutral-950 bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 active:scale-95 transition-all shadow-xs cursor-pointer shrink-0"
              >
                <span>{currentSlide.buttonText || '去看看'}</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Minimalist Slide Pagination Dots */}
              {activeSlides.length > 1 && (
                <div
                  className="hidden xs:flex items-center gap-1 pl-0.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  {activeSlides.map((slide, idx) => (
                    <button
                      key={slide.id}
                      type="button"
                      onClick={() => handleSelectSlide(idx)}
                      className={`h-1.5 transition-all rounded-full cursor-pointer ${
                        idx === currentIndex
                          ? 'w-3.5 bg-amber-400'
                          : 'w-1.5 bg-white/35 hover:bg-white/60'
                      }`}
                      title={`切换至 ${slide.title}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Micro timer progress bar running at the bottom edge */}
          {isPlaying && activeSlides.length > 1 && (
            <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-white/10">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Coupon toast */}
          <AnimatePresence>
            {couponToast && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="absolute inset-x-2 bottom-1.5 z-20 flex items-center justify-center pointer-events-none"
              >
                <span className="text-[10.5px] font-bold text-emerald-300 flex items-center gap-1 bg-emerald-950/90 px-2.5 py-0.5 rounded-full border border-emerald-500/50 shadow-md">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>{couponToast}</span>
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 2. Category Breakpoint Header (已默认删除纯净化，仅当后台显式开启时呈现) */}
      {carouselConfig.showCategoryBreakpointBar && (
        <div
          className="flex flex-col px-2.5 sm:px-3.5 py-1.5 sm:py-2 transition-all duration-300 bg-white/95 backdrop-blur-xs border-t border-[#e8e8e6]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-none flex items-center justify-center text-xs sm:text-sm shadow-2xs shrink-0 select-none transition-all duration-300 bg-neutral-900 text-white"
              >
                <span>{categoryIcon}</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2
                    className={`text-xs sm:text-sm tracking-tight transition-colors ${
                      isCurrentActive ? 'font-black text-neutral-950 scale-101' : 'font-bold text-neutral-800'
                    }`}
                  >
                    {categoryName}
                  </h2>
                  {isCurrentActive && (
                    <motion.span
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-none bg-gradient-to-r from-amber-500 to-orange-500 text-white leading-none shadow-xs flex items-center gap-1"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      <span>正在浏览 · 侧栏联动中</span>
                    </motion.span>
                  )}
                  {isHighlighted && (
                    <motion.span
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-none bg-neutral-950 text-amber-300 leading-none shadow-xs border border-amber-400/30"
                    >
                      🎯 已精准对齐
                    </motion.span>
                  )}
                  {categoryBubblePill && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-none bg-neutral-900 text-white leading-none shadow-2xs">
                      {categoryBubblePill}
                    </span>
                  )}
                  {categoryBadge && (
                    <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-950 border border-amber-300">
                      {categoryBadge}
                    </span>
                  )}
                </div>
                {categoryTagline && (
                  <p className="text-[10px] sm:text-[11px] text-[#787770] truncate max-w-xs sm:max-w-md">
                    {categoryTagline}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className={`text-[10px] sm:text-[11px] font-mono font-bold px-2 py-0.5 rounded-none border transition-all ${
                  isCurrentActive
                    ? 'bg-amber-100/90 text-amber-950 border-amber-300 font-black shadow-2xs'
                    : 'bg-neutral-100 text-neutral-600 border-neutral-200'
                }`}
              >
                {dishCount} 款
              </span>
            </div>
          </div>

          {/* 联动中在当前分类断点下的微滚动进度指示细轨 */}
          {isCurrentActive && (
            <div className="w-full h-1 bg-amber-100/80 rounded-full mt-1.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-orange-600 rounded-full transition-all duration-75"
                style={{ width: `${Math.max(6, Math.min(100, Math.round(categoryScrollProgress * 100)))}%` }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
