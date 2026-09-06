/**
 * 商家端统一用户数据中心 — 数据聚合与持久化层
 *
 * 将「客户端无密码登录」(UserAuthModal / autoAuthEngine) 中产生的用户档案
 * (UserProfile 全量字段: 手机号、昵称、会员等级、积分、余额、地址簿、
 * 偏好设置、钱包流水、设备硬件指纹等) 系统移植至商家端，
 * 做成一个可检索、可编辑、可运营的统一用户数据管理后台。
 *
 * 数据来源 (首次进入时自动聚合去重):
 *  1. 客户端设备注册库 obsidian_cloud_device_registry (含各设备绑定的 userProfile)
 *  2. 当前登录用户档案 obsidian_user_profile
 *  3. INITIAL_USER_PROFILE 种子账号
 *  4. 内置演示账号 (覆盖不同会员等级, 便于后台运营演示)
 *
 * 聚合后写入商家端独立存储 obsidian_merchant_user_data,
 * 后续商家端的编辑以该存储为唯一事实来源 (与客户端互不污染)。
 */

import { UserProfile } from '../types/user';
import { INITIAL_USER_PROFILE } from '../data/mockUser';

const MERCHANT_USER_DATA_KEY = 'obsidian_merchant_user_data';
const CLIENT_DEVICE_REGISTRY_KEY = 'obsidian_cloud_device_registry';
const CLIENT_CURRENT_PROFILE_KEY = 'obsidian_user_profile';

function nowStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 内置演示账号 — 覆盖不同会员等级与状态, 使管理后台首次进入即有可运营数据。
 */
const DEMO_USERS: UserProfile[] = [
  {
    uid: 'tcb_u_demo_silver',
    nickname: '陈先生 (银卡会员)',
    phone: '137-2233-4455',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    bio: '每周三固定光顾午餐档, 偏好轻辣。',
    gender: 'male',
    birthday: '1992-07-09',
    membershipTier: 'vip_silver',
    isVIPActive: true,
    points: 1850,
    balance: 56.0,
    addresses: [
      {
        id: 'addr-demo-silver-1',
        name: '陈先生',
        phone: '137-2233-4455',
        tag: '公司',
        address: '静安区南京西路 1788 号',
        detail: '商务楼 22F 前台',
        isDefault: true,
        createdAt: '2026-06-12 09:30'
      }
    ],
    preferences: {
      spiciness: 'mild',
      cutlery: 'needed',
      autoApplyCoupons: true,
      radarTracking: true,
      smsNotification: true,
      dietaryNote: '微辣, 不要香菜'
    },
    walletHistory: [
      {
        id: 'w-demo-silver-1',
        type: 'recharge',
        title: '银卡会员充值',
        amount: 100.0,
        balanceAfter: 56.0,
        timestamp: '2026-07-01 12:00'
      }
    ],
    cloudSyncedAt: new Date().toISOString(),
    authProvider: 'custom_phone',
    hardwareHash: 'HW-DEMO-SILVER-77',
    deviceFingerprint: 'DEV-DEMO-SILVER-77',
    autoLoginScore: 98.5,
    createdAt: '2026-06-12 09:30:00'
  },
  {
    uid: 'tcb_u_demo_std',
    nickname: '小雨 (普通食客)',
    phone: '136-7788-1122',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
    bio: '偶尔路过自提, 尚未开通会员。',
    gender: 'female',
    birthday: '2001-11-22',
    membershipTier: 'standard',
    isVIPActive: false,
    points: 320,
    balance: 12.5,
    addresses: [
      {
        id: 'addr-demo-std-1',
        name: '小雨',
        phone: '136-7788-1122',
        tag: '学校',
        address: '上海大学延长校区',
        detail: '南门快递柜旁',
        isDefault: true,
        createdAt: '2026-08-02 19:10'
      }
    ],
    preferences: {
      spiciness: 'hot',
      cutlery: 'eco',
      autoApplyCoupons: false,
      radarTracking: false,
      smsNotification: true
    },
    walletHistory: [],
    cloudSyncedAt: new Date().toISOString(),
    authProvider: 'cloudbase_auth',
    hardwareHash: 'HW-DEMO-STD-21',
    deviceFingerprint: 'DEV-DEMO-STD-21',
    autoLoginScore: 95.0,
    createdAt: '2026-08-02 19:10:00'
  },
  {
    uid: 'tcb_u_demo_black',
    nickname: 'Kobe (黑金 VIP)',
    phone: '139-0011-2233',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    bio: '和牛资深品鉴官, 月均消费过万。',
    gender: 'male',
    birthday: '1988-02-14',
    membershipTier: 'vip_black_elite',
    isVIPActive: true,
    points: 12800,
    balance: 880.0,
    addresses: [
      {
        id: 'addr-demo-black-1',
        name: 'Kobe',
        phone: '139-0011-2233',
        tag: '家',
        address: '浦东新区陆家嘴环路 1000 号',
        detail: '恒生大厦 45F',
        isDefault: true,
        createdAt: '2026-03-20 10:00'
      },
      {
        id: 'addr-demo-black-2',
        name: 'Kobe (公司)',
        phone: '139-0011-2233',
        tag: '公司',
        address: '徐汇区漕溪北路 18 号',
        detail: '环球中心 30F',
        isDefault: false,
        createdAt: '2026-05-08 14:00'
      }
    ],
    preferences: {
      spiciness: 'none',
      cutlery: 'eco',
      autoApplyCoupons: true,
      radarTracking: true,
      smsNotification: true,
      dietaryNote: '全熟和牛, 免辣, 过敏: 花生'
    },
    walletHistory: [
      {
        id: 'w-demo-black-1',
        type: 'recharge',
        title: '黑金会员大额储值',
        amount: 1000.0,
        balanceAfter: 880.0,
        timestamp: '2026-08-15 11:20'
      },
      {
        id: 'w-demo-black-2',
        type: 'expense',
        title: '餐车订单支付 - UR-7741',
        amount: -120.0,
        balanceAfter: 880.0,
        timestamp: '2026-08-28 20:05',
        orderNo: 'UR-7741'
      }
    ],
    cloudSyncedAt: new Date().toISOString(),
    authProvider: 'cloudbase_auth',
    hardwareHash: 'HW-DEMO-BLACK-99',
    deviceFingerprint: 'DEV-DEMO-BLACK-99',
    autoLoginScore: 99.8,
    createdAt: '2026-03-20 10:00:00'
  }
];

