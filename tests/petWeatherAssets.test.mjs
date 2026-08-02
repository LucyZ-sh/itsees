import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import {
  PET_WEATHER_STATES,
  PET_WEATHER_TYPES,
  listPets
} from "../app/src/pets.js";

const appRoot = new URL("../app/", import.meta.url);

test("production pet weather assets cover every pet, state, and weather", () => {
  for (const pet of listPets()) {
    assertMediaFile(pet.asset, "png");
    for (const stateAsset of Object.values(pet.stateAssets)) {
      assertMediaFile(stateAsset, "gif");
    }
    for (const state of PET_WEATHER_STATES) {
      for (const weather of PET_WEATHER_TYPES) {
        assertMediaFile(pet.weatherAssets[state][weather], "webp");
      }
    }
  }
});

function assertMediaFile(relativePath, type) {
  const fileUrl = new URL(relativePath.replace("./", ""), appRoot);
  assert.equal(existsSync(fileUrl), true, relativePath);
  const bytes = readFileSync(fileUrl);
  if (type === "webp") {
    assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF", relativePath);
    assert.equal(bytes.subarray(8, 12).toString("ascii"), "WEBP", relativePath);
    return;
  }
  if (type === "gif") {
    assert.match(bytes.subarray(0, 6).toString("ascii"), /^GIF8[79]a$/, relativePath);
    return;
  }
  assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", relativePath);
}
