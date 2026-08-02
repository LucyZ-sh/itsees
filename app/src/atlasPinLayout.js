import { projectAtlasCoordinate } from "./atlasMapProjection.js";

// The illustrated atlas keeps the real-world ordering but is intentionally
// painterly rather than a mathematically exact coastline projection. These
// presentation-only anchors align each real coordinate with the painted land.
// Travel/content data continues to use the untouched latitude and longitude.
const ILLUSTRATED_MAP_POINTS = Object.freeze({
  us_hawaii: { x: 5.6, y: 39 },
  us_grand_canyon: { x: 19, y: 34 },
  amazon_rainforest: { x: 32, y: 52 },
  fr_paris: { x: 51.3, y: 26.6 },
  no_norway_coast: { x: 54.2, y: 15 },
  eu_alps: { x: 53.8, y: 28.2 },
  it_tuscany: { x: 53.7, y: 30.7 },
  it_amalfi: { x: 54, y: 33 },
  eg_giza_pyramids: { x: 56.5, y: 38.8 },
  gr_greek_islands: { x: 57.3, y: 33.1 },
  tz_serengeti: { x: 60.4, y: 52.8 },
  in_taj_mahal: { x: 75, y: 41.8 },
  cn_great_wall: { x: 83.8, y: 31.2 },
  cn_hong_kong: { x: 81.2, y: 42.2 },
  jp_tokyo: { x: 87.2, y: 34.5 }
});

export function getAtlasPinPoint(destination) {
  return ILLUSTRATED_MAP_POINTS[destination.id]
    ?? projectAtlasCoordinate(destination.coordinates);
}
