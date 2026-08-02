import {
  createInitialState,
  MAX_SOUVENIR_ACQUISITIONS,
  MAX_TRAVEL_HISTORY
} from "./travelEngine.js?v=bounded-history-v1";
import { FULL_TRAVEL_MINUTES } from "./content.js?v=inventory-v5";
import {
  getSouvenirFromDb,
  getThemeFromDb,
  getThemeSouvenirsFromDb,
  resolveOptimizedAssetUrl
} from "./contentRepository.js?v=asset-webp-v5";
import { getAtlasDestination } from "./atlasContent.js?v=daily-checkin-v5";
import {
  createInitialDailyCheckinState,
  DAILY_CHECKIN_LIMIT_MINUTES,
  getLocalDateKey,
  normalizeDailyCheckinState,
  PHASE_CHECKIN_MINUTES
} from "./dailyCheckin.js?v=daily-checkin-v4";
import { normalizePackSelection } from "./inventoryRules.js?v=inventory-v1";
import { resolveSouvenirRewards } from "./souvenirRewards.js?v=souvenir-routing-v2";

// Historical and intentionally load-bearing: changing this key would orphan existing beta saves.
const STORAGE_KEY = "shimejis-random-travel-mvp-state-v1";
const PHASE2_ACCEPTANCE_STORAGE_KEY = `${STORAGE_KEY}-acceptance-phase2`;
const CURRENT_STATE_VERSION = 10;
let desktopSaveQueue = Promise.resolve(null);

function getActiveStorageKey() {
  const search = typeof globalThis.location?.search === "string" ? globalThis.location.search : "";
  return new URLSearchParams(search).get("acceptance") === "phase2"
    ? PHASE2_ACCEPTANCE_STORAGE_KEY
    : STORAGE_KEY;
}

function isAcceptanceStorageActive() {
  return getActiveStorageKey() === PHASE2_ACCEPTANCE_STORAGE_KEY;
}

export function loadState() {
  try {
    const raw = localStorage.getItem(getActiveStorageKey());
    if (!raw) return createInitialState();
    return migrateState(JSON.parse(raw));
  } catch (error) {
    console.warn("Failed to load saved state", error);
    return createInitialState();
  }
}

export function saveState(state) {
  cacheState(state);
  return persistDesktopState(state);
}

export function cacheState(state) {
  try {
    localStorage.setItem(getActiveStorageKey(), JSON.stringify(state));
    return true;
  } catch (error) {
    console.warn("Failed to save state", error);
    const CustomEventConstructor = globalThis.CustomEvent;
    if (typeof CustomEventConstructor === "function") {
      globalThis.window?.dispatchEvent?.(new CustomEventConstructor("itsees:local-state-save-failed", {
        detail: {
          code: typeof error?.name === "string" ? error.name : "ITSEES_LOCAL_STATE_SAVE_FAILED"
        }
      }));
    }
    return false;
  }
}

export function resetState() {
  const initial = createInitialState();
  try {
    localStorage.removeItem(getActiveStorageKey());
  } catch (error) {
    console.warn("Failed to remove saved state", error);
    cacheState(initial);
  }
  persistDesktopState(initial);
  return initial;
}

function persistDesktopState(state) {
  if (isAcceptanceStorageActive()) return Promise.resolve(null);
  const saveTravelState = globalThis.window?.desktopBridge?.saveTravelState;
  if (typeof saveTravelState !== "function") return Promise.resolve(null);
  const snapshot = JSON.parse(JSON.stringify(state));
  desktopSaveQueue = desktopSaveQueue
    .then(previous => {
      if (
        previous?.ok
        && Number.isInteger(previous.state?.revision)
        && previous.state.revision > (Number.isInteger(snapshot.revision) ? snapshot.revision : 0)
      ) {
        snapshot.revision = previous.state.revision;
      }
      return saveTravelState(snapshot);
    })
    .then(result => {
      if (result?.ok && result.state) cacheState(result.state);
      if (result?.conflict && result.state) {
        globalThis.window?.dispatchEvent?.(new CustomEvent("itsees:shared-state-conflict", {
          detail: { state: result.state }
        }));
      }
      return result;
    })
    .catch(error => {
      console.warn("Failed to save shared desktop travel state", error);
      globalThis.window?.dispatchEvent?.(new CustomEvent("itsees:shared-state-save-failed", {
        detail: {
          code: typeof error?.code === "string" ? error.code : "ITSEES_STATE_SAVE_FAILED"
        }
      }));
      return { ok: false, error: true, code: error?.code ?? "ITSEES_STATE_SAVE_FAILED" };
    });
  return desktopSaveQueue;
}

