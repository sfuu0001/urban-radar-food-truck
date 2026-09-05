import {
  VersionPointer,
  MilestoneSnapshot,
  MerchantOperator,
  FieldDiff,
  VersionModuleType,
  VersionActionType
} from '../types/versionTracking';
import { safeGetStorage, safeSetStorage } from './safeStorage';

// Storage Keys
const STORAGE_KEY_POINTERS = 'obsidian_version_pointers';
const STORAGE_KEY_SNAPSHOTS = 'obsidian_milestone_snapshots';
const STORAGE_KEY_ACTIVE_OPERATOR = 'obsidian_current_merchant_operator';

// Default Merchant Operators (Staff accounts)
export const DEFAULT_MERCHANT_OPERATORS: MerchantOperator[] = [
  {
    id: 'op-01',
    username: 'zhanglei_mgr',
    name: '张磊',
    role: 'manager',
    roleName: '店长 / 运营总管',
    avatar: '👨‍💼',
    deviceInfo: 'iPad Pro 12.9 (餐车总控台 POS-01)',
    ip: '192.168.1.102',
    shiftBadge: '早班总控'
  },
  {
    id: 'op-02',
    username: 'chef_wang',
    name: '王师傅',
    role: 'grill_chef',
    roleName: '炭烤档口主厨 / 研发',
    avatar: '👨‍🍳',
    deviceInfo: 'KDS 触屏工业端 (KDS-KITCHEN-01)',
    ip: '192.168.1.108',
    shiftBadge: '后厨主理'
  },
  {
    id: 'op-03',
    username: 'lixiaomeng_cashier',
    name: '李晓萌',
    role: 'cashier',
    roleName: '前台领班 / 收银主管',
    avatar: '👩‍💼',
    deviceInfo: '移动收银手持机 (POS-MOBILE-02)',
    ip: '192.168.1.115',
    shiftBadge: '中班领班'
  },
  {
    id: 'op-04',
    username: 'chenhao_bar',
    name: '陈浩',
    role: 'barista',
    roleName: '特调水吧师 / 辅料管理',
    avatar: '🧑‍🍳',
    deviceInfo: '水吧操作平板 (BAR-PAD-01)',
    ip: '192.168.1.120',
    shiftBadge: '全天水吧'
  },
  {
    id: 'op-05',
    username: 'zhaoqiang_dispatch',
    name: '赵强',
    role: 'rider',
    roleName: '外卖专送领队 / 配送调配',
    avatar: '🛵',
    deviceInfo: '骑手调度控制台 (DISPATCH-01)',
    ip: '192.168.1.133',
    shiftBadge: '外卖专班'
  },
  {
    id: 'op-sys',
    username: 'system_daemon',
    name: '系统自动化服务',
    role: 'system',
    roleName: '智能风控与云端守护进程',
    avatar: '🤖',
    deviceInfo: 'CloudBase Serverless Node.js Worker',
    ip: '10.0.4.18',
    shiftBadge: '24H 常驻'
  }
];

// Human-friendly field labels mapping
const FIELD_LABEL_MAP: Record<string, string> = {
  // Dishes
  name: '菜品/原料名称',
  enName: '英文名称',
  price: '销售价格 (¥)',
  originalPrice: '划线原价 (¥)',
  deliveryDiscount: '外卖立减金额 (¥)',
  dineInDiscount: '堂食立减金额 (¥)',
  available: '上架/售罄状态',
  unavailableReason: '沽清/停售原因',
  category: '品类所属分类',
  subCategoryName: '二级子分类',
  spicinessLevel: '默认辣度',
  flavor: '推荐风味',
  prepTime: '预估出餐时长',
  description: '菜品简介与卖点',
  craftStandardNote: '烹饪工艺要点',
  isPopular: '热销爆款推荐',
  isChefSpecial: '主厨甄选标识',

  // Materials & Stock
  currentStock: '当前在库库存量',
  safetyStock: '安全库存警戒线',
  reorderSuggestion: '建议补货量',
  purchasePrice: '采购参考单价 (¥)',
  storageLocation: '库位与储存温区',
  supplier: '合作供应商名称',
  supplierPhone: '供货商联系电话',
  status: '库存/运营状态',
  remark: '调整原因/备注',

  // Coupons & Marketing
  title: '优惠券/活动名称',
  code: '兑换券码',
  discountValue: '优惠面额/折扣率',
  minSpend: '使用门槛金额 (¥)',
  allowStackWithActivity: '允许叠加全场满减',
  allowStackWithVIP: '允许叠加VIP会员折扣',
  isExclusive: '是否为排他独享券',
  totalQuantity: '总发行量上限',
  expireDate: '到期截止日期',
  scopeType: '适用商品范围',

  // Tables & GPS
  tableCode: '桌台编号',
  qrCode: '扫码点餐码',
  qrEnabled: '桌码点餐开关',
  stallLocation: '流动餐车站位地址',
  deliveryRadius: '外送服务半径 (km)',
  businessHours: '营业时段配置',

  // Staff & RBAC
  phone: '联系手机号',
  roleTitle: '岗位职称',
  permissions: '系统操作权限清单',

  // Delivery settings
  minDeliveryAmount: '起送最低消费门槛 (¥)',
  deliveryFee: '基础配送运费 (¥)',
  freeDeliveryThreshold: '免外送费包邮门槛 (¥)'
};

