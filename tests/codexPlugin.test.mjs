import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import test from "node:test";
import { fileURLToPath } from "node:url";

import stateStoreModule from "../desktop/travelStateStore.cjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pluginRoot = path.join(projectRoot, "plugins", "itsees");
const serverPath = path.join(pluginRoot, "mcp", "server.mjs");
const { createTravelStateStore } = stateStoreModule;

test("Codex plugin manifest exposes the Itsees skill and MCP server", async () => {
  const manifest = JSON.parse(
    await readFile(path.join(pluginRoot, ".codex-plugin", "plugin.json"), "utf8")
  );
  const mcpConfig = JSON.parse(await readFile(path.join(pluginRoot, ".mcp.json"), "utf8"));
  const skill = await readFile(
    path.join(pluginRoot, "skills", "itsees-travel", "SKILL.md"),
    "utf8"
  );

  assert.equal(manifest.name, "itsees");
  assert.equal(manifest.skills, "./skills/");
  assert.equal(manifest.mcpServers, "./.mcp.json");
  assert.deepEqual(manifest.interface.capabilities, ["Read", "Write"]);
  assert.equal(mcpConfig.mcpServers.itsees.command, "node");
  assert.deepEqual(mcpConfig.mcpServers.itsees.args, ["./mcp/server.mjs"]);
  assert.match(skill, /name: itsees-travel/);
  assert.doesNotMatch(skill, /TODO/);
});

test("bundled plugin runtime matches current Itsees application modules", async () => {
  const sourceDirectory = path.join(projectRoot, "app", "src");
  const runtimeDirectory = path.join(pluginRoot, "runtime", "app-src");
  const sourceFiles = (await readdir(sourceDirectory)).filter(name => name.endsWith(".js")).sort();
  const runtimeFiles = (await readdir(runtimeDirectory)).filter(name => name.endsWith(".js")).sort();
  assert.deepEqual(runtimeFiles, sourceFiles);

  for (const fileName of sourceFiles) {
    const [source, runtime] = await Promise.all([
      readFile(path.join(sourceDirectory, fileName), "utf8"),
      readFile(path.join(runtimeDirectory, fileName), "utf8")
    ]);
    assert.equal(runtime, source, `${fileName} runtime snapshot is stale`);
  }
});

