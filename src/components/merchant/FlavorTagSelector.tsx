import React, { useState } from 'react';
import { Tag, Plus, X, Check, Sparkles, Flame, ChefHat, RotateCcw, Hash, Layers } from 'lucide-react';

export const FLAVOR_TAG_PRESET_CATEGORIES = [
  {
    id: 'roast_smoke',
    category: '🔥 经典炙烤 & 烟熏',
    tags: ['炙烤焦香', '果木熏香', '黑椒浓郁', '炭火微焦', '孜然飘香', '蒜香扑鼻', '经典炭烤', '葱香浓郁']
  },
  {
    id: 'texture',
    category: '🥩 口感质地 & 鲜汁',
    tags: ['鲜嫩多汁', '外酥里嫩', '弹牙爽脆', '入口即化', '软烂入味', '金黄酥脆', '爆汁爆浆', '肉质紧实']
  },
  {
    id: 'taste_layer',
    category: '🌶️ 味觉风味层次',
    tags: ['麻辣鲜香', '微辣过瘾', '甜咸适口', '蜜汁回甘', '青花藤椒', '黑松露香', '泰式酸辣', '奶香浓郁', '芝士拉丝']
  },
  {
    id: 'craft_special',
    category: '✨ 特色工艺 & 推荐',
    tags: ['手工现串', '主厨秘配', '原汁原味', '低卡轻食', '居酒屋经典', '下酒绝配', '招牌必点', '先卤后烤']
  }
];

export const ALL_FLAVOR_TAG_PRESETS = FLAVOR_TAG_PRESET_CATEGORIES.flatMap((c) => c.tags);

export const FLAVOR_TAG_PACKAGES = [
  { name: '🔥 炭烤招牌包', tags: ['炙烤焦香', '鲜嫩多汁', '黑椒浓郁', '炭火微焦'] },
  { name: '🌶️ 川香麻辣包', tags: ['麻辣鲜香', '青花藤椒', '微辣过瘾', '下酒绝配'] },
  { name: '🧀 芝士拉丝包', tags: ['奶香浓郁', '芝士拉丝', '金黄酥脆', '甜咸适口'] },
  { name: '🌿 清爽低卡包', tags: ['原汁原味', '低卡轻食', '弹牙爽脆', '主厨秘配'] },
  { name: '🍯 蜜汁甜香包', tags: ['蜜汁回甘', '外酥里嫩', '果木熏香', '招牌必点'] }
];

interface FlavorTagSelectorProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  title?: string;
  description?: string;
  compact?: boolean;
}

