import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {usageFor,catalogRuntimeTiming} from '../tools/build-animation-catalog.mjs';
import {stripWalkingCatalogPromotion,stripMitkoDirectional} from './helpers/mitko-directional-preservation.js';
const fixture=JSON.parse(readFileSync('test/fixtures/walking-catalog-promotion.json','utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
test('catalog timing uses accepted runtime cadence and rejects stale selected ranges',()=>{
  assert.deepEqual(catalogRuntimeTiming('walk_east_start',8),{fps:20,duration:.4});
  assert.deepEqual(catalogRuntimeTiming('walk_east_stop',14),{fps:20,duration:.7});
  assert.throws(()=>catalogRuntimeTiming('walk_east_start',16),/range mismatch/);
  assert.ok(Math.abs(catalogRuntimeTiming('walk_south_loop',16).duration-.960)<1e-10);
  assert.ok(Math.abs(catalogRuntimeTiming('walk_north_loop',36).duration-.864)<1e-10);
});
test('retained walk source is runtime-ready without hiding enabled art or changing active loop status',()=>{
  const selection=JSON.parse(readFileSync('assets_src/characters/bai_mitko/external_animation_v1/external-animation-selection.json','utf8'));
  assert.equal(selection.animations.walk_east_short.use,true);
  assert.deepEqual(usageFor('walk_east_short',selection.animations.walk_east_short,'Walk','',{runtimeUsage:'retained'}),{status:'Runtime-ready',usage:'Retained source; not selected by the current automatic controller'});
  assert.equal(usageFor('walk_east_loop',selection.animations.walk_east_loop,'Walk','').status,'Live');
  assert.equal(usageFor('candidate',{reviewStatus:'runtime_review'},'Walk','',{runtimeUsage:'retained'}).status,'Runtime review');
});
test('catalog promotion changes only three descriptions and preserves every accepted runtime byte',()=>{
  assert.equal(sha(fixture.metadata.before),fixture.metadata.beforeSHA256);
  const before=JSON.parse(fixture.metadata.before),after=JSON.parse(readFileSync(fixture.metadata.path,'utf8'));
  assert.deepEqual(Object.keys(after),Object.keys(before));
  for(const [key,value]of Object.entries(before))if(!fixture.metadata.changedKeys.includes(key))assert.deepEqual(after[key],value,key);
  assert.match(after.walk_east_start.description,/200ms stationary withdrawal/);
  assert.match(after.walk_east_start.description,/1040ms/);
  assert.match(after.walk_east_stop.description,/without an arrival slowdown/);
  assert.match(after.walk_east_stop.description,/1088ms/);
  for(const [p,h]of Object.entries(fixture.acceptedRuntimeSHA256)){
    let bytes=readFileSync(p);const correction=fixture.helperCorrection;
    if(p===correction.path){
      assert.equal(sha(bytes),correction.afterSHA256,'exact reviewed preservation helper correction');
      assert.equal(sha(correction.before),correction.beforeSHA256,'original accepted helper bytes');
      bytes=correction.before;
    }
    assert.equal(sha(bytes),h,p);
  }
});

test('newest catalog inverse restores exact input before unchanged historical directional checks',()=>{
  const p=fixture.metadata.path,current=readFileSync(p),older=JSON.parse(readFileSync('test/fixtures/mitko-directional-deltas.json','utf8')).records[p];
  assert.equal(stripWalkingCatalogPromotion(p,current),fixture.metadata.before);
  assert.equal(sha(fixture.metadata.before),older.afterSHA256);
  assert.equal(stripMitkoDirectional(p,current),older.before);
  assert.equal(sha(stripMitkoDirectional(p,current)),older.beforeSHA256);
});

test('catalog inverse rejects unknown bytes and passes unrelated paths through unchanged',()=>{
  const p=fixture.metadata.path,current=readFileSync(p,'utf8');
  assert.throws(()=>stripMitkoDirectional(p,current+'\n'),/exact bound walking catalog promotion/);
  const changed=JSON.parse(current);changed.idle_east_1.description+=' unexpected edit';
  assert.throws(()=>stripMitkoDirectional(p,JSON.stringify(changed,null,2)+'\n'),/exact bound walking catalog promotion/);
  const unrelated=Buffer.from('unchanged');assert.equal(stripWalkingCatalogPromotion('unrelated/path',unrelated),unrelated);
});
test('generated catalog reflects the selected start and retained unused short source',()=>{
  const html=readFileSync('docs/bai-mitko-animation-catalog.html','utf8');
  assert.match(html,/200ms stationary withdrawal/);assert.match(html,/not automatically selected/);
  assert.match(html,/Retained source; not selected by the current automatic controller/);
  assert.match(html,/without an arrival slowdown/);
});
