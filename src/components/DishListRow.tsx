import React, { useState } from 'react';
import { Plus, Tag, Clock, Check, Bike, Utensils, ShoppingBag, Flame, ChefHat, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { DishItem, DiningMode } from '../types';
import { useFlyingCart } from '../utils/FlyingCartContext';
import { DishPriceCalculator } from './DishPriceCalculator';

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
  deliveryRadiusKm = 3.0,
  currentDistanceKm = 0.65,
  onOutOfRangeClick
}) => {
  const isAvailable = dish.available && !isOutOfRange;
  const { triggerFlyToCart } = useFlyingCart();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // 价格变动与优惠折扣计算
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

  const cardBorderClass = isSelected
    ? 'ring-2 ring-black border-black bg-neutral-50/50'
    : isOutOfRange
    ? 'border-amber-300/80 bg-amber-50/20 hover:border-amber-400'
    : 'border-[#e8e8e6] hover:border-neutral-700/30';

  return (
    <motion.div
      whileHover={isAvailable ? { y: -1.5 } : {}}
      whileTap={{ scale: 0.985 }}
      onClick={handleClick}
      className={`bg-white rounded-none overflow-hidden shadow-2xs border flex flex-row items-stretch group transition-all duration-300 cursor-pointer relative ${cardBorderClass} ${
        isAvailable ? 'hover:shadow-md' : isOutOfRange ? 'hover:shadow-sm' : 'opacity-70 bg-neutral-50/60'
      }`}
    >
      {/* Multi-Select Checkbox overlay for List View */}
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

      {/* Thumbnail with lazy loading shimmer */}
      <div className="relative w-24 sm:w-32 min-h-[88px] sm:min-h-[102px] overflow-hidden bg-[#161616] shrink-0">
        {/* Lazy Loading Skeleton Shimmer */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-neutral-900 animate-skeleton z-0 flex items-center justify-center">
            <div className="w-full h-full relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent -translate-x-full animate-shimmer" />
              <div className="absolute inset-0 flex items-center justify-center text-neutral-500">
                <ChefHat className="w-4 h-4 text-neutral-500/60" />
              </div>
            </div>
          </div>
        )}

        {imageError ? (
          <div className="w-full h-full bg-neutral-900 flex flex-col items-center justify-center p-1 text-center text-neutral-400">
            <ChefHat className="w-4 h-4 text-neutral-600 mb-0.5" />
            <span className="text-[8.5px] font-bold text-neutral-400 line-clamp-1">{dish.name}</span>
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
            className={`w-full h-full object-cover transition-all duration-500 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            } ${
              isAvailable ? 'group-hover:scale-106' : isOutOfRange ? 'grayscale-[35%] opacity-90' : 'grayscale-[20%]'
            }`}
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
          />
        )}

        {/* Top & Bottom Subtle Vignettes */}
        <div className="absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-black/55 to-transparent pointer-events-none z-10" />
        <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black/65 to-transparent pointer-events-none z-10" />

        {/* Out-Of-Range Thumbnail Tag */}
        {isOutOfRange && (
          <div className="absolute inset-x-0 bottom-0 z-20 bg-amber-950/90 text-amber-300 text-[8px] font-bold px-1 py-0.5 text-center leading-tight backdrop-blur-2xs border-t border-amber-400/40">
            超 {deliveryRadiusKm.toFixed(1)}km
          </div>
        )}

        {/* Top Left: Cohesive Dining Mode Glass Badge */}
        <div className="absolute top-1.5 left-1.5 flex gap-0.5 items-center z-20 pointer-events-none">
          {(() => {
            if (isOutOfRange) {
              return (
                <span className="bg-black/65 backdrop-blur-md text-amber-300 border border-amber-400/40 text-[8.5px] font-bold px-1.5 py-0.2 rounded-none shadow-2xs flex items-center gap-0.5 leading-none">
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
                <span className="bg-black/65 backdrop-blur-md text-amber-300 border border-amber-400/25 text-[8.5px] font-semibold px-1.5 py-0.2 rounded-none shadow-2xs flex items-center gap-0.5 leading-none">
                  <Utensils className="w-2 h-2 text-amber-400" />
                  <span>堂食</span>
                </span>
              );
            } else if (effectiveMode === 'pickup') {
              return (
                <span className="bg-black/65 backdrop-blur-md text-white border border-white/20 text-[8.5px] font-semibold px-1.5 py-0.2 rounded-none shadow-2xs flex items-center gap-0.5 leading-none">
                  <ShoppingBag className="w-2 h-2 text-neutral-200" />
                  <span>自提</span>
                </span>
              );
            } else {
              return (
                <span className="bg-black/65 backdrop-blur-md text-white border border-white/20 text-[8.5px] font-semibold px-1.5 py-0.2 rounded-none shadow-2xs flex items-center gap-0.5 leading-none">
                  <Bike className="w-2 h-2 text-neutral-200" />
                  <span>外卖</span>
                </span>
              );
            }
          })()}
        </div>

        {/* Feature Tag */}
        {dish.badgeText && (
          <div className="absolute bottom-1.5 left-1.5 z-20 pointer-events-none">
            <span className="bg-black/65 backdrop-blur-md text-amber-300 border border-amber-400/25 text-[8.5px] font-semibold px-1.5 py-0.2 rounded-none shadow-2xs flex items-center gap-0.5 leading-none">
              <Flame className="w-2 h-2 text-amber-400" />
              <span>{dish.badgeText}</span>
            </span>
          </div>
        )}
      </div>

      {/* Info Container: Clean Modern Layout */}
      <div className="p-2 sm:p-2.5 flex-1 min-w-0 flex flex-col justify-between relative bg-white">
        <div>
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0 flex-1">
              <h3
                title={dish.name}
                className="text-[13px] sm:text-[14px] font-bold text-[#141413] group-hover:text-black transition-colors line-clamp-2 leading-[1.35] tracking-tight break-words"
              >
                <span>{dish.name}</span>
                {isDiscountState && (
                  <span className="inline-flex items-center gap-0.5 ml-1 px-1.5 py-0.2 rounded-none text-[8.5px] font-extrabold text-rose-700 bg-rose-50 border border-rose-200/90 align-middle leading-none shadow-2xs whitespace-nowrap">
                    特惠
                  </span>
                )}
                {isRiseState && (
                  <span className="inline-flex items-center gap-0.5 ml-1 px-1.5 py-0.2 rounded-none text-[8.5px] font-extrabold text-rose-700 bg-rose-50 border border-rose-200/90 align-middle leading-none shadow-2xs whitespace-nowrap">
                    微调
                  </span>
                )}
              </h3>
              <p
                title={dish.enName}
                className="text-[9.5px] sm:text-[10px] text-[#807f78] font-medium truncate leading-tight mt-0.5"
              >
                {dish.enName}
              </p>

              {/* Flavor Tags */}
              {dish.flavorTags && dish.flavorTags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 mt-1">
                  {dish.flavorTags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="text-[8.5px] font-semibold px-1.5 py-0.2 rounded-md bg-[#f6f6f4] text-[#4d4c46] border border-[#e5e5e2] leading-none truncate max-w-[80px]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Prep Time */}
            <span className="text-[9px] text-[#787770] font-mono flex items-center gap-0.5 shrink-0 bg-neutral-100 px-1.5 py-0.5 rounded-md">
              <Clock className="w-2.5 h-2.5 text-neutral-400" />
              <span>{dish.prepTime}</span>
            </span>
          </div>

          {/* Pricing Rules & Discounts */}
          <div className="mt-1">
            <DishPriceCalculator dish={dish} diningMode={diningMode} layout="horizontal" />
          </div>
        </div>

        {/* Price & Action Row */}
        <div className="flex items-center justify-between pt-1 border-t border-[#f0f0ee] gap-1 mt-1 min-w-0">
          <div className="flex items-baseline gap-0.5 sm:gap-1 flex-wrap min-w-0 overflow-hidden">
            <span
              className={`text-[13px] sm:text-[15px] font-black tracking-tight shrink-0 ${
                isAvailable ? 'text-[#141413]' : 'text-[#787770]'
              }`}
            >
              ¥{dish.price.toFixed(2)}
            </span>
            {dish.originalPrice && (
              <span className="text-[9.5px] sm:text-[10px] text-[#a3a29b] line-through shrink-0">
                ¥{dish.originalPrice.toFixed(0)}
              </span>
            )}
            {isDiscountState && discountAmount > 0 && (
              <span className="text-[8px] sm:text-[8.5px] font-bold text-amber-900 bg-amber-50/90 px-1 sm:px-1.5 py-0.2 rounded-md border border-amber-200/90 leading-none shrink-0 truncate">
                省¥{discountAmount.toFixed(0)}
              </span>
            )}
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-1 shrink-0">
            {isOutOfRange ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOutOfRangeClick) onOutOfRangeClick();
                  else onSelect(dish);
                }}
                className="text-[9px] sm:text-[9.5px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-none bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-all flex items-center gap-0.5 cursor-pointer shadow-2xs shrink-0"
              >
                <span>改自提</span>
              </button>
            ) : isAvailable ? (
              <button
                type="button"
                onClick={handleQuickAddClick}
                className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-none transition-all flex items-center gap-0.5 cursor-pointer shadow-2xs select-none shrink-0 relative ${
                  isAdding
                    ? 'bg-black text-white scale-95'
                    : isMultiSelectMode
                    ? isSelected
                      ? 'bg-black text-white'
                      : 'bg-neutral-100 text-black hover:bg-neutral-200'
                    : 'bg-[#18181b] hover:bg-black text-white'
                }`}
              >
                {isAdding ? (
                  <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 animate-in zoom-in-50" />
                ) : dish.optionGroups && dish.optionGroups.length > 0 && !isMultiSelectMode ? null : (
                  <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                )}
                <span>
                  {isAdding
                    ? '已加'
                    : isMultiSelectMode
                    ? (isSelected ? '已选' : '选择')
                    : dish.optionGroups && dish.optionGroups.length > 0
                    ? '选规格'
                    : '选购'}
                </span>
                {!isMultiSelectMode && cartQuantity > 0 && dish.optionGroups && dish.optionGroups.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[8.5px] font-black w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center shadow-xs border border-white leading-none">
                    {cartQuantity}
                  </span>
                )}
              </button>
            ) : (
              <span className="text-[9px] sm:text-[9.5px] text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded font-medium inline-block shrink-0">
                不可选
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
