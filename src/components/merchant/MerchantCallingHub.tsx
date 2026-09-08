import React, { useState, useEffect } from 'react';
import { 
  Megaphone, 
  Users, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Volume2, 
  Plus, 
  Tv, 
  ArrowRight,
  Filter,
  BellRing,
  Send,
  UserCheck,
  Bluetooth,
  Search,
  CheckCheck,
  QrCode,
  Layers,
  ArrowUpDown,
  Maximize,
  Minimize,
  DownloadCloud,
  Activity,
  RefreshCw,
  Sliders,
  AlertTriangle,
  Trash2,
  Timer,
  History,
  FileQuestion,
  HelpCircle,
  Settings2
} from 'lucide-react';
import { QueueTicket, QueueType, Order } from '../../types';
import { INITIAL_QUEUE_TICKETS } from '../../data/merchantExtendedMockData';
import { 
  voiceAlerts, 
  playChimeSound,
  getVoiceConfig,
  saveVoiceConfig,
  VOICE_PERSONAS,
  speakText,
  playPersonaAudition,
  VoicePersonaId,
  unlockAudioContext,
  diagnoseAndRepairVoiceEngine
} from '../../utils/voiceAlertEngine';
import { BluetoothSpeakerModal } from './BluetoothSpeakerModal';
import { globalBluetoothAudio } from '../../utils/bluetoothAudioEngine';
import { AccountAuditDrawer } from './AccountAuditDrawer';
import { merchantEventBus } from '../../utils/merchantEventBus';

export interface TableWaitStrategy {
  smallTableMin: number; // 默认 15m
  mediumTableMin: number; // 默认 25m
  largeTableMin: number; // 默认 40m
  pickupMin: number; // 默认 8m
}

const DEFAULT_WAIT_STRATEGY: TableWaitStrategy = {
  smallTableMin: 15,
  mediumTableMin: 25,
  largeTableMin: 40,
  pickupMin: 8
};

interface MerchantCallingHubProps {
  orders?: Order[];
  showToast: (msg: string) => void;
}

