import assert from 'node:assert/strict';
import {stripSceneFixesR02} from './scene-fixes-r02-preservation.js';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const fixture=JSON.parse(readFileSync(new URL('../fixtures/scene-fixes-deltas.json',import.meta.url)));
const sha=b=>createHash('sha256').update(b).digest('hex');
export function stripSceneFixes(path,source){
 source=stripSceneFixesR02(path,source);
 const r=fixture.records[path];if(!r)return source;
 assert.equal(sha(source),r.afterSHA256,'exact scene fix before historical preservation: '+path);
 assert.equal(sha(r.before),r.beforeSHA256,'immutable PR70 predecessor: '+path);
 return r.before;
}
export function restoreSceneFixesSnapshot(kind,value){
 const r=fixture.snapshots[kind];if(!r)return value;
 assert.equal(sha(JSON.stringify(value)),r.afterSHA256,'exact scene fix snapshot: '+kind);
 assert.equal(sha(JSON.stringify(r.before)),r.beforeSHA256,'immutable PR70 snapshot: '+kind);
 return structuredClone(r.before);
}
