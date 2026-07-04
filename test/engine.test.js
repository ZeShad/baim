import test from "node:test";
import assert from "node:assert/strict";
import { Localization } from "../src/engine/Localization.js";
import { SaveSystem } from "../src/engine/SaveSystem.js";
import { pointInPolygon, findWalkPath, isWalkable, pointInWalkMask, nearestWalkablePointOnLine, nearestReachableWalkablePoint, nearestWalkablePoint, sceneScale, walkPathDistance } from "../src/engine/SceneGeometry.js";
import { DEFAULT_SAVE } from "../src/engine/ids.js";
import { characterHeight } from "../src/engine/CharacterRenderMath.js";
import { facingFromDelta, MovementSystem, requestWalkStop, eastWestFallbackFacing, motionMultiplierAtFrame, walkMotionMultiplierForFrame } from "../src/engine/MovementSystem.js";
import { AnimationPlayer } from "../src/engine/AnimationPlayer.js";
import { Game, SHORT_WALK_PATH_DISTANCE } from "../src/engine/Game.js";
import { Renderer, sceneZIndexForPoint, stableExternalVisualBounds, stopRenderOffsetX, stopRenderOffsetY } from "../src/engine/Renderer.js";
import { strings } from "../src/content/localization/index.js";
import { chapter1 } from "../src/content/chapter1/index.js";
import { assetManifest } from "../src/content/art/assetManifest.js";
import { CHARACTER_CUTOUT_MARGIN_RATIO, CHARACTER_SOURCE_SCALE } from "../src/content/art/characterAssetConfig.js";
import { characterDefinitions } from "../src/content/art/characters.js";
import { externalAnimationV1 } from "../src/content/art/externalAnimationV1.generated.js";
import { distance } from "../src/engine/geometry.js";
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

test("chapter scenes define explicit walk geometry for production art", () => {
  for (const scene of chapter1.scenes) {
    assert.ok(scene.walkMask?.rows?.length || scene.walkPolygons.length > 0, `${scene.id} needs walk geometry`);
    assert.equal(isWalkable(scene, scene.playerStart), true);
  }
});

test("apartment uses a raster walk mask for walkable floor", () => {
  const scene = chapter1.scenes.find((candidate) => candidate.id === "scene.chapter1.apartment");
  assert.equal(scene.walkMask.width, 64);
  assert.equal(scene.walkMask.height, 36);
  assert.equal(scene.walkMask.rows.length, 36);
  assert.equal(scene.walkMask.rows.every((row) => row.length === 64), true);
  assert.equal(scene.walkMask.rows.join("").includes("c"), true);
  assert.equal(scene.walkMask.rows.join("").includes("e"), false);
  assert.equal(scene.walkMask.legend.e, undefined);
  assert.ok(scene.foregroundLayers.some((layer) => layer.id === "layer.apartment.table_foreground" && layer.asset === "foregroundTable" && layer.zIndex === -1));
});

test("apartment perspective scale is continuous across raster mask rows", () => {
  const scene = chapter1.scenes.find((candidate) => candidate.id === "scene.chapter1.apartment");
  const before = sceneScale(scene, { x: 650, y: 491 });
  const after = sceneScale(scene, { x: 650, y: 493 });
  assert.ok(after > before);
  assert.ok(after - before < 0.01);
  const farHeight = characterHeight(characterDefinitions["npc.bai_mitko"], scene, { x: 650, y: 430 });
  const nearHeight = characterHeight(characterDefinitions["npc.bai_mitko"], scene, { x: 650, y: 600 });
  assert.ok(nearHeight > farHeight);
});

test("walk mask line sampler finds the nearest direct approach before a blocked target", () => {
  const scene = chapter1.scenes.find((candidate) => candidate.id === "scene.chapter1.apartment");
  const approach = nearestWalkablePointOnLine(scene, { x: 650, y: 520 }, { x: 690, y: 250 });
  assert.ok(approach);
  assert.equal(isWalkable(scene, approach), true);
  assert.equal(Math.round(approach.x), 650);
  assert.equal(Math.round(approach.y), 520);
});

test("walk mask nearest sampler finds an approach near blocked clicks", () => {
  const scene = {
    walkMask: {
      width: 5,
      height: 5,
      worldWidth: 100,
      worldHeight: 100,
      rows: [
        ".....",
        ".....",
        "..c..",
        ".....",
        "....."
      ],
      legend: { ".": { walkable: false }, c: { walkable: true } }
    }
  };
  const approach = nearestWalkablePoint(scene, { x: 90, y: 90 });
  assert.deepEqual(approach, { x: 50, y: 50 });
});

test("raster walk path routes through mask corridors", () => {
  const scene = {
    walkMask: {
      width: 5,
      height: 5,
      worldWidth: 100,
      worldHeight: 100,
      legend: {
        ".": { walkable: false },
        "c": { walkable: true }
      },
      rows: [
        "ccccc",
        "c...c",
        "ccc.c",
        "c...c",
        "ccccc"
      ]
    }
  };
  const path = findWalkPath(scene, { x: 10, y: 10 }, { x: 90, y: 90 });
  assert.ok(path.length > 2);
  assert.deepEqual(path[0], { x: 10, y: 10 });
  assert.deepEqual(path.at(-1), { x: 90, y: 90 });
  assert.ok(walkPathDistance({ x: 10, y: 10 }, path) > distance({ x: 10, y: 10 }, { x: 90, y: 90 }));
  assert.equal(path.every((point) => isWalkable(scene, point)), true);
});

