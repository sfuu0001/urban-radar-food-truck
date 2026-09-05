import React, { useState } from 'react';
import {
  Scissors,
  AlertTriangle,
  Flame,
  Plus,
  TrendingDown,
  Scale,
  DollarSign,
  User,
  Clock,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import { ProcessingLossRecord, LossTrackingRecord } from '../../types';
import { INITIAL_PROCESSING_RECORDS, INITIAL_LOSS_RECORDS } from '../../data/mockEnhancedData';

interface MerchantLossHubProps {
  showToast: (msg: string) => void;
}

export const MerchantLossHub: React.FC<MerchantLossHubProps> = ({ showToast }) => {
  const [subTab, setSubTab] = useState<'processing' | 'tracking'>('processing');

  // Processing state
  const [processingRecords, setProcessingRecords] = useState<ProcessingLossRecord[]>(INITIAL_PROCESSING_RECORDS);
  const [isAddingProcessing, setIsAddingProcessing] = useState(false);
  const [newGross, setNewGross] = useState<string>('10.0');
  const [newNet, setNewNet] = useState<string>('7.2');
  const [newMaterial, setNewMaterial] = useState<string>('原切羊后腿肉 (Lamb Leg)');
  const [newUnitPrice, setNewUnitPrice] = useState<string>('76.0');
  const [newStandardRate, setNewStandardRate] = useState<string>('0.75');
  const [newOperator, setNewOperator] = useState<string>('王厨师长');
  const [newReason, setNewReason] = useState<string>('正常去骨去筋膜损耗');

  // Loss Tracking state
  const [lossRecords, setLossRecords] = useState<LossTrackingRecord[]>(INITIAL_LOSS_RECORDS);
  const [isAddingLoss, setIsAddingLoss] = useState(false);
  const [lossItemName, setLossItemName] = useState<string>('蒜蓉炭烤生蚝');
  const [lossCategory, setLossCategory] = useState<'grill' | 'expire' | 'staff' | 'spill' | 'other'>('grill');
  const [lossQty, setLossQty] = useState<string>('2');
  const [lossUnit, setLossUnit] = useState<string>('份');
  const [lossCost, setLossCost] = useState<string>('32');
  const [lossPerson, setLossPerson] = useState<string>('刘烤师');
  const [lossStation, setLossStation] = useState<'grill' | 'cold' | 'bar' | 'all'>('grill');
  const [lossReasonText, setLossReasonText] = useState<string>('炭火过旺表面微焦，主动报损重烤');

  // Summary Metrics
  const totalProcessingKg = processingRecords.reduce((acc, r) => acc + r.grossWeight, 0);
  const totalNetKg = processingRecords.reduce((acc, r) => acc + r.netWeight, 0);
  const avgYieldRate = totalProcessingKg > 0 ? (totalNetKg / totalProcessingKg) * 100 : 0;
  const totalProcessingLossAmount = processingRecords.reduce((acc, r) => acc + r.lossAmount, 0);
  const criticalCount = processingRecords.filter((r) => r.status === 'critical').length;
  const totalTrackingLossAmount = lossRecords.reduce((acc, r) => acc + r.estimatedCost, 0);

  // Submit new processing record
  const handleCreateProcessing = (e: React.FormEvent) => {
    e.preventDefault();
    const gross = parseFloat(newGross) || 0;
    const net = parseFloat(newNet) || 0;
    const unitPrice = parseFloat(newUnitPrice) || 0;
    const standardRate = parseFloat(newStandardRate) || 0.75;

    if (gross <= 0 || net <= 0) {
      showToast('请输入有效的毛重与净重！');
      return;
    }

    const yieldRate = net / gross;
    const lossKg = Math.max(0, gross - net);
    const lossAmount = lossKg * unitPrice;
    const lossRate = 1 - yieldRate;

    let status: 'normal' | 'warning' | 'critical' = 'normal';
    if (yieldRate < standardRate - 0.05) {
      status = 'critical';
    } else if (yieldRate < standardRate) {
      status = 'warning';
    }

    const newRecord: ProcessingLossRecord = {
      id: `prc-${Date.now().toString().slice(-4)}`,
      date: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      materialName: newMaterial,
      category: '肉类原料',
      grossWeight: gross,
      netWeight: net,
      yieldRate,
      standardRate,
      lossRate,
      operator: newOperator,
      lossKg,
      unitPrice,
      lossAmount,
      lossReason: newReason,
      notes: status === 'critical' ? '实际出成率显著低于标准，触发高危损耗预警' : '常规初加工核算',
      status
    };

    setProcessingRecords([newRecord, ...processingRecords]);
    setIsAddingProcessing(false);
    showToast(`初加工核算已录入！实际出成率: ${(yieldRate * 100).toFixed(1)}%`);
  };

  // Submit new loss tracking record
  const handleCreateLoss = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(lossQty) || 1;
    const cost = parseFloat(lossCost) || 0;

    const categoryLabels: Record<string, string> = {
      grill: '烧烤制作失误',
      expire: '临期变质报损',
      staff: '员工试吃与赠客',
      spill: '掉地与污染报损',
      other: '其他异常损耗'
    };

    const newLoss: LossTrackingRecord = {
      id: `loss-${Date.now().toString().slice(-4)}`,
      date: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      itemName: lossItemName,
      category: lossCategory,
      categoryLabel: categoryLabels[lossCategory] || '异常损耗',
      quantity: qty,
      unit: lossUnit,
      estimatedCost: cost,
      responsiblePerson: lossPerson,
      station: lossStation,
      reason: lossReasonText,
      isFromRefund: false
    };

    setLossRecords([newLoss, ...lossRecords]);
    setIsAddingLoss(false);
    showToast(`报损登记成功！已计入今日报损成本 ¥${cost.toFixed(2)}`);
  };

  return (
    <div className="space-y-4 text-xs">
      {/* 1. Top Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white p-3 rounded-[3px] border border-[#e6e6e4] space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[#787774]">
            <span className="text-[10.5px]">今日初加工出成率</span>
            <Scale className="w-3.5 h-3.5 text-[#2b593f]" />
          </div>
          <p className="font-mono font-bold text-lg text-[#2b593f]">
            {avgYieldRate.toFixed(1)}%
          </p>
          <span className="text-[10px] text-[#787774]">
            毛料 {totalProcessingKg.toFixed(1)}kg / 净料 {totalNetKg.toFixed(1)}kg
          </span>
        </div>

        <div className="bg-white p-3 rounded-[3px] border border-[#e6e6e4] space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[#787774]">
            <span className="text-[10.5px]">初加工损耗金额</span>
            <Scissors className="w-3.5 h-3.5 text-[#d9730d]" />
          </div>
          <p className="font-mono font-bold text-lg text-[#d9730d]">
            ¥{totalProcessingLossAmount.toFixed(1)}
          </p>
          <span className="text-[10px] text-[#787774]">
            累计损耗 {(totalProcessingKg - totalNetKg).toFixed(1)}kg
          </span>
        </div>

        <div className="bg-white p-3 rounded-[3px] border border-[#e6e6e4] space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[#787774]">
            <span className="text-[10.5px]">高危超损预警</span>
            <AlertTriangle className="w-3.5 h-3.5 text-[#d44333]" />
          </div>
          <p className="font-mono font-bold text-lg text-[#d44333]">
            {criticalCount} <span className="text-xs font-normal">项超标</span>
          </p>
          <span className="text-[10px] text-[#d44333]">低于标准阈值 5pp 以上</span>
        </div>

        <div className="bg-white p-3 rounded-[3px] border border-[#e6e6e4] space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[#787774]">
            <span className="text-[10.5px]">全维度报损总成本</span>
            <Flame className="w-3.5 h-3.5 text-[#37352f]" />
          </div>
          <p className="font-mono font-bold text-lg text-[#37352f]">
            ¥{totalTrackingLossAmount.toFixed(1)}
          </p>
          <span className="text-[10px] text-[#787774]">已记录 {lossRecords.length} 笔报损单</span>
        </div>
      </div>

      {/* 2. Sub-tab Controller */}
      <div className="bg-white p-2 rounded-[3px] border border-[#e6e6e4] flex items-center justify-between gap-2 flex-wrap shadow-2xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setSubTab('processing')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-[3px] font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === 'processing'
                ? 'bg-[#37352f] text-white shadow-xs'
                : 'bg-[#f1f1ef] text-[#5a5854] hover:bg-[#e8e8e6]'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>
              <span className="sm:hidden">初加工核算</span>
              <span className="hidden sm:inline">初加工出成率核算 (Processing)</span>
            </span>
            <span className="font-mono text-[10px] bg-black/20 px-1 rounded">
              {processingRecords.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('tracking')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-[3px] font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === 'tracking'
                ? 'bg-[#37352f] text-white shadow-xs'
                : 'bg-[#f1f1ef] text-[#5a5854] hover:bg-[#e8e8e6]'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-[#d9730d]" />
            <span>
              <span className="sm:hidden">报损登记</span>
              <span className="hidden sm:inline">全维度报损登记 (Tracking)</span>
            </span>
            <span className="font-mono text-[10px] bg-black/20 px-1 rounded">
              {lossRecords.length}
            </span>
          </button>
        </div>

        <div>
          {subTab === 'processing' ? (
            <button
              type="button"
              onClick={() => setIsAddingProcessing(!isAddingProcessing)}
              className="px-3 py-1.5 bg-[#2b593f] hover:bg-[#204430] text-white rounded-[3px] font-semibold text-xs flex items-center gap-1 cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>录入记录</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingLoss(!isAddingLoss)}
              className="px-3 py-1.5 bg-[#d9730d] hover:bg-[#b55f0a] text-white rounded-[3px] font-semibold text-xs flex items-center gap-1 cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>登记报损</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Add Modal / Drawer Form: Processing */}
      {isAddingProcessing && subTab === 'processing' && (
        <form
          onSubmit={handleCreateProcessing}
          className="bg-[#fbfbfa] p-4 rounded-[3px] border border-[#37352f] space-y-3 shadow-sm animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between border-b border-[#e6e6e4] pb-2">
            <h4 className="font-bold text-xs text-[#37352f] flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-[#2b593f]" />
              <span>录入食材初加工出成率核算单</span>
            </h4>
            <span className="text-[10px] text-[#787774]">系统将根据净重/毛重自动计算出肉率与预警</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10.5px] font-semibold text-[#5a5854] block mb-1">原料名称</label>
              <input
                type="text"
                value={newMaterial}
                onChange={(e) => setNewMaterial(e.target.value)}
                className="w-full bg-white border border-[#d3d1cb] rounded-[3px] px-2 py-1.5 text-xs text-[#37352f]"
                required
              />
            </div>

            <div>
              <label className="text-[10.5px] font-semibold text-[#5a5854] block mb-1">
                毛料重量 (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={newGross}
                onChange={(e) => setNewGross(e.target.value)}
                className="w-full bg-white border border-[#d3d1cb] rounded-[3px] px-2 py-1.5 text-xs text-[#37352f] font-mono"
                required
              />
            </div>

            <div>
              <label className="text-[10.5px] font-semibold text-[#5a5854] block mb-1">
                净料重量 (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={newNet}
                onChange={(e) => setNewNet(e.target.value)}
                className="w-full bg-white border border-[#d3d1cb] rounded-[3px] px-2 py-1.5 text-xs text-[#37352f] font-mono"
                required
              />
            </div>

            <div>
              <label className="text-[10.5px] font-semibold text-[#5a5854] block mb-1">
                原料单价 (¥/kg)
              </label>
              <input
                type="number"
                step="1"
                value={newUnitPrice}
                onChange={(e) => setNewUnitPrice(e.target.value)}
                className="w-full bg-white border border-[#d3d1cb] rounded-[3px] px-2 py-1.5 text-xs text-[#37352f] font-mono"
                required
              />
            </div>

            <div>
              <label className="text-[10.5px] font-semibold text-[#5a5854] block mb-1">
                标准出成率阈值 (例如 0.75 代表 75%)
              </label>
              <input
                type="number"
                step="0.01"
                value={newStandardRate}
                onChange={(e) => setNewStandardRate(e.target.value)}
                className="w-full bg-white border border-[#d3d1cb] rounded-[3px] px-2 py-1.5 text-xs text-[#37352f] font-mono"
                required
              />
            </div>

            <div>
              <label className="text-[10.5px] font-semibold text-[#5a5854] block mb-1">责任加工师傅</label>
              <input
                type="text"
                value={newOperator}
                onChange={(e) => setNewOperator(e.target.value)}
                className="w-full bg-white border border-[#d3d1cb] rounded-[3px] px-2 py-1.5 text-xs text-[#37352f]"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[10.5px] font-semibold text-[#5a5854] block mb-1">加工损耗原因与备注</label>
            <input
              type="text"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              className="w-full bg-white border border-[#d3d1cb] rounded-[3px] px-2 py-1.5 text-xs text-[#37352f]"
              placeholder="例如：修除多余白色脂肪，去除筋膜损耗"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAddingProcessing(false)}
              className="px-3 py-1 bg-[#efefed] hover:bg-[#e6e6e4] text-[#5a5854] rounded-[3px] font-semibold text-xs cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-1 bg-[#2b593f] hover:bg-[#204430] text-white rounded-[3px] font-semibold text-xs cursor-pointer shadow-xs"
            >
              确认核算并入库
            </button>
          </div>
        </form>
      )}

      {/* 4. Add Modal: Loss Tracking */}
      {isAddingLoss && subTab === 'tracking' && (
        <form
          onSubmit={handleCreateLoss}
          className="bg-[#fbfbfa] p-4 rounded-[3px] border border-[#d9730d] space-y-3 shadow-sm animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between border-b border-[#e6e6e4] pb-2">
            <h4 className="font-bold text-xs text-[#37352f] flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-[#d9730d]" />
              <span>登记全维度报损记录 (Loss Write-off)</span>
            </h4>
            <span className="text-[10px] text-[#787774]">已制作退菜将自动关联至此处汇总</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10.5px] font-semibold text-[#5a5854] block mb-1">报损品项</label>
              <input
                type="text"
                value={lossItemName}
                onChange={(e) => setLossItemName(e.target.value)}
                className="w-full bg-white border border-[#d3d1cb] rounded-[3px] px-2 py-1.5 text-xs text-[#37352f]"
                required
              />
            </div>

            <div>
              <label className="text-[10.5px] font-semibold text-[#5a5854] block mb-1">报损归属分类</label>
              <select
                value={lossCategory}
                onChange={(e) => setLossCategory(e.target.value as any)}
                className="w-full bg-white border border-[#d3d1cb] rounded-[3px] px-2 py-1.5 text-xs text-[#37352f]"
              >
                <option value="grill">烧烤制作失误 (grill)</option>
                <option value="expire">临期变质报损 (expire)</option>
                <option value="staff">员工试吃与赠客 (staff)</option>
                <option value="spill">掉地与污染 (spill)</option>
                <option value="other">其他异常损耗 (other)</option>
              </select>
            </div>

            <div>
              <label className="text-[10.5px] font-semibold text-[#5a5854] block mb-1">所属档口</label>
              <select
                value={lossStation}
                onChange={(e) => setLossStation(e.target.value as any)}
                className="w-full bg-white border border-[#d3d1cb] rounded-[3px] px-2 py-1.5 text-xs text-[#37352f]"
              >
                <option value="grill">烧烤档 (Grill)</option>
                <option value="cold">凉菜/生鲜档 (Cold)</option>
                <option value="bar">酒水/小吃档 (Bar)</option>
                <option value="all">全店通用</option>
              </select>
            </div>

            <div>
              <label className="text-[10.5px] font-semibold text-[#5a5854] block mb-1">报损数量与单位</label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  step="0.5"
                  value={lossQty}
                  onChange={(e) => setLossQty(e.target.value)}
                  className="w-2/3 bg-white border border-[#d3d1cb] rounded-[3px] px-2 py-1.5 text-xs text-[#37352f] font-mono"
                  required
                />
                <input
                  type="text"
                  value={lossUnit}
                  onChange={(e) => setLossUnit(e.target.value)}
                  className="w-1/3 bg-white border border-[#d3d1cb] rounded-[3px] px-2 py-1.5 text-xs text-[#37352f]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[10.5px] font-semibold text-[#5a5854] block mb-1">估算成本 (¥)</label>
              <input
                type="number"
                step="0.1"
                value={lossCost}
                onChange={(e) => setLossCost(e.target.value)}
                className="w-full bg-white border border-[#d3d1cb] rounded-[3px] px-2 py-1.5 text-xs text-[#37352f] font-mono"
                required
              />
            </div>

            <div>
              <label className="text-[10.5px] font-semibold text-[#5a5854] block mb-1">责任人</label>
              <input
                type="text"
                value={lossPerson}
                onChange={(e) => setLossPerson(e.target.value)}
                className="w-full bg-white border border-[#d3d1cb] rounded-[3px] px-2 py-1.5 text-xs text-[#37352f]"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[10.5px] font-semibold text-[#5a5854] block mb-1">报损详细原因</label>
            <input
              type="text"
              value={lossReasonText}
              onChange={(e) => setLossReasonText(e.target.value)}
              className="w-full bg-white border border-[#d3d1cb] rounded-[3px] px-2 py-1.5 text-xs text-[#37352f]"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAddingLoss(false)}
              className="px-3 py-1 bg-[#efefed] hover:bg-[#e6e6e4] text-[#5a5854] rounded-[3px] font-semibold text-xs cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-1 bg-[#d9730d] hover:bg-[#b55f0a] text-white rounded-[3px] font-semibold text-xs cursor-pointer shadow-xs"
            >
              确认登记报损
            </button>
          </div>
        </form>
      )}

      {/* 5. Processing List View */}
      {subTab === 'processing' && (
        <div className="bg-white rounded-[3px] border border-[#e6e6e4] overflow-hidden shadow-2xs">
          <div className="p-3 bg-[#f7f7f5] border-b border-[#e6e6e4] flex items-center justify-between">
            <h4 className="font-bold text-xs text-[#37352f] flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-[#2b593f]" />
              <span>初加工损耗核算记录 (Processing Yield Ledger)</span>
            </h4>
            <span className="text-[10px] text-[#787774]">
              出成率预警机: Normal (合格) / Warning (关注) / Critical (超标严重)
            </span>
          </div>

          {/* Mobile Card List (< md) */}
          <div className="md:hidden divide-y divide-[#efefed]">
            {processingRecords.map((r) => {
              const yieldPct = (r.yieldRate * 100).toFixed(1);
              const stdPct = (r.standardRate * 100).toFixed(1);
              const diffPct = ((r.yieldRate - r.standardRate) * 100).toFixed(1);

              return (
                <div key={r.id} className="p-3 space-y-2 hover:bg-[#fbfbfa]">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold text-xs text-[#37352f] block">{r.materialName}</span>
                      <div className="flex items-center gap-1.5 text-[10px] text-[#787774]">
                        <span className="font-mono">{r.id}</span>
                        <span>·</span>
                        <span>{r.date}</span>
                        <span>·</span>
                        <span>{r.category}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`font-mono font-bold text-sm block ${
                          r.status === 'critical'
                            ? 'text-[#d44333]'
                            : r.status === 'warning'
                            ? 'text-[#d9730d]'
                            : 'text-[#2b593f]'
                        }`}
                      >
                        {yieldPct}%
                      </span>
                      <span
                        className={`text-[9.5px] font-mono ${
                          parseFloat(diffPct) < 0 ? 'text-[#d44333]' : 'text-[#2b593f]'
                        }`}
                      >
                        {parseFloat(diffPct) > 0 ? `+${diffPct}` : diffPct}% (标:{stdPct}%)
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#f7f7f5] rounded p-2 text-[11px] flex items-center justify-between font-mono">
                    <div>
                      <span className="text-[#787774]">毛料 {r.grossWeight}kg</span>
                      <span className="text-[#37352f] font-bold mx-1">$\to$</span>
                      <span className="text-[#2b593f] font-bold">净料 {r.netWeight}kg</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[#37352f] font-bold">- {r.lossKg}kg</span>
                      <span className="text-[#d9730d] ml-1">(-¥{r.lossAmount.toFixed(1)})</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10.5px]">
                    <span className="text-[#5a5854] flex items-center gap-1">
                      <User className="w-3 h-3 text-[#787774]" />
                      <span>{r.operator}</span>
                    </span>
                    <div>
                      {r.status === 'normal' && (
                        <span className="text-[10px] bg-[#edf3ec] text-[#2b593f] border border-[#c4dcbc] px-1.5 py-0.2 rounded font-bold">
                          合格
                        </span>
                      )}
                      {r.status === 'warning' && (
                        <span className="text-[10px] bg-[#fbf3db] text-[#8f6412] border border-[#ecd9a8] px-1.5 py-0.2 rounded font-bold">
                          关注
                        </span>
                      )}
                      {r.status === 'critical' && (
                        <span className="text-[10px] bg-[#fde8e8] text-[#d44333] border border-[#f8b4b4] px-1.5 py-0.2 rounded font-bold">
                          超标预警
                        </span>
                      )}
                    </div>
                  </div>

                  {r.lossReason && (
                    <p className="text-[10.5px] text-[#787774] bg-white border border-[#efefed] rounded p-1.5">
                      {r.lossReason}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop Table (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e6e6e4] bg-[#fbfbfa] text-[#787774] text-[10.5px]">
                  <th className="p-2.5 font-bold">单号/时间</th>
                  <th className="p-2.5 font-bold">原料名称</th>
                  <th className="p-2.5 font-bold">毛重 $\to$ 净重</th>
                  <th className="p-2.5 font-bold">实际出成率 vs 标准</th>
                  <th className="p-2.5 font-bold">损耗量 &amp; 成本</th>
                  <th className="p-2.5 font-bold">责任人</th>
                  <th className="p-2.5 font-bold">损耗原因 &amp; 预警状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#efefed]">
                {processingRecords.map((r) => {
                  const yieldPct = (r.yieldRate * 100).toFixed(1);
                  const stdPct = (r.standardRate * 100).toFixed(1);
                  const diffPct = ((r.yieldRate - r.standardRate) * 100).toFixed(1);

                  return (
                    <tr key={r.id} className="hover:bg-[#fbfbfa] transition-colors">
                      <td className="p-2.5">
                        <span className="font-mono font-bold text-xs text-[#37352f] block">{r.id}</span>
                        <span className="text-[10px] text-[#787774]">{r.date}</span>
                      </td>

                      <td className="p-2.5">
                        <span className="font-semibold text-[#37352f] block">{r.materialName}</span>
                        <span className="text-[10px] text-[#787774]">{r.category}</span>
                      </td>

                      <td className="p-2.5 font-mono text-xs">
                        <span className="text-[#787774]">{r.grossWeight}kg</span>
                        <span className="text-[#37352f] font-bold mx-1">$\to$</span>
                        <span className="text-[#2b593f] font-bold">{r.netWeight}kg</span>
                      </td>

                      <td className="p-2.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-mono font-bold text-sm ${
                              r.status === 'critical'
                                ? 'text-[#d44333]'
                                : r.status === 'warning'
                                ? 'text-[#d9730d]'
                                : 'text-[#2b593f]'
                            }`}
                          >
                            {yieldPct}%
                          </span>
                          <span className="text-[10px] text-[#787774] font-mono">
                            (标: {stdPct}%)
                          </span>
                        </div>
                        <span
                          className={`text-[9.5px] font-mono ${
                            parseFloat(diffPct) < 0 ? 'text-[#d44333]' : 'text-[#2b593f]'
                          }`}
                        >
                          偏差: {parseFloat(diffPct) > 0 ? `+${diffPct}` : diffPct}%
                        </span>
                      </td>

                      <td className="p-2.5">
                        <span className="font-mono font-bold text-xs text-[#37352f] block">
                          - {r.lossKg}kg
                        </span>
                        <span className="font-mono text-[10px] text-[#d9730d]">
                          ¥{r.lossAmount.toFixed(1)} (@¥{r.unitPrice}/kg)
                        </span>
                      </td>

                      <td className="p-2.5">
                        <span className="text-xs text-[#37352f] flex items-center gap-1">
                          <User className="w-3 h-3 text-[#787774]" />
                          <span>{r.operator}</span>
                        </span>
                      </td>

                      <td className="p-2.5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            {r.status === 'normal' && (
                              <span className="text-[10px] bg-[#edf3ec] text-[#2b593f] border border-[#c4dcbc] px-1.5 py-0.2 rounded font-bold">
                                合格 Normal
                              </span>
                            )}
                            {r.status === 'warning' && (
                              <span className="text-[10px] bg-[#fbf3db] text-[#8f6412] border border-[#ecd9a8] px-1.5 py-0.2 rounded font-bold">
                                关注 Warning
                              </span>
                            )}
                            {r.status === 'critical' && (
                              <span className="text-[10px] bg-[#fde8e8] text-[#d44333] border border-[#f8b4b4] px-1.5 py-0.2 rounded font-bold">
                                超标 Critical
                              </span>
                            )}
                          </div>
                          <p className="text-[10.5px] text-[#5a5854] max-w-xs">{r.lossReason}</p>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Loss Tracking View */}
      {subTab === 'tracking' && (
        <div className="bg-white rounded-[3px] border border-[#e6e6e4] overflow-hidden shadow-2xs">
          <div className="p-3 bg-[#f7f7f5] border-b border-[#e6e6e4] flex items-center justify-between">
            <h4 className="font-bold text-xs text-[#37352f] flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-[#d9730d]" />
              <span>全维度报损登记流水 (Loss Tracking &amp; Write-offs)</span>
            </h4>
            <span className="text-[10px] text-[#787774]">
              已制作退菜自动联动 · 成本直通日报
            </span>
          </div>

          {/* Mobile Card List (< md) */}
          <div className="md:hidden divide-y divide-[#efefed]">
            {lossRecords.map((l) => (
              <div key={l.id} className="p-3 space-y-2 hover:bg-[#fbfbfa]">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-xs text-[#37352f]">{l.itemName}</span>
                      {l.isFromRefund && (
                        <span className="text-[9px] bg-[#fde8e8] text-[#d44333] px-1 rounded">
                          退菜联动
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-[#787774] mt-0.5">
                      <span className="font-mono">{l.id}</span>
                      <span>·</span>
                      <span>{l.date}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-sm text-[#d44333] block">
                      ¥{l.estimatedCost.toFixed(2)}
                    </span>
                    <span className="font-mono text-[10.5px] text-[#37352f]">
                      {l.quantity} {l.unit}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10.5px]">
                  <span className="bg-[#f1f1ef] text-[#37352f] px-1.5 py-0.5 rounded border border-[#e6e6e4] font-medium">
                    {l.categoryLabel} ({l.station === 'grill' ? '烧烤档' : l.station === 'cold' ? '生鲜档' : '水吧小吃'})
                  </span>
                  <span className="flex items-center gap-1 text-[#37352f]">
                    <User className="w-3 h-3 text-[#787774]" />
                    <span>{l.responsiblePerson}</span>
                  </span>
                </div>

                {l.reason && (
                  <p className="text-[10.5px] text-[#5a5854] bg-[#f7f7f5] rounded p-2">
                    {l.reason}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Table (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e6e6e4] bg-[#fbfbfa] text-[#787774] text-[10.5px]">
                  <th className="p-2.5 font-bold">单号/时间</th>
                  <th className="p-2.5 font-bold">报损品项</th>
                  <th className="p-2.5 font-bold">报损分类 &amp; 档口</th>
                  <th className="p-2.5 font-bold">报损数量</th>
                  <th className="p-2.5 font-bold">估算成本</th>
                  <th className="p-2.5 font-bold">责任人</th>
                  <th className="p-2.5 font-bold">报损原因</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#efefed]">
                {lossRecords.map((l) => (
                  <tr key={l.id} className="hover:bg-[#fbfbfa] transition-colors">
                    <td className="p-2.5">
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-xs text-[#37352f]">{l.id}</span>
                        {l.isFromRefund && (
                          <span className="text-[9px] bg-[#fde8e8] text-[#d44333] px-1 rounded">
                            退菜联动
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#787774] block">{l.date}</span>
                    </td>

                    <td className="p-2.5 font-semibold text-[#37352f]">{l.itemName}</td>

                    <td className="p-2.5">
                      <span className="text-[10.5px] bg-[#f1f1ef] text-[#37352f] px-1.5 py-0.5 rounded border border-[#e6e6e4] font-medium">
                        {l.categoryLabel}
                      </span>
                      <span className="text-[10px] text-[#787774] block mt-0.5">
                        档口: {l.station === 'grill' ? '烧烤档' : l.station === 'cold' ? '生鲜档' : '水吧小吃'}
                      </span>
                    </td>

                    <td className="p-2.5 font-mono text-xs text-[#37352f]">
                      {l.quantity} {l.unit}
                    </td>

                    <td className="p-2.5">
                      <span className="font-mono font-bold text-sm text-[#d44333]">
                        ¥{l.estimatedCost.toFixed(2)}
                      </span>
                    </td>

                    <td className="p-2.5 text-xs text-[#37352f]">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-[#787774]" />
                        <span>{l.responsiblePerson}</span>
                      </span>
                    </td>

                    <td className="p-2.5 text-xs text-[#5a5854] max-w-sm">
                      {l.reason}
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