export const MerchantCallingHub: React.FC<MerchantCallingHubProps> = ({ orders = [], showToast }) => {
  const [tickets, setTickets] = useState<QueueTicket[]>(() => {
    const raw = localStorage.getItem('obsidian_queue_tickets');
    return raw ? JSON.parse(raw) : INITIAL_QUEUE_TICKETS;
  });

  const [activeFilter, setActiveFilter] = useState<'all' | 'waiting' | 'called' | 'finished' | 'temp_void' | 'perm_void'>('all');
  const [channelFilter, setChannelFilter] = useState<'all' | 'pickup' | 'table'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [repeatCalls, setRepeatCalls] = useState<1 | 2>(1);

  // 商家自定义每桌等位时间配置
  const [waitStrategy, setWaitStrategy] = useState<TableWaitStrategy>(() => {
    try {
      const raw = localStorage.getItem('obsidian_table_wait_strategy');
      return raw ? JSON.parse(raw) : DEFAULT_WAIT_STRATEGY;
    } catch {
      return DEFAULT_WAIT_STRATEGY;
    }
  });
  const [isWaitStrategyModalOpen, setIsWaitStrategyModalOpen] = useState<boolean>(false);

  // 作废确认弹窗状态 (支持临时作废与完全作废)
  const [voidModalTarget, setVoidModalTarget] = useState<QueueTicket | null>(null);
  const [voidModalAction, setVoidModalAction] = useState<'temp_void' | 'perm_void'>('temp_void');
  const [voidReason, setVoidReason] = useState<string>('顾客放弃等位');

  // 单票自定义等位时长编辑状态
  const [editingCustomWaitTicket, setEditingCustomWaitTicket] = useState<QueueTicket | null>(null);
  const [customWaitMinutesInput, setCustomWaitMinutesInput] = useState<number>(20);

  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState<boolean>(false);
  const [verifyInputCode, setVerifyInputCode] = useState<string>('');

  const [isTvMode, setIsTvMode] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  const [voiceConfig, setVoiceConfigState] = useState(getVoiceConfig());
  const [isBluetoothModalOpen, setIsBluetoothModalOpen] = useState(false);
  const [btConfig, setBtConfig] = useState(() => globalBluetoothAudio.getConfig());
  const [activeBtDevice, setActiveBtDevice] = useState(() => globalBluetoothAudio.getActiveDevice());

  // 监听全局音色变动，保持叫号中心与控制台实时同步
  useEffect(() => {
    const handleSync = () => {
      setVoiceConfigState(getVoiceConfig());
    };
    const handleBtSync = () => {
      setBtConfig(globalBluetoothAudio.getConfig());
      setActiveBtDevice(globalBluetoothAudio.getActiveDevice());
    };
    window.addEventListener('voiceConfigChanged', handleSync);
    window.addEventListener('storage', handleSync);
    window.addEventListener('obsidian_bluetooth_speaker_changed', handleBtSync);

    // 跨组件联动总线监听
    const unsubKds = merchantEventBus.on('merchant:kds_dish_completed', (payload) => {
      if (payload.isAllCompleted && (payload.channelType === 'pickup' || payload.channelType === 'delivery')) {
        const shortCode = payload.ticketNo.replace(/^#/, '').slice(-4);
        setTickets((prev) => {
          const existing = prev.find((t) => t.queueNo.includes(shortCode));
          if (existing) {
            return prev.map((t) => (t.id === existing.id ? { ...t, status: 'called', calledCount: t.calledCount + 1 } : t));
          }
          const newTk: QueueTicket = {
            id: `pk-${Date.now()}`,
            queueNo: `P${shortCode}`,
            guestName: '在线自提客',
            phone: '尾号' + shortCode,
            partySize: 1,
            queueType: 'pickup',
            status: 'called',
            waitTimeMin: 0,
            createdAt: new Date().toISOString(),
            takeTime: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
            calledCount: 1,
            calledAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
          };
          return [newTk, ...prev];
        });
      }
    });

    return () => {
      window.removeEventListener('voiceConfigChanged', handleSync);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('obsidian_bluetooth_speaker_changed', handleBtSync);
      unsubKds();
    };
  }, []);

  // 快捷即时喊号
  const [manualCallNumber, setManualCallNumber] = useState<string>('');
  const [manualPartySize, setManualPartySize] = useState<number>(2);

  // 现场取号状态
  const [newGuestName, setNewGuestName] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [newPartySize, setNewPartySize] = useState<number>(2);
  const [newType, setNewType] = useState<QueueType>('small');
  const [newNote, setNewNote] = useState<string>('');

  const saveTickets = (updated: QueueTicket[]) => {
    setTickets(updated);
    localStorage.setItem('obsidian_queue_tickets', JSON.stringify(updated));
  };

  // 叫号呼叫逻辑 (支持连叫 1 或 2 遍)
  const handleCallTicket = (ticket: QueueTicket) => {
    const updated = tickets.map(t => {
      if (t.id === ticket.id) {
        return {
          ...t,
          status: 'called' as const,
          calledCount: t.calledCount + 1,
          calledAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        };
      }
      return t;
    });

    saveTickets(updated);

    const executeCall = async () => {
      await unlockAudioContext();
      if (ticket.queueType === 'pickup') {
        voiceAlerts.callingGuest(ticket.queueNo, '餐车取餐窗口', repeatCalls);
      } else {
        voiceAlerts.callingWaitTable(ticket.queueNo, ticket.partySize, '堂食就餐区', repeatCalls);
      }
    };

    executeCall();
    if (repeatCalls === 2) {
      showToast(`已真人双重连叫【${ticket.queueNo} 号】（广播队列连续播报 2 次）！`);
    } else {
      showToast(`已真人语音呼叫【${ticket.queueNo} 号】！`);
    }
  };

  const handleRemindTicket = async (ticket: QueueTicket) => {
    await unlockAudioContext();
    const waitingSameType = tickets.filter(t => t.queueType === ticket.queueType && t.status === 'waiting');
    const idx = waitingSameType.findIndex(t => t.id === ticket.id);
    const ahead = Math.max(1, idx);
    voiceAlerts.waitingQueueReminder(ticket.queueNo, ahead);
    showToast(`已向【${ticket.queueNo}】播报等位候餐提醒（前方约 ${ahead} 桌）`);
  };

  const handleSeatTicket = (ticketId: string) => {
    const target = tickets.find(t => t.id === ticketId);
    const updated = tickets.map(t => (t.id === ticketId ? { ...t, status: 'seated' as const } : t));
    saveTickets(updated);
    playChimeSound('bell');
    showToast(`已确认【${target?.queueNo || ''}】入座/取餐核销完成！`);
  };

  const handlePassTicket = async (ticketId: string) => {
    const target = tickets.find(t => t.id === ticketId);
    const updated = tickets.map(t => (t.id === ticketId ? { ...t, status: 'passed' as const } : t));
    saveTickets(updated);
    if (target) {
      await unlockAudioContext();
      voiceAlerts.passedTicketNotice(target.queueNo);
    }
    showToast(`已将【${target?.queueNo || ''}】标记为过号，并播报顺延通知！`);
  };

  // 临时作废与完全作废标记处理
  const handleOpenVoidModal = (ticket: QueueTicket, action: 'temp_void' | 'perm_void') => {
    setVoidModalTarget(ticket);
    setVoidModalAction(action);
    setVoidReason(action === 'temp_void' ? '过号暂挂，保留号位' : '顾客弃号离场，完全作废');
  };

  const handleConfirmVoid = () => {
    if (!voidModalTarget) return;
    const timeStr = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    const updated = tickets.map(t => {
      if (t.id === voidModalTarget.id) {
        return {
          ...t,
          status: voidModalAction,
          voidAt: timeStr,
          voidReason: voidReason
        };
      }
      return t;
    });
    saveTickets(updated);
    if (voidModalAction === 'temp_void') {
      showToast(`【临时作废】已将【${voidModalTarget.queueNo}】置为临时作废暂挂，可随时一键恢复叫号！`);
    } else {
      showToast(`【完全作废】已将【${voidModalTarget.queueNo}】彻底作废标记（原因：${voidReason}）`);
    }
    setVoidModalTarget(null);
  };

  // 恢复作废的号牌（支持临时作废恢复，或完全作废紧急救济）
  const handleRestoreVoid = (ticketId: string) => {
    const target = tickets.find(t => t.id === ticketId);
    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        return {
          ...t,
          status: 'waiting' as const,
          voidAt: undefined,
          voidReason: undefined
        };
      }
      return t;
    });
    saveTickets(updated);
    showToast(`已成功恢复【${target?.queueNo || ''}】到正常等位呼叫队列！`);
  };

  // 保存商家自定义桌台等位耗时设置
  const handleSaveWaitStrategy = (newStrategy: TableWaitStrategy) => {
    setWaitStrategy(newStrategy);
    localStorage.setItem('obsidian_table_wait_strategy', JSON.stringify(newStrategy));
    setIsWaitStrategyModalOpen(false);
    showToast('已更新商家自定义每桌等位时间设置，系统已自动重算各桌剩余等待时长！');
  };

  // 单票自定义等位时长保存
  const handleSaveSingleCustomWait = (ticketId: string, customMin: number) => {
    const updated = tickets.map(t => (t.id === ticketId ? { ...t, customWaitMin: customMin } : t));
    saveTickets(updated);
    setEditingCustomWaitTicket(null);
    showToast(`已更新此单专属等位基准为 ${customMin} 分钟，系统已自动重算！`);
  };

  // 系统自动计算等位时间指标：包含已等耗时、商家自定义每桌等位标准、前方等待桌数与系统计算还需等待多久
  const calculateWaitMetrics = (ticket: QueueTicket) => {
    // 商家针对该桌自定义设置，或全局针对该桌型设置
    const standardMin = ticket.customWaitMin || (
      ticket.queueType === 'small' ? waitStrategy.smallTableMin :
      ticket.queueType === 'medium' ? waitStrategy.mediumTableMin :
      ticket.queueType === 'large' ? waitStrategy.largeTableMin : waitStrategy.pickupMin
    );

    // 统计前面同类型等待组数
    const waitingSameQueue = tickets.filter(t => 
      t.queueType === ticket.queueType && 
      (t.status === 'waiting' || t.status === 'called')
    );
    const myIndex = waitingSameQueue.findIndex(t => t.id === ticket.id);
    const aheadCount = myIndex >= 0 ? myIndex : 0;

    // 系统自动计算还需多久 (分钟)
    let remainingMinutes = 0;
    if (ticket.status === 'waiting') {
      if (aheadCount === 0) {
        // 已经到队头，结合已等时间推算还需时间
        remainingMinutes = Math.max(1, standardMin - ticket.waitTimeMin);
      } else {
        // 前方桌数 * 商家设置的单桌翻台耗时
        const rawTime = aheadCount * standardMin;
        remainingMinutes = Math.max(3, rawTime - Math.floor(ticket.waitTimeMin * 0.15));
      }
    } else if (ticket.status === 'called') {
      remainingMinutes = 0;
    }

    const isOverdue = ticket.waitTimeMin > standardMin;

    return {
      standardMin,
      aheadCount,
      remainingMinutes,
      isOverdue
    };
  };

  // 过号重排 / 重新激活呼叫
  const handleRequeueTicket = async (ticketId: string, action: 'requeue' | 'recall') => {
    const target = tickets.find(t => t.id === ticketId);
    if (!target) return;

    if (action === 'requeue') {
      const updated = tickets.map(t => (t.id === ticketId ? { ...t, status: 'waiting' as const, calledCount: 0 } : t));
      saveTickets(updated);
      showToast(`已为【${target.queueNo}】恢复等待队列，顺延排号！`);
    } else {
      const updated = tickets.map(t => (t.id === ticketId ? { ...t, status: 'called' as const, calledCount: t.calledCount + 1 } : t));
      saveTickets(updated);
      await unlockAudioContext();
      if (target.queueType === 'pickup') {
        voiceAlerts.callingGuest(target.queueNo, '餐车取餐窗口', repeatCalls);
      } else {
        voiceAlerts.callingWaitTable(target.queueNo, target.partySize, '堂食就餐区', repeatCalls);
      }
      showToast(`已重新激活并语音呼叫【${target.queueNo}】！`);
    }
  };

  // 快速核销取餐码 (例如输入 8806 或 A01)
  const handleVerifyCodeSubmit = (codeToVerify: string) => {
    const clean = codeToVerify.trim().toUpperCase();
    if (!clean) {
      showToast('请输入 4 位自提校验码或排队号进行核销');
      return;
    }

    // 先在现有票据中查找
    const matched = tickets.find(t => 
      t.queueNo.toUpperCase() === clean || 
      t.id.endsWith(clean) || 
      t.queueNo.endsWith(clean)
    );

    if (matched) {
      const updated = tickets.map(t => (t.id === matched.id ? { ...t, status: 'seated' as const } : t));
      saveTickets(updated);
      speakText(`${matched.queueNo} 号取餐核销成功，祝您用餐愉快！`, { chimeType: 'order' });
      showToast(`【核销成功】${matched.queueNo} 号已完成取餐核销并归档！`);
      setVerifyInputCode('');
      setIsVerifyModalOpen(false);
      return;
    }

    // 若未在 tickets 中匹配，支持作为通用自提码核销
    speakText(`取餐码 ${clean} 核销成功，祝您用餐愉快！`, { chimeType: 'order' });
    showToast(`【核销成功】自提码 #${clean} 核销出库完成！`);
    setVerifyInputCode('');
    setIsVerifyModalOpen(false);
  };

  // 一键同步待自提订单到叫号列表
  const handleSyncPickupOrders = () => {
    const pickupOrders = orders.filter(o => 
      (o.channelType === 'pickup' || o.channel === 'pickup' || (o as any).diningType === 'pickup') &&
      o.status !== 'completed' &&
      o.status !== 'cancelled'
    );

    if (pickupOrders.length === 0) {
      // 若当前没有，注入模拟示例订单
      const sampleCode = `P${String(tickets.filter(t => t.queueType === 'pickup').length + 1).padStart(2, '0')}`;
      const newTicket: QueueTicket = {
        id: `q-sync-${Date.now()}`,
        queueNo: sampleCode,
        queueType: 'pickup',
        guestName: '自提食客',
        phone: '139****8806',
        partySize: 1,
        waitTimeMin: 2,
        status: 'waiting',
        calledCount: 0,
        createdAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        note: '线上点单自提 (双层锁鲜环保餐盒)'
      };
      saveTickets([newTicket, ...tickets]);
      showToast(`已同步 1 笔线上自提订单【${sampleCode}】至叫号队列！`);
      return;
    }

    let addedCount = 0;
    const newItems: QueueTicket[] = [];
    pickupOrders.forEach(o => {
      const qNo = o.pickupCode ? `P${o.pickupCode.slice(-2)}` : `P${String(tickets.length + addedCount + 1).padStart(2, '0')}`;
      const exists = tickets.some(t => t.queueNo === qNo);
      if (!exists) {
        addedCount++;
        newItems.push({
          id: `q-${o.id || Date.now()}-${addedCount}`,
          queueNo: qNo,
          queueType: 'pickup',
          guestName: o.customerName || '自提贵宾',
          phone: o.userPhone || '138****0000',
          partySize: 1,
          waitTimeMin: 0,
          status: 'waiting',
          calledCount: 0,
          createdAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
          note: `线上自提单: ${o.orderNo || ''}`
        });
      }
    });

    if (newItems.length > 0) {
      saveTickets([...newItems, ...tickets]);
      showToast(`已成功将 ${newItems.length} 笔自提订单同步至前台叫号列表！`);
    } else {
      showToast('所有待自提订单已在排队叫号列表中！');
    }
  };

  // 即时快速喊号广播
  const handleManualBroadcast = async (actionType: 'pickup' | 'table') => {
    const num = manualCallNumber.trim().toUpperCase();
    if (!num) {
      showToast('请输入呼叫的排队/取餐单号（例如 A01 或 8821）');
      return;
    }
    await unlockAudioContext();
    if (actionType === 'pickup') {
      voiceAlerts.callingGuest(num, '餐车取餐窗口', repeatCalls);
      showToast(`已广播：呼叫【${num} 号】到餐车前台取餐${repeatCalls === 2 ? '（双重连叫）' : ''}`);
    } else {
      voiceAlerts.callingWaitTable(num, manualPartySize, '堂食就餐区', repeatCalls);
      showToast(`已广播：呼叫【${num} 号】(${manualPartySize}人)等位入座${repeatCalls === 2 ? '（双重连叫）' : ''}`);
    }
  };

  // 现场取号
  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    const prefix = newType === 'small' ? 'A' : newType === 'medium' ? 'B' : newType === 'large' ? 'C' : 'P';
    const sameTypeCount = tickets.filter(t => t.queueType === newType).length + 1;
    const queueNo = `${prefix}${String(sameTypeCount).padStart(2, '0')}`;

    const newTicket: QueueTicket = {
      id: `q-${Date.now()}`,
      queueNo,
      queueType: newType,
      guestName: newGuestName || '贵宾顾客',
      phone: newPhone || '138****0000',
      partySize: newPartySize,
      waitTimeMin: 0,
      status: 'waiting',
      calledCount: 0,
      createdAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      note: newNote
    };

    const updated = [newTicket, ...tickets];
    saveTickets(updated);
    setIsNewModalOpen(false);
    setNewGuestName('');
    setNewPhone('');
    setNewNote('');
    playChimeSound('order');
    showToast(`成功取号【${queueNo}】，前面还有 ${tickets.filter(t => t.queueType === newType && t.status === 'waiting').length} 桌在等候`);
  };

  // 全屏大屏切换
  const handleToggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullScreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullScreen(false);
    }
  };

  // 综合筛选逻辑 (状态 + 渠道 + 搜索词)
  const filteredTickets = tickets.filter(t => {
    // 1. 状态筛选
    if (activeFilter === 'waiting' && t.status !== 'waiting') return false;
    if (activeFilter === 'called' && t.status !== 'called') return false;
    if (activeFilter === 'temp_void' && t.status !== 'temp_void') return false;
    if (activeFilter === 'perm_void' && t.status !== 'perm_void') return false;
    if (activeFilter === 'finished' && (t.status !== 'seated' && t.status !== 'passed')) return false;

    // 2. 渠道类型筛选
    if (channelFilter === 'pickup' && t.queueType !== 'pickup') return false;
    if (channelFilter === 'table' && t.queueType === 'pickup') return false;

    // 3. 搜索关键词
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toUpperCase();
      const matchNo = t.queueNo.toUpperCase().includes(q);
      const matchName = t.guestName?.toUpperCase().includes(q);
      const matchPhone = t.phone?.includes(q);
      if (!matchNo && !matchName && !matchPhone) return false;
    }

    return true;
  });

  const waitingCount = tickets.filter(t => t.status === 'waiting').length;
  const calledTickets = tickets.filter(t => t.status === 'called');
  const tempVoidCount = tickets.filter(t => t.status === 'temp_void').length;
  const permVoidCount = tickets.filter(t => t.status === 'perm_void').length;

  return (
    <div className="space-y-6">
      {/* 顶部主横幅与操作中枢 */}
      <div className="bg-white rounded-lg border border-[#e3e2e0] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Megaphone className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-bold text-[#37352f]">前台叫号取餐与等位排队大屏</h2>
            <span className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold rounded">
              当前排队 {waitingCount} 组
            </span>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded">
              自提待取 {tickets.filter(t => t.queueType === 'pickup' && t.status === 'waiting').length} 单
            </span>
            {tempVoidCount > 0 && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold rounded">
                临时作废(暂挂) {tempVoidCount} 组
              </span>
            )}
          </div>
          <p className="text-xs text-[#787774] mt-1">
            支持一键语音叫号（叮咚前奏+真人母带原声）、智能保温柜核销取餐、现场取号、投屏大屏、自定义桌台等位耗时、系统自动计算还需多久及作废容灾标记。
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* 自定义每桌等位时间设置 */}
          <button
            type="button"
            onClick={() => setIsWaitStrategyModalOpen(true)}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 rounded border border-indigo-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
            title="自定义设置每桌参考等位翻台时间，系统自动以此计算剩余等待时长"
          >
            <Timer className="w-3.5 h-3.5 text-indigo-600" />
            <span>自定义等位时间设置</span>
          </button>

          {/* 快速扫码/输码核销按钮 */}
          <button
            type="button"
            onClick={() => setIsVerifyModalOpen(true)}
            className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
            title="输入或扫描 4 位自提码快速核销"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>核销取餐码</span>
          </button>

          {/* 同步待自提订单 */}
          <button
            type="button"
            onClick={handleSyncPickupOrders}
            className="px-3 py-1.5 bg-white hover:bg-[#f7f7f5] text-[#37352f] rounded border border-[#d3d1cb] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
            title="将线上待自提订单同步至叫号队列"
          >
            <DownloadCloud className="w-3.5 h-3.5 text-blue-600" />
            <span>同步自提单</span>
          </button>

          {/* 开启排队大屏 */}
          <button
            type="button"
            onClick={() => setIsTvMode(!isTvMode)}
            className={`px-3.5 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors border ${
              isTvMode 
                ? 'bg-[#37352f] text-white border-[#37352f]' 
                : 'bg-[#f7f7f5] hover:bg-[#e3e2e0] text-[#37352f] border-[#d3d1cb]'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>{isTvMode ? '退出大屏模式' : '开启排队大屏'}</span>
          </button>

          {/* 现场顾客取号 */}
          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>现场取号</span>
          </button>
        </div>
      </div>

      {/* 投屏大屏模式 (TV Display Mode) */}
      {isTvMode && (
        <div className="bg-[#1f1f1e] text-white rounded-xl p-6 shadow-2xl border border-neutral-700 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-700 mb-6">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
              <h3 className="text-xl font-bold tracking-wider">黑曜石流动餐车 · 排队与叫号大屏</h3>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-mono text-neutral-400">
                {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <button
                type="button"
                onClick={handleToggleFullScreen}
                className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded cursor-pointer transition-colors"
                title="全屏大屏模式"
              >
                {isFullScreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 正在呼叫请取餐 / 入座大框 */}
            <div className="bg-neutral-900 rounded-lg p-5 border border-amber-500/50">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-amber-400 flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-amber-400 animate-bounce" />
                  正在请进 / 请前往取餐
                </span>
                <span className="text-xs text-neutral-400">请凭取餐凭据到前台核验</span>
              </div>

              {calledTickets.length === 0 ? (
                <div className="py-12 text-center text-neutral-500 font-mono text-base">
                  暂无呼叫中的号码，后厨备料制作中…
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {calledTickets.map(t => (
                    <div key={t.id} className="bg-amber-500/10 border border-amber-400/40 rounded-lg p-4 text-center">
                      <span className="text-3xl font-black text-amber-300 font-mono block tracking-wider">{t.queueNo}</span>
                      <span className="text-xs text-neutral-300 mt-1 block">
                        {t.queueType === 'pickup' ? '到店自提取餐 (01号保温柜)' : `${t.partySize} 人桌 · 堂食就餐`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 等待队列大屏格子 */}
            <div className="bg-neutral-900 rounded-lg p-5 border border-neutral-800">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-neutral-300">候餐等待队列</span>
                <span className="text-xs text-neutral-400">等候中：{waitingCount} 组</span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-64 overflow-y-auto">
                {tickets.filter(t => t.status === 'waiting').map(t => (
                  <div key={t.id} className="bg-neutral-800/80 rounded p-2.5 text-center border border-neutral-700">
                    <span className="text-lg font-bold font-mono text-white block">{t.queueNo}</span>
                    <span className="text-[10px] text-neutral-400 mt-0.5 block">
                      {t.queueType === 'pickup' ? '自提' : `${t.partySize}人`} · {t.waitTimeMin}m
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4 宫格排队统计卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-[#e3e2e0]">
          <span className="text-xs text-[#787774] block">小桌等位 (1-2人)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-[#37352f]">
              {tickets.filter(t => t.queueType === 'small' && t.status === 'waiting').length}
            </span>
            <span className="text-xs text-[#787774]">桌等候中</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#e3e2e0]">
          <span className="text-xs text-[#787774] block">中桌等位 (3-4人)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-[#37352f]">
              {tickets.filter(t => t.queueType === 'medium' && t.status === 'waiting').length}
            </span>
            <span className="text-xs text-[#787774]">桌等候中</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#e3e2e0]">
          <span className="text-xs text-[#787774] block">大桌等位 (5-8人)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-[#37352f]">
              {tickets.filter(t => t.queueType === 'large' && t.status === 'waiting').length}
            </span>
            <span className="text-xs text-[#787774]">桌等候中</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#e3e2e0] bg-amber-50/20">
          <span className="text-xs text-amber-800 font-medium block">自提取餐排单 (智能格)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-amber-700">
              {tickets.filter(t => t.queueType === 'pickup' && t.status === 'waiting').length}
            </span>
            <span className="text-xs text-[#787774]">单待取</span>
          </div>
        </div>
      </div>

      {/* 真人原声前台叫号广播台 & 声学音色路由中枢 */}
      <div className="bg-gradient-to-r from-amber-50/80 via-white to-emerald-50/80 rounded-xl border border-amber-200/80 p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-amber-200/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-xs">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-[#37352f]">真人前台叫号广播台</span>
                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded border border-emerald-300">
                  无机械电音 · 纯正母带人声
                </span>
              </div>
              <p className="text-[11px] text-[#787774] flex items-center gap-1.5 flex-wrap">
                <span>当前播报音色：</span>
                <span className="font-semibold text-amber-900">
                  {VOICE_PERSONAS.find(p => p.id === voiceConfig.persona)?.avatarIcon}{' '}
                  {VOICE_PERSONAS.find(p => p.id === voiceConfig.persona)?.name}
                </span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                  VOICE_PERSONAS.find(p => p.id === voiceConfig.persona)?.gender === 'male'
                    ? 'bg-sky-100 text-sky-800 border border-sky-200'
                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                }`}>
                  {VOICE_PERSONAS.find(p => p.id === voiceConfig.persona)?.genderLabel}
                </span>
                <span className="text-emerald-700">（高保真母带原声录音）</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* 连叫设置 (播报1次 / 连报2次) */}
            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-[#d3d1cb] text-xs">
              <span className="text-[#787774] text-[11px]">连叫频次:</span>
              <button
                type="button"
                onClick={() => setRepeatCalls(1)}
                className={`px-1.5 py-0.5 rounded font-medium ${repeatCalls === 1 ? 'bg-amber-600 text-white' : 'text-[#37352f] hover:bg-neutral-100'}`}
              >
                1遍
              </button>
              <button
                type="button"
                onClick={() => setRepeatCalls(2)}
                className={`px-1.5 py-0.5 rounded font-medium ${repeatCalls === 2 ? 'bg-amber-600 text-white' : 'text-[#37352f] hover:bg-neutral-100'}`}
                title="嘈杂户外集市推荐：连续叫2遍"
              >
                连报2遍
              </button>
            </div>

            {/* 蓝牙外放音箱专线指示器 */}
            <button
              type="button"
              onClick={() => setIsBluetoothModalOpen(true)}
              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer border transition-all ${
                activeBtDevice && activeBtDevice.status === 'connected'
                  ? 'bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-200'
                  : 'bg-white hover:bg-[#f7f7f5] text-[#37352f] border-[#d3d1cb]'
              }`}
              title="流动餐车外放蓝牙音箱链接与声学路由"
            >
              <Bluetooth className={`w-3.5 h-3.5 ${
                activeBtDevice && activeBtDevice.status === 'connected' ? 'text-blue-600' : 'text-[#787774]'
              }`} />
              <span>
                {activeBtDevice && activeBtDevice.status === 'connected' 
                  ? `蓝牙音箱: ${activeBtDevice.name.slice(0, 8)} (${btConfig.routingMode === 'voice_only' ? '仅系统语音' : '统一混合'})`
                  : '未连接蓝牙音箱'}
              </span>
            </button>

            {/* 循环切换音色 */}
            <button
              type="button"
              onClick={() => {
                const currentIndex = VOICE_PERSONAS.findIndex(p => p.id === voiceConfig.persona);
                const nextIndex = (currentIndex + 1) % VOICE_PERSONAS.length;
                const nextPersona = VOICE_PERSONAS[nextIndex];
                const updated = {
                  ...voiceConfig,
                  persona: nextPersona.id,
                  selectedVoiceName: undefined,
                  rate: nextPersona.defaultRate,
                  pitch: nextPersona.defaultPitch
                };
                setVoiceConfigState(updated);
                saveVoiceConfig(updated);
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('voiceConfigChanged', { detail: updated }));
                }
                showToast(`已切换音色为【${nextPersona.name}】(${nextPersona.genderLabel})`);
                playPersonaAudition(nextPersona.id);
              }}
              className="px-2.5 py-1 bg-white hover:bg-[#f7f7f5] text-[#37352f] rounded border border-[#d3d1cb] text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
              title="一键循环切换前台播报真人音色风格"
            >
              <UserCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>切换音色风格</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                await unlockAudioContext();
                voiceAlerts.callingGuest('P08', '餐车取餐窗口');
                showToast('正在播报【前台取餐叫号】真人语音...');
              }}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-xs active:scale-95 transition-transform"
              title="试听前台自提单取餐叫号广播"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>试听取餐叫号</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                await unlockAudioContext();
                voiceAlerts.callingWaitTable('B02', 3, '堂食就餐区');
                showToast('正在播报【等位到号入座】真人语音...');
              }}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-xs active:scale-95 transition-transform"
              title="试听等位排队到号入座广播"
            >
              <Users className="w-3.5 h-3.5" />
              <span>试听等位叫号</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                await unlockAudioContext();
                const res = await diagnoseAndRepairVoiceEngine();
                showToast(res.repaired ? '已完成声学自检并成功修复挂起通道！' : '声学通道正常，已解除拦截就绪！');
              }}
              className="px-2.5 py-1 bg-white hover:bg-[#f7f7f5] text-[#37352f] rounded border border-[#d3d1cb] text-xs font-medium flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95 transition-all"
              title="一键诊断声学通道并强制激活挂起的音频服务"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              <span>声学自检修复</span>
            </button>
          </div>
        </div>

        {/* 快速即时喊号输入栏 */}
        <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs font-medium text-[#37352f] shrink-0">即时喊号：</span>
            <input
              type="text"
              placeholder="输入号码 (如 P01 或 A08)"
              value={manualCallNumber}
              onChange={(e) => setManualCallNumber(e.target.value)}
              className="flex-1 px-2.5 py-1 text-xs border border-[#d3d1cb] rounded bg-white font-mono uppercase focus:outline-none focus:border-amber-500"
            />
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-xs text-[#787774]">人数:</span>
              <select
                value={manualPartySize}
                onChange={(e) => setManualPartySize(Number(e.target.value))}
                className="px-2 py-1 text-xs border border-[#d3d1cb] rounded bg-white"
              >
                <option value={1}>1人</option>
                <option value={2}>2人</option>
                <option value={4}>4人</option>
                <option value={6}>6人</option>
                <option value={8}>8人</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleManualBroadcast('pickup')}
              className="flex-1 sm:flex-none px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded flex items-center justify-center gap-1 cursor-pointer transition-colors active:scale-95"
            >
              <Megaphone className="w-3 h-3" />
              <span>喊取餐</span>
            </button>
            <button
              type="button"
              onClick={() => handleManualBroadcast('table')}
              className="flex-1 sm:flex-none px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded flex items-center justify-center gap-1 cursor-pointer transition-colors active:scale-95"
            >
              <Users className="w-3 h-3" />
              <span>喊入座</span>
            </button>
          </div>
        </div>
      </div>

      {/* 筛选标签栏、渠道分类与即时搜索 */}
      <div className="bg-white rounded-lg border border-[#e3e2e0] p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#e3e2e0]">
          {/* 状态筛选 Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-nowrap">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer whitespace-nowrap shrink-0 ${
                activeFilter === 'all' ? 'bg-[#37352f] text-white' : 'text-[#787774] hover:bg-[#f7f7f5]'
              }`}
            >
              全部 ({tickets.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('waiting')}
              className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer whitespace-nowrap shrink-0 ${
                activeFilter === 'waiting' ? 'bg-[#37352f] text-white' : 'text-[#787774] hover:bg-[#f7f7f5]'
              }`}
            >
              等候中 ({waitingCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('called')}
              className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer whitespace-nowrap shrink-0 ${
                activeFilter === 'called' ? 'bg-amber-600 text-white' : 'text-[#787774] hover:bg-[#f7f7f5]'
              }`}
            >
              呼叫中 ({calledTickets.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('temp_void')}
              className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1 ${
                activeFilter === 'temp_void' ? 'bg-amber-700 text-white font-bold' : 'text-amber-800 hover:bg-amber-50'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-amber-500" />
              <span>临时作废 ({tempVoidCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('perm_void')}
              className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1 ${
                activeFilter === 'perm_void' ? 'bg-rose-800 text-white font-bold' : 'text-rose-800 hover:bg-rose-50'
              }`}
            >
              <Trash2 className="w-3 h-3 text-rose-500" />
              <span>完全作废 ({permVoidCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('finished')}
              className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer whitespace-nowrap shrink-0 ${
                activeFilter === 'finished' ? 'bg-[#37352f] text-white' : 'text-[#787774] hover:bg-[#f7f7f5]'
              }`}
            >
              已就餐/已过号
            </button>
          </div>

          {/* 渠道分类 & 搜索框 */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-[#f4f4f2] p-0.5 rounded text-xs border border-[#deded8]">
              <button
                type="button"
                onClick={() => setChannelFilter('all')}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  channelFilter === 'all' ? 'bg-white text-[#37352f] shadow-2xs font-bold' : 'text-[#787774]'
                }`}
              >
                全部类别
              </button>
              <button
                type="button"
                onClick={() => setChannelFilter('pickup')}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  channelFilter === 'pickup' ? 'bg-amber-600 text-white font-bold shadow-2xs' : 'text-[#787774]'
                }`}
              >
                仅到店取餐
              </button>
              <button
                type="button"
                onClick={() => setChannelFilter('table')}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  channelFilter === 'table' ? 'bg-emerald-700 text-white font-bold shadow-2xs' : 'text-[#787774]'
                }`}
              >
                仅堂食排队
              </button>
            </div>

            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-[#787774] absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="搜索单号/姓名/电话..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-2.5 py-1 text-xs border border-[#d3d1cb] rounded bg-white focus:outline-none focus:border-amber-500 w-36 sm:w-44"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 text-neutral-400 hover:text-neutral-700 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 票据网格 Tickets Grid */}
        {filteredTickets.length === 0 ? (
          <div className="py-12 text-center text-[#787774] text-xs">
            暂无匹配的排队叫号或取餐记录
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredTickets.map(ticket => {
              const isWaiting = ticket.status === 'waiting';
              const isCalled = ticket.status === 'called';
              const isSeated = ticket.status === 'seated';
              const isPassed = ticket.status === 'passed';
              const isTempVoid = ticket.status === 'temp_void';
              const isPermVoid = ticket.status === 'perm_void';
              const isPickup = ticket.queueType === 'pickup';

              const { standardMin, aheadCount, remainingMinutes, isOverdue } = calculateWaitMetrics(ticket);

              return (
                <div 
                  key={ticket.id}
                  className={`p-4 rounded-lg border transition-all flex flex-col justify-between ${
                    isCalled 
                      ? 'border-amber-500 bg-amber-50/40 ring-1 ring-amber-500' 
                      : isTempVoid
                      ? 'border-amber-400/80 bg-amber-50/20 ring-1 ring-amber-300'
                      : isPermVoid
                      ? 'border-rose-300 bg-rose-50/30 opacity-75'
                      : isWaiting
                      ? 'border-[#e3e2e0] bg-white hover:border-[#c5c3bc]'
                      : 'border-[#f1f1ef] bg-[#fafaf8] opacity-80'
                  }`}
                >
                  <div>
                    {/* Header: Number, Type & Status Badge */}
                    <div className="flex items-center justify-between mb-2 gap-2 flex-wrap sm:flex-nowrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xl font-mono font-black ${
                          isPermVoid ? 'text-rose-900 line-through' : isTempVoid ? 'text-amber-900' : 'text-[#37352f]'
                        }`}>
                          {ticket.queueNo}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          isPickup ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-[#f1f1ef] text-[#787774]'
                        }`}>
                          {isPickup ? '到店自提' : `${ticket.partySize} 人桌`}
                        </span>
                        {ticket.customWaitMin && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-indigo-100 text-indigo-800 border border-indigo-200 rounded font-semibold" title="商家已针对此桌单独设定等位时长">
                            客制{ticket.customWaitMin}m
                          </span>
                        )}
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border flex items-center gap-1 ${
                        isCalled 
                          ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
                          : isTempVoid
                          ? 'bg-amber-500 text-white border-amber-600 font-bold'
                          : isPermVoid
                          ? 'bg-rose-700 text-white border-rose-800 font-bold'
                          : isWaiting
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : isSeated
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-neutral-100 text-neutral-600 border-neutral-300'
                      }`}>
                        {isCalled ? (
                          `已呼叫 ${ticket.calledCount} 次`
                        ) : isTempVoid ? (
                          <>
                            <AlertTriangle className="w-3 h-3" />
                            <span>临时作废 (暂挂)</span>
                          </>
                        ) : isPermVoid ? (
                          <>
                            <Trash2 className="w-3 h-3" />
                            <span>完全作废</span>
                          </>
                        ) : isWaiting ? (
                          '等待中'
                        ) : isSeated ? (
                          '已取餐/入座'
                        ) : (
                          '已过号'
                        )}
                      </span>
                    </div>

                    {/* Guest info & Details */}
                    <div className="text-xs text-[#787774] space-y-1 mb-2.5">
                      <div className="flex justify-between">
                        <span>顾客：{ticket.guestName}</span>
                        <span>电话：{ticket.phone}</span>
                      </div>
                      <div className="flex justify-between font-mono">
                        <span>取号时间：{ticket.createdAt}</span>
                        <span>
                          已等: <b className={isOverdue ? 'text-rose-600 font-bold' : 'text-slate-800'}>{ticket.waitTimeMin} 分钟</b>
                        </span>
                      </div>
                    </div>

                    {/* 等位时间全景记录 & 自定义设定 & 系统自动计算还需多久 */}
                    {!isSeated && !isPermVoid && (
                      <div className="bg-slate-50 border border-slate-200 rounded p-2.5 mb-3 text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="flex items-center gap-1 text-slate-600 font-medium">
                            <Clock className="w-3 h-3 text-indigo-600" />
                            <span>商家设定标准:</span>
                            <span className="font-bold text-slate-800">{standardMin} 分钟</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCustomWaitTicket(ticket);
                              setCustomWaitMinutesInput(ticket.customWaitMin || standardMin);
                            }}
                            className="text-[10px] text-indigo-600 hover:text-indigo-800 underline flex items-center gap-0.5 cursor-pointer"
                            title="自定义修改此桌等位基准时间"
                          >
                            <Settings2 className="w-2.5 h-2.5" />
                            <span>自定义调整</span>
                          </button>
                        </div>

                        {/* 系统自动计算：还需等待多久 */}
                        <div className="flex items-center justify-between pt-1 border-t border-dashed border-slate-200">
                          <div className="flex items-center gap-1.5">
                            <Timer className={`w-3.5 h-3.5 ${isOverdue ? 'text-rose-600 animate-pulse' : 'text-emerald-600'}`} />
                            <span className="text-[11px] font-semibold text-slate-700">
                              {isWaiting ? (
                                <>
                                  系统自动预估还需: <span className={`font-bold ${isOverdue ? 'text-rose-600' : 'text-emerald-700'}`}>约 {remainingMinutes} 分钟</span>
                                </>
                              ) : isCalled ? (
                                <span className="text-amber-700 font-bold">请即刻入座/取餐</span>
                              ) : isTempVoid ? (
                                <span className="text-amber-800 font-medium">暂挂保留中</span>
                              ) : (
                                '等位流程已结案'
                              )}
                            </span>
                          </div>

                          {isWaiting && !isPickup && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              前方 <span className="font-bold text-slate-800">{aheadCount}</span> 桌
                            </span>
                          )}
                        </div>

                        {/* 等位耗时进度条 */}
                        {isWaiting && (
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${
                                isOverdue ? 'bg-rose-500' : ticket.waitTimeMin > standardMin * 0.7 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, Math.round((ticket.waitTimeMin / Math.max(1, standardMin)) * 100))}%` }}
                            />
                          </div>
                        )}

                        {isOverdue && isWaiting && (
                          <div className="text-[10px] text-rose-600 font-medium flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                            <span>已超出设定翻台周期，建议优先补号或安排入座！</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 作废原因与记录提示 */}
                    {(isTempVoid || isPermVoid) && (
                      <div className={`p-2 rounded text-xs mb-3 border ${
                        isTempVoid ? 'bg-amber-50/80 border-amber-200 text-amber-900' : 'bg-rose-50 border-rose-200 text-rose-900'
                      }`}>
                        <div className="flex items-center justify-between text-[11px] font-semibold">
                          <span>{isTempVoid ? '临时作废标记记录' : '完全作废标记记录'}</span>
                          <span className="font-mono text-[10px]">{ticket.voidAt || '刚刚'}</span>
                        </div>
                        <p className="text-[11px] mt-0.5">作废原因: {ticket.voidReason || '顾客未到弃号'}</p>
                      </div>
                    )}

                    {ticket.note && (
                      <div className="text-amber-800 bg-amber-50/80 px-2 py-1 rounded text-[11px] mb-3 border border-amber-200">
                        备注：{ticket.note}
                      </div>
                    )}
                  </div>

                  {/* 动作栏 */}
                  <div className="pt-2 border-t border-[#f1f1ef] flex flex-col gap-2">
                    {(isWaiting || isCalled) && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleCallTicket(ticket)}
                          className="flex-1 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs active:scale-95"
                          title={isPickup ? '呼叫顾客到前台窗口取餐' : '呼叫顾客到堂食区入座'}
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>{isCalled ? '再次语音呼叫' : isPickup ? '取餐叫号' : '等位叫号'}</span>
                        </button>

                        {isWaiting && !isPickup && (
                          <button
                            type="button"
                            onClick={() => handleRemindTicket(ticket)}
                            className="px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-xs font-medium border border-blue-200 cursor-pointer"
                            title="播报前方等位进度提醒"
                          >
                            <BellRing className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleSeatTicket(ticket.id)}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold cursor-pointer active:scale-95"
                          title="确认入座或已取餐完成"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>

                        {/* 临时作废操作按钮 */}
                        <button
                          type="button"
                          onClick={() => handleOpenVoidModal(ticket, 'temp_void')}
                          className="px-2 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded text-xs cursor-pointer"
                          title="临时作废（过号暂挂，可随时一键恢复呼叫）"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        </button>

                        {/* 完全作废操作按钮 */}
                        <button
                          type="button"
                          onClick={() => handleOpenVoidModal(ticket, 'perm_void')}
                          className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-xs cursor-pointer"
                          title="完全作废（顾客彻底弃号或取消）"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        </button>
                      </div>
                    )}

                    {/* 临时作废状态下的恢复通道 */}
                    {isTempVoid && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleRestoreVoid(ticket.id)}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer shadow-2xs active:scale-95"
                          title="解除临时作废，恢复到等待叫号队列"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>一键恢复叫号</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenVoidModal(ticket, 'perm_void')}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-xs font-medium cursor-pointer"
                          title="确认顾客未回，彻底转为完全作废"
                        >
                          <span>完全作废</span>
                        </button>
                      </div>
                    )}

                    {/* 完全作废状态下的紧急撤销通道 */}
                    {isPermVoid && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-rose-600 font-medium">已彻底废弃归档</span>
                        <button
                          type="button"
                          onClick={() => handleRestoreVoid(ticket.id)}
                          className="px-2 py-1 text-slate-600 hover:text-slate-900 border border-slate-300 hover:bg-slate-100 rounded text-[11px] font-semibold cursor-pointer"
                          title="管理员误操作救济：撤销完全作废并恢复"
                        >
                          <RotateCcw className="w-2.5 h-2.5 inline mr-1" />
                          <span>撤销作废恢复</span>
                        </button>
                      </div>
                    )}

                    {/* 过号后的救济与重排通道 */}
                    {isPassed && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-rose-600 font-medium">顾客已过号</span>
                        <div className="flex items-center gap-1.5 ml-auto">
                          <button
                            type="button"
                            onClick={() => handleRequeueTicket(ticket.id, 'requeue')}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded text-[11px] font-semibold cursor-pointer"
                            title="顺延3位插队重新排号"
                          >
                            <RotateCcw className="w-3 h-3 inline mr-0.5" />
                            <span>顺延重排</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRequeueTicket(ticket.id, 'recall')}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold cursor-pointer"
                            title="顾客到店，直接叫号"
                          >
                            <span>直接呼叫</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {isSeated && (
                      <div className="flex items-center justify-between text-xs text-emerald-800 font-medium">
                        <span className="flex items-center gap-1">
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>已完成取餐/就餐归档</span>
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono">履约完成</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 扫码/输入 4 位自提码快速核销弹窗 */}
      {isVerifyModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg border border-[#d3d1cb] shadow-2xl w-full max-w-sm p-5 text-[#37352f]">
            <div className="flex items-center justify-between pb-3 border-b border-[#e3e2e0] mb-4">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-emerald-700" />
                <h3 className="font-bold text-sm">核销前台取餐码</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsVerifyModalOpen(false)}
                className="text-[#787774] hover:text-[#37352f] text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-[#787774]">
                请让顾客出示手机端自提凭据，输入取餐校验码（例如 8806 或 P01）即可一键核销出库：
              </p>

              <input
                type="text"
                autoFocus
                placeholder="请输入 4 位取餐码 (如: 8806)"
                value={verifyInputCode}
                onChange={(e) => setVerifyInputCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleVerifyCodeSubmit(verifyInputCode);
                }}
                className="w-full px-3 py-2 text-base font-mono text-center font-bold tracking-widest border-2 border-emerald-600 rounded focus:outline-none bg-emerald-50/30"
              />

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleVerifyCodeSubmit('8806')}
                  className="py-1.5 px-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded text-center text-[11px] cursor-pointer"
                >
                  填入演示码 #8806
                </button>
                <button
                  type="button"
                  onClick={() => handleVerifyCodeSubmit('P01')}
                  className="py-1.5 px-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded text-center text-[11px] cursor-pointer"
                >
                  填入自提码 P01
                </button>
              </div>

              <div className="pt-3 border-t border-[#e3e2e0] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsVerifyModalOpen(false)}
                  className="px-3 py-1.5 text-[#787774] hover:text-[#37352f] rounded cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => handleVerifyCodeSubmit(verifyInputCode)}
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold cursor-pointer shadow-xs active:scale-95"
                >
                  确认核销出库
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 现场排队取号弹窗 */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg border border-[#d3d1cb] shadow-2xl w-full max-w-md p-4 sm:p-5 text-[#37352f] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#e3e2e0] mb-4">
              <h3 className="font-bold text-base">现场顾客排队取号</h3>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="text-[#787774] hover:text-[#37352f] p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#787774] mb-1 font-medium">桌型类别 / 用餐方式</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'small', label: '小桌 (1-2人)' },
                    { id: 'medium', label: '中桌 (3-4人)' },
                    { id: 'large', label: '大桌 (5-8人)' },
                    { id: 'pickup', label: '自提取餐' }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setNewType(t.id as QueueType)}
                      className={`p-2 rounded text-center border cursor-pointer font-medium ${
                        newType === t.id
                          ? 'bg-[#37352f] text-white border-[#37352f]'
                          : 'bg-[#f7f7f5] text-[#37352f] border-[#d3d1cb] hover:bg-[#e3e2e0]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#787774] mb-1 font-medium">就餐人数</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={newPartySize}
                    onChange={(e) => setNewPartySize(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-1.5 border border-[#d3d1cb] rounded focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[#787774] mb-1 font-medium">联系电话 (选填)</label>
                  <input
                    type="text"
                    placeholder="如: 13800000000"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3 py-1.5 border border-[#d3d1cb] rounded focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#787774] mb-1 font-medium">顾客称呼 (选填)</label>
                <input
                  type="text"
                  placeholder="如: 张先生"
                  value={newGuestName}
                  onChange={(e) => setNewGuestName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#d3d1cb] rounded focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[#787774] mb-1 font-medium">特殊偏好备注 (选填)</label>
                <input
                  type="text"
                  placeholder="如: 需靠窗位置 / 宝宝椅 / 稍后到达"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#d3d1cb] rounded focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-[#e3e2e0] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-3 py-1.5 text-[#787774] hover:text-[#37352f] rounded cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-semibold cursor-pointer shadow-xs"
                >
                  确认出号打印
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 作废确认与原因弹窗 (临时作废 vs 完全作废) */}
      {voidModalTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg border border-slate-300 shadow-2xl w-full max-w-md p-5 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                {voidModalAction === 'temp_void' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                ) : (
                  <Trash2 className="w-5 h-5 text-rose-600" />
                )}
                <h3 className="font-bold text-base">
                  {voidModalAction === 'temp_void' ? '设置号牌为【临时作废(暂挂)】' : '设置号牌为【完全作废】'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setVoidModalTarget(null)}
                className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3 border border-slate-200 rounded">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-lg font-mono text-slate-900">{voidModalTarget.queueNo}</span>
                  <span className="text-slate-600 font-medium">
                    {voidModalTarget.guestName} · {voidModalTarget.phone}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex justify-between font-mono">
                  <span>取号时间: {voidModalTarget.createdAt}</span>
                  <span>已等待: {voidModalTarget.waitTimeMin} 分钟</span>
                </div>
              </div>

              {/* 作废类型切换 */}
              <div>
                <label className="block text-slate-600 font-medium mb-1">选择作废类型</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setVoidModalAction('temp_void');
                      setVoidReason('过号暂挂，保留号位');
                    }}
                    className={`p-2 rounded border text-left cursor-pointer transition-all ${
                      voidModalAction === 'temp_void'
                        ? 'border-amber-500 bg-amber-50/70 text-amber-900 font-bold ring-1 ring-amber-400'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>临时作废 (暂挂)</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-normal mt-0.5">过号未到暂保留，随时可一键恢复排号</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setVoidModalAction('perm_void');
                      setVoidReason('顾客弃号离场，完全作废');
                    }}
                    className={`p-2 rounded border text-left cursor-pointer transition-all ${
                      voidModalAction === 'perm_void'
                        ? 'border-rose-500 bg-rose-50/70 text-rose-900 font-bold ring-1 ring-rose-400'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>完全作废 (永久)</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-normal mt-0.5">顾客彻底放弃或离场，结案永久作废</p>
                  </button>
                </div>
              </div>

              {/* 作废原因快捷选择与输入 */}
              <div>
                <label className="block text-slate-600 font-medium mb-1">作废说明 / 原因备注</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    '过号3次未到暂挂',
                    '顾客主动放弃等位',
                    '改换为线上外卖自提',
                    '现场重复排号/误取号',
                    '顾客离场无法取得联系'
                  ].map(reason => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setVoidReason(reason)}
                      className={`px-2 py-0.5 rounded text-[11px] border cursor-pointer ${
                        voidReason === reason
                          ? 'bg-slate-800 text-white border-slate-800 font-medium'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="请输入具体作废原因..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-amber-500 bg-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setVoidModalTarget(null)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleConfirmVoid}
                  className={`px-4 py-1.5 text-white rounded font-bold cursor-pointer shadow-xs active:scale-95 ${
                    voidModalAction === 'temp_void' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-rose-700 hover:bg-rose-800'
                  }`}
                >
                  {voidModalAction === 'temp_void' ? '确认临时作废(暂挂)' : '确认完全作废'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 商家自定义桌台等位时间策略设置弹窗 (全局标准) */}
      {isWaitStrategyModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg border border-slate-300 shadow-2xl w-full max-w-md p-5 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base">商家自定义每桌等位时间标准设置</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsWaitStrategyModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-slate-600">
                系统将基于您自定义设置的每桌单次翻台耗时，乘以排队队列前方等待桌数，并结合顾客已等待时长，<b>自动实时计算并展示“还需等待多久”</b>：
              </p>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded">
                  <div>
                    <span className="font-bold text-slate-800 block">小桌 (1-2人)</span>
                    <span className="text-[11px] text-slate-500">快餐/轻食快速翻台</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={5}
                      max={120}
                      value={waitStrategy.smallTableMin}
                      onChange={(e) => setWaitStrategy(s => ({ ...s, smallTableMin: Math.max(5, Number(e.target.value)) }))}
                      className="w-16 px-2 py-1 border border-slate-300 rounded text-center font-bold text-sm bg-white"
                    />
                    <span className="text-slate-600 font-medium">分钟/桌</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded">
                  <div>
                    <span className="font-bold text-slate-800 block">中桌 (3-4人)</span>
                    <span className="text-[11px] text-slate-500">常规好友/家庭用餐</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={5}
                      max={120}
                      value={waitStrategy.mediumTableMin}
                      onChange={(e) => setWaitStrategy(s => ({ ...s, mediumTableMin: Math.max(5, Number(e.target.value)) }))}
                      className="w-16 px-2 py-1 border border-slate-300 rounded text-center font-bold text-sm bg-white"
                    />
                    <span className="text-slate-600 font-medium">分钟/桌</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded">
                  <div>
                    <span className="font-bold text-slate-800 block">大桌 (5人及以上)</span>
                    <span className="text-[11px] text-slate-500">聚餐/多菜品长时就餐</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={10}
                      max={180}
                      value={waitStrategy.largeTableMin}
                      onChange={(e) => setWaitStrategy(s => ({ ...s, largeTableMin: Math.max(10, Number(e.target.value)) }))}
                      className="w-16 px-2 py-1 border border-slate-300 rounded text-center font-bold text-sm bg-white"
                    />
                    <span className="text-slate-600 font-medium">分钟/桌</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded">
                  <div>
                    <span className="font-bold text-slate-800 block">到店自提 (打包单)</span>
                    <span className="text-[11px] text-slate-500">后厨出餐入柜打包</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={2}
                      max={60}
                      value={waitStrategy.pickupMin}
                      onChange={(e) => setWaitStrategy(s => ({ ...s, pickupMin: Math.max(2, Number(e.target.value)) }))}
                      className="w-16 px-2 py-1 border border-slate-300 rounded text-center font-bold text-sm bg-white"
                    />
                    <span className="text-slate-600 font-medium">分钟/单</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setWaitStrategy(DEFAULT_WAIT_STRATEGY)}
                  className="text-slate-500 hover:text-slate-800 text-[11px] underline cursor-pointer"
                >
                  恢复系统默认推荐值
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsWaitStrategyModalOpen(false)}
                    className="px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveWaitStrategy(waitStrategy)}
                    className="px-4 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded font-bold cursor-pointer shadow-xs active:scale-95"
                  >
                    保存并立即生效
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 单桌自定义等位耗时修改弹窗 */}
      {editingCustomWaitTicket && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg border border-slate-300 shadow-2xl w-full max-w-sm p-5 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-sm">自定义单桌等位基准时间</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingCustomWaitTicket(null)}
                className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                正在为号牌 <b className="font-mono text-indigo-700">{editingCustomWaitTicket.queueNo}</b> ({editingCustomWaitTicket.guestName}) 设置专属等位标准时长：
              </p>

              <div>
                <label className="block text-slate-600 font-medium mb-1">自定义基准等位时长 (分钟)</label>
                <input
                  type="number"
                  min={3}
                  max={180}
                  value={customWaitMinutesInput}
                  onChange={(e) => setCustomWaitMinutesInput(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 border border-slate-300 rounded font-bold font-mono text-center text-lg focus:outline-none focus:border-indigo-600 bg-indigo-50/30"
                />
              </div>

              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {[10, 15, 20, 30].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setCustomWaitMinutesInput(m)}
                    className="py-1 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-mono cursor-pointer"
                  >
                    {m}m
                  </button>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCustomWaitTicket(null)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveSingleCustomWait(editingCustomWaitTicket.id, customWaitMinutesInput)}
                  className="px-4 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded font-bold cursor-pointer shadow-xs active:scale-95"
                >
                  确认设定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bluetooth Speaker Modal */}
      <BluetoothSpeakerModal
        isOpen={isBluetoothModalOpen}
        onClose={() => setIsBluetoothModalOpen(false)}
        showToast={showToast}
      />

      {/* 右侧折叠内嵌式账号操作对比与数据兜底组件 */}
      <AccountAuditDrawer
        currentModule="calling_queue"
        title="前台排队叫号操作审计与版本恢复"
        showToast={showToast}
      />
    </div>
  );
};
