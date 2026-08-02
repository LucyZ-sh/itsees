const fs = require("fs");
const path = require("path");

const POSTCARD_INDEX_VERSION = 1;
const MAX_POSTCARD_BYTES = 8 * 1024 * 1024;

function createPostcardAssetStore(options = {}) {
  const appRoot = path.resolve(options.appRoot);
  const stateDirectory = path.resolve(options.stateDirectory);
  const postcardDirectory = path.join(stateDirectory, "postcards");
  const indexPath = path.join(postcardDirectory, "index.json");
  const readProtectedAsset = typeof options.readProtectedAsset === "function"
    ? options.readProtectedAsset
    : null;

  function sync(state) {
    const index = readIndex();
    const postcards = Array.isArray(state?.album) ? state.album : [];
    for (const postcard of postcards) {
      const postcardId = normalizePostcardId(postcard?.id);
      const sourcePath = resolvePostcardSource(appRoot, postcard?.sceneImageAsset);
      if (!postcardId || !sourcePath) continue;

      let sourceStats;
      let protectedBytes = null;
      try {
        sourceStats = fs.statSync(sourcePath);
      } catch (error) {
        if (error?.code !== "ENOENT" || !readProtectedAsset) continue;
        const relativePath = path.relative(appRoot, sourcePath).split(path.sep).join("/");
        try {
          protectedBytes = readProtectedAsset(relativePath);
        } catch {
          continue;
        }
      }
      const sourceSize = protectedBytes?.byteLength ?? sourceStats?.size ?? 0;
      if ((!protectedBytes && !sourceStats?.isFile()) || sourceSize <= 0 || sourceSize > MAX_POSTCARD_BYTES) continue;

      const extension = path.extname(sourcePath).toLowerCase();
      const mimeType = getImageMimeType(extension);
      if (!mimeType) continue;

      fs.mkdirSync(postcardDirectory, { recursive: true, mode: 0o700 });
      const filePath = path.join(postcardDirectory, `${safeFileName(postcardId)}${extension}`);
      const existingSize = readFileSize(filePath);
      if (existingSize !== sourceSize) {
        if (protectedBytes) fs.writeFileSync(filePath, protectedBytes, { mode: 0o600 });
        else fs.copyFileSync(sourcePath, filePath);
        fs.chmodSync(filePath, 0o600);
      }
      index.postcards[postcardId] = {
        filePath,
        mimeType,
        byteLength: sourceSize,
        sourceAsset: postcard.sceneImageAsset,
        updatedAt: new Date().toISOString()
      };
    }
    writeIndex(index);
    return index;
  }

  function readIndex() {
    try {
      const parsed = JSON.parse(fs.readFileSync(indexPath, "utf8"));
      if (parsed?.version !== POSTCARD_INDEX_VERSION || !isRecord(parsed.postcards)) {
        return createEmptyIndex();
      }
      return parsed;
    } catch (error) {
      if (error?.code === "ENOENT") return createEmptyIndex();
      return createEmptyIndex();
    }
  }

  function writeIndex(index) {
    fs.mkdirSync(postcardDirectory, { recursive: true, mode: 0o700 });
    const temporaryPath = `${indexPath}.${process.pid}.${Date.now()}.tmp`;
    try {
      fs.writeFileSync(temporaryPath, `${JSON.stringify(index, null, 2)}\n`, {
        encoding: "utf8",
        mode: 0o600
      });
      fs.renameSync(temporaryPath, indexPath);
    } finally {
      try {
        fs.unlinkSync(temporaryPath);
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
    }
  }

  return Object.freeze({
    indexPath,
    postcardDirectory,
    readIndex,
    sync
  });
}

function resolvePostcardSource(appRoot, rawAsset) {
  if (typeof rawAsset !== "string") return null;
  const asset = rawAsset.replaceAll("\\", "/");
  let baseDirectory;
  let relativePath;

  if (/^\.\/assets\/themes\/[A-Za-z0-9_-]+\/scenes\/[A-Za-z0-9_-]+\.(?:png|webp)$/i.test(asset)) {
    baseDirectory = path.join(appRoot, "app");
    relativePath = asset.slice(2);
  } else if (/^\.\/assets\/atlas\/[A-Za-z0-9_./-]+\.(?:png|webp)$/i.test(asset)) {
    baseDirectory = path.join(appRoot, "app");
    relativePath = asset.slice(2);
  } else if (/^(?:\.\.\/|\/)?phase2-app\/assets\/[A-Za-z0-9_./-]+\.(?:png|webp)$/i.test(asset)) {
    baseDirectory = path.join(appRoot, "app", "assets", "atlas");
    relativePath = asset.replace(/^(?:\.\.\/|\/)?phase2-app\/assets\//, "");
  } else if (/^\/phase2-assets\/[A-Za-z0-9_./-]+\.(?:png|webp)$/i.test(asset)) {
    baseDirectory = path.join(appRoot, "app", "assets", "atlas");
    relativePath = asset.slice("/phase2-assets/".length);
  } else {
    return null;
  }

  const resolvedBase = path.resolve(baseDirectory);
  const resolvedPath = path.resolve(resolvedBase, relativePath);
  if (resolvedPath !== resolvedBase && !resolvedPath.startsWith(`${resolvedBase}${path.sep}`)) return null;
  return resolvedPath;
}

function normalizePostcardId(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return /^[A-Za-z0-9_:-]{1,160}$/.test(normalized) ? normalized : null;
}

function safeFileName(postcardId) {
  return postcardId.replace(/[^A-Za-z0-9_-]/g, "_");
}

function getImageMimeType(extension) {
  if (extension === ".webp") return "image/webp";
  if (extension === ".png") return "image/png";
  return null;
}

function readFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.isFile() ? stats.size : null;
  } catch {
    return null;
  }
}

function createEmptyIndex() {
  return {
    version: POSTCARD_INDEX_VERSION,
    postcards: {}
  };
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

module.exports = {
  MAX_POSTCARD_BYTES,
  POSTCARD_INDEX_VERSION,
  createPostcardAssetStore,
  resolvePostcardSource
};
