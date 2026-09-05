import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Flame,
  UtensilsCrossed,
  Tag,
  Eye,
  RotateCcw,
  Save,
  Plus,
  Trash2,
  Check,
  Clock,
  SlidersHorizontal,
  Info,
  ShieldCheck,
  Layers,
  Image as ImageIcon,
  CheckCircle2,
  X
} from 'lucide-react';
import {
  CategoryBrandModalConfig,
  CategoryBrandTriggerMode,
  DEFAULT_CATEGORY_BRAND_CONFIGS,
  getCategoryBrandConfigs,
  saveCategoryBrandConfigs,
  resetAllCategorySeenRecords,
  resetSingleCategorySeenRecord
} from '../../utils/categoryBrandSettings';
import { CategoryBrandModal } from '../CategoryBrandModal';

interface MerchantCategoryBrandSettingsProps {
  showToast: (msg: string) => void;
}

const PRESET_COVER_IMAGES = [
  { label: '炭火慢烤串串', url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80' },
  { label: '备长炭日式烧鸟', url: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800&auto=format&fit=crop&q=80' },
  { label: '黄金芝士焗烤', url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80' },
  { label: '谷饲西式原切牛排', url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80' },
  { label: '大火锅气暖心主食', url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&auto=format&fit=crop&q=80' },
  { label: '清爽冷萃特调饮品', url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&auto=format&fit=crop&q=80' },
  { label: '金黄香酥深夜小吃', url: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&auto=format&fit=crop&q=80' }
];

export const MerchantCategoryBrandSettings: React.FC<MerchantCategoryBrandSettingsProps> = ({ showToast }) => {
  const [configs, setConfigs] = useState<Record<string, CategoryBrandModalConfig>>(() => getCategoryBrandConfigs());
  const [selectedCatId, setSelectedCatId] = useState<string>('skewers');
  const [previewConfig, setPreviewConfig] = useState<CategoryBrandModalConfig | null>(null);
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatKey, setNewCatKey] = useState('');
  const [newTagInput, setNewTagInput] = useState('');
  const [newDishInput, setNewDishInput] = useState('');

  const currentConfig = configs[selectedCatId] || configs.skewers;

  const updateCurrentConfig = (updates: Partial<CategoryBrandModalConfig>) => {
    setConfigs((prev) => {
      const updated = {
        ...prev,
        [selectedCatId]: {
          ...prev[selectedCatId],
          ...updates,
          updatedAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        }
      };
      return updated;
    });
  };

  const handleSaveAll = () => {
    saveCategoryBrandConfigs(configs);
    showToast('分类品牌弹窗配置已成功保存并全端生效！');
  };

  const handleResetToDefault = () => {
    if (confirm('确认将当前分类品牌弹窗重置为官方推荐出厂配置？')) {
      setConfigs(DEFAULT_CATEGORY_BRAND_CONFIGS);
      saveCategoryBrandConfigs(DEFAULT_CATEGORY_BRAND_CONFIGS);
      showToast('已恢复官方默认分类品牌弹窗配置！');
    }
  };

  const handleCreateCustomCategory = () => {
    if (!newCatName.trim()) {
      showToast('请输入大类名称');
      return;
    }
    const safeKey = newCatKey.trim() || `custom_${Date.now()}`;
    if (configs[safeKey]) {
      showToast('该大类识别代码已存在');
      return;
    }

    const newConfig: CategoryBrandModalConfig = {
      categoryId: safeKey,
      categoryName: newCatName.trim(),
      categoryEnName: 'Custom Category',
      categoryIcon: '✨',
      enabled: true,
      triggerMode: 'first_time_only',
      brandTitle: `黑曜石 · ${newCatName.trim()}精选`,
      brandSubtitle: '严选优质食材 · 匠心烹调现做现出',
      badgeText: '✨ 甄选新品',
      coverImageUrl: PRESET_COVER_IMAGES[0].url,
      craftHighlights: ['严选好料', '现点现做', '独家风味', '锁鲜直供'],
      storyDescription: `黑曜石餐车为您倾心呈现全新${newCatName.trim()}系列！精选上乘食材与秘制调配工艺，为您带来舌尖上的美妙享受。`,
      couponText: `${newCatName.trim()}专区满¥30立减¥5`,
      featuredDishNames: [],
      buttonText: `开始选购${newCatName.trim()}`,
      autoCloseSeconds: 0,
      accentColor: 'orange',
      isCustom: true,
      updatedAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    };

    const updated = { ...configs, [safeKey]: newConfig };
    setConfigs(updated);
    saveCategoryBrandConfigs(updated);
    setSelectedCatId(safeKey);
    setIsAddingNewCategory(false);
    setNewCatName('');
    setNewCatKey('');
    showToast(`已成功新增【${newCatName.trim()}】大类品牌弹窗！`);
  };

  const handleDeleteCustomCategory = (key: string) => {
    if (confirm(`确认删除【${configs[key]?.categoryName || key}】大类品牌弹窗配置？`)) {
      const next = { ...configs };
      delete next[key];
      setConfigs(next);
      saveCategoryBrandConfigs(next);
      setSelectedCatId('skewers');
      showToast('已删除该自建大类配置');
    }
  };

  const handleAddCraftTag = () => {
    if (!newTagInput.trim()) return;
    const currentTags = currentConfig.craftHighlights || [];
    if (!currentTags.includes(newTagInput.trim())) {
      updateCurrentConfig({
        craftHighlights: [...currentTags, newTagInput.trim()]
      });
    }
    setNewTagInput('');
  };

  const handleRemoveCraftTag = (index: number) => {
    const nextTags = [...(currentConfig.craftHighlights || [])];
    nextTags.splice(index, 1);
    updateCurrentConfig({ craftHighlights: nextTags });
  };

  const handleAddFeaturedDish = () => {
    if (!newDishInput.trim()) return;
    const currentDishes = currentConfig.featuredDishNames || [];
    if (!currentDishes.includes(newDishInput.trim())) {
      updateCurrentConfig({
        featuredDishNames: [...currentDishes, newDishInput.trim()]
      });
    }
    setNewDishInput('');
  };

  const handleRemoveFeaturedDish = (index: number) => {
    const nextDishes = [...(currentConfig.featuredDishNames || [])];
    nextDishes.splice(index, 1);
    updateCurrentConfig({ featuredDishNames: nextDishes });
  };

  return (
    <div className="space-y-4">
      {/* Top Banner with Guide */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 text-white rounded-2xl p-4 sm:p-5 border border-neutral-700 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-black flex items-center justify-center font-black shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-black tracking-tight">
              分类品牌弹窗与类目故事管理中枢
            </h2>
            <span className="text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full">
              三大核心品类 + 自定义大类
            </span>
          </div>
          <p className="text-xs text-neutral-300 max-w-2xl leading-relaxed">
            管理顾客在客户端点击切换分类（如<strong>碳烤串串、日式烧鸟、芝士焗类</strong>等）时弹出的品牌故事、专属工艺标准及限时优惠。支持设置<strong>第一次切换弹出</strong>、<strong>每次重复切换弹出</strong>或<strong>每日首次弹出</strong>防打扰策略。
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => {
              resetAllCategorySeenRecords();
              showToast('已重置所有分类的顾客查看记录，刷新客户端或切换分类将重新触发弹窗！');
            }}
            className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold rounded-xl border border-neutral-600 transition-colors cursor-pointer flex items-center gap-1.5"
            title="清除本地浏览缓存记录以便快速测试"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>重置顾客已读记录</span>
          </button>
          <button
            type="button"
            onClick={() => setPreviewConfig(currentConfig)}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-black text-xs font-black rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>预览当前分类弹窗</span>
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            className="px-4 py-2 bg-white hover:bg-neutral-100 text-black text-xs font-black rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>保存全部分类设置</span>
          </button>
        </div>
      </div>

      {/* Category Tabs Switcher */}
      <div className="bg-white rounded-2xl p-3 border border-[#e2e3e1] shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-neutral-500" />
            <span>选择要配置的大类分类:</span>
          </div>
          <button
            type="button"
            onClick={() => setIsAddingNewCategory(true)}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新增自定义大类品牌弹窗</span>
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {Object.values(configs).map((cfg) => {
            const isSelected = selectedCatId === cfg.categoryId;
            const isEnabled = cfg.enabled && cfg.triggerMode !== 'disabled';
            return (
              <button
                key={cfg.categoryId}
                type="button"
                onClick={() => setSelectedCatId(cfg.categoryId)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer border ${
                  isSelected
                    ? 'bg-black text-white border-black shadow-xs'
                    : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-800 border-neutral-200'
                }`}
              >
                <span>{cfg.categoryIcon || '✨'}</span>
                <span>{cfg.categoryName}</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    isEnabled ? 'bg-emerald-500 ring-2 ring-emerald-500/20' : 'bg-neutral-300'
                  }`}
                  title={isEnabled ? '已启用品牌弹窗' : '已停用'}
                />
                {cfg.isCustom && (
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-neutral-700 text-amber-300">
                    自建
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Adding Custom Category Dialog Box */}
      {isAddingNewCategory && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-black text-amber-950 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-amber-700" />
              <span>新增自定义大类品牌弹窗配置</span>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingNewCategory(false)}
              className="text-neutral-500 hover:text-black cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-amber-900 block mb-1">大类显示名称 (如: 特调清补凉 / 川香卤味)</label>
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="例如: 现熬热汤 / 精酿啤酒"
                className="w-full text-xs px-3 py-2 bg-white rounded-xl border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-amber-900 block mb-1">大类英文标识码 (唯一编码，可选填)</label>
              <input
                type="text"
                value={newCatKey}
                onChange={(e) => setNewCatKey(e.target.value)}
                placeholder="例如: soups / craft_beer (不填自动生成)"
                className="w-full text-xs px-3 py-2 bg-white rounded-xl border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAddingNewCategory(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-100 cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleCreateCustomCategory}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer"
            >
              确认创建并开始配置
            </button>
          </div>
        </div>
      )}

      {/* Main Editing Card for Selected Category */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#e2e3e1] shadow-xs space-y-4">
        {/* Header & Status Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-neutral-100 gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{currentConfig.categoryIcon || '🍢'}</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-neutral-900">
                  【{currentConfig.categoryName}】品牌弹窗配置
                </h3>
                {currentConfig.isCustom && (
                  <button
                    type="button"
                    onClick={() => handleDeleteCustomCategory(currentConfig.categoryId)}
                    className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                    title="删除此自建分类"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>删除该分类</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-neutral-500">
                分类标识: <code className="font-mono">{currentConfig.categoryId}</code> · 控制顾客进入或切换至该分类时的品牌展示
              </p>
            </div>
          </div>

          {/* Quick Enable Toggle */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-neutral-700">启用品牌弹窗:</span>
              <input
                type="checkbox"
                checked={currentConfig.enabled}
                onChange={(e) => updateCurrentConfig({ enabled: e.target.checked })}
                className="w-4 h-4 accent-neutral-900 rounded cursor-pointer"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                resetSingleCategorySeenRecord(currentConfig.categoryId);
                showToast(`已重置【${currentConfig.categoryName}】查看记录`);
              }}
              className="px-2.5 py-1 text-xs font-bold text-neutral-600 hover:text-black bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer"
            >
              清除本类目查看记录
            </button>
          </div>
        </div>

        {/* 1. Trigger Policy Mode (首次切换 vs 每次切换 vs 每日首次 vs 停用) */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-neutral-800 flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-600" />
            <span>切换分类时触发策略 (核心防打扰机制):</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            {[
              {
                id: 'first_time_only' as CategoryBrandTriggerMode,
                title: '仅第一次切换时弹出',
                sub: '推荐 · 用户看过一次后不再重复弹出打扰',
                badge: '体验最佳'
              },
              {
                id: 'repeat_switch' as CategoryBrandTriggerMode,
                title: '每次切换均重复弹出',
                sub: '高曝光 · 每次点击该分类都弹出品牌介绍',
                badge: '营销强推'
              },
              {
                id: 'daily_first' as CategoryBrandTriggerMode,
                title: '每日首次切换弹出',
                sub: '按天隔离 · 每天第一次点该分类时弹出一次',
                badge: '日常促活'
              },
              {
                id: 'disabled' as CategoryBrandTriggerMode,
                title: '停用此分类弹窗',
                sub: '点击分类直接浏览商品列表，不弹窗',
                badge: '静默模式'
              }
            ].map((mode) => {
              const isSelected = currentConfig.triggerMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => updateCurrentConfig({ triggerMode: mode.id })}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between relative ${
                    isSelected
                      ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                      : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-800 border-neutral-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-black">{mode.title}</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          isSelected ? 'bg-amber-400 text-black' : 'bg-neutral-200 text-neutral-700'
                        }`}
                      >
                        {mode.badge}
                      </span>
                    </div>
                    <p className={`text-[11px] leading-snug ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                      {mode.sub}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Brand Visual & Typography */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-1">品牌大标题</label>
              <input
                type="text"
                value={currentConfig.brandTitle}
                onChange={(e) => updateCurrentConfig({ brandTitle: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-black bg-white"
                placeholder="例如: 黑曜石 · 果木炭烤工坊"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-1">品牌副标题 / 核心Slogan</label>
              <input
                type="text"
                value={currentConfig.brandSubtitle}
                onChange={(e) => updateCurrentConfig({ brandSubtitle: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-black bg-white"
                placeholder="例如: 280℃果木菊花炭现点现烤 · 独家秘制九味干碟"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-neutral-800 block mb-1">角标亮点标签</label>
                <input
                  type="text"
                  value={currentConfig.badgeText}
                  onChange={(e) => updateCurrentConfig({ badgeText: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-black bg-white"
                  placeholder="例如: 🔥 果木现烤"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-800 block mb-1">引导按钮文案</label>
                <input
                  type="text"
                  value={currentConfig.buttonText}
                  onChange={(e) => updateCurrentConfig({ buttonText: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-black bg-white"
                  placeholder="例如: 开始选购炭烤串串"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-1">专属优惠/特惠权益提示</label>
              <input
                type="text"
                value={currentConfig.couponText || ''}
                onChange={(e) => updateCurrentConfig({ couponText: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-black bg-white"
                placeholder="例如: 炭烤专区专享：满¥35立减¥5 · 免费赠送秘制干碟"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-1">品类风味故事与制作工艺标准说明</label>
              <textarea
                rows={4}
                value={currentConfig.storyDescription}
                onChange={(e) => updateCurrentConfig({ storyDescription: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-black bg-white leading-relaxed"
                placeholder="详细说明该品类的选材标准、烤制温度、独家秘方及口感特色..."
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-neutral-800 block mb-1">自动关闭倒计时</label>
                <select
                  value={currentConfig.autoCloseSeconds || 0}
                  onChange={(e) => updateCurrentConfig({ autoCloseSeconds: Number(e.target.value) })}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-black bg-white"
                >
                  <option value={0}>常开 (需顾客主动点击)</option>
                  <option value={3}>3 秒后自动收起</option>
                  <option value={5}>5 秒后自动收起</option>
                  <option value={8}>8 秒后自动收起</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-800 block mb-1">主题主色调</label>
                <select
                  value={currentConfig.accentColor || 'orange'}
                  onChange={(e) => updateCurrentConfig({ accentColor: e.target.value as any })}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-black bg-white"
                >
                  <option value="orange">炭烤烈焰橙 (Orange)</option>
                  <option value="amber">居酒屋琥珀金 (Amber)</option>
                  <option value="yellow">芝士浓香金黄 (Yellow)</option>
                  <option value="rose">西式谷饲玫瑰红 (Rose)</option>
                  <option value="emerald">自然青翠绿 (Emerald)</option>
                  <option value="sky">冰爽特调天蓝 (Sky)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Craft Highlights Chips Editor */}
        <div className="pt-2 border-t border-neutral-100 space-y-2">
          <label className="text-xs font-bold text-neutral-800 flex items-center justify-between">
            <span>工匠标准与甄选特色标签 (弹窗中展示的4大亮点):</span>
            <span className="text-[11px] font-normal text-neutral-500">已配置 {currentConfig.craftHighlights?.length || 0} 个</span>
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            {(currentConfig.craftHighlights || []).map((tag, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-xl bg-neutral-100 text-neutral-800 text-xs font-bold border border-neutral-200 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveCraftTag(idx)}
                  className="w-3.5 h-3.5 rounded-full hover:bg-neutral-300 text-neutral-500 hover:text-black flex items-center justify-center cursor-pointer"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}

            <div className="flex items-center gap-1">
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCraftTag();
                  }
                }}
                placeholder="新增亮点如: 现烤锁鲜"
                className="text-xs px-2.5 py-1 rounded-xl border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-black w-36 bg-white"
              />
              <button
                type="button"
                onClick={handleAddCraftTag}
                className="px-2.5 py-1 bg-black text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-neutral-800"
              >
                添加
              </button>
            </div>
          </div>
        </div>

        {/* 4. Cover Image Selection & Custom URL */}
        <div className="pt-2 border-t border-neutral-100 space-y-2">
          <label className="text-xs font-bold text-neutral-800 block">
            封面大图选择 (可点击预设高清摄影图或输入自定义图床链接):
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {PRESET_COVER_IMAGES.map((img, i) => {
              const isCurrent = currentConfig.coverImageUrl === img.url;
              return (
                <div
                  key={i}
                  onClick={() => updateCurrentConfig({ coverImageUrl: img.url })}
                  className={`group relative h-20 rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                    isCurrent ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-neutral-200 hover:border-neutral-400'
                  }`}
                >
                  <img src={img.url} alt={img.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1.5">
                    <span className="text-[10px] font-bold text-white leading-tight truncate">{img.label}</span>
                  </div>
                  {isCurrent && (
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-500 text-black flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-1">
            <input
              type="text"
              value={currentConfig.coverImageUrl}
              onChange={(e) => updateCurrentConfig({ coverImageUrl: e.target.value })}
              className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-black bg-white font-mono text-neutral-700"
              placeholder="自定义高清图片 URL (如: https://...)"
            />
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="pt-3 border-t border-neutral-100 flex items-center justify-between flex-wrap gap-2">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="text-xs font-bold text-neutral-500 hover:text-neutral-800 transition-colors cursor-pointer"
          >
            恢复官方出厂默认配置
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewConfig(currentConfig)}
              className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>实时测试预览</span>
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-5 py-2 bg-black hover:bg-neutral-800 text-white text-xs font-black rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>保存配置生效</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Preview Modal */}
      {previewConfig && (
        <CategoryBrandModal
          isOpen={Boolean(previewConfig)}
          onClose={() => setPreviewConfig(null)}
          config={previewConfig}
          onConfirmStartShopping={() => {
            setPreviewConfig(null);
            showToast(`[测试预览] 顾客点击了“${previewConfig.buttonText || '开始选购'}”`);
          }}
        />
      )}
    </div>
  );
};
