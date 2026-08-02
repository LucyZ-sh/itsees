# Architecture

## Runtime

`app/index.html` loads a native ES-module application without a frontend bundler. `app/src/app.js` owns rendering and user interaction. Pure modules own travel rules, storage migration, content queries, weather, music, collections, and postcard decoration.

`desktop/main.cjs` creates the Electron windows and tray. `desktop/preload.cjs` is the only renderer-to-main API. Navigation, permissions, window creation, weather requests, file paths, and IPC senders are allowlisted.

## Atlas

Production Atlas configuration lives in `app/src/atlas/worldSceneConfigs.js`. Atlas media lives under `app/assets/atlas/` after asset installation. No runtime path depends on the removed `phase2-app/` prototype directory.

Persisted postcards may contain legacy `/phase2-app/assets/` or `/phase2-assets/` paths. The desktop postcard exporter maps those read-only legacy paths to the consolidated Atlas directory.

## State

- Browser: `localStorage`.
- Electron and Codex plugin: `~/.itsees/travel-state-v1.json`.
- Exported earned postcards: `~/.itsees/postcards/`.

Writes to the shared state and postcard indexes are atomic. Storage migration normalizes older shapes without discarding valid collections or progress.

## Codex plugin

`plugins/itsees/runtime/app-src/` is a committed snapshot of the App rule modules. `pnpm plugin:sync` refreshes it and `pnpm plugin:validate` proves that the snapshot and MCP behavior match this release.
