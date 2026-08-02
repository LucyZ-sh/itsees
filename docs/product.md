# Product scope

## Core loop

The user chooses a pet, destination, food, and tool. A journey progresses against real elapsed time and returns map progress, postcards, and souvenirs.

## Phase 1

- 15 illustrated themes.
- 12 segments per theme.
- One segment per 20 successful minutes.
- 240 minutes for a complete journey.

## Phase 2

- 15 real destinations in five categories.
- Four image-world subscenes per destination.
- One segment per 60 successful minutes.
- Phase 2 unlocks after all Phase 1 themes are complete.

## Shared rules

- Both phases share one 240-minute successful check-in allowance per local calendar day.
- Recalling before the first segment preserves elapsed progress but creates no postcard and consumes no successful allowance.
- Recalled journeys can continue without losing progress.
- State remains local. Browser mode uses `localStorage`; Electron and the Codex plugin share `~/.itsees/travel-state-v1.json`.

Phase 3 social commerce, Phase 4 time travel, world-model experiments, and design demos are outside this repository.
