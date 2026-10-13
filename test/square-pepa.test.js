import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {chapter1} from '../src/content/chapter1/index.js';
import {assetManifest} from '../src/content/art/assetManifest.js';
import {sceneLayerAnimationFrame} from '../src/engine/Renderer.js';

test('Owner-selected Hydra c14 preserves native timing, bounded atlas and fallback',async()=>{
 const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
 const dir='assets_src/chapter1/scenes/village_square/redesign-c05/pepa-kiosk-breathing-5s-animate-hydra-c14';
 const provenance=JSON.parse(readFileSync(dir+'/runtime-provenance-r03.json'));
 assert.equal(sha(dir+'/original.png'),'301f37aa4599100700a340a926f513a4197fe1add068f7d48ca61aba17512f4d');
 assert.equal(provenance.durationMs,4392);
 const square=chapter1.scenes.find(s=>s.id==='scene.chapter1.village_square');
 const layer=square.foregroundLayers.find(l=>l.id==='layer.square.pepa_idle');
 assert.equal(layer.animation.frameCount*layer.animation.frameDurationMs,4392);
 assert.equal(sceneLayerAnimationFrame(layer.animation,4391),35);assert.equal(sceneLayerAnimationFrame(layer.animation,4392),0);
 assert.equal(layer.animation.freezeWhenPaused,true);assert.equal(layer.talkAnimation,undefined);
 const assets=assetManifest.scenes[square.id];assert.equal(sha(assets.squarePepaIdle),provenance.outputSha256);
 assert.equal(sha(assets.background),'e59e6870fa2fba824d22cc0da8045d9643222d47ebe33e4500e506e5f1e57950');
 assert.equal(sha(assets.squareFlagWind),'c91b1fd23688d1633d8e2fc4039af750388331f4f81388b7ec8038a553d60e15');
 const meta=await sharp(assets.squarePepaIdle).metadata();assert.equal(meta.width,840);assert.equal(meta.height,840);
 const {data,info}=await sharp(assets.squarePepaIdle).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(let frame=0;frame<36;frame++){const x=frame%6*140,y=Math.floor(frame/6)*140;
  for(let p=0;p<140;p++)for(const [cx,cy] of [[x+p,y],[x+p,y+139],[x,y+p],[x+139,y+p]])assert.equal(data[(cy*info.width+cx)*4+3],0,'bounded frame '+frame);}
 const first=await sharp(assets.squarePepaIdle).extract({left:0,top:0,width:140,height:140}).raw().toBuffer();
 assert.deepEqual(await sharp(assets.squarePepaStill).raw().toBuffer(),first,'static fallback is frame0');
 assert.ok(layer.zIndex>square.foregroundLayers.find(l=>l.id==='layer.square.kiosk_counter').zIndex,'actor behind counter');
});
