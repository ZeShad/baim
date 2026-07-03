import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, copyFileSync, rmSync } from "node:fs";
import { basename, dirname, extname, join, normalize, relative } from "node:path";
import { inflateRawSync } from "node:zlib";
import { PNG } from "pngjs";
import gifenc from "gifenc";
import {
  alphaBounds,
  blit,
  drawChecker,
  drawLabel,
  fillRect,
  makePng,
  pixelIndex,
  readPng,
  writePng
} from "./character-frame-utils.mjs";

const { GIFEncoder, quantize, applyPalette } = gifenc;

export const EXTERNAL_ROOT = "assets_src/characters/bai_mitko/external_animation_v1";
export const INPUT_DIR = join(EXTERNAL_ROOT, "input");
export const TARGET_ROOT = "target/external_animation_v1";
export const UNPACKED_DIR = join(TARGET_ROOT, "unpacked");
export const PREVIEWS_DIR = join(TARGET_ROOT, "previews");
export const RUNTIME_DIR = join(TARGET_ROOT, "runtime");
export const REPORTS_DIR = join(TARGET_ROOT, "reports");
export const CLEANED_DIR = join(TARGET_ROOT, "cleaned");
export const CHROMA_REPORTS_DIR = join(TARGET_ROOT, "chroma_reports");
export const CHROMA_PREVIEWS_DIR = join(TARGET_ROOT, "chroma_previews");
export const SELECTION_PATH = join(EXTERNAL_ROOT, "external-animation-selection.json");

export const EXTERNAL_INPUTS = [
  { key: "walk_east_start", zipName: "bai-mitko-walk-east-start.zip", source: "C:/t/test/bai-mitko-walk-east-start.zip", active: true },
  { key: "walk_east_loop", zipName: "bai-mitko-walk-east-loop.zip", source: "C:/t/test/bai-mitko-walk-east-loop.zip", active: true },
  { key: "walk_east_stop", zipName: "bai-mitko-walk-east-stop.zip", source: "C:/t/test/bai-mitko-walk-east-stop.zip", active: true },
  { key: "idle_east_1", zipName: "bai-mitko-idle-east-1.zip", source: "C:/t/test/bai-mitko-idle-east-1.zip", active: true },
  { key: "idle_east_2", zipName: "bai-mitko-idle-east-2.zip", source: "C:/t/test/bai-mitko-idle-east-2.zip", active: true },
  { key: "idle_east_3", zipName: "bai-mitko-idle-east-3.zip", source: "C:/t/test/bai-mitko-idle-east-3.zip", active: true },
  { key: "idle_east_4", zipName: "bai-mitko-idle-east-4.zip", source: "C:/t/test/bai-mitko-idle-east-4.zip", active: true },
  { key: "idle_east_5", zipName: "bai-mitko-idle-east-5.zip", source: "C:/t/test/bai-mitko-idle-east-5.zip", active: true },
  { key: "idle_east_6", zipName: "bai-mitko-idle-east-6.zip", source: "C:/t/test/bai-mitko-idle-east-6.zip", active: true },
  { key: "talk_east_long_1", zipName: "bai-mitko-talk-east-long-1.zip", source: "C:/t/test/bai-mitko-talk-east-long-1.zip", active: true },
  { key: "talk_east_long_2", zipName: "bai-mitko-talk-east-long-2.zip", source: "C:/t/test/bai-mitko-talk-east-long-2.zip", active: true },
  { key: "talk_east_short_1", zipName: "bai-mitko-talk-east-short-1.zip", source: "C:/t/test/bai-mitko-talk-east-short-1.zip", active: true },
  { key: "reject_east_1", zipName: "bai-mitko-reject-east-1.zip", source: "C:/t/test/bai-mitko-reject-east-1.zip", active: true }
];

export const IMAGE_EXTENSIONS = new Set([".png"]);

export function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

export function ensureExternalAnimationDirs() {
  for (const dir of [INPUT_DIR, UNPACKED_DIR, PREVIEWS_DIR, RUNTIME_DIR, REPORTS_DIR, CLEANED_DIR, CHROMA_REPORTS_DIR, CHROMA_PREVIEWS_DIR]) ensureDir(dir);
}

