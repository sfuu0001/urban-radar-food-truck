import React, { useState } from 'react';
import {
  Flame,
  Award,
  ThumbsUp,
  FolderTree,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Plus,
  Beef,
  Drumstick,
  Coffee,
  Utensils,
  CakeSlice,
  UtensilsCrossed,
  CookingPot,
  X
} from 'lucide-react';
import { DishItem } from '../types';
import { CategoryTreeNode, DishRankingItem } from '../types/filter';
import { buildDishTree, getDishRankings } from '../utils/dishTree';

const HOT_KEYWORD_TAGS = [
  { text: '和牛汉堡', icon: <Beef className="w-3.5 h-3.5 text-amber-700 shrink-0" /> },
  { text: '黑松露', icon: <Sparkles className="w-3.5 h-3.5 text-neutral-700 shrink-0" /> },
  { text: '五花肉', icon: <Drumstick className="w-3.5 h-3.5 text-rose-500 shrink-0" /> },
  { text: '冷萃咖啡', icon: <Coffee className="w-3.5 h-3.5 text-sky-600 shrink-0" /> },
  { text: '金黄脆薯', icon: <Utensils className="w-3.5 h-3.5 text-amber-500 shrink-0" /> },
  { text: '舒芙蕾', icon: <CakeSlice className="w-3.5 h-3.5 text-pink-500 shrink-0" /> }
];

const getTreeCategoryIcon = (catId: string) => {
  switch (catId) {
    case 'skewers':
      return <UtensilsCrossed className="w-3.5 h-3.5 text-orange-600 shrink-0" />;
    case 'western':
      return <Beef className="w-3.5 h-3.5 text-amber-700 shrink-0" />;
    case 'mains':
      return <CookingPot className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
    case 'drinks':
      return <Coffee className="w-3.5 h-3.5 text-sky-600 shrink-0" />;
    case 'desserts':
      return <CakeSlice className="w-3.5 h-3.5 text-pink-600 shrink-0" />;
    default:
      return <Utensils className="w-3.5 h-3.5 text-neutral-600 shrink-0" />;
  }
};

interface SearchDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSelectSearchQuery: (query: string) => void;
  allDishes: DishItem[];
  searchResults: DishItem[];
  onSelectDish: (dish: DishItem) => void;
  onQuickAdd: (dish: DishItem, e: React.MouseEvent) => void;
}

