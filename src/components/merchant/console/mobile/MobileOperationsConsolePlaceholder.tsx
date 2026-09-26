import React from 'react';
import { Smartphone, Monitor, ShieldCheck, Cpu, ArrowRight } from 'lucide-react';

interface MobileOperationsConsolePlaceholderProps {
  onForceDesktopPreview?: () => void;
  onSwitchToClassic?: () => void;
}

export const MobileOperationsConsolePlaceholder: React.FC<MobileOperationsConsolePlaceholderProps> = ({
  onForceDesktopPreview,
  onSwitchToClassic
}) => {
  return (
    <div className="w-full p-4 sm:p-6 bg-[#f9f9f9] border border-[#c4c7c8] rounded-[3px] shadow-xs select-none font-sans min-h-[480px] flex flex-col items-center justify-center text-center">
      {/* Port Isolation Badge */}
      <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-[#c4c7c8] rounded-[3px] text-xs font-semibold text-[#444748] mb-4 shadow-2xs">
        <Cpu className="w-3.5 h-3.5 text-[#006494]" />
        <span>MOBILE_PORT_STAGING</span>
        <span className="text-[#c4c7c8]">·</span>
        <span className="text-[#059669] font-bold">设备端口物理隔离生效中</span>
      </div>

      {/* Main Illustration Icon */}
      <div className="w-16 h-16 rounded-[3px] bg-white border border-[#c4c7c8] flex items-center justify-center text-[#006494] mb-3 shadow-2xs">
        <Smartphone className="w-8 h-8 text-[#006494]" />
      </div>

      <h3 className="text-base font-bold text-[#1a1c1c] tracking-tight">
        全新全渠道订单中心 · 手机端独立占位符
      </h3>

      <p className="text-xs text-[#747878] max-w-sm mt-1.5 leading-relaxed">
        根据架构规范，全新订单中心副本采用「电脑端与手机端严格样式隔离」机制。电脑端 4 栏工业精密总控已设计就绪，手机端正处于独立卡位开发阶段。
      </p>

      {/* Device specs box */}
      <div className="w-full max-w-sm mt-4 p-3 bg-white border border-[#c4c7c8] rounded-[3px] text-left text-xs space-y-1.5 shadow-2xs">
        <div className="flex justify-between text-[#444748]">
          <span>当前侦测端口:</span>
          <strong className="text-[#1a1c1c]">Mobile / Narrow Viewport (&lt; 768px)</strong>
        </div>
        <div className="flex justify-between text-[#444748]">
          <span>隔离状态:</span>
          <span className="text-[#059669] font-bold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#10b981]" />
            已阻断样式交叉污染
          </span>
        </div>
        <div className="flex justify-between text-[#444748]">
          <span>推荐视口:</span>
          <strong className="text-[#006494]">Desktop (≥ 1280px 宽屏工控台)</strong>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-2 mt-5">
        {onForceDesktopPreview && (
          <button
            type="button"
            onClick={onForceDesktopPreview}
            className="h-9 px-4 rounded-[3px] bg-[#006494] hover:bg-[#004e75] text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
          >
            <Monitor className="w-4 h-4" />
            <span>强制预览电脑端 4 栏矩阵</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}

        {onSwitchToClassic && (
          <button
            type="button"
            onClick={onSwitchToClassic}
            className="h-9 px-4 rounded-[3px] bg-white hover:bg-neutral-50 border border-[#c4c7c8] text-[#1a1c1c] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <span>返回经典版运营总控</span>
          </button>
        )}
      </div>
    </div>
  );
};
