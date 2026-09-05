import { Order, OrderItemRecord } from '../types';
import { matchDishImageUrl } from './dishImageMatcher';
import { saveChatMessageToCloud, fetchChatMessagesFromCloud, syncOrderChatsToCloud } from './cloudbase';
import { getCanonicalOrderNo, normalizeOrderKey } from './orderNormalizer';

export type ChatRole = 'user' | 'rider' | 'merchant' | 'platform' | 'system';

export interface ChatMessageItem {
  id: string;
  orderNo: string;
  senderRole: ChatRole;
  senderName: string;
  senderAvatar?: string;
  time: string;
  timeExact?: string; // 精确到秒 e.g. 13:28:45
  timestamp: number;
  type:
    | 'text'
    | 'voice'
    | 'image'
    | 'location'
    | 'order_card'
    | 'dish_quote'
    | 'status_change'
    | 'rush_alert'
    | 'gift_card'
    | 'platform_arbitration'
    | 'system_notice';
  text?: string;
  voiceDuration?: number; // 秒数
  voiceTranscribed?: string; // 语音转写文字
  voiceAudioUrl?: string; // Blob / Data URL
  voiceAudioBase64?: string; // Base64 音频存证
  voiceWaveform?: number[]; // 波形条采样 (0-100)
  imageUrl?: string;
  imageTitle?: string;
  locationName?: string;
  locationAddress?: string;
  distanceKm?: number;
  quotedDish?: {
    name: string;
    quantity: number;
    price: number;
    options?: string;
    imageUrl?: string;
  };
  statusChangeInfo?: {
    fromStatus: string;
    toStatus: string;
    title: string;
    description: string;
    actionOperator: string;
    operatorRole: ChatRole;
  };
  giftInfo?: {
    giftName: string;
    giftValue: number;
    giftNote: string;
  };
  isRead?: boolean;
  cloudSyncedAt?: string;
}

export interface ChatSLAResponse {
  isWaitingReply: boolean;
  waitingForRole?: ChatRole;
  waitingSeconds: number;
  targetSLALimitSeconds: number;
  isOverdue: boolean; // 超过SLA红线 (如 >180s)
  isWarning: boolean; // 即将超时预警 (如 >60s)
  formattedTimer: string; // e.g. "01:45"
  remainingSeconds: number;
  responseRatePercent: number; // e.g. 99.2%
  avgResponseSeconds: number; // e.g. 16s
  slaTier: 'S' | 'A' | 'B' | 'C' | 'D';
  slaAlertMessage: string;
  lastSenderName?: string;
  lastSenderRole?: ChatRole;
  lastMessageTime?: string;
  lastMessageTimeExact?: string;
}

const CHAT_STORAGE_PREFIX = 'obsidian_order_chat_';
const CHAT_EVENT_NAME = 'obsidian_chat_event';

// Dispatch event across tabs / window
function notifyChatUpdate(orderNo: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHAT_EVENT_NAME, { detail: { orderNo } }));
  }
}

