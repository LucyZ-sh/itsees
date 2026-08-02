import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_MAX_BYTES = 16 * 1024 * 1024;

export function createMcpStateStore(filePath, { maxBytes = DEFAULT_MAX_BYTES } = {}) {
  const resolvedPath = path.resolve(filePath);
  const lockPath = `${resolvedPath}.lock`;

  async function read() {
    try {
      const details = await stat(resolvedPath);
      if (!details.isFile() || details.size > maxBytes) {
        throw new Error("Itsees travel state exceeds the supported size.");
      }
      const raw = await readFile(resolvedPath, "utf8");
      const parsed = JSON.parse(raw);
      return isRecord(parsed) ? parsed : null;
    } catch (error) {
      if (error?.code === "ENOENT" || error instanceof SyntaxError) return null;
      throw error;
    }
  }

  async function update(mutator, { timeoutMs = 5_000, retryMs = 20, staleMs = 30_000 } = {}) {
    const release = await acquireOwnedLock(resolvedPath, lockPath, { timeoutMs, retryMs, staleMs });
    try {
      const current = await read();
      const nextValue = await mutator(current);
      if (nextValue === current || nextValue === undefined) return { ok: true, changed: false, state: current };
      if (!isRecord(nextValue)) throw new TypeError("Itsees state transaction must return a JSON object.");
      const next = {
        ...nextValue,
        revision: getRevision(current) + 1,
        updatedAt: new Date().toISOString()
      };
      await writeUnlocked(resolvedPath, next, maxBytes);
      return { ok: true, changed: true, state: next };
    } finally {
      await release();
    }
  }

  return Object.freeze({ filePath: resolvedPath, lockPath, read, update });
}

async function acquireOwnedLock(filePath, lockPath, { timeoutMs, retryMs, staleMs }) {
  await mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
  const token = randomUUID();
  const deadline = Date.now() + timeoutMs;
  while (true) {
    try {
      const handle = await open(lockPath, "wx", 0o600);
      try {
        await handle.writeFile(JSON.stringify({ token, pid: process.pid, acquiredAt: Date.now() }), "utf8");
      } finally {
        await handle.close();
      }
      return async () => releaseOwnedLock(lockPath, token);
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      await reclaimStaleLock(lockPath, staleMs);
      if (Date.now() >= deadline) {
        const lockError = new Error("Timed out waiting for the Itsees travel-state lock.");
        lockError.code = "ITSEES_STATE_LOCK_TIMEOUT";
        throw lockError;
      }
      await new Promise(resolve => setTimeout(resolve, retryMs));
    }
  }
}

async function reclaimStaleLock(lockPath, staleMs) {
  let details;
  try {
    details = await stat(lockPath);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    return;
  }
  if (Date.now() - details.mtimeMs <= staleMs) return;
  const quarantinePath = `${lockPath}.stale.${process.pid}.${Date.now()}`;
  try {
    await rename(lockPath, quarantinePath);
    await unlink(quarantinePath).catch(error => {
      if (error?.code !== "ENOENT") throw error;
    });
  } catch (error) {
    if (!["ENOENT", "EEXIST"].includes(error?.code)) throw error;
  }
}

async function releaseOwnedLock(lockPath, token) {
  let metadata;
  try {
    metadata = JSON.parse(await readFile(lockPath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT" || error instanceof SyntaxError) return;
    throw error;
  }
  if (metadata?.token !== token) return;
  await unlink(lockPath).catch(error => {
    if (error?.code !== "ENOENT") throw error;
  });
}

async function writeUnlocked(filePath, state, maxBytes) {
  const serialized = `${JSON.stringify(state, null, 2)}\n`;
  if (Buffer.byteLength(serialized, "utf8") > maxBytes) throw new Error("Itsees travel state exceeds the supported size.");
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryPath, serialized, { encoding: "utf8", mode: 0o600 });
    await rename(temporaryPath, filePath);
  } finally {
    await unlink(temporaryPath).catch(error => {
      if (error?.code !== "ENOENT") throw error;
    });
  }
}

function getRevision(state) {
  return Number.isInteger(state?.revision) && state.revision >= 0 ? state.revision : 0;
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
