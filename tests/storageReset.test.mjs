import assert from "node:assert/strict";
import test from "node:test";

import { loadState, resetState, saveState } from "../app/src/storage.js";

const STORAGE_KEY = "shimejis-random-travel-mvp-state-v1";

test("resetState removes the complete persisted save and returns a fresh state", () => {
  const removedKeys = [];
  const previousLocalStorage = globalThis.localStorage;
  globalThis.localStorage = {
    removeItem(key) {
      removedKeys.push(key);
    }
  };

  try {
    const state = resetState();
    assert.deepEqual(removedKeys, [STORAGE_KEY]);
    assert.equal(state.version, 10);
    assert.equal(state.settings.liveWeatherEnabled, false);
    assert.equal(state.settings.hasGrantedLiveWeatherConsent, false);
    assert.equal(state.settings.backgroundMusicEnabled, false);
    assert.equal(state.settings.hasChosenBackgroundMusic, false);
    assert.equal(state.selectedThemeId, "T01");
    assert.equal(state.selectedAtlasLandmarkId, "fr_paris");
    assert.equal(state.settings.hasChosenPet, false);
    assert.equal(state.settings.hasCompletedOnboarding, false);
    assert.equal(state.settings.isHidden, false);
    assert.equal(state.settings.isPaused, false);
    assert.equal(state.activeTravel, null);
    assert.equal(state.lastRecalledTravel, null);
    assert.deepEqual(state.travels, []);
    assert.deepEqual(state.album, []);
    assert.deepEqual(state.souvenirCounts, {});
    assert.deepEqual(state.souvenirAcquisitions, []);
    assert.deepEqual(state.themeProgress, {});
    assert.deepEqual(state.atlasProgress, {});
    assert.deepEqual(state.analytics, []);
    assert.equal(state.dailyCheckin.usedMinutes, 0);
    assert.deepEqual(state.dailyCheckin.entries, []);
  } finally {
    if (previousLocalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousLocalStorage;
  }
});

test("storage failures and corrupted JSON fall back without crashing the app", () => {
  const previousLocalStorage = globalThis.localStorage;
  const previousWarn = console.warn;
  const warnings = [];
  console.warn = (...args) => warnings.push(args);

  try {
    globalThis.localStorage = {
      getItem() {
        return "{not valid json";
      },
      setItem() {
        throw new Error("quota exceeded");
      },
      removeItem() {
        throw new Error("storage blocked");
      }
    };

    const loaded = loadState();
    assert.deepEqual(loaded.album, []);
    assert.deepEqual(loaded.travels, []);
    assert.equal(loaded.activeTravel, null);
    assert.doesNotThrow(() => saveState({ album: [{ id: "oversized" }] }));

    const reset = resetState();
    assert.deepEqual(reset.album, []);
    assert.deepEqual(reset.travels, []);
    assert.equal(reset.activeTravel, null);
    assert.ok(warnings.length >= 3);
  } finally {
    console.warn = previousWarn;
    if (previousLocalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousLocalStorage;
  }
});
