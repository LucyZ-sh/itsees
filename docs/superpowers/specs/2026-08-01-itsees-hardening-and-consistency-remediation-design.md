# Itsees consistency and release-hardening remediation design

## Purpose

This change hardens the public Itsees beta without replacing its local-first architecture. It prevents stale App or Codex writes from silently erasing travel progress, gives daily check-ins a stable home time zone, documents live-weather data handling, establishes automated code gates, and removes confirmed low-risk release inconsistencies.

The audited release repository at `final-repos/itsees-app` is the acceptance target. Matching product source changes must also be applied to the original workspace source. The committed Codex plugin runtime remains a generated snapshot of the release App modules and must be refreshed with `pnpm plugin:sync`.

## Scope

Included:

- Cross-process travel-state locking, transactions, revisions, and conflict handling.
- Action-based persistence for core travel mutations shared by the App and MCP server.
- Stable home-time-zone daily boundaries and clock-rollback protection.
- A bilingual live-weather privacy policy and safe in-App access to it.
- Release signing/notarization configuration that distinguishes local beta builds from formal release builds.
- GitHub Actions code checks.
- Confirmed maintenance fixes: legacy User-Agent, duplicate plugin artwork, protocol scope, and repository-path hygiene.

Excluded:

- A CRDT or general-purpose JSON merge engine.
- Converting every UI preference and postcard-decoration edit to an action protocol in this iteration.
- Punitive anti-cheat logic or a requirement that the App remain open for travel to advance.
- Renaming the legacy localStorage key.
- Narrowing the supported pnpm range solely to match the preferred Corepack version.
- Hand-maintaining `.icns` and `.ico` files when electron-builder can derive them from the existing 1024 px source.
- Purchasing certificates, creating Apple or Windows developer accounts, or placing credentials in the repository.

## 1. Shared-state consistency

### 1.1 State metadata

The persisted root state gains:

- `revision`: a non-negative integer controlled only by the state store.
- `updatedAt`: the ISO timestamp of the last successful durable transaction.

Legacy saves migrate to revision `0`. Migration must preserve valid existing revision metadata. Every successful durable mutation increments the current on-disk revision exactly once. A rejected or no-op mutation does not increment it.

### 1.2 Cross-process lock

Electron and the MCP server use equivalent lock semantics around the same `travel-state-v1.json` file. Acquiring the lock creates an exclusive lock artifact only after its parent directory exists. Lock metadata includes a random ownership token, process ID, acquisition time, and last renewal time.

Waiting is asynchronous so Electron's main thread remains responsive. The normal critical section contains only read, migration, pure mutation, serialization, temporary-file write, and atomic rename. A lock is removed only if its token still matches the current owner. A stale lock can be reclaimed only after the lease timeout and a second ownership check; the timeout is deliberately much longer than a normal state transaction.

Failure to acquire the lock returns a bounded, actionable error. It never falls back to an unlocked write.

### 1.3 Transaction API

Both writers expose the same conceptual operation:

```text
updateState(mutator, { expectedRevision? })
  acquire lock
  read and migrate current disk state
  reject when expectedRevision does not match
  run mutator against the current state
  validate and persist the next state with revision + 1
  release lock
  return committed state or typed conflict
```

The implementation may remain CJS for Electron and ESM for the plugin, but their behavior and fixtures must be kept synchronized by tests. Atomic temporary-file replacement remains in place.

### 1.4 Core action protocol

The renderer sends semantic actions for operations that affect travel history, progress, postcards, souvenirs, or daily credit:

- start travel;
- recall travel;
- continue recalled travel;
- settle a due travel;
- dismiss a daily-credit notice when its sequence still matches.

The Electron main process loads the latest state inside the transaction and invokes the existing travel-engine pure functions. It returns the committed state and broadcasts it to all trusted Itsees windows.

The MCP server performs the same mutations inside `updateState`; it must not retain the old `loadState()` followed by an independent `saveState()` sequence. Automatic due-travel completion is also transactional.

