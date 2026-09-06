import React, { useState, useRef, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Users,
  Award,
  Calendar,
  Download,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  PieChart as PieChartIcon,
  FileSpreadsheet,
  Database,
  Upload
} from 'lucide-react';
import { Order, DishItem } from '../../types';
import { exportToCsv, exportSystemBackup, importSystemBackup } from '../../utils/dataExportEngine';

interface MerchantAnalyticsProps {
  orders: Order[];
  dishes: DishItem[];
  showToast: (msg: string) => void;
}

export const MerchantAnalytics: React.FC<MerchantAnalyticsProps> = ({
  orders,
  dishes,
  showToast
}) => {
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 真实数据衍生：基于订单数组按时间区间聚合，杜绝写死数值与假筛选
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTomorrow = startOfToday + 86400000;
  const startOfYesterday = startOfToday - 86400000;
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const orderTs = (o: Order): number => {
    const t = new Date(o.createdTime).getTime();
    return isNaN(t) ? 0 : t;
  };

  const rangeBounds = useMemo(() => {
    if (timeRange === 'today') {
      return { start: startOfToday, end: startOfTomorrow, prevStart: startOfYesterday, prevEnd: startOfToday };
    }
    if (timeRange === 'week') {
      const weekStart = startOfToday - 6 * 86400000;
      return { start: weekStart, end: startOfTomorrow, prevStart: weekStart - 7 * 86400000, prevEnd: weekStart };
    }
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
    return { start: startOfMonth, end: startOfTomorrow, prevStart: prevMonthStart, prevEnd: startOfMonth };
  }, [timeRange]);

  const rangeOrders = useMemo(
    () => orders.filter((o) => {
      const t = orderTs(o);
      return t >= rangeBounds.start && t < rangeBounds.end;
    }),
    [orders, rangeBounds]
  );
  const prevOrders = useMemo(
    () => orders.filter((o) => {
      const t = orderTs(o);
      return t >= rangeBounds.prevStart && t < rangeBounds.prevEnd;
    }),
    [orders, rangeBounds]
  );

  const totalSales = rangeOrders.reduce((s, o) => s + o.totalAmount, 0);
  const totalOrdersCount = rangeOrders.length;
  const avgTicketPrice = totalOrdersCount > 0 ? totalSales / totalOrdersCount : 0;
  const prevSales = prevOrders.reduce((s, o) => s + o.totalAmount, 0);
  const prevCount = prevOrders.length;
  const salesDelta = prevSales > 0 ? ((totalSales - prevSales) / prevSales) * 100 : null;
  const countDelta = prevCount > 0 ? ((totalOrdersCount - prevCount) / prevCount) * 100 : null;

  const storeSideCount = rangeOrders.filter((o) => o.channelType === 'dine_in' || o.channelType === 'pickup').length;
  const deliverySideCount = rangeOrders.filter((o) => o.channelType === 'delivery').length;
  const dineVsDeliveryTotal = storeSideCount + deliverySideCount;
  const dineShare = dineVsDeliveryTotal > 0 ? Math.round((storeSideCount / dineVsDeliveryTotal) * 100) : 0;
  const deliveryShare = dineVsDeliveryTotal > 0 ? 100 - dineShare : 0;

  // 各时段出单分布（按真实订单聚合，业务时段 11-14 / 17-20）
  const hourlyHours = ['11:00', '12:00', '13:00', '14:00', '17:00', '18:00', '19:00', '20:00'];
  const hourlyData = useMemo(() => {
    const buckets: Record<string, { amount: number; count: number }> = {};
    for (const o of rangeOrders) {
      const key = `${new Date(orderTs(o)).getHours()}:00`;
      if (!buckets[key]) buckets[key] = { amount: 0, count: 0 };
      buckets[key].amount += o.totalAmount;
      buckets[key].count += 1;
    }
    let maxAmount = 0;
    const arr = hourlyHours.map((h) => {
      const b = buckets[h] || { amount: 0, count: 0 };
      if (b.amount > maxAmount) maxAmount = b.amount;
      return { hour: h, amount: Math.round(b.amount), count: b.count, isPeak: false };
    });
    arr.forEach((a) => { if (maxAmount > 0 && a.amount === maxAmount) a.isPeak = true; });
    return arr;
  }, [rangeOrders]);

  // 热销爆品榜（按真实订单菜品销量聚合 TOP4）
  const topDishes = useMemo(() => {
    const map: Record<string, { qty: number; revenue: number }> = {};
    for (const o of rangeOrders) {
      for (const it of o.items) {
        if (!map[it.name]) map[it.name] = { qty: 0, revenue: 0 };
        map[it.name].qty += it.quantity;
        map[it.name].revenue += it.price * it.quantity;
      }
    }
    const sorted = Object.entries(map)
      .map(([name, v]) => ({ name, qty: v.qty, revenue: v.revenue }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 4);
    const maxQty = sorted.length ? sorted[0].qty : 0;
    return sorted.map((d) => ({ ...d, percent: maxQty > 0 ? Math.round((d.qty / maxQty) * 100) : 0 }));
  }, [rangeOrders]);

  const handleExportOrdersCsv = () => {
    const exportData = orders.map(o => ({
      orderNo: o.orderNo,
      customerName: o.customerName || '顾客',
      phone: o.userPhone || '-',
      itemsSummary: o.items.map(i => `${i.name}x${i.quantity}`).join('; '),
      totalAmount: o.totalAmount.toFixed(2),
      statusText: o.statusText,
      channel: o.channelType === 'delivery' ? '外卖' : o.channelType === 'dine_in' ? '堂食' : '自提',
      createdTime: o.createdTime
    }));

    exportToCsv(
      '黑石餐车_营业订单明细',
      [
        { label: '订单编号', key: 'orderNo' },
        { label: '顾客姓名', key: 'customerName' },
        { label: '联系电话', key: 'phone' },
        { label: '菜品明细', key: 'itemsSummary' },
        { label: '实收总额(元)', key: 'totalAmount' },
        { label: '订单状态', key: 'statusText' },
        { label: '就餐渠道', key: 'channel' },
        { label: '下单时间', key: 'createdTime' }
      ],
      exportData
    );
    showToast('已成功下载营业订单明细 CSV 表格！');
  };

  const handleExportDishesCsv = () => {
    const exportData = dishes.map(d => ({
      name: d.name,
      category: d.category,
      price: d.price.toFixed(2),
      orderType: d.orderType === 'both' ? '堂食+外卖' : d.orderType === 'delivery' ? '仅外卖' : '仅堂食',
      available: d.available ? '在售' : '沽清',
      cookingStyle: d.cookingStyle || '炭火现烤'
    }));

    exportToCsv(
      '黑石餐车_菜品菜单清单',
      [
        { label: '菜品名称', key: 'name' },
        { label: '品类', key: 'category' },
        { label: '售价(元)', key: 'price' },
        { label: '售卖渠道', key: 'orderType' },
        { label: '当前状态', key: 'available' },
        { label: '工艺风格', key: 'cookingStyle' }
      ],
      exportData
    );
    showToast('已成功下载菜单清单 CSV！');
  };

  const handleFullBackup = () => {
    const allLocalStorage: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('obsidian_')) {
        try {
          allLocalStorage[key] = JSON.parse(localStorage.getItem(key) || '');
        } catch {
          allLocalStorage[key] = localStorage.getItem(key);
        }
      }
    }

    exportSystemBackup({
      orders,
      dishes,
      storageData: allLocalStorage
    });
    showToast('全店全量数据 JSON 备份包已打包下载！');
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsedData = await importSystemBackup(file);
      if (parsedData.storageData) {
        Object.entries(parsedData.storageData).forEach(([k, v]) => {
          localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
        });
      }
      showToast('🎉 数据还原成功！请刷新页面加载完整配置。');
    } catch (err: any) {
      showToast(`还原失败：${err.message}`);
    }
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Top Header & Range Filters */}
      <div className="bg-white p-4 rounded-lg border border-[#e6e6e4] flex items-center justify-between gap-3 flex-wrap shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-[#edf3ec] text-[#2b593f] flex items-center justify-center font-bold">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-[#37352f]">餐车营业营收与客流大屏</h4>
            <p className="text-[11px] text-[#787774]">实时统计堂食外摆、美团专送及自提核销多维数据</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-[#f1f1ef] p-0.5 rounded border border-[#e6e6e4]">
            {[
              { id: 'today', label: '今日实时' },
              { id: 'week', label: '近 7 日' },
              { id: 'month', label: '本月累计' }
            ].map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setTimeRange(r.id as any)}
                className={`px-3 py-1 rounded font-semibold text-xs transition-all cursor-pointer ${
                  timeRange === r.id
                    ? 'bg-white text-[#37352f] shadow-xs'
                    : 'text-[#787774] hover:text-black'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportOrdersCsv}
            className="px-3 py-1 bg-white hover:bg-[#efefed] text-[#37352f] border border-[#d3d1cb] rounded font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>导出订单 Excel/CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportDishesCsv}
            className="px-3 py-1 bg-white hover:bg-[#efefed] text-[#37352f] border border-[#d3d1cb] rounded font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#787774]" />
            <span>导出菜单</span>
          </button>

          <button
            type="button"
            onClick={handleFullBackup}
            className="px-3 py-1 bg-[#37352f] hover:bg-black text-white rounded font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
          >
            <Database className="w-3.5 h-3.5 text-amber-300" />
            <span>全量数据备份</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportBackup}
            accept=".json"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1 bg-[#f7f7f5] hover:bg-[#e3e2e0] text-[#787774] hover:text-[#37352f] border border-[#d3d1cb] rounded text-xs flex items-center gap-1 cursor-pointer"
            title="导入还原 JSON 备份文件"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>还原</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded border border-[#e6e6e4] space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[#787774]">
            <span>总营业额 (GMV)</span>
            <DollarSign className="w-4 h-4 text-[#2b593f]" />
          </div>
          <p className="text-xl font-mono font-bold text-[#2b593f]">
            ¥{totalSales.toFixed(2)}
          </p>
          {salesDelta === null ? (
            <span className="text-[10px] text-[#787774] font-semibold">环比上一周期 暂无对比数据</span>
          ) : (() => {
            const up = salesDelta >= 0;
            const Icon = up ? ArrowUpRight : ArrowDownRight;
            return (
              <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${up ? 'text-[#4dab63]' : 'text-[#eb5757]'}`}>
                <Icon className="w-3 h-3" />
                <span>{up ? `环比上一周期 +${salesDelta.toFixed(1)}%` : `环比上一周期 ${salesDelta.toFixed(1)}%`}</span>
              </span>
            );
          })()}
        </div>

        <div className="bg-white p-3.5 rounded border border-[#e6e6e4] space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[#787774]">
            <span>有效成单总数</span>
            <ShoppingBag className="w-4 h-4 text-[#37352f]" />
          </div>
          <p className="text-xl font-mono font-bold text-[#37352f]">
            {totalOrdersCount} <span className="text-xs font-normal text-[#787774]">单</span>
          </p>
          {countDelta === null ? (
            <span className="text-[10px] text-[#787774] font-semibold">环比上一周期 暂无对比数据</span>
          ) : (() => {
            const up = countDelta >= 0;
            const Icon = up ? ArrowUpRight : ArrowDownRight;
            return (
              <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${up ? 'text-[#4dab63]' : 'text-[#eb5757]'}`}>
                <Icon className="w-3 h-3" />
                <span>{up ? `环比上一周期 +${countDelta.toFixed(1)}%` : `环比上一周期 ${countDelta.toFixed(1)}%`}</span>
              </span>
            );
          })()}
        </div>

        <div className="bg-white p-3.5 rounded border border-[#e6e6e4] space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[#787774]">
            <span>笔均客单价</span>
            <Award className="w-4 h-4 text-[#d9730d]" />
          </div>
          <p className="text-xl font-mono font-bold text-[#d9730d]">
            ¥{avgTicketPrice.toFixed(1)}
          </p>
          <span className="text-[10px] text-[#787774]">高客单优质商圈贡献</span>
        </div>

        <div className="bg-white p-3.5 rounded border border-[#e6e6e4] space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[#787774]">
            <span>堂食 vs 外卖占比</span>
            <PieChartIcon className="w-4 h-4 text-[#2383e2]" />
          </div>
          <p className="text-xl font-mono font-bold text-[#1c5598]">
            {dineVsDeliveryTotal > 0 ? `${dineShare}% : ${deliveryShare}%` : '—'}
          </p>
          <span className="text-[10px] text-[#2383e2]">到店/自提 vs 外卖</span>
        </div>
      </div>

      {/* Hourly Sales Bar Chart & Top Selling Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {/* Left: Hourly distribution */}
        <div className="lg:col-span-2 bg-white p-4 rounded-lg border border-[#e6e6e4] space-y-3 shadow-2xs">
          <div className="flex items-center justify-between border-b border-[#efefed] pb-2">
            <h4 className="font-bold text-xs text-[#37352f]">全天各时段出单与出餐波峰</h4>
            <span className="text-[10px] text-[#787774]">高峰时段建议增加现制备料</span>
          </div>

          <div className="pt-2 space-y-2">
            <div className="grid grid-cols-8 gap-2 items-end h-32 pt-4">
              {hourlyData.map((h, idx) => {
                const maxAmount = 700;
                const heightPercent = Math.max(15, (h.amount / maxAmount) * 100);

                return (
                  <div key={idx} className="flex flex-col items-center gap-1 h-full justify-end">
                    <span className="font-mono text-[9px] text-[#787774]">¥{h.amount}</span>
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t transition-all ${
                        h.isPeak ? 'bg-[#d9730d]' : 'bg-[#37352f]'
                      }`}
                      title={`${h.hour} : ¥${h.amount} (${h.count}单)`}
                    />
                    <span className="font-mono text-[9.5px] text-[#5a5854]">{h.hour}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Best Selling Dishes */}
        <div className="bg-white p-4 rounded-lg border border-[#e6e6e4] space-y-3 shadow-2xs">
          <div className="flex items-center justify-between border-b border-[#efefed] pb-2">
            <h4 className="font-bold text-xs text-[#37352f] flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-[#eb5757]" />
              <span>今日热销爆品榜 TOP 4</span>
            </h4>
            <span className="text-[10px] text-[#787774]">销量占比</span>
          </div>

          <div className="space-y-2.5">
            {topDishes.length === 0 ? (
              <div className="text-[11px] text-[#787774] py-4 text-center">当前区间暂无销售数据</div>
            ) : (
              topDishes.map((dish, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`w-4 h-4 rounded font-mono text-[10px] font-bold flex items-center justify-center ${
                        idx === 0 ? 'bg-[#d9730d] text-white' : 'bg-[#f1f1ef] text-[#787774]'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="text-[#37352f] font-semibold truncate">{dish.name}</span>
                    </div>
                    <span className="font-bold text-[#2b593f]">¥{dish.revenue.toFixed(0)}</span>
                  </div>

                  <div className="w-full bg-[#f1f1ef] h-1.5 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${dish.percent}%` }}
                      className={`h-full ${idx === 0 ? 'bg-[#d9730d]' : 'bg-[#37352f]'}`}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
