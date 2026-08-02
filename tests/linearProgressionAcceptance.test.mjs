import assert from "node:assert/strict";
import test from "node:test";
import { themes } from "../app/src/content.js";
import { canEnterFeaturePack, getPhase1Completion } from "../app/src/featureRegistry.js";
import {
  completeActiveTravelIfDue,
  continueTravel,
  createInitialState,
  startTravel,
  summonTravel
} from "../app/src/travelEngine.js";

const epoch = new Date("2026-07-11T00:00:00.000Z");

function minutesAfter(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

test("a fresh save unlocks Atlas immediately after the fifteenth Phase 1 completion", () => {
  let state = createInitialState();

  assert.equal(getPhase1Completion(state).completedThemeCount, 0);
  assert.equal(canEnterFeaturePack(state, "phase2-atlas"), false);

  themes.forEach((theme, index) => {
    const startedAt = minutesAfter(epoch, index * 24 * 60);
    state = startTravel(state, theme.id, state.selectedItemIds, startedAt);
    state = completeActiveTravelIfDue(state, minutesAfter(startedAt, 240));

    assert.equal(state.themeProgress[theme.id].isFullyColored, true);
    assert.equal(state.themeProgress[theme.id].coloredSegmentIds.length, 12);
    assert.equal(getPhase1Completion(state).completedThemeCount, index + 1);
    assert.equal(canEnterFeaturePack(state, "phase2-atlas"), index === themes.length - 1);
  });

  assert.equal(state.travels.length, 15);
  assert.equal(state.album.length, 180);
});

test("the Atlas loop creates a recalled postcard, continues, and awards souvenirs", () => {
  let state = createInitialState();
  for (const theme of themes) {
    state.themeProgress[theme.id] = {
      themeId: theme.id,
      progressPercent: 100,
      coloredSegmentIds: theme.mapSegments.map(segment => segment.id),
      isFullyColored: true,
      lastTravelId: `phase1-${theme.id}`,
      updatedAt: epoch.toISOString()
    };
  }

  state.selectedAtlasLandmarkId = "fr_paris";
  state = startTravel(state, "fr_paris", state.selectedItemIds, epoch, { phase: 2 });
  state = summonTravel(state, minutesAfter(epoch, 120));

  const recalledCard = state.album[0];
  assert.equal(state.activeTravel.status, "recalled");
  assert.equal(recalledCard.phase, 2);
  assert.equal(recalledCard.landmarkId, "fr_paris");
  assert.match(recalledCard.sceneImageAsset, /assets\/atlas/);
  assert.ok(Object.keys(state.souvenirCounts).length > 0);

  state = continueTravel(state, minutesAfter(epoch, 125));
  state = summonTravel(state, minutesAfter(epoch, 245));

  assert.equal(state.activeTravel.status, "completed");
  assert.equal(state.atlasProgress.fr_paris.isFullyColored, true);
  assert.equal(state.album.filter(card => card.landmarkId === "fr_paris").length, 4);
  assert.equal(new Set(state.album.filter(card => card.landmarkId === "fr_paris").map(card => card.sceneId)).size, 4);
  assert.equal(state.travels.filter(travel => travel.landmarkId === "fr_paris").length, 2);
  assert.ok(Object.values(state.souvenirCounts).reduce((sum, count) => sum + count, 0) >= 3);
});
