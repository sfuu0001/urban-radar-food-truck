import React, { useState } from 'react';
import {
  Tag,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Sparkles,
  Utensils,
  Bike,
  Smartphone,
  Eye,
  ShoppingBag,
  X,
  Edit3,
  Sliders,
  Check,
  CheckSquare,
  Square,
  Layers,
  ArrowRight,
  TrendingDown,
  Percent,
  SlidersHorizontal,
  Flame,
  ShieldCheck,
  Cloud,
  Download,
  Copy,
  ChefHat,
  Info,
  RefreshCw,
  Clock,
  CloudLightning,
  CheckCheck,
  ZoomIn,
  Maximize2,
  Barcode,
  Scan,
  QrCode,
  Upload,
  Camera,
  Power,
  Image as ImageIcon,
  AlertCircle,
  Minus
} from 'lucide-react';
import { DishItem, CategoryType, SubCategoryType, DishVariant } from '../../types';
import { CATEGORY_TAXONOMY, getCategoryDef } from '../../data/categoryTaxonomy';
import { rematchAllDishImages } from '../../utils/dishImageMatcher';
import { seedDishesToCloud } from '../../utils/cloudbase';
import { generateEan13Barcode, globalScannerEngine, playScannerBeep } from '../../utils/barcodeScannerEngine';
import { DishPriceCalculator } from '../DishPriceCalculator';
import { DishDiscountBanner } from '../DishDiscountBanner';
import { CloudbaseStatusModal } from '../CloudbaseStatusModal';
import { DishImagePreviewModal } from './DishImagePreviewModal';
import { DishImageUploadModal, FOOD_PRESET_GALLERY } from './DishImageUploadModal';
import { DishParameterRulesModal } from './DishParameterRulesModal';
import { FlavorTagSelector } from './FlavorTagSelector';
import { DishVariantEditor } from './DishVariantEditor';
import {
  getVariantBorderClass,
  getVariantFitClass,
  getVariantFilterClass,
  getVariantBadgeClasses
} from '../../utils/variantStyleHelper';

// Standard Preset Options for quick selection
export const SPICINESS_PRESETS = [
  '不辣 (原味)',
  '微辣 (推荐)',
  '中辣 (经典川香)',
  '重辣 (嗜辣专享)',
  '变态辣 (魔鬼椒定制)'
];

export const FLAVOR_PRESETS = [
  '秘制黑椒酱香',
  '经典炭烤椒盐',
  '秘传孜然麻辣',
  '青花椒藤椒风味',
  '黑松露法式蒜香',
  '老北京秘制甜辣',
  '蜜汁叉烧风味',
  '日式照烧香浓',
  '泰式青柠酸辣',
  '香烤葱油原汁'
];

export const COOKING_STYLE_PRESETS = [
  '炭火现烤 (果木炭慢烘)',
  '远红外炙烤 (锁鲜多汁)',
  '高压微炸 (外酥里嫩)',
  '铁板生煎 (焦香浓郁)',
  '先卤后烤 (软烂入味)',
  '生滚锁鲜 (清润鲜甜)',
  '低温慢煮 (粉嫩多汁)',
  '酥脆金黄 (轻油薄脆)'
];

interface MerchantMenuChannelProps {
  dishes: DishItem[];
  onToggleAvailability: (dishId: string) => void;
  onAddNewDish: (dish: Partial<DishItem>) => void;
  onUpdateDish?: (dish: DishItem) => void;
  onRematchAllImages?: () => void;
  showToast: (msg: string) => void;
}

