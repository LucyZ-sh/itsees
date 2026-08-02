export const DAILY_CHECKIN_LIMIT_MINUTES = 240;
export const PHASE_CHECKIN_MINUTES = Object.freeze({ 1: 20, 2: 60 });

export const DAILY_REST_MESSAGES = Object.freeze([
  {
    id: "pet-wants-home",
    title: "你的桌宠想回家休息啦",
    body: "今天装进背包的风景已经很多了。让它歇一晚，明天再继续出发。"
  },
  {
    id: "backpack-full",
    title: "今天的风景已经装满背包",
    body: "明信片和纪念品都平安带回来了，剩下的远方留给明天。"
  },
  {
    id: "little-feet-rest",
    title: "小旅伴的脚步该歇一歇了",
    body: "今天已经成功打卡 240 分钟。先一起回家，睡醒后再看新的地方。"
  },
  {
    id: "today-complete",
    title: "今日份远方已经带回来了",
    body: "它认真走完了今天的额度，现在更想在你身边安静待一会儿。"
  },
  {
    id: "save-some-road",
    title: "给明天留一点路吧",
    body: "今天能完成的打卡已经完成。地图不会跑掉，旅伴也需要充充电。"
  }
]);

export function createInitialDailyCheckinState(now = new Date(), homeTimeZone = getCurrentTimeZone()) {
  const normalizedTimeZone = normalizeTimeZone(homeTimeZone);
  return {
    localDate: getLocalDateKey(now, normalizedTimeZone),
    homeTimeZone: normalizedTimeZone,
    usedMinutes: 0,
    limitMinutes: DAILY_CHECKIN_LIMIT_MINUTES,
    entries: [],
    noticePending: false,
    noticeMessageId: null,
    noticeReason: null,
    noticePhase: null,
    noticeSequence: 0
  };
}

export function getCurrentTimeZone() {
  return normalizeTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone, "UTC");
}

export function normalizeTimeZone(value, fallback = "UTC") {
  const candidate = typeof value === "string" && value.trim() ? value.trim() : fallback;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate }).format(new Date(0));
    return candidate;
  } catch {
    return fallback === "UTC" ? "UTC" : normalizeTimeZone(fallback, "UTC");
  }
}

export function getLocalDateKey(value = new Date(), timeZone = getCurrentTimeZone()) {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: normalizeTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map(part => [part.type, part.value]));
  const year = byType.year;
  const month = byType.month;
  const day = byType.day;
  return `${year}-${month}-${day}`;
}

export function ensureDailyCheckinState(state, now = new Date()) {
  state.dailyCheckin = normalizeDailyCheckinState(state.dailyCheckin, now);
  return state.dailyCheckin;
}

export function updateDailyCheckinHomeTimeZone(state, timeZone = getCurrentTimeZone(), now = new Date()) {
  const daily = ensureDailyCheckinState(state, now);
  const homeTimeZone = normalizeTimeZone(timeZone, daily.homeTimeZone);
  const currentDateInNewZone = getLocalDateKey(now, homeTimeZone);
  daily.homeTimeZone = homeTimeZone;
  daily.localDate = daily.localDate > currentDateInNewZone ? daily.localDate : currentDateInNewZone;
  return daily;
}

export function normalizeDailyCheckinState(value, now = new Date()) {
  const homeTimeZone = normalizeTimeZone(value?.homeTimeZone, getCurrentTimeZone());
  const initial = createInitialDailyCheckinState(now, homeTimeZone);
  if (!value || typeof value !== "object") return initial;
  const savedLocalDate = /^\d{4}-\d{2}-\d{2}$/.test(value.localDate) ? value.localDate : null;
  if (!savedLocalDate || savedLocalDate < initial.localDate) return initial;
  const isUnusedLedger = (Number(value.usedMinutes) || 0) === 0
    && (!Array.isArray(value.entries) || value.entries.length === 0)
    && value.noticePending !== true;
  if (savedLocalDate > initial.localDate && isUnusedLedger) return initial;
  const entries = Array.isArray(value.entries)
    ? value.entries.map(normalizeEntry).filter(Boolean)
    : [];
  const entryMinutes = entries.reduce((sum, entry) => sum + entry.minutes, 0);
  const savedMinutes = Number.isFinite(value.usedMinutes) ? value.usedMinutes : entryMinutes;
  return {
    ...initial,
    localDate: savedLocalDate,
    usedMinutes: clampMinutes(Math.max(entryMinutes, savedMinutes)),
    entries,
    noticePending: Boolean(value.noticePending),
    noticeMessageId: DAILY_REST_MESSAGES.some(message => message.id === value.noticeMessageId)
      ? value.noticeMessageId
      : null,
    noticeReason: typeof value.noticeReason === "string" ? value.noticeReason : null,
    noticePhase: value.noticePhase === 2 ? 2 : value.noticePhase === 1 ? 1 : null,
    noticeSequence: Math.max(0, Math.round(Number(value.noticeSequence) || 0))
  };
}

