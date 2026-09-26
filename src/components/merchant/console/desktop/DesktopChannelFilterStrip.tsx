import React from 'react';
import {
  LayoutGrid,
  UtensilsCrossed,
  Bike,
  Store,
  Calendar,
  ChevronDown,
  TableProperties,
  Grid3X3
} from 'lucide-react';

export type ChannelFilterType = 'all' | 'dine_in' | 'delivery' | 'pickup';
export type DateRangeType = 'all' | 'today' | 'yesterday' | '7days' | '30days' | 'month' | 'custom';
export type ViewModeType = 'matrix' | 'table';

interface DesktopChannelFilterStripProps {
  channel: ChannelFilterType;
  onChangeChannel: (ch: ChannelFilterType) => void;
  channelCounts: {
    all: number;
    dine_in: number;
    delivery: number;
    pickup: number;
  };
  dateRange: DateRangeType;
  onChangeDateRange: (range: DateRangeType) => void;
  viewMode: ViewModeType;
  onChangeViewMode: (mode: ViewModeType) => void;
  filteredCount: number;
  totalRevenue: number;
}

export const DesktopChannelFilterStrip: React.FC<DesktopChannelFilterStripProps> = ({
  channel,
  onChangeChannel,
  channelCounts,
  dateRange,
  onChangeDateRange,
  viewMode,
  onChangeViewMode,
  filteredCount,
  totalRevenue
}) => {
  const CHANNELS = [
    { key: 'all' as ChannelFilterType, label: '全渠道总控', icon: LayoutGrid, count: channelCounts.all },
    { key: 'dine_in' as ChannelFilterType, label: '堂食外摆', icon: UtensilsCrossed, count: channelCounts.dine_in },
    { key: 'delivery' as ChannelFilterType, label: '外卖专送', icon: Bike, count: channelCounts.delivery },
    { key: 'pickup' as ChannelFilterType, label: '到车自提', icon: Store, count: channelCounts.pickup }
  ];

  const DATE_OPTIONS: { key: DateRangeType; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'today', label: '今日' },
    { key: 'yesterday', label: '昨日' },
    { key: '7days', label: '近7天' },
    { key: '30days', label: '近30天' },
    { key: 'month', label: '本月' },
    { key: 'custom', label: '自定义' }
  ];

  return (
    <div className="border-b border-[#c4c7c8] px-4 py-2 flex flex-col gap-2 bg-white select-none font-sans">
      {/* Row 1: Channel Routing & View Mode */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-[#444748] uppercase tracking-wider shrink-0">
            分流渠道:
          </span>
          <div className="flex items-center gap-1">
            {CHANNELS.map((ch) => {
              const isSelected = channel === ch.key;
              const Icon = ch.icon;
              return (
                <button
                  key={ch.key}
                  type="button"
                  onClick={() => onChangeChannel(ch.key)}
                  className={`h-7 px-2.5 rounded-[3px] text-xs flex items-center gap-1.5 transition cursor-pointer ${
                    isSelected
                      ? 'bg-white border border-[#1a1c1c] text-[#1a1c1c] font-bold shadow-2xs'
                      : 'bg-white hover:bg-neutral-50 border border-[#c4c7c8] text-[#444748] hover:text-[#1a1c1c]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#006494]' : 'text-[#444748]'}`} />
                  <span>{ch.label}</span>
                  <span
                    className={`px-1 py-0.2 rounded-[2px] text-[11px] font-bold ${
                      isSelected ? 'text-[#006494] bg-[#eeeeee]' : 'text-[#444748]'
                    }`}
                  >
                    {ch.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Tip Banner */}
          <div className="hidden lg:flex items-center gap-1.5 text-[#444748] text-xs bg-white px-2 py-0.5 rounded-[3px] border border-[#c4c7c8]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#006494] animate-pulse" />
            <span className="text-[11px]">堂食订单默认不入骑手池，需转送请点击卡片【审核转外卖专送】</span>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center border border-[#c4c7c8] rounded-[3px] bg-white overflow-hidden shadow-2xs">
            <button
              type="button"
              onClick={() => onChangeViewMode('table')}
              className={`px-2.5 py-1 text-xs flex items-center gap-1 border-r border-[#c4c7c8] transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-[#eeeeee] text-[#1a1c1c] font-bold'
                  : 'text-[#444748] hover:text-[#1a1c1c] hover:bg-neutral-50'
              }`}
            >
              <TableProperties className="w-3.5 h-3.5" />
              <span>列表视图</span>
            </button>
            <button
              type="button"
              style={{ backgroundColor: '#f9f9f9' }}
              onClick={() => onChangeViewMode('matrix')}
              className={`px-2.5 py-1 text-xs flex items-center gap-1 transition cursor-pointer ${
                viewMode === 'matrix'
                  ? 'text-[#1a1c1c] font-bold'
                  : 'text-[#444748] hover:text-[#1a1c1c] hover:bg-neutral-50'
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5 text-[#006494]" />
              <span>卡片矩阵</span>
            </button>
          </div>
        </div>
      </div>

      {/* Row 2: Date Range & Revenue Tally */}
      <div className="flex items-center justify-between border-t border-[#c4c7c8]/60 pt-1.5">
        <div className="flex items-center gap-1.5 text-xs">
          <Calendar className="w-3.5 h-3.5 text-[#444748] shrink-0" />
          <span className="text-[#444748] shrink-0">日期筛选:</span>
          {DATE_OPTIONS.map((opt) => {
            const isSelected = dateRange === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => onChangeDateRange(opt.key)}
                className={`h-6 px-2 rounded-[3px] text-xs transition cursor-pointer flex items-center gap-0.5 ${
                  isSelected
                    ? 'bg-white text-[#1a1c1c] border border-[#1a1c1c] font-bold shadow-2xs'
                    : 'bg-white hover:bg-neutral-50 border border-[#c4c7c8] text-[#444748] hover:text-[#1a1c1c]'
                }`}
              >
                <span>{opt.label}</span>
                {opt.key === 'custom' && <ChevronDown className="w-3 h-3 text-[#444748]" />}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 text-xs text-[#444748]">
          <span>全历史订单池</span>
          <span className="text-[#c4c7c8]">/</span>
          <span>
            筛选出 <strong className="text-[#1a1c1c] font-bold">{filteredCount}</strong> 笔
          </span>
          <span className="text-[#c4c7c8]">/</span>
          <span className="flex items-center gap-1">
            <span>流水:</span>
            <strong className="text-[#006494] text-base font-bold tracking-tight">
              ¥{totalRevenue.toFixed(2)}
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
};
