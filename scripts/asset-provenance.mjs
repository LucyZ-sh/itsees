export const ASSET_PROVENANCE = Object.freeze({
  schema: "itsees-asset-provenance/1",
  version: "v1",
  groups: [
    {
      package: "core",
      sourceType: "project_generated_and_authored",
      source: "Itsees source workspace runtime derivatives",
      externalReferences: "Concept research files are excluded from the release packages.",
      rightsBasis: "Lucy Zhang confirmed that the Core artwork was authored by her or generated through accounts she controls, and that no downloaded photos, stock-library media, third-party character IP, or third-party music is directly included.",
      redistribution: "confirmed",
      confirmedBy: "Lucy Zhang",
      confirmedAt: "2026-08-01",
      notes: "Covers Phase 1 themes, maps, pets, pack items, souvenirs, and their runtime derivatives."
    },
    {
      package: "atlas",
      sourceType: "project_generated",
      source: "Original project-generated landmark illustrations",
      externalReferences: "Wikimedia and Wikipedia materials were used for landmark research only; the reference-photo directories are excluded from the application and release packages.",
      rightsBasis: "Lucy Zhang confirmed that the distributed Atlas illustrations were generated through accounts she controls or authored by her and may be publicly redistributed with Itsees.",
      redistribution: "confirmed",
      confirmedBy: "Lucy Zhang",
      confirmedAt: "2026-08-01",
      notes: "The release contains project illustrations, not the Wikimedia research photographs."
    },
    {
      package: "music",
      sourceType: "generated_audio",
      source: "ChatCut-generated weather background music",
      externalReferences: "No third-party audio files are directly included. ChatCut describes generated music as original, royalty-free, and safe to publish: https://chatcut.io/features/ai-music (reviewed 2026-08-01).",
      rightsBasis: "Lucy Zhang confirmed that all 210 distributed tracks were generated through an account she controls using ChatCut and contain no directly included third-party music.",
      redistribution: "confirmed",
      confirmedBy: "Lucy Zhang",
      confirmedAt: "2026-08-01",
      notes: "Covers 30 destinations and seven normalized weather selections per destination."
    }
  ]
});
