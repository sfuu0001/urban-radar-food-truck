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
  isFallback?: boolean; // 是否为降级/不可靠位置(无真实 GPS 或精度过低)
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

// 餐车默认停靠点(中性演示基准, 可被用户「保存并广播」覆盖; 不再是写死上海)
// 首启/清空后回退到这里; 用户保存后配置随部署链接 #cfg hash 稳定携带, 不再回退
export const DEFAULT_TRUCK_CONFIGS: TruckLocationConfig[] = [
  {
    id: 'truck-01',
    name: '黑曜石 01 号流动餐车',
    code: 'OBSIDIAN-ALPHA-01',
    locationName: '示例停靠点 · 三宝郡庭(默认演示, 可编辑)',
    latitude: 30.3008,
    longitude: 120.1255,
    deliveryRadiusKm: 3.0,
    status: 'open',
    minDeliveryAmount: 35,
    baseDeliveryFee: 5,
    updatedAt: '2026-09-06 00:00:00'
  },
  {
    id: 'truck-02',
    name: '黑曜石 02 号流动餐车',
    code: 'OBSIDIAN-BETA-02',
    locationName: '示例停靠点 · 城北(默认演示, 可编辑)',
    latitude: 30.3050,
    longitude: 120.1300,
    deliveryRadiusKm: 2.5,
    status: 'open',
    minDeliveryAmount: 40,
    baseDeliveryFee: 6,
    updatedAt: '2026-09-06 00:00:00'
  },
  {
    id: 'truck-03',
    name: '黑曜石 03 号流动餐车',
    code: 'OBSIDIAN-GAMMA-03',
    locationName: '示例停靠点 · 城西(默认演示, 可编辑)',
    latitude: 30.2960,
    longitude: 120.1200,
    deliveryRadiusKm: 3.5,
    status: 'open',
    minDeliveryAmount: 35,
    baseDeliveryFee: 5,
    updatedAt: '2026-09-06 00:00:00'
  },
  {
    id: 'truck-04',
    name: '黑曜石 04 号流动餐车',
    code: 'OBSIDIAN-DELTA-04',
    locationName: '示例停靠点 · 城东(默认演示, 可编辑)',
    latitude: 30.3100,
    longitude: 120.1180,
    deliveryRadiusKm: 4.0,
    status: 'open',
    minDeliveryAmount: 45,
    baseDeliveryFee: 8,
    updatedAt: '2026-09-06 00:00:00'
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

// 中性占位: 不再是「写死上海」。真实坐标始终来自 GPS 收敛定位或地址检索,
// 不会在 0,0 时跳回某个写死城市。0,0 仅作「尚未定位」占位。
export const DEFAULT_USER_LOCATION: UserLocationState = {
  latitude: 0,
  longitude: 0,
  locationName: '尚未获取定位（请点 GPS 或检索地址）',
  addressDetail: '',
  source: 'preset',
  accuracy: undefined,
  isFallback: true,
  lastUpdated: new Date().toLocaleTimeString('zh-CN')
};

// Storage Keys & Events
const STORAGE_KEY_TRUCKS = 'obsidian_truck_location_configs';
const STORAGE_KEY_ACTIVE_TRUCK_ID = 'obsidian_active_truck_id';
const STORAGE_KEY_USER_LOCATION = 'obsidian_user_location_state';
const STORAGE_KEY_ADDRESS_LIST = 'obsidian_saved_delivery_addresses';

export const TRUCK_LOCATION_EVENT = 'obsidian_truck_location_changed';
export const USER_LOCATION_EVENT = 'obsidian_user_location_changed';

// —— URL hash 持久层 ——
// 部署(CloudStudio / iframe)环境的 localStorage 在刷新/重开/跨会话后不持久,
// 会导致 getAllTruckConfigs() 回退到 DEFAULT_TRUCK_CONFIGS(原写死上海「回上海」)。
// 因此把餐车配置同时编码进部署链接的 #cfg, 打开页面优先从 hash 恢复,
// 让「保存的真实坐标」随链接稳定携带, 彻底根治「回上海」。
const HASH_CFG_KEY = 'cfg';

function encodeHashConfigs(configs: TruckLocationConfig[]): string {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(configs))));
  } catch {
    return '';
  }
}