export function migrateState(saved) {
  const base = createInitialState();
  if (!isRecord(saved)) return base;

  const savedSettings = isRecord(saved.settings) ? saved.settings : {};
  const hasCompletedOnboarding = Object.prototype.hasOwnProperty.call(savedSettings, "hasCompletedOnboarding")
    ? savedSettings.hasCompletedOnboarding === true
    : true;
  const hasLiveWeatherConsent = savedSettings.hasGrantedLiveWeatherConsent === true
    && savedSettings.liveWeatherEnabled === true;
  const hasChosenBackgroundMusic = savedSettings.hasChosenBackgroundMusic === true;
  const savedPosition = isRecord(savedSettings.petPosition) ? savedSettings.petPosition : {};
  const enabledFeaturePackIds = Array.isArray(saved.enabledFeaturePackIds)
    ? saved.enabledFeaturePackIds.filter(id => typeof id === "string")
    : [];

  const homeTimeZone = saved.dailyCheckin?.homeTimeZone;
  const normalizedTravels = arrayOrEmpty(saved.travels)
    .slice(0, MAX_TRAVEL_HISTORY)
    .map(travel => normalizeTravel(travel, homeTimeZone))
    .filter(Boolean);
  const normalizedActiveTravel = normalizeTravel(saved.activeTravel, homeTimeZone);
  const normalizedLastRecalledTravel = normalizeTravel(saved.lastRecalledTravel, homeTimeZone);
  const souvenirSourceTravels = dedupeTravelsById([
    ...normalizedTravels,
    normalizedActiveTravel,
    normalizedLastRecalledTravel
  ].filter(Boolean));
  const phase1SouvenirMappings = createPhase1TravelSouvenirMappings(souvenirSourceTravels);
  const themeProgress = recordOrEmpty(saved.themeProgress);
  const atlasProgress = recordOrEmpty(saved.atlasProgress);
  const normalizedSouvenirCounts = normalizeSouvenirCounts(saved.souvenirCounts);
  const souvenirAcquisitions = migrateSouvenirAcquisitions(
    saved.souvenirAcquisitions,
    souvenirSourceTravels,
    normalizedSouvenirCounts,
    themeProgress,
    atlasProgress,
    phase1SouvenirMappings
  ).slice(0, MAX_SOUVENIR_ACQUISITIONS);
  const countedSouvenirs = countSouvenirAcquisitions(souvenirAcquisitions);
  const souvenirCounts = saved.version === CURRENT_STATE_VERSION
    ? mergeSouvenirCounts(normalizedSouvenirCounts, countedSouvenirs)
    : countedSouvenirs;
  const travels = normalizedTravels.map(travel =>
    migrateTravelSouvenirResult(travel, phase1SouvenirMappings)
  );
  const dailyCheckin = migrateDailyCheckin(saved.dailyCheckin, travels, new Date());

  const migrated = {
    ...base,
    ...saved,
    version: CURRENT_STATE_VERSION,
    selectedItemIds: stringArrayOr(saved.selectedItemIds, base.selectedItemIds),
    settings: {
      ...base.settings,
      ...savedSettings,
      hasCompletedOnboarding,
      liveWeatherEnabled: hasLiveWeatherConsent,
      hasGrantedLiveWeatherConsent: hasLiveWeatherConsent,
      backgroundMusicEnabled: hasChosenBackgroundMusic && savedSettings.backgroundMusicEnabled === true,
      hasChosenBackgroundMusic,
      petPosition: {
        x: finiteNumberOr(savedPosition.x, base.settings.petPosition.x),
        y: finiteNumberOr(savedPosition.y, base.settings.petPosition.y)
      }
    },
    activeTravel: normalizedActiveTravel
      ? migrateTravelSouvenirResult(normalizedActiveTravel, phase1SouvenirMappings)
      : null,
    lastRecalledTravel: normalizedLastRecalledTravel
      ? migrateTravelSouvenirResult(normalizedLastRecalledTravel, phase1SouvenirMappings)
      : null,
    localWeather: normalizeLocalWeather(saved.localWeather, base.localWeather, hasLiveWeatherConsent),
    themeProgress,
    atlasProgress,
    enabledFeaturePackIds: [...new Set([...base.enabledFeaturePackIds, ...enabledFeaturePackIds])],
    souvenirCounts,
    souvenirAcquisitions,
    dailyCheckin,
    album: migrateAlbum(saved.album, travels, themeProgress),
    travels,
    analytics: arrayOrEmpty(saved.analytics).slice(0, 120)
  };
  migrated.selectedItemIds = normalizePackSelection(migrated, migrated.selectedItemIds);
  return migrated;
}

