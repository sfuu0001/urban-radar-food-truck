import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Check,
  Users,
  Star,
  X,
  Search,
  MessageSquare,
  QrCode,
  Navigation,
  MapPin,
  Truck,
  Sparkles,
  Flame,
  Coffee,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Radio,
  Clock
} from 'lucide-react';
import { Order, DishItem } from '../../types';

// Image assets
import skewersImg from '../../assets/images/lowkey_skewers_1788031604251.jpg';
import coldbrewImg from '../../assets/images/lowkey_coldbrew_1788031656934.jpg';
import sodaImg from '../../assets/images/lowkey_soda_1788032037702.jpg';
import burgerImg from '../../assets/images/lowkey_burger_1788031618331.jpg';

// Engine & configs
import {
  getAllTruckConfigs,
  getActiveTruckConfig,
  setActiveTruckId,
  getUserLocationState,
  calculateGeodesicDistanceKm,
  getTruckTheme,
  TruckLocationConfig,
  UserLocationState,
  TRUCK_LOCATION_EVENT,
  USER_LOCATION_EVENT
} from '../../utils/truckLocationEngine';

export interface DynamicFeedsPageViewProps {
  orders?: Order[];
  dishes?: DishItem[];
  viewerRole?: string;
  onBackToMenu?: () => void;
  onTrackOrder?: (orderId: string) => void;
  onAdvanceOrderStatus?: (orderId: string, targetStatus?: Order['status'], extraDetails?: Partial<Order>) => void;
  onRejectOrder?: (orderId: string, reason: string) => void;
  onAuditRefund?: (orderId: string, approved: boolean, rejectReason?: string) => void;
  showToast?: (title: string, desc?: string) => void;
  embedded?: boolean;
}

export type FeedType = 'coupon' | 'community' | 'delivery' | 'expired' | 'all';

export interface TruckFeedItem {
  id: string;
  truckId: string;
  truck: TruckLocationConfig;
  distanceKm: number;
  isActiveTruck: boolean;
  brandName: string;
  branchTag: string;
  branchTagType: 'location' | 'open' | 'secret' | 'coffee' | 'custom';
  avatarUrl: string;
  cornerBadge?: {
    type: 'dot' | 'voucher' | '24h' | 'custom';
    color?: string;
    text?: string;
    title?: string;
  };
  date: string;
  typeTag: string;
  typeTagClass: string;
  category: 'coupon' | 'community' | 'delivery' | 'expired';
  summary: string;
  isStrikethrough?: boolean;
  actionRowType: 'community_count' | 'voucher_card' | 'delivery_review' | 'night_delivery';
  actionData?: {
    orderNo?: string;
    countText?: string;
    actionBtnText?: string;
    voucherAmount?: string;
    voucherTitle?: string;
    voucherExpiry?: string;
    statusText?: string;
    footerText?: string;
  };
  unread: boolean;
}

