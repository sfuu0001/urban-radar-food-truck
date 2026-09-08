import React from 'react';
import {
  Cloud,
  Layers,
  Search,
  Filter,
  RefreshCw,
  Plus,
  SlidersHorizontal,
  X,
  CheckSquare,
  Square
} from 'lucide-react';
import { DishItem } from '../../types';

interface MerchantMenuHeaderDeckProps {
  dishes: DishItem[];
  viewMode: 'auto' | 'table' | 'card';
  setViewMode: (mode: 'auto' | 'table' | 'card') => void;
  isSyncingCloud: boolean;
  onSyncAllDishesToCloud: () => void;
  onRematchImages?: () => void;
  selectedDishIds: Set<string>;
  onToggleSelectAll: () => void;
  onClearSelection: () => void;
  onOpenAddModal: () => void;
  categories: Array<{ id: string; name: string; count: number }>;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: 'all' | 'available' | 'unavailable';
  setStatusFilter: (s: 'all' | 'available' | 'unavailable') => void;
  cookingStyleFilter: string;
  setCookingStyleFilter: (s: string) => void;
  cookingStyles: string[];
  isAdvancedFilterOpen: boolean;
  setIsAdvancedFilterOpen: (open: boolean) => void;
  advPriceMin: string;
  setAdvPriceMin: (p: string) => void;
  advPriceMax: string;
  setAdvPriceMax: (p: string) => void;
  advHasVariants: boolean;
  setAdvHasVariants: (v: boolean) => void;
  advHasBarcode: boolean;
  setAdvHasBarcode: (b: boolean) => void;
  advHasDiscount: boolean;
  setAdvHasDiscount: (d: boolean) => void;
  onResetAllFilters: () => void;
  onOpenQuickPriceModal: () => void;
  onBulkAllInStock: () => void;
  onBulkAllSoldOut: () => void;
  onOpenBatchModal: () => void;
}

