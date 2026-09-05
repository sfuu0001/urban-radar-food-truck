import React, { useState } from 'react';
import {
  UtensilsCrossed,
  X,
  QrCode,
  CheckCircle2,
  Users,
  Search,
  Check,
  Flame,
  Info,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { BoundTableInfo } from '../../types';
import { INITIAL_TABLES } from '../../data/posMockData';
import { playScannerBeep } from '../../utils/barcodeScannerEngine';
import { useToast } from '../ui/ToastContext';
import { getWaitingQueue, addWaitingTable } from '../../utils/tableStorage';

interface TableBindModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBoundTable: BoundTableInfo | null;
  onBindTable?: (table: BoundTableInfo) => void;
  onConfirmBind?: (table: BoundTableInfo) => void;
  truckName?: string;
}

export const TableBindModal: React.FC<TableBindModalProps> = ({
  isOpen,
  onClose,
  currentBoundTable,
  onBindTable,
  onConfirmBind,
  truckName = '黑曜石 01 号流动餐车'
}) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'matrix' | 'scan' | 'manual'>('matrix');
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [selectedTableCode, setSelectedTableCode] = useState<string>(
    currentBoundTable?.code || 'A1'
  );
  const [guestsCount, setGuestsCount] = useState<number>(
    currentBoundTable?.guests || 2
  );
  const [manualCodeInput, setManualCodeInput] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);

  if (!isOpen) return null;

  // Available sample tables
  const availableTables = INITIAL_TABLES.filter(t => !t.truckId || t.truckId === 'truck-01');

  // Filtered tables by zone
  const filteredTables = availableTables.filter(t => {
    if (selectedZone === 'all') return true;
    return t.zone === selectedZone;
  });

  const handleSelectTable = (tbl: typeof availableTables[0]) => {
    setSelectedTableCode(tbl.code);
    if (guestsCount > tbl.capacity) {
      setGuestsCount(tbl.capacity);
    }
  };

  const handleTakeWaitingNumber = () => {
    const newWait = addWaitingTable({
      guests: guestsCount,
      guestName: `食客取号 (${guestsCount}位)`,
      preferredZone: '餐车外摆区'
    });
    setSelectedTableCode(newWait.code);
    toast.success(`已生成等位桌号【${newWait.code}】`, `候补人数: ${guestsCount}人，请点击下方确认绑定即可提前点餐！`);
  };

  const handleConfirmBind = () => {
    // 兼容等位桌号绑定 (以 W 开头)
    if (selectedTableCode.toUpperCase().startsWith('W')) {
      const boundInfo: BoundTableInfo = {
        id: `wait-${selectedTableCode.toUpperCase()}`,
        code: selectedTableCode.toUpperCase(),
        name: `等位候补 ${selectedTableCode.toUpperCase()} 号`,
        zone: 'waiting',
        zoneLabel: '等位候补区',
        capacity: 4,
        guests: guestsCount,
        serverName: '等位专员',
        tableStatus: 'idle',
        isWaiting: true,
        waitingCode: selectedTableCode.toUpperCase()
      };

      if (onConfirmBind) onConfirmBind(boundInfo);
      if (onBindTable) onBindTable(boundInfo);
      toast.success(
        `已成功绑定等位桌号【${selectedTableCode.toUpperCase()}】`,
        `可先行点餐备餐，桌台清理完成后将为您自动或手动转移入座！`
      );
      onClose();
      return;
    }

    const matched = availableTables.find(t => t.code.toUpperCase() === selectedTableCode.toUpperCase());
    if (!matched) {
      toast.warning('请选择或输入有效的桌台编号（如 A1, A2, 或等位号 W01）');
      return;
    }

    const boundInfo: BoundTableInfo = {
      id: matched.id,
      code: matched.code,
      name: matched.name,
      zone: matched.zone,
      zoneLabel: matched.zoneLabel,
      capacity: matched.capacity,
      guests: guestsCount,
      serverName: matched.serverName || '阿豪 (No.02)',
      tableStatus: matched.status as any,
      isWaiting: false
    };

    if (onConfirmBind) {
      onConfirmBind(boundInfo);
    }
    if (onBindTable) {
      onBindTable(boundInfo);
    }
    toast.success(`已成功绑定堂食桌台【${matched.code}号桌 · ${matched.zoneLabel}】`, `${guestsCount}人就餐`);
    onClose();
  };

  // Simulate scanning QR code sticker on the table
  const handleSimulateScan = (codeToScan: string = 'A1') => {
    setIsScanning(true);
    setTimeout(() => {
      playScannerBeep();
      setIsScanning(false);
      const matched = availableTables.find(t => t.code.toUpperCase() === codeToScan.toUpperCase()) || availableTables[0];
      setSelectedTableCode(matched.code);
      setActiveTab('matrix');
      toast.success(`[扫码识别成功] 已识别餐桌二维码：${matched.code} 号桌`, matched.zoneLabel);
    }, 1200);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualCodeInput.trim().toUpperCase();
    if (!clean) {
      toast.warning('请输入桌台编码，如 A1 或等位号 W01');
      return;
    }

    if (clean.startsWith('W')) {
      setSelectedTableCode(clean);
      setActiveTab('matrix');
      toast.info(`已设定等位桌号：${clean}`, '可用于提前点单备餐，清理后转移入座');
      return;
    }

    const matched = availableTables.find(t => t.code.toUpperCase() === clean);
    if (matched) {
      setSelectedTableCode(matched.code);
      setActiveTab('matrix');
      toast.info(`已匹配到桌台：${matched.code} 号桌`, matched.zoneLabel);
    } else {
      toast.warning(`未找到编号为 ${clean} 的桌台`, '请核对桌贴或从列表中选择');
    }
  };

  const currentSelectedObj = availableTables.find(t => t.code.toUpperCase() === selectedTableCode.toUpperCase());

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl border border-[#e2e3e1] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-[#1a1c1b] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white flex items-center gap-2">
                <span>堂食桌台绑定 · 选座开台</span>
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {truckName}
                </span>
              </h3>
              <p className="text-[11px] text-neutral-400">堂食订单将直传餐车后厨与桌台，请确认您的就餐座位</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#e2e3e1] bg-[#f8f8f6] p-1.5 gap-1 shrink-0 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'matrix'
                ? 'bg-white text-black shadow-xs'
                : 'text-neutral-500 hover:text-black'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5 text-amber-600" />
            <span>现场桌台矩阵</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('scan')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'scan'
                ? 'bg-white text-black shadow-xs'
                : 'text-neutral-500 hover:text-black'
            }`}
          >
            <QrCode className="w-3.5 h-3.5 text-sky-600" />
            <span>扫码桌贴选座</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'manual'
                ? 'bg-white text-black shadow-xs'
                : 'text-neutral-500 hover:text-black'
            }`}
          >
            <Search className="w-3.5 h-3.5 text-neutral-600" />
            <span>输入桌号</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* 1. Tab: Matrix */}
          {activeTab === 'matrix' && (
            <div className="space-y-3.5">
              {/* Zone Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {[
                  { key: 'all', label: '全部区域' },
                  { key: 'patio', label: '外摆休闲区 (推荐)' },
                  { key: 'bar', label: '露天吧台区' },
                  { key: 'hall', label: '室内散座区' }
                ].map(z => (
                  <button
                    key={z.key}
                    type="button"
                    onClick={() => setSelectedZone(z.key)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 transition-all cursor-pointer border ${
                      selectedZone === z.key
                        ? 'bg-black text-white border-black shadow-xs'
                        : 'bg-white text-neutral-600 border-[#e2e3e1] hover:bg-neutral-50'
                    }`}
                  >
                    {z.label}
                  </button>
                ))}
              </div>

              {/* Table Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {filteredTables.map(tbl => {
                  const isSelected = selectedTableCode.toUpperCase() === tbl.code.toUpperCase();
                  const isIdle = tbl.status === 'idle' || !tbl.status;
                  const isDining = tbl.status === 'dining';

                  return (
                    <div
                      key={tbl.id}
                      onClick={() => handleSelectTable(tbl)}
                      className={`p-3 rounded-xl border-2 transition-all cursor-pointer relative flex flex-col justify-between min-h-[90px] ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/60 shadow-sm'
                          : 'border-[#e2e3e1] bg-white hover:border-neutral-400 hover:bg-[#fafaf8]'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-base text-black">{tbl.code}</span>
                            <span className="text-[10px] text-neutral-500 font-medium">{tbl.capacity}人桌</span>
                          </div>
                          <p className="text-[10px] text-neutral-500 truncate mt-0.5">{tbl.zoneLabel}</p>
                        </div>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                      </div>

                      <div className="mt-2 pt-1.5 border-t border-[#f0f0ed] flex items-center justify-between text-[10px]">
                        <span
                          className={`font-bold px-1.5 py-0.5 rounded-[3px] ${
                            isIdle
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isDining
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-neutral-100 text-neutral-600'
                          }`}
                        >
                          {isIdle ? '空闲·免排队' : isDining ? '就餐中·可加单' : '保洁备桌'}
                        </span>
                        {tbl.orderNo && (
                          <span className="font-mono text-neutral-400 text-[9px] truncate max-w-[65px]">
                            {tbl.orderNo.replace('UR-', '')}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Waitlist Queue Option Section */}
              {(() => {
                const queue = getWaitingQueue().filter((w) => w.status === 'waiting');
                return (
                  <div className="p-3 bg-[#fafafa] rounded-xl border border-dashed border-[#d3d1cb] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#37352f]">现场客满？等位先行点单</span>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-[2px] bg-[#d9730d] text-white">
                          候补中 {queue.length} 组
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleTakeWaitingNumber}
                        className="px-2.5 py-1 bg-[#37352f] hover:bg-[#201f1d] text-white rounded-[3px] text-xs font-medium cursor-pointer shadow-2xs transition-colors"
                      >
                        + 自助取等位号
                      </button>
                    </div>

                    <p className="text-[11px] text-[#787774] leading-relaxed">
                      绑定等位桌号后可先行点餐制作；一旦现有桌台清理完毕，系统将自动或人工为您转移入座！
                    </p>

                    {queue.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[11px] font-semibold text-[#5a5854]">现有等位号:</span>
                        {queue.map((w) => {
                          const isSelected = selectedTableCode.toUpperCase() === w.code.toUpperCase();
                          return (
                            <button
                              key={w.id}
                              type="button"
                              onClick={() => {
                                setSelectedTableCode(w.code);
                                setGuestsCount(w.guests);
                              }}
                              className={`px-2 py-0.5 rounded-[3px] text-xs font-mono font-bold border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-[#d9730d] text-white border-[#d9730d]'
                                  : 'bg-white text-[#37352f] border-[#d3d1cb] hover:bg-[#f1f1ef]'
                              }`}
                            >
                              {w.code} ({w.guests}人)
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* 2. Tab: Scan Sticker Simulation */}
          {activeTab === 'scan' && (
            <div className="p-4 bg-[#f8f8f6] rounded-xl border border-[#e2e3e1] text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center mx-auto shadow-xs">
                <QrCode className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-black">扫描现场桌贴二维码</h4>
                <p className="text-[11px] text-neutral-500 mt-1">
                  流动餐车每张外摆餐桌桌面均贴有专属防撕二维码，扫码即可秒级绑定
                </p>
              </div>

              {isScanning ? (
                <div className="p-4 bg-black/90 rounded-xl text-white space-y-2">
                  <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-bold text-sky-400">正在光学对焦识别桌贴二维码...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleSimulateScan('A1')}
                    className="p-2.5 bg-white hover:bg-neutral-50 border border-[#e2e3e1] rounded-xl text-left cursor-pointer transition-all active:scale-98"
                  >
                    <div className="font-bold text-xs text-black">扫 A1 号桌桌贴</div>
                    <div className="text-[10px] text-neutral-500">外摆区 · 2人座 (常用)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSimulateScan('A2')}
                    className="p-2.5 bg-white hover:bg-neutral-50 border border-[#e2e3e1] rounded-xl text-left cursor-pointer transition-all active:scale-98"
                  >
                    <div className="font-bold text-xs text-black">扫 A2 号桌桌贴</div>
                    <div className="text-[10px] text-neutral-500">外摆区 · 4人座 (订单7078专属)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSimulateScan('B1')}
                    className="p-2.5 bg-white hover:bg-neutral-50 border border-[#e2e3e1] rounded-xl text-left cursor-pointer transition-all active:scale-98"
                  >
                    <div className="font-bold text-xs text-black">扫 B1 号桌桌贴</div>
                    <div className="text-[10px] text-neutral-500">室内散座 · 2人位</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSimulateScan('C1')}
                    className="p-2.5 bg-white hover:bg-neutral-50 border border-[#e2e3e1] rounded-xl text-left cursor-pointer transition-all active:scale-98"
                  >
                    <div className="font-bold text-xs text-black">扫 C1 号吧台桌贴</div>
                    <div className="text-[10px] text-neutral-500">露天吧台 · 2人位</div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 3. Tab: Manual Code Input */}
          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="p-4 bg-[#f8f8f6] rounded-xl border border-[#e2e3e1] space-y-3">
              <div>
                <label className="block text-xs font-bold text-black mb-1">
                  手动输入桌台编码 (如 A1, A2, B1, B2)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualCodeInput}
                    onChange={(e) => setManualCodeInput(e.target.value)}
                    placeholder="输入桌号，例如 A1 或 A2"
                    className="flex-1 px-3 py-2 bg-white border border-[#e2e3e1] rounded-lg text-xs font-mono font-bold uppercase focus:outline-hidden focus:border-black"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-black text-white font-bold rounded-lg text-xs hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    校验并选择
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-neutral-500">
                可直接在现场餐桌标牌角落查看桌号（大写字母 + 数字编号）
              </p>
            </form>
          )}

          {/* Guests Count Selector */}
          <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-amber-950 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-700" />
                <span>就餐人数确认</span>
              </span>
              <span className="text-[11px] text-amber-800 font-medium">
                当前选择: <strong className="text-black font-black">{guestsCount} 人</strong>
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 6].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setGuestsCount(num)}
                  className={`py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                    guestsCount === num
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white text-neutral-700 border border-amber-200 hover:bg-amber-100/50'
                  }`}
                >
                  {num === 6 ? '5人+' : `${num}人`}
                </button>
              ))}
            </div>
          </div>

          {/* Current Selection Banner */}
          {currentSelectedObj ? (
            <div className="p-3 bg-neutral-900 text-white rounded-xl flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-amber-500 text-black flex items-center justify-center font-mono font-black text-base shrink-0">
                  {currentSelectedObj.code}
                </div>
                <div>
                  <div className="font-bold text-xs text-white flex items-center gap-1.5">
                    <span>{currentSelectedObj.name}</span>
                    <span className="text-[10px] text-amber-400 font-normal">({currentSelectedObj.zoneLabel})</span>
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-0.5">
                    最大容纳 {currentSelectedObj.capacity} 人 · 本次就餐 {guestsCount} 人
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10.5px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-700/60 px-2 py-0.5 rounded-full">
                  已匹配就绪
                </span>
              </div>
            </div>
          ) : selectedTableCode.toUpperCase().startsWith('W') ? (
            <div className="p-3 bg-[#1e2722] text-white rounded-xl flex items-center justify-between shadow-xs border border-[#2b593f]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#4dab63] text-white flex items-center justify-center font-mono font-black text-base shrink-0">
                  {selectedTableCode.toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-xs text-white flex items-center gap-1.5">
                    <span>等位候补桌号</span>
                    <span className="text-[10px] text-emerald-300 font-normal">(等位点餐区)</span>
                  </div>
                  <p className="text-[10px] text-neutral-300 mt-0.5">
                    候补就餐 {guestsCount} 人 · 现有桌台清理后自动/手动转移入座
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10.5px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-700/60 px-2 py-0.5 rounded-full">
                  候补就绪
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 bg-[#f8f8f6] border-t border-[#e2e3e1] flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-neutral-500">
            绑定后桌台将同步至商家端出餐大屏
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 bg-white hover:bg-neutral-100 text-neutral-700 border border-[#e2e3e1] rounded-xl font-semibold text-xs cursor-pointer transition-colors"
            >
              暂不绑定
            </button>
            <button
              type="button"
              onClick={handleConfirmBind}
              className="px-5 py-2 bg-black hover:bg-neutral-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-98"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
              <span>确认绑定该桌台</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
