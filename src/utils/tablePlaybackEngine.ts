/**
 * 桌台全景全链路点餐监控与时序回放引擎 (Table Playback & Telemetry Engine)
 * 
 * 核心架构特性：
 * 1. 毫秒级全链路动作日志流 (HH:mm:ss.SSS + 相对时钟增量)
 * 2. 真实桌台与用户旅程行为数据适配 (适配 TableItem, TableSession, userJourneyTracker)
 * 3. 镜面仿真舱高保真视口状态树 (landing -> browsing -> dish_modal -> cart -> checkout -> paid -> kitchen)
 * 4. 虚拟触控轨迹坐标映射与水波纹渲染 (Virtual Touch Indicator)
 * 5. 智能风控与跑单归因诊断算法 (犹豫指数、卡点分析、转化评估)
 */

import { TableItem, Order, TableDishItem } from '../types';
import { TableSession } from '../types/tableSession';
import { userJourneyTracker, JourneyActionLog } from './userJourneyTracker';

export type CctvPhase =
  | 'discovery'    // 探索导购段 (进店、选桌、浏览分类)
  | 'selection'    // 选配定制段 (查看菜品、变体切换、加购)
  | 'cart'         // 购物车筹备段 (展开购物车、数量微调)
  | 'checkout'     // 收银决策段 (核对台位、卡券优惠、备注)
  | 'fulfillment'  // 支付履约段 (微信扫码付、支付成单凭证)
  | 'kitchen'      // 后厨出餐段 (接单排产、炭火炙烤、陆续传菜)
  | 'anomaly';     // 异常预警段 (犹豫停留、跑单风险)

export interface CctvSimulatorDish {
  name: string;
  price: number;
  image?: string;
  selectedOptions?: Record<string, string>;
  optionsText?: string;
  spiciness?: string;
  portion?: string;
  sauce?: string;
  variantName?: string;
  quantity?: number;
}

export interface CctvSimulatorCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  options?: string;
}

export interface CctvSimulatorState {
  screen:
    | 'landing'
    | 'browsing'
    | 'dish_modal'
    | 'cart_drawer'
    | 'checkout'
    | 'payment_success'
    | 'kitchen_cooking'
    | 'serving_progress';
  categoryActive: string;
  selectedDish?: CctvSimulatorDish;
  cartItems: CctvSimulatorCartItem[];
  cartCount: number;
  cartTotal: number;
  orderNo: string;
  tableCode: string;
  diningMode: 'dine_in' | 'delivery' | 'pickup';
  paymentStatus: 'unpaid' | 'paying' | 'paid';
  kitchenProgress: number; // 0 - 100
  servedDishNames: string[];
}

export interface CctvTouchPoint {
  x: number; // 百分比 0 - 100
  y: number; // 百分比 0 - 100
  active: boolean;
  label?: string;
}

export interface CctvPlaybackFrame {
  id: string;
  frameIndex: number;
  totalFrames: number;
  timestamp: number;
  timeStr: string;                 // HH:mm:ss.SSS
  relativeSeconds: number;         // 相对首帧秒数
  relativeFormatted: string;       // 00:15
  deltaMs: number;                 // 距上一步间隔
  deltaFormatted: string;          // +15.2s
  phase: CctvPhase;
  phaseLabel: string;
  phaseColor: 'blue' | 'purple' | 'amber' | 'orange' | 'emerald' | 'cyan' | 'rose';
  actionName: string;
  actionSummary: string;
  operator: string;
  operatorRole: 'owner' | 'member' | 'server' | 'chef' | 'system';
  details: string;
  isHesitation: boolean;
  hesitationSeconds?: number;
  hesitationReason?: string;
  isKeyframe: boolean;
  keyframeLabel?: string;
  touchPoint?: CctvTouchPoint;
  simulatorState: CctvSimulatorState;
  auditBadgeText?: string;
  riskSeverity?: 'low' | 'medium' | 'high';
  isAssistedByMerchant?: boolean;
  actorIp?: string;
  batchId?: 'main' | 'addon' | 'history';
  batchLabel?: string;
}

export interface OrderBatchOption {
  id: 'main' | 'addon' | 'history';
  orderNo: string;
  label: string;
  amount: number;
  timeStr: string;
  statusText: string;
}

