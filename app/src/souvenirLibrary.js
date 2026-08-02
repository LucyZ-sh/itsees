const LANDMARKS = {
  fr_paris: {
    countryCode: "FR",
    regionId: "europe",
    themes: ["T02", "T03", "T07", "T09", "T10", "T15"],
    sources: ["https://parisjetaime.com/eng/article/souvenirs-from-paris-a383"]
  },
  jp_tokyo: {
    countryCode: "JP",
    regionId: "asia",
    themes: ["T02", "T03", "T06", "T09", "T10", "T15"],
    sources: ["https://www.japan.travel/en/local-specialities/local-crafts/"]
  },
  cn_hong_kong: {
    countryCode: "CN",
    regionId: "asia",
    themes: ["T02", "T03", "T10", "T11"],
    sources: ["https://www.discoverhongkong.com/eng/shopping/where-to-shop-for-authentic-hong-kong-souvenirs-and-keepsakes.html"]
  },
  us_grand_canyon: {
    countryCode: "US",
    regionId: "north_america",
    themes: ["T05", "T13", "T14"],
    sources: ["https://www.nps.gov/grca/learn/historyculture/index.htm"]
  },
  amazon_rainforest: {
    countryCode: "BR",
    regionId: "south_america",
    themes: ["T04", "T07", "T11"],
    sources: ["https://whc.unesco.org/en/list/998/"]
  },
  tz_serengeti: {
    countryCode: "TZ",
    regionId: "africa",
    themes: ["T04", "T12"],
    sources: ["https://www.tanzaniatourism.go.tz/vibrant-towns-cities/"]
  },
  us_hawaii: {
    countryCode: "US",
    regionId: "oceania",
    themes: ["T01", "T11", "T13", "T14"],
    sources: ["https://www.gohawaii.com/experiences/arts-culture"]
  },
  it_amalfi: {
    countryCode: "IT",
    regionId: "europe",
    themes: ["T01", "T07", "T11"],
    sources: ["https://www.italia.it/en/campania/salerno/vietri-sul-mare-places-to-visit"]
  },
  gr_greek_islands: {
    countryCode: "GR",
    regionId: "europe",
    themes: ["T01", "T08", "T11"],
    sources: ["https://www.visitgreece.gr/experiences/leisure/shopping/ceramic-art-in-greece/"]
  },
  eu_alps: {
    countryCode: "CH",
    regionId: "europe",
    themes: ["T02", "T04", "T06", "T12", "T13", "T15"],
    sources: ["https://www.myswitzerland.com/en-ch/experiences/cast-your-own-bells/"]
  },
  it_tuscany: {
    countryCode: "IT",
    regionId: "europe",
    themes: ["T07", "T12"],
    sources: ["https://www.visittuscany.com/en/interests/craft/"]
  },
  no_norway_coast: {
    countryCode: "NO",
    regionId: "europe",
    themes: ["T01", "T02", "T04", "T06", "T11"],
    sources: ["https://www.visitnorway.com/typically-norwegian/knitting/"]
  },
  cn_great_wall: {
    countryCode: "CN",
    regionId: "asia",
    themes: ["T08", "T09"],
    sources: ["https://english.visitbeijing.com.cn/article/47ONq21B2dy"]
  },
  in_taj_mahal: {
    countryCode: "IN",
    regionId: "asia",
    themes: ["T07", "T08", "T09"],
    sources: ["https://www.prod.incredibleindia.gov.in/content/incredible-india-v2/en/destinations/agra/listicle/unmissable-activities-in-agra/shopping.html"]
  },
  eg_giza_pyramids: {
    countryCode: "EG",
    regionId: "africa",
    themes: ["T05", "T08", "T09", "T14", "T15"],
    sources: ["https://www.experienceegypt.eg/files/Egypt%20Map-Eng.pdf"]
  }
};

