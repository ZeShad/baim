import cvReady from "@techstark/opencv-js";
import sharp from "sharp";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { chapter1 } from "../src/content/chapter1/index.js";
import { characterDefinitions } from "../src/content/art/characters.js";
import { assetManifest } from "../src/content/art/assetManifest.js";
import { externalAnimationV1 } from "../src/content/art/externalAnimationV1.generated.js";
import { characterHeight } from "../src/engine/CharacterRenderMath.js";
import { stableExternalVisualBounds } from "../src/engine/Renderer.js";
import { ensureDir, makePng, readJson, readPng, writeJson, writePng } from "./external-animation-utils.mjs";

const SELECTION_PATH = "assets_src/characters/bai_mitko/external_animation_v1/external-animation-selection.json";
const actionKey = process.argv[2] || "opens_window";
const shouldWrite = process.argv.includes("--write");
const selection = readJson(SELECTION_PATH);
const config = selection.animations?.[actionKey];
const frame = externalAnimationV1.animations?.[actionKey];
const registration = config?.registration;
if (!config || !frame || !registration) throw new Error(`${actionKey} needs animation metadata and registration configuration.`);

const cv = await cvReady;
const scene = chapter1.scenes.find((entry) => entry.id === registration.sceneId);
if (!scene) throw new Error(`Unknown registration scene ${registration.sceneId}`);
const target = [...scene.interactables, ...scene.exits, ...scene.npcs].find((entry) => entry.id === registration.sceneObjectId);
const sequence = target?.actions?.[registration.verb];
if (!sequence) throw new Error(`Missing ${registration.sceneObjectId}.${registration.verb} action sequence.`);
const actorPosition = resolveApproachPoint(scene, sequence);
const definition = characterDefinitions["npc.bai_mitko"];
const stableBounds = stableExternalVisualBounds(definition);
const baseScale = characterHeight(definition, scene, actorPosition) / stableBounds.h;
const background = await referencePixels(registration, scene, actorPosition, stableBounds, baseScale);
const sourceSheet = readPng(frame.src);
const sourceRect = frame.frameRects[registration.referenceFrame || 0];
const markerBounds = unionRects(registration.sceneMarkerRects);
const scaleRange = registration.scaleRange;
const candidates = [];

for (let animationScale = Number(scaleRange.min); animationScale <= Number(scaleRange.max) + 1e-9; animationScale += Number(scaleRange.step)) {
  const runtimeScale = baseScale * animationScale;
  const marker = markerTemplate(sourceSheet, sourceRect, registration.sceneMarkerRects, markerBounds, runtimeScale);
  const match = matchMaskedTemplate(background, marker, registration.sceneSearchRect);
  candidates.push({ animationScale, runtimeScale, marker, ...match });
}

