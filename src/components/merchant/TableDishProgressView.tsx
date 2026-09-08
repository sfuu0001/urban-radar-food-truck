import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  ReceiptText,
  Clock,
  Users,
  ChefHat,
  Flame,
  CheckCircle2,
  AlertCircle,
  Copy,
  Printer,
  BellRing,
  Sparkles,
  UtensilsCrossed,
  Layers,
  ChevronRight,
  ShieldCheck,
  Plus,
  RefreshCw,
  Info,
  Ban
} from 'lucide-react';
import { TableItem, TableDishItem, TableFlowNode, TableFlowStage } from '../../types';
import { voiceAlerts, speakText } from '../../utils/voiceAlertEngine';
import { businessTransactionEngine } from '../../utils/businessTransactionEngine';

interface TableDishProgressViewProps {
  table: TableItem;
  onBack: () => void;
  onUpdateTable: (updatedTable: TableItem) => void;
  onOpenBillModal?: (table: TableItem) => void;
  onVoidOrder?: (table: TableItem) => void;
  showToast: (msg: string, detail?: string) => void;
  isEmbedded?: boolean;
}

const DEFAULT_FLOW_NODES: { key: TableFlowStage; title: string; desc: string }[] = [
  { key: 'placed', title: '扫码开台下单', desc: '宾客扫码或前台代开台成功' },
  { key: 'kitchen_accepted', title: '后厨接单排产', desc: '各档口后厨接单备料' },
  { key: 'cooking', title: '核心菜品炙烤', desc: '高温炭火与炉灶现制烹饪' },
  { key: 'serving', title: '陆续出餐上桌', desc: '各档口出餐，服务员传菜到位' },
  { key: 'all_served', title: '餐品全部齐备', desc: '全单菜品核对齐备，客享美味' },
  { key: 'completed', title: '结账清台就绪', desc: '用餐完毕结账，保洁翻台' }
];

