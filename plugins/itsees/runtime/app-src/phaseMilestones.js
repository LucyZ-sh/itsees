import { getPhase1Completion } from "./featureRegistry.js?v=map-hub-v1";

export function getPhase1MilestoneSummary(state, now = new Date()) {
  const completion = getPhase1Completion(state);
  const phase1Travels = listPhaseItems(state?.travels, item => (item?.phase ?? 1) === 1);
  const phase1Postcards = listPhaseItems(state?.album, item => (item?.phase ?? 1) === 1);
  const phase1Souvenirs = listPhaseItems(state?.souvenirAcquisitions, item => (item?.phase ?? 1) === 1);
  const firstSharedMoment = getFirstSharedMoment(state, phase1Travels, phase1Postcards, phase1Souvenirs);
  const nowTime = new Date(now).getTime();
  const togetherDays = Number.isFinite(firstSharedMoment) && Number.isFinite(nowTime)
    ? Math.max(1, getLocalCalendarDayNumber(nowTime) - getLocalCalendarDayNumber(firstSharedMoment) + 1)
    : 1;

  return {
    togetherDays,
    themeCount: completion.completedThemeCount,
    postcardCount: phase1Postcards.length,
    souvenirCount: phase1Souvenirs.length
  };
}

export function shouldShowPhase2UnlockCelebration(state, { acceptanceMode = false } = {}) {
  if (acceptanceMode || state?.settings?.phase2UnlockCelebratedAt) return false;
  if (state?.settings?.hasCompletedOnboarding !== true) return false;
  if (!getPhase1Completion(state).isComplete) return false;

  const hasPhase2Travel = listPhaseItems(state?.travels, item => item?.phase === 2).length > 0
    || state?.activeTravel?.phase === 2
    || state?.lastRecalledTravel?.phase === 2;
  const hasPhase2Progress = Object.values(state?.atlasProgress ?? {}).some(progress =>
    Number(progress?.progressPercent) > 0 || progress?.isFullyColored === true
  );
  return !hasPhase2Travel && !hasPhase2Progress;
}

function getFirstSharedMoment(state, travels, postcards, souvenirs) {
  const candidates = [
    ...travels.flatMap(item => [item.startedAt, item.completedAt]),
    ...postcards.map(item => item.createdAt),
    ...souvenirs.map(item => item.acquiredAt),
    ...Object.values(state?.themeProgress ?? {}).map(progress => progress?.updatedAt)
  ]
    .map(value => new Date(value ?? Number.NaN).getTime())
    .filter(Number.isFinite);
  return candidates.length > 0 ? Math.min(...candidates) : Number.NaN;
}

function listPhaseItems(items, predicate) {
  return Array.isArray(items) ? items.filter(predicate) : [];
}

function getLocalCalendarDayNumber(value) {
  const date = new Date(value);
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / (24 * 60 * 60 * 1000));
}
