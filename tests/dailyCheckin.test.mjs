import assert from "node:assert/strict";
import test from "node:test";
import { themes } from "../app/src/content.js";
import {
  DAILY_REST_MESSAGES,
  ensureDailyCheckinState,
  getLocalDateKey,
  updateDailyCheckinHomeTimeZone
} from "../app/src/dailyCheckin.js";
import {
  completeActiveTravelIfDue,
  continueTravel,
  createInitialState,
  dismissDailyCheckinNotice,
  startTravel,
  summonTravel
} from "../app/src/travelEngine.js";

const start = new Date("2026-07-15T01:00:00.000Z");

function after(minutes, date = start) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function unlockAtlas(state) {
  for (const theme of themes) {
    state.themeProgress[theme.id] = {
      themeId: theme.id,
      progressPercent: 100,
      coloredSegmentIds: theme.mapSegments.map(segment => segment.id),
      isFullyColored: true,
      lastTravelId: `complete-${theme.id}`,
      updatedAt: start.toISOString()
    };
  }
  return state;
}

function travelAndSummon(state, destinationId, elapsedMinutes, options = {}, startedAt = start) {
  const started = startTravel(state, destinationId, state.selectedItemIds, startedAt, options);
  return summonTravel(started, after(elapsedMinutes, startedAt));
}

test("the rest dialog has multiple distinct companion messages", () => {
  assert.ok(DAILY_REST_MESSAGES.length >= 4);
  assert.equal(new Set(DAILY_REST_MESSAGES.map(message => message.id)).size, DAILY_REST_MESSAGES.length);
  assert.equal(DAILY_REST_MESSAGES.every(message => message.title && message.body), true);
});

test("sub-threshold recalls do not consume the daily successful check-in budget", () => {
  let phase1 = createInitialState();
  phase1 = travelAndSummon(phase1, "T01", 19);

  assert.equal(phase1.dailyCheckin.usedMinutes, 0);
  assert.equal(phase1.dailyCheckin.entries.length, 0);
  assert.equal(phase1.album.length, 0);

  let phase2 = unlockAtlas(createInitialState());
  phase2 = travelAndSummon(phase2, "fr_paris", 59, { phase: 2 });

  assert.equal(phase2.dailyCheckin.usedMinutes, 0);
  assert.equal(phase2.album.length, 0);
});

test("successful check-ins are credited in phase-specific discrete minutes", () => {
  let phase1 = createInitialState();
  phase1 = travelAndSummon(phase1, "T01", 39);
  assert.equal(phase1.activeTravel.coloredSegmentIds.length, 1);
  assert.equal(phase1.dailyCheckin.usedMinutes, 20);

  let phase2 = unlockAtlas(createInitialState());
  phase2 = travelAndSummon(phase2, "fr_paris", 119, { phase: 2 });
  assert.equal(phase2.activeTravel.coloredSegmentIds.length, 1);
  assert.equal(phase2.dailyCheckin.usedMinutes, 60);
});

test("continuing a recalled journey credits only newly unlocked segments", () => {
  let state = createInitialState();
  state = travelAndSummon(state, "T01", 39);
  assert.equal(state.dailyCheckin.usedMinutes, 20);

  const continuedAt = after(40);
  state = continueTravel(state, continuedAt);
  state = summonTravel(state, after(21, continuedAt));

  assert.equal(state.activeTravel.coloredSegmentIds.length, 3);
  assert.equal(state.dailyCheckin.usedMinutes, 60);
  assert.deepEqual(state.dailyCheckin.entries.map(entry => entry.minutes), [20, 40]);
});

test("phase 1 and phase 2 share one 240 minute daily budget", () => {
  let state = unlockAtlas(createInitialState());
  state = travelAndSummon(state, "T01", 100);
  state = travelAndSummon(state, "fr_paris", 120, { phase: 2 }, after(130));
  state = travelAndSummon(state, "T02", 35, {}, after(260));

  assert.equal(state.dailyCheckin.usedMinutes, 240);
  assert.deepEqual(state.dailyCheckin.entries.map(entry => entry.minutes), [100, 120, 20]);
  assert.equal(state.dailyCheckin.noticePending, true);

  const activeTravelId = state.activeTravel.id;
  state = startTravel(state, "T03", state.selectedItemIds, after(300));
  assert.equal(state.activeTravel.id, activeTravelId);
  assert.equal(state.dailyCheckin.usedMinutes, 240);
});

test("phase 2 cannot start when the remaining budget is below sixty minutes", () => {
  let state = unlockAtlas(createInitialState());
  state = travelAndSummon(state, "T01", 200);
  state = dismissDailyCheckinNotice(state);
  const previousTravelId = state.activeTravel.id;

  state = startTravel(state, "fr_paris", state.selectedItemIds, after(210), { phase: 2 });

  assert.equal(state.activeTravel.id, previousTravelId);
  assert.equal(state.dailyCheckin.usedMinutes, 200);
  assert.equal(state.dailyCheckin.noticePending, true);
  assert.equal(state.dailyCheckin.noticeReason, "insufficient_phase_budget");
});

test("an active journey automatically settles when its remaining daily allowance is reached", () => {
  let state = createInitialState();
  state = travelAndSummon(state, "T01", 220);
  state = dismissDailyCheckinNotice(state);
  state = startTravel(state, "T02", state.selectedItemIds, after(230));
  state = completeActiveTravelIfDue(state, after(250));

  assert.equal(state.activeTravel.status, "recalled");
  assert.equal(state.activeTravel.completionReason, "daily_limit");
  assert.equal(state.dailyCheckin.usedMinutes, 240);
  assert.equal(state.dailyCheckin.noticePending, true);
});

test("the daily budget resets on the next local calendar day", () => {
  let state = createInitialState();
  state = travelAndSummon(state, "T01", 240);
  const nextDay = new Date("2026-07-16T01:00:00.000Z");
  state = startTravel(state, "T02", state.selectedItemIds, nextDay);

  assert.equal(state.activeTravel.status, "traveling");
  assert.equal(state.activeTravel.themeId, "T02");
  assert.equal(state.dailyCheckin.usedMinutes, 0);
  assert.equal(state.dailyCheckin.localDate, "2026-07-16");
});

test("daily date keys are anchored to the saved home time zone", () => {
  const instant = new Date("2026-08-01T18:00:00.000Z");
  assert.equal(getLocalDateKey(instant, "Asia/Tokyo"), "2026-08-02");
  assert.equal(getLocalDateKey(instant, "America/Los_Angeles"), "2026-08-01");
});

test("changing the home time zone cannot grant an immediate second ledger", () => {
  const instant = new Date("2026-08-01T18:00:00.000Z");
  const state = createInitialState();
  state.dailyCheckin = {
    ...state.dailyCheckin,
    homeTimeZone: "Asia/Tokyo",
    localDate: "2026-08-02",
    usedMinutes: 20,
    entries: [{ id: "daily-test", travelId: "travel-test", phase: 1, destinationId: "T01", minutes: 20, creditedAt: instant.toISOString() }]
  };
  updateDailyCheckinHomeTimeZone(state, "America/Los_Angeles", instant);
  assert.equal(state.dailyCheckin.homeTimeZone, "America/Los_Angeles");
  assert.equal(state.dailyCheckin.localDate, "2026-08-02");
  assert.equal(ensureDailyCheckinState(state, new Date("2026-08-02T18:00:00.000Z")).usedMinutes, 20);
  assert.equal(ensureDailyCheckinState(state, new Date("2026-08-03T18:00:00.000Z")).usedMinutes, 0);
});
