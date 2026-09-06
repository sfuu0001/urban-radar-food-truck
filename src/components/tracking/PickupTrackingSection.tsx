import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  PackageCheck,
  QrCode,
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  ChevronRight,
  Flame,
  Layers,
  ShieldCheck,
  Sparkles,
  Maximize2,
  X,
  Navigation,
  Lock,
  ThermometerSnowflake
} from 'lucide-react';
import { Order, TableDishItem } from '../../types';
import { speakText } from '../../utils/voiceAlertEngine';

interface PickupTrackingSectionProps {
  order: Order;
  onBackToMenu?: () => void;
  showToast: (msg: string) => void;
}

const DEFAULT_PICKUP_FLOW_STEPS = [
  { key: 'placed', title: '提交订单支付', desc: '订单支付成功，已同步至流动餐车中枢', defaultTime: '12:30', operator: '食客本人' },
  { key: 'accepted', title: '餐车主理人接单', desc: '餐车排单确认，食材备料准备制作', defaultTime: '12:31', operator: '主理人阿豪' },
  { key: 'cooking_packing', title: '炭火现制与封签', desc: '现烤出炉，采用耐高温双层锁鲜环保餐盒与保鲜贴签', defaultTime: '12:36', operator: '炭烤与封装岗' },
  { key: 'ready_pickup', title: '放入恒温取餐柜', desc: '放入 01 号智能保温格 (65℃恒温)，生成取餐校验码', defaultTime: '12:40', operator: '取餐中枢' },
  { key: 'picked_up', title: '到店扫码取餐', desc: '顾客凭取餐码开柜提取，全流程履约圆满完成', operator: '核销系统' }
];