function decodeHashConfigs(): TruckLocationConfig[] | null {
  if (typeof window === 'undefined' || !window.location || !window.location.hash) return null;
  try {
    const m = window.location.hash.match(/cfg=([^&]+)/);
    if (!m) return null;
    const json = decodeURIComponent(escape(atob(m[1])));
    const arr = JSON.parse(json);
    if (Array.isArray(arr) && arr.length > 0 && arr[0] && typeof arr[0].id === 'string') {
      return arr as TruckLocationConfig[];
    }
    return null;
  } catch {
    return null;
  }
}

function writeHashConfigs(configs: TruckLocationConfig[]): void {
  if (typeof window === 'undefined' || !window.history || !window.location) return;
  try {
    const encoded = encodeHashConfigs(configs);
    if (!encoded) return;
    const others = window.location.hash
      .replace(/^#/, '')
      .split('&')
      .filter((p) => p && !p.startsWith(HASH_CFG_KEY + '='))
      .join('&');
    const newHash = (others ? others + '&' : '') + HASH_CFG_KEY + '=' + encoded;
    window.history.replaceState(null, '', '#' + newHash);
  } catch {
    /* hash 写入失败静默忽略 */
  }
}

/**
 * 获取所有餐车的定位与配送范围配置列表
 * 读取优先级: URL hash → localStorage → 中性默认(杭州演示点, 可编辑)
 */
export function getAllTruckConfigs(): TruckLocationConfig[] {
  const fromHash = decodeHashConfigs();
  if (fromHash && fromHash.length > 0) return fromHash;
  const fromLs = safeGetStorage<TruckLocationConfig[]>(STORAGE_KEY_TRUCKS, DEFAULT_TRUCK_CONFIGS);
  if (fromLs && fromLs.length > 0) {
    writeHashConfigs(fromLs); // 把 localStorage 镜像进 hash, 后续刷新从 hash 读
    return fromLs;
  }
  return DEFAULT_TRUCK_CONFIGS;
}

/**
 * 保存并广播所有餐车配置列表
 */
export function saveAllTruckConfigs(configs: TruckLocationConfig[]): void {
  safeSetStorage(STORAGE_KEY_TRUCKS, configs);
  writeHashConfigs(configs); // 关键: 同步进部署链接 hash, 刷新/重开不丢
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

/* =========================================================================
 * 坐标系工具: WGS-84 (GPS/OSM 原生) ↔ GCJ-02 (高德/国内地图加密坐标)
 * 高德瓦片使用 GCJ-02; 浏览器 GPS 返回 WGS-84, 若直接叠加会偏移数百米。
 * 本引擎统一约定: 面向地图的坐标一律先转 GCJ-02 再落盘/回调, 保证「所见即所存」。
 * ========================================================================= */

const GCJ_A = 6378245.0;
const GCJ_EE = 0.00669342162296594323;
const PI = Math.PI;

function isOutOfChina(lat: number, lng: number): boolean {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
}

function _transformLat(x: number, y: number): number {
  let ret =
    -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  ret += ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) / 3.0;
  ret += ((20.0 * Math.sin(y * PI) + 40.0 * Math.sin((y / 3.0) * PI)) * 2.0) / 3.0;
  ret += ((160.0 * Math.sin((y / 12.0) * PI) + 320.0 * Math.sin((y * PI) / 30.0)) * 2.0) / 3.0;
  return ret;
}

function _transformLng(x: number, y: number): number {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  ret += ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) / 3.0;
  ret += ((20.0 * Math.sin(x * PI) + 40.0 * Math.sin((x / 3.0) * PI)) * 2.0) / 3.0;
  ret += ((150.0 * Math.sin((x / 12.0) * PI) + 300.0 * Math.sin((x / 30.0) * PI)) * 2.0) / 3.0;
  return ret;
}