export function writeJson(path, data) {
  ensureDir(dirname(path));
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function copyKnownInputZips() {
  ensureExternalAnimationDirs();
  for (const entry of readdirSync(INPUT_DIR, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".zip")) {
      rmSync(join(INPUT_DIR, entry.name), { force: true });
    }
  }
  const result = [];
  for (const input of EXTERNAL_INPUTS) {
    const destination = join(INPUT_DIR, input.zipName);
    if (!existsSync(input.source)) {
      result.push({ key: input.key, source: input.source, destination, copied: false, missing: true });
      continue;
    }
    copyFileSync(input.source, destination);
    result.push({ key: input.key, source: input.source, destination, copied: true, bytes: readFileSync(destination).byteLength });
  }
  return result;
}

export function listFilesRecursive(root) {
  if (!existsSync(root)) return [];
  const output = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else output.push(path);
    }
  }
  walk(root);
  return output;
}

export function zipNameToAnimationKey(zipName) {
  const lower = zipName.toLowerCase();
  if (lower.includes("walk-east-start")) return "walk_east_start";
  if (lower.includes("walk-east-loop")) return "walk_east_loop";
  if (lower.includes("walk-east-stop")) return "walk_east_stop";
  if (lower.includes("walk-east")) return "walk_east";
  return basename(zipName, extname(zipName)).replace(/^bai-mitko-/, "").replaceAll("-", "_");
}

export function safeZipOutputPath(root, name) {
  const clean = normalize(name.replaceAll("\\", "/"));
  if (clean.startsWith("..") || clean.includes("../") || clean.includes("..\\")) return null;
  if (clean.endsWith("/") || clean.endsWith("\\")) return null;
  const output = join(root, clean);
  const rel = relative(root, output);
  if (rel.startsWith("..") || rel === "") return null;
  return output;
}

export function unpackZip(zipPath, outputDir) {
  const buffer = readFileSync(zipPath);
  const eocdOffset = findEndOfCentralDirectory(buffer);
  if (eocdOffset < 0) throw new Error(`Could not find ZIP end record in ${zipPath}`);
  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  const centralOffset = buffer.readUInt32LE(eocdOffset + 16);
  let offset = centralOffset;
  const entries = [];
  rmSync(outputDir, { recursive: true, force: true });
  ensureDir(outputDir);

  for (let i = 0; i < entryCount; i += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error(`Invalid ZIP central directory at ${offset}`);
    const compression = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
    offset += 46 + nameLength + extraLength + commentLength;
    if (name.endsWith("/") || name.endsWith("\\")) continue;

    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const data = buffer.subarray(dataOffset, dataOffset + compressedSize);
    let content;
    if (compression === 0) content = Buffer.from(data);
    else if (compression === 8) content = inflateRawSync(data);
    else throw new Error(`Unsupported ZIP compression ${compression} for ${name}`);
    if (content.byteLength !== uncompressedSize) {
      throw new Error(`ZIP size mismatch for ${name}: expected ${uncompressedSize}, got ${content.byteLength}`);
    }
    const output = safeZipOutputPath(outputDir, name);
    if (!output) continue;
    ensureDir(dirname(output));
    writeFileSync(output, content);
    entries.push({ name, output, compression, bytes: content.byteLength });
  }
  return entries;
}

