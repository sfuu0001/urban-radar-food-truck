import React, { useState } from 'react';
import { Plus, Check, ChevronDown, Camera, PenTool } from 'lucide-react';
import { motion } from 'motion/react';
import { DishItem, DiningMode } from '../types';
import { useFlyingCart } from '../utils/FlyingCartContext';
import { DishArtisanSketch } from './DishArtisanSketch';
import { useDevSimulation } from '../context/DevSimulationContext';

interface DishListRowProps {
  dish: DishItem;
  diningMode?: DiningMode;
  cartQuantity?: number;
  onSelect: (dish: DishItem) => void;
  onQuickAdd: (dish: DishItem, e: React.MouseEvent) => void;
  isMultiSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (dish: DishItem, e: React.MouseEvent) => void;
  isOutOfRange?: boolean;
  deliveryRadiusKm?: number;
  currentDistanceKm?: number;
  onOutOfRangeClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const DishListRow: React.FC<DishListRowProps> = ({
  dish,
  diningMode = 'delivery',
  cartQuantity = 0,
  onSelect,
  onQuickAdd,
  isMultiSelectMode = false,
  isSelected = false,
  onToggleSelect,
  isOutOfRange = false,
  onOutOfRangeClick,
  className,
  style
}) => {
  const { simulatedOutOfStockDishIds } = useDevSimulation();
  const isSimulatedStockOut = simulatedOutOfStockDishIds.includes(dish.id);
  const isAvailable = dish.available && !isOutOfRange && !isSimulatedStockOut;
  const { triggerFlyToCart } = useFlyingCart();
  
  // 支持工匠矢量草图(Blueprint/Sketch)与实物摄影(Photo)双模切换，默认呈现真实美食实拍图
  const [viewThumbnailMode, setViewThumbnailMode] = useState<'sketch' | 'photo'>('photo');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // 1. 编号与工匠代码生成 (Format Artisan Code & Ref Code)
  const hash = dish.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const artisanLabel = dish.artisanCode || `ARTISAN #${String((hash % 20) + 1).padStart(2, '0')}`;
  
  let refLabel = dish.refCode;
  if (!refLabel) {
    refLabel = `· SK-${1000 + (hash % 1500)}`;
  } else if (!refLabel.startsWith('REF:') && !refLabel.startsWith('·')) {
    refLabel = refLabel.startsWith('SK-') ? `· ${refLabel}` : `REF: ${refLabel}`;
  }

  // 2. 右侧高亮属性标签 (Status Highlight Tag)
  const getStatusHighlight = () => {
    if (isOutOfRange) {
      return <span className="text-amber-700 font-mono text-xs font-bold">超送达范围</span>;
    }
    if (dish.badgeText?.includes('招牌') || dish.isChefSpecial || dish.badgeText === '已入选招牌') {
      return <span className="text-[#00875a] text-xs font-semibold tracking-tight">已入选招牌</span>;
    }
    if (dish.coreTemp) {
      return <span className="text-[#d9730d] font-mono text-xs font-semibold">{dish.coreTemp}</span>;
    }
    if (dish.category === 'skewers' || dish.category === 'yakitori') {
      return <span className="text-[#d9730d] font-mono text-xs font-semibold">备长炭 800°C</span>;
    }
    if (dish.badgeText?.includes('仅剩') || dish.badgeText?.includes('份')) {
      return <span className="text-neutral-500 font-mono text-xs font-medium">{dish.badgeText}</span>;
    }
    if (dish.badgeText) {
      return <span className="text-neutral-600 font-mono text-xs font-medium">{dish.badgeText}</span>;
    }
    return <span className="text-neutral-500 font-mono text-xs font-medium">仅剩 14 份</span>;
  };

  // 3. 左下角规格标尺标签 (Spec / Portion Ratio Tag, e.g. 150G DUAL, 3串入, M9 WAGYU)
  const getSpecRatioLabel = () => {
    if (dish.specRatio) return dish.specRatio;
    const name = dish.name.toLowerCase();
    if (name.includes('汉堡') || name.includes('slider')) return '150G DUAL';
    if (name.includes('m9') || name.includes('肋条') || name.includes('牛排')) return 'M9 WAGYU';
    if (name.includes('串') || name.includes('烧鸟') || dish.category === 'skewers') return '3串入';
    if (dish.nutrition?.protein) return dish.nutrition.protein;
    return 'ARTISAN';
  };

  // 4. 折扣与原价计算 (Pricing & Discounts)
  const hasOriginalPrice = typeof dish.originalPrice === 'number' && dish.originalPrice > dish.price;
  const deliveryDiscount = dish.deliveryDiscount || 0;
  const discountAmount = hasOriginalPrice
    ? Number((dish.originalPrice! - dish.price).toFixed(2))
    : deliveryDiscount > 0
    ? deliveryDiscount
    : 0;

  const handleClick = (e: React.MouseEvent) => {
    if (isOutOfRange) {
      if (onOutOfRangeClick) onOutOfRangeClick();
      else onSelect(dish);
      return;
    }

    if (isMultiSelectMode) {
      if (isAvailable && onToggleSelect) onToggleSelect(dish, e);
    } else {
      onSelect(dish);
    }
  };

  const handleQuickAddClick = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    if (isMultiSelectMode) {
      handleClick(e);
      return;
    }
    setIsAdding(true);
    triggerFlyToCart(e.currentTarget, dish.imageUrl);
    onQuickAdd(dish, e);
    setTimeout(() => {
      setIsAdding(false);
    }, 450);
  };

