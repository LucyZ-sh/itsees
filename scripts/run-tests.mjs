import { readdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const projectRoot = path.resolve(import.meta.dirname, "..");
const testsRoot = path.join(projectRoot, "tests");
const codeOnly = process.argv.includes("--code");
const assetDependentTests = new Set([
  "acceptanceHardening.test.mjs",
  "atlasAppIntegration.test.mjs",
  "atlasAssets.test.mjs",
  "backgroundMusic.test.mjs",
  "imageWorldScenes.test.mjs",
  "petWeatherAssets.test.mjs",
  "pets.test.mjs",
  "realLandmarks.test.mjs",
  "souvenirLibrary.test.mjs",
  "teddyWeatherMedia.test.mjs",
  "travelEngine.test.mjs"
]);

const testFiles = (await readdir(testsRoot))
  .filter(fileName => fileName.endsWith(".test.mjs"))
  .filter(fileName => !codeOnly || !assetDependentTests.has(fileName))
  .sort()
  .map(fileName => path.join("tests", fileName));

const child = spawn(process.execPath, ["--test", ...testFiles], {
  cwd: projectRoot,
  stdio: "inherit"
});
child.on("exit", code => process.exit(code ?? 1));
