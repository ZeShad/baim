import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const fixture=JSON.parse(readFileSync(new URL('../fixtures/mitko-directional-deltas.json',import.meta.url)));
const sha=v=>createHash('sha256').update(v).digest('hex');
// Only invert the exact reviewed directional change before older fixed checks.
export function stripMitkoDirectional(path,source){
 const r=fixture.records[path];if(!r)return source;
 assert.equal(sha(source),r.afterSHA256,'exact bound Mitko directional change: '+path);
 assert.equal(sha(r.before),r.beforeSHA256,'fixed pre-directional source: '+path);
 return r.before;
}

export function restoreMitkoDirectionalSnapshot(kind,value){
 const r=fixture.snapshots?.[kind];if(!r)return value;
 assert.equal(sha(JSON.stringify(value)),r.afterSHA256,'exact bound Mitko directional snapshot: '+kind);
 assert.equal(sha(JSON.stringify(r.before)),r.beforeSHA256,'fixed pre-directional snapshot: '+kind);
 return structuredClone(r.before);
}
