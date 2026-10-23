import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {stripToniAftermath,restoreToniAftermathSnapshot} from './toni-aftermath-preservation.js';
const fixture=JSON.parse(readFileSync(new URL('../fixtures/toni-table-deltas.json',import.meta.url)));
const sha=b=>createHash('sha256').update(b).digest('hex');
export function stripToniTable(path,source,allowOtherHistory=false){
 source=stripToniAftermath(path,source,allowOtherHistory);
 const r=fixture.records[path];if(!r||sha(source)===r.beforeSHA256)return source;
 if(allowOtherHistory&&sha(source)!==r.afterSHA256)return source;
 assert.equal(sha(source),r.afterSHA256,'exact scene fix Toni table inverse: '+path);
 assert.equal(sha(r.before),r.beforeSHA256);return r.before;
}
export function restoreToniTableSnapshot(kind,value){
 value=restoreToniAftermathSnapshot(kind,value);
 const r=fixture.snapshots[kind];if(!r||sha(JSON.stringify(value))===r.beforeSHA256)return value;
 assert.equal(sha(JSON.stringify(value)),r.afterSHA256,'exact scene fix snapshot (Toni table): '+kind);
 assert.equal(sha(JSON.stringify(r.before)),r.beforeSHA256);return structuredClone(r.before);
}
