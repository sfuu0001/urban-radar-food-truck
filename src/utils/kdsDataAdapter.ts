import { KdsTicket, KdsTicketItem } from '../types';
import { getOrGeneratePickupCode, getPickupShelfCode } from './pickupCodeEngine';

export interface TimelineStep {
  step?: string;
  label: string;
  time: string;
  operator?: string;
  diff?: string;
  isCurrent?: boolean;
  status?: 'completed' | 'current' | 'pending';
  note?: string;
}

export interface KdsCardItem {
  id: string;
  name: string;
  quantity: number;
  spec: string;
  statusText: string;
  statusDuration: string;
  isCompleted: boolean;
  station?: string;
  timeline: {
    totalDuration: string;
    orderedAt: string;
    prepAt: string;
    cookingAt: string;
    servedAt: string | null;
    steps: TimelineStep[];
  };
}

export interface KdsCardData {
  id: string;
  ticketNo: string;
  channel: 'dine_in' | 'delivery' | 'pickup' | 'expedited';
  title: string;
  statusTag: string;
  statusTagColor: string;
  orderTime: string;
  elapsedSeconds: number;
  elapsedMinutes: number;
  slaTier: 'smooth' | 'peak' | 'overtime' | 'urged';
  isUrgent?: boolean;
  urgencyCount?: number;
  pickupCode?: string;
  pickupShelfCode?: string;
  riderInfo?: {
    name: string;
    distance: string;
    eta: string;
    tag: string;
    phone?: string;
  };
  cabinInfo?: {
    slot: string;
    temp: string;
    itemsCount: number;
    summary: string;
    status: string;
  };
  items: KdsCardItem[];
  rawTicket?: KdsTicket;
}

/**
 * KDS 工单卡片 → 后厨备餐联打印所需的 KdsTicket
 * 优先使用原始工单 rawTicket；演示/降级卡片按字段映射兜底
 */
export function cardToKitchenTicket(card: KdsCardData): KdsTicket {
  if (card.rawTicket) return card.rawTicket;
  return {
    id: card.id,
    ticketNo: card.ticketNo,
    tableOrChannel: card.title,
    channelType: card.channel === 'expedited' ? 'dine_in' : card.channel,
    orderTime: card.orderTime,
    elapsedMinutes: card.elapsedMinutes,
    status: 'cooking',
    pickupCode: card.pickupCode,
    pickupShelfCode: card.pickupShelfCode,
    items: card.items.map((it, i) => ({
      id: it.id || `kds-item-${i}`,
      dishName: it.name,
      quantity: it.quantity,
      isCompleted: it.isCompleted
    }))
  };
}

