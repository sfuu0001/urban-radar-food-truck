import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  Flag,
  Zap,
  Lock,
  Boxes,
  Activity,
  User,
  Wifi,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Layers,
  Sparkles,
  ListOrdered,
  CheckSquare2,
  Timer,
  Check,
  Search,
  X,
  Radio,
  Cpu,
  Gauge,
  Moon,
  CloudOff,
  Receipt,
  BellRing,
  Store,
  Coffee,
  ArrowUpDown,
  Unlock,
  MessageSquare,
  Network,
  Camera,
  Trash2,
  Megaphone,
  ChefHat
} from 'lucide-react';
import { KdsTicket } from '../../types';
import { MerchantKDSDesktopView } from './MerchantKDSDesktopView';
import { MobileCameraScannerModal } from '../common/MobileCameraScannerModal';
import { UnifiedOmniChatModal } from '../chat/UnifiedOmniChatModal';
import { AccountAuditDrawer } from './AccountAuditDrawer';
import { businessTransactionEngine } from '../../utils/businessTransactionEngine';
import { voiceAlerts, unlockAudioContext } from '../../utils/voiceAlertEngine';
import {
  KdsCardData,
  KdsCardItem,
  syncTicketsToCards,
  calculateKdsTelemetry,
  cardToKitchenTicket
} from '../../utils/kdsDataAdapter';
import { printLayoutViaBridge } from '../../utils/localPrintBridge';
import { buildKitchenTicketLayoutLines } from '../../utils/escpos';

interface MerchantKDSV2Props {
  tickets?: KdsTicket[];
  onFinishTicket?: (ticketId: string) => void;
  onDeleteTicket?: (ticketId: string, deleteAssociatedOrder: boolean, reason?: string) => void;
  onToggleItemComplete?: (ticketId: string, itemId: string) => void;
  onBatchFinishDish?: (dishName: string) => void;
  showToast: (msg: string) => void;
  onSwitchToV1?: () => void;
}

