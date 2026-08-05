import { inventoryItems, souvenirs, themes } from "./content.js?v=inventory-v6";
import { realLandmarks } from "./realLandmarks.js";
import { listPets } from "./pets.js";
import { listAtlasDestinations } from "./atlasContent.js?v=daily-checkin-v5";

export const LANGUAGE_STORAGE_KEY = "itsees-language-v1";
export const LANGUAGE_CHOICE_STORAGE_KEY = "itsees-language-chosen-v1";
const CJK_PATTERN = /[\u3400-\u9fff]/;

export function hasChosenLocale() {
  try {
    return localStorage.getItem(LANGUAGE_CHOICE_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function getLocale() {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === "zh-CN" || saved === "en") return saved;
  } catch {
    // localStorage may be unavailable in a hardened or test context.
  }
  return navigator.language?.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

export function setLocale(locale) {
  const normalized = locale === "en" ? "en" : "zh-CN";
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
  } catch {
    // The in-memory UI still updates even when persistence is unavailable.
  }
  return normalized;
}

export function chooseLocale(locale) {
  const normalized = setLocale(locale);
  try {
    localStorage.setItem(LANGUAGE_CHOICE_STORAGE_KEY, "true");
  } catch {
    // The current session can continue even when persistence is unavailable.
  }
  return normalized;
}

export function toggleLocale() {
  return chooseLocale(getLocale() === "en" ? "zh-CN" : "en");
}

export function isEnglish() {
  return getLocale() === "en";
}

const UI_EN = {
  "旅行": "Travel",
  "现在": "Now",
  "现在出发": "Set Out Now",
  "背包": "Journal",
  "地图": "Map",
  "相册": "Postcards",
  "纪念品": "Souvenirs",
  "记录": "History",
  "装饰": "Decorate",
  "旅行记录": "Travel History",
  "一期路线": "Phase 1 routes",
  "二期景点": "Phase 2 landmarks",
  "设置": "Settings",
  "音乐": "Music",
  "音乐缓存": "Music cache",
  "清理": "Clear",
  "音乐缓存清理失败": "Failed to clear music cache",
  "关闭": "Off",
  "开启": "On",
  "打开": "Open",
  "打开设置": "Open settings",
  "收起": "Close",
  "展开": "Expand",
  "重置": "Reset",
  "上一页": "Previous",
  "下一页": "Next",
  "上一项": "Previous item",
  "下一项": "Next item",
  "普通": "Common",
  "少见": "Uncommon",
  "稀有": "Rare",
  "一期": "Phase 1",
  "二期": "Phase 2",
  "第一期": "Phase 1",
  "第二期": "Phase 2",
  "第三期": "Phase 3",
  "第四期": "Phase 4",
  "完成": "Complete",
  "已完成": "Completed",
  "未解锁": "Locked",
  "已解锁": "Unlocked",
  "可选择": "Available",
  "待出发": "Ready",
  "待探索": "Unexplored",
  "旅行中": "Traveling",
  "正在路上": "Traveling",
  "正在看世界": "Out seeing the world",
  "刚刚回家": "Just returned home",
  "正在休息": "Resting",
  "等你一起出发": "Ready when you are",
  "暂停中": "Paused",
  "已召回": "Recalled",
  "中途召回": "Recalled early",
  "完整旅行": "Full journey",
  "当前旅程": "Current journey",
  "等待出发": "Ready to go",
  "完整旅行完成": "Journey complete",
  "已召回 · 可继续": "Recalled · Ready to resume",
  "旅伴正在路上": "Your companion is traveling",
  "主题地图": "Storybook Map",
  "真实世界": "Real World",
  "虚拟主题": "Storybook Route",
  "真实世界景点": "Real-world landmark",
  "一期主题路线": "Phase 1 · Storybook Route",
  "二期真实地标": "Phase 2 · Real-world Landmark",
  "真实景点": "real-world landmarks",
  "第二期真实景点": "Phase 2 real-world landmark",
  "全部阶段": "All phases",
  "全部地点": "All destinations",
  "全部时间": "All dates",
  "全部状态": "All statuses",
  "全部完成方式": "All journey types",
  "全部完成情况": "All completion types",
  "近 7 天": "Past 7 days",
  "近 30 天": "Past 30 days",
  "近 90 天": "Past 90 days",
  "完整完成": "Completed in full",
  "全部稀有度": "All rarities",
  "稀有度": "Rarity",
  "出发准备": "Travel preparations",
  "出发旅行": "Start journey",
  "历史存档": "Travel archive",
  "历史旅行": "Past journeys",
  "召回桌宠": "Recall companion",
  "提前召回": "Recall early",
  "继续旅行": "Resume journey",
  "继续旅伴": "Resume companion",
  "暂停旅伴": "Pause companion",
  "显示旅伴": "Show companion",
  "隐藏旅伴": "Hide companion",
  "显示桌宠": "Show companion",
  "换路线重开": "Restart on another route",
  "更换景点重开": "Restart at another landmark",
  "更换旅伴": "Change companion",
  "更换同行旅伴": "Choose a travel companion",
  "桌宠形象": "DESKTOP COMPANION",
  "关闭选择器": "Close companion picker",
  "选择目的地": "Choose a destination",
  "选择真实景点": "Choose a real-world landmark",
  "完成一期后开启": "Unlocks after completing Phase 1",
  "第二期 · 真实世界，完成一期后开启": "Phase 2 · Real World, unlocks after completing Phase 1",
  "第二期 真实世界，完成第一期后开启": "Phase 2 · Real World, unlocks after completing Phase 1",
  "世界地图": "World Map",
  "还没有展开。": "has yet to unfold.",
  "完成第一期全部路线后，旅伴才会收到通往真实世界的车票。": "Complete every Phase 1 route to earn your companion a ticket to the real world.",
  "需完成": "required",
  "条待点亮": "routes remaining",
  "二期解锁进度": "Phase 2 unlock progress",
  "完成第一期全部路线后自动开启": "Unlocks automatically after every Phase 1 route is complete",
  "开启条件": "Unlock requirements",
  "第一期 15 条路线都达到 12/12 个景点，第二期地图总览会自动出现，不需要重新启动。": "Once all 15 Phase 1 routes reach 12/12 stops, the Phase 2 map will appear automatically—no restart needed.",
  "只计算景点打卡进度": "Only completed stop check-ins count",
  "明信片和纪念品不影响解锁": "Postcards and souvenirs do not affect unlocking",
  "完成最后一条路线后自动开启": "Unlocks automatically when the final route is complete",
  "继续点亮第一期": "Keep exploring Phase 1",
  "尚未开启的真实世界地图": "Locked real-world map",
  "即将展开的真实世界地图": "The real-world map is about to unfold",
  "第一期完成 · 地图册换章": "Phase 1 complete · A new map chapter",
  "你们一起，把想象中的远方走完了。": "Together, you explored every imagined horizon.",
  "这是你和 Itsees 在一起的第": "This is day",
  "天。": "together with Itsees.",
  "个虚拟主题": "storybook routes",
  "从下一页开始，远方不再只是想象。": "From the next page on, the world is no longer imagined.",
  "Itsees 会走进真实世界，把每一段风景寄回给你。": "Itsees will step into the real world and send every view home to you.",
  "今天的脚步已经走满，真实世界会在这里等你。": "Today's journey is complete. The real world will be waiting here for you.",
  "新的十五处真实景点，已经在地图上等你。": "Fifteen real-world landmarks are waiting on the map.",
  "展开真实世界地图": "Unfold the real-world map",
  "先收好这张车票": "Save this ticket for later",
  "待机": "Ready",
  "天气读取中": "Loading weather",
  "读取中": "Loading",
  "实时天气已关闭": "Live weather is off",
  "实时天气": "Live weather",
  "实时天气隐私说明": "Live weather privacy",
  "背景音乐": "Background music",
  "播放背景音乐": "Play background music",
  "关闭背景音乐": "Turn off background music",
  "正在准备当地音乐": "Preparing local music",
  "今日额度结束": "Today’s travel limit reached",
  "今日成功打卡": "Today’s check-in progress",
  "今日旅程": "Today’s journey",
  "今日推荐": "Today’s pick",
  "旅程地图": "Journey Map",
  "旅程管理": "Journey controls",
  "旅行设置与记录": "Journey settings and records",
  "目的地、旅行包、相册、纪念品": "Destinations, travel pack, postcards, and souvenirs",
  "行囊、景点、相册、纪念品": "Travel pack, stops, postcards, and souvenirs",
  "本次旅行记录": "This journey",
  "收藏概览": "Collection overview",
  "旅行手账工具栏": "Travel journal toolbar",
  "我的收藏分类": "Collection categories",
  "收藏筛选": "Collection filters",
  "收藏翻页": "Collection pages",
  "快速跳转到已归档路线": "Jump to an archived route",
  "快速翻到路线": "Jump to a route",
  "横向滑动查看子场景": "Swipe horizontally to browse scenes",
  "张": "postcards",
  "第 1 / 16 页": "Page 1 of 16",
  "明信片已经归档。点击路线图或明信片图片可全屏查看。": "postcards archived. Select the route art or a postcard to view it full-screen.",
  "当前位置": "Current location",
  "查看场景": "View scene",
  "查看大图": "View full size",
  "打开地图": "Open map",
  "返回路线地图": "Back to route map",
  "返回世界地图": "Back to world map",
  "返回真实世界地图": "Back to the world map",
  "在地图中查看点亮进度": "View your map progress",
  "主图": "Overview",
  "全景": "Overview",
  "重置地图": "Reset map",
  "缩小地图": "Zoom out",
  "放大地图": "Zoom in",
  "恢复默认缩放": "Reset zoom",
  "开始主题旅行": "Start storybook journey",
  "开始真实旅行": "Start real-world journey",
  "切换路线并重新出发": "Switch routes and start again",
  "先召回当前旅程": "Recall current journey first",
  "让旅伴出发": "Send companion",
  "选择路线": "Choose a route",
  "当前路线": "Current route",
  "选择这条路线": "Choose this route",
  "继续旅行以解锁": "Keep traveling to unlock",
  "一期 · 远方路线": "Phase 1 · Storybook Routes",
  "二期 · 真实世界": "Phase 2 · Real World",
  "远方路线": "Storybook Routes",
  "15 条主题旅行路线": "15 storybook travel routes",
  "15 个真实景点": "15 real-world landmarks",
  "真实世界地图": "Real-world map",
  "今天，去点亮一段远方。": "Today, discover somewhere new.",
  "在地图上挑一条路线。它负责出发，你只需要等一封从远方寄回来的信。": "Choose a route and send your companion on its way. A letter from afar will find its way back to you.",
  "15 条主题路线": "15 storybook routes",
  "每站 20 分钟": "20 minutes per stop",
  "本地旅行手账": "Local travel journal",
  "主题": "Routes",
  "可探索": "Available",
  "已通关": "Completed",
  "你所在地天气": "Weather where you are",
  "打开时根据网络位置获取": "Uses your approximate network location when opened",
  "旅行场景仍使用本地模拟天气，可在设置中重新开启": "Travel scenes still use local simulated weather. You can turn live weather back on in Settings.",
  "旅行包": "Travel pack",
  "已准备": "Ready",
  "已装入": "Packed",
  "每类装备一件。装备会影响明信片风格与纪念品收藏。": "Pack one item from each category. Your choices shape postcard style and souvenir finds.",
  "每类限带一件。装备会影响明信片风格与纪念品收获。": "Pack one item from each category. Your choices shape postcard style and souvenir finds.",
  "每类限带一件": "One item from each category",
  "选择景点": "SELECT A LANDMARK",
  "实物": "Food",
  "道具": "Gear",
  "选择 1 件": "Choose one",
  "更换行囊": "Change pack",
  "图鉴": "Collection",
  "纪念品好运": "Souvenir luck",
  "完整旅程会提高珍稀机会": "Completing the full journey improves your chance of a rare find",
  "本次已激活稀有加成": "Rare-souvenir bonus active",
  "选择糖果或手账本，可进一步提高珍稀纪念品机会。": "Candy or a travel journal gives you an extra chance of finding a rare souvenir.",
  "珍稀纪念品机会提升，并有机会额外带回 1 件。": "Rare-souvenir odds are improved, with a chance to bring home one extra keepsake.",
  "完整旅程预计带回": "A full journey is expected to bring back",
  "张明信片": "postcards",
  "件纪念品": "souvenirs",
  "段旅程": "journeys",
  "条路线": "routes",
  "个真实景点": "real-world landmarks",
  "分钟": "min",
  "分钟完成": "min to complete",
  "剩余": "Remaining",
  "已记录": "recorded",
  "已点亮": "Explored",
  "景点": "stops",
  "子场景": "scenes",
  "明信片": "Postcards",
  "旅行收藏": "Travel Collection",
  "我的旅行收藏": "My Travel Collection",
  "它见过的世界，都会带回来给你。": "Every place your companion sees comes home to you.",
  "翻阅全部收藏": "Browse the full collection",
  "筛选": "Filters",
  "清除筛选": "Clear filters",
  "筛选结果": "Results",
  "阶段": "Phase",
  "地点": "Destination",
  "目的地": "Destination",
  "时间": "Date",
  "完成情况": "Completion",
  "按寄达时间 · 从新到旧": "Delivery date · Newest first",
  "件旅行收藏": "travel memories",
  "张旅行明信片": "travel postcards",
  "相册还空着": "Your postcard album is still empty",
  "让桌宠出门一次，它会带回第一张明信片。": "Send your companion on a journey and the first postcard will arrive here.",
  "还没有旅行记录": "No journeys yet",
  "这里会记录完整旅行和中途召回。": "Full journeys and early recalls will be recorded here.",
  "纪念品柜还在等第一件小物": "Your souvenir cabinet is waiting for its first keepsake",
  "完成有效景点打卡后会带回纪念品；完整旅程会增加数量和珍稀机会。": "Check in at a stop to bring home a souvenir. Completing the full journey unlocks more finds and better rarity odds.",
  "还没拍到景点照片": "No landmark photos yet",
  "完成第一个景点后，这里会出现对应的旅行照片。": "Complete the first stop and its travel photo will appear here.",
  "真实景点还没点亮": "No real-world scenes unlocked yet",
  "完成第一个 60 分钟路段后，子场景会出现在这里。": "Complete the first 60-minute leg to unlock its scene.",
  "未命名明信片": "Untitled postcard",
  "编辑明信片": "Decorate postcard",
  "完成装饰": "Done decorating",
  "拖动纪念品到明信片上，也可以点击放置。": "Drag a souvenir onto the postcard, or click to place it.",
  "没有可用纪念品": "No souvenirs available",
  "可用纪念品": "Available souvenirs",
  "删除": "Remove",
  "缩小": "Make smaller",
  "放大": "Make larger",
  "向左旋转": "Rotate left",
  "向右旋转": "Rotate right",
  "调整": "Adjust",
  "桌宠模式": "Companion mode",
  "置顶": "Keep on top",
  "取消置顶": "Stop keeping on top",
  "切换窗口置顶": "Toggle keep on top",
  "收起为轻量桌宠": "Switch to compact companion mode",
  "换日时区": "Daily reset time zone",
  "每日额度按此时区换日": "The daily travel limit resets in this time zone",
  "清空旅行记录": "Clear travel history",
  "危险操作": "Destructive action",
  "确定要清空旅行记录吗？": "Clear all travel history?",
  "这会清除本地保存的明信片、纪念品、地图点亮进度和旅伴状态。这个动作不能撤销。": "This permanently removes locally saved postcards, souvenirs, map progress, and companion status. This action cannot be undone.",
  "确认清空旅行记录？": "Clear all travel history?",
  "这会清空地图进度、相册、纪念品和旅行记录，但会保留你的旅伴与设置。": "This clears map progress, postcards, souvenirs, and journey history. Your companion and preferences will be kept.",
  "先保留": "Keep everything",
  "确认清空": "Clear history",
  "首次设置进度": "First-time setup progress",
  "语言": "Language",
  "选择旅伴": "Companion",
  "天气选项": "Weather",
  "第二步 · 桌宠形象": "Step 2 · Desktop Companion",
  "选择一位同行旅伴": "Choose your travel companion",
  "它会陪你出发、带回明信片，也会出现在桌宠模式中。": "Your companion will travel with you, bring home postcards, and join you in compact companion mode.",
  "你的同行旅伴": "Your travel companion",
  "第三步 · 天气选项": "Step 3 · Weather",
  "是否打开实时天气？": "Turn on live weather?",
  "开启后，桌宠会根据你所在地的天气切换状态。应用会通过 GeoJS 获取 IP 所在地，并由 Open-Meteo 查询当地天气。": "When enabled, your companion responds to local weather. Itsees uses GeoJS to determine your approximate IP location and Open-Meteo to retrieve the local forecast.",
  "以后想修改？": "Want to change this later?",
  "第四步 · 背景音乐": "Step 4 · Background Music",
  "要为旅程播放轻音乐吗？": "Add gentle music to your journeys?",
  "音乐会跟随正在旅行的主题与实时天气变化；天气不可用时，会播放该主题的默认版本。": "Music follows the current destination and live weather. If weather data is unavailable, Itsees plays the destination’s default track.",
  "旅途的声音": "Sounds of the journey",
  "进入首页后，点击右上角的「音乐」按钮即可随时播放或关闭。": "Once you reach the home screen, use Music in the top-right to play or pause it anytime.",
  "选择你的同行旅伴": "Choose your travel companion",
  "先从一位旅伴开始。之后可以随时在设置中更换。": "Start with one companion. You can change companions in Settings at any time.",
  "开启实时天气": "Turn on live weather",
  "打开实时天气": "Enable live weather",
  "暂不开启": "Not now",
  "进入首页后，点击右上角「设置」，即可更换旅伴或修改实时天气。": "Once you reach the home screen, open Settings in the top-right to change your companion or live weather preferences.",
  "让旅途有一点声音": "Add a soundtrack to the journey",
  "背景音乐会根据目的地与天气切换。你可以随时暂停。": "Background music follows the destination and weather. You can pause it at any time.",
  "播放背景音乐": "Play background music",
  "它先坐下来等你。": "Your companion settles in and waits for you.",
  "它已经背好小包，等你点头。": "Pack ready—waiting for your signal.",
  "它正在路上替你收集风景。": "Your companion is out collecting views for you.",
  "它刚从半路赶回来，包还没放下。": "Your companion has just hurried back, its pack still on.",
  "它把风景带回来了，正等你拆开今天的明信片。": "The journey is complete, and today’s postcards are waiting to be opened.",
  "每一段陪伴都值得被记录": "Every shared moment deserves a place in the journal",
  "每一段陪伴 都值得被记录": "Every shared moment deserves a place in the journal",
  "每一段陪伴\n都值得被记录": "Every shared moment\ndeserves a place in the journal",
  "每一段陪伴": "Every shared moment",
  "都值得被记录": "deserves a place in the journal",
  "旅伴状态": "Companion status",
  "本路线进度": "Route progress",
  "本路线记录": "Route progress",
  "本景点进度": "Landmark progress",
  "本景点记录": "Landmark progress",
  "地图阶段进度": "Map phase progress",
  "地图阶段": "Map phases",
  "地图缩放": "Map zoom",
  "一期旅行图鉴说明": "Phase 1 travel guide",
  "一期十五主题虚拟地图": "Phase 1 map with fifteen storybook routes",
  "二期真实世界地图": "Phase 2 real-world map",
  "二期真实世界说明": "About Phase 2",
  "二期真实世界解锁说明": "Phase 2 unlock requirements",
  "每一期全部点亮后，下一篇地图才会展开。": "Complete every route in a phase to unfold the next chapter of the map.",
  "第一期 · 远方路线": "Phase 1 · Storybook Routes",
  "第二期 · 真实世界": "Phase 2 · Real World",
  "今天，去点亮": "Today, discover",
  "一段远方。": "a corner of the world.",
  "把真实世界，": "Bring the real world",
  "慢慢寄回家。": "home, one postcard at a time.",
  "完成第一期后，地图册会展开十五处真实景点。每次出发都会点亮一小段真实世界，也会寄回新的明信片和纪念。": "Complete Phase 1 to unfold fifteen real-world landmarks. Each journey lights up another scene and sends home new postcards and keepsakes.",
  "每站 60 分钟": "60 minutes per stop",
  "真实世界地图册": "Real-world map book",
  "选中路线": "Selected route",
  "选中景点": "Selected landmark",
  "累计点亮": "Total progress",
  "进入景点主页": "Open landmark page",
  "打开路线主页": "Open route page",
  "第一期地图总览": "Phase 1 map overview",
  "第二期地图总览": "Phase 2 map overview",
  "待解锁": "Locked",
  "地图总览": "map overview",
  "一期旅行收藏说明": "Phase 1 collection guide",
  "二期真实世界说明": "Phase 2 real-world guide",
  "手绘真实世界地图": "Illustrated real-world map",
  "旅程": "Journey",
  "当前真实旅程": "Current real-world journey",
  "图片世界": "Image world",
  "已进入子场景": "Inside scene",
  "返回全景": "Back to panorama",
  "更换景点": "Change landmark",
  "路线主图": "Route overview",
  "场景图片": "Scene view",
  "返回主图": "Back to overview",
  "远方主题": "storybook route",
  "旅行进度": "Journey progress",
  "路线收集": "Route collection",
  "真实世界收集": "Real-world collection",
  "一期每格 20 分钟，二期每格 60 分钟": "20 minutes per Phase 1 segment; 60 minutes per Phase 2 segment",
  "一期每个子景点 20 分钟": "20 minutes per Phase 1 stop",
  "二期每个子景点 60 分钟": "60 minutes per Phase 2 scene",
  "今日打卡额度": "Today’s check-in limit",
  "Itsees 主导航": "Itsees primary navigation",
  "当前位置": "Current location",
  "Q版": "Chibi ",
  "狗狗": "Dogs",
  "猫猫": "Cats",
  "小动物": "Small Pets",
  "体感": "Feels like",
  "风速": "Wind",
  "本地模拟天气": "Local simulated weather",
  "晴光": "Sunny",
  "晴间多云": "Partly cloudy",
  "多云": "Cloudy",
  "阴云": "Overcast",
  "薄雾": "Misty",
  "小雨": "Light rain",
  "中雨": "Rain",
  "大雨": "Heavy rain",
  "阵雨": "Showers",
  "强阵雨": "Heavy showers",
  "雷雨": "Thunderstorms",
  "冻雨": "Freezing rain",
  "细雪": "Light snow",
  "中雪": "Snow",
  "大雪": "Heavy snow",
  "阵雪": "Snow showers",
  "雪粒": "Snow grains",
  "夜光": "Night glow",
  "彩虹": "Rainbow",
  "有风": "Windy",
  "水光": "Water shimmer",
  "沙尘": "Dusty",
  "热浪": "Heat haze"
};

const THEME_EN = [
  ["Seaside Town", "Sea breeze, lighthouse, shells, and salt air", "Lighthouse"],
  ["Mountain Station", "Mountain mist, rails, a timber platform, and distant peaks", "Platform"],
  ["City After Rain", "Neon, puddles, cafés, and rain-streaked windows", "Puddle"],
  ["Forest Path", "Moss, tree hollows, birdsong, and streams", "Tree hollow"],
  ["Desert Bazaar", "Desert wind, brass kettles, tents, and starlight", "Star chart"],
  ["Snow Country Onsen", "Snow lanterns, wooden baths, steam, and scarves", "Onsen"],
  ["Lakeside Garden", "Boats, water lilies, benches, and dusk", "Boat"],
  ["Old Town Street", "Stone bridges, lanterns, teahouses, and tiled roofs", "Stone bridge"],
  ["A Day at the Museum", "Display cases, journals, quiet footsteps, and souvenir stamps", "Display case"],
  ["Starlit Camp", "Tents, campfires, telescopes, and the Milky Way", "Milky Way"],
  ["Coral Depths", "Submarine windows, coral, seagrass, and glowing jellyfish", "Coral"],
  ["Orchard Farm", "Apples, beehives, barns, and fresh-baked bread", "Apple"],
  ["Cloudtop Airfield", "Airships, cloud bridges, weather balloons, and landing lights", "Airship"],
  ["Volcanic Hot Spring Isle", "Black sand, lava, steam, and basalt", "Volcano"],
  ["Crystal Caverns", "Crystal clusters, underground rivers, fluorite, and blue mineral veins", "Crystal cluster"]
];

const SCENE_EN = [
  ["Lighthouse Steps", "Shell Post Office", "Seagull Pier", "Tidal Rock Pools", "Whitewashed Lane", "Fishing Boats at Dawn", "Sea-Salt Ice Cream Shop", "Pinwheel Slope", "Breakwater at Dusk", "Moonlit Sea", "Starlight Boardwalk", "Returning White Sails"],
  ["Platform in the Mist", "Timber Waiting Room", "Valley Rail Bridge", "Wildflower Station Sign", "Wind at the Tunnel Mouth", "Mountaintop Bento Shop", "Wall of Old Tickets", "Rain Dripping from the Canopy", "Sunset Rails", "First Train at Dawn", "Signal Beyond the Clouds", "The Last Little Station"],
  ["Neon Puddle", "Café Window", "Umbrellas in the Alley", "Subway Exit", "Convenience-Store Glow", "Rooftop Puddles", "Glass Skybridge", "Night Bus", "Outside the Old Bookshop", "Morning Street Sweeper", "Rainy Window, Old Shop", "Morning Water Street"],
  ["Mossy Stone Steps", "Tree-Hollow Postbox", "Mushroom Ring", "Footbridge by the Stream", "Leaf-Tent Shelter", "Pinecone Slope", "Firefly Path", "Nest-Watching Lookout", "Sunlight Through the Canopy", "Muddy Path After Rain", "Camp Beneath the Trees", "Dewy Forest Exit"],
  ["Blue Canvas Tent", "Brass Kettle Tea Stall", "Spice Alley", "Camel Bell Dunes", "Nocturnal Star Chart", "Wind-Carved Stone Gate", "Oasis Well", "Red Rug Stall", "Sunset Caravanserai", "Moonlit Sand Ripples", "Caravan at Dawn", "Starlit Road Home"],
  ["Snow-Lantern Path", "Wooden-Barrel Onsen", "Scarf on a Bench", "Warm-Curtained Inn", "Snowman Postbox", "Frozen Lake", "Fireside Lounge", "Torii in the Snow", "Early-Morning Snow Clearing", "Steam at Night", "Breakfast by the Snowy Window", "Thawing Bridge Home"],
  ["Beside the Lily Pond", "Boat Landing", "Bench at Dusk", "White-Flower Arch", "Old Fountain", "Victorian Glasshouse", "Lakeside Picnic", "Willow Reflections", "Misty Morning Walk", "Boat Light Under the Moon", "Flowering Shore in Mist", "First Light on the Lake"],
  ["Bluestone Bridge", "Lantern Teahouse", "Paper-Umbrella Shop", "Riverside Landing", "Flowers at a Timber Window", "Sugar-Painting Stall", "Rain on Tiled Roofs", "Backstage at the Opera", "Cat Shadow on the Steps", "The End of the Night Market", "Morning Light on Stone Steps", "Moon Lantern at the Bridge"],
  ["Dinosaur Hall", "Antique Map Case", "Souvenir-Stamp Desk", "Quiet Gallery Bench", "Glass Dome", "Museum Shop", "Audio-Guide Headset", "Special-Exhibition Poster", "Stairway Turn", "Main Hall Before Closing", "Sunlit Staircase", "Morning Atrium"],
  ["By the Campfire", "Telescope Hill", "Lamplight in the Tent", "Milky Way Ridge", "Mug of Hot Cocoa", "Map on the Camp Table", "A Shooting Star", "Flags in the Night Wind", "Morning Dew", "The Packed Bag Home", "Sunrise at the Summit", "Stardust Trail Home"],
  ["Glass Submarine Window", "Coral Arch", "Seagrass Postal Route", "Pearl Grotto", "Glowing Jellyfish Cove", "Shipwreck Deck", "Shell Theatre", "Sea-Turtle Slope", "Deep-Blue Lighthouse", "Bubble Stairway Home", "Tide-Lit Lighthouse", "Morning Light on the Surface"],
  ["Orchard Gate", "Beehives in Bloom", "Barn Nap", "Cheese Cellar", "Wind Chimes over the Garden", "Bakehouse", "Hay-Bale Maze", "Washing Baskets in the Stream", "Pasture Fence at Dusk", "Farmhouse Terrace at Dawn", "Orchard Afterglow", "Apple-Pie Terrace"],
  ["Cloud Boarding Bridge", "Airship Berth", "Weather-Balloon Hangar", "Wind-Waiting Deck", "Weather-Vane Tower", "Luggage Zipline", "Sun-and-Rain Repair Shop", "Star-Chart Route Room", "Rainbow Fuel Stop", "Sunset Landing Lights", "Cloud-Island Lighthouse", "Morning Arrival"],
  ["Black-Sand Shore", "Lava Lookout", "Steam Valley", "Basalt Bridge", "Sulfur-Flower Slope", "Volcanic-Glass Stall", "Geothermal Kitchen", "Lava-Lit Cave Mouth", "Cooling Lava Road", "Crater Under the Stars", "Lamps on the Lava Slope", "Cold Stars over the Crater"],
  ["Crystal-Cluster Entrance", "Boat on the Underground River", "Fluorite Stairway", "Echo Hall", "Blue Mineral Vein", "Stalagmite Garden", "Mirror-Pool Grotto", "Mine-Cart Stop", "Warm-Lantern Camp", "Morning Light at the Exit", "Night Camp in the Crystal Cave", "Misty Cave Mouth"]
];

const PET_EN = {
  teddy: "Chibi Toy Poodle", corgi: "Chibi Corgi", "border-collie": "Chibi Border Collie",
  "golden-retriever": "Chibi Golden Retriever", husky: "Chibi Husky", "french-bulldog": "Chibi French Bulldog",
  "shiba-inu": "Chibi Shiba Inu", chihuahua: "Chibi Chihuahua", "calico-cat": "Chibi Calico",
  "abyssinian-cat": "Chibi Abyssinian", "british-blue-cat": "Chibi British Shorthair", "silver-shaded-cat": "Chibi Silver Shaded Cat",
  "ragdoll-cat": "Chibi Ragdoll", "persian-cat": "Chibi Persian", "sphynx-cat": "Chibi Sphynx",
  "siamese-cat": "Chibi Siamese", "lop-rabbit": "Chibi Lop Rabbit", "betta-fish": "Chibi Betta Fish",
  "guinea-pig": "Chibi Guinea Pig", turtle: "Chibi Turtle"
};

const INVENTORY_EN = {
  "food-riceball": ["Rice Ball", "A dependable bite for an easygoing journey"],
  "food-water": ["Water Bottle", "Favors nature and outdoor views"],
  "food-sandwich": ["Sandwich", "Favors city streets and station scenes"],
  "food-tea": ["Hot Tea", "Favors warm, gentle scenes"],
  "food-candy": ["Candy", "Improves rare-souvenir odds and may add one more find"],
  "food-bento": ["Bento", "Makes the rewards from a full journey more consistent"],
  "tool-camera": ["Camera", "Favors richly detailed postcards"],
  "tool-umbrella": ["Umbrella", "Favors rainy scenes and reflected light"],
  "tool-compass": ["Compass", "Favors routes and wide-ranging journeys"],
  "tool-sketchbook": ["Sketchbook", "Favors quiet, softly composed postcards"],
  "tool-binoculars": ["Binoculars", "Favors expansive, far-reaching views"],
  "tool-stampbook": ["Travel Journal", "Improves rare-souvenir odds and may add one more find"]
};

const COUNTRY_EN = {
  "法国": "France", "日本": "Japan", "中国": "China", "美国": "United States", "南美洲": "South America",
  "坦桑尼亚": "Tanzania", "意大利": "Italy", "希腊": "Greece", "欧洲": "Europe", "挪威": "Norway",
  "印度": "India", "埃及": "Egypt"
};

const LANDMARK_DETAIL_EN = {
  "塞纳河": "Seine River", "战神广场": "Champ de Mars", "城市屋顶线": "Paris rooftops",
  "埃菲尔铁塔": "Eiffel Tower", "卢浮宫": "Louvre Museum", "巴黎圣母院": "Notre-Dame Cathedral", "凯旋门": "Arc de Triomphe",
  "可丽饼": "Crêpes", "羊角面包": "Croissants", "马卡龙": "Macarons", "热巧克力": "Hot chocolate",
  "雨线": "Rain streaks", "薄雾": "Light mist", "晴光": "Sunlight", "小铁塔票根": "Eiffel Tower ticket stub",
  "塞纳河明信片": "Seine River postcard", "马卡龙贴纸": "Macaron sticker",
  "富士山远景": "Distant view of Mount Fuji", "隅田川": "Sumida River", "樱花街道": "Cherry-blossom avenue",
  "东京塔": "Tokyo Tower", "浅草寺": "Sensō-ji Temple", "涩谷街口": "Shibuya Crossing", "晴空塔": "Tokyo Skytree",
  "寿司": "Sushi", "拉面": "Ramen", "鲷鱼烧": "Taiyaki", "抹茶饮品": "Matcha drinks",
  "梅雨细雨": "Early-summer drizzle", "霓虹微光": "Neon glow", "风线": "Wind trails", "樱花御守": "Cherry-blossom omamori",
  "拉面券": "Ramen voucher", "东京塔小挂件": "Tokyo Tower charm",
  "维多利亚港": "Victoria Harbour", "太平山": "Victoria Peak", "海雾港湾": "Mist over the harbour",
  "天星小轮": "Star Ferry", "中环天际线": "Central skyline", "叮叮车": "Hong Kong tram", "庙街夜市": "Temple Street Night Market",
  "点心": "Dim sum", "菠萝包": "Pineapple bun", "蛋挞": "Egg tart", "丝袜奶茶": "Hong Kong–style milk tea",
  "海雾": "Sea mist", "阵雨": "Rain showers", "港湾灯光微闪": "Harbour lights", "小渡轮票": "Star Ferry ticket",
  "蛋挞纸袋": "Egg-tart paper bag", "霓虹招牌贴纸": "Neon-sign sticker",
  "科罗拉多河": "Colorado River", "峡谷岩层": "Canyon rock layers", "南缘观景台": "South Rim overlook", "沙漠高原": "Desert plateau",
  "观景步道": "Scenic rim trail", "游客中心": "Visitor center", "历史瞭望塔": "Historic watchtower", "河上漂流活动": "Colorado River rafting",
  "美西烧烤": "Southwestern barbecue", "苹果派": "Apple pie", "玉米面包": "Cornbread", "冰柠檬水": "Iced lemonade",
  "热浪": "Heat haze", "沙尘": "Desert dust", "日落光晕": "Sunset glow", "红岩小石片": "Red-rock fragment",
  "漂流贴纸": "Rafting sticker", "观景台印章": "Overlook stamp",
  "亚马逊河支流": "Amazon tributary", "雨林冠层": "Rainforest canopy", "湿地": "Wetlands", "林间雾气": "Forest mist",
  "河岸村落": "Riverside village", "小船码头": "Riverboat landing", "生态观察站": "Ecological field station", "手工集市": "Artisan market",
  "木薯制品": "Cassava dishes", "巴西莓": "Açaí", "烤鱼": "Grilled fish", "热带水果汁": "Tropical fruit juice",
  "暴雨": "Tropical downpour", "水面反光": "Reflections on the water", "雨林叶片书签": "Rainforest-leaf bookmark",
  "小船票": "Riverboat ticket", "巴西莓杯贴纸": "Açaí-cup sticker",
  "草原": "Savanna", "迁徙兽群": "Migrating herds", "金合欢树": "Acacia trees", "远山地平线": "Distant mountain horizon",
  "生态保护区入口": "Reserve entrance", "观测车辆": "Safari vehicle", "营地灯光": "Camp lights", "当地集市意象": "Local market scene",
  "乌伽黎": "Ugali", "烤肉": "Grilled meat", "椰香米饭": "Coconut rice", "茶饮": "Tea",
  "晨雾": "Morning mist", "旱季尘土": "Dry-season dust", "金色日落": "Golden sunset", "草原观察笔记": "Savanna field notes",
  "金合欢叶标本": "Pressed acacia leaf", "营地贴纸": "Safari-camp sticker",
  "火山": "Volcanoes", "海滩": "Beaches", "冲浪海湾": "Surf bay", "椰林": "Palm groves",
  "海边小镇": "Seaside town", "冲浪板店": "Surf shop", "传统音乐舞台": "Traditional music stage", "灯塔": "Lighthouse",
  "Poke": "Poke", "刨冰": "Shave ice", "烤猪": "Kalua pork", "菠萝汁": "Pineapple juice",
  "热带雨": "Tropical rain", "彩虹": "Rainbow", "海风线": "Trade-wind trails", "冲浪板贴纸": "Surfboard sticker",
  "彩虹刨冰券": "Rainbow shave-ice voucher", "火山明信片": "Volcano postcard",
  "悬崖海岸": "Cliff-lined coast", "地中海海面": "Mediterranean Sea", "柠檬园": "Lemon groves", "弯曲海岸公路": "Winding coastal road",
  "海岸村镇": "Coastal village", "教堂钟楼": "Church bell tower", "小港口": "Small harbour", "露台餐厅": "Terrace restaurant",
  "柠檬酒": "Limoncello", "海鲜意面": "Seafood pasta", "披萨": "Pizza", "意式冰淇淋": "Gelato",
  "海风": "Sea breeze", "柠檬贴纸": "Lemon sticker", "小港口票根": "Harbour ticket stub", "蓝海明信片": "Mediterranean postcard",
  "爱琴海": "Aegean Sea", "火山岛崖壁": "Volcanic island cliffs", "海湾": "Bay", "日落天际线": "Sunset horizon",
  "圣托里尼白墙蓝顶": "Santorini’s white walls and blue domes", "港口": "Harbour", "风车": "Windmills", "石阶小巷": "Stone-stepped lanes",
  "希腊沙拉": "Greek salad", "烤肉卷": "Gyros", "希腊酸奶": "Greek yogurt", "蜂蜜甜点": "Honey pastries",
  "强日照": "Bright Mediterranean sun", "黄昏光": "Twilight glow", "蓝顶小屋贴纸": "Blue-dome sticker", "海风贝壳": "Seashell",
  "酸奶杯卡片": "Yogurt-cup card",
  "雪山": "Snowcapped peaks", "牧场": "Alpine meadows", "湖泊": "Mountain lakes", "针叶林": "Conifer forest",
  "山村木屋": "Alpine chalet", "登山缆车": "Mountain cable car", "牧场小径": "Meadow trail", "滑雪小镇": "Ski village",
  "奶酪火锅": "Cheese fondue", "香肠": "Sausage", "雪粒": "Snow grains", "山雾": "Mountain mist", "晴空光": "Clear alpine light",
  "缆车票": "Cable-car ticket", "雪山徽章": "Mountain badge", "奶酪锅贴纸": "Fondue-pot sticker",
  "丘陵": "Rolling hills", "葡萄园": "Vineyards", "柏树路": "Cypress-lined road", "橄榄园": "Olive groves",
  "古镇": "Hill town", "酒庄": "Winery", "石砌农舍": "Stone farmhouse", "乡间教堂": "Country chapel",
  "意面": "Pasta", "托斯卡纳牛排": "Bistecca alla Fiorentina", "葡萄酒": "Tuscan wine", "橄榄油面包": "Olive-oil bread",
  "金色黄昏": "Golden dusk", "雨后田野": "Fields after rain", "葡萄叶标本": "Pressed grape leaf", "酒庄明信片": "Winery postcard",
  "橄榄油小票": "Olive-oil shop receipt",
  "峡湾": "Fjord", "悬崖": "Sea cliffs", "瀑布": "Waterfalls", "北方海岸": "Northern coast",
  "渔村": "Fishing village", "红色木屋": "Red timber cabins", "渡轮码头": "Ferry landing", "海岸灯塔": "Coastal lighthouse",
  "三文鱼": "Salmon", "鳕鱼": "Cod", "华夫饼": "Norwegian waffles", "热咖啡": "Hot coffee", "阴雨": "Overcast rain", "冬季雪光": "Winter snowlight",
  "峡湾船票": "Fjord ferry ticket", "红木屋贴纸": "Red-cabin sticker", "灯塔徽章": "Lighthouse badge",
  "山脊": "Mountain ridge", "秋季林带": "Autumn forest belt", "雪后山坡": "Snow-covered slope", "远山云雾": "Mist over distant mountains",
  "城墙": "Great Wall ramparts", "烽火台": "Watchtower", "关口": "Mountain pass", "石阶步道": "Stone stairway",
  "北京烤鸭": "Peking duck", "炸酱面": "Zhajiangmian noodles", "糖葫芦": "Candied hawthorn", "热豆浆": "Hot soy milk", "秋风": "Autumn wind",
  "烽火台印章": "Watchtower stamp", "城砖纹贴纸": "Masonry-pattern sticker", "糖葫芦小签": "Candied-hawthorn tag",
  "亚穆纳河": "Yamuna River", "花园轴线": "Garden axis", "水池倒影": "Reflections in the pool",
  "泰姬陵主体": "Taj Mahal mausoleum", "清真寺附属建筑": "Mosque complex", "门楼": "Main gateway", "花园步道": "Garden walkway",
  "咖喱": "Curry", "印度奶茶": "Masala chai", "甜点": "Indian sweets", "烤饼": "Naan", "季风雨": "Monsoon rain", "日落暖光": "Warm sunset light",
  "倒影明信片": "Reflecting-pool postcard", "奶茶杯贴纸": "Chai-cup sticker", "花园门票": "Garden ticket",
  "沙漠": "Desert", "晴夜星空": "Clear night sky", "远处城市边缘": "Distant city skyline",
  "吉萨金字塔": "Giza pyramid complex", "狮身人面像": "Great Sphinx", "古道": "Ancient causeway", "博物馆候选": "Museum district",
  "鹰嘴豆泥": "Hummus", "薄饼": "Flatbread", "薄荷茶": "Mint tea", "晴夜星光": "Clear starlight",
  "金字塔印章": "Pyramid stamp", "沙色纸莎草贴纸": "Sand-toned papyrus sticker", "薄荷茶杯卡": "Mint-tea card"
};

const ATLAS_SCENE_EN = {
  "书店": "Bookshop", "塞纳河": "Seine River", "卢浮宫": "Louvre Museum", "埃菲尔铁塔": "Eiffel Tower",
  "东京塔": "Tokyo Tower", "浅草寺": "Sensō-ji", "隅田川": "Sumida River", "涩谷路口": "Shibuya Crossing",
  "维多利亚港": "Victoria Harbour", "太平山": "Victoria Peak", "天星小轮": "Star Ferry", "庙街": "Temple Street",
  "南缘观景台": "South Rim Overlook", "沙漠塔": "Desert View Watchtower", "步道": "Canyon Trail", "科罗拉多河": "Colorado River",
  "双色河": "Meeting of Waters", "河岛水道": "Island Waterway", "冠层步道": "Canopy Walk", "河岸码头": "Riverside Landing",
  "迁徙平原": "Migration Plains", "金合欢树": "Acacia Grove", "河道穿越": "River Crossing", "岩丘": "Kopje",
  "钻石头山": "Diamond Head", "火山": "Volcano", "海岸灯塔": "Coastal Lighthouse", "港口": "Harbour",
  "众神之路": "Path of the Gods", "蓝顶教堂": "Blue-Domed Church", "风车石阶": "Windmill Steps", "火山港口": "Volcanic Harbour",
  "山湖": "Alpine Lake", "山谷瀑布": "Valley Waterfall", "柏树路": "Cypress Road", "葡萄园": "Vineyard",
  "小礼拜堂": "Country Chapel", "古镇": "Hill Town", "峡湾": "Fjord", "渔村": "Fishing Village", "灯塔": "Lighthouse", "渡轮": "Ferry",
  "慕田峪": "Mutianyu", "八达岭": "Badaling", "金山岭": "Jinshanling", "山林段": "Wooded Ridge",
  "主陵": "Main Mausoleum", "倒影水池": "Reflecting Pool", "红砂岩门楼": "Red Sandstone Gateway", "Yamuna 河岸": "Yamuna Riverbank",
  "胡夫金字塔": "Great Pyramid of Khufu", "狮身人面像": "Great Sphinx", "三塔视角": "Three-Pyramid View", "博物馆方向": "Museum Vista"
};

const SOUVENIR_WORDS = {
  eiffel: "Eiffel", brass: "Brass", charm: "Charm", metro: "Métro", ticket: "Ticket", stub: "Stub",
  cafe: "Café", enamel: "Enamel", pin: "Pin", artisan: "Artisan", porcelain: "Porcelain", tile: "Tile",
  indigo: "Indigo", tenugui: "Tenugui", kiriko: "Kiriko", glass: "Glass", lacquer: "Lacquer",
  chopstick: "Chopstick", rest: "Rest", patterned: "Patterned", paper: "Paper", fan: "Fan", tram: "Tram",
  miniature: "Miniature", neon: "Neon Sign", mahjong: "Mahjong", egg: "Egg", tart: "Tart", token: "Token",
  passport: "Passport", stamp: "Stamp", card: "Card", strata: "Strata", rim: "Rim", trail: "Trail",
  botanical: "Botanical", bookmark: "Bookmark", palm: "Palm", fiber: "Fiber", woven: "Woven", seed: "Seed",
  bead: "Bead", bracelet: "Bracelet", riverboat: "Riverboat", print: "Print", maasai: "Maasai", shuka: "Shuka",
  textile: "Textile", swatch: "Swatch", acacia: "Acacia", wood: "Wood", handmade: "Handmade", sandal: "Sandal",
  koa: "Koa", surfboard: "Surfboard", kapa: "Kapa", cloth: "Cloth", quilted: "Quilted", coaster: "Coaster",
  ukulele: "Ukulele", vietri: "Vietri", lemon: "Lemon", ferry: "Ferry", grove: "Grove", patch: "Patch",
  blue: "Blue", dome: "Dome", amphora: "Amphora", olivewood: "Olivewood", boat: "Boat", cast: "Cast",
  cowbell: "Cowbell", brienz: "Brienz", woodcarving: "Woodcarving", cable: "Cable", car: "Car",
  edelweiss: "Edelweiss", leather: "Leather", montelupo: "Montelupo", majolica: "Majolica", marbled: "Marbled",
  spoon: "Spoon", selbu: "Selbu", knit: "Knit", rosemaling: "Rosemaling", fjord: "Fjord", pewter: "Pewter",
  cloisonne: "Cloisonné", knot: "Knot", seal: "Seal", stone: "Stone", rubbing: "Rubbing", fragment: "Fragment",
  pietra: "Pietra", dura: "Dura", agra: "Agra", durrie: "Durrie", lattice: "Lattice", pendant: "Pendant",
  block: "Block", papyrus: "Papyrus", alabaster: "Alabaster", pyramid: "Pyramid", carpet: "Carpet",
  perfume: "Perfume", vial: "Vial"
};

const dynamicEn = new Map(Object.entries(UI_EN));

themes.forEach((theme, themeIndex) => {
  const [name, tags, motif] = THEME_EN[themeIndex];
  dynamicEn.set(theme.name, name);
  dynamicEn.set(theme.tags, tags);
  dynamicEn.set(theme.motif, motif);
  theme.scenes.forEach((scene, sceneIndex) => {
    const sceneName = SCENE_EN[themeIndex][sceneIndex];
    dynamicEn.set(scene.name, sceneName);
    dynamicEn.set(scene.visual, `A carefully observed travel scene at ${sceneName.toLowerCase()}.`);
    dynamicEn.set(scene.message, `Your companion lingered at ${sceneName} and sent this small moment home.`);
  });
});

inventoryItems.forEach(item => {
  const translated = INVENTORY_EN[item.id];
  if (!translated) return;
  dynamicEn.set(item.name, translated[0]);
  dynamicEn.set(item.effect, translated[1]);
});

listPets().forEach(pet => {
  dynamicEn.set(pet.name, PET_EN[pet.id] ?? pet.name);
});

realLandmarks.forEach(landmark => {
  dynamicEn.set(landmark.name, landmark.englishName);
  dynamicEn.set(landmark.country, COUNTRY_EN[landmark.country] ?? landmark.country);
  dynamicEn.set(landmark.summary, `A postcard journey through the signature scenery of ${landmark.englishName}.`);
  dynamicEn.set(landmark.flyover, `Glide through the defining landscapes and landmarks of ${landmark.englishName}.`);
  for (const value of [
    ...(landmark.naturalLandmarks ?? []), ...(landmark.humanLandmarks ?? []), ...(landmark.foods ?? []),
    ...(landmark.weatherFocus ?? []), ...(landmark.collectibles ?? [])
  ]) {
    if (!dynamicEn.has(value)) dynamicEn.set(value, LANDMARK_DETAIL_EN[value] ?? value);
  }
  if (landmark.visualHint) dynamicEn.set(landmark.visualHint, `${landmark.englishName} landmark view`);
  if (landmark.postcardImage?.alt) dynamicEn.set(landmark.postcardImage.alt, `Illustrated postcard featuring the landmarks of ${landmark.englishName}`);
});

listAtlasDestinations().forEach(destination => {
  destination.scenes.forEach(scene => {
    const sceneName = ATLAS_SCENE_EN[scene.name] ?? dynamicEn.get(scene.name) ?? scene.name;
    dynamicEn.set(scene.name, sceneName);
    dynamicEn.set(scene.visual, `A close-up journey through ${sceneName} in ${destination.englishName}.`);
    dynamicEn.set(scene.message, `${sceneName} slowly came into view, and your companion sent the moment home.`);
  });
});

souvenirs.forEach(item => {
  let englishName;
  if (/^T\d{2}-SV\d{2}$/.test(item.id)) {
    englishName = item.englishName;
  } else {
    const words = item.id.split("_").slice(2).map(word => {
      if (SOUVENIR_WORDS[word]) return SOUVENIR_WORDS[word];
      return `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
    });
    englishName = words.join(" ");
  }
  dynamicEn.set(item.name, englishName);
  if (item.description) dynamicEn.set(item.description, item.englishDescription ?? `A locally inspired keepsake brought home from the journey.`);
});

const replacements = [...dynamicEn.entries()]
  .filter(([source, target]) => source && source !== target)
  .sort(([left], [right]) => right.length - left.length);

// Resolve variable UI sentences before fragment replacement. Translating the
// fragments first can otherwise leave hybrids such as “0/12 个stops”.
const SENTENCE_PATTERNS = [
  [/^打开 Itsees 旅行舱，查看(.+)详情$/, "Open Itsees Travel Capsule and view $1 details"],
  [/^打开 Itsees 旅行舱，(.+)$/, "Open Itsees Travel Capsule · $1"],
  [/^(\d+)%\s*·\s*(\d+)小时(\d+)分钟后完成$/, "$1% · $2 hr $3 min remaining"],
  [/^(\d+)%\s*·\s*(\d+)小时后完成$/, "$1% · $2 hr remaining"],
  [/^(\d+)%\s*·\s*(\d+)分钟后完成$/, "$1% · $2 min remaining"],
  [/^(.+?)\s*·\s*(.+?)，已经记录\s*(\d+)\/(\d+)\s*个场景。$/, "$1 · $2, $3/$4 scenes recorded."],
  [/^(.+?)\s*·\s*(.+?)。选择一条路线，就可以替你去看看。$/, "$1 · $2. Choose a route and your companion will explore it for you."],
  [/^召回(.+)$/, "Recall $1"],
  [/^全部\s*(\d+)\s*张$/, "View all $1"],
  [/^(\d+)\s*张符合条件的旅行明信片。$/, "$1 travel postcards match your filters."],
  [/^筛选\s*·\s*(\d+)\s*项已启用$/, "Filters · $1 active"],
  [/^(\d+)\s*张旅行明信片$/, "$1 travel postcards"],
  [/^已启用\s*1\s*项筛选$/, "1 filter active"],
  [/^已启用\s*(\d+)\s*项筛选$/, "$1 filters active"],
  [/^让(.+)继续旅行$/, "Send $1 back on the journey"],
  [/^当前正在探索(.+)。$/, "Currently exploring $1."],
  [/^当前旅程：(.+)。选中景点仅用于预览。$/, "Current journey: $1. The selected landmark is only a preview."],
  [/^当前旅程：(.+)。选中路线仅用于预览。$/, "Current journey: $1. The selected route is only a preview."],
  [/^(\d+) 张明信片已经归档。点击路线图或明信片图片可全屏查看。$/, "$1 postcards archived. Select the route art or a postcard to view it full-screen."],
  [/^(\d+) 张明信片$/, "$1 postcards"],
  [/^1 张$/, "1 postcard"],
  [/^(\d+) 张$/, "$1 postcards"],
  [/^将(.+)放到(.+)明信片$/, "Place $1 on $2 postcard"],
  [/^将(.+)放到(.+)$/, "Place $1 on $2"],
  [/^全屏查看纪念品(.+)$/, "View souvenir $1 full-screen"],
  [/^(.+)明信片$/, "$1 postcard"],
  [/^选择(.+)作为旅伴$/, "Choose $1 as your companion"],
  [/^(\d+)\/(\d+)\s*个景点\s*·\s*剩余\s*(\d+)\s*分钟$/, "$1/$2 stops · $3 min remaining"],
  [/^再完成\s*(\d+)\s*个主题解锁$/, "Complete $1 more routes to unlock"],
  [/^第\s*(\d+)\s*站解锁$/, "Unlocks at stop $1"],
  [/^(.+?)，第\s*(\d+)\s*段旅行后点亮$/, "$1, unlocks after leg $2"],
  [/^(\d+)\s*\/\s*(\d+)\s*条$/, "$1 / $2 routes"],
  [/^还差\s*(\d+)\s*条路线$/, "$1 routes remaining"],
  [/^(.+?)会在地图册旁等你。$/, "$1 will wait beside the map book."],
  [/^(.+?)\s*·\s*待机$/, "$1 · Ready"],
  [/^(.+?)待机$/, "$1 ready"],
  [/^(.+?)路线图$/, "$1 route map"]
];

const PATTERNS = [
  [/第\s*(\d+)\s*页/g, "Page $1"],
  [/第\s*(\d+)\s*\/\s*(\d+)\s*页/g, "Page $1 of $2"],
  [/第\s*(\d+)\s*站/g, "Stop $1"],
  [/第(\d+)段旅行后点亮/g, "Unlocks after leg $1"],
  [/(\d+)\s*张明信片/g, "$1 postcards"],
  [/(\d+)\s*张旅行明信片/g, "$1 travel postcards"],
  [/(\d+)\s*张\b/g, "$1 postcards"],
  [/(\d+)\s*件纪念品/g, "$1 souvenirs"],
  [/(\d+)\s*件旅行收藏/g, "$1 travel memories"],
  [/(\d+)\s*段旅程/g, "$1 journeys"],
  [/(\d+)\s*条路线/g, "$1 routes"],
  [/(\d+)\s*个真实景点/g, "$1 real-world landmarks"],
  [/(\d+)\s*个场景/g, "$1 scenes"],
  [/(\d+)\/(\d+)\s*个子场景/g, "$1/$2 scenes"],
  [/(\d+)\/(\d+)\s*个景点/g, "$1/$2 stops"],
  [/(\d+)\/(\d+)\s*个scenes/g, "$1/$2 scenes"],
  [/(\d+)\s*分钟/g, "$1 min"],
  [/(\d+)min\b/g, "$1 min"],
  [/剩余\s*(\d+)/g, "$1 remaining"],
  [/一期\s*(\d+)\/(\d+)/g, "Phase 1 $1/$2"],
  [/二期\s*(\d+)\/(\d+)/g, "Phase 2 $1/$2"],
  [/今日\s*(\d+)\/(\d+)/g, "Today $1/$2"],
  [/路线\s*T(\d+)/g, "Route T$1"],
  [/查看全部\s*(\d+)\s*real-world landmarks/g, "View all $1 real-world landmarks"],
  [/查看全部\s*(\d+)\s*routes/g, "View all $1 routes"],
  [/让(.+?)继续Travel/g, "Send $1 back on the journey"],
  [/让(.+?)出发/g, "Send $1"],
  [/旅程时长/g, "Journey duration"],
  [/更换旅伴, 当前为/g, "Change companion, currently "],
  [/Change companion[，,]\s*当前为/g, "Change companion, currently "],
  [/切换到中文/g, "Switch to Chinese"],
  [/真实景点预览/g, " landmark preview"],
  [/real-world landmarks预览/g, " landmark preview"],
  [/Phase 1每个子stops\s*(\d+)\s*min/g, "$1 min per Phase 1 stop"],
  [/Phase 2每个子stops\s*(\d+)\s*min/g, "$1 min per Phase 2 scene"],
  [/查看(.+?)scenes/g, "View $1 scene"],
  [/(.+?)scenes图片/g, "$1 scene images"],
  [/(.+?)图片世界/g, "$1 image world"],
  [/(.+?)\s*·\s*路线总览/g, "$1 · Route overview"],
  [/(.+?)路线总览/g, "$1 · Route overview"],
  [/全屏查看(.+?)路线(?:Routes)?图/g, "View $1 route art full-screen"],
  [/(.+?)已打卡Postcards/g, "$1 checked-in postcards"],
  [/全屏查看(.+?)Postcards/g, "View $1 postcard full-screen"],
  [/(.+?)Postcards的Souvenirs装饰/g, "$1 postcard souvenir decorations"],
  [/跳到(.+?)[，,]\s*(\d+)postcards/g, "Jump to $1, $2 postcards"],
  [/(.+?)路线预览/g, "$1 route preview"],
  [/(.+?)累计点亮(\d+)%/g, "$1 total progress $2%"],
  [/(.+?)Postcards预览/g, "$1 postcard preview"],
  [/(.+?)scenes点亮进度/g, "$1 scene progress"],
  [/(.+?)Postcards的Souvenirs(?:装饰|Decorate)/g, "$1 postcard souvenir decorations"],
  [/Journey时长/g, "Journey duration"],
  [/(.+?)Completedstops照片/g, "$1 completed-stop photos"],
  [/周一/g, "Mon"], [/周二/g, "Tue"], [/周三/g, "Wed"], [/周四/g, "Thu"],
  [/周五/g, "Fri"], [/周六/g, "Sat"], [/周日/g, "Sun"],
  [/，/g, ", "], [/。/g, "."], [/：/g, ": "], [/；/g, "; "], [/、/g, ", "]
];

export function translateText(value) {
  if (!isEnglish() || value == null) return String(value ?? "");
  const source = String(value);
  const leading = source.match(/^\s*/)?.[0] ?? "";
  const trailing = source.match(/\s*$/)?.[0] ?? "";
  const core = source.trim();
  if (!core || !CJK_PATTERN.test(core)) return source;
  let translated = dynamicEn.get(core) ?? core;
  if (translated === core) {
    for (const [pattern, replacement] of SENTENCE_PATTERNS) {
      if (!pattern.test(translated)) continue;
      translated = translated.replace(pattern, replacement);
      break;
    }
  }
  if (CJK_PATTERN.test(translated)) {
    for (const [from, to] of replacements) translated = translated.split(from).join(to);
  }
  for (const [pattern, replacement] of PATTERNS) translated = translated.replace(pattern, replacement);
  translated = translated.replace(/\s+([,.;:])/g, "$1").replace(/\s{2,}/g, " ");
  if (CJK_PATTERN.test(translated) && (source.includes("从") || source.includes("进入"))) {
    translated = "A connected close-up view carries the panorama’s landmarks and atmosphere into the scene.";
  }
  return `${leading}${translated}${trailing}`;
}

export function localizeApp(root, { includeSwitch = true } = {}) {
  const locale = getLocale();
  document.documentElement.lang = locale;
  document.documentElement.dataset.locale = locale;
  if (locale === "en") {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      if (node.parentElement?.closest("script, style")) return;
      node.nodeValue = translateText(node.nodeValue);
    });
    root.querySelectorAll("[aria-label], [title], [placeholder], [alt]").forEach(element => {
      for (const attribute of ["aria-label", "title", "placeholder", "alt"]) {
        if (element.hasAttribute(attribute)) element.setAttribute(attribute, translateText(element.getAttribute(attribute)));
      }
    });
  }
  if (includeSwitch) installLanguageSwitch(root, locale);
}

function installLanguageSwitch(root, locale) {
  root.querySelectorAll("[data-action='toggle-language']").forEach(node => node.remove());
  const button = document.createElement("button");
  button.type = "button";
  button.className = "app-language-switch";
  button.dataset.action = "toggle-language";
  button.textContent = locale === "en" ? "中文" : "EN";
  button.title = locale === "en" ? "Switch to Chinese" : "切换到英文";
  button.setAttribute("aria-label", button.title);
  const statusbar = root.querySelector(".journal-statusbar");
  const settings = statusbar?.querySelector(".journal-settings");
  if (settings) statusbar.insertBefore(button, settings);
}

export function findUntranslatedText(root) {
  if (!isEnglish()) return [];
  const values = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const value = walker.currentNode.nodeValue?.trim();
    if (value && CJK_PATTERN.test(value)) values.push(value);
  }
  root.querySelectorAll("[aria-label], [title], [placeholder], [alt]").forEach(element => {
    for (const attribute of ["aria-label", "title", "placeholder", "alt"]) {
      const value = element.getAttribute(attribute);
      if (value && CJK_PATTERN.test(value)) values.push(value);
    }
  });
  return [...new Set(values)];
}

export function getEnglishTranslationEntries() {
  return [...dynamicEn.entries()];
}

export function getEnglishTranslationRules() {
  const serialize = rules => rules.map(([pattern, replacement]) => ({
    source: pattern.source,
    flags: pattern.flags,
    replacement
  }));
  return {
    sentence: serialize(SENTENCE_PATTERNS),
    post: serialize(PATTERNS)
  };
}
