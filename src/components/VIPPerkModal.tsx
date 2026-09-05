import React from 'react';
import { X, Sparkles, Zap, ShieldCheck, Flame, Award, Check } from 'lucide-react';

interface VIPPerkModalProps {
  isOpen: boolean;
  onClose: () => void;
  isVIPActive: boolean;
  onToggleVIP: () => void;
}

export const VIPPerkModal: React.FC<VIPPerkModalProps> = ({
  isOpen,
  onClose,
  isVIPActive,
  onToggleVIP
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl border border-[#e2e3e1] flex flex-col overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Banner */}
        <div className="bg-gradient-to-br from-[#FFF8E1] via-[#FFE082] to-[#FFD54F] p-4 sm:p-5 text-[#422006] relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-white/20 rounded-full blur-xl pointer-events-none" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-6.5 h-6.5 rounded-full bg-black/10 hover:bg-black/20 text-[#422006] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/10 text-[11px] font-bold mb-1.5">
            <Sparkles className="w-3 h-3 fill-[#B78103] text-[#B78103]" />
            <span>URBAN RADAR BLACK VIP</span>
          </div>

          <h3 className="text-lg sm:text-xl font-black tracking-tight text-[#3E2723]">
            黑曜石 VIP 专属优先出餐特权
          </h3>
          <p className="text-xs text-[#5D4037] mt-0.5">
            动态巡游智能餐车专属快速通道，告别排队等待
          </p>
        </div>

        {/* Perks list */}
        <div className="p-3.5 sm:p-4 space-y-2.5 bg-white text-xs">
          <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#f9f9f7] border border-[#e2e3e1]">
            <div className="p-1.5 rounded-lg bg-[#FFF8E1] text-[#B78103]">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <div>
              <h4 className="font-bold text-black text-xs">后厨出餐队列智能插队</h4>
              <p className="text-[#787770] text-[10.5px] mt-0.5">
                订单直连流动餐车炭烤工作站，出餐优先级提高至 99%，平均缩短出餐耗时 40%。
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#f9f9f7] border border-[#e2e3e1]">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-[#006d36]">
              <Flame className="w-3.5 h-3.5" />
            </div>
            <div>
              <h4 className="font-bold text-black text-xs">专属恒温锁鲜航天包装</h4>
              <p className="text-[#787770] text-[10.5px] mt-0.5">
                配备双层石墨烯恒温铝箔保温餐盒，保证 A5 和牛汉堡与炙烤五花肉到手依然酥脆焦香。
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#f9f9f7] border border-[#e2e3e1]">
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
              <Award className="w-3.5 h-3.5" />
            </div>
            <div>
              <h4 className="font-bold text-black text-xs">专享立减优惠券自动抵扣</h4>
              <p className="text-[#787770] text-[10.5px] mt-0.5">
                每单自动抵扣 ¥5 专享特惠券，可与外卖立减叠加使用。
              </p>
            </div>
          </div>
        </div>

        {/* Action Toggle */}
        <div className="p-3 bg-[#f9f9f7] border-t border-[#e2e3e1] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-black">当前 VIP 特权状态:</span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded border ${
                isVIPActive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-neutral-100 text-neutral-600 border-neutral-200'
              }`}
            >
              {isVIPActive ? '已激活生效' : '未开启'}
            </span>
          </div>

          <button
            onClick={onToggleVIP}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs border ${
              isVIPActive
                ? 'bg-emerald-50/80 border-2 border-emerald-500 text-emerald-700 font-black shadow-2xs'
                : 'bg-black text-white hover:bg-neutral-800 border-black'
            }`}
          >
            {isVIPActive ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                <span>特权保持开启</span>
              </>
            ) : (
              <span>免费激活 VIP</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
