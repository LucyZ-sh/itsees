import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const mainSource = readFileSync(new URL("../desktop/main.cjs", import.meta.url), "utf8");
const preloadSource = readFileSync(new URL("../desktop/preload.cjs", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../app/src/app.js", import.meta.url), "utf8");
const stylesSource = readFileSync(new URL("../app/styles.css", import.meta.url), "utf8");
const indexSource = readFileSync(new URL("../app/index.html", import.meta.url), "utf8");
const splashSource = readFileSync(new URL("../app/splash.html", import.meta.url), "utf8");
const packageConfig = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

test("desktop state exposes the tray readiness needed by packaged smoke tests", () => {
  assert.match(mainSource, /isTrayReady:\s*Boolean\(tray/);
  assert.match(mainSource, /isAlwaysOnTop:\s*Boolean\(mainWindow\?\.isAlwaysOnTop\(\)\)/);
  assert.match(mainSource, /windowMode:\s*isPetMode \? "pet" : "full"/);
});

test("the main application window is not always on top by default", () => {
  const createWindowSource = mainSource.slice(mainSource.indexOf("function createWindow()"), mainSource.indexOf("function createSplashWindow"));
  assert.match(createWindowSource, /mainWindow\.setAlwaysOnTop\(false\)/);
  assert.doesNotMatch(createWindowSource, /mainWindow\.setAlwaysOnTop\(true/);
});

test("the unified product shell no longer labels itself as an MVP", () => {
  assert.doesNotMatch(mainSource, /Itsees MVP/);
  assert.doesNotMatch(appSource, /清空本地 MVP 存档/);
});

test("the Phase 1 atlas exposes the shared journal settings used by Phase 2", () => {
  const atlasRenderer = appSource.slice(
    appSource.indexOf("function renderThemeAtlas"),
    appSource.indexOf("function getAppRoute")
  );
  const settingsRenderer = appSource.slice(
    appSource.indexOf("function renderJournalSettings"),
    appSource.indexOf("function getSelectedPet")
  );
  assert.match(atlasRenderer, /renderJournalSettings\(\)/);
  assert.match(settingsRenderer, /renderDesktopControls\(\)/);
  assert.match(settingsRenderer, /data-action="open-pet-picker"/);
  assert.match(settingsRenderer, /data-action="toggle-background-music-setting"/);
  assert.match(settingsRenderer, /data-action="toggle-pause"/);
  assert.match(settingsRenderer, /data-action="toggle-hide"/);
  assert.match(settingsRenderer, /data-action="reset"/);
});

test("the Phase 1 atlas uses a selectable route preview before entering its destination home", () => {
  const atlasRenderer = appSource.slice(
    appSource.indexOf("function renderThemeAtlas"),
    appSource.indexOf("function getAppRoute")
  );
  const mapNodeRenderer = appSource.slice(
    appSource.indexOf("function renderThemeMapNode"),
    appSource.indexOf("function getThemeMapPoint")
  );
  assert.match(atlasRenderer, /phase1-journey-visual/);
  assert.match(atlasRenderer, /phase1-progress-track/);
  assert.match(atlasRenderer, /打开路线主页/);
  assert.doesNotMatch(atlasRenderer, /查看当前旅程/);
  assert.match(mapNodeRenderer, /data-action="select-theme"/);
  assert.match(appSource, /if \(action === "select-theme"\)/);
  assert.match(appSource, /if \(action === "enter-theme"\)[\s\S]*?window\.location\.hash = `#\/theme\/\$\{theme\.id\}`;/);
  assert.doesNotMatch(atlasRenderer, /atlas-upgrade-card/);
  assert.doesNotMatch(appSource, /function renderAtlasUpgradeCard/);
});

test("the collection presents postcards as a filterable travel journal", () => {
  const mineRenderer = appSource.slice(
    appSource.indexOf("function renderMineShell"),
    appSource.indexOf("function renderMineTab")
  );
  const albumRenderer = appSource.slice(
    appSource.indexOf("function renderAlbum"),
    appSource.indexOf("function renderSouvenirs")
  );
  assert.match(mineRenderer, /mine-passport-mark/);
  assert.match(mineRenderer, /mine-toolbar/);
  assert.match(mineRenderer, /mine-clear-filters/);
  assert.match(albumRenderer, /travel-journal-card/);
  assert.match(albumRenderer, /postcard-postmark/);
  assert.match(albumRenderer, /postcard-footnote/);
  assert.match(appSource, /function getMineCheckedInDestinationIds\(\)/);
  assert.match(appSource, /\.filter\(theme => checkedInDestinationIds\.has\(theme\.id\)\)/);
  assert.match(appSource, /\.filter\(destination => checkedInDestinationIds\.has\(destination\.id\)\)/);
});

test("the journal exposes the pet picker beside weather and full souvenir transforms", () => {
  assert.match(appSource, /class="journal-pet-avatar"/);
  assert.match(appSource, /data-action="open-pet-picker"/);
  assert.match(appSource, /data-action="transform-decoration"/);
  assert.match(appSource, /data-transform="scale-up"/);
  assert.match(appSource, /data-transform="rotate-right"/);
  assert.match(appSource, /pendingFocusSelector = \[/);
  assert.match(stylesSource, /\.postcard-decoration-controls/);
});

test("home copy avoids bilingual duplication and uses an icon-only music control", () => {
  assert.doesNotMatch(appSource, /<span>SELECT A ROUTE<\/span>/);
  assert.match(appSource, /class="journal-music-icon"[^>]*>♫<\/span>/);
  assert.match(appSource, /english \? "A SMALL JOURNEY,/);
  assert.doesNotMatch(appSource, /else root\.append\(button\)/);
});

test("souvenir UI uses image thumbnails instead of text abbreviation badges", () => {
  assert.match(appSource, /souvenir\.asset/);
  assert.match(appSource, /source\.querySelector\("\.souvenir-object"\)/);
  assert.doesNotMatch(appSource, /markByType/);
  assert.doesNotMatch(appSource, /<i>\$\{mark\}<\/i>/);
});

test("first-run onboarding starts with language, then collects pet and informed weather choices", () => {
  assert.match(appSource, /function renderFirstRunOnboarding\(selectedPet\)/);
  assert.match(appSource, /data-action="onboarding-language-zh"/);
  assert.match(appSource, /data-action="onboarding-language-en"/);
  assert.match(appSource, /if \(isFirstLaunch && !hasChosenLocale\(\)\) return "language"/);
  assert.match(appSource, /data-action="onboarding-choose-pet"/);
  assert.match(appSource, /data-action="onboarding-weather-enable"/);
  assert.match(appSource, /data-action="onboarding-weather-disable"/);
  assert.match(appSource, /hasCompletedOnboarding = true/);
  assert.match(appSource, /点击右上角「设置」/);
  assert.match(appSource, /GeoJS/);
  assert.match(appSource, /Open-Meteo/);
});

test("settings keeps live weather as one compact action after onboarding", () => {
  assert.match(appSource, /data-action="toggle-live-weather"/);
  assert.match(appSource, /背景音乐：\$\{state\.settings\.backgroundMusicEnabled \? "开启" : "关闭"\}/);
  assert.doesNotMatch(appSource, /live-weather-privacy-note/);
  assert.doesNotMatch(appSource, /settings-privacy-note/);
});

test("packaged background music uses byte ranges required by Chromium media", () => {
  assert.match(mainSource, /function parseSingleByteRange/);
  assert.match(mainSource, /"Accept-Ranges": "bytes"/);
  assert.match(mainSource, /"Content-Type": "audio\/mpeg"/);
  assert.match(mainSource, /"Content-Range": `bytes \$\{range\.start\}-\$\{range\.end\}\/\$\{size\}`/);
  assert.match(mainSource, /path\.extname\(requestedPath\)\.toLowerCase\(\) === "\.mp3"/);
});

test("map previews keep music on the last confirmed destination", () => {
  const musicResolver = appSource.slice(
    appSource.indexOf("function normalizeBackgroundMusicDestinationId"),
    appSource.indexOf("function getCurrentBackgroundMusicSelection")
  );
  assert.match(musicResolver, /state\.settings\.backgroundMusicDestinationId/);
  assert.match(musicResolver, /route\.view === "theme-landmark"/);
  assert.match(musicResolver, /route\.view === "atlas-landmark"/);
  assert.doesNotMatch(musicResolver, /route\.view === "map"/);
  assert.doesNotMatch(musicResolver, /state\.selectedAtlasLandmarkId/);
  assert.match(appSource, /if \(action === "enter-theme"\)[\s\S]*?confirmBackgroundMusicDestination\(theme\.id\)/);
  assert.match(appSource, /if \(action === "enter-atlas-landmark"\)[\s\S]*?confirmBackgroundMusicDestination\(destination\.id\)/);
});

test("background music waits for the main surface instead of playing under launch", () => {
  assert.match(appSource, /let backgroundMusicMainSurfaceReady = !launchSkeleton/);
  assert.match(appSource, /function markBackgroundMusicMainSurfaceReady/);
  assert.match(appSource, /if \(launchSkeleton\.isConnected\) launchSkeleton\.remove\(\);[\s\S]*?markBackgroundMusicMainSurfaceReady\(\)/);
  assert.match(appSource, /const shouldPlay = backgroundMusicMainSurfaceReady[\s\S]*?&& !onboardingStep/);
  assert.match(appSource, /scheduleBackgroundMusicRuntimeSync\(homeContext\)/);
});

test("compact pet mode keeps music owned by the hidden main renderer", () => {
  const musicSyncSource = appSource.slice(
    appSource.indexOf("function syncBackgroundMusicRuntime"),
    appSource.indexOf("function scheduleBackgroundMusicRuntimeSync")
  );
  assert.match(musicSyncSource, /&& !isPetWindow/);
  assert.doesNotMatch(musicSyncSource, /visibilityState/);
  assert.doesNotMatch(appSource, /addEventListener\("visibilitychange"[\s\S]*?syncBackgroundMusicRuntime/);
  assert.match(appSource, /const backgroundMusicController = new BackgroundMusicController/);
  const mainWindowSource = mainSource.slice(
    mainSource.indexOf("function createWindow()"),
    mainSource.indexOf("function createSplashWindow()")
  );
  assert.match(mainWindowSource, /backgroundThrottling: false/);
});

test("the journal status bar never labels disabled weather as loading", () => {
  const statusSource = appSource.slice(
    appSource.indexOf("function renderJournalStatusbar()"),
    appSource.indexOf("function renderJournalSettings()")
  );
  assert.match(statusSource, /!state\.settings\.liveWeatherEnabled/);
  assert.match(statusSource, /实时天气已关闭/);
  assert.ok(statusSource.indexOf("实时天气已关闭") < statusSource.indexOf("天气读取中"));
});

test("production Electron source excludes persistent QA progression bypasses", () => {
  assert.doesNotMatch(mainSource, /--qa-phase1-complete/);
  assert.doesNotMatch(mainSource, /qaPhase1/);
  assert.doesNotMatch(appSource, /qaAtlas|qaPhase1|advanceActiveTravelForQa|验收工具/);
});

test("compact pet mode keeps a clean surface and restores the full window by double click", () => {
  const petRenderer = appSource.slice(
    appSource.indexOf("function renderPet(activeTravel"),
    appSource.indexOf("function renderPetPicker")
  );
  assert.doesNotMatch(appSource, /class="pet-mode-restore"/);
  assert.doesNotMatch(appSource, /data-action="desktop-restore-full"/);
  assert.doesNotMatch(stylesSource, /\.pet-mode-restore/);
  assert.match(appSource, /pet\?\.addEventListener\("dblclick"/);
  assert.match(appSource, /window\.desktopBridge\.restoreWindow\(\)/);
  assert.match(petRenderer, /getPetAssetForWeatherState\(pet, status, weatherMeta\?\.assetId\)/);
  assert.doesNotMatch(petRenderer, /options\.lightweight\s*\?\s*getPetAssetForState/);
  assert.match(appSource, /document\.documentElement\.classList\.toggle\("desktop-pet-mode"/);
  assert.match(stylesSource, /html\.desktop-pet-mode,[\s\S]*min-width:\s*0/);
  assert.match(stylesSource, /\.desktop-pet-mode \.desk-pet[\s\S]*-webkit-app-region:\s*no-drag/);
  assert.match(preloadSource, /movePetWindowBy:/);
  assert.match(mainSource, /ipcMain\.on\("desktop:move-pet-window-by"/);
});

test("the first compact-pet transition keeps the main window visible until the pet is ready", () => {
  const createPetSource = mainSource.slice(
    mainSource.indexOf("function createPetWindow()"),
    mainSource.indexOf("function createTray()")
  );
  const enterPetSource = mainSource.slice(
    mainSource.indexOf("function enterPetMode()"),
    mainSource.indexOf("function restoreFullWindow()")
  );
  assert.match(mainSource, /let petModeTransitionPending = false/);
  assert.match(enterPetSource, /if \(petModeTransitionPending/);
  assert.match(enterPetSource, /compactWindow\.once\("ready-to-show", revealCompactWindow\)/);
  assert.ok(
    enterPetSource.indexOf("compactWindow.showInactive()") < enterPetSource.indexOf("mainWindow.hide()")
  );
  assert.match(createPetSource, /webContents\.once\("did-fail-load"/);
  assert.match(createPetSource, /if \(isPetMode\) restoreFullWindow\(\)/);
});

test("launch-time native minimize events cannot race the map into compact pet mode", () => {
  const createWindowSource = mainSource.slice(
    mainSource.indexOf("function createWindow()"),
    mainSource.indexOf("function createSplashWindow()")
  );
  const revealSource = mainSource.slice(
    mainSource.indexOf("function revealMainWindowWhenReady()"),
    mainSource.indexOf("function createPetWindow()")
  );
  assert.match(createWindowSource, /if \(!hasCompletedLaunchSplash\)/);
  assert.match(createWindowSource, /if \(mainWindow\.isMinimized\(\)\) mainWindow\.restore\(\)/);
  assert.ok(revealSource.indexOf("mainWindow.restore()") < revealSource.indexOf("mainWindow.show()"));
  assert.ok(revealSource.indexOf("mainWindow.show()") < revealSource.indexOf("hasCompletedLaunchSplash = true"));
});

test("ordinary travel clock ticks preserve the animated image node in compact pet mode", () => {
  assert.match(appSource, /function tickTravelClock\(\)/);
  const tickSource = appSource.slice(
    appSource.indexOf("function tickTravelClock()"),
    appSource.indexOf("window.addEventListener(\"storage\"")
  );
  assert.match(tickSource, /if \(isLightweightPetMode\(\)\)/);
  assert.match(tickSource, /if \(completedState === state\) return/);
  assert.match(tickSource, /setInterval\(tickTravelClock, 1000\)/);
});

test("duplicate desktop state notifications do not remount the compact pet", () => {
  assert.match(appSource, /function applyDesktopState\(nextDesktopState\)/);
  const syncSource = appSource.slice(
    appSource.indexOf("function applyDesktopState(nextDesktopState)"),
    appSource.indexOf("function bindPetDrag()")
  );
  assert.match(syncSource, /const wasLightweight = isLightweightPetMode\(\)/);
  assert.match(syncSource, /const pauseChanged =/);
  assert.match(syncSource, /if \(isLightweightPetMode\(\) && !pauseChanged\) return/);
});

test("compact pet ignores storage updates that do not change its visual asset", () => {
  assert.match(appSource, /function getCompactPetRenderKey\(snapshot\)/);
  const storageSource = appSource.slice(
    appSource.indexOf('window.addEventListener("storage"'),
    appSource.indexOf('window.addEventListener("hashchange"')
  );
  assert.match(storageSource, /getCompactPetRenderKey\(state\)/);
  assert.match(storageSource, /getCompactPetRenderKey\(nextState\)/);
  assert.match(storageSource, /if \(isLightweightPetMode\(\) && previousRenderKey === nextRenderKey\) return/);
});

test("render only persists when it completes a due travel", () => {
  const renderSource = appSource.slice(
    appSource.indexOf("function render()"),
    appSource.indexOf("function getSelectedPet()")
  );
  assert.match(renderSource, /const completedState = completeActiveTravelIfDue\(state\)/);
  assert.match(renderSource, /if \(completedState !== state\)/);
});

test("the shared shell renders and dismisses the daily rest dialog", () => {
  assert.match(appSource, /function renderDailyRestDialog\(\)/);
  assert.match(appSource, /role="dialog"/);
  assert.match(appSource, /data-action="dismiss-daily-rest"/);
  assert.match(appSource, /dismissDailyCheckinNotice\(state\)/);
  assert.match(stylesSource, /\.daily-rest-backdrop/);
});

test("desktop branding is unified as Itsees with the Teddy travel icon", () => {
  assert.equal(packageConfig.name, "itsees-app");
  assert.equal(packageConfig.build.appId, "com.itsees.app");
  assert.equal(packageConfig.build.productName, "Itsees");
  assert.equal(packageConfig.build.directories.buildResources, "app/assets/brand");
  assert.equal(packageConfig.build.mac.icon, "app-logo-teddy-great-wall.icns");
  assert.equal(packageConfig.build.win.icon, "app-logo-teddy-great-wall.ico");
  assert.match(mainSource, /const appIcon = path\.join\([\s\S]*app-logo-teddy-great-wall\.png/);
  assert.match(mainSource, /icon:\s*appIcon/);
  assert.match(mainSource, /app\.dock\.setIcon\(dockIcon\)/);
  assert.match(mainSource, /title:\s*"Itsees"/);
  assert.match(mainSource, /tray\.setToolTip\("Itsees"\)/);
  assert.match(indexSource, /<title>Itsees<\/title>/);
  assert.match(appSource, /<strong>ITSEES<\/strong>/);
  assert.doesNotMatch(`${mainSource}\n${indexSource}\n${appSource}`, /桌宠随机旅行/);
});

test("the app shows a brief pawprint launch transition before revealing the main window", () => {
  assert.match(indexSource, /id="launch-skeleton"/);
  assert.match(indexSource, /<div id="app" class="app-shell" aria-busy="true" inert><\/div>/);
  assert.match(indexSource, /splash-pawprints-final\.gif/);
  assert.match(splashSource, /splash-pawprints-final\.gif/);
  assert.match(splashSource, /Itsees 正在出发/);
  assert.match(indexSource, /assets\/brand\/splash-pawprints-final\.gif/);
  assert.match(splashSource, /assets\/brand\/splash-pawprints-final\.gif/);
  assert.match(stylesSource, /\.launch-skeleton-overlay\.is-leaving/);
  assert.match(stylesSource, /\.launch-splash-frame/);
  assert.match(stylesSource, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(appSource, /const launchSkeletonMinimumVisibleMs = 3480/);
  assert.match(appSource, /nextDesktopState\.hasCompletedLaunchSplash/);
  assert.match(appSource, /launchSkeleton\.classList\.add\("is-leaving"\)/);
  assert.match(appSource, /launchSkeleton\.remove\(\)/);
  assert.match(mainSource, /const launchSplashMinimumMs = 3480/);
  assert.match(mainSource, /function createSplashWindow\(\)/);
  assert.match(mainSource, /splashWindow\.loadURL\(appSplashUrl\)/);
  assert.match(mainSource, /function revealMainWindowWhenReady\(\)/);
  assert.ok(packageConfig.build.files.includes("app/**/*"));
});

test("the collection pet stays clear of postcard controls and decoration supports keyboard input", () => {
  const mineRenderer = appSource.slice(
    appSource.indexOf('if (route.view === "mine")'),
    appSource.indexOf('if (route.view === "atlas"')
  );
  const decoratorBinding = appSource.slice(
    appSource.indexOf("function bindPostcardDecorator()"),
    appSource.indexOf("function getPostcardPoint")
  );

  assert.match(mineRenderer, /renderPet\(activeTravel, selectedPet, \{ avoidHeader: true, avoidDetails: true, journal: true \}\)/);
  assert.match(decoratorBinding, /source\.addEventListener\("keydown"/);
  assert.match(decoratorBinding, /if \(!dragging\)[\s\S]*addSouvenirToPostcard/);
});
