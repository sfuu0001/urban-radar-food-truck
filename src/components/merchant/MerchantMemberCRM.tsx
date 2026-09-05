import React, { useState } from 'react';
import { 
  Users, 
  CreditCard, 
  Award, 
  Plus, 
  Search, 
  DollarSign, 
  Coins, 
  ArrowDownRight, 
  ArrowUpRight, 
  Download, 
  Gift, 
  Phone, 
  Calendar,
  Sparkles,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { 
  MemberRecord, 
  MemberRechargeRecord, 
  MemberTier 
} from '../../types';
import { 
  INITIAL_MEMBERS, 
  INITIAL_MEMBER_RECHARGES 
} from '../../data/merchantExtendedMockData';
import { exportToCsv } from '../../utils/dataExportEngine';
import { playChimeSound } from '../../utils/voiceAlertEngine';

interface MerchantMemberCRMProps {
  showToast: (msg: string) => void;
}

export const MerchantMemberCRM: React.FC<MerchantMemberCRMProps> = ({ showToast }) => {
  const [members, setMembers] = useState<MemberRecord[]>(() => {
    const raw = localStorage.getItem('obsidian_members_crm');
    return raw ? JSON.parse(raw) : INITIAL_MEMBERS;
  });

  const [recharges, setRecharges] = useState<MemberRechargeRecord[]>(() => {
    const raw = localStorage.getItem('obsidian_member_recharges');
    return raw ? JSON.parse(raw) : INITIAL_MEMBER_RECHARGES;
  });

  const [activeTab, setActiveTab] = useState<'members' | 'recharges' | 'rules'>('members');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  
  // Recharge Modal State
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState<boolean>(false);
  const [targetMember, setTargetMember] = useState<MemberRecord | null>(null);
  const [rechargeAmount, setRechargeAmount] = useState<number>(200);
  const [bonusAmount, setBonusAmount] = useState<number>(30);
  const [paymentMethod, setPaymentMethod] = useState<'wechat' | 'alipay' | 'cash' | 'pos'>('wechat');
  const [rechargeNote, setRechargeNote] = useState<string>('');

  // New Member Modal State
  const [isNewMemberModalOpen, setIsNewMemberModalOpen] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [newTier, setNewTier] = useState<MemberTier>('regular');
  const [initialBalance, setInitialBalance] = useState<number>(0);

  const saveMembers = (updated: MemberRecord[]) => {
    setMembers(updated);
    localStorage.setItem('obsidian_members_crm', JSON.stringify(updated));
  };

  const saveRecharges = (updated: MemberRechargeRecord[]) => {
    setRecharges(updated);
    localStorage.setItem('obsidian_member_recharges', JSON.stringify(updated));
  };

  const handleOpenRecharge = (member: MemberRecord) => {
    setTargetMember(member);
    setRechargeAmount(200);
    setBonusAmount(30);
    setIsRechargeModalOpen(true);
  };

  const handleConfirmRecharge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetMember) return;

    const totalReceived = rechargeAmount + bonusAmount;
    const newRecord: MemberRechargeRecord = {
      id: `rcg-${Date.now()}`,
      recordNo: `RC${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${Math.floor(Math.random() * 90 + 10)}`,
      memberId: targetMember.id,
      memberName: targetMember.name,
      phone: targetMember.phone,
      rechargeAmount,
      bonusAmount,
      totalReceived,
      paymentMethod,
      operator: '店长 (张伟)',
      timestamp: new Date().toLocaleString('zh-CN', { hour12: false }),
      note: rechargeNote || (bonusAmount > 0 ? `充值赠送 ¥${bonusAmount}` : '普通充值')
    };

    // Update member balance and points
    const earnedPoints = Math.floor(rechargeAmount);
    const updatedMembers = members.map(m => {
      if (m.id === targetMember.id) {
        const newBalance = m.balance + totalReceived;
        const newTotalSpent = m.totalSpent + rechargeAmount;
        // Auto tier upgrade check
        let upgradedTier: MemberTier = m.tier;
        let upgradedTierName = m.tierName;
        let upgradedDiscount = m.discountRate;

        if (newTotalSpent >= 3000) {
          upgradedTier = 'diamond';
          upgradedTierName = '黑钻会员';
          upgradedDiscount = 0.85;
        } else if (newTotalSpent >= 1500) {
          upgradedTier = 'gold';
          upgradedTierName = '黄金会员';
          upgradedDiscount = 0.90;
        } else if (newTotalSpent >= 500) {
          upgradedTier = 'silver';
          upgradedTierName = '白银会员';
          upgradedDiscount = 0.95;
        }

        return {
          ...m,
          balance: newBalance,
          points: m.points + earnedPoints,
          totalSpent: newTotalSpent,
          tier: upgradedTier,
          tierName: upgradedTierName,
          discountRate: upgradedDiscount
        };
      }
      return m;
    });

    saveMembers(updatedMembers);
    saveRecharges([newRecord, ...recharges]);
    setIsRechargeModalOpen(false);
    playChimeSound('success');
    showToast(`会员【${targetMember.name}】成功充值 ¥${rechargeAmount}（赠送 ¥${bonusAmount}），实际到账 ¥${totalReceived}！`);
  };

  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone) return;

    const discountRate = newTier === 'diamond' ? 0.85 : newTier === 'gold' ? 0.90 : newTier === 'silver' ? 0.95 : 1.0;
    const tierName = newTier === 'diamond' ? '黑钻会员' : newTier === 'gold' ? '黄金会员' : newTier === 'silver' ? '白银会员' : '大众会员';

    const newMember: MemberRecord = {
      id: `mem-${Date.now()}`,
      memberNo: `M${Math.floor(1000 + Math.random() * 9000)}`,
      name: newName,
      phone: newPhone,
      tier: newTier,
      tierName,
      discountRate,
      balance: initialBalance,
      points: 100, // 注册赠送 100 积分
      totalSpent: initialBalance,
      orderCount: initialBalance > 0 ? 1 : 0,
      lastVisit: '刚刚',
      registeredAt: new Date().toISOString().slice(0, 10),
      tags: ['新会员登记'],
      couponCount: 1
    };

    saveMembers([newMember, ...members]);
    setIsNewMemberModalOpen(false);
    setNewName('');
    setNewPhone('');
    setInitialBalance(0);
    playChimeSound('success');
    showToast(`新会员【${newName}】建档成功！已赠送 100 初始积分`);
  };

  const handleExportMembers = () => {
    exportToCsv(
      '黑石餐车_会员资产总表',
      [
        { label: '会员卡号', key: 'memberNo' },
        { label: '姓名', key: 'name' },
        { label: '手机号', key: 'phone' },
        { label: '会员等级', key: 'tierName' },
        { label: '专属折扣', key: 'discountRate' },
        { label: '储值余额(元)', key: 'balance' },
        { label: '当前积分', key: 'points' },
        { label: '累计消费(元)', key: 'totalSpent' },
        { label: '注册日期', key: 'registeredAt' }
      ],
      members
    );
    showToast('会员总表导出已开始下载！');
  };

  const filteredMembers = members.filter(m => {
    const matchQuery = m.name.includes(searchQuery) || m.phone.includes(searchQuery) || m.memberNo.includes(searchQuery);
    const matchTier = selectedTier === 'all' || m.tier === selectedTier;
    return matchQuery && matchTier;
  });

  const totalMemberBalance = members.reduce((sum, m) => sum + m.balance, 0);
  const totalRechargeCash = recharges.reduce((sum, r) => sum + r.rechargeAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-[#e3e2e0] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-bold text-[#37352f]">会员储值卡与积分资产中心</h2>
            <span className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold rounded">
              注册会员 {members.length} 人
            </span>
          </div>
          <p className="text-xs text-[#787774] mt-1">
            支持会员等级分层（白银/黄金/黑钻专属折扣）、储值卡充赠流水、积分抵扣与营销资产管理。
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportMembers}
            className="px-3 py-1.5 bg-[#f7f7f5] hover:bg-[#e3e2e0] text-[#37352f] rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-[#d3d1cb] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>导出会员报表</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNewMemberModalOpen(true)}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新增会员建档</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-[#e3e2e0]">
          <span className="text-xs text-[#787774] block">全店储值沉淀资金</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xs text-amber-700 font-bold">¥</span>
            <span className="text-2xl font-bold text-[#37352f]">{totalMemberBalance.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#e3e2e0]">
          <span className="text-xs text-[#787774] block">本月累计充值实收</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xs text-emerald-700 font-bold">¥</span>
            <span className="text-2xl font-bold text-emerald-700">{totalRechargeCash.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#e3e2e0]">
          <span className="text-xs text-[#787774] block">黑钻/黄金高净值会员</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold text-[#37352f]">
              {members.filter(m => m.tier === 'diamond' || m.tier === 'gold').length}
            </span>
            <span className="text-xs text-[#787774]">位 (占比 {Math.round((members.filter(m => m.tier === 'diamond' || m.tier === 'gold').length / members.length) * 100)}%)</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#e3e2e0]">
          <span className="text-xs text-[#787774] block">会员积分总池</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold text-amber-600">
              {members.reduce((s, m) => s + m.points, 0).toLocaleString()}
            </span>
            <span className="text-xs text-[#787774]">分 (可抵 ¥{(members.reduce((s, m) => s + m.points, 0) / 100).toFixed(0)})</span>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="bg-white rounded-lg border border-[#e3e2e0] p-3.5 sm:p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e3e2e0]">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-nowrap max-w-full">
            <button
              type="button"
              onClick={() => setActiveTab('members')}
              className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'members' ? 'bg-[#37352f] text-white' : 'text-[#787774] hover:bg-[#f7f7f5]'
              }`}
            >
              会员档案名册 ({members.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('recharges')}
              className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'recharges' ? 'bg-[#37352f] text-white' : 'text-[#787774] hover:bg-[#f7f7f5]'
              }`}
            >
              储值充赠明细流水 ({recharges.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('rules')}
              className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'rules' ? 'bg-[#37352f] text-white' : 'text-[#787774] hover:bg-[#f7f7f5]'
              }`}
            >
              等级折扣与充值规则配置
            </button>
          </div>

          {activeTab === 'members' && (
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#787774]" />
                <input
                  type="text"
                  placeholder="搜索卡号/手机号/姓名"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1 text-xs border border-[#d3d1cb] rounded focus:outline-none focus:border-amber-500 w-full sm:w-48 text-[#37352f]"
                />
              </div>

              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
                className="px-2.5 py-1 text-xs border border-[#d3d1cb] rounded bg-white text-[#37352f] shrink-0"
              >
                <option value="all">全部等级</option>
                <option value="diamond">黑钻会员 (85折)</option>
                <option value="gold">黄金会员 (9折)</option>
                <option value="silver">白银会员 (95折)</option>
                <option value="regular">大众会员</option>
              </select>
            </div>
          )}
        </div>

        {/* 1. Member Roster Table */}
        {activeTab === 'members' && (
          <div className="overflow-x-auto -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
            <table className="w-full text-xs text-left min-w-[620px]">
              <thead className="bg-[#f7f7f5] text-[#787774] font-medium border-y border-[#e3e2e0]">
                <tr>
                  <th className="py-2.5 px-3">会员卡号 / 姓名</th>
                  <th className="py-2.5 px-3">手机号</th>
                  <th className="py-2.5 px-3">会员等级与折扣</th>
                  <th className="py-2.5 px-3 text-right">储值余额</th>
                  <th className="py-2.5 px-3 text-right">积分</th>
                  <th className="py-2.5 px-3 text-right">累计消费</th>
                  <th className="py-2.5 px-3">最近光顾</th>
                  <th className="py-2.5 px-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f1ef]">
                {filteredMembers.map(m => (
                  <tr key={m.id} className="hover:bg-[#fbfbfa]">
                    <td className="py-3 px-3">
                      <div className="font-bold text-[#37352f]">{m.name}</div>
                      <span className="text-[11px] font-mono text-[#787774]">{m.memberNo}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[#37352f]">{m.phone}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border inline-flex items-center gap-1 ${
                        m.tier === 'diamond'
                          ? 'bg-neutral-900 text-amber-300 border-neutral-800'
                          : m.tier === 'gold'
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : m.tier === 'silver'
                          ? 'bg-slate-100 text-slate-800 border-slate-300'
                          : 'bg-neutral-100 text-neutral-600 border-neutral-300'
                      }`}>
                        {m.tier === 'diamond' && '💎 '}
                        {m.tier === 'gold' && '🥇 '}
                        {m.tier === 'silver' && '🥈 '}
                        {m.tierName} · {Math.round(m.discountRate * 100)}折
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-amber-700">
                      ¥{m.balance.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[#37352f]">
                      {m.points}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[#787774]">
                      ¥{m.totalSpent.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-[#787774]">{m.lastVisit}</td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenRecharge(m)}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded text-xs font-semibold cursor-pointer transition-colors"
                      >
                        充值赠送 💳
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 2. Recharge Records Table */}
        {activeTab === 'recharges' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#f7f7f5] text-[#787774] font-medium border-y border-[#e3e2e0]">
                <tr>
                  <th className="py-2.5 px-3">流水号</th>
                  <th className="py-2.5 px-3">会员姓名 / 手机号</th>
                  <th className="py-2.5 px-3 text-right">充值本金</th>
                  <th className="py-2.5 px-3 text-right">赠送金额</th>
                  <th className="py-2.5 px-3 text-right">实际到账</th>
                  <th className="py-2.5 px-3">支付渠道</th>
                  <th className="py-2.5 px-3">经手操作员</th>
                  <th className="py-2.5 px-3">充值时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f1ef]">
                {recharges.map(r => (
                  <tr key={r.id} className="hover:bg-[#fbfbfa]">
                    <td className="py-3 px-3 font-mono text-[#787774]">{r.recordNo}</td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-[#37352f]">{r.memberName}</div>
                      <span className="text-[11px] font-mono text-[#787774]">{r.phone}</span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-700">
                      ¥{r.rechargeAmount.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right text-amber-700 font-medium">
                      +¥{r.bonusAmount.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-[#37352f]">
                      ¥{r.totalReceived.toFixed(2)}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 bg-[#f1f1ef] rounded text-[11px] font-medium text-[#37352f]">
                        {r.paymentMethod === 'wechat' ? '微信支付' : r.paymentMethod === 'alipay' ? '支付宝' : '现金/POS'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[#787774]">{r.operator}</td>
                    <td className="py-3 px-3 text-[#787774] font-mono">{r.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. Tier Rules & Recharge Packages */}
        {activeTab === 'rules' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2">
            {/* Tier Rules */}
            <div className="border border-[#e3e2e0] rounded-lg p-4 bg-[#fbfbfa]">
              <h4 className="font-bold text-sm text-[#37352f] mb-3 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-600" />
                <span>会员等级成长与专属权益矩阵</span>
              </h4>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-white rounded border border-[#e3e2e0] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-neutral-900 block">💎 黑钻会员 (Diamond)</span>
                    <span className="text-[11px] text-[#787774]">门槛：累计消费满 ¥3,000</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-amber-600">全场 8.5 折</span>
                    <span className="text-[10px] text-[#787774] block">消费双倍积分</span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded border border-[#e3e2e0] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-amber-800 block">🥇 黄金会员 (Gold)</span>
                    <span className="text-[11px] text-[#787774]">门槛：累计消费满 ¥1,500</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-amber-700">全场 9.0 折</span>
                    <span className="text-[10px] text-[#787774] block">消费 1.5 倍积分</span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded border border-[#e3e2e0] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-700 block">🥈 白银会员 (Silver)</span>
                    <span className="text-[11px] text-[#787774]">门槛：累计消费满 ¥500</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-800">全场 9.5 折</span>
                    <span className="text-[10px] text-[#787774] block">每月赠 10 元代金券</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Popular Recharge Packages */}
            <div className="border border-[#e3e2e0] rounded-lg p-4 bg-[#fbfbfa]">
              <h4 className="font-bold text-sm text-[#37352f] mb-3 flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-emerald-600" />
                <span>热门储值充赠活动配置</span>
              </h4>

              <div className="space-y-2.5 text-xs">
                {[
                  { pay: 200, gift: 30, tag: '尝鲜推荐' },
                  { pay: 500, gift: 100, tag: '最划算 / 畅销' },
                  { pay: 1000, gift: 250, tag: 'VIP 专属赠礼' }
                ].map((pkg, idx) => (
                  <div key={idx} className="p-3 bg-white rounded border border-[#e3e2e0] flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-[#37352f]">
                        充值 ¥{pkg.pay} <span className="text-amber-700">赠送 ¥{pkg.gift}</span>
                      </div>
                      <span className="text-[11px] text-[#787774]">实际到账 ¥{pkg.pay + pkg.gift}（综合折扣 8.7 折）</span>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[11px] font-semibold">
                      {pkg.tag}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recharge Modal */}
      {isRechargeModalOpen && targetMember && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg border border-[#d3d1cb] shadow-2xl w-full max-w-md p-4 sm:p-5 text-[#37352f] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#e3e2e0] mb-4">
              <h3 className="font-bold text-base">会员储值卡充值</h3>
              <button
                type="button"
                onClick={() => setIsRechargeModalOpen(false)}
                className="text-[#787774] hover:text-[#37352f] p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-[#f7f7f5] p-3 rounded border border-[#e3e2e0] mb-4 text-xs">
              <div className="flex justify-between font-bold text-sm mb-1">
                <span>{targetMember.name} ({targetMember.phone})</span>
                <span className="text-amber-700">余额 ¥{targetMember.balance.toFixed(2)}</span>
              </div>
              <span className="text-[#787774]">等级：{targetMember.tierName}（享受 {Math.round(targetMember.discountRate * 100)} 折）</span>
            </div>

            <form onSubmit={handleConfirmRecharge} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#787774] mb-1 font-medium">快速快捷充值方案</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { pay: 200, bonus: 30 },
                    { pay: 500, bonus: 100 },
                    { pay: 1000, bonus: 250 }
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setRechargeAmount(p.pay);
                        setBonusAmount(p.bonus);
                      }}
                      className={`p-2 rounded border text-center cursor-pointer ${
                        rechargeAmount === p.pay && bonusAmount === p.bonus
                          ? 'bg-[#37352f] text-white border-[#37352f]'
                          : 'bg-[#f7f7f5] border-[#d3d1cb] hover:bg-[#e3e2e0]'
                      }`}
                    >
                      <div className="font-bold text-sm">¥{p.pay}</div>
                      <div className="text-[10px]">赠 ¥{p.bonus}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#787774] mb-1 font-medium">实收金额 (元)</label>
                  <input
                    type="number"
                    min="1"
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-[#d3d1cb] rounded focus:outline-none focus:border-amber-500 font-bold text-[#37352f]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[#787774] mb-1 font-medium">赠送金额 (元)</label>
                  <input
                    type="number"
                    min="0"
                    value={bonusAmount}
                    onChange={(e) => setBonusAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-[#d3d1cb] rounded focus:outline-none focus:border-amber-500 text-amber-700 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#787774] mb-1 font-medium">收款渠道</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'wechat', label: '微信支付' },
                    { id: 'alipay', label: '支付宝' },
                    { id: 'cash', label: '现金/刷卡' }
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`py-1.5 rounded border text-center cursor-pointer ${
                        paymentMethod === m.id
                          ? 'bg-emerald-700 text-white border-emerald-700 font-semibold'
                          : 'bg-[#f7f7f5] border-[#d3d1cb] hover:bg-[#e3e2e0]'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 bg-amber-50 p-2.5 rounded border border-amber-200 text-amber-900 flex justify-between items-center font-bold">
                <span>实际到账总额：</span>
                <span className="text-base">¥{(rechargeAmount + bonusAmount).toFixed(2)}</span>
              </div>

              <div className="pt-3 border-t border-[#e3e2e0] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRechargeModalOpen(false)}
                  className="px-3 py-1.5 text-[#787774] hover:text-[#37352f] rounded cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold cursor-pointer shadow-xs"
                >
                  确认收款入账
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Member Registration Modal */}
      {isNewMemberModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg border border-[#d3d1cb] shadow-2xl w-full max-w-md p-4 sm:p-5 text-[#37352f] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#e3e2e0] mb-4">
              <h3 className="font-bold text-base">新增会员登记</h3>
              <button
                type="button"
                onClick={() => setIsNewMemberModalOpen(false)}
                className="text-[#787774] hover:text-[#37352f] p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#787774] mb-1 font-medium">会员姓名</label>
                <input
                  type="text"
                  placeholder="如: 王建国"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#d3d1cb] rounded focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[#787774] mb-1 font-medium">手机号码</label>
                <input
                  type="tel"
                  placeholder="如: 13812345678"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#d3d1cb] rounded focus:outline-none focus:border-amber-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[#787774] mb-1 font-medium">初始会员等级</label>
                <select
                  value={newTier}
                  onChange={(e) => setNewTier(e.target.value as MemberTier)}
                  className="w-full px-3 py-1.5 border border-[#d3d1cb] rounded bg-white"
                >
                  <option value="regular">大众会员 (无折扣)</option>
                  <option value="silver">白银会员 (9.5折)</option>
                  <option value="gold">黄金会员 (9.0折)</option>
                  <option value="diamond">黑钻会员 (8.5折)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-[#e3e2e0] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewMemberModalOpen(false)}
                  className="px-3 py-1.5 text-[#787774] hover:text-[#37352f] rounded cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-semibold cursor-pointer shadow-xs"
                >
                  保存并开卡
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