/** 初始高质量工业工控示范卡片（备选缺省数据） */
export const INITIAL_MOCK_CARDS: KdsCardData[] = [
  {
    id: 'kds-card-082',
    ticketNo: '#082',
    channel: 'dine_in',
    title: '外摆 A1 桌',
    statusTag: '就餐中',
    statusTagColor: 'bg-[#006494]/10 text-[#006494]',
    orderTime: '18:14:00',
    elapsedSeconds: 374, // 06:14
    elapsedMinutes: 6,
    slaTier: 'smooth',
    items: [
      {
        id: 'c1-item-1',
        name: '极炙低温慢煮安格斯牛排',
        quantity: 1,
        spec: '7分熟 · 现磨海盐黑椒',
        statusText: '已出餐',
        statusDuration: '6m12s',
        isCompleted: true,
        station: 'grill',
        timeline: {
          totalDuration: '06:12',
          orderedAt: '18:14:00',
          prepAt: '18:15:20',
          cookingAt: '18:17:40',
          servedAt: '18:20:12',
          steps: [
            { step: 'ordered', label: '1. 下单接单', time: '18:14:00', operator: '桌码扫码点餐', status: 'completed', note: '工单已下发' },
            { step: 'prep', label: '2. 备料配菜', time: '18:15:20', operator: '打荷工位(陈浩)', diff: '+1m20s', status: 'completed', note: '主辅食材就绪' },
            { step: 'cooking', label: '3. 上灶烹制', time: '18:17:40', operator: '炭烤主厨(王师傅)', diff: '+2m20s', status: 'completed', note: '恒温慢煮出炉' },
            { step: 'ready', label: '4. 装盘出餐', time: '18:20:12', operator: '主厨划菜质检', diff: '完成', isCurrent: true, status: 'completed', note: '已出餐可传菜' }
          ]
        }
      },
      {
        id: 'c1-item-2',
        name: '迷迭香金黄香脆薯角',
        quantity: 2,
        spec: '油温180℃出锅 · 沥油中',
        statusText: '炸制中',
        statusDuration: '4m30s',
        isCompleted: false,
        station: 'fryer',
        timeline: {
          totalDuration: '已耗时 04:30',
          orderedAt: '18:14:00',
          prepAt: '18:15:15',
          cookingAt: '18:17:40',
          servedAt: null,
          steps: [
            { step: 'ordered', label: '1. 下单接单', time: '18:14:00', operator: '桌码扫码点餐', status: 'completed' },
            { step: 'prep', label: '2. 备料配菜', time: '18:15:15', operator: '打荷工位(陈浩)', status: 'completed' },
            { step: 'cooking', label: '3. 高压油炸 (180℃)', time: '18:17:40', operator: '炸炉师傅', isCurrent: true, status: 'current', note: '🔥 油温180℃控温' },
            { step: 'ready', label: '4. 出锅装盘', time: '待完成', operator: '待划菜', status: 'pending' }
          ]
        }
      },
      {
        id: 'c1-item-3',
        name: '暴打香水青柠气泡冰饮',
        quantity: 1,
        spec: '标准少冰 · 5分微糖',
        statusText: '已封口',
        statusDuration: '2m00s',
        isCompleted: false,
        station: 'bar',
        timeline: {
          totalDuration: '备餐 02:00',
          orderedAt: '18:16:00',
          prepAt: '18:16:30',
          cookingAt: '18:17:00',
          servedAt: null,
          steps: [
            { step: 'ordered', label: '1. 接单录入', time: '18:16:00', operator: '水吧POS', status: 'completed' },
            { step: 'prep', label: '2. 调配打冰', time: '18:16:30', operator: '调酒师', status: 'completed' },
            { step: 'cooking', label: '3. 注入苏打', time: '18:17:00', operator: '调酒师', status: 'completed' },
            { step: 'ready', label: '4. 封口装袋', time: '18:18:00', operator: '待端菜', isCurrent: true, status: 'current' }
          ]
        }
      }
    ]
  },
  {
    id: 'kds-card-9821',
    ticketNo: '#9821',
    channel: 'delivery',
    title: '美团专送 · 望京SOHO',
    statusTag: '急制待取',
    statusTagColor: 'bg-[#006494]/10 text-[#006494]',
    orderTime: '18:08:00',
    elapsedSeconds: 734, // 12:14
    elapsedMinutes: 12,
    slaTier: 'peak',
    riderInfo: {
      name: '美团专送 · 陈志远',
      distance: '380m',
      eta: '预计2分钟到店',
      tag: '已到店·门前等候',
      phone: '13800138210'
    },
    items: [
      {
        id: 'c2-item-1',
        name: '果木烟熏黑豚炙烤五花肉',
        quantity: 1,
        spec: '秘制酸甜梅子酱 · 双重炙烤',
        statusText: '待出炉',
        statusDuration: '10m40s',
        isCompleted: false,
        station: 'grill',
        timeline: {
          totalDuration: '耗时 10:40',
          orderedAt: '18:08:00',
          prepAt: '18:09:15',
          cookingAt: '18:11:40',
          servedAt: null,
          steps: [
            { step: 'ordered', label: '1. 美团推单', time: '18:08:00', operator: '美团外卖自动接单', status: 'completed' },
            { step: 'prep', label: '2. 打荷解冻分装', time: '18:09:15', operator: '打荷工位(陈浩)', status: 'completed' },
            { step: 'cooking', label: '3. 235℃平扒炉炙烤', time: '18:11:40', operator: '炭烤主厨(王师傅)', isCurrent: true, status: 'current', note: '🔥 正在高温封边' },
            { step: 'ready', label: '4. 出扒打包封口', time: '待完成', operator: '待划线', status: 'pending' }
          ]
        }
      }
    ]
  },
  {
    id: 'kds-card-9804',
    ticketNo: '#9804',
    channel: 'expedited',
    title: '加急催起 · B2号桌',
    statusTag: '超时警告',
    statusTagColor: 'bg-[#FFDAD6] text-[#93000A]',
    orderTime: '18:02:00',
    elapsedSeconds: 1122, // 18:42
    elapsedMinutes: 18,
    slaTier: 'urged',
    isUrgent: true,
    urgencyCount: 2,
    items: [
      {
        id: 'c3-item-1',
        name: '主厨特选极炙和牛拼盘',
        quantity: 1,
        spec: 'M9牛小排 + 横膈膜 + 现磨芥末',
        statusText: '急制赶工',
        statusDuration: '18m42s',
        isCompleted: false,
        station: 'grill',
        timeline: {
          totalDuration: '超时 18:42',
          orderedAt: '18:02:00',
          prepAt: '18:03:15',
          cookingAt: '18:05:40',
          servedAt: null,
          steps: [
            { step: 'ordered', label: '1. 顾客点餐', time: '18:02:00', operator: '桌台扫码', status: 'completed' },
            { step: 'prep', label: '2. 备料配菜', time: '18:03:15', operator: '打荷理单', status: 'completed' },
            { step: 'cooking', label: '3. 压铸急制', time: '18:05:40', operator: '主厨赶工', isCurrent: true, status: 'current', note: '🔥 催单加急烹制' },
            { step: 'ready', label: '4. 出餐划线', time: '待完成', operator: '待划线', status: 'pending' }
          ]
        }
      }
    ]
  }
];