export const DynamicFeedsPageView: React.FC<DynamicFeedsPageViewProps> = ({
  onBackToMenu,
  onTrackOrder,
  showToast = () => {},
  embedded = false
}) => {
  // 真实附近餐车列表、选定餐车与当前用户位置状态
  const [trucks, setTrucks] = useState<TruckLocationConfig[]>(() => getAllTruckConfigs());
  const [activeTruck, setActiveTruck] = useState<TruckLocationConfig>(() => getActiveTruckConfig());
  const [userLocation, setUserLocation] = useState<UserLocationState>(() => getUserLocationState());

  // 交互筛选与状态
  const [activeCategory, setActiveCategory] = useState<FeedType>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [readItemIds, setReadItemIds] = useState<Set<string>>(new Set());

  // 弹窗状态与当前选中餐车
  const [selectedTruckForModal, setSelectedTruckForModal] = useState<TruckLocationConfig | null>(null);
  const [isCommunityModalOpen, setIsCommunityModalOpen] = useState(false);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['包装私密严实', '配送极速', '保温完好']);

  // 监听全局餐车位置变更与用户位置变化广播
  useEffect(() => {
    const handleSync = () => {
      setTrucks(getAllTruckConfigs());
      setActiveTruck(getActiveTruckConfig());
      setUserLocation(getUserLocationState());
    };

    window.addEventListener(TRUCK_LOCATION_EVENT, handleSync);
    window.addEventListener(USER_LOCATION_EVENT, handleSync);

    return () => {
      window.removeEventListener(TRUCK_LOCATION_EVENT, handleSync);
      window.removeEventListener(USER_LOCATION_EVENT, handleSync);
    };
  }, []);

  // 核心：基于真实附近餐车与用户当前经纬度动态生成动态条目
  const dynamicTruckItems = useMemo<TruckFeedItem[]>(() => {
    return trucks
      .map((truck, idx) => {
        const distanceKm = calculateGeodesicDistanceKm(
          userLocation.latitude,
          userLocation.longitude,
          truck.latitude,
          truck.longitude
        );
        const isActiveTruck = truck.id === activeTruck.id;

        // 根据餐车配置或序号映射头像图片与特色主题
        let avatarUrl = skewersImg;
        let category: 'coupon' | 'community' | 'delivery' | 'expired' = 'community';
        let branchTagType: 'location' | 'open' | 'secret' | 'coffee' | 'custom' = 'location';
        let typeTag = '[社群互动]';
        let typeTagClass = 'bg-amber-50 text-amber-800 border-amber-200/80 font-bold';
        let summary = `${truck.locationName} 站台主厨已建立【老饕粉丝群】，每日限量抢炭火和牛鲜包与独家黑椒串...`;
        let actionRowType: 'community_count' | 'voucher_card' | 'delivery_review' | 'night_delivery' = 'community_count';
        let actionData: TruckFeedItem['actionData'] = {
          countText: '群成员已超 480 人 · 每日福利',
          actionBtnText: '加入老饕群 →'
        };
        let cornerBadge: TruckFeedItem['cornerBadge'] = {
          type: 'dot',
          color: 'bg-emerald-500',
          title: '营业中'
        };
        let date = '出餐约 6-8 分';

        if (truck.id === 'truck-02' || idx === 1) {
          avatarUrl = coldbrewImg;
          category = 'coupon';
          branchTagType = 'open';
          typeTag = '[满50减10]';
          typeTagClass = 'bg-rose-50 text-rose-700 border-rose-200/80 font-bold';
          summary = `北座办公区特邀专享：您收到一张满 50 减 10 的限定冷萃咖啡与热狗立减券，午市直达！`;
          actionRowType = 'voucher_card';
          actionData = {
            voucherAmount: '¥10',
            voucherTitle: `${truck.name.slice(0, 5)}专享冷萃立减券`,
            voucherExpiry: '有效期至本周日 24:00',
            actionBtnText: '去使用'
          };
          cornerBadge = { type: 'voucher', text: 'VOUCHER' };
          date = '排队仅 1 份';
        } else if (truck.id === 'truck-03' || idx === 2) {
          avatarUrl = sodaImg;
          category = 'community';
          branchTagType = 'custom';
          typeTag = '[车友社群]';
          typeTagClass = 'bg-cyan-50 text-cyan-800 border-cyan-200/80 font-bold';
          summary = `苏河湾水岸夜市车友集结中，凭任意餐车订单可至西里广场服务台核销特饮一杯...`;
          actionRowType = 'community_count';
          actionData = {
            countText: '车友会已超 350 人 · 专属水岸福利',
            actionBtnText: '入群领特饮 →'
          };
          cornerBadge = { type: 'dot', color: 'bg-cyan-500', title: '水岸俱乐部' };
          date = '营业中';
        } else if (truck.id === 'truck-04' || idx === 3) {
          avatarUrl = burgerImg;
          category = 'delivery';
          branchTagType = 'coffee';
          typeTag = '[极速专送]';
          typeTagClass = 'bg-purple-50 text-purple-700 border-purple-200/80 font-bold';
          summary = `静安国际中心 24H 夜间热食保温专送通道在线，全程 GPS 动态温控直达。`;
          actionRowType = 'delivery_review';
          actionData = {
            statusText: '已确认妥投 · 满意度评价 (履约率 100%)',
            actionBtnText: '去评价 >'
          };
          cornerBadge = { type: '24h', text: '24H' };
          date = '24H 保温专送';
        }

        // 提取简短分站标签
        const branchTag = truck.locationName.includes('·')
          ? truck.locationName.split('·')[1].trim()
          : truck.locationName.slice(0, 8);

        return {
          id: `feed-${truck.id}`,
          truckId: truck.id,
          truck,
          distanceKm,
          isActiveTruck,
          brandName: truck.name,
          branchTag,
          branchTagType,
          avatarUrl,
          cornerBadge,
          date,
          typeTag,
          typeTagClass,
          category,
          summary,
          actionRowType,
          actionData,
          unread: !readItemIds.has(`feed-${truck.id}`)
        };
      })
      // 按与当前位置距离由近及远精确排序
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [trucks, activeTruck, userLocation, readItemIds]);

  // 未读数计算
  const unreadCount = useMemo(
    () => dynamicTruckItems.filter((i) => i.unread).length,
    [dynamicTruckItems]
  );

  // 分类与搜索过滤
  const filteredItems = useMemo(() => {
    return dynamicTruckItems.filter((item) => {
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }
      if (searchKeyword.trim()) {
        const q = searchKeyword.toLowerCase();
        const matchName = item.brandName.toLowerCase().includes(q);
        const matchBranch = item.branchTag.toLowerCase().includes(q);
        const matchLocation = item.truck.locationName.toLowerCase().includes(q);
        const matchSummary = item.summary.toLowerCase().includes(q);
        const matchPlate = (item.truck.code || '').toLowerCase().includes(q);
        const matchType = item.typeTag.toLowerCase().includes(q);
        return matchName || matchBranch || matchLocation || matchSummary || matchPlate || matchType;
      }
      return true;
    });
  }, [dynamicTruckItems, activeCategory, searchKeyword]);

  // 全部标记已读
  const handleMarkAllRead = () => {
    setReadItemIds(new Set(dynamicTruckItems.map((i) => i.id)));
    showToast('全部已设为已读', '附近餐车最新通知与动态已标记为已读');
  };

  // 单条标记已读
  const handleMarkItemRead = (id: string) => {
    setReadItemIds((prev) => new Set([...prev, id]));
  };

  // 切换餐车绑定
  const handleSwitchTruck = (truck: TruckLocationConfig, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveTruckId(truck.id);
    setActiveTruck(truck);
    showToast('已切换绑定餐车', `当前服务餐车已变更为 ${truck.name}（${truck.locationName}）`);
  };

  // 进店点单
  const handleOrderFromTruck = (truck: TruckLocationConfig, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveTruckId(truck.id);
    setActiveTruck(truck);
    showToast('正在前往点单', `已连接 ${truck.name}，起送价 ¥${truck.minDeliveryAmount}`);
    if (onBackToMenu) {
      onBackToMenu();
    }
  };

  // 点击卡片条目动作
  const handleItemAction = (item: TruckFeedItem, e: React.MouseEvent) => {
    e.stopPropagation();
    handleMarkItemRead(item.id);
    setSelectedTruckForModal(item.truck);

    if (item.category === 'community') {
      setIsCommunityModalOpen(true);
    } else if (item.category === 'coupon') {
      setActiveTruckId(item.truck.id);
      setActiveTruck(item.truck);
      showToast('优惠券已领入账户', `${item.brandName} 满 50 减 10 专享券已生效，点单自动抵扣！`);
      if (onBackToMenu) {
        setTimeout(() => {
          onBackToMenu();
        }, 800);
      }
    } else if (item.category === 'delivery') {
      setIsRatingModalOpen(true);
    } else {
      handleOrderFromTruck(item.truck);
    }
  };

  // 提交履约评价
  const handleSubmitRating = () => {
    setIsRatingModalOpen(false);
    showToast('评价提交成功', `感谢对 ${selectedTruckForModal?.name || '流动餐车'} 的评价！极速履约评分 +5 分`);
  };

  // 确认加入社群
  const handleJoinGroup = () => {
    setIsCommunityModalOpen(false);
    showToast('加入社群成功', `已成为 ${selectedTruckForModal?.name || '黑曜石餐车'} 粉丝群老饕成员！`);
  };

  return (
    <div className="min-h-full w-full bg-surface text-[#1a1a17] font-sans antialiased p-0 m-0 flex justify-center selection:bg-[#1a1a17] selection:text-white pb-28">
      <div className="w-full max-w-5xl bg-surface rounded-none border-0 shadow-none overflow-hidden transition-all flex flex-col">
        {/* 顶部独立导航条 (仅在非嵌入模式下显示) */}
        {!embedded && (
          <div className="bg-white px-4 pt-3.5 pb-3 border-b border-border flex items-center justify-between sticky top-0 z-20 shadow-xs">
            <div className="flex items-center gap-2">
              {onBackToMenu && (
                <button
                  type="button"
                  id="mobile-container-back-btn"
                  onClick={onBackToMenu}
                  className="w-7 h-7 rounded-micro bg-surface flex items-center justify-center border border-border text-primary hover:bg-border-subtle active:scale-95 transition-all cursor-pointer"
                  title="返回"
                  aria-label="返回"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              )}
              <h2 className="text-sm font-bold tracking-tight text-primary flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-emerald-600" />
                全域互动动态流 · 附近餐车站台
              </h2>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono font-medium text-muted bg-surface px-2 py-0.5 rounded-micro border border-border">
                {unreadCount > 0 ? `${unreadCount} 条新动态` : '已全部关注'}
              </span>
              <button
                type="button"
                id="mark-all-read-btn"
                onClick={handleMarkAllRead}
                className="w-7 h-7 rounded-micro bg-surface flex items-center justify-center border border-border text-muted hover:text-primary active:scale-95 transition-all cursor-pointer"
                title="设为全部已读"
                aria-label="设为全部已读"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* 实时定位基准与雷达覆盖信息栏 (改为白色设计) */}
        <div className="px-4 py-2 bg-white text-neutral-800 flex items-center justify-between text-xs border-b border-neutral-200">
          <div className="flex items-center gap-1.5 min-w-0">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-[11px] text-neutral-400 shrink-0">当前定位基准：</span>
            <span className="text-[11px] font-bold text-neutral-900 truncate max-w-[200px] sm:max-w-xs">
              {userLocation.locationName || '西藏北路 166 号 · 静安大悦城'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[9.5px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              已链接附近 {dynamicTruckItems.length} 辆流动餐车
            </span>
          </div>
        </div>

        {/* 分类快捷筛选与搜索条 (设计成胶囊按钮样式) */}
        <div className="px-4 py-2.5 bg-white border-b border-border-subtle flex flex-col gap-2">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1 rounded-full text-[11px] font-mono font-bold transition-all cursor-pointer shrink-0 ${
                activeCategory === 'all'
                  ? 'bg-neutral-900 text-white shadow-2xs'
                  : 'bg-neutral-100 text-neutral-600 border border-neutral-200 hover:bg-neutral-200/70 hover:text-neutral-900'
              }`}
            >
              全部附近餐车 ({dynamicTruckItems.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('coupon')}
              className={`px-3 py-1 rounded-full text-[11px] font-mono font-bold transition-all cursor-pointer shrink-0 ${
                activeCategory === 'coupon'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100/70'
              }`}
            >
              [卡券特惠]
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('community')}
              className={`px-3 py-1 rounded-full text-[11px] font-mono font-bold transition-all cursor-pointer shrink-0 ${
                activeCategory === 'community'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100/70'
              }`}
            >
              [社群互动]
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('delivery')}
              className={`px-3 py-1 rounded-full text-[11px] font-mono font-bold transition-all cursor-pointer shrink-0 ${
                activeCategory === 'delivery'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100/70'
              }`}
            >
              [履约追踪]
            </button>
          </div>

          {/* 实时搜索框 */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-muted-light absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索餐车名称、车牌、驻点商圈、特惠或招牌..."
              className="w-full bg-surface border border-border rounded-micro pl-8 pr-2.5 py-1.5 text-xs text-primary placeholder:text-muted-light focus:outline-hidden focus:border-neutral-900 transition-all font-sans"
            />
            {searchKeyword && (
              <button
                type="button"
                onClick={() => setSearchKeyword('')}
                className="absolute right-2.5 text-muted-light hover:text-primary p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* 动态流分组头：链接真实附近餐车站台 */}
        <div className="px-4 pt-2.5 pb-2 flex items-center justify-between bg-surface/90 backdrop-blur-sm sticky top-[48px] z-10 border-b border-border/60">
          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span className="text-[11px] font-mono tracking-wide text-neutral-800 font-bold">
              附近餐车雷达站台 · 实时动态流
            </span>
            <span className="text-[10px] text-neutral-400 font-mono">
              (由近及远精确排序)
            </span>
          </div>
          <span className="text-[10px] text-emerald-700 font-mono bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
            GPS 实时高精协同
          </span>
        </div>

        {/* 真实餐车条目列表 */}
        <div className="p-3 sm:p-4 space-y-3 bg-[#f8f8f6]">
          {filteredItems.length === 0 ? (
            <div className="py-12 px-4 text-center bg-white rounded-xl border border-neutral-200">
              <MessageSquare className="w-8 h-8 text-muted-light mx-auto mb-2 opacity-50" />
              <p className="text-xs font-semibold text-muted">未找到匹配的餐车或动态</p>
              <p className="text-[10px] text-muted-light mt-1">请尝试切换筛选标签或清除搜索词</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <article
                key={item.id}
                id={`truck-feed-card-${item.truck.id}`}
                onClick={() => {
                  handleMarkItemRead(item.id);
                }}
                className={`rounded-xl transition-all duration-150 overflow-hidden bg-white group cursor-pointer relative ${
                  item.isActiveTruck
                    ? 'border-2 border-[#1a1a17] shadow-[0_4px_18px_rgba(26,26,23,0.09)]'
                    : 'border border-neutral-200/90 hover:border-neutral-300 hover:shadow-2xs'
                }`}
              >
                {/* 结构 1：餐车主体信息与业务互动内容 */}
                <div className="p-3.5 sm:p-4">
                  <div className="flex items-start gap-3 sm:gap-3.5">
                    {/* 餐车站台头像 */}
                    <div className="relative shrink-0">
                      <div className="w-13 h-13 rounded-custom overflow-hidden border border-neutral-200 bg-neutral-100 flex items-center justify-center shadow-subtle">
                        <img
                          alt={item.brandName}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          src={item.avatarUrl}
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>

                      {/* 车号角标 */}
                      <span className="absolute -bottom-1.5 -right-1 px-1.5 py-0.2 bg-neutral-900 text-white text-[8.5px] font-mono font-bold rounded-micro shadow-subtle">
                        {item.truck.id.replace('truck-', '#')}
                      </span>

                      {/* 角标状态 */}
                      {item.cornerBadge && item.unread && (
                        <span
                          className={`absolute -top-1 -right-1 w-2.5 h-2.5 ${
                            item.cornerBadge.color || 'bg-rose-500'
                          } rounded-full badge-dot animate-pulse`}
                          title={item.cornerBadge.title || '新动态'}
                        />
                      )}
                    </div>

                    {/* 餐车核心内容 */}
                    <div className="flex-1 min-w-0">
                      {/* 第一行：车名、车牌、分站、当前服务中徽标、距离 */}
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                          <h3 className="text-xs font-bold text-neutral-900 truncate">
                            {item.brandName}
                          </h3>

                          {/* 车牌微标 */}
                          <span className="shrink-0 px-1 py-0.2 rounded-micro text-[9px] font-mono text-neutral-600 bg-neutral-100 border border-neutral-200">
                            {item.truck.code || '沪A·TRK01'}
                          </span>

                          {/* 停靠分站微标 */}
                          <span className="shrink-0 px-1 py-0.2 rounded-micro text-[9px] font-medium bg-amber-50 text-amber-800 border border-amber-200/80">
                            {item.branchTag}
                          </span>

                          {/* 当前服务中徽标 */}
                          {item.isActiveTruck && (
                            <span className="shrink-0 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                              当前绑定服务中
                            </span>
                          )}
                        </div>

                        {/* 真实计算距离胶囊 */}
                        <div className="shrink-0 flex items-center gap-1 font-mono text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/70">
                          <Navigation className="w-3 h-3 text-emerald-600" />
                          <span>{item.distanceKm < 0.1 ? '<0.1' : item.distanceKm.toFixed(1)}km</span>
                        </div>
                      </div>

                      {/* 第二行：停靠位置详细描述与外送起送规则 */}
                      <div className="text-[11px] text-neutral-500 mb-1.5 flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-neutral-400 shrink-0" />
                        <span className="truncate">{item.truck.locationName}</span>
                        <span className="text-neutral-300">·</span>
                        <span className="shrink-0 font-mono text-[10px]">
                          半径 {item.truck.deliveryRadiusKm}km / 起送 ¥{item.truck.minDeliveryAmount}
                        </span>
                      </div>

                      {/* 第三行：动态通知摘要 */}
                      <div className="flex items-center gap-1.5 text-xs">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded-micro font-mono text-[10px] shrink-0 border ${item.typeTagClass}`}
                        >
                          {item.typeTag}
                        </span>
                        <p className="text-[11px] truncate leading-normal text-neutral-700">
                          {item.summary}
                        </p>
                      </div>

                      {/* 条件渲染 3 种典型轻操作条 */}
                      {/* 1. 社群型：群成员统计与立即加入 */}
                      {item.actionRowType === 'community_count' && item.actionData && (
                        <div className="mt-2.5 flex items-center justify-between pt-1.5 border-t border-dashed border-neutral-200">
                          <div className="text-[10.5px] text-neutral-500 font-mono flex items-center gap-1">
                            <Users className="w-3 h-3 text-amber-600" />
                            <span>{item.actionData.countText}</span>
                          </div>
                          <button
                            type="button"
                            id={`join-community-btn-${item.truck.id}`}
                            onClick={(e) => handleItemAction(item, e)}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-micro bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 active:scale-95 transition-all cursor-pointer"
                          >
                            {item.actionData.actionBtnText}
                          </button>
                        </div>
                      )}

                      {/* 2. 优惠券型：内嵌立减券卡片 */}
                      {item.actionRowType === 'voucher_card' && item.actionData && (
                        <div className="mt-2.5 p-2 rounded-custom bg-rose-50/60 border border-rose-200/80 flex items-center justify-between shadow-2xs">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-micro bg-rose-500 flex items-center justify-center text-white font-bold text-xs font-mono">
                              {item.actionData.voucherAmount}
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-rose-900">
                                {item.actionData.voucherTitle}
                              </div>
                              <div className="text-[9px] text-rose-600 font-mono">
                                {item.actionData.voucherExpiry}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            id={`use-voucher-btn-${item.truck.id}`}
                            onClick={(e) => handleItemAction(item, e)}
                            className="text-[10px] font-bold px-2.5 py-1 rounded-micro bg-rose-600 text-white hover:bg-rose-700 active:scale-95 transition-all shadow-subtle cursor-pointer"
                          >
                            {item.actionData.actionBtnText}
                          </button>
                        </div>
                      )}

                      {/* 3. 履约妥投型：状态确认与去评价 */}
                      {item.actionRowType === 'delivery_review' && item.actionData && (
                        <div className="mt-2.5 flex items-center justify-between text-[10px] text-neutral-600 bg-neutral-100/80 px-2.5 py-1.5 rounded-micro border border-neutral-200/80">
                          <span className="flex items-center gap-1 font-mono text-emerald-700 font-semibold">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{item.actionData.statusText}</span>
                          </span>
                          <button
                            type="button"
                            id={`review-delivery-btn-${item.truck.id}`}
                            onClick={(e) => handleItemAction(item, e)}
                            className="text-neutral-900 hover:text-emerald-700 font-bold cursor-pointer"
                          >
                            {item.actionData.actionBtnText}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 结构 2：全宽底部操作栏 (通栏横跨整张卡片) */}
                <div className="px-3.5 py-2.5 bg-neutral-50/70 border-t border-neutral-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-neutral-500 min-w-0">
                    <Clock className="w-3 h-3 text-neutral-400 shrink-0" />
                    <span className="text-neutral-400 shrink-0">出餐状态:</span>
                    <span className="font-semibold text-neutral-700 truncate">{item.date}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!item.isActiveTruck && (
                      <button
                        type="button"
                        id={`switch-truck-btn-${item.truck.id}`}
                        onClick={(e) => handleSwitchTruck(item.truck, e)}
                        className="px-2.5 py-1 rounded-micro border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-800 font-bold text-[11px] active:scale-95 transition-all cursor-pointer shadow-2xs"
                      >
                        切换为此餐车
                      </button>
                    )}

                    <button
                      type="button"
                      id={`order-truck-btn-${item.truck.id}`}
                      onClick={(e) => handleOrderFromTruck(item.truck, e)}
                      className={`px-3 py-1 rounded-micro text-[11px] font-bold active:scale-95 transition-all flex items-center gap-1 shadow-subtle cursor-pointer ${
                        item.isActiveTruck
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-neutral-900 text-white hover:bg-neutral-800'
                      }`}
                    >
                      <span>{item.isActiveTruck ? '进入点单' : '去点单'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        {/* 列表底部标记 */}
        <div className="p-4 bg-surface border-t border-border flex flex-col items-center justify-center gap-1">
          <span className="text-[10px] font-mono text-muted-light uppercase tracking-widest">
            REALTIME FLEET RADAR FEEDS
          </span>
          <span className="text-[9px] text-muted-light font-mono">
            已成功链接附近所有在线餐车站台
          </span>
        </div>
      </div>

      {/* 弹窗 1: 社群邀请互动弹窗 (关联当前点击的餐车) */}
      <AnimatePresence>
        {isCommunityModalOpen && selectedTruckForModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface-card border border-border rounded-custom max-w-sm w-full p-5 shadow-hover relative"
            >
              <button
                type="button"
                onClick={() => setIsCommunityModalOpen(false)}
                className="absolute top-3 right-3 w-7 h-7 rounded-micro bg-surface text-muted hover:text-primary flex items-center justify-center border border-border cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-custom overflow-hidden border border-border">
                  <img alt={selectedTruckForModal.name} className="w-full h-full object-cover" src={skewersImg} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-primary">{selectedTruckForModal.name}</h3>
                  <p className="text-[11px] text-muted font-mono">{selectedTruckForModal.locationName}</p>
                </div>
              </div>

              <div className="bg-surface rounded-custom p-3 border border-border-subtle space-y-2 mb-4 text-xs">
                <div className="flex justify-between items-center text-muted">
                  <span>社群成员总数</span>
                  <span className="font-mono font-bold text-primary">482 / 500 人</span>
                </div>
                <div className="flex justify-between items-center text-muted">
                  <span>入群特权</span>
                  <span className="text-amber-600 font-medium">每日 11:30 抢限量和牛鲜包券</span>
                </div>
                <div className="flex justify-between items-center text-muted">
                  <span>主厨驻点</span>
                  <span className="text-primary font-mono">{selectedTruckForModal.locationName}</span>
                </div>
                <div className="flex justify-between items-center text-muted">
                  <span>车牌协同</span>
                  <span className="text-primary font-mono">{selectedTruckForModal.code || '沪A·TRK01'}</span>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center py-3 bg-white rounded-custom border border-dashed border-border mb-4">
                <QrCode className="w-28 h-28 text-primary" />
                <span className="text-[10px] text-muted font-mono mt-1">
                  扫码或点击下方按钮直接加入老饕粉丝群
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCommunityModalOpen(false)}
                  className="flex-1 py-2 rounded-micro border border-border bg-surface text-xs font-semibold text-muted hover:text-primary cursor-pointer"
                >
                  暂不加入
                </button>
                <button
                  type="button"
                  onClick={handleJoinGroup}
                  className="flex-1 py-2 rounded-micro bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-colors shadow-subtle cursor-pointer"
                >
                  确认加入群聊
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 弹窗 2: 订单履约妥投评价弹窗 (关联当前点击的餐车) */}
      <AnimatePresence>
        {isRatingModalOpen && selectedTruckForModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface-card border border-border rounded-custom max-w-sm w-full p-5 shadow-hover relative"
            >
              <button
                type="button"
                onClick={() => setIsRatingModalOpen(false)}
                className="absolute top-3 right-3 w-7 h-7 rounded-micro bg-surface text-muted hover:text-primary flex items-center justify-center border border-border cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-9 h-9 rounded-custom bg-purple-50 flex items-center justify-center text-purple-700 font-bold font-mono text-sm border border-purple-200">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-primary">{selectedTruckForModal.name}</h3>
                  <p className="text-[10px] text-muted font-mono">
                    {selectedTruckForModal.locationName} · 满意度履约评价
                  </p>
                </div>
              </div>

              {/* Star Rating */}
              <div className="flex items-center justify-center gap-2 py-3 bg-surface rounded-custom border border-border-subtle mb-3">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRatingStars(s)}
                    className="p-1 cursor-pointer transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        s <= ratingStars
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-border-subtle fill-transparent'
                      }`}
                    />
                  </button>
                ))}
              </div>

              {/* Tag Chips */}
              <div className="space-y-1.5 mb-3">
                <div className="text-[11px] text-muted">评价标签：</div>
                <div className="flex flex-wrap gap-1.5">
                  {['包装私密严实', '配送极速', '骑手礼貌', '保温完好', '无接触妥投'].map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedTags((t) => t.filter((item) => item !== tag));
                          } else {
                            setSelectedTags((t) => [...t, tag]);
                          }
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded-micro border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-purple-100 text-purple-800 border-purple-400 font-bold'
                            : 'bg-surface text-muted border-border hover:text-primary'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Feedback Input */}
              <textarea
                value={ratingFeedback}
                onChange={(e) => setRatingFeedback(e.target.value)}
                placeholder="说说这次服务的体验（选填，帮助我们提升专送品质）..."
                rows={3}
                className="w-full bg-surface border border-border rounded-micro p-2 text-xs text-primary placeholder:text-muted-light focus:outline-hidden focus:border-primary mb-4"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsRatingModalOpen(false)}
                  className="flex-1 py-2 rounded-micro border border-border bg-surface text-xs font-semibold text-muted hover:text-primary cursor-pointer"
                >
                  稍后再评
                </button>
                <button
                  type="button"
                  onClick={handleSubmitRating}
                  className="flex-1 py-2 rounded-micro bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-colors shadow-subtle cursor-pointer"
                >
                  提交评价
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DynamicFeedsPageView;
