import { FULL_TRAVEL_MINUTES } from "./content.js?v=inventory-v5";
import {
  getSceneFromDb,
  getThemeFromDb,
  listInventoryItems,
  listSouvenirs,
  listThemes,
  preloadThemeAssets,
  resolveOptimizedAssetUrl,
  resolveThemeRenderContent
} from "./contentRepository.js?v=asset-webp-v5";
import {
  completeActiveTravelIfDue,
  continueTravel,
  createInitialState,
  dismissDailyCheckinNotice,
  formatMinutes,
  getRuntimeTravelView,
  startTravel,
  summonTravel,
  switchThemeAndStart
} from "./travelEngine.js?v=scene-postcards-v2";
import {
  cacheState,
  loadState,
  migrateState,
  resetState,
  saveState
} from "./storage.js?v=codex-plugin-state-v3";
import {
  createInitialLiveWeatherState,
  fetchFirstLaunchWeather,
  shouldRefreshLiveWeatherOnOpen
} from "./liveWeather.js";
import { DEFAULT_PET_ID, getPetAssetForWeatherState, getPetById, listPets } from "./pets.js";
import {
  canEnterFeaturePack,
  getPhase1Completion,
  getPhase2Completion
} from "./featureRegistry.js?v=map-hub-v1";
import { getMapChapter, listCurrentMapChapters } from "./mapChapters.js?v=map-hub-v1";
import {
  getAtlasDestination,
  listAtlasDestinations,
  resolveAtlasAssetUrl
} from "./atlasContent.js?v=daily-checkin-v5";
import { getAtlasPinPoint } from "./atlasPinLayout.js";
import {
  bindAtlasWorldView,
  loadAtlasWorldScenes,
  renderAtlasPostcardWorld,
  renderAtlasWorldView
} from "./atlasWorldView.js?v=3";
import {
  MAX_POSTCARD_DECORATIONS,
  addPostcardDecoration,
  movePostcardDecoration,
  removePostcardDecoration,
  transformPostcardDecoration
} from "./postcardDecorations.js?v=souvenir-library-v5";
import {
  COLLECTION_PAGE_SIZE,
  getCollectionDestinationId,
  getSouvenirIdsForDestination,
  queryCollection
} from "./collectionQueries.js?v=collection-v1";
import {
  DAILY_CHECKIN_LIMIT_MINUTES,
  ensureDailyCheckinState,
  getCurrentTimeZone,
  getDailyCheckinStatus,
  getDailyRestMessage,
  updateDailyCheckinHomeTimeZone
} from "./dailyCheckin.js?v=daily-checkin-v4";
import {
  getInventoryUnlockState,
  getPackRewardSummary,
  normalizePackSelection
} from "./inventoryRules.js?v=inventory-v1";
import { getHomeRecommendationPhase, rankHomeDestinations } from "./homeRecommendations.js?v=phase-aware-v1";
import {
  BackgroundMusicController,
  resolveBackgroundMusicSelection
} from "./backgroundMusic.js?v=weather-bgm-v4";
import {
  chooseLocale,
  getLocale,
  hasChosenLocale,
  localizeApp,
  translateText,
  toggleLocale
} from "./i18n.js?v=first-run-language-v10";
import {
  applyAcceptanceScenario,
  getAcceptanceScenario,
  PHASE2_ACCEPTANCE_SCENARIO
} from "./acceptanceScenarios.js?v=phase2-acceptance-v1";
import {
  getPhase1MilestoneSummary,
  shouldShowPhase2UnlockCelebration
} from "./phaseMilestones.js?v=phase2-chapter-v1";

const acceptanceScenario = getAcceptanceScenario();
const isPhase2Acceptance = acceptanceScenario === PHASE2_ACCEPTANCE_SCENARIO;
let state = applyAcceptanceScenario(loadState(), acceptanceScenario);
let dueTravelActionPending = false;
let activeView = "travel";
let mineView = "album";
let minePage = 1;
let mineFilters = {
  phase: "all",
  destinationId: "all",
  timeRange: "all",
  completion: "all",
  rarity: "all"
};
let detailsOpen = false;
let packLibraryOpen = false;
let themeAtlasZoom = 1;
let atlasWorldZoom = 1;
let atlasSubsceneId = null;
let themeSceneId = null;
let editingPostcardId = null;
let openMineDestinationId = null;
let mineSceneSelection = {};
let suppressSouvenirClickUntil = 0;
let imagePreview = null;
let resetConfirmOpen = false;
let settingsMenuOpen = false;
let phase2UnlockCelebrationOpen = false;
const urlParams = new URLSearchParams(window.location.search);
const isPetWindow = urlParams.get("mode") === "pet";
let onboardingStep = getRequiredOnboardingStep();
const themes = listThemes();
const inventoryItems = listInventoryItems();
const souvenirs = listSouvenirs();
const atlasDestinations = listAtlasDestinations();
const souvenirById = new Map(souvenirs.map(souvenir => [souvenir.id, souvenir]));
const pets = listPets();
const preloadedThemeAssets = new Map();
const themeMapPoints = [
  { id: "T01", x: 12, y: 23 },
  { id: "T02", x: 31, y: 20 },
  { id: "T03", x: 50, y: 22 },
  { id: "T04", x: 69, y: 20 },
  { id: "T05", x: 85, y: 23 },
  { id: "T06", x: 12, y: 51 },
  { id: "T07", x: 31, y: 51 },
  { id: "T08", x: 50, y: 51 },
  { id: "T09", x: 69, y: 51 },
  { id: "T10", x: 85, y: 51 },
  { id: "T11", x: 12, y: 79 },
  { id: "T12", x: 31, y: 80 },
  { id: "T13", x: 50, y: 78 },
  { id: "T14", x: 69, y: 80 },
  { id: "T15", x: 85, y: 79 }
];
const themeAtlasZoomStep = 0.2;
const themeAtlasMinZoom = 0.85;
const themeAtlasMaxZoom = 1.85;
let petPickerOpen = false;
let firstLaunchWeatherPromise = null;
let pendingFocusSelector = null;
let dialogReturnFocusSelector = null;
let desktopState = {
  isDesktop: false,
  isWindowVisible: true,
  isAlwaysOnTop: false,
  isPaused: false,
  isPetVisible: isPetWindow,
  windowMode: isPetWindow ? "pet" : "full"
};
const app = document.querySelector("#app");
const launchSkeleton = document.querySelector("#launch-skeleton");
if (launchSkeleton) {
  const launchIsEnglish = hasChosenLocale() && getLocale() === "en";
  const launchArt = launchSkeleton.querySelector("img");
  if (launchIsEnglish && launchArt) {
    launchArt.src = "./assets/brand/splash-pawprints-final-en.gif?v=20260804-1";
  }
  launchSkeleton.setAttribute(
    "aria-label",
    launchIsEnglish ? "Itsees is preparing your journey" : "Itsees 正在准备旅行"
  );
  launchArt?.setAttribute(
    "alt",
    launchIsEnglish ? "Pawprints heading into the distance" : "爪印走向远方"
  );
}
const launchSkeletonMinimumVisibleMs = 3480;
let launchSkeletonDismissScheduled = false;
let backgroundMusicMainSurfaceReady = !launchSkeleton;
let backgroundMusicSyncScheduled = false;
let pendingBackgroundMusicHomeContext = null;
const builtInMusicDestinationIds = new Set(["T01", "T02", "T03"]);
const musicPackStates = new Map([...builtInMusicDestinationIds].map(destinationId => [destinationId, { destinationId, state: "built_in" }]));
const pendingMusicPackDownloads = new Map();
let musicCacheSummary = { totalBytes: 0, maxBytes: 500 * 1024 * 1024, destinations: [] };
const backgroundMusicController = new BackgroundMusicController({
  onStatusChange: updateBackgroundMusicButton,
  onEvent: handleBackgroundMusicEvent
});

function markBackgroundMusicMainSurfaceReady() {
  if (backgroundMusicMainSurfaceReady) return;
  backgroundMusicMainSurfaceReady = true;
  if (!onboardingStep) {
    syncBackgroundMusicRuntime(getHomeRecommendationContext(getVisibleTravel()));
  }
}

function showThenDismissLaunchSkeleton({ immediate = false } = {}) {
  if (!launchSkeleton) {
    markBackgroundMusicMainSurfaceReady();
    return;
  }
  if (launchSkeletonDismissScheduled) return;
  launchSkeletonDismissScheduled = true;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const visibleDuration = immediate || reducedMotion ? 0 : launchSkeletonMinimumVisibleMs;

  window.setTimeout(() => {
    requestAnimationFrame(() => {
      launchSkeleton.classList.add("is-leaving");
      launchSkeleton.setAttribute("aria-hidden", "true");
      app.inert = false;
      app.setAttribute("aria-busy", "false");
      restorePendingFocus();

      const removeSkeleton = () => {
        if (launchSkeleton.isConnected) launchSkeleton.remove();
        markBackgroundMusicMainSurfaceReady();
      };
      if (immediate || reducedMotion) {
        removeSkeleton();
        return;
      }
      launchSkeleton.addEventListener("transitionend", removeSkeleton, { once: true });
      window.setTimeout(removeSkeleton, 500);
    });
  }, visibleDuration);
}

app.addEventListener("click", event => {
  const button = event.target.closest('[data-action="atlas-subscene"], [data-action="atlas-panorama"]');
  if (!button || !app.contains(button)) return;
  event.preventDefault();
  event.stopPropagation();
  atlasSubsceneId = button.dataset.action === "atlas-subscene" ? button.dataset.subsceneId : null;
  render();
});

function setState(next) {
  state = completeActiveTravelIfDue(next);
  saveState(state);
  render();
}

function requestTravelAction(action, browserFallback) {
  const applyTravelAction = isPhase2Acceptance ? null : window.desktopBridge?.applyTravelAction;
  if (typeof applyTravelAction !== "function") {
    setState(browserFallback());
    return;
  }
  Promise.resolve(applyTravelAction(action))
    .then(result => {
      if (result?.ok && result.state) applySharedTravelState(result.state);
      else if (result?.conflict && result.state) handleSharedStateConflict(result.state);
    })
    .catch(error => console.warn("Failed to apply shared Itsees travel action", error));
}

function requestDueTravelCompletion() {
  const applyTravelAction = isPhase2Acceptance ? null : window.desktopBridge?.applyTravelAction;
  if (typeof applyTravelAction !== "function") return false;
  if (dueTravelActionPending) return true;
  dueTravelActionPending = true;
  Promise.resolve(applyTravelAction({ type: "complete_due" }))
    .then(result => {
      if (result?.ok && result.state) applySharedTravelState(result.state);
    })
    .catch(error => console.warn("Failed to settle due Itsees travel", error))
    .finally(() => {
      dueTravelActionPending = false;
    });
  return true;
}

function handleSharedStateConflict(latestState) {
  if (latestState) applySharedTravelState(latestState);
  showSharedStateNotice("Codex 或另一个 Itsees 窗口刚刚更新了旅行存档，请再试一次刚才的操作。");
}

function showSharedStateNotice(message) {
  document.querySelector(".shared-state-conflict-notice")?.remove();
  const notice = document.createElement("div");
  notice.className = "shared-state-conflict-notice";
  notice.setAttribute("role", "status");
  notice.textContent = message;
  document.body.append(notice);
  window.setTimeout(() => notice.remove(), 5_000);
}

function getSelectedTheme() {
  return getThemeFromDb(state.selectedThemeId);
}

function isThemeUnlocked(theme) {
  return theme.unlocked || state.travels.length >= 2 || state.themeProgress[theme.id]?.isFullyColored;
}

function getVisibleTravel() {
  return state.activeTravel;
}

function getHomeRecommendationContext(activeTravel) {
  const phase = getHomeRecommendationPhase(state, {
    phase2Enabled: canEnterFeaturePack(state, "phase2-atlas")
  });

  if (phase === 2) {
    const recommendations = rankHomeDestinations(atlasDestinations, {
      selectedId: state.selectedAtlasLandmarkId,
      activeTravel: activeTravel?.phase === 2 ? activeTravel : null,
      progressById: state.atlasProgress
    });
    const destination = recommendations[0] ?? getAtlasDestination(state.selectedAtlasLandmarkId);
    return {
      phase,
      destination,
      mapView: getAtlasMapView(destination),
      recommendations: recommendations.slice(0, 3)
    };
  }

  const unlockedThemes = themes.filter(isThemeUnlocked);
  const recommendations = rankHomeDestinations(unlockedThemes, {
    selectedId: state.selectedThemeId,
    activeTravel: (activeTravel?.phase ?? 1) === 1 ? activeTravel : null,
    progressById: state.themeProgress
  });
  const destination = recommendations[0] ?? getSelectedTheme();
  ensureThemeAssets(destination.id);
  return {
    phase,
    destination,
    mapView: getMapView(destination),
    recommendations: recommendations.slice(0, 3)
  };
}

function normalizeBackgroundMusicDestinationId(destinationId) {
  if (typeof destinationId !== "string") return null;
  if (themes.some(theme => theme.id === destinationId)) return destinationId;
  if (atlasDestinations.some(destination => destination.id === destinationId)) return destinationId;
  return null;
}

function confirmBackgroundMusicDestination(destinationId) {
  const normalizedDestinationId = normalizeBackgroundMusicDestinationId(destinationId);
  if (!normalizedDestinationId) return false;
  void prepareBackgroundMusicDestination(normalizedDestinationId);
  if (state.settings.backgroundMusicDestinationId === normalizedDestinationId) return false;
  state.settings.backgroundMusicDestinationId = normalizedDestinationId;
  return true;
}

function getViewedBackgroundMusicDestinationId(homeContext = null) {
  const route = getAppRoute();
  if (route.view === "theme-landmark") {
    const routeTheme = themes.find(theme => theme.id === route.themeId);
    if (routeTheme && isThemeUnlocked(routeTheme)) return routeTheme.id;
  }
  if (route.view === "atlas-landmark" && canEnterFeaturePack(state, "phase2-atlas")) {
    const routeDestination = atlasDestinations.find(destination => destination.id === route.landmarkId);
    if (routeDestination) return routeDestination.id;
  }

  return normalizeBackgroundMusicDestinationId(state.settings.backgroundMusicDestinationId)
    ?? normalizeBackgroundMusicDestinationId(homeContext?.destination?.id)
    ?? getThemeFromDb(state.selectedThemeId).id;
}

function getCurrentBackgroundMusicSelection(homeContext = null) {
  return resolveBackgroundMusicSelection({
    activeTravel: getVisibleTravel(),
    viewedDestinationId: getViewedBackgroundMusicDestinationId(homeContext),
    localWeather: state.localWeather
  });
}

function syncBackgroundMusicRuntime(homeContext = null) {
  const selection = getCurrentBackgroundMusicSelection(homeContext);
  const shouldPlay = backgroundMusicMainSurfaceReady
    && !onboardingStep
    && !isPetWindow
    && state.settings.hasChosenBackgroundMusic
    && state.settings.backgroundMusicEnabled;
  if (shouldPlay && selection?.destinationId && !isMusicDestinationReady(selection.destinationId)) {
    void backgroundMusicController.setEnabled(false, selection);
    void prepareBackgroundMusicDestination(selection.destinationId);
    return;
  }
  void backgroundMusicController.setEnabled(shouldPlay, selection);
}

function isMusicDestinationReady(destinationId) {
  if (builtInMusicDestinationIds.has(destinationId)) return true;
  if (!window.desktopBridge?.ensureMusicPack) return true;
  return ["ready", "built_in"].includes(musicPackStates.get(destinationId)?.state);
}

function prepareBackgroundMusicDestination(destinationId) {
  const normalizedDestinationId = normalizeBackgroundMusicDestinationId(destinationId);
  if (!normalizedDestinationId || builtInMusicDestinationIds.has(normalizedDestinationId)) return Promise.resolve(true);
  if (!window.desktopBridge?.ensureMusicPack) return Promise.resolve(true);
  if (pendingMusicPackDownloads.has(normalizedDestinationId)) return pendingMusicPackDownloads.get(normalizedDestinationId);
  const preferredWeatherId = resolveBackgroundMusicSelection({
    activeTravel: null,
    viewedDestinationId: normalizedDestinationId,
    localWeather: state.localWeather
  })?.weatherId ?? "DEFAULT";
  const pending = window.desktopBridge.ensureMusicPack(normalizedDestinationId, preferredWeatherId)
    .then(status => {
      musicPackStates.set(normalizedDestinationId, status);
      if (["ready", "built_in"].includes(status.state)) {
        musicCacheSummary.destinations = [...new Set([...musicCacheSummary.destinations, normalizedDestinationId])];
        if (getCurrentBackgroundMusicSelection()?.destinationId === normalizedDestinationId) {
          syncBackgroundMusicRuntime();
        }
      }
      updateBackgroundMusicButton();
      return status.state !== "error";
    })
    .catch(error => {
      musicPackStates.set(normalizedDestinationId, { destinationId: normalizedDestinationId, state: "error", message: error.message });
      updateBackgroundMusicButton();
      return false;
    })
    .finally(() => pendingMusicPackDownloads.delete(normalizedDestinationId));
  pendingMusicPackDownloads.set(normalizedDestinationId, pending);
  return pending;
}

function applyMusicPackStatus(status) {
  if (!normalizeBackgroundMusicDestinationId(status?.destinationId)) return;
  musicPackStates.set(status.destinationId, status);
  if (status.state === "error" && /verification failed/i.test(status.message ?? "")) {
    void prepareBackgroundMusicDestination(status.destinationId);
  }
  updateBackgroundMusicButton();
}

function scheduleBackgroundMusicRuntimeSync(homeContext = null) {
  pendingBackgroundMusicHomeContext = homeContext;
  if (backgroundMusicSyncScheduled) return;
  backgroundMusicSyncScheduled = true;
  queueMicrotask(() => {
    backgroundMusicSyncScheduled = false;
    const pendingHomeContext = pendingBackgroundMusicHomeContext;
    pendingBackgroundMusicHomeContext = null;
    syncBackgroundMusicRuntime(pendingHomeContext);
  });
}

function updateBackgroundMusicButton(snapshot = backgroundMusicController.getSnapshot()) {
  const button = app?.querySelector('[data-action="toggle-background-music"]');
  if (!button) return;
  const isPlaying = snapshot.status === "playing";
  const destinationId = getCurrentBackgroundMusicSelection()?.destinationId;
  const downloadStatus = musicPackStates.get(destinationId)?.state;
  const isPreparing = downloadStatus === "downloading";
  button.classList.toggle("is-playing", isPlaying);
  button.classList.toggle("is-downloading", isPreparing);
  button.dataset.musicStatus = isPreparing ? "downloading" : snapshot.status;
  button.setAttribute("aria-pressed", String(isPlaying));
  const label = translateText(isPreparing ? "正在准备当地音乐" : isPlaying ? "关闭背景音乐" : "播放背景音乐");
  button.setAttribute("aria-label", label);
  button.title = label;
}

function handleBackgroundMusicEvent(name, selection, details = {}) {
  recordClientEvent(name, {
    destinationId: selection?.destinationId ?? null,
    weatherId: selection?.weatherId ?? null,
    ...details
  });
  saveState(state);
}

function setBackgroundMusicPreference(enabled, source, { rerender = false } = {}) {
  const shouldEnable = Boolean(enabled);
  state.settings.backgroundMusicEnabled = shouldEnable;
  state.settings.hasChosenBackgroundMusic = true;
  recordClientEvent("background_music_preference_set", {
    enabled: shouldEnable,
    source
  });
  saveState(state);

  const selection = getCurrentBackgroundMusicSelection();
  if (shouldEnable) {
    if (selection?.destinationId && !isMusicDestinationReady(selection.destinationId)) {
      void prepareBackgroundMusicDestination(selection.destinationId);
      void backgroundMusicController.setEnabled(false, selection);
    } else {
      void backgroundMusicController.retry(selection);
    }
  } else {
    void backgroundMusicController.setEnabled(false, selection);
  }

  if (rerender) {
    render();
  } else {
    updateBackgroundMusicButton();
  }
}

function getMapView(theme) {
  const activeTravel = getVisibleTravel();
  if (activeTravel && activeTravel.themeId === theme.id) {
    return getRuntimeTravelView(activeTravel);
  }
  const saved = state.themeProgress[theme.id];
  return {
    accumulatedTravelMinutes: saved ? (saved.progressPercent / 100) * FULL_TRAVEL_MINUTES : 0,
    remainingMinutes: saved?.isFullyColored ? 0 : FULL_TRAVEL_MINUTES,
    progressPercent: saved?.progressPercent ?? 0,
    coloredSegmentIds: saved?.coloredSegmentIds ?? [],
    completedSpotCount: saved?.coloredSegmentIds?.length ?? 0,
    totalSpotCount: theme.mapSegments.length,
    minimumSpotMinutes: theme.mapSegments[0]?.unlockMinute ?? FULL_TRAVEL_MINUTES,
    isFullCycle: Boolean(saved?.isFullyColored)
  };
}

function captureMapViewportState() {
  const viewport = app.querySelector("[data-map-scroll-key]");
  if (!viewport) return null;
  const maxScrollLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
  const maxScrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
  return {
    key: viewport.dataset.mapScrollKey,
    leftRatio: maxScrollLeft > 0 ? viewport.scrollLeft / maxScrollLeft : 0,
    topRatio: maxScrollTop > 0 ? viewport.scrollTop / maxScrollTop : 0,
    isInlineEnd: maxScrollLeft > 0 && maxScrollLeft - viewport.scrollLeft <= 2,
    isBlockEnd: maxScrollTop > 0 && maxScrollTop - viewport.scrollTop <= 2
  };
}

function restoreMapViewportState(snapshot) {
  if (!snapshot) return;
  const viewport = app.querySelector(`[data-map-scroll-key="${CSS.escape(snapshot.key)}"]`);
  if (!viewport) return;

  const applyPosition = () => {
    const maxScrollLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    const maxScrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
    viewport.scrollLeft = snapshot.isInlineEnd ? maxScrollLeft : maxScrollLeft * snapshot.leftRatio;
    viewport.scrollTop = snapshot.isBlockEnd ? maxScrollTop : maxScrollTop * snapshot.topRatio;
  };

  applyPosition();
  requestAnimationFrame(applyPosition);
}

function setTextIfChanged(element, text) {
  const localizedText = translateText(text);
  if (element && element.textContent !== localizedText) element.textContent = localizedText;
}

