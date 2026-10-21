import {stripNortheastKiosk,restoreNortheastKioskSnapshot} from './northeast-kiosk-preservation.js';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const fixture=JSON.parse(readFileSync(new URL('../fixtures/bottle-arrival-water-deltas.json',import.meta.url)));
const sha=b=>createHash('sha256').update(b).digest('hex');
// Bind the exact new delta before every unchanged historical inverse.
export function stripBottleArrivalWater(path,source){
 source=stripNortheastKiosk(path,source);
 const r=fixture.records[path];if(!r)return source;
 assert.equal(sha(source),r.afterSHA256,'exact scene fix bottle/arrival/water inverse: '+path);
 assert.equal(sha(r.before),r.beforeSHA256,'immutable PR71 input: '+path);
 return r.before;
}
export function restoreBottleArrivalWaterSnapshot(kind,value){
 value=restoreNortheastKioskSnapshot(kind,value);
 const r=fixture.snapshots[kind];if(!r)return value;
 assert.equal(sha(JSON.stringify(value)),r.afterSHA256,'exact scene fix snapshot (bottle/arrival/water): '+kind);
 assert.equal(sha(JSON.stringify(r.before)),r.beforeSHA256,'immutable PR71 snapshot: '+kind);
 return structuredClone(r.before);
}
