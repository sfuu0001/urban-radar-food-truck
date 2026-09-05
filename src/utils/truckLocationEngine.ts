import { TruckInfo, DiningMode } from '../types';
import { safeGetStorage, safeSetStorage } from './safeStorage';

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export interface TruckLocationConfig {
  id: string;
  name: string;
  code: string;
  locationName: string;
  latitude: number;
  longitude: number;
  deliveryRadiusKm: number; // 商家自定义外卖配送范围 (公里)
  status: 'open' | 'transit' | 'closed';
  minDeliveryAmount?: number;
  baseDeliveryFee?: number;
  updatedAt?: string;
}

export interface UserLocationState {
  latitude: number;
  longitude: number;
  locationName: string;
  addressDetail: string;
  source: 'gps' | 'preset' | 'manual';
  accuracy?: number; // 精度(米)
  isLocating?: boolean;
  lastUpdated: string;
}

export interface DeliveryAddressItem {
  id: string;
  title: string;
  detail: string;
  latitude: number;
  longitude: number;
  tag: string;
  isDefault?: boolean;
}

export interface DeliveryRangeEvaluation {
  isOutOfRange: boolean; // 是否超出配送范围
  distanceKm: number; // 当前实际计算距离 (km)
  radiusKm: number; // 餐车设定的最大配送半径 (km)
  exceededKm: number; // 超出公里数 (若在范围内则为 0)
  truckName: string;
  truckLocationName: string;
  targetAddress: string;
  diningMode: DiningMode;
  reason: string;
  unsupportedNotice: string; // 明确提示: 不支持 X 公里以外的距离 / 仅支持 X 公里以内配送
  canSwitchToPickup: boolean;
  canChangeAddress: boolean;
  alternativeTruck?: {
    id: string;
    name: string;
    distanceKm: number;
    radiusKm: number;
    isInRange: boolean;
  } | null;
}

// 预设全上海重点商圈流动餐车站台基准点
export const DEFAULT_TRUCK_CONFIGS: TruckLocationConfig[] = [
  {
    id: 'truck-01',
    name: '黑曜石 01 号流动餐车',
    code: 'OBSIDIAN-ALPHA-01',
    locationName: '静安大悦城南广场 · 西藏北路曲阜路',
    latitude: 31.2428,
    longitude: 121.4682,
    deliveryRadiusKm: 3.0, // 默认 3.0 公里
    status: 'open',
    minDeliveryAmount: 35,
    baseDeliveryFee: 5,
    updatedAt: '2026-08-29 10:00:00'
  },
  {
    id: 'truck-02',
    name: '黑曜石 02 号流动餐车',
    code: 'OBSIDIAN-BETA-02',
    locationName: '陆家嘴金融城北塔下沉广场',
    latitude: 31.2389,
    longitude: 121.5032,
    deliveryRadiusKm: 2.5, // 默认 2.5 公里
    status: 'open',
    minDeliveryAmount: 40,
    baseDeliveryFee: 6,
    updatedAt: '2026-08-29 10:00:00'
  },
  {
    id: 'truck-03',
    name: '黑曜石 03 号流动餐车',
    code: 'OBSIDIAN-GAMMA-03',
    locationName: '新天地南里 · 马当路兴业路交叉口',
    latitude: 31.2185,
    longitude: 121.4751,
    deliveryRadiusKm: 3.5, // 默认 3.5 公里
    status: 'open',
    minDeliveryAmount: 35,
    baseDeliveryFee: 5,
    updatedAt: '2026-08-29 10:00:00'
  },
  {
    id: 'truck-04',
    name: '黑曜石 04 号流动餐车',
    code: 'OBSIDIAN-DELTA-04',
    locationName: '徐汇西岸穹顶艺术中心外广场',
    latitude: 31.1684,
    longitude: 121.4589,
    deliveryRadiusKm: 4.0, // 默认 4.0 公里
    status: 'open',
    minDeliveryAmount: 45,
    baseDeliveryFee: 8,
    updatedAt: '2026-08-29 10:00:00'
  }
];