function updateLiveTravelProgress(now = new Date()) {
  const activeTravel = state.activeTravel;
  if (activeTravel?.status !== "traveling") return false;

  const phase = activeTravel.phase === 2 ? 2 : 1;
  const runtime = getRuntimeTravelView(activeTravel, now);
  const progress = Math.round(runtime.progressPercent);
  const statusText = getStatusText(activeTravel, runtime);

  app.querySelectorAll("[data-live-travel-status]").forEach(element => {
    setTextIfChanged(element, statusText);
  });

  const destinationId = activeTravel.destinationId ?? activeTravel.themeId;
  const livePanel = app.querySelector(
    `[data-live-destination-id="${CSS.escape(destinationId)}"][data-live-phase="${phase}"]`
  );
  if (livePanel) {
    setTextIfChanged(livePanel.querySelector("[data-live-progress-percent]"), `${progress}%`);
    setTextIfChanged(livePanel.querySelector("[data-live-remaining]"), formatMinutes(runtime.remainingMinutes));
    setTextIfChanged(
      livePanel.querySelector("[data-live-progress-summary]"),
      `${runtime.coloredSegmentIds.length}/${runtime.totalSpotCount} 个${phase === 2 ? "子场景" : "景点"} · 剩余 ${formatMinutes(runtime.remainingMinutes)}`
    );

    const renderedSegmentCount = Number(livePanel.dataset.liveSegmentCount ?? runtime.coloredSegmentIds.length);
    if (renderedSegmentCount !== runtime.coloredSegmentIds.length) {
      render();
      return true;
    }
  }

  const route = getAppRoute();
  if (route.view !== "map" || phase !== route.mapPhase) return true;

  if (phase === 1) {
    const themeId = activeTravel.themeId;
    const theme = getThemeFromDb(themeId);
    const node = app.querySelector(`.phase1-map-node[data-theme-id="${CSS.escape(themeId)}"]`);
    setTextIfChanged(node?.querySelector("[data-map-node-progress]"), `${progress}%`);
    node?.setAttribute("aria-label", translateText(`${theme.name}，已点亮 ${progress}%`));

    if (state.selectedThemeId === themeId) {
      const panel = app.querySelector(".phase1-journey-card");
      const values = panel?.querySelectorAll(".phase1-atlas-progress strong") ?? [];
      setTextIfChanged(values[0], `${progress}%`);
      setTextIfChanged(values[1], `${runtime.coloredSegmentIds.length}/${runtime.totalSpotCount}`);
      const track = panel?.querySelector(".phase1-progress-track");
      track?.setAttribute("aria-label", translateText(`${theme.name}本次旅程${progress}%`));
      track?.querySelector("i")?.style.setProperty("width", `${Math.max(2, runtime.progressPercent)}%`);
    }
    return true;
  }

  if (state.selectedAtlasLandmarkId === activeTravel.destinationId) {
    const panel = app.querySelector(".atlas-world-ticket");
    const values = panel?.querySelectorAll(".phase1-atlas-progress strong") ?? [];
    setTextIfChanged(values[0], `${progress}%`);
    setTextIfChanged(values[1], `${runtime.coloredSegmentIds.length}/${runtime.totalSpotCount}`);
    panel?.querySelectorAll(".atlas-world-segments span").forEach((segment, index) => {
      segment.classList.toggle("complete", index < runtime.coloredSegmentIds.length);
    });
  }
  return true;
}

function render() {
  const renderedPackLibrary = app.querySelector(".pack-library");
  if (renderedPackLibrary) packLibraryOpen = renderedPackLibrary.open;
  const mapViewportState = captureMapViewportState();
  const previousDailyDate = state.dailyCheckin?.localDate;
  const currentDaily = ensureDailyCheckinState(state);
  if (previousDailyDate && previousDailyDate !== currentDaily.localDate) saveState(state);
  const completedState = completeActiveTravelIfDue(state);
  if (completedState !== state) {
    if (!requestDueTravelCompletion()) {
      state = completedState;
      saveState(state);
    }
  }
  const activeTravel = getVisibleTravel();
  const phase1ActiveTravel = (activeTravel?.phase ?? 1) === 1 ? activeTravel : null;
  const theme = phase1ActiveTravel ? getThemeFromDb(phase1ActiveTravel.themeId) : getSelectedTheme();
  ensureThemeAssets(theme.id);
  const homeContext = getHomeRecommendationContext(activeTravel);
  const statusText = getStatusText(activeTravel, homeContext.mapView);
  const selectedPet = getSelectedPet();
  const lightweightPetMode = isLightweightPetMode();
  if (!lightweightPetMode && shouldShowPhase2UnlockCelebration(state, { acceptanceMode: isPhase2Acceptance })) {
    if (!phase2UnlockCelebrationOpen) {
      pendingFocusSelector = '[data-action="enter-phase2-unlock"]';
    }
    phase2UnlockCelebrationOpen = true;
  }
  scheduleBackgroundMusicRuntimeSync(homeContext);

  document.body.classList.toggle("desktop-pet-mode", lightweightPetMode);
  document.documentElement.classList.toggle("desktop-pet-mode", lightweightPetMode);
  app.classList.toggle("pet-mode-shell", lightweightPetMode);

  if (lightweightPetMode) {
    app.innerHTML = `
      <section class="pet-mode-stage">
        ${renderPet(activeTravel, selectedPet, { forceVisible: true, lightweight: true })}
      </section>
    `;
    localizeApp(app);
    bindLightweightPetEvents();
    return;
  }

  if (onboardingStep) {
    app.innerHTML = renderFirstRunOnboarding(selectedPet);
    if (onboardingStep === "language") {
      document.documentElement.lang = "en";
      document.documentElement.dataset.locale = "bilingual";
    } else {
      localizeApp(app);
    }
    bindEvents();
    return;
  }

  const route = getAppRoute();
  if (route.view === "mine") {
    app.innerHTML = `
      ${renderJournalFrame(renderMineShell(activeTravel), "mine", statusText)}
      ${renderJourneyOverlay()}
      ${renderPet(activeTravel, selectedPet, { avoidHeader: true, avoidDetails: true, journal: true })}
      ${petPickerOpen ? renderPetPicker(selectedPet) : ""}
      ${renderImagePreview()}
      ${renderResetConfirmDialog()}
    `;
    localizeApp(app);
    bindEvents();
    bindPetDrag();
    return;
  }
  if (route.view === "theme-landmark") {
    const routeTheme = getThemeFromDb(route.themeId);
    const themeEnabled = routeTheme.id === route.themeId && isThemeUnlocked(routeTheme);
    let shouldSaveRouteConfirmation = false;
    if (themeEnabled && state.selectedThemeId !== routeTheme.id) {
      state.selectedThemeId = routeTheme.id;
      shouldSaveRouteConfirmation = true;
    }
    if (themeEnabled && confirmBackgroundMusicDestination(routeTheme.id)) shouldSaveRouteConfirmation = true;
    if (shouldSaveRouteConfirmation) saveState(state);
    app.innerHTML = `
      ${renderJournalFrame(themeEnabled ? renderThemeLandmark(routeTheme, activeTravel) : renderMapHub(1, activeTravel, selectedPet), "map", statusText)}
      ${renderJourneyOverlay()}
      ${renderPet(activeTravel, selectedPet, { avoidHeader: true, avoidDetails: detailsOpen })}
      ${petPickerOpen ? renderPetPicker(selectedPet) : ""}
      ${renderImagePreview()}
      ${renderResetConfirmDialog()}
    `;
    localizeApp(app);
    bindEvents();
    bindPetDrag();
    return;
  }
  if (route.view === "atlas-landmark") {
    const atlasEnabled = canEnterFeaturePack(state, "phase2-atlas");
    const routeDestination = atlasDestinations.find(destination => destination.id === route.landmarkId);
    if (atlasEnabled && routeDestination && confirmBackgroundMusicDestination(routeDestination.id)) saveState(state);
    app.innerHTML = `
      ${renderJournalFrame(atlasEnabled ? renderAtlasShell(route, activeTravel, selectedPet) : renderMapHub(2, activeTravel, selectedPet), "map", statusText)}
      ${renderJourneyOverlay()}
      ${renderPet(activeTravel, selectedPet, { avoidHeader: true, avoidDetails: detailsOpen })}
      ${petPickerOpen ? renderPetPicker(selectedPet) : ""}
      ${renderImagePreview()}
      ${renderResetConfirmDialog()}
    `;
    localizeApp(app);
    bindEvents();
    bindPetDrag();
    return;
  }

  if (route.view === "map") {
    app.innerHTML = `
      ${renderJournalFrame(renderMapHub(route.mapPhase, activeTravel, selectedPet), "map", statusText)}
      ${renderJourneyOverlay()}
      ${renderPet(activeTravel, selectedPet)}
      ${petPickerOpen ? renderPetPicker(selectedPet) : ""}
      ${renderImagePreview()}
      ${renderResetConfirmDialog()}
    `;
    localizeApp(app);
    bindEvents();
    bindPetDrag();
    restoreMapViewportState(mapViewportState);
    return;
  }

  app.innerHTML = `
    ${renderJournalFrame(`
    <section class="home-shell">
      <header class="home-topbar">
        <div class="journal-current-status">
          <span data-live-travel-status>${statusText}</span>
          <strong>${getSelectedPet().name} · ${getPetStateLine(getPetVisualState(activeTravel))}</strong>
        </div>
        ${renderJournalStatusbar()}
      </header>

      <div class="home-workspace">
        <main class="journey-page">
          ${renderTodayCard(homeContext, activeTravel, selectedPet)}
        </main>

        <aside class="pack-sidebar" aria-label="出发准备">
          ${renderPackPanel(activeTravel, homeContext.destination, homeContext.mapView, { phase: homeContext.phase })}
          ${renderUtilityPanel(activeTravel, homeContext.phase)}
        </aside>
      </div>

      <details class="home-details" ${detailsOpen ? "open" : ""}>
        <summary>
          <span>旅行设置与记录</span>
          <small>目的地、旅行包、相册、纪念品</small>
        </summary>
        <div class="details-grid">
          <section class="detail-panel destinations-panel">
            <div class="panel-heading">
              <p class="eyebrow">${homeContext.phase === 2 ? "真实世界" : "主题地图"}</p>
              <h2>${homeContext.phase === 2 ? "选择真实景点" : "选择目的地"}</h2>
            </div>
            <div class="theme-list">
              ${homeContext.phase === 2
                ? atlasDestinations.map(renderAtlasHomeButton).join("")
                : themes.map(renderThemeButton).join("")}
            </div>
          </section>

          <section class="detail-panel collection-panel">
            <div class="panel-heading compact">
              <p class="eyebrow">${homeContext.destination.name}</p>
              <h2>本次旅行记录</h2>
            </div>
          <nav class="tabs">
            ${renderTab("travel", "旅行")}
            ${renderTab("album", "相册")}
            ${renderTab("souvenir", "纪念品")}
            ${renderTab("history", "记录")}
          </nav>
          <div class="tab-body">
            ${homeContext.phase === 2
              ? renderAtlasView(homeContext.destination, homeContext.mapView)
              : renderView(homeContext.destination, homeContext.mapView)}
          </div>
          </section>
        </div>
      </details>
    </section>`, "travel", statusText)}
    ${renderJourneyOverlay()}
    ${renderPet(activeTravel, selectedPet, { avoidHeader: true, avoidDetails: true })}
    ${petPickerOpen ? renderPetPicker(selectedPet) : ""}
    ${renderImagePreview()}
    ${renderResetConfirmDialog()}
  `;

  localizeApp(app);
  bindEvents();
  bindPetDrag();
}

function renderJournalFrame(content, activeSection, statusText = "") {
  return `
    <div class="journal-frame" ${phase2UnlockCelebrationOpen ? "inert" : ""}>
      ${renderJournalRail(activeSection, statusText)}
      <div class="journal-stage">${content}</div>
    </div>
  `;
}

function renderJournalRail(activeSection, statusText) {
  const english = getLocale() === "en";
  const completedThemes = themes.filter(theme => state.themeProgress[theme.id]?.isFullyColored).length;
  const phase2Completion = getPhase2Completion(state);
  const preferredPhase = getHomeRecommendationPhase(state, {
    phase2Enabled: canEnterFeaturePack(state, "phase2-atlas")
  });
  const navItems = [
    ["travel", "旅行", "现在出发", "open-home", ""],
    ["mine", "背包", `${state.album.length} 张明信片`, "open-mine", ""],
    ["map", "地图", preferredPhase === 2
      ? `二期 ${phase2Completion.completedLandmarkCount}/${phase2Completion.requiredLandmarkCount}`
      : `一期 ${completedThemes}/${themes.length}`, preferredPhase === 2 ? "open-map-phase2" : "open-map-phase1", ""]
  ];
  return `
    <aside class="journal-rail" aria-label="Itsees 主导航">
      <div class="journal-brand" aria-label="ITSEES PET TRAVEL">
        <strong>ITSEES</strong>
        <span>PET TRAVEL</span>
      </div>
      <nav class="journal-nav">
        ${navItems.map(([id, label, meta, action, themeId]) => `
          <button class="journal-nav-item ${activeSection === id ? "active" : ""}" data-action="${action}" ${themeId ? `data-theme-id="${themeId}"` : ""} ${activeSection === id ? 'aria-current="page"' : ""} type="button">
            <strong>${label}</strong><span>${meta}</span>
          </button>
        `).join("")}
      </nav>
      <div class="journal-map-progress" aria-label="地图阶段进度">
        <strong>旅程地图</strong>
        <span>一期路线　${completedThemes}/${themes.length}</span>
        <span>二期景点　${phase2Completion.completedLandmarkCount}/${phase2Completion.requiredLandmarkCount}</span>
      </div>
      <blockquote class="journal-motto">
        <small>${english ? "A SMALL JOURNEY,<br />BEFORE YOURS" : "在你出发之前"}</small>
        <strong>${english ? "Every shared moment<br />deserves a place in the journal" : "每一段陪伴<br />都值得被记录"}</strong>
        <span data-live-travel-status>${statusText || "等待出发"}</span>
      </blockquote>
    </aside>
  `;
}

function renderJournalStatusbar() {
  const weather = state.localWeather?.snapshot;
  const place = formatWeatherLocation(state.localWeather?.location);
  const weatherText = !state.settings.liveWeatherEnabled
    ? "实时天气已关闭"
    : weather
      ? `${escapeHtml(weather.label)} ${formatTemperature(weather.temperatureC)}`
      : "天气读取中";
  const selectedPet = getSelectedPet();
  const english = getLocale() === "en";
  const date = new Intl.DateTimeFormat(getLocale(), {
    year: "numeric",
    month: english ? "short" : "2-digit",
    day: english ? "numeric" : "2-digit",
    weekday: "short"
  }).format(new Date());
  return `
    <div class="journal-statusbar">
      <button
        class="journal-pet-avatar"
        data-action="open-pet-picker"
        type="button"
        title="更换旅伴：${selectedPet.name}"
        aria-label="更换旅伴，当前为${selectedPet.name}"
      ><img src="${selectedPet.asset}" alt="" draggable="false" /></button>
      <span>${escapeHtml(place)} · ${weatherText}</span>
      <i aria-hidden="true"></i>
      <span>${date}</span>
      ${renderBackgroundMusicButton()}
      ${renderJournalSettings()}
    </div>
  `;
}

function renderBackgroundMusicButton() {
  const snapshot = backgroundMusicController.getSnapshot();
  const isPlaying = snapshot.status === "playing";
  const destinationId = getCurrentBackgroundMusicSelection()?.destinationId;
  const isPreparing = musicPackStates.get(destinationId)?.state === "downloading";
  return `
    <button
      class="journal-music-toggle ${isPlaying ? "is-playing" : ""} ${isPreparing ? "is-downloading" : ""}"
      data-action="toggle-background-music"
      data-music-status="${snapshot.status}"
      type="button"
      title="${isPreparing ? "正在准备当地音乐" : isPlaying ? "关闭背景音乐" : "播放背景音乐"}"
      aria-label="${isPreparing ? "正在准备当地音乐" : isPlaying ? "关闭背景音乐" : "播放背景音乐"}"
      aria-pressed="${isPlaying}"
    >
      <span class="journal-music-icon" aria-hidden="true">♫</span>
    </button>
  `;
}

function renderJournalSettings() {
  return `
    <div class="journal-settings ${settingsMenuOpen ? "open" : ""}">
      <button
        class="journal-settings-trigger"
        data-action="toggle-settings-menu"
        type="button"
        aria-label="打开设置"
        aria-expanded="${settingsMenuOpen}"
      >设置</button>
      ${settingsMenuOpen ? `<div class="journal-settings-menu">
        ${renderDesktopControls()}
        <button data-action="open-pet-picker" type="button">更换旅伴</button>
        <button data-action="toggle-live-weather" type="button">实时天气：${state.settings.liveWeatherEnabled ? "开启" : "关闭"}</button>
        <button data-action="open-privacy" type="button">实时天气隐私说明</button>
        <button data-action="update-home-time-zone" type="button" title="每日额度按此时区换日">换日时区：${escapeHtml(state.dailyCheckin?.homeTimeZone ?? getCurrentTimeZone())}</button>
        <button data-action="toggle-background-music-setting" type="button">背景音乐：${state.settings.backgroundMusicEnabled ? "开启" : "关闭"}</button>
        <button data-action="clear-music-cache" type="button">音乐缓存：${formatMusicCacheBytes(musicCacheSummary.totalBytes)} · 清理</button>
        <button data-action="toggle-pause" type="button">${state.settings.isPaused ? "继续旅伴" : "暂停旅伴"}</button>
        <button data-action="toggle-hide" type="button">${state.settings.isHidden ? "显示旅伴" : "隐藏旅伴"}</button>
        <button class="danger" data-action="reset" type="button">清空旅行记录</button>
      </div>` : ""}
    </div>
  `;
}

function formatMusicCacheBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  return `${(bytes / 1024 / 1024).toFixed(bytes >= 100 * 1024 * 1024 ? 0 : 1)} MB`;
}

function getSelectedPet() {
  return getPetById(state.settings.selectedPetId ?? DEFAULT_PET_ID);
}

function getRequiredOnboardingStep() {
  if (isPetWindow) return null;
  const isFirstLaunch = !state.settings.hasChosenPet && !state.settings.hasCompletedOnboarding;
  if (isFirstLaunch && !hasChosenLocale()) return "language";
  if (!state.settings.hasChosenPet) return "pet";
  if (!state.settings.hasCompletedOnboarding) return "weather";
  if (!state.settings.hasChosenBackgroundMusic) return "music";
  return null;
}

function isLightweightPetMode() {
  return isPetWindow || desktopState.windowMode === "pet";
}

function getPetVisualState(activeTravel) {
  if (state.settings.isPaused) return "paused";
  if (["traveling", "completed", "recalled"].includes(activeTravel?.status)) return activeTravel.status;
  return "idle";
}

function getCompactPetRenderKey(snapshot) {
  const visualState = snapshot.settings.isPaused
    ? "paused"
    : ["traveling", "completed", "recalled"].includes(snapshot.activeTravel?.status)
      ? snapshot.activeTravel.status
      : "idle";
  const usesWeather = ["traveling", "recalled", "paused"].includes(visualState);
  const weatherAssetId = usesWeather && snapshot.localWeather?.status === "ready"
    ? snapshot.localWeather.snapshot?.weatherAssetId ?? null
    : null;
  return JSON.stringify([
    snapshot.settings.selectedPetId ?? DEFAULT_PET_ID,
    visualState,
    weatherAssetId
  ]);
}

function getPetVisualLabel(visualState) {
  const labels = {
    traveling: "旅行中",
    completed: "已完成",
    recalled: "已召回",
    paused: "暂停中",
    idle: "待机"
  };
  return labels[visualState] ?? labels.idle;
}

function getPetStateLine(visualState) {
  const lines = {
    traveling: "它正在路上替你收集风景。",
    completed: "它把风景带回来了，正等你拆开今天的明信片。",
    recalled: "它刚从半路赶回来，包还没放下。",
    paused: "它先坐下来等你。",
    idle: "它已经背好小包，等你点头。"
  };
  return lines[visualState] ?? lines.idle;
}

function getPetWeatherMeta(visualState) {
  if (!["traveling", "recalled", "paused"].includes(visualState)) return null;
  if (state.localWeather?.status !== "ready") return null;
  const assetId = state.localWeather.snapshot?.weatherAssetId;
  if (!assetId) return null;
  return {
    assetId,
    label: state.localWeather.snapshot?.visual?.label ?? state.localWeather.snapshot?.label ?? ""
  };
}

function renderMapHub(activePhase, activeTravel, selectedPet) {
  const phase = Number(activePhase) === 2 ? 2 : 1;
  const atlasEnabled = canEnterFeaturePack(state, "phase2-atlas");
  const selectedDestination = getAtlasDestination(state.selectedAtlasLandmarkId);
  const content = phase === 2
    ? atlasEnabled
      ? renderAtlasWorldMap(selectedDestination, activeTravel)
      : renderAtlasLocked(selectedPet)
    : renderThemeAtlas(activeTravel);
  return `
    <section class="map-hub" data-map-phase="${phase}">
      ${renderMapChapterTabs(phase, atlasEnabled)}
      <div id="map-chapter-panel" role="tabpanel" aria-label="${phase === 1 ? "第一期地图总览" : "第二期地图总览"}">
        ${content}
      </div>
    </section>
  `;
}

function renderMapChapterTabs(activePhase, atlasEnabled) {
  const chapters = listCurrentMapChapters();
  const english = getLocale() === "en";
  return `
    <header class="map-chapter-bar">
      <div class="map-chapter-title">
        <span>${english ? "ITSEES MAP BOOK" : "ITSEES 旅行地图"}</span>
        <strong>旅程地图</strong>
      </div>
      <nav class="map-chapter-tabs" role="tablist" aria-label="地图阶段">
        ${chapters.map(chapter => {
          const isActive = chapter.phase === activePhase;
          const isLocked = chapter.phase === 2 && !atlasEnabled;
          return `
            <button
              class="map-chapter-tab ${isActive ? "active" : ""} ${isLocked ? "locked" : ""}"
              data-action="open-map-${chapter.id}"
              role="tab"
              aria-selected="${isActive}"
              aria-controls="map-chapter-panel"
              aria-label="${chapter.label} ${chapter.title}${isLocked ? "，完成第一期后开启" : ""}"
              type="button"
            >
              <span>${chapter.label}</span>
              <strong>${chapter.title}</strong>
              <small>${isLocked ? "完成一期后开启" : chapter.description}</small>
            </button>
          `;
        }).join("")}
      </nav>
      <p class="map-chapter-note">
        ${isPhase2Acceptance ? `<span class="acceptance-mode-stamp">${english ? "Phase 2 acceptance · Phase 1 fast-forwarded" : "二期验收模式 · 一期进度已快进"}</span>` : ""}
        每一期全部点亮后，下一篇地图才会展开。
      </p>
    </header>
  `;
}

