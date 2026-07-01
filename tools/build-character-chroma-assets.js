import { existsSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import sharp from "sharp";
import { CHARACTER_CUTOUT_MARGIN_RATIO, CHARACTER_SOURCE_SCALE } from "../src/content/art/characterAssetConfig.js";
import {
  alphaBounds,
  ensureDir,
  makePng,
  readPng,
  robustChromaKeyGreenToAlpha,
  writeJson,
  writePng
} from "./external-animation-utils.mjs";

const SOURCE_ROOT = "assets_src/characters";
const RUNTIME_ROOT = "assets/chapter1/characters/bai_mitko";
const REPORT_ROOT = "target/character_chroma";

const CHROMA_OPTIONS = {
  key: "auto",
  low: 12,
  high: 55,
  matteFilter: "median3",
  erode: 1,
  feather: 1,
  despill: 0.75,
  spillBias: 8,
  connectedBackground: true
};

const CHARACTER_CHROMA_SOURCES = [
  {
    key: "idle_south",
    source: join(SOURCE_ROOT, "bai-mitko-idle-chroma-v1.png"),
    outputs: ["idle.png", "idle_south.png"]
  },
  {
    key: "idle_east",
    source: join(SOURCE_ROOT, "bai-mitko-idle-east-chroma-v1.png"),
    outputs: ["idle_east.png"]
  },
  {
    key: "idle_north",
    source: join(SOURCE_ROOT, "bai-mitko-idle-north-chroma-v1.png"),
    outputs: ["idle_north.png"]
  }
];

const requestedKey = parseKey(process.argv.slice(2));

ensureDir(RUNTIME_ROOT);
ensureDir(REPORT_ROOT);

const report = [];
for (const asset of CHARACTER_CHROMA_SOURCES) {
  if (requestedKey !== "all" && asset.key !== requestedKey) continue;
  if (!existsSync(asset.source)) {
    report.push({ key: asset.key, source: asset.source, converted: false, reason: "missing source" });
    continue;
  }

  const source = readPng(asset.source);
  const keyed = robustChromaKeyGreenToAlpha(source, CHROMA_OPTIONS);
  const scaled = await resizeWithSharp(keyed.png, CHARACTER_SOURCE_SCALE);
  const outputPng = addCanvasMargin(scaled, CHARACTER_CUTOUT_MARGIN_RATIO);
  const bounds = alphaBounds(outputPng, 1);
  const outputs = [];

  for (const outputName of asset.outputs) {
    const output = join(RUNTIME_ROOT, outputName);
    writePng(output, outputPng);
    outputs.push(output);
  }

  report.push({
    key: asset.key,
    source: asset.source,
    converted: true,
    outputs,
    sourceScale: CHARACTER_SOURCE_SCALE,
    marginRatio: CHARACTER_CUTOUT_MARGIN_RATIO,
    sourceSize: { width: source.width, height: source.height },
    scaledSize: { width: scaled.width, height: scaled.height },
    outputSize: { width: outputPng.width, height: outputPng.height },
    contentBounds: bounds,
    marginPixels: {
      x: Math.round(scaled.width * CHARACTER_CUTOUT_MARGIN_RATIO),
      y: Math.round(scaled.height * CHARACTER_CUTOUT_MARGIN_RATIO)
    },
    detectedKeyColor: keyed.stats.keyColor,
    backgroundDetected: keyed.stats.backgroundDetected,
    connectedBackgroundUsed: keyed.stats.connectedBackgroundUsed,
    pixelsMadeTransparent: keyed.stats.madeTransparentPixels,
    pixelsWithSoftAlpha: keyed.stats.softAlphaPixels,
    pixelsDespilled: keyed.stats.despilledPixels,
    warnings: keyed.stats.possibleForegroundDamagePixels > 0
      ? [`${keyed.stats.possibleForegroundDamagePixels} interior green-ish pixels may have been affected`]
      : []
  });
}

writeJson(join(REPORT_ROOT, "character-chroma-report.json"), report);
console.log(JSON.stringify(report, null, 2));

function addCanvasMargin(source, ratio) {
  const marginX = Math.round(source.width * ratio);
  const marginY = Math.round(source.height * ratio);
  const output = makePng(source.width + marginX * 2, source.height + marginY * 2);
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const sourceIndex = (y * source.width + x) * 4;
      const targetIndex = ((y + marginY) * output.width + x + marginX) * 4;
      output.data[targetIndex] = source.data[sourceIndex];
      output.data[targetIndex + 1] = source.data[sourceIndex + 1];
      output.data[targetIndex + 2] = source.data[sourceIndex + 2];
      output.data[targetIndex + 3] = source.data[sourceIndex + 3];
    }
  }
  return output;
}

async function resizeWithSharp(source, scale) {
  if (scale === 1) return source;
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const data = await sharp(Buffer.from(source.data), {
    raw: { width: source.width, height: source.height, channels: 4 }
  })
    .resize({ width, height, kernel: sharp.kernel.lanczos3 })
    .raw()
    .toBuffer();

  const output = new PNG({ width, height });
  output.data = Buffer.from(data);
  return output;
}

function parseKey(args) {
  for (const arg of args) {
    if (!arg.startsWith("--key=")) continue;
    return arg.slice("--key=".length).trim() || "all";
  }
  return "all";
}
