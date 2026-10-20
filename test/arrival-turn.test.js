import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {MovementSystem} from '../src/engine/MovementSystem.js';
import {beginArrivalTurn,updateArrivalTurn} from '../src/engine/ArrivalTurn.js';
import {mitkoTurnPilot} from '../src/content/art/mitkoTurnPilot.generated.js';
import {characterDefinitions} from '../src/content/art/characters.js';
import {stripTurningPilot,restoreTurningSnapshot} from './helpers/turning-pilot-preservation.js';
import {assetManifest} from '../src/content/art/assetManifest.js';
const parts=characterDefinitions['npc.bai_mitko'].animations.walk.parts;
test('accepted originals stay intact; selected complete pivot is explicitly timed',()=>{
 const sha=b=>createHash('sha256').update(b).digest('hex'),dir='assets_src/characters/bai_mitko/turning_pilot_20261016/';
 assert.equal(sha(readFileSync(dir+'original-export.zip')),'476abe3b02de7e97b0dbbd15bece46f8d2fbbfeb292ef9614ae9d50b13c76405');
 assert.equal(sha(readFileSync(dir+'original-preview.gif')),'cc5e1133eb707ccd30529de29552a67682128eca0ca96fc4bd9e49389e6390a3');
 assert.equal(sha(readFileSync('assets/chapter1/characters/bai_mitko/turn-front-east-c01.webp')),'37896e6440a0e21f61033e0b29c59ed707fd4cbe1a97dc63c205ae9f105c42af');
 assert.deepEqual(mitkoTurnPilot.frame.frameRects.map(r=>r.sourceFrameIndex),Array.from({length:21},(_,i)=>i));
 assert.equal(mitkoTurnPilot.frame.frameRects.every(r=>r.duration===76),true);assert.equal(mitkoTurnPilot.frame.frameCount/mitkoTurnPilot.frame.fps,1.05);
 const source=Object.values(JSON.parse(readFileSync(dir+'sheet.json')).frames);
 assert.equal(source.length,36);assert.equal(source.reduce((sum,f)=>sum+f.duration,0),2736);
 assert.equal(mitkoTurnPilot.selectedNativeDurationMs,1596);assert.equal(mitkoTurnPilot.runtimeDurationMs,1050);
 assert.deepEqual(mitkoTurnPilot.sourceRange,[0,20]);assert.equal(mitkoTurnPilot.exitSourceFrame,8);
});
function player(){return {position:{x:400,y:600},speed:100,walkVisualHeight:300,facing:'south',lastLocomotionFacing:'south',animation:'walk',walkPart:'loop',walkPartsByFacing:parts,arrivalTurnPilot:mitkoTurnPilot,arrivalTurnArtReady:true,animator:{frameIndex:0,elapsed:0,isFinished(){return true;}}};}
test('only accepted facing/contact with ready art can start; no blind phase/direction expansion',()=>{
 const p=player();assert.equal(beginArrivalTurn(p,'east'),true);assert.equal(p.directionalStopFrame.frameCount,21);
 for(const index of [1,7,8,15]){const q=player();q.animator.frameIndex=index;assert.equal(beginArrivalTurn(q,'east'),false);}
 for(const patch of [{lastLocomotionFacing:'north'},{arrivalTurnArtReady:false},{pendingInteraction:{}},{pendingFacingPoint:{}},{speaking:true},{actionAnimation:{}}])assert.equal(beginArrivalTurn(Object.assign(player(),patch),'east'),false);
 assert.equal(beginArrivalTurn(player(),'west'),false);
});
test('complete pivot0–20 then pocket8–15 without duplicate settling, unchanged feet',()=>{
 const p=player();beginArrivalTurn(p,'east');p.animator.elapsed=20/20;
 assert.equal(updateArrivalTurn(p),true);assert.equal(p.arrivalTurn.phase,'turn','full final50ms must be shown');
 p.animator.elapsed=1.05;updateArrivalTurn(p);assert.equal(p.facing,'east');assert.equal(p.arrivalTurn.phase,'pocket');
 const f=p.directionalStopFrame;assert.deepEqual(f.frameRects.map(r=>r.sourceFrameIndex),[8,9,10,11,12,13,14,15]);
 assert.equal(f.registration.visualHeight,426);
 assert.equal(f.registration.baselineY,497);
 const turn=p.arrivalTurn.pilot.frame,join=p.arrivalTurn.pilot.pocketJoin;
 // The same supporting boot contact must remain at the same rendered point
 // across two atlases. One fixed registration then persists through pocket/rest.
 assert.equal((join.turnContact.y-turn.registration.baselineY)/turn.registration.visualHeight,
   (join.pocketContact.y-f.registration.baselineY)/f.registration.visualHeight);
 assert.ok(Math.abs((join.turnContact.x-turn.frameWidth*turn.anchor.x)/turn.registration.visualHeight
   -(join.pocketContact.x-f.frameWidth*f.anchor.x)/f.registration.visualHeight)<1e-12);
 assert.equal(f.fps,20);assert.equal(f.pocketEntryFrame,0);assert.equal(f.movementSpeedMultipliers.every(v=>v===0),true);
 p.animator.elapsed=.4;assert.equal(updateArrivalTurn(p),false);assert.equal(p.arrivalTurn,null);assert.deepEqual(p.position,{x:400,y:600});
});
test('new click during pivot cancels immediately with exposed hands and cannot replay pocket withdrawal',()=>{
 const p=player();beginArrivalTurn(p,'east');p.animator.elapsed=.8;
 const m=new MovementSystem(p);assert.equal(m.walkTo({x:500,y:600}),true);
 assert.equal(p.arrivalTurn,null);assert.equal(p.walkPart,'loop');m.update(.05);assert.ok(p.position.x>400);assert.equal(p.arrivalTurn,null);
});
test('interrupted pocket entry reverses only existing approved hand frames',()=>{
 const p=player();beginArrivalTurn(p,'east');p.animator.elapsed=1.05;updateArrivalTurn(p);p.animator.frameIndex=5;
 new MovementSystem(p).walkTo({x:500,y:600});assert.equal(p.arrivalTurn,null);assert.equal(p.walkPart,'start');
 assert.deepEqual(p.locomotionStartFrame.frameRects.map(r=>r.sourceFrameIndex),[13,12,11,10,9,8]);
});
test('no-op preserves active one-shot; interaction priority or missing art cancels without delayed replay',()=>{
 const p=player();beginArrivalTurn(p,'east');const state=p.arrivalTurn;new MovementSystem(p).walkTo({...p.position});assert.equal(p.arrivalTurn,state);
 p.pendingInteraction={};updateArrivalTurn(p);assert.equal(p.arrivalTurn,null);assert.equal(p.animation,'idle');
 const q=player();beginArrivalTurn(q,'east');q.arrivalTurnArtReady=false;updateArrivalTurn(q);assert.equal(q.arrivalTurn,null);assert.equal(q.facing,'east');assert.equal(q.idleHoldFrame.frameIndex,13);
 q.arrivalTurnArtReady=true;new MovementSystem(q).update(.05);assert.equal(q.arrivalTurn,null);
});
test('newest inverse restores exact PR67 sources/manifest and rejects unknown bytes',()=>{
 const f=JSON.parse(readFileSync('test/fixtures/turning-pilot-deltas.json'));
 for(const [p,r]of Object.entries(f.records)){const source=readFileSync(p);assert.equal(stripTurningPilot(p,source),r.before);assert.throws(()=>stripTurningPilot(p,Buffer.concat([source,Buffer.from('tamper')])),/exact turning pilot candidate|exact scene fix/);}
 assert.deepEqual(restoreTurningSnapshot('manifest',assetManifest),f.snapshots.manifest.before);
 const tampered=structuredClone(assetManifest);tampered.characters['npc.bai_mitko'].turn_front_east_c01+='x';assert.throws(()=>restoreTurningSnapshot('manifest',tampered),/exact turning pilot snapshot|exact scene fix snapshot/);
});
