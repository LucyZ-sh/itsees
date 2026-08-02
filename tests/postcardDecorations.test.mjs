import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_POSTCARD_DECORATIONS,
  addPostcardDecoration,
  movePostcardDecoration,
  removePostcardDecoration,
  transformPostcardDecoration
} from "../app/src/postcardDecorations.js";

const postcard = {
  id: "postcard-1",
  decorations: []
};

test("adding a souvenir creates a normalized postcard decoration", () => {
  const next = addPostcardDecoration(postcard, "T01-SV01", { x: 1.25, y: -0.2 }, {
    id: "decoration-1",
    createdAt: "2026-07-11T08:00:00.000Z",
    rotation: 24,
    scale: 2
  });

  assert.equal(next.decorations.length, 1);
  assert.deepEqual(next.decorations[0], {
    id: "decoration-1",
    postcardId: "postcard-1",
    souvenirId: "T01-SV01",
    x: 1,
    y: 0,
    scale: 2,
    rotation: 24,
    zIndex: 1,
    createdAt: "2026-07-11T08:00:00.000Z"
  });
});

test("a decoration supports zooming and full 360 degree rotation", () => {
  const decorated = addPostcardDecoration(postcard, "T01-SV01", { x: 0.5, y: 0.5 }, {
    id: "decoration-1",
    createdAt: "2026-07-11T08:00:00.000Z"
  });
  const enlarged = transformPostcardDecoration(decorated, "decoration-1", { scale: 2.8, rotation: 195 });
  const reduced = transformPostcardDecoration(enlarged, "decoration-1", { scale: 0.1, rotation: -195 });

  assert.equal(enlarged.decorations[0].scale, 2);
  assert.equal(enlarged.decorations[0].rotation, -165);
  assert.equal(reduced.decorations[0].scale, 0.5);
  assert.equal(reduced.decorations[0].rotation, 165);
  assert.equal(reduced.decorations[0].zIndex, 3);
});

test("a postcard accepts at most twelve decoration instances", () => {
  const full = {
    ...postcard,
    decorations: Array.from({ length: MAX_POSTCARD_DECORATIONS }, (_, index) => ({
      id: `decoration-${index}`,
      postcardId: postcard.id,
      souvenirId: "T01-SV01",
      x: 0.5,
      y: 0.5,
      scale: 1,
      rotation: 0,
      zIndex: index + 1,
      createdAt: "2026-07-11T08:00:00.000Z"
    }))
  };

  assert.equal(addPostcardDecoration(full, "T01-SV02", { x: 0.3, y: 0.3 }), full);
});

test("moving a decoration updates relative position and brings it to the front", () => {
  const decorated = addPostcardDecoration(postcard, "T01-SV01", { x: 0.25, y: 0.25 }, {
    id: "decoration-1",
    createdAt: "2026-07-11T08:00:00.000Z"
  });
  const withSecond = addPostcardDecoration(decorated, "T01-SV02", { x: 0.5, y: 0.5 }, {
    id: "decoration-2",
    createdAt: "2026-07-11T08:01:00.000Z"
  });

  const moved = movePostcardDecoration(withSecond, "decoration-1", { x: 0.72, y: 0.64 });

  assert.equal(moved.decorations[0].x, 0.72);
  assert.equal(moved.decorations[0].y, 0.64);
  assert.equal(moved.decorations[0].zIndex, 3);
  assert.equal(moved.decorations[1].zIndex, 2);
});

test("removing a decoration leaves the souvenir inventory outside the postcard untouched", () => {
  const decorated = addPostcardDecoration(postcard, "T01-SV01", { x: 0.5, y: 0.5 }, {
    id: "decoration-1",
    createdAt: "2026-07-11T08:00:00.000Z"
  });

  const cleaned = removePostcardDecoration(decorated, "decoration-1");

  assert.deepEqual(cleaned.decorations, []);
  assert.equal(cleaned.id, postcard.id);
});
