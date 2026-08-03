"use strict";

const crypto = require("crypto");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

const DEFAULT_MAX_CACHE_BYTES = 500 * 1024 * 1024;
const DEFAULT_DOWNLOAD_TIMEOUT_MS = 45_000;
const MAX_TRACK_BYTES = 16 * 1024 * 1024;
const ALLOWED_DOWNLOAD_HOSTS = new Set(["github.com"]);
const ALLOWED_RESPONSE_HOSTS = new Set(["github.com", "release-assets.githubusercontent.com"]);
const WEATHER_IDS = ["DEFAULT", "SUNNY", "RAIN", "FOG", "SNOW", "WIND", "HEAT"];
const MUSIC_PATH_PATTERN = /^app\/assets\/music\/weather-bgm\/([A-Za-z0-9_-]+)-(DEFAULT|SUNNY|RAIN|FOG|SNOW|WIND|HEAT)\.mp3$/;

function createMusicPackStore(options = {}) {
  const appRoot = path.resolve(options.appRoot);
  const cacheRoot = path.resolve(options.cacheRoot);
  const manifestPath = options.manifestPath ?? path.join(appRoot, "app", "music-packs-manifest.json");
  const keyPath = options.keyPath ?? path.join(appRoot, "desktop", "generatedAssetKey.cjs");
  const fetchImpl = options.fetchImpl;
  const maxCacheBytes = options.maxCacheBytes ?? DEFAULT_MAX_CACHE_BYTES;
  const downloadTimeoutMs = options.downloadTimeoutMs ?? DEFAULT_DOWNLOAD_TIMEOUT_MS;
  const onStatus = options.onStatus ?? (() => {});
  const manifest = validateManifest(JSON.parse(fs.readFileSync(manifestPath, "utf8")));
  const entries = new Map(manifest.destinations.map(entry => [entry.destinationId, entry]));
  const builtInDestinationIds = new Set(manifest.builtInDestinationIds);
  const pendingTracks = new Map();
  const pendingDestinations = new Map();
  const backgroundTasks = new Set();
  const decryptedTracks = new Map();

  function isBuiltIn(destinationId) {
    return builtInDestinationIds.has(destinationId);
  }

  function hasDestination(destinationId) {
    if (isBuiltIn(destinationId)) return true;
    const entry = entries.get(destinationId);
    return Boolean(entry && entry.files.some(file => validCachedTrack(file)));
  }

  function read(rawPath) {
    const match = normalizeAssetPath(rawPath).match(MUSIC_PATH_PATTERN);
    if (!match) return null;
    const [, destinationId, weatherId] = match;
    const destination = entries.get(destinationId);
    const file = destination?.files.find(candidate => candidate.weatherId === weatherId);
    if (!file || !validCachedTrack(file)) return null;
    try {
      const cacheKey = `${destinationId}:${weatherId}`;
      const cached = decryptedTracks.get(cacheKey);
      if (cached) return Buffer.from(cached);
      const ciphertext = fs.readFileSync(trackPath(file));
      if (digest(ciphertext) !== file.sha256) throw new Error("encrypted checksum mismatch");
      const masterKey = require(keyPath).getAssetKey();
      const key = Buffer.from(crypto.hkdfSync(
        "sha256", masterKey, Buffer.from(file.salt, "base64"),
        `itsees-music-track-v1:${destinationId}:${weatherId}`, 32
      ));
      const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(file.nonce, "base64"));
      decipher.setAAD(Buffer.from(`itsees-music-track-v1:${destinationId}:${weatherId}`));
      decipher.setAuthTag(Buffer.from(file.tag, "base64"));
      const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      if (digest(plaintext) !== file.plaintextSha256) throw new Error("plaintext checksum mismatch");
      rememberTrack(cacheKey, plaintext);
      touchTrack(file);
      return Buffer.from(plaintext);
    } catch (error) {
      invalidateTrack(destinationId, file, error);
      return null;
    }
  }

  async function ensureDestination(destinationId, preferredWeatherId = "DEFAULT") {
    if (isBuiltIn(destinationId)) return statusFor(destinationId, "built_in", 7, 7);
    const destination = entries.get(destinationId);
    if (!destination) throw new TypeError(`Unsupported music destination: ${String(destinationId)}`);
    const preferred = WEATHER_IDS.includes(preferredWeatherId) ? preferredWeatherId : "DEFAULT";
    const taskKey = `${destinationId}:${preferred}`;
    if (pendingDestinations.has(taskKey)) return pendingDestinations.get(taskKey);
    const task = preparePlayableTracks(destination, preferred).finally(() => pendingDestinations.delete(taskKey));
    pendingDestinations.set(taskKey, task);
    return task;
  }

  async function preparePlayableTracks(destination, preferredWeatherId) {
    let playableWeatherId = preferredWeatherId;
    try {
      await downloadTrack(destination, playableWeatherId, true);
    } catch (error) {
      if (playableWeatherId === "DEFAULT") throw error;
      playableWeatherId = "DEFAULT";
      await downloadTrack(destination, playableWeatherId, true);
    }
    const completedTracks = countCachedTracks(destination);
    const status = statusFor(destination.destinationId, "ready", completedTracks, 7);
    onStatus(status);
    const backgroundTask = downloadRemainingTracks(destination, [playableWeatherId]);
    backgroundTasks.add(backgroundTask);
    void backgroundTask.finally(() => backgroundTasks.delete(backgroundTask));
    return status;
  }

  async function downloadRemainingTracks(destination, priorityWeatherIds) {
    for (const weatherId of WEATHER_IDS) {
      if (priorityWeatherIds.includes(weatherId)) continue;
      try {
        await downloadTrack(destination, weatherId, false);
        onStatus({ ...statusFor(destination.destinationId, "ready", countCachedTracks(destination), 7), backgroundDownloading: countCachedTracks(destination) < 7 });
      } catch (error) {
        onStatus({ ...statusFor(destination.destinationId, "ready", countCachedTracks(destination), 7), backgroundDownloading: false, message: error.message });
        break;
      }
    }
  }

  async function downloadTrack(destination, weatherId, announce) {
    const file = destination.files.find(candidate => candidate.weatherId === weatherId);
    if (!file) throw new Error(`Music manifest is missing ${destination.destinationId}-${weatherId}`);
    if (validCachedTrack(file)) return;
    const pendingKey = `${destination.destinationId}:${weatherId}`;
    if (pendingTracks.has(pendingKey)) return pendingTracks.get(pendingKey);
    if (!fetchImpl) throw new Error("Music pack download is unavailable");
    const task = performTrackDownload(destination, file, announce).finally(() => pendingTracks.delete(pendingKey));
    pendingTracks.set(pendingKey, task);
    return task;
  }

  async function performTrackDownload(destination, file, announce) {
    const url = new URL(file.url);
    if (url.protocol !== "https:" || !ALLOWED_DOWNLOAD_HOSTS.has(url.hostname)) throw new Error(`Unsupported music pack host: ${url.hostname}`);
    await fsp.mkdir(cacheRoot, { recursive: true, mode: 0o700 });
    const targetPath = trackPath(file);
    const temporaryPath = `${targetPath}.part-${process.pid}-${Date.now()}`;
    let receivedBytes = 0;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error("Music download timed out")), downloadTimeoutMs);
    if (announce) onStatus({ ...statusFor(destination.destinationId, "downloading", 0, file.size), weatherId: file.weatherId });
    try {
      const response = await fetchImpl(file.url, { redirect: "follow", signal: controller.signal });
      if (!response.ok || !response.body) throw new Error(`Music download failed with HTTP ${response.status}`);
      const responseUrl = new URL(response.url || file.url);
      if (responseUrl.protocol !== "https:" || !ALLOWED_RESPONSE_HOSTS.has(responseUrl.hostname)) {
        throw new Error(`Unsupported music response host: ${responseUrl.hostname}`);
      }
      const output = await fsp.open(temporaryPath, "wx", 0o600);
      const hash = crypto.createHash("sha256");
      try {
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = Buffer.from(value);
          receivedBytes += chunk.byteLength;
          if (receivedBytes > file.size || receivedBytes > MAX_TRACK_BYTES) throw new Error("Music track exceeds its declared size");
          hash.update(chunk);
          await output.write(chunk);
          if (announce) onStatus({ ...statusFor(destination.destinationId, "downloading", receivedBytes, file.size), weatherId: file.weatherId });
        }
      } finally {
        await output.close();
      }
      if (receivedBytes !== file.size || hash.digest("hex") !== file.sha256) throw new Error("Music track checksum mismatch");
      await fsp.rename(temporaryPath, targetPath);
      await enforceCacheLimit(destination.destinationId);
    } catch (error) {
      await fsp.rm(temporaryPath, { force: true });
      if (announce) onStatus({ ...statusFor(destination.destinationId, "error", receivedBytes, file.size), weatherId: file.weatherId, message: error.message });
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function getCacheStatus() {
    await fsp.mkdir(cacheRoot, { recursive: true, mode: 0o700 });
    const destinations = [];
    const completeDestinations = [];
    let totalBytes = 0;
    for (const destination of entries.values()) {
      const cachedFiles = destination.files.filter(file => validCachedTrack(file));
      if (cachedFiles.length) destinations.push(destination.destinationId);
      if (cachedFiles.length === destination.files.length) completeDestinations.push(destination.destinationId);
      totalBytes += cachedFiles.reduce((sum, file) => sum + file.size, 0);
    }
    return {
      totalBytes,
      maxBytes: maxCacheBytes,
      destinations: destinations.sort(),
      completeDestinations: completeDestinations.sort()
    };
  }

  async function clearCache() {
    await Promise.allSettled([...backgroundTasks, ...pendingTracks.values()]);
    await fsp.rm(cacheRoot, { recursive: true, force: true });
    await fsp.mkdir(cacheRoot, { recursive: true, mode: 0o700 });
    decryptedTracks.clear();
    return getCacheStatus();
  }

  function close() {
    decryptedTracks.clear();
    pendingTracks.clear();
    pendingDestinations.clear();
    backgroundTasks.clear();
  }

  function countCachedTracks(destination) {
    return destination.files.filter(file => validCachedTrack(file)).length;
  }

  function validCachedTrack(file) {
    try {
      const details = fs.statSync(trackPath(file));
      return details.isFile() && details.size === file.size;
    } catch { return false; }
  }

  function trackPath(file) {
    return path.join(cacheRoot, `${file.fileName}.bin`);
  }

  function touchTrack(file) {
    const now = new Date();
    try { fs.utimesSync(trackPath(file), now, now); } catch {}
  }

  function invalidateTrack(destinationId, file, error) {
    try { fs.rmSync(trackPath(file), { force: true }); } catch {}
    decryptedTracks.delete(`${destinationId}:${file.weatherId}`);
    onStatus({ ...statusFor(destinationId, "error", 0, file.size), weatherId: file.weatherId, message: `Cached music verification failed: ${error.message}` });
  }

  function rememberTrack(cacheKey, bytes) {
    decryptedTracks.set(cacheKey, bytes);
    while (decryptedTracks.size > 4) decryptedTracks.delete(decryptedTracks.keys().next().value);
  }

  async function enforceCacheLimit(keepDestinationId) {
    const cached = [];
    let total = 0;
    for (const destination of entries.values()) {
      for (const file of destination.files) {
        try {
          const details = await fsp.stat(trackPath(file));
          if (!details.isFile() || details.size !== file.size) continue;
          cached.push({ destinationId: destination.destinationId, file, mtimeMs: details.mtimeMs });
          total += details.size;
        } catch {}
      }
    }
    cached.sort((left, right) => left.mtimeMs - right.mtimeMs);
    for (const item of cached) {
      if (total <= maxCacheBytes) break;
      if (item.destinationId === keepDestinationId) continue;
      await fsp.rm(trackPath(item.file), { force: true });
      decryptedTracks.delete(`${item.destinationId}:${item.file.weatherId}`);
      total -= item.file.size;
    }
  }

  return Object.freeze({ clearCache, close, ensureDestination, getCacheStatus, hasDestination, isBuiltIn, read });
}

function validateManifest(manifest) {
  if (manifest?.schema !== "itsees-music-packs/1" || !Array.isArray(manifest.destinations)) throw new Error("Unsupported music pack manifest");
  for (const entry of manifest.destinations) {
    if (!/^[A-Za-z0-9_-]+$/.test(entry.destinationId) || !Array.isArray(entry.files) || entry.files.length !== 7) throw new Error("Invalid music pack manifest entry");
    for (const file of entry.files) {
      if (!WEATHER_IDS.includes(file.weatherId) || !Number.isSafeInteger(file.size) || file.size <= 0 || file.size > MAX_TRACK_BYTES) throw new Error("Invalid music track manifest entry");
    }
  }
  return manifest;
}

function normalizeAssetPath(rawPath) {
  return typeof rawPath === "string" ? rawPath.replaceAll("\\", "/").replace(/^\/+/, "") : "";
}

function statusFor(destinationId, state, receivedBytes = 0, totalBytes = 0) {
  return { destinationId, state, receivedBytes, totalBytes };
}

function digest(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

module.exports = { createMusicPackStore, validateManifest };