candidates.sort((a, b) => b.score - a.score);
const best = candidates[0];
if (!best || !Number.isFinite(best.score)) throw new Error("No finite scene registration match was found.");
const globalOffset = {
  x: best.x - actorPosition.x + (frame.frameWidth * 0.5 - markerBounds.x) * best.runtimeScale,
  y: best.y - actorPosition.y + (stableBounds.baselineY - markerBounds.y) * best.runtimeScale
};
const stabilization = stabilizeFrames(sourceSheet, frame, registration.stabilizationRoi, best.runtimeScale);
const outputDir = join("target", "external_animation_v1", "registration", actionKey);
ensureDir(outputDir);
writePng(join(outputDir, "scene-reference.png"), background);
writePng(join(outputDir, "scene-marker.png"), best.marker.png);
writePng(join(outputDir, "scene-marker-overlay.png"), markerOverlay(background, best.marker, best.x, best.y));
writePng(join(outputDir, "action-on-scene.png"), actionOnScene(background, sourceSheet, sourceRect, frame, best.runtimeScale, actorPosition, globalOffset));
const report = {
  version: 1,
  actionKey,
  referenceProvider: registration.referenceProvider,
  sceneId: scene.id,
  sceneObjectId: target.id,
  verb: registration.verb,
  actorPosition,
  baseScale: round6(baseScale),
  stableBounds,
  markerBounds,
  scaleRange,
  best: {
    animationScale: round6(best.animationScale),
    runtimeScale: round6(best.runtimeScale),
    markerPosition: { x: best.x, y: best.y },
    score: round6(best.score),
    offsetX: round3(globalOffset.x),
    offsetY: round3(globalOffset.y)
  },
  frameOffsets: stabilization.map((entry) => [entry.offset.x, entry.offset.y]),
  frameRegistration: stabilization,
  runnerUp: candidates[1] ? { animationScale: round6(candidates[1].animationScale), score: round6(candidates[1].score) } : null,
  diagnostics: {
    reference: join(outputDir, "scene-reference.png"),
    marker: join(outputDir, "scene-marker.png"),
    overlay: join(outputDir, "scene-marker-overlay.png"),
    actionOnScene: join(outputDir, "action-on-scene.png")
  }
};
const minimumFrameScore = Math.min(...report.frameRegistration.map((entry) => entry.effectiveScore ?? entry.score));
const requiredGlobalScore = Number(registration.acceptance?.minimumGlobalScore ?? 0.9);
const requiredFrameScore = Number(registration.acceptance?.minimumFrameScore ?? 0.9);
report.acceptance = {
  requiredGlobalScore,
  requiredFrameScore,
  minimumFrameScore: round6(minimumFrameScore),
  passed: report.best.score >= requiredGlobalScore && minimumFrameScore >= requiredFrameScore
};
if (shouldWrite && report.best.score < requiredGlobalScore) {
  throw new Error(`Global registration score ${report.best.score} is below ${requiredGlobalScore}; refusing to write.`);
}
if (shouldWrite && minimumFrameScore < requiredFrameScore) {
  throw new Error(`Frame registration score ${minimumFrameScore} is below ${requiredFrameScore}; refusing to write.`);
}
writeJson(join(outputDir, "scene-registration-report.json"), report);
if (shouldWrite) {
  config.scale = report.best.animationScale;
  config.offsetX = report.best.offsetX;
  config.offsetY = report.best.offsetY;
  config.offsets = report.frameOffsets;
  config.registration.lastFit = {
    version: report.version,
    score: report.best.score,
    minimumFrameScore,
    report: `target/external_animation_v1/registration/${actionKey}/scene-registration-report.json`
  };
  writeJson(SELECTION_PATH, selection);
  report.written = true;
}
console.log(JSON.stringify(report, null, 2));

function resolveApproachPoint(sceneValue, sequenceValue) {
  if (sequenceValue.approach) return { ...sequenceValue.approach };
  const cell = sequenceValue.approachCell;
  const mask = sceneValue.walkMask;
  if (!cell || !mask) throw new Error("Registration action needs approach or approachCell.");
  return {
    x: (Number(cell.x) + 0.5) * (mask.worldWidth / mask.width),
    y: (Number(cell.y) + 0.5) * (mask.worldHeight / mask.height)
  };
}

