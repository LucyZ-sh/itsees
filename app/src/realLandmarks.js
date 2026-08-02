import { resolveWeatherVisual } from "./weatherVisuals.js";

export const landmarkCategories = [
  { id: "urban_spaces", label: "城市空间", english: "Urban Spaces" },
  { id: "wild_places", label: "野性之地", english: "Wild Places" },
  { id: "paradise_found", label: "天堂胜境", english: "Paradise Found" },
  { id: "country_unbound", label: "乡野无界", english: "Country Unbound" },
  { id: "world_wonders", label: "世界奇观", english: "World Wonders" }
];

const postcardImageDetails = {
  fr_paris: {
    alt: "Q版巴黎多地标明信片：埃菲尔铁塔、塞纳河、卢浮宫金字塔、巴黎圣母院和凯旋门",
    referenceTitle: "Eiffel Tower from Trocadero / Paris landmark postcards",
    referenceUrl: "https://commons.wikimedia.org/wiki/Category:Eiffel_Tower_seen_from_Trocad%C3%A9ro",
    stylePromptSubject: "埃菲尔铁塔、塞纳河桥、卢浮宫金字塔、巴黎圣母院、凯旋门、战神广场绿地"
  },
  jp_tokyo: {
    alt: "Q版东京多地标明信片：东京塔、浅草寺、涩谷街口、晴空塔和富士山远景",
    referenceTitle: "Tokyo Tower and Tokyo city landmark views",
    referenceUrl: "https://commons.wikimedia.org/wiki/Category:Tokyo_Tower",
    stylePromptSubject: "东京塔、浅草寺雷门、涩谷街口、晴空塔、隅田川、樱花街道、富士山远景"
  },
  cn_hong_kong: {
    alt: "Q版香港多地标明信片：维多利亚港、中环天际线、太平山、天星小轮和叮叮车",
    referenceTitle: "Victoria Harbour from Victoria Peak",
    referenceUrl: "https://commons.wikimedia.org/wiki/Category:Views_of_Hong_Kong_from_Victoria_Peak",
    stylePromptSubject: "维多利亚港、中环天际线、太平山、天星小轮、叮叮车、港湾灯光"
  },
  us_grand_canyon: {
    alt: "Q版大峡谷多地标明信片：红岩峡谷、科罗拉多河、南缘观景台和历史瞭望塔",
    referenceTitle: "Grand Canyon classic viewpoint photos",
    referenceUrl: "https://commons.wikimedia.org/wiki/Category:Grand_Canyon",
    stylePromptSubject: "红岩峡谷层理、科罗拉多河、南缘观景台、历史瞭望塔、步道、日落台地"
  },
  amazon_rainforest: {
    alt: "Q版亚马逊雨林多地标明信片：蜿蜒河道、雨林冠层、湿地、河岸村落和观察站",
    referenceTitle: "Amazon Rainforest aerial river and canopy views",
    referenceUrl: "https://commons.wikimedia.org/wiki/Category:Amazon_Rainforest",
    stylePromptSubject: "亚马逊河支流、雨林冠层、湿地、河岸村落、小船码头、生态观察站"
  },
  tz_serengeti: {
    alt: "Q版塞伦盖蒂多地标明信片：草原、金合欢树、迁徙兽群、观测车辆和营地灯光",
    referenceTitle: "Serengeti National Park landscape views",
    referenceUrl: "https://commons.wikimedia.org/wiki/Category:Serengeti_National_Park",
    stylePromptSubject: "草原地平线、金合欢树、迁徙兽群、观测车辆、营地灯光、晨光尘土"
  },
  us_hawaii: {
    alt: "Q版夏威夷群岛多地标明信片：钻石头山、Waikiki海岸、火山、冲浪海湾和灯塔",
    referenceTitle: "Diamond Head and Waikiki postcard views",
    referenceUrl: "https://commons.wikimedia.org/wiki/Category:Diamond_Head,_Hawaii",
    stylePromptSubject: "钻石头山、Waikiki海岸、火山、冲浪海湾、椰林、灯塔、彩虹"
  },
  it_amalfi: {
    alt: "Q版阿马尔菲海岸多地标明信片：Positano悬崖村镇、柠檬园、港口和钟楼",
    referenceTitle: "Positano and Amalfi Coast cliffside village views",
    referenceUrl: "https://commons.wikimedia.org/wiki/Category:Positano",
    stylePromptSubject: "Positano悬崖村镇、彩色房屋、地中海、小港口、柠檬园、教堂钟楼、海岸公路"
  },
  gr_greek_islands: {
    alt: "Q版希腊群岛多地标明信片：圣托里尼蓝顶教堂、白墙村镇、爱琴海、港口和风车",
    referenceTitle: "Oia Santorini blue domes and Aegean views",
    referenceUrl: "https://commons.wikimedia.org/wiki/Category:Oia,_Santorini",
    stylePromptSubject: "圣托里尼蓝顶教堂、白墙村镇、爱琴海、港口、风车、石阶小巷、火山岛崖壁"
  },
  eu_alps: {
    alt: "Q版阿尔卑斯多地标明信片：雪山、湖泊、山村木屋、缆车和牧场",
    referenceTitle: "Matterhorn and Alpine lake postcard views",
    referenceUrl: "https://commons.wikimedia.org/wiki/Category:Matterhorn",
    stylePromptSubject: "马特洪峰式雪山、湖泊倒影、山村木屋、登山缆车、牧场、针叶林、滑雪小镇"
  },
  it_tuscany: {
    alt: "Q版托斯卡纳多地标明信片：Val d'Orcia丘陵、柏树路、葡萄园、古镇和酒庄",
    referenceTitle: "Val d'Orcia Tuscany cypress road and rolling hills",
    referenceUrl: "https://commons.wikimedia.org/wiki/Category:Val_d%27Orcia",
    stylePromptSubject: "Val d'Orcia丘陵、柏树路、葡萄园、橄榄园、古镇、酒庄、石砌农舍、乡间教堂"
  },
  no_norway_coast: {
    alt: "Q版挪威海岸多地标明信片：峡湾、瀑布、悬崖、红色渔村、渡轮和灯塔",
    referenceTitle: "Geirangerfjord and Norwegian fjord postcard views",
    referenceUrl: "https://commons.wikimedia.org/wiki/Category:Geirangerfjord",
    stylePromptSubject: "Geirangerfjord式峡湾、瀑布、悬崖、红色木屋、渔村、渡轮、海岸灯塔、雪线"
  },
  cn_great_wall: {
    alt: "Q版长城多地标明信片：山脊城墙、烽火台、关口、石阶和秋季林带",
    referenceTitle: "Great Wall at Jinshanling and Mutianyu mountain ridge views",
    referenceUrl: "https://commons.wikimedia.org/wiki/Category:Jinshanling",
    stylePromptSubject: "山脊城墙、烽火台、关口、石阶步道、秋季林带、远山云雾"
  },
  in_taj_mahal: {
    alt: "Q版泰姬陵多地标明信片：白色陵墓、倒影水池、花园轴线、门楼和附属清真寺",
    referenceTitle: "Taj Mahal reflecting pool frontal views",
    referenceUrl: "https://commons.wikimedia.org/wiki/Category:Taj_Mahal",
    stylePromptSubject: "泰姬陵主体、倒影水池、花园轴线、门楼、清真寺附属建筑、亚穆纳河、晨雾"
  },
  eg_giza_pyramids: {
    alt: "Q版吉萨金字塔多地标明信片：金字塔群、狮身人面像、沙漠、古道和星空",
    referenceTitle: "Great Sphinx and Giza pyramid complex views",
    referenceUrl: "https://commons.wikimedia.org/wiki/Category:Giza_pyramid_complex",
    stylePromptSubject: "吉萨金字塔群、狮身人面像、沙漠、古道、远处城市边缘、热浪、星空"
  }
};

