import React, { useState, useEffect } from 'react';
import {
  Truck,
  MapPin,
  Radio,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Compass,
  Thermometer,
  Zap,
  BatteryCharging,
  Flame,
  Search,
  Sparkles,
  Sliders,
  Navigation,
  Check,
  RefreshCw,
  Clock,
  Bike
} from 'lucide-react';
import { TruckInfo } from '../../types';
import {
  getAllTruckConfigs,
  saveTruckConfig,
  getActiveTruckConfig,
  setActiveTruckId,
  TruckLocationConfig,
  PRESET_TRUCK_LOCATIONS
} from '../../utils/truckLocationEngine';

interface MerchantStallGPSProps {
  truck: TruckInfo;
  onUpdateLocation: (newLocation: string, radiusKm: number) => void;
  showToast: (msg: string) => void;
}

export const MerchantStallGPS: React.FC<MerchantStallGPSProps> = ({
  truck,
  onUpdateLocation,
  showToast
}) => {
  const [allTrucks, setAllTrucks] = useState<TruckLocationConfig[]>(() => getAllTruckConfigs());
  const [selectedTruckId, setSelectedTruckId] = useState<string>(() => getActiveTruckConfig().id);
  const currentTruckConfig = allTrucks.find((t) => t.id === selectedTruckId) || allTrucks[0];

  const [stallStatus, setStallStatus] = useState<'open' | 'transit' | 'closed'>('open');
  const [locationName, setLocationName] = useState(currentTruckConfig.locationName);
  const [fenceRadius, setFenceRadius] = useState<number>(currentTruckConfig.deliveryRadiusKm);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  useEffect(() => {
    const config = allTrucks.find((t) => t.id === selectedTruckId);
    if (config) {
      setLocationName(config.locationName);
      setFenceRadius(config.deliveryRadiusKm);
    }
  }, [selectedTruckId]);

  const handleTruckChange = (id: string) => {
    setSelectedTruckId(id);
    setActiveTruckId(id);
    const target = allTrucks.find((t) => t.id === id);
    if (target) {
      setLocationName(target.locationName);
      setFenceRadius(target.deliveryRadiusKm);
    }
  };

  const handleBroadcast = () => {
    setIsBroadcasting(true);
    setTimeout(() => {
      setIsBroadcasting(false);
      const updatedConfig: TruckLocationConfig = {
        ...currentTruckConfig,
        locationName,
        deliveryRadiusKm: fenceRadius,
        status: stallStatus
      };

      saveTruckConfig(updatedConfig);
      setAllTrucks(getAllTruckConfigs());
      onUpdateLocation(locationName, fenceRadius);
      showToast(`已成功保存【${currentTruckConfig.name}】自定义配送半径 ${fenceRadius.toFixed(1)} km 与停靠点！`);
    }, 500);
  };

  return (
    <div className="space-y-3.5 text-xs">
      {/* 0. Multi-Truck Selector Banner */}
      <div className="bg-white p-3 rounded-xl border border-[#e6e6e4] shadow-2xs">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
          <div className="flex items-center gap-1.5 font-bold text-xs text-[#37352f]">
            <Sliders className="w-3.5 h-3.5 text-emerald-700" />
            <span>选择配置餐车（多车独立配送范围）:</span>
          </div>
          <span className="text-[10px] text-[#787774]">每个餐车均可独立设置停靠位置与外卖配送公里数</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {allTrucks.map((t) => {
            const isCurrent = t.id === selectedTruckId;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTruckChange(t.id)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  isCurrent
                    ? 'border-black bg-neutral-50 ring-1.5 ring-black'
                    : 'border-[#e6e6e4] bg-white hover:bg-neutral-50'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-black">{t.name}</span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-neutral-100 text-neutral-600 font-mono">
                      {t.code}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#787770] truncate mt-0.5">{t.locationName}</p>
                  <span className="text-[10px] font-bold text-emerald-700 font-mono mt-0.5 block">
                    配送半径: {t.deliveryRadiusKm.toFixed(1)} km
                  </span>
                </div>
                {isCurrent && <Check className="w-4 h-4 text-black shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. Hardware & Telemetry Sensors */}
      <div className="bg-white p-3.5 rounded-xl border border-[#e6e6e4] space-y-3 shadow-2xs">
        <div className="flex items-center justify-between border-b border-[#efefed] pb-2 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#37352f] text-white flex items-center justify-center font-bold">
              <Truck className="w-4 h-4 text-[#fde047]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-[#37352f]">{currentTruckConfig.name}</h4>
                <span className="text-[10px] font-mono bg-[#edf3ec] text-[#2b593f] border border-[#c4dcbc] px-1.5 py-0.2 rounded">
                  RTK 高精车载终端
                </span>
              </div>
              <p className="text-[11px] text-[#787774]">特种移动厨房牌照: 沪A·E8892 · 5G 实时车路协同</p>
            </div>
          </div>

          {/* Operational Status Toggle */}
          <div className="flex bg-[#f1f1ef] p-0.5 rounded-lg border border-[#e6e6e4]">
            {[
              { id: 'open', label: '出摊营业中', color: 'bg-[#2b593f] text-white' },
              { id: 'transit', label: '转场巡游中', color: 'bg-[#d9730d] text-white' },
              { id: 'closed', label: '打烊休整', color: 'bg-[#37352f] text-white' }
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => {
                  setStallStatus(st.id as any);
                  showToast(`餐车营运状态已变更为: ${st.label}`);
                }}
                className={`px-3 py-1 rounded-md font-semibold text-xs transition-all cursor-pointer ${
                  stallStatus === st.id ? st.color : 'text-[#787774] hover:text-black'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Sensor Gauges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-[#fbfbfa] p-2.5 rounded-xl border border-[#e6e6e4] space-y-1">
            <span className="text-[10px] text-[#787774] flex items-center gap-1">
              <Thermometer className="w-3 h-3 text-[#2383e2]" />
              <span>冷藏生鲜仓温控</span>
            </span>
            <p className="font-mono font-bold text-sm text-[#2b593f]">-18.2 °C</p>
            <span className="text-[9.5px] text-[#4dab63] block">✓ 医用级冷链合格</span>
          </div>

          <div className="bg-[#fbfbfa] p-2.5 rounded-xl border border-[#e6e6e4] space-y-1">
            <span className="text-[10px] text-[#787774] flex items-center gap-1">
              <Flame className="w-3 h-3 text-[#eb5757]" />
              <span>炙烤主炉温控</span>
            </span>
            <p className="font-mono font-bold text-sm text-[#d9730d]">280 °C</p>
            <span className="text-[9.5px] text-[#d9730d] block">果木炭火炙烤中</span>
          </div>

          <div className="bg-[#fbfbfa] p-2.5 rounded-xl border border-[#e6e6e4] space-y-1">
            <span className="text-[10px] text-[#787774] flex items-center gap-1">
              <BatteryCharging className="w-3 h-3 text-[#4dab63]" />
              <span>车载储能与供电</span>
            </span>
            <p className="font-mono font-bold text-sm text-[#37352f]">88% (9.5h)</p>
            <span className="text-[9.5px] text-[#787774] block">太阳能辅助补充</span>
          </div>

          <div className="bg-[#fbfbfa] p-2.5 rounded-xl border border-[#e6e6e4] space-y-1">
            <span className="text-[10px] text-[#787774] flex items-center gap-1">
              <Compass className="w-3 h-3 text-emerald-700" />
              <span>设定配送辐射半径</span>
            </span>
            <p className="font-bold text-sm text-emerald-700">{fenceRadius.toFixed(1)} km</p>
            <span className="text-[9.5px] text-emerald-700 block">超出即触发客端引导</span>
          </div>
        </div>
      </div>

      {/* 2. GPS Broadcast & Delivery Range Slider Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Left: Radius Customizer & Broadcast */}
        <div className="bg-white p-3.5 rounded-xl border border-[#e6e6e4] space-y-3.5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-[#efefed] pb-2">
            <h4 className="font-bold text-sm text-[#37352f] flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-[#eb5757] animate-pulse" />
              <span>商家自定义每个餐车配送范围</span>
            </h4>
            <span className="text-[10px] text-[#787774]">客户端实时生效</span>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="font-semibold text-[#5a5854] block">餐车停靠点描述 (顾客端位置基准):</label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                className="w-full p-2 bg-[#f7f7f5] border border-[#d3d1cb] rounded-lg focus:outline-none focus:border-[#37352f] text-xs font-medium"
                placeholder="例如: 静安大悦城南广场 · 西藏北路曲阜路"
              />
            </div>

            {/* Custom Distance Slider */}
            <div className="space-y-2 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <div className="flex items-center justify-between">
                <label className="font-bold text-black text-xs flex items-center gap-1.5">
                  <Bike className="w-3.5 h-3.5 text-emerald-700" />
                  <span>外卖配送最大服务半径 (公里):</span>
                </label>
                <div className="flex items-baseline gap-1">
                  <input
                    type="number"
                    min="0.5"
                    max="15.0"
                    step="0.1"
                    value={fenceRadius}
                    onChange={(e) => setFenceRadius(Math.max(0.5, Math.min(15.0, parseFloat(e.target.value) || 1.0)))}
                    className="w-16 px-1.5 py-0.5 text-right font-mono font-black text-sm bg-white border border-neutral-300 rounded focus:border-black outline-none"
                  />
                  <span className="font-mono font-bold text-xs text-neutral-600">km</span>
                </div>
              </div>

              <input
                type="range"
                min="0.5"
                max="15.0"
                step="0.1"
                value={fenceRadius}
                onChange={(e) => setFenceRadius(parseFloat(e.target.value))}
                className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-black"
              />

              <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
                <span>0.5 km (社区极速)</span>
                <span>3.0 km (商圈标准)</span>
                <span>8.0 km</span>
                <span>15.0 km (全城专送)</span>
              </div>
            </div>

            {/* Quick Range Presets */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-neutral-600">常用配送圈快捷档位:</span>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: '1.0 km 极速', val: 1.0 },
                  { label: '2.0 km 核心', val: 2.0 },
                  { label: '3.0 km 标准', val: 3.0 },
                  { label: '5.0 km 宽域', val: 5.0 },
                  { label: '8.0 km 远距', val: 8.0 },
                  { label: '10.0 km 特送', val: 10.0 }
                ].map((rad) => (
                  <button
                    key={rad.val}
                    type="button"
                    onClick={() => setFenceRadius(rad.val)}
                    className={`py-1.5 rounded-lg font-bold border text-center cursor-pointer transition-all text-[11px] ${
                      Math.abs(fenceRadius - rad.val) < 0.05
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-neutral-800 border-neutral-300 hover:bg-neutral-100'
                    }`}
                  >
                    {rad.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Impact Calculation Preview */}
            <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-950 space-y-1">
              <div className="flex items-center justify-between font-bold">
                <span>配送圈预估覆盖效果:</span>
                <span className="text-emerald-800">约 {(Math.PI * fenceRadius * fenceRadius).toFixed(1)} km² 辐射面积</span>
              </div>
              <p className="text-[10.5px] text-emerald-800 leading-tight">
                预计送达时效: <span className="font-semibold">{Math.round(15 + fenceRadius * 4)} - {Math.round(22 + fenceRadius * 5)} 分钟</span> · 保温品质衰减控制优
              </p>
            </div>

            <button
              type="button"
              onClick={handleBroadcast}
              disabled={isBroadcasting}
              className="w-full py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs active:scale-98"
            >
              <Radio className="w-3.5 h-3.5 text-[#fde047]" />
              <span>{isBroadcasting ? '正在同步全网配置...' : `保存并广播【${currentTruckConfig.name}】外卖半径 (${fenceRadius.toFixed(1)}km)`}</span>
            </button>
          </div>
        </div>

        {/* Right: Commercial Preset Locations & Safety Checks */}
        <div className="space-y-3">
          {/* Preset Hotspots */}
          <div className="bg-white p-3.5 rounded-xl border border-[#e6e6e4] space-y-2.5 shadow-2xs">
            <h4 className="font-bold text-xs text-[#37352f] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#d9730d]" />
              <span>上海热门停靠商圈预设 (一键载入):</span>
            </h4>

            <div className="space-y-1.5">
              {PRESET_TRUCK_LOCATIONS.map((loc, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setLocationName(loc.locationName);
                    setFenceRadius(loc.defaultRadiusKm);
                    showToast(`已载入【${loc.locationName}】定位与推荐半径 ${loc.defaultRadiusKm}km`);
                  }}
                  className="p-2 bg-[#fbfbfa] hover:bg-[#efefed] border border-[#e6e6e4] rounded-lg cursor-pointer transition-all flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-[#37352f] truncate">{loc.locationName}</p>
                    <span className="text-[10px] text-[#787774] block">{loc.tag}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">
                      推荐 {loc.defaultRadiusKm}km
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Safety Compliance Checklist */}
          <div className="bg-white p-3 rounded-xl border border-[#e6e6e4] space-y-2 shadow-2xs">
            <h4 className="font-bold text-xs text-[#37352f] flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#4dab63]" />
              <span>出摊安全合规自检 (市食药监认证):</span>
            </h4>

            <div className="grid grid-cols-2 gap-1.5 text-[11px] text-[#2b593f]">
              <span className="bg-[#edf3ec] p-1.5 rounded flex items-center gap-1">✓ 发电机油量充足</span>
              <span className="bg-[#edf3ec] p-1.5 rounded flex items-center gap-1">✓ 冷链恒温合格</span>
              <span className="bg-[#edf3ec] p-1.5 rounded flex items-center gap-1">✓ 燃气管路密封安全</span>
              <span className="bg-[#edf3ec] p-1.5 rounded flex items-center gap-1">✓ 双级油烟消解开启</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
