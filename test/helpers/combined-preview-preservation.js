import {stripRestartLifecycle} from './restart-lifecycle-preservation.js';
import {stripMitkoDirectional,restoreMitkoDirectionalSnapshot} from './mitko-directional-preservation.js';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const combined=JSON.parse(readFileSync(new URL('../fixtures/combined-preview-deltas.json',import.meta.url)));
const repair=JSON.parse(readFileSync(new URL('../fixtures/statue-repair-deltas.json',import.meta.url)));
const counter=JSON.parse(readFileSync(new URL('../fixtures/kiro-counter-occlusion-deltas.json',import.meta.url)));
const sha=v=>createHash('sha256').update(v).digest('hex');
function invert(fixture,path,source){
 const record=fixture.records[path];if(!record)return source;
 assert.equal(sha(source),record.afterSHA256,'exact bound incremental change: '+path);
 assert.equal(sha(record.before),record.beforeSHA256,'immutable incremental input: '+path);
 return record.before;
}
// Always remove the newest exact change first. Unknown bytes fail, never bypass.
export function stripCombinedPreview(path,source){return invert(combined,path,invert(repair,path,invert(counter,path,stripRestartLifecycle(path,stripMitkoDirectional(path,source)))));}
export function restoreCombinedSnapshot(kind,value){
 value=restoreMitkoDirectionalSnapshot(kind,value);
 const newest=counter.snapshots?.[kind];
 if(newest){assert.equal(sha(JSON.stringify(value)),newest.afterSHA256,'exact counter occlusion '+kind);value=newest.before;}
 const latest=repair.snapshots?.[kind];
 if(latest){assert.equal(sha(JSON.stringify(value)),latest.afterSHA256,'exact repair '+kind);value=latest.before;}
 const record=combined.snapshots[kind];assert.equal(sha(JSON.stringify(value)),record.afterSHA256,'exact combined '+kind);
 return structuredClone(record.before);
}
