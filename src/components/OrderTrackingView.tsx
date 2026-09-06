import React, { useState, useMemo } from 'react';
import { CheckCircle2, AlertTriangle, X, Ban, ShieldCheck, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TruckInfo, Order } from '../types';
import { OrderTrackingData, TrackingStatus } from '../types/tracking';
import {
  TrackingHeader,
  TrackingRadarMap,
  TrackingCourierCard,
  TrackingRouteBar,
  TrackingStepIndicator,
  TrackingDishesAccordion,
  TrackingTimelineLogs,
  TrackingActionFooter,
  TrackingChatModal,
  DineInTrackingSection,
  PickupTrackingSection
} from './tracking';
import {
  GranularOrderStatus,
  getOrderStatusConfig,
  ORDER_STATUS_CONFIG_MAP
} from '../utils/orderFlowEngine';
import { useDevSimulation } from '../context/DevSimulationContext';
import { PaymentVoucher } from '../types/payment';
import { queryPaymentVoucherByOrderNo, createPaymentVoucher } from '../utils/paymentSecurityEngine';
import { ElectronicPaymentVoucherModal } from './payment/ElectronicPaymentVoucherModal';

export interface OrderTrackingViewProps {
  orderId?: string;
  order?: Order;
  truck?: TruckInfo;
  deliveryAddress?: string;
  onBackToMenu?: () => void;
  customData?: Partial<OrderTrackingData>;
  onContactCourier?: () => void;
  onUrgeOrder?: () => void;
  onAdvanceOrderStatus?: (orderId: string, targetStatus?: Order['status'], extraDetails?: Partial<Order>) => void;
  onApplyRefund?: (orderId: string, reason: string, feedback: string, passedStep: string) => void;
}

