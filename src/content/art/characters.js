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
          south: "idle_south",
          east: "idle_east",
          west: "idle_west",
          north: "idle_north"
        },
        fallback: "idle"
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
      },
      talk: {
        type: "frames",
        fps: 8,
        loop: true,
        frames: ["bai_mitko/talk_000", "bai_mitko/talk_001", "bai_mitko/talk_002", "bai_mitko/talk_003"]
      },
      look: { type: "frames", fps: 8, loop: false, frames: ["bai_mitko/look_000", "bai_mitko/look_001"] },
      use: { type: "frames", fps: 8, loop: false, frames: ["bai_mitko/use_000", "bai_mitko/use_001"] },
      take: { type: "frames", fps: 8, loop: false, frames: ["bai_mitko/take_000", "bai_mitko/take_001"] }
    },
    animationSource: "external_animation_v1"
  }
};
