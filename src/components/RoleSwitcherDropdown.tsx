import React, { useState, useRef, useEffect } from 'react';
import {
  Smartphone,
  House,
  Bike,
  ChevronDown,
  Check,
  ShieldCheck,
  Zap,
  Layers,
  SlidersHorizontal,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDevSimulation } from '../context/DevSimulationContext';

export type UserRole = 'customer' | 'merchant' | 'rider' | 'platform';

interface RoleSwitcherDropdownProps {
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  pendingOrdersCount?: number;
  riderTasksCount?: number;
}

const CARBON = '#1a1a17';

export const RoleSwitcherDropdown: React.FC<RoleSwitcherDropdownProps> = ({
  currentRole,
  onSelectRole,
  pendingOrdersCount = 6,
  riderTasksCount = 2
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { isAdminDeveloper, openDevAuthModal, openDevControlCenter } = useDevSimulation();

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Stitch 极简 Urban Radar 版角色配置：低饱和底色图标容器 + mono 徽标
  const rolesConfig = [
    {
      key: 'customer' as UserRole,
      title: '客户端',
      badge: '当前顾客端',
      desc: '智能餐车发现、选购点餐与实时配送追踪',
      icon: Smartphone,
      iconBox: 'bg-[#1a1a17] text-white',
      badgeStyle: 'bg-[#1a1a17] text-white'
    },
    {
      key: 'merchant' as UserRole,
      title: '商家端',
      badge: `${pendingOrdersCount}单待制作`,
      desc: '黑曜石01号店长工作台 · 实时接单出餐与库存管理',
      icon: House,
      iconBox: 'bg-[#faf4ec] text-[#b86200] border border-[#f0dfc8]',
      badgeStyle: 'bg-amber-50 text-amber-800 border border-amber-200/60'
    },
    {
      key: 'rider' as UserRole,
      title: '骑手端',
      badge: `${riderTasksCount}单待取送`,
      desc: '闪送骑士配送工作台 · 实时导航接单与配送交付',
      icon: Bike,
      iconBox: 'bg-[#edf7f1] text-[#1b7a47] border border-[#cbe9d7]',
      badgeStyle: 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
    },
    {
      key: 'platform' as UserRole,
      title: '平台总控端',
      badge: '全域运营中心',
      desc: '管理全部商家端口 · 订单抽佣设置 · 财务清算与SLA监控',
      icon: ShieldCheck,
      iconBox: 'bg-[#f1f1fe] text-[#4d47eb] border border-[#dadafd]',
      badgeStyle: 'bg-indigo-50 text-indigo-800 border border-indigo-200/60'
    }
  ];

  const currentRoleConfig = rolesConfig.find((r) => r.key === currentRole) || rolesConfig[0];
  const CurrentIcon = currentRoleConfig.icon;

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Dropdown Trigger Button (Icon Button without text) */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`relative h-8 px-1.5 sm:px-2 rounded-full border flex items-center justify-center gap-1 transition-all cursor-pointer select-none shadow-2xs group ${
          isOpen
            ? 'bg-[#1a1a17] text-white border-[#1a1a17] ring-2 ring-black/10'
            : 'bg-white text-[#1a1c1b] border-[#e2e3e1] hover:bg-[#f4f4f2] hover:border-neutral-400'
        }`}
        title={`切换视角 (当前: ${currentRoleConfig.title})`}
      >
        <div
          className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] transition-colors shadow-2xs ${
            isOpen ? 'bg-white text-[#1a1a17]' : currentRoleConfig.iconBox
          }`}
        >
          <CurrentIcon className="w-3 h-3" />
        </div>
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-white' : 'text-[#787770] group-hover:text-black'
          }`}
        />
        {/* Pending alerts indicator dot */}
        {currentRole === 'merchant' && pendingOrdersCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white animate-pulse" />
        )}
        {currentRole === 'rider' && riderTasksCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
        )}
      </motion.button>

      {/* Dropdown Menu — Stitch 极简 Urban Radar 版 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-[320px] sm:w-[340px] bg-white rounded-xl border border-neutral-300 shadow-[0_24px_48px_-12px_rgba(26,26,23,0.12),0_4px_12px_rgba(0,0,0,0.04)] overflow-hidden z-50 origin-top-right"
          >
            {/* Header Section */}
            <header className="px-4 pt-3 pb-3 border-b border-neutral-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#1a1a17] shrink-0" strokeWidth={2} />
                <h1 className="text-sm font-semibold tracking-tight text-[#1a1a17]">
                  端视角与工作台切换
                </h1>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-neutral-100 border border-neutral-200/70 text-[11px] font-mono font-medium text-neutral-600 tracking-tight">
                4 Roles / 全域
              </span>
            </header>

            {/* Role List Section */}
            <section className="p-3 space-y-2 bg-[#fbfbf9]/60">
              {rolesConfig.map((roleItem) => {
                const isSelected = roleItem.key === currentRole;
                const RoleIcon = roleItem.icon;

                return (
                  <motion.article
                    key={roleItem.key}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => {
                      onSelectRole(roleItem.key);
                      setIsOpen(false);
                    }}
                    className={`touch-interactive relative flex items-start gap-3 p-3 rounded-lg transition-all cursor-pointer ${
                      isSelected
                        ? 'border-2 border-[#1a1a17] bg-white shadow-[0_1px_2px_rgba(26,26,23,0.04)]'
                        : 'border border-neutral-200/90 bg-white hover:border-neutral-400 hover:bg-neutral-50/50'
                    }`}
                  >
                    {/* Icon Container (High-Contrast Solid) */}
                    <div
                      className={`w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${roleItem.iconBox}`}
                    >
                      <RoleIcon
                        className="w-5 h-5"
                        strokeWidth={1.75}
                      />
                    </div>

                    {/* Role Meta Info */}
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h2
                          className={`text-sm tracking-tight text-[#1a1a17] ${
                            isSelected ? 'font-bold' : 'font-semibold'
                          }`}
                        >
                          {roleItem.title}
                        </h2>
                        <span
                          className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] tracking-wider shrink-0 ${
                            isSelected
                              ? 'font-medium bg-[#1a1a17] text-white'
                              : 'font-mono font-medium ' + roleItem.badgeStyle
                          }`}
                        >
                          {roleItem.badge}
                        </span>
                      </div>
                      <p
                        className={`text-xs leading-snug ${
                          isSelected ? 'text-neutral-600 font-normal' : 'text-neutral-500 truncate'
                        }`}
                      >
                        {roleItem.desc}
                      </p>
                    </div>

                    {/* Selection Indicator */}
                    <div className="flex-shrink-0 self-center pl-1">
                      {isSelected ? (
                        <motion.div
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.14 }}
                          className="text-[#1a1a17]"
                        >
                          <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                            />
                          </svg>
                        </motion.div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-neutral-300 group-hover:border-neutral-400 bg-white transition-colors" />
                      )}
                    </div>
                  </motion.article>
                );
              })}
            </section>

            {/* Footer Status Section */}
            <footer className="px-4 py-3 bg-white border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500 select-none">
              <div className="flex items-center gap-1.5 text-neutral-600 font-medium">
                <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="currentColor" strokeWidth={0} />
                <span className="text-[11px] tracking-tight">多端数据双向实时联通</span>
              </div>
              {isAdminDeveloper ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    openDevControlCenter();
                  }}
                  className="flex items-center gap-1 text-[11px] text-amber-700 hover:text-amber-800 font-medium flex items-center gap-1 bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300/60 cursor-pointer transition-colors"
                  title="已授权：打开开发者模拟调试中枢"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-amber-500" />
                  <span>调试中枢</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    openDevAuthModal();
                  }}
                  className="flex items-center gap-1 text-[11px] text-neutral-500 hover:text-[#1a1a17] transition-colors cursor-pointer px-1 py-0.5 group"
                  title="登录开发者账号以解锁悬浮调试入口"
                >
                  <Lock className="w-3.5 h-3.5 text-neutral-400 group-hover:text-[#1a1a17] transition-colors" strokeWidth={2} />
                  <span className="font-normal">开发者登录</span>
                </button>
              )}
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
