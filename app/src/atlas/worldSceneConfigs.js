(function () {
  const depthRequirement =
    "foreground / midground / background depth layers, atmospheric perspective, parallax-friendly composition";

  const worldImageBase = "./assets/atlas/landmarks/world-scenes/natgeo-50";
  const parisSubsceneBase = "./assets/atlas/world-scenes/paris/subscenes";
  const tokyoBase = "./assets/atlas/world-scenes/tokyo";

  window.IMAGE_WORLD_SCENES = {
    defaultId: "fr_paris",
    depthRequirement,
    scenes: {
      fr_paris: {
        id: "fr_paris",
        slug: "paris",
        title: "Paris",
        displayName: "巴黎",
        eyebrow: "Atlas / image world",
        subtitle: "bookstore · seine · louvre · eiffel",
        canvasLabel: "巴黎图片世界预览",
        dockLabel: "巴黎景点入口",
        hotspotLabel: "巴黎景点锚点",
        main: {
          imageSrc: `${worldImageBase}/paris_world-01.webp`,
          panelTitle: "Paris panorama",
          depthComposition: "foreground_midground_background",
          generationPromptRule: depthRequirement,
          tone: "brightness(1.12) saturate(1.04) sepia(0.08) contrast(1.01)",
          parallax: 1,
          water: { x0: 0.28, x1: 0.96, y: 0.67, h: 0.22 },
          lights: [
            { x: 0.34, y: 0.53, r: 9 },
            { x: 0.58, y: 0.54, r: 7 },
            { x: 0.78, y: 0.55, r: 8 }
          ]
        },
        subScenes: [
          {
            id: "bookstore",
            label: "书店",
            kicker: "foreground · bookstore",
            title: "巴黎书店",
            copy: "进入左岸书摊近处，能看到书册、明信片、湿润石板路和河岸灯光的局部细节。",
            panelTitle: "Paris bookstore",
            imageSrc: `${parisSubsceneBase}/bookstore_detail_v2.webp`,
            sourceLandmarkName: "Seine bouquinistes",
            visibleAnchorInMain: "主图左下前景的左岸书摊/街角生活锚点",
            depth: "foreground",
            depthComposition: "foreground_midground_background",
            generationPromptRule: depthRequirement,
            focus: { x: 0.24, y: 0.7 },
            target: { x: 0.44, y: 0.56 },
            transitionZoom: 2.05,
            parallax: 1.24,
            hotspot: { xPercent: 24, yPercent: 70, driftWeight: 1 },
            water: { x0: 0.52, x1: 0.98, y: 0.64, h: 0.2 },
            lights: [
              { x: 0.58, y: 0.4, r: 9 },
              { x: 0.33, y: 0.5, r: 7 },
              { x: 0.12, y: 0.72, r: 7 }
            ]
          },
          {
            id: "seine",
            label: "塞纳河",
            kicker: "midground · seine",
            title: "塞纳河",
            copy: "进入塞纳河水面附近，游船、桥洞、岸灯和水面反光成为可停留的局部环境。",
            panelTitle: "Seine riverside",
            imageSrc: `${parisSubsceneBase}/seine_detail_v2.webp`,
            sourceLandmarkName: "Seine riverbanks",
            visibleAnchorInMain: "主图中景的塞纳河水面、桥和岸灯",
            depth: "midground",
            depthComposition: "foreground_midground_background",
            generationPromptRule: depthRequirement,
            focus: { x: 0.55, y: 0.59 },
            target: { x: 0.5, y: 0.56 },
            transitionZoom: 1.92,
            parallax: 1.12,
            hotspot: { xPercent: 55, yPercent: 59, driftWeight: 0.55 },
            water: { x0: 0.22, x1: 0.98, y: 0.65, h: 0.25 },
            lights: [
              { x: 0.68, y: 0.51, r: 7 },
              { x: 0.83, y: 0.51, r: 8 },
              { x: 0.31, y: 0.5, r: 7 }
            ]
          },
          {
            id: "louvre",
            label: "卢浮宫",
            kicker: "midground · louvre",
            title: "卢浮宫",
            copy: "从全景中的玻璃金字塔推进到卢浮宫庭院近处，雨后石板、宫殿立面和金字塔反光成为新的局部世界。",
            panelTitle: "Louvre courtyard",
            imageSrc: `${parisSubsceneBase}/louvre_detail_v2.webp`,
            sourceLandmarkName: "Louvre courtyard",
            visibleAnchorInMain: "主图中远景的卢浮宫方向和玻璃金字塔锚点",
            depth: "midground",
            depthComposition: "foreground_midground_background",
            generationPromptRule: depthRequirement,
            focus: { x: 0.59, y: 0.47 },
            target: { x: 0.53, y: 0.52 },
            transitionZoom: 2.08,
            parallax: 1.02,
            hotspot: { xPercent: 59, yPercent: 47, driftWeight: 0.34 },
            water: { x0: 0.08, x1: 0.92, y: 0.72, h: 0.16 },
            lights: [
              { x: 0.07, y: 0.18, r: 10 },
              { x: 0.28, y: 0.61, r: 7 },
              { x: 0.55, y: 0.63, r: 8 },
              { x: 0.86, y: 0.63, r: 7 }
            ]
          },
          {
            id: "eiffel",
            label: "埃菲尔铁塔",
            kicker: "background · eiffel",
            title: "埃菲尔铁塔",
            copy: "从远景铁塔推进到塔下近处，铁塔钢架、灯光和湿润广场成为新的局部世界。",
            panelTitle: "Eiffel skyline",
            imageSrc: `${parisSubsceneBase}/eiffel_detail_v2.webp`,
            sourceLandmarkName: "Eiffel Tower",
            visibleAnchorInMain: "主图远景的埃菲尔铁塔轮廓和灯光",
            depth: "background",
            depthComposition: "foreground_midground_background",
            generationPromptRule: depthRequirement,
            focus: { x: 0.41, y: 0.35 },
            target: { x: 0.54, y: 0.5 },
            transitionZoom: 2.16,
            parallax: 0.86,
            hotspot: { xPercent: 41, yPercent: 35, driftWeight: 0.22 },
            water: { x0: 0.03, x1: 0.7, y: 0.77, h: 0.12 },
            lights: [
              { x: 0.36, y: 0.68, r: 7 },
              { x: 0.49, y: 0.69, r: 7 },
              { x: 0.73, y: 0.69, r: 8 }
            ]
          }
        ]
      },
      jp_tokyo: {
        id: "jp_tokyo",
        slug: "tokyo",
        title: "Tokyo",
        displayName: "东京",
        eyebrow: "Atlas / image world",
        subtitle: "tokyo tower · sensoji · sumida · shibuya",
        canvasLabel: "东京图片世界预览",
        dockLabel: "东京景点入口",
        hotspotLabel: "东京景点锚点",
        main: {
          imageSrc: `${tokyoBase}/main_world_v1.webp`,
          panelTitle: "Tokyo panorama",
          depthComposition: "foreground_midground_background",
          generationPromptRule: depthRequirement,
          tone: "brightness(1.04) saturate(1.02) contrast(1.02)",
          parallax: 1,
          water: { x0: 0.56, x1: 0.92, y: 0.62, h: 0.16 },
          lights: [
            { x: 0.18, y: 0.39, r: 8 },
            { x: 0.32, y: 0.35, r: 9 },
            { x: 0.56, y: 0.61, r: 8 },
            { x: 0.86, y: 0.34, r: 9 }
          ]
        },
        subScenes: [
          {
            id: "tokyo_tower",
            label: "东京塔",
            kicker: "midground · tokyo tower",
            title: "东京塔",
            copy: "从主图中发光的东京塔推进到雨后街口，近处灯笼、栏杆、塔身钢架和远处楼群形成连续空间。",
            panelTitle: "Tokyo Tower street",
            imageSrc: `${tokyoBase}/subscenes/tokyo_tower_detail_v1.webp`,
            sourceLandmarkName: "Tokyo Tower",
            visibleAnchorInMain: "主图左中位置的红色东京塔塔身和城市灯光",
            depth: "midground",
            depthComposition: "foreground_midground_background",
            generationPromptRule: depthRequirement,
            focus: { x: 0.31, y: 0.31 },
            target: { x: 0.52, y: 0.48 },
            transitionZoom: 2.04,
            parallax: 1.06,
            hotspot: { xPercent: 31, yPercent: 31, driftWeight: 0.52 },
            water: { x0: 0.06, x1: 0.9, y: 0.72, h: 0.16 },
            lights: [
              { x: 0.12, y: 0.27, r: 8 },
              { x: 0.52, y: 0.37, r: 10 },
              { x: 0.84, y: 0.51, r: 7 }
            ]
          },
          {
            id: "sensoji",
            label: "浅草寺",
            kicker: "foreground · sensoji",
            title: "浅草寺",
            copy: "从主图左侧寺门屋檐和灯笼进入浅草寺参道，看到红灯笼、店铺暖光、湿石板与远处城市层次。",
            panelTitle: "Senso-ji approach",
            imageSrc: `${tokyoBase}/subscenes/sensoji_detail_v1.webp`,
            sourceLandmarkName: "Senso-ji Temple",
            visibleAnchorInMain: "主图左前景的寺门屋檐、红灯笼和参道",
            depth: "foreground",
            depthComposition: "foreground_midground_background",
            generationPromptRule: depthRequirement,
            focus: { x: 0.12, y: 0.47 },
            target: { x: 0.44, y: 0.54 },
            transitionZoom: 2.18,
            parallax: 1.24,
            hotspot: { xPercent: 12, yPercent: 47, driftWeight: 0.98 },
            water: { x0: 0.12, x1: 0.9, y: 0.74, h: 0.12 },
            lights: [
              { x: 0.18, y: 0.47, r: 10 },
              { x: 0.39, y: 0.38, r: 9 },
              { x: 0.64, y: 0.44, r: 8 }
            ]
          },
          {
            id: "sumida",
            label: "隅田川",
            kicker: "background · sumida",
            title: "隅田川",
            copy: "从主图右侧河道和晴空塔方向推进到河岸，桥、游船、水面反光和远处天际线保持连续。",
            panelTitle: "Sumida riverside",
            imageSrc: `${tokyoBase}/subscenes/sumida_detail_v1.webp`,
            sourceLandmarkName: "Sumida River and Tokyo Skytree",
            visibleAnchorInMain: "主图右中远景的隅田川水面、桥和晴空塔轮廓",
            depth: "background",
            depthComposition: "foreground_midground_background",
            generationPromptRule: depthRequirement,
            focus: { x: 0.63, y: 0.33 },
            target: { x: 0.52, y: 0.5 },
            transitionZoom: 1.88,
            parallax: 0.92,
            hotspot: { xPercent: 63, yPercent: 33, driftWeight: 0.28 },
            water: { x0: 0.18, x1: 0.96, y: 0.68, h: 0.2 },
            lights: [
              { x: 0.42, y: 0.56, r: 7 },
              { x: 0.68, y: 0.46, r: 8 },
              { x: 0.82, y: 0.55, r: 7 }
            ]
          },
          {
            id: "shibuya",
            label: "涩谷路口",
            kicker: "midground · shibuya",
            title: "涩谷路口",
            copy: "从主图中部的霓虹街口推进到湿润斑马线，伞、人群、楼面灯光和街道纵深增强现场感。",
            panelTitle: "Shibuya crossing",
            imageSrc: `${tokyoBase}/subscenes/shibuya_detail_v1.webp`,
            sourceLandmarkName: "Shibuya Crossing",
            visibleAnchorInMain: "主图中心的霓虹街口、斑马线和密集楼面灯光",
            depth: "midground",
            depthComposition: "foreground_midground_background",
            generationPromptRule: depthRequirement,
            focus: { x: 0.49, y: 0.66 },
            target: { x: 0.5, y: 0.54 },
            transitionZoom: 2.1,
            parallax: 1.18,
            hotspot: { xPercent: 49, yPercent: 66, driftWeight: 0.62 },
            water: { x0: 0.07, x1: 0.96, y: 0.73, h: 0.15 },
            lights: [
              { x: 0.26, y: 0.33, r: 7 },
              { x: 0.55, y: 0.36, r: 10 },
              { x: 0.77, y: 0.42, r: 9 }
            ]
          }
        ]
      }
    }
  };

  Object.assign(window.IMAGE_WORLD_SCENES.scenes, {
    cn_hong_kong: worldScene({
      id: "cn_hong_kong",
      slug: "hong-kong",
      title: "Hong Kong",
      displayName: "香港",
      mainImage: `${worldImageBase}/hong-kong_world-01.webp`,
      subtitle: "harbour · peak · ferry · temple street",
      water: { x0: 0.2, x1: 0.98, y: 0.67, h: 0.22 },
      lights: [{ x: 0.25, y: 0.55, r: 8 }, { x: 0.55, y: 0.5, r: 9 }, { x: 0.78, y: 0.48, r: 8 }],
      subScenes: [
        subScene("victoria_harbour", "维多利亚港", "Victoria Harbour", "hong-kong", "victoria_harbour_detail_v1.png", "主图中景的维多利亚港水面与两岸天际线", { x: 0.55, y: 0.58 }, "midground", { x0: 0.12, x1: 0.98, y: 0.68, h: 0.22 }),
        subScene("the_peak", "太平山", "The Peak", "hong-kong", "the_peak_detail_v1.png", "主图后景的山脊和俯瞰城市视角", { x: 0.43, y: 0.34 }, "background"),
        subScene("star_ferry", "天星小轮", "Star Ferry", "hong-kong", "star_ferry_detail_v1.png", "主图港面的小轮和码头锚点", { x: 0.42, y: 0.66 }, "foreground", { x0: 0.22, x1: 0.94, y: 0.69, h: 0.2 }),
        subScene("temple_street", "庙街", "Temple Street / tram street", "hong-kong", "temple_street_detail_v1.png", "主图城市街区中的霓虹街巷和电车轨道锚点", { x: 0.72, y: 0.63 }, "midground", { x0: 0.08, x1: 0.96, y: 0.74, h: 0.12 })
      ]
    }),
    us_grand_canyon: worldScene({
      id: "us_grand_canyon",
      slug: "grand-canyon",
      title: "Grand Canyon",
      displayName: "大峡谷",
      mainImage: `${worldImageBase}/grand-canyon_world-01.webp`,
      subtitle: "south rim · watchtower · trail · river",
      tone: "brightness(1.06) saturate(1.03) contrast(1.02)",
      subScenes: [
        subScene("mather_point", "南缘观景台", "Mather Point / South Rim", "grand-canyon", "mather_point_detail_v1.png", "主图前中景的峡谷边缘观景平台和栏杆", { x: 0.34, y: 0.56 }, "foreground"),
        subScene("desert_view_watchtower", "沙漠塔", "Desert View Watchtower", "grand-canyon", "desert_view_watchtower_detail_v1.png", "主图远处或边缘的石塔/南缘建筑锚点", { x: 0.72, y: 0.42 }, "background"),
        subScene("bright_angel_trail", "步道", "Bright Angel Trail", "grand-canyon", "bright_angel_trail_detail_v1.png", "主图峡谷墙上的下切步道线条", { x: 0.48, y: 0.64 }, "midground"),
        subScene("colorado_river", "科罗拉多河", "Colorado River overlook", "grand-canyon", "colorado_river_detail_v1.png", "主图峡谷底部的河道或蓝绿水线", { x: 0.58, y: 0.7 }, "background")
      ]
    }),
    amazon_rainforest: worldScene({
      id: "amazon_rainforest",
      slug: "amazon",
      title: "Amazon",
      displayName: "亚马逊雨林",
      mainImage: `${worldImageBase}/amazon_world-01.webp`,
      subtitle: "waters · islands · canopy · dock",
      tone: "brightness(1.05) saturate(1.06) contrast(1.02)",
      water: { x0: 0.05, x1: 0.98, y: 0.64, h: 0.26 },
      subScenes: [
        subScene("meeting_of_waters", "双色河", "Meeting of Waters", "amazon", "meeting_of_waters_detail_v1.png", "主图中可见的蜿蜒河道与两色水面交汇锚点", { x: 0.54, y: 0.58 }, "midground", { x0: 0.04, x1: 0.96, y: 0.66, h: 0.25 }),
        subScene("anavilhanas", "河岛水道", "Anavilhanas river islands", "amazon", "anavilhanas_detail_v1.png", "主图河流分汊和雨林湿地锚点", { x: 0.38, y: 0.55 }, "midground", { x0: 0.12, x1: 0.96, y: 0.63, h: 0.22 }),
        subScene("canopy_walkway", "冠层步道", "Rainforest canopy walkway", "amazon", "canopy_walkway_detail_v1.png", "主图高处树冠和观察平台/高树锚点", { x: 0.58, y: 0.36 }, "background"),
        subScene("riverbank_dock", "河岸码头", "Riverbank community dock", "amazon", "riverbank_dock_detail_v1.png", "主图河岸村落、小屋或木码头锚点", { x: 0.28, y: 0.68 }, "foreground", { x0: 0.18, x1: 0.98, y: 0.7, h: 0.18 })
      ]
    }),
    tz_serengeti: worldScene({
      id: "tz_serengeti",
      slug: "serengeti",
      title: "Serengeti",
      displayName: "塞伦盖蒂",
      mainImage: `${worldImageBase}/serengeti_world-01.webp`,
      subtitle: "migration · acacia · river · kopjes",
      tone: "brightness(1.06) saturate(1.03) contrast(1.02)",
      subScenes: [
        subScene("migration_plain", "迁徙平原", "Great migration plain", "serengeti", "migration_plain_detail_v1.png", "主图远处草原上的迁徙兽群线", { x: 0.55, y: 0.56 }, "midground"),
        subScene("acacia_viewpoint", "金合欢树", "Acacia viewpoint", "serengeti", "acacia_viewpoint_detail_v1.png", "主图中的孤树剪影和观测车/营地锚点", { x: 0.35, y: 0.43 }, "foreground"),
        subScene("river_crossing", "河道穿越", "River crossing", "serengeti", "river_crossing_detail_v1.png", "主图草原中的河流或湿地线", { x: 0.58, y: 0.67 }, "midground", { x0: 0.1, x1: 0.92, y: 0.68, h: 0.18 }),
        subScene("kopjes", "岩丘", "Kopjes outcrop", "serengeti", "kopjes_detail_v1.png", "主图中的低矮岩丘和草原远山锚点", { x: 0.72, y: 0.5 }, "background")
      ]
    }),
    us_hawaii: worldScene({
      id: "us_hawaii",
      slug: "hawaii",
      title: "Hawaii",
      displayName: "夏威夷群岛",
      mainImage: `${worldImageBase}/hawaiian-islands_world-01.webp`,
      subtitle: "waikiki · diamond head · volcanoes · coast",
      water: { x0: 0.06, x1: 0.98, y: 0.66, h: 0.24 },
      subScenes: [
        subScene("waikiki", "Waikiki", "Waikiki Beach", "hawaii", "waikiki_detail_v1.png", "主图海岸线中的沙滩、浪花和冲浪板锚点", { x: 0.36, y: 0.67 }, "foreground", { x0: 0.04, x1: 0.96, y: 0.66, h: 0.24 }),
        subScene("diamond_head", "钻石头山", "Diamond Head", "hawaii", "diamond_head_detail_v1.png", "主图中远景的火山锥轮廓", { x: 0.62, y: 0.42 }, "background"),
        subScene("volcanoes", "火山", "Hawaii Volcanoes", "hawaii", "volcanoes_detail_v1.png", "主图中的火山/熔岩地貌或蒸汽锚点", { x: 0.24, y: 0.48 }, "midground"),
        subScene("coastal_lighthouse", "海岸灯塔", "Coastal lighthouse", "hawaii", "coastal_lighthouse_detail_v1.png", "主图远处海岸线、岩岸或灯塔锚点", { x: 0.78, y: 0.54 }, "background", { x0: 0.08, x1: 0.98, y: 0.7, h: 0.18 })
      ]
    }),
    it_amalfi: worldScene({
      id: "it_amalfi",
      slug: "amalfi",
      title: "Amalfi",
      displayName: "阿马尔菲海岸",
      mainImage: `${worldImageBase}/amalfi-coast_world-01.webp`,
      subtitle: "positano · harbour · ravello · path",
      water: { x0: 0.2, x1: 0.98, y: 0.66, h: 0.22 },
      subScenes: [
        subScene("positano", "Positano", "Positano cliff village", "amalfi", "positano_detail_v1.png", "主图悬崖上的彩色房屋层叠锚点", { x: 0.42, y: 0.5 }, "foreground", { x0: 0.34, x1: 0.98, y: 0.68, h: 0.18 }),
        subScene("amalfi_harbour", "港口", "Amalfi harbour and cathedral", "amalfi", "amalfi_harbour_detail_v1.png", "主图港口、小船或教堂钟楼锚点", { x: 0.58, y: 0.62 }, "midground", { x0: 0.12, x1: 0.96, y: 0.68, h: 0.18 }),
        subScene("ravello_terrace", "Ravello", "Ravello terrace", "amalfi", "ravello_terrace_detail_v1.png", "主图高处露台/花园和海岸俯瞰锚点", { x: 0.68, y: 0.4 }, "background"),
        subScene("path_of_gods", "众神之路", "Path of the Gods", "amalfi", "path_of_gods_detail_v1.png", "主图山崖步道或海岸公路锚点", { x: 0.24, y: 0.47 }, "midground")
      ]
    }),
    gr_greek_islands: worldScene({
      id: "gr_greek_islands",
      slug: "greek-islands",
      title: "Greek Islands",
      displayName: "希腊群岛",
      mainImage: `${worldImageBase}/greek-islands_world-01.webp`,
      subtitle: "oia · caldera · windmill · harbour",
      water: { x0: 0.2, x1: 0.98, y: 0.62, h: 0.22 },
      subScenes: [
        subScene("oia_blue_dome", "蓝顶教堂", "Oia blue dome church", "greek-islands", "oia_blue_dome_detail_v1.png", "主图白墙村中的蓝顶教堂锚点", { x: 0.42, y: 0.43 }, "foreground", { x0: 0.38, x1: 0.98, y: 0.62, h: 0.18 }),
        subScene("caldera_terrace", "Caldera", "Fira caldera terrace", "greek-islands", "caldera_terrace_detail_v1.png", "主图悬崖村镇和火山海湾锚点", { x: 0.58, y: 0.48 }, "midground", { x0: 0.18, x1: 0.98, y: 0.64, h: 0.2 }),
        subScene("windmill_stairs", "风车石阶", "Windmill and stone stairs", "greek-islands", "windmill_stairs_detail_v1.png", "主图中的风车或狭窄白墙石阶锚点", { x: 0.24, y: 0.44 }, "midground"),
        subScene("volcanic_harbour", "火山港口", "Volcanic harbour", "greek-islands", "volcanic_harbour_detail_v1.png", "主图港湾、小船或火山崖锚点", { x: 0.72, y: 0.62 }, "background", { x0: 0.16, x1: 0.98, y: 0.67, h: 0.18 })
      ]
    }),
    eu_alps: worldScene({
      id: "eu_alps",
      slug: "alps",
      title: "Alps",
      displayName: "阿尔卑斯",
      mainImage: `${worldImageBase}/alps_world-01.webp`,
      subtitle: "matterhorn · jungfraujoch · lake · valley",
      subScenes: [
        subScene("matterhorn_zermatt", "Matterhorn", "Matterhorn / Zermatt", "alps", "matterhorn_zermatt_detail_v1.png", "主图远景的金字塔形雪峰和山村屋顶", { x: 0.55, y: 0.32 }, "background"),
        subScene("jungfraujoch", "Jungfraujoch", "Jungfraujoch glacier platform", "alps", "jungfraujoch_detail_v1.png", "主图雪脊、冰川平台或登山铁路锚点", { x: 0.68, y: 0.42 }, "background"),
        subScene("alpine_lake", "山湖", "Alpine lake", "alps", "alpine_lake_detail_v1.png", "主图湖泊倒影和小船/木码头锚点", { x: 0.46, y: 0.62 }, "foreground", { x0: 0.08, x1: 0.96, y: 0.65, h: 0.22 }),
        subScene("lauterbrunnen", "山谷瀑布", "Lauterbrunnen valley", "alps", "lauterbrunnen_detail_v1.png", "主图山谷、瀑布和村庄锚点", { x: 0.28, y: 0.5 }, "midground")
      ]
    }),
    it_tuscany: worldScene({
      id: "it_tuscany",
      slug: "tuscany",
      title: "Tuscany",
      displayName: "托斯卡纳",
      mainImage: `${worldImageBase}/tuscany_world-01.webp`,
      subtitle: "cypress · winery · chapel · old town",
      subScenes: [
        subScene("val_dorcia_cypress", "柏树路", "Val d'Orcia cypress road", "tuscany", "val_dorcia_cypress_detail_v1.png", "主图丘陵中的柏树线和乡间土路锚点", { x: 0.44, y: 0.58 }, "foreground"),
        subScene("vineyard_winery", "葡萄园", "Vineyard and winery", "tuscany", "vineyard_winery_detail_v1.png", "主图中的葡萄田、酒庄或石屋锚点", { x: 0.63, y: 0.52 }, "midground"),
        subScene("vitaleta_chapel", "小礼拜堂", "Vitaleta / San Quirico chapel", "tuscany", "vitaleta_chapel_detail_v1.png", "主图丘陵间的小礼拜堂或农舍锚点", { x: 0.52, y: 0.42 }, "background"),
        subScene("siena_old_town", "古镇", "Siena old town lane", "tuscany", "siena_old_town_detail_v1.png", "主图远处古镇轮廓、红砖塔楼或石巷锚点", { x: 0.76, y: 0.46 }, "midground")
      ]
    }),
    no_norway_coast: worldScene({
      id: "no_norway_coast",
      slug: "norway",
      title: "Norway Coast",
      displayName: "挪威海岸",
      mainImage: `${worldImageBase}/coastal-norway_world-01.webp`,
      subtitle: "fjord · lofoten · lighthouse · ferry",
      water: { x0: 0.1, x1: 0.98, y: 0.62, h: 0.24 },
      subScenes: [
        subScene("geirangerfjord", "峡湾", "Geirangerfjord", "norway", "geirangerfjord_detail_v1.png", "主图中的峡湾水面、峭壁和瀑布锚点", { x: 0.55, y: 0.52 }, "midground", { x0: 0.1, x1: 0.98, y: 0.63, h: 0.24 }),
        subScene("lofoten_fishing_village", "渔村", "Lofoten fishing village", "norway", "lofoten_fishing_village_detail_v1.png", "主图中的红色渔村木屋和山体锚点", { x: 0.35, y: 0.58 }, "foreground", { x0: 0.28, x1: 0.9, y: 0.68, h: 0.16 }),
        subScene("coastal_lighthouse", "灯塔", "Coastal lighthouse", "norway", "coastal_lighthouse_detail_v1.png", "主图远处岩岸、灯塔或海天线锚点", { x: 0.76, y: 0.44 }, "background", { x0: 0.12, x1: 0.98, y: 0.7, h: 0.16 }),
        subScene("fjord_ferry", "渡轮", "Fjord ferry", "norway", "fjord_ferry_detail_v1.png", "主图码头、渡轮航线或峡湾村落灯光锚点", { x: 0.48, y: 0.66 }, "midground", { x0: 0.12, x1: 0.98, y: 0.66, h: 0.22 })
      ]
    }),
    cn_great_wall: worldScene({
      id: "cn_great_wall",
      slug: "great-wall",
      title: "Great Wall",
      displayName: "长城",
      mainImage: `${worldImageBase}/great-wall-of-china_world-01.webp`,
      subtitle: "mutianyu · badaling · jinshanling · forest",
      subScenes: [
        subScene("mutianyu_watchtower", "慕田峪", "Mutianyu watchtowers", "great-wall", "mutianyu_watchtower_detail_v1.png", "主图山脊上连续烽火台和台阶锚点", { x: 0.48, y: 0.5 }, "foreground"),
        subScene("badaling_pass", "八达岭", "Badaling pass", "great-wall", "badaling_pass_detail_v1.png", "主图宽阔修复墙体或城楼关口锚点", { x: 0.36, y: 0.58 }, "midground"),
        subScene("jinshanling_ridge", "金山岭", "Jinshanling ridge", "great-wall", "jinshanling_ridge_detail_v1.png", "主图起伏陡峭的山脊墙线锚点", { x: 0.66, y: 0.44 }, "background"),
        subScene("seasonal_forest_wall", "山林段", "Seasonal forest wall", "great-wall", "seasonal_forest_wall_detail_v1.png", "主图林带或山花/秋林中穿行的城墙锚点", { x: 0.74, y: 0.58 }, "midground")
      ]
    }),
    in_taj_mahal: worldScene({
      id: "in_taj_mahal",
      slug: "taj-mahal",
      title: "Taj Mahal",
      displayName: "泰姬陵",
      mainImage: `${worldImageBase}/taj-mahal_world-01.webp`,
      subtitle: "mausoleum · pool · gateway · yamuna",
      water: { x0: 0.14, x1: 0.86, y: 0.66, h: 0.14 },
      subScenes: [
        subScene("mausoleum", "主陵", "Taj Mahal main mausoleum", "taj-mahal", "mausoleum_detail_v1.png", "主图中心的白色穹顶和四座尖塔", { x: 0.5, y: 0.38 }, "background", { x0: 0.24, x1: 0.76, y: 0.66, h: 0.12 }),
        subScene("reflecting_pool", "倒影水池", "Charbagh reflecting pool", "taj-mahal", "reflecting_pool_detail_v1.png", "主图中轴线上的倒影水池和花园路径", { x: 0.5, y: 0.66 }, "foreground", { x0: 0.18, x1: 0.82, y: 0.66, h: 0.16 }),
        subScene("red_gateway", "红砂岩门楼", "Red sandstone gateway", "taj-mahal", "red_gateway_detail_v1.png", "主图两侧红砂岩门楼/清真寺建筑锚点", { x: 0.25, y: 0.46 }, "midground"),
        subScene("mehtab_bagh_yamuna", "Yamuna 河岸", "Mehtab Bagh / Yamuna", "taj-mahal", "mehtab_bagh_yamuna_detail_v1.png", "主图远处河岸或对岸花园方向锚点", { x: 0.72, y: 0.56 }, "background", { x0: 0.1, x1: 0.9, y: 0.68, h: 0.16 })
      ]
    }),
    eg_giza_pyramids: worldScene({
      id: "eg_giza_pyramids",
      slug: "giza",
      title: "Giza",
      displayName: "吉萨金字塔",
      mainImage: `${worldImageBase}/pyramids_world-01.webp`,
      subtitle: "khufu · sphinx · panorama · museum",
      subScenes: [
        subScene("khufu_pyramid", "胡夫金字塔", "Great Pyramid of Khufu", "giza", "khufu_pyramid_detail_v1.png", "主图中最大的金字塔轮廓和沙漠道路", { x: 0.42, y: 0.42 }, "background"),
        subScene("great_sphinx", "狮身人面像", "Great Sphinx", "giza", "great_sphinx_detail_v1.png", "主图前中景的狮身人面像或低矮石墙锚点", { x: 0.55, y: 0.62 }, "midground"),
        subScene("three_pyramids_view", "三塔视角", "Three-pyramid viewpoint", "giza", "three_pyramids_view_detail_v1.png", "主图可同时看见三座金字塔的全景锚点", { x: 0.62, y: 0.48 }, "background"),
        subScene("grand_egyptian_museum", "博物馆方向", "Grand Egyptian Museum edge", "giza", "grand_egyptian_museum_detail_v1.png", "主图远处开罗/博物馆方向和通往金字塔的现代平台锚点", { x: 0.78, y: 0.56 }, "midground")
      ]
    })
  });

  function worldScene(config) {
    return {
      id: config.id,
      slug: config.slug,
      title: config.title,
      displayName: config.displayName,
      eyebrow: "Atlas / image world",
      subtitle: config.subtitle,
      canvasLabel: `${config.displayName}图片世界预览`,
      dockLabel: `${config.displayName}景点入口`,
      hotspotLabel: `${config.displayName}景点锚点`,
      main: {
        imageSrc: config.mainImage,
        panelTitle: `${config.title} panorama`,
        depthComposition: "foreground_midground_background",
        generationPromptRule: depthRequirement,
        tone: config.tone || "brightness(1.06) saturate(1.03) contrast(1.02)",
        parallax: config.parallax || 1,
        water: config.water,
        lights: config.lights || [
          { x: 0.24, y: 0.5, r: 8 },
          { x: 0.52, y: 0.52, r: 8 },
          { x: 0.76, y: 0.5, r: 7 }
        ]
      },
      subScenes: config.subScenes
    };
  }

  function subScene(id, label, sourceLandmarkName, slug, filename, visibleAnchorInMain, focus, depth, water) {
    const depthWeight = depth === "foreground" ? 0.92 : depth === "midground" ? 0.58 : 0.28;
    const zoom = depth === "foreground" ? 2.12 : depth === "midground" ? 2.02 : 1.86;

    return {
      id,
      label,
      kicker: `${depth} · ${id.replaceAll("_", " ")}`,
      title: label,
      copy: `从主图中可见的${label}锚点推进到更近的细节场景，保持画风、色温、天气和空间方向一致。`,
      panelTitle: sourceLandmarkName,
      imageSrc: `./assets/atlas/world-scenes/${slug}/subscenes/${filename.replace(/\.png$/, ".webp")}`,
      sourceLandmarkName,
      visibleAnchorInMain,
      depth,
      depthComposition: "foreground_midground_background",
      generationPromptRule: depthRequirement,
      focus,
      target: { x: 0.52, y: 0.52 },
      transitionZoom: zoom,
      parallax: depth === "foreground" ? 1.2 : depth === "midground" ? 1.06 : 0.9,
      hotspot: {
        xPercent: Math.round(focus.x * 100),
        yPercent: Math.round(focus.y * 100),
        driftWeight: depthWeight
      },
      water,
      lights: [
        { x: 0.22, y: 0.46, r: 8 },
        { x: 0.52, y: 0.5, r: 9 },
        { x: 0.76, y: 0.52, r: 7 }
      ]
    };
  }
})();
