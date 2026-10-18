import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {mitkoSizeMatchedFront,mitkoSizeMatchedRear as rear,mitkoSizeMatchedAssets as assets} from '../src/content/art/mitkoSizeMatchedTurns.generated.js';
import {mitkoTurnPocket} from '../src/content/art/mitkoTurnPocket.generated.js';
import {characterDefinitions} from '../src/content/art/characters.js';
import {assetManifest} from '../src/content/art/assetManifest.js';
import {beginArrivalTurn,updateArrivalTurn} from '../src/engine/ArrivalTurn.js';
import {MovementSystem} from '../src/engine/MovementSystem.js';
import {stripSizeMatchedTurn,restoreSizeMatchedSnapshot} from './helpers/size-matched-turn-preservation.js';
const sha=b=>createHash('sha256').update(b).digest('hex');
const source='assets_src/characters/bai_mitko/rear_west_c12_size_match_20261018/';
function player(index=0){return {position:{x:900,y:535},speed:100,facing:'north',lastLocomotionFacing:'north',animation:'walk',walkPart:'loop',walkPartsByFacing:characterDefinitions['npc.bai_mitko'].animations.walk.parts,arrivalTurnPilots:[rear],arrivalTurnReadySlots:{[rear.frame.slot]:true},animator:{frameIndex:index,elapsed:0,isFinished(){return true;}}};}
test('source preservation and original-family timing remain independently bound',()=>{
 const p=JSON.parse(fs.readFileSync(source+'provenance.json'));
 for(const[file,h]of Object.entries(p.originalHashes))assert.equal(sha(fs.readFileSync(source+file)),h);
 assert.equal(mitkoSizeMatchedFront,mitkoTurnPocket);
 assert.deepEqual(rear.frame.frameRects.map(r=>r.sourceFrameIndex),Array.from({length:36},(_,i)=>i));
 assert.equal(rear.nativeDurationMs,2628);assert.equal(rear.frame.frameCount/rear.frame.fps,1.8);
 assert.equal(rear.continuous,false);assert.equal(rear.exitSourceFrame,6);assert.equal(rear.pocketFps,20);
 for(const[slot,p]of Object.entries(assets))assert.equal(assetManifest.characters['npc.bai_mitko'][slot],p);
});
test('rear phase0 only, priorities and missing/late art never widen the entry gate',()=>{
 for(let i=0;i<36;i++){const p=player(i);assert.equal(beginArrivalTurn(p,'west'),i===0);}
 for(const key of ['pendingInteraction','pendingFacingPoint','speaking','actionSequence','actionAnimation']){const p=player();p[key]=true;assert.equal(beginArrivalTurn(p,'west'),false);}
 const p=player();p.arrivalTurnReadySlots[rear.frame.slot]=false;assert.equal(beginArrivalTurn(p,'west'),false);p.arrivalTurnReadySlots[rear.frame.slot]=true;assert.equal(p.arrivalTurn,undefined);
});
test('rear completes every pivot interval then enters original6–15 and resumes normal gait on click',()=>{
 const p=player();assert.equal(beginArrivalTurn(p,'west'),true);p.animator.elapsed=1.775;p.animator.frameIndex=35;updateArrivalTurn(p);assert.equal(p.arrivalTurn.phase,'turn');p.animator.elapsed=1.8;updateArrivalTurn(p);
 assert.equal(p.arrivalTurn.phase,'pocket');assert.deepEqual(p.directionalStopFrame.frameRects.map(r=>r.sourceFrameIndex),[6,7,8,9,10,11,12,13,14,15]);
 new MovementSystem(p).walkTo({x:500,y:535});assert.equal(p.arrivalTurn,null);assert.deepEqual(p.target,{x:500,y:535});assert.notEqual(p.locomotionStartFrame?.slot,rear.frame.slot);
});
test('derived atlases retain full cell layout, first-pose size and unclipped meaningful poses',async()=>{
 const bindings=JSON.parse(fs.readFileSync(source+'runtime-derivation.json')).bindings;
 for(const binding of bindings){
  const f=binding.kind==='rear'?rear.frame:mitkoTurnPocket.frame;
  const a=await sharp(binding.source).metadata(),b=await sharp(binding.asset).metadata();assert.equal(a.width,b.width);assert.equal(a.height,b.height);assert.equal(sha(fs.readFileSync(binding.asset)),binding.sha256);
  for(let i=0;i<f.frameCount;i++){
   const r=f.frameRects[i],{data,info}=await sharp(binding.asset).extract({left:r.x,top:r.y,width:r.w,height:r.h}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   let minX=info.width,minY=info.height,maxX=-1,maxY=-1;
   for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>8){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
   assert.ok(minX>0&&minY>0&&maxX<info.width-1&&maxY<info.height-1,`${binding.kind} pose${i} clipping`);
   if(i===0){const bounds=f.contentBounds;assert.ok(Math.abs(minY-bounds.y)<=1);assert.ok(Math.abs(maxY+1-(bounds.y+bounds.h))<=1);}
  }
 }
});
test('new inverse restores fixed PR69 bytes and snapshot, rejects unknown modifications',()=>{
 const f=JSON.parse(fs.readFileSync('test/fixtures/size-matched-turn-deltas.json'));
 for(const[p,r]of Object.entries(f.records)){const b=fs.readFileSync(p);assert.equal(stripSizeMatchedTurn(p,b),r.before);assert.throws(()=>stripSizeMatchedTurn(p,Buffer.concat([b,Buffer.from('tamper')])),/size-match inverse/);}
 assert.deepEqual(restoreSizeMatchedSnapshot('manifest',assetManifest),f.snapshots.manifest.before);
});