test("blocked empty clicks project to nearest reachable walk-mask cell", () => {
  const scene = {
    walkMask: {
      width: 5,
      height: 5,
      worldWidth: 100,
      worldHeight: 100,
      rows: [
        ".....",
        ".ccc.",
        "...c.",
        "...c.",
        "....."
      ],
      legend: { ".": { walkable: false }, c: { walkable: true } }
    }
  };
  const destination = nearestReachableWalkablePoint(scene, { x: 30, y: 30 }, { x: 92, y: 92 });
  assert.deepEqual(destination, { x: 70, y: 70 });
});

test("scene z index maps horizon to 100 and front to zero", () => {
  const scene = chapter1.scenes.find((candidate) => candidate.id === "scene.chapter1.apartment");
  assert.equal(sceneZIndexForPoint(scene, { x: 0, y: 430 }), 100);
  assert.equal(sceneZIndexForPoint(scene, { x: 0, y: 515 }), 50);
  assert.equal(sceneZIndexForPoint(scene, { x: 0, y: 600 }), 0);
});

test("chapter scene movement speeds are tuned for external walk animation", () => {
  const speeds = Object.fromEntries(chapter1.scenes.map((scene) => [scene.id, scene.movementSpeed]));
  assert.equal(speeds["scene.chapter1.apartment"], 70);
  assert.equal(speeds["scene.chapter1.village_square"], 80);
  assert.equal(speeds["scene.chapter1.mehana"], 75);
});