function renderThemeAtlas(activeTravel) {
  const unlockedThemes = themes.filter(isThemeUnlocked);
  const completedThemes = themes.filter(theme => state.themeProgress[theme.id]?.isFullyColored);
  const selectedTheme = getSelectedTheme();
  const currentRouteTravel = activeTravel
    && (activeTravel.phase ?? 1) === 1
    && ["traveling", "recalled"].includes(activeTravel.status)
    ? activeTravel
    : null;
  const selectedMapView = getMapView(selectedTheme);
  const currentTravelTheme = currentRouteTravel ? getThemeFromDb(currentRouteTravel.themeId) : null;
  const isViewingCurrentTravel = currentTravelTheme?.id === selectedTheme.id;
  const selectedProgressLabel = getLocale() === "en"
    ? `${translateText(selectedTheme.name)} · ${translateText(isViewingCurrentTravel ? "本次旅程" : "累计点亮")}: ${Math.round(selectedMapView.progressPercent)}%`
    : `${selectedTheme.name}，${isViewingCurrentTravel ? "本次旅程" : "累计点亮"}：${Math.round(selectedMapView.progressPercent)}%`;

  return `
    <section class="phase1-atlas-shell">
      <header class="phase1-atlas-topbar">
        <div class="phase1-atlas-intro">
          <p class="eyebrow">第一期 · 远方路线</p>
          <h1>今天，去点亮<br />一段远方。</h1>
          <p class="phase1-atlas-lede">在地图上挑一条路线。它负责出发，你只需要等一封从远方寄回来的信。</p>
          <div class="phase1-atlas-edition" aria-label="一期旅行图鉴说明">
            <span>15 条主题路线</span>
            <span>每站 20 分钟</span>
            <span>本地旅行手账</span>
          </div>
        </div>
        <div class="phase1-atlas-side">
          <div class="phase1-atlas-controls">${renderJournalSettings()}</div>
          <div class="phase1-atlas-status">
            <span><strong>${themes.length}</strong>主题</span>
            <span><strong>${unlockedThemes.length}</strong>可探索</span>
            <span><strong>${completedThemes.length}</strong>已通关</span>
          </div>
          ${renderLocalWeatherSummary()}
          ${renderDailyCheckinSummary(1)}
        </div>
      </header>

      <main class="phase1-atlas-workbench">
        <section class="phase1-world-map" aria-label="一期十五主题虚拟地图">
          <div class="phase1-map-toolbar" aria-label="地图缩放">
            <button data-action="atlas-zoom-out" title="缩小地图" ${themeAtlasZoom <= themeAtlasMinZoom ? "disabled" : ""}>-</button>
            <span>${Math.round(themeAtlasZoom * 100)}%</span>
            <button data-action="atlas-zoom-in" title="放大地图" ${themeAtlasZoom >= themeAtlasMaxZoom ? "disabled" : ""}>+</button>
            <button data-action="atlas-zoom-reset" title="恢复默认缩放">重置</button>
          </div>
          <div class="phase1-map-viewport" data-map-scroll-key="phase1" style="--atlas-zoom:${themeAtlasZoom};">
            <div class="phase1-map-surface">
              ${themes.map((theme, index) => renderThemeMapNode(theme, currentRouteTravel, index)).join("")}
            </div>
          </div>
        </section>

        <aside class="phase1-atlas-panel phase1-journey-card" style="${themePanelStyle(selectedTheme)}">
          <div class="phase1-journey-visual">
            <img src="${resolveOptimizedAssetUrl(selectedTheme.assets.mapColor)}" alt="${selectedTheme.name}路线预览" loading="eager" decoding="async" />
            <span class="phase1-route-tag">路线 ${selectedTheme.id}</span>
            <span class="phase1-postmark" aria-hidden="true">ITSEES<br />TRAVEL</span>
          </div>
          <div class="phase1-journey-copy">
            <p class="eyebrow">${isViewingCurrentTravel ? "当前旅程" : "选中路线"}</p>
            <h2>${selectedTheme.name}</h2>
            <p>${selectedTheme.tags}</p>
            <div class="phase1-atlas-progress">
              <span><strong>${Math.round(selectedMapView.progressPercent)}%</strong>${isViewingCurrentTravel ? "本次旅程" : "累计点亮"}</span>
              <span><strong>${selectedMapView.coloredSegmentIds.length}/${selectedTheme.mapSegments.length}</strong>景点</span>
            </div>
            <div class="phase1-progress-track" aria-label="${selectedProgressLabel}">
              <i style="width:${Math.max(2, selectedMapView.progressPercent)}%"></i>
            </div>
            ${currentTravelTheme && !isViewingCurrentTravel ? `<p class="current-trip-notice">当前旅程：${currentTravelTheme.name}。选中路线仅用于预览。</p>` : ""}
            <button class="launch-button" data-action="enter-theme" data-theme-id="${selectedTheme.id}">
              打开路线主页
            </button>
            <div class="phase1-atlas-legend">
              <span><i class="legend-on"></i>已点亮</span>
              <span><i class="legend-active"></i>当前旅程</span>
              <span><i class="legend-off"></i>待解锁</span>
            </div>
          </div>
        </aside>
      </main>
    </section>
  `;
}

