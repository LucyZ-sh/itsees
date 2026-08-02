import { themes } from "./content.js?v=inventory-v5";

export const ACCEPTANCE_SCENARIO_PARAM = "acceptance";
export const PHASE2_ACCEPTANCE_SCENARIO = "phase2";

export function getAcceptanceScenario(locationLike = globalThis.location) {
  const search = typeof locationLike?.search === "string" ? locationLike.search : "";
  const scenario = new URLSearchParams(search).get(ACCEPTANCE_SCENARIO_PARAM);
  return scenario === PHASE2_ACCEPTANCE_SCENARIO ? scenario : null;
}

export function applyAcceptanceScenario(state, scenario = getAcceptanceScenario(), now = new Date()) {
  if (scenario !== PHASE2_ACCEPTANCE_SCENARIO) return state;

  const updatedAt = now.toISOString();
  const themeProgress = { ...(state.themeProgress ?? {}) };
  for (const theme of themes) {
    themeProgress[theme.id] = {
      themeId: theme.id,
      progressPercent: 100,
      coloredSegmentIds: theme.mapSegments.map(segment => segment.id),
      isFullyColored: true,
      lastTravelId: `acceptance-phase1-${theme.id}`,
      updatedAt
    };
  }

  return {
    ...state,
    updatedAt,
    selectedAtlasLandmarkId: state.selectedAtlasLandmarkId ?? "fr_paris",
    themeProgress,
    settings: {
      ...state.settings,
      hasChosenPet: true,
      hasCompletedOnboarding: true,
      hasChosenBackgroundMusic: true
    },
    enabledFeaturePackIds: [...new Set([
      ...(state.enabledFeaturePackIds ?? []),
      "phase1-backpack",
      "phase2-atlas"
    ])]
  };
}
