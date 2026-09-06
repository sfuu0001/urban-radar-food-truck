import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UtensilsCrossed,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Copy,
  ChefHat,
  Flame,
  BellRing,
  Plus,
  ReceiptText,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  Coffee,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Order, TableDishItem, TableFlowStage } from '../../types';
import { speakText } from '../../utils/voiceAlertEngine';
import { urgeMerchantTableDishes } from '../../utils/tableStorage';

interface DineInTrackingSectionProps {
  order: Order;
  onBackToMenu?: () => void;
  showToast: (msg: string) => void;
}

const DEFAULT_DINE_IN_FLOW_STEPS: {
  key: TableFlowStage;
  title: string;
  desc: string;
  defaultTime?: string;
  operator: string;
}[] = [
  { key: 'placed', title: '扫码开台下单', desc: '微信扫码开台支付成功，订单同步后厨', defaultTime: '12:20', operator: '食客本人' },
  { key: 'kitchen_accepted', title: '后厨接单排产', desc: '炭火档与冷饮档同步接单分发', defaultTime: '12:21', operator: '厨师长阿豪' },
  { key: 'cooking', title: '核心菜品炙烤', desc: '高温炭火慢烘现制，和牛排与汉堡炙烤锁汁', defaultTime: '12:25', operator: '炭烤专岗' },
  { key: 'serving', title: '陆续出餐上桌', desc: '档口出餐，传菜员核对桌号陆续送达', defaultTime: '12:35', operator: '传菜员小林' },
  { key: 'all_served', title: '餐品全部齐备', desc: '所有菜品核对无误上齐，客享盛宴', operator: '全档口核验' }
];

