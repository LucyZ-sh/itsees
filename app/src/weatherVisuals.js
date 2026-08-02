export const weatherVisuals = [
  {
    id: "sunny-glow",
    label: "晴光",
    cssClass: "weather-sun",
    effect: "sun_glow",
    tone: "bright"
  },
  {
    id: "soft-rain",
    label: "小雨",
    cssClass: "weather-rain",
    effect: "rain_streaks",
    tone: "soft"
  },
  {
    id: "morning-fog",
    label: "薄雾",
    cssClass: "weather-fog",
    effect: "fog_layer",
    tone: "quiet"
  },
  {
    id: "light-snow",
    label: "细雪",
    cssClass: "weather-snow",
    effect: "snow_flurry",
    tone: "quiet"
  },
  {
    id: "gentle-wind",
    label: "有风",
    cssClass: "weather-wind",
    effect: "wind_lines",
    tone: "soft"
  },
  {
    id: "heat-haze",
    label: "热浪",
    cssClass: "weather-heat",
    effect: "heat_haze",
    tone: "dramatic"
  },
  {
    id: "dust-drift",
    label: "沙尘",
    cssClass: "weather-dust",
    effect: "dust_drift",
    tone: "dramatic"
  },
  {
    id: "water-reflection",
    label: "水光",
    cssClass: "weather-reflection",
    effect: "water_reflection",
    tone: "bright"
  },
  {
    id: "rainbow-arc",
    label: "彩虹",
    cssClass: "weather-rainbow",
    effect: "rainbow_arc",
    tone: "bright"
  },
  {
    id: "night-glow",
    label: "夜光",
    cssClass: "weather-night",
    effect: "night_glow",
    tone: "dramatic"
  }
];

const phase1WeatherPools = {
  T01: ["sunny-glow", "gentle-wind", "water-reflection", "soft-rain", "rainbow-arc"],
  T02: ["morning-fog", "gentle-wind", "soft-rain", "sunny-glow"],
  T03: ["soft-rain", "water-reflection", "morning-fog", "night-glow", "rainbow-arc"],
  T04: ["morning-fog", "soft-rain", "gentle-wind", "water-reflection", "sunny-glow"],
  T05: ["dust-drift", "heat-haze", "sunny-glow", "gentle-wind", "night-glow"],
  T06: ["light-snow", "morning-fog", "sunny-glow", "gentle-wind", "night-glow"],
  T07: ["water-reflection", "sunny-glow", "morning-fog", "soft-rain", "rainbow-arc"],
  T08: ["soft-rain", "morning-fog", "night-glow", "gentle-wind", "water-reflection"],
  T09: ["sunny-glow", "night-glow", "morning-fog", "water-reflection"],
  T10: ["night-glow", "gentle-wind", "sunny-glow", "morning-fog"],
  T11: ["water-reflection", "sunny-glow", "night-glow", "rainbow-arc"],
  T12: ["sunny-glow", "gentle-wind", "morning-fog", "soft-rain", "rainbow-arc"],
  T13: ["sunny-glow", "gentle-wind", "morning-fog", "soft-rain", "rainbow-arc"],
  T14: ["heat-haze", "dust-drift", "sunny-glow", "night-glow", "gentle-wind"],
  T15: ["water-reflection", "night-glow", "morning-fog", "sunny-glow"]
};

function hashSeed(seed) {
  return String(seed).split("").reduce((hash, char) => {
    return (hash * 31 + char.charCodeAt(0)) >>> 0;
  }, 17);
}

export function resolveWeatherVisual(seed) {
  const exact = weatherVisuals.find(visual => visual.id === seed);
  if (exact) return exact;
  const index = hashSeed(seed) % weatherVisuals.length;
  return weatherVisuals[index];
}

export function resolvePhase1WeatherSnapshot({ themeId, sceneId, date = new Date() }) {
  const localDate = formatLocalDate(date);
  const pool = phase1WeatherPools[themeId] ?? weatherVisuals.map(visual => visual.id);
  const visualId = pool[hashSeed(`${themeId}:${sceneId}:${localDate}`) % pool.length];
  const visual = resolveWeatherVisual(visualId);
  return {
    id: `phase1-${themeId}-${sceneId}-${localDate}`,
    provider: "local_simulated",
    label: visual.label,
    localDate,
    sourceText: "本地模拟天气",
    isFallback: true,
    visual
  };
}

function formatLocalDate(dateLike) {
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (Number.isNaN(date.getTime())) return formatLocalDate(new Date());
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