function migrateAlbum(savedAlbum, travels, themeProgress) {
  const album = arrayOrEmpty(savedAlbum).map(normalizePostcard).filter(Boolean);
  const cardIds = new Set(album.map(card => card.id));
  const cardKeys = new Set(album.map(getPostcardSceneKey).filter(Boolean));

  for (const travel of travels) {
    for (const postcardSource of getTravelPostcardSources(travel)) {
      const postcard = normalizePostcard(postcardSource);
      const key = getPostcardSceneKey(postcard);
      if (!postcard || cardIds.has(postcard.id) || cardKeys.has(key)) continue;
      album.push(postcard);
      cardIds.add(postcard.id);
      if (key) cardKeys.add(key);
    }
  }

  for (const [themeId, progress] of Object.entries(themeProgress)) {
    if (!isRecord(progress) || !progress.isFullyColored || progress.progressPercent < 100) continue;
    const theme = getThemeFromDb(themeId);
    if (theme.id !== themeId) continue;
    const relatedTravel = travels.find(travel => travel.id === progress.lastTravelId)
      ?? travels.find(travel => travel.phase === 1 && travel.themeId === themeId);
    for (const scene of theme.scenes) {
      const key = `1:${themeId}:${scene.id}`;
      if (cardKeys.has(key)) continue;
      const postcard = normalizePostcard({
        id: `recovered-postcard-${themeId}-${scene.id}`,
        travelId: relatedTravel?.id ?? progress.lastTravelId ?? null,
        phase: 1,
        themeId,
        destinationId: themeId,
        sceneId: scene.id,
        sceneImageAsset: resolveOptimizedAssetUrl(scene.imageAsset),
        title: `${theme.name} · ${scene.name}明信片`,
        sceneName: scene.name,
        message: scene.message,
        createdAt: progress.updatedAt ?? relatedTravel?.completedAt ?? legacyDate(),
        progressPercent: 100,
        rarity: scene.rarity,
        completionReason: "full_cycle",
        weatherSnapshot: relatedTravel?.result?.weatherSnapshot ?? null,
        decorations: []
      });
      if (!postcard || cardIds.has(postcard.id)) continue;
      album.push(postcard);
      cardIds.add(postcard.id);
      cardKeys.add(key);
    }
  }

  return album
    .filter(Boolean)
    .map(migratePostcardSouvenirDecorations)
    .sort((left, right) =>
      new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime()
      || String(right.id).localeCompare(String(left.id))
    );
}

function getTravelPostcardSources(travel) {
  const result = travel.result;
  if (!result) return [];
  if (Array.isArray(result.postcards) && result.postcards.length > 0) {
    return result.postcards.map(card => ({
      ...card,
      travelId: travel.id,
      phase: travel.phase,
      themeId: travel.themeId,
      landmarkId: travel.landmarkId,
      destinationId: travel.destinationId ?? travel.themeId,
      completionReason: travel.completionReason,
      decorations: []
    }));
  }
  const phase = travel.phase === 2 ? 2 : 1;
  const completedCount = getCompletedSceneCountForTravel(travel);
  const createdAt = result.createdAt ?? travel.completedAt ?? travel.startedAt ?? legacyDate();
  if (completedCount <= 0) return [];
  if (phase === 2) {
    const destination = getAtlasDestination(travel.destinationId ?? travel.landmarkId);
    return destination.scenes.slice(0, completedCount).map((scene, index) => ({
      id: scene.id === result.sceneId && result.postcardId ? result.postcardId : `recovered-postcard-${travel.id}-${scene.id}`,
      travelId: travel.id,
      phase: 2,
      landmarkId: destination.id,
      destinationId: destination.id,
      sceneId: scene.id,
      sceneImageAsset: scene.imageAsset,
      title: `${destination.name} · ${scene.name}明信片`,
      sceneName: scene.name,
      message: scene.message,
      createdAt,
      progressPercent: result.mapProgressPercent ?? travel.progressPercent ?? ((index + 1) / destination.scenes.length) * 100,
      rarity: scene.rarity,
      completionReason: travel.completionReason,
      weatherSnapshot: result.weatherSnapshot ?? null,
      decorations: []
    }));
  }
  const theme = getThemeFromDb(travel.themeId);
  if (!theme?.id) return [];
  return theme.scenes.slice(0, completedCount).map((scene, index) => ({
    id: scene.id === result.sceneId && result.postcardId ? result.postcardId : `recovered-postcard-${travel.id}-${scene.id}`,
    travelId: travel.id,
    phase: 1,
    themeId: theme.id,
    destinationId: theme.id,
    sceneId: scene.id,
    sceneImageAsset: resolveOptimizedAssetUrl(scene.imageAsset),
    title: `${theme.name} · ${scene.name}明信片`,
    sceneName: scene.name,
    message: scene.message,
    createdAt,
    progressPercent: result.mapProgressPercent ?? travel.progressPercent ?? ((index + 1) / theme.scenes.length) * 100,
    rarity: scene.rarity,
    completionReason: travel.completionReason,
    weatherSnapshot: result.weatherSnapshot ?? null,
    decorations: []
  }));
}

