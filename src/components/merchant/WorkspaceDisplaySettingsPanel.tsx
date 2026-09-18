/* ============================================================================
 * WorkspaceDisplaySettingsPanel —— 工作台显示设置（⚙ 锚定下拉弹窗小组件）
 * ----------------------------------------------------------------------------
 * 极简极白设计（纯白底色 + 高亮黑色线条轮廓）
 * 内容分组：
 *   ① 快捷按钮显示模式（仅图标 vs 打开常驻）
 *   ② 表单内容区最大宽度（进度阻力滑块 · 随屏幕占比动态自适应计算）
 *   ③ 订单中心网格列数（自动 / 2列 / 3列 / 4列）
 *   ④ 毛利红线比例（阻力滑动微调）
 *   ⑤ 客食端预览管控（1+3 四开关）
 * 偏好：本地即时生效 + 云端双向同步
 * ==========================================================================*/

import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  X,
  Monitor,
  Columns3,
  Target,
  CloudCheck,
  CloudOff,
  RotateCcw,
  Loader2,
  MousePointer,
  Type,
  LayoutGrid,
  Maximize2,
  Sliders,
  Frame
} from 'lucide-react';
import {
  WorkspacePrefs,
  OrdersColumnsPref,
  ButtonDisplayMode,
  DEFAULT_WORKSPACE_PREFS,
  WIDTH_RESISTANCE_ANCHORS,
  applyResistanceSnap,
  MARGIN_RESISTANCE_ANCHORS,
  applyMarginResistanceSnap,
  loadLocalPrefs,
  saveLocalPrefs,
  fetchPrefsFromCloud
} from '../../utils/workspacePreferences';
import { CustomerPreviewControl } from '../preview/CustomerPreviewControl';

interface WorkspaceDisplaySettingsPanelProps {
  open: boolean;
  onClose: () => void;
  prefs: WorkspacePrefs;
  onChange: (patch: Partial<WorkspacePrefs>) => void;
  syncState: 'idle' | 'saving' | 'synced' | 'local_only';
  showToast?: (msg: string) => void;
}

const COLUMN_OPTIONS: { value: OrdersColumnsPref; label: string; desc: string }[] = [
  { value: 'auto', label: '自动', desc: '视口自适应' },
  { value: 2, label: '2 列', desc: '双栏大卡' },
  { value: 3, label: '3 列', desc: '标准三栏' },
  { value: 4, label: '4 列', desc: '紧凑四栏' }
];

const SYNC_META: Record<WorkspaceDisplaySettingsPanelProps['syncState'], { icon: React.ReactNode; text: string; cls: string }> = {
  idle: { icon: <CloudOff className="w-3 h-3" />, text: '本地存储', cls: 'text-[#686763] border-[#e2e1dc] bg-[#fbfbfa]' },
  saving: { icon: <Loader2 className="w-3 h-3 animate-spin" />, text: '云端同步中…', cls: 'text-[#1d4ed8] border-[#bfdbfe] bg-[#eff6ff]' },
  synced: { icon: <CloudCheck className="w-3 h-3" />, text: '云端已双向同步', cls: 'text-[#15803d] border-[#bbf7d0] bg-[#f0fdf4]' },
  local_only: { icon: <CloudOff className="w-3 h-3" />, text: '仅本地已存', cls: 'text-[#b45309] border-[#fde68a] bg-[#fffbeb]' }
};

