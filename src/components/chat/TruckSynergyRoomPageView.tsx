import React, { useState, useEffect, useMemo } from 'react';
import { SynergyChatRoomView } from './SynergyChatRoomView';
import { Order, DishItem } from '../../types';
import {
  getActiveTruckConfig,
  TruckLocationConfig
} from '../../utils/truckLocationEngine';
import { sendOrderChatMessage } from '../../utils/chatHub';
import {
  Truck,
  ArrowLeft,
  Phone,
  PhoneCall,
  Clock,
  Thermometer,
  CheckCheck,
  ChevronDown,
  Activity,
  Navigation,
  ShieldCheck,
  X,
  MapPin,
  UtensilsCrossed,
  MoreVertical
} from 'lucide-react';

export interface TruckSynergyRoomPageViewProps {
  orders: Order[];
  dishes?: DishItem[];
  viewerRole?: 'user' | 'rider' | 'merchant' | 'platform' | 'customer';
  onBackToMenu?: () => void;
  onTrackOrder?: (orderId: string) => void;
  onAdvanceOrderStatus?: (orderId: string, targetStatus?: Order['status'], extraDetails?: Partial<Order>) => void;
  onRejectOrder?: (orderId: string, reason: string) => void;
  onAuditRefund?: (orderId: string, approved: boolean, rejectReason?: string) => void;
  showToast?: (title: string, desc?: string) => void;
}

/**
 * TruckSynergyRoomPageView - 餐车专属联络室极限紧凑全屏界面
 * 最大化缩短屏幕占比（将消息可视区拉升至 85%+）
 * 顶部双 Header 与遥测组件合一为 44px 单行吸顶栏，遥测与订单详情收纳为轻量浮层抽屉
 */
