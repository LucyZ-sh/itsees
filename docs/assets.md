# Asset delivery

Large runtime media is excluded from public Git source. Plaintext packages are stored only in the private maintainer repository; public users receive encrypted media inside the DMG.

## Packages

- `itsees-core-assets-v1.tar`: Phase 1 WebP media, maps, pets, pack items, and souvenirs.
- `itsees-atlas-assets-v1.tar`: only the 15 production Atlas destinations and their referenced image-world media.
- `itsees-music-assets-v1.tar`: 210 local MP3 tracks.

`assets/asset-manifest.json` is the canonical path, byte-size, and SHA-256 list.

## Install and verify

This workflow is restricted to authorized maintainers with access to the private Runtime Assets Release.

```bash
pnpm assets:install -- --source ../release-assets
pnpm assets:status
pnpm assets:verify
```

Installation extracts into a same-filesystem staging directory, rejects unsafe archive paths and links, verifies every file, then replaces complete target directories. Existing complete assets are restored if installation fails.

Successful installation records the music root in `~/.itsees/assets-v1.json` so the separate Codex Skin can find it.

## Rebuild local packages

From a maintainer workspace containing the audited original assets:

```bash
SOURCE_WORKSPACE=/absolute/path/to/audited-source
pnpm assets:build -- --source "$SOURCE_WORKSPACE" --output ../release-assets
```

## Release boundary

Read `release-assets/provenance.json` before every build. Plaintext Core, Atlas, and Music packages must never be uploaded to the public repository, public Actions artifacts, or a public GitHub Release. The public Release may contain only the final encrypted DMG. Build keys, signing credentials, and plaintext packages remain private.
