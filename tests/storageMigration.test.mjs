import assert from "node:assert/strict";
import test from "node:test";
import { migrateState } from "../app/src/storage.js";

test("legacy Phase 1 saves retain progress, collections, and nested pet position", () => {
  const legacy = {
    version: 1,
    selectedThemeId: "T08",
    settings: {
      petPosition: { x: 412 },
      selectedPetId: "lop-rabbit",
      hasChosenPet: true,
      isPaused: true
    },
    themeProgress: {
      T01: {
        themeId: "T01",
        progressPercent: 100,
        coloredSegmentIds: Array.from({ length: 12 }, (_, index) => `T01-M${String(index + 1).padStart(2, "0")}`),
        isFullyColored: true
      }
    },
    travels: [{ id: "old-travel", themeId: "T01", status: "completed" }],
    album: [{ id: "old-card", themeId: "T01", sceneId: "T01-S12" }],
    souvenirCounts: { "T01-SV01": 2 }
  };

  const migrated = migrateState(legacy);

  assert.equal(migrated.version, 10);
  assert.equal(migrated.settings.hasCompletedOnboarding, true);
  assert.equal(migrated.settings.backgroundMusicEnabled, false);
  assert.equal(migrated.settings.hasChosenBackgroundMusic, false);
  assert.equal(migrated.dailyCheckin.usedMinutes, 0);
  assert.equal(migrated.selectedThemeId, "T08");
  assert.deepEqual(migrated.settings.petPosition, { x: 412, y: 28 });
  assert.equal(migrated.settings.isPaused, true);
  assert.equal(migrated.themeProgress.T01.isFullyColored, true);
  assert.equal(migrated.travels[0].phase, 1);
  assert.equal(migrated.travels[0].destinationId, "T01");
  assert.equal(migrated.album[0].phase, 1);
  assert.equal(migrated.album[0].destinationId, "T01");
  assert.deepEqual(migrated.album[0].decorations, []);
  assert.equal(migrated.souvenirCounts["T01-SV01"], 2);
  assert.equal(migrated.souvenirAcquisitions.length, 2);
  assert.equal(migrated.souvenirAcquisitions.every(item => item.destinationId === "T01"), true);
  assert.equal(migrated.souvenirAcquisitions.every(item => item.isLegacy), true);
  assert.deepEqual(migrated.atlasProgress, {});
  assert.ok(migrated.enabledFeaturePackIds.includes("phase1-backpack"));
});

test("migration normalizes valid decorations and discards malformed entries", () => {
  const migrated = migrateState({
    album: [{
      id: "postcard-1",
      themeId: "T01",
      sceneId: "T01-S01",
      decorations: [
        {
          id: "decoration-1",
          souvenirId: "T01-SV01",
          x: 1.4,
          y: -0.2,
          scale: 3,
          rotation: -40,
          zIndex: -2,
          createdAt: "2026-07-11T08:00:00.000Z"
        },
        { id: "missing-souvenir" }
      ]
    }]
  });

  assert.deepEqual(migrated.album[0].decorations, [{
    id: "decoration-1",
    postcardId: "postcard-1",
    souvenirId: "T01-SV01",
    x: 1,
    y: 0,
    scale: 2,
    rotation: -40,
    zIndex: 0,
    createdAt: "2026-07-11T08:00:00.000Z"
  }]);
});

test("migration repairs malformed collection fields without discarding valid settings", () => {
  const migrated = migrateState({
    version: 1,
    settings: { notificationsEnabled: false },
    selectedItemIds: null,
    travels: "broken",
    album: null,
    souvenirCounts: [],
    themeProgress: null
  });

  assert.equal(migrated.settings.notificationsEnabled, false);
  assert.deepEqual(migrated.selectedItemIds, ["food-riceball", "tool-camera"]);
  assert.deepEqual(migrated.travels, []);
  assert.deepEqual(migrated.album, []);
  assert.deepEqual(migrated.souvenirCounts, {});
  assert.deepEqual(migrated.souvenirAcquisitions, []);
  assert.deepEqual(migrated.themeProgress, {});
});

