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
  if (!scene.walkPolygons?.length) return point.y < 590;
  return scene.walkPolygons.some((zone) => pointInPolygon(point, zone.points));
}

export function sceneScale(scene, point) {
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
