import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Settings,
  Tag,
  Calendar,
  Clock,
  QrCode,
  ArrowRight,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Layers,
  ShieldCheck,
  Percent
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CouponItem, UserCouponRecord } from '../types/coupon';
import { INITIAL_USER_COUPONS, INITIAL_MERCHANT_COUPONS } from '../data/mockCoupons';
import { CategoryType } from '../types';
import { safeGetStorage, safeSetStorage } from '../utils/safeStorage';
import { copyTextToClipboard } from '../utils/clipboard';

interface UserCouponsPageViewProps {
  onBackToMenu: () => void;
  onGoToCategory?: (category: CategoryType) => void;
  onOpenVIP?: () => void;
  isVIPActive?: boolean;
}

export const UserCouponsPageView: React.FC<UserCouponsPageViewProps> = ({
  onBackToMenu,
  onGoToCategory,
  onOpenVIP,
  isVIPActive = true
}) => {
  const [activeTab, setActiveTab] = useState<'available' | 'used' | 'expired'>('available');
  const [couponInput, setCouponInput] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedRuleDetail, setSelectedRuleDetail] = useState<CouponItem | null>(null);
  const [selectedQrCoupon, setSelectedQrCoupon] = useState<CouponItem | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Load User Coupons from localStorage or Initial
  const [userCoupons, setUserCoupons] = useState<UserCouponRecord[]>(() => {
    return safeGetStorage<UserCouponRecord[]>('obsidian_user_coupons', INITIAL_USER_COUPONS);
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const saveUserCoupons = (newList: UserCouponRecord[]) => {
    setUserCoupons(newList);
    safeSetStorage('obsidian_user_coupons', newList);
  };

  // Filter coupons by status
  const availableCoupons = useMemo(
    () => userCoupons.filter((c) => c.status === 'available'),
    [userCoupons]
  );
  const usedCoupons = useMemo(
    () => userCoupons.filter((c) => c.status === 'used'),
    [userCoupons]
  );
  const expiredCoupons = useMemo(
    () => userCoupons.filter((c) => c.status === 'expired'),
    [userCoupons]
  );

  // Total potential savings calculation
  const totalPotentialSavings = useMemo(() => {
    return availableCoupons.reduce((sum, item) => {
      if (item.coupon.couponType === 'amount_cut' || item.coupon.couponType === 'no_threshold') {
        return sum + item.coupon.discountValue;
      }
      if (item.coupon.couponType === 'delivery_free') {
        return sum + 5;
      }
      if (item.coupon.couponType === 'discount_percent') {
        return sum + (item.coupon.maxDiscountCap || 15);
      }
      return sum;
    }, 0);
  }, [availableCoupons]);

  // Code redemption handler
  const handleRedeemCode = (e?: React.FormEvent, customCode?: string) => {
    if (e) e.preventDefault();
    const targetCode = (customCode || couponInput).trim().toUpperCase();
    if (!targetCode) {
      showToast('请输入有效的优惠券兑换码 (Please enter promo code)');
      return;
    }

    // Check if already claimed and available
    const alreadyHas = userCoupons.find(
      (uc) => uc.coupon.code.toUpperCase() === targetCode && uc.status === 'available'
    );
    if (alreadyHas) {
      showToast(`您已持有该卡券【${alreadyHas.coupon.title}】`);
      setCouponInput('');
      return;
    }

    // Find in merchant coupons or create dynamic matched coupon
    const matched = INITIAL_MERCHANT_COUPONS.find((mc) => mc.code.toUpperCase() === targetCode);
    if (matched) {
      const newRecord: UserCouponRecord = {
        userCouponId: `uc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        couponId: matched.id,
        coupon: matched,
        status: 'available',
        acquiredAt: new Date().toISOString().slice(0, 10)
      };
      const updated = [newRecord, ...userCoupons];
      saveUserCoupons(updated);
      showToast(`🎉 兑换成功！已获得「${matched.title}」`);
      setCouponInput('');
      setActiveTab('available');
    } else {
      // Dynamic fallback for custom code
      const isPercent = targetCode.includes('10') || targetCode.includes('88');
      const dynamicCoupon: CouponItem = {
        id: `cpn-custom-${Date.now()}`,
        code: targetCode,
        title: isPercent ? 'Lunch Rush Special' : `VIP Special Voucher (${targetCode})`,
        subtitle: 'Applies to all Urban Radar items',
        couponType: isPercent ? 'discount_percent' : 'amount_cut',
        discountValue: isPercent ? 0.9 : 5.0,
        minSpend: isPercent ? 30.0 : 0,
        scopeType: 'all_dishes',
        timeSlotType: 'all_day',
        timeSlotLabel: '全天全时段通用',
        dayRestriction: 'all_week',
        dayRestrictionLabel: '全周通用',
        designStyle: 'black_gold',
        badgeText: 'VIP ONLY',
        totalQuantity: 100,
        issuedCount: 1,
        usedCount: 0,
        status: 'active',
        expireDate: '2026-09-30',
        createdAt: new Date().toISOString().slice(0, 10)
      };
      const newRecord: UserCouponRecord = {
        userCouponId: `uc-${Date.now()}`,
        couponId: dynamicCoupon.id,
        coupon: dynamicCoupon,
        status: 'available',
        acquiredAt: new Date().toISOString().slice(0, 10)
      };
      saveUserCoupons([newRecord, ...userCoupons]);
      showToast(`🎉 兑换成功！已为您录入「${dynamicCoupon.title}」`);
      setCouponInput('');
      setActiveTab('available');
    }
  };

  const handleCopyCode = (code: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
    setCopiedCode(code);
    showToast(`券码【${code}】已复制到剪贴板`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleUseNow = (coupon: CouponItem) => {
    if (coupon.scopeCategories && coupon.scopeCategories.length > 0 && onGoToCategory) {
      onGoToCategory(coupon.scopeCategories[0]);
    } else {
      onBackToMenu();
    }
  };

  const displayedCoupons = useMemo(() => {
    if (activeTab === 'available') return availableCoupons;
    if (activeTab === 'used') return usedCoupons;
    return expiredCoupons;
  }, [activeTab, availableCoupons, usedCoupons, expiredCoupons]);

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-[#fafaf9] text-[#1a1c1b] pb-20 font-sans select-none animate-in fade-in duration-200">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#111] text-white text-xs px-3 py-2 rounded-full shadow-2xl border border-neutral-700/80 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-medium">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="px-0.5 py-0.5 space-y-2">
        {/* 1. Active Elite Executive Summary Card */}
        <div className="bg-white rounded-xl border border-[#e5e5e2] p-2.5 shadow-2xs">
          {/* Top Elite Badge */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-black flex items-center justify-center">
              <span className="text-[8px] font-black">★</span>
            </div>
            <span className="text-[10.5px] font-black tracking-wider uppercase text-black font-mono">
              {isVIPActive ? '黑卡尊享会员' : '先锋注册会员'}
            </span>
          </div>

          {/* 2-Column Metrics */}
          <div className="grid grid-cols-2 divide-x divide-[#ecece8] pt-0.5 pb-0.5">
            {/* Left Column: Available Vouchers */}
            <div className="pr-2">
              <span className="text-[10.5px] text-[#787770] block font-medium">
                当前可用优惠券
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg sm:text-xl font-black text-black font-mono">
                  {availableCoupons.length}
                </span>
                <span className="text-[10px] font-bold text-black">有效可用</span>
              </div>
            </div>

            {/* Right Column: Est. Savings */}
            <div className="pl-2.5">
              <span className="text-[10.5px] text-[#787770] block font-medium">
                预计累计可省
              </span>
              <div className="mt-0.5">
                <span className="text-lg sm:text-xl font-black text-[#059669] font-mono">
                  ¥{totalPotentialSavings > 0 ? totalPotentialSavings.toFixed(0) : '50'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Promo Code Input & Redeem Bar */}
        <div className="space-y-1">
          <form
            onSubmit={(e) => handleRedeemCode(e)}
            className="flex items-center gap-1.5"
          >
            <div className="flex-1 bg-white rounded-lg border border-[#e5e5e2] px-2 py-1.5 flex items-center gap-1.5 shadow-2xs focus-within:border-black transition-colors">
              <Tag className="w-3.5 h-3.5 text-[#8c8b84] shrink-0" />
              <input
                type="text"
                placeholder="输入兑换码 (如 UR-VIP5)..."
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                className="w-full text-xs font-medium text-black placeholder-[#8c8b84] bg-transparent outline-none uppercase font-mono"
              />
            </div>

            <button
              type="submit"
              className="bg-black hover:bg-neutral-800 active:scale-95 text-white font-black text-xs px-3.5 py-1.5 rounded-lg tracking-wider transition-all shadow-2xs cursor-pointer shrink-0"
            >
              立即兑换
            </button>
          </form>

          {/* Quick test chips */}
          <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar py-0.5 text-[9.5px]">
            <span className="text-[#787770] whitespace-nowrap font-medium">快捷试用码:</span>
            {['UR-VIP5', 'UR-LUNCH10', 'UR-DRINK88', 'UR-WEEKEND20'].map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => handleRedeemCode(undefined, code)}
                className="bg-[#e9e9e6] hover:bg-[#deded9] active:scale-95 text-[#333] px-1.5 py-0.5 rounded font-mono font-bold whitespace-nowrap transition-colors cursor-pointer"
              >
                +{code}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Filter Tabs (Available, Used, Expired) */}
        <div className="border-b border-[#e5e5e2] flex items-center gap-3 pt-0.5">
          <button
            type="button"
            onClick={() => setActiveTab('available')}
            className={`pb-1.5 text-xs sm:text-sm font-bold flex items-center gap-1 transition-colors relative cursor-pointer ${
              activeTab === 'available' ? 'text-black' : 'text-[#787770] hover:text-black'
            }`}
          >
            <span>可使用</span>
            <span className="bg-black text-white text-[9px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center font-mono">
              {availableCoupons.length}
            </span>
            {activeTab === 'available' && (
              <motion.div
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('used')}
            className={`pb-1.5 text-xs sm:text-sm font-bold flex items-center gap-1 transition-colors relative cursor-pointer ${
              activeTab === 'used' ? 'text-black' : 'text-[#787770] hover:text-black'
            }`}
          >
            <span>已使用</span>
            <span className="text-[10.5px] text-[#787770] font-normal">({usedCoupons.length})</span>
            {activeTab === 'used' && (
              <motion.div
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('expired')}
            className={`pb-1.5 text-xs sm:text-sm font-bold flex items-center gap-1 transition-colors relative cursor-pointer ${
              activeTab === 'expired' ? 'text-black' : 'text-[#787770] hover:text-black'
            }`}
          >
            <span>已过期</span>
            <span className="text-[10.5px] text-[#787770] font-normal">({expiredCoupons.length})</span>
            {activeTab === 'expired' && (
              <motion.div
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"
              />
            )}
          </button>
        </div>

        {/* 4. Voucher Cards List */}
        <div className="space-y-1.5 pt-0.5">
          {displayedCoupons.length === 0 ? (
            <div className="bg-white rounded-xl p-6 text-center border border-[#e5e5e2] space-y-1">
              <p className="text-xs font-bold text-black">
                {activeTab === 'available'
                  ? '暂无可使用的优惠券'
                  : activeTab === 'used'
                  ? '暂无已使用的卡券记录'
                  : '暂无已过期的卡券记录'}
              </p>
              <p className="text-[10px] text-[#787770]">
                {activeTab === 'available'
                  ? '可在上方输入兑换码领取专属优惠券。'
                  : '您已核销或失效的卡券将收纳在此。'}
              </p>
            </div>
          ) : (
            displayedCoupons.map((item) => {
              const { coupon, status } = item;
              const isAvailable = status === 'available';

              return (
                <div
                  key={item.userCouponId}
                  className={`bg-white rounded-xl border border-[#e5e5e2] shadow-2xs relative overflow-hidden transition-all ${
                    isAvailable ? 'hover:border-black' : 'opacity-60 bg-[#f7f7f5]'
                  }`}
                >
                  {/* VIP ONLY / Badge Tag (Top Right) */}
                  {coupon.badgeText && isAvailable && (
                    <div className="absolute top-0 right-0 bg-black text-white text-[8px] font-black px-1.5 py-0.2 rounded-bl-md font-mono tracking-wider">
                      {coupon.badgeText.toUpperCase()}
                    </div>
                  )}

                  {/* Top Info Section */}
                  <div className="p-2.5 flex items-start gap-2">
                    {/* Left Big Value */}
                    <div className="shrink-0 min-w-[56px] pt-0.5">
                      {coupon.couponType === 'discount_percent' ? (
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-xl font-black text-black font-mono leading-none tracking-tight">
                            {((1 - coupon.discountValue) * 100).toFixed(0)}
                          </span>
                          <span className="text-[9.5px] font-black text-black leading-none">
                            折
                          </span>
                        </div>
                      ) : coupon.couponType === 'delivery_free' ? (
                        <div className="flex flex-col">
                          <span className="text-base font-black text-black leading-none">免配送</span>
                          <span className="text-[8px] font-bold text-[#787770] uppercase mt-0.5">
                            专送特权
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-baseline">
                          <span className="text-xs font-bold text-black mr-0.5">¥</span>
                          <span className="text-xl font-black text-black font-mono leading-none tracking-tight">
                            {coupon.discountValue}
                          </span>
                        </div>
                      )}

                      {/* Cap limit subtitle for percent coupons */}
                      {coupon.maxDiscountCap && (
                        <span className="text-[8px] text-[#8c8b84] font-medium block mt-0.5">
                          封顶减¥{coupon.maxDiscountCap}
                        </span>
                      )}
                    </div>

                    {/* Middle Title, Threshold, and Complete Metadata Fields */}
                    <div className="flex-1 min-w-0 pr-6 space-y-0.5">
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-black truncate">
                          {coupon.title}
                        </h3>
                        <p className="text-[10.5px] text-[#787770]">
                          {coupon.minSpend === 0
                            ? '全场餐品无门槛可用'
                            : `满 ¥${coupon.minSpend} 可用`}
                        </p>
                      </div>

                      {/* Complete Fields: Promo Code + Scope + Time / Day Restriction */}
                      <div className="flex flex-wrap items-center gap-1 pt-0.5">
                        {/* Promo Code Chip with Copy Feature */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyCode(coupon.code);
                          }}
                          className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-[#f4f4f2] hover:bg-[#eaeae6] border border-[#e2e3e1] text-[9px] font-mono font-bold text-[#37352f] cursor-pointer transition-colors"
                          title="点击复制券码"
                        >
                          {copiedCode === coupon.code ? (
                            <Check className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                          ) : (
                            <Copy className="w-2.5 h-2.5 text-[#8c8b84] shrink-0" />
                          )}
                          <span>{coupon.code}</span>
                        </button>

                        {/* Scope Chip */}
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-[#f7f7f5] border border-[#e5e5e2] text-[9px] text-[#555] font-medium">
                          {coupon.scopeType === 'all_dishes'
                            ? '全品类通用'
                            : coupon.scopeCategoryNames?.join(' / ') || '限定品类'}
                        </span>

                        {/* Time Slot & Day Restriction Chip */}
                        {(coupon.timeSlotLabel || coupon.dayRestrictionLabel) && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-[#f7f7f5] border border-[#e5e5e2] text-[9px] text-[#787770]">
                            <Clock className="w-2.5 h-2.5 text-[#999] shrink-0" />
                            <span>
                              {coupon.timeSlotLabel || '全天'} · {coupon.dayRestriction === 'workdays_only' ? '工作日' : coupon.dayRestriction === 'weekends_only' ? '周末' : '全周'}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Divider Line */}
                  <div className="border-t border-[#f0f0ed] mx-2.5" />

                  {/* Bottom Action / Details Bar */}
                  <div className="px-2.5 py-1.5 flex items-center justify-between gap-2">
                    {/* Left: Validity & Rules */}
                    <div className="space-y-0.2 text-xs text-[#787770]">
                      <div className="flex items-center gap-1 text-[9.5px]">
                        <Calendar className="w-3 h-3 text-[#8c8b84]" />
                        <span>有效期至: {coupon.expireDate}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedRuleDetail(coupon)}
                        className="text-black font-bold underline hover:text-neutral-600 text-[9.5px] block cursor-pointer"
                      >
                        使用规则与说明
                      </button>
                    </div>

                    {/* Right: QR Code & Use Now Button */}
                    <div className="flex items-center gap-1.5">
                      {isAvailable ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setSelectedQrCoupon(coupon)}
                            className="w-6.5 h-6.5 rounded-lg border border-[#e5e5e2] bg-white hover:bg-neutral-50 active:scale-95 flex items-center justify-center text-black transition-all cursor-pointer shadow-2xs"
                            title="出示核销二维码"
                          >
                            <QrCode className="w-3.5 h-3.5 stroke-[1.8]" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUseNow(coupon)}
                            className="bg-black hover:bg-neutral-800 active:scale-95 text-white font-black text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all shadow-2xs cursor-pointer tracking-wide"
                          >
                            <span>去使用</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <span className="text-[11px] font-bold text-[#8c8b84] px-2 py-0.5 bg-neutral-100 rounded">
                          {status === 'used' ? '已使用' : '已过期'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Rules & Details Modal */}
      {selectedRuleDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 border border-[#e2e3e1] shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#f0f0ed]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-black text-amber-400 flex items-center justify-center text-xs font-bold">
                  i
                </div>
                <h4 className="font-bold text-sm text-black">卡券使用规则与明细</h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRuleDetail(null)}
                className="w-7 h-7 rounded-full hover:bg-neutral-100 flex items-center justify-center text-neutral-500 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs text-[#37352f]">
              <div className="p-3 bg-[#fafaf8] rounded-xl border border-[#e2e3e1]">
                <span className="font-bold text-black block">{selectedRuleDetail.title}</span>
                <span className="text-[11px] text-[#787770] font-mono mt-0.5 block">
                  优惠券编码: {selectedRuleDetail.code}
                </span>
              </div>

              <div className="space-y-1.5 text-[11.5px] leading-relaxed">
                <p>• <strong>使用门槛:</strong> {selectedRuleDetail.minSpend === 0 ? '全场餐品无门槛立减' : `满 ¥${selectedRuleDetail.minSpend} 可用`}</p>
                <p>• <strong>适用范围:</strong> {selectedRuleDetail.scopeType === 'all_dishes' ? '全品类餐品通用' : `限定品类: ${selectedRuleDetail.scopeCategoryNames?.join(', ')}`}</p>
                <p>• <strong>有效期至:</strong> {selectedRuleDetail.expireDate} 23:59:59</p>
                <p>• <strong>叠加规则:</strong> 每笔订单限用1张，可与黑卡会员特权同享</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedRuleDetail(null)}
              className="w-full py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              关闭说明
            </button>
          </div>
        </div>
      )}

      {/* QR Code Presentation Modal */}
      {selectedQrCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-xs rounded-3xl p-6 border border-[#e2e3e1] shadow-2xl space-y-4 text-center animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-[#f0f0ed]">
              <span className="text-xs font-bold text-black">向店员出示核销二维码</span>
              <button
                type="button"
                onClick={() => setSelectedQrCoupon(null)}
                className="w-6 h-6 rounded-full hover:bg-neutral-100 flex items-center justify-center text-neutral-500 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-[#fafaf9] rounded-2xl border border-[#e2e3e1] inline-block">
              <QrCode className="w-36 h-36 mx-auto text-black" />
            </div>

            <div>
              <div className="text-sm font-bold text-black">{selectedQrCoupon.title}</div>
              <div className="text-xs font-mono font-bold text-[#666] mt-0.5 tracking-wider">
                {selectedQrCoupon.code}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedQrCoupon(null)}
              className="w-full py-2 bg-black text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              完成出示
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
