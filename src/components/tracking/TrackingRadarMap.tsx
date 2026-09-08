import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Clock,
  Zap,
  Maximize2,
  Minimize2,
  Navigation,
  Compass,
  Target,
  Play,
  RotateCcw,
  CheckCircle2,
  MapPin,
  Radio,
  ExternalLink,
  Layers,
  Settings2,
  Share2,
  ShieldCheck,
  Bike
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDevSimulation } from '../../context/DevSimulationContext';
import { SimulationProbe } from '../dev/SimulationProbe';
import {
  getAmapWebKey,
  saveAmapWebKey,
  isUsingBuiltinAmapKey,
  planAmapRidingRoute,
  getAmapNavigationUrls,
  AmapRouteResult,
  calculateHaversineDistance,
  AMAP_KEY_EVENT
} from '../../utils/truckLocationEngine';
import { TruckInfo, Order } from '../../types';

declare global {
  interface Window {
    L: any;
  }
}

// 高德地图标准图层源 (GCJ-02 对齐)
const AMAP_TILE_VECTOR = 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}';
const AMAP_TILE_SATELLITE = 'https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}';
const AMAP_TILE_ROADNET = 'https://webst0{s}.is.autonavi.com/appmaptile?style=8&x={x}&y={y}&z={z}';
const OSM_FALLBACK_TILE = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

export interface TrackingRadarMapProps {
  initialSpeed?: number;
  initialDistanceMeters?: number;
  destinationLabel?: string;
  truckName?: string;
  onSimulate?: () => void;
  isSimulating?: boolean;
  truck?: TruckInfo;
  order?: Order;
  deliveryAddress?: string;
  originCoords?: { lat: number; lng: number };
  destCoords?: { lat: number; lng: number };
}

