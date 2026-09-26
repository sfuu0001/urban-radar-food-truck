import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, RefreshCw, Save, SlidersHorizontal, AlertCircle, Printer, Utensils, User, FileText } from 'lucide-react';
import {
  BridgePrintStyle,
  BridgeTicketType,
  BridgeLayoutLine,
  DEFAULT_PRINT_STYLES,
  getPrintStyle,
  savePrintStyle,
  previewLayoutViaBridge
} from '../../../utils/localPrintBridge';
import { Order, ReceiptTemplateConfig } from '../../../types';
import {
  buildOrderReceiptLayoutLines,
  buildKitchenTicketLayoutLines,
  buildSelfTestLayoutLines
} from '../../../utils/escpos';

/**
 * 打印样式调校弹窗 — 按票别独立管理 (顾客联 / 后厨备餐联 / 自检样张)，
 * 字体/字号/边距/纸宽实时可调，预览图由本地打印桥 GDI 按真实打印参数渲染 (203dpi 纸面仿真，不出纸)
 */
interface PrintStyleTunerModalProps {
  open: boolean;
  onClose: () => void;
  showToast: (msg: string) => void;
  sampleOrder: Order;
  sampleTemplate: ReceiptTemplateConfig;
  sampleChannel: 'dine_in' | 'pickup' | 'delivery';
  autoPrintEnabled: boolean;
}

const FONT_OPTIONS: { key: BridgePrintStyle['fontFamily']; label: string; desc: string }[] = [
  { key: 'light', label: '雅黑 Light', desc: '细笔画·热敏清晰' },
  { key: 'regular', label: '微软雅黑', desc: '标准现代黑体' },
  { key: 'simsun', label: '宋体', desc: '传统针打风格' }
];

const TYPE_TABS: { key: BridgeTicketType; label: string; icon: React.ElementType; hint: string }[] = [
  { key: 'customer', label: '顾客联', icon: User, hint: '含价格 · 交付顾客' },
  { key: 'kitchen', label: '后厨备餐联', icon: Utensils, hint: '无价格 · 灶台远看' },
  { key: 'selftest', label: '自检样张', icon: FileText, hint: '诊断 · 测试打印' }
];

