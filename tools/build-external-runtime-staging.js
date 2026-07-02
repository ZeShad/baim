import { dirname, join } from "node:path";
import { copyFileSync, writeFileSync } from "node:fs";
import {
  REPORTS_DIR,
  RUNTIME_DIR,
  SELECTION_PATH,
  animationFolders,
  alphaBounds,
  ensureDir,
  ensureExternalAnimationDirs,
  EXTERNAL_IDLE_DEFAULT_FPS,
  EXTERNAL_WALK_DEFAULT_FPS,
  externalWalkMotionCurve,
  inspectAnimationFolder,
  readJson,
  readPng,
  writeJson
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
  idleVariants: { east: [], west: [] },
  talkAnimations: {
    east: { singleWord: [], singleShortSentence: [], singleLongSentence: [] },
    west: { singleWord: [], singleShortSentence: [], singleLongSentence: [] }
  },
  rejectAnimations: { east: [], west: [] },
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

  const runtimeOutput = join(RUNTIME_DIR, `${key}.png`);
  copyFileSync(info.sheetImage, runtimeOutput);
  const sourceSheet = readPng(info.sheetImage);

  const frameStart = Math.max(0, Number(config.frameStart || 0));
  const frameEndTrim = Math.max(0, Number(config.frameEndTrim || 0));
  const explicitFrameCount = Number.isFinite(Number(config.frameCount)) ? Math.max(1, Number(config.frameCount)) : null;
  const selectedFrames = explicitFrameCount
    ? info.frames.slice(frameStart, frameStart + explicitFrameCount)
    : info.frames.slice(frameStart, frameEndTrim ? -frameEndTrim : undefined);
  const sourceFrameRects = info.frames.map(({ x, y, w, h, name, duration, index }) => ({ x, y, w, h, name, duration, sourceFrameIndex: index }));
  const frameRects = selectedFrames.map(({ x, y, w, h, name, duration, index }) => ({ x, y, w, h, name, duration, sourceFrameIndex: index }));
  const sourceFrameContentBounds = sourceFrameRects.map((rect) => alphaBoundsRect(sourceSheet, rect) || { x: 0, y: 0, w: rect.w, h: rect.h });
  const frameContentBounds = frameRects.map((rect) => alphaBoundsRect(sourceSheet, rect) || { x: 0, y: 0, w: rect.w, h: rect.h });
  const contentBounds = unionBounds(frameContentBounds) || { x: 0, y: 0, w: info.frameWidth, h: info.frameHeight };
  const role = roleFromKey(key);
  const configuredMovementSpeedMultipliers = Array.isArray(config.movementSpeedMultipliers)
    ? normalizedMovementSpeedMultipliers(config.movementSpeedMultipliers, frameRects.length)
    : null;
  const movementSpeedMultipliers = configuredMovementSpeedMultipliers
    || (role === "idle" || role === "talk" || role === "reject"
      ? Array.from({ length: frameRects.length }, () => 0)
      : externalWalkMotionCurve(role, frameRects.length, frameStart));
  const configuredInitialFrame = config.initialFrame ?? (role === "idle" || role === "talk" || role === "reject" ? 0 : 1);
  const initialFrame = Math.max(0, Math.min(Number(configuredInitialFrame) || 0, Math.max(0, frameRects.length - 1)));
  const fps = Number(config.fps) || (role === "idle" ? EXTERNAL_IDLE_DEFAULT_FPS : EXTERNAL_WALK_DEFAULT_FPS);
  const stopExitFrame = role === "loop" ? normalizedFrameIndex(config.stopExitFrame ?? 0, frameRects.length) : undefined;
  const stopRenderOffsetXStart = role === "stop" && Number.isFinite(Number(config.stopRenderOffsetXStart))
    ? Number(config.stopRenderOffsetXStart)
    : undefined;
  const stopRenderOffsetYStart = role === "stop" && Number.isFinite(Number(config.stopRenderOffsetYStart))
    ? Number(config.stopRenderOffsetYStart)
    : undefined;
  const metadata = {
    src: `target/external_animation_v1/runtime/${key}.png`,
    sourceSheet: info.sheetImage,
    metadataFile: info.metadataFile,
    usesOriginalLudoLayout: true,
    sourcePreserved: true,
    runtimeSource: "unpacked-alpha-sheet",
    frameWidth: info.frameWidth,
    frameHeight: info.frameHeight,
    sheetWidth: sourceSheet.width,
    sheetHeight: sourceSheet.height,
    frameCount: frameRects.length,
    sourceFrameCount: info.frames.length,
    frameStart,
    frameEndTrim,
    configuredFrameCount: explicitFrameCount,
    fps,
    loop: Boolean(config.loop),
    pingPong: Boolean(config.pingPong),
    role,
    ...(stopExitFrame === undefined ? {} : { stopExitFrame }),
    ...(stopRenderOffsetXStart === undefined ? {} : { stopRenderOffsetXStart }),
    ...(stopRenderOffsetYStart === undefined ? {} : { stopRenderOffsetYStart }),
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
  if (metadata.role === "idle") {
    const idleVariant = { ...metadata, slot, idleKey: key };
    generated.idleVariants.east.push(idleVariant);
    generated.idleVariants.west.push({ ...idleVariant, mirrored: true, mirrorSource: "east" });
  } else if (metadata.role === "talk") {
    const semantic = normalizeTalkSemantic(config.talkSemantic, config.talkLength);
    const talkVariant = { ...metadata, slot, talkKey: key, talkSemantic: semantic.source, talkSemanticKey: semantic.key };
    generated.talkAnimations.east[semantic.key].push(talkVariant);
    generated.talkAnimations.west[semantic.key].push({ ...talkVariant, mirrored: true, mirrorSource: "east" });
  } else if (metadata.role === "reject") {
    const rejectVariant = { ...metadata, slot, rejectKey: key };
    generated.rejectAnimations.east.push(rejectVariant);
    generated.rejectAnimations.west.push({ ...rejectVariant, mirrored: true, mirrorSource: "east" });
  } else {
    generated.walkParts.east[metadata.role] = { ...metadata, slot };
    generated.walkParts.west[metadata.role] = { ...metadata, slot, mirrored: true, mirrorSource: "east" };
  }
  report.push({
    key,
    staged: true,
    output: runtimeOutput,
    sourceSheet: info.sheetImage,
    runtimeSource: "unpacked-alpha-sheet",
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
    ...(stopRenderOffsetYStart === undefined ? {} : { stopRenderOffsetYStart }),
    initialFrame,
    movementSpeedMultipliers,
    frameWidth: metadata.frameWidth,
    frameHeight: metadata.frameHeight,
    sheetWidth: metadata.sheetWidth,
    sheetHeight: metadata.sheetHeight,
    contentBounds
  });
}

function roleFromKey(key) {
  if (key.startsWith("idle_")) return "idle";
  if (key.startsWith("talk_")) return "talk";
  if (key.startsWith("reject_")) return "reject";
  if (key.endsWith("_start")) return "start";
  if (key.endsWith("_loop")) return "loop";
  if (key.endsWith("_stop")) return "stop";
  return "loop";
}

function normalizeTalkSemantic(value, legacyLength) {
  const normalized = String(value || "").toLowerCase().replaceAll("-", "_");
  if (normalized === "single_word") return { key: "singleWord", source: "single_word" };
  if (normalized === "single_short_sentence") return { key: "singleShortSentence", source: "single_short_sentence" };
  if (normalized === "single_long_sentence") return { key: "singleLongSentence", source: "single_long_sentence" };
  if (legacyLength === "word") return { key: "singleWord", source: "single_word" };
  if (legacyLength === "short") return { key: "singleShortSentence", source: "single_short_sentence" };
  return { key: "singleLongSentence", source: "single_long_sentence" };
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

function normalizedMovementSpeedMultipliers(values, frameCount) {
  const output = values.map((value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
  });
  while (output.length < frameCount) output.push(output.length ? output[output.length - 1] : 0);
  return output.slice(0, frameCount);
}

ensureDir(dirname(GENERATED_MODULE));
writeFileSync(GENERATED_MODULE, `// Generated by tools/build-external-runtime-staging.js. Review-only animation import metadata.\nexport const externalAnimationV1 = ${JSON.stringify(generated, null, 2)};\n`);
writeJson(join(REPORTS_DIR, "runtime-staging-report.json"), { animations: report });
console.log(JSON.stringify({ animations: report }, null, 2));
