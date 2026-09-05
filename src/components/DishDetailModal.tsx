import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Minus,
  MapPin,
  UtensilsCrossed,
  Clock,
  Flame,
  CheckCircle2,
  CircleDot,
  Circle,
  ShoppingBag,
  Ban,
  AlertCircle,
  Layers,
  Check
} from 'lucide-react';
import { DishItem, DiningMode, DishVariant } from '../types';
import { useFlyingCart } from '../utils/FlyingCartContext';
import { DishPriceCalculator } from './DishPriceCalculator';
import {
  getVariantBorderClass,
  getVariantFitClass,
  getVariantFilterClass,
  getVariantBadgeClasses
} from '../utils/variantStyleHelper';

interface DishDetailModalProps {
  dish: DishItem | null;
  diningMode?: DiningMode;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (
    dish: DishItem,
    quantity: number,
    selectedOptions: Record<string, string>,
    totalPrice: number,
    selectedVariant?: DishVariant
  ) => void;
  isOutOfRange?: boolean;
  deliveryRadiusKm?: number;
  currentDistanceKm?: number;
  onSwitchToPickup?: () => void;
  onChangeAddress?: () => void;
}

export const DishDetailModal: React.FC<DishDetailModalProps> = ({
  dish,
  diningMode = 'delivery',
  isOpen,
  onClose,
  onAddToCart,
  isOutOfRange = false,
  deliveryRadiusKm = 3.0,
  currentDistanceKm = 0.65,
  onSwitchToPickup,
  onChangeAddress
}) => {
  const { triggerFlyToCart } = useFlyingCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Initialize and reset options and variant when dish changes
  useEffect(() => {
    if (dish) {
      setQuantity(1);
      setActiveImageIndex(0);

      // Initialize default variant
      if (dish.variants && dish.variants.length > 0) {
        const defaultVar =
          dish.variants.find((v) => v.isDefault && v.available !== false) ||
          dish.variants.find((v) => v.available !== false) ||
          dish.variants[0];
        setSelectedVariantId(defaultVar ? defaultVar.id : null);
      } else {
        setSelectedVariantId(null);
      }

      const initial: Record<string, string> = {};
      if (dish.optionGroups) {
        dish.optionGroups.forEach((group) => {
          if (group.choices.length > 0) {
            initial[group.name] = group.choices[0].label;
          }
        });
      }
      // Initialize Spiciness & Flavor from dish parameters if not already in optionGroups
      if (dish.spicinessOptions && dish.spicinessOptions.length > 0) {
        initial['辣度选择'] = dish.spicinessLevel || dish.spicinessOptions[0];
      }
      if (dish.flavorOptions && dish.flavorOptions.length > 0) {
        initial['口味定制'] = dish.flavor || dish.flavorOptions[0];
      }
      setSelectedOptions(initial);
    }
  }, [dish]);

  if (!isOpen || !dish) return null;

  // Active Variant
  const activeVariant =
    dish.variants && dish.variants.length > 0
      ? dish.variants.find((v) => v.id === selectedVariantId) || dish.variants[0]
      : null;

  // Calculate unit price with variant independent price and extra options
  const basePrice = activeVariant ? activeVariant.price : dish.price;
  let unitPrice = basePrice;
  if (dish.optionGroups) {
    dish.optionGroups.forEach((group) => {
      const selectedChoiceLabel = selectedOptions[group.name];
      const matchedChoice = group.choices.find((c) => c.label === selectedChoiceLabel);
      if (matchedChoice && matchedChoice.extraPrice) {
        unitPrice += matchedChoice.extraPrice;
      }
    });
  }
  const totalPrice = unitPrice * quantity;

  const handleOptionSelect = (groupName: string, choiceLabel: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [groupName]: choiceLabel
    }));
  };

  const handleSelectVariant = (variant: DishVariant) => {
    if (variant.available === false) return;
    setSelectedVariantId(variant.id);
    setActiveImageIndex(0);
  };

  const handleConfirm = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!dish.available) return;
    const flyImage = (activeVariant && activeVariant.imageUrl) || dish.imageUrl;
    triggerFlyToCart(e.currentTarget, flyImage);
    onAddToCart(dish, quantity, selectedOptions, totalPrice, activeVariant || undefined);
    onClose();
  };

  // Prepare images list with active variant image prioritized
  const displayImages: { url: string; label: string; style?: DishVariant['imageStyle'] }[] = [];
  if (activeVariant && activeVariant.imageUrl && activeVariant.imageUrl.trim()) {
    displayImages.push({
      url: activeVariant.imageUrl,
      label: `${activeVariant.name} 专属图`,
      style: activeVariant.imageStyle
    });
  } else if (activeVariant && activeVariant.imageStyle) {
    displayImages.push({
      url: dish.imageUrl,
      label: `${activeVariant.name} 专属样式`,
      style: activeVariant.imageStyle
    });
  }
  displayImages.push({ url: dish.imageUrl, label: '菜品主图' });
  if (dish.galleryImages && dish.galleryImages.length > 0) {
    dish.galleryImages.forEach((img) => {
      if (!displayImages.some((existing) => existing.url === img.url)) {
        displayImages.push(img);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
      {/* Soft Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Pure White Modal Container */}
      <div className="relative bg-white w-full max-w-md max-h-[85vh] sm:max-h-[88vh] rounded-2xl shadow-2xl border border-[#e2e3e1] flex flex-col overflow-hidden z-10 my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2.5 right-2.5 z-30 w-7 h-7 rounded-full bg-white/90 hover:bg-white text-black border border-[#e2e3e1] shadow-xs flex items-center justify-center transition-all cursor-pointer"
          title="关闭"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 1. Top Carousel / Image Gallery Strip */}
        <div className="relative w-full bg-[#f6f6f4] shrink-0 border-b border-[#e2e3e1]">
          <div className="flex items-center gap-1.5 p-2 overflow-x-auto hide-scrollbar">
            {displayImages.map((imgItem, idx) => (
              <div
                key={idx}
                onClick={() => setActiveImageIndex(idx)}
                className={`relative h-40 sm:h-44 rounded-xl overflow-hidden cursor-pointer transition-all shrink-0 border ${
                  idx === 0 ? 'w-[75%]' : 'w-[45%]'
                } ${
                  activeImageIndex === idx
                    ? 'border-black ring-2 ring-black/10'
                    : 'border-[#e2e3e1] opacity-90 hover:opacity-100'
                } ${imgItem.style ? getVariantBorderClass(imgItem.style.borderStyle) : ''}`}
              >
                <img
                  src={imgItem.url}
                  alt={imgItem.label}
                  className={`w-full h-full ${
                    imgItem.style ? getVariantFitClass(imgItem.style.fitMode) : 'object-cover'
                  } ${imgItem.style ? getVariantFilterClass(imgItem.style.filter) : ''}`}
                  referrerPolicy="no-referrer"
                />

                {imgItem.style?.badgeText && (
                  <span
                    className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold shadow-xs border leading-none z-10 ${
                      getVariantBadgeClasses(imgItem.style.badgeColor).bg
                    } ${getVariantBadgeClasses(imgItem.style.badgeColor).text} ${
                      getVariantBadgeClasses(imgItem.style.badgeColor).border
                    }`}
                  >
                    {imgItem.style.badgeText}
                  </span>
                )}

                <span className="absolute bottom-1.5 left-1.5 bg-black/75 backdrop-blur-xs text-white text-[9.5px] font-bold px-1.5 py-0.2 rounded-md z-10">
                  {imgItem.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Out-Of-Range Warning notice inside Modal */}
        {isOutOfRange && (
          <div className="mx-3 mt-2.5 p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 flex items-start gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-snug">
              <span className="font-extrabold text-amber-900 block">超出外卖专送范围提示</span>
              当前送达地址距餐车 <span className="font-bold text-black">{currentDistanceKm.toFixed(2)}km</span>，已超出该餐车 <span className="font-bold text-black">{deliveryRadiusKm.toFixed(1)}km</span> 外卖半径。
            </div>
          </div>
        )}

        {/* 2. Scrollable Body Content (Pure White Theme) */}
        <div className="p-3 sm:p-3.5 overflow-y-auto flex-grow space-y-3 hide-scrollbar bg-white overscroll-contain">
          {/* Header Title & Price Pill */}
          <div className="flex items-start justify-between gap-2.5">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#1a1c1b] tracking-tight leading-snug">
                {dish.name}
              </h2>
              {dish.enName && (
                <p className="text-xs text-[#787770] font-medium mt-0.5">{dish.enName}</p>
              )}
            </div>
            {/* Price Pill Badge with Calculation */}
            <div className="flex flex-col items-end gap-0.5 shrink-0">
              <div className="flex items-center gap-1.5">
                {activeVariant?.originalPrice && (
                  <span className="text-[11px] text-[#9b9a97] line-through">
                    ¥{activeVariant.originalPrice.toFixed(2)}
                  </span>
                )}
                <div className="bg-[#f2f2ef] border border-[#e2e3e1] text-black font-extrabold text-xs sm:text-sm px-2 py-0.5 rounded-lg">
                  ¥{basePrice.toFixed(2)}
                </div>
              </div>
              <DishPriceCalculator dish={{ ...dish, price: basePrice }} showAllRules={true} layout="vertical" />
            </div>
          </div>

          {/* Description Paragraph */}
          <p className="text-xs sm:text-sm text-[#474741] leading-relaxed">
            {dish.description}
          </p>

          {/* Flavor Tags (风味标签) */}
          {dish.flavorTags && dish.flavorTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {dish.flavorTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-950 border border-amber-300 shadow-2xs"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* ======================================================== */}
          {/* [POSITION 0 - 变体规格独立选择器] Dish Variants Selector */}
          {/* ======================================================== */}
          {dish.available && dish.variants && dish.variants.length > 0 && (
            <div className="space-y-2 p-2.5 rounded-xl bg-purple-50/50 border border-purple-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs text-purple-950">
                  <Layers className="w-3.5 h-3.5 text-purple-700" />
                  <span>规格变体版本 (独立专属样式与定价)</span>
                </div>
                <span className="text-[10px] text-purple-800 font-bold bg-purple-100 px-1.5 py-0.2 rounded">
                  {dish.variants.length} 种规格
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {dish.variants.map((v) => {
                  const isSelected = activeVariant?.id === v.id;
                  const isSoldOut = v.available === false;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      disabled={isSoldOut}
                      onClick={() => handleSelectVariant(v)}
                      className={`p-2 rounded-xl text-xs border flex items-center justify-between gap-2 transition-all cursor-pointer select-none text-left ${
                        isSoldOut
                          ? 'opacity-40 bg-neutral-100 border-neutral-200 cursor-not-allowed'
                          : isSelected
                          ? 'bg-white border-2 border-purple-600 shadow-xs ring-2 ring-purple-100'
                          : 'bg-white/80 hover:bg-white border-purple-200/70 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Variant independent image thumbnail */}
                        <div
                          className={`w-11 h-11 rounded-lg overflow-hidden shrink-0 border relative group bg-neutral-100 ${
                            v.imageStyle ? getVariantBorderClass(v.imageStyle.borderStyle) : 'border-neutral-200'
                          }`}
                        >
                          <img
                            src={v.imageUrl || dish.imageUrl}
                            alt={v.name}
                            className={`w-full h-full ${
                              v.imageStyle ? getVariantFitClass(v.imageStyle.fitMode) : 'object-cover'
                            } ${v.imageStyle ? getVariantFilterClass(v.imageStyle.filter) : ''} group-hover:scale-105 transition-transform`}
                            referrerPolicy="no-referrer"
                          />
                          {v.imageStyle?.badgeText ? (
                            <span
                              className={`absolute top-0.5 left-0.5 px-1 py-0.2 rounded text-[7.5px] font-bold leading-none ${
                                getVariantBadgeClasses(v.imageStyle.badgeColor).bg
                              } ${getVariantBadgeClasses(v.imageStyle.badgeColor).text}`}
                            >
                              {v.imageStyle.badgeText}
                            </span>
                          ) : v.imageUrl ? (
                            <span className="absolute bottom-0 inset-x-0 bg-purple-700/85 text-[7.5px] text-white text-center font-bold leading-tight">
                              独立图
                            </span>
                          ) : null}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="font-bold text-xs text-neutral-900 truncate">{v.name}</span>
                            {v.isDefault && (
                              <span className="text-[8.5px] bg-purple-100 text-purple-800 px-1 rounded font-semibold">
                                默认
                              </span>
                            )}
                            {isSoldOut && (
                              <span className="text-[8.5px] bg-red-100 text-red-700 px-1 rounded font-bold">
                                沽清
                              </span>
                            )}
                          </div>
                          {v.description && (
                            <p className="text-[10.5px] text-neutral-500 truncate mt-0.5">
                              {v.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 pl-1">
                        <div className="text-right">
                          <div className="font-extrabold text-xs text-purple-950">
                            ¥{v.price.toFixed(2)}
                          </div>
                          {v.originalPrice && (
                            <div className="text-[9.5px] text-neutral-400 line-through">
                              ¥{v.originalPrice.toFixed(2)}
                            </div>
                          )}
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'border-purple-600 bg-purple-600 text-white'
                              : 'border-neutral-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* [POSITION 1 - 属性选择器置顶显示] Option Groups & Customizations */}
          {/* ======================================================== */}

          {/* Option Groups (Radio style matching reference) */}
          {dish.available && dish.optionGroups && dish.optionGroups.length > 0 && (
            <div className="space-y-3 pt-0.5">
              {dish.optionGroups.map((group) => (
                <div key={group.name} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <h3 className="font-bold text-[#1a1c1b] text-xs sm:text-sm">{group.name}</h3>
                    {group.required && (
                      <span className="text-[9.5px] text-[#787770] font-bold uppercase tracking-wider">
                        SELECT 1 INCLUDED SIDE
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {group.choices.map((choice) => {
                      const isSelected = selectedOptions[group.name] === choice.label;
                      return (
                        <button
                          key={choice.label}
                          type="button"
                          onClick={() => handleOptionSelect(group.name, choice.label)}
                          className={`w-full p-2.5 rounded-xl text-xs font-semibold border flex items-center justify-between transition-all cursor-pointer select-none ${
                            isSelected
                              ? 'bg-emerald-50/70 border-2 border-emerald-500 text-emerald-700 shadow-2xs font-bold'
                              : 'border-[#e2e3e1] bg-white text-[#1a1c1b] hover:bg-[#fafaf8]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isSelected ? (
                              <CircleDot className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <Circle className="w-3.5 h-3.5 text-[#a8a7a1] shrink-0" />
                            )}
                            <span className="font-medium">{choice.label}</span>
                          </div>

                          <span
                            className={
                              isSelected ? 'text-emerald-700 font-bold' : 'text-[#787770]'
                            }
                          >
                            +¥{choice.extraPrice.toFixed(2)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Spiciness Level Selector (if configured on dish) */}
          {dish.available && dish.spicinessOptions && dish.spicinessOptions.length > 0 && (
            <div className="space-y-1.5 pt-0.5">
              <div className="flex justify-between items-center text-xs">
                <h3 className="font-bold text-[#1a1c1b] text-xs sm:text-sm flex items-center gap-1">
                  <span>🌶️ 辣度选择</span>
                </h3>
                <span className="text-[9.5px] text-rose-600 font-bold uppercase tracking-wider">
                  Select Spiciness
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {dish.spicinessOptions.map((spice) => {
                  const isSelected = selectedOptions['辣度选择'] === spice;
                  return (
                    <button
                      key={spice}
                      type="button"
                      onClick={() => handleOptionSelect('辣度选择', spice)}
                      className={`p-2 rounded-xl text-xs font-semibold border flex items-center justify-between transition-all cursor-pointer select-none ${
                        isSelected
                          ? 'bg-rose-50/70 border-2 border-rose-500 text-rose-700 shadow-2xs font-bold'
                          : 'border-[#e2e3e1] bg-white text-[#1a1c1b] hover:bg-rose-50'
                      }`}
                    >
                      <span className="truncate">{spice}</span>
                      {isSelected ? (
                        <CircleDot className="w-3 h-3 text-rose-600 shrink-0" />
                      ) : (
                        <Circle className="w-3 h-3 text-[#a8a7a1] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Flavor Style Selector (if configured on dish) */}
          {dish.available && dish.flavorOptions && dish.flavorOptions.length > 0 && (
            <div className="space-y-1.5 pt-0.5">
              <div className="flex justify-between items-center text-xs">
                <h3 className="font-bold text-[#1a1c1b] text-xs sm:text-sm flex items-center gap-1">
                  <span>🍳 秘制口味风格</span>
                </h3>
                <span className="text-[9.5px] text-amber-700 font-bold uppercase tracking-wider">
                  Select Flavor
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {dish.flavorOptions.map((flv) => {
                  const isSelected = selectedOptions['口味定制'] === flv;
                  return (
                    <button
                      key={flv}
                      type="button"
                      onClick={() => handleOptionSelect('口味定制', flv)}
                      className={`p-2 rounded-xl text-xs font-semibold border flex items-center justify-between transition-all cursor-pointer select-none ${
                        isSelected
                          ? 'bg-amber-50/70 border-2 border-amber-500 text-amber-700 shadow-2xs font-bold'
                          : 'border-[#e2e3e1] bg-white text-[#1a1c1b] hover:bg-amber-50'
                      }`}
                    >
                      <span className="truncate">{flv}</span>
                      {isSelected ? (
                        <CircleDot className="w-3 h-3 text-amber-600 shrink-0" />
                      ) : (
                        <Circle className="w-3 h-3 text-[#a8a7a1] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!dish.available && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2 text-xs text-amber-800">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <span className="font-bold">仅限堂食：</span>
                {dish.unavailableReason || '该餐品为现场堂食限定，请移步餐车现场窗口点选品尝。'}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* [POSITION 2 - 产地故事与料理说明] Source, Chef's Notes & Nutrition */}
          {/* ======================================================== */}

          {/* SOURCE Card */}
          {(dish.originSource || dish.id === 'dish-1') && (
            <div className="p-2.5 rounded-xl bg-[#fafaf8] border border-[#e2e3e1] space-y-0.5">
              <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-[#1a1c1b] tracking-wider">
                <MapPin className="w-3.5 h-3.5 text-black" />
                <span>食材原产地溯源</span>
              </div>
              <p className="text-xs text-[#5c5b56] leading-relaxed">
                {dish.originSource ||
                  '日本宫崎县牧场直供和牛，雪花纹理达A5级标准，严选原切。'}
              </p>
            </div>
          )}

          {/* CHEF'S NOTES Card */}
          {(dish.chefNotes || dish.id === 'dish-1') && (
            <div className="p-2.5 rounded-xl bg-[#fafaf8] border border-[#e2e3e1] space-y-0.5">
              <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-[#1a1c1b] tracking-wider">
                <UtensilsCrossed className="w-3.5 h-3.5 text-black" />
                <span>主厨主理手记</span>
              </div>
              <p className="text-xs text-[#5c5b56] leading-relaxed italic">
                {dish.chefNotes ||
                  `"竹炭手作堡胚不仅带来前卫视觉，更带有微醺麦香，完美承托黑冬松露与和牛油脂的醇厚浓郁。"`}
              </p>
            </div>
          )}

          {/* Cooking Style & Craft SOP Card */}
          {(dish.cookingStyle || dish.craftStandardNote) && (
            <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-neutral-900 tracking-wider">
                  <Flame className="w-3.5 h-3.5 text-neutral-700" />
                  <span>制作风格 · 烹饪工艺</span>
                </div>
                {dish.cookingStyle && (
                  <span className="text-[10px] bg-neutral-200 text-neutral-800 px-1.5 py-0.5 rounded font-bold">
                    {dish.cookingStyle}
                  </span>
                )}
              </div>
              {dish.craftStandardNote && (
                <p className="text-xs text-neutral-700 leading-relaxed font-medium">
                  {dish.craftStandardNote}
                </p>
              )}
            </div>
          )}

          {/* Metrics Line: Prep Time & Nutrition */}
          <div className="grid grid-cols-2 gap-2.5 py-1 text-xs border-y border-[#f0f0ed]">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#787770]" />
              <div>
                <span className="text-[9.5px] text-[#787770] font-bold tracking-wider block leading-tight">
                  备餐耗时
                </span>
                <span className="font-semibold text-[#1a1c1b]">
                  {dish.prepTime ? `约 ${dish.prepTime.replace('约', '').replace('Approx.', '').trim()}` : '约 12分钟'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-[#787770]" />
              <div>
                <span className="text-[9.5px] text-[#787770] font-bold tracking-wider block leading-tight">
                  营养热量
                </span>
                <span className="font-semibold text-[#1a1c1b]">
                  {dish.nutrition?.calories || '420 kcal'} ·{' '}
                  {dish.nutrition?.protein ? `${dish.nutrition.protein.replace('pro', '蛋白质')}` : '12g 蛋白质'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Sticky Bottom Action Bar (White theme + Quantity Controls + Add to Bag Button) */}
        <div className="p-2.5 sm:p-3 bg-white border-t border-[#e2e3e1] flex items-center gap-2.5 shrink-0 z-20 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
          {isOutOfRange ? (
            <div className="w-full space-y-2">
              <div className="flex items-center gap-2">
                {onSwitchToPickup && (
                  <button
                    type="button"
                    onClick={() => {
                      onSwitchToPickup();
                      onClose();
                    }}
                    className="flex-1 bg-black text-white hover:bg-neutral-800 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                    <span>改用【到车自提】立即点单</span>
                  </button>
                )}
                {onChangeAddress && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onChangeAddress();
                    }}
                    className="px-3 py-2.5 rounded-xl border border-[#d2d0c8] bg-white hover:bg-neutral-50 text-black font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shrink-0"
                  >
                    <MapPin className="w-3.5 h-3.5 text-amber-600" />
                    <span>修改地址</span>
                  </button>
                )}
              </div>
              <p className="text-[10px] text-center text-amber-800">
                切换为到车自提模式免配送费，现场现烤出餐无需受配送距离限制
              </p>
            </div>
          ) : dish.available ? (
            <>
              {/* Stepper (Dark pill stepper) */}
              <div className="flex items-center bg-neutral-900 text-white px-2 py-1 rounded-xl gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-5 h-5 flex items-center justify-center hover:bg-neutral-800 rounded transition-colors text-white disabled:opacity-40 cursor-pointer"
                  disabled={quantity <= 1}
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-4 text-center font-bold text-xs">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-5 h-5 flex items-center justify-center hover:bg-neutral-800 rounded transition-colors text-white cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {/* Add to Bag Button */}
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 bg-black text-white hover:bg-neutral-800 py-2 sm:py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-98"
              >
                <span>加入购物车</span>
                <span>·</span>
                <span>¥{totalPrice.toFixed(2)}</span>
              </button>
            </>
          ) : (
            <div className="w-full space-y-1">
              <button
                type="button"
                disabled
                className="w-full bg-[#f1f1ef] text-[#787770] py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed border border-[#e2e3e1]"
                title="该菜品为流动餐车现场炭烤限定，仅支持堂食/外摆点单"
              >
                <Ban className="w-3.5 h-3.5 text-[#9b9a97]" />
                <span>堂食现烤限定 · 外卖配送不可选购</span>
              </button>
              <p className="text-[10px] text-center text-[#787770]">
                请在顶部切换为【堂食外摆】或【极速自提】模式即可点单
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
