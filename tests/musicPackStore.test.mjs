import assert from "node:assert/strict";
import { createCipheriv, createHash, hkdfSync, randomBytes } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createMusicPackStore } = require("../desktop/musicPackStore.cjs");

test("music pack prioritizes current weather and DEFAULT, then fills the remaining cache", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "itsees-music-pack-test-"));
  try {
    const fixture = await createFixture(root);
    const requests = [];
    const statuses = [];
    const store = createMusicPackStore({
      appRoot: fixture.appRoot,
      cacheRoot: fixture.cacheRoot,
      fetchImpl: async url => {
        const fileName = path.basename(new URL(url).pathname);
        requests.push(fileName);
        return new Response(fixture.ciphertexts.get(fileName), { status: 200 });
      },
      onStatus: status => statuses.push(status)
    });

    const ready = await store.ensureDestination("T04", "RAIN");
    assert.equal(ready.state, "ready");
    assert.equal(requests[0], "T04-RAIN.mp3.bin");
    assert.deepEqual(store.read("app/assets/music/weather-bgm/T04-RAIN.mp3"), fixture.plaintexts.get("RAIN"));

    await waitFor(() => statuses.some(status => status.state === "ready" && status.receivedBytes === 7));
    assert.equal(new Set(requests).size, 7);
    assert.equal(requests.includes("T04-DEFAULT.mp3.bin"), true);
    assert.deepEqual(store.read("app/assets/music/weather-bgm/T04-DEFAULT.mp3"), fixture.plaintexts.get("DEFAULT"));
    assert.equal(statuses.some(status => status.state === "ready"), true);
    const cacheStatus = await store.getCacheStatus();
    assert.deepEqual(cacheStatus.destinations, ["T04"]);
    assert.deepEqual(cacheStatus.completeDestinations, ["T04"]);
    await store.clearCache();
    assert.equal(store.hasDestination("T04"), false);
    store.close();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("music pack reports partial caches so interrupted background downloads can resume", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "itsees-music-pack-partial-"));
  try {
    const fixture = await createFixture(root);
    const firstFile = JSON.parse(await readFile(fixture.manifestPath, "utf8")).destinations[0].files[0];
    await mkdir(fixture.cacheRoot, { recursive: true });
    await writeFile(path.join(fixture.cacheRoot, `${firstFile.fileName}.bin`), fixture.ciphertexts.get(`${firstFile.fileName}.bin`));
    const store = createMusicPackStore({
      appRoot: fixture.appRoot,
      cacheRoot: fixture.cacheRoot,
      fetchImpl: async url => {
        const fileName = path.basename(new URL(url).pathname);
        return new Response(fixture.ciphertexts.get(fileName), { status: 200 });
      }
    });

    const partial = await store.getCacheStatus();
    assert.deepEqual(partial.destinations, ["T04"]);
    assert.deepEqual(partial.completeDestinations, []);
    await store.ensureDestination("T04", "DEFAULT");
    await waitFor(async () => (await store.getCacheStatus()).completeDestinations.includes("T04"));
    store.close();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("music pack aborts a stalled track download", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "itsees-music-pack-timeout-"));
  try {
    const fixture = await createFixture(root);
    const store = createMusicPackStore({
      appRoot: fixture.appRoot,
      cacheRoot: fixture.cacheRoot,
      downloadTimeoutMs: 20,
      fetchImpl: async (_url, { signal }) => new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      })
    });
    await assert.rejects(store.ensureDestination("T04", "RAIN"), /timed out/i);
    store.close();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("music pack rejects corrupt tracks and unsupported destinations", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "itsees-music-pack-reject-"));
  try {
    const fixture = await createFixture(root);
    const store = createMusicPackStore({
      appRoot: fixture.appRoot,
      cacheRoot: fixture.cacheRoot,
      fetchImpl: async () => new Response(Buffer.from("corrupt"), { status: 200 })
    });
    await assert.rejects(store.ensureDestination("T04", "RAIN"), /checksum|declared size/);
    await assert.rejects(store.ensureDestination("not-a-place"), /Unsupported music destination/);
    assert.equal(store.hasDestination("T04"), false);
    store.close();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function createFixture(root) {
  const appRoot = path.join(root, "app-root");
  const cacheRoot = path.join(root, "cache");
  await mkdir(path.join(appRoot, "app"), { recursive: true });
  await mkdir(path.join(appRoot, "desktop"), { recursive: true });
  const masterKey = randomBytes(32);
  await writeFile(path.join(appRoot, "desktop", "generatedAssetKey.cjs"), `module.exports={getAssetKey:()=>Buffer.from('${masterKey.toString("base64")}','base64')};\n`);
  const weatherIds = ["DEFAULT", "SUNNY", "RAIN", "FOG", "SNOW", "WIND", "HEAT"];
  const plaintexts = new Map(weatherIds.map(weatherId => [weatherId, Buffer.from(`original-${weatherId}-mp3-bytes`)]));
  const ciphertexts = new Map();
  const files = [];
  for (const weatherId of weatherIds) {
    const plaintext = plaintexts.get(weatherId);
    const salt = randomBytes(16);
    const nonce = randomBytes(12);
    const key = Buffer.from(hkdfSync("sha256", masterKey, salt, `itsees-music-track-v1:T04:${weatherId}`, 32));
    const cipher = createCipheriv("aes-256-gcm", key, nonce);
    cipher.setAAD(Buffer.from(`itsees-music-track-v1:T04:${weatherId}`));
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const assetName = `T04-${weatherId}.mp3.bin`;
    ciphertexts.set(assetName, ciphertext);
    files.push({
      weatherId, fileName: `T04-${weatherId}.mp3`, url: `https://github.com/example/${assetName}`,
      size: ciphertext.byteLength, sha256: digest(ciphertext), plaintextSha256: digest(plaintext),
      salt: salt.toString("base64"), nonce: nonce.toString("base64"), tag: cipher.getAuthTag().toString("base64")
    });
  }
  const manifestPath = path.join(appRoot, "app", "music-packs-manifest.json");
  await writeFile(manifestPath, JSON.stringify({
    schema: "itsees-music-packs/1", version: "test", builtInDestinationIds: ["T01", "T02", "T03"],
    weatherIds, destinations: [{ destinationId: "T04", files }]
  }));
  return { appRoot, cacheRoot, ciphertexts, plaintexts, manifestPath };
}

async function waitFor(predicate) {
  const deadline = Date.now() + 2_000;
  while (!await predicate()) {
    if (Date.now() > deadline) throw new Error("Timed out waiting for background downloads");
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
