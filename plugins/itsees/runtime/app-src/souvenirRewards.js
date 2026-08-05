import {
  listSouvenirsForLandmark
} from "./souvenirLibrary.js?v=souvenir-library-v4";
import { getThemeSouvenirsFromDb } from "./contentRepository.js?v=asset-webp-v5";
import { hasSouvenirPackBonus } from "./inventoryRules.js?v=inventory-v1";

const RARITY_WEIGHTS = Object.freeze({ common: 70, uncommon: 24, rare: 6 });

function hashSeed(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRandom(seed) {
  let state = hashSeed(seed) || 0x9e3779b9;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function weightedPick(candidates, random, context) {
  const weights = candidates.map(item => {
    const ownedPenalty = (context.ownedCounts[item.id] ?? 0) > 0 ? 0.35 : 1;
    const fullRareBoost = context.progressPercent >= 100 && item.rarity === "rare" ? 1.6 : 1;
    const inventoryRareBoost = context.hasRewardItem && item.rarity === "rare" ? 1.25 : 1;
    return (RARITY_WEIGHTS[item.rarity] ?? 1) * (item.weight ?? 1) * ownedPenalty * fullRareBoost * inventoryRareBoost;
  });
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = random() * total;
  for (let index = 0; index < candidates.length; index += 1) {
    cursor -= weights[index];
    if (cursor <= 0) return candidates[index];
  }
  return candidates[candidates.length - 1];
}

export function resolveSouvenirRewards({
  seed,
  phase = 1,
  themeId,
  landmarkId,
  progressPercent = 0,
  selectedItemIds = [],
  ownedCounts = {}
}) {
  if (progressPercent <= 0) return [];
  const candidates = phase === 2
    ? listSouvenirsForLandmark(landmarkId)
    : getThemeSouvenirsFromDb(themeId);
  if (candidates.length === 0) return [];

  const random = createSeededRandom(`${seed}:${phase}:${landmarkId ?? themeId}`);
  const hasRewardItem = hasSouvenirPackBonus(selectedItemIds);
  let rewardCount = progressPercent >= 100 ? 2 : 1;
  if (hasRewardItem && random() < 0.35) rewardCount += 1;
  rewardCount = Math.min(rewardCount, 3, candidates.length);

  const available = [...candidates];
  const rewards = [];
  while (rewards.length < rewardCount && available.length > 0) {
    const item = weightedPick(available, random, { ownedCounts, progressPercent, hasRewardItem });
    rewards.push(item);
    available.splice(available.indexOf(item), 1);
  }
  return rewards;
}
