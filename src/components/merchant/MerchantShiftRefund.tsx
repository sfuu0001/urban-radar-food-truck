import React, { useState } from 'react';
import {
  RotateCcw,
  Receipt,
  CalendarCheck,
  CreditCard,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Plus,
  Clock,
  User,
  DollarSign,
  ShieldCheck,
  Sparkles,
  Phone,
  Search,
  Filter
} from 'lucide-react';
import { ShiftRecord, RefundRecord, ReservationItem } from '../../types';
import { INITIAL_SHIFTS, INITIAL_REFUNDS, INITIAL_RESERVATIONS } from '../../data/mockEnhancedData';

interface MerchantShiftRefundProps {
  showToast: (msg: string) => void;
}

export const MerchantShiftRefund: React.FC<MerchantShiftRefundProps> = ({ showToast }) => {
  const [subTab, setSubTab] = useState<'shift' | 'refund' | 'reservation'>('shift');

  // Shift state
  const [shifts, setShifts] = useState<ShiftRecord[]>(INITIAL_SHIFTS);
  const [isClosingShift, setIsClosingShift] = useState(false);
  const [closedBy, setClosedBy] = useState('陈收银 (EMP-8004)');
  const [successor, setSuccessor] = useState('王收银 (EMP-8005)');
  const [actualCashInput, setActualCashInput] = useState('500.0');
  const [diffReason, setDiffReason] = useState<any>('none');
  const [shiftNote, setShiftNote] = useState('晚班交接，外卖接单平稳');

  // Refund state
  const [refunds, setRefunds] = useState<RefundRecord[]>(INITIAL_REFUNDS);
  const [isCreatingRefund, setIsCreatingRefund] = useState(false);
  const [refundOrderNo, setRefundOrderNo] = useState('#ORD-9908');
  const [refundAmount, setRefundAmount] = useState('38.0');
  const [refundMethod, setRefundMethod] = useState('微信原路退款');
  const [refundReasonCategory, setRefundReasonCategory] = useState('taste_dislike');
  const [refundReasonNote, setRefundReasonNote] = useState('顾客反映生蚝偏咸，已协商退款');
  const [notifyKitchen, setNotifyKitchen] = useState(true);
  const [cookedIsLoss, setCookedIsLoss] = useState(true);
  const [managerAuthPin, setManagerAuthPin] = useState('');

  // Reservation state
  const [reservations, setReservations] = useState<ReservationItem[]>(INITIAL_RESERVATIONS);
  const [isAddingReservation, setIsAddingReservation] = useState(false);
  const [resName, setResName] = useState('张先生 (商务)');
  const [resPhone, setResPhone] = useState('138-0000-8888');
  const [resCount, setResCount] = useState('4');
  const [resTable, setResTable] = useState('A2');
  const [resTime, setResTime] = useState('20:00');
  const [resDeposit, setResDeposit] = useState('50.0');
  const [resNote, setResNote] = useState('需要安排靠窗景观位');

  // Submit Shift Close
  const handleCloseShiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const actualCash = parseFloat(actualCashInput) || 0;
    const systemCash = 500.0;
    const diff = actualCash - systemCash;

    const diffReasonLabels: Record<string, string> = {
      none: '钱箱实点现金与系统理论应收完全吻合',
      count_error: '点钞/清点失误误差',
      change_error: '顾客现金找零错误',
      unrecorded_sale: '漏单/未录入线下小额单',
      discount_mis: '折扣优惠遗漏'
    };

    const newShift: ShiftRecord = {
      id: `shift-${Date.now().toString().slice(-4)}`,
      shiftNo: `SFT-${Date.now().toString().slice(-6)}`,
      startTime: '10:00',
      endTime: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      closedBy,
      successor,
      grossSales: 5240.0,
      wechatSales: 3400.0,
      alipaySales: 1340.0,
      cashSales: systemCash,
      actualCash,
      cashDiff: diff,
      diffReason,
      diffReasonText: diffReasonLabels[diffReason] || '',
      orderCount: 46,
      note: shiftNote
    };

    setShifts([newShift, ...shifts]);
    setIsClosingShift(false);
    showToast(`交班完成！交班小票已自动打印，营收 ¥${newShift.grossSales.toFixed(2)}`);
  };

  // Submit Refund
  const handleCreateRefundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(refundAmount) || 0;

    // Check manager authorization if > 200 or policy enabled
    if (amount >= 200 && managerAuthPin !== '8888') {
      showToast('退款金额超过 ¥200 限制！请输入正确的主管授权 PIN 码 (演示: 8888)');
      return;
    }

    const newRefund: RefundRecord = {
      id: `ref-${Date.now().toString().slice(-4)}`,
      refundNo: `RF-${Date.now().toString().slice(-6)}`,
      orderNo: refundOrderNo,
      date: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      amount,
      method: refundMethod,
      reasonCategory: refundReasonCategory,
      reasonNote: refundReasonNote,
      notifyKitchen,
      authorizedBy: amount >= 200 ? '李店长 (EMP-8001 主管授权)' : '陈收银 (EMP-8004)',
      cookedIsLoss,
      items: [{ name: '退款关联菜品项', quantity: 1, price: amount }],
      status: 'approved'
    };

    setRefunds([newRefund, ...refunds]);
    setIsCreatingRefund(false);
    showToast(
      `退款申请已通过！${cookedIsLoss ? '已自动联动后厨损耗单与审计日志' : '原路款项已退回'}`
    );
  };

  // Submit Reservation
  const handleAddReservationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const count = parseInt(resCount) || 2;
    const deposit = parseFloat(resDeposit) || 0;

    const newRes: ReservationItem = {
      id: `res-${Date.now().toString().slice(-4)}`,
      guestName: resName,
      phone: resPhone,
      guestCount: count,
      tableCode: resTable,
      reservationTime: resTime,
      countdownMin: 60,
      depositAmount: deposit,
      depositStatus: 'paid',
      status: 'confirmed',
      note: resNote
    };

    setReservations([newRes, ...reservations]);
    setIsAddingReservation(false);
    showToast(`桌台 ${resTable} 预定成功！已锁定台位并收取定金 ¥${deposit.toFixed(2)}`);
  };

  return (
    <div className="space-y-4 text-xs">
      {/* 1. Header Sub-tab Controller */}
      <div className="bg-white p-3 rounded-[3px] border border-[#e6e6e4] flex items-center justify-between gap-3 flex-wrap shadow-2xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setSubTab('shift')}
            className={`px-3 py-1.5 rounded-[3px] font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === 'shift'
                ? 'bg-[#37352f] text-white shadow-xs'
                : 'bg-[#f1f1ef] text-[#5a5854] hover:bg-[#e8e8e6]'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>收银交接班与钱箱对账 (Shift Handover)</span>
            <span className="font-mono text-[10px] bg-black/20 px-1 rounded">
              {shifts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('refund')}
            className={`px-3 py-1.5 rounded-[3px] font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === 'refund'
                ? 'bg-[#37352f] text-white shadow-xs'
                : 'bg-[#f1f1ef] text-[#5a5854] hover:bg-[#e8e8e6]'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-[#d44333]" />
            <span>退款退菜审批 (POS Refund)</span>
            <span className="font-mono text-[10px] bg-black/20 px-1 rounded">
              {refunds.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('reservation')}
            className={`px-3 py-1.5 rounded-[3px] font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === 'reservation'
                ? 'bg-[#37352f] text-white shadow-xs'
                : 'bg-[#f1f1ef] text-[#5a5854] hover:bg-[#e8e8e6]'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5 text-[#1c5598]" />
            <span>桌台预定 Pipeline (Reservations)</span>
            <span className="font-mono text-[10px] bg-black/20 px-1 rounded">
              {reservations.length}
            </span>
          </button>
        </div>

        <div>
          {subTab === 'shift' && (
            <button
              type="button"
              onClick={() => setIsClosingShift(!isClosingShift)}
              className="px-3.5 py-1.5 bg-[#2b593f] hover:bg-[#204430] text-white rounded-[3px] font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>办理当班交接</span>
            </button>
          )}

          {subTab === 'refund' && (
            <button
              type="button"
              onClick={() => setIsCreatingRefund(!isCreatingRefund)}
              className="px-3.5 py-1.5 bg-[#d44333] hover:bg-[#b03022] text-white rounded-[3px] font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>发起退款 / 退菜申请</span>
            </button>
          )}

          {subTab === 'reservation' && (
            <button
              type="button"
              onClick={() => setIsAddingReservation(!isAddingReservation)}
              className="px-3.5 py-1.5 bg-[#1c5598] hover:bg-[#143e70] text-white rounded-[3px] font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新增预约订台</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Modal / Form: Shift Close */}
      {isClosingShift && subTab === 'shift' && (
        <form
          onSubmit={handleCloseShiftSubmit}
          className="bg-[#fbfbfa] p-4 rounded-[3px] border border-[#2b593f] space-y-3 shadow-sm animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between border-b border-[#e6e6e4] pb-2">
            <h4 className="font-bold text-xs text-[#37352f] flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5 text-[#2b593f]" />
              <span>办理当班收银交接与实点现金对账</span>
            </h4>
            <span className="text-[10px] text-[#787774]">
              系统将比对钱箱实点现金并生成交班小票
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10.5px] font-semibold text-[#5a5854] block mb-1">
                交班人 (当前当班)
              </label>
              <input
                type="text"
                value={closedBy}
                onChange={(e) => setClosedBy(e.target.value)}
                className="w-full bg-white border border-[#d3d1cb] rounded-[3px] px-2 py-1.5 text-xs text-[#37352f]"
                required
              />
            </div>

            <div>
              <label className="text-[10.5px] font-semibold text-[#5a5854] block mb-1">
                接班人 (接岗员工)
              </label>
              <input
                type="text"
                value={successor}
                onChange={(e) => setSuccessor(e.target.value)}
                className="w-full bg-white border border-[#d3d1cb] rounded-[3px] px-2 py-1.5 text-xs text-[#37352f]"
                required
              />
            </div>

            <div>
              <label className="text-[10.5px] font-semibold text-[#5a5854] block mb-1">
                钱箱实点现金 (¥)
              </label>
              <input
                type="number"
                step="0.1"
                value={actualCashInput}
                onChange={(e) => setActualCashInput(e.target.value)}
                className="w-full bg-white border border-[#d3d1cb] rounded-[3px] px-2 py-1.5 text-xs text-[#37352f] font-mono"
                required
              />
            </div>

            <div>
              <label className="text-[10.5px] font-semibold text-[#5a5854] block mb-1">
                现金差异归因 (如 $\neq$ 0)
              </label>
              <select
                value={diffReason}
                onChange={(e) => setDiffReason(e.target.value as any)}
                className="w-full bg-white border border-[#d3d1cb] rounded-[3px] px-2 py-1.5 text-xs text-[#37352f]"
              >
                <option value="none">无差异 (吻合)</option>
                <option value="count_error">点钞清点误差</option>
                <option value="change_error">现金找零失误</option>
                <option value="unrecorded_sale">线下漏单/未录入</option>
                <option value="discount_mis">折扣优惠遗漏</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10.5px] font-semibold text-[#5a5854] block mb-1">
                交班备注与事项说明
              </label>
              <input
                type="text"
                value={shiftNote}
                onChange={(e) => setShiftNote(e.target.value)}
                className="w-full bg-white border border-[#d3d1cb] rounded-[3px] px-2 py-1.5 text-xs text-[#37352f]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsClosingShift(false)}
              className="px-3 py-1 bg-[#efefed] hover:bg-[#e6e6e4] text-[#5a5854] rounded-[3px] font-semibold text-xs cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-1 bg-[#2b593f] hover:bg-[#204430] text-white rounded-[3px] font-semibold text-xs cursor-pointer shadow-xs flex items-center gap-1"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>确认结算并打印交班单</span>
            </button>
          </div>
        </form>
      )}

      {/* 3. Modal / Form: Refund */}
      {isCreatingRefund && subTab === 'refund' && (
        <form
          onSubmit={handleCreateRefundSubmit}
          className="bg-[#fbfbfa] p-4 rounded-[3px] border border-[#d44333] space-y-3 shadow-sm animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between border-b border-[#e6e6e4] pb-2">
            <h4 className="font-bold text-xs text-[#37352f] flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-[#d44333]" />
              <span>发起原路退款 / 退菜审计申请</span>
            </h4>
            <span className="text-[10px] text-[#787774]">
              超 ¥200 触发主管授权 · 已制作退菜自动记入损耗
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10.5px] font-semibold text-[#5a5854] block mb-1">关联工单号</label>
              <input
                type="text"
                value={refundOrderNo}
                onChange={(e) => setRefundOrderNo(e.target.value)}
                className="w-full bg-white border border-[#d3d1cb] rounded-[3px] px-2 py-1.5 text-xs text-[#37352f] font-mono"
                required
              />
            </div>

            <div>
              <label className="text-[10.5px] font-semibold text-[#5a5854] block mb-1">
                退款金额 (¥)
              </label>
              <input
                type="number"
                step="0.1"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="w-full bg-white border border-[#d3d1cb] rounded-[3px] px-2 py-1.5 text-xs text-[#37352f] font-mono"
                required
              />
            </div>

            <div>
              <label className="text-[10.5px] font-semibold text-[#5a5854] block mb-1">退款原因归类</label>
              <select
                value={refundReasonCategory}
                onChange={(e) => setRefundReasonCategory(e.target.value)}
                className="w-full bg-white border border-[#d3d1cb] rounded-[3px] px-2 py-1.5 text-xs text-[#37352f]"
              >
                <option value="taste_dislike">口味不适 / 咸淡要求</option>
                <option value="timeout">后厨上菜超时催单</option>
                <option value="customer_cancel">顾客赶时间变卦取消</option>
                <option value="soldout">菜品临时沽清售罄</option>
                <option value="order_error">服务员错点 / 错单</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10.5px] font-semibold text-[#5a5854] block mb-1">详细原因备注</label>
              <input
                type="text"
                value={refundReasonNote}
                onChange={(e) => setRefundReasonNote(e.target.value)}
                className="w-full bg-white border border-[#d3d1cb] rounded-[3px] px-2 py-1.5 text-xs text-[#37352f]"
                required
              />
            </div>

            <div>
              <label className="text-[10.5px] font-semibold text-[#5a5854] block mb-1">
                主管授权密码 (超 ¥200 必填, 演示: 8888)
              </label>
              <input
                type="password"
                value={managerAuthPin}
                onChange={(e) => setManagerAuthPin(e.target.value)}
                placeholder="输入 4 位主管 PIN"
                className="w-full bg-white border border-[#d3d1cb] rounded-[3px] px-2 py-1.5 text-xs text-[#37352f] font-mono"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-1">
            <label className="flex items-center gap-1.5 text-[11px] text-[#37352f] cursor-pointer">
              <input
                type="checkbox"
                checked={notifyKitchen}
                onChange={(e) => setNotifyKitchen(e.target.checked)}
                className="rounded text-[#2b593f]"
              />
              <span>通知后厨取消制作 (KDS联动)</span>
            </label>

            <label className="flex items-center gap-1.5 text-[11px] text-[#d44333] font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={cookedIsLoss}
                onChange={(e) => setCookedIsLoss(e.target.checked)}
                className="rounded text-[#d44333]"
              />
              <span>已制作退菜 $\to$ 自动记入厨房报损单 (cookedIsLoss)</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsCreatingRefund(false)}
              className="px-3 py-1 bg-[#efefed] hover:bg-[#e6e6e4] text-[#5a5854] rounded-[3px] font-semibold text-xs cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-1 bg-[#d44333] hover:bg-[#b03022] text-white rounded-[3px] font-semibold text-xs cursor-pointer shadow-xs"
            >
              确认原路退款
            </button>
          </div>
        </form>
      )}

      {/* 4. Modal / Form: Reservation */}
      {isAddingReservation && subTab === 'reservation' && (
        <form
          onSubmit={handleAddReservationSubmit}
          className="bg-[#fbfbfa] p-4 rounded-[3px] border border-[#1c5598] space-y-3 shadow-sm animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between border-b border-[#e6e6e4] pb-2">
            <h4 className="font-bold text-xs text-[#37352f] flex items-center gap-1.5">
              <CalendarCheck className="w-3.5 h-3.5 text-[#1c5598]" />
              <span>录入桌台预约 Pipeline (Reservations)</span>
            </h4>
            <span className="text-[10px] text-[#787774]">
              支持提前锁定餐位、收取订金与到店提醒
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10.5px] font-semibold text-[#5a5854] block mb-1">顾客姓名 / 称呼</label>
              <input
                type="text"
                value={resName}
                onChange={(e) => setResName(e.target.value)}
                className="w-full bg-white border border-[#d3d1cb] rounded-[3px] px-2 py-1.5 text-xs text-[#37352f]"
                required
              />
            </div>

            <div>
              <label className="text-[10.5px] font-semibold text-[#5a5854] block mb-1">预留联系电话</label>
              <input
                type="text"
                value={resPhone}
                onChange={(e) => setResPhone(e.target.value)}
                className="w-full bg-white border border-[#d3d1cb] rounded-[3px] px-2 py-1.5 text-xs text-[#37352f]"
                required
              />
            </div>

            <div>
              <label className="text-[10.5px] font-semibold text-[#5a5854] block mb-1">就餐人数</label>
              <input
                type="number"
                value={resCount}
                onChange={(e) => setResCount(e.target.value)}
                className="w-full bg-white border border-[#d3d1cb] rounded-[3px] px-2 py-1.5 text-xs text-[#37352f] font-mono"
                required
              />
            </div>

            <div>
              <label className="text-[10.5px] font-semibold text-[#5a5854] block mb-1">锁定桌台编号</label>
              <input
                type="text"
                value={resTable}
                onChange={(e) => setResTable(e.target.value)}
                className="w-full bg-white border border-[#d3d1cb] rounded-[3px] px-2 py-1.5 text-xs text-[#37352f] font-mono"
                required
              />
            </div>

            <div>
              <label className="text-[10.5px] font-semibold text-[#5a5854] block mb-1">预约到达时间</label>
              <input
                type="text"
                value={resTime}
                onChange={(e) => setResTime(e.target.value)}
                className="w-full bg-white border border-[#d3d1cb] rounded-[3px] px-2 py-1.5 text-xs text-[#37352f] font-mono"
                required
              />
            </div>

            <div>
              <label className="text-[10.5px] font-semibold text-[#5a5854] block mb-1">
                预收定金金额 (¥)
              </label>
              <input
                type="number"
                value={resDeposit}
                onChange={(e) => setResDeposit(e.target.value)}
                className="w-full bg-white border border-[#d3d1cb] rounded-[3px] px-2 py-1.5 text-xs text-[#37352f] font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[10.5px] font-semibold text-[#5a5854] block mb-1">特殊需求与备注</label>
            <input
              type="text"
              value={resNote}
              onChange={(e) => setResNote(e.target.value)}
              className="w-full bg-white border border-[#d3d1cb] rounded-[3px] px-2 py-1.5 text-xs text-[#37352f]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAddingReservation(false)}
              className="px-3 py-1 bg-[#efefed] hover:bg-[#e6e6e4] text-[#5a5854] rounded-[3px] font-semibold text-xs cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-1 bg-[#1c5598] hover:bg-[#143e70] text-white rounded-[3px] font-semibold text-xs cursor-pointer shadow-xs"
            >
              确认预约并锁定桌台
            </button>
          </div>
        </form>
      )}

      {/* 5. Shifts List View */}
      {subTab === 'shift' && (
        <div className="bg-white rounded-[3px] border border-[#e6e6e4] overflow-hidden shadow-2xs">
          <div className="p-3 bg-[#f7f7f5] border-b border-[#e6e6e4] flex items-center justify-between">
            <h4 className="font-bold text-xs text-[#37352f] flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5 text-[#2b593f]" />
              <span>历史班次营收与现金钱箱对账单 (Shift Logs)</span>
            </h4>
            <span className="text-[10px] text-[#787774]">T+0 实时结交 · 差异自动入账</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e6e6e4] bg-[#fbfbfa] text-[#787774] text-[10.5px]">
                  <th className="p-2.5 font-bold">班次/时间</th>
                  <th className="p-2.5 font-bold">交接人员</th>
                  <th className="p-2.5 font-bold">班次总营收</th>
                  <th className="p-2.5 font-bold">微信 / 支付宝 / 现金</th>
                  <th className="p-2.5 font-bold">实点现金 vs 差异</th>
                  <th className="p-2.5 font-bold">钱箱差异说明</th>
                  <th className="p-2.5 font-bold">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#efefed]">
                {shifts.map((s) => (
                  <tr key={s.id} className="hover:bg-[#fbfbfa] transition-colors">
                    <td className="p-2.5">
                      <span className="font-mono font-bold text-xs text-[#37352f] block">{s.shiftNo}</span>
                      <span className="text-[10px] text-[#787774]">
                        {s.startTime} - {s.endTime} ({s.orderCount}单)
                      </span>
                    </td>

                    <td className="p-2.5 text-xs">
                      <span className="text-[#37352f] font-semibold">{s.closedBy}</span>
                      <span className="text-[#787774] block text-[10px]">
                        接班: {s.successor}
                      </span>
                    </td>

                    <td className="p-2.5">
                      <span className="font-mono font-bold text-sm text-[#2b593f]">
                        ¥{s.grossSales.toFixed(2)}
                      </span>
                    </td>

                    <td className="p-2.5 font-mono text-[11px] text-[#5a5854]">
                      <div>微: ¥{s.wechatSales.toFixed(1)}</div>
                      <div>支: ¥{s.alipaySales.toFixed(1)} / 现: ¥{s.cashSales.toFixed(1)}</div>
                    </td>

                    <td className="p-2.5">
                      <span className="font-mono font-bold text-xs text-[#37352f] block">
                        ¥{s.actualCash.toFixed(1)}
                      </span>
                      <span
                        className={`font-mono text-[10px] font-bold ${
                          s.cashDiff === 0
                            ? 'text-[#2b593f]'
                            : 'text-[#d44333]'
                        }`}
                      >
                        {s.cashDiff === 0 ? '平账 0.0' : `差异 ¥${s.cashDiff.toFixed(1)}`}
                      </span>
                    </td>

                    <td className="p-2.5 text-xs text-[#5a5854] max-w-xs">
                      <span className="block text-[10.5px]">{s.diffReasonText}</span>
                      {s.note && <span className="text-[10px] text-[#787774] italic">{s.note}</span>}
                    </td>

                    <td className="p-2.5">
                      <button
                        type="button"
                        onClick={() => showToast(`已重新补打班次 ${s.shiftNo} 交班小票！`)}
                        className="px-2 py-1 bg-[#f1f1ef] hover:bg-[#e8e8e6] text-[#37352f] rounded-[2px] font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3 h-3" />
                        <span>补打</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Refund List View */}
      {subTab === 'refund' && (
        <div className="bg-white rounded-[3px] border border-[#e6e6e4] overflow-hidden shadow-2xs">
          <div className="p-3 bg-[#f7f7f5] border-b border-[#e6e6e4] flex items-center justify-between">
            <h4 className="font-bold text-xs text-[#37352f] flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-[#d44333]" />
              <span>退款退菜审批与授权明细 (Refund &amp; Return Logs)</span>
            </h4>
            <span className="text-[10px] text-[#787774]">已制作退菜自动记入损耗</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e6e6e4] bg-[#fbfbfa] text-[#787774] text-[10.5px]">
                  <th className="p-2.5 font-bold">退款单号/时间</th>
                  <th className="p-2.5 font-bold">工单号</th>
                  <th className="p-2.5 font-bold">退款金额 &amp; 方式</th>
                  <th className="p-2.5 font-bold">退款原因</th>
                  <th className="p-2.5 font-bold">主管授权人</th>
                  <th className="p-2.5 font-bold">损耗状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#efefed]">
                {refunds.map((r) => (
                  <tr key={r.id} className="hover:bg-[#fbfbfa] transition-colors">
                    <td className="p-2.5">
                      <span className="font-mono font-bold text-xs text-[#37352f] block">{r.refundNo}</span>
                      <span className="text-[10px] text-[#787774]">{r.date}</span>
                    </td>

                    <td className="p-2.5 font-mono text-xs font-semibold text-[#37352f]">
                      {r.orderNo}
                    </td>

                    <td className="p-2.5">
                      <span className="font-mono font-bold text-sm text-[#d44333] block">
                        ¥{r.amount.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-[#787774]">{r.method}</span>
                    </td>

                    <td className="p-2.5 text-xs text-[#5a5854] max-w-xs">
                      <span className="font-semibold text-[#37352f] block">
                        {r.reasonCategory === 'taste_dislike'
                          ? '口味不适'
                          : r.reasonCategory === 'customer_cancel'
                          ? '顾客取消'
                          : '其他原因'}
                      </span>
                      <span className="text-[10.5px] text-[#787774]">{r.reasonNote}</span>
                    </td>

                    <td className="p-2.5 text-xs text-[#37352f]">
                      <span className="flex items-center gap-1 font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#2b593f]" />
                        <span>{r.authorizedBy}</span>
                      </span>
                    </td>

                    <td className="p-2.5">
                      {r.cookedIsLoss ? (
                        <span className="text-[10px] bg-[#fde8e8] text-[#d44333] border border-[#f8b4b4] px-1.5 py-0.5 rounded font-bold">
                          已记入厨房报损
                        </span>
                      ) : (
                        <span className="text-[10px] bg-[#edf3ec] text-[#2b593f] border border-[#c4dcbc] px-1.5 py-0.5 rounded font-bold">
                          未制作免报损
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

      {/* 7. Reservation List View */}
      {subTab === 'reservation' && (
        <div className="bg-white rounded-[3px] border border-[#e6e6e4] overflow-hidden shadow-2xs">
          <div className="p-3 bg-[#f7f7f5] border-b border-[#e6e6e4] flex items-center justify-between">
            <h4 className="font-bold text-xs text-[#37352f] flex items-center gap-1.5">
              <CalendarCheck className="w-3.5 h-3.5 text-[#1c5598]" />
              <span>桌台预约与定金预收管线 (Reservation Pipeline)</span>
            </h4>
            <span className="text-[10px] text-[#787774]">支持提前锁定与到店提醒</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e6e6e4] bg-[#fbfbfa] text-[#787774] text-[10.5px]">
                  <th className="p-2.5 font-bold">顾客姓名/人数</th>
                  <th className="p-2.5 font-bold">联系电话</th>
                  <th className="p-2.5 font-bold">锁定桌台</th>
                  <th className="p-2.5 font-bold">预约时间 &amp; 倒计时</th>
                  <th className="p-2.5 font-bold">定金状态</th>
                  <th className="p-2.5 font-bold">备注需求</th>
                  <th className="p-2.5 font-bold">状态/操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#efefed]">
                {reservations.map((res) => (
                  <tr key={res.id} className="hover:bg-[#fbfbfa] transition-colors">
                    <td className="p-2.5">
                      <span className="font-bold text-xs text-[#37352f] block">{res.guestName}</span>
                      <span className="text-[10px] text-[#787774]">{res.guestCount} 位贵宾</span>
                    </td>

                    <td className="p-2.5 font-mono text-xs text-[#5a5854]">
                      {res.phone}
                    </td>

                    <td className="p-2.5">
                      <span className="font-mono font-bold text-xs bg-[#37352f] text-white px-2 py-0.5 rounded-[2px]">
                        桌台 {res.tableCode}
                      </span>
                    </td>

                    <td className="p-2.5">
                      <span className="font-mono font-bold text-xs text-[#37352f] block">
                        {res.reservationTime}
                      </span>
                      {res.status === 'confirmed' && (
                        <span className="text-[10px] font-mono text-[#d9730d] font-bold">
                          距到店 {res.countdownMin}m
                        </span>
                      )}
                    </td>

                    <td className="p-2.5">
                      <span className="font-mono font-bold text-xs text-[#2b593f] block">
                        ¥{res.depositAmount.toFixed(1)}
                      </span>
                      <span className="text-[10px] text-[#2b593f]">已付定金</span>
                    </td>

                    <td className="p-2.5 text-xs text-[#5a5854] max-w-xs">
                      {res.note || '-'}
                    </td>

                    <td className="p-2.5">
                      {res.status === 'confirmed' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setReservations((prev) =>
                              prev.map((item) =>
                                item.id === res.id ? { ...item, status: 'arrived' } : item
                              )
                            );
                            showToast(`顾客 ${res.guestName} 已到店！桌台 ${res.tableCode} 已自动转为就餐中。`);
                          }}
                          className="px-2.5 py-1 bg-[#2b593f] hover:bg-[#204430] text-white rounded-[2px] font-semibold text-[11px] cursor-pointer"
                        >
                          确认到店开台
                        </button>
                      ) : (
                        <span className="text-[10px] bg-[#edf3ec] text-[#2b593f] px-1.5 py-0.5 rounded font-bold">
                          已入座消费
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
    </div>
  );
};
