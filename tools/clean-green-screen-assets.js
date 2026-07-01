import { rmSync } from "node:fs";
import { join } from "node:path";
import {
  CHROMA_PREVIEWS_DIR,
  CLEANED_DIR,
  REPORTS_DIR,
  TARGET_ROOT,
  animationFolders,
  alphaBounds,
  blit,
  cropFrame,
  ensureDir,
  ensureExternalAnimationDirs,
  inspectAnimationFolder,
  makePng,
  readPng,
  robustChromaKeyGreenToAlpha,
  writeJson,
  writePng
} from "./external-animation-utils.mjs";
import { drawChecker, drawLabel, fillRect } from "./character-frame-utils.mjs";

const CLEANED_FRAMES_DIR = join(TARGET_ROOT, "cleaned_frames");

const options = parseArgs(process.argv.slice(2));
ensureExternalAnimationDirs();
ensureDir(CLEANED_DIR);
ensureDir(CLEANED_FRAMES_DIR);
ensureDir(CHROMA_PREVIEWS_DIR);

const report = [];
for (const folder of animationFolders()) {
  const info = inspectAnimationFolder(folder);
  if (!info.sheetImage || !info.frames.length || !info.metadataUsable) {
    report.push({ key: folder.key, cleaned: false, reason: "missing usable metadata or sheet" });
    continue;
  }
  const source = readPng(info.sheetImage);
  const cleaned = robustChromaKeyGreenToAlpha(source, options);
  const cleanedSheetPath = join(CLEANED_DIR, `${folder.key}.png`);
  writePng(cleanedSheetPath, cleaned.png);

  const frameDir = join(CLEANED_FRAMES_DIR, folder.key);
  rmSync(frameDir, { recursive: true, force: true });
  ensureDir(frameDir);
  const frameFiles = info.frames.map((frame, index) => {
    const output = join(frameDir, `frame_${String(index).padStart(3, "0")}.png`);
    writePng(output, cropFrame(cleaned.png, frame));
    return output;
  });

  const beforeAfter = join(CHROMA_PREVIEWS_DIR, `${folder.key}_before_after_contact_sheet.png`);
  makeBeforeAfterContactSheet(source, cleaned.png, info.frames, beforeAfter, folder.key);
  const edgeZooms = makeEdgeZooms(source, cleaned.png, info.frames, folder.key);

  report.push({
    key: folder.key,
    cleaned: true,
    input: info.sheetImage,
    output: cleanedSheetPath,
    cleanedFrames: frameDir,
    frameCount: info.frameCount,
    frameWidth: info.frameWidth,
    frameHeight: info.frameHeight,
    metadataFile: info.metadataFile,
    alphaPresent: cleaned.stats.alphaPresent,
    detectedKeyColor: cleaned.stats.keyColor,
    backgroundDetected: cleaned.stats.backgroundDetected,
    connectedBackgroundUsed: cleaned.stats.connectedBackgroundUsed,
    thresholds: cleaned.stats.thresholds,
    matteFilter: cleaned.stats.matteFilter,
    erode: cleaned.stats.erode,
    feather: cleaned.stats.feather,
    despill: cleaned.stats.despill,
    spillBias: cleaned.stats.spillBias,
    pixelsMadeTransparent: cleaned.stats.madeTransparentPixels,
    pixelsWithSoftAlpha: cleaned.stats.softAlphaPixels,
    pixelsDespilled: cleaned.stats.despilledPixels,
    warnings: cleaned.stats.possibleForegroundDamagePixels > 0
      ? [`${cleaned.stats.possibleForegroundDamagePixels} interior green-ish pixels may have been affected`]
      : [],
    beforeAfter,
    edgeZooms
  });
}

writeJson(join(REPORTS_DIR, "chroma-cleanup-report.json"), report);
console.log(JSON.stringify(report, null, 2));