// 预设高频地址列表（真实上海坐标，涵盖从 0.1km 到 15km 多种测试距离）
export const PRESET_DELIVERY_ADDRESSES: DeliveryAddressItem[] = [
  {
    id: 'addr-1',
    title: '大悦城商务座 (常用办公)',
    detail: '西藏北路 166 号大悦城商务座 1204 室',
    latitude: 31.2435,
    longitude: 121.4690,
    tag: '默认',
    isDefault: true
  },
  {
    id: 'addr-2',
    title: '静安大悦城北座办公楼',
    detail: '西藏北路 198 号大悦城北座 801 室',
    latitude: 31.2450,
    longitude: 121.4680,
    tag: '朋友'
  },
  {
    id: 'addr-3',
    title: '苏河湾万象天地',
    detail: '福建北路 100 号西里 3 层 302',
    latitude: 31.2465,
    longitude: 121.4780,
    tag: '公司'
  },
  {
    id: 'addr-4',
    title: '汉中路智慧产业园',
    detail: '光复路 1 号智慧园 A 座 101',
    latitude: 31.2390,
    longitude: 121.4510,
    tag: '分部'
  },
  {
    id: 'addr-5',
    title: '陆家嘴国金中心 IFC',
    detail: '浦东新区世纪大道 8 号国金中心二期 22 层',
    latitude: 31.2372,
    longitude: 121.5038,
    tag: '远距测试 (3.5km+)'
  },
  {
    id: 'addr-6',
    title: '徐汇滨江油罐艺术公园',
    detail: '龙腾大道 2380 号油罐艺术中心 1 号馆',
    latitude: 31.1712,
    longitude: 121.4610,
    tag: '超距测试 (8.0km+)'
  },
  {
    id: 'addr-7',
    title: '虹桥天地购物中心',
    detail: '闵行区申长路 688 号虹桥天地南区 L2',
    latitude: 31.1945,
    longitude: 121.3160,
    tag: '超距测试 (15.0km+)'
  }
];

export const DEFAULT_USER_LOCATION: UserLocationState = {
  latitude: 31.2435,
  longitude: 121.4690,
  locationName: '大悦城商务座',
  addressDetail: '西藏北路 166 号大悦城商务座 1204 室',
  source: 'gps',
  accuracy: 15,
  lastUpdated: new Date().toLocaleTimeString('zh-CN')
};

// Storage Keys & Events
const STORAGE_KEY_TRUCKS = 'obsidian_truck_location_configs';
const STORAGE_KEY_ACTIVE_TRUCK_ID = 'obsidian_active_truck_id';
const STORAGE_KEY_USER_LOCATION = 'obsidian_user_location_state';
const STORAGE_KEY_ADDRESS_LIST = 'obsidian_saved_delivery_addresses';

export const TRUCK_LOCATION_EVENT = 'obsidian_truck_location_changed';
export const USER_LOCATION_EVENT = 'obsidian_user_location_changed';

/**
 * 获取所有餐车的定位与配送范围配置列表
 */
export function getAllTruckConfigs(): TruckLocationConfig[] {
  return safeGetStorage<TruckLocationConfig[]>(STORAGE_KEY_TRUCKS, DEFAULT_TRUCK_CONFIGS);
}

/**
 * 保存并广播所有餐车配置列表
 */
export function saveAllTruckConfigs(configs: TruckLocationConfig[]): void {
  safeSetStorage(STORAGE_KEY_TRUCKS, configs);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TRUCK_LOCATION_EVENT, { detail: configs }));
  }
}

/**
 * 获取当前选中的活跃餐车配置 (默认为 01 号车)
 */
export function getActiveTruckConfig(): TruckLocationConfig {
  const all = getAllTruckConfigs();
  const activeId = safeGetStorage<string>(STORAGE_KEY_ACTIVE_TRUCK_ID, 'truck-01');
  const found = all.find((t) => t.id === activeId);
  return found || all[0] || DEFAULT_TRUCK_CONFIGS[0];
}

/**
 * 切换当前选中的活跃餐车
 */
export function setActiveTruckId(truckId: string): TruckLocationConfig {
  safeSetStorage(STORAGE_KEY_ACTIVE_TRUCK_ID, truckId);
  const active = getActiveTruckConfig();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TRUCK_LOCATION_EVENT, { detail: getAllTruckConfigs() }));
  }
  return active;
}

