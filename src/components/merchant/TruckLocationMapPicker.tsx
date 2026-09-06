import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  MapPin,
  Crosshair,
  Search,
  LocateFixed,
  Navigation,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Lock,
  Unlock,
  RotateCcw,
  Clock
} from 'lucide-react';
import {
  requestBrowserGeolocation,
  suggestPlaces,
  geocodeAddress,
  reverseGeocodeCoordinate,
  isEmbeddedFrame,
  PlaceSuggestion,
  GeoBlockReason
} from '../../utils/truckLocationEngine';

/* ============================================================
 * 停靠点选址地图（美团/京东同款「中心准星」交互）
 *
 * 模式说明:
 *  - locked=true  「查看模式」: 地图可拖动浏览/缩放, 但绝不改动
 *                 锚点与实际停靠点; 隐藏中心准星, 用固定标记显示
 *                 餐车当前位置 + 配送半径圈, 始终以实际位置为中心。
 *  - locked=false 「编辑模式」: 屏幕中心水滴锚固定, 拖动地图=移动
 *                 候选停靠点; 松手自动逆地理回填; GPS/搜索可飞达。
 *                 仅影响「候选」, 需父组件显式保存才写回餐车。
 * 底图: 高德中文瓦片 (GCJ-02) ; 失败回退 OSM
 * ============================================================ */

declare global {
  interface Window {
    L: any;
  }
}

const TILE_AMAP = 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}';
const TILE_FALLBACK = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

const RADIUS_QUICK = [
  { label: '1km', val: 1.0 },
  { label: '2km', val: 2.0 },
  { label: '3km', val: 3.0 },
  { label: '5km', val: 5.0 },
  { label: '8km', val: 8.0 }
];

function buildTruckIcon(L: any) {
  const html = `
    <div style="transform:translate(-50%,-100%);">
      <svg width="34" height="46" viewBox="0 0 38 52" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 2 C8.5 2 4 11 4 20.5 C4 31 15 40 19 50 C23 40 34 31 34 20.5 C34 11 29.5 2 19 2 Z"
              fill="#1A1C1B" stroke="#ffffff" stroke-width="2.5"/>
        <circle cx="19" cy="19" r="7" fill="#fde047" stroke="#1A1C1B" stroke-width="1.5"/>
      </svg>
    </div>`;
  return L.divIcon({ className: '', html, iconSize: [34, 46], iconAnchor: [17, 44] });
}

interface TruckLocationMapPickerProps {
  initialLat: number;
  initialLng: number;
  radiusKm: number;
  locked?: boolean;
  onPositionChange: (lat: number, lng: number) => void;
  onAddressChange?: (name: string, detail?: string) => void;
  onRadiusChange?: (km: number) => void;
  /** 外部(预设点)飞行目标, seq 变化即触发 —— 仅在编辑模式生效 */
  flyToTarget?: { lat: number; lng: number; seq: number };
}