/**
 * 将菜品名称智能分类到对应档口
 */
export function inferDishStation(dishName: string): 'grill' | 'fryer' | 'bar' | 'cabin' {
  const name = dishName.toLowerCase();
  if (name.includes('冰') || name.includes('饮') || name.includes('咖啡') || name.includes('水') || name.includes('茶') || name.includes('提拉米苏') || name.includes('冷萃') || name.includes('甜品')) {
    return 'bar';
  }
  if (name.includes('薯') || name.includes('炸') || name.includes('角') || name.includes('酥') || name.includes('鸡翅') || name.includes('春卷') || name.includes('圈')) {
    return 'fryer';
  }
  if (name.includes('面') || name.includes('饭') || name.includes('包') || name.includes('盒') || name.includes('法棍') || name.includes('恒温')) {
    return 'cabin';
  }
  return 'grill';
}

/**
 * 对应 V1: 精确四节点时序推导算法 (getItemTimelineNodes)
 */
export function generateFourStepTimeline(
  ticket: KdsTicket,
  item: KdsTicketItem
): {
  orderedAt: string;
  prepAt: string;
  cookingAt: string;
  servedAt: string | null;
  totalDurationText: string;
  steps: TimelineStep[];
} {
  const orderTimeStr = item.orderTime || ticket.orderTime || '12:00:00';
  const baseParts = orderTimeStr.includes(':') ? orderTimeStr.split(':') : ['12', '00', '00'];
  const h = parseInt(baseParts[0] || '12', 10);
  const m = parseInt(baseParts[1] || '0', 10);
  const s = parseInt(baseParts[2] || '0', 10);

  const formatOffset = (plusMinutes: number, plusSeconds: number = 0) => {
    const totalSeconds = h * 3600 + (m + plusMinutes) * 60 + s + plusSeconds;
    const hh = Math.floor(totalSeconds / 3600) % 24;
    const mm = Math.floor((totalSeconds % 3600) / 60);
    const ss = totalSeconds % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  };

  const orderedAt = item.orderTime || `${orderTimeStr}${orderTimeStr.length <= 5 ? ':00' : ''}`;
  const prepAt = item.prepStartTime || formatOffset(1, 15);
  const cookingAt = item.cookingStartTime || formatOffset(3, 40);
  const servedAt = item.servedTime || (item.isCompleted ? formatOffset(Math.max(4, ticket.elapsedMinutes || 0), 12) : null);

  let totalDurationText = '';
  if (item.isCompleted) {
    const cookMin = Math.max(2, (ticket.elapsedMinutes || 0) > 0 ? (ticket.elapsedMinutes || 0) : 6);
    totalDurationText = `耗时${cookMin}分28秒`;
  } else {
    totalDurationText = `进行中 (${ticket.elapsedMinutes || 0}m)`;
  }

  const steps: TimelineStep[] = [
    {
      step: 'ordered',
      label: '1. 顾客下单 / 前台接单',
      time: orderedAt,
      operator: ticket.channelType === 'dine_in' ? '桌码扫码点餐' : '前台POS/外卖接单',
      status: 'completed',
      note: '工单已下发至 KDS'
    },
    {
      step: 'prep',
      label: '2. 备料配菜 / 打荷理单',
      time: prepAt,
      diff: '+1m15s',
      operator: '后厨打荷工位 (陈浩)',
      status: 'completed',
      note: '主辅食材就绪'
    },
    {
      step: 'cooking',
      label: '3. 上灶烹制 / 炭火炙烤',
      time: cookingAt,
      diff: '+2m25s',
      operator: '炭烤主厨 (王师傅)',
      status: item.isCompleted ? 'completed' : 'current',
      isCurrent: !item.isCompleted,
      note: item.isCompleted ? '火候与风味校验合格' : '🔥 正在明火烹制中'
    },
    {
      step: 'ready',
      label: '4. 装盘质检 / 出餐传菜',
      time: servedAt || '等待出餐装盘',
      diff: item.isCompleted ? '完成' : '待完成',
      operator: item.isCompleted ? '主厨划菜质检' : '待划菜',
      status: item.isCompleted ? 'completed' : 'pending',
      isCurrent: item.isCompleted,
      note: item.isCompleted ? '已完成出餐，可取餐/传菜' : '烹饪就绪后将立即标定'
    }
  ];

  return {
    orderedAt,
    prepAt,
    cookingAt,
    servedAt,
    totalDurationText,
    steps
  };
}

