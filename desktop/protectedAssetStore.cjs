"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const MAX_CACHE_BYTES = 96 * 1024 * 1024;

function createProtectedAssetStore(options = {}) {
  const appRoot = path.resolve(options.appRoot);
  const protectedRoot = path.join(appRoot, "app", "protected");
  const bundlePath = path.join(protectedRoot, "itsees-assets.bin");
  const indexPath = path.join(protectedRoot, "itsees-assets.idx");
  const keyPath = path.join(appRoot, "desktop", "generatedAssetKey.cjs");
  const cache = new Map();
  let cacheBytes = 0;
  let bundleHandle = null;
  let entries = null;
  let dataKey = null;

  function isAvailable() {
    try {
      ensureLoaded();
      return true;
    } catch (error) {
      if (error?.code === "ENOENT" || error?.code === "MODULE_NOT_FOUND") return false;
      throw error;
    }
  }

  function has(rawPath) {
    if (!isAvailable()) return false;
    return entries.has(normalizeAssetPath(rawPath));
  }

  function read(rawPath) {
    if (!isAvailable()) return null;
    const assetPath = normalizeAssetPath(rawPath);
    const entry = entries.get(assetPath);
    if (!entry) return null;
    const cached = cache.get(assetPath);
    if (cached) {
      cache.delete(assetPath);
      cache.set(assetPath, cached);
      return Buffer.from(cached);
    }

    const ciphertext = Buffer.allocUnsafe(entry.length);
    const bytesRead = fs.readSync(bundleHandle, ciphertext, 0, entry.length, entry.offset);
    if (bytesRead !== entry.length) throw new Error(`Protected asset is truncated: ${assetPath}`);
    const decipher = crypto.createDecipheriv("aes-256-gcm", dataKey, Buffer.from(entry.nonce, "base64"));
    decipher.setAAD(Buffer.from(assetPath, "utf8"));
    decipher.setAuthTag(Buffer.from(entry.tag, "base64"));
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const digest = crypto.createHash("sha256").update(plaintext).digest("hex");
    if (digest !== entry.sha256) throw new Error(`Protected asset failed verification: ${assetPath}`);
    remember(assetPath, plaintext);
    return Buffer.from(plaintext);
  }

  function contentType(rawPath) {
    if (!isAvailable()) return null;
    return entries.get(normalizeAssetPath(rawPath))?.mimeType ?? null;
  }

  function close() {
    if (bundleHandle !== null) fs.closeSync(bundleHandle);
    bundleHandle = null;
    entries = null;
    dataKey = null;
    cache.clear();
    cacheBytes = 0;
  }

  function ensureLoaded() {
    if (entries) return;
    const masterKey = require(keyPath).getAssetKey();
    if (!Buffer.isBuffer(masterKey) || masterKey.length !== 32) throw new Error("Invalid protected asset key");
    const envelope = JSON.parse(fs.readFileSync(indexPath, "utf8"));
    if (envelope.schema !== "itsees-protected-index/1") throw new Error("Unsupported protected asset index");
    const salt = Buffer.from(envelope.salt, "base64");
    const indexKey = Buffer.from(crypto.hkdfSync("sha256", masterKey, salt, "itsees-assets-index-v1", 32));
    dataKey = Buffer.from(crypto.hkdfSync("sha256", masterKey, salt, "itsees-assets-data-v1", 32));
    const decipher = crypto.createDecipheriv("aes-256-gcm", indexKey, Buffer.from(envelope.nonce, "base64"));
    decipher.setAAD(Buffer.from("itsees-protected-index-v1", "utf8"));
    decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
    const decoded = Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, "base64")),
      decipher.final()
    ]);
    const index = JSON.parse(decoded.toString("utf8"));
    if (index.schema !== "itsees-protected-assets/1" || !Array.isArray(index.entries)) {
      throw new Error("Invalid protected asset index contents");
    }
    entries = new Map(index.entries.map(entry => [validateEntry(entry), entry]));
    bundleHandle = fs.openSync(bundlePath, "r");
  }

  function remember(assetPath, value) {
    if (value.length > MAX_CACHE_BYTES / 2) return;
    while (cacheBytes + value.length > MAX_CACHE_BYTES && cache.size) {
      const [oldestPath, oldestValue] = cache.entries().next().value;
      cache.delete(oldestPath);
      cacheBytes -= oldestValue.length;
    }
    cache.set(assetPath, value);
    cacheBytes += value.length;
  }

  return Object.freeze({ close, contentType, has, isAvailable, read });
}

function normalizeAssetPath(rawPath) {
  if (typeof rawPath !== "string") return "";
  return rawPath.replaceAll("\\", "/").replace(/^\/+/, "");
}

function validateEntry(entry) {
  const assetPath = normalizeAssetPath(entry?.path);
  if (!/^app\/assets\/[A-Za-z0-9_.\/-]+$/.test(assetPath) || assetPath.includes("../")) {
    throw new Error("Invalid protected asset path");
  }
  if (!Number.isSafeInteger(entry.offset) || entry.offset < 0 || !Number.isSafeInteger(entry.length) || entry.length < 0) {
    throw new Error(`Invalid protected asset bounds: ${assetPath}`);
  }
  return assetPath;
}

module.exports = { createProtectedAssetStore, normalizeAssetPath };
