import { clamp } from "./geometry.js";

export function characterHeight(definition, scene, position) {
  const calibration = definition.render.sceneHeights[scene.id] || { near: definition.gameHeight, far: definition.gameHeight };
  const zone = scene.perspectiveScale;
  if (!zone) return calibration.near;
  const t = clamp((position.y - zone.horizonY) / Math.max(1, zone.bottomY - zone.horizonY), 0, 1);
  return calibration.far + t * (calibration.near - calibration.far);
}
