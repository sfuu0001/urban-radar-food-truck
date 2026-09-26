import React from 'react';
import { ConsoleCardOrder, DesktopOrderMatrixCard } from './DesktopOrderMatrixCard';
import { ViewModeType } from './DesktopChannelFilterStrip';
import { PackageOpen, UtensilsCrossed, Bike, Store, CheckCircle2 } from 'lucide-react';

interface DesktopOrderMatrixGridProps {
  orders: ConsoleCardOrder[];
  viewMode: ViewModeType;
  onAdvanceStatus?: (orderId: string) => void;
  onPrintReceipt?: (order: ConsoleCardOrder) => void;
  onCallIntercom?: (order: ConsoleCardOrder) => void;
  onVoidOrder?: (order: ConsoleCardOrder) => void;
  onModifyOrder?: (order: ConsoleCardOrder) => void;
  onDeleteOrder?: (orderId: string) => void;
  onShowDetail?: (order: ConsoleCardOrder) => void;
  onItemCompensate?: (orderId: string, itemName: string) => void;
}

export const DesktopOrderMatrixGrid: React.FC<DesktopOrderMatrixGridProps> = ({
  orders,
  viewMode,
  onAdvanceStatus,
  onPrintReceipt,
  onCallIntercom,
  onVoidOrder,
  onModifyOrder,
  onDeleteOrder,
  onShowDetail,
  onItemCompensate
}) => {
  if (orders.length === 0) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center bg-white border border-[#c4c7c8] rounded-[3px] m-4 select-none font-sans">
        <div className="w-12 h-12 rounded-[3px] bg-[#f3f3f4] text-[#747878] flex items-center justify-center mb-2.5">
          <PackageOpen className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-[#1a1c1c]">未检索到符合条件的工单</h4>
        <p className="text-xs text-[#747878] mt-1">
          当前分流筛选条件下暂无订单，请切换顶部状态或渠道总控查看全量工单
        </p>
      </div>
    );
  }

  if (viewMode === 'table') {
    return (
      <div className="p-4 bg-white select-none font-sans">
        <div className="border border-[#c4c7c8] rounded-[3px] overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#f3f3f4] text-[#444748] border-b border-[#c4c7c8]">
              <tr>
                <th className="py-2.5 px-3 font-bold">单号</th>
                <th className="py-2.5 px-3 font-bold">渠道/席位</th>
                <th className="py-2.5 px-3 font-bold">状态</th>
                <th className="py-2.5 px-3 font-bold">菜品明细</th>
                <th className="py-2.5 px-3 font-bold">下单时间</th>
                <th className="py-2.5 px-3 font-bold text-right">金额 / 净得</th>
                <th className="py-2.5 px-3 font-bold text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c4c7c8]/40 bg-white">
              {orders.map((o) => {
                const channel = o.channelType || (o.tableCode ? 'dine_in' : o.pickupCode ? 'pickup' : 'delivery');
                const net = o.netEarn !== undefined ? o.netEarn : o.totalAmount;
                return (
                  <tr key={o.id} className="hover:bg-[#f9f9f9] transition-colors">
                    <td className="py-2.5 px-3 font-bold text-[#1a1c1c]">{o.orderNo}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        {channel === 'dine_in' && (
                          <span className="text-[11px] px-1.5 py-0.2 rounded-[2px] bg-[#006494]/10 text-[#006494] font-semibold">
                            堂食 A2 ({o.dinerCount || 3}人)
                          </span>
                        )}
                        {channel === 'pickup' && (
                          <span className="text-[11px] px-1.5 py-0.2 rounded-[2px] bg-[#fff7ed] text-[#ea580c] font-semibold border border-[#fdba74]/40">
                            自提 #{o.pickupCode || 'PK-6688'}
                          </span>
                        )}
                        {channel === 'delivery' && (
                          <span className="text-[11px] px-1.5 py-0.2 rounded-[2px] bg-[#006494]/10 text-[#006494] font-semibold">
                            专送 骑手 {o.riderName || '陈志远'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[11px] px-2 py-0.5 rounded-[2px] font-bold bg-[#fff7ed] text-[#b45309] border border-[#fdba74]/50">
                        {o.status === 'completed' ? '已完成' : o.status === 'shipping' ? '配送中' : '后厨现制中'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#444748] max-w-xs truncate">
                      {o.items.map((i) => `${i.name} x${i.quantity}`).join(' · ')}
                    </td>
                    <td className="py-2.5 px-3 text-[#747878]">{o.createdTime || '刚刚'}</td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-[#1a1c1c]">¥{o.totalAmount.toFixed(2)}</span>
                        <span className="text-[10px] text-[#059669]">净: ¥{net.toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onShowDetail?.(o)}
                          className="h-6 px-2 rounded-[2px] bg-[#f3f3f4] hover:bg-[#eeeeee] text-[#1a1c1c] text-[11px] font-semibold cursor-pointer border border-[#c4c7c8]"
                        >
                          详情
                        </button>
                        <button
                          type="button"
                          onClick={() => onAdvanceStatus?.(o.id)}
                          className="h-6 px-2 rounded-[2px] bg-white hover:bg-neutral-50 text-[#006494] text-[11px] font-bold cursor-pointer border border-[#006494]"
                        >
                          推进
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5 p-4 bg-white select-none">
      {orders.map((order) => (
        <DesktopOrderMatrixCard
          key={order.id}
          order={order}
          onAdvanceStatus={onAdvanceStatus}
          onPrintReceipt={onPrintReceipt}
          onCallIntercom={onCallIntercom}
          onVoidOrder={onVoidOrder}
          onModifyOrder={onModifyOrder}
          onDeleteOrder={onDeleteOrder}
          onShowDetail={onShowDetail}
          onItemCompensate={onItemCompensate}
        />
      ))}
    </div>
  );
};
