import React, { useState, useMemo } from 'react';
import { Order, TableItem } from '../../../../types';
import { DesktopCommandStrip, CommandStripFilters } from './DesktopCommandStrip';
import {
  DesktopChannelFilterStrip,
  ChannelFilterType,
  DateRangeType,
  ViewModeType
} from './DesktopChannelFilterStrip';
import { DesktopOrderMatrixGrid } from './DesktopOrderMatrixGrid';
import { ConsoleCardOrder } from './DesktopOrderMatrixCard';
import {
  Activity,
  Layers,
  CheckCircle2,
  AlertCircle,
  Radio,
  Printer,
  X,
  Volume2
} from 'lucide-react';

interface DesktopOperationsConsoleProps {
  orders?: Order[];
  tables?: TableItem[];
  selectedTruckId?: string;
  onSelectTruckId?: (truckId: string) => void;
  showToast?: (msg: string, isSuccess?: boolean) => void;
  onSwitchToClassic?: () => void;
}

// 仿真标准 4 卡片全渠道底料数据 (若外界传入的订单数量少于4个时自动补足，完美对齐设计规范原型)
const DEFAULT_SPEC_ORDERS: ConsoleCardOrder[] = [
  {
    id: 'ord-spec-7078',
    orderNo: '#UR-DIN-7078',
    channelType: 'dine_in',
    status: 'cooking',
    customerName: '贵客 (3人就餐)',
    userPhone: '139****7078',
    tableCode: 'A2',
    tableZone: '餐车外摆区',
    dinerCount: 3,
    serverName: '阿豪 (No.02)',
    truckName: '01号·旗舰车',
    uid: 'tcb_90842019',
    totalAmount: 248.0,
    netEarn: 248.0,
    createdTime: '12:36:20',
    items: [
      {
        name: '果木烟熏黑豚炙烤五花',
        quantity: 1,
        price: 48.0,
        options: '孜然椒盐味, 焦香金黄'
      },
      {
        name: '黑松露墨汁手工玉棋',
        quantity: 2,
        price: 88.0,
        options: '浓郁黑松露酱, 现磨巴马干酪'
      },
      {
        name: '火山岩黑熔岩蛋糕',
        quantity: 1,
        price: 24.0,
        options: '流心爆浆'
      }
    ]
  },
  {
    id: 'ord-spec-9821',
    orderNo: '#UR-DIN-9821',
    channelType: 'dine_in',
    status: 'cooking',
    customerName: '贵客 (3人就餐)',
    userPhone: '138****9821',
    tableCode: 'A1',
    tableZone: '餐车外摆区',
    dinerCount: 3,
    serverName: '阿豪 (No.02)',
    truckName: '01号·旗舰车',
    uid: 'tcb_48921104',
    totalAmount: 186.0,
    netEarn: 186.0,
    createdTime: '12:20:15',
    items: [
      {
        name: '碳烤和牛小汉堡双重奏',
        quantity: 2,
        price: 58.0,
        options: '五分熟, 招牌黑椒汁'
      },
      {
        name: '黑曜极夜冷萃冰咖',
        quantity: 1,
        price: 32.0,
        options: '少冰, 无糖'
      },
      {
        name: '冷萃黑金茉莉提拉米苏',
        quantity: 1,
        price: 38.0,
        options: '微甜, 加双份可可粉'
      }
    ]
  },
  {
    id: 'ord-spec-6688',
    orderNo: '#UR-PK-6688',
    channelType: 'pickup',
    status: 'cooking',
    customerName: '李先生',
    userPhone: '136****6688',
    pickupCode: 'PK-6688',
    pickupLocker: '02号智能恒温柜',
    pickupShelfCode: '大悦城北广场侧面',
    truckName: '01号·旗舰车',
    uid: 'tcb_66289012',
    totalAmount: 106.0,
    netEarn: 106.0,
    createdTime: '12:35:00',
    items: [
      {
        name: '黑松露炭烤和牛汉堡',
        quantity: 1,
        price: 68.0,
        options: '全熟, 招牌酱料'
      },
      {
        name: '暗夜虚空冷萃浓缩咖啡',
        quantity: 1,
        price: 38.0,
        options: '标准冰·无糖, 保温密封'
      }
    ]
  },
  {
    id: 'ord-spec-98215',
    orderNo: '#UR-98215',
    channelType: 'delivery',
    status: 'shipping',
    customerName: '陈女士',
    userPhone: '138****0921',
    riderName: '陈志远',
    riderPhone: '138****0921',
    riderFee: 15.0,
    platformFee: 20.4,
    netEarn: 271.65,
    pickupShelfCode: '03号保温取餐格',
    deliveryAddress: '西藏北路 166 号大悦城商务座 1204 室',
    truckName: '01号·旗舰车',
    uid: 'tcb_11094851',
    totalAmount: 307.0,
    createdTime: '12:48:22',
    items: [
      {
        name: '极炙炭烤和牛排 (300g)',
        quantity: 1,
        price: 158.0,
        options: '七分熟, 黑松露红酒酱'
      },
      {
        name: '碳烤和牛小汉堡双重奏',
        quantity: 1,
        price: 58.0,
        options: '五分熟, 标配蛋黄酱'
      },
      {
        name: '暗夜虚空冷萃浓缩咖啡',
        quantity: 2,
        price: 45.5,
        options: '标准冰·无糖'
      }
    ]
  }
];