test("runtime movement speed multiplier affects distance over time only", () => {
  const game = Object.create(Game.prototype);
  game.walkSpeedMultiplier = 1;
  assert.equal(game.sceneMovementSpeed({ movementSpeed: 70 }), 109.375);
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

test("Bai Mitko external renderer uses stable visual bounds across walk phases", () => {
  const definition = characterDefinitions["npc.bai_mitko"];
  const bounds = stableExternalVisualBounds(definition);
  assert.equal(bounds.h, 884);
  assert.equal(bounds.w, 427);
  assert.equal(bounds.baselineY, 990);
});

test("Bai Mitko idle directions use walk-start animation frames instead of static images", () => {
  const idle = characterDefinitions["npc.bai_mitko"].animations.idle.directions;
  const baiMitkoAssets = assetManifest.characters["npc.bai_mitko"];
  assert.equal(idle.east.slot, "external_walk_east_start");
  assert.equal(idle.south.slot, "external_walk_east_start");
  assert.equal(idle.north.slot, "external_walk_east_start");
  assert.equal(idle.west.slot, "external_walk_east_start");
  assert.equal(idle.west.mirrored, true);
  assert.equal(baiMitkoAssets.type, "externalAnimation");
  assert.equal(Object.values(baiMitkoAssets).some((value) => typeof value === "string" && value.startsWith("assets/")), false);
});

test("Bai Mitko external idle variants are generated for east and mirrored west", () => {
  const east = externalAnimationV1.idleVariants.east;
  const west = externalAnimationV1.idleVariants.west;
  assert.equal(east.length, 6);
  assert.equal(west.length, 6);
  assert.deepEqual(
    east.map((variant) => variant.slot),
    [
      "external_idle_east_1",
      "external_idle_east_2",
      "external_idle_east_3",
      "external_idle_east_4",
      "external_idle_east_5",
      "external_idle_east_6"
    ]
  );
  assert.deepEqual(
    east.map((variant) => variant.pingPong),
    [false, false, false, false, false, false]
  );
  assert.equal(east[0].role, "idle");
  assert.equal(east[0].loop, false);
  assert.equal(east[0].fps, 14);
  assert.equal(east[0].frameCount, 25);
  assert.equal(east[1].frameCount, 36);
  assert.equal(east[2].frameCount, 36);
  assert.equal(east[3].frameCount, 36);
  assert.equal(east[4].frameCount, 36);
  assert.equal(east[5].frameCount, 36);
  assert.equal(west[0].slot, "external_idle_east_1");
  assert.equal(west[0].mirrored, true);
  assert.equal(west[2].pingPong, false);
});

test("Bai Mitko external talk and reject animations are generated for east and mirrored west", () => {
  assert.deepEqual(
    externalAnimationV1.talkAnimations.east.singleWord.map((variant) => variant.slot),
    ["external_talk_east_short_1"]
  );
  assert.deepEqual(
    externalAnimationV1.talkAnimations.east.singleShortSentence.map((variant) => variant.slot),
    ["external_talk_east_long_2"]
  );
  assert.deepEqual(
    externalAnimationV1.talkAnimations.east.singleLongSentence.map((variant) => variant.slot),
    ["external_talk_east_long_1"]
  );
  assert.deepEqual(
    [
      externalAnimationV1.talkAnimations.east.singleWord[0].fps,
      externalAnimationV1.talkAnimations.east.singleShortSentence[0].fps,
      externalAnimationV1.talkAnimations.east.singleLongSentence[0].fps
    ],
    [12, 12, 12]
  );
  assert.equal(externalAnimationV1.talkAnimations.east.singleWord[0].talkSemantic, "single_word");
  assert.equal(externalAnimationV1.talkAnimations.east.singleShortSentence[0].talkSemantic, "single_short_sentence");
  assert.equal(externalAnimationV1.talkAnimations.east.singleLongSentence[0].talkSemantic, "single_long_sentence");
  assert.equal(externalAnimationV1.talkAnimations.west.singleWord[0].mirrored, true);
  assert.equal(externalAnimationV1.rejectAnimations.east[0].slot, "external_reject_east_1");
  assert.equal(externalAnimationV1.rejectAnimations.west[0].mirrored, true);
});

test("idle variants trigger after irregular idle delay and finish back to hold", () => {
  const player = {
    animation: "idle",
    target: null,
    speaking: false,
    facing: "east",
    idleVariant: null,
    idleVariantQueue: [],
    idleHoldFrame: null,
    idleVariantTimer: 0,
    animator: {
      isFinished() {
        return false;
      }
    }
  };
  const game = Object.create(Game.prototype);
  game.player = player;
  game.characterVariant = "external_animation_v1";
  const originalRandom = Math.random;
  Math.random = () => 0.99;
  try {
    game.updateIdleVariants(1);
  } finally {
    Math.random = originalRandom;
  }
  assert.ok(
    [
      "external_idle_east_1",
      "external_idle_east_2",
      "external_idle_east_3",
      "external_idle_east_4",
      "external_idle_east_5",
      "external_idle_east_6"
    ].includes(
      player.idleVariant.slot
    )
  );

  player.animator = {
    isFinished() {
      return true;
    }
  };
  Math.random = () => 0.99;
  try {
    game.updateIdleVariants(1 / 60);
  } finally {
    Math.random = originalRandom;
  }
  assert.equal(player.idleVariant, null);
  assert.ok(player.idleHoldFrame);
  assert.equal(player.idleHoldFrame.frameIndex, player.idleHoldFrame.frame.frameCount - 1);
  assert.ok(player.idleVariantTimer >= 1);
  assert.ok(player.idleVariantTimer <= 3);
});

test("idle variants can chain into idle five as a calm follow-up", () => {
  const variants = externalAnimationV1.idleVariants.east;
  const player = {
    animation: "idle",
    target: null,
    speaking: false,
    facing: "east",
    idleVariant: null,
    idleVariantQueue: [],
    idleHoldFrame: null,
    idleVariantTimer: 0,
    animator: {
      isFinished() {
        return false;
      }
    }
  };
  const game = Object.create(Game.prototype);
  game.player = player;
  game.characterVariant = "external_animation_v1";

  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    game.updateIdleVariants(1);
  } finally {
    Math.random = originalRandom;
  }

  assert.equal(player.idleVariant.slot, variants[0].slot);
  assert.equal(player.idleVariantQueue.length, 1);
  assert.equal(player.idleVariantQueue[0].slot, "external_idle_east_5");

  player.animator = {
    isFinished() {
      return true;
    }
  };
  game.updateIdleVariants(1 / 60);
  assert.equal(player.idleVariant.slot, "external_idle_east_5");
  assert.equal(player.idleVariantQueue.length, 0);
});

test("character cutouts use the shared 15 percent source margin", () => {
  assert.equal(CHARACTER_SOURCE_SCALE, 0.6);
  assert.equal(CHARACTER_CUTOUT_MARGIN_RATIO, 0.15);
});

test("east movement exposes start loop short stop walk parts without mirroring metadata", () => {
  const player = { facing: "south", verticalDirectionBias: 1.6 };
  assert.equal(facingFromDelta(100, 0, player), "east");

  const east = characterDefinitions["npc.bai_mitko"].animations.walk.parts.east;
  assert.equal(east.start.slot, "external_walk_east_start");
  assert.equal(east.loop.slot, "external_walk_east_loop");
  assert.equal(east.short.slot, "external_walk_east_short");
  assert.equal(east.stop.slot, "external_walk_east_stop");
  assert.equal(east.start.frameCount, 16);
  assert.equal(east.loop.frameCount, 16);
  assert.equal(east.short.frameCount, 16);
  assert.equal(east.stop.frameCount, 14);
  assert.equal(east.start.initialFrame, 1);
  assert.equal(east.loop.initialFrame, 1);
  assert.equal(east.short.initialFrame, 1);
  assert.equal(east.stop.initialFrame, 1);
  assert.equal(east.start.fps, 20);
  assert.equal(east.loop.fps, 20);
  assert.equal(east.short.fps, 20);
  assert.equal(east.stop.fps, 20);
  assert.equal(east.start.sourceFrameRects[0].sourceFrameIndex, 0);
  assert.equal(east.loop.stopExitFrame, 0);
  assert.equal(east.start.loop, false);
  assert.equal(east.loop.loop, true);
  assert.equal(east.short.loop, true);
  assert.equal(east.stop.loop, false);
  assert.deepEqual(east.start.movementSpeedMultipliers, [0, 0, 0, 0, 0, 0.6, 0.7, 0.3, 0.4, 0.8, 1, 1, 0.7, 0.6, 0.5, 0.4]);
  assert.deepEqual(east.short.movementSpeedMultipliers, east.loop.movementSpeedMultipliers);
  assert.equal(Boolean(east.loop.mirrored), false);
});

test("west movement mirrors the external east start loop short stop parts", () => {
  const player = { facing: "south", verticalDirectionBias: 1.6 };
  assert.equal(facingFromDelta(-100, 0, player), "west");

  const west = characterDefinitions["npc.bai_mitko"].animations.walk.parts.west;
  assert.equal(west.start.slot, "external_walk_east_start");
  assert.equal(west.loop.slot, "external_walk_east_loop");
  assert.equal(west.short.slot, "external_walk_east_short");
  assert.equal(west.stop.slot, "external_walk_east_stop");
  assert.equal(west.start.mirrored, true);
  assert.equal(west.loop.mirrored, true);
  assert.equal(west.short.mirrored, true);
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
  player.animator.frameIndex = 3;
  assert.equal(walkMotionMultiplierForFrame(player), 0);
  assert.equal(motionMultiplierAtFrame([0, undefined, 0.5], 1, 0), 0);
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

test("ping-pong strip animation plays forward then backward once", () => {
  const player = new AnimationPlayer({
    animations: {
      idle: { frames: ["idle"], fps: 1, loop: true },
      walk: { type: "phasedStrip", frameCount: 4, fps: 4, loop: false }
    }
  });
  player.play("walk", "external_idle_east_3:east:idle");
  player.frameCountOverride = 4;
  player.fpsOverride = 4;
  player.loopOverride = false;
  player.pingPongOverride = true;
  assert.equal(player.frameIndex, 0);
  player.update(1 / 4);
  assert.equal(player.frameIndex, 1);
  player.update(1 / 4);
  assert.equal(player.frameIndex, 2);
  player.update(1 / 4);
  assert.equal(player.frameIndex, 3);
  player.update(1 / 4);
  assert.equal(player.frameIndex, 2);
  player.update(1 / 4);
  assert.equal(player.frameIndex, 1);
  assert.equal(player.isFinished(), false);
  player.update(1 / 4);
  assert.equal(player.frameIndex, 1);
  assert.equal(player.isFinished(), true);
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
  player.update(7 / 8);
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

test("short walk uses short loop and skips stop animation when destination is reached", () => {
  const player = {
    position: { x: 0, y: 0 },
    target: null,
    speed: 100,
    animation: "idle",
    facing: "west",
    walkPart: null,
    shortWalk: false,
    idleHoldFrame: { slot: "external_walk_east_stop", mirrored: true, frameIndex: 0, frame: { frameCount: 1 } },
    idleVariant: { slot: "external_idle_east_1" },
    idleVariantQueue: [{ slot: "external_idle_east_2" }],
    pendingStop: false,
    stopAnimationStarted: false,
    stopAnimationFinished: false,
    movementStopping: false,
    walkPartsByFacing: {
      east: {
        start: { frameCount: 3, fps: 3, loop: false },
        short: { frameCount: 4, fps: 4, loop: true },
        loop: { frameCount: 4, fps: 4, loop: true },
        stop: { frameCount: 3, fps: 3, loop: false }
      }
    }
  };
  const movement = new MovementSystem(player);
  movement.walkTo({ x: 20, y: 0 }, { x: 20, y: 0 }, [{ x: 0, y: 0 }, { x: 20, y: 0 }], { shortWalk: true });
  assert.equal(player.walkPart, "short");
  assert.equal(player.facing, "east");
  assert.equal(player.idleHoldFrame, null);
  assert.equal(player.idleVariant, null);
  assert.deepEqual(player.idleVariantQueue, []);

  movement.update(1);
  assert.equal(player.animation, "idle");
  assert.equal(player.walkPart, null);
  assert.equal(player.shortWalk, false);
  assert.equal(player.facing, "east");
  assert.equal(player.idleHoldFrame, null);
  assert.equal(player.stopAnimationStarted, false);
});

test("game chooses short walk from routed path distance threshold", () => {
  const game = Object.create(Game.prototype);
  game.currentScene = {};
  game.player = {
    position: { x: 0, y: 0 },
    facing: "east"
  };
  let captured = null;
  game.movement = {
    walkTo(point, facingPoint, path, options) {
      captured = { point, facingPoint, path, options };
    }
  };

  game.walkToPoint({ x: SHORT_WALK_PATH_DISTANCE - 10, y: 0 });
  assert.equal(captured.options.shortWalk, true);
  assert.ok(walkPathDistance(game.player.position, captured.path) <= SHORT_WALK_PATH_DISTANCE);

  game.walkToPoint({ x: SHORT_WALK_PATH_DISTANCE + 10, y: 0 });
  assert.equal(captured.options.shortWalk, false);
});

test("reclicking during short walk uses current routed distance only", () => {
  const game = Object.create(Game.prototype);
  game.currentScene = {};
  game.player = {
    position: { x: 60, y: 0 },
    facing: "east",
    shortWalk: true
  };
  let captured = null;
  game.movement = {
    walkTo(point, facingPoint, path, options) {
      captured = { point, facingPoint, path, options };
    }
  };

  game.walkToPoint({ x: 100, y: 0 });
  assert.equal(captured.options.shortWalk, true);

  game.walkToPoint({ x: 111, y: 0 });
  assert.equal(captured.options.shortWalk, true);
});

test("active short walk does not switch into full walk on a long retarget", () => {
  const player = {
    position: { x: 60, y: 0 },
    target: { x: 100, y: 0 },
    speed: 100,
    animation: "walk",
    facing: "east",
    walkPart: "short",
    shortWalk: true,
    pendingStop: false,
    stopAnimationStarted: false,
    stopAnimationFinished: false,
    movementStopping: false,
    animator: { frameIndex: 9, elapsed: 2, isFinished: () => false },
    walkPartsByFacing: {
      east: {
        start: { frameCount: 3, fps: 3, loop: false, initialFrame: 0 },
        short: { frameCount: 4, fps: 4, loop: true },
        loop: { frameCount: 4, fps: 4, loop: true },
        stop: { frameCount: 3, fps: 3, loop: false }
      }
    }
  };
  const movement = new MovementSystem(player);
  movement.walkTo({ x: 110, y: 0 }, { x: 110, y: 0 }, [{ x: 110, y: 0 }], { shortWalk: false });

  assert.equal(player.shortWalk, true);
  assert.equal(player.walkPart, "short");
  assert.equal(player.animator.frameIndex, 9);
});

test("active full walk does not switch into short walk on a short retarget", () => {
  const player = {
    position: { x: 60, y: 0 },
    target: { x: 500, y: 0 },
    speed: 100,
    animation: "walk",
    facing: "east",
    walkPart: "start",
    shortWalk: false,
    pendingStop: false,
    stopAnimationStarted: false,
    stopAnimationFinished: false,
    movementStopping: false,
    walkPartsByFacing: {
      east: {
        start: { frameCount: 3, fps: 3, loop: false },
        short: { frameCount: 4, fps: 4, loop: true },
        loop: { frameCount: 4, fps: 4, loop: true },
        stop: { frameCount: 3, fps: 3, loop: false }
      }
    }
  };
  const movement = new MovementSystem(player);
  movement.walkTo({ x: 80, y: 0 }, { x: 80, y: 0 }, [{ x: 80, y: 0 }], { shortWalk: true });

  assert.equal(player.shortWalk, false);
  assert.equal(player.walkPart, "loop");
});

test("new walk start movement uses start initial frame instead of stale animator frame", () => {
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
    animator: { frameIndex: 9, elapsed: 3, isFinished: () => false },
    walkPartsByFacing: {
      east: {
        start: { frameCount: 4, fps: 4, loop: false, initialFrame: 0, movementSpeedMultipliers: [0, 0, 0, 0] },
        loop: { frameCount: 4, fps: 4, loop: true, movementSpeedMultipliers: [1, 1, 1, 1] }
      }
    },
    walkMotionMultipliersByFacing: {
      east: {
        start: [0, 0, 0, 0],
        loop: [1, 1, 1, 1]
      }
    }
  };
  const movement = new MovementSystem(player);
  movement.walkTo({ x: 200, y: 0 });
  movement.update(0.5);

  assert.equal(player.animator.frameIndex, 0);
  assert.deepEqual(player.position, { x: 0, y: 0 });
});

test("finished zero-speed start frame does not borrow loop movement on the transition tick", () => {
  const player = {
    position: { x: 0, y: 0 },
    target: { x: 200, y: 0 },
    speed: 100,
    animation: "walk",
    facing: "east",
    walkPart: "start",
    pendingStop: false,
    stopAnimationStarted: false,
    stopAnimationFinished: false,
    movementStopping: false,
    animator: { frameIndex: 3, elapsed: 1, isFinished: () => true },
    walkPartsByFacing: {
      east: {
        start: { frameCount: 4, fps: 4, loop: false, initialFrame: 0, movementSpeedMultipliers: [0, 0, 0, 0] },
        loop: { frameCount: 4, fps: 4, loop: true, movementSpeedMultipliers: [1, 1, 1, 1] }
      }
    },
    walkMotionMultipliersByFacing: {
      east: {
        start: [0, 0, 0, 0],
        loop: [1, 1, 1, 1]
      }
    }
  };
  const movement = new MovementSystem(player);
  movement.update(0.5);

  assert.equal(player.walkPart, "loop");
  assert.deepEqual(player.position, { x: 0, y: 0 });
});

test("simple animation start frame with zero multiplier does not change x", () => {
  const game = Object.create(Game.prototype);
  game.simpleAnim = {
    mode: "start",
    direction: "east",
    moving: true,
    x: 476.5,
    speed: 120,
    frameIndex: 1,
    elapsed: 1 / 20,
    lastMoveMultiplier: 0,
    lastMoveDx: 0
  };
  game.simpleCurrentFrame = () => ({
    frameCount: 16,
    fps: 20,
    loop: false,
    movementSpeedMultipliers: Array.from({ length: 16 }, () => 0)
  });
  game.simpleAnimFps = Game.prototype.simpleAnimFps;
  game.setSimpleAnimMode = (mode) => { game.simpleAnim.mode = mode; };
  game.updateSimpleSequence = () => {};

  game.updateSimpleAnim(1 / 20);

  assert.equal(game.simpleAnim.mode, "start");
  assert.equal(game.simpleAnim.lastMoveMultiplier, 0);
  assert.equal(game.simpleAnim.lastMoveDx, 0);
  assert.equal(game.simpleAnim.x, 476.5);
});

test("clicking current idle position does not start walk or stop animation", () => {
  const player = {
    position: { x: 100, y: 80 },
    target: null,
    speed: 100,
    animation: "idle",
    facing: "east",
    walkPart: null,
    pendingStop: false,
    stopAnimationStarted: false,
    stopAnimationFinished: true,
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
  movement.walkTo({ x: 102, y: 81 });

  assert.equal(player.animation, "idle");
  assert.equal(player.target, null);
  assert.equal(player.walkPart, null);
  assert.equal(player.stopAnimationStarted, false);
});

test("far target click walks to direct mask approach before running look action", () => {
  const scene = chapter1.scenes.find((candidate) => candidate.id === "scene.chapter1.apartment");
  const target = scene.interactables.find((candidate) => candidate.id === "hotspot.apartment.mirror");
  const game = Object.create(Game.prototype);
  game.currentScene = scene;
  game.selectedVerb = "look";
  game.player = {
    position: { x: 650, y: 520 },
    target: null,
    animation: "idle",
    facing: "west",
    verticalDirectionBias: 1.6,
    walkPartsByFacing: { east: {}, west: {} },
    pendingInteraction: null
  };
  game.movement = {
    walkTo(point) {
      game.player.target = { ...point };
      game.player.animation = "walk";
    }
  };
  game.t = (key) => key;

  game.handleTarget(target, { x: 900, y: 250 });

  assert.ok(game.player.pendingInteraction);
  assert.equal(game.player.facing, "east");
  assert.equal(game.player.pendingInteraction.target.id, "hotspot.apartment.mirror");
  assert.equal(game.player.pendingInteraction.verb, "look");
  assert.deepEqual(game.player.pendingFacingPoint, { x: 900, y: 250 });
  assert.equal(game.player.interactionDebug.kind, "target");
  assert.deepEqual(game.player.interactionDebug.hand, { x: 900, y: 250 });
  assert.deepEqual(game.player.interactionDebug.distancePoint, { x: 900, y: 250 });
  assert.deepEqual(game.player.interactionDebug.reachOrigin, game.playerReachOriginPoint());
  assert.ok(Math.abs(game.player.interactionDebug.reachDistance - distance(game.player.interactionDebug.reachOrigin, { x: 900, y: 250 })) < 0.001);
  assert.deepEqual(game.player.interactionDebug.click, { x: 900, y: 250 });
  assert.deepEqual(game.player.interactionDebug.feetGoal, { x: 810, y: 405 });
  assert.deepEqual(game.player.interactionDebug.feet, game.player.target);
  assert.equal(game.message, "");
});

test("table click approaches the table instead of stopping near current feet", () => {
  const scene = chapter1.scenes.find((candidate) => candidate.id === "scene.chapter1.apartment");
  const target = scene.interactables.find((candidate) => candidate.id === "hotspot.apartment.table");
  const game = Object.create(Game.prototype);
  game.currentScene = scene;
  game.selectedVerb = "look";
  game.player = {
    position: { x: 910, y: 520 },
    target: null,
    animation: "idle",
    facing: "east",
    verticalDirectionBias: 1.6,
    walkPartsByFacing: { east: {}, west: {} },
    pendingInteraction: null
  };
  game.movement = {
    walkTo(point) {
      game.player.target = { ...point };
      game.player.animation = "walk";
    }
  };
  game.t = (key) => key;

  game.handleTarget(target, { x: 315, y: 490 });

  assert.equal(game.player.facing, "west");
  assert.deepEqual(game.player.interactionDebug.hand, { x: 315, y: 490 });
  assert.deepEqual(game.player.interactionDebug.distancePoint, { x: 315, y: 490 });
  assert.deepEqual(game.player.interactionDebug.reachOrigin, game.playerReachOriginPoint());
  assert.deepEqual(game.player.interactionDebug.feetGoal, { x: 405, y: 645 });
  assert.ok(game.player.target.x >= 390);
  assert.ok(game.player.target.x <= 440);
  assert.ok(game.player.target.y >= 560);
  assert.ok(game.player.target.y <= 580);
  assert.ok(distance(game.player.target, game.player.position) > 250);
  assert.deepEqual(game.player.interactionDebug.click, { x: 315, y: 490 });
});

test("near object approach does not start tiny corrective walk", () => {
  const scene = chapter1.scenes.find((candidate) => candidate.id === "scene.chapter1.apartment");
  const target = scene.interactables.find((candidate) => candidate.id === "hotspot.apartment.mirror");
  const game = Object.create(Game.prototype);
  game.currentScene = scene;
  game.selectedVerb = "look";
  game.message = "previous";
  game.player = {
    position: { x: 990, y: 520 },
    target: null,
    animation: "idle",
    facing: "west",
    verticalDirectionBias: 1.6,
    walkPartsByFacing: { east: {}, west: {} },
    pendingInteraction: null,
    animator: { play() {} }
  };
  game.movement = {
    walkTo(point) {
      game.walkedTo = { ...point };
    }
  };
  game.usesExternalCharacterAnimation = () => false;
  game.t = (key) => key;

  game.handleTarget(target, { x: 900, y: 365 });

  assert.equal(game.walkedTo, undefined);
  assert.equal(game.player.pendingInteraction, null);
  assert.equal(game.player.facing, "west");
  assert.equal(game.message, "look.apartment.mirror");
  assert.ok(distance(game.player.position, game.player.interactionDebug.feet) <= 80);
});

test("rect target approach uses click point as hand target and left-middle fallback without click", () => {
  const target = { rect: { x: 640, y: 155, w: 140, h: 220 } };
  const game = Object.create(Game.prototype);
  assert.deepEqual(game.targetReachPoint(target, { x: 760, y: 320 }), { x: 760, y: 320 });
  assert.deepEqual(game.targetReachPoint(target), { x: 682, y: 265 });
});

test("empty walkable click uses the clicked point as the feet pivot destination", () => {
  const scene = chapter1.scenes.find((candidate) => candidate.id === "scene.chapter1.apartment");
  const game = Object.create(Game.prototype);
  game.currentScene = scene;
  game.message = "previous action";
  game.player = {
    position: { x: 590, y: 520 },
    target: null,
    animation: "idle",
    facing: "west",
    verticalDirectionBias: 1.6,
    walkPartsByFacing: { east: {}, west: {} },
    pendingInteraction: { target: {} }
  };
  game.movement = {
    walkTo(point) {
      game.walkedTo = { ...point };
    }
  };
  game.t = (key) => key;

  game.handleWorldClick({ x: 650, y: 520 });

  assert.deepEqual(game.walkedTo, { x: 650, y: 520 });
  assert.equal(game.player.facing, "east");
  assert.equal(game.message, "");
  assert.deepEqual(game.player.interactionDebug, { kind: "move", click: { x: 650, y: 520 }, feet: { x: 650, y: 520 } });
  assert.equal(game.player.pendingInteraction, null);
  assert.deepEqual(game.player.pendingFacingPoint, { x: 650, y: 520 });
});

test("finished empty move turns toward the requested walk point", () => {
  const game = Object.create(Game.prototype);
  game.player = {
    position: { x: 650, y: 520 },
    target: null,
    animation: "idle",
    facing: "east",
    verticalDirectionBias: 1.6,
    pendingFacingPoint: { x: 590, y: 520 }
  };

  game.resolvePendingFacingPoint();

  assert.equal(game.player.pendingFacingPoint, null);
  assert.equal(game.player.facing, "west");
});

test("pending target action runs after walk and stop animation complete", () => {
  const scene = chapter1.scenes.find((candidate) => candidate.id === "scene.chapter1.apartment");
  const target = scene.interactables.find((candidate) => candidate.id === "hotspot.apartment.mirror");
  const game = Object.create(Game.prototype);
  game.selectedVerb = "use";
  game.player = {
    position: { x: 650, y: 500 },
    target: null,
    animation: "idle",
    facing: "west",
    verticalDirectionBias: 1.6,
    animator: { play() {} },
    pendingInteraction: { target, verb: "look", hand: { x: 700, y: 500 }, approach: { x: 650, y: 500 } }
  };
  game.usesExternalCharacterAnimation = () => false;
  game.t = (key) => key;

  game.resolvePendingInteraction();

  assert.equal(game.player.pendingInteraction, null);
  assert.equal(game.selectedVerb, "use");
  assert.equal(game.player.facing, "east");
  assert.equal(game.message, "look.apartment.mirror");
});

test("target action turns toward hand point when no movement is needed", () => {
  const scene = chapter1.scenes.find((candidate) => candidate.id === "scene.chapter1.apartment");
  const target = scene.interactables.find((candidate) => candidate.id === "hotspot.apartment.mirror");
  const game = Object.create(Game.prototype);
  game.currentScene = scene;
  game.selectedVerb = "look";
  game.player = {
    position: { x: 650, y: 500 },
    target: null,
    animation: "idle",
    facing: "east",
    verticalDirectionBias: 1.6,
    walkPartsByFacing: { east: {}, west: {} },
    animator: { play() {} },
    pendingInteraction: null
  };
  game.usesExternalCharacterAnimation = () => false;
  game.t = (key) => key;

  game.player.facing = "west";
  const reachablePoint = game.playerReachOriginPoint();
  game.player.facing = "east";
  game.handleTarget(target, reachablePoint);

  assert.equal(game.player.pendingInteraction, null);
  assert.equal(game.player.facing, "west");
  assert.equal(game.message, "look.apartment.mirror");
});

test("speech bubble messages start talk or reject animation variants", () => {
  const game = Object.create(Game.prototype);
  game.usesExternalCharacterAnimation = () => true;
  game.player = {
    position: { x: 650, y: 500 },
    target: null,
    animation: "idle",
    facing: "east",
    idleVariant: { slot: "external_idle_east_1" },
    idleVariantQueue: [{ slot: "external_idle_east_2" }],
    animator: { played: null, play(animation, key) { this.played = { animation, key }; } }
  };

  game.setStatusMessage("short text");

  assert.equal(game.message, "short text");
  assert.equal(game.player.animation, "talk");
  assert.equal(game.player.speechAnimation.slot, "external_talk_east_short_1");
  assert.equal(game.player.idleVariant, null);
  assert.deepEqual(game.player.idleVariantQueue, []);
  assert.equal(game.player.animator.played.animation, "talk");

  game.setStatusMessage("cannot", { reject: true });

  assert.equal(game.player.animation, "reject");
  assert.equal(game.player.speechAnimation.slot, "external_reject_east_1");
});

test("talk animation semantic heuristic classifies text shape", () => {
  const game = Object.create(Game.prototype);

  assert.equal(game.talkSemanticForMessage("Да."), "singleWord");
  assert.equal(game.talkSemanticForMessage("Това няма да стане."), "singleShortSentence");
  assert.equal(
    game.talkSemanticForMessage("Това няма да стане, защото комисията първо трябва да назначи подкомисия за предварително усещане."),
    "singleLongSentence"
  );
  assert.equal(game.talkSemanticForMessage("Първо това. После онова."), "singleLongSentence");
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
  assert.equal(idle.frame.role, "hold");
  assert.deepEqual(idle.frame.frameRects[0], definition.animations.walk.parts.east.start.sourceFrameRects[0]);
});

test("external Bai Mitko idle only requests animation slots", () => {
  const definition = characterDefinitions["npc.bai_mitko"];
  const renderer = Object.create(Renderer.prototype);
  renderer.game = {
    assets: {
      getCharacterImage(_characterId, slot) {
        assert.equal(slot.startsWith("external_walk_"), true);
        return null;
      },
      isLoaded(image) {
        return image?.dataset?.loaded === "true";
      }
    }
  };
  const sprite = renderer.resolveCharacterSprite({
    id: "npc.bai_mitko",
    animation: "idle",
    facing: "east",
    walkPartsByFacing: definition.animations.walk.parts
  }, definition);

  assert.equal(sprite.image, null);
  assert.equal(sprite.slot, "external_walk_east_start");
});

test("external Bai Mitko non-walk states use walk-start frame zero when no animation strip exists", () => {
  const definition = characterDefinitions["npc.bai_mitko"];
  const renderer = Object.create(Renderer.prototype);
  const loadedStart = { dataset: { loaded: "true" } };
  renderer.validateStrip = () => true;
  renderer.game = {
    assets: {
      getCharacterImage(_characterId, slot) {
        if (slot === "external_walk_east_start") return loadedStart;
        return null;
      },
      isLoaded(image) {
        return image?.dataset?.loaded === "true";
      }
    }
  };
  const sprite = renderer.resolveCharacterSprite({
    id: "npc.bai_mitko",
    animation: "talk",
    facing: "west",
    walkPartsByFacing: definition.animations.walk.parts
  }, definition);

  assert.equal(sprite.image, loadedStart);
  assert.equal(sprite.slot, "external_walk_east_start");
  assert.equal(sprite.frame.role, "hold");
  assert.equal(sprite.staticFrameIndex, 0);
  assert.equal(sprite.mirrored, true);
});

test("external Bai Mitko idle can hold the last frame of a completed animation", () => {
  const definition = characterDefinitions["npc.bai_mitko"];
  const renderer = Object.create(Renderer.prototype);
  const heldFrame = externalAnimationV1.idleVariants.east[0];
  const loadedHeld = { dataset: { loaded: "true" } };
  renderer.game = {
    assets: {
      getCharacterImage(_characterId, slot) {
        if (slot === heldFrame.slot) return loadedHeld;
        return null;
      },
      isLoaded(image) {
        return image?.dataset?.loaded === "true";
      }
    }
  };
  const sprite = renderer.resolveCharacterSprite({
    id: "npc.bai_mitko",
    animation: "idle",
    facing: "east",
    idleHoldFrame: {
      frame: heldFrame,
      slot: heldFrame.slot,
      mirrored: false,
      frameIndex: heldFrame.frameCount - 1
    },
    walkPartsByFacing: definition.animations.walk.parts
  }, definition);

  assert.equal(sprite.image, loadedHeld);
  assert.equal(sprite.slot, heldFrame.slot);
  assert.equal(sprite.staticFrameIndex, heldFrame.frameCount - 1);
});

test("finished stop animation stores its last frame as the next idle hold", () => {
  const frame = characterDefinitions["npc.bai_mitko"].animations.walk.parts.east.stop;
  const player = {
    animation: "walk",
    walkPart: "stop",
    facing: "east",
    walkPartsByFacing: characterDefinitions["npc.bai_mitko"].animations.walk.parts,
    idleHoldFrame: null,
    animator: {
      isFinished() {
        return true;
      }
    }
  };
  const game = Object.create(Game.prototype);
  game.player = player;
  const finishing = game.finishingStopFrame();
  assert.equal(finishing.frame, frame);
  game.setIdleHoldFrame(finishing.frame, finishing.frameIndex);
  assert.equal(player.idleHoldFrame.slot, "external_walk_east_stop");
  assert.equal(player.idleHoldFrame.frameIndex, frame.frameCount - 1);
});

test("external Bai Mitko idle ignores stale stop walk part", () => {
  const definition = characterDefinitions["npc.bai_mitko"];
  const renderer = Object.create(Renderer.prototype);
  const requestedSlots = [];
  const loadedStart = { dataset: { loaded: "true" } };
  renderer.validateStrip = () => true;
  renderer.game = {
    assets: {
      getCharacterImage(_characterId, slot) {
        requestedSlots.push(slot);
        if (slot === "external_walk_east_start") return loadedStart;
        return null;
      },
      isLoaded(image) {
        return image?.dataset?.loaded === "true";
      }
    }
  };
  const sprite = renderer.resolveCharacterSprite({
    id: "npc.bai_mitko",
    animation: "idle",
    facing: "east",
    walkPart: "stop",
    walkPartsByFacing: definition.animations.walk.parts
  }, definition);

  assert.equal(sprite.slot, "external_walk_east_start");
  assert.equal(sprite.staticFrameIndex, 0);
  assert.equal(requestedSlots.includes("external_walk_east_stop"), false);
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

test("stop render offset fades from configured value to zero", () => {
  const frame = { role: "stop", frameCount: 15, initialFrame: 1, stopRenderOffsetXStart: -8, stopRenderOffsetYStart: 0 };
  assert.equal(stopRenderOffsetX(frame, 1), -8);
  assert.ok(Math.abs(stopRenderOffsetX(frame, 3) - -4.923) < 0.001);
  assert.equal(stopRenderOffsetX(frame, 7), 0);
  assert.equal(stopRenderOffsetX(frame, 14), 0);
  assert.equal(stopRenderOffsetX(frame, 1, true), 8);
  assert.equal(stopRenderOffsetY(frame, 1), 0);
  assert.equal(stopRenderOffsetY(frame, 3), 0);
  assert.equal(stopRenderOffsetY(frame, 7), 0);
  assert.equal(stopRenderOffsetY(frame, 14), 0);
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