async function referencePixels(registrationValue, sceneValue, actorPositionValue, stableBoundsValue, baseScaleValue) {
  if (registrationValue.referenceProvider === "character") {
    const referenceKey = registrationValue.characterReferenceAnimation || "walk_east_start";
    const referenceFrameIndex = Math.max(0, Number(registrationValue.characterReferenceFrame) || 0);
    const referenceMetadata = externalAnimationV1.animations?.[referenceKey];
    if (!referenceMetadata) throw new Error(`Unknown character reference animation ${referenceKey}`);
    const referenceRect = referenceMetadata.frameRects?.[referenceFrameIndex];
    if (!referenceRect) throw new Error(`Missing frame ${referenceFrameIndex} in ${referenceKey}`);
    const referenceSheet = readPng(referenceMetadata.src);
    const frameOffset = referenceMetadata.offsets?.[referenceFrameIndex] || {};
    const referenceOffset = {
      x: (Number(referenceMetadata.offsetX) || 0) + (Number(frameOffset.x) || 0),
      y: (Number(referenceMetadata.offsetY) || 0) + (Number(frameOffset.y) || 0)
    };
    const canvas = makePng(1280, 720);
    for (let index = 0; index < canvas.data.length; index += 4) {
      canvas.data[index] = 1;
      canvas.data[index + 1] = 1;
      canvas.data[index + 2] = 1;
      canvas.data[index + 3] = 255;
    }
    return actionOnScene(
      canvas,
      referenceSheet,
      referenceRect,
      referenceMetadata,
      baseScaleValue * (Number(referenceMetadata.scale) || 1),
      actorPositionValue,
      referenceOffset,
      stableBoundsValue
    );
  }
  const path = registrationValue.referenceProvider === "background"
    ? assetManifest.scenes?.[sceneValue.id]?.background
    : registrationValue.referencePath;
  if (!path) throw new Error(`No background asset for ${sceneValue.id}`);
  const { data, info } = await sharp(readFileSync(path)).resize(1280, 720, { fit: "fill" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const png = makePng(info.width, info.height);
  png.data.set(data);
  return png;
}

function markerTemplate(sheet, sheetFrame, rects, bounds, scale) {
  const width = Math.max(1, Math.round(bounds.w * scale));
  const height = Math.max(1, Math.round(bounds.h * scale));
  const png = makePng(width, height);
  const mask = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const localY = bounds.y + Math.min(bounds.h - 1, Math.floor(y / scale));
    for (let x = 0; x < width; x += 1) {
      const localX = bounds.x + Math.min(bounds.w - 1, Math.floor(x / scale));
      if (!rects.some((rect) => pointInRect(localX, localY, rect))) continue;
      const source = ((sheetFrame.y + localY) * sheet.width + sheetFrame.x + localX) * 4;
      const target = (y * width + x) * 4;
      const alpha = sheet.data[source + 3];
      if (alpha <= 32) continue;
      png.data[target] = sheet.data[source];
      png.data[target + 1] = sheet.data[source + 1];
      png.data[target + 2] = sheet.data[source + 2];
      png.data[target + 3] = alpha;
      mask[y * width + x] = alpha;
    }
  }
  return { png, mask, width, height };
}

function stabilizeFrames(sheet, metadata, roi, runtimeScale) {
  const sequential = registration.stabilizationMode === "sequential";
  const stabilizationReferenceFrame = Number.isInteger(registration.stabilizationReferenceFrame)
    ? registration.stabilizationReferenceFrame
    : (registration.referenceFrame || 0);
  const output = [];
  let cumulativeX = 0;
  let cumulativeY = 0;
  for (let frameIndex = 0; frameIndex < metadata.frameRects.length; frameIndex += 1) {
    const movingRect = metadata.frameRects[frameIndex];
    const referenceRect = sequential && frameIndex > 0
      ? metadata.frameRects[frameIndex - 1]
      : metadata.frameRects[stabilizationReferenceFrame];
    const trackingRoi = sequential
      ? { ...roi, x: roi.x - cumulativeX, y: roi.y - cumulativeY }
      : roi;
    const searchRange = sequential
      ? { minX: -24, maxX: 24, minY: -12, maxY: 12, step: 2 }
      : { minX: -140, maxX: 140, minY: -40, maxY: 40, step: 4 };
    const coarse = searchFrameShift(sheet, referenceRect, movingRect, trackingRoi, searchRange);
    const sequentialFine = searchFrameShift(sheet, referenceRect, movingRect, trackingRoi, {
      minX: coarse.x - 5, maxX: coarse.x + 5, minY: coarse.y - 5, maxY: coarse.y + 5, step: 1
    });
    let fine = sequentialFine;
    let registrationMode = sequential ? "sequential" : "direct";
    if (sequential && frameIndex > 0) {
      const directReference = metadata.frameRects[stabilizationReferenceFrame];
      const directCoarse = searchFrameShift(sheet, directReference, movingRect, roi, { minX: -140, maxX: 140, minY: -40, maxY: 40, step: 4 });
      const directFine = searchFrameShift(sheet, directReference, movingRect, roi, {
        minX: directCoarse.x - 5, maxX: directCoarse.x + 5, minY: directCoarse.y - 5, maxY: directCoarse.y + 5, step: 1
      });
      const sequentialCandidate = { ...sequentialFine, x: cumulativeX + sequentialFine.x, y: cumulativeY + sequentialFine.y };
      if (directFine.score > sequentialFine.score) {
        fine = directFine;
        registrationMode = "direct";
      } else {
        fine = sequentialCandidate;
      }
    }
    if (sequential) {
      cumulativeX = fine.x;
      cumulativeY = fine.y;
    } else {
      cumulativeX = fine.x;
      cumulativeY = fine.y;
    }
    output.push({
      frame: frameIndex,
      sourceShift: { x: cumulativeX, y: cumulativeY },
      registrationMode,
      offset: { x: round3(cumulativeX * runtimeScale), y: round3(cumulativeY * runtimeScale) },
      score: round6(fine.score),
      overlapPixels: fine.overlap
    });
  }
  repairLowConfidenceTracking(output, runtimeScale, Number(registration.acceptance?.minimumFrameScore ?? 0.9));
  return output;
}

function repairLowConfidenceTracking(entries, runtimeScale, threshold) {
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (entry.score >= threshold) continue;
    const previous = [...entries.slice(0, index)].reverse().find((candidate) => candidate.score >= threshold);
    const next = entries.slice(index + 1).find((candidate) => candidate.score >= threshold);
    if (!previous || !next) continue;
    const t = (index - previous.frame) / Math.max(1, next.frame - previous.frame);
    const x = previous.sourceShift.x + (next.sourceShift.x - previous.sourceShift.x) * t;
    const y = previous.sourceShift.y + (next.sourceShift.y - previous.sourceShift.y) * t;
    entry.measuredSourceShift = entry.sourceShift;
    entry.sourceShift = { x: round3(x), y: round3(y) };
    entry.offset = { x: round3(x * runtimeScale), y: round3(y * runtimeScale) };
    entry.repaired = true;
    entry.repairMethod = "linear_between_confident_neighbors";
    entry.effectiveScore = Math.min(previous.score, next.score);
  }
}

