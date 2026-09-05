import React from 'react';
import { ShoppingBag, Tag } from 'lucide-react';

interface BottomCartBarProps {
  cartCount: number;
  cartTotal: number;
  cartSavings?: number;
  onOpenCart: () => void;
  onProceedToCheckout?: () => void;
  cartTargetRef?: React.RefObject<HTMLDivElement | null>;
}

export const BottomCartBar: React.FC<BottomCartBarProps> = ({
  cartCount,
  cartTotal,
  cartSavings,
  onOpenCart,
  onProceedToCheckout,
  cartTargetRef
}) => {
  const hasItems = cartCount > 0;
  // Calculate discount display (defaults to 7.00 when in cart if not specifically provided)
  const displaySavings = cartSavings && cartSavings > 0 ? cartSavings : 7.0;

  const handleCheckoutClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasItems) return;
    if (onProceedToCheckout) {
      onProceedToCheckout();
    } else {
      onOpenCart();
    }
  };

  return (
    <div
      id="bottom-new-cart-component-bar"
      className="w-full bg-[#F9F9F7] border-t-2 border-[#1A1A17] border-b border-[#E2E1DC] px-[5px] py-[3px] flex items-center justify-between gap-2 select-none shrink-0"
    >
      {/* Left side: Shopping Bag Icon + Subtotal + Discount Badge */}
      <div
        ref={cartTargetRef}
        data-cart-target="true"
        onClick={onOpenCart}
        className="flex items-center gap-2.5 cursor-pointer group"
        title="查看购物车选购清单"
      >
        {/* Square Black Bag Container */}
        <div className="w-8 h-8 sm:w-8.5 sm:h-8.5 bg-[#1A1A17] text-white flex items-center justify-center relative shrink-0 border border-[#1A1A17] shadow-xs">
          <ShoppingBag className="w-4.5 h-4.5 text-white stroke-[1.8]" />
          {hasItems && (
            <span
              id="bottom-cart-item-count-badge"
              className="absolute -top-1.5 -right-1.5 bg-[#D9730D] text-[#1A1A17] font-mono font-black text-[10px] min-w-[16px] h-4 px-1 flex items-center justify-center border border-[#1A1A17] shadow-2xs leading-none"
            >
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </div>

        {/* Pricing Breakdown */}
        <div className="flex items-baseline gap-1.5 font-mono">
          <span className="text-xs font-sans text-stone-500 font-medium">小计</span>
          <span className="text-sm sm:text-base font-black text-[#1A1A17] font-mono tracking-tight">
            ¥{hasItems ? cartTotal.toFixed(2) : '0.00'}
          </span>
          {hasItems ? (
            <div className="inline-flex items-center gap-0.5 bg-[#E8F7ED] text-[#006D36] border border-[#006D36]/25 px-1.5 py-0.5 text-[10px] font-mono font-bold">
              <Tag className="w-2.5 h-2.5 text-[#006D36] shrink-0" />
              <span>省¥{displaySavings.toFixed(2)}</span>
            </div>
          ) : (
            <span className="text-[10px] text-stone-400 font-mono hidden xs:inline-block">
              未选购餐品
            </span>
          )}
        </div>
      </div>

      {/* Right side: Industrial Checkout Button */}
      {hasItems ? (
        <button
          type="button"
          id="bottom-cart-checkout-button"
          onClick={handleCheckoutClick}
          className="bg-[#1A1A17] hover:bg-black active:bg-neutral-800 text-white px-3.5 sm:px-4.5 py-1.5 sm:py-2 border border-[#1A1A17] text-xs font-mono font-bold tracking-wider uppercase flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
        >
          <span className="font-bold tracking-wide">去结算 CHECKOUT</span>
          <span className="text-[#D9730D] font-black text-xs sm:text-sm leading-none">→</span>
        </button>
      ) : (
        <button
          type="button"
          disabled
          id="bottom-cart-checkout-button-disabled"
          className="bg-stone-200 text-stone-400 border border-stone-300 px-3.5 sm:px-4.5 py-1.5 sm:py-2 text-xs font-mono font-bold tracking-wider uppercase flex items-center gap-1.5 cursor-not-allowed"
        >
          <span>去结算 CHECKOUT</span>
          <span className="text-stone-400 font-black text-xs sm:text-sm leading-none">→</span>
        </button>
      )}
    </div>
  );
};
