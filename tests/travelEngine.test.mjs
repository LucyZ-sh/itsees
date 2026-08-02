import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { legacySouvenirs, themes } from "../app/src/content.js";
import { getAtlasSouvenirs } from "../app/src/atlasContent.js";
import {
  calculateColoredSegments,
  calculateTravelProgress,
  completeActiveTravelIfDue,
  continueTravel,
  createInitialState,
  getRuntimeTravelView,
  startTravel,
  summonTravel,
  switchThemeAndStart
} from "../app/src/travelEngine.js";
import { resolvePhase1WeatherSnapshot } from "../app/src/weatherVisuals.js";

const baseTime = new Date("2026-06-29T00:00:00.000Z");

function advanceActiveTravelForTest(state, minutes) {
  if (!state.activeTravel || state.activeTravel.status !== "traveling") return state;
  const next = structuredClone(state);
  next.activeTravel.startedAt = new Date(
    new Date(next.activeTravel.startedAt).getTime() - minutes * 60_000
  ).toISOString();
  return next;
}

test("each theme has twelve scene definitions and image assets", () => {
  for (const theme of themes) {
    assert.equal(theme.scenes.length, 12, theme.id);
    assert.equal(theme.mapSegments.length, 12, theme.id);
    for (const scene of theme.scenes) {
      const runtimeAsset = scene.imageAsset.replace(/\.png$/, ".webp");
      assert.equal(existsSync(new URL(`../app/${runtimeAsset.replace("./", "")}`, import.meta.url)), true, scene.id);
    }
  }
});

test("every Phase 1 souvenir has a distinct themed identity and image thumbnail", () => {
  const allowedTypes = new Set([
    "glass_bead", "ticket_stub", "stamp", "bookmark", "patch",
    "miniature", "token", "charm", "brooch", "tag"
  ]);
  const names = new Set();
  const englishNames = new Set();
  const assetPaths = new Set();
  const assetBytes = new Set();

  for (const souvenir of legacySouvenirs) {
    assert.equal(allowedTypes.has(souvenir.type), true, souvenir.id);
    assert.equal(souvenir.displayMode, "souvenir_thumbnail", souvenir.id);
    assert.ok(souvenir.name.length >= 5, souvenir.id);
    assert.ok(souvenir.englishName.length >= 8, souvenir.id);
    assert.match(souvenir.description, /^.+。$/, souvenir.id);
    assert.doesNotMatch(souvenir.description, /灵感来自|「|」/, souvenir.id);
    assert.match(souvenir.englishDescription, /^[A-Z].+\.$/, souvenir.id);
    assert.doesNotMatch(souvenir.englishDescription, /inspired by/i, souvenir.id);
    assert.match(souvenir.asset, /^\.\/assets\/souvenirs\/phase1\/T\d{2}-SV\d{2}\.webp$/, souvenir.id);
    const assetUrl = new URL(`../app/${souvenir.asset.replace("./", "")}`, import.meta.url);
    assert.equal(existsSync(assetUrl), true, souvenir.id);
    const bytes = readFileSync(assetUrl);
    assert.ok(bytes.length > 10_000, souvenir.id);
    assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF", souvenir.id);
    assert.equal(bytes.subarray(8, 12).toString("ascii"), "WEBP", souvenir.id);
    assert.equal(souvenir.badge, undefined, `${souvenir.id} must not fall back to a text badge`);
    names.add(souvenir.name);
    englishNames.add(souvenir.englishName);
    assetPaths.add(souvenir.asset);
    assetBytes.add(bytes.toString("base64"));
  }
  assert.equal(legacySouvenirs.length, 150);
  for (const theme of themes) {
    assert.equal(legacySouvenirs.filter(item => item.themeId === theme.id).length, 10, theme.id);
  }
  assert.equal(names.size, legacySouvenirs.length, "Chinese souvenir names must be unique");
  assert.equal(englishNames.size, legacySouvenirs.length, "English souvenir names must be unique");
  assert.equal(assetPaths.size, legacySouvenirs.length, "thumbnail paths must be unique");
  assert.equal(assetBytes.size, legacySouvenirs.length, "thumbnail image files must be unique");
});