function getCompletedSceneCountForTravel(travel) {
  const segmentCount = arrayOrEmpty(travel.coloredSegmentIds).length;
  if (segmentCount > 0) return segmentCount;
  const sceneId = travel.result?.sceneId;
  const sceneOrder = typeof sceneId === "string" ? Number(sceneId.match(/S(\d+)$/)?.[1]) : 0;
  if (Number.isFinite(sceneOrder) && sceneOrder > 0) return sceneOrder;
  if (travel.progressPercent >= 100) return travel.phase === 2 ? 4 : 12;
  return 0;
}

function getPostcardSceneKey(postcard) {
  if (!postcard?.sceneId) return null;
  const phase = postcard.phase === 2 ? 2 : 1;
  const destinationId = phase === 2 ? postcard.landmarkId ?? postcard.destinationId : postcard.themeId ?? postcard.destinationId;
  return destinationId ? `${phase}:${destinationId}:${postcard.sceneId}` : null;
}

function createPhase1TravelSouvenirMappings(travels) {
  const mappings = new Map();
  for (const travel of travels) {
    if (travel.phase !== 1 || !travel.destinationId || !travel.result) continue;
    const usedSouvenirIds = new Set();
    const souvenirIds = arrayOrEmpty(travel.result.souvenirIds)
      .filter(souvenirId => typeof souvenirId === "string");
    for (const souvenirId of souvenirIds) {
      const mappingKey = getPhase1SouvenirMappingKey(
        travel.destinationId,
        travel.id,
        souvenirId
      );
      const mappedSouvenirId = resolvePhase1SouvenirId({
        destinationId: travel.destinationId,
        souvenirId,
        stableId: travel.id,
        excludedIds: usedSouvenirIds
      });
      mappings.set(mappingKey, mappedSouvenirId);
      usedSouvenirIds.add(mappedSouvenirId);
    }
  }
  return mappings;
}

function migrateTravelSouvenirResult(travel, phase1SouvenirMappings) {
  if (travel.phase !== 1 || !travel.result || !Array.isArray(travel.result.souvenirIds)) {
    return travel;
  }
  return {
    ...travel,
    result: {
      ...travel.result,
      souvenirIds: travel.result.souvenirIds.map(souvenirId => {
        if (typeof souvenirId !== "string") return souvenirId;
        const mappingKey = getPhase1SouvenirMappingKey(
          travel.destinationId,
          travel.id,
          souvenirId
        );
        return phase1SouvenirMappings.get(mappingKey) ?? resolvePhase1SouvenirId({
          destinationId: travel.destinationId,
          souvenirId,
          stableId: travel.id
        });
      })
    }
  };
}

function migratePhase1Acquisition(acquisition, phase1SouvenirMappings) {
  let souvenirId = acquisition.souvenirId;
  if (acquisition.phase === 1) {
    const mappingKey = getPhase1SouvenirMappingKey(
      acquisition.destinationId,
      acquisition.travelId,
      acquisition.souvenirId
    );
    souvenirId = phase1SouvenirMappings.get(mappingKey) ?? resolvePhase1SouvenirId({
      destinationId: acquisition.destinationId,
      souvenirId: acquisition.souvenirId,
      stableId: acquisition.travelId ?? acquisition.id
    });
  }
  return {
    ...acquisition,
    souvenirId,
    rarity: getSouvenirFromDb(souvenirId)?.rarity ?? acquisition.rarity
  };
}

function migratePostcardSouvenirDecorations(postcard) {
  if (postcard.phase !== 1 || postcard.decorations.length === 0) return postcard;
  return {
    ...postcard,
    decorations: postcard.decorations.map(decoration => ({
      ...decoration,
      souvenirId: resolvePhase1SouvenirId({
        destinationId: postcard.themeId,
        souvenirId: decoration.souvenirId,
        stableId: decoration.id
      })
    }))
  };
}

