export interface UserAddress {
  id: string;
  name: string;
  phone: string;
  tag: '公司' | '家' | '学校' | '其他';
  address: string;
  detail: string;
  isDefault: boolean;
  createdAt?: string;
}

export interface UserPreferences {
  spiciness: 'none' | 'mild' | 'medium' | 'hot';
  cutlery: 'needed' | 'not_needed' | 'eco';
  autoApplyCoupons: boolean;
  radarTracking: boolean;
  smsNotification: boolean;
  dietaryNote?: string;
}

export interface UserWalletTransaction {
  id: string;
  type: 'recharge' | 'expense' | 'refund' | 'reward';
  title: string;
  amount: number;
  balanceAfter: number;
  timestamp: string;
  orderNo?: string;
}

export interface UserProfile {
  uid: string;
  nickname: string;
  phone: string;
  avatar: string;
  bio: string;
  gender: 'secret' | 'male' | 'female';
  birthday: string;
  membershipTier: 'standard' | 'vip_silver' | 'vip_black_elite';
  isVIPActive: boolean;
  points: number;
  balance: number;
  addresses: UserAddress[];
  preferences: UserPreferences;
  walletHistory: UserWalletTransaction[];
  cloudSyncedAt?: string;
  authProvider: 'cloudbase_auth' | 'custom_phone' | 'anonymous';
  hardwareHash?: string;
  deviceFingerprint?: string;
  autoLoginScore?: number;
  createdAt: string;
}

export interface CloudFunctionCallLog {
  id: string;
  functionName: string;
  action?: string;
  timestamp: string;
  durationMs: number;
  status: 'success' | 'warning' | 'error';
  requestPayload: any;
  responsePayload: any;
  source: 'cloud_function' | 'local_fallback' | 'cloudbase_db';
  message: string;
}
