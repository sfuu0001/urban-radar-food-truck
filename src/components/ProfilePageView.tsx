import React, { useState, useRef, useMemo } from 'react';
import {
  Compass,
  Bell,
  Award,
  Zap,
  Truck,
  Headset,
  Gift,
  User,
  CreditCard,
  Shield,
  ChevronRight,
  LogOut,
  Sparkles,
  CheckCircle2,
  Lock,
  X,
  RotateCw,
  QrCode,
  Wifi,
  Ticket,
  Flame,
  ArrowRight,
  Cloud,
  Edit3,
  Coins,
  Wallet,
  KeyRound,
  UserCheck,
  LogIn,
  UserPlus,
  Smartphone,
  Fingerprint
} from 'lucide-react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { UserCouponsModal } from './UserCouponsModal';
import { UserProfileEditView } from './user/UserProfileEditView';
import { UserAuthModal } from './user/UserAuthModal';
import { INITIAL_USER_COUPONS } from '../data/mockCoupons';
import { INITIAL_USER_PROFILE } from '../data/mockUser';
import { UserCouponRecord } from '../types/coupon';
import { UserProfile, Order } from '../types';
import { safeGetStorage, safeSetStorage } from '../utils/safeStorage';
import { useDevSimulation } from '../context/DevSimulationContext';
import { BackButton } from './BackButton';

interface ProfilePageViewProps {
  onOpenRadar?: () => void;
  onOpenVIP?: () => void;
  onOpenAddress?: () => void;
  onGoToMenu?: () => void;
  onOpenCoupons?: () => void;
  onOpenCloudSync?: () => void;
  currentAddress?: string;
  isVIPActive?: boolean;
  userProfile?: UserProfile;
  onProfileUpdated?: (updated: UserProfile) => void;
  orders?: Order[];
  onOrdersUpdated?: (orders: Order[]) => void;
}

