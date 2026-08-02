export const BACKGROUND_MUSIC_TARGET_VOLUME = 0.25;
export const BACKGROUND_MUSIC_CROSSFADE_MS = 1200;
export const BACKGROUND_MUSIC_BASE_PATH = "./assets/music/weather-bgm";

export const BACKGROUND_MUSIC_WEATHER_SUFFIX = Object.freeze({
  sunny: "SUNNY",
  rain: "RAIN",
  fog: "FOG",
  snow: "SNOW",
  wind: "WIND",
  heat: "HEAT"
});

export function resolveBackgroundMusicWeatherId(localWeather) {
  if (localWeather?.status !== "ready") return "DEFAULT";
  return BACKGROUND_MUSIC_WEATHER_SUFFIX[localWeather.snapshot?.weatherAssetId] ?? "DEFAULT";
}

export function resolveBackgroundMusicDestinationId(activeTravel, viewedDestinationId) {
  if (activeTravel?.status === "traveling") {
    return activeTravel.destinationId ?? activeTravel.themeId ?? viewedDestinationId ?? null;
  }
  return viewedDestinationId ?? null;
}

export function resolveBackgroundMusicSelection({
  activeTravel,
  viewedDestinationId,
  localWeather,
  basePath = BACKGROUND_MUSIC_BASE_PATH
}) {
  const destinationId = resolveBackgroundMusicDestinationId(activeTravel, viewedDestinationId);
  if (!destinationId) return null;
  const weatherId = resolveBackgroundMusicWeatherId(localWeather);
  const fallbackSrc = `${basePath}/${destinationId}-DEFAULT.mp3`;
  return {
    destinationId,
    weatherId,
    src: `${basePath}/${destinationId}-${weatherId}.mp3`,
    fallbackSrc
  };
}

export class BackgroundMusicController {
  constructor({
    audioFactory = () => new Audio(),
    targetVolume = BACKGROUND_MUSIC_TARGET_VOLUME,
    crossfadeMs = BACKGROUND_MUSIC_CROSSFADE_MS,
    stopFadeMs = 180,
    requestFrame = callback => globalThis.requestAnimationFrame(callback),
    setTimer = (callback, delay) => globalThis.setTimeout(callback, delay),
    clearTimer = timerId => globalThis.clearTimeout(timerId),
    now = () => globalThis.performance.now(),
    onStatusChange = () => {},
    onEvent = () => {}
  } = {}) {
    this.targetVolume = targetVolume;
    this.crossfadeMs = crossfadeMs;
    this.stopFadeMs = stopFadeMs;
    this.requestFrame = requestFrame;
    this.setTimer = setTimer;
    this.clearTimer = clearTimer;
    this.now = now;
    this.onStatusChange = onStatusChange;
    this.onEvent = onEvent;
    this.channels = [audioFactory(), audioFactory()];
    this.channelSelections = [null, null];
    this.channelTokens = [0, 0];
    this.activeIndex = 0;
    this.enabled = false;
    this.status = "disabled";
    this.desiredSelection = null;
    this.playingSelection = null;
    this.transitionToken = 0;

    this.channels.forEach((channel, index) => {
      channel.loop = true;
      channel.preload = "auto";
      channel.volume = 0;
      channel.addEventListener?.("error", () => this.handleChannelError(index));
    });
  }

  getSnapshot() {
    return {
      enabled: this.enabled,
      status: this.status,
      selection: this.playingSelection ?? this.desiredSelection
    };
  }

  setEnabled(enabled, selection, { force = false } = {}) {
    const nextEnabled = Boolean(enabled);
    if (!nextEnabled) {
      if (selection) this.desiredSelection = selection;
      if (!this.enabled && this.status === "disabled") return Promise.resolve(false);
      this.enabled = false;
      this.stop();
      return Promise.resolve(false);
    }
    this.enabled = true;
    return this.play(selection ?? this.desiredSelection, { force });
  }

