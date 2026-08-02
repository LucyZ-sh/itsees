import { inventoryItems, themes } from "./content.js?v=inventory-v5";

export const PACK_SLOT_LIMITS = Object.freeze({ food: 1, tool: 1 });
export const DEFAULT_PACK_ITEM_IDS = Object.freeze(["food-riceball", "tool-camera"]);
export const SOUVENIR_BONUS_ITEM_IDS = Object.freeze(["food-candy", "tool-stampbook"]);

const souvenirBonusItemIds = new Set(SOUVENIR_BONUS_ITEM_IDS);

export function getCompletedThemeCount(state) {
  return themes.filter(theme => {
    const progress = state?.themeProgress?.[theme.id];
    if (!progress?.isFullyColored || progress.progressPercent < 100) return false;
    const coloredSegmentIds = new Set(progress.coloredSegmentIds ?? []);
    return theme.mapSegments.every(segment => coloredSegmentIds.has(segment.id));
  }).length;
}

export function getInventoryUnlockState(item, state, completedThemeCount = getCompletedThemeCount(state)) {
  const requiredThemeCount = item.unlockAtCompletedThemes ?? 0;
  const isUnlocked = completedThemeCount >= requiredThemeCount;
  return {
    isUnlocked,
    completedThemeCount,
    requiredThemeCount,
    remainingThemeCount: Math.max(0, requiredThemeCount - completedThemeCount),
    label: isUnlocked
      ? "已解锁"
      : `再完成 ${Math.max(0, requiredThemeCount - completedThemeCount)} 个主题解锁`
  };
}

export function listUnlockedInventoryItems(state) {
  const completedThemeCount = getCompletedThemeCount(state);
  return inventoryItems.filter(item => getInventoryUnlockState(item, state, completedThemeCount).isUnlocked);
}

export function normalizePackSelection(state, selectedItemIds = []) {
  const selected = new Set(Array.isArray(selectedItemIds) ? selectedItemIds : []);
  const unlockedItems = listUnlockedInventoryItems(state);

  return Object.entries(PACK_SLOT_LIMITS).flatMap(([type, limit]) => {
    const selectedItem = unlockedItems.find(item => item.type === type && selected.has(item.id));
    if (selectedItem) return [selectedItem.id].slice(0, limit);

    const defaultItemId = DEFAULT_PACK_ITEM_IDS.find(itemId => {
      const item = inventoryItems.find(candidate => candidate.id === itemId);
      return item?.type === type;
    });
    const fallback = unlockedItems.find(item => item.id === defaultItemId)
      ?? unlockedItems.find(item => item.type === type);
    return fallback ? [fallback.id].slice(0, limit) : [];
  });
}

export function hasSouvenirPackBonus(selectedItemIds = []) {
  return selectedItemIds.some(itemId => souvenirBonusItemIds.has(itemId));
}

export function getPackRewardSummary(selectedItemIds = []) {
  const hasSouvenirBonus = hasSouvenirPackBonus(selectedItemIds);
  return {
    hasSouvenirBonus,
    rareWeightModifier: hasSouvenirBonus ? 1.25 : 1,
    extraSouvenirChance: hasSouvenirBonus ? 0.35 : 0,
    maxExtraSouvenirs: hasSouvenirBonus ? 1 : 0
  };
}