test("an interrupted current onboarding remains resumable after reload", () => {
  const migrated = migrateState({
    version: 8,
    settings: {
      selectedPetId: "corgi",
      hasChosenPet: true,
      hasCompletedOnboarding: false,
      liveWeatherEnabled: false,
      hasGrantedLiveWeatherConsent: false
    }
  });

  assert.equal(migrated.settings.selectedPetId, "corgi");
  assert.equal(migrated.settings.hasChosenPet, true);
  assert.equal(migrated.settings.hasCompletedOnboarding, false);
  assert.equal(migrated.settings.liveWeatherEnabled, false);
});

test("legacy users receive one music choice while completed music preferences persist", () => {
  const legacy = migrateState({
    version: 8,
    settings: {
      selectedPetId: "corgi",
      hasChosenPet: true,
      hasCompletedOnboarding: true
    }
  });
  assert.equal(legacy.settings.hasCompletedOnboarding, true);
  assert.equal(legacy.settings.hasChosenBackgroundMusic, false);
  assert.equal(legacy.settings.backgroundMusicEnabled, false);
  assert.equal(legacy.settings.backgroundMusicDestinationId, null);

  const chosen = migrateState({
    version: 9,
    settings: {
      selectedPetId: "corgi",
      hasChosenPet: true,
      hasCompletedOnboarding: true,
      hasChosenBackgroundMusic: true,
      backgroundMusicEnabled: true,
      backgroundMusicDestinationId: "T03"
    }
  });
  assert.equal(chosen.settings.hasChosenBackgroundMusic, true);
  assert.equal(chosen.settings.backgroundMusicEnabled, true);
  assert.equal(chosen.settings.backgroundMusicDestinationId, "T03");
});

test("migration rebuilds souvenir acquisitions from travel results without duplicates", () => {
  const saved = {
    version: 2,
    souvenirCounts: { fr_paris_eiffel_brass_charm: 1 },
    travels: [{
      id: "paris-trip",
      phase: 2,
      landmarkId: "fr_paris",
      completedAt: "2026-07-13T08:00:00.000Z",
      result: {
        souvenirIds: ["fr_paris_eiffel_brass_charm"],
        createdAt: "2026-07-13T08:00:00.000Z"
      }
    }]
  };

  const migrated = migrateState(saved);
  const migratedAgain = migrateState(migrated);

  assert.deepEqual(migrated.souvenirAcquisitions, [{
    id: "acquisition-paris-trip-fr_paris_eiffel_brass_charm",
    souvenirId: "fr_paris_eiffel_brass_charm",
    travelId: "paris-trip",
    phase: 2,
    destinationId: "fr_paris",
    acquiredAt: "2026-07-13T08:00:00.000Z",
    rarity: "common",
    isLegacy: false
  }]);
  assert.deepEqual(migratedAgain.souvenirAcquisitions, migrated.souvenirAcquisitions);
});

test("migration repairs missing postcards from completed Phase 1 map progress", () => {
  const coloredSegmentIds = Array.from(
    { length: 12 },
    (_, index) => `T01-M${String(index + 1).padStart(2, "0")}`
  );
  const migrated = migrateState({
    version: 5,
    themeProgress: {
      T01: {
        themeId: "T01",
        progressPercent: 100,
        coloredSegmentIds,
        isFullyColored: true,
        lastTravelId: "legacy-complete-T01",
        updatedAt: "2026-07-17T14:00:00.000Z"
      }
    },
    travels: [],
    album: []
  });

  assert.equal(migrated.album.length, 12);
  assert.equal(new Set(migrated.album.map(card => card.sceneId)).size, 12);
  assert.equal(migrated.album.every(card => card.themeId === "T01"), true);
  assert.equal(migrated.album.every(card => card.completionReason === "full_cycle"), true);
  assert.equal(migrated.album.some(card => card.id === "recovered-postcard-T01-T01-S12"), true);
  assert.equal(migrated.souvenirAcquisitions.length, 2);
  assert.equal(migrated.souvenirAcquisitions.every(item => item.destinationId === "T01"), true);
  assert.equal(Object.values(migrated.souvenirCounts).reduce((sum, count) => sum + count, 0), 2);
});