  sync(selection) {
    if (!this.enabled) return Promise.resolve(false);
    const sameSelection = this.desiredSelection?.src === selection?.src;
    if (sameSelection && ["blocked", "error"].includes(this.status)) {
      return Promise.resolve(false);
    }
    return this.play(selection ?? this.desiredSelection);
  }

  retry(selection) {
    this.enabled = true;
    return this.play(selection ?? this.desiredSelection, { force: true });
  }

  async play(selection, { force = false } = {}) {
    if (!selection?.src) {
      this.setStatus("error", selection);
      return false;
    }

    const sameDesired = this.desiredSelection?.src === selection.src;
    this.desiredSelection = selection;
    if (!force && sameDesired && ["loading", "playing"].includes(this.status)) return true;

    const token = ++this.transitionToken;
    this.setStatus("loading", selection);
    const primaryResult = await this.startSelection(selection, token);
    if (primaryResult === "started") return true;
    if (primaryResult === "stale") return false;
    if (primaryResult === "blocked") {
      this.pauseAll();
      this.setStatus("blocked", selection);
      return false;
    }

    if (selection.src !== selection.fallbackSrc) {
      const fallbackSelection = {
        ...selection,
        weatherId: "DEFAULT",
        src: selection.fallbackSrc
      };
      const fallbackResult = await this.startSelection(fallbackSelection, token);
      if (fallbackResult === "started") return true;
      if (fallbackResult === "stale") return false;
      if (fallbackResult === "blocked") {
        this.pauseAll();
        this.setStatus("blocked", selection);
        return false;
      }
    }

    this.pauseAll();
    this.playingSelection = null;
    this.setStatus("error", selection);
    this.onEvent("background_music_failed", selection, { fallbackAttempted: selection.src !== selection.fallbackSrc });
    return false;
  }

  async startSelection(playbackSelection, token) {
    const oldIndex = this.activeIndex;
    const oldChannel = this.channels[oldIndex];
    const hasAudibleChannel = Boolean(this.playingSelection) && !oldChannel.paused;
    const nextIndex = hasAudibleChannel ? 1 - oldIndex : oldIndex;
    const nextChannel = this.channels[nextIndex];

    nextChannel.pause();
    nextChannel.src = playbackSelection.src;
    nextChannel.currentTime = 0;
    nextChannel.volume = 0;
    nextChannel.loop = true;
    this.channelSelections[nextIndex] = playbackSelection;
    this.channelTokens[nextIndex] = token;
    nextChannel.load?.();

    try {
      const playResult = nextChannel.play();
      if (playResult && typeof playResult.then === "function") await playResult;
    } catch (error) {
      this.pauseChannelIfOwned(nextIndex, token);
      if (token !== this.transitionToken || !this.enabled) return "stale";
      if (isPlaybackInterruption(error)) {
        this.setStatus("interrupted", playbackSelection);
        return "stale";
      }
      if (isAutoplayBlock(error)) return "blocked";
      console.warn("Failed to start background music", playbackSelection.src, error);
      return "failed";
    }

    if (token !== this.transitionToken || !this.enabled) {
      this.pauseChannelIfOwned(nextIndex, token);
      return "stale";
    }

    this.activeIndex = nextIndex;
    this.playingSelection = playbackSelection;
    this.setStatus("playing", playbackSelection);
    this.onEvent("background_music_started", playbackSelection, {
      usedFallback: playbackSelection.src === this.desiredSelection?.fallbackSrc
        && playbackSelection.src !== this.desiredSelection?.src
    });

    const duration = hasAudibleChannel ? this.crossfadeMs : Math.min(420, this.crossfadeMs);
    await this.fadeChannels({
      token,
      fadeIn: nextChannel,
      fadeOut: hasAudibleChannel ? oldChannel : null,
      duration
    });
    if (token !== this.transitionToken) return "stale";

    nextChannel.volume = this.targetVolume;
    this.silenceInactiveChannels(nextIndex);
    return "started";
  }

