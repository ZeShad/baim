import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import {
  PREVIEWS_DIR,
  REPORTS_DIR,
  SELECTION_PATH,
  CLEANED_DIR,
  animationFolders,
  blit,
  cropFrame,
  ensureExternalAnimationDirs,
  inspectAnimationFolder,
  makeContactSheet,
  makeGif,
  makePng,
  readJson,
  readPng,
  robustChromaKeyGreenToAlpha,
  writeJson,
  writePng
} from "./external-animation-utils.mjs";

ensureExternalAnimationDirs();

const selection = readJson(SELECTION_PATH);
const folders = new Map(animationFolders().map((folder) => [folder.key, folder]));
const report = [];
const previewFramesByKey = new Map();

for (const [key, config] of Object.entries(selection.animations || {})) {
  if (!config.use) continue;
  const folder = folders.get(key);
  if (!folder) {
    report.push({ key, generated: false, reason: "missing unpacked folder" });
    continue;
  }
  const info = inspectAnimationFolder(folder);
  if (!info.sheetImage || !info.frames.length || !info.metadataUsable) {
    report.push({ key, generated: false, reason: "missing usable Ludo JSON metadata or sheet" });
    continue;
  }

  const cleanedSheet = join(CLEANED_DIR, `${key}.png`);
  const usingCleanedSheet = existsSync(cleanedSheet);
  const keyed = usingCleanedSheet
    ? { png: readPng(cleanedSheet), stats: { precleanedSheet: true, cleanedSheet } }
    : robustChromaKeyGreenToAlpha(readPng(info.sheetImage), config.chromaKey || {});
  const tempDir = join(PREVIEWS_DIR, ".tmp_frames", key);
  rmSync(tempDir, { recursive: true, force: true });
  const frameStart = Math.max(0, Number(config.frameStart || 0));
  const frameEndTrim = Math.max(0, Number(config.frameEndTrim || 0));
  const explicitFrameCount = Number.isFinite(Number(config.frameCount)) ? Math.max(1, Number(config.frameCount)) : null;
  const selectedFrames = explicitFrameCount
    ? info.frames.slice(frameStart, frameStart + explicitFrameCount)
    : info.frames.slice(frameStart, frameEndTrim ? -frameEndTrim : undefined);
  const frameFiles = selectedFrames.map((frame, index) => {
    const output = join(tempDir, `frame_${String(index).padStart(3, "0")}.png`);
    writePng(output, cropFrame(keyed.png, frame));
    return output;
  });
  previewFramesByKey.set(key, frameFiles);

  const gif = join(PREVIEWS_DIR, `${key}.gif`);
  const contactSheet = join(PREVIEWS_DIR, `${key}_contact_sheet.png`);
  makeGif(frameFiles, gif, config.fps || info.fps || 8);
  makeContactSheet(frameFiles, contactSheet, `${key} ${frameFiles.length} frames`);
  report.push({
    key,
    generated: true,
    role: roleFromKey(key),
    metadataMode: info.parseMode,
    frameCount: frameFiles.length,
    sourceFrameCount: info.frames.length,
    frameStart,
    frameEndTrim,
    configuredFrameCount: explicitFrameCount,
    fps: config.fps || info.fps || 8,
    frameWidth: info.frameWidth,
    frameHeight: info.frameHeight,
    sourceSheet: info.sheetImage,
    cleanedSheet: usingCleanedSheet ? cleanedSheet : null,
    usesCleanedDerivedSheet: usingCleanedSheet,
    gif,
    contactSheet
  });
}

const eastSequence = buildFullSequence("east", false);
if (eastSequence.length) {
  const tempDir = join(PREVIEWS_DIR, ".sequence", "walk_east_full_sequence");
  const files = writeSequenceFrames(eastSequence, tempDir);
  const gif = join(PREVIEWS_DIR, "walk_east_full_sequence.gif");
  const contactSheet = join(PREVIEWS_DIR, "walk_east_full_sequence_contact_sheet.png");
  makeGif(files, gif, selection.animations.walk_east_loop?.fps || 8);
  makeContactSheet(files, contactSheet, `walk_east_full_sequence ${files.length} frames`);
  report.push({ key: "walk_east_full_sequence", generated: true, frameCount: files.length, gif, contactSheet });
}

const westSequence = buildFullSequence("west", true);
if (westSequence.length) {
  const tempDir = join(PREVIEWS_DIR, ".sequence", "walk_west_FULL_MIRRORED_FROM_EAST");
  const files = writeSequenceFrames(westSequence, tempDir);
  const gif = join(PREVIEWS_DIR, "walk_west_FULL_MIRRORED_FROM_EAST.gif");
  makeGif(files, gif, selection.animations.walk_east_loop?.fps || 8);
  report.push({ key: "walk_west_FULL_MIRRORED_FROM_EAST", generated: true, mirroredFromEast: true, frameCount: files.length, gif });
}

rmSync(join(PREVIEWS_DIR, ".tmp_frames"), { recursive: true, force: true });
rmSync(join(PREVIEWS_DIR, ".sequence"), { recursive: true, force: true });
writeJson(join(REPORTS_DIR, "preview-report.json"), report);
console.log(JSON.stringify(report, null, 2));

function roleFromKey(key) {
  if (key.endsWith("_start")) return "start";
  if (key.endsWith("_loop")) return "loop";
  if (key.endsWith("_stop")) return "stop";
  return "unknown";
}

function buildFullSequence(direction, mirrored) {
  const idle = `assets/chapter1/characters/bai_mitko/idle_${direction}.png`;
  const start = previewFramesByKey.get("walk_east_start") || [];
  const loop = previewFramesByKey.get("walk_east_loop") || [];
  const stop = previewFramesByKey.get("walk_east_stop") || [];
  if (!start.length && !loop.length && !stop.length) return [];
  const frames = [];
  if (existsSync(idle)) frames.push({ file: idle, mirrored });
  frames.push(...start.map((file) => ({ file, mirrored })));
  for (let repeat = 0; repeat < 3; repeat += 1) frames.push(...loop.map((file) => ({ file, mirrored })));
  frames.push(...stop.map((file) => ({ file, mirrored })));
  if (existsSync(idle)) frames.push({ file: idle, mirrored });
  return frames;
}

function writeSequenceFrames(sequence, outputDir) {
  rmSync(outputDir, { recursive: true, force: true });
  const loaded = sequence.map(({ file, mirrored }) => ({ png: readPng(file), mirrored }));
  const width = Math.max(...loaded.map(({ png }) => png.width));
  const height = Math.max(...loaded.map(({ png }) => png.height));
  const output = [];
  loaded.forEach(({ png, mirrored }, index) => {
    const frame = makePng(width, height);
    const source = mirrored ? mirrorPng(png) : png;
    const x = Math.round((width - source.width) / 2);
    const y = height - source.height;
    blit(frame, source, { x: 0, y: 0, w: source.width, h: source.height }, { x, y, w: source.width, h: source.height });
    const file = join(outputDir, `frame_${String(index).padStart(3, "0")}.png`);
    writePng(file, frame);
    output.push(file);
  });
  return output;
}

function mirrorPng(png) {
  const output = makePng(png.width, png.height);
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const source = (y * png.width + x) * 4;
      const target = (y * png.width + (png.width - 1 - x)) * 4;
      output.data[target] = png.data[source];
      output.data[target + 1] = png.data[source + 1];
      output.data[target + 2] = png.data[source + 2];
      output.data[target + 3] = png.data[source + 3];
    }
  }
  return output;
}