function findEndOfCentralDirectory(buffer) {
  for (let offset = buffer.length - 22; offset >= Math.max(0, buffer.length - 66000); offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  return -1;
}

export function animationFolders() {
  if (!existsSync(UNPACKED_DIR)) return [];
  return readdirSync(UNPACKED_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({ key: entry.name, path: join(UNPACKED_DIR, entry.name) }));
}

export function findJsonFiles(folder) {
  return listFilesRecursive(folder).filter((file) => extname(file).toLowerCase() === ".json");
}

export function findPngFiles(folder) {
  return listFilesRecursive(folder).filter((file) => IMAGE_EXTENSIONS.has(extname(file).toLowerCase()));
}

export function inspectPng(path) {
  const png = readPng(path);
  const bounds = alphaBounds(png, 1);
  let alphaPixels = 0;
  let transparentPixels = 0;
  for (let index = 3; index < png.data.length; index += 4) {
    if (png.data[index] < 255) transparentPixels += 1;
    if (png.data[index] > 0) alphaPixels += 1;
  }
  return {
    path,
    width: png.width,
    height: png.height,
    hasAlpha: transparentPixels > 0,
    visiblePixels: alphaPixels,
    contentBounds: bounds
  };
}

export function inspectAnimationFolder(folderInfo) {
  const jsonFiles = findJsonFiles(folderInfo.path);
  const imageFiles = findPngFiles(folderInfo.path);
  const metadataCandidates = jsonFiles.map((file) => {
    try {
      const data = readJson(file);
      const parsed = parseFrameMetadata(data, imageFiles);
      return { file, usable: parsed.frames.length > 0, parsed, error: null };
    } catch (error) {
      return { file, usable: false, parsed: null, error: error.message };
    }
  });
  const metadata = metadataCandidates.find((candidate) => candidate.usable) || metadataCandidates[0] || null;
  const images = imageFiles.map((file) => inspectPng(file));
  const image = chooseSheetImage(images, metadata?.parsed);
  const parsed = metadata?.parsed || gridFallbackMetadata(image);
  return {
    key: folderInfo.key,
    folder: folderInfo.path,
    jsonFiles,
    imageFiles,
    metadataFile: metadata?.file || null,
    metadataUsable: Boolean(metadata?.usable),
    metadataError: metadata?.error || null,
    frames: parsed.frames,
    frameCount: parsed.frames.length,
    fps: parsed.fps || 8,
    frameWidth: parsed.frameWidth || parsed.frames[0]?.w || image?.width || 0,
    frameHeight: parsed.frameHeight || parsed.frames[0]?.h || image?.height || 0,
    sheetImage: image?.path || null,
    sheetWidth: image?.width || 0,
    sheetHeight: image?.height || 0,
    alpha: image?.hasAlpha || false,
    contentBounds: image?.contentBounds || null,
    parseMode: parsed.mode || "unknown"
  };
}

export function parseFrameMetadata(data, imageFiles = []) {
  const frames = [];
  let fps = data.fps || data.frameRate || data.frame_rate || data.meta?.frameRate || data.meta?.fps || null;
  if (data.frames && Array.isArray(data.frames)) {
    for (const [index, frame] of data.frames.entries()) {
      const rect = normalizeFrameRect(frame.frame || frame.rect || frame.source || frame);
      if (rect) frames.push({ index, name: frame.filename || frame.name || `frame_${index}`, ...rect, duration: frame.duration || frame.time || null });
    }
  } else if (data.frames && typeof data.frames === "object") {
    for (const [index, [name, frame]] of Object.entries(data.frames).entries()) {
      const rect = normalizeFrameRect(frame.frame || frame.rect || frame);
      if (rect) frames.push({ index, name, ...rect, duration: frame.duration || frame.time || null });
    }
  } else if (Array.isArray(data.sprites)) {
    for (const [index, frame] of data.sprites.entries()) {
      const rect = normalizeFrameRect(frame.frame || frame.rect || frame);
      if (rect) frames.push({ index, name: frame.name || `frame_${index}`, ...rect, duration: frame.duration || null });
    }
  }
  if (!fps) {
    const durations = frames.map((frame) => Number(frame.duration)).filter((duration) => Number.isFinite(duration) && duration > 0);
    if (durations.length) {
      const averageMs = durations.reduce((sum, value) => sum + value, 0) / durations.length;
      fps = Math.max(1, Math.round(1000 / averageMs));
    }
  }
  const frameWidth = frames[0]?.w || data.frameWidth || data.width || data.meta?.frameWidth || null;
  const frameHeight = frames[0]?.h || data.frameHeight || data.height || data.meta?.frameHeight || null;
  return { frames, fps, frameWidth, frameHeight, mode: frames.length ? "metadata" : "none", imageFiles };
}

function normalizeFrameRect(rect) {
  if (!rect || typeof rect !== "object") return null;
  const x = Number(rect.x ?? rect.left ?? rect.X ?? 0);
  const y = Number(rect.y ?? rect.top ?? rect.Y ?? 0);
  const w = Number(rect.w ?? rect.width ?? rect.W);
  const h = Number(rect.h ?? rect.height ?? rect.H);
  if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) return null;
  return { x, y, w, h };
}

