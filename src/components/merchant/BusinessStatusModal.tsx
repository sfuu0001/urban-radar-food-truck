import React, { useState } from 'react';
import {
  Power,
  Clock,
  AlertTriangle,
  CheckCircle2,
  X,
  Sparkles,
  Info,
  Calendar,
  Store,
  Bell
} from 'lucide-react';
import {
  BusinessStatusConfig,
  getBusinessStatus,
  setBusinessStatus,
  toggleBusinessOperating
} from '../../utils/businessStatusEngine';
import { useToast } from '../ui/ToastContext';

interface BusinessStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  truckName?: string;
  onStatusChanged?: (status: BusinessStatusConfig) => void;
}

export const BusinessStatusModal: React.FC<BusinessStatusModalProps> = ({
  isOpen,
  onClose,
  truckName = '黑曜石 01 号流动餐车',
  onStatusChanged
}) => {
  const toast = useToast();
  const [currentConfig, setCurrentConfig] = useState<BusinessStatusConfig>(() => getBusinessStatus());
  const [targetIsOpen, setTargetIsOpen] = useState<boolean>(currentConfig.isOpen);
  const [reasonInput, setReasonInput] = useState<string>(currentConfig.closeReason);
  const [reopenTimeInput, setReopenTimeInput] = useState<string>(currentConfig.reopenTime);
  const [autoAcceptOrders, setAutoAcceptOrders] = useState<boolean>(currentConfig.autoAcceptOrders);

  if (!isOpen) return null;

  const quickPresets = [
    {
      label: '晚市正常打烊',
      reason: '今日晚市已打烊，食材盘点中，明日 11:00 起恢复接单',
      reopen: '明日 11:00'
    },
    {
      label: '高峰备料中 (15分钟)',
      reason: '客流高峰食材紧急补给中，暂停接单 15 分钟',
      reopen: '15 分钟后'
    },
    {
      label: '餐车转场移位 (30分钟)',
      reason: '餐车正在前往新商圈指定停靠点，转场中暂停接单',
      reopen: '30 分钟后'
    },
    {
      label: '恶劣暴雨天气避险',
      reason: '受突发暴雨雷电影响，为保障安全临时歇业暂停接单',
      reopen: '视天气情况恢复'
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = setBusinessStatus(
      {
        isOpen: targetIsOpen,
        statusLabel: targetIsOpen ? '营业中' : '已打烊 · 暂停接单',
        closeReason: targetIsOpen ? '餐车站台正常营运，主理人炭火现烤接单中' : reasonInput,
        reopenTime: targetIsOpen ? '正常接单中' : reopenTimeInput,
        autoAcceptOrders
      },
      '餐车主理人'
    );

    setCurrentConfig(updated);
    onStatusChanged?.(updated);

    if (targetIsOpen) {
      toast.success('餐车已恢复全网接单！', '食客端打烊横幅已撤除，在线支付与点单已重新激活。');
    } else {
      toast.info('餐车已设为【已打烊/暂停接单】', `前台已同步提示打烊：${reasonInput}`);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white rounded-[6px] shadow-2xl border border-[#e6e6e4] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#f1f1ef] bg-[#fbfbfa]">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-[4px] flex items-center justify-center font-bold text-white shadow-2xs ${
                targetIsOpen ? 'bg-[#2b593f]' : 'bg-[#d44333]'
              }`}
            >
              <Store className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#201f1d]">流动餐车营业状态总控中心</h3>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    targetIsOpen
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {targetIsOpen ? '营业接单中' : '已打烊歇业'}
                </span>
              </div>
              <p className="text-[11px] text-[#787774] mt-0.5">{truckName}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#787774] hover:text-[#201f1d] hover:bg-[#f1f1ef] rounded-[3px] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 text-xs">
          {/* Toggle Switch Selector */}
          <div className="p-3 bg-[#f7f7f5] rounded-[4px] border border-[#e6e6e4] space-y-2">
            <label className="font-bold text-[#37352f] block">选择当前营业接单模式:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setTargetIsOpen(true);
                  setReopenTimeInput('正常接单中');
                }}
                className={`p-3 rounded-[3px] border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  targetIsOpen
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-900 shadow-2xs ring-1 ring-emerald-600'
                    : 'bg-white border-[#d3d1cb] text-[#787774] hover:bg-[#fafaf8]'
                }`}
              >
                <span className="text-lg">🟢</span>
                <span className="font-bold text-xs">营业中 (恢复接单)</span>
                <span className="text-[10px] text-[#787774]">食客可自由下单并在线结账</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTargetIsOpen(false);
                  if (reopenTimeInput === '正常接单中') {
                    setReopenTimeInput('明日 11:00');
                  }
                }}
                className={`p-3 rounded-[3px] border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  !targetIsOpen
                    ? 'bg-rose-50 border-rose-600 text-rose-900 shadow-2xs ring-1 ring-rose-600'
                    : 'bg-white border-[#d3d1cb] text-[#787774] hover:bg-[#fafaf8]'
                }`}
              >
                <span className="text-lg">🔴</span>
                <span className="font-bold text-xs">已打烊 (暂停接单)</span>
                <span className="text-[10px] text-[#787774]">前台禁用结算，提示打烊</span>
              </button>
            </div>
          </div>

          {/* If Closed, Configure Reason and Reopen Time */}
          {!targetIsOpen && (
            <div className="space-y-3 p-3 bg-amber-50/70 border border-amber-200 rounded-[4px] animate-in fade-in">
              <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>歇业打烊配置 (将实时同步至食客前台)</span>
              </div>

              {/* Quick Presets */}
              <div className="space-y-1">
                <span className="text-[11px] text-[#787774]">常用快速模版:</span>
                <div className="flex flex-wrap gap-1.5">
                  {quickPresets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setReasonInput(preset.reason);
                        setReopenTimeInput(preset.reopen);
                      }}
                      className="px-2 py-1 bg-white hover:bg-amber-100/60 border border-amber-300 text-amber-900 text-[10.5px] rounded-[2px] cursor-pointer transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason Input */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-[#37352f]">
                  前台公示打烊说明 *
                </label>
                <input
                  type="text"
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  placeholder="如: 今日已打烊，明日 11:00 起恢复出餐"
                  className="w-full px-2.5 py-1.5 rounded-[3px] bg-white border border-[#d3d1cb] text-xs focus:border-[#37352f] outline-none"
                  required
                />
              </div>

              {/* Reopen Time Input */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-[#37352f]">
                  预计重新开门/出餐时间 *
                </label>
                <input
                  type="text"
                  value={reopenTimeInput}
                  onChange={(e) => setReopenTimeInput(e.target.value)}
                  placeholder="如: 明日 11:00 / 20分钟后"
                  className="w-full px-2.5 py-1.5 rounded-[3px] bg-white border border-[#d3d1cb] text-xs focus:border-[#37352f] outline-none"
                  required
                />
              </div>
            </div>
          )}

          {/* Auto-accept Toggle */}
          <div className="flex items-center justify-between p-2.5 bg-[#fbfbfa] border border-[#e6e6e4] rounded-[3px]">
            <div className="space-y-0.5">
              <span className="font-bold text-[#37352f] block">新订单自动确认入后厨 KDS</span>
              <span className="text-[10.5px] text-[#787774]">
                开启后，食客下单即自动推入后厨烤架，无需店长逐笔点击“接单”
              </span>
            </div>
            <input
              type="checkbox"
              checked={autoAcceptOrders}
              onChange={(e) => setAutoAcceptOrders(e.target.checked)}
              className="w-4 h-4 accent-[#2b593f] cursor-pointer"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f1f1ef]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-[#efefed] hover:bg-[#e6e6e4] text-[#37352f] rounded-[3px] font-medium cursor-pointer transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className={`px-4 py-1.5 rounded-[3px] text-white font-bold transition-all shadow-2xs cursor-pointer ${
                targetIsOpen
                  ? 'bg-[#2b593f] hover:bg-[#204430]'
                  : 'bg-[#d44333] hover:bg-[#b03022]'
              }`}
            >
              确认并同步状态
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
