import test from 'node:test';
import assert from 'node:assert/strict';
import {chapter1} from '../src/content/chapter1/index.js';
import {isWalkable,findWalkPath,nearestReachableWalkablePoint} from '../src/engine/SceneGeometry.js';
import {sceneZIndexForPoint} from '../src/engine/Renderer.js';
const scene=chapter1.scenes.find(s=>s.id==='scene.chapter1.mehana');
const layer=asset=>scene.foregroundLayers.find(l=>l.asset===asset);

test('every reachable tavern cell stays in front of the counter while preserving independent table planes',()=>{
 let inspected=0;
 for(let y=0;y<72;y++)for(let x=0;x<128;x++){
  const feet={x:x*10+5,y:y*10+5};if(!isWalkable(scene,feet))continue;
  inspected++;assert.ok(findWalkPath(scene,scene.playerStart,feet).length,JSON.stringify(feet)+' connected');
  if(feet.x>=500)assert.ok(sceneZIndexForPoint(scene,feet)<layer('mehanaCounterFront').zIndex,JSON.stringify(feet)+' counter cannot cut the player');
  assert.ok(!(feet.x>190&&feet.x<610&&feet.y>445&&feet.y<650),'no chair/table footprint');
 }
 assert.ok(inspected>650);
 const central={x:670,y:590},rear={x:610,y:550},front={x:400,y:680};
 assert.ok(sceneZIndexForPoint(scene,central)<layer('leftTablePlayerOccluder').zIndex,'aisle is in front of left furniture');
 assert.ok(sceneZIndexForPoint(scene,central)>layer('rightTablePlayerOccluder').zIndex,'aisle stays behind right furniture');
 for(const asset of ['leftTablePlayerOccluder','rightTablePlayerOccluder']){
  assert.ok(sceneZIndexForPoint(scene,rear)>layer(asset).zIndex);
  assert.ok(sceneZIndexForPoint(scene,front)<layer(asset).zIndex);
 }
});

test('reported chair/bar destinations project onto safe floor and routes cannot cut across the chair corner',()=>{
 const rejected=[{x:550,y:565},{x:550,y:600},{x:610,y:600},{x:600,y:620},{x:650,y:505},{x:750,y:505},{x:810,y:515}];
 const starts=[scene.playerStart,{x:400,y:680},{x:610,y:550},{x:650,y:550},{x:740,y:580}];
 for(const click of rejected){assert.equal(isWalkable(scene,click),false,JSON.stringify(click));for(const from of starts){
  const to=nearestReachableWalkablePoint(scene,from,click);assert.ok(to);assert.equal(isWalkable(scene,to),true);
  const path=findWalkPath(scene,from,to);assert.ok(path.length);let previous=from;
  for(const end of path){const n=Math.max(1,Math.ceil(Math.hypot(end.x-previous.x,end.y-previous.y)));for(let i=0;i<=n;i++)assert.equal(isWalkable(scene,{x:previous.x+(end.x-previous.x)*i/n,y:previous.y+(end.y-previous.y)*i/n}),true);previous=end;}
 }}
});
