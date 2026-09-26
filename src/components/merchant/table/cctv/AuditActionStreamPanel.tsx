import React, { useState, useRef, useEffect } from 'react';
import {
  Clock,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Users,
  Search,
  ChevronRight,
  Flame,
  ShoppingBag,
  CreditCard,
  Utensils
} from 'lucide-react';
import { CctvPlaybackFrame, CctvPhase } from '../../../../utils/tablePlaybackEngine';

interface AuditActionStreamPanelProps {
  frames: CctvPlaybackFrame[];
  currentFrameIndex: number;
  onSelectFrame: (index: number) => void;
  orderNo: string;
}

const PHASE_TAG_STYLES: Record<CctvPhase, { bg: string; text: string; border: string }> = {
  discovery: {
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    border: 'border-blue-500/30'
  },
  selection: {
    bg: 'bg-purple-500/15',
    text: 'text-purple-400',
    border: 'border-purple-500/30'
  },
  cart: {
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/30'
  },
  checkout: {
    bg: 'bg-orange-500/15',
    text: 'text-orange-400',
    border: 'border-orange-500/30'
  },
  fulfillment: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30'
  },
  kitchen: {
    bg: 'bg-cyan-500/15',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30'
  },
  anomaly: {
    bg: 'bg-rose-500/15',
    text: 'text-rose-400',
    border: 'border-rose-500/30'
  }
};

