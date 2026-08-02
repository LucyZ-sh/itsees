import assert from "node:assert/strict";
import test from "node:test";
import {
  getHomeRecommendationPhase,
  rankHomeDestinations
} from "../app/src/homeRecommendations.js";

test("an active Phase 2 journey takes over the home recommendations", () => {
  assert.equal(getHomeRecommendationPhase({
    activeTravel: { phase: 2, status: "traveling", destinationId: "eu_alps" },
    travels: [{ phase: 1, status: "completed", themeId: "T15" }],
    atlasProgress: {}
  }), 2);
});

test("saved Phase 2 progress keeps the home in the real-world chapter", () => {
  assert.equal(getHomeRecommendationPhase({
    activeTravel: null,
    travels: [{ phase: 1, status: "completed", themeId: "T15" }],
    atlasProgress: { eu_alps: { progressPercent: 25 } }
  }), 2);
});

test("home destinations rank current, selected, in-progress, new, then completed", () => {
  const destinations = ["complete", "new", "progress-low", "selected", "active", "progress-high"]
    .map(id => ({ id }));
  const ranked = rankHomeDestinations(destinations, {
    selectedId: "selected",
    activeTravel: { phase: 2, status: "recalled", destinationId: "active" },
    progressById: {
      complete: { progressPercent: 100, isFullyColored: true },
      "progress-low": { progressPercent: 25 },
      "progress-high": { progressPercent: 75 }
    }
  });

  assert.deepEqual(ranked.map(item => item.id), [
    "active",
    "selected",
    "progress-high",
    "progress-low",
    "new",
    "complete"
  ]);
});