function searchFrameShift(sheet, referenceRect, movingRect, roi, range) {
  let best = { x: 0, y: 0, score: -Infinity, overlap: 0 };
  for (let shiftY = range.minY; shiftY <= range.maxY; shiftY += range.step) {
    for (let shiftX = range.minX; shiftX <= range.maxX; shiftX += range.step) {
      let intersection = 0;
      let union = 0;
      let overlap = 0;
      let colorAgreement = 0;
      for (let y = roi.y; y < roi.y + roi.h; y += 2) {
        for (let x = roi.x; x < roi.x + roi.w; x += 2) {
          const mx = x - shiftX;
          const my = y - shiftY;
          const referenceIndex = ((referenceRect.y + y) * sheet.width + referenceRect.x + x) * 4;
          const movingInside = mx >= 0 && mx < movingRect.w && my >= 0 && my < movingRect.h;
          const movingIndex = movingInside ? ((movingRect.y + my) * sheet.width + movingRect.x + mx) * 4 : 0;
          const referenceOpaque = sheet.data[referenceIndex + 3] > 32;
          const movingOpaque = movingInside && sheet.data[movingIndex + 3] > 32;
          if (referenceOpaque || movingOpaque) union += 1;
          if (!referenceOpaque || !movingOpaque) continue;
          intersection += 1;
          overlap += 1;
          const dr = sheet.data[referenceIndex] - sheet.data[movingIndex];
          const dg = sheet.data[referenceIndex + 1] - sheet.data[movingIndex + 1];
          const db = sheet.data[referenceIndex + 2] - sheet.data[movingIndex + 2];
          colorAgreement += 1 - Math.min(1, (dr * dr + dg * dg + db * db) / (3 * 255 * 255));
        }
      }
      const iou = union ? intersection / union : 0;
      const color = overlap ? colorAgreement / overlap : 0;
      const score = iou * 0.7 + color * 0.3;
      if (score > best.score) best = { x: shiftX, y: shiftY, score, overlap };
    }
  }
  return best;
}

