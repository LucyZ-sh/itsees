import assert from "node:assert/strict";
import test from "node:test";
import { themes } from "../app/src/content.js";
import {
  applyAcceptanceScenario,
  getAcceptanceScenario,
  PHASE2_ACCEPTANCE_SCENARIO
} from "../app/src/acceptanceScenarios.js";
import { canEnterFeaturePack, getPhase1Completion, getPhase2Completion } from "../app/src/featureRegistry.js";
import { createInitialState } from "../app/src/travelEngine.js";

test("the phase 2 acceptance URL is recognized without accepting unknown scenarios", () => {
  assert.equal(getAcceptanceScenario({ search: "?acceptance=phase2" }), PHASE2_ACCEPTANCE_SCENARIO);
  assert.equal(getAcceptanceScenario({ search: "?acceptance=phase3" }), null);
  assert.equal(getAcceptanceScenario({ search: "" }), null);
});

test("the phase 2 acceptance scenario completes only phase 1 and skips onboarding", () => {
  const initial = createInitialState();
  const state = applyAcceptanceScenario(
    initial,
    PHASE2_ACCEPTANCE_SCENARIO,
    new Date("2026-08-02T00:00:00.000Z")
  );

  assert.notEqual(state, initial);
  assert.equal(getPhase1Completion(state).completedThemeCount, themes.length);
  assert.equal(canEnterFeaturePack(state, "phase2-atlas"), true);
  assert.equal(getPhase2Completion(state).completedLandmarkCount, 0);
  assert.equal(state.settings.hasChosenPet, true);
  assert.equal(state.settings.hasCompletedOnboarding, true);
  assert.equal(state.settings.hasChosenBackgroundMusic, true);
  assert.equal(initial.themeProgress.T01, undefined);
});
