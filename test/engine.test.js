import test from "node:test";
import assert from "node:assert/strict";
import { Localization } from "../src/engine/Localization.js";
import { SaveSystem } from "../src/engine/SaveSystem.js";
import { pointInPolygon, isWalkable } from "../src/engine/SceneGeometry.js";
import { DEFAULT_SAVE } from "../src/engine/ids.js";
import { characterHeight } from "../src/engine/CharacterRenderMath.js";
import { facingFromDelta, MovementSystem, requestWalkStop, eastWestFallbackFacing, walkMotionMultiplierForFrame } from "../src/engine/MovementSystem.js";
import { AnimationPlayer } from "../src/engine/AnimationPlayer.js";
import { Renderer, stopRenderOffsetX } from "../src/engine/Renderer.js";
import { strings } from "../src/content/localization/index.js";
import { chapter1 } from "../src/content/chapter1/index.js";
import { assetManifest } from "../src/content/art/assetManifest.js";
import { CHARACTER_CUTOUT_MARGIN_RATIO, CHARACTER_SOURCE_SCALE } from "../src/content/art/characterAssetConfig.js";
import { characterDefinitions } from "../src/content/art/characters.js";
import { makePng } from "../tools/character-frame-utils.mjs";
import {
  EXTERNAL_WALK_LOOP_MOTION_MAX,
  EXTERNAL_WALK_LOOP_MOTION_MIN,
  chromaKeyGreenToAlpha,
  externalWalkMotionCurve,
  externalWalkRawMotionCurve
} from "../tools/external-animation-utils.mjs";

test("localization returns Bulgarian and English strings from stable keys", () => {
  const l10n = new Localization(strings, "bg");
  assert.equal(l10n.t("chapter1.title"), "Изборен ден на село");
  l10n.setLanguage("en");
  assert.equal(l10n.t("chapter1.title"), "Election Day in the Village");
});

test("localization falls back to English before returning the key", () => {
  const l10n = new Localization({ bg: {}, en: { "known.key": "Known" } }, "bg");
  assert.equal(l10n.t("known.key"), "Known");
  assert.equal(l10n.t("missing.key"), "missing.key");
});

test("scene polygon geometry detects walkable space", () => {
  const square = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 }
  ];
  assert.equal(pointInPolygon({ x: 50, y: 50 }, square), true);
  assert.equal(pointInPolygon({ x: 120, y: 50 }, square), false);
});

test("chapter scenes define explicit walk polygons for production art", () => {
  for (const scene of chapter1.scenes) {
    assert.ok(scene.walkPolygons.length > 0, `${scene.id} needs walk polygons`);
    assert.equal(isWalkable(scene, scene.playerStart), true);
  }
});

test("chapter scene movement speeds are tuned for external walk animation", () => {
  const speeds = Object.fromEntries(chapter1.scenes.map((scene) => [scene.id, scene.movementSpeed]));
  assert.equal(speeds["scene.chapter1.apartment"], 70);
  assert.equal(speeds["scene.chapter1.village_square"], 80);
  assert.equal(speeds["scene.chapter1.mehana"], 75);
});

test("save system merges old saves with current defaults", () => {
  const storage = new MemoryStorage({ test: JSON.stringify({ influence: 10 }) });
  const save = new SaveSystem(storage, "test").load();
  assert.equal(save.influence, 10);
  assert.equal(save.currentChapter, DEFAULT_SAVE.currentChapter);
  assert.deepEqual(save.inventory, DEFAULT_SAVE.inventory);
});

test("Bai Mitko render height is canonical across idle and walk assets", () => {
  const scene = chapter1.scenes.find((candidate) => candidate.id === "scene.chapter1.apartment");
  const definition = characterDefinitions["npc.bai_mitko"];
  const position = { x: 650, y: 520 };
  const idleHeight = characterHeight(definition, scene, position);
  const walkSouthHeight = characterHeight(definition, scene, position);
  const walkEastHeight = characterHeight(definition, scene, position);
  const walkNorthHeight = characterHeight(definition, scene, position);

  assert.ok(Math.abs(idleHeight - walkSouthHeight) < 2);
  assert.ok(Math.abs(idleHeight - walkEastHeight) < 2);
  assert.ok(Math.abs(idleHeight - walkNorthHeight) < 2);
});