function resolvePostcardImage(landmarkId) {
  return {
    src: `./assets/atlas/landmarks/q/${landmarkId}.webp`,
    ...postcardImageDetails[landmarkId]
  };
}

export const realLandmarks = [
  {
    id: "fr_paris",
    name: "巴黎",
    englishName: "Paris",
    country: "法国",
    coordinates: { lat: 48.8584, lng: 2.2945 },
    categoryId: "urban_spaces",
    sceneClass: "paris",
    summary: "塞纳河、铁塔和雨后街灯组成的城市明信片。",
    flyover: "从塞纳河水面或屋顶高度切入，掠过铁塔、桥梁和夜间街灯。",
    naturalLandmarks: ["塞纳河", "战神广场", "城市屋顶线"],
    humanLandmarks: ["埃菲尔铁塔", "卢浮宫", "巴黎圣母院", "凯旋门"],
    foods: ["可丽饼", "羊角面包", "马卡龙", "热巧克力"],
    weatherFocus: ["雨线", "薄雾", "晴光"],
    collectibles: ["小铁塔票根", "塞纳河明信片", "马卡龙贴纸"],
    visualHint: "铁塔剪影",
    palette: ["#406d79", "#f0c76f", "#f8efe1"],
    postcardImage: resolvePostcardImage("fr_paris")
  },
  {
    id: "jp_tokyo",
    name: "东京",
    englishName: "Tokyo",
    country: "日本",
    coordinates: { lat: 35.6586, lng: 139.7454 },
    categoryId: "urban_spaces",
    sceneClass: "tokyo",
    summary: "传统寺社、城市塔和霓虹街口并置的高密度都市。",
    flyover: "从城市高空切入，以富士山远景、塔和霓虹街口建立识别。",
    naturalLandmarks: ["富士山远景", "隅田川", "樱花街道"],
    humanLandmarks: ["东京塔", "浅草寺", "涩谷街口", "晴空塔"],
    foods: ["寿司", "拉面", "鲷鱼烧", "抹茶饮品"],
    weatherFocus: ["梅雨细雨", "霓虹微光", "风线"],
    collectibles: ["樱花御守", "拉面券", "东京塔小挂件"],
    visualHint: "城市塔",
    palette: ["#2d4f67", "#e86458", "#f7d5cf"],
    postcardImage: resolvePostcardImage("jp_tokyo")
  },
  {
    id: "cn_hong_kong",
    name: "香港",
    englishName: "Hong Kong",
    country: "中国",
    coordinates: { lat: 22.2948, lng: 114.1722 },
    categoryId: "urban_spaces",
    sceneClass: "hong-kong",
    summary: "维多利亚港、山海城市和夜间天际线。",
    flyover: "从海面贴近飞行，穿过港口、渡轮、山顶视角和夜间天际线。",
    naturalLandmarks: ["维多利亚港", "太平山", "海雾港湾"],
    humanLandmarks: ["天星小轮", "中环天际线", "叮叮车", "庙街夜市"],
    foods: ["点心", "菠萝包", "蛋挞", "丝袜奶茶"],
    weatherFocus: ["海雾", "阵雨", "港湾灯光微闪"],
    collectibles: ["小渡轮票", "蛋挞纸袋", "霓虹招牌贴纸"],
    visualHint: "港口天际线",
    palette: ["#24455b", "#f2b84b", "#d7f0f2"],
    postcardImage: resolvePostcardImage("cn_hong_kong")
  },
  {
    id: "us_grand_canyon",
    name: "大峡谷",
    englishName: "Grand Canyon",
    country: "美国",
    coordinates: { lat: 36.1069, lng: -112.1129 },
    categoryId: "wild_places",
    sceneClass: "grand-canyon",
    summary: "科罗拉多河切出的红色峡谷和强烈日照。",
    flyover: "从峡谷边缘俯冲，沿科罗拉多河和岩层切线飞行。",
    naturalLandmarks: ["科罗拉多河", "峡谷岩层", "南缘观景台", "沙漠高原"],
    humanLandmarks: ["观景步道", "游客中心", "历史瞭望塔", "河上漂流活动"],
    foods: ["美西烧烤", "苹果派", "玉米面包", "冰柠檬水"],
    weatherFocus: ["热浪", "沙尘", "日落光晕"],
    collectibles: ["红岩小石片", "漂流贴纸", "观景台印章"],
    visualHint: "红岩峡谷",
    palette: ["#923f2f", "#e6a64e", "#f6d9a4"],
    postcardImage: resolvePostcardImage("us_grand_canyon")
  },
  {
    id: "amazon_rainforest",
    name: "亚马逊雨林",
    englishName: "Amazon Rainforest",
    country: "南美洲",
    coordinates: { lat: -3.4653, lng: -62.2159 },
    categoryId: "wild_places",
    sceneClass: "amazon",
    summary: "雨林冠层、蜿蜒河道和暴雨后的湿润空气。",
    flyover: "从雨林冠层上方掠过，切到蜿蜒河道、暴雨和晨雾。",
    naturalLandmarks: ["亚马逊河支流", "雨林冠层", "湿地", "林间雾气"],
    humanLandmarks: ["河岸村落", "小船码头", "生态观察站", "手工集市"],
    foods: ["木薯制品", "巴西莓", "烤鱼", "热带水果汁"],
    weatherFocus: ["暴雨", "林间雾气", "水面反光"],
    collectibles: ["雨林叶片书签", "小船票", "巴西莓杯贴纸"],
    visualHint: "雨林河道",
    palette: ["#275a3e", "#77a857", "#d9e9c5"],
    postcardImage: resolvePostcardImage("amazon_rainforest")
  },
  {
    id: "tz_serengeti",
    name: "塞伦盖蒂",
    englishName: "Serengeti",
    country: "坦桑尼亚",
    coordinates: { lat: -2.3333, lng: 34.8333 },
    categoryId: "wild_places",
    sceneClass: "serengeti",
    summary: "草原地平线、金合欢树和晨光里的尘土。",
    flyover: "低空掠过草原、金合欢树和远处兽群，以晨光制造速度感。",
    naturalLandmarks: ["草原", "迁徙兽群", "金合欢树", "远山地平线"],
    humanLandmarks: ["生态保护区入口", "观测车辆", "营地灯光", "当地集市意象"],
    foods: ["乌伽黎", "烤肉", "椰香米饭", "茶饮"],
    weatherFocus: ["晨雾", "旱季尘土", "金色日落"],
    collectibles: ["草原观察笔记", "金合欢叶标本", "营地贴纸"],
    visualHint: "草原树影",
    palette: ["#8a642e", "#d8a646", "#f1dfae"],
    postcardImage: resolvePostcardImage("tz_serengeti")
  },
  {
    id: "us_hawaii",
    name: "夏威夷群岛",
    englishName: "Hawaiian Islands",
    country: "美国",
    coordinates: { lat: 19.8968, lng: -155.5828 },
    categoryId: "paradise_found",
    sceneClass: "hawaii",
    summary: "海浪、火山远景、彩虹和热带雨。",
    flyover: "从海浪和火山地貌之间切换，以热带雨、彩虹和日落形成明快氛围。",
    naturalLandmarks: ["火山", "海滩", "冲浪海湾", "椰林"],
    humanLandmarks: ["海边小镇", "冲浪板店", "传统音乐舞台", "灯塔"],
    foods: ["Poke", "刨冰", "烤猪", "菠萝汁"],
    weatherFocus: ["热带雨", "彩虹", "海风线"],
    collectibles: ["冲浪板贴纸", "彩虹刨冰券", "火山明信片"],
    visualHint: "海浪火山",
    palette: ["#1f7a85", "#f0bd51", "#d7f3e8"],
    postcardImage: resolvePostcardImage("us_hawaii")
  },
  {
    id: "it_amalfi",
    name: "阿马尔菲海岸",
    englishName: "Amalfi Coast",
    country: "意大利",
    coordinates: { lat: 40.634, lng: 14.6027 },
    categoryId: "paradise_found",
    sceneClass: "amalfi",
    summary: "悬崖村镇、柠檬园和地中海日落。",
    flyover: "沿悬崖海岸线滑行，经过彩色村镇、柠檬园和海上夕照。",
    naturalLandmarks: ["悬崖海岸", "地中海海面", "柠檬园", "弯曲海岸公路"],
    humanLandmarks: ["海岸村镇", "教堂钟楼", "小港口", "露台餐厅"],
    foods: ["柠檬酒", "海鲜意面", "披萨", "意式冰淇淋"],
    weatherFocus: ["海风", "薄雾", "日落光晕"],
    collectibles: ["柠檬贴纸", "小港口票根", "蓝海明信片"],
    visualHint: "悬崖海岸",
    palette: ["#2f7f93", "#f2c652", "#f6e5bf"],
    postcardImage: resolvePostcardImage("it_amalfi")
  },
  {
    id: "gr_greek_islands",
    name: "希腊群岛",
    englishName: "Greek Islands",
    country: "希腊",
    coordinates: { lat: 36.3932, lng: 25.4615 },
    categoryId: "paradise_found",
    sceneClass: "greek-islands",
    summary: "白墙蓝顶、爱琴海和黄昏海风。",
    flyover: "从爱琴海上升到白墙蓝顶村镇，再切向港口、日落和海风。",
    naturalLandmarks: ["爱琴海", "火山岛崖壁", "海湾", "日落天际线"],
    humanLandmarks: ["圣托里尼白墙蓝顶", "港口", "风车", "石阶小巷"],
    foods: ["希腊沙拉", "烤肉卷", "希腊酸奶", "蜂蜜甜点"],
    weatherFocus: ["强日照", "海风", "黄昏光"],
    collectibles: ["蓝顶小屋贴纸", "海风贝壳", "酸奶杯卡片"],
    visualHint: "蓝顶海湾",
    palette: ["#2d6b9f", "#f5f7ee", "#bfe2f2"],
    postcardImage: resolvePostcardImage("gr_greek_islands")
  },
  {
    id: "eu_alps",
    name: "阿尔卑斯",
    englishName: "Alps",
    country: "欧洲",
    coordinates: { lat: 46.8876, lng: 9.657 },
    categoryId: "country_unbound",
    sceneClass: "alps",
    summary: "雪山、湖泊、牧场和山村木屋。",
    flyover: "从山谷牧场升空，穿过湖泊倒影、雪线和山雾。",
    naturalLandmarks: ["雪山", "牧场", "湖泊", "针叶林"],
    humanLandmarks: ["山村木屋", "登山缆车", "牧场小径", "滑雪小镇"],
    foods: ["奶酪火锅", "热巧克力", "苹果派", "香肠"],
    weatherFocus: ["雪粒", "山雾", "晴空光"],
    collectibles: ["缆车票", "雪山徽章", "奶酪锅贴纸"],
    visualHint: "雪山湖泊",
    palette: ["#446f83", "#d8eef2", "#f7fbfb"],
    postcardImage: resolvePostcardImage("eu_alps")
  },
  {
    id: "it_tuscany",
    name: "托斯卡纳",
    englishName: "Tuscany",
    country: "意大利",
    coordinates: { lat: 43.7711, lng: 11.2486 },
    categoryId: "country_unbound",
    sceneClass: "tuscany",
    summary: "丘陵、葡萄园、柏树路和古镇广场。",
    flyover: "低空掠过柏树路、金色丘陵和葡萄园，切到古镇广场。",
    naturalLandmarks: ["丘陵", "葡萄园", "柏树路", "橄榄园"],
    humanLandmarks: ["古镇", "酒庄", "石砌农舍", "乡间教堂"],
    foods: ["意面", "托斯卡纳牛排", "葡萄酒", "橄榄油面包"],
    weatherFocus: ["金色黄昏", "薄雾", "雨后田野"],
    collectibles: ["葡萄叶标本", "酒庄明信片", "橄榄油小票"],
    visualHint: "金色丘陵",
    palette: ["#6e793f", "#d8aa4f", "#f1dfba"],
    postcardImage: resolvePostcardImage("it_tuscany")
  },
  {
    id: "no_norway_coast",
    name: "挪威海岸",
    englishName: "Norway Coast",
    country: "挪威",
    coordinates: { lat: 60.3913, lng: 5.3221 },
    categoryId: "country_unbound",
    sceneClass: "norway",
    summary: "峡湾、悬崖、渔村和冷色海雾。",
    flyover: "沿峡湾水面推进，经过瀑布、悬崖、渔村和冬季雪光。",
    naturalLandmarks: ["峡湾", "悬崖", "瀑布", "北方海岸"],
    humanLandmarks: ["渔村", "红色木屋", "渡轮码头", "海岸灯塔"],
    foods: ["三文鱼", "鳕鱼", "华夫饼", "热咖啡"],
    weatherFocus: ["海雾", "阴雨", "冬季雪光"],
    collectibles: ["峡湾船票", "红木屋贴纸", "灯塔徽章"],
    visualHint: "峡湾渔村",
    palette: ["#31576c", "#9fc6cf", "#eef5f2"],
    postcardImage: resolvePostcardImage("no_norway_coast")
  },
  {
    id: "cn_great_wall",
    name: "长城",
    englishName: "Great Wall",
    country: "中国",
    coordinates: { lat: 40.4319, lng: 116.5704 },
    categoryId: "world_wonders",
    sceneClass: "great-wall",
    summary: "山脊、城墙、烽火台和秋风里的远山。",
    flyover: "顺山脊飞越城墙和烽火台，以晨雾、秋色或雪景建立纵深。",
    naturalLandmarks: ["山脊", "秋季林带", "雪后山坡", "远山云雾"],
    humanLandmarks: ["城墙", "烽火台", "关口", "石阶步道"],
    foods: ["北京烤鸭", "炸酱面", "糖葫芦", "热豆浆"],
    weatherFocus: ["薄雾", "秋风", "雪粒"],
    collectibles: ["烽火台印章", "城砖纹贴纸", "糖葫芦小签"],
    visualHint: "山脊城墙",
    palette: ["#6a6f3f", "#be8b47", "#ead8b5"],
    postcardImage: resolvePostcardImage("cn_great_wall")
  },
  {
    id: "in_taj_mahal",
    name: "泰姬陵",
    englishName: "Taj Mahal",
    country: "印度",
    coordinates: { lat: 27.1751, lng: 78.0421 },
    categoryId: "world_wonders",
    sceneClass: "taj-mahal",
    summary: "白色陵墓、倒影水池和晨雾花园轴线。",
    flyover: "从水池倒影抬升到白色陵墓，再切向花园轴线和晨雾。",
    naturalLandmarks: ["亚穆纳河", "花园轴线", "晨雾", "水池倒影"],
    humanLandmarks: ["泰姬陵主体", "清真寺附属建筑", "门楼", "花园步道"],
    foods: ["咖喱", "印度奶茶", "甜点", "烤饼"],
    weatherFocus: ["晨雾", "季风雨", "日落暖光"],
    collectibles: ["倒影明信片", "奶茶杯贴纸", "花园门票"],
    visualHint: "白色陵墓",
    palette: ["#5c7180", "#f2ede3", "#d4b374"],
    postcardImage: resolvePostcardImage("in_taj_mahal")
  },
  {
    id: "eg_giza_pyramids",
    name: "金字塔",
    englishName: "Pyramids of Giza",
    country: "埃及",
    coordinates: { lat: 29.9792, lng: 31.1342 },
    categoryId: "world_wonders",
    sceneClass: "giza",
    summary: "沙漠热浪里的金字塔棱线和夜空星光。",
    flyover: "从沙漠热浪中推进，掠过金字塔棱线和狮身人面像轮廓。",
    naturalLandmarks: ["沙漠", "晴夜星空", "热浪", "远处城市边缘"],
    humanLandmarks: ["吉萨金字塔", "狮身人面像", "古道", "博物馆候选"],
    foods: ["烤肉", "鹰嘴豆泥", "薄饼", "薄荷茶"],
    weatherFocus: ["热浪", "沙尘", "晴夜星光"],
    collectibles: ["金字塔印章", "沙色纸莎草贴纸", "薄荷茶杯卡"],
    visualHint: "沙漠金字塔",
    palette: ["#9b6b35", "#e7b85e", "#f1dcad"],
    postcardImage: resolvePostcardImage("eg_giza_pyramids")
  }
];

