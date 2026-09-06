import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  Check,
  Sliders,
  MapPin,
  Fingerprint,
  Wallet,
  Receipt,
  Edit2,
  Trash2,
  Plus,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Radio,
  Building,
  KeyRound
} from 'lucide-react';
import { UserProfile, UserAddress, UserPreferences } from '../../types';
import { syncUserProfileToCloud } from '../../utils/cloudbase';
import { useToast } from '../ui/ToastContext';
import { saveAddresses, DeliveryAddressItem } from '../../utils/truckLocationEngine';

export interface UserProfileEditViewProps {
  userProfile: UserProfile;
  onProfileUpdated: (updated: UserProfile) => void;
  onBack?: () => void;
  initialTab?: 'profile' | 'addresses' | 'preferences' | 'wallet' | 'security' | 'finance';
  onOpenCloudMonitor?: () => void;
  onOpenCloudCode?: () => void;
}

type TabType = 'tab-profile' | 'tab-preference' | 'tab-address' | 'tab-security' | 'tab-finance';

export const UserProfileEditView: React.FC<UserProfileEditViewProps> = ({
  userProfile,
  onProfileUpdated,
  onBack,
  initialTab = 'profile'
}) => {
  const toast = useToast();

  // Map incoming initialTab to local TabType
  const resolvedInitialTab: TabType = useMemo(() => {
    switch (initialTab) {
      case 'addresses':
        return 'tab-address';
      case 'preferences':
        return 'tab-preference';
      case 'security':
        return 'tab-security';
      case 'wallet':
      case 'finance':
        return 'tab-finance';
      case 'profile':
      default:
        return 'tab-profile';
    }
  }, [initialTab]);

  const [activeTab, setActiveTab] = useState<TabType>(resolvedInitialTab);

  // Form State
  const [nickname, setNickname] = useState(userProfile.nickname || '张伟 (店长)');
  const [phone] = useState(userProfile.phone || '13800138000');
  const [avatar, setAvatar] = useState(userProfile.avatar || '🧑‍💻');
  const [bio, setBio] = useState(userProfile.bio || '店长 / 运营总管 · 设备硬件指纹绑定中');
  const [gender, setGender] = useState<'secret' | 'male' | 'female'>(userProfile.gender || 'secret');
  const [birthday, setBirthday] = useState(userProfile.birthday || '1990/01/01');

  // Preferences State
  const [spiciness, setSpiciness] = useState<'none' | 'mild' | 'medium' | 'hot'>(
    userProfile.preferences?.spiciness || 'mild'
  );
  const [ecoMode, setEcoMode] = useState<boolean>(
    userProfile.preferences?.cutlery === 'eco' || userProfile.preferences?.cutlery === 'not_needed'
  );
  const [silentCall, setSilentCall] = useState<boolean>(
    !userProfile.preferences?.radarTracking || false
  );
  const [dietaryNotes, setDietaryNotes] = useState<string>(
    userProfile.preferences?.dietaryNote || '无特殊过敏原'
  );

  // Addresses State
  const [addresses, setAddresses] = useState<UserAddress[]>(() => {
    if (userProfile.addresses && userProfile.addresses.length > 0) {
      return userProfile.addresses;
    }
    return [
      {
        id: 'addr-default-1',
        name: userProfile.nickname || '张伟',
        phone: userProfile.phone || '13800138000',
        tag: '公司',
        address: '广东省深圳市南山区高新科技园南区C栋',
        detail: '高新科技园南区C栋102室',
        houseNumber: 'C栋102室',
        remarks: '总店仓储备货点',
        isDefault: true,
        createdAt: '2024-01-15 09:20:11'
      }
    ];
  });

  // Inline Address Add/Edit State
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [addrName, setAddrName] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrTag, setAddrTag] = useState<'公司' | '家' | '学校' | '其他'>('公司');
  const [addrLocation, setAddrLocation] = useState('');
  const [addrHouseNumber, setAddrHouseNumber] = useState('');
  const [addrDetail, setAddrDetail] = useState('');
  const [addrRemarks, setAddrRemarks] = useState('');

  // Security Token & Sync States
  const [hwToken, setHwToken] = useState('fp_sec_99a8x00138000#pos');
  const [isSyncing, setIsSyncing] = useState(false);
  const [balance, setBalance] = useState(userProfile.balance ?? 0);
  const [points, setPoints] = useState(userProfile.points ?? 0);

  // Sync to truckLocationEngine whenever address changes
  const syncToTruckEngine = (list: UserAddress[]) => {
    try {
      const converted: DeliveryAddressItem[] = list.map((a, idx) => ({
        id: a.id || `addr-${idx}`,
        title: a.address,
        detail: a.houseNumber ? `${a.detail} ${a.houseNumber}`.trim() : a.detail,
        houseNumber: a.houseNumber || '',
        receiverName: a.name,
        receiverPhone: a.phone,
        tag: a.tag,
        remarks: a.remarks || '',
        isDefault: !!a.isDefault,
        latitude: a.latitude || 31.2435,
        longitude: a.longitude || 121.469,
        createdAt: a.createdAt || new Date().toLocaleString()
      }));
      saveAddresses(converted);
    } catch (err) {
      console.error('Failed to sync addresses to truckLocationEngine', err);
    }
  };

  // Cloud Sync Function
  const handleSaveAndSync = async () => {
    setIsSyncing(true);

    const updatedPref: UserPreferences = {
      spiciness,
      cutlery: ecoMode ? 'eco' : 'needed',
      autoApplyCoupons: true,
      radarTracking: !silentCall,
      smsNotification: silentCall,
      dietaryNote: dietaryNotes
    };

    const updatedProfile: UserProfile = {
      ...userProfile,
      nickname: nickname.trim() || '张伟 (店长)',
      avatar,
      bio: bio.trim(),
      gender,
      birthday,
      balance,
      points,
      addresses,
      preferences: updatedPref,
      cloudSyncedAt: new Date().toISOString()
    };

    try {
      const res = await syncUserProfileToCloud(updatedProfile);
      onProfileUpdated(res.profile);
      syncToTruckEngine(addresses);
      toast.success('配置同步完成', '会员资料与参数设置已成功下发并同步至 POS 终端与云端');
    } catch (err: any) {
      toast.info('本地更新成功', '参数已成功持久化更新并在离线缓存中生效');
      onProfileUpdated(updatedProfile);
      syncToTruckEngine(addresses);
    } finally {
      setIsSyncing(false);
    }
  };

  // Reissue Key Handler
  const handleReissueKey = () => {
    const newToken = 'fp_sec_' + Math.random().toString(36).substring(2, 8) + '#pos';
    setHwToken(newToken);
    toast.success('安全凭据重签成功', `硬件指纹密钥已更新为：${newToken}`);
  };

  // Save Address from Inline Form
  const handleSaveAddress = () => {
    if (!addrLocation.trim()) {
      toast.warning('请输入地址', '小区/写字楼或地址位置不能为空');
      return;
    }

    if (editingAddress) {
      const updated = addresses.map((a) =>
        a.id === editingAddress.id
          ? {
              ...a,
              name: addrName.trim() || nickname,
              phone: addrPhone.trim() || phone,
              tag: addrTag,
              address: addrLocation.trim(),
              houseNumber: addrHouseNumber.trim(),
              detail: addrDetail.trim() || addrLocation.trim(),
              remarks: addrRemarks.trim()
            }
          : a
      );
      setAddresses(updated);
      syncToTruckEngine(updated);
      toast.success('地址更新', '收货地址已保存');
    } else {
      const newAddr: UserAddress = {
        id: `addr-${Date.now()}`,
        name: addrName.trim() || nickname,
        phone: addrPhone.trim() || phone,
        tag: addrTag,
        address: addrLocation.trim(),
        houseNumber: addrHouseNumber.trim(),
        detail: addrDetail.trim() || addrLocation.trim(),
        remarks: addrRemarks.trim(),
        isDefault: addresses.length === 0,
        createdAt: new Date().toLocaleString()
      };
      const updated = [newAddr, ...addresses];
      setAddresses(updated);
      syncToTruckEngine(updated);
      toast.success('新增地址', '已添加至常用收货地址簿');
    }

    // Reset inline form
    setIsAddingAddress(false);
    setEditingAddress(null);
    setAddrName('');
    setAddrPhone('');
    setAddrLocation('');
    setAddrHouseNumber('');
    setAddrDetail('');
    setAddrRemarks('');
  };

  // Delete Address
  const handleDeleteAddress = (id: string) => {
    const nextList = addresses.filter((a) => a.id !== id);
    if (nextList.length > 0 && !nextList.some((a) => a.isDefault)) {
      nextList[0].isDefault = true;
    }
    setAddresses(nextList);
    syncToTruckEngine(nextList);
    toast.info('地址已移除', '该收货地址已从常用列表中删除');
  };

  // Set Default Address
  const handleSetDefaultAddress = (id: string) => {
    const nextList = addresses.map((a) => ({
      ...a,
      isDefault: a.id === id
    }));
    setAddresses(nextList);
    syncToTruckEngine(nextList);
    toast.success('默认地址已切换', '下次点单将优先选中此送达地址');
  };

  // Reset to initial settings
  const handleResetToInitial = () => {
    if (window.confirm('是否确认将全部参数重置回初始设定？')) {
      setNickname('张伟 (店长)');
      setBirthday('1990/01/01');
      setBio('店长 / 运营总管 · 设备硬件指纹绑定中');
      setGender('secret');
      setSpiciness('mild');
      setEcoMode(true);
      setSilentCall(false);
      setDietaryNotes('无特殊过敏原');
      toast.info('参数已重置', '全部表单已恢复至默认初始参数');
    }
  };

  // Preset avatar emoji options
  const avatarPresets = ['🧑‍💻', '👨‍💼', '🧔‍♂️', '👩‍🍳', '🧑‍🎨'];

  return (
    <div className="bg-[#f4f6f8] text-gray-900 font-sans antialiased min-h-screen selection:bg-black selection:text-white flex flex-col p-[2px]">
      {/* Top Navigation Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-xs p-[2px]">
        <div className="max-w-7xl mx-auto px-[3px] py-[2px] flex items-center justify-between">
          <div className="flex items-center gap-[3px]">
            <button
              onClick={onBack}
              type="button"
              className="flex items-center text-xs font-semibold text-gray-700 hover:text-black border border-gray-300 hover:border-black px-[3px] py-[2px] bg-gray-50 transition-colors rounded-[1px] cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3 mr-[2px]" />
              <span>返回会员中心</span>
            </button>
            <div className="h-3 w-px bg-gray-200" />
            <div className="flex items-center gap-[2px]">
              <span className="text-[10px] font-mono text-gray-400">STUDIO /</span>
              <h1 className="text-xs font-bold tracking-tight text-gray-900 uppercase">
                会员资料与参数设置控制台
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-[3px]">
            <div className="hidden sm:flex items-center gap-[2px] text-xs text-emerald-700 font-mono bg-emerald-50 px-[3px] py-[1px] border border-emerald-200 rounded-[1px]">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span className="text-[10px] font-mono font-bold tracking-tight text-emerald-700">双向同步</span>
              <span className="w-1.5 h-1.5 bg-emerald-500 animate-pulse rounded-[1px]" />
            </div>
            <button
              onClick={handleSaveAndSync}
              disabled={isSyncing}
              className="inline-flex items-center text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 px-[3px] py-[2px] transition-all shadow-xs rounded-[1px] cursor-pointer active:scale-98 disabled:opacity-75"
              id="sync-btn"
              type="button"
            >
              <RefreshCw className={`w-3 h-3 mr-[2px] ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? '同步中' : '立即同步'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto p-[2px] w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-start gap-[3px]">
          {/* LEFT SIDEBAR: User Card & Navigation Tabs */}
          <aside className="lg:col-span-4 xl:col-span-3 space-y-[3px]">
            {/* Compact Mini Identity Card */}
            <div className="bg-white text-gray-900 border border-gray-200 p-[3px] shadow-xs rounded-[1px] space-y-[2px]">
              <div className="flex items-center justify-between mb-[2px]">
                <span className="bg-amber-400 text-black text-[9px] font-extrabold tracking-wider uppercase px-[3px] py-[1px] border border-amber-300 rounded-[1px]">
                  {userProfile.membershipTier === 'vip_black_elite'
                    ? 'BLACK ELITE'
                    : userProfile.membershipTier === 'vip_silver'
                    ? 'SILVER ELITE'
                    : 'BLACK ELITE'}
                </span>
                <span className="text-[9px] font-mono text-emerald-600 flex items-center gap-[2px] font-bold">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-[1px]" />
                  在线互通
                </span>
              </div>

              <div className="flex items-center gap-[3px] mb-[2px]">
                <div className="w-10 h-10 bg-gray-50 border border-emerald-600 flex flex-col items-center justify-center text-center p-[1px] font-mono shrink-0 relative rounded-[1px]">
                  <span className="text-lg">{avatar}</span>
                  <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-600 text-white p-[1px] border border-white leading-none rounded-[1px]">
                    <Check className="w-2 h-2 stroke-[3]" />
                  </div>
                </div>
                <div className="min-w-0">
                  <h2 className="text-xs font-bold tracking-tight text-gray-900 truncate">
                    {nickname || '张伟 (店长)'}
                  </h2>
                  <p className="text-[10px] text-gray-500 font-mono">{phone}</p>
                  <p className="text-[9px] text-gray-400 truncate">{bio}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-[2px] border-t border-gray-200 pt-[2px] font-mono">
                <div className="bg-gray-50 border border-gray-200 p-[2px] rounded-[1px]">
                  <span className="text-[8px] text-gray-500 block uppercase">账户余额</span>
                  <span className="text-sm font-black text-amber-500">¥{balance.toFixed(2)}</span>
                </div>
                <div className="bg-gray-50 border border-gray-200 p-[2px] rounded-[1px]">
                  <span className="text-[8px] text-gray-500 block uppercase">可用积分</span>
                  <span className="text-sm font-black text-gray-900">{points}</span>
                </div>
              </div>
            </div>

            {/* SaaS Studio Category Tabs Navigation */}
            <nav className="bg-white border border-gray-300 shadow-xs p-[2px] rounded-[1px]">
              <div className="flex items-center justify-between pb-[2px] mb-[2px] border-b border-gray-100">
                <div className="text-[9px] font-mono uppercase tracking-wider text-gray-400 flex items-center gap-[2px]">
                  <Sliders className="w-2.5 h-2.5 text-gray-500" />
                  <span>设置分类导航 / TABS</span>
                </div>
                <span className="text-[8px] font-mono text-gray-400 bg-gray-100 px-[3px] py-[1px] border border-gray-200 uppercase rounded-[1px]">
                  5 项分区
                </span>
              </div>

              <div className="grid grid-cols-5 gap-[2px]">
                {/* TAB 1: 基本资料 */}
                <button
                  type="button"
                  onClick={() => setActiveTab('tab-profile')}
                  className={`tab-btn flex flex-col items-center justify-between p-[2px] text-center transition-colors focus:outline-none min-h-[52px] rounded-[1px] cursor-pointer ${
                    activeTab === 'tab-profile'
                      ? 'bg-emerald-50 border border-emerald-500 text-emerald-800'
                      : 'bg-white border border-gray-200 text-gray-700 hover:border-black hover:bg-gray-50'
                  }`}
                >
                  <Sparkles
                    className={`w-3.5 h-3.5 mb-[1px] ${
                      activeTab === 'tab-profile' ? 'text-emerald-600' : 'text-gray-500'
                    }`}
                  />
                  <span className="text-[10px] font-bold leading-tight line-clamp-1 truncate w-full">
                    基本资料
                  </span>
                  <span className="mt-[1px] text-[7px] font-mono text-emerald-700 bg-emerald-100 px-[2px] py-[1px] border border-emerald-300 uppercase leading-none rounded-[1px]">
                    完善
                  </span>
                </button>

                {/* TAB 2: 就餐偏好 */}
                <button
                  type="button"
                  onClick={() => setActiveTab('tab-preference')}
                  className={`tab-btn flex flex-col items-center justify-between p-[2px] text-center transition-colors focus:outline-none min-h-[52px] rounded-[1px] cursor-pointer ${
                    activeTab === 'tab-preference'
                      ? 'bg-emerald-50 border border-emerald-500 text-emerald-800'
                      : 'bg-white border border-gray-200 text-gray-700 hover:border-black hover:bg-gray-50'
                  }`}
                >
                  <Sliders
                    className={`w-3.5 h-3.5 mb-[1px] ${
                      activeTab === 'tab-preference' ? 'text-amber-600' : 'text-gray-500'
                    }`}
                  />
                  <span className="text-[10px] font-medium leading-tight line-clamp-1 truncate w-full">
                    就餐偏好
                  </span>
                  <span className="mt-[1px] text-[7px] font-mono text-amber-800 bg-amber-50 px-[2px] py-[1px] border border-amber-200 uppercase leading-none rounded-[1px]">
                    联动
                  </span>
                </button>

                {/* TAB 3: 收货地址 */}
                <button
                  type="button"
                  onClick={() => setActiveTab('tab-address')}
                  className={`tab-btn flex flex-col items-center justify-between p-[2px] text-center transition-colors focus:outline-none min-h-[52px] rounded-[1px] cursor-pointer ${
                    activeTab === 'tab-address'
                      ? 'bg-emerald-50 border border-emerald-500 text-emerald-800'
                      : 'bg-white border border-gray-200 text-gray-700 hover:border-black hover:bg-gray-50'
                  }`}
                >
                  <MapPin
                    className={`w-3.5 h-3.5 mb-[1px] ${
                      activeTab === 'tab-address' ? 'text-emerald-600' : 'text-gray-500'
                    }`}
                  />
                  <span className="text-[10px] font-medium leading-tight line-clamp-1 truncate w-full">
                    收货地址
                  </span>
                  <span className="mt-[1px] text-[7px] font-mono text-gray-500 bg-gray-50 px-[2px] py-[1px] border border-gray-200 uppercase leading-none rounded-[1px]">
                    {addresses.length} 项
                  </span>
                </button>

                {/* TAB 4: 安全指纹 */}
                <button
                  type="button"
                  onClick={() => setActiveTab('tab-security')}
                  className={`tab-btn flex flex-col items-center justify-between p-[2px] text-center transition-colors focus:outline-none min-h-[52px] rounded-[1px] cursor-pointer ${
                    activeTab === 'tab-security'
                      ? 'bg-emerald-50 border border-emerald-500 text-emerald-800'
                      : 'bg-white border border-gray-200 text-gray-700 hover:border-black hover:bg-gray-50'
                  }`}
                >
                  <Fingerprint
                    className={`w-3.5 h-3.5 mb-[1px] ${
                      activeTab === 'tab-security' ? 'text-sky-600' : 'text-gray-500'
                    }`}
                  />
                  <span className="text-[10px] font-medium leading-tight line-clamp-1 truncate w-full">
                    安全指纹
                  </span>
                  <span className="mt-[1px] text-[7px] font-mono text-sky-700 bg-sky-50 px-[2px] py-[1px] border border-sky-200 uppercase leading-none rounded-[1px]">
                    99.8%
                  </span>
                </button>

                {/* TAB 5: 财务流水 */}
                <button
                  type="button"
                  onClick={() => setActiveTab('tab-finance')}
                  className={`tab-btn flex flex-col items-center justify-between p-[2px] text-center transition-colors focus:outline-none min-h-[52px] rounded-[1px] cursor-pointer ${
                    activeTab === 'tab-finance'
                      ? 'bg-emerald-50 border border-emerald-500 text-emerald-800'
                      : 'bg-white border border-gray-200 text-gray-700 hover:border-black hover:bg-gray-50'
                  }`}
                >
                  <Wallet
                    className={`w-3.5 h-3.5 mb-[1px] ${
                      activeTab === 'tab-finance' ? 'text-emerald-600' : 'text-gray-500'
                    }`}
                  />
                  <span className="text-[10px] font-medium leading-tight line-clamp-1 truncate w-full">
                    财务流水
                  </span>
                  <span className="mt-[1px] text-[7px] font-mono text-gray-400 bg-gray-50 px-[2px] py-[1px] border border-gray-200 uppercase leading-none rounded-[1px]">
                    30天
                  </span>
                </button>
              </div>
            </nav>

            {/* Quick System Status Note */}
            <div className="p-[3px] bg-white border border-gray-300 text-[10px] font-mono text-gray-500 space-y-[2px] shadow-xs rounded-[1px]">
              <div className="text-gray-900 font-bold flex items-center gap-[2px] uppercase text-[11px]">
                <span className="w-1.5 h-1.5 bg-emerald-600 rounded-[1px]" />
                终端策略状态
              </div>
              <div className="flex justify-between pt-[2px]">
                <span>终端序列：</span>
                <span className="text-gray-800 font-semibold">POS-MAIN-001</span>
              </div>
              <div className="flex justify-between">
                <span>固件协议：</span>
                <span className="text-gray-800">v4.2.8-edge</span>
              </div>
            </div>
          </aside>

          {/* RIGHT MAIN WORKSPACE: Focused Form Setting Panels */}
          <section className="lg:col-span-8 xl:col-span-9 space-y-[3px]">
            {/* TAB 1: 基本资料与身份 */}
            {activeTab === 'tab-profile' && (
              <div className="tab-panel space-y-[3px] animate-in fade-in duration-150">
                <div className="bg-white border border-gray-300 shadow-xs rounded-[1px] p-[3px] space-y-[2px]">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-[2px] mb-[2px]">
                    <div>
                      <div className="flex items-center gap-[2px]">
                        <span className="w-1.5 h-1.5 bg-emerald-600 rounded-[1px]" />
                        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-tight">
                          基本资料与身份信息
                        </h3>
                      </div>
                      <div className="flex items-center gap-[2px] mt-[1px] font-mono text-[9px] text-gray-500">
                        <span className="inline-flex items-center gap-[2px] px-[2px] py-[1px] bg-emerald-50 border border-emerald-200 rounded-[1px] text-emerald-800 font-bold">
                          <Radio className="w-2.5 h-2.5 text-emerald-600" />
                          终端广播
                        </span>
                        <span className="inline-flex items-center gap-[2px] px-[2px] py-[1px] bg-gray-100 border border-gray-200 rounded-[1px] text-gray-600">
                          <Building className="w-2.5 h-2.5 text-gray-500" />
                          档案核心
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono hidden sm:inline-block">实时生效</span>
                  </div>

                  {/* Avatar Selector */}
                  <div className="mb-[2px]">
                    <div className="flex items-center justify-between mb-[2px]">
                      <label className="text-[10px] font-bold text-gray-700 uppercase">先锋头像设定</label>
                      <span className="text-[9px] text-gray-400 font-mono">点击切换</span>
                    </div>
                    <div className="flex flex-wrap gap-[2px]" id="avatar-container">
                      {avatarPresets.map((icon) => {
                        const isSelected = avatar === icon;
                        return (
                          <button
                            key={icon}
                            type="button"
                            onClick={() => setAvatar(icon)}
                            className={`group relative w-9 h-9 flex items-center justify-center focus:outline-none transition-all rounded-[1px] cursor-pointer ${
                              isSelected
                                ? 'border border-emerald-600 bg-emerald-50'
                                : 'border border-gray-300 hover:border-gray-900 bg-white'
                            }`}
                          >
                            <span className="text-lg">{icon}</span>
                            {isSelected && (
                              <span className="absolute -top-0.5 -right-0.5 bg-emerald-600 text-white w-3 h-3 flex items-center justify-center text-[8px] font-bold rounded-[1px]">
                                ✓
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Form Fields Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-[3px] mb-[2px]">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 uppercase mb-[2px]" htmlFor="nickname">
                        食客昵称 / 操作员名称
                      </label>
                      <input
                        id="nickname"
                        type="text"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        className="w-full text-xs font-semibold px-[3px] py-[2px] border border-gray-300 bg-white text-gray-900 focus:outline-none focus:border-emerald-600 rounded-[1px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 uppercase mb-[2px]" htmlFor="phone">
                        绑定手机号 (不可变核心凭证)
                      </label>
                      <input
                        id="phone"
                        type="text"
                        value={phone}
                        readOnly
                        className="w-full text-xs font-mono px-[3px] py-[2px] border border-gray-300 bg-gray-100 text-gray-600 focus:outline-none cursor-not-allowed rounded-[1px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 uppercase mb-[2px]" htmlFor="gender">
                        性别识别
                      </label>
                      <select
                        id="gender"
                        value={gender}
                        onChange={(e) => setGender(e.target.value as any)}
                        className="w-full text-xs px-[3px] py-[2px] border border-gray-300 bg-white text-gray-900 focus:outline-none focus:border-emerald-600 rounded-[1px]"
                      >
                        <option value="secret">保密 (Secret)</option>
                        <option value="male">男 (Male)</option>
                        <option value="female">女 (Female)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 uppercase mb-[2px]" htmlFor="birthday">
                        出生日期
                      </label>
                      <input
                        id="birthday"
                        type="text"
                        value={birthday}
                        onChange={(e) => setBirthday(e.target.value)}
                        className="w-full text-xs font-mono px-[3px] py-[2px] border border-gray-300 bg-white text-gray-900 focus:outline-none focus:border-emerald-600 rounded-[1px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 uppercase mb-[2px]" htmlFor="signature">
                      个性签名 / 岗位权限备注
                    </label>
                    <textarea
                      id="signature"
                      rows={2}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="w-full text-xs px-[3px] py-[2px] border border-gray-300 bg-white text-gray-900 focus:outline-none focus:border-emerald-600 font-mono rounded-[1px]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: 就餐偏好与策略 */}
            {activeTab === 'tab-preference' && (
              <div className="tab-panel space-y-[3px] animate-in fade-in duration-150">
                <div className="bg-white border border-gray-300 shadow-xs p-[3px] space-y-[2px] rounded-[1px]">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-[2px] mb-[2px]">
                    <div>
                      <div className="flex items-center gap-[2px]">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-[1px]" />
                        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-tight">
                          就餐偏好与点单联动策略
                        </h3>
                      </div>
                      <div className="flex items-center gap-[2px] mt-[1px] font-mono text-[9px] text-gray-500">
                        <span className="inline-flex items-center gap-[2px] px-[2px] py-[1px] bg-amber-50 border border-amber-200 rounded-[1px] text-amber-800 font-bold">
                          <Receipt className="w-2.5 h-2.5 text-amber-600" />
                          出票预设
                        </span>
                        <span className="inline-flex items-center gap-[2px] px-[2px] py-[1px] bg-gray-100 border border-gray-200 rounded-[1px] text-gray-600">
                          <ShieldCheck className="w-2.5 h-2.5 text-gray-500" />
                          扫码同步
                        </span>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono text-amber-800 bg-amber-100 border border-amber-300 px-[3px] py-[1px] rounded-[1px]">
                      POS点单联动
                    </span>
                  </div>

                  {/* Spice Level Pill Selector */}
                  <div className="mb-[2px]">
                    <label className="block text-[10px] font-bold text-gray-700 uppercase mb-[2px]">默认辣度偏好</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-[2px]">
                      {[
                        { level: 'LEVEL 0', label: '⚪ 免辣 (No Spicy)', val: 'none' as const },
                        { level: 'LEVEL 1 (默认)', label: '🌶️ 微辣 (Low Spicy)', val: 'mild' as const },
                        { level: 'LEVEL 2', label: '🌶️🌶️ 中辣 (Medium)', val: 'medium' as const },
                        { level: 'LEVEL 3', label: '🌶️🌶️🌶️ 特辣 (Hot)', val: 'hot' as const }
                      ].map((item) => {
                        const isSelected = spiciness === item.val;
                        return (
                          <button
                            key={item.val}
                            type="button"
                            onClick={() => setSpiciness(item.val)}
                            className={`px-[3px] py-[2px] text-xs text-left font-mono transition-colors rounded-[1px] cursor-pointer ${
                              isSelected
                                ? 'border border-emerald-600 bg-emerald-50 text-black'
                                : 'border border-gray-300 bg-white hover:border-black text-gray-700'
                            }`}
                          >
                            <div className={`text-[9px] ${isSelected ? 'text-emerald-700 font-bold' : 'text-gray-400'}`}>
                              {item.level}
                            </div>
                            <div className="font-bold text-[10px] mt-[1px] truncate">{item.label}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Operational Toggle Switches */}
                  <div className="border-t border-gray-200 pt-[2px] space-y-[2px]">
                    <label className="block text-[10px] font-bold text-gray-700 uppercase mb-[1px]">
                      点单环保与免打扰控制
                    </label>

                    {/* Toggle 1: Eco cutlery */}
                    <div className="flex items-center justify-between p-[3px] bg-gray-50 border border-gray-200 rounded-[1px]">
                      <div>
                        <div className="text-xs font-bold text-gray-900 flex items-center gap-[2px]">
                          <span>🌱 绿色环保模式：无需一次性餐具</span>
                        </div>
                        <div className="text-[10px] text-gray-500">
                          下单出票默认不打印一次性竹筷与纸巾包费用项。
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEcoMode(!ecoMode)}
                        className={`w-9 h-5 p-[2px] flex items-center transition-colors rounded-[1px] cursor-pointer shrink-0 ${
                          ecoMode ? 'bg-emerald-600 justify-end' : 'bg-gray-300 justify-start'
                        }`}
                      >
                        <span className="w-4 h-4 bg-white shadow-xs block rounded-[1px]" />
                      </button>
                    </div>

                    {/* Toggle 2: Silent call */}
                    <div className="flex items-center justify-between p-[3px] bg-gray-50 border border-gray-200 rounded-[1px]">
                      <div>
                        <div className="text-xs font-bold text-gray-900 flex items-center gap-[2px]">
                          <span>🔔 叫号出餐静音避让</span>
                        </div>
                        <div className="text-[10px] text-gray-500">
                          当此账号点单时，仅通过短信/手持震动蜂鸣通知，不触发大厅广播。
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSilentCall(!silentCall)}
                        className={`w-9 h-5 p-[2px] flex items-center transition-colors rounded-[1px] cursor-pointer shrink-0 ${
                          silentCall ? 'bg-emerald-600 justify-end' : 'bg-gray-300 justify-start'
                        }`}
                      >
                        <span className="w-4 h-4 bg-white shadow-xs block rounded-[1px]" />
                      </button>
                    </div>
                  </div>

                  {/* Allergy & Kitchen Notes */}
                  <div className="border-t border-gray-200 pt-[2px]">
                    <label className="block text-[10px] font-bold text-gray-700 uppercase mb-[2px]" htmlFor="dietary-notes">
                      忌口避让 / 过敏原特别备注
                    </label>
                    <input
                      id="dietary-notes"
                      type="text"
                      value={dietaryNotes}
                      onChange={(e) => setDietaryNotes(e.target.value)}
                      placeholder="如：花生、葱花、香菜等"
                      className="w-full text-xs px-[3px] py-[2px] border border-gray-300 bg-white text-gray-900 focus:outline-none focus:border-emerald-600 rounded-[1px]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: 收货地址簿 */}
            {activeTab === 'tab-address' && (
              <div className="tab-panel space-y-[3px] animate-in fade-in duration-150">
                <div className="bg-white border border-gray-300 shadow-xs p-[3px] space-y-[2px] rounded-[1px]">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-[2px] mb-[2px]">
                    <div>
                      <div className="flex items-center gap-[2px]">
                        <span className="w-1.5 h-1.5 bg-gray-900 rounded-[1px]" />
                        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-tight">
                          常用送达地址簿
                        </h3>
                      </div>
                      <div className="flex items-center gap-[2px] mt-[1px] font-mono text-[9px] text-gray-500">
                        <span className="inline-flex items-center gap-[2px] px-[2px] py-[1px] bg-gray-100 border border-gray-200 rounded-[1px] text-gray-700">
                          原料
                        </span>
                        <span className="inline-flex items-center gap-[2px] px-[2px] py-[1px] bg-gray-100 border border-gray-200 rounded-[1px] text-gray-700">
                          调货
                        </span>
                        <span className="inline-flex items-center gap-[2px] px-[2px] py-[1px] bg-gray-100 border border-gray-200 rounded-[1px] text-gray-700">
                          外送/自提
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingAddress(true);
                        setEditingAddress(null);
                        setAddrName(nickname);
                        setAddrPhone(phone);
                        setAddrLocation('');
                        setAddrHouseNumber('');
                        setAddrDetail('');
                        setAddrRemarks('');
                      }}
                      className="px-[3px] py-[2px] bg-black hover:bg-gray-800 text-white text-xs font-bold transition-colors flex items-center shadow-xs rounded-[1px] cursor-pointer"
                    >
                      <Plus className="w-3 h-3 mr-[2px]" />
                      <span>新增地址</span>
                    </button>
                  </div>

                  {/* Inline Add / Edit Address Form */}
                  {(isAddingAddress || editingAddress) && (
                    <div className="p-[3px] bg-gray-50 border border-gray-300 rounded-[1px] space-y-[2px] animate-in fade-in duration-150">
                      <div className="flex items-center justify-between text-xs font-bold text-gray-900 border-b border-gray-200 pb-[2px]">
                        <span>{editingAddress ? '编辑常用收货地址' : '新增常用送达地址'}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingAddress(false);
                            setEditingAddress(null);
                          }}
                          className="text-gray-400 hover:text-black cursor-pointer text-xs"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[2px]">
                        <input
                          type="text"
                          value={addrName}
                          onChange={(e) => setAddrName(e.target.value)}
                          placeholder="收货人姓名"
                          className="h-7 px-[3px] py-[2px] bg-white border border-gray-300 text-xs font-semibold focus:outline-none focus:border-emerald-600 rounded-[1px]"
                        />
                        <input
                          type="text"
                          value={addrPhone}
                          onChange={(e) => setAddrPhone(e.target.value)}
                          placeholder="联系电话"
                          className="h-7 px-[3px] py-[2px] bg-white border border-gray-300 text-xs font-mono focus:outline-none focus:border-emerald-600 rounded-[1px]"
                        />
                      </div>

                      <div className="flex items-center gap-[2px]">
                        <span className="text-[10px] font-bold text-gray-500">标签:</span>
                        {(['公司', '家', '学校', '其他'] as const).map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => setAddrTag(tag)}
                            className={`px-[3px] py-[1px] text-[10px] font-bold border rounded-[1px] cursor-pointer ${
                              addrTag === tag
                                ? 'bg-emerald-50 border-emerald-600 text-emerald-800'
                                : 'bg-white border-gray-300 text-gray-600 hover:border-gray-500'
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[2px]">
                        <input
                          type="text"
                          value={addrLocation}
                          onChange={(e) => setAddrLocation(e.target.value)}
                          placeholder="小区 / 写字楼 / 标志性建筑物"
                          className="h-7 px-[3px] py-[2px] bg-white border border-gray-300 text-xs font-semibold focus:outline-none focus:border-emerald-600 rounded-[1px]"
                        />
                        <input
                          type="text"
                          value={addrHouseNumber}
                          onChange={(e) => setAddrHouseNumber(e.target.value)}
                          placeholder="小区几幢几楼几室 (例: 3栋1204室)"
                          className="h-7 px-[3px] py-[2px] bg-white border border-gray-300 text-xs font-semibold focus:outline-none focus:border-emerald-600 rounded-[1px]"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[2px]">
                        <input
                          type="text"
                          value={addrDetail}
                          onChange={(e) => setAddrDetail(e.target.value)}
                          placeholder="道路或区域详细地址"
                          className="h-7 px-[3px] py-[2px] bg-white border border-gray-300 text-xs focus:outline-none focus:border-emerald-600 rounded-[1px]"
                        />
                        <input
                          type="text"
                          value={addrRemarks}
                          onChange={(e) => setAddrRemarks(e.target.value)}
                          placeholder="配送备注 (例: 放门口 / 到楼下电联)"
                          className="h-7 px-[3px] py-[2px] bg-white border border-gray-300 text-xs focus:outline-none focus:border-emerald-600 rounded-[1px]"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-[2px] pt-[2px]">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingAddress(false);
                            setEditingAddress(null);
                          }}
                          className="px-[3px] py-[2px] bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-[1px] cursor-pointer"
                        >
                          取消
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveAddress}
                          className="px-[3px] py-[2px] bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-[1px] cursor-pointer shadow-xs"
                        >
                          保存地址
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Address List */}
                  <div className="space-y-[2px]" id="address-list-container">
                    {addresses.map((addr) => (
                      <div
                        key={addr.id}
                        className="p-[3px] bg-gray-50 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-[2px] rounded-[1px]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-[2px] mb-[1px]">
                            <span className="text-xs font-bold text-gray-900">{addr.address}</span>
                            {addr.isDefault ? (
                              <span className="text-[9px] font-mono bg-emerald-100 text-emerald-800 border border-emerald-300 px-[2px] py-[1px] rounded-[1px]">
                                默认
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSetDefaultAddress(addr.id)}
                                className="text-[9px] font-mono text-gray-500 hover:text-black border border-gray-200 px-[2px] py-[1px] rounded-[1px] cursor-pointer bg-white"
                              >
                                设为默认
                              </button>
                            )}
                            <span className="text-[10px] font-mono text-gray-500">
                              {addr.name} {addr.phone}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-600 font-mono">
                            {addr.detail} {addr.houseNumber ? `· ${addr.houseNumber}` : ''}
                          </div>
                          {addr.remarks && (
                            <div className="text-[10px] text-emerald-700 font-mono">
                              备注: {addr.remarks}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-[2px] text-xs font-mono shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAddress(addr);
                              setAddrName(addr.name);
                              setAddrPhone(addr.phone);
                              setAddrTag(addr.tag);
                              setAddrLocation(addr.address);
                              setAddrHouseNumber(addr.houseNumber || '');
                              setAddrDetail(addr.detail);
                              setAddrRemarks(addr.remarks || '');
                            }}
                            className="p-[2px] text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-colors rounded-[1px] flex items-center justify-center cursor-pointer"
                            title="编辑"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('确定移除该收货地址？')) {
                                handleDeleteAddress(addr.id);
                              }
                            }}
                            className="p-[2px] text-gray-400 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors rounded-[1px] flex items-center justify-center cursor-pointer"
                            title="删除"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Empty prompt */}
                    {addresses.length === 0 && (
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-[2px] py-[3px] px-[2px] bg-gray-50 border border-dashed border-gray-300 text-center rounded-[1px]">
                        <AlertCircle className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-[11px] text-gray-500 font-mono">暂无地址配置</span>
                        <span className="text-gray-300">|</span>
                        <span className="text-[10px] text-gray-400">点击上方按钮新增送达地址</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: 安全凭据与硬件指纹 */}
            {activeTab === 'tab-security' && (
              <div className="tab-panel space-y-[3px] animate-in fade-in duration-150">
                <div className="bg-white border border-gray-300 shadow-xs p-[3px] space-y-[2px] rounded-[1px]">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-[2px] mb-[2px]">
                    <div>
                      <div className="flex items-center gap-[2px]">
                        <span className="w-1.5 h-1.5 bg-sky-600 rounded-[1px]" />
                        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-tight">
                          云端安全凭据与硬件指纹认证
                        </h3>
                      </div>
                      <div className="flex items-center gap-[2px] mt-[1px] font-mono text-[9px] text-gray-500">
                        <span className="inline-flex items-center gap-[2px] px-[2px] py-[1px] bg-sky-50 border border-sky-200 rounded-[1px] text-sky-800 font-bold">
                          <ShieldCheck className="w-2.5 h-2.5 text-sky-600" />
                          硬件防伪
                        </span>
                        <span className="inline-flex items-center gap-[2px] px-[2px] py-[1px] bg-gray-100 border border-gray-200 rounded-[1px] text-gray-600">
                          <KeyRound className="w-2.5 h-2.5 text-gray-500" />
                          单机绑定
                        </span>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono bg-sky-100 text-sky-800 border border-sky-300 px-[3px] py-[1px] rounded-[1px]">
                      99.8% 硬件指纹匹配
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-[2px]">
                    <div className="p-[3px] bg-gray-50 border border-gray-200 rounded-[1px]">
                      <div className="flex justify-between items-center text-gray-500 text-[9px] font-mono uppercase mb-[1px]">
                        <span>云端账户 UID</span>
                        <span className="text-emerald-700 font-bold">ACTIVE</span>
                      </div>
                      <div className="text-xs text-gray-900 truncate font-mono font-bold">
                        merchant_{phone}
                      </div>
                      <div className="text-[9px] text-gray-400 mt-[1px] font-mono">
                        绑定生效时间: {userProfile.createdAt || '2024-01-15 09:20:11 UTC+8'}
                      </div>
                    </div>

                    <div className="p-[3px] bg-gray-50 border border-gray-200 rounded-[1px]">
                      <div className="flex justify-between items-center text-gray-500 text-[9px] font-mono uppercase mb-[1px]">
                        <span>POS 硬件签名 Token</span>
                        <span className="text-sky-700 font-bold">ENCRYPTED</span>
                      </div>
                      <div className="text-xs text-gray-900 truncate font-mono font-bold">
                        {hwToken}
                      </div>
                      <div className="text-[9px] text-gray-400 mt-[1px] font-mono">
                        SHA-256 HMAC 芯片级防篡改校验
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-[2px] flex flex-col sm:flex-row items-center justify-between gap-[2px]">
                    <div className="flex items-center gap-[2px] text-xs text-gray-500 font-mono">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                      <span className="font-bold text-gray-700">设备更换/系统重装：</span>
                      <span>需重签密匙</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleReissueKey}
                      className="w-full sm:w-auto px-[3px] py-[2px] bg-white border border-gray-300 hover:border-black text-xs font-semibold text-gray-800 transition-colors whitespace-nowrap shadow-xs rounded-[1px] cursor-pointer"
                    >
                      重签安全密匙
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: 财务账户与流水 */}
            {activeTab === 'tab-finance' && (
              <div className="tab-panel space-y-[3px] animate-in fade-in duration-150">
                <div className="bg-white border border-gray-300 shadow-xs p-[3px] space-y-[2px] rounded-[1px]">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-[2px] mb-[2px]">
                    <div>
                      <div className="flex items-center gap-[2px]">
                        <span className="w-1.5 h-1.5 bg-emerald-600 rounded-[1px]" />
                        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-tight">
                          财务账户与流水快照
                        </h3>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-[1px]">
                        查看账户余额、会员储值记录与结算对账流水明细。
                      </p>
                    </div>
                    <span className="text-[9px] font-mono text-gray-400">近30天统计</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-[2px] font-mono">
                    <div className="p-[3px] bg-gray-50 border border-gray-200 rounded-[1px]">
                      <span className="text-[8px] text-gray-400 block uppercase">主账户储值可用额度</span>
                      <span className="text-lg font-black text-amber-500">¥{balance.toFixed(2)}</span>
                      <span className="text-[8px] text-gray-500 block mt-[1px]">可用于点单全额冲抵</span>
                    </div>
                    <div className="p-[3px] bg-gray-50 border border-gray-200 rounded-[1px]">
                      <span className="text-[8px] text-gray-400 block uppercase">活跃忠诚度积分</span>
                      <span className="text-lg font-black text-gray-900">{points}</span>
                      <span className="text-[8px] text-gray-500 block mt-[1px]">100 积分抵扣 ¥1.00</span>
                    </div>
                    <div className="p-[3px] bg-gray-50 border border-gray-200 rounded-[1px]">
                      <span className="text-[8px] text-gray-400 block uppercase">未结算账单金额</span>
                      <span className="text-lg font-black text-gray-400">¥0.00</span>
                      <span className="text-[8px] text-emerald-600 block mt-[1px]">✓ 当前无挂账待清算</span>
                    </div>
                  </div>

                  {/* Fast simulation / recharge */}
                  <div className="flex flex-wrap items-center gap-[2px] pt-[2px] border-t border-gray-100">
                    <span className="text-[10px] font-mono text-gray-500">调试充值：</span>
                    <button
                      type="button"
                      onClick={() => {
                        setBalance((prev) => prev + 50);
                        toast.success('储值充值成功', '体验账户已成功增加 ¥50.00 储值金');
                      }}
                      className="px-[3px] py-[1px] text-[10px] font-mono font-bold bg-white border border-gray-300 hover:border-black rounded-[1px] cursor-pointer transition-colors"
                    >
                      +¥50.00
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPoints((prev) => prev + 100);
                        toast.success('积分增补成功', '体验账户已成功增加 100 积分');
                      }}
                      className="px-[3px] py-[1px] text-[10px] font-mono font-bold bg-white border border-gray-300 hover:border-black rounded-[1px] cursor-pointer transition-colors"
                    >
                      +100 积分
                    </button>
                  </div>

                  <div className="border border-dashed border-gray-200 bg-gray-50 p-[3px] text-center rounded-[1px]">
                    <Receipt className="w-6 h-6 text-gray-300 mx-auto mb-[2px]" />
                    <div className="text-[10px] text-gray-500 font-mono">近 30 天内暂无未结算账单或退单记录</div>
                    <div className="text-[9px] text-gray-400">
                      所有前台出单流水已自动归档至云财务中枢。
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* BOTTOM FIXED ACTION BAR: Reset & Save */}
            <div className="bg-white border border-gray-300 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-[2px] rounded-[1px] p-[2px]">
              <div className="text-[10px] text-gray-500 font-mono text-center sm:text-left flex items-center gap-[2px]">
                <span className="inline-flex items-center gap-[2px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-[2px] py-[1px] rounded-[1px] text-[9px] font-bold">
                  <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                  中心校验
                </span>
                <span className="text-gray-300">/</span>
                <span className="inline-flex items-center gap-[2px] text-[10px] text-gray-600 font-mono">
                  <RefreshCw className="w-2.5 h-2.5 text-emerald-600" />
                  实时链路在线
                </span>
              </div>
              <div className="flex items-center gap-[2px] w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleResetToInitial}
                  className="px-[3px] py-[2px] border border-gray-300 text-xs font-bold text-gray-700 bg-white hover:bg-gray-100 transition-colors rounded-[1px] cursor-pointer"
                  id="reset-btn"
                >
                  重置为初始设定
                </button>
                <button
                  type="button"
                  onClick={handleSaveAndSync}
                  disabled={isSyncing}
                  className="px-[3px] py-[2px] border border-black text-xs font-bold text-white bg-black hover:bg-gray-800 transition-colors shadow-xs rounded-[1px] cursor-pointer disabled:opacity-75"
                  id="save-btn"
                >
                  {isSyncing ? '保存中' : '保存修改'}
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};
