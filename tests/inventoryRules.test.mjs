import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { inventoryItems, themes } from "../app/src/content.js";
import {
  getCompletedThemeCount,
  getInventoryUnlockState,
  getPackRewardSummary,
  listUnlockedInventoryItems,
  normalizePackSelection
} from "../app/src/inventoryRules.js";
import { resolveSouvenirRewards } from "../app/src/souvenirRewards.js";
import { createInitialState, startTravel } from "../app/src/travelEngine.js";

function completeThemes(state, count) {
  for (const theme of themes.slice(0, count)) {
    state.themeProgress[theme.id] = {
      themeId: theme.id,
      progressPercent: 100,
      coloredSegmentIds: theme.mapSegments.map(segment => segment.id),
      isFullyColored: true
    };
  }
  return state;
}

test("browser module graph uses the latest weather BGM cache version", () => {
  const indexSource = readFileSync(new URL("../app/index.html", import.meta.url), "utf8");
  const appSource = readFileSync(new URL("../app/src/app.js", import.meta.url), "utf8");
  const repositorySource = readFileSync(new URL("../app/src/contentRepository.js", import.meta.url), "utf8");

  assert.match(indexSource, /app\.js\?v=weather-bgm-v55/);
  assert.match(appSource, /backgroundMusic\.js\?v=weather-bgm-v4/);
  assert.match(appSource, /contentRepository\.js\?v=asset-webp-v6/);
  assert.match(appSource, /travelEngine\.js\?v=scene-postcards-v2/);
  assert.match(appSource, /storage\.js\?v=codex-plugin-state-v4/);
  assert.match(repositorySource, /content\.js\?v=inventory-v6/);
});

test("new users start with four unlocked pack items and two equipped slots", () => {
  const state = createInitialState();

  assert.deepEqual(listUnlockedInventoryItems(state).map(item => item.id), [
    "food-riceball",
    "food-water",
    "tool-camera",
    "tool-umbrella"
  ]);
  assert.deepEqual(normalizePackSelection(state, state.selectedItemIds), ["food-riceball", "tool-camera"]);
});

test("pack items unlock from completed theme milestones", () => {
  const state = completeThemes(createInitialState(), 6);
  const candy = inventoryItems.find(item => item.id === "food-candy");
  const stampbook = inventoryItems.find(item => item.id === "tool-stampbook");

  assert.equal(getCompletedThemeCount(state), 6);
  assert.equal(getInventoryUnlockState(candy, state).isUnlocked, true);
  assert.equal(getInventoryUnlockState(stampbook, state).isUnlocked, false);
  assert.equal(getInventoryUnlockState(stampbook, state).remainingThemeCount, 4);
  assert.equal(listUnlockedInventoryItems(state).length, 10);
});

test("pack selection keeps one unlocked food and one unlocked tool", () => {
  const state = completeThemes(createInitialState(), 10);

  assert.deepEqual(
    normalizePackSelection(state, ["food-candy", "food-bento", "tool-binoculars", "tool-stampbook"]),
    ["food-candy", "tool-binoculars"]
  );
  assert.deepEqual(
    normalizePackSelection(createInitialState(), ["food-candy", "tool-stampbook"]),
    ["food-riceball", "tool-camera"]
  );
});

test("travel engine rejects locked and over-capacity selections", () => {
  const state = createInitialState();
  const next = startTravel(
    state,
    "T01",
    ["food-water", "food-candy", "tool-umbrella", "tool-stampbook"],
    new Date("2026-07-15T00:00:00.000Z")
  );

  assert.deepEqual(next.activeTravel.selectedItemIds, ["food-water", "tool-umbrella"]);
  assert.deepEqual(next.selectedItemIds, ["food-water", "tool-umbrella"]);
});

test("candy and stampbook share one non-stacking souvenir bonus", () => {
  const candy = getPackRewardSummary(["food-candy"]);
  const both = getPackRewardSummary(["food-candy", "tool-stampbook"]);

  assert.deepEqual(both, candy);
  assert.equal(candy.rareWeightModifier, 1.25);
  assert.equal(candy.extraSouvenirChance, 0.35);

  const input = {
    seed: "non-stacking-pack-bonus",
    phase: 1,
    themeId: "T08",
    progressPercent: 100,
    ownedCounts: {}
  };
  assert.deepEqual(
    resolveSouvenirRewards({ ...input, selectedItemIds: ["food-candy"] }),
    resolveSouvenirRewards({ ...input, selectedItemIds: ["food-candy", "tool-stampbook"] })
  );
});
