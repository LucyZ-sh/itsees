const { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage, net, protocol, screen, session, shell } = require("electron");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { createPostcardAssetStore } = require("./postcardAssetStore.cjs");
const { createMusicPackStore } = require("./musicPackStore.cjs");
const { createProtectedAssetStore } = require("./protectedAssetStore.cjs");
const { createTravelStateStore } = require("./travelStateStore.cjs");

protocol.registerSchemesAsPrivileged([{
  scheme: "itsees",
  privileges: {
    standard: true,
    secure: true,
    supportFetchAPI: true,
    corsEnabled: true,
    codeCache: true
  }
}]);

let mainWindow = null;
let petWindow = null;
let splashWindow = null;
let tray = null;
let isPaused = false;
let isPetMode = false;
let petModeTransitionPending = false;
let petWindowBounds = null;
let mainWindowReady = false;
let splashShownAt = 0;
let launchRevealTimer = null;
let hasCompletedLaunchSplash = false;
let stateModulesPromise = null;
let musicPackStore = null;

const appRoot = path.join(__dirname, "..");
const rendererRoot = path.join(appRoot, "app");
const privacyPolicyUrl = "https://lucyz-sh.github.io/itsees/site/privacy.html";
const appIndexUrl = "itsees://app/app/index.html";
const appSplashUrl = "itsees://app/app/splash.html";
const appIcon = path.join(
  appRoot,
  "app",
  "assets",
  "brand",
  "app-logo-teddy-great-wall.png"
);
const petWindowSize = { width: 176, height: 176 };
const launchSplashMinimumMs = 3480;
const liveWeatherRequestTimeoutMs = 10_000;
const liveWeatherMaximumResponseBytes = 1_000_000;
const liveWeatherAllowlist = [
  { origin: "https://get.geojs.io", pathname: "/v1/ip/geo.json" },
  { origin: "https://api.open-meteo.com", pathname: "/v1/forecast" }
];

function getLocalePreferencePath() {
  return path.join(app.getPath("userData"), "locale.json");
}

function readPreferredLocale() {
  try {
    const saved = JSON.parse(fs.readFileSync(getLocalePreferencePath(), "utf8"));
    return saved?.locale === "en" ? "en" : "zh-CN";
  } catch {
    return "zh-CN";
  }
}

async function persistPreferredLocale(locale) {
  const normalized = locale === "en" ? "en" : "zh-CN";
  const preferencePath = getLocalePreferencePath();
  await fs.promises.mkdir(path.dirname(preferencePath), { recursive: true });
  await fs.promises.writeFile(preferencePath, `${JSON.stringify({ locale: normalized })}\n`, "utf8");
  return normalized;
}
const travelStateStore = createTravelStateStore({
  filePath: process.env.ITSEES_STATE_PATH
});
const protectedAssetStore = createProtectedAssetStore({ appRoot });
const postcardAssetStore = createPostcardAssetStore({
  appRoot,
  stateDirectory: path.dirname(travelStateStore.filePath),
  readProtectedAsset: relativePath => protectedAssetStore.read(relativePath)
});
let stopTravelStateWatcher = null;

function createWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1040,
    minHeight: 680,
    show: false,
    title: "Itsees",
    icon: appIcon,
    backgroundColor: "#efe5d4",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 14, y: 14 },
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // The hidden main renderer owns BGM while the compact pet window is
      // visible. Keep its audio and crossfade timers alive in pet mode.
      backgroundThrottling: false
    }
  });
  hardenWebContents(mainWindow.webContents, [appIndexUrl]);

  mainWindow.setAlwaysOnTop(false);
  mainWindow.loadURL(appIndexUrl);
  mainWindow.once("ready-to-show", () => {
    mainWindowReady = true;
    revealMainWindowWhenReady();
  });

  mainWindow.on("close", event => {
    if (!app.isQuitting) {
      event.preventDefault();
      enterPetMode("close");
    }
  });

  mainWindow.on("minimize", event => {
    if (!app.isQuitting) {
      event.preventDefault();
      if (!hasCompletedLaunchSplash) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        return;
      }
      enterPetMode("minimize");
    }
  });

  return mainWindow;
}

