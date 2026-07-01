import { dirname, join } from "node:path";
import { existsSync, writeFileSync } from "node:fs";
import {
  CLEANED_DIR,
  REPORTS_DIR,
  RUNTIME_DIR,
  SELECTION_PATH,
  animationFolders,
  alphaBounds,
  ensureDir,
  ensureExternalAnimationDirs,
  EXTERNAL_WALK_DEFAULT_FPS,
  externalWalkMotionCurve,
  inspectAnimationFolder,
  readJson,
  readPng,
  robustChromaKeyGreenToAlpha,
  writeJson,
  writePng
} from "./external-animation-utils.mjs";

const GENERATED_MODULE = "src/content/art/externalAnimationV1.generated.js";

ensureExternalAnimationDirs();

const selection = readJson(SELECTION_PATH);
const folders = new Map(animationFolders().map((folder) => [folder.key, folder]));
const report = [];
const generated = {
  variant: selection.variant,
  status: selection.status,
  scope: selection.scope,
  concept: selection.concept,
  characterAssets: {},
  walkParts: { east: {}, west: {} },
  animations: {}
};

for (const [key, config] of Object.entries(selection.animations || {})) {
  if (!config.use) {
    report.push({ key, staged: false, reason: "not selected" });
    continue;
  }
  const folder = folders.get(key);
  if (!folder) {
    report.push({ key, staged: false, reason: "missing unpacked folder" });
    continue;
  }
  const info = inspectAnimationFolder(folder);
  if (!info.sheetImage || !info.frames.length || !info.metadataUsable) {
    report.push({ key, staged: false, reason: "missing usable Ludo JSON metadata or sheet" });
    continue;
  }

  const cleanedSheet = join(CLEANED_DIR, `${key}.png`);
  const usingCleanedSheet = existsSync(cleanedSheet);
  const sourceSheet = readPng(usingCleanedSheet ? cleanedSheet : info.sheetImage);
  const keyed = usingCleanedSheet
    ? { png: sourceSheet, stats: { precleanedSheet: true, cleanedSheet } }
    : robustChromaKeyGreenToAlpha(sourceSheet, config.chromaKey || {});
  const runtimeOutput = join(RUNTIME_DIR, `${key}.png`);
  writePng(runtimeOutput, keyed.png);

  const frameStart = Math.max(0, Number(config.frameStart || 0));
  const frameEndTrim = Math.max(0, Number(config.frameEndTrim || 0));
  const explicitFrameCount = Number.isFinite(Number(config.frameCount)) ? Math.max(1, Number(config.frameCount)) : null;
  const selectedFrames = explicitFrameCount
    ? info.frames.slice(frameStart, frameStart + explicitFrameCount)
    : info.frames.slice(frameStart, frameEndTrim ? -frameEndTrim : undefined);
  const sourceFrameRects = info.frames.map(({ x, y, w, h, name, duration, index }) => ({ x, y, w, h, name, duration, sourceFrameIndex: index }));
  const frameRects = selectedFrames.map(({ x, y, w, h, name, duration, index }) => ({ x, y, w, h, name, duration, sourceFrameIndex: index }));
  const sourceFrameContentBounds = sourceFrameRects.map((rect) => alphaBoundsRect(keyed.png, rect) || { x: 0, y: 0, w: rect.w, h: rect.h });
  const frameContentBounds = frameRects.map((rect) => alphaBoundsRect(keyed.png, rect) || { x: 0, y: 0, w: rect.w, h: rect.h });
  const contentBounds = unionBounds(frameContentBounds) || { x: 0, y: 0, w: info.frameWidth, h: info.frameHeight };
  const role = roleFromKey(key);
  const movementSpeedMultipliers = externalWalkMotionCurve(role, frameRects.length, frameStart);
  const configuredInitialFrame = config.initialFrame ?? 1;
  const initialFrame = Math.max(0, Math.min(Number(configuredInitialFrame) || 0, Math.max(0, frameRects.length - 1)));
  const fps = Number(config.fps) || EXTERNAL_WALK_DEFAULT_FPS;
  const stopExitFrame = role === "loop" ? normalizedFrameIndex(config.stopExitFrame ?? 0, frameRects.length) : undefined;
  const stopRenderOffsetXStart = role === "stop" && Number.isFinite(Number(config.stopRenderOffsetXStart))
    ? Number(config.stopRenderOffsetXStart)
    : undefined;
  const metadata = {
    src: `target/external_animation_v1/runtime/${key}.png`,
    sourceSheet: info.sheetImage,
    cleanedSheet: usingCleanedSheet ? cleanedSheet : null,
    metadataFile: info.metadataFile,
    usesOriginalLudoLayout: true,
    sourcePreserved: true,
    chromaKeyedFromOriginalLudoSheet: !usingCleanedSheet,
    usesCleanedDerivedSheet: usingCleanedSheet,
    chromaKeyStats: keyed.stats,
    frameWidth: info.frameWidth,
    frameHeight: info.frameHeight,
    sheetWidth: keyed.png.width,
    sheetHeight: keyed.png.height,
    frameCount: frameRects.length,
    sourceFrameCount: info.frames.length,
    frameStart,
    frameEndTrim,
    configuredFrameCount: explicitFrameCount,
    fps,
    loop: Boolean(config.loop),
    role,
    ...(stopExitFrame === undefined ? {} : { stopExitFrame }),
    ...(stopRenderOffsetXStart === undefined ? {} : { stopRenderOffsetXStart }),
    initialFrame,
    anchorX: 0.5,
    anchorY: 1,
    anchor: { x: 0.5, y: 1 },
    baselineY: info.frameHeight,
    contentBounds,
    sourceContentBounds: unionBounds(sourceFrameContentBounds) || { x: 0, y: 0, w: info.frameWidth, h: info.frameHeight },
    sourceFrameContentBounds,
    sourceFrameRects,
    frameContentBounds,
    frameRects,
    movementSpeedMultipliers,
    mirroredWest: true
  };

  const slot = `external_${key}`;
  generated.characterAssets[slot] = metadata.src;
  generated.animations[key] = metadata;
  generated.walkParts.east[metadata.role] = { ...metadata, slot };
  generated.walkParts.west[metadata.role] = { ...metadata, slot, mirrored: true, mirrorSource: "east" };
  report.push({
    key,
    staged: true,
    output: runtimeOutput,
    sourceSheet: info.sheetImage,
    cleanedSheet: usingCleanedSheet ? cleanedSheet : null,
    usesCleanedDerivedSheet: usingCleanedSheet,
    metadataFile: info.metadataFile,
    metadataMode: info.parseMode,
    frameCount: metadata.frameCount,
    sourceFrameCount: metadata.sourceFrameCount,
    frameStart,
    frameEndTrim,
    configuredFrameCount: explicitFrameCount,
    fps: metadata.fps,
    loop: metadata.loop,
    role: metadata.role,
    ...(stopExitFrame === undefined ? {} : { stopExitFrame }),
    ...(stopRenderOffsetXStart === undefined ? {} : { stopRenderOffsetXStart }),
    initialFrame,
    movementSpeedMultipliers,
    frameWidth: metadata.frameWidth,
    frameHeight: metadata.frameHeight,
    sheetWidth: metadata.sheetWidth,
    sheetHeight: metadata.sheetHeight,
    contentBounds,
    chromaKeyStats: keyed.stats
  });
}