test("migration repairs the completed-all-routes state when its souvenir cabinet is empty", () => {
  const completedAt = "2026-07-21T01:53:41.000Z";
  const themeProgress = Object.fromEntries(
    Array.from({ length: 15 }, (_, index) => {
      const themeId = `T${String(index + 1).padStart(2, "0")}`;
      return [themeId, {
        themeId,
        progressPercent: 100,
        coloredSegmentIds: Array.from(
          { length: 12 },
          (_, segmentIndex) => `${themeId}-M${String(segmentIndex + 1).padStart(2, "0")}`
        ),
        isFullyColored: true,
        lastTravelId: `legacy-complete-${themeId}`,
        updatedAt: completedAt
      }];
    })
  );

  const migrated = migrateState({
    version: 6,
    themeProgress,
    travels: [],
    album: [],
    souvenirCounts: {},
    souvenirAcquisitions: []
  });
  const migratedAgain = migrateState(migrated);

  assert.equal(migrated.album.length, 180);
  assert.equal(migrated.souvenirAcquisitions.length, 30);
  assert.equal(Object.values(migrated.souvenirCounts).reduce((sum, count) => sum + count, 0), 30);
  for (const themeId of Object.keys(themeProgress)) {
    const themeAcquisitions = migrated.souvenirAcquisitions.filter(item =>
      item.phase === 1 && item.destinationId === themeId
    );
    assert.equal(themeAcquisitions.length, 2, themeId);
    assert.equal(
      themeAcquisitions.every(item => item.souvenirId.startsWith(`${themeId}-SV`)),
      true,
      `${themeId} must recover only route-specific souvenirs`
    );
  }
  assert.deepEqual(migratedAgain.souvenirAcquisitions, migrated.souvenirAcquisitions);
  assert.deepEqual(migratedAgain.souvenirCounts, migrated.souvenirCounts);
});

test("migration rebuilds a missing postcard from a completed travel result", () => {
  const migrated = migrateState({
    version: 5,
    travels: [{
      id: "travel-with-result",
      phase: 1,
      themeId: "T02",
      destinationId: "T02",
      status: "completed",
      completionReason: "full_cycle",
      progressPercent: 100,
      completedAt: "2026-07-17T13:00:00.000Z",
      result: {
        postcardId: "postcard-from-result",
        sceneId: "T02-S12",
        sceneImageAsset: "./assets/themes/T02/scenes/T02-S12.webp",
        title: "山间车站完整明信片",
        sceneName: "终点小站",
        message: "它在最小的小站，也收到了很大的远方。",
        createdAt: "2026-07-17T13:00:00.000Z",
        mapProgressPercent: 100,
        rarity: "rare",
        souvenirIds: []
      }
    }],
    album: []
  });

  assert.equal(migrated.album.length, 12);
  assert.equal(migrated.album.some(card => card.id === "postcard-from-result"), true);
  assert.equal(migrated.album.every(card => card.travelId === "travel-with-result"), true);
  assert.equal(migrated.album.every(card => card.destinationId === "T02"), true);
  assert.equal(new Set(migrated.album.map(card => card.sceneId)).size, 12);
});