export const PrintStyleTunerModal: React.FC<PrintStyleTunerModalProps> = ({
  open,
  onClose,
  showToast,
  sampleOrder,
  sampleTemplate,
  sampleChannel,
  autoPrintEnabled
}) => {
  const [activeType, setActiveType] = useState<BridgeTicketType>('customer');
  const [styles, setStyles] = useState<Record<BridgeTicketType, BridgePrintStyle>>({ ...DEFAULT_PRINT_STYLES });
  const [bridgeOk, setBridgeOk] = useState<boolean | null>(null);
  const [previewPng, setPreviewPng] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string>('');
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const previewTimer = useRef<number | null>(null);
  const previewSeq = useRef(0);

  // 每类票的真实样张 (内容随票别与当前订单/模板变化)
  const getSample = useCallback(
    (type: BridgeTicketType): { title: string; lines: BridgeLayoutLine[] } => {
      const pw: '58mm' | '80mm' = (styles[type] || DEFAULT_PRINT_STYLES[type]).paperWidthMm === 58 ? '58mm' : '80mm';
      if (type === 'kitchen') {
        return {
          title: '后厨备餐联预览',
          lines: buildKitchenTicketLayoutLines({
            id: 'tuner-demo-ticket',
            ticketNo: '#A1086',
            tableOrChannel: '外摆 A1 桌',
            channelType: 'dine_in',
            orderTime: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
            elapsedMinutes: 6,
            status: 'cooking',
            pickupCode: '6812',
            items: sampleOrder.items.slice(0, 5).map((it, i) => ({
              id: `tuner-k-${i}`,
              dishName: it.name,
              quantity: it.quantity,
              options: it.options,
              isCompleted: false
            }))
          })
        };
      }
      if (type === 'selftest') {
        return {
          title: '自检样张预览',
          lines: buildSelfTestLayoutLines({
            deviceName: 'POS-80 热敏小票机',
            paperWidth: pw,
            channelLabel: '本机打印桥 · Windows 队列直连',
            hardwareId: 'USB001',
            isDefault: true,
            autoPrint: autoPrintEnabled
          })
        };
      }
      return {
        title: '顾客联预览',
        lines: buildOrderReceiptLayoutLines(sampleOrder, sampleTemplate, pw, sampleChannel)
      };
    },
    [styles, sampleOrder, sampleTemplate, sampleChannel, autoPrintEnabled]
  );

  // 打开时读取三套票别的当前样式
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPreviewPng(null);
    setPreviewError('');
    (async () => {
      const [c, k, s] = await Promise.all([
        getPrintStyle('customer'),
        getPrintStyle('kitchen'),
        getPrintStyle('selftest')
      ]);
      if (cancelled) return;
      setStyles({
        customer: (c.ok && c.style) || DEFAULT_PRINT_STYLES.customer,
        kitchen: (k.ok && k.style) || DEFAULT_PRINT_STYLES.kitchen,
        selftest: (s.ok && s.style) || DEFAULT_PRINT_STYLES.selftest
      });
      setBridgeOk(c.ok || k.ok || s.ok);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const runPreview = useCallback(
    async (type: BridgeTicketType, s: BridgePrintStyle) => {
      const seq = ++previewSeq.current;
      setPreviewing(true);
      setPreviewError('');
      const sample = getSample(type);
      const res = await previewLayoutViaBridge(sample.lines, sample.title, s, type);
      if (seq !== previewSeq.current) return; // 过期响应丢弃
      if (res.ok && res.pngBase64) {
        setPreviewPng(res.pngBase64);
      } else {
        setPreviewError(res.error || '预览渲染失败');
        setPreviewPng(null);
      }
      setPreviewing(false);
    },
    [getSample]
  );

  // 样式/票别变更 → 600ms 防抖后自动实时预览
  useEffect(() => {
    if (!open || bridgeOk !== true) return;
    if (previewTimer.current) window.clearTimeout(previewTimer.current);
    previewTimer.current = window.setTimeout(() => runPreview(activeType, styles[activeType]), 600);
    return () => {
      if (previewTimer.current) window.clearTimeout(previewTimer.current);
    };
  }, [styles, activeType, open, bridgeOk, runPreview]);

  const patch = (p: Partial<BridgePrintStyle>) =>
    setStyles((all) => ({ ...all, [activeType]: { ...all[activeType], ...p } }));

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    const res = await savePrintStyle(styles[activeType], activeType);
    setSaving(false);
    if (res.ok) {
      showToast(`【${TYPE_TABS.find((t) => t.key === activeType)?.label}】打印样式已保存，出票立即生效`);
    } else {
      showToast(`保存失败: ${res.error || '打印桥未运行'}`);
    }
  };

  const handleSaveAll = async () => {
    if (saving) return;
    setSaving(true);
    const results = await Promise.all([
      savePrintStyle(styles.customer, 'customer'),
      savePrintStyle(styles.kitchen, 'kitchen'),
      savePrintStyle(styles.selftest, 'selftest')
    ]);
    setSaving(false);
    if (results.every((r) => r.ok)) {
      showToast('三套票别样式已全部保存，出票立即生效');
      onClose();
    } else {
      showToast(`部分保存失败: ${results.filter((r) => !r.ok).length}/3 套未写入`);
    }
  };

  const handleResetType = () =>
    setStyles((all) => ({ ...all, [activeType]: { ...DEFAULT_PRINT_STYLES[activeType] } }));

  const handleRetryBridge = async () => {
    const res = await getPrintStyle('customer');
    if (res.ok) {
      setBridgeOk(true);
    } else {
      showToast('仍未检测到本地打印桥，请先启动 start-bridge.cmd');
    }
  };

  if (!open) return null;

  const style = styles[activeType];
  const previewWidthPx = style.paperWidthMm === 80 ? 288 : 212;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl h-[82vh] rounded-lg border border-[#e6e6e4] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 bg-white border-b border-[#e6e6e4] flex items-center justify-between shrink-0">
          <span className="font-bold text-sm flex items-center gap-2 text-[#0f172a]">
            <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
            打印样式调校 · 分票别管理
            <span className="text-[10px] font-normal text-[#9b9a97] bg-neutral-100 px-1.5 py-0.5 rounded-full">
              预览 = 本地打印桥 GDI 真实渲染 (203dpi)
            </span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-[#787774] hover:text-[#201f1d] p-1 rounded hover:bg-neutral-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 票别切换 tabs */}
        <div className="px-4 pt-3 bg-white border-b border-[#e6e6e4] flex items-center gap-1.5 shrink-0">
          {TYPE_TABS.map((t) => {
            const Icon = t.icon;
            const active = activeType === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveType(t.key)}
                className={`px-3 py-2 rounded-t-lg border border-b-0 text-xs cursor-pointer transition-colors flex items-center gap-1.5 ${
                  active
                    ? 'bg-[#fbfbfa] border-[#e6e6e4] text-slate-900 font-bold -mb-px'
                    : 'bg-transparent border-transparent text-[#787774] hover:text-[#37352f]'
                }`}
                title={t.hint}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-emerald-600' : 'text-[#9b9a97]'}`} />
                <span>{t.label}</span>
                <span className="text-[10px] font-normal text-[#9b9a97] hidden sm:inline">· {t.hint.split(' ·')[0]}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 grid grid-cols-[320px_1fr] overflow-hidden">
          {/* Left: controls */}
          <div className="border-r border-[#e6e6e4] overflow-y-auto p-4 space-y-5 bg-[#fbfbfa]">
            {bridgeOk === false && (
              <div className="rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 space-y-2">
                <div className="flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>本地打印桥未连接，无法实时预览与保存。请在收银机双击 start-bridge.cmd 启动。</span>
                </div>
                <button
                  type="button"
                  onClick={handleRetryBridge}
                  className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] cursor-pointer"
                >
                  重新检测
                </button>
              </div>
            )}

            {/* 字体 */}
            <div>
              <p className="text-xs font-bold text-[#0f172a] mb-2">字体</p>
              <div className="grid grid-cols-3 gap-1.5">
                {FONT_OPTIONS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => patch({ fontFamily: f.key })}
                    className={`px-2 py-2 rounded border text-xs cursor-pointer transition-colors ${
                      style.fontFamily === f.key
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-[#37352f] border-[#e6e6e4] hover:bg-neutral-50'
                    }`}
                  >
                    <span className="block font-bold">{f.label}</span>
                    <span className={`block text-[10px] mt-0.5 ${style.fontFamily === f.key ? 'text-neutral-300' : 'text-[#9b9a97]'}`}>
                      {f.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 字号 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-[#0f172a]">字号 (正文)</p>
                <span className="text-xs font-bold text-emerald-700">{style.fontSizePt} pt</span>
              </div>
              <input
                type="range"
                min={7}
                max={13}
                step={0.5}
                value={style.fontSizePt}
                onChange={(e) => patch({ fontSizePt: Number(e.target.value) })}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#9b9a97] mt-0.5">
                <span>7pt 精细</span>
                <span>标题自动 = 字号+6</span>
                <span>13pt 老花友好</span>
              </div>
            </div>

            {/* 纸宽 */}
            <div>
              <p className="text-xs font-bold text-[#0f172a] mb-2">纸卷宽度</p>
              <div className="grid grid-cols-2 gap-1.5">
                {([80, 58] as const).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => patch({ paperWidthMm: w })}
                    className={`px-2 py-2 rounded border text-xs font-bold cursor-pointer transition-colors ${
                      style.paperWidthMm === w
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-[#37352f] border-[#e6e6e4] hover:bg-neutral-50'
                    }`}
                  >
                    {w}mm {w === 80 ? '(POS-80 主力)' : '(便携窄纸)'}
                  </button>
                ))}
              </div>
            </div>

            {/* 边距 */}
            <div>
              <p className="text-xs font-bold text-[#0f172a] mb-2">页边距 (mm)</p>
              <div className="space-y-3">
                {([
                  { key: 'marginLeftMm', label: '左' },
                  { key: 'marginRightMm', label: '右' },
                  { key: 'marginTopMm', label: '上' },
                  { key: 'marginBottomMm', label: '下' }
                ] as const).map((m) => (
                  <div key={m.key} className="flex items-center gap-2">
                    <span className="text-[11px] w-4 text-[#787774] shrink-0">{m.label}</span>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      step={0.5}
                      value={style[m.key]}
                      onChange={(e) => patch({ [m.key]: Number(e.target.value) } as Partial<BridgePrintStyle>)}
                      className="flex-1 accent-emerald-600 cursor-pointer"
                    />
                    <span className="text-[11px] w-9 text-right font-bold text-[#37352f] tabular-nums">
                      {style[m.key]}mm
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-1 border-t border-[#e6e6e4] space-y-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetType}
                  className="flex-1 px-3 py-2 bg-white hover:bg-neutral-50 text-[#787774] border border-[#e6e6e4] rounded text-xs font-bold cursor-pointer flex items-center justify-center gap-1"
                  title="仅重置当前票别"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  恢复本票别默认
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || bridgeOk !== true}
                  className="flex-1 px-3 py-2 bg-slate-900 hover:bg-black text-white rounded text-xs font-bold cursor-pointer flex items-center justify-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Save className="w-3.5 h-3.5 text-emerald-400" />
                  {saving ? '保存中...' : '保存本票别'}
                </button>
              </div>
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={saving || bridgeOk !== true}
                className="w-full px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold cursor-pointer flex items-center justify-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Printer className="w-3.5 h-3.5" />
                三套票别全部保存并关闭
              </button>
            </div>
          </div>

          {/* Right: live preview */}
          <div className="bg-neutral-200/70 overflow-auto flex flex-col items-center">
            <div className="w-full px-3 py-2 bg-white/70 border-b border-neutral-300/60 flex items-center justify-between sticky top-0 z-10">
              <span className="text-[11px] font-bold text-[#37352f] flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5 text-emerald-600" />
                {TYPE_TABS.find((t) => t.key === activeType)?.label} · 实时纸面预览 · {style.paperWidthMm}mm
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${previewing ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {previewing ? '渲染中...' : '与打印输出一致'}
              </span>
            </div>
            <div className="flex-1 w-full flex items-start justify-center p-6">
              {bridgeOk === true && previewPng && (
                <div
                  className="bg-white shadow-[0_2px_12px_rgba(0,0,0,0.18)] relative transition-opacity"
                  style={{ width: previewWidthPx, opacity: previewing ? 0.55 : 1 }}
                >
                  <img src={`data:image/png;base64,${previewPng}`} alt="打印预览" className="w-full block" />
                  {/* 纸卷锯齿边 */}
                  <div
                    className="absolute left-0 right-0 -bottom-1.5 h-1.5"
                    style={{
                      background: 'linear-gradient(45deg, transparent 33%, #ffffff 33%, #ffffff 66%, transparent 66%), linear-gradient(-45deg, transparent 33%, #ffffff 33%, #ffffff 66%, transparent 66%)',
                      backgroundSize: '8px 6px'
                    }}
                  />
                </div>
              )}
              {bridgeOk === true && !previewPng && (
                <div className="text-xs text-[#787774] py-16">
                  {previewing ? '正在按当前样式渲染纸面预览...' : previewError || '等待样式渲染...'}
                </div>
              )}
              {bridgeOk !== true && (
                <div className="text-xs text-[#787774] py-16 max-w-[260px] text-center">
                  连接本地打印桥后，此处将显示与真实出纸完全一致的渲染效果
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
