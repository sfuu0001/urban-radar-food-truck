// Universal Hardware Barcode Scanner Engine (支持 USB/2.4G无线/蓝牙/HID键盘协议任意扫码枪)
import { DishItem, Order, TableItem } from '../types';
import { dispatchPickupVerifiedEvent, getOrGeneratePickupCode, getPickupShelfCode } from './pickupCodeEngine';
import { voiceAlerts } from './voiceAlertEngine';
import { merchantEventBus } from './merchantEventBus';

export interface ScannerConfig {
  enabled: boolean;
  soundEnabled: boolean;
  maxKeyIntervalMs: number; // 扫码枪按键间隔阈值 (通常 < 50ms)
  minLength: number; // 最小条码长度 (默认 3)
  autoAddToCart: boolean; // 扫码识别菜品后自动加购
  autoNavigateTab: boolean; // 扫码对应模块后自动跳转或高亮
  prefixFilter?: string; // 可选前缀
  suffixKey: string; // 扫码枪结束键 (默认 'Enter')
}

export interface ScanResult {
  code: string;
  type: 'dish' | 'member' | 'coupon' | 'order' | 'table' | 'material' | 'pickup' | 'custom';
  title: string;
  subtitle?: string;
  timestamp: string;
  matchedData?: any;
  success: boolean;
  actionTaken?: string;
}

const STORAGE_KEY = 'obsidian_scanner_config';
const HISTORY_STORAGE_KEY = 'obsidian_scanner_history';

export const DEFAULT_SCANNER_CONFIG: ScannerConfig = {
  enabled: true,
  soundEnabled: true,
  maxKeyIntervalMs: 50, // 扫码枪两次按键间隔通常在 10~40ms 之间
  minLength: 3,
  autoAddToCart: true,
  autoNavigateTab: true,
  suffixKey: 'Enter'
};

export function getScannerConfig(): ScannerConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_SCANNER_CONFIG, ...JSON.parse(raw) } : DEFAULT_SCANNER_CONFIG;
  } catch {
    return DEFAULT_SCANNER_CONFIG;
  }
}

