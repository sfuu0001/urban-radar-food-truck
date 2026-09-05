import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Flame,
  ChefHat,
  Tag,
  Barcode,
  Layers,
  Sparkles,
  Sliders,
  Bike,
  Utensils,
  ShoppingBag,
  Shield,
  Clock,
  Zap,
  ZoomIn,
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  RotateCcw,
  Copy,
  Plus,
  Minus,
  Trash2,
  SlidersHorizontal,
  ArrowRight,
  Printer
} from 'lucide-react';
import { DishItem, DishVariant } from '../../types';
import { globalScannerEngine } from '../../utils/barcodeScannerEngine';
import { DishPriceCalculator } from '../DishPriceCalculator';
import { FlavorTagSelector } from './FlavorTagSelector';
import {
  SPICINESS_PRESETS,
  FLAVOR_PRESETS,
  COOKING_STYLE_PRESETS
} from './MerchantMenuChannel';

export interface DishParameterRulesModalProps {
  dish: DishItem;
  initialTab?:
    | 'parameters'
    | 'flavor_tags'
    | 'price_discount'
    | 'cooking_sop'
    | 'image'
    | 'barcode'
    | 'preview'
    | 'variants'
    | 'operating_rules';
  onClose: () => void;
  onSave: (updatedDish: DishItem) => void;
  showToast: (msg: string) => void;
  onPreviewZoom?: (dish: DishItem) => void;
  onOpenUploadModal?: (dish: DishItem) => void;
}

