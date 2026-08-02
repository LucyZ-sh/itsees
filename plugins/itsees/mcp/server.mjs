import { spawn } from "node:child_process";
import { access, readFile, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";

import {
  completeActiveTravelIfDue,
  continueTravel,
  createInitialState,
  getRuntimeTravelView,
  startTravel,
  summonTravel
} from "../runtime/app-src/travelEngine.js";
import { listAtlasDestinations } from "../runtime/app-src/atlasContent.js";
import {
  listInventoryItems,
  listThemes
} from "../runtime/app-src/contentRepository.js";
import { canEnterFeaturePack } from "../runtime/app-src/featureRegistry.js";
import { getInventoryUnlockState } from "../runtime/app-src/inventoryRules.js";
import { getPetById } from "../runtime/app-src/pets.js";
import { migrateState } from "../runtime/app-src/storage.js";
import { createMcpStateStore } from "./stateStore.mjs";

const SERVER_NAME = "Itsees Travel";
const SERVER_VERSION = JSON.parse(
  await readFile(new URL("../.codex-plugin/plugin.json", import.meta.url), "utf8")
).version;
const MAX_STATE_BYTES = 16 * 1024 * 1024;
const statePath = process.env.ITSEES_STATE_PATH
  ? path.resolve(process.env.ITSEES_STATE_PATH)
  : path.join(os.homedir(), ".itsees", "travel-state-v1.json");
const stateStore = createMcpStateStore(statePath, { maxBytes: MAX_STATE_BYTES });

const JsonRpcError = Object.freeze({
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603
});
const MAX_POSTCARD_INDEX_BYTES = 2 * 1024 * 1024;
const MAX_POSTCARD_IMAGE_BYTES = 8 * 1024 * 1024;

class ToolInputError extends Error {}
class ToolExecutionError extends Error {}

const tools = [
  {
    name: "itsees_get_status",
    title: "Get Itsees Travel Status",
    description:
      "Read the current Itsees pet, active or recalled journey, travel progress, daily check-in budget, and collection counts.",
    inputSchema: emptyObjectSchema(),
    annotations: readOnlyAnnotations()
  },
  {
    name: "itsees_list_destinations",
    title: "List Itsees Destinations",
    description:
      "List Phase 1 themes or Phase 2 real-world landmarks with stable destination ids and current unlock state.",
    inputSchema: {
      type: "object",
      properties: {
        phase: {
          type: "integer",
          enum: [1, 2],
          description: "Optional phase filter. Omit to return both phases."
        },
        unlocked_only: {
          type: "boolean",
          description: "Return only destinations currently available to start."
        }
      },
      additionalProperties: false
    },
    annotations: readOnlyAnnotations()
  },
  {
    name: "itsees_list_pack_items",
    title: "List Itsees Pack Items",
    description:
      "List food and tool ids that can be packed for a journey, including their unlock state and effects.",
    inputSchema: {
      type: "object",
      properties: {
        unlocked_only: {
          type: "boolean",
          description: "Return only pack items currently unlocked."
        }
      },
      additionalProperties: false
    },
    annotations: readOnlyAnnotations()
  },
  {
    name: "itsees_start_travel",
    title: "Start an Itsees Journey",
    description:
      "Start a 240-minute Itsees journey to an unlocked destination. Accepts at most one unlocked food and one unlocked tool; invalid or locked choices fall back to the current valid pack.",
    inputSchema: {
      type: "object",
      properties: {
        destination_id: {
          type: "string",
          minLength: 1,
          description: "Stable destination id returned by itsees_list_destinations."
        },
        phase: {
          type: "integer",
          enum: [1, 2],
          description: "Optional explicit phase. Normally inferred from destination_id."
        },
        selected_item_ids: {
          type: "array",
          maxItems: 2,
          items: { type: "string", minLength: 1 },
          description: "Optional pack item ids returned by itsees_list_pack_items."
        }
      },
      required: ["destination_id"],
      additionalProperties: false
    },
    annotations: writeAnnotations()
  },
  {
    name: "itsees_recall_travel",
    title: "Recall the Itsees Pet",
    description:
      "Recall the currently traveling pet. Progress is preserved; recalls before the first phase segment do not add a postcard or consume successful check-in budget.",
    inputSchema: emptyObjectSchema(),
    annotations: writeAnnotations()
  },
  {
    name: "itsees_continue_travel",
    title: "Continue an Itsees Journey",
    description:
      "Continue the most recently recalled journey when enough daily check-in budget remains.",
    inputSchema: emptyObjectSchema(),
    annotations: writeAnnotations()
  },
  {
    name: "itsees_list_collection",
    title: "List Itsees Collection",
    description:
      "Read recent postcards, souvenir acquisitions, or journey history from the shared Itsees collection.",
    inputSchema: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: ["postcards", "souvenirs", "history"],
          description: "Collection section to return."
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 50,
          description: "Maximum recent entries to return. Defaults to 10."
        }
      },
      required: ["kind"],
      additionalProperties: false
    },
    annotations: readOnlyAnnotations()
  },
  {
    name: "itsees_show_postcards",
    title: "Show Itsees Postcards",
    description:
      "Display one to four postcard images already present in the user's Itsees album. Omit postcard_ids to show the newest returned postcard.",
    inputSchema: {
      type: "object",
      properties: {
        postcard_ids: {
          type: "array",
          minItems: 1,
          maxItems: 4,
          uniqueItems: true,
          items: { type: "string", minLength: 1 },
          description: "Optional postcard ids returned by itsees_list_collection."
        },
        count: {
          type: "integer",
          minimum: 1,
          maximum: 4,
          description: "Number of newest postcards to show when postcard_ids is omitted. Defaults to 1."
        }
      },
      additionalProperties: false
    },
    annotations: readOnlyAnnotations()
  },
  {
    name: "itsees_open_app",
    title: "Open the Itsees App",
    description:
      "Launch or focus the separately installed Itsees desktop app. This does not install the app.",
    inputSchema: emptyObjectSchema(),
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  }
];

