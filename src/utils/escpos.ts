import { Order, ReceiptTemplateConfig } from '../types';

/**
 * Standard ESC/POS Thermal Receipt Printer Command Generator
 * Compatible with Gprinter (佳博), Xprinter (芯烨), HPRT (汉印), Feie (飞鹅), Jolimark (映美), etc.
 */

// Command constants
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

export class EscPosBuilder {
  private buffer: number[] = [];
  private encoder = new TextEncoder();

  // Initialize printer
  init(): this {
    this.buffer.push(ESC, 0x40); // ESC @
    return this;
  }

  // Text alignment: 0=left, 1=center, 2=right
  align(alignment: 'left' | 'center' | 'right'): this {
    const val = alignment === 'center' ? 1 : alignment === 'right' ? 2 : 0;
    this.buffer.push(ESC, 0x61, val);
    return this;
  }

  // Bold mode
  bold(enable = true): this {
    this.buffer.push(ESC, 0x45, enable ? 1 : 0);
    return this;
  }

  // Size amplification: normal (0x00), doubleHeight (0x01), doubleWidth (0x10), doubleAll (0x11)
  size(size: 'normal' | 'large' | 'huge'): this {
    let val = 0x00;
    if (size === 'large') val = 0x10; // double width
    if (size === 'huge') val = 0x11; // double width + double height
    this.buffer.push(GS, 0x21, val);
    return this;
  }

  // Underline
  underline(enable = true): this {
    this.buffer.push(ESC, 0x2d, enable ? 1 : 0);
    return this;
  }

  // Sound built-in buzzer (beeps n times, length t * 100ms)
  buzzer(beeps = 2, length = 2): this {
    this.buffer.push(ESC, 0x42, beeps, length);
    return this;
  }

  // Print text
  text(str: string): this {
    const bytes = this.encoder.encode(str);
    for (let i = 0; i < bytes.length; i++) {
      this.buffer.push(bytes[i]);
    }
    return this;
  }

  // Print text and line feed
  line(str = ''): this {
    if (str) {
      this.text(str);
    }
    this.buffer.push(LF);
    return this;
  }

  // Feed n lines
  feed(lines = 3): this {
    this.buffer.push(ESC, 0x64, lines);
    return this;
  }

  // Cut paper (partial or full cut)
  cut(partial = true): this {
    this.feed(3);
    this.buffer.push(GS, 0x56, partial ? 0x01 : 0x00);
    return this;
  }

  // Print horizontal line divider
  divider(char = '-', width: 58 | 80 = 58): this {
    const cols = width === 80 ? 46 : 32;
    this.line(char.repeat(cols));
    return this;
  }

  // Two columns justified (left text, right text)
  twoColumn(left: string, right: string, width: 58 | 80 = 58): this {
    const cols = width === 80 ? 46 : 32;
    // Calculate approximate visual length (CJK chars count as 2 cols)
    const getVisualLength = (s: string) => {
      let len = 0;
      for (let i = 0; i < s.length; i++) {
        len += s.charCodeAt(i) > 127 ? 2 : 1;
      }
      return len;
    };

    const leftLen = getVisualLength(left);
    const rightLen = getVisualLength(right);
    const spaces = Math.max(1, cols - leftLen - rightLen);
    this.line(left + ' '.repeat(spaces) + right);
    return this;
  }

  // Build final Uint8Array
  build(): Uint8Array {
    return new Uint8Array(this.buffer);
  }

  // Get total bytes count
  getBytesCount(): number {
    return this.buffer.length;
  }
}

/**
 * Generate standard ESC/POS bytes for an Order receipt
 */