const weatherByFocus = new Map([
  ["雨线", "soft-rain"],
  ["梅雨细雨", "soft-rain"],
  ["阵雨", "soft-rain"],
  ["暴雨", "soft-rain"],
  ["季风雨", "soft-rain"],
  ["海雾", "morning-fog"],
  ["薄雾", "morning-fog"],
  ["林间雾气", "morning-fog"],
  ["山雾", "morning-fog"],
  ["晨雾", "morning-fog"],
  ["雪粒", "light-snow"],
  ["冬季雪光", "light-snow"],
  ["海风线", "gentle-wind"],
  ["海风", "gentle-wind"],
  ["秋风", "gentle-wind"],
  ["风线", "gentle-wind"],
  ["晴光", "sunny-glow"],
  ["晴空光", "sunny-glow"],
  ["日落光晕", "sunny-glow"],
  ["日落暖光", "sunny-glow"],
  ["黄昏光", "sunny-glow"],
  ["金色黄昏", "sunny-glow"],
  ["强日照", "sunny-glow"],
  ["热带雨", "soft-rain"],
  ["热浪", "heat-haze"],
  ["沙尘", "dust-drift"],
  ["旱季尘土", "dust-drift"],
  ["水面反光", "water-reflection"],
  ["彩虹", "rainbow-arc"],
  ["霓虹微光", "night-glow"],
  ["港湾灯光微闪", "night-glow"],
  ["晴夜星光", "night-glow"],
  ["雨后田野", "water-reflection"]
]);

