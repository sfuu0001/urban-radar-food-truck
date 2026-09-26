import React from 'react';
import {
  MapPin,
  Mic,
  Radio,
  Camera,
  Zap,
  RefreshCw,
  Wifi,
  WifiOff,
  Clock,
  Sparkles,
  SlidersHorizontal,
  Flame,
  Snowflake,
  ShieldAlert
} from 'lucide-react';

interface DynamicIconProps {
  className?: string;
  size?: number;
  active?: boolean;
}

/**
 * 1. 定位 / GPS / 泊位动态图标 (DynamicGpsBeacon)
 * 外扩型雷达扩散波纹 (`animate-ping`)、高透雷达光晕与实时锁位定位信标微绿灯
 */
export function DynamicGpsBeacon({ className = '', size = 16, active = true }: DynamicIconProps) {
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`} style={{ width: size + 8, height: size + 8 }}>
      {active && (
        <>
          <span className="absolute inset-0 rounded-full bg-emerald-500/25 animate-ping" />
          <span className="absolute inset-1 rounded-full bg-emerald-400/20 blur-[1px]" />
        </>
      )}
      <MapPin className={`relative z-10 transition-colors ${active ? 'text-emerald-600' : 'text-neutral-400'}`} style={{ width: size, height: size }} />
      {active && (
        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse z-20" />
      )}
    </div>
  );
}

/**
 * 2. 对讲 / 语音 / 叫号广播均衡器 (DynamicAudioWave)
 * 4柱交错跳动音频柱状波形 (`Audio Wave Equalizer`) 与无线电波涟漪
 */
export function DynamicAudioWave({ className = '', active = true }: { className?: string; active?: boolean }) {
  return (
    <div className={`inline-flex items-center justify-center gap-[2.5px] h-4 shrink-0 px-1 ${className}`}>
      <span
        className={`w-[2.5px] rounded-full transition-all duration-300 ${
          active ? 'bg-amber-500 animate-pulse' : 'bg-neutral-300 h-1.5'
        }`}
        style={{
          height: active ? '12px' : '4px',
          animationDuration: '0.65s',
          animationDelay: '0ms'
        }}
      />
      <span
        className={`w-[2.5px] rounded-full transition-all duration-300 ${
          active ? 'bg-amber-600 animate-pulse' : 'bg-neutral-300 h-2'
        }`}
        style={{
          height: active ? '16px' : '6px',
          animationDuration: '0.8s',
          animationDelay: '150ms'
        }}
      />
      <span
        className={`w-[2.5px] rounded-full transition-all duration-300 ${
          active ? 'bg-amber-500 animate-pulse' : 'bg-neutral-300 h-1.5'
        }`}
        style={{
          height: active ? '14px' : '5px',
          animationDuration: '0.7s',
          animationDelay: '300ms'
        }}
      />
      <span
        className={`w-[2.5px] rounded-full transition-all duration-300 ${
          active ? 'bg-amber-600 animate-pulse' : 'bg-neutral-300 h-1'
        }`}
        style={{
          height: active ? '10px' : '3px',
          animationDuration: '0.9s',
          animationDelay: '75ms'
        }}
      />
    </div>
  );
}

/**
 * 3. 拍照 / 出餐验真 / 存证快门微动 (DynamicCameraShutter)
 * 光学镜头对焦框微动、光圈快门动态微旋与高辨识度闪光微标
 */
export function DynamicCameraShutter({ className = '', size = 16, triggered = false }: { className?: string; size?: number; triggered?: boolean }) {
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`} style={{ width: size + 6, height: size + 6 }}>
      {/* 光学对焦角标 */}
      <span className="absolute inset-0 rounded border border-dashed border-emerald-500/40 pointer-events-none transition-transform duration-300 scale-95 group-hover:scale-105" />
      <Camera
        className={`relative z-10 transition-transform ${triggered ? 'animate-aperture-twist text-emerald-600' : 'text-neutral-700'}`}
        style={{ width: size, height: size }}
      />
      {triggered && (
        <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-amber-500 animate-ping z-20" />
      )}
    </div>
  );
}

/**
 * 4. 催单 / 督办 / 紧急工单频闪 (DynamicEmergencyStrobe)
 * 高危心跳频闪脉冲 (`Emergency Strobe Pulse`) 与电气闪电加急微标
 */
export function DynamicEmergencyStrobe({ className = '', size = 15, active = true }: DynamicIconProps) {
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`} style={{ width: size + 6, height: size + 6 }}>
      {active && (
        <span className="absolute inset-0 rounded-full bg-rose-500/20 animate-emergency-strobe" />
      )}
      <Zap
        className={`relative z-10 transition-colors ${active ? 'text-rose-600 animate-bounce' : 'text-neutral-400'}`}
        style={{ width: size, height: size, animationDuration: '1.2s' }}
      />
      {active && (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-600 animate-ping z-20" />
      )}
    </div>
  );
}

/**
 * 5. 换餐 / 报备 / 异常双向流转 (DynamicBiDirectionFlow)
 * 双向交互旋动流转徽记与实时状态响应
 */
export function DynamicBiDirectionFlow({ className = '', size = 15, rotating = true }: { className?: string; size?: number; rotating?: boolean }) {
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`} style={{ width: size + 6, height: size + 6 }}>
      <RefreshCw
        className={`transition-colors ${rotating ? 'animate-spin text-purple-600' : 'text-neutral-400'}`}
        style={{ width: size, height: size, animationDuration: '3s' }}
      />
    </div>
  );
}

/**
 * 6. 离线韧性 / 动态天线波纹 (DynamicAntennaRadar)
 * 动态天线波纹与时间轴回卷刻度
 */
export function DynamicAntennaRadar({ className = '', size = 16, online = true }: { className?: string; size?: number; online?: boolean }) {
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`} style={{ width: size + 8, height: size + 8 }}>
      {online ? (
        <>
          <span className="absolute inset-0 rounded-full bg-blue-500/20 animate-antenna-ping" />
          <Wifi className="relative z-10 text-sky-600" style={{ width: size, height: size }} />
          <span className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-1 ring-white" />
        </>
      ) : (
        <>
          <WifiOff className="relative z-10 text-neutral-400" style={{ width: size, height: size }} />
          <span className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full bg-amber-500 ring-1 ring-white animate-pulse" />
        </>
      )}
    </div>
  );
}

/**
 * 7. 冷热温控保鲜动态微标 (DynamicThermalIndicator)
 * 恒温加热保暖 / 超低温冷链保鲜监控
 */
export function DynamicThermalIndicator({
  mode = 'warm',
  temperature = 65,
  alert = false
}: {
  mode?: 'warm' | 'cold';
  temperature?: number;
  alert?: boolean;
}) {
  const isWarm = mode === 'warm';
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border transition-colors shrink-0 ${
      alert
        ? 'bg-rose-50 border-rose-300 text-rose-700 animate-emergency-strobe'
        : isWarm
        ? 'bg-amber-50/90 border-amber-200/90 text-amber-700'
        : 'bg-sky-50/90 border-sky-200/90 text-sky-700'
    }`}>
      {alert ? (
        <ShieldAlert className="w-3.5 h-3.5 text-rose-600 animate-bounce" />
      ) : isWarm ? (
        <Flame className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
      ) : (
        <Snowflake className="w-3.5 h-3.5 text-sky-500 animate-spin-slow" />
      )}
      <span className="tracking-tight">{temperature}°C {isWarm ? '恒温保温' : '保鲜冷链'}</span>
    </div>
  );
}
