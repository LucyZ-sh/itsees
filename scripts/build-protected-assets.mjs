import {
  createCipheriv,
  createHash,
  hkdfSync,
  randomBytes
} from "node:crypto";
import {
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile
} from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const assetRoot = path.join(projectRoot, "app", "assets");
const protectedRoot = path.join(projectRoot, "app", "protected");
const secretRoot = path.join(projectRoot, ".release-secrets");
const secretPath = path.join(secretRoot, "asset-key.base64");
const generatedKeyPath = path.join(projectRoot, "desktop", "generatedAssetKey.cjs");
const bundlePath = path.join(protectedRoot, "itsees-assets.bin");
const indexPath = path.join(protectedRoot, "itsees-assets.idx");
const temporaryBundlePath = `${bundlePath}.tmp`;
const temporaryIndexPath = `${indexPath}.tmp`;
const protectedDirectories = ["atlas", "maps", "music", "pack", "pets", "souvenirs", "themes"];

await mkdir(protectedRoot, { recursive: true });
const masterKey = await loadOrCreateMasterKey();
const salt = randomBytes(16);
const dataKey = Buffer.from(hkdfSync("sha256", masterKey, salt, "itsees-assets-data-v1", 32));
const indexKey = Buffer.from(hkdfSync("sha256", masterKey, salt, "itsees-assets-index-v1", 32));
const entries = [];
let offset = 0;
const output = await open(temporaryBundlePath, "w", 0o600);

try {
  for (const relativePath of await collectProtectedAssets()) {
    const sourcePath = path.join(assetRoot, relativePath);
    const plaintext = await readFile(sourcePath);
    const nonce = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", dataKey, nonce);
    cipher.setAAD(Buffer.from(`app/assets/${relativePath}`, "utf8"));
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    await output.write(ciphertext, 0, ciphertext.length, offset);
    entries.push({
      path: `app/assets/${relativePath}`,
      offset,
      length: ciphertext.length,
      nonce: nonce.toString("base64"),
      tag: tag.toString("base64"),
      mimeType: mimeTypeFor(relativePath),
      sha256: createHash("sha256").update(plaintext).digest("hex")
    });
    offset += ciphertext.length;
  }
} finally {
  await output.close();
}

const indexNonce = randomBytes(12);
const indexCipher = createCipheriv("aes-256-gcm", indexKey, indexNonce);
indexCipher.setAAD(Buffer.from("itsees-protected-index-v1", "utf8"));
const encryptedIndex = Buffer.concat([
  indexCipher.update(Buffer.from(JSON.stringify({ schema: "itsees-protected-assets/1", entries }), "utf8")),
  indexCipher.final()
]);
const indexEnvelope = {
  schema: "itsees-protected-index/1",
  salt: salt.toString("base64"),
  nonce: indexNonce.toString("base64"),
  tag: indexCipher.getAuthTag().toString("base64"),
  ciphertext: encryptedIndex.toString("base64")
};

await writeFile(temporaryIndexPath, `${JSON.stringify(indexEnvelope)}\n`, { mode: 0o600 });
await rename(temporaryBundlePath, bundlePath);
await rename(temporaryIndexPath, indexPath);
await writeGeneratedKeyModule(masterKey);

process.stdout.write(`Protected ${entries.length} assets (${formatBytes(offset)}) with AES-256-GCM\n`);

async function loadOrCreateMasterKey() {
  const environmentKey = process.env.ITSEES_ASSET_KEY_BASE64?.trim();
  if (environmentKey) return decodeKey(environmentKey, "ITSEES_ASSET_KEY_BASE64");
  try {
    return decodeKey((await readFile(secretPath, "utf8")).trim(), secretPath);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const generated = randomBytes(32);
  await mkdir(secretRoot, { recursive: true, mode: 0o700 });
  await writeFile(secretPath, `${generated.toString("base64")}\n`, { mode: 0o600 });
  return generated;
}

function decodeKey(encoded, source) {
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error(`${source} must decode to exactly 32 bytes`);
  return key;
}

async function collectProtectedAssets() {
  const files = [];
  for (const directory of protectedDirectories) {
    const directoryPath = path.join(assetRoot, directory);
    const details = await stat(directoryPath);
    if (!details.isDirectory()) throw new Error(`Missing protected asset directory: ${directoryPath}`);
    await walk(directoryPath, directory, files);
  }
  return files
    .filter(relativePath => !relativePath.startsWith("music/weather-bgm/")
      || /^music\/weather-bgm\/T0[1-3]-(DEFAULT|SUNNY|RAIN|FOG|SNOW|WIND|HEAT)\.mp3$/.test(relativePath))
    .sort((left, right) => left.localeCompare(right));
}

async function walk(directoryPath, relativeRoot, files) {
  for (const entry of await readdir(directoryPath, { withFileTypes: true })) {
    const entryPath = path.join(directoryPath, entry.name);
    const relativePath = path.posix.join(relativeRoot, entry.name);
    if (entry.isDirectory()) await walk(entryPath, relativePath, files);
    else if (entry.isFile() && !entry.name.startsWith(".")) files.push(relativePath);
  }
}

async function writeGeneratedKeyModule(key) {
  const masks = [randomBytes(32), randomBytes(32), randomBytes(32)];
  const finalPart = Buffer.alloc(32);
  for (let index = 0; index < 32; index += 1) {
    finalPart[index] = key[index] ^ masks[0][index] ^ masks[1][index] ^ masks[2][index];
  }
  const parts = [...masks, finalPart].map(part => [...part]);
  const source = `"use strict";\n\nconst parts = ${JSON.stringify(parts)};\n\nfunction getAssetKey() {\n  const key = Buffer.alloc(32);\n  for (let index = 0; index < key.length; index += 1) {\n    key[index] = parts[0][index] ^ parts[1][index] ^ parts[2][index] ^ parts[3][index];\n  }\n  return key;\n}\n\nmodule.exports = { getAssetKey };\n`;
  await writeFile(generatedKeyPath, source, { mode: 0o600 });
}

function mimeTypeFor(filePath) {
  switch (path.extname(filePath).toLowerCase()) {
    case ".gif": return "image/gif";
    case ".jpeg":
    case ".jpg": return "image/jpeg";
    case ".mp3": return "audio/mpeg";
    case ".png": return "image/png";
    case ".svg": return "image/svg+xml";
    case ".webp": return "image/webp";
    default: return "application/octet-stream";
  }
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KiB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
}

process.on("exit", () => {
  void rm(temporaryBundlePath, { force: true });
  void rm(temporaryIndexPath, { force: true });
});
