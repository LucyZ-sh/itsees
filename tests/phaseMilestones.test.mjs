import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { themes } from "../app/src/content.js";
import {
  getPhase1MilestoneSummary,
  shouldShowPhase2UnlockCelebration
} from "../app/src/phaseMilestones.js";
import { createInitialState } from "../app/src/travelEngine.js";

function completePhase1(state, updatedAt = "2026-07-01T08:00:00.000Z") {
  for (const theme of themes) {
    state.themeProgress[theme.id] = {
      themeId: theme.id,
      progressPercent: 100,
      coloredSegmentIds: theme.mapSegments.map(segment => segment.id),
      isFullyColored: true,
      lastTravelId: `complete-${theme.id}`,
      updatedAt
    };
  }
  return state;
}

test("the Phase 2 chapter celebration appears once after Phase 1 is complete", () => {
  const state = completePhase1(createInitialState());
  state.settings.hasCompletedOnboarding = true;

  assert.equal(shouldShowPhase2UnlockCelebration(state), true);
  state.settings.phase2UnlockCelebratedAt = "2026-07-15T08:00:00.000Z";
  assert.equal(shouldShowPhase2UnlockCelebration(state), false);
});

test("acceptance mode and existing Phase 2 progress suppress the chapter celebration", () => {
  const state = completePhase1(createInitialState());
  state.settings.hasCompletedOnboarding = true;

  assert.equal(shouldShowPhase2UnlockCelebration(state, { acceptanceMode: true }), false);
  state.atlasProgress.fr_paris = { progressPercent: 25, coloredSegmentIds: ["fr_paris-M01"] };
  assert.equal(shouldShowPhase2UnlockCelebration(state), false);
});

test("the Phase 1 milestone summary reports shared days and earned collections", () => {
  const state = completePhase1(createInitialState(), "2026-07-01T08:00:00.000Z");
  state.travels = [{ phase: 1, startedAt: "2026-07-01T08:00:00.000Z" }];
  state.album = [
    { phase: 1, createdAt: "2026-07-01T09:00:00.000Z" },
    { phase: 1, createdAt: "2026-07-02T09:00:00.000Z" },
    { phase: 2, createdAt: "2026-07-03T09:00:00.000Z" }
  ];
  state.souvenirAcquisitions = [
    { phase: 1, acquiredAt: "2026-07-02T09:00:00.000Z" },
    { phase: 2, acquiredAt: "2026-07-03T09:00:00.000Z" }
  ];

  assert.deepEqual(
    getPhase1MilestoneSummary(state, new Date("2026-07-15T07:59:59.000Z")),
    { togetherDays: 15, themeCount: 15, postcardCount: 2, souvenirCount: 1 }
  );
});

test("the chapter dialog owns focus, isolates the background, and respects reduced motion", async () => {
  const [appSource, themeSource] = await Promise.all([
    readFile(new URL("../app/src/app.js", import.meta.url), "utf8"),
    readFile(new URL("../app/warm-journal-theme.css", import.meta.url), "utf8")
  ]);
  assert.match(appSource, /phase2UnlockCelebrationOpen \? "inert" : ""/);
  assert.match(appSource, /data-action="enter-phase2-unlock" type="button" autofocus/);
  assert.match(themeSource, /prefers-reduced-motion: reduce/);
  assert.match(themeSource, /body:has\(\.phase2-unlock-backdrop\)/);
});
