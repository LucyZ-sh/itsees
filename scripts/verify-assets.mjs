import { createHash } from "node:crypto";
import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const manifestPath = path.join(projectRoot, "assets", "asset-manifest.json");
const statusOnly = process.argv.includes("--status");

let manifest;
try {
  manifest = JSON.parse(await readFile(manifestPath, "utf8"));
} catch {
  process.stderr.write("Asset manifest is missing. Restore assets/asset-manifest.json from this release.\n");
  process.exitCode = statusOnly ? 0 : 1;
  process.exit();
}

const missing = [];
const invalid = [];
let verified = 0;

for (const packageEntry of manifest.packages) {
  for (const file of packageEntry.files) {
    const filePath = resolveInside(projectRoot, file.path);
    try {
      await access(filePath);
      const details = await stat(filePath);
      if (!details.isFile() || details.size !== file.size) {
        invalid.push(file.path);
        continue;
      }
      if (!statusOnly && await hashFile(filePath) !== file.sha256) {
        invalid.push(file.path);
        continue;
      }
      verified += 1;
    } catch {
      missing.push(file.path);
    }
  }
}

if (missing.length || invalid.length) {
  process.stderr.write(
    `Assets incomplete: ${missing.length} missing, ${invalid.length} invalid, ${verified} present.\n`
    + "Install them with: pnpm assets:install -- --source ../release-assets\n"
  );
  process.exitCode = statusOnly ? 0 : 1;
} else {
  process.stdout.write(`Assets ${statusOnly ? "present" : "verified"}: ${verified} files\n`);
}

async function hashFile(filePath) {
  const hash = createHash("sha256");
  hash.update(await readFile(filePath));
  return hash.digest("hex");
}

function resolveInside(root, relativePath) {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, relativePath);
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`Path escapes project root: ${relativePath}`);
  }
  return resolved;
}
