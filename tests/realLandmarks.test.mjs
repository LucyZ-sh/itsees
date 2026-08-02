import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getAtlasStats,
  landmarkCategories,
  realLandmarks,
  resolveLandmarkWeatherSnapshot
} from "../app/src/realLandmarks.js";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));

test("phase 2 atlas starts with fifteen categorized real landmarks", () => {
  assert.equal(realLandmarks.length, 15);
  assert.equal(landmarkCategories.length, 5);
  for (const category of landmarkCategories) {
    assert.equal(realLandmarks.filter(landmark => landmark.categoryId === category.id).length, 3, category.id);
  }
});

test("each real landmark has enough P0 content for dynamic postcards", () => {
  for (const landmark of realLandmarks) {
    assert.ok(landmark.id);
    assert.ok(landmark.coordinates.lat);
    assert.ok(landmark.coordinates.lng);
    assert.ok(landmark.summary);
    assert.ok(landmark.flyover);
    assert.ok(landmark.palette.length >= 3);
    assert.ok(landmark.naturalLandmarks.length >= 2, landmark.id);
    assert.ok(landmark.humanLandmarks.length >= 2, landmark.id);
    assert.ok(landmark.foods.length >= 2, landmark.id);
    assert.ok(landmark.weatherFocus.length >= 2, landmark.id);
    assert.ok(landmark.collectibles.length >= 1, landmark.id);
    assert.ok(landmark.postcardImage.src.endsWith(".webp"), landmark.id);
    assert.ok(landmark.postcardImage.alt.includes("Q版"), landmark.id);
    assert.ok(landmark.postcardImage.referenceUrl.startsWith("https://"), landmark.id);
    assert.ok(landmark.postcardImage.stylePromptSubject, landmark.id);

    const assetPath = path.join(projectRoot, "app", landmark.postcardImage.src.replace(/^\.\//, ""));
    assert.ok(existsSync(assetPath), `${landmark.id} missing ${assetPath}`);
  }
});

test("local simulated weather snapshots are stable for the same day", () => {
  const now = new Date("2026-07-02T08:00:00.000Z");
  const snapshot = resolveLandmarkWeatherSnapshot(realLandmarks[0], now);
  const sameSnapshot = resolveLandmarkWeatherSnapshot(realLandmarks[0], now);
  assert.deepEqual(snapshot, sameSnapshot);
  assert.equal(snapshot.provider, "local_simulated");
  assert.equal(snapshot.isFallback, true);
  assert.ok(snapshot.visual.cssClass);
  assert.equal(getAtlasStats().total, 15);
});