test("Bai Mitko west idle mirrors east instead of using a separate west image", () => {
  const idle = characterDefinitions["npc.bai_mitko"].animations.idle.directions;
  assert.deepEqual(idle.west, { slot: "idle_east", mirrored: true });
  assert.equal(assetManifest.characters["npc.bai_mitko"].idle_west, undefined);
});

test("character cutouts use the shared 15 percent source margin", () => {
  assert.equal(CHARACTER_SOURCE_SCALE, 0.6);
  assert.equal(CHARACTER_CUTOUT_MARGIN_RATIO, 0.15);
});

test("east movement exposes start loop stop walk parts without mirroring metadata", () => {
  const player = { facing: "south", verticalDirectionBias: 1.6 };
  assert.equal(facingFromDelta(100, 0, player), "east");

  const east = characterDefinitions["npc.bai_mitko"].animations.walk.parts.east;
  assert.equal(east.start.slot, "external_walk_east_start");
  assert.equal(east.loop.slot, "external_walk_east_loop");
  assert.equal(east.stop.slot, "external_walk_east_stop");
  assert.equal(east.start.frameCount, 13);
  assert.equal(east.loop.frameCount, 16);
  assert.equal(east.stop.frameCount, 8);
  assert.equal(east.start.initialFrame, 1);
  assert.equal(east.loop.initialFrame, 1);
  assert.equal(east.stop.initialFrame, 1);
  assert.equal(east.start.fps, 16);
  assert.equal(east.loop.fps, 16);
  assert.equal(east.stop.fps, 16);
  assert.equal(east.start.sourceFrameRects[0].sourceFrameIndex, 0);
  assert.equal(east.loop.stopExitFrame, 0);
  assert.equal(east.start.loop, false);
  assert.equal(east.loop.loop, true);
  assert.equal(east.stop.loop, false);
  assert.equal(Boolean(east.loop.mirrored), false);
});

test("west movement mirrors the external east start loop stop parts", () => {
  const player = { facing: "south", verticalDirectionBias: 1.6 };
  assert.equal(facingFromDelta(-100, 0, player), "west");

  const west = characterDefinitions["npc.bai_mitko"].animations.walk.parts.west;
  assert.equal(west.start.slot, "external_walk_east_start");
  assert.equal(west.loop.slot, "external_walk_east_loop");
  assert.equal(west.stop.slot, "external_walk_east_stop");
  assert.equal(west.start.mirrored, true);
  assert.equal(west.loop.mirrored, true);
  assert.equal(west.stop.mirrored, true);
  assert.equal(west.loop.mirrorSource, "east");
});

test("east-only external walk maps diagonal east-west facings to active strips", () => {
  assert.equal(eastWestFallbackFacing("east"), "east");
  assert.equal(eastWestFallbackFacing("south_east"), "east");
  assert.equal(eastWestFallbackFacing("north_east"), "east");
  assert.equal(eastWestFallbackFacing("west"), "west");
  assert.equal(eastWestFallbackFacing("south_west"), "west");
  assert.equal(eastWestFallbackFacing("north_west"), "west");
  assert.equal(eastWestFallbackFacing("south"), null);
  assert.equal(eastWestFallbackFacing("north"), null);
});

test("east-west-only walk parts constrain movement facing to animated strips", () => {
  const player = {
    facing: "west",
    verticalDirectionBias: 1.6,
    walkPartsByFacing: {
      east: { loop: {} },
      west: { loop: {} }
    }
  };
  assert.equal(facingFromDelta(40, 120, player), "east");
  assert.equal(facingFromDelta(-40, 120, player), "west");
  assert.equal(facingFromDelta(0, 120, player), "west");
});