export const MerchantKDSV2: React.FC<MerchantKDSV2Props> = ({
  tickets = [],
  onFinishTicket,
  onDeleteTicket,
  onToggleItemComplete,
  onBatchFinishDish,
  showToast,
  onSwitchToV1
}) => {
  // 1. 计时器秒级自增
  const [nowSec, setNowSec] = useState<number>(0);
  useEffect(() => {
    const t = setInterval(() => {
      setNowSec((s) => s + 1);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // 2. 卡片数据驱动（真实 tickets 实时映射与同步，含清洗与四节点推导）
  const [cards, setCards] = useState<KdsCardData[]>(() => syncTicketsToCards(tickets, 0));

  // 监听外部 tickets 实时变动
  useEffect(() => {
    if (tickets && tickets.length > 0) {
      setCards(syncTicketsToCards(tickets, nowSec));
    }
  }, [tickets]);

  // 3. 渠道与场景流水过滤
  const [channelFilter, setChannelFilter] = useState<'all' | 'dine_in' | 'delivery' | 'expedited' | 'pickup'>('all');

  // 4. 移动端穿透式 Portal 渠道选择下拉菜单
  const [isMobileChannelOpen, setIsMobileChannelOpen] = useState(false);
  const [channelDropdownCoords, setChannelDropdownCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    if (!isMobileChannelOpen) return;
    const handleDismiss = () => setIsMobileChannelOpen(false);
    window.addEventListener('scroll', handleDismiss, { passive: true });
    window.addEventListener('resize', handleDismiss);
    return () => {
      window.removeEventListener('scroll', handleDismiss);
      window.removeEventListener('resize', handleDismiss);
    };
  }, [isMobileChannelOpen]);

  // 5. 抽屉展开状态管理与统计
  const [expandedDrawers, setExpandedDrawers] = useState<Record<string, boolean>>({});
  const [isAllTimelinesOpen, setIsAllTimelinesOpen] = useState(true);

  // 计算单个单品抽屉是否处于展开状态
  const isItemDrawerOpen = useCallback(
    (itemId: string) => {
      return expandedDrawers[itemId] !== undefined ? expandedDrawers[itemId] : isAllTimelinesOpen;
    },
    [expandedDrawers, isAllTimelinesOpen]
  );

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

  // 6. CAN_BUS 硬件抽屉折叠状态
  const [isHardwareDrawerOpen, setIsHardwareDrawerOpen] = useState(true);

  // 7. 底部 KDS 内部导航模式
  const [bottomTab, setBottomTab] = useState<'stream' | 'checklist' | 'urgent' | 'stations'>('stream');

  // 8. 语音自动广播持久化配置
  const [autoVoiceBroadcast, setAutoVoiceBroadcast] = useState<boolean>(() => {
    try {
      return localStorage.getItem('obsidian_kds_auto_voice') !== 'false';
    } catch {
      return true;
    }
  });

  const toggleAutoVoice = () => {
    const next = !autoVoiceBroadcast;
    setAutoVoiceBroadcast(next);
    try {
      localStorage.setItem('obsidian_kds_auto_voice', String(next));
    } catch {
      // ignore
    }
    showToast(next ? '已开启 KDS 出餐自动语音广播' : '已关闭 KDS 出餐自动语音广播');
  };

  // 9. 在线协同联络室
  const [activeChatTicketNo, setActiveChatTicketNo] = useState<string | null>(null);

  // 10. 作废/删除工单确认弹窗
  const [deleteTargetTicket, setDeleteTargetTicket] = useState<KdsCardData | null>(null);
  const [deleteReason, setDeleteReason] = useState('顾客撤单/退款作废');
  const [customDeleteReason, setCustomDeleteReason] = useState('');
  const [alsoDeleteOrder, setAlsoDeleteOrder] = useState(true);

  // 11. 相机扫码划单模态
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState<boolean>(false);

  // 触控轻微震动辅助
  const triggerHaptic = useCallback(() => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      try {
        window.navigator.vibrate(18);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const formatElapsed = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // 切换单个菜品四阶段工况节点下拉式抽屉
  const toggleItemDrawer = (itemId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    triggerHaptic();
    setExpandedDrawers((prev) => {
      const current = prev[itemId] !== undefined ? prev[itemId] : isAllTimelinesOpen;
      return {
        ...prev,
        [itemId]: !current
      };
    });
  };

  // 全局总控开关：一键展开/一键收起所有工况节点抽屉
  const toggleAllTimelines = (forceState?: boolean) => {
    triggerHaptic();
    const nextState = typeof forceState === 'boolean' ? forceState : !isAllTimelinesOpen;
    setIsAllTimelinesOpen(nextState);
    const updated: Record<string, boolean> = {};
    cards.forEach((c) => {
      c.items.forEach((it) => {
        updated[it.id] = nextState;
      });
    });
    setExpandedDrawers(updated);
    showToast(nextState ? '已一键展开所有单品四阶段工况节点抽屉' : '已一键收起所有工况节点抽屉');
  };

  // 划菜切换完成状态
  const handleToggleItemStrike = (cardId: string, itemId: string) => {
    triggerHaptic();
    let targetDishName = '';
    let targetCompleted = false;

    // 先从当前 cards 中预查目标单品信息，避免在 state updater 回调中直接调用外部 setState
    const card = cards.find((c) => c.id === cardId);
    const item = card?.items.find((it) => it.id === itemId);
    if (item) {
      targetDishName = item.name;
      targetCompleted = !item.isCompleted;
    }

    setCards((prev) =>
      prev.map((c) => {
        if (c.id !== cardId) return c;
        const nextItems = c.items.map((it) => {
          if (it.id !== itemId) return it;
          const nextCompleted = !it.isCompleted;
          return {
            ...it,
            isCompleted: nextCompleted,
            statusText: nextCompleted ? '已出餐' : '制作中'
          };
        });
        return {
          ...c,
          items: nextItems
        };
      })
    );

    if (targetDishName) {
      showToast(targetCompleted ? `已划菜完成：${targetDishName}` : `已取消完成：${targetDishName}`);
    }

    // 联动事务：同步至桌台出餐看板
    businessTransactionEngine.executeKdsDishStatusSync({
      ticketId: cardId,
      dishName: targetDishName,
      isAllCompleted: false,
      operatorName: 'KDS V2 主厨'
    });

    if (onToggleItemComplete) {
      onToggleItemComplete(cardId, itemId);
    }
  };

  // 整单出餐：出餐并叫号 (forceVoice=true) vs 仅出餐 (forceVoice=false)
  const handleCompleteWholeCard = async (card: KdsCardData, forceVoice = false) => {
    triggerHaptic();

    // 1. 同步桌台状态引擎
    businessTransactionEngine.executeKdsDishStatusSync({
      ticketId: card.id,
      isAllCompleted: true,
      operatorName: 'KDS V2 主厨'
    });

    // 2. 从本地队列移除
    setCards((prev) => prev.filter((c) => c.id !== card.id));

    // 3. 执行系统级出餐推进回调
    if (onFinishTicket) {
      onFinishTicket(card.id);
    }

    // 4. 外放语音广播叫号分流
    const shouldBroadcast = forceVoice || (forceVoice !== false && autoVoiceBroadcast);
    if (shouldBroadcast) {
      try {
        await unlockAudioContext();
        if (card.channel === 'pickup') {
          const pCode = card.pickupCode || card.ticketNo.replace(/^#/, '');
          voiceAlerts.callingGuest(pCode, '餐车前台自提处');
        } else if (card.channel === 'delivery') {
          voiceAlerts.callRiderForOrder(card.ticketNo, '专线/美团骑手');
        } else {
          voiceAlerts.kdsReadyAndCall(card.ticketNo, 'dine_in', card.title);
        }
      } catch (err) {
        console.warn('[KDS V2] 语音广播异常:', err);
      }
    }

    showToast(`工单 ${card.ticketNo} (${card.title}) 已出餐${shouldBroadcast ? '，已广播叫号' : ' (静音出餐)'}`);
  };

  // 手动独立语音呼叫
  const handleManualCall = async (card: KdsCardData) => {
    try {
      await unlockAudioContext();
      if (card.channel === 'pickup') {
        const pCode = card.pickupCode || card.ticketNo.replace(/^#/, '');
        voiceAlerts.callingGuest(pCode, '餐车前台自提处');
      } else if (card.channel === 'delivery') {
        voiceAlerts.callRiderForOrder(card.ticketNo, '专线/美团骑手');
      } else {
        voiceAlerts.kdsReadyAndCall(card.ticketNo, 'dine_in', card.title);
      }
      showToast(`已向外放广播呼叫: ${card.ticketNo} (${card.title})`);
    } catch (err) {
      console.warn('[KDS V2] 手动叫号异常:', err);
      showToast(`广播呼叫失败，请检查音响连接`);
    }
  };

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

  // 确认作废删除工单 (联动订单中心与专属 cancel 音效)
  const handleConfirmDeleteTicket = () => {
    if (!deleteTargetTicket) return;
    const finalReason = deleteReason === 'other' ? (customDeleteReason.trim() || '后厨工单作废') : deleteReason;
    if (onDeleteTicket) {
      onDeleteTicket(deleteTargetTicket.id, alsoDeleteOrder, finalReason);
    } else if (onFinishTicket) {
      onFinishTicket(deleteTargetTicket.id);
    }
    setCards((prev) => prev.filter((c) => c.id !== deleteTargetTicket.id));
    voiceAlerts.speakText(`后厨工单 ${deleteTargetTicket.ticketNo} 已作废删除！`, { chimeType: 'cancel' });
    showToast(`工单 ${deleteTargetTicket.ticketNo} 已从后厨制作队列删除！`);
    setDeleteTargetTicket(null);
    setCustomDeleteReason('');
  };

  // 批量翻炒一锅出划线 (支持是否外放全域出锅广播)
  const handleBatchFinishDish = (dishName: string, broadcast = false) => {
    triggerHaptic();
    if (onBatchFinishDish) {
      onBatchFinishDish(dishName);
    }
    const matchedCount = cards.reduce((sum, c) => {
      const match = c.items.find(it => it.name === dishName && !it.isCompleted);
      return sum + (match ? match.quantity : 0);
    }, 0);

    setCards((prev) =>
      prev.map((c) => ({
        ...c,
        items: c.items.map((it) =>
          it.name === dishName ? { ...it, isCompleted: true, statusText: '已出餐' } : it
        )
      }))
    );

    if (broadcast) {
      voiceAlerts.speakText(`叮咚！后厨【${dishName}】共 ${matchedCount} 份现制出锅，请前台与传菜员注意分单上菜取餐！`, { chimeType: 'order' });
      showToast(`已出锅并广播通知传菜与前台：【${dishName}】共 ${matchedCount} 份！`);
    } else {
      showToast(`已批量出锅：全单「${dishName}」划线完成！`);
    }
  };

  // 划单扫码成功处理逻辑
  const handleKdsScanSuccess = (scannedCode: string) => {
    const code = scannedCode.trim().toUpperCase();
    const cleanCode = code.replace(/^(#|PICKUP:|PK-|ORDER-)/i, '');

    // 1. 优先匹配卡片单号
    const targetCard = cards.find(
      (c) =>
        c.ticketNo.toUpperCase() === code ||
        c.ticketNo.toUpperCase().replace(/^#/, '') === cleanCode ||
        c.id.toUpperCase() === code ||
        code.includes(c.ticketNo.toUpperCase().replace(/^#/, ''))
    );

    if (targetCard) {
      handleCompleteWholeCard(targetCard, true);
      showToast(`[KDS 扫码划单] 订单 ${targetCard.ticketNo} (${targetCard.title}) 核验成功，已出餐！`);
      return;
    }

    // 2. 匹配在制菜品单品
    for (const c of cards) {
      const matchedItem = c.items.find(
        (it) => it.name.toUpperCase().includes(cleanCode) || it.id.toUpperCase() === code
      );
      if (matchedItem) {
        handleToggleItemStrike(c.id, matchedItem.id);
        showToast(`[KDS 扫码划菜] ${c.ticketNo} 单品「${matchedItem.name}」已划菜完成`);
        return;
      }
    }

    showToast(`[KDS 扫码未匹配] 编号 ${scannedCode} 未在当前在制流水列表中`);
  };

  // 动态统计指标
  const telemetry = useMemo(() => calculateKdsTelemetry(cards), [cards]);

  // 渠道配置
  const channelOptions = [
    { key: 'all', label: '全部待做', count: cards.length, icon: Receipt },
    { key: 'dine_in', label: '堂食外摆', count: cards.filter(t => t.channel === 'dine_in').length, icon: UtensilsCrossed },
    { key: 'pickup', label: '到车自提', count: cards.filter(t => t.channel === 'pickup').length, icon: ShoppingBag },
    { key: 'delivery', label: '外卖专送', count: cards.filter(t => t.channel === 'delivery').length, icon: Bike },
    { key: 'expedited', label: '告警催单', count: cards.filter(t => t.slaTier === 'urged' || t.slaTier === 'overtime').length, icon: BellRing }
  ] as const;

  const currentChannel = channelOptions.find(o => o.key === channelFilter) || channelOptions[0];

  // 过滤展示卡片列表
  const filteredCards = useMemo(() => {
    return cards.filter((c) => {
      if (channelFilter === 'all') return true;
      if (channelFilter === 'dine_in') return c.channel === 'dine_in';
      if (channelFilter === 'delivery') return c.channel === 'delivery';
      if (channelFilter === 'pickup') return c.channel === 'pickup';
      if (channelFilter === 'expedited') return c.slaTier === 'urged' || c.slaTier === 'overtime' || c.channel === 'expedited';
      return true;
    });
  }, [cards, channelFilter]);

  // 菜品汇总统计
  const dishAggregates = useMemo(() => {
    const map: Record<
      string,
      {
        totalQty: number;
        completedQty: number;
        ticketDetails: { ticketNo: string; title: string; qty: number; cardId: string; isCompleted: boolean }[];
        specialNotes: string[];
      }
    > = {};

    cards.forEach((c) => {
      c.items.forEach((it) => {
        if (!map[it.name]) {
          map[it.name] = {
            totalQty: 0,
            completedQty: 0,
            ticketDetails: [],
            specialNotes: []
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
          isCompleted: it.isCompleted
        });
        if (it.spec && !map[it.name].specialNotes.includes(it.spec)) {
          map[it.name].specialNotes.push(it.spec);
        }
      });
    });

    return map;
  }, [cards]);

  return (
    <>
      {/* ========================================================================= */}
      {/* 📱 手机端专属界面 (< 768px)                                                */}
      {/* ========================================================================= */}
      <div
        style={{
          backgroundColor: '#F9F9F9',
          color: '#1A1C1C',
          fontFamily: '"Space Grotesk", "Hanken Grotesk", sans-serif'
        }}
        className="block md:hidden min-h-full w-full antialiased flex flex-col select-none selection:bg-[#cbe6ff] selection:text-[#001e30] pb-24"
      >
        {/* 1. 顶部工控标头与系统状态 */}
        <header className="sticky top-0 inset-x-0 z-30 bg-[#F9F9F9]/90 backdrop-blur-xl border-b border-[#E2E2DF] shadow-[0_1px_8px_rgba(0,0,0,0.03)] px-3 sm:px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-[3px] flex items-center justify-center bg-[#0B1D2D] text-white shadow-2xs">
              <Microwave className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xs tracking-wider uppercase text-[#1A1C1C] font-bold">
                  URBAN RADAR
                </span>
                <span className="px-1.5 py-0.5 rounded-[2px] bg-[#F3F3F4] text-[#006494] text-[9.5px] font-bold uppercase tracking-tight">
                  KDS·LN01
                </span>
                <span className="px-1.5 py-0.5 rounded-full bg-[#E8F3FA] text-[#006494] text-[9px] font-bold">
                  V2 专属副本
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-[#1A1C1C] tracking-tight leading-none mt-0.5">
                Live Orders
              </h1>
            </div>
          </div>

          {/* 右侧：相机扫单 + 语音开关 + 切回原版 */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsCameraScannerOpen(true)}
              className="h-7 px-2 sm:px-2.5 rounded-[3px] bg-[#006494] hover:bg-[#004f75] active:scale-95 text-white text-[10.5px] sm:text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
              title="手机相机扫码划菜/整单出餐"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>扫码划菜</span>
            </button>

            <button
              type="button"
              onClick={toggleAutoVoice}
              className={`h-7 px-2 rounded-[3px] border text-[10.5px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs ${
                autoVoiceBroadcast
                  ? 'bg-white text-[#006494] border-[#006494]/40'
                  : 'bg-white text-[#74777D] border-[#CCCCCC]'
              }`}
              title="出餐自动语音广播"
            >
              <Megaphone className="w-3 h-3" />
            </button>

            {onSwitchToV1 && (
              <button
                type="button"
                onClick={onSwitchToV1}
                className="h-7 px-2 rounded-full bg-white hover:bg-neutral-50 text-neutral-600 border border-neutral-300 text-[10.5px] font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                title="切换至原版 KDS"
              >
                <Layers className="w-3 h-3 text-neutral-500" />
                <span className="hidden sm:inline">原版</span>
              </button>
            )}
          </div>
        </header>

        {/* 主流容器 */}
        <main className="flex-1 w-full max-w-[1560px] mx-auto p-2.5 sm:p-4 flex flex-col gap-3">
          {/* 2. 餐车站位与车载硬件遥测条 */}
          <div className="bg-white p-2.5 rounded-[3px] border border-[#CCCCCC]/70 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#006494] animate-ping shrink-0" />
              <span className="font-bold text-xs sm:text-sm text-[#1A1C1C] truncate">
                01号·旗舰餐车
              </span>
              <span className="px-1.5 py-0.5 rounded-[2px] bg-[#F3F3F4] text-[#006494] text-[10px] font-bold uppercase shrink-0">
                营业中
              </span>
            </div>
            <div className="flex items-center gap-1 text-[#44474C] text-[11px] shrink-0 font-semibold">
              <Wifi className="w-3.5 h-3.5 text-[#006494]" />
              <span>RTK 99.98%</span>
            </div>
          </div>

          {/* 3. 4 宫格后厨关键指标带 */}
          <section className="grid grid-cols-4 gap-2">
            <div className="bg-white p-2 rounded-[3px] border border-[#CCCCCC]/70 shadow-2xs flex flex-col items-center justify-center">
              <span className="text-[10px] text-[#44474C] font-semibold">在制工单</span>
              <div className="flex items-baseline gap-0.5 mt-0.5">
                <span className="text-lg sm:text-xl font-bold text-[#1A1C1C] leading-none">
                  {telemetry.totalTickets}
                </span>
                <span className="text-[9.5px] text-[#44474C]">单</span>
              </div>
            </div>

            <div className="bg-white p-2 rounded-[3px] border border-[#CCCCCC]/70 shadow-2xs flex flex-col items-center justify-center">
              <span className="text-[10px] text-[#44474C] font-semibold">待制菜品</span>
              <div className="flex items-baseline gap-0.5 mt-0.5">
                <span className="text-lg sm:text-xl font-bold text-[#006494] leading-none">
                  {telemetry.pendingItemsCount}
                </span>
                <span className="text-[9.5px] text-[#006494]">份</span>
              </div>
            </div>

            <div className="bg-white p-2 rounded-[3px] border border-[#CCCCCC]/70 shadow-2xs flex flex-col items-center justify-center">
              <span className="text-[10px] text-[#44474C] font-semibold">出餐均时</span>
              <div className="flex items-baseline gap-0.5 mt-0.5">
                <span className="text-lg sm:text-xl font-bold text-[#1A1C1C] leading-none">
                  {telemetry.avgElapsedMins}
                </span>
                <span className="text-[9.5px] text-[#44474C]">m</span>
              </div>
            </div>

            <div className="bg-gradient-to-b from-[#FFDAD6]/30 to-white p-2 rounded-[3px] border border-[#BA1A1A]/40 shadow-2xs flex flex-col items-center justify-center">
              <span className="text-[10px] text-[#BA1A1A] font-bold">催单红标</span>
              <div className="flex items-baseline gap-0.5 mt-0.5">
                <span className="text-lg sm:text-xl font-bold text-[#BA1A1A] leading-none">
                  {telemetry.urgentCount < 10 ? `0${telemetry.urgentCount}` : telemetry.urgentCount}
                </span>
                <span className="text-[9.5px] text-[#BA1A1A] font-semibold">单</span>
              </div>
            </div>
          </section>

          {/* 4. 移动端穿透式 Portal 渠道选择与单排控制条 */}
          <div className="flex flex-col gap-1.5 bg-white p-1 rounded-[3px] border border-[#CCCCCC]/70 shadow-2xs">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 flex-nowrap">
              {/* 渠道选择穿透按钮 */}
              <button
                type="button"
                id="kds-v2-channel-trigger"
                onClick={(e) => {
                  if (isMobileChannelOpen) {
                    setIsMobileChannelOpen(false);
                  } else {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setChannelDropdownCoords({
                      top: rect.bottom + 6,
                      left: Math.max(8, Math.min(rect.left, window.innerWidth - 210))
                    });
                    setIsMobileChannelOpen(true);
                  }
                }}
                className="h-7 px-2.5 bg-white hover:bg-neutral-50 text-[#1A1C1C] border border-[#CCCCCC] rounded-full text-[11px] font-bold flex items-center gap-1 shrink-0 shadow-2xs active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <span className="text-[#74777D] font-normal">渠道:</span>
                <span className="whitespace-nowrap">{currentChannel.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#F3F3F4] text-[#006494] font-bold">
                  {currentChannel.count}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-[#74777D] transition-transform ${isMobileChannelOpen ? 'rotate-180 text-[#1A1C1C]' : ''}`} />
              </button>

              {/* 三段 SLA 指示徽标 */}
              <div className="flex items-center gap-1 shrink-0 ml-auto text-[10.5px]">
                <span className="flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-bold whitespace-nowrap shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>&lt;8m 顺畅</span>
                </span>
                <span className="flex items-center gap-1 text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 font-bold whitespace-nowrap shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span>8~15m 高峰</span>
                </span>
                <span className="flex items-center gap-1 text-rose-800 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 font-bold whitespace-nowrap shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse shrink-0" />
                  <span>&gt;15m 超时</span>
                </span>
              </div>
            </div>

            {/* 四阶段工况节点抽屉总控开关 */}
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-[3px] bg-[#F3F3F4] border-t border-[#CCCCCC] select-none shadow-2xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-5 h-5 rounded-full bg-[#006494]/10 flex items-center justify-center text-[#006494] shrink-0">
                  <Activity className="w-3 h-3" />
                </div>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[11px] font-bold text-[#1A1C1C] truncate">四阶段工况抽屉总控</span>
                  <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-white border border-[#CCCCCC] text-[#006494] font-bold shrink-0">
                    {openedDrawersCount}/{totalDishItemsCount} 展开
                  </span>
                </div>
              </div>

              {/* 物理滑块开关与极简文本 */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  role="switch"
                  aria-checked={isAllTimelinesOpen}
                  onClick={() => toggleAllTimelines()}
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
              </div>
            </div>
          </div>

          {/* 5. 视图切换内容展示 */}
          {bottomTab === 'checklist' ? (
            /* 备料/菜品一锅出清单 (含就地作废与广播) */
            <section className="flex flex-col gap-2.5">
              <div className="bg-white p-3 rounded-[3px] border border-[#CCCCCC]/80 shadow-2xs flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs text-[#1A1C1C]">
                  <Layers className="w-4 h-4 text-[#006494]" />
                  <span>后厨菜品汇总 (一锅出)</span>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 bg-[#CBE6FF] text-[#001E30] rounded">
                  共计 {Object.keys(dishAggregates).length} 种菜品
                </span>
              </div>

              {Object.entries(dishAggregates).map(([dishName, data]) => {
                const pendingQty = data.totalQty - data.completedQty;
                return (
                  <div
                    key={dishName}
                    className="bg-white rounded-[3px] border border-[#CCCCCC]/80 p-3 shadow-2xs flex flex-col gap-2.5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-sm text-[#1A1C1C]">{dishName}</h3>
                        {data.specialNotes.length > 0 && (
                          <span className="text-[11px] text-[#D97706] font-medium block mt-0.5">
                            ★ 定制偏好: {data.specialNotes.join(' · ')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1 bg-[#1A1C1C] text-white px-2.5 py-0.5 rounded-[2px] font-bold text-xs">
                        <span className="text-base">{pendingQty}</span>
                        <span className="text-[10px] opacity-75">/ {data.totalQty}份</span>
                      </div>
                    </div>

                    {/* 分布工单与就地作废按键 */}
                    <div className="flex flex-col gap-1 text-[11px]">
                      {data.ticketDetails.map((td, idx) => (
                        <div
                          key={idx}
                          className={`px-2 py-1 rounded-[2px] border flex items-center justify-between ${
                            td.isCompleted
                              ? 'bg-[#E2E2DF] text-[#74777D]'
                              : 'bg-[#F3F3F4] text-[#1A1C1C] border-[#CCCCCC]'
                          }`}
                        >
                          <span className={`font-mono font-bold ${td.isCompleted ? 'line-through' : ''}`}>
                            {td.ticketNo} · {td.title} (x{td.qty}份)
                          </span>
                          {!td.isCompleted && (
                            <button
                              type="button"
                              onClick={() => {
                                const fullCard = cards.find(c => c.id === td.cardId);
                                if (fullCard) setDeleteTargetTicket(fullCard);
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

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleBatchFinishDish(dishName, false)}
                        className="h-8 flex-1 bg-[#1A1C1C] hover:bg-black text-white text-xs font-bold rounded-[2px] flex items-center justify-center gap-1 cursor-pointer transition shadow-2xs"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>一键出锅划菜</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleBatchFinishDish(dishName, true)}
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
            </section>
          ) : (
            /* 订单卡片流 */
            <section className="flex flex-col gap-2.5" id="orderStream">
              {filteredCards.length === 0 ? (
                <div className="bg-white rounded-[3px] border border-dashed border-[#CCCCCC] p-8 flex flex-col items-center justify-center text-center text-[#74777D] gap-2">
                  <UtensilsCrossed className="w-8 h-8 opacity-40 text-[#74777D]" />
                  <span className="text-xs font-bold text-[#1A1C1C]">当前无匹配在制工单</span>
                  <span className="text-[11px] opacity-70">后厨工位已就绪 · 等待新单下发</span>
                </div>
              ) : (
                filteredCards.map((card) => {
                  const isUrgent = card.slaTier === 'urged';
                  const isOvertime = card.slaTier === 'overtime';
                  const isPeak = card.slaTier === 'peak';
                  const elapsedDisplay = formatElapsed(card.elapsedSeconds + nowSec);

                  const cardBorderColor = isUrgent
                    ? 'border-[#BA1A1A] ring-1 ring-[#BA1A1A]/40'
                    : isOvertime
                    ? 'border-[#BA1A1A]/80 shadow-rose-950/5'
                    : isPeak
                    ? 'border-[#D97706]/70'
                    : 'border-[#CCCCCC]/70';

                  return (
                    <div
                      key={card.id}
                      className={`bg-white rounded-[3px] border shadow-2xs overflow-hidden flex flex-col transition-all duration-200 ${cardBorderColor}`}
                    >
                      {/* 加急红线顶饰条 */}
                      {(isUrgent || isOvertime) && <div className="w-full h-1 bg-[#BA1A1A]" />}

                      {/* 卡片标头：单号 + 标题 + 联络/作废 + 时间 */}
                      <div
                        className={`p-2.5 flex items-center justify-between ${
                          isUrgent || isOvertime
                            ? 'bg-[#FFDAD6]/25 border-b border-[#BA1A1A]/20'
                            : isPeak
                            ? 'bg-[#FEF3C7]/40 border-b border-[#D97706]/20'
                            : 'bg-[#F3F3F4]/50 border-b border-[#E2E2DF]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`px-1.5 py-0.5 text-white font-bold text-xs rounded-[2px] shrink-0 ${
                              isUrgent || isOvertime
                                ? 'bg-[#BA1A1A]'
                                : card.channel === 'delivery'
                                ? 'bg-[#006494]'
                                : card.channel === 'pickup'
                                ? 'bg-[#74777D]'
                                : 'bg-[#000000]'
                            }`}
                          >
                            {card.ticketNo}
                          </span>
                          <span
                            className={`font-bold text-xs sm:text-[13px] truncate ${
                              isUrgent || isOvertime ? 'text-[#BA1A1A]' : 'text-[#1A1C1C]'
                            }`}
                          >
                            {card.title}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 text-[9.5px] font-bold rounded-[2px] shrink-0 ${
                              card.statusTagColor
                            }`}
                          >
                            {card.statusTag}
                          </span>
                        </div>

                        {/* 右侧动作与时间 */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* 三方聊天室 */}
                          <button
                            type="button"
                            onClick={() => setActiveChatTicketNo(card.ticketNo)}
                            title="打开协同联络室"
                            className="w-6 h-6 rounded-[2px] bg-white border border-[#CCCCCC] text-[#006494] hover:bg-[#F3F3F4] flex items-center justify-center cursor-pointer shadow-2xs"
                          >
                            <MessageSquare className="w-3 h-3" />
                          </button>

                          {/* 作废工单 */}
                          <button
                            type="button"
                            onClick={() => setDeleteTargetTicket(card)}
                            title="作废删除此工单"
                            className="w-6 h-6 rounded-[2px] bg-white border border-[#CCCCCC] text-[#BA1A1A] hover:bg-[#FFDAD6] flex items-center justify-center cursor-pointer shadow-2xs"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>

                          <div className="flex flex-col items-end shrink-0 leading-none">
                            <span className="text-[9.5px] text-[#44474C] opacity-80">{card.orderTime}</span>
                            <div
                              className={`flex items-center gap-1 text-xs font-bold mt-1 ${
                                isUrgent
                                  ? 'text-[#BA1A1A] animate-bounce'
                                  : isOvertime
                                  ? 'text-[#BA1A1A] animate-pulse'
                                  : isPeak
                                  ? 'text-[#D97706]'
                                  : 'text-[#006494]'
                              }`}
                            >
                              {isUrgent || isOvertime ? (
                                <AlertTriangle className="w-3 h-3" />
                              ) : (
                                <Timer className="w-3 h-3 animate-spin" />
                              )}
                              <span>{elapsedDisplay}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 骑手 Mini GPS 遥测带 (外卖场景专属) */}
                      {card.riderInfo && (
                        <div className="mx-2.5 mt-2 p-2 rounded-[2px] bg-[#F3F3F4] border border-[#CCCCCC]/60 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#3BB4FE] flex items-center justify-center text-[#004366]">
                              <Bike className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[11px] text-[#1A1C1C] font-bold">
                                {card.riderInfo.name}
                              </span>
                              <span className="text-[9.5px] text-[#44474C]">
                                距离餐车 {card.riderInfo.distance} · {card.riderInfo.eta}
                              </span>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-[2px] bg-white border border-[#CCCCCC] text-[10px] text-[#006494] font-bold">
                            {card.riderInfo.tag}
                          </span>
                        </div>
                      )}

                      {/* 自提恒温柜格口信息带 */}
                      {card.cabinInfo && (
                        <div className="mx-2.5 mt-2 p-2 rounded-[2px] bg-[#F3F3F4] border border-[#CCCCCC]/60 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Boxes className="w-4 h-4 text-[#006494]" />
                            <span className="text-[11px] text-[#1A1C1C] font-bold">
                              {card.cabinInfo.slot}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-[2px] bg-white border border-[#CCCCCC] text-[10px] text-[#006494] font-bold">
                            {card.cabinInfo.status}
                          </span>
                        </div>
                      )}

                      {/* 菜品单品列表 */}
                      <div className="p-2.5 flex flex-col gap-2">
                        {card.items.map((item) => {
                          const isExpanded = isItemDrawerOpen(item.id);

                          return (
                            <div
                              key={item.id}
                              className={`rounded-[3px] border transition-colors ${
                                item.isCompleted
                                  ? 'bg-[#F9F9F9] border-[#E2E2DF]'
                                  : isUrgent
                                  ? 'bg-white border-[#BA1A1A]/40'
                                  : 'bg-white border-[#CCCCCC]/60'
                              }`}
                            >
                              {/* 菜品主行：点击划菜 */}
                              <div
                                onClick={() => handleToggleItemStrike(card.id, item.id)}
                                className="p-2 flex items-center justify-between gap-2 cursor-pointer active:bg-neutral-50"
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleItemStrike(card.id, item.id);
                                    }}
                                    className="shrink-0 cursor-pointer"
                                  >
                                    {item.isCompleted ? (
                                      <CheckCircle2 className="w-4 h-4 text-[#006494]" />
                                    ) : (
                                      <Circle className="w-4 h-4 text-[#74777D]" />
                                    )}
                                  </button>

                                  <div className="flex flex-col min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <span
                                        className={`text-xs font-bold truncate ${
                                          item.isCompleted
                                            ? 'line-through text-[#74777D]'
                                            : isUrgent
                                            ? 'text-[#BA1A1A]'
                                            : 'text-[#1A1C1C]'
                                        }`}
                                      >
                                        {item.name}
                                      </span>
                                      <span className="text-xs font-bold text-[#1A1C1C] shrink-0">
                                        ×{item.quantity}
                                      </span>
                                    </div>
                                    {item.spec && (
                                      <span className="text-[10px] text-[#44474C] truncate">
                                        {item.spec}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span
                                    className={`px-1.5 py-0.5 rounded-[2px] text-[10px] font-bold ${
                                      item.isCompleted
                                        ? 'bg-[#006494]/10 text-[#006494]'
                                        : isUrgent
                                        ? 'bg-[#BA1A1A] text-white'
                                        : 'bg-[#F3F3F4] text-[#006494]'
                                    }`}
                                  >
                                    {item.statusText}
                                  </span>
                                </div>
                              </div>

                              {/* 四阶段工况节点 下拉式抽屉触发条 */}
                              {item.timeline?.steps && (
                                <div className="px-2 pb-1.5 pt-0.5 border-t border-neutral-100 flex items-center justify-between">
                                  <button
                                    type="button"
                                    onClick={(e) => toggleItemDrawer(item.id, e)}
                                    className={`h-6 px-2 rounded-[2px] border text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs ${
                                      isExpanded
                                        ? 'bg-[#006494]/10 text-[#006494] border-[#006494]/30'
                                        : 'bg-[#F3F3F4] text-[#44474C] border-[#CCCCCC]/60 hover:bg-[#EAEAEA]'
                                    }`}
                                  >
                                    <Activity className="w-3 h-3 text-[#006494]" />
                                    <span>四阶段工况节点</span>
                                    <ChevronDown
                                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                        isExpanded ? 'rotate-180 text-[#006494]' : 'text-[#74777D]'
                                      }`}
                                    />
                                  </button>
                                  <span className="text-[9.5px] text-[#74777D] font-semibold">
                                    总耗时: {item.timeline.totalDuration}
                                  </span>
                                </div>
                              )}

                              {/* 四阶段工况节点 下拉展开抽屉 */}
                              {isExpanded && item.timeline?.steps && (
                                <div className="px-2.5 pb-2 pt-1 border-t border-dashed border-[#006494]/30 text-[11px] flex flex-col gap-1.5 bg-[#F9F9F9] animate-in fade-in duration-150">
                                  <div className="flex items-center justify-between text-[10px] text-[#006494] font-bold border-b border-neutral-200/60 pb-1">
                                    <span className="flex items-center gap-1">
                                      <SlidersHorizontal className="w-3 h-3 text-[#006494]" />
                                      四阶段工况节点推导
                                    </span>
                                    <span className="text-[#44474C]">{item.timeline.totalDuration}</span>
                                  </div>
                                  {item.timeline.steps.map((st, sIdx) => (
                                    <div
                                      key={sIdx}
                                      className={`flex items-start justify-between text-[#44474C] text-[10.5px] py-0.5 ${
                                        st.isCurrent ? 'text-[#006494] font-bold bg-[#CBE6FF]/35 px-1 rounded-[2px]' : ''
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
                                            <span className="text-[9.5px] text-[#74777D]">{st.operator}</span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex flex-col items-end shrink-0">
                                        <span className="font-semibold leading-tight">{st.time}</span>
                                        {st.diff && <span className="text-[9.5px] text-[#006494]">{st.diff}</span>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* 底部动作工具栏：叫号 + 补打 + 出餐并叫号 + 仅出餐 */}
                      <div className="px-2.5 pb-2.5 pt-0.5 flex items-center justify-between gap-1.5">
                        {/* 叫号按钮 */}
                        <button
                          type="button"
                          onClick={() => handleManualCall(card)}
                          className="h-8 px-2 rounded-[2px] bg-[#F3F3F4] hover:bg-[#EAEAE8] text-[#1A1C1C] text-xs font-bold flex items-center justify-center gap-1 active:scale-95 cursor-pointer shadow-2xs"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-[#006494]" />
                          <span>叫号</span>
                        </button>

                        {/* 补打小票 */}
                        <button
                          type="button"
                          disabled={reprintingIds.has(card.id)}
                          onClick={() => handleReprintKitchen(card)}
                          className="h-8 px-2 rounded-[2px] bg-[#F3F3F4] hover:bg-[#EAEAE8] text-[#006494] text-xs font-bold flex items-center justify-center gap-1 active:scale-95 cursor-pointer shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>{reprintingIds.has(card.id) ? '补打中' : '补打'}</span>
                        </button>

                        {/* 出餐并叫号 */}
                        <button
                          type="button"
                          onClick={() => handleCompleteWholeCard(card, true)}
                          className={`h-8 flex-1 rounded-[2px] text-white text-xs font-bold flex items-center justify-center gap-1 shadow-2xs active:scale-95 cursor-pointer ${
                            isUrgent ? 'bg-[#BA1A1A] hover:bg-[#93000A]' : 'bg-[#1A1C1C] hover:bg-black'
                          }`}
                        >
                          <ChefHat className="w-3.5 h-3.5 text-[#F59E0B]" />
                          <span>出餐并叫号</span>
                        </button>

                        {/* 仅出餐 (静音出餐) */}
                        <button
                          type="button"
                          onClick={() => handleCompleteWholeCard(card, false)}
                          className="h-8 px-2.5 rounded-[2px] bg-white hover:bg-neutral-50 text-[#1A1C1C] border border-[#CCCCCC] text-xs font-bold flex items-center justify-center cursor-pointer shadow-2xs"
                          title="静音标记出餐完成 (不外放广播)"
                        >
                          <span>仅出餐</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </section>
          )}

          {/* 6. 底部 CAN_BUS 厨房智能硬件与遥测微控抽屉 */}
          <div className="bg-white rounded-[3px] border border-[#CCCCCC]/70 shadow-2xs overflow-hidden flex flex-col">
            <div
              onClick={() => setIsHardwareDrawerOpen((prev) => !prev)}
              className="p-2.5 flex items-center justify-between cursor-pointer bg-[#F3F3F4]/50 hover:bg-[#F3F3F4] transition-colors select-none"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#006494] shrink-0" />
                <span className="text-xs font-bold text-[#1A1C1C]">
                  CAN_BUS 厨房智能硬件与遥测微控
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-[#006494] font-bold">3台在线</span>
                <ChevronDown
                  className={`w-4 h-4 text-[#74777D] transition-transform duration-200 ${
                    isHardwareDrawerOpen ? 'rotate-180 text-[#006494]' : ''
                  }`}
                />
              </div>
            </div>

            {isHardwareDrawerOpen && (
              <div className="p-2.5 flex flex-col gap-2 border-t border-[#E2E2DF] animate-in fade-in duration-150">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-[2px] bg-[#F3F3F4] border border-[#CCCCCC]/50 flex flex-col gap-1">
                    <span className="text-[10px] text-[#44474C] font-semibold">01# 平扒炉温控</span>
                    <span className="text-base font-bold text-[#1A1C1C]">234.5°C (PID)</span>
                  </div>
                  <div className="p-2 rounded-[2px] bg-[#F3F3F4] border border-[#CCCCCC]/50 flex flex-col gap-1">
                    <span className="text-[10px] text-[#44474C] font-semibold">02# 高压炸炉</span>
                    <span className="text-base font-bold text-[#1A1C1C]">179.8°C (定时)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* 7. 手机端底部 4 栏导航 */}
        <nav className="fixed bottom-0 inset-x-0 z-40 bg-[#FFFFFF] border-t border-[#E2E2DF] shadow-[0_-2px_12px_rgba(0,0,0,0.06)] px-2 py-1 select-none">
          <div className="grid grid-cols-4 items-center h-12">
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setBottomTab('stream');
                setChannelFilter('all');
              }}
              className={`flex flex-col items-center justify-center h-full cursor-pointer ${
                bottomTab === 'stream' ? 'text-[#006494] font-bold' : 'text-[#74777D]'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span className="text-[10.5px] mt-0.5">实时流水</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setBottomTab('checklist');
              }}
              className={`flex flex-col items-center justify-center h-full cursor-pointer ${
                bottomTab === 'checklist' ? 'text-[#006494] font-bold' : 'text-[#74777D]'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span className="text-[10.5px] mt-0.5">菜品汇总</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setBottomTab('urgent');
                setChannelFilter('expedited');
              }}
              className={`flex flex-col items-center justify-center h-full cursor-pointer ${
                bottomTab === 'urgent' ? 'text-[#BA1A1A] font-bold' : 'text-[#74777D]'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span className="text-[10.5px] mt-0.5">急单催起 ({telemetry.urgentCount})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setBottomTab('stations');
                setIsHardwareDrawerOpen(true);
                showToast('已切换至后厨档口看板');
              }}
              className={`flex flex-col items-center justify-center h-full cursor-pointer ${
                bottomTab === 'stations' ? 'text-[#1A1C1C] font-bold' : 'text-[#74777D]'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span className="text-[10.5px] mt-0.5">档口总线</span>
            </button>
          </div>
        </nav>
      </div>

      {/* ========================================================================= */}
      {/* 🖥️ 电脑端专属界面 (>= 768px 工业级 4 泳道出餐矩阵看板)                         */}
      {/* ========================================================================= */}
      <MerchantKDSDesktopView
        cards={cards}
        onToggleItemStrike={handleToggleItemStrike}
        onCompleteWholeCard={handleCompleteWholeCard}
        onManualCallCard={handleManualCall}
        onDiscardCard={(card) => setDeleteTargetTicket(card)}
        onOpenChat={(ticketNo) => setActiveChatTicketNo(ticketNo)}
        isAllTimelinesOpen={isAllTimelinesOpen}
        toggleAllTimelines={toggleAllTimelines}
        expandedDrawers={expandedDrawers}
        toggleItemDrawer={toggleItemDrawer}
        showToast={showToast}
        nowSec={nowSec}
        formatElapsed={formatElapsed}
        autoVoiceBroadcast={autoVoiceBroadcast}
        onToggleAutoVoice={toggleAutoVoice}
        onBatchFinishDish={handleBatchFinishDish}
      />

      {/* 手机端穿透式 Portal 渠道选择浮层 */}
      {isMobileChannelOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-50 bg-black/20"
          onClick={() => setIsMobileChannelOpen(false)}
        >
          <div
            style={{ top: channelDropdownCoords.top, left: channelDropdownCoords.left }}
            onClick={(e) => e.stopPropagation()}
            className="fixed w-48 bg-white border border-[#CCCCCC] rounded-xl shadow-xl p-1.5 flex flex-col gap-1 z-50 animate-in fade-in zoom-in-95 duration-100"
          >
            {channelOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = channelFilter === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    setChannelFilter(opt.key);
                    setIsMobileChannelOpen(false);
                    triggerHaptic();
                  }}
                  className={`w-full px-2.5 py-2 rounded-lg flex items-center justify-between text-xs font-bold cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#006494]/10 text-[#006494] font-bold border border-[#006494]/30 shadow-2xs'
                      : 'text-[#1A1C1C] hover:bg-[#F3F3F4]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5" />
                    <span>{opt.label}</span>
                  </div>
                  <span className={`text-[10.5px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? 'bg-[#006494] text-white' : 'bg-[#F3F3F4] text-[#44474C]'
                  }`}>
                    {opt.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}

      {/* 手机端/后厨相机快捷扫单核验弹窗 */}
      <MobileCameraScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        title="后厨 KDS · 扫码划单/出餐"
        hintText="将手机摄像头对准外卖单/取餐小票/菜品条码，即可秒级核销划线出餐"
        onScanSuccess={handleKdsScanSuccess}
      />

      {/* 在线协同联络室模态 */}
      {activeChatTicketNo && (
        <UnifiedOmniChatModal
          isOpen={!!activeChatTicketNo}
          onClose={() => setActiveChatTicketNo(null)}
          orderNo={activeChatTicketNo}
          viewerRole="merchant"
          showToast={showToast}
        />
      )}

      {/* 工单撤单作废确认弹窗 */}
      {deleteTargetTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-[3px] border border-[#BA1A1A] shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-[#BA1A1A] text-white p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs tracking-tight">
                <Trash2 className="w-4 h-4" />
                <span>后厨工单作废确认</span>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTargetTicket(null)}
                className="text-white hover:opacity-75 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3 text-xs">
              <div className="bg-[#FFDAD6] border border-[#BA1A1A]/40 p-2.5 rounded text-[#93000A] flex flex-col gap-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-[#BA1A1A]" />
                  <span>后厨排产撤单预警</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  作废后该工单将立即从后厨出餐大屏与批次翻炒任务中移除，后厨厨师无需继续制作。
                </p>
              </div>

              <div className="p-2.5 bg-[#F3F3F4] rounded border border-[#CCCCCC]/60 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#1A1C1C]">
                    {deleteTargetTicket.ticketNo}
                  </span>
                  <span className="text-[11px] text-[#44474C] ml-2">
                    {deleteTargetTicket.title}
                  </span>
                </div>
                <span className="text-[11px] text-[#74777D]">
                  下单时间: {deleteTargetTicket.orderTime} · 已等候 {deleteTargetTicket.elapsedMinutes} 分钟
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#44474C] mb-1">
                  作废原因选择:
                </label>
                <select
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full h-8 px-2 bg-white border border-[#CCCCCC] rounded-[2px] text-xs outline-none focus:border-[#BA1A1A]"
                >
                  <option value="顾客撤单/退款作废">顾客撤单/退款作废</option>
                  <option value="录单错误/重复发单">录单错误/重复发单</option>
                  <option value="菜品原料售罄/无法履约">菜品原料售罄/无法履约</option>
                  <option value="other">其他原因（自定义备注）</option>
                </select>
              </div>

              {deleteReason === 'other' && (
                <div>
                  <input
                    type="text"
                    value={customDeleteReason}
                    onChange={(e) => setCustomDeleteReason(e.target.value)}
                    placeholder="请输入作废原因备注..."
                    className="w-full h-8 px-2 bg-white border border-[#CCCCCC] rounded-[2px] text-xs outline-none focus:border-[#BA1A1A]"
                  />
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer text-[#44474C] select-none pt-1">
                <input
                  type="checkbox"
                  checked={alsoDeleteOrder}
                  onChange={(e) => setAlsoDeleteOrder(e.target.checked)}
                  className="rounded text-[#BA1A1A] focus:ring-0"
                />
                <span className="text-xs font-semibold">同步从「订单中心」移除此订单关联数据</span>
              </label>
            </div>

            <div className="p-3 bg-[#F3F3F4] border-t border-[#CCCCCC] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTargetTicket(null)}
                className="h-8 px-3 rounded-[2px] bg-white border border-[#CCCCCC] text-[#1A1C1C] font-bold hover:bg-neutral-50 cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTicket}
                className="h-8 px-4 rounded-[2px] bg-[#BA1A1A] hover:bg-[#93000A] text-white font-bold cursor-pointer transition shadow-2xs"
              >
                确认作废工单
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 操作审计快照抽屉 */}
      <AccountAuditDrawer currentModule="kds" showToast={showToast} />
    </>
  );
};
