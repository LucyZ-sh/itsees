import { createHash } from "node:crypto";
import {
  access,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  stat,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import * as tar from "tar";

const args = parseArgs(process.argv.slice(2));
const projectRoot = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.resolve(args.source ?? path.join(projectRoot, "..", "release-assets"));
const manifestPath = path.join(sourceRoot, "asset-manifest.json");
const trustedManifestPath = path.join(projectRoot, "assets", "asset-manifest.json");
const [manifestBytes, trustedManifestBytes] = await Promise.all([
  readFile(manifestPath),
  readFile(trustedManifestPath)
]);
if (createHash("sha256").update(manifestBytes).digest("hex")
  !== createHash("sha256").update(trustedManifestBytes).digest("hex")) {
  throw new Error("Asset manifest does not match the trusted manifest pinned in this source release.");
}
const manifest = JSON.parse(manifestBytes.toString("utf8"));
const ALLOWED_TARGETS = new Set([
  "app/assets/atlas",
  "app/assets/maps",
  "app/assets/music",
  "app/assets/pack",
  "app/assets/pets",
  "app/assets/souvenirs",
  "app/assets/themes"
]);

if (manifest.schema !== "itsees-asset-manifest/1") {
  throw new Error(`Unsupported asset manifest: ${manifest.schema ?? "missing schema"}`);
}

const stagingRoot = await mkdtemp(path.join(projectRoot, ".asset-staging-"));
const backups = [];
const installedTargets = [];

try {
  for (const packageEntry of manifest.packages) {
    if (typeof packageEntry.archive !== "string" || path.basename(packageEntry.archive) !== packageEntry.archive) {
      throw new Error(`Unsafe asset archive name: ${String(packageEntry.archive)}`);
    }
    const archivePath = resolveInside(sourceRoot, packageEntry.archive);
    const actualArchiveHash = await hashFile(archivePath);
    if (actualArchiveHash !== packageEntry.archiveSha256) {
      throw new Error(`Archive checksum mismatch: ${packageEntry.archive}`);
    }
    await tar.x({
      cwd: stagingRoot,
      file: archivePath,
      strict: true,
      preservePaths: false,
      filter(entryPath, entry) {
        validateTarEntry(entryPath, entry);
        return true;
      }
    });
  }

  await verifyFiles(stagingRoot, manifest);

  for (const packageEntry of manifest.packages) {
    for (const relativeTarget of packageEntry.targets) {
      if (!ALLOWED_TARGETS.has(relativeTarget)) {
        throw new Error(`Unsupported asset install target: ${relativeTarget}`);
      }
      const stagedTarget = resolveInside(stagingRoot, relativeTarget);
      const finalTarget = resolveInside(projectRoot, relativeTarget);
      const backupTarget = `${finalTarget}.asset-backup-${process.pid}`;
      await mkdir(path.dirname(finalTarget), { recursive: true });
      if (await pathExists(finalTarget)) {
        await rename(finalTarget, backupTarget);
        backups.push({ finalTarget, backupTarget });
      }
      await rename(stagedTarget, finalTarget);
      installedTargets.push(finalTarget);
    }
  }

  for (const backup of backups) {
    await rm(backup.backupTarget, { recursive: true, force: true });
  }

  const musicRoot = path.join(projectRoot, "app/assets/music/weather-bgm");
  const registryPath = path.resolve(
    process.env.ITSEES_ASSET_REGISTRY_PATH
      ?? path.join(os.homedir(), ".itsees", "assets-v1.json")
  );
  const registryTemporaryPath = `${registryPath}.tmp-${process.pid}`;
  await mkdir(path.dirname(registryPath), { recursive: true, mode: 0o700 });
  await writeFile(registryTemporaryPath, `${JSON.stringify({
    schema: "itsees-assets/1",
    version: manifest.version,
    musicRoot
  }, null, 2)}\n`, { mode: 0o600 });
  await rename(registryTemporaryPath, registryPath);
  process.stdout.write(`Installed and verified ${manifest.packages.length} Itsees asset packages\n`);
} catch (error) {
  for (const finalTarget of installedTargets.reverse()) {
    await rm(finalTarget, { recursive: true, force: true });
  }
  for (const backup of backups.reverse()) {
    if (await pathExists(backup.backupTarget)) {
      await rename(backup.backupTarget, backup.finalTarget);
    }
  }
  throw error;
} finally {
  await rm(stagingRoot, { recursive: true, force: true });
}

async function verifyFiles(root, assetManifest) {
  for (const packageEntry of assetManifest.packages) {
    for (const file of packageEntry.files) {
      const filePath = resolveInside(root, file.path);
      const details = await stat(filePath);
      if (!details.isFile() || details.size !== file.size) {
        throw new Error(`Asset size mismatch: ${file.path}`);
      }
      if (await hashFile(filePath) !== file.sha256) {
        throw new Error(`Asset checksum mismatch: ${file.path}`);
      }
    }
  }
}

function validateTarEntry(entryPath, entry) {
  const normalized = entryPath.replaceAll("\\", "/");
  if (
    normalized.startsWith("/")
    || normalized.split("/").includes("..")
    || path.posix.normalize(normalized).startsWith("../")
  ) {
    throw new Error(`Unsafe archive path: ${entryPath}`);
  }
  if (["SymbolicLink", "Link"].includes(entry.type)) {
    throw new Error(`Archive links are not allowed: ${entryPath}`);
  }
}

function resolveInside(root, relativePath) {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, relativePath);
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`Path escapes root: ${relativePath}`);
  }
  return resolved;
}

async function hashFile(filePath) {
  const hash = createHash("sha256");
  hash.update(await readFile(filePath));
  return hash.digest("hex");
}

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--source") {
      result.source = argv[index + 1];
      index += 1;
    }
  }
  return result;
}
