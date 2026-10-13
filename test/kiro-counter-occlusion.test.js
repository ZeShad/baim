import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Renderer} from '../src/engine/Renderer.js';
import {kiroOilAssets,kiroOilSequence} from '../src/content/art/kiroOilHandover.generated.js';

test('oil performance masks the moving actor with the full approved counter without changing motion',()=>{
  const original=JSON.parse(readFileSync('assets_src/characters/mehana_waiter/oil-handover-web-c01/recipe.json'));
  assert.deepEqual(kiroOilSequence.frames,original.frames);
  assert.equal(kiroOilSequence.durationMs,original.durationMs);
  assert.equal(kiroOilAssets[kiroOilSequence.occlusionAsset],'assets/chapter1/scenes/mehana/counter-front-redesign-v1.png');
});

test('missing performance mask safely falls back without drawing an unmasked sprite',()=>{
  const renderer=Object.create(Renderer.prototype);let draws=0;
  renderer.ctx={drawImage(){draws++;}};
  renderer.game={assets:{getSceneImage(){return null;},isLoaded(){return false;}}};
  const frame=kiroOilSequence.frames[0];
  assert.equal(renderer.drawScenePerformance({id:kiroOilSequence.sceneId},frame,{},kiroOilSequence.occlusionAsset),false);
  assert.equal(draws,0);
  assert.equal(renderer.drawScenePerformance({id:'other'},frame,{},null),true);
  assert.equal(draws,1);
});