export const DishParameterRulesModal: React.FC<DishParameterRulesModalProps> = ({
  dish,
  initialTab = 'parameters',
  onClose,
  onSave,
  showToast,
  onPreviewZoom,
  onOpenUploadModal
}) => {
  // Navigation tab
  const [activeTab, setActiveTab] = useState<
    | 'parameters'
    | 'flavor_tags'
    | 'cooking_sop'
    | 'price_discount'
    | 'operating_rules'
    | 'barcode'
    | 'variants'
    | 'preview'
  >(initialTab === 'image' ? 'parameters' : initialTab);

  // Form states
  const [editPrice, setEditPrice] = useState<string>(dish.price.toString());
  const [editOriginalPrice, setEditOriginalPrice] = useState<string>(
    dish.originalPrice ? dish.originalPrice.toString() : ''
  );
  const [editPrevPrice, setEditPrevPrice] = useState<string>(
    dish.prevPrice ? dish.prevPrice.toString() : ''
  );
  const [editDeliveryDiscount, setEditDeliveryDiscount] = useState<string>(
    dish.deliveryDiscount !== undefined ? dish.deliveryDiscount.toString() : ''
  );
  const [editDeliveryDiscountTag, setEditDeliveryDiscountTag] = useState<string>(
    dish.deliveryDiscountTag || (dish.deliveryDiscount ? `外卖立减¥${dish.deliveryDiscount}` : '')
  );
  const [editDineInDiscount, setEditDineInDiscount] = useState<string>(
    dish.dineInDiscount !== undefined ? dish.dineInDiscount.toString() : ''
  );
  const [editDineInDiscountTag, setEditDineInDiscountTag] = useState<string>(
    dish.dineInDiscountTag || (dish.dineInDiscount ? `堂食立减¥${dish.dineInDiscount}` : '')
  );

  // Spiciness, Flavor, SOP
  const [editSpicinessLevel, setEditSpicinessLevel] = useState<string>(
    dish.spicinessLevel || '微辣 (推荐)'
  );
  const [editSpicinessOptions, setEditSpicinessOptions] = useState<string[]>(
    dish.spicinessOptions && dish.spicinessOptions.length > 0
      ? dish.spicinessOptions
      : SPICINESS_PRESETS
  );
  const [editCustomSpiceInput, setEditCustomSpiceInput] = useState<string>('');
  const [editFlavor, setEditFlavor] = useState<string>(dish.flavor || '秘制黑椒酱香');
  const [editFlavorOptions, setEditFlavorOptions] = useState<string[]>(
    dish.flavorOptions && dish.flavorOptions.length > 0
      ? dish.flavorOptions
      : FLAVOR_PRESETS.slice(0, 5)
  );
  const [editCustomFlavorInput, setEditCustomFlavorInput] = useState<string>('');
  const [editFlavorTags, setEditFlavorTags] = useState<string[]>(
    dish.flavorTags && dish.flavorTags.length > 0 ? dish.flavorTags : []
  );
  const [editCookingStyle, setEditCookingStyle] = useState<string>(
    dish.cookingStyle || '炭火现烤 (果木炭慢烘)'
  );
  const [editCraftStandardNote, setEditCraftStandardNote] = useState<string>(
    dish.craftStandardNote || '高温果木炭慢火烘烤，双面翻烤锁住汁水，出炉撒秘制调料'
  );
  const [editBadgeText, setEditBadgeText] = useState<string>(dish.badgeText || '');
  const [editPrepTime, setEditPrepTime] = useState<string>(dish.prepTime || '约8m');

  // Barcode & Scanner
  const [editBarcode, setEditBarcode] = useState<string>(dish.barcode || '');
  const [isListeningForBarcodeScan, setIsListeningForBarcodeScan] = useState<boolean>(false);

  // Variants
  const [editVariants, setEditVariants] = useState<DishVariant[]>(
    dish.variants && dish.variants.length > 0 ? JSON.parse(JSON.stringify(dish.variants)) : []
  );

  // Enhanced Operational Rules States (运营规则参数)
  const [minOrderThreshold, setMinOrderThreshold] = useState<number>(0);
  const [peakThrottleLimit, setPeakThrottleLimit] = useState<number>(30); // 15分钟最大制作单数
  const [autoSoldOutThreshold, setAutoSoldOutThreshold] = useState<number>(5); // 安全库存触发自动沽清
  const [couponStackingAllowed, setCouponStackingAllowed] = useState<boolean>(true); // 是否允许与满减券叠加
  const [riderBoxCodeRequired, setRiderBoxCodeRequired] = useState<boolean>(true); // 是否强制骑手扫箱码防串单
  const [prepBufferWindow, setPrepBufferWindow] = useState<number>(3); // 高峰备餐延时缓冲（分钟）

  // Right Preview Simulation States
  const [rightPreviewChannel, setRightPreviewChannel] = useState<'delivery' | 'dine_in'>('delivery');
  const [rightActiveVariantIndex, setRightActiveVariantIndex] = useState<number>(-1);
  const [previewStyleMode, setPreviewStyleMode] = useState<'hud_card' | 'spec_modal'>('hud_card');
  const [previewQuantity, setPreviewQuantity] = useState<number>(1);
  const [previewSelectedSpice, setPreviewSelectedSpice] = useState<string>(editSpicinessLevel);
  const [previewSelectedFlavor, setPreviewSelectedFlavor] = useState<string>(editFlavor);
  const [previewToastMessage, setPreviewToastMessage] = useState<string | null>(null);

  // Barcode auto-capture subscription
  useEffect(() => {
    if (!isListeningForBarcodeScan) return;
    const unsub = globalScannerEngine.subscribe((result) => {
      setEditBarcode(result.code);
      setIsListeningForBarcodeScan(false);
      showToast(`[扫码枪硬件联动] 成功录入条码: ${result.code}`);
    });
    return () => unsub();
  }, [isListeningForBarcodeScan, showToast]);

  // Keep preview state aligned when defaults change
  useEffect(() => {
    setPreviewSelectedSpice(editSpicinessLevel);
  }, [editSpicinessLevel]);

  useEffect(() => {
    setPreviewSelectedFlavor(editFlavor);
  }, [editFlavor]);

  // Handle Save
  const handleSave = () => {
    const p = parseFloat(editPrice) || dish.price;
    const op = editOriginalPrice ? parseFloat(editOriginalPrice) : undefined;
    const pp = editPrevPrice ? parseFloat(editPrevPrice) : undefined;
    const dd = editDeliveryDiscount ? parseFloat(editDeliveryDiscount) : undefined;
    const did = editDineInDiscount ? parseFloat(editDineInDiscount) : undefined;

    const updated: DishItem = {
      ...dish,
      variants: editVariants && editVariants.length > 0 ? editVariants : undefined,
      price: p,
      originalPrice: op,
      prevPrice: pp,
      deliveryDiscount: dd,
      deliveryDiscountTag: editDeliveryDiscountTag.trim() || (dd ? `外卖立减¥${dd}` : undefined),
      dineInDiscount: did,
      dineInDiscountTag: editDineInDiscountTag.trim() || (did ? `堂食立减¥${did}` : undefined),
      discountTag: editDeliveryDiscountTag.trim() || (dd ? `外卖立减¥${dd}` : dish.discountTag),
      spicinessLevel: editSpicinessLevel,
      spicinessOptions: editSpicinessOptions,
      flavor: editFlavor,
      flavorOptions: editFlavorOptions,
      flavorTags: editFlavorTags,
      cookingStyle: editCookingStyle,
      craftStandardNote: editCraftStandardNote,
      badgeText: editBadgeText.trim() || undefined,
      prepTime: editPrepTime.trim() || '约8m',
      barcode: editBarcode.trim() || undefined
    };

    onSave(updated);
  };

  // Preview computations
  const currentVariant = rightActiveVariantIndex >= 0 ? editVariants[rightActiveVariantIndex] : null;
  const currentPrice = currentVariant ? currentVariant.price : parseFloat(editPrice) || dish.price;
  const currentDiscount =
    rightPreviewChannel === 'delivery'
      ? parseFloat(editDeliveryDiscount) || 0
      : parseFloat(editDineInDiscount) || 0;
  const finalUnitPrice = Math.max(0, currentPrice - currentDiscount);
  const finalTotalPrice = finalUnitPrice * previewQuantity;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/25 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-[#ffffff] w-full max-w-5xl xl:max-w-6xl 2xl:max-w-[1260px] rounded-2xl sm:rounded-3xl border border-[#e2e3e1] shadow-urban-modal overflow-hidden flex flex-col max-h-[92vh] font-hanken text-[#1a1c1b]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER - Urban Radar Minimalist Luxury Styling */}
        <div className="px-6 py-4 bg-[#f9f9f7] border-b border-[#e2e3e1] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Dish Thumbnail */}
            <div
              onClick={() => onPreviewZoom && onPreviewZoom(dish)}
              className="relative w-11 h-11 rounded-lg overflow-hidden border border-[#c8c7be] shrink-0 group cursor-pointer bg-[#eeeeec]"
              title="点击查看高清实拍原图"
            >
              <img
                src={dish.imageUrl}
                alt={dish.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 flex items-center justify-center transition-colors">
                <ZoomIn className="w-3.5 h-3.5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-[18px] sm:text-[20px] text-[#1a1c1b] tracking-tight truncate leading-tight">
                  配置【{dish.name}】参数与运营规则
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#e6f4ea] text-[#006d36] border border-[#a8dab5] shrink-0">
                  {dish.available !== false ? '在售生效中' : '全网沽清中'}
                </span>
                {dish.badgeText && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#eeeeec] text-[#474741] shrink-0">
                    {dish.badgeText}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-[#787770] font-mono mt-0.5">
                <span>{dish.enName}</span>
                <span>•</span>
                <span className="font-bold text-[#1a1c1b]">基准 ¥{parseFloat(editPrice || '0').toFixed(2)}</span>
                <span>•</span>
                <span>出餐 {editPrepTime}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 text-[12px] text-[#006d36] bg-[#e6f4ea] px-3 py-1 rounded-full font-medium">
              <span className="w-2 h-2 rounded-full bg-[#006d36] animate-pulse" />
              <span>左侧参数调节 · 右侧真机实时映射</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#787770] hover:text-[#1a1c1b] hover:bg-[#eeeeec] transition-colors cursor-pointer"
              title="关闭弹窗"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL MAIN BODY: LEFT FORM + RIGHT LIVE SIMULATOR */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden bg-[#f9f9f7]">
          {/* LEFT COLUMN: PARAMETERS & OPERATING RULES TABS */}
          <div className="flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden border-r border-[#e2e3e1]">
            {/* Horizontal Tabs Bar */}
            <div className="flex items-center bg-[#ffffff] px-4 pt-2 border-b border-[#e2e3e1] gap-1 shrink-0 overflow-x-auto hide-scrollbar">
              {[
                {
                  id: 'parameters',
                  label: '辣度与口感',
                  icon: Flame,
                  badge: editSpicinessLevel.split(' ')[0]
                },
                {
                  id: 'flavor_tags',
                  label: `风味标签 (${editFlavorTags.length})`,
                  icon: Tag
                },
                {
                  id: 'cooking_sop',
                  label: '工艺与SOP',
                  icon: ChefHat
                },
                {
                  id: 'price_discount',
                  label: '价格与渠道立减',
                  icon: SlidersHorizontal
                },
                {
                  id: 'operating_rules',
                  label: '运营与限流风控',
                  icon: Shield,
                  highlight: true
                },
                {
                  id: 'barcode',
                  label: '69码与扫码枪',
                  icon: Barcode
                },
                {
                  id: 'variants',
                  label: `规格变体 ${editVariants.length > 0 ? `(${editVariants.length})` : ''}`,
                  icon: Layers
                },
                {
                  id: 'preview',
                  label: '真机前台预览',
                  icon: Sparkles
                }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      if (tab.id === 'variants') {
                        setPreviewStyleMode('spec_modal');
                      }
                    }}
                    className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap -mb-[1px] ${
                      isActive
                        ? 'bg-[#f9f9f7] text-[#000000] border-t-2 border-t-[#000000] border-x border-[#e2e3e1]'
                        : 'text-[#787770] hover:text-[#1a1c1b] hover:bg-[#f4f4f2]'
                    } ${tab.highlight ? 'text-[#006d36]' : ''}`}
                  >
                    <Icon
                      className={`w-3.5 h-3.5 ${
                        isActive
                          ? 'text-[#000000]'
                          : tab.highlight
                          ? 'text-[#006d36]'
                          : 'text-[#787770]'
                      }`}
                    />
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span className="text-[10px] bg-[#eeeeec] text-[#1a1c1b] px-1.5 py-0.2 rounded-full font-mono font-semibold">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* TAB CONTENT AREA */}
            <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1 hide-scrollbar">
              {/* TAB 1: 辣度与口感参数 */}
              {activeTab === 'parameters' && (
                <div className="space-y-4">
                  {/* Spiciness Level Card */}
                  <div className="p-5 bg-[#ffffff] rounded-xl border border-[#e2e3e1] shadow-urban space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center font-bold">
                          <Flame className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-[#1a1c1b]">
                            1. 默认推荐辣度等级 (Default Spiciness)
                          </h4>
                          <p className="text-[11px] text-[#787770]">
                            设定前台点餐时的默认推荐勾选项，食客未选时按此标准烹制
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[#f4f4f2] text-[#1a1c1b]">
                        当前: {editSpicinessLevel}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                      {SPICINESS_PRESETS.map((spice) => {
                        const isSelected = editSpicinessLevel === spice;
                        return (
                          <button
                            key={spice}
                            type="button"
                            onClick={() => setEditSpicinessLevel(spice)}
                            className={`p-3 rounded-lg text-xs font-bold border text-left transition-all cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? 'bg-[#000000] text-[#ffffff] border-[#000000] shadow-sm'
                                : 'bg-[#f9f9f7] text-[#1a1c1b] border-[#e2e3e1] hover:bg-[#f4f4f2]'
                            }`}
                          >
                            <span>{spice}</span>
                            {isSelected && <Check className="w-4 h-4 text-white" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Customer Selection Pool */}
                    <div className="pt-3 border-t border-[#e2e3e1] space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-[#1a1c1b]">
                          食客端可选辣度池 (Customer Options Pool):
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditSpicinessOptions(SPICINESS_PRESETS)}
                          className="text-[#006d36] hover:underline cursor-pointer font-bold"
                        >
                          重置为全部5档预设
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {editSpicinessOptions.map((opt) => (
                          <span
                            key={opt}
                            className="bg-[#f4f4f2] text-[#1a1c1b] border border-[#e2e3e1] px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1.5 font-medium"
                          >
                            <span>{opt}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setEditSpicinessOptions(
                                  editSpicinessOptions.filter((o) => o !== opt)
                                )
                              }
                              className="text-[#787770] hover:text-[#ba1a1a] cursor-pointer"
                              title="移除此选项"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>

                      {/* Custom Spice Input */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          placeholder="添加个性化辣度 如: 爆裂魔鬼椒 / 减盐微辣"
                          value={editCustomSpiceInput}
                          onChange={(e) => setEditCustomSpiceInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (
                              e.key === 'Enter' &&
                              editCustomSpiceInput.trim() &&
                              !editSpicinessOptions.includes(editCustomSpiceInput.trim())
                            ) {
                              setEditSpicinessOptions([
                                ...editSpicinessOptions,
                                editCustomSpiceInput.trim()
                              ]);
                              setEditCustomSpiceInput('');
                            }
                          }}
                          className="p-2 bg-[#f9f9f7] border border-[#c8c7be] focus:border-[#000000] rounded-lg text-xs flex-1 outline-none transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              editCustomSpiceInput.trim() &&
                              !editSpicinessOptions.includes(editCustomSpiceInput.trim())
                            ) {
                              setEditSpicinessOptions([
                                ...editSpicinessOptions,
                                editCustomSpiceInput.trim()
                              ]);
                              setEditCustomSpiceInput('');
                            }
                          }}
                          className="px-3.5 py-2 bg-[#000000] text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-neutral-800 transition-colors"
                        >
                          添加
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Flavor Style Card */}
                  <div className="p-5 bg-[#ffffff] rounded-xl border border-[#e2e3e1] shadow-urban space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#eeeeec] text-[#1a1c1b] flex items-center justify-center font-bold">
                          <ChefHat className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-[#1a1c1b]">
                            2. 默认主理人口味风格 (Flavor Style)
                          </h4>
                          <p className="text-[11px] text-[#787770]">
                            突出秘制风味配方，提升餐品特色认知与复购率
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[#f4f4f2] text-[#1a1c1b]">
                        当前: {editFlavor}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                      {FLAVOR_PRESETS.map((flv) => {
                        const isSelected = editFlavor === flv;
                        return (
                          <button
                            key={flv}
                            type="button"
                            onClick={() => setEditFlavor(flv)}
                            className={`p-3 rounded-lg text-xs font-bold border text-left transition-all cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? 'bg-[#000000] text-[#ffffff] border-[#000000] shadow-sm'
                                : 'bg-[#f9f9f7] text-[#1a1c1b] border-[#e2e3e1] hover:bg-[#f4f4f2]'
                            }`}
                          >
                            <span className="truncate">{flv}</span>
                            {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Customer Flavor Pool */}
                    <div className="pt-3 border-t border-[#e2e3e1] space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-[#1a1c1b]">
                          前台可选口味集合 (Customer Flavor Pool):
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditFlavorOptions(FLAVOR_PRESETS.slice(0, 5))}
                          className="text-[#006d36] hover:underline cursor-pointer font-bold"
                        >
                          重置为前5款经典
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {editFlavorOptions.map((opt) => (
                          <span
                            key={opt}
                            className="bg-[#f4f4f2] text-[#1a1c1b] border border-[#e2e3e1] px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1.5 font-medium"
                          >
                            <span>{opt}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setEditFlavorOptions(
                                  editFlavorOptions.filter((o) => o !== opt)
                                )
                              }
                              className="text-[#787770] hover:text-[#ba1a1a] cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          placeholder="添加自定义风味 如: 芥末蜂蜜 / 黑松露芝士"
                          value={editCustomFlavorInput}
                          onChange={(e) => setEditCustomFlavorInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (
                              e.key === 'Enter' &&
                              editCustomFlavorInput.trim() &&
                              !editFlavorOptions.includes(editCustomFlavorInput.trim())
                            ) {
                              setEditFlavorOptions([
                                ...editFlavorOptions,
                                editCustomFlavorInput.trim()
                              ]);
                              setEditCustomFlavorInput('');
                            }
                          }}
                          className="p-2 bg-[#f9f9f7] border border-[#c8c7be] focus:border-[#000000] rounded-lg text-xs flex-1 outline-none transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              editCustomFlavorInput.trim() &&
                              !editFlavorOptions.includes(editCustomFlavorInput.trim())
                            ) {
                              setEditFlavorOptions([
                                ...editFlavorOptions,
                                editCustomFlavorInput.trim()
                              ]);
                              setEditCustomFlavorInput('');
                            }
                          }}
                          className="px-3.5 py-2 bg-[#000000] text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-neutral-800 transition-colors"
                        >
                          添加
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: 风味标签库 */}
              {activeTab === 'flavor_tags' && (
                <div className="space-y-4">
                  <div className="p-5 bg-[#ffffff] rounded-xl border border-[#e2e3e1] shadow-urban">
                    <FlavorTagSelector
                      selectedTags={editFlavorTags}
                      onChange={setEditFlavorTags}
                      title="菜品风味多维标签矩阵"
                      description="支持多选预设风味包或输入自定义专属标签，保存后实时展示于顾客端详情页与列表中"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: 制作工艺与SOP标准 */}
              {activeTab === 'cooking_sop' && (
                <div className="space-y-4">
                  <div className="p-5 bg-[#ffffff] rounded-xl border border-[#e2e3e1] shadow-urban space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#e6f4ea] text-[#006d36] flex items-center justify-center font-bold">
                          <ChefHat className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-[#1a1c1b]">
                            制作风格与烹饪工艺标准 (Cooking Style & SOP)
                          </h4>
                          <p className="text-[11px] text-[#787770]">
                            指引后厨标准化操作，并在前台传递现做品质感
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[#f4f4f2] text-[#1a1c1b]">
                        当前: {editCookingStyle}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {COOKING_STYLE_PRESETS.map((style) => {
                        const isSelected = editCookingStyle === style;
                        return (
                          <button
                            key={style}
                            type="button"
                            onClick={() => setEditCookingStyle(style)}
                            className={`p-3 rounded-lg text-xs font-bold border text-left transition-all cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? 'bg-[#000000] text-[#ffffff] border-[#000000] shadow-sm'
                                : 'bg-[#f9f9f7] text-[#1a1c1b] border-[#e2e3e1] hover:bg-[#f4f4f2]'
                            }`}
                          >
                            <span>{style}</span>
                            {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Craft Standard Note & Prep Time Card */}
                  <div className="p-5 bg-[#ffffff] rounded-xl border border-[#e2e3e1] shadow-urban space-y-4">
                    <div>
                      <label className="font-bold text-xs text-[#1a1c1b] block mb-1.5">
                        工艺 SOP 规范要点与主厨建议 (展示给食客及前台出餐核验):
                      </label>
                      <textarea
                        rows={3}
                        value={editCraftStandardNote}
                        onChange={(e) => setEditCraftStandardNote(e.target.value)}
                        placeholder="如: 选用900℃高温果木炭慢烘烤制，外皮焦香内里肉汁丰沛，撒以秘制椒盐。"
                        className="w-full p-3 bg-[#f9f9f7] border border-[#c8c7be] focus:border-[#000000] rounded-xl text-xs outline-none transition-colors leading-relaxed"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="font-bold text-xs text-[#1a1c1b] block mb-1.5">
                          预估制作出餐时长 (Prep Time):
                        </label>
                        <input
                          type="text"
                          value={editPrepTime}
                          onChange={(e) => setEditPrepTime(e.target.value)}
                          placeholder="如: 约8m"
                          className="w-full p-2.5 bg-[#f9f9f7] border border-[#c8c7be] focus:border-[#000000] rounded-lg text-xs outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-xs text-[#1a1c1b] block mb-1.5">
                          特色营销角标文案 (Badge Text):
                        </label>
                        <input
                          type="text"
                          value={editBadgeText}
                          onChange={(e) => setEditBadgeText(e.target.value)}
                          placeholder="如: 招牌必点 / 现烤热卖 / 5G极速"
                          className="w-full p-2.5 bg-[#f9f9f7] border border-[#c8c7be] focus:border-[#000000] rounded-lg text-xs outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: 价格与渠道立减规则 */}
              {activeTab === 'price_discount' && (
                <div className="space-y-4">
                  {/* Base Pricing */}
                  <div className="p-5 bg-[#ffffff] rounded-xl border border-[#e2e3e1] shadow-urban space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#eeeeec] text-[#1a1c1b] flex items-center justify-center font-bold">
                        <Sliders className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#1a1c1b]">
                          基准售价与价格对标设定
                        </h4>
                        <p className="text-[11px] text-[#787770]">
                          设置当前基准标价、划线原价以及环比降幅对标价
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      <div className="p-3 bg-[#f9f9f7] rounded-xl border border-[#e2e3e1]">
                        <label className="font-bold text-xs text-[#1a1c1b] block mb-1">
                          当前销售价 (¥) *
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#1a1c1b]">
                            ¥
                          </span>
                          <input
                            type="number"
                            step="0.1"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            className="w-full pl-7 pr-3 py-2 bg-white border border-[#c8c7be] focus:border-[#000000] rounded-lg text-sm font-mono font-bold text-[#1a1c1b] outline-none"
                          />
                        </div>
                      </div>

                      <div className="p-3 bg-[#f9f9f7] rounded-xl border border-[#e2e3e1]">
                        <label className="font-bold text-xs text-[#787770] block mb-1">
                          划线原价 (¥)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm font-mono text-[#787770]">
                            ¥
                          </span>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="选填"
                            value={editOriginalPrice}
                            onChange={(e) => setEditOriginalPrice(e.target.value)}
                            className="w-full pl-7 pr-3 py-2 bg-white border border-[#c8c7be] focus:border-[#000000] rounded-lg text-sm font-mono text-[#787770] outline-none"
                          />
                        </div>
                      </div>

                      <div className="p-3 bg-[#f9f9f7] rounded-xl border border-[#e2e3e1]">
                        <label className="font-bold text-xs text-[#787770] block mb-1">
                          环比对比价 (¥)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm font-mono text-[#787770]">
                            ¥
                          </span>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="选填"
                            value={editPrevPrice}
                            onChange={(e) => setEditPrevPrice(e.target.value)}
                            className="w-full pl-7 pr-3 py-2 bg-white border border-[#c8c7be] focus:border-[#000000] rounded-lg text-sm font-mono text-[#787770] outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Channel-Specific Discount Rules */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Delivery Discount Rule */}
                    <div className="p-5 bg-[#ffffff] rounded-xl border border-[#e2e3e1] shadow-urban space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[#e6f4ea] text-[#006d36] flex items-center justify-center font-bold">
                            <Bike className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-[#1a1c1b]">外卖专享立减规则</h4>
                            <p className="text-[10.5px] text-[#787770]">仅在外卖专送模式生效</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditDeliveryDiscount('5.00');
                              setEditDeliveryDiscountTag('外卖立减¥5');
                            }}
                            className="text-[10px] px-2 py-0.5 bg-[#f4f4f2] text-[#1a1c1b] rounded-full border border-[#c8c7be] hover:bg-[#eeeeec] cursor-pointer font-bold"
                          >
                            +¥5
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditDeliveryDiscount('');
                              setEditDeliveryDiscountTag('');
                            }}
                            className="text-[10px] px-2 py-0.5 bg-white text-[#787770] rounded-full border border-[#c8c7be] hover:text-[#ba1a1a] cursor-pointer"
                          >
                            清空
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 pt-1">
                        <div>
                          <label className="text-[11px] font-bold text-[#474741] block mb-1">
                            外卖立减金额 (¥):
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            placeholder="如: 5.00"
                            value={editDeliveryDiscount}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditDeliveryDiscount(val);
                              if (val && !editDeliveryDiscountTag) {
                                setEditDeliveryDiscountTag(`外卖立减¥${val}`);
                              }
                            }}
                            className="w-full p-2 bg-[#f9f9f7] border border-[#c8c7be] focus:border-[#000000] rounded-lg font-mono text-xs outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-[#474741] block mb-1">
                            展示标签文案:
                          </label>
                          <input
                            type="text"
                            placeholder="如: 外卖立减¥5"
                            value={editDeliveryDiscountTag}
                            onChange={(e) => setEditDeliveryDiscountTag(e.target.value)}
                            className="w-full p-2 bg-[#f9f9f7] border border-[#c8c7be] focus:border-[#000000] rounded-lg text-xs outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Dine-In Discount Rule */}
                    <div className="p-5 bg-[#ffffff] rounded-xl border border-[#e2e3e1] shadow-urban space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[#eeeeec] text-[#1a1c1b] flex items-center justify-center font-bold">
                            <Utensils className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-[#1a1c1b]">堂食专享立减规则</h4>
                            <p className="text-[10.5px] text-[#787770]">仅在餐车现场就餐生效</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditDineInDiscount('3.00');
                              setEditDineInDiscountTag('堂食立减¥3');
                            }}
                            className="text-[10px] px-2 py-0.5 bg-[#f4f4f2] text-[#1a1c1b] rounded-full border border-[#c8c7be] hover:bg-[#eeeeec] cursor-pointer font-bold"
                          >
                            +¥3
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditDineInDiscount('');
                              setEditDineInDiscountTag('');
                            }}
                            className="text-[10px] px-2 py-0.5 bg-white text-[#787770] rounded-full border border-[#c8c7be] hover:text-[#ba1a1a] cursor-pointer"
                          >
                            清空
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 pt-1">
                        <div>
                          <label className="text-[11px] font-bold text-[#474741] block mb-1">
                            堂食立减金额 (¥):
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            placeholder="如: 3.00"
                            value={editDineInDiscount}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditDineInDiscount(val);
                              if (val && !editDineInDiscountTag) {
                                setEditDineInDiscountTag(`堂食立减¥${val}`);
                              }
                            }}
                            className="w-full p-2 bg-[#f9f9f7] border border-[#c8c7be] focus:border-[#000000] rounded-lg font-mono text-xs outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-[#474741] block mb-1">
                            展示标签文案:
                          </label>
                          <input
                            type="text"
                            placeholder="如: 堂食立减¥3"
                            value={editDineInDiscountTag}
                            onChange={(e) => setEditDineInDiscountTag(e.target.value)}
                            className="w-full p-2 bg-[#f9f9f7] border border-[#c8c7be] focus:border-[#000000] rounded-lg text-xs outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: 运营与限流风控规则 (Operational Dispatch & Risk Control Rules) */}
              {activeTab === 'operating_rules' && (
                <div className="space-y-4">
                  <div className="p-5 bg-[#ffffff] rounded-xl border border-[#e2e3e1] shadow-urban space-y-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#000000] text-white flex items-center justify-center font-bold">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#1a1c1b]">
                          流动餐车全渠道运营与出餐风控规则矩阵
                        </h4>
                        <p className="text-[11px] text-[#787770]">
                          配置外送调度、高峰出餐限流截断、库存预警沽清及核销防错机制
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      {/* Rule 1: Peak Throttle Limit */}
                      <div className="p-4 bg-[#f9f9f7] rounded-xl border border-[#e2e3e1] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#1a1c1b] flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-[#006d36]" />
                            <span>15分钟出餐峰值限流保护</span>
                          </span>
                          <span className="font-mono text-xs font-bold text-[#006d36]">
                            {peakThrottleLimit} 份/15m
                          </span>
                        </div>
                        <p className="text-[11px] text-[#787770]">
                          当15分钟内待烤队列达到此上限时，系统自动调增预计出餐时长并开启降速提示
                        </p>
                        <input
                          type="range"
                          min="10"
                          max="60"
                          step="5"
                          value={peakThrottleLimit}
                          onChange={(e) => setPeakThrottleLimit(Number(e.target.value))}
                          className="w-full accent-black cursor-pointer"
                        />
                      </div>

                      {/* Rule 2: Auto Stockout Threshold */}
                      <div className="p-4 bg-[#f9f9f7] rounded-xl border border-[#e2e3e1] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#1a1c1b] flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-[#ba1a1a]" />
                            <span>智能安全库存与自动沽清</span>
                          </span>
                          <span className="font-mono text-xs font-bold text-[#ba1a1a]">
                            ≤ {autoSoldOutThreshold} 份触发
                          </span>
                        </div>
                        <p className="text-[11px] text-[#787770]">
                          当餐车现场冷柜可用库存低于此阈值时，自动向全网各渠道广播沽清保护
                        </p>
                        <input
                          type="range"
                          min="0"
                          max="20"
                          step="1"
                          value={autoSoldOutThreshold}
                          onChange={(e) => setAutoSoldOutThreshold(Number(e.target.value))}
                          className="w-full accent-black cursor-pointer"
                        />
                      </div>

                      {/* Rule 3: Coupon & Discount Stacking Matrix */}
                      <div className="p-4 bg-[#f9f9f7] rounded-xl border border-[#e2e3e1] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#1a1c1b] flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5 text-[#1a1c1b]" />
                            <span>优惠券与渠道立减叠加同享</span>
                          </span>
                          <input
                            type="checkbox"
                            checked={couponStackingAllowed}
                            onChange={(e) => setCouponStackingAllowed(e.target.checked)}
                            className="w-4 h-4 accent-black cursor-pointer rounded"
                          />
                        </div>
                        <p className="text-[11px] text-[#787770]">
                          开启后，顾客在享受外卖/堂食单品立减的同时，仍可使用满减优惠券及黑卡折上折
                        </p>
                      </div>

                      {/* Rule 4: Rider Warm-box Verification */}
                      <div className="p-4 bg-[#f9f9f7] rounded-xl border border-[#e2e3e1] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#1a1c1b] flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-[#006d36]" />
                            <span>极速专送恒温箱扫码取餐</span>
                          </span>
                          <input
                            type="checkbox"
                            checked={riderBoxCodeRequired}
                            onChange={(e) => setRiderBoxCodeRequired(e.target.checked)}
                            className="w-4 h-4 accent-black cursor-pointer rounded"
                          />
                        </div>
                        <p className="text-[11px] text-[#787770]">
                          要求骑手必须扫描餐盒上的 69 码与车载保温箱定位码，彻底避免错拿与漏配
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: 69码与扫码枪 */}
              {activeTab === 'barcode' && (
                <div className="space-y-4">
                  <div className="p-5 bg-[#ffffff] rounded-xl border border-[#e2e3e1] shadow-urban space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#000000] text-white flex items-center justify-center font-bold">
                          <Barcode className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-[#1a1c1b]">
                            菜品条形码 / 商品 69 码绑定
                          </h4>
                          <p className="text-[11px] text-[#787770]">
                            支持任意标准 USB / 蓝牙无线扫码枪，前台与后厨秒级识别
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[#f4f4f2] text-[#006d36]">
                        即扫即录
                      </span>
                    </div>

                    <div className="p-4 bg-[#f9f9f7] rounded-xl border border-[#e2e3e1] space-y-3">
                      <label className="font-bold text-xs text-[#1a1c1b] block">
                        当前绑定的条码 / 69 码:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="例如: 6971234567890"
                          value={editBarcode}
                          onChange={(e) => setEditBarcode(e.target.value)}
                          className="flex-1 p-2.5 bg-white border border-[#c8c7be] focus:border-[#000000] rounded-lg text-sm font-mono font-bold text-[#1a1c1b] outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setIsListeningForBarcodeScan(true);
                            showToast('请使用硬件扫码枪对准条形码扫描，系统将自动录入...');
                          }}
                          className={`px-4 py-2.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                            isListeningForBarcodeScan
                              ? 'bg-[#ba1a1a] text-white animate-pulse'
                              : 'bg-[#000000] text-white hover:bg-neutral-800'
                          }`}
                        >
                          <Barcode className="w-3.5 h-3.5" />
                          <span>{isListeningForBarcodeScan ? '等待扫码中...' : '扫码枪录入'}</span>
                        </button>
                      </div>

                      {editBarcode && (
                        <div className="p-3 bg-white rounded-lg border border-[#e2e3e1] flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] text-[#787770] font-mono">
                              CODE-128 / EAN-13:
                            </span>
                            <span className="font-mono font-bold text-sm text-[#1a1c1b]">
                              {editBarcode}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(editBarcode);
                              showToast('已成功复制条形码至剪贴板！');
                            }}
                            className="text-xs text-[#006d36] hover:underline cursor-pointer font-bold"
                          >
                            复制条码
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 7: 规格变体与独立定价 */}
              {activeTab === 'variants' && (
                <div className="space-y-4">
                  <div className="p-5 bg-[#ffffff] rounded-xl border border-[#e2e3e1] shadow-urban space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#eeeeec] text-[#1a1c1b] flex items-center justify-center font-bold">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-[#1a1c1b]">
                            多规格变体与独立定价矩阵
                          </h4>
                          <p className="text-[11px] text-[#787770]">
                            为菜品配置份量大小（大份/标准/双拼）及各自独立的销售价与主图
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newVar: DishVariant = {
                            id: `var_${Date.now()}`,
                            name: `规格 ${editVariants.length + 1}`,
                            price: parseFloat(editPrice) || dish.price,
                            available: true
                          };
                          setEditVariants([...editVariants, newVar]);
                          showToast('已新增规格变体，请设置名称与独立定价');
                        }}
                        className="px-3 py-1.5 bg-[#000000] text-white rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-neutral-800 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>新增规格</span>
                      </button>
                    </div>

                    {editVariants.length === 0 ? (
                      <div className="p-8 text-center bg-[#f9f9f7] rounded-xl border border-dashed border-[#c8c7be] space-y-2">
                        <Layers className="w-8 h-8 text-[#787770] mx-auto opacity-50" />
                        <p className="text-xs text-[#787770]">
                          当前菜品为单一标准规格，点击上方按钮可扩展多规格变体矩阵
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {editVariants.map((variant, idx) => (
                          <div
                            key={variant.id || idx}
                            className="p-3 bg-[#f9f9f7] rounded-xl border border-[#e2e3e1] flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <span className="font-mono text-xs font-bold text-[#787770] w-6">
                                #{idx + 1}
                              </span>
                              <input
                                type="text"
                                value={variant.name}
                                onChange={(e) => {
                                  const updated = [...editVariants];
                                  updated[idx].name = e.target.value;
                                  setEditVariants(updated);
                                }}
                                placeholder="规格名称 如: 大份 / 双拼"
                                className="p-1.5 bg-white border border-[#c8c7be] focus:border-[#000000] rounded-lg text-xs flex-1 outline-none font-bold text-[#1a1c1b]"
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[#787770]">价格 ¥:</span>
                              <input
                                type="number"
                                step="0.5"
                                value={variant.price}
                                onChange={(e) => {
                                  const updated = [...editVariants];
                                  updated[idx].price = parseFloat(e.target.value) || 0;
                                  setEditVariants(updated);
                                }}
                                className="w-20 p-1.5 bg-white border border-[#c8c7be] focus:border-[#000000] rounded-lg text-xs font-mono font-bold text-[#1a1c1b] outline-none"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setEditVariants(editVariants.filter((_, i) => i !== idx));
                              }}
                              className="p-1.5 text-[#787770] hover:text-[#ba1a1a] rounded-lg hover:bg-white transition-colors cursor-pointer"
                              title="删除此规格"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 8: 前台即时预览说明 */}
              {activeTab === 'preview' && (
                <div className="p-5 bg-[#ffffff] rounded-xl border border-[#e2e3e1] shadow-urban space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#006d36]" />
                    <h4 className="font-bold text-sm text-[#1a1c1b]">前台实机双模联动预览中</h4>
                  </div>
                  <p className="text-xs text-[#787770] leading-relaxed">
                    右侧区域已常驻前台顾客机真实交互环境。您在左侧修改的任何单价、立减规则、辣度池、风味标签及出餐时间，均在右侧 100% 实时同步响应。
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setPreviewStyleMode('hud_card')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                        previewStyleMode === 'hud_card'
                          ? 'bg-[#000000] text-white border-[#000000] shadow-sm'
                          : 'bg-[#f9f9f7] text-[#1a1c1b] border-[#e2e3e1] hover:bg-[#f4f4f2]'
                      }`}
                    >
                      <span>单品卡片视图</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewStyleMode('spec_modal')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                        previewStyleMode === 'spec_modal'
                          ? 'bg-[#000000] text-white border-[#000000] shadow-sm'
                          : 'bg-[#f9f9f7] text-[#1a1c1b] border-[#e2e3e1] hover:bg-[#f4f4f2]'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>选规格弹窗视图 (食客端)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: URBAN RADAR LIVE CLIENT MOBILE SIMULATOR */}
          <div className="w-full lg:w-[420px] xl:w-[460px] flex flex-col shrink-0 bg-[#f9f9f7] overflow-hidden border-t lg:border-t-0 lg:border-l border-[#e2e3e1]">
            {/* Simulator Top Mode Bar */}
            <div className="px-4 py-2.5 bg-[#ffffff] border-b border-[#e2e3e1] flex items-center justify-between gap-2 shrink-0 flex-wrap">
              {/* Channel Selector */}
              <div className="flex items-center gap-1 bg-[#f4f4f2] p-0.5 rounded-xl border border-[#e2e3e1]">
                <button
                  type="button"
                  onClick={() => setRightPreviewChannel('delivery')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    rightPreviewChannel === 'delivery'
                      ? 'bg-[#000000] text-white shadow-sm'
                      : 'text-[#787770] hover:text-[#1a1c1b]'
                  }`}
                >
                  <Bike className="w-3.5 h-3.5" />
                  <span>外卖</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRightPreviewChannel('dine_in')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    rightPreviewChannel === 'dine_in'
                      ? 'bg-[#000000] text-white shadow-sm'
                      : 'text-[#787770] hover:text-[#1a1c1b]'
                  }`}
                >
                  <Utensils className="w-3.5 h-3.5" />
                  <span>堂食</span>
                </button>
              </div>

              {/* View Mode Toggle: 卡片 vs 选规格 */}
              <div className="flex items-center gap-1 bg-[#f4f4f2] p-0.5 rounded-xl border border-[#e2e3e1]">
                <button
                  type="button"
                  onClick={() => setPreviewStyleMode('hud_card')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    previewStyleMode === 'hud_card'
                      ? 'bg-[#000000] text-white shadow-sm'
                      : 'text-[#787770] hover:text-[#1a1c1b]'
                  }`}
                  title="查看菜品列表单品卡片样式"
                >
                  <span>单品卡片</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewStyleMode('spec_modal')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    previewStyleMode === 'spec_modal'
                      ? 'bg-[#000000] text-white shadow-sm'
                      : 'text-[#787770] hover:text-[#1a1c1b]'
                  }`}
                  title="查看食客端点击选规格时弹出的个性化定制界面"
                >
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>选规格预览</span>
                </button>
              </div>
            </div>

            {/* Live Mobile Card Simulator Screen */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 hide-scrollbar">
              {/* Toast simulated notification */}
              {previewToastMessage && (
                <div className="p-3 bg-[#e6f4ea] text-[#006d36] border border-[#a8dab5] rounded-xl text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                  <span className="flex items-center gap-1.5 min-w-0 truncate">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span className="truncate">{previewToastMessage}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewToastMessage(null)}
                    className="text-[#006d36] cursor-pointer shrink-0 ml-2"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* MODE A: HUD CARD VIEW */}
              {previewStyleMode === 'hud_card' && (
                <div className="bg-[#ffffff] rounded-2xl p-5 border border-[#e2e3e1] shadow-urban space-y-4">
                  {/* Hero Image Container */}
                  <div className="relative aspect-16/10 rounded-xl overflow-hidden bg-[#eeeeec] border border-[#e2e3e1]">
                    <img
                      src={currentVariant?.imageUrl || dish.imageUrl}
                      alt={dish.name}
                      className="w-full h-full object-cover"
                    />
                    {(currentVariant?.badgeText || editBadgeText) && (
                      <span className="absolute top-3 left-3 bg-[#000000] text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                        {currentVariant?.badgeText || editBadgeText}
                      </span>
                    )}
                    {currentDiscount > 0 && (
                      <span className="absolute top-3 right-3 bg-[#ba1a1a] text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                        {rightPreviewChannel === 'delivery'
                          ? editDeliveryDiscountTag || `立减 ¥${currentDiscount}`
                          : editDineInDiscountTag || `堂食立减 ¥${currentDiscount}`}
                      </span>
                    )}
                  </div>

                  {/* Dish Header Info */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[19px] font-bold text-[#1a1c1b] tracking-tight leading-tight flex items-center gap-1.5 flex-wrap">
                        <span>{dish.name}</span>
                        {currentVariant && (
                          <span className="text-xs font-bold bg-[#f4f4f2] text-[#1a1c1b] px-2 py-0.5 rounded-md border border-[#e2e3e1]">
                            {currentVariant.name}
                          </span>
                        )}
                      </h3>
                      <span className="text-xs font-bold text-[#006d36]">
                        {dish.available !== false ? '在售接单中' : '全网已沽清'}
                      </span>
                    </div>
                    {dish.enName && <p className="text-xs text-[#787770] font-mono">{dish.enName}</p>}
                  </div>

                  {/* SOP & Taste Meta Tag Strip */}
                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2.5 py-1 rounded-full bg-[#f4f4f2] text-[#1a1c1b] text-[11px] font-medium border border-[#e2e3e1] flex items-center gap-1">
                      <Flame className="w-3 h-3 text-[#ba1a1a]" />
                      <span>{editSpicinessLevel}</span>
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-[#f4f4f2] text-[#1a1c1b] text-[11px] font-medium border border-[#e2e3e1] flex items-center gap-1">
                      <ChefHat className="w-3 h-3 text-[#006d36]" />
                      <span>{editFlavor}</span>
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-[#f4f4f2] text-[#787770] text-[11px] font-mono border border-[#e2e3e1]">
                      ⏱️ {editPrepTime}
                    </span>
                  </div>

                  {/* Flavor Tags */}
                  {editFlavorTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {editFlavorTags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] bg-[#eeeeec] text-[#474741] px-2 py-0.5 rounded-full font-medium"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Variants Selector inside card */}
                  {editVariants.length > 0 && (
                    <div className="pt-3 border-t border-[#e2e3e1] space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-[#787770] uppercase tracking-wider block">
                          选择规格:
                        </label>
                        <button
                          type="button"
                          onClick={() => setPreviewStyleMode('spec_modal')}
                          className="text-[11px] text-[#006d36] hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                        >
                          <span>查看完整弹窗 ↗</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setRightActiveVariantIndex(-1)}
                          className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                            rightActiveVariantIndex === -1
                              ? 'border-[#000000] bg-[#000000] text-white font-bold'
                              : 'border-[#e2e3e1] bg-[#f9f9f7] text-[#1a1c1b]'
                          }`}
                        >
                          <div className="text-xs truncate">标准份</div>
                          <div className="text-[11px] font-mono opacity-90">
                            ¥{parseFloat(editPrice || '0').toFixed(2)}
                          </div>
                        </button>

                        {editVariants.map((v, i) => (
                          <button
                            key={v.id || i}
                            type="button"
                            onClick={() => setRightActiveVariantIndex(i)}
                            className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                              rightActiveVariantIndex === i
                                ? 'border-[#000000] bg-[#000000] text-white font-bold'
                                : 'border-[#e2e3e1] bg-[#f9f9f7] text-[#1a1c1b]'
                            }`}
                          >
                            <div className="text-xs truncate">{v.name}</div>
                            <div className="text-[11px] font-mono opacity-90">
                              ¥{v.price.toFixed(2)}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pricing & Primary Action Button */}
                  <div className="pt-3.5 border-t border-[#e2e3e1] flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs font-bold text-[#1a1c1b]">¥</span>
                        <span className="text-[22px] font-bold font-mono text-[#1a1c1b] tracking-tight leading-none">
                          {finalUnitPrice.toFixed(2)}
                        </span>
                        {editOriginalPrice && (
                          <span className="text-[11px] font-mono text-[#787770] line-through ml-1">
                            ¥{parseFloat(editOriginalPrice).toFixed(2)}
                          </span>
                        )}
                      </div>
                      {currentDiscount > 0 && (
                        <span className="text-[10px] text-[#006d36] font-bold block">
                          已享立减 ¥{currentDiscount.toFixed(2)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewStyleMode('spec_modal')}
                        className="px-4 py-2.5 bg-[#000000] text-[#ffffff] rounded-xl font-bold text-xs hover:bg-neutral-800 transition-colors cursor-pointer shadow-sm active:scale-95 flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>{editVariants.length > 0 ? '选规格' : '个性化定制'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* MODE B: URBAN RADAR SPEC MODAL (选规格与个性化定制弹窗预览) */}
              {previewStyleMode === 'spec_modal' && (
                <div className="bg-[#ffffff] rounded-2xl border border-[#e2e3e1] shadow-urban overflow-hidden flex flex-col animate-in fade-in duration-200">
                  {/* Simulated Mobile Status Bar */}
                  <div className="bg-[#1a1c1b] text-[#c8c7be] px-4 py-1.5 text-[10px] flex items-center justify-between font-mono select-none">
                    <span className="font-bold">09:41</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] bg-[#006d36] text-white px-1.5 py-0.2 rounded font-sans font-bold">
                        5G GPS 极速专送
                      </span>
                      <div className="w-4 h-2 border border-[#787770] rounded-[2px] relative p-[1px]">
                        <div className="bg-white h-full w-3/4 rounded-[1px]" />
                      </div>
                    </div>
                  </div>

                  {/* Modal Title Bar */}
                  <div className="px-4 py-2.5 bg-[#f9f9f7] border-b border-[#e2e3e1] flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-[#006d36] shrink-0" />
                      <span className="font-bold text-xs text-[#1a1c1b] truncate">
                        选规格与个性化定制
                      </span>
                      <span
                        className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                          rightPreviewChannel === 'delivery'
                            ? 'bg-[#e6f4ea] text-[#006d36] border border-[#a8dab5]'
                            : 'bg-[#f4f4f2] text-[#1a1c1b] border border-[#e2e3e1]'
                        }`}
                      >
                        {rightPreviewChannel === 'delivery' ? '🛵 外卖专送' : '🍽️ 餐车堂食'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPreviewStyleMode('hud_card')}
                      className="text-[11px] font-bold text-[#787770] hover:text-[#000000] px-2 py-1 rounded-lg hover:bg-[#eeeeec] transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                      title="切换回菜品卡片样式"
                    >
                      <span>切回卡片</span>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Modal Scrollable Body */}
                  <div className="p-4 space-y-4 max-h-[520px] overflow-y-auto hide-scrollbar">
                    {/* 1. Hero Product Showcase with Variant Image & Dynamic Price */}
                    <div className="flex gap-3 items-start pb-3.5 border-b border-[#e2e3e1]">
                      {/* Product Photo */}
                      <div className="relative w-22 h-22 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 border border-[#e2e3e1] bg-[#eeeeec] group">
                        <img
                          src={currentVariant?.imageUrl || dish.imageUrl}
                          alt={dish.name}
                          className="w-full h-full object-cover"
                        />
                        {(currentVariant?.badgeText || editBadgeText) && (
                          <span className="absolute top-1 left-1 bg-[#000000] text-white text-[8.5px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                            {currentVariant?.badgeText || editBadgeText}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            onPreviewZoom &&
                            onPreviewZoom({
                              ...dish,
                              imageUrl: currentVariant?.imageUrl || dish.imageUrl,
                              name: `${dish.name}${currentVariant ? ` - ${currentVariant.name}` : ''}`
                            })
                          }
                          className="absolute bottom-1 right-1 p-1 bg-black/60 text-white rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center cursor-pointer"
                          title="查看高清原图"
                        >
                          <ZoomIn className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Info & Price Showcase */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div>
                          <h4 className="font-bold text-sm text-[#1a1c1b] leading-tight flex items-center gap-1.5 flex-wrap">
                            <span>{dish.name}</span>
                            {currentVariant && (
                              <span className="text-[10px] font-bold bg-[#f4f4f2] text-[#1a1c1b] px-1.5 py-0.5 rounded border border-[#e2e3e1]">
                                {currentVariant.name}
                              </span>
                            )}
                          </h4>
                          {dish.enName && (
                            <p className="text-[10px] text-[#787770] font-mono truncate">{dish.enName}</p>
                          )}
                        </div>

                        {/* Pricing & Discounts */}
                        <div className="flex items-baseline gap-1 flex-wrap">
                          <span className="text-xs font-bold text-[#1a1c1b]">¥</span>
                          <span className="text-lg font-bold font-mono text-[#1a1c1b] tracking-tight">
                            {finalUnitPrice.toFixed(2)}
                          </span>
                          {editOriginalPrice && (
                            <span className="text-[10.5px] text-[#787770] line-through font-mono">
                              ¥{parseFloat(editOriginalPrice).toFixed(2)}
                            </span>
                          )}
                          {currentDiscount > 0 && (
                            <span className="text-[9.5px] font-bold text-[#ba1a1a] bg-[#ffdad6] border border-[#ffb4ab] px-1.5 py-0.2 rounded-full">
                              {rightPreviewChannel === 'delivery'
                                ? editDeliveryDiscountTag || `立减 ¥${currentDiscount}`
                                : editDineInDiscountTag || `堂食立减 ¥${currentDiscount}`}
                            </span>
                          )}
                        </div>

                        {/* Dynamic Summary */}
                        <div className="text-[10.5px] text-[#787770] flex items-center gap-1 flex-wrap">
                          <span>已选:</span>
                          <span className="text-[#1a1c1b] font-bold">
                            {currentVariant ? currentVariant.name : '标准默认份'}
                          </span>
                          <span>·</span>
                          <span className="text-[#1a1c1b] font-bold">{previewSelectedSpice}</span>
                          <span>·</span>
                          <span className="text-[#1a1c1b] font-bold">{previewSelectedFlavor}</span>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-[#787770] pt-0.5">
                          <span className="flex items-center gap-0.5 text-[#006d36] font-bold">
                            <CheckCircle2 className="w-2.5 h-2.5" /> 现点现烤
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" /> {editPrepTime}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Variant Thumbnail Strip (if variants have photos) */}
                    {editVariants.some((v) => v.imageUrl) && (
                      <div className="space-y-1">
                        <div className="text-[10.5px] font-bold text-[#1a1c1b] flex items-center justify-between">
                          <span>📸 独立规格实拍效果:</span>
                          <span className="text-[9.5px] text-[#787770]">点击缩略图切换</span>
                        </div>
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
                          <button
                            type="button"
                            onClick={() => setRightActiveVariantIndex(-1)}
                            className={`shrink-0 w-13 h-13 rounded-xl border p-0.5 cursor-pointer transition-all text-center ${
                              rightActiveVariantIndex === -1
                                ? 'border-[#000000] bg-[#f4f4f2] ring-2 ring-black/10'
                                : 'border-[#e2e3e1] bg-[#ffffff] hover:border-[#c8c7be]'
                            }`}
                          >
                            <img src={dish.imageUrl} alt="标准" className="w-full h-7 object-cover rounded-lg" />
                            <div className="text-[8.5px] font-bold truncate mt-0.5 text-[#1a1c1b]">标准份</div>
                          </button>

                          {editVariants.map((v, vIdx) => (
                            <button
                              key={v.id || vIdx}
                              type="button"
                              onClick={() => setRightActiveVariantIndex(vIdx)}
                              className={`shrink-0 w-13 h-13 rounded-xl border p-0.5 cursor-pointer transition-all text-center ${
                                rightActiveVariantIndex === vIdx
                                  ? 'border-[#000000] bg-[#f4f4f2] ring-2 ring-black/10'
                                  : 'border-[#e2e3e1] bg-[#ffffff] hover:border-[#c8c7be]'
                              }`}
                            >
                              <img
                                src={v.imageUrl || dish.imageUrl}
                                alt={v.name}
                                className="w-full h-7 object-cover rounded-lg"
                              />
                              <div className="text-[8.5px] font-bold truncate mt-0.5 text-[#1a1c1b]">{v.name}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 2. SPECIFICATION SELECTION (份量与规格选择) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#1a1c1b] flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-[#006d36]" />
                          <span>份量与规格选择</span>
                          <span className="text-[10px] text-[#787770] font-normal">(必选一项)</span>
                        </span>
                        <span className="text-[10px] text-[#787770] font-mono font-bold">
                          共 {editVariants.length + 1} 种规格
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        {/* Standard Base Variant */}
                        <button
                          type="button"
                          onClick={() => setRightActiveVariantIndex(-1)}
                          className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                            rightActiveVariantIndex === -1
                              ? 'border-[#000000] bg-[#000000] text-white shadow-xs font-bold'
                              : 'border-[#e2e3e1] bg-[#ffffff] text-[#1a1c1b] hover:border-[#c8c7be]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="text-xs truncate">标准默认份</span>
                            {rightActiveVariantIndex === -1 && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                          </div>
                          <div className="mt-1 flex items-baseline justify-between text-[10.5px] font-mono">
                            <span className={rightActiveVariantIndex === -1 ? 'text-neutral-300' : 'text-[#787770]'}>
                              常规单份
                            </span>
                            <span>¥{parseFloat(editPrice || '0').toFixed(2)}</span>
                          </div>
                        </button>

                        {/* Custom Variants */}
                        {editVariants.map((v, vIdx) => {
                          const isSel = rightActiveVariantIndex === vIdx;
                          return (
                            <button
                              key={v.id || vIdx}
                              type="button"
                              onClick={() => setRightActiveVariantIndex(vIdx)}
                              className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                                isSel
                                  ? 'border-[#000000] bg-[#000000] text-white shadow-xs font-bold'
                                  : 'border-[#e2e3e1] bg-[#ffffff] text-[#1a1c1b] hover:border-[#c8c7be]'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <span className="text-xs truncate">{v.name}</span>
                                {isSel && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                              </div>
                              <div className="mt-1 flex items-baseline justify-between text-[10.5px] font-mono">
                                <span className={isSel ? 'text-neutral-300' : 'text-[#787770]'}>
                                  {v.badgeText ? v.badgeText : '升级款'}
                                </span>
                                <span>¥{v.price.toFixed(2)}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {editVariants.length === 0 && (
                        <div className="p-2 bg-[#f4f4f2] rounded-xl border border-dashed border-[#c8c7be] flex items-center justify-between text-[10.5px]">
                          <span className="text-[#787770]">尚未添加副规格（如大份/双拼/升级套餐）</span>
                          <button
                            type="button"
                            onClick={() => setActiveTab('variants')}
                            className="text-[#006d36] font-bold hover:underline cursor-pointer"
                          >
                            + 前往配置
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 3. SPICINESS CUSTOMIZATION (辣度定制) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#1a1c1b] flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-[#ba1a1a]" />
                          <span>辣度偏好定制</span>
                        </span>
                        <span className="text-[10px] font-mono font-bold text-[#787770]">
                          当前: {previewSelectedSpice}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {editSpicinessOptions.map((opt) => {
                          const isSel = previewSelectedSpice === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                setPreviewSelectedSpice(opt);
                                setEditSpicinessLevel(opt);
                              }}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center justify-between ${
                                isSel
                                  ? 'bg-[#000000] text-white border-[#000000] shadow-xs'
                                  : 'bg-[#ffffff] text-[#1a1c1b] border-[#e2e3e1] hover:bg-[#f4f4f2]'
                              }`}
                            >
                              <span className="truncate">{opt}</span>
                              {isSel && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-1" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 4. FLAVOR CUSTOMIZATION (风味定制) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#1a1c1b] flex items-center gap-1.5">
                          <ChefHat className="w-3.5 h-3.5 text-[#006d36]" />
                          <span>酱料与口味定制</span>
                        </span>
                        <span className="text-[10px] font-mono font-bold text-[#787770]">
                          当前: {previewSelectedFlavor}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        {editFlavorOptions.map((fOpt) => {
                          const isSel = previewSelectedFlavor === fOpt;
                          return (
                            <button
                              key={fOpt}
                              type="button"
                              onClick={() => {
                                setPreviewSelectedFlavor(fOpt);
                                setEditFlavor(fOpt);
                              }}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center justify-between ${
                                isSel
                                  ? 'bg-[#000000] text-white border-[#000000] shadow-xs'
                                  : 'bg-[#ffffff] text-[#1a1c1b] border-[#e2e3e1] hover:bg-[#f4f4f2]'
                              }`}
                            >
                              <span className="truncate">{fOpt}</span>
                              {isSel && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-1" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 5. CRAFT & FLAVOR TAGS */}
                    <div className="p-2.5 bg-[#f9f9f7] rounded-xl border border-[#e2e3e1] space-y-1 text-[10.5px]">
                      <div className="flex items-center justify-between text-[#1a1c1b] font-bold">
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3 text-[#006d36]" />
                          <span>工艺与出品标准:</span>
                        </span>
                        <span className="text-[#006d36]">{editCookingStyle}</span>
                      </div>
                      {editCraftStandardNote && (
                        <p className="text-[#787770] leading-relaxed pl-3.5">
                          {editCraftStandardNote}
                        </p>
                      )}
                      {editFlavorTags.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap pt-0.5 pl-3.5">
                          {editFlavorTags.map((tag) => (
                            <span
                              key={tag}
                              className="bg-[#f4f4f2] text-[#474741] px-1.5 py-0.2 rounded-full text-[9.5px] font-medium border border-[#e2e3e1]"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 6. QUANTITY STEPPER (选购数量步进器) */}
                    <div className="pt-2.5 border-t border-[#e2e3e1] flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-[#1a1c1b]">选购数量</div>
                        <div className="text-[10px] text-[#787770]">
                          {minOrderThreshold > 1 ? `起购限制: ${minOrderThreshold}份` : '单笔订购上限 99 份'}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 bg-[#f4f4f2] p-1 rounded-xl border border-[#e2e3e1]">
                        <button
                          type="button"
                          onClick={() => setPreviewQuantity((prev) => Math.max(minOrderThreshold || 1, prev - 1))}
                          className="w-6 h-6 rounded-lg bg-white hover:bg-neutral-200 flex items-center justify-center font-bold text-[#1a1c1b] shadow-xs cursor-pointer active:scale-95 transition-all"
                          title="减少"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center font-mono font-bold text-xs text-[#1a1c1b]">
                          {previewQuantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPreviewQuantity((prev) => Math.min(99, prev + 1))}
                          className="w-6 h-6 rounded-lg bg-white hover:bg-neutral-200 flex items-center justify-center font-bold text-[#1a1c1b] shadow-xs cursor-pointer active:scale-95 transition-all"
                          title="增加"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* STICKY BOTTOM ACTION BAR */}
                  <div className="p-3.5 bg-[#f9f9f7] border-t border-[#e2e3e1] flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs text-[#787770] font-bold">合计:</span>
                        <span className="text-xs font-bold text-[#1a1c1b]">¥</span>
                        <span className="text-lg font-bold font-mono text-[#1a1c1b] tracking-tight">
                          {finalTotalPrice.toFixed(2)}
                        </span>
                        {editOriginalPrice && (
                          <span className="text-[10px] text-[#787770] line-through font-mono">
                            ¥{(parseFloat(editOriginalPrice) * previewQuantity).toFixed(2)}
                          </span>
                        )}
                      </div>
                      <div className="text-[9.5px] text-[#006d36] font-bold truncate">
                        {currentDiscount > 0 ? (
                          <span>
                            已享{rightPreviewChannel === 'delivery' ? '外卖' : '堂食'}立减 ¥{(currentDiscount * previewQuantity).toFixed(2)}
                          </span>
                        ) : (
                          <span>含选定规格与调味定制</span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const specName = currentVariant ? currentVariant.name : '标准默认份';
                        setPreviewToastMessage(`✨ 模拟加购成功：【${dish.name} (${specName})】× ${previewQuantity} 份已加入${rightPreviewChannel === 'delivery' ? '外卖专送' : '堂食现场'}点餐车！`);
                        setTimeout(() => setPreviewToastMessage(null), 3000);
                      }}
                      className="px-4 py-2.5 bg-[#000000] hover:bg-neutral-800 text-white rounded-xl font-bold text-xs shadow-sm cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>
                        {rightPreviewChannel === 'delivery'
                          ? `加入外卖单 (${editPrepTime})`
                          : `确认堂食加点`}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Real-time Parameter Mapping Inspector */}
              <div className="p-4 bg-[#ffffff] rounded-2xl border border-[#e2e3e1] shadow-urban text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#1a1c1b] flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#006d36]" />
                    <span>参数联动与风控状态</span>
                  </span>
                  <span className="text-[11px] font-bold text-[#006d36] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#006d36] animate-pulse" />
                    即时同步生效
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 bg-[#f9f9f7] rounded-lg border border-[#e2e3e1]">
                    <span className="text-[#787770] block">基准单价:</span>
                    <span className="font-bold font-mono text-[#1a1c1b]">
                      ¥{parseFloat(editPrice || '0').toFixed(2)}
                    </span>
                  </div>
                  <div className="p-2 bg-[#f9f9f7] rounded-lg border border-[#e2e3e1]">
                    <span className="text-[#787770] block">69商品条码:</span>
                    <span className="font-mono text-[#1a1c1b] truncate block font-semibold">
                      {editBarcode || '未录入'}
                    </span>
                  </div>
                  <div className="p-2 bg-[#f9f9f7] rounded-lg border border-[#e2e3e1]">
                    <span className="text-[#787770] block">外卖实收:</span>
                    <span className="font-bold font-mono text-[#006d36]">
                      ¥{Math.max(0, parseFloat(editPrice || '0') - (parseFloat(editDeliveryDiscount) || 0)).toFixed(2)}
                    </span>
                  </div>
                  <div className="p-2 bg-[#f9f9f7] rounded-lg border border-[#e2e3e1]">
                    <span className="text-[#787770] block">堂食实收:</span>
                    <span className="font-bold font-mono text-[#1a1c1b]">
                      ¥{Math.max(0, parseFloat(editPrice || '0') - (parseFloat(editDineInDiscount) || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="pt-1 text-[10.5px] text-[#787770]">
                  💡 提示: 所有参数修改保存后，均即刻通过 5G RTK 同步至移动餐车车机与食客端。
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER - Urban Radar Clean High-Contrast Action Bar */}
        <div className="px-6 py-4 bg-[#ffffff] border-t border-[#e2e3e1] flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-[#787770]">
            修改后餐车前台、KDS后厨打印及移动端将即刻应用新参数与运营规则。
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-[#f4f4f2] text-[#1a1c1b] hover:bg-[#eeeeec] border border-[#e2e3e1] rounded-xl font-bold text-xs cursor-pointer transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 bg-[#000000] text-white hover:bg-neutral-800 rounded-xl font-bold text-xs cursor-pointer transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>保存并同步至前台</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
