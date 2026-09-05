import React, { useState } from 'react';
import { Trash2, Plus, Minus, Image as ImageIcon, AlignLeft, X } from 'lucide-react';
import { CartItem } from '../../types';
import { matchDishImageUrl } from '../../utils/dishImageMatcher';

interface CartItemListSectionProps {
  items: CartItem[];
  onUpdateQuantity: (cartItemId: string, newQty: number) => void;
  onRemoveItem: (cartItemId: string) => void;
}

export const CartItemListSection: React.FC<CartItemListSectionProps> = ({
  items,
  onUpdateQuantity,
  onRemoveItem
}) => {
  const [viewMode, setViewMode] = useState<'rich' | 'compact'>('rich');
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <section
      className="bg-white p-4 border border-[#e6e6e2] shadow-card rounded-none"
      data-purpose="ordered-dish-list"
    >
      {/* Header with Title & View Mode Switcher */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-neutral-900 tracking-tight">已点餐品明细</h2>
          <span className="text-xs text-neutral-400 font-medium" id="orderItemCountSummary">
            共 {totalCount} 份
          </span>
        </div>

        {/* View Mode Switcher: 图文 vs 纯文字 */}
        <div
          className="inline-flex items-center bg-neutral-100 p-0.5 rounded-lg border border-neutral-200 text-xs"
          role="group"
          aria-label="餐品展示模式切换"
        >
          <button
            type="button"
            onClick={() => setViewMode('rich')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs transition-all duration-200 cursor-pointer ${
              viewMode === 'rich'
                ? 'bg-white text-neutral-900 font-semibold shadow-sm'
                : 'text-neutral-500 font-medium hover:text-neutral-800'
            }`}
          >
            <ImageIcon className="w-3 h-3" />
            <span>图文</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('compact')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs transition-all duration-200 cursor-pointer ${
              viewMode === 'compact'
                ? 'bg-white text-neutral-900 font-semibold shadow-sm'
                : 'text-neutral-500 font-medium hover:text-neutral-800'
            }`}
          >
            <AlignLeft className="w-3 h-3" />
            <span>纯文字</span>
          </button>
        </div>
      </div>

      {/* Items List */}
      <div className="divide-y divide-neutral-100">
        {items.map((item) => {
          const dishImage = matchDishImageUrl(item.dish);
          const unitPrice = item.calculatedPrice / item.quantity;
          const optionsList = Object.values(item.selectedOptions || {});

          return (
            <article
              key={item.cartItemId}
              className="pt-3.5 pb-3.5 flex gap-3 items-start transition-colors"
              data-purpose="dish-item"
            >
              {/* Dish Image (Shown only in 'rich' mode) */}
              {viewMode === 'rich' && (
                <div
                  className="w-[72px] h-[72px] shrink-0 overflow-hidden bg-neutral-900 relative shadow-sm border border-neutral-100 rounded-none"
                  id="dishImageWrapper"
                >
                  <img
                    alt={item.dish.name}
                    src={dishImage}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                  {item.dish.isPopular && (
                    <span className="absolute top-0 left-0 bg-amber-500 text-white text-[9px] font-bold px-1 py-0.2">
                      招牌
                    </span>
                  )}
                </div>
              )}

              {/* Dish Content & Specs */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1">
                  <h3 className="font-bold text-sm text-neutral-900 leading-snug truncate">
                    {item.dish.name}
                  </h3>
                </div>

                {/* Tags / Modifiers Pills */}
                {optionsList.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {optionsList.map((opt, idx) => (
                      <span
                        key={idx}
                        className="inline-block text-[11px] bg-neutral-100 text-neutral-600 px-2 py-0.5 font-normal rounded-sm"
                      >
                        {opt}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-neutral-400 mt-0.5">标准现烤制作 · 现制现送</p>
                )}

                {/* Price and Stepper Controller */}
                <div className="flex items-baseline justify-between mt-3 pt-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-bold text-neutral-900 tracking-tight font-mono">
                      ¥<span className="text-base">{item.calculatedPrice.toFixed(2)}</span>
                    </span>
                    <span className="text-xs text-neutral-400 font-normal font-mono">
                      (¥{unitPrice.toFixed(2)}/份)
                    </span>
                  </div>

                  {/* Stepper with Tactile Action */}
                  <div
                    className="flex items-center gap-1.5 bg-neutral-50 rounded-lg p-0.5 border border-neutral-200"
                    data-purpose="stepper"
                  >
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.cartItemId)}
                      className="text-neutral-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer active:scale-95"
                      title="移除商品"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      aria-label="减少数量"
                      onClick={() => {
                        if (item.quantity <= 1) {
                          onRemoveItem(item.cartItemId);
                        } else {
                          onUpdateQuantity(item.cartItemId, item.quantity - 1);
                        }
                      }}
                      className="w-6 h-6 flex items-center justify-center rounded bg-white text-neutral-700 shadow-xs border border-neutral-200 cursor-pointer active:scale-95 transition-all hover:bg-neutral-50"
                    >
                      <Minus className="w-3 h-3" />
                    </button>

                    <span className="w-6 text-center text-xs font-bold text-neutral-900 select-none font-mono">
                      {item.quantity}
                    </span>

                    <button
                      type="button"
                      aria-label="增加数量"
                      onClick={() => onUpdateQuantity(item.cartItemId, item.quantity + 1)}
                      className="w-6 h-6 flex items-center justify-center rounded bg-neutral-900 text-white shadow-xs cursor-pointer active:scale-95 transition-all hover:bg-black"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
