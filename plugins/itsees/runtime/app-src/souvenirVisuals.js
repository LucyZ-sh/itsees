const SOUVENIR_VISUALS = Object.freeze({
  glass_bead: Object.freeze({
    asset: "./assets/souvenirs/artisan-glass-keepsake.png",
    assetAlt: "手工吹制的海色玻璃旅行珠",
    assetScale: 0.94
  }),
  ticket_stub: Object.freeze({
    asset: "./assets/souvenirs/vintage-ticket.png",
    assetAlt: "带有压印纹理的复古旅行票根",
    assetScale: 1.08
  }),
  stamp: Object.freeze({
    asset: "./assets/souvenirs/compass-wax-seal.png",
    assetAlt: "压有罗盘纹样的旅行蜡封",
    assetScale: 0.96
  }),
  bookmark: Object.freeze({
    asset: "./assets/souvenirs/botanical-bookmark.png",
    assetAlt: "夹着真实叶片的手工植物书签",
    assetScale: 0.82
  }),
  patch: Object.freeze({
    asset: "./assets/souvenirs/embroidered-travel-patch.png",
    assetAlt: "手工刺绣的山野旅行布章",
    assetScale: 0.96
  })
});

export function getSouvenirVisual(type) {
  return SOUVENIR_VISUALS[type] ?? SOUVENIR_VISUALS.patch;
}
