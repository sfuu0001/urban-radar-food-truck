import React, { useState } from 'react';
import { Clock, Check, Bike, Utensils, ShoppingBag, Plus, Flame, ChefHat, TrendingDown, TrendingUp, Tag } from 'lucide-react';
import { motion } from 'motion/react';
import { DishItem, DiningMode } from '../types';
import { useFlyingCart } from '../utils/FlyingCartContext';
import { DishPriceCalculator } from './DishPriceCalculator';
import { useDevSimulation } from '../context/DevSimulationContext';
import { SimulationProbe } from './dev/SimulationProbe';

interface DishCardProps {
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

export const DishCard: React.FC<DishCardProps> = ({
  dish,
  diningMode = 'delivery',
  cartQuantity = 0,
  onSelect,
  onQuickAdd,
  isMultiSelectMode = false,
  isSelected = false,
  onToggleSelect,
  isOutOfRange = false,
  deliveryRadiusKm = 3.0,
  currentDistanceKm = 0.65,
  onOutOfRangeClick,
  className,
  style
}) => {
  const { simulatedOutOfStockDishIds } = useDevSimulation();
  const isSimulatedStockOut = simulatedOutOfStockDishIds.includes(dish.id);
  const isAvailable = dish.available && !isOutOfRange && !isSimulatedStockOut;
  const { triggerFlyToCart } = useFlyingCart();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // 价格变动与优惠折扣计算 (用于触发白色区域特殊渲染效果)
  const baselinePrice =
    typeof dish.prevPrice === 'number'
      ? dish.prevPrice
      : typeof dish.originalPrice === 'number'
      ? dish.originalPrice
      : dish.price;
  const momDiff = Number((dish.price - baselinePrice).toFixed(2));
  const hasOriginalPrice = typeof dish.originalPrice === 'number' && dish.originalPrice > dish.price;
  const isMomDrop = momDiff < -0.01;
  const isMomRise = momDiff > 0.01;
  const hasSpecialDiscount =
    hasOriginalPrice ||
    isMomDrop ||
    Boolean(dish.deliveryDiscount && dish.deliveryDiscount > 0) ||
    Boolean(dish.dineInDiscount && dish.dineInDiscount > 0);
  const isDiscountState = hasSpecialDiscount && !isMomRise;
  const isRiseState = isMomRise && !hasOriginalPrice;
  const discountAmount = hasOriginalPrice
    ? Number((dish.originalPrice! - dish.price).toFixed(2))
    : isMomDrop
    ? Math.abs(momDiff)
    : 0;

  const handleClick = (e: React.MouseEvent) => {
    if (isOutOfRange) {
      if (onOutOfRangeClick) {
        onOutOfRangeClick();
      } else {
        onSelect(dish);
      }
      return;
    }

    if (isMultiSelectMode) {
      if (isAvailable && onToggleSelect) {
        onToggleSelect(dish, e);
      }
    } else {
      onSelect(dish);
    }
  };

  const hasVariants = dish.variants && dish.variants.length > 0;
  const hasOptionsOrVariants = (dish.optionGroups && dish.optionGroups.length > 0) || hasVariants;

  const handleQuickAddClick = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    if (isMultiSelectMode) {
      handleClick(e);
      return;
    }
    // If has options or variants, open modal for customization
    if (hasOptionsOrVariants) {
      onSelect(dish);
      return;
    }
    setIsAdding(true);
    triggerFlyToCart(e.currentTarget, dish.imageUrl);
    onQuickAdd(dish, e);
    setTimeout(() => {
      setIsAdding(false);
    }, 450);
  };

  // 外层边框视觉方案 (纯净黑曜石极简质感)
  const cardBorderClass = isSelected
    ? 'ring-2 ring-black border-black bg-neutral-50/50'
    : isOutOfRange
    ? 'border-neutral-300 bg-neutral-50/40 hover:border-neutral-400'
    : 'border-[#D3D1CB] hover:border-black';

