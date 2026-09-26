import React, { useState, useSyncExternalStore } from 'react';
import {
  Users,
  Shield,
  Activity,
  Flame,
  CheckCircle2,
  AlertTriangle,
  HeartHandshake,
  Cpu,
  Wifi,
  Sparkles,
  Zap,
  TrendingUp,
  Clock,
  Printer,
  ChevronRight,
  Globe,
  Radio,
  Lock,
  MousePointer2
} from 'lucide-react';
import { TableItem } from '../../../../types';
import { TableSession } from '../../../../types/tableSession';
import { CctvDiagnosticReport, CctvPlaybackFrame } from '../../../../utils/tablePlaybackEngine';
import { subscribeClientTelemetry, ClientTelemetryData, getClientTelemetrySnapshot } from '../../../../utils/ipTelemetry';
import { remoteAssistEngine, RemoteAssistSession } from '../../../../utils/remoteAssistEngine';

interface TableTelemetrySidebarProps {
  table: TableItem;
  session?: TableSession | null;
  diagnostic: CctvDiagnosticReport;
  currentFrame?: CctvPlaybackFrame;
}

export function TableTelemetrySidebar({
  table,
  session,
  diagnostic,
  currentFrame
}: TableTelemetrySidebarProps) {
  const telemetry = useSyncExternalStore(
    subscribeClientTelemetry,
    getClientTelemetrySnapshot
  );
  const assistSession = useSyncExternalStore(
    remoteAssistEngine.subscribeSession,
    remoteAssistEngine.getSessionSnapshot
  );
  const [showFullIp, setShowFullIp] = useState(false);
  const currentStageLabel = currentFrame?.phaseLabel || '炙烤烹饪中';
  const tableCode = table.code || 'A2';
  const capacity = table.capacity || 4;
  const currentGuests = table.currentGuests || 3;
  const serverName = table.serverName || '阿豪 (No.02)';
  const zoneLabel = table.zoneLabel || '餐车外摆区';

  // 虚拟在线成员列表 (桌主 + 同桌食客)
  const mockParticipants = session?.participants && session.participants.length > 0
    ? session.participants.map((p, idx) => ({
        id: p.participantId,
        name: p.role === 'owner' ? `桌主 (${p.displayName || '张先生'})` : `同桌 (${p.displayName || `食客 ${idx}`})`,
        role: p.role,
        status: p.presence,
        device: 'iPhone 15 Pro Max',
        lastAction: idx === 0 ? '正在查看炭烤五花' : '选购黑熔岩蛋糕'
      }))
    : [
        {
          id: 'p-1',
          name: '桌主 (张先生)',
          role: 'owner',
          status: 'online',
          device: 'iPhone 15 Pro Max (微信)',
          lastAction: currentFrame?.actionSummary || '浏览菜单分类'
        },
        {
          id: 'p-2',
          name: '同桌 (李女士)',
          role: 'member',
          status: 'online',
          device: 'iPhone 14 Pro (小程序)',
          lastAction: '加购西点烘焙甜品'
        },
        {
          id: 'p-3',
          name: '同桌 (王先生)',
          role: 'member',
          status: 'online',
          device: '华为 Mate 60 Pro',
          lastAction: '在席查看餐品清单'
        }
      ];

  return (
    <aside className="w-80 shrink-0 bg-[#16181D] border-r border-[#262930] flex flex-col h-full overflow-y-auto scrollbar-none text-white select-none">
      {/* 顶部标题条 */}
      <div className="p-3 border-b border-[#262930] bg-[#121316]/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#3BB4FE] animate-pulse" />
          <span className="text-xs font-bold text-neutral-200 tracking-tight">
            1. 遥测状态与多端会话列
          </span>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          全息在网 100%
        </span>
      </div>

      <div className="p-3.5 space-y-3.5">
        {/* 核心台位工况卡片 */}
        <div className="bg-[#1A1D24] border border-[#2B303C] rounded-xl p-3 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-[#2B303C]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-neutral-800 text-neutral-200 border border-neutral-700">
                {tableCode}
              </span>
              <span className="text-xs font-bold text-neutral-100">{table.name || `餐车外摆 ${tableCode} 号桌`}</span>
            </div>
            <span className="text-[11px] font-medium text-neutral-400">
              {zoneLabel} ({capacity}人位)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-[#121418] rounded-lg border border-[#232731]">
              <span className="text-[10px] text-neutral-400 block mb-0.5">服务责任人</span>
              <span className="font-bold text-neutral-200 text-[11px]">{serverName}</span>
            </div>
            <div className="p-2 bg-[#121418] rounded-lg border border-[#232731]">
              <span className="text-[10px] text-neutral-400 block mb-0.5">就餐阶段</span>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-emerald-400 text-[11px]">{currentStageLabel}</span>
              </div>
            </div>
          </div>

          {/* 阻力犹豫指数工控环 */}
          <div className="p-2.5 bg-[#121418] rounded-lg border border-[#232731] space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#3BB4FE]" />
                <span className="text-[11px] font-semibold text-neutral-300">阻力犹豫指数</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-extrabold text-emerald-400">{diagnostic.hesitationIndex}%</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 rounded font-bold">
                  {diagnostic.hesitationLabel}
                </span>
              </div>
            </div>

            {/* 进度条 */}
            <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-[#3BB4FE] transition-all duration-300"
                style={{ width: `${diagnostic.hesitationIndex}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-neutral-400">
              <span>0% 极速直通</span>
              <span>决策耗时: 低于大盘 56%</span>
              <span>100% 临门退单</span>
            </div>
          </div>
        </div>

        {/* 真实操作 IP 遥测与基站风控卡片 */}
        <div className="bg-[#1A1D24] border border-[#2B303C] rounded-xl p-3 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#2B303C]">
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-bold text-neutral-200">
                真实操作 IP 与网络遥测
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              基站安全
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="p-2 bg-[#121418] rounded-lg border border-[#232731] flex items-center justify-between">
              <div>
                <span className="text-[10px] text-neutral-400 block mb-0.5">当前在网操作者 IP</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-neutral-100 text-[11.5px]">
                    {showFullIp ? telemetry.clientIp : telemetry.maskedIp}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowFullIp((v) => !v)}
                    className="text-[10px] text-[#3BB4FE] hover:underline cursor-pointer"
                  >
                    {showFullIp ? '隐藏' : '完整'}
                  </button>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-neutral-400 block mb-0.5">RTT 往返时延</span>
                <span className="text-emerald-400 font-bold text-[11px] flex items-center gap-1 justify-end">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {telemetry.rttLatencyMs}ms (优)
                </span>
              </div>
            </div>

            <div className="p-2 bg-[#121418] rounded-lg border border-[#232731] flex items-center justify-between text-[11px]">
              <span className="text-neutral-400">物理定位与 ISP:</span>
              <span className="text-neutral-200 font-medium truncate max-w-[170px]" title={telemetry.ipLocation}>
                {telemetry.ipLocation}
              </span>
            </div>

            <div className="p-2 bg-[#121418] rounded-lg border border-[#232731] flex items-center justify-between text-[11px]">
              <span className="text-neutral-400">远程协助状态:</span>
              {assistSession?.status === 'active' ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <MousePointer2 className="w-3 h-3 animate-bounce" />
                  受控协助中 (店员接管)
                </span>
              ) : assistSession?.status === 'requesting' ? (
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  <Radio className="w-3 h-3 animate-pulse" />
                  正在呼叫授权中...
                </span>
              ) : (
                <span className="text-neutral-400">就绪待命 (自主点餐)</span>
              )}
            </div>
          </div>
        </div>

        {/* 在席成员多端心跳感知卡片 */}
        <div className="bg-[#1A1D24] border border-[#2B303C] rounded-xl p-3 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#3BB4FE]" />
              <span className="text-xs font-bold text-neutral-200">
                在席成员心跳 ({mockParticipants.length}人在线)
              </span>
            </div>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              协同联络正常
            </span>
          </div>

          <div className="space-y-1.5">
            {mockParticipants.map((p, idx) => (
              <div
                key={p.id}
                className="p-2 bg-[#121418] rounded-lg border border-[#232731] flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-[10px] text-neutral-300 shrink-0">
                    {idx === 0 ? '👑' : idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-neutral-200 truncate">{p.name}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    </div>
                    <span className="text-[10px] text-neutral-400 truncate block">{p.device}</span>
                  </div>
                </div>

                <span className="text-[10px] text-neutral-300 bg-neutral-800/80 px-2 py-0.5 rounded border border-neutral-700 shrink-0 truncate max-w-[90px]">
                  {idx === 0 ? '已授权开单' : '参与加购'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 智能风控与跑单归因诊断卡片 */}
        <div className="bg-[#1A1D24] border border-[#2B303C] rounded-xl p-3 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-bold text-neutral-200">
                智能风控与跑单归因诊断
              </span>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              安全成单
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            {diagnostic.keyInsights.map((insight, idx) => (
              <div
                key={idx}
                className="p-2 bg-[#121418] rounded-lg border border-[#232731] flex items-start gap-2 text-neutral-300"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                <span className="text-[11px] leading-relaxed">{insight}</span>
              </div>
            ))}
          </div>

          <div className="pt-1 border-t border-[#232731] flex items-center justify-between text-[11px] text-neutral-400">
            <span>跑单流失风险: <strong className="text-emerald-400">极低 (4%)</strong></span>
            <span>规格切换: <strong className="text-neutral-200">{diagnostic.variantSwitchCount} 次</strong></span>
          </div>
        </div>

        {/* 硬件遥测与通道连通卡片 */}
        <div className="bg-[#1A1D24] border border-[#2B303C] rounded-xl p-3 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-200">
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#3BB4FE]" />
              <span>多端工业总线遥测</span>
            </div>
            <span className="text-[10px] text-neutral-400">3 通道在线</span>
          </div>

          <div className="space-y-1 text-[11px]">
            <div className="flex items-center justify-between p-1.5 bg-[#121418] rounded border border-[#232731]">
              <span className="text-neutral-400 flex items-center gap-1.5">
                <Wifi className="w-3 h-3 text-emerald-400" />
                前台手机端通信
              </span>
              <span className="text-emerald-400 font-semibold">18ms 心跳存活</span>
            </div>
            <div className="flex items-center justify-between p-1.5 bg-[#121418] rounded border border-[#232731]">
              <span className="text-neutral-400 flex items-center gap-1.5">
                <Flame className="w-3 h-3 text-amber-400" />
                后厨 KDS 调度通道
              </span>
              <span className="text-emerald-400 font-semibold">排产指令已下达</span>
            </div>
            <div className="flex items-center justify-between p-1.5 bg-[#121418] rounded border border-[#232731]">
              <span className="text-neutral-400 flex items-center gap-1.5">
                <Printer className="w-3 h-3 text-[#3BB4FE]" />
                蓝牙热敏打单引擎
              </span>
              <span className="text-emerald-400 font-semibold">已切纸就绪</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
