import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Download,
  Pencil,
  Trash2,
  X,
  Phone,
  Wallet,
  Coins,
  Fingerprint,
  MapPin,
  Settings2,
  Receipt,
  Check,
  ChevronRight,
  ShieldCheck,
  Smartphone,
  Star,
  UserPlus,
  Save,
  RotateCcw
} from 'lucide-react';
import {
  UserProfile,
  UserAddress,
  UserPreferences,
  UserWalletTransaction
} from '../../types/user';
import { maskPhoneNumber } from '../../utils/staffAndRiderAuthEngine';
import {
  getUserDataRecords,
  saveUserDataRecords,
  upsertUser,
  deleteUser,
  createBlankUserProfile,
  adjustUserBalance,
  usersToCsv
} from '../../utils/userDataRegistry';

interface MerchantUserDataCenterProps {
  showToast: (msg: string) => void;
}

const TIER_LABEL: Record<UserProfile['membershipTier'], string> = {
  standard: '普通会员',
  vip_silver: '银卡 VIP',
  vip_black_elite: '黑金 VIP'
};

const TIER_BADGE: Record<UserProfile['membershipTier'], string> = {
  standard: 'bg-neutral-200 text-neutral-700',
  vip_silver: 'bg-slate-300 text-slate-800',
  vip_black_elite: 'bg-neutral-900 text-amber-300'
};

const GENDER_LABEL: Record<UserProfile['gender'], string> = {
  secret: '保密',
  male: '男',
  female: '女'
};

const SPICE_LABEL: Record<UserPreferences['spiciness'], string> = {
  none: '不辣',
  mild: '微辣',
  medium: '中辣',
  hot: '重辣'
};

const CUTLERY_LABEL: Record<UserPreferences['cutlery'], string> = {
  needed: '需要餐具',
  not_needed: '不需要',
  eco: '环保餐具'
};

function downloadCsv(filename: string, content: string): void {
  try {
    const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    /* ignore */
  }
}

