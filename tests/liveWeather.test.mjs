import assert from "node:assert/strict";
import { test } from "node:test";
import {
  GEOJS_ENDPOINT,
  buildOpenMeteoUrl,
  buildLiveWeatherProxyUrl,
  fetchFirstLaunchWeather,
  mapOpenMeteoCurrentToWeatherAssetId,
  mapOpenMeteoCurrentToVisual,
  normalizeGeoLocation,
  normalizeOpenMeteoWeather,
  shouldRefreshLiveWeatherOnOpen
} from "../app/src/liveWeather.js";

test("app open weather fetches IP geolocation before Open-Meteo current weather", async () => {
  const calls = [];
  const fetchImpl = async url => {
    calls.push(String(url));
    if (String(url) === GEOJS_ENDPOINT) {
      return jsonResponse({
        ip: "203.0.113.8",
        city: "Shanghai",
        region: "Shanghai",
        country: "China",
        country_code: "CN",
        latitude: "31.2304",
        longitude: "121.4737",
        timezone: "Asia/Shanghai"
      });
    }
    return jsonResponse({
      timezone: "Asia/Shanghai",
      current: {
        time: "2026-07-08T15:00",
        temperature_2m: 29.4,
        apparent_temperature: 33.1,
        precipitation: 0.4,
        rain: 0.4,
        snowfall: 0,
        weather_code: 61,
        cloud_cover: 86,
        wind_speed_10m: 14,
        is_day: 1
      }
    });
  };

  const state = await fetchFirstLaunchWeather({
    fetchImpl,
    now: new Date("2026-07-08T07:00:00.000Z")
  });

  assert.equal(calls.length, 2);
  assert.equal(calls[0], GEOJS_ENDPOINT);
  assert.equal(new URL(calls[1]).origin, "https://api.open-meteo.com");
  assert.equal(new URL(calls[1]).searchParams.get("timezone"), "auto");
  assert.match(new URL(calls[1]).searchParams.get("current"), /temperature_2m/);
  assert.equal(state.status, "ready");
  assert.equal(state.hasRequested, true);
  assert.equal(state.location.city, "Shanghai");
  assert.equal("latitude" in state.location, false);
  assert.equal("longitude" in state.location, false);
  assert.equal(new URL(calls[1]).searchParams.get("latitude"), "31.23");
  assert.equal(new URL(calls[1]).searchParams.get("longitude"), "121.47");
  assert.equal(state.snapshot.provider, "open_meteo");
  assert.equal(state.snapshot.label, "小雨");
  assert.equal(state.snapshot.visual.id, "soft-rain");
  assert.equal(state.snapshot.weatherAssetId, "rain");
  assert.equal(JSON.stringify(state).includes("203.0.113.8"), false);
});

test("Open-Meteo URL is built from latitude and longitude", () => {
  const url = new URL(buildOpenMeteoUrl({ latitude: 31.23, longitude: 121.47 }));

  assert.equal(url.searchParams.get("latitude"), "31.23");
  assert.equal(url.searchParams.get("longitude"), "121.47");
  assert.equal(url.searchParams.get("timezone"), "auto");
  assert.match(url.searchParams.get("current"), /weather_code/);
});

test("live weather public endpoints can be rewritten to same-origin preview proxy paths", () => {
  const previousWindow = globalThis.window;
  globalThis.window = { location: { protocol: "http:" } };

  try {
    assert.equal(buildLiveWeatherProxyUrl(GEOJS_ENDPOINT), "/api/live-weather/geo");
    const meteoProxyUrl = buildLiveWeatherProxyUrl(buildOpenMeteoUrl({ latitude: 31.23, longitude: 121.47 }));
    assert.equal(new URL(meteoProxyUrl, "http://localhost").pathname, "/api/live-weather/open-meteo");
    assert.equal(new URL(meteoProxyUrl, "http://localhost").searchParams.get("latitude"), "31.23");
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("app open weather can use the Electron desktop bridge", async () => {
  const previousWindow = globalThis.window;
  const calls = [];
  globalThis.window = {
    desktopBridge: {
      fetchLiveWeatherJson: async url => {
        calls.push(String(url));
        if (String(url) === GEOJS_ENDPOINT) {
          return {
            city: "Shanghai",
            latitude: "31.2304",
            longitude: "121.4737"
          };
        }
        return {
          timezone: "Asia/Shanghai",
          current: {
            time: "2026-07-08T15:00",
            temperature_2m: 31,
            apparent_temperature: 35,
            weather_code: 0,
            wind_speed_10m: 8,
            is_day: 1
          }
        };
      }
    }
  };

  try {
    const state = await fetchFirstLaunchWeather({ now: new Date("2026-07-08T07:00:00.000Z") });
    assert.equal(calls.length, 2);
    assert.equal(state.snapshot.provider, "open_meteo");
    assert.equal(state.snapshot.label, "晴光");
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("weather codes map to existing phase 1 weather visuals", () => {
  assert.equal(mapOpenMeteoCurrentToVisual({ weatherCode: 71 }).id, "light-snow");
  assert.equal(mapOpenMeteoCurrentToVisual({ weatherCode: 45 }).id, "morning-fog");
  assert.equal(mapOpenMeteoCurrentToVisual({ weatherCode: 61 }).id, "soft-rain");
  assert.equal(mapOpenMeteoCurrentToVisual({ weatherCode: 0, temperatureC: 34, isDay: true }).id, "heat-haze");
  assert.equal(mapOpenMeteoCurrentToVisual({ weatherCode: 2, windSpeedKmh: 28, isDay: true }).id, "gentle-wind");
  assert.equal(mapOpenMeteoCurrentToVisual({ weatherCode: 0, isDay: false }).id, "sunny-glow");
});

test("Open-Meteo current weather maps to six pet weather asset ids", () => {
  assert.equal(mapOpenMeteoCurrentToWeatherAssetId({ weatherCode: 71 }), "snow");
  assert.equal(mapOpenMeteoCurrentToWeatherAssetId({ weatherCode: 45 }), "fog");
  assert.equal(mapOpenMeteoCurrentToWeatherAssetId({ weatherCode: 61 }), "rain");
  assert.equal(mapOpenMeteoCurrentToWeatherAssetId({ weatherCode: 0, temperatureC: 34, isDay: true }), "heat");
  assert.equal(mapOpenMeteoCurrentToWeatherAssetId({ weatherCode: 2, windSpeedKmh: 28, isDay: true }), "wind");
  assert.equal(mapOpenMeteoCurrentToWeatherAssetId({ weatherCode: 0, isDay: false }), "sunny");
});

test("live weather refresh runs on every app open unless a request is already active", () => {
  assert.equal(shouldRefreshLiveWeatherOnOpen({
    isRequestInFlight: false,
    existingStatus: "ready",
    isPetWindow: false
  }), true);
  assert.equal(shouldRefreshLiveWeatherOnOpen({
    isRequestInFlight: false,
    existingStatus: "ready",
    isPetWindow: true
  }), true);
  assert.equal(shouldRefreshLiveWeatherOnOpen({
    isRequestInFlight: true,
    existingStatus: "failed",
    isPetWindow: false
  }), false);
});

test("live weather normalization rejects missing coordinates or current weather", () => {
  assert.throws(() => normalizeGeoLocation({ city: "Nope" }), /latitude and longitude/);
  assert.throws(() => normalizeOpenMeteoWeather({}), /current weather/);
});

function jsonResponse(payload) {
  return {
    ok: true,
    status: 200,
    json: async () => payload
  };
}
