export const COLLECTION_PAGE_SIZE = 12;

const TIME_BY_KIND = Object.freeze({
  album: item => item.createdAt,
  souvenirs: item => item.acquiredAt,
  history: item => item.completedAt ?? item.result?.createdAt ?? item.startedAt
});

export function getCollectionDestinationId(item) {
  return item?.destinationId ?? ((item?.phase ?? 1) === 2 ? item?.landmarkId : item?.themeId) ?? null;
}

export function queryCollection(items, options = {}) {
  const kind = TIME_BY_KIND[options.kind] ? options.kind : "album";
  const filters = options.filters ?? {};
  const scope = options.scope ?? { mode: "all" };
  const pageSize = Math.max(1, Math.round(options.pageSize ?? COLLECTION_PAGE_SIZE));
  const now = new Date(options.now ?? Date.now()).getTime();
  const timeFloor = getTimeFloor(filters.timeRange, now);

  const filtered = (Array.isArray(items) ? items : [])
    .filter(item => matchesScope(item, scope))
    .filter(item => filters.phase === undefined || filters.phase === "all" || Number(item.phase ?? 1) === Number(filters.phase))
    .filter(item => filters.destinationId === undefined || filters.destinationId === "all" || getCollectionDestinationId(item) === filters.destinationId)
    .filter(item => filters.completion === undefined || filters.completion === "all" || getCompletion(item) === filters.completion)
    .filter(item => filters.rarity === undefined || filters.rarity === "all" || item.rarity === filters.rarity)
    .filter(item => timeFloor === null || getItemTime(item, kind) >= timeFloor)
    .sort((left, right) => {
      const timeDifference = getItemTime(right, kind) - getItemTime(left, kind);
      return timeDifference || String(right.id ?? "").localeCompare(String(left.id ?? ""));
    });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(totalPages, Math.max(1, Math.round(options.page ?? 1)));
  const offset = (page - 1) * pageSize;

  return {
    items: filtered.slice(offset, offset + pageSize),
    total,
    page,
    pageSize,
    totalPages
  };
}

export function getSouvenirIdsForDestination(acquisitions, destinationId) {
  return new Set(
    (Array.isArray(acquisitions) ? acquisitions : [])
      .filter(item => getCollectionDestinationId(item) === destinationId)
      .map(item => item.souvenirId)
      .filter(Boolean)
  );
}

function matchesScope(item, scope) {
  if (scope.mode !== "destination") return true;
  if (scope.phase !== undefined && Number(item.phase ?? 1) !== Number(scope.phase)) return false;
  return getCollectionDestinationId(item) === scope.destinationId;
}

function getCompletion(item) {
  return item.completionReason === "full_cycle" || item.status === "completed" ? "completed" : "recalled";
}

function getItemTime(item, kind) {
  const value = TIME_BY_KIND[kind](item);
  const timestamp = new Date(value ?? 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getTimeFloor(range, now) {
  const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : null;
  return days === null ? null : now - days * 24 * 60 * 60 * 1000;
}
