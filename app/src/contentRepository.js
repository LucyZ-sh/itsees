import { inventoryItems, souvenirs, themes } from "./content.js?v=inventory-v5";

export const CONTENT_SOURCE_MODE = "prebuilt-content-db";
export const REALTIME_IMAGE_GENERATION_ENABLED = false;

const themesById = new Map(themes.map(theme => [theme.id, theme]));
const souvenirsById = new Map(souvenirs.map(souvenir => [souvenir.id, souvenir]));
const scenesByThemeAndId = new Map(
  themes.flatMap(theme => theme.scenes.map(scene => [`${theme.id}:${scene.id}`, scene]))
);
function fallbackTheme() {
  return themes[0];
}

export function listThemes() {
  return themes;
}

export function listInventoryItems() {
  return inventoryItems;
}

export function listSouvenirs() {
  return souvenirs;
}

export function getSouvenirFromDb(souvenirId) {
  return souvenirsById.get(souvenirId) ?? null;
}

export function getThemeFromDb(themeId) {
  return themesById.get(themeId) ?? fallbackTheme();
}

export function getSceneFromDb(themeId, sceneId) {
  const theme = getThemeFromDb(themeId);
  return scenesByThemeAndId.get(`${theme.id}:${sceneId}`) ?? theme.scenes[0];
}

export function getThemeSouvenirsFromDb(themeId) {
  const theme = getThemeFromDb(themeId);
  if (theme.id !== themeId) return [];
  return souvenirs.filter(souvenir => souvenir.themeId === theme.id);
}

export function resolveOptimizedAssetUrl(url) {
  return typeof url === "string" && url.startsWith("./assets/themes/") && url.endsWith(".png")
    ? url.replace(/\.png$/, ".webp")
    : url;
}

export function resolveThemeRenderContent(themeId) {
  const theme = getThemeFromDb(themeId);
  return {
    sourceMode: CONTENT_SOURCE_MODE,
    realtimeImageGenerationEnabled: REALTIME_IMAGE_GENERATION_ENABLED,
    theme,
    mapAssets: {
      color: resolveOptimizedAssetUrl(theme.assets.mapColor),
      gray: resolveOptimizedAssetUrl(theme.assets.mapGray)
    },
    scenes: theme.scenes.map(scene => ({
      ...scene,
      imageUrl: resolveOptimizedAssetUrl(scene.imageAsset)
    }))
  };
}

export function resolveTravelSceneFromDb(themeId, coloredSegmentCount) {
  const theme = getThemeFromDb(themeId);
  const segmentIndex = Math.max(0, Math.min(theme.scenes.length - 1, coloredSegmentCount - 1));
  return {
    sourceMode: CONTENT_SOURCE_MODE,
    theme,
    scene: theme.scenes[segmentIndex] ?? theme.scenes[0]
  };
}

export function getThemeAssetUrls(themeId) {
  const content = resolveThemeRenderContent(themeId);
  return [
    content.mapAssets.gray,
    content.mapAssets.color,
    ...content.scenes.map(scene => scene.imageUrl)
  ].filter(Boolean);
}

export function preloadThemeAssets(themeId, { sceneLimit = 1 } = {}) {
  if (typeof Image === "undefined") return [];
  const [mapGray, mapColor, ...sceneUrls] = getThemeAssetUrls(themeId);
  const immediateUrls = [mapGray, mapColor, ...sceneUrls.slice(0, Math.max(0, sceneLimit))].filter(Boolean);
  return immediateUrls.map(url => {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    return image;
  });
}