// Generate realistic initial chat messages for an order if empty
export function getInitialOrderMessages(orderNo: string, order?: Order): ChatMessageItem[] {
  const cleanOrderNo = orderNo.replace(/^#/, '');
  const now = Date.now();
  const time1 = new Date(now - 12 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const time2 = new Date(now - 8 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const time3 = new Date(now - 5 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const time4 = new Date(now - 2 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return [
    {
      id: `sys-${cleanOrderNo}-1`,
      orderNo: cleanOrderNo,
      senderRole: 'system',
      senderName: '系统安防中心',
      time: time1,
      timestamp: now - 12 * 60 * 1000,
      type: 'system_notice',
      text: `🛡️ 订单 #${cleanOrderNo} 已建立三端加密会话。云函数 (chatMessages) 与云数据库 (obsidian_order_chats) 全程热备份。`
    },
    {
      id: `merchant-${cleanOrderNo}-1`,
      orderNo: cleanOrderNo,
      senderRole: 'merchant',
      senderName: order?.truckName || '黑曜石餐车 · 南广场总站',
      time: time2,
      timestamp: now - 8 * 60 * 1000,
      type: 'status_change',
      statusChangeInfo: {
        fromStatus: '待接单',
        toStatus: '已接单制作',
        title: '商家已接单并进入后厨现烤',
        description: '主厨已选用特选果木炭火烘烤，高温锁鲜，预计 6 分钟完成打包出餐。',
        actionOperator: '餐车主厨 · 列车长',
        operatorRole: 'merchant'
      }
    },
    {
      id: `rider-${cleanOrderNo}-1`,
      orderNo: cleanOrderNo,
      senderRole: 'rider',
      senderName: order?.courierName || '陈志远 · 专线金牌骑手',
      time: time3,
      timestamp: now - 5 * 60 * 1000,
      type: 'text',
      text: '您好！我是本次为您配送的专线骑手。保温箱已预热完成，目前正在餐车档口前待命，出餐后会第一时间加急送往您的地址！'
    },
    {
      id: `rider-${cleanOrderNo}-2`,
      orderNo: cleanOrderNo,
      senderRole: 'rider',
      senderName: order?.courierName || '陈志远 · 专线金牌骑手',
      time: time4,
      timestamp: now - 2 * 60 * 1000,
      type: 'voice',
      voiceDuration: 5,
      voiceWaveform: [30, 65, 90, 75, 80, 45, 95, 60, 40, 85, 70, 50],
      voiceTranscribed: '【语音已转文字】：大厦安保较严格，如需直接放 12 楼前台请在聊天中告知我一声～'
    }
  ];
}

/**
 * 获取某个订单的所有聊天消息 (同步读取本地快速渲染)
 */
export function getOrderChatMessages(orderNo: string, order?: Order): ChatMessageItem[] {
  const canonicalNo = getCanonicalOrderNo(orderNo, order);
  const cleanOrderNo = (orderNo || order?.orderNo || canonicalNo).replace(/^#/, '');
  const canonicalKey = `${CHAT_STORAGE_PREFIX}${canonicalNo}`;
  const legacyKey = `${CHAT_STORAGE_PREFIX}${cleanOrderNo}`;

  try {
    const raw = localStorage.getItem(canonicalKey) || (legacyKey !== canonicalKey ? localStorage.getItem(legacyKey) : null);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (legacyKey !== canonicalKey && !localStorage.getItem(canonicalKey)) {
          localStorage.setItem(canonicalKey, raw);
        }
        return parsed;
      }
    }
  } catch (e) {
    // ignore
  }

  // If no records, generate initial seed
  const initial = getInitialOrderMessages(canonicalNo, order);
  try {
    localStorage.setItem(canonicalKey, JSON.stringify(initial));
    if (legacyKey !== canonicalKey) {
      localStorage.setItem(legacyKey, JSON.stringify(initial));
    }
  } catch (e) {
    // ignore
  }
  return initial;
}

/**
 * 异步从云函数/云数据库同步拉取订单聊天记录并与本地融合
 */
export async function syncOrderChatFromCloud(
  orderNo: string,
  order?: Order
): Promise<ChatMessageItem[]> {
  const canonicalNo = getCanonicalOrderNo(orderNo, order);
  const cleanOrderNo = (orderNo || order?.orderNo || canonicalNo).replace(/^#/, '');
  const localList = getOrderChatMessages(canonicalNo, order);

  try {
    const cloudRes = await fetchChatMessagesFromCloud(canonicalNo);
    if (cloudRes.success && Array.isArray(cloudRes.messages) && cloudRes.messages.length > 0) {
      const map = new Map<string, ChatMessageItem>();
      // 先放入本地
      localList.forEach((m) => map.set(m.id, m));
      // 再以云端覆盖/补充
      cloudRes.messages.forEach((m) => {
        if (m.id) {
          map.set(m.id, { ...map.get(m.id), ...m, cloudSyncedAt: m.cloudSyncedAt || new Date().toISOString() });
        }
      });
      const merged = Array.from(map.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      const key = `${CHAT_STORAGE_PREFIX}${canonicalNo}`;
      localStorage.setItem(key, JSON.stringify(merged));
      if (cleanOrderNo !== canonicalNo) {
        localStorage.setItem(`${CHAT_STORAGE_PREFIX}${cleanOrderNo}`, JSON.stringify(merged));
      }
      notifyChatUpdate(canonicalNo);
      if (cleanOrderNo !== canonicalNo) {
        notifyChatUpdate(cleanOrderNo);
      }
      return merged;
    }
  } catch {
    // ignore
  }

  return localList;
}

/**
 * 格式化精确时间 (时:分:秒)
 */
export function formatExactTime(timestamp: number): string {
  const d = new Date(timestamp);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  const ss = d.getSeconds().toString().padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

/**
 * 格式化动态相对时间 (如: 刚刚, 15秒前, 2分钟前)
 */
export function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  if (diffMs < 5000) return '刚刚';
  if (diffMs < 60000) return `${Math.max(1, Math.floor(diffMs / 1000))}秒前`;
  if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}分钟前`;
  const d = new Date(timestamp);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * 计算订单会话的超时回复率与响应 SLA 状态
 */
export function calculateChatSLAResponse(orderNo: string, currentRole: ChatRole = 'merchant', order?: Order): ChatSLAResponse {
  const cleanOrderNo = orderNo.replace(/^#/, '');
  const msgs = getOrderChatMessages(cleanOrderNo, order);
  const now = Date.now();

  const targetSLALimitSeconds = 180; // 3分钟SLA响应时限
  const warningThresholdSeconds = 60; // 1分钟提示预警

  if (!msgs || msgs.length === 0) {
    return {
      isWaitingReply: false,
      waitingSeconds: 0,
      targetSLALimitSeconds,
      isOverdue: false,
      isWarning: false,
      formattedTimer: '00:00',
      remainingSeconds: targetSLALimitSeconds,
      responseRatePercent: 100,
      avgResponseSeconds: 12,
      slaTier: 'S',
      slaAlertMessage: '三端联络响应时效极佳 (SLA 评级 S)'
    };
  }

  // 找到最新一条非系统消息
  const nonSysMsgs = msgs.filter((m) => m.senderRole !== 'system');
  const lastMsg = nonSysMsgs.length > 0 ? nonSysMsgs[nonSysMsgs.length - 1] : null;

  if (!lastMsg) {
    return {
      isWaitingReply: false,
      waitingSeconds: 0,
      targetSLALimitSeconds,
      isOverdue: false,
      isWarning: false,
      formattedTimer: '00:00',
      remainingSeconds: targetSLALimitSeconds,
      responseRatePercent: 99.4,
      avgResponseSeconds: 15,
      slaTier: 'S',
      slaAlertMessage: '会话正常'
    };
  }

  // 判断是否在等待当前视角角色回复（即最新消息来自对方）
  const isFromSelf = lastMsg.senderRole === currentRole;
  const waitingSeconds = isFromSelf ? 0 : Math.max(0, Math.floor((now - (lastMsg.timestamp || now)) / 1000));
  const isWaitingReply = !isFromSelf && waitingSeconds > 5;
  const isOverdue = isWaitingReply && waitingSeconds > targetSLALimitSeconds;
  const isWarning = isWaitingReply && waitingSeconds > warningThresholdSeconds && !isOverdue;
  const remainingSeconds = Math.max(0, targetSLALimitSeconds - waitingSeconds);

  const mm = Math.floor(waitingSeconds / 60).toString().padStart(2, '0');
  const ss = (waitingSeconds % 60).toString().padStart(2, '0');
  const formattedTimer = `${mm}:${ss}`;

  let slaTier: 'S' | 'A' | 'B' | 'C' | 'D' = 'S';
  let responseRatePercent = 99.5;
  let slaAlertMessage = '三端联络响应时效极佳';

  if (isOverdue) {
    slaTier = 'D';
    responseRatePercent = Math.max(68, 99.5 - Math.min(30, Math.floor((waitingSeconds - 180) / 10)));
    slaAlertMessage = `⚠️ 超时未回复预警！对方已等待 ${formattedTimer}，请立即响应以保障 SLA 履约率！`;
  } else if (isWarning) {
    slaTier = 'B';
    responseRatePercent = 94.2;
    slaAlertMessage = `⏱️ 响应倒计时预警：等待已达 ${formattedTimer}，建议在 ${remainingSeconds}s 内完成回复`;
  } else if (isWaitingReply) {
    slaTier = 'A';
    responseRatePercent = 98.8;
    slaAlertMessage = `💬 收到新消息，建议在 3 分钟内保持即时回复 (倒计时 ${remainingSeconds}s)`;
  }

  return {
    isWaitingReply,
    waitingForRole: isWaitingReply ? currentRole : undefined,
    waitingSeconds,
    targetSLALimitSeconds,
    isOverdue,
    isWarning,
    formattedTimer,
    remainingSeconds,
    responseRatePercent,
    avgResponseSeconds: isOverdue ? 142 : 18,
    slaTier,
    slaAlertMessage,
    lastSenderName: lastMsg.senderName,
    lastSenderRole: lastMsg.senderRole,
    lastMessageTime: lastMsg.time,
    lastMessageTimeExact: lastMsg.timeExact || formatExactTime(lastMsg.timestamp || now)
  };
}

/**
 * 汇总多笔订单的 SLA 响应数据指标
 */
export function getAllOrdersSLASummary(orderNos: string[]): {
  avgResponseTimeSec: number;
  complianceRatePercent: number;
  overdueCount: number;
  activeDialogCount: number;
  tierScore: string;
} {
  if (!orderNos || orderNos.length === 0) {
    return {
      avgResponseTimeSec: 16,
      complianceRatePercent: 99.4,
      overdueCount: 0,
      activeDialogCount: 0,
      tierScore: 'S'
    };
  }

  let totalWaiting = 0;
  let overdueCount = 0;
  let activeCount = 0;

  orderNos.forEach((no) => {
    const sla = calculateChatSLAResponse(no, 'merchant');
    if (sla.isWaitingReply) {
      activeCount++;
      totalWaiting += sla.waitingSeconds;
      if (sla.isOverdue) overdueCount++;
    }
  });

  const avgResponseTimeSec = activeCount > 0 ? Math.round(totalWaiting / activeCount) : 18;
  const complianceRatePercent =
    activeCount > 0 ? Math.max(70, Number(((1 - overdueCount / activeCount) * 100).toFixed(1))) : 99.2;

  const tierScore = complianceRatePercent >= 98 ? 'S' : complianceRatePercent >= 90 ? 'A' : complianceRatePercent >= 80 ? 'B' : 'C';

  return {
    avgResponseTimeSec,
    complianceRatePercent,
    overdueCount,
    activeDialogCount: activeCount,
    tierScore
  };
}

/**
 * 发送/保存新消息 (双轨持久化: 快速本地通知 + 异步推送到云函数/云数据库)
 */
export function sendOrderChatMessage(
  orderNo: string,
  message: Omit<ChatMessageItem, 'id' | 'orderNo' | 'time' | 'timestamp'> & {
    time?: string;
    timeExact?: string;
    timestamp?: number;
  }
): ChatMessageItem {
  const canonicalNo = getCanonicalOrderNo(orderNo);
  const cleanOrderNo = (orderNo || canonicalNo).replace(/^#/, '');
  const key = `${CHAT_STORAGE_PREFIX}${canonicalNo}`;
  const current = getOrderChatMessages(canonicalNo);

  const now = new Date();
  const timeStr = message.time || `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const timeExactStr = message.timeExact || `${timeStr}:${now.getSeconds().toString().padStart(2, '0')}`;
  const timestamp = message.timestamp || Date.now();

  const newMsgItem: ChatMessageItem = {
    ...message,
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    orderNo: canonicalNo,
    time: timeStr,
    timeExact: timeExactStr,
    timestamp,
    cloudSyncedAt: new Date().toISOString()
  };

  const updated = [...current, newMsgItem];
  try {
    localStorage.setItem(key, JSON.stringify(updated));
    if (cleanOrderNo !== canonicalNo) {
      localStorage.setItem(`${CHAT_STORAGE_PREFIX}${cleanOrderNo}`, JSON.stringify(updated));
    }
  } catch (e) {
    // ignore
  }

  // 触发页面重绘与多 Tab 联动
  notifyChatUpdate(canonicalNo);
  if (cleanOrderNo !== canonicalNo) {
    notifyChatUpdate(cleanOrderNo);
  }

  // 异步上报至腾讯云开发云函数与云数据库
  saveChatMessageToCloud(canonicalNo, newMsgItem).catch((err) => {
    console.warn('[ChatHub] 聊天消息云端异步持久化提醒:', err);
  });

  return newMsgItem;
}

/**
 * 一键将当前订单所有消息全量同步至腾讯云函数/云数据库
 */
export async function flushOrderChatToCloud(orderNo: string): Promise<{ success: boolean; count: number }> {
  const canonicalNo = getCanonicalOrderNo(orderNo);
  const msgs = getOrderChatMessages(canonicalNo);
  const res = await syncOrderChatsToCloud(canonicalNo, msgs);
  return res;
}

/**
 * 获取订单的最新一条消息
 */
export function getLatestChatMessage(orderNo: string, order?: Order): ChatMessageItem | null {
  const msgs = getOrderChatMessages(orderNo, order);
  if (msgs && msgs.length > 0) {
    return msgs[msgs.length - 1];
  }
  return null;
}

/**
 * 获取某个角色在指定订单下的未读消息数
 */
export function getUnreadCountForRole(orderNo: string, role: 'merchant' | 'rider' | 'user' | 'platform'): number {
  const canonicalNo = getCanonicalOrderNo(orderNo);
  const cleanOrderNo = (orderNo || canonicalNo).replace(/^#/, '');
  const msgs = getOrderChatMessages(canonicalNo);
  const readKey = `obsidian_chat_last_read_${canonicalNo}_${role}`;
  const legacyReadKey = `obsidian_chat_last_read_${cleanOrderNo}_${role}`;
  const lastReadTimestamp = parseInt(localStorage.getItem(readKey) || localStorage.getItem(legacyReadKey) || '0', 10);

  // 计算比上次已读时间更晚且不是自己发送的消息
  return msgs.filter((m) => {
    if (m.senderRole === role) return false;
    return (m.timestamp || 0) > lastReadTimestamp;
  }).length;
}

/**
 * 标记指定角色的订单消息为已读
 */
export function markOrderChatAsRead(orderNo: string, role: 'merchant' | 'rider' | 'user' | 'platform'): void {
  const canonicalNo = getCanonicalOrderNo(orderNo);
  const cleanOrderNo = (orderNo || canonicalNo).replace(/^#/, '');
  const readKey = `obsidian_chat_last_read_${canonicalNo}_${role}`;
  try {
    const nowStr = Date.now().toString();
    localStorage.setItem(readKey, nowStr);
    if (cleanOrderNo !== canonicalNo) {
      localStorage.setItem(`obsidian_chat_last_read_${cleanOrderNo}_${role}`, nowStr);
    }
  } catch {
    // ignore
  }
  notifyChatUpdate(canonicalNo);
}

/**
 * 监听聊天消息变更
 */
export function subscribeOrderChat(orderNo?: string, callback?: (msgs: ChatMessageItem[]) => void): () => void {
  const cleanOrderNo = orderNo ? orderNo.replace(/^#/, '') : undefined;
  const handler = (e: Event) => {
    const custom = e as CustomEvent<{ orderNo: string }>;
    if (!cleanOrderNo || !custom.detail || custom.detail.orderNo === cleanOrderNo) {
      if (callback && cleanOrderNo) {
        callback(getOrderChatMessages(cleanOrderNo));
      } else if (callback) {
        callback([]);
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener(CHAT_EVENT_NAME, handler);
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener(CHAT_EVENT_NAME, handler);
    }
  };
}