export const PickupTrackingSection: React.FC<PickupTrackingSectionProps> = ({
  order,
  onBackToMenu,
  showToast
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isUrging, setIsUrging] = useState(false);

  // Fallback dishes
  const pickupDishes = order.items && order.items.length > 0
    ? order.items
    : [
        {
          name: '果木烟熏黑豚炙烤五花',
          quantity: 1,
          price: 55.0,
          options: '果木微熏香甜',
          serveStatus: 'ready_to_serve',
          prepProgress: 100,
          station: '已装盒贴封签'
        },
        {
          name: '黑曜石松露金黄脆薯',
          quantity: 1,
          price: 32.0,
          options: '黑松露美乃滋',
          serveStatus: 'ready_to_serve',
          prepProgress: 100,
          station: '01号智能保温格'
        }
      ];

  const pickupCode = order.pickupCode || '8806';
  const lockerShelf = order.pickupShelfCode || '01 号智能保温取餐柜 (65℃恒温)';
  const truckName = order.truckName || '黑曜石 01 号流动餐车';
  const truckLocation = order.deliveryAddress || '西藏北路 166 号大悦城南广场外摆站台';

  const isReady = order.status === 'ready' || order.status === 'waiting_pickup' || order.statusType === 'ready' || true;

  const handleCopyCode = () => {
    try {
      navigator.clipboard.writeText(pickupCode);
      setCopiedCode(true);
      showToast(`已复制取餐码: ${pickupCode}`);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      showToast(`取餐码: ${pickupCode}`);
    }
  };

  const handleUrgePickup = () => {
    setIsUrging(true);
    speakText(`取餐码 ${pickupCode} 顾客已到店催单`, { chimeType: 'bell' });
    showToast('已向餐车吧台发送【到店催取】提醒，主理人正在优先为您装袋！');
    setTimeout(() => setIsUrging(false), 3000);
  };

  const handleNavigateToTruck = () => {
    showToast(`已开启高德步行导航至：${truckLocation}（距您约 280 米）`);
  };

  const handleCallTruck = () => {
    showToast(`正在呼叫餐车主理人电话 (139-8822-9804)`);
  };

  return (
    <div className="space-y-3 p-3 sm:p-4 bg-white">
      {/* 1. Core Pickup Credential Card (取餐核心凭证) */}
      <div className="bg-gradient-to-br from-[#1c1c1a] to-[#2b2b28] text-white rounded-none p-4 sm:p-5 shadow-md border border-neutral-800 space-y-3 relative overflow-hidden">
        {/* Background glow watermark */}
        <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10.5px] tracking-wider uppercase text-emerald-400 font-black flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>智能恒温取餐凭证</span>
            </span>
            <h2 className="text-xs sm:text-sm font-bold text-neutral-300 mt-0.5">
              到店自提 · 凭码核销取餐
            </h2>
          </div>

          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            {isReady ? '出餐就绪 · 随时可取' : '制作打包中'}
          </span>
        </div>

        {/* Big Monospace Code Display */}
        <div className="bg-black/40 border border-white/10 rounded-none p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 backdrop-blur-sm">
          <div>
            <span className="text-[10px] text-neutral-400 block font-medium">您的专属取餐码</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-mono text-3xl sm:text-4xl font-black text-white tracking-widest text-emerald-400">
                #{pickupCode}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 py-0.5 px-1.5 rounded-none bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
              >
                {copiedCode ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCode ? '已复制' : '复制'}</span>
              </button>
            </div>
          </div>

          {/* Barcode / QR Thumbnail with Tap-to-Enlarge */}
          <button
            type="button"
            onClick={() => setIsQrModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-none bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white transition-all cursor-pointer group"
          >
            <QrCode className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <span className="block leading-tight">出示大字条形码</span>
              <span className="text-[9.5px] text-neutral-400 block font-normal">点击放大扫码开柜</span>
            </div>
            <Maximize2 className="w-3.5 h-3.5 text-neutral-400 ml-1" />
          </button>
        </div>

        {/* Smart Locker Location */}
        <div className="flex items-center gap-2 pt-1 text-xs text-neutral-300">
          <div className="w-5 h-5 rounded-none bg-white/10 flex items-center justify-center shrink-0">
            <ThermometerSnowflake className="w-3 h-3 text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] text-neutral-400 block">取餐窗口 / 保温格位:</span>
            <span className="font-bold text-white truncate block">{lockerShelf}</span>
          </div>
        </div>
      </div>

      {/* 2. Real-time Dish Packing & Kitchen Prep Matrix (自提出餐打包与制作情况) */}
      <div className="bg-white border border-[#e2e3e1] rounded-none p-3 sm:p-3.5 shadow-2xs space-y-3">
        {/* Progress Header */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#1a1c1b] flex items-center gap-1.5">
              <PackageCheck className="w-4 h-4 text-emerald-600" />
              <span>自提出餐打包与制作进展</span>
            </span>
            <span className="font-mono font-bold text-xs text-emerald-700">
              全单齐备 (100%)
            </span>
          </div>

          <div className="h-2 w-full bg-[#f0f0ed] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 w-full" />
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#787774] pt-0.5">
            <span className="flex items-center gap-1 text-emerald-700 font-bold">
              <CheckCircle2 className="w-3 h-3" />
              <span>已入柜保温: {pickupDishes.length} 份</span>
            </span>
            <span>恒温箱设定: <strong>65℃</strong> 恒温锁鲜</span>
          </div>
        </div>

        {/* Dish Items List */}
        <div className="space-y-2">
          {pickupDishes.map((dish, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-none bg-[#fbfcfb] border border-[#ddead8] flex items-start justify-between gap-2"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-none bg-[#edf3ec] text-[#2b593f] flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-[13px] font-bold text-[#1a1c1b] leading-tight">
                    {dish.name}
                  </h4>
                  {dish.options && (
                    <p className="text-[10px] text-[#787774] mt-0.5">
                      规格: {dish.options}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-[#787774]">
                    <span>单价 ¥{dish.price.toFixed(2)}</span>
                    <span>·</span>
                    <span className="font-bold text-[#1a1c1b]">x{dish.quantity} 份</span>
                    <span>·</span>
                    <span className="font-bold text-emerald-800">
                      小计 ¥{(dish.price * dish.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0 space-y-0.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-none bg-[#edf3ec] text-[#2b593f] border border-[#c4dcbc]">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>已入柜保温</span>
                </span>
                <p className="text-[9px] font-mono text-neutral-400">{dish.station || '01号智能格'}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons for Pickup Customer */}
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#f0f0ed]">
          <button
            type="button"
            onClick={handleUrgePickup}
            disabled={isUrging}
            className="py-2 px-2 rounded-none text-xs font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 flex items-center justify-center gap-1 cursor-pointer transition-all shadow-2xs"
            title="通知餐车吧台加急处理"
          >
            <AlertCircle className={`w-3.5 h-3.5 ${isUrging ? 'animate-spin' : ''}`} />
            <span>{isUrging ? '已通知...' : '一键催单加急'}</span>
          </button>

          <button
            type="button"
            onClick={handleNavigateToTruck}
            className="py-2 px-2 rounded-none text-xs font-bold bg-[#f4f4f2] hover:bg-[#ebebe7] text-[#1a1c1b] border border-[#deded8] flex items-center justify-center gap-1 cursor-pointer transition-all shadow-2xs"
            title="查看流动餐车站台位置与路线"
          >
            <Navigation className="w-3.5 h-3.5 text-emerald-600" />
            <span>导航至餐车</span>
          </button>

          <button
            type="button"
            onClick={handleCallTruck}
            className="py-2 px-2 rounded-none text-xs font-bold bg-[#edf3ec] hover:bg-[#ddead8] text-[#2b593f] border border-[#c4dcbc] flex items-center justify-center gap-1 cursor-pointer transition-all shadow-2xs"
            title="直接致电餐车主理人"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>致电吧台</span>
          </button>
        </div>
      </div>

      {/* 3. Pickup Flow Nodes (自提状态流转节点) */}
      <div className="bg-white border border-[#e2e3e1] rounded-none p-3 sm:p-3.5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[#1a1c1b] flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-emerald-700" />
            <span>到店自提状态流转节点</span>
          </span>
          <span className="text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded-none font-medium">
            5步全流程可溯
          </span>
        </div>

        <div className="space-y-2 relative before:absolute before:top-3 before:bottom-3 before:left-3.5 before:w-0.5 before:bg-[#e6e6e1] before:z-0">
          {DEFAULT_PICKUP_FLOW_STEPS.map((step, idx) => {
            const isCompleted = idx <= 3; // 4th step is ready
            const isCurrent = idx === 3;

            return (
              <div key={step.key} className="relative z-1 flex items-start gap-2.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                    isCompleted
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : isCurrent
                      ? 'bg-white text-emerald-700 border-2 border-emerald-700 ring-2 ring-emerald-100 scale-105'
                      : 'bg-[#f4f4f2] text-[#8c8b84] border-[#d8d8d3]'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  ) : (
                    <span className="font-mono text-xs font-bold">{idx + 1}</span>
                  )}
                </div>

                <div
                  className={`flex-1 p-2 rounded-none border transition-all ${
                    isCurrent
                      ? 'bg-emerald-50/70 border-emerald-200'
                      : isCompleted
                      ? 'bg-neutral-50/60 border-neutral-200/80'
                      : 'bg-white border-[#ecece8]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-bold ${isCurrent ? 'text-emerald-800' : 'text-[#1a1c1b]'}`}>
                      {step.title}
                    </span>
                    <span className="text-[10px] font-mono text-[#787774]">
                      {step.defaultTime || (isCompleted ? '已达成' : '待到店')}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-[#787774] mt-0.5 leading-relaxed">{step.desc}</p>
                  <div className="flex items-center justify-between text-[9.5px] text-neutral-400 mt-1 pt-1 border-t border-neutral-100">
                    <span>处理主体: {step.operator}</span>
                    <span className={`font-bold ${isCompleted ? 'text-emerald-700' : 'text-neutral-400'}`}>
                      {isCompleted ? (isCurrent ? '● 出餐待取' : '● 已完成') : '○ 待核销'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Food Truck Stand Address & Info */}
      <div className="p-3 bg-[#f8f9fa] border border-[#e5e7eb] rounded-none text-xs space-y-1.5">
        <div className="flex items-center justify-between text-[#787774] font-medium">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span>自提餐车站台位置</span>
          </span>
          <span className="font-mono text-[10px] text-emerald-700 font-bold">距您约 280m</span>
        </div>
        <p className="text-xs font-bold text-[#1a1c1b]">{truckName}</p>
        <p className="text-[11px] text-[#4b5563]">{truckLocation}</p>
      </div>

      {/* Fullscreen QR & Barcode Modal for Locker Screen */}
      <AnimatePresence>
        {isQrModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={() => setIsQrModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white rounded-none p-6 text-center space-y-4 shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
                  智能保温柜核销凭证
                </span>
                <h3 className="text-lg font-black text-black mt-0.5">请对准取餐柜扫码口</h3>
              </div>

              {/* Big Monospace Code */}
              <div className="py-2">
                <span className="font-mono text-5xl font-black text-black tracking-widest">
                  #{pickupCode}
                </span>
                <p className="text-xs text-neutral-500 font-medium mt-1">
                  格位：{lockerShelf}
                </p>
              </div>

              {/* Simulated Barcode */}
              <div className="bg-neutral-50 p-4 rounded-none border border-neutral-200 flex flex-col items-center justify-center">
                <div className="h-16 w-56 flex items-center justify-between px-2">
                  {[2, 1, 3, 1, 4, 2, 1, 3, 2, 4, 1, 2, 3, 1, 2, 4, 2, 1, 3, 2, 1, 3, 1, 2].map((w, idx) => (
                    <div
                      key={idx}
                      className="h-full bg-black"
                      style={{ width: `${w * 2}px` }}
                    />
                  ))}
                </div>
                <span className="font-mono text-xs text-neutral-600 font-bold tracking-widest mt-2">
                  * 8 8 0 6 - P I C K U P *
                </span>
              </div>

              <p className="text-xs text-neutral-500">
                扫描成功后柜门将自动弹开，取出餐品后请顺手关好柜门。
              </p>

              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                className="w-full py-2.5 rounded-none bg-black text-white text-xs font-bold hover:bg-neutral-800 transition-colors"
              >
                我知道了，返回追踪页
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
