import test from 'node:test';
import assert from 'node:assert/strict';
import {characterDefinitions} from '../src/content/art/characters.js';
import {MovementSystem,requestWalkStop,walkMotionMultiplierForFrame} from '../src/engine/MovementSystem.js';
import {Game} from '../src/engine/Game.js';
import {Renderer} from '../src/engine/Renderer.js';
const definition=characterDefinitions['npc.bai_mitko'],parts=definition.animations.walk.parts;
function player(facing='east') {return {facing,position:{x:500,y:500},speed:100,animation:'idle',walkPart:null,walkPartsByFacing:parts,
 animator:{frameIndex:0,elapsed:0,isFinished:()=>false},walkMotionMultipliersByFacing:Object.fromEntries(Object.entries(parts).map(([f,p])=>[f,Object.fromEntries(Object.entries(p).map(([k,v])=>[k,v.movementSpeedMultipliers]))]))};}
for(const facing of ['east','west']){
 const target={x:facing==='east'?600:400,y:500};
 test(facing+': even a short trip uses hand withdrawal and an exposed-arm gait',()=>{
  const p=player(facing);new MovementSystem(p).walkTo(target,target,null,{shortWalk:true});assert.equal(p.shortWalk,false);assert.equal(p.walkPart,'start');
  assert.deepEqual(parts[facing].start.frameRects.map(r=>r.sourceFrameIndex),[8,9,10,11,12,13,14,15]);assert.equal(parts[facing].start.fps,20);
  for(let i=0;i<4;i++){p.animator.frameIndex=i;assert.equal(walkMotionMultiplierForFrame(p),0);}p.animator.frameIndex=4;assert.ok(walkMotionMultiplierForFrame(p)>0);
  const idle=Renderer.resolveIdleWalkFrameForDefinition(player(facing),definition,facing);assert.equal(idle.frame.frameRects[0].x,parts[facing].start.sourceFrameRects[0].x);
 });
 test(facing+': retargeting during withdrawal preserves its frame and retargeting a walk never restarts it',()=>{
  const p=player(facing),m=new MovementSystem(p);m.walkTo(target);p.animator.frameIndex=2;p.animator.elapsed=.1;m.walkTo({...target,x:target.x+10});
  assert.equal(p.walkPart,'start');assert.equal(p.animator.frameIndex,2);assert.equal(p.locomotionStartFrame.initialFrame,2);
  p.walkPart='loop';p.locomotionStartFrame=null;p.animator.frameIndex=5;m.walkTo({...target,x:target.x+20},target,null,{shortWalk:true});assert.equal(p.walkPart,'loop');assert.equal(p.shortWalk,false);
 });
 test(facing+': short arrival still plays the pocket-entry stop',()=>{
  const p=player(facing),m=new MovementSystem(p);m.walkTo(target,target,null,{shortWalk:true});p.walkPart='loop';p.target={...p.position};m.update(.01);
  assert.equal(p.walkPart,'stop');assert.equal(p.animation,'walk');assert.equal(Game.prototype.currentAnimationFrame.call({player:p}),parts[facing].stop);
  p.animator.isFinished=()=>true;m.update(.01);assert.equal(p.animation,'idle');assert.equal(p.walkPart,null);
 });
 test(facing+': a stop retarget before pocket entry resumes walking without another pocket cycle',()=>{
  const p=player(facing),m=new MovementSystem(p);p.animation='walk';p.walkPart='stop';p.animator.frameIndex=3;m.walkTo(target);assert.equal(p.walkPart,'loop');assert.equal(p.locomotionStartFrame,null);
 });
 test(facing+': a partially pocketed stop reverses the exact visible native frames before moving',()=>{
  const p=player(facing),m=new MovementSystem(p);p.animation='walk';p.walkPart='stop';p.animator.frameIndex=9;m.walkTo(target);
  const f=p.locomotionStartFrame;assert.equal(p.walkPart,'start');assert.equal(f.resumePocketExit,true);assert.deepEqual(f.nativePocketIndices,[9,8,7,6,5]);
  assert.deepEqual(f.frameRects[0],parts[facing].stop.frameRects[9]);assert.deepEqual(f.frameRects.at(-1),parts[facing].stop.frameRects[5]);
  assert.equal(Game.prototype.currentAnimationFrame.call({player:p}),f);assert.deepEqual(Renderer.prototype.resolveWalkPartFrame.call({},p,definition,facing).frameRects,f.frameRects);
  for(let i=0;i<f.frameCount;i++){p.animator.frameIndex=i;assert.equal(walkMotionMultiplierForFrame(p),0);}
  p.animator.isFinished=()=>true;m.update(.01);assert.equal(p.walkPart,'loop');assert.equal(p.locomotionStartFrame,null);
 });
 test(facing+': cancelling withdrawal returns through original frames to the pocketed frame0',()=>{
  const p=player(facing),m=new MovementSystem(p);m.walkTo(target);p.animator.frameIndex=2;requestWalkStop(p);
  assert.equal(p.walkPart,'stop');assert.equal(p.target,null);assert.deepEqual(p.directionalStopFrame.nativePocketIndices,[10,9,8,7,6,5,4,3,2,1,0]);
  assert.deepEqual(p.directionalStopFrame.frameRects.at(-1),parts[facing].start.sourceFrameRects[0]);
  p.animator.frameIndex=1;m.walkTo(target);assert.equal(p.walkPart,'start');assert.deepEqual(p.locomotionStartFrame.frameRects[0],parts[facing].start.sourceFrameRects[9]);
  assert.deepEqual(p.locomotionStartFrame.frameRects.at(-1),parts[facing].start.sourceFrameRects[12]);
 });
}
test('reversing direction during withdrawal preserves the current hand phase',()=>{
 const p=player(),m=new MovementSystem(p);m.walkTo({x:600,y:500});p.animator.frameIndex=3;m.walkTo({x:400,y:500});assert.equal(p.facing,'west');assert.equal(p.walkPart,'start');assert.equal(p.locomotionStartFrame.initialFrame,3);assert.equal(p.locomotionStartFrame.mirrored,true);
});
test('no-op commands preserve existing idle, start, stop, walking and higher-priority action state',()=>{
 for(const [animation,part]of [['idle',null],['walk','start'],['walk','loop'],['walk','stop'],['action',null]]){
  const p=player();p.animation=animation;p.walkPart=part;p.target=animation==='walk'&&part!=='stop'?{x:600,y:500}:null;p.animator.frameIndex=3;
  const before={animation:p.animation,part:p.walkPart,target:p.target,frame:p.animator.frameIndex};assert.equal(new MovementSystem(p).walkTo({...p.position}),false);
  assert.deepEqual({animation:p.animation,part:p.walkPart,target:p.target,frame:p.animator.frameIndex},before);
 }
});
test('unreachable route does not clear an existing action, speech or movement command',()=>{
 const action={id:'approved'},target={x:600,y:500};const g={inspectedItemId:null,sceneAction:null,currentScene:{walkMask:{width:1,height:1,rows:['.'],worldWidth:1280,worldHeight:720}},player:{position:{x:500,y:500},actionSequence:action,actionAnimation:action,target},hideSpeechBubble(){throw Error('unreachable command touched speech');}};
 assert.equal(Game.prototype.walkToPoint.call(g,{x:800,y:800}),false);assert.equal(g.player.actionSequence,action);assert.equal(g.player.target,target);
});
test('vertical gait and native timing stay unchanged while their pocket art is missing',()=>{
 assert.equal(parts.south.loop.frameCount,16);assert.equal(parts.south.loop.fps,1000/60);assert.equal(parts.north.loop.frameCount,36);assert.equal(parts.north.loop.fps,1000/24);
 assert.equal(parts.south.start,undefined);assert.equal(parts.north.stop,undefined);
});
test('missing side pocket/gait art freezes locomotion without replacing action or vertical policies',()=>{
 const p=player();p.animation='walk';p.walkPart='start';const loaded=new Set([parts.east.start.slot,parts.east.loop.slot,parts.east.stop.slot]);const g={player:p,assets:{getCharacterImage:(_id,slot)=>slot,isLoaded:slot=>loaded.has(slot)}};
 assert.equal(Game.prototype.locomotionArtReady.call(g),true);
 for(const f of [parts.east.start,parts.east.loop,parts.east.stop]){loaded.delete(f.slot);assert.equal(Game.prototype.locomotionArtReady.call(g),false);loaded.add(f.slot);}
 p.animation='action';loaded.clear();assert.equal(Game.prototype.locomotionArtReady.call(g),true);p.animation='walk';p.facing='north';assert.equal(Game.prototype.locomotionArtReady.call(g),true);
});
test('missing withdrawal image falls back to the loaded pocketed final stop pose',()=>{
 const p=player(),renderer={game:{assets:{getCharacterImage:(_id,slot)=>slot,isLoaded:slot=>slot===parts.east.stop.slot}}};
 const f=Renderer.prototype.resolveExternalWalkStartFrame.call(renderer,p,definition,'east');assert.equal(f.slot,parts.east.stop.slot);assert.equal(f.frameIndex,0);assert.equal(f.frame.frameCount,1);assert.deepEqual(f.frame.frameRects[0],parts.east.stop.frameRects.at(-1));
});
