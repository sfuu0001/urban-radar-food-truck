import React, { useState, useMemo } from 'react';
import {
  Ticket,
  Plus,
  Search,
  Filter,
  Check,
  Edit,
  Trash2,
  Copy,
  Send,
  Eye,
  Sparkles,
  Calendar,
  Clock,
  Layers,
  Image,
  Code,
  DollarSign,
  Percent,
  Truck,
  Flame,
  CheckCircle2,
  AlertTriangle,
  X,
  Upload,
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  FileCode,
  Users,
  Award,
  Zap,
  QrCode,
  Share2,
  Gift
} from 'lucide-react';
import { CouponItem, CouponType, CouponScopeType, CouponDayRestriction, CouponDesignStyle, UserCouponRecord } from '../../types/coupon';
import { INITIAL_MERCHANT_COUPONS, INITIAL_USER_COUPONS } from '../../data/mockCoupons';
import { safeGetStorage, safeSetStorage } from '../../utils/safeStorage';
import { globalVersionEngine } from '../../utils/versionPointerEngine';

interface MerchantCouponsViewProps {
  showToast: (msg: string) => void;
}

export const MerchantCouponsView: React.FC<MerchantCouponsViewProps> = ({ showToast }) => {
  // Coupons List
  const [coupons, setCoupons] = useState<CouponItem[]>(() => {
    return safeGetStorage<CouponItem[]>('obsidian_merchant_coupons', INITIAL_MERCHANT_COUPONS);
  });

  // Listen to external data restoration from Version Tracking Engine
  React.useEffect(() => {
    const handleDataRestored = (e: Event) => {
      const customEvt = e as CustomEvent<{ module: string }>;
      if (!customEvt.detail || customEvt.detail.module === 'coupons') {
        const fresh = safeGetStorage<CouponItem[]>('obsidian_merchant_coupons', INITIAL_MERCHANT_COUPONS);
        setCoupons(fresh);
      }
    };
    window.addEventListener('obsidian_data_restored', handleDataRestored);
    return () => window.removeEventListener('obsidian_data_restored', handleDataRestored);
  }, []);

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponItem | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [badgeText, setBadgeText] = useState('');
  const [couponType, setCouponType] = useState<CouponType>('amount_cut');
  const [discountValue, setDiscountValue] = useState('10');
  const [minSpend, setMinSpend] = useState('50');
  const [maxDiscountCap, setMaxDiscountCap] = useState('20');

  // Stacking & Exclusivity fields
  const [allowStackWithActivity, setAllowStackWithActivity] = useState<boolean>(true);
  const [allowStackWithVIP, setAllowStackWithVIP] = useState<boolean>(true);
  const [isExclusive, setIsExclusive] = useState<boolean>(false);

  // Scope
  const [scopeType, setScopeType] = useState<CouponScopeType>('all_dishes');
  const [selectedCategories, setSelectedCategories] = useState<('mains' | 'drinks' | 'desserts' | 'snacks')[]>(['mains']);

  // Time and Day
  const [timeSlotType, setTimeSlotType] = useState<'all_day' | 'lunch_only' | 'dinner_night' | 'custom'>('all_day');
  const [customTimeStart, setCustomTimeStart] = useState('11:00');
  const [customTimeEnd, setCustomTimeEnd] = useState('14:00');
  const [dayRestriction, setDayRestriction] = useState<CouponDayRestriction>('all_week');

  // Design and Custom Code / Image
  const [designStyle, setDesignStyle] = useState<CouponDesignStyle>('black_gold');
  const [bgImageUrl, setBgImageUrl] = useState('');
  const [customHtmlCode, setCustomHtmlCode] = useState('');
  const [themeColor, setThemeColor] = useState('#d4af37');

  // Inventory and Expiry
  const [totalQuantity, setTotalQuantity] = useState('1000');
  const [expireDate, setExpireDate] = useState('2026-09-30');
  const [status, setStatus] = useState<'active' | 'paused' | 'ended'>('active');

  // Targeted Batch Dispatch Modal
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [dispatchCoupon, setDispatchCoupon] = useState<CouponItem | null>(null);
  const [dispatchTarget, setDispatchTarget] = useState<'all' | 'new_customers' | 'vip' | 'dormant'>('all');
  const [dispatchQuantityPerUser, setDispatchQuantityPerUser] = useState<number>(1);
  const [dispatchCustomMsg, setDispatchCustomMsg] = useState('黑曜石流动餐车主厨为您送上专属赏味礼券！');

  // Marketing Automation Campaign Switches
  const [autoNewUserCoupon, setAutoNewUserCoupon] = useState(true);
  const [autoFissionShareCoupon, setAutoFissionShareCoupon] = useState(true);

  // QR Code share preview
  const [shareQrModalOpen, setShareQrModalOpen] = useState(false);
  const [shareQrCoupon, setShareQrCoupon] = useState<CouponItem | null>(null);

  const saveCoupons = (newList: CouponItem[]) => {
    setCoupons(newList);
    safeSetStorage('obsidian_merchant_coupons', newList);
  };

  // Stats calculation
  const stats = useMemo(() => {
    const totalIssued = coupons.reduce((sum, c) => sum + c.issuedCount, 0);
    const totalUsed = coupons.reduce((sum, c) => sum + c.usedCount, 0);
    const activeCount = coupons.filter((c) => c.status === 'active').length;
    const redemptionRate = totalIssued > 0 ? ((totalUsed / totalIssued) * 100).toFixed(1) : '0.0';
    const estimatedGmv = (totalUsed * 48.5).toFixed(0);

    return { totalIssued, totalUsed, activeCount, redemptionRate, estimatedGmv };
  }, [coupons]);

  // Filtered coupons
  const filteredCoupons = useMemo(() => {
    return coupons.filter((c) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = c.title.toLowerCase().includes(q);
        const matchCode = c.code.toLowerCase().includes(q);
        if (!matchTitle && !matchCode) return false;
      }
      if (filterType !== 'all' && c.couponType !== filterType) return false;
      if (filterStatus !== 'all' && c.status !== filterStatus) return false;
      return true;
    });
  }, [coupons, searchQuery, filterType, filterStatus]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingCoupon(null);
    setTitle('');
    setCode(`UR-${Math.floor(1000 + Math.random() * 9000)}`);
    setSubtitle('黑曜石流动餐车现烤餐品通用');
    setBadgeText('超值特惠');
    setCouponType('amount_cut');
    setDiscountValue('10');
    setMinSpend('50');
    setMaxDiscountCap('20');
    setAllowStackWithActivity(true);
    setAllowStackWithVIP(true);
    setIsExclusive(false);
    setScopeType('all_dishes');
    setSelectedCategories(['mains']);
    setTimeSlotType('all_day');
    setCustomTimeStart('11:00');
    setCustomTimeEnd('14:00');
    setDayRestriction('all_week');
    setDesignStyle('black_gold');
    setBgImageUrl('');
    setCustomHtmlCode('');
    setThemeColor('#d4af37');
    setTotalQuantity('1000');
    setExpireDate('2026-09-30');
    setStatus('active');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (c: CouponItem) => {
    setEditingCoupon(c);
    setTitle(c.title);
    setCode(c.code);
    setSubtitle(c.subtitle || '');
    setBadgeText(c.badgeText || '');
    setCouponType(c.couponType);
    setDiscountValue(c.couponType === 'discount_percent' ? (c.discountValue * 10).toString() : c.discountValue.toString());
    setMinSpend(c.minSpend.toString());
    setMaxDiscountCap(c.maxDiscountCap ? c.maxDiscountCap.toString() : '20');
    setAllowStackWithActivity(c.allowStackWithActivity !== false);
    setAllowStackWithVIP(c.allowStackWithVIP !== false);
    setIsExclusive(c.isExclusive === true);
    setScopeType(c.scopeType);
    setSelectedCategories(c.scopeCategories || ['mains']);
    setTimeSlotType(c.timeSlotType);
    setCustomTimeStart(c.customTimeStart || '11:00');
    setCustomTimeEnd(c.customTimeEnd || '14:00');
    setDayRestriction(c.dayRestriction);
    setDesignStyle(c.designStyle);
    setBgImageUrl(c.bgImageUrl || '');
    setCustomHtmlCode(c.customHtmlCode || '');
    setThemeColor(c.themeColor || '#d4af37');
    setTotalQuantity(c.totalQuantity.toString());
    setExpireDate(c.expireDate);
    setStatus(c.status);
    setIsModalOpen(true);
  };

  // Toggle status
  const handleToggleStatus = (id: string) => {
    const target = coupons.find((c) => c.id === id);
    const updated = coupons.map((c) => {
      if (c.id === id) {
        const nextStatus = c.status === 'active' ? 'paused' : 'active';
        return { ...c, status: nextStatus as 'active' | 'paused' };
      }
      return c;
    });
    if (target) {
      const nextStatus = target.status === 'active' ? 'paused' : 'active';
      globalVersionEngine.recordDataMutation({
        module: 'coupons',
        entityId: id,
        entityName: target.title,
        actionType: 'update',
        beforeData: target,
        afterData: { ...target, status: nextStatus },
        customSummary: `优惠券【${target.title}】状态切换为：${nextStatus === 'active' ? '上线发放中' : '暂停发放'}`
      });
    }
    saveCoupons(updated);
    showToast('优惠券发放状态已更新！');
  };

  // Delete coupon
  const handleDeleteCoupon = (id: string) => {
    const target = coupons.find((c) => c.id === id);
    const updated = coupons.filter((c) => c.id !== id);
    if (target) {
      globalVersionEngine.recordDataMutation({
        module: 'coupons',
        entityId: id,
        entityName: target.title,
        actionType: 'delete',
        beforeData: target,
        afterData: null,
        customSummary: `删除/下架优惠券【${target.title}】`
      });
    }
    saveCoupons(updated);
    showToast('优惠券已成功下架删除！');
  };

  // Open targeted dispatch modal
  const handleOpenDispatchModal = (c: CouponItem) => {
    setDispatchCoupon(c);
    setDispatchTarget('all');
    setDispatchQuantityPerUser(1);
    setDispatchCustomMsg(`黑曜石餐车送您【${c.title}】，快去选购心仪现烤炙品吧！`);
    setDispatchModalOpen(true);
  };

  // Confirm targeted batch dispatch
  const handleExecuteDispatch = () => {
    if (!dispatchCoupon) return;

    let userList = safeGetStorage<UserCouponRecord[]>('obsidian_user_coupons', INITIAL_USER_COUPONS);

    const targetLabelMap = {
      all: '全部会员客户 (共 1,280 人)',
      new_customers: '近7天新注册进店客 (共 142 人)',
      vip: '黑金 VIP 尊享会员 (共 68 人)',
      dormant: '超30天未消费沉睡客户 (共 215 人)'
    };

    const countMap = {
      all: 1280,
      new_customers: 142,
      vip: 68,
      dormant: 215
    };

    const targetCount = countMap[dispatchTarget];

    // Create user coupon records
    const newRecords: UserCouponRecord[] = [];
    for (let i = 0; i < dispatchQuantityPerUser; i++) {
      newRecords.push({
        userCouponId: `uc-dispatch-${Date.now()}-${i}`,
        couponId: dispatchCoupon.id,
        coupon: {
          ...dispatchCoupon,
          dispatchMessage: dispatchCustomMsg
        },
        status: 'available',
        acquiredAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
      });
    }

    userList = [...newRecords, ...userList];
    safeSetStorage('obsidian_user_coupons', userList);

    // Update merchant issued count
    const updatedCoupons = coupons.map((c) =>
      c.id === dispatchCoupon.id
        ? { ...c, issuedCount: c.issuedCount + targetCount * dispatchQuantityPerUser }
        : c
    );
    saveCoupons(updatedCoupons);

    setDispatchModalOpen(false);
    showToast(`🚀 批量营销派发成功！已向【${targetLabelMap[dispatchTarget]}】派送【${dispatchCoupon.title}】共 ${targetCount * dispatchQuantityPerUser} 张！`);
  };

  // Save Modal Form
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !code.trim()) {
      showToast('请填写优惠券标题和券码');
      return;
    }

    const numVal = parseFloat(discountValue) || 0;
    const finalVal = couponType === 'discount_percent' ? numVal / 10 : numVal;
    const numMinSpend = parseFloat(minSpend) || 0;
    const numMaxCap = parseFloat(maxDiscountCap) || 20;
    const numTotalQty = parseInt(totalQuantity, 10) || 0;

    const catNameMap: Record<string, string> = {
      mains: '炙烤主餐',
      drinks: '精酿饮品',
      desserts: '时令甜品',
      snacks: '特色小吃'
    };
    const scopeCategoryNames = selectedCategories.map((cat) => catNameMap[cat] || cat);

    let timeSlotLabel = '全天全时段通用';
    if (timeSlotType === 'lunch_only') timeSlotLabel = '午市专享 11:00 - 14:00';
    else if (timeSlotType === 'dinner_night') timeSlotLabel = '晚市夜宵 17:00 - 23:00';
    else if (timeSlotType === 'custom') timeSlotLabel = `限时 ${customTimeStart} - ${customTimeEnd}`;

    let dayRestrictionLabel = '全周通用 (周一至周日)';
    if (dayRestriction === 'workdays_only') dayRestrictionLabel = '仅限工作日 (周一至周五)';
    else if (dayRestriction === 'weekends_only') dayRestrictionLabel = '仅限周末 (周六/周日)';

    const newCoupon: CouponItem = {
      id: editingCoupon ? editingCoupon.id : `cpn-${Date.now()}`,
      code: code.trim().toUpperCase(),
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      couponType,
      discountValue: finalVal,
      minSpend: numMinSpend,
      maxDiscountCap: couponType === 'discount_percent' ? numMaxCap : undefined,
      allowStackWithActivity,
      allowStackWithVIP,
      isExclusive,
      scopeType,
      scopeCategories: scopeType === 'category' ? selectedCategories : undefined,
      scopeCategoryNames: scopeType === 'category' ? scopeCategoryNames : undefined,
      timeSlotType,
      customTimeStart: timeSlotType === 'custom' ? customTimeStart : undefined,
      customTimeEnd: timeSlotType === 'custom' ? customTimeEnd : undefined,
      timeSlotLabel,
      dayRestriction,
      dayRestrictionLabel,
      designStyle,
      bgImageUrl: bgImageUrl.trim() || undefined,
      badgeText: badgeText.trim() || undefined,
      themeColor,
      customHtmlCode: customHtmlCode.trim() || undefined,
      totalQuantity: numTotalQty,
      issuedCount: editingCoupon ? editingCoupon.issuedCount : 0,
      usedCount: editingCoupon ? editingCoupon.usedCount : 0,
      status,
      expireDate,
      createdAt: editingCoupon ? editingCoupon.createdAt : new Date().toISOString().substring(0, 10)
    };

    let updated: CouponItem[];
    if (editingCoupon) {
      updated = coupons.map((c) => (c.id === editingCoupon.id ? newCoupon : c));
      globalVersionEngine.recordDataMutation({
        module: 'coupons',
        entityId: newCoupon.id,
        entityName: newCoupon.title,
        actionType: 'update',
        beforeData: editingCoupon,
        afterData: newCoupon,
        customSummary: `修改优惠券配置【${newCoupon.title}】(${newCoupon.code})`
      });
      showToast(`优惠券【${newCoupon.title}】修改已保存并生效！`);
    } else {
      updated = [newCoupon, ...coupons];
      globalVersionEngine.recordDataMutation({
        module: 'coupons',
        entityId: newCoupon.id,
        entityName: newCoupon.title,
        actionType: 'create',
        beforeData: null,
        afterData: newCoupon,
        customSummary: `新增发行优惠券【${newCoupon.title}】(${newCoupon.code})`
      });
      showToast(`🎉 成功创建并上线优惠券【${newCoupon.title}】！`);
    }

    saveCoupons(updated);
    setIsModalOpen(false);
  };

  // Image Upload Helper
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setBgImageUrl(event.target.result as string);
          setDesignStyle('custom_image');
          showToast('封面设计图片已上传成功！');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Fill default template snippet
  const handleInsertHtmlTemplate = () => {
    const template = `<div class="p-3 bg-gradient-to-r from-neutral-900 via-amber-950 to-neutral-950 text-white rounded-xl border border-amber-500/40 flex items-center justify-between shadow-inner">
  <div class="flex items-center gap-2">
    <div class="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">VIP</div>
    <div>
      <div class="text-xs font-black tracking-wider text-amber-300">主厨特选 · 专属特惠</div>
      <div class="text-[10px] text-neutral-300">黑曜石主厨定制专属金质勋章</div>
    </div>
  </div>
  <span class="text-xs font-mono font-bold text-amber-300 bg-black/60 px-2 py-0.5 rounded border border-amber-400/30">官方认证</span>
</div>`;
    setCustomHtmlCode(template);
    setDesignStyle('custom_html');
    showToast('已载入自定义卡券设计 HTML 源码模版');
  };

  return (
    <div className="space-y-3.5 max-w-6xl mx-auto pb-10 text-xs text-[#0f172a]">
      {/* Top Banner & Stats */}
      <div className="bg-white rounded-[4px] border border-[#e2e8f0] p-3.5 sm:p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[#f1f5f9]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-[3px] bg-[#0f172a] text-white flex items-center justify-center font-bold text-xs shrink-0">
              <Ticket className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-[#0f172a]">
                  优惠券全生命周期运营与精准营销中枢
                </h3>
                <span className="text-[10px] bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0] px-1.5 py-0.2 rounded-[2px] font-mono font-semibold">
                  {stats.activeCount} 款发放中
                </span>
              </div>
              <p className="text-[11px] text-[#64748b] mt-0.5">
                支持优惠叠加/互斥控制、新老客精准定向批量派券、全场/分类时段限制及自定义视觉卡券。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-3.5 py-1.5 bg-[#0f172a] hover:bg-black text-white rounded-[3px] font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>新建营销优惠券</span>
            </button>
          </div>
        </div>

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3">
          <div className="p-2.5 bg-[#f8fafc] rounded-[3px] border border-[#e2e8f0]">
            <span className="text-[10.5px] text-[#64748b] font-medium block">累计发行与领取</span>
            <span className="text-base font-bold text-[#0f172a] font-mono mt-0.5 block">
              {stats.totalIssued} <span className="text-xs text-[#64748b] font-normal">张</span>
            </span>
          </div>

          <div className="p-2.5 bg-[#f8fafc] rounded-[3px] border border-[#e2e8f0]">
            <span className="text-[10.5px] text-[#64748b] font-medium block">累计核销使用</span>
            <span className="text-base font-bold text-[#16a34a] font-mono mt-0.5 block">
              {stats.totalUsed} <span className="text-xs text-[#64748b] font-normal">张</span>
            </span>
          </div>

          <div className="p-2.5 bg-[#f8fafc] rounded-[3px] border border-[#e2e8f0]">
            <span className="text-[10.5px] text-[#64748b] font-medium block">核销转化率</span>
            <span className="text-base font-bold text-amber-600 font-mono mt-0.5 block">
              {stats.redemptionRate}%
            </span>
          </div>

          <div className="p-2.5 bg-[#f8fafc] rounded-[3px] border border-[#e2e8f0]">
            <span className="text-[10.5px] text-[#64748b] font-medium block">撬动点餐 GMV 估值</span>
            <span className="text-base font-bold text-[#0f172a] font-mono mt-0.5 block">
              ¥{stats.estimatedGmv}
            </span>
          </div>
        </div>

        {/* Marketing Automation Campaign Triggers */}
        <div className="mt-3 pt-3 border-t border-[#f1f5f9] grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <div className="p-2.5 rounded-[3px] bg-[#f8fafc] border border-[#cbd5e1] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold text-xs text-[#0f172a] block">新客进店自动送「新人立减券」</span>
                <span className="text-[10.5px] text-[#64748b]">首次扫码/注册顾客自动到账无门槛券，提升首单转化</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setAutoNewUserCoupon(!autoNewUserCoupon);
                showToast(autoNewUserCoupon ? '已暂停新人进店自动送券' : '已开启新人进店自动送券！');
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors border ${
                autoNewUserCoupon
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-slate-200 text-slate-600 border-slate-300'
              }`}
            >
              {autoNewUserCoupon ? '✓ 自动派券中' : '已暂停'}
            </button>
          </div>

          <div className="p-2.5 rounded-[3px] bg-[#f8fafc] border border-[#cbd5e1] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <span className="font-bold text-xs text-[#0f172a] block">满¥80订单完成自动赠「裂变返券」</span>
                <span className="text-[10.5px] text-[#64748b]">支付后引导分享至同事群，拉动老带新复购</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setAutoFissionShareCoupon(!autoFissionShareCoupon);
                showToast(autoFissionShareCoupon ? '已暂停裂变返券' : '已开启满80裂变返券！');
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors border ${
                autoFissionShareCoupon
                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                  : 'bg-slate-200 text-slate-600 border-slate-300'
              }`}
            >
              {autoFissionShareCoupon ? '✓ 自动裂变中' : '已暂停'}
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-[4px] border border-[#e2e8f0] p-3 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-1 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-[#64748b] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜索优惠券名称、券码 (如 UR-VIP5)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-[#cbd5e1] hover:border-[#94a3b8] focus:border-[#0f172a] rounded-[3px] outline-none text-[#0f172a]"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-[#cbd5e1] rounded-[3px] text-xs font-semibold text-[#0f172a] outline-none cursor-pointer hover:bg-[#f8fafc]"
          >
            <option value="all">全部券类型</option>
            <option value="amount_cut">满额立减券</option>
            <option value="no_threshold">无门槛立减券</option>
            <option value="discount_percent">折扣券 (打折)</option>
            <option value="delivery_free">免配送费券</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-[#cbd5e1] rounded-[3px] text-xs font-semibold text-[#0f172a] outline-none cursor-pointer hover:bg-[#f8fafc]"
          >
            <option value="all">全部状态</option>
            <option value="active">发放中 (在售)</option>
            <option value="paused">已暂停</option>
            <option value="ended">已下架</option>
          </select>
        </div>

        <span className="text-[11px] text-[#64748b] self-end sm:self-center">
          共找到 <strong className="text-[#0f172a] font-bold font-mono">{filteredCoupons.length}</strong> 张优惠券
        </span>
      </div>

      {/* Coupons Table / Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredCoupons.map((coupon) => {
          return (
            <div
              key={coupon.id}
              className={`bg-white rounded-[4px] border p-3.5 shadow-xs flex flex-col justify-between gap-2.5 transition-all relative overflow-hidden ${
                coupon.status === 'active'
                  ? 'border-[#cbd5e1] hover:border-[#94a3b8]'
                  : 'border-[#e2e8f0] opacity-60 bg-[#f8fafc]'
              }`}
            >
              {/* Top Row: Title, Code, Value */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-14 h-14 rounded-[3px] bg-[#0f172a] text-white flex flex-col items-center justify-center p-1 shrink-0">
                    {coupon.couponType === 'discount_percent' ? (
                      <>
                        <span className="text-sm font-bold text-amber-300 font-mono leading-none">
                          {(coupon.discountValue * 10).toFixed(1)}
                        </span>
                        <span className="text-[9px] text-slate-300 font-bold mt-0.5">折</span>
                      </>
                    ) : coupon.couponType === 'delivery_free' ? (
                      <>
                        <span className="text-xs font-bold text-sky-300 leading-none">免</span>
                        <span className="text-[8.5px] text-slate-300 font-medium mt-0.5">配送费</span>
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] font-bold text-amber-300">¥</span>
                        <span className="text-base font-bold text-white font-mono leading-none">
                          {coupon.discountValue}
                        </span>
                      </>
                    )}
                    <span className="text-[8px] text-slate-300 truncate mt-1">
                      {coupon.minSpend === 0 ? '无门槛' : `满¥${coupon.minSpend}`}
                    </span>
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-xs sm:text-sm font-bold text-[#0f172a] truncate">
                        {coupon.title}
                      </h4>
                      {coupon.badgeText && (
                        <span className="text-[9px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded-[2px] font-semibold shrink-0">
                          {coupon.badgeText}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-[#64748b]">
                      <span className="font-mono font-semibold text-[#0f172a] bg-[#f8fafc] border border-[#cbd5e1] px-1.5 py-0.2 rounded-[2px]">
                        {coupon.code}
                      </span>
                      <span>至 {coupon.expireDate} 到期</span>
                    </div>

                    <p className="text-[10.5px] text-[#64748b] truncate">
                      {coupon.subtitle || '全场餐品通用'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleStatus(coupon.id)}
                  className={`px-2 py-0.5 rounded-[2px] text-[10px] font-semibold cursor-pointer transition-colors shrink-0 border ${
                    coupon.status === 'active'
                      ? 'bg-[#f0fdf4] text-[#16a34a] border-[#bbf7d0]'
                      : 'bg-slate-100 text-slate-600 border-slate-300'
                  }`}
                >
                  {coupon.status === 'active' ? '● 发放中' : '○ 已暂停'}
                </button>
              </div>

              {/* Middle Row: Restrictions Badges & Stacking Tags */}
              <div className="p-2 bg-[#f8fafc] rounded-[3px] border border-[#e2e8f0] space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[9.5px] bg-white border border-[#cbd5e1] text-[#0f172a] px-1.5 py-0.5 rounded-[2px] font-medium">
                    {coupon.scopeType === 'all_dishes'
                      ? '🍽️ 全部菜品'
                      : `🥗 分类: ${coupon.scopeCategoryNames?.join('/')}`}
                  </span>
                  <span className="text-[9.5px] bg-amber-50 border border-amber-200 text-amber-800 px-1.5 py-0.5 rounded-[2px] font-medium">
                    ⏰ {coupon.timeSlotLabel}
                  </span>
                  <span className="text-[9.5px] bg-emerald-50 border border-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded-[2px] font-medium">
                    📅 {coupon.dayRestrictionLabel}
                  </span>
                  <span
                    className={`text-[9.5px] px-1.5 py-0.5 rounded-[2px] font-medium border ${
                      coupon.allowStackWithActivity !== false
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}
                  >
                    {coupon.allowStackWithActivity !== false ? '✓ 叠满减' : '✕ 互斥不叠满减'}
                  </span>
                  {coupon.isExclusive && (
                    <span className="text-[9.5px] bg-purple-50 border border-purple-200 text-purple-800 px-1.5 py-0.5 rounded-[2px] font-medium">
                      👑 独享券
                    </span>
                  )}
                </div>

                {coupon.designStyle === 'custom_html' && coupon.customHtmlCode && (
                  <div
                    className="pt-1 pointer-events-none"
                    dangerouslySetInnerHTML={{ __html: coupon.customHtmlCode }}
                  />
                )}
              </div>

              {/* Bottom Row: Issuance Progress & Action Buttons */}
              <div className="flex items-center justify-between pt-1 border-t border-[#f1f5f9] gap-2 flex-wrap">
                <div className="text-[10px] text-[#64748b]">
                  已领 <strong className="text-[#0f172a] font-mono">{coupon.issuedCount}</strong> / 核销{' '}
                  <strong className="text-[#16a34a] font-mono">{coupon.usedCount}</strong>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenDispatchModal(coupon)}
                    className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-[3px] text-[10.5px] font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    title="精准定向发券 / 批量推送券包"
                  >
                    <Send className="w-3 h-3 text-emerald-200" />
                    <span>定向精准派券</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShareQrCoupon(coupon);
                      setShareQrModalOpen(true);
                    }}
                    className="p-1 text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9] rounded-[3px] border border-transparent hover:border-[#cbd5e1] cursor-pointer"
                    title="生成扫码领券海报与二维码"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(coupon)}
                    className="p-1 text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9] rounded-[3px] border border-transparent hover:border-[#cbd5e1] cursor-pointer"
                    title="编辑属性"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteCoupon(coupon.id)}
                    className="p-1 text-[#94a3b8] hover:text-red-600 hover:bg-red-50 rounded-[3px] cursor-pointer"
                    title="删除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL 1: Targeted Batch Dispatch Modal */}
      {dispatchModalOpen && dispatchCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-[4px] border border-[#cbd5e1] shadow-2xl overflow-hidden text-[#0f172a] animate-in zoom-in-95">
            <div className="bg-[#f8fafc] px-4 py-3 border-b border-[#e2e8f0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-[2px] bg-emerald-700 text-white flex items-center justify-center font-bold">
                  <Send className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-sm font-bold text-[#0f172a]">
                  定向精准批量派发优惠券
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDispatchModalOpen(false)}
                className="p-1 rounded text-[#64748b] hover:text-[#0f172a]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs">
              {/* Selected Coupon Card */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-[3px] flex items-center justify-between">
                <div>
                  <div className="font-bold text-emerald-900">{dispatchCoupon.title}</div>
                  <div className="text-[10.5px] text-emerald-700">
                    券码: {dispatchCoupon.code} · 面额:{' '}
                    {dispatchCoupon.couponType === 'discount_percent'
                      ? `${(dispatchCoupon.discountValue * 10).toFixed(1)}折`
                      : `¥${dispatchCoupon.discountValue}`}
                  </div>
                </div>
                <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-emerald-300 font-bold text-emerald-800">
                  待派发
                </span>
              </div>

              {/* Target Segment */}
              <div>
                <label className="block text-[11px] font-bold text-[#0f172a] mb-1.5">
                  选择受众客群分层 (Target Segment)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'all', label: '全部会员客户', desc: '全店 1,280 位注册会员', icon: Users },
                    { id: 'new_customers', label: '新客进店客群', desc: '近7天新注册 142 人', icon: Sparkles },
                    { id: 'vip', label: '黑金 VIP 尊享', desc: '高客单 68 位贵宾会员', icon: Award },
                    { id: 'dormant', label: '唤醒沉睡客户', desc: '超30天未消费 215 人', icon: RefreshCw }
                  ].map((seg) => {
                    const IconComp = seg.icon;
                    const isSelected = dispatchTarget === seg.id;
                    return (
                      <button
                        key={seg.id}
                        type="button"
                        onClick={() => setDispatchTarget(seg.id as any)}
                        className={`p-2.5 rounded-[3px] border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#0f172a] text-white border-[#0f172a] shadow-xs'
                            : 'bg-white border-[#cbd5e1] hover:bg-[#f8fafc]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <IconComp className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-400' : 'text-[#64748b]'}`} />
                          <span>{seg.label}</span>
                        </div>
                        <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-slate-300' : 'text-[#64748b]'}`}>
                          {seg.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quantity Per User */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#0f172a] mb-1">每人派发张数</label>
                  <select
                    value={dispatchQuantityPerUser}
                    onChange={(e) => setDispatchQuantityPerUser(parseInt(e.target.value, 10) || 1)}
                    className="w-full p-2 bg-white border border-[#cbd5e1] rounded font-bold text-xs outline-none"
                  >
                    <option value={1}>每人 1 张</option>
                    <option value={2}>每人 2 张 (双倍惊喜)</option>
                    <option value={3}>每人 3 张 (全周聚餐券)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#0f172a] mb-1">通知渠道</label>
                  <div className="p-2 bg-[#f8fafc] border border-[#cbd5e1] rounded text-[11px] text-[#64748b]">
                    ✓ 微信服务号模版消息 + 客户端券包弹窗
                  </div>
                </div>
              </div>

              {/* Custom Marketing Greeting Msg */}
              <div>
                <label className="block text-[11px] font-bold text-[#0f172a] mb-1">
                  推送赠言与营销话术 (附带在券包内)
                </label>
                <input
                  type="text"
                  value={dispatchCustomMsg}
                  onChange={(e) => setDispatchCustomMsg(e.target.value)}
                  className="w-full p-2 bg-white border border-[#cbd5e1] rounded text-xs font-medium outline-none focus:border-[#0f172a]"
                />
              </div>
            </div>

            <div className="bg-[#f8fafc] px-4 py-3 border-t border-[#e2e8f0] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDispatchModalOpen(false)}
                className="px-3.5 py-1.5 bg-white border border-[#cbd5e1] rounded text-xs font-semibold hover:bg-[#f1f5f9] cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleExecuteDispatch}
                className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>立即批量派发至顾客券包</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: QR Code Poster Modal */}
      {shareQrModalOpen && shareQrCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[4px] border border-[#cbd5e1] shadow-2xl overflow-hidden text-center p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm text-[#0f172a]">扫码领券海报</h3>
              <button
                type="button"
                onClick={() => setShareQrModalOpen(false)}
                className="text-[#64748b] hover:text-[#0f172a] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-[#0f172a] text-white rounded-xl space-y-2 shadow-md">
              <div className="text-xs font-bold text-amber-400">URBAN RADAR FOOD TRUCK</div>
              <div className="text-base font-black">{shareQrCoupon.title}</div>
              <div className="w-36 h-36 mx-auto bg-white rounded-lg p-2 flex items-center justify-center shadow-inner">
                <QrCode className="w-32 h-32 text-black" />
              </div>
              <div className="text-[10px] text-slate-300 font-mono">
                兑换码: <span className="text-amber-300 font-bold">{shareQrCoupon.code}</span>
              </div>
            </div>

            <p className="text-[11px] text-[#64748b]">
              可打印张贴于餐车吧台或分享至朋友圈/写字楼微信群，顾客扫码即领。
            </p>

            <button
              type="button"
              onClick={() => {
                setShareQrModalOpen(false);
                showToast('已复制领券链接与二维码海报！');
              }}
              className="w-full py-2 bg-[#0f172a] text-white rounded font-bold text-xs hover:bg-black cursor-pointer"
            >
              复制海报图文
            </button>
          </div>
        </div>
      )}

      {/* CREATE / EDIT COUPON MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white w-full max-w-3xl max-h-[92vh] rounded-[4px] border border-[#cbd5e1] shadow-2xl flex flex-col overflow-hidden text-[#0f172a] animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-white px-4 py-3 border-b border-[#e2e8f0] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-[3px] bg-[#0f172a] text-white flex items-center justify-center">
                  <Ticket className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <h3 className="text-sm font-bold text-[#0f172a]">
                  {editingCoupon ? '编辑优惠券属性与规则' : '新建营销优惠券'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-[3px] hover:bg-[#f1f5f9] text-[#64748b] hover:text-[#0f172a] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveForm} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Section 1: Basic Info */}
              <div className="space-y-2.5">
                <span className="text-[11px] font-bold text-[#0f172a] flex items-center gap-1.5 border-b border-[#f1f5f9] pb-1">
                  <span>1. 基础信息与券码</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10.5px] font-semibold text-[#0f172a] block mb-1">优惠券名称 *</label>
                    <input
                      type="text"
                      required
                      placeholder="如：午市炙烤专享满减券"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#cbd5e1] rounded-[3px] outline-none focus:border-[#0f172a] font-semibold text-[#0f172a]"
                    />
                  </div>

                  <div>
                    <label className="text-[10.5px] font-semibold text-[#0f172a] block mb-1">兑换券码 (Code) *</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        required
                        placeholder="如：UR-LUNCH10"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-[#cbd5e1] rounded-[3px] outline-none uppercase font-mono font-semibold text-[#0f172a] focus:border-[#0f172a]"
                      />
                      <button
                        type="button"
                        onClick={() => setCode(`UR-${Math.floor(1000 + Math.random() * 9000)}`)}
                        className="px-2.5 py-1.5 bg-[#f8fafc] hover:bg-[#f1f5f9] border border-[#cbd5e1] rounded-[3px] text-[10.5px] font-semibold text-[#0f172a] cursor-pointer"
                      >
                        随机生成
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10.5px] font-semibold text-[#0f172a] block mb-1">副标题/宣传语</label>
                    <input
                      type="text"
                      placeholder="如：写字楼工位午间专送"
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#cbd5e1] rounded-[3px] outline-none focus:border-[#0f172a] text-[#0f172a]"
                    />
                  </div>

                  <div>
                    <label className="text-[10.5px] font-semibold text-[#0f172a] block mb-1">右上角标</label>
                    <input
                      type="text"
                      placeholder="如：午市特惠 / VIP专享 / 限量"
                      value={badgeText}
                      onChange={(e) => setBadgeText(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#cbd5e1] rounded-[3px] outline-none focus:border-[#0f172a] text-[#0f172a]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Type and Discount Value */}
              <div className="space-y-2.5 pt-2 border-t border-[#f1f5f9]">
                <span className="text-[11px] font-bold text-[#0f172a] flex items-center gap-1.5 border-b border-[#f1f5f9] pb-1">
                  2. 优惠方式与使用门槛
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setCouponType('amount_cut')}
                    className={`p-2 rounded-[3px] border text-center cursor-pointer transition-all ${
                      couponType === 'amount_cut'
                        ? 'bg-[#0f172a] text-white border-[#0f172a] font-semibold shadow-xs'
                        : 'bg-white border-[#cbd5e1] text-[#0f172a] hover:bg-[#f8fafc]'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5 mx-auto mb-1" />
                    <span>满额立减券</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCouponType('no_threshold');
                      setMinSpend('0');
                    }}
                    className={`p-2 rounded-[3px] border text-center cursor-pointer transition-all ${
                      couponType === 'no_threshold'
                        ? 'bg-[#0f172a] text-white border-[#0f172a] font-semibold shadow-xs'
                        : 'bg-white border-[#cbd5e1] text-[#0f172a] hover:bg-[#f8fafc]'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 mx-auto mb-1" />
                    <span>无门槛立减券</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCouponType('discount_percent')}
                    className={`p-2 rounded-[3px] border text-center cursor-pointer transition-all ${
                      couponType === 'discount_percent'
                        ? 'bg-[#0f172a] text-white border-[#0f172a] font-semibold shadow-xs'
                        : 'bg-white border-[#cbd5e1] text-[#0f172a] hover:bg-[#f8fafc]'
                    }`}
                  >
                    <Percent className="w-3.5 h-3.5 mx-auto mb-1" />
                    <span>折扣券 (打X折)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCouponType('delivery_free');
                      setDiscountValue('5');
                    }}
                    className={`p-2 rounded-[3px] border text-center cursor-pointer transition-all ${
                      couponType === 'delivery_free'
                        ? 'bg-[#0f172a] text-white border-[#0f172a] font-semibold shadow-xs'
                        : 'bg-white border-[#cbd5e1] text-[#0f172a] hover:bg-[#f8fafc]'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5 mx-auto mb-1" />
                    <span>免配送费券</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10.5px] font-semibold text-[#0f172a] block mb-1">
                      {couponType === 'discount_percent' ? '折扣比例 (如 8.5 表示8.5折)' : '立减金额 (¥) *'}
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#cbd5e1] rounded-[3px] outline-none focus:border-[#0f172a] font-mono font-semibold text-[#0f172a]"
                    />
                  </div>

                  <div>
                    <label className="text-[10.5px] font-semibold text-[#0f172a] block mb-1">
                      最低消费门槛 (0为无门槛)
                    </label>
                    <input
                      type="number"
                      value={minSpend}
                      onChange={(e) => setMinSpend(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#cbd5e1] rounded-[3px] outline-none focus:border-[#0f172a] font-mono font-semibold text-[#0f172a]"
                    />
                  </div>

                  {couponType === 'discount_percent' && (
                    <div>
                      <label className="text-[10.5px] font-semibold text-[#0f172a] block mb-1">
                        最高优惠封顶上限 (¥)
                      </label>
                      <input
                        type="number"
                        value={maxDiscountCap}
                        onChange={(e) => setMaxDiscountCap(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#cbd5e1] rounded-[3px] outline-none focus:border-[#0f172a] font-mono font-semibold text-[#0f172a]"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Section 3: Stacking & Exclusivity Rules */}
              <div className="space-y-2.5 pt-2 border-t border-[#f1f5f9]">
                <span className="text-[11px] font-bold text-[#0f172a] flex items-center gap-1.5 border-b border-[#f1f5f9] pb-1">
                  3. 优惠叠加与互斥规则
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <label className="p-2.5 rounded-[3px] border border-[#cbd5e1] bg-[#f8fafc] flex items-center justify-between cursor-pointer">
                    <div>
                      <div className="font-bold text-xs text-[#0f172a]">允许与满减活动同享</div>
                      <div className="text-[10px] text-[#64748b]">可与全场阶梯满减叠加</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={allowStackWithActivity}
                      onChange={(e) => setAllowStackWithActivity(e.target.checked)}
                      className="w-4 h-4 cursor-pointer accent-[#0f172a]"
                    />
                  </label>

                  <label className="p-2.5 rounded-[3px] border border-[#cbd5e1] bg-[#f8fafc] flex items-center justify-between cursor-pointer">
                    <div>
                      <div className="font-bold text-xs text-[#0f172a]">允许与VIP会员立减同享</div>
                      <div className="text-[10px] text-[#64748b]">会员尊享额外立减</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={allowStackWithVIP}
                      onChange={(e) => setAllowStackWithVIP(e.target.checked)}
                      className="w-4 h-4 cursor-pointer accent-[#0f172a]"
                    />
                  </label>

                  <label className="p-2.5 rounded-[3px] border border-[#cbd5e1] bg-[#f8fafc] flex items-center justify-between cursor-pointer">
                    <div>
                      <div className="font-bold text-xs text-[#0f172a]">设为专属独享券 (Exclusive)</div>
                      <div className="text-[10px] text-[#64748b]">不可与其他任何优惠同享</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isExclusive}
                      onChange={(e) => setIsExclusive(e.target.checked)}
                      className="w-4 h-4 cursor-pointer accent-[#0f172a]"
                    />
                  </label>
                </div>
              </div>

              {/* Section 4: Scope and Classification */}
              <div className="space-y-2.5 pt-2 border-t border-[#f1f5f9]">
                <span className="text-[11px] font-bold text-[#0f172a] flex items-center gap-1.5 border-b border-[#f1f5f9] pb-1">
                  4. 适用菜品范围 (全部菜品 vs 指定分类)
                </span>

                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="scopeType"
                      checked={scopeType === 'all_dishes'}
                      onChange={() => setScopeType('all_dishes')}
                      className="accent-[#0f172a]"
                    />
                    <span className="text-xs font-semibold text-[#0f172a]">全场全部菜品通用</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="scopeType"
                      checked={scopeType === 'category'}
                      onChange={() => setScopeType('category')}
                      className="accent-[#0f172a]"
                    />
                    <span className="text-xs font-semibold text-[#0f172a]">限定指定分类菜品</span>
                  </label>
                </div>

                {scopeType === 'category' && (
                  <div className="p-2.5 bg-[#f8fafc] rounded-[3px] border border-[#e2e8f0] space-y-1.5">
                    <span className="text-[10.5px] font-semibold text-[#0f172a] block">勾选适用的菜品大类：</span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: 'mains', label: '炙烤主餐' },
                        { id: 'drinks', label: '精酿饮品' },
                        { id: 'desserts', label: '时令甜品' },
                        { id: 'snacks', label: '特色小吃' }
                      ].map((cat) => {
                        const isChecked = selectedCategories.includes(cat.id as any);
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              if (isChecked) {
                                if (selectedCategories.length > 1) {
                                  setSelectedCategories(selectedCategories.filter((c) => c !== cat.id));
                                }
                              } else {
                                setSelectedCategories([...selectedCategories, cat.id as any]);
                              }
                            }}
                            className={`px-2.5 py-1 rounded-[3px] border text-xs font-semibold transition-all cursor-pointer ${
                              isChecked
                                ? 'bg-[#0f172a] text-white border-[#0f172a]'
                                : 'bg-white text-[#0f172a] border-[#cbd5e1] hover:bg-[#f8fafc]'
                            }`}
                          >
                            {cat.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 5: Time Slot & Workday Restrictions */}
              <div className="space-y-2.5 pt-2 border-t border-[#f1f5f9]">
                <span className="text-[11px] font-bold text-[#0f172a] flex items-center gap-1.5 border-b border-[#f1f5f9] pb-1">
                  5. 使用时段与工作日限制
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10.5px] font-semibold text-[#0f172a] block mb-1">
                      适用时段
                    </label>
                    <select
                      value={timeSlotType}
                      onChange={(e) => setTimeSlotType(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#cbd5e1] rounded-[3px] outline-none font-semibold text-[#0f172a] cursor-pointer"
                    >
                      <option value="all_day">全天全时段通用 (00:00 - 23:59)</option>
                      <option value="lunch_only">午市专享 (11:00 - 14:00)</option>
                      <option value="dinner_night">晚市夜宵专享 (17:00 - 23:00)</option>
                      <option value="custom">自定义指定时段</option>
                    </select>

                    {timeSlotType === 'custom' && (
                      <div className="flex items-center gap-1.5 pt-1.5">
                        <input
                          type="time"
                          value={customTimeStart}
                          onChange={(e) => setCustomTimeStart(e.target.value)}
                          className="px-2 py-1 bg-white border border-[#cbd5e1] rounded-[3px] text-xs text-[#0f172a]"
                        />
                        <span className="text-[#64748b]">至</span>
                        <input
                          type="time"
                          value={customTimeEnd}
                          onChange={(e) => setCustomTimeEnd(e.target.value)}
                          className="px-2 py-1 bg-white border border-[#cbd5e1] rounded-[3px] text-xs text-[#0f172a]"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[10.5px] font-semibold text-[#0f172a] block mb-1">
                      工作日/周末适用限制
                    </label>
                    <select
                      value={dayRestriction}
                      onChange={(e) => setDayRestriction(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#cbd5e1] rounded-[3px] outline-none font-semibold text-[#0f172a] cursor-pointer"
                    >
                      <option value="all_week">全周通用 (周一至周日)</option>
                      <option value="workdays_only">仅限工作日 (周一至周五，写字楼午餐刚需)</option>
                      <option value="weekends_only">仅限周末/节假日 (周六、周日聚会)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 6: Expiry & Issuance */}
              <div className="space-y-2.5 pt-2 border-t border-[#f1f5f9]">
                <span className="text-[11px] font-bold text-[#0f172a] flex items-center gap-1.5 border-b border-[#f1f5f9] pb-1">
                  6. 发放总量与有效期
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10.5px] font-semibold text-[#0f172a] block mb-1">
                      发行总量 (0为不限量)
                    </label>
                    <input
                      type="number"
                      value={totalQuantity}
                      onChange={(e) => setTotalQuantity(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#cbd5e1] rounded-[3px] outline-none focus:border-[#0f172a] font-mono font-semibold text-[#0f172a]"
                    />
                  </div>

                  <div>
                    <label className="text-[10.5px] font-semibold text-[#0f172a] block mb-1">截止日期 *</label>
                    <input
                      type="date"
                      required
                      value={expireDate}
                      onChange={(e) => setExpireDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#cbd5e1] rounded-[3px] outline-none focus:border-[#0f172a] font-mono font-semibold text-[#0f172a]"
                    />
                  </div>

                  <div>
                    <label className="text-[10.5px] font-semibold text-[#0f172a] block mb-1">上线状态</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#cbd5e1] rounded-[3px] outline-none font-semibold text-[#0f172a] cursor-pointer"
                    >
                      <option value="active">立即上线发放</option>
                      <option value="paused">暂时暂停</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="pt-3 border-t border-[#e2e8f0] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 bg-white hover:bg-[#f1f5f9] text-[#0f172a] font-semibold text-xs rounded-[3px] border border-[#cbd5e1] cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#0f172a] hover:bg-black text-white font-semibold text-xs rounded-[3px] cursor-pointer shadow-xs"
                >
                  {editingCoupon ? '保存修改' : '立即创建并发布'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
