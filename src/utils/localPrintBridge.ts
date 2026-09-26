/**
 * 本地打印桥 (Local Print Bridge) 客户端
 *
 * 连接收银电脑上的零依赖打印服务 (127.0.0.1:17778)，
 * 将纯文本小票交给 Windows 打印队列 (GDI) 直出 POS-80 热敏机。
 *
 * - 桥未运行 / 超时 / 失败时，所有接口安全降级返回 ok:false，
 *   不抛异常、不阻塞，完全不影响原有打印链路 (蓝牙/网口/WebUSB)。
 * - 打印桥端负责 GBK 兼容排版（浏览器 TextEncoder 只出 UTF-8，
 *   POS 热敏机硬件字库需要 GBK，转码统一在桥端完成）。
 */
const BRIDGE_URL = 'http://127.0.0.1:17778';

export interface BridgeStatus {
  online: boolean;
  printer?: string;
  present?: boolean;
  status?: string;
  queue?: number;
  error?: string;
}

export interface BridgePrintResult {
  ok: boolean;
  error?: string;
  bytes?: string;
  ms?: number;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** 探测本机打印桥是否在线 (6s 超时，兼容 PNA 预检较慢的环境) */
export async function probeLocalBridge(): Promise<BridgeStatus> {
  try {
    const res = await fetchWithTimeout(`${BRIDGE_URL}/api/status`, { method: 'GET' }, 6000);
    if (!res.ok) return { online: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { ...data, online: true };
  } catch {
    return { online: false, error: '打印桥未运行' };
  }
}

/** 打印纯文本小票 (title 会以大号加粗居中呈现在票头) */
export async function printTextViaBridge(
  text: string,
  title?: string,
  printerName?: string
): Promise<BridgePrintResult> {
  try {
    const res = await fetchWithTimeout(
      `${BRIDGE_URL}/api/print`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'text', text, title, printerName })
      },
      20000
    );
    return await res.json();
  } catch (e: any) {
    return {
      ok: false,
      error: e?.name === 'AbortError' ? '打印桥响应超时' : '打印桥未运行 (请在收银电脑启动 PrintBridge)'
    };
  }
}

/** 结构化排版行: {t,a,b} 单栏文本 或 {l,r,b} 两栏行 (l 左对齐标签 / r 加粗右对齐值) */
export interface BridgeLayoutLine {
  t?: string;
  l?: string;
  r?: string;
  a?: 'left' | 'center' | 'right';
  b?: boolean;
}

/** 结构化排版打印: 微软雅黑渲染，分栏右对齐由打印桥精确绘制 (不依赖空格补位)
 *  ticketType: customer(顾客联·默认) / kitchen(后厨备餐联) / selftest(自检样张)，各票别独立样式 */
export async function printLayoutViaBridge(
  lines: BridgeLayoutLine[],
  title?: string,
  ticketType: BridgeTicketType = 'customer',
  printerName?: string
): Promise<BridgePrintResult> {
  try {
    const res = await fetchWithTimeout(
      `${BRIDGE_URL}/api/print`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'layout', title, lines, ticketType, printerName })
      },
      30000
    );
    return await res.json();
  } catch (e: any) {
    return {
      ok: false,
      error: e?.name === 'AbortError' ? '打印桥响应超时' : '打印桥未运行 (请在收银电脑启动 PrintBridge)'
    };
  }
}

/** 打印桥端排版样式 (打印与预览共用，纸面所见即所得) */
export interface BridgePrintStyle {
  fontFamily: 'light' | 'regular' | 'simsun';
  fontSizePt: number;
  marginLeftMm: number;
  marginRightMm: number;
  marginTopMm: number;
  marginBottomMm: number;
  paperWidthMm: 58 | 80;
}

/** 票别: 每类票各自一套独立样式 (桥端分文件持久化) */
export type BridgeTicketType = 'customer' | 'kitchen' | 'selftest';

export const BRICKET_TYPE_LABELS: Record<BridgeTicketType, string> = {
  customer: '顾客联',
  kitchen: '后厨备餐联',
  selftest: '自检样张'
};

export const DEFAULT_PRINT_STYLES: Record<BridgeTicketType, BridgePrintStyle> = {
  customer: {
    fontFamily: 'light', fontSizePt: 9,
    marginLeftMm: 4, marginRightMm: 4, marginTopMm: 4, marginBottomMm: 4,
    paperWidthMm: 80
  },
  kitchen: {
    fontFamily: 'regular', fontSizePt: 10.5,
    marginLeftMm: 3, marginRightMm: 3, marginTopMm: 3, marginBottomMm: 3,
    paperWidthMm: 80
  },
  selftest: {
    fontFamily: 'light', fontSizePt: 9,
    marginLeftMm: 4, marginRightMm: 4, marginTopMm: 4, marginBottomMm: 4,
    paperWidthMm: 80
  }
};

// 兼容旧引用
export const DEFAULT_PRINT_STYLE: BridgePrintStyle = DEFAULT_PRINT_STYLES.customer;

/** 读取打印桥当前排版样式 (按票别) */
export async function getPrintStyle(ticketType: BridgeTicketType = 'customer'): Promise<{ ok: boolean; style?: BridgePrintStyle; error?: string }> {
  try {
    const res = await fetchWithTimeout(`${BRIDGE_URL}/api/style?type=${ticketType}`, { method: 'GET' }, 5000);
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { ok: true, style: data.style };
  } catch {
    return { ok: false, error: '打印桥未运行' };
  }
}

/** 保存排版样式到打印桥 (按票别持久化，打印立即生效) */
export async function savePrintStyle(style: BridgePrintStyle, ticketType: BridgeTicketType = 'customer'): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetchWithTimeout(
      `${BRIDGE_URL}/api/style`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style, ticketType })
      },
      5000
    );
    return await res.json();
  } catch {
    return { ok: false, error: '打印桥未运行' };
  }
}

/** 结构化排版实时预览: 由打印桥 GDI 按真实打印参数渲染成 PNG (不消耗纸张)
 *  style 可选: 传入未保存的调参值即可实时预览 (桥端临时文件渲染，不落盘) */
export async function previewLayoutViaBridge(
  lines: BridgeLayoutLine[],
  title?: string,
  style?: BridgePrintStyle,
  ticketType: BridgeTicketType = 'customer'
): Promise<{ ok: boolean; pngBase64?: string; ms?: number; error?: string }> {
  try {
    const res = await fetchWithTimeout(
      `${BRIDGE_URL}/api/print`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'preview', title, lines, style, ticketType })
      },
      10000
    );
    return await res.json();
  } catch (e: any) {
    return {
      ok: false,
      error: e?.name === 'AbortError' ? '预览响应超时' : '打印桥未运行 (请在收银电脑启动 PrintBridge)'
    };
  }
}

/** 透传原始 ESC/POS 字节 (桥端 base64 解码后经 RAW 通道发送，实验性) */
export async function printRawViaBridge(bytes: Uint8Array, printerName?: string): Promise<BridgePrintResult> {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as unknown as number[]);
  }
  try {
    const res = await fetchWithTimeout(
      `${BRIDGE_URL}/api/print`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'raw', rawBase64: btoa(binary), printerName })
      },
      20000
    );
    return await res.json();
  } catch (e: any) {
    return {
      ok: false,
      error: e?.name === 'AbortError' ? '打印桥响应超时' : '打印桥未运行 (请在收银电脑启动 PrintBridge)'
    };
  }
}
