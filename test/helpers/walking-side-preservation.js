import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const fixture=JSON.parse(readFileSync(new URL('../fixtures/walking-side-deltas.json',import.meta.url)));
const sha=v=>createHash('sha256').update(v).digest('hex');
export function stripWalkingSide(path,source){
  const record=fixture.records[path];if(!record)return source;
  assert.equal(sha(source),record.afterSHA256,'exact walking/side interaction change: '+path);
  assert.equal(sha(record.before),record.beforeSHA256,'fixed input before walking/side interaction: '+path);
  return record.before;
}
