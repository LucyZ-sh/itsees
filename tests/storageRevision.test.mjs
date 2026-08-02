import assert from "node:assert/strict";
import test from "node:test";

test("desktop save queue never downgrades a newer in-memory revision", async () => {
  const savedSnapshots = [];
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  };
  globalThis.window = {
    desktopBridge: {
      saveTravelState: async snapshot => {
        savedSnapshots.push(structuredClone(snapshot));
        return { ok: true, state: { ...snapshot, revision: snapshot.revision + 1 } };
      }
    },
    dispatchEvent: () => {}
  };

  try {
    const { saveState } = await import(`../app/src/storage.js?revision-test=${Date.now()}`);
    const firstSave = saveState({ version: 10, revision: 3, settings: {} });
    const secondSave = saveState({ version: 10, revision: 5, settings: { isPaused: true } });
    await Promise.all([firstSave, secondSave]);

    assert.equal(savedSnapshots[0].revision, 3);
    assert.equal(savedSnapshots[1].revision, 5);
    assert.equal(savedSnapshots[1].settings.isPaused, true);
  } finally {
    delete globalThis.window;
    delete globalThis.localStorage;
  }
});

test("desktop save queue advances equal-revision snapshots after its own successful write", async () => {
  const savedRevisions = [];
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  };
  globalThis.window = {
    desktopBridge: {
      saveTravelState: async snapshot => {
        savedRevisions.push(snapshot.revision);
        return { ok: true, state: { ...snapshot, revision: snapshot.revision + 1 } };
      }
    },
    dispatchEvent: () => {}
  };

  try {
    const { saveState } = await import(`../app/src/storage.js?queue-test=${Date.now()}`);
    await Promise.all([
      saveState({ version: 10, revision: 8, settings: { isPaused: false } }),
      saveState({ version: 10, revision: 8, settings: { isPaused: true } })
    ]);
    assert.deepEqual(savedRevisions, [8, 9]);
  } finally {
    delete globalThis.window;
    delete globalThis.localStorage;
  }
});
