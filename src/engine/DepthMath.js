import { clamp } from "./geometry.js";

export function sceneDepthT(scene, point) {
  const zone = sceneDepthZone(scene, point);
  if (zone && Number.isFinite(Number(zone.depth))) {
    const depth = Number(zone.depth);
    return clamp(Number.isFinite(depth) ? depth : 0, 0, 1);
  }

  const perspective = scene?.perspectiveScale;
  if (!perspective) return 1;
  return clamp(
    ((point?.y ?? perspective.bottomY) - perspective.horizonY)
      / Math.max(1, perspective.bottomY - perspective.horizonY),
    0,
    1
  );
}

export function sceneZDepthT(scene, point) {
  const zone = sceneDepthZone(scene, point);
  const zDepth = Number(zone?.zDepth);
  return Number.isFinite(zDepth) ? clamp(zDepth, 0, 1) : sceneDepthT(scene, point);
}

export function sceneCharacterHeight(scene, point, characterId) {
  const zone = sceneDepthZone(scene, point);
  const height = Number(zone?.characterHeights?.[characterId]);
  return Number.isFinite(height) && height > 0 ? height : null;
}

function sceneDepthZone(scene, point) {
  return (scene?.depthZones || []).find((zone) =>
    zone?.polygon?.length >= 3 && pointInPolygon(point, zone.polygon)
  ) || null;
}

function pointInPolygon(point, polygon) {
  const x = Number(point?.x);
  const y = Number(point?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;

  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    const intersects = ((currentPoint.y > y) !== (previousPoint.y > y))
      && (x < ((previousPoint.x - currentPoint.x) * (y - currentPoint.y))
        / ((previousPoint.y - currentPoint.y) || Number.EPSILON) + currentPoint.x);
    if (intersects) inside = !inside;
  }
  return inside;
}