/** WGS-84 → GCJ-02（境外坐标原样返回） */
export function wgs84ToGcj02(
  lat: number,
  lng: number
): { latitude: number; longitude: number } {
  if (isOutOfChina(lat, lng)) return { latitude: lat, longitude: lng };
  let dLat = _transformLat(lng - 105.0, lat - 35.0);
  let dLng = _transformLng(lng - 105.0, lat - 35.0);
  const radLat = (lat / 180.0) * PI;
  let magic = Math.sin(radLat);
  magic = 1 - GCJ_EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / (((GCJ_A * (1 - GCJ_EE)) / (magic * sqrtMagic)) * PI);
  dLng = (dLng * 180.0) / ((GCJ_A / sqrtMagic) * Math.cos(radLat) * PI);
  return { latitude: lat + dLat, longitude: lng + dLng };
}

/** GCJ-02 → WGS-84（近似逆向，境外坐标原样返回） */
export function gcj02ToWgs84(
  lat: number,
  lng: number
): { latitude: number; longitude: number } {
  if (isOutOfChina(lat, lng)) return { latitude: lat, longitude: lng };
  const g = wgs84ToGcj02(lat, lng);
  return {
    latitude: lat * 2 - g.latitude,
    longitude: lng * 2 - g.longitude
  };
}

/** 便捷转换: 把「不确定来源」的坐标按境内规则安全转到 GCJ-02 */
export function toGcj02(lat: number, lng: number): { latitude: number; longitude: number } {
  return wgs84ToGcj02(lat, lng);
}

/* =========================================================================
 * 高德开放平台 Key（可选增强）
 * 无 Key: 高德瓦片照常显示(仅需 tile URL, 无需授权), 地理编码走 OSM Nominatim(免费)。
 * 有 Key: 解锁高德 POI 联想 / 逆地理 / 结构化地址检索, 中文检索质量大幅提升。
 * ========================================================================= */

export const AMAP_KEY_STORAGE_KEY = 'obsidian_amap_web_key';
export const AMAP_KEY_EVENT = 'obsidian_amap_key_changed';

/** 内置默认高德 Key(项目方个人开发者 Key), 无需用户配置即可启用高德检索。
 *  用户若在面板粘贴自己的 Key 会存入 localStorage 覆盖内置 Key。 */
export const BUILTIN_AMAP_KEY = 'b0797b94709c104f0bfbaac1aa222a2a';

/** 当前生效的高德 Key: localStorage 自定义 Key 优先, 否则回退内置 Key */
export function getAmapWebKey(): string {
  if (typeof window === 'undefined') return BUILTIN_AMAP_KEY;
  try {
    const custom = (window.localStorage.getItem(AMAP_KEY_STORAGE_KEY) || '').trim();
    return custom || BUILTIN_AMAP_KEY;
  } catch {
    return BUILTIN_AMAP_KEY;
  }
}

/** 是否使用内置 Key(用于 UI 展示来源) */
export function isUsingBuiltinAmapKey(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return !((window.localStorage.getItem(AMAP_KEY_STORAGE_KEY) || '').trim());
  } catch {
    return true;
  }
}

export function saveAmapWebKey(key: string): string {
  const trimmed = (key || '').trim();
  try {
    if (trimmed) window.localStorage.setItem(AMAP_KEY_STORAGE_KEY, trimmed);
    else window.localStorage.removeItem(AMAP_KEY_STORAGE_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(AMAP_KEY_EVENT, { detail: trimmed }));
    }
  } catch {
    /* storage 不可用时静默 */
  }
  return trimmed;
}

/** 带超时的 fetch JSON 助手 */
async function fetchJson(url: string, timeoutMs = 8000): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* =========================================================================
 * 环境检测: iframe 定位策略 / 权限状态 —— 决定 UI 该走「GPS / 新标签页授权 / 文本检索」
 * ========================================================================= */

export type GeoBlockReason = 'none' | 'unsupported' | 'denied' | 'iframe-policy' | 'timeout' | 'unavailable' | 'low-accuracy';

export function isEmbeddedFrame(): boolean {
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch {
    return true; // 跨源 iframe 访问 top 会抛错 → 视为嵌入
  }
}

export function isGeolocationSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.geolocation;
}