export const FlavorTagSelector: React.FC<FlavorTagSelectorProps> = ({
  selectedTags = [],
  onChange,
  title = '菜品风味标签设定 (Flavor Tags)',
  description = '支持多选预设标签及自定义新增风味标签，在前台菜品详情与列表中实时展示',
  compact = false
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [customTagInput, setCustomTagInput] = useState('');
  const [customTagsPool, setCustomTagsPool] = useState<string[]>(() => {
    // Collect any current tags that are not in the predefined presets
    return selectedTags.filter((t) => !ALL_FLAVOR_TAG_PRESETS.includes(t));
  });

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter((t) => t !== tag));
    } else {
      onChange([...selectedTags, tag]);
    }
  };

  const handleRemoveTag = (tag: string) => {
    onChange(selectedTags.filter((t) => t !== tag));
  };

  const handleAddCustomTag = () => {
    const trimmed = customTagInput.trim();
    if (!trimmed) return;

    if (!selectedTags.includes(trimmed)) {
      onChange([...selectedTags, trimmed]);
    }
    if (!customTagsPool.includes(trimmed) && !ALL_FLAVOR_TAG_PRESETS.includes(trimmed)) {
      setCustomTagsPool((prev) => [...prev, trimmed]);
    }
    setCustomTagInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCustomTag();
    }
  };

  const handleApplyPackage = (pkgTags: string[]) => {
    // Merge without duplicates
    const combined = Array.from(new Set([...selectedTags, ...pkgTags]));
    onChange(combined);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  // Filter tags based on selected category tab
  const displayCategories =
    activeCategory === 'all'
      ? FLAVOR_TAG_PRESET_CATEGORIES
      : FLAVOR_TAG_PRESET_CATEGORIES.filter((c) => c.id === activeCategory);

  return (
    <div className={`p-3 sm:p-3.5 bg-[#FAF9F5] rounded-none border border-[#D3D1CB] space-y-3 ${compact ? 'text-xs' : 'text-xs'}`}>
      {/* 1. Header with Info & Active Count */}
      <div className="flex items-center justify-between flex-wrap gap-1.5 pb-2 border-b border-[#D3D1CB]">
        <div className="flex items-center gap-1.5 font-bold text-[#1A1A17]">
          <Tag className="w-3.5 h-3.5 text-neutral-700 shrink-0" />
          <span>{title}</span>
          <span className="bg-[#1A1A17] text-white text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-none">
            已选 {selectedTags.length}
          </span>
        </div>
        {selectedTags.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-[10.5px] text-neutral-600 hover:text-red-700 flex items-center gap-1 transition-colors cursor-pointer rounded-none"
          >
            <RotateCcw className="w-3 h-3" />
            <span>清空已选</span>
          </button>
        )}
      </div>

      {description && (
        <p className="text-[11px] text-neutral-600 -mt-1 leading-snug">
          {description}
        </p>
      )}

      {/* 2. Currently Selected Tags (Active Display Box) */}
      <div className="p-2.5 bg-white rounded-none border border-[#D3D1CB] space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold text-[#1A1A17] flex items-center gap-1">
            <Hash className="w-3 h-3 text-neutral-700" />
            <span>当前菜品风味标签 (顾客端展示):</span>
          </span>
          <span className="text-[10px] text-neutral-500 font-mono">
            {selectedTags.length === 0 ? '点击下方标签即可多选添加' : `共 ${selectedTags.length} 个标签`}
          </span>
        </div>

        {selectedTags.length === 0 ? (
          <div className="py-2.5 px-3 rounded-none border border-dashed border-[#D3D1CB] bg-[#F9F9F7] text-center text-[11px] text-neutral-500">
            暂未添加风味标签，可点击下方预设标签多选，或在输入框中自定义添加
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto hide-scrollbar">
            {selectedTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 bg-neutral-200 text-[#1A1A17] font-semibold px-2 py-0.5 rounded-none text-[11px] border border-neutral-300 transition-all font-mono"
              >
                <span>#{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:bg-neutral-300 rounded-none p-0.2 text-neutral-600 hover:text-black cursor-pointer"
                  title={`移除 ${tag}`}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 3. Custom Tag Input Section */}
      <div className="space-y-1">
        <label className="text-[11px] font-bold text-[#1A1A17] flex items-center gap-1">
          <Plus className="w-3 h-3 text-neutral-700" />
          <span>自定义添加风味标签:</span>
        </label>
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="输入自定义风味标签 (如: 迷迭香草、柠檬薄荷、芥末蜂蜜酱)"
              value={customTagInput}
              onChange={(e) => setCustomTagInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full pl-2 pr-2 py-1.5 bg-white border border-[#D3D1CB] rounded-none text-xs focus:outline-none focus:border-[#1A1A17] text-[#1A1A17] placeholder:text-neutral-400"
            />
          </div>
          <button
            type="button"
            onClick={handleAddCustomTag}
            disabled={!customTagInput.trim()}
            className={`px-3 py-1.5 rounded-none text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
              customTagInput.trim()
                ? 'bg-[#1A1A17] hover:bg-black text-white'
                : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>添加标签</span>
          </button>
        </div>
      </div>

      {/* 4. Quick Recommend Flavor Packages */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center gap-1 text-[11px] font-bold text-[#1A1A17]">
          <Sparkles className="w-3 h-3 text-neutral-700" />
          <span>快捷推荐风味包 (一键多选组合):</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FLAVOR_TAG_PACKAGES.map((pkg) => {
            const isFullyApplied = pkg.tags.every((t) => selectedTags.includes(t));
            return (
              <button
                key={pkg.name}
                type="button"
                onClick={() => handleApplyPackage(pkg.tags)}
                className={`px-2 py-1 rounded-none text-[11px] font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                  isFullyApplied
                    ? 'bg-[#1A1A17] text-white border-black'
                    : 'bg-white text-neutral-800 border-[#D3D1CB] hover:bg-neutral-100'
                }`}
                title={`包含: ${pkg.tags.join('、')}`}
              >
                <span>{pkg.name}</span>
                {isFullyApplied && <Check className="w-3 h-3 text-white shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Preset Categories & Multi-Select Tag Matrix */}
      <div className="space-y-2 pt-1 border-t border-[#D3D1CB]">
        {/* Category Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-1">
          <span className="text-[11px] font-bold text-[#1A1A17] flex items-center gap-1">
            <Layers className="w-3 h-3 text-neutral-700" />
            <span>风味标签库多选区:</span>
          </span>

          <div className="flex items-center gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`px-2 py-0.5 rounded-none text-[10.5px] font-semibold transition-colors cursor-pointer ${
                activeCategory === 'all'
                  ? 'bg-[#1A1A17] text-white'
                  : 'bg-white text-neutral-700 border border-[#D3D1CB] hover:bg-neutral-100'
              }`}
            >
              全部
            </button>
            {FLAVOR_TAG_PRESET_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-2 py-0.5 rounded-none text-[10.5px] font-semibold transition-colors cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-[#1A1A17] text-white'
                    : 'bg-white text-neutral-700 border border-[#D3D1CB] hover:bg-neutral-100'
                }`}
              >
                {cat.category.split(' ')[1] || cat.category}
              </button>
            ))}
          </div>
        </div>

        {/* Tag Matrix */}
        <div className="space-y-2.5 max-h-48 overflow-y-auto hide-scrollbar p-2 bg-white rounded-none border border-[#D3D1CB]">
          {displayCategories.map((group) => (
            <div key={group.id} className="space-y-1">
              <div className="text-[10px] font-bold text-neutral-600 font-mono">
                {group.category}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {group.tags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleTag(tag)}
                      className={`px-2 py-1 rounded-none text-[11px] font-medium border transition-all cursor-pointer flex items-center gap-1 select-none font-mono ${
                        isSelected
                          ? 'bg-[#1A1A17] text-white border-black font-bold'
                          : 'bg-white text-neutral-800 border-neutral-300 hover:bg-neutral-100'
                      }`}
                    >
                      <span>{tag}</span>
                      {isSelected ? (
                        <Check className="w-3 h-3 text-white shrink-0" />
                      ) : (
                        <span className="text-neutral-400 text-[10px]">+</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* If custom tags exist in pool and 'all' is selected */}
          {customTagsPool.length > 0 && activeCategory === 'all' && (
            <div className="space-y-1 pt-1 border-t border-neutral-200">
              <div className="text-[10px] font-bold text-neutral-600 font-mono">
                ✨ 自定义已添加历史池
              </div>
              <div className="flex flex-wrap gap-1.5">
                {customTagsPool.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleTag(tag)}
                      className={`px-2 py-1 rounded-none text-[11px] font-medium border transition-all cursor-pointer flex items-center gap-1 select-none font-mono ${
                        isSelected
                          ? 'bg-[#1A1A17] text-white border-black font-bold'
                          : 'bg-white text-neutral-800 border-dashed border-[#D3D1CB] hover:bg-neutral-100'
                      }`}
                    >
                      <span>{tag}</span>
                      {isSelected ? (
                        <Check className="w-3 h-3 text-white shrink-0" />
                      ) : (
                        <span className="text-neutral-400 text-[10px]">+</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
