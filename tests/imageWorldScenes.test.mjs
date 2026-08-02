import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { listAtlasDestinations } from "../app/src/atlasContent.js";

const projectRoot = path.resolve(import.meta.dirname, "..");
const configPath = path.join(projectRoot, "app/src/atlas/worldSceneConfigs.js");

function loadImageWorldScenes() {
  const source = fs.readFileSync(configPath, "utf8");
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: configPath });
  return sandbox.window.IMAGE_WORLD_SCENES;
}

test("phase 2 image worlds include fifteen complete parallax landmark scenes", () => {
  const registry = loadImageWorldScenes();
  const scenes = Object.values(registry.scenes);

  assert.equal(scenes.length, 15);

  for (const scene of scenes) {
    assert.equal(scene.main.depthComposition, "foreground_midground_background", scene.id);
    assert.equal(scene.subScenes.length, 4, scene.id);

    for (const subScene of scene.subScenes) {
      assert.ok(subScene.visibleAnchorInMain, `${scene.id}/${subScene.id} needs a main-scene anchor note`);
      assert.equal(subScene.depthComposition, "foreground_midground_background", `${scene.id}/${subScene.id} depth`);
      assert.match(subScene.imageSrc, /\.webp$/, `${scene.id}/${subScene.id} should use runtime WebP`);
    }
  }
});

test("phase 2 image world configured assets exist", () => {
  const registry = loadImageWorldScenes();
  const missing = [];

  for (const scene of Object.values(registry.scenes)) {
    const imagePaths = [scene.main.imageSrc, ...scene.subScenes.map((subScene) => subScene.imageSrc)];

    for (const imagePath of imagePaths) {
      const localPath = path.join(projectRoot, "app", imagePath.replace(/^\.\//, ""));
      if (!fs.existsSync(localPath)) missing.push(path.relative(projectRoot, localPath));
    }
  }

  assert.deepEqual(missing, []);
});

test("Atlas travel segments stay aligned with image-world subscene order", () => {
  const registry = loadImageWorldScenes();

  for (const destination of listAtlasDestinations()) {
    const imageWorldLabels = Array.from(
      registry.scenes[destination.id].subScenes,
      subScene => subScene.label
    );
    assert.deepEqual(
      destination.scenes.map(scene => scene.name),
      imageWorldLabels,
      destination.id
    );
    assert.deepEqual(
      destination.mapSegments.map(segment => segment.name),
      imageWorldLabels,
      destination.id
    );
  }
});
