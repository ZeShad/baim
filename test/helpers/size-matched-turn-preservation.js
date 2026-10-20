import assert from 'node:assert/strict';
import {stripAffinityForeground,restoreAffinityForegroundSnapshot} from './affinity-foreground-preservation.js';
import {stripSceneFixes,restoreSceneFixesSnapshot} from './scene-fixes-preservation.js';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const fixture=JSON.parse(readFileSync(new URL('../fixtures/size-matched-turn-deltas.json',import.meta.url)));
const sha=b=>createHash('sha256').update(b).digest('hex');
export function stripSizeMatchedTurn(path,source){
 source=stripAffinityForeground(path,source);
 source=stripSceneFixes(path,source);
 const r=fixture.records[path];if(!r)return source;
 assert.equal(sha(source),r.afterSHA256,'exact turning pilot candidate (size-match inverse before c05 inverse): '+path);
 assert.equal(sha(r.before),r.beforeSHA256,'immutable PR69 predecessor: '+path);
 return r.before;
}
export function restoreSizeMatchedSnapshot(kind,value){
 value=restoreAffinityForegroundSnapshot(kind,value);
 value=restoreSceneFixesSnapshot(kind,value);
 const r=fixture.snapshots[kind];if(!r)return value;
 assert.equal(sha(JSON.stringify(value)),r.afterSHA256,'exact turning pilot snapshot (size-match inverse before c05 inverse): '+kind);
 assert.equal(sha(JSON.stringify(r.before)),r.beforeSHA256,'immutable PR69 snapshot: '+kind);
 return structuredClone(r.before);
}
