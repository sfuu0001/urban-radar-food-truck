import React, { useState } from 'react';
import {
  Package,
  Lock,
  Unlock,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Layers,
  Sparkles,
  TrendingDown,
  RotateCcw,
  Truck
} from 'lucide-react';
import { StocktakeItem, StoreTransferRecord } from '../../types';
import { INITIAL_STOCKTAKE_ITEMS, INITIAL_TRANSFERS } from '../../data/mockEnhancedData';

interface MerchantInventoryProps {
  showToast: (msg: string) => void;
}

export const MerchantInventory: React.FC<MerchantInventoryProps> = ({ showToast }) => {
  const [activeTab, setActiveTab] = useState<'stocktake' | 'transfers'>('stocktake');
  const [items, setItems] = useState<StocktakeItem[]>(INITIAL_STOCKTAKE_ITEMS);
  const [transfers, setTransfers] = useState<StoreTransferRecord[]>(INITIAL_TRANSFERS);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // New Transfer Modal state
  const [isAddingTransfer, setIsAddingTransfer] = useState(false);
  const [transferItem, setTransferItem] = useState('原切羊肉块');
  const [transferQty, setTransferQty] = useState('10');
  const [transferUnit, setTransferUnit] = useState('kg');
  const [transferFrom, setTransferFrom] = useState('总店中央冷库 (HQ-01)');
  const [transferTo, setTransferTo] = useState('01号静安餐车 (Truck-01)');

  // Handle actual quantity update
  const handleUpdateActualQty = (id: string, newActual: number) => {
    if (isLocked) {
      showToast('当前库存已锁账锁定，请先解除锁账后再修改实盘！');
      return;
    }

    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const variance = newActual - item.systemQty;
        const varianceCost = variance * item.unitCost;
        const status = Math.abs(variance) > 1.0 ? 'investigate' : 'ok';
        return {
          ...item,
          actualQty: newActual,
          variance,
          varianceCost,
          status
        };
      })
    );
  };

  // Toggle Lock Inventory
  const handleToggleLock = () => {
    if (!isLocked) {
      setIsLocked(true);
      setItems((prev) => prev.map((item) => ({ ...item, locked: true })));
      showToast('打烊实测全盘点已锁账！数据已冻结并写入云端日报快照。');
    } else {
      setIsLocked(false);
      setItems((prev) => prev.map((item) => ({ ...item, locked: false })));
      showToast('已解除库存锁账，恢复实盘编辑态。');
    }
  };

  // Create Transfer
  const handleCreateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(transferQty) || 1;
    const newTr: StoreTransferRecord = {
      id: `tr-${Date.now().toString().slice(-4)}`,
      transferNo: `TR-${Date.now().toString().slice(-6)}`,
      date: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      fromStore: transferFrom,
      toStore: transferTo,
      itemName: transferItem,
      quantity: qty,
      unit: transferUnit,
      operator: '李店长 (EMP-8001)',
      status: 'in_transit'
    };

    setTransfers([newTr, ...transfers]);
    setIsAddingTransfer(false);
    showToast(`跨车物料调拨单 ${newTr.transferNo} 下发成功！已进入在途追踪。`);
  };

  // Calculation Metrics
  const totalVarianceCost = items.reduce((acc, i) => acc + i.varianceCost, 0);
  const abnormalCount = items.filter((i) => i.status === 'investigate').length;
  const filteredItems = items.filter((i) => {
    if (filterCategory === 'all') return true;
    return i.category === filterCategory;
  });

  return (
    <div className="space-y-4 text-xs">
      {/* 1. Header Metrics & Lock Controller */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white p-3 rounded-[3px] border border-[#e6e6e4] space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[#787774]">
            <span className="text-[10.5px]">盘点锁账状态</span>
            {isLocked ? (
              <Lock className="w-3.5 h-3.5 text-[#2b593f]" />
            ) : (
              <Unlock className="w-3.5 h-3.5 text-[#d9730d]" />
            )}
          </div>
          <p className="font-bold text-sm text-[#37352f] flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isLocked ? 'bg-[#4dab63]' : 'bg-[#d9730d] animate-pulse'
              }`}
            />
            <span>{isLocked ? '已打烊封账 (Locked)' : '盘点核对中 (Open)'}</span>
          </p>
          <span className="text-[10px] text-[#787774]">
            {isLocked ? '数据只读冻结已防篡改' : '支持实时修改实盘数'}
          </span>
        </div>

        <div className="bg-white p-3 rounded-[3px] border border-[#e6e6e4] space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[#787774]">
            <span className="text-[10.5px]">盘盈 / 盘亏净额</span>
            <TrendingDown className="w-3.5 h-3.5 text-[#d44333]" />
          </div>
          <p
            className={`font-mono font-bold text-lg ${
              totalVarianceCost < 0 ? 'text-[#d44333]' : 'text-[#2b593f]'
            }`}
          >
            {totalVarianceCost > 0 ? `+¥${totalVarianceCost.toFixed(1)}` : `¥${totalVarianceCost.toFixed(1)}`}
          </p>
          <span className="text-[10px] text-[#787774]">实盘与理论结存总差额</span>
        </div>

        <div className="bg-white p-3 rounded-[3px] border border-[#e6e6e4] space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[#787774]">
            <span className="text-[10.5px]">异常待查物料</span>
            <AlertCircle className="w-3.5 h-3.5 text-[#d9730d]" />
          </div>
          <p className="font-mono font-bold text-lg text-[#d9730d]">
            {abnormalCount} <span className="text-xs font-normal">品项</span>
          </p>
          <span className="text-[10px] text-[#787774]">差异超 $\pm$1.0 需责任复核</span>
        </div>

        <div className="bg-white p-3 rounded-[3px] border border-[#e6e6e4] space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[#787774]">
            <span className="text-[10.5px]">跨店/车调拨在途</span>
            <Truck className="w-3.5 h-3.5 text-[#1c5598]" />
          </div>
          <p className="font-mono font-bold text-lg text-[#1c5598]">
            {transfers.filter((t) => t.status === 'in_transit').length} <span className="text-xs font-normal">单</span>
          </p>
          <span className="text-[10px] text-[#787774]">支持中心冷库向餐车调拨</span>
        </div>
      </div>

      {/* 2. Sub-tab Controller & Action Toolbar */}
      <div className="bg-white p-2.5 rounded-[3px] border border-[#e6e6e4] flex items-center justify-between gap-2 flex-wrap shadow-2xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('stocktake')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-[3px] font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'stocktake'
                ? 'bg-[#37352f] text-white shadow-xs'
                : 'bg-[#f1f1ef] text-[#5a5854] hover:bg-[#e8e8e6]'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>
              <span className="sm:hidden">库存盘点</span>
              <span className="hidden sm:inline">库存闭环盘点 (Stocktaking)</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('transfers')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-[3px] font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'transfers'
                ? 'bg-[#37352f] text-white shadow-xs'
                : 'bg-[#f1f1ef] text-[#5a5854] hover:bg-[#e8e8e6]'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>
              <span className="sm:hidden">跨车调拨</span>
              <span className="hidden sm:inline">跨餐车物料调拨 (Transfers)</span>
            </span>
            <span className="font-mono text-[10px] bg-black/20 px-1 rounded">
              {transfers.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'stocktake' ? (
            <button
              type="button"
              onClick={handleToggleLock}
              className={`px-3 py-1.5 rounded-[3px] font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all ${
                isLocked
                  ? 'bg-[#f1f1ef] text-[#37352f] hover:bg-[#e8e8e6] border border-[#d3d1cb]'
                  : 'bg-[#2b593f] hover:bg-[#204430] text-white'
              }`}
            >
              {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span>
                <span className="sm:hidden">{isLocked ? '解锁' : '锁账'}</span>
                <span className="hidden sm:inline">{isLocked ? '解除锁账以供修改' : '一键打烊全锁账 (Lock)'}</span>
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingTransfer(!isAddingTransfer)}
              className="px-3 py-1.5 bg-[#1c5598] hover:bg-[#143e70] text-white rounded-[3px] font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新建调拨单</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. New Transfer Form */}
      {isAddingTransfer && activeTab === 'transfers' && (
        <form
          onSubmit={handleCreateTransfer}
          className="bg-[#fbfbfa] p-4 rounded-[3px] border border-[#1c5598] space-y-3 shadow-sm animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between border-b border-[#e6e6e4] pb-2">
            <h4 className="font-bold text-xs text-[#37352f] flex items-center gap-1.5">
              <ArrowRightLeft className="w-3.5 h-3.5 text-[#1c5598]" />
              <span>新建跨餐车 / 中心冷库物料调拨单</span>
            </h4>
            <span className="text-[10px] text-[#787774]">支持中心冷库 $\to$ 流动餐车补货</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10.5px] font-semibold text-[#5a5854] block mb-1">调出品项</label>
              <input
                type="text"
                value={transferItem}
                onChange={(e) => setTransferItem(e.target.value)}
                className="w-full bg-white border border-[#d3d1cb] rounded-[3px] px-2 py-1.5 text-xs text-[#37352f]"
                required
              />
            </div>

            <div>
              <label className="text-[10.5px] font-semibold text-[#5a5854] block mb-1">调拨数量与单位</label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  step="0.5"
                  value={transferQty}
                  onChange={(e) => setTransferQty(e.target.value)}
                  className="w-2/3 bg-white border border-[#d3d1cb] rounded-[3px] px-2 py-1.5 text-xs text-[#37352f] font-mono"
                  required
                />
                <input
                  type="text"
                  value={transferUnit}
                  onChange={(e) => setTransferUnit(e.target.value)}
                  className="w-1/3 bg-white border border-[#d3d1cb] rounded-[3px] px-2 py-1.5 text-xs text-[#37352f]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[10.5px] font-semibold text-[#5a5854] block mb-1">调出仓/餐车</label>
              <input
                type="text"
                value={transferFrom}
                onChange={(e) => setTransferFrom(e.target.value)}
                className="w-full bg-white border border-[#d3d1cb] rounded-[3px] px-2 py-1.5 text-xs text-[#37352f]"
                required
              />
            </div>

            <div>
              <label className="text-[10.5px] font-semibold text-[#5a5854] block mb-1">调入目标餐车</label>
              <input
                type="text"
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
                className="w-full bg-white border border-[#d3d1cb] rounded-[3px] px-2 py-1.5 text-xs text-[#37352f]"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAddingTransfer(false)}
              className="px-3 py-1 bg-[#efefed] hover:bg-[#e6e6e4] text-[#5a5854] rounded-[3px] font-semibold text-xs cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-1 bg-[#1c5598] hover:bg-[#143e70] text-white rounded-[3px] font-semibold text-xs cursor-pointer shadow-xs"
            >
              确认生成调拨单
            </button>
          </div>
        </form>
      )}

      {/* 4. Stocktake Items Table */}
      {activeTab === 'stocktake' && (
        <div className="bg-white rounded-[3px] border border-[#e6e6e4] overflow-hidden shadow-2xs">
          <div className="p-3 bg-[#f7f7f5] border-b border-[#e6e6e4] flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-xs text-[#37352f]">
                物料理论结存与实盘对照 (Formula: SystemQty = 期初 + 进货 - 销售 - 损耗)
              </h4>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1">
              {['all', '肉类原料', '海鲜水产', '调料撒料'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFilterCategory(c)}
                  className={`px-2 py-0.5 rounded-[2px] font-semibold text-[11px] cursor-pointer ${
                    filterCategory === c
                      ? 'bg-[#37352f] text-white'
                      : 'bg-[#efefed] text-[#5a5854] hover:bg-[#e6e6e4]'
                  }`}
                >
                  {c === 'all' ? '全部物料' : c}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Card List (< md) */}
          <div className="md:hidden divide-y divide-[#efefed]">
            {filteredItems.map((item) => (
              <div key={item.id} className="p-3 space-y-2 hover:bg-[#fbfbfa]">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-xs text-[#37352f] block">{item.name}</span>
                    <div className="flex items-center gap-1.5 text-[10px] text-[#787774] mt-0.5">
                      <span className="font-mono">{item.sku}</span>
                      <span>·</span>
                      <span>{item.category}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[9.5px] font-bold font-mono px-1.5 py-0.5 rounded ${
                        item.abcClass === 'A'
                          ? 'bg-[#fde8e8] text-[#d44333]'
                          : item.abcClass === 'B'
                          ? 'bg-[#fbf3db] text-[#8f6412]'
                          : 'bg-[#edf3ec] text-[#2b593f]'
                      }`}
                    >
                      {item.abcClass} 类
                    </span>
                    {item.status === 'ok' ? (
                      <span className="text-[10px] bg-[#edf3ec] text-[#2b593f] border border-[#c4dcbc] px-1.5 py-0.2 rounded font-bold">
                        吻合
                      </span>
                    ) : (
                      <span className="text-[10px] bg-[#fde8e8] text-[#d44333] border border-[#f8b4b4] px-1.5 py-0.2 rounded font-bold">
                        超差
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-[#f7f7f5] rounded p-2 text-xs grid grid-cols-3 gap-2 text-center font-mono">
                  <div>
                    <span className="text-[10px] text-[#787774] block">理论数</span>
                    <span className="font-bold text-[#37352f]">{item.systemQty} {item.unit}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#787774] block">实盘数</span>
                    {isLocked ? (
                      <span className="font-bold text-[#37352f]">{item.actualQty} {item.unit}</span>
                    ) : (
                      <div className="flex items-center justify-center gap-0.5 mt-0.5">
                        <input
                          type="number"
                          step="0.5"
                          value={item.actualQty}
                          onChange={(e) =>
                            handleUpdateActualQty(item.id, parseFloat(e.target.value) || 0)
                          }
                          className="w-16 bg-white border border-[#37352f] rounded px-1 py-0.5 text-xs text-[#37352f] font-mono font-bold text-center"
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-[#787774] block">差异 / 盈亏</span>
                    <span
                      className={`font-bold block ${
                        item.variance < 0
                          ? 'text-[#d44333]'
                          : item.variance > 0
                          ? 'text-[#2b593f]'
                          : 'text-[#787774]'
                      }`}
                    >
                      {item.variance > 0 ? `+${item.variance}` : item.variance}{item.unit}
                    </span>
                    <span className="text-[9.5px] text-[#787774]">
                      {item.varianceCost > 0 ? `+¥${item.varianceCost.toFixed(1)}` : `¥${item.varianceCost.toFixed(1)}`}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e6e6e4] bg-[#fbfbfa] text-[#787774] text-[10.5px]">
                  <th className="p-2.5 font-bold">SKU / 物料名称</th>
                  <th className="p-2.5 font-bold">分类 &amp; ABC</th>
                  <th className="p-2.5 font-bold">理论结存 (System)</th>
                  <th className="p-2.5 font-bold">实盘数量 (Actual)</th>
                  <th className="p-2.5 font-bold">差异量 (Variance)</th>
                  <th className="p-2.5 font-bold">单价 &amp; 盈亏金额</th>
                  <th className="p-2.5 font-bold">盘点状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#efefed]">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-[#fbfbfa] transition-colors">
                    <td className="p-2.5">
                      <span className="font-mono text-[10px] text-[#787774] block">{item.sku}</span>
                      <span className="font-bold text-xs text-[#37352f]">{item.name}</span>
                    </td>

                    <td className="p-2.5">
                      <span className="text-[11px] text-[#5a5854] block">{item.category}</span>
                      <span
                        className={`text-[9.5px] font-bold font-mono px-1 rounded ${
                          item.abcClass === 'A'
                            ? 'bg-[#fde8e8] text-[#d44333]'
                            : item.abcClass === 'B'
                            ? 'bg-[#fbf3db] text-[#8f6412]'
                            : 'bg-[#edf3ec] text-[#2b593f]'
                        }`}
                      >
                        {item.abcClass} 类重点
                      </span>
                    </td>

                    <td className="p-2.5 font-mono text-xs font-bold text-[#37352f]">
                      {item.systemQty} {item.unit}
                    </td>

                    <td className="p-2.5">
                      {isLocked ? (
                        <span className="font-mono text-xs font-bold text-[#37352f] bg-[#f1f1ef] px-2 py-1 rounded">
                          {item.actualQty} {item.unit} (锁)
                        </span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.5"
                            value={item.actualQty}
                            onChange={(e) =>
                              handleUpdateActualQty(item.id, parseFloat(e.target.value) || 0)
                            }
                            className="w-20 bg-white border border-[#37352f] rounded-[2px] px-1.5 py-1 text-xs text-[#37352f] font-mono font-bold"
                          />
                          <span className="text-[10px] text-[#787774]">{item.unit}</span>
                        </div>
                      )}
                    </td>

                    <td className="p-2.5">
                      <span
                        className={`font-mono font-bold text-xs ${
                          item.variance < 0
                            ? 'text-[#d44333]'
                            : item.variance > 0
                            ? 'text-[#2b593f]'
                            : 'text-[#787774]'
                        }`}
                      >
                        {item.variance > 0 ? `+${item.variance}` : item.variance} {item.unit}
                      </span>
                    </td>

                    <td className="p-2.5">
                      <span className="text-[10px] text-[#787774] block">
                        ¥{item.unitCost.toFixed(1)}/{item.unit}
                      </span>
                      <span
                        className={`font-mono font-bold text-xs ${
                          item.varianceCost < 0
                            ? 'text-[#d44333]'
                            : item.varianceCost > 0
                            ? 'text-[#2b593f]'
                            : 'text-[#787774]'
                        }`}
                      >
                        {item.varianceCost > 0
                          ? `+¥${item.varianceCost.toFixed(1)}`
                          : `¥${item.varianceCost.toFixed(1)}`}
                      </span>
                    </td>

                    <td className="p-2.5">
                      {item.status === 'ok' ? (
                        <span className="text-[10px] bg-[#edf3ec] text-[#2b593f] border border-[#c4dcbc] px-1.5 py-0.5 rounded font-bold flex items-center gap-1 w-max">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>正常吻合</span>
                        </span>
                      ) : (
                        <span className="text-[10px] bg-[#fde8e8] text-[#d44333] border border-[#f8b4b4] px-1.5 py-0.5 rounded font-bold flex items-center gap-1 w-max">
                          <AlertCircle className="w-3 h-3" />
                          <span>待查明 (超差)</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Transfers Table */}
      {activeTab === 'transfers' && (
        <div className="bg-white rounded-[3px] border border-[#e6e6e4] overflow-hidden shadow-2xs">
          <div className="p-3 bg-[#f7f7f5] border-b border-[#e6e6e4] flex items-center justify-between">
            <h4 className="font-bold text-xs text-[#37352f] flex items-center gap-1.5">
              <ArrowRightLeft className="w-3.5 h-3.5 text-[#1c5598]" />
              <span>跨店 / 跨餐车调拨流转单据</span>
            </h4>
            <span className="text-[10px] text-[#787774]">支持中心冷库补货与餐车间紧急借料</span>
          </div>

          {/* Mobile Card List (< md) */}
          <div className="md:hidden divide-y divide-[#efefed]">
            {transfers.map((tr) => (
              <div key={tr.id} className="p-3 space-y-2 hover:bg-[#fbfbfa]">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-xs text-[#37352f] block">{tr.itemName}</span>
                    <div className="flex items-center gap-1.5 text-[10px] text-[#787774] mt-0.5">
                      <span className="font-mono">{tr.transferNo}</span>
                      <span>·</span>
                      <span>{tr.date}</span>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold text-xs text-[#37352f] block">
                      {tr.quantity} {tr.unit}
                    </span>
                    <span className="text-[10px] text-[#787774]">{tr.operator}</span>
                  </div>
                </div>

                <div className="bg-[#f7f7f5] rounded p-2 text-xs flex items-center justify-between">
                  <div className="text-[11px] truncate flex-1 mr-2">
                    <span className="text-[#5a5854]">{tr.fromStore}</span>
                    <span className="text-[#37352f] font-bold mx-1">$\to$</span>
                    <span className="text-[#2b593f] font-bold">{tr.toStore}</span>
                  </div>
                  <div>
                    {tr.status === 'completed' ? (
                      <span className="text-[10px] bg-[#edf3ec] text-[#2b593f] border border-[#c4dcbc] px-1.5 py-0.5 rounded font-bold whitespace-nowrap">
                        已入库
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setTransfers((prev) =>
                            prev.map((t) => (t.id === tr.id ? { ...t, status: 'completed' } : t))
                          );
                          showToast(`调拨单 ${tr.transferNo} 已确认签收并入库！`);
                        }}
                        className="text-[10px] bg-[#fbf3db] hover:bg-[#ecd9a8] text-[#8f6412] border border-[#ecd9a8] px-2 py-0.5 rounded font-bold cursor-pointer whitespace-nowrap"
                      >
                        确认签收 $\to$
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e6e6e4] bg-[#fbfbfa] text-[#787774] text-[10.5px]">
                  <th className="p-2.5 font-bold">调拨单号/时间</th>
                  <th className="p-2.5 font-bold">物料名称</th>
                  <th className="p-2.5 font-bold">调出起点 $\to$ 调入目标</th>
                  <th className="p-2.5 font-bold">调拨数量</th>
                  <th className="p-2.5 font-bold">操作员</th>
                  <th className="p-2.5 font-bold">调拨状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#efefed]">
                {transfers.map((tr) => (
                  <tr key={tr.id} className="hover:bg-[#fbfbfa] transition-colors">
                    <td className="p-2.5">
                      <span className="font-mono font-bold text-xs text-[#37352f] block">{tr.transferNo}</span>
                      <span className="text-[10px] text-[#787774]">{tr.date}</span>
                    </td>

                    <td className="p-2.5 font-bold text-[#37352f]">{tr.itemName}</td>

                    <td className="p-2.5 text-xs">
                      <span className="text-[#5a5854]">{tr.fromStore}</span>
                      <span className="text-[#37352f] font-bold mx-1.5">$\to$</span>
                      <span className="text-[#2b593f] font-bold">{tr.toStore}</span>
                    </td>

                    <td className="p-2.5 font-mono font-bold text-[#37352f]">
                      {tr.quantity} {tr.unit}
                    </td>

                    <td className="p-2.5 text-[#5a5854]">{tr.operator}</td>

                    <td className="p-2.5">
                      {tr.status === 'completed' ? (
                        <span className="text-[10px] bg-[#edf3ec] text-[#2b593f] border border-[#c4dcbc] px-1.5 py-0.5 rounded font-bold">
                          已调拨入库
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setTransfers((prev) =>
                              prev.map((t) => (t.id === tr.id ? { ...t, status: 'completed' } : t))
                            );
                            showToast(`调拨单 ${tr.transferNo} 已确认签收并入库！`);
                          }}
                          className="text-[10px] bg-[#fbf3db] hover:bg-[#ecd9a8] text-[#8f6412] border border-[#ecd9a8] px-2 py-0.5 rounded font-bold cursor-pointer"
                        >
                          在途确认签收 $\to$
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
