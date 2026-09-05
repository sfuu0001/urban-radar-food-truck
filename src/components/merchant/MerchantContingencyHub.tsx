import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Zap,
  Bike,
  Flame,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Phone,
  RefreshCw,
  Sparkles,
  Search,
  Lock,
  Unlock,
  Store,
  DollarSign,
  FileText,
  AlertCircle,
  Camera,
  MessageSquare
} from 'lucide-react';
import { Order, OrderAnomalyRecord, RiderRejectionRecord } from '../../types';

interface MerchantContingencyHubProps {
  orders: Order[];
  onAdvanceOrderStatus: (orderId: string, targetStatus?: Order['status'], extraDetails?: Partial<Order>) => void;
  onAuditRefund?: (orderId: string, approved: boolean, rejectReason?: string) => void;
  showToast: (msg: string) => void;
}

export const MerchantContingencyHub: React.FC<MerchantContingencyHubProps> = ({
  orders,
  onAdvanceOrderStatus,
  onAuditRefund,
  showToast
}) => {
  const [activeNodeTab, setActiveNodeTab] = useState<'all' | 'unaccepted' | 'cooking' | 'rider_rejection' | 'transit' | 'refund'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fallback Action Modal State
  const [activeActionModal, setActiveActionModal] = useState<{
    type: 're_dispatch_bonus' | 'self_delivery' | 'turn_pickup' | 'remake_delay' | 'force_deliver_photo' | 'partial_refund';
    order: Order;
  } | null>(null);

  const [bonusAmount, setBonusAmount] = useState<number>(3.0);
  const [remakeReason, setRemakeReason] = useState<string>('果木炭火火候过猛导致肉串焦化，主厨已重新下炉烤制');
  const [partialRefundRatio, setPartialRefundRatio] = useState<number>(50);

  // Compute Anomaly Metrics across nodes
  const unacceptedOrders = orders.filter((o) => o.status === 'pending' || (o.stepIndex === 0 && !o.merchantAccepted));
  const cookingDelayOrders = orders.filter((o) => o.status === 'cooking' && (o.etaMinutes > 20 || o.stepIndex === 1));
  const riderRejectedOrders = orders.filter((o) => (o.rejectionCount && o.rejectionCount > 0) || o.isEscalatedToMerchant || (o.status === 'ready' && !o.riderAccepted));
  const transitIssueOrders = orders.filter((o) => o.status === 'delivering' && o.anomalies && o.anomalies.length > 0);
  const refundDisputeOrders = orders.filter((o) => o.refundStatus === 'pending' || o.status === 'refund_pending');

  const allAnomalyCount =
    unacceptedOrders.length +
    cookingDelayOrders.length +
    riderRejectedOrders.length +
    transitIssueOrders.length +
    refundDisputeOrders.length;

  const filteredOrders = orders.filter((o) => {
    if (activeNodeTab === 'unaccepted') return o.status === 'pending' || (o.stepIndex === 0 && !o.merchantAccepted);
    if (activeNodeTab === 'cooking') return o.status === 'cooking';
    if (activeNodeTab === 'rider_rejection') return (o.rejectionCount && o.rejectionCount > 0) || o.isEscalatedToMerchant || (o.status === 'ready' && !o.riderAccepted);
    if (activeNodeTab === 'transit') return o.status === 'delivering';
    if (activeNodeTab === 'refund') return o.refundStatus === 'pending' || o.status === 'refund_pending';
    
    // 'all' shows orders with any potential contingency or active lifecycle state
    return true;
  }).filter((o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.orderNo.toLowerCase().includes(q) ||
      o.deliveryAddress.toLowerCase().includes(q) ||
      (o.customerName && o.customerName.toLowerCase().includes(q)) ||
      (o.courierName && o.courierName.toLowerCase().includes(q))
    );
  });

  // Action Handlers
  const handleExecuteReDispatchBonus = (order: Order) => {
    const newBounty = (order.deliveryBounty || 0) + bonusAmount;
    onAdvanceOrderStatus(order.orderNo || order.id, 'ready', {
      status: 'ready',
      stepIndex: 2,
      deliveryBounty: newBounty,
      isEscalatedToMerchant: false,
      statusText: `调度赏金已加码 +¥${newBounty.toFixed(1)}，已再次广播周边骑手`,
      auditLogs: [
        ...(order.auditLogs || []),
        {
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          operator: '餐车调度中枢',
          role: 'merchant',
          action: '加码转派赏金',
          note: `骑手拒接后触发加码调度，追加 +¥${bonusAmount.toFixed(1)} 专送赏金，当前总补贴 ¥${newBounty.toFixed(1)}`
        }
      ]
    });
    showToast(`工单 #${order.orderNo} 已追加 ¥${bonusAmount.toFixed(1)} 加急赏金并重新广播至骑手抢单池！`);
    setActiveActionModal(null);
  };

  const handleExecuteMerchantSelfDelivery = (order: Order) => {
    onAdvanceOrderStatus(order.orderNo || order.id, 'delivering', {
      status: 'delivering',
      stepIndex: 3,
      isMerchantSelfDelivery: true,
      courierName: '餐车主理人专属直送 (车长代送)',
      courierPhone: '021-8899-0110',
      statusText: '餐车主理人已启动兜底自送，正在直达您的地址',
      progressPercent: 75,
      auditLogs: [
        ...(order.auditLogs || []),
        {
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          operator: '餐车主理人',
          role: 'merchant',
          action: '启动主理人直送',
          note: '触发运力短缺兜底预案，主理人接管配送，保障 15 分钟内锁鲜妥投'
        }
      ]
    });
    showToast(`工单 #${order.orderNo} 已切换为【主理人专属自送】，配送状态已推进并同步客户端！`);
    setActiveActionModal(null);
  };

  const handleExecuteTurnToPickup = (order: Order) => {
    const refundFee = 6.0;
    onAdvanceOrderStatus(order.orderNo || order.id, 'ready', {
      channelType: 'pickup',
      status: 'ready',
      stepIndex: 2,
      statusText: '已协商转为餐车自提，已原路退回运费 ¥6.00',
      totalAmount: Math.max(0, order.totalAmount - refundFee),
      auditLogs: [
        ...(order.auditLogs || []),
        {
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          operator: '餐车店长',
          role: 'merchant',
          action: '转为到车自提',
          note: `与顾客协商成功，已扣减并退还配送费包装费 ¥${refundFee.toFixed(2)}，餐品移至 01 号保温取餐格`
        }
      ]
    });
    showToast(`工单 #${order.orderNo} 已转为【到车自提】，已退还配送费 ¥${refundFee.toFixed(2)}！`);
    setActiveActionModal(null);
  };

  const handleExecuteRemakeDelay = (order: Order) => {
    onAdvanceOrderStatus(order.orderNo || order.id, 'cooking', {
      status: 'cooking',
      stepIndex: 1,
      etaMinutes: (order.etaMinutes || 12) + 8,
      statusText: '餐车主厨加急重制中（已发放 500 延误积分）',
      auditLogs: [
        ...(order.auditLogs || []),
        {
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          operator: '后厨 KDS 主管',
          role: 'merchant',
          action: '重做报备与延误补偿',
          note: `原因：${remakeReason}。系统已顺延送达时间 8 分钟并推送顾客补偿 500 积分`
        }
      ]
    });
    showToast(`已提交工单 #${order.orderNo} 重制报备，已顺延送达时间并赠送顾客延误补贴！`);
    setActiveActionModal(null);
  };

  const handleExecuteForceDeliverPhoto = (order: Order) => {
    onAdvanceOrderStatus(order.orderNo || order.id, 'completed', {
      status: 'completed',
      stepIndex: 4,
      progressPercent: 100,
      statusText: '已由商家核验拍照妥投存证',
      auditLogs: [
        ...(order.auditLogs || []),
        {
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          operator: '履约风控审核员',
          role: 'merchant',
          action: '安全妥投审核归档',
          note: '骑手已上传写字楼前台/门卫存证照片，风控审核通过，工单闭环归档'
        }
      ]
    });
    showToast(`工单 #${order.orderNo} 妥投审核通过，状态推进至【已完成】并归档！`);
    setActiveActionModal(null);
  };

  return (
    <div className="space-y-3.5 text-xs">
      {/* 1. Header Overview Banner */}
      <div className="bg-white p-3.5 rounded-[3px] border border-[#e6e6e4] space-y-2.5 shadow-2xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[3px] bg-[#eb5757] text-white flex items-center justify-center shadow-xs">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#37352f] flex items-center gap-2">
                <span>全链路突发情况兜底与审核中枢</span>
                <span className="text-[10.5px] font-mono font-bold bg-[#fdf2f2] text-[#eb5757] border border-[#f8d7da] px-1.5 py-0.2 rounded">
                  异常监控中 ({allAnomalyCount} 项待把控)
                </span>
              </h3>
              <p className="text-[11px] text-[#787774]">
                覆盖下单、后厨制作、骑手拒单、在途受阻、退单仲裁全节点，杜绝死锁与卡单，确保状态机安全流转
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#9b9a97] absolute left-2 top-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索单号 / 地址 / 骑手..."
                className="pl-7 pr-2.5 py-1 bg-[#fbfbfa] border border-[#d3d1cb] rounded-[3px] text-xs focus:outline-none focus:border-[#37352f] w-48"
              />
            </div>
          </div>
        </div>

        {/* Node Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pt-1 border-t border-[#f1f1ef]">
          {[
            { id: 'all', label: '全链路监控', count: orders.length, icon: ShieldAlert },
            { id: 'unaccepted', label: '1. 接单超时兜底', count: unacceptedOrders.length, icon: Clock },
            { id: 'cooking', label: '2. 后厨重制/超时', count: cookingDelayOrders.length, icon: Flame },
            { id: 'rider_rejection', label: '3. 骑手拒接/二次调度', count: riderRejectedOrders.length, icon: Bike },
            { id: 'transit', label: '4. 配送在途异常', count: transitIssueOrders.length, icon: AlertTriangle },
            { id: 'refund', label: '5. 售后退款仲裁', count: refundDisputeOrders.length, icon: DollarSign }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeNodeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveNodeTab(tab.id as any)}
                className={`px-2.5 py-1 rounded-[3px] font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  isActive
                    ? 'bg-[#37352f] text-white shadow-xs'
                    : 'bg-[#f1f1ef] text-[#5a5854] hover:bg-[#e8e8e6]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <span className={`text-[10px] font-mono px-1 rounded-[2px] ${
                  isActive ? 'bg-white/20 text-white' : 'bg-[#e6e6e4] text-[#787774]'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Order Contingency Workflows Cards */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-[3px] p-12 text-center border border-[#e6e6e4] space-y-2">
            <CheckCircle2 className="w-10 h-10 text-[#4dab63] mx-auto" />
            <h4 className="font-bold text-sm text-[#37352f]">当前节点运行平稳</h4>
            <p className="text-xs text-[#787774]">所有工单均在规范状态机内正常推进，未发生卡单或异常阻塞</p>
          </div>
        ) : (
          filteredOrders.map((order, idx) => {
            const hasRejections = (order.rejectionCount && order.rejectionCount > 0) || (order.rejectionRecords && order.rejectionRecords.length > 0);
            const isRefundPending = order.refundStatus === 'pending' || order.status === 'refund_pending';
            const isPendingAccept = order.status === 'pending' || (!order.merchantAccepted && order.stepIndex === 0);

            return (
              <div
                key={`contingency-ord-${order.id || order.orderNo || idx}-${idx}`}
                className="bg-white rounded-[3px] border border-[#e6e6e4] p-3.5 space-y-3 shadow-2xs hover:border-[#b8b6af] transition-all"
              >
                {/* Header: Order Meta + Status Badges */}
                <div className="flex items-center justify-between border-b border-[#f1f1ef] pb-2.5 flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-xs bg-[#37352f] text-white px-2 py-0.5 rounded-[2px]">
                      #{order.orderNo.replace(/^#/, '')}
                    </span>
                    <span className="text-xs font-bold text-[#37352f]">
                      {order.customerName || '先锋食客'}
                    </span>
                    <span className="font-mono text-[11px] text-[#787774]">
                      {order.userPhone || '138-****-9201'}
                    </span>
                    <span className="text-[10.5px] font-mono bg-[#f0f4f8] text-[#1c5598] px-1.5 py-0.2 rounded border border-[#c4d6ec]">
                      {order.channelType === 'dine_in' ? '堂食' : order.channelType === 'pickup' ? '自提' : '专送外卖'}
                    </span>

                    {/* Status Pill */}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      isRefundPending
                        ? 'bg-[#fef2f2] text-[#9c2b2e] border-[#f8d7da]'
                        : order.status === 'delivering'
                        ? 'bg-[#edf3ec] text-[#2b593f] border-[#c4dcbc]'
                        : order.status === 'cooking'
                        ? 'bg-[#fbf3db] text-[#8f6412] border-[#ecd9a8]'
                        : 'bg-[#f1f1ef] text-[#5a5854] border-[#d3d1cb]'
                    }`}>
                      当前节点: {order.statusText || order.status} (阶段 {order.stepIndex ?? 1}/4)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#787774]">订单总额:</span>
                    <span className="font-mono font-bold text-sm text-[#37352f]">
                      ¥{Number(order.totalAmount || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Exception / Risk Callout Box */}
                {hasRejections && (
                  <div className="p-2.5 bg-[#fef2f2] border border-[#f8d7da] rounded-[3px] text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-[#9c2b2e]">
                      <span className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-[#eb5757]" />
                        <span>触发骑手拒单风控预警（已拒单 {order.rejectionCount || 1} 次）</span>
                      </span>
                      <span className="text-[10.5px] font-mono bg-[#eb5757]/15 px-1.5 py-0.2 rounded font-bold">
                        系统已启动二次加权转派
                      </span>
                    </div>
                    <p className="text-[11px] text-[#787774]">
                      <strong>最后拒接事由：</strong>
                      {order.lastRejectionReason || '超出配送极限半径 (>5km)，已自动追加 +¥2.00 调度加急赏金重新广播周边骑手'}
                    </p>
                  </div>
                )}

                {isRefundPending && (
                  <div className="p-2.5 bg-[#fff8e6] border border-[#ffe082] rounded-[3px] text-xs space-y-1">
                    <div className="flex items-center justify-between text-[#856404] font-bold">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-[#d9730d]" />
                        <span>顾客发起售后退款申请（审核中）</span>
                      </span>
                      <span className="text-[10px] font-mono text-[#856404]">申请时间: {order.refundAppliedAt || '刚刚'}</span>
                    </div>
                    <p className="text-[11px] text-[#787774]">
                      <strong>退单申请原因：</strong>{order.refundReason || '临时有事 / 行程变更'} {order.refundFeedback ? `· 说明: ${order.refundFeedback}` : ''}
                    </p>
                  </div>
                )}

                {/* Items & Address Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs bg-[#fbfbfa] p-2.5 rounded-[3px] border border-[#e6e6e4]">
                  <div className="space-y-1">
                    <span className="font-bold text-[#37352f]">包含餐品:</span>
                    <p className="text-[11px] text-[#5a5854]">
                      {order.items.map((i) => `${i.name} x${i.quantity}`).join('，')}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-bold text-[#37352f]">配送地址:</span>
                    <p className="text-[11px] text-[#5a5854] truncate">{order.deliveryAddress || '餐车现场取餐'}</p>
                    {order.courierName && (
                      <p className="text-[10.5px] text-[#787774]">
                        承运骑手: {order.courierName} ({order.courierPhone || '专线保密'})
                      </p>
                    )}
                  </div>
                </div>

                {/* Audit Trail Logs */}
                {order.auditLogs && order.auditLogs.length > 0 && (
                  <div className="bg-[#f7f7f5] p-2 rounded-[3px] border border-[#e6e6e4] text-[11px] space-y-1">
                    <span className="font-bold text-[#787774] block">🛡️ 权威防篡改流转存证:</span>
                    <div className="space-y-0.5 max-h-20 overflow-y-auto font-mono text-[10.5px]">
                      {order.auditLogs.map((log, lIdx) => (
                        <div key={lIdx} className="text-[#5a5854] flex items-center gap-2">
                          <span className="text-[#9b9a97]">{log.time}</span>
                          <span className="font-bold text-[#37352f]">[{log.operator}]</span>
                          <span>{log.action}</span>
                          {log.note && <span className="text-[#787774]">({log.note})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Comprehensive Fallback Contingency Action Bar */}
                <div className="border-t border-[#f1f1ef] pt-2.5 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-[#787774]">突发情况兜底工具箱:</span>

                    {/* Button 1: Re-dispatch with Bonus */}
                    <button
                      type="button"
                      onClick={() => setActiveActionModal({ type: 're_dispatch_bonus', order })}
                      className="px-2.5 py-1 bg-[#fff8e6] hover:bg-[#ffe082] text-[#856404] border border-[#ffe082] rounded-[3px] font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                      title="追加加急调度赏金重新广播给周边骑手"
                    >
                      <Zap className="w-3.5 h-3.5 text-[#d9730d]" />
                      <span>加码转派 (+¥3.0)</span>
                    </button>

                    {/* Button 2: Switch to Merchant Self Delivery */}
                    <button
                      type="button"
                      onClick={() => setActiveActionModal({ type: 'self_delivery', order })}
                      className="px-2.5 py-1 bg-[#edf3ec] hover:bg-[#c4dcbc] text-[#2b593f] border border-[#c4dcbc] rounded-[3px] font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                      title="餐车主理人亲自接管配送"
                    >
                      <Store className="w-3.5 h-3.5 text-[#2b593f]" />
                      <span>主理人兜底直送</span>
                    </button>

                    {/* Button 3: Convert to Pickup */}
                    <button
                      type="button"
                      onClick={() => setActiveActionModal({ type: 'turn_pickup', order })}
                      className="px-2.5 py-1 bg-[#f0f4f8] hover:bg-[#c4d6ec] text-[#1c5598] border border-[#c4d6ec] rounded-[3px] font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                      title="与顾客协商转为现场自提并退配送费"
                    >
                      <Flame className="w-3.5 h-3.5 text-[#1c5598]" />
                      <span>转自提退运费</span>
                    </button>

                    {/* Button 4: Cooking Remake & Delay */}
                    <button
                      type="button"
                      onClick={() => setActiveActionModal({ type: 'remake_delay', order })}
                      className="px-2.5 py-1 bg-[#f7f7f5] hover:bg-[#e8e8e6] text-[#37352f] border border-[#d3d1cb] rounded-[3px] font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                      title="后厨烤焦重做或延误报备"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-[#d9730d]" />
                      <span>烤焦重做/延误</span>
                    </button>

                    {/* Button 5: Force Delivery Archive */}
                    <button
                      type="button"
                      onClick={() => setActiveActionModal({ type: 'force_deliver_photo', order })}
                      className="px-2.5 py-1 bg-[#f7f7f5] hover:bg-[#e8e8e6] text-[#37352f] border border-[#d3d1cb] rounded-[3px] font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                      title="物业拍照存证审核妥投"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#4dab63]" />
                      <span>存证妥投归档</span>
                    </button>
                  </div>

                  {/* Standard Direct Stage Mutation for Merchant Only */}
                  <div className="flex items-center gap-1.5">
                    {isPendingAccept && (
                      <button
                        type="button"
                        onClick={() => {
                          onAdvanceOrderStatus(order.orderNo || order.id, 'cooking', {
                            merchantAccepted: true,
                            stepIndex: 1,
                            status: 'cooking',
                            statusText: '后厨现制制作中',
                            progressPercent: 35
                          });
                          showToast(`已接单 #${order.orderNo}，进入制作环节！`);
                        }}
                        className="px-3 py-1 bg-[#2b593f] hover:bg-[#204430] text-white rounded-[3px] font-bold text-xs cursor-pointer shadow-2xs"
                      >
                        权威接单
                      </button>
                    )}

                    {order.status === 'cooking' && (
                      <button
                        type="button"
                        onClick={() => {
                          onAdvanceOrderStatus(order.orderNo || order.id, 'ready', {
                            status: 'ready',
                            stepIndex: 2,
                            statusText: '出餐完毕，待骑手/顾客取餐',
                            progressPercent: 60
                          });
                          showToast(`工单 #${order.orderNo} 已标记为【出餐待取】！`);
                        }}
                        className="px-3 py-1 bg-[#37352f] hover:bg-[#201f1d] text-white rounded-[3px] font-bold text-xs cursor-pointer shadow-2xs"
                      >
                        出餐完毕 (推进至待取)
                      </button>
                    )}

                    {order.status === 'ready' && (
                      <button
                        type="button"
                        onClick={() => {
                          onAdvanceOrderStatus(order.orderNo || order.id, 'delivering', {
                            status: 'delivering',
                            stepIndex: 3,
                            statusText: '骑手已取餐，专线极速配送中',
                            progressPercent: 80
                          });
                          showToast(`工单 #${order.orderNo} 推进至【配送中】！`);
                        }}
                        className="px-3 py-1 bg-[#37352f] hover:bg-[#201f1d] text-white rounded-[3px] font-bold text-xs cursor-pointer shadow-2xs"
                      >
                        确认已取餐 (推进至配送)
                      </button>
                    )}

                    {order.status === 'delivering' && (
                      <button
                        type="button"
                        onClick={() => {
                          onAdvanceOrderStatus(order.orderNo || order.id, 'completed', {
                            status: 'completed',
                            stepIndex: 4,
                            progressPercent: 100,
                            statusText: '餐品已妥投完成'
                          });
                          showToast(`工单 #${order.orderNo} 推进至【已送达完成】！`);
                        }}
                        className="px-3 py-1 bg-[#2b593f] hover:bg-[#204430] text-white rounded-[3px] font-bold text-xs cursor-pointer shadow-2xs"
                      >
                        完成妥投 (推进至终态)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Action Fallback Dialog Modals */}
      {activeActionModal && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white text-[#37352f] w-full max-w-md rounded-[6px] border border-[#d3d1cb] shadow-2xl p-4 space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#e6e6e4] pb-2">
              <span className="font-bold text-sm text-[#37352f] flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-[#eb5757]" />
                <span>突发异常兜底措施审批</span>
              </span>
              <button
                type="button"
                onClick={() => setActiveActionModal(null)}
                className="text-[#787774] hover:text-[#37352f]"
              >
                ✕
              </button>
            </div>

            {/* Type Specific Form Inputs */}
            {activeActionModal.type === 're_dispatch_bonus' && (
              <div className="space-y-2.5 text-xs">
                <p className="text-[#5a5854]">
                  当前工单 <strong>#{activeActionModal.order.orderNo}</strong> 遭遇骑手拒单或暂无接单。追加调度补贴可极速激活周边高意愿骑手。
                </p>
                <div className="space-y-1">
                  <span className="font-bold text-[#787774]">加码平台调度赏金:</span>
                  <div className="flex items-center gap-2">
                    {[2.0, 3.0, 5.0, 8.0].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setBonusAmount(amt)}
                        className={`px-3 py-1 rounded-[3px] border font-bold ${
                          bonusAmount === amt
                            ? 'bg-[#37352f] text-white border-[#37352f]'
                            : 'bg-[#f7f7f5] text-[#5a5854] border-[#d3d1cb]'
                        }`}
                      >
                        +¥{amt.toFixed(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-2 bg-[#f0f9ff] border border-[#bae6fd] rounded-[3px] text-[11px] text-[#0369a1]">
                  💡 审批确认后，工单将带加权标签重新推送到骑手抢单池第一顺位。
                </div>
              </div>
            )}

            {activeActionModal.type === 'self_delivery' && (
              <div className="space-y-2 text-xs">
                <p className="text-[#5a5854]">
                  确认启动 <strong>【餐车主理人专属自送】</strong> 模式？系统将把承运骑手变更为餐车车长，直接将状态推进至配送中。
                </p>
                <div className="p-2 bg-[#edf3ec] border border-[#c4dcbc] rounded-[3px] text-[11px] text-[#2b593f]">
                  ⚡ 适用场景：周边 1km 内高端大单、或运力极端紧张时保障客户体验。
                </div>
              </div>
            )}

            {activeActionModal.type === 'turn_pickup' && (
              <div className="space-y-2 text-xs">
                <p className="text-[#5a5854]">
                  确认将外卖订单 <strong>#{activeActionModal.order.orderNo}</strong> 协商转为 <strong>【到车自提】</strong>？
                </p>
                <p className="text-[11px] text-[#787774]">
                  系统将自动退还配送费与包装费（¥6.00），餐品移入餐车恒温取餐格，并向顾客发送取餐码。
                </p>
              </div>
            )}

            {activeActionModal.type === 'remake_delay' && (
              <div className="space-y-2 text-xs">
                <span className="font-bold text-[#787774]">重做与延误说明 (将同步后厨与顾客):</span>
                <input
                  type="text"
                  value={remakeReason}
                  onChange={(e) => setRemakeReason(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#f7f7f5] border border-[#d3d1cb] rounded-[3px] text-xs focus:outline-none"
                />
                <p className="text-[11px] text-[#787774]">
                  将自动为预计送达时间顺延 8 分钟，并向顾客赠送 500 积分以提升满意度。
                </p>
              </div>
            )}

            {activeActionModal.type === 'force_deliver_photo' && (
              <div className="space-y-2 text-xs">
                <p className="text-[#5a5854]">
                  已核验骑手送达照片/写字楼前台存证。确认执行安全妥投，结束配送并将订单推进至【已送达完成】终态？
                </p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e6e6e4]">
              <button
                type="button"
                onClick={() => setActiveActionModal(null)}
                className="px-3 py-1.5 rounded-[3px] border border-[#d3d1cb] text-xs font-semibold text-[#5a5854] hover:bg-[#efefed]"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  if (activeActionModal.type === 're_dispatch_bonus') handleExecuteReDispatchBonus(activeActionModal.order);
                  if (activeActionModal.type === 'self_delivery') handleExecuteMerchantSelfDelivery(activeActionModal.order);
                  if (activeActionModal.type === 'turn_pickup') handleExecuteTurnToPickup(activeActionModal.order);
                  if (activeActionModal.type === 'remake_delay') handleExecuteRemakeDelay(activeActionModal.order);
                  if (activeActionModal.type === 'force_deliver_photo') handleExecuteForceDeliverPhoto(activeActionModal.order);
                }}
                className="px-4 py-1.5 rounded-[3px] bg-[#37352f] hover:bg-[#201f1d] text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                确认执行兜底
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
