const fs = require("fs");
const os = require("os");
const path = require("path");
const { randomUUID } = require("crypto");

const STATE_DIRECTORY_NAME = ".itsees";
const STATE_FILE_NAME = "travel-state-v1.json";
const MAX_STATE_BYTES = 16 * 1024 * 1024;
const DEFAULT_LOCK_TIMEOUT_MS = 5_000;
const DEFAULT_LOCK_RETRY_MS = 20;
const DEFAULT_STALE_LOCK_MS = 30_000;

function getDefaultTravelStatePath(homeDirectory = os.homedir()) {
  return path.join(homeDirectory, STATE_DIRECTORY_NAME, STATE_FILE_NAME);
}

function createTravelStateStore(options = {}) {
  const filePath = path.resolve(options.filePath ?? getDefaultTravelStatePath());
  const lockPath = `${filePath}.lock`;

  function read() {
    try {
      const raw = fs.readFileSync(filePath, "utf8");
      if (Buffer.byteLength(raw, "utf8") > MAX_STATE_BYTES) {
        throw new Error("Itsees travel state exceeds the supported size.");
      }
      const parsed = JSON.parse(raw);
      return isPlainObject(parsed) ? parsed : null;
    } catch (error) {
      if (error?.code === "ENOENT") return null;
      throw error;
    }
  }

  function write(state) {
    if (!isPlainObject(state)) {
      throw new TypeError("Itsees travel state must be a JSON object.");
    }
    const serialized = `${JSON.stringify(state, null, 2)}\n`;
    if (Buffer.byteLength(serialized, "utf8") > MAX_STATE_BYTES) {
      throw new Error("Itsees travel state exceeds the supported size.");
    }

    fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
    const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    try {
      fs.writeFileSync(temporaryPath, serialized, { encoding: "utf8", mode: 0o600 });
      fs.renameSync(temporaryPath, filePath);
    } finally {
      try {
        fs.unlinkSync(temporaryPath);
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
    }
    return state;
  }

  async function update(mutator, updateOptions = {}) {
    if (typeof mutator !== "function") {
      throw new TypeError("Itsees state transaction requires a mutator.");
    }
    const release = await acquireLock({
      timeoutMs: updateOptions.timeoutMs,
      retryMs: updateOptions.retryMs,
      staleMs: updateOptions.staleMs
    });
    try {
      const current = read();
      const currentRevision = getRevision(current);
      const expectedRevision = Number.isInteger(updateOptions.expectedRevision)
        ? updateOptions.expectedRevision
        : null;
      if (expectedRevision !== null && expectedRevision !== currentRevision) {
        return Object.freeze({ ok: false, conflict: true, current });
      }
      const mutated = await mutator(current);
      if (mutated === current || mutated === undefined) {
        return Object.freeze({ ok: true, changed: false, state: current });
      }
      if (!isPlainObject(mutated)) {
        throw new TypeError("Itsees state transaction must return a JSON object.");
      }
      const next = {
        ...mutated,
        revision: currentRevision + 1,
        updatedAt: new Date().toISOString()
      };
      write(next);
      return Object.freeze({ ok: true, changed: true, state: next });
    } finally {
      await release();
    }
  }

  async function acquireLock(lockOptions = {}) {
    const timeoutMs = positiveNumberOr(lockOptions.timeoutMs, DEFAULT_LOCK_TIMEOUT_MS);
    const retryMs = positiveNumberOr(lockOptions.retryMs, DEFAULT_LOCK_RETRY_MS);
    const staleMs = positiveNumberOr(lockOptions.staleMs, DEFAULT_STALE_LOCK_MS);
    const token = createLockToken();
    const deadline = Date.now() + timeoutMs;
    fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });

    while (true) {
      try {
        const handle = await fs.promises.open(lockPath, "wx", 0o600);
        try {
          await handle.writeFile(JSON.stringify({ token, pid: process.pid, acquiredAt: Date.now() }), "utf8");
        } finally {
          await handle.close();
        }
        let heartbeatWork = Promise.resolve();
        const heartbeatInterval = Math.max(10, Math.floor(staleMs / 3));
        const heartbeat = setInterval(() => {
          heartbeatWork = heartbeatWork.then(() => refreshOwnedLock(lockPath, token));
        }, heartbeatInterval);
        heartbeat.unref?.();
        return async () => {
          clearInterval(heartbeat);
          await heartbeatWork;
          await releaseOwnedLock(lockPath, token);
        };
      } catch (error) {
        if (error?.code !== "EEXIST") throw error;
        await reclaimStaleLock(lockPath, staleMs);
        if (Date.now() >= deadline) {
          const lockError = new Error("Timed out waiting for the Itsees travel-state lock.");
          lockError.code = "ITSEES_STATE_LOCK_TIMEOUT";
          throw lockError;
        }
        await delay(retryMs);
      }
    }
  }

  function watch(listener, interval = 500) {
    if (typeof listener !== "function") {
      throw new TypeError("Itsees travel state watcher requires a listener.");
    }
    let previousSnapshot = safeSerialize(read());
    const watcher = () => {
      let nextState;
      try {
        nextState = read();
      } catch (error) {
        listener(null, error);
        return;
      }
      const nextSnapshot = safeSerialize(nextState);
      if (nextSnapshot === previousSnapshot) return;
      previousSnapshot = nextSnapshot;
      listener(nextState, null);
    };
    const timer = setInterval(watcher, interval);
    timer.unref?.();
    return () => clearInterval(timer);
  }

  return Object.freeze({
    filePath,
    lockPath,
    read,
    write,
    update,
    watch
  });
}

function getRevision(state) {
  return Number.isInteger(state?.revision) && state.revision >= 0 ? state.revision : 0;
}

function positiveNumberOr(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function createLockToken() {
  return typeof randomUUID === "function"
    ? randomUUID()
    : `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function reclaimStaleLock(lockPath, staleMs) {
  let details;
  try {
    details = await fs.promises.stat(lockPath);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    return false;
  }
  if (Date.now() - details.mtimeMs <= staleMs) return false;
  const quarantinePath = `${lockPath}.stale.${process.pid}.${Date.now()}`;
  try {
    await fs.promises.rename(lockPath, quarantinePath);
    await fs.promises.unlink(quarantinePath).catch(error => {
      if (error?.code !== "ENOENT") throw error;
    });
    return true;
  } catch (error) {
    if (["ENOENT", "EEXIST"].includes(error?.code)) return false;
    throw error;
  }
}

async function releaseOwnedLock(lockPath, token) {
  let metadata;
  try {
    metadata = JSON.parse(await fs.promises.readFile(lockPath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return;
    if (error instanceof SyntaxError) return;
    throw error;
  }
  if (metadata?.token !== token) return;
  await fs.promises.unlink(lockPath).catch(error => {
    if (error?.code !== "ENOENT") throw error;
  });
}

async function refreshOwnedLock(lockPath, token) {
  let metadata;
  try {
    metadata = JSON.parse(await fs.promises.readFile(lockPath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT" || error instanceof SyntaxError) return false;
    throw error;
  }
  if (metadata?.token !== token) return false;
  const now = new Date();
  try {
    await fs.promises.utimes(lockPath, now, now);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeSerialize(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

module.exports = {
  MAX_STATE_BYTES,
  STATE_DIRECTORY_NAME,
  STATE_FILE_NAME,
  createTravelStateStore,
  getDefaultTravelStatePath
};