export function chooseSheetImage(images, parsed) {
  if (!images.length) return null;
  if (parsed?.frames?.length) {
    const maxX = Math.max(...parsed.frames.map((frame) => frame.x + frame.w));
    const maxY = Math.max(...parsed.frames.map((frame) => frame.y + frame.h));
    return images.find((image) => image.width >= maxX && image.height >= maxY) || images[0];
  }
  return images.sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];
}

function gridFallbackMetadata(image) {
  if (!image) return { frames: [], fps: 8, frameWidth: 0, frameHeight: 0, mode: "missing" };
  const likelyCounts = [8, 10, 12, 16, 24, 32];
  const count = likelyCounts.find((value) => image.width % value === 0 && image.width / value <= image.height * 1.4) || 1;
  const frameWidth = Math.floor(image.width / count);
  const frames = Array.from({ length: count }, (_, index) => ({ index, name: `frame_${index}`, x: index * frameWidth, y: 0, w: frameWidth, h: image.height }));
  return { frames, fps: 8, frameWidth, frameHeight: image.height, mode: "grid_fallback" };
}

export function cropFrame(sheet, rect) {
  const frame = makePng(rect.w, rect.h);
  for (let y = 0; y < rect.h; y += 1) {
    for (let x = 0; x < rect.w; x += 1) {
      const sx = rect.x + x;
      const sy = rect.y + y;
      if (sx < 0 || sy < 0 || sx >= sheet.width || sy >= sheet.height) continue;
      const source = pixelIndex(sheet, sx, sy);
      const target = pixelIndex(frame, x, y);
      frame.data[target] = sheet.data[source];
      frame.data[target + 1] = sheet.data[source + 1];
      frame.data[target + 2] = sheet.data[source + 2];
      frame.data[target + 3] = sheet.data[source + 3];
    }
  }
  return frame;
}

export function chromaKeyGreenToAlpha(source, options = {}) {
  const {
    low = 18,
    high = 95,
    minGreen = 40,
    spillStrength = 0.82
  } = options;
  const output = makePng(source.width, source.height);
  const stats = {
    pixels: source.width * source.height,
    transparentInputPixels: 0,
    fullKeyPixels: 0,
    softKeyPixels: 0,
    spillSuppressedPixels: 0
  };

  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const index = pixelIndex(source, x, y);
      const r = source.data[index];
      const g = source.data[index + 1];
      const b = source.data[index + 2];
      const a = source.data[index + 3];
      if (a === 0) stats.transparentInputPixels += 1;

      const greenDominance = Math.max(0, g - Math.max(r, b));
      const greenPresence = Math.max(0, g - minGreen);
      const greenAmount = Math.min(greenDominance, greenPresence);
      const keyAmount = smoothstep(low, high, greenAmount);
      const alpha = Math.round(a * (1 - keyAmount));

      let outR = r;
      let outG = g;
      let outB = b;
      if (keyAmount > 0 && alpha > 0) {
        const neutralGreen = Math.max(r, b);
        outG = Math.round(g + (neutralGreen - g) * keyAmount * spillStrength);
        stats.spillSuppressedPixels += 1;
      }
      if (keyAmount >= 0.98 && a > 0) stats.fullKeyPixels += 1;
      else if (keyAmount > 0 && a > 0) stats.softKeyPixels += 1;

      output.data[index] = outR;
      output.data[index + 1] = outG;
      output.data[index + 2] = outB;
      output.data[index + 3] = alpha;
    }
  }

  stats.visibleOutputBounds = alphaBounds(output, 1);
  return { png: output, stats };
}

