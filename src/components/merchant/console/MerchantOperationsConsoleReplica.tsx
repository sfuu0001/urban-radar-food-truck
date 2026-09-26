import React, { useState, useEffect } from 'react';
import { Order, TableItem } from '../../../types';
import { DesktopOperationsConsole } from './desktop/DesktopOperationsConsole';
import { MobileOperationsConsolePlaceholder } from './mobile/MobileOperationsConsolePlaceholder';
import { Monitor, Smartphone } from 'lucide-react';

interface MerchantOperationsConsoleReplicaProps {
  orders?: Order[];
  tables?: TableItem[];
  selectedTruckId?: string;
  onSelectTruckId?: (truckId: string) => void;
  showToast?: (msg: string, isSuccess?: boolean) => void;
  onSwitchToClassic?: () => void;
}

export const MerchantOperationsConsoleReplica: React.FC<MerchantOperationsConsoleReplicaProps> = ({
  orders,
  tables,
  selectedTruckId,
  onSelectTruckId,
  showToast,
  onSwitchToClassic
}) => {
  // Screen width detection (< 768px -> mobile port)
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  // Manual override for debugging or forced desktop inspection
  const [forcedPort, setForcedPort] = useState<'auto' | 'desktop' | 'mobile'>('auto');

  useEffect(() => {
    const handleResize = () => {
      setIsMobileViewport(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isRenderingMobile = forcedPort === 'mobile' || (forcedPort === 'auto' && isMobileViewport);

  return (
    <div className="w-full space-y-2 font-sans select-none">
      {/* Top Device Port Isolation Switcher Bar */}
      <div className="flex items-center justify-between px-1 py-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-[#1a1c1c] tracking-tight">
            全渠道订单中心 (全新工业副本)
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-[2px] bg-[#006494]/10 text-[#006494] border border-[#006494]/20">
            REPLICA v2.0
          </span>
        </div>

        {/* Port Simulator Switcher */}
        <div className="flex items-center gap-1 bg-[#f3f3f4] p-0.5 rounded-[3px] border border-[#c4c7c8]">
          <button
            type="button"
            onClick={() => setForcedPort('desktop')}
            className={`px-2 py-0.5 rounded-[2px] flex items-center gap-1 text-[11px] font-semibold transition cursor-pointer ${
              !isRenderingMobile
                ? 'bg-white text-[#006494] font-bold shadow-2xs'
                : 'text-[#444748] hover:text-[#1a1c1c]'
            }`}
            title="强制激活电脑端 12 栅格 4 栏矩阵视口"
          >
            <Monitor className="w-3 h-3" />
            <span>电脑端</span>
          </button>

          <button
            type="button"
            onClick={() => setForcedPort('mobile')}
            className={`px-2 py-0.5 rounded-[2px] flex items-center gap-1 text-[11px] font-semibold transition cursor-pointer ${
              isRenderingMobile
                ? 'bg-white text-[#006494] font-bold shadow-2xs'
                : 'text-[#444748] hover:text-[#1a1c1c]'
            }`}
            title="强制激活手机端隔离占位符视口"
          >
            <Smartphone className="w-3 h-3" />
            <span>手机端 (占位)</span>
          </button>

          {forcedPort !== 'auto' && (
            <button
              type="button"
              onClick={() => setForcedPort('auto')}
              className="px-1.5 py-0.5 text-[10px] text-[#747878] hover:text-[#1a1c1c] transition"
              title="恢复跟随视口自动探测"
            >
              [自动]
            </button>
          )}
        </div>
      </div>

      {/* Conditional Port View (Strict Device Isolation) */}
      {isRenderingMobile ? (
        <MobileOperationsConsolePlaceholder
          onForceDesktopPreview={() => setForcedPort('desktop')}
          onSwitchToClassic={onSwitchToClassic}
        />
      ) : (
        <DesktopOperationsConsole
          orders={orders}
          tables={tables}
          selectedTruckId={selectedTruckId}
          onSelectTruckId={onSelectTruckId}
          showToast={showToast}
          onSwitchToClassic={onSwitchToClassic}
        />
      )}
    </div>
  );
};
