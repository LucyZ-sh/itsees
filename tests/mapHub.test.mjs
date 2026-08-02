import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { MAP_CHAPTERS, listCurrentMapChapters } from "../app/src/mapChapters.js";

const appSource = readFileSync(new URL("../app/src/app.js", import.meta.url), "utf8");

test("the shared map book replaces separate Postmark and Chrono navigation labels", () => {
  const railSource = appSource.slice(
    appSource.indexOf("function renderJournalRail"),
    appSource.indexOf("function renderJournalStatusbar")
  );
  assert.match(railSource, /\["map", "地图"/);
  assert.doesNotMatch(railSource, /"邮戳"/);
  assert.doesNotMatch(railSource, /"时光机"/);
});

test("the map book exposes Phase 1 and Phase 2 tabs with a guarded fallback", () => {
  assert.match(appSource, /function renderMapHub/);
  assert.match(appSource, /function renderMapChapterTabs/);
  assert.match(appSource, /function renderAtlasLocked/);
  assert.match(appSource, /#\/map\/phase1/);
  assert.match(appSource, /#\/map\/phase2/);
  assert.match(appSource, /每一期全部点亮后，下一篇地图才会展开/);
  assert.match(appSource, /完成第一期全部路线后/);
});

test("map chapter configuration contains only implemented Phase 1 and Phase 2", () => {
  assert.deepEqual(MAP_CHAPTERS.map(chapter => chapter.phase), [1, 2]);
  assert.deepEqual(listCurrentMapChapters().map(chapter => chapter.phase), [1, 2]);
});

test("unlit Phase 1 routes and Phase 2 landmarks retain a gray visual state", () => {
  assert.match(appSource, /progress <= 0 && !isComplete \? "unlit"/);
  assert.match(appSource, /complete \? "complete" : "unlit"/);
});