function roleFromKey(key) {
  if (key.endsWith("_start")) return "start";
  if (key.endsWith("_loop")) return "loop";
  if (key.endsWith("_stop")) return "stop";
  return "loop";
}

function alphaBoundsRect(png, rect) {
  let minX = rect.w;
  let minY = rect.h;
  let maxX = 0;
  let maxY = 0;
  let found = false;
  for (let y = 0; y < rect.h; y += 1) {
    for (let x = 0; x < rect.w; x += 1) {
      const index = ((rect.y + y) * png.width + rect.x + x) * 4 + 3;
      if (png.data[index] > 1) {
        found = true;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + 1);
        maxY = Math.max(maxY, y + 1);
      }
    }
  }
  return found ? { x: minX, y: minY, w: maxX - minX, h: maxY - minY } : null;
}

function unionBounds(bounds) {
  if (!bounds.length) return null;
  const minX = Math.min(...bounds.map((b) => b.x));
  const minY = Math.min(...bounds.map((b) => b.y));
  const maxX = Math.max(...bounds.map((b) => b.x + b.w));
  const maxY = Math.max(...bounds.map((b) => b.y + b.h));
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function normalizedFrameIndex(value, frameCount) {
  const count = Math.max(1, Number(frameCount) || 1);
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return ((Math.trunc(numeric) % count) + count) % count;
}

ensureDir(dirname(GENERATED_MODULE));
writeFileSync(GENERATED_MODULE, `// Generated by tools/build-external-runtime-staging.js. Review-only animation import metadata.\nexport const externalAnimationV1 = ${JSON.stringify(generated, null, 2)};\n`);
writeJson(join(REPORTS_DIR, "runtime-staging-report.json"), { animations: report });
console.log(JSON.stringify({ animations: report }, null, 2));