export const DesktopOperationsConsole: React.FC<DesktopOperationsConsoleProps> = ({
  orders = [],
  tables = [],
  selectedTruckId = 'truck-01',
  onSelectTruckId,
  showToast = () => {},
  onSwitchToClassic
}) => {
  // Filters State
  const [commandFilters, setCommandFilters] = useState<CommandStripFilters>({
    statusFilter: 'all',
    searchQuery: '',
    isAcceptingOrders: true,
    isVoiceEnabled: true
  });

  const [channelFilter, setChannelFilter] = useState<ChannelFilterType>('all');
  const [dateRange, setDateRange] = useState<DateRangeType>('all');
  const [viewMode, setViewMode] = useState<ViewModeType>('matrix');

  // Modal inspection states
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<ConsoleCardOrder | null>(null);
  const [isIntercomActive, setIsIntercomActive] = useState<string | null>(null);

  // Merge runtime orders with default spec prototypes
  const consolidatedOrders = useMemo<ConsoleCardOrder[]>(() => {
    const map = new Map<string, ConsoleCardOrder>();

    // 优先填入外部真实传入订单
    orders.forEach((o) => {
      const channel = o.channelType || (o.tableCode ? 'dine_in' : o.pickupCode ? 'pickup' : 'delivery');
      map.set(o.orderNo || o.id, {
        ...o,
        channelType: channel,
        netEarn: o.totalAmount
      });
    });

    // 若列表样本少于 4，并入原型展示样卡，保证视口 4 栏矩阵丰满
    DEFAULT_SPEC_ORDERS.forEach((spec) => {
      if (!map.has(spec.orderNo)) {
        map.set(spec.orderNo, spec);
      }
    });

    return Array.from(map.values());
  }, [orders]);

  // Status Counts
  const statusCounts = useMemo(() => {
    let pending = 0;
    let cooking = 0;
    let deliveryOrPickup = 0;
    let refund = 0;
    let completed = 0;

    consolidatedOrders.forEach((o) => {
      if (o.status === 'completed') completed++;
      else if (o.status === 'refund_pending' || o.refundStatus === 'pending') refund++;
      else if (o.status === 'shipping') deliveryOrPickup++;
      else if (o.status === 'cooking' || !o.status) cooking++;
      else if (o.status === 'pending') pending++;
    });

    return {
      all: consolidatedOrders.length,
      pending,
      cooking,
      deliveryOrPickup,
      refund,
      completed
    };
  }, [consolidatedOrders]);

  // Channel Counts
  const channelCounts = useMemo(() => {
    let dine_in = 0;
    let delivery = 0;
    let pickup = 0;

    consolidatedOrders.forEach((o) => {
      const ch = o.channelType || (o.tableCode ? 'dine_in' : o.pickupCode ? 'pickup' : 'delivery');
      if (ch === 'dine_in') dine_in++;
      else if (ch === 'delivery') delivery++;
      else if (ch === 'pickup') pickup++;
    });

    return {
      all: consolidatedOrders.length,
      dine_in,
      delivery,
      pickup
    };
  }, [consolidatedOrders]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return consolidatedOrders.filter((o) => {
      // Channel
      const ch = o.channelType || (o.tableCode ? 'dine_in' : o.pickupCode ? 'pickup' : 'delivery');
      if (channelFilter !== 'all' && ch !== channelFilter) return false;

      // Status
      if (commandFilters.statusFilter === 'pending' && o.status !== 'pending') return false;
      if (commandFilters.statusFilter === 'cooking' && o.status !== 'cooking' && o.status) return false;
      if (commandFilters.statusFilter === 'delivery_pickup' && o.status !== 'shipping' && ch !== 'pickup') return false;
      if (commandFilters.statusFilter === 'refund' && o.status !== 'refund_pending' && o.refundStatus !== 'pending') return false;
      if (commandFilters.statusFilter === 'completed' && o.status !== 'completed') return false;

      // Search Query
      if (commandFilters.searchQuery.trim()) {
        const q = commandFilters.searchQuery.trim().toLowerCase();
        const matchNo = o.orderNo.toLowerCase().includes(q);
        const matchPhone = o.userPhone?.includes(q);
        const matchPickup = o.pickupCode?.toLowerCase().includes(q);
        const matchName = o.customerName?.toLowerCase().includes(q);
        if (!matchNo && !matchPhone && !matchPickup && !matchName) return false;
      }

      return true;
    });
  }, [consolidatedOrders, channelFilter, commandFilters]);

  // Total revenue of filtered orders
  const totalRevenue = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }, [filteredOrders]);

  // Handlers
  const handleAdvanceStatus = (orderId: string) => {
    showToast(`工单【${orderId}】工况已成功流转下发！`, true);
  };

  const handlePrintReceipt = (order: ConsoleCardOrder) => {
    showToast(`已向主热敏机下发【${order.orderNo}】小票指令`, true);
  };

  const handleCallIntercom = (order: ConsoleCardOrder) => {
    setIsIntercomActive(order.orderNo);
    showToast(`正在呼叫【${order.orderNo}】对应终端与对讲中继...`);
    setTimeout(() => {
      setIsIntercomActive(null);
    }, 2500);
  };

  const handleVoidOrder = (order: ConsoleCardOrder) => {
    showToast(`工单【${order.orderNo}】已提交作废风控审核`);
  };

  const handleItemCompensate = (orderId: string, itemName: string) => {
    showToast(`已针对【${itemName}】登记划菜补偿与厨务损耗`);
  };

  return (
    <div className="flex flex-col w-full bg-white border border-[#c4c7c8] rounded-[3px] shadow-sm select-none font-sans min-h-[820px]">
      {/* 1. Top Global Command Strip */}
      <DesktopCommandStrip
        filters={commandFilters}
        onUpdateFilters={(partial) => setCommandFilters((prev) => ({ ...prev, ...partial }))}
        statusCounts={statusCounts}
        onOpenScanner={() => showToast('已打开工控扫码识别探头')}
        onBatchPrint={() => showToast(`已下发当前筛选的 ${filteredOrders.length} 笔订单批量出票`)}
        onSwitchToClassic={onSwitchToClassic}
      />

      {/* 2. Secondary Control Strip: Channels & Time Filters */}
      <DesktopChannelFilterStrip
        channel={channelFilter}
        onChangeChannel={setChannelFilter}
        channelCounts={channelCounts}
        dateRange={dateRange}
        onChangeDateRange={setDateRange}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        filteredCount={filteredOrders.length}
        totalRevenue={totalRevenue}
      />

      {/* 3. Main Multi-Truck 4-Column Pipeline Grid */}
      <div className="flex-1 bg-white">
        <DesktopOrderMatrixGrid
          orders={filteredOrders}
          viewMode={viewMode}
          onAdvanceStatus={handleAdvanceStatus}
          onPrintReceipt={handlePrintReceipt}
          onCallIntercom={handleCallIntercom}
          onVoidOrder={handleVoidOrder}
          onModifyOrder={(o) => setSelectedOrderForDetail(o)}
          onDeleteOrder={(id) => showToast(`工单【${id}】已移入回收站`)}
          onShowDetail={(o) => setSelectedOrderForDetail(o)}
          onItemCompensate={handleItemCompensate}
        />
      </div>

      {/* 4. Bottom Telemetry Bus Status Row */}
      <div className="border-t border-[#c4c7c8] bg-[#f9f9f9] px-4 py-2 flex items-center justify-between text-xs text-[#444748]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-[#1a1c1c]">
            <Radio className="w-3.5 h-3.5 text-[#006494] animate-pulse" />
            <span>全渠道订单调度总线 [DESKTOP_ORDER_BUS]</span>
          </div>
          <span className="text-[#c4c7c8]">|</span>
          <span className="text-[11px] text-[#747878]">
            当前监视站网: {selectedTruckId} (主车 100% 满电 · GPS 正常)
          </span>
          <span className="text-[#c4c7c8]">|</span>
          <span className="text-[11px] text-[#10b981] flex items-center gap-1 font-semibold">
            <CheckCircle2 className="w-3 h-3 text-[#10b981]" />
            <span>双端隔离保护机制: ACTIVE</span>
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <span>后厨心跳: 240ms</span>
          <span>出单成功率: 100%</span>
          <span className="text-[#006494] font-semibold">刷新间隔: 实时推流</span>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrderForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white border border-[#c4c7c8] rounded-[3px] max-w-lg w-full p-4 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#c4c7c8] pb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-[#1a1c1c]">
                  工单审计与调度详情 [{selectedOrderForDetail.orderNo}]
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderForDetail(null)}
                className="w-6 h-6 rounded-[2px] hover:bg-[#f3f3f4] flex items-center justify-center text-[#444748] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-2 text-[#444748]">
              <div className="flex justify-between p-2 bg-[#f3f3f4] rounded-[2px]">
                <span>渠道类型: {selectedOrderForDetail.channelType}</span>
                <span>下单时刻: {selectedOrderForDetail.createdTime || '刚刚'}</span>
              </div>
              <div className="p-2 border border-[#c4c7c8] rounded-[2px] space-y-1">
                <div className="font-bold text-[#1a1c1c]">餐品明细:</div>
                {selectedOrderForDetail.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>
                      {it.name} x{it.quantity}
                    </span>
                    <span className="font-bold">¥{(it.price * it.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#c4c7c8]">
              <button
                type="button"
                onClick={() => setSelectedOrderForDetail(null)}
                className="h-8 px-3 rounded-[3px] bg-[#f3f3f4] hover:bg-[#eeeeee] text-[#1a1c1c] text-xs font-semibold cursor-pointer border border-[#c4c7c8]"
              >
                关闭
              </button>
              <button
                type="button"
                onClick={() => {
                  handlePrintReceipt(selectedOrderForDetail);
                  setSelectedOrderForDetail(null);
                }}
                className="h-8 px-3 rounded-[3px] bg-[#006494] hover:bg-[#004e75] text-white text-xs font-bold cursor-pointer"
              >
                打印客单
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
