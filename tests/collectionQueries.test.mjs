import assert from "node:assert/strict";
import test from "node:test";
import {
  COLLECTION_PAGE_SIZE,
  getSouvenirIdsForDestination,
  queryCollection
} from "../app/src/collectionQueries.js";

const album = [
  { id: "paris-new", phase: 2, destinationId: "fr_paris", createdAt: "2026-07-13T08:00:00.000Z", completionReason: "full_cycle", rarity: "rare" },
  { id: "theme-old", phase: 1, destinationId: "T01", createdAt: "2026-06-01T08:00:00.000Z", completionReason: "summoned", rarity: "common" },
  { id: "paris-old", phase: 2, destinationId: "fr_paris", createdAt: "2026-07-10T08:00:00.000Z", completionReason: "summoned", rarity: "uncommon" }
];

test("destination scope isolates postcards without changing chronological order", () => {
  const result = queryCollection(album, {
    kind: "album",
    scope: { mode: "destination", phase: 2, destinationId: "fr_paris" }
  });

  assert.deepEqual(result.items.map(item => item.id), ["paris-new", "paris-old"]);
  assert.equal(result.total, 2);
});

test("global collection filters phase, time, completion and rarity together", () => {
  const result = queryCollection(album, {
    kind: "album",
    filters: { phase: 2, timeRange: "7d", completion: "completed", rarity: "rare" },
    now: "2026-07-14T08:00:00.000Z"
  });

  assert.deepEqual(result.items.map(item => item.id), ["paris-new"]);
});

test("collection pagination is stable and clamps pages after filtering", () => {
  const items = Array.from({ length: 13 }, (_, index) => ({
    id: `travel-${String(index).padStart(2, "0")}`,
    phase: 1,
    destinationId: "T01",
    completedAt: new Date(Date.UTC(2026, 6, 14, index)).toISOString(),
    completionReason: "full_cycle"
  }));
  const first = queryCollection(items, { kind: "history", page: 1 });
  const second = queryCollection(items, { kind: "history", page: 2 });
  const clamped = queryCollection(items, { kind: "history", page: 8, filters: { phase: 2 } });

  assert.equal(first.items.length, COLLECTION_PAGE_SIZE);
  assert.equal(second.items.length, 1);
  assert.equal(second.items[0].id, "travel-00");
  assert.equal(clamped.page, 1);
  assert.equal(clamped.totalPages, 1);
  assert.deepEqual(clamped.items, []);
});

test("postcard editor can resolve only souvenirs acquired at the same destination", () => {
  const ids = getSouvenirIdsForDestination([
    { id: "a1", souvenirId: "camera", destinationId: "T01" },
    { id: "a2", souvenirId: "ticket", destinationId: "fr_paris" },
    { id: "a3", souvenirId: "camera", destinationId: "T01" }
  ], "T01");

  assert.deepEqual([...ids], ["camera"]);
});