const CATALOG = {
  fr_paris: [
    ["eiffel_brass_charm", "黄铜铁塔挂饰", "brass charm", "common", "charm"],
    ["metro_ticket_stub", "巴黎地铁票根", "printed paper", "common", "ticket_stub"],
    ["cafe_enamel_pin", "咖啡馆珐琅徽章", "enamel and brass", "uncommon", "pin"],
    ["artisan_porcelain_tile", "手作瓷砖小片", "glazed porcelain", "rare", "tile"],
    ["bouquiniste_bookmark", "塞纳河旧书摊书签", "printed paper and ribbon", "common", "bookmark"],
    ["montmartre_sketch_card", "蒙马特速写卡", "archival paper and charcoal", "uncommon", "card"],
    ["seine_boat_charm", "塞纳河游船挂饰", "silvered brass", "common", "charm"],
    ["perfume_atomizer", "巴黎香水雾化瓶", "glass and brass", "rare", "miniature"],
    ["macaron_box_miniature", "马卡龙礼盒微缩件", "painted wood", "uncommon", "miniature"],
    ["art_nouveau_brooch", "新艺术花窗胸针", "enamel and brass", "uncommon", "pin"]
  ],
  jp_tokyo: [
    ["indigo_tenugui", "蓝染手拭布片", "indigo cotton", "common", "textile"],
    ["kiriko_glass_charm", "江户切子玻璃挂饰", "cut glass", "rare", "charm"],
    ["lacquer_chopstick_rest", "漆器筷架", "lacquered wood", "uncommon", "miniature"],
    ["patterned_paper_fan", "和纸纹样小扇", "washi paper and bamboo", "common", "fan"],
    ["edo_print_card", "江户木版画卡片", "washi paper and pigment", "uncommon", "card"],
    ["furoshiki_swatch", "风吕敷纹样布片", "dyed cotton", "common", "textile"],
    ["daruma_miniature", "达摩微缩摆件", "painted papier-mache", "uncommon", "miniature"],
    ["tokyo_train_charm", "东京电车挂饰", "enamel and brass", "common", "charm"],
    ["bamboo_tea_scoop", "竹制茶勺小件", "carved bamboo", "rare", "miniature"],
    ["temari_pattern_pin", "手鞠纹样徽章", "thread and brass", "rare", "pin"]
  ],
  cn_hong_kong: [
    ["tram_miniature", "叮叮车微缩模型", "painted metal", "uncommon", "miniature"],
    ["neon_enamel_pin", "霓虹招牌珐琅徽章", "enamel and brass", "common", "pin"],
    ["mahjong_charm", "麻将牌挂饰", "resin and brass", "rare", "charm"],
    ["egg_tart_token", "蛋挞黄铜代币", "aged brass", "common", "token"],
    ["junk_boat_miniature", "维港帆船微缩件", "painted wood", "uncommon", "miniature"],
    ["milk_tea_cup_charm", "港式奶茶杯挂饰", "enamel and brass", "common", "charm"],
    ["lion_dance_patch", "醒狮刺绣布贴", "embroidered cotton", "rare", "patch"],
    ["bamboo_steamer_token", "竹蒸笼木牌", "carved bamboo", "common", "token"],
    ["peak_tram_ticket", "山顶缆车票根", "printed paper", "uncommon", "ticket_stub"],
    ["harbor_skyline_pin", "维港天际线徽章", "enamel and brass", "uncommon", "pin"]
  ],
  us_grand_canyon: [
    ["passport_stamp_card", "峡谷护照印章卡", "archival paper", "common", "stamp"],
    ["strata_enamel_pin", "岩层珐琅徽章", "enamel and brass", "uncommon", "pin"],
    ["rim_trail_token", "南缘步道纪念币", "antiqued brass", "rare", "token"],
    ["botanical_bookmark", "沙漠植物书签", "pressed botanical and paper", "common", "bookmark"],
    ["condor_wing_pin", "加州神鹫翼徽章", "enamel and brass", "rare", "pin"],
    ["colorado_raft_charm", "科罗拉多河筏挂饰", "painted wood", "uncommon", "charm"],
    ["canyon_pottery_tile", "峡谷纹陶片", "hand-painted ceramic", "uncommon", "tile"],
    ["mule_trail_bell", "峡谷骡队铜铃", "cast bronze", "common", "bell"],
    ["sunrise_rim_brooch", "南缘日出胸针", "enamel and brass", "rare", "pin"],
    ["juniper_wood_token", "杜松木年轮牌", "juniper wood", "common", "token"]
  ],
  amazon_rainforest: [
    ["palm_fiber_charm", "棕榈纤维编织挂饰", "woven palm fiber", "common", "charm"],
    ["seed_bead_bracelet", "种子珠手链", "natural seed beads", "uncommon", "bracelet"],
    ["riverboat_token", "雨林河船木牌", "carved wood", "common", "token"],
    ["botanical_print", "雨林植物拓印", "handmade paper", "rare", "print"],
    ["dugout_canoe_miniature", "独木舟微缩件", "carved wood", "uncommon", "miniature"],
    ["acai_bead_charm", "巴西莓种子珠挂饰", "natural seed and cord", "common", "charm"],
    ["woven_palm_basket", "棕榈叶编织小篮", "woven palm fiber", "uncommon", "miniature"],
    ["hummingbird_pin", "雨林蜂鸟徽章", "enamel and brass", "rare", "pin"],
    ["jaguar_track_token", "美洲豹足迹木牌", "carved reclaimed wood", "rare", "token"],
    ["river_lily_patch", "亚马孙睡莲布贴", "embroidered cotton", "common", "patch"]
  ],
  tz_serengeti: [
    ["maasai_bead_bracelet", "马赛珠饰手链", "glass beads", "uncommon", "bracelet"],
    ["shuka_textile_swatch", "舒卡布纹样片", "woven cotton", "common", "textile"],
    ["acacia_wood_token", "金合欢木纪念牌", "acacia wood", "common", "token"],
    ["handmade_sandal_charm", "手作凉鞋挂饰", "leather and bead", "rare", "charm"],
    ["beaded_gourd_miniature", "珠饰葫芦微缩件", "gourd and glass beads", "uncommon", "miniature"],
    ["wildlife_track_token", "草原动物足迹牌", "carved acacia wood", "common", "token"],
    ["sisal_basket_miniature", "剑麻编织小篮", "woven sisal", "uncommon", "miniature"],
    ["zebra_pattern_patch", "斑马纹刺绣布贴", "embroidered cotton", "common", "patch"],
    ["baobab_woodcarving", "猴面包树木雕", "carved wood", "rare", "miniature"],
    ["savanna_sunset_pin", "草原落日徽章", "enamel and brass", "rare", "pin"]
  ],
  us_hawaii: [
    ["koa_surfboard_charm", "相思木冲浪板挂饰", "koa wood", "uncommon", "charm"],
    ["kapa_cloth_swatch", "卡帕树皮布纹样片", "bark cloth", "rare", "textile"],
    ["quilted_coaster", "海岛绗缝杯垫", "quilted cotton", "common", "textile"],
    ["ukulele_brass_pin", "尤克里里黄铜徽章", "brass and enamel", "common", "pin"],
    ["outrigger_canoe_miniature", "舷外浮木舟微缩件", "koa wood", "uncommon", "miniature"],
    ["hibiscus_enamel_pin", "木槿花珐琅徽章", "enamel and brass", "common", "pin"],
    ["plumeria_tile", "鸡蛋花陶片", "glazed ceramic", "uncommon", "tile"],
    ["lei_flower_charm", "花环花朵挂饰", "fabric and brass", "common", "charm"],
    ["lava_salt_vial", "火山海盐小瓶", "glass and cork", "rare", "miniature"],
    ["shave_ice_token", "彩虹刨冰木牌", "painted wood", "rare", "token"]
  ],
  it_amalfi: [
    ["vietri_lemon_tile", "维耶特里柠檬瓷砖", "glazed ceramic", "rare", "tile"],
    ["handmade_paper_tag", "阿马尔菲手工纸签", "cotton rag paper", "common", "tag"],
    ["ferry_ticket_stub", "海岸渡轮票根", "printed paper", "common", "ticket_stub"],
    ["lemon_grove_patch", "柠檬园刺绣布贴", "embroidered cotton", "uncommon", "patch"],
    ["ceramic_anchovy_charm", "彩釉凤尾鱼挂饰", "glazed ceramic", "common", "charm"],
    ["coastal_boat_miniature", "阿马尔菲海岸小船", "painted wood", "uncommon", "miniature"],
    ["bougainvillea_brooch", "三角梅花枝胸针", "enamel and brass", "uncommon", "pin"],
    ["lemon_wood_spoon", "柠檬木小勺", "carved lemon wood", "common", "miniature"],
    ["lace_window_patch", "海岸花窗蕾丝布片", "handmade lace", "rare", "textile"],
    ["cliffside_house_tile", "悬崖彩屋陶片", "glazed ceramic", "rare", "tile"]
  ],
  gr_greek_islands: [
    ["blue_dome_tile", "蓝顶教堂陶片", "glazed ceramic", "uncommon", "tile"],
    ["amphora_miniature", "双耳陶瓶微缩摆件", "terracotta", "rare", "miniature"],
    ["woven_swatch", "爱琴海织物纹样片", "woven cotton", "common", "textile"],
    ["olivewood_boat", "橄榄木小船", "olive wood", "common", "miniature"],
    ["pomegranate_tile", "石榴纹陶片", "glazed ceramic", "uncommon", "tile"],
    ["olive_leaf_brooch", "橄榄叶花环胸针", "brass and enamel", "common", "pin"],
    ["honey_dipper_charm", "蜂蜜棒木挂饰", "olive wood", "common", "charm"],
    ["aegean_mosaic_coaster", "爱琴海马赛克杯垫", "stone mosaic", "rare", "tile"],
    ["island_donkey_bell", "海岛驴铃", "cast bronze", "uncommon", "bell"],
    ["white_sail_pin", "爱琴海白帆徽章", "enamel and brass", "rare", "pin"]
  ],
  eu_alps: [
    ["cast_cowbell", "手工铸造牛铃", "cast bronze", "rare", "bell"],
    ["brienz_woodcarving", "布里恩茨木雕", "carved linden wood", "uncommon", "miniature"],
    ["cable_car_ticket", "阿尔卑斯缆车票", "printed paper", "common", "ticket_stub"],
    ["edelweiss_textile_patch", "雪绒花刺绣布贴", "embroidered wool", "common", "patch"],
    ["chalet_miniature", "阿尔卑斯木屋微缩件", "carved wood", "uncommon", "miniature"],
    ["red_train_charm", "山间红色列车挂饰", "enamel and brass", "common", "charm"],
    ["ski_badge", "高山滑雪徽章", "enamel and brass", "common", "pin"],
    ["fondue_fork_charm", "奶酪火锅叉挂饰", "steel and wood", "uncommon", "charm"],
    ["alpine_crystal", "高山水晶小件", "rock crystal", "rare", "miniature"],
    ["music_box_token", "山谷音乐盒牌", "painted wood and brass", "rare", "token"]
  ],
  it_tuscany: [
    ["leather_bookmark", "托斯卡纳皮革书签", "vegetable-tanned leather", "common", "bookmark"],
    ["montelupo_majolica_tile", "蒙特卢波陶砖", "tin-glazed ceramic", "rare", "tile"],
    ["marbled_paper_card", "佛罗伦萨大理石纹纸卡", "marbled paper", "uncommon", "card"],
    ["olivewood_spoon_charm", "橄榄木勺挂饰", "olive wood", "common", "charm"],
    ["grape_brooch", "葡萄藤珐琅胸针", "enamel and brass", "common", "pin"],
    ["cypress_seal", "丝柏树木印章", "carved olive wood", "uncommon", "stamp"],
    ["terracotta_roof_tile", "赤陶屋瓦小片", "terracotta", "common", "tile"],
    ["fleur_de_lis_keyfob", "佛罗伦萨百合皮牌", "vegetable-tanned leather", "uncommon", "tag"],
    ["espresso_cup_miniature", "彩绘浓缩咖啡杯", "glazed ceramic", "rare", "miniature"],
    ["sunflower_print_card", "托斯卡纳向日葵卡", "handmade paper", "rare", "card"]
  ],
  no_norway_coast: [
    ["selbu_knit_swatch", "塞尔布针织纹样片", "knitted wool", "uncommon", "textile"],
    ["rosemaling_spoon", "玫瑰彩绘木勺", "painted wood", "rare", "miniature"],
    ["fjord_pewter_pin", "峡湾锡制徽章", "pewter", "common", "pin"],
    ["ferry_ticket", "峡湾渡轮票", "printed paper", "common", "ticket_stub"],
    ["fjord_boat_miniature", "峡湾木船微缩件", "painted wood", "uncommon", "miniature"],
    ["knit_mitten_charm", "北欧针织手套挂饰", "knitted wool", "common", "charm"],
    ["coastal_lighthouse_pin", "挪威海岸灯塔徽章", "enamel and brass", "common", "pin"],
    ["codfish_wood_token", "鳕鱼木刻牌", "carved birch wood", "uncommon", "token"],
    ["aurora_brooch", "极光珐琅胸针", "enamel and silver", "rare", "pin"],
    ["fjord_crystal_charm", "峡湾冰蓝水晶坠", "glass and silver", "rare", "charm"]
  ],
  cn_great_wall: [
    ["cloisonne_bead", "景泰蓝珠饰", "cloisonne enamel", "rare", "charm"],
    ["knot_bookmark", "中国结书签", "silk cord", "common", "bookmark"],
    ["seal_stone_token", "篆刻石纪念章", "carved stone", "uncommon", "stamp"],
    ["rubbing_fragment", "长城纹样拓片", "ink on xuan paper", "common", "print"],
    ["watchtower_miniature", "长城烽火台微缩件", "carved wood", "uncommon", "miniature"],
    ["roof_tile_charm", "灰瓦檐纹挂饰", "glazed ceramic", "common", "charm"],
    ["shadow_puppet_patch", "皮影纹样布贴", "embroidered cotton", "uncommon", "patch"],
    ["cloud_folding_fan", "祥云纹折扇", "paper and bamboo", "common", "fan"],
    ["stone_lion_token", "石狮纪念牌", "carved stone", "rare", "token"],
    ["bronze_cloud_mirror", "云纹铜镜小件", "cast bronze", "rare", "miniature"]
  ],
  in_taj_mahal: [
    ["pietra_dura_coaster", "皮特拉硬石镶嵌杯垫", "inlaid marble", "rare", "tile"],
    ["agra_durrie_swatch", "阿格拉手织毯纹样片", "woven cotton", "uncommon", "textile"],
    ["brass_lattice_pendant", "黄铜花窗挂坠", "engraved brass", "common", "charm"],
    ["block_print_tag", "木版印花纸签", "block-printed paper", "common", "tag"],
    ["marble_elephant_miniature", "白色大理石象微缩件", "carved marble", "uncommon", "miniature"],
    ["sandalwood_box", "檀香木镂花小盒", "carved sandalwood", "rare", "miniature"],
    ["zardozi_patch", "金线刺绣布贴", "embroidered silk", "uncommon", "patch"],
    ["rose_attar_vial", "玫瑰香精玻璃瓶", "glass and brass", "common", "miniature"],
    ["jali_screen_charm", "花窗格纹挂饰", "carved stone and brass", "rare", "charm"],
    ["agra_sweet_token", "阿格拉甜点木牌", "painted wood", "common", "token"]
  ],
  eg_giza_pyramids: [
    ["papyrus_bookmark", "纸莎草书签", "papyrus", "common", "bookmark"],
    ["alabaster_miniature", "雪花石膏金字塔", "alabaster", "rare", "miniature"],
    ["woven_carpet_swatch", "埃及织毯纹样片", "woven wool", "uncommon", "textile"],
    ["perfume_glass_vial", "手作香水玻璃瓶", "blown glass", "common", "miniature"],
    ["scarab_enamel_pin", "圣甲虫珐琅徽章", "enamel and brass", "uncommon", "pin"],
    ["ankh_brass_charm", "生命之钥黄铜挂饰", "aged brass", "common", "charm"],
    ["camel_textile_patch", "骆驼鞍毯纹样片", "woven wool", "common", "textile"],
    ["cairo_lantern_miniature", "开罗花纹铜灯微缩件", "pierced brass", "rare", "miniature"],
    ["date_palm_basket", "椰枣棕叶编织篮", "woven palm fiber", "uncommon", "miniature"],
    ["nile_felucca_charm", "尼罗河三角帆船挂饰", "painted wood and brass", "rare", "charm"]
  ]
};

