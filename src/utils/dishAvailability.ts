import { safeGetStorage, safeSetStorage } from './safeStorage';

/**
 * 商家端「沽清 / 上架」持久化覆盖层。
 *
 * 菜品 `available` 字段既可能被云端数据覆盖（每次挂载都会从云拉取菜单），
 * 也会被本地版本回滚引擎重写本地 `obsidian_truck_dishes`。
 * 因此把商家对「在售 / 沽清」的修改单独存进 `obsidian_dish_availability_overrides`，
 * 并在每一次从云端 / 本地读取菜品时强制套用，确保刷新页面后不被云端数据冲掉。
 */

const OVERRIDE_KEY = 'obsidian_dish_availability_overrides';

export type AvailabilityOverrideMap = Record<string, boolean>;

export function getAvailabilityOverrides(): AvailabilityOverrideMap {
  return safeGetStorage<AvailabilityOverrideMap>(OVERRIDE_KEY, {});
}

export function setAvailabilityOverride(dishId: string, available: boolean): void {
  const map = getAvailabilityOverrides();
  map[dishId] = available;
  safeSetStorage(OVERRIDE_KEY, map);
}

/** 把本地「沽清 / 上架」覆盖套用到菜品列表上（本地修改优先于云端）。 */
export function applyAvailabilityOverrides<T extends { id: string; available?: boolean }>(
  dishes: T[]
): T[] {
  const map = getAvailabilityOverrides();
  if (!map || Object.keys(map).length === 0) return dishes;
  let changed = false;
  const next = dishes.map((d) => {
    if (Object.prototype.hasOwnProperty.call(map, d.id) && map[d.id] !== d.available) {
      changed = true;
      return { ...d, available: map[d.id] };
    }
    return d;
  });
  return changed ? next : dishes;
}
