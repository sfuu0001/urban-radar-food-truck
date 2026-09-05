import React, { useState } from 'react';
import {
  ChefHat,
  Search,
  Sparkles,
  Calculator,
  Flame,
  Scale,
  TrendingUp,
  Cloud,
  Database,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Layers,
  Clock,
  Info,
  DollarSign
} from 'lucide-react';
import { CraftStandardItem } from '../../types';
import { INITIAL_CRAFT_ITEMS } from '../../data/mockEnhancedData';
import { CraftDetailModal } from './CraftDetailModal';

interface CraftStandardViewProps {
  showToast: (msg: string) => void;
}

export const CraftStandardView: React.FC<CraftStandardViewProps> = ({ showToast }) => {
  const [styleMode, setStyleMode] = useState<'new' | 'original'>('new');
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>('');
  
  // Detail Modal state
  const [modalCraft, setModalCraft] = useState<CraftStandardItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Categories matching user's full spec
  const categories = [
    '全部',
    '烤肉类',
    '海鲜类',
    '蔬菜类',
    '豆制品类',
    '主食面点类',
    '特色网红类',
    '特色内脏类'
  ];

  const filteredCrafts = INITIAL_CRAFT_ITEMS.filter((item) => {
    // Category match
    const matchCategory =
      selectedCategory === '全部' ||
      item.categoryName === selectedCategory ||
      (selectedCategory === '烤肉类' && item.category === 'meat') ||
      (selectedCategory === '海鲜类' && item.category === 'seafood') ||
      (selectedCategory === '蔬菜类' && (item.category === 'veg' || item.category === 'veggie')) ||
      (selectedCategory === '豆制品类' && item.category === 'tofu') ||
      (selectedCategory === '主食面点类' && (item.categoryName === '主食面点类' || item.subCategory === '面点' || item.subCategory === '米制品')) ||
      (selectedCategory === '特色网红类' && (item.categoryName === '特色网红类' || item.category === 'special' || item.subCategory === '锡纸类' || item.subCategory === '甜品烤物' || item.subCategory === '特色小吃' || item.subCategory === '卷类')) ||
      (selectedCategory === '特色内脏类' && (item.categoryName === '特色内脏类' || item.subCategory === '禽内脏' || item.subCategory === '羊肉类' || item.name.includes('肠') || item.name.includes('腰') || item.name.includes('心') || item.name.includes('胗')));

    // Search query match
    const q = (searchQuery || globalSearchQuery).trim().toLowerCase();
    const matchSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      (item.categoryName && item.categoryName.toLowerCase().includes(q)) ||
      (item.subCategory && item.subCategory.toLowerCase().includes(q)) ||
      (item.flavorTag && item.flavorTag.toLowerCase().includes(q)) ||
      (item.tasteProfile && item.tasteProfile.toLowerCase().includes(q)) ||
      (item.recommendedPart && item.recommendedPart.toLowerCase().includes(q));

    return matchCategory && matchSearch;
  });

  const handleOpenDetail = (craft: CraftStandardItem) => {
    setModalCraft(craft);
    setIsModalOpen(true);
  };

  const getFlavorStyle = (tag?: string) => {
    switch (tag) {
      case '蜜汁':
        return {
          bg: 'bg-[#fff7ed] border-[#ffedd5] text-[#c2410c]',
          dot: 'bg-[#ea580c]'
        };
      case '原味':
      case '原味孜然':
        return {
          bg: 'bg-[#f1f5f9] border-[#e2e8f0] text-[#475569]',
          dot: 'bg-[#94a3b8]'
        };
      case '香辣':
      case '剁椒':
        return {
          bg: 'bg-[#fef2f2] border-[#fee2e2] text-[#b91c1c]',
          dot: 'bg-[#ef4444]'
        };
      case '蒜蓉':
        return {
          bg: 'bg-[#ecfdf5] border-[#d1fae5] text-[#047857]',
          dot: 'bg-[#10b981]'
        };
      case '黑椒':
      case '奥尔良':
        return {
          bg: 'bg-[#fffbeb] border-[#fde68a] text-[#b45309]',
          dot: 'bg-[#f59e0b]'
        };
      default:
        return {
          bg: 'bg-[#fff7ed] border-[#ffedd5] text-[#c2410c]',
          dot: 'bg-[#ea580c]'
        };
    }
  };

  return (
    <div id="craft-standard-view" className="space-y-3.5 text-xs text-[#0f172a]">
      {/* 1. Top Global Search Bar (From screenshot top: 搜索原料、报损记录、员工、SKU...) */}
      <div className="bg-white p-2.5 sm:p-3 rounded-[24px] border border-[#e2e8f0] shadow-xs flex items-center gap-2.5">
        <Search className="w-4 h-4 text-[#94a3b8] shrink-0 ml-1" />
        <input
          type="text"
          placeholder="搜索原料、报损记录、员工、SKU..."
          value={globalSearchQuery}
          onChange={(e) => setGlobalSearchQuery(e.target.value)}
          className="w-full text-xs text-[#0f172a] placeholder-[#94a3b8] bg-transparent focus:outline-none"
        />
      </div>

      {/* 2. Main Page Header matching screenshot */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <h1 className="text-xl sm:text-2xl font-bold text-[#0f172a] tracking-tight">
          烤串工艺
        </h1>

        <div className="flex items-center gap-2">
          {/* Segmented Switcher [ 新样式 | 原样式 ] */}
          <div className="bg-[#f1f5f9] p-0.5 rounded-full border border-[#e2e8f0] flex items-center">
            <button
              type="button"
              onClick={() => setStyleMode('new')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                styleMode === 'new'
                  ? 'bg-black text-white shadow-xs'
                  : 'text-[#64748b] hover:text-[#0f172a]'
              }`}
            >
              新样式
            </button>
            <button
              type="button"
              onClick={() => setStyleMode('original')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                styleMode === 'original'
                  ? 'bg-black text-white shadow-xs'
                  : 'text-[#64748b] hover:text-[#0f172a]'
              }`}
            >
              原样式
            </button>
          </div>

          {/* Status Badge: ● 云端 */}
          <div className="bg-[#ecfdf5] border border-[#a7f3d0] text-[#059669] px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
            <span>云端</span>
          </div>
        </div>
      </div>

      {/* 3. Sub Search Bar (搜索串品 / 原料 / 味型...) */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#94a3b8] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="搜索串品 / 原料 / 味型…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-[#e2e8f0] rounded-full pl-9 pr-4 py-2 text-xs text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0f172a] shadow-2xs"
        />
      </div>

      {/* 4. Category Pills Horizontal Filter (全部, 烤肉类, 海鲜类, 蔬菜类, 豆制品类, 主食面点类, 特色网红类, 特色内脏类) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                isSelected
                  ? 'bg-black text-white shadow-xs'
                  : 'bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* 5. Content Area depending on styleMode (新样式 2列卡片 vs 原样式 单列全宽条目卡片) */}
      {styleMode === 'new' ? (
        /* --- NEW STYLE: 2-column Compact Bento Skewer Cards --- */
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 pb-2">
          {filteredCrafts.map((craft) => {
            const yieldVal = craft.yieldRate
              ? (craft.yieldRate <= 1 ? Math.round(craft.yieldRate * 100) : craft.yieldRate)
              : 85;
            const skewersPerKgVal = craft.skewersPerKg || (craft.standardWeightG ? Number(((yieldVal / 100 * 1000) / craft.standardWeightG).toFixed(1)) : 28.3);
            const displayFlavor = craft.flavorTag || '蜜汁';
            const flavorStyle = getFlavorStyle(displayFlavor);
            const profitVal = craft.estimatedProfit 
              ? craft.estimatedProfit.toFixed(2)
              : (craft.pricePerSkewer * 0.55).toFixed(2);

            return (
              <button
                key={craft.id}
                type="button"
                onClick={() => handleOpenDetail(craft)}
                className="bg-white border border-[#e2e8f0] rounded-[6px] sm:rounded-lg p-3 text-left active:scale-[0.98] transition-all duration-200 group cursor-pointer shadow-2xs hover:border-[#cbd5e1] hover:shadow-xs flex flex-col justify-between"
              >
                <div>
                  {/* Header: Title + Flavor Badge */}
                  <div className="flex items-start justify-between gap-1">
                    <h3 className="text-[15px] font-bold text-[#0f172a] leading-tight group-hover:text-[#2563eb] transition-colors">
                      {craft.name}
                    </h3>
                    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border ${flavorStyle.bg} font-semibold shrink-0`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${flavorStyle.dot}`} />
                      {displayFlavor}
                    </span>
                  </div>

                  {/* Subcategory Tags */}
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    <span className="text-[10px] px-1.5 py-0.5 bg-[#f1f5f9] text-[#475569] font-medium rounded-[3px] border border-[#e2e8f0]">
                      {craft.categoryName || '烤肉类'}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-[#f1f5f9] text-[#475569] font-medium rounded-[3px] border border-[#e2e8f0]">
                      {craft.subCategory || '猪肉类'}
                    </span>
                  </div>

                  {/* 3 Metric Rows */}
                  <div className="mt-2 space-y-1 text-[12px] text-[#64748b]">
                    <div className="flex justify-between">
                      <span>克重</span>
                      <span className="font-semibold text-[#0f172a]">{craft.standardWeightG || 30}g</span>
                    </div>
                    <div className="flex justify-between">
                      <span>出肉率</span>
                      <span className="font-semibold text-[#10b981]">{yieldVal}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>每kg串数</span>
                      <span className="font-semibold text-[#0f172a]">{skewersPerKgVal}串</span>
                    </div>
                  </div>
                </div>

                {/* Footer: Price + Profit */}
                <div className="mt-2 pt-2 border-t border-[#f1f5f9] flex items-center justify-between">
                  <span className="text-[14px] font-bold text-[#0f172a]">
                    ¥{craft.pricePerSkewer.toFixed(2)}
                    <span className="text-[10px] font-medium text-[#64748b]">/串</span>
                  </span>
                  <span className="text-[11px] font-semibold text-[#047857]">
                    毛利 ¥{profitVal}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* --- ORIGINAL STYLE: 1-column Full Width Detailed Cards with SOP Summary & Cost Calculation --- */
        <div className="space-y-2.5 pb-2">
          {filteredCrafts.map((craft) => {
            const yieldVal = craft.yieldRate
              ? (craft.yieldRate <= 1 ? Math.round(craft.yieldRate * 100) : craft.yieldRate)
              : 85;
            const skewersPerKgVal = craft.skewersPerKg || (craft.standardWeightG ? Number(((yieldVal / 100 * 1000) / craft.standardWeightG).toFixed(1)) : 28.3);
            const displayFlavor = craft.flavorTag || '蜜汁';
            const flavorStyle = getFlavorStyle(displayFlavor);
            const profitVal = craft.estimatedProfit 
              ? craft.estimatedProfit.toFixed(2)
              : (craft.pricePerSkewer * 0.55).toFixed(2);
            const theoreticalCost = (craft.pricePerSkewer - Number(profitVal)).toFixed(2);

            return (
              <button
                key={craft.id}
                type="button"
                onClick={() => handleOpenDetail(craft)}
                className="w-full bg-white border border-[#e2e8f0] rounded-[6px] sm:rounded-lg p-3.5 sm:p-4 text-left active:scale-[0.98] transition-all cursor-pointer shadow-2xs hover:border-[#cbd5e1] hover:shadow-xs group"
              >
                {/* Header: Name + Flavor + Subcategories + Yield Rate */}
                <div className="flex justify-between items-start border-b border-[#f1f5f9] pb-2.5 gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-bold text-[#0f172a] text-[15px] group-hover:text-[#2563eb] transition-colors">
                        {craft.name}
                      </h3>
                      <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border ${flavorStyle.bg} font-semibold shrink-0`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${flavorStyle.dot}`} />
                        {displayFlavor}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      <span className="text-[11px] px-2 py-0.5 bg-[#f1f5f9] text-[#475569] font-medium rounded-[3px] border border-[#e2e8f0]">
                        {craft.categoryName || '烤肉类'}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 bg-[#f1f5f9] text-[#475569] font-medium rounded-[3px] border border-[#e2e8f0]">
                        {craft.subCategory || '猪肉类'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[12px] font-bold text-[#10b981] shrink-0">
                    出肉率 {yieldVal}%
                  </span>
                </div>

                {/* Detailed Metrics Table */}
                <div className="space-y-1.5 text-[13px] text-[#64748b] mt-2.5">
                  <div className="flex justify-between gap-2">
                    <span>原料肉名称</span>
                    <span className="font-bold text-[#0f172a] text-right truncate max-w-[200px]">
                      {craft.recommendedPart || craft.name}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>每串标准克重</span>
                    <span className="font-bold text-[#0f172a]">{craft.standardWeightG || 30} g</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>毛肉每kg理论出串数</span>
                    <span className="font-bold text-[#0f172a]">{skewersPerKgVal} 串</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>单串理论成本</span>
                    <span className="font-bold text-[#0f172a]">¥{theoreticalCost}</span>
                  </div>
                </div>

                {/* SOP Key Note Box */}
                <div className="mt-2.5 pt-2 border-t border-[#f1f5f9] text-[12px] text-[#475569] leading-relaxed bg-[#f8fafc] p-2.5 rounded-[4px] border border-[#e2e8f0]">
                  <span className="font-bold text-[#0f172a] block mb-0.5">穿串与切割要领:</span>
                  <span className="line-clamp-2">
                    {craft.threadingMethod || craft.cutDirection || `${craft.name}标准工艺，中火快烤锁汁。`}
                  </span>
                </div>

                {/* Card Bottom: Price + Profit + 查看详情 */}
                <div className="mt-2.5 pt-2 border-t border-[#f1f5f9] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-[15px] font-bold text-[#0f172a]">
                      ¥{craft.pricePerSkewer.toFixed(2)}
                      <span className="text-[11px] font-medium text-[#64748b]">/串</span>
                    </span>
                    <span className="text-[11px] font-semibold text-[#047857]">
                      毛利 ¥{profitVal}
                    </span>
                  </div>
                  <span className="flex items-center gap-0.5 text-[12px] font-semibold text-[#2563eb]">
                    <span>查看详情</span>
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Detail Modal Component */}
      {isModalOpen && modalCraft && (
        <CraftDetailModal
          craft={modalCraft}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          showToast={showToast}
        />
      )}
    </div>
  );
};