export const MerchantUserDataCenter: React.FC<MerchantUserDataCenterProps> = ({ showToast }) => {
  const [users, setUsers] = useState<UserProfile[]>(() => getUserDataRecords());
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | UserProfile['membershipTier']>('all');
  const [providerFilter, setProviderFilter] = useState<'all' | 'bound' | 'unbound'>('all');

  const [selected, setSelected] = useState<UserProfile | null>(null);
  const [draft, setDraft] = useState<UserProfile | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustKind, setAdjustKind] = useState<'balance' | 'points'>('balance');
  const [adjustAmount, setAdjustAmount] = useState<number>(0);
  const [adjustNote, setAdjustNote] = useState('');

  const persist = (next: UserProfile[]) => {
    setUsers(next);
    saveUserDataRecords(next);
  };

  // ---------- 统计 ----------
  const stats = useMemo(() => {
    const total = users.length;
    const vip = users.filter((u) => u.isVIPActive).length;
    const totalPoints = users.reduce((s, u) => s + (u.points || 0), 0);
    const totalBalance = users.reduce((s, u) => s + (u.balance || 0), 0);
    const deviceBound = users.filter((u) => !!u.hardwareHash).length;
    return { total, vip, totalPoints, totalBalance, deviceBound };
  }, [users]);

  // ---------- 过滤 ----------
  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        u.nickname.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q) ||
        u.uid.toLowerCase().includes(q);
      const matchTier = tierFilter === 'all' || u.membershipTier === tierFilter;
      const matchProvider =
        providerFilter === 'all' ||
        (providerFilter === 'bound' ? !!u.hardwareHash : !u.hardwareHash);
      return matchSearch && matchTier && matchProvider;
    });
  }, [users, search, tierFilter, providerFilter]);

  // ---------- 详情抽屉 ----------
  const openDetail = (u: UserProfile) => {
    setSelected(u);
    setDraft({ ...u, addresses: u.addresses.map((a) => ({ ...a })), preferences: { ...u.preferences }, walletHistory: [...u.walletHistory] });
  };
  const closeDetail = () => {
    setSelected(null);
    setDraft(null);
  };

  const handleSaveDraft = () => {
    if (!draft) return;
    const next = upsertUser(draft);
    persist(next);
    setSelected(draft);
    showToast(`已保存用户档案: ${draft.nickname}`);
  };

  const handleDeleteUser = (u: UserProfile) => {
    if (!window.confirm(`确认删除用户「${u.nickname}」(UID: ${u.uid})？此操作不可恢复。`)) return;
    const next = deleteUser(u.uid);
    persist(next);
    if (selected?.uid === u.uid) closeDetail();
    showToast(`已删除用户: ${u.nickname}`);
  };

  // ---------- 地址簿 ----------
  const updateAddress = (addr: UserAddress) => {
    if (!draft) return;
    const exists = draft.addresses.findIndex((a) => a.id === addr.id);
    const next = { ...draft };
    if (exists >= 0) {
      next.addresses = draft.addresses.map((a) => (a.id === addr.id ? addr : a));
    } else {
      next.addresses = [...draft.addresses, addr];
    }
    setDraft(next);
  };
  const removeAddress = (id: string) => {
    if (!draft) return;
    setDraft({ ...draft, addresses: draft.addresses.filter((a) => a.id !== id) });
  };
  const setDefaultAddress = (id: string) => {
    if (!draft) return;
    setDraft({
      ...draft,
      addresses: draft.addresses.map((a) => ({ ...a, isDefault: a.id === id }))
    });
  };

  // ---------- 偏好 ----------
  const updatePreference = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    if (!draft) return;
    setDraft({ ...draft, preferences: { ...draft.preferences, [key]: value } });
  };

  // ---------- 余额/积分调整 ----------
  const openAdjust = (kind: 'balance' | 'points') => {
    setAdjustKind(kind);
    setAdjustAmount(0);
    setAdjustNote('');
    setIsAdjustOpen(true);
  };
  const handleConfirmAdjust = () => {
    if (!selected) return;
    const updated = adjustUserBalance(selected, adjustKind, adjustAmount, adjustNote);
    const next = upsertUser(updated);
    persist(next);
    setSelected(updated);
    setDraft(updated);
    setIsAdjustOpen(false);
    showToast(`${adjustKind === 'balance' ? '余额' : '积分'}已调整 ${adjustAmount >= 0 ? '+' : ''}${adjustAmount}`);
  };

  // ---------- 新建 ----------
  const handleCreate = (partial: Partial<UserProfile>) => {
    const created = createBlankUserProfile(partial);
    const next = upsertUser(created);
    persist(next);
    setIsCreateOpen(false);
    showToast(`已创建用户: ${created.nickname}`);
  };

  const handleExport = () => {
    downloadCsv(`用户数据中心_${new Date().toISOString().slice(0, 10)}.csv`, usersToCsv(filtered));
    showToast(`已导出 ${filtered.length} 条用户数据 (CSV)`);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 顶部标题 + 统计 */}
      <div className="shrink-0 px-4 sm:px-6 lg:px-8 pt-5 pb-4 border-b border-[#e6e6e4] bg-white">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-neutral-900 text-emerald-400 flex items-center justify-center shadow-sm">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-neutral-900 flex items-center gap-2">
                用户数据中心
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-mono px-1.5 py-0.5 rounded border border-emerald-200">
                  CLIENT-SYNC
                </span>
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                统一接管「客户端无密码登录」全量用户档案 — 账户 / 会员 / 地址 / 偏好 / 钱包 / 设备指纹
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-neutral-200 hover:border-black text-neutral-700 text-xs font-bold transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> 导出 CSV
            </button>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" /> 新建用户
            </button>
          </div>
        </div>

        {/* 统计卡 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mt-4">
          <StatCell label="用户总数" value={stats.total} icon={<Users className="w-4 h-4" />} />
          <StatCell label="VIP 活跃" value={stats.vip} icon={<Star className="w-4 h-4" />} accent="amber" />
          <StatCell label="累计积分" value={stats.totalPoints.toLocaleString()} icon={<Coins className="w-4 h-4" />} accent="emerald" />
          <StatCell label="钱包余额" value={`¥${stats.totalBalance.toFixed(2)}`} icon={<Wallet className="w-4 h-4" />} accent="emerald" />
          <StatCell label="设备已绑定" value={stats.deviceBound} icon={<Fingerprint className="w-4 h-4" />} accent="sky" />
        </div>
      </div>

      {/* 过滤栏 */}
      <div className="shrink-0 px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center gap-2 border-b border-[#eee] bg-neutral-50/60">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索昵称 / 手机号 / UID"
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-neutral-200 focus:border-black text-xs font-medium outline-none"
          />
        </div>
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value as any)}
          className="px-3 py-2 rounded-xl bg-white border border-neutral-200 text-xs font-bold outline-none cursor-pointer"
        >
          <option value="all">全部等级</option>
          <option value="standard">普通会员</option>
          <option value="vip_silver">银卡 VIP</option>
          <option value="vip_black_elite">黑金 VIP</option>
        </select>
        <select
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value as any)}
          className="px-3 py-2 rounded-xl bg-white border border-neutral-200 text-xs font-bold outline-none cursor-pointer"
        >
          <option value="all">全部设备</option>
          <option value="bound">已绑定设备</option>
          <option value="unbound">未绑定设备</option>
        </select>
        <span className="text-[11px] text-neutral-400 ml-auto font-mono">
          {filtered.length} / {users.length} 条
        </span>
      </div>

      {/* 用户列表 */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4">
        {filtered.length === 0 ? (
          <div className="text-center text-neutral-400 text-sm py-16">未找到匹配的用户档案</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((u) => (
              <UserCard
                key={u.uid}
                user={u}
                onOpen={() => openDetail(u)}
                onDelete={() => handleDeleteUser(u)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 详情抽屉 */}
      {selected && draft && (
        <DetailDrawer
          user={draft}
          onClose={closeDetail}
          onChange={setDraft}
          onSave={handleSaveDraft}
          onDelete={() => handleDeleteUser(selected)}
          onAdjust={openAdjust}
          onUpdateAddress={updateAddress}
          onRemoveAddress={removeAddress}
          onSetDefaultAddress={setDefaultAddress}
          onUpdatePreference={updatePreference}
          showToast={showToast}
        />
      )}

      {/* 新建用户 */}
      {isCreateOpen && (
        <CreateUserModal onClose={() => setIsCreateOpen(false)} onCreate={handleCreate} />
      )}

      {/* 余额/积分调整 */}
      {isAdjustOpen && selected && (
        <AdjustModal
          kind={adjustKind}
          current={adjustKind === 'balance' ? selected.balance : selected.points}
          amount={adjustAmount}
          note={adjustNote}
          onAmount={setAdjustAmount}
          onNote={setAdjustNote}
          onClose={() => setIsAdjustOpen(false)}
          onConfirm={handleConfirmAdjust}
        />
      )}
    </div>
  );
};

// ===================== 子组件 =====================

function StatCell({
  label,
  value,
  icon,
  accent = 'neutral'
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: 'neutral' | 'emerald' | 'amber' | 'sky';
}) {
  const accentCls =
    accent === 'emerald'
      ? 'text-emerald-600'
      : accent === 'amber'
      ? 'text-amber-600'
      : accent === 'sky'
      ? 'text-sky-600'
      : 'text-neutral-700';
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl px-3 py-2.5 flex items-center gap-2.5">
      <div className={`w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center ${accentCls}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] text-neutral-500 font-medium truncate">{label}</div>
        <div className="text-sm font-black text-neutral-900 truncate">{value}</div>
      </div>
    </div>
  );
}

function UserCard({
  user,
  onOpen,
  onDelete
}: {
  user: UserProfile;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-3 flex flex-col gap-2.5 hover:border-black hover:shadow-sm transition-all group">
      <div className="flex items-center gap-3">
        <img src={user.avatar} alt={user.nickname} className="w-11 h-11 rounded-full object-cover border border-neutral-200" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black text-neutral-900 truncate">{user.nickname}</span>
            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${TIER_BADGE[user.membershipTier]}`}>
              {TIER_LABEL[user.membershipTier]}
            </span>
          </div>
          <div className="text-[10px] text-neutral-400 font-mono mt-0.5 truncate">
            {maskPhoneNumber(user.phone)} · {user.uid}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 text-center">
        <MiniStat label="积分" value={user.points} />
        <MiniStat label="余额" value={`¥${user.balance.toFixed(0)}`} />
        <MiniStat label="地址" value={user.addresses.length} />
      </div>

      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-medium ${
            user.hardwareHash ? 'text-sky-600' : 'text-neutral-400'
          }`}
        >
          <Fingerprint className="w-3 h-3" />
          {user.hardwareHash ? '已绑定设备' : '无设备指纹'}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={onDelete}
            className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center cursor-pointer"
            title="删除用户"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onOpen}
            className="flex items-center gap-0.5 px-2 h-7 rounded-lg bg-neutral-900 text-white text-[11px] font-bold hover:bg-neutral-800 cursor-pointer"
          >
            管理 <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-neutral-50 rounded-lg py-1">
      <div className="text-[9px] text-neutral-400">{label}</div>
      <div className="text-xs font-black text-neutral-800">{value}</div>
    </div>
  );
}

// ---------------- 详情抽屉 ----------------
function DetailDrawer({
  user,
  onChange,
  onClose,
  onSave,
  onDelete,
  onAdjust,
  onUpdateAddress,
  onRemoveAddress,
  onSetDefaultAddress,
  onUpdatePreference,
  showToast
}: {
  user: UserProfile;
  onChange: (u: UserProfile) => void;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
  onAdjust: (kind: 'balance' | 'points') => void;
  onUpdateAddress: (a: UserAddress) => void;
  onRemoveAddress: (id: string) => void;
  onSetDefaultAddress: (id: string) => void;
  onUpdatePreference: <K extends keyof UserPreferences>(k: K, v: UserPreferences[K]) => void;
  showToast: (m: string) => void;
}) {
  const [tab, setTab] = useState<'profile' | 'address' | 'pref' | 'wallet' | 'device'>('profile');
  const [addrDraft, setAddrDraft] = useState<Partial<UserAddress>>({ name: '', phone: '', tag: '公司', address: '', detail: '', isDefault: false });

  const setField = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
    onChange({ ...user, [key]: value });
  };

  const saveAddr = () => {
    if (!addrDraft.name || !addrDraft.address) {
      showToast('请填写地址名称与详细地址');
      return;
    }
    onUpdateAddress({
      id: addrDraft.id || `addr-${Date.now()}`,
      name: addrDraft.name,
      phone: addrDraft.phone || user.phone,
      tag: (addrDraft.tag as UserAddress['tag']) || '其他',
      address: addrDraft.address,
      detail: addrDraft.detail || '',
      isDefault: addrDraft.isDefault || false
    });
    setAddrDraft({ name: '', phone: '', tag: '公司', address: '', detail: '', isDefault: false });
    showToast('地址已更新');
  };

  const tabs: { id: typeof tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: '基础档案', icon: <Pencil className="w-3.5 h-3.5" /> },
    { id: 'address', label: `地址簿 (${user.addresses.length})`, icon: <MapPin className="w-3.5 h-3.5" /> },
    { id: 'pref', label: '偏好设置', icon: <Settings2 className="w-3.5 h-3.5" /> },
    { id: 'wallet', label: `钱包流水 (${user.walletHistory.length})`, icon: <Receipt className="w-3.5 h-3.5" /> },
    { id: 'device', label: '设备与登录', icon: <Smartphone className="w-3.5 h-3.5" /> }
  ];

  return (
    <div className="fixed inset-0 z-[130] flex justify-end animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* 头部 */}
        <div className="shrink-0 p-4 border-b border-neutral-200 flex items-center gap-3 bg-gradient-to-r from-neutral-950 to-neutral-900 text-white">
          <img src={user.avatar} className="w-12 h-12 rounded-full object-cover border border-white/20" alt="" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-black truncate">{user.nickname}</span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${TIER_BADGE[user.membershipTier]}`}>
                {TIER_LABEL[user.membershipTier]}
              </span>
            </div>
            <div className="text-[10px] text-neutral-400 font-mono truncate">{maskPhoneNumber(user.phone)} · {user.uid}</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab 切换 */}
        <div className="shrink-0 flex gap-1 p-2 border-b border-neutral-200 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                tab === t.id ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* 内容 */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          {tab === 'profile' && (
            <div className="space-y-3">
              <Field label="昵称">
                <input value={user.nickname} onChange={(e) => setField('nickname', e.target.value)} className={inputCls} />
              </Field>
              <Field label="手机号">
                <input value={user.phone} onChange={(e) => setField('phone', e.target.value)} className={inputCls} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="性别">
                  <select value={user.gender} onChange={(e) => setField('gender', e.target.value as UserProfile['gender'])} className={inputCls}>
                    {(['secret', 'male', 'female'] as const).map((g) => (
                      <option key={g} value={g}>{GENDER_LABEL[g]}</option>
                    ))}
                  </select>
                </Field>
                <Field label="生日">
                  <input type="date" value={user.birthday} onChange={(e) => setField('birthday', e.target.value)} className={inputCls} />
                </Field>
              </div>
              <Field label="简介">
                <textarea value={user.bio} onChange={(e) => setField('bio', e.target.value)} rows={2} className={inputCls} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="会员等级">
                  <select
                    value={user.membershipTier}
                    onChange={(e) => setField('membershipTier', e.target.value as UserProfile['membershipTier'])}
                    className={inputCls}
                  >
                    {(['standard', 'vip_silver', 'vip_black_elite'] as const).map((t) => (
                      <option key={t} value={t}>{TIER_LABEL[t]}</option>
                    ))}
                  </select>
                </Field>
                <Field label="VIP 生效">
                  <button
                    type="button"
                    onClick={() => setField('isVIPActive', !user.isVIPActive)}
                    className={`w-full h-[38px] rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                      user.isVIPActive ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-neutral-200 text-neutral-500'
                    }`}
                  >
                    {user.isVIPActive ? '已生效' : '未生效'}
                  </button>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="积分">
                  <input
                    type="number"
                    value={user.points}
                    onChange={(e) => setField('points', Number(e.target.value) || 0)}
                    className={inputCls}
                  />
                </Field>
                <Field label="余额 (¥)">
                  <input
                    type="number"
                    step="0.01"
                    value={user.balance}
                    onChange={(e) => setField('balance', Number(e.target.value) || 0)}
                    className={inputCls}
                  />
                </Field>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => onAdjust('balance')} className="flex-1 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 cursor-pointer">
                  <Wallet className="w-3.5 h-3.5 inline mr-1" /> 调整余额
                </button>
                <button onClick={() => onAdjust('points')} className="flex-1 py-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold hover:bg-amber-100 cursor-pointer">
                  <Coins className="w-3.5 h-3.5 inline mr-1" /> 调整积分
                </button>
              </div>
            </div>
          )}

          {tab === 'address' && (
            <div className="space-y-3">
              {user.addresses.length === 0 && <p className="text-xs text-neutral-400">暂无收货地址</p>}
              {user.addresses.map((a) => (
                <div key={a.id} className="border border-neutral-200 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-neutral-900">{a.name}</span>
                      <span className="text-[9px] bg-neutral-100 text-neutral-600 px-1.5 py-0.2 rounded">{a.tag}</span>
                      {a.isDefault && <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded font-bold">默认</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      {!a.isDefault && (
                        <button onClick={() => onSetDefaultAddress(a.id)} className="text-[10px] text-emerald-600 hover:underline cursor-pointer">设为默认</button>
                      )}
                      <button onClick={() => onRemoveAddress(a.id)} className="text-rose-500 hover:text-rose-700 cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-1 font-mono">{maskPhoneNumber(a.phone)}</div>
                  <div className="text-[11px] text-neutral-700 mt-0.5">{a.address} {a.detail}</div>
                </div>
              ))}

              <div className="border border-dashed border-neutral-300 rounded-xl p-3 space-y-2">
                <div className="text-[11px] font-bold text-neutral-700">新增 / 编辑地址</div>
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="收件人" value={addrDraft.name || ''} onChange={(e) => setAddrDraft({ ...addrDraft, name: e.target.value })} className={inputCls} />
                  <input placeholder="电话" value={addrDraft.phone || ''} onChange={(e) => setAddrDraft({ ...addrDraft, phone: e.target.value })} className={inputCls} />
                </div>
                <input placeholder="地址 (如: 静安区南京西路 1788 号)" value={addrDraft.address || ''} onChange={(e) => setAddrDraft({ ...addrDraft, address: e.target.value })} className={inputCls} />
                <input placeholder="详细门牌 / 楼层" value={addrDraft.detail || ''} onChange={(e) => setAddrDraft({ ...addrDraft, detail: e.target.value })} className={inputCls} />
                <div className="flex items-center gap-2">
                  <select value={addrDraft.tag || '公司'} onChange={(e) => setAddrDraft({ ...addrDraft, tag: e.target.value as UserAddress['tag'] })} className={inputCls}>
                    {(['公司', '家', '学校', '其他'] as const).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1 text-[11px] text-neutral-600 cursor-pointer">
                    <input type="checkbox" checked={!!addrDraft.isDefault} onChange={(e) => setAddrDraft({ ...addrDraft, isDefault: e.target.checked })} />
                    默认地址
                  </label>
                  <button onClick={saveAddr} className="ml-auto px-3 py-1.5 rounded-lg bg-black text-white text-[11px] font-bold hover:bg-neutral-800 cursor-pointer">
                    保存地址
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === 'pref' && (
            <div className="space-y-3">
              <Field label="辣度偏好">
                <select value={user.preferences.spiciness} onChange={(e) => onUpdatePreference('spiciness', e.target.value as UserPreferences['spiciness'])} className={inputCls}>
                  {(['none', 'mild', 'medium', 'hot'] as const).map((s) => (
                    <option key={s} value={s}>{SPICE_LABEL[s]}</option>
                  ))}
                </select>
              </Field>
              <Field label="餐具偏好">
                <select value={user.preferences.cutlery} onChange={(e) => onUpdatePreference('cutlery', e.target.value as UserPreferences['cutlery'])} className={inputCls}>
                  {(['needed', 'not_needed', 'eco'] as const).map((c) => (
                    <option key={c} value={c}>{CUTLERY_LABEL[c]}</option>
                  ))}
                </select>
              </Field>
              <Field label="饮食备注">
                <input value={user.preferences.dietaryNote || ''} onChange={(e) => onUpdatePreference('dietaryNote', e.target.value)} className={inputCls} />
              </Field>
              <Toggle label="自动使用优惠券" checked={user.preferences.autoApplyCoupons} onChange={(v) => onUpdatePreference('autoApplyCoupons', v)} />
              <Toggle label="雷达追踪定位" checked={user.preferences.radarTracking} onChange={(v) => onUpdatePreference('radarTracking', v)} />
              <Toggle label="短信通知" checked={user.preferences.smsNotification} onChange={(v) => onUpdatePreference('smsNotification', v)} />
            </div>
          )}

          {tab === 'wallet' && (
            <div className="space-y-2">
              {user.walletHistory.length === 0 && <p className="text-xs text-neutral-400">暂无钱包流水</p>}
              {user.walletHistory.map((w) => (
                <WalletRow key={w.id} tx={w} />
              ))}
            </div>
          )}

          {tab === 'device' && (
            <div className="space-y-3">
              <InfoRow label="注册来源" value={user.authProvider} icon={<ShieldCheck className="w-3.5 h-3.5" />} />
              <InfoRow label="硬件指纹码" value={user.hardwareHash || '未绑定'} mono icon={<Fingerprint className="w-3.5 h-3.5" />} />
              <InfoRow label="设备多维指纹" value={user.deviceFingerprint || '未绑定'} mono icon={<Smartphone className="w-3.5 h-3.5" />} />
              <InfoRow label="免密置信度" value={user.autoLoginScore != null ? `${user.autoLoginScore}%` : '—'} icon={<ShieldCheck className="w-3.5 h-3.5" />} />
              <InfoRow label="云端同步时间" value={user.cloudSyncedAt ? new Date(user.cloudSyncedAt).toLocaleString() : '—'} icon={<ShieldCheck className="w-3.5 h-3.5" />} />
              <InfoRow label="注册创建时间" value={user.createdAt} icon={<ShieldCheck className="w-3.5 h-3.5" />} />
              <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-[11px] text-sky-800 leading-relaxed">
                该用户通过「客户端无密码登录」体系注册 / 识别。硬件指纹码用于跨浏览器、抗清除缓存的设备级自动登录识别。
              </div>
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="shrink-0 p-3 border-t border-neutral-200 flex items-center gap-2">
          <button onClick={onDelete} className="px-3 py-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold hover:bg-rose-100 cursor-pointer">
            <Trash2 className="w-3.5 h-3.5 inline mr-1" /> 删除
          </button>
          <button onClick={onSave} className="flex-1 py-2.5 rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer">
            <Save className="w-3.5 h-3.5" /> 保存档案变更
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  'w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 focus:border-black text-xs font-medium outline-none';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-bold text-neutral-700 block">{label}</label>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between py-2 px-3 rounded-xl bg-neutral-50 border border-neutral-200 cursor-pointer"
    >
      <span className="text-xs font-medium text-neutral-700">{label}</span>
      <span className={`w-9 h-5 rounded-full relative transition-colors ${checked ? 'bg-emerald-500' : 'bg-neutral-300'}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${checked ? 'left-4' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

function InfoRow({ label, value, icon, mono }: { label: string; value: string; icon: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-neutral-50 border border-neutral-200">
      <span className="flex items-center gap-1.5 text-xs font-medium text-neutral-600">
        {icon}
        {label}
      </span>
      <span className={`text-xs font-bold text-neutral-900 ${mono ? 'font-mono text-[10px]' : ''} text-right max-w-[60%] break-all`}>
        {value}
      </span>
    </div>
  );
}

function WalletRow({ tx }: { tx: UserWalletTransaction }) {
  const color = tx.amount >= 0 ? 'text-emerald-600' : 'text-rose-600';
  const sign = tx.amount >= 0 ? '+' : '';
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-white border border-neutral-200">
      <div className="min-w-0">
        <div className="text-xs font-bold text-neutral-800 truncate">{tx.title}</div>
        <div className="text-[10px] text-neutral-400 font-mono">{tx.timestamp}{tx.orderNo ? ` · ${tx.orderNo}` : ''}</div>
      </div>
      <div className={`text-sm font-black ${color}`}>
        {sign}
        {tx.amount.toFixed(2)}
      </div>
    </div>
  );
}

// ---------------- 新建用户 ----------------
function CreateUserModal({ onClose, onCreate }: { onClose: () => void; onCreate: (p: Partial<UserProfile>) => void }) {
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<UserProfile['gender']>('secret');
  const [tier, setTier] = useState<UserProfile['membershipTier']>('standard');
  const [points, setPoints] = useState(0);
  const [balance, setBalance] = useState(0);

  const submit = () => {
    if (!nickname.trim()) return;
    onCreate({
      nickname: nickname.trim(),
      phone: phone.trim(),
      gender,
      membershipTier: tier,
      isVIPActive: tier !== 'standard',
      points: Number(points) || 0,
      balance: Number(balance) || 0,
      authProvider: 'custom_phone'
    });
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-4 bg-neutral-900 text-white flex items-center justify-between">
          <h3 className="font-black flex items-center gap-2"><UserPlus className="w-4 h-4 text-emerald-400" /> 新建用户档案</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
          <Field label="昵称 *"><input value={nickname} onChange={(e) => setNickname(e.target.value)} className={inputCls} placeholder="食客昵称" /></Field>
          <Field label="手机号"><input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="11 位手机号" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="性别">
              <select value={gender} onChange={(e) => setGender(e.target.value as UserProfile['gender'])} className={inputCls}>
                {(['secret', 'male', 'female'] as const).map((g) => (<option key={g} value={g}>{GENDER_LABEL[g]}</option>))}
              </select>
            </Field>
            <Field label="会员等级">
              <select value={tier} onChange={(e) => setTier(e.target.value as UserProfile['membershipTier'])} className={inputCls}>
                {(['standard', 'vip_silver', 'vip_black_elite'] as const).map((t) => (<option key={t} value={t}>{TIER_LABEL[t]}</option>))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="初始积分"><input type="number" value={points} onChange={(e) => setPoints(Number(e.target.value) || 0)} className={inputCls} /></Field>
            <Field label="初始余额 (¥)"><input type="number" value={balance} onChange={(e) => setBalance(Number(e.target.value) || 0)} className={inputCls} /></Field>
          </div>
        </div>
        <div className="p-3 border-t border-neutral-200 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-neutral-100 text-neutral-600 text-xs font-bold hover:bg-neutral-200 cursor-pointer"><RotateCcw className="w-3.5 h-3.5 inline mr-1" /> 取消</button>
          <button onClick={submit} disabled={!nickname.trim()} className="flex-1 py-2.5 rounded-xl bg-black text-white text-xs font-black hover:bg-neutral-800 disabled:opacity-40 cursor-pointer">创建用户</button>
        </div>
      </div>
    </div>
  );
}

// ---------------- 余额/积分调整 ----------------
function AdjustModal({
  kind,
  current,
  amount,
  note,
  onAmount,
  onNote,
  onClose,
  onConfirm
}: {
  kind: 'balance' | 'points';
  current: number;
  amount: number;
  note: string;
  onAmount: (n: number) => void;
  onNote: (s: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const preview = Math.max(0, current + amount);
  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-4 bg-neutral-900 text-white flex items-center justify-between">
          <h3 className="font-black flex items-center gap-2">
            {kind === 'balance' ? <Wallet className="w-4 h-4 text-emerald-400" /> : <Coins className="w-4 h-4 text-amber-400" />}
            调整{kind === 'balance' ? '账户余额' : '积分'}
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="text-center py-2">
            <div className="text-[10px] text-neutral-400">当前{kind === 'balance' ? '余额' : '积分'}</div>
            <div className="text-2xl font-black text-neutral-900">{kind === 'balance' ? `¥${current.toFixed(2)}` : current}</div>
            <div className="text-[11px] text-neutral-400 mt-1">调整后: <span className="font-black text-emerald-600">{kind === 'balance' ? `¥${preview.toFixed(2)}` : preview}</span></div>
          </div>
          <Field label={`调整金额 (正为增, 负为减)`}>
            <input type="number" value={amount} onChange={(e) => onAmount(Number(e.target.value) || 0)} className={inputCls} />
          </Field>
          <Field label="备注">
            <input value={note} onChange={(e) => onNote(e.target.value)} className={inputCls} placeholder="如: 活动赠送 / 纠错扣减" />
          </Field>
        </div>
        <div className="p-3 border-t border-neutral-200">
          <button onClick={onConfirm} className="w-full py-2.5 rounded-xl bg-black text-white text-xs font-black hover:bg-neutral-800 cursor-pointer">确认调整</button>
        </div>
      </div>
    </div>
  );
}
