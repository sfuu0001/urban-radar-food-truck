import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldCheck,
  ShoppingBag,
  Clock,
  CheckCircle2,
  X,
  UserPlus,
  Eye,
  Radio,
  MapPin,
  Crown,
  UserMinus,
  Lock,
  Unlock,
  QrCode,
  Copy,
  Check,
  AlertCircle
} from 'lucide-react';
import { useTableSessionUi } from './useTableSessionUi';
import { TableQuickSwitchWidget } from './TableQuickSwitchWidget';
import { reactiveSyncBus } from '../../utils/reactiveSyncBus';
import {
  TableSession,
  DiningParticipant,
  LinkRequest
} from '../../types/tableSession';
import {
  ParticipantSeed,
  getOpenSessionByTableCode,
  acquireFirstBind,
  finalizeFirstBind,
  requestLink,
  settleLinkRequest,
  removeParticipant,
  transferOwnership,
  setParticipantAuthority,
  updateParticipantCart,
  updateParticipantNode,
  getLinkRequests,
  closeSession
} from '../../utils/tableSessionEngine';
import { generateShortCode } from '../../utils/tableQrEngine';
import { generateQrCodeDataUrl } from '../../utils/qrCodeEngine';

export interface DynamicTableMorphWidgetProps {
  currentTable?: string;
  onSwitchTable?: () => void;
  onSelectQuickTable?: (tableCode: string) => void;
  showToast?: (title: string, desc?: string) => void;
  diningMode?: string;
  isMerchantView?: boolean; // 商家端专属注入视角
}

const AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&h=120&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&h=120&fit=crop&crop=faces',
];

function getMemberAvatar(id: string, index: number): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATARS[(hash + index) % AVATARS.length];
}

function formatRelativeTime(isoString?: string): string {
  if (!isoString) return '刚刚';
  const diff = Date.now() - new Date(isoString).getTime();
  if (diff < 20000) return '刚刚';
  if (diff < 60000) return '半分钟前';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  return `${hours}小时前`;
}

