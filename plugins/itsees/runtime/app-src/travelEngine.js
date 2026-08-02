import { FULL_TRAVEL_MINUTES } from "./content.js?v=inventory-v5";
import {
  CONTENT_SOURCE_MODE,
  getSceneFromDb,
  getSouvenirFromDb,
  getThemeFromDb,
  resolveOptimizedAssetUrl,
  resolveTravelSceneFromDb
} from "./contentRepository.js?v=asset-webp-v5";
import { resolvePhase1WeatherSnapshot } from "./weatherVisuals.js";
import { DEFAULT_PET_ID } from "./pets.js";
import { createInitialLiveWeatherState } from "./liveWeather.js";
import { canEnterFeaturePack } from "./featureRegistry.js";
import {
  getAtlasDestination,
  resolveAtlasScene
} from "./atlasContent.js?v=daily-checkin-v5";
import { resolveSouvenirRewards } from "./souvenirRewards.js?v=souvenir-routing-v2";

export const MAX_TRAVEL_HISTORY = 500;
export const MAX_SOUVENIR_ACQUISITIONS = 2000;
import { DEFAULT_PACK_ITEM_IDS, normalizePackSelection } from "./inventoryRules.js?v=inventory-v1";
import {
  clearDailyCheckinNotice,
  createInitialDailyCheckinState,
  creditDailyCheckin,
  ensureDailyCheckinState,
  getDailyCheckinStatus,
  getLocalDateKey,
  PHASE_CHECKIN_MINUTES,
  queueDailyCheckinNotice
} from "./dailyCheckin.js?v=daily-checkin-v4";

const MINUTE_MS = 60 * 1000;

