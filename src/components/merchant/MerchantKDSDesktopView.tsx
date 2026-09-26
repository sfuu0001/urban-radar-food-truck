import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Microwave,
  UtensilsCrossed,
  ShoppingBag,
  Bike,
  Clock,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Flame,
  Volume2,
  Printer,
  CheckCheck,
  Phone,
  Package,
  Lock,
  Boxes,
  Activity,
  Wifi,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Layers,
  Sparkles,
  Search,
  X,
  Gauge,
  Cpu,
  Receipt,
  BellRing,
  Coffee,
  ArrowUpDown,
  Unlock,
  MessageSquare,
  Trash2,
  Megaphone,
  ChefHat
} from 'lucide-react';
import { KdsCardData, KdsCardItem, calculateKdsTelemetry, cardToKitchenTicket } from '../../utils/kdsDataAdapter';
import { printLayoutViaBridge } from '../../utils/localPrintBridge';
import { buildKitchenTicketLayoutLines } from '../../utils/escpos';

export interface MerchantKDSDesktopViewProps {
  cards: KdsCardData[];
  onToggleItemStrike: (cardId: string, itemId: string) => void;
  onCompleteWholeCard: (card: KdsCardData, forceVoice?: boolean) => void;
  onManualCallCard?: (card: KdsCardData) => void;
  onDiscardCard?: (card: KdsCardData) => void;
  onOpenChat?: (ticketNo: string) => void;
  isAllTimelinesOpen: boolean;
  toggleAllTimelines: () => void;
  expandedDrawers: Record<string, boolean>;
  toggleItemDrawer: (itemId: string, e?: React.MouseEvent) => void;
  showToast: (msg: string) => void;
  nowSec: number;
  formatElapsed: (sec: number) => string;
  autoVoiceBroadcast?: boolean;
  onToggleAutoVoice?: () => void;
  onBatchFinishDish?: (dishName: string, broadcast?: boolean) => void;
  onOpenAuditDrawer?: () => void;
}