export function getDailyCheckinStatus(state, phase = 1, now = new Date()) {
  const daily = normalizeDailyCheckinState(state.dailyCheckin, now);
  const segmentMinutes = PHASE_CHECKIN_MINUTES[phase === 2 ? 2 : 1];
  const remainingMinutes = Math.max(0, DAILY_CHECKIN_LIMIT_MINUTES - daily.usedMinutes);
  return {
    ...daily,
    segmentMinutes,
    remainingMinutes,
    availableSuccessfulMinutes: Math.floor(remainingMinutes / segmentMinutes) * segmentMinutes,
    canStart: remainingMinutes >= segmentMinutes,
    isLimitReached: remainingMinutes === 0
  };
}

export function creditDailyCheckin(state, session, requestedMinutes, now = new Date()) {
  const daily = ensureDailyCheckinState(state, now);
  const remaining = Math.max(0, DAILY_CHECKIN_LIMIT_MINUTES - daily.usedMinutes);
  const segmentMinutes = PHASE_CHECKIN_MINUTES[session.phase === 2 ? 2 : 1];
  const alignedRequest = Math.floor(Math.max(0, requestedMinutes) / segmentMinutes) * segmentMinutes;
  const creditedMinutes = Math.min(alignedRequest, remaining);
  if (creditedMinutes <= 0) return 0;

  daily.entries.push({
    id: `daily-${session.id}`,
    travelId: session.id,
    phase: session.phase === 2 ? 2 : 1,
    destinationId: session.destinationId ?? session.themeId,
    minutes: creditedMinutes,
    segmentCount: creditedMinutes / segmentMinutes,
    creditedAt: new Date(now).toISOString()
  });
  daily.usedMinutes = clampMinutes(daily.usedMinutes + creditedMinutes);
  return creditedMinutes;
}

export function queueDailyCheckinNotice(state, reason, now = new Date(), context = {}) {
  const daily = ensureDailyCheckinState(state, now);
  daily.noticeSequence += 1;
  const seed = `${daily.localDate}:${daily.usedMinutes}:${reason}:${daily.noticeSequence}`;
  const index = hashString(seed) % DAILY_REST_MESSAGES.length;
  daily.noticePending = true;
  daily.noticeMessageId = DAILY_REST_MESSAGES[index].id;
  daily.noticeReason = reason;
  daily.noticePhase = context.phase === 2 ? 2 : context.phase === 1 ? 1 : null;
  return daily;
}

export function clearDailyCheckinNotice(state) {
  if (!state.dailyCheckin) return state;
  state.dailyCheckin.noticePending = false;
  state.dailyCheckin.noticeReason = null;
  state.dailyCheckin.noticePhase = null;
  return state;
}

export function getDailyRestMessage(messageId) {
  return DAILY_REST_MESSAGES.find(message => message.id === messageId) ?? DAILY_REST_MESSAGES[0];
}

function normalizeEntry(entry) {
  if (!entry || typeof entry !== "object" || typeof entry.id !== "string") return null;
  if (typeof entry.travelId !== "string" || typeof entry.destinationId !== "string") return null;
  const phase = entry.phase === 2 ? 2 : 1;
  const segmentMinutes = PHASE_CHECKIN_MINUTES[phase];
  const minutes = Math.floor(Math.max(0, Number(entry.minutes) || 0) / segmentMinutes) * segmentMinutes;
  if (minutes <= 0) return null;
  return {
    id: entry.id,
    travelId: entry.travelId,
    phase,
    destinationId: entry.destinationId,
    minutes,
    segmentCount: minutes / segmentMinutes,
    creditedAt: typeof entry.creditedAt === "string" ? entry.creditedAt : "1970-01-01T00:00:00.000Z"
  };
}

function clampMinutes(value) {
  return Math.min(DAILY_CHECKIN_LIMIT_MINUTES, Math.max(0, Math.round(value)));
}

function hashString(value) {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
