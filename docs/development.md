# Development

## Setup

Public code-only setup:

```bash
pnpm install
pnpm test:code
```

Authorized maintainer setup with packages downloaded from the private Runtime Assets Release:

```bash
pnpm install
pnpm assets:install -- --source ../release-assets
```

## Checks

```bash
pnpm test:code
pnpm assets:verify
pnpm test
pnpm plugin:validate
pnpm repo:check
```

`test:code` is suitable for GitHub Actions because it does not require unpublished media. The full suite verifies runtime media as well as logic.

## Source rules

- Keep browser imports relative and compatible with static serving.
- Add desktop capabilities through preload plus an allowlisted main-process handler.
- Update `createInitialState()` and storage migration together when the state shape changes.
- Update the plugin runtime after changing App rule modules.
- Do not commit installed runtime assets, generated packages, build keys, signing credentials, build output, caches, or experiments to the public repository.

## Local server

```bash
pnpm serve
```

The server exposes only the consolidated `app/` tree plus tightly scoped weather proxy routes.
