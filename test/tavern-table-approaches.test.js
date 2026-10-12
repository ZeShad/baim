import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import sharp from 'sharp';
import {chapter1} from '../src/content/chapter1/index.js';
import {isWalkable,findWalkPath} from '../src/engine/SceneGeometry.js';
import {sceneDepthT,sceneZDepthT} from '../src/engine/DepthMath.js';
import {sceneZIndexForPoint} from '../src/engine/Renderer.js';
const scene=chapter1.scenes.find(s=>s.id==='scene.chapter1.mehana');

test('both talk destinations and behind-left-chair position have connected furniture-safe return routes',()=>{
 const kiro=scene.npcs.find(n=>n.id==='npc.mehana_waiter'),tony=scene.npcs.find(n=>n.id==='npc.tony_fridge');
 assert.deepEqual(kiro.interactionApproach,{x:650,y:550});assert.deepEqual(tony.interactionApproach,{x:740,y:580});assert.equal(tony.interactionApproachExact,true);
 const points=[scene.playerStart,{x:400,y:680},{x:610,y:550},{x:550,y:565},kiro.interactionApproach,tony.interactionApproach];
 for(const from of points)for(const to of points){assert.equal(isWalkable(scene,to),true);const path=findWalkPath(scene,from,to);assert.ok(path.length);let prev=from;for(const end of path){const count=Math.max(1,Math.ceil(Math.hypot(end.x-prev.x,end.y-prev.y)));for(let i=0;i<=count;i++)assert.equal(isWalkable(scene,{x:prev.x+(end.x-prev.x)*i/count,y:prev.y+(end.y-prev.y)*i/count}),true);prev=end;}}
 for(const point of [{x:770,y:440},{x:790,y:470},{x:450,y:480},{x:850,y:550},{x:1100,y:570}])assert.equal(isWalkable(scene,point),false,'no bar/table-centre access');
});

test('furniture draws in front of rear approaches and behind foreground player without perspective jumps',()=>{
 const layer=scene.foregroundLayers.find(l=>l.asset==='leftTablePlayerOccluder');
 for(const point of [{x:610,y:550},{x:610,y:580},{x:550,y:565}]){
  assert.ok(sceneZIndexForPoint(scene,point)>layer.zIndex);
  assert.equal(sceneDepthT(scene,point),sceneDepthT({...scene,depthZones:[]},point),'occlusion-only zones preserve continuous actor scale');
 }
 assert.equal(sceneZDepthT(scene,{x:610,y:580}),.75);
 assert.ok(sceneZIndexForPoint(scene,{x:400,y:680})<layer.zIndex);
 assert.ok(sceneZIndexForPoint(scene,{x:740,y:580})>scene.foregroundLayers.find(l=>l.asset==='rightTablePlayerOccluder').zIndex);
 assert.equal(sceneDepthT(scene,{x:740,y:580}),sceneDepthT(scene,{x:740,y:550}),'lower Tony stop keeps its standing size');
 assert.equal(sceneZDepthT(scene,{x:740,y:580}),.75,'lower stop stays behind the right table');
});

test('new furniture masks use exact current painting pixels with transparent floor gaps and no stale rear chair',async()=>{
 const spec=JSON.parse(fs.readFileSync('assets_src/chapter1/scenes/mehana/table-player-occluders-v1.json'));
 const original=await sharp(spec.source).ensureAlpha().raw().toBuffer();
 for(const [name,table] of Object.entries(spec.tables)){
  const {data,info}=await sharp(table.output).ensureAlpha().raw().toBuffer({resolveWithObject:true});let retained=0;
  for(let i=0;i<data.length;i+=4)if(data[i+3]){retained++;assert.deepEqual(data.subarray(i,i+4),original.subarray(i,i+4));}
  assert.ok(retained>20000);
  for(const [x,y] of [[550,380],[620,480],[620,650],[660,550],[450,625],[900,700]])assert.equal(data[(y*info.width+x)*4+3],0,'floor/retired chair transparent: '+name+':'+x+','+y);
  const [x,y]=name==='left'?[540,440]:[790,515];assert.equal(data[(y*info.width+x)*4+3],255,'actual furniture covers rear player');
 }
});