### 1.5 Remaining snapshot writes

Non-core UI state may continue to use a snapshot temporarily, but the request must include the renderer's base revision. The main process commits only when it matches the latest revision. On conflict it returns the current state without writing.

The renderer must never automatically retry a rejected stale snapshot. It applies the returned current state and presents a brief non-blocking message explaining that another Itsees action updated the shared save. This favors an explicitly repeated UI preference over silent loss of postcards or travel progress.

The 500 ms watcher remains a notification mechanism, not a concurrency-control mechanism.

## 2. Time and daily check-ins

### 2.1 Home time zone

Daily-check-in state gains `homeTimeZone`, containing a valid IANA time-zone identifier. New saves use `Intl.DateTimeFormat().resolvedOptions().timeZone`, falling back to `UTC` if unavailable or invalid. Legacy saves acquire the current valid zone during migration.

`getLocalDateKey` accepts the home time zone and formats the calendar date in that zone. All daily status, credit, reset, active-window refresh, and migration paths must use the stored home zone rather than the process's transient local zone.

The settings UI shows the current daily-boundary zone and provides an explicit action to replace it with the device's current valid zone. Changing it does not grant an immediate second allowance: the current daily ledger remains active until the first date in the new zone that is later than its stored date. A backward or equal date never resets the ledger.

### 2.2 Clock rollback

Travel continues to use UTC wall-clock milliseconds so it advances while the App is closed or the computer sleeps. Each active session records `lastObservedAt` whenever a durable travel transaction occurs. Runtime progress is never allowed to fall below durable `accumulatedTravelMinutes`, credited minutes, or unlocked segments. Observing an earlier wall-clock time updates neither durable progress nor the daily window.

When a rollback larger than the accepted clock-skew tolerance is first observed, the engine records one bounded diagnostic analytics event. It does not punish the user, erase progress, or attempt an unreliable heartbeat-based anti-cheat scheme.

Large forward jumps remain capable of completing a local journey. This is an accepted limitation of an offline product with no authoritative server clock.

### 2.3 Expected return time

Whenever the daily window changes or a session is continued, `expectedReturnAt` is calculated from the same effective accumulated minutes used by the runtime view. It must never imply more remaining travel than the session's successful-minute limit.

## 3. Privacy

The website gains a self-contained bilingual privacy page. It states that live weather is opt-in; GeoJS receives the user's network request and provides approximate IP-derived location; rounded coordinates are sent to Open-Meteo; Itsees stores only normalized city/region/country/time-zone labels and the weather snapshot locally; raw coordinates are not persisted; and Itsees operates no intermediary weather server in the desktop flow.

The page explains how to disable live weather and identifies the third-party providers. `site-config.js` supplies a non-empty `privacyUrl`, causing the existing footer link to appear.

The App's weather settings expose the same policy through a desktop IPC action. The main process validates the IPC sender and opens only the exact configured HTTPS privacy origin/path with `shell.openExternal`. Arbitrary renderer-provided URLs are forbidden.

## 4. Distribution and trust

Unsigned public-beta copy remains truthful until a signed artifact exists. Checksums continue to provide corruption detection, but product copy must not imply they protect against compromise of the publishing account.

Formal macOS release configuration:

- no explicit `identity: null`;
- hardened runtime enabled;
- `mac.notarize: true`;
- `forceCodeSigning: true` for the formal release command;
- signing certificate and Apple notarization credentials supplied only through environment variables or CI secrets.

Local `dist:dir` and unsigned beta development remain possible through separate non-release scripts/configuration. Formal release must fail rather than silently emit an unsigned artifact. Windows signing is documented as a release prerequisite but is not represented as complete until a real certificate-backed build is verified.

## 5. CI and repository maintenance

GitHub Actions runs on pull requests and pushes to the default branch. The clean-checkout job installs the package-manager version declared in `packageManager`, installs dependencies with the lockfile, and runs:

- `pnpm test:code`;
- `pnpm repo:check`;
- a non-mutating plugin snapshot consistency check.

