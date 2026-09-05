import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Minus,
  MapPin,
  UtensilsCrossed,
  Clock,
  Flame,
  AlertCircle,
  Layers,
  ShoppingBag,
  ExternalLink,
  Sparkles,
  Camera
} from 'lucide-react';
import { DishItem, DiningMode, DishVariant, DishOptionChoice } from '../types';
import { useFlyingCart } from '../utils/FlyingCartContext';
import {
  resolveVariantBlueprint,
  resolveOptionBlueprint,
  generateArtisanSvgBlueprint
} from '../utils/autoBlueprintEngine';

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
  const [viewMode, setViewMode] = useState<'photo' | 'blueprint' | 'sketch'>('photo');

  // Reset & initialize when dish changes
  useEffect(() => {
    if (dish) {
      setQuantity(1);
      setViewMode('photo');

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
      if (dish.spicinessOptions && dish.spicinessOptions.length > 0) {
        initial['辣度选择'] = dish.spicinessLevel || dish.spicinessOptions[0];
      }
      if (dish.flavorOptions && dish.flavorOptions.length > 0) {
        initial['口味定制'] = dish.flavor || dish.flavorOptions[0];
      }
      setSelectedOptions(initial);
    }
  }, [dish]);

  // Active Variant (declared before useMemo to guarantee consistent Hook order)
  const activeVariant = useMemo(() => {
    if (!dish || !dish.variants || dish.variants.length === 0) return null;
    return dish.variants.find((v) => v.id === selectedVariantId) || dish.variants[0];
  }, [dish, selectedVariantId]);

  // Component Specification Fallback
  const componentsList = useMemo(() => {
    if (!dish) return [];
    if (dish.specComponents && dish.specComponents.length > 0) {
      return dish.specComponents;
    }
    // Fallback derived components
    const list: Array<{ role: string; label: string; detail: string }> = [];
    if (dish.category === 'western') {
      list.push(
        { role: '肉饼主料 PATTY', label: '主料', detail: 'A5 宫崎和牛 150g (手工原切厚饼)' },
        { role: '烘焙胚底 BUN', label: '麦香胚', detail: '天然活性炭发酵手作布里欧' },
        { role: '调味基底 SAUCE', label: '酱汁', detail: '手刨黑松露艾奥利酱 + 焦糖黑醋' }
      );
    } else if (dish.category === 'skewers' || dish.category === 'yakitori') {
      list.push(
        { role: '原切签料 SKEWER', label: '签料', detail: '精选冷鲜部位 · 3:7 黄金肥瘦比' },
        { role: '炙烤火候 FIRE', label: '热源', detail: '备长炭与果木炭 850°C 瞬时锁鲜' },
        { role: '秘制撒料 SEASON', label: '调味', detail: '先锋特调低钠香料与天然海盐' }
      );
    } else if (dish.category === 'drinks') {
      list.push(
        { role: '萃取工艺 EXTRACTION', label: '冷萃', detail: '低温 4°C 慢速滴滤 18 小时深层释香' },
        { role: '原产豆种 BEAN ORIGIN', label: '豆种', detail: '埃塞俄比亚耶加雪菲日晒 G1 浅中烘焙' },
        { role: '风味修饰 FINISH', label: '回甘', detail: '微气泡注入与柑橘精油冷压喷雾' }
      );
    } else {
      list.push(
        { role: '核心食材 PRIMARY', label: '主料', detail: dish.originSource || '原产地直采高标准冷鲜直供' },
        { role: '工法工艺 CRAFT', label: '工法', detail: dish.cookingStyle || '餐车现场炭火明档现点现制' },
        { role: '风味定调 FLAVOR', label: '调味', detail: dish.flavor || '主厨特调秘传复合香料' }
      );
    }
    return list;
  }, [dish]);

  // Flavor scale metrics fallback
  const flavorMetricsList = useMemo(() => {
    if (!dish) return [];
    if (dish.flavorMetrics && dish.flavorMetrics.length > 0) {
      return dish.flavorMetrics;
    }
    if (dish.category === 'western') {
      return [
        { label: '炙烤焦香 CHARRED', score: 4, maxScore: 5 },
        { label: '多汁肉感 JUICY', score: 5, maxScore: 5 },
        { label: '松露香气 TRUFFLE', score: 4, maxScore: 5 }
      ];
    }
    if (dish.category === 'skewers' || dish.category === 'yakitori') {
      return [
        { label: '炭火熏香 SMOKY', score: 5, maxScore: 5 },
        { label: '外脆内嫩 CRISPY', score: 4, maxScore: 5 },
        { label: '香辛回甘 SAVORY', score: 4, maxScore: 5 }
      ];
    }
    if (dish.category === 'drinks') {
      return [
        { label: '花果香气 FLORAL', score: 5, maxScore: 5 },
        { label: '清润回甘 SWEET', score: 4, maxScore: 5 },
        { label: '气泡张力 FIZZ', score: 4, maxScore: 5 }
      ];
    }
    return [
      { label: '风味层次 LAYERS', score: 4, maxScore: 5 },
      { label: '原料鲜度 FRESH', score: 5, maxScore: 5 },
      { label: '工匠手工 ARTISAN', score: 5, maxScore: 5 }
    ];
  }, [dish]);

  // 自动化活程序：根据选中的变体解析实物图与专属线稿图（蓝图与手绘素描双模）
  const variantBlueprintMedia = useMemo(() => {
    if (!dish) {
      return {
        photoUrl: '',
        blueprintUrl: '',
        sketchUrl: '',
        artisanCode: 'ARTISAN #01',
        coreTemp: 'TEMP 56°C',
        specRatio: 'RATIO 7:3',
        noteZh: '',
        noteEn: ''
      };
    }
    const resolved = resolveVariantBlueprint(dish, activeVariant);

    // 智能语义推断素描对应结构
    const vName = (activeVariant?.name || dish.name).toLowerCase();
    let detectedType = 'burger_single';
    if (vName.includes('双') || vName.includes('double') || vName.includes('两层') || vName.includes('厚切')) {
      detectedType = 'burger_double';
    } else if (vName.includes('三') || vName.includes('triple') || vName.includes('盛宴')) {
      detectedType = 'burger_triple';
    } else if (vName.includes('串') || dish.category === 'skewers' || dish.category === 'yakitori') {
      detectedType = 'skewer';
    } else if (vName.includes('排') || vName.includes('steak') || dish.category === 'western') {
      detectedType = 'steak';
    } else if (vName.includes('咖') || vName.includes('饮') || dish.category === 'drinks') {
      detectedType = 'drink';
    } else if (vName.includes('蚝') || dish.category === 'baked') {
      detectedType = 'oyster';
    }

    const sketchUrl = generateArtisanSvgBlueprint({
      titleZh: activeVariant ? activeVariant.name : dish.name,
      titleEn: activeVariant?.enName || dish.enName || 'ARTISAN SKETCH',
      category: dish.category,
      sketchType: activeVariant?.sketchType || detectedType,
      coreTemp: resolved.coreTemp,
      specRatio: resolved.specRatio,
      artisanCode: resolved.artisanCode,
      style: 'pencil_sketch'
    });

    return {
      ...resolved,
      sketchUrl
    };
  }, [dish, activeVariant]);

  if (!isOpen || !dish) return null;

  // Calculate unit price with variant & selected options
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

  // Pricing analysis
  const originalPrice =
    activeVariant?.originalPrice ||
    dish.originalPrice ||
    (dish.prevPrice && dish.prevPrice > dish.price ? dish.prevPrice : dish.price + 5.0);
  const discountAmount = Math.max(0, originalPrice - basePrice);
  const discountPercent =
    originalPrice > 0 ? ((basePrice / originalPrice) * 10).toFixed(1) : '10.0';

  const handleOptionSelect = (groupName: string, choiceLabel: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [groupName]: choiceLabel
    }));
  };

  const handleConfirm = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!dish.available) return;
    const flyImage = variantBlueprintMedia.photoUrl || dish.imageUrl;
    triggerFlyToCart(e.currentTarget, flyImage);
    onAddToCart(dish, quantity, selectedOptions, totalPrice, activeVariant || undefined);
    onClose();
  };

  // Render square block indicators
  const renderSquareBlocks = (score: number, maxScore: number = 5) => {
    const filled = '■'.repeat(Math.max(0, Math.min(maxScore, score)));
    const empty = '□'.repeat(Math.max(0, maxScore - score));
    return `${filled}${empty}`;
  };

  const currentDisplayImage =
    viewMode === 'sketch'
      ? variantBlueprintMedia.sketchUrl
      : viewMode === 'blueprint'
      ? variantBlueprintMedia.blueprintUrl
      : variantBlueprintMedia.photoUrl;

  return (
    <div className="fixed inset-0 z-[100] flex justify-center items-end sm:items-center bg-[#121211]/70 backdrop-blur-xs font-sans antialiased overflow-y-auto p-0 sm:p-4">
      {/* Background click to close */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Main Spec Modal Container - Strict 0px Sharp Geometry */}
      <main
        className="artisan-spec-modal w-full max-w-md bg-[#F9F9F7] border border-[#D3D1CB] flex flex-col max-h-[94vh] sm:max-h-[890px] shadow-2xl relative overflow-hidden z-10 select-none [&_*]:rounded-none!"
        style={{ borderRadius: '0px' }}
      >
        {/* BEGIN: HeaderBar (中文在前，英文在后) */}
        <header className="bg-white border-b border-[#D3D1CB] px-4 py-3 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-[#006D36] inline-block"></span>
            <span className="text-[11px] font-mono tracking-wider text-[#1A1A17] font-bold">
              规格配置详情 SPECIFICATION
            </span>
          </div>
          <button
            aria-label="关闭定制面板 CLOSE SPECIFICATION"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center border border-[#D3D1CB] hover:border-[#1A1A17] hover:bg-[#F9F9F7] bg-white text-[#1A1A17] text-xs font-mono transition-colors duration-150 cursor-pointer"
            type="button"
          >
            ✕
          </button>
        </header>
        {/* END: HeaderBar */}

        {/* Out-Of-Range Warning notice inside Modal (中文在前，英文在后) */}
        {isOutOfRange && (
          <div className="bg-[#FAF3E0] border-b border-[#D9730D] px-3.5 py-2.5 text-[#1A1A17] flex items-start gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-[#D9730D] shrink-0 mt-0.5" />
            <div className="text-[11px] leading-snug">
              <span className="font-bold text-[#D9730D] block font-mono">
                超出外卖专送范围 OUT OF DELIVERY RADIUS
              </span>
              当前地址距餐车 <span className="font-bold">{currentDistanceKm.toFixed(2)}km</span>，已超出该餐车 <span className="font-bold">{deliveryRadiusKm.toFixed(1)}km</span> 外卖极速专送半径。
            </div>
          </div>
        )}

        {/* BEGIN: ScrollableContent */}
        <section className="overflow-y-auto px-3.5 py-3 space-y-3 bg-[#F9F9F7] flex-1">
          {/* BEGIN: HeroVisual (Photo vs Blueprint vs Sketch triple-mode with live variant sync) */}
          <div className="relative w-full h-52 bg-[#041224] border border-[#D3D1CB] overflow-hidden group shrink-0 select-none">
            {viewMode === 'photo' ? (
              // 实物模式：真实质感渲染
              <img
                key={`photo-${activeVariant?.id || 'base'}`}
                alt={`${dish.name} 实物照片`}
                className="w-full h-full object-cover object-center scale-[1.02] transition-all duration-300 filter contrast-105"
                src={variantBlueprintMedia.photoUrl}
                referrerPolicy="no-referrer"
              />
            ) : viewMode === 'sketch' ? (
              // 素描模式：真实黑白手绘石墨排线质感
              <img
                key={`sketch-${activeVariant?.id || 'base'}`}
                alt={`${dish.name} 手绘素描`}
                className="w-full h-full object-contain object-center scale-[1.01] transition-all duration-300"
                src={variantBlueprintMedia.sketchUrl}
                referrerPolicy="no-referrer"
              />
            ) : (
              // 蓝图模式：直接渲染变体/菜品的自动化工匠矢量 CAD 蓝图
              <img
                key={`blueprint-${activeVariant?.id || 'base'}`}
                alt={`${dish.name} 矢量蓝图`}
                className="w-full h-full object-contain object-center scale-[1.01] transition-all duration-300"
                src={variantBlueprintMedia.blueprintUrl}
                referrerPolicy="no-referrer"
              />
            )}

            {/* HUD / Photometric Overlay (中文在前，英文在后) */}
            <div className="absolute inset-0 pointer-events-none border border-white/10 flex flex-col justify-between p-2">
              <div className="flex justify-between items-start">
                <div className="bg-[#1A1A17]/90 backdrop-blur-xs border border-white/20 text-white px-2 py-0.5 text-[9px] font-mono tracking-wider">
                  {viewMode === 'photo'
                    ? '[实物测光视角 VIEW: LIVE PHOTOMETRIC] 1:1 照片'
                    : viewMode === 'sketch'
                    ? '[手绘素描视角 VIEW: PENCIL SKETCH] 真实排线'
                    : '[矢量工程蓝图 VIEW: VECTOR BLUEPRINT] CAD 图纸'}
                </div>
                {/* Photo vs Blueprint vs Sketch Switcher (中文在前，英文在后) */}
                <div className="pointer-events-auto inline-flex items-center border border-white/40 bg-[#1A1A17]/90 font-mono text-[9px]">
                  <button
                    onClick={() => setViewMode('photo')}
                    className={`px-2 py-0.5 cursor-pointer font-bold transition-colors ${
                      viewMode === 'photo'
                        ? 'bg-white text-[#1A1A17]'
                        : 'text-white/70 hover:text-white'
                    }`}
                    type="button"
                  >
                    实物 PHOTO
                  </button>
                  <span className="text-white/30">|</span>
                  <button
                    onClick={() => setViewMode('blueprint')}
                    className={`px-2 py-0.5 cursor-pointer font-bold transition-colors ${
                      viewMode === 'blueprint'
                        ? 'bg-[#00D4FF] text-[#041224]'
                        : 'text-white/70 hover:text-white'
                    }`}
                    type="button"
                  >
                    蓝图 CAD
                  </button>
                  <span className="text-white/30">|</span>
                  <button
                    onClick={() => setViewMode('sketch')}
                    className={`px-2 py-0.5 cursor-pointer font-bold transition-colors ${
                      viewMode === 'sketch'
                        ? 'bg-[#E6E5DC] text-[#1A1A17]'
                        : 'text-white/70 hover:text-white'
                    }`}
                    type="button"
                  >
                    素描 SKETCH
                  </button>
                </div>
              </div>

              {/* Bottom HUD bar with synchronized variant parameters */}
              <div className="flex justify-between items-end text-white/85 font-mono text-[9px]">
                <div className="bg-[#1A1A17]/85 px-1.5 py-0.5 border border-white/15 flex items-center gap-1.5">
                  <span className="font-bold text-[#00FF88]">{variantBlueprintMedia.artisanCode}</span>
                  <span className="text-white/30">/</span>
                  <span className="text-[#D9730D] font-bold">{variantBlueprintMedia.coreTemp}</span>
                  <span className="text-white/30">/</span>
                  <span>{variantBlueprintMedia.specRatio}</span>
                </div>
                <div className="bg-[#1A1A17]/85 px-1.5 py-0.5 border border-white/15">
                  坐标 COORD X:104.2 Y:88.0
                </div>
              </div>
            </div>
          </div>
          {/* END: HeroVisual */}

          {/* BEGIN: TitleAndPriceBlock (中文在前，英文在后) */}
          <div className="bg-white border border-[#D3D1CB] p-3 space-y-2.5 shrink-0">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="px-1 py-0.2 bg-[#1A1A17] text-white font-mono text-[9px] font-bold tracking-wider">
                    {variantBlueprintMedia.artisanCode}
                  </span>
                  <span className="font-mono text-[10px] text-gray-500 tracking-wider">
                    料号 REF: {dish.refCode || dish.id.toUpperCase()}
                  </span>
                </div>
                <h1 className="text-base font-bold text-[#1A1A17] leading-tight tracking-tight">
                  {dish.name}
                  {activeVariant && (
                    <span className="ml-1.5 text-xs font-mono font-normal text-[#006D36] bg-[#E8F7ED] px-1 py-0.2 border border-[#006D36]/30">
                      [{activeVariant.name}]
                    </span>
                  )}
                </h1>
                {dish.enName && (
                  <p className="text-[11px] font-mono text-gray-500 uppercase tracking-tight">
                    {dish.enName}
                  </p>
                )}
              </div>

              <div className="text-right flex flex-col items-end shrink-0">
                {originalPrice > basePrice && (
                  <span className="text-xs font-mono text-gray-400 line-through leading-none">
                    ¥{originalPrice.toFixed(2)}
                  </span>
                )}
                <div className="flex items-baseline gap-0.5 mt-0.5">
                  <span className="text-xs font-mono font-bold text-[#1A1A17]">¥</span>
                  <span className="text-xl font-mono font-bold text-[#1A1A17] leading-none">
                    {basePrice.toFixed(2)}
                  </span>
                </div>
                {discountAmount > 0 && (
                  <span className="mt-1 px-1 py-0.2 font-mono text-[9px] bg-[#E8F7ED] text-[#006D36] border border-[#006D36]/40 font-semibold">
                    立减后 DISCOUNTED -¥{discountAmount.toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            {/* Three Column Matrix Table (中文在前，英文在后) */}
            <div className="grid grid-cols-3 gap-1 py-1.5 px-2 bg-[#F9F9F7] border border-[#E2E0D8] font-mono text-[10px]">
              <div>
                <div className="text-gray-400 text-[9px]">基础原价 BASE</div>
                <div className="text-[#1A1A17] font-semibold">¥{originalPrice.toFixed(2)}</div>
              </div>
              <div className="border-l border-[#E2E0D8] pl-2">
                <div className="text-gray-400 text-[9px]">立减优惠 PROMO</div>
                <div className="text-[#006D36] font-semibold">
                  {discountAmount > 0 ? `-¥${discountAmount.toFixed(2)} (${discountPercent}折)` : '官方标配'}
                </div>
              </div>
              <div className="border-l border-[#E2E0D8] pl-2">
                <div className="text-gray-400 text-[9px]">状态标识 STATUS</div>
                <div className="text-[#D9730D] font-semibold">
                  {dish.badgeText ? `${dish.badgeText} SPECIAL` : '工匠特供 ARTISAN'}
                </div>
              </div>
            </div>

            {/* Description note */}
            {dish.description && (
              <p className="text-xs text-neutral-600 leading-relaxed font-sans pt-0.5 border-t border-[#E2E0D8]">
                {dish.description}
              </p>
            )}

            {/* Component Specification (中文在前，英文在后) */}
            <div className="space-y-1 pt-0.5 border-t border-[#E2E0D8]">
              <div className="text-[10px] font-mono tracking-wider text-gray-500 font-bold flex items-center justify-between">
                <span>[ 核心组分规格 COMPONENT SPECIFICATION ]</span>
                <span className="text-[9px] text-gray-400">
                  指标 METRIC / {componentsList.length} 项 ITEMS
                </span>
              </div>
              <div className="grid grid-cols-1 border border-[#D3D1CB] text-[11px]">
                {componentsList.map((comp, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between px-2 py-1 ${
                      idx % 2 === 1 ? 'bg-[#FAF8F3]' : 'bg-white'
                    } ${idx !== componentsList.length - 1 ? 'border-b border-[#E2E0D8]' : ''}`}
                  >
                    <span className="font-mono text-[10px] text-gray-500 uppercase">
                      {comp.role}
                    </span>
                    <span className="font-medium text-[#1A1A17] truncate max-w-[210px]">
                      {comp.detail}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Flavor Metrics Bars (中文在前，英文在后) */}
            <div className="flex items-center justify-between pt-1 border-t border-[#E2E0D8] font-mono text-[10px] overflow-x-auto no-scrollbar py-0.5">
              {flavorMetricsList.map((m, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <div className="h-2.5 w-px bg-[#D3D1CB] shrink-0 mx-1"></div>}
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-gray-500">{m.label}:</span>
                    <span className="text-[#1A1A17] font-bold tracking-tighter">
                      {renderSquareBlocks(m.score, m.maxScore)}
                    </span>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
          {/* END: TitleAndPriceBlock */}

          {/* BEGIN: Dish Variants Selector with Instant Blueprint & Media Switching */}
          {dish.available && dish.variants && dish.variants.length > 0 && (
            <div className="bg-white border border-[#D3D1CB] p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 bg-[#1A1A17]"></span>
                  <span className="text-xs font-bold text-[#1A1A17] uppercase tracking-wide">
                    规格变体版本 VARIANT SPECS
                  </span>
                </div>
                <span className="text-[10px] font-mono text-gray-500">
                  {dish.variants.length} 个版本可选 AVAILABLE
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {dish.variants.map((v) => {
                  const isSelected = activeVariant?.id === v.id;
                  const isSoldOut = v.available === false;
                  const thumbImg = v.imageUrl || v.blueprintImageUrl || dish.imageUrl;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      disabled={isSoldOut}
                      onClick={() => setSelectedVariantId(v.id)}
                      className={`p-2 text-xs border flex items-center justify-between gap-2.5 transition-all cursor-pointer text-left ${
                        isSoldOut
                          ? 'opacity-40 bg-neutral-100 border-neutral-200 cursor-not-allowed'
                          : isSelected
                          ? 'bg-[#E8F7ED]/30 border-2 border-[#006D36]'
                          : 'bg-white border-[#D3D1CB] hover:border-[#1A1A17]'
                      }`}
                    >
                      <div className="w-10 h-10 bg-[#041224] border border-[#1A1A17]/20 relative flex items-center justify-center shrink-0 overflow-hidden">
                        <img
                          alt={`${v.name} 缩略图`}
                          src={thumbImg}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute bottom-0 right-0 bg-[#00D4FF] text-[#041224] font-mono text-[6px] px-0.5 font-bold leading-none">
                          {isSelected ? 'ACTIVE' : 'VAR'}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-[#1A1A17] truncate">{v.name}</span>
                          {v.isDefault && (
                            <span className="text-[8.5px] bg-neutral-100 text-neutral-700 px-1 border border-neutral-300 font-mono">
                              默认 DEFAULT
                            </span>
                          )}
                        </div>
                        {v.description && (
                          <p className="text-[10px] text-gray-500 truncate mt-0.5">{v.description}</p>
                        )}
                        {/* Blueprint indicator badge */}
                        <div className="flex items-center gap-1 mt-1 text-[9px] font-mono text-[#006D36]">
                          <span>● 工匠线稿已联动 BLUEPRINT SYNCED</span>
                          {v.coreTemp && <span className="text-gray-400">· {v.coreTemp}</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-xs text-[#1A1A17]">
                          ¥{v.price.toFixed(2)}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {/* END: Dish Variants Selector */}

          {/* BEGIN: Dynamic Option Groups with Automated Blueprint Sketch & Collapsible Choices */}
          {dish.available && dish.optionGroups && dish.optionGroups.length > 0 && (
            <div className="space-y-3">
              {dish.optionGroups.map((group) => {
                const currentSelection = selectedOptions[group.name] || (group.choices[0]?.label ?? '');
                const selectedChoice =
                  group.choices.find((c) => c.label === currentSelection) || group.choices[0];
                const otherChoices = group.choices.filter((c) => c.label !== currentSelection);

                // 自动化活程序：解析当前选中的配菜/选项线稿
                const optionMedia = resolveOptionBlueprint(dish, group.name, selectedChoice);

                return (
                  <fieldset key={group.name} className="bg-white border border-[#D3D1CB] p-3 space-y-2">
                    <legend className="sr-only">{group.name}</legend>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 bg-[#1A1A17]"></span>
                        <span className="text-xs font-bold text-[#1A1A17] uppercase tracking-wide">
                          {group.name} {group.enName ? `/ ${group.enName}` : ''}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-gray-500 uppercase tracking-tight">
                        单选定制 SELECT 1 OPTION
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-0.5">
                      {/* Active Selected Choice Card with Automated Blueprint Sketch */}
                      {selectedChoice && (
                        <div className="p-2.5 bg-[#E8F7ED]/20 border-2 border-[#006D36] relative transition-all">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="w-3.5 h-3.5 border-2 border-[#006D36] flex items-center justify-center bg-white">
                                <span className="w-1.5 h-1.5 bg-[#006D36]"></span>
                              </span>
                              <span className="text-xs font-bold text-[#1A1A17]">{selectedChoice.label}</span>
                              <span className="px-1 py-0.5 text-[9px] font-mono font-semibold bg-[#006D36] text-white">
                                {selectedChoice.extraPrice > 0
                                  ? '已选定制 SELECTED · CUSTOM'
                                  : '已选包含 SELECTED · INCLUDED'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-mono font-semibold text-[#006D36]">
                                +¥{selectedChoice.extraPrice.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Automated Blueprint Drawing Sketch Panel (中文在前，英文在后) */}
                          <div className="mt-2 pt-2 border-t border-[#006D36]/40 flex items-center gap-2.5 bg-[#FAF8F3] border border-[#D3D1CB] p-2">
                            <div className="w-16 h-12 bg-[#041224] border border-[#1A1A17]/30 relative flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                              {/* 自动化矢量线稿渲染 */}
                              <img
                                alt={`${selectedChoice.label} 线稿`}
                                className="w-full h-full object-contain object-center scale-[1.05]"
                                src={optionMedia.blueprintUrl}
                                referrerPolicy="no-referrer"
                              />
                              <span className="absolute bottom-0 right-0 bg-[#00D4FF] text-[#041224] font-mono text-[6.5px] px-0.5 leading-none font-bold">
                                CAD
                              </span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono tracking-wider text-[#1A1A17] font-bold flex items-center gap-1">
                                  <span className="w-1 h-1 bg-[#1A1A17]"></span>
                                  草图线稿 SKETCH DRAFT
                                </span>
                                <span className="text-[9px] font-mono text-[#006D36] font-bold">
                                  {optionMedia.coreMetricZh}
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-600 mt-0.5 leading-tight font-serif truncate">
                                {optionMedia.noteZh}
                              </p>
                              <p className="text-[8.5px] text-gray-400 font-mono tracking-tight uppercase truncate">
                                {optionMedia.noteEn}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Collapsible Details for Other Options (中文在前，英文在后) */}
                      {otherChoices.length > 0 && (
                        <details className="group border border-[#D3D1CB] bg-[#F9F9F7]">
                          <summary className="flex items-center justify-between p-2.5 bg-white hover:bg-[#F9F9F7] cursor-pointer list-none transition-colors select-none">
                            <div className="flex items-center space-x-2">
                              <span className="text-[11px] font-mono font-bold text-[#1A1A17] flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-[#1A1A17] inline-block"></span>
                                更换选项 / 展开备选项 CHANGE OPTION ({otherChoices.length} 项 ITEMS)
                              </span>
                            </div>
                            <div className="flex items-center space-x-1.5 text-gray-500 font-mono text-[10px]">
                              <span>展开 EXPAND</span>
                              <span className="text-xs group-open:rotate-180 transition-transform duration-150 inline-block font-sans">
                                ▼
                              </span>
                            </div>
                          </summary>

                          <div className="p-2 space-y-1.5 border-t border-[#D3D1CB] bg-[#F9F9F7]">
                            {otherChoices.map((choice) => (
                              <label
                                key={choice.label}
                                onClick={() => handleOptionSelect(group.name, choice.label)}
                                className="flex items-center justify-between p-2 bg-white border border-[#D3D1CB] hover:border-gray-500 cursor-pointer transition-all"
                              >
                                <div className="flex items-center space-x-2">
                                  <span className="w-3.5 h-3.5 border border-[#D3D1CB] flex items-center justify-center bg-white"></span>
                                  <span className="text-xs text-gray-800">{choice.label}</span>
                                </div>
                                <span className="text-xs font-mono text-gray-600 font-medium">
                                  +¥{choice.extraPrice.toFixed(2)}
                                </span>
                              </label>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  </fieldset>
                );
              })}
            </div>
          )}

          {/* BEGIN: Spiciness & Flavor Options (中文在前，英文在后) */}
          {dish.available && dish.spicinessOptions && dish.spicinessOptions.length > 0 && (
            <fieldset className="bg-white border border-[#D3D1CB] p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 bg-[#1A1A17]"></span>
                  <span className="text-xs font-bold text-[#1A1A17] tracking-wide">
                    辣度调教 SPICINESS LEVEL
                  </span>
                </div>
                <span className="text-[10px] font-mono text-rose-600 font-semibold">
                  选择辣度 SELECT LEVEL
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-0.5">
                {dish.spicinessOptions.map((spice) => {
                  const isSelected = selectedOptions['辣度选择'] === spice;
                  return (
                    <button
                      key={spice}
                      type="button"
                      onClick={() => handleOptionSelect('辣度选择', spice)}
                      className={`p-2 text-xs border flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#E8F7ED]/20 border-2 border-[#006D36] font-bold text-[#1A1A17]'
                          : 'border-[#D3D1CB] bg-white text-gray-800 hover:border-gray-400'
                      }`}
                    >
                      <span className="truncate">{spice}</span>
                      <span
                        className={`w-2.5 h-2.5 border ${
                          isSelected ? 'bg-[#006D36] border-[#006D36]' : 'border-[#D3D1CB]'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {/* BEGIN: Flavor Customization (中文在前，英文在后) */}
          {dish.available && dish.flavorOptions && dish.flavorOptions.length > 0 && (
            <fieldset className="bg-white border border-[#D3D1CB] p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 bg-[#1A1A17]"></span>
                  <span className="text-xs font-bold text-[#1A1A17] tracking-wide">
                    口味定制 FLAVOR STYLE
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#006D36] font-semibold">
                  精选风味 SELECT FLAVOR
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-0.5">
                {dish.flavorOptions.map((flavor) => {
                  const isSelected = selectedOptions['口味定制'] === flavor;
                  return (
                    <button
                      key={flavor}
                      type="button"
                      onClick={() => handleOptionSelect('口味定制', flavor)}
                      className={`p-2 text-xs border flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#E8F7ED]/20 border-2 border-[#006D36] font-bold text-[#1A1A17]'
                          : 'border-[#D3D1CB] bg-white text-gray-800 hover:border-gray-400'
                      }`}
                    >
                      <span className="truncate">{flavor}</span>
                      <span
                        className={`w-2.5 h-2.5 border ${
                          isSelected ? 'bg-[#006D36] border-[#006D36]' : 'border-[#D3D1CB]'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {/* BEGIN: Artisan Notes & Sourcing Section (中文在前，英文在后) */}
          <section aria-label="食材溯源与手记 SOURCING & NOTES" className="space-y-2">
            {/* Sourcing card */}
            {(dish.originSource || dish.id === 'dish-1') && (
              <div className="bg-white border border-[#D3D1CB] p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#1A1A17] tracking-wider">
                  <MapPin className="w-3 h-3 text-[#1A1A17]" />
                  <span>食材原产地溯源 SOURCING</span>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed font-sans">
                  {dish.originSource || '日本宫崎县牧场直供和牛，雪花纹理达A5级标准，严选原切。'}
                </p>
              </div>
            )}

            {/* Chef notes card */}
            {(dish.chefNotes || dish.id === 'dish-1') && (
              <div className="bg-white border border-[#D3D1CB] p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#1A1A17] tracking-wider">
                  <UtensilsCrossed className="w-3 h-3 text-[#1A1A17]" />
                  <span>主厨主理手记 CHEF NOTE</span>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed font-serif italic">
                  {dish.chefNotes ||
                    '"竹炭手作堡胚不仅带来前卫视觉，更带有微醺麦香，完美承托黑冬松露与和牛油脂的醇厚浓郁。"'}
                </p>
              </div>
            )}

            {/* Metrics: Prep time & Nutrition */}
            <div className="grid grid-cols-2 gap-2 bg-white border border-[#D3D1CB] p-2.5 font-mono text-xs">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-500" />
                <div>
                  <span className="text-[9px] text-gray-400 block">备餐耗时 PREP TIME</span>
                  <span className="font-semibold text-[#1A1A17]">
                    {dish.prepTime
                      ? `约 ${dish.prepTime.replace('约', '').replace('Approx.', '').trim()}`
                      : '约 8分钟'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 border-l border-[#E2E0D8] pl-2.5">
                <Flame className="w-3.5 h-3.5 text-gray-500" />
                <div>
                  <span className="text-[9px] text-gray-400 block">营养能量 ENERGY</span>
                  <span className="font-semibold text-[#1A1A17]">
                    {dish.nutrition?.calories || '420 kcal'}
                  </span>
                </div>
              </div>
            </div>
          </section>
          {/* END: ArtisanNotesSection */}
        </section>
        {/* END: ScrollableContent */}

        {/* BEGIN: FixedBottomDock (中文在前，英文在后) */}
        <footer className="bg-white border-t border-[#D3D1CB] px-4 py-3 flex items-center justify-between gap-3 shrink-0 z-20">
          {isOutOfRange ? (
            <div className="w-full space-y-1.5">
              <div className="flex items-center gap-2">
                {onSwitchToPickup && (
                  <button
                    type="button"
                    onClick={() => {
                      onSwitchToPickup();
                      onClose();
                    }}
                    className="flex-1 h-10 bg-[#1A1A17] hover:bg-black text-white px-3 font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-[#1A1A17]"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-[#E8F7ED]" />
                    <span>改用到车自提点单 SWITCH TO PICKUP</span>
                  </button>
                )}
                {onChangeAddress && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onChangeAddress();
                    }}
                    className="h-10 px-3 border border-[#D3D1CB] hover:border-[#1A1A17] text-[#1A1A17] text-xs font-mono font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    <MapPin className="w-3 h-3 text-[#D9730D]" />
                    <span>修改地址 CHANGE ADDRESS</span>
                  </button>
                )}
              </div>
              <p className="text-[10px] font-mono text-center text-gray-500">
                自提免配送费且不受距离限制，餐车现场即刻现烤出品
              </p>
            </div>
          ) : dish.available ? (
            <>
              {/* Stepper with Strict 0px Sharp Geometry */}
              <div
                className="inline-flex items-center border border-[#D3D1CB] bg-[#F9F9F7] h-10 shrink-0"
                data-purpose="quantity-stepper"
              >
                <button
                  aria-label="减少数量 DECREASE QUANTITY"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-8 h-full flex items-center justify-center text-[#1A1A17] hover:bg-gray-200 active:bg-[#1A1A17] active:text-white border-r border-[#D3D1CB] text-sm transition-colors cursor-pointer disabled:opacity-40"
                  type="button"
                >
                  -
                </button>
                <span className="w-9 h-full flex items-center justify-center font-mono text-xs font-bold text-[#1A1A17]">
                  {quantity}
                </span>
                <button
                  aria-label="增加数量 INCREASE QUANTITY"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-8 h-full flex items-center justify-center text-[#1A1A17] hover:bg-gray-200 active:bg-[#1A1A17] active:text-white border-l border-[#D3D1CB] text-sm transition-colors cursor-pointer"
                  type="button"
                >
                  +
                </button>
              </div>

              {/* Add to Bag Master Action Button (中文在前，英文在后) */}
              <button
                onClick={handleConfirm}
                className="flex-1 h-10 bg-[#1A1A17] hover:bg-black active:bg-gray-800 text-white flex items-center justify-between px-4 border border-[#1A1A17] text-xs font-semibold tracking-wide transition-all shadow-sm cursor-pointer"
                type="button"
              >
                <span className="font-sans font-bold">加入购物车 ADD TO CART</span>
                <div className="flex items-center space-x-1">
                  <span className="text-white/40 font-mono">|</span>
                  <span className="font-mono text-sm tracking-tight font-bold">
                    ¥{totalPrice.toFixed(2)}
                  </span>
                </div>
              </button>
            </>
          ) : (
            <div className="w-full">
              <button
                disabled
                className="w-full h-10 bg-[#F1F1EF] text-gray-400 border border-[#D3D1CB] text-xs font-mono font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed"
                type="button"
              >
                <span>堂食现烤限定 · 外卖不可选购 DINE-IN EXCLUSIVE · DELIVERY UNAVAILABLE</span>
              </button>
            </div>
          )}
        </footer>
        {/* END: FixedBottomDock */}
      </main>
    </div>
  );
};