test("external walk start ramps slowly and loop uses foot-push pulses", () => {
  const start = externalWalkMotionCurve("start", 9);
  assert.deepEqual(start.slice(0, 3), [0, 0, 0]);
  assert.ok(start[3] < 0.5);
  assert.ok(start[4] < start.at(-1));
  assert.ok(start[7] - start[6] > start[5] - start[4]);
  assert.equal(start.at(-1), EXTERNAL_WALK_LOOP_MOTION_MAX);

  const loop = externalWalkMotionCurve("loop", 16);
  const rawLoop = externalWalkRawMotionCurve("loop", 16);
  const rawMin = Math.min(...rawLoop);
  const rawMax = Math.max(...rawLoop);
  const expectedFrameTwo = Number((EXTERNAL_WALK_LOOP_MOTION_MIN + ((rawLoop[2] - rawMin) / (rawMax - rawMin)) * (EXTERNAL_WALK_LOOP_MOTION_MAX - EXTERNAL_WALK_LOOP_MOTION_MIN)).toFixed(3));
  assert.equal(loop[2], expectedFrameTwo);
  assert.ok(loop[2] > loop[6]);
  assert.ok(loop[10] > loop[14]);
  assert.equal(Math.min(...loop), EXTERNAL_WALK_LOOP_MOTION_MIN);
  assert.equal(Math.max(...loop), EXTERNAL_WALK_LOOP_MOTION_MAX);
  assert.ok(loop[2] - loop[6] < rawLoop[2] - rawLoop[6]);
});

test("walk motion multiplier preserves explicit zero values", () => {
  const player = {
    animation: "walk",
    facing: "east",
    walkPart: "start",
    animator: { frameIndex: 0 },
    walkMotionMultipliersByFacing: {
      east: {
        start: [0, 0.5, 1]
      }
    }
  };
  assert.equal(walkMotionMultiplierForFrame(player), 0);
  player.animator.frameIndex = 1;
  assert.equal(walkMotionMultiplierForFrame(player), 0.5);
});

test("walk animation can play startup frames once before looping from configured frame", () => {
  const player = new AnimationPlayer({
    animations: {
      idle: { frames: ["idle"], fps: 1, loop: true },
      walk: { type: "strip", frameCount: 28, fps: 17, loop: true }
    }
  });
  player.play("walk");
  player.frameCountOverride = 28;
  player.loopStartFrameOverride = 12;
  player.update(27 / 17);
  assert.equal(player.frameIndex, 27);
  player.update(1 / 17);
  assert.equal(player.frameIndex, 12);
});

test("phased strip animation advances frames in the game animation player", () => {
  const player = new AnimationPlayer({
    animations: {
      idle: { frames: ["idle"], fps: 1, loop: true },
      walk: { type: "phasedStrip", frameCount: 9, fps: 8, loop: false }
    }
  });
  player.play("walk", "external_walk_east_start:east:start");
  player.frameCountOverride = 9;
  player.fpsOverride = 8;
  player.loopOverride = false;
  player.update(2 / 8);
  assert.equal(player.frameIndex, 2);
});

test("playing the same stable animation key does not reset elapsed time", () => {
  const player = new AnimationPlayer({
    animations: {
      idle: { frames: ["idle"], fps: 1, loop: true },
      walk: { type: "phasedStrip", frameCount: 16, fps: 8, loop: true }
    }
  });
  player.play("walk", "external_walk_east_loop:east:loop");
  player.update(3 / 8);
  assert.equal(player.frameIndex, 3);
  player.beginTick();
  player.play("walk", "external_walk_east_loop:east:loop");
  player.update(1 / 8);
  assert.equal(player.frameIndex, 4);
  assert.equal(player.resetThisTick, false);
});