export const TruckSynergyRoomPageView: React.FC<TruckSynergyRoomPageViewProps> = ({
  orders = [],
  dishes = [],
  viewerRole = 'user',
  onBackToMenu,
  onTrackOrder,
  showToast
}) => {
  const [hasMarkedAllRead, setHasMarkedAllRead] = useState<boolean>(false);
  const [activeTruck, setActiveTruck] = useState<TruckLocationConfig>(() => getActiveTruckConfig());
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [activeChannel, setActiveChannel] = useState<'all' | 'rider' | 'merchant'>('all');
  const [isCallActive, setIsCallActive] = useState<boolean>(false);

  // 轻量浮层抽屉控制（平时 0 像素占位）
  const [showTruckModal, setShowTruckModal] = useState<boolean>(false);
  const [showOrderModal, setShowOrderModal] = useState<boolean>(false);
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);

  // 同步餐车配置
  useEffect(() => {
    const truck = getActiveTruckConfig();
    if (truck) setActiveTruck(truck);
  }, []);

  // 当前关联的可选订单列表
  const activeOrders = useMemo(() => {
    return orders.length > 0 ? orders : [];
  }, [orders]);

  // 当前选中的订单
  const matchedOrder = useMemo(() => {
    if (selectedOrderId) {
      const found = activeOrders.find((o) => o.orderNo === selectedOrderId || o.id === selectedOrderId);
      if (found) return found;
    }
    const defaultOrder = activeOrders.find((o) => o.orderNo === 'UR-9821' || o.id === 'UR-9821') || activeOrders[0];
    return defaultOrder;
  }, [activeOrders, selectedOrderId]);

  const activeOrderNo = matchedOrder?.orderNo || 'UR-9821';
  const orderTotal = Number(matchedOrder?.totalAmount || 186).toFixed(0);

  const handleMarkAllRead = () => {
    setHasMarkedAllRead(true);
    setShowMoreMenu(false);
    if (showToast) {
      showToast('已标记全量消息为已读', '餐车通知与互动提醒已清空');
    }
  };

  const handleToggleCall = () => {
    const next = !isCallActive;
    setIsCallActive(next);
    if (showToast) {
      showToast(next ? '正在呼叫餐车主理人' : '通话已挂断');
    }
  };

  const handleQuoteDishInChat = (dishName: string) => {
    try {
      sendOrderChatMessage(activeOrderNo, {
        type: 'text',
        senderRole: viewerRole === 'merchant' ? 'merchant' : viewerRole === 'rider' ? 'rider' : 'user',
        senderName: viewerRole === 'merchant' ? '流动餐车·主理人' : viewerRole === 'rider' ? '专送骑手' : '食客（你）',
        senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
        text: `咨询单品【${dishName}】：请问这份餐品大概还要多久出餐？`
      });
      setShowOrderModal(false);
      if (showToast) {
        showToast('已将菜品咨询发送至联络室', dishName);
      }
    } catch {
      // safe fallback
    }
  };

  return (
    <div className="w-full h-full min-h-0 bg-[#F7F7F6] flex flex-col transition-colors select-none overflow-hidden">
      {/* 44px 极简一体化顶栏：双 Header + 遥测组件彻底融合为单行 */}
      <header className="shrink-0 h-11 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 px-2 sm:px-3 flex items-center justify-between z-30 select-none shadow-2xs">
        {/* 左侧：返回键 + 餐车站台微标签 (轻触展开遥测面板) */}
        <div className="flex items-center space-x-1.5 min-w-0">
          {onBackToMenu && (
            <button
              type="button"
              id="synergy-room-back-btn"
              onClick={onBackToMenu}
              className="w-7 h-7 rounded-lg hover:bg-neutral-100 active:bg-neutral-200 text-neutral-700 flex items-center justify-center transition cursor-pointer shrink-0"
              title="返回点单"
              aria-label="返回点单"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.2]" />
            </button>
          )}

          {/* 餐车状态微标：轻触唤起遥测抽屉 */}
          <button
            type="button"
            onClick={() => setShowTruckModal(true)}
            className="flex items-center space-x-1 px-1 sm:px-1.5 py-1 rounded-lg hover:bg-neutral-100 text-neutral-900 transition cursor-pointer min-w-0"
            title="点击查看餐车遥测与站台详情"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="font-bold text-xs truncate max-w-[62px] xs:max-w-[85px] sm:max-w-[120px]">
              {activeTruck.name ? activeTruck.name.replace('流动餐车', '').trim() : '01号车'}
            </span>
            <span className="text-[10px] font-mono text-amber-800 bg-amber-50 px-1 py-0.2 rounded border border-amber-200/60 hidden sm:inline shrink-0 font-medium">
              约6分
            </span>
            <ChevronDown className="w-3 h-3 text-neutral-400 shrink-0" />
          </button>
        </div>

        {/* 中间：轻量分段切换胶囊 [全员 | 骑手 | 后厨] (保证三端绝不折行) */}
        <div className="flex items-center justify-center shrink-0 mx-0.5 sm:mx-1">
          <div className="inline-flex p-0.5 rounded-lg bg-neutral-100/95 border border-neutral-200/80 text-[11px] font-medium shrink-0 whitespace-nowrap select-none shadow-2xs" data-purpose="synergy-scope-selector">
            <button
              type="button"
              onClick={() => setActiveChannel('all')}
              className={`px-2 sm:px-2.5 py-0.5 rounded-md transition cursor-pointer text-[11px] whitespace-nowrap shrink-0 select-none leading-none ${
                activeChannel === 'all'
                  ? 'bg-white text-neutral-900 font-bold shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              全员
            </button>
            <button
              type="button"
              onClick={() => setActiveChannel('rider')}
              className={`px-2 sm:px-2.5 py-0.5 rounded-md transition cursor-pointer text-[11px] whitespace-nowrap shrink-0 select-none leading-none ${
                activeChannel === 'rider'
                  ? 'bg-white text-amber-800 font-bold shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              骑手
            </button>
            <button
              type="button"
              onClick={() => setActiveChannel('merchant')}
              className={`px-2 sm:px-2.5 py-0.5 rounded-md transition cursor-pointer text-[11px] whitespace-nowrap shrink-0 select-none leading-none ${
                activeChannel === 'merchant'
                  ? 'bg-white text-rose-800 font-bold shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              后厨
            </button>
          </div>
        </div>

        {/* 右侧：电话呼叫 + 订单总额微标 + 更多操作 */}
        <div className="flex items-center space-x-1 shrink-0">
          {/* 电话呼叫按键 */}
          <button
            type="button"
            onClick={handleToggleCall}
            className={`w-7 h-7 rounded-lg border flex items-center justify-center transition cursor-pointer shadow-2xs ${
              isCallActive
                ? 'bg-red-500 border-red-600 text-white animate-pulse'
                : 'bg-emerald-50 border-emerald-200/80 hover:bg-emerald-100 text-emerald-700'
            }`}
            title={isCallActive ? '挂断通话' : '一键直连餐车主理人'}
          >
            {isCallActive ? <PhoneCall className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
          </button>

          {/* 订单微标：轻触滑出餐品底抽屉 */}
          <button
            type="button"
            onClick={() => setShowOrderModal(true)}
            className="h-7 px-1.5 xs:px-2 rounded-lg bg-neutral-100 hover:bg-neutral-200/80 border border-neutral-200/80 flex items-center gap-0.5 text-neutral-800 font-mono font-bold text-[11px] transition cursor-pointer shadow-2xs"
            title="查看订单餐品详情"
          >
            <span>¥{orderTotal}</span>
            <ChevronDown className="w-3 h-3 text-neutral-400 shrink-0" />
          </button>

          {/* 更多菜单按键 */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="w-7 h-7 rounded-lg hover:bg-neutral-100 text-neutral-600 flex items-center justify-center transition cursor-pointer"
              title="更多操作"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {showMoreMenu && (
              <div className="absolute right-0 mt-1.5 w-44 bg-white border border-neutral-200 rounded-xl shadow-xl py-1 z-50 text-[12px] animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="w-full text-left px-3 py-1.5 hover:bg-neutral-50 flex items-center gap-2 text-neutral-700 font-medium cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>全部标记已读</span>
                </button>
                {onTrackOrder && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      onTrackOrder(activeOrderNo);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-neutral-50 flex items-center gap-2 text-neutral-700 font-medium cursor-pointer"
                  >
                    <Navigation className="w-3.5 h-3.5 text-blue-600" />
                    <span>雷达实时追踪</span>
                  </button>
                )}
                {activeOrders.length > 1 && (
                  <div className="border-t border-neutral-100 my-1 pt-1">
                    <div className="px-3 py-1 text-[10px] text-neutral-400 font-semibold">切换协同订单</div>
                    {activeOrders.slice(0, 4).map((ord) => {
                      const no = (ord.orderNo || ord.id).replace(/^#/, '');
                      const isSel = no === activeOrderNo.replace(/^#/, '');
                      return (
                        <button
                          key={ord.id || ord.orderNo}
                          type="button"
                          onClick={() => {
                            setSelectedOrderId(ord.orderNo || ord.id);
                            setShowMoreMenu(false);
                          }}
                          className={`w-full text-left px-3 py-1 text-[11px] font-mono flex items-center justify-between cursor-pointer ${
                            isSel ? 'bg-neutral-100 font-bold text-neutral-900' : 'hover:bg-neutral-50 text-neutral-600'
                          }`}
                        >
                          <span>#{no.slice(-4)}</span>
                          {isSel && <span className="text-emerald-600 text-[10px]">当前</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 沉浸式消息流：填满整个视窗，消除全部多余嵌套与外边距 */}
      <main className="flex-1 min-h-0 w-full max-w-4xl mx-auto flex flex-col overflow-hidden bg-white">
        <SynergyChatRoomView
          order={matchedOrder}
          orderNo={activeOrderNo}
          embedded={true}
          hideHeader={true}
          activeChannel={activeChannel}
          onChannelChange={setActiveChannel}
          isCallActive={isCallActive}
          onToggleCall={handleToggleCall}
          onBack={onBackToMenu}
          onOpenStore={onBackToMenu}
          showToast={showToast}
          viewerRole={viewerRole === 'customer' ? 'user' : (viewerRole || 'user')}
        />
      </main>

      {/* 浮层抽屉 1：餐车遥测监控与站台详情 (轻触唤起，平时 0 像素占位) */}
      {showTruckModal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setShowTruckModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-4 shadow-xl border border-neutral-200 animate-in slide-in-from-bottom-3 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-neutral-900">
                    {activeTruck.name || '黑曜石 01 号流动餐车'}
                  </h3>
                  <p className="text-[10px] text-neutral-500 font-mono">
                    {activeTruck.code || '沪A·TRK01'} · 站台主理人: 周站长
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTruckModal(false)}
                className="w-7 h-7 rounded-full hover:bg-neutral-100 flex items-center justify-center text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-3 grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-xl bg-neutral-50 border border-neutral-200/70">
                <div className="flex items-center gap-1.5 text-neutral-400 text-[10px] mb-1">
                  <MapPin className="w-3 h-3 text-neutral-500" />
                  <span>当前驻泊点</span>
                </div>
                <span className="font-semibold text-neutral-800 block truncate">静安大悦城北广场</span>
                <span className="text-[10px] font-mono text-neutral-500">距您约 350m</span>
              </div>

              <div className="p-2 rounded-xl bg-neutral-50 border border-neutral-200/70">
                <div className="flex items-center gap-1.5 text-neutral-400 text-[10px] mb-1">
                  <Clock className="w-3 h-3 text-amber-600" />
                  <span>排队出餐</span>
                </div>
                <span className="font-bold text-amber-900">3 份等待制作</span>
                <span className="text-[10px] font-mono text-emerald-700 block">预计 6-8 分钟</span>
              </div>

              <div className="p-2 rounded-xl bg-neutral-50 border border-neutral-200/70">
                <div className="flex items-center gap-1.5 text-neutral-400 text-[10px] mb-1">
                  <Thermometer className="w-3 h-3 text-rose-500" />
                  <span>冷链温控</span>
                </div>
                <span className="font-mono font-bold text-neutral-800">-18℃~72℃ 正常</span>
                <span className="text-[10px] text-emerald-600 block font-medium">实时保鲜中</span>
              </div>

              <div className="p-2 rounded-xl bg-neutral-50 border border-neutral-200/70">
                <div className="flex items-center gap-1.5 text-neutral-400 text-[10px] mb-1">
                  <Activity className="w-3 h-3 text-blue-500" />
                  <span>GPS 遥测信标</span>
                </div>
                <span className="font-mono font-bold text-neutral-800">延迟 &lt; 20ms</span>
                <span className="text-[10px] text-emerald-600 block flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  双频定位在线
                </span>
              </div>
            </div>

            <div className="pt-1 flex items-center gap-2">
              {onTrackOrder && (
                <button
                  type="button"
                  onClick={() => {
                    setShowTruckModal(false);
                    onTrackOrder(activeOrderNo);
                  }}
                  className="flex-1 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>雷达地图追踪</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowTruckModal(false)}
                className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold transition cursor-pointer"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 浮层抽屉 2：订单餐品核验清单 (轻触右上角 ¥186 唤起，平时 0 像素占位) */}
      {showOrderModal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setShowOrderModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-4 shadow-xl border border-neutral-200 max-h-[80vh] flex flex-col animate-in slide-in-from-bottom-3 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100 shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-neutral-900">
                  #{activeOrderNo.replace(/^#/, '')}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                  {matchedOrder?.status === 'cooking' ? '制作中' : matchedOrder?.status === 'delivering' ? '专送中' : '履约中'}
                </span>
                <span className="font-mono text-xs font-bold text-neutral-900">¥{Number(matchedOrder?.totalAmount || 186).toFixed(2)}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowOrderModal(false)}
                className="w-7 h-7 rounded-full hover:bg-neutral-100 flex items-center justify-center text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-2.5 text-[11px] text-neutral-600 border-b border-neutral-100 space-y-1.5 shrink-0">
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">配送地址：</span>
                <span className="font-medium text-neutral-800 text-right truncate max-w-[240px]">
                  {matchedOrder?.deliveryAddress || '科技园区 A 座北塔 1204 室'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">骑手预计：</span>
                <span className="font-mono font-semibold text-emerald-700">
                  约 {matchedOrder?.etaMinutes || 4} 分钟送达 (距 350m)
                </span>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto py-2">
              <span className="text-[10px] text-neutral-400 block mb-1.5">包含单品（点击可直接发给餐车咨询）：</span>
              <div className="space-y-1.5">
                {(matchedOrder?.items && matchedOrder.items.length > 0 ? matchedOrder.items : [
                  { name: '极夜炭烤和牛堡', quantity: 1, price: 58 },
                  { name: '西西里风味炸鸡块', quantity: 1, price: 32 },
                  { name: '极夜西西里气泡水', quantity: 2, price: 18 }
                ]).map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-2 rounded-xl bg-neutral-50 hover:bg-emerald-50/60 border border-neutral-200/70 hover:border-emerald-300 flex items-center justify-between transition cursor-pointer"
                    onClick={() => handleQuoteDishInChat(item.name)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <UtensilsCrossed className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span className="font-bold text-neutral-800 text-xs truncate">{item.name}</span>
                      <span className="text-neutral-500 font-mono text-[11px]">x{item.quantity}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono font-bold text-neutral-900 text-xs">¥{Number(item.price || 0).toFixed(2)}</span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-emerald-200/80 shadow-2xs">
                        咨询
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-100 shrink-0">
              <button
                type="button"
                onClick={() => setShowOrderModal(false)}
                className="w-full py-2 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition cursor-pointer"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TruckSynergyRoomPageView;
