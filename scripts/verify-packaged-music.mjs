import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const projectRoot = path.resolve(import.meta.dirname, "..");
const { createProtectedAssetStore } = require("../desktop/protectedAssetStore.cjs");
const store = createProtectedAssetStore({ appRoot: projectRoot });

try {
  const musicPaths = store.listPaths().filter(assetPath => assetPath.startsWith("app/assets/music/weather-bgm/"));
  const expected = [];
  for (const destinationId of ["T01", "T02", "T03"]) {
    for (const weatherId of ["DEFAULT", "SUNNY", "RAIN", "FOG", "SNOW", "WIND", "HEAT"]) {
      expected.push(`app/assets/music/weather-bgm/${destinationId}-${weatherId}.mp3`);
    }
  }
  expected.sort();
  if (JSON.stringify(musicPaths.sort()) !== JSON.stringify(expected)) {
    throw new Error(`Packaged music mismatch: expected 21 T01-T03 tracks, found ${musicPaths.length}`);
  }
  process.stdout.write(`Packaged music verified: ${musicPaths.length} original T01-T03 tracks\n`);
} finally {
  store.close();
}