test("migration replaces only mismatched Phase 1 souvenirs and preserves Phase 2 ownership", () => {
  const mismatchedSouvenirId = "fr_paris_eiffel_brass_charm";
  const acquiredAt = "2026-07-22T08:00:00.000Z";
  const saved = {
    version: 9,
    souvenirCounts: { [mismatchedSouvenirId]: 2 },
    souvenirAcquisitions: [
      {
        id: "phase1-acquisition-kept",
        souvenirId: mismatchedSouvenirId,
        travelId: "phase1-trip",
        phase: 1,
        destinationId: "T08",
        acquiredAt,
        rarity: "common",
        isLegacy: false
      },
      {
        id: "phase2-acquisition-kept",
        souvenirId: mismatchedSouvenirId,
        travelId: "phase2-trip",
        phase: 2,
        destinationId: "fr_paris",
        acquiredAt,
        rarity: "common",
        isLegacy: false
      }
    ],
    travels: [
      {
        id: "phase1-trip",
        phase: 1,
        themeId: "T08",
        destinationId: "T08",
        status: "completed",
        completedAt: acquiredAt,
        result: {
          souvenirIds: [mismatchedSouvenirId],
          createdAt: acquiredAt
        }
      },
      {
        id: "phase2-trip",
        phase: 2,
        landmarkId: "fr_paris",
        destinationId: "fr_paris",
        status: "completed",
        completedAt: acquiredAt,
        result: {
          souvenirIds: [mismatchedSouvenirId],
          createdAt: acquiredAt
        }
      }
    ],
    album: [
      {
        id: "phase1-card",
        phase: 1,
        themeId: "T08",
        sceneId: "T08-S01",
        decorations: [{
          id: "phase1-decoration",
          souvenirId: mismatchedSouvenirId,
          x: 0.25,
          y: 0.75,
          scale: 1.4,
          rotation: 32,
          zIndex: 3,
          createdAt: acquiredAt
        }]
      },
      {
        id: "phase2-card",
        phase: 2,
        landmarkId: "fr_paris",
        sceneId: "fr_paris-S01",
        decorations: [{
          id: "phase2-decoration",
          souvenirId: mismatchedSouvenirId,
          x: 0.4,
          y: 0.6,
          scale: 1.1,
          rotation: -12,
          zIndex: 2,
          createdAt: acquiredAt
        }]
      }
    ]
  };

  const migrated = migrateState(saved);
  const migratedAgain = migrateState(migrated);
  const phase1Acquisition = migrated.souvenirAcquisitions.find(item =>
    item.id === "phase1-acquisition-kept"
  );
  const phase2Acquisition = migrated.souvenirAcquisitions.find(item =>
    item.id === "phase2-acquisition-kept"
  );
  const phase1Card = migrated.album.find(card => card.id === "phase1-card");
  const phase2Card = migrated.album.find(card => card.id === "phase2-card");

  assert.equal(migrated.version, 10);
  assert.equal(migrated.souvenirAcquisitions.length, 2);
  assert.match(phase1Acquisition.souvenirId, /^T08-SV\d{2}$/);
  assert.equal(phase2Acquisition.souvenirId, mismatchedSouvenirId);
  assert.deepEqual(migrated.travels[0].result.souvenirIds, [phase1Acquisition.souvenirId]);
  assert.deepEqual(migrated.travels[1].result.souvenirIds, [mismatchedSouvenirId]);
  assert.equal(migrated.souvenirCounts[phase1Acquisition.souvenirId], 1);
  assert.equal(migrated.souvenirCounts[mismatchedSouvenirId], 1);
  assert.deepEqual(
    {
      ...phase1Card.decorations[0],
      souvenirId: undefined
    },
    {
      id: "phase1-decoration",
      postcardId: "phase1-card",
      souvenirId: undefined,
      x: 0.25,
      y: 0.75,
      scale: 1.4,
      rotation: 32,
      zIndex: 3,
      createdAt: acquiredAt
    }
  );
  assert.match(phase1Card.decorations[0].souvenirId, /^T08-SV\d{2}$/);
  assert.equal(phase2Card.decorations[0].souvenirId, mismatchedSouvenirId);
  assert.deepEqual(migratedAgain.souvenirAcquisitions, migrated.souvenirAcquisitions);
  assert.deepEqual(migratedAgain.souvenirCounts, migrated.souvenirCounts);
  assert.deepEqual(migratedAgain.travels, migrated.travels);
  assert.deepEqual(migratedAgain.album, migrated.album);
});

test("migration also normalizes recalled sessions outside the travel history array", () => {
  const oldSouvenirId = "eg_giza_pyramids_papyrus_bookmark";
  const recalled = {
    id: "recalled-only-trip",
    phase: 1,
    themeId: "T03",
    destinationId: "T03",
    status: "recalled",
    completedAt: "2026-07-22T12:00:00.000Z",
    result: {
      souvenirIds: [oldSouvenirId],
      createdAt: "2026-07-22T12:00:00.000Z"
    }
  };

  const migrated = migrateState({
    version: 9,
    activeTravel: recalled,
    lastRecalledTravel: recalled,
    travels: [],
    souvenirCounts: { [oldSouvenirId]: 1 },
    souvenirAcquisitions: []
  });

  assert.match(migrated.activeTravel.result.souvenirIds[0], /^T03-SV\d{2}$/);
  assert.deepEqual(
    migrated.lastRecalledTravel.result.souvenirIds,
    migrated.activeTravel.result.souvenirIds
  );
  assert.equal(migrated.souvenirAcquisitions.length, 1);
  assert.equal(
    migrated.souvenirAcquisitions[0].souvenirId,
    migrated.activeTravel.result.souvenirIds[0]
  );
  assert.equal(migrated.souvenirCounts[oldSouvenirId], undefined);
});