function getAppRoute() {
  const normalized = window.location.hash.replace(/^#\/?/, "");
  const [section, view, id] = normalized.split("/");
  if (section === "theme" && themes.some(item => item.id === view)) {
    return { view: "theme-landmark", themeId: view };
  }
  if (section === "atlas" && view === "landmark" && atlasDestinations.some(item => item.id === id)) {
    return { view: "atlas-landmark", landmarkId: id };
  }
  if (section === "map") return { view: "map", mapPhase: view === "phase2" ? 2 : 1 };
  if (section === "atlas") return { view: "map", mapPhase: 2 };
  if (section === "mine") return { view: "mine" };
  if (section === "travel") return { view: "travel" };
  if (section === "phase1") return { view: "map", mapPhase: 1 };
  return { view: "travel" };
}

function renderMineShell(activeTravel) {
  const english = getLocale() === "en";
  const phaseOptions = getMinePhaseOptions();
  if (!phaseOptions.some(([value]) => value === String(mineFilters.phase))) {
    mineFilters.phase = "all";
    mineFilters.destinationId = "all";
  }
  const activeDestinationOptions = getMineDestinationOptions();
  if (mineFilters.destinationId !== "all"
    && !activeDestinationOptions.some(([value]) => value === mineFilters.destinationId)) {
    mineFilters.destinationId = "all";
  }
  const result = getMineCollectionResult();
  const status = activeTravel?.status === "traveling" ? "旅伴正在路上" : `${state.album.length} 张旅行明信片`;
  return `
    <section class="phase1-atlas-shell mine-shell">
      <header class="phase1-atlas-topbar mine-topbar">
        <div class="mine-intro">
          <p class="eyebrow">${english ? "Itsees · Travel Journal" : "Itsees · 旅行手账"}</p>
          <h1>我的旅行收藏</h1>
          <p>它见过的世界，都会带回来给你。</p>
          <div class="mine-passport-mark" aria-hidden="true">
            <span>${english ? "TRAVEL JOURNAL" : "旅行手账"}</span>
            <strong>ITSEES</strong>
            <small>${english ? "POSTCARDS · STAMPS · MEMORIES" : "明信片 · 印记 · 回忆"}</small>
          </div>
        </div>
        <div class="phase1-atlas-side">
          <div class="phase1-atlas-controls">${renderJournalSettings()}</div>
          <div class="mine-summary" aria-label="收藏概览">
            <span><strong>${state.album.length}</strong>明信片</span>
            <span><strong>${state.souvenirAcquisitions?.length ?? 0}</strong>纪念品</span>
            <span><strong>${state.travels.length}</strong>旅行记录</span>
          </div>
          <small class="mine-status">${status}</small>
          ${renderDailyCheckinSummary(1)}
        </div>
      </header>

      <main class="mine-main">
        <section class="mine-toolbar" aria-label="旅行手账工具栏">
          <nav class="tabs mine-tabs" role="tablist" aria-label="我的收藏分类">
            ${renderMineTab("album", "相册")}
            ${renderMineTab("souvenirs", "纪念品")}
            ${renderMineTab("history", "旅行记录")}
          </nav>
          <div class="mine-filter-summary">
            <span>${getActiveMineFilterCount() ? `已启用 ${getActiveMineFilterCount()} 项筛选` : "翻阅全部收藏"}</span>
            ${getActiveMineFilterCount() ? `<button data-action="mine-clear-filters" type="button">清除筛选</button>` : ""}
          </div>
        </section>
        <section class="mine-filter-bar" aria-label="收藏筛选">
          ${renderMineSelect("phase", "阶段", phaseOptions)}
          ${renderMineSelect("destinationId", "地点", [["all", "全部地点"], ...activeDestinationOptions])}
          ${renderMineSelect("timeRange", "时间", [
            ["all", "全部时间"], ["7d", "近 7 天"], ["30d", "近 30 天"], ["90d", "近 90 天"]
          ])}
          ${mineView !== "souvenirs" ? renderMineSelect("completion", "完成情况", [
            ["all", "全部状态"], ["completed", "完整完成"], ["recalled", "中途召回"]
          ]) : ""}
          ${mineView === "souvenirs" ? renderMineSelect("rarity", "稀有度", [
            ["all", "全部稀有度"], ["common", "普通"], ["uncommon", "少见"], ["rare", "稀有"]
          ]) : ""}
        </section>
        <div class="mine-result-meta">
          ${renderMineResultSummary(result)}
          <small>按寄达时间 · 从新到旧</small>
        </div>
        <section class="mine-collection" aria-live="polite">
          ${renderMineCollection(result)}
        </section>
        ${renderMinePagination(result)}
      </main>
    </section>
  `;
}

function renderMineTab(id, label) {
  return `<button class="${mineView === id ? "active" : ""}" data-mine-tab="${id}" role="tab" aria-selected="${mineView === id}" type="button">${label}</button>`;
}

function renderMineSelect(id, label, options) {
  return `
    <label class="mine-filter">
      <span>${label}</span>
      <select data-collection-filter="${id}">
        ${options.map(([value, text]) => `<option value="${value}" ${String(mineFilters[id]) === value ? "selected" : ""}>${text}</option>`).join("")}
      </select>
    </label>
  `;
}

function getActiveMineFilterCount() {
  return Object.values(mineFilters).filter(value => value !== "all").length;
}

function getMineDestinationOptions() {
  const phase = mineFilters.phase;
  const checkedInDestinationIds = getMineCheckedInDestinationIds();
  const options = [];
  if (phase === "all" || phase === "1") {
    options.push(...themes
      .filter(theme => checkedInDestinationIds.has(theme.id))
      .map(theme => [theme.id, `一期 · ${theme.name}`]));
  }
  if (phase === "all" || phase === "2") {
    options.push(...atlasDestinations
      .filter(destination => checkedInDestinationIds.has(destination.id))
      .map(destination => [destination.id, `二期 · ${destination.name}`]));
  }
  return options;
}

function getMinePhaseOptions() {
  const checkedInDestinationIds = getMineCheckedInDestinationIds();
  const options = [["all", "全部阶段"]];
  if (themes.some(theme => checkedInDestinationIds.has(theme.id))) options.push(["1", "一期"]);
  if (atlasDestinations.some(destination => checkedInDestinationIds.has(destination.id))) options.push(["2", "二期"]);
  return options;
}

function getMineCheckedInDestinationIds() {
  return new Set([
    ...state.album,
    ...(state.souvenirAcquisitions ?? [])
  ].map(getCollectionDestinationId).filter(Boolean));
}

function getMineCollectionResult() {
  const kind = mineView;
  const source = kind === "album"
    ? state.album
    : kind === "souvenirs"
      ? state.souvenirAcquisitions
      : state.travels;
  const filters = {
    phase: mineFilters.phase,
    destinationId: mineFilters.destinationId,
    timeRange: mineFilters.timeRange,
    ...(kind !== "souvenirs" ? { completion: mineFilters.completion } : {}),
    ...(kind === "souvenirs" ? { rarity: mineFilters.rarity } : {})
  };
  return queryCollection(source, {
    kind,
    filters,
    page: minePage,
    pageSize: COLLECTION_PAGE_SIZE
  });
}

function renderMineCollection(result) {
  if (mineView === "album") return renderGroupedAlbum(result);
  if (mineView === "souvenirs") return renderSouvenirs({ mode: "all" }, result, { acquisitionView: true });
  return renderHistory({ mode: "all" }, result);
}

function renderMineResultSummary(result) {
  if (mineView !== "album") return `<span><strong>${result.total}</strong> 件旅行收藏</span>`;
  return `<span><strong>${result.total}</strong> 张旅行明信片</span>`;
}

function renderMinePagination(result) {
  if (result.totalPages <= 1) return "";
  return `
    <nav class="mine-pagination" aria-label="收藏翻页">
      <button data-action="mine-page-prev" type="button" ${result.page <= 1 ? "disabled" : ""}>上一页</button>
      <span>第 ${result.page} / ${result.totalPages} 页</span>
      <button data-action="mine-page-next" type="button" ${result.page >= result.totalPages ? "disabled" : ""}>下一页</button>
    </nav>
  `;
}

function renderAtlasLocked(selectedPet) {
  const completion = getPhase1Completion(state);
  const remaining = completion.requiredThemeCount - completion.completedThemeCount;
  const english = getLocale() === "en";
  return `
    <section class="phase1-atlas-shell atlas-locked-shell map-locked-shell">
      <header class="phase1-atlas-topbar map-locked-topbar">
        <div class="phase1-atlas-intro">
          <p class="eyebrow">第二期 · 真实世界</p>
          <h1>世界地图<br />还没有展开。</h1>
          <p class="phase1-atlas-lede">完成第一期全部路线后，旅伴才会收到通往真实世界的车票。</p>
          <div class="phase1-atlas-edition" aria-label="二期真实世界解锁说明">
            <span>15 个真实景点</span>
            <span>每站 60 分钟</span>
            <span>完成一期后开启</span>
          </div>
        </div>
        <div class="phase1-atlas-side">
          <div class="phase1-atlas-controls">${renderJournalSettings()}</div>
          <div class="phase1-atlas-status">
            <span><strong>${completion.completedThemeCount}</strong>已完成</span>
            <span><strong>${completion.requiredThemeCount}</strong>需完成</span>
            <span><strong>${remaining}</strong>条待点亮</span>
          </div>
          ${renderLocalWeatherSummary()}
          ${renderAtlasUnlockSummary(completion)}
        </div>
      </header>
      <main class="map-lock-stage">
        <figure class="map-lock-visual">
          <img src="./assets/maps/world-map-journal-v2.webp" alt="尚未开启的真实世界地图" draggable="false" />
          <figcaption>${english ? "SECOND JOURNEY · MAP SEALED" : "第二段旅程 · 地图尚未开启"}</figcaption>
        </figure>
        <aside class="map-lock-copy">
          <p class="eyebrow">开启条件</p>
          <h2>还差 ${remaining} 条路线</h2>
          <p>第一期 15 条路线都达到 12/12 个景点，第二期地图总览会自动出现，不需要重新启动。</p>
          <div class="atlas-lock-meter" style="--phase-progress:${(completion.completedThemeCount / completion.requiredThemeCount) * 100}%">
            <i></i>
            <span>${completion.completedThemeCount} / ${completion.requiredThemeCount} 条路线</span>
          </div>
          <ul class="map-lock-rules">
            <li>只计算景点打卡进度</li>
            <li>明信片和纪念品不影响解锁</li>
            <li>完成最后一条路线后自动开启</li>
          </ul>
          <button class="launch-button" data-action="open-map-phase1">继续点亮第一期</button>
          <div class="map-lock-companion">
            <img src="${selectedPet.asset}" alt="${selectedPet.name}" draggable="false" />
            <span>${selectedPet.name}会在地图册旁等你。</span>
          </div>
        </aside>
      </main>
    </section>
  `;
}

function renderAtlasShell(route, activeTravel) {
  const destination = getAtlasDestination(route.landmarkId ?? state.selectedAtlasLandmarkId);
  if (route.view === "atlas-landmark") {
    return renderAtlasLandmark(destination, activeTravel);
  }
  return renderAtlasWorldMap(destination, activeTravel);
}

function renderAtlasTopbar(title, status, phase = 2) {
  return `
    <header class="atlas-topbar">
      <div class="home-wordmark">
        <span>${title}</span>
        <strong>${status}</strong>
        ${renderDailyCheckinBadge(phase)}
      </div>
      ${renderJournalSettings()}
    </header>
  `;
}

function renderThemeLandmark(theme, activeTravel) {
  const mapView = getMapView(theme);
  const renderContent = resolveThemeRenderContent(theme.id);
  const relevantTravel = (activeTravel?.phase ?? 1) === 1 && activeTravel?.themeId === theme.id
    ? activeTravel
    : null;
  const unlockedSceneCount = Math.min(mapView.coloredSegmentIds.length, renderContent.scenes.length);
  const selectedSceneIndex = renderContent.scenes.findIndex(scene => scene.id === themeSceneId);
  const selectedScene = selectedSceneIndex >= 0 && selectedSceneIndex < unlockedSceneCount
    ? renderContent.scenes[selectedSceneIndex]
    : null;
  const stageImage = selectedScene?.imageUrl ?? renderContent.mapAssets.color;
  const stageTitle = selectedScene?.name ?? theme.name;
  return `
    <section class="atlas-shell atlas-landmark-shell theme-landmark-shell" style="${themeLandmarkStyle(theme)}">
      ${renderAtlasTopbar(`远方路线 · ${theme.name}`, getStatusText(relevantTravel, mapView), 1)}
      <main class="atlas-landmark-main theme-landmark-main">
        <div class="theme-landmark-visuals">
          <div class="atlas-postcard-stage theme-postcard-stage">
            <section class="atlas-image-world theme-image-world">
              <div class="atlas-world-canvas ${selectedScene ? "subscene" : "panorama"}">
                <img class="atlas-world-image" src="${stageImage}" alt="${stageTitle} · ${selectedScene ? "场景图片" : "路线主图"}" draggable="false" />
                <div class="atlas-world-depth depth-back" aria-hidden="true"></div>
                <div class="atlas-world-depth depth-front" aria-hidden="true"></div>
              </div>
              <header class="atlas-world-caption">
                <div><span>${selectedScene ? "已进入子场景" : "路线主图"}</span><strong>${stageTitle}</strong></div>
                ${selectedScene ? '<button data-action="theme-panorama" title="返回主图">主图</button>' : ""}
              </header>
            </section>
          </div>
          <nav class="theme-scene-gallery" aria-label="${getLocale() === "en" ? `${translateText(theme.name)} · Scene gallery` : `${theme.name} · 子场景图片`}">
            ${renderContent.scenes.map((scene, index) => {
              const unlocked = index < unlockedSceneCount;
              const active = scene.id === selectedScene?.id;
              return `
                <button
                  class="theme-scene-button ${active ? "active" : ""} ${unlocked ? "unlocked" : "locked"}"
                  data-action="theme-scene"
                  data-scene-id="${scene.id}"
                  type="button"
                  ${unlocked ? "" : "disabled"}
                  aria-label="${unlocked ? `查看${scene.name}子场景` : `${scene.name}，第${index + 1}段旅行后点亮`}"
                >
                  <img src="${scene.imageUrl}" alt="" loading="lazy" decoding="async" />
                  <span><strong>${scene.name}</strong><small>${unlocked ? "查看场景" : `第 ${index + 1} 站解锁`}</small></span>
                </button>
              `;
            }).join("")}
          </nav>
        </div>
        <aside class="atlas-landmark-panel theme-landmark-panel">
          <button class="text-button" data-action="open-phase1">返回路线地图</button>
          <p class="eyebrow">路线 ${theme.id} · 远方主题</p>
          <h1>${theme.name}</h1>
          <p>${theme.tags}</p>
          <div class="atlas-segment-row theme-segment-row">
            ${theme.mapSegments.map(segment => `
              <span class="${mapView.coloredSegmentIds.includes(segment.id) ? "complete" : ""}" title="第${segment.order}站">${segment.order}</span>
            `).join("")}
          </div>
          <div class="atlas-progress-pair" data-live-destination-id="${theme.id}" data-live-phase="1" data-live-segment-count="${mapView.coloredSegmentIds.length}">
            <span><strong data-live-progress-percent>${Math.round(mapView.progressPercent)}%</strong>旅行进度</span>
            <span><strong data-live-remaining>${formatMinutes(mapView.remainingMinutes)}</strong>剩余</span>
          </div>
          ${renderThemeTravelActions(relevantTravel, activeTravel, theme)}
        </aside>
      </main>
      <details class="home-details atlas-details" ${detailsOpen ? "open" : ""}>
        <summary><span>旅行设置与记录</span><small>行囊、景点、相册、纪念品</small></summary>
        <div class="details-grid atlas-details-grid">
          <section class="detail-panel">${renderPackPanel(relevantTravel, theme, mapView, { phase: 1 })}${renderUtilityPanel(relevantTravel, 1)}</section>
          <section class="detail-panel collection-panel">
            <div class="panel-heading compact"><p class="eyebrow">${theme.name}</p><h2>路线收集</h2></div>
            <nav class="tabs">${renderTab("travel", "景点")}${renderTab("album", "相册")}${renderTab("souvenir", "纪念品")}${renderTab("history", "记录")}</nav>
            <div class="tab-body">${renderView(theme, mapView)}</div>
          </section>
        </div>
      </details>
    </section>
  `;
}

function renderThemeTravelActions(activeThemeTravel, anyActiveTravel, theme) {
  if (activeThemeTravel?.status === "traveling") {
    return `<button class="launch-button" data-action="summon">召回桌宠</button>`;
  }
  if (activeThemeTravel?.status === "recalled") {
    return `<button class="launch-button" data-action="continue">继续旅行</button>`;
  }
  if (anyActiveTravel?.status === "traveling") {
    const currentName = (anyActiveTravel.phase ?? 1) === 2
      ? getAtlasDestination(anyActiveTravel.destinationId).name
      : getThemeFromDb(anyActiveTravel.themeId).name;
    return `<div class="current-trip-notice">当前正在旅行：${currentName}。需要先召回这段旅程，才能切换路线。</div><button class="launch-button" data-action="summon">先召回当前旅程</button>`;
  }
  if (anyActiveTravel?.status === "recalled") {
    return `<button class="launch-button" data-action="switch" data-theme-id="${theme.id}">切换路线并重新出发</button>`;
  }
  return `<button class="launch-button" data-action="start">开始主题旅行</button>`;
}

function themeLandmarkStyle(theme) {
  return `${themePanelStyle(theme)}--atlas-a:${theme.palette[0]};--atlas-b:${theme.palette[1]};--atlas-c:${theme.palette[2]};`;
}

function renderAtlasWorldMap(selectedDestination, activeTravel) {
  const completedCount = atlasDestinations.filter(item => state.atlasProgress[item.id]?.isFullyColored).length;
  const currentAtlasTravel = (activeTravel?.phase ?? 1) === 2
    && ["traveling", "recalled"].includes(activeTravel?.status)
    ? activeTravel
    : null;
  const currentDestination = currentAtlasTravel ? getAtlasDestination(currentAtlasTravel.destinationId) : null;
  const isViewingCurrentTravel = currentDestination?.id === selectedDestination.id;
  const mapView = getAtlasMapView(selectedDestination);
  const unlockedCount = atlasDestinations.length;
  const selectedSceneCount = Math.min(mapView.coloredSegmentIds.length, selectedDestination.scenes.length);
  const destinationImage = selectedDestination.imageAsset;
  return `
    <section class="phase1-atlas-shell atlas-world-home">
      <header class="phase1-atlas-topbar atlas-world-topbar">
        <div class="phase1-atlas-intro">
          <p class="eyebrow">第二期 · 真实世界</p>
          <h1>把真实世界，<br />慢慢寄回家。</h1>
          <p class="phase1-atlas-lede">完成第一期后，地图册会展开十五处真实景点。每次出发都会点亮一小段真实世界，也会寄回新的明信片和纪念。</p>
          <div class="phase1-atlas-edition" aria-label="二期真实世界说明">
            <span>15 个真实景点</span>
            <span>每站 60 分钟</span>
            <span>真实世界地图册</span>
          </div>
        </div>
        <div class="phase1-atlas-side">
          <div class="phase1-atlas-controls">${renderJournalSettings()}</div>
          <div class="phase1-atlas-status">
            <span><strong>${atlasDestinations.length}</strong>景点</span>
            <span><strong>${unlockedCount}</strong>可探索</span>
            <span><strong>${completedCount}</strong>已完成</span>
          </div>
          ${renderLocalWeatherSummary()}
          ${renderDailyCheckinSummary(2)}
        </div>
      </header>

      <main class="phase1-atlas-workbench atlas-world-home-workbench">
        <section class="phase1-world-map atlas-world-mapbook" aria-label="二期真实世界地图">
          <div class="phase1-map-toolbar" aria-label="地图缩放">
            <button data-action="world-map-zoom-out" title="缩小地图" ${atlasWorldZoom <= themeAtlasMinZoom ? "disabled" : ""}>-</button>
            <span>${Math.round(atlasWorldZoom * 100)}%</span>
            <button data-action="world-map-zoom-in" title="放大地图" ${atlasWorldZoom >= themeAtlasMaxZoom ? "disabled" : ""}>+</button>
            <button data-action="world-map-zoom-reset" title="恢复默认缩放">重置</button>
          </div>
          <div class="atlas-world-viewport" data-map-scroll-key="phase2" style="--atlas-world-zoom:${atlasWorldZoom};">
            <div class="atlas-world-map">
              <img src="./assets/maps/world-map-journal-v2.webp" alt="手绘真实世界地图" draggable="false" fetchpriority="high" />
              <div class="atlas-pin-layer">
                ${atlasDestinations.map(destination => renderAtlasPin(destination, activeTravel)).join("")}
              </div>
            </div>
          </div>
        </section>
        <aside class="phase1-atlas-panel atlas-world-panel atlas-world-ticket" style="${atlasDestinationStyle(selectedDestination)}">
          <figure class="atlas-world-preview">
            <img src="${destinationImage}" alt="${selectedDestination.name}明信片预览" loading="eager" decoding="async" />
            <figcaption>${selectedDestination.country} · ${selectedDestination.englishName}</figcaption>
          </figure>
          <div class="atlas-world-ticket-copy">
            <p class="eyebrow">${isViewingCurrentTravel ? "当前真实旅程" : "选中景点"}</p>
            <h2>${selectedDestination.name}</h2>
            <p>${selectedDestination.summary}</p>
          </div>
          <div class="phase1-atlas-progress">
            <span><strong>${Math.round(mapView.progressPercent)}%</strong>旅程</span>
            <span><strong>${selectedSceneCount}/${selectedDestination.mapSegments.length}</strong>子场景</span>
          </div>
          <div class="atlas-world-segments" aria-label="${getLocale() === "en" ? `${translateText(selectedDestination.name)} · Scene progress` : `${selectedDestination.name} · 子场景点亮进度`}">
            ${selectedDestination.mapSegments.map(segment => `
              <span class="${mapView.coloredSegmentIds.includes(segment.id) ? "complete" : ""}" title="${segment.name}">${segment.order}</span>
            `).join("")}
          </div>
          ${currentDestination && !isViewingCurrentTravel ? `<p class="current-trip-notice">当前旅程：${currentDestination.name}。选中景点仅用于预览。</p>` : ""}
          <button class="launch-button" data-action="enter-atlas-landmark" data-landmark-id="${selectedDestination.id}">进入景点主页</button>
          <div class="phase1-atlas-legend">
            <span><i class="legend-on"></i>已完成</span>
            <span><i class="legend-active"></i>当前旅程</span>
            <span><i class="legend-off"></i>可探索</span>
          </div>
        </aside>
      </main>
    </section>
  `;
}

function renderAtlasPin(destination, activeTravel) {
  const point = getAtlasPinPoint(destination);
  const selected = state.selectedAtlasLandmarkId === destination.id;
  const traveling = (activeTravel?.phase ?? 1) === 2
    && ["traveling", "recalled"].includes(activeTravel?.status)
    && activeTravel.destinationId === destination.id;
  const complete = Boolean(state.atlasProgress[destination.id]?.isFullyColored);
  return `
    <button
      class="atlas-pin ${selected ? "selected" : ""} ${traveling ? "traveling" : ""} ${complete ? "complete" : "unlit"}"
      style="${atlasDestinationStyle(destination)}--x:${point.x}%;--y:${point.y}%;"
      data-action="select-atlas-landmark"
      data-landmark-id="${destination.id}"
      title="${destination.name}"
    >
      <i></i><span>${destination.name}</span>
    </button>
  `;
}

function renderAtlasLandmark(destination, activeTravel) {
  const mapView = getAtlasMapView(destination);
  const snapshot = destination.resolveWeatherSnapshot(new Date());
  const relevantTravel = (activeTravel?.phase ?? 1) === 2 && activeTravel.destinationId === destination.id
    ? activeTravel
    : null;
  return `
    <section class="atlas-shell atlas-landmark-shell" style="${atlasDestinationStyle(destination)}">
      ${renderAtlasTopbar(`真实世界 · ${destination.name}`, getStatusText(relevantTravel, mapView))}
      <main class="atlas-landmark-main">
        <div class="atlas-postcard-stage ${snapshot.visual.cssClass}">
          ${renderAtlasWorldView(destination, mapView, atlasSubsceneId)}
          <div class="atlas-weather-layer" aria-hidden="true"></div>
          <span class="atlas-weather-badge">${snapshot.label} · ${snapshot.temperatureC}°C</span>
        </div>
        <aside class="atlas-landmark-panel">
          <button class="text-button" data-action="open-atlas">返回世界地图</button>
          <p class="eyebrow">${destination.country} · ${destination.englishName}</p>
          <h1>${destination.name}</h1>
          <p>${destination.summary}</p>
          <div class="atlas-segment-row">
            ${destination.mapSegments.map(segment => `
              <span class="${mapView.coloredSegmentIds.includes(segment.id) ? "complete" : ""}" title="${segment.name}">${segment.order}</span>
            `).join("")}
          </div>
          <div class="atlas-progress-pair" data-live-destination-id="${destination.id}" data-live-phase="2" data-live-segment-count="${mapView.coloredSegmentIds.length}">
            <span><strong data-live-progress-percent>${Math.round(mapView.progressPercent)}%</strong>旅行进度</span>
            <span><strong data-live-remaining>${formatMinutes(mapView.remainingMinutes)}</strong>剩余</span>
          </div>
          ${renderAtlasTravelActions(relevantTravel, activeTravel, destination)}
        </aside>
      </main>
      <details class="home-details atlas-details" ${detailsOpen ? "open" : ""}>
        <summary><span>旅行设置与记录</span><small>行囊、景点、相册、纪念品</small></summary>
        <div class="details-grid atlas-details-grid">
          <section class="detail-panel">${renderPackPanel(activeTravel, destination, mapView, { phase: 2 })}${renderAtlasUtilityPanel(relevantTravel)}</section>
          <section class="detail-panel collection-panel">
            <div class="panel-heading compact"><p class="eyebrow">${destination.name}</p><h2>真实世界收集</h2></div>
            <nav class="tabs">${renderTab("travel", "景点")}${renderTab("album", "相册")}${renderTab("souvenir", "纪念品")}${renderTab("history", "记录")}</nav>
            <div class="tab-body">${renderAtlasView(destination, mapView)}</div>
          </section>
        </div>
      </details>
    </section>
  `;
}

function renderAtlasTravelActions(activeTravel, anyActiveTravel, destination) {
  if (activeTravel?.status === "traveling") {
    return `<button class="launch-button" data-action="summon">召回桌宠</button>`;
  }
  if (activeTravel?.status === "recalled") {
    return `<button class="launch-button" data-action="continue">继续旅行</button>`;
  }
  if ((anyActiveTravel?.phase ?? 1) === 1 && anyActiveTravel?.status === "traveling") {
    const currentTheme = getThemeFromDb(anyActiveTravel.themeId);
    return `<div class="current-trip-notice">当前正在旅行：${currentTheme.name}。需要先召回这段旅程，才能开始真实旅行。</div><button class="launch-button" data-action="summon">先召回当前旅程</button>`;
  }
  if ((anyActiveTravel?.phase ?? 1) === 2 && anyActiveTravel?.status === "traveling") {
    return `<div class="current-trip-notice">当前正在探索${getAtlasDestination(anyActiveTravel.destinationId).name}。</div><button class="launch-button" data-action="summon">先召回当前旅程</button>`;
  }
  if ((anyActiveTravel?.phase ?? 1) === 2 && anyActiveTravel?.status === "recalled") {
    return `<div class="current-trip-notice">已召回的旅程来自${getAtlasDestination(anyActiveTravel.destinationId).name}。</div><button class="launch-button" data-action="switch-atlas" data-landmark-id="${destination.id}">切换景点并重新出发</button>`;
  }
  return `<button class="launch-button" data-action="start-atlas">开始真实旅行</button>`;
}

function renderAtlasUtilityPanel(activeTravel) {
  return `
    <section class="utility-panel">
      <div class="utility-actions">
        <button data-action="summon" ${activeTravel?.status === "traveling" ? "" : "disabled"}>召回桌宠</button>
        <button data-action="continue" ${activeTravel?.status === "recalled" ? "" : "disabled"}>继续旅行</button>
        <button data-action="cycle-atlas" ${activeTravel?.status === "traveling" ? "disabled" : ""}>更换景点</button>
      </div>
    </section>
  `;
}

function renderAtlasView(destination, mapView) {
  const scope = { mode: "destination", phase: 2, destinationId: destination.id };
  if (activeView === "album") return renderAlbum(scope);
  if (activeView === "souvenir") return renderSouvenirs(scope);
  if (activeView === "history") return renderHistory(scope);
  const completedScenes = destination.scenes.slice(0, mapView.coloredSegmentIds.length);
  const imageWorldSubscenes = globalThis.IMAGE_WORLD_SCENES?.scenes?.[destination.id]?.subScenes ?? [];
  if (completedScenes.length === 0) {
    return `<div class="empty-state"><h3>真实景点还没点亮</h3><p>完成第一个 60 分钟路段后，子场景会出现在这里。</p></div>`;
  }
  return `<div class="scene-list">${completedScenes.map((scene, index) => {
    const imageWorldScene = imageWorldSubscenes[index];
    const imageAsset = imageWorldScene?.imageSrc
      ? resolveAtlasAssetUrl(imageWorldScene.imageSrc)
      : scene.imageAsset;
    return `
      <article class="scene-card">
        <img class="scene-image" src="${imageAsset}" alt="${scene.name}" />
        <strong>${scene.name}</strong>
        <p>${imageWorldScene?.copy ?? scene.visual}</p>
      </article>
    `;
  }).join("")}</div>`;
}

function getAtlasMapView(destination) {
  const activeTravel = getVisibleTravel();
  if ((activeTravel?.phase ?? 1) === 2 && activeTravel.destinationId === destination.id) {
    return getRuntimeTravelView(activeTravel);
  }
  const saved = state.atlasProgress[destination.id];
  return {
    accumulatedTravelMinutes: saved ? (saved.progressPercent / 100) * FULL_TRAVEL_MINUTES : 0,
    remainingMinutes: saved?.isFullyColored ? 0 : FULL_TRAVEL_MINUTES,
    progressPercent: saved?.progressPercent ?? 0,
    coloredSegmentIds: saved?.coloredSegmentIds ?? [],
    completedSpotCount: saved?.coloredSegmentIds?.length ?? 0,
    totalSpotCount: destination.mapSegments.length,
    minimumSpotMinutes: destination.mapSegments[0]?.unlockMinute ?? FULL_TRAVEL_MINUTES,
    isFullCycle: Boolean(saved?.isFullyColored)
  };
}

function atlasDestinationStyle(destination) {
  return `--atlas-a:${destination.palette[0]};--atlas-b:${destination.palette[1]};--atlas-c:${destination.palette[2]};`;
}

function renderThemeMapNode(theme, activeTravel, index = 0) {
  const point = getThemeMapPoint(theme.id);
  const unlocked = isThemeUnlocked(theme);
  const progress = state.themeProgress[theme.id]?.progressPercent ?? 0;
  const isSelected = state.selectedThemeId === theme.id;
  const isActiveTravel = activeTravel?.themeId === theme.id;
  const isComplete = Boolean(state.themeProgress[theme.id]?.isFullyColored);
  const classNames = [
    "phase1-map-node",
    unlocked ? "unlocked" : "locked",
    isSelected ? "selected" : "",
    isActiveTravel ? "active-travel" : "",
    progress <= 0 && !isComplete ? "unlit" : "",
    isComplete ? "complete" : ""
  ].filter(Boolean).join(" ");
  return `
    <button
      class="${classNames}"
      style="${themePanelStyle(theme)}--x:${point.x}%;--y:${point.y}%;--node-order:${index};"
      data-action="select-theme"
      data-theme-id="${theme.id}"
      ${unlocked ? "" : "disabled"}
      aria-label="${unlocked ? `${theme.name}，已点亮 ${Math.round(progress)}%` : `${theme.name}，待解锁`}"
      title="${unlocked ? `${theme.name} · ${Math.round(progress)}%` : `${theme.name}待解锁`}"
    >
      <span class="map-node-pin" aria-hidden="true"></span>
      <span class="map-node-copy">
        <span class="map-node-name">${theme.name}</span>
        <small data-map-node-progress>${isComplete ? "已通关" : `${Math.round(progress)}%`}</small>
      </span>
    </button>
  `;
}

function getThemeMapPoint(themeId) {
  return themeMapPoints.find(point => point.id === themeId) ?? { x: 50, y: 50 };
}

function themePanelStyle(theme) {
  return `--a:${theme.palette[0]};--b:${theme.palette[1]};--c:${theme.palette[2]};--d:${theme.palette[3]};`;
}

function renderThemeButton(theme) {
  const unlocked = isThemeUnlocked(theme);
  const selected = state.selectedThemeId === theme.id;
  const progress = state.themeProgress[theme.id]?.progressPercent ?? 0;
  return `
    <button class="theme-button ${selected ? "selected" : ""}" data-theme-id="${theme.id}" ${unlocked ? "" : "disabled"}>
      <span class="theme-code">${theme.id}</span>
      <span>
        <strong>${theme.name}</strong>
        <small>${unlocked ? `${Math.round(progress)}%` : "待解锁"}</small>
      </span>
    </button>
  `;
}

function renderAtlasHomeButton(destination) {
  const selected = state.selectedAtlasLandmarkId === destination.id;
  const progress = state.atlasProgress[destination.id]?.progressPercent ?? 0;
  return `
    <button class="theme-button ${selected ? "selected" : ""}" data-action="select-home-atlas" data-landmark-id="${destination.id}">
      <span class="theme-code">Q${String(atlasDestinations.indexOf(destination) + 1).padStart(2, "0")}</span>
      <span>
        <strong>${destination.name}</strong>
        <small>${Math.round(progress)}% · ${destination.country}</small>
      </span>
    </button>
  `;
}

function renderDesktopControls() {
  if (!desktopState.isDesktop) return "";
  return `
    <span class="desktop-badge">桌面模式</span>
    <button class="icon-button" data-action="desktop-toggle-top" title="切换窗口置顶">${desktopState.isAlwaysOnTop ? "取消置顶" : "置顶"}</button>
    <button class="icon-button" data-action="desktop-toggle-window" title="收起为轻量桌宠">桌宠模式</button>
  `;
}

function renderHomePet(activeTravel, statusText, pet) {
  const status = getPetVisualState(activeTravel);
  const petLine = getPetStateLine(status);
  const weatherMeta = getPetWeatherMeta(status);
  const petAsset = getPetAssetForWeatherState(pet, status, weatherMeta?.assetId);
  const weatherClass = weatherMeta ? `weather-${weatherMeta.assetId}` : "weather-fallback";
  return `
    <section class="pet-intro ${status} ${weatherClass}" data-pet-weather="${weatherMeta?.assetId ?? "fallback"}">
      <div class="home-pet" aria-hidden="true">
        <img class="home-pet-image" src="${petAsset}" alt="" draggable="false" />
      </div>
      <div class="pet-copy">
        <p class="eyebrow" data-live-travel-status>${statusText}</p>
        <h1>今天让它替你出门。</h1>
        <p>${petLine}</p>
      </div>
    </section>
  `;
}

function getHomeRecommendationLabel(destination, mapView, activeTravel, phase) {
  const activeDestinationId = activeTravel?.destinationId ?? activeTravel?.themeId;
  if (["traveling", "recalled"].includes(activeTravel?.status) && activeDestinationId === destination.id) {
    return "当前旅程";
  }
  if (mapView.isFullCycle || mapView.progressPercent >= 100) return "100% 已记录";
  if (mapView.progressPercent > 0) return `${Math.round(mapView.progressPercent)}% 已记录`;
  return phase === 2 ? "待探索" : "待出发";
}

function renderTodayCard(homeContext, activeTravel, selectedPet) {
  if (homeContext.phase === 2) return renderAtlasTodayCard(homeContext, activeTravel, selectedPet);
  return renderPhase1TodayCard(homeContext, activeTravel, selectedPet);
}

function renderPhase1TodayCard(homeContext, activeTravel, selectedPet) {
  const theme = homeContext.destination;
  const mapView = homeContext.mapView;
  const renderContent = resolveThemeRenderContent(theme.id);
  const palette = theme.palette;
  const sceneIndex = Math.max(0, Math.min(renderContent.scenes.length - 1, mapView.completedSpotCount - 1));
  const currentScene = renderContent.scenes[sceneIndex] ?? renderContent.scenes[0];
  const hasThemeImage = Boolean(renderContent.mapAssets.color && renderContent.mapAssets.gray);
  const mapStyle = `--c1:${palette[0]};--c2:${palette[1]};--c3:${palette[2]};--paper:${palette[3]};`;
  const routeChoices = homeContext.recommendations;
  const petStatus = getPetVisualState(activeTravel);
  const petWeather = getPetWeatherMeta(petStatus);
  const petAsset = getPetAssetForWeatherState(selectedPet, petStatus, petWeather?.assetId);
  return `
    <article class="today-card" style="${mapStyle}">
      ${currentScene?.imageUrl ? `
        <figure class="today-scene">
          <img src="${currentScene.imageUrl}" alt="${theme.name} · ${currentScene.name}" />
          <figcaption class="today-scene-copy">
            <span>今日推荐 · 路线 ${theme.id}</span>
            <h2>${theme.name}</h2>
            <strong>${theme.motif} · ${currentScene.message}</strong>
          </figcaption>
          <img class="today-route-seal" src="./assets/souvenirs/compass-wax-seal.png" alt="" aria-hidden="true" />
        </figure>
      ` : ""}
      <div class="today-pet-note" aria-label="旅伴状态">
        <figure>
          <img src="${petAsset}" alt="${selectedPet.name}" draggable="false" />
        </figure>
        <div>
          <strong>${selectedPet.name}</strong>
          <span>${getPetStateLine(petStatus)}</span>
        </div>
      </div>

      <section class="route-picker" aria-labelledby="route-picker-title">
        <div class="route-picker-heading">
          <div>
            <h3 id="route-picker-title">选择路线</h3>
          </div>
          <button class="route-map-link" data-action="open-phase1" type="button">查看全部 ${themes.length} 条路线</button>
        </div>
        <div class="route-choice-list">
          ${routeChoices.map(routeTheme => {
            const routeContent = resolveThemeRenderContent(routeTheme.id);
            const routeScene = routeContent.scenes[0];
            const routeProgress = getMapView(routeTheme);
            return `
              <button class="route-choice ${routeTheme.id === theme.id ? "selected" : ""}" data-action="enter-theme" data-theme-id="${routeTheme.id}" type="button">
                ${routeScene?.imageUrl ? `<img src="${routeScene.imageUrl}" alt="" />` : ""}
                <span><strong>${routeTheme.name}</strong><small>${getHomeRecommendationLabel(routeTheme, routeProgress, activeTravel, 1)}</small><em>${formatMinutes(routeProgress.remainingMinutes || FULL_TRAVEL_MINUTES)}</em></span>
              </button>
            `;
          }).join("")}
        </div>
      </section>

      <section class="journey-progress-strip" aria-label="本路线进度" data-live-destination-id="${theme.id}" data-live-phase="1" data-live-segment-count="${mapView.coloredSegmentIds.length}">
        ${hasThemeImage ? `
          <img src="${renderContent.mapAssets.color}" alt="${theme.name}路线图" />
        ` : ""}
        <div>
          <span>本路线记录</span>
          <strong data-live-progress-percent>${Math.round(mapView.progressPercent)}%</strong>
          <small data-live-progress-summary>${mapView.coloredSegmentIds.length}/${theme.mapSegments.length} 个景点 · 剩余 ${formatMinutes(mapView.remainingMinutes)}</small>
        </div>
        <button data-action="open-phase1" type="button">打开地图</button>
      </section>
    </article>
  `;
}

function renderAtlasTodayCard(homeContext, activeTravel, selectedPet) {
  const destination = homeContext.destination;
  const mapView = homeContext.mapView;
  const sceneIndex = Math.max(0, Math.min(destination.scenes.length - 1, mapView.completedSpotCount - 1));
  const currentScene = destination.scenes[sceneIndex] ?? destination.scenes[0];
  if (!currentScene) return "";
  const palette = destination.palette;
  const mapStyle = `--c1:${palette[0]};--c2:${palette[1]};--c3:${palette[2]};--paper:${palette[2]};`;
  const petStatus = getPetVisualState(activeTravel);
  const petWeather = getPetWeatherMeta(petStatus);
  const petAsset = getPetAssetForWeatherState(selectedPet, petStatus, petWeather?.assetId);
  return `
    <article class="today-card atlas-today-card" style="${mapStyle}">
      <figure class="today-scene">
        <img src="${destination.imageAsset}" alt="${destination.name} · ${currentScene.name}" />
        <figcaption class="today-scene-copy">
          <span>今日推荐 · 第二期真实景点</span>
          <h2>${destination.name}</h2>
          <strong>${destination.country} · ${currentScene.message}</strong>
        </figcaption>
        <img class="today-route-seal" src="./assets/souvenirs/compass-wax-seal.png" alt="" aria-hidden="true" />
      </figure>
      <div class="today-pet-note" aria-label="旅伴状态">
        <figure><img src="${petAsset}" alt="${selectedPet.name}" draggable="false" /></figure>
        <div><strong>${selectedPet.name}</strong><span>${getPetStateLine(petStatus)}</span></div>
      </div>

      <section class="route-picker" aria-labelledby="route-picker-title">
        <div class="route-picker-heading">
          <div><span>选择景点</span><h3 id="route-picker-title">选择真实景点</h3></div>
          <button class="route-map-link" data-action="open-atlas" type="button">查看全部 ${atlasDestinations.length} 个真实景点</button>
        </div>
        <div class="route-choice-list">
          ${homeContext.recommendations.map(routeDestination => {
            const routeProgress = getAtlasMapView(routeDestination);
            return `
              <button class="route-choice ${routeDestination.id === destination.id ? "selected" : ""}" data-action="select-home-atlas" data-landmark-id="${routeDestination.id}" type="button">
                <img src="${routeDestination.imageAsset}" alt="" />
                <span><strong>${routeDestination.name}</strong><small>${getHomeRecommendationLabel(routeDestination, routeProgress, activeTravel, 2)}</small><em>${formatMinutes(routeProgress.remainingMinutes || FULL_TRAVEL_MINUTES)}</em></span>
              </button>
            `;
          }).join("")}
        </div>
      </section>

      <section class="journey-progress-strip" aria-label="本景点进度" data-live-destination-id="${destination.id}" data-live-phase="2" data-live-segment-count="${mapView.coloredSegmentIds.length}">
        <img src="${destination.imageAsset}" alt="${destination.name}真实景点预览" />
        <div>
          <span>本景点记录</span>
          <strong data-live-progress-percent>${Math.round(mapView.progressPercent)}%</strong>
          <small data-live-progress-summary>${mapView.coloredSegmentIds.length}/${destination.mapSegments.length} 个子场景 · 剩余 ${formatMinutes(mapView.remainingMinutes)}</small>
        </div>
        <button data-action="open-atlas" type="button">打开地图</button>
      </section>
    </article>
  `;
}

function renderLocalWeatherSummary() {
  const localWeather = state.localWeather;
  if (!state.settings.liveWeatherEnabled || localWeather?.status === "disabled") {
    return `
      <div class="local-weather unavailable" aria-label="实时天气已关闭">
        <span>你所在地天气</span>
        <strong>实时天气已关闭</strong>
        <small>旅行场景仍使用本地模拟天气，可在设置中重新开启</small>
      </div>
    `;
  }
  if (localWeather?.status === "ready" && localWeather.snapshot) {
    const snapshot = localWeather.snapshot;
    const visualClass = snapshot.visual?.cssClass ?? "";
    const locationText = formatWeatherLocation(localWeather.location);
    const temperatureText = formatTemperature(snapshot.temperatureC);
    const detailText = [
      formatTemperature(snapshot.apparentTemperatureC, "体感 "),
      formatWind(snapshot.windSpeedKmh)
    ].filter(Boolean).join(" · ");
    return `
      <div class="local-weather ${visualClass}" aria-label="你所在地天气">
        <span>你所在地天气</span>
        <strong>${escapeHtml(snapshot.label)}${temperatureText ? ` · ${temperatureText}` : ""}</strong>
        <small>${escapeHtml(locationText)}${detailText ? ` · ${escapeHtml(detailText)}` : ""}</small>
      </div>
    `;
  }

  if (localWeather?.status === "failed") {
    return `
      <div class="local-weather unavailable" aria-label="你所在地天气暂不可用">
        <span>你所在地天气</span>
        <strong>真实天气暂不可用</strong>
        <small>桌宠回退普通状态，旅行天气仍使用本地模拟视觉</small>
      </div>
    `;
  }

  return `
    <div class="local-weather loading" aria-label="你所在地天气读取中">
      <span>你所在地天气</span>
      <strong>读取中</strong>
      <small>打开时根据网络位置获取</small>
    </div>
  `;
}

function renderDailyCheckinSummary(phase) {
  const status = getDailyCheckinStatus(state, phase);
  const phaseRule = phase === 2 ? "二期每个子景点 60 分钟" : "一期每个子景点 20 分钟";
  return `
    <div class="daily-checkin-summary" style="--daily-progress:${(status.usedMinutes / DAILY_CHECKIN_LIMIT_MINUTES) * 100}%" aria-label="今日打卡额度">
      <div><span>今日成功打卡</span><strong>${status.usedMinutes} / ${DAILY_CHECKIN_LIMIT_MINUTES} 分钟</strong></div>
      <i aria-hidden="true"></i>
      <small>${phaseRule} · 剩余 ${status.remainingMinutes} 分钟</small>
    </div>
  `;
}

function renderAtlasUnlockSummary(completion) {
  const progress = completion.requiredThemeCount > 0
    ? (completion.completedThemeCount / completion.requiredThemeCount) * 100
    : 0;
  return `
    <div class="daily-checkin-summary atlas-unlock-summary" style="--daily-progress:${progress}%" aria-label="二期解锁进度">
      <div><span>二期解锁进度</span><strong>${completion.completedThemeCount} / ${completion.requiredThemeCount} 条</strong></div>
      <i aria-hidden="true"></i>
      <small>完成第一期全部路线后自动开启</small>
    </div>
  `;
}

function renderDailyCheckinBadge(phase) {
  const status = getDailyCheckinStatus(state, phase);
  return `<span class="daily-checkin-badge" title="一期每格 20 分钟，二期每格 60 分钟">今日 ${status.usedMinutes}/${DAILY_CHECKIN_LIMIT_MINUTES}</span>`;
}

function renderJourneyOverlay() {
  if (phase2UnlockCelebrationOpen) return renderPhase2UnlockCelebration();
  return renderDailyRestDialog();
}

function renderPhase2UnlockCelebration() {
  const summary = getPhase1MilestoneSummary(state);
  const selectedPet = getSelectedPet();
  const todayIsComplete = state.dailyCheckin?.usedMinutes >= DAILY_CHECKIN_LIMIT_MINUTES;
  return `
    <div class="phase2-unlock-backdrop" role="presentation">
      <section
        class="phase2-unlock-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="phase2-unlock-title"
        aria-describedby="phase2-unlock-copy"
      >
        <figure class="phase2-unlock-map" aria-label="即将展开的真实世界地图">
          <img src="./assets/maps/world-map-journal-v2.webp" alt="" draggable="false" />
          <div class="phase2-unlock-map-cover" aria-hidden="true">
            <div class="phase2-unlock-complete-badge">一期<br />完成</div>
            <span>第一期</span>
            <strong>远方路线</strong>
            <small>15 / 15 · COMPLETE</small>
          </div>
          <figcaption>
            <span>第二期</span>
            <strong>真实世界</strong>
            <small>REAL WORLD · 15 LANDMARKS</small>
          </figcaption>
          <img class="phase2-unlock-pet" src="${selectedPet.asset}" alt="${selectedPet.name}" draggable="false" />
        </figure>

        <div class="phase2-unlock-story">
          <p class="phase2-unlock-kicker">第一期完成 · 地图册换章</p>
          <h2 id="phase2-unlock-title">你们一起，把想象中的远方走完了。</h2>
          <p id="phase2-unlock-copy" class="phase2-unlock-days">
            这是你和 Itsees 在一起的第 <strong>${summary.togetherDays}</strong> 天。
          </p>
          <dl class="phase2-unlock-stats" aria-label="第一期同行记录">
            <div style="--milestone-order:0"><dt>${summary.themeCount}</dt><dd>个虚拟主题</dd></div>
            <div style="--milestone-order:1"><dt>${summary.postcardCount}</dt><dd>张明信片</dd></div>
            <div style="--milestone-order:2"><dt>${summary.souvenirCount}</dt><dd>件纪念品</dd></div>
          </dl>
          <blockquote>
            从下一页开始，远方不再只是想象。<br />Itsees 会走进真实世界，把每一段风景寄回给你。
          </blockquote>
          <p class="phase2-unlock-rest-note">
            ${todayIsComplete ? "今天的脚步已经走满，真实世界会在这里等你。" : "新的十五处真实景点，已经在地图上等你。"}
          </p>
          <div class="phase2-unlock-actions">
            <button class="launch-button" data-action="enter-phase2-unlock" type="button">展开真实世界地图</button>
            <button class="text-button" data-action="dismiss-phase2-unlock" type="button">先收好这张车票</button>
          </div>
        </div>
      </section>
    </div>
  `;
}

function renderDailyRestDialog() {
  const daily = state.dailyCheckin;
  if (!daily?.noticePending) return "";
  const remaining = Math.max(0, DAILY_CHECKIN_LIMIT_MINUTES - daily.usedMinutes);
  const isInsufficient = daily.noticeReason === "insufficient_phase_budget";
  const phase = daily.noticePhase === 2 ? 2 : 1;
  const message = isInsufficient
    ? {
        title: "这段远行今天来不及啦",
        body: phase === 2
          ? `二期子景点需要完整 60 分钟，今天只剩 ${remaining} 分钟。剩余额度仍可用于一期的小旅行。`
          : `一期子景点需要完整 20 分钟，今天只剩 ${remaining} 分钟。让桌宠先回家休息吧。`
      }
    : getDailyRestMessage(daily.noticeMessageId);
  return `
    <div class="daily-rest-backdrop" role="presentation">
      <section class="daily-rest-dialog" role="dialog" aria-modal="true" aria-labelledby="daily-rest-title">
        <p class="eyebrow">今日旅行</p>
        <h2 id="daily-rest-title">${message.title}</h2>
        <p>${message.body}</p>
        <div class="daily-rest-total">
          <span>成功打卡</span>
          <strong>${daily.usedMinutes} / ${DAILY_CHECKIN_LIMIT_MINUTES} 分钟</strong>
        </div>
        <button class="launch-button" data-action="dismiss-daily-rest" type="button">好，先回家</button>
      </section>
    </div>
  `;
}

function formatWeatherLocation(location) {
  const city = location?.city?.trim();
  const region = location?.region?.trim();
  const country = location?.country?.trim();
  const parts = [];
  if (city) parts.push(city);
  if (region && region !== city) parts.push(region);
  if (country && country !== region && country !== city) parts.push(country);
  return parts.slice(0, 2).join("，") || "当前位置";
}

function formatTemperature(value, prefix = "") {
  return Number.isFinite(value) ? `${prefix}${Math.round(value)}°C` : "";
}

function formatWind(value) {
  return Number.isFinite(value) ? `风速 ${Math.round(value)}km/h` : "";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    };
    return entities[char];
  });
}