test("walk animation frames advance linearly from configured frame one", () => {
  const player = new AnimationPlayer({
    animations: {
      idle: { frames: ["idle"], fps: 1, loop: true },
      walk: { type: "phasedStrip", frameCount: 16, fps: 8, loop: true }
    }
  });
  player.frameCountOverride = 16;
  player.fpsOverride = 8;
  player.loopOverride = true;
  player.initialFrameOverride = 1;
  player.play("walk", "external_walk_east_loop:east:loop");
  assert.equal(player.frameIndex, 1);
  player.update(0.99 / 8);
  assert.equal(player.frameIndex, 1);
  player.update(0.01 / 8);
  assert.equal(player.frameIndex, 2);
  player.update(16 / 8);
  assert.equal(player.frameIndex, 2);
});

test("non-looping walk parts report finished for start and stop phases", () => {
  const player = new AnimationPlayer({
    animations: {
      idle: { frames: ["idle"], fps: 1, loop: true },
      walk: { type: "strip", frameCount: 9, fps: 8, loop: false }
    }
  });
  player.play("walk");
  player.frameCountOverride = 9;
  player.fpsOverride = 8;
  player.loopOverride = false;
  player.update(8 / 8);
  assert.equal(player.isFinished(), false);
  player.update(1 / 8);
  assert.equal(player.isFinished(), true);
});

test("movement starts stop phase immediately without waiting for loop exit frame", () => {
  const animator = new AnimationPlayer({
    animations: {
      idle: { frames: ["idle"], fps: 1, loop: true },
      walk: { type: "phasedStrip", frameCount: 4, fps: 4, loop: true }
    }
  });
  const player = {
    position: { x: 0, y: 0 },
    target: null,
    speed: 100,
    animation: "idle",
    facing: "east",
    walkPart: "loop",
    pendingStop: false,
    stopAnimationStarted: false,
    stopAnimationFinished: false,
    movementStopping: false,
    walkPartsByFacing: {
      east: {
        start: { frameCount: 3, fps: 3, loop: false },
        loop: { frameCount: 4, fps: 4, loop: true, stopExitFrame: 2 },
        stop: { frameCount: 3, fps: 3, loop: false }
      }
    },
    animator
  };
  player.animation = "walk";
  animator.frameIndex = 1;
  requestWalkStop(player);
  assert.equal(player.walkPart, "stop");
  assert.equal(player.pendingStop, false);
  assert.equal(player.stopAnimationStarted, true);
});

test("retargeting while walking continues loop instead of replaying start", () => {
  const player = {
    position: { x: 0, y: 0 },
    target: { x: 100, y: 0 },
    speed: 100,
    animation: "walk",
    facing: "east",
    walkPart: "start",
    pendingStop: false,
    stopAnimationStarted: false,
    stopAnimationFinished: false,
    movementStopping: false,
    walkPartsByFacing: {
      east: {
        start: { frameCount: 3, fps: 3, loop: false },
        loop: { frameCount: 4, fps: 4, loop: true },
        stop: { frameCount: 3, fps: 3, loop: false }
      }
    }
  };
  const movement = new MovementSystem(player);
  movement.walkTo({ x: 200, y: 0 });
  assert.equal(player.walkPart, "loop");
});

test("new walk from idle uses start part when available", () => {
  const player = {
    position: { x: 0, y: 0 },
    target: null,
    speed: 100,
    animation: "idle",
    facing: "east",
    walkPart: null,
    pendingStop: false,
    stopAnimationStarted: false,
    stopAnimationFinished: false,
    movementStopping: false,
    walkPartsByFacing: {
      east: {
        start: { frameCount: 3, fps: 3, loop: false },
        loop: { frameCount: 4, fps: 4, loop: true }
      }
    }
  };
  const movement = new MovementSystem(player);
  movement.walkTo({ x: 200, y: 0 });
  assert.equal(player.walkPart, "start");
});