export const TableDishProgressView: React.FC<TableDishProgressViewProps> = ({
  table,
  onBack,
  onUpdateTable,
  onOpenBillModal,
  onVoidOrder,
  showToast,
  isEmbedded = false
}) => {
  const [copiedOrderNo, setCopiedOrderNo] = useState(false);
  const [activeTab, setActiveTab] = useState<'dishes' | 'flow' | 'kds_log'>('dishes');
  const [filterStation, setFilterStation] = useState<string>('all');

  // Ensure table has orderNo
  const orderNo = table.orderNo || `UR-DIN-${table.code}-${table.elapsedMinutes || '01'}`;

  // Ensure orderItems exists
  const dishes: TableDishItem[] = table.orderItems || [];

  // Compute serving stats
  const totalDishCount = dishes.reduce((acc, cur) => acc + cur.quantity, 0);
  const servedDishCount = dishes.filter((d) => d.serveStatus === 'served').reduce((acc, cur) => acc + cur.quantity, 0);
  const cookingDishCount = dishes.filter((d) => d.serveStatus === 'cooking' || !d.serveStatus).reduce((acc, cur) => acc + cur.quantity, 0);
  const urgedDishCount = dishes.filter((d) => d.serveStatus === 'urged').reduce((acc, cur) => acc + cur.quantity, 0);

  // Initialize or fallback flow nodes
  const flowNodes: TableFlowNode[] = table.flowNodes && table.flowNodes.length > 0
    ? table.flowNodes
    : DEFAULT_FLOW_NODES.map((n, i) => {
        let status: 'completed' | 'current' | 'pending' = 'pending';
        if (i === 0) status = 'completed';
        else if (i === 1) status = 'completed';
        else if (i === 2 && (table.elapsedMinutes || 0) > 10) status = 'completed';
        else if (i === 3) status = 'current';
        return {
          id: `fn-${i}`,
          nodeKey: n.key,
          title: n.title,
          description: n.desc,
          status,
          time: i < 3 ? `${12}:${20 + i * 5}` : undefined,
          operator: i === 0 ? '宾客' : '后厨'
        };
      });

  const handleCopyOrderNo = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(orderNo);
      setCopiedOrderNo(true);
      showToast(`订单号已复制: ${orderNo}`);
      setTimeout(() => setCopiedOrderNo(false), 2000);
    } catch {
      showToast(`订单号: ${orderNo}`);
    }
  };

  // Toggle or cycle dish serving status
  const handleToggleDishStatus = (dishIndex: number) => {
    const updatedDishes = [...dishes];
    const current = updatedDishes[dishIndex].serveStatus || 'cooking';
    let nextStatus: TableDishItem['serveStatus'] = 'served';
    let nextProgress = 100;
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    if (current === 'served') {
      nextStatus = 'cooking';
      nextProgress = 70;
    } else if (current === 'cooking' || current === 'preparing' || current === 'ready_to_serve') {
      nextStatus = 'served';
      nextProgress = 100;
    } else if (current === 'urged') {
      nextStatus = 'served';
      nextProgress = 100;
    }

    updatedDishes[dishIndex] = {
      ...updatedDishes[dishIndex],
      serveStatus: nextStatus,
      prepProgress: nextProgress,
      serveTime: nextStatus === 'served' ? timeStr : undefined
    };

    // Check if all dishes are served
    const allServed = updatedDishes.every((d) => d.serveStatus === 'served');
    let nextPhase = table.tablePhase || 'serving';
    let nextNodes = [...flowNodes];

    if (allServed) {
      nextPhase = 'all_served';
      nextNodes = nextNodes.map((n) => {
        if (n.nodeKey === 'serving' || n.nodeKey === 'all_served') {
          return { ...n, status: 'completed', time: n.time || timeStr };
        }
        return n;
      });
      speakText(`${table.code}桌菜品已全部上齐，请慢用！`, { persona: 'sweet_frontdesk', rate: 1.05 });
      showToast(`桌台 ${table.code} 菜品已全部出齐上桌！`, '后厨状态与前台同步完成');
    } else {
      showToast(`已更新「${updatedDishes[dishIndex].name}」状态为 ${nextStatus === 'served' ? '已上桌' : '烹饪中'}`);
    }

    onUpdateTable({
      ...table,
      orderItems: updatedDishes,
      tablePhase: nextPhase,
      flowNodes: nextNodes
    });
  };

  // Urge a specific dish
  const handleUrgeDish = (dishIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedDishes = [...dishes];
    const dish = updatedDishes[dishIndex];
    if (dish.serveStatus === 'served') {
      showToast(`该菜品「${dish.name}」已上桌，无需催单`);
      return;
    }

    updatedDishes[dishIndex] = {
      ...dish,
      serveStatus: 'urged',
      prepProgress: Math.max(dish.prepProgress || 50, 90)
    };

    onUpdateTable({
      ...table,
      orderItems: updatedDishes
    });

    // 跨组件联动事务：向 KDS 后厨派发工单加急、置顶与语音播报
    businessTransactionEngine.executeUrgeOrderOrDish({
      tableCode: table.code,
      orderNo,
      dishName: dish.name,
      showToast: (msg) => showToast(msg, `桌台 ${table.code} 实时催菜`)
    });
  };

  // Urge entire table
  const handleUrgeEntireTable = () => {
    const hasUnserved = dishes.some((d) => d.serveStatus !== 'served');
    if (!hasUnserved) {
      showToast(`桌台 ${table.code} 菜品已全部上齐，无需催单`);
      return;
    }

    const updatedDishes = dishes.map((d) => {
      if (d.serveStatus !== 'served') {
        return { ...d, serveStatus: 'urged' as const, prepProgress: Math.max(d.prepProgress || 50, 90) };
      }
      return d;
    });

    onUpdateTable({
      ...table,
      orderItems: updatedDishes
    });

    businessTransactionEngine.executeUrgeOrderOrDish({
      tableCode: table.code,
      orderNo,
      showToast: (msg) => showToast(msg, `桌台 ${table.code} 全桌催单`)
    });
  };

  // Mark all dishes as served
  const handleMarkAllServed = () => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const updatedDishes = dishes.map((d) => ({
      ...d,
      serveStatus: 'served' as const,
      prepProgress: 100,
      serveTime: d.serveTime || timeStr
    }));

    const nextNodes = flowNodes.map((n) => {
      if (n.nodeKey === 'serving' || n.nodeKey === 'all_served') {
        return { ...n, status: 'completed' as const, time: n.time || timeStr };
      }
      return n;
    });

    onUpdateTable({
      ...table,
      orderItems: updatedDishes,
      tablePhase: 'all_served',
      flowNodes: nextNodes
    });

    speakText(`${table.code}桌菜品已全部上齐，祝您用餐愉快！`, { persona: 'sweet_frontdesk' });
    showToast(`桌台 ${table.code} 全单菜品已全部标为已上齐！`);
  };

  // Advance flow node
  const handleAdvanceFlowNode = (nodeKey: TableFlowStage) => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const targetIdx = flowNodes.findIndex((n) => n.nodeKey === nodeKey);
    if (targetIdx === -1) return;

    const updatedNodes = flowNodes.map((n, i) => {
      if (i <= targetIdx) {
        return { ...n, status: 'completed' as const, time: n.time || timeStr };
      }
      if (i === targetIdx + 1) {
        return { ...n, status: 'current' as const };
      }
      return { ...n, status: 'pending' as const };
    });

    onUpdateTable({
      ...table,
      tablePhase: nodeKey,
      flowNodes: updatedNodes
    });

    showToast(`流转节点已更新为: ${flowNodes[targetIdx].title}`);
  };

  // Filter stations
  const stations = ['all', ...Array.from(new Set(dishes.map((d) => d.station).filter(Boolean) as string[]))];
  const filteredDishes = filterStation === 'all'
    ? dishes
    : dishes.filter((d) => d.station === filterStation);

  return (
    <div className={`bg-[#f9f9f7] ${isEmbedded ? 'h-full flex-1' : 'min-h-[82vh] rounded-[4px] border border-[#e6e6e4]'} flex flex-col font-sans text-xs overflow-hidden`}>
      {/* Top Header Bar (Fixed at top) */}
      <div className={`bg-white border-b border-[#e6e6e4] ${isEmbedded ? 'p-2.5' : 'p-3 sm:p-4'} flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0 z-20 shadow-2xs`}>
        <div className="flex items-center gap-2 min-w-0">
          {!isEmbedded && (
            <button
              type="button"
              onClick={onBack}
              className="p-1.5 hover:bg-[#f1f1ef] rounded-[4px] text-[#37352f] transition-colors cursor-pointer border border-[#d3d1cb] shrink-0"
              title="返回桌台大厅"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono font-black text-xs sm:text-sm px-1.5 py-0.2 bg-[#37352f] text-white rounded-[3px] shrink-0">
                {table.code}
              </span>
              <h2 className="text-xs sm:text-sm font-bold text-[#1a1c1b] tracking-tight truncate">
                {table.name}
              </h2>
              <span className="text-[9.5px] font-semibold px-1.5 py-0.2 rounded bg-[#f1f1ef] text-[#787774] border border-[#e6e6e4] shrink-0">
                {table.zoneLabel}
              </span>
              <span className="text-[9.5px] font-semibold px-1.5 py-0.2 rounded bg-[#edf3ec] text-[#2b593f] border border-[#c4dcbc] flex items-center gap-1 shrink-0">
                <Users className="w-2.5 h-2.5" />
                <span>{table.currentGuests || table.capacity}人</span>
              </span>
            </div>

            {/* Order No Pill & Meta */}
            <div className="flex items-center gap-1.5 mt-1 text-[10.5px] text-[#787774] flex-wrap">
              <span className="font-medium shrink-0">单号:</span>
              <div
                onClick={handleCopyOrderNo}
                className="font-mono font-bold text-[#1a1c1b] bg-[#f1f1ef] hover:bg-[#e6e6e4] px-1.5 py-0.2 rounded-[2px] border border-[#d3d1cb] flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                title="点击复制订单号"
              >
                <span className="truncate max-w-[130px] sm:max-w-none">{orderNo}</span>
                <Copy className="w-2.5 h-2.5 text-[#787774] shrink-0" />
                {copiedOrderNo && <span className="text-[9px] text-[#2b593f] font-bold">已复制</span>}
              </div>

              <span className="text-[#d3d1cb]">|</span>
              <span className="flex items-center gap-1 shrink-0">
                <Clock className="w-2.5 h-2.5 text-[#787774]" />
                <span>开台 {table.elapsedMinutes || 0}m</span>
              </span>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 self-end sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={handleUrgeEntireTable}
            className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-[3px] font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs whitespace-nowrap"
            title="向后厨下发全桌加急催菜指令"
          >
            <Flame className="w-3.5 h-3.5 text-rose-600 fill-current shrink-0" />
            <span className="hidden sm:inline">全桌加急催菜</span>
            <span className="inline sm:hidden text-[11px]">催全桌</span>
          </button>

          <button
            type="button"
            onClick={() => {
              speakText(`当前${table.code}桌，共${dishes.length}项菜品，已出餐${servedDishCount}道，烹饪中${cookingDishCount}道。`, { persona: 'steady_male' });
              showToast(`已播报桌台 ${table.code} 菜品状态`);
            }}
            className="px-2 py-1.5 bg-[#f7f7f5] hover:bg-[#efefed] border border-[#d3d1cb] text-[#37352f] rounded-[3px] font-medium text-xs flex items-center gap-1 cursor-pointer transition-colors"
            title="语音播报出餐进度"
          >
            <BellRing className="w-3.5 h-3.5 text-[#d9730d]" />
            <span className="hidden md:inline">语音状态播报</span>
            <span className="inline md:hidden text-[11px]">播报</span>
          </button>

          {onVoidOrder && (
            <button
              type="button"
              onClick={() => onVoidOrder(table)}
              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-[3px] font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
              title="作废此桌订单并释放台位"
            >
              <Ban className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>作废本单</span>
            </button>
          )}

          {onOpenBillModal && (
            <button
              type="button"
              onClick={() => onOpenBillModal(table)}
              className="px-2.5 sm:px-3 py-1.5 bg-[#2b593f] hover:bg-[#204430] text-white rounded-[3px] font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs whitespace-nowrap"
            >
              <ReceiptText className="w-3.5 h-3.5 shrink-0" />
              <span>结账 (¥{(table.totalAmount || 0).toFixed(2)})</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area: Smooth Independent Scrollable Container (解决窄屏无法向下滚动的核心) */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-3.5 sm:space-y-4 touch-pan-y">
        {/* Overview Stats Bar (Responsive 2-col for split/narrow screen to prevent squishing) */}
        <div className={`grid ${isEmbedded ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'} gap-2`}>
          <div className="bg-white p-2.5 rounded-[3px] border border-[#e6e6e4] shadow-2xs flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-[10.5px] text-[#787774] block truncate">点单菜品总数</span>
              <span className="font-mono font-bold text-xs sm:text-sm text-[#1a1c1b] block mt-0.5 truncate">
                {dishes.length} 项 ({totalDishCount} 件)
              </span>
            </div>
            <UtensilsCrossed className="w-4 h-4 text-[#787774] shrink-0 ml-1" />
          </div>

          <div className="bg-[#edf3ec] p-2.5 rounded-[3px] border border-[#c4dcbc] shadow-2xs flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-[10.5px] text-[#2b593f] block truncate">已出餐上桌</span>
              <span className="font-mono font-bold text-xs sm:text-sm text-[#2b593f] block mt-0.5 truncate">
                {servedDishCount} / {totalDishCount} 件
              </span>
            </div>
            <CheckCircle2 className="w-4 h-4 text-[#2b593f] shrink-0 ml-1" />
          </div>

          <div className="bg-[#fbf3db] p-2.5 rounded-[3px] border border-[#ecd9a8] shadow-2xs flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-[10.5px] text-[#8f6412] block truncate">炉火制作中</span>
              <span className="font-mono font-bold text-xs sm:text-sm text-[#8f6412] block mt-0.5 truncate">
                {cookingDishCount} 件
              </span>
            </div>
            <Flame className="w-4 h-4 text-[#d9730d] shrink-0 ml-1" />
          </div>

          <div className="bg-[#fdf2f2] p-2.5 rounded-[3px] border border-[#fbd0d0] shadow-2xs flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-[10.5px] text-[#a82a2a] block truncate">加急催菜项</span>
              <span className="font-mono font-bold text-xs sm:text-sm text-[#a82a2a] block mt-0.5 truncate">
                {urgedDishCount} 件
              </span>
            </div>
            <AlertCircle className={`w-4 h-4 text-[#a82a2a] shrink-0 ml-1 ${urgedDishCount > 0 ? 'animate-bounce' : ''}`} />
          </div>
        </div>

        {/* Section: Status Flow Nodes (堂食履约状态流转节点 - 防止窄屏挤扁) */}
        <div className="bg-white rounded-[4px] border border-[#e6e6e4] p-3 sm:p-3.5 shadow-2xs">
          <div className="flex items-center justify-between mb-2.5 flex-wrap gap-1.5">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#37352f]" />
              <h3 className="font-bold text-xs text-[#1a1c1b]">堂食履约流转阶段</h3>
            </div>
            <span className="text-[10px] font-mono text-[#787774] bg-[#f1f1ef] px-2 py-0.5 rounded-[2px] border border-[#e6e6e4]">
              当前: {flowNodes.find((n) => n.status === 'current')?.title || '出餐上桌中'}
            </span>
          </div>

          {/* Stepper Grid: In embedded or narrow mode, use 2-col / 3-col grid with ample card width */}
          <div className={`grid ${isEmbedded ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-6'} gap-2`}>
            {flowNodes.map((node, idx) => {
              const isDone = node.status === 'completed';
              const isCurrent = node.status === 'current';
              const isPending = node.status === 'pending';

              let cardBg = 'bg-[#fbfbfa] border-[#e6e6e4] text-[#787774]';
              let badgeColor = 'bg-[#e6e6e4] text-[#787774]';

              if (isDone) {
                cardBg = 'bg-[#edf3ec] border-[#c4dcbc] text-[#2b593f]';
                badgeColor = 'bg-[#2b593f] text-white';
              } else if (isCurrent) {
                cardBg = 'bg-white border-[#37352f] ring-2 ring-[#37352f]/20 shadow-xs text-[#1a1c1b]';
                badgeColor = 'bg-[#37352f] text-white animate-pulse';
              }

              return (
                <div
                  key={node.id || idx}
                  onClick={() => handleAdvanceFlowNode(node.nodeKey)}
                  className={`p-2 sm:p-2.5 rounded-[3px] border ${cardBg} flex flex-col justify-between transition-all cursor-pointer hover:border-[#37352f] group min-h-[72px]`}
                  title="点击切换为此流转节点"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded-[2px] ${badgeColor}`}>
                        阶段 {idx + 1}
                      </span>
                      {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-[#2b593f] shrink-0" />}
                      {isCurrent && <span className="w-2 h-2 rounded-full bg-[#d9730d] animate-ping shrink-0" />}
                    </div>

                    <h4 className="font-bold text-xs mt-1 group-hover:text-[#37352f] truncate">
                      {node.title}
                    </h4>
                    <p className="text-[10px] leading-snug opacity-80 line-clamp-2">
                      {node.description}
                    </p>
                  </div>

                  <div className="pt-1.5 mt-1.5 border-t border-black/5 flex items-center justify-between text-[9.5px] font-mono opacity-80">
                    <span>{node.time || '--:--'}</span>
                    <span className="font-bold">{isDone ? '已核验' : isCurrent ? '进行中' : '待流转'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section: Dishes Preparation & Serving Status (菜品制作与传菜情况清单) */}
        <div className="bg-white rounded-[4px] border border-[#e6e6e4] overflow-hidden shadow-2xs">
          {/* List Header & Station Filter */}
          <div className="p-3 border-b border-[#e6e6e4] flex items-center justify-between gap-2 flex-wrap bg-[#fbfbfa]">
            <div className="flex items-center gap-2">
              <ChefHat className="w-4 h-4 text-[#37352f]" />
              <h3 className="font-bold text-xs text-[#1a1c1b]">
                菜品出餐与上桌清单 ({dishes.length}道菜品)
              </h3>
            </div>

            {/* Station Filter Pills (Scrollable horizontally in narrow screen) */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full">
              <span className="text-[11px] text-[#787774] shrink-0">档口:</span>
              {stations.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStation(st)}
                  className={`px-2 py-0.5 rounded-[3px] text-[10.5px] font-medium transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                    filterStation === st
                      ? 'bg-[#37352f] text-white font-bold'
                      : 'bg-white border border-[#d3d1cb] text-[#37352f] hover:bg-[#f1f1ef]'
                  }`}
                >
                  {st === 'all' ? '全部档口' : st}
                </button>
              ))}
            </div>
          </div>

          {/* Dishes List: Self-contained items with comfortable top-down cards on narrow views */}
          <div className="divide-y divide-[#efefed]">
            {filteredDishes.length === 0 ? (
              <div className="p-8 text-center text-[#787774] space-y-2">
                <UtensilsCrossed className="w-8 h-8 mx-auto text-[#d3d1cb]" />
                <p>暂无符合筛选档口的菜品</p>
              </div>
            ) : (
              filteredDishes.map((dish, idx) => {
                const originalIndex = dishes.findIndex((d) => d.name === dish.name && d.price === dish.price);
                const isServed = dish.serveStatus === 'served';
                const isUrged = dish.serveStatus === 'urged';
                const isCooking = dish.serveStatus === 'cooking' || !dish.serveStatus;
                const isReady = dish.serveStatus === 'ready_to_serve';

                const progress = dish.prepProgress ?? (isServed ? 100 : 70);

                return (
                  <div
                    key={dish.id || idx}
                    className={`p-3 transition-colors flex flex-col gap-2.5 ${
                      isUrged ? 'bg-[#fdf2f2]/60' : isServed ? 'bg-[#fafbfa]' : 'hover:bg-[#fbfbfa]'
                    }`}
                  >
                    {/* Top Row: Index + Title + Price + Tags */}
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-[3px] bg-[#f1f1ef] border border-[#e6e6e4] flex items-center justify-center shrink-0 font-bold text-xs text-[#37352f]">
                        {idx + 1}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            <span className="font-bold text-xs sm:text-sm text-[#1a1c1b] truncate">
                              {dish.name}
                            </span>
                            <span className="font-mono font-bold text-xs text-[#787774] shrink-0">
                              x{dish.quantity}
                            </span>
                            {dish.station && (
                              <span className="text-[9.5px] font-semibold px-1.5 py-0.2 rounded-[2px] bg-[#f1f1ef] text-[#787774] border border-[#e6e6e4] shrink-0">
                                {dish.station}
                              </span>
                            )}
                            {dish.isChefSpecial && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-[2px] bg-[#fbf3db] text-[#8f6412] border border-[#ecd9a8] shrink-0">
                                招牌现制
                              </span>
                            )}
                          </div>

                          <span className="font-mono text-xs sm:text-sm text-[#2b593f] font-bold shrink-0">
                            ¥{(dish.price * dish.quantity).toFixed(2)}
                          </span>
                        </div>

                        {dish.options && (
                          <p className="text-[11px] text-[#787774] truncate">
                            规格要求: <span className="text-[#37352f]">{dish.options}</span>
                          </p>
                        )}

                        {/* Progress Bar */}
                        <div className="pt-0.5 space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-[#787774]">制作出餐进度:</span>
                            <span className="font-mono font-bold text-[#37352f]">{progress}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-[#e6e6e4] rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 rounded-full ${
                                isServed
                                  ? 'bg-[#2b593f]'
                                  : isUrged
                                  ? 'bg-[#e03e3e] animate-pulse'
                                  : 'bg-[#37352f]'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Status Badge & Interactive Action Buttons (Clean & un-squeezed) */}
                    <div className="pt-2 border-t border-[#efefed] flex items-center justify-between gap-2 flex-wrap">
                      {/* Left: Status Badge */}
                      <div className="min-w-0">
                        {isServed && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] bg-[#edf3ec] text-[#2b593f] border border-[#c4dcbc] font-bold text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>已上桌</span>
                            {dish.serveTime && <span className="font-mono font-normal text-[10px]">({dish.serveTime})</span>}
                          </span>
                        )}

                        {isCooking && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] bg-[#fbf3db] text-[#8f6412] border border-[#ecd9a8] font-bold text-xs">
                            <Flame className="w-3.5 h-3.5 text-[#d9730d] shrink-0" />
                            <span>烹饪制作中</span>
                          </span>
                        )}

                        {isReady && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] bg-[#edf3f8] text-[#1c5598] border border-[#c4d6ec] font-bold text-xs">
                            <Sparkles className="w-3.5 h-3.5 shrink-0" />
                            <span>待出餐上桌</span>
                          </span>
                        )}

                        {isUrged && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] bg-[#fdf2f2] text-[#e03e3e] border border-[#fbd0d0] font-bold text-xs animate-pulse">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>催单加急中</span>
                          </span>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Action 1: Toggle Serve */}
                        <button
                          type="button"
                          onClick={() => handleToggleDishStatus(originalIndex)}
                          className={`px-2.5 sm:px-3 py-1.5 rounded-[3px] font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-2xs whitespace-nowrap ${
                            isServed
                              ? 'bg-[#f1f1ef] text-[#787774] hover:bg-[#e6e6e4] border border-[#d3d1cb]'
                              : 'bg-[#2b593f] text-white hover:bg-[#204430]'
                          }`}
                          title={isServed ? '点击撤回为烹饪制作状态' : '点击确认该菜品已送至桌台'}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>{isServed ? '撤回制作' : '标为已上桌'}</span>
                        </button>

                        {/* Action 2: Urge */}
                        {!isServed && (
                          <button
                            type="button"
                            onClick={(e) => handleUrgeDish(originalIndex, e)}
                            className="px-2 sm:px-2.5 py-1.5 bg-[#fdf2f2] hover:bg-[#fbe4e4] border border-[#fbd0d0] text-[#e03e3e] rounded-[3px] font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                            title="向后厨发送加急出餐催促"
                          >
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>催菜</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom Fixed Action Footer (Fixed at bottom with auto-wrapping grid) */}
      <div className="bg-white border-t border-[#e6e6e4] p-2.5 sm:p-3 flex flex-col gap-2 shrink-0 z-20 shadow-xs">
        <div className="flex items-center justify-between text-xs text-[#787774]">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#37352f] shrink-0" />
            <span>
              目前出餐完成率: <strong className="text-[#1a1c1b]">{totalDishCount > 0 ? Math.round((servedDishCount / totalDishCount) * 100) : 0}%</strong> ({servedDishCount}/{totalDishCount} 件)
            </span>
          </div>
          <div className="w-24 sm:w-32 bg-[#e6e6e4] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#2b593f] h-full rounded-full transition-all duration-300"
              style={{ width: `${totalDishCount > 0 ? (servedDishCount / totalDishCount) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={handleMarkAllServed}
            disabled={servedDishCount === totalDishCount}
            className="px-2 py-1.5 sm:py-2 bg-[#37352f] hover:bg-[#201f1d] disabled:opacity-50 text-white rounded-[3px] font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs whitespace-nowrap truncate"
            title="一键将全部菜品更新为已出齐上桌"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-[#4dab63] shrink-0" />
            <span className="truncate">一键全上齐</span>
          </button>

          <button
            type="button"
            onClick={() => {
              speakText(`后厨请注意，${table.code}桌全单菜品催促制作，请核对档口工单！`, {
                persona: 'steady_male',
                chimeType: 'urgent'
              });
              showToast(`全单催菜广播已发送至餐车后厨KDS！`);
            }}
            className="px-2 py-1.5 sm:py-2 bg-white hover:bg-[#f1f1ef] text-[#d9730d] border border-[#ecd9a8] rounded-[3px] font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors whitespace-nowrap truncate"
            title="通过车载语音和屏幕广播全单催促后厨出餐"
          >
            <BellRing className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">全单催菜</span>
          </button>

          <button
            type="button"
            onClick={onBack}
            className="px-2 py-1.5 sm:py-2 bg-white hover:bg-[#f1f1ef] text-[#37352f] border border-[#d3d1cb] rounded-[3px] font-medium text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors whitespace-nowrap truncate"
            title="返回桌台看板主厅"
          >
            <span className="truncate">返回大厅</span>
          </button>
        </div>
      </div>
    </div>
  );
};
