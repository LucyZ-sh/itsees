import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createProtectedAssetStore } = require("../desktop/protectedAssetStore.cjs");
const packageConfig = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const buildScript = await readFile(new URL("../scripts/build-protected-assets.mjs", import.meta.url), "utf8");
const mainSource = await readFile(new URL("../desktop/main.cjs", import.meta.url), "utf8");

test("release builds protect runtime assets and exclude plaintext directories", () => {
  assert.match(packageConfig.scripts["dist:mac"], /assets:protect/);
  assert.match(packageConfig.scripts["dist:mac:signed"], /assets:protect/);
  assert.deepEqual(packageConfig.build.asarUnpack, ["app/protected/**/*"]);
  for (const directory of ["atlas", "maps", "music", "pack", "pets", "souvenirs", "themes"]) {
    assert.ok(packageConfig.build.files.includes(`!app/assets/${directory}/**/*`));
  }
  assert.match(buildScript, /aes-256-gcm/);
  assert.match(buildScript, /hkdfSync/);
  assert.match(buildScript, /T0\[1-3\]/);
  assert.match(mainSource, /protectedAssetStore\.read\(protectedPath\)/);
});

test("protected asset store decrypts an authenticated random-access entry", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "itsees-protected-test-"));
  try {
    const appRoot = path.join(root, "app-root");
    await mkdir(path.join(appRoot, "app", "protected"), { recursive: true });
    await mkdir(path.join(appRoot, "desktop"), { recursive: true });
    const masterKey = randomBytes(32);
    const fixture = Buffer.from("private Itsees postcard fixture");
    const assetPath = "app/assets/themes/T01/scenes/T01-S01.webp";
    await writeFile(path.join(appRoot, "desktop", "generatedAssetKey.cjs"), `module.exports={getAssetKey:()=>Buffer.from('${masterKey.toString("base64")}','base64')};\n`);

    const { createCipheriv, hkdfSync } = await import("node:crypto");
    const salt = randomBytes(16);
    const dataKey = Buffer.from(hkdfSync("sha256", masterKey, salt, "itsees-assets-data-v1", 32));
    const nonce = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", dataKey, nonce);
    cipher.setAAD(Buffer.from(assetPath));
    const ciphertext = Buffer.concat([cipher.update(fixture), cipher.final()]);
    await writeFile(path.join(appRoot, "app", "protected", "itsees-assets.bin"), ciphertext);

    const index = {
      schema: "itsees-protected-assets/1",
      entries: [{
        path: assetPath,
        offset: 0,
        length: ciphertext.length,
        nonce: nonce.toString("base64"),
        tag: cipher.getAuthTag().toString("base64"),
        mimeType: "image/webp",
        sha256: createHash("sha256").update(fixture).digest("hex")
      }]
    };
    const indexKey = Buffer.from(hkdfSync("sha256", masterKey, salt, "itsees-assets-index-v1", 32));
    const indexNonce = randomBytes(12);
    const indexCipher = createCipheriv("aes-256-gcm", indexKey, indexNonce);
    indexCipher.setAAD(Buffer.from("itsees-protected-index-v1"));
    const encryptedIndex = Buffer.concat([indexCipher.update(JSON.stringify(index)), indexCipher.final()]);
    await writeFile(path.join(appRoot, "app", "protected", "itsees-assets.idx"), JSON.stringify({
      schema: "itsees-protected-index/1",
      salt: salt.toString("base64"),
      nonce: indexNonce.toString("base64"),
      tag: indexCipher.getAuthTag().toString("base64"),
      ciphertext: encryptedIndex.toString("base64")
    }));

    const store = createProtectedAssetStore({ appRoot });
    assert.equal(store.isAvailable(), true);
    assert.equal(store.has(assetPath), true);
    assert.deepEqual(store.read(assetPath), fixture);
    assert.equal(store.contentType(assetPath), "image/webp");
    assert.deepEqual(store.listPaths(), [assetPath]);
    store.close();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
