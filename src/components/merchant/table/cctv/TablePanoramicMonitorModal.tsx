import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TableItem, Order } from '../../../../types';
import { TableSession } from '../../../../types/tableSession';
import {
  generatePlaybackFramesForTable,
  CctvPlaybackFrame,
  CctvDiagnosticReport
} from '../../../../utils/tablePlaybackEngine';
import { TableTelemetryHeader } from './TableTelemetryHeader';
import { TableTelemetrySidebar } from './TableTelemetrySidebar';
import { TablePlaybackSimulator } from './TablePlaybackSimulator';
import { AuditActionStreamPanel } from './AuditActionStreamPanel';
import { TimelineScrubberBar } from './TimelineScrubberBar';
import { reactiveSyncBus } from '../../../../utils/reactiveSyncBus';

export interface TablePanoramicMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: TableItem;
  tables?: TableItem[];
  onSelectTable?: (t: TableItem) => void;
  session?: TableSession | null;
  orders?: Order[];
  showToast?: (msg: string) => void;
}

export function TablePanoramicMonitorModal({
  isOpen,
  onClose,
  table: initialTable,
  tables = [],
  onSelectTable,
  session,
  orders = [],
  showToast
}: TablePanoramicMonitorModalProps) {
  const [currentTable, setCurrentTable] = useState<TableItem>(initialTable);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(272); // 00:04:32
  const [selectedBatch, setSelectedBatch] = useState<'main' | 'addon' | 'history'>('main');

  // 同步外部传入的 initialTable
  useEffect(() => {
    setCurrentTable(initialTable);
  }, [initialTable]);

  // 生成回放帧与诊断数据
  const { frames, diagnostic } = useMemo(() => {
    return generatePlaybackFramesForTable(currentTable, session, orders, selectedBatch);
  }, [currentTable, session, orders, selectedBatch]);

  const totalFrames = frames.length;
  const currentFrame = frames[currentFrameIndex] || frames[0];

  // 监听键盘快捷键
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 避免在 input 输入时误触发快捷键
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentFrameIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentFrameIndex((prev) => Math.min(totalFrames - 1, prev + 1));
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setIsFullscreen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, totalFrames, onClose]);

  // 回放时钟驱动
  useEffect(() => {
    if (!isPlaying || isLiveMode || totalFrames <= 1) return;

    const baseInterval = 1800; // 基准单帧时长 1.8 秒
    const interval = Math.max(200, Math.round(baseInterval / playbackSpeed));

    const timer = setInterval(() => {
      setCurrentFrameIndex((prev) => {
        if (prev >= totalFrames - 1) {
          if (isLooping) {
            return 0; // 自动循环到起点
          } else {
            setIsPlaying(false);
            return prev;
          }
        }
        return prev + 1;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isPlaying, isLiveMode, totalFrames, playbackSpeed, isLooping]);

  // 实时监视模式 (Live Mode) 监听事件
  useEffect(() => {
    if (!isOpen || !isLiveMode) return;

    const unsubs = [
      reactiveSyncBus.subscribe('TABLE_SESSION_MUTATED', (payload) => {
        if (!payload?.tableCode || payload.tableCode.toUpperCase() === currentTable.code.toUpperCase()) {
          // 移动端操作时，实时往前步进或刷新
          setCurrentFrameIndex((prev) => Math.min(totalFrames - 1, prev + 1));
        }
      }),
      reactiveSyncBus.subscribe('TABLE_LINK_REQUEST', () => {
        setCurrentFrameIndex((prev) => Math.min(totalFrames - 1, prev + 1));
      })
    ];

    // 实时录制时钟走字
    const liveClock = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);

    return () => {
      unsubs.forEach((fn) => fn());
      clearInterval(liveClock);
    };
  }, [isOpen, isLiveMode, currentTable.code, totalFrames]);

  // 控制总线操作方法
  const handleTogglePlay = () => {
    if (isLiveMode) {
      setIsLiveMode(false);
    }
    setIsPlaying((prev) => !prev);
  };

  const handleStepNext = () => {
    setIsPlaying(false);
    setIsLiveMode(false);
    setCurrentFrameIndex((prev) => Math.min(totalFrames - 1, prev + 1));
  };

  const handleStepPrev = () => {
    setIsPlaying(false);
    setIsLiveMode(false);
    setCurrentFrameIndex((prev) => Math.max(0, prev - 1));
  };

  const handleJumpToFirst = () => {
    setIsPlaying(false);
    setIsLiveMode(false);
    setCurrentFrameIndex(0);
  };

  const handleJumpToLast = () => {
    setIsPlaying(false);
    setIsLiveMode(false);
    setCurrentFrameIndex(totalFrames - 1);
  };

  const handleSelectFrame = (index: number) => {
    setIsLiveMode(false);
    setCurrentFrameIndex(Math.max(0, Math.min(totalFrames - 1, index)));
  };

  const handleReset = () => {
    setIsPlaying(false);
    setIsLiveMode(false);
    setCurrentFrameIndex(0);
    showToast?.('已重置到初始扫码开台帧');
  };

  const handleTableChange = (newTable: TableItem) => {
    setCurrentTable(newTable);
    setCurrentFrameIndex(0);
    setIsPlaying(false);
    onSelectTable?.(newTable);
    showToast?.(`已切换至 ${newTable.code} 桌 CCTV 全景监视`);
  };

  const formatElapsed = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden select-none">
        {/* 背景点击阻断 */}
        <div className="absolute inset-0" onClick={onClose} />

        {/* 主工控大模态弹窗舱体 (Panoramic CCTV Modal Container) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className={`relative z-10 flex flex-col bg-[#121316] border border-[#262930] shadow-2xl overflow-hidden transition-all duration-300 ${
            isFullscreen
              ? 'fixed inset-0 w-screen h-screen rounded-none'
              : 'w-[98vw] max-w-[1720px] h-[94vh] max-h-[1020px] rounded-2xl'
          }`}
        >
          {/* 1. 顶部 CCTV 状态与遥测机位条 */}
          <TableTelemetryHeader
            currentTable={currentTable}
            tables={tables}
            onSelectTable={handleTableChange}
            orderNo={currentTable.orderNo || 'UR-DIN-7078'}
            isLiveMode={isLiveMode}
            onToggleLiveMode={(live) => {
              setIsLiveMode(live);
              if (live) {
                setIsPlaying(false);
                setCurrentFrameIndex(totalFrames - 1);
                showToast?.('已接入食客移动端实时监视 (LIVE)');
              } else {
                showToast?.('已切换至时间轴历史回放 (DVR)');
              }
            }}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
            onClose={onClose}
            activeFrameTimeStr={currentFrame?.timeStr}
            currentElapsedFormatted={formatElapsed(elapsedSeconds)}
            selectedBatch={selectedBatch}
            onChangeBatch={(b) => {
              setSelectedBatch(b);
              setCurrentFrameIndex(0);
              setIsPlaying(false);
              showToast?.(`已切换至「${b === 'addon' ? '加单批次' : b === 'history' ? '历史翻台' : '首轮主单'}」时序时间轴`);
            }}
          />

          {/* 2. 主三栏核心工作台 (遥测状态列 + 镜面监视台 + 全链路审计流) */}
          <div className="flex-1 flex overflow-hidden min-h-0 relative">
            {/* 左列: 1. 遥测状态与多端会话列 */}
            <TableTelemetrySidebar
              table={currentTable}
              session={session}
              diagnostic={diagnostic}
              currentFrame={currentFrame}
            />

            {/* 中列: 2. CCTV 用户端前置操作镜面监视台 (iPhone 15 Pro Max 视口沙盒) */}
            <TablePlaybackSimulator
              currentFrame={currentFrame}
              isLiveMode={isLiveMode}
              frameIndex={currentFrameIndex}
              totalFrames={totalFrames}
              onShowToast={showToast}
            />

            {/* 右列: 3. 毫秒级全链路审计时间流 */}
            <AuditActionStreamPanel
              frames={frames}
              currentFrameIndex={currentFrameIndex}
              onSelectFrame={handleSelectFrame}
              orderNo={currentTable.orderNo || 'UR-DIN-7078'}
            />
          </div>

          {/* 3. 监视器 DVR 交互控制总线 (Timeline Scrubber & Playback Controls) */}
          <TimelineScrubberBar
            frames={frames}
            currentFrameIndex={currentFrameIndex}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            onStepNext={handleStepNext}
            onStepPrev={handleStepPrev}
            onJumpToFirst={handleJumpToFirst}
            onJumpToLast={handleJumpToLast}
            onSelectFrame={handleSelectFrame}
            playbackSpeed={playbackSpeed}
            onChangeSpeed={(speed) => {
              setPlaybackSpeed(speed);
              showToast?.(`已切换至 ${speed}x 回放倍速`);
            }}
            isLooping={isLooping}
            onToggleLoop={() => {
              setIsLooping((prev) => !prev);
              showToast?.(isLooping ? '已关闭自动循环' : '已开启自动循环');
            }}
            onReset={handleReset}
            isLiveMode={isLiveMode}
          />
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
