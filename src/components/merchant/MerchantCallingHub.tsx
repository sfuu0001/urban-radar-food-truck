import React, { useState } from 'react';
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
  Sparkles,
  BellRing,
  Send,
  UserCheck,
  Bluetooth
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
  VoicePersonaId
} from '../../utils/voiceAlertEngine';
import { BluetoothSpeakerModal } from './BluetoothSpeakerModal';
import { globalBluetoothAudio } from '../../utils/bluetoothAudioEngine';

interface MerchantCallingHubProps {
  orders?: Order[];
  showToast: (msg: string) => void;
}

export const MerchantCallingHub: React.FC<MerchantCallingHubProps> = ({ orders = [], showToast }) => {
  const [tickets, setTickets] = useState<QueueTicket[]>(() => {
    const raw = localStorage.getItem('obsidian_queue_tickets');
    return raw ? JSON.parse(raw) : INITIAL_QUEUE_TICKETS;
  });

  const [activeFilter, setActiveFilter] = useState<'all' | 'waiting' | 'called' | 'finished'>('all');
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [isTvMode, setIsTvMode] = useState<boolean>(false);
  const [voiceConfig, setVoiceConfigState] = useState(getVoiceConfig());
  const [isBluetoothModalOpen, setIsBluetoothModalOpen] = useState(false);
  const [btConfig, setBtConfig] = useState(() => globalBluetoothAudio.getConfig());
  const [activeBtDevice, setActiveBtDevice] = useState(() => globalBluetoothAudio.getActiveDevice());

  // 监听全局音色变动，保持叫号中心与控制台实时同步
  React.useEffect(() => {
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
    return () => {
      window.removeEventListener('voiceConfigChanged', handleSync);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('obsidian_bluetooth_speaker_changed', handleBtSync);
    };
  }, []);

  // Quick manual callout state
  const [manualCallNumber, setManualCallNumber] = useState<string>('');
  const [manualPartySize, setManualPartySize] = useState<number>(2);

  // New ticket state
  const [newGuestName, setNewGuestName] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [newPartySize, setNewPartySize] = useState<number>(2);
  const [newType, setNewType] = useState<QueueType>('small');
  const [newNote, setNewNote] = useState<string>('');

  const saveTickets = (updated: QueueTicket[]) => {
    setTickets(updated);
    localStorage.setItem('obsidian_queue_tickets', JSON.stringify(updated));
  };

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

    // Differentiate pickup calling vs waiting table calling
    if (ticket.queueType === 'pickup') {
      voiceAlerts.callingGuest(ticket.queueNo, '餐车取餐窗口');
      showToast(`已真人语音呼叫【${ticket.queueNo} 号】到餐车前台取餐！`);
    } else {
      voiceAlerts.callingWaitTable(ticket.queueNo, ticket.partySize, '堂食就餐区');
      showToast(`已真人语音呼叫【${ticket.queueNo} 号】(${ticket.partySize}人桌)入座就餐！`);
    }
  };

  const handleRemindTicket = (ticket: QueueTicket) => {
    const waitingSameType = tickets.filter(t => t.queueType === ticket.queueType && t.status === 'waiting');
    const idx = waitingSameType.findIndex(t => t.id === ticket.id);
    const ahead = Math.max(1, idx);
    voiceAlerts.waitingQueueReminder(ticket.queueNo, ahead);
    showToast(`已向【${ticket.queueNo}】播报等位候餐提醒（前方约 ${ahead} 桌）`);
  };

  const handleSeatTicket = (ticketId: string) => {
    const updated = tickets.map(t => (t.id === ticketId ? { ...t, status: 'seated' as const } : t));
    saveTickets(updated);
    showToast('已确认入座/取餐完成！');
  };

  const handlePassTicket = (ticketId: string) => {
    const target = tickets.find(t => t.id === ticketId);
    const updated = tickets.map(t => (t.id === ticketId ? { ...t, status: 'passed' as const } : t));
    saveTickets(updated);
    if (target) {
      voiceAlerts.passedTicketNotice(target.queueNo);
    }
    showToast(`已将【${target?.queueNo || ''}】标记为过号，并播报顺延通知！`);
  };

  // Quick manual broadcast
  const handleManualBroadcast = (actionType: 'pickup' | 'table') => {
    const num = manualCallNumber.trim().toUpperCase();
    if (!num) {
      showToast('请输入呼叫的排队/取餐单号（例如 A01 或 8821）');
      return;
    }
    if (actionType === 'pickup') {
      voiceAlerts.callingGuest(num, '餐车取餐窗口');
      showToast(`已广播：呼叫【${num} 号】到餐车前台取餐`);
    } else {
      voiceAlerts.callingWaitTable(num, manualPartySize, '堂食就餐区');
      showToast(`已广播：呼叫【${num} 号】(${manualPartySize}人)等位入座`);
    }
  };

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
    // Reset form
    setNewGuestName('');
    setNewPhone('');
    setNewNote('');
    playChimeSound('order');
    showToast(`成功取号【${queueNo}】，前面还有 ${tickets.filter(t => t.queueType === newType && t.status === 'waiting').length} 桌在等候`);
  };

  const filteredTickets = tickets.filter(t => {
    if (activeFilter === 'waiting') return t.status === 'waiting';
    if (activeFilter === 'called') return t.status === 'called';
    if (activeFilter === 'finished') return t.status === 'seated' || t.status === 'passed';
    return true;
  });

  const waitingCount = tickets.filter(t => t.status === 'waiting').length;
  const calledTickets = tickets.filter(t => t.status === 'called');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-lg border border-[#e3e2e0] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-bold text-[#37352f]">前台叫号取餐与等位排队大屏</h2>
            <span className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold rounded">
              当前排队 {waitingCount} 组
            </span>
          </div>
          <p className="text-xs text-[#787774] mt-1">
            支持一键语音叫号（叮咚前奏+标准TTS）、现场顾客取号、大屏投屏显示与过号顺延处理。
          </p>
        </div>

        <div className="flex items-center gap-2">
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
            <span>{isTvMode ? '退出大屏模式' : '开启排队叫号大屏'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>现场取号排队</span>
          </button>
        </div>
      </div>

      {/* TV Display Mode (When active) */}
      {isTvMode && (
        <div className="bg-[#1f1f1e] text-white rounded-xl p-6 shadow-2xl border border-neutral-700 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-700 mb-6">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
              <h3 className="text-xl font-bold tracking-wider">黑石移动餐车 · 排队与叫号大屏</h3>
            </div>
            <span className="text-sm font-mono text-neutral-400">
              {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Currently Calling Box */}
            <div className="bg-neutral-900 rounded-lg p-5 border border-amber-500/50">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-amber-400 flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-amber-400 animate-bounce" />
                  正在请进 / 请取餐
                </span>
                <span className="text-xs text-neutral-400">请凭号到前台核验</span>
              </div>

              {calledTickets.length === 0 ? (
                <div className="py-12 text-center text-neutral-500 font-mono text-base">
                  暂无呼叫中的号码
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {calledTickets.map(t => (
                    <div key={t.id} className="bg-amber-500/10 border border-amber-400/40 rounded-lg p-4 text-center">
                      <span className="text-3xl font-black text-amber-300 font-mono block tracking-wider">{t.queueNo}</span>
                      <span className="text-xs text-neutral-300 mt-1 block">
                        {t.partySize} 人桌 · {t.queueType === 'pickup' ? '到店自提' : '堂食'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Waiting Numbers Grid */}
            <div className="bg-neutral-900 rounded-lg p-5 border border-neutral-800">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-neutral-300">等待就餐队列</span>
                <span className="text-xs text-neutral-400">等候中：{waitingCount} 组</span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {tickets.filter(t => t.status === 'waiting').map(t => (
                  <div key={t.id} className="bg-neutral-800/80 rounded p-2.5 text-center border border-neutral-700">
                    <span className="text-lg font-bold font-mono text-white block">{t.queueNo}</span>
                    <span className="text-[10px] text-neutral-400 mt-0.5 block">{t.partySize}人 · {t.waitTimeMin}m</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Queue Summary Stat Cards */}
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

        <div className="bg-white p-4 rounded-lg border border-[#e3e2e0]">
          <span className="text-xs text-[#787774] block">自提取餐排队</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-amber-700">
              {tickets.filter(t => t.queueType === 'pickup' && t.status === 'waiting').length}
            </span>
            <span className="text-xs text-[#787774]">单待取</span>
          </div>
        </div>
      </div>

      {/* Real-Human Voice Queue Station & Quick Broadcast Bar */}
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
                  无机械电音 · 真实人声
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
            {/* Bluetooth Speaker Dedicated Voice Output Channel Indicator */}
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
              {activeBtDevice && activeBtDevice.status === 'connected' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </button>

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
                // 播放真实录制的高保真真人母带（男女纯正原声，0机械音）
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
              onClick={() => {
                voiceAlerts.callingGuest('A01', '餐车取餐窗口');
                showToast('正在播报【前台取餐叫号】真人语音...');
              }}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>试听取餐叫号</span>
            </button>

            <button
              type="button"
              onClick={() => {
                voiceAlerts.callingWaitTable('B02', 2, '堂食就餐区');
                showToast('正在播报【等位入座叫号】真人语音...');
              }}
              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>试听等位就餐</span>
            </button>
          </div>
        </div>

        {/* Quick Manual Call Form */}
        <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs font-medium text-[#37352f] shrink-0">即时喊号：</span>
            <input
              type="text"
              placeholder="输入号码 (如 A08 或 9821)"
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
              className="flex-1 sm:flex-none px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded flex items-center justify-center gap-1 cursor-pointer transition-colors"
            >
              <Megaphone className="w-3 h-3" />
              <span>喊取餐</span>
            </button>
            <button
              type="button"
              onClick={() => handleManualBroadcast('table')}
              className="flex-1 sm:flex-none px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded flex items-center justify-center gap-1 cursor-pointer transition-colors"
            >
              <Users className="w-3 h-3" />
              <span>喊入座</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Action List */}
      <div className="bg-white rounded-lg border border-[#e3e2e0] p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e3e2e0]">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-nowrap max-w-full">
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
              onClick={() => setActiveFilter('finished')}
              className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer whitespace-nowrap shrink-0 ${
                activeFilter === 'finished' ? 'bg-[#37352f] text-white' : 'text-[#787774] hover:bg-[#f7f7f5]'
              }`}
            >
              已就餐/已过号
            </button>
          </div>
        </div>

        {/* Tickets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredTickets.map(ticket => {
            const isWaiting = ticket.status === 'waiting';
            const isCalled = ticket.status === 'called';
            const isSeated = ticket.status === 'seated';
            const isPassed = ticket.status === 'passed';
            const isPickup = ticket.queueType === 'pickup';

            return (
              <div 
                key={ticket.id}
                className={`p-4 rounded-lg border transition-all flex flex-col justify-between ${
                  isCalled 
                    ? 'border-amber-500 bg-amber-50/40 ring-1 ring-amber-500' 
                    : isWaiting
                    ? 'border-[#e3e2e0] bg-white hover:border-[#c5c3bc]'
                    : 'border-[#f1f1ef] bg-[#fafaf8] opacity-70'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-mono font-black text-[#37352f]">{ticket.queueNo}</span>
                      <span className="text-xs px-2 py-0.5 bg-[#f1f1ef] rounded font-medium text-[#787774]">
                        {isPickup ? '到店取餐' : `${ticket.partySize} 人桌`}
                      </span>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                      isCalled 
                        ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
                        : isWaiting
                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : isSeated
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-neutral-100 text-neutral-600 border-neutral-300'
                    }`}>
                      {isCalled ? `已呼叫 ${ticket.calledCount} 次` : isWaiting ? '等待中' : isSeated ? '已入座/取餐' : '已过号'}
                    </span>
                  </div>

                  <div className="text-xs text-[#787774] space-y-1 mb-3">
                    <div className="flex justify-between">
                      <span>顾客：{ticket.guestName}</span>
                      <span>电话：{ticket.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>取号时间：{ticket.createdAt}</span>
                      <span>已等待：<b>{ticket.waitTimeMin}m</b></span>
                    </div>
                    {ticket.note && (
                      <div className="text-amber-800 bg-amber-50/80 px-2 py-1 rounded text-[11px] mt-1 border border-amber-200">
                        备注：{ticket.note}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-[#f1f1ef] flex flex-col gap-2">
                  {(isWaiting || isCalled) && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleCallTicket(ticket)}
                        className="flex-1 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs"
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
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold cursor-pointer"
                        title="确认入座或已取餐"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePassTicket(ticket.id)}
                        className="px-2.5 py-1.5 bg-[#f1f1ef] hover:bg-[#e3e2e0] text-[#787774] hover:text-rose-700 rounded text-xs cursor-pointer"
                        title="过号并顺延通知"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {(isSeated || isPassed) && (
                    <span className="text-xs text-[#787774] italic">此号码已归档完成</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* New Queue Ticket Modal */}
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

      {/* Bluetooth Speaker Link & Binding Modal */}
      <BluetoothSpeakerModal
        isOpen={isBluetoothModalOpen}
        onClose={() => setIsBluetoothModalOpen(false)}
        showToast={showToast}
      />
    </div>
  );
};
