import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {DialogueSystem} from '../src/engine/DialogueSystem.js';
import {Renderer,sceneReactionBlendSamples} from '../src/engine/Renderer.js';
import {chapter1} from '../src/content/chapter1/index.js';
import {assetManifest} from '../src/content/art/assetManifest.js';
import {imageAssetPaths} from '../src/engine/AssetLoader.js';
import {stripBottleQuest} from './helpers/bottle-preservation.js';
const scene=chapter1.scenes.find(s=>s.id==='scene.chapter1.village_square');
const layer=scene.foregroundLayers.find(l=>l.id==='layer.square.baba_stoyanka_seated');
const reaction=layer.reactionAnimations.delighted_approval;
const dialogues=Object.fromEntries(chapter1.dialogues.map(d=>[d.id,d]));
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const frame=d=>Math.floor(d[2]/reaction.frameHeight)*reaction.columns+Math.floor(d[1]/reaction.frameWidth);
function fixture(){
 const effects=[],dialogue=new DialogueSystem(dialogues,null,e=>effects.push(e));
 const images=Object.fromEntries([reaction.asset,layer.talkAnimation.asset,layer.animation.asset,layer.asset].map(a=>[a,{}]));
 const loaded=new Set(Object.values(images)),draws=[];
 const game={lastTime:0,dialogue,content:{dialogues},speech:0,npcSpeechAnimationTime(){return dialogue.current?this.speech:null;},assets:{getSceneImage:(_s,a)=>images[a],isLoaded:i=>loaded.has(i)}};
 const renderer=Object.assign(Object.create(Renderer.prototype),{ctx:{drawImage:(...a)=>draws.push(a)},game});
 const draw=t=>{game.lastTime=t;renderer.drawSceneRasterLayer(scene,layer);return draws.at(-1);};
 dialogue.start('dialogue.baba_stoyanka');draw(0);
 const enter=()=>dialogue.choose(dialogues['dialogue.baba_stoyanka'].nodes.start.choices.find(c=>c.next==='vote_confirmed'));
 return {game,dialogue,draw,images,loaded,renderer,effects,enter};
}
test('Baba confirmation runs every delighted frame once and returns to current speech or idle',()=>{
 const f=fixture();f.enter();const entry=f.dialogue.entry;
 assert.equal(entry.reactionId,'delighted_approval');
 f.draw(10);
 for(let i=0;i<36;i++){const d=f.draw(10+(i+.01)*reaction.frameDurationMs);assert.equal(d[0],f.images[reaction.asset]);assert.equal(frame(d),i);}
 assert.equal(f.draw(2800)[0],f.images[layer.talkAnimation.asset]);
 f.game.speech=null;assert.equal(f.draw(2900)[0],f.images[layer.animation.asset]);
 f.dialogue.getNode();assert.equal(f.dialogue.entry,entry);assert.equal(f.draw(3000)[0],f.images[layer.animation.asset]);
 f.enter();assert.notEqual(f.dialogue.entry,entry);assert.equal(frame(f.draw(3010)),0);
 assert.deepEqual(f.effects,[]);
});
test('Baba reaction freezes in menus, keeps a fixed full-frame anchor and cancels when dialogue closes',()=>{
 const f=fixture();f.enter();const first=f.draw(10);
 const expected=[325,330,389*122/636,122];
 first.slice(5).forEach((n,i)=>assert.ok(Math.abs(n-expected[i])<1e-10));
 f.game.menuOpen=true;assert.equal(frame(f.draw(2010)),0);
 f.game.menuOpen=false;assert.equal(frame(f.draw(2010+reaction.frameDurationMs*1.01)),1);
 for(let i=2;i<15;i++)assert.deepEqual(f.draw(2010+reaction.frameDurationMs*(i+.01)).slice(5),first.slice(5));
 f.dialogue.close();assert.equal(f.draw(3400)[0],f.images[layer.animation.asset]);
});
test('Missing Baba reaction is consumed without late-loading replay; unrelated dialogue cannot trigger it',()=>{
 const f=fixture();f.enter();f.loaded.delete(f.images[reaction.asset]);
 assert.equal(f.draw(10)[0],f.images[layer.talkAnimation.asset]);f.loaded.add(f.images[reaction.asset]);
 assert.equal(f.draw(30)[0],f.images[layer.talkAnimation.asset]);
 f.dialogue.start('dialogue.tony_fridge');f.dialogue.choose({next:'contest_result'});
 assert.notEqual(f.draw(50)[0],f.images[reaction.asset]);
});
test('Baba effects, prior approved animations, source provenance and election isolation stay intact',()=>{
 const path='assets_src/characters/baba_stoyanka/external_animation_v1/animation-pilot.json';
 const pilot=JSON.parse(readFileSync(path));
 // Pin approved content from a764c64; HEAD includes the candidate after commit/CI.
 const approvedHashes={baba_idle_seated_1:'4e378ad54eabb4a9550c14f62786f764dd738ba6914ad42b5725029e3b8fa70f',baba_talk_seated_1:'b0e6b096cc33c8a0a413211882577d6f2f69851789aaacb2cd50da2e0002558a'};
 for(const [id,hash] of Object.entries(approvedHashes))assert.equal(createHash('sha256').update(JSON.stringify(pilot.animations[id])).digest('hex'),hash);
 const candidate=Object.values(pilot.animations).find(a=>a.label==='bs-delighted-seated-c02');
 assert.ok(['runtime_review','runtime_approved'].includes(candidate.status));assert.equal(candidate.review.candidateStatus,candidate.status);
 assert.equal(candidate.generation.creditsSpent,9);assert.equal(candidate.import.timingOrigin,'derived_uniform_from_api_total_duration');
 assert.equal(sha('assets_src/characters/baba_stoyanka/external_animation_v1/'+candidate.source.nativeSourceFile),candidate.source.nativeSourceSha256);
 assert.equal(sha('assets_src/characters/baba_stoyanka/external_animation_v1/'+candidate.source.preservedPngFile),candidate.source.preservedPngSha256);
 assert.equal(sha(candidate.import.runtime.asset),candidate.import.derivedOutputHashes[candidate.import.runtime.asset]);
 assert.equal(sha('assets/chapter1/characters/baba_stoyanka/seated-v2.png'),'65e1893cd678f0f05796e80c82d8f1b7d8dcc756f71bd86a0a8dfc3e0a552742');
 const current=stripBottleQuest('src/content/chapter1/fountain.js',readFileSync('src/content/chapter1/fountain.js','utf8')).replace(', reactionId: "delighted_approval"','').replace(', reactionId: "skeptical_disapproval"','');
 assert.equal(createHash('sha256').update(current).digest('hex'),'1121fb5ec1b27298d801e1b58dd551e9c5b2d16cf5f5532bc8ac3026acac2889');
 assert.deepEqual([layer.left,layer.top,layer.height,layer.zIndex],[325,330,122,90]);assert.equal(reaction.loop,false);
 assert.deepEqual(reaction.contentBounds,{x:0,y:0,w:389,h:636});assert.deepEqual(reaction.registrationBounds,reaction.contentBounds);
 assert.equal(reaction.interpolateFrames,true);assert.equal(reaction.transitionDurationMs,148);
 assert.deepEqual(layer.stationaryLowerBody,{frameIndex:0,fromY:60,featherHeight:6,animatedCutouts:[[[43.5,56],[47.5,56],[55.5,119],[51.5,119]]]});
 assert.ok(imageAssetPaths(assetManifest.scenes[scene.id]).includes(candidate.import.runtime.asset));
 const election=chapter1.scenes.find(s=>s.id==='scene.chapter1.election_booth');assert.ok(election.foregroundLayers.every(l=>!l.reactionAnimations));
});

test('Baba smoothing preserves total opacity, continuous frame boundaries and one-shot endpoints',()=>{
 const sample=t=>sceneReactionBlendSamples(reaction,t);
 for(let t=0;t<36*reaction.frameDurationMs;t+=3.1){
  const s=sample(t);assert.ok(Math.abs(s.baseWeight+s.frames.reduce((n,f)=>n+f.weight,0)-1)<1e-12);
  assert.ok(s.frames.every(f=>f.frameIndex>=0&&f.frameIndex<36&&f.weight>=0));
 }
 assert.equal(sample(0).baseWeight,1);assert.equal(sample(36*reaction.frameDurationMs).baseWeight,1);
 const position=s=>s.frames.reduce((n,f)=>n+f.frameIndex*f.weight,0);
 for(let i=3;i<33;i++)assert.ok(Math.abs(position(sample(i*reaction.frameDurationMs-.001))-position(sample(i*reaction.frameDurationMs+.001)))<.001);
 assert.equal(sample(20*reaction.frameDurationMs).baseWeight,0);
});
