import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {stripRestartLifecycle} from './helpers/restart-lifecycle-preservation.js';
import {stripMitkoDirectional} from './helpers/mitko-directional-preservation.js';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/restart-lifecycle-deltas.json',import.meta.url)));
const sha=x=>createHash('sha256').update(x).digest('hex');
for(const [path,record] of Object.entries(fixture.records))test('exact PR60 inversion and unexpected-byte rejection: '+path,()=>{
  const bytes=Buffer.from(stripMitkoDirectional(path,readFileSync(new URL('../'+path,import.meta.url))));
  assert.equal(sha(stripRestartLifecycle(path,bytes)),record.beforeSHA256);
  assert.throws(()=>stripRestartLifecycle(path,Buffer.concat([bytes,Buffer.from('\n')])),/bound restart lifecycle change/);
  assert.throws(()=>stripRestartLifecycle(path,bytes.subarray(1)),/bound restart lifecycle change/);
});
test('unrelated bytes are returned unchanged for the original preservation checks',()=>{
  const bytes=Buffer.from('unchanged');assert.equal(stripRestartLifecycle('unrelated',bytes),bytes);
});
