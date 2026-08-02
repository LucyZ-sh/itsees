import assert from "node:assert/strict";
import test from "node:test";

import { themes } from "../app/src/content.js";
import {
  completeActiveTravelIfDue,
  createInitialState,
  startTravel,
  summonTravel
} from "../app/src/travelEngine.js";

function after(minutes, date) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function unlockAtlas(state, at) {
  for (const theme of themes) {
    state.themeProgress[theme.id] = {
      themeId: theme.id,
      progressPercent: 100,
      coloredSegmentIds: theme.mapSegments.map(segment => segment.id),
      isFullyColored: true,
      lastTravelId: `complete-${theme.id}`,
      updatedAt: at.toISOString()
    };
  }
  return state;
}

test("exact Phase 1 and Phase 2 segment boundaries unlock once and only once", () => {
  const start = new Date(2026, 6, 15, 10, 0, 0);

  let phase1 = createInitialState();
  phase1 = startTravel(phase1, "T01", phase1.selectedItemIds, start);
  phase1 = summonTravel(phase1, after(20, start));
  assert.equal(phase1.activeTravel.coloredSegmentIds.length, 1);
  assert.equal(phase1.album.length, 1);
  assert.equal(phase1.dailyCheckin.usedMinutes, 20);

  let phase2 = unlockAtlas(createInitialState(), start);
  phase2 = startTravel(phase2, "fr_paris", phase2.selectedItemIds, start, { phase: 2 });
  phase2 = summonTravel(phase2, after(60, start));
  assert.equal(phase2.activeTravel.coloredSegmentIds.length, 1);
  assert.equal(phase2.album.length, 1);
  assert.equal(phase2.dailyCheckin.usedMinutes, 60);
});

test("duplicate start, summon, and completion actions are idempotent", () => {
  const start = new Date(2026, 6, 15, 10, 0, 0);
  let state = createInitialState();
  state = startTravel(state, "T01", state.selectedItemIds, start);
  const activeId = state.activeTravel.id;
  const analyticsCount = state.analytics.length;

  const duplicateStart = startTravel(state, "T02", state.selectedItemIds, after(1, start));
  assert.equal(duplicateStart, state);
  assert.equal(duplicateStart.activeTravel.id, activeId);
  assert.equal(duplicateStart.analytics.length, analyticsCount);

  state = summonTravel(state, after(120, start));
  const recalledCounts = {
    album: state.album.length,
    souvenirs: state.souvenirAcquisitions.length,
    travels: state.travels.length,
    usedMinutes: state.dailyCheckin.usedMinutes
  };
  const duplicateSummon = summonTravel(state, after(121, start));
  assert.equal(duplicateSummon, state);
  assert.deepEqual({
    album: duplicateSummon.album.length,
    souvenirs: duplicateSummon.souvenirAcquisitions.length,
    travels: duplicateSummon.travels.length,
    usedMinutes: duplicateSummon.dailyCheckin.usedMinutes
  }, recalledCounts);

  let completed = createInitialState();
  completed = startTravel(completed, "T01", completed.selectedItemIds, start);
  completed = completeActiveTravelIfDue(completed, after(240, start));
  const completedCounts = {
    album: completed.album.length,
    souvenirs: completed.souvenirAcquisitions.length,
    travels: completed.travels.length,
    usedMinutes: completed.dailyCheckin.usedMinutes
  };
  const duplicateCompletion = completeActiveTravelIfDue(completed, after(241, start));
  assert.equal(duplicateCompletion, completed);
  assert.deepEqual({
    album: duplicateCompletion.album.length,
    souvenirs: duplicateCompletion.souvenirAcquisitions.length,
    travels: duplicateCompletion.travels.length,
    usedMinutes: duplicateCompletion.dailyCheckin.usedMinutes
  }, completedCounts);
});

test("an active journey crossing midnight receives the new daily window instead of stopping at yesterday's remainder", () => {
  const dayStart = new Date(2026, 6, 15, 18, 0, 0);
  let state = createInitialState();
  state = startTravel(state, "T01", state.selectedItemIds, dayStart);
  state = summonTravel(state, after(220, dayStart));
  assert.equal(state.dailyCheckin.usedMinutes, 220);

  const beforeMidnight = new Date(2026, 6, 15, 23, 50, 0);
  state = startTravel(state, "T02", state.selectedItemIds, beforeMidnight);
  assert.equal(state.activeTravel.dailyCheckinLimitMinutes, 20);

  const afterMidnight = new Date(2026, 6, 16, 0, 10, 0);
  const refreshed = completeActiveTravelIfDue(state, afterMidnight);
  assert.notEqual(refreshed, state);
  assert.equal(refreshed.activeTravel.status, "traveling");
  assert.equal(refreshed.activeTravel.dailyCheckinDate, "2026-07-16");
  assert.equal(refreshed.activeTravel.dailyCheckinLimitMinutes, 240);
  assert.equal(refreshed.dailyCheckin.usedMinutes, 0);
  assert.equal(refreshed.dailyCheckin.noticePending, false);
});

test("a wall-clock rollback cannot reduce durable travel progress or reset the ledger", () => {
  const startedAt = new Date("2026-07-15T10:00:00.000Z");
  let state = createInitialState();
  state = startTravel(state, "T01", state.selectedItemIds, startedAt);
  state.activeTravel.accumulatedTravelMinutes = 40;
  state.activeTravel.lastObservedAt = new Date("2026-07-15T11:00:00.000Z").toISOString();
  state.dailyCheckin.usedMinutes = 20;
  const rolledBack = completeActiveTravelIfDue(state, new Date("2026-07-15T09:00:00.000Z"));
  assert.equal(rolledBack.activeTravel.status, "traveling");
  assert.equal(rolledBack.activeTravel.accumulatedTravelMinutes, 40);
  assert.equal(rolledBack.dailyCheckin.usedMinutes, 20);
  assert.equal(rolledBack.analytics.filter(event => event.name === "travel_clock_rollback_detected").length, 1);
  const repeated = completeActiveTravelIfDue(rolledBack, new Date("2026-07-15T09:30:00.000Z"));
  assert.equal(repeated.analytics.filter(event => event.name === "travel_clock_rollback_detected").length, 1);
});
