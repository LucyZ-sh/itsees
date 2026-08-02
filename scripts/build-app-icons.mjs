import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const brandDirectory = [
  path.join(root, "app", "assets", "brand"),
  path.join(root, "design", "itsees-brand-concepts", "final-recommendation")
].find(candidate => existsSync(path.join(candidate, "app-logo-teddy-great-wall.png")));
if (!brandDirectory) throw new Error("Unable to find the Itsees source app icon.");
const source = path.join(brandDirectory, "app-logo-teddy-great-wall.png");
const temporaryDirectory = mkdtempSync(path.join(os.tmpdir(), "itsees-icons-"));

try {
  const iconset = path.join(temporaryDirectory, "Itsees.iconset");
  mkdirSync(iconset, { recursive: true });
  const macSizes = [
    [16, "icon_16x16.png"],
    [32, "icon_16x16@2x.png"],
    [32, "icon_32x32.png"],
    [64, "icon_32x32@2x.png"],
    [128, "icon_128x128.png"],
    [256, "icon_128x128@2x.png"],
    [256, "icon_256x256.png"],
    [512, "icon_256x256@2x.png"],
    [512, "icon_512x512.png"],
    [1024, "icon_512x512@2x.png"]
  ];
  for (const [size, filename] of macSizes) {
    execFileSync("sips", ["-z", String(size), String(size), source, "--out", path.join(iconset, filename)], {
      stdio: "ignore"
    });
  }
  execFileSync("iconutil", ["-c", "icns", iconset, "-o", path.join(brandDirectory, "app-logo-teddy-great-wall.icns")]);

  const windowsSizes = [16, 32, 48, 64, 128, 256];
  const images = windowsSizes.map(size => {
    const output = path.join(temporaryDirectory, `icon-${size}.png`);
    execFileSync("sips", ["-z", String(size), String(size), source, "--out", output], { stdio: "ignore" });
    return { size, data: readFileSync(output) };
  });
  const headerSize = 6 + images.length * 16;
  let offset = headerSize;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  images.forEach(({ size, data }, index) => {
    const entry = 6 + index * 16;
    header.writeUInt8(size === 256 ? 0 : size, entry);
    header.writeUInt8(size === 256 ? 0 : size, entry + 1);
    header.writeUInt8(0, entry + 2);
    header.writeUInt8(0, entry + 3);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  writeFileSync(
    path.join(brandDirectory, "app-logo-teddy-great-wall.ico"),
    Buffer.concat([header, ...images.map(image => image.data)])
  );
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
