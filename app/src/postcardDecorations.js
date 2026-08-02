export const MAX_POSTCARD_DECORATIONS = 12;
export const MIN_POSTCARD_DECORATION_SCALE = 0.5;
export const MAX_POSTCARD_DECORATION_SCALE = 2;

export function addPostcardDecoration(postcard, souvenirId, point, options = {}) {
  const decorations = Array.isArray(postcard?.decorations) ? postcard.decorations : [];
  if (!postcard?.id || typeof souvenirId !== "string" || decorations.length >= MAX_POSTCARD_DECORATIONS) {
    return postcard;
  }

  const decoration = {
    id: options.id ?? createDecorationId(),
    postcardId: postcard.id,
    souvenirId,
    x: clamp(point?.x, 0, 1, 0.5),
    y: clamp(point?.y, 0, 1, 0.5),
    scale: clamp(options.scale, MIN_POSTCARD_DECORATION_SCALE, MAX_POSTCARD_DECORATION_SCALE, 1),
    rotation: normalizeRotation(options.rotation, 0),
    zIndex: nextZIndex(decorations),
    createdAt: options.createdAt ?? new Date().toISOString()
  };

  return { ...postcard, decorations: [...decorations, decoration] };
}

export function movePostcardDecoration(postcard, decorationId, point) {
  const decorations = Array.isArray(postcard?.decorations) ? postcard.decorations : [];
  if (!decorations.some(decoration => decoration.id === decorationId)) return postcard;
  const frontZIndex = nextZIndex(decorations);

  return {
    ...postcard,
    decorations: decorations.map(decoration => decoration.id === decorationId
      ? {
          ...decoration,
          x: clamp(point?.x, 0, 1, decoration.x),
          y: clamp(point?.y, 0, 1, decoration.y),
          zIndex: frontZIndex
        }
      : decoration)
  };
}

export function transformPostcardDecoration(postcard, decorationId, transform = {}) {
  const decorations = Array.isArray(postcard?.decorations) ? postcard.decorations : [];
  if (!decorations.some(decoration => decoration.id === decorationId)) return postcard;
  const frontZIndex = nextZIndex(decorations);

  return {
    ...postcard,
    decorations: decorations.map(decoration => decoration.id === decorationId
      ? {
          ...decoration,
          scale: clamp(
            transform.scale,
            MIN_POSTCARD_DECORATION_SCALE,
            MAX_POSTCARD_DECORATION_SCALE,
            decoration.scale
          ),
          rotation: normalizeRotation(transform.rotation, decoration.rotation),
          zIndex: frontZIndex
        }
      : decoration)
  };
}

export function removePostcardDecoration(postcard, decorationId) {
  const decorations = Array.isArray(postcard?.decorations) ? postcard.decorations : [];
  if (!decorations.some(decoration => decoration.id === decorationId)) return postcard;
  return {
    ...postcard,
    decorations: decorations.filter(decoration => decoration.id !== decorationId)
  };
}

function nextZIndex(decorations) {
  return decorations.reduce((highest, decoration) => Math.max(highest, decoration.zIndex ?? 0), 0) + 1;
}

function clamp(value, minimum, maximum, fallback) {
  const number = Number.isFinite(value) ? value : fallback;
  return Math.min(maximum, Math.max(minimum, number));
}

function normalizeRotation(value, fallback) {
  const number = Number.isFinite(value) ? value : fallback;
  return ((number + 180) % 360 + 360) % 360 - 180;
}

function createDecorationId() {
  if (globalThis.crypto?.randomUUID) return `decoration-${globalThis.crypto.randomUUID()}`;
  return `decoration-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
