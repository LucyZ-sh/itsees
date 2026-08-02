import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../app/src/app.js", import.meta.url), "utf8");
const warmThemeSource = readFileSync(new URL("../app/warm-journal-theme.css", import.meta.url), "utf8");

test("main app guards Atlas routes with the shared feature registry", () => {
  assert.match(appSource, /canEnterFeaturePack/);
  assert.match(appSource, /getPhase1Completion/);
  assert.match(appSource, /renderAtlasLocked/);
  assert.match(appSource, /#\/atlas/);
});

test("Atlas renders inside the main shell with the shared desktop pet controls", () => {
  assert.match(appSource, /renderAtlasShell/);
  assert.match(appSource, /renderPet\(activeTravel, selectedPet\)/);
  assert.match(appSource, /renderPetPicker\(selectedPet\)/);
  assert.match(appSource, /renderPackPanel\(activeTravel, destination, mapView, \{ phase: 2 \}\)/);
  assert.doesNotMatch(appSource, /renderPackPanel\(\)/);
  assert.match(appSource, /renderDesktopControls\(\)/);
});

test("Atlas actions use the shared travel lifecycle", () => {
  assert.match(appSource, /startTravel\(state, state\.selectedAtlasLandmarkId, state\.selectedItemIds, new Date\(\), \{ phase: 2 \}\)/);
  assert.match(appSource, /requestTravelAction\(\{ type: "recall" \}, \(\) => summonTravel\(state\)\)/);
  assert.match(appSource, /requestTravelAction\(\{ type: "continue" \}, \(\) => continueTravel\(state\)\)/);
  assert.match(appSource, /applyTravelAction\(\{ type: "complete_due" \}\)/);
});

test("the Phase 2 world-map home reuses the Phase 1 home layout hierarchy", () => {
  const worldHomeSource = appSource.slice(
    appSource.indexOf("function renderAtlasWorldMap"),
    appSource.indexOf("function renderAtlasPin")
  );

  assert.match(worldHomeSource, /class="phase1-atlas-shell atlas-world-home"/);
  assert.match(worldHomeSource, /class="phase1-atlas-topbar atlas-world-topbar"/);
  assert.match(worldHomeSource, /class="phase1-atlas-side"/);
  assert.match(worldHomeSource, /class="phase1-atlas-status"/);
  assert.match(worldHomeSource, /class="phase1-atlas-workbench atlas-world-home-workbench"/);
  assert.match(worldHomeSource, /把真实世界，/);
  assert.match(worldHomeSource, /atlas-world-mapbook/);
  assert.doesNotMatch(worldHomeSource, /atlas-world-mapnote/);
  assert.doesNotMatch(worldHomeSource, /ITSEES WORLD ATLAS/);
  assert.match(warmThemeSource, /\.atlas-world-mapbook\s*\{[\s\S]*?grid-template-rows:\s*minmax\(0, 1fr\);[\s\S]*?gap:\s*0;/);
  assert.match(worldHomeSource, /renderLocalWeatherSummary\(\)/);
  assert.doesNotMatch(worldHomeSource, /renderAtlasTopbar/);
});

test("locked and unlocked Phase 2 headers share the Phase 1 topbar contract", () => {
  const lockedSource = appSource.slice(
    appSource.indexOf("function renderAtlasLocked"),
    appSource.indexOf("function renderAtlasShell")
  );

  assert.match(lockedSource, /class="phase1-atlas-topbar map-locked-topbar"/);
  assert.match(lockedSource, /class="phase1-atlas-intro"/);
  assert.match(lockedSource, /class="phase1-atlas-edition"/);
  assert.match(lockedSource, /renderLocalWeatherSummary\(\)/);
  assert.match(lockedSource, /renderAtlasUnlockSummary\(completion\)/);
  assert.doesNotMatch(warmThemeSource, /\.journal-stage \.atlas-world-topbar\s*\{/);
  assert.match(
    warmThemeSource,
    /@media \(max-width: 1040px\)[\s\S]*?\.journal-stage \.map-hub \.phase1-atlas-topbar\s*\{[\s\S]*?grid-template-columns:\s*1fr;/
  );
});

test("the shared map header collapses without narrow-screen text columns", () => {
  assert.match(
    warmThemeSource,
    /@media \(max-width: 960px\)[\s\S]*?\.journal-stage \.map-hub \.phase1-atlas-topbar,[\s\S]*?grid-template-columns:\s*1fr;/
  );
  assert.match(
    warmThemeSource,
    /@media \(max-width: 480px\)[\s\S]*?\.journal-stage \.map-hub \.phase1-atlas-side\s*\{[\s\S]*?grid-template-columns:\s*1fr;/
  );
});

test("the Phase 2 world map exposes the same zoom controls as Phase 1", () => {
  const worldHomeSource = appSource.slice(
    appSource.indexOf("function renderAtlasWorldMap"),
    appSource.indexOf("function renderAtlasPin")
  );

  assert.match(worldHomeSource, /class="phase1-map-toolbar" aria-label="地图缩放"/);
  assert.match(worldHomeSource, /data-action="world-map-zoom-out"/);
  assert.match(worldHomeSource, /data-action="world-map-zoom-in"/);
  assert.match(worldHomeSource, /data-action="world-map-zoom-reset"/);
  assert.match(worldHomeSource, /class="atlas-world-viewport" data-map-scroll-key="phase2" style="--atlas-world-zoom:\$\{atlasWorldZoom\};"/);
  assert.match(appSource, /if \(action === "world-map-zoom-in"\)/);
  assert.match(appSource, /if \(action === "world-map-zoom-out"\)/);
  assert.match(appSource, /if \(action === "world-map-zoom-reset"\)/);
});

test("all routes avoid clock-driven remounts while both map chapters keep their scroll position", () => {
  assert.match(appSource, /data-map-scroll-key="phase1"/);
  assert.match(appSource, /data-map-scroll-key="phase2"/);
  assert.match(appSource, /function captureMapViewportState\(\)/);
  assert.match(appSource, /isInlineEnd: maxScrollLeft > 0 && maxScrollLeft - viewport\.scrollLeft <= 2/);
  assert.match(appSource, /function restoreMapViewportState\(snapshot\)/);
  assert.match(appSource, /viewport\.scrollLeft = snapshot\.isInlineEnd \? maxScrollLeft : maxScrollLeft \* snapshot\.leftRatio/);
  assert.match(appSource, /function updateLiveTravelProgress\(now = new Date\(\)\)/);
  assert.match(appSource, /querySelectorAll\("\[data-live-travel-status\]"\)/);
  assert.match(appSource, /data-live-progress-percent/);

  const tickSource = appSource.slice(
    appSource.indexOf("function tickTravelClock()"),
    appSource.indexOf("window.addEventListener(\"storage\"")
  );
  assert.match(tickSource, /if \(updateLiveTravelProgress\(\)\) return/);
  assert.doesNotMatch(tickSource, /setState\(state\)/);
  assert.match(
    warmThemeSource,
    /\.journal-stage \.phase1-map-node,[\s\S]*?\.journal-stage \.phase1-map-node\.active-travel::before\s*\{[\s\S]*?animation:\s*none;/
  );
});

test("the Phase 2 world map uses the shared editorial map language", () => {
  assert.match(warmThemeSource, /\.journal-stage \.atlas-world-map::before,[\s\S]*?\.journal-stage \.atlas-world-map::after/);
  assert.match(warmThemeSource, /\.atlas-world-mapbook \.phase1-map-toolbar[\s\S]*?var\(--paper-strong\)/);
  assert.match(warmThemeSource, /\.journal-stage \.atlas-pin\.complete i[\s\S]*?background:\s*var\(--green\)/);
  assert.match(warmThemeSource, /\.journal-stage \.atlas-pin\.traveling i[\s\S]*?background:\s*var\(--blue\)/);
  assert.match(warmThemeSource, /data-landmark-id="eu_alps"[\s\S]*?--label-x:/);
  assert.match(warmThemeSource, /data-landmark-id="it_amalfi"[\s\S]*?--label-y:/);
  assert.match(appSource, /assets\/maps\/world-map-journal-v2\.webp/);
  assert.doesNotMatch(appSource, /world-map-natural-earth\.svg/);
  assert.equal(existsSync(new URL("../app/assets/maps/world-map-journal-v2.webp", import.meta.url)), true);
});

test("crowded Phase 2 map labels retain the collision-checked offsets", () => {
  assert.match(warmThemeSource, /data-landmark-id="jp_tokyo"[\s\S]*?--label-y:\s*54px/);
  assert.match(warmThemeSource, /data-landmark-id="cn_hong_kong"[\s\S]*?--label-y:\s*52px/);
  assert.match(warmThemeSource, /data-landmark-id="it_amalfi"[\s\S]*?--label-x:\s*-40px;[\s\S]*?--label-y:\s*74px/);
  assert.match(warmThemeSource, /data-landmark-id="eg_giza_pyramids"[\s\S]*?--label-x:\s*40px;[\s\S]*?--label-y:\s*50px/);
});

test("the Phase 2 map labels only traveling or recalled sessions as current", () => {
  const worldHomeSource = appSource.slice(
    appSource.indexOf("function renderAtlasWorldMap"),
    appSource.indexOf("function renderAtlasPin")
  );

  assert.match(worldHomeSource, /\["traveling", "recalled"\]\.includes\(activeTravel\?\.status\)/);
  assert.doesNotMatch(worldHomeSource, /const currentAtlasTravel = \(activeTravel\?\.phase \?\? 1\) === 2 \? activeTravel : null/);
});

test("completed Phase 2 sessions do not retain the traveling map-pin style", () => {
  assert.match(appSource, /const traveling = \(activeTravel\?\.phase \?\? 1\) === 2[\s\S]*?\["traveling", "recalled"\]\.includes\(activeTravel\?\.status\)[\s\S]*?activeTravel\.destinationId === destination\.id/);
});

test("image previews localize hidden metadata before opening the dialog", () => {
  assert.match(appSource, /data-preview-title="\$\{escapeHtml\(localizedName\)\}"/);
  assert.match(appSource, /data-preview-description="\$\{escapeHtml\(routePreviewDescription\)\}"/);
  assert.match(appSource, /data-preview-title="\$\{escapeHtml\(translateText\(card\.title\)\)\}"/);
  assert.match(appSource, /data-preview-description="\$\{escapeHtml\(translateText\(card\.message\)\)\}"/);
  assert.match(appSource, /english \? "Full-screen preview" : "全屏查看"/);
  assert.match(appSource, /english \? "Close image preview" : "关闭图片预览"/);
});

test("postcard decoration controls generate natural locale-specific labels", () => {
  assert.match(appSource, /const localizedSouvenirName = translateText\(souvenir\.name\)/);
  assert.match(appSource, /Rotate \$\{localizedSouvenirName\} 15 degrees counterclockwise/);
  assert.match(appSource, /Rotate \$\{localizedSouvenirName\} 15 degrees clockwise/);
  assert.match(appSource, /Remove \$\{localizedSouvenirName\}/);
});

test("both map chapters enter a destination home with unified CTA copy", () => {
  const phase1MapSource = appSource.slice(
    appSource.indexOf("function renderThemeAtlas"),
    appSource.indexOf("function getAppRoute")
  );
  const phase2MapSource = appSource.slice(
    appSource.indexOf("function renderAtlasWorldMap"),
    appSource.indexOf("function renderAtlasPin")
  );
  const actionSource = appSource.slice(appSource.indexOf("function handleAction"));

  assert.match(phase1MapSource, /data-action="enter-theme"[\s\S]*?>\s*打开路线主页\s*<\/button>/);
  assert.doesNotMatch(phase1MapSource, /查看当前旅程/);
  assert.match(phase2MapSource, /data-action="enter-atlas-landmark"[\s\S]*?>进入景点主页<\/button>/);
  assert.match(actionSource, /if \(action === "enter-atlas-landmark"\)[\s\S]*?atlasSubsceneId = null;[\s\S]*?#\/atlas\/landmark\/\$\{destination\.id\}/);
  assert.match(actionSource, /if \(action === "enter-theme"\)[\s\S]*?themeSceneId = null;[\s\S]*?#\/theme\/\$\{theme\.id\}/);
  assert.match(appSource, /section === "theme"[\s\S]*?view: "theme-landmark"/);
  assert.match(appSource, /function renderThemeLandmark[\s\S]*?renderContent\.mapAssets\.color[\s\S]*?theme-scene-gallery[\s\S]*?scene\.imageUrl/);
  assert.match(appSource, /data-action="theme-scene"/);
  assert.match(appSource, /data-action="theme-panorama"/);
  assert.match(appSource, /renderAtlasWorldView\(destination, mapView, atlasSubsceneId\)/);
});

test("the travel pack states the PRD postcard count for each complete journey", () => {
  const packRenderer = appSource.slice(
    appSource.indexOf("function renderPackPanel"),
    appSource.indexOf("function getPackItemAsset")
  );

  assert.match(packRenderer, /\$\{phase === 2 \? 4 : 12\} 张明信片/);
  assert.doesNotMatch(packRenderer, />1 张明信片/);
});

test("Atlas collection cards reuse the matching image-world subscene assets", () => {
  const atlasViewSource = appSource.slice(
    appSource.indexOf("function renderAtlasView"),
    appSource.indexOf("function getAtlasMapView")
  );

  assert.match(atlasViewSource, /IMAGE_WORLD_SCENES\?\.scenes\?\.\[destination\.id\]\?\.subScenes/);
  assert.match(atlasViewSource, /resolveAtlasAssetUrl\(imageWorldScene\.imageSrc\)/);
  assert.match(atlasViewSource, /imageWorldScene\?\.copy \?\? scene\.visual/);
});