  const hasOptions = Boolean(dish.optionGroups && dish.optionGroups.length > 0);

  return (
    <motion.div
      whileHover={isAvailable ? { y: -1 } : {}}
      whileTap={{ scale: 0.995 }}
      onClick={handleClick}
      className={`bg-white border border-[#1a1c1b] p-2.5 sm:p-4 mb-2.5 sm:mb-3.5 transition-all duration-200 cursor-pointer relative rounded-none select-none ${
        isSelected ? 'ring-2 ring-black bg-neutral-50/40' : 'hover:shadow-sm'
      } ${!isAvailable ? 'opacity-75' : ''} ${className || ''}`}
      style={style}
    >
      {/* Multi-Select Checkbox overlay */}
      {!isOutOfRange && (isMultiSelectMode || isSelected) && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (isAvailable && onToggleSelect) onToggleSelect(dish, e);
          }}
          className="absolute top-2.5 right-2.5 z-30 transition-all cursor-pointer"
        >
          {isSelected ? (
            <div className="w-5 h-5 rounded-none bg-black text-white flex items-center justify-center">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-none bg-white border border-neutral-400 hover:border-black" />
          )}
        </div>
      )}

      {/* 1. Top Metadata Strip (Header Bar) */}
      <div className="flex items-center justify-between pb-1.5 sm:pb-2 mb-2 sm:mb-3 border-b border-neutral-200 text-xs">
        <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
          <span className="bg-[#1a1c1b] text-white text-[8.5px] sm:text-[10px] font-mono font-bold px-1 sm:px-1.5 py-0.5 tracking-wider uppercase inline-block shrink-0">
            {artisanLabel}
          </span>
          <span className="text-neutral-500 text-[9px] sm:text-[11px] font-mono tracking-wider truncate">
            {refLabel}
          </span>
        </div>

        <div className="shrink-0 ml-1.5">
          {getStatusHighlight()}
        </div>
      </div>

      {/* 2. Main Body: Horizontal Flex (Left Thumbnail, Right Information) */}
      <div className="flex items-start gap-2.5 sm:gap-4">
        {/* Left Thumbnail: Clean Paper Ground with Black Ink Sketch / Photo */}
        <div className="relative w-20 h-20 sm:w-28 sm:h-28 shrink-0 bg-[#f7f7f5] border border-neutral-200 overflow-hidden flex items-center justify-center p-1.5 sm:p-2 group/thumb">
          {viewThumbnailMode === 'sketch' || imageError ? (
            <DishArtisanSketch dish={dish} className="w-full h-full p-0.5 sm:p-1 transition-transform duration-300 group-hover/thumb:scale-105" />
          ) : (
            <img
              src={dish.imageUrl}
              alt={dish.name}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              className={`w-full h-full object-cover transition-all duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          )}

          {/* Quick toggle between Photo & Vector Sketch */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setViewThumbnailMode(prev => prev === 'sketch' ? 'photo' : 'sketch');
            }}
            title={viewThumbnailMode === 'sketch' ? '点击查看菜品实拍照片' : '点击查看工匠矢量设计草图'}
            className="absolute top-1 left-1 bg-white/90 hover:bg-black hover:text-white border border-neutral-200 text-neutral-600 p-0.5 sm:p-1 text-[8px] transition-colors rounded-none opacity-80 sm:opacity-0 sm:group-hover/thumb:opacity-100 z-10 cursor-pointer"
          >
            {viewThumbnailMode === 'sketch' ? <Camera className="w-2.5 h-2.5" /> : <PenTool className="w-2.5 h-2.5" />}
          </button>

          {/* Bottom-right Spec Label (e.g. 150G DUAL, 3串入, M9 WAGYU) */}
          <span className="text-[8px] sm:text-[9px] font-mono font-bold text-neutral-400 uppercase tracking-wider absolute bottom-0.5 right-1 sm:bottom-1 sm:right-1.5 bg-[#f7f7f5]/90 px-0.5 sm:px-1 leading-tight select-none">
            {getSpecRatioLabel()}
          </span>
        </div>

        {/* Right Info Section */}
        <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
          <div>
            {/* Dish Chinese Title */}
            <h3 className="text-sm sm:text-base md:text-[17px] font-bold text-[#1a1c1b] tracking-tight leading-snug line-clamp-1 group-hover:text-black">
              {dish.name}
            </h3>

            {/* Dish English Subtitle */}
            <p className="text-[9.5px] sm:text-[11px] font-mono text-neutral-400 uppercase tracking-widest mt-0.5 truncate">
              {dish.enName.toUpperCase()}
            </p>

            {/* Middle Feature Tags / Description */}
            {dish.customTags && dish.customTags.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 mt-1 sm:mt-2">
                {dish.customTags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center text-[9px] sm:text-[10.5px] font-mono text-neutral-600 border border-neutral-300 border-dashed bg-neutral-50/70 px-1 sm:px-1.5 py-0.5 leading-none"
                  >
                    [{tag}]
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[11px] sm:text-xs text-neutral-500 line-clamp-1 sm:line-clamp-2 mt-1 sm:mt-1.5 leading-relaxed">
                {dish.description}
              </p>
            )}
          </div>

          {/* Dashed Separator */}
          <div className="border-b border-dashed border-neutral-200 my-1 sm:my-2" />

          {/* Bottom Row: Price & Action */}
          <div className="flex items-center justify-between gap-1 sm:gap-2">
            {/* Left: Price and Discount */}
            <div className="flex items-baseline gap-0.5 sm:gap-1 min-w-0 flex-wrap">
              <span className="text-sm sm:text-base md:text-lg font-black font-mono text-[#1a1c1b] tracking-tight">
                ¥{dish.price.toFixed(2)}
              </span>

              {hasOriginalPrice && (
                <span className="text-[10px] sm:text-xs text-neutral-400 font-mono line-through ml-0.5 sm:ml-1">
                  ¥{dish.originalPrice!.toFixed(2)}
                </span>
              )}

              {discountAmount > 0 && (
                <span className="text-[8.5px] sm:text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 py-0.2 ml-0.5 sm:ml-1 shrink-0">
                  立减¥{discountAmount.toFixed(0)}
                </span>
              )}
            </div>

            {/* Right: Action Button */}
            <div className="shrink-0">
              {isOutOfRange ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOutOfRangeClick) onOutOfRangeClick();
                    else onSelect(dish);
                  }}
                  className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-[9.5px] sm:text-[10px] font-mono font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-none cursor-pointer transition shadow-2xs"
                >
                  改自提
                </button>
              ) : hasOptions && !isMultiSelectMode ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(dish);
                  }}
                  className="bg-[#1a1c1b] hover:bg-neutral-800 text-white text-[10.5px] sm:text-xs font-mono font-medium px-2 sm:px-3 py-1 sm:py-1.5 rounded-none flex items-center gap-0.5 sm:gap-1 shadow-xs transition cursor-pointer select-none active:scale-98 relative"
                >
                  <span>选规格</span>
                  <ChevronDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-neutral-300" />
                  {cartQuantity > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-neutral-900 text-white border border-white text-[8px] sm:text-[9px] font-bold w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center leading-none">
                      {cartQuantity}
                    </span>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleQuickAddClick}
                  className={`bg-[#1a1c1b] hover:bg-neutral-800 text-white w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-none shadow-xs transition cursor-pointer select-none active:scale-95 relative ${
                    isAdding ? 'scale-90 bg-black' : ''
                  }`}
                  title="快速添加至点单盘"
                >
                  {isAdding ? (
                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                  ) : (
                    <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                  )}
                  {cartQuantity > 0 && !isAdding && (
                    <span className="absolute -top-1.5 -right-1.5 bg-neutral-900 text-white border border-white text-[8px] sm:text-[9px] font-bold w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center leading-none">
                      {cartQuantity}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
