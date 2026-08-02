import assert from "node:assert/strict";
import test from "node:test";
import { themes } from "../app/src/content.js";
import {
  canEnterFeaturePack,
  getFeaturePackState,
  getPhase1Completion,
  getPhase2Completion
} from "../app/src/featureRegistry.js";
import { listAtlasDestinations } from "../app/src/atlasContent.js";
import { createInitialState } from "../app/src/travelEngine.js";

function completeThemes(state, completedThemes) {
  for (const theme of completedThemes) {
    state.themeProgress[theme.id] = {
      themeId: theme.id,
      progressPercent: 100,
      coloredSegmentIds: theme.mapSegments.map(segment => segment.id),
      isFullyColored: true,
      lastTravelId: `test-${theme.id}`,
      updatedAt: "2026-07-11T00:00:00.000Z"
    };
  }
  return state;
}

test("Atlas remains blocked until all fifteen phase 1 themes are complete", () => {
  const state = completeThemes(createInitialState(), themes.slice(0, 14));
  const completion = getPhase1Completion(state);

  assert.equal(completion.completedThemeCount, 14);
  assert.equal(completion.requiredThemeCount, 15);
  assert.equal(completion.isComplete, false);
  assert.equal(canEnterFeaturePack(state, "phase2-atlas"), false);
  assert.equal(getFeaturePackState(state, "phase2-atlas").status, "blocked");
});

test("Atlas unlocks from complete persisted map progress", () => {
  const state = completeThemes(createInitialState(), themes);
  const completion = getPhase1Completion(state);

  assert.equal(completion.completedThemeCount, 15);
  assert.equal(completion.isComplete, true);
  assert.equal(canEnterFeaturePack(state, "phase2-atlas"), true);
  assert.equal(getFeaturePackState(state, "phase2-atlas").status, "enabled");
});

test("Atlas ignores incomplete segment lists and collectible counts", () => {
  const state = completeThemes(createInitialState(), themes);
  state.themeProgress.T15.coloredSegmentIds = state.themeProgress.T15.coloredSegmentIds.slice(0, 11);
  state.album = Array.from({ length: 500 }, (_, index) => ({ id: `card-${index}` }));
  state.souvenirCounts = { all: 999 };

  assert.equal(getPhase1Completion(state).completedThemeCount, 14);
  assert.equal(canEnterFeaturePack(state, "phase2-atlas"), false);
});

test("Phase 2 completion reflects every fully checked-in landmark", () => {
  const state = completeThemes(createInitialState(), themes);
  const destinations = listAtlasDestinations();
  for (const destination of destinations.slice(0, -1)) {
    state.atlasProgress[destination.id] = {
      landmarkId: destination.id,
      progressPercent: 100,
      coloredSegmentIds: destination.mapSegments.map(segment => segment.id),
      isFullyColored: true
    };
  }

  assert.equal(getPhase2Completion(state).completedLandmarkCount, destinations.length - 1);
  assert.equal(getPhase2Completion(state).isComplete, false);

  const last = destinations.at(-1);
  state.atlasProgress[last.id] = {
    landmarkId: last.id,
    progressPercent: 100,
    coloredSegmentIds: last.mapSegments.map(segment => segment.id),
    isFullyColored: true
  };

  assert.equal(getPhase2Completion(state).isComplete, true);
  assert.equal(getFeaturePackState(state, "phase3-postmark").status, "retired");
  assert.equal(canEnterFeaturePack(state, "phase3-postmark"), false);
});