export function robustChromaKeyGreenToAlpha(source, options = {}) {
  const settings = {
    key: options.key || "auto",
    low: Number(options.low ?? 12),
    high: Number(options.high ?? 55),
    matteFilter: options.matteFilter || "median3",
    erode: Number(options.erode ?? 1),
    feather: Number(options.feather ?? 1),
    despill: Number(options.despill ?? 0.75),
    spillBias: Number(options.spillBias ?? 8),
    connectedBackground: options.connectedBackground !== false,
    minGreen: Number(options.minGreen ?? 36)
  };
  const keyColor = settings.key === "auto" ? estimateKeyColor(source) : parseKeyColor(settings.key);
  const width = source.width;
  const height = source.height;
  const pixels = width * height;
  const originalAlpha = new Float32Array(pixels);
  const keyAmount = new Float32Array(pixels);
  let transparentInputPixels = 0;
  let alphaPresent = false;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = y * width + x;
      const index = pixelIndex(source, x, y);
      const alpha = source.data[index + 3] / 255;
      originalAlpha[offset] = alpha;
      if (alpha < 1) alphaPresent = true;
      if (alpha <= 0.01) transparentInputPixels += 1;
      keyAmount[offset] = greenKeyAmount(source.data[index], source.data[index + 1], source.data[index + 2], keyColor, settings);
    }
  }

  const connected = settings.connectedBackground ? connectedBackgroundMask(source, keyAmount) : null;
  const backgroundInfluence = connected ? dilateMask(connected, width, height, 3) : null;
  let matte = new Float32Array(pixels);
  for (let offset = 0; offset < pixels; offset += 1) {
    const edgeConstraint = backgroundInfluence ? backgroundInfluence[offset] : 1;
    const key = keyAmount[offset] * edgeConstraint;
    matte[offset] = clamp01(originalAlpha[offset] * (1 - key));
  }
  matte = filterMatte(matte, width, height, settings.matteFilter);
  for (let i = 0; i < settings.erode; i += 1) matte = erodeMatte(matte, width, height);
  for (let i = 0; i < settings.feather; i += 1) matte = gaussianBlurMatte(matte, width, height);

  const output = makePng(width, height);
  let madeTransparentPixels = 0;
  let softAlphaPixels = 0;
  let despilledPixels = 0;
  let possibleForegroundDamagePixels = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = y * width + x;
      const index = pixelIndex(source, x, y);
      const r = source.data[index];
      const g = source.data[index + 1];
      const b = source.data[index + 2];
      const alpha = Math.round(clamp01(matte[offset]) * 255);
      const edge = alpha > 0 && alpha < 255;
      const nearBackground = backgroundInfluence ? backgroundInfluence[offset] > 0 : keyAmount[offset] > 0.02;
      let outG = g;
      if ((edge || nearBackground || originalAlpha[offset] < 1) && settings.despill > 0) {
        const spill = Math.max(0, g - Math.max(r, b) - settings.spillBias);
        if (spill > 0) {
          outG = Math.max(0, Math.round(g - spill * settings.despill));
          despilledPixels += 1;
        }
      }
      if (alpha === 0 && originalAlpha[offset] > 0.01) madeTransparentPixels += 1;
      if (alpha > 0 && alpha < 255) softAlphaPixels += 1;
      if (!nearBackground && keyAmount[offset] > 0.7 && alpha < 200) possibleForegroundDamagePixels += 1;
      output.data[index] = r;
      output.data[index + 1] = outG;
      output.data[index + 2] = b;
      output.data[index + 3] = alpha;
    }
  }

  return {
    png: output,
    stats: {
      pixels,
      alphaPresent,
      transparentInputPixels,
      keyColor,
      backgroundDetected: Boolean(connected),
      connectedBackgroundUsed: Boolean(connected),
      thresholds: { low: settings.low, high: settings.high },
      matteFilter: settings.matteFilter,
      erode: settings.erode,
      feather: settings.feather,
      despill: settings.despill,
      spillBias: settings.spillBias,
      madeTransparentPixels,
      softAlphaPixels,
      despilledPixels,
      possibleForegroundDamagePixels,
      visibleOutputBounds: alphaBounds(output, 1)
    }
  };
}

