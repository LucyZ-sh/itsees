import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import {
  listSouvenirLibrary,
  listSouvenirsForLandmark
} from "../app/src/souvenirLibrary.js";
import { getThemeSouvenirsFromDb } from "../app/src/contentRepository.js";
import { resolveSouvenirRewards } from "../app/src/souvenirRewards.js";

const landmarkIds = [
  "fr_paris",
  "jp_tokyo",
  "cn_hong_kong",
  "us_grand_canyon",
  "amazon_rainforest",
  "tz_serengeti",
  "us_hawaii",
  "it_amalfi",
  "gr_greek_islands",
  "eu_alps",
  "it_tuscany",
  "no_norway_coast",
  "cn_great_wall",
  "in_taj_mahal",
  "eg_giza_pyramids"
];

test("global souvenir library ships 150 approved unique destination objects", () => {
  const library = listSouvenirLibrary();

  assert.equal(library.length, 150);
  assert.equal(new Set(library.map(item => item.id)).size, 150);
  assert.equal(new Set(library.map(item => item.asset)).size, 150);
  for (const landmarkId of landmarkIds) {
    assert.equal(listSouvenirsForLandmark(landmarkId).length, 10, landmarkId);
  }
  for (const item of library) {
    assert.equal(item.displayMode, "souvenir_thumbnail", item.id);
    assert.equal(item.contentReviewStatus, "approved", item.id);
    assert.match(item.asset, new RegExp(`^\\./assets/souvenirs/phase2/${item.id}\\.webp$`));
    assert.ok(item.sourceUrls.length > 0, item.id);
    assert.ok(item.themeTags.length > 0, item.id);
  }
});

test("every real-world souvenir has its own optimized themed WebP thumbnail", () => {
  const hashes = new Set();

  for (const item of listSouvenirLibrary()) {
    const assetUrl = new URL(`../app/${item.asset.replace(/^\.\//, "")}`, import.meta.url);
    assert.equal(existsSync(assetUrl), true, `${item.id} missing ${assetUrl.pathname}`);
    const bytes = readFileSync(assetUrl);
    assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF", item.id);
    assert.equal(bytes.subarray(8, 12).toString("ascii"), "WEBP", item.id);
    assert.ok(bytes.length > 10_000, `${item.id} thumbnail is unexpectedly small`);
    hashes.add(createHash("sha256").update(bytes).digest("hex"));
  }

  assert.equal(hashes.size, 150, "each souvenir must have a unique rendered asset");
});

test("reward resolution is deterministic, local, and never duplicates within a trip", () => {
  const input = {
    seed: "travel-paris-fixed",
    phase: 2,
    landmarkId: "fr_paris",
    progressPercent: 100,
    selectedItemIds: [],
    ownedCounts: {}
  };
  const first = resolveSouvenirRewards(input);
  const second = resolveSouvenirRewards(input);

  assert.deepEqual(first.map(item => item.id), second.map(item => item.id));
  assert.equal(first.length, 2);
  assert.equal(new Set(first.map(item => item.id)).size, first.length);
  assert.equal(first.every(item => item.landmarkId === "fr_paris"), true);
});

test("every Phase 2 trip draws only from its destination-specific ten-item pool", () => {
  for (const landmarkId of landmarkIds) {
    const pool = listSouvenirsForLandmark(landmarkId);
    const poolIds = new Set(pool.map(item => item.id));
    const partial = resolveSouvenirRewards({
      seed: `partial-${landmarkId}`,
      phase: 2,
      landmarkId,
      progressPercent: 25,
      selectedItemIds: [],
      ownedCounts: {}
    });
    const complete = resolveSouvenirRewards({
      seed: `complete-${landmarkId}`,
      phase: 2,
      landmarkId,
      progressPercent: 100,
      selectedItemIds: [],
      ownedCounts: {}
    });

    assert.equal(pool.length, 10, landmarkId);
    assert.equal([...partial, ...complete].every(item => poolIds.has(item.id)), true, landmarkId);
  }
});

test("every trip with at least one completed segment receives a reward", () => {
  const base = {
    seed: "travel-partial-fixed",
    phase: 1,
    themeId: "T01",
    selectedItemIds: [],
    ownedCounts: {}
  };

  assert.deepEqual(resolveSouvenirRewards({ ...base, progressPercent: 0 }), []);
  assert.equal(resolveSouvenirRewards({ ...base, progressPercent: 25 }).length, 1);
  assert.equal(resolveSouvenirRewards({ ...base, progressPercent: 100 }).length, 2);
  assert.equal(getThemeSouvenirsFromDb("T01").length, 10);
});

test("all Phase 1 rewards come only from their own route-specific pool", () => {
  for (let index = 1; index <= 15; index += 1) {
    const themeId = `T${String(index).padStart(2, "0")}`;
    const routePool = getThemeSouvenirsFromDb(themeId);
    const routeIds = new Set(routePool.map(item => item.id));
    const partial = resolveSouvenirRewards({
      seed: `partial-${themeId}`,
      phase: 1,
      themeId,
      progressPercent: 20,
      selectedItemIds: [],
      ownedCounts: {}
    });
    const complete = resolveSouvenirRewards({
      seed: `complete-${themeId}`,
      phase: 1,
      themeId,
      progressPercent: 100,
      selectedItemIds: [],
      ownedCounts: {}
    });

    assert.equal(routePool.length, 10, themeId);
    assert.equal(routePool.every(item => item.themeId === themeId), true, themeId);
    assert.equal([...partial, ...complete].every(item => routeIds.has(item.id)), true, themeId);
  }
});

test("full journeys produce a higher rare share than partial recalls", () => {
  let partialRare = 0;
  let partialTotal = 0;
  let fullRare = 0;
  let fullTotal = 0;

  for (let index = 0; index < 1000; index += 1) {
    const commonInput = {
      seed: `distribution-${index}`,
      phase: 1,
      themeId: "T08",
      selectedItemIds: [],
      ownedCounts: {}
    };
    const partial = resolveSouvenirRewards({ ...commonInput, progressPercent: 25 });
    const full = resolveSouvenirRewards({ ...commonInput, progressPercent: 100 });
    partialRare += partial.filter(item => item.rarity === "rare").length;
    partialTotal += partial.length;
    fullRare += full.filter(item => item.rarity === "rare").length;
    fullTotal += full.length;
  }

  assert.ok(fullRare / fullTotal > partialRare / partialTotal);
});

test("reward resolver never calls Math.random directly", () => {
  const source = readFileSync(new URL("../app/src/souvenirRewards.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /Math\.random/);
});