/**
 * 商家修改并保存指定餐车的配送范围公里数
 */
export function updateTruckDeliveryRadius(truckId: string, radiusKm: number): TruckLocationConfig {
  const all = getAllTruckConfigs();
  const updated = all.map((t) => {
    if (t.id === truckId) {
      return {
        ...t,
        deliveryRadiusKm: Math.max(0.5, Math.min(30.0, Number(radiusKm.toFixed(1)))),
        updatedAt: new Date().toLocaleString('zh-CN')
      };
    }
    return t;
  });
  saveAllTruckConfigs(updated);
  return updated.find((t) => t.id === truckId) || updated[0];
}

/**
 * 商家修改餐车停靠点、GPS 经纬度及配送围栏
 */
export function updateTruckLocation(
  truckId: string,
  locationName: string,
  latitude: number,
  longitude: number,
  radiusKm?: number
): TruckLocationConfig {
  const all = getAllTruckConfigs();
  const updated = all.map((t) => {
    if (t.id === truckId) {
      return {
        ...t,
        locationName,
        latitude,
        longitude,
        deliveryRadiusKm: radiusKm !== undefined ? radiusKm : t.deliveryRadiusKm,
        updatedAt: new Date().toLocaleString('zh-CN')
      };
    }
    return t;
  });
  saveAllTruckConfigs(updated);
  return updated.find((t) => t.id === truckId) || updated[0];
}

/**
 * 获取当前用户的地理位置状态
 */
export function getUserLocationState(): UserLocationState {
  return safeGetStorage<UserLocationState>(STORAGE_KEY_USER_LOCATION, DEFAULT_USER_LOCATION);
}

/**
 * 保存并广播用户当前地理位置
 */
export function saveUserLocationState(state: Partial<UserLocationState>): UserLocationState {
  const current = getUserLocationState();
  const merged: UserLocationState = {
    ...current,
    ...state,
    lastUpdated: new Date().toLocaleTimeString('zh-CN')
  };
  safeSetStorage(STORAGE_KEY_USER_LOCATION, merged);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(USER_LOCATION_EVENT, { detail: merged }));
  }
  return merged;
}

/**
 * 获取所有保存的送达地址
 */
export function getSavedAddresses(): DeliveryAddressItem[] {
  return safeGetStorage<DeliveryAddressItem[]>(STORAGE_KEY_ADDRESS_LIST, PRESET_DELIVERY_ADDRESSES);
}

/**
 * 保存地址列表
 */
export function saveAddresses(addresses: DeliveryAddressItem[]): void {
  safeSetStorage(STORAGE_KEY_ADDRESS_LIST, addresses);
}

/**
 * Haversine 球面大圆距离公式计算（精准经纬度距离，返回公里数 km）
 */
export function calculateGeodesicDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const R = 6371; // 地球平均半径 (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Number(d.toFixed(2));
}

/**
 * 根据地址文本解析或推导经纬度（若匹配到预设地址则直接使用，否则根据关键词推算合理坐标）
 */
export function resolveAddressCoordinates(addressText: string): GeoCoordinate {
  const allSaved = getSavedAddresses();
  const matched = allSaved.find(
    (a) => a.detail === addressText || a.title === addressText || addressText.includes(a.title)
  );
  if (matched) {
    return { latitude: matched.latitude, longitude: matched.longitude };
  }

  // 依据上海知名地标粗略匹配坐标
  const lower = addressText.toLowerCase();
  if (lower.includes('陆家嘴') || lower.includes('世纪大道') || lower.includes('浦东')) {
    return { latitude: 31.2389, longitude: 121.5032 };
  }
  if (lower.includes('新天地') || lower.includes('马当路') || lower.includes('淮海')) {
    return { latitude: 31.2185, longitude: 121.4751 };
  }
  if (lower.includes('徐汇') || lower.includes('滨江') || lower.includes('龙腾大道')) {
    return { latitude: 31.1684, longitude: 121.4589 };
  }
  if (lower.includes('虹桥') || lower.includes('申长路') || lower.includes('闵行')) {
    return { latitude: 31.1945, longitude: 121.3160 };
  }
  if (lower.includes('苏河湾') || lower.includes('万象天地') || lower.includes('福建北路')) {
    return { latitude: 31.2465, longitude: 121.4780 };
  }
  if (lower.includes('汉中路') || lower.includes('光复路')) {
    return { latitude: 31.2390, longitude: 121.4510 };
  }

  // 默认静安大悦城商圈基准
  return { latitude: 31.2435, longitude: 121.4690 };
}

