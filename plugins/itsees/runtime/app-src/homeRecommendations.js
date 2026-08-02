function getTravelPhase(travel) {
  return travel?.phase === 2 ? 2 : 1;
}

function hasProgress(progress) {
  return Number(progress?.progressPercent) > 0 || progress?.isFullyColored === true;
}

export function getHomeRecommendationPhase(state, { phase2Enabled = false } = {}) {
  const activeTravel = state?.activeTravel;
  if (activeTravel && ["traveling", "recalled"].includes(activeTravel.status)) {
    return getTravelPhase(activeTravel);
  }

  const hasPhase2Progress = Object.values(state?.atlasProgress ?? {}).some(hasProgress);
  if (hasPhase2Progress) return 2;

  const latestTravel = Array.isArray(state?.travels) ? state.travels[0] : null;
  if (latestTravel) return getTravelPhase(latestTravel);

  if (phase2Enabled) return 2;
  return 1;
}

export function rankHomeDestinations(destinations, {
  selectedId,
  activeTravel = null,
  progressById = {}
} = {}) {
  const activeDestinationId = ["traveling", "recalled"].includes(activeTravel?.status)
    ? activeTravel.destinationId ?? activeTravel.themeId
    : null;

  return destinations
    .map((destination, index) => {
      const progress = progressById[destination.id] ?? {};
      const progressPercent = Number(progress.progressPercent) || 0;
      const isComplete = progress.isFullyColored === true || progressPercent >= 100;
      let priority = 3;
      if (destination.id === activeDestinationId) priority = 0;
      else if (destination.id === selectedId) priority = 1;
      else if (progressPercent > 0 && !isComplete) priority = 2;
      else if (isComplete) priority = 4;
      return { destination, index, priority, progressPercent };
    })
    .sort((left, right) =>
      left.priority - right.priority
      || (left.priority === 2 ? right.progressPercent - left.progressPercent : 0)
      || left.index - right.index
    )
    .map(item => item.destination);
}
