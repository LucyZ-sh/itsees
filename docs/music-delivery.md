# Background music delivery

Itsees preserves the original MP3 bytes and divides music delivery into two tiers.

## Included with the application

The installer contains all seven original tracks for `T01`, `T02`, and `T03` (21 tracks total). Release builds fail if any other destination music enters the protected application bundle.

## Downloaded on first destination interaction

`T04`–`T15` and all 15 Phase 2 destinations are represented by encrypted, individually authenticated track assets in the `music-packs-v1` GitHub Release. The first click that selects a destination starts its download without blocking navigation:

1. Download the current weather track first (normally about 6 MiB).
2. Mark the destination playable and fade in that track.
3. Download that destination's `DEFAULT` track next.
4. Download the remaining weather tracks sequentially in the background.

If the current weather track fails, the destination's own `DEFAULT` track is attempted. There is no global fallback track and music from another destination is never substituted. When neither track is available, the destination remains silent while the route itself continues to work.

## Integrity, cache, and privacy

- Every remote track is AES-256-GCM encrypted and has encrypted and plaintext SHA-256 values in `app/music-packs-manifest.json`.
- Decrypted MP3 bytes must match the original source SHA-256 exactly; no transcoding or quality change is permitted.
- Encrypted files are cached in Electron `userData/music-cache/v1` with a 500 MiB limit.
- Cache eviction removes least-recently-used tracks outside the currently downloaded destination.
- Settings shows the current cache size and provides a clear-cache action.
- Downloads are restricted to the pinned HTTPS GitHub Release host and the manifest's destination/weather allowlist.

## Release commands

From the private maintainer repository:

```bash
pnpm music-packs:build
pnpm assets:protect
pnpm package:verify-music
pnpm dist:dir
```

Upload the generated files from `../release-assets/music-packs-v1/` to the immutable `music-packs-v1` GitHub Release before publishing an application version that references them.
