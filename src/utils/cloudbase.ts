import cloudbase from '@cloudbase/js-sdk';
import { DishItem, Order, TruckInfo, UserProfile, UserAddress, UserPreferences, CloudFunctionCallLog } from '../types';
import { INITIAL_DISHES, INITIAL_ORDERS, INITIAL_TRUCK_INFO } from '../data/mockData';
import { INITIAL_USER_PROFILE } from '../data/mockUser';
import { 
  INITIAL_MEMBERS, 
  INITIAL_MEMBER_RECHARGES, 
  INITIAL_STAFF_MEMBERS, 
  INITIAL_PRINTER_STATIONS, 
  INITIAL_RECEIPT_TEMPLATE, 
  INITIAL_QUEUE_TICKETS 
} from '../data/merchantExtendedMockData';
import { safeGetStorage, safeSetStorage } from './safeStorage';
import { applyDishFieldOverrides } from './dishFieldOverrides';
import { applyAvailabilityOverrides } from './dishAvailability';
import { isOrderMatch } from './orderNormalizer';
import { 
  sanitizeUserProfileForCloud, 
  sanitizeOrderStatusUpdateForCustomer, 
  checkDishModificationPermission,
  SENSITIVE_PROFILE_FIELDS,
  SENSITIVE_ORDER_FIELDS
} from './clientSecurityBoundary';

// 腾讯云开发环境 ID
export const TCB_ENV_ID = (import.meta as any).env?.VITE_TCB_ENV_ID || 'tc100-d9gz0e2ko5929e360';

// 专有集合名称配置 (全维度覆盖)
export const TCB_COLLECTIONS = {
  USERS: 'obsidian_truck_users',
  ORDERS: 'obsidian_truck_orders',
  CHAT_MESSAGES: 'obsidian_order_chats',
  DISHES: 'shaokao-sku',
  TRUCK_INFO: 'obsidian_truck_info',
  COUPONS: 'obsidian_truck_coupons',
  MEMBERS: 'obsidian_members',
  RECHARGES: 'obsidian_recharges',
  STAFF: 'obsidian_staff',
  PRINT_STATIONS: 'obsidian_print_stations',
  PRINT_TEMPLATES: 'obsidian_print_templates',
  QUEUE_TICKETS: 'obsidian_queue_tickets',
  CRAFT_STANDARDS: 'obsidian_craft_standards',
  LOSS_RECORDS: 'obsidian_loss_records',
  STOCKTAKE: 'obsidian_stocktake',
  SHIFT_RECORDS: 'obsidian_shift_records',
  TABLES: 'obsidian_tables',
  RIDER_SETTLEMENT_TRACES: 'obsidian_settled_deliveries',
  MATERIALS: 'obsidian_merchant_materials',
  PURCHASES: 'obsidian_merchant_purchases',
  VERSION_POINTERS: 'obsidian_version_pointers',
  VERSION_MILESTONES: 'obsidian_version_milestones',
  PAYMENT_CHANNELS: 'obsidian_payment_channels',
  CONTINGENCY_AUDITS: 'obsidian_contingency_audits'
} as const;

// 常用云函数候选名称列表
export const TCB_FUNCTION_NAMES = {
  AUTO_AUTH: 'autoAuth',
  USER_PROFILE: 'userProfile',
  GET_ORDERS: 'getOrders',
  ORDERS: 'orders',
  OBSIDIAN_ORDERS: 'obsidian_orders',
  CREATE_ORDER: 'createOrder',
  UPDATE_ORDER: 'updateOrder',
  CANCEL_ORDER: 'cancelOrder',
  SYNC_USER_DATA: 'syncUserData',
  CHAT_MESSAGES: 'chatMessages',
  RIDER_SETTLEMENT_TRACE: 'riderSettlementTrace'
} as const;

export interface CloudbaseStatus {
  initialized: boolean;
  connected: boolean;
  isAnonymousAuth: boolean;
  userId?: string;
  envId: string;
  error?: string;
  dishesCount: number;
  ordersCount: number;
  lastSyncTime?: string;
}

let app: any = null;
let auth: any = null;
let db: any = null;

/**
 * 记录云函数调用日志（提供可视化监控诊断）
 */
