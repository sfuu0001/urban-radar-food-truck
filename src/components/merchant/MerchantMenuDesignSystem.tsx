import React, { useState, useEffect } from 'react';
import {
  Palette,
  Sliders,
  Sparkles,
  Flame,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  RotateCcw,
  Save,
  Eye,
  CheckCircle2,
  Copy,
  LayoutGrid,
  Tag,
  Clock,
  Bike,
  Crown,
  ChevronRight,
  ExternalLink,
  Layers,
  Settings2
} from 'lucide-react';
import {
  MenuDesignSystem,
  CarouselSlide,
  THEME_PRESETS,
  ThemePresetId,
  getMenuDesignSystem,
  saveMenuDesignSystem,
  resetMenuDesignSystemToDefault,
  DEFAULT_CAROUSEL_SLIDES
} from '../../utils/menuDesignSystem';
import { StoreCampaignCarousel } from '../StoreCampaignCarousel';

interface MerchantMenuDesignSystemProps {
  onNotify?: (message: string) => void;
  onPreviewCustomerMenu?: () => void;
}

export const MerchantMenuDesignSystem: React.FC<MerchantMenuDesignSystemProps> = ({
  onNotify,
  onPreviewCustomerMenu
}) => {
  const [designSystem, setDesignSystem] = useState<MenuDesignSystem>(() => getMenuDesignSystem());
  const [activeTab, setActiveTab] = useState<'carousel' | 'theme' | 'layout' | 'export'>('carousel');
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<boolean>(false);
  const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('desktop');

  // Edit slide form state
  const [slideForm, setSlideForm] = useState<Partial<CarouselSlide>>({});

  const notify = (msg: string) => {
    if (onNotify) {
      onNotify(msg);
    }
  };

  const handleSaveAll = () => {
    saveMenuDesignSystem(designSystem);
    setSaveSuccessNotice(true);
    notify('✅ 菜单设计系统与活动轮播配置已保存并立即发布！');
    setTimeout(() => setSaveSuccessNotice(false), 3000);
  };

  const handleReset = () => {
    if (window.confirm('确定要恢复出厂默认的菜单设计系统与轮播活动吗？所有自定义修改将被重置。')) {
      const def = resetMenuDesignSystemToDefault();
      setDesignSystem(def);
      notify('已恢复系统默认设计系统规范！');
    }
  };

  // Carousel handlers
  const handleToggleCarouselEnabled = (enabled: boolean) => {
    setDesignSystem((prev) => ({
      ...prev,
      carousel: {
        ...prev.carousel,
        enabled
      }
    }));
  };

  const handleToggleAutoPlay = (autoPlay: boolean) => {
    setDesignSystem((prev) => ({
      ...prev,
      carousel: {
        ...prev.carousel,
        autoPlay
      }
    }));
  };

  const handleIntervalChange = (seconds: number) => {
    setDesignSystem((prev) => ({
      ...prev,
      carousel: {
        ...prev.carousel,
        autoPlayInterval: seconds * 1000
      }
    }));
  };

  const handleToggleCategoryBreakpointBar = (enabled: boolean) => {
    setDesignSystem((prev) => ({
      ...prev,
      carousel: {
        ...prev.carousel,
        showCategoryBreakpointBar: enabled
      }
    }));
    notify(enabled ? '已开启轮播底部分类断点栏' : '已删除底部分类断点栏（已同步纯净轮播模式）');
  };

  const handleToggleSlideActive = (id: string) => {
    setDesignSystem((prev) => ({
      ...prev,
      carousel: {
        ...prev.carousel,
        slides: prev.carousel.slides.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s))
      }
    }));
  };

  const handleMoveSlide = (index: number, direction: 'up' | 'down') => {
    const slides = [...designSystem.carousel.slides];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= slides.length) return;
    const temp = slides[index];
    slides[index] = slides[targetIdx];
    slides[targetIdx] = temp;
    setDesignSystem((prev) => ({
      ...prev,
      carousel: {
        ...prev.carousel,
        slides
      }
    }));
  };

  const handleDeleteSlide = (id: string) => {
    if (designSystem.carousel.slides.length <= 1) {
      alert('至少需保留一个活动轮播卡片！');
      return;
    }
    setDesignSystem((prev) => ({
      ...prev,
      carousel: {
        ...prev.carousel,
        slides: prev.carousel.slides.filter((s) => s.id !== id)
      }
    }));
    if (editingSlideId === id) {
      setEditingSlideId(null);
    }
    notify('已删除活动轮播卡片');
  };

  const handleAddNewSlide = () => {
    const newId = `slide-custom-${Date.now()}`;
    const newSlide: CarouselSlide = {
      id: newId,
      title: '全新主厨招牌限定款',
      subtitle: '全单享立减优惠 · 新鲜现点现制醇厚美味',
      tag: 'NEW 尝鲜特惠',
      badge: '新品首发',
      couponHighlight: '立省¥10',
      buttonText: '立即查看',
      actionType: 'scroll_category',
      actionTarget: 'popular',
      bgGradient: 'from-[#1c1917] via-[#2e1065] to-[#4c1d95]',
      accentColor: '#c084fc',
      badgeColor: '#7c3aed',
      iconName: 'Sparkles',
      isActive: true,
      order: designSystem.carousel.slides.length + 1
    };

    setDesignSystem((prev) => ({
      ...prev,
      carousel: {
        ...prev.carousel,
        slides: [newSlide, ...prev.carousel.slides]
      }
    }));

    setEditingSlideId(newId);
    setSlideForm(newSlide);
    notify('已创建新的活动卡片，请在下方编辑内容并保存');
  };

  const handleStartEditSlide = (slide: CarouselSlide) => {
    setEditingSlideId(slide.id);
    setSlideForm({ ...slide });
  };

  const handleSaveSlideForm = () => {
    if (!editingSlideId) return;
    setDesignSystem((prev) => ({
      ...prev,
      carousel: {
        ...prev.carousel,
        slides: prev.carousel.slides.map((s) =>
          s.id === editingSlideId ? ({ ...s, ...slideForm } as CarouselSlide) : s
        )
      }
    }));
    setEditingSlideId(null);
    notify('活动卡片修改已暂存，记得点击右上角【发布并生效】！');
  };

  // Theme Preset Switcher
  const handleApplyThemePreset = (presetId: ThemePresetId) => {
    const preset = THEME_PRESETS[presetId];
    if (!preset) return;
    setDesignSystem((prev) => ({
      ...prev,
      theme: {
        ...preset
      }
    }));
    notify(`已应用设计主题: 【${preset.presetName}】`);
  };

  return (
    <div className="space-y-4 pb-12 select-none">
      {/* 1. Header Toolbar */}
      <div className="bg-white rounded-2xl border border-[#e6e6e4] p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-700 text-amber-400 flex items-center justify-center shadow-xs">
              <Palette className="w-4 h-4" />
            </span>
            <h1 className="text-base sm:text-lg font-bold text-neutral-900">
              菜单界面与活动轮播设计系统
            </h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-300">
              PRO 实时系统
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            自定义前端菜单的轮播促销横幅、品牌主题色系、卡片圆角与阴影规范，一键发布生效。
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-neutral-700 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
            title="恢复系统出厂设计"
          >
            <RotateCcw className="w-3.5 h-3.5 text-neutral-500" />
            <span>恢复默认</span>
          </button>

          {onPreviewCustomerMenu && (
            <button
              type="button"
              onClick={onPreviewCustomerMenu}
              className="px-3 py-1.5 rounded-xl border border-neutral-300 bg-neutral-50 hover:bg-neutral-100 text-neutral-800 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-neutral-600" />
              <span>顾客视角预览</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveAll}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>发布并应用</span>
          </button>
        </div>
      </div>

      {saveSuccessNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>最新设计配置已成功持久化至浏览器缓存并实时向顾客端广播派发！</span>
        </div>
      )}

      {/* 2. Interactive Live Preview Canvas */}
      <div className="bg-neutral-900/5 rounded-2xl border border-neutral-200 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-700">
            <Eye className="w-3.5 h-3.5 text-amber-500" />
            <span>活动轮播组件 · 实时渲染预览 (Live Preview)</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100/80 text-amber-900 border border-amber-300/60">
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span>横幅形态：精简流线型 (已精简按键与底栏)</span>
            </span>
            <span className={`hidden md:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
              designSystem.theme.showScrollLinkageHud
                ? 'bg-neutral-900 text-amber-300 border-neutral-700'
                : 'bg-emerald-50 text-emerald-800 border-emerald-300/80'
            }`}>
              <span>{designSystem.theme.showScrollLinkageHud ? 'HUD胶囊: 开启' : 'HUD悬浮胶囊: 已删除(纯净)'}</span>
            </span>

            <div className="flex items-center gap-1 text-[11px] bg-white border border-neutral-200 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setPreviewMode('mobile')}
                className={`px-2 py-0.5 rounded cursor-pointer transition-all ${
                  previewMode === 'mobile' ? 'bg-neutral-900 text-white font-bold' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                窄屏 / 手机
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('desktop')}
                className={`px-2 py-0.5 rounded cursor-pointer transition-all ${
                  previewMode === 'desktop' ? 'bg-neutral-900 text-white font-bold' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                电脑宽屏
              </button>
            </div>
          </div>
        </div>

        {/* The Actual Rendered Component */}
        <div
          className={`mx-auto transition-all ${
            previewMode === 'mobile' ? 'max-w-md' : 'max-w-4xl'
          } bg-white rounded-2xl p-2 shadow-sm border border-neutral-200`}
        >
          <StoreCampaignCarousel
            designSystem={designSystem}
            categoryName="热销爆款 (Popular)"
            categoryIcon="🔥"
            categoryTagline="神抢手 官方补贴一口价，好评破万爆款榜单，闭眼点不踩雷"
            categoryBadge="HOT 镇店之宝"
            categoryBubblePill="官方特惠"
            dishCount={32}
            isCurrentActive={true}
            isHighlighted={false}
            categoryScrollProgress={0.45}
            onNavigateCategory={(cat) => notify(`预览点击：跳转至分类 【${cat}】`)}
            onClaimCoupon={(coupon) => notify(`预览点击：激活优惠 【${coupon}】`)}
          />
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-[#e6e6e4] pb-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('carousel')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'carousel'
              ? 'bg-neutral-900 text-white shadow-2xs'
              : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>活动轮播组件管理 ({designSystem.carousel.slides.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('theme')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'theme'
              ? 'bg-neutral-900 text-white shadow-2xs'
              : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
          }`}
        >
          <Palette className="w-3.5 h-3.5 text-amber-400" />
          <span>主题色彩与品牌规范</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('layout')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'layout'
              ? 'bg-neutral-900 text-white shadow-2xs'
              : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span>卡片圆角与控件布局</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('export')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'export'
              ? 'bg-neutral-900 text-white shadow-2xs'
              : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
          }`}
        >
          <Settings2 className="w-3.5 h-3.5 text-amber-400" />
          <span>配置代码导出与同步</span>
        </button>
      </div>

      {/* 4. Tab 1: Carousel Management */}
      {activeTab === 'carousel' && (
        <div className="space-y-4">
          {/* Carousel Global Controls Bar */}
          <div className="bg-white rounded-xl border border-[#e6e6e4] p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Enable toggle */}
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-neutral-800">
                <input
                  type="checkbox"
                  checked={designSystem.carousel.enabled}
                  onChange={(e) => handleToggleCarouselEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                />
                <span>启用店铺活动轮播横幅</span>
              </label>

              {/* Auto play toggle */}
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-neutral-800">
                <input
                  type="checkbox"
                  checked={designSystem.carousel.autoPlay}
                  onChange={(e) => handleToggleAutoPlay(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                />
                <span>自动轮播</span>
              </label>

              {/* Category Breakpoint Bar Toggle */}
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-neutral-800 bg-neutral-50 px-2.5 py-1 rounded-lg border border-neutral-200 hover:bg-neutral-100 transition-colors">
                <input
                  type="checkbox"
                  checked={!!designSystem.carousel.showCategoryBreakpointBar}
                  onChange={(e) => handleToggleCategoryBreakpointBar(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                />
                <span>附带底部分类断点栏</span>
                <span className="text-[10px] font-mono font-normal text-neutral-500">
                  {designSystem.carousel.showCategoryBreakpointBar ? '【已显示】' : '【已删除/纯净模式】'}
                </span>
              </label>

              {/* Interval slider */}
              <div className="flex items-center gap-2 text-xs text-neutral-600">
                <Clock className="w-3.5 h-3.5 text-neutral-400" />
                <span>轮播间隔:</span>
                <select
                  value={Math.round((designSystem.carousel.autoPlayInterval || 4500) / 1000)}
                  onChange={(e) => handleIntervalChange(Number(e.target.value))}
                  className="px-2 py-1 bg-neutral-50 border border-neutral-300 rounded-md text-xs font-semibold"
                >
                  <option value={3}>3 秒 (极速)</option>
                  <option value={4}>4 秒 (推荐)</option>
                  <option value={5}>5 秒 (舒适)</option>
                  <option value={8}>8 秒 (慢速)</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddNewSlide}
              className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>+ 新增活动轮播卡片</span>
            </button>
          </div>

          {/* Slide Edit Drawer / Modal Form (if editing) */}
          {editingSlideId && (
            <div className="bg-amber-50/70 border-2 border-amber-400/80 rounded-2xl p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-amber-300/60 pb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
                  <Flame className="w-4 h-4 text-amber-600" />
                  <span>正在编辑轮播活动卡片: {slideForm.title}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingSlideId(null)}
                  className="text-xs text-neutral-500 hover:text-neutral-900 font-medium"
                >
                  取消
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">主标题 (Slogan)</label>
                  <input
                    type="text"
                    value={slideForm.title || ''}
                    onChange={(e) => setSlideForm({ ...slideForm, title: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs"
                    placeholder="如：现制夜市狂欢节 · 爆款半价尝鲜"
                  />
                </div>

                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">副标题与优惠细节</label>
                  <input
                    type="text"
                    value={slideForm.subtitle || ''}
                    onChange={(e) => setSlideForm({ ...slideForm, subtitle: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs"
                    placeholder="如：全单满¥39立减¥8 · 黑曜石和牛堡尝鲜省¥15"
                  />
                </div>

                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">活动标签 (Tag)</label>
                  <input
                    type="text"
                    value={slideForm.tag || ''}
                    onChange={(e) => setSlideForm({ ...slideForm, tag: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs"
                    placeholder="如：HOT 限时特惠"
                  />
                </div>

                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">满减/优惠亮点气泡</label>
                  <input
                    type="text"
                    value={slideForm.couponHighlight || ''}
                    onChange={(e) => setSlideForm({ ...slideForm, couponHighlight: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs"
                    placeholder="如：满¥39减¥8 或 买5送1"
                  />
                </div>

                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">引导按钮文案 (CTA)</label>
                  <input
                    type="text"
                    value={slideForm.buttonText || ''}
                    onChange={(e) => setSlideForm({ ...slideForm, buttonText: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs"
                    placeholder="如：立即抢购 / 选购炭烤"
                  />
                </div>

                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">点击动作类型</label>
                  <select
                    value={slideForm.actionType || 'scroll_category'}
                    onChange={(e) => setSlideForm({ ...slideForm, actionType: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs"
                  >
                    <option value="scroll_category">平滑跳转至菜单指定分类</option>
                    <option value="custom_modal">激活专享满减并提示</option>
                    <option value="toast">浮窗活动说明</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">跳转目标品类 Key</label>
                  <select
                    value={slideForm.actionTarget || 'popular'}
                    onChange={(e) => setSlideForm({ ...slideForm, actionTarget: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs"
                  >
                    <option value="popular">热销爆款 (popular)</option>
                    <option value="skewers">炭烤串串 (skewers)</option>
                    <option value="yakitori">日式烧鸟 (yakitori)</option>
                    <option value="baked">芝士焗类 (baked)</option>
                    <option value="western">主食西餐 (western)</option>
                    <option value="snacks">酥脆小食 (snacks)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">背景配色渐变主题</label>
                  <select
                    value={slideForm.bgGradient || 'from-[#1c1917] via-[#292524] to-[#7c2d12]'}
                    onChange={(e) => setSlideForm({ ...slideForm, bgGradient: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs"
                  >
                    <option value="from-[#1c1917] via-[#292524] to-[#7c2d12]">黑曜黑金炙烤 (黑/炭棕/赤金)</option>
                    <option value="from-[#1c1917] via-[#431407] to-[#9a3412]">烈火果木炭烤 (深红/火橙)</option>
                    <option value="from-[#0f172a] via-[#1e293b] to-[#1e3a8a]">极速专送科技 (午夜深蓝)</option>
                    <option value="from-[#18181b] via-[#27272a] to-[#713f12]">黑卡尊享奢享 (曜黑金箔)</option>
                    <option value="from-[#064e3b] via-[#047857] to-[#059669]">清新有机轻食 (翡翠绿)</option>
                    <option value="from-[#4c1d95] via-[#5b21b6] to-[#7c3aed]">夜市潮酷电音 (魅惑暗紫)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">标志图标</label>
                  <select
                    value={slideForm.iconName || 'Flame'}
                    onChange={(e) => setSlideForm({ ...slideForm, iconName: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs"
                  >
                    <option value="Flame">🔥 火焰 (Flame)</option>
                    <option value="Sparkles">✨ 火花 (Sparkles)</option>
                    <option value="Bike">🚴 外卖专送 (Bike)</option>
                    <option value="Crown">👑 皇冠尊享 (Crown)</option>
                    <option value="Tag">🏷️ 标签折扣 (Tag)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-amber-300/40">
                <button
                  type="button"
                  onClick={() => setEditingSlideId(null)}
                  className="px-3 py-1.5 bg-white hover:bg-neutral-100 rounded-lg text-xs font-medium text-neutral-700 border border-neutral-300"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSaveSlideForm}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-neutral-950 font-bold rounded-lg text-xs shadow-xs"
                >
                  确定暂存修改
                </button>
              </div>
            </div>
          )}

          {/* Slide List */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold text-neutral-800">活动卡片排期列表 (按顺序轮播展示)</h2>
            <div className="space-y-1.5">
              {designSystem.carousel.slides.map((slide, index) => {
                const isEditing = editingSlideId === slide.id;
                return (
                  <div
                    key={slide.id}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      slide.isActive
                        ? 'bg-white border-neutral-200 shadow-2xs hover:border-neutral-300'
                        : 'bg-neutral-100/70 border-neutral-200 opacity-60'
                    } ${isEditing ? 'ring-2 ring-amber-400' : ''}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex flex-col items-center gap-0.5 text-neutral-400">
                        <button
                          type="button"
                          onClick={() => handleMoveSlide(index, 'up')}
                          disabled={index === 0}
                          className="p-1 hover:text-neutral-900 disabled:opacity-20 cursor-pointer"
                          title="上移"
                        >
                          <MoveUp className="w-3 h-3" />
                        </button>
                        <span className="text-[10px] font-mono font-bold">{index + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleMoveSlide(index, 'down')}
                          disabled={index === designSystem.carousel.slides.length - 1}
                          className="p-1 hover:text-neutral-900 disabled:opacity-20 cursor-pointer"
                          title="下移"
                        >
                          <MoveDown className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Mini visual swatch */}
                      <div
                        className={`w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-white text-xs bg-gradient-to-r ${slide.bgGradient} shadow-xs`}
                      >
                        <Flame className="w-4 h-4 text-amber-400" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-neutral-900 truncate">
                            {slide.title}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-neutral-900 text-white">
                            {slide.tag}
                          </span>
                          {slide.couponHighlight && (
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-950 border border-amber-300">
                              {slide.couponHighlight}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-500 truncate">{slide.subtitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Active toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleSlideActive(slide.id)}
                        className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer transition-all ${
                          slide.isActive
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-neutral-200 text-neutral-600 hover:bg-neutral-300'
                        }`}
                      >
                        {slide.isActive ? '展示中' : '已停用'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartEditSlide(slide)}
                        className="px-2.5 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-medium cursor-pointer"
                      >
                        编辑
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteSlide(slide.id)}
                        className="p-1 rounded text-neutral-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                        title="删除该活动卡片"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 5. Tab 2: Theme Presets & Palette */}
      {activeTab === 'theme' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#e6e6e4] p-4 space-y-3">
            <h2 className="text-xs font-bold text-neutral-800">一键切换官方奢享主题预设</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {(Object.keys(THEME_PRESETS) as ThemePresetId[]).map((key) => {
                const preset = THEME_PRESETS[key];
                const isSelected = designSystem.theme.presetId === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleApplyThemePreset(key)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-400/20 shadow-xs'
                        : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-neutral-900">{preset.presetName}</span>
                        {isSelected && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                            当前生效
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <span
                          className="w-4 h-4 rounded-full border border-black/10 shadow-xs"
                          style={{ backgroundColor: preset.primaryColor }}
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-black/10 shadow-xs"
                          style={{ backgroundColor: preset.accentColor }}
                        />
                        <span className="text-[10px] font-mono text-neutral-500">
                          {preset.primaryColor} / {preset.accentColor}
                        </span>
                      </div>
                    </div>
                    <div className="text-[11px] text-neutral-500 flex items-center justify-between border-t border-neutral-100 pt-1.5 mt-1">
                      <span>圆角: {preset.cardRadius}</span>
                      <span>阴影: {preset.cardShadow}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom color overrides */}
          <div className="bg-white rounded-2xl border border-[#e6e6e4] p-4 space-y-3">
            <h2 className="text-xs font-bold text-neutral-800">自由微调品牌配色</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-neutral-700 font-semibold mb-1">主色调 (Primary)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={designSystem.theme.primaryColor}
                    onChange={(e) =>
                      setDesignSystem((prev) => ({
                        ...prev,
                        theme: { ...prev.theme, primaryColor: e.target.value, presetId: 'custom' }
                      }))
                    }
                    className="w-8 h-8 rounded-lg cursor-pointer border border-neutral-300"
                  />
                  <input
                    type="text"
                    value={designSystem.theme.primaryColor}
                    onChange={(e) =>
                      setDesignSystem((prev) => ({
                        ...prev,
                        theme: { ...prev.theme, primaryColor: e.target.value, presetId: 'custom' }
                      }))
                    }
                    className="px-2 py-1 bg-white border border-neutral-300 rounded font-mono text-xs w-28"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">强调辅助色 (Accent)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={designSystem.theme.accentColor}
                    onChange={(e) =>
                      setDesignSystem((prev) => ({
                        ...prev,
                        theme: { ...prev.theme, accentColor: e.target.value, presetId: 'custom' }
                      }))
                    }
                    className="w-8 h-8 rounded-lg cursor-pointer border border-neutral-300"
                  />
                  <input
                    type="text"
                    value={designSystem.theme.accentColor}
                    onChange={(e) =>
                      setDesignSystem((prev) => ({
                        ...prev,
                        theme: { ...prev.theme, accentColor: e.target.value, presetId: 'custom' }
                      }))
                    }
                    className="px-2 py-1 bg-white border border-neutral-300 rounded font-mono text-xs w-28"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">背景调性底色</label>
                <select
                  value={designSystem.theme.bgMode}
                  onChange={(e) =>
                    setDesignSystem((prev) => ({
                      ...prev,
                      theme: { ...prev.theme, bgMode: e.target.value as any, presetId: 'custom' }
                    }))
                  }
                  className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs"
                >
                  <option value="warm_zinc">高级暖锌黑曜石 (推荐)</option>
                  <option value="clean_white">纯粹极简浅白</option>
                  <option value="dark_luxury">深邃黑金暗夜</option>
                  <option value="soft_paper">柔和和纸温润</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Tab 3: Card Roundness & Layout */}
      {activeTab === 'layout' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#e6e6e4] p-4 space-y-4">
            <div>
              <h2 className="text-xs font-bold text-neutral-800 mb-2">菜品卡片圆角曲率规范 (Card Radius)</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'rounded-lg', label: '8px (方直紧凑)', sub: 'rounded-lg' },
                  { id: 'rounded-xl', label: '12px (精炼现代)', sub: 'rounded-xl' },
                  { id: 'rounded-2xl', label: '16px (经典大方)', sub: 'rounded-2xl' },
                  { id: 'rounded-3xl', label: '24px (圆润饱满)', sub: 'rounded-3xl' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      setDesignSystem((prev) => ({
                        ...prev,
                        theme: { ...prev.theme, cardRadius: item.id as any }
                      }))
                    }
                    className={`p-3 border text-left cursor-pointer transition-all ${item.id} ${
                      designSystem.theme.cardRadius === item.id
                        ? 'border-amber-500 bg-amber-50 text-amber-950 font-bold ring-2 ring-amber-400/20'
                        : 'border-neutral-200 hover:border-neutral-300 bg-white'
                    }`}
                  >
                    <div className="text-xs">{item.label}</div>
                    <div className="text-[10px] text-neutral-400 font-mono mt-0.5">{item.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xs font-bold text-neutral-800 mb-2">卡片阴影深度 (Shadow Depth)</h2>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'flat', label: '扁平细线 (Flat Hairline)', desc: '仅 1px 微边框，无投影' },
                  { id: 'subtle', label: '微妙柔和 (Subtle 2xs)', desc: '轻量投影，现代耐看' },
                  { id: 'elevated', label: '悬浮立体 (Elevated MD)', desc: '层次感强，视觉突出' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      setDesignSystem((prev) => ({
                        ...prev,
                        theme: { ...prev.theme, cardShadow: item.id as any }
                      }))
                    }
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      designSystem.theme.cardShadow === item.id
                        ? 'border-amber-500 bg-amber-50 text-amber-950 font-bold ring-2 ring-amber-400/20'
                        : 'border-neutral-200 hover:border-neutral-300 bg-white'
                    }`}
                  >
                    <div className="text-xs">{item.label}</div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xs font-bold text-neutral-800 mb-2">信息徽标显示开关</h2>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-neutral-800">
                  <input
                    type="checkbox"
                    checked={designSystem.theme.showCategorySlogan}
                    onChange={(e) =>
                      setDesignSystem((prev) => ({
                        ...prev,
                        theme: { ...prev.theme, showCategorySlogan: e.target.checked }
                      }))
                    }
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                  />
                  <span>显示分类 Slogan 与工艺特点气泡</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-neutral-800">
                  <input
                    type="checkbox"
                    checked={designSystem.theme.showCraftBadge}
                    onChange={(e) =>
                      setDesignSystem((prev) => ({
                        ...prev,
                        theme: { ...prev.theme, showCraftBadge: e.target.checked }
                      }))
                    }
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                  />
                  <span>显示火候/工艺角标 (如: 280℃果木炭烤、日式备长炭)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-neutral-800">
                  <input
                    type="checkbox"
                    checked={designSystem.theme.showStockAlert}
                    onChange={(e) =>
                      setDesignSystem((prev) => ({
                        ...prev,
                        theme: { ...prev.theme, showStockAlert: e.target.checked }
                      }))
                    }
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                  />
                  <span>显示库存紧缺告警 (如: 仅剩 3 份)</span>
                </label>

                {/* 滑动联动浏览进度气泡 HUD 开关 */}
                <label className="flex items-center justify-between p-2.5 rounded-xl border border-neutral-200 bg-neutral-50/80 hover:bg-neutral-100/80 transition-colors cursor-pointer text-xs font-semibold text-neutral-800">
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={!!designSystem.theme.showScrollLinkageHud}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setDesignSystem((prev) => ({
                          ...prev,
                          theme: { ...prev.theme, showScrollLinkageHud: checked }
                        }));
                        notify(checked ? '已开启滑动浏览联动 HUD 气泡' : '已删除滑动联动 HUD 气泡（同步纯净无遮挡点单）');
                      }}
                      className="w-4 h-4 mt-0.5 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span>滑动浏览品类联动 HUD 悬浮胶囊</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          designSystem.theme.showScrollLinkageHud
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}>
                          {designSystem.theme.showScrollLinkageHud ? '【已开启】' : '【已删除 / 纯净模式】'}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 font-normal mt-0.5 leading-relaxed">
                        对应顾客端菜单顶部滑出的小黑胶囊（“主食筒餐 共 1 款 · 浏览 0%”）。现已按设计规范默认删除，避免遮挡菜品视图。
                      </p>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Tab 4: Export & JSON Sync */}
      {activeTab === 'export' && (
        <div className="bg-white rounded-2xl border border-[#e6e6e4] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-neutral-800">设计系统 JSON 配置数据</h2>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(designSystem, null, 2));
                notify('已复制配置 JSON 至剪贴板！');
              }}
              className="px-3 py-1 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-xs font-medium text-neutral-800 flex items-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>复制 JSON</span>
            </button>
          </div>
          <pre className="p-3 bg-neutral-900 text-amber-300 font-mono text-[11px] rounded-xl overflow-x-auto max-h-96">
            {JSON.stringify(designSystem, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
