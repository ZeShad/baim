import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const fixture=JSON.parse(readFileSync(new URL('../fixtures/mehana-bottle-reviewed-deltas.json',import.meta.url)));
const sha=x=>createHash('sha256').update(x).digest('hex');
// Restore only explicit task deltas before immutable historical comparisons.
// Any unexpected byte in a changed file fails, rather than escaping preservation.
export function stripBottleQuest(path,source){
 const record=fixture.records[path];if(!record)return source;
 source=source.toString();assert.equal(sha(source),record.afterSHA256,'bound bottle quest changes: '+path);
 const lines=source.split('\n');
 for(const h of [...record.hunks].reverse()){
  assert.deepEqual(lines.slice(h.at,h.at+h.added.length),h.added,path);
  lines.splice(h.at,h.added.length,...h.removed);
 }
 const original=lines.join('\n');assert.equal(sha(original),record.beforeSHA256,'fixed PR53 baseline: '+path);
 return original;
}
