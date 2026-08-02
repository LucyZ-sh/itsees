import assert from "node:assert/strict";
import test from "node:test";
import { themes } from "../app/src/content.js";
import {
  continueTravel,
  createInitialState,
  startTravel,
  summonTravel
} from "../app/src/travelEngine.js";

const startedAt = new Date("2026-07-11T00:00:00.000Z");

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function completePhase1(state) {
  for (const theme of themes) {
    state.themeProgress[theme.id] = {
      themeId: theme.id,
      progressPercent: 100,
      coloredSegmentIds: theme.mapSegments.map(segment => segment.id),
      isFullyColored: true,
      lastTravelId: `phase1-${theme.id}`,
      updatedAt: startedAt.toISOString()
    };
  }
  return state;
}

test("Atlas travel cannot start before phase 1 is complete", () => {
  const state = createInitialState();
  const next = startTravel(state, "fr_paris", state.selectedItemIds, startedAt, { phase: 2 });

  assert.equal(next.activeTravel, null);
  assert.deepEqual(next, state);
});

test("Atlas travel uses the shared recall and album lifecycle", () => {
  let state = completePhase1(createInitialState());
  state = startTravel(state, "fr_paris", state.selectedItemIds, startedAt, { phase: 2 });

  assert.equal(state.activeTravel.phase, 2);
  assert.equal(state.activeTravel.destinationId, "fr_paris");
  assert.equal(state.activeTravel.durationMinutes, 240);

  state = summonTravel(state, addMinutes(startedAt, 90));

  assert.equal(state.activeTravel.status, "recalled");
  assert.equal(state.activeTravel.progressPercent, 37.5);
  assert.equal(state.activeTravel.coloredSegmentIds.length, 1);
  assert.equal(state.atlasProgress.fr_paris.progressPercent, 37.5);
  assert.equal(state.album.length, 1);
  assert.equal(state.album[0].phase, 2);
  assert.equal(state.album[0].landmarkId, "fr_paris");
  assert.equal(state.album[0].weatherSnapshot.provider, "local_simulated");
});

test("Atlas travel can continue to a full real-landmark completion", () => {
  let state = completePhase1(createInitialState());
  state = startTravel(state, "jp_tokyo", state.selectedItemIds, startedAt, { phase: 2 });
  state = summonTravel(state, addMinutes(startedAt, 120));
  state = continueTravel(state, addMinutes(startedAt, 125));
  state = summonTravel(state, addMinutes(startedAt, 245));

  assert.equal(state.activeTravel.status, "completed");
  assert.equal(state.activeTravel.progressPercent, 100);
  assert.equal(state.atlasProgress.jp_tokyo.isFullyColored, true);
  assert.equal(state.atlasProgress.jp_tokyo.coloredSegmentIds.length, 4);
  assert.equal(state.album.filter(card => card.landmarkId === "jp_tokyo").length, 4);
  assert.equal(new Set(state.album.filter(card => card.landmarkId === "jp_tokyo").map(card => card.sceneId)).size, 4);
});
