import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { migrateState } from "../app/src/storage.js";
import { MAX_SOUVENIR_ACQUISITIONS, MAX_TRAVEL_HISTORY } from "../app/src/travelEngine.js";

const appSource = readFileSync(new URL("../app/src/app.js", import.meta.url), "utf8");
const serverSource = readFileSync(new URL("../scripts/serve_app.py", import.meta.url), "utf8");
const mcpSource = readFileSync(new URL("../plugins/itsees/mcp/server.mjs", import.meta.url), "utf8");
const ciSource = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
const assetInstallerSource = readFileSync(new URL("../scripts/install-assets.mjs", import.meta.url), "utf8");

test("migration bounds untrusted history and analytics arrays", () => {
  const travel = {
    id: "bounded",
    phase: 1,
    themeId: "T01",
    startedAt: "2026-01-01T01:00:00.000Z",
    result: null
  };
  const migrated = migrateState({
    travels: Array.from({ length: MAX_TRAVEL_HISTORY + 20 }, (_, index) => ({ ...travel, id: `travel-${index}` })),
    souvenirAcquisitions: Array.from({ length: MAX_SOUVENIR_ACQUISITIONS + 20 }, (_, index) => ({
      id: `acquisition-${index}`,
      souvenirId: "T01-SV01",
      travelId: `travel-${index}`,
      phase: 1,
      destinationId: "T01",
      acquiredAt: "2026-01-01T01:00:00.000Z"
    })),
    analytics: Array.from({ length: 300 }, (_, index) => ({ id: index }))
  });
  assert.equal(migrated.travels.length, MAX_TRAVEL_HISTORY);
  assert.ok(migrated.souvenirAcquisitions.length <= MAX_SOUVENIR_ACQUISITIONS);
  assert.equal(migrated.analytics.length, 120);
});

test("travel migration derives missing daily date from the saved home time zone", () => {
  const migrated = migrateState({
    dailyCheckin: { homeTimeZone: "America/Los_Angeles" },
    activeTravel: {
      id: "timezone-travel",
      phase: 1,
      themeId: "T01",
      status: "traveling",
      startedAt: "2026-01-01T01:00:00.000Z"
    }
  });
  assert.equal(migrated.activeTravel.dailyCheckinDate, "2025-12-31");
});

test("reviewed HTML attributes escape stored timestamps", () => {
  assert.match(appSource, /datetime="\$\{escapeHtml\(acquisition\.acquiredAt\)\}"/);
  assert.match(appSource, /datetime="\$\{escapeHtml\(travel\.completedAt \?\? travel\.startedAt\)\}"/);
});

test("development server stays loopback-only and bounds upstream responses", () => {
  assert.match(serverSource, /host = "127\.0\.0\.1"/);
  assert.doesNotMatch(serverSource, /\("::", port\)/);
  assert.match(serverSource, /MAX_UPSTREAM_BYTES = 1_000_000/);
  assert.match(serverSource, /candidate\.relative_to\(APP_DIR\.resolve\(\)\)/);
  assert.doesNotMatch(serverSource, /"--location"/);
});

test("MCP read tools derive due state without writing and redact local paths", () => {
  assert.match(mcpSource, /return completeActiveTravelIfDue\(state\);/);
  assert.doesNotMatch(mcpSource, /state_path:/);
  assert.match(mcpSource, /isError: true/);
  assert.match(mcpSource, /await stat\(indexPath\)/);
});

test("CI actions are pinned to immutable commit SHAs", () => {
  assert.doesNotMatch(ciSource, /uses:\s+[^\s]+@v\d/);
  assert.equal((ciSource.match(/uses:\s+[^\s]+@[0-9a-f]{40}/g) ?? []).length, 3);
});

test("asset installer anchors manifests in tracked trust and restricts write targets", () => {
  assert.match(assetInstallerSource, /trustedManifestPath/);
  assert.match(assetInstallerSource, /Asset manifest does not match the trusted manifest/);
  assert.match(assetInstallerSource, /ALLOWED_TARGETS\.has\(relativeTarget\)/);
  assert.match(assetInstallerSource, /path\.basename\(packageEntry\.archive\) !== packageEntry\.archive/);
});