/** 预检定位权限: 返回 'granted' | 'prompt' | 'denied' | 'unsupported' */
export async function detectGeoPermission(): Promise<'granted' | 'prompt' | 'denied' | 'unsupported'> {
  if (!isGeolocationSupported()) return 'unsupported';
  try {
    const perms = (navigator as any).permissions;
    if (perms && typeof perms.query === 'function') {
      const status = await perms.query({ name: 'geolocation' });
      if (status && status.state) return status.state;
    }
  } catch {
    /* 部分浏览器不支持 permissions API, 继续走实际请求 */
  }
  return 'prompt';
}

/* =========================================================================
 * GPS 高精度定位参数（收敛式定位, 解决「定位不精准」）
 * ========================================================================= */
const GPS_DESIRED_ACCURACY_M = 25; // 期望收敛精度(米): 达到即返回
const GPS_ACCEPT_ACCURACY_M = 100; // 可接受最大误差(米): 超出视为不可靠(降级)
const GPS_BUDGET_MS = 12000; // 整体收敛预算: 单次 getCurrentPosition + watchPosition 总时长
const GPS_WATCH_MAX_MS = 9000; // watchPosition 持续监听最长时长
const GPS_TIMEOUT_MS = 8000; // 单次请求超时(毫秒)

/**
 * 触发浏览器真实 GPS（WGS-84 原生）并转 GCJ-02 返回。
 *
 * 收敛式定位策略:
 *  1. 先 getCurrentPosition 拿初值(高精度, 超时 8s);
 *  2. 若初值精度 > 期望值, 自动升级为 watchPosition 持续监听,
 *     在 GPS_WATCH_MAX_MS 内不断取精度更优的解, 达到 GPS_DESIRED_ACCURACY_M 即停;
 *  3. 全程保留「误差最小」的一次结果, 结束统一转换 GCJ-02;
 *  4. 精度 ≤ GPS_ACCEPT_ACCURACY_M 视为可靠; 否则 isFallback 标注;
 *  5. 彻底失败时沿用上一次真实定位(降级) 或明确失败, 不伪造坐标;
 *  6. 返回结构带 blockReason, 供 UI 判定 iframe 策略拦截并引导「新标签页授权」。
 */
