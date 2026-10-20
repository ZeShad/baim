import assert from 'node:assert/strict';
import {stripFountainArc} from './fountain-arc-preservation.js';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const fixture=JSON.parse(readFileSync(new URL('../fixtures/affinity-foreground-deltas.json',import.meta.url)));
const sha=b=>createHash('sha256').update(b).digest('hex');
export function stripAffinityForeground(path,source){
 source=stripFountainArc(path,source);
 const r=fixture.records[path];if(!r)return source;
 assert.equal(sha(source),r.afterSHA256,'exact scene fix affinity before r02 preservation: '+path);
 assert.equal(sha(r.before),r.beforeSHA256,'immutable R03 predecessor: '+path);
 return r.before;
}
export function restoreAffinityForegroundSnapshot(kind,value){
 const r=fixture.snapshots[kind];if(!r)return value;
 assert.equal(sha(JSON.stringify(value)),r.afterSHA256,'exact scene fix snapshot (affinity inverse): '+kind);
 assert.equal(sha(JSON.stringify(r.before)),r.beforeSHA256,'immutable R03 snapshot: '+kind);
 return structuredClone(r.before);
}
