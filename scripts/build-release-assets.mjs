import { createHash } from "node:crypto";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import * as tar from "tar";
import { ASSET_PROVENANCE } from "./asset-provenance.mjs";

const args = parseArgs(process.argv.slice(2));
const projectRoot = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.resolve(args.source ?? "");
const outputRoot = path.resolve(args.output ?? path.join(projectRoot, "..", "release-assets"));

if (!args.source) {
  throw new Error("Usage: pnpm assets:build -- --source /path/to/source-workspace [--output /path/to/release-assets]");
}

await assertDirectory(sourceRoot);
await mkdir(outputRoot, { recursive: true });
const buildRoot = await mkdtemp(path.join(outputRoot, ".build-"));

try {
  const packageDefinitions = await createPackageDefinitions(sourceRoot);
  const packages = [];

  for (const definition of packageDefinitions) {
    const packageRoot = path.join(buildRoot, definition.id);
    const files = [];
    await mkdir(packageRoot, { recursive: true });

    for (const entry of definition.entries) {
      const destination = path.join(packageRoot, entry.target);
      await mkdir(path.dirname(destination), { recursive: true });
      await cp(entry.source, destination);
      const info = await fileInfo(destination, entry.target);
      files.push(info);
    }

    files.sort((left, right) => left.path.localeCompare(right.path));
    const archiveName = `itsees-${definition.id}-assets-v1.tar`;
    const archivePath = path.join(outputRoot, archiveName);
    await rm(archivePath, { force: true });
    await tar.c({
      cwd: packageRoot,
      file: archivePath,
      portable: true,
      noMtime: true
    }, ["app"]);

    packages.push({
      id: definition.id,
      archive: archiveName,
      archiveSha256: await hashFile(archivePath),
      targets: definition.targets,
      files
    });
  }

  const manifest = {
    schema: "itsees-asset-manifest/1",
    version: "v1",
    generatedAt: new Date().toISOString(),
    packages
  };
  const manifestPath = path.join(outputRoot, "asset-manifest.json");
  await writeJson(manifestPath, manifest);

  const provenancePath = path.join(outputRoot, "provenance.json");
  await writeJson(provenancePath, ASSET_PROVENANCE);

  const checksumTargets = [
    ...packages.map(item => item.archive),
    "asset-manifest.json",
    "provenance.json"
  ];
  const checksumLines = [];
  for (const fileName of checksumTargets) {
    checksumLines.push(`${await hashFile(path.join(outputRoot, fileName))}  ${fileName}`);
  }
  await writeFile(path.join(outputRoot, "checksums.sha256"), `${checksumLines.join("\n")}\n`);

  const summary = packages.map(item => `${item.id}:${item.files.length}`).join(" ");
  process.stdout.write(`Built Itsees asset packages in ${outputRoot} (${summary})\n`);
} finally {
  await rm(buildRoot, { recursive: true, force: true });
}

async function createPackageDefinitions(root) {
  const coreEntries = [
    ...await collectByExtension(path.join(root, "app/assets/themes"), [".webp"], "app/assets/themes"),
    ...await collectByExtension(path.join(root, "app/assets/maps"), [".webp", ".svg"], "app/assets/maps"),
    ...await collectByExtension(path.join(root, "app/assets/pack"), [".png"], "app/assets/pack"),
    ...await collectByExtension(path.join(root, "app/assets/souvenirs"), [".png", ".webp"], "app/assets/souvenirs"),
    ...await collectPetAssets(root)
  ];

  const atlasEntries = await collectAtlasAssets(root);
  const musicEntries = await collectByExtension(
    path.join(root, "app/assets/music/weather-bgm"),
    [".mp3"],
    "app/assets/music/weather-bgm"
  );

  if (musicEntries.length !== 210) {
    throw new Error(`Expected 210 music tracks, found ${musicEntries.length}`);
  }

  return [
    {
      id: "core",
      targets: [
        "app/assets/themes",
        "app/assets/maps",
        "app/assets/pack",
        "app/assets/souvenirs",
        "app/assets/pets"
      ],
      entries: uniqueEntries(coreEntries)
    },
    {
      id: "atlas",
      targets: ["app/assets/atlas"],
      entries: uniqueEntries(atlasEntries)
    },
    {
      id: "music",
      targets: ["app/assets/music"],
      entries: uniqueEntries(musicEntries)
    }
  ];
}

async function collectPetAssets(root) {
  const petsRoot = path.join(root, "app/assets/pets");
  const entries = [];
  for (const entry of await readdir(petsRoot, { withFileTypes: true })) {
    if (entry.isFile() && path.extname(entry.name).toLowerCase() === ".png") {
      entries.push({
        source: path.join(petsRoot, entry.name),
        target: path.posix.join("app/assets/pets", entry.name)
      });
    }
  }
  entries.push(...await collectByExtension(
    path.join(petsRoot, "states"),
    [".gif"],
    "app/assets/pets/states"
  ));
  entries.push(...await collectByExtension(
    path.join(petsRoot, "weather"),
    [".webp"],
    "app/assets/pets/weather"
  ));
  return entries;
}

async function collectAtlasAssets(root) {
  const entries = await collectByExtension(
    path.join(root, "phase2-app/assets/landmarks/q"),
    [".webp"],
    "app/assets/atlas/landmarks/q"
  );
  if (entries.length !== 15) {
    throw new Error(`Expected 15 Atlas postcard assets, found ${entries.length}`);
  }

  const configPath = path.join(root, "phase2-app/src/worldSceneConfigs.js");
  const source = await readFile(configPath, "utf8");
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: configPath });
  const scenes = Object.values(sandbox.window.IMAGE_WORLD_SCENES?.scenes ?? {});
  if (scenes.length !== 15 || scenes.some(scene => scene.subScenes?.length !== 4)) {
    throw new Error("Atlas world-scene configuration must contain 15 destinations with 4 subscenes each");
  }

  for (const scene of scenes) {
    for (const asset of [scene.main.imageSrc, ...scene.subScenes.map(item => item.imageSrc)]) {
      const relative = String(asset).replace(/^\.\//, "");
      entries.push({
        source: path.join(root, "phase2-app", relative),
        target: path.posix.join("app/assets/atlas", relative.slice("assets/".length))
      });
    }
  }
  return entries;
}

async function collectByExtension(directory, extensions, targetRoot) {
  const results = [];
  await walk(directory, async filePath => {
    if (!extensions.includes(path.extname(filePath).toLowerCase())) return;
    const relative = path.relative(directory, filePath).split(path.sep).join("/");
    results.push({
      source: filePath,
      target: path.posix.join(targetRoot, relative)
    });
  });
  return results;
}

async function walk(directory, visitor) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(entryPath, visitor);
    else if (entry.isFile()) await visitor(entryPath);
  }
}

function uniqueEntries(entries) {
  const byTarget = new Map();
  for (const entry of entries) byTarget.set(entry.target, entry);
  return [...byTarget.values()].sort((left, right) => left.target.localeCompare(right.target));
}

async function fileInfo(filePath, relativePath) {
  const details = await stat(filePath);
  return {
    path: relativePath.split(path.sep).join("/"),
    size: details.size,
    sha256: await hashFile(filePath)
  };
}

async function hashFile(filePath) {
  const hash = createHash("sha256");
  hash.update(await readFile(filePath));
  return hash.digest("hex");
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function assertDirectory(directory) {
  const details = await stat(directory);
  if (!details.isDirectory()) throw new Error(`Not a directory: ${directory}`);
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === "--source" || key === "--output") {
      result[key.slice(2)] = argv[index + 1];
      index += 1;
    }
  }
  return result;
}
