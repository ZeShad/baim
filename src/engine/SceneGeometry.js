import { clamp, pointInRect } from "./geometry.js";

export function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersects = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function isWalkable(scene, point) {
  if (scene.walkMask) return pointInWalkMask(scene.walkMask, point);
  if (!scene.walkPolygons?.length) return point.y < 590;
  return scene.walkPolygons.some((zone) => pointInPolygon(point, zone.points));
}

export function pointInWalkMask(mask, point) {
  const width = Math.max(1, Number(mask.width) || 1);
  const height = Math.max(1, Number(mask.height) || 1);
  const worldWidth = Math.max(1, Number(mask.worldWidth) || 1280);
  const worldHeight = Math.max(1, Number(mask.worldHeight) || 720);
  const x = Math.floor((point.x / worldWidth) * width);
  const y = Math.floor((point.y / worldHeight) * height);
  if (x < 0 || y < 0 || x >= width || y >= height) return false;
  const value = mask.rows?.[y]?.[x] || ".";
  const entry = mask.legend?.[value];
  if (entry) return Boolean(entry.walkable);
  return value !== ".";
}

export function nearestWalkablePointOnLine(scene, from, to, step = 4) {
  if (!from || !to) return null;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  if (distance === 0) return isWalkable(scene, from) ? { ...from } : null;
  let best = isWalkable(scene, from) ? { ...from } : null;
  const steps = Math.max(1, Math.ceil(distance / Math.max(1, step)));
  for (let index = 1; index <= steps; index += 1) {
    const t = index / steps;
    const point = { x: from.x + dx * t, y: from.y + dy * t };
    if (isWalkable(scene, point)) best = point;
  }
  return best;
}

export function nearestWalkablePoint(scene, point) {
  if (!point) return null;
  if (isWalkable(scene, point)) return { ...point };
  if (scene.walkMask?.rows?.length) return nearestWalkablePointInMask(scene.walkMask, point);
  let best = null;
  for (const polygon of scene.walkPolygons || []) {
    for (const candidate of polygon.points || []) {
      const d = Math.hypot(candidate.x - point.x, candidate.y - point.y);
      if (!best || d < best.distance) best = { point: candidate, distance: d };
    }
  }
  return best ? { ...best.point } : null;
}

function nearestWalkablePointInMask(mask, point) {
  const width = Math.max(1, Number(mask.width) || 1);
  const height = Math.max(1, Number(mask.height) || 1);
  const worldWidth = Math.max(1, Number(mask.worldWidth) || 1280);
  const worldHeight = Math.max(1, Number(mask.worldHeight) || 720);
  const cellWidth = worldWidth / width;
  const cellHeight = worldHeight / height;
  let best = null;
  for (let y = 0; y < height; y += 1) {
    const row = mask.rows[y] || "";
    for (let x = 0; x < width; x += 1) {
      const value = row[x] || ".";
      const entry = mask.legend?.[value];
      const walkable = entry ? Boolean(entry.walkable) : value !== ".";
      if (!walkable) continue;
      const candidate = {
        x: (x + 0.5) * cellWidth,
        y: (y + 0.5) * cellHeight
      };
      const d = Math.hypot(candidate.x - point.x, candidate.y - point.y);
      if (!best || d < best.distance) best = { point: candidate, distance: d };
    }
  }
  return best?.point || null;
}

export function sceneScale(scene, point) {
  if (scene.perspectiveScale) {
    const zone = scene.perspectiveScale;
    const t = clamp((point.y - zone.horizonY) / Math.max(1, zone.bottomY - zone.horizonY), 0, 1);
    return zone.far + t * (zone.near - zone.far);
  }
  const zone = scene.depthZones?.find((candidate) => point.y >= candidate.yMin && point.y <= candidate.yMax);
  if (!zone) return 1;
  const t = (point.y - zone.yMin) / Math.max(1, zone.yMax - zone.yMin);
  return zone.scaleMin + clamp(t, 0, 1) * (zone.scaleMax - zone.scaleMin);
}

export function findTargetAt(scene, point) {
  const targets = [...scene.npcs, ...scene.interactables, ...scene.exits];
  return targets.find((target) => {
    if (target.polygon) return pointInPolygon(point, target.polygon);
    return pointInRect(point, target.rect);
  });
}