function parseArgs(args) {
  const output = {
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
  for (const arg of args) {
    if (!arg.startsWith("--")) continue;
    const [rawName, rawValue = "true"] = arg.slice(2).split("=");
    const name = rawName.trim();
    const value = rawValue.trim();
    if (name === "key" || name === "matteFilter") output[name] = value;
    else if (name === "connectedBackground") output[name] = value !== "false";
    else if (["low", "high", "erode", "feather", "despill", "spillBias"].includes(name)) output[name] = Number(value);
  }
  return output;
}

function makeBeforeAfterContactSheet(before, after, frames, outputPath, title) {
  const cols = Math.min(6, frames.length);
  const cellW = 170;
  const cellH = 230;
  const sheet = makePng(cols * cellW + 32, 2 * cellH + 76, [235, 235, 235, 255]);
  drawChecker(sheet, 16);
  drawLabel(sheet, `${title} BEFORE AFTER`, 18, 18, [30, 30, 30, 255]);
  drawLabel(sheet, "BEFORE", 18, 42, [120, 40, 40, 255]);
  drawLabel(sheet, "AFTER", 18, 42 + cellH, [40, 90, 45, 255]);
  frames.slice(0, cols).forEach((frame, index) => {
    drawPreviewCell(sheet, before, frame, 16 + index * cellW, 58, cellW - 10, cellH - 26);
    drawPreviewCell(sheet, after, frame, 16 + index * cellW, 58 + cellH, cellW - 10, cellH - 26);
    drawLabel(sheet, String(index).padStart(2, "0"), 22 + index * cellW, 58 + cellH - 16, [30, 30, 30, 255]);
    drawLabel(sheet, String(index).padStart(2, "0"), 22 + index * cellW, 58 + cellH * 2 - 16, [30, 30, 30, 255]);
  });
  writePng(outputPath, sheet);
}

function drawPreviewCell(sheet, source, rect, x, y, w, h) {
  fillRect(sheet, x, y, w, h, [255, 255, 255, 215]);
  const frame = cropFrame(source, rect);
  const bounds = alphaBounds(frame, 1) || { x: 0, y: 0, w: frame.width, h: frame.height };
  const scale = Math.min((w - 12) / bounds.w, (h - 12) / bounds.h);
  const dw = Math.max(1, Math.round(bounds.w * scale));
  const dh = Math.max(1, Math.round(bounds.h * scale));
  blit(sheet, frame, bounds, { x: x + Math.round((w - dw) / 2), y: y + h - 8 - dh, w: dw, h: dh });
}

function makeEdgeZooms(before, after, frames, key) {
  const output = [];
  const candidates = frames.slice(0, Math.min(4, frames.length));
  const labels = [
    { name: "hair_edge", yRatio: 0.12 },
    { name: "shoulder_edge", yRatio: 0.38 },
    { name: "shoe_edge", yRatio: 0.86 }
  ];
  for (const label of labels) {
    const file = join(CHROMA_PREVIEWS_DIR, `${key}_${label.name}_zoom.png`);
    const preview = makePng(640, 260, [235, 235, 235, 255]);
    drawChecker(preview, 16);
    drawLabel(preview, `${key} ${label.name}`, 16, 16, [30, 30, 30, 255]);
    candidates.forEach((frame, index) => {
      const beforeFrame = cropFrame(before, frame);
      const afterFrame = cropFrame(after, frame);
      const bounds = alphaBounds(afterFrame, 1) || alphaBounds(beforeFrame, 1) || { x: 0, y: 0, w: beforeFrame.width, h: beforeFrame.height };
      const crop = zoomRect(bounds, beforeFrame.width, beforeFrame.height, label.yRatio);
      const x = 16 + index * 154;
      drawZoomPair(preview, beforeFrame, afterFrame, crop, x, 42);
    });
    writePng(file, preview);
    output.push(file);
  }
  return output;
}

function zoomRect(bounds, width, height, yRatio) {
  const size = 96;
  const x = Math.max(0, Math.min(width - size, bounds.x + Math.round(bounds.w * 0.5) - Math.round(size * 0.5)));
  const y = Math.max(0, Math.min(height - size, bounds.y + Math.round(bounds.h * yRatio) - Math.round(size * 0.5)));
  return { x, y, w: Math.min(size, width - x), h: Math.min(size, height - y) };
}

function drawZoomPair(target, before, after, rect, x, y) {
  fillRect(target, x, y, 68, 196, [255, 255, 255, 220]);
  fillRect(target, x + 72, y, 68, 196, [255, 255, 255, 220]);
  blit(target, before, rect, { x, y: y + 18, w: 68, h: 68 });
  blit(target, after, rect, { x: x + 72, y: y + 18, w: 68, h: 68 });
  drawLabel(target, "B", x + 4, y + 4, [120, 40, 40, 255]);
  drawLabel(target, "A", x + 76, y + 4, [40, 90, 45, 255]);
}