/**
 * 核心链路判断：识别地理位置 -> 计算到指定餐车的距离 -> 评估是否在指定外卖配送范围公里以内
 */
export function evaluateDeliveryRange(
  truckConfig: TruckLocationConfig,
  targetAddressOrLocation: string | GeoCoordinate,
  diningMode: DiningMode = 'delivery'
): DeliveryRangeEvaluation {
  let targetCoords: GeoCoordinate;
  let addressString = '';

  if (typeof targetAddressOrLocation === 'string') {
    addressString = targetAddressOrLocation;
    targetCoords = resolveAddressCoordinates(targetAddressOrLocation);
  } else {
    targetCoords = targetAddressOrLocation;
    addressString = '当前 GPS 定位点';
  }

  // 计算餐车与目标位置的实际距离 (km)
  const distanceKm = calculateGeodesicDistanceKm(
    truckConfig.latitude,
    truckConfig.longitude,
    targetCoords.latitude,
    targetCoords.longitude
  );

  const radiusKm = truckConfig.deliveryRadiusKm || 3.0;

  // 仅在外卖模式 (delivery) 下受到配送范围限制；堂食 (dine_in) 与自提 (pickup) 均不受限制
  const isDelivery = diningMode === 'delivery';
  const isOutOfRange = isDelivery && distanceKm > radiusKm;
  const exceededKm = isOutOfRange ? Number((distanceKm - radiusKm).toFixed(2)) : 0;

  let reason = '';
  let unsupportedNotice = '';
  if (isOutOfRange) {
    reason = `超出【${truckConfig.name}】外卖配送范围！该餐车当前仅支持 ${radiusKm.toFixed(1)} 公里以内极速专送，当前送达地址距离为 ${distanceKm.toFixed(2)} 公里（超出 ${exceededKm.toFixed(2)} 公里）。`;
    unsupportedNotice = `不支持 ${radiusKm.toFixed(1)} 公里以外的距离（当前相距 ${distanceKm.toFixed(2)} km）`;
  } else if (isDelivery) {
    reason = `在配送范围内（当前距离 ${distanceKm.toFixed(2)} km ≤ 配送半径 ${radiusKm.toFixed(1)} km），支持极速专送。`;
    unsupportedNotice = `支持 ${radiusKm.toFixed(1)} 公里内极速专送`;
  } else if (diningMode === 'pickup') {
    reason = `到车自提模式（距餐车 ${distanceKm.toFixed(2)} km），免配送费且不受外卖距离限制。`;
    unsupportedNotice = `自提模式无距离限制`;
  } else {
    reason = `餐车现场堂食模式，现场即点即烤。`;
    unsupportedNotice = `堂食模式现场就餐`;
  }

  // 寻找是否有其他餐车能够覆盖该地址
  let alternativeTruck: DeliveryRangeEvaluation['alternativeTruck'] = null;
  if (isOutOfRange) {
    const all = getAllTruckConfigs();
    const otherTrucks = all.filter((t) => t.id !== truckConfig.id && t.status === 'open');
    for (const other of otherTrucks) {
      const altDist = calculateGeodesicDistanceKm(
        other.latitude,
        other.longitude,
        targetCoords.latitude,
        targetCoords.longitude
      );
      if (altDist <= other.deliveryRadiusKm) {
        alternativeTruck = {
          id: other.id,
          name: other.name,
          distanceKm: altDist,
          radiusKm: other.deliveryRadiusKm,
          isInRange: true
        };
        break;
      }
    }
  }

  return {
    isOutOfRange,
    distanceKm,
    radiusKm,
    exceededKm,
    truckName: truckConfig.name,
    truckLocationName: truckConfig.locationName,
    targetAddress: addressString,
    diningMode,
    reason,
    unsupportedNotice,
    canSwitchToPickup: true,
    canChangeAddress: true,
    alternativeTruck
  };
}

