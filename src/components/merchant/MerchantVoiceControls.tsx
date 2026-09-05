import React, { useState, useEffect } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Settings2, 
  Check, 
  X, 
  Bell, 
  Sparkles, 
  Megaphone,
  Radio,
  UserCheck,
  Bike,
  Clock,
  Sliders,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { 
  VoiceConfig, 
  getVoiceConfig, 
  saveVoiceConfig, 
  speakText, 
  playChimeSound, 
  voiceAlerts,
  VOICE_PERSONAS,
  VoicePersonaId,
  getAvailableSystemVoices
} from '../../utils/voiceAlertEngine';

interface MerchantVoiceControlsProps {
  showToast: (msg: string) => void;
}

export const MerchantVoiceControls: React.FC<MerchantVoiceControlsProps> = ({ showToast }) => {
  const [config, setConfig] = useState<VoiceConfig>(getVoiceConfig());
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [systemVoices, setSystemVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [showVoiceSelect, setShowVoiceSelect] = useState<boolean>(false);

  useEffect(() => {
    saveVoiceConfig(config);
  }, [config]);

  useEffect(() => {
    const voices = getAvailableSystemVoices();
    setSystemVoices(voices);
  }, [isOpen]);

  const handleToggleMute = () => {
    const nextState = !config.enabled;
    const newCfg = { ...config, enabled: nextState };
    setConfig(newCfg);
    saveVoiceConfig(newCfg);
    showToast(nextState ? '🔊 真人语音播报与出餐声学铃声已开启' : '🔇 语音播报已静音');
    if (nextState) {
      playChimeSound('order');
    }
  };

  const handleSelectPersona = (personaId: VoicePersonaId) => {
    const personaMeta = VOICE_PERSONAS.find(p => p.id === personaId);
    const updated = {
      ...config,
      persona: personaId,
      rate: personaMeta ? personaMeta.defaultRate : config.rate,
      pitch: personaMeta ? personaMeta.defaultPitch : config.pitch
    };
    setConfig(updated);
    showToast(`已切换至【${personaMeta?.name}】(${personaMeta?.title})，去除机械人机声`);
    
    // Quick preview
    speakText(`您好，已切换为${personaMeta?.name}。真人风格已生效！`, {
      persona: personaId,
      chimeType: 'order'
    });
  };

  const currentPersona = VOICE_PERSONAS.find(p => p.id === config.persona) || VOICE_PERSONAS[0];

  return (
    <div className="relative">
      {/* Top Bar Quick Indicator & Controls */}
      <div className="flex items-center gap-1 bg-[#f1f1ef] hover:bg-[#e3e2e0] px-1.5 sm:px-2 py-1 rounded-[4px] border border-[#d3d1cb] text-xs transition-colors shrink-0">
        <button
          type="button"
          onClick={handleToggleMute}
          className={`flex items-center gap-1 cursor-pointer font-medium ${
            config.enabled ? 'text-emerald-700' : 'text-[#787774]'
          }`}
          title={config.enabled ? '点击静音语音播报' : '点击开启语音播报'}
        >
          {config.enabled ? (
            <div className="flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5 text-emerald-600 animate-pulse shrink-0" />
              <span className="hidden md:inline font-semibold">
                {currentPersona.avatarIcon} {currentPersona.name.slice(0, 4)}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <VolumeX className="w-3.5 h-3.5 text-[#787774] shrink-0" />
              <span className="hidden md:inline">语音静音</span>
            </div>
          )}
        </button>

        <span className="text-[#d3d1cb]">|</span>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="text-[#37352f] hover:text-black p-0.5 cursor-pointer shrink-0 flex items-center gap-0.5"
          title="真人语音播报设置 (去除人机声)"
        >
          <Settings2 className="w-3.5 h-3.5" />
          <Sparkles className="w-2.5 h-2.5 text-amber-600 shrink-0" />
        </button>
      </div>

      {/* Voice Settings Backdrop on Mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 sm:hidden z-40 backdrop-blur-2xs"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Voice Settings Dropdown / Modal */}
      {isOpen && (
        <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-14 sm:top-full mt-1.5 sm:w-96 max-w-[calc(100vw-24px)] mx-auto sm:mx-0 bg-white rounded-xl shadow-2xl border border-[#d3d1cb] p-4 sm:p-5 z-50 text-[#37352f] max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#e3e2e0] mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
                <Megaphone className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs sm:text-sm">真人语音播报中心</span>
                  <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-semibold rounded border border-emerald-200">
                    去人机声引擎
                  </span>
                </div>
                <p className="text-[11px] text-[#787774]">覆盖前台叫号、等位、自营新订单与骑手协同</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[#787774] hover:text-[#37352f] p-1 rounded hover:bg-[#f1f1ef] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4 text-xs">
            {/* Master Switch */}
            <div className="flex items-center justify-between p-2.5 bg-[#f7f7f5] rounded-lg border border-[#e3e2e0]">
              <div className="flex items-center gap-2">
                <Volume2 className={`w-4 h-4 ${config.enabled ? 'text-emerald-600' : 'text-[#787774]'}`} />
                <div>
                  <span className="font-semibold text-[#37352f] block">总语音播报开关</span>
                  <span className="text-[10px] text-[#787774]">关闭后所有出餐声效与叫号静音</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                  config.enabled ? 'bg-emerald-600' : 'bg-[#d3d1cb]'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    config.enabled ? 'translate-x-4' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Persona Selection (真人音色选择 - 核心去除人机声) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-[#37352f] flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                  真人音色风格（消除机械电音）
                </span>
                <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  当前: {currentPersona.name}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                {VOICE_PERSONAS.map(p => {
                  const isSelected = config.persona === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPersona(p.id)}
                      className={`w-full text-left p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected 
                          ? 'border-amber-500 bg-amber-50/60 ring-1 ring-amber-500' 
                          : 'border-[#e3e2e0] bg-[#fafaf8] hover:bg-[#f1f1ef]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{p.avatarIcon}</span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#37352f]">{p.name}</span>
                            <span className="text-[10px] text-[#787774]">· {p.title}</span>
                            <span className="text-[9px] px-1 py-0.2 bg-white text-[#787774] rounded border border-[#e3e2e0]">
                              {p.badge}
                            </span>
                          </div>
                          <p className="text-[10px] text-[#787774] line-clamp-1 mt-0.5">{p.description}</p>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-amber-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Human Cadence & Natural Phrasing Toggle */}
            <div className="p-2.5 bg-emerald-50/60 rounded-lg border border-emerald-200/80 space-y-1">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <div>
                    <span className="font-semibold text-emerald-950 block">真人呼吸韵律与单号口语化</span>
                    <span className="text-[10px] text-emerald-700 block">
                      自动拆分数字单号（如 9821 念为 9、8、2、1），注入微停顿，杜绝人机机械连读
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.humanCadenceEnabled}
                  onChange={(e) => setConfig(prev => ({ ...prev, humanCadenceEnabled: e.target.checked }))}
                  className="rounded text-emerald-600 focus:ring-0 cursor-pointer w-4 h-4"
                />
              </label>
            </div>

            {/* Business Scenario Independent Toggles */}
            <div className="space-y-2 pt-1 border-t border-[#e3e2e0]">
              <span className="font-bold text-[#37352f] block">场景语音独立开关</span>
              
              <div className="grid grid-cols-1 gap-1.5 bg-[#fbfbfa] p-2 rounded-lg border border-[#e3e2e0]">
                <label className="flex items-center justify-between cursor-pointer p-1 rounded hover:bg-white">
                  <span className="text-[#37352f] flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-emerald-600" />
                    <span>商家端：自营新订单到达提醒</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={config.autoPlayNewOrder}
                    onChange={(e) => setConfig(prev => ({ ...prev, autoPlayNewOrder: e.target.checked }))}
                    className="rounded text-emerald-600 focus:ring-0 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-1 rounded hover:bg-white">
                  <span className="text-[#37352f] flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-rose-600" />
                    <span>商家端：加急催单与超时警报</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={config.autoPlayUrgent}
                    onChange={(e) => setConfig(prev => ({ ...prev, autoPlayUrgent: e.target.checked }))}
                    className="rounded text-rose-600 focus:ring-0 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-1 rounded hover:bg-white">
                  <span className="text-[#37352f] flex items-center gap-1.5">
                    <Megaphone className="w-3.5 h-3.5 text-amber-600" />
                    <span>前台端：取餐叫号广播 (窗口/吧台)</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={config.autoPlayCalling}
                    onChange={(e) => setConfig(prev => ({ ...prev, autoPlayCalling: e.target.checked }))}
                    className="rounded text-amber-600 focus:ring-0 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-1 rounded hover:bg-white">
                  <span className="text-[#37352f] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>等位端：排队叫号入座与候餐进度提醒</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={config.autoPlayQueueWait}
                    onChange={(e) => setConfig(prev => ({ ...prev, autoPlayQueueWait: e.target.checked }))}
                    className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-1 rounded hover:bg-white">
                  <span className="text-[#37352f] flex items-center gap-1.5">
                    <Bike className="w-3.5 h-3.5 text-purple-600" />
                    <span>骑手端：新顺路订单派发与履约状态</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={config.autoPlayRiderPool && config.autoPlayRiderAction}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      autoPlayRiderPool: e.target.checked,
                      autoPlayRiderAction: e.target.checked
                    }))}
                    className="rounded text-purple-600 focus:ring-0 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Volume & Rate Sliders */}
            <div className="space-y-3 pt-2 border-t border-[#e3e2e0]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#37352f] flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-[#787774]" />
                  声学参数调节
                </span>
                <span className="text-[10px] text-[#787774]">支持真人微调</span>
              </div>

              <div>
                <div className="flex justify-between text-[#787774] mb-1">
                  <span>播报音量</span>
                  <span className="font-mono font-bold text-[#37352f]">{Math.round(config.volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={config.volume}
                  onChange={(e) => setConfig(prev => ({ ...prev, volume: parseFloat(e.target.value) }))}
                  className="w-full h-1.5 bg-[#e3e2e0] rounded-lg appearance-none cursor-pointer accent-amber-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-[#787774] mb-1">
                  <span>语速节奏</span>
                  <span className="font-bold text-[#37352f]">{config.rate.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.3"
                  step="0.05"
                  value={config.rate}
                  onChange={(e) => setConfig(prev => ({ ...prev, rate: parseFloat(e.target.value) }))}
                  className="w-full h-1.5 bg-[#e3e2e0] rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
              </div>
            </div>

            {/* Fast Scene Audition Matrix (全场景快速真人试听) */}
            <div className="pt-2 border-t border-[#e3e2e0] space-y-2">
              <span className="font-bold text-[#37352f] block">场景语音真人效果试听</span>
              
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    voiceAlerts.newSelfOperatedOrder('9821', 128.0, '先锋食客');
                    showToast('正在播报【自营新订单】真人语音...');
                  }}
                  className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-lg border border-emerald-200 flex flex-col items-start gap-0.5 cursor-pointer text-left transition-colors"
                >
                  <div className="flex items-center gap-1 font-bold">
                    <Bell className="w-3 h-3 text-emerald-700" />
                    <span>自营新订单到达</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 line-clamp-1">
                    “您有新的自营专送订单，单号 9、8、2、1...”
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    voiceAlerts.callingGuest('A01', '餐车取餐窗口');
                    showToast('正在播报【前台取餐叫号】真人语音...');
                  }}
                  className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg border border-amber-200 flex flex-col items-start gap-0.5 cursor-pointer text-left transition-colors"
                >
                  <div className="flex items-center gap-1 font-bold">
                    <Megaphone className="w-3 h-3 text-amber-700" />
                    <span>前台取餐叫号</span>
                  </div>
                  <span className="text-[10px] text-amber-700 line-clamp-1">
                    “请——A 零一号顾客，到餐车取餐窗口...”
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    voiceAlerts.callingWaitTable('B02', 3, '露天餐吧堂食区');
                    showToast('正在播报【等位到号入座】真人语音...');
                  }}
                  className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-lg border border-blue-200 flex flex-col items-start gap-0.5 cursor-pointer text-left transition-colors"
                >
                  <div className="flex items-center gap-1 font-bold">
                    <Clock className="w-3 h-3 text-blue-700" />
                    <span>等位排队到号</span>
                  </div>
                  <span className="text-[10px] text-blue-700 line-clamp-1">
                    “请——B 零二号顾客，3人桌已准备就绪...”
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    voiceAlerts.riderNewDeliveryPool('9825', 16.5, 650);
                    showToast('正在播报【骑手新单派发】真人语音...');
                  }}
                  className="p-2 bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-lg border border-purple-200 flex flex-col items-start gap-0.5 cursor-pointer text-left transition-colors"
                >
                  <div className="flex items-center gap-1 font-bold">
                    <Bike className="w-3 h-3 text-purple-700" />
                    <span>骑手新单派发</span>
                  </div>
                  <span className="text-[10px] text-purple-700 line-clamp-1">
                    “骑士您好！收到新的自营顺路订单...”
                  </span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    voiceAlerts.waitingQueueReminder('A05', 2);
                    showToast('正在播报【等位候餐进度】...');
                  }}
                  className="px-2 py-1.5 bg-[#f7f7f5] hover:bg-[#e3e2e0] text-[#37352f] rounded border border-[#d3d1cb] flex items-center justify-center gap-1 cursor-pointer text-[11px]"
                >
                  <Clock className="w-3 h-3 text-[#787774]" />
                  <span>试听等位进度提醒</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    voiceAlerts.riderOrderDelivered('9821', 15.0);
                    showToast('正在播报【骑手妥投确认】...');
                  }}
                  className="px-2 py-1.5 bg-[#f7f7f5] hover:bg-[#e3e2e0] text-[#37352f] rounded border border-[#d3d1cb] flex items-center justify-center gap-1 cursor-pointer text-[11px]"
                >
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>试听骑手送达入账</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