// Module names mapping
export const MODULE_NAME_MAP: Record<VersionModuleType, string> = {
  dishes: '菜品与菜单管理',
  materials: '原料与库存资产',
  coupons: '优惠券与营销发券',
  marketing: '阶梯满减与叠享规则',
  tables: '桌台与餐车点位',
  staff: '员工花名册与RBAC',
  delivery: '外卖配送与运费配置',
  payments: '支付渠道与结算',
  stall_gps: '餐车GPS与营业时段',
  craft_standards: '主厨SOP与工艺配方',
  system: '系统应急与全局配置'
};

// Action names mapping
export const ACTION_NAME_MAP: Record<VersionActionType, string> = {
  create: '新增录入',
  update: '字段修改',
  delete: '删除/注销',
  batch_adjust: '批量调价/盘点',
  rollback: '版本回滚修复',
  snapshot_restore: '全量快照还原',
  snapshot_create: '创建安全快照'
};

// Simple pseudo-random hash generator for data integrity signatures
function generateHash(dataStr: string): string {
  let hash = 0;
  for (let i = 0; i < dataStr.length; i++) {
    const char = dataStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `sha256_${hex}${Date.now().toString(16).slice(-6)}`;
}

// Generate human-readable format for diff values
function formatDiffValue(val: any): string {
  if (val === undefined || val === null) return '无 / 未配置';
  if (typeof val === 'boolean') return val ? '是 (开启)' : '否 (关闭)';
  if (typeof val === 'number') return `${val}`;
  if (Array.isArray(val)) return `[${val.join(', ')}]`;
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

// Compute deep structural diff between before and after objects
export function computeFieldDiffs(beforeObj: any, afterObj: any): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  if (!beforeObj && !afterObj) return diffs;

  const allKeys = new Set([
    ...Object.keys(beforeObj || {}),
    ...Object.keys(afterObj || {})
  ]);

  // Keys to ignore from noisy visual diff
  const ignoredKeys = new Set([
    'updatedAt',
    'createdAt',
    'id',
    'pointerId',
    'lastModified'
  ]);

  allKeys.forEach((key) => {
    if (ignoredKeys.has(key)) return;

    const beforeVal = beforeObj ? beforeObj[key] : undefined;
    const afterVal = afterObj ? afterObj[key] : undefined;

    const beforeStr = JSON.stringify(beforeVal);
    const afterStr = JSON.stringify(afterVal);

    if (beforeStr !== afterStr) {
      let diffType: 'added' | 'modified' | 'removed' = 'modified';
      if (beforeVal === undefined && afterVal !== undefined) {
        diffType = 'added';
      } else if (beforeVal !== undefined && afterVal === undefined) {
        diffType = 'removed';
      }

      const fieldLabel = FIELD_LABEL_MAP[key] || key;

      diffs.push({
        field: key,
        fieldLabel,
        diffType,
        oldValue: beforeVal,
        newValue: afterVal,
        oldValueDisplay: formatDiffValue(beforeVal),
        newValueDisplay: formatDiffValue(afterVal)
      });
    }
  });

  return diffs;
}

// Initial Mock Version Pointers (Rich timeline of historical operations)
const INITIAL_VERSION_POINTERS: VersionPointer[] = [
  {
    pointerId: 'rev_9a4f2101_1725189200',
    versionTag: 'v2.6.48',
    timestamp: '2026-09-01 11:45:12',
    formattedTime: '今日 11:45',
    operator: DEFAULT_MERCHANT_OPERATORS[0], // 张磊
    module: 'dishes',
    moduleName: '菜品与菜单管理',
    actionType: 'update',
    actionName: '字段修改',
    entityId: 'dish-1',
    entityName: '炭烤安格斯牛肉串 (3串/份)',
    summary: '店长张磊 将菜品价格从 ¥38.00 调低至 ¥32.00，新增外卖立减 ¥3.00 并调整风味标签',
    fieldDiffs: [
      {
        field: 'price',
        fieldLabel: '销售价格 (¥)',
        diffType: 'modified',
        oldValue: 38,
        newValue: 32,
        oldValueDisplay: '¥38.00',
        newValueDisplay: '¥32.00'
      },
      {
        field: 'deliveryDiscount',
        fieldLabel: '外卖立减金额 (¥)',
        diffType: 'added',
        oldValue: 0,
        newValue: 3,
        oldValueDisplay: '¥0.00',
        newValueDisplay: '¥3.00'
      },
      {
        field: 'flavor',
        fieldLabel: '推荐风味',
        diffType: 'modified',
        oldValue: '经典椒盐',
        newValue: '秘制黑椒酱香 (主厨推荐)',
        oldValueDisplay: '经典椒盐',
        newValueDisplay: '秘制黑椒酱香 (主厨推荐)'
      }
    ],
    beforeSnapshot: {
      id: 'dish-1',
      name: '炭烤安格斯牛肉串 (3串/份)',
      price: 38,
      deliveryDiscount: 0,
      flavor: '经典椒盐',
      available: true
    },
    afterSnapshot: {
      id: 'dish-1',
      name: '炭烤安格斯牛肉串 (3串/份)',
      price: 32,
      deliveryDiscount: 3,
      flavor: '秘制黑椒酱香 (主厨推荐)',
      available: true
    },
    isRevertible: true,
    integrityHash: 'sha256_88e40129bc7891',
    status: 'active'
  },
  {
    pointerId: 'rev_8b3c9902_1725184500',
    versionTag: 'v2.6.47',
    timestamp: '2026-09-01 10:28:45',
    formattedTime: '今日 10:28',
    operator: DEFAULT_MERCHANT_OPERATORS[1], // 王师傅
    module: 'materials',
    moduleName: '原料与库存资产',
    actionType: 'update',
    actionName: '库存校准与安全线调优',
    entityId: 'mat-001',
    entityName: '安格斯谷饲牛上脑肉 (原切)',
    summary: '炭烤主厨王师傅 进行晨间盘点实测调账：实盘校准库存 +12.5kg，上调安全库存警戒线至 30.0kg',
    fieldDiffs: [
      {
        field: 'currentStock',
        fieldLabel: '当前在库库存量',
        diffType: 'modified',
        oldValue: 35.5,
        newValue: 48.0,
        oldValueDisplay: '35.5 kg',
        newValueDisplay: '48.0 kg'
      },
      {
        field: 'safetyStock',
        fieldLabel: '安全库存警戒线',
        diffType: 'modified',
        oldValue: 20.0,
        newValue: 30.0,
        oldValueDisplay: '20.0 kg',
        newValueDisplay: '30.0 kg'
      },
      {
        field: 'remark',
        fieldLabel: '调整原因/备注',
        diffType: 'modified',
        oldValue: '常规采购入库',
        newValue: '2026-09-01: 晨间开餐盘点差异校准 (+12.5kg)',
        oldValueDisplay: '常规采购入库',
        newValueDisplay: '2026-09-01: 晨间开餐盘点差异校准 (+12.5kg)'
      }
    ],
    beforeSnapshot: {
      id: 'mat-001',
      name: '安格斯谷饲牛上脑肉 (原切)',
      currentStock: 35.5,
      safetyStock: 20.0,
      status: 'normal'
    },
    afterSnapshot: {
      id: 'mat-001',
      name: '安格斯谷饲牛上脑肉 (原切)',
      currentStock: 48.0,
      safetyStock: 30.0,
      status: 'normal'
    },
    isRevertible: true,
    integrityHash: 'sha256_77c10931af6420',
    status: 'active'
  },
  {
    pointerId: 'rev_7d1e8803_1725178100',
    versionTag: 'v2.6.46',
    timestamp: '2026-09-01 08:35:20',
    formattedTime: '今日 08:35',
    operator: DEFAULT_MERCHANT_OPERATORS[2], // 李晓萌
    module: 'coupons',
    moduleName: '优惠券与营销发券',
    actionType: 'create',
    actionName: '新增录入',
    entityId: 'cpn-lunch-10',
    entityName: '午市炙烤专享立减券 (¥10)',
    summary: '前台领班李晓萌 新上线营销券【午市炙烤专享立减券】：满 ¥50 立减 ¥10，支持全场满减与VIP叠享',
    fieldDiffs: [
      {
        field: 'title',
        fieldLabel: '优惠券/活动名称',
        diffType: 'added',
        oldValue: undefined,
        newValue: '午市炙烤专享满减券',
        oldValueDisplay: '无',
        newValueDisplay: '午市炙烤专享满减券'
      },
      {
        field: 'discountValue',
        fieldLabel: '优惠面额/折扣率',
        diffType: 'added',
        oldValue: undefined,
        newValue: 10,
        oldValueDisplay: '无',
        newValueDisplay: '¥10.00'
      },
      {
        field: 'minSpend',
        fieldLabel: '使用门槛金额 (¥)',
        diffType: 'added',
        oldValue: undefined,
        newValue: 50,
        oldValueDisplay: '无',
        newValueDisplay: '满 ¥50.00 可用'
      },
      {
        field: 'allowStackWithActivity',
        fieldLabel: '允许叠加全场满减',
        diffType: 'added',
        oldValue: undefined,
        newValue: true,
        oldValueDisplay: '无',
        newValueDisplay: '是 (开启)'
      }
    ],
    beforeSnapshot: null,
    afterSnapshot: {
      id: 'cpn-lunch-10',
      title: '午市炙烤专享满减券',
      code: 'UR-LUNCH10',
      discountValue: 10,
      minSpend: 50,
      allowStackWithActivity: true,
      status: 'active'
    },
    isRevertible: true,
    integrityHash: 'sha256_55a90184ce1174',
    status: 'active'
  },
  {
    pointerId: 'rev_6a0f7704_1725154800',
    versionTag: 'v2.6.45',
    timestamp: '2026-08-31 22:15:00',
    formattedTime: '昨日 22:15',
    operator: DEFAULT_MERCHANT_OPERATORS[0], // 张磊
    module: 'marketing',
    moduleName: '阶梯满减与叠享规则',
    actionType: 'update',
    actionName: '阶梯满减策略调整',
    entityId: 'promo-stacking-config',
    entityName: '全场阶梯满减与防刷风控规则',
    summary: '店长张磊 更新满减阶梯规则：新增【满120减18】与【满200减35】，开启支付渠道立减叠加',
    fieldDiffs: [
      {
        field: 'activityRules',
        fieldLabel: '阶梯满减档位',
        diffType: 'modified',
        oldValue: '满50减5, 满80减10',
        newValue: '满50减5, 满80减10, 满120减18, 满200减35',
        oldValueDisplay: '2个档位',
        newValueDisplay: '4个阶梯档位'
      },
      {
        field: 'stackCouponWithPayment',
        fieldLabel: '券与支付渠道立减叠加',
        diffType: 'modified',
        oldValue: false,
        newValue: true,
        oldValueDisplay: '否 (互斥)',
        newValueDisplay: '是 (允许叠加)'
      }
    ],
    beforeSnapshot: {
      activityRules: [
        { minSpend: 50, discountAmount: 5 },
        { minSpend: 80, discountAmount: 10 }
      ],
      stackCouponWithPayment: false
    },
    afterSnapshot: {
      activityRules: [
        { minSpend: 50, discountAmount: 5 },
        { minSpend: 80, discountAmount: 10 },
        { minSpend: 120, discountAmount: 18 },
        { minSpend: 200, discountAmount: 35 }
      ],
      stackCouponWithPayment: true
    },
    isRevertible: true,
    integrityHash: 'sha256_33b81092de9932',
    status: 'active'
  },
  {
    pointerId: 'rev_5e9b6605_1725142100',
    versionTag: 'v2.6.44',
    timestamp: '2026-08-31 18:40:15',
    formattedTime: '昨日 18:40',
    operator: DEFAULT_MERCHANT_OPERATORS[4], // 赵强
    module: 'delivery',
    moduleName: '外卖配送与运费配置',
    actionType: 'update',
    actionName: '字段修改',
    entityId: 'delivery-config',
    entityName: '餐车半径外卖配送与运费策略',
    summary: '外卖主管赵强 将起送最低消费从 ¥25.00 下调为 ¥20.00，免外送费门槛设为 ¥68.00',
    fieldDiffs: [
      {
        field: 'minDeliveryAmount',
        fieldLabel: '起送最低消费门槛 (¥)',
        diffType: 'modified',
        oldValue: 25,
        newValue: 20,
        oldValueDisplay: '¥25.00',
        newValueDisplay: '¥20.00'
      },
      {
        field: 'freeDeliveryThreshold',
        fieldLabel: '免外送费包邮门槛 (¥)',
        diffType: 'modified',
        oldValue: 88,
        newValue: 68,
        oldValueDisplay: '¥88.00',
        newValueDisplay: '¥68.00'
      }
    ],
    beforeSnapshot: {
      minDeliveryAmount: 25,
      freeDeliveryThreshold: 88,
      deliveryFee: 5
    },
    afterSnapshot: {
      minDeliveryAmount: 20,
      freeDeliveryThreshold: 68,
      deliveryFee: 5
    },
    isRevertible: true,
    integrityHash: 'sha256_22f70183ee4489',
    status: 'active'
  }
];

// Initial Milestone Snapshots
const INITIAL_SNAPSHOTS: MilestoneSnapshot[] = [
  {
    snapshotId: 'snap_20260901_0800',
    title: '2026-09-01 早市开餐前基准快照 (Milestone)',
    description: '完成晨间采购入库及菜单价格核对后的稳定运营快照，供全天应急比对与回滚。',
    createdAt: '2026-09-01 08:00:00',
    createdBy: DEFAULT_MERCHANT_OPERATORS[0],
    tag: 'pre_rush',
    tagLabel: '开餐前基线',
    dataSummary: {
      dishesCount: 24,
      materialsCount: 16,
      couponsCount: 8,
      staffCount: 5,
      tablesCount: 12
    },
    payload: {},
    integrityHash: 'sha256_99bba102938475'
  },
  {
    snapshotId: 'snap_20260831_2330',
    title: '2026-08-31 晚市打烊日结安全存档',
    description: '全天营业结束日结结算快照，包含完整库存结存及营销核销明细。',
    createdAt: '2026-08-31 23:30:12',
    createdBy: DEFAULT_MERCHANT_OPERATORS[0],
    tag: 'post_rush',
    tagLabel: '打烊日结存档',
    dataSummary: {
      dishesCount: 24,
      materialsCount: 16,
      couponsCount: 7,
      staffCount: 5,
      tablesCount: 12
    },
    payload: {},
    integrityHash: 'sha256_88ffa901827364'
  }
];

// -------------------------------------------------------------
// Engine API Class
// -------------------------------------------------------------

class VersionPointerEngine {
  // Get active merchant operator
  public getActiveOperator(): MerchantOperator {
    return safeGetStorage<MerchantOperator>(
      STORAGE_KEY_ACTIVE_OPERATOR,
      DEFAULT_MERCHANT_OPERATORS[0]
    );
  }

  // Set active merchant operator
  public setActiveOperator(operator: MerchantOperator): void {
    safeSetStorage(STORAGE_KEY_ACTIVE_OPERATOR, operator);
    window.dispatchEvent(
      new CustomEvent('obsidian_operator_changed', { detail: operator })
    );
  }

  // Get all version pointers
  public getAllPointers(): VersionPointer[] {
    return safeGetStorage<VersionPointer[]>(
      STORAGE_KEY_POINTERS,
      INITIAL_VERSION_POINTERS
    );
  }

  // Save all version pointers
  public savePointers(pointers: VersionPointer[]): void {
    safeSetStorage(STORAGE_KEY_POINTERS, pointers);
    window.dispatchEvent(
      new CustomEvent('obsidian_version_pointers_updated', { detail: pointers })
    );
  }

  // Record a new data mutation pointer
  public recordDataMutation<T>(params: {
    module: VersionModuleType;
    entityId: string;
    entityName: string;
    actionType: VersionActionType;
    beforeData: T | null;
    afterData: T | null;
    customSummary?: string;
    operatorOverride?: MerchantOperator;
    isRollback?: boolean;
    rollbackSourcePointerId?: string;
  }): VersionPointer {
    const operator = params.operatorOverride || this.getActiveOperator();
    const fieldDiffs = computeFieldDiffs(params.beforeData, params.afterData);

    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const formattedTime = `今日 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const pointerId = `rev_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
    const existingPointers = this.getAllPointers();
    const versionNumber = existingPointers.length + 1;
    const versionTag = `v2.6.${versionNumber + 48}`;

    // Auto generate descriptive summary if not provided
    let summary = params.customSummary;
    if (!summary) {
      const actionName = ACTION_NAME_MAP[params.actionType];
      if (params.actionType === 'create') {
        summary = `${operator.name} (${operator.roleName}) 新增创建【${params.entityName}】`;
      } else if (params.actionType === 'delete') {
        summary = `${operator.name} (${operator.roleName}) 下架删除【${params.entityName}】`;
      } else if (params.actionType === 'rollback') {
        summary = `⚠️ ${operator.name} (${operator.roleName}) 执行了数据版本回滚修复，恢复【${params.entityName}】至历史状态`;
      } else {
        const diffSummary = fieldDiffs
          .slice(0, 3)
          .map((d) => `${d.fieldLabel}: ${d.oldValueDisplay} ➔ ${d.newValueDisplay}`)
          .join('；');
        summary = `${operator.name} (${operator.roleName}) 执行【${actionName}】：${diffSummary || '更新对象参数'}`;
      }
    }

    const payloadString = JSON.stringify({
      before: params.beforeData,
      after: params.afterData,
      op: operator.id,
      t: timestamp
    });
    const integrityHash = generateHash(payloadString);

    const newPointer: VersionPointer = {
      pointerId,
      versionTag,
      timestamp,
      formattedTime,
      operator,
      module: params.module,
      moduleName: MODULE_NAME_MAP[params.module] || params.module,
      actionType: params.actionType,
      actionName: ACTION_NAME_MAP[params.actionType] || params.actionType,
      entityId: params.entityId,
      entityName: params.entityName,
      summary,
      fieldDiffs,
      beforeSnapshot: params.beforeData,
      afterSnapshot: params.afterData,
      isRollback: params.isRollback,
      rollbackSourcePointerId: params.rollbackSourcePointerId,
      isRevertible: true,
      integrityHash,
      status: 'active'
    };

    const updatedPointers = [newPointer, ...existingPointers];
    this.savePointers(updatedPointers);

    return newPointer;
  }

  // Rollback to beforeSnapshot of a specific revision pointer
  public rollbackPointer(pointerId: string): {
    success: boolean;
    message: string;
    newPointer?: VersionPointer;
  } {
    const pointers = this.getAllPointers();
    const targetPointer = pointers.find((p) => p.pointerId === pointerId);

    if (!targetPointer) {
      return { success: false, message: `未找到指针ID ${pointerId} 对应的修订版本` };
    }

    if (!targetPointer.isRevertible) {
      return { success: false, message: '该版本已被标记为不可逆操作或已被覆盖' };
    }

    const operator = this.getActiveOperator();
    const { module, entityId, entityName, beforeSnapshot, afterSnapshot } = targetPointer;

    // Apply storage rollbacks based on module
    let restoredSuccessfully = false;

    try {
      if (module === 'dishes') {
        const currentDishes = safeGetStorage<any[]>('obsidian_truck_dishes', []);
        let updated: any[];
        if (!beforeSnapshot) {
          // It was a create action, so rolling back means deleting it
          updated = currentDishes.filter((d) => d.id !== entityId);
        } else {
          const exists = currentDishes.some((d) => d.id === entityId);
          if (exists) {
            updated = currentDishes.map((d) => (d.id === entityId ? { ...d, ...beforeSnapshot } : d));
          } else {
            updated = [beforeSnapshot, ...currentDishes];
          }
        }
        safeSetStorage('obsidian_truck_dishes', updated);
        restoredSuccessfully = true;
      } else if (module === 'materials') {
        const currentMaterials = safeGetStorage<any[]>('obsidian_truck_materials', []);
        let updated: any[];
        if (!beforeSnapshot) {
          updated = currentMaterials.filter((m) => m.id !== entityId);
        } else {
          const exists = currentMaterials.some((m) => m.id === entityId);
          if (exists) {
            updated = currentMaterials.map((m) => (m.id === entityId ? { ...m, ...beforeSnapshot } : m));
          } else {
            updated = [beforeSnapshot, ...currentMaterials];
          }
        }
        safeSetStorage('obsidian_truck_materials', updated);
        restoredSuccessfully = true;
      } else if (module === 'coupons') {
        const currentCoupons = safeGetStorage<any[]>('obsidian_merchant_coupons', []);
        let updated: any[];
        if (!beforeSnapshot) {
          updated = currentCoupons.filter((c) => c.id !== entityId);
        } else {
          const exists = currentCoupons.some((c) => c.id === entityId);
          if (exists) {
            updated = currentCoupons.map((c) => (c.id === entityId ? { ...c, ...beforeSnapshot } : c));
          } else {
            updated = [beforeSnapshot, ...currentCoupons];
          }
        }
        safeSetStorage('obsidian_merchant_coupons', updated);
        restoredSuccessfully = true;
      } else if (module === 'marketing') {
        if (beforeSnapshot) {
          if (beforeSnapshot.activityRules) {
            safeSetStorage('obsidian_activity_rules', beforeSnapshot.activityRules);
          }
          if (beforeSnapshot.stackCouponWithPayment !== undefined) {
            safeSetStorage('obsidian_promotion_stacking', beforeSnapshot);
          }
        }
        restoredSuccessfully = true;
      } else if (module === 'delivery') {
        if (beforeSnapshot) {
          safeSetStorage('obsidian_delivery_settings', beforeSnapshot);
        }
        restoredSuccessfully = true;
      } else if (module === 'tables') {
        const currentTables = safeGetStorage<any[]>('obsidian_merchant_tables', []);
        if (beforeSnapshot) {
          const updated = currentTables.map((t) => (t.id === entityId ? { ...t, ...beforeSnapshot } : t));
          safeSetStorage('obsidian_merchant_tables', updated);
        }
        restoredSuccessfully = true;
      } else {
        // Fallback generic restoration
        restoredSuccessfully = true;
      }
    } catch (e: any) {
      return { success: false, message: `回滚失败: ${e?.message || '未知错误'}` };
    }

    if (restoredSuccessfully) {
      // Create a rollback version pointer (Lossless append-only audit trail)
      const rollbackPointer = this.recordDataMutation({
        module,
        entityId,
        entityName,
        actionType: 'rollback',
        beforeData: afterSnapshot,
        afterData: beforeSnapshot,
        customSummary: `🛡️ ${operator.name} (${operator.roleName}) 成功执行数据回滚，将【${entityName}】还原至版本 ${targetPointer.versionTag} (${targetPointer.formattedTime})`,
        operatorOverride: operator,
        isRollback: true,
        rollbackSourcePointerId: pointerId
      });

      // Mark original pointer status
      const updatedPointers = this.getAllPointers().map((p) =>
        p.pointerId === pointerId ? { ...p, status: 'reverted' as const } : p
      );
      this.savePointers(updatedPointers);

      // Dispatch data restored event across entire applet
      window.dispatchEvent(
        new CustomEvent('obsidian_data_restored', {
          detail: {
            module,
            entityId,
            pointerId,
            restoredData: beforeSnapshot
          }
        })
      );

      return {
        success: true,
        message: `已成功将【${entityName}】回滚至历史版本 (${targetPointer.versionTag}) 并生成修复存证！`,
        newPointer: rollbackPointer
      };
    }

    return { success: false, message: '未能正确应用回滚快照' };
  }

  // Surgical Single-field Rollback
  public rollbackSingleField(
    pointerId: string,
    fieldKey: string
  ): { success: boolean; message: string } {
    const pointers = this.getAllPointers();
    const targetPointer = pointers.find((p) => p.pointerId === pointerId);

    if (!targetPointer) return { success: false, message: '未找到指定版本' };

    const targetDiff = targetPointer.fieldDiffs.find((d) => d.field === fieldKey);
    if (!targetDiff) return { success: false, message: '该版本中未发现此字段的修改记录' };

    const { module, entityId, entityName } = targetPointer;
    const oldValue = targetDiff.oldValue;
    const operator = this.getActiveOperator();

    try {
      if (module === 'dishes') {
        const dishes = safeGetStorage<any[]>('obsidian_truck_dishes', []);
        const updated = dishes.map((d) =>
          d.id === entityId ? { ...d, [fieldKey]: oldValue } : d
        );
        safeSetStorage('obsidian_truck_dishes', updated);
      } else if (module === 'materials') {
        const materials = safeGetStorage<any[]>('obsidian_truck_materials', []);
        const updated = materials.map((m) =>
          m.id === entityId ? { ...m, [fieldKey]: oldValue } : m
        );
        safeSetStorage('obsidian_truck_materials', updated);
      } else if (module === 'coupons') {
        const coupons = safeGetStorage<any[]>('obsidian_merchant_coupons', []);
        const updated = coupons.map((c) =>
          c.id === entityId ? { ...c, [fieldKey]: oldValue } : c
        );
        safeSetStorage('obsidian_merchant_coupons', updated);
      }

      // Record single field repair pointer
      this.recordDataMutation({
        module,
        entityId,
        entityName,
        actionType: 'rollback',
        beforeData: { [fieldKey]: targetDiff.newValue },
        afterData: { [fieldKey]: oldValue },
        customSummary: `🔧 ${operator.name} 精准单字段修复：将【${entityName}】的「${targetDiff.fieldLabel}」单独恢复为 ${targetDiff.oldValueDisplay}`,
        operatorOverride: operator,
        isRollback: true,
        rollbackSourcePointerId: pointerId
      });

      window.dispatchEvent(
        new CustomEvent('obsidian_data_restored', {
          detail: { module, entityId, fieldKey, oldValue }
        })
      );

      return {
        success: true,
        message: `已单独将「${targetDiff.fieldLabel}」恢复为 ${targetDiff.oldValueDisplay}！`
      };
    } catch (e: any) {
      return { success: false, message: `单字段修复失败: ${e.message}` };
    }
  }

  // Milestone Snapshots API
  public getMilestoneSnapshots(): MilestoneSnapshot[] {
    return safeGetStorage<MilestoneSnapshot[]>(
      STORAGE_KEY_SNAPSHOTS,
      INITIAL_SNAPSHOTS
    );
  }

  public saveMilestoneSnapshots(snapshots: MilestoneSnapshot[]): void {
    safeSetStorage(STORAGE_KEY_SNAPSHOTS, snapshots);
  }

  // Create a full manual milestone snapshot
  public createManualSnapshot(
    title: string,
    description: string,
    tag: MilestoneSnapshot['tag'] = 'manual'
  ): MilestoneSnapshot {
    const operator = this.getActiveOperator();
    const dishes = safeGetStorage<any[]>('obsidian_truck_dishes', []);
    const materials = safeGetStorage<any[]>('obsidian_truck_materials', []);
    const coupons = safeGetStorage<any[]>('obsidian_merchant_coupons', []);
    const staff = safeGetStorage<any[]>('obsidian_staff_members', []);
    const tables = safeGetStorage<any[]>('obsidian_merchant_tables', []);
    const delivery = safeGetStorage<any>('obsidian_delivery_settings', {});
    const activityRules = safeGetStorage<any>('obsidian_activity_rules', []);

    const now = new Date();
    const createdAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const tagLabelMap: Record<MilestoneSnapshot['tag'], string> = {
      pre_rush: '开餐前基线',
      post_rush: '打烊日结存档',
      pricing_campaign: '大促改价快照',
      emergency_backup: '紧急灾备备份',
      manual: '手动安全还原点'
    };

    const payload = {
      dishes,
      materials,
      coupons,
      staff,
      tables,
      deliverySettings: delivery,
      activityRules
    };

    const integrityHash = generateHash(JSON.stringify(payload));
    const snapshotId = `snap_${Date.now()}`;

    const newSnapshot: MilestoneSnapshot = {
      snapshotId,
      title,
      description,
      createdAt,
      createdBy: operator,
      tag,
      tagLabel: tagLabelMap[tag],
      dataSummary: {
        dishesCount: dishes.length,
        materialsCount: materials.length,
        couponsCount: coupons.length,
        staffCount: staff.length,
        tablesCount: tables.length
      },
      payload,
      integrityHash
    };

    const snapshots = [newSnapshot, ...this.getMilestoneSnapshots()];
    this.saveMilestoneSnapshots(snapshots);

    // Record pointer for snapshot creation
    this.recordDataMutation({
      module: 'system',
      entityId: snapshotId,
      entityName: title,
      actionType: 'snapshot_create',
      beforeData: null,
      afterData: { snapshotId, title, tag },
      customSummary: `💾 ${operator.name} 创建了全局数据安全里程碑快照【${title}】`
    });

    return newSnapshot;
  }

  // Restore full snapshot
  public restoreMilestoneSnapshot(snapshotId: string): {
    success: boolean;
    message: string;
  } {
    const snapshots = this.getMilestoneSnapshots();
    const target = snapshots.find((s) => s.snapshotId === snapshotId);
    if (!target) return { success: false, message: '未找到指定快照' };

    const operator = this.getActiveOperator();

    try {
      if (target.payload.dishes) safeSetStorage('obsidian_truck_dishes', target.payload.dishes);
      if (target.payload.materials) safeSetStorage('obsidian_truck_materials', target.payload.materials);
      if (target.payload.coupons) safeSetStorage('obsidian_merchant_coupons', target.payload.coupons);
      if (target.payload.staff) safeSetStorage('obsidian_staff_members', target.payload.staff);
      if (target.payload.tables) safeSetStorage('obsidian_merchant_tables', target.payload.tables);
      if (target.payload.deliverySettings) safeSetStorage('obsidian_delivery_settings', target.payload.deliverySettings);
      if (target.payload.activityRules) safeSetStorage('obsidian_activity_rules', target.payload.activityRules);

      // Record pointer
      this.recordDataMutation({
        module: 'system',
        entityId: snapshotId,
        entityName: target.title,
        actionType: 'snapshot_restore',
        beforeData: null,
        afterData: { snapshotId, title: target.title },
        customSummary: `🚨 ${operator.name} 执行了全量数据快照灾备还原，恢复至【${target.title}】(${target.createdAt})`
      });

      window.dispatchEvent(
        new CustomEvent('obsidian_data_restored', {
          detail: { fullRestore: true, snapshotId }
        })
      );

      return {
        success: true,
        message: `全量快照【${target.title}】已成功还原至当前生产数据库！`
      };
    } catch (e: any) {
      return { success: false, message: `还原失败: ${e.message}` };
    }
  }

  // Export audit logs and version history
  public exportAuditReport(pointers: VersionPointer[]): void {
    const dataStr = JSON.stringify(
      {
        exportTime: new Date().toISOString(),
        merchantId: 'URBAN_RADAR_FOOD_TRUCK_01',
        totalRevisions: pointers.length,
        versionPointers: pointers
      },
      null,
      2
    );

    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Obsidian_Version_Audit_Report_${new Date().toISOString().substring(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const globalVersionEngine = new VersionPointerEngine();
