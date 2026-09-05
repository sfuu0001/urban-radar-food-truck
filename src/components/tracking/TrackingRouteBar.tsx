import React from 'react';
import { Store, MapPin } from 'lucide-react';

interface TrackingRouteBarProps {
  truckName?: string;
  distanceKm?: number;
  destinationAddress?: string;
}

export const TrackingRouteBar: React.FC<TrackingRouteBarProps> = ({
  truckName = '黑曜石 01 号流动餐车',
  distanceKm = 0.85,
  destinationAddress = '西藏北路 166 号大悦城商务座 1204 室'
}) => {
  return (
    <div className="px-4 py-3 bg-white border-b border-[#ededeb] flex items-center justify-between gap-2 text-xs">
      {/* Left: Food Truck */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <Store className="w-4 h-4 text-black shrink-0" />
        <div className="font-bold text-black text-[12.5px] truncate">
          {truckName}
        </div>
      </div>

      {/* Middle Badge: Distance Arrow */}
      <div className="bg-[#f0f0ee] text-[#444] text-[11px] font-bold px-2.5 py-1 flex items-center gap-1 font-mono shrink-0 rounded-md">
        <span>直线 {distanceKm} km</span>
        <span>→</span>
      </div>

      {/* Right: Destination Address */}
      <div className="flex items-center gap-1 min-w-0 flex-1 justify-end text-right">
        <MapPin className="w-3.5 h-3.5 text-rose-500 fill-rose-500 shrink-0" />
        <div className="font-medium text-[#222] text-[12px] truncate text-right">
          {destinationAddress}
        </div>
      </div>
    </div>
  );
};