export const DynamicTableMorphWidget: React.FC<DynamicTableMorphWidgetProps> = ({
  currentTable = 'A1',
  onSwitchTable,
  onSelectQuickTable,
  showToast,
  diningMode = 'dine_in',
  isMerchantView = false
}) => {
  const activeTableCode = (currentTable || 'A1').toUpperCase();
  const [isExpanded, setIsExpanded] = useState<boolean>(isMerchantView);
  const [embeddedTab, setEmbeddedTab] = useState<'status_flow' | 'auth_management'>('status_flow');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [inlineFeedback, setInlineFeedback] = useState<string | null>(null);

  // 挂载真实 TableSessionUi 状态体系
  const { actions, myParticipant, identity, activeSession } = useTableSessionUi();

  // 本地同步维护当前桌号的真实 Session
  const [session, setSession] = useState<TableSession | null>(() => {
    if (activeSession && activeSession.tableCode.toUpperCase() === activeTableCode) {
      return activeSession;
    }
    return getOpenSessionByTableCode(activeTableCode) || null;
  });

  // 刷新当前桌台的真实 Session
  const refreshCurrentSession = useCallback(() => {
    const found = getOpenSessionByTableCode(activeTableCode);
    setSession(found || null);
  }, [activeTableCode]);

  // 自动开台保障：若当前处于堂食就餐模式且该桌尚未开台，真实开立有效会话
  useEffect(() => {
    if (diningMode === 'dine_in' && identity && !session) {
      const existing = getOpenSessionByTableCode(activeTableCode);
      if (!existing) {
        const acquired = acquireFirstBind({
          tableId: `tbl-${activeTableCode.toLowerCase()}`,
          tableCode: activeTableCode,
          seed: {
            participantId: identity.participantId,
            displayName: myParticipant?.displayName || '桌主 (顾客)',
            deviceFingerprint: identity.deviceFingerprint
          }
        });
        if (acquired.ok && acquired.value) {
          finalizeFirstBind(acquired.value.sessionId, 2, identity.participantId);
          refreshCurrentSession();
          actions.init();
        }
      } else {
        setSession(existing);
      }
    }
  }, [activeTableCode, diningMode, identity, session, myParticipant, actions, refreshCurrentSession]);

  // 监听全系统级真实 Session 突变与授权流转
  useEffect(() => {
    refreshCurrentSession();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'obsidian_table_sessions' || e.key === 'obsidian_table_link_requests') {
        refreshCurrentSession();
      }
    };

    const unsub1 = reactiveSyncBus.subscribe('TABLE_SESSION_MUTATED', () => refreshCurrentSession());
    const unsub2 = reactiveSyncBus.subscribe('TABLE_LINK_SETTLED', () => refreshCurrentSession());
    const unsub3 = reactiveSyncBus.subscribe('TABLE_LINK_REQUEST', () => refreshCurrentSession());
    const unsub4 = reactiveSyncBus.subscribe('PARTICIPANT_NODE_CHANGED', () => refreshCurrentSession());

    window.addEventListener('storage', handleStorage);
    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      window.removeEventListener('storage', handleStorage);
    };
  }, [activeTableCode, refreshCurrentSession]);

  // 当外部 activeSession 变更时联动更新
  useEffect(() => {
    if (activeSession && activeSession.tableCode.toUpperCase() === activeTableCode) {
      setSession(activeSession);
    }
  }, [activeSession, activeTableCode]);

  // 获取当前桌台有效活跃参与者（真实数据）
  const activeParticipants = useMemo<DiningParticipant[]>(() => {
    if (!session || !session.participants) return [];
    return session.participants.filter((p) => !p.removedAt);
  }, [session]);

  // 真实计算整桌协同加购总览
  const tableTotalCartItems = useMemo(() => {
    return activeParticipants.reduce((sum, p) => sum + (p.cartSummary?.itemCount || 0), 0);
  }, [activeParticipants]);

  const tableTotalCartAmount = useMemo(() => {
    return activeParticipants.reduce((sum, p) => sum + (p.cartSummary?.totalAmount || 0), 0);
  }, [activeParticipants]);

  // 真实获取当前桌等待桌主审核的申请列表
  const pendingRequests = useMemo<LinkRequest[]>(() => {
    if (!session) return [];
    const all = getLinkRequests();
    return all.filter((r) => r.sessionId === session.sessionId && r.status === 'pending');
  }, [session]);

  // 判断当前用户是否拥有本桌管理权限（桌主或协管）
  const hasManageAuth = useMemo(() => {
    if (isMerchantView) return true;
    if (!session || !identity) return false;
    const me = session.participants.find(
      (p) => p.participantId === identity.participantId && !p.removedAt
    );
    return me?.role === 'owner' || me?.authority === 'manage';
  }, [isMerchantView, session, identity]);

  // 生成真实短码与二维码
  const shortCode = useMemo(() => {
    return generateShortCode(activeTableCode);
  }, [activeTableCode]);

  const handleOpenQrCode = async () => {
    const url = `${window.location.origin}/#table=${activeTableCode}&token=${session?.qrToken || 'active'}`;
    try {
      const dataUrl = await generateQrCodeDataUrl(url, { width: 260 });
      setQrDataUrl(dataUrl);
      setShowQrModal(true);
    } catch (e) {
      // ignore
    }
  };

  const handleCopyInviteText = () => {
    const text = `【Urban Radar 流动餐车】邀请您同桌就餐！桌号：${activeTableCode}，点餐口令：${shortCode}。扫码或输入口令即可实时协同加购。`;
    navigator.clipboard?.writeText(text);
    setCopiedCode(true);
    setInlineFeedback(`已复制 ${activeTableCode} 号桌同桌点餐邀请口令`);
    setTimeout(() => {
      setCopiedCode(false);
      setInlineFeedback(null);
    }, 2500);
  };

  // 真实审批通过申请人
  const handleApproveRequest = (req: LinkRequest) => {
    if (!session) return;
    const actorId = identity?.participantId || session.ownerParticipantId;
    const outcome = settleLinkRequest({
      requestId: req.requestId,
      decision: 'granted',
      actorId
    });

    if (outcome.ok) {
      reactiveSyncBus.publish('TABLE_LINK_SETTLED', {
        requestId: req.requestId,
        sessionId: session.sessionId,
        tableCode: activeTableCode,
        status: 'granted',
        at: new Date().toISOString()
      });
      reactiveSyncBus.publish('TABLE_SESSION_MUTATED', {
        sessionId: session.sessionId,
        tableCode: activeTableCode,
        change: 'participant_joined',
        actorId,
        participantId: req.requesterId,
        at: new Date().toISOString()
      });
      refreshCurrentSession();
      setInlineFeedback(`已批准 ${req.requesterName || '新食客'} 加入同桌点餐`);
      setTimeout(() => setInlineFeedback(null), 3000);
    }
  };

  // 真实拒绝申请人
  const handleRejectRequest = (req: LinkRequest) => {
    if (!session) return;
    const actorId = identity?.participantId || session.ownerParticipantId;
    const outcome = settleLinkRequest({
      requestId: req.requestId,
      decision: 'denied',
      actorId,
      reason: '桌主拒绝入座'
    });

    if (outcome.ok) {
      reactiveSyncBus.publish('TABLE_LINK_SETTLED', {
        requestId: req.requestId,
        sessionId: session.sessionId,
        tableCode: activeTableCode,
        status: 'denied',
        at: new Date().toISOString()
      });
      refreshCurrentSession();
      setInlineFeedback(`已拒绝该入座申请`);
      setTimeout(() => setInlineFeedback(null), 2500);
    }
  };

  // 真实快捷添加同桌食客加入（写入真实 tableSessionEngine）
  const handleAddRealCompanion = (guestName: string) => {
    if (!session) return;
    const guestSeed: ParticipantSeed = {
      participantId: `guest_${Date.now().toString(36)}_${Math.floor(Math.random() * 1000)}`,
      displayName: guestName,
      deviceFingerprint: `dev_fingerprint_${Math.floor(Math.random() * 10000)}`
    };

    const reqRes = requestLink({
      tableCode: activeTableCode,
      seed: guestSeed
    });

    if (reqRes.ok && reqRes.value) {
      const actorId = identity?.participantId || session.ownerParticipantId;
      settleLinkRequest({
        requestId: reqRes.value.requestId,
        decision: 'granted',
        actorId
      });
      reactiveSyncBus.publish('TABLE_SESSION_MUTATED', {
        sessionId: session.sessionId,
        tableCode: activeTableCode,
        change: 'participant_joined',
        actorId,
        participantId: guestSeed.participantId,
        at: new Date().toISOString()
      });
      refreshCurrentSession();
      setInlineFeedback(`同桌食客 ${guestName} 已成功入座并开启协同`);
      setTimeout(() => setInlineFeedback(null), 3000);
    }
  };

  // 真实测试协同加购：为指定成员写入真实的加购记录与状态节点
  const handleSimulateMemberCart = (participantId: string, memberName: string) => {
    if (!session) return;
    const dishes = [
      { name: '炭火慢烤和牛汉堡', price: 48, cat: '招牌主食' },
      { name: '美式金牌香脆薯条', price: 18, cat: '特色小吃' },
      { name: '精酿鲜萃青柠苏打', price: 16, cat: '特调饮品' },
      { name: '法式黑松露牛肉卷', price: 36, cat: '招牌主食' },
      { name: '炙烤迷迭香鸡翅 (4只)', price: 28, cat: '特色小吃' }
    ];
    const chosen = dishes[Math.floor(Math.random() * dishes.length)];
    const existing = session.participants.find((p) => p.participantId === participantId);
    const prevCount = existing?.cartSummary?.itemCount || 0;
    const prevAmount = existing?.cartSummary?.totalAmount || 0;

    const nextCount = prevCount + 1;
    const nextAmount = prevAmount + chosen.price;

    updateParticipantCart({
      sessionId: session.sessionId,
      participantId,
      cart: {
        itemCount: nextCount,
        totalAmount: nextAmount,
        updatedAt: new Date().toISOString()
      }
    });

    updateParticipantNode({
      sessionId: session.sessionId,
      participantId,
      node: {
        categoryName: chosen.cat,
        lastClickedDishName: chosen.name,
        at: new Date().toISOString()
      }
    });

    reactiveSyncBus.publish('TABLE_SESSION_MUTATED', {
      sessionId: session.sessionId,
      tableCode: activeTableCode,
      change: 'participant_joined',
      participantId,
      at: new Date().toISOString()
    });
    refreshCurrentSession();
    setInlineFeedback(`${memberName} 加购了「${chosen.name}」(¥${chosen.price})`);
    setTimeout(() => setInlineFeedback(null), 3000);
  };

  // 真实移交桌主
  const handleTransferOwnership = (toParticipantId: string, targetName: string) => {
    if (!session || !identity) return;
    const outcome = transferOwnership({
      sessionId: session.sessionId,
      actorId: identity.participantId,
      toParticipantId
    });

    if (outcome.ok) {
      reactiveSyncBus.publish('TABLE_SESSION_MUTATED', {
        sessionId: session.sessionId,
        tableCode: activeTableCode,
        change: 'owner_transferred',
        actorId: identity.participantId,
        participantId: toParticipantId,
        at: new Date().toISOString()
      });
      refreshCurrentSession();
      setInlineFeedback(`已将 ${activeTableCode} 号桌桌主席位移交给 ${targetName}`);
      setTimeout(() => setInlineFeedback(null), 3000);
    }
  };

  // 真实权限变更
  const handleToggleAuthority = (targetId: string, currentAuth: string) => {
    if (!session || !identity) return;
    const nextAuth = currentAuth === 'manage' ? 'order_only' : 'manage';
    const outcome = setParticipantAuthority({
      sessionId: session.sessionId,
      actorId: identity.participantId,
      targetId,
      authority: nextAuth
    });

    if (outcome.ok) {
      reactiveSyncBus.publish('TABLE_SESSION_MUTATED', {
        sessionId: session.sessionId,
        tableCode: activeTableCode,
        change: 'authority_changed',
        actorId: identity.participantId,
        participantId: targetId,
        at: new Date().toISOString()
      });
      refreshCurrentSession();
      setInlineFeedback(`已变更就餐人点餐管理权限为：${nextAuth === 'manage' ? '协同管理' : '仅点单'}`);
      setTimeout(() => setInlineFeedback(null), 3000);
    }
  };

  // 真实移出成员
  const handleRemoveMember = (targetId: string, targetName: string) => {
    if (!session || !identity) return;
    const outcome = removeParticipant({
      sessionId: session.sessionId,
      actorId: identity.participantId,
      targetId,
      reason: '桌主移出同桌'
    });

    if (outcome.ok) {
      reactiveSyncBus.publish('TABLE_SESSION_MUTATED', {
        sessionId: session.sessionId,
        tableCode: activeTableCode,
        change: 'participant_removed',
        actorId: identity.participantId,
        participantId: targetId,
        at: new Date().toISOString()
      });
      refreshCurrentSession();
      setInlineFeedback(`已将 ${targetName} 从同桌点餐中解绑`);
      setTimeout(() => setInlineFeedback(null), 3000);
    }
  };

  // 商家重置本桌清台
  const handleMerchantResetSession = () => {
    if (!session) return;
    closeSession({
      sessionId: session.sessionId,
      closedBy: 'merchant'
    });
    reactiveSyncBus.publish('TABLE_SESSION_MUTATED', {
      sessionId: session.sessionId,
      tableCode: activeTableCode,
      change: 'closed',
      at: new Date().toISOString()
    });
    refreshCurrentSession();
    setInlineFeedback(`商家端已将 ${activeTableCode} 号桌完成清台`);
    setTimeout(() => setInlineFeedback(null), 3000);
  };

  // 仅在堂食模式下渲染
  if (diningMode !== 'dine_in') return null;

  return (
    <div className={`w-full max-w-4xl mx-auto ${isMerchantView ? 'px-0 my-3' : 'px-3.5 my-2'}`}>
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 360, damping: 28 }}
        className={`relative rounded-2xl border transition-all ${
          isMerchantView
            ? 'border-emerald-300 bg-linear-to-r from-emerald-50/70 via-white to-neutral-50 shadow-xs'
            : 'border-neutral-200/90 bg-white/95 backdrop-blur-md shadow-xs'
        } ${isExpanded ? 'overflow-visible' : 'overflow-hidden'}`}
      >
        {/* 顶部标题条 */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-3.5 py-2.5 flex items-center justify-between cursor-pointer hover:bg-neutral-50/80 transition-colors select-none"
        >
          <div className="flex items-center space-x-2.5 min-w-0">
            {/* 呼吸绿点徽标 */}
            <div className="relative flex items-center justify-center shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="absolute w-4 h-4 rounded-full bg-emerald-400/40 animate-ping" />
            </div>

            {/* 桌号与同桌人数 */}
            <div className="flex items-center space-x-2 min-w-0 flex-wrap">
              {isMerchantView && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white shrink-0">
                  商家端·协同双向监管
                </span>
              )}
              <span className="font-extrabold text-sm text-neutral-900 tracking-tight font-mono">
                {activeTableCode} 号桌
              </span>
              <span className="w-1 h-1 rounded-full bg-neutral-300" />
              <span className="text-xs font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200 flex items-center gap-1">
                <Users className="w-3 h-3" />
                {activeParticipants.length}人同桌
              </span>
              <span className="hidden sm:inline-block text-xs text-neutral-500 truncate">
                {tableTotalCartItems > 0
                  ? `已协同选购 ${tableTotalCartItems} 件 · ¥${tableTotalCartAmount.toFixed(2)}`
                  : '真实同桌多人协同点餐中'}
              </span>
            </div>
          </div>

          {/* 右侧同桌食客头像群 + 展开手柄 */}
          <div className="flex items-center space-x-2 shrink-0">
            <div className="flex -space-x-1.5 items-center">
              {activeParticipants.slice(0, 4).map((m, idx) => (
                <img
                  key={m.participantId}
                  src={getMemberAvatar(m.participantId, idx)}
                  alt={m.displayName}
                  className="w-5 h-5 rounded-full object-cover border-2 border-white shadow-2xs"
                  title={m.displayName}
                />
              ))}
            </div>
            <button
              type="button"
              className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 hover:text-neutral-900 transition-transform cursor-pointer"
              title={isExpanded ? '收起' : '展开同桌点餐面板'}
            >
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* 内置轻量反馈条（非弹窗形式，就地提示） */}
        <AnimatePresence>
          {inlineFeedback && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-emerald-50 border-t border-emerald-200 px-3.5 py-1.5 text-xs text-emerald-800 font-medium flex items-center justify-between"
            >
              <div className="flex items-center gap-1.5 truncate">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">{inlineFeedback}</span>
              </div>
              <button
                type="button"
                onClick={() => setInlineFeedback(null)}
                className="text-emerald-600 hover:text-emerald-900 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 展开态面板 */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="border-t border-neutral-100 px-3.5 pt-3 pb-3.5 space-y-3"
            >
              {/* 顶部控制栏 */}
              <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100 flex-wrap gap-2">
                {/* 左侧：换桌与桌号 */}
                <div className="flex items-center space-x-2">
                  <TableQuickSwitchWidget
                    currentTable={currentTable}
                    onSelectTable={(code) => {
                      onSelectQuickTable?.(code);
                    }}
                    onOpenFullMatrix={onSwitchTable}
                  />

                  {/* 邀请好友同桌扫码 */}
                  <button
                    type="button"
                    onClick={handleOpenQrCode}
                    className="px-2.5 py-1 rounded-xl text-xs font-semibold text-neutral-700 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 transition flex items-center space-x-1 cursor-pointer"
                    title="查看桌台专属二维码"
                  >
                    <QrCode className="w-3 h-3 text-neutral-600" />
                    <span>桌台二维码</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyInviteText}
                    className="px-2.5 py-1 rounded-xl text-xs font-semibold text-neutral-700 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 transition flex items-center space-x-1 cursor-pointer"
                    title="复制同桌点餐邀请口令"
                  >
                    {copiedCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-neutral-600" />}
                    <span>{copiedCode ? '已复制口令' : '复制口令'}</span>
                  </button>
                </div>

                {/* 右侧：整桌协同加购总计 */}
                <div className="flex items-center space-x-2">
                  {isMerchantView && (
                    <button
                      type="button"
                      onClick={handleMerchantResetSession}
                      className="px-2 py-1 rounded-lg text-xs font-semibold bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 transition cursor-pointer"
                    >
                      清台重置
                    </button>
                  )}

                  <div className="px-2.5 py-1 rounded-xl text-xs font-mono font-extrabold bg-orange-50 border border-orange-200 text-orange-800 flex items-center space-x-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-orange-600" />
                    <span>全桌加购: {tableTotalCartItems}件 · ¥{tableTotalCartAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* 标签切换栏 */}
              <div className="flex items-center space-x-1.5 p-1 bg-neutral-100/80 rounded-xl text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setEmbeddedTab('status_flow')}
                  className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                    embeddedTab === 'status_flow'
                      ? 'bg-white text-neutral-900 shadow-2xs'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
                  <span>真实协同点餐状态流 ({activeParticipants.length}人)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEmbeddedTab('auth_management')}
                  className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                    embeddedTab === 'auth_management'
                      ? 'bg-white text-neutral-900 shadow-2xs'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  <ShieldCheck className="w-3 h-3 text-amber-500" />
                  <span>桌主授权与同桌管理</span>
                  {pendingRequests.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-500 text-white font-mono">
                      {pendingRequests.length}
                    </span>
                  )}
                </button>
              </div>

              {/* 内容区域 1：真实协同点餐状态流 */}
              {embeddedTab === 'status_flow' && (
                <div className="space-y-2">
                  {/* 整桌协同加购汇聚横幅 */}
                  <div className="p-2.5 rounded-xl bg-gradient-to-r from-orange-50/70 via-amber-50/50 to-white border border-orange-200/80 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2 min-w-0">
                      <Sparkles className="w-4 h-4 text-orange-600 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-bold text-neutral-900">同桌点单协同池：</span>
                        <span className="text-neutral-600">
                          {activeParticipants.length > 1
                            ? `各就餐人加购实时汇总，桌主或食客均可统一核对提交`
                            : `等待好友入座，扫桌码或点餐口令即可并入本桌协同`}
                        </span>
                      </div>
                    </div>
                    <div className="font-mono font-extrabold text-orange-700 shrink-0 text-sm">
                      ¥{tableTotalCartAmount.toFixed(2)}
                    </div>
                  </div>

                  {/* 真实成员状态流列表 */}
                  {activeParticipants.map((p, idx) => {
                    const isMe = identity?.participantId === p.participantId;
                    const cartCount = p.cartSummary?.itemCount || 0;
                    const cartTotal = p.cartSummary?.totalAmount || 0;
                    const lastDish = p.lastNode?.lastClickedDishName;
                    const lastCat = p.lastNode?.categoryName;
                    const spend = p.spendAttribution || 0;

                    // 计算真实状态与文案
                    let statusBadge: 'submitted' | 'adding' | 'browsing' | 'idle' = 'idle';
                    let statusLabel = '已入座，正在浏览餐单';

                    if (spend > 0 && cartCount === 0) {
                      statusBadge = 'submitted';
                      statusLabel = `已提交餐单 · 累计消费 ¥${spend.toFixed(2)}`;
                    } else if (cartCount > 0) {
                      statusBadge = 'adding';
                      statusLabel = `已选购 ${cartCount} 件餐品 · ¥${cartTotal.toFixed(2)}`;
                    } else if (lastDish) {
                      statusBadge = 'browsing';
                      statusLabel = `正在挑选：${lastDish}`;
                    } else if (lastCat) {
                      statusBadge = 'browsing';
                      statusLabel = `正在浏览：${lastCat} 分类`;
                    }

                    return (
                      <div
                        key={p.participantId}
                        className="p-2.5 rounded-xl border border-neutral-100 bg-neutral-50/70 hover:bg-neutral-100/70 transition-all flex items-center justify-between gap-2.5"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div className="relative shrink-0">
                            <img
                              src={getMemberAvatar(p.participantId, idx)}
                              alt={p.displayName}
                              className="w-8 h-8 rounded-full object-cover border border-neutral-200"
                            />
                            {p.role === 'owner' ? (
                              <span
                                className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[9px] font-bold shadow-2xs"
                                title="桌主"
                              >
                                ★
                              </span>
                            ) : (
                              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center space-x-2 flex-wrap">
                              <span className="text-xs font-bold text-neutral-900 truncate">
                                {p.displayName} {isMe && <span className="text-orange-600 font-extrabold">(我)</span>}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white text-neutral-600 border border-neutral-200">
                                #CART-{activeTableCode}-{p.participantId.slice(-4).toUpperCase()}
                              </span>
                            </div>

                            <p className="text-[11px] text-neutral-600 mt-0.5 truncate flex items-center gap-1">
                              {statusBadge === 'adding' && <ShoppingBag className="w-3 h-3 text-orange-600 shrink-0" />}
                              {statusBadge === 'browsing' && <Eye className="w-3 h-3 text-blue-500 shrink-0" />}
                              {statusBadge === 'submitted' && <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />}
                              {statusBadge === 'idle' && <Clock className="w-3 h-3 text-neutral-400 shrink-0" />}
                              <span>{statusLabel}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          {/* 针对同桌协作者的真实加购模拟按钮（便于无第二台手机时现场体验真实加购联动） */}
                          {!isMe && (
                            <button
                              type="button"
                              onClick={() => handleSimulateMemberCart(p.participantId, p.displayName)}
                              className="px-2 py-0.8 rounded-lg text-[10.5px] font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 transition cursor-pointer"
                              title="模拟该同桌好友加购一件餐品"
                            >
                              + 加购餐品
                            </button>
                          )}

                          <div className="text-right">
                            <span className="text-[10px] text-neutral-400 block font-mono">
                              {formatRelativeTime(p.lastSeenAt || p.joinedAt)}
                            </span>
                            <span
                              className={`inline-block mt-0.5 text-[9.5px] px-1.5 py-0.2 rounded font-medium ${
                                p.role === 'owner'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {p.role === 'owner' ? '桌主席位' : '已授权就座'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 内容区域 2：真实桌主授权管理面板 */}
              {embeddedTab === 'auth_management' && (
                <div className="space-y-3 bg-neutral-50/70 p-3 rounded-2xl border border-neutral-200/80">
                  {/* 待审批的新食客入座卡片 */}
                  {pendingRequests.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>待桌主审批的入座申请 ({pendingRequests.length})</span>
                      </div>
                      {pendingRequests.map((req) => (
                        <div
                          key={req.requestId}
                          className="p-3 rounded-xl bg-amber-50 border border-amber-300 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <img
                              src={getMemberAvatar(req.requesterId, 0)}
                              alt={req.requesterName}
                              className="w-8 h-8 rounded-full object-cover border border-amber-300"
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-amber-900 truncate">
                                {req.requesterName || '新食客'} 申请加入
                              </div>
                              <div className="text-[10.5px] text-amber-700">
                                正在扫描 {activeTableCode} 号桌申请协同点单
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleApproveRequest(req)}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition cursor-pointer"
                            >
                              同意
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectRequest(req)}
                              className="px-2.5 py-1 rounded-lg text-xs font-medium text-neutral-600 hover:bg-neutral-200 bg-white border border-neutral-200 transition cursor-pointer"
                            >
                              拒绝
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 真实成员名单管理 */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-neutral-600 px-1 flex items-center justify-between">
                      <span>同桌已授权成员名单 ({activeParticipants.length} 人)</span>
                      <span className="text-neutral-400 font-normal text-[10px]">
                        {hasManageAuth ? '您拥有桌台管理权限' : '仅桌主可变更席位权限'}
                      </span>
                    </div>

                    {activeParticipants.map((m, idx) => {
                      const isMe = identity?.participantId === m.participantId;
                      return (
                        <div
                          key={m.participantId}
                          className="p-2 rounded-xl bg-white border border-neutral-200 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <img
                              src={getMemberAvatar(m.participantId, idx)}
                              alt={m.displayName}
                              className="w-7 h-7 rounded-full object-cover border border-neutral-200"
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-neutral-900 truncate flex items-center gap-1">
                                <span>{m.displayName}</span>
                                {isMe && <span className="text-orange-600 text-[10.5px] font-bold">(我)</span>}
                                {m.role === 'owner' && (
                                  <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-medium">
                                    桌主
                                  </span>
                                )}
                                {m.authority === 'manage' && m.role !== 'owner' && (
                                  <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-medium">
                                    协管
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-neutral-400 font-mono">
                                #CART-{activeTableCode}-{m.participantId.slice(-4).toUpperCase()}
                              </div>
                            </div>
                          </div>

                          {/* 权限管理操作 */}
                          {hasManageAuth && !isMe && (
                            <div className="flex items-center space-x-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleTransferOwnership(m.participantId, m.displayName)}
                                className="px-2 py-0.8 rounded-lg text-[10.5px] font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition cursor-pointer"
                                title="将桌主身份移交给该成员"
                              >
                                设为桌主
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleAuthority(m.participantId, m.authority)}
                                className="px-2 py-0.8 rounded-lg text-[10.5px] font-medium text-neutral-700 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 transition cursor-pointer"
                                title="切换协管与普通权限"
                              >
                                {m.authority === 'manage' ? '降为点单' : '设为协管'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(m.participantId, m.displayName)}
                                className="p-1 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                                title="移出同桌点餐"
                              >
                                <UserMinus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {isMe && (
                            <span className="text-[10.5px] text-neutral-400 px-2 py-0.5 font-medium">
                              当前设备席位
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 底部真实接入同桌就餐人快捷操作栏 */}
              <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs flex-wrap gap-2">
                <span className="text-neutral-500 text-[11px]">
                  快捷接入同桌就餐人 (真实会话)：
                </span>
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => handleAddRealCompanion('同桌食客 · 小林')}
                    className="px-2 py-1 rounded-lg text-xs font-semibold text-neutral-700 hover:text-black bg-white hover:bg-neutral-100 border border-neutral-200 shadow-2xs flex items-center space-x-1 transition cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-orange-600" />
                    <span>+ 小林</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddRealCompanion('同桌食客 · 阿强')}
                    className="px-2 py-1 rounded-lg text-xs font-semibold text-neutral-700 hover:text-black bg-white hover:bg-neutral-100 border border-neutral-200 shadow-2xs flex items-center space-x-1 transition cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                    <span>+ 阿强</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddRealCompanion('同桌食客 · 小雅')}
                    className="px-2 py-1 rounded-lg text-xs font-semibold text-neutral-700 hover:text-black bg-white hover:bg-neutral-100 border border-neutral-200 shadow-2xs flex items-center space-x-1 transition cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>+ 小雅</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* 真实二维码弹层 */}
      <AnimatePresence>
        {showQrModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-xs w-full shadow-2xl border border-neutral-200 text-center relative"
            >
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-3">
                <QrCode className="w-5 h-5" />
              </div>

              <h3 className="text-base font-extrabold text-neutral-900">
                {activeTableCode} 号桌专属点餐码
              </h3>
              <p className="text-xs text-neutral-500 mt-1 mb-4">
                好友扫码或凭借点餐口令，即可实时同桌协同选购餐品
              </p>

              {qrDataUrl ? (
                <div className="bg-neutral-50 p-3 rounded-2xl border border-neutral-200 inline-block mb-4">
                  <img src={qrDataUrl} alt="桌台二维码" className="w-48 h-48 rounded-lg mx-auto" />
                </div>
              ) : (
                <div className="w-48 h-48 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-xs text-neutral-400">
                  生成二维码中...
                </div>
              )}

              <div className="bg-neutral-100 px-3 py-2 rounded-xl flex items-center justify-between text-xs font-mono font-bold text-neutral-800 mb-4">
                <span>点餐口令: {shortCode}</span>
                <button
                  type="button"
                  onClick={handleCopyInviteText}
                  className="text-orange-600 hover:text-orange-700 cursor-pointer text-xs"
                >
                  {copiedCode ? '已复制' : '复制'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition cursor-pointer"
              >
                关闭窗口
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DynamicTableMorphWidget;
