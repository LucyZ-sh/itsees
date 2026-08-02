import { resolveWeatherVisual } from "./weatherVisuals.js";

export const GEOJS_ENDPOINT = "https://get.geojs.io/v1/ip/geo.json";
export const OPEN_METEO_ENDPOINT = "https://api.open-meteo.com/v1/forecast";
export const LIVE_WEATHER_PROXY_GEO_PATH = "/api/live-weather/geo";
export const LIVE_WEATHER_PROXY_OPEN_METEO_PATH = "/api/live-weather/open-meteo";
export const LIVE_WEATHER_REQUEST_TIMEOUT_MS = 10_000;

const CURRENT_WEATHER_FIELDS = [
  "temperature_2m",
  "apparent_temperature",
  "precipitation",
  "rain",
  "snowfall",
  "weather_code",
  "cloud_cover",
  "wind_speed_10m",
  "is_day"
];

const WMO_LABELS = new Map([
  [0, "晴光"],
  [1, "晴间多云"],
  [2, "多云"],
  [3, "阴云"],
  [45, "薄雾"],
  [48, "雾凇"],
  [51, "小雨"],
  [53, "小雨"],
  [55, "小雨"],
  [56, "冻雨"],
  [57, "冻雨"],
  [61, "小雨"],
  [63, "中雨"],
  [65, "大雨"],
  [66, "冻雨"],
  [67, "冻雨"],
  [71, "细雪"],
  [73, "中雪"],
  [75, "大雪"],
  [77, "雪粒"],
  [80, "阵雨"],
  [81, "阵雨"],
  [82, "强阵雨"],
  [85, "阵雪"],
  [86, "阵雪"],
  [95, "雷雨"],
  [96, "雷雨"],
  [99, "雷雨"]
]);

const WEATHER_ASSET_VISUAL_IDS = {
  sunny: "sunny-glow",
  rain: "soft-rain",
  fog: "morning-fog",
  snow: "light-snow",
  wind: "gentle-wind",
  heat: "heat-haze"
};

export function createInitialLiveWeatherState() {
  return {
    status: "idle",
    hasRequested: false,
    requestedAt: null,
    updatedAt: null,
    location: null,
    snapshot: null,
    error: null
  };
}

export function shouldRefreshLiveWeatherOnOpen({ isRequestInFlight = false } = {}) {
  return !isRequestInFlight;
}

export async function fetchFirstLaunchWeather({ fetchImpl = createDefaultFetchImpl(), now = new Date() } = {}) {
  if (typeof fetchImpl !== "function") {
    throw new Error("Fetch API is unavailable");
  }

  const fetchedAt = toIso(now);
  const geoPayload = await fetchJson(GEOJS_ENDPOINT, { fetchImpl });
  const location = normalizeGeoLocation(geoPayload);
  const weatherUrl = buildOpenMeteoUrl(location);
  const weatherPayload = await fetchJson(weatherUrl, { fetchImpl });
  const snapshot = normalizeOpenMeteoWeather(weatherPayload, { fetchedAt, location });

  return {
    status: "ready",
    hasRequested: true,
    requestedAt: fetchedAt,
    updatedAt: fetchedAt,
    location: location.storageLocation,
    snapshot,
    error: null
  };
}

export function buildOpenMeteoUrl(location) {
  const url = new URL(OPEN_METEO_ENDPOINT);
  url.searchParams.set("latitude", String(location.latitude));
  url.searchParams.set("longitude", String(location.longitude));
  url.searchParams.set("current", CURRENT_WEATHER_FIELDS.join(","));
  url.searchParams.set("timezone", "auto");
  return url.toString();
}

export function normalizeGeoLocation(payload) {
  const latitude = Number(payload?.latitude);
  const longitude = Number(payload?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("IP geolocation did not include a usable latitude and longitude");
  }

  return {
    latitude: roundCoordinate(latitude),
    longitude: roundCoordinate(longitude),
    timezone: sanitizeText(payload?.timezone) || "auto",
    storageLocation: {
      city: sanitizeText(payload?.city),
      region: sanitizeText(payload?.region),
      country: sanitizeText(payload?.country),
      countryCode: sanitizeText(payload?.country_code),
      timezone: sanitizeText(payload?.timezone)
    }
  };
}

export function normalizeOpenMeteoWeather(payload, { fetchedAt = toIso(), location = null } = {}) {
  const current = payload?.current;
  if (!current || typeof current !== "object") {
    throw new Error("Open-Meteo response did not include current weather");
  }

  const weatherCode = toNullableNumber(current.weather_code);
  const temperatureC = toNullableNumber(current.temperature_2m);
  const apparentTemperatureC = toNullableNumber(current.apparent_temperature);
  const windSpeedKmh = toNullableNumber(current.wind_speed_10m);
  const cloudCover = toNullableNumber(current.cloud_cover);
  const precipitationMm = toNullableNumber(current.precipitation);
  const rainMm = toNullableNumber(current.rain);
  const snowfallCm = toNullableNumber(current.snowfall);
  const isDay = current.is_day === 1 ? true : current.is_day === 0 ? false : null;
  const weatherAssetId = mapOpenMeteoCurrentToWeatherAssetId({ weatherCode, temperatureC, windSpeedKmh, isDay });
  const visual = mapOpenMeteoCurrentToVisual({ weatherCode, temperatureC, windSpeedKmh, isDay });
  const observedAt = sanitizeText(current.time) || fetchedAt;
  const localDate = observedAt.slice(0, 10) || fetchedAt.slice(0, 10);

  return {
    id: `open-meteo-${localDate}`,
    provider: "open_meteo",
    label: getWeatherCodeLabel(weatherCode, visual.label),
    localDate,
    sourceText: "Open-Meteo 实时天气",
    isFallback: false,
    visual,
    weatherAssetId,
    weatherCode,
    temperatureC,
    apparentTemperatureC,
    precipitationMm,
    rainMm,
    snowfallCm,
    cloudCover,
    windSpeedKmh,
    isDay,
    observedAt,
    fetchedAt,
    timezone: sanitizeText(payload?.timezone) || location?.timezone || "auto"
  };
}

