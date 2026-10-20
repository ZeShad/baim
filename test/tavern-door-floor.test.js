import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chapter1} from '../src/content/chapter1/index.js';
import {isWalkable,findWalkPath,nearestReachableWalkablePoint,findTargetAt} from '../src/engine/SceneGeometry.js';
const scene=chapter1.scenes.find(s=>s.id==='scene.chapter1.mehana');

test('door-side wall cells are blocked without changing any other floor or grounded entry',()=>{
 const path='assets_src/chapter1/scenes/mehana/walk-geometry-v1.json';
 const fixture=JSON.parse(readFileSync(new URL('./fixtures/tavern-door-floor-deltas.json',import.meta.url)));
 const current=readFileSync(path,'utf8'),lines=current.split('\n');
 for(const h of [...fixture.records[path].hunks].reverse())lines.splice(h.at,h.added.length,...h.removed);
 const before=JSON.parse(lines.join('\n')).raster.rows,after=scene.walkMask.rows;
 let removed=0;
 for(let y=0;y<72;y++)for(let x=0;x<128;x++){
  if(before[y][x]===after[y][x])continue;
  assert.equal(before[y][x],'c');assert.equal(after[y][x],'.');
  assert.ok(x>=6&&x<=18&&y>=44&&y<=52,'only old door/wall strip removed');removed++;
 }
 assert.equal(removed,117);
 for(let y=0;y<530;y++)for(let x=60;x<190;x++)assert.equal(isWalkable(scene,{x,y}),false);
 assert.deepEqual(scene.playerStart,{x:150,y:585});assert.equal(isWalkable(scene,scene.playerStart),true);
 const entry=chapter1.scenes.find(s=>s.id==='scene.chapter1.village_square').exits.find(e=>e.id==='exit.square.to_mehana');
 assert.deepEqual(entry.targetPosition,scene.playerStart);
 assert.equal(findTargetAt(scene,{x:100,y:300},()=>true)?.id,'exit.mehana.to_square','ordinary door click still exits');
});

test('high door clicks stop on connected floor from all conversation and foreground approaches',()=>{
 const starts=[scene.playerStart,{x:400,y:680},{x:610,y:550},{x:650,y:550},{x:740,y:580}];
 for(const click of [{x:185,y:445},{x:185,y:505},{x:100,y:520},{x:65,y:445},{x:180,y:529}]){
  assert.equal(isWalkable(scene,click),false);
  for(const from of starts){
   const to=nearestReachableWalkablePoint(scene,from,click);assert.ok(to);assert.ok(to.y>=530);
   const path=findWalkPath(scene,from,to);assert.ok(path.length);let previous=from;
   for(const end of path){const n=Math.max(1,Math.ceil(Math.hypot(end.x-previous.x,end.y-previous.y)));
    for(let i=0;i<=n;i++){const point={x:previous.x+(end.x-previous.x)*i/n,y:previous.y+(end.y-previous.y)*i/n};
     assert.equal(isWalkable(scene,point),true);if(point.x<190)assert.ok(point.y>=530);
    }previous=end;
   }
  }
 }
});