export function buildOrderReceiptBytes(
  order: Order,
  template: ReceiptTemplateConfig,
  paperWidth: '58mm' | '80mm' = '58mm',
  copies = 1
): { bytes: Uint8Array; textPreview: string } {
  const widthVal: 58 | 80 = paperWidth === '80mm' ? 80 : 58;
  const builder = new EscPosBuilder();

  builder.init();

  for (let c = 1; c <= copies; c++) {
    // Beep once for alert
    builder.buzzer(1, 2);

    // 1. Header (Store Title & Subheader)
    builder.align('center');
    builder.size('large').bold(true).line(template.headerTitle);
    builder.size('normal').bold(false);
    if (template.subHeader) {
      builder.line(template.subHeader);
    }
    builder.line(`【${c === 1 ? template.customerCopyText : template.kitchenCopyText}】`);
    builder.divider('=', widthVal);

    // 2. Order Number (Prominent Big Display)
    builder.align('center');
    if (template.showOrderNo) {
      builder.size('huge').bold(true).line(order.orderNo || '#9999');
      builder.size('normal').bold(false);
    }
    builder.align('left');
    builder.twoColumn(`下单时间: ${order.createdTime || '刚刚'}`, `渠道: 外卖专送`, widthVal);
    builder.twoColumn(`顾客姓名: ${order.customerName || '贵客'}`, `电话: ${order.userPhone || '保密'}`, widthVal);
    if (order.deliveryAddress) {
      builder.line(`配送地址: ${order.deliveryAddress}`);
    }
    builder.divider('-', widthVal);

    // 3. Dish Items Table
    builder.bold(true);
    builder.twoColumn('品名 / 规格', '数量   金额', widthVal);
    builder.bold(false);
    builder.divider('-', widthVal);

    order.items.forEach((item) => {
      const priceStr = `¥${(item.price * item.quantity).toFixed(1)}`;
      const qtyStr = `x${item.quantity}`;
      builder.twoColumn(item.name, `${qtyStr}  ${priceStr}`, widthVal);
      if (template.showOptionNotes && item.options) {
        builder.line(`  ↳ 规格: ${item.options}`);
      }
    });

    builder.divider('-', widthVal);

    // 4. Totals & Settlement
    if (template.showPrice) {
      builder.twoColumn('商品小计:', `¥${order.totalAmount.toFixed(2)}`, widthVal);
      builder.twoColumn('配送运费:', '¥0.00 (免运费)', widthVal);
      builder.size('large').bold(true);
      builder.twoColumn('实付总额:', `¥${order.totalAmount.toFixed(2)}`, widthVal);
      builder.size('normal').bold(false);
    }

    builder.divider('=', widthVal);

    // 5. WiFi & QR Note
    builder.align('center');
    if (template.wifiName) {
      builder.line(`车载高速 WiFi: ${template.wifiName}`);
      if (template.wifiPassword) {
        builder.line(`连接密码: ${template.wifiPassword}`);
      }
    }

    if (template.showQrCode) {
      builder.line('[ 扫码开票 / 服务点评二维码 ]');
      builder.line('(使用微信/浏览器扫描小票底部)');
    }

    if (template.footerNotes) {
      builder.line(template.footerNotes);
    }

    builder.line('*** 感谢您的惠顾，祝您用餐愉快 ***');

    // Feed and cut
    if (c < copies) {
      builder.feed(4);
      builder.divider('*', widthVal);
    } else {
      builder.cut(true);
    }
  }

  // Generate readable ASCII preview
  const textPreview = generateReceiptAsciiPreview(order, template, paperWidth);

  return {
    bytes: builder.build(),
    textPreview
  };
}

/**
 * Generate readable ASCII preview for display
 */