function getHomePrimaryAction(activeTravel, destinationId = state.selectedThemeId) {
  if (activeTravel?.status === "traveling") {
    return { action: "summon", label: "召回桌宠" };
  }
  if (activeTravel?.status === "recalled") {
    if ((activeTravel.destinationId ?? activeTravel.themeId) !== destinationId) {
      return { action: "switch", label: "切换路线并重新出发" };
    }
    return { action: "continue", label: "继续旅行" };
  }
  return { action: "start", label: "出发旅行" };
}

function renderUtilityPanel(activeTravel, phase = 1) {
  const canSummon = activeTravel?.status === "traveling";
  const canContinue = activeTravel?.status === "recalled";
  if (!canSummon && !canContinue) return "";
  return `
    <section class="utility-panel">
      <p class="eyebrow">旅程管理</p>
      <div class="utility-actions">
        ${canSummon ? `<button data-action="summon">提前召回</button>` : ""}
        ${canContinue ? `<button data-action="continue">继续旅行</button><button data-action="${phase === 2 ? "switch-atlas" : "switch"}">${phase === 2 ? "更换景点重开" : "换路线重开"}</button>` : ""}
      </div>
    </section>
  `;
}

function getSegmentClipPath(index, columns, rows) {
  const col = index % columns;
  const row = Math.floor(index / columns);
  const x0 = (col / columns) * 100;
  const x1 = ((col + 1) / columns) * 100;
  const y0 = (row / rows) * 100;
  const y1 = ((row + 1) / rows) * 100;
  return `polygon(${x0}% ${y0}%, ${x1}% ${y0}%, ${x1}% ${y1}%, ${x0}% ${y1}%)`;
}

function renderPackPanel(activeTravel, destination, mapView, options = {}) {
  const phase = options.phase === 2 ? 2 : 1;
  const normalizedItemIds = normalizePackSelection(state, state.selectedItemIds);
  const selectedItems = normalizedItemIds
    .map(itemId => inventoryItems.find(item => item.id === itemId))
    .filter(Boolean);
  const unlockedCount = inventoryItems.filter(item => getInventoryUnlockState(item, state).isUnlocked).length;
  const rewardSummary = getPackRewardSummary(normalizedItemIds);
  const itemGroups = ["food", "tool"].map(type => `
    <fieldset class="item-group">
      <legend><span>${type === "food" ? "实物" : "道具"}</span><small>选择 1 件</small></legend>
      <div class="pack-item-grid">
        ${inventoryItems.filter(item => item.type === type).map(item => {
          const unlock = getInventoryUnlockState(item, state);
          const selected = normalizedItemIds.includes(item.id);
          return `
            <label class="pack-item ${selected ? "selected" : ""} ${unlock.isUnlocked ? "" : "locked"}">
              <input
                type="radio"
                name="pack-${type}"
                value="${item.id}"
                ${selected ? "checked" : ""}
                ${unlock.isUnlocked ? "" : "disabled"}
              />
              <span class="pack-item-symbol" aria-hidden="true"><img src="${getPackItemAsset(item)}" alt="" decoding="async" /></span>
              <span class="pack-item-copy">
                <strong>${item.name}</strong>
                <small>${unlock.isUnlocked ? item.effect : unlock.label}</small>
              </span>
              <span class="pack-item-state">${selected ? "已装入" : unlock.isUnlocked ? "可选择" : "未解锁"}</span>
            </label>
          `;
        }).join("")}
      </div>
    </fieldset>
  `).join("");

  return `
    <section class="pack-panel">
      <div class="pack-heading">
        <div>
          <p class="eyebrow">旅行包</p>
          <h3>旅行包 ${normalizedItemIds.length} / 2</h3>
        </div>
        <span>已准备</span>
      </div>
      <p class="pack-guidance">每类限带一件。装备会影响明信片风格与纪念品收获。</p>
      <div class="pack-ready-list">
        ${selectedItems.map(item => `
          <article class="pack-ready-item">
            <img src="${getPackItemAsset(item)}" alt="${item.name}" />
            <div><strong>${item.name}</strong><span>${item.effect}</span></div>
            <small>已装入</small>
          </article>
        `).join("")}
      </div>
      <details class="pack-library" ${packLibraryOpen ? "open" : ""}>
        <summary>更换行囊 <span>图鉴 ${unlockedCount}/${inventoryItems.length}</span></summary>
        <div class="items">${itemGroups}</div>
      </details>
      <aside class="pack-effect-card ${rewardSummary.hasSouvenirBonus ? "is-boosted" : ""}">
        <img class="pack-effect-stamp" src="./assets/souvenirs/compass-wax-seal.png" alt="" aria-hidden="true" />
        <div>
          <p class="eyebrow">纪念品好运</p>
          <strong>${rewardSummary.hasSouvenirBonus ? "本次已激活稀有加成" : "完整旅程会提高珍稀机会"}</strong>
          ${rewardSummary.hasSouvenirBonus
            ? `<p class="pack-rare-note">珍稀纪念品机会提升，并有机会额外带回 1 件。</p>`
            : `<p class="pack-rare-note muted">选择糖果或手账本，可进一步提高珍稀纪念品机会。</p>`}
        </div>
      </aside>
      <div class="expected-return">
        <span>完整旅程预计带回</span>
        <strong>${phase === 2 ? 4 : 12} 张明信片　2–3 件纪念品</strong>
        <small>${destination.name} · ${formatMinutes(mapView.remainingMinutes || FULL_TRAVEL_MINUTES)} · ${selectedItems.map(item => item.name).join(" + ")}</small>
      </div>
      ${(() => {
        const action = phase === 2
          ? activeTravel?.status === "traveling"
            ? { action: "summon" }
            : activeTravel?.status === "recalled"
              ? (activeTravel.destinationId === destination.id
                  ? { action: "continue" }
                  : { action: "switch-atlas" })
              : { action: "start-atlas" }
          : getHomePrimaryAction(activeTravel, destination.id);
        const label = action.action === "summon"
          ? `提前召回${getSelectedPet().name}`
          : action.action === "continue"
            ? `让${getSelectedPet().name}继续旅行`
            : ["switch", "switch-atlas"].includes(action.action)
              ? "切换路线并重新出发"
              : `让${getSelectedPet().name}出发`;
        return `<button class="launch-button ticket-launch" data-action="${action.action}" ${action.disabled ? "disabled" : ""}>${label}</button>`;
      })()}
      <p class="journey-duration">旅程时长：${FULL_TRAVEL_MINUTES} 分钟</p>
      <button class="route-ticket-link" data-action="${phase === 2 ? "open-atlas" : "open-phase1"}" type="button">
        <span>${phase === 2 ? `查看全部 ${atlasDestinations.length} 个真实景点` : `查看全部 ${themes.length} 条路线`}</span><small>${phase === 2 ? "返回真实世界地图" : "在地图中查看点亮进度"}</small>
      </button>
    </section>
  `;
}

function getPackItemAsset(item) {
  return item.asset;
}

function renderTab(id, label) {
  return `<button class="${activeView === id ? "active" : ""}" data-tab="${id}">${label}</button>`;
}

function renderView(theme, mapView) {
  const scope = { mode: "destination", phase: 1, destinationId: theme.id };
  if (activeView === "album") return renderAlbum(scope);
  if (activeView === "souvenir") return renderSouvenirs(scope);
  if (activeView === "history") return renderHistory(scope);
  return renderTravelBrief(theme, mapView);
}

function renderTravelBrief(theme, mapView) {
  const completedSceneCount = Math.min(mapView.coloredSegmentIds.length, theme.scenes.length);
  const scenes = resolveThemeRenderContent(theme.id).scenes.slice(0, completedSceneCount);
  if (scenes.length === 0) {
    return `<div class="empty-state"><h3>还没拍到景点照片</h3><p>完成第一个景点后，这里会出现对应的旅行照片。</p></div>`;
  }
  return `
    <div class="brief">
      <h3>${theme.name}已完成景点照片</h3>
      <div class="scene-list">
        ${scenes.map(scene => `
          <article class="scene-card">
            ${scene.imageUrl ? `<img class="scene-image" src="${scene.imageUrl}" alt="${scene.name}" loading="lazy" decoding="async" />` : ""}
            <strong>${scene.name}</strong>
            <p>${scene.visual}</p>
          </article>
        `).join("")}
      </div>
    </div>
  `;
}

function renderGroupedAlbum(queryResult = null) {
  const result = queryResult ?? queryCollection(state.album, { kind: "album", pageSize: 10000 });
  if (result.items.length === 0) {
    return `<div class="empty-state"><h3>相册还空着</h3><p>让桌宠出门一次，它会带回第一张明信片。</p></div>`;
  }
  const groups = groupPostcardsByDestination(result.items);
  if (!openMineDestinationId || !groups.some(group => group.destinationId === openMineDestinationId)) {
    openMineDestinationId = groups[0]?.destinationId ?? null;
  }
  const visibleGroups = mineFilters.destinationId === "all"
    ? groups
    : groups.filter(group => group.destinationId === mineFilters.destinationId);
  return `
    ${renderMineThemeJumpbar(visibleGroups)}
    <div class="mine-theme-groups">
      ${visibleGroups.map(group => renderMineThemeGroup(group, result.total)).join("")}
    </div>
  `;
}

function renderMineThemeJumpbar(groups) {
  if (groups.length <= 1) return "";
  return `
    <nav class="mine-theme-jumpbar" aria-label="快速跳转到已归档路线">
      <div class="mine-theme-jumpbar-title">
        <span>ROUTE INDEX</span>
        <strong>快速翻到路线</strong>
      </div>
      <div class="mine-theme-jumpbar-scroll" role="list">
        ${groups.map(group => {
          const meta = getMineDestinationMeta(group);
          const active = openMineDestinationId === group.destinationId;
          return `
            <button
              class="mine-theme-jump ${active ? "active" : ""}"
              data-action="jump-mine-destination"
              data-destination-id="${escapeHtml(group.destinationId)}"
              type="button"
              role="listitem"
              aria-label="跳到${escapeHtml(meta.name)}，${group.cards.length}张明信片"
            >
              <span>${meta.name}</span>
              <small>${group.cards.length} 张</small>
            </button>
          `;
        }).join("")}
      </div>
    </nav>
  `;
}

function groupPostcardsByDestination(cards) {
  const groups = new Map();
  cards.forEach(card => {
    const phase = Number(card.phase ?? 1);
    const destinationId = getCollectionDestinationId(card);
    if (!destinationId) return;
    if (!groups.has(destinationId)) {
      groups.set(destinationId, {
        destinationId,
        phase,
        destination: phase === 2 ? getAtlasDestination(destinationId) : getThemeFromDb(destinationId),
        cards: []
      });
    }
    groups.get(destinationId).cards.push(card);
  });
  return [...groups.values()].sort((left, right) => {
    const leftTime = new Date(left.cards[0]?.createdAt ?? 0).getTime();
    const rightTime = new Date(right.cards[0]?.createdAt ?? 0).getTime();
    return rightTime - leftTime;
  });
}

function renderMineThemeGroup(group, serialTotal) {
  const meta = getMineDestinationMeta(group);
  const english = getLocale() === "en";
  const localizedName = translateText(meta.name);
  const routePreviewDescription = english
    ? `${translateText(meta.phaseLabel)} · Route completion ${Math.round(meta.progressPercent)}%`
    : `${meta.phaseLabel} · 路线完成度 ${Math.round(meta.progressPercent)}%`;
  const sceneGroups = groupPostcardsByScene(group);
  const currentSceneId = getSelectedMineSceneId(group, sceneGroups);
  const selectedScene = sceneGroups.find(sceneGroup => sceneGroup.sceneId === currentSceneId) ?? sceneGroups[0];
  return `
    <article class="mine-theme-group is-open" id="mine-destination-${escapeHtml(group.destinationId)}" style="${meta.style}">
      <div class="mine-theme-expanded">
        <aside class="mine-route-panel" aria-label="${meta.name} · 路线总览">
          <button
            class="mine-route-hero image-preview-trigger"
            data-action="open-image-preview"
            data-preview-id="route-hero-${group.destinationId}"
            data-preview-src="${escapeHtml(meta.coverColor)}"
            data-preview-title="${escapeHtml(localizedName)}"
            data-preview-description="${escapeHtml(routePreviewDescription)}"
            type="button"
            aria-label="${escapeHtml(english ? `View ${localizedName} route art full-screen` : `全屏查看${meta.name}路线主题图`)}"
          >
            <span class="mine-theme-cover" style="--lit:${meta.progressPercent}%;--segment-count:${meta.segments.length};">
              <img class="mine-theme-cover-gray" src="${meta.coverGray}" alt="" loading="lazy" decoding="async" />
              <img class="mine-theme-cover-color" src="${meta.coverColor}" alt="" loading="lazy" decoding="async" />
              <span class="mine-theme-segment-strip" aria-hidden="true">
                ${meta.segments.map(segment => `<i class="${meta.coloredSegmentIds.includes(segment.id) ? "complete" : ""}"></i>`).join("")}
              </span>
            </span>
          </button>
          <div class="mine-route-copy">
            <small>${meta.phaseLabel}</small>
            <strong>${meta.name}</strong>
            <p>${group.cards.length} 张明信片已经归档。点击路线图或明信片图片可全屏查看。</p>
          </div>
        </aside>
        <section class="mine-postcard-panel" aria-label="${getLocale() === "en" ? `${translateText(meta.name)} · Scene postcards` : `${meta.name} · 子场景明信片`}">
          <div class="mine-scene-tabs-wrap">
            <span class="mine-scene-scroll-hint">横向滑动查看子场景</span>
            <nav class="mine-scene-tabs" aria-label="${getLocale() === "en" ? `${translateText(meta.name)} · Checked-in postcards` : `${meta.name} · 已打卡明信片`}">
              ${sceneGroups.map(sceneGroup => `
                <button
                  class="${sceneGroup.sceneId === currentSceneId ? "active" : ""}"
                  data-action="select-mine-scene"
                  data-destination-id="${group.destinationId}"
                  data-scene-id="${sceneGroup.sceneId}"
                  type="button"
                >
                  <span>${sceneGroup.sceneName}</span>
                  <small>${sceneGroup.cards.length} 张</small>
                </button>
              `).join("")}
            </nav>
          </div>
          <div class="mine-scene-postcards">
            ${selectedScene?.cards.length
              ? renderPostcardList(selectedScene.cards, serialTotal)
              : `<div class="empty-state"><h3>还没有明信片</h3><p>完成有效打卡后会出现在这里。</p></div>`}
          </div>
        </section>
      </div>
    </article>
  `;
}

function getMineDestinationMeta(group) {
  if (group.phase === 2) {
    const mapView = getAtlasMapView(group.destination);
    return {
      name: group.destination.name,
      phaseLabel: "二期 · 真实世界",
      progressPercent: mapView.progressPercent,
      coloredSegmentIds: mapView.coloredSegmentIds,
      segments: group.destination.mapSegments,
      coverColor: group.destination.imageAsset,
      coverGray: group.destination.imageAsset,
      style: atlasDestinationStyle(group.destination)
    };
  }
  const renderContent = resolveThemeRenderContent(group.destination.id);
  const mapView = getMapView(group.destination);
  return {
    name: group.destination.name,
    phaseLabel: "一期 · 远方路线",
    progressPercent: mapView.progressPercent,
    coloredSegmentIds: mapView.coloredSegmentIds,
    segments: group.destination.mapSegments,
    coverColor: renderContent.mapAssets.color,
    coverGray: renderContent.mapAssets.gray,
    style: themePanelStyle(group.destination)
  };
}

function groupPostcardsByScene(group) {
  const cardsByScene = new Map();
  group.cards.forEach(card => {
    const sceneId = card.sceneId ?? "unknown";
    if (!cardsByScene.has(sceneId)) cardsByScene.set(sceneId, []);
    cardsByScene.get(sceneId).push(card);
  });
  const destinationScenes = group.destination.scenes ?? [];
  const sceneOrder = new Map(destinationScenes.map((scene, index) => [scene.id, index]));
  const sceneById = new Map(destinationScenes.map(scene => [scene.id, scene]));
  return [...cardsByScene.entries()].map(([sceneId, cards]) => ({
    sceneId,
    sceneName: sceneById.get(sceneId)?.name ?? cards[0]?.sceneName ?? "未命名明信片",
    cards
  })).sort((left, right) => {
    const orderDiff = (sceneOrder.get(left.sceneId) ?? 999) - (sceneOrder.get(right.sceneId) ?? 999);
    if (orderDiff !== 0) return orderDiff;
    return new Date(right.cards[0]?.createdAt ?? 0).getTime() - new Date(left.cards[0]?.createdAt ?? 0).getTime();
  });
}

