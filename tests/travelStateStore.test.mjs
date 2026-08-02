import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import stateStoreModule from "../desktop/travelStateStore.cjs";
import { createMcpStateStore } from "../plugins/itsees/mcp/stateStore.mjs";

const {
  createTravelStateStore,
  getDefaultTravelStatePath
} = stateStoreModule;

test("shared travel state store writes atomically and reads the same JSON state", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "itsees-state-store-"));
  const filePath = path.join(directory, "nested", "travel-state.json");
  try {
    const store = createTravelStateStore({ filePath });
    assert.equal(store.read(), null);

    const state = {
      version: 8,
      activeTravel: { id: "travel-test", status: "traveling" },
      album: []
    };
    assert.equal(store.write(state), state);
    assert.deepEqual(store.read(), state);
    assert.deepEqual(JSON.parse(await readFile(filePath, "utf8")), state);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("shared travel state watcher observes writes from another process boundary", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "itsees-state-watch-"));
  const filePath = path.join(directory, "travel-state.json");
  const reader = createTravelStateStore({ filePath });
  const writer = createTravelStateStore({ filePath });
  try {
    const observed = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timed out waiting for shared travel state.")), 2000);
      const stop = reader.watch((state, error) => {
        if (error) {
          clearTimeout(timeout);
          stop();
          reject(error);
          return;
        }
        clearTimeout(timeout);
        stop();
        resolve(state);
      }, 50);
    });
    writer.write({ version: 8, marker: "from-mcp" });
    assert.deepEqual(await observed, { version: 8, marker: "from-mcp" });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("default shared state path is stable across Electron and Codex", () => {
  assert.equal(
    getDefaultTravelStatePath("/Users/example"),
    path.join("/Users/example", ".itsees", "travel-state-v1.json")
  );
});

test("shared state transactions serialize additive updates and revisions", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "itsees-state-transaction-"));
  const filePath = path.join(directory, "travel-state.json");
  const first = createTravelStateStore({ filePath });
  const second = createTravelStateStore({ filePath });
  try {
    await first.update(() => ({ version: 10, markers: [] }));
    await Promise.all(Array.from({ length: 40 }, (_, index) => {
      const store = index % 2 === 0 ? first : second;
      return store.update(current => ({
        ...current,
        markers: [...current.markers, index]
      }));
    }));
    const saved = first.read();
    assert.equal(saved.revision, 41);
    assert.equal(saved.markers.length, 40);
    assert.deepEqual([...saved.markers].sort((a, b) => a - b), Array.from({ length: 40 }, (_, index) => index));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("shared state transactions reject a stale expected revision without writing", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "itsees-state-conflict-"));
  const filePath = path.join(directory, "travel-state.json");
  const store = createTravelStateStore({ filePath });
  try {
    const first = await store.update(() => ({ version: 10, marker: "first" }));
    const second = await store.update(current => ({ ...current, marker: "second" }));
    const conflict = await store.update(
      current => ({ ...current, marker: "stale" }),
      { expectedRevision: first.state.revision }
    );
    assert.equal(conflict.ok, false);
    assert.equal(conflict.conflict, true);
    assert.equal(conflict.current.revision, second.state.revision);
    assert.equal(store.read().marker, "second");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("shared state transactions reclaim an expired lock lease", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "itsees-state-stale-lock-"));
  const filePath = path.join(directory, "travel-state.json");
  const store = createTravelStateStore({ filePath });
  try {
    await writeFile(store.lockPath, JSON.stringify({ token: "abandoned", pid: 1 }), "utf8");
    const expired = new Date(Date.now() - 10_000);
    await utimes(store.lockPath, expired, expired);
    const result = await store.update(
      () => ({ version: 10, recovered: true }),
      { timeoutMs: 500, retryMs: 5, staleMs: 100 }
    );
    assert.equal(result.ok, true);
    assert.equal(store.read().recovered, true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("a live transaction renews its lock lease during a slow mutation", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "itsees-state-lock-heartbeat-"));
  const filePath = path.join(directory, "travel-state.json");
  const first = createTravelStateStore({ filePath });
  const second = createTravelStateStore({ filePath });
  try {
    await first.update(() => ({ version: 10, markers: [] }));
    const slowUpdate = first.update(async current => {
      await new Promise(resolve => setTimeout(resolve, 180));
      return { ...current, markers: [...current.markers, "slow"] };
    }, { timeoutMs: 600, retryMs: 5, staleMs: 60 });
    await new Promise(resolve => setTimeout(resolve, 90));
    const followingUpdate = second.update(
      current => ({ ...current, markers: [...current.markers, "following"] }),
      { timeoutMs: 600, retryMs: 5, staleMs: 60 }
    );
    await Promise.all([slowUpdate, followingUpdate]);
    assert.deepEqual(first.read().markers, ["slow", "following"]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("Electron and MCP state stores share one transaction lock", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "itsees-state-cross-writer-"));
  const filePath = path.join(directory, "travel-state.json");
  const desktopStore = createTravelStateStore({ filePath });
  const mcpStore = createMcpStateStore(filePath);
  try {
    await desktopStore.update(() => ({ version: 10, markers: [] }));
    await Promise.all(Array.from({ length: 30 }, (_, index) => {
      const store = index % 2 === 0 ? desktopStore : mcpStore;
      return store.update(current => ({ ...current, markers: [...current.markers, index] }));
    }));
    const saved = desktopStore.read();
    assert.equal(saved.revision, 31);
    assert.equal(new Set(saved.markers).size, 30);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("MCP state reads reject oversized files before loading and tolerate corrupt JSON", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "itsees-state-bounds-"));
  const filePath = path.join(directory, "travel-state.json");
  const store = createMcpStateStore(filePath, { maxBytes: 64 });
  try {
    await writeFile(filePath, "{not-json", "utf8");
    assert.equal(await store.read(), null);
    await writeFile(filePath, "x".repeat(65), "utf8");
    await assert.rejects(store.read(), /exceeds the supported size/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
