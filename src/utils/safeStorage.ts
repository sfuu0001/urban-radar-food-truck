/**
 * 安全的 localStorage 封装，防止 JSON.parse 异常与隐身模式/沙箱配额超限抛错
 */

export function safeGetStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined' || !window.localStorage) {
    return defaultValue;
  }
  try {
    const item = window.localStorage.getItem(key);
    if (!item) return defaultValue;
    return JSON.parse(item) as T;
  } catch (err) {
    console.warn(`[SafeStorage] 读取键 "${key}" 异常，返回默认值:`, err);
    return defaultValue;
  }
}

export function safeSetStorage<T>(key: string, value: T): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn(`[SafeStorage] 写入键 "${key}" 失败:`, err);
    return false;
  }
}
