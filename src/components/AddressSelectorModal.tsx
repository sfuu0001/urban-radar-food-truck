import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Search,
  Check,
  Building2,
  Navigation,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  LocateFixed,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  getActiveTruckConfig,
  getSavedAddresses,
  saveAddresses,
  getUserLocationState,
  saveUserLocationState,
  requestBrowserGeolocation,
  evaluateDeliveryRange,
  suggestPlaces,
  PlaceSuggestion,
  reverseGeocodeCoordinate,
  isEmbeddedFrame
} from '../utils/truckLocationEngine';
import { CenterAnchorMap } from './CenterAnchorMap';

interface AddressSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAddress: string;
  onSelectAddress: (address: string) => void;
}

/** 临时选点(尚未保存) */
interface DraftPick {
  title: string;
  detail: string;
  latitude: number;
  longitude: number;
  source: 'gps' | 'search' | 'map';
  accuracy?: number;
}

export const AddressSelectorModal: React.FC<AddressSelectorModalProps> = ({
  isOpen,
  onClose,
  currentAddress,
  onSelectAddress
}) => {
  const [truckConfig, setTruckConfig] = useState(() => getActiveTruckConfig());
  const [addresses, setAddresses] = useState(() => getSavedAddresses());
  const [userLocation, setUserLocation] = useState(() => getUserLocationState());
  const [isLocating, setIsLocating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [geoText, setGeoText] = useState('');
  const [geoing, setGeoing] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);

  // 美团式: 地图选点草稿(中心准星地图上的当前候选)
  const [draft, setDraft] = useState<DraftPick | null>(null);
  const [mapFly, setMapFly] = useState<{ lat: number; lng: number; seq: number } | undefined>(undefined);
  const [mapOpen, setMapOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const embed = isEmbeddedFrame();

  useEffect(() => {
    if (isOpen) {
      setTruckConfig(getActiveTruckConfig());
      setAddresses(getSavedAddresses());
      setUserLocation(getUserLocationState());
      setGeoText('');
      setDraft(null);
      setMapOpen(false);
      setMapFly(undefined);
      // 若有已记住的定位, 打开时直接带入草稿供确认
      const ul = getUserLocationState();
      if (ul.source === 'gps' && ul.latitude && !ul.isFallback) {
        setDraft({
          title: '我的实时位置',
          detail: ul.addressDetail || ul.locationName || 'GPS 定位点',
          latitude: ul.latitude,
          longitude: ul.longitude,
          source: 'gps',
          accuracy: ul.accuracy
        });
        setMapOpen(true);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleSelect = (addrDetail: string) => {
    onSelectAddress(addrDetail);
    onClose();
  };

  /** 保存草稿为地址: 写入地址簿 + 用户定位 + 选中 */
  const commitDraft = (d: DraftPick) => {
    // 记录用户定位(顾客端基准)
    saveUserLocationState({
      latitude: d.latitude,
      longitude: d.longitude,
      locationName: d.title,
      addressDetail: d.detail,
      source: d.source === 'gps' ? 'gps' : 'manual',
      accuracy: d.source === 'gps' ? d.accuracy : undefined,
      isFallback: false
    });
    setUserLocation(getUserLocationState());

    // 写入地址簿(置顶), 避免重复
    const exists = addresses.some((a) => a.detail === d.detail);
    if (!exists) {
      const newAddr = {
        id: `addr-${Date.now()}`,
        title: d.title,
        detail: d.detail,
        latitude: d.latitude,
        longitude: d.longitude,
        tag: d.source === 'gps' ? '定位' : '常用'
      };
      const updated = [newAddr, ...addresses];
      setAddresses(updated);
      saveAddresses(updated);
    }
    handleSelect(d.detail);
  };

  const handleTriggerGPS = async () => {
    setIsLocating(true);
    const result = await requestBrowserGeolocation();
    setIsLocating(false);
    setUserLocation(getUserLocationState());

    if (result.success && result.latitude) {
      setDraft({
        title: '我的实时位置',
        detail: userLocation.addressDetail || 'GPS 实时定位点',
        latitude: result.latitude,
        longitude: result.longitude,
        source: 'gps',
        accuracy: result.accuracy
      });
      setMapOpen(true);
      setMapFly({ lat: result.latitude, lng: result.longitude, seq: Date.now() });
      showToast(`已获取高精度定位 (精度 ±${Math.round(result.accuracy)}m), 可拖动地图微调`);
    } else {
      const reason = (result as any).blockReason;
      if (reason === 'iframe-policy') {
        showToast('预览内嵌页拦截定位授权。请用下方搜索输入地址, 或在新标签页打开授权');
      } else if (reason === 'denied') {
        showToast('定位权限被拒绝, 请允许定位后重试');
      } else {
        showToast(`GPS 定位失败(${result.error || '未知错误'}), 请搜索地址或拖动地图选点`);
      }
    }
  };

  // 搜索联想
  const handleSearchInput = async (v: string) => {
    setGeoText(v);
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

  const pickSuggestion = (s: PlaceSuggestion) => {
    setDraft({
      title: s.title,
      detail: s.detail,
      latitude: s.latitude,
      longitude: s.longitude,
      source: 'search'
    });
    setGeoText(`${s.title} ${s.detail}`);
    setSuggestions([]);
    setSuggestOpen(false);
    setMapOpen(true);
    setMapFly({ lat: s.latitude, lng: s.longitude, seq: Date.now() });
    showToast('已定位候选点, 可拖动地图微调后确认');
  };

  // 地图松手回填 → 更新草稿文本
  const handleMapResolve = (name: string, detail: string, lat: number, lng: number) => {
    setDraft((prev) => ({
      title: name || prev?.title || '地图选点',
      detail: detail || prev?.detail || '',
      latitude: lat,
      longitude: lng,
      source: prev?.source === 'gps' && !name ? 'gps' : 'map'
    }));
  };

  const confirmDraft = async () => {
    if (!draft || saving) return;
    setSaving(true);
    // 若文本地址无detail, 尝试逆地理一次(地图组件已做, 兜底)
    if (!draft.detail || draft.detail === 'GPS 实时定位点') {
      const res = await reverseGeocodeCoordinate(draft.latitude, draft.longitude);
      if (res) {
        draft.title = res.locationName;
        draft.detail = res.addressDetail || res.locationName;
      }
    }
    setSaving(false);
    commitDraft({ ...draft });
  };

  const evalDraft = draft
    ? evaluateDeliveryRange(truckConfig, { latitude: draft.latitude, longitude: draft.longitude }, 'delivery')
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-[#e2e3e1] flex flex-col overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh]">
        {/* Toast */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-3 left-1/2 -translate-x-1/2 z-[70] bg-black text-white text-xs px-3 py-1.5 rounded-full shadow-lg border border-white/20"
            >
              {toastMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-[#e2e3e1] bg-[#f9f9f7] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center">
              <Building2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-black">选择外卖配送地址</h3>
              <p className="text-[11px] text-[#787770]">
                【{truckConfig.name}】配送半径:{' '}
                <span className="font-bold text-emerald-700 font-mono">
                  {truckConfig.deliveryRadiusKm.toFixed(1)} km
                </span>
                · 定位: {userLocation.locationName.slice(0, 18)}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white border border-[#e2e3e1] hover:bg-neutral-100 text-black flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* GPS Quick Location Bar */}
        <div className="px-3.5 py-2.5 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <Navigation className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span className="text-[11.5px] text-emerald-950 truncate">
              当前定位: <span className="font-semibold">{userLocation.locationName}</span>
            </span>
            {userLocation.source === 'gps' && !userLocation.isFallback && userLocation.accuracy ? (
              <span className="shrink-0 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded">
                高精度 ±{Math.round(userLocation.accuracy)}m
              </span>
            ) : userLocation.source === 'gps' && userLocation.isFallback ? (
              <span className="shrink-0 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded">
                精度偏低 ±{userLocation.accuracy ? Math.round(userLocation.accuracy) : '?'}m
              </span>
            ) : (
              <span className="shrink-0 text-[10px] font-bold text-neutral-600 bg-neutral-100 border border-neutral-200 px-1.5 py-0.5 rounded">
                尚未获取定位
              </span>
            )}
          </div>

          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleTriggerGPS}
            disabled={isLocating}
            className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? '定位中...' : '重新识别GPS'}</span>
          </motion.button>
        </div>

        {/* Scrollable Main Area */}
        <div className="overflow-y-auto hide-scrollbar">
          {/* 搜索框(联想下拉) */}
          <div className="px-3.5 pt-3 space-y-2">
            <div className="relative">
              <div className="flex items-center gap-2 bg-[#fbfbfa] border border-[#d3d1cb] rounded-xl px-2.5 focus-within:border-emerald-700 transition-colors">
                <Search className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <input
                  type="text"
                  value={geoText}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && suggestions[0]) pickSuggestion(suggestions[0]);
                  }}
                  placeholder="搜索小区 / 道路 / 商圈, 如: 三宝郡庭"
                  className="flex-1 min-w-0 py-2.5 bg-transparent outline-none text-xs font-medium"
                />
                {geoing && <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-400 shrink-0" />}
              </div>

              {suggestOpen && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e2e3e1] rounded-xl shadow-lg z-[80] max-h-56 overflow-y-auto hide-scrollbar">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-[#9a937f] flex items-center gap-1 border-b border-[#f2f2ef]">
                    <Sparkles className="w-3 h-3 text-[#d9730d]" />
                    搜索结果 — 点击选为配送点
                  </div>
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => pickSuggestion(s)}
                      className="w-full text-left px-3 py-2 hover:bg-[#f5f5f2] border-b border-[#f2f2ef] last:border-0 flex items-start gap-2 cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                      <span className="min-w-0">
                        <span className="block text-xs font-bold text-[#37352f] truncate">{s.title}</span>
                        <span className="block text-[10.5px] text-[#787774] truncate">{s.detail}</span>
                      </span>
                      <span className="ml-auto shrink-0 text-[9px] font-mono px-1 py-0.5 rounded bg-neutral-100 text-neutral-500 self-center">
                        {s.source === 'amap' ? '高德' : 'OSM'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-[10px] text-[#787774] leading-tight -mt-0.5">
              {embed
                ? '预览页 GPS 常被拦截: 用上方搜索或下方地图选点最稳。'
                : '选择搜索结果后, 可用下方地图拖动微调, 确认后下单。'}
            </p>
          </div>

          {/* 候选确认卡(美团式) */}
          {draft && (
            <div className="px-3.5 pt-2.5">
              <div
                className={`p-3 rounded-xl border transition-all ${
                  evalDraft?.isOutOfRange
                    ? 'border-amber-300 bg-amber-50/40'
                    : 'border-emerald-200 bg-emerald-50/40'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white ${
                      draft.source === 'gps' ? 'bg-emerald-600' : 'bg-black'
                    }`}
                  >
                    {draft.source === 'gps' ? (
                      <LocateFixed className="w-4 h-4" />
                    ) : (
                      <MapPin className="w-4 h-4 text-[#fde047]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-black text-[#37352f]">{draft.title}</span>
                      {draft.source === 'gps' && draft.accuracy ? (
                        <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-1 py-0.5 rounded">
                          GPS ±{Math.round(draft.accuracy)}m
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-neutral-600 bg-neutral-100 border border-neutral-200 px-1 py-0.5 rounded">
                          候选点
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#474741] leading-snug mt-0.5 line-clamp-2">
                      {draft.detail || '拖动地图微调后自动回填详细地址'}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      {evalDraft && (
                        evalDraft.isOutOfRange ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100/90 border border-amber-300 px-1.5 py-0.5 rounded">
                            <AlertTriangle className="w-2.5 h-2.5 text-amber-700" />
                            距餐车 {evalDraft.distanceKm.toFixed(2)}km · 超出 {evalDraft.exceededKm.toFixed(2)}km
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                            距餐车 {evalDraft.distanceKm.toFixed(2)}km · 专送覆盖中
                          </span>
                        )
                      )}
                      <span className="font-mono text-[9.5px] text-[#9a937f]">
                        {draft.latitude.toFixed(5)}, {draft.longitude.toFixed(5)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-2.5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMapOpen((v) => !v)}
                    className={`px-3 py-2 rounded-lg text-[11px] font-bold border cursor-pointer transition-all flex items-center gap-1.5 ${
                      mapOpen
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-[#474741] border-neutral-300 hover:border-black'
                    }`}
                  >
                    <Navigation className="w-3 h-3" />
                    {mapOpen ? '收起地图' : '地图微调'}
                  </button>
                  <button
                    type="button"
                    onClick={confirmDraft}
                    disabled={saving}
                    className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-[11px] cursor-pointer transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {saving ? '保存中…' : `确认此地址并下单 (${evalDraft?.distanceKm?.toFixed(1) ?? '--'}km)`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 迷你中心锚定地图 */}
          {draft && mapOpen && (
            <div className="px-3.5 pt-2.5">
              <CenterAnchorMap
                key={`${draft.latitude}-${draft.longitude}-${draft.source}`}
                initialLat={draft.latitude}
                initialLng={draft.longitude}
                height={230}
                flyTo={mapFly}
                onResolve={handleMapResolve}
              />
              <p className="text-[10px] text-[#787774] leading-tight mt-1 flex items-center gap-1">
                <Navigation className="w-2.5 h-2.5 text-emerald-700" />
                拖动地图移动中心锚点, 松手自动识别地址; 点地图任意处可直接对准。
              </p>
            </div>
          )}

          {/* Saved Address List */}
          <div className="px-3.5 pt-3 pb-2">
            <div className="text-[10px] font-bold text-[#9a937f] flex items-center gap-1 mb-2">
              <Building2 className="w-3 h-3" />
              常用送达地址 — 点击快速选择
            </div>
          </div>
          <div className="px-3.5 pb-3.5 space-y-2.5">
            {addresses.map((item) => {
              const isSelected = currentAddress === item.detail || currentAddress.includes(item.title);
              const evalResult = evaluateDeliveryRange(truckConfig, {
                latitude: item.latitude,
                longitude: item.longitude
              }, 'delivery');
              const isOutOfRange = evalResult.isOutOfRange;

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item.detail)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2.5 ${
                    isSelected
                      ? 'border-2 border-emerald-500 bg-emerald-50/70 shadow-2xs'
                      : isOutOfRange
                      ? 'border-amber-200 bg-amber-50/30 hover:border-amber-300'
                      : 'border-[#e2e3e1] bg-white hover:bg-[#f9f9f7]'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected
                          ? 'bg-emerald-500 text-white shadow-2xs'
                          : isOutOfRange
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-neutral-100 text-neutral-700'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        <span className={`text-xs font-bold ${isSelected ? 'text-emerald-700 font-black' : 'text-black'}`}>{item.title}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-bold border ${
                            item.tag === '家'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : item.tag === '公司'
                              ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : item.tag === '学校'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-[#eeeeec] text-[#474741] border-neutral-200'
                          }`}
                        >
                          {item.tag}
                        </span>
                        {item.isDefault && (
                          <span className="text-[9px] px-1 py-0.2 bg-emerald-100 text-emerald-800 rounded font-semibold">
                            默认
                          </span>
                        )}
                      </div>

                      <p className={`text-[11.5px] leading-snug line-clamp-2 ${isSelected ? 'text-emerald-700/80 font-medium' : 'text-[#474741]'}`}>
                        {item.detail}
                      </p>

                      <div className="mt-1.5 flex items-center gap-2">
                        {isOutOfRange ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100/90 border border-amber-300 px-1.5 py-0.5 rounded">
                            <AlertTriangle className="w-2.5 h-2.5 text-amber-700" />
                            <span>距餐车 {evalResult.distanceKm.toFixed(2)}km · 超出 {evalResult.exceededKm.toFixed(2)}km</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                            <span>距餐车 {evalResult.distanceKm.toFixed(2)}km · 专送覆盖中</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 pt-0.5">
                    {isSelected ? (
                      <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-neutral-300 bg-white" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#f9f9f7] border-t border-[#e2e3e1] flex items-center justify-between text-xs text-[#787770] shrink-0">
          <span>餐车当前停靠: {truckConfig.locationName.slice(0, 16)}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-xl font-bold text-xs cursor-pointer shadow-xs"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
