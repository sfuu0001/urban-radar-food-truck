/**
 * 远程协同辅助点餐中枢 (Remote Assist & Live Screen Mirror Engine)
 * 管理商家 CCTV ── 食客手机端的双端握手、协议门控、坐标归一化、全透防误触与超时熔断
 */

export interface RemoteAssistSession {
  sessionId: string;
  tableId: string;
  tableCode: string;
  orderNo: string;
  operatorStaffId: string;
  operatorStaffName: string;
  targetClientIp: string;
  agreementAccepted: boolean;
  agreementVersion: string;
  status: 'idle' | 'requesting' | 'active' | 'reconnecting' | 'handed_off' | 'rejected' | 'terminated' | 'timeout';
  requestedAt: number;
  authorizedAt?: number;
  terminatedAt?: number;
}

export interface RemoteAssistPayload {
  sessionId: string;
  type: 'CURSOR_MOVE' | 'CLICK_RIPPLE' | 'SCROLL_OFFSET' | 'SELECT_SPEC' | 'ADD_CART' | 'HAND_OFF';
  normalizedX: number; // 0.000 ~ 1.000
  normalizedY: number; // 0.000 ~ 1.000
  scrollOffsetY?: number;
  targetSkuId?: string;
  selectedSpecs?: Record<string, string>;
  tooltipText?: string;
  cursorState?: 'default' | 'pointer' | 'grab';
  timestampMs: number;
}

const BROADCAST_CHANNEL_NAME = 'urban_radar_remote_assist_bus';
const SESSION_STORAGE_KEY = 'urban_radar_active_assist_session';
const SESSION_TIMEOUT_MS = 60000; // 60秒无交互自动超时熔断

