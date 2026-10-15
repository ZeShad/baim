import test from "node:test";
import assert from "node:assert/strict";
import { characterDefinitions } from "../src/content/art/characters.js";
import { facingFromDelta, walkPartsForFacing, walkMotionMultiplierForFrame, MovementSystem, requestWalkStop, walkingTravelSpeed } from "../src/engine/MovementSystem.js";
import { Renderer } from "../src/engine/Renderer.js";
import { Game } from "../src/engine/Game.js";

const definition = characterDefinitions["npc.bai_mitko"];
const parts = definition.animations.walk.parts;
function player(facing) {
  return { facing, position: { x: 500, y: 500 }, speed: 100, animation: "walk", walkPart: "loop",
    walkPartsByFacing: parts, animator: { frameIndex: 6, isFinished: () => false },
    walkMotionMultipliersByFacing: Object.fromEntries(Object.entries(parts).map(([f,p]) => [f,{loop:p.loop.movementSpeedMultipliers}])) };
}
test("vertical walk resolves genuine corresponding strips while diagonals retain side art", () => {
  for (const [dx,dy,expected] of [[0,-100,"north"],[0,100,"south"],[100,0,"east"],[-100,0,"west"]]) {
    const p=player("east");p.facing=facingFromDelta(dx,dy,p);
    assert.equal(p.facing,expected);assert.equal(walkPartsForFacing(p),parts[expected]);
    assert.equal(Game.prototype.currentAnimationFrame.call({player:p}),parts[expected].loop);
  }
  for(const [f,expected] of [["north_east","east"],["south_east","east"],["north_west","west"],["south_west","west"]]) assert.equal(walkPartsForFacing(player(f)),parts[expected]);
});
test("direction changes near vertical boundaries have a dead band", () => {
  const p=player("north");
  const delta=angle=>[Math.cos(angle*Math.PI/180)*100,Math.sin(angle*Math.PI/180)*100];
  p.facing=facingFromDelta(...delta(-65),p);assert.equal(p.facing,"north");
  p.facing=facingFromDelta(...delta(-60),p);assert.equal(p.facing,"north_east");
  p.facing=facingFromDelta(...delta(-70),p);assert.equal(p.facing,"north_east");
  p.facing=facingFromDelta(...delta(-80),p);assert.equal(p.facing,"north");
});
test("directional brisk travel follows visual scale and speed controls without changing side speed", () => {
  const p=player("north");p.walkVisualHeight=300;p.directionalSpeedScale=1;
  const near=walkingTravelSpeed(p);assert.ok(near>60&&near<180);
  p.walkVisualHeight=150;assert.equal(walkingTravelSpeed(p),near/2);
  p.directionalSpeedScale=2;assert.equal(walkingTravelSpeed(p),near);
  p.facing="east";assert.equal(walkingTravelSpeed(p),100);
});
test("interaction facing changes discard directional resting and idle pool state", () => {
  for(const [from,point,to] of [["north",{x:650,y:500},"east"],["south",{x:500,y:350},"north"],["east",{x:500,y:650},"south"]]){
    const p=player(from);p.idleHoldFrame={frame:parts.north.loop};p.idleVariant={slot:"old-side-idle"};p.idleVariantQueue=[{}];p.directionalStopFrame={};
    Game.prototype.facePoint.call({player:p},point);
    assert.equal(p.facing,to);assert.equal(p.idleHoldFrame,null);assert.equal(p.idleVariant,null);assert.deepEqual(p.idleVariantQueue,[]);assert.equal(p.directionalStopFrame,null);
  }
});
for(const facing of ["north","south"]) {
  test(facing+" native timing, resting pose and directional motion curve resolve together",()=>{
    const p=player(facing),loop=parts[facing].loop;
    assert.equal(loop.frameCount,facing==="north"?36:16);assert.equal(loop.fps,1000/(facing==="north"?24:60));
    assert.equal(walkMotionMultiplierForFrame(p),loop.movementSpeedMultipliers[6]);
    const rest=Renderer.resolveIdleWalkFrameForDefinition(p,definition,facing);
    assert.equal(rest.slot,parts[facing].rest.slot);assert.equal(rest.frame.frameCount,1);
    assert.equal(rest.mirrored,false);
    assert.deepEqual(Game.prototype.idleVariantsForFacing.call({player:p},facing),[]);
  });
  test(facing+" stops and short clicks settle only through contiguous native frames",()=>{
    for(let i=0;i<parts[facing].loop.frameCount;i++){
      const p=player(facing);p.animator.frameIndex=i;p.target={x:500,y:500};p.shortWalk=true;
      new MovementSystem(p).update(.01);
      assert.equal(p.walkPart,"stop");assert.equal(p.directionalStopFrame.facing,facing);
      const indices=p.directionalStopFrame.nativeSettleIndices;
      assert.equal(indices[0],i);assert.ok(parts[facing].loop.restFrames.includes(indices.at(-1)));
      assert.ok(indices.length / parts[facing].loop.fps <= .5, "settling completes within half a second");
      indices.forEach((f,j)=>assert.deepEqual(p.directionalStopFrame.frameRects[j],parts[facing].loop.frameRects[f]));
      assert.equal(Game.prototype.currentAnimationFrame.call({player:p}),p.directionalStopFrame);
      p.animator.isFinished=()=>true;new MovementSystem(p).update(.01);assert.equal(p.animation,"idle");
    }
  });
  test(facing+" reversal clears settling/idle state and starts the opposite matching loop",()=>{
    const p=player(facing);requestWalkStop(p);p.idleHoldFrame={slot:"stale"};
    new MovementSystem(p).walkTo({x:500,y:facing==="north"?650:350});
    assert.equal(p.facing,facing==="north"?"south":"north");assert.equal(p.directionalStopFrame,null);assert.equal(p.idleHoldFrame,null);
    assert.equal(p.walkPart,"loop");
  });
}
