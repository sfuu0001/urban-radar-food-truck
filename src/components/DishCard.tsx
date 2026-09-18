import React, { useState } from 'react';
import { ChevronDown, Tag, Check } from 'lucide-react';
import { DishItem, DiningMode } from '../types';
import { useFlyingCart } from '../utils/FlyingCartContext';
import { useDevSimulation } from '../context/DevSimulationContext';
import { DishDiscountBanner } from './DishDiscountBanner';

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
  onOutOfRangeClick,
  className,
  style
}) => {
  const { simulatedOutOfStockDishIds } = useDevSimulation();
  const isSimulatedStockOut = simulatedOutOfStockDishIds.includes(dish.id);
  const isAvailable = dish.available && !isOutOfRange && !isSimulatedStockOut;
  const { triggerFlyToCart } = useFlyingCart();
  const [imageLoaded, setImageLoaded] = useState(false);

  const hash = dish.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const artisanLabel = dish.artisanCode || `ARTISAN #${String((hash % 20) + 1).padStart(2, '0')}`;
  const refCodeRaw = dish.refCode ? dish.refCode.replace(/^·\s*/, '').replace(/^REF:\s*/, '') : `SK-${1000 + (hash % 1500)}`;

  const getSpecRatioLabel = () => {
    if (dish.specRatio) return dish.specRatio;
    const name = dish.name.toLowerCase();
    if (name.includes('玉棋') || name.includes('意面')) return '16G';
    if (name.includes('汉堡') || name.includes('slider')) return '150G';
    if (name.includes('m9') || name.includes('和牛')) return 'M9 WAGYU';
    if (name.includes('串') || name.includes('烧鸟') || dish.category === 'skewers') return '3串入';
    return '1份';
  };

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
    triggerFlyToCart(e.currentTarget, dish.imageUrl);
    onQuickAdd(dish, e);
  };

  const hasOptions = Boolean(dish.optionGroups && dish.optionGroups.length > 0) || Boolean(dish.variants && dish.variants.length > 0);

  return (
    <div
      onClick={handleClick}
      className={`bg-white p-2.5 border border-[#E2E4E8] flex flex-col justify-between cursor-pointer select-none transition-colors hover:border-black relative ${
        isSelected ? 'bg-neutral-100/70 ring-1 ring-black' : ''
      } ${!isAvailable ? 'opacity-70' : ''} ${className || ''}`}
      style={style}
    >
      {/* Multi-Select Checkbox */}
      {!isOutOfRange && (isMultiSelectMode || isSelected) && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (isAvailable && onToggleSelect) onToggleSelect(dish, e);
          }}
          className="absolute top-2 right-2 z-30 cursor-pointer"
        >
          {isSelected ? (
            <div className="w-5 h-5 rounded-[2px] bg-black text-white flex items-center justify-center">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-[2px] bg-white border border-gray-300" />
          )}
        </div>
      )}

      {/* Top Tag Header */}
      <div className="flex items-center justify-between font-mono text-[9px] text-gray-500 pb-1.5 mb-1.5 border-b border-gray-100">
        <span className="bg-black text-white px-1 py-0.2 rounded-[1px] font-bold">
          {artisanLabel}
        </span>
        <span>{refCodeRaw}</span>
      </div>

      {/* Product Image */}
      <div className="w-full aspect-square relative bg-black border border-gray-200 overflow-hidden mb-2">
        <img
          alt={dish.name}
          className={`w-full h-full object-cover transition-opacity duration-200 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          src={dish.imageUrl}
          onLoad={() => setImageLoaded(true)}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        <span className="absolute top-1 left-1 bg-black/60 text-white p-0.5 rounded-[1px] text-[8px]">
          <Tag className="w-2.5 h-2.5" />
        </span>
        <span className="absolute bottom-0 right-0 bg-black/80 text-gray-200 font-mono text-[8px] px-1 font-semibold">
          {getSpecRatioLabel()}
        </span>

        {/* 集成到图片中新位置：右上角智能折扣/降价自动渐显淡出提示组件 */}
        <DishDiscountBanner
          dish={dish}
          diningMode={diningMode}
          cartQuantity={cartQuantity}
        />
      </div>

      {/* Details */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-xs font-bold text-black tracking-tight truncate">
            {dish.name}
          </h3>
          <p className="text-[8px] font-mono text-gray-400 uppercase tracking-wider truncate">
            {dish.enName.toUpperCase()}
          </p>
        </div>

        {/* Price & Action Row */}
        <div className="flex items-baseline justify-between pt-2 border-t border-gray-100 mt-2">
          <div className="font-amount">
            <span className="text-xs font-bold text-black">¥{dish.price.toFixed(2)}</span>
            {hasOriginalPrice && (
              <span className="text-[9px] text-gray-400 line-through ml-1 font-amount">
                ¥{dish.originalPrice!.toFixed(2)}
              </span>
            )}
            {discountAmount > 0 && (
              <div className="text-[8px] text-[#00A86B] font-medium mt-0.5 font-amount">
                立减¥{discountAmount.toFixed(0)}
              </div>
            )}
          </div>

          {/* Action */}
          {isOutOfRange ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onOutOfRangeClick) onOutOfRangeClick();
                else onSelect(dish);
              }}
              className="px-2 py-0.5 border border-[#FF9900]/60 bg-[#FF9900]/5 text-[#FF9900] text-[10px] font-medium rounded cursor-pointer"
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
              className="px-2 py-1 bg-[#121212] hover:bg-black text-white text-[10px] font-medium rounded-[2px] flex items-center space-x-0.5 cursor-pointer select-none"
            >
              <span>选规格</span>
              <ChevronDown className="w-2.5 h-2.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleQuickAddClick}
              className="w-6 h-6 bg-[#121212] hover:bg-black text-white flex items-center justify-center rounded-[2px] text-sm font-bold shadow-sm cursor-pointer select-none relative"
            >
              +
              {cartQuantity > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#FF3B30] text-white font-mono text-[7px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center leading-none">
                  {cartQuantity}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