export const MerchantMenuHeaderDeck: React.FC<MerchantMenuHeaderDeckProps> = ({
  dishes,
  viewMode,
  setViewMode,
  isSyncingCloud,
  onSyncAllDishesToCloud,
  onRematchImages,
  selectedDishIds,
  onToggleSelectAll,
  onClearSelection,
  onOpenAddModal,
  categories,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  cookingStyleFilter,
  setCookingStyleFilter,
  cookingStyles,
  isAdvancedFilterOpen,
  setIsAdvancedFilterOpen,
  advPriceMin,
  setAdvPriceMin,
  advPriceMax,
  setAdvPriceMax,
  advHasVariants,
  setAdvHasVariants,
  advHasBarcode,
  setAdvHasBarcode,
  advHasDiscount,
  setAdvHasDiscount,
  onResetAllFilters,
  onOpenQuickPriceModal,
  onBulkAllInStock,
  onBulkAllSoldOut,
  onOpenBatchModal
}) => {
  const totalDishes = dishes.length;
  const inStockCount = dishes.filter((d) => d.available).length;
  const outOfStockCount = totalDishes - inStockCount;
  const inStockPercent = totalDishes > 0 ? ((inStockCount / totalDishes) * 100).toFixed(1) : '0';

  const quickTags = [
    { label: '#全部', query: '' },
    { label: '#日式烧鸟', query: '烧鸟' },
    { label: '#备长炭烤', query: '炭烤' },
    { label: '#珍稀部位', query: '提灯' },
    { label: '#芝士焗海鲜', query: '焗' },
    { label: '#金黄拉丝', query: '拉丝' },
    { label: '#招牌炭烤', query: '招牌' },
    { label: '外卖专享', query: '外卖' }
  ];

  return (
    <div className="space-y-4 font-sans selection:bg-[#1A1A17] selection:text-white">
      {/* 1. TOP GLOBAL HEADER (Sticky Top Navigation Bar) */}
      <header className="bg-[#F9F9F7] border border-[#D3D1CB] p-3 sm:px-5 sm:py-3.5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Title & Live Pill */}
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-emerald-600 rounded-none shrink-0"></div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight text-[#1A1A17]">
                  菜品运营控制台
                </h1>
                <span className="text-[10px] bg-neutral-200 text-neutral-800 font-mono font-bold px-1.5 py-0.5 border border-neutral-400 rounded-none">
                  LIVE
                </span>
                <span className="hidden sm:inline-block text-xs text-neutral-500 font-mono">
                  v4.8.2-PROD
                </span>
              </div>
              <p className="text-xs text-neutral-600 hidden sm:block">
                全渠道菜单定价、味型工艺参数、多端在售监控控制面板
              </p>
            </div>
          </div>

          {/* Quick Metrics Ribbon (Desktop/Tablet) */}
          <div className="hidden md:flex items-center divide-x divide-[#D3D1CB] border border-[#D3D1CB] bg-white text-xs rounded-none">
            <div className="px-3 py-1.5 flex items-center gap-2">
              <span className="text-neutral-500">总菜品:</span>
              <span className="font-mono font-bold text-[#1A1A17]">{totalDishes}</span>
            </div>
            <div className="px-3 py-1.5 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-600 rounded-none shrink-0"></span>
              <span className="text-neutral-500">正常在售:</span>
              <span className="font-mono font-bold text-emerald-700">
                {inStockCount}{' '}
                <span className="text-[10px] text-neutral-400 font-normal">
                  ({inStockPercent}%)
                </span>
              </span>
            </div>
            <div className="px-3 py-1.5 flex items-center gap-2">
              <span className="w-2 h-2 bg-[#BA1A1A] rounded-none shrink-0"></span>
              <span className="text-neutral-500">当前沽清:</span>
              <span className="font-mono font-bold text-[#BA1A1A]">{outOfStockCount}</span>
            </div>
          </div>

          {/* Header Action Group & Mode Switcher */}
          <div className="flex items-center flex-wrap gap-2 ml-auto">
            {/* View Mode Switcher */}
            <div className="inline-flex border border-[#D3D1CB] bg-white p-0.5 text-xs font-medium rounded-none">
              <button
                type="button"
                onClick={() => setViewMode('auto')}
                className={`px-2.5 py-1 font-mono transition-colors rounded-none ${
                  viewMode === 'auto'
                    ? 'bg-white border border-[#1A1A17] text-[#1A1A17] font-bold shadow-xs'
                    : 'bg-white text-neutral-700 hover:bg-[#FAF9F5]'
                }`}
              >
                自适应
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 font-mono transition-colors rounded-none ${
                  viewMode === 'table'
                    ? 'bg-white border border-[#1A1A17] text-[#1A1A17] font-bold shadow-xs'
                    : 'bg-white text-neutral-700 hover:bg-[#FAF9F5]'
                }`}
              >
                表格
              </button>
              <button
                type="button"
                onClick={() => setViewMode('card')}
                className={`px-2.5 py-1 font-mono transition-colors rounded-none ${
                  viewMode === 'card'
                    ? 'bg-white border border-[#1A1A17] text-[#1A1A17] font-bold shadow-xs'
                    : 'bg-white text-neutral-700 hover:bg-[#FAF9F5]'
                }`}
              >
                卡片
              </button>
            </div>

            {/* Sync Dishes to Cloud */}
            <button
              type="button"
              onClick={onSyncAllDishesToCloud}
              disabled={isSyncingCloud}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#D3D1CB] bg-white hover:bg-[#FAF9F5] text-xs font-semibold text-[#1A1A17] transition-colors rounded-none cursor-pointer"
            >
              <Cloud className={`w-3.5 h-3.5 text-[#1A1A17] ${isSyncingCloud ? 'animate-spin' : ''}`} />
              <span>{isSyncingCloud ? '推流中...' : '同步菜品到云端'}</span>
            </button>

            {/* Rematch Cloud Images */}
            <button
              type="button"
              onClick={onRematchImages || onSyncAllDishesToCloud}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#D3D1CB] bg-white hover:bg-[#FAF9F5] text-xs font-semibold text-[#1A1A17] transition-colors rounded-none cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#1A1A17]" />
              <span>重新匹配云端图片</span>
            </button>

            {/* Bulk All In-Stock */}
            <button
              type="button"
              onClick={onBulkAllInStock}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 border border-emerald-600 bg-white hover:bg-emerald-50 text-xs font-bold text-emerald-700 transition-colors rounded-none cursor-pointer"
            >
              <span className="w-2 h-2 bg-emerald-600 inline-block rounded-none"></span>
              <span>一键全上架</span>
            </button>

            {/* Bulk All Sold Out */}
            <button
              type="button"
              onClick={onBulkAllSoldOut}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#BA1A1A] bg-white hover:bg-red-50 text-xs font-bold text-[#BA1A1A] transition-colors rounded-none cursor-pointer"
            >
              <span className="w-2 h-2 bg-[#BA1A1A] inline-block rounded-none"></span>
              <span>一键全沽清</span>
            </button>

            {/* Batch Action Mode Toggle */}
            <button
              type="button"
              onClick={onToggleSelectAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#D3D1CB] bg-white hover:bg-[#FAF9F5] text-xs font-semibold text-[#1A1A17] transition-colors rounded-none cursor-pointer"
              title="快速开启/切换批量管理模式"
            >
              <Layers className="w-3.5 h-3.5 text-[#1A1A17]" />
              <span>批量操作</span>
            </button>

            {/* Create Dish Button */}
            <button
              type="button"
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-[#1A1A17] bg-white hover:bg-[#FAF9F5] text-xs font-extrabold text-[#1A1A17] transition-colors shadow-xs rounded-none cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ 新建菜品</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. METRIC CARDS OVERVIEW (3-column grid) */}
      <section aria-label="关键指标看板" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Dishes */}
        <div className="bg-white border border-[#D3D1CB] p-4 flex justify-between items-start rounded-none shadow-xs">
          <div>
            <div className="text-xs font-semibold uppercase text-neutral-500 tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-neutral-400" />
              <span>总菜品 SKU 矩阵</span>
            </div>
            <div className="text-3xl font-black font-mono mt-1 text-[#1A1A17]">{totalDishes}</div>
            <div className="text-xs text-neutral-500 mt-0.5">跨 9 大经营品类库</div>
          </div>
          <span className="text-xs font-mono px-1.5 py-0.5 bg-neutral-100 border border-neutral-300 rounded-none">
            TOTAL
          </span>
        </div>

        {/* Live Selling */}
        <div className="bg-white border border-[#D3D1CB] p-4 flex justify-between items-start rounded-none shadow-xs">
          <div>
            <div className="text-xs font-semibold uppercase text-neutral-500 tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-600 rounded-none shrink-0"></span>
              <span>正常在售矩阵</span>
            </div>
            <div className="text-3xl font-black font-mono mt-1 text-emerald-700">{inStockCount}</div>
            <div className="text-xs text-emerald-700/80 font-medium mt-0.5">
              占比 {inStockPercent}% · 堂食/外卖通道通畅
            </div>
          </div>
          <span className="text-xs font-mono px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-none">
            ACTIVE
          </span>
        </div>

        {/* Sold Out */}
        <div className="bg-white border border-[#D3D1CB] p-4 flex justify-between items-start rounded-none shadow-xs">
          <div>
            <div className="text-xs font-semibold uppercase text-neutral-500 tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 bg-[#BA1A1A] rounded-none shrink-0"></span>
              <span>全渠道沽清监控</span>
            </div>
            <div className="text-3xl font-black font-mono mt-1 text-[#BA1A1A]">{outOfStockCount}</div>
            <div className="text-xs text-[#BA1A1A]/80 font-medium mt-0.5">
              需及时补库 · 及时更新库存配料
            </div>
          </div>
          <span className="text-xs font-mono px-1.5 py-0.5 bg-red-50 text-[#BA1A1A] border border-red-200 rounded-none">
            OUT OF STOCK
          </span>
        </div>
      </section>

      {/* 3. SEARCH & FILTER DECK */}
      <section aria-label="筛选与搜索模块" className="bg-white border border-[#D3D1CB] p-3 sm:p-4 space-y-3 rounded-none shadow-xs">
        {/* Category Tabs (Horizontal Scrollable) */}
        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1 text-xs font-mono">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 whitespace-nowrap transition-all rounded-none cursor-pointer ${
                  isSelected
                    ? 'bg-white border border-[#1A1A17] text-[#1A1A17] font-bold shadow-xs'
                    : 'bg-white hover:bg-[#FAF9F5] text-neutral-800 border border-[#D3D1CB]'
                }`}
              >
                {cat.name} {cat.count}
              </button>
            );
          })}
        </div>

        {/* Search Input & Secondary Filters */}
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索品名、英文、条码、标签、味型参数..."
              className="w-full pl-9 pr-8 py-2 bg-white border border-[#D3D1CB] text-sm placeholder-neutral-400 focus:outline-none focus:border-[#1A1A17] rounded-none font-sans"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={cookingStyleFilter}
              onChange={(e) => setCookingStyleFilter(e.target.value)}
              className="py-2 px-3 bg-white border border-[#D3D1CB] text-xs text-neutral-700 focus:outline-none focus:border-[#1A1A17] rounded-none cursor-pointer"
            >
              <option value="">全部制作风格 / 烹饪工艺</option>
              {cookingStyles.map((style) => (
                <option key={style} value={style}>
                  {style}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="py-2 px-3 bg-white border border-[#D3D1CB] text-xs text-neutral-700 focus:outline-none focus:border-[#1A1A17] rounded-none cursor-pointer"
            >
              <option value="all">全渠道状态: 全部</option>
              <option value="available">全部渠道在售</option>
              <option value="unavailable">全渠道已沽清</option>
            </select>

            <button
              type="button"
              onClick={() => setIsAdvancedFilterOpen(!isAdvancedFilterOpen)}
              className={`p-2 border border-[#D3D1CB] bg-white hover:bg-[#FAF9F5] text-neutral-700 rounded-none cursor-pointer ${
                isAdvancedFilterOpen ? 'border-[#1A1A17] bg-[#FAF9F5]' : ''
              }`}
              title="高级参数漏斗"
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Collapsible Advanced Filters */}
        {isAdvancedFilterOpen && (
          <div className="pt-2 border-t border-[#D3D1CB] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-[#FAF9F5] p-2.5 rounded-none animate-in fade-in duration-100">
            <div>
              <span className="text-neutral-500 block mb-1 font-mono">价格区间 (¥):</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  placeholder="最低价"
                  value={advPriceMin}
                  onChange={(e) => setAdvPriceMin(e.target.value)}
                  className="w-full p-1.5 border border-[#D3D1CB] bg-white rounded-none font-mono"
                />
                <span className="text-neutral-400">-</span>
                <input
                  type="number"
                  placeholder="最高价"
                  value={advPriceMax}
                  onChange={(e) => setAdvPriceMax(e.target.value)}
                  className="w-full p-1.5 border border-[#D3D1CB] bg-white rounded-none font-mono"
                />
              </div>
            </div>

            <div className="flex flex-col justify-end space-y-1">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={advHasVariants}
                  onChange={(e) => setAdvHasVariants(e.target.checked)}
                  className="w-3.5 h-3.5 border-[#D3D1CB] rounded-none"
                />
                <span>仅含多规格/变体</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={advHasBarcode}
                  onChange={(e) => setAdvHasBarcode(e.target.checked)}
                  className="w-3.5 h-3.5 border-[#D3D1CB] rounded-none"
                />
                <span>已绑定商品条形码 (69码)</span>
              </label>
            </div>

            <div className="flex flex-col justify-end space-y-1">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={advHasDiscount}
                  onChange={(e) => setAdvHasDiscount(e.target.checked)}
                  className="w-3.5 h-3.5 border-[#D3D1CB] rounded-none"
                />
                <span>已配置立减特惠规则</span>
              </label>
            </div>

            <div className="flex items-end justify-end">
              <button
                type="button"
                onClick={onResetAllFilters}
                className="px-3 py-1.5 border border-[#D3D1CB] bg-white hover:bg-neutral-100 text-xs font-bold rounded-none cursor-pointer"
              >
                重置高级筛选
              </button>
            </div>
          </div>
        )}

        {/* Quick Flavor / Param Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
          <span className="text-neutral-500 text-[11px] font-mono">快捷标签:</span>
          {quickTags.map((tag) => (
            <button
              key={tag.label}
              type="button"
              onClick={() => setSearchQuery(tag.query)}
              className={`px-2 py-0.5 transition-colors rounded-none cursor-pointer font-mono text-[11px] ${
                tag.label === '#全部' && !searchQuery
                  ? 'bg-[#E65100] text-white font-bold'
                  : tag.label.startsWith('#')
                  ? 'bg-[#FFF3E0] text-[#E65100] border border-[#FFE0B2] hover:bg-[#FFE0B2]'
                  : 'bg-neutral-100 text-neutral-600 border border-neutral-300 hover:bg-neutral-200'
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </section>

      {/* 4. BATCH SELECTION BANNER (Interactive floating/fixed banner when items are selected) */}
      {selectedDishIds.size > 0 && (
        <div
          id="batch-action-bar"
          className="bg-[#1A1A17] text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono rounded-none shadow-md animate-in fade-in duration-100"
        >
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 bg-emerald-400 rounded-none"></span>
            <span>
              已选中 <strong className="text-emerald-400">{selectedDishIds.size}</strong> 个菜品规格矩阵
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenQuickPriceModal}
              className="px-3 py-1 bg-neutral-700 hover:bg-neutral-600 text-white rounded-none cursor-pointer"
            >
              批量改价
            </button>
            <button
              type="button"
              onClick={onBulkAllInStock}
              className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-none cursor-pointer"
            >
              一键全通售
            </button>
            <button
              type="button"
              onClick={onBulkAllSoldOut}
              className="px-3 py-1 bg-[#BA1A1A] hover:bg-red-700 text-white rounded-none cursor-pointer"
            >
              全渠道沽清
            </button>
            <button
              type="button"
              onClick={onClearSelection}
              className="px-2 py-1 text-neutral-400 hover:text-white rounded-none cursor-pointer ml-1"
            >
              取消选择
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
