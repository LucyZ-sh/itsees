import {
  getRealLandmark,
  listRealLandmarks,
  resolveLandmarkWeatherSnapshot
} from "./realLandmarks.js";
import { listSouvenirsForLandmark } from "./souvenirLibrary.js?v=souvenir-library-v4";

export const ATLAS_SEGMENT_MINUTES = 60;

const IMAGE_WORLD_SCENE_NAMES = Object.freeze({
  fr_paris: ["书店", "塞纳河", "卢浮宫", "埃菲尔铁塔"],
  jp_tokyo: ["东京塔", "浅草寺", "隅田川", "涩谷路口"],
  cn_hong_kong: ["维多利亚港", "太平山", "天星小轮", "庙街"],
  us_grand_canyon: ["南缘观景台", "沙漠塔", "步道", "科罗拉多河"],
  amazon_rainforest: ["双色河", "河岛水道", "冠层步道", "河岸码头"],
  tz_serengeti: ["迁徙平原", "金合欢树", "河道穿越", "岩丘"],
  us_hawaii: ["Waikiki", "钻石头山", "火山", "海岸灯塔"],
  it_amalfi: ["Positano", "港口", "Ravello", "众神之路"],
  gr_greek_islands: ["蓝顶教堂", "Caldera", "风车石阶", "火山港口"],
  eu_alps: ["Matterhorn", "Jungfraujoch", "山湖", "山谷瀑布"],
  it_tuscany: ["柏树路", "葡萄园", "小礼拜堂", "古镇"],
  no_norway_coast: ["峡湾", "渔村", "灯塔", "渡轮"],
  cn_great_wall: ["慕田峪", "八达岭", "金山岭", "山林段"],
  in_taj_mahal: ["主陵", "倒影水池", "红砂岩门楼", "Yamuna 河岸"],
  eg_giza_pyramids: ["胡夫金字塔", "狮身人面像", "三塔视角", "博物馆方向"]
});

export function resolveAtlasAssetUrl(source) {
  const relative = String(source ?? "").replace(/^\.\//, "");
  if (relative.startsWith("assets/atlas/")) return `./${relative}`;
  if (relative.startsWith("assets/landmarks/")) {
    return `./assets/atlas/${relative.slice("assets/".length)}`;
  }
  if (relative.startsWith("assets/world-scenes/")) {
    return `./assets/atlas/${relative.slice("assets/".length)}`;
  }
  return `./${relative}`;
}

export function listAtlasDestinations() {
  return listRealLandmarks().map(createAtlasDestination);
}

export function getAtlasDestination(landmarkId) {
  return createAtlasDestination(getRealLandmark(landmarkId));
}

export function getAtlasSouvenirs(landmarkId) {
  return getAtlasDestination(landmarkId).souvenirs;
}

export function resolveAtlasScene(landmarkId, completedSpotCount) {
  const destination = getAtlasDestination(landmarkId);
  const index = Math.min(Math.max(completedSpotCount - 1, 0), destination.scenes.length - 1);
  return { destination, scene: destination.scenes[index] };
}

function createAtlasDestination(landmark) {
  const sceneNames = IMAGE_WORLD_SCENE_NAMES[landmark.id] ?? [
    landmark.naturalLandmarks[0],
    landmark.humanLandmarks[0],
    landmark.humanLandmarks[1] ?? landmark.foods[0],
    landmark.humanLandmarks[2] ?? landmark.naturalLandmarks[1]
  ];
  const imageAsset = resolveAtlasAssetUrl(landmark.postcardImage.src);
  const mapSegments = sceneNames.map((name, index) => ({
    id: `${landmark.id}-M${String(index + 1).padStart(2, "0")}`,
    order: index + 1,
    unlockMinute: (index + 1) * ATLAS_SEGMENT_MINUTES,
    name
  }));
  const scenes = sceneNames.map((name, index) => ({
    id: `${landmark.id}-S${String(index + 1).padStart(2, "0")}`,
    landmarkId: landmark.id,
    name,
    visual: index === 3 ? landmark.flyover : `${landmark.name}的${name}近景。`,
    message: `${name}在${landmark.name}的天气里慢慢靠近，桌宠把这一刻寄回了相册。`,
    imageAsset,
    rarity: index === 3 ? "rare" : index === 2 ? "uncommon" : "common",
    segmentOrder: index + 1
  }));

  return {
    ...landmark,
    phase: 2,
    mapSegments,
    scenes,
    imageAsset,
    assets: { mapColor: imageAsset, mapGray: imageAsset },
    souvenirs: listSouvenirsForLandmark(landmark.id),
    resolveWeatherSnapshot: now => resolveLandmarkWeatherSnapshot(landmark, now)
  };
}
