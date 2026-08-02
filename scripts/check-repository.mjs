import { lstat, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const forbiddenDirectories = new Set([
  "experiments",
  "phase2-app"
]);
const generatedDirectories = new Set(["__pycache__", "dist", "node_modules", "tmp"]);
const generatedPaths = new Set([".release-secrets", "app/protected"]);
const violations = [];

await walk(projectRoot, "");

for (const required of [
  "README.md",
  "RIGHTS.md",
  "THIRD_PARTY_NOTICES.md",
  "assets/asset-manifest.json"
]) {
  try {
    await stat(path.join(projectRoot, required));
  } catch {
    violations.push(`missing required file: ${required}`);
  }
}

if (violations.length) {
  process.stderr.write(`${violations.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write("Repository hygiene check passed\n");
}

async function walk(directory, relativeDirectory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (relativeDirectory === "" && [".git", ".asset-staging"].includes(entry.name)) continue;
    const relativePath = path.posix.join(relativeDirectory, entry.name);
    const absolutePath = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      violations.push(`symbolic link is not allowed: ${relativePath}`);
      continue;
    }
    if (entry.isDirectory()) {
      if (generatedPaths.has(relativePath)) continue;
      if (generatedDirectories.has(entry.name)) continue;
      if (forbiddenDirectories.has(entry.name)) {
        violations.push(`forbidden directory: ${relativePath}`);
        continue;
      }
      await walk(absolutePath, relativePath);
      continue;
    }
    if (!entry.isFile()) continue;
    const details = await lstat(absolutePath);
    if (details.size > 50 * 1024 * 1024) {
      violations.push(`file exceeds 50 MiB: ${relativePath}`);
    }
    if (isTextFile(relativePath)) {
      if (relativePath === "scripts/check-repository.mjs") continue;
      const source = await readFile(absolutePath, "utf8");
      if (containsMachineSpecificHomePath(source)) {
        violations.push(`machine-specific path: ${relativePath}`);
      }
      if (source.includes("../scripts/with-runtime.sh")) {
        violations.push(`parent runtime dependency: ${relativePath}`);
      }
    }
  }
}

function containsMachineSpecificHomePath(source) {
  for (const match of source.matchAll(/\/Users\/([^/\s"']+)\//g)) {
    if (match[1] !== "example") return true;
  }
  for (const match of source.matchAll(/[A-Za-z]:\\Users\\([^\\\s"']+)\\/g)) {
    if (match[1].toLowerCase() !== "example") return true;
  }
  return false;
}

function isTextFile(filePath) {
  return [
    ".cjs", ".css", ".html", ".js", ".json", ".md", ".mjs",
    ".py", ".sh", ".svg", ".yaml", ".yml"
  ].includes(path.extname(filePath).toLowerCase());
}