function getMineSceneMeta(group, sceneId) {
  if (!sceneId) return null;
  if (group.phase === 2) return group.destination.scenes?.find(scene => scene.id === sceneId) ?? null;
  const renderContent = resolveThemeRenderContent(group.destination.id);
  return renderContent.scenes.find(scene => scene.id === sceneId) ?? getSceneFromDb(group.destination.id, sceneId);
}

function getSelectedMineSceneId(group, sceneGroups) {
  if (sceneGroups.length === 0) return null;
  const selectedSceneId = mineSceneSelection[group.destinationId];
  if (sceneGroups.some(sceneGroup => sceneGroup.sceneId === selectedSceneId)) return selectedSceneId;
  const fallback = (sceneGroups.find(sceneGroup => sceneGroup.cards.length > 0) ?? sceneGroups[0]).sceneId;
  mineSceneSelection = { ...mineSceneSelection, [group.destinationId]: fallback };
  return fallback;
}

function renderAlbum(scope = { mode: "all" }, queryResult = null) {
  const result = queryResult ?? queryCollection(state.album, { kind: "album", scope, pageSize: 10000 });
  if (result.items.length === 0) {
    return `<div class="empty-state"><h3>相册还空着</h3><p>让桌宠出门一次，它会带回第一张明信片。</p></div>`;
  }
  return renderPostcardList(result.items, result.total);
}

function renderPostcardList(cards, serialTotal, options = {}) {
  return `
    <div class="postcard-list">
      ${cards.map((card, index) => {
        const isAtlasCard = (card.phase ?? 1) === 2;
        const destination = isAtlasCard ? getAtlasDestination(card.landmarkId) : getThemeFromDb(card.themeId);
        const scene = isAtlasCard
          ? destination.scenes.find(item => item.id === card.sceneId)
          : getSceneFromDb(card.themeId, card.sceneId);
        const imageAsset = resolveOptimizedAssetUrl(scene?.imageAsset);
        const displaySceneName = scene?.name ?? card.sceneName ?? "未命名场景";
        const accent = isAtlasCard ? destination.palette[1] : destination.palette[2];
        const soft = isAtlasCard ? destination.palette[2] : destination.palette[3];
        const decorations = Array.isArray(card.decorations) ? card.decorations : [];
        const isEditing = editingPostcardId === card.id;
        const isHighlighted = options.highlightedSceneId && card.sceneId === options.highlightedSceneId;
        return `
          <article class="postcard travel-journal-card ${isEditing ? "is-editing" : ""} ${isHighlighted ? "is-scene-highlighted" : ""}" data-scene-id="${escapeHtml(card.sceneId ?? "")}" style="--accent:${accent};--soft:${soft};--card-order:${index};--card-tilt:${index % 3 === 0 ? "-0.35deg" : index % 3 === 1 ? "0.28deg" : "-0.12deg"};">
            <div class="postcard-stage ${isEditing ? "is-editing" : ""}" data-postcard-stage data-postcard-id="${escapeHtml(card.id)}">
              ${imageAsset
                ? isAtlasCard
                  ? renderAtlasPostcardWorld({ imageUrl: imageAsset, alt: displaySceneName })
                  : `<img class="postcard-image" src="${escapeHtml(imageAsset)}" alt="${escapeHtml(displaySceneName)}" loading="lazy" decoding="async" draggable="false" />`
                : ""}
              ${imageAsset ? `
                <button
                  class="image-preview-hotspot postcard-preview-hotspot"
                  data-action="open-image-preview"
                  data-preview-id="postcard-${escapeHtml(card.id)}"
                  data-preview-src="${escapeHtml(imageAsset)}"
                  data-preview-title="${escapeHtml(translateText(card.title))}"
                  data-preview-description="${escapeHtml(translateText(card.message))}"
                  data-preview-phase="${isAtlasCard ? "2" : "1"}"
                  type="button"
                  aria-label="${escapeHtml(getLocale() === "en" ? `View ${translateText(card.title)} full-screen` : `全屏查看${card.title}`)}"
                ></button>
              ` : ""}
              <div class="postcard-decoration-layer" aria-label="${escapeHtml(card.title)}的纪念品装饰">
                ${decorations.map(decoration => renderPostcardDecoration(decoration, isEditing)).join("")}
              </div>
              <span class="postcard-flight-path" aria-hidden="true"></span>
              <span class="postcard-postmark" aria-hidden="true">ITSEES<br />${isAtlasCard ? "ATLAS" : escapeHtml(card.themeId)}</span>
            </div>
            <header class="postcard-heading">
              <div>
                <span class="postcard-kicker">${card.completionReason === "full_cycle" ? "完整旅行" : "中途召回"}</span>
                <strong>${escapeHtml(card.title)}</strong>
                <small>${escapeHtml(displaySceneName)} · ${Math.round(Number(card.progressPercent) || 0)}%</small>
              </div>
              <button
                class="postcard-edit-button"
                data-action="${isEditing ? "finish-postcard" : "edit-postcard"}"
                data-postcard-id="${escapeHtml(card.id)}"
                type="button"
              >${isEditing ? "完成" : "装饰"}</button>
            </header>
            <p>${escapeHtml(card.message)}</p>
            <footer class="postcard-footnote">
              <time datetime="${escapeHtml(card.createdAt)}">${escapeHtml(formatCollectionDate(card.createdAt))}</time>
              <span>NO. ${String(serialTotal - index).padStart(3, "0")}</span>
            </footer>
            ${isEditing ? renderPostcardEditor(card, getOwnedSouvenirs(card.destinationId)) : ""}
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function renderSouvenirs(scope = { mode: "all" }, queryResult = null, options = {}) {
  const result = queryResult ?? queryCollection(state.souvenirAcquisitions, {
    kind: "souvenirs",
    scope,
    pageSize: 10000
  });
  const entries = options.acquisitionView ? result.items : groupSouvenirAcquisitions(result.items);
  if (entries.length === 0) {
    return `<div class="empty-state"><h3>纪念品柜还在等第一件小物</h3><p>完成有效景点打卡后会带回纪念品；完整旅程会增加数量和珍稀机会。</p></div>`;
  }
  return `
    <div class="souvenir-grid">
      ${entries.map((entry, index) => {
        const acquisition = options.acquisitionView ? entry : entry.latest;
        const item = souvenirById.get(acquisition.souvenirId);
        if (!item) return "";
        const count = options.acquisitionView ? 1 : entry.count;
        const souvenirArt = renderSouvenirBadge(item);
        return `
        <article class="souvenir rarity-${item.rarity}">
          ${item.asset ? `
            <button
              class="souvenir-art image-preview-trigger"
              style="--float-delay:${(index % 5) * -0.34}s;"
              data-action="open-image-preview"
              data-preview-id="souvenir-${acquisition.id ?? item.id}-${index}"
              data-preview-src="${escapeHtml(item.asset)}"
              data-preview-title="${escapeHtml(translateText(item.name))}"
              data-preview-description="${escapeHtml(translateText(getSouvenirDisplayDescription(item, acquisition)))}"
              type="button"
              aria-label="${escapeHtml(getLocale() === "en" ? `View souvenir ${translateText(item.name)} full-screen` : `全屏查看纪念品${item.name}`)}"
            >
              ${souvenirArt}
            </button>
          ` : `
            <div class="souvenir-art" style="--float-delay:${(index % 5) * -0.34}s;">
              ${souvenirArt}
            </div>
          `}
          <div class="souvenir-copy">
            <small>${getDestinationName(acquisition.phase, acquisition.destinationId)} · ${getRarityLabel(item.rarity)}</small>
            <strong>${item.name}</strong>
            <p>${getSouvenirDisplayDescription(item, acquisition)}</p>
            ${options.acquisitionView ? `<time datetime="${escapeHtml(acquisition.acquiredAt)}">${formatCollectionDate(acquisition.acquiredAt)}</time>` : ""}
          </div>
          <span class="souvenir-count">x${count}</span>
        </article>
      `;
      }).join("")}
    </div>
  `;
}

function renderPostcardDecoration(decoration, isEditing) {
  const souvenir = souvenirById.get(decoration.souvenirId);
  if (!souvenir) return "";
  const english = getLocale() === "en";
  const localizedSouvenirName = translateText(souvenir.name);
  const moveLabel = english ? `Move and resize ${localizedSouvenirName}` : `移动并调整${souvenir.name}`;
  const adjustLabel = english ? `Adjust ${localizedSouvenirName}` : `调整${souvenir.name}`;
  const smallerLabel = english ? `Make ${localizedSouvenirName} smaller` : `缩小${souvenir.name}`;
  const largerLabel = english ? `Make ${localizedSouvenirName} larger` : `放大${souvenir.name}`;
  const rotateLeftLabel = english ? `Rotate ${localizedSouvenirName} 15 degrees counterclockwise` : `向左旋转${souvenir.name}15度`;
  const rotateRightLabel = english ? `Rotate ${localizedSouvenirName} 15 degrees clockwise` : `向右旋转${souvenir.name}15度`;
  const removeLabel = english ? `Remove ${localizedSouvenirName}` : `删除${souvenir.name}`;
  return `
    <div
      class="postcard-decoration"
      data-decoration-id="${escapeHtml(decoration.id)}"
      style="--decoration-x:${decoration.x};--decoration-y:${decoration.y};--decoration-scale:${decoration.scale};--decoration-rotation:${decoration.rotation}deg;--decoration-z:${decoration.zIndex};"
    >
      <div class="postcard-decoration-transform">
        <button
          class="postcard-decoration-handle"
          type="button"
          data-decoration-handle
          data-postcard-id="${escapeHtml(decoration.postcardId)}"
          data-decoration-id="${escapeHtml(decoration.id)}"
          aria-label="${escapeHtml(isEditing ? moveLabel : localizedSouvenirName)}"
          tabindex="${isEditing ? "0" : "-1"}"
        >${renderSouvenirBadge(souvenir, "compact")}</button>
      </div>
      ${isEditing ? `
        <div class="postcard-decoration-controls" role="group" aria-label="${escapeHtml(adjustLabel)}">
          <button data-action="transform-decoration" data-transform="scale-down" data-postcard-id="${escapeHtml(decoration.postcardId)}" data-decoration-id="${escapeHtml(decoration.id)}" type="button" title="${escapeHtml(smallerLabel)}" aria-label="${escapeHtml(smallerLabel)}">−</button>
          <button data-action="transform-decoration" data-transform="scale-up" data-postcard-id="${escapeHtml(decoration.postcardId)}" data-decoration-id="${escapeHtml(decoration.id)}" type="button" title="${escapeHtml(largerLabel)}" aria-label="${escapeHtml(largerLabel)}">＋</button>
          <button data-action="transform-decoration" data-transform="rotate-left" data-postcard-id="${escapeHtml(decoration.postcardId)}" data-decoration-id="${escapeHtml(decoration.id)}" type="button" title="${escapeHtml(rotateLeftLabel)}" aria-label="${escapeHtml(rotateLeftLabel)}">↺</button>
          <button data-action="transform-decoration" data-transform="rotate-right" data-postcard-id="${escapeHtml(decoration.postcardId)}" data-decoration-id="${escapeHtml(decoration.id)}" type="button" title="${escapeHtml(rotateRightLabel)}" aria-label="${escapeHtml(rotateRightLabel)}">↻</button>
        </div>
        <button
          class="postcard-decoration-remove"
          data-action="remove-decoration"
          data-postcard-id="${escapeHtml(decoration.postcardId)}"
          data-decoration-id="${escapeHtml(decoration.id)}"
          type="button"
          title="${escapeHtml(removeLabel)}"
          aria-label="${escapeHtml(removeLabel)}"
        >×</button>
      ` : ""}
    </div>
  `;
}

function renderPostcardEditor(card, ownedSouvenirs) {
  const decorationCount = card.decorations?.length ?? 0;
  const isFull = decorationCount >= MAX_POSTCARD_DECORATIONS;
  return `
    <section class="postcard-editor" aria-label="可用纪念品">
      <header>
        <strong>可用纪念品</strong>
        <span>${decorationCount}/${MAX_POSTCARD_DECORATIONS}</span>
      </header>
      ${ownedSouvenirs.length > 0 ? `
        <div class="postcard-souvenir-tray">
          ${ownedSouvenirs.map(item => `
            <button
              class="souvenir-drag-source"
              data-action="place-souvenir"
              data-postcard-id="${escapeHtml(card.id)}"
              data-souvenir-id="${escapeHtml(item.id)}"
              type="button"
              aria-label="将${escapeHtml(item.name)}放到${escapeHtml(card.title)}"
              ${isFull ? "disabled" : ""}
            >
              ${renderSouvenirBadge(item, "tray")}
              <small>${escapeHtml(item.name)}</small>
            </button>
          `).join("")}
        </div>
      ` : `<div class="postcard-editor-empty">尚未获得纪念品</div>`}
    </section>
  `;
}

function renderSouvenirBadge(souvenir, size = "default") {
  if (souvenir.asset) {
    return `
      <span
        class="souvenir-object object-${size} souvenir-type-${souvenir.type} rarity-${souvenir.rarity} ${souvenir.displayMode === "souvenir_thumbnail" ? "is-thumbnail" : ""}"
        style="--souvenir-asset-scale:${souvenir.assetScale ?? 1};"
        aria-hidden="true"
      >
        <img src="${souvenir.asset}" alt="" loading="lazy" decoding="async" draggable="false" />
      </span>
    `;
  }
  return `<span class="souvenir-object object-${size} souvenir-thumbnail-fallback" aria-hidden="true"></span>`;
}

function getOwnedSouvenirs(destinationId = null) {
  if (!destinationId) return souvenirs.filter(item => (state.souvenirCounts[item.id] ?? 0) > 0);
  const souvenirIds = getSouvenirIdsForDestination(state.souvenirAcquisitions, destinationId);
  return souvenirs.filter(item => souvenirIds.has(item.id));
}

function groupSouvenirAcquisitions(acquisitions) {
  const groups = new Map();
  for (const acquisition of acquisitions) {
    const current = groups.get(acquisition.souvenirId);
    if (current) current.count += 1;
    else groups.set(acquisition.souvenirId, { latest: acquisition, count: 1 });
  }
  return [...groups.values()];
}

function getDestinationName(phase, destinationId) {
  if (Number(phase) === 2) return getAtlasDestination(destinationId)?.name ?? "真实世界景点";
  if (destinationId === "legacy") return "历史旅行";
  return getThemeFromDb(destinationId)?.name ?? "虚拟主题";
}

function getSouvenirDisplayDescription(item, acquisition) {
  return item.description;
}

function formatCollectionDate(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.getUTCFullYear() === 1970) return "历史存档";
  return new Intl.DateTimeFormat(getLocale(), { year: "numeric", month: "short", day: "numeric" }).format(date);
}

function getRarityLabel(rarity) {
  return rarity === "rare" ? "稀有" : rarity === "uncommon" ? "少见" : "普通";
}