export const ProfilePageView: React.FC<ProfilePageViewProps> = ({
  onOpenRadar,
  onOpenVIP,
  onOpenAddress,
  onGoToMenu,
  onOpenCoupons,
  onOpenCloudSync,
  currentAddress = '静安大悦城北座 1F 中庭',
  isVIPActive = true,
  userProfile = INITIAL_USER_PROFILE,
  onProfileUpdated,
  orders = [],
  onOrdersUpdated
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<'payment' | 'security' | null>(null);
  const [isCouponsOpen, setIsCouponsOpen] = useState(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [profileEditTab, setProfileEditTab] = useState<'profile' | 'addresses' | 'preferences' | 'wallet'>('profile');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'sms' | 'password' | 'register' | 'auto' | 'presets' | 'login'>('sms');
  const [isSignedOut, setIsSignedOut] = useState(false);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  // FIX(审计P1): 会员通知开关真实化——持久化开关状态并切换 UI，取代"仅提示已开启"假实现
  const [isNotificationOn, setIsNotificationOn] = useState<boolean>(() => safeGetStorage<boolean>('obsidian_member_notification_on', true));
  const toggleMemberNotification = () => {
    setIsNotificationOn((prev) => {
      const next = !prev;
      safeSetStorage('obsidian_member_notification_on', next);
      showToast(next ? '会员通知已开启：订单/优惠动态将实时提醒' : '会员通知已关闭：将不再接收实时推送');
      return next;
    });
  };

  const { isAdminDeveloper, isSimulationAllowed, openDevControlCenter, openDevAuthModal } = useDevSimulation();

  // Read active coupons count
  const availableCouponsCount = useMemo(() => {
    const list = safeGetStorage<UserCouponRecord[]>('obsidian_user_coupons', INITIAL_USER_COUPONS);
    return list.filter((c) => c.status === 'available').length;
  }, [isCouponsOpen]);

  // 3D Tilt interactive physics
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const rotateX = useSpring(useTransform(mouseY, [0, 1], [12, -12]), { damping: 20, stiffness: 200 });
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-12, 12]), { damping: 20, stiffness: 200 });
  const glareX = useTransform(mouseX, [0, 1], ['0%', '100%']);
  const glareY = useTransform(mouseY, [0, 1], ['0%', '100%']);
  const cardGlareBackground = useTransform(
    [glareX, glareY],
    ([x, y]) =>
      `radial-gradient(circle at ${x} ${y}, rgba(255,255,255,0.6) 0%, rgba(34,197,94,0.3) 30%, transparent 70%)`
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  };

  const handlePerkClick = (perkName: string) => {
    if (onOpenVIP) {
      onOpenVIP();
    } else {
      showToast(`已激活特权: ${perkName}`);
    }
  };

  const handleSignOut = () => {
    setIsSignedOut(true);
    showToast('已安全退出登录，已切换为访客模式');
  };

  const handleOpenAuth = (mode: 'sms' | 'password' | 'register' | 'auto' | 'presets' | 'login' = 'sms') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  // If user opened embedded profile/settings page
  if (isProfileEditOpen) {
    return (
      <div className="w-full min-h-screen bg-[#f4f6f8] text-gray-900 flex flex-col font-sans select-none animate-in fade-in duration-200">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-black text-white text-xs px-3 py-2 rounded-[1px] shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        <UserProfileEditView
          userProfile={userProfile}
          onProfileUpdated={(updated) => {
            if (onProfileUpdated) onProfileUpdated(updated);
          }}
          onBack={() => setIsProfileEditOpen(false)}
          initialTab={profileEditTab}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto min-h-[85vh] bg-[#f9f9f7] text-[#1a1c1b] px-1 py-0 flex flex-col font-sans select-none animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-black text-white text-xs px-3 py-2 rounded-full shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Back Navigation to Point-of-Sale Menu */}
      {onGoToMenu && (
        <div className="pt-0.5 pb-0.5">
          <BackButton onClick={onGoToMenu} label="返回点餐" />
        </div>
      )}

      {/* Page Title & User Quick Header */}
      <div className="pt-0.5 pb-1 flex items-center justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-black tracking-tight text-black flex items-center gap-1.5">
            <span>会员特权与黑卡中心</span>
            {isVIPActive && (
              <span className="text-[9.5px] bg-amber-400 text-black font-black px-1.5 py-0.2 rounded-full font-mono">
                黑卡生效中
              </span>
            )}
          </h2>
          <p className="text-[11px] text-[#787770] mt-0.5">
            管理您的尊享特权、云端会员资料与就餐偏好。
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Quick Profile Edit Button */}
          <button
            type="button"
            onClick={() => {
              setProfileEditTab('profile');
              setIsProfileEditOpen(true);
            }}
            className="px-2.5 py-1 rounded-full bg-white border border-[#e6e6e4] text-black hover:bg-neutral-100 text-[11px] font-bold active:scale-95 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
            title="编辑个人资料与地址簿"
          >
            <Edit3 className="w-3 h-3 text-emerald-600" />
            <span>资料设置</span>
          </button>

          <button
            type="button"
            onClick={toggleMemberNotification}
            className="w-7 h-7 rounded-full bg-white border border-[#e6e6e4] text-black hover:bg-neutral-100 active:scale-95 transition-all cursor-pointer relative flex items-center justify-center shadow-2xs shrink-0"
            title={isNotificationOn ? '通知已开启（点击关闭）' : '通知已关闭（点击开启）'}
          >
            <Bell className={`w-3.5 h-3.5 stroke-[1.8] ${isNotificationOn ? '' : 'opacity-35'}`} />
            {isNotificationOn && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-white" />}
          </button>
        </div>
      </div>

      {/* User Mini Bar Banner or Guest Login Banner */}
      {isSignedOut ? (
        <div className="my-1.5 p-3.5 bg-gradient-to-br from-neutral-900 via-neutral-950 to-black text-white rounded-2xl border border-neutral-800 shadow-md flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-emerald-400">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-white">未登录 · 访客模式</span>
                  <span className="text-[8.5px] bg-neutral-800 text-neutral-400 font-mono px-1 rounded">
                    GUEST
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400 mt-0.5">
                  登录享 VIP 会员专属立减、历史订单多端云同步与新人 ¥88 赠礼
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Grid */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleOpenAuth('sms')}
              className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-sm"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>手机号极速登录 / 注册</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenAuth('password')}
              className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer border border-white/15"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>密码登录 / 新人注册</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="my-1 p-2.5 bg-white rounded-2xl border border-[#e8e8e4] shadow-2xs flex items-center justify-between gap-2">
          <div 
            onClick={() => {
              setProfileEditTab('profile');
              setIsProfileEditOpen(true);
            }}
            className="flex items-center gap-2.5 cursor-pointer min-w-0 flex-1 group"
          >
            <div className="relative shrink-0">
              <img
                src={userProfile.avatar}
                alt={userProfile.nickname}
                className="w-9 h-9 rounded-full object-cover border border-emerald-400 group-hover:scale-105 transition-transform shadow-2xs"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white flex items-center justify-center text-[6px] text-white font-bold">
                ✓
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-black truncate group-hover:text-emerald-700 transition-colors">
                  {userProfile.nickname}
                </span>
                <span className="text-[9px] bg-neutral-100 text-neutral-600 font-mono px-1 rounded">
                  UID:{userProfile.uid.slice(-4)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10.5px] text-neutral-500 mt-0.5">
                <span className="font-mono">{userProfile.phone}</span>
                <span>·</span>
                <span className="text-emerald-600 font-mono font-bold flex items-center gap-0.5">
                  <Cloud className="w-2.5 h-2.5" /> 云函数已打通
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <div className="text-xs font-mono font-black text-black">
                ¥{userProfile.balance.toFixed(2)}
              </div>
              <div className="text-[9.5px] text-neutral-400">账户余额</div>
            </div>
            <button
              type="button"
              onClick={() => handleOpenAuth('presets')}
              className="px-2 py-1 rounded-lg bg-neutral-100 hover:bg-black hover:text-white text-[10.5px] font-bold text-neutral-700 flex items-center gap-1 transition-all cursor-pointer"
              title="切换账号"
            >
              <UserCheck className="w-3 h-3 text-emerald-600" />
              <span>换号</span>
            </button>
          </div>
        </div>
      )}

      {/* Realistic 3D Interactive Floating VIP Card with Holographic Glare & Double-Sided Flip */}
      <div className="relative py-0.5 perspective-[1200px]">
        <motion.div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            rotateX: isCardFlipped ? 0 : rotateX,
            rotateY: isCardFlipped ? 0 : rotateY,
            transformStyle: 'preserve-3d'
          }}
          animate={{
            y: [0, -4, 0],
            rotateY: isCardFlipped ? 180 : 0
          }}
          transition={{
            y: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
            rotateY: { duration: 0.6, ease: [0.23, 1, 0.32, 1] }
          }}
          onClick={() => setIsCardFlipped((prev) => !prev)}
          className="relative w-full aspect-[1.75/1] rounded-xl cursor-pointer group shadow-[0_12px_24px_-8px_rgba(0,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.12)] transition-shadow duration-300 hover:shadow-[0_16px_30px_-8px_rgba(0,0,0,0.45),0_0_15px_rgba(34,197,94,0.18)]"
        >
          {/* FRONT FACE OF CARD */}
          <div
            className={`absolute inset-0 rounded-xl overflow-hidden p-3 sm:p-3.5 flex flex-col justify-between bg-gradient-to-br from-[#1c1d1a] via-[#121311] to-[#090a09] text-white border border-[#333530] backface-hidden ${
              isCardFlipped ? 'pointer-events-none opacity-0' : 'opacity-100'
            }`}
            style={{ backfaceVisibility: 'hidden' }}
          >
            {/* Dynamic Holographic Glare Reflection */}
            <motion.div
              className="absolute inset-0 pointer-events-none opacity-25 group-hover:opacity-40 transition-opacity duration-300"
              style={{
                background: cardGlareBackground
              }}
            />

            {/* Brushed Metallic Texture Lines */}
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:12px_12px] opacity-40 pointer-events-none" />

            {/* Diamond Geometric Faceted Watermark */}
            <div className="absolute right-0 bottom-0 top-0 w-36 pointer-events-none opacity-25 flex items-center justify-end pr-1 overflow-hidden">
              <svg
                viewBox="0 0 100 100"
                className="w-32 h-32 stroke-white/80 fill-none stroke-[2.5] transition-transform duration-700 group-hover:scale-105 group-hover:stroke-emerald-400/80"
              >
                <polygon points="50,10 90,35 75,90 25,90 10,35" />
                <line x1="10" y1="35" x2="90" y2="35" />
                <line x1="50" y1="10" x2="25" y2="90" />
                <line x1="50" y1="10" x2="75" y2="90" />
                <line x1="25" y1="35" x2="50" y2="90" />
                <line x1="75" y1="35" x2="50" y2="90" />
              </svg>
            </div>

            {/* Top Row: Chip + Card Status + Green Ribbon Badge */}
            <div className="flex items-start justify-between relative z-10">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  {/* EMV Microchip graphic */}
                  <div className="w-6.5 h-4.5 rounded-md bg-gradient-to-tr from-amber-300 via-amber-200 to-amber-400 p-[1.5px] shadow-sm flex items-center justify-center">
                    <div className="w-full h-full rounded-[3px] border border-amber-600/40 bg-amber-200/90 grid grid-cols-2 grid-rows-2 gap-[1px] p-0.5">
                      <div className="border-b border-r border-amber-600/30" />
                      <div className="border-b border-amber-600/30" />
                      <div className="border-r border-amber-600/30" />
                      <div />
                    </div>
                  </div>
                  <Wifi className="w-3 h-3 text-neutral-400 rotate-90" />
                </div>
                <div className="pt-0.5">
                  <span className="text-[8px] uppercase font-extrabold text-[#8c8b84] tracking-widest block">
                    STATUS
                  </span>
                  <span className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-1">
                    {isSignedOut ? 'Guest Member' : 'VIP Elite'}
                    <Sparkles className="w-3 h-3 text-emerald-400 inline animate-pulse" />
                  </span>
                </div>
              </div>

              {/* Green Ribbon / Badge with star */}
              <div className="flex flex-col items-end gap-0.5">
                <div className="flex items-center justify-center w-6.5 h-6.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[#22c55e] shadow-[0_0_10px_rgba(34,197,94,0.3)]">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-3.5 h-3.5 fill-none stroke-[#22c55e] stroke-[2.2] stroke-linecap-round stroke-linejoin-round"
                  >
                    <circle cx="12" cy="8" r="6" />
                    <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
                    <polygon points="12,5 13.2,7.5 16,7.8 14,9.7 14.5,12.5 12,11.1 9.5,12.5 10,9.7 8,7.8 10.8,7.5" fill="#22c55e" stroke="none" />
                  </svg>
                </div>
                <span className="text-[8px] font-semibold text-neutral-400 flex items-center gap-0.5 group-hover:text-emerald-400 transition-colors">
                  <RotateCw className="w-2.5 h-2.5" /> 点击翻面
                </span>
              </div>
            </div>

            {/* Bottom Row: Points to Next Tier & Progress Bar */}
            <div className="relative z-10 pt-0.5">
              <div className="flex items-center justify-between text-xs mb-0.5">
                <span className="text-[9px] text-[#9ca3af] font-bold uppercase tracking-wider">
                  Points to Next Tier
                </span>
                <span className="text-[10.5px] font-bold text-white font-mono tracking-wide">
                  {isSignedOut ? '0 / 5,000' : `${userProfile.points} / 5,000`}
                </span>
              </div>

              {/* Glow Neon Emerald Progress Bar */}
              <div className="w-full h-1 sm:h-1.5 bg-[#2d2e2b] rounded-full overflow-hidden p-[1px]">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-[#22c55e] rounded-full shadow-[0_0_8px_rgba(34,197,94,0.8)] transition-all duration-700"
                  style={{ width: isSignedOut ? '0%' : `${Math.min(100, (userProfile.points / 5000) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* BACK FACE OF CARD */}
          <div
            className={`absolute inset-0 rounded-xl overflow-hidden flex flex-col justify-between bg-gradient-to-br from-[#181916] via-[#10110f] to-[#080807] text-white border border-[#333530] ${
              !isCardFlipped ? 'pointer-events-none opacity-0' : 'opacity-100'
            }`}
            style={{
              transform: 'rotateY(180deg)',
              backfaceVisibility: 'hidden'
            }}
          >
            {/* Magnetic Stripe */}
            <div className="w-full h-6 bg-neutral-900 mt-2.5 border-y border-neutral-800" />

            {/* Middle Section: Signature & Security Info */}
            <div className="px-3.5 py-1 flex items-center justify-between gap-2.5">
              <div className="flex-1 space-y-0.5">
                <div className="h-4.5 bg-neutral-100 rounded flex items-center justify-between px-2 text-[8.5px] text-neutral-800 font-mono italic">
                  <span>URBAN-RADAR-VIP</span>
                  <span className="font-bold">CVV 802</span>
                </div>
                <p className="text-[7px] text-neutral-400 leading-tight">
                  黑曜石移动餐车网络专享 · 专属管家通道 400-880-9988
                </p>
              </div>

              {/* QR Code */}
              <div className="w-8 h-8 bg-white rounded-lg p-0.5 flex items-center justify-center shrink-0 shadow-md">
                <QrCode className="w-6.5 h-6.5 text-black" />
              </div>
            </div>

            {/* Bottom Footer Details */}
            <div className="px-3.5 pb-1.5 pt-0.5 flex items-center justify-between text-[8px] text-neutral-400 border-t border-neutral-800/80">
              <span>CARD NO: UR-8802-ELITE</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="w-2.5 h-2.5" /> 已加密认证
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Section: Coupon Management Center */}
      <div className="mt-2">
        <motion.div
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            if (onOpenCoupons) {
              onOpenCoupons();
            } else {
              setIsCouponsOpen(true);
            }
          }}
          className="bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 rounded-xl p-2.5 border border-neutral-800 shadow-sm cursor-pointer text-white relative overflow-hidden group"
        >
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-24 h-24 bg-amber-400/10 rounded-full blur-xl pointer-events-none" />

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-7.5 h-7.5 rounded-lg bg-white/10 border border-white/15 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <Ticket className="w-3.5 h-3.5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs sm:text-sm font-black tracking-tight text-white">
                    我的优惠券包
                  </h4>
                  <span className="text-[8.5px] bg-amber-400 text-black px-1.5 py-0.2 rounded-full font-black font-mono">
                    {availableCouponsCount} 张可用
                  </span>
                </div>
                <p className="text-[9.5px] text-neutral-300 mt-0.5 truncate">
                  查看全品类通用券、时段专享券与过期失效记录
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-amber-400 text-xs font-bold shrink-0">
              <span className="hidden sm:inline text-[10.5px]">管理与兑换</span>
              <div className="w-4.5 h-4.5 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-amber-400 group-hover:text-black transition-colors">
                <ChevronRight className="w-3 h-3" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Section 1: Exclusive Perks */}
      <div className="mt-2">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs sm:text-sm font-black text-black tracking-tight">
            Exclusive Perks
          </h3>
          <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200">
            4 项尊享权益
          </span>
        </div>

        {/* Single Row 4-Columns Horizontal Grid */}
        <div className="grid grid-cols-4 gap-1">
          <motion.button
            whileHover={{ y: -2, scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => {
              if (onOpenRadar) {
                onOpenRadar();
              } else {
                handlePerkClick('Priority Radar (优先雷达定位)');
              }
            }}
            className="bg-white rounded-xl p-1.5 flex flex-col items-center justify-center text-center gap-1 shadow-2xs border border-[#e8e8e4] hover:border-black hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="w-6.5 h-6.5 rounded-lg bg-neutral-100 group-hover:bg-black group-hover:text-amber-300 text-black flex items-center justify-center transition-colors duration-200">
              <Zap className="w-3 h-3 stroke-[2.2] group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-[9.5px] font-bold text-black tracking-tight leading-tight line-clamp-1">
              Priority Radar
            </span>
          </motion.button>

          <motion.button
            whileHover={{ y: -2, scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => handlePerkClick('Free Delivery (尊享免配送费)')}
            className="bg-white rounded-xl p-1.5 flex flex-col items-center justify-center text-center gap-1 shadow-2xs border border-[#e8e8e4] hover:border-black hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="w-6.5 h-6.5 rounded-lg bg-neutral-100 group-hover:bg-black group-hover:text-emerald-400 text-black flex items-center justify-center transition-colors duration-200">
              <Truck className="w-3 h-3 stroke-[2.2] group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-[9.5px] font-bold text-black tracking-tight leading-tight line-clamp-1">
              Free Delivery
            </span>
          </motion.button>

          <motion.button
            whileHover={{ y: -2, scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => handlePerkClick('VIP Support (专属VIP客服通道)')}
            className="bg-white rounded-xl p-1.5 flex flex-col items-center justify-center text-center gap-1 shadow-2xs border border-[#e8e8e4] hover:border-black hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="w-6.5 h-6.5 rounded-lg bg-neutral-100 group-hover:bg-black group-hover:text-sky-400 text-black flex items-center justify-center transition-colors duration-200">
              <Headset className="w-3 h-3 stroke-[2.2] group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-[9.5px] font-bold text-black tracking-tight leading-tight line-clamp-1">
              VIP Support
            </span>
          </motion.button>

          <motion.button
            whileHover={{ y: -2, scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => handlePerkClick('Monthly Gift (每月尊享好礼)')}
            className="bg-white rounded-xl p-1.5 flex flex-col items-center justify-center text-center gap-1 shadow-2xs border border-[#e8e8e4] hover:border-black hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="w-6.5 h-6.5 rounded-lg bg-neutral-100 group-hover:bg-black group-hover:text-rose-400 text-black flex items-center justify-center transition-colors duration-200">
              <Gift className="w-3 h-3 stroke-[2.2] group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-[9.5px] font-bold text-black tracking-tight leading-tight line-clamp-1">
              Monthly Gift
            </span>
          </motion.button>
        </div>
      </div>

      {/* Section 2: Account & Security Settings */}
      <div className="mt-2">
        <h3 className="text-xs sm:text-sm font-black text-black tracking-tight mb-1">
          Account & Security
        </h3>

        {/* White Rounded Card with Setting Rows */}
        <div className="bg-white rounded-xl border border-[#e8e8e4] shadow-2xs overflow-hidden divide-y divide-[#f0f0ed]">
          {/* Row -1: Account Registration & Unified Auth Center */}
          <button
            type="button"
            onClick={() => handleOpenAuth('sms')}
            className="w-full px-2.5 py-2 flex items-center justify-between hover:bg-neutral-50 active:bg-neutral-100 transition-colors cursor-pointer text-left group bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5.5 h-5.5 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <KeyRound className="w-3.2 h-3.2" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-black tracking-tight block truncate">
                    账号注册、登录与身份切换
                  </span>
                  <span className="text-[8px] bg-emerald-600 text-white font-mono px-1 rounded font-bold">
                    AUTH CENTER
                  </span>
                </div>
                <span className="text-[9px] text-[#787770] block truncate">
                  支持短信验证码、账号密码注册登录与多身份极速切换
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[8.5px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.2 rounded border border-emerald-200 font-mono">
                注册 / 登录
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-[#9ca3af] stroke-[2] group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* Row 1: Personal Information */}
          <button
            type="button"
            onClick={() => {
              setProfileEditTab('addresses');
              setIsProfileEditOpen(true);
            }}
            className="w-full px-2.5 py-2 flex items-center justify-between hover:bg-neutral-50 active:bg-neutral-100 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-black stroke-[2]" />
              <div>
                <span className="text-xs font-bold text-black tracking-tight block">
                  Personal Information & Addresses
                </span>
                <span className="text-[9px] text-[#787770]">
                  管理头像、昵称、常用地址簿与就餐偏好
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1 rounded font-bold">
                {userProfile.addresses?.length || 0} 个地址
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-[#9ca3af] stroke-[2]" />
            </div>
          </button>

          {/* Row 5: Payment Methods */}
          <button
            type="button"
            onClick={() => setActiveModal('payment')}
            className="w-full px-2.5 py-2 flex items-center justify-between hover:bg-neutral-50 active:bg-neutral-100 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5 text-black stroke-[2]" />
              <span className="text-xs font-bold text-black tracking-tight">
                Payment Methods
              </span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-[#9ca3af] stroke-[2]" />
          </button>

          {/* Row 6: Privacy & Security */}
          <button
            type="button"
            onClick={() => setActiveModal('security')}
            className="w-full px-2.5 py-2 flex items-center justify-between hover:bg-neutral-50 active:bg-neutral-100 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-black stroke-[2]" />
              <span className="text-xs font-bold text-black tracking-tight">
                Privacy & Security
              </span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-[#9ca3af] stroke-[2]" />
          </button>

          {/* Row 7: Developer Simulation & Testing Center (Admin Gated) */}
          <button
            type="button"
            onClick={() => {
              if (isAdminDeveloper) {
                openDevControlCenter();
              } else {
                openDevAuthModal();
              }
            }}
            className={`w-full px-2.5 py-2 flex items-center justify-between rounded-xl transition-all cursor-pointer text-left border ${
              isAdminDeveloper
                ? 'bg-amber-500/10 border-amber-400/40 hover:bg-amber-500/15'
                : 'bg-neutral-50/80 border-neutral-200/80 hover:bg-neutral-100/80'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`w-5.5 h-5.5 rounded-lg flex items-center justify-center shrink-0 border ${
                  isAdminDeveloper
                    ? 'bg-amber-500 text-black border-amber-600'
                    : 'bg-neutral-200 text-neutral-600 border-neutral-300'
                }`}
              >
                {isAdminDeveloper ? (
                  <Sparkles className="w-3 h-3" />
                ) : (
                  <Lock className="w-3 h-3" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-black tracking-tight block truncate">
                    {isAdminDeveloper ? '开发者模拟与调试中枢' : '开发者账号登录认证'}
                  </span>
                  {isAdminDeveloper && (
                    <span className="px-1.5 py-0.2 bg-amber-400 text-black font-black text-[9px] rounded font-mono">
                      DEV ACTIVE
                    </span>
                  )}
                </div>
                <span className="text-[9px] text-[#787770] block truncate">
                  {isAdminDeveloper
                    ? '已登录开发者账号 · 悬浮调试入口与控制中枢已开启'
                    : '登录开发者账号以后才会在界面显示悬浮调试入口'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span
                className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded font-mono border ${
                  isAdminDeveloper
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-neutral-200 text-neutral-700 border-neutral-300'
                }`}
              >
                {isAdminDeveloper ? '配置中枢 ⚡' : '登录开发者 🔑'}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-[#9ca3af] stroke-[2]" />
            </div>
          </button>
        </div>
      </div>

      {/* Section 3: Auth & Sign Out Actions */}
      <div className="mt-2 space-y-1.5">
        {isSignedOut ? (
          <button
            type="button"
            onClick={() => handleOpenAuth('sms')}
            className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            <LogIn className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>立即登录 / 注册新账号</span>
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => handleOpenAuth('presets')}
              className="py-1.5 px-2.5 bg-neutral-100 hover:bg-neutral-200 active:scale-[0.99] text-neutral-800 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-neutral-200"
            >
              <UserCheck className="w-3.5 h-3.5 stroke-[2] text-neutral-700" />
              <span>切换 / 注册新号</span>
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="py-1.5 px-2.5 bg-transparent hover:bg-red-50 active:scale-[0.99] text-red-600 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-red-200/60"
            >
              <LogOut className="w-3.5 h-3.5 stroke-[2.2] text-red-600" />
              <span>安全退出登录</span>
            </button>
          </div>
        )}
      </div>

      {/* Extra spacing at bottom */}
      <div className="h-4" />

      {/* Sub Modals */}
      {activeModal === 'payment' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 border border-[#e2e3e1] shadow-2xl relative animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#f0f0ed]">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-black" />
                <h4 className="font-bold text-sm text-black">支付方式管理</h4>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-6 h-6 rounded-full hover:bg-neutral-100 flex items-center justify-center text-[#787770]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-4 space-y-2.5 text-xs">
              <div className="p-3 rounded-xl border border-black bg-neutral-50 flex items-center justify-between">
                <div>
                  <span className="font-bold text-black block">微信支付 (WeChat Pay)</span>
                  <span className="text-[10px] text-[#787770]">默认快捷免密支付</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  已绑定
                </span>
              </div>
              <div className="p-3 rounded-xl border border-[#e2e3e1] flex items-center justify-between">
                <div>
                  <span className="font-bold text-black block">支付宝 (Alipay)</span>
                  <span className="text-[10px] text-[#787770]">花呗/余额宝安全支付</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  已绑定
                </span>
              </div>
            </div>
            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 bg-black text-white text-xs font-bold rounded-xl hover:bg-neutral-800"
            >
              确定
            </button>
          </div>
        </div>
      )}

      {activeModal === 'security' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 border border-[#e2e3e1] shadow-2xl relative animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#f0f0ed]">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-black" />
                <h4 className="font-bold text-sm text-black">隐私与安全中心</h4>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-6 h-6 rounded-full hover:bg-neutral-100 flex items-center justify-center text-[#787770]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-4 space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-[#f9f9f7] border border-[#e8e8e4]">
                <span className="font-bold text-black block">数据端到端加密保护</span>
                <span className="text-[10px] text-[#787770]">您的订单位置信息及支付凭证均受 TLS 1.3 银行级协议加密。</span>
              </div>
              <div className="p-3 rounded-xl bg-[#f9f9f7] border border-[#e8e8e4]">
                <span className="font-bold text-black block">匿名点单隐私模式</span>
                <span className="text-[10px] text-[#787770]">骑手仅获取脱敏虚拟电话与地址末段编号。</span>
              </div>
            </div>
            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 bg-black text-white text-xs font-bold rounded-xl hover:bg-neutral-800"
            >
              完成
            </button>
          </div>
        </div>
      )}

      {/* Unified User Auth & Registration Modal */}
      <UserAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        onLoginSuccess={(user) => {
          setIsSignedOut(false);
          if (onProfileUpdated) {
            onProfileUpdated(user);
          }
          showToast(`登录成功，欢迎 ${user.nickname}！`);
        }}
      />

      {/* User Coupons Management Center Modal */}
      <UserCouponsModal
        isOpen={isCouponsOpen}
        onClose={() => setIsCouponsOpen(false)}
        onGoToMenu={onGoToMenu}
        isVIPActive={isVIPActive}
      />
    </div>
  );
};
