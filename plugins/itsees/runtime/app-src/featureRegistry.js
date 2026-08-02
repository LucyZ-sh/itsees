import { themes } from "./content.js";
import { listAtlasDestinations } from "./atlasContent.js";

export const FEATURE_PACKS = Object.freeze({
  "phase1-backpack": Object.freeze({
    id: "phase1-backpack",
    phase: 1,
    name: "Backpack",
    status: "built_in",
    dependencies: []
  }),
  "phase2-atlas": Object.freeze({
    id: "phase2-atlas",
    phase: 2,
    name: "Atlas",
    dependencies: ["phase1-backpack"]
  })
});

export const PHASE1_THEME_IDS = Object.freeze(themes.map(theme => theme.id));
const ATLAS_DESTINATIONS = Object.freeze(listAtlasDestinations());
export const PHASE2_LANDMARK_IDS = Object.freeze(ATLAS_DESTINATIONS.map(destination => destination.id));

export function getPhase1Completion(state) {
  const completedThemeIds = PHASE1_THEME_IDS.filter(themeId => {
    const theme = themes.find(item => item.id === themeId);
    const progress = state?.themeProgress?.[themeId];
    if (!theme || !progress?.isFullyColored || progress.progressPercent < 100) return false;
    return theme.mapSegments.every(segment => progress.coloredSegmentIds?.includes(segment.id));
  });

  return {
    phase: 1,
    completedThemeIds,
    requiredThemeIds: [...PHASE1_THEME_IDS],
    completedThemeCount: completedThemeIds.length,
    requiredThemeCount: PHASE1_THEME_IDS.length,
    isComplete: completedThemeIds.length === PHASE1_THEME_IDS.length
  };
}

export function getFeaturePackState(state, featurePackId) {
  const manifest = FEATURE_PACKS[featurePackId];
  if (!manifest) return { id: featurePackId, status: "retired" };
  if (featurePackId === "phase1-backpack") return { ...manifest, status: "built_in" };

  if (featurePackId === "phase2-atlas") {
    const completion = getPhase1Completion(state);
    return {
      ...manifest,
      status: completion.isComplete ? "enabled" : "blocked",
      completion,
      reason: completion.isComplete ? null : "phase1_incomplete"
    };
  }

  return { id: featurePackId, status: "retired" };
}

export function canEnterFeaturePack(state, featurePackId) {
  return ["built_in", "enabled"].includes(getFeaturePackState(state, featurePackId).status);
}

export function getPhase2Completion(state) {
  const completedLandmarkIds = ATLAS_DESTINATIONS.filter(destination => {
    const progress = state?.atlasProgress?.[destination.id];
    if (!progress?.isFullyColored || progress.progressPercent < 100) return false;
    return destination.mapSegments.every(segment => progress.coloredSegmentIds?.includes(segment.id));
  }).map(destination => destination.id);

  return {
    phase: 2,
    completedLandmarkIds,
    requiredLandmarkIds: [...PHASE2_LANDMARK_IDS],
    completedLandmarkCount: completedLandmarkIds.length,
    requiredLandmarkCount: PHASE2_LANDMARK_IDS.length,
    isComplete: completedLandmarkIds.length === PHASE2_LANDMARK_IDS.length
  };
}
