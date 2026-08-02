# Itsees hardening and consistency remediation implementation plan

Design: `docs/superpowers/specs/2026-08-01-itsees-hardening-and-consistency-remediation-design.md`

## Task 1: Transactional shared state

- Extend the Electron state store with revision metadata, an asynchronous owned lease lock, CAS writes, and an `update` transaction.
- Add the equivalent MCP state-file module and route every MCP mutation, including due completion, through a transaction.
- Preserve synchronous read/watch compatibility for existing Electron startup behavior.
- Add child-process concurrency, stale revision, ownership, and stale-lock tests.

## Task 2: Renderer conflict safety and core travel actions

- Extend preload IPC with travel actions and privacy opening.
- Implement trusted main-process handlers that apply travel-engine operations to the latest state in a transaction.
- Include base revision in remaining snapshot writes; return typed success/conflict results.
- Update renderer persistence to consume committed states, apply conflicts without retrying, and show a non-blocking conflict notice.
- Route start, recall, continue, and due completion through actions when running in Electron; keep browser-only behavior unchanged.

## Task 3: Stable home time zone

- Extend daily state migration with a validated home IANA time zone.
- Compute daily keys in that zone and only advance ledgers to later date keys.
- Thread the home zone through engine, storage, App, and plugin snapshot call sites.
- Add settings display/update behavior and protect durable progress from clock rollback.
- Add migration, time-zone-switch, backward-date, and expected-return tests.

## Task 4: Privacy and protocol hardening

- Add a bilingual static privacy page and configure the website footer URL.
- Add a weather-settings policy action using exact allowlisted external navigation.
- Restrict the custom protocol to production renderer/media roots and explicit brand files while preserving audio ranges.
- Add privacy, external URL, and protocol-scope tests.

## Task 5: Release and repository maintenance

- Add separate formal signed-release scripts/configuration without breaking local unsigned builds.
- Add GitHub Actions clean-checkout code gates.
- Update the fallback User-Agent, deduplicate plugin artwork, document the legacy storage key, and generalize repository path hygiene with fixture exceptions.
- Update release documentation so checksums are described as integrity rather than publisher-compromise protection.

## Task 6: Synchronization and verification

- Apply matching source changes to the original workspace.
- Run plugin sync in both trees and validate snapshot equality.
- Run focused tests after each subsystem, then `test:code`, `repo:check`, `plugin:validate`, full asset tests, and `dist:dir` where assets and signing mode permit.
- Review the final diff for unrelated files, generated output, secrets, and accidental asset changes.
