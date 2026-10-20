import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {mitkoTurnPocket as pilot} from '../src/content/art/mitkoTurnPocket.generated.js';
import {mitkoTurnPilot} from '../src/content/art/mitkoTurnPilot.generated.js';
import {characterDefinitions} from '../src/content/art/characters.js';
import {assetManifest} from '../src/content/art/assetManifest.js';
import {beginArrivalTurn,updateArrivalTurn} from '../src/engine/ArrivalTurn.js';
import {MovementSystem} from '../src/engine/MovementSystem.js';
import {Game} from '../src/engine/Game.js';
import {externalFrameVisualBounds,stableExternalVisualBounds} from '../src/engine/Renderer.js';
import {stripTurnPocket,restoreTurnPocketSnapshot} from './helpers/turn-pocket-preservation.js';
const parts=characterDefinitions['npc.bai_mitko'].animations.walk.parts;
function player(){return{position:{x:900,y:565},speed:100,walkVisualHeight:300,facing:'south',lastLocomotionFacing:'south',animation:'walk',walkPart:'loop',walkPartsByFacing:parts,arrivalTurnPilots:[mitkoTurnPilot,pilot],arrivalTurnReadySlots:{[pilot.frame.slot]:true,[mitkoTurnPilot.frame.slot]:true},animator:{frameIndex:0,elapsed:0,isFinished(){return true;}}};}
test('full c05 source remains preserved; runtime selects complete pivot0–13 then original side family',()=>{
 const dir='assets_src/characters/bai_mitko/turning_front_west_pocket_c05_20261017/',r=JSON.parse(readFileSync(dir+'provenance.json')),sha=b=>createHash('sha256').update(b).digest('hex');
 for(const[file,key]of [['original-export.zip','sprite-max-px-frames-36-rows-6-cols-6.zip'],['original-preview.gif','sprite-max-px-frames-36-rows-6-cols-6.gif'],['sheet.png','sprite-max-px-frames-36-rows-6-cols-6.png'],['sheet.json','sprite-max-px-frames-36-rows-6-cols-6.json']])assert.equal(sha(readFileSync(dir+file)),r.hashes[key]);
 assert.equal(Object.keys(JSON.parse(readFileSync(dir+'sheet.json')).frames).length,36);assert.deepEqual(pilot.frame.frameRects.map(r=>r.sourceFrameIndex),Array.from({length:14},(_,i)=>i));assert.equal(pilot.frame.frameRects.every(r=>r.duration===76),true);
 assert.equal(pilot.nativeDurationMs,2736);assert.equal(pilot.selectedNativeDurationMs,1064);assert.equal(pilot.frame.frameCount/pilot.frame.fps,.7);assert.equal(pilot.runtimeDurationMs,1200);assert.equal(pilot.continuous,false);assert.equal(pilot.frame.continuousPocket,undefined);
});
function pocket(){const p=player();beginArrivalTurn(p,'west');p.animator.elapsed=.7;p.animator.frameIndex=13;updateArrivalTurn(p);return p;}
function completed(){const p=pocket(),f=p.directionalStopFrame;p.animator.elapsed=.5;p.animator.frameIndex=9;new MovementSystem(p).update(.01);Game.prototype.setIdleHoldFrame.call({player:p},f,9);return p;}
test('west turn stays limited to south/contact0 with per-slot readiness and priorities',()=>{
 const p=player();assert.equal(beginArrivalTurn(p,'west'),true);assert.equal(p.arrivalTurn.pilot,pilot);for(const i of [1,2,8,15]){const q=player();q.animator.frameIndex=i;assert.equal(beginArrivalTurn(q,'west'),false);}
 const q=player();q.arrivalTurnReadySlots[pilot.frame.slot]=false;assert.equal(beginArrivalTurn(q,'west'),false);assert.equal(beginArrivalTurn(q,'east'),true);for(const patch of [{lastLocomotionFacing:'north'},{pendingInteraction:{}},{pendingFacingPoint:{}},{speaking:true},{actionAnimation:{}}])assert.equal(beginArrivalTurn(Object.assign(player(),patch),'west'),false);
});
test('last pivot interval completes before original forward pocket6–15 begins',()=>{
 const p=player();beginArrivalTurn(p,'west');const f=p.directionalStopFrame;p.animator.frameIndex=13;p.animator.elapsed=.675;assert.equal(updateArrivalTurn(p),true);assert.equal(p.directionalStopFrame,f);assert.equal(p.arrivalTurn.phase,'turn');p.animator.elapsed=.7;assert.equal(updateArrivalTurn(p),true);
 const entry=p.directionalStopFrame;assert.equal(p.arrivalTurn.phase,'pocket');assert.equal(entry.slot,parts.west.stop.slot);assert.deepEqual(entry.frameRects.map(r=>r.sourceFrameIndex),[6,7,8,9,10,11,12,13,14,15]);assert.equal(entry.fps,20);assert.equal(entry.pocketEntryFrame,2);assert.deepEqual(entry.registration,{visualHeight:442,baselineY:508});assert.equal(entry.anchor.x,.5);assert.equal(entry.mirrored,true);assert.equal(entry.stopRenderOffsetXStart,0);assert.equal(entry.movementSpeedMultipliers.every(v=>v===0),true);assert.deepEqual(p.position,{x:900,y:565});
});
test('original pocket retains full final interval and holds original15 rather than generated35',()=>{
 const p=pocket(),f=p.directionalStopFrame;p.animator.elapsed=.475;p.animator.frameIndex=9;assert.equal(updateArrivalTurn(p),true);assert.ok(p.arrivalTurn);p.animator.elapsed=.5;new MovementSystem(p).update(.01);Game.prototype.setIdleHoldFrame.call({player:p},f,9);
 assert.equal(p.arrivalTurn,null);assert.equal(p.animation,'idle');assert.equal(p.facing,'west');assert.equal(p.idleHoldFrame.slot,parts.west.stop.slot);assert.equal(p.idleHoldFrame.frame.frameRects[p.idleHoldFrame.frameIndex].sourceFrameIndex,15);assert.deepEqual(p.idleHoldFrame.frame.registration,{visualHeight:442,baselineY:508});
});
test('completed original rest uses normal starts in every target direction without c05 withdrawal',()=>{
 for(const target of [{x:850,y:565},{x:950,y:565},{x:900,y:500},{x:900,y:620}]){const p=completed();new MovementSystem(p).walkTo(target);assert.equal(p.arrivalTurn,null);assert.equal(p.idleHoldFrame,null);assert.equal(p.locomotionStartFrame,null);assert.notEqual(parts[p.facing]?.[p.walkPart]?.slot,pilot.frame.slot);assert.deepEqual(p.target,target);if(['east','west'].includes(p.facing)){assert.equal(p.walkPart,'start');assert.equal(parts[p.facing].start.frameRects[p.animator.frameIndex].sourceFrameIndex,8);}}
});
test('click during pivot resumes existing gait while no-op preserves the active turn',()=>{
 const p=player();beginArrivalTurn(p,'west');p.animator.frameIndex=13;const turn=p.arrivalTurn,m=new MovementSystem(p);assert.equal(m.walkTo({...p.position}),false);assert.equal(p.arrivalTurn,turn);m.walkTo({x:850,y:565});assert.equal(p.arrivalTurn,null);assert.equal(p.walkPart,'loop');assert.equal(p.locomotionStartFrame,null);m.update(.05);assert.ok(p.position.x<900);
});
test('pocket interruption reverses original exposed hand frames, never c05',()=>{
 for(const index of [0,1,2,5,9]){const p=pocket();p.animator.frameIndex=index;new MovementSystem(p).walkTo({x:850,y:565});assert.equal(p.arrivalTurn,null);if(index<2){assert.equal(p.walkPart,'loop');assert.equal(p.locomotionStartFrame,null);}else{assert.equal(p.walkPart,'start');assert.equal(p.locomotionStartFrame.slot,parts.west.stop.slot);assert.deepEqual(p.locomotionStartFrame.frameRects.map(r=>r.sourceFrameIndex),Array.from({length:index},(_,i)=>index+6-i));assert.equal(p.locomotionStartFrame.continuousPocket,undefined);}}
});
test('ordinary clock runs pivot/original pocket; moving gait retains acceleration cadence',()=>{
 const p=player(),g={player:p,currentAnimationFrame:()=>pilot.frame};p.walkPart='stop';assert.equal(Game.prototype.locomotionCadenceRatio.call(g,.02),1);p.facing='west';p.walkMotionMultipliersByFacing={west:{start:parts.west.start.movementSpeedMultipliers}};p.walkPart='start';p.target={x:850,y:565};p.walkCadenceRatio=.6;p.animator.frameIndex=0;g.currentAnimationFrame=()=>parts.west.start;assert.equal(Game.prototype.locomotionCadenceRatio.call(g,.02),1);p.animator.frameIndex=4;assert.equal(Game.prototype.locomotionCadenceRatio.call(g,.02),.6);
});
test('ground/local bounds correction preserves authored action registration',()=>{
 const d=characterDefinitions['npc.bai_mitko'],stable=stableExternalVisualBounds(d,true);assert.equal(stable.baselineY,508);assert.equal(stableExternalVisualBounds(d).baselineY,476);const start=parts.west.start,local={...start,frameContentBounds:start.frameContentBounds.slice(4)};assert.equal(externalFrameVisualBounds(local,0,stable),start.frameContentBounds[4]);
});
test('priority/missing-art cancellation cannot queue a late generated rest or turn',()=>{
 const p=player();beginArrivalTurn(p,'west');p.actionAnimation={};updateArrivalTurn(p);assert.equal(p.arrivalTurn,null);for(const create of [()=>{const q=player();beginArrivalTurn(q,'west');return q;},pocket]){const q=create();q.arrivalTurnReadySlots[pilot.frame.slot]=false;updateArrivalTurn(q);assert.equal(q.arrivalTurn,null);assert.equal(q.idleHoldFrame.slot,parts.west.stop.slot);q.arrivalTurnReadySlots[pilot.frame.slot]=true;new MovementSystem(q).update(.02);assert.equal(q.arrivalTurn,null);}
});

test('c05 inverse restores exact PR68 bytes including protected helper and rejects tampering',()=>{
 const f=JSON.parse(readFileSync('test/fixtures/turn-pocket-deltas.json'));for(const[p,r]of Object.entries(f.records)){const b=readFileSync(p);assert.equal(stripTurnPocket(p,b),r.before);assert.throws(()=>stripTurnPocket(p,Buffer.concat([b,Buffer.from('tamper')])),/c05 inverse|exact scene fix/);}
 assert.deepEqual(restoreTurnPocketSnapshot('manifest',assetManifest),f.snapshots.manifest.before);const bad=structuredClone(assetManifest);bad.characters['npc.bai_mitko'].turn_front_west_pocket_c05+='tamper';assert.throws(()=>restoreTurnPocketSnapshot('manifest',bad),/c05 inverse|exact scene fix/);
});