  stop() {
    const token = ++this.transitionToken;
    this.setStatus("disabled", this.desiredSelection);
    const startingVolumes = this.channels.map(channel => channel.volume);
    const startedAt = this.now();
    let settled = false;

    const finish = () => {
      if (settled || token !== this.transitionToken) return;
      settled = true;
      this.clearTimer(watchdog);
      this.pauseAll();
      this.playingSelection = null;
    };

    const watchdog = this.setTimer(finish, this.stopFadeMs + 80);

    const tick = timestamp => {
      if (settled || token !== this.transitionToken) return;
      const elapsed = Math.max(0, timestamp - startedAt);
      const progress = this.stopFadeMs <= 0 ? 1 : Math.min(1, elapsed / this.stopFadeMs);
      this.channels.forEach((channel, index) => {
        channel.volume = startingVolumes[index] * (1 - progress);
      });
      if (progress < 1) {
        this.requestFrame(tick);
        return;
      }
      finish();
    };

    this.requestFrame(tick);
  }

  fadeChannels({ token, fadeIn, fadeOut, duration }) {
    const fadeOutStart = fadeOut?.volume ?? 0;
    const startedAt = this.now();
    return new Promise(resolve => {
      let settled = false;
      const finish = completed => {
        if (settled) return;
        settled = true;
        this.clearTimer(watchdog);
        if (completed) {
          fadeIn.volume = this.targetVolume;
          if (fadeOut) fadeOut.volume = 0;
        }
        resolve(completed);
      };
      // requestAnimationFrame may stop entirely in a hidden browser tab. The
      // watchdog guarantees that the old HTMLAudioElement is still silenced.
      const watchdog = this.setTimer(
        () => finish(token === this.transitionToken),
        Math.max(0, duration) + 80
      );
      const tick = timestamp => {
        if (token !== this.transitionToken) {
          finish(false);
          return;
        }
        const elapsed = Math.max(0, timestamp - startedAt);
        const progress = duration <= 0 ? 1 : Math.min(1, elapsed / duration);
        fadeIn.volume = this.targetVolume * progress;
        if (fadeOut) fadeOut.volume = fadeOutStart * (1 - progress);
        if (progress < 1) {
          this.requestFrame(tick);
          return;
        }
        finish(true);
      };
      this.requestFrame(tick);
    });
  }

  handleChannelError(index) {
    if (!this.enabled || index !== this.activeIndex || this.status !== "playing") return;
    const failedSelection = this.channelSelections[index];
    const desired = this.desiredSelection;
    if (!failedSelection || !desired) return;

    if (failedSelection.src !== desired.fallbackSrc) {
      void this.play(desired, { force: true });
      return;
    }

    ++this.transitionToken;
    this.pauseAll();
    this.playingSelection = null;
    this.setStatus("error", desired);
    this.onEvent("background_music_failed", desired, { fallbackAttempted: true });
  }

  pauseAll() {
    this.channels.forEach((channel, index) => {
      channel.pause();
      channel.volume = 0;
      this.channelSelections[index] = null;
      this.channelTokens[index] = 0;
    });
  }

  pauseChannelIfOwned(index, token) {
    if (this.channelTokens[index] !== token) return;
    const channel = this.channels[index];
    channel.pause();
    channel.currentTime = 0;
    channel.volume = 0;
    this.channelSelections[index] = null;
    this.channelTokens[index] = 0;
  }

  silenceInactiveChannels(activeIndex) {
    this.channels.forEach((channel, index) => {
      if (index === activeIndex) return;
      channel.pause();
      channel.currentTime = 0;
      channel.volume = 0;
      this.channelSelections[index] = null;
      this.channelTokens[index] = 0;
    });
  }

  setStatus(status, selection) {
    this.status = status;
    this.onStatusChange(this.getSnapshot(), selection);
  }
}

function isAutoplayBlock(error) {
  return error?.name === "NotAllowedError"
    || /user gesture|user interaction|not allowed/i.test(String(error?.message ?? ""));
}

function isPlaybackInterruption(error) {
  return error?.name === "AbortError"
    || /play(?:\(\))? request was interrupted|playback was interrupted/i.test(String(error?.message ?? ""));
}
