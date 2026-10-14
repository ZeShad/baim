// Headless PR60 lifecycle regressions. No live storage, assets or browser required.
import test from 'node:test';
import assert from 'node:assert/strict';
import {game,papers,register,box,interview,support,leave,use,reload,target,talk,choose,sid,Game,DialogueSystem,SaveSystem,DEFAULT_SAVE} from './helpers/restart-lifecycle-fixture.js';

function restart(g, answer = true) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'confirm');
  globalThis.confirm = () => answer;
  try { g.restartGame(); }
  finally {
    if (descriptor) Object.defineProperty(globalThis, 'confirm', descriptor);
    else delete globalThis.confirm;
  }
}
function observe(g) {
  const events = [], storage = g.saveSystem.storage;
  for (const name of ['getItem','setItem','removeItem']) {
    const original = storage[name].bind(storage);
    storage[name] = (...args) => { events.push([name,...args]); return original(...args); };
  }
  return {writes: () => events.filter(e => e[0] === 'setItem').length,
    raw: () => storage.getItem(g.saveSystem.key)};
}
function deferredLoads(g) {
  const loads = [];
  g.assets.preloadSceneAssets = scene => new Promise((resolve,reject) => loads.push({scene,resolve,reject}));
  return loads;
}
async function ballot(g) {
  await papers(g); await register(g); await box(g);
  talk(g,'npc.journalist'); choose(g,'dialogue.journalist.choice.begin');
  choose(g,'dialogue.journalist.roads.choice.heritage');
  choose(g,'dialogue.journalist.complaints.choice.counted');
  assert.equal(g.dialogue.current.nodeId,'ballot_box');
  return g.dialogue.getNode().choices.find(c => c.textKey === 'dialogue.journalist.ballot_box.choice.pickles');
}
function snapshot(g, o) {
  return {state:structuredClone(g.state), raw:o.raw(), scene:g.currentScene.id, writes:o.writes()};
}
function unchanged(g,o,before) { assert.deepEqual(snapshot(g,o),before); }
function fresh(g,o) {
  assert.deepEqual(g.state,DEFAULT_SAVE);
  assert.equal(g.currentScene.id,sid('apartment'));
  assert.deepEqual(JSON.parse(o.raw()),DEFAULT_SAVE);
  // Real load may add migration flags; verify the persisted destination and quest fields.
  const loaded=g.saveSystem.load();
  assert.equal(loaded.currentSceneId,sid('apartment'));
  assert.equal(loaded.journalistInterviewCompleted,false);
  assert.deepEqual(loaded.completedQuests,[]);
}
// Minimal DOM adapter captures listeners installed by REAL Game.createDialogue.
// It does not replace createDialogue, chooseDialogueChoice or any lifecycle method.
function renderedButton(g,key) {
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'document');
  const nodes=[];
  globalThis.document={createElement(tag) {
    const n={tag,children:[],listeners:{},classList:{add(){}},
      appendChild(c){this.children.push(c);},
      get childElementCount(){return this.children.length;},
      addEventListener(name,fn){this.listeners[name]=fn;}};
    nodes.push(n);return n;
  }};
  try {
    g.createDialogue(g.dialogue.getNode());
    const b=nodes.find(n=>n.tag==='button' && n.textContent===key);
    assert.ok(b,'real rendered button '+key);return b.listeners.click;
  } finally {
    if(descriptor)Object.defineProperty(globalThis,'document',descriptor);else delete globalThis.document;
  }
}
test('fixture uses real lifecycle, dialogue and storage methods',()=>{
  const g=game();assert.ok(g instanceof Game);assert.ok(g.dialogue instanceof DialogueSystem);assert.ok(g.saveSystem instanceof SaveSystem);
  for(const name of ['restartGame','reset','changeScene','chooseDialogueChoice','applyDialogueEffect','save','createDialogue'])assert.equal(g[name],Game.prototype[name]);
  for(const name of ['choose','close'])assert.equal(g.dialogue[name],DialogueSystem.prototype[name]);
  for(const name of ['save','load','reset'])assert.equal(g.saveSystem[name],SaveSystem.prototype[name]);
});
test('D2: retained journalist choice cannot mutate or save after Restart',async()=>{
  const g=game(),o=observe(g),old=await ballot(g);
  restart(g);fresh(g,o);const before=snapshot(g,o);
  assert.equal(g.dialogue.current,null);assert.equal(g.dialogue.entry,null);
  assert.equal(g.chooseDialogueChoice(old,{detail:0}),false);unchanged(g,o,before);
});
test('D2: direct DialogueSystem dispatch after close has no effects',async()=>{
  const g=game(),o=observe(g),old=await ballot(g);g.dialogue.close();const before=snapshot(g,o);
  assert.equal(g.dialogue.choose(old),false);unchanged(g,o,before);
});
test('D2: delayed old-node input rejected while a different node is current',async()=>{
  const g=game(),o=observe(g),old=await ballot(g);
  assert.equal(g.chooseDialogueChoice(old,{detail:0}),true);const before=snapshot(g,o);
  assert.equal(g.chooseDialogueChoice(old,{detail:0}),false);unchanged(g,o,before);
});
for(const detail of [0,1])test('D2: detached UI callback rejected even after same shared choice is reached again, detail='+detail,async()=>{
  const g=game(),o=observe(g),old=await ballot(g);
  const click=renderedButton(g,old.textKey);
  restart(g);await ballot(g);assert.equal(g.dialogue.getNode().choices.includes(old),true);
  const before=snapshot(g,o);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(click({detail}),false);unchanged(g,o,before);
  const current=renderedButton(g,old.textKey);
  assert.equal(current({detail}),true);
  assert.equal(g.state.journalistInterviewCompleted,true);
  assert.equal(g.saveSystem.load().journalistInterviewCompleted,true);
});
test('D2: canceled Restart preserves session and accepts existing UI callback',async()=>{
  const g=game(),o=observe(g),old=await ballot(g),entry=g.dialogue.entry;
  const click=renderedButton(g,old.textKey),before=snapshot(g,o);
  restart(g,false);assert.equal(g.dialogue.entry,entry);unchanged(g,o,before);
  assert.equal(click({detail:0}),true);assert.equal(g.saveSystem.load().journalistInterviewCompleted,true);
});
test('D2: valid fresh dialogue and choicesFrom survive UI refresh and language change',async()=>{
  const g=game();restart(g);await papers(g);talk(g,'npc.journalist');
  const node=g.dialogue.getNode(),definition=g.content.dialogues[g.dialogue.current.id];
  const source=node.choicesFrom?definition.nodes[node.choicesFrom]:node;
  const choice=source.choices.find(c=>g.dialogueChoiceAvailable(c));
  const click=renderedButton(g,choice.textKey);g.setLanguage('en');renderedButton(g,choice.textKey); // UI refresh keeps the entry identity
  assert.equal(click({detail:0}),true);
  const id='test.choicesFrom';
  g.dialogue.dialoguesById={...g.content.dialogues,[id]:{nodes:{start:{choicesFrom:'menu'},menu:{choices:[{textKey:'test.return',next:'start'}]}}}};
  g.content={...g.content,dialogues:g.dialogue.dialoguesById};g.dialogue.start(id);
  const shared=g.dialogue.getNode();const callback=renderedButton(g,'test.return');
  assert.equal(callback({detail:0}),true);assert.equal(g.dialogue.getNode(),shared);
  assert.equal(callback({detail:0}),false,'old entry rejected after same-node re-entry');
  assert.equal(renderedButton(g,'test.return')({detail:0}),true);
});
for(const outcome of ['resolve','reject'])test('D6: old preload '+outcome+' after Restart cannot replace or save apartment',async()=>{
  const g=game(),o=observe(g),loads=deferredLoads(g);
  const pending=g.changeScene(sid('election_booth'));const oldToken=g.sceneLoadToken;
  restart(g);fresh(g,o);const before=snapshot(g,o);
  // Attach a rejection observer before settling so baseline failures remain controlled.
  const settled=pending.then(()=>null,error=>error);
  loads[0][outcome](outcome==='reject'?new Error('late art'):undefined);
  const error=await settled;
  assert.equal(error,null,'obsolete failure is consumed');
  assert.notEqual(g.sceneLoadToken,oldToken);assert.equal(g.sceneTransitionPending,false);
  unchanged(g,o,before);fresh(g,o);
});
for(const outcome of ['resolve','reject'])test('D6: stale '+outcome+' cannot clear a newer pending transition',async()=>{
  const g=game(),o=observe(g),loads=deferredLoads(g);
  const old=g.changeScene(sid('election_booth'));restart(g);
  const latest=g.changeScene(sid('village_square')),token=g.sceneLoadToken,before=snapshot(g,o);
  const settled=old.then(()=>null,error=>error);loads[0][outcome](new Error('obsolete'));
  assert.equal(await settled,null);assert.equal(g.sceneLoadToken,token);assert.equal(g.sceneTransitionPending,true);unchanged(g,o,before);
  loads[1].resolve();await latest;assert.equal(g.sceneTransitionPending,false);
  assert.equal(g.currentScene.id,sid('village_square'));assert.equal(g.saveSystem.load().currentSceneId,sid('village_square'));
});
for(const order of [[0,1],[1,0]])test('D6: overlapping current loads are latest-wins, completion order '+order,async()=>{
  const g=game(),o=observe(g),loads=deferredLoads(g);
  const promises=[g.changeScene(sid('mehana')),g.changeScene(sid('village_square'))];
  loads[order[0]].resolve();await promises[order[0]];
  if(order[0]===0){assert.equal(g.sceneTransitionPending,true);assert.equal(o.writes(),0);}
  loads[order[1]].resolve();await promises[order[1]];
  assert.equal(g.currentScene.id,sid('village_square'));assert.equal(g.saveSystem.load().currentSceneId,sid('village_square'));assert.equal(o.writes(),1);
});
test('D6: canceled Restart leaves pending transition valid',async()=>{
  const g=game(),o=observe(g),loads=deferredLoads(g),pending=g.changeScene(sid('village_square')),token=g.sceneLoadToken;
  restart(g,false);assert.equal(g.sceneLoadToken,token);assert.equal(g.sceneTransitionPending,true);assert.equal(o.writes(),0);
  loads[0].resolve();await pending;assert.equal(g.saveSystem.load().currentSceneId,sid('village_square'));
});
test('D6: repeated restarts invalidate every old load; valid new load saves position',async()=>{
  const g=game(),o=observe(g),loads=deferredLoads(g),pending=[];
  for(let i=0;i<3;i++){pending.push(g.changeScene(sid('mehana')));restart(g);fresh(g,o);}
  const before=snapshot(g,o);for(const load of loads)load.resolve();await Promise.all(pending);unchanged(g,o,before);
  const latest=g.changeScene(sid('village_square'),{x:123,y:456});loads[3].resolve();await latest;
  assert.deepEqual(g.player.position,{x:123,y:456});assert.equal(g.saveSystem.load().currentSceneId,sid('village_square'));
});
test('D6: current preload failure still rejects, clears pending and does not save',async()=>{
  const g=game(),o=observe(g),loads=deferredLoads(g),pending=g.changeScene(sid('mehana'));
  const rejection=assert.rejects(pending,/current art failure/);loads[0].reject(new Error('current art failure'));await rejection;
  assert.equal(g.sceneTransitionPending,false);assert.equal(g.currentScene.id,sid('apartment'));assert.equal(o.writes(),0);
});
test('D6: direct reset invalidates an old load without resurrecting a removed save',async()=>{
  const g=game(),o=observe(g),loads=deferredLoads(g),pending=g.changeScene(sid('mehana'));
  g.reset();const before=snapshot(g,o);loads[0].resolve();await pending;unchanged(g,o,before);
  assert.equal(g.sceneTransitionPending,false);assert.equal(o.raw(),undefined);
});
for(const cancel of [true,false])test('Restart during pending Kiro handover, confirm='+!cancel,async()=>{
  const g=game(),o=observe(g);await g.changeScene(sid('mehana'));g.assets.isLoaded=()=>true;
  talk(g,'npc.mehana_waiter');choose(g,'fountain.kiro.choice.refill');assert.equal(g.sceneAction.active,true);
  restart(g,!cancel);const before=snapshot(g,o);g.updateSceneAction(30);
  if(cancel){assert.equal(g.inventory.has('item.sunflower_oil'),true);assert.equal(g.saveSystem.load().hasSunflowerOil,true);}
  else{unchanged(g,o,before);fresh(g,o);assert.equal(g.sceneAction.active,false);}
});
test('Restart interrupts fountain blackout before commit; late updates cannot refill fresh state',async()=>{
  const g=game(),o=observe(g);await g.changeScene(sid('mehana'));
  talk(g,'npc.mehana_waiter');choose(g,'fountain.kiro.choice.refill');g.closeReceivedItem();
  await g.changeScene(sid('village_square'));g.assets.isLoaded=()=>true;
  use(g,'hotspot.square.statue','item.sunflower_oil');g.updateSceneAction(.2);
  assert.equal(g.state.flags.fountainRepaired,undefined);assert.equal(g.sceneAction.active,true);
  restart(g);const before=snapshot(g,o);g.updateSceneAction(30);unchanged(g,o,before);fresh(g,o);
});
for(const [label,opts,ending] of [
  ['neither',{baba:false,tony:false},'loss'],
  ['Baba',{baba:true,tony:false,papers:'combine'},'narrow_win'],
  ['Tony',{baba:false,tony:true},'narrow_win'],
  ['both',{baba:true,tony:true,papers:'combine'},'convincing_win'],
  ['both, unpopular interview',{baba:true,tony:true,answers:['inventory','not_ours','training']},'narrow_win']
])test('preservation: full logic route and persisted ending '+label,async()=>{
  const g=game();await papers(g,opts.papers);await support(g,opts);await register(g);await box(g);await interview(g,opts.answers);
  await leave(g,'exit.square.to_election_booth');use(g,'hotspot.election_booth.commission_table','item.ballot_box');reload(g);
  use(g,'hotspot.election_booth.commission_table');
  for(const name of ['container','credentials','evidence']){choose(g,'election.ask.'+name);choose(g,'election.answer.'+name);choose(g,'election.continue');}
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'confirm');
  try {
    const before=structuredClone(g.state);globalThis.confirm=()=>false;
    const count=g.dialogue.getNode().choices.find(c=>c.textKey==='election.count');
    assert.equal(g.chooseDialogueChoice(count,{detail:0}),false);assert.deepEqual(g.state,before);
    globalThis.confirm=()=>true;choose(g,'election.count');
  } finally {if(descriptor)Object.defineProperty(globalThis,'confirm',descriptor);else delete globalThis.confirm;}
  assert.equal(g.state.endingId,'ending.chapter1.'+ending);reload(g);
  assert.equal(g.state.chapter1Completed,true);assert.equal(g.state.endingId,'ending.chapter1.'+ending);
  assert.equal(g.requestEnding({groupId:'ending.chapter1'}),false);
});
