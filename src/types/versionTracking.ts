export type MerchantRole = 'manager' | 'cashier' | 'grill_chef' | 'barista' | 'rider' | 'admin' | 'system';

export interface MerchantOperator {
  id: string;
  username: string;
  name: string;
  role: MerchantRole;
  roleName: string;
  avatar?: string;
  deviceInfo: string;
  ip: string;
  shiftBadge?: string;
}

export type VersionModuleType =
  | 'dishes'
  | 'materials'
  | 'coupons'
  | 'marketing'
  | 'tables'
  | 'staff'
  | 'delivery'
  | 'payments'
  | 'stall_gps'
  | 'craft_standards'
  | 'system';

export type VersionActionType =
  | 'create'
  | 'update'
  | 'delete'
  | 'batch_adjust'
  | 'rollback'
  | 'snapshot_restore'
  | 'snapshot_create';

export interface FieldDiff {
  field: string;
  fieldLabel: string;
  diffType: 'added' | 'modified' | 'removed';
  oldValue: any;
  newValue: any;
  oldValueDisplay: string;
  newValueDisplay: string;
}

export interface VersionPointer {
  pointerId: string;
  versionTag: string;
  timestamp: string;
  formattedTime: string;
  operator: MerchantOperator;
  module: VersionModuleType;
  moduleName: string;
  actionType: VersionActionType;
  actionName: string;
  entityId: string;
  entityName: string;
  summary: string;
  fieldDiffs: FieldDiff[];
  beforeSnapshot: any;
  afterSnapshot: any;
  isRollback?: boolean;
  rollbackSourcePointerId?: string;
  isRevertible: boolean;
  integrityHash: string;
  status: 'active' | 'reverted' | 'superseded';
}

export interface MilestoneSnapshot {
  snapshotId: string;
  title: string;
  description: string;
  createdAt: string;
  createdBy: MerchantOperator;
  tag: 'pre_rush' | 'post_rush' | 'pricing_campaign' | 'emergency_backup' | 'manual';
  tagLabel: string;
  dataSummary: {
    dishesCount: number;
    materialsCount: number;
    couponsCount: number;
    staffCount: number;
    tablesCount: number;
  };
  payload: {
    dishes?: any;
    materials?: any;
    coupons?: any;
    activityRules?: any;
    tables?: any;
    staff?: any;
    deliverySettings?: any;
    truckInfo?: any;
  };
  integrityHash: string;
}

export interface VersionFilterState {
  searchQuery: string;
  selectedOperatorId: string;
  selectedModule: string;
  selectedAction: string;
  dateRange: 'all' | 'today' | '7days' | '30days';
  onlyRevertible: boolean;
}
