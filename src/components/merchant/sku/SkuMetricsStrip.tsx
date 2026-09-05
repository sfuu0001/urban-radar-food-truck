import React from 'react';
import { Layers, Warehouse, Truck, AlertTriangle, Scale, DollarSign } from 'lucide-react';
import { SkuParamItem } from '../../../types';

interface SkuMetricsStripProps {
  skuList: SkuParamItem[];
}

export const SkuMetricsStrip: React.FC<SkuMetricsStripProps> = ({ skuList }) => {
  const totalSkuCount = skuList.length;
  const inStockList = skuList.filter(
    (s) => s.stockStatus === 'in_stock' || (s.currentStock > 0 && s.stockStatus !== 'out_of_stock' && s.stockStatus !== 'pending_in')
  );
  const pendingInList = skuList.filter((s) => s.stockStatus === 'pending_in');
  const outOfStockList = skuList.filter(
    (s) => s.stockStatus === 'out_of_stock' || (s.currentStock <= 0 && s.stockStatus !== 'pending_in')
  );

  const inStockCount = inStockList.length;
  const pendingInCount = pendingInList.length;
  const outOfStockCount = outOfStockList.length;

  const avgYield =
    (skuList.reduce((sum, s) => sum + (s.standardYieldRate || 0.8), 0) / (skuList.length || 1)) * 100;
  const totalStockAssetValue = inStockList.reduce(
    (sum, s) => sum + (s.currentStock * s.purchasePrice),
    0
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      <div className="bg-white p-3 rounded-[3px] border border-[#e2e8f0]">
        <div className="text-[11px] text-[#64748b] font-medium flex items-center justify-between">
          <span>维护档案总数</span>
          <Layers className="w-3.5 h-3.5 text-blue-500" />
        </div>
        <div className="text-xl font-mono font-bold text-[#0f172a] mt-0.5">
          {totalSkuCount} <span className="text-xs font-normal">个 SKU</span>
        </div>
        <div className="text-[10px] text-[#64748b] mt-0.5">覆盖 8 大标准原料品类</div>
      </div>

      <div className="bg-white p-3 rounded-[3px] border border-[#bbf7d0] bg-[#f0fdf4]/60">
        <div className="text-[11px] text-[#166534] font-medium flex items-center justify-between">
          <span>🟢 在库现货品类</span>
          <Warehouse className="w-3.5 h-3.5 text-emerald-600" />
        </div>
        <div className="text-xl font-mono font-bold text-[#16a34a] mt-0.5">
          {inStockCount} <span className="text-xs font-normal">种在库</span>
        </div>
        <div className="text-[10px] text-[#166534] mt-0.5 font-medium">
          理论在库资产: ¥{totalStockAssetValue.toFixed(1)}
        </div>
      </div>

      <div className="bg-white p-3 rounded-[3px] border border-amber-200 bg-amber-50/50">
        <div className="text-[11px] text-amber-800 font-medium flex items-center justify-between">
          <span>🟡 待入库 / 在途</span>
          <Truck className="w-3.5 h-3.5 text-amber-600" />
        </div>
        <div className="text-xl font-mono font-bold text-amber-700 mt-0.5">
          {pendingInCount} <span className="text-xs font-normal">批次在途</span>
        </div>
        <div className="text-[10px] text-amber-800/80 mt-0.5">冷链顺丰陆运配送中</div>
      </div>

      <div className="bg-white p-3 rounded-[3px] border border-red-200 bg-red-50/50">
        <div className="text-[11px] text-red-800 font-medium flex items-center justify-between">
          <span>🔴 未在库 / 缺货告急</span>
          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
        </div>
        <div className="text-xl font-mono font-bold text-red-600 mt-0.5">
          {outOfStockCount} <span className="text-xs font-normal">种缺货</span>
        </div>
        <div className="text-[10px] text-red-800/80 mt-0.5">均值出肉率: {avgYield.toFixed(1)}%</div>
      </div>
    </div>
  );
};