export const TrackingRadarMap: React.FC<TrackingRadarMapProps> = ({
  initialSpeed = 24,
  initialDistanceMeters = 420,
  destinationLabel = '静安大悦城商务座',
  truckName = '流动餐车',
  onSimulate,
  isSimulating = false,
  truck,
  order,
  deliveryAddress,
  originCoords,
  destCoords
}) => {
  const { isSimulationAllowed } = useDevSimulation();

  // 坐标计算：优先使用订单/餐车实际经纬度，若无则使用标准演示经纬度 (上海/杭州核心商圈)
  const defaultOrigin = useMemo(() => {
    if (originCoords) return originCoords;
    if (truck?.latitude && truck?.longitude) {
      return { lat: truck.latitude, lng: truck.longitude };
    }
    // 默认餐车站台 (上海市静安区曲阜路/西藏北路商圈)
    return { lat: 31.2425, lng: 121.4678 };
  }, [originCoords, truck]);

  const defaultDest = useMemo(() => {
    if (destCoords) return destCoords;
    // 默认配送收货地址 (静安大悦城商务座，距餐车约 600 米)
    return { lat: 31.2468, lng: 121.4725 };
  }, [destCoords]);

  const [speed, setSpeed] = useState(initialSpeed);
  const [distanceMeters, setDistanceMeters] = useState(initialDistanceMeters);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [routeProgress, setRouteProgress] = useState(65); // 默认进度 65%
  const [autoTour, setAutoTour] = useState(false);
  const [mapStyle, setMapStyle] = useState<'standard' | 'dark' | 'satellite'>('standard');
  const [isAmapModalOpen, setIsAmapModalOpen] = useState(false);
  const [amapKeyInput, setAmapKeyInput] = useState('');
  const [currentAmapKey, setCurrentAmapKey] = useState(getAmapWebKey());
  const [isBuiltinKey, setIsBuiltinKey] = useState(isUsingBuiltinAmapKey());

  // 高德 API 路径规划状态
  const [routeData, setRouteData] = useState<AmapRouteResult | null>(null);
  const [isRouteLoading, setIsRouteLoading] = useState(true);
  const [routeSource, setRouteSource] = useState<'amap' | 'fallback_simulated'>('amap');
  const [toastTip, setToastTip] = useState<string | null>(null);

  // 地图 DOM 引用
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const satLayerRef = useRef<any>(null);
  const roadLayerRef = useRef<any>(null);
  const polylineLayerRef = useRef<any>(null);
  const polylineGlowRef = useRef<any>(null);
  const truckMarkerRef = useRef<any>(null);
  const destMarkerRef = useRef<any>(null);
  const riderMarkerRef = useRef<any>(null);

  const showInternalToast = (msg: string) => {
    setToastTip(msg);
    setTimeout(() => setToastTip(null), 2500);
  };

  // 监听高德 Key 变动
  useEffect(() => {
    const handleKeyChange = () => {
      setCurrentAmapKey(getAmapWebKey());
      setIsBuiltinKey(isUsingBuiltinAmapKey());
    };
    window.addEventListener(AMAP_KEY_EVENT, handleKeyChange);
    return () => window.removeEventListener(AMAP_KEY_EVENT, handleKeyChange);
  }, []);

  // 1. 调用高德开放平台 Direction API 进行骑行路径规划
  useEffect(() => {
    let cancelled = false;
    async function fetchRoute() {
      setIsRouteLoading(true);
      try {
        const res = await planAmapRidingRoute(
          defaultOrigin.lat,
          defaultOrigin.lng,
          defaultDest.lat,
          defaultDest.lng
        );
        if (cancelled) return;
        setRouteData(res);
        setRouteSource(res.source);
        setDistanceMeters(Math.round(res.distanceMeters * (1 - routeProgress / 100)));
      } catch (err) {
        console.error('高德路径规划调用异常:', err);
      } finally {
        if (!cancelled) setIsRouteLoading(false);
      }
    }
    fetchRoute();
    return () => {
      cancelled = true;
    };
  }, [defaultOrigin.lat, defaultOrigin.lng, defaultDest.lat, defaultDest.lng, currentAmapKey]);

  // 2. 实时 GPS 遥测速度与微波动
  useEffect(() => {
    const interval = setInterval(() => {
      setSpeed((prev) => {
        if (routeProgress >= 100) return 0;
        const delta = Math.floor(Math.random() * 5) - 2;
        return Math.max(16, Math.min(32, prev + delta));
      });
    }, 2500);
    return () => clearInterval(interval);
  }, [routeProgress]);

  // 3. 自动路线巡航演练
  useEffect(() => {
    if (!autoTour) return;
    const tourInterval = setInterval(() => {
      setRouteProgress((prev) => {
        if (prev >= 100) {
          setAutoTour(false);
          setSpeed(0);
          setDistanceMeters(0);
          return 100;
        }
        const next = prev + 1.5;
        if (routeData) {
          setDistanceMeters(Math.max(0, Math.round(routeData.distanceMeters * (1 - next / 100))));
        }
        return next;
      });
    }, 300);
    return () => clearInterval(tourInterval);
  }, [autoTour, routeData]);

  // 4. 根据当前进度在折线上插值计算骑手真实经纬度
  const currentRiderCoord = useMemo<[number, number]>(() => {
    if (!routeData || !routeData.points || routeData.points.length === 0) {
      return [defaultOrigin.lat, defaultOrigin.lng];
    }
    const pts = routeData.points;
    if (routeProgress <= 0) return pts[0];
    if (routeProgress >= 100) return pts[pts.length - 1];

    const targetIndex = Math.min(
      pts.length - 1,
      Math.max(0, Math.floor((pts.length - 1) * (routeProgress / 100)))
    );
    return pts[targetIndex];
  }, [routeData, routeProgress, defaultOrigin]);

  // 5. 初始化与维护 Leaflet 真实高德地图图层
  useEffect(() => {
    if (!window.L || !mapContainerRef.current) return;
    const L = window.L;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [defaultOrigin.lat, defaultOrigin.lng],
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: true
      });
      mapInstanceRef.current = map;

      // 添加高德标准瓦片
      const tile = L.tileLayer(AMAP_TILE_VECTOR, {
        maxZoom: 18,
        minZoom: 12,
        subdomains: '1234',
        attribution: '© 高德地图 AMap'
      }).addTo(map);
      tileLayerRef.current = tile;

      // 瓦片加载容灾兜底
      tile.on('tileerror', () => {
        if (!(map as any)._tileSwapped) {
          (map as any)._tileSwapped = true;
          map.removeLayer(tile);
          L.tileLayer(OSM_FALLBACK_TILE, { maxZoom: 18, subdomains: 'abc' }).addTo(map);
        }
      });
    }

    const map = mapInstanceRef.current;

    // 图层风格动态切换
    if (mapStyle === 'satellite') {
      if (!satLayerRef.current) {
        satLayerRef.current = L.tileLayer(AMAP_TILE_SATELLITE, { maxZoom: 18, subdomains: '1234' }).addTo(map);
        roadLayerRef.current = L.tileLayer(AMAP_TILE_ROADNET, { maxZoom: 18, subdomains: '1234' }).addTo(map);
      }
    } else {
      if (satLayerRef.current) {
        map.removeLayer(satLayerRef.current);
        satLayerRef.current = null;
      }
      if (roadLayerRef.current) {
        map.removeLayer(roadLayerRef.current);
        roadLayerRef.current = null;
      }
    }

    // 绘制高德专送路线折线
    if (routeData && routeData.points.length >= 2) {
      if (polylineLayerRef.current) map.removeLayer(polylineLayerRef.current);
      if (polylineGlowRef.current) map.removeLayer(polylineGlowRef.current);

      // 外层半透明发光底轨
      polylineGlowRef.current = L.polyline(routeData.points, {
        color: '#10b981',
        weight: 8,
        opacity: 0.35,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      // 内层高德绿波专送流线
      polylineLayerRef.current = L.polyline(routeData.points, {
        color: '#059669',
        weight: 4.5,
        opacity: 0.95,
        dashArray: '8, 6',
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      // 调整视窗边界以完整囊括餐车与目的地
      try {
        const bounds = L.latLngBounds(routeData.points);
        map.fitBounds(bounds, { padding: [35, 35], maxZoom: 17, animate: true });
      } catch {
        // ignore
      }
    }

    // 起点 Marker：流动餐车
    if (!truckMarkerRef.current) {
      const truckIcon = L.divIcon({
        className: 'custom-truck-pin',
        html: `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 select-none">
            <div class="absolute w-8 h-8 rounded-full bg-amber-400/40 animate-ping"></div>
            <div class="absolute w-6 h-6 rounded-full bg-amber-500/20"></div>
            <div class="w-7 h-7 rounded-full bg-[#181816] border-2 border-white shadow-lg flex items-center justify-center text-white relative z-10">
              <span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            </div>
            <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#181816] text-white text-[9.5px] font-bold px-1.5 py-0.2 rounded-xs shadow-md border border-white/10">
              ${truckName || '流动餐车'}
            </div>
          </div>
        `,
        iconSize: [28, 28]
      });
      truckMarkerRef.current = L.marker([defaultOrigin.lat, defaultOrigin.lng], { icon: truckIcon }).addTo(map);
    } else {
      truckMarkerRef.current.setLatLng([defaultOrigin.lat, defaultOrigin.lng]);
    }

    // 终点 Marker：收货地址
    if (!destMarkerRef.current) {
      const destIcon = L.divIcon({
        className: 'custom-dest-pin',
        html: `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 select-none">
            <div class="absolute w-7 h-7 rounded-full bg-blue-500/30 animate-pulse"></div>
            <div class="w-6 h-6 rounded-full bg-blue-600 border-2 border-white shadow-lg flex items-center justify-center text-white relative z-10">
              <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
            </div>
            <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-blue-900 text-white text-[9.5px] font-bold px-1.5 py-0.2 rounded-xs shadow-md border border-blue-400/30">
              ${destinationLabel}
            </div>
          </div>
        `,
        iconSize: [24, 24]
      });
      destMarkerRef.current = L.marker([defaultDest.lat, defaultDest.lng], { icon: destIcon }).addTo(map);
    } else {
      destMarkerRef.current.setLatLng([defaultDest.lat, defaultDest.lng]);
    }

    // 骑手 Marker：动态跟随坐标平滑移动
    if (!riderMarkerRef.current) {
      const riderIcon = L.divIcon({
        className: 'custom-rider-pin',
        html: `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 select-none">
            <div class="absolute w-9 h-9 rounded-full bg-emerald-400/30 animate-ping"></div>
            <div class="w-8 h-8 rounded-full bg-[#10b981] border-2 border-white shadow-xl flex items-center justify-center text-white relative z-10">
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
            <div class="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-emerald-950 text-emerald-200 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-xs border border-emerald-400/30">
              骑手 ${routeProgress}%
            </div>
          </div>
        `,
        iconSize: [32, 32]
      });
      riderMarkerRef.current = L.marker(currentRiderCoord, { icon: riderIcon, zIndexOffset: 1000 }).addTo(map);
    } else {
      riderMarkerRef.current.setLatLng(currentRiderCoord);
    }

    // 触发尺寸重算
    setTimeout(() => {
      map.invalidateSize();
    }, 150);
  }, [defaultOrigin, defaultDest, routeData, currentRiderCoord, mapStyle, destinationLabel, truckName, routeProgress]);

  // 地图容器尺寸变动时触发 invalidateSize
  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current.invalidateSize();
      }, 350);
    }
  }, [isMapExpanded]);

  // 模拟推进按钮事件
  const handleStepSimulation = () => {
    if (onSimulate) onSimulate();
    setRouteProgress((prev) => {
      const next = prev >= 100 ? 15 : Math.min(100, prev + 15);
      if (routeData) {
        setDistanceMeters(Math.max(5, Math.round(routeData.distanceMeters * (1 - next / 100))));
      }
      return next;
    });
    showInternalToast('模拟专送骑手推进 +15% 路线');
  };

  // 重置巡航演示
  const handleResetRoute = () => {
    setRouteProgress(10);
    if (routeData) {
      setDistanceMeters(routeData.distanceMeters);
    }
    setAutoTour(true);
    showInternalToast('已开启高德全路网自动巡航演示');
  };

  // 高德官方导航唤起与网页打开
  const amapNavUrls = useMemo(() => {
    return getAmapNavigationUrls(
      defaultDest.lat,
      defaultDest.lng,
      destinationLabel,
      defaultOrigin.lat,
      defaultOrigin.lng,
      truckName
    );
  }, [defaultDest, defaultOrigin, destinationLabel, truckName]);

  const handleOpenAmapNavigation = () => {
    // 优先尝试唤起高德地图 App 协议，并延迟兜底打开高德网页版导航
    if (typeof window !== 'undefined') {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile) {
        window.location.href = amapNavUrls.amapUri;
        setTimeout(() => {
          window.open(amapNavUrls.webNavUrl, '_blank');
        }, 1500);
      } else {
        window.open(amapNavUrls.webNavUrl, '_blank');
      }
      showInternalToast('正在打开高德地图官方骑行专送导航…');
    }
  };

  // 保存自定义高德 Key
  const handleSaveAmapKey = (e: React.FormEvent) => {
    e.preventDefault();
    saveAmapWebKey(amapKeyInput);
    setCurrentAmapKey(getAmapWebKey());
    setIsBuiltinKey(isUsingBuiltinAmapKey());
    setIsAmapModalOpen(false);
    showInternalToast(amapKeyInput ? '已保存自定义高德 Key 并重新规划' : '已恢复系统内置高德企业 Key');
  };

  return (
    <div className="overflow-hidden bg-[#f4f5f1] border-y border-[#ededeb] relative select-none font-sans">
      {/* 内部 Toast 提示 */}
      <AnimatePresence>
        {toastTip && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-12 left-1/2 -translate-x-1/2 z-40 bg-[#181816]/95 text-white text-[10.5px] font-semibold px-3 py-1 shadow-lg border border-white/15 flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>{toastTip}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        animate={{ height: isMapExpanded ? 360 : 235 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="w-full relative overflow-hidden bg-[#e6e8e2]"
      >
        {/* Leaflet 真实高德地图容器 */}
        <div
          ref={mapContainerRef}
          className={`w-full h-full ${mapStyle === 'dark' ? 'invert-[0.92] hue-rotate-180 contrast-[1.1]' : ''}`}
          style={{ zIndex: 1 }}
        />

        {/* 顶部遥测与高德对接状态浮动栏 */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none z-20">
          {/* 左侧：高德 API 对接标识与预估到达时间 */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              type="button"
              onClick={() => setIsAmapModalOpen(true)}
              className="bg-[#181816]/90 hover:bg-[#181816] backdrop-blur-xs text-white text-[10px] font-bold px-2 py-1 flex items-center gap-1.5 shadow-2xs cursor-pointer border border-white/10 transition-colors"
              title="点击查看/配置高德开放平台 API 对接详情"
            >
              <Compass className="w-3 h-3 text-emerald-400 animate-spin-slow" />
              <span className="text-emerald-400 font-mono">AMap</span>
              <span className="text-neutral-300">
                {routeSource === 'amap' ? '高德绿波专线' : '高德网格对齐'}
              </span>
            </button>

            <div className="bg-white/95 backdrop-blur-xs text-[#111] text-[10.5px] font-bold px-2 py-1 border border-[#e2e2dc] shadow-2xs flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-500" />
              <span>
                {routeProgress >= 100
                  ? '已顺利送达'
                  : routeData?.durationMinutes
                  ? `高德预估 ${Math.max(1, Math.ceil(routeData.durationMinutes * (1 - routeProgress / 100)))} 分钟`
                  : '约 8-12 分钟'}
              </span>
            </div>
          </div>

          {/* 右侧：距离、状态与官方高德导航入口 */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              type="button"
              onClick={handleOpenAmapNavigation}
              className="bg-blue-600 hover:bg-blue-700 text-white text-[10.5px] font-bold px-2 py-1 shadow-2xs flex items-center gap-1 cursor-pointer transition-all active:scale-95"
              title="一键拉起高德地图官方 App / 网页版骑行导航"
            >
              <Navigation className="w-3 h-3 fill-white" />
              <span>高德导航</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-80" />
            </button>

            <div className="bg-[#181816]/90 backdrop-blur-xs text-white text-[10.5px] font-mono font-bold px-2 py-1 shadow-2xs flex items-center gap-1 border border-white/10">
              <motion.span
                animate={{ opacity: [1, 0.3, 1], scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
                className="w-1.5 h-1.5 rounded-full bg-[#10b981]"
              />
              <span>{routeProgress >= 100 ? '0m' : `${distanceMeters}m`}</span>
            </div>
          </div>
        </div>

        {/* 右侧浮动小工具栏：图层切换 & 视角复位 */}
        <div className="absolute right-2.5 top-12 flex flex-col gap-1 z-20 pointer-events-auto">
          <button
            type="button"
            onClick={() => {
              const next = mapStyle === 'standard' ? 'dark' : mapStyle === 'dark' ? 'satellite' : 'standard';
              setMapStyle(next);
              showInternalToast(
                next === 'standard' ? '已切换至高德标准街道图层' : next === 'dark' ? '已切换至高德黑曜石深色图层' : '已切换至高德高分卫星图层'
              );
            }}
            className="w-7 h-7 bg-white/95 hover:bg-white text-neutral-800 border border-[#dedede] shadow-xs flex items-center justify-center cursor-pointer active:scale-95 transition-all"
            title={`当前图层: ${mapStyle}，点击切换`}
          >
            <Layers className="w-3.5 h-3.5 text-neutral-700" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (mapInstanceRef.current && routeData?.points) {
                mapInstanceRef.current.fitBounds(window.L.latLngBounds(routeData.points), {
                  padding: [35, 35],
                  animate: true
                });
                showInternalToast('已重置高德视窗中心');
              }
            }}
            className="w-7 h-7 bg-white/95 hover:bg-white text-neutral-800 border border-[#dedede] shadow-xs flex items-center justify-center cursor-pointer active:scale-95 transition-all"
            title="居中高德专送全线"
          >
            <Target className="w-3.5 h-3.5 text-neutral-700" />
          </button>
        </div>

        {/* 底部左侧：时速、高德路况、模拟操纵台 */}
        <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5 z-20 flex-wrap pointer-events-auto">
          <div className="bg-white text-black text-[11px] font-bold px-2 py-0.8 border border-[#e5e5e0] shadow-xs flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
            <span className="font-mono">{speed} km/h</span>
          </div>

          <div className="bg-white text-neutral-800 text-[10.5px] font-medium px-2 py-0.8 border border-[#e5e5e0] shadow-xs flex items-center gap-1">
            <Bike className="w-3 h-3 text-emerald-600" />
            <span>实时进度 {Math.round(routeProgress)}%</span>
          </div>

          {/* 管理员开发调试操纵台 */}
          {isSimulationAllowed && (
            <SimulationProbe pointId="SIM_RADAR_CRUISE_TRACK" className="inline-flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleStepSimulation}
                className="bg-white hover:bg-neutral-50 active:scale-95 text-[#333] text-[10.5px] font-bold px-2 py-0.8 border border-[#e5e5e0] shadow-xs cursor-pointer transition-all flex items-center gap-1"
              >
                <Play className="w-3 h-3 text-blue-600 fill-blue-600" />
                <span>{isSimulating ? '模拟中...' : '推进 (+15%)'}</span>
              </button>

              <button
                type="button"
                onClick={handleResetRoute}
                className="bg-white hover:bg-neutral-50 active:scale-95 text-[#555] text-[10.5px] font-semibold px-2 py-0.8 border border-[#e5e5e0] shadow-xs cursor-pointer transition-all flex items-center gap-0.5"
                title="高德道路全线自动巡航演示"
              >
                <RotateCcw className="w-3 h-3" />
                <span>全线巡航</span>
              </button>
            </SimulationProbe>
          )}
        </div>

        {/* 底部右侧：全屏展开切换 */}
        <button
          type="button"
          onClick={() => setIsMapExpanded((v) => !v)}
          className="absolute bottom-2.5 right-3 w-7 h-7 bg-white hover:bg-neutral-50 text-black border border-[#e5e5e0] shadow-xs flex items-center justify-center cursor-pointer active:scale-95 transition-all z-20 pointer-events-auto"
          title={isMapExpanded ? '收起地图' : '展开高德全景大图'}
        >
          {isMapExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </motion.div>

      {/* 高德 API 配置与连通状态弹窗 */}
      <AnimatePresence>
        {isAmapModalOpen && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white border border-neutral-300 shadow-2xl p-4.5 space-y-3.5 text-xs text-neutral-800"
            >
              <div className="flex items-center justify-between border-b border-neutral-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-sm text-neutral-900">高德开放平台 (AMap API) 对接中枢</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAmapModalOpen(false)}
                  className="text-neutral-500 hover:text-black font-mono text-base px-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* 状态总览 */}
              <div className="space-y-2 bg-neutral-50 p-3 border border-neutral-200">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-500">接口对接模式:</span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>高德 Web 服务 API + 矢量瓦片双引擎</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-500">坐标基准体系:</span>
                  <span className="font-mono font-bold text-blue-700">GCJ-02 (火星加密精确对齐)</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-500">专送路径规划引擎:</span>
                  <span className="font-medium text-neutral-800">
                    {routeSource === 'amap' ? '高德 Bicycling v4 骑行绿波算法' : '城市路网智能网格平滑算法'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-500">轨迹节点解析:</span>
                  <span className="font-mono text-neutral-800 font-bold">
                    {routeData?.points.length || 0} 个真实路网拐点
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-500">当前 Key 授权源:</span>
                  <span className={`font-medium ${isBuiltinKey ? 'text-purple-700' : 'text-blue-700'}`}>
                    {isBuiltinKey ? '企业默认开发者 Key' : '自定义 Web 服务 Key'}
                  </span>
                </div>
              </div>

              {/* 官方导航外链 */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-none space-y-1.5">
                <div className="font-bold text-blue-950 flex items-center justify-between">
                  <span>高德官方导航通道</span>
                  <span className="text-[10px] text-blue-600 font-mono">amapuri://</span>
                </div>
                <p className="text-[11px] text-blue-900 leading-relaxed">
                  专送支持一键直达高德地图客户端或高德网页版，实时路况同步查看。
                </p>
                <div className="pt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={handleOpenAmapNavigation}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 flex items-center justify-center gap-1 shadow-xs cursor-pointer text-xs"
                  >
                    <Navigation className="w-3.5 h-3.5 fill-white" />
                    <span>立即在外部高德打开导航</span>
                  </button>
                </div>
              </div>

              {/* 自定义 Key 配置表单 */}
              <form onSubmit={handleSaveAmapKey} className="space-y-2 pt-1 border-t border-neutral-200">
                <label className="block text-[11px] font-bold text-neutral-700">
                  自定义高德 Web 服务 Key (可选配置)
                </label>
                <input
                  type="text"
                  value={amapKeyInput}
                  onChange={(e) => setAmapKeyInput(e.target.value)}
                  placeholder={currentAmapKey ? `当前 Key: ${currentAmapKey.slice(0, 8)}**** (留空保存恢复默认)` : '输入高德 Web 服务 Key'}
                  className="w-full bg-neutral-50 border border-neutral-300 px-2.5 py-1.5 text-xs font-mono text-neutral-900 focus:outline-none focus:border-black"
                />
                <div className="flex items-center justify-between text-[10px] text-neutral-500">
                  <span>支持高德开放平台申请的「Web 服务」类型 Key</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAmapKeyInput('');
                        saveAmapWebKey('');
                        setCurrentAmapKey(getAmapWebKey());
                        setIsBuiltinKey(isUsingBuiltinAmapKey());
                        showInternalToast('已恢复系统内置高德 Key');
                      }}
                      className="text-neutral-600 hover:text-black underline cursor-pointer"
                    >
                      恢复默认
                    </button>
                    <button
                      type="submit"
                      className="bg-[#181816] hover:bg-black text-white font-bold px-3 py-1 cursor-pointer"
                    >
                      保存配置
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