export function mapOpenMeteoCurrentToVisual({ weatherCode, temperatureC, windSpeedKmh, isDay } = {}) {
  const weatherAssetId = mapOpenMeteoCurrentToWeatherAssetId({ weatherCode, temperatureC, windSpeedKmh, isDay });
  return resolveWeatherVisual(WEATHER_ASSET_VISUAL_IDS[weatherAssetId]);
}

export function mapOpenMeteoCurrentToWeatherAssetId({ weatherCode, temperatureC, windSpeedKmh } = {}) {
  if (isSnowCode(weatherCode)) return "snow";
  if (isFogCode(weatherCode)) return "fog";
  if (isRainCode(weatherCode)) return "rain";
  if (Number.isFinite(temperatureC) && temperatureC >= 32) return "heat";
  if (Number.isFinite(windSpeedKmh) && windSpeedKmh >= 24) return "wind";
  if (weatherCode === 2 || weatherCode === 3) return "wind";
  return "sunny";
}

export function getWeatherCodeLabel(weatherCode, fallback = "天气") {
  return WMO_LABELS.get(Number(weatherCode)) ?? fallback;
}

function isFogCode(code) {
  return code === 45 || code === 48;
}

function isSnowCode(code) {
  return [71, 73, 75, 77, 85, 86].includes(code);
}

function isRainCode(code) {
  return [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code);
}

async function fetchJson(url, { fetchImpl }) {
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      controller?.abort();
      reject(new Error("Live weather request timed out"));
    }, LIVE_WEATHER_REQUEST_TIMEOUT_MS);
  });
  try {
    const request = Promise.resolve(fetchImpl(url, {
      headers: { accept: "application/json" },
      redirect: "error",
      signal: controller?.signal
    }));
    const response = await Promise.race([request, timeout]);
    if (!response?.ok) {
      throw new Error(`Request failed with status ${response?.status ?? "unknown"}`);
    }
    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

function createDefaultFetchImpl() {
  const desktopBridge = globalThis.window?.desktopBridge ?? globalThis.desktopBridge;
  if (typeof desktopBridge?.fetchLiveWeatherJson === "function") {
    return async url => {
      const payload = await desktopBridge.fetchLiveWeatherJson(url);
      return {
        ok: true,
        status: 200,
        json: async () => payload
      };
    };
  }

  const browserFetch = createBrowserFetchImpl();
  if (!browserFetch) return null;

  return async url => {
    const proxyUrl = buildLiveWeatherProxyUrl(url);
    if (proxyUrl) {
      try {
        const proxyResponse = await browserFetch(proxyUrl);
        if (proxyResponse?.ok) return proxyResponse;
      } catch {
        // Fall through to the public endpoint when the static server has no proxy.
      }
    }
    return browserFetch(url);
  };
}

export function buildLiveWeatherProxyUrl(rawUrl) {
  if (!hasHttpWindowLocation()) return null;
  try {
    const url = new URL(rawUrl);
    if (url.origin === new URL(GEOJS_ENDPOINT).origin && url.pathname === new URL(GEOJS_ENDPOINT).pathname) {
      return LIVE_WEATHER_PROXY_GEO_PATH;
    }
    const meteo = new URL(OPEN_METEO_ENDPOINT);
    if (url.origin === meteo.origin && url.pathname === meteo.pathname) {
      return `${LIVE_WEATHER_PROXY_OPEN_METEO_PATH}?${url.searchParams.toString()}`;
    }
  } catch {
    return null;
  }
  return null;
}

function hasHttpWindowLocation() {
  const protocol = globalThis.window?.location?.protocol;
  return protocol === "http:" || protocol === "https:";
}

function createBrowserFetchImpl() {
  if (typeof globalThis.fetch === "function" && typeof globalThis.XMLHttpRequest === "function") {
    return async url => {
      try {
        return await globalThis.fetch(url);
      } catch {
        return xhrFetch(url);
      }
    };
  }
  if (typeof globalThis.fetch === "function") return globalThis.fetch.bind(globalThis);
  if (typeof globalThis.XMLHttpRequest === "function") return xhrFetch;
  return null;
}

function xhrFetch(url) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.timeout = 10000;
    request.onload = () => {
      resolve({
        ok: request.status >= 200 && request.status < 300,
        status: request.status,
        json: async () => JSON.parse(request.responseText)
      });
    };
    request.onerror = () => reject(new Error("Network request failed"));
    request.ontimeout = () => reject(new Error("Network request timed out"));
    request.send();
  });
}

function sanitizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function roundCoordinate(value) {
  return Math.round(value * 100) / 100;
}

function toNullableNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toIso(value = new Date()) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
