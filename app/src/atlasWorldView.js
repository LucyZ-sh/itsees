import { resolveAtlasAssetUrl } from "./atlasContent.js?v=daily-checkin-v5";

let worldSceneLoadPromise = null;

export function loadAtlasWorldScenes() {
  if (globalThis.IMAGE_WORLD_SCENES?.scenes) return Promise.resolve(globalThis.IMAGE_WORLD_SCENES);
  if (worldSceneLoadPromise) return worldSceneLoadPromise;
  if (!globalThis.document) return Promise.resolve(null);

  worldSceneLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "./src/atlas/worldSceneConfigs.js";
    script.addEventListener("load", () => resolve(globalThis.IMAGE_WORLD_SCENES ?? null), { once: true });
    script.addEventListener("error", () => reject(new Error("Atlas world scene configuration failed to load")), { once: true });
    document.head.append(script);
  });
  return worldSceneLoadPromise;
}

export function renderAtlasWorldView(destination, mapView, selectedSubsceneId = null) {
  const config = globalThis.IMAGE_WORLD_SCENES?.scenes?.[destination.id] ?? null;
  const subscene = config?.subScenes?.find(item => item.id === selectedSubsceneId) ?? null;
  const imageSource = subscene?.imageSrc ?? config?.main?.imageSrc ?? destination.imageAsset;
  const imageUrl = imageSource.startsWith("/") ? imageSource : resolveAtlasAssetUrl(imageSource);
  const unlockedCount = Math.min(mapView.coloredSegmentIds.length, config?.subScenes?.length ?? 0);

  return `
    <section class="atlas-image-world" data-atlas-world style="--world-x:0;--world-y:0;">
      <div class="atlas-world-canvas ${subscene ? "subscene" : "panorama"}">
        <img class="atlas-world-image" src="${imageUrl}" alt="${subscene?.label ?? destination.name}图片世界" draggable="false" />
        <div class="atlas-world-depth depth-back" aria-hidden="true"></div>
        <div class="atlas-world-depth depth-front" aria-hidden="true"></div>
        ${config ? renderHotspots(config, unlockedCount, subscene) : ""}
      </div>
      <header class="atlas-world-caption">
        <div>
          <span>${subscene ? "已进入子场景" : "图片世界"}</span>
          <strong>${subscene?.label ?? destination.name}</strong>
        </div>
        ${subscene ? '<button data-action="atlas-panorama" title="返回全景">全景</button>' : ""}
      </header>
    </section>
  `;
}

export function renderAtlasPostcardWorld({ imageUrl, alt, preview = false }) {
  if (!imageUrl) return "";
  return `
    <div
      class="atlas-image-world atlas-postcard-world ${preview ? "is-preview" : ""}"
      data-atlas-world
      data-atlas-postcard-world
      style="--world-x:0;--world-y:0;"
    >
      <div class="atlas-world-canvas subscene">
        <img
          class="atlas-world-image postcard-image"
          src="${escapeAttribute(imageUrl)}"
          alt="${escapeAttribute(alt)}"
          loading="lazy"
          decoding="async"
          draggable="false"
        />
        <div class="atlas-world-depth depth-back" aria-hidden="true"></div>
        <div class="atlas-world-depth depth-front" aria-hidden="true"></div>
        <div class="atlas-postcard-light" aria-hidden="true"></div>
      </div>
    </div>
  `;
}

export function bindAtlasWorldView(root, onSelectSubscene) {
  root.querySelectorAll("[data-atlas-world]").forEach(world => {
    world.querySelectorAll('[data-action="atlas-subscene"]:not(:disabled)').forEach(button => {
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        onSelectSubscene?.(button.dataset.subsceneId ?? null);
      });
    });
    world.querySelector('[data-action="atlas-panorama"]')?.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      onSelectSubscene?.(null);
    });
    const pointerSurface = world.hasAttribute("data-atlas-postcard-world")
      ? world.closest(".postcard-stage, .atlas-image-preview-figure") ?? world
      : world;
    pointerSurface.addEventListener("pointermove", event => {
      const bounds = world.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
      const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
      world.style.setProperty("--world-x", x.toFixed(3));
      world.style.setProperty("--world-y", y.toFixed(3));
    });
    pointerSurface.addEventListener("pointerleave", () => {
      world.style.setProperty("--world-x", "0");
      world.style.setProperty("--world-y", "0");
    });
  });
}

function escapeAttribute(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderHotspots(config, unlockedCount, activeSubscene) {
  if (activeSubscene) return "";
  return config.subScenes.map((scene, index) => {
    const unlocked = index < unlockedCount;
    return `
      <button
        class="atlas-world-hotspot ${unlocked ? "unlocked" : "locked"}"
        style="--hotspot-x:${scene.hotspot.xPercent}%;--hotspot-y:${scene.hotspot.yPercent}%;"
        data-action="atlas-subscene"
        data-subscene-id="${scene.id}"
        ${unlocked ? "" : "disabled"}
        title="${unlocked ? scene.label : `第${index + 1}段旅行后点亮`}"
      >
        <i></i><span>${unlocked ? scene.label : index + 1}</span>
      </button>
    `;
  }).join("");
}
