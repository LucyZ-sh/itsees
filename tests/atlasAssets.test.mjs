import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const serverSource = readFileSync(new URL("../scripts/serve_app.py", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../app/src/app.js", import.meta.url), "utf8");
const worldViewSource = readFileSync(new URL("../app/src/atlasWorldView.js", import.meta.url), "utf8");
const stylesSource = readFileSync(new URL("../app/styles.css", import.meta.url), "utf8");

test("Electron package includes Atlas image-world assets and configuration", () => {
  assert.ok(packageJson.build.files.includes("app/**/*"));
  assert.equal(packageJson.build.files.some(item => item.includes("phase2-app")), false);
  assert.match(worldViewSource, /\.\/src\/atlas\/worldSceneConfigs\.js/);
});

test("development server serves the consolidated App tree", () => {
  assert.match(serverSource, /APP_DIR/);
  assert.doesNotMatch(serverSource, /PHASE2_APP_DIR|phase2-assets|phase2-runtime/);
});

test("launch artwork lives inside the production App tree", () => {
  assert.match(readFileSync(new URL("../app/index.html", import.meta.url), "utf8"), /assets\/brand\/splash-pawprints-final\.gif/);
  assert.doesNotMatch(serverSource, /DESIGN_DIR|\/design\//);
});

test("integrated Atlas detail uses the image-world renderer", () => {
  assert.match(appSource, /renderAtlasWorldView/);
  assert.match(appSource, /bindAtlasWorldView/);
  assert.match(worldViewSource, /data-action="atlas-subscene"/);
});

test("Phase 2 backpack postcards and previews reuse the image-world motion renderer", () => {
  assert.match(worldViewSource, /export function renderAtlasPostcardWorld/);
  assert.match(worldViewSource, /querySelectorAll\("\[data-atlas-world\]"\)/);
  assert.match(worldViewSource, /world\.closest\("\.postcard-stage, \.atlas-image-preview-figure"\)/);
  assert.match(appSource, /isAtlasCard[\s\S]*?renderAtlasPostcardWorld\(\{ imageUrl: imageAsset/);
  assert.match(appSource, /data-preview-phase="\$\{isAtlasCard \? "2" : "1"\}"/);
  assert.match(appSource, /imagePreview\.phase === 2[\s\S]*?renderAtlasPostcardWorld/);
  assert.match(stylesSource, /\.atlas-postcard-world \.atlas-world-canvas/);
  assert.match(stylesSource, /@keyframes atlasPostcardDrift/);
  assert.match(stylesSource, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.atlas-postcard-world \.atlas-world-canvas/);
});
