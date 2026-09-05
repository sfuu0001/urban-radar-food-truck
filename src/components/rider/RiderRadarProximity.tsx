import React, { useState } from 'react';
import {
  Compass,
  Radio,
  MapPin,
  Navigation,
  Sparkles,
  Zap,
  CheckCircle2,
  Bike,
  Shield,
  Layers
} from 'lucide-react';
import { TruckInfo } from '../../types';

interface RiderRadarProximityProps {
  truck: TruckInfo;
  onNavigateToTruck: () => void;
  showToast: (msg: string) => void;
}

export const RiderRadarProximity: React.FC<RiderRadarProximityProps> = ({
  truck,
  onNavigateToTruck,
  showToast
}) => {
  const [radarZoom, setRadarZoom] = useState<'1km' | '3km' | '5km'>('1km');

  // Simulated nearby orders and heatmaps
  const nearbyDemandHotspots = [
    { name: '静安大悦城北座写字楼', distance: '180m', ordersWaiting: 4, demandLevel: '极高' },
    { name: '曲阜路金融大厦', distance: '320m', ordersWaiting: 2, demandLevel: '高' },
    { name: '河滨花园中区', distance: '450m', ordersWaiting: 3, demandLevel: '中' }
  ];

  return (
    <div className="space-y-3.5 text-xs">
      {/* 1. Top Proximity Radar Status */}
      <div className="bg-white p-3.5 rounded-[3px] border border-[#e6e6e4] flex items-center justify-between gap-3 flex-wrap shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[3px] bg-[#37352f] text-white flex items-center justify-center font-bold">
            <Radio className="w-4 h-4 text-[#fde047] animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-[#37352f]">流动餐车动态跟随雷达 (邻近驻点测距)</h4>
              <span className="text-[10px] font-mono bg-[#edf3ec] text-[#2b593f] border border-[#c4dcbc] px-1.5 py-0.2 rounded-[2px]">
                5G RTK 实时追踪中
              </span>
            </div>
            <p className="text-[11px] text-[#787774]">
              骑手驻点与移动厨房动态锚定 · 自动保持最佳接单半径
            </p>
          </div>
        </div>

        {/* Range Radius Switch */}
        <div className="flex bg-[#f1f1ef] p-0.5 rounded-[3px] border border-[#e6e6e4]">
          {['1km', '3km', '5km'].map((zm) => (
            <button
              key={zm}
              type="button"
              onClick={() => {
                setRadarZoom(zm as any);
                showToast(`已切换雷达扫描半径至 ${zm}`);
              }}
              className={`px-3 py-1 rounded-[2px] font-semibold text-xs transition-all cursor-pointer ${
                radarZoom === zm ? 'bg-white text-[#37352f] shadow-xs' : 'text-[#787774] hover:text-black'
              }`}
            >
              {zm} 扫描
            </button>
          ))}
        </div>
      </div>

      {/* 2. Visual Radar Simulation Stage */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Radar Graphic Visualizer */}
        <div className="md:col-span-2 bg-[#201f1d] rounded-[3px] p-5 text-white relative overflow-hidden flex flex-col justify-between shadow-xs min-h-[260px]">
          {/* Radar Circles Pattern */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <div className="w-64 h-64 border border-emerald-400 rounded-full animate-ping" />
            <div className="w-48 h-48 border border-white/40 rounded-full absolute" />
            <div className="w-32 h-32 border border-white/40 rounded-full absolute" />
            <div className="w-16 h-16 border border-white/40 rounded-full absolute" />
          </div>

          <div className="relative z-10 flex items-center justify-between">
            <span className="font-mono text-xs text-emerald-400 flex items-center gap-1.5 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>雷达扫描巡检运行中</span>
            </span>
            <span className="text-[10px] text-white/60 font-mono">扫描范围: {radarZoom}</span>
          </div>

          {/* Central Mobile Food Truck Marker */}
          <div className="relative z-10 my-6 text-center space-y-2">
            <div className="inline-flex flex-col items-center">
              <div className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-lg border-2 border-emerald-400">
                <Bike className="w-6 h-6 text-[#2b593f]" />
              </div>
              <div className="mt-2 bg-black/80 backdrop-blur-xs px-3 py-1 rounded-[3px] border border-white/20 text-center">
                <p className="font-bold text-xs text-white">{truck.name}</p>
                <p className="text-[10px] text-white/70">{truck.currentLocationName}</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between text-xs text-white/80 pt-2 border-t border-white/10">
            <span>餐车当前状态: <strong className="text-emerald-400 font-mono">停靠营业中</strong></span>
            <span>距您的当前物理位置: <strong className="text-white font-mono">220m (步行 3m)</strong></span>
          </div>
        </div>

        {/* Proximity Hotspots List */}
        <div className="bg-white p-3.5 rounded-[3px] border border-[#e6e6e4] space-y-3 shadow-2xs flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#efefed] pb-2">
              <h4 className="font-bold text-xs text-[#37352f] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#d9730d]" />
                <span>餐车辐射商圈热力点</span>
              </h4>
            </div>

            <div className="space-y-2">
              {nearbyDemandHotspots.map((h, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-[#fbfbfa] border border-[#e6e6e4] rounded-[3px] space-y-1 hover:border-[#37352f] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#37352f]">{h.name}</span>
                    <span className="font-mono text-[10px] text-[#2b593f] font-bold bg-[#edf3ec] px-1.5 py-0.2 rounded border border-[#c4dcbc]">
                      {h.ordersWaiting} 单待抢
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10.5px] text-[#787774]">
                    <span>直线距离: {h.distance}</span>
                    <span>需求强度: <strong className="text-[#d9730d]">{h.demandLevel}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onNavigateToTruck();
              showToast(`已开启高精骑行导航跟随至餐车！`);
            }}
            className="w-full py-2 bg-[#37352f] hover:bg-[#201f1d] text-white rounded-[3px] font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Navigation className="w-3.5 h-3.5 text-[#fde047]" />
            <span>一键导航跟随流动餐车</span>
          </button>
        </div>
      </div>
    </div>
  );
};
