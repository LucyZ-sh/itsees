import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import test from "node:test";

import {
  BackgroundMusicController,
  resolveBackgroundMusicSelection,
  resolveBackgroundMusicWeatherId
} from "../app/src/backgroundMusic.js";
import { listAtlasDestinations } from "../app/src/atlasContent.js";
import { themes } from "../app/src/content.js";

const WEATHER_SUFFIXES = ["SUNNY", "RAIN", "FOG", "SNOW", "WIND", "HEAT", "DEFAULT"];

test("background music maps six normalized weather ids and falls back to DEFAULT", () => {
  for (const [assetId, suffix] of [
    ["sunny", "SUNNY"],
    ["rain", "RAIN"],
    ["fog", "FOG"],
    ["snow", "SNOW"],
    ["wind", "WIND"],
    ["heat", "HEAT"]
  ]) {
    assert.equal(resolveBackgroundMusicWeatherId({
      status: "ready",
      snapshot: { weatherAssetId: assetId }
    }), suffix);
  }

  for (const localWeather of [
    null,
    { status: "disabled" },
    { status: "loading" },
    { status: "failed" },
    { status: "ready", snapshot: null },
    { status: "ready", snapshot: { weatherAssetId: "storm" } }
  ]) {
    assert.equal(resolveBackgroundMusicWeatherId(localWeather), "DEFAULT");
  }
});

test("traveling destination wins over the viewed destination", () => {
  const selection = resolveBackgroundMusicSelection({
    activeTravel: {
      status: "traveling",
      phase: 2,
      destinationId: "fr_paris"
    },
    viewedDestinationId: "T01",
    localWeather: {
      status: "ready",
      snapshot: { weatherAssetId: "rain" }
    }
  });

  assert.deepEqual(selection, {
    destinationId: "fr_paris",
    weatherId: "RAIN",
    src: "./assets/music/weather-bgm/fr_paris-RAIN.mp3",
    fallbackSrc: "./assets/music/weather-bgm/fr_paris-DEFAULT.mp3"
  });
});

test("without a traveling session music follows the viewed destination and DEFAULT", () => {
  const selection = resolveBackgroundMusicSelection({
    activeTravel: { status: "recalled", destinationId: "fr_paris" },
    viewedDestinationId: "T03",
    localWeather: { status: "failed" }
  });

  assert.equal(selection.destinationId, "T03");
  assert.equal(selection.weatherId, "DEFAULT");
  assert.equal(selection.src, "./assets/music/weather-bgm/T03-DEFAULT.mp3");
});

test("dual-channel controller does not restart the same selection and crossfades a changed one", async () => {
  const channels = [];
  const controller = new BackgroundMusicController({
    audioFactory() {
      const channel = new FakeAudio();
      channels.push(channel);
      return channel;
    },
    crossfadeMs: 0,
    stopFadeMs: 0,
    now: () => 0,
    requestFrame: callback => callback(10)
  });
  const first = selectionFor("T01", "SUNNY");
  const second = selectionFor("T02", "FOG");

  await controller.setEnabled(true, first);
  assert.equal(controller.getSnapshot().status, "playing");
  assert.equal(channels.reduce((sum, channel) => sum + channel.playCalls, 0), 1);

  await controller.sync(first);
  assert.equal(channels.reduce((sum, channel) => sum + channel.playCalls, 0), 1);

  await controller.sync(second);
  assert.equal(channels.reduce((sum, channel) => sum + channel.playCalls, 0), 2);
  assert.equal(controller.getSnapshot().selection.src, second.src);
});

test("crossfade watchdog silences the old channel when animation frames are suspended", async () => {
  const channels = [];
  const timers = [];
  let allowFrames = true;
  const controller = new BackgroundMusicController({
    audioFactory() {
      const channel = new FakeAudio();
      channels.push(channel);
      return channel;
    },
    crossfadeMs: 120,
    now: () => 0,
    requestFrame(callback) {
      if (allowFrames) callback(200);
    },
    setTimer(callback) {
      const timer = { callback, cleared: false };
      timers.push(timer);
      return timer;
    },
    clearTimer(timer) {
      if (timer) timer.cleared = true;
    }
  });
  const first = selectionFor("T01", "SUNNY");
  const second = selectionFor("T02", "RAIN");

  await controller.setEnabled(true, first);
  allowFrames = false;
  const transition = controller.sync(second);
  await Promise.resolve();

  const watchdog = timers.findLast(timer => !timer.cleared);
  assert.ok(watchdog, "crossfade watchdog was not scheduled");
  watchdog.callback();
  await transition;

  assert.equal(channels.filter(channel => !channel.paused).length, 1);
  assert.equal(channels[controller.activeIndex].src, second.src);
  assert.equal(controller.getSnapshot().selection.src, second.src);
});

test("a stale play promise cannot pause the newest destination during rapid map switches", async () => {
  const channels = [];
  const controller = new BackgroundMusicController({
    audioFactory() {
      const channel = new DeferredAudio();
      channels.push(channel);
      return channel;
    },
    crossfadeMs: 0,
    now: () => 0,
    requestFrame: callback => callback(10)
  });

  await controller.setEnabled(true, selectionFor("T01", "SUNNY"));
  channels[1].deferred = true;
  const middleTransition = controller.sync(selectionFor("T02", "RAIN"));
  await Promise.resolve();
  const newest = selectionFor("fr_paris", "FOG");
  const newestTransition = controller.sync(newest);
  await Promise.resolve();

  channels[1].pendingPlays[1].resolve();
  await newestTransition;
  channels[1].pendingPlays[0].resolve();
  await middleTransition;

  assert.equal(channels.filter(channel => !channel.paused).length, 1);
  assert.equal(channels[controller.activeIndex].src, newest.src);
  assert.equal(controller.getSnapshot().selection.src, newest.src);
});

