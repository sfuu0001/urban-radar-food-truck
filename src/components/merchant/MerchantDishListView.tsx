import React from 'react';
import {
  CheckSquare,
  Square,
  Sparkles,
  Camera,
  ZoomIn,
  Sliders,
  Printer,
  ChevronRight,
  TrendingDown,
  Edit3,
  Copy,
  Layers,
  MoreVertical,
  Utensils,
  ShoppingBag,
  Bike,
  Smartphone,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Crown
} from 'lucide-react';
import { DishItem } from '../../types';
import { globalFranchiseEngine } from '../../utils/franchiseTenantEngine';

interface MerchantDishListViewProps {
  pagedDishes: DishItem[];
  filteredDishesCount: number;
  viewMode: 'auto' | 'table' | 'card';
  selectedDishIds: Set<string>;
  channelOverrides: Record<string, { dineIn: boolean; delivery: boolean; pickup: boolean }>;
  moreActionDishId: string | null;
  onToggleSelectDish: (dishId: string) => void;
  onToggleSelectAll: () => void;
  onToggleChannel: (dishId: string, channel: 'dineIn' | 'delivery' | 'pickup') => void;
  onSetSingleDishAllChannels: (dish: DishItem, status: boolean) => void;
  onPrintLabel: (dish: DishItem) => void;
  onOpenEditModal: (dish: DishItem, tab?: any) => void;
  onOpenDrawer: (dish: DishItem) => void;
  onOpenUploadModal: (dish: DishItem) => void;
  onPreviewZoom: (dish: DishItem) => void;
  onQuickPrice: (dish: DishItem) => void;
  onCloneDish: (dish: DishItem) => void;
  setMoreActionDishId: (id: string | null) => void;
  onResetFilters: () => void;
}

function getCategoryEmoji(category: string): string {
  switch (category) {
    case 'yakitori':
      return '🍢';
    case 'skewers':
      return '🥓';
    case 'baked':
      return '🧀';
    case 'western':
      return '🍔';
    case 'mains':
      return '🍝';
    case 'drinks':
      return '☕';
    case 'desserts':
      return '🍮';
    case 'snacks':
      return '🍟';
    default:
      return '🍱';
  }
}

