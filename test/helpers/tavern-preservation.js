import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const fixture=JSON.parse(readFileSync(new URL('../fixtures/tavern-reviewed-deltas.json',import.meta.url)));
const followup=JSON.parse(readFileSync(new URL('../fixtures/tavern-table-approach-deltas.json',import.meta.url)));
const sha=x=>createHash('sha256').update(x).digest('hex');
// Invert only exact reviewed tavern deltas before immutable historical checks.
// A changed byte outside this fixed snapshot fails; no moving baseline is used.
export function stripTavern(path,source){
 const delta=followup.records[path];
 if(delta){
  const text=source.toString();assert.equal(sha(text),delta.afterSHA256,'bound table approach delta: '+path);
  const lines=text.split('\n');for(const h of [...delta.hunks].reverse()){
   assert.deepEqual(lines.slice(h.at,h.at+h.added.length),h.added,path);lines.splice(h.at,h.added.length,...h.removed);
  }
  source=lines.join('\n');assert.equal(sha(source),delta.beforeSHA256,'fixed PR56 baseline: '+path);
 }
 const record=fixture.records[path];if(!record)return source;
 const text=source.toString();assert.equal(sha(text),record.afterSHA256,'bound tavern delta: '+path);
 const lines=text.split('\n');for(const h of [...record.hunks].reverse()){
  assert.deepEqual(lines.slice(h.at,h.at+h.added.length),h.added,path);
  lines.splice(h.at,h.added.length,...h.removed);
 }
 const original=lines.join('\n');assert.equal(sha(original),record.beforeSHA256,'fixed PR55 baseline: '+path);return original;
}
