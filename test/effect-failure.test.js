import test from 'node:test';
import assert from 'node:assert/strict';
import {applyEffects} from '../src/engine/EffectSystem.js';
import {InventorySystem} from '../src/engine/InventorySystem.js';
import {QuestSystem} from '../src/engine/QuestSystem.js';
import {DialogueSystem} from '../src/engine/DialogueSystem.js';
import {resolveEnding} from '../src/engine/EndingSystem.js';
import {Game} from '../src/engine/Game.js';
import {SceneActionSequence} from '../src/engine/SceneActionSequence.js';
import {kiroOilSequence} from '../src/content/art/kiroOilHandover.generated.js';
import {DEFAULT_SAVE, VERBS} from '../src/engine/ids.js';

const replace = {type:'replaceItem', itemId:'source', withItemId:'destination'};
const prefix = [{type:'setFlag',key:'early'}, {type:'setState',key:'tonyVote',value:true},
  {type:'adjustState',key:'influence',amount:4,timestampKey:'fixtureChangedAt'},
  {type:'addItem',itemId:'reward'}, {type:'startQuest',questId:'new'},
  {type:'completeQuest',questId:'old'}, {type:'expireQuest',questId:'expiring'}];
function context(overrides={}) {
  const state={...structuredClone(DEFAULT_SAVE),inventory:['source'],activeQuests:['old','expiring'],...overrides};
  return {state,inventory:new InventorySystem({},state),quests:new QuestSystem({},state),now:()=>123};
}
function gameFor(c=context()) {
  const g=Object.assign(Object.create(Game.prototype),c,{player:{},currentScene:{id:'scene'},calls:[]});
  for(const name of ['save','renderUi','setStatusMessage','setNpcSpeechMessage','changeScene','protectCurrentAssetWorkingSet'])
    g[name]=(...args)=>g.calls.push([name,...args]);
  g.audio={play:cue=>g.calls.push(['sound',cue])};g.t=key=>key;g.sceneMovementSpeed=()=>1;
  return g;
}
for(const overrides of [{inventory:[]},{inventory:['source','destination']},
  {droppedItems:[{itemId:'destination'}]}]) test('whole effect batch rolls back on replacement conflict '+JSON.stringify(overrides),()=>{
  const c=context(overrides), before=structuredClone(c.state),flags=c.state.flags,items=c.state.inventory;
  assert.equal(applyEffects([...prefix,replace,{type:'setFlag',key:'later'}],c),false);
  assert.deepEqual(c.state,before);assert.equal(c.state.flags,flags);assert.equal(c.state.inventory,items);
});
test('later replacement failure rolls back earlier replacement and dependent conditional effects',()=>{
  const c=context(),before=structuredClone(c.state);
  assert.equal(applyEffects([replace,{type:'setFlag',key:'conditional',requirements:{items:['destination']}},replace],c),false);
  assert.deepEqual(c.state,before);
});
test('success is explicit, conditions see preceding changes, and no-op batches succeed',()=>{
  const c=context();assert.equal(applyEffects([],c),true);
  assert.equal(applyEffects([...prefix,replace,{type:'setFlag',key:'conditional',requirements:{items:['destination']}},
    {type:'replaceItem',itemId:'missing',withItemId:'other',requirements:{flags:['never']}}],c),true);
  assert.equal(c.state.flags.conditional,true);assert.ok(c.inventory.has('reward'));assert.ok(c.inventory.has('destination'));
  assert.ok(c.state.completedQuests.includes('old'));assert.ok(c.state.expiredQuests.includes('expiring'));
});
test('invalid effects throw without leaving partial state',()=>{
  const c=context(),before=structuredClone(c.state);
  assert.throws(()=>applyEffects([...prefix,{type:'typo'}],c),/Unknown content effect/);assert.deepEqual(c.state,before);
});
test('actual content caller suppresses success UI, sound, save and scene transition',()=>{
  const g=gameFor(context({inventory:['source','destination']})),before=structuredClone(g.state);
  assert.equal(g.applyContentEffect({effects:[...prefix,replace],soundCue:'success',messageKey:'success',sceneTransition:{sceneId:'next'}}),false);
  assert.deepEqual(g.state,before);assert.deepEqual(g.calls,[['renderUi']]);
});
test('intentional reject effects and successful messaging still apply',()=>{
  const g=gameFor();assert.equal(g.applyContentEffect({reject:true,messageKey:'refusal',effects:[{type:'adjustState',key:'suspicion',amount:2}]}),true);
  assert.equal(g.state.suspicion,2);assert.ok(g.calls.some(c=>c[0]==='save'));
  assert.deepEqual(g.calls.find(c=>c[0]==='setStatusMessage'),['setStatusMessage','refusal',{reject:true}]);
});
for(const next of [undefined,'reward']) test('failed dialogue choice does not advance or close '+next,()=>{
  const g=gameFor(context({inventory:[]}));g.player.speaking=true;
  g.dialogue=new DialogueSystem({dialogue:{nodes:{start:{},reward:{}}}},null,e=>g.applyDialogueEffect(e));
  g.dialogue.start('dialogue');const entry=g.dialogue.entry;
  assert.equal(g.chooseDialogueChoice({effect:{effects:[...prefix,replace]},next},{detail:0}),false);
  assert.equal(g.dialogue.entry,entry);assert.equal(g.dialogue.current.nodeId,'start');assert.equal(g.player.speaking,true);
});
test('failed pickup rolls back item grant and take flags',()=>{
  const g=gameFor();g.targetAvailable=()=>true;const before=structuredClone(g.state);
  assert.equal(g.takeTarget({takeItemId:'pickup',flagOnTake:'taken',takeEffects:[...prefix,{...replace,itemId:'missing'}]}),false);
  assert.deepEqual(g.state,before);assert.deepEqual(g.calls,[]);
});
test('animated pickup failure blocks completion rewards and success message',()=>{
  const g=gameFor(),before=structuredClone(g.state);
  const action={verb:VERBS.TAKE,target:{takeItemId:'pickup',flagOnTake:'taken',takeEffects:[{...replace,itemId:'missing'}]},
    sequence:{flagOnComplete:'completed',messageKey:'success',holdFinalFrame:false,effectsOnComplete:prefix}};
  g.applyInteractionActionSequenceEffect(action);g.completeInteractionActionSequence(action);
  assert.deepEqual(g.state,before);assert.deepEqual(g.calls,[]);
});
test('completion effect failure rolls back completion flag and suppresses message/save',()=>{
  const g=gameFor(),before=structuredClone(g.state);
  g.completeInteractionActionSequence({verb:VERBS.USE,sequence:{flagOnComplete:'completed',messageKey:'success',holdFinalFrame:false,effectsOnComplete:[...prefix,{...replace,itemId:'missing'}]}});
  assert.deepEqual(g.state,before);assert.deepEqual(g.calls,[]);
});
test('pickup deferred to completion combines grant, take and completion effects atomically',()=>{
  const g=gameFor(),before=structuredClone(g.state);g.targetAvailable=()=>true;
  g.completeInteractionActionSequence({verb:VERBS.TAKE,target:{takeItemId:'pickup',flagOnTake:'taken',takeEffects:prefix},
    sequence:{flagOnComplete:'completed',messageKey:'success',holdFinalFrame:false,effectsOnComplete:[{...replace,itemId:'missing'}]}});
  assert.deepEqual(g.state,before);assert.deepEqual(g.calls,[]);
});
test('stale content requirements reject before sound or other effects',()=>{
  const g=gameFor(),before=structuredClone(g.state);
  assert.equal(g.applyContentEffect({requirements:{flags:['notSet']},effects:prefix,messageKey:'success',soundCue:'success'}),false);
  assert.deepEqual(g.state,before);assert.deepEqual(g.calls,[['renderUi']]);
});
test('ending-trigger effects share the ending batch and cannot leave rewards on failure',()=>{
  const c=context(),before=structuredClone(c.state);
  assert.equal(resolveEnding([{id:'ending',effects:[{type:'setFlag',key:'endingReward'}, {...replace,itemId:'missing'}]}],c,prefix),null);
  assert.deepEqual(c.state,before);
});
test('failed delayed scene action dismisses reward presentation without saving or replay',()=>{
  const g=gameFor(),before=structuredClone(g.state);let resets=0;
  g.sceneAction={active:true,state:{phase:'received'},update(){},reset(){this.active=false;resets++;}};
  g.sceneActionEffect={effects:[...prefix,{...replace,itemId:'missing'}]};g.updateSceneAction(0);g.updateSceneAction(0);
  assert.deepEqual(g.state,before);assert.equal(resets,1);assert.equal(g.sceneActionEffect,null);
  assert.deepEqual(g.calls,[['renderUi']]);
});
test('failed ending effects do not resolve ending or report keys',()=>{
  const c=context(),before=structuredClone(c.state);
  assert.equal(resolveEnding([{id:'ending',effects:[...prefix,{...replace,itemId:'missing'}]}],c),null);
  assert.deepEqual(c.state,before);
});
test('immediate missing-art scene fallback propagates failure to its starting caller',()=>{
  const g=gameFor(),before=structuredClone(g.state);
  g.currentScene.id=kiroOilSequence.sceneId;g.sceneAction=new SceneActionSequence();
  g.assets={getItemImage(){},getSceneImage(){},isLoaded:()=>false};g.hideSpeechBubble=()=>{};
  assert.equal(g.startSceneAction({sceneSequence:kiroOilSequence.id,effects:[...prefix,{...replace,itemId:'missing'}]}),false);
  assert.deepEqual(g.state,before);assert.equal(g.sceneAction.active,false);assert.equal(g.sceneActionEffect,null);
  assert.deepEqual(g.calls,[['renderUi']]);
});
test('delayed scene action rechecks stale requirements before granting anything',()=>{
  const g=gameFor(),before=structuredClone(g.state);
  g.sceneAction={active:true,state:{phase:'received'},update(){},reset(){this.active=false;}};
  g.sceneActionEffect={requirements:{flags:['notSet']},effects:prefix};
  assert.equal(g.updateSceneAction(0),false);assert.deepEqual(g.state,before);assert.equal(g.sceneAction.active,false);
  assert.deepEqual(g.calls,[['renderUi']]);
});
test('actual ending caller rejects failed effects without ending sound, presentation or success save',()=>{
  const g=gameFor(),before=structuredClone(g.state),originalConfirm=globalThis.confirm;
  g.content={endings:[{id:'ending',groupId:'group',effects:[...prefix,{...replace,itemId:'missing'}],soundCue:'success'}]};
  try {
    globalThis.confirm=()=>true;assert.equal(g.requestEnding({groupId:'group'}),false);
  }finally{globalThis.confirm=originalConfirm;}
  assert.deepEqual(g.state,before);
  // The existing pre-confirmation snapshot remains; no post-failure save occurs.
  assert.deepEqual(g.calls,[['save'],['setStatusMessage','msg.election.not_ready',{reject:true}]]);
});