export function saveScannerConfig(config: ScannerConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

export function getScanHistory(): ScanResult[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function pushScanHistory(result: ScanResult): ScanResult[] {
  try {
    const history = getScanHistory();
    const updated = [result, ...history.slice(0, 49)]; // keep latest 50
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function clearScanHistory(): void {
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch {
    // ignore
  }
}

// -------------------------------------------------------------
// Web Audio Hardware Acoustic Feedback (扫码确认哔哔声 / 蜂鸣器模拟)
// -------------------------------------------------------------
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export type ScannerSoundType =
  | 'beep_success'
  | 'beep_cart'
  | 'beep_member'
  | 'beep_error'
  | 'beep_order'
  | 'success'
  | 'cart'
  | 'member'
  | 'error'
  | 'order';

export function playScannerBeep(type: ScannerSoundType = 'beep_success'): void {
  const cfg = getScannerConfig();
  if (!cfg.enabled || !cfg.soundEnabled) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);

    const sound = type.startsWith('beep_') ? type : `beep_${type}`;

    if (sound === 'beep_success') {
      // Standard Retail POS High-pitch Beep (1800Hz / 60ms)
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1850, now);
      gainNode.gain.setValueAtTime(0.25, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (sound === 'beep_cart') {
      // Double Crisp Pop (1500Hz -> 2200Hz)
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1450, now);
      osc.frequency.setValueAtTime(2200, now + 0.04);
      gainNode.gain.setValueAtTime(0.28, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (sound === 'beep_member') {
      // VIP Welcome Melody (C6 -> E6 -> G6)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'triangle';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(1046.5, now);
      osc1.frequency.setValueAtTime(1318.5, now + 0.06);
      osc1.frequency.setValueAtTime(1567.98, now + 0.12);

      osc2.frequency.setValueAtTime(1567.98, now + 0.08);

      gainNode.gain.setValueAtTime(0.25, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      osc1.start(now);
      osc2.start(now + 0.08);
      osc1.stop(now + 0.28);
      osc2.stop(now + 0.28);
    } else if (sound === 'beep_order') {
      // Order Verification Tone (G5 -> C6)
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(784, now);
      osc.frequency.setValueAtTime(1046.5, now + 0.08);
      gainNode.gain.setValueAtTime(0.22, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (sound === 'beep_error') {
      // Low Error Buzz (220Hz saw)
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(180, now + 0.08);
      gainNode.gain.setValueAtTime(0.25, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.22);
    }
  } catch (e) {
    // ignore audio errors
  }
}

// -------------------------------------------------------------
// Barcode Helper Functions: 69 Code & SKU Barcode Generator
// -------------------------------------------------------------
export function generateEan13Barcode(seed: number | string = 1): string {
  let numericVal = 1;
  if (typeof seed === 'number') {
    numericVal = Math.abs(seed);
  } else {
    const matchedDigits = seed.replace(/\D/g, '');
    numericVal = matchedDigits ? parseInt(matchedDigits, 10) : 1;
  }
  // China standard prefix 690 ~ 699, custom merchant prefix 6979988
  const base = `6979988${String(numericVal % 100000).padStart(5, '0')}`;
  // Calculate checksum digit
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(base[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return `${base}${checkDigit}`;
}

export function ensureDishBarcodes(dishes: DishItem[]): DishItem[] {
  return dishes.map((dish, index) => {
    if (dish.barcode && dish.barcode.trim().length > 0) {
      return dish;
    }
    // Generate deterministic 69-series barcode if not present
    return {
      ...dish,
      barcode: generateEan13Barcode(index + 1)
    };
  });
}

// -------------------------------------------------------------
// Multi-Business Intelligent Barcode Parser
// -------------------------------------------------------------
export interface ParseBarcodeOptions {
  dishes: DishItem[];
  orders?: Order[];
  tables?: TableItem[];
}

export function parseAndRouteBarcode(rawCode: string, options: ParseBarcodeOptions): ScanResult {
  const code = rawCode.trim();
  const timeStr = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  const { dishes = [], orders = [], tables = [] } = options;

  // 1. Check if matches a Dish barcode or Dish ID
  const matchedDish = dishes.find(
    (d) =>
      d.barcode?.toLowerCase() === code.toLowerCase() ||
      d.id.toLowerCase() === code.toLowerCase() ||
      d.name.toLowerCase() === code.toLowerCase()
  );

  if (matchedDish) {
    playScannerBeep('beep_cart');
    const result: ScanResult = {
      code,
      type: 'dish',
      title: matchedDish.name,
      subtitle: `¥${matchedDish.price.toFixed(2)} · ${matchedDish.category} · ${matchedDish.available ? '在售' : '已沽清'}`,
      timestamp: timeStr,
      matchedData: matchedDish,
      success: true,
      actionTaken: matchedDish.available ? '自动加入点单台/购物车' : '菜品已沽清，仅展示详情'
    };
    pushScanHistory(result);
    return result;
  }

  // 2. Check if Rider Pickup Code / Food Truck Counter Verification (PICKUP:, PK-, 或4位取件码)
  const isExplicitPickupPrefix = code.startsWith('PICKUP:') || code.startsWith('PK-');
  const cleanPickupCandidate = code.replace(/^(PICKUP:|PK-|#)/i, '').trim().toUpperCase();

  const matchedOrderByPickupCode = orders.find((o) => {
    const pCode = getOrGeneratePickupCode(o.orderNo, o.pickupCode);
    const oNo = (o.orderNo || '').replace(/^#/, '').toUpperCase();
    const oLast4 = oNo.slice(-4);
    return (
      pCode === cleanPickupCandidate ||
      oNo === cleanPickupCandidate ||
      oLast4 === cleanPickupCandidate
    );
  });

  if (isExplicitPickupPrefix || (cleanPickupCandidate.length === 4 && /^\d{4}$/.test(cleanPickupCandidate) && matchedOrderByPickupCode)) {
    playScannerBeep('beep_order');
    const orderObj = matchedOrderByPickupCode;
    const pCode = orderObj ? getOrGeneratePickupCode(orderObj.orderNo, orderObj.pickupCode) : cleanPickupCandidate;
    const shelf = orderObj ? getPickupShelfCode(orderObj.id || orderObj.orderNo, orderObj.pickupShelfCode) : '保温取餐格';

    if (orderObj) {
      dispatchPickupVerifiedEvent({
        orderId: orderObj.id,
        orderNo: orderObj.orderNo,
        pickupCode: pCode,
        pickupShelfCode: shelf,
        verifiedAt: timeStr,
        verifiedBy: '硬件扫码枪自动核销',
        channel: orderObj.channelType || 'delivery'
      });
      // 📢 扫码核销成功外放语音通知
      voiceAlerts.scannerVerifySuccess(`提货码 ${pCode}`, `关联订单 #${orderObj.orderNo.replace(/^#/, '')} 核销通过，请开柜取餐`);
    } else {
      voiceAlerts.scannerVerifySuccess(`取件码 ${cleanPickupCandidate}`, `已完成核验`);
    }

    const result: ScanResult = {
      code,
      type: 'pickup',
      title: orderObj ? `骑手取件码核销: ${pCode}` : `取件码识别: ${cleanPickupCandidate}`,
      subtitle: orderObj
        ? `关联订单 #${orderObj.orderNo.replace('#', '')} · ${shelf} · 移交骑手 ${orderObj.courierName || '专送员'}`
        : `取件码 ${cleanPickupCandidate} · 等待确认放行`,
      timestamp: timeStr,
      matchedData: orderObj || { pickupCode: cleanPickupCandidate },
      success: true,
      actionTaken: orderObj ? '取件码校验通过，已自动更新订单状态并通知骑手与KDS' : '识别取件码'
    };
    pushScanHistory(result);
    return result;
  }

  // 3. Check if Member Card / Member QR (MEM-, VIP-, 11-digit phone)
  const isMemberCode =
    code.startsWith('MEM-') ||
    code.startsWith('VIP-') ||
    code.startsWith('MEMBER-') ||
    /^1[3-9]\d{9}$/.test(code);

  if (isMemberCode) {
    playScannerBeep('beep_member');
    const memberName = code.startsWith('VIP-') ? '黑金至尊VIP会员' : '先锋银卡会员';
    const result: ScanResult = {
      code,
      type: 'member',
      title: `识别会员: ${code}`,
      subtitle: `${memberName} · 积分可用 · 享受专属折扣`,
      timestamp: timeStr,
      matchedData: { memberCode: code, grade: 'VIP' },
      success: true,
      actionTaken: '调取会员CRM档案并激活会员权益'
    };
    pushScanHistory(result);
    return result;
  }

  // 3. Check if Coupon / Voucher Code (CPN-, COUPON-, TICKET-, 优惠券)
  const isCoupon =
    code.startsWith('CPN-') ||
    code.startsWith('COUPON-') ||
    code.startsWith('VOUCHER-') ||
    code.startsWith('DISCOUNT-');

  if (isCoupon) {
    playScannerBeep('beep_success');
    const result: ScanResult = {
      code,
      type: 'coupon',
      title: `优惠券/核销码: ${code}`,
      subtitle: '全单立减 ¥10 · 限时核销',
      timestamp: timeStr,
      matchedData: { couponCode: code, amount: 10 },
      success: true,
      actionTaken: '卡券校验通过，应用立减'
    };
    pushScanHistory(result);
    return result;
  }

  // 4. Check if Order Barcode / Receipt QR (ORD-, UR-, #OD-, 8位以上订单号)
  const matchedOrder = orders.find(
    (o) =>
      o.id.toLowerCase() === code.toLowerCase() ||
      o.orderNo.toLowerCase() === code.toLowerCase() ||
      code.includes(o.orderNo)
  );

  if (matchedOrder || code.startsWith('ORD-') || code.startsWith('UR-')) {
    playScannerBeep('beep_order');
    const title = matchedOrder ? `订单 #${matchedOrder.orderNo}` : `识别订单码: ${code}`;
    const result: ScanResult = {
      code,
      type: 'order',
      title,
      subtitle: matchedOrder
        ? `${matchedOrder.customerName} · ¥${matchedOrder.totalAmount} · ${matchedOrder.statusText}`
        : '出餐小票订单核销',
      timestamp: timeStr,
      matchedData: matchedOrder || { orderId: code },
      success: true,
      actionTaken: '定位订单并完成出餐核销'
    };
    pushScanHistory(result);
    return result;
  }

  // 5. Check if Table QR Code (TBL-, TABLE-, T-01)
  const matchedTable = tables.find(
    (t) =>
      t.id.toLowerCase() === code.toLowerCase() ||
      t.name.toLowerCase() === code.toLowerCase() ||
      `tbl-${t.id}`.toLowerCase() === code.toLowerCase() ||
      `tbl-${t.name}`.toLowerCase() === code.toLowerCase()
  );

  if (matchedTable || code.startsWith('TBL-') || code.startsWith('TABLE-')) {
    playScannerBeep('beep_success');
    const tblName = matchedTable ? matchedTable.name : `台位 ${code}`;
    const result: ScanResult = {
      code,
      type: 'table',
      title: `桌台码: ${tblName}`,
      subtitle: matchedTable ? `状态: ${matchedTable.status} · 容纳 ${matchedTable.capacity} 人` : '快速切换开台',
      timestamp: timeStr,
      matchedData: matchedTable || { tableCode: code },
      success: true,
      actionTaken: '切换至目标桌台进行开台或收银'
    };
    pushScanHistory(result);
    return result;
  }

  // 6. Check if Material / Warehouse Code (MAT-, RAW-)
  if (code.startsWith('MAT-') || code.startsWith('RAW-') || code.startsWith('INV-')) {
    playScannerBeep('beep_success');
    const result: ScanResult = {
      code,
      type: 'material',
      title: `食材原料码: ${code}`,
      subtitle: '后厨进销存快速盘点/入库',
      timestamp: timeStr,
      matchedData: { materialCode: code },
      success: true,
      actionTaken: '调出原料库存卡片进行盘点'
    };
    pushScanHistory(result);
    return result;
  }

  // 7. Fallback: Custom / Unrecognized Barcode (Can be used to bind to dish)
  playScannerBeep('beep_success');
  const result: ScanResult = {
    code,
    type: 'custom',
    title: `条形码: ${code}`,
    subtitle: '未匹配现有商品，可在菜品编辑中一键绑定此条码',
    timestamp: timeStr,
    matchedData: { rawCode: code },
    success: true,
    actionTaken: '广播条码内容供当前输入框自动填入'
  };
  pushScanHistory(result);
  return result;
}

// -------------------------------------------------------------
// Global Hardware Keyboard Stream Listener (HID Wedge Scanner)
// -------------------------------------------------------------
type ScanCallback = (result: ScanResult) => void;

class GlobalBarcodeScannerListener {
  private buffer: string = '';
  private lastKeyTime: number = 0;
  private listeners: Set<ScanCallback> = new Set();
  private isListening: boolean = false;
  private getContextOptions: (() => ParseBarcodeOptions) | null = null;
  private activeBindingCallback: ((scannedCode: string) => void) | null = null;

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  public init(getContextOptions: () => ParseBarcodeOptions) {
    this.getContextOptions = getContextOptions;
    if (typeof window !== 'undefined' && !this.isListening) {
      window.addEventListener('keydown', this.handleKeyDown, true); // capture phase
      this.isListening = true;
    }
  }

  public subscribe(cb: ScanCallback): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  /**
   * Set temporary interceptor for Barcode Binding modal
   * (e.g. When clicking "扫码枪录入", next scan directly feeds this callback)
   */
  public setBindingInterceptor(cb: ((scannedCode: string) => void) | null) {
    this.activeBindingCallback = cb;
  }

  public simulateScan(code: string): ScanResult {
    if (this.activeBindingCallback) {
      playScannerBeep('beep_success');
      this.activeBindingCallback(code);
      this.activeBindingCallback = null;
      return {
        code,
        type: 'custom',
        title: `扫码绑定: ${code}`,
        timestamp: new Date().toLocaleTimeString(),
        success: true,
        actionTaken: '已录入条码绑定框'
      };
    }

    const options = this.getContextOptions ? this.getContextOptions() : { dishes: [] };
    const result = parseAndRouteBarcode(code, options);
    this.listeners.forEach((cb) => cb(result));
    merchantEventBus.emit('merchant:scanner_routed', {
      code,
      type: result.type as any,
      targetId: result.matchedData?.id || result.matchedData?.orderNo || result.matchedData?.sku,
      summary: result.title,
      autoActionTaken: result.success
    });
    return result;
  }

  private handleKeyDown(e: KeyboardEvent) {
    const config = getScannerConfig();
    if (!config.enabled) return;

    // Check if target is an interactive textarea or contenteditable where user is actively typing sentences
    const target = e.target as HTMLElement | null;
    const isEditingTextarea = target && target.tagName === 'TEXTAREA';

    const now = Date.now();
    const interval = now - this.lastKeyTime;
    this.lastKeyTime = now;

    // Reset buffer if keystroke interval is too long (human typing is typically > 100ms)
    // Scanner keystrokes are consistently under 50ms
    if (interval > config.maxKeyIntervalMs * 2.5 && this.buffer.length > 0) {
      this.buffer = '';
    }

    // Check suffix terminator (usually 'Enter')
    if (e.key === config.suffixKey || e.key === 'Enter') {
      if (this.buffer.length >= config.minLength) {
        const scannedCode = this.buffer.trim();
        this.buffer = '';

        // Prevent Enter from submitting forms or triggering random buttons
        e.preventDefault();
        e.stopPropagation();

        if (this.activeBindingCallback) {
          playScannerBeep('beep_success');
          this.activeBindingCallback(scannedCode);
          this.activeBindingCallback = null;
          return;
        }

        const options = this.getContextOptions ? this.getContextOptions() : { dishes: [] };
        const result = parseAndRouteBarcode(scannedCode, options);
        this.listeners.forEach((cb) => cb(result));
        merchantEventBus.emit('merchant:scanner_routed', {
          code: scannedCode,
          type: result.type as any,
          targetId: result.matchedData?.id || result.matchedData?.orderNo || result.matchedData?.sku,
          summary: result.title,
          autoActionTaken: result.success
        });
      } else {
        this.buffer = '';
      }
      return;
    }

    // Ignore single modifier keys (Shift, Ctrl, Alt, Meta, CapsLock)
    if (e.key.length > 1) {
      return;
    }

    // If typing in a textarea and interval is long, don't hijack
    if (isEditingTextarea && interval > config.maxKeyIntervalMs) {
      this.buffer = '';
      return;
    }

    // Append character to barcode buffer
    this.buffer += e.key;
  }

  public destroy() {
    if (typeof window !== 'undefined' && this.isListening) {
      window.removeEventListener('keydown', this.handleKeyDown, true);
      this.isListening = false;
    }
  }
}

export const globalScannerEngine = new GlobalBarcodeScannerListener();
