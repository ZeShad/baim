import test from "node:test";
import assert from "node:assert/strict";
import { MovementSystem, centreFacingAtArrival } from "../src/engine/MovementSystem.js";
import { characterDefinitions } from "../src/content/art/characters.js";
import { Game } from "../src/engine/Game.js";
const parts = characterDefinitions["npc.bai_mitko"].animations.walk.parts;
function setup(x = 400, facing = "east") {
  const p = { position: { x, y: 500 }, facing, speed: 100, animation: "idle",
    walkPartsByFacing: parts, animator: { frameIndex: 0, isFinished: () => false } };
  return [p, new MovementSystem(p)];
}
function arrive(p, m, destination, path = null, options = {}) {
  assert.equal(m.walkTo(destination, destination, path, { sceneCentreX: 640, ...options }), true);
  p.walkPart = "loop"; // Already out of pockets; test arrival independently of start art.
  for (let i = 0; i < 2000 && p.target; i++) m.update(.02);
  assert.equal(p.target, null); assert.deepEqual(p.position, destination);
}
for (const x of [400, 900]) for (const dy of [-100, 100, -5, 5, -400, 400]) {
  test(`vertical arrival x=${x} dy=${dy}: switches to centre-facing pocket rest at exact feet`, () => {
    const [p, m] = setup(x); arrive(p, m, { x, y: 500 + dy });
    const side = x < 640 ? "east" : "west";
    assert.equal(p.lastLocomotionFacing, dy < 0 ? "north" : "south");
    assert.equal(p.facing, side); assert.equal(p.animation, "idle");
    assert.equal(p.walkPart, null); assert.equal(p.directionalStopFrame, null);
    assert.equal(p.idleHoldFrame.frame, parts[side].stop);
    assert.equal(p.idleHoldFrame.frameIndex, 13);
    const held = p.idleHoldFrame; m.update(.05); assert.equal(p.idleHoldFrame, held);
  });
}
for (const facing of ["east", "west", "north"]) {
  test(`exact centre remembers ${facing}; otherwise deterministic east fallback`, () => {
    const [p, m] = setup(640, facing); arrive(p, m, { x: 640, y: 600 });
    assert.equal(p.facing, facing === "west" ? "west" : "east");
    arrive(p, m, { x: 640, y: 500 });
    assert.equal(p.facing, facing === "west" ? "west" : "east");
  });
}
test("near-centre repeated stops select by logical final feet, without idle-frame chatter", () => {
  const [p, m] = setup(639.99);
  for (const [x, side] of [[639.99, "east"], [640.01, "west"], [639.99, "east"]]) {
    arrive(p, m, { x, y: p.position.y === 500 ? 600 : 500 });
    assert.equal(p.facing, side);
    for (let i = 0; i < 10; i++) { m.update(.05); assert.equal(p.facing, side); }
  }
});
test("only final actual facing counts: vertical earlier node then horizontal stop remains published stop", () => {
  const [p, m] = setup(900);
  arrive(p, m, { x: 1000, y: 400 }, [{ x: 900, y: 400 }, { x: 1000, y: 400 }]);
  assert.equal(p.facing, "east"); assert.equal(p.walkPart, "stop"); assert.equal(p.idleHoldFrame, null);
});
test("side earlier node then final vertical segment selects centre rest; diagonal side stop stays side", () => {
  const [p, m] = setup(900);
  arrive(p, m, { x: 1000, y: 400 }, [{ x: 1000, y: 500 }, { x: 1000, y: 400 }]);
  assert.equal(p.facing, "west");
  arrive(p, m, { x: 1100, y: 450 });
  assert.equal(p.lastLocomotionFacing, "east"); assert.equal(p.walkPart, "stop");
});
for (const override of [ { arrivalFacing: "west" }, { pendingInteraction: {} },
  { pendingFacingPoint: { x: 100, y: 100 } }, { speaking: true }, { actionSequence: {} }, { actionAnimation: {} } ]) {
  test(`interaction/action priority suppresses centre default: ${Object.keys(override)[0]}`, () => {
    const [p, m] = setup(400);
    Object.assign(p, override);
    arrive(p, m, { x: 400, y: 600 }, null, override.arrivalFacing ? override : {});
    assert.equal(p.idleHoldFrame, null);
    assert.equal(p.facing, override.arrivalFacing || "south");
  });
}
test("no-op and cancellation cannot manufacture a centre-facing stop", () => {
  const [p, m] = setup(900, "north");
  assert.equal(m.walkTo({ ...p.position }, null, null, { sceneCentreX: 640 }), false);
  m.update(.05); assert.equal(p.facing, "north");
  m.walkTo({ x: 900, y: 600 }, null, null, { sceneCentreX: 640 });
  p.target = null; p.walkPath = []; m.update(.05); assert.equal(p.facing, "south");
});
test("retarget at arrival and immediate vertical restart clear held side pose; no late completion", () => {
  const [p, m] = setup(900); arrive(p, m, { x: 900, y: 600 });
  assert.ok(p.idleHoldFrame); m.walkTo({ x: 900, y: 400 }, null, null, { sceneCentreX: 640 });
  assert.equal(p.facing, "north"); assert.equal(p.walkPart, "loop"); assert.equal(p.idleHoldFrame, null);
  m.update(.02); assert.equal(p.facing, "north"); assert.ok(p.target);
  const elapsed = p.walkTravelElapsed;
  m.walkTo({ x: 900, y: 300 }, null, null, { sceneCentreX: 640 });
  assert.equal(p.walkTravelElapsed, elapsed); assert.equal(p.walkPart, "loop");
});
test("missing stop art chooses deterministic side without queued replay", () => {
  const [p, m] = setup(900); p.walkPartsByFacing = { ...parts, west: { ...parts.west, stop: undefined } };
  arrive(p, m, { x: 900, y: 600 }); assert.equal(p.facing, "west"); assert.equal(p.idleHoldFrame, null);
  p.walkPartsByFacing = parts; m.update(.05); assert.equal(p.walkPart, null); assert.equal(p.idleHoldFrame, null);
});
test("centre width is per-scene logical geometry, not global browser width", () => {
  const [p, m] = setup(900); arrive(p, m, { x: 900, y: 600 }, null, { sceneCentreX: 1000 });
  assert.equal(p.facing, "east");
  assert.equal(centreFacingAtArrival({ ...p, lastLocomotionFacing: "south", arrivalSceneCentreX: 640 }), "west");
});
test("ordinary free click clears old facing point so an unreachable click direction cannot swivel rest", () => {
  const g = Object.create(Game.prototype);
  g.player = { pendingInteraction: {}, pendingFacingPoint: {} }; g.currentScene = { walkPolygons: [] };
  g.sceneTargetAt = () => null; g.walkToPoint = () => true; g.clearStatusMessage = () => {};
  g.handleWorldClick({ x: 400, y: 500 });
  assert.equal(g.player.pendingFacingPoint, null); assert.equal(g.player.pendingInteraction, null);
});
