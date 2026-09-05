import React, { useState, useEffect } from 'react';
import { Clock, Zap, Maximize2, Minimize2, Navigation, Compass, Target, Play, RotateCcw, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDevSimulation } from '../../context/DevSimulationContext';
import { SimulationProbe } from '../dev/SimulationProbe';

interface TrackingRadarMapProps {
  initialSpeed?: number;
  initialDistanceMeters?: number;
  destinationLabel?: string;
  truckName?: string;
  onSimulate?: () => void;
  isSimulating?: boolean;
}

export const TrackingRadarMap: React.FC<TrackingRadarMapProps> = ({
  initialSpeed = 24,
  initialDistanceMeters = 37,
  destinationLabel = '大悦城商务座',
  truckName = '流动餐车',
  onSimulate,
  isSimulating = false
}) => {
  const { isSimulationAllowed } = useDevSimulation();
  const [speed, setSpeed] = useState(initialSpeed);
  const [distanceMeters, setDistanceMeters] = useState(initialDistanceMeters);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [routeProgress, setRouteProgress] = useState(88); // 88% completed by default
  const [autoTour, setAutoTour] = useState(false);

  // Live GPS telemetry simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setSpeed((prev) => {
        const delta = Math.floor(Math.random() * 5) - 2;
        return Math.max(18, Math.min(32, prev + delta));
      });
      setDistanceMeters((prev) => (prev > 10 ? prev - 1 : 37));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Automated full route progress tour if enabled
  useEffect(() => {
    if (!autoTour) return;
    const tourInterval = setInterval(() => {
      setRouteProgress((prev) => {
        if (prev >= 100) {
          setAutoTour(false);
          return 100;
        }
        return prev + 2;
      });
    }, 400);
    return () => clearInterval(tourInterval);
  }, [autoTour]);

  const handleStepSimulation = () => {
    if (onSimulate) onSimulate();
    setRouteProgress((prev) => (prev >= 100 ? 20 : Math.min(100, prev + 15)));
    setDistanceMeters((prev) => Math.max(5, Math.floor(prev * 0.6)));
  };

  const handleResetRoute = () => {
    setRouteProgress(25);
    setDistanceMeters(850);
    setAutoTour(true);
  };

  // Full Connected Route Polyline Coordinates (viewBox 0 0 420 220)
  // Starts at Truck (58, 168), passes through streets, ends directly at Destination (368, 55)
  const fullRoutePathD = "M 58 168 L 110 168 L 110 98 L 270 98 L 270 142 L 332 142 L 368 55";

  return (
    <div className="overflow-hidden bg-[#f4f5f1] border-y border-[#ededeb] relative">
      <motion.div
        animate={{ height: isMapExpanded ? 310 : 225 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="w-full relative overflow-hidden bg-[#f4f5f1]"
      >
        {/* Map Road Grid & Street Labels */}
        <div className="absolute inset-0 select-none pointer-events-none">
          <svg className="w-full h-full opacity-60" viewBox="0 0 420 220" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="street-grid-embedded-modular" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#dcded8" strokeWidth="0.8" />
              </pattern>
              {/* Linear gradient for completed route trail */}
              <linearGradient id="route-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="60%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#2563eb" />
              </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#street-grid-embedded-modular)" />

            {/* City Blocks Simulation */}
            <rect x="20" y="25" width="70" height="55" rx="3" fill="#e8eae3" />
            <rect x="130" y="25" width="120" height="55" rx="3" fill="#e8eae3" />
            <rect x="290" y="25" width="60" height="55" rx="3" fill="#e8eae3" />
            <rect x="20" y="115" width="70" height="35" rx="3" fill="#e8eae3" />
            <rect x="130" y="115" width="120" height="85" rx="3" fill="#e8eae3" />
            <rect x="290" y="160" width="105" height="40" rx="3" fill="#e8eae3" />

            {/* Street Routes (White Underlay) */}
            <path d="M 0 168 L 420 168" fill="none" stroke="#ffffff" strokeWidth="12" />
            <path d="M 0 98 L 420 98" fill="none" stroke="#ffffff" strokeWidth="12" />
            <path d="M 110 0 L 110 220" fill="none" stroke="#ffffff" strokeWidth="11" />
            <path d="M 270 0 L 270 220" fill="none" stroke="#ffffff" strokeWidth="11" />
            <path d="M 332 98 L 332 220" fill="none" stroke="#ffffff" strokeWidth="9" />

            {/* Complete Delivery Route Polyline Background Track */}
            <path
              d={fullRoutePathD}
              fill="none"
              stroke="#ffffff"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Complete Delivery Route Polyline Base Color */}
            <path
              d={fullRoutePathD}
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="6 4"
            />

            {/* Complete Active Delivery Route (Animated Stream Glow) */}
            <path
              d={fullRoutePathD}
              fill="none"
              stroke="url(#route-gradient)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Animated Pulses along the line */}
            <path
              d={fullRoutePathD}
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="12 18"
              className="animate-pulse"
            />
          </svg>

          {/* Street Names with refined subtle typography */}
          <span className="absolute top-7 left-6 text-[9px] text-[#9ba1aa] font-sans font-medium">
            海宁路 / 恒丰路
          </span>
          <span className="absolute top-7 left-32 text-[9px] text-[#9ba1aa] font-sans font-medium">
            曲阜路主干道
          </span>
          <span className="absolute bottom-16 left-32 text-[9px] text-[#9ba1aa] font-sans font-medium">
            静安大悦城商业广场
          </span>
          <span className="absolute bottom-5 right-12 text-[9px] text-[#9ba1aa] font-sans font-medium">
            西藏北路 / 蒙古路
          </span>
        </div>

        {/* Streamlined Top Telemetry Bar */}
        <div className="absolute top-2 inset-x-2.5 flex items-center justify-between pointer-events-none z-20">
          {/* Left: Compact Est ETA Chip */}
          <div className="bg-[#181816]/90 backdrop-blur-xs text-white text-[10.5px] font-bold px-2.5 py-1 flex items-center gap-1.5 shadow-2xs rounded-lg pointer-events-auto">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>{routeProgress >= 100 ? '已顺利送达' : 'Est. 1-2 mins'}</span>
          </div>

          {/* Right: Consolidated Streamlined Radar Status */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <div className="bg-white/95 backdrop-blur-xs text-[#222] text-[10.5px] font-bold px-2 py-1 border border-[#e2e2dc] shadow-2xs flex items-center gap-1.2 rounded-lg">
              <motion.span
                animate={{ opacity: [1, 0.2, 1], scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
                className="w-1.5 h-1.5 rounded-full bg-[#10b981]"
              />
              <span>{routeProgress >= 100 ? '0m 妥投' : `剩余约 ${distanceMeters}m`}</span>
            </div>

            <div className="bg-[#181816]/90 backdrop-blur-xs text-white text-[10.5px] font-bold px-2 py-1 shadow-2xs flex items-center gap-1 rounded-lg">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                className="relative flex items-center justify-center"
              >
                <Target className="w-3 h-3 text-emerald-400 stroke-[2.2]" />
              </motion.div>
              <span>{routeProgress >= 100 ? '已达' : '追踪中'}</span>
            </div>
          </div>
        </div>

        {/* Node 1: Food Truck Indicator Pin on Map (Start Point) */}
        <div className="absolute left-6 bottom-9 flex flex-col items-center z-10">
          <div className="bg-[#181816] text-white text-[10px] font-bold px-2 py-0.5 shadow-sm flex items-center gap-1 rounded-md mb-0.5 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>起点: {truckName}</span>
          </div>

          <div className="relative flex items-center justify-center">
            {/* Ripple Wave 1 */}
            <motion.div
              animate={{ scale: [1, 2.6], opacity: [0.7, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeOut' }}
              className="absolute w-6 h-6 rounded-full border-2 border-amber-400/80 pointer-events-none"
            />
            {/* Ripple Wave 2 */}
            <motion.div
              animate={{ scale: [1, 2.2], opacity: [0.5, 0] }}
              transition={{ repeat: Infinity, duration: 2, delay: 0.7, ease: 'easeOut' }}
              className="absolute w-6 h-6 rounded-full bg-amber-400/30 pointer-events-none"
            />
            {/* Center Truck Point */}
            <div className="w-4 h-4 rounded-full bg-[#181816] border-2 border-white flex items-center justify-center shadow-md relative z-10">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            </div>
          </div>
        </div>

        {/* Node 2: Mid-Route Waypoint Anchor (曲阜路枢纽中转) */}
        <div className="absolute left-[64%] top-[42%] flex items-center justify-center z-10 pointer-events-none">
          {/* Concentric expanding ripples */}
          <motion.div
            animate={{ scale: [1, 2.2], opacity: [0.7, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeOut' }}
            className="absolute w-5 h-5 rounded-full border-2 border-blue-500 pointer-events-none"
          />
          {/* Waypoint center ring */}
          <div className="w-3 h-3 rounded-full bg-white border-2 border-blue-500 flex items-center justify-center shadow-xs">
            <span className="w-1 h-1 rounded-full bg-blue-500" />
          </div>
        </div>

        {/* Node 3: Mid-Route Target Anchor Node (南广场转角) */}
        <div className="absolute left-[78%] bottom-[32%] flex items-center justify-center z-10 pointer-events-none">
          {/* Concentric expanding ripples */}
          <motion.div
            animate={{ scale: [1, 2.4], opacity: [0.8, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeOut' }}
            className="absolute w-5 h-5 rounded-full border-2 border-orange-500 pointer-events-none"
          />
          {/* Orange Target Center Ring */}
          <div className="w-3.5 h-3.5 rounded-full bg-white border-2 border-orange-500 flex items-center justify-center shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
          </div>
        </div>

        {/* Node 4: Streamlined Destination Point & Rider Marker (End Point) */}
        <div className="absolute right-6 top-8 flex flex-col items-end z-10">
          <div className="flex items-center gap-1.5 relative">
            <div className="bg-[#181816]/95 backdrop-blur-xs text-white text-[9.5px] font-bold px-2 py-0.5 shadow-sm rounded-md whitespace-nowrap flex items-center gap-1.5 border border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span>终点: {destinationLabel}</span>
              <span className="text-blue-300 font-mono text-[9px] bg-blue-950/80 px-1 py-0.2 rounded border border-blue-400/20">
                {routeProgress}%
              </span>
            </div>

            {/* Navigation Arrow with Multi-layer Pulsing Ripples */}
            <div className="relative flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 2.2], opacity: [0.7, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeOut' }}
                className="absolute w-5 h-5 rounded-full border-2 border-blue-500 pointer-events-none"
              />
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
                className="w-5.5 h-5.5 rounded-full bg-[#2563eb] text-white flex items-center justify-center shadow-md border-2 border-white relative z-10"
              >
                <Navigation className="w-2.5 h-2.5 fill-white rotate-45" />
              </motion.div>
            </div>
          </div>
        </div>

        {/* Bottom-Left Floating Stats & Simulation Controls */}
        <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5 z-20 flex-wrap">
          <div className="bg-white text-black text-[11px] font-bold px-2.5 py-1 border border-[#e5e5e0] shadow-xs flex items-center gap-1 rounded-xl">
            <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
            <span>{speed} km/h</span>
          </div>
          <div className="bg-white text-black text-[11px] font-bold px-2.5 py-1 border border-[#e5e5e0] shadow-xs flex items-center gap-1 rounded-xl">
            <Target className="w-3 h-3 text-neutral-600" />
            <span>距目的地 {distanceMeters}m</span>
          </div>

          {/* Admin Developer Only Simulation Controls */}
          {isSimulationAllowed && (
            <SimulationProbe pointId="SIM_RADAR_CRUISE_TRACK" className="inline-flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleStepSimulation}
                className="bg-white hover:bg-neutral-50 active:scale-95 text-[#333] text-[11px] font-bold px-2.5 py-1 border border-[#e5e5e0] shadow-xs cursor-pointer transition-all rounded-xl flex items-center gap-1"
              >
                <Play className="w-3 h-3 text-blue-600 fill-blue-600" />
                <span>{isSimulating ? '模拟巡航中...' : '单步模拟 (+15%)'}</span>
              </button>

              <button
                type="button"
                onClick={handleResetRoute}
                className="bg-white hover:bg-neutral-50 active:scale-95 text-[#555] text-[11px] font-semibold px-2 py-1 border border-[#e5e5e0] shadow-xs cursor-pointer transition-all rounded-xl flex items-center gap-0.5"
                title="重播完整模拟线路"
              >
                <RotateCcw className="w-3 h-3" />
                <span>巡航演示</span>
              </button>
            </SimulationProbe>
          )}
        </div>

        {/* Bottom-Right Expand Button */}
        <button
          type="button"
          onClick={() => setIsMapExpanded((v) => !v)}
          className="absolute bottom-2.5 right-3 w-7 h-7 bg-white hover:bg-neutral-50 text-black border border-[#e5e5e0] shadow-xs flex items-center justify-center cursor-pointer active:scale-95 transition-all rounded-xl z-20"
          title={isMapExpanded ? '收起' : '展开全景'}
        >
          {isMapExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </motion.div>
    </div>
  );
};

