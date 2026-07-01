import test from "node:test";
import assert from "node:assert/strict";
import { Localization } from "../src/engine/Localization.js";
import { SaveSystem } from "../src/engine/SaveSystem.js";
import { pointInPolygon, isWalkable } from "../src/engine/SceneGeometry.js";
import { DEFAULT_SAVE } from "../src/engine/ids.js";
import { characterHeight } from "../src/engine/CharacterRenderMath.js";
import { eastWestFallbackFacing, facingFromDelta, MovementSystem } from "../src/engine/MovementSystem.js";
import { AnimationPlayer } from "../src/engine/AnimationPlayer.js";
import { strings } from "../src/content/localization/index.js";
import { chapter1 } from "../src/content/chapter1/index.js";
import { characterDefinitions } from "../src/content/art/characters.js";
import { makePng } from "../tools/character-frame-utils.mjs";
import { chromaKeyGreenToAlpha, externalWalkMotionCurve } from "../tools/external-animation-utils.mjs";

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

test("east movement exposes start loop stop walk parts without mirroring metadata", () => {
  const player = { facing: "south", verticalDirectionBias: 1.6 };
  assert.equal(facingFromDelta(100, 0, player), "east");

  const east = characterDefinitions["npc.bai_mitko"].animations.walk.parts.east;
  assert.equal(east.start.slot, "external_walk_east_start");
  assert.equal(east.loop.slot, "external_walk_east_loop");
  assert.equal(east.stop.slot, "external_walk_east_stop");
  assert.equal(east.start.frameCount, 4);
  assert.equal(east.loop.frameCount, 16);
  assert.equal(east.stop.frameCount, 4);
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

test("external walk start ramps slowly and loop uses foot-push pulses", () => {
  const start = externalWalkMotionCurve("start", 9);
  assert.equal(start[0], 0);
  assert.ok(start[1] < start[4]);
  assert.ok(start[4] < 0.2);
  assert.ok(start[6] > start[5] * 1.4);
  assert.equal(start.at(-1), 1);

  const loop = externalWalkMotionCurve("loop", 16);
  assert.ok(loop[2] > 1.6);
  assert.ok(loop[2] < 1.9);
  assert.ok(loop[10] > 1.6);
  assert.ok(loop[10] < 1.9);
  assert.ok(loop[6] > 0.35);
  assert.ok(loop[6] < 0.55);
  assert.ok(loop[14] > 0.35);
  assert.ok(loop[14] < 0.55);
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

test("loop animation starts at frame zero and wraps full length", () => {
  const player = new AnimationPlayer({
    animations: {
      idle: { frames: ["idle"], fps: 1, loop: true },
      walk: { type: "phasedStrip", frameCount: 16, fps: 8, loop: true }
    }
  });
  player.frameCountOverride = 16;
  player.fpsOverride = 8;
  player.loopOverride = true;
  player.initialFrameOverride = 0;
  player.play("walk", "external_walk_east_loop:east:loop");
  assert.equal(player.frameIndex, 0);
  player.update(16 / 8);
  assert.equal(player.frameIndex, 0);
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

test("movement stop phase enters once and can finish into idle", () => {
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
    animation: "idle",
    facing: "east",
    walkPart: null,
    walkPartsByFacing: {
      east: {
        start: { frameCount: 3, fps: 3, loop: false },
        loop: { frameCount: 4, fps: 4, loop: true },
        stop: { frameCount: 3, fps: 3, loop: false }
      }
    },
    animator
  };
  const movement = new MovementSystem(player);
  movement.walkTo({ x: 1, y: 0 });
  animator.play("walk", "external_walk_east_start:east:start");
  animator.frameCountOverride = 3;
  animator.fpsOverride = 3;
  animator.loopOverride = false;
  movement.update(1);
  assert.equal(player.walkPart, "stop");
  assert.equal(player.stopAnimationStarted, true);

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
