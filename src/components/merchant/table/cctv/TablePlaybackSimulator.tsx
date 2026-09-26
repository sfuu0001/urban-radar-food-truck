import React, { useRef, useState, useEffect, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wifi,
  Battery,
  Plus,
  Minus,
  Check,
  ShoppingBag,
  Sparkles,
  ChevronRight,
  Flame,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Utensils,
  MapPin,
  X,
  CreditCard,
  Radio,
  Lock,
  MousePointer2,
  Handshake
} from 'lucide-react';
import { CctvPlaybackFrame, CctvSimulatorState } from '../../../../utils/tablePlaybackEngine';
import {
  remoteAssistEngine,
  RemoteAssistSession,
  normalizeCoordinates
} from '../../../../utils/remoteAssistEngine';
import { getClientTelemetrySnapshot, subscribeClientTelemetry } from '../../../../utils/ipTelemetry';

interface TablePlaybackSimulatorProps {
  currentFrame?: CctvPlaybackFrame;
  isLiveMode: boolean;
  frameIndex: number;
  totalFrames: number;
  onShowToast?: (msg: string) => void;
}

export function TablePlaybackSimulator({
  currentFrame,
  isLiveMode,
  frameIndex,
  totalFrames,
  onShowToast
}: TablePlaybackSimulatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);

  const assistSession = useSyncExternalStore(
    remoteAssistEngine.subscribeSession,
    remoteAssistEngine.getSessionSnapshot
  );
  const telemetry = useSyncExternalStore(
    subscribeClientTelemetry,
    getClientTelemetrySnapshot
  );
  const [assistCountdown, setAssistCountdown] = useState<number>(30);

  useEffect(() => {
    if (assistSession?.status !== 'requesting') return;
    setAssistCountdown(30);
    const timer = setInterval(() => {
      setAssistCountdown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [assistSession?.status]);

  const isAssisting = assistSession?.status === 'active';
  const isRequesting = assistSession?.status === 'requesting';

  const state: CctvSimulatorState = currentFrame?.simulatorState || {
    screen: 'browsing',
    categoryActive: '炭火炙烤',
    cartItems: [],
    cartCount: 0,
    cartTotal: 0,
    orderNo: 'UR-DIN-7078',
    tableCode: 'A2',
    diningMode: 'dine_in',
    paymentStatus: 'unpaid',
    kitchenProgress: 0,
    servedDishNames: []
  };

  const touch = currentFrame?.touchPoint;
  const currentActionDesc = currentFrame?.actionSummary || '实时待命中...';
  const actionName = currentFrame?.actionName || '等待指令';

  // 协助操作处理
  const handleStartAssist = () => {
    const s = remoteAssistEngine.startAssistRequest(
      state.tableCode,
      state.tableCode,
      state.orderNo,
      '餐车店长 (No.01)',
      telemetry.clientIp
    );
    onShowToast?.(`已向食客设备 (${telemetry.maskedIp}) 发送协助申请，等待协议确认...`);
  };

  const handleCancelAssist = () => {
    remoteAssistEngine.terminateAssist('terminated');
    onShowToast?.('已取消远程协助申请');
  };

  const handleHandOffAndFinish = () => {
    remoteAssistEngine.sendAssistEvent({
      type: 'HAND_OFF',
      normalizedX: 0.5,
      normalizedY: 0.85,
      tooltipText: '✨ 菜品已配齐，请您核对确认'
    });
    setTimeout(() => {
      remoteAssistEngine.terminateAssist('terminated');
      onShowToast?.('已安全交还控制权，顾客将在本人手机上完成支付');
    }, 400);
  };

  // 鼠标移动镜像发包
  const handleScreenMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAssisting || !screenRef.current) return;
    const rect = screenRef.current.getBoundingClientRect();
    const { x, y } = normalizeCoordinates(e.clientX, e.clientY, rect);
    remoteAssistEngine.sendAssistEvent({
      type: 'CURSOR_MOVE',
      normalizedX: x,
      normalizedY: y,
      cursorState: 'pointer'
    });
  };

  // 鼠标点击镜像发包
  const handleScreenClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAssisting || !screenRef.current) return;
    const rect = screenRef.current.getBoundingClientRect();
    const { x, y } = normalizeCoordinates(e.clientX, e.clientY, rect);
    remoteAssistEngine.sendAssistEvent({
      type: 'CLICK_RIPPLE',
      normalizedX: x,
      normalizedY: y,
      tooltipText: '店员代客点选'
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0E1013] relative overflow-hidden select-none">
      {/* 顶部工业机位抬头 HUD */}
      <div className="shrink-0 h-10 px-4 bg-[#14161B] border-b border-[#242730] flex items-center justify-between text-xs text-neutral-300 z-10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-neutral-200">2. CCTV 用户端前置操作镜面监视台</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
            iPhone 15 Pro Max · 430×932 视口沙盒
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* 远程协助主控按键群 */}
          {isAssisting ? (
            <div className="flex items-center gap-2">
              <span className="h-7 px-2.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 text-xs font-bold flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>远程协助中 (食客已授权)</span>
              </span>
              <button
                type="button"
                onClick={handleHandOffAndFinish}
                className="h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                title="已协助配齐菜品，交还客户手机端进行最终支付"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>菜品已配齐 · 提醒付款</span>
              </button>
              <button
                type="button"
                onClick={handleCancelAssist}
                className="h-7 px-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                结束协助
              </button>
            </div>
          ) : isRequesting ? (
            <div className="flex items-center gap-2">
              <span className="h-7 px-2.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50 text-xs font-bold flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>等待食客授权 ({assistCountdown}s)...</span>
              </span>
              <button
                type="button"
                onClick={handleCancelAssist}
                className="h-7 px-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold cursor-pointer"
              >
                取消呼叫
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleStartAssist}
              className="h-7 px-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white border border-neutral-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="向当前在座食客手机发起远程协助点餐申请"
            >
              <Handshake className="w-3.5 h-3.5 text-emerald-400" />
              <span>申请远程协助点餐</span>
            </button>
          )}

          <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
            <span className="text-neutral-500">机位:</span>
            <span className="text-neutral-200 font-bold">CLIENT_FRONT_MIRROR</span>
          </div>
          <div className="text-[11px] px-2 py-0.5 rounded bg-neutral-900 border border-neutral-700/80 font-bold text-[#3BB4FE]">
            FRAME {String(frameIndex + 1).padStart(2, '0')} / {String(totalFrames).padStart(2, '0')}
          </div>
        </div>
      </div>

      {/* 手机舱模拟视口容器 */}
      <div className="flex-1 flex items-center justify-center p-3 relative overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#181B22] via-[#0D0F13] to-[#08090B]">
        {/* 背景轻微工业网格 */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, #384252 1px, transparent 1px), linear-gradient(to bottom, #384252 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        />

        {/* 手机外壳 (iPhone 15 Pro Max 物理比例: 430:932 -> 约 1:2.167) */}
        <div
          className={`relative w-[340px] h-[736px] max-h-[92%] rounded-[48px] p-3 bg-gradient-to-b from-[#3A3E47] via-[#20232A] to-[#121417] shadow-2xl shadow-black/80 border transition-all duration-300 flex flex-col ${
            isAssisting
              ? 'ring-4 ring-emerald-500/80 border-emerald-500 shadow-emerald-500/25'
              : 'border-[#4B515E]/80'
          }`}
          style={{ transform: 'scale(0.96)', transformOrigin: 'center center' }}
        >
          {/* 金属高光斜切倒角 */}
          <div className="absolute inset-1 rounded-[44px] border border-white/10 pointer-events-none" />

          {/* 屏幕本体 */}
          <div
            ref={screenRef}
            onMouseMove={handleScreenMouseMove}
            onClick={handleScreenClick}
            className={`relative w-full h-full rounded-[38px] bg-white overflow-hidden flex flex-col text-neutral-900 shadow-inner ${
              isAssisting ? 'cursor-crosshair' : ''
            }`}
          >
            {/* 协助申请中：声纳雷达同心圆波纹遮罩 */}
            {isRequesting && (
              <div className="absolute inset-0 z-40 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-white select-none">
                <div className="relative flex items-center justify-center mb-4">
                  <span className="w-20 h-20 rounded-full bg-emerald-500/25 animate-ping absolute" />
                  <span className="w-12 h-12 rounded-full bg-emerald-500/40 animate-pulse absolute" />
                  <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
                    <Radio className="w-5 h-5 text-white" />
                  </div>
                </div>
                <h4 className="text-xs font-bold text-neutral-100 tracking-tight">
                  正在呼叫食客授权协助
                </h4>
                <p className="text-[10px] text-neutral-400 mt-1 max-w-[200px]">
                  已向 IP {telemetry.maskedIp} 发送协议确认卡片，等待食客授权同意 (剩余 {assistCountdown}s)
                </p>
                <button
                  type="button"
                  onClick={handleCancelAssist}
                  className="mt-4 px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  取消呼叫
                </button>
              </div>
            )}
            {/* 顶部状态栏与灵动岛 */}
            <div className="shrink-0 h-10 px-6 pt-2 flex items-center justify-between text-neutral-950 bg-neutral-50/90 backdrop-blur-md z-30 select-none">
              <span className="text-xs font-bold tracking-tight">12:36</span>

              {/* 灵动岛 (Dynamic Island) */}
              <div className="w-24 h-5 rounded-full bg-black flex items-center justify-between px-2 text-white">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-semibold text-neutral-300 tracking-wider">A2 桌</span>
                <Utensils className="w-2.5 h-2.5 text-amber-400" />
              </div>

              <div className="flex items-center gap-1.5 text-neutral-800">
                <span className="text-[10px] font-bold">5G</span>
                <Wifi className="w-3 h-3" />
                <Battery className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* 屏幕内容根据当前帧状态动态渲染 */}
            <div className="flex-1 overflow-hidden relative flex flex-col bg-[#F8F8F6]">
              {/* 页面 1: 进店扫码落地点 */}
              {state.screen === 'landing' && (
                <div className="flex-1 p-5 flex flex-col justify-between bg-gradient-to-b from-amber-50/70 via-white to-neutral-50 animate-fadeIn">
                  <div className="pt-6 space-y-3 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-neutral-900 text-white mx-auto flex items-center justify-center shadow-lg">
                      <Utensils className="w-8 h-8 text-amber-400" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        微信扫码开台就绪
                      </span>
                      <h2 className="text-lg font-extrabold text-neutral-900 tracking-tight">
                        Urban Radar 流动餐车
                      </h2>
                      <p className="text-xs text-neutral-500">
                        静安大悦城旗舰站 · 台位: {state.tableCode} (4人位)
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-neutral-200/90 shadow-sm space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-500">服务责任人</span>
                      <span className="font-bold text-neutral-800">阿豪 (No.02)</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-500">当前在座人数</span>
                      <span className="font-bold text-neutral-800">3 人用餐</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-500">当前排号单</span>
                      <span className="font-bold text-emerald-700">#{state.orderNo}</span>
                    </div>
                  </div>

                  <div className="pb-4">
                    <button
                      type="button"
                      className="w-full py-3 bg-neutral-900 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2"
                    >
                      <span>开始点餐 · 进入菜单</span>
                      <ArrowRight className="w-4 h-4 text-amber-400" />
                    </button>
                  </div>
                </div>
              )}

              {/* 页面 2 / 3 / 4: 菜单浏览与选配加购 */}
              {(state.screen === 'browsing' || state.screen === 'dish_modal') && (
                <div className="flex-1 flex flex-col overflow-hidden relative">
                  {/* 餐车微店头 */}
                  <div className="px-4 py-2.5 bg-white border-b border-neutral-200/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-neutral-400 block">静安大悦城站</span>
                      <h3 className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                        <span>Urban Radar 炭烤专列</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {state.tableCode}桌
                        </span>
                      </h3>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-emerald-600 font-semibold block">营业中 · 极速出餐</span>
                      <span className="text-[10px] text-neutral-400">均候 12 分钟</span>
                    </div>
                  </div>

                  {/* 分类栏 (单排胶囊规范) */}
                  <div className="px-3 py-2 bg-white/90 border-b border-neutral-100 flex items-center gap-2 overflow-x-auto scrollbar-none">
                    {['炭火炙烤', '意式现煮', '西点烘焙', '冷饮现调'].map((cat) => {
                      const isActive = state.categoryActive === cat;
                      return (
                        <div
                          key={cat}
                          className={`h-7 px-3 rounded-full text-xs font-bold flex items-center gap-1 shrink-0 whitespace-nowrap transition-colors ${
                            isActive
                              ? 'bg-neutral-900 text-white'
                              : 'bg-neutral-100 text-neutral-600'
                          }`}
                        >
                          {cat === '炭火炙烤' && <Flame className="w-3 h-3 text-amber-400" />}
                          <span>{cat}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* 菜品展示流 */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-none">
                    {/* 菜品卡片 1: 果木烟熏黑豚五花 */}
                    <div
                      className={`p-2.5 bg-white rounded-xl border transition-all ${
                        state.selectedDish?.name.includes('黑豚')
                          ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                          : 'border-neutral-200/80'
                      }`}
                    >
                      <div className="flex gap-2.5">
                        <div className="w-16 h-16 rounded-lg bg-neutral-100 overflow-hidden shrink-0 border border-neutral-200 flex items-center justify-center">
                          <img
                            src="/src/assets/images/lowkey_skewers_1788031604251.jpg"
                            alt="五花肉"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] px-1 bg-amber-100 text-amber-800 rounded font-bold">招牌</span>
                            <h4 className="text-xs font-bold text-neutral-900 truncate">果木烟熏黑豚炙烤五花</h4>
                          </div>
                          <p className="text-[10px] text-neutral-400 truncate mt-0.5">选用伊比利亚黑猪，果木炭火烘烤</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs font-bold text-neutral-900">¥55.00</span>
                            <div className="h-6 px-2.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                              <Plus className="w-3 h-3" />
                              <span>选规格</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 菜品卡片 2: 黑松露墨汁手工玉棋 */}
                    <div
                      className={`p-2.5 bg-white rounded-xl border transition-all ${
                        state.selectedDish?.name.includes('玉棋')
                          ? 'border-purple-500 ring-2 ring-purple-500/20 shadow-md'
                          : 'border-neutral-200/80'
                      }`}
                    >
                      <div className="flex gap-2.5">
                        <div className="w-16 h-16 rounded-lg bg-neutral-100 overflow-hidden shrink-0 border border-neutral-200 flex items-center justify-center">
                          <img
                            src="/src/assets/images/lowkey_gnocchi_1788031630806.jpg"
                            alt="玉棋"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] px-1 bg-purple-100 text-purple-800 rounded font-bold">主厨特选</span>
                            <h4 className="text-xs font-bold text-neutral-900 truncate">黑松露墨汁手工玉棋</h4>
                          </div>
                          <p className="text-[10px] text-neutral-400 truncate mt-0.5">现磨巴马干酪，浓郁黑松露奶油</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs font-bold text-neutral-900">¥88.00</span>
                            <div className="h-6 px-2.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold flex items-center gap-1">
                              <Plus className="w-3 h-3" />
                              <span>选配定制</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 菜品卡片 3: 火山岩黑熔岩蛋糕 */}
                    <div className="p-2.5 bg-white rounded-xl border border-neutral-200/80">
                      <div className="flex gap-2.5">
                        <div className="w-16 h-16 rounded-lg bg-neutral-100 overflow-hidden shrink-0 border border-neutral-200 flex items-center justify-center">
                          <img
                            src="/src/assets/images/lowkey_dessert_1788031701857.jpg"
                            alt="熔岩蛋糕"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] px-1 bg-rose-100 text-rose-800 rounded font-bold">现烤甜品</span>
                          <h4 className="text-xs font-bold text-neutral-900 truncate mt-0.5">火山岩黑熔岩蛋糕</h4>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs font-bold text-neutral-900">¥36.00</span>
                            <div className="h-6 px-2.5 rounded-full bg-neutral-100 text-neutral-700 text-[10px] font-bold flex items-center gap-1">
                              <Plus className="w-3 h-3" />
                              <span>加购</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 选配规格定制浮层 (当 screen === 'dish_modal' 时展开) */}
                  <AnimatePresence>
                    {state.screen === 'dish_modal' && state.selectedDish && (
                      <motion.div
                        initial={{ opacity: 0, y: 150 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 150 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl border-t border-neutral-200/90 shadow-2xl p-4 z-20 space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                              规格与定制选配
                            </span>
                            <h3 className="text-xs font-extrabold text-neutral-900 mt-1">
                              {state.selectedDish.name}
                            </h3>
                            <span className="text-xs font-bold text-neutral-900 mt-0.5 block">
                              ¥{state.selectedDish.price.toFixed(2)}
                            </span>
                          </div>
                          <div className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400">
                            <X className="w-3.5 h-3.5" />
                          </div>
                        </div>

                        {/* 规格选择区 */}
                        <div className="space-y-2 text-xs">
                          <div>
                            <span className="text-[10px] text-neutral-400 block mb-1">分量规格</span>
                            <div className="flex items-center gap-1.5">
                              <span className="px-2.5 py-1 rounded-lg bg-neutral-900 text-white font-bold text-[11px]">
                                {state.selectedDish.portion || '标准份'}
                              </span>
                              <span className="px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-600 text-[11px]">
                                加浓分享份 (+¥20)
                              </span>
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-neutral-400">辣度 / 酱料</span>
                              {currentFrame?.isHesitation && (
                                <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 animate-pulse">
                                  ⚠️ 捕获纠结切换 2 次
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-300 text-purple-900 font-bold text-[11px] flex items-center gap-1">
                                <Check className="w-3 h-3 text-purple-600" />
                                {state.selectedDish.sauce || '浓郁黑松露酱'}
                              </span>
                              <span className="px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-600 text-[11px]">
                                清淡少油
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 加购按钮 */}
                        <button
                          type="button"
                          className="w-full py-2.5 bg-neutral-900 text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-1.5"
                        >
                          <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                          <span>确认选配 · 加入购物车</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* 底部浮动购物车条 */}
                  <div className="shrink-0 p-3 bg-white border-t border-neutral-200/90 flex items-center justify-between z-10">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-neutral-900 text-white flex items-center justify-center shadow-md">
                          <ShoppingBag className="w-5 h-5 text-amber-400" />
                        </div>
                        {state.cartCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center border-2 border-white">
                            {state.cartCount}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xs text-neutral-400 font-medium">合计:</span>
                          <span className="text-sm font-extrabold text-neutral-900">
                            ¥{state.cartTotal.toFixed(2)}
                          </span>
                        </div>
                        <span className="text-[10px] text-neutral-400 block">堂食免餐盒与配送费</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`h-9 px-4 rounded-xl text-xs font-bold transition-colors ${
                        state.cartCount > 0
                          ? 'bg-neutral-900 text-white shadow-md'
                          : 'bg-neutral-200 text-neutral-400'
                      }`}
                    >
                      去结算
                    </button>
                  </div>
                </div>
              )}

              {/* 页面 5: 购物车核对抽屉 */}
              {state.screen === 'cart_drawer' && (
                <div className="flex-1 p-4 flex flex-col justify-between bg-neutral-50 animate-fadeIn">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                      <h3 className="text-xs font-bold text-neutral-900">已点餐品明细 ({state.cartCount}件)</h3>
                      <span className="text-[10px] text-neutral-400">堂食台位: {state.tableCode}</span>
                    </div>

                    <div className="space-y-2">
                      {state.cartItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 bg-white rounded-xl border border-neutral-200/90 flex items-center justify-between"
                        >
                          <div>
                            <h4 className="text-xs font-bold text-neutral-900">{item.name}</h4>
                            <span className="text-[10px] text-neutral-400">{item.options || '标准规格'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-neutral-900">
                              ¥{(item.price * item.quantity).toFixed(2)}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 font-bold text-neutral-700">
                              x{item.quantity}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-neutral-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-500">预收总额</span>
                      <span className="text-base font-extrabold text-neutral-900">
                        ¥{state.cartTotal.toFixed(2)}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="w-full py-2.5 bg-neutral-900 text-white rounded-xl font-bold text-xs shadow-md"
                    >
                      确认并前往收银结算台
                    </button>
                  </div>
                </div>
              )}

              {/* 页面 6: 收银结算台 */}
              {state.screen === 'checkout' && (
                <div className="flex-1 p-4 flex flex-col justify-between bg-neutral-50 animate-fadeIn">
                  <div className="space-y-3">
                    <div className="p-3 bg-white rounded-xl border border-neutral-200 shadow-xs space-y-2">
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        堂食点单已锁台
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-500">就餐台位</span>
                        <span className="text-xs font-bold text-neutral-900">{state.tableCode} 号桌 (外摆区)</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-500">就餐人数</span>
                        <span className="text-xs font-bold text-neutral-900">3 位在席</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-500">订单流水号</span>
                        <span className="text-xs font-bold text-neutral-800">#{state.orderNo}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-neutral-200 shadow-xs space-y-2 text-xs">
                      <div className="flex items-center justify-between text-neutral-600">
                        <span>菜品金额</span>
                        <span className="font-bold text-neutral-900">¥{state.cartTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-neutral-600">
                        <span>堂食餐具费</span>
                        <span className="text-emerald-600 font-bold">免收 ¥0.00</span>
                      </div>
                      <div className="flex items-center justify-between text-neutral-600">
                        <span>满减特惠</span>
                        <span className="text-rose-600 font-bold">-¥0.00</span>
                      </div>
                      <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
                        <span className="font-bold text-neutral-800">应付预收</span>
                        <span className="text-base font-extrabold text-neutral-900">
                          ¥{state.cartTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      disabled={isAssisting}
                      onClick={() => {
                        if (isAssisting) {
                          onShowToast?.('协助模式下已阻断支付权限，必须交还顾客本人手机输入密码完成支付');
                        }
                      }}
                      className={`w-full py-3 rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all ${
                        isAssisting
                          ? 'bg-neutral-800 text-neutral-400 border border-neutral-700 cursor-not-allowed'
                          : 'bg-[#07C160] hover:bg-[#06AD56] text-white cursor-pointer'
                      }`}
                    >
                      {isAssisting ? (
                        <>
                          <Lock className="w-4 h-4 text-amber-400" />
                          <span>🔒 支付环节硬性隔离 · 必须交还顾客本人确认支付</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4" />
                          <span>微信支付 · 极速付 ¥{state.cartTotal.toFixed(2)}</span>
                        </>
                      )}
                    </button>
                    <span className="text-[10px] text-neutral-400 text-center block">
                      {isAssisting
                        ? '已触发资损零风险硬性防线：代选代配已完成，扣款需客户本人确认'
                        : '由腾讯云开发云函数安全托管交易'}
                    </span>
                  </div>
                </div>
              )}

              {/* 页面 7: 支付成功凭证 */}
              {state.screen === 'payment_success' && (
                <div className="flex-1 p-5 flex flex-col justify-between bg-white text-center animate-fadeIn">
                  <div className="pt-8 space-y-3">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-extrabold text-neutral-900">支付成功 · 已成单</h3>
                      <span className="text-2xl font-black text-neutral-900 block">
                        ¥{state.cartTotal.toFixed(2)}
                      </span>
                      <p className="text-xs text-neutral-400">订单号: #{state.orderNo}</p>
                    </div>
                  </div>

                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 text-left space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">商户名称</span>
                      <span className="font-bold text-neutral-800">Urban Radar 流动餐车</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">支付渠道</span>
                      <span className="font-bold text-neutral-800">微信小程序安全分账</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">台位归属</span>
                      <span className="font-bold text-emerald-700">{state.tableCode} 号桌 (无需取餐·专送上桌)</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="w-full py-2.5 bg-neutral-900 text-white rounded-xl font-bold text-xs shadow-md"
                  >
                    查看后厨出餐进度
                  </button>
                </div>
              )}

              {/* 页面 8: 后厨出餐进度雷达 */}
              {(state.screen === 'kitchen_cooking' || state.screen === 'serving_progress') && (
                <div className="flex-1 p-4 flex flex-col justify-between bg-neutral-50 animate-fadeIn">
                  <div className="space-y-3">
                    <div className="p-3 bg-white rounded-xl border border-neutral-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
                          <h3 className="text-xs font-bold text-neutral-900">后厨炙烤排产中</h3>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                          进度: {state.kitchenProgress}%
                        </span>
                      </div>

                      <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-300"
                          style={{ width: `${state.kitchenProgress}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                        餐品状态列表
                      </span>
                      {['果木烟熏黑豚炙烤五花', '黑松露墨汁手工玉棋', '火山岩黑熔岩蛋糕'].map((dish, i) => {
                        const isServed = state.servedDishNames.includes(dish) || state.kitchenProgress >= 80;
                        return (
                          <div
                            key={dish}
                            className="p-2.5 bg-white rounded-xl border border-neutral-200/80 flex items-center justify-between"
                          >
                            <span className="text-xs font-bold text-neutral-800">{dish}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isServed
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {isServed ? '✓ 已上桌' : '炭火炙烤中'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                    <span className="text-xs font-bold text-emerald-800 block">
                      传菜员已锁位，即做即上
                    </span>
                    <span className="text-[10px] text-emerald-600">服务员：阿豪 (No.02)</span>
                  </div>
                </div>
              )}

              {/* 虚拟触控光标轨迹 ⚪ (Virtual Touch Indicator) */}
              {touch && touch.active && (
                <div
                  className="absolute pointer-events-none z-50 transition-all duration-150 ease-out -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${touch.x}%`, top: `${touch.y}%` }}
                >
                  <div className="relative flex items-center justify-center">
                    {/* 扩散水波纹 1 */}
                    <span className="w-10 h-10 rounded-full bg-emerald-400/40 animate-ping absolute" />
                    {/* 扩散水波纹 2 */}
                    <span className="w-6 h-6 rounded-full bg-white/70 shadow-lg border border-emerald-500 absolute" />
                    {/* 中心实体触控点 */}
                    <span className="w-3 h-3 rounded-full bg-emerald-600 shadow-md" />

                    {/* 触控动作标签胶囊 */}
                    {touch.label && (
                      <div className="absolute left-full ml-2 top-0 -translate-y-1/2 bg-neutral-900/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xl whitespace-nowrap border border-neutral-700 pointer-events-none z-50">
                        {touch.label}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 手机底部 Home Indicator */}
            <div className="shrink-0 h-5 bg-white flex items-center justify-center">
              <div className="w-32 h-1 bg-neutral-300 rounded-full" />
            </div>
          </div>
        </div>

        {/* 底部悬浮动作监视条 */}
        <div className="absolute bottom-4 inset-x-8 max-w-xl mx-auto bg-[#1A1D24]/95 backdrop-blur-md border border-[#2B303C] rounded-xl px-4 py-2.5 shadow-2xl flex items-center justify-between text-xs text-white z-20">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
            <div className="min-w-0">
              <span className="text-[10px] text-neutral-400 block">当前正在映射</span>
              <span className="font-bold text-neutral-100 truncate block text-[11.5px]">
                {actionName}: {currentActionDesc}
              </span>
            </div>
          </div>

          <div className="shrink-0 pl-3 border-l border-neutral-700/80 text-right">
            <span className="text-[10px] text-neutral-400 block">距上步耗时</span>
            <span className="font-bold text-emerald-400">{currentFrame?.deltaFormatted || '+0.0s'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