function getPhase1SouvenirMappingKey(destinationId, stableId, souvenirId) {
  return `${destinationId ?? "unknown"}:${stableId ?? "legacy"}:${souvenirId}`;
}

function resolvePhase1SouvenirId({
  destinationId,
  souvenirId,
  stableId,
  excludedIds = new Set()
}) {
  const pool = getThemeSouvenirsFromDb(destinationId);
  if (pool.length === 0) return souvenirId;
  if (pool.some(item => item.id === souvenirId)) return souvenirId;

  const sourceRarity = getSouvenirFromDb(souvenirId)?.rarity ?? "common";
  const sameRarity = pool.filter(item => item.rarity === sourceRarity);
  const availableSameRarity = sameRarity.filter(item => !excludedIds.has(item.id));
  const availablePool = pool.filter(item => !excludedIds.has(item.id));
  const candidates = availableSameRarity.length > 0
    ? availableSameRarity
    : availablePool.length > 0
      ? availablePool
      : sameRarity.length > 0
        ? sameRarity
        : pool;
  const index = hashStableValue(`${destinationId}:${stableId}:${souvenirId}`) % candidates.length;
  return candidates[index].id;
}

function hashStableValue(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function migrateSouvenirAcquisitions(
  savedAcquisitions,
  travels,
  souvenirCounts,
  themeProgress = {},
  atlasProgress = {},
  phase1SouvenirMappings = new Map()
) {
  const acquisitions = arrayOrEmpty(savedAcquisitions)
    .map(normalizeAcquisition)
    .filter(Boolean);
  const byId = new Map(acquisitions.map(item => [item.id, item]));
  const logicalKeys = new Set(acquisitions.map(getAcquisitionLogicalKey));

  for (const travel of travels) {
    for (const souvenirId of arrayOrEmpty(travel.result?.souvenirIds).filter(id => typeof id === "string")) {
      const id = `acquisition-${travel.id}-${souvenirId}`;
      const item = {
        id,
        souvenirId,
        travelId: travel.id,
        phase: travel.phase,
        destinationId: travel.destinationId,
        acquiredAt: travel.result?.createdAt ?? travel.completedAt ?? travel.startedAt ?? legacyDate(),
        rarity: getSouvenirFromDb(souvenirId)?.rarity ?? "common",
        isLegacy: false
      };
      const logicalKey = getAcquisitionLogicalKey(item);
      if (byId.has(id) || logicalKeys.has(logicalKey)) continue;
      byId.set(id, item);
      logicalKeys.add(logicalKey);
    }
  }

  const rebuilt = [...byId.values()];
  for (const [souvenirId, rawCount] of Object.entries(souvenirCounts)) {
    const targetCount = Math.max(0, Math.round(rawCount));
    const existingCount = rebuilt.filter(item => item.souvenirId === souvenirId).length;
    for (let index = existingCount; index < targetCount; index += 1) {
      const inferred = inferLegacyDestination(souvenirId, travels);
      const id = `legacy-acquisition-${souvenirId}-${index + 1}`;
      if (byId.has(id)) continue;
      const item = {
        id,
        souvenirId,
        travelId: null,
        phase: inferred.phase,
        destinationId: inferred.destinationId,
        acquiredAt: legacyDate(),
        rarity: getSouvenirFromDb(souvenirId)?.rarity ?? "common",
        isLegacy: true
      };
      byId.set(id, item);
      rebuilt.push(item);
    }
  }

  recoverCompletedDestinationSouvenirs(byId, rebuilt, themeProgress, atlasProgress);

  return rebuilt
    .map(acquisition => migratePhase1Acquisition(acquisition, phase1SouvenirMappings))
    .sort((left, right) =>
      new Date(right.acquiredAt).getTime() - new Date(left.acquiredAt).getTime()
      || right.id.localeCompare(left.id)
    );
}

function getAcquisitionLogicalKey(acquisition) {
  return [
    acquisition.travelId ?? "legacy",
    acquisition.souvenirId,
    acquisition.phase,
    acquisition.destinationId
  ].join(":");
}

function recoverCompletedDestinationSouvenirs(byId, acquisitions, themeProgress, atlasProgress) {
  const completions = [];
  for (const [themeId, progress] of Object.entries(themeProgress)) {
    if (!isCompleteProgress(progress)) continue;
    const theme = getThemeFromDb(themeId);
    if (theme.id !== themeId) continue;
    completions.push({ phase: 1, destinationId: themeId, progress });
  }
  for (const [landmarkId, progress] of Object.entries(atlasProgress)) {
    if (!isCompleteProgress(progress)) continue;
    const destination = getAtlasDestination(landmarkId);
    if (destination.id !== landmarkId) continue;
    completions.push({ phase: 2, destinationId: landmarkId, progress });
  }

  for (const completion of completions) {
    const existingCount = acquisitions.filter(item =>
      item.phase === completion.phase && item.destinationId === completion.destinationId
    ).length;
    const missingCount = Math.max(0, 2 - existingCount);
    if (missingCount === 0) continue;

    const ownedCounts = countSouvenirAcquisitions(acquisitions);
    const rewards = resolveSouvenirRewards({
      seed: completion.progress.lastTravelId ?? `recovered-completion-${completion.phase}-${completion.destinationId}`,
      phase: completion.phase,
      themeId: completion.phase === 1 ? completion.destinationId : undefined,
      landmarkId: completion.phase === 2 ? completion.destinationId : undefined,
      progressPercent: 100,
      selectedItemIds: [],
      ownedCounts
    });
    for (const reward of rewards.slice(0, missingCount)) {
      let sequence = existingCount + 1;
      let id = `recovered-acquisition-${completion.phase}-${completion.destinationId}-${sequence}-${reward.id}`;
      while (byId.has(id)) {
        sequence += 1;
        id = `recovered-acquisition-${completion.phase}-${completion.destinationId}-${sequence}-${reward.id}`;
      }
      const item = {
        id,
        souvenirId: reward.id,
        travelId: completion.progress.lastTravelId ?? null,
        phase: completion.phase,
        destinationId: completion.destinationId,
        acquiredAt: completion.progress.updatedAt ?? legacyDate(),
        rarity: reward.rarity,
        isLegacy: true
      };
      byId.set(id, item);
      acquisitions.push(item);
    }
  }
}

function isCompleteProgress(progress) {
  return isRecord(progress) && progress.isFullyColored === true && Number(progress.progressPercent) >= 100;
}

function countSouvenirAcquisitions(acquisitions) {
  const counts = {};
  for (const acquisition of acquisitions) {
    counts[acquisition.souvenirId] = (counts[acquisition.souvenirId] ?? 0) + 1;
  }
  return counts;
}

function mergeSouvenirCounts(savedCounts, countedSouvenirs) {
  const merged = { ...savedCounts };
  for (const [souvenirId, count] of Object.entries(countedSouvenirs)) {
    merged[souvenirId] = Math.max(merged[souvenirId] ?? 0, count);
  }
  return merged;
}

function normalizeAcquisition(acquisition) {
  if (!isRecord(acquisition)) return null;
  if (typeof acquisition.id !== "string" || typeof acquisition.souvenirId !== "string") return null;
  const destinationId = typeof acquisition.destinationId === "string" ? acquisition.destinationId : null;
  if (!destinationId) return null;
  return {
    id: acquisition.id,
    souvenirId: acquisition.souvenirId,
    travelId: typeof acquisition.travelId === "string" ? acquisition.travelId : null,
    phase: acquisition.phase === 2 ? 2 : 1,
    destinationId,
    acquiredAt: typeof acquisition.acquiredAt === "string" ? acquisition.acquiredAt : legacyDate(),
    rarity: ["common", "uncommon", "rare"].includes(acquisition.rarity) ? acquisition.rarity : "common",
    isLegacy: Boolean(acquisition.isLegacy)
  };
}

function inferLegacyDestination(souvenirId, travels) {
  const matchingTravel = travels.find(travel => travel.result?.souvenirIds?.includes(souvenirId));
  if (matchingTravel?.destinationId) {
    return { phase: matchingTravel.phase, destinationId: matchingTravel.destinationId };
  }
  const phase1ThemeId = souvenirId.match(/^(T\d{2})-SV/)?.[1];
  if (phase1ThemeId) return { phase: 1, destinationId: phase1ThemeId };
  const landmarkId = getSouvenirFromDb(souvenirId)?.landmarkId;
  return { phase: landmarkId ? 2 : 1, destinationId: landmarkId ?? "legacy" };
}

function normalizeSouvenirCounts(value) {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([id, count]) => typeof id === "string" && Number.isFinite(count) && count > 0)
      .map(([id, count]) => [id, Math.round(count)])
  );
}

