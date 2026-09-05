import React, { useState } from 'react';
import {
  X,
  MapPin,
  Truck,
  Compass,
  AlertTriangle,
  CheckCircle2,
  ShoppingBag,
  ArrowRight,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Building2,
  Navigation
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  DeliveryRangeEvaluation,
  TruckLocationConfig,
  getAllTruckConfigs,
  setActiveTruckId,
  saveUserLocationState
} from '../utils/truckLocationEngine';

interface DeliveryRangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  evaluation: DeliveryRangeEvaluation;
  activeTruck: TruckLocationConfig;
  onSwitchToPickup: () => void;
  onChangeAddress: () => void;
  onSelectTruck?: (truckId: string) => void;
  onRefreshGPS?: () => void;
  isLocatingGPS?: boolean;
}

export const DeliveryRangeModal: React.FC<DeliveryRangeModalProps> = ({
  isOpen,
  onClose,
  evaluation,
  activeTruck,
  onSwitchToPickup,
  onChangeAddress,
  onSelectTruck,
  onRefreshGPS,
  isLocatingGPS = false
}) => {
  const [allTrucks, setAllTrucks] = useState<TruckLocationConfig[]>(() => getAllTruckConfigs());

  if (!isOpen) return null;

  const isOutOfRange = evaluation.isOutOfRange;

  const handleSelectAnotherTruck = (truckId: string) => {
    setActiveTruckId(truckId);
    if (onSelectTruck) onSelectTruck(truckId);
    setAllTrucks(getAllTruckConfigs());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-[#e2e3e1] flex flex-col overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#e2e3e1] bg-[#f9f9f7] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white ${
              isOutOfRange ? 'bg-amber-500' : 'bg-emerald-600'
            }`}>
              {isOutOfRange ? <AlertTriangle className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-black">餐车地理位置与配送范围诊断</h3>
              <p className="text-[11px] text-[#787770]">基于高精度 GPS 经纬度与商家设定电子围栏</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white border border-[#e2e3e1] hover:bg-neutral-100 text-black flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto hide-scrollbar text-xs">
          {/* 1. Interactive Visual Radar Distance SVG */}
          <div className="bg-[#1e201f] text-white rounded-xl p-3.5 relative overflow-hidden shadow-inner border border-neutral-800">
            {/* SVG Radar Scheme */}
            <div className="relative h-44 w-full flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 360 180" xmlns="http://www.w3.org/2000/svg">
                {/* Radar Grid Circles */}
                <circle cx="180" cy="90" r="80" fill="none" stroke="rgba(255,255,255,0.08)" strokeDasharray="3,3" />
                <circle cx="180" cy="90" r="55" fill="none" stroke="rgba(255,255,255,0.12)" />
                <circle cx="180" cy="90" r="30" fill="none" stroke="rgba(255,255,255,0.15)" />

                {/* Delivery Fence Radius Circle (Cyan/Emerald/Amber) */}
                <circle
                  cx="180"
                  cy="90"
                  r={Math.min(75, Math.max(35, (evaluation.radiusKm / 5) * 60))}
                  fill={isOutOfRange ? "rgba(245, 158, 11, 0.08)" : "rgba(16, 185, 129, 0.12)"}
                  stroke={isOutOfRange ? "#f59e0b" : "#10b981"}
                  strokeWidth="1.5"
                  strokeDasharray="4,4"
                />

                {/* Center Truck Coordinate */}
                <g transform="translate(180, 90)">
                  <circle r="12" fill="#181816" stroke="#fde047" strokeWidth="2" />
                  <circle r="18" fill="none" stroke="#fde047" strokeWidth="0.8" opacity="0.4" className="animate-ping" />
                  <text y="4" textAnchor="middle" fill="#fde047" fontSize="9" fontWeight="bold">🚚</text>
                </g>

                {/* Distance Connector Line */}
                <line
                  x1="180"
                  y1="90"
                  x2={isOutOfRange ? "295" : "240"}
                  y2={isOutOfRange ? "40" : "65"}
                  stroke={isOutOfRange ? "#ef4444" : "#10b981"}
                  strokeWidth="2"
                  strokeDasharray={isOutOfRange ? "3,3" : "none"}
                />

                {/* Target Address Node */}
                <g transform={isOutOfRange ? "translate(295, 40)" : "translate(240, 65)"}>
                  <circle r="10" fill={isOutOfRange ? "#ef4444" : "#10b981"} stroke="#ffffff" strokeWidth="1.5" />
                  <text y="3" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">📍</text>
                </g>
              </svg>

              {/* Float telemetry tags */}
              <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs px-2 py-1 rounded border border-white/10 text-[10px] space-y-0.5">
                <p className="text-neutral-400">餐车停靠点: <span className="text-amber-300 font-semibold">{activeTruck.locationName}</span></p>
                <p className="text-neutral-400">商家设定围栏: <span className="text-white font-bold">{evaluation.radiusKm.toFixed(1)} km</span></p>
              </div>

              <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-xs px-2 py-1 rounded border border-white/10 text-[10px] text-right space-y-0.5">
                <p className="text-neutral-400">送达目标距离: <span className={`font-mono font-bold ${isOutOfRange ? 'text-rose-400' : 'text-emerald-400'}`}>{evaluation.distanceKm.toFixed(2)} km</span></p>
                <p className={isOutOfRange ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                  {isOutOfRange ? `⚠️ 超出 ${evaluation.exceededKm.toFixed(2)} km` : "✓ 专送范围内"}
                </p>
              </div>
            </div>
          </div>

          {/* 2. Detailed Diagnostic Text */}
          <div className={`p-3 rounded-xl border ${
            isOutOfRange
              ? 'bg-amber-50/80 border-amber-200 text-amber-950'
              : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
          }`}>
            <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
              {isOutOfRange ? <AlertTriangle className="w-3.5 h-3.5 text-amber-700" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />}
              <span>{isOutOfRange ? '配送距离超限诊断报告' : '配送距离状态合格'}</span>
            </div>
            <p className="leading-relaxed text-[11.5px]">
              {evaluation.reason}
            </p>
          </div>

          {/* 3. Recommended Actions Guide */}
          <div className="space-y-2">
            <h4 className="font-bold text-xs text-black flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-emerald-700" />
              <span>智能引导建议与操作：</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Option A: Switch to Pickup */}
              <button
                type="button"
                onClick={() => {
                  onSwitchToPickup();
                  onClose();
                }}
                className="p-3 rounded-xl border border-[#e2e3e1] bg-[#f9f9f7] hover:bg-black hover:text-white transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold flex items-center gap-1 text-xs">
                    <ShoppingBag className="w-3.5 h-3.5 text-emerald-600 group-hover:text-emerald-400" />
                    <span>改用【到车自提】</span>
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 group-hover:bg-emerald-900 group-hover:text-emerald-200 font-semibold">
                    免运费
                  </span>
                </div>
                <p className="text-[10px] text-[#787770] group-hover:text-neutral-300">
                  无需受外卖配送距离限制，现场炭火现烤即拿即走
                </p>
              </button>

              {/* Option B: Change Delivery Address */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onChangeAddress();
                }}
                className="p-3 rounded-xl border border-[#e2e3e1] bg-[#f9f9f7] hover:bg-neutral-100 transition-all text-left cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold flex items-center gap-1 text-xs text-black">
                    <MapPin className="w-3.5 h-3.5 text-amber-600" />
                    <span>选择【范围内常用地址】</span>
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-neutral-200 text-neutral-800 font-semibold">
                    快捷切换
                  </span>
                </div>
                <p className="text-[10px] text-[#787770]">
                  如大悦城商务座(0.65km)、静安大悦城北座(0.9km)等
                </p>
              </button>
            </div>
          </div>

          {/* 4. Switch to Another Nearby Food Truck */}
          <div className="space-y-2 pt-2 border-t border-[#f0f0ee]">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-black flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-black" />
                <span>切换至附近其他流动餐车：</span>
              </h4>
              <span className="text-[10px] text-[#787770]">共 {allTrucks.length} 辆巡游中</span>
            </div>

            <div className="space-y-1.5">
              {allTrucks.map((t) => {
                const isCurrent = t.id === activeTruck.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelectAnotherTruck(t.id)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isCurrent
                        ? 'border-black bg-neutral-50 ring-1 ring-black'
                        : 'border-[#e2e3e1] bg-white hover:bg-[#f9f9f7]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-black">{t.name}</span>
                        {isCurrent && (
                          <span className="text-[9px] bg-black text-white px-1.5 py-0.2 rounded font-semibold">
                            当前点单中
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#787770] truncate mt-0.5">{t.locationName}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 block">
                        配送半径 {t.deliveryRadiusKm.toFixed(1)} km
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#f9f9f7] border-t border-[#e2e3e1] flex items-center justify-between">
          {onRefreshGPS && (
            <button
              type="button"
              onClick={onRefreshGPS}
              disabled={isLocatingGPS}
              className="px-3 py-1.5 rounded-lg border border-[#d3d1cb] bg-white hover:bg-neutral-100 text-xs font-semibold text-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLocatingGPS ? 'animate-spin' : ''}`} />
              <span>重新 GPS 定位</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="ml-auto px-4 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-xl font-bold text-xs cursor-pointer shadow-xs"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
};
