import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createInitialState } from "../app/src/travelEngine.js";
import { migrateState } from "../app/src/storage.js";

const mainSource = readFileSync(new URL("../desktop/main.cjs", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../app/src/app.js", import.meta.url), "utf8");
const storageSource = readFileSync(new URL("../app/src/storage.js", import.meta.url), "utf8");
const indexSource = readFileSync(new URL("../app/index.html", import.meta.url), "utf8");
const packageConfig = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const signedReleaseSource = readFileSync(new URL("../electron-builder.release.cjs", import.meta.url), "utf8");

test("new and legacy users do not share location before explicit weather consent", () => {
  const fresh = createInitialState();
  assert.equal(fresh.settings.liveWeatherEnabled, false);
  assert.equal(fresh.settings.hasGrantedLiveWeatherConsent, false);

  const migrated = migrateState({
    version: 6,
    settings: { liveWeatherEnabled: true },
    localWeather: {
      status: "ready",
      location: { city: "Paris", latitude: 48.8566, longitude: 2.3522 },
      snapshot: { label: "晴" }
    }
  });
  assert.equal(migrated.settings.liveWeatherEnabled, false);
  assert.equal(migrated.settings.hasGrantedLiveWeatherConsent, false);
  assert.equal(migrated.localWeather.status, "disabled");
  assert.equal(migrated.localWeather.location, null);
  assert.equal(migrated.localWeather.snapshot, null);
});

test("consented weather migration removes persisted coordinates", () => {
  const migrated = migrateState({
    version: 7,
    settings: {
      liveWeatherEnabled: true,
      hasGrantedLiveWeatherConsent: true
    },
    localWeather: {
      status: "ready",
      location: {
        city: "Paris",
        country: "France",
        latitude: 48.8566,
        longitude: 2.3522
      }
    }
  });
  assert.equal(migrated.settings.liveWeatherEnabled, true);
  assert.equal(migrated.localWeather.location.city, "Paris");
  assert.equal("latitude" in migrated.localWeather.location, false);
  assert.equal("longitude" in migrated.localWeather.location, false);
});

test("Electron denies unexpected navigation, windows, permissions, and IPC senders", () => {
  assert.equal((mainSource.match(/hardenWebContents\(/g) ?? []).length, 4);
  assert.match(mainSource, /setWindowOpenHandler\(\(\) => \(\{ action: "deny" \}\)\)/);
  assert.match(mainSource, /webContents\.on\("will-navigate"/);
  assert.match(mainSource, /webContents\.on\("will-redirect"/);
  assert.match(mainSource, /setPermissionCheckHandler\(\(\) => false\)/);
  assert.match(mainSource, /setPermissionRequestHandler\(\(_webContents, _permission, callback\) => callback\(false\)\)/);
  assert.equal((mainSource.match(/requireTrustedAppSender\(event\)/g) ?? []).length, 14);
  assert.match(mainSource, /event\.senderFrame\?\.url \|\| event\.sender\.getURL\(\)/);
  assert.match(mainSource, /shell\.openExternal\(privacyPolicyUrl\)/);
  assert.match(mainSource, /requestedPath\.startsWith\(`\$\{resolvedRendererRoot\}\$\{path\.sep\}`\)/);
});

test("live-weather IPC rejects broad proxying and unbounded responses", () => {
  assert.match(mainSource, /redirect: "error"/);
  assert.match(mainSource, /liveWeatherRequestTimeoutMs = 10_000/);
  assert.match(mainSource, /liveWeatherMaximumResponseBytes = 1_000_000/);
  assert.match(mainSource, /allowedQueryKeys/);
  assert.match(mainSource, /latitude >= -90/);
  assert.match(mainSource, /longitude <= 180/);
  assert.match(mainSource, /contentType\.toLowerCase\(\)\.includes\("application\/json"\)/);
});

test("release configuration enables Electron anti-tamper fuses", () => {
  assert.deepEqual(packageConfig.build.electronFuses, {
    runAsNode: false,
    enableCookieEncryption: true,
    enableNodeOptionsEnvironmentVariable: false,
    enableNodeCliInspectArguments: false,
    enableEmbeddedAsarIntegrityValidation: true,
    onlyLoadAppFromAsar: true,
    grantFileProtocolExtraPrivileges: false,
    resetAdHocDarwinSignature: true
  });
  assert.equal(packageConfig.build.mac.extendInfo.NSAppTransportSecurity.NSAllowsArbitraryLoads, false);
  assert.equal(packageConfig.build.mac.extendInfo.NSAppTransportSecurity.NSAllowsLocalNetworking, false);
  assert.equal(packageConfig.build.afterPack, "scripts/harden_macos_plist.cjs");
  assert.match(mainSource, /protocol\.registerSchemesAsPrivileged/);
  assert.match(mainSource, /protocol\.handle\("itsees"/);
  assert.match(mainSource, /mainWindow\.loadURL\(appIndexUrl\)/);
});

test("formal macOS release requires signing and notarization without breaking local builds", () => {
  assert.equal(packageConfig.build.mac.identity, null);
  assert.match(packageConfig.scripts["dist:mac:signed"], /electron-builder\.release\.cjs/);
  assert.match(signedReleaseSource, /forceCodeSigning:\s*true/);
  assert.match(signedReleaseSource, /hardenedRuntime:\s*true/);
  assert.match(signedReleaseSource, /notarize:\s*true/);
  assert.doesNotMatch(signedReleaseSource, /identity:\s*null/);
});

test("stored postcards are normalized and escaped before HTML rendering", () => {
  assert.match(storageSource, /normalizeStoredId\(postcard\.id\)/);
  assert.match(storageSource, /destination\.scenes\.find\(item => item\.id === postcard\.sceneId\)/);
  assert.match(storageSource, /sceneImageAsset: phase === 1 \? resolveOptimizedAssetUrl\(scene\.imageAsset\) : scene\.imageAsset/);
  assert.match(appSource, /<strong>\$\{escapeHtml\(card\.title\)\}<\/strong>/);
  assert.match(appSource, /<p>\$\{escapeHtml\(card\.message\)\}<\/p>/);
  assert.match(appSource, /data-postcard-id="\$\{escapeHtml\(card\.id\)\}"/);
  assert.match(indexSource, /frame-src 'none'/);
  assert.match(indexSource, /form-action 'none'/);
  assert.match(indexSource, /media-src 'self'/);
});

test("release renderer has no query-driven QA progression controls", () => {
  assert.doesNotMatch(mainSource, /--qa-phase1-complete|qaPhase1|qaAtlas/);
  assert.doesNotMatch(appSource, /advanceActiveTravelForQa|qaPhase1|qaAtlas|验收工具/);
});
