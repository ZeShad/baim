import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {stripToniPropsR06,restoreToniPropsR06Snapshot} from './toni-props-r06-preservation.js';
const fixture=JSON.parse(readFileSync(new URL('../fixtures/toni-aftermath-deltas.json',import.meta.url)));
const sha=b=>createHash('sha256').update(b).digest('hex');
export function stripToniAftermath(path,source,allowOtherHistory=false){
 source=stripToniPropsR06(path,source,allowOtherHistory);
 const r=fixture.records[path];if(!r||sha(source)===r.beforeSHA256)return source;
 if(allowOtherHistory&&sha(source)!==r.afterSHA256)return source;
 assert.equal(sha(source),r.afterSHA256,'exact scene fix Toni aftermath inverse: '+path);
 assert.equal(sha(r.before),r.beforeSHA256);return r.before;
}
export function restoreToniAftermathSnapshot(kind,value){
 value=restoreToniPropsR06Snapshot(kind,value);
 const r=fixture.snapshots[kind];if(!r||sha(JSON.stringify(value))===r.beforeSHA256)return value;
 assert.equal(sha(JSON.stringify(value)),r.afterSHA256,'exact scene fix snapshot (Toni aftermath): '+kind);
 assert.equal(sha(JSON.stringify(r.before)),r.beforeSHA256);return structuredClone(r.before);
}