  return (
    <motion.div
      whileHover={isAvailable ? { y: -2 } : {}}
      whileTap={{ scale: 0.985 }}
      onClick={handleClick}
      className={`w-full min-w-0 bg-white rounded-none overflow-hidden shadow-2xs border transition-all duration-300 cursor-pointer p-0 m-0 flex flex-col group relative ${cardBorderClass} ${
        isAvailable
          ? 'hover:shadow-md'
          : isOutOfRange
          ? 'hover:shadow-sm'
          : 'opacity-70 bg-neutral-50/70'
      } ${className || ''}`}
      style={style}
    >
      {/* Multi-Select Checkbox overlay */}
      {!isOutOfRange && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (isAvailable && onToggleSelect) {
              onToggleSelect(dish, e);
            }
          }}
          className={`absolute top-2 right-2 z-30 transition-all active:scale-90 cursor-pointer ${
            isMultiSelectMode || isSelected
              ? 'opacity-100 scale-100'
              : 'opacity-0 group-hover:opacity-85 hover:!opacity-100 scale-95 hover:scale-105'
          }`}
          title={isSelected ? '取消勾选此菜品' : '勾选此菜品卡片 (支持批量加购)'}
        >
          {isSelected ? (
            <div className="w-5 h-5 rounded-md bg-black text-white border border-white shadow-md flex items-center justify-center transition-all scale-105 ring-2 ring-black/20">
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-md bg-white/90 backdrop-blur-md border border-neutral-400 hover:border-black shadow-xs flex items-center justify-center transition-all" />
          )}
        </div>
      )}

      {/* Image & Immersive Micro-HUD with Vignette Overlays */}
      <div className="relative h-[120px] xs:h-[132px] sm:h-[148px] w-full bg-[#161616] overflow-hidden shrink-0">
        {/* Lazy Loading Skeleton Shimmer State */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-neutral-900 animate-skeleton z-0 flex items-center justify-center">
            <div className="w-full h-full relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent -translate-x-full animate-shimmer" />
              <div className="absolute inset-0 flex items-center justify-center text-neutral-500">
                <ChefHat className="w-5 h-5 text-neutral-500/60" />
              </div>
            </div>
          </div>
        )}

        {/* Fallback state if image fails */}
        {imageError ? (
          <div className="w-full h-full bg-neutral-900 flex flex-col items-center justify-center p-2 text-center text-neutral-400">
            <ChefHat className="w-6 h-6 text-neutral-600 mb-0.5" />
            <span className="text-[10px] font-bold text-neutral-300 line-clamp-1">{dish.name}</span>
          </div>
        ) : (
          <img
            src={dish.imageUrl}
            alt={dish.name}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageError(true);
              setImageLoaded(true);
            }}
            className={`w-full h-full object-cover object-center transition-transform duration-500 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            } ${
              isAvailable ? 'group-hover:scale-106' : isOutOfRange ? 'grayscale-[35%] opacity-90' : 'grayscale-[20%]'
            }`}
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
          />
        )}

        {/* Top & Bottom Cinematic Vignette Gradients for Immersive Depth */}
        <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/55 via-black/20 to-transparent pointer-events-none z-10" />
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/75 via-black/30 to-transparent pointer-events-none z-10" />

        {/* Out-Of-Range Warning Strip */}
        {isOutOfRange && (
          <div className="absolute inset-x-0 bottom-0 z-25 bg-amber-950/90 backdrop-blur-xs py-0.5 sm:py-1 px-1.5 sm:px-2 flex items-center justify-between text-white border-t border-amber-500/40">
            <span className="text-[8.5px] sm:text-[9.5px] font-bold text-amber-300 flex items-center gap-1 leading-none truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping shrink-0" />
              <span className="truncate">限{deliveryRadiusKm.toFixed(1)}km</span>
            </span>
            <span className="text-[8px] sm:text-[8.5px] font-mono bg-amber-500/30 border border-amber-400/50 text-amber-200 px-1 py-0.2 rounded font-bold shrink-0">
              {currentDistanceKm.toFixed(1)}km
            </span>
          </div>
        )}

        {/* Top Left: Cohesive Dining Mode Glass Badge */}
        <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 flex items-center gap-1 z-20 pointer-events-none">
          {(() => {
            if (isOutOfRange) {
              return (
                <span className="bg-black/65 backdrop-blur-md text-amber-300 border border-amber-400/40 text-[8.5px] sm:text-[9.5px] font-bold px-1.5 sm:px-2 py-0.5 rounded-none shadow-xs flex items-center gap-0.5 leading-none">
                  <span>⚠️ 超范围</span>
                </span>
              );
            }

            const effectiveMode =
              dish.orderType === 'both'
                ? diningMode
                : dish.orderType === 'dine_in'
                ? 'dine_in'
                : dish.orderType === 'delivery'
                ? (diningMode === 'pickup' ? 'pickup' : 'delivery')
                : diningMode;

            if (effectiveMode === 'dine_in') {
              return (
                <span className="bg-black/65 backdrop-blur-md text-amber-300 border border-amber-400/30 text-[8.5px] sm:text-[9.5px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-none shadow-xs flex items-center gap-0.5 leading-none">
                  <Utensils className="w-2.5 h-2.5 text-amber-400" />
                  <span>堂食</span>
                </span>
              );
            } else if (effectiveMode === 'pickup') {
              return (
                <span className="bg-black/65 backdrop-blur-md text-white border border-white/25 text-[8.5px] sm:text-[9.5px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-none shadow-xs flex items-center gap-0.5 leading-none">
                  <ShoppingBag className="w-2.5 h-2.5 text-neutral-200" />
                  <span>自提</span>
                </span>
              );
            } else {
              return (
                <span className="bg-black/65 backdrop-blur-md text-white border border-white/25 text-[8.5px] sm:text-[9.5px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-none shadow-xs flex items-center gap-0.5 leading-none">
                  <Bike className="w-2.5 h-2.5 text-neutral-200" />
                  <span>外卖</span>
                </span>
              );
            }
          })()}
        </div>

        {/* Top Right: Cohesive Recommendation Tag & Cart Counter */}
        <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 flex items-center gap-1 z-20 pointer-events-none">
          {dish.badgeText && (
            <span
              className="bg-black/65 backdrop-blur-md text-amber-300 border border-amber-400/35 text-[8.5px] sm:text-[9.5px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-none shadow-xs flex items-center gap-0.5 leading-none"
            >
              <Flame className="w-2.5 h-2.5 text-amber-400" />
              <span>{dish.badgeText}</span>
            </span>
          )}

          {!isMultiSelectMode && cartQuantity > 0 && (
            <span className="bg-black text-white text-[9px] font-extrabold w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-none flex items-center justify-center shadow-md ring-1 ring-white/50 shrink-0">
              {cartQuantity}
            </span>
          )}
        </div>

        {/* Bottom: Cohesive Consolidated Metadata HUD Pill */}
        {!isOutOfRange && (
          <div className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 z-20 pointer-events-none max-w-[calc(100%-12px)]">
            <div className="inline-flex items-center gap-1 bg-black/70 backdrop-blur-md text-white/90 text-[8.5px] sm:text-[9px] font-medium px-2 py-0.5 rounded-none border border-white/15 shadow-xs leading-none max-w-full truncate">
              <span className="flex items-center gap-0.5 text-white/90 truncate">
                <Clock className="w-2.5 h-2.5 text-white/80 shrink-0" />
                <span className="truncate">{dish.orderType === 'dine_in' ? '现制' : '速出'}</span>
              </span>
              <span className="text-white/40 text-[8px]">·</span>
              <span className="flex items-center gap-0.5 text-white font-semibold shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>{dish.prepTime}</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Content: Clean Modern Obsidian Layout */}
      <div className="p-2 sm:p-2.5 flex flex-col flex-grow justify-between relative bg-white min-w-0">
        <div className="min-w-0">
          {/* Header Title with Multi-line Wrapping & Inline Status Ribbon */}
          <div className="min-h-[30px] sm:min-h-[34px] flex flex-col justify-start">
            <h3
              title={dish.name}
              className="text-[12px] xs:text-[12.5px] sm:text-[13.5px] font-bold text-[#141413] group-hover:text-black transition-colors line-clamp-2 leading-[1.3] tracking-tight break-words"
            >
              <span>{dish.name}</span>
              {/* Simulated Out of Stock Badge */}
              {isSimulatedStockOut && (
                <span className="inline-flex items-center gap-0.5 ml-1 px-1 py-0.2 rounded-none text-[8px] font-extrabold text-rose-700 bg-rose-100 border border-rose-300 align-middle leading-none shadow-2xs shrink-0">
                  <span>实验售罄</span>
                </span>
              )}
              {/* Special Micro Badge inline with dish title */}
              {isDiscountState && (
                <span className="inline-flex items-center gap-0.5 ml-1 px-1 py-0.2 rounded-none text-[8px] font-extrabold text-rose-700 bg-rose-50 border border-rose-200/90 align-middle leading-none shadow-2xs shrink-0">
                  <Tag className="w-2 h-2 text-rose-600 shrink-0" />
                  <span>特惠</span>
                </span>
              )}
              {isRiseState && (
                <span className="inline-flex items-center gap-0.5 ml-1 px-1 py-0.2 rounded-none text-[8px] font-extrabold text-rose-700 bg-rose-50 border border-rose-200/90 align-middle leading-none shadow-2xs shrink-0">
                  <TrendingUp className="w-2 h-2 text-rose-600 shrink-0" />
                  <span>微调</span>
                </span>
              )}
            </h3>
          </div>

          <p
            title={dish.enName}
            className="text-[9px] sm:text-[9.5px] text-[#807f78] font-mono tracking-tight truncate mt-0.5 leading-tight"
          >
            {dish.enName}
          </p>

          {/* Flavor Tags micro chips */}
          {dish.flavorTags && dish.flavorTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 mt-1 overflow-hidden">
              {dish.flavorTags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="text-[8.5px] sm:text-[9px] font-semibold px-1.5 py-0.2 rounded-none bg-[#f6f6f4] text-[#4d4c46] border border-[#e5e5e2] truncate max-w-[75px] sm:max-w-[90px] leading-tight"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Discounts / Rules Tag Bar (Single horizontal neat strip) */}
          <div className="mt-1.5 mb-1 min-w-0">
            <DishPriceCalculator dish={dish} diningMode={diningMode} layout="horizontal" />
          </div>
        </div>

        {/* Price & Action Row (Single-line un-squished baseline layout) */}
        <div className="flex items-center justify-between pt-1.5 border-t border-[#f0f0ee] gap-1 min-w-0 mt-0.5">
          <div className="flex items-baseline gap-1 min-w-0 shrink-0">
            <span
              className={`text-[13px] xs:text-[13.5px] sm:text-[15px] font-black tracking-tight shrink-0 ${
                isAvailable ? 'text-[#141413]' : 'text-[#787770]'
              }`}
            >
              ¥{dish.price.toFixed(2)}
              {hasVariants && <span className="text-[9.5px] font-sans font-medium text-[#787774] ml-0.5">起</span>}
            </span>
            {dish.originalPrice && (
              <span className="text-[9px] sm:text-[10px] text-[#a3a29b] line-through shrink-0">
                ¥{dish.originalPrice.toFixed(0)}
              </span>
            )}
            {/* Direct Savings Tag in Discount Mode (compact, inline, no ugly wrap) */}
            {isDiscountState && discountAmount > 0 && (
              <span className="hidden xs:inline-block text-[8px] sm:text-[8.5px] font-bold text-amber-900 bg-amber-50/90 px-1 py-0.2 rounded border border-amber-200/90 leading-none shrink-0 whitespace-nowrap">
                省¥{discountAmount.toFixed(0)}
              </span>
            )}
            {/* Variant count pill */}
            {hasVariants && (
              <span className="text-[8px] font-bold text-purple-700 bg-purple-50 px-1 py-0.2 rounded border border-purple-200 leading-none shrink-0 whitespace-nowrap">
                {dish.variants!.length}规格
              </span>
            )}
          </div>

          {/* Action Button with Quick-Add Micro-State */}
          <div className="shrink-0 flex items-center">
            {isOutOfRange ? (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.94 }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOutOfRangeClick) onOutOfRangeClick();
                  else onSelect(dish);
                }}
                className="text-[9px] sm:text-[10px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-none bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-all flex items-center gap-0.5 cursor-pointer shadow-2xs shrink-0"
                title={`超出外卖配送范围 (仅支持 ${deliveryRadiusKm}km 内，当前 ${currentDistanceKm}km)，点此切换到车自提或修改地址`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>改自提</span>
              </motion.button>
            ) : isAvailable ? (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.92 }}
                onClick={handleQuickAddClick}
                className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-none transition-all flex items-center gap-0.5 cursor-pointer shadow-2xs select-none shrink-0 relative ${
                  isAdding
                    ? 'bg-black text-white scale-95'
                    : isMultiSelectMode
                    ? isSelected
                      ? 'bg-black text-white'
                      : 'bg-neutral-100 text-black hover:bg-neutral-200'
                    : 'bg-[#18181b] hover:bg-black text-white hover:shadow-xs'
                }`}
              >
                {isAdding ? (
                  <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 animate-in zoom-in-50" />
                ) : hasOptionsOrVariants && !isMultiSelectMode ? null : (
                  <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                )}
                <span>
                  {isAdding
                    ? '已加'
                    : isMultiSelectMode
                    ? (isSelected ? '已选' : '选择')
                    : hasOptionsOrVariants
                    ? '选规格'
                    : '选购'}
                </span>
                {!isMultiSelectMode && cartQuantity > 0 && hasOptionsOrVariants && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[8.5px] font-black w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center shadow-xs border border-white leading-none">
                    {cartQuantity}
                  </span>
                )}
              </motion.button>
            ) : (
              <span className="text-[9.5px] text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded font-medium inline-block shrink-0">
                不可选
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