function createSplashWindow() {
  if (splashWindow && !splashWindow.isDestroyed()) return splashWindow;
  const splashLocale = readPreferredLocale();
  const splashUrl = `${appSplashUrl}?locale=${encodeURIComponent(splashLocale)}`;
  splashWindow = new BrowserWindow({
    width: 960,
    height: 600,
    useContentSize: true,
    show: false,
    frame: false,
    center: true,
    resizable: false,
    fullscreenable: false,
    maximizable: false,
    minimizable: false,
    skipTaskbar: true,
    title: splashLocale === "en" ? "Itsees is setting out" : "Itsees 正在出发",
    icon: appIcon,
    backgroundColor: "#faf6ee",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  hardenWebContents(splashWindow.webContents, [appSplashUrl]);

  splashWindow.setAlwaysOnTop(true, "floating");
  splashWindow.loadURL(splashUrl);
  splashWindow.once("ready-to-show", () => {
    if (!splashWindow || splashWindow.isDestroyed()) return;
    splashShownAt = Date.now();
    splashWindow.show();
    revealMainWindowWhenReady();
  });
  splashWindow.webContents.once("did-fail-load", () => {
    splashShownAt = Date.now() - launchSplashMinimumMs;
    revealMainWindowWhenReady();
  });
  splashWindow.on("closed", () => {
    splashWindow = null;
    if (!hasCompletedLaunchSplash) {
      splashShownAt = Date.now() - launchSplashMinimumMs;
      revealMainWindowWhenReady();
    }
  });

  return splashWindow;
}

function revealMainWindowWhenReady() {
  if (!mainWindowReady || !splashShownAt || launchRevealTimer) return;
  const elapsed = Date.now() - splashShownAt;
  const remaining = Math.max(0, launchSplashMinimumMs - elapsed);
  launchRevealTimer = setTimeout(() => {
    launchRevealTimer = null;
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    hasCompletedLaunchSplash = true;
    sendDesktopState();
    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
  }, remaining);
}

function createPetWindow() {
  if (petWindow && !petWindow.isDestroyed()) return petWindow;
  petWindow = new BrowserWindow({
    ...petWindowSize,
    minWidth: petWindowSize.width,
    minHeight: petWindowSize.height,
    maxWidth: 224,
    maxHeight: 224,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    fullscreenable: false,
    maximizable: false,
    minimizable: false,
    skipTaskbar: true,
    hasShadow: false,
    title: "桌宠",
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  hardenWebContents(petWindow.webContents, [appIndexUrl]);

  petWindow.setAlwaysOnTop(true, "floating");
  try {
    petWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  } catch {
    // Some platforms do not implement visible-on-all-workspaces.
  }

  const petUrl = new URL(appIndexUrl);
  petUrl.searchParams.set("mode", "pet");
  petWindow.loadURL(petUrl.toString());
  petWindow.webContents.once("did-finish-load", () => sendDesktopState());
  petWindow.webContents.once("did-fail-load", (_event, errorCode, errorDescription) => {
    console.error("Failed to load compact pet window", { errorCode, errorDescription });
    const failedWindow = petWindow;
    petWindow = null;
    if (failedWindow && !failedWindow.isDestroyed()) failedWindow.destroy();
    if (isPetMode) restoreFullWindow();
  });
  petWindow.on("move", rememberPetWindowBounds);
  petWindow.on("moved", rememberPetWindowBounds);
  petWindow.on("close", event => {
    if (!app.isQuitting) {
      event.preventDefault();
      restoreFullWindow();
    }
  });
  petWindow.on("closed", () => {
    petWindow = null;
  });

  return petWindow;
}

function createTray() {
  const image = nativeImage.createFromDataURL(createTrayIconDataUrl());
  if (process.platform === "darwin") image.setTemplateImage(true);
  tray = new Tray(image);
  tray.setToolTip("Itsees");
  tray.setContextMenu(buildTrayMenu());
  tray.on("click", () => toggleWindowVisibility());
}

function buildTrayMenu() {
  return Menu.buildFromTemplate([
    {
      label: isPetMode ? "打开完整窗口" : "收起为桌宠",
      click: () => toggleWindowVisibility()
    },
    {
      label: isPaused ? "恢复桌宠" : "暂停桌宠",
      click: () => setPaused(!isPaused)
    },
    {
      label: mainWindow?.isAlwaysOnTop() ? "取消置顶" : "保持置顶",
      click: () => {
        if (!mainWindow) return;
        mainWindow.setAlwaysOnTop(!mainWindow.isAlwaysOnTop(), "floating");
        refreshTray();
        sendDesktopState();
      }
    },
    { type: "separator" },
    {
      label: "退出",
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);
}

function refreshTray() {
  if (tray) tray.setContextMenu(buildTrayMenu());
}

function toggleWindowVisibility() {
  if (isPetMode || !mainWindow?.isVisible()) restoreFullWindow();
  else enterPetMode("tray");
  refreshTray();
  sendDesktopState();
}

function setPaused(nextPaused) {
  isPaused = nextPaused;
  for (const window of getLiveWindows()) {
    window.webContents.send("desktop:set-paused", isPaused);
  }
  refreshTray();
  sendDesktopState();
}

function sendDesktopState() {
  const state = getDesktopState();
  for (const window of getLiveWindows()) {
    window.webContents.send("desktop:state", state);
  }
}

function sendTravelState(state, excludedWebContents = null) {
  if (!state) return;
  for (const window of getLiveWindows()) {
    if (window.webContents === excludedWebContents) continue;
    window.webContents.send("desktop:travel-state", state);
  }
}

function syncPostcardAssets(state) {
  if (!state) return;
  try {
    postcardAssetStore.sync(state);
  } catch (error) {
    console.warn("Failed to export Itsees postcards for Codex", error);
  }
}

function getDesktopState() {
  return {
    isDesktop: true,
    isWindowVisible: Boolean(mainWindow?.isVisible()),
    isPetVisible: Boolean(petWindow?.isVisible()),
    isAlwaysOnTop: Boolean(mainWindow?.isAlwaysOnTop()),
    isTrayReady: Boolean(tray && !tray.isDestroyed()),
    hasCompletedLaunchSplash,
    isPaused,
    windowMode: isPetMode ? "pet" : "full"
  };
}

function getLiveWindows() {
  return [mainWindow, petWindow].filter(window => window && !window.isDestroyed());
}

function enterPetMode() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (petModeTransitionPending || (isPetMode && petWindow?.isVisible())) return;
  isPetMode = true;
  petModeTransitionPending = true;

  const compactWindow = createPetWindow();
  compactWindow.setBounds(resolvePetWindowBounds());
  compactWindow.setAlwaysOnTop(true, "floating");

  const revealCompactWindow = () => {
    petModeTransitionPending = false;
    if (!isPetMode) return;
    if (compactWindow.isDestroyed()) {
      restoreFullWindow();
      return;
    }
    compactWindow.showInactive();
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide();
    setDockVisible(false);
    refreshTray();
    sendDesktopState();
  };

  if (compactWindow.webContents.isLoading()) {
    compactWindow.once("ready-to-show", revealCompactWindow);
  } else {
    revealCompactWindow();
  }
}

function restoreFullWindow() {
  petModeTransitionPending = false;
  isPetMode = false;
  setDockVisible(true);
  if (petWindow && !petWindow.isDestroyed()) {
    rememberPetWindowBounds();
    petWindow.hide();
  }
  const window = createWindow();
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
  refreshTray();
  sendDesktopState();
}

function rememberPetWindowBounds() {
  if (!petWindow || petWindow.isDestroyed()) return;
  petWindowBounds = constrainPetWindowBounds(petWindow.getBounds());
}

function resolvePetWindowBounds() {
  if (petWindowBounds) return constrainPetWindowBounds(petWindowBounds);
  const cursorDisplay = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const { x, y, width, height } = cursorDisplay.workArea;
  const margin = 22;
  return {
    x: x + width - petWindowSize.width - margin,
    y: y + height - petWindowSize.height - margin,
    ...petWindowSize
  };
}

function constrainPetWindowBounds(bounds) {
  const display = screen.getDisplayMatching(bounds);
  const area = display.workArea;
  const width = petWindowSize.width;
  const height = petWindowSize.height;
  return {
    width,
    height,
    x: Math.min(area.x + area.width - width, Math.max(area.x, bounds.x)),
    y: Math.min(area.y + area.height - height, Math.max(area.y, bounds.y))
  };
}

function setDockVisible(visible) {
  if (process.platform !== "darwin" || !app.dock) return;
  if (visible) app.dock.show();
  else app.dock.hide();
}

function createTrayIconDataUrl() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <rect width="32" height="32" rx="8" fill="#fff4df"/>
      <path d="M10 11c0-5 3-8 4-8s2 5 1 8m2 0c-1-3 0-8 1-8s4 3 4 8" stroke="#26231f" stroke-width="2" stroke-linecap="round" fill="none"/>
      <circle cx="16" cy="18" r="9" fill="#fff4df" stroke="#26231f" stroke-width="2"/>
      <circle cx="13" cy="17" r="1.4" fill="#26231f"/>
      <circle cx="19" cy="17" r="1.4" fill="#26231f"/>
      <path d="M14 21c1.2 1 2.8 1 4 0" stroke="#26231f" stroke-width="1.7" stroke-linecap="round" fill="none"/>
    </svg>
  `;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

ipcMain.handle("desktop:get-state", event => {
  requireTrustedAppSender(event);
  return getDesktopState();
});

ipcMain.handle("desktop:get-travel-state", event => {
  requireTrustedAppSender(event);
  const state = travelStateStore.read();
  syncPostcardAssets(state);
  return state;
});

ipcMain.handle("desktop:save-travel-state", async (event, state) => {
  requireTrustedAppSender(event);
  const expectedRevision = Number.isInteger(state?.revision) ? state.revision : 0;
  const result = await travelStateStore.update(() => state, { expectedRevision });
  if (!result.ok) return { ok: false, conflict: true, state: result.current };
  syncPostcardAssets(result.state);
  sendTravelState(result.state);
  return { ok: true, state: result.state };
});

ipcMain.handle("desktop:apply-travel-action", async (event, action) => {
  requireTrustedAppSender(event);
  const result = await applyTravelAction(action);
  if (!result.ok) return result;
  syncPostcardAssets(result.state);
  sendTravelState(result.state);
  return result;
});

ipcMain.handle("desktop:open-privacy", event => {
  requireTrustedAppSender(event);
  return shell.openExternal(privacyPolicyUrl);
});

ipcMain.handle("desktop:toggle-window", event => {
  requireTrustedAppSender(event);
  toggleWindowVisibility();
});

ipcMain.handle("desktop:restore-window", event => {
  requireTrustedAppSender(event);
  restoreFullWindow();
});

ipcMain.on("desktop:move-pet-window-by", (event, movement = {}) => {
  if (!isTrustedAppSender(event) || !isPetMode || !petWindow || petWindow.isDestroyed() || event.sender !== petWindow.webContents) return;
  const deltaX = Number(movement.deltaX);
  const deltaY = Number(movement.deltaY);
  if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) return;
  if (Math.abs(deltaX) > 100 || Math.abs(deltaY) > 100) return;
  const [x, y] = petWindow.getPosition();
  petWindow.setPosition(x + Math.round(deltaX), y + Math.round(deltaY), false);
});

ipcMain.on("desktop:finish-pet-window-drag", event => {
  if (!isTrustedAppSender(event) || !isPetMode || !petWindow || petWindow.isDestroyed() || event.sender !== petWindow.webContents) return;
  petWindow.setBounds(constrainPetWindowBounds(petWindow.getBounds()));
  rememberPetWindowBounds();
});

ipcMain.handle("desktop:toggle-always-on-top", event => {
  requireTrustedAppSender(event);
  if (!mainWindow) return false;
  mainWindow.setAlwaysOnTop(!mainWindow.isAlwaysOnTop(), "floating");
  petWindow?.setAlwaysOnTop(true, "floating");
  refreshTray();
  sendDesktopState();
  return mainWindow.isAlwaysOnTop();
});

ipcMain.handle("desktop:set-paused", (event, nextPaused) => {
  requireTrustedAppSender(event);
  setPaused(Boolean(nextPaused));
  return isPaused;
});

ipcMain.handle("desktop:set-locale", async (event, locale) => {
  requireTrustedAppSender(event);
  return persistPreferredLocale(locale);
});

ipcMain.handle("desktop:fetch-live-weather-json", async (event, rawUrl) => {
  requireTrustedAppSender(event);
  if (!isAllowedLiveWeatherUrl(rawUrl)) {
    throw new Error("Unsupported live weather endpoint");
  }
  if (typeof fetch !== "function") {
    throw new Error("Main process Fetch API is unavailable");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), liveWeatherRequestTimeoutMs);
  try {
    const response = await fetch(rawUrl, {
      headers: { accept: "application/json" },
      redirect: "error",
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`Live weather request failed with status ${response.status}`);
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) {
      throw new Error("Live weather endpoint returned a non-JSON response");
    }
    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > liveWeatherMaximumResponseBytes) {
      throw new Error("Live weather response is too large");
    }
    const body = Buffer.from(await response.arrayBuffer());
    if (body.byteLength > liveWeatherMaximumResponseBytes) {
      throw new Error("Live weather response is too large");
    }
    return JSON.parse(body.toString("utf8"));
  } finally {
    clearTimeout(timeout);
  }
});

ipcMain.handle("desktop:ensure-music-pack", async (event, destinationId, preferredWeatherId) => {
  requireTrustedAppSender(event);
  if (!musicPackStore) throw new Error("Music pack service is unavailable");
  return musicPackStore.ensureDestination(destinationId, preferredWeatherId);
});

ipcMain.handle("desktop:get-music-cache-status", async event => {
  requireTrustedAppSender(event);
  if (!musicPackStore) return { totalBytes: 0, maxBytes: 0, destinations: [] };
  return musicPackStore.getCacheStatus();
});

ipcMain.handle("desktop:clear-music-cache", async event => {
  requireTrustedAppSender(event);
  if (!musicPackStore) return { totalBytes: 0, maxBytes: 0, destinations: [] };
  return musicPackStore.clearCache();
});

function isAllowedLiveWeatherUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const allowed = liveWeatherAllowlist.find(candidate =>
      url.origin === candidate.origin && url.pathname === candidate.pathname
    );
    if (!allowed || url.username || url.password || url.hash) return false;
    if (allowed.origin === "https://get.geojs.io") return url.search === "";
    const allowedQueryKeys = new Set(["latitude", "longitude", "current", "timezone"]);
    if ([...url.searchParams.keys()].some(key => !allowedQueryKeys.has(key))) return false;
    const latitude = Number(url.searchParams.get("latitude"));
    const longitude = Number(url.searchParams.get("longitude"));
    return Number.isFinite(latitude)
      && latitude >= -90
      && latitude <= 90
      && Number.isFinite(longitude)
      && longitude >= -180
      && longitude <= 180
      && url.searchParams.get("timezone") === "auto"
      && (url.searchParams.get("current")?.length ?? 0) <= 500;
  } catch {
    return false;
  }
}

function hardenWebContents(webContents, allowedFiles) {
  webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  webContents.on("will-navigate", (event, navigationUrl) => {
    if (!isAllowedAppUrl(navigationUrl, allowedFiles)) event.preventDefault();
  });
  webContents.on("will-redirect", (event, navigationUrl) => {
    if (!isAllowedAppUrl(navigationUrl, allowedFiles)) event.preventDefault();
  });
}

function isAllowedAppUrl(rawUrl, allowedUrls) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "itsees:" || url.hostname !== "app" || url.username || url.password) return false;
    return allowedUrls.some(allowedUrl => {
      const allowed = new URL(allowedUrl);
      return url.origin === allowed.origin && url.pathname === allowed.pathname;
    });
  } catch {
    return false;
  }
}

function parseSingleByteRange(rangeHeader, size) {
  const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader ?? "");
  if (!match || size <= 0) return null;

  const [, rawStart, rawEnd] = match;
  if (!rawStart && !rawEnd) return null;

  if (!rawStart) {
    const suffixLength = Number(rawEnd);
    if (!Number.isInteger(suffixLength) || suffixLength <= 0) return null;
    return {
      start: Math.max(0, size - suffixLength),
      end: size - 1
    };
  }

  const start = Number(rawStart);
  const end = rawEnd ? Number(rawEnd) : size - 1;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start >= size || end < start) {
    return null;
  }
  return { start, end: Math.min(end, size - 1) };
}

async function createLocalAudioResponse(request, source) {
  const audio = Buffer.isBuffer(source) ? source : await fs.promises.readFile(source);
  const size = audio.byteLength;
  const rangeHeader = request.headers.get("range");
  const baseHeaders = {
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
    "Content-Type": "audio/mpeg"
  };

  if (!rangeHeader) {
    return new Response(request.method === "HEAD" ? null : audio, {
      status: 200,
      headers: {
        ...baseHeaders,
        "Content-Length": String(size)
      }
    });
  }

  const range = parseSingleByteRange(rangeHeader, size);
  if (!range) {
    return new Response(null, {
      status: 416,
      headers: {
        ...baseHeaders,
        "Content-Range": `bytes */${size}`
      }
    });
  }

  const chunk = audio.subarray(range.start, range.end + 1);
  return new Response(request.method === "HEAD" ? null : chunk, {
    status: 206,
    headers: {
      ...baseHeaders,
      "Content-Length": String(chunk.byteLength),
      "Content-Range": `bytes ${range.start}-${range.end}/${size}`
    }
  });
}

function registerAppProtocol() {
  protocol.handle("itsees", async request => {
    try {
      const url = new URL(request.url);
      if (url.hostname !== "app") return new Response("Not found", { status: 404 });
      const relativePath = decodeURIComponent(url.pathname).replace(/^\/+/, "");
      const requestedPath = path.resolve(appRoot, relativePath);
      const resolvedRendererRoot = path.resolve(rendererRoot);
      const isInsideApp = requestedPath === resolvedRendererRoot
        || requestedPath.startsWith(`${resolvedRendererRoot}${path.sep}`);
      if (!isInsideApp) return new Response("Not found", { status: 404 });
      const protectedPath = relativePath.replaceAll("\\", "/");
      if (protectedAssetStore.has(protectedPath)) {
        const asset = protectedAssetStore.read(protectedPath);
        if (protectedAssetStore.contentType(protectedPath) === "audio/mpeg") {
          return createLocalAudioResponse(request, asset);
        }
        return new Response(request.method === "HEAD" ? null : asset, {
          status: 200,
          headers: {
            "Cache-Control": "public, max-age=31536000, immutable",
            "Content-Length": String(asset.byteLength),
            "Content-Type": protectedAssetStore.contentType(protectedPath) ?? "application/octet-stream"
          }
        });
      }
      const downloadedMusic = musicPackStore?.read(protectedPath);
      if (downloadedMusic) return createLocalAudioResponse(request, downloadedMusic);
      if (path.extname(requestedPath).toLowerCase() === ".mp3") {
        return createLocalAudioResponse(request, requestedPath);
      }
      return net.fetch(pathToFileURL(requestedPath).toString());
    } catch {
      return new Response("Bad request", { status: 400 });
    }
  });
}

function isTrustedAppSender(event) {
  const trustedContents = [mainWindow?.webContents, petWindow?.webContents]
    .filter(Boolean);
  if (!trustedContents.includes(event.sender)) return false;
  const senderUrl = event.senderFrame?.url || event.sender.getURL();
  return isAllowedAppUrl(senderUrl, [appIndexUrl]);
}

function requireTrustedAppSender(event) {
  if (!isTrustedAppSender(event)) throw new Error("Untrusted IPC sender");
}

async function getStateModules() {
  if (!stateModulesPromise) {
    stateModulesPromise = Promise.all([
      import(pathToFileURL(path.join(appRoot, "app", "src", "storage.js")).href),
      import(pathToFileURL(path.join(appRoot, "app", "src", "travelEngine.js")).href)
    ]).then(([storage, travelEngine]) => ({ storage, travelEngine }));
  }
  return stateModulesPromise;
}

async function applyTravelAction(action) {
  if (!action || typeof action !== "object") throw new TypeError("Invalid Itsees travel action.");
  const { storage, travelEngine } = await getStateModules();
  return travelStateStore.update(current => {
    const state = storage.migrateState(current ?? travelEngine.createInitialState());
    const now = new Date();
    switch (action.type) {
      case "start":
        {
          const started = travelEngine.startTravel(
          state,
          action.destinationId,
          action.selectedItemIds,
          now,
          { phase: action.phase === 2 ? 2 : 1 }
          );
          if (started !== state && started.settings) {
            started.settings.backgroundMusicDestinationId = action.destinationId;
          }
          return started;
        }
      case "recall":
        return travelEngine.summonTravel(state, now);
      case "continue":
        return travelEngine.continueTravel(state, now);
      case "complete_due":
        return travelEngine.completeActiveTravelIfDue(state, now);
      case "dismiss_daily_notice":
        if (action.noticeSequence !== state.dailyCheckin?.noticeSequence) return state;
        return travelEngine.dismissDailyCheckinNotice(state);
      default:
        throw new TypeError(`Unsupported Itsees travel action: ${String(action.type)}`);
    }
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  musicPackStore = createMusicPackStore({
    appRoot,
    cacheRoot: path.join(app.getPath("userData"), "music-cache", "v1"),
    fetchImpl: (url, options) => net.fetch(url, options),
    onStatus: status => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("desktop:music-pack-status", status);
    }
  });
  registerAppProtocol();
  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  if (process.platform === "darwin" && app.dock) {
    const dockIcon = nativeImage.createFromPath(appIcon);
    if (!dockIcon.isEmpty()) app.dock.setIcon(dockIcon);
  }
  createSplashWindow();
  createWindow();
  createTray();
  stopTravelStateWatcher = travelStateStore.watch((state, error) => {
    if (error) {
      console.warn("Failed to refresh shared Itsees travel state", error);
      return;
    }
    syncPostcardAssets(state);
    sendTravelState(state);
  });

  app.on("activate", () => {
    restoreFullWindow();
  });
});

app.on("before-quit", () => {
  app.isQuitting = true;
  protectedAssetStore.close();
  musicPackStore?.close();
  musicPackStore = null;
  stopTravelStateWatcher?.();
  stopTravelStateWatcher = null;
});

app.on("window-all-closed", () => {
  if (!app.isQuitting && process.platform !== "darwin") return;
  if (process.platform !== "darwin") app.quit();
});
