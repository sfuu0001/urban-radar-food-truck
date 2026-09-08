import React, { useState, useEffect } from 'react';
import {
  Building2,
  Crown,
  Lock,
  ChevronDown,
  ShieldCheck,
  Truck,
  ArrowRight,
  SlidersHorizontal,
  AlertCircle
} from 'lucide-react';
import {
  globalFranchiseEngine,
  FRANCHISE_TENANT_EVENT,
  FRANCHISE_POLICY_EVENT
} from '../../utils/franchiseTenantEngine';
import { FranchiseTenantContext, FranchiseDishPolicy } from '../../types/franchise';

interface FranchiseTenantBarProps {
  selectedTruckId: string;
  onSelectTruck: (truckId: string) => void;
  onOpenHQModal: () => void;
  truckConfigs: { truckId: string; truckName: string }[];
}

export const FranchiseTenantBar: React.FC<FranchiseTenantBarProps> = ({
  selectedTruckId,
  onSelectTruck,
  onOpenHQModal,
  truckConfigs
}) => {
  const [context, setContext] = useState<FranchiseTenantContext>(() => globalFranchiseEngine.getContext());
  const [policies, setPolicies] = useState<FranchiseDishPolicy[]>(() => globalFranchiseEngine.getPolicies());

  useEffect(() => {
    const handleTenant = (e: Event) => {
      const custom = e as CustomEvent<FranchiseTenantContext>;
      if (custom.detail) setContext(custom.detail);
      else setContext(globalFranchiseEngine.getContext());
    };
    const handlePolicy = (e: Event) => {
      const custom = e as CustomEvent<FranchiseDishPolicy[]>;
      if (custom.detail) setPolicies(custom.detail);
      else setPolicies(globalFranchiseEngine.getPolicies());
    };

    window.addEventListener(FRANCHISE_TENANT_EVENT, handleTenant);
    window.addEventListener(FRANCHISE_POLICY_EVENT, handlePolicy);
    return () => {
      window.removeEventListener(FRANCHISE_TENANT_EVENT, handleTenant);
      window.removeEventListener(FRANCHISE_POLICY_EVENT, handlePolicy);
    };
  }, []);

  const lockedCount = policies.filter((p) => p.isHqLocked).length;

  // Filter truckConfigs to only those accessible by current tenant
  const accessibleTrucks = truckConfigs.filter((t) => context.accessibleTruckIds.includes(t.truckId));

  return (
    <div
      className={`px-3 py-1.5 border-b text-xs flex flex-wrap items-center justify-between gap-2 transition-colors ${
        context.isHqUser
          ? 'bg-amber-950/90 text-amber-100 border-amber-800'
          : 'bg-slate-900 text-slate-100 border-slate-800'
      }`}
    >
      {/* Left: Role & Sandbox Status */}
      <div className="flex items-center gap-2 flex-wrap">
        <div
          className={`flex items-center gap-1.5 px-2 py-0.5 font-bold text-[11px] border ${
            context.isHqUser
              ? 'bg-amber-500 text-slate-950 border-amber-300'
              : 'bg-emerald-600 text-white border-emerald-400'
          }`}
        >
          {context.isHqUser ? <Crown className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
          <span>{context.isHqUser ? '品牌总部 (HQ Super Admin)' : '特许加盟商沙箱'}</span>
        </div>

        <span className="font-semibold text-slate-200">
          {context.operatorName}
        </span>

        <span className="text-slate-500 hidden sm:inline">|</span>

        <div className="flex items-center gap-1 text-[11px] text-slate-300">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden md:inline">数据沙箱已隔离 ·</span>
          <span>授权管辖: </span>
          <span className="font-mono font-bold text-amber-300">
            {context.accessibleTruckIds.join('、')}
          </span>
        </div>
      </div>

      {/* Right: Truck Scoping & HQ Portal CTA */}
      <div className="flex items-center gap-2">
        {/* Scoped Truck Selector */}
        <div className="flex items-center gap-1 bg-black/40 px-2 py-1 border border-white/10">
          <Truck className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[11px] text-slate-400 hidden sm:inline">作用餐车:</span>
          <select
            value={selectedTruckId}
            onChange={(e) => {
              const newTruckId = e.target.value;
              globalFranchiseEngine.switchTruck(newTruckId);
              onSelectTruck(newTruckId);
            }}
            className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
          >
            {accessibleTrucks.map((t) => (
              <option key={t.truckId} value={t.truckId} className="bg-slate-900 text-white">
                {t.truckName.split(' ')[0]} ({t.truckId})
              </option>
            ))}
          </select>
        </div>

        {/* Locked Menu Policy Pill */}
        <button
          type="button"
          onClick={onOpenHQModal}
          className="flex items-center gap-1 px-2 py-1 bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white border border-white/20 font-medium text-[11px] transition-colors cursor-pointer"
          title="点击打开特许加盟管理与核心爆品锁定中枢"
        >
          <Lock className="w-3 h-3 text-amber-400" />
          <span>爆品锁死: {lockedCount}款</span>
          <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 font-bold text-[10px] ml-0.5">
            HQ中枢
          </span>
        </button>
      </div>
    </div>
  );
};
