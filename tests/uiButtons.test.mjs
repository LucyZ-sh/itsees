import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../app/src/app.js", import.meta.url), "utf8");

test("every rendered button is wired to an interaction contract", () => {
  const buttonTags = [...appSource.matchAll(/<button\b([\s\S]*?)>/g)].map(match => match[0]);

  assert.ok(buttonTags.length >= 78, "expected the complete production button surface");
  for (const tag of buttonTags) {
    assert.match(
      tag,
      /data-action|data-tab|data-mine-tab|data-theme-id|data-decoration-handle/,
      `button is missing an interaction contract: ${tag.replace(/\s+/g, " ")}`
    );
  }
});

test("every literal data-action button has a matching action handler", () => {
  const renderedActions = new Set(
    [...appSource.matchAll(/data-action="([a-z0-9-]+)"/g)].map(match => match[1])
  );
  const handledActions = new Set(
    [...appSource.matchAll(/action === "([a-z0-9-]+)"/g)].map(match => match[1])
  );

  assert.ok(renderedActions.size >= 48, "expected the complete production action surface");
  assert.deepEqual(
    [...renderedActions].filter(action => !handledActions.has(action)),
    []
  );
});

test("non-action controls retain dedicated bindings", () => {
  assert.match(appSource, /querySelectorAll\("\.theme-button\[data-theme-id\]"\)/);
  assert.match(appSource, /querySelectorAll\("\.pack-item input"\)/);
  assert.match(appSource, /querySelectorAll\("\[data-tab\]"\)/);
  assert.match(appSource, /querySelectorAll\("\[data-mine-tab\]"\)/);
  assert.match(appSource, /querySelectorAll\("\[data-collection-filter\]"\)/);
  assert.match(appSource, /details\.addEventListener\("toggle"/);
  assert.match(appSource, /bindPostcardDecorator\(\)/);
  assert.match(appSource, /bindAtlasWorldView\(app/);
});
