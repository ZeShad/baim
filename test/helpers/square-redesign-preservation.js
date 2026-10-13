import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {stripCombinedPreview,restoreCombinedSnapshot} from './combined-preview-preservation.js';
const fixture=JSON.parse(readFileSync(new URL('../fixtures/square-redesign-reviewed-deltas.json',import.meta.url)));
const sha=v=>createHash('sha256').update(v).digest('hex');
// Exact reversible task deltas, never a broad path exclusion or moving baseline.
export function stripSquareRedesign(path,source){
 source=stripCombinedPreview(path,source);
 const record=fixture.records[path];if(!record)return source;
 source=source.toString();assert.equal(sha(source),record.afterSHA256,'bound square redesign: '+path);
 const lines=source.split('\n');
 for(const h of [...record.hunks].reverse()){
  assert.deepEqual(lines.slice(h.at,h.at+h.added.length),h.added,path);
  lines.splice(h.at,h.added.length,...h.removed);
 }
 const before=lines.join('\n');assert.equal(sha(before),record.beforeSHA256,'fixed PR55 baseline: '+path);return before;
}
export function restoreSquareSnapshot(kind,value){
 const result=restoreCombinedSnapshot(kind,value),key='scene.chapter1.village_square',record=fixture.snapshots[kind];
 const square=kind==='manifest'?result.scenes[key]:result[key];
 assert.equal(sha(JSON.stringify(square)),record.afterSHA256,'bound square '+kind);
 if(kind==='manifest')result.scenes[key]=structuredClone(record.before);else result[key]=structuredClone(record.before);
 return result;
}