export const MerchantMenuChannel: React.FC<MerchantMenuChannelProps> = ({
  dishes,
  onToggleAvailability,
  onAddNewDish,
  onUpdateDish,
  onRematchAllImages,
  showToast
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'unavailable'>('all');
  const [cookingStyleFilter, setCookingStyleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCloudbaseModalOpen, setIsCloudbaseModalOpen] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; name: string } | null>(null);

  // Cloud Sync Handler for full menu
  const handleSyncAllDishesToCloud = async () => {
    setIsSyncingCloud(true);
    try {
      const res = await seedDishesToCloud(dishes, (current, total, name) => {
        setSyncProgress({ current, total, name });
      });
      if (res.success) {
        showToast(`已成功将全部 ${res.count} 道菜品（包含日式烧鸟与芝士焗类）同步至腾讯云端数据库！`);
      } else {
        showToast(`云端同步提示: ${res.error || '已同步至本地安全双轨存储'}`);
      }
    } catch (err: any) {
      showToast(`同步遇到问题: ${err?.message || '请检查网络连接'}`);
    } finally {
      setIsSyncingCloud(false);
      setSyncProgress(null);
    }
  };

  // Edit Dish Modal State
  const [editingDish, setEditingDish] = useState<DishItem | null>(null);
  const [previewZoomDish, setPreviewZoomDish] = useState<DishItem | null>(null);
  const [uploadModalDish, setUploadModalDish] = useState<DishItem | null>(null);
  const [editActiveTab, setEditActiveTab] = useState<'parameters' | 'flavor_tags' | 'price_discount' | 'cooking_sop' | 'image' | 'barcode' | 'preview' | 'variants'>('parameters');
  const [editVariants, setEditVariants] = useState<DishVariant[]>([]);
  const [variantImageModalTarget, setVariantImageModalTarget] = useState<{ variantIndex: number; currentVariant: DishVariant } | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editOriginalPrice, setEditOriginalPrice] = useState('');
  const [editPrevPrice, setEditPrevPrice] = useState('');
  const [editDeliveryDiscount, setEditDeliveryDiscount] = useState('');
  const [editDeliveryDiscountTag, setEditDeliveryDiscountTag] = useState('');
  const [editDineInDiscount, setEditDineInDiscount] = useState('');
  const [editDineInDiscountTag, setEditDineInDiscountTag] = useState('');
  const [editSpicinessLevel, setEditSpicinessLevel] = useState('微辣 (推荐)');
  const [editSpicinessOptions, setEditSpicinessOptions] = useState<string[]>([]);
  const [editFlavor, setEditFlavor] = useState('秘制黑椒酱香');
  const [editFlavorOptions, setEditFlavorOptions] = useState<string[]>([]);
  const [editFlavorTags, setEditFlavorTags] = useState<string[]>([]);
  const [editCookingStyle, setEditCookingStyle] = useState('炭火现烤 (果木炭慢烘)');
  const [editCraftStandardNote, setEditCraftStandardNote] = useState('');
  const [editBadgeText, setEditBadgeText] = useState('');
  const [editPrepTime, setEditPrepTime] = useState('约8m');
  const [editCustomFlavorInput, setEditCustomFlavorInput] = useState('');
  const [editCustomSpiceInput, setEditCustomSpiceInput] = useState('');
  const [editPreviewMode, setEditPreviewMode] = useState<'delivery' | 'dine_in'>('delivery');
  const [rightPreviewChannel, setRightPreviewChannel] = useState<'delivery' | 'dine_in' | 'compare'>('delivery');
  const [rightActiveVariantIndex, setRightActiveVariantIndex] = useState<number>(-1);
  const [previewStyleMode, setPreviewStyleMode] = useState<'card' | 'spec_modal'>('spec_modal');
  const [previewModalQuantity, setPreviewModalQuantity] = useState<number>(1);
  const [previewSelectedSpiciness, setPreviewSelectedSpiciness] = useState<string>('');
  const [previewSelectedFlavor, setPreviewSelectedFlavor] = useState<string>('');
  const [previewToastMessage, setPreviewToastMessage] = useState<string | null>(null);
  const [editBarcode, setEditBarcode] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [isListeningForBarcodeScan, setIsListeningForBarcodeScan] = useState(false);

  // Quick Clone & Create Dish State
  const [cloningSourceDish, setCloningSourceDish] = useState<DishItem | null>(null);
  const [cloneDishName, setCloneDishName] = useState('');
  const [cloneDishEnName, setCloneDishEnName] = useState('');
  const [cloneDishPrice, setCloneDishPrice] = useState('58.00');
  const [cloneDishOriginalPrice, setCloneDishOriginalPrice] = useState('68.00');
  const [cloneDishPrevPrice, setCloneDishPrevPrice] = useState('62.00');
  const [cloneDishDeliveryDiscount, setCloneDishDeliveryDiscount] = useState('5.00');
  const [cloneDishDeliveryDiscountTag, setCloneDishDeliveryDiscountTag] = useState('外卖立减¥5');
  const [cloneDishDineInDiscount, setCloneDishDineInDiscount] = useState('3.00');
  const [cloneDishDineInDiscountTag, setCloneDishDineInDiscountTag] = useState('堂食立减¥3');
  const [cloneDishCategory, setCloneDishCategory] = useState<DishItem['category']>('skewers');
  const [cloneDishSubCategory, setCloneDishSubCategory] = useState<string | undefined>(undefined);
  const [cloneDishSubCategoryName, setCloneDishSubCategoryName] = useState<string | undefined>(undefined);
  const [cloneDishSpicinessLevel, setCloneDishSpicinessLevel] = useState('微辣 (推荐)');
  const [cloneDishSpicinessOptions, setCloneDishSpicinessOptions] = useState<string[]>([]);
  const [cloneDishFlavor, setCloneDishFlavor] = useState('秘制黑椒酱香');
  const [cloneDishFlavorOptions, setCloneDishFlavorOptions] = useState<string[]>([]);
  const [cloneDishFlavorTags, setCloneDishFlavorTags] = useState<string[]>([]);
  const [cloneDishCookingStyle, setCloneDishCookingStyle] = useState('炭火现烤 (果木炭慢烘)');
  const [cloneDishCraftStandardNote, setCloneDishCraftStandardNote] = useState('');
  const [cloneDishBadgeText, setCloneDishBadgeText] = useState('快速复制');
  const [cloneDishDescription, setCloneDishDescription] = useState('');
  const [cloneDishPrepTime, setCloneDishPrepTime] = useState('约8m');
  const [cloneDishImageUrl, setCloneDishImageUrl] = useState('');

  // Batch selection states
  const [selectedDishIds, setSelectedDishIds] = useState<Set<string>>(new Set());
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchActionType, setBatchActionType] = useState<
    'delivery_discount' | 'dinein_discount' | 'price_adjust' | 'spicy_flavor' | 'flavor_tags' | 'cooking_style' | 'availability'
  >('delivery_discount');
  const [batchDeliveryDiscount, setBatchDeliveryDiscount] = useState('5.00');
  const [batchDeliveryDiscountTag, setBatchDeliveryDiscountTag] = useState('外卖立减¥5');
  const [batchDineInDiscount, setBatchDineInDiscount] = useState('3.00');
  const [batchDineInDiscountTag, setBatchDineInDiscountTag] = useState('堂食立减¥3');
  const [batchPriceOffset, setBatchPriceOffset] = useState('-3.00');
  const [batchSpicinessLevel, setBatchSpicinessLevel] = useState('微辣 (推荐)');
  const [batchFlavor, setBatchFlavor] = useState('秘制黑椒酱香');
  const [batchFlavorTags, setBatchFlavorTags] = useState<string[]>([]);
  const [batchFlavorTagMode, setBatchFlavorTagMode] = useState<'append' | 'overwrite' | 'clear'>('append');
  const [batchCookingStyle, setBatchCookingStyle] = useState('炭火现烤 (果木炭慢烘)');
  const [batchAvailabilityMode, setBatchAvailabilityMode] = useState<
    'all_in_stock' | 'all_sold_out' | 'delivery_only' | 'dinein_only' | 'pickup_only'
  >('all_in_stock');

  // New Dish Form State
  const [newDishName, setNewDishName] = useState('');
  const [newDishEnName, setNewDishEnName] = useState('');
  const [newDishPrice, setNewDishPrice] = useState('58.00');
  const [newDishOriginalPrice, setNewDishOriginalPrice] = useState('68.00');
  const [newDishPrevPrice, setNewDishPrevPrice] = useState('62.00');
  const [newDishDeliveryDiscount, setNewDishDeliveryDiscount] = useState('5.00');
  const [newDishDeliveryDiscountTag, setNewDishDeliveryDiscountTag] = useState('外卖立减¥5');
  const [newDishDineInDiscount, setNewDishDineInDiscount] = useState('3.00');
  const [newDishDineInDiscountTag, setNewDishDineInDiscountTag] = useState('堂食立减¥3');
  const [newDishCategory, setNewDishCategory] = useState<DishItem['category']>('skewers');
  const [newDishTypeTag, setNewDishTypeTag] = useState('外卖特惠');
  const [newDishSpicinessLevel, setNewDishSpicinessLevel] = useState('微辣 (推荐)');
  const [newDishFlavor, setNewDishFlavor] = useState('秘制黑椒酱香');
  const [newDishFlavorTags, setNewDishFlavorTags] = useState<string[]>(['炙烤焦香', '鲜嫩多汁']);
  const [newDishCookingStyle, setNewDishCookingStyle] = useState('炭火现烤 (果木炭慢烘)');
  const [newDishCraftStandardNote, setNewDishCraftStandardNote] = useState('果木炭高温慢烤，外皮焦香锁住肉汁');
  const [newDishPrepTime, setNewDishPrepTime] = useState('约8m');
  const [newDishImageUrl, setNewDishImageUrl] = useState('https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80');

  // Channel overrides states (simulate multi-channel activation)
  const [channelOverrides, setChannelOverrides] = useState<Record<string, { dineIn: boolean; delivery: boolean; pickup: boolean }>>({
    'dish-1': { dineIn: true, delivery: true, pickup: true },
    'dish-2': { dineIn: true, delivery: false, pickup: false },
    'dish-3': { dineIn: true, delivery: true, pickup: true }
  });

  // Granular Toggle Single Channel for a Dish
  const toggleChannel = (dishId: string, channel: 'dineIn' | 'delivery' | 'pickup') => {
    const current = channelOverrides[dishId] || { dineIn: true, delivery: true, pickup: true };
    const updated = { ...current, [channel]: !current[channel] };
    const hasAnyActive = updated.dineIn || updated.delivery || updated.pickup;

    setChannelOverrides((prev) => ({ ...prev, [dishId]: updated }));

    const targetDish = dishes.find((d) => d.id === dishId);
    if (targetDish && onUpdateDish) {
      onUpdateDish({
        ...targetDish,
        available: hasAnyActive
      });
    }

    const channelNameMap = {
      delivery: '外卖',
      dineIn: '堂食',
      pickup: '自提'
    };
    const channelStateStr = updated[channel] ? '已开启在售' : '已沽清下架';
    showToast(`【${targetDish?.name || '菜品'}】${channelNameMap[channel]}渠道${channelStateStr}！`);
  };

  // One-click All Channels (In-Stock / Sold-Out) for a Single Dish
  const handleSetSingleDishAllChannels = (dish: DishItem, status: boolean) => {
    setChannelOverrides((prev) => ({
      ...prev,
      [dish.id]: { dineIn: status, delivery: status, pickup: status }
    }));
    if (onUpdateDish) {
      onUpdateDish({
        ...dish,
        available: status
      });
    }
    showToast(
      status
        ? `【${dish.name}】已一键全渠道上架在售（外卖、堂食、自提全开）！`
        : `【${dish.name}】已一键全渠道沽清（外卖、堂食、自提全关）！`
    );
  };

  // Bulk One-click In-Stock (All Channels On)
  const handleBulkAllInStock = (targets: DishItem[] = filteredDishes) => {
    if (targets.length === 0) {
      showToast('当前列表无菜品');
      return;
    }
    const newOverrides: Record<string, { dineIn: boolean; delivery: boolean; pickup: boolean }> = {};
    targets.forEach((d) => {
      newOverrides[d.id] = { dineIn: true, delivery: true, pickup: true };
      if (onUpdateDish) {
        onUpdateDish({ ...d, available: true });
      }
    });
    setChannelOverrides((prev) => ({ ...prev, ...newOverrides }));
    showToast(`已一键将 ${targets.length} 道菜品全渠道上架在售！`);
  };

  // Bulk One-click Out-of-Stock / Sold-Out (All Channels Off)
  const handleBulkAllSoldOut = (targets: DishItem[] = filteredDishes) => {
    if (targets.length === 0) {
      showToast('当前列表无菜品');
      return;
    }
    const newOverrides: Record<string, { dineIn: boolean; delivery: boolean; pickup: boolean }> = {};
    targets.forEach((d) => {
      newOverrides[d.id] = { dineIn: false, delivery: false, pickup: false };
      if (onUpdateDish) {
        onUpdateDish({ ...d, available: false });
      }
    });
    setChannelOverrides((prev) => ({ ...prev, ...newOverrides }));
    showToast(`已一键将 ${targets.length} 道菜品全渠道一键沽清！`);
  };

  const filteredDishes = dishes.filter((d) => {
    if (selectedCategory !== 'all' && d.category !== selectedCategory) return false;
    if (selectedSubCategory !== 'all' && d.subCategory && d.subCategory !== selectedSubCategory) return false;
    if (selectedTag !== 'all') {
      const qTag = selectedTag.toLowerCase();
      const matchTag =
        (d.flavorTags && d.flavorTags.some((t) => t.toLowerCase().includes(qTag))) ||
        (d.customTags && d.customTags.some((t) => t.toLowerCase().includes(qTag))) ||
        (d.typeTag && d.typeTag.toLowerCase().includes(qTag)) ||
        (d.badgeText && d.badgeText.toLowerCase().includes(qTag)) ||
        (d.subCategoryName && d.subCategoryName.toLowerCase().includes(qTag)) ||
        (d.flavor && d.flavor.toLowerCase().includes(qTag));
      if (!matchTag) return false;
    }
    if (statusFilter === 'available' && !d.available) return false;
    if (statusFilter === 'unavailable' && d.available) return false;
    if (cookingStyleFilter !== 'all') {
      if (!d.cookingStyle || !d.cookingStyle.includes(cookingStyleFilter)) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        d.name.toLowerCase().includes(q) ||
        d.enName.toLowerCase().includes(q) ||
        d.typeTag.toLowerCase().includes(q) ||
        (d.subCategoryName && d.subCategoryName.toLowerCase().includes(q)) ||
        (d.flavorTags && d.flavorTags.some((t) => t.toLowerCase().includes(q))) ||
        (d.customTags && d.customTags.some((t) => t.toLowerCase().includes(q))) ||
        (d.flavor && d.flavor.toLowerCase().includes(q)) ||
        (d.spicinessLevel && d.spicinessLevel.toLowerCase().includes(q)) ||
        (d.cookingStyle && d.cookingStyle.toLowerCase().includes(q)) ||
        (d.badgeText && d.badgeText.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Batch toggle helper
  const handleToggleSelectAll = () => {
    if (selectedDishIds.size === filteredDishes.length) {
      setSelectedDishIds(new Set());
    } else {
      setSelectedDishIds(new Set(filteredDishes.map((d) => d.id)));
    }
  };

  const handleToggleSelectDish = (id: string) => {
    setSelectedDishIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Execute Batch Edit Action
  const handleExecuteBatchAction = () => {
    if (selectedDishIds.size === 0) {
      showToast('请先勾选需要批量修改的菜品');
      return;
    }

    const newOverrides: Record<string, { dineIn: boolean; delivery: boolean; pickup: boolean }> = {};

    filteredDishes.forEach((dish) => {
      if (!selectedDishIds.has(dish.id)) return;

      let updatedDish = { ...dish };

      if (batchActionType === 'delivery_discount') {
        const dd = parseFloat(batchDeliveryDiscount) || undefined;
        updatedDish = {
          ...updatedDish,
          deliveryDiscount: dd,
          deliveryDiscountTag: batchDeliveryDiscountTag.trim() || (dd ? `外卖立减¥${dd}` : undefined),
          discountTag: batchDeliveryDiscountTag.trim() || (dd ? `外卖立减¥${dd}` : updatedDish.discountTag)
        };
      } else if (batchActionType === 'dinein_discount') {
        const did = parseFloat(batchDineInDiscount) || undefined;
        updatedDish = {
          ...updatedDish,
          dineInDiscount: did,
          dineInDiscountTag: batchDineInDiscountTag.trim() || (did ? `堂食立减¥${did}` : undefined)
        };
      } else if (batchActionType === 'price_adjust') {
        const offset = parseFloat(batchPriceOffset) || 0;
        const newP = Math.max(1, parseFloat((dish.price + offset).toFixed(2)));
        updatedDish = {
          ...updatedDish,
          prevPrice: dish.price,
          price: newP
        };
      } else if (batchActionType === 'spicy_flavor') {
        updatedDish = {
          ...updatedDish,
          spicinessLevel: batchSpicinessLevel,
          flavor: batchFlavor
        };
      } else if (batchActionType === 'flavor_tags') {
        let finalTags = dish.flavorTags ? [...dish.flavorTags] : [];
        if (batchFlavorTagMode === 'clear') {
          finalTags = [];
        } else if (batchFlavorTagMode === 'overwrite') {
          finalTags = [...batchFlavorTags];
        } else if (batchFlavorTagMode === 'append') {
          finalTags = Array.from(new Set([...finalTags, ...batchFlavorTags]));
        }
        updatedDish = {
          ...updatedDish,
          flavorTags: finalTags
        };
      } else if (batchActionType === 'cooking_style') {
        updatedDish = {
          ...updatedDish,
          cookingStyle: batchCookingStyle
        };
      } else if (batchActionType === 'availability') {
        if (batchAvailabilityMode === 'all_in_stock') {
          updatedDish = { ...updatedDish, available: true };
          newOverrides[dish.id] = { dineIn: true, delivery: true, pickup: true };
        } else if (batchAvailabilityMode === 'all_sold_out') {
          updatedDish = { ...updatedDish, available: false };
          newOverrides[dish.id] = { dineIn: false, delivery: false, pickup: false };
        } else if (batchAvailabilityMode === 'delivery_only') {
          updatedDish = { ...updatedDish, available: true };
          newOverrides[dish.id] = { dineIn: false, delivery: true, pickup: false };
        } else if (batchAvailabilityMode === 'dinein_only') {
          updatedDish = { ...updatedDish, available: true };
          newOverrides[dish.id] = { dineIn: true, delivery: false, pickup: false };
        } else if (batchAvailabilityMode === 'pickup_only') {
          updatedDish = { ...updatedDish, available: true };
          newOverrides[dish.id] = { dineIn: false, delivery: false, pickup: true };
        }
      }

      if (onUpdateDish) {
        onUpdateDish(updatedDish);
      }
    });

    if (Object.keys(newOverrides).length > 0) {
      setChannelOverrides((prev) => ({ ...prev, ...newOverrides }));
    }

    showToast(`成功批量更新 ${selectedDishIds.size} 道菜品的参数与规则！`);
    setIsBatchModalOpen(false);
    setSelectedDishIds(new Set());
  };

  // 1. Open Parameter Configuration Modal for Single Dish
  const openEditModal = (
    dish: DishItem,
    initialTab: 'parameters' | 'flavor_tags' | 'price_discount' | 'cooking_sop' | 'image' | 'barcode' | 'preview' | 'variants' = 'parameters'
  ) => {
    setEditingDish(dish);
    setEditActiveTab(initialTab);
    setEditVariants(dish.variants && dish.variants.length > 0 ? JSON.parse(JSON.stringify(dish.variants)) : []);
    setVariantImageModalTarget(null);
    setEditImageUrl(dish.imageUrl);
    setEditPrice(dish.price.toString());
    setEditOriginalPrice(dish.originalPrice ? dish.originalPrice.toString() : '');
    setEditPrevPrice(dish.prevPrice ? dish.prevPrice.toString() : '');
    setEditDeliveryDiscount(dish.deliveryDiscount !== undefined ? dish.deliveryDiscount.toString() : '');
    setEditDeliveryDiscountTag(dish.deliveryDiscountTag || (dish.deliveryDiscount ? `外卖立减¥${dish.deliveryDiscount}` : ''));
    setEditDineInDiscount(dish.dineInDiscount !== undefined ? dish.dineInDiscount.toString() : '');
    setEditDineInDiscountTag(dish.dineInDiscountTag || (dish.dineInDiscount ? `堂食立减¥${dish.dineInDiscount}` : ''));
    
    // Spiciness, Flavor and Cooking Style
    setEditSpicinessLevel(dish.spicinessLevel || '微辣 (推荐)');
    setEditSpicinessOptions(dish.spicinessOptions && dish.spicinessOptions.length > 0 ? dish.spicinessOptions : SPICINESS_PRESETS);
    setEditFlavor(dish.flavor || '秘制黑椒酱香');
    setEditFlavorOptions(dish.flavorOptions && dish.flavorOptions.length > 0 ? dish.flavorOptions : FLAVOR_PRESETS.slice(0, 5));
    setEditFlavorTags(dish.flavorTags && dish.flavorTags.length > 0 ? dish.flavorTags : []);
    setEditCookingStyle(dish.cookingStyle || '炭火现烤 (果木炭慢烘)');
    setEditCraftStandardNote(dish.craftStandardNote || '高温果木炭慢火烘烤，双面翻烤锁住汁水，出炉撒秘制调料');
    setEditBadgeText(dish.badgeText || '');
    setEditPrepTime(dish.prepTime || '约8m');
    setEditCustomFlavorInput('');
    setEditCustomSpiceInput('');
    setEditBarcode(dish.barcode || '');
    setIsListeningForBarcodeScan(false);
    setRightPreviewChannel('delivery');
    setRightActiveVariantIndex(-1);
    setPreviewStyleMode(initialTab === 'variants' || (dish.variants && dish.variants.length > 0) ? 'spec_modal' : 'spec_modal');
    setPreviewModalQuantity(1);
    setPreviewSelectedSpiciness(dish.spicinessLevel || '微辣 (推荐)');
    setPreviewSelectedFlavor(dish.flavor || '秘制黑椒酱香');
  };

  // Hardware Barcode Scanner auto-capture inside Dish Edit Modal
  React.useEffect(() => {
    if (!editingDish || !isListeningForBarcodeScan) return;
    const unsub = globalScannerEngine.subscribe((result) => {
      setEditBarcode(result.code);
      setIsListeningForBarcodeScan(false);
      showToast(`[扫码枪] 成功录入条形码: ${result.code}`);
    });
    return () => unsub();
  }, [editingDish, isListeningForBarcodeScan]);

  // Save single dish edits
  const handleSaveEdit = () => {
    if (!editingDish) return;
    const p = parseFloat(editPrice) || editingDish.price;
    const op = editOriginalPrice ? parseFloat(editOriginalPrice) : undefined;
    const pp = editPrevPrice ? parseFloat(editPrevPrice) : undefined;
    const dd = editDeliveryDiscount ? parseFloat(editDeliveryDiscount) : undefined;
    const did = editDineInDiscount ? parseFloat(editDineInDiscount) : undefined;

    const updated: DishItem = {
      ...editingDish,
      variants: editVariants && editVariants.length > 0 ? editVariants : undefined,
      imageUrl: editImageUrl.trim() || editingDish.imageUrl,
      price: p,
      originalPrice: op,
      prevPrice: pp,
      deliveryDiscount: dd,
      deliveryDiscountTag: editDeliveryDiscountTag.trim() || (dd ? `外卖立减¥${dd}` : undefined),
      dineInDiscount: did,
      dineInDiscountTag: editDineInDiscountTag.trim() || (did ? `堂食立减¥${did}` : undefined),
      discountTag: editDeliveryDiscountTag.trim() || (dd ? `外卖立减¥${dd}` : editingDish.discountTag),
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

    if (onUpdateDish) {
      onUpdateDish(updated);
    }
    setEditingDish(null);
    showToast(`【${updated.name}】参数、主图与规则已成功同步至前台！`);
  };

  // 2. Start Quick Clone Dish
  const handleStartCloneDish = (dish: DishItem) => {
    setCloningSourceDish(dish);
    setCloneDishName(`${dish.name} (复制)`);
    setCloneDishEnName(dish.enName ? `${dish.enName} (Copy)` : 'Specialty Creation');
    setCloneDishPrice(dish.price.toString());
    setCloneDishOriginalPrice(dish.originalPrice ? dish.originalPrice.toString() : '');
    setCloneDishPrevPrice(dish.prevPrice ? dish.prevPrice.toString() : '');
    setCloneDishDeliveryDiscount(dish.deliveryDiscount !== undefined ? dish.deliveryDiscount.toString() : '');
    setCloneDishDeliveryDiscountTag(dish.deliveryDiscountTag || '');
    setCloneDishDineInDiscount(dish.dineInDiscount !== undefined ? dish.dineInDiscount.toString() : '');
    setCloneDishDineInDiscountTag(dish.dineInDiscountTag || '');
    setCloneDishCategory(dish.category);
    setCloneDishSubCategory(dish.subCategory);
    setCloneDishSubCategoryName(dish.subCategoryName);
    setCloneDishSpicinessLevel(dish.spicinessLevel || '微辣 (推荐)');
    setCloneDishSpicinessOptions(dish.spicinessOptions && dish.spicinessOptions.length > 0 ? dish.spicinessOptions : SPICINESS_PRESETS);
    setCloneDishFlavor(dish.flavor || '青花椒藤椒风味');
    setCloneDishFlavorOptions(dish.flavorOptions && dish.flavorOptions.length > 0 ? dish.flavorOptions : FLAVOR_PRESETS.slice(0, 5));
    setCloneDishFlavorTags(dish.flavorTags && dish.flavorTags.length > 0 ? dish.flavorTags : []);
    setCloneDishCookingStyle(dish.cookingStyle || '炭火现烤 (果木炭慢烘)');
    setCloneDishCraftStandardNote(dish.craftStandardNote || '高温果木炭慢火烘烤，双面翻烤锁住汁水');
    setCloneDishBadgeText('新品复制');
    setCloneDishDescription(dish.description || '主厨独家配方现制');
    setCloneDishPrepTime(dish.prepTime || '约8m');
    setCloneDishImageUrl(dish.imageUrl);
  };

  // Confirm Quick Clone Dish & Create New
  const handleConfirmCloneDish = () => {
    if (!cloningSourceDish) return;
    if (!cloneDishName.trim()) {
      showToast('请输入复制后的菜品名称');
      return;
    }

    const priceNum = parseFloat(cloneDishPrice) || cloningSourceDish.price;
    const origPriceNum = cloneDishOriginalPrice ? parseFloat(cloneDishOriginalPrice) : undefined;
    const prevPriceNum = cloneDishPrevPrice ? parseFloat(cloneDishPrevPrice) : undefined;
    const delDiscNum = cloneDishDeliveryDiscount ? parseFloat(cloneDishDeliveryDiscount) : undefined;
    const dineDiscNum = cloneDishDineInDiscount ? parseFloat(cloneDishDineInDiscount) : undefined;

    const clonedDish: Partial<DishItem> = {
      id: `dish-clone-${Date.now()}`,
      name: cloneDishName.trim(),
      enName: cloneDishEnName.trim() || 'Artisan Recipe',
      price: priceNum,
      originalPrice: origPriceNum,
      prevPrice: prevPriceNum,
      deliveryDiscount: delDiscNum,
      deliveryDiscountTag: cloneDishDeliveryDiscountTag.trim() || (delDiscNum ? `外卖立减¥${delDiscNum}` : undefined),
      dineInDiscount: dineDiscNum,
      dineInDiscountTag: cloneDishDineInDiscountTag.trim() || (dineDiscNum ? `堂食立减¥${dineDiscNum}` : undefined),
      discountTag: cloneDishDeliveryDiscountTag.trim() || (delDiscNum ? `外卖立减¥${delDiscNum}` : undefined),
      category: cloneDishCategory,
      subCategory: cloneDishSubCategory,
      subCategoryName: cloneDishSubCategoryName,
      typeTag: '新品复制',
      badgeText: cloneDishBadgeText.trim() || undefined,
      description: cloneDishDescription || cloningSourceDish.description,
      prepTime: cloneDishPrepTime || '约8m',
      imageUrl: cloneDishImageUrl || cloningSourceDish.imageUrl,
      available: true,
      orderType: cloningSourceDish.orderType || 'both',
      optionGroups: cloningSourceDish.optionGroups ? JSON.parse(JSON.stringify(cloningSourceDish.optionGroups)) : undefined,
      nutrition: cloningSourceDish.nutrition,
      originSource: cloningSourceDish.originSource,
      chefNotes: cloningSourceDish.chefNotes,
      galleryImages: cloningSourceDish.galleryImages,
      spicinessLevel: cloneDishSpicinessLevel,
      spicinessOptions: cloneDishSpicinessOptions,
      flavor: cloneDishFlavor,
      flavorOptions: cloneDishFlavorOptions,
      flavorTags: cloneDishFlavorTags,
      cookingStyle: cloneDishCookingStyle,
      craftStandardNote: cloneDishCraftStandardNote,
      isCloned: true
    };

    onAddNewDish(clonedDish);
    showToast(`已成功基于【${cloningSourceDish.name}】快速复制并新建【${cloneDishName}】！`);
    setCloningSourceDish(null);
  };

  // 3. Create Brand New Dish from Scratch
  const handleCreateDish = () => {
    if (!newDishName.trim()) {
      showToast('请输入菜品名称');
      return;
    }
    const priceNum = parseFloat(newDishPrice) || 38.0;
    const origPriceNum = newDishOriginalPrice ? parseFloat(newDishOriginalPrice) : undefined;
    const prevPriceNum = newDishPrevPrice ? parseFloat(newDishPrevPrice) : undefined;
    const delDiscNum = newDishDeliveryDiscount ? parseFloat(newDishDeliveryDiscount) : undefined;
    const dineDiscNum = newDishDineInDiscount ? parseFloat(newDishDineInDiscount) : undefined;

    onAddNewDish({
      id: `dish-new-${Date.now()}`,
      name: newDishName,
      enName: newDishEnName || 'Artisan Street Creation',
      price: priceNum,
      originalPrice: origPriceNum,
      prevPrice: prevPriceNum,
      deliveryDiscount: delDiscNum,
      deliveryDiscountTag: newDishDeliveryDiscountTag.trim() || (delDiscNum ? `外卖立减¥${delDiscNum}` : undefined),
      dineInDiscount: dineDiscNum,
      dineInDiscountTag: newDishDineInDiscountTag.trim() || (dineDiscNum ? `堂食立减¥${dineDiscNum}` : undefined),
      discountTag: newDishDeliveryDiscountTag.trim() || (delDiscNum ? `外卖立减¥${delDiscNum}` : undefined),
      category: newDishCategory,
      typeTag: newDishTypeTag,
      description: '主厨匠心手作现制，严选新鲜食材，移动厨房现场炙烤。',
      prepTime: newDishPrepTime || '约8m',
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
      available: true,
      orderType: 'both',
      spicinessLevel: newDishSpicinessLevel,
      spicinessOptions: SPICINESS_PRESETS,
      flavor: newDishFlavor,
      flavorOptions: FLAVOR_PRESETS.slice(0, 5),
      flavorTags: newDishFlavorTags,
      cookingStyle: newDishCookingStyle,
      craftStandardNote: newDishCraftStandardNote
    });
    setIsAddModalOpen(false);
    setNewDishName('');
    showToast(`新品【${newDishName}】已配置参数并全渠道上架发布！`);
  };

  // Construct a preview dish for the edit modal
  const previewDish: DishItem | null = editingDish
    ? {
        ...editingDish,
        imageUrl: editImageUrl || editingDish.imageUrl,
        price: parseFloat(editPrice) || editingDish.price,
        originalPrice: editOriginalPrice ? parseFloat(editOriginalPrice) : undefined,
        prevPrice: editPrevPrice ? parseFloat(editPrevPrice) : undefined,
        deliveryDiscount: editDeliveryDiscount ? parseFloat(editDeliveryDiscount) : undefined,
        deliveryDiscountTag: editDeliveryDiscountTag.trim() || (editDeliveryDiscount ? `外卖立减¥${editDeliveryDiscount}` : undefined),
        dineInDiscount: editDineInDiscount ? parseFloat(editDineInDiscount) : undefined,
        dineInDiscountTag: editDineInDiscountTag.trim() || (editDineInDiscount ? `堂食立减¥${editDineInDiscount}` : undefined),
        spicinessLevel: editSpicinessLevel,
        flavor: editFlavor,
        flavorTags: editFlavorTags,
        cookingStyle: editCookingStyle,
        craftStandardNote: editCraftStandardNote,
        badgeText: editBadgeText,
        variants: editVariants
      }
    : null;

  // Render customer-facing Variant Selection Modal Preview ("选规格弹窗样式")
  const renderSpecModalPreview = (isFullWidth: boolean = false) => {
    if (!previewDish) return null;

    const selectedVariant =
      rightActiveVariantIndex >= 0 && editVariants[rightActiveVariantIndex]
        ? editVariants[rightActiveVariantIndex]
        : null;

    const basePrice = Number(editPrice) || previewDish.price;
    const currentPrice = selectedVariant ? selectedVariant.price : basePrice;
    const currentOrigPrice =
      selectedVariant?.originalPrice ??
      (editOriginalPrice ? Number(editOriginalPrice) : (previewDish.originalPrice || basePrice));

    const channel = rightPreviewChannel === 'compare' ? 'delivery' : rightPreviewChannel;
    const discount =
      channel === 'dine_in'
        ? (Number(editDineInDiscount) || 0)
        : (Number(editDeliveryDiscount) || 0);

    const discountTag =
      channel === 'dine_in'
        ? (editDineInDiscountTag || (editDineInDiscount ? `堂食立减¥${editDineInDiscount}` : ''))
        : (editDeliveryDiscountTag || (editDeliveryDiscount ? `外卖立减¥${editDeliveryDiscount}` : ''));

    const netPrice = Math.max(0, currentPrice - discount);
    const totalPrice = Math.max(0, netPrice * previewModalQuantity);

    const activeImage = selectedVariant?.imageUrl || editImageUrl || previewDish.imageUrl;
    const activeBadge = selectedVariant?.badgeText || selectedVariant?.imageStyle?.badgeText || editBadgeText;

    const spiceOptions = [
      '不辣 (原味)',
      '微辣 (推荐)',
      '中辣 (经典川香)',
      '重辣 (嗜辣专享)',
      '变态辣 (魔鬼椒)'
    ];

    const baseFlavorList =
      editFlavorOptions && editFlavorOptions.length > 0
        ? editFlavorOptions
        : ['秘制黑椒酱香', '金牌蒜香风味', '浓郁香辣调和', '孜然原汁原味'];

    // Ensure all flavor options are unique, avoiding duplicate keys and duplicate UI buttons
    const flavorOptions = Array.from(
      new Set([
        ...(editFlavor ? [editFlavor] : []),
        ...baseFlavorList
      ])
    ).filter(Boolean);

    return (
      <div className={`space-y-3 ${isFullWidth ? 'max-w-2xl mx-auto' : 'w-full'}`}>
        {/* Toast simulated notification */}
        {previewToastMessage && (
          <div className="bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              {previewToastMessage}
            </span>
            <button
              type="button"
              onClick={() => setPreviewToastMessage(null)}
              className="text-white/80 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Phone Container */}
        <div className="bg-white rounded-xl border border-neutral-300 shadow-md overflow-hidden flex flex-col">
          {/* Simulated Mobile Status Bar */}
          <div className="bg-neutral-900 text-neutral-300 px-4 py-1.5 text-[10px] flex items-center justify-between font-mono select-none">
            <span>9:41</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px]">5G</span>
              <span className="w-4 h-2 border border-neutral-400 rounded-[2px] inline-block relative p-[1px]">
                <span className="bg-emerald-400 h-full w-3/4 block rounded-[1px]"></span>
              </span>
            </div>
          </div>

          {/* Modal Title Bar */}
          <div className="px-3.5 py-2.5 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-600"></span>
              <span className="font-bold text-xs text-neutral-800">
                选规格与个性化定制
              </span>
              <span
                className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded ${
                  channel === 'delivery'
                    ? 'bg-sky-100 text-sky-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {channel === 'delivery' ? '🛵 外卖专送通道' : '🍽️ 堂食现场通道'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPreviewStyleMode('card')}
                className="text-[10px] text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                title="切换回菜品卡片样式"
              >
                切至卡片
              </button>
              <button
                type="button"
                onClick={() => setPreviewStyleMode('card')}
                className="text-neutral-400 hover:text-black p-0.5 rounded hover:bg-neutral-200 cursor-pointer"
                title="关闭弹窗 (返回卡片)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Modal Scrollable Body */}
          <div className="p-3.5 space-y-4 max-h-[540px] overflow-y-auto hide-scrollbar">
            {/* 1. Hero Product Card with Independent Variant Photo & Price */}
            <div className="flex gap-3 items-start pb-3 border-b border-neutral-100">
              {/* Product Photo */}
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden shrink-0 border border-neutral-200 bg-neutral-100 group">
                <img
                  src={activeImage}
                  alt={previewDish.name}
                  className={`w-full h-full ${getVariantFitClass(selectedVariant?.imageFit || selectedVariant?.imageStyle?.fitMode)} ${getVariantBorderClass(selectedVariant?.borderStyle || selectedVariant?.imageStyle?.borderStyle)} ${getVariantFilterClass(selectedVariant?.visualFilter || selectedVariant?.imageStyle?.filter)}`}
                />
                {activeBadge && (
                  <span
                    className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold shadow-xs bg-purple-600 text-white border border-purple-400"
                  >
                    {activeBadge}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() =>
                    setPreviewZoomDish({
                      ...previewDish,
                      imageUrl: activeImage,
                      name: `${previewDish.name}${selectedVariant ? ` - ${selectedVariant.name}` : ''}`
                    })
                  }
                  className="absolute bottom-1 right-1 p-1 bg-black/60 text-white rounded text-[9px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 cursor-pointer"
                  title="查看高清大图"
                >
                  <ZoomIn className="w-2.5 h-2.5" />
                </button>
              </div>

              {/* Product Info & Price Showcase */}
              <div className="min-w-0 flex-1 space-y-1.5">
                <div>
                  <h4 className="font-bold text-sm text-neutral-900 leading-tight">
                    {previewDish.name}
                    {selectedVariant && (
                      <span className="text-purple-700 font-semibold text-xs ml-1.5 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                        {selectedVariant.name}
                      </span>
                    )}
                  </h4>
                  {previewDish.enName && (
                    <p className="text-[10px] text-neutral-400 truncate mt-0.5">
                      {previewDish.enName}
                    </p>
                  )}
                </div>

                {/* Pricing & Discounts */}
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-red-600">¥</span>
                  <span className="text-xl font-black font-mono text-red-600">
                    {netPrice.toFixed(2)}
                  </span>
                  {currentOrigPrice > netPrice && (
                    <span className="text-xs text-neutral-400 line-through font-mono">
                      ¥{currentOrigPrice.toFixed(2)}
                    </span>
                  )}
                  {discount > 0 && (
                    <span className="text-[9.5px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1 rounded">
                      {discountTag || `立减¥${discount}`}
                    </span>
                  )}
                </div>

                {/* Selected Attributes Summary */}
                <div className="text-[10.5px] text-neutral-500 flex items-center gap-1.5 flex-wrap">
                  <span>已选:</span>
                  <span className="text-neutral-800 font-medium">
                    {selectedVariant ? selectedVariant.name : '标准默认规格'}
                  </span>
                  <span>·</span>
                  <span className="text-neutral-800 font-medium">
                    {previewSelectedSpiciness || editSpicinessLevel}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-neutral-500 pt-0.5">
                  <span className="flex items-center gap-0.5 text-emerald-700 font-medium">
                    <CheckCircle2 className="w-2.5 h-2.5" /> 现点现烤
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" /> {editPrepTime}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Variant Image Strip (if multiple variants have photos) */}
            {editVariants.some((v) => v.imageUrl) && (
              <div className="space-y-1.5">
                <div className="text-[10.5px] font-bold text-neutral-600 flex items-center justify-between">
                  <span>📸 独立规格实拍效果快速预览:</span>
                  <span className="text-[9.5px] text-purple-600">点击小图同步选中</span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
                  {/* Base standard thumbnail */}
                  <div
                    onClick={() => setRightActiveVariantIndex(-1)}
                    className={`shrink-0 w-14 h-14 rounded border p-0.5 cursor-pointer transition-all text-center ${
                      rightActiveVariantIndex === -1
                        ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-200'
                        : 'border-neutral-200 bg-neutral-50 hover:border-neutral-400'
                    }`}
                  >
                    <img
                      src={editImageUrl || previewDish.imageUrl}
                      alt="标准"
                      className="w-full h-8 object-cover rounded"
                    />
                    <div className="text-[8.5px] font-bold truncate mt-0.5 text-neutral-700">标准</div>
                  </div>

                  {editVariants.map((v, vIdx) => (
                    <div
                      key={`variant-thumb-${isFullWidth ? 'full' : 'drawer'}-${v.id || vIdx}-${vIdx}`}
                      onClick={() => setRightActiveVariantIndex(vIdx)}
                      className={`shrink-0 w-14 h-14 rounded border p-0.5 cursor-pointer transition-all text-center ${
                        rightActiveVariantIndex === vIdx
                          ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-200'
                          : 'border-neutral-200 bg-neutral-50 hover:border-neutral-400'
                      }`}
                    >
                      <img
                        src={v.imageUrl || editImageUrl || previewDish.imageUrl}
                        alt={v.name}
                        className={`w-full h-8 object-cover rounded ${getVariantFitClass(v.imageFit || v.imageStyle?.fitMode)} ${getVariantFilterClass(v.visualFilter || v.imageStyle?.filter)}`}
                      />
                      <div className="text-[8.5px] font-bold truncate mt-0.5 text-neutral-700">{v.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. SPECIFICATION / VARIANT SELECTION (规格变体选择) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-800 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-purple-600" />
                  <span>份量与规格选择</span>
                  <span className="text-[10px] text-neutral-400 font-normal">(必选一项)</span>
                </span>
                <span className="text-[10px] text-purple-700 font-medium">
                  {editVariants.length > 0 ? `共 ${editVariants.length + 1} 种规格可选` : '基础规格'}
                </span>
              </div>

              {/* Variant Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {/* Standard / Base Variant Button */}
                <button
                  type="button"
                  onClick={() => setRightActiveVariantIndex(-1)}
                  className={`p-2 rounded-lg border text-left cursor-pointer transition-all flex flex-col justify-between relative ${
                    rightActiveVariantIndex === -1
                      ? 'border-purple-600 bg-purple-50/70 shadow-xs ring-1 ring-purple-400'
                      : 'border-neutral-200 bg-white hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="font-bold text-xs text-neutral-900 leading-tight">
                      标准标配
                    </span>
                    {rightActiveVariantIndex === -1 && (
                      <span className="w-3.5 h-3.5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[9px] shrink-0">
                        ✓
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-baseline justify-between text-[10px]">
                    <span className="text-neutral-500">常规单份</span>
                    <span className="font-mono font-bold text-red-600">
                      ¥{basePrice.toFixed(2)}
                    </span>
                  </div>
                </button>

                {/* Custom Configured Variants */}
                {editVariants.map((variant, idx) => {
                  const isSelected = rightActiveVariantIndex === idx;
                  return (
                    <button
                      key={`variant-btn-${isFullWidth ? 'full' : 'drawer'}-${variant.id || idx}-${idx}`}
                      type="button"
                      onClick={() => setRightActiveVariantIndex(idx)}
                      className={`p-2 rounded-lg border text-left cursor-pointer transition-all flex flex-col justify-between relative ${
                        isSelected
                          ? 'border-purple-600 bg-purple-50/70 shadow-xs ring-1 ring-purple-400'
                          : 'border-neutral-200 bg-white hover:border-neutral-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-bold text-xs text-neutral-900 leading-tight truncate">
                          {variant.name}
                        </span>
                        {isSelected ? (
                          <span className="w-3.5 h-3.5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[9px] shrink-0">
                            ✓
                          </span>
                        ) : variant.isDefault ? (
                          <span className="text-[8.5px] bg-amber-100 text-amber-800 font-bold px-1 rounded">
                            推荐
                          </span>
                        ) : null}
                      </div>

                      {(variant.badgeText || variant.imageStyle?.badgeText) && (
                        <div className="my-0.5">
                          <span className="text-[8.5px] bg-purple-100 text-purple-800 px-1 py-0.2 rounded font-medium truncate max-w-full inline-block">
                            {variant.badgeText || variant.imageStyle?.badgeText}
                          </span>
                        </div>
                      )}

                      <div className="mt-1 flex items-baseline justify-between text-[10px]">
                        <span className="text-neutral-500 truncate text-[9px]">
                          {variant.imageUrl ? '📷 独立实拍' : '主图'}
                        </span>
                        <span className="font-mono font-bold text-red-600">
                          ¥{variant.price.toFixed(2)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* No variants hint */}
              {editVariants.length === 0 && (
                <div className="p-2 bg-purple-50/50 rounded border border-dashed border-purple-200 flex items-center justify-between text-[11px]">
                  <span className="text-neutral-600">
                    💡 当前菜品尚未添加副规格（如大份/双拼/升级套餐等）
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditActiveTab('variants')}
                    className="text-purple-700 hover:text-purple-900 font-bold flex items-center gap-0.5 cursor-pointer underline text-[10.5px]"
                  >
                    <span>+ 前往配置规格</span>
                  </button>
                </div>
              )}
            </div>

            {/* 3. SPICINESS PREFERENCE (辣度定制) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-800 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-red-500" />
                  <span>辣度偏好定制</span>
                </span>
                <span className="text-[10px] text-neutral-400 font-mono">
                  当前: {previewSelectedSpiciness || editSpicinessLevel}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {spiceOptions.map((opt, sIdx) => {
                  const isCurrent = (previewSelectedSpiciness || editSpicinessLevel) === opt;
                  return (
                    <button
                      key={`spice-${isFullWidth ? 'full' : 'drawer'}-${opt}-${sIdx}`}
                      type="button"
                      onClick={() => {
                        setPreviewSelectedSpiciness(opt);
                        setEditSpicinessLevel(opt);
                      }}
                      className={`px-2.5 py-1.5 rounded text-[11px] font-medium border text-center cursor-pointer transition-all flex items-center justify-center gap-1 ${
                        isCurrent
                          ? 'border-red-500 bg-red-50 text-red-700 font-bold shadow-2xs'
                          : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-700'
                      }`}
                    >
                      {isCurrent && <Check className="w-3 h-3 text-red-600" />}
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. FLAVOR / CONDIMENT PREFERENCE (风味定制) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-800 flex items-center gap-1">
                  <Utensils className="w-3.5 h-3.5 text-amber-600" />
                  <span>酱料与口味定制</span>
                </span>
                <span className="text-[10px] text-neutral-400 font-mono">
                  当前: {previewSelectedFlavor || editFlavor}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 gap-1.5">
                {flavorOptions.map((fOpt, fIdx) => {
                  const isCurrent = (previewSelectedFlavor || editFlavor) === fOpt;
                  return (
                    <button
                      key={`flavor-${isFullWidth ? 'full' : 'drawer'}-${fOpt}-${fIdx}`}
                      type="button"
                      onClick={() => {
                        setPreviewSelectedFlavor(fOpt);
                        setEditFlavor(fOpt);
                      }}
                      className={`px-2.5 py-1.5 rounded text-[11px] font-medium border text-center cursor-pointer transition-all flex items-center justify-center gap-1 ${
                        isCurrent
                          ? 'border-amber-600 bg-amber-50 text-amber-800 font-bold shadow-2xs'
                          : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-700'
                      }`}
                    >
                      {isCurrent && <Check className="w-3 h-3 text-amber-700" />}
                      <span className="truncate">{fOpt}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. CRAFT STANDARD & FLAVOR TAGS */}
            <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200 space-y-1.5 text-[10.5px]">
              <div className="flex items-center justify-between text-neutral-700 font-medium">
                <span className="flex items-center gap-1">
                  <ChefHat className="w-3 h-3 text-emerald-700" />
                  <span>工艺与出品标准:</span>
                </span>
                <span className="text-emerald-800 font-bold">{editCookingStyle}</span>
              </div>
              {editCraftStandardNote && (
                <p className="text-neutral-500 leading-relaxed pl-4">
                  {editCraftStandardNote}
                </p>
              )}
              {editFlavorTags.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap pt-1 pl-4">
                  {editFlavorTags.map((tag, tIdx) => (
                    <span
                      key={`tag-${isFullWidth ? 'full' : 'drawer'}-${tag}-${tIdx}`}
                      className="bg-amber-100/70 text-amber-900 px-1.5 py-0.5 rounded text-[9.5px] font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 6. QUANTITY STEPPER (购买数量步进器) */}
            <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-neutral-800">选购数量</div>
                <div className="text-[10px] text-neutral-400">单笔订购上限 99 份</div>
              </div>

              <div className="flex items-center gap-2 bg-neutral-100 p-1 rounded-lg border border-neutral-200">
                <button
                  type="button"
                  onClick={() => setPreviewModalQuantity((prev) => Math.max(1, prev - 1))}
                  className="w-7 h-7 rounded bg-white hover:bg-neutral-200 flex items-center justify-center font-bold text-neutral-700 shadow-2xs cursor-pointer active:scale-95 transition-all"
                  title="减少"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center font-mono font-bold text-sm text-neutral-900">
                  {previewModalQuantity}
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewModalQuantity((prev) => Math.min(99, prev + 1))}
                  className="w-7 h-7 rounded bg-white hover:bg-neutral-200 flex items-center justify-center font-bold text-neutral-700 shadow-2xs cursor-pointer active:scale-95 transition-all"
                  title="增加"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Sticky Modal Bottom Action Bar (吸底加购栏) */}
          <div className="p-3 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-baseline gap-1">
                <span className="text-xs text-neutral-500 font-medium">合计:</span>
                <span className="text-xs font-bold text-red-600">¥</span>
                <span className="text-lg font-black font-mono text-red-600">
                  {totalPrice.toFixed(2)}
                </span>
                {currentOrigPrice > netPrice && (
                  <span className="text-[10.5px] text-neutral-400 line-through font-mono">
                    ¥{(currentOrigPrice * previewModalQuantity).toFixed(2)}
                  </span>
                )}
              </div>
              <div className="text-[9.5px] text-neutral-500 truncate">
                {discount > 0 ? (
                  <span className="text-emerald-700 font-medium">
                    已享{channel === 'delivery' ? '外卖' : '堂食'}立减 ¥{(discount * previewModalQuantity).toFixed(2)}
                  </span>
                ) : (
                  <span>含选定规格及调味定制</span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const specName = selectedVariant ? selectedVariant.name : '标准标配';
                setPreviewToastMessage(`✨ 模拟加购成功：${previewDish.name} (${specName}) × ${previewModalQuantity} 份 已加入${channel === 'delivery' ? '外卖单' : '堂食单'}`);
                setTimeout(() => setPreviewToastMessage(null), 3000);
              }}
              className={`px-4 py-2.5 rounded-lg font-bold text-xs text-white shadow-md cursor-pointer active:scale-95 transition-all flex items-center gap-1.5 ${
                channel === 'delivery'
                  ? 'bg-sky-600 hover:bg-sky-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>
                {channel === 'delivery'
                  ? `加入外卖单 (${editPrepTime})`
                  : `确认堂食加点`}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 text-xs font-hanken">
      {/* Top Banner / Metrics Overview - Urban Radar Spec */}
      <div className="bg-[#ffffff] p-5 sm:p-6 rounded-2xl border border-[#e2e3e1] shadow-urban space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#006d36] animate-pulse shrink-0"></span>
            <span className="font-bold text-[#1a1c1b] text-base sm:text-lg tracking-tight">菜品参数与全渠道运营控制台</span>
          </div>

          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="bg-[#f4f4f2] text-[#1a1c1b] border border-[#e2e3e1] px-3 py-1 rounded-xl font-mono font-bold shrink-0">
              总菜品: {dishes.length}
            </span>
            <span className="bg-[#e6f4ea] text-[#006d36] border border-[#a8dab5] px-3 py-1 rounded-xl font-mono font-bold shrink-0">
              在售: {dishes.filter((d) => d.available).length}
            </span>
            <span className="bg-[#ffdad6] text-[#ba1a1a] border border-[#ffb4ab] px-3 py-1 rounded-xl font-mono font-bold shrink-0">
              沽清/待上架: {dishes.filter((d) => !d.available).length}
            </span>
            {dishes.some((d) => d.isCloned) && (
              <span className="bg-[#f4f4f2] text-[#1a1c1b] border border-[#e2e3e1] px-3 py-1 rounded-xl font-mono font-bold flex items-center gap-1 shrink-0">
                <Copy className="w-3 h-3 text-[#787770]" />
                <span>复制品: {dishes.filter((d) => d.isCloned).length}</span>
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons: Urban Radar High-Contrast Minimalist Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:items-center md:justify-end gap-2.5 pt-2 border-t border-[#e2e3e1]">
          <button
            type="button"
            disabled={isSyncingCloud}
            onClick={handleSyncAllDishesToCloud}
            className="w-full md:w-auto px-4 py-2.5 bg-[#006d36] hover:bg-[#005227] disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
            title="一键将本地全部菜品（含烧鸟与焗类新SKU）同步至腾讯云端数据库 shaokao-sku 集合"
          >
            <Cloud className={`w-3.5 h-3.5 shrink-0 ${isSyncingCloud ? 'animate-spin text-white' : 'text-white'}`} />
            <span className="truncate">
              {isSyncingCloud
                ? `云端同步中 ${syncProgress ? `(${syncProgress.current}/${syncProgress.total})` : '...'}`
                : '同步菜品到云端'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (onRematchAllImages) {
                onRematchAllImages();
              } else {
                const rematched = rematchAllDishImages(dishes);
                if (onUpdateDish) {
                  rematched.forEach((d) => onUpdateDish(d));
                }
                showToast(`已成功重新匹配全部 ${rematched.length} 道菜品的云端高清实拍美食图！`);
              }
            }}
            className="w-full md:w-auto px-3.5 py-2.5 bg-[#f4f4f2] hover:bg-[#eeeeec] text-[#1a1c1b] border border-[#e2e3e1] rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            title="一键将系统中所有菜品图源重置匹配为云端高清摄影图"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#787770] shrink-0" />
            <span className="truncate">重新匹配云端图片</span>
          </button>

          <button
            type="button"
            onClick={() => handleBulkAllInStock()}
            className="w-full md:w-auto px-3.5 py-2.5 bg-[#e6f4ea] hover:bg-[#c4dcbc] text-[#006d36] border border-[#a8dab5] rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            title="一键将当前筛选分类下的所有菜品全渠道上架在售"
          >
            <CheckCheck className="w-3.5 h-3.5 text-[#006d36] shrink-0" />
            <span className="truncate">一键全上架</span>
          </button>

          <button
            type="button"
            onClick={() => handleBulkAllSoldOut()}
            className="w-full md:w-auto px-3.5 py-2.5 bg-[#ffdad6] hover:bg-[#ffb4ab] text-[#ba1a1a] border border-[#ffb4ab] rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            title="一键将当前筛选分类下的所有菜品全渠道一键沽清"
          >
            <XCircle className="w-3.5 h-3.5 text-[#ba1a1a] shrink-0" />
            <span className="truncate">一键全沽清</span>
          </button>

          <button
            type="button"
            onClick={() => setIsBatchModalOpen(true)}
            className="w-full md:w-auto px-3.5 py-2.5 bg-[#f4f4f2] hover:bg-[#eeeeec] text-[#1a1c1b] rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-[#e2e3e1] whitespace-nowrap"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 shrink-0 text-[#787770]" />
            <span className="truncate">
              批量操作 {selectedDishIds.size > 0 ? `(${selectedDishIds.size})` : ''}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="w-full md:w-auto px-4 py-2.5 bg-[#000000] hover:bg-neutral-800 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">新建菜品</span>
          </button>
        </div>
      </div>

      {/* Filter Bar - Urban Radar Spec */}
      <div className="bg-[#ffffff] p-5 rounded-2xl border border-[#e2e3e1] shadow-urban space-y-3.5">
        {/* Row 1: Category horizontal tabs */}
        <div className="relative">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar scroll-smooth">
            {[
              { id: 'all', label: '全部类目', count: dishes.length },
              { id: 'yakitori', label: '🍢 日式烧鸟', count: dishes.filter((d) => d.category === 'yakitori').length },
              { id: 'baked', label: '🧀 芝士焗类', count: dishes.filter((d) => d.category === 'baked').length },
              { id: 'skewers', label: '🍢 炭烤串串', count: dishes.filter((d) => d.category === 'skewers').length },
              { id: 'western', label: '🥩 精致西餐', count: dishes.filter((d) => d.category === 'western').length },
              { id: 'mains', label: '🍜 主食简餐', count: dishes.filter((d) => d.category === 'mains').length },
              { id: 'drinks', label: '🥤 特调冷萃', count: dishes.filter((d) => d.category === 'drinks').length },
              { id: 'desserts', label: '🍰 手作甜品', count: dishes.filter((d) => d.category === 'desserts').length },
              { id: 'snacks', label: '🧆 风味小吃', count: dishes.filter((d) => d.category === 'snacks').length }
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setSelectedSubCategory('all');
                  setSelectedTag('all');
                }}
                className={`px-3.5 py-1.5 rounded-full font-bold transition-all cursor-pointer shrink-0 text-xs flex items-center gap-2 whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? 'bg-[#000000] text-white shadow-xs'
                    : 'bg-[#f4f4f2] text-[#474741] hover:bg-[#eeeeec]'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10.5px] px-1.5 py-0.2 rounded-full font-mono ${
                    selectedCategory === cat.id ? 'bg-white/20 text-white' : 'bg-[#e2e3e1] text-[#1a1c1b]'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Search Input & Filter Dropdowns */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          {/* Search Input - full width on mobile */}
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#787770]" />
            <input
              type="text"
              placeholder="搜索品名 / 口味 / 烹饪风格 / 标签..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-[#f9f9f7] border border-[#c8c7be] rounded-xl text-xs focus:outline-none focus:border-[#000000] text-[#1a1c1b] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#787770] hover:text-black text-xs cursor-pointer p-0.5"
                title="清空搜索"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="grid grid-cols-2 md:flex items-center gap-2.5 shrink-0">
            {/* Cooking Style Filter */}
            <select
              value={cookingStyleFilter}
              onChange={(e) => setCookingStyleFilter(e.target.value)}
              className="w-full md:w-auto px-3 py-2 bg-[#f9f9f7] border border-[#c8c7be] rounded-xl text-xs text-[#1a1c1b] font-medium focus:outline-none focus:border-[#000000] cursor-pointer"
            >
              <option value="all">全部制作风格</option>
              <option value="炭火现烤">炭火现烤</option>
              <option value="远红外炙烤">远红外炙烤</option>
              <option value="高压微炸">高压微炸</option>
              <option value="铁板生煎">铁板生煎</option>
              <option value="先卤后烤">先卤后烤</option>
              <option value="低温慢煮">低温慢煮</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full md:w-auto px-3 py-2 bg-[#f9f9f7] border border-[#c8c7be] rounded-xl text-xs text-[#1a1c1b] font-medium focus:outline-none focus:border-[#000000] cursor-pointer"
            >
              <option value="all">全部状态</option>
              <option value="available">仅在售</option>
              <option value="unavailable">仅沽清/待上架</option>
            </select>
          </div>
        </div>

        {/* Subcategories & Tag Filter Row */}
        <div className="pt-2.5 border-t border-[#e2e3e1] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          {/* Subcategory selection when applicable */}
          {selectedCategory !== 'all' && CATEGORY_TAXONOMY[selectedCategory as CategoryType]?.subCategories && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar shrink-0">
              <span className="text-[11px] font-bold text-[#787770] shrink-0">细分:</span>
              <button
                type="button"
                onClick={() => setSelectedSubCategory('all')}
                className={`px-3 py-1 rounded-full text-[11px] font-bold cursor-pointer shrink-0 whitespace-nowrap transition-colors ${
                  selectedSubCategory === 'all'
                    ? 'bg-[#006d36] text-white shadow-xs'
                    : 'bg-[#f4f4f2] text-[#474741] hover:bg-[#eeeeec]'
                }`}
              >
                全部细分
              </button>
              {CATEGORY_TAXONOMY[selectedCategory as CategoryType]?.subCategories?.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSelectedSubCategory(sub.id)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer shrink-0 flex items-center gap-1 whitespace-nowrap ${
                    selectedSubCategory === sub.id
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  <span>{sub.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Quick Tag Filter Chips */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar flex-nowrap whitespace-nowrap shrink-0">
            <span className="text-[11px] font-bold text-[#787774] flex items-center gap-0.5 shrink-0 whitespace-nowrap">
              <Tag className="w-3 h-3 text-[#787774]" />
              <span className="whitespace-nowrap">标签:</span>
            </span>
            {[
              { id: 'all', label: '全部' },
              { id: '日式烧鸟', label: '日式烧鸟' },
              { id: '备长炭烤', label: '备长炭烤' },
              { id: '珍稀部位', label: '珍稀部位' },
              { id: '芝士焗类', label: '芝士焗类' },
              { id: '焗烤海鲜', label: '焗烤海鲜' },
              { id: '金黄拉丝', label: '金黄拉丝' },
              { id: '和牛焗饭', label: '和牛焗饭' },
              { id: '招牌炭烤', label: '招牌炭烤' }
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTag(t.id)}
                className={`px-1.5 py-0.5 rounded text-[10.5px] cursor-pointer transition-colors shrink-0 whitespace-nowrap ${
                  selectedTag === t.id
                    ? 'bg-amber-600 text-white font-bold'
                    : 'bg-amber-50/70 text-amber-900 border border-amber-200/80 hover:bg-amber-100'
                }`}
              >
                #{t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Dishes Table (Desktop) & Card List (Mobile) */}
      <div className="bg-white rounded-[3px] border border-[#e6e6e4] overflow-hidden shadow-2xs">
        {/* Table Header (Desktop) */}
        <div className="hidden lg:grid grid-cols-12 gap-2 px-3 py-2 bg-[#f7f7f5] border-b border-[#e6e6e4] font-bold text-[#787774] text-[11px] select-none items-center">
          <div className="col-span-4 flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="cursor-pointer text-[#787774] hover:text-black p-0.5"
              title={selectedDishIds.size === filteredDishes.length ? '取消全选' : '全选当页菜品'}
            >
              {selectedDishIds.size > 0 && selectedDishIds.size === filteredDishes.length ? (
                <CheckSquare className="w-3.5 h-3.5 text-[#2b593f]" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
            </button>
            <span>菜品基本信息与主图</span>
          </div>

          <div className="col-span-2 text-center">
            <span>🌶️ 指定参数 (辣度 / 口味 / 制作风格)</span>
          </div>

          <div className="col-span-2 text-right pr-2">
            <span>💰 售价与优惠</span>
          </div>

          <div className="col-span-4 text-center">
            <span>🛵 渠道在售与沽清状态 / 快捷配置</span>
          </div>
        </div>

        {/* Dish List */}
        <div className="divide-y divide-[#f1f1ef]">
          {filteredDishes.length === 0 ? (
            <div className="p-8 text-center text-[#9b9a97] space-y-2">
              <Info className="w-8 h-8 mx-auto text-[#d3d1cb]" />
              <p>暂无符合条件的菜品数据</p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  setStatusFilter('all');
                  setCookingStyleFilter('all');
                  setSearchQuery('');
                }}
                className="text-xs text-[#2b593f] underline cursor-pointer"
              >
                重置所有筛选
              </button>
            </div>
          ) : (
            filteredDishes.map((dish) => {
              const ch = channelOverrides[dish.id] || { dineIn: true, delivery: true, pickup: true };
              const isSelected = selectedDishIds.has(dish.id);
              const hasAnyActiveChannel = ch.dineIn || ch.delivery || ch.pickup;

              return (
                <div
                  key={dish.id}
                  className={`p-3 transition-colors ${
                    isSelected ? 'bg-emerald-50/40' : 'hover:bg-[#fafaf8]'
                  }`}
                >
                  {/* Desktop Layout */}
                  <div className="hidden lg:grid grid-cols-12 gap-2 items-center">
                    {/* 1. Dish Info & Thumbnail with Quick Replace Button */}
                    <div className="col-span-4 flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggleSelectDish(dish.id)}
                        className="cursor-pointer text-[#787774] hover:text-black shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-3.5 h-3.5 text-[#2b593f]" />
                        ) : (
                          <Square className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <div className="relative w-12 h-12 rounded-[3px] overflow-hidden shrink-0 border border-[#e6e6e4] bg-[#eeeeec] group">
                        <img
                          src={dish.imageUrl}
                          alt={dish.name}
                          onClick={() => setPreviewZoomDish(dish)}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 cursor-pointer"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          title="点击放大预览高清原图"
                        />
                        {/* Hover Overlay with Replace Image Trigger */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition-opacity">
                          <button
                            type="button"
                            onClick={() => setUploadModalDish(dish)}
                            className="p-1 bg-white/90 hover:bg-white text-neutral-800 rounded-full cursor-pointer transition-all shadow-xs"
                            title="更换/上传菜品图片"
                          >
                            <Camera className="w-3 h-3 text-sky-600" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewZoomDish(dish)}
                            className="p-1 bg-white/90 hover:bg-white text-neutral-800 rounded-full cursor-pointer transition-all shadow-xs"
                            title="放大查看原图"
                          >
                            <ZoomIn className="w-3 h-3 text-neutral-800" />
                          </button>
                        </div>
                        {dish.deliveryDiscount ? (
                          <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[7.5px] font-black px-1 rounded-full scale-90 z-10 pointer-events-none">
                            外减
                          </span>
                        ) : null}
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-[#37352f] truncate">{dish.name}</span>
                          {dish.badgeText && (
                            <span className="text-[9px] bg-amber-50 text-amber-800 border border-amber-200 px-1 rounded font-semibold">
                              {dish.badgeText}
                            </span>
                          )}
                          {dish.isCloned && (
                            <span className="text-[9px] bg-purple-50 text-purple-700 border border-purple-200 px-1 rounded font-semibold flex items-center gap-0.5">
                              <Copy className="w-2.5 h-2.5" />
                              <span>复制品</span>
                            </span>
                          )}
                          {!hasAnyActiveChannel && (
                            <span className="text-[9px] bg-red-50 text-red-700 border border-red-200 px-1 rounded font-bold">
                              全渠道沽清
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-[#787774] flex-wrap">
                          <span className="truncate">{dish.enName}</span>
                          <span className="text-[#9b9a97] font-mono shrink-0">⏱️ {dish.prepTime}</span>
                          {dish.variants && dish.variants.length > 0 && (
                            <button
                              type="button"
                              onClick={() => openEditModal(dish, 'variants')}
                              className="text-[9px] bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 px-1 py-0.2 rounded font-bold flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
                              title={`共配置 ${dish.variants.length} 个规格变体，点击立即管理`}
                            >
                              <Layers className="w-2.5 h-2.5 text-purple-600" />
                              <span>{dish.variants.length}变体</span>
                            </button>
                          )}
                          {dish.barcode && (
                            <span
                              className="text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-1 py-0.2 rounded font-mono font-bold flex items-center gap-0.5 shrink-0"
                              title={`扫码枪条码: ${dish.barcode}`}
                            >
                              <Barcode className="w-2.5 h-2.5 text-emerald-700" />
                              <span>{dish.barcode}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 2. Specified Parameters: Spiciness, Flavor, Cooking Style */}
                    <div className="col-span-2 flex flex-col items-center justify-center gap-1 text-[10px]">
                      {/* Spiciness & Flavor pill */}
                      <div className="flex items-center gap-1 flex-wrap justify-center">
                        <span className="bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                          <Flame className="w-2.5 h-2.5 text-red-500" />
                          <span>{dish.spicinessLevel || '微辣'}</span>
                        </span>
                        <span className="bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded font-medium truncate max-w-[100px]" title={dish.flavor}>
                          {dish.flavor || '秘制黑椒'}
                        </span>
                      </div>

                      {/* Cooking Style & SOP pill */}
                      <div className="flex items-center gap-1">
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5 text-[9.5px]">
                          <ChefHat className="w-2.5 h-2.5 text-emerald-600" />
                          <span className="truncate max-w-[120px]">{dish.cookingStyle || '炭火现烤'}</span>
                        </span>
                      </div>

                      {/* Flavor Tags */}
                      {dish.flavorTags && dish.flavorTags.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap justify-center max-w-[160px] pt-0.5">
                          {dish.flavorTags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="bg-amber-100/90 text-amber-950 border border-amber-300 px-1 py-0.2 rounded text-[8.5px] font-semibold"
                            >
                              #{tag}
                            </span>
                          ))}
                          {dish.flavorTags.length > 2 && (
                            <span className="text-[8px] text-amber-800 font-mono font-bold">
                              +{dish.flavorTags.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 3. Price & Discount Rules */}
                    <div className="col-span-2 text-right pr-2 space-y-0.5 font-mono">
                      <div className="font-bold text-xs text-[#2b593f]">
                        现售: ¥{dish.price.toFixed(2)}
                      </div>
                      {dish.variants && dish.variants.length > 0 && (
                        <div
                          className="text-[9.5px] text-purple-700 font-sans font-bold cursor-pointer hover:underline"
                          onClick={() => openEditModal(dish, 'variants')}
                          title="点击管理各规格变体独立价格"
                        >
                          变体: ¥{Math.min(...dish.variants.map((v) => v.price)).toFixed(0)}~¥{Math.max(...dish.variants.map((v) => v.price)).toFixed(0)}
                        </div>
                      )}
                      {dish.originalPrice && (
                        <div className="text-[10px] text-[#9b9a97] line-through">
                          原价: ¥{dish.originalPrice.toFixed(2)}
                        </div>
                      )}
                      {dish.deliveryDiscount ? (
                        <div className="text-[9.5px] text-sky-700 font-sans font-medium">
                          {dish.deliveryDiscountTag || `外卖减¥${dish.deliveryDiscount}`}
                        </div>
                      ) : null}
                    </div>

                    {/* 4. Granular Channel Availability & Action Buttons */}
                    <div className="col-span-4 flex items-center justify-end gap-1.5 flex-wrap">
                      {/* 3 Channel Buttons */}
                      <div className="flex items-center gap-1 bg-[#f7f7f5] p-1 rounded-[3px] border border-[#e6e6e4]">
                        {/* Delivery Button */}
                        <button
                          type="button"
                          onClick={() => toggleChannel(dish.id, 'delivery')}
                          className={`px-1.5 py-0.5 rounded-[2px] font-bold text-[10px] flex items-center gap-0.5 cursor-pointer transition-all border ${
                            ch.delivery
                              ? 'bg-sky-50 text-sky-800 border-sky-300 hover:bg-sky-100'
                              : 'bg-neutral-100 text-neutral-400 border-neutral-200 hover:border-neutral-300'
                          }`}
                          title="外卖渠道在售/沽清切换"
                        >
                          <Bike className="w-2.5 h-2.5" />
                          <span>外卖:{ch.delivery ? '在售' : '沽清'}</span>
                        </button>

                        {/* Dine-In Button */}
                        <button
                          type="button"
                          onClick={() => toggleChannel(dish.id, 'dineIn')}
                          className={`px-1.5 py-0.5 rounded-[2px] font-bold text-[10px] flex items-center gap-0.5 cursor-pointer transition-all border ${
                            ch.dineIn
                              ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                              : 'bg-neutral-100 text-neutral-400 border-neutral-200 hover:border-neutral-300'
                          }`}
                          title="堂食渠道在售/沽清切换"
                        >
                          <Utensils className="w-2.5 h-2.5" />
                          <span>堂食:{ch.dineIn ? '在售' : '沽清'}</span>
                        </button>

                        {/* Pickup Button */}
                        <button
                          type="button"
                          onClick={() => toggleChannel(dish.id, 'pickup')}
                          className={`px-1.5 py-0.5 rounded-[2px] font-bold text-[10px] flex items-center gap-0.5 cursor-pointer transition-all border ${
                            ch.pickup
                              ? 'bg-purple-50 text-purple-800 border-purple-300 hover:bg-purple-100'
                              : 'bg-neutral-100 text-neutral-400 border-neutral-200 hover:border-neutral-300'
                          }`}
                          title="自提渠道在售/沽清切换"
                        >
                          <ShoppingBag className="w-2.5 h-2.5" />
                          <span>自提:{ch.pickup ? '在售' : '沽清'}</span>
                        </button>
                      </div>

                      {/* One-Click In-Stock / Sold-Out Switch */}
                      <button
                        type="button"
                        onClick={() => handleSetSingleDishAllChannels(dish, !hasAnyActiveChannel)}
                        className={`px-2 py-1 rounded-[2px] font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all border ${
                          hasAnyActiveChannel
                            ? 'bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border-red-200 shadow-2xs'
                            : 'bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border-emerald-300 shadow-2xs'
                        }`}
                        title={hasAnyActiveChannel ? '一键将外卖、堂食、自提全部沽清' : '一键将外卖、堂食、自提全部上架'}
                      >
                        <Power className="w-2.5 h-2.5" />
                        <span>{hasAnyActiveChannel ? '一键沽清' : '一键上架'}</span>
                      </button>

                      {/* Variants Trigger Button */}
                      <button
                        type="button"
                        onClick={() => openEditModal(dish, 'variants')}
                        className={`px-1.5 py-1 rounded-[2px] font-semibold text-[10px] flex items-center gap-0.5 cursor-pointer transition-all border ${
                          dish.variants && dish.variants.length > 0
                            ? 'bg-purple-100 hover:bg-purple-600 text-purple-900 hover:text-white border-purple-300 font-bold'
                            : 'bg-purple-50/60 hover:bg-purple-100 text-purple-700 border-purple-200'
                        }`}
                        title="设置菜品各规格变体的独立图片样式、替换上传与独立定价"
                      >
                        <Layers className="w-2.5 h-2.5" />
                        <span>变体{dish.variants && dish.variants.length > 0 ? `(${dish.variants.length})` : ''}</span>
                      </button>

                      {/* Configure Modal Trigger */}
                      <button
                        type="button"
                        onClick={() => openEditModal(dish)}
                        className="px-2.5 py-1 bg-[#000000] hover:bg-neutral-800 text-white rounded-lg font-bold text-[10.5px] flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                        title="设置单品参数、立减规则、更换主图与条形码"
                      >
                        <Sliders className="w-2.5 h-2.5" />
                        <span>参数与规则</span>
                      </button>

                      {/* Replace Image Trigger */}
                      <button
                        type="button"
                        onClick={() => setUploadModalDish(dish)}
                        className="px-1.5 py-1 bg-sky-50 hover:bg-sky-600 text-sky-700 hover:text-white rounded-[2px] font-semibold text-[10px] flex items-center gap-0.5 cursor-pointer transition-all border border-sky-200"
                        title="上传本地图片或选择精选高清美食实拍图"
                      >
                        <Upload className="w-2.5 h-2.5" />
                        <span>换图</span>
                      </button>

                      {/* Quick Clone Trigger */}
                      <button
                        type="button"
                        onClick={() => handleStartCloneDish(dish)}
                        className="px-1.5 py-1 bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white rounded-[2px] font-semibold text-[10px] flex items-center gap-0.5 cursor-pointer transition-all border border-purple-200"
                        title="快速复制该菜品"
                      >
                        <Copy className="w-2.5 h-2.5" />
                        <span>复制</span>
                      </button>
                    </div>
                  </div>

                  {/* Mobile Layout Card */}
                  <div className="lg:hidden space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleToggleSelectDish(dish.id)}
                        className="cursor-pointer text-[#787774] mt-1 shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-[#2b593f]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>

                      <div className="relative w-14 h-14 rounded-[3px] overflow-hidden shrink-0 border border-[#e6e6e4] bg-[#eeeeec] group">
                        <img
                          src={dish.imageUrl}
                          alt={dish.name}
                          onClick={() => setPreviewZoomDish(dish)}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 cursor-pointer"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          title="点击放大预览高清原图"
                        />
                        <button
                          type="button"
                          onClick={() => setUploadModalDish(dish)}
                          className="absolute bottom-0.5 right-0.5 p-1 bg-black/60 text-white rounded-full text-[8px] flex items-center justify-center cursor-pointer shadow-xs"
                          title="更换图片"
                        >
                          <Camera className="w-2.5 h-2.5" />
                        </button>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-xs text-[#37352f] truncate">{dish.name}</span>
                          <span className="font-mono font-bold text-xs text-[#2b593f]">
                            ¥{dish.price.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#787774] truncate">{dish.enName}</p>

                        {/* Specified Parameters Tags */}
                        <div className="flex items-center gap-1 flex-wrap mt-1">
                          <span className="text-[9.5px] bg-red-50 text-red-700 border border-red-200 px-1 rounded font-medium">
                            🌶️ {dish.spicinessLevel || '微辣'}
                          </span>
                          <span className="text-[9.5px] bg-amber-50 text-amber-800 border border-amber-200 px-1 rounded font-medium">
                            {dish.flavor || '秘制黑椒'}
                          </span>
                          <span className="text-[9.5px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-1 rounded font-medium">
                            🍳 {dish.cookingStyle || '炭火现烤'}
                          </span>
                          {dish.isCloned && (
                            <span className="text-[9.5px] bg-purple-50 text-purple-700 border border-purple-200 px-1 rounded font-semibold">
                              📑 复制品
                            </span>
                          )}
                          {dish.barcode && (
                            <span className="text-[9.5px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-1 rounded font-mono font-bold flex items-center gap-0.5">
                              <Barcode className="w-2.5 h-2.5 text-emerald-700" />
                              <span>{dish.barcode}</span>
                            </span>
                          )}
                          {dish.flavorTags && dish.flavorTags.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap w-full mt-0.5">
                              {dish.flavorTags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[9px] bg-amber-100/90 text-amber-950 border border-amber-300 px-1 py-0.2 rounded font-semibold"
                                >
                                  #{tag}
                                </span>
                              ))}
                              {dish.flavorTags.length > 3 && (
                                <span className="text-[8px] text-amber-800 font-mono font-bold">
                                  +{dish.flavorTags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Mobile Action Buttons: 3 Channels & Quick Controls */}
                    <div className="space-y-1.5 pt-1.5 border-t border-[#f1f1ef]">
                      {/* Channels row */}
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1 flex-1">
                          <button
                            type="button"
                            onClick={() => toggleChannel(dish.id, 'delivery')}
                            className={`flex-1 py-1 rounded text-[10px] font-bold border text-center ${
                              ch.delivery ? 'bg-sky-50 text-sky-800 border-sky-300' : 'bg-[#f1f1ef] text-[#9b9a97] border-neutral-200'
                            }`}
                          >
                            外卖:{ch.delivery ? '在售' : '沽清'}
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleChannel(dish.id, 'dineIn')}
                            className={`flex-1 py-1 rounded text-[10px] font-bold border text-center ${
                              ch.dineIn ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-[#f1f1ef] text-[#9b9a97] border-neutral-200'
                            }`}
                          >
                            堂食:{ch.dineIn ? '在售' : '沽清'}
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleChannel(dish.id, 'pickup')}
                            className={`flex-1 py-1 rounded text-[10px] font-bold border text-center ${
                              ch.pickup ? 'bg-purple-50 text-purple-800 border-purple-300' : 'bg-[#f1f1ef] text-[#9b9a97] border-neutral-200'
                            }`}
                          >
                            自提:{ch.pickup ? '在售' : '沽清'}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSetSingleDishAllChannels(dish, !hasAnyActiveChannel)}
                          className={`px-2 py-1 rounded text-[10px] font-bold border ${
                            hasAnyActiveChannel
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          }`}
                        >
                          {hasAnyActiveChannel ? '一键沽清' : '一键上架'}
                        </button>
                      </div>

                      {/* Operation buttons */}
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => openEditModal(dish, 'variants')}
                          className={`px-2 py-1 rounded border text-[10px] font-semibold flex items-center gap-0.5 cursor-pointer ${
                            dish.variants && dish.variants.length > 0
                              ? 'bg-purple-100 text-purple-900 border-purple-300 font-bold'
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}
                        >
                          <Layers className="w-2.5 h-2.5" />
                          <span>变体{dish.variants && dish.variants.length > 0 ? `(${dish.variants.length})` : ''}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setUploadModalDish(dish)}
                          className="px-2 py-1 bg-sky-50 text-sky-700 rounded border border-sky-200 text-[10px] font-semibold flex items-center gap-0.5"
                        >
                          <Upload className="w-2.5 h-2.5" />
                          <span>换图</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(dish)}
                          className="px-2 py-1 bg-[#000000] text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-xs"
                        >
                          <Sliders className="w-2.5 h-2.5" />
                          <span>参数与规则</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartCloneDish(dish)}
                          className="px-2 py-1 bg-purple-50 text-purple-700 rounded border border-purple-200 text-[10px] font-semibold flex items-center gap-0.5"
                        >
                          <Copy className="w-2.5 h-2.5" />
                          <span>复制</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal 1: 单品参数与运营规则配置弹窗 (Urban Radar Redesigned Modal) */}
      {editingDish && (
        <DishParameterRulesModal
          dish={editingDish}
          initialTab={editActiveTab as any}
          onClose={() => setEditingDish(null)}
          onSave={(updatedDish) => {
            if (onUpdateDish) {
              onUpdateDish(updatedDish);
            }
            setEditingDish(null);
            showToast(`【${updatedDish.name}】参数、主图与运营规则已成功同步至前台！`);
          }}
          showToast={showToast}
          onPreviewZoom={(dish) => setPreviewZoomDish(dish)}
          onOpenUploadModal={(dish) => setUploadModalDish(dish)}
        />
      )}

      {/* Modal 2: 快速复制并新建菜品弹窗 (Quick Clone & Create Modal) */}
      {cloningSourceDish && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-xl rounded-[4px] border border-[#d3d1cb] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[94vh] flex flex-col">
            {/* Header */}
            <div className="p-3.5 bg-[#f7f7f5] border-b border-[#e6e6e4] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Copy className="w-4 h-4 text-purple-600" />
                <span className="font-bold text-sm text-[#37352f]">
                  基于【{cloningSourceDish.name}】快速复制并新建商品
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCloningSourceDish(null)}
                className="text-[#787774] hover:text-black cursor-pointer p-1 rounded hover:bg-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Source Overview Banner */}
            <div className="p-3 bg-purple-50/60 border-b border-purple-100 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded overflow-hidden shrink-0 border border-purple-200 bg-[#eeeeec]">
                  <img
                    src={cloningSourceDish.imageUrl}
                    alt={cloningSourceDish.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="font-bold text-xs text-purple-950">
                    原版商品: {cloningSourceDish.name} (¥{cloningSourceDish.price.toFixed(2)})
                  </div>
                  <div className="text-[10px] text-purple-700">
                    已自动克隆原始规格配料、图片素材与工艺参数，您可直接微调后立即新建。
                  </div>
                </div>
              </div>

              <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-bold shrink-0">
                1秒极速建档
              </span>
            </div>

            {/* Clone Form Body */}
            <div className="p-4 space-y-3.5 text-xs overflow-y-auto flex-1 hide-scrollbar">
              {/* New Dish Name with Suffix Fast Buttons */}
              <div className="space-y-1.5">
                <label className="font-semibold text-[#5a5854] block">新菜品名称 *:</label>
                <input
                  type="text"
                  value={cloneDishName}
                  onChange={(e) => setCloneDishName(e.target.value)}
                  placeholder="如: 炭烤和牛小汉堡 (藤椒新口味)"
                  className="w-full p-2 bg-[#f7f7f5] border border-[#d3d1cb] rounded-[3px] focus:outline-none focus:border-[#37352f] font-bold text-[#37352f]"
                />

                {/* Quick Suffix Fill Buttons */}
                <div className="flex items-center gap-1 flex-wrap text-[10.5px]">
                  <span className="text-[#787774]">快捷后缀:</span>
                  {[
                    '(藤椒风味)',
                    '(秘制微辣)',
                    '(大份升级版)',
                    '(炭烤微炸)',
                    '(二号配方)',
                    '(手作新口味)'
                  ].map((suf) => (
                    <button
                      key={suf}
                      type="button"
                      onClick={() => setCloneDishName(`${cloningSourceDish.name} ${suf}`)}
                      className="px-1.5 py-0.5 bg-[#f1f1ef] hover:bg-purple-100 hover:text-purple-900 rounded text-[10px] border border-[#d3d1cb] cursor-pointer transition-colors"
                    >
                      {suf}
                    </button>
                  ))}
                </div>
              </div>

              {/* English Name */}
              <div className="space-y-1">
                <label className="font-semibold text-[#5a5854] block">英文名称:</label>
                <input
                  type="text"
                  value={cloneDishEnName}
                  onChange={(e) => setCloneDishEnName(e.target.value)}
                  placeholder="e.g. Charred Wagyu Slider (Green Peppercorn)"
                  className="w-full p-1.5 bg-[#f7f7f5] border border-[#d3d1cb] rounded-[3px] focus:outline-none"
                />
              </div>

              {/* Price & Category Grid */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="font-semibold text-[#5a5854] block mb-1">售价 (¥) *:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={cloneDishPrice}
                    onChange={(e) => setCloneDishPrice(e.target.value)}
                    className="w-full p-1.5 bg-[#f7f7f5] border border-[#d3d1cb] rounded-[3px] focus:outline-none font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#5a5854] block mb-1">原价 (¥):</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="选填"
                    value={cloneDishOriginalPrice}
                    onChange={(e) => setCloneDishOriginalPrice(e.target.value)}
                    className="w-full p-1.5 bg-[#f7f7f5] border border-[#d3d1cb] rounded-[3px] focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#5a5854] block mb-1">类目:</label>
                  <select
                    value={cloneDishCategory}
                    onChange={(e) => setCloneDishCategory(e.target.value as any)}
                    className="w-full p-1.5 bg-[#f7f7f5] border border-[#d3d1cb] rounded-[3px] focus:outline-none"
                  >
                    <option value="yakitori">🍢 日式烧鸟</option>
                    <option value="baked">🧀 芝士焗类</option>
                    <option value="skewers">🍢 炭烤串串</option>
                    <option value="western">🥩 精致西餐</option>
                    <option value="mains">🍜 主食简餐</option>
                    <option value="drinks">🥤 特调冷萃</option>
                    <option value="snacks">🧆 风味小吃</option>
                    <option value="desserts">🍰 手作甜品</option>
                  </select>
                </div>
              </div>

              {/* Specified Parameters Tuning for the Cloned Dish */}
              <div className="p-3 bg-[#f7f7f5] rounded-[3px] border border-[#e6e6e4] space-y-2.5">
                <div className="font-bold text-[#37352f] flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-red-500" />
                  <span>指定参数快速定制 (Spiciness, Flavor & Cooking Style)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="font-semibold text-neutral-600 block mb-1">默认辣度:</label>
                    <select
                      value={cloneDishSpicinessLevel}
                      onChange={(e) => setCloneDishSpicinessLevel(e.target.value)}
                      className="w-full p-1.5 bg-white border border-[#d3d1cb] rounded text-xs focus:outline-none"
                    >
                      {SPICINESS_PRESETS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-neutral-600 block mb-1">默认口味风格:</label>
                    <select
                      value={cloneDishFlavor}
                      onChange={(e) => setCloneDishFlavor(e.target.value)}
                      className="w-full p-1.5 bg-white border border-[#d3d1cb] rounded text-xs focus:outline-none"
                    >
                      {FLAVOR_PRESETS.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-neutral-600 block mb-1">制作风格:</label>
                    <select
                      value={cloneDishCookingStyle}
                      onChange={(e) => setCloneDishCookingStyle(e.target.value)}
                      className="w-full p-1.5 bg-white border border-[#d3d1cb] rounded text-xs focus:outline-none"
                    >
                      {COOKING_STYLE_PRESETS.map((cs) => (
                        <option key={cs} value={cs}>{cs}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-neutral-600 block mb-1">工艺说明与SOP要点:</label>
                  <input
                    type="text"
                    value={cloneDishCraftStandardNote}
                    onChange={(e) => setCloneDishCraftStandardNote(e.target.value)}
                    placeholder="如: 高温荔枝木炭翻烤，出炉撒秘制青花椒藤椒料"
                    className="w-full p-1.5 bg-white border border-[#d3d1cb] rounded text-xs"
                  />
                </div>

                {/* Flavor Tags Configuration for Cloned Dish */}
                <div className="pt-1">
                  <FlavorTagSelector
                    selectedTags={cloneDishFlavorTags}
                    onChange={setCloneDishFlavorTags}
                    title="复制菜品风味标签设定"
                    description="可继承原菜品标签，或进行多选修改与自定义添加"
                    compact={true}
                  />
                </div>
              </div>

              {/* Takeout & Dine In Discounts */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2 bg-sky-50/70 border border-sky-200 rounded space-y-1">
                  <span className="font-bold text-sky-900 block text-[11px]">外卖立减配置</span>
                  <input
                    type="number"
                    placeholder="立减额 如 5.0"
                    value={cloneDishDeliveryDiscount}
                    onChange={(e) => setCloneDishDeliveryDiscount(e.target.value)}
                    className="w-full p-1 bg-white border border-sky-300 rounded text-xs"
                  />
                  <input
                    type="text"
                    placeholder="标签 如 外卖立减¥5"
                    value={cloneDishDeliveryDiscountTag}
                    onChange={(e) => setCloneDishDeliveryDiscountTag(e.target.value)}
                    className="w-full p-1 bg-white border border-sky-300 rounded text-xs"
                  />
                </div>

                <div className="p-2 bg-amber-50/70 border border-amber-200 rounded space-y-1">
                  <span className="font-bold text-amber-900 block text-[11px]">堂食立减配置</span>
                  <input
                    type="number"
                    placeholder="立减额 如 3.0"
                    value={cloneDishDineInDiscount}
                    onChange={(e) => setCloneDishDineInDiscount(e.target.value)}
                    className="w-full p-1 bg-white border border-amber-300 rounded text-xs"
                  />
                  <input
                    type="text"
                    placeholder="标签 如 堂食立减¥3"
                    value={cloneDishDineInDiscountTag}
                    onChange={(e) => setCloneDishDineInDiscountTag(e.target.value)}
                    className="w-full p-1 bg-white border border-amber-300 rounded text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 bg-[#f7f7f5] border-t border-[#e6e6e4] flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setCloningSourceDish(null)}
                className="px-3 py-1.5 bg-white text-[#37352f] border border-[#d3d1cb] rounded-[3px] font-semibold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmCloneDish}
                className="px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-[3px] font-bold cursor-pointer shadow-2xs flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>确认创建并立即上架</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: 新增菜品弹窗 (Add New Dish Modal) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-lg rounded-[4px] border border-[#d3d1cb] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
            <div className="p-3.5 bg-[#f7f7f5] border-b border-[#e6e6e4] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#2b593f]" />
                <span className="font-bold text-sm text-[#37352f]">新建菜品与参数配置</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#787774] hover:text-black cursor-pointer p-1 rounded hover:bg-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs overflow-y-auto flex-1 hide-scrollbar">
              <div className="space-y-1">
                <label className="font-semibold text-[#5a5854] block">菜品名称 *:</label>
                <input
                  type="text"
                  value={newDishName}
                  onChange={(e) => setNewDishName(e.target.value)}
                  placeholder="如: 炭烤黑椒安格斯牛舌"
                  className="w-full p-2 bg-[#f7f7f5] border border-[#d3d1cb] rounded-[3px] focus:outline-none focus:border-[#37352f]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#5a5854] block">英文名称 (选填):</label>
                <input
                  type="text"
                  value={newDishEnName}
                  onChange={(e) => setNewDishEnName(e.target.value)}
                  placeholder="e.g. Charred Angus Beef Tongue"
                  className="w-full p-2 bg-[#f7f7f5] border border-[#d3d1cb] rounded-[3px] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-[#5a5854] block">分类:</label>
                  <select
                    value={newDishCategory}
                    onChange={(e) => setNewDishCategory(e.target.value as any)}
                    className="w-full p-2 bg-[#f7f7f5] border border-[#d3d1cb] rounded-[3px] focus:outline-none"
                  >
                    <option value="yakitori">🍢 日式烧鸟</option>
                    <option value="baked">🧀 芝士焗类</option>
                    <option value="skewers">🍢 炭烤串串</option>
                    <option value="western">🥩 精致西餐</option>
                    <option value="mains">🍜 主食简餐</option>
                    <option value="drinks">🥤 特调冷萃</option>
                    <option value="snacks">🧆 风味小吃</option>
                    <option value="desserts">🍰 手作甜品</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#5a5854] block">售价 (¥) *:</label>
                  <input
                    type="number"
                    value={newDishPrice}
                    onChange={(e) => setNewDishPrice(e.target.value)}
                    className="w-full p-2 bg-[#f7f7f5] border border-[#d3d1cb] rounded-[3px] focus:outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#5a5854] block">原价 (¥):</label>
                  <input
                    type="number"
                    placeholder="选填"
                    value={newDishOriginalPrice}
                    onChange={(e) => setNewDishOriginalPrice(e.target.value)}
                    className="w-full p-2 bg-[#f7f7f5] border border-[#d3d1cb] rounded-[3px] focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Specified Parameters Settings */}
              <div className="p-3 bg-[#f7f7f5] rounded-[3px] border border-[#e6e6e4] space-y-2.5">
                <div className="font-bold text-[#37352f] flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-red-500" />
                  <span>指定参数预设 (辣度、口味与制作风格)</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="font-semibold text-neutral-600 block mb-1">默认辣度:</label>
                    <select
                      value={newDishSpicinessLevel}
                      onChange={(e) => setNewDishSpicinessLevel(e.target.value)}
                      className="w-full p-1.5 bg-white border border-[#d3d1cb] rounded text-xs"
                    >
                      {SPICINESS_PRESETS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-neutral-600 block mb-1">默认口味风格:</label>
                    <select
                      value={newDishFlavor}
                      onChange={(e) => setNewDishFlavor(e.target.value)}
                      className="w-full p-1.5 bg-white border border-[#d3d1cb] rounded text-xs"
                    >
                      {FLAVOR_PRESETS.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-neutral-600 block mb-1">制作风格:</label>
                    <select
                      value={newDishCookingStyle}
                      onChange={(e) => setNewDishCookingStyle(e.target.value)}
                      className="w-full p-1.5 bg-white border border-[#d3d1cb] rounded text-xs"
                    >
                      {COOKING_STYLE_PRESETS.map((cs) => (
                        <option key={cs} value={cs}>{cs}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-neutral-600 block mb-1">制作工艺与SOP说明:</label>
                  <input
                    type="text"
                    value={newDishCraftStandardNote}
                    onChange={(e) => setNewDishCraftStandardNote(e.target.value)}
                    placeholder="如: 果木炭高温慢烤，外皮焦香锁住肉汁"
                    className="w-full p-1.5 bg-white border border-[#d3d1cb] rounded text-xs"
                  />
                </div>

                {/* Flavor Tags Selector for New Dish */}
                <div className="pt-1">
                  <FlavorTagSelector
                    selectedTags={newDishFlavorTags}
                    onChange={setNewDishFlavorTags}
                    title="新品风味标签设定"
                    description="多选预设风味标签或自定义输入新增"
                    compact={true}
                  />
                </div>
              </div>

              {/* Takeout & Dine In Discount Inputs */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#e6e6e4]">
                <div className="p-2 bg-sky-50/70 border border-sky-200 rounded space-y-1.5">
                  <span className="font-bold text-sky-900 block">外卖立减配置</span>
                  <input
                    type="number"
                    placeholder="立减额 如 5.0"
                    value={newDishDeliveryDiscount}
                    onChange={(e) => setNewDishDeliveryDiscount(e.target.value)}
                    className="w-full p-1 bg-white border border-sky-300 rounded text-xs"
                  />
                  <input
                    type="text"
                    placeholder="标签 如 外卖立减¥5"
                    value={newDishDeliveryDiscountTag}
                    onChange={(e) => setNewDishDeliveryDiscountTag(e.target.value)}
                    className="w-full p-1 bg-white border border-sky-300 rounded text-xs"
                  />
                </div>

                <div className="p-2 bg-amber-50/70 border border-amber-200 rounded space-y-1.5">
                  <span className="font-bold text-amber-900 block">堂食立减配置</span>
                  <input
                    type="number"
                    placeholder="立减额 如 3.0"
                    value={newDishDineInDiscount}
                    onChange={(e) => setNewDishDineInDiscount(e.target.value)}
                    className="w-full p-1 bg-white border border-amber-300 rounded text-xs"
                  />
                  <input
                    type="text"
                    placeholder="标签 如 堂食立减¥3"
                    value={newDishDineInDiscountTag}
                    onChange={(e) => setNewDishDineInDiscountTag(e.target.value)}
                    className="w-full p-1 bg-white border border-amber-300 rounded text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="p-3 bg-[#f7f7f5] border-t border-[#e6e6e4] flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-3 py-1.5 bg-white text-[#37352f] border border-[#d3d1cb] rounded-[3px] font-semibold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleCreateDish}
                className="px-4 py-1.5 bg-[#2b593f] hover:bg-[#204430] text-white rounded-[3px] font-semibold cursor-pointer shadow-2xs"
              >
                立即发布上架
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: 批量配置弹窗 (Batch Actions Modal) */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-lg rounded-[4px] border border-[#d3d1cb] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3.5 bg-[#f7f7f5] border-b border-[#e6e6e4] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#2b593f]" />
                <span className="font-bold text-sm text-[#37352f]">
                  批量修改菜品参数与优惠规则 ({selectedDishIds.size} 道已选)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="text-[#787774] hover:text-black cursor-pointer p-1 rounded hover:bg-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-[#5a5854] block">选择批量执行的操作类型:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'delivery_discount', label: '外卖专享立减' },
                    { id: 'dinein_discount', label: '堂食专享立减' },
                    { id: 'spicy_flavor', label: '🌶️ 辣度口味统一' },
                    { id: 'flavor_tags', label: '🏷️ 批量风味标签' },
                    { id: 'cooking_style', label: '🍳 制作风格统一' },
                    { id: 'price_adjust', label: '统一调价 (¥)' },
                    { id: 'availability', label: '批量在售/沽清' }
                  ].map((act) => (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => setBatchActionType(act.id as any)}
                      className={`p-2 rounded-[3px] font-semibold border text-center transition-all cursor-pointer ${
                        batchActionType === act.id
                          ? 'bg-[#37352f] text-white border-[#37352f]'
                          : 'bg-[#f7f7f5] text-[#37352f] border-[#d3d1cb] hover:bg-[#ebebe9]'
                      }`}
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Action Fields */}
              {batchActionType === 'flavor_tags' && (
                <div className="p-3 bg-amber-50/60 rounded border border-amber-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-950">批量风味标签操作模式:</span>
                    <div className="flex items-center gap-1.5">
                      {[
                        { id: 'append', label: '➕ 追加标签' },
                        { id: 'overwrite', label: '🔄 覆盖全部' },
                        { id: 'clear', label: '🗑️ 一键清空' }
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setBatchFlavorTagMode(m.id as any)}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold border cursor-pointer transition-all ${
                            batchFlavorTagMode === m.id
                              ? 'bg-amber-800 text-white border-amber-900 shadow-2xs'
                              : 'bg-white text-neutral-800 border-neutral-300 hover:bg-amber-100/50'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {batchFlavorTagMode !== 'clear' && (
                    <FlavorTagSelector
                      selectedTags={batchFlavorTags}
                      onChange={setBatchFlavorTags}
                      title="选择要批量应用的标签"
                      description={
                        batchFlavorTagMode === 'append'
                          ? '选中的标签将追加合并至所有勾选菜品中（不影响已有其他标签）'
                          : '选中的标签将完全覆盖替换勾选菜品原有的全部标签'
                      }
                      compact={true}
                    />
                  )}

                  {batchFlavorTagMode === 'clear' && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>⚠️ 执行后将清空所选 {selectedDishIds.size} 道菜品的全部风味标签。</span>
                    </div>
                  )}
                </div>
              )}
              {batchActionType === 'spicy_flavor' && (
                <div className="p-3 bg-red-50/60 rounded border border-red-200 space-y-2.5">
                  <span className="font-bold text-red-950 block">统一配置辣度与口味:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-semibold text-neutral-600 block mb-1">默认辣度:</label>
                      <select
                        value={batchSpicinessLevel}
                        onChange={(e) => setBatchSpicinessLevel(e.target.value)}
                        className="w-full p-1.5 bg-white border border-[#d3d1cb] rounded text-xs"
                      >
                        {SPICINESS_PRESETS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-neutral-600 block mb-1">默认口味:</label>
                      <select
                        value={batchFlavor}
                        onChange={(e) => setBatchFlavor(e.target.value)}
                        className="w-full p-1.5 bg-white border border-[#d3d1cb] rounded text-xs"
                      >
                        {FLAVOR_PRESETS.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {batchActionType === 'cooking_style' && (
                <div className="p-3 bg-emerald-50/60 rounded border border-emerald-200 space-y-2.5">
                  <span className="font-bold text-emerald-950 block">统一配置制作风格:</span>
                  <select
                    value={batchCookingStyle}
                    onChange={(e) => setBatchCookingStyle(e.target.value)}
                    className="w-full p-2 bg-white border border-emerald-300 rounded text-xs font-semibold"
                  >
                    {COOKING_STYLE_PRESETS.map((cs) => (
                      <option key={cs} value={cs}>{cs}</option>
                    ))}
                  </select>
                </div>
              )}

              {batchActionType === 'delivery_discount' && (
                <div className="p-3 bg-sky-50/60 rounded border border-sky-200 space-y-2">
                  <span className="font-bold text-sky-900 block">批量外卖立减:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="立减额 如 5.0"
                      value={batchDeliveryDiscount}
                      onChange={(e) => setBatchDeliveryDiscount(e.target.value)}
                      className="w-full p-1.5 bg-white border border-sky-300 rounded text-xs"
                    />
                    <input
                      type="text"
                      placeholder="展示标签 如 外卖立减¥5"
                      value={batchDeliveryDiscountTag}
                      onChange={(e) => setBatchDeliveryDiscountTag(e.target.value)}
                      className="w-full p-1.5 bg-white border border-sky-300 rounded text-xs"
                    />
                  </div>
                </div>
              )}

              {batchActionType === 'dinein_discount' && (
                <div className="p-3 bg-amber-50/60 rounded border border-amber-200 space-y-2">
                  <span className="font-bold text-amber-900 block">批量堂食立减:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="立减额 如 3.0"
                      value={batchDineInDiscount}
                      onChange={(e) => setBatchDineInDiscount(e.target.value)}
                      className="w-full p-1.5 bg-white border border-amber-300 rounded text-xs"
                    />
                    <input
                      type="text"
                      placeholder="展示标签 如 堂食立减¥3"
                      value={batchDineInDiscountTag}
                      onChange={(e) => setBatchDineInDiscountTag(e.target.value)}
                      className="w-full p-1.5 bg-white border border-amber-300 rounded text-xs"
                    />
                  </div>
                </div>
              )}

              {batchActionType === 'price_adjust' && (
                <div className="p-3 bg-[#f7f7f5] rounded border border-[#d3d1cb] space-y-2">
                  <span className="font-bold text-[#37352f] block">调整所有勾选菜品售价:</span>
                  <input
                    type="number"
                    placeholder="如 -3.00 (直降3元) 或 5.00 (涨价5元)"
                    value={batchPriceOffset}
                    onChange={(e) => setBatchPriceOffset(e.target.value)}
                    className="w-full p-1.5 bg-white border border-[#d3d1cb] rounded text-xs font-mono font-bold"
                  />
                </div>
              )}

              {batchActionType === 'availability' && (
                <div className="p-3 bg-[#f7f7f5] rounded border border-[#d3d1cb] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#37352f] block">批量上下架与渠道售卖设置:</span>
                    <span className="text-[10px] text-neutral-500 font-medium">已选择 {selectedDishIds.size} 道菜品</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      {
                        mode: 'all_in_stock',
                        title: '⚡ 一键全渠道在售',
                        desc: '外卖、堂食、自提全部开启在售',
                        activeClass: 'bg-emerald-700 text-white border-emerald-800'
                      },
                      {
                        mode: 'all_sold_out',
                        title: '🚫 一键全渠道沽清',
                        desc: '外卖、堂食、自提全部设为已沽清',
                        activeClass: 'bg-red-700 text-white border-red-800'
                      },
                      {
                        mode: 'delivery_only',
                        title: '🛵 仅开通【外卖】在售',
                        desc: '仅外卖渠道在售，堂食/自提沽清',
                        activeClass: 'bg-sky-700 text-white border-sky-800'
                      },
                      {
                        mode: 'dinein_only',
                        title: '🍽️ 仅开通【堂食】在售',
                        desc: '仅堂食渠道在售，外卖/自提沽清',
                        activeClass: 'bg-amber-700 text-white border-amber-800'
                      },
                      {
                        mode: 'pickup_only',
                        title: '🛍️ 仅开通【自提】在售',
                        desc: '仅自提渠道在售，外卖/堂食沽清',
                        activeClass: 'bg-purple-700 text-white border-purple-800'
                      }
                    ].map((item) => (
                      <button
                        key={item.mode}
                        type="button"
                        onClick={() => setBatchAvailabilityMode(item.mode as any)}
                        className={`p-2.5 rounded-[3px] border text-left cursor-pointer transition-all ${
                          batchAvailabilityMode === item.mode
                            ? `${item.activeClass} shadow-xs font-bold`
                            : 'bg-white text-neutral-700 border-[#d3d1cb] hover:bg-neutral-50'
                        }`}
                      >
                        <div className="text-xs font-bold">{item.title}</div>
                        <div className={`text-[10px] mt-0.5 ${batchAvailabilityMode === item.mode ? 'text-white/80' : 'text-neutral-500'}`}>
                          {item.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-[#f7f7f5] border-t border-[#e6e6e4] flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="px-3 py-1.5 bg-white text-[#37352f] border border-[#d3d1cb] rounded-[3px] font-semibold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleExecuteBatchAction}
                className="px-4 py-1.5 bg-[#2b593f] hover:bg-[#204430] text-white rounded-[3px] font-bold cursor-pointer shadow-2xs flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>立即应用批量修改</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dish Image Fullscreen Zoom & Lightbox Modal */}
      <DishImagePreviewModal
        dish={previewZoomDish}
        dishes={filteredDishes}
        isOpen={Boolean(previewZoomDish)}
        onClose={() => setPreviewZoomDish(null)}
        onSelectDish={(d) => setPreviewZoomDish(d)}
        onEditDish={(d) => openEditModal(d)}
        onToggleAvailability={(dishId) => onToggleAvailability(dishId)}
        showToast={showToast}
      />

      {/* Upload/Replace Dish Image Modal */}
      {uploadModalDish && (
        <DishImageUploadModal
          dish={uploadModalDish}
          isOpen={Boolean(uploadModalDish)}
          onClose={() => setUploadModalDish(null)}
          onConfirmUrl={(newUrl) => {
            const updated: DishItem = {
              ...uploadModalDish,
              imageUrl: newUrl
            };
            if (onUpdateDish) {
              onUpdateDish(updated);
            }
            if (editingDish && editingDish.id === uploadModalDish.id) {
              setEditImageUrl(newUrl);
            }
            setUploadModalDish(null);
            showToast(`【${uploadModalDish.name}】菜品主图已更新成功！`);
          }}
        />
      )}

      {/* Upload/Replace Variant Image Modal */}
      {variantImageModalTarget && editingDish && (
        <DishImageUploadModal
          dish={editingDish}
          customTitle={`为变体【${variantImageModalTarget.currentVariant.name}】设置独立图片`}
          customSubtitle="支持本地重传、URL替换或从海量精选食谱图库中挑选专属实物效果"
          initialImageUrl={variantImageModalTarget.currentVariant.imageUrl || editImageUrl || editingDish.imageUrl}
          isOpen={true}
          onClose={() => setVariantImageModalTarget(null)}
          onConfirmUrl={(newUrl) => {
            const idx = variantImageModalTarget.variantIndex;
            setEditVariants((prev) => {
              const copy = [...prev];
              if (copy[idx]) {
                copy[idx] = { ...copy[idx], imageUrl: newUrl };
              }
              return copy;
            });
            setVariantImageModalTarget(null);
            showToast(`变体【${variantImageModalTarget.currentVariant.name}】独立图片样式已更新！`);
          }}
        />
      )}

      {/* Cloudbase Sync Modal */}
      <CloudbaseStatusModal
        isOpen={isCloudbaseModalOpen}
        onClose={() => setIsCloudbaseModalOpen(false)}
        dishes={dishes}
        orders={[]}
        onDishesUpdated={(updatedDishes) => {
          // If updated from cloud, dishes can be reloaded
        }}
        isConnected={true}
      />
    </div>
  );
};