function renderHistory(scope = { mode: "all" }, queryResult = null) {
  const result = queryResult ?? queryCollection(state.travels, { kind: "history", scope, pageSize: 10000 });
  if (result.items.length === 0) {
    return `<div class="empty-state"><h3>还没有旅行记录</h3><p>这里会记录完整旅行和中途召回。</p></div>`;
  }
  return `
    <div class="history-list">
      ${result.items.map(travel => {
        const destinationName = getDestinationName(travel.phase ?? 1, getCollectionDestinationId(travel));
        return `
          <article class="history-row">
            <div><strong>${destinationName}</strong><time datetime="${escapeHtml(travel.completedAt ?? travel.startedAt)}">${formatCollectionDate(travel.completedAt ?? travel.startedAt)}</time></div>
            <span>${travel.completionReason === "full_cycle" ? "240 分钟完成" : travel.completionReason === "daily_limit" ? "今日额度结束" : "中途召回"} · ${Math.round(travel.progressPercent ?? 0)}%</span>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function renderPet(activeTravel, pet, options = {}) {
  if (state.settings.isHidden && !options.forceVisible) {
    return `<button class="pet-restore" data-action="toggle-hide">显示桌宠</button>`;
  }
  const status = getPetVisualState(activeTravel);
  const label = getPetVisualLabel(status);
  const weatherMeta = getPetWeatherMeta(status);
  const petAsset = getPetAssetForWeatherState(pet, status, weatherMeta?.assetId);
  const weatherLabel = weatherMeta?.label ? ` · ${weatherMeta.label}` : "";
  const weatherClass = weatherMeta ? `weather-${weatherMeta.assetId}` : "weather-fallback";
  const savedPosition = state.settings.petPosition;
  const position = options.journal
    ? {
        x: window.innerWidth <= 980 ? Math.max(18, window.innerWidth - 150) : Math.round(window.innerWidth * 0.36),
        y: 150
      }
    : options.avoidDetails
      ? { x: 18, y: Math.max(142, window.innerHeight - 168) }
    : options.avoidHeader && savedPosition.y < 132
      ? { x: 18, y: Math.max(142, window.innerHeight - 168) }
      : savedPosition;
  const positionStyle = options.lightweight ? "" : `style="left:${position.x}px; top:${position.y}px;"`;
  const restoreHint = options.lightweight ? " title=\"双击打开完整窗口\"" : "";
  return `
    <div class="desk-pet ${status} ${weatherClass} ${options.lightweight ? "lightweight" : ""} ${options.journal ? "journal-pet" : ""} ${options.avoidDetails ? "details-pet" : ""}" ${positionStyle} data-pet data-pet-weather="${weatherMeta?.assetId ?? "fallback"}"${restoreHint}>
      <div class="pet-face">
        <img class="desk-pet-image" src="${petAsset}" alt="${pet.name}${label}${weatherLabel}" draggable="false" />
      </div>
      <small>${pet.name} · ${label}</small>
    </div>
  `;
}

function renderPetPicker(selectedPet) {
  const canDismiss = state.settings.hasChosenPet;
  return `
    <div class="pet-picker-backdrop" role="presentation">
      <section class="pet-picker-modal" role="dialog" aria-modal="true" aria-labelledby="pet-picker-title">
        <header class="pet-picker-heading">
          <div>
            <p class="eyebrow">桌宠形象</p>
            <h2 id="pet-picker-title">${canDismiss ? "更换同行旅伴" : "选择第一位旅伴"}</h2>
          </div>
          ${canDismiss ? `<button class="icon-button" data-action="close-pet-picker" title="关闭选择器">收起</button>` : ""}
        </header>
        <div class="pet-picker-grid">
          ${pets.map(pet => `
            <button class="pet-card ${pet.id === selectedPet.id ? "selected" : ""}" data-action="choose-pet" data-pet-id="${pet.id}">
              <span class="pet-card-art">
                <img src="${pet.asset}" alt="" loading="lazy" decoding="async" draggable="false" />
              </span>
              <strong>${pet.name}</strong>
              <small>${pet.groupLabel}</small>
            </button>
          `).join("")}
        </div>
      </section>
    </div>
  `;
}

function renderFirstRunOnboarding(selectedPet) {
  const choosingLanguage = onboardingStep === "language";
  const choosingPet = onboardingStep === "pet";
  const choosingWeather = onboardingStep === "weather";
  const choosingMusic = onboardingStep === "music";
  return `
    <main class="first-run-onboarding">
      <section class="first-run-card" role="dialog" aria-modal="true" aria-labelledby="first-run-title">
        <header class="first-run-header">
          <div class="first-run-brand" aria-label="Itsees Pet Travel">
            <strong>ITSEES</strong>
            <span>PET TRAVEL</span>
          </div>
          <ol class="first-run-steps" aria-label="${choosingLanguage ? "首次设置进度 / First-time setup progress" : "首次设置进度"}">
            <li class="${choosingLanguage ? "current" : "complete"}"><span>1</span>语言</li>
            <li class="${choosingPet ? "current" : choosingWeather || choosingMusic ? "complete" : ""}"><span>2</span>选择旅伴</li>
            <li class="${choosingWeather ? "current" : choosingMusic ? "complete" : ""}"><span>3</span>天气选项</li>
            <li class="${choosingMusic ? "current" : ""}"><span>4</span>背景音乐</li>
          </ol>
        </header>

        ${choosingLanguage ? `
          <div class="first-run-language-layout">
            <div class="first-run-language-copy">
              <p class="eyebrow">欢迎来到 ITSEES · WELCOME TO ITSEES</p>
              <h1 id="first-run-title"><span lang="zh-CN">选择应用语言</span><small lang="en">Choose your language</small></h1>
              <p><span lang="zh-CN">请选择你希望使用的界面语言。之后也可以随时在设置中切换。</span><span lang="en">Select your preferred interface language. You can change it anytime in Settings.</span></p>
            </div>
            <div class="first-run-language-actions" aria-label="选择语言 / Choose a language">
              <button class="first-run-language-option" data-action="onboarding-language-zh" type="button" lang="zh-CN" aria-label="使用简体中文">
                <span>中文</span><small>简体中文</small>
              </button>
              <button class="first-run-language-option" data-action="onboarding-language-en" type="button" lang="en" aria-label="Use English">
                <span>English</span><small>English interface</small>
              </button>
            </div>
          </div>
        ` : choosingPet ? `
          <div class="first-run-copy">
            <p class="eyebrow">第二步 · 桌宠形象</p>
            <h1 id="first-run-title">选择一位同行旅伴</h1>
            <p>它会陪你出发、带回明信片，也会出现在桌宠模式中。</p>
          </div>
          <div class="first-run-pet-grid">
            ${pets.map(pet => `
              <button
                class="pet-card ${pet.id === selectedPet.id ? "selected" : ""}"
                data-action="onboarding-choose-pet"
                data-pet-id="${pet.id}"
                type="button"
                aria-label="选择${pet.name}作为旅伴"
              >
                <span class="pet-card-art">
                  <img src="${pet.asset}" alt="" loading="lazy" decoding="async" draggable="false" />
                </span>
                <strong>${pet.name}</strong>
                <small>${pet.groupLabel}</small>
              </button>
            `).join("")}
          </div>
        ` : choosingWeather ? `
          <div class="first-run-weather-layout">
            <figure class="first-run-selected-pet">
              <img src="${selectedPet.asset}" alt="${selectedPet.name}" draggable="false" />
              <figcaption><span>你的同行旅伴</span><strong>${selectedPet.name}</strong></figcaption>
            </figure>
            <div class="first-run-weather-copy">
              <p class="eyebrow">第三步 · 天气选项</p>
              <h1 id="first-run-title">是否打开实时天气？</h1>
              <p>开启后，桌宠会根据你所在地的天气切换状态。应用会通过 GeoJS 获取 IP 所在地，并由 Open-Meteo 查询当地天气。</p>
              <div class="first-run-weather-actions">
                <button class="first-run-primary" data-action="onboarding-weather-enable" type="button">打开实时天气</button>
                <button data-action="onboarding-weather-disable" type="button">暂不开启</button>
              </div>
              <aside class="first-run-settings-hint">
                <strong>以后想修改？</strong>
                <span>进入首页后，点击右上角「设置」，即可更换旅伴或修改实时天气。</span>
              </aside>
            </div>
          </div>
        ` : `
          <div class="first-run-weather-layout first-run-music-layout">
            <figure class="first-run-music-player" aria-hidden="true">
              <span class="first-run-record">
                <i>ITSEES</i>
              </span>
              <figcaption>
                <span>THEME × WEATHER</span>
                <strong>旅途的声音</strong>
              </figcaption>
            </figure>
            <div class="first-run-weather-copy first-run-music-copy">
              <p class="eyebrow">第四步 · 背景音乐</p>
              <h1 id="first-run-title">要为旅程播放轻音乐吗？</h1>
              <p>音乐会跟随正在旅行的主题与实时天气变化；天气不可用时，会播放该主题的默认版本。</p>
              <div class="first-run-weather-actions">
                <button class="first-run-primary" data-action="onboarding-music-enable" type="button">播放背景音乐</button>
                <button data-action="onboarding-music-disable" type="button">暂不开启</button>
              </div>
              <aside class="first-run-settings-hint">
                <strong>以后想修改？</strong>
                <span>进入首页后，点击右上角的「音乐」按钮即可随时播放或关闭。</span>
              </aside>
            </div>
          </div>
        `}
      </section>
    </main>
  `;
}

function renderImagePreview() {
  if (!imagePreview?.src) return "";
  const english = getLocale() === "en";
  const fallbackTitle = english ? "Travel image" : "旅行图片";
  return `
    <div class="image-preview-layer">
      <div class="image-preview-backdrop" data-action="close-image-preview" aria-hidden="true"></div>
      <section class="image-preview-modal" role="dialog" aria-modal="true" aria-labelledby="image-preview-title">
        <header>
          <div>
            <p class="eyebrow">${english ? "Full-screen preview" : "全屏查看"}</p>
            <h2 id="image-preview-title">${escapeHtml(imagePreview.title ?? fallbackTitle)}</h2>
            ${imagePreview.description ? `<p>${escapeHtml(imagePreview.description)}</p>` : ""}
          </div>
          <button class="icon-button" data-action="close-image-preview" type="button" aria-label="${english ? "Close image preview" : "关闭图片预览"}">${english ? "Close" : "关闭"}</button>
        </header>
        <figure class="${imagePreview.phase === 2 ? "atlas-image-preview-figure" : ""}">
          ${imagePreview.phase === 2
            ? renderAtlasPostcardWorld({
                imageUrl: imagePreview.src,
                alt: imagePreview.title ?? fallbackTitle,
                preview: true
              })
            : `<img src="${escapeHtml(imagePreview.src)}" alt="${escapeHtml(imagePreview.title ?? fallbackTitle)}" />`}
        </figure>
      </section>
    </div>
  `;
}

function renderResetConfirmDialog() {
  if (!resetConfirmOpen) return "";
  return `
    <div class="journal-confirm-layer">
      <div class="journal-confirm-backdrop" data-action="cancel-reset" aria-hidden="true"></div>
      <section class="journal-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="reset-confirm-title" aria-describedby="reset-confirm-copy">
        <p class="eyebrow">危险操作</p>
        <h2 id="reset-confirm-title">确定要清空旅行记录吗？</h2>
        <p id="reset-confirm-copy">这会清除本地保存的明信片、纪念品、地图点亮进度和旅伴状态。这个动作不能撤销。</p>
        <div class="journal-confirm-actions">
          <button data-action="cancel-reset" type="button">先保留</button>
          <button class="danger" data-action="confirm-reset" type="button">确认清空</button>
        </div>
      </section>
    </div>
  `;
}

function getStatusText(activeTravel, mapView) {
  if (!activeTravel) return "等待出发";
  if (activeTravel.status === "traveling") return `旅行中 · ${Math.round(mapView.progressPercent)}%`;
  if (activeTravel.status === "recalled") return "已召回 · 可继续";
  if (activeTravel.status === "completed") return "完整旅行完成";
  return "等待出发";
}

function addSouvenirToPostcard(postcardId, souvenirId, point) {
  if (editingPostcardId !== postcardId) return false;
  const postcard = state.album.find(card => card.id === postcardId);
  if (!postcard) return false;
  const decorationCount = postcard.decorations?.length ?? 0;
  const nextPostcard = addPostcardDecoration(postcard, souvenirId, point, {
    rotation: ((decorationCount % 5) - 2) * 4
  });
  if (nextPostcard === postcard) return false;

  state.album = state.album.map(card => card.id === postcardId ? nextPostcard : card);
  recordClientEvent("souvenir_badge_dropped", { souvenirId, postcardId, x: point.x, y: point.y });
  recordClientEvent("postcard_decoration_updated", {
    postcardId,
    decorationCount: nextPostcard.decorations.length,
    action: "add"
  });
  setState(state);
  return true;
}

function updatePostcardDecoration(postcardId, decorationId, point) {
  if (editingPostcardId !== postcardId) return false;
  const postcard = state.album.find(card => card.id === postcardId);
  if (!postcard) return false;
  const nextPostcard = movePostcardDecoration(postcard, decorationId, point);
  if (nextPostcard === postcard) return false;

  state.album = state.album.map(card => card.id === postcardId ? nextPostcard : card);
  recordClientEvent("postcard_decoration_updated", {
    postcardId,
    decorationCount: nextPostcard.decorations.length,
    action: "move"
  });
  setState(state);
  return true;
}

function adjustPostcardDecoration(postcardId, decorationId, operation) {
  if (editingPostcardId !== postcardId) return false;
  const postcard = state.album.find(card => card.id === postcardId);
  const decoration = postcard?.decorations?.find(item => item.id === decorationId);
  if (!postcard || !decoration) return false;
  const transform = operation === "scale-down"
    ? { scale: Math.round((decoration.scale - 0.1) * 10) / 10 }
    : operation === "scale-up"
      ? { scale: Math.round((decoration.scale + 0.1) * 10) / 10 }
      : operation === "rotate-left"
        ? { rotation: decoration.rotation - 15 }
        : operation === "rotate-right"
          ? { rotation: decoration.rotation + 15 }
          : null;
  if (!transform) return false;
  const nextPostcard = transformPostcardDecoration(postcard, decorationId, transform);
  if (nextPostcard === postcard) return false;

  state.album = state.album.map(card => card.id === postcardId ? nextPostcard : card);
  recordClientEvent("postcard_decoration_updated", {
    postcardId,
    decorationCount: nextPostcard.decorations.length,
    action: operation
  });
  pendingFocusSelector = [
    '[data-action="transform-decoration"]',
    `[data-postcard-id="${CSS.escape(postcardId)}"]`,
    `[data-decoration-id="${CSS.escape(decorationId)}"]`,
    `[data-transform="${CSS.escape(operation)}"]`
  ].join("");
  setState(state);
  return true;
}

function deletePostcardDecoration(postcardId, decorationId) {
  if (editingPostcardId !== postcardId) return false;
  const postcard = state.album.find(card => card.id === postcardId);
  if (!postcard) return false;
  const nextPostcard = removePostcardDecoration(postcard, decorationId);
  if (nextPostcard === postcard) return false;

  state.album = state.album.map(card => card.id === postcardId ? nextPostcard : card);
  recordClientEvent("postcard_decoration_updated", {
    postcardId,
    decorationCount: nextPostcard.decorations.length,
    action: "delete"
  });
  setState(state);
  return true;
}

function recordClientEvent(name, properties) {
  state.analytics = Array.isArray(state.analytics) ? state.analytics : [];
  state.analytics.unshift({
    id: `event-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    properties,
    createdAt: new Date().toISOString()
  });
  state.analytics = state.analytics.slice(0, 120);
}

function bindPostcardDecorator() {
  if (!editingPostcardId) return;
  const stage = [...app.querySelectorAll("[data-postcard-stage]")]
    .find(candidate => candidate.dataset.postcardId === editingPostcardId);
  if (!stage) return;

  app.querySelectorAll(".souvenir-drag-source").forEach(source => {
    source.addEventListener("keydown", event => {
      if (!["Enter", " ", "Spacebar"].includes(event.key) || source.disabled) return;
      event.preventDefault();
      event.stopPropagation();
      const postcard = state.album.find(card => card.id === source.dataset.postcardId);
      const offset = ((postcard?.decorations?.length ?? 0) % 5) * 0.035;
      addSouvenirToPostcard(
        source.dataset.postcardId,
        source.dataset.souvenirId,
        { x: 0.42 + offset, y: 0.44 + offset }
      );
    });
    source.addEventListener("pointerdown", event => {
      if (event.button !== 0 || source.disabled) return;
      const start = { x: event.clientX, y: event.clientY };
      let lastPointer = start;
      let dragging = false;
      let ghost = null;

      source.setPointerCapture(event.pointerId);
      const onMove = moveEvent => {
        if (moveEvent.pointerId !== event.pointerId) return;
        lastPointer = { x: moveEvent.clientX, y: moveEvent.clientY };
        const distance = Math.hypot(moveEvent.clientX - start.x, moveEvent.clientY - start.y);
        if (!dragging && distance >= 10) {
          dragging = true;
          ghost = createSouvenirDragGhost(source);
          recordClientEvent("souvenir_badge_drag_started", {
            souvenirId: source.dataset.souvenirId,
            source: "album"
          });
          saveState(state);
        }
        if (!dragging) return;
        moveEvent.preventDefault();
        positionSouvenirDragGhost(ghost, moveEvent.clientX, moveEvent.clientY);
        stage.classList.toggle("is-drop-target", Boolean(getPostcardPoint(stage, moveEvent.clientX, moveEvent.clientY)));
      };
      const onEnd = endEvent => {
        if (endEvent.pointerId !== event.pointerId) return;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onEnd);
        window.removeEventListener("pointercancel", onEnd);
        if (source.hasPointerCapture(event.pointerId)) source.releasePointerCapture(event.pointerId);
        const releasePoint = getPostcardPoint(stage, endEvent.clientX, endEvent.clientY)
          ?? getPostcardPoint(stage, lastPointer.x, lastPointer.y);
        const point = dragging && endEvent.type !== "pointercancel" ? releasePoint : null;
        stage.classList.remove("is-drop-target");
        ghost?.remove();
        if (!dragging) {
          if (endEvent.type === "pointercancel") return;
          const postcard = state.album.find(card => card.id === source.dataset.postcardId);
          const offset = ((postcard?.decorations?.length ?? 0) % 5) * 0.035;
          suppressSouvenirClickUntil = performance.now() + 350;
          addSouvenirToPostcard(
            source.dataset.postcardId,
            source.dataset.souvenirId,
            { x: 0.42 + offset, y: 0.44 + offset }
          );
          return;
        }
        if (point) {
          suppressSouvenirClickUntil = performance.now() + 350;
          addSouvenirToPostcard(editingPostcardId, source.dataset.souvenirId, point);
          return;
        }
        const sourceRect = source.getBoundingClientRect();
        const releasedOnSource = endEvent.clientX >= sourceRect.left
          && endEvent.clientX <= sourceRect.right
          && endEvent.clientY >= sourceRect.top
          && endEvent.clientY <= sourceRect.bottom;
        if (releasedOnSource) {
          const postcard = state.album.find(card => card.id === source.dataset.postcardId);
          const offset = ((postcard?.decorations?.length ?? 0) % 5) * 0.035;
          suppressSouvenirClickUntil = performance.now() + 350;
          addSouvenirToPostcard(
            source.dataset.postcardId,
            source.dataset.souvenirId,
            { x: 0.42 + offset, y: 0.44 + offset }
          );
        }
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onEnd);
      window.addEventListener("pointercancel", onEnd);
    });
  });

  app.querySelectorAll("[data-decoration-handle]").forEach(handle => {
    handle.addEventListener("pointerdown", event => {
      if (event.button !== 0) return;
      event.stopPropagation();
      handle.focus({ preventScroll: true });
      const decoration = handle.closest(".postcard-decoration");
      const start = { x: event.clientX, y: event.clientY };
      let lastPointer = start;
      let moved = false;
      handle.setPointerCapture(event.pointerId);

      const onMove = moveEvent => {
        if (moveEvent.pointerId !== event.pointerId) return;
        lastPointer = { x: moveEvent.clientX, y: moveEvent.clientY };
        moved = moved || Math.hypot(moveEvent.clientX - start.x, moveEvent.clientY - start.y) >= 3;
        if (!moved) return;
        moveEvent.preventDefault();
        const point = getPostcardPoint(stage, moveEvent.clientX, moveEvent.clientY, true);
        decoration.style.setProperty("--decoration-x", point.x);
        decoration.style.setProperty("--decoration-y", point.y);
      };
      const onEnd = endEvent => {
        if (endEvent.pointerId !== event.pointerId) return;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onEnd);
        window.removeEventListener("pointercancel", onEnd);
        if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
        if (!moved || endEvent.type === "pointercancel") return;
        const point = getPostcardPoint(stage, endEvent.clientX, endEvent.clientY)
          ?? getPostcardPoint(stage, lastPointer.x, lastPointer.y, true);
        updatePostcardDecoration(editingPostcardId, handle.dataset.decorationId, point);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onEnd);
      window.addEventListener("pointercancel", onEnd);
    });
    handle.addEventListener("keydown", event => {
      if (!["Delete", "Backspace"].includes(event.key)) return;
      event.preventDefault();
      deletePostcardDecoration(handle.dataset.postcardId, handle.dataset.decorationId);
    });
  });
}

function getPostcardPoint(stage, clientX, clientY, shouldClamp = false) {
  const rect = stage.getBoundingClientRect();
  const inside = clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
  if (!inside && !shouldClamp) return null;
  return {
    x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
    y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height))
  };
}

function createSouvenirDragGhost(source) {
  const ghost = document.createElement("div");
  ghost.className = "souvenir-drag-ghost";
  const thumbnail = source.querySelector(".souvenir-object")?.cloneNode(true);
  if (thumbnail) ghost.append(thumbnail);
  document.body.append(ghost);
  return ghost;
}

function positionSouvenirDragGhost(ghost, clientX, clientY) {
  if (!ghost) return;
  ghost.style.left = `${clientX}px`;
  ghost.style.top = `${clientY}px`;
}

function bindEvents() {
  app.querySelectorAll(".theme-button[data-theme-id]").forEach(button => {
    button.addEventListener("click", () => {
      state.selectedThemeId = button.dataset.themeId;
      void prepareBackgroundMusicDestination(state.selectedThemeId);
      ensureThemeAssets(state.selectedThemeId);
      saveState(state);
      render();
    });
  });

  app.querySelectorAll(".pack-item input").forEach(input => {
    input.addEventListener("change", () => {
      if (!input.checked || input.disabled) return;
      const item = inventoryItems.find(candidate => candidate.id === input.value);
      if (!item) return;
      const nextSelection = state.selectedItemIds.filter(itemId => {
        return inventoryItems.find(candidate => candidate.id === itemId)?.type !== item.type;
      });
      nextSelection.push(item.id);
      state.selectedItemIds = normalizePackSelection(state, nextSelection);
      saveState(state);
      render();
    });
  });

  app.querySelectorAll("[data-tab]").forEach(button => {
    button.addEventListener("click", () => {
      activeView = button.dataset.tab;
      if (activeView !== "album") editingPostcardId = null;
      detailsOpen = true;
      render();
    });
  });

  app.querySelectorAll("[data-mine-tab]").forEach(button => {
    button.addEventListener("click", () => {
      mineView = button.dataset.mineTab;
      if (mineView === "souvenirs") mineFilters.completion = "all";
      else mineFilters.rarity = "all";
      minePage = 1;
      editingPostcardId = null;
      openMineDestinationId = null;
      render();
    });
  });

  app.querySelectorAll("[data-collection-filter]").forEach(select => {
    select.addEventListener("change", () => {
      const filter = select.dataset.collectionFilter;
      mineFilters[filter] = select.value;
      if (filter === "phase") mineFilters.destinationId = "all";
      minePage = 1;
      editingPostcardId = null;
      openMineDestinationId = null;
      render();
    });
  });

  const details = app.querySelector(".home-details");
  if (details) {
    details.addEventListener("toggle", () => {
      detailsOpen = details.open;
      const pet = app.querySelector(".desk-pet");
      if (!pet) return;
      pet.classList.toggle("details-pet", detailsOpen);
      if (detailsOpen) {
        pet.style.left = "18px";
        pet.style.top = `${Math.max(142, window.innerHeight - 168)}px`;
        return;
      }
      const savedPosition = state.settings.petPosition;
      const restoredPosition = savedPosition.y < 132
        ? { x: 18, y: Math.max(142, window.innerHeight - 168) }
        : savedPosition;
      pet.style.left = `${restoredPosition.x}px`;
      pet.style.top = `${restoredPosition.y}px`;
    });
  }

  const packLibrary = app.querySelector(".pack-library");
  if (packLibrary) {
    packLibrary.addEventListener("toggle", () => {
      packLibraryOpen = packLibrary.open;
    });
  }

  app.querySelectorAll("[data-action]").forEach(button => {
    button.addEventListener("click", () => handleAction(button.dataset.action, button));
  });
  bindPostcardDecorator();
  bindAtlasWorldView(app, subsceneId => {
    atlasSubsceneId = subsceneId;
    render();
  });
  bindDialogKeyboard();
  restorePendingFocus();
}

function getFocusableElements(container) {
  return [...container.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), summary, [tabindex]:not([tabindex="-1"])')]
    .filter(element => !element.closest("[inert]") && element.getClientRects().length > 0);
}

function bindDialogKeyboard() {
  const dialog = app.querySelector('[role="dialog"][aria-modal="true"]');
  if (!dialog) return;
  dialog.addEventListener("keydown", event => {
    if (event.key === "Escape" && phase2UnlockCelebrationOpen) {
      event.preventDefault();
      acknowledgePhase2Unlock();
      return;
    }
    if (event.key === "Escape" && resetConfirmOpen) {
      event.preventDefault();
      resetConfirmOpen = false;
      settingsMenuOpen = true;
      pendingFocusSelector = '[data-action="reset"]';
      render();
      return;
    }
    if (event.key === "Escape" && imagePreview) {
      event.preventDefault();
      imagePreview = null;
      pendingFocusSelector = dialogReturnFocusSelector;
      dialogReturnFocusSelector = null;
      render();
      return;
    }
    if (event.key === "Escape" && petPickerOpen && state.settings.hasChosenPet) {
      event.preventDefault();
      petPickerOpen = false;
      pendingFocusSelector = dialogReturnFocusSelector ?? '[aria-label="打开设置"]';
      render();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = getFocusableElements(dialog);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}

function restorePendingFocus() {
  const dialog = app.querySelector('[role="dialog"][aria-modal="true"]');
  const selector = pendingFocusSelector;
  pendingFocusSelector = null;
  const target = selector ? app.querySelector(selector) : null;
  if (target) {
    target.focus({ preventScroll: true });
    return;
  }
  if (dialog && (document.activeElement === document.body || !app.contains(document.activeElement))) {
    getFocusableElements(dialog)[0]?.focus({ preventScroll: true });
  }
}

function postcardActionSelector(action, postcardId) {
  return `[data-action="${action}"][data-postcard-id="${CSS.escape(postcardId)}"]`;
}

function acknowledgePhase2Unlock({ enterPhase2 = false } = {}) {
  if (state.dailyCheckin?.noticePending) state = dismissDailyCheckinNotice(state);
  state.settings.phase2UnlockCelebratedAt = new Date().toISOString();
  phase2UnlockCelebrationOpen = false;
  pendingFocusSelector = null;
  saveState(state);
  if (enterPhase2 && window.location.hash !== "#/map/phase2") {
    window.location.hash = "#/map/phase2";
    return;
  }
  render();
}

function handleAction(action, target) {
  if (action === "enter-phase2-unlock") {
    acknowledgePhase2Unlock({ enterPhase2: true });
    return;
  }
  if (action === "dismiss-phase2-unlock") {
    acknowledgePhase2Unlock();
    return;
  }
  if (action === "toggle-language") {
    toggleLocale();
    persistDesktopLocale();
    pendingFocusSelector = '[data-action="toggle-language"]';
    render();
    return;
  }
  if (action === "onboarding-language-zh" || action === "onboarding-language-en") {
    chooseLocale(action === "onboarding-language-en" ? "en" : "zh-CN");
    persistDesktopLocale();
    onboardingStep = "pet";
    pendingFocusSelector = '[data-action="onboarding-choose-pet"]';
    render();
    return;
  }
  if (action === "onboarding-choose-pet") {
    const pet = getPetById(target?.dataset.petId);
    state.settings.selectedPetId = pet.id;
    state.settings.hasChosenPet = true;
    onboardingStep = "weather";
    saveState(state);
    pendingFocusSelector = '[data-action="onboarding-weather-enable"]';
    render();
    return;
  }
  if (action === "onboarding-weather-enable" || action === "onboarding-weather-disable") {
    const enableLiveWeather = action === "onboarding-weather-enable";
    state.settings.liveWeatherEnabled = enableLiveWeather;
    state.settings.hasGrantedLiveWeatherConsent = enableLiveWeather;
    state.settings.hasCompletedOnboarding = true;
    state.localWeather = enableLiveWeather
      ? createInitialLiveWeatherState()
      : { ...createInitialLiveWeatherState(), status: "disabled" };
    onboardingStep = "music";
    saveState(state);
    pendingFocusSelector = '[data-action="onboarding-music-enable"]';
    render();
    if (enableLiveWeather) startFirstLaunchWeatherRequest();
    return;
  }
  if (action === "onboarding-music-enable" || action === "onboarding-music-disable") {
    const enableBackgroundMusic = action === "onboarding-music-enable";
    state.settings.backgroundMusicEnabled = enableBackgroundMusic;
    state.settings.hasChosenBackgroundMusic = true;
    state.settings.hasCompletedOnboarding = true;
    onboardingStep = null;
    recordClientEvent("background_music_preference_set", {
      enabled: enableBackgroundMusic,
      source: "onboarding"
    });
    saveState(state);
    render();
    const selection = getCurrentBackgroundMusicSelection();
    void backgroundMusicController.setEnabled(enableBackgroundMusic, selection, { force: enableBackgroundMusic });
    return;
  }
  if (action === "open-home") {
    settingsMenuOpen = false;
    if (window.location.hash === "#/travel") {
      resetRouteScroll();
      render();
    } else {
      window.location.hash = "#/travel";
    }
    return;
  }
  if (action === "edit-postcard") {
    editingPostcardId = target?.dataset.postcardId ?? null;
    if (editingPostcardId) pendingFocusSelector = postcardActionSelector("finish-postcard", editingPostcardId);
    render();
  }
  if (action === "finish-postcard") {
    const postcardId = target?.dataset.postcardId;
    editingPostcardId = null;
    if (postcardId) pendingFocusSelector = postcardActionSelector("edit-postcard", postcardId);
    render();
  }
  if (action === "open-image-preview") {
    const previewId = target?.dataset.previewId;
    imagePreview = {
      src: target?.dataset.previewSrc,
      title: target?.dataset.previewTitle,
      description: target?.dataset.previewDescription,
      phase: Number(target?.dataset.previewPhase ?? 1)
    };
    dialogReturnFocusSelector = previewId ? `[data-preview-id="${CSS.escape(previewId)}"]` : null;
    pendingFocusSelector = '.image-preview-modal [data-action="close-image-preview"]';
    render();
    return;
  }
  if (action === "close-image-preview") {
    imagePreview = null;
    pendingFocusSelector = dialogReturnFocusSelector;
    dialogReturnFocusSelector = null;
    render();
    return;
  }
  if (action === "place-souvenir") {
    if (performance.now() < suppressSouvenirClickUntil) return;
    const postcard = state.album.find(card => card.id === target?.dataset.postcardId);
    const offset = ((postcard?.decorations?.length ?? 0) % 5) * 0.035;
    addSouvenirToPostcard(
      target?.dataset.postcardId,
      target?.dataset.souvenirId,
      { x: 0.42 + offset, y: 0.44 + offset }
    );
  }
  if (action === "remove-decoration") {
    deletePostcardDecoration(target?.dataset.postcardId, target?.dataset.decorationId);
  }
  if (action === "transform-decoration") {
    adjustPostcardDecoration(
      target?.dataset.postcardId,
      target?.dataset.decorationId,
      target?.dataset.transform
    );
  }
  if (action === "open-atlas" || action === "open-map-phase2") {
    window.location.hash = "#/map/phase2";
  }
  if (action === "open-mine") {
    minePage = 1;
    editingPostcardId = null;
    settingsMenuOpen = false;
    window.location.hash = "#/mine";
  }
  if (action === "toggle-settings-menu") {
    settingsMenuOpen = !settingsMenuOpen;
    pendingFocusSelector = settingsMenuOpen ? '.journal-settings-menu [data-action="open-pet-picker"]' : '[aria-label="打开设置"]';
    render();
    return;
  }
  if (action === "toggle-background-music") {
    const runtimeStatus = backgroundMusicController.getSnapshot().status;
    const shouldEnable = !["playing", "loading"].includes(runtimeStatus);
    setBackgroundMusicPreference(shouldEnable, "home_button");
    return;
  }
  if (action === "toggle-background-music-setting") {
    const shouldEnable = !state.settings.backgroundMusicEnabled;
    pendingFocusSelector = '.journal-settings-menu [data-action="toggle-background-music-setting"]';
    setBackgroundMusicPreference(shouldEnable, "settings", { rerender: true });
    return;
  }
  if (action === "clear-music-cache") {
    pendingFocusSelector = '.journal-settings-menu [data-action="clear-music-cache"]';
    window.desktopBridge?.clearMusicCache?.()
      .then(summary => {
        musicCacheSummary = summary;
        for (const destinationId of [...musicPackStates.keys()]) {
          if (!builtInMusicDestinationIds.has(destinationId)) musicPackStates.delete(destinationId);
        }
        syncBackgroundMusicRuntime();
        render();
      })
      .catch(error => showSharedStateNotice(`音乐缓存清理失败：${error.message}`));
    return;
  }
  if (action === "jump-mine-destination") {
    const destinationId = target?.dataset.destinationId;
    if (!destinationId) return;
    openMineDestinationId = destinationId;
    const group = document.getElementById(`mine-destination-${CSS.escape(destinationId)}`);
    target?.classList.add("active");
    app.querySelectorAll(".mine-theme-jump").forEach(button => {
      if (button !== target) button.classList.remove("active");
    });
    group?.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
    });
    return;
  }
  if (action === "toggle-mine-theme") {
    openMineDestinationId = target?.dataset.destinationId ?? openMineDestinationId;
    editingPostcardId = null;
    render();
  }
  if (action === "select-mine-scene") {
    const destinationId = target?.dataset.destinationId;
    const sceneId = target?.dataset.sceneId;
    if (destinationId && sceneId) {
      openMineDestinationId = destinationId;
      mineSceneSelection = { ...mineSceneSelection, [destinationId]: sceneId };
      editingPostcardId = null;
      render();
    }
  }
  if (action === "mine-page-prev") {
    minePage = Math.max(1, minePage - 1);
    editingPostcardId = null;
    render();
  }
  if (action === "mine-page-next") {
    minePage += 1;
    editingPostcardId = null;
    render();
  }
  if (action === "open-phase1" || action === "open-map-phase1") {
    themeSceneId = null;
    window.location.hash = "#/map/phase1";
  }
  if (action === "select-atlas-landmark") {
    state.selectedAtlasLandmarkId = getAtlasDestination(target?.dataset.landmarkId).id;
    void prepareBackgroundMusicDestination(state.selectedAtlasLandmarkId);
    saveState(state);
    render();
  }
  if (action === "select-home-atlas") {
    const destination = getAtlasDestination(target?.dataset.landmarkId);
    state.selectedAtlasLandmarkId = destination.id;
    void prepareBackgroundMusicDestination(destination.id);
    atlasSubsceneId = null;
    saveState(state);
    render();
  }
  if (action === "enter-atlas-landmark") {
    const destination = getAtlasDestination(target?.dataset.landmarkId);
    state.selectedAtlasLandmarkId = destination.id;
    confirmBackgroundMusicDestination(destination.id);
    atlasSubsceneId = null;
    saveState(state);
    window.location.hash = `#/atlas/landmark/${destination.id}`;
  }
  if (action === "start-atlas") {
    confirmBackgroundMusicDestination(state.selectedAtlasLandmarkId);
    requestTravelAction(
      { type: "start", phase: 2, destinationId: state.selectedAtlasLandmarkId, selectedItemIds: state.selectedItemIds },
      () => startTravel(state, state.selectedAtlasLandmarkId, state.selectedItemIds, new Date(), { phase: 2 })
    );
  }
  if (action === "switch-atlas") {
    const destination = getAtlasDestination(target?.dataset.landmarkId ?? state.selectedAtlasLandmarkId);
    state.selectedAtlasLandmarkId = destination.id;
    confirmBackgroundMusicDestination(destination.id);
    requestTravelAction(
      { type: "start", phase: 2, destinationId: destination.id, selectedItemIds: state.selectedItemIds },
      () => startTravel(state, destination.id, state.selectedItemIds, new Date(), { phase: 2 })
    );
  }
  if (action === "cycle-atlas") {
    const currentIndex = atlasDestinations.findIndex(item => item.id === state.selectedAtlasLandmarkId);
    const next = atlasDestinations[(currentIndex + 1) % atlasDestinations.length] ?? atlasDestinations[0];
    state.selectedAtlasLandmarkId = next.id;
    void prepareBackgroundMusicDestination(next.id);
    atlasSubsceneId = null;
    saveState(state);
    window.location.hash = `#/atlas/landmark/${next.id}`;
  }
  if (action === "atlas-subscene") {
    atlasSubsceneId = target?.dataset.subsceneId ?? null;
    render();
  }
  if (action === "atlas-panorama") {
    atlasSubsceneId = null;
    render();
  }
  if (action === "theme-scene") {
    const route = getAppRoute();
    const theme = route.view === "theme-landmark" ? getThemeFromDb(route.themeId) : getSelectedTheme();
    const mapView = getMapView(theme);
    const sceneId = target?.dataset.sceneId ?? null;
    const sceneIndex = theme.scenes.findIndex(scene => scene.id === sceneId);
    if (sceneIndex >= 0 && sceneIndex < mapView.coloredSegmentIds.length) {
      themeSceneId = sceneId;
      render();
    }
  }
  if (action === "theme-panorama") {
    themeSceneId = null;
    render();
  }
  if (action === "atlas-zoom-in") {
    themeAtlasZoom = clampZoom(themeAtlasZoom + themeAtlasZoomStep);
    render();
  }
  if (action === "atlas-zoom-out") {
    themeAtlasZoom = clampZoom(themeAtlasZoom - themeAtlasZoomStep);
    render();
  }
  if (action === "atlas-zoom-reset") {
    themeAtlasZoom = 1;
    render();
  }
  if (action === "select-theme") {
    const theme = getThemeFromDb(target?.dataset.themeId);
    if (!theme || !isThemeUnlocked(theme)) return;
    state.selectedThemeId = theme.id;
    void prepareBackgroundMusicDestination(theme.id);
    ensureThemeAssets(theme.id);
    saveState(state);
    render();
  }
  if (action === "world-map-zoom-in") {
    atlasWorldZoom = clampZoom(atlasWorldZoom + themeAtlasZoomStep);
    render();
  }
  if (action === "world-map-zoom-out") {
    atlasWorldZoom = clampZoom(atlasWorldZoom - themeAtlasZoomStep);
    render();
  }
  if (action === "world-map-zoom-reset") {
    atlasWorldZoom = 1;
    render();
  }
  if (action === "open-theme-map") {
    petPickerOpen = false;
    window.location.hash = "#/phase1";
  }
  if (action === "enter-theme") {
    const theme = getThemeFromDb(target?.dataset.themeId);
    if (!isThemeUnlocked(theme)) return;
    state.selectedThemeId = theme.id;
    confirmBackgroundMusicDestination(theme.id);
    themeSceneId = null;
    petPickerOpen = false;
    detailsOpen = false;
    ensureThemeAssets(theme.id);
    saveState(state);
    window.location.hash = `#/theme/${theme.id}`;
  }
  if (action === "mine-clear-filters") {
    mineFilters = {
      phase: "all",
      destinationId: "all",
      timeRange: "all",
      completion: "all",
      rarity: "all"
    };
    minePage = 1;
    editingPostcardId = null;
    render();
  }
  if (action === "open-pet-picker") {
    settingsMenuOpen = false;
    dialogReturnFocusSelector = '[aria-label="打开设置"]';
    petPickerOpen = true;
    pendingFocusSelector = state.settings.hasChosenPet
      ? '.pet-picker-modal [data-action="close-pet-picker"]'
      : `.pet-picker-modal [data-pet-id="${CSS.escape(getSelectedPet().id)}"]`;
    render();
  }
  if (action === "close-pet-picker" && state.settings.hasChosenPet) {
    petPickerOpen = false;
    pendingFocusSelector = dialogReturnFocusSelector ?? '[aria-label="打开设置"]';
    render();
  }
  if (action === "choose-pet") {
    const pet = getPetById(target?.dataset.petId);
    state.settings.selectedPetId = pet.id;
    state.settings.hasChosenPet = true;
    petPickerOpen = false;
    pendingFocusSelector = dialogReturnFocusSelector ?? '[aria-label="打开设置"]';
    setState(state);
  }
  if (action === "start") {
    confirmBackgroundMusicDestination(state.selectedThemeId);
    ensureThemeAssets(state.selectedThemeId);
    requestTravelAction(
      { type: "start", phase: 1, destinationId: state.selectedThemeId, selectedItemIds: state.selectedItemIds },
      () => startTravel(state, state.selectedThemeId, state.selectedItemIds)
    );
  }
  if (action === "summon") {
    requestTravelAction({ type: "recall" }, () => summonTravel(state));
  }
  if (action === "continue") {
    requestTravelAction({ type: "continue" }, () => continueTravel(state));
  }
  if (action === "switch") {
    confirmBackgroundMusicDestination(state.selectedThemeId);
    requestTravelAction(
      { type: "start", phase: 1, destinationId: state.selectedThemeId, selectedItemIds: state.selectedItemIds },
      () => switchThemeAndStart(state, state.selectedThemeId, state.selectedItemIds)
    );
  }
  if (action === "dismiss-daily-rest") {
    requestTravelAction(
      { type: "dismiss_daily_notice", noticeSequence: state.dailyCheckin?.noticeSequence ?? 0 },
      () => dismissDailyCheckinNotice(state)
    );
  }
  if (action === "cycle-theme") {
    const unlockedThemes = themes.filter(isThemeUnlocked);
    const currentIndex = unlockedThemes.findIndex(theme => theme.id === state.selectedThemeId);
    const nextTheme = unlockedThemes[(currentIndex + 1) % unlockedThemes.length] ?? unlockedThemes[0];
    state.selectedThemeId = nextTheme.id;
    void prepareBackgroundMusicDestination(nextTheme.id);
    ensureThemeAssets(state.selectedThemeId);
    saveState(state);
    render();
  }
  if (action === "toggle-hide") {
    state.settings.isHidden = !state.settings.isHidden;
    setState(state);
  }
  if (action === "toggle-pause") {
    state.settings.isPaused = !state.settings.isPaused;
    if (window.desktopBridge) {
      window.desktopBridge.setPaused(state.settings.isPaused);
    }
    setState(state);
  }
  if (action === "toggle-live-weather") {
    state.settings.liveWeatherEnabled = !state.settings.liveWeatherEnabled;
    if (!state.settings.liveWeatherEnabled) {
      state.settings.hasGrantedLiveWeatherConsent = false;
      state.localWeather = {
        ...createInitialLiveWeatherState(),
        status: "disabled"
      };
      setState(state);
    } else {
      state.settings.hasGrantedLiveWeatherConsent = true;
      state.localWeather = createInitialLiveWeatherState();
      saveState(state);
      render();
      startFirstLaunchWeatherRequest();
    }
  }
  if (action === "update-home-time-zone") {
    updateDailyCheckinHomeTimeZone(state, getCurrentTimeZone());
    setState(state);
  }
  if (action === "open-privacy" && window.desktopBridge?.openPrivacy) {
    window.desktopBridge.openPrivacy().catch(error => console.warn("Failed to open the Itsees privacy policy", error));
  }
  if (action === "desktop-toggle-top" && window.desktopBridge) {
    window.desktopBridge.toggleAlwaysOnTop().then(isAlwaysOnTop => {
      desktopState = { ...desktopState, isDesktop: true, isAlwaysOnTop };
      render();
    });
  }
  if (action === "desktop-toggle-window" && window.desktopBridge) {
    window.desktopBridge.toggleWindow();
  }
  if (action === "reset") {
    settingsMenuOpen = false;
    resetConfirmOpen = true;
    pendingFocusSelector = '.journal-confirm-modal [data-action="cancel-reset"]';
    render();
  }
  if (action === "cancel-reset") {
    resetConfirmOpen = false;
    settingsMenuOpen = true;
    pendingFocusSelector = '[data-action="reset"]';
    render();
  }
  if (action === "confirm-reset") {
    resetConfirmOpen = false;
    packLibraryOpen = false;
    state = applyAcceptanceScenario(resetState(), acceptanceScenario);
    onboardingStep = getRequiredOnboardingStep();
    activeView = "travel";
    mineView = "album";
    minePage = 1;
    mineFilters = {
      phase: "all",
      destinationId: "all",
      timeRange: "all",
      completion: "all",
      rarity: "all"
    };
    window.location.hash = "#/travel";
    if (isPhase2Acceptance) window.location.hash = "#/map/phase2";
    render();
    startFirstLaunchWeatherRequest();
  }
}

function clampZoom(value) {
  return Math.min(themeAtlasMaxZoom, Math.max(themeAtlasMinZoom, Number(value.toFixed(2))));
}

function ensureThemeAssets(themeId) {
  if (preloadedThemeAssets.has(themeId)) return;
  preloadedThemeAssets.set(themeId, preloadThemeAssets(themeId));
}

function setupDesktopBridge() {
  window.addEventListener("itsees:local-state-save-failed", () => {
    showSharedStateNotice("本机存储空间不足，最新旅行进度可能无法保存；请释放一些磁盘空间后重试。");
  });
  if (!window.desktopBridge || isPhase2Acceptance) return;
  persistDesktopLocale();
  window.desktopBridge.getState().then(applyDesktopState);
  window.desktopBridge.onState(applyDesktopState);
  window.desktopBridge.getTravelState?.()
    .then(savedState => {
      if (savedState) applySharedTravelState(savedState);
      else window.desktopBridge.saveTravelState?.(state);
    })
    .catch(error => console.warn("Failed to load shared desktop travel state", error));
  window.desktopBridge.onTravelState?.(applySharedTravelState);
  window.desktopBridge.onMusicPackStatus?.(applyMusicPackStatus);
  window.desktopBridge.getMusicCacheStatus?.()
    .then(summary => {
      musicCacheSummary = summary;
      for (const destinationId of summary.destinations ?? []) {
        const isComplete = summary.completeDestinations?.includes(destinationId);
        musicPackStates.set(destinationId, {
          destinationId,
          state: isComplete ? "ready" : "partial",
          backgroundDownloading: false
        });
      }
      syncBackgroundMusicRuntime();
      updateBackgroundMusicButton();
    })
    .catch(error => console.warn("Failed to read the music cache status", error));
  window.addEventListener("itsees:shared-state-conflict", event => {
    handleSharedStateConflict(event.detail?.state);
  });
  window.addEventListener("itsees:shared-state-save-failed", event => {
    const timedOut = event.detail?.code === "ITSEES_STATE_LOCK_TIMEOUT";
    showSharedStateNotice(timedOut
      ? "共享存档正被另一个 Itsees 进程占用，本次更改已保留在本机；请稍后再操作一次。"
      : "共享存档暂时无法写入，本次更改已保留在本机；请稍后再操作一次。");
  });
  window.desktopBridge.onSetPaused(paused => {
    const nextPaused = Boolean(paused);
    if (state.settings.isPaused === nextPaused) return;
    state.settings.isPaused = nextPaused;
    saveState(state);
    render();
  });
}

function persistDesktopLocale() {
  if (!hasChosenLocale()) return;
  window.desktopBridge?.setLocale?.(getLocale())
    .catch(error => console.warn("Failed to persist the desktop locale", error));
}

function applySharedTravelState(savedState) {
  const previousRenderKey = getCompactPetRenderKey(state);
  const nextState = migrateState(savedState);
  const nextRenderKey = getCompactPetRenderKey(nextState);
  state = nextState;
  cacheState(state);
  onboardingStep = getRequiredOnboardingStep();
  if (isLightweightPetMode() && previousRenderKey === nextRenderKey) return;
  render();
}

function applyDesktopState(nextDesktopState) {
  const wasLightweight = isLightweightPetMode();
  const nextPaused = Boolean(nextDesktopState.isPaused);
  const pauseChanged = state.settings.isPaused !== nextPaused;
  desktopState = { ...desktopState, ...nextDesktopState, isDesktop: true };
  if (isPetWindow || nextDesktopState.hasCompletedLaunchSplash) {
    showThenDismissLaunchSkeleton({ immediate: true });
  } else if (nextDesktopState.isWindowVisible) {
    showThenDismissLaunchSkeleton();
  }
  state.settings.isPaused = nextPaused;

  if (isLightweightPetMode() && !pauseChanged) return;

  if (wasLightweight && !isLightweightPetMode()) {
    state = loadState();
    onboardingStep = getRequiredOnboardingStep();
  } else if (pauseChanged) {
    saveState(state);
  }

  render();
}

function bindPetDrag() {
  if (isLightweightPetMode()) return;
  const pet = app.querySelector("[data-pet]");
  if (!pet) return;
  let dragging = false;
  let offset = { x: 0, y: 0 };
  pet.addEventListener("pointerdown", event => {
    dragging = true;
    pet.setPointerCapture(event.pointerId);
    offset = {
      x: event.clientX - pet.offsetLeft,
      y: event.clientY - pet.offsetTop
    };
  });
  pet.addEventListener("pointermove", event => {
    if (!dragging) return;
    const x = Math.min(window.innerWidth - 120, Math.max(8, event.clientX - offset.x));
    const y = Math.min(window.innerHeight - 120, Math.max(8, event.clientY - offset.y));
    pet.style.left = `${x}px`;
    pet.style.top = `${y}px`;
    state.settings.petPosition = { x, y };
  });
  pet.addEventListener("pointerup", () => {
    dragging = false;
    saveState(state);
  });
}

function startFirstLaunchWeatherRequest() {
  if (!state.settings.liveWeatherEnabled || !state.settings.hasGrantedLiveWeatherConsent) return;
  if (!shouldRefreshLiveWeatherOnOpen({
    isRequestInFlight: Boolean(firstLaunchWeatherPromise),
    existingStatus: state.localWeather?.status,
    isPetWindow
  })) return;

  state.localWeather = {
    ...(state.localWeather ?? {}),
    status: "loading",
    requestedAt: new Date().toISOString(),
    error: null
  };
  saveState(state);
  render();

  firstLaunchWeatherPromise = fetchFirstLaunchWeather()
    .then(localWeather => {
      state.localWeather = localWeather;
      saveState(state);
      render();
    })
    .catch(error => {
      console.warn("Failed to fetch first launch weather", error);
      state.localWeather = {
        ...(state.localWeather ?? {}),
        status: "failed",
        hasRequested: true,
        updatedAt: new Date().toISOString(),
        snapshot: null,
        error: normalizeWeatherError(error)
      };
      saveState(state);
      render();
    })
    .finally(() => {
      firstLaunchWeatherPromise = null;
    });
}

function normalizeWeatherError(error) {
  return {
    message: error instanceof Error ? error.message : "Unknown live weather error"
  };
}

function bindLightweightPetEvents() {
  app.querySelector('[data-action="toggle-language"]')?.addEventListener("click", () => {
    toggleLocale();
    persistDesktopLocale();
    render();
  });
  const pet = app.querySelector("[data-pet]");
  if (!window.desktopBridge) return;
  pet?.addEventListener("dblclick", () => {
    window.desktopBridge.restoreWindow();
  });
  pet?.addEventListener("pointerdown", event => {
    if (event.button !== 0 || !window.desktopBridge.movePetWindowBy) return;
    let previousScreenX = event.screenX;
    let previousScreenY = event.screenY;
    pet.setPointerCapture(event.pointerId);

    const movePetWindow = moveEvent => {
      const deltaX = moveEvent.screenX - previousScreenX;
      const deltaY = moveEvent.screenY - previousScreenY;
      previousScreenX = moveEvent.screenX;
      previousScreenY = moveEvent.screenY;
      if (deltaX || deltaY) window.desktopBridge.movePetWindowBy(deltaX, deltaY);
    };
    const finishPetWindowDrag = () => {
      pet.removeEventListener("pointermove", movePetWindow);
      pet.removeEventListener("pointerup", finishPetWindowDrag);
      pet.removeEventListener("pointercancel", finishPetWindowDrag);
      window.desktopBridge.finishPetWindowDrag?.();
    };

    pet.addEventListener("pointermove", movePetWindow);
    pet.addEventListener("pointerup", finishPetWindowDrag);
    pet.addEventListener("pointercancel", finishPetWindowDrag);
  });
}

function tickTravelClock() {
  if (document.visibilityState !== "visible") return;
  if (state.activeTravel?.status !== "traveling" || state.settings.isPaused) return;

  if (isLightweightPetMode()) {
    const completedState = completeActiveTravelIfDue(state);
    if (completedState === state) return;
    if (!requestDueTravelCompletion()) {
      state = completedState;
      saveState(state);
      render();
    }
    return;
  }

  const completedState = completeActiveTravelIfDue(state);
  if (completedState !== state) {
    if (!requestDueTravelCompletion()) {
      state = completedState;
      saveState(state);
      render();
    }
    return;
  }

  if (updateLiveTravelProgress()) return;
}

setInterval(tickTravelClock, 1000);

window.addEventListener("storage", () => {
  const previousRenderKey = getCompactPetRenderKey(state);
  const nextState = applyAcceptanceScenario(loadState(), acceptanceScenario);
  const nextRenderKey = getCompactPetRenderKey(nextState);
  state = nextState;
  onboardingStep = getRequiredOnboardingStep();
  if (isLightweightPetMode() && previousRenderKey === nextRenderKey) return;
  render();
});

function resetRouteScroll() {
  const scrollingElement = document.scrollingElement ?? document.documentElement;
  scrollingElement.scrollTop = 0;
  scrollingElement.scrollLeft = 0;
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", () => {
  // Reset before replacing the route DOM so Electron never paints the new
  // page at the previous page's deep scroll position. Keep the next-frame
  // reset as a guard for late layout changes from decoded images.
  resetRouteScroll();
  render();
  requestAnimationFrame(resetRouteScroll);
});

if (!state || !state.version) {
  state = applyAcceptanceScenario(createInitialState(), acceptanceScenario);
}

if (isPhase2Acceptance && (!window.location.hash || window.location.hash === "#/travel")) {
  window.location.hash = "#/map/phase2";
}

setupDesktopBridge();
startFirstLaunchWeatherRequest();
if (!firstLaunchWeatherPromise) render();
loadAtlasWorldScenes()
  .then(() => {
    const route = getAppRoute();
    if (["atlas-landmark", "mine"].includes(route.view) || (route.view === "map" && route.mapPhase === 2)) render();
  })
  .catch(error => console.warn("Atlas image world unavailable", error));

if (!window.desktopBridge || isPhase2Acceptance) {
  requestAnimationFrame(() => requestAnimationFrame(() => showThenDismissLaunchSkeleton()));
}
