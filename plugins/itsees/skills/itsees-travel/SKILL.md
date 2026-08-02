---
name: itsees-travel
description: Control and inspect the local Itsees desktop pet travel experience through Codex. Use when the user asks about their Itsees pet, current journey or progress, available destinations or pack items, starting or recalling travel, continuing a recalled journey, listing or directly displaying postcard images, souvenirs, travel history, or opening the Itsees app.
---

# Itsees Travel

Use the Itsees MCP tools to operate the same local travel state as the separately installed Electron app.

## Workflow

1. Call `itsees_get_status` before changing a journey unless the current status was already read in this turn.
2. Resolve destination ids with `itsees_list_destinations`; never guess an id from a display name.
3. Resolve optional food and tool ids with `itsees_list_pack_items`.
4. Call only the mutation matching the user's stated intent:
   - `itsees_start_travel` for a new journey.
   - `itsees_recall_travel` to bring back a currently traveling pet.
   - `itsees_continue_travel` to resume the last recalled journey.
5. Summarize the confirmed tool result. Do not claim progress, postcards, or souvenirs that the tool did not return.

## Travel rules

- A full journey lasts 240 minutes.
- Phase 1 unlocks one map segment every 20 minutes.
- Phase 2 unlocks one map segment every 60 minutes and remains unavailable until Phase 1 is complete.
- Both phases share a 240-minute successful check-in budget per local calendar day.
- Recalling before the first segment preserves partial elapsed progress but adds no postcard and consumes no successful check-in budget.
- Starting, recalling, and continuing are state-changing actions. Do not call them merely to demonstrate the plugin.
- Reading status, destinations, pack items, or collections is safe without confirmation.

## Collections

Use `itsees_list_collection` with `postcards`, `souvenirs`, or `history`. Keep the requested limit small unless the user asks for a broad inventory.

Use `itsees_show_postcards` when the user asks to see, show, display, preview, or open postcard images. Omit `postcard_ids` to display the newest postcard, or resolve ids with `itsees_list_collection` before displaying specific cards. If the tool reports that an image has not been exported, ask the user to open the updated Itsees App once and retry. Do not claim to have visually inspected a postcard unless the tool returned an image.