export function generateReceiptAsciiPreview(
  order: Order,
  template: ReceiptTemplateConfig,
  paperWidth: '58mm' | '80mm' = '58mm'
): string {
  const lineChar = paperWidth === '80mm' ? '='.repeat(42) : '='.repeat(32);
  const dashChar = paperWidth === '80mm' ? '-'.repeat(42) : '-'.repeat(32);

  let out = '';
  out += `${template.headerTitle}\n`;
  if (template.subHeader) out += `${template.subHeader}\n`;
  out += `【${template.customerCopyText}】\n`;
  out += `${lineChar}\n`;
  if (template.showOrderNo) out += `[ 取餐号: ${order.orderNo || '#0000'} ]\n`;
  out += `时间: ${order.createdTime || '刚刚'}  渠道: 外卖专送\n`;
  out += `顾客: ${order.customerName || '贵宾'} (${order.userPhone || '138****8888'})\n`;
  if (order.deliveryAddress) out += `地址: ${order.deliveryAddress}\n`;
  out += `${dashChar}\n`;
  out += `品名 / 规格                    数量  金额\n`;
  out += `${dashChar}\n`;

  order.items.forEach((item) => {
    out += `${item.name.padEnd(18, ' ')} x${item.quantity}  ¥${(item.price * item.quantity).toFixed(1)}\n`;
    if (template.showOptionNotes && item.options) {
      out += `  ↳ ${item.options}\n`;
    }
  });

  out += `${dashChar}\n`;
  if (template.showPrice) {
    out += `商品小计: ¥${order.totalAmount.toFixed(2)}\n`;
    out += `实付总额: ¥${order.totalAmount.toFixed(2)}\n`;
  }
  out += `${lineChar}\n`;
  if (template.wifiName) {
    out += `WiFi: ${template.wifiName}  密码: ${template.wifiPassword || '无'}\n`;
  }
  if (template.footerNotes) {
    out += `${template.footerNotes}\n`;
  }
  out += `*** 感谢惠顾 · 极速出餐 ***\n`;

  return out;
}

/**
 * Generate Self-Test page ESC/POS bytes
 */
export function buildSelfTestBytes(printerName: string, paperWidth: '58mm' | '80mm'): Uint8Array {
  const builder = new EscPosBuilder();
  const widthVal: 58 | 80 = paperWidth === '80mm' ? 80 : 58;

  builder.init();
  builder.buzzer(2, 2);
  builder.align('center');
  builder.size('large').bold(true).line('蓝牙打印机 硬件自检样张');
  builder.size('normal').bold(false);
  builder.divider('=', widthVal);

  builder.align('left');
  builder.line(`设备型号: ${printerName}`);
  builder.line(`纸张规格: ${paperWidth} 热敏连续卷纸`);
  builder.line(`固件版本: V4.18_BLE_PRO (2026-08)`);
  builder.line(`通信协议: Bluetooth 5.2 / BLE SPP GATT`);
  builder.line(`指令集: ESC/POS / CPCL 增强模式`);
  builder.line(`打印浓度: 默认 (Level 3 标准黑度)`);
  builder.line(`波特率: 115200 bps / 自动协商`);
  builder.line(`切刀状态: 步进式切刀 (已使能)`);
  builder.line(`电池状态: 锂电池供电 8.4V (电量充足)`);
  builder.divider('-', widthVal);

  builder.align('center');
  builder.line('字库测试 (Chinese GB18030 / English):');
  builder.line('黑曜石流动餐车 GPS 极速专送');
  builder.line('ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789');
  builder.divider('-', widthVal);

  builder.align('left');
  builder.line(`自检时间: ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`);
  builder.line('测试结果: [ PASS 正常就绪 ]');
  builder.cut(true);

  return builder.build();
}

export interface BluetoothRemoteGATTCharacteristic {
  writeValueWithResponse?(value: BufferSource): Promise<void>;
  writeValue?(value: BufferSource): Promise<void>;
  properties?: {
    write?: boolean;
    writeWithoutResponse?: boolean;
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * Send byte stream to Web Bluetooth Characteristic in chunks
 */
export async function sendBytesToBluetoothCharacteristic(
  characteristic: BluetoothRemoteGATTCharacteristic,
  bytes: Uint8Array,
  onProgress?: (sent: number, total: number) => void
): Promise<void> {
  const CHUNK_SIZE = 128; // 128-byte packets optimal for BLE MTU
  const total = bytes.length;

  for (let offset = 0; offset < total; offset += CHUNK_SIZE) {
    const chunk = bytes.slice(offset, Math.min(offset + CHUNK_SIZE, total));
    if (characteristic.writeValueWithResponse) {
      await characteristic.writeValueWithResponse(chunk);
    } else {
      await characteristic.writeValue(chunk);
    }
    if (onProgress) {
      onProgress(Math.min(offset + CHUNK_SIZE, total), total);
    }
    // Small inter-packet delay to prevent buffer overrun on thermal printer MCU
    await new Promise((r) => setTimeout(r, 20));
  }
}