class RemoteAssistBroker {
  private channel: BroadcastChannel | null = null;
  private currentSession: RemoteAssistSession | null = null;
  private sessionListeners = new Set<(session: RemoteAssistSession | null) => void>();
  private payloadListeners = new Set<(payload: RemoteAssistPayload) => void>();
  private heartbeatTimer: number | null = null;
  private lastActivityTime = Date.now();

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        this.channel.onmessage = (event) => {
          this.handleIncomingMessage(event.data);
        };
      } catch {
        // BroadcastChannel 降级
      }

      window.addEventListener('storage', (e) => {
        if (e.key === SESSION_STORAGE_KEY && e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            this.updateSessionLocal(parsed);
          } catch {
            // ignore
          }
        }
      });

      // 加载初始会话
      try {
        const raw = localStorage.getItem(SESSION_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Date.now() - parsed.requestedAt < SESSION_TIMEOUT_MS * 5) {
            this.currentSession = parsed;
          }
        }
      } catch {
        // ignore
      }

      // 启动超时自愈看门狗
      this.startWatchdog();
    }
  }

  private startWatchdog() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = window.setInterval(() => {
      if (this.currentSession && this.currentSession.status === 'active') {
        if (Date.now() - this.lastActivityTime > SESSION_TIMEOUT_MS) {
          this.terminateAssist('timeout');
        }
      }
    }, 5000);
  }

  private handleIncomingMessage(msg: { type: string; payload: unknown }) {
    if (!msg) return;
    if (msg.type === 'SESSION_UPDATE') {
      this.updateSessionLocal(msg.payload as RemoteAssistSession);
    } else if (msg.type === 'ASSIST_EVENT') {
      this.lastActivityTime = Date.now();
      const payload = msg.payload as RemoteAssistPayload;
      this.payloadListeners.forEach((fn) => fn(payload));
    }
  }

  private updateSessionLocal(session: RemoteAssistSession | null) {
    this.currentSession = session;
    this.lastActivityTime = Date.now();
    try {
      if (session) {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
    this.sessionListeners.forEach((fn) => fn(session));
  }

  public getSession(): RemoteAssistSession | null {
    return this.currentSession;
  }

  /** 发起远程协助请求 (商家端 CCTV 触发) */
  public startAssistRequest(tableId: string, tableCode: string, orderNo: string, staffName = '餐车店长 (No.01)', targetIp = '116.228.188.42') {
    const session: RemoteAssistSession = {
      sessionId: `assist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tableId,
      tableCode,
      orderNo,
      operatorStaffId: 'staff-01',
      operatorStaffName: staffName,
      targetClientIp: targetIp,
      agreementAccepted: false,
      agreementVersion: 'v1.2.0',
      status: 'requesting',
      requestedAt: Date.now()
    };
    this.updateSessionLocal(session);
    this.channel?.postMessage({ type: 'SESSION_UPDATE', payload: session });
    return session;
  }

  /** 食客端回应协助请求 (同意或拒绝) */
  public respondAssistRequest(sessionId: string, accepted: boolean, agreementAccepted = true) {
    if (!this.currentSession || this.currentSession.sessionId !== sessionId) return;

    const nextSession: RemoteAssistSession = {
      ...this.currentSession,
      agreementAccepted,
      status: accepted ? 'active' : 'rejected',
      authorizedAt: accepted ? Date.now() : undefined
    };
    this.updateSessionLocal(nextSession);
    this.channel?.postMessage({ type: 'SESSION_UPDATE', payload: nextSession });
  }

  /** 商家发送交互指令 (光标移动/点击/选规格/加购) */
  public sendAssistEvent(event: Omit<RemoteAssistPayload, 'sessionId' | 'timestampMs'>) {
    if (!this.currentSession || this.currentSession.status !== 'active') return;

    this.lastActivityTime = Date.now();
    const payload: RemoteAssistPayload = {
      ...event,
      sessionId: this.currentSession.sessionId,
      timestampMs: Date.now()
    };
    this.payloadListeners.forEach((fn) => fn(payload));
    this.channel?.postMessage({ type: 'ASSIST_EVENT', payload });
  }

  /** 终止协助 (商家退出、食客终止、或超时) */
  public terminateAssist(reason: 'terminated' | 'timeout' = 'terminated') {
    if (!this.currentSession) return;

    const nextSession: RemoteAssistSession = {
      ...this.currentSession,
      status: reason,
      terminatedAt: Date.now()
    };
    this.updateSessionLocal(nextSession);
    this.channel?.postMessage({ type: 'SESSION_UPDATE', payload: nextSession });

    // 延迟清理
    setTimeout(() => {
      if (this.currentSession && this.currentSession.sessionId === nextSession.sessionId) {
        this.updateSessionLocal(null);
      }
    }, 2000);
  }

  /** 订阅会话状态变动 (兼容 useSyncExternalStore 及事件驱动) */
  public subscribeSession = (callback: (session?: RemoteAssistSession | null) => void): () => void => {
    this.sessionListeners.add(callback);
    return () => {
      this.sessionListeners.delete(callback);
    };
  };

  /** 获取当前会话同步快照 */
  public getSessionSnapshot = (): RemoteAssistSession | null => {
    return this.currentSession;
  };

  /** 订阅实时光标与触控事件 */
  public subscribePayload(callback: (payload: RemoteAssistPayload) => void): () => void {
    this.payloadListeners.add(callback);
    return () => {
      this.payloadListeners.delete(callback);
    };
  }
}

export const remoteAssistEngine = new RemoteAssistBroker();

/** 坐标归一化算法 (商家视口像素 -> 0.000~1.000) */
export function normalizeCoordinates(
  clientX: number,
  clientY: number,
  containerRect: DOMRect
): { x: number; y: number } {
  const relX = clientX - containerRect.left;
  const relY = clientY - containerRect.top;
  const x = Math.max(0, Math.min(1, relX / containerRect.width));
  const y = Math.max(0, Math.min(1, relY / containerRect.height));
  return { x: Number(x.toFixed(4)), y: Number(y.toFixed(4)) };
}