export const OrderTrackingView: React.FC<OrderTrackingViewProps> = ({
  orderId = '#DEL-9912',
  order,
  truck,
  deliveryAddress = '西藏北路 166 号大悦城商务座 1204 室',
  onBackToMenu,
  onContactCourier,
  onUrgeOrder,
  onAdvanceOrderStatus,
  onApplyRefund
}) => {
  const { isSimulationAllowed } = useDevSimulation();
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('制作或等待配送时间过长');
  const [cancelNote, setCancelNote] = useState('');
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const cleanOrderNo = order?.orderNo || order?.id || orderId;
  const statusConfig = getOrderStatusConfig(order?.status);

  // Resolved or generated Payment Voucher
  const paymentVoucher: PaymentVoucher = useMemo(() => {
    if (order?.paymentVoucher) return order.paymentVoucher;
    const existing = queryPaymentVoucherByOrderNo(cleanOrderNo);
    if (existing) return existing;
    const discount = (order as any)?.couponDiscount ?? (order as any)?.discountAmount ?? 0;
    return createPaymentVoucher({
      orderNo: cleanOrderNo,
      channelId: (order?.paymentMethod as any) || 'wechat',
      paidAmount: order?.totalAmount ?? 96.0,
      originalAmount: (order?.totalAmount ?? 96.0) + discount,
      discountAmount: discount,
      diningMode: order?.channelType || 'delivery'
    });
  }, [order, cleanOrderNo]);

  const handleCopyBill = () => {
    const itemsText = order?.items && order.items.length > 0
      ? order.items.map(it => `- ${it.name} x${it.quantity} (¥${(it.price * it.quantity).toFixed(2)})`).join('\n')
      : '- 极炙和牛汉堡双重奏 x1 (¥68.00)\n- 手作生椰冷萃冰拿铁 x1 (¥28.00)';

    navigator.clipboard?.writeText(
      `【黑曜石流动餐车订单 #${cleanOrderNo.replace(/^#/, '')}】\n${itemsText}\n实付金额：¥${(order?.totalAmount ?? 96.0).toFixed(2)}`
    );
    showToast('餐品清单已成功复制到剪贴板');
  };

  const handleShareTracking = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard?.writeText(window.location.href);
    }
    showToast('实时配送轨迹链接已复制，可分享给好友');
  };

  const handleSimulateSpeed = () => {
    setIsSimulating(true);
    showToast('已触发极速骑行模拟加速');
    setTimeout(() => setIsSimulating(false), 2000);
  };

  // State advance handler (Strictly guarded: non-admins are locked from altering flow nodes)
  const handleStepSelect = (targetStatus: GranularOrderStatus) => {
    if (!isSimulationAllowed) {
      showToast('非管理员权限已锁定流转节点修改，请先以管理员身份登录');
      return;
    }
    const config = ORDER_STATUS_CONFIG_MAP[targetStatus];
    if (onAdvanceOrderStatus) {
      onAdvanceOrderStatus(cleanOrderNo, targetStatus as Order['status'], {
        status: targetStatus as Order['status'],
        statusText: config.label,
        progressPercent:
          targetStatus === 'completed' ? 100 :
          targetStatus === 'delivering' ? 75 :
          targetStatus === 'picked_up' ? 55 :
          targetStatus === 'waiting_pickup' ? 45 :
          targetStatus === 'rider_heading' ? 35 :
          targetStatus === 'ready' ? 25 :
          targetStatus === 'cooking' ? 15 : 5
      });
      showToast(`订单状态已流转至：${config.label}`);
    }
  };

  // Submit cancel order request
  const handleSubmitCancelRequest = () => {
    if (onAdvanceOrderStatus) {
      onAdvanceOrderStatus(cleanOrderNo, 'cancel_requested', {
        status: 'cancel_requested',
        statusText: '客户申请终止订单',
        refundStatus: 'pending',
        refundReason: cancelReason,
        refundFeedback: cancelNote || '顾客在订单流转中发起了终止取消申请',
        refundAppliedAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      });
    } else if (onApplyRefund) {
      onApplyRefund(cleanOrderNo, cancelReason, cancelNote, statusConfig.label);
    }
    setIsCancelModalOpen(false);
    showToast('终止订单申请已提交，等待餐车主理人确认审核');
  };

  // Dynamic dishes array from real order
  const trackingDishes = order?.items && order.items.length > 0
    ? order.items.map((it) => ({
        name: it.name,
        count: it.quantity,
        spec: it.options || '标准现制',
        price: (it.price || 45.0) * it.quantity
      }))
    : undefined;

  // Dynamic courier info
  const courierData = {
    id: 'c-1',
    name: order?.courierName?.split(' ')[0] || '陈志远',
    enName: 'Zhiyuan Chen',
    title: order?.courierName || '陈志远 · 专线骑手 R-8821',
    phone: order?.courierPhone || '138-1829-9201',
    rating: 4.99,
    completedOrders: 1840,
    isInsulatedBoxSanitized: true
  };

  // Chronological logs dynamically generated from status
  const dynamicLogs = [
    ...(statusConfig.key === 'completed'
      ? [{ time: '刚刚', title: '订单妥投送达', desc: `骑手 ${courierData.name} 已安全送达指定地址，并完成存证拍照与温控交付` }]
      : []),
    ...(statusConfig.key === 'delivering' || statusConfig.key === 'completed'
      ? [{ time: '刚刚', title: '骑手配送中', desc: `骑手开启智能高德专线绿波导航，预计 8-12 分钟内送达` }]
      : []),
    ...(['picked_up', 'delivering', 'completed'].includes(statusConfig.key)
      ? [{ time: '取餐时', title: '骑手已取餐', desc: `骑手输入取件码核验无误，放入 68℃ 恒温智能保温箱贴上锁鲜封签` }]
      : []),
    ...(['waiting_pickup', 'picked_up', 'delivering', 'completed'].includes(statusConfig.key)
      ? [{ time: '到店时', title: '骑手已到达餐车', desc: `专送骑手到达流动餐车站台，正在向餐车主理人出示取件码核验` }]
      : []),
    ...(['rider_heading', 'waiting_pickup', 'picked_up', 'delivering', 'completed'].includes(statusConfig.key)
      ? [{ time: '接单后', title: '骑手正在赶往商家', desc: `专线骑手 ${courierData.name} 已接单，正全速赶往流动餐车取餐点` }]
      : []),
    ...(['ready', 'rider_heading', 'waiting_pickup', 'picked_up', 'delivering', 'completed'].includes(statusConfig.key)
      ? [{ time: '出餐时', title: '餐品已制作完成', desc: `主理人完成现制现烤与锁温封装，将餐品移入餐车恒温取餐格待骑手提取` }]
      : []),
    ...(['cooking', 'ready', 'rider_heading', 'waiting_pickup', 'picked_up', 'delivering', 'completed'].includes(statusConfig.key)
      ? [{ time: order?.createdTime || '刚刚', title: '餐车已接单', desc: `${order?.truckName || truck?.name || '黑曜石 01 号流动餐车'} 主理人确认接单，餐品进入 KDS 炭烤制作队列` }]
      : []),
    // Exception logs
    ...(statusConfig.key === 'cancel_requested'
      ? [{ time: '刚刚', title: '客户申请终止订单', desc: `客户发起终止取消订单申请，理由：${order?.refundReason || '时间过长/临时有事'}，等待餐车审核` }]
      : []),
    ...(statusConfig.key === 'merchant_rejected'
      ? [{ time: '刚刚', title: '餐车已拒单', desc: `餐车因就近满负荷或食材售罄驳回订单，支付金额已全额原路退还` }]
      : []),
    ...(statusConfig.key === 'rider_rejected'
      ? [{ time: '刚刚', title: '骑手已拒单', desc: `原专送骑手因突发路况发起改派申请，调度系统记录风控并触发加急补贴` }]
      : []),
    ...(statusConfig.key === 'reassigning_rider'
      ? [{ time: '刚刚', title: '正在切换骑手', desc: `调度中枢正在重新加码派单 (+¥2.00 调度补贴)，匹配周围最优就近骑手` }]
      : []),
    ...(statusConfig.key === 'refunded'
      ? [{ time: '刚刚', title: '已全额退款', desc: `资金已原路原账户退回，订单履约正式终止归档` }]
      : []),
    {
      time: order?.createdTime || '刚刚',
      title: '支付与提交成功',
      desc: `实付 ¥${(order?.totalAmount ?? 96.0).toFixed(2)}，已自动同步腾讯云并绑定专属单号 #${cleanOrderNo.replace(/^#/, '')}`
    }
  ];

  // Dynamic ETA display
  const isFinished = ['completed', 'merchant_rejected', 'refunded', 'cancelled'].includes(statusConfig.key);
  const remainingMinutes = isFinished
    ? 0
    : statusConfig.key === 'delivering'
    ? 6
    : statusConfig.key === 'picked_up'
    ? 10
    : statusConfig.key === 'waiting_pickup'
    ? 12
    : statusConfig.key === 'rider_heading'
    ? 14
    : statusConfig.key === 'ready'
    ? 16
    : statusConfig.key === 'cooking'
    ? 20
    : 22;

  // Detect dining channel
  const isDineIn = order?.channelType === 'dine_in' || order?.channel === 'dine_in' || !!order?.tableCode;
  const isPickup = order?.channelType === 'pickup' || order?.channel === 'pickup' || !!order?.pickupCode;

  return (
    <div id="order-tracking-container" className="w-full flex justify-center p-0 relative bg-transparent">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-60 bg-[#181816] text-white text-xs sm:text-sm px-4 py-2.5 shadow-2xl flex items-center gap-2 rounded-none border border-white/10"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold">{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Tracking Card */}
      <div
        id="order-tracking-card"
        className="w-full max-w-[430px] bg-white shadow-2xs border border-[#D3D1CB] rounded-none flex flex-col select-none font-sans overflow-hidden p-0 space-y-0"
      >
        {/* 1. Header & ETA Section */}
        <TrackingHeader
          orderId={`#${cleanOrderNo.replace(/^#/, '')}`}
          orderTime={order?.createdTime ? (order.createdTime.length <= 5 ? `${order.createdTime}:12` : order.createdTime) : '12:38:12'}
          title={
            isDineIn
              ? `堂食出餐 · ${order?.tableCode || 'A1'}号桌`
              : isPickup
              ? `到店自提 · 取餐码 #${order?.pickupCode || '8806'}`
              : statusConfig.label
          }
          etaTime={
            isDineIn
              ? '约 5-8 分钟出齐'
              : isPickup
              ? '已入保温柜'
              : order?.estimatedDeliveryTime || '12:55:00'
          }
          remainingMinutes={isDineIn ? 6 : isPickup ? 0 : remainingMinutes}
          onBack={onBackToMenu}
          onToggleNotification={() => showToast('已开启订单状态即时声音与震动提醒')}
        />

        {/* Real-time Payment Security & Electronic Voucher Bar */}
        <div className="px-4 py-2 bg-gradient-to-r from-emerald-50/90 via-[#fbfbfa] to-[#f4f4f2] border-b border-[#e5e5df] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-950 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">
              已实付 ¥{(order?.totalAmount ?? 96.0).toFixed(2)} · 双轨保全已入账
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsVoucherModalOpen(true)}
            className="text-[10.5px] font-bold text-emerald-700 hover:text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-none shadow-2xs transition-all cursor-pointer shrink-0 flex items-center gap-1"
          >
            <span>电子支付凭据</span>
          </button>
        </div>

        {isDineIn ? (
          /* Specialized Dine-In Dish Prep & Serving Tracking Section */
          <DineInTrackingSection
            order={order || {
              id: cleanOrderNo,
              orderNo: cleanOrderNo,
              tableCode: 'A1',
              channelType: 'dine_in',
              channel: 'dine_in',
              totalAmount: 186.0,
              items: trackingDishes?.map((d, i) => ({
                id: `it-${i}`,
                name: d.name,
                quantity: d.count,
                price: d.price / d.count,
                options: d.spec
              })) || []
            } as any}
            onBackToMenu={onBackToMenu}
            showToast={showToast}
          />
        ) : isPickup ? (
          /* Specialized Pickup Dish Packing & Credential Tracking Section */
          <PickupTrackingSection
            order={order || {
              id: cleanOrderNo,
              orderNo: cleanOrderNo,
              pickupCode: '8806',
              pickupShelfCode: '01 号智能保温取餐柜 (65℃恒温)',
              channelType: 'pickup',
              channel: 'pickup',
              totalAmount: 87.0,
              items: trackingDishes?.map((d, i) => ({
                id: `it-${i}`,
                name: d.name,
                quantity: d.count,
                price: d.price / d.count,
                options: d.spec
              })) || []
            } as any}
            onBackToMenu={onBackToMenu}
            showToast={showToast}
          />
        ) : (
          /* Delivery Mode: Live Map & Telemetry, Courier Card, Route Bar, Step Indicator */
          <>
            <TrackingRadarMap
              initialSpeed={statusConfig.key === 'delivering' ? 24 : statusConfig.key === 'rider_heading' ? 18 : 0}
              initialDistanceMeters={statusConfig.key === 'delivering' ? 450 : statusConfig.key === 'waiting_pickup' ? 30 : 150}
              destinationLabel={order?.deliveryAddress?.slice(0, 14) || '大悦城商务座'}
              truckName={order?.truckName || truck?.name || '流动餐车'}
              onSimulate={handleSimulateSpeed}
              isSimulating={isSimulating}
            />

            <TrackingCourierCard
              courier={courierData}
              onContactOnline={() => {
                setIsChatModalOpen(true);
                onContactCourier?.();
              }}
              onCallPhone={() => showToast(`正在呼叫专送骑手 ${courierData.name} (${courierData.phone})`)}
            />

            <TrackingRouteBar
              truckName={order?.truckName || truck?.name || '黑曜石 01 号流动餐车'}
              distanceKm={truck?.distanceKm || 0.85}
              destinationAddress={order?.deliveryAddress || deliveryAddress}
            />

            <TrackingStepIndicator
              currentStatus={order?.status || 'cooking'}
              onSimulateStep={handleStepSelect}
              allowSimulation={isSimulationAllowed}
            />
          </>
        )}

        {/* Food Breakdown Accordion */}
        <TrackingDishesAccordion
          dishes={trackingDishes}
          onCopyBill={handleCopyBill}
          packageFee={isDineIn ? 0.0 : isPickup ? 2.0 : 4.0}
          deliveryFee={0.0}
          discountFee={isDineIn ? 0.0 : 4.0}
          totalAmount={order?.totalAmount ?? (isDineIn ? 186.0 : 96.0)}
        />

        {/* Dispatch Timeline Audit Logs */}
        <TrackingTimelineLogs
          logs={dynamicLogs}
          currentStatusText={statusConfig.label}
        />

        {/* Bottom Helper Links & Actions */}
        <TrackingActionFooter
          onUrgeOrder={() => {
            onUrgeOrder?.();
            showToast(isDineIn ? '已向后厨发送加急催菜提醒' : isPickup ? '已通知餐车吧台加急打包' : '已转接专属人工催单客服与骑手调度专员');
          }}
          onShareTracking={handleShareTracking}
          onRequestCancel={() => setIsCancelModalOpen(true)}
          canCancel={!['completed', 'merchant_rejected', 'refunded', 'cancelled', 'cancel_requested'].includes(statusConfig.key)}
        />
      </div>

      {/* Realistic Real-Time Chat Bubble Interface Modal */}
      <TrackingChatModal
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        courier={courierData}
        order={order}
        orderId={cleanOrderNo}
        deliveryAddress={order?.deliveryAddress || deliveryAddress}
        onCallPhone={() => showToast(`正在呼叫专送骑手 ${courierData.name} (${courierData.phone})`)}
      />

      {/* Customer Cancel / Terminate Order Request Modal */}
      <AnimatePresence>
        {isCancelModalOpen && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-none border border-[#d3d1cb] shadow-2xl overflow-hidden text-xs"
            >
              {/* Header */}
              <div className="p-3.5 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-950 font-bold text-sm">
                  <Ban className="w-4.5 h-4.5 text-rose-600" />
                  <span>申请终止订单 (发起退款)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="text-neutral-400 hover:text-black cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Body */}
              <div className="p-4 space-y-3.5 text-neutral-700">
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-none text-[11px] text-amber-900 leading-relaxed">
                  <strong>温馨提示：</strong> 当前订单已进入【{statusConfig.label}】流程。若餐车主理人已在制作中，主理人将根据食材损耗情况确认审核。
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-neutral-800 text-[11.5px]">选择终止原因：</label>
                  <div className="space-y-1">
                    {[
                      '制作或等待配送时间过长',
                      '送达地址填写错误，需修改重下',
                      '误操作多下 / 菜品规格选错',
                      '临时有外出安排无法取餐',
                      '其他不可抗力原因'
                    ].map((reason) => (
                      <label
                        key={reason}
                        className={`flex items-center gap-2 p-2 rounded-none border cursor-pointer transition-all ${
                          cancelReason === reason
                            ? 'bg-rose-50 border-rose-300 text-rose-950 font-medium'
                            : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100'
                        }`}
                      >
                        <input
                          type="radio"
                          name="cancel_reason"
                          checked={cancelReason === reason}
                          onChange={() => setCancelReason(reason)}
                          className="accent-rose-600"
                        />
                        <span className="text-[11px]">{reason}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-neutral-800 text-[11.5px]">补充说明 (选填)：</label>
                  <textarea
                    rows={2}
                    value={cancelNote}
                    onChange={(e) => setCancelNote(e.target.value)}
                    placeholder="请输入详细诉求，主理人将加急跟进处理..."
                    className="w-full p-2 border border-neutral-300 rounded-none text-xs resize-none outline-none focus:border-black"
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-3 bg-neutral-50 border-t border-neutral-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="px-3 py-1.5 rounded-none border border-neutral-300 hover:bg-neutral-100 text-neutral-700 font-semibold cursor-pointer"
                >
                  暂不取消
                </button>
                <button
                  type="button"
                  onClick={handleSubmitCancelRequest}
                  className="px-4 py-1.5 rounded-none bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer shadow-xs"
                >
                  确认提交申请
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Electronic Payment Voucher Inspection Modal */}
      <ElectronicPaymentVoucherModal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        voucher={paymentVoucher}
        onReprintPrintReceipt={() => {
          showToast('已将防伪凭据推送到餐车热敏小票机');
        }}
      />
    </div>
  );
};