function legacyDate() {
  return "1970-01-01T00:00:00.000Z";
}

function normalizeTravel(travel, homeTimeZone) {
  if (!isRecord(travel)) return null;
  const phase = travel.phase === 2 ? 2 : 1;
  const segmentMinutes = PHASE_CHECKIN_MINUTES[phase];
  const themeId = phase === 1 ? travel.themeId ?? travel.destinationId ?? null : null;
  const landmarkId = phase === 2 ? travel.landmarkId ?? travel.destinationId ?? null : null;
  return {
    ...travel,
    phase,
    durationMinutes: FULL_TRAVEL_MINUTES,
    destinationId: phase === 2 ? landmarkId : themeId,
    themeId,
    landmarkId,
    dailyCheckinDate: typeof travel.dailyCheckinDate === "string"
      ? travel.dailyCheckinDate
      : getLocalDateKey(travel.startedAt ?? new Date(), homeTimeZone),
    dailyCheckinLimitMinutes: Number.isFinite(travel.dailyCheckinLimitMinutes)
      ? Math.min(FULL_TRAVEL_MINUTES, Math.max(0, travel.dailyCheckinLimitMinutes))
      : FULL_TRAVEL_MINUTES,
    creditedCheckinMinutes: Number.isFinite(travel.creditedCheckinMinutes)
      ? travel.creditedCheckinMinutes
      : arrayOrEmpty(travel.coloredSegmentIds).length * segmentMinutes,
    newlyCreditedCheckinMinutes: Number.isFinite(travel.newlyCreditedCheckinMinutes)
      ? travel.newlyCreditedCheckinMinutes
      : 0
  };
}