const MATERIAL_COPY_BY_TYPE = Object.freeze({
  bracelet: "天然珠饰与手工编结",
  bell: "铸造金属与植鞣皮革",
  bookmark: "纸张、植物或皮革纤维",
  card: "手工纸张与天然颜料",
  charm: "金属、木材或天然纤维",
  fan: "和纸与竹材",
  miniature: "微缩手工造型与真实材质",
  patch: "织物与细密绣线",
  pin: "珐琅与金属",
  print: "手工纸张与拓印纹理",
  stamp: "纸张、印泥或雕刻石材",
  tag: "手工纸张与天然纤维",
  textile: "手工织物与细密纹理",
  ticket_stub: "纸张纤维与旧印刷",
  tile: "手工陶瓷与釉面",
  token: "金属或木材的雕刻纹理"
});

function createItem(landmarkId, entry) {
  const [suffix, name, material, rarity, type] = entry;
  const landmark = LANDMARKS[landmarkId];
  const id = `${landmarkId}_${suffix}`;
  return Object.freeze({
    id,
    landmarkId,
    countryCode: landmark.countryCode,
    regionId: landmark.regionId,
    name,
    description: `桌宠从真实旅途中带回的${name}，保留了${MATERIAL_COPY_BY_TYPE[type] ?? "真实材质"}的细腻质感。`,
    culturalNote: "以当地常见工艺或旅行印记为原型，不冒充真实文物或认证商品。",
    material,
    type,
    rarity,
    weight: 1,
    themeTags: [...landmark.themes],
    sourceUrls: [...landmark.sources],
    asset: `./assets/souvenirs/phase2/${id}.webp`,
    assetAlt: `写实风格的${name}纪念品`,
    assetScale: type === "ticket_stub" || type === "bookmark" || type === "textile" ? 0.94 : 1,
    displayMode: "souvenir_thumbnail",
    contentReviewStatus: "approved"
  });
}

export const souvenirLibrary = Object.freeze(
  Object.entries(CATALOG).flatMap(([landmarkId, entries]) =>
    entries.map(entry => createItem(landmarkId, entry))
  )
);

const byId = new Map(souvenirLibrary.map(item => [item.id, item]));

export function listSouvenirLibrary() {
  return souvenirLibrary;
}

export function getSouvenirFromLibrary(souvenirId) {
  return byId.get(souvenirId) ?? null;
}

export function listSouvenirsForLandmark(landmarkId) {
  return souvenirLibrary.filter(item => item.landmarkId === landmarkId);
}

// Compatibility query for editorial tagging only. Phase 1 travel rewards must
// use getThemeSouvenirsFromDb() so virtual routes never receive real-landmark
// objects.
export function listSouvenirsForTheme(themeId) {
  return souvenirLibrary.filter(item => item.themeTags.includes(themeId));
}