test("external idle pose uses walk start frame zero instead of stale walk frame", () => {
  const definition = characterDefinitions["npc.bai_mitko"];
  const player = {
    walkPartsByFacing: definition.animations.walk.parts,
    lastWalkFrame: {
      frameIndex: 7,
      frame: definition.animations.walk.parts.east.loop,
      slot: definition.animations.walk.parts.east.loop.slot
    }
  };
  const idle = Renderer.resolveIdleWalkFrameForDefinition(player, definition, "east");
  assert.equal(idle.slot, "external_walk_east_start");
  assert.equal(idle.frameIndex, 0);
  assert.equal(idle.frame.role, "start");
});

test("movement stop phase plays once and can finish into idle", () => {
  const animator = new AnimationPlayer({
    animations: {
      idle: { frames: ["idle"], fps: 1, loop: true },
      walk: { type: "phasedStrip", frameCount: 3, fps: 3, loop: false }
    }
  });
  const player = {
    position: { x: 0, y: 0 },
    target: null,
    speed: 100,
    animation: "walk",
    facing: "east",
    walkPart: "loop",
    pendingStop: true,
    stopAnimationStarted: false,
    stopAnimationFinished: false,
    movementStopping: false,
    walkPartsByFacing: {
      east: {
        loop: { frameCount: 4, fps: 4, loop: true, stopExitFrame: 1 },
        stop: { frameCount: 3, fps: 3, loop: false }
      }
    },
    animator
  };
  const movement = new MovementSystem(player);
  animator.frameIndex = 1;
  movement.update(1 / 60);
  assert.equal(player.walkPart, "stop");

  animator.play("walk", "external_walk_east_stop:east:stop");
  animator.frameCountOverride = 3;
  animator.fpsOverride = 3;
  animator.loopOverride = false;
  animator.update(1 / 3);
  movement.update(1 / 60);
  assert.equal(player.walkPart, "stop");
  assert.equal(player.animation, "walk");
  assert.ok(animator.frameIndex > 0);

  animator.update(1);
  movement.update(1 / 60);
  assert.equal(player.animation, "idle");
  assert.equal(player.walkPart, null);
  assert.equal(player.stopAnimationFinished, true);
});

test("stop render offset fades from initial frame to final frame", () => {
  const frame = { role: "stop", frameCount: 8, initialFrame: 1, stopRenderOffsetXStart: -30 };
  assert.equal(stopRenderOffsetX(frame, 1), -30);
  assert.equal(stopRenderOffsetX(frame, 4), -15);
  assert.equal(stopRenderOffsetX(frame, 7), 0);
  assert.equal(stopRenderOffsetX(frame, 1, true), 30);
});

test("external animation chroma key converts green amount into soft alpha", () => {
  const png = makePng(4, 1);
  const pixels = [
    [0, 255, 0, 255],
    [70, 120, 75, 255],
    [24, 32, 28, 255],
    [180, 130, 90, 255]
  ];
  for (let x = 0; x < pixels.length; x += 1) {
    const index = x * 4;
    png.data[index] = pixels[x][0];
    png.data[index + 1] = pixels[x][1];
    png.data[index + 2] = pixels[x][2];
    png.data[index + 3] = pixels[x][3];
  }

  const keyed = chromaKeyGreenToAlpha(png, { low: 18, high: 95, minGreen: 40, spillStrength: 1 }).png;
  assert.equal(keyed.data[3], 0, "pure key green should become transparent");
  assert.ok(keyed.data[7] > 0 && keyed.data[7] < 255, "green edge pixels should receive partial alpha");
  assert.ok(keyed.data[5] < png.data[5], "green spill should be suppressed on semi-transparent edges");
  assert.equal(keyed.data[11], 255, "dark non-key pixels should stay opaque");
  assert.equal(keyed.data[15], 255, "warm skin-like pixels should stay opaque");
});

class MemoryStorage {
  constructor(values = {}) {
    this.values = values;
  }

  getItem(key) {
    return this.values[key] || null;
  }

  setItem(key, value) {
    this.values[key] = value;
  }

  removeItem(key) {
    delete this.values[key];
  }
}