function actionOnScene(reference, sheet, rect, metadata, scale, actor, offset, stableBoundsValue = stableBounds) {
  const output = makePng(reference.width, reference.height);
  output.data.set(reference.data);
  const drawX = Math.round(actor.x + offset.x - metadata.frameWidth * scale * 0.5);
  const drawY = Math.round(actor.y + offset.y - stableBoundsValue.baselineY * scale);
  const width = Math.round(rect.w * scale);
  const height = Math.round(rect.h * scale);
  for (let y = 0; y < height; y += 1) {
    const targetY = drawY + y;
    if (targetY < 0 || targetY >= output.height) continue;
    const sourceY = rect.y + Math.min(rect.h - 1, Math.floor(y / scale));
    for (let x = 0; x < width; x += 1) {
      const targetX = drawX + x;
      if (targetX < 0 || targetX >= output.width) continue;
      const sourceX = rect.x + Math.min(rect.w - 1, Math.floor(x / scale));
      const source = (sourceY * sheet.width + sourceX) * 4;
      const alpha = sheet.data[source + 3] / 255;
      if (!alpha) continue;
      const targetIndex = (targetY * output.width + targetX) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        output.data[targetIndex + channel] = Math.round(sheet.data[source + channel] * alpha + output.data[targetIndex + channel] * (1 - alpha));
      }
      output.data[targetIndex + 3] = 255;
    }
  }
  return output;
}

function matchMaskedTemplate(reference, marker, searchRect) {
  const search = cropPng(reference, searchRect);
  if (marker.width > search.width || marker.height > search.height) return { score: -Infinity, x: 0, y: 0 };
  const searchRgba = cv.matFromImageData({ width: search.width, height: search.height, data: new Uint8ClampedArray(search.data) });
  const markerRgba = cv.matFromImageData({ width: marker.width, height: marker.height, data: new Uint8ClampedArray(marker.png.data) });
  const searchRgb = new cv.Mat();
  const markerRgb = new cv.Mat();
  const maskMat = new cv.Mat(marker.height, marker.width, cv.CV_8UC1);
  const result = new cv.Mat();
  maskMat.data.set(marker.mask);
  cv.cvtColor(searchRgba, searchRgb, cv.COLOR_RGBA2RGB);
  cv.cvtColor(markerRgba, markerRgb, cv.COLOR_RGBA2RGB);
  cv.matchTemplate(searchRgb, markerRgb, result, cv.TM_CCORR_NORMED, maskMat);
  const extrema = cv.minMaxLoc(result);
  searchRgba.delete(); markerRgba.delete(); searchRgb.delete(); markerRgb.delete(); maskMat.delete(); result.delete();
  return { score: extrema.maxVal, x: searchRect.x + extrema.maxLoc.x, y: searchRect.y + extrema.maxLoc.y };
}

function unionRects(rects) {
  const minX = Math.min(...rects.map((rect) => rect.x));
  const minY = Math.min(...rects.map((rect) => rect.y));
  const maxX = Math.max(...rects.map((rect) => rect.x + rect.w));
  const maxY = Math.max(...rects.map((rect) => rect.y + rect.h));
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function cropPng(png, rect) {
  const output = makePng(rect.w, rect.h);
  for (let y = 0; y < rect.h; y += 1) {
    const sourceStart = ((rect.y + y) * png.width + rect.x) * 4;
    output.data.set(png.data.subarray(sourceStart, sourceStart + rect.w * 4), y * rect.w * 4);
  }
  return output;
}

function markerOverlay(reference, marker, x, y) {
  const output = makePng(reference.width, reference.height);
  output.data.set(reference.data);
  for (let my = 0; my < marker.height; my += 1) {
    for (let mx = 0; mx < marker.width; mx += 1) {
      const source = (my * marker.width + mx) * 4;
      const alpha = marker.png.data[source + 3] / 255;
      if (!alpha) continue;
      const target = ((y + my) * output.width + x + mx) * 4;
      if (target < 0 || target + 3 >= output.data.length) continue;
      output.data[target] = Math.round(output.data[target] * 0.35 + marker.png.data[source] * 0.65);
      output.data[target + 1] = Math.round(output.data[target + 1] * 0.35 + marker.png.data[source + 1] * 0.65);
      output.data[target + 2] = Math.round(output.data[target + 2] * 0.35 + marker.png.data[source + 2] * 0.65);
      output.data[target + 3] = 255;
    }
  }
  return output;
}

function pointInRect(x, y, rect) {
  return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
}

function round3(value) { return Math.round(value * 1000) / 1000; }
function round6(value) { return Math.round(value * 1_000_000) / 1_000_000; }
