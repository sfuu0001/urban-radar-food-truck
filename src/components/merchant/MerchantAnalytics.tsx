import React, { useState, useRef } from 'react';
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

  const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 1680.0);
  const totalOrdersCount = orders.length + 38;
  const avgTicketPrice = totalSales / (totalOrdersCount || 1);

  // Hourly distribution simulation
  const hourlyData = [
    { hour: '11:00', amount: 180, count: 4 },
    { hour: '12:00', amount: 560, count: 14, isPeak: true },
    { hour: '13:00', amount: 420, count: 9 },
    { hour: '14:00', amount: 150, count: 3 },
    { hour: '17:00', amount: 280, count: 6 },
    { hour: '18:00', amount: 690, count: 16, isPeak: true },
    { hour: '19:00', amount: 540, count: 12 },
    { hour: '20:00', amount: 310, count: 7 }
  ];

  const topDishes = [
    { name: '碳烤和牛小汉堡双重奏', qty: 42, revenue: 2646.0, percent: 38 },
    { name: '黑松露墨汁手工玉棋', qty: 28, revenue: 2464.0, percent: 26 },
    { name: '果木烟熏黑豚炙烤五花', qty: 22, revenue: 1210.0, percent: 18 },
    { name: '冷萃黑金茉莉提拉米苏', qty: 35, revenue: 1330.0, percent: 18 }
  ];

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
          <span className="text-[10px] text-[#4dab63] font-semibold flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" />
            <span>环比昨日 +18.4%</span>
          </span>
        </div>

        <div className="bg-white p-3.5 rounded border border-[#e6e6e4] space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[#787774]">
            <span>有效成单总数</span>
            <ShoppingBag className="w-4 h-4 text-[#37352f]" />
          </div>
          <p className="text-xl font-mono font-bold text-[#37352f]">
            {totalOrdersCount} <span className="text-xs font-normal text-[#787774]">单</span>
          </p>
          <span className="text-[10px] text-[#4dab63] font-semibold flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" />
            <span>出餐履约率 99.2%</span>
          </span>
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
            55% : 45%
          </p>
          <span className="text-[10px] text-[#2383e2]">全渠道均衡渗透</span>
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
            {topDishes.map((dish, idx) => (
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
                    style={{ width: `${dish.percent * 2.2}%` }}
                    className={`h-full ${idx === 0 ? 'bg-[#d9730d]' : 'bg-[#37352f]'}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
