import test from 'node:test';
import assert from 'node:assert/strict';
import {toniContestFade,toniContestFadeEffect} from '../src/content/chapter1/toniAftermath.js';
import {SceneActionSequence} from '../src/engine/SceneActionSequence.js';
import {Game} from '../src/engine/Game.js';
import {chapter1} from '../src/content/chapter1/index.js';
import {DEFAULT_SAVE} from '../src/engine/ids.js';
import {InventorySystem} from '../src/engine/InventorySystem.js';
import {requirementsMet} from '../src/engine/EffectSystem.js';
import {DialogueSystem} from '../src/engine/DialogueSystem.js';
import {toniSleepAnimation} from '../src/content/art/toniSleep.generated.js';
import {ambientLayerClock,sceneLayerAnimationFrame} from '../src/engine/Renderer.js';
const outcome=chapter1.dialogues.find(d=>d.id==='dialogue.tony_fridge').nodes.start.choices.find(c=>c.next==='contest_result').effect;
function game(){
 const g=Object.create(Game.prototype),state=structuredClone(DEFAULT_SAVE);
 state.swappedOwnRakiaWithWater=true;
 Object.assign(g,{state,inventory:new InventorySystem({},state),sceneAction:new SceneActionSequence(),currentScene:{id:toniContestFade.sceneId},assets:{getSceneImage:()=>true,isLoaded:x=>x},protectCurrentAssetWorkingSet(){},save(){this.saves=(this.saves||0)+1;},renderUi(){}});
 g.sceneAction.start(g.currentScene.id,toniContestFade);g.sceneActionEffect=toniContestFadeEffect(outcome);return g;
}
test('prepared blackout hides outcome mutation, preserves water prerequisite and exact reward effects',()=>{
 const effect=toniContestFadeEffect(outcome);assert.deepEqual(effect.effects,outcome.effects);
 assert.equal(requirementsMet(effect.requirements,{state:structuredClone(DEFAULT_SAVE)}),false);
 assert.ok(toniContestFade.requiredAssets.includes('tonySleepingIdle'));
 const g=game();g.updateSceneAction(.449);assert.equal(g.state.tonyVote,false);
 assert.ok(g.sceneAction.fadeOpacity(g.currentScene.id)<1);
 g.updateSceneAction(.001);assert.equal(g.sceneAction.fadeOpacity(g.currentScene.id),1);assert.equal(g.state.tonyVote,true);assert.equal(g.state.flags.tonyPassedOut,true);assert.equal(g.saves,1);
 const influence=g.state.influence;g.updateSceneAction(.4);assert.equal(g.state.influence,influence);assert.equal(g.saves,1);
 g.updateSceneAction(.75);assert.equal(g.sceneAction.active,false);
});
test('prepared blackout pauses, cancels before commit without reward and preserves committed sleep',()=>{
 const paused=game();paused.paused=true;paused.updateSceneAction(2);assert.equal(paused.sceneAction.state.elapsedMs,0);assert.equal(paused.state.tonyVote,false);
 const canceled=game();canceled.updateSceneAction(.2);canceled.sceneTransitionPending=true;canceled.updateSceneAction(2);assert.equal(canceled.sceneAction.active,false);assert.equal(canceled.state.tonyVote,false);
 const committed=game();committed.updateSceneAction(.45);committed.sceneTransitionPending=true;committed.updateSceneAction(2);assert.equal(committed.state.flags.tonyPassedOut,true);assert.equal(committed.state.tonyVote,true);assert.equal(committed.saves,1);
});

test('contest closes dialogue only after successful fade start; Kiro explains cleanup once after reveal',()=>{
 const dialogues=Object.fromEntries(chapter1.dialogues.map(d=>[d.id,d]));
 const choice=dialogues['dialogue.tony_fridge'].nodes.start.choices.find(c=>c.next==='contest_result');
 const blocked=new DialogueSystem(dialogues,{},()=>false);blocked.start('dialogue.tony_fridge');assert.equal(blocked.choose(choice),false);assert.ok(blocked.current);
 const accepted=new DialogueSystem(dialogues,{},()=>true);accepted.start('dialogue.tony_fridge');assert.equal(accepted.choose(choice),true);assert.equal(accepted.current,null);
 const g=game(),spoken=[];g.currentScene.npcs=[{id:'npc.mehana_waiter',kind:'npc'}];g.t=k=>k;g.setNpcSpeechMessage=(npc,line)=>spoken.push([npc.id,line]);
 g.updateSceneAction(.45);assert.deepEqual(spoken,[]);g.updateSceneAction(1.15);assert.deepEqual(spoken,[['npc.mehana_waiter','photoquest.kiro_cleanup']]);g.updateSceneAction(2);assert.equal(spoken.length,1);
 const kiro=dialogues['dialogue.mehana_waiter'].nodes;assert.equal(requirementsMet(kiro.start.choices[0].requirements,{state:structuredClone(DEFAULT_SAVE)}),false);assert.equal(kiro.tony_cleanup.lineKey,'photoquest.kiro_cleanup');
});

test('accepted sleeping loop keeps every native frame and freezes its local clock while paused',()=>{
 assert.equal(toniSleepAnimation.frameCount,64);assert.equal(toniSleepAnimation.frameDurationMs,75);
 assert.equal(sceneLayerAnimationFrame(toniSleepAnimation,4725),63);assert.equal(sceneLayerAnimationFrame(toniSleepAnimation,4800),0);
 let clock=ambientLayerClock(null,100,false,true);clock=ambientLayerClock(clock,175,false,true);assert.equal(clock.elapsed,75);
 clock=ambientLayerClock(clock,1000,true,true);assert.equal(clock.elapsed,75);clock=ambientLayerClock(clock,1100,false,true);assert.equal(clock.elapsed,75);clock=ambientLayerClock(clock,1175,false,true);assert.equal(clock.elapsed,150);
});
