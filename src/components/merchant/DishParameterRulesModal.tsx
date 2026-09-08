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
  Printer,
  Crown,
  Lock
} from 'lucide-react';
import {
  DishItem,
  DishVariant,
  DishOptionGroup,
  DishOptionChoice,
  FieldSelectorMediaItem
} from '../../types';
import { globalScannerEngine } from '../../utils/barcodeScannerEngine';
import { globalFranchiseEngine } from '../../utils/franchiseTenantEngine';
import { DishPriceCalculator } from '../DishPriceCalculator';
import { FlavorTagSelector } from './FlavorTagSelector';
import {
  SPICINESS_PRESETS,
  FLAVOR_PRESETS,
  COOKING_STYLE_PRESETS
} from './MerchantMenuChannel';
import {
  generateArtisanSvgBlueprint,
  convertPhotoToBlueprintCanvas,
  PRESET_SELECTOR_MEDIA_BANK,
  resolveVariantBlueprint
} from '../../utils/autoBlueprintEngine';

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
    | 'operating_rules'
    | 'selector_media';
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
    | 'selector_media'
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

  // Field Selector Media Map & Option Groups (字段选择器图纸与线稿管理)
  const [editFieldSelectorMediaMap, setEditFieldSelectorMediaMap] = useState<Record<string, FieldSelectorMediaItem>>(
    dish.fieldSelectorMediaMap ? JSON.parse(JSON.stringify(dish.fieldSelectorMediaMap)) : {}
  );
  const [editOptionGroups, setEditOptionGroups] = useState<DishOptionGroup[]>(
    dish.optionGroups ? JSON.parse(JSON.stringify(dish.optionGroups)) : []
  );
  const [selectorCategoryFilter, setSelectorCategoryFilter] = useState<'all' | 'variant' | 'flavor' | 'option' | 'spiciness'>('all');
  const [activeMediaEditingKey, setActiveMediaEditingKey] = useState<string | null>(null);

  // Enhanced Operational Rules States (全渠道运营与风控规则参数)
  const [minOrderThreshold, setMinOrderThreshold] = useState<number>(0);
  const [peakThrottleLimit, setPeakThrottleLimit] = useState<number>(30); // 15分钟最大制作单数
  const [autoSoldOutThreshold, setAutoSoldOutThreshold] = useState<number>(5); // 安全库存触发自动沽清
  const [couponStackingAllowed, setCouponStackingAllowed] = useState<boolean>(true); // 是否允许与满减券叠加
  const [riderBoxCodeRequired, setRiderBoxCodeRequired] = useState<boolean>(true); // 是否强制骑手扫箱码防串单
  const [prepBufferWindow, setPrepBufferWindow] = useState<number>(3); // 高峰备餐延时缓冲（分钟）
  const [nightCutoffEnabled, setNightCutoffEnabled] = useState<boolean>(true); // 晚市定时自动下架
  const [nightCutoffTime, setNightCutoffTime] = useState<string>('21:30'); // 晚市下架截断时间
  const [dailyQuotaEnabled, setDailyQuotaEnabled] = useState<boolean>(false); // 每日限量配额开关
  const [dailyQuota, setDailyQuota] = useState<number>(50); // 每日供应配额上限
  const [channelDeliveryEnabled, setChannelDeliveryEnabled] = useState<boolean>(dish.available !== false); // 外卖供售开关
  const [channelDineInEnabled, setChannelDineInEnabled] = useState<boolean>(dish.available !== false); // 堂食供售开关
  const [channelPickupEnabled, setChannelPickupEnabled] = useState<boolean>(dish.available !== false); // 自提供售开关
  const [autoSubstituteEnabled, setAutoSubstituteEnabled] = useState<boolean>(true); // 缺货自动平替推荐
  const [stationFuseEnabled, setStationFuseEnabled] = useState<boolean>(true); // 烤台过载排队熔断延时
  const [packagingFee, setPackagingFee] = useState<string>('1.50'); // 打包餐盒费

  // Right Preview Simulation States
  const [rightPreviewChannel, setRightPreviewChannel] = useState<'delivery' | 'dine_in'>('delivery');
  const [rightActiveVariantIndex, setRightActiveVariantIndex] = useState<number>(-1);
  const [previewStyleMode, setPreviewStyleMode] = useState<'hud_card' | 'spec_modal'>('hud_card');
  const [previewBlueprintMode, setPreviewBlueprintMode] = useState<'photo' | 'blueprint'>('photo');
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

    // Franchise Price Guard Check
    const val = globalFranchiseEngine.validateDishPriceUpdate(dish.id, dish.name, p, dish.price);
    if (!val.allowed) {
      showToast(val.reason || '改价失败：超出总部价格管控合规红线！');
      return;
    }

    const updated: DishItem = {
      ...dish,
      variants: editVariants && editVariants.length > 0 ? editVariants : undefined,
      fieldSelectorMediaMap: editFieldSelectorMediaMap,
      optionGroups: editOptionGroups && editOptionGroups.length > 0 ? editOptionGroups : undefined,
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
      barcode: editBarcode.trim() || undefined,
      available: channelDeliveryEnabled || channelDineInEnabled || channelPickupEnabled
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
        className="bg-[#ffffff] w-full max-w-5xl xl:max-w-6xl 2xl:max-w-[1260px] rounded-none border border-[#e2e3e1] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] font-sans text-[#1a1c1b]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER - Urban Radar Minimalist Luxury Styling */}
        <div className="px-6 py-4 bg-[#f9f9f7] border-b border-[#e2e3e1] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Dish Thumbnail */}
            <div
              onClick={() => onPreviewZoom && onPreviewZoom(dish)}
              className="relative w-11 h-11 rounded-none overflow-hidden border border-[#c8c7be] shrink-0 group cursor-pointer bg-[#eeeeec]"
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
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-none bg-[#e6f4ea] text-[#006d36] border border-[#a8dab5] shrink-0">
                  {dish.available !== false ? '在售生效中' : '全网沽清中'}
                </span>
                {dish.badgeText && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-none bg-[#eeeeec] text-[#474741] shrink-0">
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
            <div className="hidden lg:flex items-center gap-2 text-[12px] text-[#006d36] bg-[#e6f4ea] px-3 py-1 rounded-none font-medium">
              <span className="w-2 h-2 rounded-none bg-[#006d36] animate-pulse" />
              <span>左侧参数调节 · 右侧真机实时映射</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-none flex items-center justify-center text-[#787770] hover:text-[#1a1c1b] hover:bg-[#eeeeec] transition-colors cursor-pointer"
              title="关闭弹窗"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Franchise HQ Lock Banner */}
        {(() => {
          const franchisePolicy = globalFranchiseEngine.getPolicy(dish.id);
          const franchiseCtx = globalFranchiseEngine.getContext();
          if (!franchisePolicy?.isHqLocked) return null;

          return (
            <div className="px-6 py-2 bg-amber-50 border-b border-amber-300 flex items-center justify-between text-xs text-amber-950 shrink-0">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-700 shrink-0" />
                <div>
                  <span className="font-bold">👑 总部核心爆品强锁定 (HQ Locked)</span>: {franchisePolicy.lockedReason}
                  <span className="text-amber-800 ml-2">
                    全国统一定价: <strong>¥{franchisePolicy.hqBasePrice.toFixed(2)}</strong> |{' '}
                    {franchisePolicy.allowFranchiseePriceOverride
                      ? ` 允许加盟商微调区间: ¥${franchisePolicy.allowedMinPrice} ~ ¥${franchisePolicy.allowedMaxPrice}`
                      : ' 严格禁止加盟商擅改售价'}
                  </span>
                </div>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 bg-amber-200 text-amber-900 border border-amber-400 font-bold shrink-0 ml-2">
                {franchiseCtx.isHqUser ? 'HQ 超管视角 (可调控)' : '加盟商只读受控'}
              </span>
            </div>
          );
        })()}

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
                  id: 'selector_media',
                  label: '字段选择器图纸与线稿 SELECTOR MEDIA',
                  icon: Camera,
                  highlight: true
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
                      if (tab.id === 'variants' || tab.id === 'selector_media') {
                        setPreviewStyleMode('spec_modal');
                      }
                    }}
                    className={`px-3 py-2 text-xs font-bold rounded-none transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap -mb-[1px] ${
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
                      <span className="text-[10px] bg-[#eeeeec] text-[#1a1c1b] px-1.5 py-0.2 rounded-none font-mono font-semibold">
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
                  <div className="p-5 bg-[#ffffff] rounded-none border border-[#e2e3e1] shadow-none space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-none bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center font-bold">
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
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-none bg-[#f4f4f2] text-[#1a1c1b]">
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
                            className={`p-3 rounded-none text-xs font-bold border text-left transition-all cursor-pointer flex items-center justify-between ${
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
                            className="bg-[#f4f4f2] text-[#1a1c1b] border border-[#e2e3e1] px-2.5 py-1 rounded-none text-[11px] flex items-center gap-1.5 font-medium"
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
                          className="p-2 bg-[#f9f9f7] border border-[#c8c7be] focus:border-[#000000] rounded-none text-xs flex-1 outline-none transition-colors"
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
                          className="px-3.5 py-2 bg-[#000000] text-white rounded-none text-xs font-bold cursor-pointer hover:bg-neutral-800 transition-colors"
                        >
                          添加
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Flavor Style Card */}
                  <div className="p-5 bg-[#ffffff] rounded-none border border-[#e2e3e1] shadow-none space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-none bg-[#eeeeec] text-[#1a1c1b] flex items-center justify-center font-bold">
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
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-none bg-[#f4f4f2] text-[#1a1c1b]">
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
                            className={`p-3 rounded-none text-xs font-bold border text-left transition-all cursor-pointer flex items-center justify-between ${
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
                            className="bg-[#f4f4f2] text-[#1a1c1b] border border-[#e2e3e1] px-2.5 py-1 rounded-none text-[11px] flex items-center gap-1.5 font-medium"
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
                          className="p-2 bg-[#f9f9f7] border border-[#c8c7be] focus:border-[#000000] rounded-none text-xs flex-1 outline-none transition-colors"
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
                          className="px-3.5 py-2 bg-[#000000] text-white rounded-none text-xs font-bold cursor-pointer hover:bg-neutral-800 transition-colors"
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
                  <div className="p-5 bg-[#ffffff] rounded-none border border-[#e2e3e1] shadow-none">
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
                  <div className="p-5 bg-[#ffffff] rounded-none border border-[#e2e3e1] shadow-none space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-none bg-[#e6f4ea] text-[#006d36] flex items-center justify-center font-bold">
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
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-none bg-[#f4f4f2] text-[#1a1c1b]">
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
                            className={`p-3 rounded-none text-xs font-bold border text-left transition-all cursor-pointer flex items-center justify-between ${
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
                  <div className="p-5 bg-[#ffffff] rounded-none border border-[#e2e3e1] shadow-none space-y-4">
                    <div>
                      <label className="font-bold text-xs text-[#1a1c1b] block mb-1.5">
                        工艺 SOP 规范要点与主厨建议 (展示给食客及前台出餐核验):
                      </label>
                      <textarea
                        rows={3}
                        value={editCraftStandardNote}
                        onChange={(e) => setEditCraftStandardNote(e.target.value)}
                        placeholder="如: 选用900℃高温果木炭慢烘烤制，外皮焦香内里肉汁丰沛，撒以秘制椒盐。"
                        className="w-full p-3 bg-[#f9f9f7] border border-[#c8c7be] focus:border-[#000000] rounded-none text-xs outline-none transition-colors leading-relaxed"
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
                          className="w-full p-2.5 bg-[#f9f9f7] border border-[#c8c7be] focus:border-[#000000] rounded-none text-xs outline-none font-mono"
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
                          className="w-full p-2.5 bg-[#f9f9f7] border border-[#c8c7be] focus:border-[#000000] rounded-none text-xs outline-none"
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
                  <div className="p-5 bg-[#ffffff] rounded-none border border-[#e2e3e1] shadow-none space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-none bg-[#eeeeec] text-[#1a1c1b] flex items-center justify-center font-bold">
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
                      <div className="p-3 bg-[#f9f9f7] rounded-none border border-[#e2e3e1]">
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
                            className="w-full pl-7 pr-3 py-2 bg-white border border-[#c8c7be] focus:border-[#000000] rounded-none text-sm font-mono font-bold text-[#1a1c1b] outline-none"
                          />
                        </div>
                      </div>

                      <div className="p-3 bg-[#f9f9f7] rounded-none border border-[#e2e3e1]">
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
                            className="w-full pl-7 pr-3 py-2 bg-white border border-[#c8c7be] focus:border-[#000000] rounded-none text-sm font-mono text-[#787770] outline-none"
                          />
                        </div>
                      </div>

                      <div className="p-3 bg-[#f9f9f7] rounded-none border border-[#e2e3e1]">
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
                            className="w-full pl-7 pr-3 py-2 bg-white border border-[#c8c7be] focus:border-[#000000] rounded-none text-sm font-mono text-[#787770] outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Channel-Specific Discount Rules */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Delivery Discount Rule */}
                    <div className="p-5 bg-[#ffffff] rounded-none border border-[#e2e3e1] shadow-none space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-none bg-[#e6f4ea] text-[#006d36] flex items-center justify-center font-bold">
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
                            className="text-[10px] px-2 py-0.5 bg-[#f4f4f2] text-[#1a1c1b] rounded-none border border-[#c8c7be] hover:bg-[#eeeeec] cursor-pointer font-bold"
                          >
                            +¥5
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditDeliveryDiscount('');
                              setEditDeliveryDiscountTag('');
                            }}
                            className="text-[10px] px-2 py-0.5 bg-white text-[#787770] rounded-none border border-[#c8c7be] hover:text-[#ba1a1a] cursor-pointer"
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
                            className="w-full p-2 bg-[#f9f9f7] border border-[#c8c7be] focus:border-[#000000] rounded-none font-mono text-xs outline-none"
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
                            className="w-full p-2 bg-[#f9f9f7] border border-[#c8c7be] focus:border-[#000000] rounded-none text-xs outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Dine-In Discount Rule */}
                    <div className="p-5 bg-[#ffffff] rounded-none border border-[#e2e3e1] shadow-none space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-none bg-[#eeeeec] text-[#1a1c1b] flex items-center justify-center font-bold">
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
                            className="text-[10px] px-2 py-0.5 bg-[#f4f4f2] text-[#1a1c1b] rounded-none border border-[#c8c7be] hover:bg-[#eeeeec] cursor-pointer font-bold"
                          >
                            +¥3
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditDineInDiscount('');
                              setEditDineInDiscountTag('');
                            }}
                            className="text-[10px] px-2 py-0.5 bg-white text-[#787770] rounded-none border border-[#c8c7be] hover:text-[#ba1a1a] cursor-pointer"
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
                            className="w-full p-2 bg-[#f9f9f7] border border-[#c8c7be] focus:border-[#000000] rounded-none font-mono text-xs outline-none"
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
                            className="w-full p-2 bg-[#f9f9f7] border border-[#c8c7be] focus:border-[#000000] rounded-none text-xs outline-none"
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
                  <div className="p-5 bg-[#ffffff] rounded-none border border-[#e2e3e1] shadow-none space-y-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-none bg-[#000000] text-white flex items-center justify-center font-bold">
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

                    {/* Channel Availability Switches Matrix */}
                    <div className="p-4 bg-[#f9f9f7] rounded-none border border-[#D3D1CB] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-[#1A1A17] flex items-center gap-1.5 font-mono">
                          <Sliders className="w-3.5 h-3.5 text-neutral-700" />
                          <span>全渠道实时供售通断矩阵 (CHANNEL AVAILABILITY)</span>
                        </span>
                        <span className="text-[11px] font-mono text-neutral-500">
                          三端独立控制 · 毫秒级广播生效
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 font-mono">
                        <button
                          type="button"
                          onClick={() => setChannelDeliveryEnabled(!channelDeliveryEnabled)}
                          className={`p-3 border text-center rounded-none cursor-pointer transition-colors ${
                            channelDeliveryEnabled
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                              : 'border-[#BA1A1A] bg-red-50 text-[#BA1A1A]'
                          }`}
                        >
                          <div className="font-bold text-xs">外卖专送</div>
                          <div className="text-[11px] mt-1 flex items-center justify-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-none ${channelDeliveryEnabled ? 'bg-emerald-600' : 'bg-[#BA1A1A]'}`} />
                            {channelDeliveryEnabled ? '在售正常' : '已沽清停售'}
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setChannelDineInEnabled(!channelDineInEnabled)}
                          className={`p-3 border text-center rounded-none cursor-pointer transition-colors ${
                            channelDineInEnabled
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                              : 'border-[#BA1A1A] bg-red-50 text-[#BA1A1A]'
                          }`}
                        >
                          <div className="font-bold text-xs">车载堂食</div>
                          <div className="text-[11px] mt-1 flex items-center justify-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-none ${channelDineInEnabled ? 'bg-emerald-600' : 'bg-[#BA1A1A]'}`} />
                            {channelDineInEnabled ? '在售正常' : '已沽清停售'}
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setChannelPickupEnabled(!channelPickupEnabled)}
                          className={`p-3 border text-center rounded-none cursor-pointer transition-colors ${
                            channelPickupEnabled
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                              : 'border-[#BA1A1A] bg-red-50 text-[#BA1A1A]'
                          }`}
                        >
                          <div className="font-bold text-xs">预约自提</div>
                          <div className="text-[11px] mt-1 flex items-center justify-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-none ${channelPickupEnabled ? 'bg-emerald-600' : 'bg-[#BA1A1A]'}`} />
                            {channelPickupEnabled ? '在售正常' : '已沽清停售'}
                          </div>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      {/* Rule 1: Peak Throttle Limit */}
                      <div className="p-4 bg-[#f9f9f7] rounded-none border border-[#D3D1CB] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#1A1A17] flex items-center gap-1.5">
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
                          className="w-full accent-black cursor-pointer rounded-none"
                        />
                      </div>

                      {/* Rule 2: Auto Stockout Threshold */}
                      <div className="p-4 bg-[#f9f9f7] rounded-none border border-[#D3D1CB] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#1A1A17] flex items-center gap-1.5">
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
                          className="w-full accent-black cursor-pointer rounded-none"
                        />
                      </div>

                      {/* Rule 3: Night Cutoff Limit */}
                      <div className="p-4 bg-[#f9f9f7] rounded-none border border-[#D3D1CB] space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="font-bold text-xs text-[#1A1A17] flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={nightCutoffEnabled}
                              onChange={(e) => setNightCutoffEnabled(e.target.checked)}
                              className="w-4 h-4 accent-black cursor-pointer rounded-none"
                            />
                            <span>晚市定时自动下架防过载</span>
                          </label>
                          <input
                            type="text"
                            value={nightCutoffTime}
                            onChange={(e) => setNightCutoffTime(e.target.value)}
                            disabled={!nightCutoffEnabled}
                            className="w-20 px-2 py-0.5 border border-[#D3D1CB] bg-white text-center font-mono text-xs font-bold rounded-none"
                          />
                        </div>
                        <p className="text-[11px] text-[#787770]">
                          到达指定晚市下架时间后，系统自动停止接现做繁复类菜品，避免后厨延时积压
                        </p>
                      </div>

                      {/* Rule 4: Daily Quota Control */}
                      <div className="p-4 bg-[#f9f9f7] rounded-none border border-[#D3D1CB] space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="font-bold text-xs text-[#1A1A17] flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={dailyQuotaEnabled}
                              onChange={(e) => setDailyQuotaEnabled(e.target.checked)}
                              className="w-4 h-4 accent-black cursor-pointer rounded-none"
                            />
                            <span>每日限量供应配额控制</span>
                          </label>
                          <div className="flex items-center gap-1 font-mono text-xs">
                            <input
                              type="number"
                              value={dailyQuota}
                              onChange={(e) => setDailyQuota(Number(e.target.value))}
                              disabled={!dailyQuotaEnabled}
                              className="w-16 px-1.5 py-0.5 border border-[#D3D1CB] bg-white text-right font-bold rounded-none"
                            />
                            <span className="text-neutral-500">份/天</span>
                          </div>
                        </div>
                        <p className="text-[11px] text-[#787770]">
                          启用后，达到每日出单配额上限时全渠道自动显示售罄，保护核心原料配给
                        </p>
                      </div>

                      {/* Rule 5: Coupon & Discount Stacking Matrix */}
                      <div className="p-4 bg-[#f9f9f7] rounded-none border border-[#D3D1CB] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#1A1A17] flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5 text-[#1A1A17]" />
                            <span>优惠券与渠道立减叠加同享</span>
                          </span>
                          <input
                            type="checkbox"
                            checked={couponStackingAllowed}
                            onChange={(e) => setCouponStackingAllowed(e.target.checked)}
                            className="w-4 h-4 accent-black cursor-pointer rounded-none"
                          />
                        </div>
                        <p className="text-[11px] text-[#787770]">
                          开启后，顾客在享受外卖/堂食单品立减的同时，仍可使用满减优惠券及黑卡折上折
                        </p>
                      </div>

                      {/* Rule 6: Rider Warm-box Verification */}
                      <div className="p-4 bg-[#f9f9f7] rounded-none border border-[#D3D1CB] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#1A1A17] flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-[#006d36]" />
                            <span>极速专送恒温箱扫码取餐</span>
                          </span>
                          <input
                            type="checkbox"
                            checked={riderBoxCodeRequired}
                            onChange={(e) => setRiderBoxCodeRequired(e.target.checked)}
                            className="w-4 h-4 accent-black cursor-pointer rounded-none"
                          />
                        </div>
                        <p className="text-[11px] text-[#787770]">
                          要求骑手必须扫描餐盒上的 69 码与车载保温箱定位码，彻底避免错拿与漏配
                        </p>
                      </div>

                      {/* Rule 7: Auto Substitute Recommendation */}
                      <div className="p-4 bg-[#f9f9f7] rounded-none border border-[#D3D1CB] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#1A1A17] flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-neutral-700" />
                            <span>售罄自动平替推荐 (AUTO RECOMMEND)</span>
                          </span>
                          <input
                            type="checkbox"
                            checked={autoSubstituteEnabled}
                            onChange={(e) => setAutoSubstituteEnabled(e.target.checked)}
                            className="w-4 h-4 accent-black cursor-pointer rounded-none"
                          />
                        </div>
                        <p className="text-[11px] text-[#787770]">
                          当单品沽清时，顾客端详情页与加购弹窗自动推荐同类目相似味型在售单品
                        </p>
                      </div>

                      {/* Rule 8: Dynamic Overflow Delay Buffer */}
                      <div className="p-4 bg-[#f9f9f7] rounded-none border border-[#D3D1CB] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#1A1A17] flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-neutral-700" />
                            <span>烤台超负荷动态延时补偿</span>
                          </span>
                          <div className="flex items-center gap-1 font-mono text-xs">
                            <input
                              type="number"
                              value={prepBufferWindow}
                              onChange={(e) => setPrepBufferWindow(Number(e.target.value))}
                              className="w-14 px-1.5 py-0.5 border border-[#D3D1CB] bg-white text-right font-bold rounded-none"
                            />
                            <span className="text-neutral-500">分钟</span>
                          </div>
                        </div>
                        <p className="text-[11px] text-[#787770]">
                          高峰烤台积压时，自动为专送调度预估增加缓冲时间，保障履约骑手准时到达
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: 69码与扫码枪 */}
              {activeTab === 'barcode' && (
                <div className="space-y-4">
                  <div className="p-5 bg-[#ffffff] rounded-none border border-[#e2e3e1] shadow-none space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-none bg-[#000000] text-white flex items-center justify-center font-bold">
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
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-none bg-[#f4f4f2] text-[#006d36]">
                        即扫即录
                      </span>
                    </div>

                    <div className="p-4 bg-[#f9f9f7] rounded-none border border-[#e2e3e1] space-y-3">
                      <label className="font-bold text-xs text-[#1a1c1b] block">
                        当前绑定的条码 / 69 码:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="例如: 6971234567890"
                          value={editBarcode}
                          onChange={(e) => setEditBarcode(e.target.value)}
                          className="flex-1 p-2.5 bg-white border border-[#c8c7be] focus:border-[#000000] rounded-none text-sm font-mono font-bold text-[#1a1c1b] outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setIsListeningForBarcodeScan(true);
                            showToast('请使用硬件扫码枪对准条形码扫描，系统将自动录入...');
                          }}
                          className={`px-4 py-2.5 rounded-none text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
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
                        <div className="p-3 bg-white rounded-none border border-[#e2e3e1] flex items-center justify-between">
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
                  <div className="p-5 bg-[#ffffff] rounded-none border border-[#e2e3e1] shadow-none space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-none bg-[#eeeeec] text-[#1a1c1b] flex items-center justify-center font-bold">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-[#1a1c1b]">
                            多规格变体与独立定价矩阵 MULTI-VARIANT PRICING MATRIX
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
                            enName: `Variant ${editVariants.length + 1}`,
                            price: parseFloat(editPrice) || dish.price,
                            available: true
                          };
                          setEditVariants([...editVariants, newVar]);
                          showToast('已新增规格变体，请设置名称与独立定价');
                        }}
                        className="px-3 py-1.5 bg-[#000000] text-white rounded-none text-xs font-bold flex items-center gap-1 hover:bg-neutral-800 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>新增规格 ADD VARIANT</span>
                      </button>
                    </div>

                    {editVariants.length === 0 ? (
                      <div className="p-8 text-center bg-[#f9f9f7] rounded-none border border-dashed border-[#c8c7be] space-y-2">
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
                            className="p-3 bg-[#f9f9f7] rounded-none border border-[#e2e3e1] flex items-center justify-between gap-3"
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
                                className="p-1.5 bg-white border border-[#c8c7be] focus:border-[#000000] rounded-none text-xs flex-1 outline-none font-bold text-[#1a1c1b]"
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
                                className="w-20 p-1.5 bg-white border border-[#c8c7be] focus:border-[#000000] rounded-none text-xs font-mono font-bold text-[#1a1c1b] outline-none"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setEditVariants(editVariants.filter((_, i) => i !== idx));
                              }}
                              className="p-1.5 text-[#787770] hover:text-[#ba1a1a] rounded-none hover:bg-white transition-colors cursor-pointer"
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

              {/* TAB: 字段选择器图纸与线稿自动化管理 (中文在前，英文在后) */}
              {activeTab === 'selector_media' && (
                <div className="space-y-4">
                  {/* Top Header Card */}
                  <div className="p-5 bg-[#ffffff] rounded-none border border-[#e2e3e1] shadow-none space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div className="w-9 h-9 rounded-none bg-[#006d36]/10 text-[#006d36] flex items-center justify-center font-bold shrink-0">
                          <Camera className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-[#1a1c1b]">
                              字段选择器图纸与线稿自动化管理 SELECTOR MEDIA & BLUEPRINTS
                            </h4>
                            <span className="text-[10px] bg-[#006d36] text-white px-2 py-0.2 rounded-none font-mono font-bold">
                              自动程序 LIVE ENGINE
                            </span>
                          </div>
                          <p className="text-[11px] text-[#787770] leading-relaxed mt-0.5">
                            对规格变体、口味风格、定制配菜及熟度等每个选择器选项设置专属实物图片与矢量工匠线稿。支持一键自动化生成 CAD 蓝图或通过 Canvas 实物极速转换。
                          </p>
                        </div>
                      </div>

                      {/* Batch Auto Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            // 一键自动化批量补齐全量线稿程序
                            const newMediaMap = { ...editFieldSelectorMediaMap };
                            let updatedCount = 0;

                            // 1. 处理所有变体
                            const updatedVariants = editVariants.map((v) => {
                              if (!v.blueprintImageUrl) {
                                const generated = generateArtisanSvgBlueprint({
                                  titleZh: v.name,
                                  titleEn: v.enName || 'PRECISION DRAFT',
                                  category: dish.category,
                                  sketchType: v.name.includes('双') ? 'burger' : 'burger',
                                  coreTemp: v.coreTemp || '56°C',
                                  specRatio: v.name.includes('双') ? '7:3 (双层/DUAL)' : '7:3',
                                  artisanCode: v.artisanCode || `ARTISAN #${dish.id.replace(/\D/g, '')}`
                                });
                                updatedCount++;
                                return {
                                  ...v,
                                  blueprintImageUrl: generated,
                                  coreTemp: v.coreTemp || '56°C',
                                  specRatio: v.specRatio || '7:3',
                                  artisanCode: v.artisanCode || `ARTISAN #${dish.id.replace(/\D/g, '')}`
                                };
                              }
                              return v;
                            });
                            setEditVariants(updatedVariants);

                            // 2. 处理所有口味
                            editFlavorOptions.forEach((flavor) => {
                              const key = `flavor_${flavor}`;
                              if (!newMediaMap[key]?.blueprintImageUrl) {
                                const presetKey = flavor.includes('松露')
                                  ? 'flavor_truffle_garlic'
                                  : flavor.includes('黑椒')
                                  ? 'flavor_black_pepper'
                                  : flavor.includes('藤椒')
                                  ? 'flavor_rattan_pepper'
                                  : 'flavor_charcoal_salt';
                                const preset = PRESET_SELECTOR_MEDIA_BANK[presetKey];
                                newMediaMap[key] = {
                                  id: key,
                                  key,
                                  category: 'flavor',
                                  fieldCategory: 'flavor',
                                  targetFieldId: flavor,
                                  fieldName: flavor,
                                  labelZh: flavor,
                                  labelEn: preset?.labelEn || 'SIGNATURE FLAVOR',
                                  imageUrl: preset?.imageUrl || dish.imageUrl,
                                  blueprintImageUrl: generateArtisanSvgBlueprint({
                                    titleZh: flavor,
                                    titleEn: preset?.labelEn || 'FLAVOR STYLE',
                                    category: dish.category,
                                    sketchType: 'sauce',
                                    coreTemp: preset?.coreTemp || '60°C'
                                  }),
                                  sketchType: 'sauce',
                                  sketchNoteZh: preset?.noteZh || `${flavor} 秘制工艺标定。`,
                                  sketchNoteEn: preset?.noteEn || `${flavor} craft calibrated.`
                                };
                                updatedCount++;
                              }
                            });

                            // 3. 处理所有配菜选项组
                            const updatedGroups = editOptionGroups.map((group) => {
                              const newChoices = group.choices.map((choice) => {
                                const choiceKey = `option_${choice.label}`;
                                if (!choice.blueprintImageUrl) {
                                  const isFries = choice.label.includes('薯条') || choice.label.toLowerCase().includes('fries');
                                  const isSalad = choice.label.includes('沙拉') || choice.label.toLowerCase().includes('salad');
                                  const isCrisps = choice.label.includes('红薯') || choice.label.includes('薄片');
                                  const presetKey = isFries ? 'truffle_fries' : isSalad ? 'garden_salad' : isCrisps ? 'sweet_potato_crisps' : 'truffle_fries';
                                  const preset = PRESET_SELECTOR_MEDIA_BANK[presetKey];

                                  const generated = generateArtisanSvgBlueprint({
                                    titleZh: choice.label,
                                    titleEn: choice.enLabel || preset?.labelEn || 'CUSTOM CHOICE',
                                    category: 'snacks',
                                    sketchType: isFries ? 'fries' : isSalad ? 'salad' : isCrisps ? 'crisps' : 'general'
                                  });
                                  newMediaMap[choiceKey] = {
                                    id: choiceKey,
                                    key: choiceKey,
                                    category: 'option',
                                    fieldCategory: 'option',
                                    targetFieldId: choice.label,
                                    fieldName: choice.label,
                                    labelZh: choice.label,
                                    labelEn: choice.enLabel || preset?.labelEn || 'CUSTOM CHOICE',
                                    imageUrl: preset?.imageUrl || choice.imageUrl || dish.imageUrl,
                                    blueprintImageUrl: generated,
                                    sketchType: isFries ? 'fries' : isSalad ? 'salad' : isCrisps ? 'crisps' : 'general',
                                    sketchNoteZh: preset?.noteZh || `${choice.label} 工艺标定`,
                                    sketchNoteEn: preset?.noteEn || `${choice.label} craft calibrated`
                                  };
                                  updatedCount++;
                                  return {
                                    ...choice,
                                    blueprintImageUrl: generated,
                                    imageUrl: preset?.imageUrl || choice.imageUrl
                                  };
                                }
                                return choice;
                              });
                              return { ...group, choices: newChoices };
                            });
                            setEditOptionGroups(updatedGroups);
                            setEditFieldSelectorMediaMap(newMediaMap);

                            showToast(`[自动化活程序] 已成功为 ${updatedCount} 项字段选择器自动生成工匠矢量线稿！`);
                            setPreviewStyleMode('spec_modal');
                          }}
                          className="px-3 py-1.5 bg-[#006d36] text-white rounded-none text-xs font-bold flex items-center gap-1.5 hover:bg-[#005429] transition-colors cursor-pointer shadow-sm"
                          title="自动扫描并为所有尚未配置线稿的变体、口味和配菜生成专属工匠矢量蓝图"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>一键智能补齐全量线稿 AUTO-FILL ALL BLUEPRINTS</span>
                        </button>
                      </div>
                    </div>

                    {/* Category Filter Chips (中文在前，英文在后) */}
                    <div className="flex items-center gap-1.5 pt-2 border-t border-[#e2e3e1] overflow-x-auto hide-scrollbar">
                      <span className="text-[11px] font-mono text-[#787770] mr-1 shrink-0">
                        筛选类型 FILTER:
                      </span>
                      {[
                        { id: 'all', labelZh: '全部选项', labelEn: 'ALL', count: editVariants.length + editFlavorOptions.length + editSpicinessOptions.length },
                        { id: 'variant', labelZh: '规格变体', labelEn: 'VARIANTS', count: editVariants.length },
                        { id: 'flavor', labelZh: '口味风格', labelEn: 'FLAVORS', count: editFlavorOptions.length },
                        { id: 'option', labelZh: '定制配菜', labelEn: 'OPTIONS', count: editOptionGroups.reduce((acc, g) => acc + g.choices.length, 0) },
                        { id: 'spiciness', labelZh: '辣度调教', labelEn: 'SPICINESS', count: editSpicinessOptions.length }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setSelectorCategoryFilter(tab.id as any)}
                          className={`px-2.5 py-1 rounded-none text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                            selectorCategoryFilter === tab.id
                              ? 'bg-[#1a1c1b] text-white'
                              : 'bg-[#f4f4f2] text-[#787770] hover:text-[#1a1c1b]'
                          }`}
                        >
                          <span>{tab.labelZh}</span>
                          <span className="text-[10px] opacity-75 font-mono">[{tab.labelEn}]</span>
                          <span className="ml-0.5 text-[9px] px-1 bg-white/20 rounded-none font-mono">
                            {tab.count}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Section 1: 规格变体 (VARIANTS) */}
                  {(selectorCategoryFilter === 'all' || selectorCategoryFilter === 'variant') && (
                    <div className="p-5 bg-[#ffffff] rounded-none border border-[#e2e3e1] shadow-none space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-[#006d36]"></span>
                          <h5 className="font-bold text-xs text-[#1a1c1b] uppercase font-mono">
                            规格变体选择器图纸 VARIANT BLUEPRINT SPECIFICATIONS ({editVariants.length})
                          </h5>
                        </div>
                        <span className="text-[10px] text-[#787770] font-mono">
                          用户切换变体即时联动线稿
                        </span>
                      </div>

                      {editVariants.length === 0 ? (
                        <p className="text-xs text-[#787770] italic p-3 bg-[#f9f9f7] rounded-none">
                          暂无多规格变体，如需使用请在「规格变体」Tab 中添加变体。
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {editVariants.map((variant, vIdx) => {
                            const hasBlueprint = !!variant.blueprintImageUrl;
                            const isEditing = activeMediaEditingKey === `variant_${variant.id}`;
                            return (
                              <div
                                key={variant.id || vIdx}
                                className="p-3.5 bg-[#f9f9f7] rounded-none border border-[#e2e3e1] space-y-3 transition-all"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                  <div className="flex items-center gap-2.5">
                                    {/* Preview Dual-Window: Photo & Blueprint */}
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {/* Photo Window */}
                                      <div
                                        className="w-14 h-14 rounded-none bg-[#eeeeec] border border-[#c8c7be] overflow-hidden relative group"
                                        title="实物照片 PHOTO"
                                      >
                                        <img
                                          src={variant.imageUrl || dish.imageUrl}
                                          alt={variant.name}
                                          className="w-full h-full object-cover"
                                        />
                                        <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white font-mono text-[7px] text-center leading-tight">
                                          实物 PHOTO
                                        </span>
                                      </div>
                                      {/* Blueprint Window */}
                                      <div
                                        className="w-14 h-14 rounded-none bg-[#041224] border border-[#00d4ff]/40 overflow-hidden relative"
                                        title="工匠蓝图 BLUEPRINT"
                                      >
                                        {variant.blueprintImageUrl ? (
                                          <img
                                            src={variant.blueprintImageUrl}
                                            alt={`${variant.name} 蓝图`}
                                            className="w-full h-full object-contain scale-105"
                                          />
                                        ) : (
                                          <div className="w-full h-full flex flex-col items-center justify-center text-[8px] text-[#00d4ff]/60 font-mono text-center px-1">
                                            <span>未标定</span>
                                            <span>NO CAD</span>
                                          </div>
                                        )}
                                        <span className="absolute bottom-0 inset-x-0 bg-[#00d4ff] text-[#041224] font-mono text-[7px] text-center font-bold leading-tight">
                                          线稿 CAD
                                        </span>
                                      </div>
                                    </div>

                                    {/* Titles & Specs */}
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-bold text-xs text-[#1a1c1b]">
                                          {variant.name}
                                        </span>
                                        {variant.enName && (
                                          <span className="text-[10px] font-mono text-gray-500">
                                            [{variant.enName}]
                                          </span>
                                        )}
                                        <span className="font-mono text-xs font-bold text-[#006d36]">
                                          ¥{variant.price.toFixed(2)}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-[#787770] flex-wrap">
                                        <span>
                                          编号 CODE:{' '}
                                          <strong className="text-[#1a1c1b]">
                                            {variant.artisanCode || 'ARTISAN #SPEC'}
                                          </strong>
                                        </span>
                                        <span>•</span>
                                        <span>
                                          温控 TEMP:{' '}
                                          <strong className="text-[#d9730d]">
                                            {variant.coreTemp || '56°C'}
                                          </strong>
                                        </span>
                                        <span>•</span>
                                        <span>
                                          配比 RATIO:{' '}
                                          <strong className="text-[#006d36]">
                                            {variant.specRatio || '7:3'}
                                          </strong>
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Quick Action Buttons (中文在前，英文在后) */}
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {/* 1. Auto Generate CAD Blueprint */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const vName = (variant.name || '').toLowerCase();
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

                                        const generated = generateArtisanSvgBlueprint({
                                          titleZh: variant.name,
                                          titleEn: variant.enName || 'PRECISION CAD DRAFT',
                                          category: dish.category,
                                          sketchType: variant.sketchType || detectedType,
                                          coreTemp: variant.coreTemp || '56°C',
                                          specRatio: variant.specRatio || '7:3',
                                          artisanCode: variant.artisanCode || `ARTISAN #${dish.id.replace(/\D/g, '')}`,
                                          style: 'blueprint'
                                        });
                                        const updated = [...editVariants];
                                        updated[vIdx] = {
                                          ...variant,
                                          blueprintImageUrl: generated,
                                          coreTemp: variant.coreTemp || '56°C',
                                          specRatio: variant.specRatio || '7:3',
                                          artisanCode: variant.artisanCode || `ARTISAN #${dish.id.replace(/\D/g, '')}`
                                        };
                                        setEditVariants(updated);
                                        setRightActiveVariantIndex(vIdx);
                                        setPreviewStyleMode('spec_modal');
                                        showToast(`[自动程序] 已为【${variant.name}】生成专属 CAD 工程图！`);
                                      }}
                                      className="px-2.5 py-1 bg-[#082846] text-[#00d4ff] border border-[#00d4ff]/40 rounded-none text-xs font-bold hover:bg-[#0b3c68] transition-colors cursor-pointer flex items-center gap-1"
                                      title="一键自动生成专属工匠 CAD 工程蓝图"
                                    >
                                      <Sparkles className="w-3 h-3 text-[#00d4ff]" />
                                      <span>生成 CAD 蓝图 AUTO-CAD</span>
                                    </button>

                                    {/* 2. Auto Generate Pencil Sketch */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const vName = (variant.name || '').toLowerCase();
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

                                        const generated = generateArtisanSvgBlueprint({
                                          titleZh: variant.name,
                                          titleEn: variant.enName || 'PENCIL SKETCH DRAFT',
                                          category: dish.category,
                                          sketchType: variant.sketchType || detectedType,
                                          coreTemp: variant.coreTemp || '56°C',
                                          specRatio: variant.specRatio || '7:3',
                                          artisanCode: variant.artisanCode || `ARTISAN #${dish.id.replace(/\D/g, '')}`,
                                          style: 'pencil_sketch'
                                        });
                                        const updated = [...editVariants];
                                        updated[vIdx] = {
                                          ...variant,
                                          blueprintImageUrl: generated,
                                          coreTemp: variant.coreTemp || '56°C',
                                          specRatio: variant.specRatio || '7:3',
                                          artisanCode: variant.artisanCode || `ARTISAN #${dish.id.replace(/\D/g, '')}`
                                        };
                                        setEditVariants(updated);
                                        setRightActiveVariantIndex(vIdx);
                                        setPreviewStyleMode('spec_modal');
                                        showToast(`[自动程序] 已为【${variant.name}】生成真实手绘素描！`);
                                      }}
                                      className="px-2.5 py-1 bg-[#1a1c1b] text-[#f4f4f2] rounded-none text-xs font-bold hover:bg-black transition-colors cursor-pointer flex items-center gap-1"
                                      title="一键自动生成专属工匠真实素描手稿"
                                    >
                                      <Sparkles className="w-3 h-3 text-amber-300" />
                                      <span>生成素描 AUTO-SKETCH</span>
                                    </button>

                                    {/* 3. Photo to Blueprint/Sketch */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const photoSrc = variant.imageUrl || dish.imageUrl;
                                        convertPhotoToBlueprintCanvas(photoSrc, (blueprintDataUrl) => {
                                          const updated = [...editVariants];
                                          updated[vIdx] = {
                                            ...variant,
                                            blueprintImageUrl: blueprintDataUrl
                                          };
                                          setEditVariants(updated);
                                          setRightActiveVariantIndex(vIdx);
                                          setPreviewStyleMode('spec_modal');
                                          showToast(`[Canvas引擎] 实物照片已毫秒级转为手绘素描！`);
                                        }, { mode: 'pencil_sketch', titleZh: variant.name, titleEn: variant.enName });
                                      }}
                                      className="px-2.5 py-1 bg-[#00d4ff]/15 text-[#006a80] border border-[#00d4ff]/40 rounded-none text-xs font-bold hover:bg-[#00d4ff]/25 transition-colors cursor-pointer flex items-center gap-1"
                                      title="纯前端 Canvas 滤镜算法：实物照片一键转素描手稿"
                                    >
                                      <span>照片转素描 PHOTO TO SKETCH</span>
                                    </button>

                                    {/* 4. Toggle edit inputs */}
                                    <button
                                      type="button"
                                      onClick={() => setActiveMediaEditingKey(isEditing ? null : `variant_${variant.id}`)}
                                      className="px-2.5 py-1 bg-white border border-[#c8c7be] text-[#1a1c1b] rounded-none text-xs font-bold hover:bg-[#f4f4f2] transition-colors cursor-pointer"
                                    >
                                      {isEditing ? '收起 COLLAPSE' : '编辑参数 EDIT'}
                                    </button>
                                  </div>
                                </div>

                                {/* Expanded Custom Inputs */}
                                {isEditing && (
                                  <div className="p-3 bg-white rounded-none border border-[#e2e3e1] space-y-2.5 text-xs animate-in fade-in duration-150">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      <div>
                                        <label className="text-[10px] text-[#787770] font-mono block">
                                          英文名称 ENGLISH NAME:
                                        </label>
                                        <input
                                          type="text"
                                          value={variant.enName || ''}
                                          onChange={(e) => {
                                            const updated = [...editVariants];
                                            updated[vIdx].enName = e.target.value;
                                            setEditVariants(updated);
                                          }}
                                          placeholder="如: Double Patty Stack"
                                          className="w-full p-1.5 border border-[#c8c7be] rounded-none text-xs font-mono"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[10px] text-[#787770] font-mono block">
                                          工匠料号 ARTISAN CODE:
                                        </label>
                                        <input
                                          type="text"
                                          value={variant.artisanCode || ''}
                                          onChange={(e) => {
                                            const updated = [...editVariants];
                                            updated[vIdx].artisanCode = e.target.value;
                                            setEditVariants(updated);
                                          }}
                                          placeholder="如: ARTISAN #02"
                                          className="w-full p-1.5 border border-[#c8c7be] rounded-none text-xs font-mono"
                                        />
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      <div>
                                        <label className="text-[10px] text-[#787770] font-mono block">
                                          核心温控 CORE TEMP:
                                        </label>
                                        <input
                                          type="text"
                                          value={variant.coreTemp || ''}
                                          onChange={(e) => {
                                            const updated = [...editVariants];
                                            updated[vIdx].coreTemp = e.target.value;
                                            setEditVariants(updated);
                                          }}
                                          placeholder="如: 56°C / 64°C"
                                          className="w-full p-1.5 border border-[#c8c7be] rounded-none text-xs font-mono"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[10px] text-[#787770] font-mono block">
                                          黄金比例 RATIO SPEC:
                                        </label>
                                        <input
                                          type="text"
                                          value={variant.specRatio || ''}
                                          onChange={(e) => {
                                            const updated = [...editVariants];
                                            updated[vIdx].specRatio = e.target.value;
                                            setEditVariants(updated);
                                          }}
                                          placeholder="如: RATIO 7:3 (双层)"
                                          className="w-full p-1.5 border border-[#c8c7be] rounded-none text-xs font-mono"
                                        />
                                      </div>
                                    </div>

                                    <div>
                                      <label className="text-[10px] text-[#787770] font-mono block">
                                        实物图片 URL (PHOTO URL):
                                      </label>
                                      <input
                                        type="text"
                                        value={variant.imageUrl || ''}
                                        onChange={(e) => {
                                          const updated = [...editVariants];
                                          updated[vIdx].imageUrl = e.target.value;
                                          setEditVariants(updated);
                                        }}
                                        placeholder="https://..."
                                        className="w-full p-1.5 border border-[#c8c7be] rounded-none text-xs font-mono"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-[10px] text-[#787770] font-mono block">
                                        工匠矢量线稿 URL (BLUEPRINT URL / DATA URI):
                                      </label>
                                      <input
                                        type="text"
                                        value={variant.blueprintImageUrl || ''}
                                        onChange={(e) => {
                                          const updated = [...editVariants];
                                          updated[vIdx].blueprintImageUrl = e.target.value;
                                          setEditVariants(updated);
                                        }}
                                        placeholder="data:image/svg+xml;... 或 https://..."
                                        className="w-full p-1.5 border border-[#c8c7be] rounded-none text-xs font-mono truncate"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Section 2: 口味风格选择器 (FLAVORS) */}
                  {(selectorCategoryFilter === 'all' || selectorCategoryFilter === 'flavor') && (
                    <div className="p-5 bg-[#ffffff] rounded-none border border-[#e2e3e1] shadow-none space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-[#d9730d]"></span>
                          <h5 className="font-bold text-xs text-[#1a1c1b] uppercase font-mono">
                            口味风格字段选择器图纸 FLAVOR STYLE BLUEPRINTS ({editFlavorOptions.length})
                          </h5>
                        </div>
                        <span className="text-[10px] text-[#787770] font-mono">
                          食客端点选风味时即时草图响应
                        </span>
                      </div>

                      {editFlavorOptions.length === 0 ? (
                        <p className="text-xs text-[#787770] italic p-3 bg-[#f9f9f7] rounded-none">
                          当前未配置多口味选项，可在基础参数中开启。
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {editFlavorOptions.map((flavor, fIdx) => {
                            const mediaKey = `flavor_${flavor}`;
                            const mediaItem = editFieldSelectorMediaMap[mediaKey];
                            const isEditing = activeMediaEditingKey === mediaKey;

                            return (
                              <div
                                key={flavor || fIdx}
                                className="p-3 bg-[#f9f9f7] rounded-none border border-[#e2e3e1] space-y-2"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    {/* Blueprint Mini Icon */}
                                    <div className="w-10 h-10 rounded-none bg-[#041224] border border-[#00d4ff]/40 overflow-hidden shrink-0 flex items-center justify-center">
                                      {mediaItem?.blueprintImageUrl ? (
                                        <img
                                          src={mediaItem.blueprintImageUrl}
                                          alt={flavor}
                                          className="w-full h-full object-contain"
                                        />
                                      ) : (
                                        <span className="text-[7px] text-[#00d4ff]/50 font-mono">
                                          CAD
                                        </span>
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="font-bold text-xs text-[#1a1c1b] truncate">
                                        {flavor}
                                      </div>
                                      <div className="text-[9px] font-mono text-[#787770] truncate">
                                        {mediaItem?.labelEn || 'FLAVOR OPTION'}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Quick Actions */}
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const presetKey = flavor.includes('松露')
                                          ? 'flavor_truffle_garlic'
                                          : flavor.includes('黑椒')
                                          ? 'flavor_black_pepper'
                                          : flavor.includes('藤椒')
                                          ? 'flavor_rattan_pepper'
                                          : 'flavor_charcoal_salt';
                                        const preset = PRESET_SELECTOR_MEDIA_BANK[presetKey];

                                        const generated = generateArtisanSvgBlueprint({
                                          titleZh: flavor,
                                          titleEn: preset?.labelEn || 'FLAVOR STYLE',
                                          category: dish.category,
                                          sketchType: 'sauce',
                                          coreTemp: preset?.coreTemp || '60°C'
                                        });

                                        setEditFieldSelectorMediaMap({
                                          ...editFieldSelectorMediaMap,
                                          [mediaKey]: {
                                            id: mediaKey,
                                            key: mediaKey,
                                            category: 'flavor',
                                            fieldCategory: 'flavor',
                                            targetFieldId: flavor,
                                            fieldName: flavor,
                                            labelZh: flavor,
                                            labelEn: preset?.labelEn || 'FLAVOR STYLE',
                                            imageUrl: preset?.imageUrl || dish.imageUrl,
                                            blueprintImageUrl: generated,
                                            sketchType: 'sauce',
                                            sketchNoteZh: preset?.noteZh || `${flavor} 秘制工艺标定。`,
                                            sketchNoteEn: preset?.noteEn || `${flavor} craft calibrated.`
                                          }
                                        });
                                        setPreviewSelectedFlavor(flavor);
                                        setPreviewStyleMode('spec_modal');
                                        showToast(`[自动程序] 已生成【${flavor}】工匠线稿图纸！`);
                                      }}
                                      className="p-1 bg-[#1a1c1b] text-white rounded-none hover:bg-black transition-colors cursor-pointer"
                                      title="自动生成工匠线稿"
                                    >
                                      <Sparkles className="w-3 h-3 text-[#00d4ff]" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setActiveMediaEditingKey(isEditing ? null : mediaKey)}
                                      className="px-2 py-1 bg-white border border-[#c8c7be] rounded-none text-[10px] font-mono hover:bg-[#f4f4f2] cursor-pointer"
                                    >
                                      {isEditing ? '收起 COLLAPSE' : '配置设置 CONFIGURE'}
                                    </button>
                                  </div>
                                </div>

                                {isEditing && (
                                  <div className="p-2 bg-white rounded-none border border-[#e2e3e1] space-y-1.5 text-xs animate-in fade-in duration-150">
                                    <div>
                                      <span className="text-[9px] text-[#787770] font-mono block">
                                        英文标签 ENGLISH LABEL:
                                      </span>
                                      <input
                                        type="text"
                                        value={mediaItem?.labelEn || ''}
                                        onChange={(e) => {
                                          setEditFieldSelectorMediaMap({
                                            ...editFieldSelectorMediaMap,
                                            [mediaKey]: {
                                              ...(mediaItem || {
                                                id: mediaKey,
                                                key: mediaKey,
                                                category: 'flavor',
                                                fieldCategory: 'flavor',
                                                targetFieldId: flavor,
                                                fieldName: flavor,
                                                labelZh: flavor,
                                                labelEn: 'FLAVOR STYLE'
                                              }),
                                              labelEn: e.target.value
                                            }
                                          });
                                        }}
                                        placeholder="如: Truffle Garlic"
                                        className="w-full p-1 border border-[#c8c7be] rounded-none text-xs font-mono"
                                      />
                                    </div>
                                    <div>
                                      <span className="text-[9px] text-[#787770] font-mono block">
                                        工艺注释 CRAFT NOTE (ZH):
                                      </span>
                                      <input
                                        type="text"
                                        value={mediaItem?.sketchNoteZh || ''}
                                        onChange={(e) => {
                                          setEditFieldSelectorMediaMap({
                                            ...editFieldSelectorMediaMap,
                                            [mediaKey]: {
                                              ...(mediaItem || {
                                                id: mediaKey,
                                                key: mediaKey,
                                                category: 'flavor',
                                                fieldCategory: 'flavor',
                                                targetFieldId: flavor,
                                                fieldName: flavor,
                                                labelZh: flavor,
                                                labelEn: 'FLAVOR STYLE'
                                              }),
                                              sketchNoteZh: e.target.value
                                            }
                                          });
                                        }}
                                        placeholder="如: 手刨黑松露融合蒜香，醇郁回甘。"
                                        className="w-full p-1 border border-[#c8c7be] rounded-none text-xs"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Section 3: 定制配菜选项组 (OPTION GROUPS) */}
                  {(selectorCategoryFilter === 'all' || selectorCategoryFilter === 'option') && (
                    <div className="p-5 bg-[#ffffff] rounded-none border border-[#e2e3e1] shadow-none space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-[#006d36]"></span>
                          <h5 className="font-bold text-xs text-[#1a1c1b] uppercase font-mono">
                            定制配菜选择器图纸 OPTION GROUP BLUEPRINTS ({editOptionGroups.length})
                          </h5>
                        </div>
                        <span className="text-[10px] text-[#787770] font-mono">
                          包含薯条、沙拉、甘薯片等配件线稿
                        </span>
                      </div>

                      {editOptionGroups.length === 0 ? (
                        <p className="text-xs text-[#787770] italic p-3 bg-[#f9f9f7] rounded-none">
                          当前菜品暂无定制配菜组。可在主菜品数据中添加选项组（如配菜随心选）。
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {editOptionGroups.map((group, gIdx) => (
                            <div
                              key={group.name || gIdx}
                              className="p-3 bg-[#f9f9f7] rounded-none border border-[#e2e3e1] space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-[#1a1c1b]">
                                  {group.name} {group.enName ? `[${group.enName}]` : ''}
                                </span>
                                <span className="text-[10px] text-[#787770] font-mono">
                                  {group.choices.length} 项可选 CHOICES
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {group.choices.map((choice, cIdx) => {
                                  const optionKey = `option_${choice.label}`;
                                  const mediaItem = editFieldSelectorMediaMap[optionKey];
                                  return (
                                    <div
                                      key={choice.label || cIdx}
                                      className="p-2.5 bg-white rounded-none border border-[#e2e3e1] flex items-center justify-between gap-2"
                                    >
                                      <div className="flex items-center gap-2">
                                        <div className="w-9 h-9 rounded-none bg-[#041224] border border-[#00d4ff]/40 overflow-hidden shrink-0 flex items-center justify-center">
                                          {choice.blueprintImageUrl || mediaItem?.blueprintImageUrl ? (
                                            <img
                                              src={choice.blueprintImageUrl || mediaItem?.blueprintImageUrl}
                                              alt={choice.label}
                                              className="w-full h-full object-contain"
                                            />
                                          ) : (
                                            <span className="text-[7px] text-[#00d4ff]/50 font-mono">
                                              CAD
                                            </span>
                                          )}
                                        </div>
                                        <div>
                                          <div className="font-bold text-xs text-[#1a1c1b]">
                                            {choice.label}
                                          </div>
                                          <div className="text-[9px] font-mono text-[#006d36]">
                                            +¥{choice.extraPrice.toFixed(2)}
                                          </div>
                                        </div>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          const isFries = choice.label.includes('薯条');
                                          const isSalad = choice.label.includes('沙拉');
                                          const isCrisps = choice.label.includes('红薯');
                                          const presetKey = isFries ? 'truffle_fries' : isSalad ? 'garden_salad' : isCrisps ? 'sweet_potato_crisps' : 'truffle_fries';
                                          const preset = PRESET_SELECTOR_MEDIA_BANK[presetKey];

                                          const generated = generateArtisanSvgBlueprint({
                                            titleZh: choice.label,
                                            titleEn: choice.enLabel || preset?.labelEn || 'CUSTOM CHOICE',
                                            category: 'snacks',
                                            sketchType: isFries ? 'fries' : isSalad ? 'salad' : isCrisps ? 'crisps' : 'general'
                                          });

                                          const updatedGroups = [...editOptionGroups];
                                          updatedGroups[gIdx].choices[cIdx] = {
                                            ...choice,
                                            blueprintImageUrl: generated,
                                            imageUrl: preset?.imageUrl || choice.imageUrl
                                          };
                                          setEditOptionGroups(updatedGroups);

                                          setEditFieldSelectorMediaMap({
                                            ...editFieldSelectorMediaMap,
                                            [optionKey]: {
                                              id: optionKey,
                                              key: optionKey,
                                              category: 'option',
                                              fieldCategory: 'option',
                                              targetFieldId: choice.label,
                                              fieldName: choice.label,
                                              labelZh: choice.label,
                                              labelEn: choice.enLabel || preset?.labelEn || 'CUSTOM CHOICE',
                                              imageUrl: preset?.imageUrl || choice.imageUrl || dish.imageUrl,
                                              blueprintImageUrl: generated,
                                              sketchType: isFries ? 'fries' : isSalad ? 'salad' : isCrisps ? 'crisps' : 'general',
                                              sketchNoteZh: preset?.noteZh || `${choice.label} 工艺标定`,
                                              sketchNoteEn: preset?.noteEn || `${choice.label} craft calibrated`
                                            }
                                          });
                                          setPreviewStyleMode('spec_modal');
                                          showToast(`[自动程序] 已生成【${choice.label}】专属配菜工匠线稿！`);
                                        }}
                                        className="p-1.5 bg-[#1a1c1b] text-white rounded-none hover:bg-black transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-mono"
                                        title="自动生成配菜线稿"
                                      >
                                        <Sparkles className="w-3 h-3 text-[#00d4ff]" />
                                        <span>生成 CAD</span>
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 8: 前台即时预览说明 */}
              {activeTab === 'preview' && (
                <div className="p-5 bg-[#ffffff] rounded-none border border-[#e2e3e1] shadow-none space-y-4">
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
                      className={`px-3.5 py-2 rounded-none text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
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
                      className={`px-3.5 py-2 rounded-none text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
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
              <div className="flex items-center gap-1 bg-[#f4f4f2] p-0.5 rounded-none border border-[#e2e3e1]">
                <button
                  type="button"
                  onClick={() => setRightPreviewChannel('delivery')}
                  className={`px-2.5 py-1 rounded-none text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
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
                  className={`px-2.5 py-1 rounded-none text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
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
              <div className="flex items-center gap-1 bg-[#f4f4f2] p-0.5 rounded-none border border-[#e2e3e1]">
                <button
                  type="button"
                  onClick={() => setPreviewStyleMode('hud_card')}
                  className={`px-2.5 py-1 rounded-none text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
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
                  className={`px-2.5 py-1 rounded-none text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
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
                <div className="p-3 bg-[#e6f4ea] text-[#006d36] border border-[#a8dab5] rounded-none text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
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
                <div className="bg-[#ffffff] rounded-none p-5 border border-[#e2e3e1] shadow-none space-y-4">
                  {/* Hero Image Container */}
                  <div className="relative aspect-16/10 rounded-none overflow-hidden bg-[#eeeeec] border border-[#e2e3e1]">
                    <img
                      src={currentVariant?.imageUrl || dish.imageUrl}
                      alt={dish.name}
                      className="w-full h-full object-cover"
                    />
                    {(currentVariant?.badgeText || editBadgeText) && (
                      <span className="absolute top-3 left-3 bg-[#000000] text-white text-[10px] font-bold px-2.5 py-1 rounded-none uppercase tracking-wider">
                        {currentVariant?.badgeText || editBadgeText}
                      </span>
                    )}
                    {currentDiscount > 0 && (
                      <span className="absolute top-3 right-3 bg-[#ba1a1a] text-white text-[10px] font-bold px-2.5 py-1 rounded-none">
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
                          <span className="text-xs font-bold bg-[#f4f4f2] text-[#1a1c1b] px-2 py-0.5 rounded-none border border-[#e2e3e1]">
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
                    <span className="px-2.5 py-1 rounded-none bg-[#f4f4f2] text-[#1a1c1b] text-[11px] font-medium border border-[#e2e3e1] flex items-center gap-1">
                      <Flame className="w-3 h-3 text-[#ba1a1a]" />
                      <span>{editSpicinessLevel}</span>
                    </span>
                    <span className="px-2.5 py-1 rounded-none bg-[#f4f4f2] text-[#1a1c1b] text-[11px] font-medium border border-[#e2e3e1] flex items-center gap-1">
                      <ChefHat className="w-3 h-3 text-[#006d36]" />
                      <span>{editFlavor}</span>
                    </span>
                    <span className="px-2.5 py-1 rounded-none bg-[#f4f4f2] text-[#787770] text-[11px] font-mono border border-[#e2e3e1]">
                      ⏱️ {editPrepTime}
                    </span>
                  </div>

                  {/* Flavor Tags */}
                  {editFlavorTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {editFlavorTags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] bg-[#eeeeec] text-[#474741] px-2 py-0.5 rounded-none font-medium"
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
                          className={`p-2.5 rounded-none border text-left cursor-pointer transition-all ${
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
                            className={`p-2.5 rounded-none border text-left cursor-pointer transition-all ${
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
                        className="px-4 py-2.5 bg-[#000000] text-[#ffffff] rounded-none font-bold text-xs hover:bg-neutral-800 transition-colors cursor-pointer shadow-sm active:scale-95 flex items-center gap-1.5"
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
                <div className="bg-[#ffffff] rounded-none border border-[#e2e3e1] shadow-none overflow-hidden flex flex-col animate-in fade-in duration-200">
                  {/* Simulated Mobile Status Bar */}
                  <div className="bg-[#1a1c1b] text-[#c8c7be] px-4 py-1.5 text-[10px] flex items-center justify-between font-mono select-none">
                    <span className="font-bold">09:41</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] bg-[#006d36] text-white px-1.5 py-0.2 rounded-none font-sans font-bold">
                        5G GPS 极速专送
                      </span>
                      <div className="w-4 h-2 border border-[#787770] rounded-none relative p-[1px]">
                        <div className="bg-white h-full w-3/4 rounded-none" />
                      </div>
                    </div>
                  </div>

                  {/* Modal Title Bar */}
                  <div className="px-4 py-2.5 bg-[#f9f9f7] border-b border-[#e2e3e1] flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-none bg-[#006d36] shrink-0" />
                      <span className="font-bold text-xs text-[#1a1c1b] truncate">
                        选规格与个性化定制
                      </span>
                      <span
                        className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-none shrink-0 ${
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
                      className="text-[11px] font-bold text-[#787770] hover:text-[#000000] px-2 py-1 rounded-none hover:bg-[#eeeeec] transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                      title="切换回菜品卡片样式"
                    >
                      <span>切回卡片</span>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Modal Scrollable Body */}
                  <div className="p-4 space-y-4 max-h-[520px] overflow-y-auto hide-scrollbar">
                    {/* 1. Hero Product Showcase with Variant Image & Dynamic Price & Blueprint Toggle */}
                    {(() => {
                      const dynamicDishForPreview = {
                        ...dish,
                        fieldSelectorMediaMap: editFieldSelectorMediaMap
                      };
                      const resolvedMedia = resolveVariantBlueprint(dynamicDishForPreview, currentVariant);
                      const currentImage = previewBlueprintMode === 'blueprint'
                        ? (resolvedMedia.blueprintUrl || currentVariant?.blueprintImageUrl || currentVariant?.imageUrl || dish.imageUrl)
                        : (currentVariant?.imageUrl || dish.imageUrl);

                      return (
                        <div className="flex gap-3 items-start pb-3.5 border-b border-[#e2e3e1]">
                          {/* Product Photo / Blueprint Window */}
                          <div className="flex flex-col items-center gap-1.5 shrink-0">
                            <div className={`relative w-22 h-22 sm:w-24 sm:h-24 rounded-none overflow-hidden shrink-0 border transition-all ${
                              previewBlueprintMode === 'blueprint'
                                ? 'bg-[#041224] border-[#00d4ff]/40 shadow-inner'
                                : 'bg-[#eeeeec] border-[#e2e3e1]'
                            } group`}>
                              <img
                                src={currentImage}
                                alt={dish.name}
                                className={`w-full h-full ${previewBlueprintMode === 'blueprint' ? 'object-contain scale-105 p-1' : 'object-cover'}`}
                              />
                              {(currentVariant?.badgeText || editBadgeText) && (
                                <span className="absolute top-1 left-1 bg-[#000000] text-white text-[8.5px] font-bold px-1.5 py-0.2 rounded-none uppercase tracking-wider">
                                  {currentVariant?.badgeText || editBadgeText}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  onPreviewZoom &&
                                  onPreviewZoom({
                                    ...dish,
                                    imageUrl: currentImage,
                                    name: `${dish.name}${currentVariant ? ` - ${currentVariant.name}` : ''} (${previewBlueprintMode === 'blueprint' ? '工匠蓝图' : '实物'})`
                                  })
                                }
                                className="absolute bottom-1 right-1 p-1 bg-black/60 text-white rounded-none text-[10px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center cursor-pointer"
                                title="查看高清"
                              >
                                <ZoomIn className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Dual-Mode Switcher Pills (中文在前，英文在后) */}
                            <div className="flex items-center bg-[#f4f4f2] p-0.5 rounded-none border border-[#e2e3e1] text-[9.5px] font-mono">
                              <button
                                type="button"
                                onClick={() => setPreviewBlueprintMode('photo')}
                                className={`px-2 py-0.5 rounded-none transition-all font-bold cursor-pointer ${
                                  previewBlueprintMode === 'photo'
                                    ? 'bg-white text-[#1a1c1b] shadow-xs'
                                    : 'text-[#787770] hover:text-[#1a1c1b]'
                                }`}
                              >
                                实物 PHOTO
                              </button>
                              <button
                                type="button"
                                onClick={() => setPreviewBlueprintMode('blueprint')}
                                className={`px-2 py-0.5 rounded-none transition-all font-bold cursor-pointer flex items-center gap-0.5 ${
                                  previewBlueprintMode === 'blueprint'
                                    ? 'bg-[#041224] text-[#00d4ff] shadow-xs'
                                    : 'text-[#787770] hover:text-[#1a1c1b]'
                                }`}
                              >
                                <Sparkles className="w-2.5 h-2.5" />
                                <span>线稿 CAD</span>
                              </button>
                            </div>
                          </div>

                          {/* Info & Price Showcase */}
                          <div className="min-w-0 flex-1 space-y-1">
                            <div>
                              <h4 className="font-bold text-sm text-[#1a1c1b] leading-tight flex items-center gap-1.5 flex-wrap">
                                <span>{dish.name}</span>
                                {currentVariant && (
                                  <span className="text-[10px] font-bold bg-[#f4f4f2] text-[#1a1c1b] px-1.5 py-0.5 rounded-none border border-[#e2e3e1]">
                                    {currentVariant.name}
                                  </span>
                                )}
                              </h4>
                              {dish.enName && (
                                <p className="text-[10px] text-[#787770] font-mono truncate">{dish.enName}</p>
                              )}
                            </div>

                            {/* Blueprint Specs Note if in blueprint mode */}
                            {previewBlueprintMode === 'blueprint' && (
                              <div className="p-1.5 bg-[#041224]/5 rounded-none border border-[#041224]/10 text-[9.5px] font-mono text-[#006d36] flex items-center gap-1.5 flex-wrap">
                                <span>料号: {resolvedMedia.artisanCode}</span>
                                <span>•</span>
                                <span>温控: {resolvedMedia.coreTemp}</span>
                                <span>•</span>
                                <span>配比: {resolvedMedia.specRatio}</span>
                              </div>
                            )}

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
                            <span className="text-[9.5px] font-bold text-[#ba1a1a] bg-[#ffdad6] border border-[#ffb4ab] px-1.5 py-0.2 rounded-none">
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
                  );
                })()}

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
                            className={`shrink-0 w-13 h-13 rounded-none border p-0.5 cursor-pointer transition-all text-center ${
                              rightActiveVariantIndex === -1
                                ? 'border-[#000000] bg-[#f4f4f2] ring-2 ring-black/10'
                                : 'border-[#e2e3e1] bg-[#ffffff] hover:border-[#c8c7be]'
                            }`}
                          >
                            <img src={dish.imageUrl} alt="标准" className="w-full h-7 object-cover rounded-none" />
                            <div className="text-[8.5px] font-bold truncate mt-0.5 text-[#1a1c1b]">标准份</div>
                          </button>

                          {editVariants.map((v, vIdx) => (
                            <button
                              key={v.id || vIdx}
                              type="button"
                              onClick={() => setRightActiveVariantIndex(vIdx)}
                              className={`shrink-0 w-13 h-13 rounded-none border p-0.5 cursor-pointer transition-all text-center ${
                                rightActiveVariantIndex === vIdx
                                  ? 'border-[#000000] bg-[#f4f4f2] ring-2 ring-black/10'
                                  : 'border-[#e2e3e1] bg-[#ffffff] hover:border-[#c8c7be]'
                              }`}
                            >
                              <img
                                src={v.imageUrl || dish.imageUrl}
                                alt={v.name}
                                className="w-full h-7 object-cover rounded-none"
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
                          className={`p-2.5 rounded-none border text-left cursor-pointer transition-all flex flex-col justify-between ${
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
                              className={`p-2.5 rounded-none border text-left cursor-pointer transition-all flex flex-col justify-between ${
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
                        <div className="p-2 bg-[#f4f4f2] rounded-none border border-dashed border-[#c8c7be] flex items-center justify-between text-[10.5px]">
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
                              className={`px-2.5 py-1.5 rounded-none text-xs font-bold border transition-all cursor-pointer flex items-center justify-between ${
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
                              className={`px-2.5 py-1.5 rounded-none text-xs font-bold border transition-all cursor-pointer flex items-center justify-between ${
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
                    <div className="p-2.5 bg-[#f9f9f7] rounded-none border border-[#e2e3e1] space-y-1 text-[10.5px]">
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
                              className="bg-[#f4f4f2] text-[#474741] px-1.5 py-0.2 rounded-none text-[9.5px] font-medium border border-[#e2e3e1]"
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

                      <div className="flex items-center gap-1.5 bg-[#f4f4f2] p-1 rounded-none border border-[#e2e3e1]">
                        <button
                          type="button"
                          onClick={() => setPreviewQuantity((prev) => Math.max(minOrderThreshold || 1, prev - 1))}
                          className="w-6 h-6 rounded-none bg-white hover:bg-neutral-200 flex items-center justify-center font-bold text-[#1a1c1b] shadow-xs cursor-pointer active:scale-95 transition-all"
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
                          className="w-6 h-6 rounded-none bg-white hover:bg-neutral-200 flex items-center justify-center font-bold text-[#1a1c1b] shadow-xs cursor-pointer active:scale-95 transition-all"
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
                      className="px-4 py-2.5 bg-[#000000] hover:bg-neutral-800 text-white rounded-none font-bold text-xs shadow-sm cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
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
              <div className="p-4 bg-[#ffffff] rounded-none border border-[#e2e3e1] shadow-none text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#1a1c1b] flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#006d36]" />
                    <span>参数联动与风控状态</span>
                  </span>
                  <span className="text-[11px] font-bold text-[#006d36] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-none bg-[#006d36] animate-pulse" />
                    即时同步生效
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 bg-[#f9f9f7] rounded-none border border-[#e2e3e1]">
                    <span className="text-[#787770] block">基准单价:</span>
                    <span className="font-bold font-mono text-[#1a1c1b]">
                      ¥{parseFloat(editPrice || '0').toFixed(2)}
                    </span>
                  </div>
                  <div className="p-2 bg-[#f9f9f7] rounded-none border border-[#e2e3e1]">
                    <span className="text-[#787770] block">69商品条码:</span>
                    <span className="font-mono text-[#1a1c1b] truncate block font-semibold">
                      {editBarcode || '未录入'}
                    </span>
                  </div>
                  <div className="p-2 bg-[#f9f9f7] rounded-none border border-[#e2e3e1]">
                    <span className="text-[#787770] block">外卖实收:</span>
                    <span className="font-bold font-mono text-[#006d36]">
                      ¥{Math.max(0, parseFloat(editPrice || '0') - (parseFloat(editDeliveryDiscount) || 0)).toFixed(2)}
                    </span>
                  </div>
                  <div className="p-2 bg-[#f9f9f7] rounded-none border border-[#e2e3e1]">
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
              className="px-5 py-2.5 bg-[#f4f4f2] text-[#1a1c1b] hover:bg-[#eeeeec] border border-[#e2e3e1] rounded-none font-bold text-xs cursor-pointer transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 bg-[#000000] text-white hover:bg-neutral-800 rounded-none font-bold text-xs cursor-pointer transition-colors shadow-sm flex items-center gap-1.5"
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