export async function requestBrowserGeolocation(): Promise<{
  success: boolean;
  latitude: number;
  longitude: number;
  accuracy: number;
  isFallback?: boolean;
  error?: string;
  blockReason?: GeoBlockReason;
}> {
  return new Promise((resolve) => {
    if (!isGeolocationSupported()) {
      resolve({ success: false, latitude: 0, longitude: 0, accuracy: Infinity, error: '浏览器不支持 Geolocation API', blockReason: 'unsupported' });
      return;
    }

    let best: { lat: number; lng: number; acc: number } | null = null;
    let watchId: number | null = null;
    let settled = false;
    const embedded = isEmbeddedFrame();

    const cleanup = () => {
      if (watchId !== null && typeof navigator !== 'undefined') {
        try { navigator.geolocation.clearWatch(watchId); } catch { /* ignore */ }
        watchId = null;
      }
    };

    const finish = (blockReason: GeoBlockReason, lowAccOnly?: boolean) => {
      if (settled) return;
      settled = true;
      cleanup();

      if (best) {
        const isReliable = best.acc <= GPS_ACCEPT_ACCURACY_M;
        const gcj = wgs84ToGcj02(best.lat, best.lng);
        saveUserLocationState({
          latitude: gcj.latitude,
          longitude: gcj.longitude,
          locationName: isReliable ? '高精度 GPS 实时定位' : 'GPS 定位(精度较低)',
          addressDetail: '',
          source: 'gps',
          accuracy: best.acc,
          isFallback: !isReliable
        });
        resolve({
          success: isReliable && !lowAccOnly,
          latitude: gcj.latitude,
          longitude: gcj.longitude,
          accuracy: best.acc,
          isFallback: !isReliable,
          error: isReliable ? undefined : `定位精度不足(±${best.acc}m),建议到空旷处或授权后重试`,
          blockReason
        });
        return;
      }

      // 彻底失败: 降级沿用上一次真实定位
      const prev = getUserLocationState();
      const hasReal = !!prev && prev.source === 'gps' && !!prev.latitude;
      if (hasReal) {
        resolve({
          success: false,
          latitude: prev.latitude,
          longitude: prev.longitude,
          accuracy: prev.accuracy || Infinity,
          isFallback: true,
          error: blockReason === 'denied' ? '定位权限被拒绝,已沿用上次定位' : '定位超时/失败,已沿用上次定位',
          blockReason
        });
      } else {
        resolve({ success: false, latitude: 0, longitude: 0, accuracy: Infinity, error: '定位失败,请检查权限或网络', blockReason });
      }
    };

    const startWatch = (deadline: number) => {
      if (settled || watchId !== null) return;
      try {
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const acc = Math.round(pos.coords.accuracy || 99999);
            if (!best || acc < best.acc) {
              best = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc };
            }
            if (best && best.acc <= GPS_DESIRED_ACCURACY_M) {
              finish('none');
            } else if (Date.now() >= deadline) {
              finish(best && best.acc > GPS_ACCEPT_ACCURACY_M ? 'low-accuracy' : 'none', true);
            }
          },
          (err) => {
            const code = (err && err.code) || 0;
            if (code === err.PERMISSION_DENIED || code === 1) {
              finish(embedded ? 'iframe-policy' : 'denied');
            } else if (Date.now() >= deadline) {
              finish('timeout');
            }
          },
          { enableHighAccuracy: true, timeout: GPS_TIMEOUT_MS, maximumAge: 0 }
        );
      } catch {
        finish('unavailable');
      }
    };

    // 阶段1: 快速单次定位
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const acc = Math.round(pos.coords.accuracy || 99999);
          best = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc };
          if (acc <= GPS_DESIRED_ACCURACY_M) {
            finish('none');
          } else {
            // 精度不够 → 阶段2 watch 收敛
            startWatch(Date.now() + GPS_WATCH_MAX_MS);
          }
        },
        (err) => {
          const code = (err && err.code) || 0;
          if (code === 1 || code === err.PERMISSION_DENIED) {
            // 权限拒绝: 嵌入态多半是 iframe 策略拦截
            finish(embedded ? 'iframe-policy' : 'denied');
          } else {
            // 其它错误(超时/不可用): 仍尝试 watch 兜底
            startWatch(Date.now() + GPS_WATCH_MAX_MS);
          }
        },
        { enableHighAccuracy: true, timeout: GPS_TIMEOUT_MS, maximumAge: 0 }
      );
    } catch {
      finish('unavailable');
    }

    // 安全兜底: 预算耗尽强制收尾(避免 watch 一直空转)
    setTimeout(() => {
      if (!settled) finish(best && best.acc > GPS_ACCEPT_ACCURACY_M ? 'low-accuracy' : 'timeout', true);
    }, GPS_BUDGET_MS + 500);
  });
}

/* =========================================================================
 * 地址检索 / 逆地理编码（多源级联: 高德 Key 优先, OSM Nominatim 兜底）
 * 统一返回 GCJ-02 坐标, 与地图/存储口径一致。
 * ========================================================================= */

export interface PlaceSuggestion {
  id: string;
  title: string; // 主名: POI 名 / 地址名
  detail: string; // 副描述: 区域 + 详细地址
  latitude: number; // GCJ-02
  longitude: number;
  source: 'amap' | 'osm';
  type?: string;
}