export function createId(prefix = "id") {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function toIso(value = new Date()) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function addMinutes(dateLike, minutes) {
  return new Date(new Date(dateLike).getTime() + minutes * MINUTE_MS);
}

export function elapsedMinutes(startedAt, now = new Date()) {
  return Math.max(0, (new Date(now).getTime() - new Date(startedAt).getTime()) / MINUTE_MS);
}

export function calculateTravelProgress(accumulatedTravelMinutes) {
  return Math.min(Math.max(accumulatedTravelMinutes / FULL_TRAVEL_MINUTES, 0), 1);
}

export function calculateColoredSegments(accumulatedTravelMinutes, segments) {
  const ordered = [...segments].sort((a, b) => a.order - b.order);
  const elapsed = Math.max(accumulatedTravelMinutes, 0);
  return ordered.filter(segment => elapsed + Number.EPSILON >= segment.unlockMinute).map(segment => segment.id);
}

export function getRuntimeTravelView(session, now = new Date()) {
  if (!session) return null;
  const destination = getTravelDestination(session);
  const liveMinutes =
    session.status === "traveling"
      ? session.accumulatedTravelMinutes + elapsedMinutes(session.startedAt, now)
      : session.accumulatedTravelMinutes;
  const sessionLimit = Number.isFinite(session.dailyCheckinLimitMinutes)
    ? session.dailyCheckinLimitMinutes
    : FULL_TRAVEL_MINUTES;
  const successfulMinuteLimit = Math.min(FULL_TRAVEL_MINUTES, Math.max(0, sessionLimit));
  const cappedMinutes = Math.min(liveMinutes, FULL_TRAVEL_MINUTES, successfulMinuteLimit);
  const progress = calculateTravelProgress(cappedMinutes);
  const coloredSegmentIds = calculateColoredSegments(cappedMinutes, destination.mapSegments);
  return {
    accumulatedTravelMinutes: cappedMinutes,
    remainingMinutes: Math.max(0, successfulMinuteLimit - cappedMinutes),
    journeyRemainingMinutes: Math.max(0, FULL_TRAVEL_MINUTES - cappedMinutes),
    progressPercent: progress * 100,
    coloredSegmentIds,
    completedSpotCount: coloredSegmentIds.length,
    totalSpotCount: destination.mapSegments.length,
    minimumSpotMinutes: destination.mapSegments[0]?.unlockMinute ?? FULL_TRAVEL_MINUTES,
    isFullCycle: cappedMinutes >= FULL_TRAVEL_MINUTES,
    isDailyLimitReached: liveMinutes + Number.EPSILON >= successfulMinuteLimit,
    dailyCheckinLimitMinutes: successfulMinuteLimit
  };
}

export function createInitialState() {
  return {
    version: 10,
    revision: 0,
    updatedAt: null,
    selectedThemeId: "T01",
    selectedAtlasLandmarkId: "fr_paris",
    selectedItemIds: [...DEFAULT_PACK_ITEM_IDS],
    settings: {
      petPosition: { x: 28, y: 28 },
      selectedPetId: DEFAULT_PET_ID,
      hasChosenPet: false,
      hasCompletedOnboarding: false,
      isHidden: false,
      isPaused: false,
      lowDistractionMode: true,
      notificationsEnabled: true,
      liveWeatherEnabled: false,
      hasGrantedLiveWeatherConsent: false,
      backgroundMusicEnabled: false,
      hasChosenBackgroundMusic: false,
      backgroundMusicDestinationId: null
    },
    activeTravel: null,
    lastRecalledTravel: null,
    localWeather: createInitialLiveWeatherState(),
    travels: [],
    album: [],
    souvenirCounts: {},
    souvenirAcquisitions: [],
    dailyCheckin: createInitialDailyCheckinState(),
    themeProgress: {},
    atlasProgress: {},
    enabledFeaturePackIds: ["phase1-backpack"],
    analytics: []
  };
}

export function ensureThemeProgress(state, themeId) {
  if (!state.themeProgress[themeId]) {
    state.themeProgress[themeId] = {
      themeId,
      progressPercent: 0,
      coloredSegmentIds: [],
      isFullyColored: false,
      lastTravelId: null,
      updatedAt: toIso()
    };
  }
  return state.themeProgress[themeId];
}

export function ensureAtlasProgress(state, landmarkId) {
  if (!state.atlasProgress[landmarkId]) {
    state.atlasProgress[landmarkId] = {
      landmarkId,
      progressPercent: 0,
      coloredSegmentIds: [],
      isFullyColored: false,
      lastTravelId: null,
      updatedAt: toIso()
    };
  }
  return state.atlasProgress[landmarkId];
}

export function startTravel(state, destinationId, selectedItemIds, now = new Date(), options = {}) {
  const phase = options.phase === 2 ? 2 : 1;
  if (phase === 2 && !canEnterFeaturePack(state, "phase2-atlas")) return state;
  if (state.activeTravel?.status === "traveling") return state;
  const next = cloneState(state);
  ensureDailyCheckinState(next, now);
  const dailyStatus = getDailyCheckinStatus(next, phase, now);
  if (!dailyStatus.canStart) {
    queueDailyCheckinNotice(next, dailyStatus.isLimitReached ? "daily_limit" : "insufficient_phase_budget", now, { phase });
    recordEvent(next, "daily_checkin_blocked", {
      phase,
      destinationId,
      usedMinutes: dailyStatus.usedMinutes,
      remainingMinutes: dailyStatus.remainingMinutes
    });
    return next;
  }
  const startedAt = toIso(now);
  const normalizedItemIds = normalizePackSelection(state, selectedItemIds);
  const successfulMinuteLimit = Math.min(FULL_TRAVEL_MINUTES, dailyStatus.availableSuccessfulMinutes);
  const session = {
    id: createId("travel"),
    phase,
    destinationId,
    themeId: phase === 1 ? destinationId : null,
    landmarkId: phase === 2 ? destinationId : null,
    selectedItemIds: normalizedItemIds,
    startedAt,
    lastObservedAt: startedAt,
    expectedReturnAt: addMinutes(startedAt, successfulMinuteLimit).toISOString(),
    completedAt: null,
    durationMinutes: FULL_TRAVEL_MINUTES,
    accumulatedTravelMinutes: 0,
    progressPercent: 0,
    coloredSegmentIds: [],
    status: "traveling",
    completionReason: null,
    continuationOfTravelId: null,
    dailyCheckinDate: dailyStatus.localDate,
    dailyCheckinLimitMinutes: successfulMinuteLimit,
    creditedCheckinMinutes: 0,
    newlyCreditedCheckinMinutes: 0,
    result: null
  };
  if (phase === 1) next.selectedThemeId = destinationId;
  else next.selectedAtlasLandmarkId = destinationId;
  next.selectedItemIds = normalizedItemIds;
  next.activeTravel = session;
  next.lastRecalledTravel = null;
  if (phase === 1) ensureThemeProgress(next, destinationId);
  else ensureAtlasProgress(next, destinationId);
  recordEvent(next, "travel_started", { phase, destinationId, itemIds: normalizedItemIds, duration: FULL_TRAVEL_MINUTES });
  recordEvent(next, "map_preview_shown", { phase, destinationId, mapId: `${destinationId}-map` });
  return next;
}

export function summonTravel(state, now = new Date()) {
  if (!state.activeTravel || state.activeTravel.status !== "traveling") return state;
  const next = cloneState(state);
  refreshActiveTravelDailyWindow(next, now);
  const session = next.activeTravel;
  const runtime = getRuntimeTravelView(session, now);
  const reason = runtime.isFullCycle ? "full_cycle" : runtime.isDailyLimitReached ? "daily_limit" : "summoned";
  const completedSession = finishSession(session, runtime, reason, now, next.souvenirCounts);
  applyTravelResult(next, completedSession);
  completedSession.status = runtime.isFullCycle ? "completed" : "recalled";
  next.activeTravel = completedSession;
  next.lastRecalledTravel = runtime.isFullCycle ? null : completedSession;
  if (runtime.isDailyLimitReached) {
    const dailyStatus = getDailyCheckinStatus(next, completedSession.phase, now);
    if (!next.dailyCheckin.noticePending) {
      queueDailyCheckinNotice(next, dailyStatus.isLimitReached ? "daily_limit" : "insufficient_phase_budget", now, { phase: completedSession.phase });
    }
  }
  recordEvent(next, "travel_summoned", {
    phase: completedSession.phase ?? 1,
    destinationId: completedSession.destinationId ?? completedSession.themeId,
    elapsedMinutes: runtime.accumulatedTravelMinutes,
    progressPercent: runtime.progressPercent
  });
  recordEvent(next, "map_progress_rendered", {
    phase: completedSession.phase ?? 1,
    destinationId: completedSession.destinationId ?? completedSession.themeId,
    progressPercent: runtime.progressPercent,
    coloredSegmentCount: runtime.coloredSegmentIds.length
  });
  return next;
}

export function continueTravel(state, now = new Date()) {
  const recalled = state.lastRecalledTravel;
  if (!recalled || recalled.status !== "recalled") return state;
  const next = cloneState(state);
  ensureDailyCheckinState(next, now);
  const phase = recalled.phase === 2 ? 2 : 1;
  const dailyStatus = getDailyCheckinStatus(next, phase, now);
  const segmentMinutes = PHASE_CHECKIN_MINUTES[phase];
  const routeRemaining = Math.max(0, FULL_TRAVEL_MINUTES - recalled.accumulatedTravelMinutes);
  const availableForJourney = Math.floor(dailyStatus.remainingMinutes / segmentMinutes) * segmentMinutes;
  if (routeRemaining > 0 && availableForJourney < segmentMinutes) {
    queueDailyCheckinNotice(next, dailyStatus.isLimitReached ? "daily_limit" : "insufficient_phase_budget", now, { phase });
    return next;
  }
  const successfulMinuteLimit = Math.min(
    FULL_TRAVEL_MINUTES,
    (recalled.creditedCheckinMinutes ?? 0) + availableForJourney
  );
  const remaining = Math.max(0, successfulMinuteLimit - recalled.accumulatedTravelMinutes);
  const startedAt = toIso(now);
  const session = {
    ...recalled,
    id: createId("travel"),
    startedAt,
    lastObservedAt: startedAt,
    expectedReturnAt: addMinutes(startedAt, remaining).toISOString(),
    completedAt: null,
    status: "traveling",
    completionReason: null,
    continuationOfTravelId: recalled.id,
    dailyCheckinDate: dailyStatus.localDate,
    dailyCheckinLimitMinutes: successfulMinuteLimit,
    newlyCreditedCheckinMinutes: 0,
    result: null
  };
  next.activeTravel = session;
  next.lastRecalledTravel = null;
  recordEvent(next, "travel_continue_selected", {
    phase: session.phase ?? 1,
    destinationId: session.destinationId ?? session.themeId,
    remainingMinutes: remaining
  });
  return next;
}

export function switchThemeAndStart(state, themeId, selectedItemIds, now = new Date()) {
  const fromThemeId = state.activeTravel?.themeId ?? state.lastRecalledTravel?.themeId ?? null;
  const next = startTravel(state, themeId, selectedItemIds, now);
  if (next === state) return state;
  recordEvent(next, "travel_theme_switched", { fromThemeId, toThemeId: themeId });
  return next;
}

export function completeActiveTravelIfDue(state, now = new Date()) {
  if (!state.activeTravel || state.activeTravel.status !== "traveling") return state;
  const next = cloneState(state);
  const previousDailyCheckinDate = next.activeTravel.dailyCheckinDate;
  const previousDailyCheckinLimitMinutes = next.activeTravel.dailyCheckinLimitMinutes;
  const previousClockRollbackDetectedAt = next.activeTravel.clockRollbackDetectedAt;
  refreshActiveTravelDailyWindow(next, now);
  const dailyWindowChanged =
    next.activeTravel.dailyCheckinDate !== previousDailyCheckinDate ||
    next.activeTravel.dailyCheckinLimitMinutes !== previousDailyCheckinLimitMinutes ||
    next.activeTravel.clockRollbackDetectedAt !== previousClockRollbackDetectedAt;
  const runtime = getRuntimeTravelView(next.activeTravel, now);
  if (!runtime.isFullCycle && !runtime.isDailyLimitReached) return dailyWindowChanged ? next : state;
  const reason = runtime.isFullCycle ? "full_cycle" : "daily_limit";
  const completedSession = finishSession(next.activeTravel, runtime, reason, now, next.souvenirCounts);
  completedSession.status = runtime.isFullCycle ? "completed" : "recalled";
  applyTravelResult(next, completedSession);
  next.activeTravel = completedSession;
  next.lastRecalledTravel = runtime.isFullCycle ? null : completedSession;
  if (runtime.isDailyLimitReached) {
    const dailyStatus = getDailyCheckinStatus(next, completedSession.phase, now);
    if (!next.dailyCheckin.noticePending) {
      queueDailyCheckinNotice(next, dailyStatus.isLimitReached ? "daily_limit" : "insufficient_phase_budget", now, { phase: completedSession.phase });
    }
  }
  recordEvent(next, runtime.isFullCycle ? "travel_completed" : "travel_daily_limit_reached", {
    themeId: completedSession.themeId,
    sceneId: completedSession.result.sceneId,
    hasSouvenir: completedSession.result.souvenirIds.length > 0,
    completionReason: reason,
    progressPercent: completedSession.progressPercent
  });
  recordEvent(next, "map_progress_rendered", {
    themeId: completedSession.themeId,
    progressPercent: completedSession.progressPercent,
    coloredSegmentCount: completedSession.coloredSegmentIds.length
  });
  return next;
}

export function dismissDailyCheckinNotice(state) {
  const next = cloneState(state);
  clearDailyCheckinNotice(next);
  return next;
}

function finishSession(session, runtime, reason, now, ownedCounts = {}) {
  const result = resolveTravelResultFromDb(session, runtime, reason, now, ownedCounts);
  return {
    ...session,
    completedAt: toIso(now),
    accumulatedTravelMinutes: runtime.accumulatedTravelMinutes,
    progressPercent: runtime.progressPercent,
    coloredSegmentIds: runtime.coloredSegmentIds,
    completionReason: reason,
    result
  };
}

function resolveTravelResultFromDb(session, runtime, reason, now, ownedCounts) {
  if ((session.phase ?? 1) === 2) {
    return resolveAtlasTravelResult(session, runtime, reason, now, ownedCounts);
  }
  const completedSpotCount = runtime.coloredSegmentIds.length;
  const hasCompletedSpot = completedSpotCount > 0;
  const resolved = hasCompletedSpot
    ? resolveTravelSceneFromDb(session.themeId, completedSpotCount)
    : { theme: getThemeFromDb(session.themeId), scene: null };
  const { theme, scene } = resolved;
  const postcardId = hasCompletedSpot ? createId("postcard") : null;
  const completedScenes = hasCompletedSpot ? theme.scenes.slice(0, completedSpotCount) : [];
  const souvenirIds = hasCompletedSpot
    ? resolveSouvenirRewards({
        seed: session.id,
        phase: 1,
        themeId: theme.id,
        progressPercent: runtime.progressPercent,
        selectedItemIds: session.selectedItemIds,
        ownedCounts
      }).map(item => item.id)
    : [];
  const createdAt = toIso(now);
  const weatherSnapshot = hasCompletedSpot
    ? resolvePhase1WeatherSnapshot({ themeId: theme.id, sceneId: scene.id, date: createdAt })
    : null;
  const postcards = completedScenes.map(item => ({
    id: item.id === scene?.id ? postcardId : createId("postcard"),
    phase: 1,
    themeId: theme.id,
    destinationId: theme.id,
    sceneId: item.id,
    sceneImageAsset: resolveOptimizedAssetUrl(item.imageAsset),
    title: `${theme.name} · ${item.name}明信片`,
    sceneName: item.name,
    message: item.message,
    createdAt,
    progressPercent: runtime.progressPercent,
    rarity: item.rarity,
    weatherSnapshot: resolvePhase1WeatherSnapshot({ themeId: theme.id, sceneId: item.id, date: createdAt })
  }));
  return {
    contentSource: CONTENT_SOURCE_MODE,
    sceneId: scene?.id ?? null,
    postcardId,
    souvenirIds,
    sceneImageAsset: resolveOptimizedAssetUrl(scene?.imageAsset ?? null),
    mapAssets: {
      color: resolveOptimizedAssetUrl(theme.assets.mapColor),
      gray: resolveOptimizedAssetUrl(theme.assets.mapGray)
    },
    mapProgressPercent: runtime.progressPercent,
    coloredSegmentIds: runtime.coloredSegmentIds,
    seed: session.id,
    title: hasCompletedSpot
      ? reason === "full_cycle" ? `${theme.name}完整明信片` : `${theme.name}途中明信片`
      : `${theme.name}未抵达景点记录`,
    message: scene?.message ?? "还没抵达第一个景点，这次只留下了旅行时间。",
    sceneName: scene?.name ?? "未抵达景点",
    createdAt,
    rarity: scene?.rarity ?? null,
    weatherSnapshot,
    postcards
  };
}

function resolveAtlasTravelResult(session, runtime, reason, now, ownedCounts) {
  const completedSpotCount = runtime.coloredSegmentIds.length;
  const hasCompletedSpot = completedSpotCount > 0;
  const { destination, scene } = hasCompletedSpot
    ? resolveAtlasScene(session.destinationId, completedSpotCount)
    : { destination: getAtlasDestination(session.destinationId), scene: null };
  const createdAt = toIso(now);
  const completedScenes = hasCompletedSpot ? destination.scenes.slice(0, completedSpotCount) : [];
  const postcardId = hasCompletedSpot ? createId("postcard") : null;
  const weatherSnapshot = hasCompletedSpot ? destination.resolveWeatherSnapshot(now) : null;
  return {
    contentSource: "atlas_real_landmarks",
    phase: 2,
    landmarkId: destination.id,
    sceneId: scene?.id ?? null,
    postcardId,
    souvenirIds: hasCompletedSpot
      ? resolveSouvenirRewards({
          seed: session.id,
          phase: 2,
          landmarkId: destination.id,
          progressPercent: runtime.progressPercent,
          selectedItemIds: session.selectedItemIds,
          ownedCounts
        }).map(item => item.id)
      : [],
    sceneImageAsset: scene?.imageAsset ?? null,
    mapAssets: { color: destination.assets.mapColor, gray: destination.assets.mapGray },
    mapProgressPercent: runtime.progressPercent,
    coloredSegmentIds: runtime.coloredSegmentIds,
    seed: session.id,
    title: hasCompletedSpot
      ? reason === "full_cycle" ? `${destination.name}完整明信片` : `${destination.name}途中明信片`
      : `${destination.name}未抵达景点记录`,
    message: scene?.message ?? "还没抵达第一个真实景点，这次只留下了旅行时间。",
    sceneName: scene?.name ?? "未抵达景点",
    createdAt,
    rarity: scene?.rarity ?? null,
    weatherSnapshot,
    postcards: completedScenes.map(item => ({
      id: item.id === scene?.id ? postcardId : createId("postcard"),
      phase: 2,
      landmarkId: destination.id,
      destinationId: destination.id,
      sceneId: item.id,
      sceneImageAsset: item.imageAsset,
      title: `${destination.name} · ${item.name}明信片`,
      sceneName: item.name,
      message: item.message,
      createdAt,
      progressPercent: runtime.progressPercent,
      rarity: item.rarity,
      weatherSnapshot
    }))
  };
}

function applyTravelResult(state, session) {
  const phase = session.phase ?? 1;
  const progress = phase === 2
    ? ensureAtlasProgress(state, session.destinationId)
    : ensureThemeProgress(state, session.themeId);
  const isFull = session.progressPercent >= 100;
  progress.progressPercent = Math.max(progress.progressPercent, session.progressPercent);
  progress.coloredSegmentIds = mergeIds(progress.coloredSegmentIds, session.coloredSegmentIds);
  progress.isFullyColored = progress.isFullyColored || isFull;
  progress.lastTravelId = session.id;
  progress.updatedAt = toIso();

  const alreadyRecorded = state.travels.some(travel => travel.id === session.id);
  if (!alreadyRecorded) {
    const segmentMinutes = PHASE_CHECKIN_MINUTES[phase];
    const successfulMinutes = session.coloredSegmentIds.length * segmentMinutes;
    const requestedMinutes = Math.max(0, successfulMinutes - (session.creditedCheckinMinutes ?? 0));
    const creditedMinutes = creditDailyCheckin(state, session, requestedMinutes, session.completedAt);
    session.newlyCreditedCheckinMinutes = creditedMinutes;
    session.creditedCheckinMinutes = (session.creditedCheckinMinutes ?? 0) + creditedMinutes;
    if (state.dailyCheckin.usedMinutes >= state.dailyCheckin.limitMinutes) {
      queueDailyCheckinNotice(state, "daily_limit", session.completedAt, { phase });
    }
    state.travels.unshift(session);
    state.travels = state.travels.slice(0, MAX_TRAVEL_HISTORY);
    const albumSceneKeys = new Set(state.album.map(getAlbumSceneKey).filter(Boolean));
    const postcards = Array.isArray(session.result.postcards) && session.result.postcards.length > 0
      ? session.result.postcards
      : session.result.postcardId && session.result.sceneId
        ? [session.result]
        : [];
    for (const postcard of postcards) {
      if (!postcard?.id || !postcard.sceneId) continue;
      const sceneKey = getAlbumSceneKey({
        phase,
        themeId: session.themeId,
        landmarkId: session.landmarkId,
        destinationId: session.destinationId ?? session.themeId,
        sceneId: postcard.sceneId
      });
      if (albumSceneKeys.has(sceneKey)) continue;
      state.album.unshift({
        id: postcard.id,
        travelId: session.id,
        phase,
        themeId: session.themeId,
        landmarkId: session.landmarkId,
        destinationId: session.destinationId ?? session.themeId,
        sceneId: postcard.sceneId,
        sceneImageAsset: postcard.sceneImageAsset,
        title: postcard.title,
        sceneName: postcard.sceneName,
        message: postcard.message,
        createdAt: postcard.createdAt ?? session.result.createdAt,
        progressPercent: postcard.progressPercent ?? session.result.mapProgressPercent,
        rarity: postcard.rarity,
        completionReason: session.completionReason,
        weatherSnapshot: postcard.weatherSnapshot ?? session.result.weatherSnapshot,
        decorations: []
      });
      if (sceneKey) albumSceneKeys.add(sceneKey);
    }
    for (const souvenirId of new Set(session.result.souvenirIds)) {
      state.souvenirAcquisitions ??= [];
      const acquisitionId = `acquisition-${session.id}-${souvenirId}`;
      if (!state.souvenirAcquisitions.some(item => item.id === acquisitionId)) {
        state.souvenirCounts[souvenirId] = (state.souvenirCounts[souvenirId] ?? 0) + 1;
        state.souvenirAcquisitions.unshift({
          id: acquisitionId,
          souvenirId,
          travelId: session.id,
          phase,
          destinationId: session.destinationId ?? session.themeId,
          acquiredAt: session.result.createdAt ?? session.completedAt ?? toIso(),
          rarity: getSouvenirFromDb(souvenirId)?.rarity ?? "common",
          isLegacy: false
        });
        state.souvenirAcquisitions = state.souvenirAcquisitions.slice(0, MAX_SOUVENIR_ACQUISITIONS);
      }
    }
  }
}

function getAlbumSceneKey(card) {
  if (!card?.sceneId) return null;
  const phase = card.phase === 2 ? 2 : 1;
  const destinationId = phase === 2 ? card.landmarkId ?? card.destinationId : card.themeId ?? card.destinationId;
  return destinationId ? `${phase}:${destinationId}:${card.sceneId}` : null;
}

function refreshActiveTravelDailyWindow(state, now) {
  const session = state.activeTravel;
  if (!session || session.status !== "traveling") return;
  if (session.lastObservedAt && new Date(now).getTime() < new Date(session.lastObservedAt).getTime()) {
    if (!session.clockRollbackDetectedAt) {
      session.clockRollbackDetectedAt = toIso(now);
      recordEvent(state, "travel_clock_rollback_detected", {
        travelId: session.id,
        lastObservedAt: session.lastObservedAt,
        observedAt: toIso(now)
      });
    }
    return;
  }
  session.lastObservedAt = toIso(now);
  const daily = ensureDailyCheckinState(state, now);
  const localDate = getLocalDateKey(now, daily.homeTimeZone);
  if (session.dailyCheckinDate >= localDate) return;
  const phase = session.phase === 2 ? 2 : 1;
  const status = getDailyCheckinStatus(state, phase, now);
  session.dailyCheckinDate = localDate;
  session.dailyCheckinLimitMinutes = Math.min(
    FULL_TRAVEL_MINUTES,
    (session.creditedCheckinMinutes ?? 0) + status.availableSuccessfulMinutes
  );
  session.expectedReturnAt = addMinutes(
    now,
    Math.max(0, session.dailyCheckinLimitMinutes - getRuntimeTravelView(session, now).accumulatedTravelMinutes)
  ).toISOString();
}

function recordEvent(state, name, properties = {}) {
  state.analytics.unshift({
    id: createId("event"),
    name,
    properties,
    createdAt: toIso()
  });
  state.analytics = state.analytics.slice(0, 120);
}

function mergeIds(left, right) {
  return [...new Set([...(left ?? []), ...(right ?? [])])];
}

function cloneState(state) {
  return structuredCloneSafe(state);
}

function structuredCloneSafe(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

export function formatMinutes(minutes) {
  const safe = Math.max(0, Math.ceil(minutes));
  return `${safe}分钟`;
}

export function getPostcardScene(postcard) {
  if ((postcard.phase ?? 1) === 2) {
    return resolveAtlasScene(postcard.landmarkId, Number(postcard.sceneId?.slice(-2)) || 1).scene;
  }
  return getSceneFromDb(postcard.themeId, postcard.sceneId);
}

export function getTravelDestination(session) {
  if ((session?.phase ?? 1) === 2) {
    return getAtlasDestination(session.destinationId ?? session.landmarkId);
  }
  return getThemeFromDb(session?.themeId ?? session?.destinationId);
}
