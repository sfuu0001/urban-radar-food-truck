import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Check,
  Plus,
  Building2,
  Navigation,
  RefreshCw,
  AlertTriangle,
  Compass,
  CheckCircle2,
  Sparkles
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
  DeliveryAddressItem,
  TruckLocationConfig,
  PRESET_DELIVERY_ADDRESSES
} from '../utils/truckLocationEngine';

interface AddressSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAddress: string;
  onSelectAddress: (address: string) => void;
}

export const AddressSelectorModal: React.FC<AddressSelectorModalProps> = ({
  isOpen,
  onClose,
  currentAddress,
  onSelectAddress
}) => {
  const [truckConfig, setTruckConfig] = useState<TruckLocationConfig>(() => getActiveTruckConfig());
  const [addresses, setAddresses] = useState<DeliveryAddressItem[]>(() => getSavedAddresses());
  const [userLocation, setUserLocation] = useState(() => getUserLocationState());
  const [isLocating, setIsLocating] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customDetail, setCustomDetail] = useState('');
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTruckConfig(getActiveTruckConfig());
      setAddresses(getSavedAddresses());
      setUserLocation(getUserLocationState());
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

  const handleTriggerGPS = async () => {
    setIsLocating(true);
    const result = await requestBrowserGeolocation();
    setIsLocating(false);

    if (result.success) {
      const updated = getUserLocationState();
      setUserLocation(updated);
      showToast(`已成功获取最新 GPS 定位点 (精度 ±${result.accuracy}m)`);
      if (updated.addressDetail) {
        onSelectAddress(updated.addressDetail);
      }
    } else {
      showToast(`GPS 定位已完成（使用商圈基准坐标）`);
    }
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDetail.trim()) return;

    const newAddr: DeliveryAddressItem = {
      id: `addr-${Date.now()}`,
      title: customTitle.trim() || '自定义送达点',
      detail: customDetail.trim(),
      latitude: 31.2428,
      longitude: 121.4682,
      tag: '自定义'
    };

    const updated = [newAddr, ...addresses];
    setAddresses(updated);
    saveAddresses(updated);
    onSelectAddress(newAddr.detail);
    setCustomTitle('');
    setCustomDetail('');
    setIsAddingCustom(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-[#e2e3e1] flex flex-col overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Toast */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-3 left-1/2 -translate-x-1/2 z-60 bg-black text-white text-xs px-3 py-1.5 rounded-full shadow-lg border border-white/20"
            >
              {toastMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-[#e2e3e1] bg-[#f9f9f7] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center">
              <Building2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-black">选择外卖配送地址</h3>
              <p className="text-[11px] text-[#787770]">
                【{truckConfig.name}】设定外卖半径:{' '}
                <span className="font-bold text-emerald-700 font-mono">
                  {truckConfig.deliveryRadiusKm.toFixed(1)} km
                </span>
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
        <div className="px-3.5 py-2.5 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <Navigation className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span className="text-[11.5px] text-emerald-950 truncate">
              当前定位: <span className="font-semibold">{userLocation.locationName}</span>
            </span>
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

        {/* Address List with Live Geodesic Distance Evaluation */}
        <div className="p-3.5 space-y-2.5 max-h-[62vh] overflow-y-auto hide-scrollbar text-xs">
          {addresses.map((item) => {
            const isSelected = currentAddress === item.detail || currentAddress.includes(item.title);
            const evalResult = evaluateDeliveryRange(truckConfig, item.detail, 'delivery');
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

                    {/* Geodesic Distance Status Tag */}
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

          {/* Custom Address Input Toggle */}
          {isAddingCustom ? (
            <form onSubmit={handleAddCustom} className="p-3 border border-dashed border-neutral-400 rounded-xl bg-neutral-50 space-y-2.5">
              <label className="text-xs font-bold text-black block">新增自定义配送地址</label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="地址标签 (如: 静安嘉里中心、家)"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#e2e3e1] bg-white outline-none focus:border-black"
              />
              <input
                type="text"
                value={customDetail}
                onChange={(e) => setCustomDetail(e.target.value)}
                placeholder="详细送达地址 (如: 南京西路 1515 号办公楼 1802)"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#e2e3e1] bg-white outline-none focus:border-black"
                autoFocus
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingCustom(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-[#e2e3e1] hover:bg-neutral-100"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-black text-white hover:bg-neutral-800"
                >
                  确认保存并选中
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingCustom(true)}
              className="w-full py-2.5 border border-dashed border-neutral-300 rounded-xl text-xs font-bold text-[#474741] hover:border-black hover:text-black flex items-center justify-center gap-1.5 transition-all bg-[#fafaf8] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>添加其他送达地址</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#f9f9f7] border-t border-[#e2e3e1] flex items-center justify-between text-xs text-[#787770]">
          <span>餐车当前停靠: {truckConfig.locationName}</span>
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