The workflow must not call the full asset-dependent test suite without first installing the external release asset pack. `assets:verify --status` may provide diagnostics but cannot be treated as a passing asset gate because it intentionally exits successfully when assets are absent.

Maintenance changes:

- Replace the fallback development proxy User-Agent with the current Itsees beta identity.
- Point plugin `composerIcon` and `logo` to one physical image and remove the duplicate file after validating the plugin manifest.
- Document that the legacy localStorage key is intentionally load-bearing.
- Keep `packageManager` as the reproducible default and `engines.pnpm` as the compatibility range.
- Keep the 1024 px PNG packaging source; generated platform icon output remains build output.
- Restrict `itsees://app/` file serving to explicit production roots and files required by the renderer, media, and postcard export. Requests for desktop source, package metadata, tests, or repository files return 404. Existing byte-range audio behavior remains covered.
- Replace the author-specific hygiene literal with deterministic generic detection for macOS and Windows user-home absolute paths. Keep a narrow, documented allowlist for deliberate portable test fixtures such as `/Users/example`; do not exempt product source or documentation broadly.

Static canonical and JSON-LD URLs remain literal HTML metadata because crawlers cannot depend on runtime JavaScript. Runtime links remain centralized in site configuration.

## 6. Synchronization strategy

The final repository is the release acceptance target. For every product source change, apply the equivalent edit in the original workspace source. After App rule-module changes, run the plugin sync command in both relevant trees so `plugins/itsees/runtime/app-src/` exactly matches `app/src/`.

New release-only files such as the privacy page, workflow, and release configuration belong in the final repository; equivalent source templates or documentation are added to the original workspace only where that workspace already owns the corresponding surface. Generated `dist/` output is never hand-edited.

## 7. Error handling and recovery

- Lock timeouts and state conflicts return distinct errors.
- Invalid or oversized state remains rejected under the existing 16 MiB limit.
- A failed temporary write leaves the previous state intact and releases only the caller's lock.
- A conflict returns the latest migrated state so the UI can recover immediately.
- Corrupt JSON is not overwritten automatically by a mutation; the existing fallback behavior is limited to browser-local migration and explicit recovery paths.
- Existing save files remain readable without manual migration.

## 8. Verification

Automated tests must cover:

- two child processes performing additive transactions without lost records;
- monotonically increasing revisions and rejection of stale expected revisions;
- lock ownership, timeout, and stale-lock recovery;
- MCP start, recall, continue, and automatic completion under the transaction API;
- App core actions applying to the latest on-disk state;
- renderer snapshot conflict recovery without a second write;
- legacy save migration to a valid home time zone;
- a device time-zone change that does not change the daily key;
- explicit home-zone update without duplicate daily credit;
- clock rollback without progress loss;
- expected-return consistency after a daily-window change;
- privacy-link visibility and exact external-URL allowlisting;
- protocol rejection of repository and desktop source files;
- plugin manifest validity after artwork deduplication;
- release configuration requiring signing only for formal release builds.

Final verification commands:

```bash
pnpm test:code
pnpm repo:check
pnpm plugin:validate
pnpm assets:verify
pnpm test
pnpm dist:dir
```

Full asset and packaging commands run only where the required external assets are installed. A missing asset pack is reported as an environmental limitation, not disguised as a passing test.

## Acceptance criteria

- No stale App or MCP snapshot can overwrite a newer shared save.
- Concurrent core travel actions are serialized against the latest persisted state.
- Existing saves migrate without losing travel, album, souvenir, setting, or daily-credit data.
- Temporary system time-zone changes cannot grant a second daily allowance.
- Clock rollback cannot reduce durably accumulated or credited travel progress, remove unlocked segments, or reset the daily ledger backward.
- Users can read an accurate privacy policy before or after enabling live weather.
- Clean Git checkouts receive an automated code-quality gate.
- The custom protocol no longer exposes unrelated packaged source paths.
- Local development remains possible without signing credentials, while formal release cannot silently produce an unsigned build.