function migrateDailyCheckin(savedDailyCheckin, travels, now) {
  const daily = createInitialDailyCheckinState(now, savedDailyCheckin?.homeTimeZone);
  const localDate = daily.localDate;
  if (isRecord(savedDailyCheckin) && savedDailyCheckin.localDate >= localDate) {
    return normalizeDailyCheckinState(savedDailyCheckin, now);
  }

  const travelById = new Map(travels.map(travel => [travel.id, travel]));
  const ordered = [...travels].sort((left, right) =>
    new Date(left.completedAt ?? left.result?.createdAt ?? 0) - new Date(right.completedAt ?? right.result?.createdAt ?? 0)
  );
  for (const travel of ordered) {
    const creditedAt = travel.completedAt ?? travel.result?.createdAt;
    if (!creditedAt || getLocalDateKey(creditedAt, daily.homeTimeZone) !== localDate) continue;
    const phase = travel.phase === 2 ? 2 : 1;
    const segmentMinutes = PHASE_CHECKIN_MINUTES[phase];
    const successfulMinutes = arrayOrEmpty(travel.coloredSegmentIds).length * segmentMinutes;
    const predecessor = travelById.get(travel.continuationOfTravelId);
    const predecessorMinutes = predecessor
      ? arrayOrEmpty(predecessor.coloredSegmentIds).length * segmentMinutes
      : 0;
    const requested = Number.isFinite(travel.newlyCreditedCheckinMinutes)
      ? travel.newlyCreditedCheckinMinutes
      : Math.max(0, successfulMinutes - predecessorMinutes);
    const remaining = DAILY_CHECKIN_LIMIT_MINUTES - daily.usedMinutes;
    const minutes = Math.min(remaining, Math.floor(requested / segmentMinutes) * segmentMinutes);
    if (minutes <= 0) continue;
    daily.entries.push({
      id: `daily-${travel.id}`,
      travelId: travel.id,
      phase,
      destinationId: travel.destinationId,
      minutes,
      segmentCount: minutes / segmentMinutes,
      creditedAt
    });
    daily.usedMinutes += minutes;
  }
  if (daily.usedMinutes >= DAILY_CHECKIN_LIMIT_MINUTES) {
    daily.noticePending = true;
    daily.noticeReason = "daily_limit";
  }
  return daily;
}