export const DineInTrackingSection: React.FC<DineInTrackingSectionProps> = ({
  order,
  onBackToMenu,
  showToast
}) => {
  const [copiedOrderNo, setCopiedOrderNo] = useState(false);
  const [selectedStation, setSelectedStation] = useState<string>('all');
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isCallingServer, setIsCallingServer] = useState(false);
  const [isUrgingKitchen, setIsUrgingKitchen] = useState(false);

  // Local mutable dish state for simulated customer urging / interactions
  const [localDishes, setLocalDishes] = useState<TableDishItem[]>(() => {
    if (order.items && order.items.length > 0) {
      return order.items.map((it, idx) => ({
        id: `td-item-${idx}`,
        name: it.name,
        quantity: it.quantity,
        price: it.price,
        options: it.options,
        serveStatus: it.serveStatus || (idx === 0 ? 'served' : idx === 1 ? 'cooking' : 'preparing'),
        prepProgress: it.prepProgress !== undefined ? it.prepProgress : (idx === 0 ? 100 : idx === 1 ? 75 : 30),
        station: it.station || (idx % 2 === 0 ? '炭火炙烤档' : '冷饮现调档'),
        serveTime: it.serveTime || (idx === 0 ? '12:35' : undefined),
        imageUrl: it.imageUrl,
        isChefSpecial: idx === 0
      }));
    }
    return [
      {
        id: 'td-d-1',
        name: '碳烤和牛小汉堡双重奏',
        quantity: 2,
        price: 63.0,
        options: '五分熟, 招牌黑椒汁',
        serveStatus: 'served',
        prepProgress: 100,
        station: '炭火炙烤档',
        serveTime: '12:35',
        isChefSpecial: true
      },
      {
        id: 'td-d-2',
        name: '黑曜极夜冷萃冰咖',
        quantity: 1,
        price: 22.0,
        options: '少冰, 无糖',
        serveStatus: 'served',
        prepProgress: 100,
        station: '冷饮现调档',
        serveTime: '12:26'
      },
      {
        id: 'td-d-3',
        name: '冷萃黑金茉莉提拉米苏',
        quantity: 1,
        price: 38.0,
        options: '微甜, 加双份可可粉',
        serveStatus: 'cooking',
        prepProgress: 75,
        station: '西点烘焙档'
      }
    ];
  });

  const orderNo = order.orderNo || `UR-DIN-${order.tableCode || 'A1'}-9821`;
  const tableCode = order.tableCode || 'A1';

  // Metrics computation
  const totalCount = localDishes.reduce((acc, cur) => acc + cur.quantity, 0);
  const servedCount = localDishes.filter((d) => d.serveStatus === 'served').reduce((acc, cur) => acc + cur.quantity, 0);
  const cookingCount = localDishes.filter((d) => d.serveStatus === 'cooking' || !d.serveStatus).reduce((acc, cur) => acc + cur.quantity, 0);
  const urgedCount = localDishes.filter((d) => d.serveStatus === 'urged').reduce((acc, cur) => acc + cur.quantity, 0);
  const servePercent = totalCount > 0 ? Math.round((servedCount / totalCount) * 100) : 0;

  // Distinct stations for tabs
  const stations = ['all', ...Array.from(new Set(localDishes.map((d) => d.station).filter(Boolean))) as string[]];

  const filteredDishes = localDishes.filter((d) => {
    if (selectedStation === 'all') return true;
    return d.station === selectedStation;
  });

  // Flow nodes calculation
  const isAllServed = servePercent === 100;
  const currentStepKey: TableFlowStage = isAllServed ? 'all_served' : servedCount > 0 ? 'serving' : 'cooking';

  const handleCopyOrderNo = () => {
    try {
      navigator.clipboard.writeText(orderNo);
      setCopiedOrderNo(true);
      showToast(`已复制堂食订单号: ${orderNo}`);
      setTimeout(() => setCopiedOrderNo(false), 2000);
    } catch {
      showToast(`堂食订单号: ${orderNo}`);
    }
  };

  // Customer urge dish serving
  const handleUrgeServing = () => {
    setIsUrgingKitchen(true);
    speakText(`桌号 ${tableCode} 宾客催促出餐，请后厨加快进度`, { chimeType: 'alert' });
    
    // Mark cooking dishes as urged
    setLocalDishes((prev) =>
      prev.map((d) => (d.serveStatus !== 'served' ? { ...d, serveStatus: 'urged' } : d))
    );

    // 回流至商家端台位矩阵:将该订单对应桌台的未上桌菜品标记为催单加急 (serveStatus='urged')
    if (order.orderNo) {
      urgeMerchantTableDishes(order.orderNo);
    }

    showToast(`已向后厨 KDS 传送【加急催菜】指令，主理人将优先排产制作！`);

    setTimeout(() => setIsUrgingKitchen(false), 3000);
  };

  // Customer call server
  const handleCallServer = () => {
    setIsCallingServer(true);
    speakText(`桌号 ${tableCode} 呼叫服务`, { chimeType: 'bell' });
    showToast(`已呼叫值班服务员「小林 (No.04)」，正在赶往 ${tableCode} 桌`);
    setTimeout(() => setIsCallingServer(false), 2500);
  };

  return (
    <div className="space-y-3 p-3 sm:p-4 bg-white">
      {/* 1. Table & Order Identity Banner */}
      <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-none p-3 sm:p-3.5 shadow-2xs space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-11 h-11 rounded-none bg-[#2b593f] text-white flex flex-col items-center justify-center shrink-0 shadow-xs">
              <span className="text-[10px] font-medium leading-none opacity-80">桌台</span>
              <span className="font-mono font-black text-base leading-tight">{tableCode}</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-[#1a1c1b] truncate">
                  堂食就餐 · {order.truckName || '黑曜石流动餐车'}
                </h2>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-none bg-[#edf3ec] text-[#2b593f] border border-[#c4dcbc]">
                  室内散座/外摆
                </span>
              </div>
              <p className="text-[11px] text-[#787774] flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-[#2b593f]" />
                  <span>2位宾客</span>
                </span>
                <span>·</span>
                <span>服务员: 小林 (No.04)</span>
                <span>·</span>
                <span className="flex items-center gap-1 text-[#d9730d]">
                  <Clock className="w-3 h-3" />
                  <span>开台 28m</span>
                </span>
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] text-[#787774] block">消费合计</span>
            <span className="font-mono font-black text-base text-[#2b593f]">
              ¥{(order.totalAmount || 186.0).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Order Number Row with Quick Copy */}
        <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-none border border-[#e5e7eb] text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[10px] font-bold text-[#787774] uppercase tracking-wider">堂食单号:</span>
            <span className="font-mono font-bold text-[#1a1c1b] tracking-tight">{orderNo}</span>
          </div>
          <button
            type="button"
            onClick={handleCopyOrderNo}
            className="text-[10.5px] font-bold text-[#2b593f] hover:text-[#1e3f2c] flex items-center gap-1 px-1.5 py-0.5 rounded-none hover:bg-[#edf3ec] transition-colors cursor-pointer"
            title="复制订单号"
          >
            {copiedOrderNo ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            <span>{copiedOrderNo ? '已复制' : '复制单号'}</span>
          </button>
        </div>
      </div>

      {/* 2. Real-Time Dish Serving & Kitchen Prep Matrix (出餐上菜制作情况) */}
      <div className="bg-white border border-[#e2e3e1] rounded-none p-3 sm:p-3.5 shadow-2xs space-y-3">
        {/* Progress Header */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#1a1c1b] flex items-center gap-1.5">
              <UtensilsCrossed className="w-4 h-4 text-[#2b593f]" />
              <span>目前菜品出餐与制作进展</span>
            </span>
            <span className="font-mono font-bold text-xs text-[#2b593f]">
              已上桌 {servedCount}/{totalCount} 件 ({servePercent}%)
            </span>
          </div>

          {/* Master Progress Bar */}
          <div className="h-2 w-full bg-[#f0f0ed] rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full transition-all duration-500 ${
                servePercent === 100
                  ? 'bg-[#2b593f]'
                  : urgedCount > 0
                  ? 'bg-gradient-to-r from-[#d9730d] to-[#e03e3e] animate-pulse'
                  : 'bg-gradient-to-r from-[#2b593f] to-[#40825b]'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${servePercent}%` }}
            />
          </div>

          {/* Quick Metrics Strip */}
          <div className="flex items-center justify-between text-[11px] text-[#787774] pt-0.5">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>已上桌: <strong>{servedCount}</strong> 份</span>
            </span>
            <span className="flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-500" />
              <span>烹饪制作中: <strong>{cookingCount}</strong> 份</span>
            </span>
            {urgedCount > 0 && (
              <span className="flex items-center gap-1 text-rose-600 font-bold animate-pulse">
                <AlertCircle className="w-3 h-3" />
                <span>催单加急: {urgedCount} 份</span>
              </span>
            )}
          </div>
        </div>

        {/* Station Filters */}
        {stations.length > 2 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {stations.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedStation(st)}
                className={`text-[11px] px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer shrink-0 border ${
                  selectedStation === st
                    ? 'bg-[#2b593f] text-white border-[#2b593f]'
                    : 'bg-[#f4f4f2] text-[#787774] border-transparent hover:bg-[#eaeae6]'
                }`}
              >
                {st === 'all' ? '全部档口菜品' : st}
              </button>
            ))}
          </div>
        )}

        {/* Dish Items List */}
        <div className="space-y-2">
          {filteredDishes.map((dish, idx) => {
            const isServed = dish.serveStatus === 'served';
            const isCooking = dish.serveStatus === 'cooking';
            const isUrged = dish.serveStatus === 'urged';
            const isPreparing = dish.serveStatus === 'preparing' || !dish.serveStatus;

            return (
              <div
                key={dish.id || idx}
                className={`p-2.5 rounded-none border transition-all ${
                  isServed
                    ? 'bg-[#fbfcfb] border-[#ddead8]'
                    : isUrged
                    ? 'bg-[#fef2f2] border-[#fecaca] shadow-2xs'
                    : 'bg-[#fcfcfb] border-[#e8e8e4]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-none flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
                        isServed
                          ? 'bg-[#edf3ec] text-[#2b593f]'
                          : isUrged
                          ? 'bg-[#fee2e2] text-[#b91c1c]'
                          : 'bg-[#fef3c7] text-[#92400e]'
                      }`}
                    >
                      {isServed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      ) : isUrged ? (
                        <AlertCircle className="w-4 h-4 text-rose-600 animate-pulse" />
                      ) : (
                        <Flame className="w-4 h-4 text-amber-600 animate-bounce" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs sm:text-[13px] font-bold text-[#1a1c1b] leading-tight">
                          {dish.name}
                        </h4>
                        {dish.station && (
                          <span className="text-[9.5px] px-1 py-0.2 rounded-none bg-neutral-100 text-neutral-600 border border-neutral-200">
                            {dish.station}
                          </span>
                        )}
                      </div>
                      {dish.options && (
                        <p className="text-[10px] text-[#787774] mt-0.5 truncate">
                          规格：{dish.options}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-[#787774]">
                        <span>单价 ¥{dish.price.toFixed(2)}</span>
                        <span>·</span>
                        <span className="font-bold text-[#1a1c1b]">x{dish.quantity} 份</span>
                        <span>·</span>
                        <span className="font-bold text-[#2b593f]">
                          小计 ¥{(dish.price * dish.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="text-right shrink-0">
                    {isServed ? (
                      <div className="space-y-0.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-none bg-[#edf3ec] text-[#2b593f] border border-[#c4dcbc]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>已上桌</span>
                        </span>
                        {dish.serveTime && (
                          <p className="text-[9px] font-mono text-neutral-400">{dish.serveTime} 送达</p>
                        )}
                      </div>
                    ) : isUrged ? (
                      <div className="space-y-0.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-none bg-[#fee2e2] text-[#b91c1c] border border-[#fecaca] animate-pulse">
                          <AlertCircle className="w-3 h-3" />
                          <span>催单加急</span>
                        </span>
                        <p className="text-[9px] text-rose-500 font-medium">主厨优先出炉</p>
                      </div>
                    ) : isCooking ? (
                      <div className="space-y-0.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-none bg-[#fef3c7] text-[#92400e] border border-[#fde68a]">
                          <Flame className="w-3 h-3" />
                          <span>烹饪制作中</span>
                        </span>
                        <p className="text-[9px] font-mono text-amber-700">进度约 {dish.prepProgress || 70}%</p>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-none bg-[#f3f4f6] text-[#4b5563] border border-[#e5e7eb]">
                        <Clock className="w-3 h-3" />
                        <span>备料排单中</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Sub progress bar if cooking */}
                {!isServed && (
                  <div className="mt-2 pt-1.5 border-t border-neutral-100 flex items-center gap-2">
                    <span className="text-[9.5px] text-[#787774] shrink-0 font-medium">制作进度:</span>
                    <div className="flex-1 h-1.5 bg-[#eaeae6] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#d9730d] rounded-full transition-all duration-300"
                        style={{ width: `${dish.prepProgress || 40}%` }}
                      />
                    </div>
                    <span className="text-[9.5px] font-mono font-bold text-[#d9730d]">
                      {dish.prepProgress || 40}%
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Action Buttons for Dine-in Customer */}
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#f0f0ed]">
          <button
            type="button"
            disabled={isAllServed || isUrgingKitchen}
            onClick={handleUrgeServing}
            className={`py-2 px-2 rounded-none text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all border ${
              isAllServed
                ? 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200 shadow-2xs'
            }`}
            title="向后厨直接加急催菜"
          >
            <BellRing className={`w-3.5 h-3.5 ${isUrgingKitchen ? 'animate-bounce' : ''}`} />
            <span>{isUrgingKitchen ? '已催单...' : '一键催菜'}</span>
          </button>

          <button
            type="button"
            disabled={isCallingServer}
            onClick={handleCallServer}
            className="py-2 px-2 rounded-none text-xs font-bold bg-[#f4f4f2] hover:bg-[#ebebe7] text-[#1a1c1b] border border-[#deded8] flex items-center justify-center gap-1 cursor-pointer transition-all shadow-2xs"
            title="呼叫桌台值班服务员"
          >
            <Users className={`w-3.5 h-3.5 ${isCallingServer ? 'text-emerald-600' : ''}`} />
            <span>{isCallingServer ? '呼叫中...' : '呼叫服务员'}</span>
          </button>

          <button
            type="button"
            onClick={onBackToMenu}
            className="py-2 px-2 rounded-none text-xs font-bold bg-[#edf3ec] hover:bg-[#ddead8] text-[#2b593f] border border-[#c4dcbc] flex items-center justify-center gap-1 cursor-pointer transition-all shadow-2xs"
            title="继续加点其他美味菜品"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>加点菜品</span>
          </button>
        </div>
      </div>

      {/* 3. Dine-In Status Flow Nodes (堂食状态流转节点) */}
      <div className="bg-white border border-[#e2e3e1] rounded-none p-3 sm:p-3.5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[#1a1c1b] flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-[#2b593f]" />
            <span>堂食状态流转节点</span>
          </span>
          <span className="text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded-none font-medium">
            全链路实时存证
          </span>
        </div>

        <div className="space-y-2 relative before:absolute before:top-3 before:bottom-3 before:left-3.5 before:w-0.5 before:bg-[#e6e6e1] before:z-0">
          {DEFAULT_DINE_IN_FLOW_STEPS.map((node, i) => {
            const isCompleted =
              isAllServed ||
              (i === 0) ||
              (i === 1) ||
              (i === 2 && servedCount > 0) ||
              (i === 3 && servedCount > 0);
            const isCurrent =
              !isAllServed &&
              ((i === 3 && servedCount > 0 && servedCount < totalCount) ||
                (i === 2 && servedCount === 0));

            return (
              <div key={node.key} className="relative z-1 flex items-start gap-2.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                    isCompleted
                      ? 'bg-[#2b593f] text-white border-[#2b593f]'
                      : isCurrent
                      ? 'bg-white text-[#2b593f] border-2 border-[#2b593f] ring-2 ring-emerald-100 scale-105'
                      : 'bg-[#f4f4f2] text-[#8c8b84] border-[#d8d8d3]'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  ) : isCurrent ? (
                    <Flame className="w-3.5 h-3.5 text-[#2b593f] animate-pulse" />
                  ) : (
                    <span className="font-mono text-xs font-bold">{i + 1}</span>
                  )}
                </div>

                <div
                  className={`flex-1 p-2 rounded-none border transition-all ${
                    isCurrent
                      ? 'bg-[#edf3ec]/60 border-[#c4dcbc]'
                      : isCompleted
                      ? 'bg-neutral-50/60 border-neutral-200/80'
                      : 'bg-white border-[#ecece8]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-bold ${isCurrent ? 'text-[#2b593f]' : 'text-[#1a1c1b]'}`}>
                      {node.title}
                    </span>
                    <span className="text-[10px] font-mono text-[#787774]">
                      {node.defaultTime || (isCompleted ? '已达成' : '待流转')}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-[#787774] mt-0.5 leading-relaxed">{node.desc}</p>
                  <div className="flex items-center justify-between text-[9.5px] text-neutral-400 mt-1 pt-1 border-t border-neutral-100">
                    <span>处理主体: {node.operator}</span>
                    <span className={`font-bold ${isCompleted ? 'text-emerald-700' : isCurrent ? 'text-[#d9730d]' : 'text-neutral-400'}`}>
                      {isCompleted ? '● 已完成' : isCurrent ? '● 进行中' : '○ 等待中'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Dining Logs & Time Audit Strip */}
      <div className="p-3 bg-[#f8f9fa] border border-[#e5e7eb] rounded-none text-xs space-y-1.5">
        <div className="flex items-center justify-between text-[#787774] font-medium">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>堂食出餐服务存证</span>
          </span>
          <span className="font-mono text-[10px]">KDS 联动保障</span>
        </div>
        <p className="text-[11px] text-[#4b5563] leading-relaxed">
          餐车遵循炭火现制现烤 SOP 标准，所有菜品由主理人出餐后当面送达。如对熟度或口味有任何特殊需求，可随时点击上方「呼叫服务员」。
        </p>
      </div>
    </div>
  );
};