test("Electron renderer and the plugin are wired to the shared travel state bridge", async () => {
  const [mainSource, preloadSource, appSource, storageSource] = await Promise.all([
    readFile(path.join(projectRoot, "desktop", "main.cjs"), "utf8"),
    readFile(path.join(projectRoot, "desktop", "preload.cjs"), "utf8"),
    readFile(path.join(projectRoot, "app", "src", "app.js"), "utf8"),
    readFile(path.join(projectRoot, "app", "src", "storage.js"), "utf8")
  ]);

  assert.match(mainSource, /createTravelStateStore/);
  assert.match(mainSource, /createPostcardAssetStore/);
  assert.match(mainSource, /ipcMain\.handle\("desktop:get-travel-state"/);
  assert.match(mainSource, /ipcMain\.handle\("desktop:save-travel-state"/);
  assert.match(mainSource, /ipcMain\.handle\("desktop:apply-travel-action"/);
  assert.match(preloadSource, /getTravelState:/);
  assert.match(preloadSource, /saveTravelState:/);
  assert.match(preloadSource, /applyTravelAction:/);
  assert.match(preloadSource, /onTravelState:/);
  assert.match(appSource, /applySharedTravelState/);
  assert.match(storageSource, /persistDesktopState/);
  assert.match(storageSource, /shared-state-conflict/);
});

test("Itsees MCP supports discovery, start, status, recall, and continue", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "itsees-mcp-"));
  const statePath = path.join(directory, "travel-state.json");
  const client = createMcpClient(statePath);

  try {
    const initialized = await client.request("initialize", {
      protocolVersion: "2025-11-25",
      capabilities: {}
    });
    assert.equal(initialized.serverInfo.name, "Itsees Travel");

    const listed = await client.request("tools/list", {});
    assert.deepEqual(
      listed.tools.map(tool => tool.name),
      [
        "itsees_get_status",
        "itsees_list_destinations",
        "itsees_list_pack_items",
        "itsees_start_travel",
        "itsees_recall_travel",
        "itsees_continue_travel",
        "itsees_list_collection",
        "itsees_show_postcards",
        "itsees_open_app"
      ]
    );

    const destinations = await client.call("itsees_list_destinations", {
      phase: 1,
      unlocked_only: true
    });
    assert.deepEqual(
      destinations.structuredContent.destinations.map(destination => destination.id),
      ["T01", "T02", "T03"]
    );

    const uninitializedStart = await client.call("itsees_start_travel", { destination_id: "T01" });
    assert.equal(uninitializedStart.isError, true);
    assert.match(uninitializedStart.content[0].text, /shared state is not initialized/);
    await writeFile(statePath, JSON.stringify({ version: 8 }), "utf8");
    const started = await client.call("itsees_start_travel", {
      destination_id: "T01",
      selected_item_ids: ["food-riceball", "tool-camera"]
    });
    assert.equal(started.structuredContent.status, "started");
    assert.equal(started.structuredContent.travel.destination_id, "T01");

    const status = await client.call("itsees_get_status", {});
    assert.equal(status.structuredContent.journey_state, "traveling");
    assert.equal(status.structuredContent.active_travel.destination_id, "T01");

    const recalled = await client.call("itsees_recall_travel", {});
    assert.equal(recalled.structuredContent.status, "recalled");
    assert.equal(recalled.structuredContent.new_postcard_count, 0);

    const continued = await client.call("itsees_continue_travel", {});
    assert.equal(continued.structuredContent.status, "continued");
    assert.equal(continued.structuredContent.travel.status, "traveling");

    const saved = createTravelStateStore({ filePath: statePath }).read();
    assert.equal(saved.activeTravel.status, "traveling");
    assert.equal(saved.activeTravel.destinationId, "T01");

    saved.album.unshift({
      id: "postcard-test",
      travelId: saved.activeTravel.id,
      phase: 1,
      destinationId: "T01",
      themeId: "T01",
      landmarkId: null,
      sceneId: "T01-S01",
      sceneImageAsset: "./assets/themes/T01/scenes/T01-S01.webp",
      title: "海边小镇 · 抵达明信片",
      sceneName: "抵达",
      message: "从海边寄回的一张测试明信片。",
      createdAt: new Date().toISOString(),
      progressPercent: 20,
      rarity: "common",
      completionReason: "recalled",
      weatherSnapshot: null,
      decorations: []
    });
    createTravelStateStore({ filePath: statePath }).write(saved);

    const postcardDirectory = path.join(directory, "postcards");
    const postcardPath = path.join(postcardDirectory, "postcard-test.webp");
    const postcardBytes = Buffer.from([
      0x52, 0x49, 0x46, 0x46,
      0x04, 0x00, 0x00, 0x00,
      0x57, 0x45, 0x42, 0x50,
      0x56, 0x50, 0x38, 0x20
    ]);
    await mkdir(postcardDirectory, { recursive: true });
    await writeFile(postcardPath, postcardBytes);
    await writeFile(
      path.join(postcardDirectory, "index.json"),
      JSON.stringify({
        version: 1,
        postcards: {
          "postcard-test": {
            filePath: postcardPath,
            mimeType: "image/webp",
            byteLength: postcardBytes.length
          }
        }
      })
    );

    const shown = await client.call("itsees_show_postcards", {
      postcard_ids: ["postcard-test"]
    });
    assert.deepEqual(shown.content.map(item => item.type), ["text", "image"]);
    assert.deepEqual(Buffer.from(shown.content[1].data, "base64"), postcardBytes);
    assert.equal(shown.structuredContent.postcards[0].id, "postcard-test");

    const dueStateStore = createTravelStateStore({ filePath: statePath });
    const dueState = dueStateStore.read();
    dueState.activeTravel.startedAt = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
    dueState.activeTravel.expectedReturnAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    dueStateStore.write(dueState);
    const beforeReadTool = await readFile(statePath, "utf8");
    const derivedStatus = await client.call("itsees_get_status", {});
    assert.equal(derivedStatus.structuredContent.journey_state, "completed");
    assert.equal(await readFile(statePath, "utf8"), beforeReadTool);
  } finally {
    client.close();
    await rm(directory, { recursive: true, force: true });
  }
});

function createMcpClient(statePath) {
  const child = spawn(process.execPath, [serverPath], {
    cwd: pluginRoot,
    env: { ...process.env, ITSEES_STATE_PATH: statePath },
    stdio: ["pipe", "pipe", "pipe"]
  });
  const pending = new Map();
  let nextId = 1;
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", chunk => {
    stderr += chunk;
  });
  const lines = readline.createInterface({ input: child.stdout, crlfDelay: Infinity });
  lines.on("line", line => {
    const message = JSON.parse(line);
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    if (message.error) entry.reject(new Error(message.error.message));
    else entry.resolve(message.result);
  });
  child.on("exit", code => {
    for (const entry of pending.values()) {
      entry.reject(new Error(`Itsees MCP exited with code ${code}: ${stderr}`));
    }
    pending.clear();
  });

  function request(method, params) {
    const id = nextId++;
    const result = new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
    });
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
    return result;
  }

  return {
    request,
    call(name, args) {
      return request("tools/call", { name, arguments: args });
    },
    close() {
      lines.close();
      child.kill();
    }
  };
}
