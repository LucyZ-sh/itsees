import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const siteDir = path.join(root, "site");

async function text(relativePath) {
  return readFile(path.join(siteDir, relativePath), "utf8");
}

test("official website is a self-contained static entry point", async () => {
  const html = await text("index.html");
  assert.match(html, /<html lang="en">/);
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1);
  assert.match(html, /site-config\.js/);
  assert.match(html, /site\.js/);
  assert.match(html, /styles\.css/);
  assert.equal((html.match(/v=0\.1\.0-beta\.4-install/g) || []).length, 3);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /data-language="en"/);
  assert.match(html, /data-language="zh"/);
  assert.doesNotMatch(html, /(?:src|href)="\/(?!\/)/, "site must not depend on root-relative files");
});

test("all local HTML assets exist inside the site directory", async () => {
  const html = await text("index.html");
  const references = [...html.matchAll(/(?:src|href)="(?!https?:|#|mailto:)([^"?]+)"/g)]
    .map((match) => match[1])
    .filter(Boolean);
  assert.ok(references.length >= 10);
  await Promise.all(references.map((reference) => access(path.join(siteDir, reference))));
});

test("live-weather privacy policy is published and linked", async () => {
  const [privacy, config] = await Promise.all([text("privacy.html"), text("site-config.js")]);
  assert.match(config, /privacyUrl:\s*"\.\/privacy\.html"/);
  assert.match(privacy, /GeoJS/);
  assert.match(privacy, /Open-Meteo/);
  assert.match(privacy, /raw coordinates are not persisted/i);
  assert.match(privacy, /不持久化 GeoJS 返回的原始经纬度/);
});

test("every translation marker has English and Chinese copy", async () => {
  const [html, script] = await Promise.all([text("index.html"), text("site.js")]);
  const markers = [...html.matchAll(/data-i18n(?:-alt|-aria-label)?="([^"]+)"/g)].map((match) => match[1]);
  assert.ok(markers.length > 50);
  for (const key of new Set(markers)) {
    const occurrences = script.match(new RegExp(`\\b${key}:`, "g")) || [];
    assert.ok(occurrences.length >= 2, `expected English and Chinese values for ${key}`);
  }
});

test("public website exposes the current DMG and bilingual installation guide", async () => {
  const [config, html, script] = await Promise.all([
    text("site-config.js"),
    text("index.html"),
    text("site.js"),
  ]);
  assert.match(config, /downloadEnabled:\s*true/);
  assert.match(config, /releases\/download\/v0\.1\.0-beta\.4\/Itsees-0\.1\.0-beta\.4-arm64\.dmg/);
  assert.match(script, /download:\s*"Download"/);
  assert.match(script, /download:\s*"下载"/);
  assert.doesNotMatch(config, /releaseUrl|checksumUrl|sha256|signed:/);
  assert.match(html, /id="install"/);
  assert.match(html, /15297e5b904aae0017a89d5c48039bd2b2e32ddca7b0b6d37108207a55598a38/);
  assert.match(script, /Installation guide/);
  assert.match(script, /安装说明/);
  assert.match(script, /Open Anyway/);
  assert.match(script, /仍要打开/);
  assert.doesNotMatch(script, /Unsigned & not notarized|未签名且未经公证/);
});

test("repository root provides the GitHub Pages entry point", async () => {
  const rootEntry = await readFile(path.join(root, "index.html"), "utf8");
  assert.match(rootEntry, /url=\.\/site\//);
  assert.match(rootEntry, /href="\.\/site\/"/);
});

test("hero gives the Itsees brand and promise first-class hierarchy", async () => {
  const [html, script, styles] = await Promise.all([text("index.html"), text("site.js"), text("styles.css")]);
  assert.match(html, /class="hero-brand"/);
  assert.match(html, /Somewhere out there, a wide world is waiting\. Let it wander ahead\./);
  assert.match(html, /And bring the wonder home\./);
  assert.match(script, /世界这么大，让它替你先看看。/);
  assert.match(script, /它见过的世界，都会带回来给你。/);
  assert.ok((html.match(/teddy-great-wall\.png/g) || []).length >= 4);
  assert.match(styles, /h1\s*\{[^}]*font-size:\s*clamp\(2\.5rem,[^;]+3rem\)/s);
  assert.match(styles, /h1 span\s*\{[^}]*color:\s*var\(--coral\)[^}]*font-size:\s*clamp\(1\.75rem,[^;]+2\.125rem\)[^}]*font-weight:\s*400/s);
});

test("selected product captures use full-resolution links and one shared true-ratio window", async () => {
  const [html, styles] = await Promise.all([text("index.html"), text("styles.css")]);
  for (const name of ["journey", "keepsakes"]) {
    assert.match(html, new RegExp(`data-product-window="${name}"`));
    assert.match(html, new RegExp(`href="assets/product-${name}\\.png"[^>]+target="_blank"`));
    assert.match(html, new RegExp(`src="assets/product-${name}\\.png"[^>]+width="1270" height="760"`));
  }
  assert.equal((html.match(/data-product-window=/g) || []).length, 2);
  assert.doesNotMatch(html, /product-atlas\.png/);
  assert.doesNotMatch(html, /data-product-window="atlas"/);
  assert.match(styles, /\.window-media\s*\{[^}]*aspect-ratio:\s*127\s*\/\s*76/s);
  assert.match(styles, /\.window-media img\s*\{[^}]*object-fit:\s*contain/s);
  assert.doesNotMatch(styles, /\.product-window[^}]*rotate\(/s);
});
