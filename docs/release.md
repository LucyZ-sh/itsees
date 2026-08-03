# Release

## Required checks

Run these checks only from the private maintainer workspace after downloading the authorized private asset packages:

```bash
pnpm install --frozen-lockfile
pnpm assets:install -- --source ../release-assets
pnpm assets:verify
pnpm music-packs:build
pnpm test
pnpm plugin:validate
pnpm repo:check
pnpm dist:dir
pnpm package:verify-music
```

Smoke the unpacked application before producing platform installers.

## Platform packages

```bash
pnpm dist:mac
pnpm dist:win
```

The macOS build is unsigned unless a signing identity is configured. A complete Windows NSIS installer is most reliable on Windows or CI; `pnpm dist:win:dir` verifies the Windows x64 unpacked tree.

## GitHub source

The Git repository contains code, documentation, manifests, and small brand assets only. Confirm that no tracked file exceeds 50 MiB and that the worktree is clean.

## GitHub Release assets

The public Release contains only the encrypted DMG. Never upload plaintext Core, Atlas, or Music packages, build keys, checksums for private packages, or signing credentials. Private Runtime Assets Release access is restricted to authorized maintainers.

Publish the encrypted `music-packs-v1` track assets before the application Release. Confirm that a current-weather track can be downloaded, decrypted, and played byte-for-byte before enabling the website download link for the new version.
