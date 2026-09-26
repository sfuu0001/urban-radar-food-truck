import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Repeat,
  Gauge,
  Sliders,
  ChevronUp,
  ChevronDown,
  Layers
} from 'lucide-react';
import { CctvPlaybackFrame } from '../../../../utils/tablePlaybackEngine';

interface TimelineScrubberBarProps {
  frames: CctvPlaybackFrame[];
  currentFrameIndex: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStepNext: () => void;
  onStepPrev: () => void;
  onJumpToFirst: () => void;
  onJumpToLast: () => void;
  onSelectFrame: (index: number) => void;
  playbackSpeed: number;
  onChangeSpeed: (speed: number) => void;
  isLooping: boolean;
  onToggleLoop: () => void;
  onReset: () => void;
  isLiveMode: boolean;
}

export function TimelineScrubberBar({
  frames,
  currentFrameIndex,
  isPlaying,
  onTogglePlay,
  onStepNext,
  onStepPrev,
  onJumpToFirst,
  onJumpToLast,
  onSelectFrame,
  playbackSpeed,
  onChangeSpeed,
  isLooping,
  onToggleLoop,
  onReset,
  isLiveMode
}: TimelineScrubberBarProps) {
  const [isSpeedPopoverOpen, setIsSpeedPopoverOpen] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const totalFrames = frames.length;
  const currentFrame = frames[currentFrameIndex] || frames[0];
  const lastFrame = frames[frames.length - 1] || frames[0];

  const currentFormatted = currentFrame?.relativeFormatted || '00:00';
  const totalFormatted = lastFrame?.relativeFormatted || '03:35';

  const progressPercent = totalFrames > 1
    ? (currentFrameIndex / (totalFrames - 1)) * 100
    : 0;

  // 点击或拖拽进度条定位
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || totalFrames <= 1) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const ratio = Math.max(0, Math.min(1, clickX / width));
    const targetIdx = Math.round(ratio * (totalFrames - 1));
    onSelectFrame(targetIdx);
  };

  return (
    <footer className="shrink-0 h-18 px-4 bg-[#121316] border-t border-[#262930] flex flex-col justify-center gap-1.5 text-white select-none z-20">
      {/* 上半部：监视器 DVR 交互控制总线控制键与时间 */}
      <div className="flex items-center justify-between gap-3">
        {/* 左侧控制按键群 */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onJumpToFirst}
            className="h-8 px-2.5 bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700/80 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            title="跳至第一帧 (Home)"
          >
            <SkipBack className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">第一步</span>
          </button>

          <button
            type="button"
            onClick={onStepPrev}
            className="h-8 px-2.5 bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700/80 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            title="单步后退 (Left Arrow)"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">后退</span>
          </button>

          {/* 播放 / 暂停 核心键 */}
          <button
            type="button"
            onClick={onTogglePlay}
            className={`h-8 px-4 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-600 text-neutral-950'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white'
            }`}
            title="播放/暂停 (Space)"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>暂停</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isLiveMode ? '回放' : '播放'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onStepNext}
            className="h-8 px-2.5 bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700/80 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            title="单步前进 (Right Arrow)"
          >
            <span className="hidden sm:inline">前进</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onJumpToLast}
            className="h-8 px-2.5 bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700/80 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            title="跳至最终帧 (End)"
          >
            <span className="hidden sm:inline">最后一步</span>
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 中间：刻度状态提示 */}
        <div className="flex items-center gap-2 text-xs">
          <div className="px-2.5 py-1 bg-neutral-900 rounded-lg border border-neutral-800 flex items-center gap-2">
            <span className="font-bold text-[#3BB4FE]">{currentFormatted}</span>
            <span className="text-neutral-500">/</span>
            <span className="text-neutral-400 font-semibold">{totalFormatted}</span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 text-neutral-400 text-[11px]">
            <span>当前帧:</span>
            <strong className="text-neutral-200">
              {currentFrameIndex + 1}/{totalFrames}
            </strong>
            <span className="text-neutral-600">·</span>
            <span className="text-emerald-400 truncate max-w-[200px]">
              {currentFrame?.actionSummary || '就绪'}
            </span>
          </div>
        </div>

        {/* 右侧：倍速与循环控制 */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* 倍速调节 Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSpeedPopoverOpen((prev) => !prev)}
              className="h-8 px-2.5 bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700/80 rounded-lg text-xs font-bold text-neutral-200 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Gauge className="w-3.5 h-3.5 text-amber-400" />
              <span>{playbackSpeed}x</span>
              <ChevronUp className={`w-3 h-3 text-neutral-400 transition-transform ${isSpeedPopoverOpen ? 'rotate-180' : ''}`} />
            </button>

            {isSpeedPopoverOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsSpeedPopoverOpen(false)}
                />
                <div className="absolute right-0 bottom-full mb-1.5 w-32 bg-[#1A1D24] border border-[#2B303C] rounded-xl shadow-xl p-1 z-50 space-y-0.5">
                  <div className="px-2 py-1 text-[10px] font-bold text-neutral-400 border-b border-neutral-800">
                    回放倍速调节
                  </div>
                  {[0.5, 1, 2, 4, 8].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        onChangeSpeed(s);
                        setIsSpeedPopoverOpen(false);
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                        playbackSpeed === s
                          ? 'bg-[#006494]/30 text-[#3BB4FE]'
                          : 'text-neutral-300 hover:bg-neutral-800'
                      }`}
                    >
                      <span>{s}x</span>
                      {playbackSpeed === s && <span className="text-[10px] font-bold">✓</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 自动循环按键 */}
          <button
            type="button"
            onClick={onToggleLoop}
            className={`h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-colors cursor-pointer ${
              isLooping
                ? 'bg-purple-950/60 text-purple-300 border-purple-600/80 shadow-xs'
                : 'bg-neutral-900/90 hover:bg-neutral-800 text-neutral-400 border-neutral-700/80'
            }`}
            title="自动循环播放"
          >
            <Repeat className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">循环</span>
          </button>

          {/* 重置起点按键 */}
          <button
            type="button"
            onClick={onReset}
            className="h-8 px-2.5 bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700/80 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            title="重置到起点"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">重置</span>
          </button>
        </div>
      </div>

      {/* 下半部：六大生命周期阶段快速穿梭胶囊与关键帧磁吸点进度条 */}
      <div className="relative pt-0.5 pb-1 space-y-1">
        {/* 六大业务阶段锚点快捷跳转栏 */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
          {[
            { id: 'checkin', label: 'I. 入席开台', color: 'text-blue-400 border-blue-500/40 hover:bg-blue-500/20', targetFrame: 0 },
            { id: 'explore', label: 'II. 探索决策', color: 'text-purple-400 border-purple-500/40 hover:bg-purple-500/20', targetFrame: 2 },
            { id: 'assisted_cart', label: 'III. 协同与协助', color: 'text-emerald-400 border-emerald-500/60 bg-emerald-500/15 hover:bg-emerald-500/25 ring-1 ring-emerald-500/30', targetFrame: 5, badge: '🤝 店员代点' },
            { id: 'checkout', label: 'IV. 收银核销', color: 'text-orange-400 border-orange-500/40 hover:bg-orange-500/20', targetFrame: 9 },
            { id: 'kitchen', label: 'V. 后厨履约', color: 'text-cyan-400 border-cyan-500/40 hover:bg-cyan-500/20', targetFrame: 11 },
            { id: 'turnover', label: 'VI. 巡台翻台', color: 'text-neutral-400 border-neutral-600/40 hover:bg-neutral-800', targetFrame: 14 }
          ].map((phase) => (
            <button
              key={phase.id}
              type="button"
              onClick={() => onSelectFrame(Math.min(totalFrames - 1, phase.targetFrame))}
              className={`h-5 px-2 rounded-full border text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap shrink-0 ${phase.color}`}
            >
              <span>{phase.label}</span>
              {phase.badge && (
                <span className="text-[9px] px-1 py-0 rounded bg-emerald-600 text-white font-extrabold leading-none">
                  {phase.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div
          ref={progressBarRef}
          onClick={handleProgressClick}
          className="relative w-full h-3 bg-[#1A1D24] border border-[#2B303C] rounded-full overflow-hidden cursor-pointer select-none group"
        >
          {/* 六大阶段多色分段底衬 */}
          <div className="absolute inset-0 flex">
            <div className="w-[12%] h-full bg-blue-500/25 border-r border-blue-500/30" title="Phase I: 入席开台" />
            <div className="w-[20%] h-full bg-purple-500/25 border-r border-purple-500/30" title="Phase II: 探索决策" />
            <div className="w-[24%] h-full bg-emerald-500/35 border-r border-emerald-500/50" title="Phase III: 协同加购与远程协助" />
            <div className="w-[16%] h-full bg-orange-500/25 border-r border-orange-500/30" title="Phase IV: 收银核销" />
            <div className="w-[18%] h-full bg-cyan-500/25 border-r border-cyan-500/30" title="Phase V: 后厨履约" />
            <div className="w-[10%] h-full bg-neutral-600/25" title="Phase VI: 巡台翻台" />
          </div>

          {/* 实时进度高亮条 */}
          <div
            className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#006494] via-[#3BB4FE] to-emerald-400 transition-all duration-75"
            style={{ width: `${progressPercent}%` }}
          />

          {/* 关键帧磁吸标记点 (Keyframe Pins) */}
          {frames.map((frame, idx) => {
            if (!frame.isKeyframe) return null;
            const leftPercent = totalFrames > 1 ? (idx / (totalFrames - 1)) * 100 : 0;
            return (
              <div
                key={frame.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectFrame(idx);
                }}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 w-2.5 h-2.5 rounded-full bg-white border border-neutral-900 hover:scale-150 transition-transform cursor-pointer shadow-md"
                style={{ left: `${leftPercent}%` }}
                title={`关键帧: ${frame.keyframeLabel || frame.actionName}`}
              />
            );
          })}
        </div>

        {/* 阶段文字标签微注脚 */}
        <div className="flex items-center justify-between text-[10px] text-neutral-400 px-1 mt-1">
          <span>00:00 进店</span>
          <span>00:15 浏览</span>
          <span>00:40 选配加购</span>
          <span>01:10 结算付款</span>
          <span>01:35 后厨接单</span>
          <span>02:10 传菜齐备</span>
        </div>
      </div>
    </footer>
  );
}