function smoothstep(edge0, edge1, value) {
  if (edge0 === edge1) return value >= edge1 ? 1 : 0;
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function parseKeyColor(value) {
  if (Array.isArray(value)) return { r: value[0], g: value[1], b: value[2] };
  const match = String(value).trim().match(/^#?([0-9a-f]{6})$/i);
  if (!match) return { r: 0, g: 255, b: 0 };
  const int = Number.parseInt(match[1], 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function estimateKeyColor(source) {
  const samples = [];
  const add = (x, y) => {
    const index = pixelIndex(source, x, y);
    const r = source.data[index];
    const g = source.data[index + 1];
    const b = source.data[index + 2];
    const a = source.data[index + 3];
    const greenExcess = g - Math.max(r, b);
    if (a > 0 && (greenExcess > 18 || g > 170)) samples.push([r, g, b]);
  };
  for (let x = 0; x < source.width; x += Math.max(1, Math.floor(source.width / 64))) {
    add(x, 0);
    add(x, source.height - 1);
  }
  for (let y = 0; y < source.height; y += Math.max(1, Math.floor(source.height / 64))) {
    add(0, y);
    add(source.width - 1, y);
  }
  if (!samples.length) return { r: 0, g: 255, b: 0 };
  samples.sort((a, b) => (b[1] - Math.max(b[0], b[2])) - (a[1] - Math.max(a[0], a[2])));
  const chosen = samples.slice(0, Math.max(1, Math.ceil(samples.length * 0.25)));
  return {
    r: Math.round(chosen.reduce((sum, value) => sum + value[0], 0) / chosen.length),
    g: Math.round(chosen.reduce((sum, value) => sum + value[1], 0) / chosen.length),
    b: Math.round(chosen.reduce((sum, value) => sum + value[2], 0) / chosen.length)
  };
}

function greenKeyAmount(r, g, b, keyColor, settings) {
  const greenExcess = g - Math.max(r, b);
  const greenDominance = g / (r + g + b + 1);
  const keyDistance = Math.hypot(r - keyColor.r, g - keyColor.g, b - keyColor.b);
  const distanceSignal = Math.max(0, settings.high - keyDistance * 0.35);
  const dominanceSignal = Math.max(0, (greenDominance - 0.36) * 180);
  const signal = Math.max(greenExcess, dominanceSignal, distanceSignal);
  if (g < settings.minGreen) return 0;
  return smoothstep(settings.low, settings.high, signal);
}

function connectedBackgroundMask(source, keyAmount) {
  const width = source.width;
  const height = source.height;
  const mask = new Uint8Array(width * height);
  const queue = [];
  const enqueue = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const offset = y * width + x;
    if (mask[offset]) return;
    const alpha = source.data[pixelIndex(source, x, y) + 3] / 255;
    if (alpha <= 0.02 || keyAmount[offset] >= 0.52) {
      mask[offset] = 1;
      queue.push(offset);
    }
  };
  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }
  for (let index = 0; index < queue.length; index += 1) {
    const offset = queue[index];
    const x = offset % width;
    const y = Math.floor(offset / width);
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }
  return mask;
}

function dilateMask(mask, width, height, radius) {
  const output = new Float32Array(mask.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let best = mask[y * width + x] ? 1 : 0;
      if (!best) {
        for (let dy = -radius; dy <= radius; dy += 1) {
          for (let dx = -radius; dx <= radius; dx += 1) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            if (mask[ny * width + nx]) {
              const distance = Math.max(1, Math.hypot(dx, dy));
              best = Math.max(best, Math.max(0, 1 - distance / (radius + 1)));
            }
          }
        }
      }
      output[y * width + x] = best;
    }
  }
  return output;
}

function filterMatte(matte, width, height, mode) {
  if (!mode || mode === "none") return matte;
  if (mode === "gaussian3") return gaussianBlurMatte(matte, width, height, 1);
  if (mode === "gaussian5") return gaussianBlurMatte(gaussianBlurMatte(matte, width, height, 1), width, height, 1);
  if (mode === "median5") return medianMatte(matte, width, height, 2);
  return medianMatte(matte, width, height, 1);
}

function medianMatte(matte, width, height, radius) {
  const output = new Float32Array(matte.length);
  const values = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      values.length = 0;
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const nx = Math.max(0, Math.min(width - 1, x + dx));
          const ny = Math.max(0, Math.min(height - 1, y + dy));
          values.push(matte[ny * width + nx]);
        }
      }
      values.sort((a, b) => a - b);
      output[y * width + x] = values[Math.floor(values.length / 2)];
    }
  }
  return output;
}

function gaussianBlurMatte(matte, width, height) {
  const output = new Float32Array(matte.length);
  const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      let weight = 0;
      let k = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = Math.max(0, Math.min(width - 1, x + dx));
          const ny = Math.max(0, Math.min(height - 1, y + dy));
          sum += matte[ny * width + nx] * kernel[k];
          weight += kernel[k];
          k += 1;
        }
      }
      output[y * width + x] = sum / weight;
    }
  }
  return output;
}

