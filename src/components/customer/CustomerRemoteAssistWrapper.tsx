import React, { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  MousePointer2,
  X,
  Check,
  AlertTriangle,
  FileText,
  Radio,
  Sparkles,
  ChevronRight,
  Hand
} from 'lucide-react';
import {
  remoteAssistEngine,
  RemoteAssistSession,
  RemoteAssistPayload
} from '../../utils/remoteAssistEngine';

interface CustomerRemoteAssistWrapperProps {
  children: React.ReactNode;
}

export function CustomerRemoteAssistWrapper({ children }: CustomerRemoteAssistWrapperProps) {
  const session = useSyncExternalStore(
    remoteAssistEngine.subscribeSession,
    remoteAssistEngine.getSessionSnapshot
  );

  const [countdown, setCountdown] = useState<number>(30);
  const [agreementChecked, setAgreementChecked] = useState<boolean>(false);
  const [showAgreementDrawer, setShowAgreementDrawer] = useState<boolean>(false);
  const [agreementShake, setAgreementShake] = useState<boolean>(false);

  // 实时光标状态
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [cursorState, setCursorState] = useState<'default' | 'pointer' | 'grab'>('default');
  const [cursorTooltip, setCursorTooltip] = useState<string | null>(null);
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [handOffToast, setHandOffToast] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const prevStatusRef = useRef(session?.status);

  // 监听会话状态变动
  useEffect(() => {
    if (session?.status === 'requesting' && prevStatusRef.current !== 'requesting') {
      setCountdown(30);
      setAgreementChecked(false);
    }
    if (
      (session?.status === 'terminated' || session?.status === 'timeout' || session?.status === 'handed_off') &&
      prevStatusRef.current === 'active'
    ) {
      setHandOffToast(true);
      const timer = setTimeout(() => setHandOffToast(false), 3500);
      return () => clearTimeout(timer);
    }
    prevStatusRef.current = session?.status;
  }, [session?.status]);

  // 订阅远程协助动作流 (光标移动、水波纹)
  useEffect(() => {
    const unsubPayload = remoteAssistEngine.subscribePayload((payload: RemoteAssistPayload) => {
      if (payload.type === 'CURSOR_MOVE' || payload.type === 'CLICK_RIPPLE') {
        setCursorPos({
          x: payload.normalizedX * 100,
          y: payload.normalizedY * 100
        });
        if (payload.cursorState) setCursorState(payload.cursorState);
      }

      if (payload.type === 'CLICK_RIPPLE') {
        const id = Date.now() + Math.random();
        setRipples((prev) => [...prev, { id, x: payload.normalizedX * 100, y: payload.normalizedY * 100 }]);
        setTimeout(() => {
          setRipples((prev) => prev.filter((r) => r.id !== id));
        }, 800);
      }

      if (payload.tooltipText) {
        setCursorTooltip(payload.tooltipText);
        setTimeout(() => setCursorTooltip(null), 1800);
      }

      if (payload.type === 'HAND_OFF') {
        setHandOffToast(true);
        setTimeout(() => setHandOffToast(false), 4000);
      }
    });

    return () => {
      unsubPayload();
    };
  }, []);

  // 请求倒计时驱动
  useEffect(() => {
    if (session?.status !== 'requesting' || !session?.sessionId) return;
    const currentSessionId = session.sessionId;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          remoteAssistEngine.respondAssistRequest(currentSessionId, false, false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [session?.status, session?.sessionId]);

  const handleAgreeClick = () => {
    if (!agreementChecked) {
      setAgreementShake(true);
      setTimeout(() => setAgreementShake(false), 600);
      return;
    }
    if (session) {
      remoteAssistEngine.respondAssistRequest(session.sessionId, true, true);
    }
  };

  const handleRejectClick = () => {
    if (session) {
      remoteAssistEngine.respondAssistRequest(session.sessionId, false, false);
    }
  };

  const handleTerminateClick = () => {
    remoteAssistEngine.terminateAssist('terminated');
  };

  const isActive = session?.status === 'active' || session?.status === 'reconnecting';
  const isReconnecting = session?.status === 'reconnecting';
  const isRequesting = session?.status === 'requesting';

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden select-none">
      {/* 主视口容器：受控协助时平滑微缩 10% (scale 0.9) */}
      <div
        className={`w-full h-full transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isActive
            ? 'scale-[0.90] ring-2 ring-emerald-500/50 rounded-2xl shadow-2xl overflow-hidden'
            : 'scale-100'
        }`}
        style={{ transformOrigin: 'center center' }}
      >
        {children}

        {/* 全透明交互防误触层：协助中时拦截手指，无任何暗黑/磨砂遮挡 */}
        {isActive && (
          <div
            className="absolute inset-0 z-40 bg-transparent cursor-none touch-none"
            aria-label="店员辅助操作中，屏幕全透锁定"
          />
        )}
      </div>

      {/* 动态矢量光标与水波纹渲染 (仅在协助激活态呈现) */}
      {isActive && (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
          {/* 实时光标指针 */}
          <div
            className="absolute transition-transform duration-75 ease-out -translate-x-1 -translate-y-1"
            style={{
              left: `${cursorPos.x}%`,
              top: `${cursorPos.y}%`,
              transform: 'translate3d(0, 0, 0)'
            }}
          >
            {/* 极细翡翠极光拖尾光晕 */}
            <div className="absolute -inset-2 rounded-full bg-emerald-400/20 blur-[2px] animate-pulse" />

            {/* 矢量指针根据三态切换 */}
            {cursorState === 'grab' ? (
              <Hand className="w-5 h-5 text-emerald-500 drop-shadow-md fill-white" />
            ) : cursorState === 'pointer' ? (
              <MousePointer2 className="w-5 h-5 text-emerald-500 drop-shadow-md fill-emerald-100" />
            ) : (
              <MousePointer2 className="w-5 h-5 text-neutral-900 drop-shadow-md fill-white stroke-[1.5]" />
            )}

            {/* 店员操作免通话轻量提示气泡 */}
            {cursorTooltip && (
              <div className="absolute left-6 -top-2 bg-neutral-900/95 text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow-xl border border-neutral-700 whitespace-nowrap animate-fadeIn">
                {cursorTooltip}
              </div>
            )}
          </div>

          {/* 点击触控水波纹 */}
          {ripples.map((rip) => (
            <div
              key={rip.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: `${rip.x}%`, top: `${rip.y}%` }}
            >
              <span className="w-12 h-12 rounded-full bg-emerald-400/35 border border-emerald-500/60 animate-ping absolute -inset-6" />
              <span className="w-4 h-4 rounded-full bg-emerald-500/50 shadow-sm absolute -inset-2" />
            </div>
          ))}
        </div>
      )}

      {/* 底部常驻工控协同状态胶囊条 */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-3 inset-x-4 max-w-sm mx-auto z-50 bg-neutral-900/95 backdrop-blur-md border border-neutral-700/90 rounded-full px-3.5 py-2 shadow-2xl flex items-center justify-between text-white"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isReconnecting ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
              <div className="min-w-0">
                <span className="text-xs font-bold text-neutral-100 block truncate">
                  {isReconnecting ? '协助信令弱网重连中…' : '当前正在进行辅助点餐中'}
                </span>
                <span className="text-[10px] text-neutral-400 block truncate">
                  店员 {session?.operatorStaffName || '店长'} 协同操作中 · 支付环节已规避
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTerminateClick}
              className="h-7 px-3 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded-full text-xs font-bold shrink-0 transition-colors cursor-pointer shadow-xs ml-2"
            >
              终止协助
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 协助交接仪式轻柔 Toast */}
      <AnimatePresence>
        {handOffToast && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute top-16 inset-x-6 max-w-sm mx-auto z-50 bg-emerald-950/95 border border-emerald-500/80 rounded-xl p-3 shadow-2xl text-white text-center"
          >
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-300">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>店员已协助为您配齐餐品，请您核对确认</span>
            </div>
            <p className="text-[10px] text-emerald-200/80 mt-1">
              屏幕已交还给您，请在下方购物车核对菜品并由您本人完成最终支付
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 商家申请协助授权与协议门控弹窗 */}
      <AnimatePresence>
        {isRequesting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              className="w-full max-w-sm bg-white rounded-2xl border border-neutral-200/90 shadow-2xl p-5 text-neutral-900 space-y-4"
            >
              {/* 弹窗头部 */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-neutral-900 tracking-tight">
                      餐车店长申请协助您点餐
                    </h3>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      {countdown}s
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    来自 {session?.operatorStaffName || '店长'} · 台位 {session?.tableCode || 'A2'}
                  </p>
                </div>
              </div>

              {/* 说明主体与安全承诺 */}
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 space-y-2 text-xs text-neutral-600">
                <div className="flex items-center gap-1.5 font-bold text-neutral-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>安全与隐私保护声明</span>
                </div>
                <ul className="space-y-1 text-[11.5px] text-neutral-500 list-disc list-inside">
                  <li>协助期间界面 100% 透明可见，清晰展现操作动线；</li>
                  <li><strong className="text-neutral-700">绝对规避支付环节</strong>，最终扣款必须由您亲自核对确认；</li>
                  <li>您享有绝对控制权，可在屏幕底部随时一键终止。</li>
                </ul>
              </div>

              {/* 强制勾选协议门控 */}
              <div className={`p-2.5 rounded-xl border transition-all ${
                agreementShake ? 'border-rose-400 bg-rose-50/50 animate-shake' : 'border-neutral-200/80 bg-white'
              }`}>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreementChecked}
                    onChange={(e) => setAgreementChecked(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 border-neutral-300 cursor-pointer"
                  />
                  <div className="text-xs text-neutral-600 leading-snug">
                    <span>我已充分阅读并同意 </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowAgreementDrawer(true);
                      }}
                      className="text-emerald-700 hover:text-emerald-800 font-bold underline cursor-pointer inline-flex items-center gap-0.5"
                    >
                      《远程协同辅助点餐授权与隐私保护协议》
                    </button>
                  </div>
                </label>
                {agreementShake && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>请先勾选同意服务协议后方可开启协助</span>
                  </p>
                )}
              </div>

              {/* 动作按键组 */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleRejectClick}
                  className="h-9 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  婉拒协助
                </button>

                <button
                  type="button"
                  onClick={handleAgreeClick}
                  disabled={!agreementChecked}
                  className={`h-9 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-sm ${
                    agreementChecked
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer ring-2 ring-emerald-500/20'
                      : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>同意并开启协助</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 完整协议条款抽屉 */}
      <AnimatePresence>
        {showAgreementDrawer && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-xs select-none">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="w-full max-w-lg bg-white rounded-t-2xl border-t border-neutral-200 p-5 text-neutral-900 max-h-[80vh] flex flex-col space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-sm font-bold text-neutral-900">
                    远程协同辅助点餐授权与隐私保护协议
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAgreementDrawer(false)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 text-xs text-neutral-600 pr-1 leading-relaxed custom-scrollbar">
                <p>
                  欢迎使用 Urban Radar 流动餐车远程协同辅助点餐服务。为了保障您的合法权益及信息安全，请您审慎阅读本协议条款：
                </p>
                <div className="p-2.5 bg-neutral-50 rounded-lg space-y-1.5 border border-neutral-100">
                  <h5 className="font-bold text-neutral-800">一、协助范围限定</h5>
                  <p className="text-neutral-500">
                    本授权仅限于餐车工作人员在电脑端对当前菜单、菜品详情、口味规格及优惠满减进行辅助演示与勾选。
                  </p>
                </div>
                <div className="p-2.5 bg-neutral-50 rounded-lg space-y-1.5 border border-neutral-100">
                  <h5 className="font-bold text-neutral-800">二、资金安全与支付绝对隔离</h5>
                  <p className="text-neutral-500">
                    工作人员严禁代客付款，系统已在代码层面强行阻断支付按钮。所有金额结算与支付密码输入必须由您本人在自身手机上最终确认。
                  </p>
                </div>
                <div className="p-2.5 bg-neutral-50 rounded-lg space-y-1.5 border border-neutral-100">
                  <h5 className="font-bold text-neutral-800">三、全透明可见与即时终止权</h5>
                  <p className="text-neutral-500">
                    协助期间屏幕保持 100% 全透明，指针与动作实时清晰呈现。您可在屏幕底部随时点击「终止协助」立即收回全部控制权。
                  </p>
                </div>
                <div className="p-2.5 bg-neutral-50 rounded-lg space-y-1.5 border border-neutral-100">
                  <h5 className="font-bold text-neutral-800">四、行为存证与纠纷溯源</h5>
                  <p className="text-neutral-500">
                    为保障服务质量，协助过程中的操作时间戳、真实出口 IP 及所加菜品将记录在毫秒级全链路审计时间流中供复盘核验。
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAgreementChecked(true);
                    setShowAgreementDrawer(false);
                  }}
                  className="w-full h-9 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  我已阅读并理解，同意协议
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
