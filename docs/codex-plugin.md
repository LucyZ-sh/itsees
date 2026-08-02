# Codex plugin

## Local installation

Register this repository as a Codex marketplace and install the bundled plugin:

```bash
codex plugin marketplace add .
codex plugin add itsees@itsees-app
```

The marketplace source stays on this repository, while Codex installs a versioned runtime copy in
its managed plugin cache.

The plugin in `plugins/itsees/` lets Codex inspect and control the same local journey state as the Electron App.

## Capabilities

- Read pet, journey, allowance, destinations, pack items, postcards, souvenirs, and history.
- Start, recall, or continue a journey.
- Display only postcards already earned and exported by the App.
- Open the Itsees App.

## Development

```bash
pnpm plugin:sync
pnpm plugin:validate
```

The plugin refuses state-changing travel actions until the shared state file has been initialized by the App. This prevents a new plugin install from overwriting an older browser-only save.

The MCP server reads `ITSEES_STATE_PATH` only for isolated tests; normal use reads `~/.itsees/travel-state-v1.json`.