export const TruckLocationMapPicker: React.FC<TruckLocationMapPickerProps> = ({
  initialLat,
  initialLng,
  radiusKm,
  locked = true,
  onPositionChange,
  onAddressChange,
  onRadiusChange,
  flyToTarget
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const radiusRef = useRef<any>(null);
  const accuracyRef = useRef<any>(null);
  const truckMarkerRef = useRef<any>(null);
  const reverseTimer = useRef<number | null>(null);
  const reverseSeq = useRef(0);
  const lockedRef = useRef(locked);
  lockedRef.current = locked;

  const onPosRef = useRef(onPositionChange);
  const onAddrRef = useRef(onAddressChange);
  const onRadiusRef = useRef(onRadiusChange);
  onPosRef.current = onPositionChange;
  onAddrRef.current = onAddressChange;
  onRadiusRef.current = onRadiusChange;

  // 候选坐标(编辑模式中心=候选) + 实际停靠坐标(查看模式基准)
  const [status, setStatus] = useState<'loading' | 'ready' | 'fail'>('loading');
  const [lat, setLat] = useState(initialLat);
  const [lng, setLng] = useState(initialLng);
  const [accuracy, setAccuracy] = useState<number | undefined>(undefined);
  const [gpsState, setGpsState] = useState<'idle' | 'locating'>('idle');
  const [searching, setSearching] = useState(false);
  const [addressText, setAddressText] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [resolvedName, setResolvedName] = useState('');
  const [resolvedDetail, setResolvedDetail] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolvedAt, setResolvedAt] = useState('');
  const [warn, setWarn] = useState<string | null>(null);
  const [gpsOk, setGpsOk] = useState(false);

  const embed = isEmbeddedFrame();

  const reverseCenter = useCallback(
    (la: number, ln: number, writeback = true) => {
      const seq = ++reverseSeq.current;
      setResolving(true);
      if (reverseTimer.current) window.clearTimeout(reverseTimer.current);
      reverseTimer.current = window.setTimeout(async () => {
        const res = await reverseGeocodeCoordinate(la, ln);
        if (reverseSeq.current !== seq) return;
        setResolving(false);
        if (res) {
          setResolvedName(res.locationName);
          setResolvedDetail(res.addressDetail);
          setResolvedAt(new Date().toLocaleTimeString('zh-CN', { hour12: false }));
          if (writeback) onAddrRef.current?.(res.locationName, res.addressDetail);
        } else {
          setResolvedName('');
          setResolvedDetail('未能识别该点地址(网络受限)。可手动输入名称。');
        }
      }, 250);
    },
    []
  );

  // 编辑模式同步候选中心 (移动围栏圈/精度圈/回调父组件)
  const syncCandidate = useCallback(
    (la: number, ln: number, opts?: { reverse?: boolean; acc?: number }) => {
      setLat(la);
      setLng(ln);
      onPosRef.current(la, ln);
      if (radiusRef.current) radiusRef.current.setLatLng([la, ln]);
      if (accuracyRef.current && opts?.acc !== undefined) {
        accuracyRef.current.setLatLng([la, ln]);
        accuracyRef.current.setRadius(opts.acc);
      }
      if (opts?.acc !== undefined) {
        setAccuracy(opts.acc);
        setGpsOk(true);
      }
      if (opts?.reverse !== false) reverseCenter(la, ln);
    },
    [reverseCenter]
  );

  // 初始化地图
  useEffect(() => {
    let cancelled = false;
    const deadline = Date.now() + 8000;

    const start = () => {
      if (cancelled) return;
      if (!window.L || !containerRef.current) {
        if (Date.now() > deadline) {
          setStatus('fail');
          return;
        }
        setTimeout(start, 150);
        return;
      }
      if (mapRef.current) return;

      const L = window.L;
      const map = L.map(containerRef.current, {
        center: [initialLat, initialLng],
        zoom: 16,
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: true
      });
      mapRef.current = map;

      const amap = L.tileLayer(TILE_AMAP, {
        maxZoom: 18,
        subdomains: '1234',
        attribution: '© 高德地图'
      }).addTo(map);
      (amap as any).on('tileerror', () => {
        if (!(map as any)._tileSwapped) {
          (map as any)._tileSwapped = true;
          map.removeLayer(amap);
          L.tileLayer(TILE_FALLBACK, { maxZoom: 19, subdomains: 'abc' }).addTo(map);
        }
      });

      // 配送半径围栏 (编辑=候选中心; 查看=实际停靠点)
      radiusRef.current = L.circle([initialLat, initialLng], {
        radius: radiusKm * 1000,
        color: '#2b593f',
        weight: 1.5,
        dashArray: '6 5',
        fillColor: '#2b593f',
        fillOpacity: 0.08
      }).addTo(map);

      // 查看模式下的「餐车实际位置」固定标记
      truckMarkerRef.current = L.marker([initialLat, initialLng], {
        icon: buildTruckIcon(L),
        interactive: false
      }).addTo(map);

      // 拖动地图: 编辑模式=移动候选; 查看模式=仅浏览
      let settleTimer: number | null = null;
      map.on('moveend', () => {
        const c = map.getCenter();
        if (lockedRef.current) {
          // 查看模式: 浏览后把半径圈/标记钉回实际位置, 中心准星不改变
          return;
        }
        if (settleTimer) window.clearTimeout(settleTimer);
        settleTimer = window.setTimeout(() => {
          syncCandidate(c.lat, c.lng);
        }, 120);
      });

      map.on('click', (e: any) => {
        if (lockedRef.current) return; // 查看模式禁止点击改点
        map.panTo(e.latlng, { animate: true, duration: 0.4 });
      });

      setStatus('ready');
      setTimeout(() => map.invalidateSize(), 200);

      // 初始: 显示实际位置地址(查看模式只读回填; 编辑模式同时写回父组件)
      reverseCenter(initialLat, initialLng, !lockedRef.current);
    };

    start();

    return () => {
      cancelled = true;
      if (reverseTimer.current) window.clearTimeout(reverseTimer.current);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        radiusRef.current = null;
        accuracyRef.current = null;
        truckMarkerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 模式切换: locked<->edit 时把视图/围栏/标记复位到对应位置
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !truckMarkerRef.current || !radiusRef.current) return;
    const L = window.L;
    if (locked) {
      // → 查看: 围栏钉回实际位置, 显示固定餐车标记, 隐藏精度圈
      setLat(initialLat);
      setLng(initialLng);
      radiusRef.current.setLatLng([initialLat, initialLng]);
      truckMarkerRef.current.setLatLng([initialLat, initialLng]);
      (truckMarkerRef.current as any).setOpacity?.(1);
      if (accuracyRef.current) map.removeLayer(accuracyRef.current);
      accuracyRef.current = null;
      setGpsOk(false);
      setWarn(null);
      map.flyTo([initialLat, initialLng], Math.max(map.getZoom(), 16), {
        animate: true,
        duration: 0.6
      });
    } else {
      // → 编辑: 候选从「实际停靠点」开始(而非浏览过的位置), 中心锚即候选
      (truckMarkerRef.current as any).setOpacity?.(0);
      map.flyTo([initialLat, initialLng], Math.max(map.getZoom(), 16), {
        animate: true,
        duration: 0.6
      });
      syncCandidate(initialLat, initialLng);
      setWarn(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked]);

  // 半径联动: 父组件改半径 → 围栏圈同步
  useEffect(() => {
    if (radiusRef.current && mapRef.current) {
      radiusRef.current.setRadius(radiusKm * 1000);
    }
  }, [radiusKm]);

  // 外部飞行目标 (预设点) —— 仅编辑模式生效
  useEffect(() => {
    if (!flyToTarget || !mapRef.current || lockedRef.current) return;
    if (!flyToTarget.lat || !flyToTarget.lng) return;
    mapRef.current.flyTo([flyToTarget.lat, flyToTarget.lng], 16, {
      animate: true,
      duration: 0.9
    });
    syncCandidate(flyToTarget.lat, flyToTarget.lng);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyToTarget?.seq]);

  const handleSearchInput = async (v: string) => {
    setAddressText(v);
    const q = v.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSuggestOpen(false);
      return;
    }
    const items = await suggestPlaces(q);
    if (items.length) {
      setSuggestions(items);
      setSuggestOpen(true);
    } else {
      setSuggestions([]);
      setSuggestOpen(false);
    }
  };

  const pickSuggestion = async (s: PlaceSuggestion) => {
    if (lockedRef.current) return;
    setAddressText(s.title + ' ' + s.detail);
    setSuggestions([]);
    setSuggestOpen(false);
    setSearching(true);
    if (mapRef.current) {
      mapRef.current.flyTo([s.latitude, s.longitude], 17, { animate: true, duration: 0.6 });
    }
    syncCandidate(s.latitude, s.longitude);
    setSearching(false);
    setWarn(null);
  };

  const handleSearchSubmit = async () => {
    if (lockedRef.current) return;
    const q = addressText.trim();
    if (!q || searching) return;
    setSearching(true);
    const res = await geocodeAddress(q);
    setSearching(false);
    if (res) {
      if (mapRef.current) {
        mapRef.current.flyTo([res.latitude, res.longitude], 17, { animate: true, duration: 0.6 });
      }
      syncCandidate(res.latitude, res.longitude);
      setWarn(null);
    } else {
      setWarn('未检索到该地址。可尝试更具体描述, 如「浙江省杭州市拱墅区三宝郡庭」。');
    }
  };

  const drawAccuracy = (la: number, ln: number, acc: number) => {
    const map = mapRef.current;
    if (!map) return;
    if (accuracyRef.current) map.removeLayer(accuracyRef.current);
    accuracyRef.current = window.L.circle([la, ln], {
      radius: Math.max(acc, 20),
      color: '#d9730d',
      weight: 1,
      fillColor: '#d9730d',
      fillOpacity: 0.16
    }).addTo(map);
  };

  const handleGps = async () => {
    if (lockedRef.current || status !== 'ready' || gpsState === 'locating') return;
    setGpsState('locating');
    setWarn(null);
    const res = await requestBrowserGeolocation();
    setGpsState('idle');
    if (res.success && res.latitude) {
      if (mapRef.current) {
        mapRef.current.setView([res.latitude, res.longitude], 17, { animate: true });
      }
      drawAccuracy(res.latitude, res.longitude, res.accuracy);
      syncCandidate(res.latitude, res.longitude, { acc: res.accuracy });
      setGpsOk(true);
      setWarn(null);
    } else {
      const reason = res.blockReason || 'unavailable';
      if (reason === 'iframe-policy') {
        setWarn('预览内嵌页拦截定位授权。请先解锁编辑, 再点右上「新标签页授权定位」在新标签页授权。');
      } else if (reason === 'denied') {
        setWarn('定位权限被拒绝。请在浏览器允许定位后重试, 或使用搜索/拖动选点。');
      } else {
        setWarn(res.error || '定位失败, 请到空旷处重试或使用搜索选点。');
      }
    }
  };

  const openInNewTab = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('geo', '1');
    window.open(url.toString(), '_blank');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-3.5">
      {/* ============ 左: 地图 ============ */}
      <div className="bg-white rounded-2xl border border-[#e6e6e4] shadow-2xs overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#efefed] bg-[#fbfbfa]">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-emerald-700" />
            <span className="font-bold text-xs text-[#37352f]">
              {locked ? '停靠点位置预览（查看模式 · 锁定）' : '停靠点选址地图（编辑模式）'}
            </span>
          </div>
          <span className="text-[10px] text-[#787774] flex items-center gap-1">
            {locked ? (
              <>
                <Lock className="w-3 h-3 text-[#d9730d]" /> 拖动浏览不影响位置
              </>
            ) : (
              <>
                <Crosshair className="w-3 h-3" /> 拖动地图 = 移动候选锚点
              </>
            )}
          </span>
        </div>

        <div className="relative">
          <div ref={containerRef} className="h-[440px] w-full z-0 bg-[#eef0f2]" />

          {status === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-[500]">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-700" />
              <span className="ml-2 text-xs text-[#5a5854]">地图加载中…</span>
            </div>
          )}
          {status === 'fail' && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#fbfbfa] z-[500] p-4 text-center">
              <div className="text-xs text-[#787774]">
                地图加载失败(网络受限)。右侧「地址搜索 / 手动标注」仍可直接获取真实坐标并保存。
              </div>
            </div>
          )}

          {/* 查看模式: 中央提示条(锁) + 真实餐车标记由 Leaflet 固定展示 */}
          {status === 'ready' && locked && (
            <>
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-[#37352f]/90 text-white text-[10.5px] font-bold rounded-full px-3 py-1 flex items-center gap-1.5 z-[500] shadow pointer-events-none whitespace-nowrap">
                <Lock className="w-3 h-3 text-[#fde047]" />
                已锁定 · 仅查看 — 解锁后才能修改停靠点
              </div>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/95 border border-[#e6e6e4] rounded-full px-3 py-1.5 flex items-center gap-2 z-[500] shadow pointer-events-none max-w-[90%]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-[10.5px] font-bold text-[#37352f] truncate">
                  {resolvedName || `餐车实际停靠点 · LAT ${lat.toFixed(5)} LNG ${lng.toFixed(5)}`}
                </span>
              </div>
            </>
          )}

          {/* 编辑模式: 中心准星水滴锚(固定, 拖动地图移动候选) */}
          {status === 'ready' && !locked && (
            <>
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-[400]">
                <div className="relative flex flex-col items-center">
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-emerald-500/20 animate-ping pointer-events-none" />
                  <svg width="38" height="52" viewBox="0 0 38 52" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg">
                    <path
                      d="M19 2 C8.5 2 4 11 4 20.5 C4 31 15 40 19 50 C23 40 34 31 34 20.5 C34 11 29.5 2 19 2 Z"
                      fill="#1A1C1B"
                      stroke="#ffffff"
                      strokeWidth="2.5"
                    />
                    <circle cx="19" cy="19" r="7" fill="#fde047" stroke="#1A1C1B" strokeWidth="1.5" />
                  </svg>
                  <div className="-mt-1 w-1 h-6 bg-emerald-600/80" />
                </div>
              </div>

              {resolving && (
                <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10.5px] font-bold rounded-full px-3 py-1 flex items-center gap-1.5 z-[500] pointer-events-none shadow whitespace-nowrap">
                  <Loader2 className="w-3 h-3 animate-spin text-emerald-300" />
                  正在识别候选点地址…
                </div>
              )}
              {!resolving && resolvedName && (
                <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-white/95 border border-[#e6e6e4] rounded-full px-3.5 py-1.5 flex items-center gap-2 z-[500] shadow max-w-[82%] pointer-events-none">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="text-[10.5px] font-bold text-[#37352f] truncate">{resolvedName}</span>
                  <span className="text-[9px] text-[#9a937f] shrink-0 flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" /> {resolvedAt}
                  </span>
                </div>
              )}

              {gpsOk && accuracy && (
                <div className="absolute bottom-3 left-2 bg-emerald-700/90 text-white rounded-lg px-2.5 py-1 text-[10px] font-bold flex items-center gap-1 z-[500] shadow pointer-events-none">
                  <LocateFixed className="w-3 h-3" /> GPS ±{Math.round(accuracy)}m
                </div>
              )}
            </>
          )}

          {/* 坐标 HUD */}
          {status === 'ready' && (
            <div className="absolute bottom-3 right-2 bg-black/80 text-white rounded-lg px-2.5 py-1.5 font-mono text-[10.5px] leading-tight shadow-lg pointer-events-none z-[500]">
              <div className="flex items-center gap-1 text-emerald-300">
                <Crosshair className="w-3 h-3" />
                <span>{locked ? 'TRUCK' : 'LAT'} {lat.toFixed(6)}</span>
              </div>
              <div className="flex items-center gap-1 text-emerald-300">
                <Crosshair className="w-3 h-3" />
                <span>{locked ? 'TRUCK' : 'LNG'} {lng.toFixed(6)}</span>
              </div>
              <div className="text-[9px] text-neutral-300 mt-0.5">
                {locked ? `配送圈 ${radiusKm.toFixed(1)}km · 锁定中` : `候选点 · 配送圈 ${radiusKm.toFixed(1)}km`}
              </div>
            </div>
          )}

          {/* 右上角: 编辑模式显示 GPS; 查看模式隐藏 GPS */}
          {status === 'ready' && !locked && (
            <div className="absolute top-2 right-2 flex items-center gap-1.5 z-[500]">
              {embed && (
                <button
                  type="button"
                  onClick={openInNewTab}
                  title="预览页拦截定位时, 在新标签页打开并授权"
                  className="bg-amber-500/95 hover:bg-amber-600 text-white rounded-lg px-2 py-1.5 text-[10px] font-bold shadow cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  新标签页授权定位
                </button>
              )}
              <button
                type="button"
                onClick={handleGps}
                disabled={gpsState === 'locating'}
                className="bg-white/95 hover:bg-white border border-[#e6e6e4] rounded-lg px-2.5 py-1.5 text-[10.5px] font-bold text-[#37352f] flex items-center gap-1 shadow cursor-pointer disabled:opacity-50"
              >
                <LocateFixed className={`w-3.5 h-3.5 text-emerald-700 ${gpsState === 'locating' ? 'animate-spin' : ''}`} />
                {gpsState === 'locating' ? '收敛定位中…' : '我的GPS'}
              </button>
            </div>
          )}
          {status === 'ready' && locked && (
            <div className="absolute top-2 right-2 bg-[#37352f]/85 text-white rounded-lg px-2.5 py-1.5 text-[10px] font-bold flex items-center gap-1.5 z-[500] shadow pointer-events-none">
              <Lock className="w-3 h-3 text-[#fde047]" />
              位置已锁定
            </div>
          )}
        </div>
      </div>

      {/* ============ 右: 控制面板 ============ */}
      <div className="space-y-3">
        {locked ? (
          /* ---- 查看模式: 仅显示实际停靠信息 ---- */
          <>
            <div className="bg-white p-3 rounded-2xl border border-[#e6e6e4] shadow-2xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-xs text-[#37352f]">
                <Lock className="w-3.5 h-3.5 text-[#d9730d]" />
                <span>查看模式 — 餐车位置不会被修改</span>
              </div>
              <div className="bg-[#fbfbfa] border border-[#e6e6e4] rounded-xl px-3 py-2">
                <div className="text-[12px] font-bold text-[#37352f] leading-snug">当前实际停靠点</div>
                <div className="text-[10px] text-[#787774] leading-snug mt-0.5">LAT {lat.toFixed(6)} · LNG {lng.toFixed(6)} · GCJ-02</div>
              </div>
              <p className="text-[10.5px] text-[#787774] leading-tight">
                打开本面板不会触发自动定位, 拖动地图/滚动缩放仅用于浏览。若需修改停靠点, 请切换到下方「编辑模式」。
              </p>
            </div>
          </>
        ) : (
          /* ---- 编辑模式: 搜索/识别/快捷半径 ---- */
          <>
            <div className="bg-white p-3 rounded-2xl border border-[#e6e6e4] shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs text-[#37352f]">
                  <Search className="w-3.5 h-3.5 text-emerald-700" />
                  <span>地址搜索 / 联想定位</span>
                </div>
                <span className="text-[9px] text-[#9a937f] flex items-center gap-0.5">
                  <ChevronDown className="w-3 h-3" /> 输入≥2字出现联想
                </span>
              </div>
              <div className="relative">
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={addressText}
                    onChange={(e) => handleSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
                    placeholder="如: 杭州市三宝郡庭 / 西湖文化广场"
                    className="flex-1 min-w-0 px-2.5 py-2 bg-[#f7f7f5] border border-[#d3d1cb] rounded-lg focus:outline-none focus:border-[#37352f] text-xs font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleSearchSubmit}
                    disabled={searching}
                    className="px-3 py-2 bg-black hover:bg-neutral-800 text-white rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    <Navigation className="w-3.5 h-3.5 text-[#fde047]" />
                    {searching ? '检索中' : '定位'}
                  </button>
                </div>

                {suggestOpen && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e6e6e4] rounded-xl shadow-lg z-[600] max-h-52 overflow-y-auto hide-scrollbar">
                    {suggestions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => pickSuggestion(s)}
                        className="w-full text-left px-2.5 py-2 hover:bg-[#f5f5f2] border-b border-[#f2f2ef] last:border-0 flex items-start gap-2 cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                        <span className="min-w-0">
                          <span className="block text-[11.5px] font-bold text-[#37352f] truncate">{s.title}</span>
                          <span className="block text-[10px] text-[#787774] truncate">{s.detail}</span>
                        </span>
                        <span className="ml-auto shrink-0 text-[8.5px] font-mono px-1 py-0.5 rounded bg-neutral-100 text-neutral-500 self-center">
                          {s.source === 'amap' ? '高德' : 'OSM'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-[10px] text-[#787774] leading-tight">
                选联想结果或回车 → 地图飞至候选点。拖动地图继续微调, 松手自动识别地址。
              </p>
            </div>

            <div className="bg-[#fbfbfa] p-3 rounded-2xl border border-[#e6e6e4] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#5a5854] flex items-center gap-1">
                  <CheckCircle2 className={`w-3.5 h-3.5 ${resolving ? 'animate-pulse text-amber-500' : 'text-emerald-600'}`} />
                  候选锚点自动识别地址
                </span>
                {resolvedAt && (
                  <span className="text-[9px] text-[#9a937f] font-mono">更新于 {resolvedAt}</span>
                )}
              </div>
              <div className="bg-white border border-[#e6e6e4] rounded-xl px-2.5 py-2">
                <div className="text-[12px] font-bold text-[#37352f] leading-snug">
                  {resolvedName || (resolving ? '正在识别…' : '拖动地图后自动回填')}
                </div>
                {resolvedDetail && (
                  <div className="text-[10px] text-[#787774] leading-snug mt-0.5 line-clamp-2">{resolvedDetail}</div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[10.5px]">
                <div className="bg-white border border-[#e6e6e4] rounded-lg px-2 py-1.5">
                  <div className="text-[9px] text-[#9a937f]">LATITUDE</div>
                  <div className="font-bold text-[#37352f]">{lat.toFixed(6)}</div>
                </div>
                <div className="bg-white border border-[#e6e6e4] rounded-lg px-2 py-1.5">
                  <div className="text-[9px] text-[#9a937f]">LONGITUDE</div>
                  <div className="font-bold text-[#37352f]">{lng.toFixed(6)}</div>
                </div>
              </div>
              <p className="text-[10px] text-[#787774] leading-tight">
                <b className="text-[#37352f]">编辑仅影响候选位置</b>, 需在下方点「保存并广播」后才写入餐车实际停靠点。
              </p>
            </div>

            {onRadiusChange && (
              <div className="bg-white p-3 rounded-2xl border border-[#e6e6e4] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] text-[#37352f] flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-[#d9730d]" />
                    配送半径快捷档 (围栏同步)
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-700">{radiusKm.toFixed(1)} km</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {RADIUS_QUICK.map((r) => (
                    <button
                      key={r.val}
                      type="button"
                      onClick={() => onRadiusChange(r.val)}
                      className={`py-1.5 rounded-lg font-bold border text-center cursor-pointer transition-all text-[11px] ${
                        Math.abs(radiusKm - r.val) < 0.05
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-neutral-800 border-neutral-300 hover:bg-neutral-100'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* 提示横幅 */}
        {warn && (
          <div className="bg-[#fdf3e7] border border-[#f0d6b0] rounded-2xl p-3 flex items-start gap-1.5">
            <AlertTriangle className="w-4 h-4 text-[#d9730d] shrink-0 mt-0.5" />
            <p className="text-[11px] text-[#9a5a12] leading-snug">{warn}</p>
          </div>
        )}

        {/* 操作提示 */}
        <div className="bg-[#f3f7f3] border border-[#dbe7db] rounded-2xl p-3 space-y-1">
          <p className="text-[10.5px] text-[#2b593f] font-bold flex items-center gap-1">
            {locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            {locked ? '当前为查看模式' : '当前为编辑模式'}
          </p>
          <ul className="text-[10px] text-[#4d5a50] space-y-0.5 leading-snug list-disc pl-4">
            {locked ? (
              <>
                <li>地图可拖动/缩放<b className="text-[#2b593f]">浏览周边</b>, 但不会改动餐车位置;</li>
                <li>固定标记显示餐车<b className="text-[#2b593f]">当前实际停靠点</b>与配送半径圈;</li>
                <li>如需更换停靠点, 切换到下方「解锁编辑」。</li>
              </>
            ) : (
              <>
                <li>屏幕中心水滴锚=候选停靠点: 拖动地图, 松手自动识别地址;</li>
                <li>点按地图任意处可快速对准; 「我的GPS」收敛定位并画精度圈;</li>
                <li>此处修改为<b className="text-[#2b593f]">候选</b>, 点「保存并广播」才更新餐车实际停靠点;</li>
                <li>完成编辑后可切回「锁定」防止误触。</li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};