test("controller falls back to DEFAULT after a weather track fails", async () => {
  const previousWarn = console.warn;
  console.warn = () => {};
  const controller = new BackgroundMusicController({
    audioFactory: () => new FakeAudio({
      rejectWhen: src => src.endsWith("-RAIN.mp3"),
      rejection: Object.assign(new Error("unsupported source"), { name: "NotSupportedError" })
    }),
    crossfadeMs: 0,
    now: () => 0,
    requestFrame: callback => callback(10)
  });

  try {
    await controller.setEnabled(true, selectionFor("T01", "RAIN"));

    assert.equal(controller.getSnapshot().status, "playing");
    assert.equal(controller.getSnapshot().selection.weatherId, "DEFAULT");
    assert.equal(controller.getSnapshot().selection.src, "./assets/music/weather-bgm/T01-DEFAULT.mp3");
  } finally {
    console.warn = previousWarn;
  }
});

test("autoplay rejection becomes blocked without trying a different file", async () => {
  const channels = [];
  const controller = new BackgroundMusicController({
    audioFactory() {
      const channel = new FakeAudio({
        rejectWhen: () => true,
        rejection: Object.assign(new Error("user gesture required"), { name: "NotAllowedError" })
      });
      channels.push(channel);
      return channel;
    },
    now: () => 0,
    requestFrame: callback => callback(10)
  });

  await controller.setEnabled(true, selectionFor("T01", "SUNNY"));

  assert.equal(controller.getSnapshot().status, "blocked");
  assert.equal(channels.reduce((sum, channel) => sum + channel.playCalls, 0), 1);
});

test("ordinary sync does not loop retry a blocked or failed selection", async () => {
  const channels = [];
  const controller = new BackgroundMusicController({
    audioFactory() {
      const channel = new FakeAudio({
        rejectWhen: () => true,
        rejection: Object.assign(new Error("user gesture required"), { name: "NotAllowedError" })
      });
      channels.push(channel);
      return channel;
    },
    now: () => 0,
    requestFrame: callback => callback(10)
  });
  const selection = selectionFor("T01", "SUNNY");

  await controller.setEnabled(true, selection);
  await controller.sync(selection);
  await controller.sync(selection);

  assert.equal(controller.getSnapshot().status, "blocked");
  assert.equal(channels.reduce((sum, channel) => sum + channel.playCalls, 0), 1);
});

test("an interrupted play request stays retryable without warning or failure analytics", async () => {
  const previousWarn = console.warn;
  const warnings = [];
  const events = [];
  console.warn = (...args) => warnings.push(args);
  const controller = new BackgroundMusicController({
    audioFactory: () => new FakeAudio({
      rejectWhen: () => true,
      rejection: Object.assign(new Error("The play() request was interrupted by a call to pause()."), {
        name: "AbortError"
      })
    }),
    now: () => 0,
    requestFrame: callback => callback(10),
    onEvent: name => events.push(name)
  });

  try {
    const started = await controller.setEnabled(true, selectionFor("T01", "SUNNY"));

    assert.equal(started, false);
    assert.equal(controller.getSnapshot().status, "interrupted");
    assert.deepEqual(warnings, []);
    assert.equal(events.includes("background_music_failed"), false);
  } finally {
    console.warn = previousWarn;
  }
});

test("music directory contains a non-empty 30 by 7 asset matrix", () => {
  const destinationIds = [
    ...themes.map(theme => theme.id),
    ...listAtlasDestinations().map(destination => destination.id)
  ];
  assert.equal(destinationIds.length, 30);
  assert.equal(new Set(destinationIds).size, 30);
  const audioHashes = new Set();

  for (const destinationId of destinationIds) {
    for (const suffix of WEATHER_SUFFIXES) {
      const assetUrl = new URL(
        `../app/assets/music/weather-bgm/${destinationId}-${suffix}.mp3`,
        import.meta.url
      );
      assert.equal(existsSync(assetUrl), true, `${destinationId}-${suffix}.mp3 is missing`);
      assert.ok(statSync(assetUrl).size > 0, `${destinationId}-${suffix}.mp3 is empty`);
      audioHashes.add(createHash("sha256").update(readFileSync(assetUrl)).digest("hex"));
    }
  }
  assert.equal(audioHashes.size, destinationIds.length * WEATHER_SUFFIXES.length,
    "every destination and weather state must resolve to distinct audio content");
});

function selectionFor(destinationId, weatherId) {
  return {
    destinationId,
    weatherId,
    src: `./assets/music/weather-bgm/${destinationId}-${weatherId}.mp3`,
    fallbackSrc: `./assets/music/weather-bgm/${destinationId}-DEFAULT.mp3`
  };
}

class FakeAudio {
  constructor({ rejectWhen = () => false, rejection = new Error("playback failed") } = {}) {
    this.rejectWhen = rejectWhen;
    this.rejection = rejection;
    this.src = "";
    this.currentTime = 0;
    this.volume = 0;
    this.loop = false;
    this.preload = "";
    this.paused = true;
    this.playCalls = 0;
    this.listeners = new Map();
  }

  addEventListener(name, listener) {
    this.listeners.set(name, listener);
  }

  load() {}

  play() {
    this.playCalls += 1;
    if (this.rejectWhen(this.src)) return Promise.reject(this.rejection);
    this.paused = false;
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }
}

class DeferredAudio extends FakeAudio {
  constructor() {
    super();
    this.deferred = false;
    this.pendingPlays = [];
  }

  play() {
    this.playCalls += 1;
    this.paused = false;
    if (!this.deferred) return Promise.resolve();
    const pending = Promise.withResolvers();
    this.pendingPlays.push(pending);
    return pending.promise;
  }
}