function _nominatimSuggestion(q: string): Promise<PlaceSuggestion[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&accept-language=zh-CN&q=${encodeURIComponent(q)}`;
  return fetchJson(url).then((data: any) => {
    if (!Array.isArray(data)) return [];
    return data
      .map((item: any, i: number) => {
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        if (isNaN(lat) || isNaN(lon)) return null;
        const gcj = wgs84ToGcj02(lat, lon);
        const parts: string[] = [];
        const ad = item.address || {};
        if (ad.country && ad.country !== '中国') parts.push(ad.country);
        const region = ad.city || ad.state || ad.province || '';
        const sub = ad.town || ad.county || ad.city_district || ad.suburb || '';
        parts.push(region, sub);
        const detail = parts.filter(Boolean).join(' ') || (item.display_name || '').slice(0, 40);
        return {
          id: `osm-${i}-${Date.now()}`,
          title: item.name || sub || item.display_name?.split(',').slice(-3, -1).join('') || '检索结果',
          detail,
          latitude: Number(gcj.latitude.toFixed(6)),
          longitude: Number(gcj.longitude.toFixed(6)),
          source: 'osm' as const
        };
      })
      .filter(Boolean) as PlaceSuggestion[];
  });
}

async function _amapSuggestion(q: string): Promise<PlaceSuggestion[]> {
  const key = getAmapWebKey();
  if (!key) return [];
  const url = `https://restapi.amap.com/v3/assistant/inputtips?keywords=${encodeURIComponent(q)}&key=${encodeURIComponent(key)}&datatype=all&citylimit=false`;
  const data = await fetchJson(url);
  if (!data || data.status !== '1' || !Array.isArray(data.tips)) return [];
  return (data.tips as any[])
    .filter((t: any) => t.location && t.location.includes(','))
    .map((t: any, i: number) => {
      const [lng, lat] = t.location.split(',').map(Number);
      const title = t.name || '';
      const district = t.district || '';
      const address = t.address || '';
      const detail = [district, address].filter(Boolean).join(' ') || district;
      return {
        id: `amap-${t.id || i}-${Date.now()}`,
        title,
        detail,
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lng.toFixed(6)),
        source: 'amap' as const,
        type: (t.type || '').split(';').pop() || 'POI'
      };
    });
}

/**
 * 地址联想（搜索框下拉）: 高德 inputtips → 失败/无 Key 自动降级 OSM Nominatim
 */
export async function suggestPlaces(query: string): Promise<PlaceSuggestion[]> {
  const q = (query || '').trim();
  if (!q || q.length < 1) return [];
  if (getAmapWebKey()) {
    const amap = await _amapSuggestion(q);
    if (amap.length) return amap;
  }
  return _nominatimSuggestion(q);
}

/**
 * 文本地址 → GCJ-02 经纬度（高德结构化地理编码优先, OSM 兜底并转 GCJ-02）
 */