/**
 * 订阅全网餐车与定位配置变动
 */
export function subscribeTruckLocationEvents(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = () => callback();
  window.addEventListener(TRUCK_LOCATION_EVENT, handler);
  window.addEventListener(USER_LOCATION_EVENT, handler);

  return () => {
    window.removeEventListener(TRUCK_LOCATION_EVENT, handler);
    window.removeEventListener(USER_LOCATION_EVENT, handler);
  };
}

/**
 * 触发浏览器真实 GPS 硬件定位
 */
export async function requestBrowserGeolocation(): Promise<{
  success: boolean;
  latitude: number;
  longitude: number;
  accuracy: number;
  error?: string;
}> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({
        success: false,
        latitude: DEFAULT_USER_LOCATION.latitude,
        longitude: DEFAULT_USER_LOCATION.longitude,
        accuracy: 100,
        error: '浏览器不支持 Geolocation API'
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = Math.round(pos.coords.accuracy || 20);

        saveUserLocationState({
          latitude: lat,
          longitude: lng,
          locationName: '高精度 GPS 实时定位',
          source: 'gps',
          accuracy: acc
        });

        resolve({
          success: true,
          latitude: lat,
          longitude: lng,
          accuracy: acc
        });
      },
      (err) => {
        console.warn('[Geolocation] 获取 GPS 定位失败，采用默认商圈位置:', err.message);
        resolve({
          success: false,
          latitude: DEFAULT_USER_LOCATION.latitude,
          longitude: DEFAULT_USER_LOCATION.longitude,
          accuracy: 50,
          error: err.message
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 10000
      }
    );
  });
}

export const subscribeTruckConfigs = subscribeTruckLocationEvents;

export interface PresetTruckLocation {
  locationName: string;
  tag: string;
  defaultRadiusKm: number;
  latitude: number;
  longitude: number;
}

export const PRESET_TRUCK_LOCATIONS: PresetTruckLocation[] = [
  {
    locationName: '静安大悦城南广场 · 西藏北路曲阜路',
    tag: '核心商圈 / 年轻客群',
    defaultRadiusKm: 3.0,
    latitude: 31.2428,
    longitude: 121.4682
  },
  {
    locationName: '陆家嘴金融城北塔下沉广场',
    tag: '白领午市 / 高客单价',
    defaultRadiusKm: 2.5,
    latitude: 31.2389,
    longitude: 121.5032
  },
  {
    locationName: '新天地南里 · 马当路兴业路交叉口',
    tag: '夜市经济 / 夜宵微醺',
    defaultRadiusKm: 3.5,
    latitude: 31.2185,
    longitude: 121.4751
  },
  {
    locationName: '徐汇西岸穹顶艺术中心外广场',
    tag: '周末市集 / 艺术展览',
    defaultRadiusKm: 4.0,
    latitude: 31.1684,
    longitude: 121.4589
  }
];

/**
 * 保存单个餐车配置
 */
export function saveTruckConfig(config: Partial<TruckLocationConfig> & { id: string }): void {
  const all = getAllTruckConfigs();
  const index = all.findIndex((t) => t.id === config.id);
  let updated: TruckLocationConfig[];
  if (index >= 0) {
    updated = [...all];
    updated[index] = { ...updated[index], ...config, updatedAt: new Date().toLocaleString('zh-CN') };
  } else {
    const fullConfig: TruckLocationConfig = {
      id: config.id,
      name: config.name || '流动餐车',
      code: config.code || 'TRUCK-NEW',
      locationName: config.locationName || '上海核心商圈',
      latitude: config.latitude || 31.2428,
      longitude: config.longitude || 121.4682,
      deliveryRadiusKm: config.deliveryRadiusKm || 3.0,
      status: config.status || 'open',
      updatedAt: new Date().toLocaleString('zh-CN')
    };
    updated = [...all, fullConfig];
  }
  saveAllTruckConfigs(updated);
}
