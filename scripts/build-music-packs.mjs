import { createCipheriv, createHash, hkdfSync, randomBytes } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.join(projectRoot, "app", "assets", "music", "weather-bgm");
const outputRoot = path.resolve(process.env.ITSEES_MUSIC_PACK_OUTPUT
  ?? path.join(projectRoot, "..", "release-assets", "music-packs-v1"));
const manifestPath = path.join(projectRoot, "app", "music-packs-manifest.json");
const keyPath = path.join(projectRoot, ".release-secrets", "asset-key.base64");
const releaseBaseUrl = (process.env.ITSEES_MUSIC_PACK_BASE_URL
  ?? "https://github.com/LucyZ-sh/itsees/releases/download/music-packs-v1").replace(/\/$/, "");
const weatherIds = ["DEFAULT", "SUNNY", "RAIN", "FOG", "SNOW", "WIND", "HEAT"];
const builtInDestinationIds = new Set(["T01", "T02", "T03"]);
const destinationIds = [
  ...Array.from({ length: 15 }, (_, index) => `T${String(index + 1).padStart(2, "0")}`),
  "fr_paris", "jp_tokyo", "cn_hong_kong", "us_grand_canyon", "amazon_rainforest",
  "tz_serengeti", "us_hawaii", "it_amalfi", "gr_greek_islands", "eu_alps",
  "it_tuscany", "no_norway_coast", "cn_great_wall", "in_taj_mahal", "eg_giza_pyramids"
];

const masterKey = decodeKey((await readFile(keyPath, "utf8")).trim());
await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

const destinations = [];
for (const destinationId of destinationIds) {
  if (builtInDestinationIds.has(destinationId)) continue;
  const fileEntries = [];
  for (const weatherId of weatherIds) {
    const fileName = `${destinationId}-${weatherId}.mp3`;
    const bytes = await readFile(path.join(sourceRoot, fileName));
    const salt = randomBytes(16);
    const nonce = randomBytes(12);
    const key = deriveTrackKey(masterKey, salt, destinationId, weatherId);
    const cipher = createCipheriv("aes-256-gcm", key, nonce);
    cipher.setAAD(Buffer.from(trackAad(destinationId, weatherId)));
    const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()]);
    const assetName = `${fileName}.bin`;
    await writeFile(path.join(outputRoot, assetName), ciphertext, { mode: 0o600 });
    fileEntries.push({
      weatherId,
      fileName,
      url: `${releaseBaseUrl}/${assetName}`,
      size: ciphertext.byteLength,
      sha256: digest(ciphertext),
      plaintextSha256: digest(bytes),
      salt: salt.toString("base64"),
      nonce: nonce.toString("base64"),
      tag: cipher.getAuthTag().toString("base64")
    });
  }
  destinations.push({
    destinationId,
    files: fileEntries
  });
}

const manifest = {
  schema: "itsees-music-packs/1",
  version: "music-packs-v1",
  generatedAt: new Date().toISOString(),
  builtInDestinationIds: [...builtInDestinationIds],
  weatherIds,
  destinations
};
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(path.join(outputRoot, "music-packs-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
const totalBytes = destinations.flatMap(item => item.files).reduce((sum, item) => sum + item.size, 0);
process.stdout.write(`Built ${destinations.length} encrypted destination music packs / ${destinations.length * weatherIds.length} tracks (${formatBytes(totalBytes)})\n`);

function deriveTrackKey(key, salt, destinationId, weatherId) {
  return Buffer.from(hkdfSync("sha256", key, salt, `itsees-music-track-v1:${destinationId}:${weatherId}`, 32));
}

function trackAad(destinationId, weatherId) {
  return `itsees-music-track-v1:${destinationId}:${weatherId}`;
}

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function decodeKey(encoded) {
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("Asset key must decode to exactly 32 bytes");
  return key;
}

function formatBytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
}
