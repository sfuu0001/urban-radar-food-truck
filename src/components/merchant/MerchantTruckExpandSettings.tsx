import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Zap,
  Ban,
  Sliders,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Truck,
  Layers,
  Vibrate,
  Eye,
  RotateCcw,
  Save,
  Play,
  Pause,
  ChevronRight,
  ShieldCheck,
  Smartphone,
  Flame,
  Info,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TruckExpandConfig,
  TruckExpandMode,
  TruckExpandTarget,
  TruckExpandScene,
  DEFAULT_TRUCK_EXPAND_CONFIG,
  getTruckExpandConfig,
  saveTruckExpandConfig,
  getStrategyDescription,
  resetUserDismissedRecord,
  hasUserDismissedTruckMenu
} from '../../utils/truckExpandSettings';

interface MerchantTruckExpandSettingsProps {
  showToast: (msg: string) => void;
}

export const MerchantTruckExpandSettings: React.FC<MerchantTruckExpandSettingsProps> = ({ showToast }) => {
  // Current editing state
  const [config, setConfig] = useState<TruckExpandConfig>(() => getTruckExpandConfig());
  const [isSaved, setIsSaved] = useState<boolean>(true);

  // Live Simulator States
  const [simActive, setSimActive] = useState<boolean>(false);
  const [simProgress, setSimProgress] = useState<number>(0);
  const [simRemainingSeconds, setSimRemainingSeconds] = useState<number>(config.delaySeconds);
  const [simExpanded, setSimExpanded] = useState<boolean>(false);
  const simTimerRef = useRef<NodeJS.Timeout | null>(null);
  const simIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Listen for config changes from outside if any
  useEffect(() => {
    setConfig(getTruckExpandConfig());
  }, []);

  // Update change status
  const updateField = <K extends keyof TruckExpandConfig>(key: K, value: TruckExpandConfig[K]) => {
    setConfig((prev) => {
      const next = { ...prev, [key]: value };
      setIsSaved(false);
      return next;
    });
  };

  // Preset seconds quick pills
  const PRESET_SECONDS = [1.0, 1.5, 2.0, 3.0, 5.0, 8.0, 10.0];

  // Save handler
  const handleSave = () => {
    const saved = saveTruckExpandConfig(config);
    setConfig(saved);
    setIsSaved(true);
    showToast(`餐车展开策略已更新：${getStrategyDescription(saved)}`);
    // Restart simulation with new config
    startSimulation(saved);
  };

  // Reset to default
  const handleResetDefault = () => {
    setConfig(DEFAULT_TRUCK_EXPAND_CONFIG);
    setIsSaved(false);
    showToast('已重置为系统默认推荐策略 (2.0秒倒计时自动展开)');
    startSimulation(DEFAULT_TRUCK_EXPAND_CONFIG);
  };

  // Quick Preset Scenarios
  const applyPreset = (type: 'flash_sale' | 'classic_2s' | 'minimal') => {
    if (type === 'flash_sale') {
      const next: TruckExpandConfig = {
        ...config,
        mode: 'immediate',
        delaySeconds: 0,
        target: 'both',
        triggerScene: 'always',
        showCountdownRing: false,
        hapticFeedback: true,
        enableOnNavTabHome: true
      };
      setConfig(next);
      setIsSaved(false);
      showToast('已载入预设：【大促高转化】直接展开餐车与看板');
      startSimulation(next);
    } else if (type === 'classic_2s') {
      const next: TruckExpandConfig = {
        ...config,
        mode: 'countdown',
        delaySeconds: 2.0,
        target: 'both',
        triggerScene: 'always',
        showCountdownRing: true,
        userCancelable: true,
        hapticFeedback: true,
        enableOnNavTabHome: true
      };
      setConfig(next);
      setIsSaved(false);
      showToast('已载入预设：【经典推荐】2.0秒倒计时平滑自动展开');
      startSimulation(next);
    } else if (type === 'minimal') {
      const next: TruckExpandConfig = {
        ...config,
        mode: 'disabled',
        showCountdownRing: false,
        enableOnNavTabHome: false
      };
      setConfig(next);
      setIsSaved(false);
      showToast('已载入预设：【极简沉浸】保持折叠，仅手动触发');
      startSimulation(next);
    }
  };

  // --- Simulator Engine ---
  const stopSimulation = () => {
    if (simTimerRef.current) {
      clearTimeout(simTimerRef.current);
      simTimerRef.current = null;
    }
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    setSimActive(false);
  };

  const resetSimulation = () => {
    stopSimulation();
    setSimProgress(0);
    setSimRemainingSeconds(config.delaySeconds);
    setSimExpanded(false);
  };

  const startSimulation = (activeCfg: TruckExpandConfig = config) => {
    stopSimulation();
    setSimExpanded(false);
    setSimProgress(0);
    setSimRemainingSeconds(activeCfg.delaySeconds);

    if (activeCfg.mode === 'immediate') {
      setSimActive(true);
      setSimProgress(100);
      setSimRemainingSeconds(0);
      setTimeout(() => {
        setSimExpanded(true);
        setSimActive(false);
      }, 150);
      return;
    }

    if (activeCfg.mode === 'disabled') {
      setSimActive(false);
      setSimProgress(0);
      setSimExpanded(false);
      return;
    }

    // Countdown mode
    setSimActive(true);
    const durationMs = Math.max(500, activeCfg.delaySeconds * 1000);
    const startTime = Date.now();

    simIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / durationMs) * 100);
      const remaining = Math.max(0, (durationMs - elapsed) / 1000);
      setSimProgress(pct);
      setSimRemainingSeconds(parseFloat(remaining.toFixed(1)));

      if (pct >= 100 && simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
    }, 30);

    simTimerRef.current = setTimeout(() => {
      setSimExpanded(true);
      setSimActive(false);
      setSimProgress(100);
      setSimRemainingSeconds(0);
      simTimerRef.current = null;
    }, durationMs);
  };

  // Clean simulation timers on unmount
  useEffect(() => {
    return () => {
      stopSimulation();
    };
  }, []);

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-12 font-sans select-none animate-in fade-in duration-200">
      {/* 1. Header & Live Status Overview */}
      <div className="bg-white rounded-[2px] border border-[#e6e6e4] p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-[2px] bg-[#0f172a] text-white flex items-center justify-center">
                <Truck className="w-3.5 h-3.5" />
              </div>
              <h1 className="text-sm font-medium text-[#0f172a] tracking-tight">
                餐车触达与自动展开策略配置
              </h1>
              <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-[2px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                实时生效中
              </span>
            </div>
            <p className="text-xs text-[#787774]">
              自定义顾客进入首页或触控点单时餐车展开模式（2秒后自动展开、自定义时间、直接展开或不展开），优化进店点单转化率与交互体验。
            </p>
          </div>

          {/* Quick Presets Group */}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <span className="text-xs font-normal text-[#787774] mr-1 hidden lg:inline">快捷预设:</span>
            <button
              type="button"
              onClick={() => applyPreset('classic_2s')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 border bg-white ${
                config.mode === 'countdown' && config.delaySeconds === 2
                  ? 'border-zinc-900 text-zinc-900 font-semibold shadow-2xs'
                  : 'border-[#e6e6e4] text-[#5a5854] hover:text-zinc-900 hover:border-zinc-300 hover:bg-slate-50'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>2秒自动展开 (推荐)</span>
            </button>

            <button
              type="button"
              onClick={() => applyPreset('flash_sale')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 border bg-white ${
                config.mode === 'immediate'
                  ? 'border-rose-500 text-rose-700 font-semibold shadow-2xs'
                  : 'border-[#e6e6e4] text-[#5a5854] hover:text-zinc-900 hover:border-zinc-300 hover:bg-slate-50'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-rose-600" />
              <span>直接展开 (大促)</span>
            </button>

            <button
              type="button"
              onClick={() => applyPreset('minimal')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 border bg-white ${
                config.mode === 'disabled'
                  ? 'border-zinc-900 text-zinc-900 font-semibold shadow-2xs'
                  : 'border-[#e6e6e4] text-[#5a5854] hover:text-zinc-900 hover:border-zinc-300 hover:bg-slate-50'
              }`}
            >
              <Ban className="w-3.5 h-3.5 text-[#787774]" />
              <span>不展开 (纯手动)</span>
            </button>
          </div>
        </div>

        {/* Current Strategy Alert Ribbon */}
        <div className="mt-3.5 pt-3 border-t border-[#f1f1ef] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[#787774] font-normal">当前运行策略:</span>
            <span className="font-medium text-[#0f172a] bg-[#fbfbfa] px-2 py-0.5 rounded-[2px] border border-[#e6e6e4] flex items-center gap-1.5 font-mono">
              <span className={`w-1.5 h-1.5 rounded-full ${
                config.mode === 'countdown' ? 'bg-emerald-500 animate-pulse' : config.mode === 'immediate' ? 'bg-rose-500' : 'bg-[#787774]'
              }`} />
              {getStrategyDescription(config)}
            </span>
            <span className="text-[11px] text-[#787774]">
              (触达目标: {config.target === 'both' ? '顶部看板 + 底部抽屉' : config.target === 'menu_pullup' ? '底部抽屉菜单' : '顶部看板'})
            </span>
          </div>

          <div className="text-[11px] text-[#787774] flex items-center gap-1 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>全端自动同步生效 · {config.updatedAt}</span>
          </div>
        </div>
      </div>

      {/* 2. Main Content Grid (Config Controls Left + Realtime Interactive Simulator Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Core Modes & Settings (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* A. Section 1: 前台底栏浮动气泡独立渲染开关 */}
          <div className="bg-white rounded-[2px] border border-[#e6e6e4] p-4 space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#f1f1ef] pb-2.5">
              <h2 className="text-xs font-medium text-[#0f172a] flex items-center gap-1.5 uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5 text-[#787774]" />
                <span>1. 前台底栏浮动气泡与状态按钮独立渲染控制</span>
              </h2>
              <span className="text-[10px] font-normal px-1.5 py-0.5 bg-[#fbfbfa] text-emerald-700 rounded-[2px] border border-emerald-200">
                独立开关 · 实时同步
              </span>
            </div>

            <p className="text-xs text-[#787774]">
              设置前台顾客端底部导航栏上方两个特定浮动交互组件的独立渲染与显隐：
            </p>

            <div className="space-y-2">
              {/* Switch 1: 左侧“展开餐车”气泡按钮开关 */}
              <div className={`flex items-start justify-between p-3 rounded-[2px] border transition-colors ${
                config.showPullUpMenuPill !== false
                  ? 'bg-[#fbfbfa] border-[#e6e6e4]'
                  : 'bg-white border-[#f1f1ef] opacity-75'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-[2px] flex items-center justify-center shrink-0 mt-0.5 ${
                    config.showPullUpMenuPill !== false ? 'bg-[#0f172a] text-white' : 'bg-[#f1f1ef] text-[#787774]'
                  }`}>
                    <Truck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-xs text-[#0f172a]">
                        【展开餐车】浮动气泡按钮
                      </span>
                      <span className={`text-[10px] font-normal px-1.5 py-0.2 rounded-[2px] border ${
                        config.showPullUpMenuPill !== false
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-[#f1f1ef] text-[#787774] border-[#e6e6e4]'
                      }`}>
                        {config.showPullUpMenuPill !== false ? '已开启渲染' : '已关闭隐藏'}
                      </span>
                    </div>
                    <p className="text-[11.5px] text-[#787774] mt-1 leading-relaxed">
                      控制前台底部导航“点单”上方是否渲染“<span className="font-mono font-medium text-[#0f172a]">X秒后展开餐车 / 展开餐车菜单</span>”浮动胶囊气泡。
                    </p>
                  </div>
                </div>
                <div className="ml-3 shrink-0 pt-0.5">
                  <input
                    type="checkbox"
                    id="merchant-toggle-pullup-pill"
                    checked={config.showPullUpMenuPill !== false}
                    onChange={(e) => updateField('showPullUpMenuPill', e.target.checked)}
                    className="w-4 h-4 accent-[#0f172a] rounded-[2px] cursor-pointer"
                  />
                </div>
              </div>

              {/* Switch 2: 右侧“订单履约状态”气泡按钮开关 */}
              <div className={`flex items-start justify-between p-3 rounded-[2px] border transition-colors ${
                config.showActiveOrderBubble !== false
                  ? 'bg-[#fbfbfa] border-[#e6e6e4]'
                  : 'bg-white border-[#f1f1ef] opacity-75'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-[2px] flex items-center justify-center shrink-0 mt-0.5 ${
                    config.showActiveOrderBubble !== false ? 'bg-[#0f172a] text-white' : 'bg-[#f1f1ef] text-[#787774]'
                  }`}>
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-xs text-[#0f172a]">
                        【订单履约状态】实时浮动气泡
                      </span>
                      <span className={`text-[10px] font-normal px-1.5 py-0.2 rounded-[2px] border ${
                        config.showActiveOrderBubble !== false
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-[#f1f1ef] text-[#787774] border-[#e6e6e4]'
                      }`}>
                        {config.showActiveOrderBubble !== false ? '已开启渲染' : '已关闭隐藏'}
                      </span>
                    </div>
                    <p className="text-[11.5px] text-[#787774] mt-1 leading-relaxed">
                      控制前台底部导航“订单”上方是否渲染“<span className="font-mono font-medium text-[#0f172a]">配送中 约XX分 / 制作中</span>”动态履约进度气泡。
                    </p>
                  </div>
                </div>
                <div className="ml-3 shrink-0 pt-0.5">
                  <input
                    type="checkbox"
                    id="merchant-toggle-active-order-bubble"
                    checked={config.showActiveOrderBubble !== false}
                    onChange={(e) => updateField('showActiveOrderBubble', e.target.checked)}
                    className="w-4 h-4 accent-[#0f172a] rounded-[2px] cursor-pointer"
                  />
                </div>
              </div>

              {/* Switch 3: 页面滚动浏览品类联动 HUD 悬浮胶囊 */}
              <div className={`flex items-start justify-between p-3 rounded-[2px] border transition-colors ${
                config.showScrollLinkageHud === true
                  ? 'bg-[#fbfbfa] border-[#0f172a]'
                  : 'bg-white border-[#e6e6e4]'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-[2px] flex items-center justify-center shrink-0 mt-0.5 ${
                    config.showScrollLinkageHud === true ? 'bg-[#0f172a] text-white' : 'bg-[#f1f1ef] text-[#787774]'
                  }`}>
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-xs text-[#0f172a]">
                        【页面滚动浏览品类联动 HUD】浮动气泡
                      </span>
                      <span className={`text-[10px] font-normal px-1.5 py-0.2 rounded-[2px] border ${
                        config.showScrollLinkageHud === true
                          ? 'bg-amber-50 text-amber-900 border-amber-200'
                          : 'bg-[#fbfbfa] text-[#787774] border-[#e6e6e4]'
                      }`}>
                        {config.showScrollLinkageHud === true ? '已开启显示' : '已删除 / 纯净无遮挡'}
                      </span>
                    </div>
                    <p className="text-[11.5px] text-[#787774] mt-1 leading-relaxed">
                      对应前台顾客端滑动菜品时，页面顶部滑出的黑色胶囊（“<span className="font-mono font-medium text-[#0f172a]">主食筒餐 共 1 款 · 浏览 0%</span>”）。现已遵照设计指令默认彻底删除，保持全屏点单无遮挡。
                    </p>
                  </div>
                </div>
                <div className="ml-3 shrink-0 pt-0.5">
                  <input
                    type="checkbox"
                    id="merchant-toggle-scroll-linkage-hud"
                    checked={config.showScrollLinkageHud === true}
                    onChange={(e) => updateField('showScrollLinkageHud', e.target.checked)}
                    className="w-4 h-4 accent-[#0f172a] rounded-[2px] cursor-pointer"
                  />
                </div>
              </div>

              {/* Switch 4: 左侧【2级齿轮选择器】双栏分类机独立渲染开关 */}
              <div className={`flex items-start justify-between p-3 rounded-[2px] border transition-colors ${
                config.showGearCategoryDial !== false
                  ? 'bg-[#fbfbfa] border-[#e6e6e4]'
                  : 'bg-white border-[#f1f1ef] opacity-75'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-[2px] flex items-center justify-center shrink-0 mt-0.5 ${
                    config.showGearCategoryDial !== false ? 'bg-[#0f172a] text-white' : 'bg-[#f1f1ef] text-[#787774]'
                  }`}>
                    <Sliders className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-xs text-[#0f172a]">
                        【2级齿轮选择器】双栏分类机渲染开关
                      </span>
                      <span className={`text-[10px] font-normal px-1.5 py-0.2 rounded-[2px] border ${
                        config.showGearCategoryDial !== false
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-[#f1f1ef] text-[#787774] border-[#e6e6e4]'
                      }`}>
                        {config.showGearCategoryDial !== false ? '双栏模式 (已开启)' : '单栏模式 (已隐藏)'}
                      </span>
                    </div>
                    <p className="text-[11.5px] text-[#787774] mt-1 leading-relaxed">
                      控制顾客端点餐主界面左侧的“<span className="font-mono font-medium text-[#0f172a]">2级齿轮分类滚轮</span>”是否渲染。开启时为左侧齿轮+右侧商品双栏并排结构，固定停驻；关闭时无缝切换为单栏全宽浏览。
                    </p>

                    {/* Sub-config: Theme Selection */}
                    {config.showGearCategoryDial !== false && (
                      <div className="mt-2.5 pt-2 border-t border-[#f1f1ef] flex items-center gap-3 flex-wrap">
                        <span className="text-[11px] font-normal text-[#787774]">外观配色：</span>
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateField('gearDialTheme', 'white')}
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer bg-white border ${
                              (config.gearDialTheme || 'white') === 'white'
                                ? 'border-zinc-900 text-zinc-900 font-semibold shadow-2xs'
                                : 'border-[#e6e6e4] text-[#787774] hover:text-[#0f172a] hover:border-zinc-300'
                            }`}
                          >
                            白色显示 (推荐)
                          </button>
                          <button
                            type="button"
                            onClick={() => updateField('gearDialTheme', 'dark')}
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer bg-white border ${
                              config.gearDialTheme === 'dark'
                                ? 'border-zinc-900 text-zinc-900 font-semibold shadow-2xs'
                                : 'border-[#e6e6e4] text-[#787774] hover:text-[#0f172a] hover:border-zinc-300'
                            }`}
                          >
                            纯黑机械
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="ml-3 shrink-0 pt-0.5">
                  <input
                    type="checkbox"
                    id="merchant-toggle-gear-dial"
                    checked={config.showGearCategoryDial !== false}
                    onChange={(e) => updateField('showGearCategoryDial', e.target.checked)}
                    className="w-4 h-4 accent-[#0f172a] rounded-[2px] cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* B. Three Core Mode Selection Cards */}
          <div className="bg-white rounded-[2px] border border-[#e6e6e4] p-4 space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#f1f1ef] pb-2.5">
              <h2 className="text-xs font-medium text-[#0f172a] flex items-center gap-1.5 uppercase tracking-wider">
                <Sliders className="w-3.5 h-3.5 text-[#787774]" />
                <span>2. 选择餐车展开模式 (Expansion Mode)</span>
              </h2>
              <span className="text-[11px] text-[#787774]">点击卡片切换</span>
            </div>

            <div className="space-y-2">
              {/* Option 1: 倒计时自动展开 */}
              <div
                onClick={() => updateField('mode', 'countdown')}
                className={`p-3 rounded-[2px] border transition-colors cursor-pointer relative ${
                  config.mode === 'countdown'
                    ? 'border-[#0f172a] bg-[#fbfbfa]'
                    : 'border-[#e6e6e4] hover:border-[#787774] bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-[2px] flex items-center justify-center shrink-0 ${
                      config.mode === 'countdown' ? 'bg-[#0f172a] text-white' : 'bg-[#f1f1ef] text-[#787774]'
                    }`}>
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-xs text-[#0f172a]">倒计时自动展开</span>
                        <span className="text-[10px] font-normal px-1.5 py-0.2 rounded-[2px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                          商家自定时间
                        </span>
                      </div>
                      <p className="text-xs text-[#787774] mt-0.5">
                        顾客进入首页后，前台显示动态倒计时进度圈，倒计时结束后自动平滑展开餐车菜单与优惠。
                      </p>
                    </div>
                  </div>

                  <div className={`w-4 h-4 rounded-[2px] border flex items-center justify-center shrink-0 mt-0.5 ${
                    config.mode === 'countdown' ? 'border-[#0f172a] bg-[#0f172a] text-white' : 'border-[#e6e6e4]'
                  }`}>
                    {config.mode === 'countdown' && <CheckCircle2 className="w-3 h-3" />}
                  </div>
                </div>

                {/* Sub-Panel: Custom Countdown Duration Controller (When Mode === 'countdown') */}
                {config.mode === 'countdown' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 pt-3 border-t border-[#f1f1ef] space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-normal text-[#787774]">
                        自定义倒计时时间 (秒):
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-base font-medium text-[#0f172a] font-mono">
                          {config.delaySeconds.toFixed(1)}
                        </span>
                        <span className="text-xs font-normal text-[#787774]">秒后展开</span>
                      </div>
                    </div>

                    {/* Range Slider */}
                    <div className="space-y-1">
                      <input
                        type="range"
                        min="0.5"
                        max="10.0"
                        step="0.5"
                        value={config.delaySeconds}
                        onChange={(e) => updateField('delaySeconds', parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-[#e6e6e4] rounded-lg appearance-none cursor-pointer accent-[#0f172a]"
                      />
                      <div className="flex justify-between text-[10px] text-[#787774] font-mono px-0.5">
                        <span>0.5s (极速)</span>
                        <span>2.0s (标准)</span>
                        <span>5.0s</span>
                        <span>10.0s (充裕)</span>
                      </div>
                    </div>

                    {/* Quick Seconds Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] text-[#787774] mr-1">快捷设定:</span>
                      {PRESET_SECONDS.map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateField('delaySeconds', sec);
                          }}
                          className={`px-2.5 py-0.5 rounded-full text-xs transition-all cursor-pointer border bg-white ${
                            config.delaySeconds === sec
                              ? 'border-zinc-900 text-zinc-900 font-semibold shadow-2xs'
                              : 'text-[#5a5854] hover:text-zinc-900 border-[#e6e6e4] hover:border-zinc-300 hover:bg-slate-50 font-normal'
                          }`}
                        >
                          {sec === 2.0 ? '2.0秒 (推荐)' : `${sec.toFixed(1)}秒`}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Option 2: 直接展开 */}
              <div
                onClick={() => updateField('mode', 'immediate')}
                className={`p-3 rounded-[2px] border transition-colors cursor-pointer relative ${
                  config.mode === 'immediate'
                    ? 'border-rose-600 bg-rose-50/20'
                    : 'border-[#e6e6e4] hover:border-[#787774] bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-[2px] flex items-center justify-center shrink-0 ${
                      config.mode === 'immediate' ? 'bg-rose-600 text-white' : 'bg-[#f1f1ef] text-[#787774]'
                    }`}>
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-xs text-[#0f172a]">直接展开</span>
                        <span className="text-[10px] font-normal px-1.5 py-0.2 rounded-[2px] bg-rose-50 text-rose-800 border border-rose-200">
                          0秒无需等待
                        </span>
                      </div>
                      <p className="text-xs text-[#787774] mt-0.5">
                        顾客打开页面或点击点单时立即展示餐车抽屉，零延迟强曝光，适合大促冲刺与新品活动。
                      </p>
                    </div>
                  </div>

                  <div className={`w-4 h-4 rounded-[2px] border flex items-center justify-center shrink-0 mt-0.5 ${
                    config.mode === 'immediate' ? 'border-rose-600 bg-rose-600 text-white' : 'border-[#e6e6e4]'
                  }`}>
                    {config.mode === 'immediate' && <CheckCircle2 className="w-3 h-3" />}
                  </div>
                </div>
              </div>

              {/* Option 3: 不自动展开 (纯手动) */}
              <div
                onClick={() => updateField('mode', 'disabled')}
                className={`p-3 rounded-[2px] border transition-colors cursor-pointer relative ${
                  config.mode === 'disabled'
                    ? 'border-[#0f172a] bg-[#fbfbfa]'
                    : 'border-[#e6e6e4] hover:border-[#787774] bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-[2px] flex items-center justify-center shrink-0 ${
                      config.mode === 'disabled' ? 'bg-[#0f172a] text-white' : 'bg-[#f1f1ef] text-[#787774]'
                    }`}>
                      <Ban className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-xs text-[#0f172a]">不自动展开 (纯手动触发)</span>
                        <span className="text-[10px] font-normal px-1.5 py-0.2 rounded-[2px] bg-[#f1f1ef] text-[#787774] border border-[#e6e6e4]">
                          保持常驻折叠
                        </span>
                      </div>
                      <p className="text-xs text-[#787774] mt-0.5">
                        页面进入时不自动弹出任何浮窗，仅当顾客主动点击“展开餐车”胶囊或上拉手势时才展开。
                      </p>
                    </div>
                  </div>

                  <div className={`w-4 h-4 rounded-[2px] border flex items-center justify-center shrink-0 mt-0.5 ${
                    config.mode === 'disabled' ? 'border-[#0f172a] bg-[#0f172a] text-white' : 'border-[#e6e6e4]'
                  }`}>
                    {config.mode === 'disabled' && <CheckCircle2 className="w-3 h-3" />}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* C. Advanced Scope & Gesture Interaction Settings */}
          <div className="bg-white rounded-[2px] border border-[#e6e6e4] p-4 space-y-4">
            <h2 className="text-xs font-medium text-[#0f172a] flex items-center gap-1.5 uppercase tracking-wider border-b border-[#f1f1ef] pb-2.5">
              <Layers className="w-3.5 h-3.5 text-[#787774]" />
              <span>3. 展开触达目标与防扰规则</span>
            </h2>

            {/* Target Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#37352f]">展开触达目标区域:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'both', label: '顶部与底部联动', desc: '看板+抽屉全部展开' },
                  { id: 'menu_pullup', label: '仅底部餐车抽屉', desc: '展开底部优惠菜单' },
                  { id: 'banner', label: '仅顶部餐车看板', desc: '展开活动热度榜' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => updateField('target', item.id as TruckExpandTarget)}
                    className={`p-2.5 rounded-[2px] border text-left transition-colors cursor-pointer ${
                      config.target === item.id
                        ? 'border-[#0f172a] bg-[#fbfbfa] font-medium text-[#0f172a]'
                        : 'border-[#e6e6e4] hover:border-[#787774] text-[#37352f] bg-white'
                    }`}
                  >
                    <div className="text-xs">{item.label}</div>
                    <div className="text-[10.5px] text-[#787774] font-normal mt-0.5 truncate">
                      {item.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Trigger Scene Frequency */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-medium text-[#37352f]">生效频次策略:</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'daily_first', label: '每日首次进入', sub: '推荐 · 防高频打扰' },
                  { id: 'manual_dismiss_suppress', label: '关闭后不再自动弹出', sub: '尊重顾客意愿 · 永不重复打扰' },
                  { id: 'once_per_session', label: '单次会话只弹一次', sub: '会话隔离 · 刷新重新计算' },
                  { id: 'new_visitor', label: '仅新客首单生效', sub: '专属新手引导' },
                  { id: 'always', label: '每次进入首页', sub: '最高曝光率' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => updateField('triggerScene', item.id as TruckExpandScene)}
                    className={`p-2.5 rounded-[2px] border text-left transition-colors cursor-pointer ${
                      config.triggerScene === item.id
                        ? 'border-[#0f172a] bg-[#0f172a] text-white font-medium'
                        : 'border-[#e6e6e4] hover:border-[#787774] text-[#37352f] bg-white'
                    }`}
                  >
                    <div className="text-xs">{item.label}</div>
                    <div className={`text-[10px] mt-0.5 ${config.triggerScene === item.id ? 'text-white/70' : 'text-[#787774]'}`}>
                      {item.sub}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Smart Multi-Scenario Controls */}
            <div className="space-y-2 pt-2 border-t border-[#f1f1ef]">
              <div className="text-xs font-medium text-[#37352f]">多场景智能收起与防打扰规则:</div>

              {/* Scenario 1: 用户主动关闭后彻底记住 */}
              <div className="flex items-center justify-between p-2.5 rounded-[2px] bg-[#fbfbfa] border border-[#e6e6e4]">
                <div className="flex items-center gap-2.5">
                  <EyeOff className="w-4 h-4 text-[#787774] shrink-0" />
                  <div>
                    <div className="text-xs font-medium text-[#0f172a]">用户主动关闭后记住状态（不再重复弹出）</div>
                    <div className="text-[11px] text-[#787774]">
                      用户点击右上角或向下滑动关闭菜单后，系统自动记录，下次进入不再强制自动展开
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.rememberUserDismissal ?? true}
                  onChange={(e) => updateField('rememberUserDismissal', e.target.checked)}
                  className="w-4 h-4 accent-[#0f172a] rounded-[2px] cursor-pointer shrink-0"
                />
              </div>

              {/* Scenario 2: 自动展开后指定秒数自动收起 */}
              <div className="p-2.5 rounded-[2px] bg-[#fbfbfa] border border-[#e6e6e4] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-[#787774] shrink-0" />
                    <div>
                      <div className="text-xs font-medium text-[#0f172a]">展开后自动收起倒计时</div>
                      <div className="text-[11px] text-[#787774]">
                        {config.autoCollapseAfterSeconds > 0
                          ? `展开 ${config.autoCollapseAfterSeconds} 秒后若无操作自动收起，避免遮挡商品列表`
                          : '设置为 0 秒表示保持展开常开状态，直到用户主动关闭'}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-medium font-mono px-2 py-0.5 rounded-[2px] bg-white border border-[#e6e6e4] text-[#0f172a]">
                    {config.autoCollapseAfterSeconds === 0 ? '不自动收起' : `${config.autoCollapseAfterSeconds}秒后收起`}
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  {[0, 3, 5, 8, 10].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => updateField('autoCollapseAfterSeconds', sec)}
                      className={`flex-1 py-1 text-xs rounded-[2px] border transition-colors cursor-pointer ${
                        config.autoCollapseAfterSeconds === sec
                          ? 'bg-[#0f172a] text-white font-medium border-[#0f172a]'
                          : 'bg-white text-[#37352f] border-[#e6e6e4] hover:bg-[#fbfbfa]'
                      }`}
                    >
                      {sec === 0 ? '常开' : `${sec}秒`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scenario 3: 加购商品后自动收起 */}
              <div className="flex items-center justify-between p-2.5 rounded-[2px] bg-[#fbfbfa] border border-[#e6e6e4]">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-[#787774] shrink-0" />
                  <div>
                    <div className="text-xs font-medium text-[#0f172a]">加购商品后自动收起餐车浮层</div>
                    <div className="text-[11px] text-[#787774]">
                      顾客在菜单中点击“加购”或选择规格加入选购单后，自动收起菜单方便继续浏览
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.collapseOnAddToCart ?? true}
                  onChange={(e) => updateField('collapseOnAddToCart', e.target.checked)}
                  className="w-4 h-4 accent-[#0f172a] rounded-[2px] cursor-pointer shrink-0"
                />
              </div>

              {/* Scenario 4: 切换页面/路由时自动收起 */}
              <div className="flex items-center justify-between p-2.5 rounded-[2px] bg-[#fbfbfa] border border-[#e6e6e4]">
                <div className="flex items-center gap-2.5">
                  <RotateCcw className="w-4 h-4 text-[#787774] shrink-0" />
                  <div>
                    <div className="text-xs font-medium text-[#0f172a]">切换页面时自动收起</div>
                    <div className="text-[11px] text-[#787774]">
                      进入选购单、订单中心或配送雷达跟踪时，自动收起餐车抽屉
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.collapseOnNavigate ?? true}
                  onChange={(e) => updateField('collapseOnNavigate', e.target.checked)}
                  className="w-4 h-4 accent-[#0f172a] rounded-[2px] cursor-pointer shrink-0"
                />
              </div>

              {/* Scenario 5: 页面滚动浏览时自动收起 */}
              <div className="flex items-center justify-between p-2.5 rounded-[2px] bg-[#fbfbfa] border border-[#e6e6e4]">
                <div className="flex items-center gap-2.5">
                  <Smartphone className="w-4 h-4 text-[#787774] shrink-0" />
                  <div>
                    <div className="text-xs font-medium text-[#0f172a]">向下滑动商品列表时自动收起</div>
                    <div className="text-[11px] text-[#787774]">
                      顾客大幅度滑动菜单查看菜品时，智能释放屏幕视窗空间
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.collapseOnPageScroll ?? true}
                  onChange={(e) => updateField('collapseOnPageScroll', e.target.checked)}
                  className="w-4 h-4 accent-[#0f172a] rounded-[2px] cursor-pointer shrink-0"
                />
              </div>

              {/* Reset User Dismissal History Button */}
              <div className="flex items-center justify-between p-2.5 rounded-[2px] bg-[#fbfbfa] border border-[#e6e6e4]">
                <div>
                  <div className="text-xs font-medium text-[#0f172a]">重置顾客关闭记录 (测试专用)</div>
                  <div className="text-[11px] text-[#787774]">
                    清除本地存储中顾客主动点击“关闭”的防打扰标记，恢复首次进入自动弹出效果
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    resetUserDismissedRecord();
                    showToast('已重置顾客关闭记录，恢复首次自动弹出测试');
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-[#fbfbfa] text-[#0f172a] border border-[#e6e6e4] text-xs font-normal rounded-[2px] cursor-pointer shrink-0 transition-colors"
                >
                  清除标记
                </button>
              </div>

              {/* Switch 1: 视觉倒计时进度环与气泡 */}
              <div className="flex items-center justify-between p-2.5 rounded-[2px] bg-[#fbfbfa] border border-[#e6e6e4]">
                <div className="flex items-center gap-2.5">
                  <Eye className="w-4 h-4 text-[#787774] shrink-0" />
                  <div>
                    <div className="text-xs font-medium text-[#0f172a]">展开倒计时环形进度动画</div>
                    <div className="text-[11px] text-[#787774]">
                      在“点单”气泡内展示绿色环形倒计时进度条与脉冲雷达微动效
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.showCountdownRing}
                  onChange={(e) => updateField('showCountdownRing', e.target.checked)}
                  className="w-4 h-4 accent-[#0f172a] rounded-[2px] cursor-pointer shrink-0"
                />
              </div>

              {/* Switch 2: 手势打断取消 */}
              <div className="flex items-center justify-between p-2.5 rounded-[2px] bg-[#fbfbfa] border border-[#e6e6e4]">
                <div className="flex items-center gap-2.5">
                  <Smartphone className="w-4 h-4 text-[#787774] shrink-0" />
                  <div>
                    <div className="text-xs font-medium text-[#0f172a]">顾客滑动屏幕时自动取消展开</div>
                    <div className="text-[11px] text-[#787774]">
                      若顾客在倒计时期间主动上下滑动菜单，视为沉浸浏览，自动终止弹出
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.userCancelable}
                  onChange={(e) => updateField('userCancelable', e.target.checked)}
                  className="w-4 h-4 accent-[#0f172a] rounded-[2px] cursor-pointer shrink-0"
                />
              </div>

              {/* Switch 3: 震动反馈 */}
              <div className="flex items-center justify-between p-2.5 rounded-[2px] bg-[#fbfbfa] border border-[#e6e6e4]">
                <div className="flex items-center gap-2.5">
                  <Vibrate className="w-4 h-4 text-[#787774] shrink-0" />
                  <div>
                    <div className="text-xs font-medium text-[#0f172a]">展开时触觉震动反馈 (Haptic)</div>
                    <div className="text-[11px] text-[#787774]">
                      移动端展开瞬间提供 40ms 轻微振动触感
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.hapticFeedback}
                  onChange={(e) => updateField('hapticFeedback', e.target.checked)}
                  className="w-4 h-4 accent-[#0f172a] rounded-[2px] cursor-pointer shrink-0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Real-time Live Interactive Phone Simulator (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-[2px] border border-[#e6e6e4] p-4 space-y-3.5 sticky top-16">
            <div className="flex items-center justify-between border-b border-[#f1f1ef] pb-2.5">
              <h2 className="text-xs font-medium text-[#0f172a] flex items-center gap-1.5 uppercase tracking-wider">
                <Smartphone className="w-3.5 h-3.5 text-[#787774]" />
                <span>实时真机动效模拟器 (Simulator)</span>
              </h2>
              <span className="text-[10px] font-mono bg-[#fbfbfa] text-[#787774] px-1.5 py-0.5 rounded-[2px] border border-[#e6e6e4]">
                Live Preview
              </span>
            </div>

            <p className="text-xs text-[#787774]">
              在下方真机沙箱中实时模拟顾客前台视觉响应与倒计时过程：
            </p>

            {/* Simulated Phone Frame */}
            <div className="border border-[#e6e6e4] rounded-[2px] bg-[#fbfbfa] p-2">
              <div className="bg-white rounded-[2px] overflow-hidden min-h-[360px] flex flex-col justify-between border border-[#e6e6e4] relative">
                {/* Phone Status Bar */}
                <div className="bg-[#fbfbfa] px-3 py-1.5 flex items-center justify-between text-[10px] text-[#787774] border-b border-[#e6e6e4] font-mono">
                  <span>12:30</span>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>餐车点单预览</span>
                  </div>
                </div>

                {/* Simulated Top Banner */}
                <div className="p-2.5 space-y-2">
                  <div className="bg-white rounded-[2px] p-2 border border-[#e6e6e4] flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="p-1 rounded-[2px] bg-[#fbfbfa] text-[#0f172a] border border-[#e6e6e4]">
                        <Truck className="w-3 h-3" />
                      </div>
                      <span className="text-xs font-medium text-[#0f172a]">黑曜石主厨移动餐车</span>
                    </div>
                    <span className="text-[9px] bg-emerald-50 text-emerald-800 font-mono px-1.5 py-0.2 rounded-[2px] border border-emerald-200">
                      营业中 0.8km
                    </span>
                  </div>

                  {/* Simulated Dish Items in Background */}
                  <div className="grid grid-cols-2 gap-1.5 opacity-60">
                    <div className="bg-white p-2 rounded-[2px] border border-[#e6e6e4] text-[10px]">
                      <div className="font-medium text-[#0f172a]">和牛小汉堡双重奏</div>
                      <div className="text-emerald-700 font-mono font-medium">¥63.0</div>
                    </div>
                    <div className="bg-white p-2 rounded-[2px] border border-[#e6e6e4] text-[10px]">
                      <div className="font-medium text-[#0f172a]">松露墨汁土豆玉棋</div>
                      <div className="text-emerald-700 font-mono font-medium">¥88.0</div>
                    </div>
                  </div>
                </div>

                {/* Center Simulator Status Overlay */}
                <div className="px-3 py-2 text-center">
                  {simActive ? (
                    <div className="inline-flex flex-col items-center gap-1 bg-white px-3 py-2 rounded-[2px] border border-[#e6e6e4] shadow-xs animate-in zoom-in-95">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 -rotate-90 text-emerald-500 shrink-0" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="9" fill="none" stroke="#f1f1ef" strokeWidth="3" />
                          <circle
                            cx="12"
                            cy="12"
                            r="9"
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="3"
                            strokeDasharray={56.5}
                            strokeDashoffset={56.5 - (56.5 * simProgress) / 100}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="text-xs font-medium text-emerald-800 font-mono">
                          {simRemainingSeconds}s 倒计时进行中...
                        </span>
                      </div>
                      <span className="text-[10px] text-[#787774] font-mono">
                        进度: {Math.round(simProgress)}%
                      </span>
                    </div>
                  ) : simExpanded ? (
                    <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-[2px] border border-emerald-300 text-xs font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>餐车抽屉已成功自动滑出展开！</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1 bg-[#fbfbfa] text-[#787774] px-2.5 py-1 rounded-[2px] border border-[#e6e6e4] text-xs">
                      <Info className="w-3 h-3" />
                      <span>{config.mode === 'disabled' ? '当前配置为手动模式' : '准备就绪，点击下方开始模拟'}</span>
                    </div>
                  )}
                </div>

                {/* Simulated Bottom Drawer / Pop-up Preview */}
                <AnimatePresence>
                  {simExpanded && (
                    <motion.div
                      initial={{ y: 120, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 120, opacity: 0 }}
                      transition={{ type: 'spring', damping: 22, stiffness: 260 }}
                      className="absolute bottom-11 left-1.5 right-1.5 bg-white rounded-t-[2px] border border-[#e6e6e4] shadow-xs p-2.5 space-y-1.5 z-20"
                    >
                      <div className="w-6 h-0.5 bg-[#e6e6e4] rounded-full mx-auto" />
                      <div className="flex items-center justify-between text-xs font-medium text-[#0f172a]">
                        <span className="flex items-center gap-1">
                          <Flame className="w-3 h-3 text-rose-500" />
                          <span>今日餐车热门爆款 & 5折神券</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setSimExpanded(false)}
                          className="text-[10px] text-[#787774] hover:text-[#0f172a]"
                        >
                          收起
                        </button>
                      </div>
                      <div className="bg-[#fbfbfa] text-[#37352f] border border-[#e6e6e4] p-1.5 rounded-[2px] text-[10px] font-normal flex items-center justify-between">
                        <span>满¥35立减¥5券 (全场通用)</span>
                        <span className="bg-[#0f172a] text-white px-1.5 py-0.2 rounded-[2px] font-mono text-[9px]">已领取</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Simulated Bottom Dock */}
                <div className="bg-[#fbfbfa] border-t border-[#e6e6e4] px-3 py-2 flex items-center justify-around text-center text-[10px] z-10">
                  <div className="relative">
                    {/* Simulated Floating Tooltip (Left: Expand Truck) */}
                    {config.showPullUpMenuPill !== false && (
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#0f172a] text-white text-[8px] font-medium px-1.5 py-0.2 rounded-[2px] shadow-xs flex items-center gap-0.5">
                        {simActive ? `${simRemainingSeconds}s后展开` : config.mode === 'immediate' ? '直接展开' : config.mode === 'disabled' ? '点击展开' : `${config.delaySeconds.toFixed(1)}s后展开`}
                      </div>
                    )}
                    <div className="w-6 h-6 rounded-[2px] bg-[#0f172a] text-white flex items-center justify-center mx-auto">
                      <Truck className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-medium text-[#0f172a]">点单</span>
                  </div>

                  <div className="text-[#787774]">
                    <div className="w-5 h-5 rounded-[2px] mx-auto bg-white border border-[#e6e6e4] flex items-center justify-center text-xs">
                      🛒
                    </div>
                    <span>选购单</span>
                  </div>

                  <div className="relative text-[#787774]">
                    {/* Simulated Floating Tooltip (Right: Active Order) */}
                    {config.showActiveOrderBubble !== false && (
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#0f172a] text-white text-[8px] font-medium px-1.5 py-0.2 rounded-[2px] shadow-xs flex items-center gap-0.5 border border-emerald-500/40">
                        <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping inline-block" />
                        <span>配送中 约12分</span>
                      </div>
                    )}
                    <div className="w-5 h-5 rounded-[2px] mx-auto bg-white border border-[#e6e6e4] flex items-center justify-center text-xs">
                      📋
                    </div>
                    <span>订单</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Simulator Action Buttons */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => startSimulation()}
                className="px-2.5 py-1.5 bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-medium rounded-[2px] transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
              >
                <Play className="w-3.5 h-3.5" />
                <span>开始模拟</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  stopSimulation();
                  setSimExpanded(true);
                }}
                className="px-2.5 py-1.5 bg-white hover:bg-[#fbfbfa] text-[#37352f] border border-[#e6e6e4] text-xs font-medium rounded-[2px] transition-colors cursor-pointer flex items-center justify-center gap-1"
              >
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span>立即展开</span>
              </button>

              <button
                type="button"
                onClick={resetSimulation}
                className="px-2.5 py-1.5 bg-white hover:bg-[#fbfbfa] text-[#37352f] border border-[#e6e6e4] text-xs font-medium rounded-[2px] transition-colors cursor-pointer flex items-center justify-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>重置</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Sticky Action Bar for Saving */}
      <div className="sticky bottom-2 z-30 bg-white/95 backdrop-blur-md rounded-[2px] border border-[#e6e6e4] p-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-[2px] bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-xs font-medium text-[#0f172a]">
              当前配置：{getStrategyDescription(config)}
            </div>
            <div className="text-[11px] text-[#787774]">
              {isSaved ? '已与云端及前台实时同步' : '存在未保存的修改，点击右侧按钮保存'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefault}
            className="px-3 py-1.5 bg-white hover:bg-[#fbfbfa] text-[#37352f] border border-[#e6e6e4] text-xs font-normal rounded-[2px] transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>恢复系统默认 (2秒倒计时)</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className={`px-4 py-1.5 rounded-[2px] text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              isSaved
                ? 'bg-[#0f172a] text-white hover:bg-[#1e293b]'
                : 'bg-emerald-700 text-white hover:bg-emerald-800'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaved ? '保存并同步全端' : '立即保存并生效'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