/**
 * 将单条 KdsTicketItem 转化为带有精细四节点的 KdsCardItem
 */
export function mapTicketItemToCardItem(
  ticket: KdsTicket,
  item: KdsTicketItem,
  idx: number
): KdsCardItem {
  const specText = [item.options, item.notes].filter(Boolean).join(' · ') || '现点现制';
  const station = inferDishStation(item.dishName);
  const timelineInfo = generateFourStepTimeline(ticket, item);

  return {
    id: item.id || `item-${ticket.id}-${idx}`,
    name: item.dishName,
    quantity: item.quantity,
    spec: specText,
    statusText: item.isCompleted ? '已出餐' : '制作中',
    statusDuration: `${ticket.elapsedMinutes || 0}m`,
    isCompleted: !!item.isCompleted,
    station,
    timeline: {
      totalDuration: timelineInfo.totalDurationText,
      orderedAt: timelineInfo.orderedAt,
      prepAt: timelineInfo.prepAt,
      cookingAt: timelineInfo.cookingAt,
      servedAt: timelineInfo.servedAt,
      steps: timelineInfo.steps
    }
  };
}

/**
 * 对应 V1 的专送标题多重前缀清洗算法
 */
export function sanitizeDeliveryTitle(ticketNo: string, rawTableOrChannel?: string): string {
  if (!rawTableOrChannel) return '外卖极速专送';
  const clean = rawTableOrChannel
    .replace(new RegExp(ticketNo, 'g'), '')
    .replace(/#[A-Za-z0-9-]+/g, '')
    .replace(/^外卖专送/, '')
    .trim()
    .replace(/^[·\s]+/, '');
  return clean ? `专送 · ${clean}` : '专送 · GPS 实时位';
}

/**
 * 将主数据系统中的 KdsTicket 转换为带有 SLA 色谱与清洗标题的 KdsCardData
 */
export function mapTicketToCardData(ticket: KdsTicket, nowSec: number = 0): KdsCardData {
  const elapsedMinutes = ticket.elapsedMinutes || 0;
  const isUrgent = !!ticket.isUrged;
  const isOvertime = elapsedMinutes > 15;
  const isWarning = elapsedMinutes >= 8 && elapsedMinutes <= 15;

  let slaTier: 'smooth' | 'peak' | 'overtime' | 'urged';
  if (isUrgent) {
    slaTier = 'urged';
  } else if (isOvertime) {
    slaTier = 'overtime';
  } else if (isWarning) {
    slaTier = 'peak';
  } else {
    slaTier = 'smooth';
  }

  let channel: 'dine_in' | 'delivery' | 'pickup' | 'expedited';
  if (isUrgent || isOvertime) {
    channel = 'expedited';
  } else if (ticket.channelType === 'delivery') {
    channel = 'delivery';
  } else if (ticket.channelType === 'pickup') {
    channel = 'pickup';
  } else {
    channel = 'dine_in';
  }

  // 标题清洗
  let title = '';
  if (ticket.channelType === 'dine_in') {
    title = ticket.tableOrChannel ? `${ticket.tableOrChannel}` : '堂食外摆';
  } else if (ticket.channelType === 'pickup') {
    const pCode = getOrGeneratePickupCode(ticket.ticketNo, ticket.pickupCode);
    title = `到车自提 · #${pCode}`;
  } else {
    title = sanitizeDeliveryTitle(ticket.ticketNo, ticket.tableOrChannel);
  }

  if (isUrgent) {
    title = `加急催单 · ${title}`;
  }

  // 状态微标与背景色
  let statusTag = '制作中';
  let statusTagColor = 'bg-[#006494]/10 text-[#006494]';
  if (isUrgent) {
    statusTag = `加急催单 · ${elapsedMinutes}m`;
    statusTagColor = 'bg-[#FFDAD6] text-[#93000A] animate-bounce';
  } else if (isOvertime) {
    statusTag = `超时警告 · ${elapsedMinutes}m`;
    statusTagColor = 'bg-[#FFDAD6] text-[#93000A] animate-pulse';
  } else if (isWarning) {
    statusTag = `高峰出餐 · ${elapsedMinutes}m`;
    statusTagColor = 'bg-[#FEF3C7] text-[#92400E]';
  } else if (ticket.channelType === 'pickup') {
    statusTag = '待取餐';
    statusTagColor = 'bg-[#EEEEEE] text-[#44474C]';
  } else if (ticket.channelType === 'delivery') {
    statusTag = '骑手在途';
    statusTagColor = 'bg-[#006494]/10 text-[#006494]';
  }

  const pCode = getOrGeneratePickupCode(ticket.ticketNo, ticket.pickupCode);
  const shelfCode = ticket.pickupShelfCode || getPickupShelfCode(ticket.ticketNo);

  const riderInfo = ticket.channelType === 'delivery' ? {
    name: '美团专送 · 骑手' + ticket.ticketNo.slice(-3),
    distance: '320m',
    eta: '预计 3 分钟内到店',
    tag: '已接单·赶往餐车',
    phone: '138****0123'
  } : undefined;

  const cabinInfo = ticket.channelType === 'pickup' ? {
    slot: `格口 ${shelfCode} (62.5℃ 恒温)`,
    temp: '62.5℃',
    itemsCount: ticket.items.length,
    summary: ticket.items.map(it => `${it.dishName} ×${it.quantity}`).join(' · '),
    status: `取餐码 #${pCode}`
  } : undefined;

  return {
    id: ticket.id,
    ticketNo: ticket.ticketNo,
    channel,
    title,
    statusTag,
    statusTagColor,
    orderTime: ticket.orderTime || '18:00:00',
    elapsedSeconds: elapsedMinutes * 60 + nowSec,
    elapsedMinutes,
    slaTier,
    isUrgent: isUrgent || isOvertime,
    urgencyCount: ticket.urgeCount || (ticket.isUrged ? 1 : 0),
    pickupCode: pCode,
    pickupShelfCode: shelfCode,
    riderInfo,
    cabinInfo,
    items: ticket.items.map((it, idx) => mapTicketItemToCardItem(ticket, it, idx)),
    rawTicket: ticket
  };
}

/**
 * 核心数据同步函数：将外部真实 tickets 同步合并进 cards
 */
export function syncTicketsToCards(
  tickets: KdsTicket[] | undefined,
  nowSec: number = 0
): KdsCardData[] {
  if (!tickets || tickets.length === 0) {
    return INITIAL_MOCK_CARDS;
  }
  return tickets.map((t) => mapTicketToCardData(t, nowSec));
}

/**
 * 计算顶部遥测看板的动态统计指标
 */
export function calculateKdsTelemetry(cards: KdsCardData[]) {
  const totalTickets = cards.length;
  const pendingItemsCount = cards.reduce(
    (sum, c) => sum + c.items.filter((it) => !it.isCompleted).length,
    0
  );
  const urgentCount = cards.filter((c) => c.slaTier === 'urged' || c.slaTier === 'overtime').length;

  const totalElapsedMins = cards.reduce((sum, c) => sum + Math.floor(c.elapsedSeconds / 60), 0);
  const avgElapsedMins = totalTickets > 0 ? (totalElapsedMins / totalTickets).toFixed(1) : '0.0';
  
  // SLA达标率 (<= 15 分钟)
  const slaPassCount = cards.filter((c) => Math.floor(c.elapsedSeconds / 60) <= 15).length;
  const slaPassRate = totalTickets > 0 ? ((slaPassCount / totalTickets) * 100).toFixed(1) : '100';

  return {
    totalTickets,
    pendingItemsCount,
    urgentCount,
    avgElapsedMins,
    slaPassRate
  };
}
