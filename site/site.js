(() => {
  "use strict";

  const STORAGE_KEY = "itsees-site-language";
  const translations = {
    en: {
      documentTitle: "Itsees — The world is wide. Let it take you there.",
      metaDescription: "Itsees is a local-first desktop companion that travels while you focus, bringing home maps, postcards, and small keepsakes.",
      ogDescription: "Every place it sees, it brings home to you.",
      skip: "Skip to the journal",
      primaryNav: "Primary navigation",
      languageLabel: "Language",
      footerNav: "Footer navigation",
      navJourney: "Journey",
      navAtlas: "Atlas",
      navKeepsakes: "Keepsakes",
      navInstall: "Install",
      heroEyebrow: "A desktop travel companion",
      heroTitle: "The world is wide. Let it take you there.<br><span>Every place it sees, it brings home to you.</span>",
      heroTagline: "A little traveler for your long days.",
      heroBody: "While you focus, your tiny companion wanders through storybook routes and real places. Then it comes home with a map, a postcard, and something small to remember.",
      download: "Download",
      comingSoon: "Beta · Coming soon",
      seeJourney: "See how the journey works <span aria-hidden=\"true\">↓</span>",
      platformLabel: "For",
      platformValue: "macOS · Apple Silicon",
      paceLabel: "Travel pace",
      paceValue: "A full journey in 4 hours",
      marginNote: "made for unhurried days",
      parisNote: "A travel note from Paris",
      parisAlt: "Itsees visiting a sunlit Paris street near the Eiffel Tower",
      parisCaption: "An afternoon found in Paris",
      heroHandNote: "What I see,<br>I bring home.",
      destinationCount: "places waiting to be found",
      openJournal: "Open the journal",
      journeyEyebrow: "Four hours, quietly unfolding",
      journeyTitle: "Leave the window open.<br>Let the world unfold.",
      journeyIntro: "Itsees turns quiet working time into a journey you can return to. No streaks, no pressure, and no screen asking for attention.",
      step1Title: "Choose a destination",
      step1Body: "Pack a small bag, pick a route, and send your companion off.",
      step2Title: "Go on with your day",
      step2Body: "The journey moves locally on your desktop while you work, read, or rest.",
      step3Title: "Watch the map fill in",
      step3Body: "Storybook routes reveal a scene every 20 minutes; real places unfold every hour.",
      step4Title: "Welcome them home",
      step4Body: "A completed trip returns with a postcard, a souvenir, and a line in your travel history.",
      journeyImageAlt: "The Itsees desktop app showing an active journey",
      journeyImageCaption: "A journey stays quietly in the background, ready whenever you look back.",
      journeyInspect: "Open the full-size Itsees Journey screenshot in a new tab",
      journeyWindow: "Journey",
      inspectFull: "View full size ↗",
      atlasEyebrow: "Two atlases, one small traveler",
      atlasCoordinate: "15 illustrated routes · 15 real places",
      atlasTitle: "Some places are imagined.<br>Some are waiting outside.",
      storybookAlt: "A hand-painted storybook route map",
      storybookTitle: "Storybook routes",
      storybookBody: "Painted worlds built for small, gentle detours, from tea gardens to starlit coasts.",
      storybookNote: "12 scenes · one revealed every 20 minutes",
      realAlt: "A postcard from the real-world Paris journey",
      realTitle: "Real-world places",
      realBody: "Landmarks gathered into a quiet world atlas, each with its own local weather and travel page.",
      realNote: "4 scenes · one revealed every 60 minutes",
      worldMapAlt: "The Itsees hand-drawn world atlas",
      mapCaption: "Thirty places, connected slowly.",
      keepsakesEyebrow: "A drawer of small things",
      keepsakesTitle: "Every trip leaves<br>a little evidence.",
      keepsakeImageAlt: "Postcards and souvenirs collected inside Itsees",
      keepsakeImageCaption: "Postcards keep what it felt like.",
      keepsakeInspect: "Open the full-size Itsees Travel Collection screenshot in a new tab",
      keepsakeWindow: "Travel Collection",
      travelerQuote: "“The rain stopped just before I got there. I saved you the view.”",
      travelerQuoteBy: "— a note brought home",
      postcardsTitle: "Postcards",
      postcardsBody: "A visual memory from every successful check-in.",
      souvenirsTitle: "Souvenirs",
      souvenirsBody: "Small objects found along the way, kept together in your collection.",
      historyTitle: "Travel history",
      historyBody: "A quiet record of departures, returns, partial routes, and completed days.",
      localEyebrow: "Made to live on your desk",
      localTitle: "Your journeys belong to you.",
      localBody: "Itsees is local-first. Your travel state and collection stay on your computer, so the companion feels less like a service and more like something that simply lives beside you.",
      localItem1: "No account required for the beta",
      localItem2: "Deterministic local weather fallback",
      localItem3: "Pause, recall, and continue a route",
      installEyebrow: "A short note before departure",
      installTitle: "Installation guide",
      installIntro: "Itsees currently supports Apple Silicon Macs. The whole setup takes only a moment.",
      installStep1: "Download the DMG from this official page.",
      installStep2: "Open the DMG, then drag Itsees into the Applications folder.",
      installStep3: "Open Itsees. If macOS stops the first launch, go to System Settings → Privacy &amp; Security, choose Open Anyway, then confirm Open.",
      checksumLabel: "DMG SHA-256",
      teddyAlt: "The Itsees teddy traveler waving from the Great Wall",
      finalEyebrow: "The first public departure is ready",
      finalTitle: "Keep a place<br>in your day.",
      finalBody: "Itsees is ready for Apple Silicon Macs. Let the little traveler set off.",
      footerLine: "Small journeys for long days.",
      github: "GitHub",
      support: "Support",
      privacy: "Privacy",
    },
    zh: {
      documentTitle: "Itsees — 世界这么大，让它替你先看看",
      metaDescription: "Itsees 是一款本地优先的桌面旅行伴侣。在你专注时替你远行，带回地图、明信片与小小纪念品。",
      ogDescription: "它见过的世界，都会带回来给你。",
      skip: "跳到旅行手帐",
      primaryNav: "主导航",
      languageLabel: "语言",
      footerNav: "页脚导航",
      navJourney: "旅程",
      navAtlas: "图鉴",
      navKeepsakes: "收藏",
      navInstall: "安装",
      heroEyebrow: "住在桌面上的旅行伙伴",
      heroTitle: "世界这么大，让它替你先看看。<br><span>它见过的世界，都会带回来给你。</span>",
      heroTagline: "漫长日常里，一位小小旅行家。",
      heroBody: "当你专注于手边的事，小伙伴会走进童话路线与真实地点；回家时，带回一张地图、一枚明信片，还有一件值得记住的小东西。",
      download: "下载",
      comingSoon: "Beta · 即将开放",
      seeJourney: "看看旅程如何发生 <span aria-hidden=\"true\">↓</span>",
      platformLabel: "支持平台",
      platformValue: "macOS · Apple 芯片",
      paceLabel: "旅行节奏",
      paceValue: "一次完整旅程为 4 小时",
      marginNote: "为不慌不忙的日子而做",
      parisNote: "一页来自巴黎的旅行笔记",
      parisAlt: "Itsees 来到埃菲尔铁塔附近阳光柔和的巴黎街道",
      parisCaption: "在巴黎找到的一个下午",
      heroHandNote: "我见过的世界，<br>都会带回来给你。",
      destinationCount: "个等待被发现的地方",
      openJournal: "翻开旅行手帐",
      journeyEyebrow: "四小时，安静展开",
      journeyTitle: "让窗口安静开着，<br>让世界慢慢展开。",
      journeyIntro: "Itsees 把安静的工作时间变成一段随时可以回看的旅程。没有打卡压力，也不会不断索取你的注意力。",
      step1Title: "选择目的地",
      step1Body: "装好小小行囊，挑一条路线，送伙伴出发。",
      step2Title: "继续自己的日常",
      step2Body: "你工作、阅读或休息时，旅程会在桌面本地安静进行。",
      step3Title: "看地图慢慢填满",
      step3Body: "童话路线每 20 分钟展开一幕，真实地点每 60 分钟展开一幕。",
      step4Title: "欢迎伙伴回家",
      step4Body: "完整旅程会带回明信片、纪念品，以及旅行历史里的一行记录。",
      journeyImageAlt: "Itsees 桌面应用正在展示一段进行中的旅程",
      journeyImageCaption: "旅程安静待在后台，等你回头时再继续看。",
      journeyInspect: "在新标签页查看 Itsees 旅程页面原尺寸截图",
      journeyWindow: "旅程",
      inspectFull: "查看原图 ↗",
      atlasEyebrow: "两本图鉴，一位小小旅行家",
      atlasCoordinate: "15 条童话路线 · 15 个真实地点",
      atlasTitle: "有些地方来自想象，<br>有些正在窗外等候。",
      storybookAlt: "一张手绘童话旅行路线图",
      storybookTitle: "童话路线",
      storybookBody: "为温柔的小小绕行绘制的世界，从茶园到星光海岸。",
      storybookNote: "12 个场景 · 每 20 分钟展开一幕",
      realAlt: "一张来自真实巴黎旅程的明信片",
      realTitle: "真实地点",
      realBody: "真实地标被收进一册安静的世界图鉴，每处都有自己的本地天气与旅行页面。",
      realNote: "4 个场景 · 每 60 分钟展开一幕",
      worldMapAlt: "Itsees 的手绘世界图鉴",
      mapCaption: "三十个地方，慢慢连在一起。",
      keepsakesEyebrow: "装满小东西的抽屉",
      keepsakesTitle: "每一次远行，<br>都会留下一点证据。",
      keepsakeImageAlt: "Itsees 中收藏的明信片与纪念品",
      keepsakeImageCaption: "明信片记得当时的感受。",
      keepsakeInspect: "在新标签页查看 Itsees 旅行收藏原尺寸截图",
      keepsakeWindow: "旅行收藏",
      travelerQuote: "“雨在我到达前刚好停了。我把这里的风景留给你。”",
      travelerQuoteBy: "—— 一张被带回家的纸条",
      postcardsTitle: "明信片",
      postcardsBody: "每次成功签到后，留下一帧旅途的视觉记忆。",
      souvenirsTitle: "纪念品",
      souvenirsBody: "沿路发现的小东西，会一起收进你的收藏。",
      historyTitle: "旅行历史",
      historyBody: "安静记下每次出发、归来、未完路线与完整的一天。",
      localEyebrow: "为你的桌面而生",
      localTitle: "你的旅程，属于你自己。",
      localBody: "Itsees 坚持本地优先。旅行状态与收藏留在你的电脑里，让它不像一项不断提醒你的服务，而更像一位安静住在身边的伙伴。",
      localItem1: "Beta 版本无需注册账号",
      localItem2: "确定性的本地天气降级方案",
      localItem3: "可以暂停、召回并继续路线",
      installEyebrow: "出发前的一页小提示",
      installTitle: "安装说明",
      installIntro: "Itsees 目前支持 Apple 芯片 Mac，整个安装过程只需片刻。",
      installStep1: "从本官方网站下载 DMG 安装包。",
      installStep2: "打开 DMG，将 Itsees 拖入“应用程序”文件夹。",
      installStep3: "打开 Itsees。如果 macOS 首次阻止运行，请前往“系统设置 → 隐私与安全性”，选择“仍要打开”，然后确认“打开”。",
      checksumLabel: "DMG SHA-256",
      teddyAlt: "Itsees 的小熊旅行家在长城挥手",
      finalEyebrow: "第一次公开出发，已经准备好了",
      finalTitle: "在你的日常里，<br><span class=\"nowrap\">给旅程留一个位置。</span>",
      finalBody: "Itsees 已向 Apple 芯片 Mac 开放。让小小旅行家出发吧。",
      footerLine: "漫长日常里的小小旅程。",
      github: "GitHub",
      support: "支持",
      privacy: "隐私",
    },
  };

  window.ITSEES_SITE_TRANSLATIONS = translations;

  function validPublicUrl(value) {
    if (!value || typeof value !== "string") return null;
    try {
      const url = new URL(value, window.location.href);
      return url.protocol === "https:" ? url.href : null;
    } catch {
      return null;
    }
  }

  function applyConfig() {
    const config = window.ITSEES_SITE_CONFIG || {};
    const downloadUrl = validPublicUrl(config.downloadUrl);
    const enabled = config.downloadEnabled === true && downloadUrl;

    document.querySelectorAll("[data-download-link]").forEach((element) => {
      if (!enabled) return;
      element.href = downloadUrl;
      element.hidden = false;
    });
    if (enabled) {
      document.querySelectorAll("[data-download-disabled]").forEach((element) => element.remove());
    }

    const links = {
      github: config.githubUrl,
      support: config.supportUrl,
      privacy: config.privacyUrl,
    };
    Object.entries(links).forEach(([name, value]) => {
      const href = validPublicUrl(value);
      if (!href) return;
      document.querySelectorAll(`[data-config-link="${name}"]`).forEach((element) => {
        element.href = href;
        element.hidden = false;
      });
    });

    const canonical = validPublicUrl(config.canonicalUrl);
    if (canonical) {
      document.querySelector('link[rel="canonical"]')?.setAttribute("href", canonical);
      const image = new URL("assets/og-itsees.png", canonical).href;
      document.querySelector('meta[property="og:image"]')?.setAttribute("content", image);
    }
  }

  function chooseInitialLanguage() {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "zh") return saved;
    return navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
  }

  function setLanguage(language, persist = true) {
    const next = translations[language] ? language : "en";
    const copy = translations[next];
    document.documentElement.lang = next === "zh" ? "zh-CN" : "en";
    document.title = copy.documentTitle;
    document.querySelector('meta[name="description"]')?.setAttribute("content", copy.metaDescription);
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", copy.documentTitle);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", copy.ogDescription);
    document.querySelector('meta[property="og:locale"]')?.setAttribute("content", next === "zh" ? "zh_CN" : "en_US");

    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const value = copy[element.dataset.i18n];
      if (value !== undefined) element.innerHTML = value;
    });
    document.querySelectorAll("[data-i18n-alt]").forEach((element) => {
      const value = copy[element.dataset.i18nAlt];
      if (value !== undefined) element.alt = value;
    });
    document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
      const value = copy[element.dataset.i18nAriaLabel];
      if (value !== undefined) element.setAttribute("aria-label", value);
    });
    document.querySelectorAll("[data-language]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.language === next));
    });
    if (persist) window.localStorage.setItem(STORAGE_KEY, next);
  }

  function installReveals() {
    const elements = [...document.querySelectorAll(".reveal")];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8%", threshold: 0.08 });
    elements.forEach((element) => observer.observe(element));
  }

  function init() {
    applyConfig();
    setLanguage(chooseInitialLanguage(), false);
    document.querySelectorAll("[data-language]").forEach((button) => {
      button.addEventListener("click", () => setLanguage(button.dataset.language));
    });
    document.querySelectorAll("[data-current-year]").forEach((element) => {
      element.textContent = String(new Date().getFullYear());
    });
    document.documentElement.classList.add("motion-ready");
    installReveals();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