function normalizePostcard(postcard) {
  if (!isRecord(postcard)) return null;
  const phase = postcard.phase === 2 ? 2 : 1;
  const themeId = phase === 1 ? postcard.themeId ?? postcard.destinationId ?? null : null;
  const landmarkId = phase === 2 ? postcard.landmarkId ?? postcard.destinationId ?? null : null;
  const destination = phase === 2 ? getAtlasDestination(landmarkId) : getThemeFromDb(themeId);
  if (destination.id !== (phase === 2 ? landmarkId : themeId)) return null;
  const scene = destination.scenes.find(item => item.id === postcard.sceneId);
  const id = normalizeStoredId(postcard.id);
  if (!scene || !id) return null;
  return {
    id,
    travelId: normalizeStoredId(postcard.travelId),
    phase,
    destinationId: phase === 2 ? landmarkId : themeId,
    themeId,
    landmarkId,
    sceneId: scene.id,
    sceneImageAsset: phase === 1 ? resolveOptimizedAssetUrl(scene.imageAsset) : scene.imageAsset,
    title: normalizeStoredText(postcard.title, `${destination.name} · ${scene.name}明信片`, 160),
    sceneName: scene.name,
    message: normalizeStoredText(postcard.message, scene.message, 600),
    createdAt: normalizeStoredIsoDate(postcard.createdAt),
    progressPercent: clampNumber(postcard.progressPercent, 0, 100, 0),
    rarity: ["common", "uncommon", "rare"].includes(postcard.rarity) ? postcard.rarity : scene.rarity,
    completionReason: ["full_cycle", "recalled"].includes(postcard.completionReason)
      ? postcard.completionReason
      : "recalled",
    weatherSnapshot: isRecord(postcard.weatherSnapshot) ? postcard.weatherSnapshot : null,
    decorations: arrayOrEmpty(postcard.decorations)
      .map(decoration => normalizeDecoration(decoration, id))
      .filter(Boolean)
  };
}

function normalizeDecoration(decoration, postcardId) {
  if (!isRecord(decoration)) return null;
  const id = normalizeStoredId(decoration.id);
  const souvenirId = normalizeStoredId(decoration.souvenirId);
  if (!id || !souvenirId) return null;
  return {
    id,
    postcardId,
    souvenirId,
    x: clampNumber(decoration.x, 0, 1, 0.5),
    y: clampNumber(decoration.y, 0, 1, 0.5),
    scale: clampNumber(decoration.scale, 0.5, 2, 1),
    rotation: normalizeDecorationRotation(decoration.rotation),
    zIndex: Math.max(0, Math.round(finiteNumberOr(decoration.zIndex, 0))),
    createdAt: typeof decoration.createdAt === "string"
      ? decoration.createdAt
      : "1970-01-01T00:00:00.000Z"
  };
}

function normalizeStoredId(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return /^[A-Za-z0-9_:-]{1,160}$/.test(normalized) ? normalized : null;
}

function normalizeStoredText(value, fallback, maximumLength) {
  if (typeof value !== "string") return fallback;
  const normalized = value.replace(/[\u0000-\u001F\u007F]/g, " ").trim();
  return normalized ? normalized.slice(0, maximumLength) : fallback;
}

function normalizeStoredIsoDate(value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return legacyDate();
  return new Date(value).toISOString();
}

function normalizeLocalWeather(value, base, hasConsent) {
  if (!hasConsent || !isRecord(value)) {
    return { ...base, status: "disabled" };
  }
  const location = isRecord(value.location)
    ? {
        city: normalizeStoredText(value.location.city, "", 120),
        region: normalizeStoredText(value.location.region, "", 120),
        country: normalizeStoredText(value.location.country, "", 120),
        countryCode: normalizeStoredText(value.location.countryCode, "", 8),
        timezone: normalizeStoredText(value.location.timezone, "", 120)
      }
    : null;
  return {
    ...base,
    status: ["idle", "loading", "ready", "failed"].includes(value.status) ? value.status : "idle",
    hasRequested: value.hasRequested === true,
    requestedAt: typeof value.requestedAt === "string" ? value.requestedAt : null,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : null,
    location,
    snapshot: isRecord(value.snapshot) ? value.snapshot : null,
    error: isRecord(value.error) ? value.error : null
  };
}

function normalizeDecorationRotation(value) {
  const number = finiteNumberOr(value, 0);
  return ((number + 180) % 360 + 360) % 360 - 180;
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function recordOrEmpty(value) {
  return isRecord(value) ? value : {};
}

function arrayOrEmpty(value) {
  return Array.isArray(value) ? value : [];
}

function dedupeTravelsById(travels) {
  const byId = new Map();
  travels.forEach((travel, index) => {
    const key = typeof travel.id === "string" ? travel.id : `anonymous:${index}`;
    byId.set(key, travel);
  });
  return [...byId.values()];
}

function stringArrayOr(value, fallback) {
  if (!Array.isArray(value)) return [...fallback];
  const strings = value.filter(item => typeof item === "string");
  return strings.length > 0 ? strings : [...fallback];
}

function finiteNumberOr(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function clampNumber(value, minimum, maximum, fallback) {
  return Math.min(maximum, Math.max(minimum, finiteNumberOr(value, fallback)));
}