function emptyObjectSchema() {
  return { type: "object", properties: {}, additionalProperties: false };
}

function readOnlyAnnotations() {
  return {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false
  };
}

function writeAnnotations() {
  return {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false
  };
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function sendResult(id, result) {
  send({ jsonrpc: "2.0", id, result });
}

function sendError(id, code, message) {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

function toolResult(text, structuredContent) {
  return {
    content: [{ type: "text", text }],
    structuredContent
  };
}

async function loadState({ completeDueTravel = true } = {}) {
  const raw = await stateStore.read();
  const state = migrateState(raw ?? createInitialState());

  if (!completeDueTravel) return state;
  return completeActiveTravelIfDue(state);
}

async function updateState(mutator) {
  const result = await stateStore.update(raw => {
    const current = migrateState(raw ?? createInitialState());
    return mutator(completeActiveTravelIfDue(current));
  });
  return result.state;
}

function getDestinationCatalog(state) {
  const phase2Unlocked = canEnterFeaturePack(state, "phase2-atlas");
  const phase1 = listThemes().map(theme => ({
    id: theme.id,
    phase: 1,
    name: theme.name,
    description: theme.tags,
    unlocked: isThemeUnlocked(theme, state),
    progress_percent: Math.round(state.themeProgress?.[theme.id]?.progressPercent ?? 0),
    segment_minutes: 20,
    segment_count: theme.mapSegments.length
  }));
  const phase2 = listAtlasDestinations().map(destination => ({
    id: destination.id,
    phase: 2,
    name: destination.name,
    description: destination.subtitle ?? destination.categoryName ?? destination.country,
    unlocked: phase2Unlocked,
    progress_percent: Math.round(state.atlasProgress?.[destination.id]?.progressPercent ?? 0),
    segment_minutes: 60,
    segment_count: destination.mapSegments.length
  }));
  return [...phase1, ...phase2];
}

function isThemeUnlocked(theme, state) {
  return theme.unlocked
    || state.travels.length >= 2
    || state.themeProgress?.[theme.id]?.isFullyColored === true;
}

function getDestinationSummary(destinationId, phase, state) {
  return getDestinationCatalog(state).find(destination =>
    destination.id === destinationId && destination.phase === phase
  ) ?? null;
}

function inferPhase(destinationId) {
  if (listThemes().some(theme => theme.id === destinationId)) return 1;
  if (listAtlasDestinations().some(destination => destination.id === destinationId)) return 2;
  return null;
}

function summarizeTravel(session, state) {
  if (!session) return null;
  const phase = session.phase === 2 ? 2 : 1;
  const destinationId = session.destinationId ?? session.themeId ?? session.landmarkId;
  const destination = getDestinationSummary(destinationId, phase, state);
  const runtime = session.status === "traveling" ? getRuntimeTravelView(session) : null;
  return {
    id: session.id,
    phase,
    destination_id: destinationId,
    destination_name: destination?.name ?? destinationId,
    status: session.status,
    started_at: session.startedAt,
    expected_return_at: session.expectedReturnAt,
    progress_percent: Math.round(runtime?.progressPercent ?? session.progressPercent ?? 0),
    completed_spot_count: runtime?.completedSpotCount ?? session.coloredSegmentIds?.length ?? 0,
    total_spot_count: runtime?.totalSpotCount ?? destination?.segment_count ?? 0,
    accumulated_minutes: Math.round(runtime?.accumulatedTravelMinutes ?? session.accumulatedTravelMinutes ?? 0),
    remaining_minutes: Math.ceil(runtime?.journeyRemainingMinutes ?? Math.max(0, 240 - (session.accumulatedTravelMinutes ?? 0))),
    selected_item_ids: session.selectedItemIds ?? [],
    completion_reason: session.completionReason ?? null
  };
}

function buildStatus(state, sharedStateInitialized = true) {
  const active = summarizeTravel(state.activeTravel, state);
  const recalled = summarizeTravel(state.lastRecalledTravel, state);
  const pet = getPetById(state.settings?.selectedPetId);
  return {
    pet: {
      id: pet.id,
      name: pet.name,
      paused: Boolean(state.settings?.isPaused),
      hidden: Boolean(state.settings?.isHidden)
    },
    journey_state: active?.status ?? (recalled ? "recalled" : "idle"),
    active_travel: active,
    recalled_travel: recalled,
    daily_checkin: {
      local_date: state.dailyCheckin?.localDate ?? null,
      used_minutes: state.dailyCheckin?.usedMinutes ?? 0,
      limit_minutes: state.dailyCheckin?.limitMinutes ?? 240,
      remaining_minutes: Math.max(
        0,
        (state.dailyCheckin?.limitMinutes ?? 240) - (state.dailyCheckin?.usedMinutes ?? 0)
      )
    },
    collection: {
      postcard_count: state.album.length,
      souvenir_count: state.souvenirAcquisitions.length,
      journey_count: state.travels.length
    },
    shared_state_initialized: sharedStateInitialized
  };
}

async function handleToolCall(name, args = {}) {
  if (name === "itsees_get_status") {
    const sharedStateInitialized = await hasSharedState();
    const state = await loadState();
    const status = buildStatus(state, sharedStateInitialized);
    const travel = status.active_travel;
    const text = !sharedStateInitialized
      ? "Itsees 共享存档尚未初始化。请先打开更新后的 Itsees App 一次，再从 Codex 发起旅行。"
      : travel
      ? `${status.pet.name}正在${travel.destination_name}旅行，进度 ${travel.progress_percent}%，预计还需 ${travel.remaining_minutes} 分钟。`
      : status.recalled_travel
        ? `${status.pet.name}已从${status.recalled_travel.destination_name}召回，可继续这段旅行。`
        : `${status.pet.name}目前没有进行中的旅行。`;
    return toolResult(text, status);
  }

  if (name === "itsees_list_destinations") {
    const state = await loadState();
    const phase = args.phase === undefined ? null : requirePhase(args.phase);
    let destinations = getDestinationCatalog(state);
    if (phase) destinations = destinations.filter(item => item.phase === phase);
    if (args.unlocked_only === true) destinations = destinations.filter(item => item.unlocked);
    return toolResult(
      `找到 ${destinations.length} 个符合条件的 Itsees 目的地。`,
      { destinations }
    );
  }

  if (name === "itsees_list_pack_items") {
    const state = await loadState();
    let items = listInventoryItems().map(item => {
      const unlock = getInventoryUnlockState(item, state);
      return {
        id: item.id,
        name: item.name,
        type: item.type,
        effect: item.effect,
        unlocked: unlock.isUnlocked,
        unlock_hint: unlock.label
      };
    });
    if (args.unlocked_only === true) items = items.filter(item => item.unlocked);
    return toolResult(`找到 ${items.length} 件符合条件的行囊物品。`, { items });
  }

  if (name === "itsees_start_travel") {
    await requireSharedState();
    const destinationId = requireString(args.destination_id, "destination_id");
    const inferredPhase = inferPhase(destinationId);
    const phase = args.phase === undefined ? inferredPhase : requirePhase(args.phase);
    if (!phase || !inferredPhase || phase !== inferredPhase) {
      throw new ToolInputError(`Unknown destination_id for phase ${phase ?? "unknown"}: ${destinationId}`);
    }
    if (args.selected_item_ids !== undefined && !Array.isArray(args.selected_item_ids)) {
      throw new ToolInputError("selected_item_ids must be an array.");
    }
    let destination;
    const next = await updateState(state => {
      if (state.activeTravel?.status === "traveling") {
        throw new ToolExecutionError("An Itsees journey is already in progress. Recall it before starting another.");
      }
      destination = getDestinationSummary(destinationId, phase, state);
      if (!destination?.unlocked) {
        throw new ToolExecutionError(`${destination?.name ?? destinationId} is not unlocked yet.`);
      }
      const selectedItemIds = args.selected_item_ids ?? state.selectedItemIds;
      const started = startTravel(state, destinationId, selectedItemIds, new Date(), { phase });
      if (started.activeTravel?.status !== "traveling") {
        throw new ToolExecutionError("Itsees could not start the journey because the daily check-in budget is unavailable.");
      }
      return started;
    });
    const travel = summarizeTravel(next.activeTravel, next);
    return toolResult(
      `${getPetById(next.settings.selectedPetId).name}已出发前往${destination.name}，完整旅程为 240 分钟。`,
      { status: "started", travel }
    );
  }

  if (name === "itsees_recall_travel") {
    await requireSharedState();
    let previousPostcardCount = 0;
    const next = await updateState(state => {
      if (state.activeTravel?.status !== "traveling") {
        throw new ToolExecutionError("There is no traveling Itsees pet to recall.");
      }
      previousPostcardCount = state.album.length;
      return summonTravel(state);
    });
    const travel = summarizeTravel(next.activeTravel, next);
    const postcardCount = next.album.length - previousPostcardCount;
    return toolResult(
      `${getPetById(next.settings.selectedPetId).name}已召回，当前进度 ${travel.progress_percent}%${postcardCount > 0 ? `，新增 ${postcardCount} 张明信片` : "，本次尚未新增明信片"}。`,
      { status: travel.status, travel, new_postcard_count: postcardCount }
    );
  }

  if (name === "itsees_continue_travel") {
    await requireSharedState();
    const next = await updateState(state => {
      if (state.lastRecalledTravel?.status !== "recalled") {
        throw new ToolExecutionError("There is no recalled Itsees journey to continue.");
      }
      const continued = continueTravel(state);
      if (continued.activeTravel?.status !== "traveling") {
        throw new ToolExecutionError("Itsees could not continue because the remaining daily check-in budget is insufficient.");
      }
      return continued;
    });
    const travel = summarizeTravel(next.activeTravel, next);
    return toolResult(
      `${getPetById(next.settings.selectedPetId).name}已继续前往${travel.destination_name}。`,
      { status: "continued", travel }
    );
  }

  if (name === "itsees_list_collection") {
    const state = await loadState();
    const kind = requireEnum(args.kind, "kind", ["postcards", "souvenirs", "history"]);
    const limit = args.limit === undefined ? 10 : requireInteger(args.limit, "limit", 1, 50);
    let entries;
    if (kind === "postcards") {
      entries = state.album.slice(0, limit).map(card => ({
        id: card.id,
        title: card.title,
        destination_id: card.destinationId ?? card.themeId ?? card.landmarkId,
        scene_name: card.sceneName,
        message: card.message,
        rarity: card.rarity,
        created_at: card.createdAt
      }));
    } else if (kind === "souvenirs") {
      entries = state.souvenirAcquisitions.slice(0, limit).map(item => ({
        id: item.id,
        souvenir_id: item.souvenirId,
        destination_id: item.destinationId ?? item.themeId ?? item.landmarkId,
        acquired_at: item.acquiredAt ?? item.createdAt
      }));
    } else {
      entries = state.travels.slice(0, limit).map(travel => summarizeTravel(travel, state));
    }
    return toolResult(`返回最近 ${entries.length} 条${kind}记录。`, { kind, entries });
  }

  if (name === "itsees_show_postcards") {
    const state = await loadState();
    const requestedIds = normalizePostcardIds(args.postcard_ids);
    const count = args.count === undefined ? 1 : requireInteger(args.count, "count", 1, 4);
    const postcards = requestedIds
      ? requestedIds.map(postcardId => {
          const postcard = state.album.find(item => item.id === postcardId);
          if (!postcard) throw new ToolExecutionError(`Unknown postcard_id: ${postcardId}`);
          return postcard;
        })
      : state.album.slice(0, count);

    if (postcards.length === 0) {
      return toolResult("Itsees 相册里还没有已经带回的明信片。", {
        postcards: [],
        missing_postcard_ids: []
      });
    }

    const index = await loadPostcardIndex();
    const content = [];
    const displayed = [];
    const missingIds = [];
    for (const postcard of postcards) {
      const image = await readIndexedPostcardImage(postcard.id, index);
      if (!image) {
        missingIds.push(postcard.id);
        continue;
      }
      content.push({
        type: "text",
        text: `${postcard.title}\n${postcard.message}`
      });
      content.push({
        type: "image",
        data: image.bytes.toString("base64"),
        mimeType: image.mimeType
      });
      displayed.push({
        id: postcard.id,
        title: postcard.title,
        destination_id: postcard.destinationId ?? postcard.themeId ?? postcard.landmarkId,
        scene_name: postcard.sceneName,
        message: postcard.message,
        rarity: postcard.rarity,
        created_at: postcard.createdAt,
        mime_type: image.mimeType
      });
    }

    if (displayed.length === 0) {
      return toolResult(
        "这些明信片尚未导出为 Codex 可读图片。请打开更新后的 Itsees App 一次，然后重试。",
        { postcards: [], missing_postcard_ids: missingIds }
      );
    }
    if (missingIds.length > 0) {
      content.push({
        type: "text",
        text: `另有 ${missingIds.length} 张明信片尚未导出；打开更新后的 Itsees App 后可再次尝试。`
      });
    }
    return {
      content,
      structuredContent: {
        postcards: displayed,
        missing_postcard_ids: missingIds
      }
    };
  }

  if (name === "itsees_open_app") {
    await openDesktopApp();
    return toolResult("已请求系统打开 Itsees 桌面应用。", { status: "launch_requested" });
  }

  throw new ToolInputError(`Unknown tool: ${name}`);
}

function normalizePostcardIds(value) {
  if (value === undefined) return null;
  if (!Array.isArray(value) || value.length < 1 || value.length > 4) {
    throw new ToolInputError("postcard_ids must contain from 1 to 4 ids.");
  }
  const ids = value.map((item, index) => requireString(item, `postcard_ids[${index}]`));
  if (new Set(ids).size !== ids.length) {
    throw new ToolInputError("postcard_ids must not contain duplicates.");
  }
  return ids;
}

async function loadPostcardIndex() {
  const indexPath = path.join(path.dirname(statePath), "postcards", "index.json");
  try {
    const details = await stat(indexPath);
    if (!details.isFile() || details.size > MAX_POSTCARD_INDEX_BYTES) {
      return { version: 1, postcards: {} };
    }
    const parsed = JSON.parse(await readFile(indexPath, "utf8"));
    return parsed?.version === 1 && parsed.postcards && typeof parsed.postcards === "object"
      ? parsed
      : { version: 1, postcards: {} };
  } catch (error) {
    if (error?.code === "ENOENT" || error instanceof SyntaxError) return { version: 1, postcards: {} };
    throw error;
  }
}

async function readIndexedPostcardImage(postcardId, index) {
  const entry = index.postcards?.[postcardId];
  if (!entry || typeof entry.filePath !== "string") return null;
  const postcardDirectory = path.resolve(path.dirname(statePath), "postcards");
  const filePath = path.resolve(entry.filePath);
  if (filePath !== postcardDirectory && !filePath.startsWith(`${postcardDirectory}${path.sep}`)) {
    return null;
  }
  let bytes;
  try {
    const details = await stat(filePath);
    if (!details.isFile() || details.size <= 0 || details.size > MAX_POSTCARD_IMAGE_BYTES) return null;
    bytes = await readFile(filePath);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
  if (bytes.byteLength <= 0 || bytes.byteLength > MAX_POSTCARD_IMAGE_BYTES) return null;
  const mimeType = sniffImageMimeType(bytes);
  if (!mimeType || entry.mimeType !== mimeType) return null;
  return { bytes, mimeType };
}

function sniffImageMimeType(bytes) {
  if (
    bytes.length >= 8
    && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12
    && bytes.subarray(0, 4).toString("ascii") === "RIFF"
    && bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

async function hasSharedState() {
  try {
    await access(statePath);
    return true;
  } catch {
    return false;
  }
}

async function requireSharedState() {
  if (await hasSharedState()) return;
  throw new ToolExecutionError(
    "Itsees shared state is not initialized. Open the updated Itsees desktop app once to migrate its existing local save before changing travel from Codex."
  );
}

function requireString(value, name) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ToolInputError(`${name} must be a non-empty string.`);
  }
  return value.trim();
}

function requirePhase(value) {
  if (value !== 1 && value !== 2) throw new ToolInputError("phase must be 1 or 2.");
  return value;
}

function requireEnum(value, name, allowed) {
  if (!allowed.includes(value)) {
    throw new ToolInputError(`${name} must be one of: ${allowed.join(", ")}.`);
  }
  return value;
}

function requireInteger(value, name, minimum, maximum) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new ToolInputError(`${name} must be an integer from ${minimum} to ${maximum}.`);
  }
  return value;
}

async function openDesktopApp() {
  const configuredCommand = process.env.ITSEES_APP_COMMAND;
  let command;
  let args;
  if (configuredCommand) {
    command = configuredCommand;
    args = [];
  } else if (process.platform === "darwin") {
    command = "open";
    args = ["-a", "Itsees"];
  } else if (process.platform === "win32") {
    command = "cmd";
    args = ["/d", "/s", "/c", "start", "", "Itsees"];
  } else {
    command = "itsees";
    args = [];
  }
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { detached: true, stdio: "ignore" });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

async function handleRequest(message) {
  const { id, method, params } = message;
  if (method === "initialize") {
    sendResult(id, {
      protocolVersion: params?.protocolVersion ?? "2025-11-25",
      capabilities: { tools: {} },
      serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      instructions:
        "Use read tools to resolve stable Itsees ids before mutations. Starting, recalling, and continuing travel changes the same local state used by the Itsees desktop app."
    });
    return;
  }
  if (method === "ping") {
    sendResult(id, {});
    return;
  }
  if (method === "tools/list") {
    sendResult(id, { tools });
    return;
  }
  if (method === "tools/call") {
    try {
      const result = await handleToolCall(params?.name, params?.arguments ?? {});
      sendResult(id, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (error instanceof ToolInputError) sendError(id, JsonRpcError.INVALID_PARAMS, message);
      else if (error instanceof ToolExecutionError) {
        sendResult(id, { content: [{ type: "text", text: message }], isError: true });
      } else sendError(id, JsonRpcError.INTERNAL_ERROR, "Itsees tool execution failed.");
    }
    return;
  }
  if (id !== undefined) {
    sendError(id, JsonRpcError.METHOD_NOT_FOUND, `Method not found: ${method}`);
  }
}

const lines = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
lines.on("line", line => {
  if (!line.trim()) return;
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    return;
  }
  void handleRequest(message).catch(error => {
    if (message.id !== undefined) {
      sendError(
        message.id,
        JsonRpcError.INTERNAL_ERROR,
        error instanceof Error ? error.message : String(error)
      );
    }
  });
});