test("Atlas souvenir visuals are landmark-specific real objects", () => {
  const parisSouvenirs = getAtlasSouvenirs("fr_paris");

  assert.equal(parisSouvenirs.length, 10);
  assert.equal(parisSouvenirs.find(item => item.name.includes("地铁票根"))?.type, "ticket_stub");
  assert.equal(parisSouvenirs.find(item => item.name.includes("铁塔"))?.type, "charm");
  assert.equal(parisSouvenirs.find(item => item.name.includes("瓷砖"))?.rarity, "rare");
});

test("phase 1 local weather snapshots are stable for the same day", () => {
  const now = new Date("2026-07-02T08:00:00.000Z");
  const snapshot = resolvePhase1WeatherSnapshot({ themeId: "T03", sceneId: "T03-S02", date: now });
  const sameSnapshot = resolvePhase1WeatherSnapshot({ themeId: "T03", sceneId: "T03-S02", date: now });

  assert.deepEqual(snapshot, sameSnapshot);
  assert.equal(snapshot.provider, "local_simulated");
  assert.equal(snapshot.sourceText, "本地模拟天气");
  assert.equal(snapshot.isFallback, true);
  assert.ok(snapshot.localDate.match(/^\d{4}-\d{2}-\d{2}$/));
  assert.ok(snapshot.visual.cssClass.startsWith("weather-"));
});

test("travel progress uses a fixed 240 minute denominator", () => {
  assert.equal(calculateTravelProgress(0), 0);
  assert.equal(calculateTravelProgress(120), 0.5);
  assert.equal(calculateTravelProgress(240), 1);
  assert.equal(calculateTravelProgress(300), 1);
});

test("map coloring uses 20 minute visual segments and never marks 239 minutes as full", () => {
  const segments = themes[0].mapSegments;
  assert.equal(calculateColoredSegments(0, segments).length, 0);
  assert.equal(calculateColoredSegments(20, segments).length, 1);
  assert.equal(calculateColoredSegments(120, segments).length, 6);
  assert.equal(calculateColoredSegments(239, segments).length, 11);
  assert.equal(calculateColoredSegments(240, segments).length, 12);
});

test("starting travel creates a 240 minute active session with a grayed map state", () => {
  const state = createInitialState();
  const next = startTravel(state, "T01", ["food-riceball", "tool-camera"], baseTime);

  assert.equal(next.activeTravel.themeId, "T01");
  assert.equal(next.activeTravel.durationMinutes, 240);
  assert.equal(next.activeTravel.accumulatedTravelMinutes, 0);
  assert.equal(getRuntimeTravelView(next.activeTravel, baseTime).coloredSegmentIds.length, 0);
  assert.equal(next.analytics.some(event => event.name === "map_preview_shown"), true);
});

test("initial state is ready for a one-time local weather request", () => {
  const state = createInitialState();

  assert.equal(state.localWeather.status, "idle");
  assert.equal(state.localWeather.hasRequested, false);
  assert.equal(state.localWeather.snapshot, null);
});

test("summoning before the minimum spot time records progress without a photo", () => {
  let state = createInitialState();
  state = startTravel(state, "T01", ["food-riceball", "tool-camera"], baseTime);
  state = advanceActiveTravelForTest(state, 5);
  state = summonTravel(state, baseTime);

  assert.equal(state.activeTravel.status, "recalled");
  assert.equal(Math.round(state.activeTravel.progressPercent), 2);
  assert.equal(state.activeTravel.coloredSegmentIds.length, 0);
  assert.equal(state.activeTravel.result.sceneId, null);
  assert.equal(state.album.length, 0);
  assert.equal(state.travels.length, 1);
});

