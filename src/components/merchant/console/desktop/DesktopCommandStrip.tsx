import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Search,
  Power,
  Volume2,
  VolumeX,
  QrCode,
  Printer,
  ChevronDown,
  Check,
  RotateCcw
} from 'lucide-react';

export interface CommandStripFilters {
  statusFilter: string;
  searchQuery: string;
  isAcceptingOrders: boolean;
  isVoiceEnabled: boolean;
}

interface DesktopCommandStripProps {
  filters: CommandStripFilters;
  onUpdateFilters: (partial: Partial<CommandStripFilters>) => void;
  statusCounts: {
    all: number;
    pending: number;
    cooking: number;
    deliveryOrPickup: number;
    refund: number;
    completed: number;
  };
  onOpenScanner?: () => void;
  onBatchPrint?: () => void;
  onSwitchToClassic?: () => void;
}

export const DesktopCommandStrip: React.FC<DesktopCommandStripProps> = ({
  filters,
  onUpdateFilters,
  statusCounts,
  onOpenScanner,
  onBatchPrint,
  onSwitchToClassic
}) => {
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  const STATUS_OPTIONS = [
    { key: 'all', label: '全部订单', count: statusCounts.all },
    { key: 'pending', label: '待接单', count: statusCounts.pending },
    { key: 'cooking', label: '制作中', count: statusCounts.cooking },
    { key: 'delivery_pickup', label: '待取/专送', count: statusCounts.deliveryOrPickup },
    { key: 'refund', label: '退单申请', count: statusCounts.refund },
    { key: 'completed', label: '已完成', count: statusCounts.completed }
  ];

  const currentOption = STATUS_OPTIONS.find((o) => o.key === filters.statusFilter) || STATUS_OPTIONS[0];

  return (
    <div className="bg-white border-b border-[#c4c7c8] py-2 px-4 flex flex-wrap items-center justify-between gap-y-2.5 select-none font-sans">
      {/* Left: Status Filter Dropdown & Quick Status Badges */}
      <div className="flex items-center gap-3">
        {/* Industrial Status Dropdown Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
            className="flex items-center gap-1.5 bg-white border border-[#c4c7c8] hover:border-[#006494] rounded-[3px] px-2.5 h-8 text-[12px] font-semibold transition cursor-pointer shadow-2xs"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#006494] shrink-0" />
            <span className="text-[#444748] text-[11px] uppercase tracking-wider shrink-0">工单状态:</span>
            <div className="flex items-center gap-1.5 pl-0.5">
              <span className="w-2 h-2 rounded-full bg-[#006494] animate-pulse" />
              <span className="font-bold text-[#1a1c1c]">{currentOption.label}</span>
              <span className="bg-[#eeeeee] text-[#006494] px-1.5 py-0.2 rounded-[2px] text-[11px] font-bold border border-[#c4c7c8]/60">
                {currentOption.count}
              </span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-[#444748] ml-1 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isStatusDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-[#c4c7c8] rounded-[3px] shadow-lg py-1 z-30">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    onUpdateFilters({ statusFilter: opt.key });
                    setIsStatusDropdownOpen(false);
                  }}
                  className={`w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-[#f3f3f4] transition cursor-pointer ${
                    filters.statusFilter === opt.key ? 'bg-[#f0f9ff] text-[#006494] font-bold' : 'text-[#1a1c1c]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {filters.statusFilter === opt.key && <Check className="w-3 h-3 text-[#006494]" />}
                    <span>{opt.label}</span>
                  </div>
                  <span className="text-[11px] px-1.5 py-0.2 bg-[#eeeeee] rounded-[2px] border border-[#c4c7c8]/50 text-[#444748]">
                    {opt.count}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Status Summary Badges Strip (matching screen.png) */}
        <div className="hidden xl:flex items-center gap-1.5 text-[11px]">
          <button
            type="button"
            onClick={() => onUpdateFilters({ statusFilter: 'pending' })}
            className={`px-2 h-7 rounded-[3px] bg-white border flex items-center gap-1 transition cursor-pointer ${
              filters.statusFilter === 'pending'
                ? 'border-[#006494] bg-[#f0f9ff] text-[#006494] font-bold ring-1 ring-[#006494]/20'
                : 'border-[#c4c7c8] text-[#444748] hover:text-[#1a1c1c] hover:bg-neutral-50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#c4c7c8]" />
            <span>待接单</span>
            <span className="font-bold">{statusCounts.pending}</span>
          </button>

          <button
            type="button"
            onClick={() => onUpdateFilters({ statusFilter: 'cooking' })}
            className={`px-2 h-7 rounded-[3px] bg-white border flex items-center gap-1 transition cursor-pointer font-bold ${
              filters.statusFilter === 'cooking'
                ? 'border-[#f59e0b] bg-[#fffbeb] text-[#b45309] ring-1 ring-[#f59e0b]/30'
                : 'border-[#f59e0b]/40 text-[#b45309] hover:bg-[#fffbeb]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-ping" />
            <span>制作中</span>
            <span>{statusCounts.cooking}</span>
          </button>

          <button
            type="button"
            onClick={() => onUpdateFilters({ statusFilter: 'delivery_pickup' })}
            className={`px-2 h-7 rounded-[3px] bg-white border flex items-center gap-1 transition cursor-pointer font-bold ${
              filters.statusFilter === 'delivery_pickup'
                ? 'border-[#006494] bg-[#f0f9ff] text-[#006494] ring-1 ring-[#006494]/30'
                : 'border-[#006494]/30 text-[#006494] hover:bg-[#f0f9ff]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#006494]" />
            <span>待取/专送</span>
            <span>{statusCounts.deliveryOrPickup}</span>
          </button>

          <button
            type="button"
            onClick={() => onUpdateFilters({ statusFilter: 'refund' })}
            className={`px-2 h-7 rounded-[3px] bg-white border flex items-center gap-1 transition cursor-pointer ${
              filters.statusFilter === 'refund'
                ? 'border-[#ba1a1a] bg-[#fef2f2] text-[#ba1a1a] font-bold ring-1 ring-[#ba1a1a]/20'
                : 'border-[#c4c7c8] text-[#444748] hover:text-[#ba1a1a] hover:bg-[#fef2f2]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#ba1a1a]" />
            <span>退单申请</span>
            <span className="font-bold">{statusCounts.refund}</span>
          </button>

          <button
            type="button"
            onClick={() => onUpdateFilters({ statusFilter: 'completed' })}
            className={`px-2 h-7 rounded-[3px] bg-white border flex items-center gap-1 transition cursor-pointer font-bold ${
              filters.statusFilter === 'completed'
                ? 'border-[#10b981] bg-[#ecfdf5] text-[#059669] ring-1 ring-[#10b981]/30'
                : 'border-[#10b981]/30 text-[#059669] hover:bg-[#ecfdf5]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
            <span>已完成</span>
            <span>{statusCounts.completed}</span>
          </button>
        </div>
      </div>

      {/* Right: Quick Operations Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search Box Capsule */}
        <div className="relative flex items-center">
          <Search className="absolute left-2.5 w-3.5 h-3.5 text-[#444748]" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => onUpdateFilters({ searchQuery: e.target.value })}
            placeholder="搜索单号 / 手机尾号 / 提货码..."
            className="h-8 pl-8 pr-12 w-56 lg:w-64 text-xs text-[#1a1c1c] border border-[#c4c7c8] rounded-[3px] focus:outline-none focus:border-[#006494] transition placeholder:text-[#747878] bg-white"
          />
          <span className="absolute right-2 px-1.5 py-0.2 border border-[#c4c7c8] bg-[#f9f9f9] rounded-[2px] text-[10px] text-[#444748] font-bold">
            ⌘K
          </span>
        </div>

        {/* Accept Switch Indicator Capsule */}
        <button
          type="button"
          onClick={() => onUpdateFilters({ isAcceptingOrders: !filters.isAcceptingOrders })}
          className={`h-8 px-2.5 bg-white border rounded-[3px] flex items-center gap-1.5 text-xs transition shadow-2xs cursor-pointer ${
            filters.isAcceptingOrders
              ? 'border-[#ba1a1a]/30 text-[#ba1a1a] hover:bg-[#fef2f2]'
              : 'border-[#c4c7c8] text-[#747878] hover:bg-[#f3f3f4]'
          }`}
          title="接单开关状态控制"
        >
          <Power className="w-3.5 h-3.5 shrink-0" />
          <span className="opacity-80">接单:</span>
          <span className="font-bold">{filters.isAcceptingOrders ? '开' : '关'}</span>
        </button>

        {/* Voice Switch Capsule (Amber Unified) */}
        <button
          type="button"
          onClick={() => onUpdateFilters({ isVoiceEnabled: !filters.isVoiceEnabled })}
          className={`h-8 px-2.5 bg-white border rounded-[3px] flex items-center gap-1.5 text-xs transition font-semibold shadow-2xs cursor-pointer ${
            filters.isVoiceEnabled
              ? 'border-[#f59e0b]/40 text-[#b45309] hover:bg-[#fffbeb]'
              : 'border-[#c4c7c8] text-[#747878] hover:bg-[#f3f3f4]'
          }`}
          title="语音播报开关"
        >
          {filters.isVoiceEnabled ? (
            <Volume2 className="w-3.5 h-3.5 text-[#f59e0b] shrink-0" />
          ) : (
            <VolumeX className="w-3.5 h-3.5 text-[#747878] shrink-0" />
          )}
          <span>语音: {filters.isVoiceEnabled ? '开' : '关'}</span>
        </button>

        {/* Scan Barcode Capsule */}
        <button
          type="button"
          onClick={onOpenScanner}
          className="h-8 px-2.5 bg-white hover:bg-neutral-50 border border-[#c4c7c8] rounded-[3px] flex items-center gap-1.5 text-xs text-[#1a1c1c] font-medium transition shadow-2xs cursor-pointer"
        >
          <QrCode className="w-3.5 h-3.5 text-[#006494] shrink-0" />
          <span>扫码核销</span>
        </button>

        {/* Print Dispatch Capsule */}
        <button
          type="button"
          onClick={onBatchPrint}
          className="h-8 px-2.5 bg-white hover:bg-neutral-50 border border-[#c4c7c8] rounded-[3px] flex items-center gap-1.5 text-xs text-[#1a1c1c] font-medium transition shadow-2xs cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5 text-[#444748] shrink-0" />
          <span>批量打印</span>
        </button>

        {/* Toggle back to classic if needed */}
        {onSwitchToClassic && (
          <button
            type="button"
            onClick={onSwitchToClassic}
            className="h-8 px-2 bg-white hover:bg-[#f3f3f4] border border-[#c4c7c8] rounded-[3px] flex items-center gap-1 text-[11px] text-[#444748] transition cursor-pointer"
            title="切回经典版订单中心"
          >
            <RotateCcw className="w-3 h-3 text-[#747878]" />
            <span>经典版</span>
          </button>
        )}
      </div>
    </div>
  );
};