export function WorkspaceDisplaySettingsPanel({
  open,
  onClose,
  prefs,
  onChange,
  syncState,
  showToast
}: WorkspaceDisplaySettingsPanelProps) {
  const [pullState, setPullState] = useState<'idle' | 'pulling' | 'pulled' | 'none'>('idle');
  const rootRef = useRef<HTMLDivElement | null>(null);

  // 动态视口屏幕宽度（支持窗口 resize 实时重新计算）
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1920
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 当前屏幕占比与实时最大宽度像素值
  const currentRatio = useMemo(() => {
    if (prefs.contentWidthPercent) return prefs.contentWidthPercent;
    if (prefs.contentWidth === 'wide') return 100;
    if (prefs.contentWidth === 'compact') return 65;
    return 88;
  }, [prefs.contentWidth, prefs.contentWidthPercent]);

  const calculatedPixelWidth = useMemo(() => {
    if (currentRatio >= 100) return '视口 100% 全宽铺满';
    const px = Math.round((viewportWidth * currentRatio) / 100);
    return `约 ${px}px (视口 ${viewportWidth}px × ${currentRatio}%)`;
  }, [viewportWidth, currentRatio]);

  // 打开时触发一次云端拉取（双向同步的「云 → 本地」方向；本地被删时自动还原）
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPullState('pulling');
    fetchPrefsFromCloud().then((cloud) => {
      if (cancelled) return;
      const local = loadLocalPrefs();
      if (cloud && (!local?.updatedAt || !cloud.updatedAt || cloud.updatedAt >= local.updatedAt)) {
        saveLocalPrefs(cloud);
        onChange(cloud);
        setPullState('pulled');
      } else {
        setPullState(local ? 'pulled' : 'none');
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 点外部 / Esc 关闭
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;
  const syncMeta = SYNC_META[syncState] ?? SYNC_META.idle;

  // 滑块阻力吸附调整处理
  const handleRatioSliderChange = (rawVal: number) => {
    const snapped = applyResistanceSnap(rawVal, 2);
    const mode = snapped >= 98 ? 'wide' : snapped <= 68 ? 'compact' : 'standard';
    onChange({
      contentWidthPercent: snapped,
      contentWidth: mode
    });
  };

  const handleSnapAnchorClick = (percent: number) => {
    const mode = percent >= 98 ? 'wide' : percent <= 68 ? 'compact' : 'standard';
    onChange({
      contentWidthPercent: percent,
      contentWidth: mode
    });
    showToast?.(`已吸附至「${percent}% 屏幕占比」宽度`);
  };

  // 窗口安全边距阻力吸附调整处理
  const handleMarginSliderChange = (rawVal: number) => {
    const snapped = applyMarginResistanceSnap(rawVal, 1);
    onChange({ windowSafeMargin: snapped });
  };

  const handleMarginAnchorClick = (px: number) => {
    onChange({ windowSafeMargin: px });
    showToast?.(px === 0 ? '已完全删除窗口安全边距 (0px 极致贴边铺满)' : `已吸附至「${px}px 窗口安全边距」`);
  };

  return (
    <div
      ref={rootRef}
      className="absolute right-0 top-[calc(100%+8px)] w-[360px] max-h-[calc(100dvh-96px)] overflow-y-auto bg-white border border-[#e2e1dc] shadow-2xl rounded-[8px] z-[70] custom-scrollbar text-[#1a1918]"
      role="dialog"
      aria-label="工作台显示设置"
    >
      {/* 顶部白色精致标题栏 */}
      <div className="sticky top-0 z-10 px-3.5 py-3 bg-white/95 backdrop-blur-md border-b border-[#e8e7e3] flex items-center justify-between">
        <div>
          <div className="font-headline-sm text-xs font-bold tracking-tight text-[#1a1918] flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-[#1a1918]" />
            <span>工作台显示设置</span>
          </div>
          <div className="font-label-micro text-[9px] text-[#787770] font-mono mt-0.5 tracking-wider">
            WORKSPACE DISPLAY · 本地+云端双向同步
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-[4px] border border-transparent hover:border-[#e2e1dc] bg-transparent hover:bg-[#f4f4f2] flex items-center justify-center text-[#787770] hover:text-[#1a1918] transition-all cursor-pointer"
          title="关闭设置"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 云端同步与更新状态指示条 */}
      <div className="px-3.5 py-2 bg-[#fafaf9] border-b border-[#ecebe8] flex items-center justify-between text-xs">
        <span className={`inline-flex items-center gap-1 text-[9.5px] font-medium px-2 py-0.5 border rounded-[3px] shadow-2xs ${syncMeta.cls}`}>
          {syncMeta.icon}
          <span>{syncMeta.text}</span>
        </span>
        <span className="font-label-micro text-[9px] text-[#787770] font-mono">
          {pullState === 'pulling'
            ? '云端拉取中…'
            : pullState === 'pulled'
            ? '已同步云端'
            : prefs.updatedAt
            ? `更新于 ${prefs.updatedAt.slice(11, 19)}`
            : '默认参数'}
        </span>
      </div>

      {/* 主体设置选项 */}
      <div className="p-3.5 space-y-3.5">
        {/* 1. 快捷与悬浮按钮显示模式 */}
        <section className="bg-white border border-[#e8e7e3] rounded-[6px] p-3 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <LayoutGrid className="w-3.5 h-3.5 text-[#1a1918]" />
              <span className="text-[11.5px] font-bold text-[#1a1918]">
                快捷按钮与悬浮标签显示模式
              </span>
            </div>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-[3px] bg-[#f4f4f2] text-[#5a5854] border border-[#e2e1dc]">
              {prefs.buttonDisplayMode === 'always' ? '常驻显示' : '仅图标·悬停显字'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* 仅显示图标 */}
            <button
              type="button"
              onClick={() => {
                onChange({ buttonDisplayMode: 'icon_only' });
                showToast?.('已切换为「仅显示图标 (悬停显字)」模式');
              }}
              className={`p-2.5 text-left transition-all cursor-pointer rounded-[4px] relative ${
                prefs.buttonDisplayMode === 'icon_only'
                  ? 'bg-white text-[#1a1918] border-2 border-[#1a1918] shadow-2xs'
                  : 'bg-[#fafaf9] text-[#5a5854] border border-[#e2e1dc] hover:bg-white hover:border-[#b8b6b0]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="font-bold text-[11px] flex items-center gap-1.5">
                  <MousePointer className="w-3.5 h-3.5" />
                  <span>仅显示图标</span>
                </div>
                {prefs.buttonDisplayMode === 'icon_only' && (
                  <span className="w-2 h-2 rounded-full bg-[#1a1918]" />
                )}
              </div>
              <div className={`text-[9px] mt-1.5 leading-snug ${prefs.buttonDisplayMode === 'icon_only' ? 'text-[#383734] font-medium' : 'text-[#787770]'}`}>
                精炼省屏，悬停平滑展开文字与提示
              </div>
            </button>

            {/* 打开常驻 */}
            <button
              type="button"
              onClick={() => {
                onChange({ buttonDisplayMode: 'always' });
                showToast?.('已切换为「打开常驻 (图标+文字)」模式');
              }}
              className={`p-2.5 text-left transition-all cursor-pointer rounded-[4px] relative ${
                prefs.buttonDisplayMode === 'always'
                  ? 'bg-white text-[#1a1918] border-2 border-[#1a1918] shadow-2xs'
                  : 'bg-[#fafaf9] text-[#5a5854] border border-[#e2e1dc] hover:bg-white hover:border-[#b8b6b0]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="font-bold text-[11px] flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5" />
                  <span>打开常驻</span>
                </div>
                {prefs.buttonDisplayMode === 'always' && (
                  <span className="w-2 h-2 rounded-full bg-[#1a1918]" />
                )}
              </div>
              <div className={`text-[9px] mt-1.5 leading-snug ${prefs.buttonDisplayMode === 'always' ? 'text-[#383734] font-medium' : 'text-[#787770]'}`}>
                图标与按钮完整文字全量直观常驻
              </div>
            </button>
          </div>
        </section>

        {/* 2. 表单内容区最大宽度 —— 进度阻力滑块与屏幕占比自动计算 */}
        <section className="bg-white border border-[#e8e7e3] rounded-[6px] p-3 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-[#1a1918]" />
              <span className="text-[11.5px] font-bold text-[#1a1918]">表单内容区最大宽度</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-mono font-bold text-[12px] text-[#1a1918] bg-[#f4f4f2] px-1.5 py-0.5 rounded border border-[#e2e1dc]">
                {currentRatio}%
              </span>
              <span className="text-[10px] text-[#787770]">屏幕占比</span>
            </div>
          </div>

          {/* 实时自适应换算显示 */}
          <div className="bg-[#fafaf9] border border-[#e8e7e3] rounded-[4px] px-2.5 py-1.5 flex items-center justify-between text-[10px]">
            <span className="text-[#787770] flex items-center gap-1">
              <Maximize2 className="w-3 h-3 text-[#1a1918]" />
              <span>视口动态计算:</span>
            </span>
            <span className="font-mono font-bold text-[#1a1918]">
              {calculatedPixelWidth}
            </span>
          </div>

          {/* 进度阻力滑块控件 */}
          <div className="space-y-1.5 pt-1">
            <div className="relative flex items-center">
              <input
                type="range"
                min={50}
                max={100}
                step={1}
                value={currentRatio}
                onChange={(e) => handleRatioSliderChange(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-[#e8e7e3] rounded-lg appearance-none cursor-pointer accent-[#1a1918] focus:outline-hidden"
              />
            </div>

            {/* 阻力刻度刻印 */}
            <div className="flex justify-between text-[8.5px] font-mono text-[#8a8882] px-1">
              <span>50%</span>
              <span className="text-[#1a1918] font-bold">60% 紧凑</span>
              <span className="text-[#1a1918] font-bold">75% 舒适</span>
              <span className="text-[#1a1918] font-bold">88% 沉浸</span>
              <span className="text-[#1a1918] font-bold">100% 全宽</span>
            </div>
          </div>

          {/* 4 档磁吸阻力快速吸附卡片 */}
          <div className="grid grid-cols-4 gap-1.5 pt-0.5">
            {WIDTH_RESISTANCE_ANCHORS.map((anchor) => {
              const isActive = Math.abs(currentRatio - anchor.percent) <= 1;
              return (
                <button
                  key={anchor.percent}
                  type="button"
                  onClick={() => handleSnapAnchorClick(anchor.percent)}
                  className={`py-1.5 px-1 border text-center transition-all cursor-pointer rounded-[4px] ${
                    isActive
                      ? 'bg-white text-[#1a1918] border-2 border-[#1a1918] shadow-2xs font-bold'
                      : 'bg-[#fafaf9] text-[#63615b] border border-[#e2e1dc] hover:bg-white hover:border-[#b8b6b0]'
                  }`}
                >
                  <div className="text-[10px] font-bold">{anchor.percent}%</div>
                  <div className="text-[8.5px] leading-tight text-[#787770] scale-95 origin-center">{anchor.label}</div>
                </button>
              );
            })}
          </div>
          <div className="text-[9px] text-[#787770] leading-snug">
            💡 支持任意自定义阻力滑动；滑块接近吸附档位将带有磁吸阻力，随当前设备视口分辨率动态缩放。
          </div>
        </section>

        {/* 3. 窗口安全边距 —— 磁吸阻力滑块与自定义调节（支持完全消除 0px 贴边铺满） */}
        <section className="bg-white border border-[#e8e7e3] rounded-[6px] p-3 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Frame className="w-3.5 h-3.5 text-[#1a1918]" />
              <span className="text-[11.5px] font-bold text-[#1a1918]">窗口安全边距</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-mono font-bold text-[12px] text-[#1a1918] bg-[#f4f4f2] px-1.5 py-0.5 rounded border border-[#e2e1dc]">
                {prefs.windowSafeMargin ?? 0}px
              </span>
              <span className="text-[10px] text-[#787770]">
                {(prefs.windowSafeMargin ?? 0) === 0 ? '无边距·已消除' : '外层缓冲'}
              </span>
            </div>
          </div>

          {/* 实时状态形态提示 */}
          <div className="bg-[#fafaf9] border border-[#e8e7e3] rounded-[4px] px-2.5 py-1.5 flex items-center justify-between text-[10px]">
            <span className="text-[#787770]">边距视觉形态:</span>
            <span className="font-mono font-bold text-[#1a1918]">
              {(prefs.windowSafeMargin ?? 0) === 0
                ? '已彻底删除窗口安全边距 (0px 满屏无缝)'
                : `窗口四周预留 ${(prefs.windowSafeMargin ?? 0)}px 缓冲安全边距`}
            </span>
          </div>

          {/* 进度阻力滑块控件 */}
          <div className="space-y-1.5 pt-1">
            <div className="relative flex items-center">
              <input
                type="range"
                min={0}
                max={32}
                step={1}
                value={prefs.windowSafeMargin ?? 0}
                onChange={(e) => handleMarginSliderChange(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-[#e8e7e3] rounded-lg appearance-none cursor-pointer accent-[#1a1918] focus:outline-hidden"
              />
            </div>

            {/* 阻力刻度刻印 */}
            <div className="flex justify-between text-[8.5px] font-mono text-[#8a8882] px-1">
              <span className="text-[#1a1918] font-bold">0px (已删除)</span>
              <span className="text-[#1a1918] font-bold">8px 微距</span>
              <span className="text-[#1a1918] font-bold">16px 标准</span>
              <span className="text-[#1a1918] font-bold">24px 宽松</span>
              <span>32px</span>
            </div>
          </div>

          {/* 4 档磁吸阻力快速吸附卡片 */}
          <div className="grid grid-cols-4 gap-1.5 pt-0.5">
            {MARGIN_RESISTANCE_ANCHORS.map((anchor) => {
              const isActive = (prefs.windowSafeMargin ?? 0) === anchor.px;
              return (
                <button
                  key={anchor.px}
                  type="button"
                  onClick={() => handleMarginAnchorClick(anchor.px)}
                  className={`py-1.5 px-1 border text-center transition-all cursor-pointer rounded-[4px] ${
                    isActive
                      ? 'bg-white text-[#1a1918] border-2 border-[#1a1918] shadow-2xs font-bold'
                      : 'bg-[#fafaf9] text-[#63615b] border border-[#e2e1dc] hover:bg-white hover:border-[#b8b6b0]'
                  }`}
                >
                  <div className="text-[10px] font-bold">{anchor.px}px</div>
                  <div className="text-[8.5px] leading-tight text-[#787770] scale-95 origin-center">{anchor.label}</div>
                </button>
              );
            })}
          </div>
          <div className="text-[9px] text-[#787770] leading-snug">
            💡 默认为 0px 彻底消除窗口外层安全边距；如需留白可通过滑块微调或磁吸切换，设置即时持久化并云端同步。
          </div>
        </section>

        {/* 4. 订单中心 · 网格列数 */}
        <section className="bg-white border border-[#e8e7e3] rounded-[6px] p-3 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Columns3 className="w-3.5 h-3.5 text-[#1a1918]" />
              <span className="text-[11.5px] font-bold text-[#1a1918]">订单中心 · 网格列数</span>
            </div>
            <span className="text-[9px] font-mono text-[#787770]">
              {prefs.ordersColumns === 'auto' ? '自动响应' : `固定 ${prefs.ordersColumns} 列`}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {COLUMN_OPTIONS.map((opt) => {
              const active = prefs.ordersColumns === opt.value;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => onChange({ ordersColumns: opt.value })}
                  className={`py-2 px-1 border text-center transition-all cursor-pointer rounded-[4px] ${
                    active
                      ? 'bg-white text-[#1a1918] border-2 border-[#1a1918] shadow-2xs font-bold'
                      : 'bg-[#fafaf9] text-[#63615b] border border-[#e2e1dc] hover:bg-white hover:border-[#b8b6b0]'
                  }`}
                >
                  <div className="text-[11px] font-bold">{opt.label}</div>
                  <div className="text-[8.5px] text-[#787770] mt-0.5">{opt.desc}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 5. 毛利红线比例 */}
        <section className="bg-white border border-[#e8e7e3] rounded-[6px] p-3 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-[#ba1a1a]" />
              <span className="text-[11.5px] font-bold text-[#1a1918]">毛利红线预警比例</span>
            </div>
            <span className="font-mono font-bold text-[12px] text-[#ba1a1a] bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
              {prefs.marginFloorPercent}%
            </span>
          </div>
          <input
            type="range"
            min={10}
            max={95}
            step={5}
            value={prefs.marginFloorPercent}
            onChange={(e) => onChange({ marginFloorPercent: parseInt(e.target.value, 10) || 50 })}
            className="w-full h-1.5 bg-[#e8e7e3] rounded-lg appearance-none cursor-pointer accent-[#1a1918] focus:outline-hidden"
          />
          <div className="flex justify-between text-[8.5px] font-mono text-[#8a8882]">
            <span>10% (宽松)</span>
            <span>50% (标准基准)</span>
            <span>95% (极严苛)</span>
          </div>
        </section>

        {/* 6. 客食端预览管控（1+3 四开关） */}
        <CustomerPreviewControl />

        {/* 恢复默认设置按钮 */}
        <button
          type="button"
          onClick={() => {
            onChange({ ...DEFAULT_WORKSPACE_PREFS, updatedAt: undefined } as Partial<WorkspacePrefs>);
            showToast?.('已恢复默认工作台显示设置');
          }}
          className="w-full py-2 bg-white hover:bg-[#fafaf9] border border-[#d3d1cb] hover:border-[#1a1918] text-[#1a1918] text-[11px] font-bold transition-all cursor-pointer rounded-[4px] flex items-center justify-center gap-1.5 shadow-2xs"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#787770]" />
          <span>恢复默认显示设置</span>
        </button>
      </div>

      {/* 底部说明 */}
      <div className="px-3.5 py-2.5 bg-[#fafaf9] border-t border-[#ecebe8] text-[9.5px] text-[#787770] leading-snug">
        设置即时本地生效并账号级云端同步。切换设备登录可直接继承偏好。
        {syncState === 'local_only' && <span className="text-[#b45309]">（当前云端服务离线，已保留本地）</span>}
      </div>
    </div>
  );
}
