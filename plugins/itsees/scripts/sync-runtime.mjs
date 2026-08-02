import { cp, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectRoot = path.resolve(pluginRoot, "..", "..");
const sourceDirectory = path.join(projectRoot, "app", "src");
const targetDirectory = path.join(pluginRoot, "runtime", "app-src");

await rm(targetDirectory, { recursive: true, force: true });
await mkdir(targetDirectory, { recursive: true });

const sourceFiles = (await readdir(sourceDirectory))
  .filter(fileName => fileName.endsWith(".js"))
  .sort();

for (const fileName of sourceFiles) {
  await cp(path.join(sourceDirectory, fileName), path.join(targetDirectory, fileName));
}

process.stdout.write(`Synced ${sourceFiles.length} Itsees runtime modules into ${targetDirectory}\n`);
