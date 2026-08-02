import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import postcardStoreModule from "../desktop/postcardAssetStore.cjs";

const {
  createPostcardAssetStore,
  resolvePostcardSource
} = postcardStoreModule;

test("postcard asset store exports only earned album images", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "itsees-postcards-"));
  const appRoot = path.join(directory, "app-root");
  const stateDirectory = path.join(directory, "state");
  const sourcePath = path.join(
    appRoot,
    "app",
    "assets",
    "themes",
    "T01",
    "scenes",
    "T01-S01.webp"
  );
  const imageBytes = createWebpFixture();
  try {
    await mkdir(path.dirname(sourcePath), { recursive: true });
    await writeFile(sourcePath, imageBytes);

    const store = createPostcardAssetStore({ appRoot, stateDirectory });
    const index = store.sync({
      album: [
        {
          id: "postcard-earned-1",
          sceneImageAsset: "./assets/themes/T01/scenes/T01-S01.webp"
        },
        {
          id: "postcard-invalid-path",
          sceneImageAsset: "./assets/themes/../../private.webp"
        }
      ]
    });

    const exported = index.postcards["postcard-earned-1"];
    assert.equal(exported.mimeType, "image/webp");
    assert.deepEqual(await readFile(exported.filePath), imageBytes);
    assert.equal(index.postcards["postcard-invalid-path"], undefined);
    assert.equal(JSON.parse(await readFile(store.indexPath, "utf8")).version, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("postcard source resolver confines Phase 1 and Phase 2 paths to app assets", () => {
  const appRoot = path.resolve("/tmp/itsees-app-root");
  assert.equal(
    resolvePostcardSource(appRoot, "./assets/themes/T01/scenes/T01-S01.webp"),
    path.join(appRoot, "app", "assets", "themes", "T01", "scenes", "T01-S01.webp")
  );
  assert.equal(
    resolvePostcardSource(appRoot, "/phase2-app/assets/landmarks/q/fr_paris.webp"),
    path.join(appRoot, "app", "assets", "atlas", "landmarks", "q", "fr_paris.webp")
  );
  assert.equal(
    resolvePostcardSource(appRoot, "./assets/atlas/landmarks/q/fr_paris.webp"),
    path.join(appRoot, "app", "assets", "atlas", "landmarks", "q", "fr_paris.webp")
  );
  assert.equal(resolvePostcardSource(appRoot, "../../etc/passwd"), null);
  assert.equal(resolvePostcardSource(appRoot, "https://example.com/postcard.webp"), null);
});

function createWebpFixture() {
  return Buffer.from([
    0x52, 0x49, 0x46, 0x46,
    0x04, 0x00, 0x00, 0x00,
    0x57, 0x45, 0x42, 0x50,
    0x56, 0x50, 0x38, 0x20
  ]);
}
