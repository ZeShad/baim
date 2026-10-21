import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/engine/Game.js';
import {MovementSystem} from '../src/engine/MovementSystem.js';
import {characterDefinitions} from '../src/content/art/characters.js';
import {externalAnimationV1} from '../src/content/art/externalAnimationRuntime.generated.js';
import {AssetLoader} from '../src/engine/AssetLoader.js';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {stripMitkoIdleRestoration} from './helpers/mitko-idle-preservation.js';

const parts = characterDefinitions['npc.bai_mitko'].animations.walk.parts;
test('exact inverse restores original PR73 and rejects any unbound edit',()=>{
 for(const p of ['src/engine/Game.js','src/engine/Renderer.js']){
 const source=readFileSync(p,'utf8'),f=JSON.parse(readFileSync('test/fixtures/mitko-idle-restoration.json')).records[p];
 const before=stripMitkoIdleRestoration(p,source);
 assert.equal(createHash('sha256').update(before).digest('hex'),f.beforeSHA256);
 assert.equal(stripMitkoIdleRestoration(p,before),before);
 assert.throws(()=>stripMitkoIdleRestoration(p,source+'\n'),/exact scene fix idle restoration/);
 assert.throws(()=>stripMitkoIdleRestoration(p,source.replace('idle','unknownIdle')),/exact scene fix idle restoration/);
 const untouched=Buffer.from('unrelated');assert.equal(stripMitkoIdleRestoration('unrelated',untouched),untouched);
 }
});
function fixture(facing='east') {
 const g=Object.create(Game.prototype);
 g.characterVariant='external_animation_v1';
 g.player={id:'npc.bai_mitko',facing,position:{x:500,y:550},speed:100,animation:'idle',
  walkPartsByFacing:parts,idleVariant:null,idleVariantQueue:[],idleVariantTimer:0,
  idleHoldFrame:parts[facing].stop ? {frame:parts[facing].stop,slot:parts[facing].stop.slot,frameIndex:parts[facing].stop.frameCount-1} : null,
  animator:{frameIndex:0,isFinished:()=>false}};
 return g;
}
for(const facing of ['east','west']) {
 test(facing+' original six idles remain selectable with production pocket walk parts',()=>{
  const g=fixture(facing);
  assert.equal(g.idleVariantsForFacing().length,6);
  assert.deepEqual(g.idleVariantsForFacing(),externalAnimationV1.idleVariants[facing]);
 });
 test(facing+' idle timer starts real clip; finish and next walk remain responsive',()=>{
  const g=fixture(facing);g.updateIdleVariants(.016);
  assert.ok(g.player.idleVariant?.slot);
  const clip=g.player.idleVariant;
  assert.equal(Game.prototype.currentAnimationFrameCount.call(g),clip.frameCount);
  assert.match(g.currentAnimationKey(),/external_idle_east_/);
  new MovementSystem(g.player).walkTo({x:facing==='east'?650:350,y:550});
  assert.equal(g.player.animation,'walk');assert.equal(g.player.idleVariant,null);
  assert.deepEqual(g.player.idleVariantQueue,[]);assert.equal(g.player.idleHoldFrame,null);
  assert.equal(g.player.walkPart,'start');assert.ok(g.player.target);
 });
 test(facing+' finishing idle preserves its final hold and rearms timer',()=>{
  const g=fixture(facing);g.updateIdleVariants(.016);
  const clip=g.player.idleVariant;
  g.player.idleVariantQueue=[];g.player.animator.isFinished=()=>true;
  g.updateIdleVariants(.016);
  assert.equal(g.player.idleVariant,null);assert.equal(g.player.idleHoldFrame.frame,clip);
  assert.equal(g.player.idleHoldFrame.frameIndex,clip.frameCount-1);
  assert.ok(g.player.idleVariantTimer>=1&&g.player.idleVariantTimer<=3);
 });
}
test('native vertical walking does not select sideways idle artwork',()=>{
 for(const facing of ['north','south']) assert.deepEqual(fixture(facing).idleVariantsForFacing(),[]);
});
test('current queued and held idle atlases survive the decoded-cache budget',()=>{
 const g=fixture();g.currentScene={id:'scene.chapter1.village_square'};g.state={inventory:[]};
 const slots=['external_idle_east_1','external_idle_east_5','external_idle_east_6'];
 const manifest={scenes:{},items:{},characters:{'npc.bai_mitko':Object.fromEntries(slots.map(s=>[s,s+'.webp']))}};
 g.assets=new AssetLoader(manifest);g.assets.decodedImageBudgetBytes=1;
 slots.forEach(slot=>g.assets.images.set(slot+'.webp',{src:slot+'.webp',dataset:{loaded:'true'},naturalWidth:10,naturalHeight:10}));
 g.player.idleVariant={slot:slots[0]};g.player.idleVariantQueue=[{slot:slots[1]}];g.player.idleHoldFrame={slot:slots[2]};
 g.protectCurrentAssetWorkingSet();
 for(const slot of slots) assert.ok(g.assets.images.has(slot+'.webp'),'protected '+slot);
});
test('speech and actions still suppress and cancel idle selection',()=>{
 for(const state of [{animation:'talk'},{animation:'action'},{speaking:true},{target:{x:600,y:550}}]) {
  const g=fixture();g.updateIdleVariants(.016);Object.assign(g.player,state);g.updateIdleVariants(.016);
  assert.equal(g.player.idleVariant,null);assert.deepEqual(g.player.idleVariantQueue,[]);
 }
});
test('idle waits for its actual loaded atlas rather than advancing an invisible clip',()=>{
 const g=fixture();g.player.idleVariant={slot:'external_idle_east_1'};let loaded=false;
 g.assets={getCharacterImage:()=>({}),isLoaded:()=>loaded};
 assert.equal(g.locomotionArtReady(),false);
 loaded=true;assert.equal(g.locomotionArtReady(),true);
});
test('idle atlases are protected before their asynchronous preload begins',()=>{
 const g=fixture();g.currentScene={id:'scene.chapter1.village_square'};g.state={inventory:[]};let protectedSlots;
 g.assets={protectWorkingSet:({characterSlots})=>{protectedSlots=characterSlots;},
  preloadCharacterSlots:(_id,slots)=>{assert.ok(slots.length>0);for(const s of slots)assert.ok(protectedSlots.includes(s));}};
 g.updateIdleVariants(.016);assert.ok(protectedSlots.includes(g.player.idleVariant.slot));
});
