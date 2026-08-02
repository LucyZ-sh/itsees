export function projectAtlasCoordinate(coordinates) {
  return {
    x: Math.min(97, Math.max(3, ((coordinates.lng + 180) / 360) * 100)),
    y: Math.min(93, Math.max(7, ((90 - coordinates.lat) / 180) * 100))
  };
}