export const MerchantKDSDesktopView: React.FC<MerchantKDSDesktopViewProps> = ({
  cards,
  onToggleItemStrike,
  onCompleteWholeCard,
  onManualCallCard,
  onDiscardCard,
  onOpenChat,
  isAllTimelinesOpen,
  toggleAllTimelines,
  expandedDrawers,
  toggleItemDrawer,
  showToast,
  nowSec,
  formatElapsed,
  autoVoiceBroadcast = true,
  onToggleAutoVoice,
  onBatchFinishDish,
  onOpenAuditDrawer
}) => {
  // 渠道过滤 & 档口过滤
  const [channelFilter, setChannelFilter] = useState<'all' | 'dine_in' | 'delivery' | 'expedited' | 'pickup'>('all');
  const [stationFilter, setStationFilter] = useState<'all' | 'grill' | 'fryer' | 'bar' | 'cabin'>('all');
  const [desktopViewMode, setDesktopViewMode] = useState<'matrix' | 'batch'>('matrix');

  // 补打后厨备餐联 (本地打印桥 layout 模式，雅黑排版，无价格)
  const [reprintingIds, setReprintingIds] = useState<Set<string>>(new Set());
  const handleReprintKitchen = async (card: KdsCardData) => {
    if (reprintingIds.has(card.id)) return;
    setReprintingIds((prev) => new Set(prev).add(card.id));
    try {
      const res = await printLayoutViaBridge(
        buildKitchenTicketLayoutLines(cardToKitchenTicket(card)),
        '后厨备餐联',
        'kitchen'
      );
      if (res.ok) {
        showToast(`备餐联已重新打印: ${card.ticketNo} (${card.title})，请看出纸口`);
      } else {
        showToast(`补打失败: ${res.error || '打印桥返回异常'}`);
      }
    } catch {
      showToast('本地打印桥未运行，请先在收银机双击 start-bridge.cmd 启动');
    } finally {
      setReprintingIds((prev) => {
        const next = new Set(prev);
        next.delete(card.id);
        return next;
      });
    }
  };

  // 搜索功能
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchWidgetRef = useRef<HTMLDivElement>(null);

  // 快捷键 '/' 唤起搜索
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        setIsSearchExpanded(true);
        setIsSearchDropdownOpen(true);
        setTimeout(() => {
          searchInputRef.current?.focus({ preventScroll: true });
        }, 40);
      } else if (e.key === 'Escape') {
        setIsSearchExpanded(false);
        setIsSearchDropdownOpen(false);
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 点击外部收起搜索
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchWidgetRef.current && !searchWidgetRef.current.contains(e.target as Node)) {
        setIsSearchDropdownOpen(false);
        if (!searchQuery.trim()) {
          setIsSearchExpanded(false);
        }
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [searchQuery]);

  // 动态构建搜索联想索引
  const searchIndex = useMemo(() => {
    return cards.map((c) => ({
      id: c.ticketNo,
      cardId: `desktop-card-${c.id}`,
      title: `${c.title} · ${c.ticketNo}`,
      sub: c.items.map((i) => i.name).join(' / '),
      pinyin: [c.ticketNo.toLowerCase().replace('#', ''), c.title.toLowerCase()],
      tag: c.isUrgent
        ? '告警催起'
        : c.channel === 'dine_in'
        ? '堂食外摆'
        : c.channel === 'delivery'
        ? '外卖专送'
        : '到车自提'
    }));
  }, [cards]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return searchIndex.filter((item) => {
      const matchText = `${item.title} ${item.sub} ${item.tag} ${item.id}`.toLowerCase();
      if (matchText.includes(q)) return true;
      return item.pinyin.some((p) => p.includes(q));
    });
  }, [searchQuery, searchIndex]);

  const handleLocateCard = (cardId: string) => {
    setIsSearchDropdownOpen(false);
    const el = document.getElementById(cardId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-[#006494]', 'shadow-md');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-[#006494]', 'shadow-md');
      }, 2200);
    }
  };

  // 动态计算顶部 KPI
  const telemetry = useMemo(() => calculateKdsTelemetry(cards), [cards]);

  // 跨单菜品汇总数据 (一锅出，集成分布工单、特殊定制备注与单单直达作废)
  const dishAggregates = useMemo(() => {
    const map: Record<
      string,
      {
        totalQty: number;
        completedQty: number;
        ticketDetails: { ticketNo: string; title: string; qty: number; cardId: string; itemId: string; isCompleted: boolean }[];
        specialNotes: string[];
        station: string;
      }
    > = {};

    cards.forEach((c) => {
      c.items.forEach((it) => {
        if (!map[it.name]) {
          map[it.name] = {
            totalQty: 0,
            completedQty: 0,
            ticketDetails: [],
            specialNotes: [],
            station: it.station || 'grill'
          };
        }
        map[it.name].totalQty += it.quantity;
        if (it.isCompleted) {
          map[it.name].completedQty += it.quantity;
        }
        map[it.name].ticketDetails.push({
          ticketNo: c.ticketNo,
          title: c.title,
          qty: it.quantity,
          cardId: c.id,
          itemId: it.id,
          isCompleted: it.isCompleted
        });
        if (it.spec && !map[it.name].specialNotes.includes(it.spec)) {
          map[it.name].specialNotes.push(it.spec);
        }
      });
    });

    return map;
  }, [cards]);

  // 根据档口过滤卡片
  const stationFilteredCards = useMemo(() => {
    if (stationFilter === 'all') return cards;
    return cards.filter((c) =>
      c.items.some((it) => it.station === stationFilter)
    );
  }, [cards, stationFilter]);

  // 四大泳道动态数据 (支持三段 SLA 与催单优先级)
  const dineInCards = useMemo(
    () => stationFilteredCards.filter((c) => c.channel === 'dine_in' && !c.isUrgent),
    [stationFilteredCards]
  );
  const deliveryCards = useMemo(
    () => stationFilteredCards.filter((c) => c.channel === 'delivery' && !c.isUrgent),
    [stationFilteredCards]
  );
  const urgentCards = useMemo(
    () => stationFilteredCards.filter((c) => c.isUrgent || c.channel === 'expedited' || c.slaTier === 'urged' || c.slaTier === 'overtime'),
    [stationFilteredCards]
  );
  const pickupCards = useMemo(
    () => stationFilteredCards.filter((c) => c.channel === 'pickup' && !c.isUrgent),
    [stationFilteredCards]
  );

  // 计算单个单品工况节点抽屉是否处于展开状态
  const isItemDrawerOpen = (itemId: string) => {
    return expandedDrawers[itemId] !== undefined ? expandedDrawers[itemId] : isAllTimelinesOpen;
  };

  // 统计在制菜品总项数与已展开抽屉数
  const totalDishItemsCount = useMemo(() => {
    return cards.reduce((acc, c) => acc + c.items.length, 0);
  }, [cards]);

  const openedDrawersCount = useMemo(() => {
    return cards.reduce(
      (acc, c) =>
        acc +
        c.items.filter((it) =>
          expandedDrawers[it.id] !== undefined ? expandedDrawers[it.id] : isAllTimelinesOpen
        ).length,
      0
    );
  }, [cards, expandedDrawers, isAllTimelinesOpen]);

  /** 渲染单张工控卡片组件 */
  const renderCard = (card: KdsCardData, isUrgentStyle = false) => {
    const isCompletedAll = card.items.every((it) => it.isCompleted);
    const isUrgent = card.slaTier === 'urged' || card.isUrgent;
    const isOvertime = card.slaTier === 'overtime';
    const isPeak = card.slaTier === 'peak';

    const cardBorder = isUrgent
      ? 'border-[#BA1A1A] ring-1 ring-[#BA1A1A]/40'
      : isOvertime
      ? 'border-[#BA1A1A]/80 shadow-rose-950/5'
      : isPeak
      ? 'border-[#D97706]/70'
      : 'border-[#CCCCCC]/80';

    return (
      <div
        key={card.id}
        id={`desktop-card-${card.id}`}
        className={`bg-white rounded-[3px] border shadow-2xs flex flex-col justify-between overflow-hidden transition-all duration-200 ${cardBorder}`}
      >
        <div>
          {/* Card Header with Cutout Notches */}
          <div
            className={`relative px-3 py-2 border-b select-none ${
              isUrgent || isOvertime
                ? 'bg-[#FFDAD6] border-[#BA1A1A]'
                : isPeak
                ? 'bg-[#FEF3C7]/60 border-[#D97706]/40'
                : 'bg-[#F3F3F4] border-[#CCCCCC]'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 shrink-0">
                <div
                  className={`text-white text-[11px] font-bold px-2 py-0.5 rounded-[2px] shadow-2xs flex items-center gap-1 shrink-0 ${
                    isUrgent || isOvertime ? 'bg-[#BA1A1A]' : 'bg-[#1A1C1C]'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isUrgent
                        ? 'bg-white animate-bounce'
                        : isOvertime
                        ? 'bg-white animate-pulse'
                        : isPeak
                        ? 'bg-[#F59E0B]'
                        : 'bg-[#3BB4FE]'
                    }`}
                  />
                  <span className="tracking-wider">{card.ticketNo}</span>
                </div>

                <div
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] shadow-2xs shrink-0 border ${
                    isUrgent || isOvertime
                      ? 'bg-white text-[#BA1A1A] border-[#BA1A1A]'
                      : isPeak
                      ? 'bg-white text-[#92400E] border-[#D97706]'
                      : 'bg-white border-[#CCCCCC] text-[#1A1C1C]'
                  }`}
                >
                  {card.channel === 'dine_in' ? (
                    <UtensilsCrossed className="w-3.5 h-3.5 text-[#006494]" />
                  ) : card.channel === 'delivery' ? (
                    <Bike className="w-3.5 h-3.5 text-[#006494]" />
                  ) : card.channel === 'pickup' ? (
                    <Lock className="w-3.5 h-3.5 text-[#006494]" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-[#BA1A1A] animate-pulse" />
                  )}
                  <span className="font-bold text-xs truncate max-w-[100px]">{card.title}</span>
                  <span className="px-1 py-0.2 bg-[#EEEEEE] text-[#44474C] text-[9.5px] uppercase font-bold rounded-[2px]">
                    {card.channel === 'dine_in'
                      ? 'DINE-IN'
                      : card.channel === 'delivery'
                      ? 'DELIVERY'
                      : card.channel === 'pickup'
                      ? 'LOCKER'
                      : 'CRITICAL'}
                  </span>
                </div>
              </div>

              {/* 右侧：单据联络与作废 + 时间戳 */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* 三方即时联络室 */}
                {onOpenChat && (
                  <button
                    type="button"
                    onClick={() => onOpenChat(card.ticketNo)}
                    title="打开订单协同联络室"
                    className="w-6 h-6 rounded-[2px] bg-white border border-[#CCCCCC] text-[#006494] hover:bg-[#F3F3F4] flex items-center justify-center cursor-pointer transition shadow-2xs"
                  >
                    <MessageSquare className="w-3 h-3" />
                  </button>
                )}

                {/* 作废工单 */}
                {onDiscardCard && (
                  <button
                    type="button"
                    onClick={() => onDiscardCard(card)}
                    title="作废删除此工单"
                    className="w-6 h-6 rounded-[2px] bg-white border border-[#CCCCCC] text-[#BA1A1A] hover:bg-[#FFDAD6] flex items-center justify-center cursor-pointer transition shadow-2xs"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}

                <div className="flex flex-col items-end shrink-0 text-[11px] leading-tight">
                  <div className="flex items-center gap-1 text-[#44474C]">
                    <Clock className="w-3 h-3 text-[#74777D]" />
                    <span>{card.orderTime}</span>
                  </div>
                  <span
                    className={`font-bold px-1.5 py-0.5 rounded shadow-2xs flex items-center gap-1 mt-0.5 ${
                      isUrgent
                        ? 'bg-[#BA1A1A] text-white animate-bounce'
                        : isOvertime
                        ? 'bg-[#BA1A1A] text-white animate-pulse'
                        : isPeak
                        ? 'bg-[#FEF3C7] text-[#92400E]'
                        : 'bg-[#CBE6FF] text-[#001E30]'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isUrgent || isOvertime
                          ? 'bg-white animate-pulse'
                          : isPeak
                          ? 'bg-[#F59E0B]'
                          : 'bg-[#006494] animate-pulse'
                      }`}
                    />
                    {isUrgent || isOvertime
                      ? `超时 ${formatElapsed(card.elapsedSeconds)}`
                      : isPeak
                      ? `高峰 ${formatElapsed(card.elapsedSeconds)}`
                      : `顺畅 ${formatElapsed(card.elapsedSeconds)}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Cutout Notches */}
            <div className="absolute -bottom-1.5 left-0 w-3 h-3 rounded-full bg-[#F9F9F9] border-r border-[#CCCCCC] -translate-x-1/2" />
            <div className="absolute -bottom-1.5 right-0 w-3 h-3 rounded-full bg-[#F9F9F9] border-l border-[#CCCCCC] translate-x-1/2" />
          </div>

          {/* 渠道专属信息带 */}
          {card.isUrgent && (
            <div className="mx-3 mt-3 p-2 bg-[#FFDAD6] border border-[#BA1A1A]/40 rounded flex items-center justify-between text-xs text-[#93000A]">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 text-[#BA1A1A]" />
                <span>已催单 {card.urgencyCount || 1} 次 (服务台/顾客加急)</span>
              </div>
              <span className="text-[11px] text-[#BA1A1A] font-bold">SLA BREACH</span>
            </div>
          )}

          {card.riderInfo && !card.isUrgent && (
            <div className="mx-3 mt-3 p-2 bg-[#F3F3F4] border border-[#CCCCCC]/60 rounded flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#006494] animate-pulse" />
                <span className="font-bold text-[#1A1C1C]">{card.riderInfo.name}</span>
                <span className="text-[11px] text-[#44474C] font-semibold">({card.riderInfo.distance})</span>
              </div>
              <div className="bg-white text-[#1A1C1C] border border-[#CCCCCC] rounded-full px-2.5 py-0.5 shadow-2xs inline-flex items-center gap-1 text-[11px] font-bold">
                <Clock className="w-3 h-3 text-[#006494]" />
                <span>{card.riderInfo.eta}</span>
              </div>
            </div>
          )}

          {card.cabinInfo && !card.isUrgent && (
            <div className="mx-3 mt-3 p-2 bg-[#F3F3F4] border border-[#CCCCCC]/60 rounded flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-[#006494]" />
                <span className="font-bold text-[#1A1C1C]">{card.cabinInfo.slot}</span>
              </div>
              <div className="bg-white text-[#1A1C1C] border border-[#CCCCCC] rounded-full px-2.5 py-0.5 shadow-2xs inline-flex items-center gap-1 text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#006494]" />
                <span>{card.cabinInfo.status}</span>
              </div>
            </div>
          )}

          {/* Items Stream */}
          <div className="p-3 flex flex-col gap-2">
            <span className="text-[11px] text-[#74777D] font-bold uppercase tracking-wider">
              点击菜品划菜 · 制作时序:
            </span>

            {card.items.map((it) => (
              <div
                key={it.id}
                onClick={() => onToggleItemStrike(card.id, it.id)}
                className={`p-2 rounded-[3px] border shadow-2xs flex flex-col gap-1 cursor-pointer transition-colors active:bg-neutral-50 ${
                  it.isCompleted
                    ? 'bg-[#F9F9F9] border-[#E2E2DF]'
                    : isUrgentStyle || card.isUrgent
                    ? 'bg-white border-[#BA1A1A]/40'
                    : 'bg-white border-[#CCCCCC]/70'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-bold ${
                          it.isCompleted ? 'line-through text-[#74777D]' : 'text-[#1A1C1C]'
                        }`}
                      >
                        {it.name}
                      </span>
                    </div>
                    {it.spec && (
                      <span className="text-[11px] text-[#74777D] font-medium mt-0.5">
                        {it.spec}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold px-1.5 py-0.5 bg-[#EEEEEE] text-[#1A1C1C] rounded-[2px]">
                      x{it.quantity}
                    </span>
                    {it.isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-[#006494]" />
                    ) : (
                      <Circle className="w-4 h-4 text-[#74777D]" />
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs mt-0.5 pt-1 bg-[#F3F3F4] px-2 py-0.5 rounded-[2px]">
                  <span className="text-[#44474C]">{it.statusText}</span>
                  <span className="bg-white text-[#1A1C1C] border border-[#CCCCCC] rounded-full px-2 py-0.2 shadow-2xs inline-flex items-center gap-1 text-[10.5px] font-bold">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        it.isCompleted ? 'bg-[#006494]' : 'bg-[#F59E0B]'
                      }`}
                    />
                    {it.statusDuration}
                  </span>
                </div>

                {/* 四阶段工况节点 下拉式抽屉触发条 */}
                {it.timeline?.steps && (
                  <div className="mt-1 pt-1 border-t border-[#CCCCCC]/40 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleItemDrawer(it.id, e);
                      }}
                      className={`h-5.5 px-2 rounded-[2px] border text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs ${
                        isItemDrawerOpen(it.id)
                          ? 'bg-[#006494]/10 text-[#006494] border-[#006494]/30'
                          : 'bg-[#F3F3F4] text-[#44474C] border-[#CCCCCC]/60 hover:bg-[#EAEAEA]'
                      }`}
                      title={isItemDrawerOpen(it.id) ? '点击收起四阶段工况抽屉' : '点击展开四阶段工况节点抽屉'}
                    >
                      <Activity className="w-3 h-3 text-[#006494]" />
                      <span>四阶段工况节点</span>
                      <ChevronDown
                        className={`w-3 h-3 transition-transform duration-200 ${
                          isItemDrawerOpen(it.id) ? 'rotate-180 text-[#006494]' : 'text-[#74777D]'
                        }`}
                      />
                    </button>
                    <span className="text-[9.5px] text-[#74777D] font-semibold">
                      总耗时: {it.timeline.totalDuration}
                    </span>
                  </div>
                )}

                {/* 四阶段工况节点 下拉展开抽屉内容 */}
                {isItemDrawerOpen(it.id) && it.timeline?.steps && (
                  <div className="mt-1 pt-1.5 bg-[#F9F9F9] p-2 rounded-[2px] border border-dashed border-[#006494]/30 flex flex-col gap-1 text-[11px] shadow-2xs animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-[10px] text-[#006494] font-bold border-b border-[#CCCCCC]/50 pb-1">
                      <span className="flex items-center gap-1">
                        <SlidersHorizontal className="w-3 h-3 text-[#006494]" />
                        四阶段工况节点推导
                      </span>
                      <span className="text-[#44474C] font-normal">{it.timeline.totalDuration}</span>
                    </div>
                    {it.timeline.steps.map((st, sIdx) => (
                      <div
                        key={sIdx}
                        className={`flex items-start justify-between py-0.5 ${
                          st.isCurrent ? 'text-[#006494] font-bold bg-[#CBE6FF]/35 px-1 rounded-[2px]' : 'text-[#44474C]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold text-[9px] shrink-0 ${
                              st.isCurrent
                                ? 'bg-[#006494] text-white'
                                : 'bg-[#E2E2DF] text-[#44474C]'
                            }`}
                          >
                            {sIdx + 1}
                          </span>
                          <div className="flex flex-col">
                            <span className="leading-tight">{st.label}</span>
                            {st.operator && (
                              <span className="text-[9.5px] text-[#74777D] font-normal">{st.operator}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                          <span className="font-semibold leading-tight">{st.time}</span>
                          {st.diff && <span className="text-[9px] text-[#006494]">{st.diff}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Card Footer Actions: 叫号 + 补打 + 出餐并叫号 + 仅出餐 */}
        <div className="p-2.5 bg-[#F3F3F4] flex items-center justify-between gap-1.5 border-t border-[#CCCCCC]">
          {/* 语音广播叫号 */}
          <button
            type="button"
            onClick={() => {
              if (onManualCallCard) {
                onManualCallCard(card);
              } else {
                showToast(`已向外放广播呼叫: ${card.ticketNo} (${card.title})`);
              }
            }}
            className="h-8 px-2 bg-white hover:bg-neutral-50 text-[#1A1C1C] border border-[#CCCCCC] rounded-[2px] shadow-2xs flex items-center gap-1 transition-colors cursor-pointer text-xs font-bold"
            title="外放真人语音呼叫"
          >
            <Volume2 className="w-3.5 h-3.5 text-[#006494]" />
            <span>叫号</span>
          </button>

          {/* 补打小票 */}
          <button
            type="button"
            disabled={reprintingIds.has(card.id)}
            onClick={() => handleReprintKitchen(card)}
            className="h-8 px-2 bg-white hover:bg-neutral-50 text-[#1A1C1C] border border-[#CCCCCC] rounded-[2px] shadow-2xs flex items-center gap-1 transition-colors cursor-pointer text-xs font-bold disabled:opacity-60 disabled:cursor-not-allowed"
            title="重新打印后厨备餐联 (本地打印桥直连)"
          >
            <Printer className="w-3.5 h-3.5 text-[#006494]" />
            <span>{reprintingIds.has(card.id) ? '补打中' : '补打'}</span>
          </button>

          {/* 联络骑手 / 顾客 */}
          {card.riderInfo?.phone && (
            <button
              type="button"
              onClick={() => showToast(`正在拨通骑手电话 (${card.riderInfo?.phone})...`)}
              className="h-8 px-2 bg-white hover:bg-neutral-50 text-[#1A1C1C] border border-[#CCCCCC] rounded-[2px] shadow-2xs flex items-center gap-1 transition-colors cursor-pointer text-xs font-bold"
              title="拨打骑手电话"
            >
              <Phone className="w-3.5 h-3.5 text-[#006494]" />
              <span>拨号</span>
            </button>
          )}

          {/* 出餐并叫号 */}
          <button
            type="button"
            onClick={() => onCompleteWholeCard(card, true)}
            className={`h-8 px-2.5 flex-1 min-w-0 rounded-[2px] shadow-2xs flex items-center justify-center gap-1 transition-colors font-bold cursor-pointer text-xs ${
              isUrgentStyle || card.isUrgent
                ? 'bg-[#BA1A1A] hover:bg-[#93000A] text-white'
                : 'bg-[#1A1C1C] hover:bg-black text-white'
            }`}
          >
            <ChefHat className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>出餐并叫号</span>
          </button>

          {/* 仅出餐 (静音出餐) */}
          <button
            type="button"
            onClick={() => onCompleteWholeCard(card, false)}
            className="h-8 px-2 bg-white hover:bg-neutral-50 text-[#1A1C1C] border border-[#CCCCCC] rounded-[2px] shadow-2xs flex items-center justify-center font-bold cursor-pointer text-xs"
            title="静音标记出餐完成 (不外放广播)"
          >
            <span>仅出餐</span>
          </button>
        </div>
      </div>
    );
  };

  /** 渲染空泳道状态 */
  const renderEmptyColumn = (label: string, icon: React.ReactNode) => (
    <div className="bg-white rounded-[3px] border border-dashed border-[#CCCCCC] p-8 flex flex-col items-center justify-center text-center text-[#74777D] gap-2 min-h-[220px]">
      <div className="opacity-40">{icon}</div>
      <span className="text-xs font-bold text-[#1A1C1C]">暂无{label}工单</span>
      <span className="text-[11px] opacity-70">档口工位待命中 · 实时接入新单</span>
    </div>
  );

  return (
    <div
      style={{
        backgroundColor: '#F9F9F9',
        color: '#1A1C1C',
        fontFamily: '"Space Grotesk", "Hanken Grotesk", sans-serif'
      }}
      className="hidden md:block w-full min-h-screen bg-[#F9F9F9] select-none text-[#1A1C1C]"
    >
      <main className="relative bg-[#F9F9F9] min-h-screen flex flex-col w-full">
        {/* ========================================================================= */}
        {/* TOP TELEMETRY RIBBON                                                      */}
        {/* ========================================================================= */}
        <section className="bg-[#F3F3F4] px-6 py-3 border-b border-[#CCCCCC]/60 shadow-2xs">
          <div className="flex flex-col gap-3">
            {/* Row 1: Station Status, Hardware Telemetry, Global Action Bus */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Station Identity and RTK/CAN/LATENCY Bus */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-[3px] border border-[#CCCCCC]/70 shadow-2xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3BB4FE] animate-pulse" />
                  <span className="text-sm font-bold text-[#1A1C1C] tracking-tight">
                    01号·旗舰餐车
                  </span>
                  <span className="text-[11px] px-1.5 py-0.5 bg-[#CBE6FF] text-[#001E30] rounded-[2px] uppercase font-bold">
                    营业中 · RUNNING
                  </span>
                </div>

                <div className="flex items-center gap-3 px-3 py-1 bg-white rounded-[3px] border border-[#CCCCCC]/70 shadow-2xs text-xs">
                  <div className="flex items-center gap-1">
                    <Wifi className="w-3.5 h-3.5 text-[#006494]" />
                    <span className="text-[#44474C]">RTK-5G:</span>
                    <span className="font-bold text-[#1A1C1C]">99.98% LOCK</span>
                  </div>
                  <span className="text-[#CCCCCC]">|</span>
                  <div className="flex items-center gap-1">
                    <Cpu className="w-3.5 h-3.5 text-[#74777D]" />
                    <span className="text-[#44474C]">CAN_BUS:</span>
                    <span className="font-bold text-[#1A1C1C]">500Kbps</span>
                  </div>
                  <span className="text-[#CCCCCC]">|</span>
                  <div className="flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5 text-[#006494]" />
                    <span className="text-[#44474C]">RTT:</span>
                    <span className="font-bold text-[#006494]">4ms</span>
                  </div>
                </div>
              </div>

              {/* Global Batch Actions & Search */}
              <div className="flex items-center gap-2 text-xs">
                {/* 智能拼音检索组件 */}
                <div className="relative flex items-center justify-end select-none" ref={searchWidgetRef}>
                  <div
                    className={`flex items-center h-8 bg-white border rounded-[3px] transition-all duration-300 ease-in-out overflow-hidden shadow-2xs ${
                      isSearchExpanded ? 'w-64 border-[#006494]' : 'w-8 border-[#CCCCCC]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setIsSearchExpanded(true);
                        setIsSearchDropdownOpen(true);
                        setTimeout(() => searchInputRef.current?.focus({ preventScroll: true }), 40);
                      }}
                      className="w-8 h-8 flex items-center justify-center text-[#44474C] hover:text-[#1A1C1C] cursor-pointer shrink-0"
                    >
                      <Search className="w-3.5 h-3.5" />
                    </button>
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setIsSearchDropdownOpen(true);
                      }}
                      onFocus={() => setIsSearchDropdownOpen(true)}
                      placeholder="搜索单号/拼音 (快捷键 '/')..."
                      className="w-full text-xs bg-transparent outline-none text-[#1A1C1C] placeholder:text-[#74777D] pr-2"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setIsSearchDropdownOpen(false);
                        }}
                        className="px-1 text-[#74777D] hover:text-[#1A1C1C] cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* 搜索结果浮窗 */}
                  {isSearchDropdownOpen && searchResults.length > 0 && (
                    <div className="absolute top-9 right-0 w-80 bg-white border border-[#CCCCCC] rounded-[3px] shadow-lg z-50 p-1 flex flex-col gap-1 max-h-80 overflow-y-auto">
                      <div className="px-2 py-1 text-[10px] text-[#74777D] font-bold border-b border-[#EEEEEE] flex justify-between">
                        <span>匹配在制工单 ({searchResults.length})</span>
                        <span>按 Esc 关闭</span>
                      </div>
                      {searchResults.map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleLocateCard(item.cardId)}
                          className="p-2 hover:bg-[#F3F3F4] rounded-[2px] cursor-pointer transition-colors flex items-center justify-between"
                        >
                          <div className="flex flex-col">
                            <span className="font-bold text-xs text-[#1A1C1C]">{item.title}</span>
                            <span className="text-[11px] text-[#74777D] truncate max-w-[200px]">{item.sub}</span>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#CBE6FF] text-[#001E30] font-bold">
                            {item.tag}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 自动语音广播开关 */}
                {onToggleAutoVoice && (
                  <button
                    type="button"
                    onClick={onToggleAutoVoice}
                    className={`h-8 px-2.5 rounded-[3px] border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                      autoVoiceBroadcast
                        ? 'bg-white text-[#006494] border-[#006494]/40 hover:bg-[#F3F3F4]'
                        : 'bg-white text-[#74777D] border-[#CCCCCC] hover:bg-[#F3F3F4]'
                    }`}
                    title={autoVoiceBroadcast ? '点击关闭出餐自动语音广播' : '点击开启出餐自动语音广播'}
                  >
                    <Megaphone className={`w-3.5 h-3.5 ${autoVoiceBroadcast ? 'text-[#006494]' : 'text-[#74777D]'}`} />
                    <span>{autoVoiceBroadcast ? '语音广播：开' : '语音广播：关'}</span>
                  </button>
                )}

                {/* 审计流水抽屉 */}
                {onOpenAuditDrawer && (
                  <button
                    type="button"
                    onClick={onOpenAuditDrawer}
                    className="h-8 px-2.5 rounded-[3px] bg-white hover:bg-[#F3F3F4] text-[#1A1C1C] border border-[#CCCCCC] font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  >
                    <Activity className="w-3.5 h-3.5 text-[#006494]" />
                    <span>操作审计</span>
                  </button>
                )}

                {/* 四阶段工况节点抽屉总控开关 */}
                <div className="flex items-center h-8 px-2.5 bg-white border border-[#CCCCCC] rounded-[3px] shadow-2xs gap-2 select-none">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#1A1C1C]">
                    <Activity className="w-3.5 h-3.5 text-[#006494]" />
                    <span>工况抽屉总控:</span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isAllTimelinesOpen}
                    onClick={toggleAllTimelines}
                    className={`h-5 w-10 rounded-full transition-colors relative cursor-pointer p-0.5 border ${
                      isAllTimelinesOpen ? 'bg-[#006494] border-[#004e75]' : 'bg-[#E2E2DF] border-[#CCCCCC]'
                    }`}
                    title={isAllTimelinesOpen ? '点击一键全部收起工况抽屉' : '点击一键全部展开工况抽屉'}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full bg-white transition-transform duration-200 shadow-sm ${
                        isAllTimelinesOpen ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className={`text-[11px] font-bold ${isAllTimelinesOpen ? 'text-[#006494]' : 'text-[#74777D]'}`}>
                    {isAllTimelinesOpen ? '全展开' : '全关闭'}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#F3F3F4] text-[#44474C] font-semibold">
                    {openedDrawersCount}/{totalDishItemsCount}
                  </span>
                </div>
              </div>
            </div>

            {/* Row 2: Real-time Telemetry Metrics (4 KPI Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* KPI 1 */}
              <div className="bg-white p-3 rounded-[3px] border border-[#CCCCCC]/80 shadow-2xs flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[11px] text-[#74777D] font-bold uppercase">
                    实时在制工单量
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-2xl font-bold text-[#1A1C1C]">
                      {String(telemetry.totalTickets).padStart(2, '0')}
                    </span>
                    <span className="text-xs text-[#74777D]">单在制</span>
                  </div>
                </div>
                <div className="flex flex-col items-end text-xs">
                  <span className="text-[#44474C]">当前峰值负荷</span>
                  <span className="font-bold text-[#006494]">
                    {telemetry.totalTickets > 10 ? '高峰运转' : '负荷适中'}
                  </span>
                </div>
              </div>

              {/* KPI 2 */}
              <div className="bg-white p-3 rounded-[3px] border border-[#CCCCCC]/80 shadow-2xs flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[11px] text-[#74777D] font-bold uppercase">
                    待制作菜品项
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-2xl font-bold text-[#1A1C1C]">
                      {String(telemetry.pendingItemsCount).padStart(2, '0')}
                    </span>
                    <span className="text-xs text-[#74777D]">份待出</span>
                  </div>
                </div>
                <div className="flex flex-col items-end text-xs">
                  <span className="text-[#44474C]">平扒炉 / 炸炉双开</span>
                  <span className="font-bold text-[#006494]">动线畅通</span>
                </div>
              </div>

              {/* KPI 3 */}
              <div className="bg-white p-3 rounded-[3px] border border-[#CCCCCC]/80 shadow-2xs flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[11px] text-[#74777D] font-bold uppercase">
                    平均出餐耗时 / SLA
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-2xl font-bold text-[#1A1C1C]">
                      {telemetry.avgElapsedMins}
                    </span>
                    <span className="text-xs text-[#44474C]">m</span>
                  </div>
                </div>
                <div className="flex flex-col items-end text-xs">
                  <span className="text-[#44474C]">SLA达标 (基准15m)</span>
                  <span className="font-bold text-[#006494]">{telemetry.slaPassRate}% 达标</span>
                </div>
              </div>

              {/* KPI 4 */}
              <div className="bg-[#FFDAD6] p-3 rounded-[3px] border border-[#BA1A1A]/40 shadow-2xs flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[11px] text-[#93000A] font-bold uppercase flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-[#BA1A1A]" /> 催单超限预警
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-2xl font-bold text-[#93000A]">
                      {String(telemetry.urgentCount).padStart(2, '0')}
                    </span>
                    <span className="text-xs text-[#93000A]">单报警</span>
                  </div>
                </div>
                <div className="flex flex-col items-end text-xs">
                  <span className="text-[#93000A] opacity-80">最高危处理</span>
                  <span className="font-bold text-[#BA1A1A]">
                    {telemetry.urgentCount > 0 ? '优先跳序赶工' : '全线平稳'}
                  </span>
                </div>
              </div>
            </div>

            {/* Row 3: Multichannel Filters, Stations & View Mode Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-3 py-1.5 rounded-[3px] border border-[#CCCCCC]/70 shadow-2xs text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                {/* 视图切换：按单矩阵 vs 菜品汇总 (一锅出) */}
                <div className="flex items-center bg-[#F3F3F4] p-0.5 rounded-[3px] border border-[#CCCCCC]">
                  <button
                    type="button"
                    onClick={() => setDesktopViewMode('matrix')}
                    className={`h-6 px-2.5 rounded-[2px] text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      desktopViewMode === 'matrix'
                        ? 'bg-[#1A1C1C] text-white shadow-2xs'
                        : 'text-[#44474C] hover:text-[#1A1C1C]'
                    }`}
                  >
                    <Receipt className="w-3 h-3" />
                    <span>按单 4 泳道 ({cards.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDesktopViewMode('batch')}
                    className={`h-6 px-2.5 rounded-[2px] text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      desktopViewMode === 'batch'
                        ? 'bg-[#1A1C1C] text-white shadow-2xs'
                        : 'text-[#44474C] hover:text-[#1A1C1C]'
                    }`}
                  >
                    <Layers className="w-3 h-3" />
                    <span>菜品汇总一锅出 ({Object.keys(dishAggregates).length}种)</span>
                  </button>
                </div>

                <span className="h-4 w-px bg-[#CCCCCC] mx-1" />

                {/* 渠道标签 */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setChannelFilter('all')}
                    className={`h-6 px-2.5 rounded-full border text-[11px] font-bold flex items-center gap-1.5 transition-all select-none cursor-pointer ${
                      channelFilter === 'all'
                        ? 'bg-[#1A1C1C] text-white border-[#1A1C1C] shadow-2xs'
                        : 'bg-white hover:bg-[#F3F3F4] text-[#44474C] border-[#CCCCCC]'
                    }`}
                  >
                    <span>全部流水</span>
                    <span className="px-1 py-0.2 rounded-full bg-[#F3F3F4] text-[#1A1C1C] text-[10px] font-bold">
                      {cards.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setChannelFilter('dine_in')}
                    className={`h-6 px-2.5 rounded-full border text-[11px] font-bold flex items-center gap-1.5 transition-all select-none cursor-pointer ${
                      channelFilter === 'dine_in'
                        ? 'bg-[#1A1C1C] text-white border-[#1A1C1C] shadow-2xs'
                        : 'bg-white hover:bg-[#F3F3F4] text-[#44474C] border-[#CCCCCC]'
                    }`}
                  >
                    <UtensilsCrossed className="w-3 h-3" />
                    <span>堂食外摆</span>
                    <span className="px-1 py-0.2 rounded-full bg-[#F3F3F4] text-[#44474C] text-[10px]">
                      {dineInCards.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setChannelFilter('delivery')}
                    className={`h-6 px-2.5 rounded-full border text-[11px] font-bold flex items-center gap-1.5 transition-all select-none cursor-pointer ${
                      channelFilter === 'delivery'
                        ? 'bg-[#1A1C1C] text-white border-[#1A1C1C] shadow-2xs'
                        : 'bg-white hover:bg-[#F3F3F4] text-[#44474C] border-[#CCCCCC]'
                    }`}
                  >
                    <Bike className="w-3.5 h-3.5" />
                    <span>外卖专送</span>
                    <span className="px-1 py-0.2 rounded-full bg-[#F3F3F4] text-[#44474C] text-[10px]">
                      {deliveryCards.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setChannelFilter('expedited')}
                    className={`h-6 px-2.5 rounded-full border text-[11px] font-bold flex items-center gap-1.5 transition-all select-none cursor-pointer ${
                      channelFilter === 'expedited'
                        ? 'bg-[#BA1A1A] text-white border-[#BA1A1A] shadow-2xs'
                        : 'bg-[#FFDAD6] text-[#BA1A1A] border-[#BA1A1A]/40 hover:bg-[#BA1A1A] hover:text-white'
                    }`}
                  >
                    <BellRing className="w-3.5 h-3.5" />
                    <span>告警催起</span>
                    <span className="px-1 py-0.2 rounded-full bg-white text-[#BA1A1A] text-[10px]">
                      {urgentCards.length}
                    </span>
                  </button>
                </div>

                <span className="h-4 w-px bg-[#CCCCCC] mx-1" />

                {/* 档口分类 */}
                <div className="flex items-center gap-1 text-[11px] text-[#44474C]">
                  <span className="font-semibold text-[#74777D] uppercase">档口:</span>
                  <button
                    type="button"
                    onClick={() => setStationFilter('all')}
                    className={`h-6 px-2 rounded-full border font-bold transition-all cursor-pointer ${
                      stationFilter === 'all'
                        ? 'bg-[#1A1C1C] text-white border-[#1A1C1C]'
                        : 'bg-white hover:bg-[#F3F3F4] text-[#44474C] border-[#CCCCCC]'
                    }`}
                  >
                    全部
                  </button>
                  <button
                    type="button"
                    onClick={() => setStationFilter('grill')}
                    className={`h-6 px-2 rounded-full border font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      stationFilter === 'grill'
                        ? 'bg-[#1A1C1C] text-white border-[#1A1C1C]'
                        : 'bg-white hover:bg-[#F3F3F4] text-[#44474C] border-[#CCCCCC]'
                    }`}
                  >
                    <Flame className="w-3 h-3 text-[#F59E0B]" />
                    <span>平扒炉</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStationFilter('fryer')}
                    className={`h-6 px-2 rounded-full border font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      stationFilter === 'fryer'
                        ? 'bg-[#1A1C1C] text-white border-[#1A1C1C]'
                        : 'bg-white hover:bg-[#F3F3F4] text-[#44474C] border-[#CCCCCC]'
                    }`}
                  >
                    <Sparkles className="w-3 h-3 text-[#3BB4FE]" />
                    <span>高压炸炉</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStationFilter('bar')}
                    className={`h-6 px-2 rounded-full border font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      stationFilter === 'bar'
                        ? 'bg-[#1A1C1C] text-white border-[#1A1C1C]'
                        : 'bg-white hover:bg-[#F3F3F4] text-[#44474C] border-[#CCCCCC]'
                    }`}
                  >
                    <Coffee className="w-3 h-3 text-[#006494]" />
                    <span>水吧冷萃</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStationFilter('cabin')}
                    className={`h-6 px-2 rounded-full border font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      stationFilter === 'cabin'
                        ? 'bg-[#1A1C1C] text-white border-[#1A1C1C]'
                        : 'bg-white hover:bg-[#F3F3F4] text-[#44474C] border-[#CCCCCC]'
                    }`}
                  >
                    <Boxes className="w-3 h-3 text-[#74777D]" />
                    <span>恒温柜</span>
                  </button>
                </div>
              </div>

              {/* 排序与自动同步 */}
              <div className="flex items-center gap-2 text-[#44474C]">
                <div className="flex items-center gap-1">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span>排序:</span>
                  <span className="text-[#1A1C1C] font-bold">催单优先 + 时长倒序</span>
                </div>
                <span className="text-[#CCCCCC]">|</span>
                <div className="flex items-center gap-1 text-[#006494] font-bold">
                  <span className="w-2 h-2 rounded-full bg-[#006494] animate-pulse" />
                  <span>AUTO-SYNC 1s</span>
                </div>
                <span className="text-[#CCCCCC]">|</span>
                <button
                  type="button"
                  onClick={toggleAllTimelines}
                  className={`h-6 px-2 rounded-[2px] border text-[11px] font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs ${
                    isAllTimelinesOpen
                      ? 'bg-[#006494]/10 text-[#006494] border-[#006494]/30'
                      : 'bg-white text-[#44474C] border-[#CCCCCC] hover:bg-[#F3F3F4]'
                  }`}
                  title={isAllTimelinesOpen ? '点击一键全部收起四阶段工况抽屉' : '点击一键全部展开四阶段工况抽屉'}
                >
                  <Activity className="w-3 h-3 text-[#006494]" />
                  <span>工况抽屉: {isAllTimelinesOpen ? '全展开' : '全关闭'}</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* VIEW 1: 4-COLUMN MULTI-CHANNEL DISPATCH MATRIX                            */}
        {/* ========================================================================= */}
        {desktopViewMode === 'matrix' ? (
          <section className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
              {/* COLUMN 1: 堂食外摆 */}
              {(channelFilter === 'all' || channelFilter === 'dine_in') && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between px-2 py-1 bg-white border border-[#CCCCCC]/70 rounded-[2px] shadow-2xs">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-[#1A1C1C]">
                      <UtensilsCrossed className="w-3.5 h-3.5 text-[#006494]" />
                      <span>堂食外摆流水</span>
                    </div>
                    <span className="text-[11px] font-bold px-1.5 py-0.2 bg-[#CBE6FF] text-[#001E30] rounded">
                      {dineInCards.length} 单
                    </span>
                  </div>

                  {dineInCards.length > 0
                    ? dineInCards.map((c) => renderCard(c, false))
                    : renderEmptyColumn('堂食外摆', <UtensilsCrossed className="w-8 h-8" />)}
                </div>
              )}

              {/* COLUMN 2: 外卖专送 */}
              {(channelFilter === 'all' || channelFilter === 'delivery') && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between px-2 py-1 bg-white border border-[#CCCCCC]/70 rounded-[2px] shadow-2xs">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-[#1A1C1C]">
                      <Bike className="w-3.5 h-3.5 text-[#006494]" />
                      <span>外送专送流水</span>
                    </div>
                    <span className="text-[11px] font-bold px-1.5 py-0.2 bg-[#CBE6FF] text-[#001E30] rounded">
                      {deliveryCards.length} 单
                    </span>
                  </div>

                  {deliveryCards.length > 0
                    ? deliveryCards.map((c) => renderCard(c, false))
                    : renderEmptyColumn('外卖专送', <Bike className="w-8 h-8" />)}
                </div>
              )}

              {/* COLUMN 3: 告警加急催起 */}
              {(channelFilter === 'all' || channelFilter === 'expedited') && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between px-2 py-1 bg-[#FFDAD6] border border-[#BA1A1A]/40 rounded-[2px] shadow-2xs text-[#93000A]">
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#BA1A1A] animate-pulse" />
                      <span>加急催单 · SLA警报</span>
                    </div>
                    <span className="text-[11px] font-bold px-1.5 py-0.2 bg-[#BA1A1A] text-white rounded">
                      {urgentCards.length} 单
                    </span>
                  </div>

                  {urgentCards.length > 0
                    ? urgentCards.map((c) => renderCard(c, true))
                    : renderEmptyColumn('加急催单', <AlertTriangle className="w-8 h-8 text-[#BA1A1A]" />)}
                </div>
              )}

              {/* COLUMN 4: 到车自提 & 智能恒温柜 */}
              {(channelFilter === 'all' || channelFilter === 'pickup') && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between px-2 py-1 bg-white border border-[#CCCCCC]/70 rounded-[2px] shadow-2xs">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-[#1A1C1C]">
                      <Boxes className="w-3.5 h-3.5 text-[#006494]" />
                      <span>自提 & 恒温柜</span>
                    </div>
                    <span className="text-[11px] font-bold px-1.5 py-0.2 bg-[#EEEEEE] text-[#44474C] rounded">
                      {pickupCards.length} 单
                    </span>
                  </div>

                  {pickupCards.length > 0
                    ? pickupCards.map((c) => renderCard(c, false))
                    : renderEmptyColumn('到车自提', <Boxes className="w-8 h-8" />)}
                </div>
              )}
            </div>
          </section>
        ) : (
          /* ========================================================================= */
          /* VIEW 2: BATCH DISH AGGREGATE VIEW (菜品跨单汇总一锅出)                      */
          /* ========================================================================= */
          <section className="p-6">
            <div className="bg-white border border-[#CCCCCC]/80 rounded-[3px] shadow-2xs p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-[#CCCCCC] pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#006494]" />
                  <div>
                    <h2 className="text-sm font-bold text-[#1A1C1C]">后厨全量在制菜品跨单汇总 (一锅出)</h2>
                    <p className="text-[11px] text-[#74777D]">
                      支持一锅同出、批量翻炒、多单统一划线、就地作废与全域广播传菜
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#006494] px-2.5 py-1 bg-[#CBE6FF] rounded">
                  共计待做 {Object.keys(dishAggregates).length} 种菜品
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {Object.entries(dishAggregates).map(([dishName, data]) => {
                  const pendingQty = data.totalQty - data.completedQty;
                  return (
                    <div
                      key={dishName}
                      className="border border-[#CCCCCC] rounded-[3px] p-3 flex flex-col justify-between bg-[#F9F9F9] hover:bg-white transition-all shadow-2xs"
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-start justify-between">
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-[#1A1C1C]">{dishName}</span>
                            <span className="text-[11px] text-[#74777D] mt-0.5">
                              归属档口:{' '}
                              {data.station === 'grill'
                                ? '平扒炉'
                                : data.station === 'fryer'
                                ? '高压炸炉'
                                : data.station === 'bar'
                                ? '水吧冷萃'
                                : '恒温柜'}
                            </span>
                          </div>
                          <div className="flex items-baseline gap-1 bg-[#1A1C1C] text-white px-2.5 py-1 rounded-[2px] font-bold">
                            <span className="text-lg">{pendingQty}</span>
                            <span className="text-xs opacity-75">/ {data.totalQty}份</span>
                          </div>
                        </div>

                        {data.specialNotes.length > 0 && (
                          <div className="p-1.5 bg-[#FFF8E1] border border-[#FFE082] rounded-[2px] text-[11px] text-[#D97706] font-medium">
                            ★ 定制偏好: {data.specialNotes.join(' · ')}
                          </div>
                        )}

                        {/* 分布工单列表，支持每单就地作废 */}
                        <div className="flex flex-col gap-1 text-[11px] pt-1">
                          {data.ticketDetails.map((td, tIdx) => (
                            <div
                              key={tIdx}
                              className={`px-2 py-1 rounded-[2px] border flex items-center justify-between ${
                                td.isCompleted
                                  ? 'bg-[#E2E2DF] text-[#74777D]'
                                  : 'bg-white text-[#1A1C1C] border-[#CCCCCC]'
                              }`}
                            >
                              <span className={`font-bold tracking-tight ${td.isCompleted ? 'line-through' : ''}`}>
                                {td.ticketNo} · {td.title} (x{td.qty}份)
                              </span>
                              {!td.isCompleted && onDiscardCard && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const fullCard = cards.find(c => c.id === td.cardId);
                                    if (fullCard) onDiscardCard(fullCard);
                                  }}
                                  className="text-[#BA1A1A] hover:bg-[#FFDAD6] p-1 rounded cursor-pointer"
                                  title="就地作废此单"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 出锅划菜 + 出锅并广播 双按键 */}
                      <div className="mt-4 pt-2 border-t border-[#E2E2DF] flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (onBatchFinishDish) {
                              onBatchFinishDish(dishName, false);
                            }
                          }}
                          className="h-8 px-3 flex-1 bg-[#1A1C1C] hover:bg-black text-white text-xs font-bold rounded-[2px] flex items-center justify-center gap-1 cursor-pointer transition shadow-2xs"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>一键出锅划菜</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (onBatchFinishDish) {
                              onBatchFinishDish(dishName, true);
                            }
                          }}
                          className="h-8 px-3 bg-white hover:bg-neutral-50 text-[#1A1C1C] border border-[#CCCCCC] text-xs font-bold rounded-[2px] flex items-center justify-center gap-1 cursor-pointer transition shadow-2xs"
                          title="出锅划菜并外放真人语音播报"
                        >
                          <Megaphone className="w-3.5 h-3.5 text-[#006494]" />
                          <span>出锅并广播</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* BOTTOM HARDWARE TELEMETRY & AUDIT STREAM DRAWER                           */}
        {/* ========================================================================= */}
        <section className="mx-6 mb-6 bg-white border border-[#CCCCCC]/70 rounded-[3px] shadow-2xs p-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-bold text-[#1A1C1C]">
              <span className="w-2 h-2 rounded-full bg-[#006494] animate-pulse" />
              <span>CAN_BUS J1939 厨房智能硬件与遥测微控</span>
            </div>
            <span className="text-[#CCCCCC]">|</span>
            <div className="flex items-center gap-2 text-[#44474C]">
              <span>
                01# 平扒炉: <strong className="text-[#1A1C1C]">234.5°C</strong> (PID稳态)
              </span>
              <span>·</span>
              <span>
                02# 高压炸炉: <strong className="text-[#1A1C1C]">179.8°C</strong> (定时 02:10)
              </span>
              <span>·</span>
              <span>
                02号智能恒温柜: <strong className="text-[#1A1C1C]">62.5°C</strong> (格口 B-04 正常)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[#74777D] text-[11px] font-semibold">
            <span>协议: CAN2.0B / 500Kbps</span>
            <span className="text-[#006494] font-bold">TX 1084 / RX 2190 OK</span>
          </div>
        </section>
      </main>
    </div>
  );
};