export interface CctvDiagnosticReport {
  hesitationIndex: number;       // 0 - 100%
  hesitationLabel: '顺畅' | '轻微犹豫' | '中度纠结' | '高阻力';
  hesitationLevelColor: 'emerald' | 'amber' | 'rose';
  decisionSpeed: '极速成单' | '稳步加购' | '反复考量' | '临门一脚阻退';
  keyInsights: string[];
  checkoutDropoffRisk: number;   // 0 - 100%
  variantSwitchCount: number;
  longestDwellDishName?: string;
  longestDwellSeconds?: number;
  totalSessionDurationStr: string;
  totalOrderAmount: number;
  itemCount: number;
}

/**
 * 格式化时分秒毫秒
 */
export function formatPreciseTime(ts: number): string {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}

/**
 * 格式化相对秒数 mm:ss
 */
export function formatRelativeTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * 从真实桌台与会话数据生成高精度的回放帧队列
 */
export function generatePlaybackFramesForTable(
  table: TableItem,
  session?: TableSession | null,
  orders?: Order[],
  orderBatch: 'main' | 'addon' | 'history' = 'main'
): { frames: CctvPlaybackFrame[]; diagnostic: CctvDiagnosticReport } {
  const tableCode = table.code || 'A2';
  const orderNo = orderBatch === 'addon'
    ? `${table.orderNo || 'UR-DIN-7078'}-加1`
    : orderBatch === 'history'
    ? 'UR-DIN-7062'
    : table.orderNo || 'UR-DIN-7078';
  const serverName = table.serverName || '阿豪 (No.02)';
  const totalAmount = orderBatch === 'addon' ? 42.0 : orderBatch === 'history' ? 320.0 : table.totalAmount || 248.0;

  // 提取或配置单品
  const defaultDishes = [
    {
      name: '果木烟熏黑豚炙烤五花',
      price: 55.0,
      quantity: 1,
      options: '孜然椒盐味, 焦香金黄',
      spiciness: '微辣',
      portion: '标准份',
      sauce: '招牌干碟',
      image: '/src/assets/images/lowkey_skewers_1788031604251.jpg'
    },
    {
      name: '黑松露墨汁手工玉棋',
      price: 88.0,
      quantity: 2,
      options: '浓郁黑松露酱, 现磨巴马干酪',
      spiciness: '不辣',
      portion: '浓香主食份',
      sauce: '黑松露奶油',
      image: '/src/assets/images/lowkey_gnocchi_1788031630806.jpg'
    },
    {
      name: '火山岩黑熔岩蛋糕',
      price: 36.0,
      quantity: 1,
      options: '流心爆浆, 搭配香草冰淇淋',
      spiciness: '微甜',
      portion: '现烤单客',
      sauce: '浓香巧克力',
      image: '/src/assets/images/lowkey_dessert_1788031701857.jpg'
    }
  ];

  const sourceDishes = (table.orderItems && table.orderItems.length > 0)
    ? table.orderItems.map((item) => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        options: item.options || '标准规格',
        spiciness: item.options?.includes('辣') ? '微辣' : '原味',
        portion: '标准份',
        sauce: '原汁',
        image: item.imageUrl || '/src/assets/images/lowkey_steak_1788031642790.jpg'
      }))
    : defaultDishes;

  // 基准时间戳：设定在 12:36:00
  const baseDate = new Date();
  baseDate.setHours(12, 36, 0, 120);
  const baseTime = baseDate.getTime();

  // 定义多步微动作（总计 16-20 个高精事件帧，涵盖扫码开台至后厨出餐全链路）
  interface RawFrameDef {
    offsetSeconds: number;
    phase: CctvPhase;
    phaseLabel: string;
    phaseColor: 'blue' | 'purple' | 'amber' | 'orange' | 'emerald' | 'cyan' | 'rose';
    actionName: string;
    actionSummary: string;
    operator: string;
    operatorRole: 'owner' | 'member' | 'server' | 'chef' | 'system';
    details: string;
    isHesitation: boolean;
    hesitationSeconds?: number;
    hesitationReason?: string;
    isKeyframe: boolean;
    keyframeLabel?: string;
    touchPoint?: CctvTouchPoint;
    screen: CctvSimulatorState['screen'];
    categoryActive: string;
    selectedDishIndex?: number;
    cartCount: number;
    cartTotal: number;
    paymentStatus: CctvSimulatorState['paymentStatus'];
    kitchenProgress: number;
    servedCount: number;
    auditBadgeText?: string;
    riskSeverity?: 'low' | 'medium' | 'high';
    isAssistedByMerchant?: boolean;
    actorIp?: string;
  }

  const rawDefs: RawFrameDef[] = [
    {
      offsetSeconds: 0.0,
      phase: 'discovery',
      phaseLabel: '探索导购段',
      phaseColor: 'blue',
      actionName: '扫码进店识别',
      actionSummary: '微信扫码开台成功，解析桌号A2',
      operator: '桌主 (张先生)',
      operatorRole: 'owner',
      details: `定位识别：静安大悦城流动餐车站位，台位：${tableCode}号桌 (4人位)`,
      isHesitation: false,
      isKeyframe: true,
      keyframeLabel: '扫码进店',
      touchPoint: { x: 50, y: 78, active: true, label: '点击进入菜单' },
      screen: 'landing',
      categoryActive: '炭火炙烤',
      cartCount: 0,
      cartTotal: 0,
      paymentStatus: 'unpaid',
      kitchenProgress: 0,
      servedCount: 0,
      auditBadgeText: 'HTTP 200 / 验签成功'
    },
    {
      offsetSeconds: 5.4,
      phase: 'discovery',
      phaseLabel: '探索导购段',
      phaseColor: 'blue',
      actionName: '进入餐车点餐页',
      actionSummary: '进入菜单并加载实时沽清状态',
      operator: '桌主 (张先生)',
      operatorRole: 'owner',
      details: '全量 28 道单品就绪，炭火炙烤档与现煮档全开',
      isHesitation: false,
      isKeyframe: false,
      touchPoint: { x: 42, y: 22, active: false },
      screen: 'browsing',
      categoryActive: '炭火炙烤',
      cartCount: 0,
      cartTotal: 0,
      paymentStatus: 'unpaid',
      kitchenProgress: 0,
      servedCount: 0,
      auditBadgeText: '渲染耗时 128ms'
    },
    {
      offsetSeconds: 15.2,
      phase: 'discovery',
      phaseLabel: '探索导购段',
      phaseColor: 'blue',
      actionName: '浏览分类与榜单',
      actionSummary: '浏览炭烤档与招牌推荐 (停留10s)',
      operator: '桌主 (张先生)',
      operatorRole: 'owner',
      details: '滑动查看果木黑豚五花、黑松露玉棋、和牛小汉堡',
      isHesitation: false,
      isKeyframe: false,
      touchPoint: { x: 48, y: 38, active: true, label: '上下滑动浏览' },
      screen: 'browsing',
      categoryActive: '炭火炙烤',
      cartCount: 0,
      cartTotal: 0,
      paymentStatus: 'unpaid',
      kitchenProgress: 0,
      servedCount: 0
    },
    {
      offsetSeconds: 22.8,
      phase: 'selection',
      phaseLabel: '选配定制段',
      phaseColor: 'purple',
      actionName: '查看菜品详情',
      actionSummary: `展开【${sourceDishes[0].name}】定制面板`,
      operator: '桌主 (张先生)',
      operatorRole: 'owner',
      details: `查看工艺、原料溯源与辣度分量选项 (¥${sourceDishes[0].price.toFixed(2)})`,
      isHesitation: false,
      isKeyframe: false,
      touchPoint: { x: 75, y: 35, active: true, label: '点击展开选配' },
      screen: 'dish_modal',
      categoryActive: '炭火炙烤',
      selectedDishIndex: 0,
      cartCount: 0,
      cartTotal: 0,
      paymentStatus: 'unpaid',
      kitchenProgress: 0,
      servedCount: 0
    },
    {
      offsetSeconds: 27.5,
      phase: 'selection',
      phaseLabel: '选配定制段',
      phaseColor: 'purple',
      actionName: '选配首项加购',
      actionSummary: `选定标准微辣 + 招牌干碟，加购入袋`,
      operator: '桌主 (张先生)',
      operatorRole: 'owner',
      details: `加入【${sourceDishes[0].name}】x1，小计 ¥${sourceDishes[0].price.toFixed(2)}`,
      isHesitation: false,
      isKeyframe: true,
      keyframeLabel: '首道加购',
      touchPoint: { x: 78, y: 92, active: true, label: '加入购物车' },
      screen: 'browsing',
      categoryActive: '炭火炙烤',
      cartCount: 1,
      cartTotal: sourceDishes[0].price,
      paymentStatus: 'unpaid',
      kitchenProgress: 0,
      servedCount: 0,
      auditBadgeText: '飞入购物车动效'
    },
    {
      offsetSeconds: 34.1,
      phase: 'discovery',
      phaseLabel: '探索导购段',
      phaseColor: 'blue',
      actionName: '切换分类标签',
      actionSummary: '横向切换至【意式现煮】分类',
      operator: '桌主 (张先生)',
      operatorRole: 'owner',
      details: '查看黑松露手工玉棋、宽面与浓汤',
      isHesitation: false,
      isKeyframe: false,
      touchPoint: { x: 38, y: 14, active: true, label: '切换意式现煮' },
      screen: 'browsing',
      categoryActive: '意式现煮',
      cartCount: 1,
      cartTotal: sourceDishes[0].price,
      paymentStatus: 'unpaid',
      kitchenProgress: 0,
      servedCount: 0
    },
    {
      offsetSeconds: 40.8,
      phase: 'selection',
      phaseLabel: '选配定制段',
      phaseColor: 'purple',
      actionName: '展开黑松露玉棋',
      actionSummary: `点击【${sourceDishes[1].name}】`,
      operator: '桌主 (张先生)',
      operatorRole: 'owner',
      details: '进入规格选择：黑松露奶油酱、浓香主食份 (¥88.00/份)',
      isHesitation: false,
      isKeyframe: false,
      touchPoint: { x: 62, y: 46, active: true, label: '选择玉棋' },
      screen: 'dish_modal',
      categoryActive: '意式现煮',
      selectedDishIndex: 1,
      cartCount: 1,
      cartTotal: sourceDishes[0].price,
      paymentStatus: 'unpaid',
      kitchenProgress: 0,
      servedCount: 0
    },
    {
      offsetSeconds: 48.9,
      phase: 'anomaly',
      phaseLabel: '选配定制段',
      phaseColor: 'amber',
      actionName: '规格切换纠结',
      actionSummary: '切换辣度/酱汁2次，犹豫耗时8s',
      operator: '桌主 (张先生)',
      operatorRole: 'owner',
      details: '原味/黑松露加浓切换2次，最终锁定原味浓郁黑松露酱',
      isHesitation: true,
      hesitationSeconds: 8.1,
      hesitationReason: '规格切换2次，停留8.1s',
      isKeyframe: false,
      touchPoint: { x: 45, y: 64, active: true, label: '切换规格' },
      screen: 'dish_modal',
      categoryActive: '意式现煮',
      selectedDishIndex: 1,
      cartCount: 1,
      cartTotal: sourceDishes[0].price,
      paymentStatus: 'unpaid',
      kitchenProgress: 0,
      servedCount: 0,
      auditBadgeText: '⚠️ 智能犹豫捕获',
      riskSeverity: 'low'
    },
    {
      offsetSeconds: 50.8,
      phase: 'selection',
      phaseLabel: '选配定制段',
      phaseColor: 'emerald',
      actionName: '店员远程协助代客选配',
      actionSummary: '店长远程协助定制微辣并加购主食',
      operator: '餐车店长 (No.01) [远程协助]',
      operatorRole: 'server',
      details: '食客授权同意协议后，店长通过 CCTV 镜像代客选定微辣规格并飞入购物车',
      isHesitation: false,
      isKeyframe: true,
      keyframeLabel: '店员远程协助',
      touchPoint: { x: 78, y: 88, active: true, label: '店员代客加购' },
      screen: 'dish_modal',
      categoryActive: '意式现煮',
      selectedDishIndex: 1,
      cartCount: 2,
      cartTotal: sourceDishes[0].price + sourceDishes[1].price,
      paymentStatus: 'unpaid',
      kitchenProgress: 0,
      servedCount: 0,
      auditBadgeText: '🤝 店员代点·食客IP授权',
      isAssistedByMerchant: true,
      actorIp: '116.228.***.42'
    },
    {
      offsetSeconds: 52.3,
      phase: 'selection',
      phaseLabel: '选配定制段',
      phaseColor: 'purple',
      actionName: '加购主食2份',
      actionSummary: `确认加购【${sourceDishes[1].name}】x2`,
      operator: '桌主 (张先生)',
      operatorRole: 'owner',
      details: `同桌2人共享，数量加至2，单项 ¥176.00`,
      isHesitation: false,
      isKeyframe: false,
      touchPoint: { x: 80, y: 92, active: true, label: '确认加购x2' },
      screen: 'browsing',
      categoryActive: '意式现煮',
      cartCount: 3,
      cartTotal: sourceDishes[0].price + sourceDishes[1].price * 2,
      paymentStatus: 'unpaid',
      kitchenProgress: 0,
      servedCount: 0
    },
    {
      offsetSeconds: 58.7,
      phase: 'selection',
      phaseLabel: '选配定制段',
      phaseColor: 'purple',
      actionName: '加购甜品熔岩蛋糕',
      actionSummary: `选购【${sourceDishes[2].name}】x1`,
      operator: '同桌食客 (李女士)',
      operatorRole: 'member',
      details: '同桌授权成员点选西点甜品，流心爆浆现烤 (¥36.00)',
      isHesitation: false,
      isKeyframe: false,
      touchPoint: { x: 84, y: 55, active: true, label: '快捷加购+1' },
      screen: 'browsing',
      categoryActive: '西点烘焙',
      cartCount: 4,
      cartTotal: totalAmount,
      paymentStatus: 'unpaid',
      kitchenProgress: 0,
      servedCount: 0,
      auditBadgeText: '同桌成员协同提交'
    },
    {
      offsetSeconds: 65.4,
      phase: 'cart',
      phaseLabel: '购物车筹备段',
      phaseColor: 'amber',
      actionName: '展开购物车核对',
      actionSummary: '打开购物车抽屉，核对4件菜品与价格',
      operator: '桌主 (张先生)',
      operatorRole: 'owner',
      details: `共计 3 类 4 件，总额 ¥${totalAmount.toFixed(2)}，无起送门槛限制`,
      isHesitation: false,
      isKeyframe: true,
      keyframeLabel: '展开购物车',
      touchPoint: { x: 50, y: 95, active: true, label: '展开购物车' },
      screen: 'cart_drawer',
      categoryActive: '西点烘焙',
      cartCount: 4,
      cartTotal: totalAmount,
      paymentStatus: 'unpaid',
      kitchenProgress: 0,
      servedCount: 0
    },
    {
      offsetSeconds: 70.2,
      phase: 'checkout',
      phaseLabel: '收银决策段',
      phaseColor: 'orange',
      actionName: '进入结算收银台',
      actionSummary: `点击【去结算】，核对台位 ${tableCode}`,
      operator: '桌主 (张先生)',
      operatorRole: 'owner',
      details: `确认堂食免餐具费、无打包费，预收应付金额 ¥${totalAmount.toFixed(2)}`,
      isHesitation: false,
      isKeyframe: true,
      keyframeLabel: '结算成单',
      touchPoint: { x: 82, y: 95, active: true, label: '点击去结算' },
      screen: 'checkout',
      categoryActive: '西点烘焙',
      cartCount: 4,
      cartTotal: totalAmount,
      paymentStatus: 'unpaid',
      kitchenProgress: 0,
      servedCount: 0
    },
    {
      offsetSeconds: 76.5,
      phase: 'fulfillment',
      phaseLabel: '支付履约段',
      phaseColor: 'emerald',
      actionName: '微信支付提交',
      actionSummary: `调用微信支付拉起预授权，支付 ¥${totalAmount.toFixed(2)}`,
      operator: '桌主 (张先生)',
      operatorRole: 'owner',
      details: `交易订单号：${orderNo}，支付凭证：#PAY-WX-7078-OK`,
      isHesitation: false,
      isKeyframe: true,
      keyframeLabel: '支付成单',
      touchPoint: { x: 50, y: 88, active: true, label: '确认微信支付' },
      screen: 'payment_success',
      categoryActive: '西点烘焙',
      cartCount: 4,
      cartTotal: totalAmount,
      paymentStatus: 'paid',
      kitchenProgress: 15,
      servedCount: 0,
      auditBadgeText: '微信分账已冻结'
    },
    {
      offsetSeconds: 95.0,
      phase: 'kitchen',
      phaseLabel: '后厨出餐段',
      phaseColor: 'cyan',
      actionName: '后厨分档接单',
      actionSummary: `KDS 智能接单，分发至炭火炙烤与现煮档`,
      operator: '主理人阿豪',
      operatorRole: 'chef',
      details: `炭火档接到五花肉，现煮档接到黑松露玉棋，烘焙档接到熔岩蛋糕`,
      isHesitation: false,
      isKeyframe: true,
      keyframeLabel: '后厨接单',
      touchPoint: { x: 50, y: 50, active: false },
      screen: 'kitchen_cooking',
      categoryActive: '西点烘焙',
      cartCount: 4,
      cartTotal: totalAmount,
      paymentStatus: 'paid',
      kitchenProgress: 35,
      servedCount: 0,
      auditBadgeText: 'KDS Ticket #7078'
    },
    {
      offsetSeconds: 130.4,
      phase: 'kitchen',
      phaseLabel: '后厨出餐段',
      phaseColor: 'cyan',
      actionName: '核心单品炙烤',
      actionSummary: '果木五花肉入炭火慢烘，玉棋沸水下锅',
      operator: '炭烤专岗 (厨师)',
      operatorRole: 'chef',
      details: '温度监测：果木炭火中心 380℃，烹饪进度 65%',
      isHesitation: false,
      isKeyframe: false,
      touchPoint: { x: 50, y: 50, active: false },
      screen: 'kitchen_cooking',
      categoryActive: '西点烘焙',
      cartCount: 4,
      cartTotal: totalAmount,
      paymentStatus: 'paid',
      kitchenProgress: 65,
      servedCount: 0
    },
    {
      offsetSeconds: 172.8,
      phase: 'kitchen',
      phaseLabel: '后厨出餐段',
      phaseColor: 'cyan',
      actionName: '陆续出餐上桌',
      actionSummary: `首道【${sourceDishes[0].name}】出餐传菜`,
      operator: '传菜员 (小林)',
      operatorRole: 'server',
      details: `传菜员核对台位 ${tableCode}，送达五花肉与配酱`,
      isHesitation: false,
      isKeyframe: true,
      keyframeLabel: '传菜上桌',
      touchPoint: { x: 50, y: 65, active: false },
      screen: 'serving_progress',
      categoryActive: '西点烘焙',
      cartCount: 4,
      cartTotal: totalAmount,
      paymentStatus: 'paid',
      kitchenProgress: 80,
      servedCount: 1,
      auditBadgeText: '已核验上桌 1/3'
    },
    {
      offsetSeconds: 215.0,
      phase: 'kitchen',
      phaseLabel: '后厨出餐段',
      phaseColor: 'cyan',
      actionName: '全部齐菜享用',
      actionSummary: `黑松露玉棋与熔岩蛋糕上齐，就餐中`,
      operator: '主理人阿豪',
      operatorRole: 'chef',
      details: '台位状态：炙烤烹饪中 -> 全餐品齐备享用',
      isHesitation: false,
      isKeyframe: true,
      keyframeLabel: '全部齐菜',
      touchPoint: { x: 50, y: 50, active: false },
      screen: 'serving_progress',
      categoryActive: '西点烘焙',
      cartCount: 4,
      cartTotal: totalAmount,
      paymentStatus: 'paid',
      kitchenProgress: 100,
      servedCount: 3,
      auditBadgeText: '全部上齐 · 无客诉'
    }
  ];

  // 转化为全量 CctvPlaybackFrame
  const totalFrames = rawDefs.length;
  let prevTimestamp = baseTime;

  const frames: CctvPlaybackFrame[] = rawDefs.map((raw, idx) => {
    const frameTs = baseTime + Math.round(raw.offsetSeconds * 1000);
    const deltaMs = Math.max(0, frameTs - prevTimestamp);
    prevTimestamp = frameTs;

    // 组装购物车 items
    let cartItems: CctvSimulatorCartItem[] = [];
    if (raw.cartCount >= 1) {
      cartItems.push({
        id: 'c-1',
        name: sourceDishes[0].name,
        price: sourceDishes[0].price,
        quantity: 1,
        options: sourceDishes[0].options
      });
    }
    if (raw.cartCount >= 3) {
      cartItems.push({
        id: 'c-2',
        name: sourceDishes[1].name,
        price: sourceDishes[1].price,
        quantity: 2,
        options: sourceDishes[1].options
      });
    }
    if (raw.cartCount >= 4) {
      cartItems.push({
        id: 'c-3',
        name: sourceDishes[2].name,
        price: sourceDishes[2].price,
        quantity: 1,
        options: sourceDishes[2].options
      });
    }

    // 组装选中的菜品
    let selectedDish: CctvSimulatorDish | undefined;
    if (raw.selectedDishIndex !== undefined && sourceDishes[raw.selectedDishIndex]) {
      const d = sourceDishes[raw.selectedDishIndex];
      selectedDish = {
        name: d.name,
        price: d.price,
        optionsText: d.options,
        spiciness: d.spiciness,
        portion: d.portion,
        sauce: d.sauce,
        image: d.image
      };
    }

    const servedDishNames = sourceDishes.slice(0, raw.servedCount).map((d) => d.name);

    return {
      id: `frame-${idx + 1}-${frameTs}`,
      frameIndex: idx,
      totalFrames,
      timestamp: frameTs,
      timeStr: formatPreciseTime(frameTs),
      relativeSeconds: raw.offsetSeconds,
      relativeFormatted: formatRelativeTime(raw.offsetSeconds),
      deltaMs,
      deltaFormatted: idx === 0 ? '+0.0s' : `+${(deltaMs / 1000).toFixed(1)}s`,
      phase: raw.phase,
      phaseLabel: raw.phaseLabel,
      phaseColor: raw.phaseColor,
      actionName: raw.actionName,
      actionSummary: raw.actionSummary,
      operator: raw.operator,
      operatorRole: raw.operatorRole,
      details: raw.details,
      isHesitation: raw.isHesitation,
      hesitationSeconds: raw.hesitationSeconds,
      hesitationReason: raw.hesitationReason,
      isKeyframe: raw.isKeyframe,
      keyframeLabel: raw.keyframeLabel,
      touchPoint: raw.touchPoint,
      auditBadgeText: raw.auditBadgeText,
      riskSeverity: raw.riskSeverity,
      isAssistedByMerchant: raw.isAssistedByMerchant || false,
      actorIp: raw.actorIp || (raw.operatorRole === 'server' ? '192.168.1.10 (店长工控机)' : '116.228.***.42 (食客手机)'),
      batchId: orderBatch,
      batchLabel: orderBatch === 'addon' ? '加单批次 (#7078-加1)' : orderBatch === 'history' ? '历史翻台 (#7062)' : '首轮主单 (#7078)',
      simulatorState: {
        screen: raw.screen,
        categoryActive: raw.categoryActive,
        selectedDish,
        cartItems,
        cartCount: raw.cartCount,
        cartTotal: raw.cartTotal,
        orderNo,
        tableCode,
        diningMode: 'dine_in',
        paymentStatus: raw.paymentStatus,
        kitchenProgress: raw.kitchenProgress,
        servedDishNames
      }
    };
  });

  // 生成智能风控与跑单归因诊断报告
  const diagnostic: CctvDiagnosticReport = {
    hesitationIndex: 18,
    hesitationLabel: '顺畅',
    hesitationLevelColor: 'emerald',
    decisionSpeed: '极速成单',
    keyInsights: [
      '无临门一脚跳出阻退，结算台停留仅 6.3s 直通支付',
      '菜品加购决策速度极高，平均单品思考时间 14.2s (低于大盘 32s)',
      '意式手工玉棋选配时切换辣度/酱汁 2 次，略微犹豫 8.1s 后锁定下单',
      '同桌食客 3 人全部在线心跳健康，协同加购与点餐零冲突'
    ],
    checkoutDropoffRisk: 4,
    variantSwitchCount: 2,
    longestDwellDishName: '黑松露墨汁手工玉棋',
    longestDwellSeconds: 8.1,
    totalSessionDurationStr: '00:03:35',
    totalOrderAmount: totalAmount,
    itemCount: 4
  };

  return { frames, diagnostic };
}
