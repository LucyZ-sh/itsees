import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import test from "node:test";
import { listAtlasDestinations } from "../app/src/atlasContent.js";
import { getAtlasPinPoint } from "../app/src/atlasPinLayout.js";
import { getThemeAssetUrls, listInventoryItems, listThemes, preloadThemeAssets } from "../app/src/contentRepository.js";

const appSource = readFileSync(new URL("../app/src/app.js", import.meta.url), "utf8");
const mainSource = readFileSync(new URL("../desktop/main.cjs", import.meta.url), "utf8");
const warmThemeSource = readFileSync(new URL("../app/warm-journal-theme.css", import.meta.url), "utf8");
const packageConfig = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

test("Atlas pins align with the illustrated map while labels remain clickable", () => {
  const points = Object.fromEntries(listAtlasDestinations().map(destination => [
    destination.id,
    getAtlasPinPoint(destination)
  ]));

  assert.deepEqual(points.fr_paris, { x: 51.3, y: 26.6 });
  assert.deepEqual(points.no_norway_coast, { x: 54.2, y: 15 });
  assert.deepEqual(points.eu_alps, { x: 53.8, y: 28.2 });
  assert.deepEqual(points.it_tuscany, { x: 53.7, y: 30.7 });
  assert.deepEqual(points.it_amalfi, { x: 54, y: 33 });
  assert.deepEqual(points.gr_greek_islands, { x: 57.3, y: 33.1 });
  assert.deepEqual(points.eg_giza_pyramids, { x: 56.5, y: 38.8 });
  assert.deepEqual(points.cn_great_wall, { x: 83.8, y: 31.2 });
  assert.deepEqual(points.cn_hong_kong, { x: 81.2, y: 42.2 });
  assert.deepEqual(points.jp_tokyo, { x: 87.2, y: 34.5 });
  assert.deepEqual(points.in_taj_mahal, { x: 75, y: 41.8 });
  assert.match(warmThemeSource, /\.journal-stage \.atlas-pin:is\([\s\S]*?data-landmark-id="eu_alps"[\s\S]*?width:\s*20px;/);
  assert.match(warmThemeSource, /\.journal-stage \.atlas-pin i\s*\{[\s\S]*?pointer-events:\s*auto;/);
  assert.match(warmThemeSource, /\.journal-stage \.atlas-pin span\s*\{[\s\S]*?pointer-events:\s*auto;/);
  assert.match(warmThemeSource, /data-landmark-id="no_norway_coast"[\s\S]*?--label-y:\s*24px;/);
  assert.match(warmThemeSource, /data-landmark-id="eu_alps"[\s\S]*?--label-y:\s*-32px;/);
  assert.match(warmThemeSource, /\.journal-stage \.atlas-pin\s*\{[\s\S]*?overflow:\s*visible;/);
});

test("release package excludes source-only Phase 2 media and keeps Itsees naming", () => {
  assert.equal(packageConfig.build.artifactName, "Itsees-${version}-${arch}.${ext}");
  assert.ok(packageConfig.build.files.includes("app/**/*"));
  assert.equal(packageConfig.build.files.some(item => item.includes("phase2-app")), false);
  assert.equal(packageConfig.build.files.some(item => item.includes("design-lab")), false);
});

test("all Phase 1 runtime assets use generated WebP derivatives", () => {
  let optimizedBytes = 0;
  for (const theme of listThemes()) {
    for (const url of getThemeAssetUrls(theme.id)) {
      assert.match(url, /\.webp$/);
      const asset = new URL(`../app/${url.replace(/^\.\//, "")}`, import.meta.url);
      assert.equal(existsSync(asset), true, `missing optimized asset ${url}`);
      optimizedBytes += statSync(asset).size;
    }
  }
  assert.ok(optimizedBytes < 90 * 1024 * 1024, `optimized Phase 1 assets were ${optimizedBytes} bytes`);
});

test("theme preload limits eager work to maps and the first scene", () => {
  const previousImage = globalThis.Image;
  globalThis.Image = class MockImage {};
  try {
    assert.equal(getThemeAssetUrls("T01").length, 14);
    assert.equal(preloadThemeAssets("T01").length, 3);
  } finally {
    if (previousImage === undefined) delete globalThis.Image;
    else globalThis.Image = previousImage;
  }
});

test("every travel-pack item owns a distinct production thumbnail", () => {
  assert.doesNotMatch(appSource, /design-lab\/warm-companion-journal-v2\/assets/);
  assert.match(appSource, /function getPackItemAsset\(item\) \{\s*return item\.asset;\s*\}/);

  const items = listInventoryItems();
  assert.equal(items.length, 12);
  assert.equal(new Set(items.map(item => item.asset)).size, items.length);

  for (const item of items) {
    assert.match(item.asset, /^\.\/assets\/pack\/[a-z0-9-]+\.png$/, item.id);
    const assetUrl = new URL(`../app/${item.asset.replace(/^\.\//, "")}`, import.meta.url);
    assert.equal(existsSync(assetUrl), true, `missing formal pack asset for ${item.id}`);

    const bytes = readFileSync(assetUrl);
    assert.equal(bytes.subarray(1, 4).toString("ascii"), "PNG", item.id);
    assert.equal(bytes.readUInt32BE(16), 512, `${item.id} width`);
    assert.equal(bytes.readUInt32BE(20), 512, `${item.id} height`);
    assert.equal(bytes[25], 6, `${item.id} must use RGBA transparency`);
  }
});

test("the expanded travel pack uses artwork in a responsive two-column matrix", () => {
  assert.match(
    appSource,
    /class="pack-item-symbol"[^>]*><img src="\$\{getPackItemAsset\(item\)\}" alt=""/
  );
  assert.match(warmThemeSource, /\.pack-library \{[\s\S]*container-type: inline-size/);
  assert.match(
    warmThemeSource,
    /@container \(min-width: 640px\) \{[\s\S]*\.pack-library \.pack-item-grid \{[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/
  );
  assert.match(warmThemeSource, /\.pack-library \.pack-item-symbol \{[\s\S]*width: 64px;[\s\S]*height: 64px/);
});

test("the travel-pack library stays open across live travel clock renders", () => {
  assert.match(appSource, /let packLibraryOpen = false/);
  assert.match(appSource, /const renderedPackLibrary = app\.querySelector\("\.pack-library"\)/);
  assert.match(appSource, /if \(renderedPackLibrary\) packLibraryOpen = renderedPackLibrary\.open/);
  assert.match(appSource, /<details class="pack-library" \$\{packLibraryOpen \? "open" : ""\}>/);
  assert.match(appSource, /packLibrary\.addEventListener\("toggle", \(\) => \{[\s\S]*?packLibraryOpen = packLibrary\.open/);
});

test("home recommendations and controls follow the active journey phase", () => {
  assert.match(appSource, /getHomeRecommendationPhase\(state/);
  assert.match(appSource, /function renderAtlasTodayCard\(/);
  assert.match(appSource, /<span>选择景点<\/span>/);
  assert.match(appSource, /data-action="select-home-atlas"/);
  assert.match(appSource, /renderUtilityPanel\(activeTravel, homeContext\.phase\)/);
});

test("Phase 2 utility restart keeps the Atlas action contract", () => {
  assert.match(appSource, /function renderUtilityPanel\(activeTravel, phase = 1\)/);
  assert.match(appSource, /phase === 2 \? "switch-atlas" : "switch"/);
  assert.match(appSource, /phase === 2 \? "更换景点重开" : "换路线重开"/);
});

test("warm journal production surfaces use semantic paper and state tokens", () => {
  for (const token of [
    "--surface-rail",
    "--surface-journey",
    "--surface-note",
    "--surface-photo-mat",
    "--surface-route-selected",
    "--surface-pack-card",
    "--surface-locked",
    "--ink-on-image",
    "--ink-disabled"
  ]) {
    assert.match(warmThemeSource, new RegExp(`${token}:`));
    assert.ok(
      warmThemeSource.split(`var(${token})`).length >= 2,
      `${token} must be consumed by the production theme`
    );
  }
});

test("the Phase 1 map fills compact viewports without truncating edge labels", () => {
  assert.match(warmThemeSource, /\.phase1-world-map \{[\s\S]*min-height: 100vh/);
  assert.match(warmThemeSource, /\.phase1-map-viewport \{[\s\S]*height: calc\(100vh - 48px\)/);
  assert.match(warmThemeSource, /\.phase1-map-node \{[\s\S]*width: max-content;[\s\S]*max-width: none/);
  assert.match(warmThemeSource, /\.phase1-map-node \.map-node-name \{[\s\S]*text-overflow: clip/);
});

test("route changes reset scroll before rendering and map surfaces enter opaque", () => {
  assert.match(
    appSource,
    /window\.addEventListener\("hashchange", \(\) => \{[\s\S]*resetRouteScroll\(\);[\s\S]*render\(\);[\s\S]*requestAnimationFrame\(resetRouteScroll\);/
  );
  assert.match(
    warmThemeSource,
    /\.journal-stage \.phase1-atlas-topbar,\s*\.journal-stage \.phase1-atlas-workbench \{\s*animation: none;/
  );
});

test("acceptance hardening keeps modal focus, first-run weather consent, and sandboxing explicit", () => {
  assert.match(appSource, /function bindDialogKeyboard\(\)/);
  assert.match(appSource, /function restorePendingFocus\(\)/);
  assert.match(appSource, /data-action="toggle-live-weather"/);
  assert.match(appSource, /data-action="onboarding-language-zh"/);
  assert.match(appSource, /data-action="onboarding-language-en"/);
  assert.match(appSource, /data-action="onboarding-language-zh"[^>]+aria-label="使用简体中文"/);
  assert.match(appSource, /data-action="onboarding-language-en"[^>]+aria-label="Use English"/);
  assert.match(appSource, /!state\.settings\.liveWeatherEnabled \|\| !state\.settings\.hasGrantedLiveWeatherConsent/);
  assert.match(appSource, /data-action="onboarding-weather-enable"/);
  assert.match(appSource, /state\.settings\.hasCompletedOnboarding = true/);
  assert.doesNotMatch(appSource, /live-weather-privacy-note/);
  assert.equal((mainSource.match(/sandbox: true/g) ?? []).length, 3);
  assert.doesNotMatch(mainSource, /sandbox: false/);
});

test("Phase 2 landmark actions disclose and resolve an active Phase 1 trip", () => {
  const actionSource = appSource.slice(
    appSource.indexOf("function renderAtlasTravelActions"),
    appSource.indexOf("function renderAtlasUtilityPanel")
  );
  assert.match(actionSource, /\(anyActiveTravel\?\.phase \?\? 1\) === 1/);
  assert.match(actionSource, /需要先召回这段旅程，才能开始真实旅行/);
  assert.match(actionSource, /data-action="summon">先召回当前旅程/);
});

test("global collection applies the PRD twelve-item pagination to every tab", () => {
  const filterSource = appSource.slice(
    appSource.indexOf("function renderMineShell"),
    appSource.indexOf("function renderMineTab")
  );
  const collectionSource = appSource.slice(
    appSource.indexOf("function getMineCollectionResult"),
    appSource.indexOf("function renderAtlasLocked")
  );
  assert.match(collectionSource, /pageSize: COLLECTION_PAGE_SIZE/);
  assert.doesNotMatch(collectionSource, /pageSize: kind === "album" \? 10000/);
  assert.doesNotMatch(collectionSource, /if \(mineView === "album"\) return ""/);
  assert.match(filterSource, /mineView === "souvenirs" \? renderMineSelect\("rarity"/);
  assert.match(collectionSource, /kind === "souvenirs" \? \{ rarity: mineFilters\.rarity \}/);
  assert.match(collectionSource, /renderTravelingAlbumPreview\(\)/);
  assert.match(collectionSource, /data-action="mine-page-to"/);
  assert.match(appSource, /class="history-timeline"/);
});

test("home avoids the duplicate settings collection and souvenir cards keep concise copy", () => {
  const homeSource = appSource.slice(
    appSource.indexOf("function renderHomeShell"),
    appSource.indexOf("function renderJournalFrame")
  );
  const souvenirSource = appSource.slice(
    appSource.indexOf("function renderSouvenirs"),
    appSource.indexOf("function getSouvenirArt")
  );
  assert.doesNotMatch(homeSource, /旅行设置与记录/);
  assert.doesNotMatch(souvenirSource, /<p>\$\{getSouvenirDisplayDescription/);
});

test("reset cancellation restores the settings menu and its destructive-action trigger", () => {
  const escapeSource = appSource.slice(
    appSource.indexOf('if (event.key === "Escape" && resetConfirmOpen)'),
    appSource.indexOf('if (event.key === "Escape" && imagePreview)')
  );
  const cancelSource = appSource.slice(
    appSource.indexOf('if (action === "cancel-reset")'),
    appSource.indexOf('if (action === "confirm-reset")')
  );
  for (const source of [escapeSource, cancelSource]) {
    assert.match(source, /settingsMenuOpen = true/);
    assert.match(source, /pendingFocusSelector = '\[data-action="reset"\]'/);
  }
});

test("confirmed reset returns every UI collection to the fresh travel state", () => {
  const confirmSource = appSource.slice(
    appSource.indexOf('if (action === "confirm-reset")'),
    appSource.indexOf("function clampZoom")
  );
  assert.match(confirmSource, /state = applyAcceptanceScenario\(resetState\(state\), acceptanceScenario\)/);
  assert.match(confirmSource, /activeView = "travel"/);
  assert.match(confirmSource, /mineView = "album"/);
  assert.match(confirmSource, /minePage = 1/);
  assert.match(confirmSource, /phase: "all"/);
  assert.match(confirmSource, /destinationId: "all"/);
  assert.match(confirmSource, /timeRange: "all"/);
  assert.match(confirmSource, /completion: "all"/);
  assert.match(confirmSource, /rarity: "all"/);
  assert.match(confirmSource, /window\.location\.hash = "#\/travel"/);
  assert.match(confirmSource, /startFirstLaunchWeatherRequest\(\)/);
});

test("Atlas image-world hotspots retain mobile-size pointer targets", () => {
  const styles = readFileSync(new URL("../app/styles.css", import.meta.url), "utf8");
  const hotspotSource = styles.slice(
    styles.indexOf(".atlas-world-hotspot {"),
    styles.indexOf(".atlas-world-hotspot i {")
  );
  assert.match(hotspotSource, /min-width: 44px/);
  assert.match(hotspotSource, /min-height: 44px/);
});