export const SearchDropdown: React.FC<SearchDropdownProps> = ({
  isOpen,
  onClose,
  searchQuery,
  onSelectSearchQuery,
  allDishes,
  searchResults,
  onSelectDish,
  onQuickAdd
}) => {
  const [activeRankTab, setActiveRankTab] = useState<'hot' | 'chef' | 'praise'>('hot');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const safeAllDishes = Array.isArray(allDishes) ? allDishes : [];
  const safeSearchResults = Array.isArray(searchResults) ? searchResults : [];

  const { hotRankings, chefRankings, praiseRankings } = getDishRankings(safeAllDishes);
  const currentRankings: DishRankingItem[] =
    activeRankTab === 'hot'
      ? hotRankings
      : activeRankTab === 'chef'
      ? chefRankings
      : praiseRankings;

  const dishTree: CategoryTreeNode[] = buildDishTree(safeSearchResults);

  const toggleCategory = (catId: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  const isSearching = (searchQuery || '').trim().length > 0;

  return (
    <>
      {/* Click-away backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/5"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Compact iOS-Style Widget Panel (小组件嵌入式样式) */}
      <div className="absolute top-full left-0 right-0 sm:left-auto sm:right-0 mt-1.5 w-full sm:w-[420px] bg-white rounded-none shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[#D3D1CB] z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {!isSearching ? (
          <div className="flex flex-col">
            {/* Widget Header (单行嵌入式表头) */}
            <div className="px-3.5 py-2.5 bg-white border-b border-[#f0f0ed] flex items-center justify-between gap-1.5 shrink-0 select-none">
              <div className="flex items-center gap-1.5 shrink-0">
                <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500/20 shrink-0" />
                <span className="text-sm font-bold text-[#1a1c1b] whitespace-nowrap tracking-tight">
                  菜品风向榜
                </span>
              </div>

              {/* Segmented Ranking Tabs */}
              <div className="flex items-center bg-[#f4f4f5] p-0.5 rounded-none border border-[#e4e4e7] shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveRankTab('hot')}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                    activeRankTab === 'hot'
                      ? 'bg-white text-black shadow-xs font-black'
                      : 'text-[#71717a] hover:text-black'
                  }`}
                >
                  <Flame className="w-3 h-3 text-red-500 shrink-0 fill-red-500/20" />
                  <span>热销榜</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRankTab('chef')}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                    activeRankTab === 'chef'
                      ? 'bg-white text-black shadow-xs font-black'
                      : 'text-[#71717a] hover:text-black'
                  }`}
                >
                  <Award className="w-3 h-3 text-amber-500 shrink-0" />
                  <span>主厨榜</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRankTab('praise')}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                    activeRankTab === 'praise'
                      ? 'bg-white text-black shadow-xs font-black'
                      : 'text-[#71717a] hover:text-black'
                  }`}
                >
                  <ThumbsUp className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>好评榜</span>
                </button>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-[#71717a] hover:text-black font-bold shrink-0 whitespace-nowrap cursor-pointer p-1"
                title="关闭排行榜"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Compact Ranking List */}
            <div className="px-3 py-1 divide-y divide-[#f4f4f5] max-h-[320px] overflow-y-auto overscroll-contain no-scrollbar">
              {currentRankings.map((item) => {
                const isAvailable = item.dish.available !== false;
                const statusTag = !isAvailable
                  ? '待上架'
                  : item.dish.typeTag || '堂食';

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      onSelectDish(item.dish);
                      onClose();
                    }}
                    className="py-2 flex items-center justify-between gap-2.5 hover:bg-[#fafaf9] rounded-none transition-colors cursor-pointer group px-1"
                  >
                    {/* Left: Rank Badge + Dish Thumbnail + Info */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span
                        className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-black shrink-0 ${
                          item.rank === 1
                            ? 'bg-[#ef4444] text-white shadow-2xs'
                            : item.rank === 2
                            ? 'bg-[#f97316] text-white shadow-2xs'
                            : item.rank === 3
                            ? 'bg-[#f59e0b] text-white shadow-2xs'
                            : 'bg-[#f4f4f5] text-[#71717a]'
                        }`}
                      >
                        {item.rank}
                      </span>

                      <img
                        src={item.dish.imageUrl || 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=600&q=80'}
                        alt={item.dish.name || 'Dish'}
                        className="w-9 h-9 rounded-none object-cover bg-neutral-900 shrink-0 border border-[#e4e4e7]"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />

                      {/* Title & Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[#1a1c1b] group-hover:text-black truncate whitespace-nowrap">
                            {item.dish.name || '菜品'}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-[#f4f4f5] text-[#71717a] font-medium shrink-0 whitespace-nowrap">
                            {item.tag || '推荐'}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#71717a] truncate whitespace-nowrap mt-0.5">
                          ¥{(item.dish.price || 0).toFixed(2)} · {statusTag}
                        </div>
                      </div>
                    </div>

                    {/* Right: Quick Add Button */}
                    <div className="shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickAdd(item.dish, e);
                        }}
                        className="w-7 h-7 rounded-lg border border-[#e4e4e7] bg-white hover:bg-neutral-100 hover:border-black active:scale-95 flex items-center justify-center text-neutral-800 transition-all cursor-pointer shadow-2xs"
                        title="快速加购"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Recommendation Pills */}
            <div className="p-3 bg-[#fafaf9] border-t border-[#f0f0ed] shrink-0">
              <span className="text-xs font-bold text-[#71717a] block mb-2 whitespace-nowrap">
                热门搜索推荐:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {HOT_KEYWORD_TAGS.map((item) => (
                  <button
                    key={item.text}
                    type="button"
                    onClick={() => {
                      onSelectSearchQuery(item.text);
                    }}
                    className="px-2.5 py-1 rounded-full text-xs font-medium bg-white border border-[#e4e4e7] text-[#27272a] hover:border-black hover:bg-black hover:text-white transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 group/tag active:scale-95 shadow-2xs"
                  >
                    {item.icon}
                    <span>{item.text}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Search Tree View */
          <div className="flex flex-col h-full min-h-0 overflow-hidden">
            <div className="px-3.5 py-2.5 bg-[#fafaf9] border-b border-[#f0f0ed] flex items-center justify-between gap-2 shrink-0 select-none">
              <div className="flex items-center gap-1.5 min-w-0">
                <FolderTree className="w-4 h-4 text-black shrink-0" />
                <span className="text-xs font-bold text-[#1a1c1b] truncate whitespace-nowrap">
                  搜索结果分类结构树 (共 {searchResults.length} 款)
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 hover:text-black active:scale-95 transition-all cursor-pointer shrink-0"
                title="关闭搜索结果"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-3 overflow-y-auto flex-1 min-h-0 space-y-2.5 no-scrollbar overscroll-contain">
              {searchResults.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#71717a]">
                  未检索到符合条件的菜品结构节点
                </div>
              ) : (
                dishTree.map((catNode) => {
                  const isCollapsed = !collapsedCategories[catNode.id];
                  return (
                    <div
                      key={catNode.id}
                      className="border border-[#D3D1CB] rounded-none overflow-hidden bg-white shadow-2xs"
                    >
                      <div
                        onClick={() => toggleCategory(catNode.id)}
                        className="px-3 py-2 bg-[#f4f4f5] flex items-center justify-between cursor-pointer hover:bg-[#ecece9] transition-colors select-none"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isCollapsed ? (
                            <ChevronRight className="w-3.5 h-3.5 text-[#71717a] shrink-0" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-black shrink-0" />
                          )}
                          {getTreeCategoryIcon(catNode.id)}
                          <span className="text-xs font-bold text-black truncate whitespace-nowrap">{catNode.name}</span>
                          <span className="text-[10px] text-[#71717a] hidden sm:inline truncate whitespace-nowrap">
                            ({catNode.enName})
                          </span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-black border border-[#e4e4e7] shrink-0 whitespace-nowrap">
                          {catNode.count} 款
                        </span>
                      </div>

                      {!isCollapsed && (
                        <div className="p-2 space-y-2 bg-white">
                          {catNode.subcategories.map((subNode) => (
                            <div key={subNode.id} className="pl-3 border-l-2 border-neutral-300 space-y-1.5">
                              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#474741]">
                                <span className="w-1.5 h-1.5 rounded-full bg-black shrink-0"></span>
                                <span className="truncate whitespace-nowrap">{subNode.name}</span>
                                <span className="text-[10px] text-[#71717a] shrink-0 whitespace-nowrap">({subNode.dishes.length})</span>
                              </div>

                              <div className="space-y-1 pl-1.5">
                                {subNode.dishes.map((dish) => (
                                  <div
                                    key={dish.id}
                                    onClick={() => {
                                      onSelectDish(dish);
                                      onClose();
                                    }}
                                    className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-[#fafaf9] transition-colors cursor-pointer group border border-transparent hover:border-[#e4e4e7]"
                                  >
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <img
                                        src={dish.imageUrl || 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=600&q=80'}
                                        alt={dish.name || 'Dish'}
                                        className="w-8 h-8 rounded-none object-cover bg-neutral-900 shrink-0 border border-[#e4e4e7]"
                                        onError={(e) => {
                                          (e.target as HTMLElement).style.display = 'none';
                                        }}
                                      />
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1">
                                          <span className="text-xs font-bold text-[#1a1c1b] group-hover:text-black truncate whitespace-nowrap">
                                            {dish.name || '菜品'}
                                          </span>
                                          {dish.badgeText && (
                                            <span className="text-[9px] px-1 py-0.2 rounded bg-black text-white font-medium shrink-0 whitespace-nowrap">
                                              {dish.badgeText}
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[10px] text-[#71717a] truncate whitespace-nowrap">
                                          ¥{(dish.price || 0).toFixed(2)}
                                        </div>
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onQuickAdd(dish, e);
                                      }}
                                      className="w-6 h-6 rounded-md border border-[#e4e4e7] bg-white hover:bg-neutral-100 active:scale-95 flex items-center justify-center text-black transition-all shrink-0 cursor-pointer shadow-2xs"
                                      title="快速加购"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