export function AuditActionStreamPanel({
  frames,
  currentFrameIndex,
  onSelectFrame,
  orderNo
}: AuditActionStreamPanelProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'assisted' | 'selection' | 'checkout' | 'kitchen' | 'anomaly'>('all');
  const activeItemRef = useRef<HTMLDivElement>(null);

  // 过滤动作流
  const filteredFrames = frames.filter((frame) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'assisted') return frame.isAssistedByMerchant;
    if (activeFilter === 'selection') return frame.phase === 'selection';
    if (activeFilter === 'checkout') return frame.phase === 'checkout' || frame.phase === 'fulfillment';
    if (activeFilter === 'kitchen') return frame.phase === 'kitchen';
    if (activeFilter === 'anomaly') return frame.isHesitation || frame.phase === 'anomaly';
    return true;
  });

  // 当外部时间轴驱动 frame 变动时，滚动到当前正在播放的项目
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [currentFrameIndex]);

  return (
    <aside className="w-96 shrink-0 bg-[#16181D] border-l border-[#262930] flex flex-col h-full overflow-hidden text-white select-none">
      {/* 顶部标题栏 */}
      <div className="p-3 border-b border-[#262930] bg-[#121316]/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-[#3BB4FE]" />
          <span className="text-xs font-bold text-neutral-200 tracking-tight">
            3. 毫秒级全链路审计时间流
          </span>
        </div>
        <span className="text-[10px] font-semibold text-neutral-400 bg-neutral-800/80 px-2 py-0.5 rounded border border-neutral-700">
          共 {frames.length} 个行为节点
        </span>
      </div>

      {/* 阶段过滤药丸条 (单排左对齐规范) */}
      <div className="p-2 border-b border-[#262930] bg-[#14161B] flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {[
          { key: 'all', label: '全部' },
          { key: 'assisted', label: '🤝 店员代点' },
          { key: 'selection', label: '选配加购' },
          { key: 'checkout', label: '收银决策' },
          { key: 'kitchen', label: '后厨传菜' },
          { key: 'anomaly', label: '犹豫预警' }
        ].map((f) => {
          const isActive = activeFilter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setActiveFilter(f.key as any)}
              className={`h-7 px-2.5 rounded-full text-[11px] font-semibold transition-colors cursor-pointer shrink-0 whitespace-nowrap flex items-center gap-1 ${
                isActive
                  ? 'bg-neutral-800 text-white border border-neutral-600 shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
              }`}
            >
              {f.key === 'assisted' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
              {f.key === 'anomaly' && <AlertTriangle className="w-3 h-3 text-amber-400" />}
              <span>{f.label}</span>
            </button>
          );
        })}
      </div>

      {/* 动作流水时间轴列表 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-none">
        {filteredFrames.map((frame) => {
          const isCurrent = frame.frameIndex === currentFrameIndex;
          const style = PHASE_TAG_STYLES[frame.phase] || PHASE_TAG_STYLES.discovery;

          return (
            <div
              key={frame.id}
              ref={isCurrent ? activeItemRef : undefined}
              onClick={() => onSelectFrame(frame.frameIndex)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer relative ${
                isCurrent
                  ? 'bg-[#1E232D] border-[#3BB4FE] ring-2 ring-[#3BB4FE]/20 shadow-lg'
                  : frame.isAssistedByMerchant
                  ? 'bg-emerald-950/20 border-emerald-500/40 hover:bg-emerald-950/30'
                  : 'bg-[#1A1D24] border-[#292D38] hover:border-[#384050] hover:bg-[#1E222A]'
              }`}
            >
              {/* 激活指示线 */}
              {isCurrent && (
                <div className="absolute left-0 top-2 bottom-2 w-1 bg-[#3BB4FE] rounded-r-full" />
              )}

              {/* 第一行：时间与增量、阶段微标 */}
              <div className="flex items-center justify-between gap-1 text-[11px] mb-1.5 pl-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-neutral-300">{frame.timeStr}</span>
                  <span className="text-[10px] text-emerald-400 font-semibold">{frame.deltaFormatted}</span>
                </div>

                <div className="flex items-center gap-1">
                  {frame.batchLabel && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                      {frame.batchLabel}
                    </span>
                  )}
                  {frame.isKeyframe && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                      ★ {frame.keyframeLabel}
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${style.bg} ${style.text} ${style.border}`}
                  >
                    {frame.phaseLabel}
                  </span>
                </div>
              </div>

              {/* 第二行：动作标题与操作人 */}
              <div className="flex items-center justify-between gap-1 pl-1.5">
                <h4 className="text-xs font-bold text-neutral-100 flex items-center gap-1.5">
                  <span>{frame.actionName}</span>
                </h4>
                <div className="text-right">
                  <span className="text-[10px] text-neutral-300 flex items-center gap-1 justify-end">
                    <Users className="w-2.5 h-2.5 text-neutral-400" />
                    <span>{frame.operator}</span>
                  </span>
                  {frame.actorIp && (
                    <span className="text-[9px] text-neutral-500 block">
                      IP: {frame.actorIp}
                    </span>
                  )}
                </div>
              </div>

              {/* 店员代点高亮专属徽标 */}
              {frame.isAssistedByMerchant && (
                <div className="mt-1.5 pl-1.5 flex items-center gap-1.5 p-1 bg-emerald-500/15 border border-emerald-500/40 rounded text-[10px] text-emerald-300 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>🤝 店员远程镜像代点 · 食客已授权确认</span>
                </div>
              )}

              {/* 第三行：操作详情摘要 */}
              <p className="text-[11px] text-neutral-400 mt-1 pl-1.5 leading-relaxed">
                {frame.details}
              </p>

              {/* 犹豫/卡点预警微标 (若存在) */}
              {frame.isHesitation && (
                <div className="mt-2 pl-1.5 flex items-center gap-1.5 p-1.5 bg-amber-950/40 border border-amber-500/30 rounded-lg text-[10px] text-amber-300">
                  <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="font-semibold">{frame.hesitationReason || '检测到规格犹豫'}</span>
                </div>
              )}

              {/* 审计存证标签 */}
              {frame.auditBadgeText && (
                <div className="mt-1.5 pl-1.5 flex items-center gap-1 text-[10px] text-neutral-400">
                  <span className="w-1 h-1 rounded-full bg-emerald-400" />
                  <span>{frame.auditBadgeText}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
