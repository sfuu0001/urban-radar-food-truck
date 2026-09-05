/**
 * Business Status Engine (餐车营业状态总开关与歇业调度中枢)
 * 
 * 管理流动餐车营业接单总控开关：
 * - 营业中 (接单中) vs 已打烊 (歇业/暂停接单)
 * - 联动前台食客端「已打烊」横幅展示、禁用结算或转为预定
 * - 联动出餐预计等待时长 (打烊时提示暂停出餐)
 * - 跨多标签页与多端 (食客/商家/骑手) 实时广播
 */

import { safeGetStorage, safeSetStorage } from './safeStorage';

export interface BusinessStatusConfig {
  isOpen: boolean; // true = 营业中, false = 已打烊/暂停接单
  statusLabel: string; // 营业中 / 已打烊 / 紧急备料中 / 包场歇业
  closeReason: string; // 歇业原因说明
  reopenTime: string; // 预计恢复营业时间 (如 "明日 11:00" 或 "15分钟后")
  autoAcceptOrders: boolean; // 是否开启自动接单
  allowPreorderWhenClosed: boolean; // 打烊期间是否允许顾客加购预览
  lastToggledAt: string; // 上次状态切换时间
  toggledBy: string; // 操作人员
}

export const DEFAULT_BUSINESS_STATUS: BusinessStatusConfig = {
  isOpen: true,
  statusLabel: '营业中',
  closeReason: '餐车站台正常营运，主理人炭火现烤现制接单中',
  reopenTime: '正常接单中',
  autoAcceptOrders: true,
  allowPreorderWhenClosed: true,
  lastToggledAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
  toggledBy: '餐车店长'
};

const STORAGE_KEY_BUSINESS_STATUS = 'obsidian_business_status';

/**
 * 获取当前餐车营业状态
 */
export function getBusinessStatus(): BusinessStatusConfig {
  return safeGetStorage<BusinessStatusConfig>(STORAGE_KEY_BUSINESS_STATUS, DEFAULT_BUSINESS_STATUS);
}

/**
 * 更新餐车营业状态并全网广播
 */
export function setBusinessStatus(
  status: Partial<BusinessStatusConfig>,
  operatorName: string = '餐车店长'
): BusinessStatusConfig {
  const current = getBusinessStatus();
  const updated: BusinessStatusConfig = {
    ...current,
    ...status,
    lastToggledAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    toggledBy: operatorName
  };

  safeSetStorage(STORAGE_KEY_BUSINESS_STATUS, updated);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('obsidian_business_status_changed', {
        detail: updated
      })
    );
  }

  return updated;
}

/**
 * 切换营业/打烊开关快捷方法
 */
export function toggleBusinessOperating(
  isOpen: boolean,
  reason?: string,
  reopenTime?: string,
  operatorName: string = '餐车店长'
): BusinessStatusConfig {
  return setBusinessStatus(
    {
      isOpen,
      statusLabel: isOpen ? '营业中' : '已打烊 · 暂停接单',
      closeReason: reason || (isOpen ? '已恢复营业，开始全速接单出餐' : '今日已打烊，明日11:00起恢复接单'),
      reopenTime: reopenTime || (isOpen ? '正常营业接单中' : '明日 11:00')
    },
    operatorName
  );
}
