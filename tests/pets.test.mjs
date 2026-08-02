import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import {
  DEFAULT_PET_ID,
  PET_TRAVEL_STATES,
  PET_WEATHER_STATES,
  PET_WEATHER_TYPES,
  getPetAssetForState,
  getPetAssetForWeatherState,
  getPetById,
  listPets
} from "../app/src/pets.js";
import { createInitialState } from "../app/src/travelEngine.js";

const expectedPetIds = [
  "teddy",
  "corgi",
  "border-collie",
  "golden-retriever",
  "husky",
  "french-bulldog",
  "shiba-inu",
  "chihuahua",
  "calico-cat",
  "abyssinian-cat",
  "british-blue-cat",
  "silver-shaded-cat",
  "ragdoll-cat",
  "persian-cat",
  "sphynx-cat",
  "siamese-cat",
  "lop-rabbit",
  "betta-fish",
  "guinea-pig",
  "turtle"
];

test("desktop pet catalog contains requested q-style characters and local assets", () => {
  const pets = listPets();
  assert.deepEqual(pets.map(pet => pet.id), expectedPetIds);

  for (const pet of pets) {
    assert.match(pet.asset, /^\.\/assets\/pets\/.+\.png$/);
    assert.equal(existsSync(new URL(`../app/${pet.asset.replace("./", "")}`, import.meta.url)), true, pet.id);
    assert.deepEqual(Object.keys(pet.stateAssets), PET_TRAVEL_STATES);
    for (const state of PET_TRAVEL_STATES) {
      const asset = getPetAssetForState(pet, state);
      const assetUrl = new URL(`../app/${asset.replace("./", "")}`, import.meta.url);
      const bytes = readFileSync(assetUrl);
      assert.match(asset, new RegExp(`^\\.\\/assets\\/pets\\/states\\/${pet.id}\\/${state}\\.gif$`));
      assert.equal(existsSync(assetUrl), true, `${pet.id}:${state}`);
      assert.equal(bytes.subarray(0, 6).toString("ascii"), "GIF89a", `${pet.id}:${state}`);
      assert.equal(countGifFrames(bytes), 12, `${pet.id}:${state}`);
    }
  }
});

test("pet state assets fall back to the static thumbnail outside travel states", () => {
  const pet = getPetById("corgi");

  assert.equal(getPetAssetForState(pet, "paused"), "./assets/pets/states/corgi/paused.gif");
  assert.equal(getPetAssetForState(pet, "traveling"), "./assets/pets/states/corgi/traveling.gif");
  assert.equal(getPetAssetForState(pet, "idle"), pet.asset);
  assert.equal(getPetAssetForState(null, "traveling"), getPetById(DEFAULT_PET_ID).asset);
});

test("pet weather assets resolve for live weather travel states and fall back otherwise", () => {
  const pet = getPetById("corgi");

  assert.deepEqual(PET_WEATHER_STATES, ["traveling", "recalled", "paused"]);
  assert.deepEqual(PET_WEATHER_TYPES, ["sunny", "rain", "fog", "snow", "wind", "heat"]);
  assert.equal(getPetAssetForWeatherState(pet, "traveling", "rain"), "./assets/pets/weather/corgi/traveling-rain.webp");
  assert.equal(getPetAssetForWeatherState(pet, "recalled", "heat"), "./assets/pets/weather/corgi/recalled-heat.webp");
  assert.equal(getPetAssetForWeatherState(pet, "paused", "snow"), "./assets/pets/weather/corgi/paused-snow.webp");
  assert.equal(getPetAssetForWeatherState(pet, "completed", "rain"), "./assets/pets/states/corgi/completed.gif");
  assert.equal(getPetAssetForWeatherState(pet, "traveling", "rainbow"), "./assets/pets/states/corgi/traveling.gif");

  for (const state of PET_WEATHER_STATES) {
    for (const weather of PET_WEATHER_TYPES) {
      const asset = getPetAssetForWeatherState(pet, state, weather);
      const assetUrl = new URL(`../app/${asset.replace("./", "")}`, import.meta.url);
      assert.equal(existsSync(assetUrl), true, `${state}:${weather}`);
      assert.equal(readFileSync(assetUrl).subarray(8, 12).toString("ascii"), "WEBP", `${state}:${weather}`);
    }
  }
});

test("initial state defaults to the lop rabbit until first user choice", () => {
  const state = createInitialState();

  assert.equal(DEFAULT_PET_ID, "lop-rabbit");
  assert.equal(state.settings.selectedPetId, DEFAULT_PET_ID);
  assert.equal(state.settings.hasChosenPet, false);
  assert.equal(state.settings.hasCompletedOnboarding, false);
  assert.equal(state.settings.backgroundMusicEnabled, false);
  assert.equal(state.settings.hasChosenBackgroundMusic, false);
  assert.equal(state.settings.backgroundMusicDestinationId, null);
  assert.equal(getPetById(state.settings.selectedPetId).id, DEFAULT_PET_ID);
});

function countGifFrames(bytes) {
  let offset = 13;
  const globalColorTableFlag = bytes[10] & 0x80;
  if (globalColorTableFlag) {
    offset += 3 * (1 << ((bytes[10] & 0x07) + 1));
  }

  let frameCount = 0;
  while (offset < bytes.length) {
    const block = bytes[offset];
    if (block === 0x3b) break;
    if (block === 0x2c) {
      frameCount += 1;
      const packed = bytes[offset + 9];
      offset += 10;
      if (packed & 0x80) {
        offset += 3 * (1 << ((packed & 0x07) + 1));
      }
      offset += 1;
      offset = skipGifSubBlocks(bytes, offset);
      continue;
    }
    if (block === 0x21) {
      offset += 2;
      offset = skipGifSubBlocks(bytes, offset);
      continue;
    }
    throw new Error(`Unexpected GIF block 0x${block.toString(16)} at ${offset}`);
  }
  return frameCount;
}

function skipGifSubBlocks(bytes, offset) {
  while (offset < bytes.length) {
    const size = bytes[offset];
    offset += 1;
    if (size === 0) return offset;
    offset += size;
  }
  return offset;
}