function erodeMatte(matte, width, height) {
  const output = new Float32Array(matte.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let min = 1;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = Math.max(0, Math.min(width - 1, x + dx));
          const ny = Math.max(0, Math.min(height - 1, y + dy));
          min = Math.min(min, matte[ny * width + nx]);
        }
      }
      output[y * width + x] = min;
    }
  }
  return output;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

export function unionNonNullBounds(bounds) {
  const valid = bounds.filter(Boolean);
  if (!valid.length) return null;
  const minX = Math.min(...valid.map((b) => b.x));
  const minY = Math.min(...valid.map((b) => b.y));
  const maxX = Math.max(...valid.map((b) => b.x + b.w));
  const maxY = Math.max(...valid.map((b) => b.y + b.h));
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function makeContactSheet(frameFiles, outputPath, title) {
  const frames = frameFiles.map(readPng);
  const cellW = 180;
  const cellH = 220;
  const cols = Math.min(6, frames.length || 1);
  const rows = Math.ceil(frames.length / cols);
  const sheet = makePng(cols * cellW + 32, rows * cellH + 72, [236, 236, 236, 255]);
  drawChecker(sheet, 16);
  drawLabel(sheet, title, 18, 18, [30, 30, 30, 255]);
  frames.forEach((frame, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = 16 + col * cellW;
    const y = 52 + row * cellH;
    fillRect(sheet, x, y, cellW - 10, cellH - 28, [255, 255, 255, 210]);
    const bounds = alphaBounds(frame, 1) || { x: 0, y: 0, w: frame.width, h: frame.height };
    const scale = Math.min((cellW - 24) / bounds.w, (cellH - 52) / bounds.h);
    const w = Math.max(1, Math.round(bounds.w * scale));
    const h = Math.max(1, Math.round(bounds.h * scale));
    blit(sheet, frame, bounds, { x: x + Math.round((cellW - 10 - w) / 2), y: y + cellH - 34 - h, w, h });
    drawLabel(sheet, String(index).padStart(2, "0"), x + 6, y + cellH - 20, [30, 30, 30, 255]);
  });
  writePng(outputPath, sheet);
}

export function makeGif(frameFiles, outputPath, fps = 8) {
  const frames = frameFiles.map(readPng);
  const width = frames[0].width;
  const height = frames[0].height;
  const encoder = GIFEncoder();
  const delay = Math.round(1000 / fps);
  for (const frame of frames) {
    const rgba = new Uint8Array(width * height * 4);
    const preview = makePng(width, height, [0, 0, 0, 0]);
    drawChecker(preview, 16);
    blit(preview, frame, { x: 0, y: 0, w: width, h: height }, { x: 0, y: 0, w: width, h: height });
    rgba.set(preview.data);
    const palette = quantize(rgba, 256);
    const indexed = applyPalette(rgba, palette);
    encoder.writeFrame(indexed, width, height, { palette, delay });
  }
  encoder.finish();
  ensureDir(dirname(outputPath));
  writeFileSync(outputPath, Buffer.from(encoder.bytes()));
}

export function selectedFrameRects(frames, start = 0, count = "all") {
  return frames.slice(start, count === "all" ? undefined : start + count).map((frame, index) => ({ ...frame, index }));
}

export function resolveConfiguredFps(config, metadata) {
  if (config?.fps === "metadata") return metadata?.fps || 8;
  return Number(config?.fps) || metadata?.fps || 8;
}

export const EXTERNAL_WALK_DEFAULT_FPS = 20;
export const EXTERNAL_IDLE_DEFAULT_FPS = 14;
export const EXTERNAL_WALK_STATIC_MOTION_MULTIPLIER = 1.25;
export const EXTERNAL_WALK_FRAME_MOTION_WEIGHT = 0.49;
export const EXTERNAL_WALK_LOOP_MOTION_MIN = 1;
export const EXTERNAL_WALK_LOOP_MOTION_MAX = 1.2;
export const EXTERNAL_WALK_START_SLOW_MULTIPLIER = 0.5;
export const EXTERNAL_WALK_START_ACCELERATION_POINT = 0.6;
export const EXTERNAL_WALK_START_HOLD_FRAMES = 3;

export function walkMotionCurve(frameCount) {
  const cycle = [0.55, 0.68, 0.82, 1.08, 1.32, 1.48, 1.26, 1.0, 0.72];
  const raw = Array.from({ length: frameCount }, (_, index) => cycle[index % cycle.length]);
  const average = raw.reduce((sum, value) => sum + value, 0) / Math.max(1, raw.length);
  return raw.map((value) => Number((value / average).toFixed(3)));
}

export function externalWalkMotionCurve(role, frameCount, sourceStartFrame = 0) {
  if (role === "start") return externalWalkStartMotionCurve(frameCount, sourceStartFrame);
  if (role === "loop" || role === "short") return externalWalkLoopMotionCurve(frameCount, sourceStartFrame);
  return externalWalkRawMotionCurve(role, frameCount, sourceStartFrame).map((value) =>
    Number((EXTERNAL_WALK_STATIC_MOTION_MULTIPLIER + (value - 1) * EXTERNAL_WALK_FRAME_MOTION_WEIGHT).toFixed(3))
  );
}

export function externalWalkStartMotionCurve(frameCount, sourceStartFrame = 0) {
  const raw = externalWalkRawMotionCurve("start", frameCount, sourceStartFrame);
  const weighted = raw.map((value) => EXTERNAL_WALK_STATIC_MOTION_MULTIPLIER + (value - 1) * EXTERNAL_WALK_FRAME_MOTION_WEIGHT);
  const holdFrames = Math.min(EXTERNAL_WALK_START_HOLD_FRAMES, Math.max(0, frameCount - 1));
  const activeFrameCount = Math.max(1, frameCount - holdFrames);
  return weighted.map((value, index) => {
    if (index < holdFrames) return 0;
    const activeIndex = index - holdFrames;
    const t = activeFrameCount <= 1 ? 1 : activeIndex / (activeFrameCount - 1);
    const slowValue = value * EXTERNAL_WALK_START_SLOW_MULTIPLIER;
    if (t < EXTERNAL_WALK_START_ACCELERATION_POINT) return Number(slowValue.toFixed(3));
    const ramp = easeInCubic((t - EXTERNAL_WALK_START_ACCELERATION_POINT) / (1 - EXTERNAL_WALK_START_ACCELERATION_POINT));
    return Number((slowValue + (EXTERNAL_WALK_LOOP_MOTION_MAX - slowValue) * ramp).toFixed(3));
  });
}

export function externalWalkLoopMotionCurve(frameCount, sourceStartFrame = 0) {
  const raw = externalWalkRawMotionCurve("loop", frameCount, sourceStartFrame);
  const min = Math.min(...raw);
  const max = Math.max(...raw);
  const range = Math.max(0.001, max - min);
  return raw.map((value) => {
    const normalized = (value - min) / range;
    return Number((EXTERNAL_WALK_LOOP_MOTION_MIN + normalized * (EXTERNAL_WALK_LOOP_MOTION_MAX - EXTERNAL_WALK_LOOP_MOTION_MIN)).toFixed(3));
  });
}

export function externalWalkRawMotionCurve(role, frameCount, sourceStartFrame = 0) {
  if (role === "start") {
    return Array.from({ length: frameCount }, (_, index) => {
      const t = frameCount <= 1 ? 1 : index / (frameCount - 1);
      const value = t < 0.6 ? 0.16 * Math.pow(t / 0.6, 2.2) : 0.16 + 0.84 * easeOutCubic((t - 0.6) / 0.4);
      return Number(value.toFixed(3));
    });
  }
  if (role === "stop") {
    const decel = [0.34, 0.28, 0.21, 0.14, 0.085, 0.045, 0.02, 0.005, 0];
    return Array.from({ length: frameCount }, (_, index) => Number((decel[Math.min(index, decel.length - 1)]).toFixed(3)));
  }
  const pushCycle16 = [0.851, 1.536, 1.738, 1.555, 1.344, 0.796, 0.494, 0.631, 0.878, 1.564, 1.756, 1.532, 1.316, 0.768, 0.494, 0.631];
  return Array.from({ length: frameCount }, (_, index) => Number((pushCycle16[(sourceStartFrame + index) % pushCycle16.length]).toFixed(3)));
}

function easeOutCubic(value) {
  const t = Math.max(0, Math.min(1, value));
  return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(value) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * t;
}

export { alphaBounds, blit, makePng, readPng, writePng };
