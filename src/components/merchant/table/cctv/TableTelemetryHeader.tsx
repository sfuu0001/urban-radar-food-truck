import React, { useState, useEffect } from 'react';
import {
  Maximize2,
  Minimize2,
  X,
  Radio,
  Clock,
  Sparkles,
  ChevronDown,
  Activity,
  Layers,
  Check,
  RotateCcw
} from 'lucide-react';
import { TableItem } from '../../../../types';

interface TableTelemetryHeaderProps {
  currentTable: TableItem;
  tables: TableItem[];
  onSelectTable: (table: TableItem) => void;
  orderNo: string;
  isLiveMode: boolean;
  onToggleLiveMode: (live: boolean) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onClose: () => void;
  activeFrameTimeStr?: string;
  currentElapsedFormatted: string;
  selectedBatch?: 'main' | 'addon' | 'history';
  onChangeBatch?: (batch: 'main' | 'addon' | 'history') => void;
}

export function TableTelemetryHeader({
  currentTable,
  tables,
  onSelectTable,
  orderNo,
  isLiveMode,
  onToggleLiveMode,
  isFullscreen,
  onToggleFullscreen,
  onClose,
  activeFrameTimeStr,
  currentElapsedFormatted,
  selectedBatch = 'main',
  onChangeBatch
}: TableTelemetryHeaderProps) {
  const [isTableDropdownOpen, setIsTableDropdownOpen] = useState(false);
  const [isBatchDropdownOpen, setIsBatchDropdownOpen] = useState(false);
  const [recMs, setRecMs] = useState(180);

  const BATCH_OPTIONS: Array<{ id: 'main' | 'addon' | 'history'; label: string; tag: string; amount: number; time: string; badge: string }> = [
    { id: 'main', label: '首轮主单', tag: `#${orderNo}`, amount: 128.0, time: '12:05', badge: '已出餐' },
    { id: 'addon', label: '加单批次', tag: `#${orderNo}-加1`, amount: 42.0, time: '12:35', badge: '烤制中' },
    { id: 'history', label: '历史翻台归档', tag: '#UR-DIN-7062', amount: 320.0, time: '10:15', badge: '已翻台' }
  ];

  const currentBatchInfo = BATCH_OPTIONS.find((b) => b.id === selectedBatch) || BATCH_OPTIONS[0];

  // 毫秒级录制微秒滴答
  useEffect(() => {
    const timer = setInterval(() => {
      setRecMs((prev) => (prev + 33) % 1000);
    }, 60);
    return () => clearInterval(timer);
  }, []);

  const diningTables = tables.filter((t) => t.status === 'dining' || t.orderNo);
  const displayTables = diningTables.length > 0 ? diningTables : tables;

  return (
    <header className="shrink-0 h-13 px-4 bg-[#121316] border-b border-[#262930] flex items-center justify-between gap-3 select-none text-white z-20">
      {/* 左侧：REC 录制状态与大屏机位标识 */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2 px-2.5 py-1 bg-neutral-900/90 rounded-md border border-neutral-700/80">
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="absolute w-4 h-4 rounded-full bg-rose-500/30 animate-ping" />
          </div>
          <span className="text-xs font-bold tracking-wider text-rose-400">REC</span>
          <span className="text-xs font-semibold text-neutral-300">
            {currentElapsedFormatted}.{String(recMs).padStart(3, '0')}
          </span>
        </div>

        <div className="h-4 w-px bg-neutral-800" />

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#006494]/30 border border-[#3BB4FE]/40 flex items-center justify-center text-[#3BB4FE]">
            <Radio className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xs font-bold text-neutral-100 tracking-tight">
                桌台全景全链路点餐监控与时序回放系统
              </h1>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 border border-neutral-700 font-medium">
                CCTV CAM-01
              </span>
            </div>
            <span className="text-[10px] text-neutral-400">
              PANORAMIC COMMAND & TELEMETRY HUB · 工业工控数字化复盘大屏
            </span>
          </div>
        </div>

        {/* 当前桌号与订单选择胶囊 */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsTableDropdownOpen((prev) => !prev)}
            className="h-8 px-2.5 bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700/90 rounded-lg flex items-center gap-1.5 text-xs font-bold text-neutral-200 transition-colors cursor-pointer shadow-xs"
            title="点击切换监视桌台"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-emerald-400">{currentTable.code} 桌</span>
            <span className="text-neutral-500">·</span>
            <span className="text-neutral-300">#{orderNo}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${isTableDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isTableDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsTableDropdownOpen(false)}
              />
              <div className="absolute left-0 top-full mt-1.5 w-64 bg-[#1A1D24] border border-[#2E333D] rounded-xl shadow-2xl p-1.5 z-50 space-y-1">
                <div className="px-2.5 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-800 flex items-center justify-between">
                  <span>切换监视台位 ({displayTables.length})</span>
                  <span className="text-neutral-500">当前: {currentTable.code}</span>
                </div>
                <div className="max-h-56 overflow-y-auto space-y-0.5 scrollbar-none">
                  {displayTables.map((t) => {
                    const isSelected = t.id === currentTable.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          onSelectTable(t);
                          setIsTableDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#006494]/30 text-[#3BB4FE] border border-[#006494]/50'
                            : 'text-neutral-300 hover:bg-neutral-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-neutral-100">{t.code} 桌</span>
                          <span className="text-[11px] text-neutral-400">({t.currentGuests || t.capacity}人)</span>
                          {t.orderNo && (
                            <span className="text-[10px] text-neutral-400">#{t.orderNo}</span>
                          )}
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#3BB4FE]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* 订单层级与加单/翻台批次级联选择器 */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsBatchDropdownOpen((prev) => !prev)}
            className="h-8 px-2.5 bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700/90 rounded-lg flex items-center gap-1.5 text-xs font-bold text-neutral-200 transition-colors cursor-pointer shadow-xs"
            title="切换订单与加单/历史批次"
          >
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
              {currentBatchInfo.label}
            </span>
            <span className="text-neutral-400 font-semibold">{currentBatchInfo.tag}</span>
            <span className="text-emerald-400 font-bold">¥{currentBatchInfo.amount.toFixed(2)}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${isBatchDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isBatchDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsBatchDropdownOpen(false)}
              />
              <div className="absolute left-0 top-full mt-1.5 w-72 bg-[#1A1D24] border border-[#2E333D] rounded-xl shadow-2xl p-1.5 z-50 space-y-1">
                <div className="px-2.5 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-800 flex items-center justify-between">
                  <span>多订单与加单批次级联</span>
                  <span className="text-neutral-500">{currentTable.code} 桌历史</span>
                </div>
                <div className="space-y-1">
                  {BATCH_OPTIONS.map((batch) => {
                    const isSelected = batch.id === selectedBatch;
                    return (
                      <button
                        key={batch.id}
                        type="button"
                        onClick={() => {
                          onChangeBatch?.(batch.id);
                          setIsBatchDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#006494]/30 text-[#3BB4FE] border border-[#006494]/50'
                            : 'text-neutral-300 hover:bg-neutral-800'
                        }`}
                      >
                        <div className="flex flex-col text-left">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-neutral-100">{batch.label}</span>
                            <span className="text-[10px] px-1 py-0.2 rounded bg-neutral-800 text-neutral-400">
                              {batch.time}
                            </span>
                            <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-500/15 text-emerald-400">
                              {batch.badge}
                            </span>
                          </div>
                          <span className="text-[11px] text-neutral-400 font-semibold">{batch.tag}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-emerald-400">¥{batch.amount.toFixed(2)}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#3BB4FE]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 中部：双模监视切换胶囊 (Live Watch vs DVR Replay) */}
      <div className="flex items-center bg-neutral-900/90 border border-neutral-700/80 p-0.5 rounded-lg">
        <button
          type="button"
          onClick={() => onToggleLiveMode(true)}
          className={`h-7 px-3 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            isLiveMode
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isLiveMode ? 'bg-white animate-pulse' : 'bg-emerald-500'}`} />
          <span>实时监视 (LIVE)</span>
        </button>

        <button
          type="button"
          onClick={() => onToggleLiveMode(false)}
          className={`h-7 px-3 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            !isLiveMode
              ? 'bg-[#006494] text-white shadow-xs'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>时间轴回放 (DVR)</span>
        </button>
      </div>

      {/* 右侧：遥测工况、全屏与关闭按钮 */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-neutral-900/90 rounded-md border border-neutral-800 text-[11px] text-neutral-400">
          <span className="flex items-center gap-1 text-emerald-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            18ms
          </span>
          <span className="text-neutral-600">|</span>
          <span className="text-neutral-300 font-semibold">60 FPS</span>
          <span className="text-neutral-600">|</span>
          <span className="text-neutral-200 font-bold px-1 py-0.2 bg-neutral-800 rounded text-[10px]">
            1080P
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleFullscreen}
          className="h-8 px-2.5 bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700/80 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer"
          title={isFullscreen ? '退出全屏' : '大屏全屏监视'}
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          <span className="hidden md:inline">{isFullscreen ? '还原' : '全屏'}</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="h-8 w-8 bg-neutral-900/90 hover:bg-rose-950/60 hover:text-rose-400 hover:border-rose-700/80 text-neutral-400 border border-neutral-700/80 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
          title="关闭监控大屏 (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
