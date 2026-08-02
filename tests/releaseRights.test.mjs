import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { ASSET_PROVENANCE } from "../scripts/asset-provenance.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("public release provenance records confirmed rights for every asset group", () => {
  assert.equal(ASSET_PROVENANCE.schema, "itsees-asset-provenance/1");
  assert.deepEqual(ASSET_PROVENANCE.groups.map(group => group.package), ["core", "atlas", "music"]);

  for (const group of ASSET_PROVENANCE.groups) {
    assert.equal(group.redistribution, "confirmed", group.package);
    assert.equal(group.confirmedBy, "Lucy Zhang", group.package);
    assert.equal(group.confirmedAt, "2026-08-01", group.package);
    assert.ok(group.rightsBasis.length > 80, `${group.package} needs a concrete rights basis`);
    assert.doesNotMatch(JSON.stringify(group), /unconfirmed/i, group.package);
  }
});

test("public asset notice discloses sources and excludes third-party release media", async () => {
  const notice = await readFile(path.join(root, "ASSET-NOTICE.md"), "utf8");
  for (const label of ["Core", "Atlas", "Music", "Lucy Zhang", "2026-08-01", "ChatCut"]) {
    assert.match(notice, new RegExp(label));
  }
  assert.match(notice, /Wikimedia and Wikipedia materials were used only for landmark research/);
  assert.match(notice, /does not directly include downloaded web photographs, stock-library media, third-party character intellectual property, or third-party music/);
  assert.match(notice, /https:\/\/chatcut\.io\/features\/ai-music/);
});

test("release build keeps source-only Phase 2 reference photographs outside Electron", async () => {
  const packageConfig = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  const includedFiles = packageConfig.build.files;
  assert.ok(includedFiles.includes("app/**/*"));
  assert.equal(includedFiles.some(pattern => pattern.includes("phase2-app")), false);

  const builder = await readFile(path.join(root, "scripts/build-release-assets.mjs"), "utf8");
  assert.match(builder, /ASSET_PROVENANCE/);
  assert.doesNotMatch(builder, /redistribution:\s*"unconfirmed"/);
});
