# Repository audit

This final repository was assembled from an explicit production allowlist. The original working
directory was preserved.

## Retained

- Phase 1 and integrated Phase 2 application modules in `app/`.
- Electron main/preload processes and the shared atomic travel-state store.
- The Itsees Codex conversational plugin under `plugins/itsees/`.
- Active automated tests, packaging configuration, CI, and asset delivery tooling.
- Small brand artwork required before external media packs are installed.

## Consolidated

- The standalone Phase 2 atlas was folded into the main App routes.
- Production Atlas media now uses `app/assets/atlas/`.
- Browser, Electron postcard export, tests, and package inclusion share that canonical location.
- Theme media uses runtime WebP derivatives; source PNG generation inputs are not shipped.

## Excluded from the final repository

- Standalone Phase 2 demos and redirects.
- Three.js/GLB world-model prototypes and vendored demo libraries.
- Tencent AI3D experiments, local inputs/outputs, and API notes.
- Design explorations, acceptance screenshots, QA crops, backups, and temporary batches.
- Generated `dist/`, caches, `node_modules/`, and local state.
- Phase 3/4 roadmap documents and unimplemented product specifications.
- Large runtime media, whose plaintext checksummed packages are retained only in the private maintainer repository and delivered publicly only inside the encrypted DMG.

## Verification gates

- `pnpm test:code` verifies the Git-only checkout.
- `pnpm assets:verify && pnpm test` verifies the installed production media matrix.
- `pnpm plugin:validate` verifies the bundled plugin snapshot and MCP surface.
- `pnpm repo:check` rejects legacy trees, machine-specific paths, symlinks, and files over 50 MiB.
- `pnpm dist:dir` verifies Electron packaging before platform installers are built.