export function getLandmarkCategory(categoryId) {
  return landmarkCategories.find(category => category.id === categoryId) ?? landmarkCategories[0];
}

export function listRealLandmarks(categoryId = "all") {
  if (categoryId === "all") return realLandmarks;
  return realLandmarks.filter(landmark => landmark.categoryId === categoryId);
}

export function getRealLandmark(landmarkId) {
  return realLandmarks.find(landmark => landmark.id === landmarkId) ?? realLandmarks[0];
}

export function resolveLandmarkWeatherSnapshot(landmark, now = new Date()) {
  const dayKey = now.toISOString().slice(0, 10);
  const focus = landmark.weatherFocus[hashSeed(`${landmark.id}:${dayKey}`) % landmark.weatherFocus.length];
  const visualId = weatherByFocus.get(focus);
  const visual = visualId ? resolveWeatherVisual(visualId) : resolveWeatherVisual(`${landmark.id}:${focus}`);
  const temperatureC = resolveTemperature(landmark.categoryId, hashSeed(`${dayKey}:${landmark.id}:temp`));
  return {
    id: `local-${landmark.id}-${dayKey}`,
    provider: "local_simulated",
    label: focus,
    temperatureC,
    localDate: dayKey,
    sourceText: "本地模拟天气",
    isFallback: true,
    visual
  };
}

export function getAtlasStats() {
  return {
    total: realLandmarks.length,
    categories: landmarkCategories.length,
    approved: realLandmarks.length
  };
}

function resolveTemperature(categoryId, seed) {
  const ranges = {
    urban_spaces: [12, 28],
    wild_places: [18, 35],
    paradise_found: [22, 31],
    country_unbound: [-2, 22],
    world_wonders: [14, 34]
  };
  const [min, max] = ranges[categoryId] ?? [12, 28];
  return min + (seed % (max - min + 1));
}

function hashSeed(seed) {
  return String(seed).split("").reduce((hash, char) => {
    return (hash * 33 + char.charCodeAt(0)) >>> 0;
  }, 23);
}
