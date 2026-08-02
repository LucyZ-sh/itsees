import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { inventoryItems, souvenirs, themes } from "../app/src/content.js";
import { LANGUAGE_CHOICE_STORAGE_KEY, translateText } from "../app/src/i18n.js";
import { listPets } from "../app/src/pets.js";
import { realLandmarks } from "../app/src/realLandmarks.js";

const cjk = /[\u3400-\u9fff]/;

test("English localization covers every Phase 1 route, scene, pet, pack item, landmark, and souvenir", () => {
  const values = [
    ...themes.flatMap(theme => [
      theme.name,
      theme.tags,
      theme.motif,
      ...theme.scenes.flatMap(scene => [scene.name, scene.visual, scene.message])
    ]),
    ...inventoryItems.flatMap(item => [item.name, item.effect]),
    ...listPets().flatMap(pet => [pet.name, pet.groupLabel]),
    ...realLandmarks.flatMap(landmark => [landmark.name, landmark.country, landmark.summary, landmark.flyover]),
    ...souvenirs.flatMap(item => [item.name, item.description])
  ];

  const untranslated = values
    .map(value => translateText(value))
    .filter(value => cjk.test(value));
  assert.deepEqual(untranslated, []);
});

test("app and bundled plugin expose persistent bilingual runtime copy", async () => {
  const [appSource, appI18nSource, pluginI18nSource] = await Promise.all([
    readFile(new URL("../app/src/app.js", import.meta.url), "utf8"),
    readFile(new URL("../app/src/i18n.js", import.meta.url), "utf8"),
    readFile(new URL("../plugins/itsees/runtime/app-src/i18n.js", import.meta.url), "utf8")
  ]);

  assert.match(appSource, /data-action="toggle-language"/);
  assert.match(appSource, /const localizedText = translateText\(text\)/);
  assert.match(appSource, /const label = translateText\(isPlaying \? "关闭背景音乐" : "播放背景音乐"\)/);
  assert.equal(LANGUAGE_CHOICE_STORAGE_KEY, "itsees-language-chosen-v1");
  assert.match(appI18nSource, /export function chooseLocale\(locale\)/);
  assert.match(appI18nSource, /\[aria-label\], \[title\], \[placeholder\], \[alt\]/);
  assert.equal(pluginI18nSource, appI18nSource);
});

test("reported compact status and route labels remain on one line", async () => {
  const css = await readFile(new URL("../app/warm-journal-theme.css", import.meta.url), "utf8");
  assert.match(css, /\.journal-current-status \[data-live-travel-status\][\s\S]*?white-space:\s*nowrap/);
  assert.match(css, /\.route-map-link,[\s\S]*?white-space:\s*nowrap/);
});

test("English localization keeps composed progress and unlock copy fully English", () => {
  const cases = new Map([
    ["0/12 个景点 · 剩余 240分钟", "0/12 stops · 240 min remaining"],
    ["已启用 1 项筛选", "1 filter active"],
    ["已启用 2 项筛选", "2 filters active"],
    ["再完成 3 个主题解锁", "Complete 3 more routes to unlock"],
    ["第 4 站解锁", "Unlocks at stop 4"],
    ["木牌候车室，第2段旅行后点亮", "Timber Waiting Room, unlocks after leg 2"],
    ["还差 15 条路线", "15 routes remaining"],
    ["Q版垂耳兔 · 待机", "Chibi Lop Rabbit · Ready"],
    ["海边小镇路线图", "Seaside Town route map"],
    ["海边小镇 · 路线总览", "Seaside Town · Route overview"],
    ["海边小镇 · 路线主图", "Seaside Town · Route overview"],
    ["塞纳河明信片", "Seine River postcard"],
    ["让Q版垂耳兔继续旅行", "Send Chibi Lop Rabbit back on the journey"],
    ["当前正在探索巴黎。", "Currently exploring Paris."],
    ["当前旅程：巴黎。选中景点仅用于预览。", "Current journey: Paris. The selected landmark is only a preview."],
    ["12 张明信片已经归档。点击路线图或明信片图片可全屏查看。", "12 postcards archived. Select the route art or a postcard to view it full-screen."],
    ["180 张明信片", "180 postcards"],
    ["1 张", "1 postcard"],
    ["将晶簇入口棱晶放到塞纳河明信片", "Place Crystal-Threshold Prism on Seine River postcard"],
    ["将晶簇入口棱晶放到水晶洞窟 · 晶簇入口明信片", "Place Crystal-Threshold Prism on Crystal Caverns · Crystal-Cluster Entrance postcard"],
    ["全屏查看纪念品晶簇入口棱晶", "View souvenir Crystal-Threshold Prism full-screen"],
    ["选择Q版柯基作为旅伴", "Choose Chibi Corgi as your companion"],
    ["它会陪你出发、带回明信片，也会出现在桌宠模式中。", "Your companion will travel with you, bring home postcards, and join you in compact companion mode."],
    ["确定要清空旅行记录吗？", "Clear all travel history?"]
  ]);
  for (const [source, expected] of cases) assert.equal(translateText(source), expected);
});