export async function geocodeAddress(
  text: string
): Promise<{ latitude: number; longitude: number } | null> {
  const q = (text || '').trim();
  if (!q) return null;

  // 高德结构化地址解析
  const key = getAmapWebKey();
  if (key) {
    const url = `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(q)}&key=${encodeURIComponent(key)}`;
    const amap = await fetchJson(url);
    const geocode = amap?.geocodes?.[0];
    if (geocode?.location) {
      const [lng, lat] = geocode.location.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) return { latitude: lat, longitude: lng };
    }
  }

  // OSM 兜底
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=zh-CN&q=${encodeURIComponent(q)}`;
  const data = await fetchJson(url);
  if (Array.isArray(data) && data.length > 0) {
    const lat = parseFloat(data[0].lat);
    const lon = parseFloat(data[0].lon);
    if (!isNaN(lat) && !isNaN(lon)) {
      const gcj = wgs84ToGcj02(lat, lon);
      return { latitude: gcj.latitude, longitude: gcj.longitude };
    }
  }
  return null;
}

export interface ReverseGeocodeResult {
  locationName: string; // 简短可读名称
  addressDetail: string; // 完整地址
  raw?: string;
}

/**
 * 逆地理编码: GCJ-02 坐标 → 地址文本
 * 高德 regeo 优先; 无 Key 时转 WGS-84 走 OSM reverse, 返回结果裁剪为中文短地址。
 */
export async function reverseGeocodeCoordinate(
  latitude: number,
  longitude: number
): Promise<ReverseGeocodeResult | null> {
  const key = getAmapWebKey();
  if (key) {
    const url = `https://restapi.amap.com/v3/geocode/regeo?location=${longitude.toFixed(6)},${latitude.toFixed(6)}&key=${encodeURIComponent(key)}&extensions=base&radius=1000`;
    const data = await fetchJson(url);
    const rc = data?.regeocode;
    if (rc?.formatted_address) {
      const ac = rc.addressComponent || {};
      const district = ac.district || ac.township || '';
      const road = (rc.roads && rc.roads[0] && rc.roads[0].name) || '';
      const aois = rc.aois || [];
      const poiName = aois[0]?.name || rc.pois?.[0]?.name || '';
      return {
        locationName: [district, road, poiName].filter(Boolean).join(' · ') || ac.city || '当前位置',
        addressDetail: rc.formatted_address,
        raw: rc.formatted_address
      };
    }
  }

  // OSM reverse 兜底
  const wgs = gcj02ToWgs84(latitude, longitude);
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&accept-language=zh-CN&lat=${wgs.latitude.toFixed(6)}&lon=${wgs.longitude.toFixed(6)}&zoom=18`;
  const data = await fetchJson(url);
  if (data && (data.display_name || data.name || data.address)) {
    const ad = data.address || {};
    const street = ad.road || ad.pedestrian || ad.footway || '';
    const house = ad.house_number || '';
    const district = ad.city_district || ad.suburb || ad.town || ad.county || '';
    const city = ad.city || ad.state || '';
    const poi = ad.amenity || ad.building || ad.shop || data.name || '';
    const title = poi || (street && (house ? `${street}${house}` : street)) || district || city;
    const detailParts = [city, district, street, house].filter(Boolean);
    return {
      locationName: title,
      addressDetail: detailParts.join(' ') || (data.display_name || '').slice(0, 60),
      raw: data.display_name
    };
  }
  return null;
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
    locationName: '三宝郡庭 · 拱墅核心区',
    tag: '示例商圈 / 年轻客群',
    defaultRadiusKm: 3.0,
    latitude: 30.3008,
    longitude: 120.1255
  },
  {
    locationName: '西湖文化广场 · 武林商圈',
    tag: '白领午市 / 高客单价',
    defaultRadiusKm: 2.5,
    latitude: 30.2765,
    longitude: 120.1540
  },
  {
    locationName: '武林银泰 · 延安路步行街',
    tag: '夜市经济 / 夜宵微醺',
    defaultRadiusKm: 3.5,
    latitude: 30.2741,
    longitude: 120.1650
  },
  {
    locationName: '钱江新城 · 市民中心',
    tag: '周末市集 / 艺术展览',
    defaultRadiusKm: 4.0,
    latitude: 30.2460,
    longitude: 120.2120
  }
];

/**
 * 保存单个餐车配置
 */
export function saveTruckConfig(config: Partial<TruckLocationConfig> & { id: string }): void {
  const all = getAllTruckConfigs();
  const index = all.findIndex((t) => t.id === config.id);
  const existing = index >= 0 ? all[index] : undefined;
  // 关键: 绝不写死兜底坐标 —— 传入的坐标(经纬度)优先; 缺失时保留既有记录, 杜绝「跳回上海」
  const pickLat = typeof config.latitude === 'number' ? config.latitude : existing?.latitude ?? 0;
  const pickLng = typeof config.longitude === 'number' ? config.longitude : existing?.longitude ?? 0;
  const pickName = config.locationName || existing?.locationName || '未命名停靠点';
  const pickRadius =
    typeof config.deliveryRadiusKm === 'number' ? config.deliveryRadiusKm : existing?.deliveryRadiusKm ?? 3.0;
  const pickStatus = config.status || existing?.status || 'open';

  let updated: TruckLocationConfig[];
  if (existing) {
    updated = [...all];
    updated[index] = {
      ...existing,
      ...config,
      latitude: pickLat,
      longitude: pickLng,
      locationName: pickName,
      deliveryRadiusKm: pickRadius,
      status: pickStatus,
      updatedAt: new Date().toLocaleString('zh-CN')
    };
  } else {
    const fullConfig: TruckLocationConfig = {
      id: config.id,
      name: config.name || '流动餐车',
      code: config.code || 'TRUCK-NEW',
      locationName: pickName,
      latitude: pickLat,
      longitude: pickLng,
      deliveryRadiusKm: pickRadius,
      status: pickStatus,
      updatedAt: new Date().toLocaleString('zh-CN')
    };
    updated = [...all, fullConfig];
  }
  saveAllTruckConfigs(updated);
}
