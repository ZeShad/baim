import { externalAnimationV1 } from "./externalAnimationV1.generated.js";

export const characterDefinitions = {
  "npc.bai_mitko": {
    id: "npc.bai_mitko",
    displayNameKey: "npc.bai_mitko.name",
    pivot: { x: 0.5, y: 0.98 },
    gameHeight: 188,
    render: {
      anchor: { x: 0.5, y: 0.98 },
      defaultFacing: "south",
      canonicalVisualHeight: 640,
      verticalDirectionBias: 1.6,
      sceneHeights: {
        "scene.chapter1.apartment": { near: 335, far: 270 },
        "scene.chapter1.village_square": { near: 300, far: 190 },
        "scene.chapter1.mehana": { near: 285, far: 230 }
      }
    },
    animations: {
      idle: {
        type: "frames",
        fps: 6,
        loop: true,
        directions: {
          south: externalAnimationV1.walkParts?.east?.start,
          east: externalAnimationV1.walkParts?.east?.start,
          west: externalAnimationV1.walkParts?.west?.start,
          north: externalAnimationV1.walkParts?.east?.start
        },
        fallback: "walkStartFrame0"
      },
      walk: {
        type: "phasedStrip",
        fps: 8,
        loop: true,
        parts: {
          east: externalAnimationV1.walkParts?.east,
          west: externalAnimationV1.walkParts?.west
        },
        directions: {
          east: externalAnimationV1.walkParts?.east?.loop,
          west: externalAnimationV1.walkParts?.west?.loop
        },
        fallback: "directionalIdle"
      }
    },
    animationSource: "external_animation_v1"
  }
};