test("summoning at 120 minutes records partial scene postcards and resumable travel", () => {
  let state = createInitialState();
  state = startTravel(state, "T01", ["food-riceball", "tool-camera"], baseTime);
  state = advanceActiveTravelForTest(state, 120);
  state = summonTravel(state, baseTime);

  assert.equal(state.activeTravel.status, "recalled");
  assert.equal(Math.round(state.activeTravel.progressPercent), 50);
  assert.equal(state.activeTravel.coloredSegmentIds.length, 6);
  assert.equal(state.album.length, 6);
  assert.deepEqual(
    state.album.filter(card => card.themeId === "T01").map(card => card.sceneId).sort(),
    ["T01-S01", "T01-S02", "T01-S03", "T01-S04", "T01-S05", "T01-S06"]
  );
  assert.equal(state.travels.length, 1);
  assert.equal(state.souvenirAcquisitions.length, state.activeTravel.result.souvenirIds.length);
  assert.equal(state.souvenirAcquisitions.every(item => item.destinationId === "T01"), true);
  assert.equal(state.souvenirAcquisitions.every(item => item.souvenirId.startsWith("T01-SV")), true);
  assert.equal(state.themeProgress.T01.isFullyColored, false);
});

test("continuing after recall preserves progress and completes after remaining time", () => {
  let state = createInitialState();
  state = startTravel(state, "T01", ["food-riceball", "tool-camera"], baseTime);
  state = advanceActiveTravelForTest(state, 120);
  state = summonTravel(state, baseTime);
  state = continueTravel(state, baseTime);

  assert.equal(state.activeTravel.status, "traveling");
  assert.equal(state.activeTravel.accumulatedTravelMinutes, 120);

  state = advanceActiveTravelForTest(state, 120);
  state = completeActiveTravelIfDue(state, baseTime);

  assert.equal(state.activeTravel.status, "completed");
  assert.equal(state.activeTravel.progressPercent, 100);
  assert.equal(state.activeTravel.coloredSegmentIds.length, 12);
  assert.equal(state.themeProgress.T01.isFullyColored, true);
  assert.equal(state.album.length, 12);
  assert.equal(new Set(state.album.filter(card => card.themeId === "T01").map(card => card.sceneId)).size, 12);
});

test("travel result resolves prebuilt theme and scene assets from content database", () => {
  let state = createInitialState();
  state = startTravel(state, "T15", ["food-riceball", "tool-camera"], baseTime);
  state = advanceActiveTravelForTest(state, 240);
  state = completeActiveTravelIfDue(state, baseTime);

  assert.equal(state.activeTravel.result.contentSource, "prebuilt-content-db");
  assert.equal(state.activeTravel.result.sceneId, "T15-S12");
  assert.equal(state.activeTravel.result.sceneImageAsset, "./assets/themes/T15/scenes/T15-S12.webp");
  assert.equal(state.activeTravel.result.mapAssets.color, "./assets/themes/T15/map-color.webp");
  assert.equal(state.activeTravel.result.mapAssets.gray, "./assets/themes/T15/map-gray.webp");
  assert.equal(state.activeTravel.result.weatherSnapshot.provider, "local_simulated");
  assert.equal(state.activeTravel.result.weatherSnapshot.isFallback, true);
  assert.ok(state.activeTravel.result.weatherSnapshot.visual.cssClass.startsWith("weather-"));
  assert.equal(state.album[0].sceneImageAsset, "./assets/themes/T15/scenes/T15-S12.webp");
  assert.deepEqual(state.album[0].weatherSnapshot, state.activeTravel.result.weatherSnapshot);
  assert.deepEqual(state.album[0].decorations, []);
});

test("switching theme after recall starts a new grayed map while keeping old history", () => {
  let state = createInitialState();
  state = startTravel(state, "T01", ["food-riceball", "tool-camera"], baseTime);
  state = advanceActiveTravelForTest(state, 30);
  state = summonTravel(state, baseTime);
  state.selectedThemeId = "T02";
  state = switchThemeAndStart(state, "T02", ["food-tea", "tool-compass"], baseTime);

  assert.equal(state.activeTravel.themeId, "T02");
  assert.equal(state.activeTravel.accumulatedTravelMinutes, 0);
  assert.equal(state.activeTravel.coloredSegmentIds.length, 0);
  assert.equal(state.travels.length, 1);
  assert.ok(state.themeProgress.T01.progressPercent > 0);
});