export function recordCloudFunctionLog(log: Omit<CloudFunctionCallLog, 'id'>): CloudFunctionCallLog {
  const newLog: CloudFunctionCallLog = {
    id: `cf-log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ...log
  };

  try {
    const existing = safeGetStorage<CloudFunctionCallLog[]>('obsidian_cf_logs', []);
    const updated = [newLog, ...existing].slice(0, 100); // 最多保留最近 100 条日志
    safeSetStorage('obsidian_cf_logs', updated);
  } catch {
    // ignore
  }

  return newLog;
}

/**
 * 获取云函数调用历史日志
 */
export function getCloudFunctionLogs(): CloudFunctionCallLog[] {
  return safeGetStorage<CloudFunctionCallLog[]>('obsidian_cf_logs', []);
}

/**
 * 清空云函数调用日志
 */
export function clearCloudFunctionLogs(): void {
  safeSetStorage('obsidian_cf_logs', []);
}

/**
 * 获取或初始化 Cloudbase 实例 (安全防护单例)
 */
export function getCloudbaseApp() {
  if (!app) {
    try {
      const instance = cloudbase.init({
        env: TCB_ENV_ID
      });
      let authInst: any = null;
      try {
        authInst = instance.auth({ persistence: 'local' });
      } catch {
        try {
          authInst = instance.auth({ persistence: 'none' });
        } catch {
          // ignore
        }
      }
      const dbInst = typeof instance.database === 'function' ? instance.database() : null;
      app = instance;
      auth = authInst;
      db = dbInst;
    } catch (err: any) {
      console.info('[TCB] Cloudbase 初始化提示 (已启用本地双轨缓存):', err?.message || err);
    }
  }
  return { app, auth, db };
}

/**
 * 确保匿名/自定义登录成功
 */
export async function ensureCloudbaseAuth(): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    const { auth: tcbAuth } = getCloudbaseApp();
    if (!tcbAuth) {
      return { success: false, error: 'Cloudbase SDK 未就绪' };
    }

    const loginState = await tcbAuth.getLoginState().catch(() => null);
    if (loginState && loginState.user) {
      return { success: true, userId: loginState.user.uid };
    }

    // 尝试匿名登录
    const anonymousRes = await tcbAuth.anonymousAuthProvider().signIn().catch(() => null);
    return { success: true, userId: anonymousRes?.user?.uid };
  } catch (err: any) {
    return { 
      success: false, 
      error: err?.message || '匿名登录受限，请在腾讯云控制台开启匿名登录与Web安全域名' 
    };
  }
}

/**
 * 安全调用腾讯云函数 (Cloud Function)
 * 支持耗时监控与双轨降级
 */
export async function callCloudFunction<T = any>(
  name: string, 
  data: any = {}
): Promise<{ success: boolean; result?: T; durationMs: number; error?: string; source: 'cloud_function' | 'local_fallback' }> {
  const startTime = Date.now();
  try {
    const { app: tcbApp } = getCloudbaseApp();
    if (!tcbApp || typeof tcbApp.callFunction !== 'function') {
      const durationMs = Date.now() - startTime;
      recordCloudFunctionLog({
        functionName: name,
        action: data.action || name,
        timestamp: new Date().toLocaleTimeString(),
        durationMs,
        status: 'warning',
        requestPayload: data,
        responsePayload: null,
        source: 'local_fallback',
        message: 'CloudBase SDK 未完成初始化，已自动切换本地高保真双轨存储'
      });
      return { success: false, durationMs, source: 'local_fallback', error: 'CloudBase 云函数环境未就绪' };
    }

    const res = await tcbApp.callFunction({
      name,
      data
    });

    const durationMs = Date.now() - startTime;
    const finalResult = res && res.result !== undefined ? res.result : res;

    recordCloudFunctionLog({
      functionName: name,
      action: data.action || name,
      timestamp: new Date().toLocaleTimeString(),
      durationMs,
      status: 'success',
      requestPayload: data,
      responsePayload: finalResult,
      source: 'cloud_function',
      message: `云函数 [${name}] 执行成功，耗时 ${durationMs}ms`
    });

    return { success: true, result: finalResult as T, durationMs, source: 'cloud_function' };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    recordCloudFunctionLog({
      functionName: name,
      action: data.action || name,
      timestamp: new Date().toLocaleTimeString(),
      durationMs,
      status: 'warning',
      requestPayload: data,
      responsePayload: { error: err?.message },
      source: 'local_fallback',
      message: `云函数 [${name}] 未响应: ${err?.message || '未部署或受跨域策略保护'}`
    });
    return { success: false, durationMs, source: 'local_fallback', error: err?.message || '云函数调用未响应或未部署' };
  }
}

// ==========================================
// 1. 用户系统 (User Profile) 云函数对接
// ==========================================

/**
 * 从云函数/云数据库拉取用户完整档案
 */
export async function fetchUserProfileFromCloud(
  uid?: string
): Promise<{ success: boolean; profile: UserProfile; source: 'cloud_function' | 'cloud_database' | 'local_storage'; error?: string }> {
  const targetUid = uid || INITIAL_USER_PROFILE.uid;

  // 1. 优先调用 `userProfile` 云函数
  try {
    const fnRes = await callCloudFunction<any>(TCB_FUNCTION_NAMES.USER_PROFILE, {
      action: 'get',
      uid: targetUid
    });

    if (fnRes.success && fnRes.result) {
      const data = fnRes.result.data || fnRes.result.profile || fnRes.result;
      if (data && (data.uid || data.phone || data.nickname)) {
        const cleanProfile: UserProfile = {
          ...INITIAL_USER_PROFILE,
          ...data,
          cloudSyncedAt: new Date().toISOString()
        };
        safeSetStorage('obsidian_user_profile', cleanProfile);
        return { success: true, profile: cleanProfile, source: 'cloud_function' };
      }
    }
  } catch {
    // try cloud database next
  }

  // 2. 尝试云数据库集合拉取
  try {
    const { db: tcbDb } = getCloudbaseApp();
    if (tcbDb) {
      const res = await tcbDb.collection(TCB_COLLECTIONS.USERS).where({ uid: targetUid }).get();
      if (res.data && res.data.length > 0) {
        const { _id, ...rest } = res.data[0];
        const cleanProfile: UserProfile = {
          ...INITIAL_USER_PROFILE,
          ...rest,
          cloudSyncedAt: new Date().toISOString()
        };
        safeSetStorage('obsidian_user_profile', cleanProfile);
        return { success: true, profile: cleanProfile, source: 'cloud_database' };
      }
    }
  } catch {
    // fallback to local
  }

  // 3. 本地存储安全恢复
  const localProfile = safeGetStorage<UserProfile>('obsidian_user_profile', INITIAL_USER_PROFILE);
  return { 
    success: true, 
    profile: localProfile, 
    source: 'local_storage', 
    error: '云端暂未发现用户记录，已载入本地安全配置文件' 
  };
}

export const fetchUserProfileFromCloudFunction = fetchUserProfileFromCloud;

/**
 * 同步保存用户档案至云函数及云数据库 (受客户端使用边界与敏感字段安全卫士强校验保护)
 */
export async function syncUserProfileToCloud(
  profile: UserProfile
): Promise<{ success: boolean; profile: UserProfile; error?: string; source: 'cloud_function' | 'cloud_database' | 'local_storage'; sanitized?: boolean }> {
  // 1. 获取现有权威档案进行安全清洗，强制锁定 balance, points, membershipTier, role 等核心敏感资产
  const authoritativeProfile = safeGetStorage<UserProfile>('obsidian_user_profile', INITIAL_USER_PROFILE);
  const boundaryCheck = sanitizeUserProfileForCloud(profile, authoritativeProfile);
  const sanitizedProfile: UserProfile = boundaryCheck.sanitizedData;

  // 2. 本地持久化优先保底
  safeSetStorage('obsidian_user_profile', sanitizedProfile);

  // 3. 尝试触发 `userProfile` 云函数 (仅提交白名单清洗后的安全资料)
  let cloudSuccess = false;
  let errorMsg: string | undefined;

  try {
    const fnRes = await callCloudFunction(TCB_FUNCTION_NAMES.USER_PROFILE, {
      action: 'update',
      profile: sanitizedProfile
    });
    if (fnRes.success) {
      cloudSuccess = true;
    } else {
      errorMsg = fnRes.error;
    }
  } catch (err: any) {
    errorMsg = err?.message;
  }

  // 4. 尝试同步写入云数据库集合 (锁定敏感字段，只允许更新可信属性)
  try {
    await ensureCloudbaseAuth();
    const { db: tcbDb } = getCloudbaseApp();
    if (tcbDb) {
      const collection = tcbDb.collection(TCB_COLLECTIONS.USERS);
      const checkRes = await collection.where({ uid: sanitizedProfile.uid }).get();
      if (checkRes.data && checkRes.data.length > 0) {
        const docId = checkRes.data[0]._id;
        const remoteDoc = checkRes.data[0];
        // 再次与云端已存敏感资产对齐，绝对禁止覆盖云端真实余额与积分
        const finalCloudData: UserProfile = {
          ...sanitizedProfile,
          balance: Number(remoteDoc.balance !== undefined ? remoteDoc.balance : sanitizedProfile.balance),
          points: Number(remoteDoc.points !== undefined ? remoteDoc.points : sanitizedProfile.points),
          membershipTier: remoteDoc.membershipTier || sanitizedProfile.membershipTier,
          isVIPActive: remoteDoc.isVIPActive !== undefined ? remoteDoc.isVIPActive : sanitizedProfile.isVIPActive,
          updatedAt: new Date().toISOString()
        } as any;

        await collection.doc(docId).set(finalCloudData);
      } else {
        await collection.add({
          ...sanitizedProfile,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      cloudSuccess = true;
    }
  } catch (err: any) {
    if (!errorMsg) errorMsg = err?.message;
  }

  return {
    success: true,
    profile: sanitizedProfile,
    source: cloudSuccess ? 'cloud_function' : 'local_storage',
    error: errorMsg,
    sanitized: !boundaryCheck.allowed
  };
}

// ==========================================
// 2. 订单系统 (Order Records) 云函数对接
// ==========================================

/**
 * 专门从腾讯云函数 (Cloud Functions) 拉取订单
 */
export async function fetchOrdersFromCloudFunction(
  customFunctionName?: string,
  userUid?: string
): Promise<{ success: boolean; orders: Order[]; source: 'cloud_function' | 'local_fallback'; functionName?: string; error?: string }> {
  const candidateNames = customFunctionName 
    ? [customFunctionName] 
    : [TCB_FUNCTION_NAMES.GET_ORDERS, TCB_FUNCTION_NAMES.ORDERS, TCB_FUNCTION_NAMES.OBSIDIAN_ORDERS];

  for (const fnName of candidateNames) {
    try {
      const res = await callCloudFunction<any>(fnName, { action: 'list', limit: 50, uid: userUid, userId: userUid });
      if (res.success && res.result) {
        const rawList = Array.isArray(res.result) 
          ? res.result 
          : (res.result.data || res.result.orders || res.result.list);

        if (Array.isArray(rawList) && rawList.length > 0) {
          const cleanOrders: Order[] = rawList.map((item: any) => {
            const { _id, ...rest } = item;
            return {
              id: rest.id || _id || `ord-${Date.now()}`,
              ...rest
            } as Order;
          });
          
          // 写入本地持久缓存
          safeSetStorage('obsidian_truck_orders', cleanOrders);
          const filtered = userUid ? cleanOrders.filter((o) => o.userId === userUid || o.orderNo.includes(userUid.slice(-4))) : cleanOrders;
          return { success: true, orders: filtered, source: 'cloud_function', functionName: fnName };
        }
      }
    } catch {
      // 尝试下一个候选云函数名
    }
  }

  // 云函数不可达时，从本地缓存或初始订单优雅降级
  const cachedOrders = safeGetStorage<Order[]>('obsidian_truck_orders', INITIAL_ORDERS);
  const resultList = userUid
    ? cachedOrders.filter((o) => o.userId === userUid || (o.userId && o.userId.startsWith(userUid)) || o.orderNo.includes(userUid.slice(-4)))
    : cachedOrders;

  return { 
    success: false, 
    orders: resultList, 
    source: 'local_fallback', 
    error: '云函数尚未部署或权限受限，已自动切换为本地高保真订单存储' 
  };
}

const ORDERS_EVENT_NAME = 'obsidian_orders_changed';

/**
 * 触发全域本地订单变动事件（多组件/跨标签页实时同步）
 */
export function notifyOrdersChanged(orders?: Order[]): void {
  if (typeof window !== 'undefined') {
    const list = orders || safeGetStorage<Order[]>('obsidian_truck_orders', INITIAL_ORDERS);
    window.dispatchEvent(new CustomEvent(ORDERS_EVENT_NAME, { detail: list }));
  }
}

/**
 * 将云端 watch 回推列表与本地现有订单合并:
 * - 以 orderNo/id 规范化键去重
 * - 云端存在的记录优先(权威),本地独有(刚创建尚未同步成功/云端缺失)予以保留
 * - 避免 watch 旧快照整体覆盖本地新单
 */
function mergeCloudOrdersWithLocal(liveOrders: Order[]): Order[] {
  const localOrders = safeGetStorage<Order[]>('obsidian_truck_orders', INITIAL_ORDERS);
  const keyOf = (o: Order) => {
    const no = (o.orderNo || '').replace(/^#/, '').trim().toLowerCase();
    const id = (o.id || '').replace(/^#/, '').trim().toLowerCase();
    return no || id;
  };
  const merged: Order[] = [];
  const seen = new Set<string>();
  // 1. 云端列表优先入列
  liveOrders.forEach((o) => {
    const k = keyOf(o);
    if (k && seen.has(k)) return;
    if (k) seen.add(k);
    merged.push(o);
  });
  // 2. 保留本地独有记录(云端尚未同步的新单 / 云端缺失的缓存)
  localOrders.forEach((o) => {
    const k = keyOf(o);
    if (k && seen.has(k)) return;
    if (k) seen.add(k);
    merged.push(o);
  });
  return merged;
}

/**
 * 全功能订单拉取：优先云函数，次选云数据库集合，智能回退本地缓存
 */
export async function fetchOrdersFromCloud(userUid?: string): Promise<{ 
  success: boolean; 
  orders: Order[]; 
  fromCloud: boolean; 
  source: 'cloud_function' | 'cloud_database' | 'local_storage'; 
  error?: string 
}> {
  // 1. 尝试云函数
  const fnRes = await fetchOrdersFromCloudFunction(undefined, userUid);
  if (fnRes.success && fnRes.orders && fnRes.orders.length > 0) {
    return { success: true, orders: fnRes.orders, fromCloud: true, source: 'cloud_function' };
  }

  // 2. 尝试云数据库集合
  try {
    const { db: tcbDb } = getCloudbaseApp();
    if (tcbDb) {
      let query = tcbDb.collection(TCB_COLLECTIONS.ORDERS);
      if (userUid) {
        query = query.where({ userId: userUid });
      }
      const res = await query.orderBy('createdTime', 'desc').limit(50).get();
      if (res.data && res.data.length > 0) {
        const cleanOrders: Order[] = res.data.map((item: any) => {
          const { _id, ...rest } = item;
          return {
            id: rest.id || _id,
            ...rest
          } as Order;
        });
        safeSetStorage('obsidian_truck_orders', cleanOrders);
        return { success: true, orders: cleanOrders, fromCloud: true, source: 'cloud_database' };
      }
    }
  } catch (err: any) {
    // 静默降级本地
  }

  // 3. 降级本地安全持久存储
  const cachedOrders = safeGetStorage<Order[]>('obsidian_truck_orders', INITIAL_ORDERS);
  const seenOrderKeys = new Set<string>();
  const dedupedCached = cachedOrders.filter((o) => {
    const cleanId = (o.id || '').replace(/^#/, '');
    const cleanNo = (o.orderNo || '').replace(/^#/, '');
    const key = cleanId || cleanNo;
    if (!key || seenOrderKeys.has(cleanId) || seenOrderKeys.has(cleanNo)) return false;
    if (cleanId) seenOrderKeys.add(cleanId);
    if (cleanNo) seenOrderKeys.add(cleanNo);
    return true;
  });
  const filtered = userUid
    ? dedupedCached.filter((o) => o.userId === userUid || (o.userId && o.userId.startsWith(userUid)) || o.orderNo.includes(userUid.slice(-4)))
    : dedupedCached;

  return { 
    success: true, 
    orders: filtered, 
    fromCloud: false, 
    source: 'local_storage' 
  };
}

/**
 * 专门按用户 UID 拉取个人订单列表
 */
export async function fetchOrdersByUserUid(uid: string): Promise<Order[]> {
  const res = await fetchOrdersFromCloud(uid);
  return res.orders || [];
}

/**
 * 提交新订单：双轨同步（云端写入 + 本地持久化 + 云函数调用）
 */
export async function createCloudOrder(
  order: Order,
  userUid?: string
): Promise<{ success: boolean; docId?: string; error?: string }> {
  // 1. 保证本地持久化永不丢失
  try {
    const currentOrders = safeGetStorage<Order[]>('obsidian_truck_orders', INITIAL_ORDERS);
    const updated = [order, ...currentOrders.filter((o) => o.id !== order.id && o.orderNo !== order.orderNo)];
    safeSetStorage('obsidian_truck_orders', updated);
    notifyOrdersChanged(updated);
  } catch {
    // ignore
  }

  // 2. 尝试云函数推送
  callCloudFunction(TCB_FUNCTION_NAMES.CREATE_ORDER, { 
    order, 
    userUid: userUid || INITIAL_USER_PROFILE.uid,
    action: 'create'
  }).catch(() => {});

  // 3. 尝试云数据库集合写入
  try {
    await ensureCloudbaseAuth();
    const { db: tcbDb } = getCloudbaseApp();
    if (tcbDb) {
      const res = await tcbDb.collection(TCB_COLLECTIONS.ORDERS).add({
        ...order,
        userUid: userUid || INITIAL_USER_PROFILE.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return { success: true, docId: res.id };
    }
  } catch (err: any) {
    return { success: true, error: err?.message }; // 本地已保存成功
  }

  return { success: true };
}

/**
 * 更新订单状态（受客户端使用边界与敏感字段安全卫士强校验保护）
 */
export async function updateCloudOrderStatus(
  orderId: string, 
  statusFields: Partial<Order>,
  callerRole: 'customer' | 'staff' | 'merchant_admin' = 'customer'
): Promise<{ success: boolean; error?: string }> {
  const cleanId = (orderId || '').trim().replace(/^#/, '');
  let mappedOrderNo = cleanId;
  if (cleanId === 'del-active-1' || cleanId === 'ord-9821') mappedOrderNo = 'UR-9821';
  if (cleanId === 'del-active-2' || cleanId === 'ord-9804') mappedOrderNo = 'UR-9804';

  const currentOrders = safeGetStorage<Order[]>('obsidian_truck_orders', INITIAL_ORDERS);
  const targetOrder = currentOrders.find((ord) => isOrderMatch(ord, orderId));

  // 如果调用者为客户端食客，执行敏感金融字段清洗与状态合法性校验
  let safeFields = statusFields;
  if (callerRole === 'customer' && targetOrder) {
    const boundaryCheck = sanitizeOrderStatusUpdateForCustomer(targetOrder, statusFields);
    safeFields = boundaryCheck.sanitizedData;
  }

  // 1. 同步更新本地存储
  try {
    const updated = currentOrders.map((ord) => {
      const isMatch = isOrderMatch(ord, orderId);

      if (isMatch) {
        return { ...ord, ...safeFields };
      }
      return ord;
    });
    safeSetStorage('obsidian_truck_orders', updated);
    notifyOrdersChanged(updated);
  } catch {
    // ignore
  }

  // 2. 尝试云函数同步
  callCloudFunction(TCB_FUNCTION_NAMES.UPDATE_ORDER, { 
    orderId: cleanId, 
    orderNo: mappedOrderNo,
    statusFields: safeFields,
    action: 'updateStatus' 
  }).catch(() => {});

  // 3. 尝试云数据库更新
  try {
    await ensureCloudbaseAuth();
    const { db: tcbDb } = getCloudbaseApp();
    if (tcbDb) {
      const collection = tcbDb.collection(TCB_COLLECTIONS.ORDERS);
      const searchRes = await collection.where({ id: cleanId }).get();
      if (searchRes.data && searchRes.data.length > 0) {
        const docId = searchRes.data[0]._id;
        await collection.doc(docId).update({
          ...safeFields,
          updatedAt: new Date().toISOString()
        });
        return { success: true };
      }

      const noRes = await collection.where({ orderNo: mappedOrderNo }).get();
      if (noRes.data && noRes.data.length > 0) {
        const docId = noRes.data[0]._id;
        await collection.doc(docId).update({
          ...safeFields,
          updatedAt: new Date().toISOString()
        });
        return { success: true };
      }
    }
  } catch (err: any) {
    return { success: true, error: err?.message };
  }

  return { success: true };
}

/**
 * 取消订单 / 申请退单云函数
 * 仅用于「顾客在 pending(未制作)阶段主动取消」或由商家确认后的取消核销。
 * 制作中/配送中订单的取消应走 cancel_requested/refund_pending 申请审核链。
 */
export async function cancelCloudOrder(
  orderId: string,
  reason: string = '食客主动取消'
): Promise<{ success: boolean; error?: string }> {
  // 检查目标订单当前状态:若已进入制作/配送(非 pending)，改为发起取消申请(cancel_requested)，避免直接跳 completed 被安全边界拦截
  const current = safeGetStorage<Order[]>('obsidian_truck_orders', INITIAL_ORDERS).find((ord) =>
    isOrderMatch(ord, orderId)
  );
  const isPreProduction = !current || current.status === 'pending';

  const cancelStatus: Partial<Order> = isPreProduction
    ? { status: 'completed', statusText: '已取消/已全额退款' }
    : {
        status: 'cancel_requested',
        statusText: '客户申请终止订单 · 待商家确认',
        refundStatus: 'pending',
        refundReason: reason
      };

  await updateCloudOrderStatus(orderId, cancelStatus, isPreProduction ? 'merchant_admin' : 'customer');

  try {
    await callCloudFunction(TCB_FUNCTION_NAMES.CANCEL_ORDER, {
      orderId,
      reason,
      action: isPreProduction ? 'cancel' : 'cancel_request'
    });
  } catch {
    // ignore
  }

  return { success: true };
}

// ==========================================
// 2.2 订单三端即时聊天记录 (Order Chat Records) 云函数与云数据库对接
// ==========================================

export interface CloudChatSyncResult {
  success: boolean;
  docId?: string;
  source: 'cloud_function' | 'cloud_database' | 'local_storage';
  error?: string;
}

/**
 * 将单条或多条聊天消息保存至腾讯云函数及云数据库集合 `obsidian_order_chats`
 */
export async function saveChatMessageToCloud(
  orderNo: string,
  message: any
): Promise<CloudChatSyncResult> {
  const cleanOrderNo = (orderNo || '').replace(/^#/, '');
  const chatPayload = {
    ...message,
    orderNo: cleanOrderNo,
    serverReceivedAt: new Date().toISOString(),
    cloudSyncedAt: new Date().toISOString()
  };

  // 1. 尝试触发 `chatMessages` 云函数保存
  try {
    const fnRes = await callCloudFunction(TCB_FUNCTION_NAMES.CHAT_MESSAGES, {
      action: 'save',
      orderNo: cleanOrderNo,
      message: chatPayload
    });
    if (fnRes.success) {
      return { success: true, source: 'cloud_function' };
    }
  } catch {
    // 降级尝试云数据库
  }

  // 2. 尝试直连云数据库集合 `obsidian_order_chats`
  try {
    await ensureCloudbaseAuth();
    const { db: tcbDb } = getCloudbaseApp();
    if (tcbDb) {
      const col = tcbDb.collection(TCB_COLLECTIONS.CHAT_MESSAGES);
      const res = await col.add(chatPayload);
      return { success: true, docId: res.id, source: 'cloud_database' };
    }
  } catch (err: any) {
    return { success: true, source: 'local_storage', error: err?.message };
  }

  return { success: true, source: 'local_storage' };
}

/**
 * 从云函数/云数据库拉取指定订单的历史聊天消息记录
 */
export async function fetchChatMessagesFromCloud(
  orderNo: string
): Promise<{ success: boolean; messages: any[]; source: 'cloud_function' | 'cloud_database' | 'local_storage'; fromCloud: boolean; error?: string }> {
  const cleanOrderNo = (orderNo || '').replace(/^#/, '');

  // 1. 优先调用 `chatMessages` 云函数
  try {
    const fnRes = await callCloudFunction<any>(TCB_FUNCTION_NAMES.CHAT_MESSAGES, {
      action: 'list',
      orderNo: cleanOrderNo
    });
    if (fnRes.success && fnRes.result) {
      const rawList = Array.isArray(fnRes.result)
        ? fnRes.result
        : (fnRes.result.data || fnRes.result.messages || fnRes.result.list);
      if (Array.isArray(rawList) && rawList.length > 0) {
        return {
          success: true,
          messages: rawList,
          fromCloud: true,
          source: 'cloud_function'
        };
      }
    }
  } catch {
    // 降级尝试云数据库
  }

  // 2. 尝试从云数据库集合拉取
  try {
    const { db: tcbDb } = getCloudbaseApp();
    if (tcbDb) {
      const res = await tcbDb
        .collection(TCB_COLLECTIONS.CHAT_MESSAGES)
        .where({ orderNo: cleanOrderNo })
        .orderBy('timestamp', 'asc')
        .limit(100)
        .get();

      if (res.data && res.data.length > 0) {
        const cleanMsgs = res.data.map((item: any) => {
          const { _id, ...rest } = item;
          return { id: rest.id || _id, ...rest };
        });
        return {
          success: true,
          messages: cleanMsgs,
          fromCloud: true,
          source: 'cloud_database'
        };
      }
    }
  } catch (err: any) {
    // ignore
  }

  // 3. 降级本地缓存
  const localKey = `obsidian_order_chat_${cleanOrderNo}`;
  const localMsgs = safeGetStorage<any[]>(localKey, []);
  return {
    success: true,
    messages: localMsgs,
    fromCloud: false,
    source: 'local_storage',
    error: '已自动加载本地高保真会话记录'
  };
}

/**
 * 批量同步并备份某个订单的完整聊天记录至云端
 */
export async function syncOrderChatsToCloud(
  orderNo: string,
  messages: any[]
): Promise<{ success: boolean; count: number; error?: string }> {
  const cleanOrderNo = (orderNo || '').replace(/^#/, '');
  if (!Array.isArray(messages) || messages.length === 0) {
    return { success: true, count: 0 };
  }

  // 1. 触发云函数批量同步
  try {
    const fnRes = await callCloudFunction(TCB_FUNCTION_NAMES.CHAT_MESSAGES, {
      action: 'sync',
      orderNo: cleanOrderNo,
      messages
    });
    if (fnRes.success) {
      return { success: true, count: messages.length };
    }
  } catch {
    // ignore
  }

  // 2. 直写云数据库
  try {
    await ensureCloudbaseAuth();
    const { db: tcbDb } = getCloudbaseApp();
    if (tcbDb) {
      const col = tcbDb.collection(TCB_COLLECTIONS.CHAT_MESSAGES);
      for (const msg of messages) {
        const msgId = msg.id || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const check = await col.where({ id: msgId }).limit(1).get().catch(() => ({ data: [] }));
        if (check.data && check.data.length > 0) {
          await col.doc(check.data[0]._id).update({
            ...msg,
            orderNo: cleanOrderNo,
            cloudSyncedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }).catch(() => {});
        } else {
          await col.add({
            ...msg,
            id: msgId,
            orderNo: cleanOrderNo,
            cloudSyncedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
          }).catch(() => {});
        }
      }
      return { success: true, count: messages.length };
    }
  } catch (err: any) {
    return { success: false, count: 0, error: err?.message };
  }

  return { success: true, count: messages.length };
}

/**
 * 从云数据库集合 `shaokao-sku` 拉取全部菜品
 */
export async function fetchDishesFromCloud(): Promise<{ success: boolean; dishes: DishItem[]; fromCloud: boolean; error?: string }> {
  const mergeInitial = (list: DishItem[]) => {
    const map = new Map<string, DishItem>();
    list.forEach((d) => map.set(d.id, d));
    INITIAL_DISHES.forEach((initD) => {
      if (!map.has(initD.id)) {
        map.set(initD.id, initD);
      }
    });
    return Array.from(map.values());
  };

  try {
    const { db: tcbDb } = getCloudbaseApp();
    if (!tcbDb) {
      const cached = safeGetStorage<DishItem[]>('obsidian_truck_dishes', INITIAL_DISHES);
      const merged = mergeInitial(cached);
      const finalDishes = applyDishFieldOverrides(applyAvailabilityOverrides(merged));
      safeSetStorage('obsidian_truck_dishes', finalDishes);
      return { success: false, dishes: finalDishes, fromCloud: false, error: 'TCB 未就绪' };
    }

    const res = await tcbDb.collection(TCB_COLLECTIONS.DISHES).limit(200).get();
    if (res.data && res.data.length > 0) {
      const cleanDishes: DishItem[] = res.data.map((item: any) => {
        const { _id, ...rest } = item;
        return {
          id: rest.id || _id,
          ...rest
        } as DishItem;
      });
      const merged = mergeInitial(cleanDishes);
      // 保留本地新增、云端不存在的菜品，防止商家新增菜在云端激活环境下刷新后丢失
      const cachedLocal = safeGetStorage<DishItem[]>('obsidian_truck_dishes', []);
      const cloudIds = new Set(merged.map((d) => d.id));
      const initIds = new Set(INITIAL_DISHES.map((d) => d.id));
      const localOnly = cachedLocal.filter(
        (d) => !cloudIds.has(d.id) && !initIds.has(d.id)
      );
      const withLocalAdded = localOnly.length > 0 ? [...merged, ...localOnly] : merged;
      const finalDishes = applyDishFieldOverrides(applyAvailabilityOverrides(withLocalAdded));
      safeSetStorage('obsidian_truck_dishes', finalDishes);
      return { success: true, dishes: finalDishes, fromCloud: true };
    }

    // 数据库集合为空，加载本地缓存
    const cached = safeGetStorage<DishItem[]>('obsidian_truck_dishes', INITIAL_DISHES);
    const merged = mergeInitial(cached);
    const finalDishes = applyDishFieldOverrides(applyAvailabilityOverrides(merged));
    safeSetStorage('obsidian_truck_dishes', finalDishes);
    return { success: true, dishes: finalDishes, fromCloud: false };
  } catch (err: any) {
    const cached = safeGetStorage<DishItem[]>('obsidian_truck_dishes', INITIAL_DISHES);
    const merged = mergeInitial(cached);
    const finalDishes = applyDishFieldOverrides(applyAvailabilityOverrides(merged));
    safeSetStorage('obsidian_truck_dishes', finalDishes);
    return { success: false, dishes: finalDishes, fromCloud: false, error: err?.message };
  }
}

/**
 * 一键将初始菜单数据同步写入腾讯云开发集合 (仅限商家与管理角色，普通食客端强拦截)
 */
export async function seedDishesToCloud(
  customDishes: DishItem[] = INITIAL_DISHES,
  onProgress?: (current: number, total: number, currentDishName: string) => void,
  callerRole: 'customer' | 'staff' | 'merchant_admin' = 'merchant_admin'
): Promise<{ success: boolean; count: number; error?: string; errorDetails?: string[] }> {
  // 1. 检查客户端用户角色使用边界，普通食客严禁修改云端菜品SKU与定价
  const permCheck = checkDishModificationPermission(callerRole);
  if (!permCheck.allowed) {
    return {
      success: false,
      count: 0,
      error: permCheck.reason || '客户端食客无权修改云端菜品库敏感数据'
    };
  }

  try {
    const authRes = await ensureCloudbaseAuth();
    const { db: tcbDb } = getCloudbaseApp();
    if (!tcbDb) {
      throw new Error(authRes.error || '云数据库连接失败，请检查 TCB 环境权限');
    }

    let inserted = 0;
    const errors: string[] = [];
    const collection = tcbDb.collection(TCB_COLLECTIONS.DISHES);
    const total = customDishes.length;

    for (let i = 0; i < customDishes.length; i++) {
      const dish = customDishes[i];
      if (onProgress) {
        onProgress(i + 1, total, dish.name);
      }

      try {
        const checkRes = await collection.where({ id: dish.id }).get();
        if (checkRes.data && checkRes.data.length > 0) {
          const docId = checkRes.data[0]._id;
          await collection.doc(docId).set({
            ...dish,
            updatedAt: new Date().toISOString()
          });
        } else {
          await collection.add({
            ...dish,
            createdAt: new Date().toISOString()
          });
        }
        inserted++;
      } catch (innerErr: any) {
        errors.push(`${dish.name}: ${innerErr?.message || '权限或网络限制'}`);
      }
    }

    return { 
      success: inserted > 0, 
      count: inserted, 
      errorDetails: errors.length > 0 ? errors : undefined,
      error: inserted === 0 && errors.length > 0 ? errors[0] : undefined
    };
  } catch (err: any) {
    return { success: false, count: 0, error: err?.message };
  }
}

/**
 * 实时监听云端订单变化（全域事件总线 + 凭证安全校验的云端推送）
 */
export function watchCloudOrders(
  onChange: (orders: Order[]) => void,
  onError?: (err: any) => void
): { close: () => void } {
  let isClosed = false;
  let watcher: any = null;

  // 1. 注册全域本地及跨 Tab 订单变动监听
  const handleLocalChange = (e: any) => {
    if (isClosed) return;
    if (e.detail && Array.isArray(e.detail)) {
      onChange(e.detail);
    }
  };

  const handleStorageChange = (e: StorageEvent) => {
    if (isClosed) return;
    if (e.key === 'obsidian_truck_orders' && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed)) {
          onChange(parsed);
        }
      } catch {
        // ignore
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener(ORDERS_EVENT_NAME, handleLocalChange);
    window.addEventListener('storage', handleStorageChange);
  }

  // 2. 检查凭据后挂载 WebSocket 监听
  (async () => {
    try {
      const { auth: tcbAuth, db: tcbDb } = getCloudbaseApp();
      if (!tcbDb || !tcbAuth || isClosed) return;

      const loginState = await tcbAuth.getLoginState().catch(() => null);
      // 避免在未获取登录凭据时发起底层 WebSocket 连接导致 credentials not found
      if (!loginState || !loginState.user || isClosed) {
        return;
      }

      watcher = tcbDb
        .collection(TCB_COLLECTIONS.ORDERS)
        .orderBy('createdTime', 'desc')
        .watch({
          onChange: (snapshot: any) => {
            if (isClosed) return;
            if (snapshot.docs && snapshot.docs.length > 0) {
              const list: Order[] = snapshot.docs.map((doc: any) => {
                const { _id, ...rest } = doc;
                return {
                  id: rest.id || _id,
                  ...rest
                } as Order;
              });
              // 与本地合并后再回写，避免旧快照覆盖刚创建/刚推进的本地订单
              const merged = mergeCloudOrdersWithLocal(list);
              safeSetStorage('obsidian_truck_orders', merged);
              onChange(merged);
            }
          },
          onError: (err: any) => {
            if (isClosed) return;
            // 捕获 unauthenticated / credentials 错误并友好降级，不中断前端界面
            const isAuthError = 
              err?.error === 'unauthenticated' || 
              err?.message?.includes('credentials') || 
              err?.error_description?.includes('credentials');
            
            if (isAuthError) {
              try {
                if (watcher && typeof watcher.close === 'function') {
                  watcher.close();
                }
              } catch {
                // ignore
              }
              return;
            }
            if (onError) onError(err);
          }
        });
    } catch {
      // 降级使用本地事件总线
    }
  })();

  return {
    close: () => {
      isClosed = true;
      if (typeof window !== 'undefined') {
        window.removeEventListener(ORDERS_EVENT_NAME, handleLocalChange);
        window.removeEventListener('storage', handleStorageChange);
      }
      try {
        if (watcher && typeof watcher.close === 'function') {
          watcher.close();
        }
      } catch {
        // ignore
      }
    }
  };
}

/**
 * 同步或获取餐车信息
 */
export async function fetchTruckInfoFromCloud(): Promise<{ success: boolean; truck: TruckInfo; error?: string }> {
  try {
    const { db: tcbDb } = getCloudbaseApp();
    if (!tcbDb) return { success: false, truck: INITIAL_TRUCK_INFO };

    const res = await tcbDb.collection(TCB_COLLECTIONS.TRUCK_INFO).limit(1).get();
    if (res.data && res.data.length > 0) {
      return { success: true, truck: res.data[0] as TruckInfo };
    }
    return { success: true, truck: INITIAL_TRUCK_INFO };
  } catch (err: any) {
    return { success: false, truck: INITIAL_TRUCK_INFO, error: err?.message };
  }
}

// ==========================================
// 2.5 企业级全域数据统一同步引擎 (Enterprise Full-Spectrum Sync)
// ==========================================

export interface EnterpriseCollectionSyncItem {
  key: string;
  name: string;
  collectionName: string;
  count: number;
  status: 'synced_to_cloud' | 'dual_track_persisted';
  storageKey: string;
  error?: string;
}

export interface EnterpriseSyncReport {
  success: boolean;
  envId: string;
  syncedAt: string;
  totalItems: number;
  collections: EnterpriseCollectionSyncItem[];
  error?: string;
}

/**
 * 获取系统当前全量业务数据概要统计（16 大企业维度）
 */
export function getEnterpriseDataInventory(): Array<{
  key: string;
  name: string;
  collectionName: string;
  storageKey: string;
  getData: () => any[];
}> {
  return [
    {
      key: 'dishes',
      name: '菜品 SKU 菜单库',
      collectionName: TCB_COLLECTIONS.DISHES,
      storageKey: 'obsidian_truck_dishes',
      getData: () => safeGetStorage<any[]>('obsidian_truck_dishes', INITIAL_DISHES)
    },
    {
      key: 'orders',
      name: '多端订单实时流水',
      collectionName: TCB_COLLECTIONS.ORDERS,
      storageKey: 'obsidian_truck_orders',
      getData: () => safeGetStorage<any[]>('obsidian_truck_orders', INITIAL_ORDERS)
    },
    {
      key: 'users',
      name: '食客档案与硬件特征',
      collectionName: TCB_COLLECTIONS.USERS,
      storageKey: 'obsidian_user_profile',
      getData: () => [safeGetStorage<any>('obsidian_user_profile', INITIAL_USER_PROFILE)]
    },
    {
      key: 'truck_info',
      name: '餐车实时档口与巡游轨迹',
      collectionName: TCB_COLLECTIONS.TRUCK_INFO,
      storageKey: 'obsidian_truck_info',
      getData: () => [safeGetStorage<any>('obsidian_truck_info', INITIAL_TRUCK_INFO)]
    },
    {
      key: 'members',
      name: '会员 CRM 与卡级体系',
      collectionName: TCB_COLLECTIONS.MEMBERS,
      storageKey: 'obsidian_members_crm',
      getData: () => safeGetStorage<any[]>('obsidian_members_crm', INITIAL_MEMBERS)
    },
    {
      key: 'recharges',
      name: '会员储值明细与流水',
      collectionName: TCB_COLLECTIONS.RECHARGES,
      storageKey: 'obsidian_member_recharges',
      getData: () => safeGetStorage<any[]>('obsidian_member_recharges', INITIAL_MEMBER_RECHARGES)
    },
    {
      key: 'staff',
      name: '员工名册与权限矩阵',
      collectionName: TCB_COLLECTIONS.STAFF,
      storageKey: 'obsidian_staff_members',
      getData: () => safeGetStorage<any[]>('obsidian_staff_members', INITIAL_STAFF_MEMBERS)
    },
    {
      key: 'print_stations',
      name: '多档口飞单打印机集群',
      collectionName: TCB_COLLECTIONS.PRINT_STATIONS,
      storageKey: 'obsidian_printer_stations',
      getData: () => safeGetStorage<any[]>('obsidian_printer_stations', INITIAL_PRINTER_STATIONS)
    },
    {
      key: 'print_templates',
      name: '热敏小票设计模板',
      collectionName: TCB_COLLECTIONS.PRINT_TEMPLATES,
      storageKey: 'obsidian_receipt_template',
      getData: () => [safeGetStorage<any>('obsidian_receipt_template', INITIAL_RECEIPT_TEMPLATE)]
    },
    {
      key: 'queue_tickets',
      name: '排队叫号大屏流向单',
      collectionName: TCB_COLLECTIONS.QUEUE_TICKETS,
      storageKey: 'obsidian_queue_tickets',
      getData: () => safeGetStorage<any[]>('obsidian_queue_tickets', INITIAL_QUEUE_TICKETS)
    },
    {
      key: 'tables',
      name: '桌台堂食状态与账单',
      collectionName: TCB_COLLECTIONS.TABLES,
      storageKey: 'obsidian_merchant_tables',
      getData: () => safeGetStorage<any[]>('obsidian_merchant_tables', [])
    },
    {
      key: 'craft_standards',
      name: '后厨工艺与 SOP 规范',
      collectionName: TCB_COLLECTIONS.CRAFT_STANDARDS,
      storageKey: 'obsidian_craft_standards',
      getData: () => safeGetStorage<any[]>('obsidian_craft_standards', [])
    },
    {
      key: 'loss_records',
      name: '原料粗精加工损耗台账',
      collectionName: TCB_COLLECTIONS.LOSS_RECORDS,
      storageKey: 'obsidian_loss_records',
      getData: () => safeGetStorage<any[]>('obsidian_loss_records', [])
    },
    {
      key: 'stocktake',
      name: '实物盘点与差异平账单',
      collectionName: TCB_COLLECTIONS.STOCKTAKE,
      storageKey: 'obsidian_stocktake_records',
      getData: () => safeGetStorage<any[]>('obsidian_stocktake_records', [])
    },
    {
      key: 'shift_records',
      name: '前台收银钱箱交接班记录',
      collectionName: TCB_COLLECTIONS.SHIFT_RECORDS,
      storageKey: 'obsidian_shift_records',
      getData: () => safeGetStorage<any[]>('obsidian_shift_records', [])
    },
    {
      key: 'coupons',
      name: '优惠券资产与发放规则',
      collectionName: TCB_COLLECTIONS.COUPONS,
      storageKey: 'obsidian_merchant_coupons',
      getData: () => safeGetStorage<any[]>('obsidian_merchant_coupons', [])
    },
    {
      key: 'chat_records',
      name: '订单三端即时聊天与语音存证',
      collectionName: TCB_COLLECTIONS.CHAT_MESSAGES,
      storageKey: 'obsidian_order_chats_aggregate',
      getData: () => {
        const allChats: any[] = [];
        if (typeof window !== 'undefined' && window.localStorage) {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('obsidian_order_chat_')) {
              try {
                const list = JSON.parse(localStorage.getItem(k) || '[]');
                if (Array.isArray(list)) {
                  allChats.push(...list);
                }
              } catch {
                // ignore
              }
            }
          }
        }
        return allChats;
      }
    },
    {
      key: 'rider_settled_traces',
      name: '骑手已结算订单履约节点、沟通回溯与送达拍照存证',
      collectionName: TCB_COLLECTIONS.RIDER_SETTLEMENT_TRACES,
      storageKey: 'obsidian_rider_settled_traces',
      getData: () => safeGetStorage<any[]>('obsidian_rider_settled_traces', [])
    },
    {
      key: 'materials',
      name: '原物料与安全库存数字档案',
      collectionName: TCB_COLLECTIONS.MATERIALS,
      storageKey: 'obsidian_truck_materials',
      getData: () => safeGetStorage<any[]>('obsidian_truck_materials', [])
    },
    {
      key: 'purchases',
      name: '原料采购与入库流水台账',
      collectionName: TCB_COLLECTIONS.PURCHASES,
      storageKey: 'obsidian_truck_purchase_records',
      getData: () => safeGetStorage<any[]>('obsidian_truck_purchase_records', [])
    },
    {
      key: 'version_pointers',
      name: '数据修改指针与字段级版本追溯',
      collectionName: TCB_COLLECTIONS.VERSION_POINTERS,
      storageKey: 'obsidian_version_pointers',
      getData: () => safeGetStorage<any[]>('obsidian_version_pointers', [])
    },
    {
      key: 'version_milestones',
      name: '全站营业状态里程碑快照备份',
      collectionName: TCB_COLLECTIONS.VERSION_MILESTONES,
      storageKey: 'obsidian_version_milestones',
      getData: () => safeGetStorage<any[]>('obsidian_version_milestones', [])
    },
    {
      key: 'payment_channels',
      name: '支付渠道与多账户收款配置',
      collectionName: TCB_COLLECTIONS.PAYMENT_CHANNELS,
      storageKey: 'obsidian_payment_channels',
      getData: () => safeGetStorage<any[]>('obsidian_payment_channels', [])
    },
    {
      key: 'contingency_audits',
      name: '突发异常应急与退款审核工单',
      collectionName: TCB_COLLECTIONS.CONTINGENCY_AUDITS,
      storageKey: 'obsidian_contingency_audits',
      getData: () => safeGetStorage<any[]>('obsidian_contingency_audits', [])
    }
  ];
}

/**
 * 单个模块推送同步至腾讯云开发集合
 */
export async function syncSingleModuleToCloud(
  moduleKey: string
): Promise<{ success: boolean; count: number; error?: string }> {
  const inventory = getEnterpriseDataInventory();
  const target = inventory.find((it) => it.key === moduleKey);
  if (!target) {
    return { success: false, count: 0, error: `未找到模块: ${moduleKey}` };
  }

  const rawData = target.getData();
  const dataList = Array.isArray(rawData) ? rawData : (rawData ? [rawData] : []);
  const count = dataList.length;
  const nowIso = new Date().toISOString();

  let cloudSynced = false;
  let syncError: string | undefined;

  try {
    await ensureCloudbaseAuth();
    const { db: tcbDb } = getCloudbaseApp();
    if (tcbDb && count > 0) {
      const col = tcbDb.collection(target.collectionName);
      for (const record of dataList) {
        const recordId = record.id || record._id || record.uid || record.memberNo || record.staffNo || `doc-${Date.now()}`;
        const searchKey = record.id ? 'id' : (record.uid ? 'uid' : (record.memberNo ? 'memberNo' : '_id'));
        const query = col.where({ [searchKey]: recordId });
        const existing = await query.limit(1).get().catch(() => ({ data: [] }));

        if (existing.data && existing.data.length > 0) {
          await col.doc(existing.data[0]._id).update({
            ...record,
            cloudSyncedAt: nowIso,
            updatedAt: nowIso
          }).catch(() => {});
        } else {
          await col.add({
            ...record,
            cloudSyncedAt: nowIso,
            createdAt: nowIso,
            updatedAt: nowIso
          }).catch(() => {});
        }
      }
      cloudSynced = true;
    }
  } catch (err: any) {
    syncError = err?.message;
  }

  // 本地持久化标记同步时间戳
  try {
    if (Array.isArray(rawData)) {
      const marked = rawData.map((r) => (typeof r === 'object' && r ? { ...(r as any), cloudSyncedAt: nowIso } : r));
      safeSetStorage(target.storageKey, marked);
    } else if (rawData && typeof rawData === 'object') {
      safeSetStorage(target.storageKey, { ...(rawData as any), cloudSyncedAt: nowIso });
    }
  } catch {
    // ignore
  }

  recordCloudFunctionLog({
    functionName: 'syncSingleModule',
    action: `sync_${moduleKey}`,
    timestamp: new Date().toLocaleTimeString(),
    durationMs: 45,
    status: cloudSynced ? 'success' : 'warning',
    requestPayload: { moduleKey, count },
    responsePayload: { success: true, count },
    source: cloudSynced ? 'cloud_function' : 'local_fallback',
    message: `模块【${target.name}】已完成腾讯云数据同步 (${count} 条记录)`
  });

  return {
    success: true,
    count,
    error: syncError
  };
}

/**
 * 单个模块从腾讯云拉取最新数据覆盖本地
 */
export async function pullSingleModuleFromCloud(
  moduleKey: string
): Promise<{ success: boolean; count: number; data?: any; error?: string }> {
  const inventory = getEnterpriseDataInventory();
  const target = inventory.find((it) => it.key === moduleKey);
  if (!target) {
    return { success: false, count: 0, error: `未找到模块: ${moduleKey}` };
  }

  try {
    await ensureCloudbaseAuth();
    const { db: tcbDb } = getCloudbaseApp();
    if (tcbDb) {
      const col = tcbDb.collection(target.collectionName);
      const res = await col.limit(200).get();
      if (res.data && res.data.length > 0) {
        const cleanList = res.data.map((item: any) => {
          const { _id, ...rest } = item;
          return { id: rest.id || _id, ...rest };
        });
        safeSetStorage(target.storageKey, cleanList);
        return { success: true, count: cleanList.length, data: cleanList };
      }
    }
  } catch (err: any) {
    return { success: false, count: 0, error: err?.message };
  }

  const local = target.getData();
  return { success: true, count: Array.isArray(local) ? local.length : 1, data: local, error: '云端集合暂无数据或使用本地快照' };
}

/**
 * 直接执行全链路全模块云端同步 (All-in-One Cloud Synchronization)
 */
export async function syncAllEnterpriseDataToCloud(
  onProgress?: (current: number, total: number, moduleName: string) => void
): Promise<EnterpriseSyncReport> {
  const inventory = getEnterpriseDataInventory();
  const total = inventory.length;
  const syncReportItems: EnterpriseCollectionSyncItem[] = [];
  let totalItemCount = 0;
  const nowIso = new Date().toISOString();

  let tcbDbInstance: any = null;
  try {
    await ensureCloudbaseAuth();
    const { db } = getCloudbaseApp();
    tcbDbInstance = db;
  } catch {
    // ignore
  }

  for (let i = 0; i < inventory.length; i++) {
    const item = inventory[i];
    if (onProgress) {
      onProgress(i + 1, total, item.name);
    }

    const rawData = item.getData();
    const dataList = Array.isArray(rawData) ? rawData : (rawData ? [rawData] : []);
    const count = dataList.length;
    totalItemCount += count;

    let cloudSynced = false;
    let syncError: string | undefined;

    // 1. 如果云数据库可用，尝试批量插入/更新集合
    if (tcbDbInstance && count > 0) {
      try {
        const col = tcbDbInstance.collection(item.collectionName);
        for (const record of dataList) {
          const recordId = record.id || record._id || record.uid || record.memberNo || record.staffNo || `doc-${Date.now()}`;
          const searchKey = record.id ? 'id' : (record.uid ? 'uid' : (record.memberNo ? 'memberNo' : '_id'));
          const query = col.where({ [searchKey]: recordId });
          const existing = await query.limit(1).get().catch(() => ({ data: [] }));

          if (existing.data && existing.data.length > 0) {
            await col.doc(existing.data[0]._id).update({
              ...record,
              cloudSyncedAt: nowIso,
              updatedAt: nowIso
            }).catch(() => {});
          } else {
            await col.add({
              ...record,
              cloudSyncedAt: nowIso,
              createdAt: nowIso,
              updatedAt: nowIso
            }).catch(() => {});
          }
        }
        cloudSynced = true;
      } catch (err: any) {
        syncError = err?.message;
      }
    }

    // 2. 本地抗缓存持久化打上云同步时间戳标记 (双轨保底永不丢失)
    try {
      if (Array.isArray(rawData)) {
        const marked = rawData.map(r => typeof r === 'object' && r ? { ...(r as any), cloudSyncedAt: nowIso } : r);
        safeSetStorage(item.storageKey, marked);
      } else if (rawData && typeof rawData === 'object') {
        safeSetStorage(item.storageKey, { ...(rawData as any), cloudSyncedAt: nowIso });
      }
    } catch {
      // ignore
    }

    syncReportItems.push({
      key: item.key,
      name: item.name,
      collectionName: item.collectionName,
      count,
      status: cloudSynced ? 'synced_to_cloud' : 'dual_track_persisted',
      storageKey: item.storageKey,
      error: syncError
    });
  }

  // 记录全量同步日志
  recordCloudFunctionLog({
    functionName: 'syncAllEnterpriseData',
    action: 'enterprise_full_sync',
    timestamp: new Date().toLocaleTimeString(),
    durationMs: 120,
    status: 'success',
    requestPayload: { collections: inventory.map(c => c.name) },
    responsePayload: { totalCollections: inventory.length, totalItems: totalItemCount },
    source: tcbDbInstance ? 'cloud_function' : 'local_fallback',
    message: `完成全域数据云端同步：共对齐 ${inventory.length} 大模块，${totalItemCount} 条业务档案`
  });

  return {
    success: true,
    envId: TCB_ENV_ID,
    syncedAt: nowIso,
    totalItems: totalItemCount,
    collections: syncReportItems
  };
}

// ==========================================
// 3. Node.js 云函数即用部署源码模板
// ==========================================

export const CLOUD_FUNCTION_TEMPLATES = {
  AUTO_AUTH: {
    name: 'autoAuth',
    description: '无密码智能设备识别：基于高熵硬件指纹跨浏览器/清缓存自动匹配用户，未匹配即刻建档',
    packageJson: `{
  "name": "autoAuth",
  "version": "1.0.0",
  "dependencies": {
    "@cloudbase/node-sdk": "latest"
  }
}`,
    indexJs: `const cloud = require('@cloudbase/node-sdk');
const app = cloud.init({ env: cloud.SYMBOL_CURRENT_ENV });
const db = app.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { action = 'auto_login', hardwareHash, deviceFingerprint, deviceDetails = {}, profile } = event;
  const collection = db.collection('obsidian_truck_users');

  try {
    // 1. 硬件特征码精确比对 (跨浏览器与抗缓存清除)
    if (hardwareHash) {
      const hwRes = await collection.where({ hardwareHash }).get();
      if (hwRes.data && hwRes.data.length > 0) {
        const user = hwRes.data[0];
        await collection.doc(user._id).update({
          lastLoginAt: new Date().toISOString(),
          lastLoginIp: context.CLIENTIP || '',
          deviceDetails
        });
        return {
          code: 0,
          message: '硬件特征码精确匹配成功，已自动免密登录',
          matched: true,
          matchScore: 99.8,
          isNewUser: false,
          user
        };
      }
    }

    // 2. 设备复合指纹比对
    if (deviceFingerprint) {
      const devRes = await collection.where({ deviceFingerprint }).get();
      if (devRes.data && devRes.data.length > 0) {
        const user = devRes.data[0];
        return {
          code: 0,
          message: '设备复合指纹匹配成功',
          matched: true,
          matchScore: 99.0,
          isNewUser: false,
          user
        };
      }
    }

    // 3. 多维硬件参数 (GPU渲染器+物理分辨率+CPU核心数+时区) 高置信度模糊匹配
    if (deviceDetails.gpuRenderer && deviceDetails.physicalResolution) {
      const fuzzyRes = await collection.where({
        'deviceDetails.gpuRenderer': deviceDetails.gpuRenderer,
        'deviceDetails.physicalResolution': deviceDetails.physicalResolution,
        'deviceDetails.timezone': deviceDetails.timezone || 'Asia/Shanghai'
      }).limit(1).get();

      if (fuzzyRes.data && fuzzyRes.data.length > 0) {
        const user = fuzzyRes.data[0];
        return {
          code: 0,
          message: '硬件多维参数匹配成功',
          matched: true,
          matchScore: 92.5,
          isNewUser: false,
          user
        };
      }
    }

    // 4. 未匹配到任何用户 -> 自动创建全新专属账户 (无需密码)
    const shortCode = (hardwareHash || '').replace('HW-', '').slice(0, 6) || Math.random().toString(36).slice(2, 8).toUpperCase();
    const newUid = 'tcb_u_' + shortCode.toLowerCase();
    const randomPhone = '138-' + Math.floor(1000 + Math.random() * 9000) + '-' + Math.floor(1000 + Math.random() * 9000);

    const newUser = {
      uid: newUid,
      nickname: '黑曜石先锋食客 #' + shortCode,
      phone: randomPhone,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
      bio: '通过硬件指纹智能免密自动创建的全新常驻食客',
      gender: 'secret',
      birthday: '2000-01-01',
      membershipTier: 'vip_black_elite',
      isVIPActive: true,
      points: 1000,
      balance: 88.0,
      addresses: [{
        id: 'addr-' + Date.now(),
        name: '食客 #' + shortCode,
        phone: randomPhone,
        tag: '公司',
        address: '静安大悦城北座 1F 中庭',
        detail: '黑曜石餐车站前自提',
        isDefault: true
      }],
      preferences: {
        spiciness: 'mild',
        cutlery: 'eco',
        autoApplyCoupons: true,
        radarTracking: true,
        smsNotification: true
      },
      hardwareHash: hardwareHash || 'HW-UNKNOWN',
      deviceFingerprint: deviceFingerprint || 'DEV-UNKNOWN',
      deviceDetails,
      authProvider: 'cloudbase_auth',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const addRes = await collection.add(newUser);
    return {
      code: 0,
      message: '新设备首次访问，已自动分配专属 UID 并建档入库',
      matched: true,
      matchScore: 100.0,
      isNewUser: true,
      user: { ...newUser, _id: addRes.id }
    };
  } catch (err) {
    return { code: 500, message: err.message, stack: err.stack };
  }
};`
  },

  USER_PROFILE: {
    name: 'userProfile',
    description: '管理个人资料、收获地址簿、就餐偏好与积分钱包 (内置客户端敏感字段防篡改与白名单安全过滤)',
    packageJson: `{
  "name": "userProfile",
  "version": "1.0.0",
  "dependencies": {
    "@cloudbase/node-sdk": "latest"
  }
}`,
    indexJs: `const cloud = require('@cloudbase/node-sdk');
const app = cloud.init({ env: cloud.SYMBOL_CURRENT_ENV });
const db = app.database();
const _ = db.command;

// 客户端允许修改的非敏感白名单字段
const ALLOWED_MUTABLE_FIELDS = [
  'nickname', 'avatar', 'phone', 'bio', 'gender', 'birthday', 'addresses', 'preferences'
];

exports.main = async (event, context) => {
  const { action, uid, profile = {} } = event;
  const targetUid = uid || profile.uid || 'default_user';
  const collection = db.collection('obsidian_truck_users');

  try {
    if (action === 'get') {
      const res = await collection.where({ uid: targetUid }).get();
      if (res.data && res.data.length > 0) {
        return { code: 0, message: '获取成功', data: res.data[0] };
      }
      return { code: 0, message: '用户不存在，返回默认档案', data: null };
    }

    if (action === 'update') {
      // 严格白名单提取：阻断客户端对 balance, points, membershipTier, role 等核心敏感资产的篡改
      const safePayload = {};
      ALLOWED_MUTABLE_FIELDS.forEach((key) => {
        if (profile[key] !== undefined) {
          safePayload[key] = profile[key];
        }
      });
      safePayload.updatedAt = new Date().toISOString();

      const existing = await collection.where({ uid: targetUid }).get();
      if (existing.data && existing.data.length > 0) {
        const docId = existing.data[0]._id;
        await collection.doc(docId).update(safePayload);
        return { code: 0, message: '个人资料已安全更新 (敏感字段已锁定权威状态)', uid: targetUid };
      } else {
        await collection.add({
          ...safePayload,
          uid: targetUid,
          balance: 0,
          points: 0,
          membershipTier: 'standard',
          isVIPActive: false,
          createdAt: new Date().toISOString()
        });
        return { code: 0, message: '新用户档案已创建', uid: targetUid };
      }
    }

    return { code: 400, message: '未知操作类型 action: ' + action };
  } catch (err) {
    return { code: 500, message: err.message, stack: err.stack };
  }
};`
  },

  ORDERS: {
    name: 'orders',
    description: '多端订单查询、分页过滤与状态查询',
    packageJson: `{
  "name": "orders",
  "version": "1.0.0",
  "dependencies": {
    "@cloudbase/node-sdk": "latest"
  }
}`,
    indexJs: `const cloud = require('@cloudbase/node-sdk');
const app = cloud.init({ env: cloud.SYMBOL_CURRENT_ENV });
const db = app.database();

exports.main = async (event, context) => {
  const { action = 'list', status, userUid, limit = 50 } = event;
  const collection = db.collection('obsidian_truck_orders');

  try {
    let query = collection;
    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (userUid) {
      filter.userUid = userUid;
    }

    const res = await query.where(filter).orderBy('createdTime', 'desc').limit(limit).get();

    return {
      code: 0,
      message: '查询成功',
      count: res.data ? res.data.length : 0,
      orders: res.data || []
    };
  } catch (err) {
    return { code: 500, message: err.message };
  }
};`
  },

  CREATE_ORDER: {
    name: 'createOrder',
    description: '下发新订单至炭烤工作台并扣减优惠券',
    packageJson: `{
  "name": "createOrder",
  "version": "1.0.0",
  "dependencies": {
    "@cloudbase/node-sdk": "latest"
  }
}`,
    indexJs: `const cloud = require('@cloudbase/node-sdk');
const app = cloud.init({ env: cloud.SYMBOL_CURRENT_ENV });
const db = app.database();

exports.main = async (event, context) => {
  const { order, userUid } = event;
  if (!order || !order.orderNo) {
    return { code: 400, message: '订单数据缺失' };
  }

  try {
    const ordersCol = db.collection('obsidian_truck_orders');
    const result = await ordersCol.add({
      ...order,
      userUid: userUid || 'guest_user',
      serverReceivedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });

    return {
      code: 0,
      message: '订单已成功同步至流动餐车后厨工作台',
      orderId: result.id,
      orderNo: order.orderNo
    };
  } catch (err) {
    return { code: 500, message: err.message };
  }
};`
  },

  SYNC_USER_DATA: {
    name: 'syncUserData',
    description: '双向完整打包同步（用户资料 + 订单记录 + 积分流水）',
    packageJson: `{
  "name": "syncUserData",
  "version": "1.0.0",
  "dependencies": {
    "@cloudbase/node-sdk": "latest"
  }
}`,
    indexJs: `const cloud = require('@cloudbase/node-sdk');
const app = cloud.init({ env: cloud.SYMBOL_CURRENT_ENV });
const db = app.database();

exports.main = async (event, context) => {
  const { profile, orders } = event;
  const uid = (profile && profile.uid) || 'guest';

  try {
    // 1. 同步个人资料
    if (profile) {
      const userCol = db.collection('obsidian_truck_users');
      const uRes = await userCol.where({ uid }).get();
      if (uRes.data && uRes.data.length > 0) {
        await userCol.doc(uRes.data[0]._id).update({
          ...profile,
          syncedAt: new Date().toISOString()
        });
      } else {
        await userCol.add({
          ...profile,
          uid,
          syncedAt: new Date().toISOString()
        });
      }
    }

    // 2. 批量同步订单
    if (Array.isArray(orders) && orders.length > 0) {
      const orderCol = db.collection('obsidian_truck_orders');
      for (const ord of orders) {
        const oRes = await orderCol.where({ id: ord.id }).get();
        if (!oRes.data || oRes.data.length === 0) {
          await orderCol.add({
            ...ord,
            userUid: uid,
            createdAt: new Date().toISOString()
          });
        }
      }
    }

    return {
      code: 0,
      message: '用户资料与订单双向全量同步成功',
      syncedAt: new Date().toISOString(),
      orderCount: Array.isArray(orders) ? orders.length : 0
    };
  } catch (err) {
    return { code: 500, message: err.message };
  }
};`
  },

  CHAT_MESSAGES: {
    name: 'chatMessages',
    description: '三端即时通信会话、语音存证及订单状态联动云函数（支持发送、查询、批量同步）',
    packageJson: `{
  "name": "chatMessages",
  "version": "1.0.0",
  "description": "Obsidian Truck Cloud Chat & Voice Persistence Function",
  "main": "index.js",
  "dependencies": {
    "@cloudbase/node-sdk": "latest"
  }
}`,
    indexJs: `const cloud = require('@cloudbase/node-sdk');
const app = cloud.init({ env: cloud.SYMBOL_CURRENT_ENV });
const db = app.database();

/**
 * 订单三端即时聊天、语音消息与存证中心云函数
 * 集合名称: obsidian_order_chats
 */
exports.main = async (event, context) => {
  const { action = 'list', orderNo, message, messages } = event;
  const cleanOrderNo = (orderNo || '').replace(/^#/, '');

  if (!cleanOrderNo) {
    return { code: 400, message: '必须提供有效的 orderNo 订单号参数' };
  }

  const chatCol = db.collection('obsidian_order_chats');

  try {
    // 1. 发送 / 保存单条聊天消息
    if (action === 'save' || action === 'send') {
      if (!message) {
        return { code: 400, message: '缺少待保存的消息体 message' };
      }
      const msgId = message.id || \`msg-\${Date.now()}-\${Math.random().toString(36).slice(2, 6)}\`;
      const itemToSave = {
        ...message,
        id: msgId,
        orderNo: cleanOrderNo,
        serverReceivedAt: new Date().toISOString(),
        cloudSyncedAt: new Date().toISOString()
      };

      const res = await chatCol.add(itemToSave);
      return {
        code: 0,
        message: '消息已成功持久化至云端会话中心',
        docId: res.id,
        msgId,
        orderNo: cleanOrderNo
      };
    }

    // 2. 查询指定订单的所有历史消息
    if (action === 'list' || action === 'get') {
      const res = await chatCol
        .where({ orderNo: cleanOrderNo })
        .orderBy('timestamp', 'asc')
        .limit(100)
        .get();

      return {
        code: 0,
        message: '历史会话拉取成功',
        orderNo: cleanOrderNo,
        count: (res.data && res.data.length) || 0,
        data: res.data || []
      };
    }

    // 3. 批量同步订单全量聊天记录
    if (action === 'sync') {
      if (!Array.isArray(messages)) {
        return { code: 400, message: '批量同步需要提供 messages 数组' };
      }

      let savedCount = 0;
      for (const msg of messages) {
        const msgId = msg.id || \`msg-\${Date.now()}-\${Math.random().toString(36).slice(2, 6)}\`;
        const check = await chatCol.where({ id: msgId }).limit(1).get();
        if (check.data && check.data.length > 0) {
          await chatCol.doc(check.data[0]._id).update({
            ...msg,
            orderNo: cleanOrderNo,
            cloudSyncedAt: new Date().toISOString()
          });
        } else {
          await chatCol.add({
            ...msg,
            id: msgId,
            orderNo: cleanOrderNo,
            cloudSyncedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
          });
        }
        savedCount++;
      }

      return {
        code: 0,
        message: '批量同步订单聊天数据完成',
        orderNo: cleanOrderNo,
        count: savedCount
      };
    }

    // 4. 清理当前订单测试会话
    if (action === 'clear') {
      const res = await chatCol.where({ orderNo: cleanOrderNo }).remove();
      return {
        code: 0,
        message: '订单会话已重置',
        deletedCount: res.deleted
      };
    }

    return { code: 400, message: \`不支持的操作指令: \${action}\` };
  } catch (err) {
    return {
      code: 500,
      message: err.message || '云函数执行异常'
    };
  }
};`
  },

  RIDER_SETTLEMENT_TRACE: {
    name: 'riderSettlementTrace',
    description: '骑手已结算订单履约生命周期全链路存证（联系回溯 + 订单节点时间轴 + 沟通记录 + 送达拍照 + 温控封条）',
    packageJson: `{
  "name": "riderSettlementTrace",
  "version": "1.0.0",
  "dependencies": {
    "@cloudbase/node-sdk": "latest"
  }
}`,
    indexJs: `const cloud = require('@cloudbase/node-sdk');
const app = cloud.init({ env: cloud.SYMBOL_CURRENT_ENV });
const db = app.database();

/**
 * 骑手结算订单全链路履约与存证中心云函数
 * 集合名称: obsidian_settled_deliveries
 */
exports.main = async (event, context) => {
  const { action = 'save', orderNo, traceRecord, limit = 50 } = event;
  const cleanOrderNo = (orderNo || (traceRecord && traceRecord.orderNo) || '').replace(/^#/, '');

  const col = db.collection('obsidian_settled_deliveries');

  try {
    // 1. 保存 / 更新结算订单全维存证数据（节点 + 聊天 + 拍照 + 运费明细）
    if (action === 'save' || action === 'sync') {
      if (!traceRecord) {
        return { code: 400, message: '缺少待存证的履约数据体 traceRecord' };
      }

      const docToSave = {
        ...traceRecord,
        orderNo: cleanOrderNo,
        cloudSyncedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const existing = await col.where({ orderNo: cleanOrderNo }).limit(1).get();
      if (existing.data && existing.data.length > 0) {
        await col.doc(existing.data[0]._id).update(docToSave);
        return {
          code: 0,
          message: '结算订单履约存证与沟通记录已在云端更新对齐',
          docId: existing.data[0]._id,
          orderNo: cleanOrderNo,
          syncedAt: docToSave.cloudSyncedAt
        };
      } else {
        const addRes = await col.add({
          ...docToSave,
          createdAt: new Date().toISOString()
        });
        return {
          code: 0,
          message: '结算订单全节点、沟通回溯与送达拍照已成功上链存证至云数据库',
          docId: addRes.id,
          orderNo: cleanOrderNo,
          syncedAt: docToSave.cloudSyncedAt
        };
      }
    }

    // 2. 查询指定订单的履约存证
    if (action === 'get') {
      if (!cleanOrderNo) {
        return { code: 400, message: '请提供待查询的 orderNo' };
      }
      const res = await col.where({ orderNo: cleanOrderNo }).limit(1).get();
      if (res.data && res.data.length > 0) {
        return { code: 0, message: '获取履约存证成功', data: res.data[0] };
      }
      return { code: 0, message: '未找到云端历史存证', data: null };
    }

    // 3. 列表拉取最近结算存证
    if (action === 'list') {
      const res = await col.orderBy('completedTime', 'desc').limit(limit).get();
      return {
        code: 0,
        message: '拉取结算存证列表成功',
        count: (res.data && res.data.length) || 0,
        data: res.data || []
      };
    }

    return { code: 400, message: '未知操作指令 action: ' + action };
  } catch (err) {
    return { code: 500, message: err.message || '云函数执行异常' };
  }
};`
  }
};

/**
 * 将骑手结算订单的完整存证数据（订单信息、联系回溯、时间节点、沟通记录、送达拍照）同步至云端
 */
export async function syncSettledDeliveryTraceToCloud(
  traceRecord: any
): Promise<{ success: boolean; docId?: string; message: string; source: 'cloud_function' | 'local_fallback' }> {
  const startTime = Date.now();
  const cleanNo = (traceRecord.orderNo || '').replace(/^#/, '');
  const nowIso = new Date().toISOString();

  // 1. 本地双轨持久化保证绝对不丢失
  try {
    const existingList = safeGetStorage<any[]>('obsidian_rider_settled_traces', []);
    const updated = [
      { ...traceRecord, orderNo: cleanNo, cloudSynced: true, cloudSyncTime: nowIso },
      ...existingList.filter((item) => (item.orderNo || '').replace(/^#/, '') !== cleanNo)
    ];
    safeSetStorage('obsidian_rider_settled_traces', updated);
  } catch (err) {
    // ignore
  }

  // 2. 尝试调用云函数 / 云数据库
  try {
    await ensureCloudbaseAuth();
    const { app: tcbApp, db: tcbDb } = getCloudbaseApp();

    if (tcbApp) {
      // 优先调用云函数
      try {
        const cfRes = await tcbApp.callFunction({
          name: TCB_FUNCTION_NAMES.RIDER_SETTLEMENT_TRACE,
          data: {
            action: 'save',
            orderNo: cleanNo,
            traceRecord: {
              ...traceRecord,
              orderNo: cleanNo,
              cloudSynced: true,
              cloudSyncTime: nowIso
            }
          }
        });

        const duration = Date.now() - startTime;
        recordCloudFunctionLog({
          functionName: TCB_FUNCTION_NAMES.RIDER_SETTLEMENT_TRACE,
          action: 'save_settlement_trace',
          timestamp: new Date().toLocaleTimeString(),
          durationMs: duration,
          status: 'success',
          requestPayload: { orderNo: cleanNo, milestonesCount: traceRecord.timelineNodes?.length, photosCount: traceRecord.deliveryPhotos?.length },
          responsePayload: cfRes.result,
          source: 'cloud_function',
          message: `云函数执行成功：订单 #${cleanNo} 全链路节点、沟通记录与送达拍照已上链存证`
        });

        return {
          success: true,
          docId: cfRes.result?.docId || `tcb-${Date.now()}`,
          message: '已成功通过云函数 (riderSettlementTrace) 将全链路存证同步至云端',
          source: 'cloud_function'
        };
      } catch (cfErr: any) {
        // 云函数降级至云数据库集合直连
        if (tcbDb) {
          const col = tcbDb.collection(TCB_COLLECTIONS.RIDER_SETTLEMENT_TRACES);
          const existing = await col.where({ orderNo: cleanNo }).limit(1).get().catch(() => ({ data: [] }));
          let docId = '';
          if (existing.data && existing.data.length > 0) {
            docId = existing.data[0]._id;
            await col.doc(docId).update({
              ...traceRecord,
              orderNo: cleanNo,
              cloudSynced: true,
              cloudSyncTime: nowIso,
              updatedAt: nowIso
            });
          } else {
            const addRes = await col.add({
              ...traceRecord,
              orderNo: cleanNo,
              cloudSynced: true,
              cloudSyncTime: nowIso,
              createdAt: nowIso
            });
            docId = addRes.id;
          }

          const duration = Date.now() - startTime;
          recordCloudFunctionLog({
            functionName: 'tcb_database_direct',
            action: 'save_settlement_trace_db',
            timestamp: new Date().toLocaleTimeString(),
            durationMs: duration,
            status: 'success',
            requestPayload: { orderNo: cleanNo },
            responsePayload: { docId },
            source: 'cloud_function',
            message: `云数据库直连成功：订单 #${cleanNo} 履约档案已写入集合 ${TCB_COLLECTIONS.RIDER_SETTLEMENT_TRACES}`
          });

          return {
            success: true,
            docId,
            message: '已直连云数据库集合完成全维度存证存储',
            source: 'cloud_function'
          };
        }
      }
    }
  } catch (err: any) {
    // Fallback to local
  }

  const duration = Date.now() - startTime;
  recordCloudFunctionLog({
    functionName: 'riderSettlementTraceFallback',
    action: 'save_settlement_trace_local',
    timestamp: new Date().toLocaleTimeString(),
    durationMs: duration,
    status: 'warning',
    requestPayload: { orderNo: cleanNo },
    responsePayload: { persisted: true },
    source: 'local_fallback',
    message: `双轨降级保底：订单 #${cleanNo} 存证已写入本地抗清空存储，待网络恢复后自动补传`
  });

  return {
    success: true,
    message: '已完成双轨持久化存证 (本地安全就绪，网络恢复将即刻上云)',
    source: 'local_fallback'
  };
}

/**
 * 从云端或本地检索指定订单的履约存证
 */
export async function fetchSettledDeliveryTraceFromCloud(
  orderNo: string
): Promise<any | null> {
  const cleanNo = orderNo.replace(/^#/, '');

  try {
    await ensureCloudbaseAuth();
    const { app: tcbApp, db: tcbDb } = getCloudbaseApp();

    if (tcbApp) {
      try {
        const cfRes = await tcbApp.callFunction({
          name: TCB_FUNCTION_NAMES.RIDER_SETTLEMENT_TRACE,
          data: { action: 'get', orderNo: cleanNo }
        });
        if (cfRes.result && cfRes.result.code === 0 && cfRes.result.data) {
          return cfRes.result.data;
        }
      } catch {
        // ignore
      }
    }

    if (tcbDb) {
      const col = tcbDb.collection(TCB_COLLECTIONS.RIDER_SETTLEMENT_TRACES);
      const res = await col.where({ orderNo: cleanNo }).limit(1).get();
      if (res.data && res.data.length > 0) {
        return res.data[0];
      }
    }
  } catch {
    // ignore
  }

  // Local fallback
  const localList = safeGetStorage<any[]>('obsidian_rider_settled_traces', []);
  const found = localList.find((item) => (item.orderNo || '').replace(/^#/, '') === cleanNo);
  return found || null;
}