/**
 * 从客户端各数据源聚合用户档案, 按 uid 去重。
 */
function aggregateFromClient(): UserProfile[] {
  const map = new Map<string, UserProfile>();
  const push = (u?: UserProfile) => {
    if (u && u.uid) map.set(u.uid, u);
  };

  push(INITIAL_USER_PROFILE);

  try {
    const regRaw = localStorage.getItem(CLIENT_DEVICE_REGISTRY_KEY);
    if (regRaw) {
      const reg = JSON.parse(regRaw) as { userProfile?: UserProfile }[];
      reg.forEach((b) => push(b.userProfile));
    }
  } catch {
    /* ignore */
  }

  try {
    const cur = localStorage.getItem(CLIENT_CURRENT_PROFILE_KEY);
    if (cur) push(JSON.parse(cur));
  } catch {
    /* ignore */
  }

  let list = Array.from(map.values());
  // 若聚合后仅默认账号, 补充演示账号使后台有运营数据
  if (list.length <= 1) {
    list = [INITIAL_USER_PROFILE, ...DEMO_USERS];
  }
  return list;
}

/**
 * 读取商家端统一用户数据 (首次自动从客户端聚合并落盘)。
 */
export function getUserDataRecords(): UserProfile[] {
  try {
    const raw = localStorage.getItem(MERCHANT_USER_DATA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as UserProfile[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* fall through to aggregate */
  }
  const aggregated = aggregateFromClient();
  try {
    localStorage.setItem(MERCHANT_USER_DATA_KEY, JSON.stringify(aggregated));
  } catch {
    /* ignore */
  }
  return aggregated;
}

/**
 * 全量覆盖保存商家端用户数据。
 */
export function saveUserDataRecords(users: UserProfile[]): void {
  try {
    localStorage.setItem(MERCHANT_USER_DATA_KEY, JSON.stringify(users));
  } catch {
    /* ignore */
  }
}

/**
 * 新增或更新单个用户 (按 uid 判重)。
 */
export function upsertUser(user: UserProfile): UserProfile[] {
  const list = getUserDataRecords();
  const idx = list.findIndex((u) => u.uid === user.uid);
  if (idx >= 0) {
    list[idx] = user;
  } else {
    list.unshift(user);
  }
  saveUserDataRecords(list);
  return list;
}

/**
 * 删除用户 (按 uid)。
 */
export function deleteUser(uid: string): UserProfile[] {
  const list = getUserDataRecords().filter((u) => u.uid !== uid);
  saveUserDataRecords(list);
  return list;
}

/**
 * 生成一个全新的用户档案 (对标客户端无密码注册逻辑)。
 */
export function createBlankUserProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  const ts = nowStamp();
  const uid = overrides.uid || `tcb_u_${Math.random().toString(36).slice(2, 10)}`;
  return {
    uid,
    nickname: overrides.nickname || '新注册食客',
    phone: overrides.phone || '',
    avatar: overrides.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
    bio: overrides.bio || '商家后台手动创建的会员档案',
    gender: overrides.gender || 'secret',
    birthday: overrides.birthday || '2000-01-01',
    membershipTier: overrides.membershipTier || 'standard',
    isVIPActive: overrides.isVIPActive ?? false,
    points: overrides.points ?? 0,
    balance: overrides.balance ?? 0,
    addresses: overrides.addresses || [],
    preferences: overrides.preferences || {
      spiciness: 'mild',
      cutlery: 'eco',
      autoApplyCoupons: true,
      radarTracking: true,
      smsNotification: true
    },
    walletHistory: overrides.walletHistory || [],
    cloudSyncedAt: new Date().toISOString(),
    authProvider: overrides.authProvider || 'custom_phone',
    hardwareHash: overrides.hardwareHash,
    deviceFingerprint: overrides.deviceFingerprint,
    autoLoginScore: overrides.autoLoginScore,
    createdAt: overrides.createdAt || ts
  };
}

/**
 * 调整用户余额/积分, 并写入一条钱包流水。
 */
export function adjustUserBalance(
  user: UserProfile,
  kind: 'balance' | 'points',
  delta: number,
  note: string
): UserProfile {
  const updated: UserProfile = { ...user };
  if (kind === 'balance') {
    const newBalance = Math.max(0, Number((user.balance + delta).toFixed(2)));
    updated.walletHistory = [
      {
        id: `w-mgr-${Date.now()}`,
        type: delta >= 0 ? 'recharge' : 'expense',
        title: note || (delta >= 0 ? '商家后台充值/调增' : '商家后台扣减'),
        amount: Number(delta.toFixed(2)),
        balanceAfter: newBalance,
        timestamp: nowStamp(),
        orderNo: 'MERCHANT-MGR'
      },
      ...user.walletHistory
    ];
    updated.balance = newBalance;
  } else {
    updated.points = Math.max(0, user.points + delta);
  }
  return updated;
}

/**
 * 将用户列表导出为 CSV 文本 (供后台运营下载)。
 */
export function usersToCsv(users: UserProfile[]): string {
  const header = [
    'UID',
    '昵称',
    '手机号',
    '会员等级',
    'VIP生效',
    '积分',
    '余额',
    '注册来源',
    '设备指纹',
    '免密置信度',
    '地址数',
    '创建时间'
  ];
  const rows = users.map((u) =>
    [
      u.uid,
      u.nickname,
      u.phone,
      u.membershipTier,
      u.isVIPActive ? '是' : '否',
      u.points,
      u.balance,
      u.authProvider,
      u.hardwareHash || '',
      u.autoLoginScore != null ? `${u.autoLoginScore}%` : '',
      u.addresses.length,
      u.createdAt
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  );
  return [header.join(','), ...rows].join('\n');
}
