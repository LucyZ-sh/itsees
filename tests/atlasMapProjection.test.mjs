import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { projectAtlasCoordinate } from "../app/src/atlasMapProjection.js";
import { realLandmarks } from "../app/src/realLandmarks.js";

const stylesSource = readFileSync(new URL("../app/styles.css", import.meta.url), "utf8");

function pointFor(id) {
  const landmark = realLandmarks.find(item => item.id === id);
  assert.ok(landmark, `missing ${id}`);
  return projectAtlasCoordinate(landmark.coordinates);
}

test("Asian landmarks project east of Europe on the world map", () => {
  const paris = pointFor("fr_paris");
  const tokyo = pointFor("jp_tokyo");
  const hongKong = pointFor("cn_hong_kong");
  const greatWall = pointFor("cn_great_wall");
  const tajMahal = pointFor("in_taj_mahal");

  assert.ok(paris.x > 49 && paris.x < 52);
  assert.ok(tokyo.x > 88 && tokyo.x < 90);
  assert.ok(hongKong.x > 81 && hongKong.x < 83);
  assert.ok(greatWall.x > 81 && greatWall.x < 84);
  assert.ok(tajMahal.x > 70 && tajMahal.x < 73);
  assert.ok(Math.min(tokyo.x, hongKong.x, greatWall.x, tajMahal.x) - paris.x > 18);
});

test("the atlas viewport preserves the source map aspect ratio without cropping", () => {
  const mapRule = stylesSource.match(/\.atlas-world-map \{[\s\S]*?\n\}/)?.[0] ?? "";
  const imageRule = stylesSource.match(/\.atlas-world-map > img \{[\s\S]*?\n\}/)?.[0] ?? "";

  assert.match(mapRule, /aspect-ratio:\s*1000\s*\/\s*520/);
  assert.match(mapRule, /min-height:\s*0/);
  assert.match(imageRule, /object-fit:\s*contain/);
  assert.doesNotMatch(imageRule, /object-fit:\s*cover/);
});
