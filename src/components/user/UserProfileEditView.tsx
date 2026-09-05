import React, { useState } from 'react';
import {
  User,
  Phone,
  MapPin,
  Sparkles,
  Check,
  Plus,
  Trash2,
  Edit2,
  Cloud,
  RefreshCw,
  Sliders,
  Wallet,
  Coins,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Flame,
  Utensils,
  Bell,
  Compass,
  CreditCard,
  ArrowLeft,
  Calendar,
  Layers,
  ChevronRight,
  Info,
  KeyRound,
  UserCheck,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, UserAddress, UserPreferences } from '../../types';
import { syncUserProfileToCloud } from '../../utils/cloudbase';
import { useToast } from '../ui/ToastContext';
import { UserAuthModal } from './UserAuthModal';

export interface UserProfileEditViewProps {
  userProfile: UserProfile;
  onProfileUpdated: (updated: UserProfile) => void;
  onBack?: () => void;
  initialTab?: 'profile' | 'addresses' | 'preferences' | 'wallet';
  onOpenCloudMonitor?: () => void;
  onOpenCloudCode?: () => void;
}

const PRESET_AVATARS = [
  { label: '先锋食客', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80' },
  { label: '黑曜石主理', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80' },
  { label: '炭烤大师', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80' },
  { label: '冷萃探员', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80' },
  { label: '和牛极客', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80' }
];

export const UserProfileEditView: React.FC<UserProfileEditViewProps> = ({
  userProfile,
  onProfileUpdated,
  onBack,
  initialTab = 'profile',
  onOpenCloudMonitor,
  onOpenCloudCode
}) => {
  const toast = useToast();

  // Accordion Expand/Collapse State
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    profile: true,
    addresses: initialTab === 'addresses',
    preferences: initialTab === 'preferences',
    wallet: initialTab === 'wallet',
    security: false
  });

  // Form State
  const [nickname, setNickname] = useState(userProfile.nickname);
  const [phone, setPhone] = useState(userProfile.phone);
  const [avatar, setAvatar] = useState(userProfile.avatar);
  const [bio, setBio] = useState(userProfile.bio || '');
  const [gender, setGender] = useState<'secret' | 'male' | 'female'>(userProfile.gender || 'secret');
  const [birthday, setBirthday] = useState(userProfile.birthday || '1998-06-18');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Addresses State
  const [addresses, setAddresses] = useState<UserAddress[]>(userProfile.addresses || []);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [addrName, setAddrName] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrTag, setAddrTag] = useState<'公司' | '家' | '学校' | '其他'>('公司');
  const [addrLocation, setAddrLocation] = useState('');
  const [addrDetail, setAddrDetail] = useState('');

  // Preferences State
  const [preferences, setPreferences] = useState<UserPreferences>(userProfile.preferences || {
    spiciness: 'mild',
    cutlery: 'eco',
    autoApplyCoupons: true,
    radarTracking: true,
    smsNotification: true,
    dietaryNote: ''
  });

  // Cloud Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState<string | null>(null);

  // Toggle single accordion section
  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Expand / Collapse all sections
  const allExpanded = Object.values(expandedSections).every(Boolean);
  const toggleAllSections = () => {
    const nextState = !allExpanded;
    setExpandedSections({
      profile: nextState,
      addresses: nextState,
      preferences: nextState,
      wallet: nextState,
      security: nextState
    });
  };

  // Handle Saving Profile & Cloud Function Trigger
  const handleSaveAndSync = async () => {
    setIsSyncing(true);
    setSyncStatusText('正在调用云函数 [userProfile] 同步个人资料...');

    const updated: UserProfile = {
      ...userProfile,
      nickname: nickname.trim() || 'Urban Foodie',
      phone: phone.trim() || '138-8888-9201',
      avatar,
      bio: bio.trim(),
      gender,
      birthday,
      addresses,
      preferences,
      cloudSyncedAt: new Date().toISOString()
    };

    try {
      const res = await syncUserProfileToCloud(updated);
      onProfileUpdated(res.profile);

      if (res.source === 'cloud_function') {
        toast.success('云函数同步成功', `个人资料与地址簿已同步至云端 (UID: ${updated.uid.slice(-6)})`);
      } else {
        toast.info('本地双轨保存成功', '数据已持久化保存在安全本地，联网时将自动推送云端');
      }
      setSyncStatusText('云端同步完成！');
      setTimeout(() => setSyncStatusText(null), 2000);
    } catch (err: any) {
      toast.error('同步异常', err?.message || '已自动降级至本地缓存');
    } finally {
      setIsSyncing(false);
    }
  };

  // Add or Update Address
  const handleSaveAddress = () => {
    if (!addrLocation.trim()) {
      toast.warning('请输入地址', '地址位置不能为空');
      return;
    }

    if (editingAddress) {
      const nextList = addresses.map((a) =>
        a.id === editingAddress.id
          ? {
              ...a,
              name: addrName || nickname,
              phone: addrPhone || phone,
              tag: addrTag,
              address: addrLocation,
              detail: addrDetail
            }
          : a
      );
      setAddresses(nextList);
      setEditingAddress(null);
      toast.success('地址修改成功');
    } else {
      const newAddr: UserAddress = {
        id: `addr-${Date.now()}`,
        name: addrName || nickname,
        phone: addrPhone || phone,
        tag: addrTag,
        address: addrLocation,
        detail: addrDetail,
        isDefault: addresses.length === 0,
        createdAt: new Date().toISOString()
      };
      setAddresses([...addresses, newAddr]);
      setIsAddingAddress(false);
      toast.success('常用地址添加成功');
    }

    setAddrName('');
    setAddrPhone('');
    setAddrLocation('');
    setAddrDetail('');
  };

  const handleSetDefaultAddress = (id: string) => {
    const updated = addresses.map((a) => ({
      ...a,
      isDefault: a.id === id
    }));
    setAddresses(updated);
    toast.success('已设为默认配送地址');
  };

  const handleDeleteAddress = (id: string) => {
    const updated = addresses.filter((a) => a.id !== id);
    if (updated.length > 0 && !updated.some((a) => a.isDefault)) {
      updated[0].isDefault = true;
    }
    setAddresses(updated);
    toast.info('地址已移除');
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-3 pb-8 text-[#1a1c1b] animate-in fade-in duration-200 font-sans">
      {/* Top Header Bar - Responsive for Mobile & PC */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 py-1 px-0.5">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-3 py-1.5 rounded-full bg-white hover:bg-neutral-100 border border-[#e6e6e4] text-black text-xs font-bold active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>返回会员中心</span>
            </button>
          )}
          <span className="text-sm sm:text-base font-black tracking-tight text-neutral-900 hidden sm:inline">
            会员资料与参数设置
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Expand/Collapse All Button */}
          <button
            type="button"
            onClick={toggleAllSections}
            className="px-2.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border border-neutral-200 shadow-2xs"
            title={allExpanded ? '全部折叠' : '全部展开'}
          >
            {allExpanded ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">全部折叠</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">全部展开</span>
              </>
            )}
          </button>

          {onOpenCloudMonitor && (
            <button
              type="button"
              onClick={onOpenCloudMonitor}
              className="text-xs font-bold text-sky-800 px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 rounded-lg border border-sky-200 cursor-pointer transition-colors shadow-2xs"
              title="查看云函数实时监控"
            >
              云函数监控
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveAndSync}
            disabled={isSyncing}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-60"
            title="立即保存并同步至云端"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? '同步中...' : '云端同步'}</span>
          </button>
        </div>
      </div>

      {/* User Hero Banner - Responsive Card */}
      <div className="p-3.5 sm:p-4 bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 text-white rounded-2xl border border-neutral-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <img
                src={avatar}
                alt={nickname}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-emerald-400 shadow-md"
              />
              <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-neutral-950 flex items-center justify-center text-[8px] font-bold text-black">
                ✓
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-black text-sm sm:text-base text-white tracking-tight truncate">
                  {nickname}
                </h2>
                <span className="text-[10px] bg-amber-400 text-black font-black px-2 py-0.5 rounded-full font-mono shrink-0">
                  {userProfile.membershipTier === 'vip_black_elite' ? 'BLACK ELITE' : 'VIP MEMBER'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400 mt-1">
                <span className="font-mono">{phone}</span>
                <span className="hidden sm:inline">·</span>
                <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                  <Cloud className="w-3 h-3" /> 云函数已打通
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center sm:flex-col sm:items-end justify-between border-t sm:border-t-0 border-neutral-800 pt-2 sm:pt-0 shrink-0">
            <div className="flex items-baseline gap-1 sm:justify-end">
              <span className="text-xs text-neutral-400">余额:</span>
              <span className="text-base sm:text-lg font-black font-mono text-amber-400">
                ¥{userProfile.balance.toFixed(2)}
              </span>
            </div>
            <div className="text-xs text-neutral-300 sm:text-neutral-400 font-mono">
              {userProfile.points} 积分
            </div>
          </div>
        </div>
      </div>

      {/* Accordion / Collapsible Settings Modules */}
      <div className="space-y-2.5">
        {/* ================= SECTION 1: 基础个人资料 ================= */}
        <div className="bg-white rounded-2xl border border-[#e8e8e4] overflow-hidden shadow-2xs transition-all">
          <button
            type="button"
            onClick={() => toggleSection('profile')}
            className="w-full p-3.5 sm:p-4 flex items-center justify-between hover:bg-neutral-50/70 transition-colors cursor-pointer text-left select-none"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-neutral-900 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-neutral-900">基础个人资料</h3>
                  <span className="text-[10px] bg-neutral-100 text-neutral-600 font-bold px-1.5 py-0.5 rounded">
                    昵称/头像/手机
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5 truncate">
                  {nickname} · {phone}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-neutral-400 hidden sm:inline">
                {expandedSections.profile ? '收起' : '展开编辑'}
              </span>
              <div className={`p-1 rounded-full text-neutral-500 transition-transform duration-200 ${expandedSections.profile ? 'rotate-180 bg-neutral-100' : ''}`}>
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </button>

          <AnimatePresence initial={false}>
            {expandedSections.profile && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="border-t border-neutral-100 overflow-hidden"
              >
                <div className="p-3.5 sm:p-4 space-y-3.5 bg-[#fcfcfb]">
                  {/* Avatar Selector */}
                  <div>
                    <label className="text-xs font-bold text-neutral-700 block mb-2">
                      选择先锋头像
                    </label>
                    <div className="flex items-center gap-3 overflow-x-auto pb-1 no-scrollbar">
                      {PRESET_AVATARS.map((av, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setAvatar(av.url)}
                          className={`relative rounded-full p-0.5 border-2 transition-all cursor-pointer shrink-0 ${
                            avatar === av.url
                              ? 'border-emerald-500 scale-105 shadow-2xs'
                              : 'border-transparent opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={av.url}
                            alt={av.label}
                            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover"
                          />
                          {avatar === av.url && (
                            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[8px] font-black">
                              ✓
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Form Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="text-xs font-bold text-neutral-700 block mb-1">
                        食客昵称
                      </label>
                      <input
                        type="text"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="输入食客昵称"
                        className="w-full h-10 px-3 bg-white border border-neutral-200 rounded-xl text-xs sm:text-sm font-bold text-black focus:outline-none focus:border-black focus:ring-2 focus:ring-black/5"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-neutral-700 block mb-1">
                        绑定手机号 (云函数鉴权标识)
                      </label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="138-xxxx-xxxx"
                        className="w-full h-10 px-3 bg-white border border-neutral-200 rounded-xl text-xs sm:text-sm font-bold text-black font-mono focus:outline-none focus:border-black focus:ring-2 focus:ring-black/5"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-neutral-700 block mb-1">
                        性别
                      </label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value as any)}
                        className="w-full h-10 px-3 bg-white border border-neutral-200 rounded-xl text-xs sm:text-sm font-bold text-black focus:outline-none focus:border-black focus:ring-2 focus:ring-black/5 cursor-pointer"
                      >
                        <option value="secret">保密 (Secret)</option>
                        <option value="male">男 (Male)</option>
                        <option value="female">女 (Female)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-neutral-700 block mb-1">
                        生日 (尊享生日免单礼券)
                      </label>
                      <input
                        type="date"
                        value={birthday}
                        onChange={(e) => setBirthday(e.target.value)}
                        className="w-full h-10 px-3 bg-white border border-neutral-200 rounded-xl text-xs sm:text-sm font-bold text-black font-mono focus:outline-none focus:border-black focus:ring-2 focus:ring-black/5 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-neutral-700 block mb-1">
                      美食探险家签名 / 个人简介
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={2}
                      placeholder="写一句你对黑曜石餐车或先锋料理的喜好..."
                      className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs sm:text-sm text-black focus:outline-none focus:border-black focus:ring-2 focus:ring-black/5"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ================= SECTION 2: 常用收货地址簿 ================= */}
        <div className="bg-white rounded-2xl border border-[#e8e8e4] overflow-hidden shadow-2xs transition-all">
          <button
            type="button"
            onClick={() => toggleSection('addresses')}
            className="w-full p-3.5 sm:p-4 flex items-center justify-between hover:bg-neutral-50/70 transition-colors cursor-pointer text-left select-none"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-neutral-900">常用收货地址簿</h3>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.5 rounded">
                    {addresses.length} 个地址
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5 truncate">
                  {addresses.find((a) => a.isDefault)?.address || (addresses[0]?.address ? `默认: ${addresses[0].address}` : '暂无收货地址')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-neutral-400 hidden sm:inline">
                {expandedSections.addresses ? '收起' : '展开管理'}
              </span>
              <div className={`p-1 rounded-full text-neutral-500 transition-transform duration-200 ${expandedSections.addresses ? 'rotate-180 bg-neutral-100' : ''}`}>
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </button>

          <AnimatePresence initial={false}>
            {expandedSections.addresses && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="border-t border-neutral-100 overflow-hidden"
              >
                <div className="p-3.5 sm:p-4 space-y-3 bg-[#fcfcfb]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-600">
                      地址列表 ({addresses.length})
                    </span>
                    {!isAddingAddress && !editingAddress && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingAddress(true);
                          setAddrName(nickname);
                          setAddrPhone(phone);
                          setAddrTag('公司');
                          setAddrLocation('');
                          setAddrDetail('');
                        }}
                        className="px-2.5 py-1 bg-black hover:bg-neutral-800 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>新增地址</span>
                      </button>
                    )}
                  </div>

                  {/* Add/Edit Address Form */}
                  {(isAddingAddress || editingAddress) && (
                    <div className="p-3.5 bg-white border border-neutral-300 rounded-xl space-y-3 shadow-2xs animate-in fade-in">
                      <div className="flex items-center justify-between text-xs font-black text-black">
                        <span>{editingAddress ? '编辑收货地址' : '新增常用收货地址'}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingAddress(false);
                            setEditingAddress(null);
                          }}
                          className="text-neutral-400 hover:text-black cursor-pointer text-sm"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <input
                          type="text"
                          value={addrName}
                          onChange={(e) => setAddrName(e.target.value)}
                          placeholder="收货人姓名"
                          className="h-9 px-3 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-bold focus:outline-none focus:border-black focus:bg-white"
                        />
                        <input
                          type="text"
                          value={addrPhone}
                          onChange={(e) => setAddrPhone(e.target.value)}
                          placeholder="收货人联系手机"
                          className="h-9 px-3 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-bold font-mono focus:outline-none focus:border-black focus:bg-white"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-500">标签:</span>
                        {(['公司', '家', '学校', '其他'] as const).map((t) => {
                          const isSelected = addrTag === t;
                          const tagStyle = {
                            '公司': 'bg-sky-50/70 border-2 border-sky-500 text-sky-600 shadow-2xs font-bold',
                            '家': 'bg-amber-50/70 border-2 border-amber-500 text-amber-600 shadow-2xs font-bold',
                            '学校': 'bg-emerald-50/70 border-2 border-emerald-500 text-emerald-600 shadow-2xs font-bold',
                            '其他': 'bg-indigo-50/70 border-2 border-indigo-500 text-indigo-600 shadow-2xs font-bold'
                          }[t];

                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setAddrTag(t)}
                              className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer transition-all border ${
                                isSelected
                                  ? tagStyle
                                  : 'bg-neutral-100 border-neutral-200 text-neutral-600 hover:bg-neutral-200'
                              }`}
                            >
                              {t}
                            </button>
                          );
                        })}
                      </div>

                      <input
                        type="text"
                        value={addrLocation}
                        onChange={(e) => setAddrLocation(e.target.value)}
                        placeholder="小区 / 写字楼 / 标志性建筑物名称 (例如: 静安大悦城北座)"
                        className="w-full h-9 px-3 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-bold focus:outline-none focus:border-black focus:bg-white"
                      />

                      <input
                        type="text"
                        value={addrDetail}
                        onChange={(e) => setAddrDetail(e.target.value)}
                        placeholder="门牌号 / 楼层 / 详细位置 (例如: 12楼1204室 前台转交)"
                        className="w-full h-9 px-3 bg-neutral-50 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-black focus:bg-white"
                      />

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingAddress(false);
                            setEditingAddress(null);
                          }}
                          className="px-3 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-lg cursor-pointer"
                        >
                          取消
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveAddress}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg cursor-pointer shadow-2xs active:scale-95"
                        >
                          保存地址
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Address Cards */}
                  <div className="space-y-2">
                    {addresses.map((addr) => (
                      <div
                        key={addr.id}
                        className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-2.5 ${
                          addr.isDefault
                            ? 'bg-emerald-50/50 border-emerald-300 shadow-2xs'
                            : 'bg-white border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-800">
                              {addr.tag}
                            </span>
                            <h4 className="text-xs sm:text-sm font-bold text-black truncate">{addr.address}</h4>
                            {addr.isDefault && (
                              <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200">
                                默认地址
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-600 mt-1 font-medium">{addr.detail}</p>
                          <div className="flex items-center gap-2 text-xs text-neutral-400 mt-1">
                            <span>{addr.name}</span>
                            <span>·</span>
                            <span className="font-mono">{addr.phone}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 pt-0.5">
                          {!addr.isDefault && (
                            <button
                              type="button"
                              onClick={() => handleSetDefaultAddress(addr.id)}
                              className="px-2 py-1 text-[11px] font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg cursor-pointer transition-colors"
                            >
                              设为默认
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAddress(addr);
                              setAddrName(addr.name);
                              setAddrPhone(addr.phone);
                              setAddrTag(addr.tag);
                              setAddrLocation(addr.address);
                              setAddrDetail(addr.detail);
                            }}
                            className="p-1.5 text-neutral-400 hover:text-black rounded-lg transition-colors cursor-pointer"
                            title="编辑"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAddress(addr.id)}
                            className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="删除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ================= SECTION 3: 就餐口味与个性偏好 ================= */}
        <div className="bg-white rounded-2xl border border-[#e8e8e4] overflow-hidden shadow-2xs transition-all">
          <button
            type="button"
            onClick={() => toggleSection('preferences')}
            className="w-full p-3.5 sm:p-4 flex items-center justify-between hover:bg-neutral-50/70 transition-colors cursor-pointer text-left select-none"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Utensils className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-neutral-900">就餐口味与个性偏好</h3>
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                    辣度/环保/通知
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5 truncate">
                  {preferences.spiciness === 'none' ? '不辣' : preferences.spiciness === 'mild' ? '微辣' : preferences.spiciness === 'medium' ? '中辣' : '特辣'} · {preferences.cutlery === 'eco' ? '环保减碳无需餐具' : '按餐品提供餐具'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-neutral-400 hidden sm:inline">
                {expandedSections.preferences ? '收起' : '展开偏好'}
              </span>
              <div className={`p-1 rounded-full text-neutral-500 transition-transform duration-200 ${expandedSections.preferences ? 'rotate-180 bg-neutral-100' : ''}`}>
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </button>

          <AnimatePresence initial={false}>
            {expandedSections.preferences && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="border-t border-neutral-100 overflow-hidden"
              >
                <div className="p-3.5 sm:p-4 space-y-4 bg-[#fcfcfb] text-xs">
                  {/* Spiciness */}
                  <div>
                    <label className="font-bold text-neutral-700 block mb-2 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-rose-500" />
                      <span>默认辣度偏好</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'none', label: '不辣 · 原汁' },
                        { id: 'mild', label: '微辣 · 提鲜' },
                        { id: 'medium', label: '中辣 · 地道' },
                        { id: 'hot', label: '特辣 · 爆爽' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setPreferences({ ...preferences, spiciness: item.id as any })}
                          className={`py-2.5 px-2 rounded-xl text-center font-bold border transition-all cursor-pointer ${
                            preferences.spiciness === item.id
                              ? 'bg-rose-50/70 border-2 border-rose-500 text-rose-700 shadow-2xs font-black'
                              : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cutlery Policy */}
                  <div>
                    <label className="font-bold text-neutral-700 block mb-2 flex items-center gap-1.5">
                      <Utensils className="w-3.5 h-3.5 text-emerald-600" />
                      <span>环保餐具策略</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        { id: 'eco', label: '环保减碳 · 无需餐具' },
                        { id: 'needed', label: '按餐品份数提供' },
                        { id: 'not_needed', label: '自带餐盒 · 零浪费' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setPreferences({ ...preferences, cutlery: item.id as any })}
                          className={`p-2.5 rounded-xl text-center font-bold border transition-all cursor-pointer ${
                            preferences.cutlery === item.id
                              ? 'bg-emerald-50/70 border-2 border-emerald-500 text-emerald-700 shadow-2xs font-black'
                              : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Feature Toggles */}
                  <div className="space-y-2 pt-2 border-t border-neutral-200/60">
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-neutral-200">
                      <div>
                        <span className="font-bold text-black block">结算自动抵扣最优优惠券</span>
                        <span className="text-[11px] text-neutral-500">点单结算时自动计算并使用折扣力度最大的券</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.autoApplyCoupons}
                        onChange={(e) => setPreferences({ ...preferences, autoApplyCoupons: e.target.checked })}
                        className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-neutral-200">
                      <div>
                        <span className="font-bold text-black block flex items-center gap-1">
                          <Compass className="w-3 h-3 text-emerald-600" />
                          餐车雷达巡游实时追踪通知
                        </span>
                        <span className="text-[11px] text-neutral-500">餐车距离当前常用地址小于1km时推送停靠提醒</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.radarTracking}
                        onChange={(e) => setPreferences({ ...preferences, radarTracking: e.target.checked })}
                        className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-neutral-200">
                      <div>
                        <span className="font-bold text-black block flex items-center gap-1">
                          <Bell className="w-3 h-3 text-amber-600" />
                          短信与服务消息出餐提醒
                        </span>
                        <span className="text-[11px] text-neutral-500">炭烤出炉与骑手取餐时接收即时短信与服务通知</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.smsNotification}
                        onChange={(e) => setPreferences({ ...preferences, smsNotification: e.target.checked })}
                        className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">
                      常驻忌口与个性化备注
                    </label>
                    <input
                      type="text"
                      value={preferences.dietaryNote || ''}
                      onChange={(e) => setPreferences({ ...preferences, dietaryNote: e.target.value })}
                      placeholder="例如: 少盐，不吃香菜，牛排七分熟，汉堡免洋葱"
                      className="w-full h-10 px-3 bg-white border border-neutral-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-black focus:ring-2 focus:ring-black/5"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ================= SECTION 4: 账户钱包与积分流水 ================= */}
        <div className="bg-white rounded-2xl border border-[#e8e8e4] overflow-hidden shadow-2xs transition-all">
          <button
            type="button"
            onClick={() => toggleSection('wallet')}
            className="w-full p-3.5 sm:p-4 flex items-center justify-between hover:bg-neutral-50/70 transition-colors cursor-pointer text-left select-none"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-neutral-900 text-amber-400 flex items-center justify-center shrink-0 shadow-2xs">
                <Wallet className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-neutral-900">账户钱包与积分流水</h3>
                  <span className="text-[10px] bg-neutral-100 text-neutral-800 font-mono font-bold px-1.5 py-0.5 rounded">
                    ¥{userProfile.balance.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5 truncate">
                  余额 ¥{userProfile.balance.toFixed(2)} · {userProfile.points} 积分
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-neutral-400 hidden sm:inline">
                {expandedSections.wallet ? '收起' : '展开流水'}
              </span>
              <div className={`p-1 rounded-full text-neutral-500 transition-transform duration-200 ${expandedSections.wallet ? 'rotate-180 bg-neutral-100' : ''}`}>
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </button>

          <AnimatePresence initial={false}>
            {expandedSections.wallet && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="border-t border-neutral-100 overflow-hidden"
              >
                <div className="p-3.5 sm:p-4 space-y-3 bg-[#fcfcfb] text-xs">
                  {/* Summary Card */}
                  <div className="p-4 bg-gradient-to-br from-neutral-900 via-neutral-950 to-black text-white rounded-xl shadow-xs border border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between text-neutral-400 text-xs">
                      <span className="flex items-center gap-1 font-bold">
                        <Coins className="w-3.5 h-3.5 text-amber-400" />
                        黑曜石先锋账户资产
                      </span>
                      <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-neutral-300 font-mono">
                        UID: {userProfile.uid.slice(-8)}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
                          ¥{userProfile.balance.toFixed(2)}
                        </span>
                        <span className="text-xs text-neutral-400 ml-2">可用储值余额</span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg sm:text-xl font-black text-amber-400 font-mono">
                          {userProfile.points}
                        </span>
                        <span className="text-xs text-neutral-400 ml-1">能量积分</span>
                      </div>
                    </div>
                  </div>

                  {/* Flow Records */}
                  <div className="space-y-2 pt-1">
                    <div className="font-bold text-neutral-700 px-0.5">收支流水记录</div>
                    {userProfile.walletHistory && userProfile.walletHistory.length > 0 ? (
                      userProfile.walletHistory.map((w) => (
                        <div
                          key={w.id}
                          className="p-3 bg-white rounded-xl border border-neutral-200 flex items-center justify-between text-xs shadow-2xs"
                        >
                          <div>
                            <span className="font-bold text-black block">{w.title}</span>
                            <span className="text-[10px] text-neutral-400 font-mono">{w.timestamp}</span>
                          </div>
                          <div className="text-right">
                            <span
                              className={`font-black font-mono text-sm block ${
                                w.amount > 0 ? 'text-emerald-600' : 'text-neutral-900'
                              }`}
                            >
                              {w.amount > 0 ? `+¥${w.amount.toFixed(2)}` : `¥${w.amount.toFixed(2)}`}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-mono">
                              余额: ¥{w.balanceAfter.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-neutral-400 text-xs">暂无流水记录</div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ================= SECTION 5: 云端安全与免密凭据 ================= */}
        <div className="bg-white rounded-2xl border border-[#e8e8e4] overflow-hidden shadow-2xs transition-all">
          <button
            type="button"
            onClick={() => toggleSection('security')}
            className="w-full p-3.5 sm:p-4 flex items-center justify-between hover:bg-neutral-50/70 transition-colors cursor-pointer text-left select-none"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-sky-700 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-neutral-900">云端安全与免密凭据</h3>
                  <span className="text-[10px] bg-sky-100 text-sky-800 font-mono font-bold px-1.5 py-0.5 rounded">
                    99.8% 硬件指纹
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5 truncate font-mono">
                  UID: {userProfile.uid}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-neutral-400 hidden sm:inline">
                {expandedSections.security ? '收起' : '展开详情'}
              </span>
              <div className={`p-1 rounded-full text-neutral-500 transition-transform duration-200 ${expandedSections.security ? 'rotate-180 bg-neutral-100' : ''}`}>
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </button>

          <AnimatePresence initial={false}>
            {expandedSections.security && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="border-t border-neutral-100 overflow-hidden"
              >
                <div className="p-3.5 sm:p-4 space-y-3 bg-[#fcfcfb] text-xs">
                  <div className="p-3 bg-white border border-neutral-200 rounded-xl space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-800">免密设备指纹认证</span>
                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-mono">
                        已加密打通
                      </span>
                    </div>
                    <p className="text-neutral-500 text-xs">
                      本应用已接入腾讯云函数免密信任鉴权机制，无需繁琐输入密码即可自动基于硬件设备安全标识完成免密识别与双轨同步。
                    </p>
                    <div className="flex items-center gap-2 pt-1 font-mono text-[11px] text-neutral-400">
                      <span>设备凭据: HW-SEC-87779</span>
                      <span>·</span>
                      <span>双轨状态: 实时就绪</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                    <div>
                      <span className="font-bold text-emerald-950 block">账号切换与注册中心</span>
                      <span className="text-[11px] text-emerald-800">快速切换测试账号、短信验证码或密码登录</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAuthModalOpen(true)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg cursor-pointer shadow-2xs flex items-center gap-1"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>换号/注册</span>
                    </button>
                  </div>

                  {onOpenCloudCode && (
                    <div className="flex items-center justify-between p-3 bg-sky-50/60 border border-sky-200 rounded-xl">
                      <div>
                        <span className="font-bold text-sky-950 block">云函数工程源码</span>
                        <span className="text-[11px] text-sky-800">查看底层 Node.js 云函数鉴权与数据库同步实现</span>
                      </div>
                      <button
                        type="button"
                        onClick={onOpenCloudCode}
                        className="px-3 py-1 bg-white hover:bg-sky-50 text-sky-900 border border-sky-300 font-bold text-xs rounded-lg cursor-pointer shadow-2xs"
                      >
                        查看源码
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* User Auth Modal inside Profile View */}
      <UserAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode="presets"
        onLoginSuccess={(updated) => {
          setNickname(updated.nickname);
          setPhone(updated.phone);
          setAvatar(updated.avatar);
          setBio(updated.bio || '');
          setGender(updated.gender || 'secret');
          setBirthday(updated.birthday || '1998-06-18');
          setAddresses(updated.addresses || []);
          if (updated.preferences) setPreferences(updated.preferences);
          onProfileUpdated(updated);
          toast.success(`已成功切换至用户: ${updated.nickname}`);
        }}
      />

      {/* Embedded Action Footer Bar */}
      <div className="sticky bottom-2 z-20 p-3 bg-white/95 backdrop-blur-md border border-[#e8e8e4] rounded-2xl flex items-center justify-between gap-3 shadow-md">
        <div className="text-xs text-neutral-500 truncate min-w-0">
          {syncStatusText || `最近同步: ${userProfile.cloudSyncedAt ? new Date(userProfile.cloudSyncedAt).toLocaleTimeString() : '刚刚'}`}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-neutral-300"
            >
              返回
            </button>
          )}
          <button
            type="button"
            onClick={handleSaveAndSync}
            disabled={isSyncing}
            className="px-4 py-2 bg-black hover:bg-neutral-800 text-white text-xs sm:text-sm font-black rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{isSyncing ? '同步保存中...' : '保存并同步云端'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