export const MerchantDishListView: React.FC<MerchantDishListViewProps> = ({
  pagedDishes,
  filteredDishesCount,
  viewMode,
  selectedDishIds,
  channelOverrides,
  moreActionDishId,
  onToggleSelectDish,
  onToggleSelectAll,
  onToggleChannel,
  onSetSingleDishAllChannels,
  onPrintLabel,
  onOpenEditModal,
  onOpenDrawer,
  onOpenUploadModal,
  onPreviewZoom,
  onQuickPrice,
  onCloneDish,
  setMoreActionDishId,
  onResetFilters
}) => {
  const isAllSelected =
    pagedDishes.length > 0 && pagedDishes.every((d) => selectedDishIds.has(d.id));

  const isDesktopVisible = viewMode === 'table' || viewMode === 'auto';
  const isMobileVisible = viewMode === 'card' || viewMode === 'auto';

  if (pagedDishes.length === 0) {
    return (
      <div className="bg-white border border-[#D3D1CB] p-12 text-center text-neutral-500 rounded-none shadow-xs font-sans">
        <div className="text-3xl mb-3">🔍</div>
        <h3 className="text-base font-bold text-[#1A1A17] mb-1">未找到符合条件的菜品</h3>
        <p className="text-xs text-neutral-400 mb-4 font-mono">
          建议尝试更换筛选关键词、烹饪工艺、或重置筛选条件
        </p>
        <button
          type="button"
          onClick={onResetFilters}
          className="px-4 py-2 border border-[#1A1A17] bg-white hover:bg-[#FAF9F5] text-xs font-bold text-[#1A1A17] rounded-none cursor-pointer"
        >
          重置全部筛选条件
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans">
      {/* 1. DESKTOP DATA TABLE VIEW */}
      <div
        id="desktop-table-container"
        className={`${
          viewMode === 'table'
            ? 'block'
            : viewMode === 'card'
            ? 'hidden'
            : 'hidden lg:block'
        } bg-white border border-[#D3D1CB] overflow-x-auto shadow-xs rounded-none`}
      >
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-neutral-100 border-b border-[#D3D1CB] font-bold text-neutral-700 font-mono">
              <th className="p-3 w-12 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={onToggleSelectAll}
                  className="w-4 h-4 border-neutral-400 text-[#1A1A17] focus:ring-0 rounded-none cursor-pointer"
                />
              </th>
              <th className="py-3 px-4 min-w-[280px]">菜品基本信息与主图</th>
              <th className="py-3 px-4 min-w-[240px]">指定参数 (辣度 / 工艺 / 味型)</th>
              <th className="py-3 px-4 min-w-[160px]">售价与全域优惠</th>
              <th className="py-3 px-4 min-w-[220px]">渠道在售 / 沽清监控</th>
              <th className="py-3 px-4 min-w-[170px] text-right">快捷操作动作</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#D3D1CB] font-sans" id="table-dish-body">
            {pagedDishes.map((dish) => {
              const isSelected = selectedDishIds.has(dish.id);
              const override = channelOverrides[dish.id];
              const deliveryAvail = override ? override.delivery : dish.available;
              const dineInAvail = override ? override.dineIn : dish.available;
              const pickupAvail = override ? override.pickup : dish.available;

              const isAllAvail = deliveryAvail && dineInAvail && pickupAvail;
              const isAllOut = !deliveryAvail && !dineInAvail && !pickupAvail;

              return (
                <tr
                  key={`table-dish-${dish.id}`}
                  className={`hover:bg-[#FAF9F5] transition-colors group ${
                    isSelected ? 'bg-neutral-50' : ''
                  }`}
                >
                  {/* Select Checkbox */}
                  <td className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelectDish(dish.id)}
                      className="row-checkbox w-4 h-4 border-neutral-400 text-[#1A1A17] focus:ring-0 rounded-none cursor-pointer"
                    />
                  </td>

                  {/* Dish Info & Thumbnail */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-14 h-14 bg-neutral-900 flex-shrink-0 relative overflow-hidden border border-neutral-300 flex items-center justify-center text-white font-mono text-[10px] rounded-none cursor-pointer group"
                        onClick={() => onPreviewZoom(dish)}
                        title="点击放大查看大图 / 更换素材"
                      >
                        {dish.imageUrl ? (
                          <img
                            src={dish.imageUrl}
                            alt={dish.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center font-bold">
                            <span className="text-base">{getCategoryEmoji(dish.category)}</span>
                            <br />
                            {dish.category.toUpperCase().slice(0, 4)}
                          </div>
                        )}
                        <span className="absolute top-0 right-0 bg-neutral-800 text-[9px] px-1 text-neutral-200 rounded-none">
                          {dish.typeTag || '外卖'}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="font-bold text-sm text-[#1A1A17] hover:text-purple-700 cursor-pointer"
                            onClick={() => onOpenDrawer(dish)}
                          >
                            {dish.name}
                          </span>
                          {dish.category === 'yakitori' && (
                            <span className="text-[10px] bg-black text-white px-1 font-mono font-bold rounded-none">
                              招牌
                            </span>
                          )}
                          {dish.isPopular && (
                            <span className="text-[10px] bg-red-100 text-red-700 border border-red-300 px-1 font-mono font-bold rounded-none">
                              堂食人气
                            </span>
                          )}
                          {dish.barcode && (
                            <span className="text-[9px] bg-neutral-100 text-neutral-600 border border-neutral-300 px-1 font-mono rounded-none">
                              69码
                            </span>
                          )}
                          {globalFranchiseEngine.getPolicy(dish.id)?.isHqLocked && (
                            <span
                              className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-1 font-mono font-bold flex items-center gap-0.5 rounded-none"
                              title={`👑 总部强锁定爆品: ${globalFranchiseEngine.getPolicy(dish.id)?.lockedReason || ''}`}
                            >
                              <Crown className="w-2.5 h-2.5 text-amber-700 inline" />
                              总部锁定
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] font-mono text-neutral-500 uppercase tracking-tight truncate max-w-[220px]">
                          {dish.enName || 'ARTISANAL DISH SPEC'}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-mono mt-1">
                          <span>⏱ {dish.prepTime || '8m'}</span>
                          <span>·</span>
                          <span>条码: {dish.barcode || '697998800019'}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Specified Parameters */}
                  <td className="py-3.5 px-4 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1 text-[11px] font-mono">
                      {dish.spicinessLevel ? (
                        <span
                          className={`px-1.5 py-0.5 border font-bold rounded-none ${
                            dish.spicinessLevel.includes('辣') && !dish.spicinessLevel.includes('不辣')
                              ? 'bg-red-100 text-red-700 border-red-200'
                              : 'bg-neutral-100 text-neutral-700 border-neutral-200'
                          }`}
                        >
                          {dish.spicinessLevel}
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-neutral-100 text-neutral-700 border border-neutral-200 rounded-none">
                          微辣
                        </span>
                      )}

                      <span className="px-1.5 py-0.5 bg-neutral-100 text-neutral-800 border border-neutral-200 rounded-none">
                        {dish.flavor || '秘制黑椒'}
                      </span>

                      <span className="px-1.5 py-0.5 bg-neutral-100 text-neutral-800 border border-neutral-200 rounded-none">
                        {dish.cookingStyle || '炭火现烤'}
                      </span>
                    </div>

                    <div className="text-[11px] text-neutral-500 flex gap-1 flex-wrap">
                      {(dish.flavorTags && dish.flavorTags.length > 0
                        ? dish.flavorTags
                        : ['炙烤焦香', '鲜嫩多汁']
                      ).map((tag, idx) => (
                        <span key={`tag-${dish.id}-${idx}`}>#{tag}</span>
                      ))}
                    </div>
                  </td>

                  {/* Price & Discounts */}
                  <td className="py-3.5 px-4">
                    <div className="text-base font-mono font-extrabold text-[#1A1A17]">
                      ¥{dish.price.toFixed(2)}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-mono">
                      {dish.prevPrice && dish.prevPrice > dish.price ? (
                        <span className="line-through text-neutral-400">
                          ¥{dish.prevPrice.toFixed(2)}
                        </span>
                      ) : dish.originalPrice && dish.originalPrice > dish.price ? (
                        <span className="line-through text-neutral-400">
                          ¥{dish.originalPrice.toFixed(2)}
                        </span>
                      ) : null}

                      {dish.discountTag ? (
                        <span className="text-[#BA1A1A] bg-red-50 px-1 border border-red-200 font-bold rounded-none">
                          {dish.discountTag}
                        </span>
                      ) : dish.deliveryDiscount ? (
                        <span className="text-[#BA1A1A] bg-red-50 px-1 border border-red-200 font-bold rounded-none">
                          立减¥{dish.deliveryDiscount}
                        </span>
                      ) : (
                        <span className="text-neutral-500">限时标准价</span>
                      )}
                    </div>
                  </td>

                  {/* Omnichannel Telemetry Monitor */}
                  <td className="py-3.5 px-4">
                    <div
                      className={`grid grid-cols-3 gap-1 text-center font-mono text-[11px] border p-1.5 rounded-none ${
                        isAllAvail
                          ? 'border-emerald-300 bg-emerald-50/50'
                          : isAllOut
                          ? 'border-red-300 bg-red-50/50'
                          : 'border-amber-300 bg-amber-50/50'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onToggleChannel(dish.id, 'delivery')}
                        className="flex flex-col items-center hover:opacity-80 cursor-pointer"
                        title="点击切换外卖渠道在售状态"
                      >
                        <span className="text-neutral-500 text-[10px]">外卖</span>
                        <span
                          className={`font-bold flex items-center gap-1 ${
                            deliveryAvail ? 'text-emerald-700' : 'text-[#BA1A1A]'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-none inline-block ${
                              deliveryAvail ? 'bg-emerald-600' : 'bg-[#BA1A1A]'
                            }`}
                          ></span>
                          {deliveryAvail ? '在售' : '沽清'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleChannel(dish.id, 'dineIn')}
                        className="flex flex-col items-center border-x border-[#D3D1CB] hover:opacity-80 cursor-pointer"
                        title="点击切换堂食渠道在售状态"
                      >
                        <span className="text-neutral-500 text-[10px]">堂食</span>
                        <span
                          className={`font-bold flex items-center gap-1 ${
                            dineInAvail ? 'text-emerald-700' : 'text-[#BA1A1A]'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-none inline-block ${
                              dineInAvail ? 'bg-emerald-600' : 'bg-[#BA1A1A]'
                            }`}
                          ></span>
                          {dineInAvail ? '在售' : '沽清'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleChannel(dish.id, 'pickup')}
                        className="flex flex-col items-center hover:opacity-80 cursor-pointer"
                        title="点击切换自提渠道在售状态"
                      >
                        <span className="text-neutral-500 text-[10px]">自提</span>
                        <span
                          className={`font-bold flex items-center gap-1 ${
                            pickupAvail ? 'text-emerald-700' : 'text-[#BA1A1A]'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-none inline-block ${
                              pickupAvail ? 'bg-emerald-600' : 'bg-[#BA1A1A]'
                            }`}
                          ></span>
                          {pickupAvail ? '在售' : '沽清'}
                        </span>
                      </button>
                    </div>

                    <span
                      className={`text-[10px] font-mono mt-1 block ${
                        isAllAvail
                          ? 'text-emerald-800'
                          : isAllOut
                          ? 'text-[#BA1A1A]'
                          : 'text-amber-700'
                      }`}
                    >
                      {isAllAvail
                        ? '■ 全渠道正常通售'
                        : isAllOut
                        ? '■ 全渠道已沽清'
                        : '▲ 仅限部分渠道供应'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right space-x-1 whitespace-nowrap relative">
                    {/* Stock quick toggle */}
                    {isAllAvail ? (
                      <button
                        type="button"
                        onClick={() => onSetSingleDishAllChannels(dish, false)}
                        className="px-2 py-1 text-xs border border-[#BA1A1A] text-[#BA1A1A] hover:bg-[#BA1A1A] hover:text-white font-mono transition-colors rounded-none cursor-pointer"
                        title="一键沽清此菜品所有渠道"
                      >
                        沽清
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSetSingleDishAllChannels(dish, true)}
                        className="px-2 py-1 text-xs border border-emerald-600 text-emerald-700 hover:bg-emerald-600 hover:text-white font-mono transition-colors rounded-none cursor-pointer"
                        title="恢复此菜品全渠道在售"
                      >
                        恢复全售
                      </button>
                    )}

                    {/* Variants button */}
                    <button
                      type="button"
                      onClick={() => onOpenEditModal(dish, 'variants')}
                      className="px-2 py-1 text-xs border border-[#D3D1CB] hover:bg-neutral-100 font-mono rounded-none cursor-pointer"
                    >
                      变体({dish.variants?.length || 0})
                    </button>

                    {/* Parameter Rules Drawer/Modal button */}
                    <button
                      type="button"
                      onClick={() => onOpenDrawer(dish)}
                      className="px-2.5 py-1 text-xs bg-[#1A1A17] text-white hover:bg-black font-mono rounded-none cursor-pointer"
                    >
                      参数规则
                    </button>

                    {/* More actions button & popover */}
                    <button
                      type="button"
                      onClick={() =>
                        setMoreActionDishId(moreActionDishId === dish.id ? null : dish.id)
                      }
                      className="px-1.5 py-1 text-xs border border-[#D3D1CB] hover:bg-neutral-100 font-mono rounded-none cursor-pointer text-neutral-600"
                      title="更多操作"
                    >
                      •••
                    </button>

                    {moreActionDishId === dish.id && (
                      <div className="absolute right-4 top-10 z-30 w-40 bg-white border border-[#D3D1CB] shadow-md py-1 text-xs text-left rounded-none font-sans animate-in fade-in duration-100">
                        <button
                          type="button"
                          onClick={() => {
                            setMoreActionDishId(null);
                            onQuickPrice(dish);
                          }}
                          className="w-full px-3 py-1.5 hover:bg-[#FAF9F5] text-neutral-700 flex items-center gap-2 cursor-pointer"
                        >
                          <TrendingDown className="w-3.5 h-3.5 text-neutral-500" />
                          <span>快速调整单价</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMoreActionDishId(null);
                            onCloneDish(dish);
                          }}
                          className="w-full px-3 py-1.5 hover:bg-[#FAF9F5] text-neutral-700 flex items-center gap-2 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5 text-neutral-500" />
                          <span>复制此菜品</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMoreActionDishId(null);
                            onPrintLabel(dish);
                          }}
                          className="w-full px-3 py-1.5 hover:bg-[#FAF9F5] text-neutral-700 flex items-center gap-2 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5 text-neutral-500" />
                          <span>打印出餐标贴</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMoreActionDishId(null);
                            onOpenUploadModal(dish);
                          }}
                          className="w-full px-3 py-1.5 hover:bg-[#FAF9F5] text-neutral-700 flex items-center gap-2 cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5 text-neutral-500" />
                          <span>更换实物大图</span>
                        </button>
                        <div className="border-t border-[#D3D1CB] my-1"></div>
                        <button
                          type="button"
                          onClick={() => {
                            setMoreActionDishId(null);
                            onOpenEditModal(dish);
                          }}
                          className="w-full px-3 py-1.5 hover:bg-[#FAF9F5] text-purple-700 font-bold flex items-center gap-2 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>全量编辑向导</span>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 2. MOBILE CARD FLOW VIEW */}
      <div
        id="mobile-cards-container"
        aria-label="移动触控卡片流"
        className={`${
          viewMode === 'card'
            ? 'block space-y-3'
            : viewMode === 'table'
            ? 'hidden'
            : 'block lg:hidden space-y-3'
        }`}
      >
        {pagedDishes.map((dish) => {
          const isSelected = selectedDishIds.has(dish.id);
          const override = channelOverrides[dish.id];
          const deliveryAvail = override ? override.delivery : dish.available;
          const dineInAvail = override ? override.dineIn : dish.available;
          const pickupAvail = override ? override.pickup : dish.available;

          const isAllAvail = deliveryAvail && dineInAvail && pickupAvail;
          const isAllOut = !deliveryAvail && !dineInAvail && !pickupAvail;

          return (
            <article
              key={`mobile-dish-${dish.id}`}
              className={`dish-mobile-card bg-white border border-[#D3D1CB] p-3.5 space-y-3 shadow-xs rounded-none ${
                isSelected ? 'ring-1 ring-[#1A1A17]' : ''
              }`}
            >
              {/* Header row: Thumbnail, Title, Price */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex gap-3 items-start">
                  <div
                    className="w-14 h-14 bg-neutral-900 flex-shrink-0 flex items-center justify-center text-white font-mono text-xs border border-neutral-300 rounded-none overflow-hidden cursor-pointer"
                    onClick={() => onPreviewZoom(dish)}
                  >
                    {dish.imageUrl ? (
                      <img
                        src={dish.imageUrl}
                        alt={dish.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{getCategoryEmoji(dish.category)}</span>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className="text-sm font-bold text-[#1A1A17] cursor-pointer"
                        onClick={() => onOpenDrawer(dish)}
                      >
                        {dish.name}
                      </span>
                      {dish.category === 'yakitori' && (
                        <span className="text-[10px] bg-white border border-black text-black px-1 font-mono font-bold rounded-none">
                          招牌
                        </span>
                      )}
                      {dish.isPopular && (
                        <span className="text-[10px] bg-white text-red-700 border border-red-300 px-1 font-mono font-bold rounded-none">
                          堂食人气
                        </span>
                      )}
                      {globalFranchiseEngine.getPolicy(dish.id)?.isHqLocked && (
                        <span
                          className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-1 font-mono font-bold flex items-center gap-0.5 rounded-none"
                          title={`👑 总部强锁定爆品: ${globalFranchiseEngine.getPolicy(dish.id)?.lockedReason || ''}`}
                        >
                          <Crown className="w-2.5 h-2.5 text-amber-700 inline" />
                          总部锁定
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] font-mono text-neutral-500 uppercase truncate max-w-[200px]">
                      {dish.enName || 'ARTISANAL SPEC'}
                    </div>

                    <div className="text-[11px] text-neutral-500 font-mono flex items-center gap-2 mt-0.5">
                      <span>⏱ {dish.prepTime || '8m'}</span>
                      <span>·</span>
                      <span>条码: {dish.barcode || '697998800019'}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-base font-black font-mono text-[#1A1A17]">
                    ¥{dish.price.toFixed(2)}
                  </div>
                  {dish.prevPrice && dish.prevPrice > dish.price ? (
                    <div className="text-[11px] font-mono text-neutral-400 line-through">
                      原价¥{dish.prevPrice.toFixed(2)}
                    </div>
                  ) : dish.discountTag ? (
                    <div className="text-[11px] font-mono text-[#BA1A1A] bg-white px-1 border border-red-200 font-bold rounded-none">
                      {dish.discountTag}
                    </div>
                  ) : dish.deliveryDiscount ? (
                    <div className="text-[11px] font-mono text-[#BA1A1A] bg-white px-1 border border-red-200 font-bold rounded-none">
                      立减¥{dish.deliveryDiscount}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Params Tags Row */}
              <div className="flex flex-wrap items-center gap-1 text-[11px] font-mono">
                {dish.spicinessLevel ? (
                  <span
                    className={`px-1.5 py-0.5 border font-bold rounded-none ${
                      dish.spicinessLevel.includes('辣') && !dish.spicinessLevel.includes('不辣')
                        ? 'bg-white text-red-700 border-red-200'
                        : 'bg-white text-neutral-700 border-neutral-200'
                    }`}
                  >
                    {dish.spicinessLevel}
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 bg-white text-red-700 border border-red-200 font-bold rounded-none">
                    微辣
                  </span>
                )}

                <span className="px-1.5 py-0.5 bg-white text-neutral-800 border border-neutral-200 rounded-none">
                  {dish.flavor || '秘制黑椒'}
                </span>

                <span className="px-1.5 py-0.5 bg-white text-neutral-800 border border-neutral-200 rounded-none">
                  {dish.cookingStyle || '炭火现烤'}
                </span>

                <span className="text-neutral-500 text-[10px]">
                  #{(dish.flavorTags || ['炙烤焦香', '鲜嫩多汁']).join(' #')}
                </span>
              </div>

              {/* Telemetry 3-col status grid */}
              <div className="grid grid-cols-3 gap-1 bg-white p-2 border border-[#D3D1CB] text-center font-mono text-xs rounded-none">
                <button
                  type="button"
                  onClick={() => onToggleChannel(dish.id, 'delivery')}
                  className="flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span
                    className={`w-2 h-2 rounded-none ${
                      deliveryAvail ? 'bg-emerald-600' : 'bg-[#BA1A1A]'
                    }`}
                  ></span>
                  <span className={deliveryAvail ? 'text-neutral-700' : 'text-[#BA1A1A] font-bold'}>
                    外卖: {deliveryAvail ? '在售' : '沽清'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleChannel(dish.id, 'dineIn')}
                  className="flex items-center justify-center gap-1.5 border-x border-neutral-200 cursor-pointer"
                >
                  <span
                    className={`w-2 h-2 rounded-none ${
                      dineInAvail ? 'bg-emerald-600' : 'bg-[#BA1A1A]'
                    }`}
                  ></span>
                  <span className={dineInAvail ? 'text-neutral-700' : 'text-[#BA1A1A] font-bold'}>
                    堂食: {dineInAvail ? '在售' : '沽清'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleChannel(dish.id, 'pickup')}
                  className="flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span
                    className={`w-2 h-2 rounded-none ${
                      pickupAvail ? 'bg-emerald-600' : 'bg-[#BA1A1A]'
                    }`}
                  ></span>
                  <span className={pickupAvail ? 'text-neutral-700' : 'text-[#BA1A1A] font-bold'}>
                    自提: {pickupAvail ? '在售' : '沽清'}
                  </span>
                </button>
              </div>

              {/* Mobile 4-button action grid */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {isAllAvail ? (
                  <button
                    type="button"
                    onClick={() => onSetSingleDishAllChannels(dish, false)}
                    className="py-2 text-xs border border-[#BA1A1A] text-[#BA1A1A] bg-white hover:bg-red-50 font-mono font-bold flex items-center justify-center gap-1 rounded-none cursor-pointer"
                  >
                    <span className="text-xs">🚫</span> 沽清
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSetSingleDishAllChannels(dish, true)}
                    className="py-2 text-xs border border-emerald-600 text-emerald-700 bg-white hover:bg-emerald-50 font-mono font-bold flex items-center justify-center gap-1 rounded-none cursor-pointer"
                  >
                    <span className="text-xs">✓</span> 恢复全售
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onOpenEditModal(dish, 'variants')}
                  className="py-2 text-xs border border-[#D3D1CB] bg-white text-neutral-800 hover:bg-[#FAF9F5] font-mono rounded-none cursor-pointer"
                >
                  变体({dish.variants?.length || 0})
                </button>

                <button
                  type="button"
                  onClick={() => onOpenDrawer(dish)}
                  className="py-2 text-xs border border-[#1A1A17] bg-white text-[#1A1A17] hover:bg-[#FAF9F5] font-mono font-bold rounded-none cursor-pointer"
                >
                  参数规则
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setMoreActionDishId(moreActionDishId === dish.id ? null : dish.id)
                  }
                  className="py-2 text-xs border border-[#D3D1CB] bg-white text-neutral-800 hover:bg-[#FAF9F5] font-mono rounded-none cursor-pointer"
                >
                  •••
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
