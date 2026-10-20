import assert from 'node:assert/strict';
import {stripBottleArrivalWater} from './bottle-arrival-water-preservation.js';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const fixture=JSON.parse(readFileSync(new URL('../fixtures/fountain-side-clearance-deltas.json',import.meta.url)));
const sha=b=>createHash('sha256').update(b).digest('hex');
export function stripFountainSideClearance(path,source){
 source=stripBottleArrivalWater(path,source);
 const r=fixture.records[path];if(!r)return source;
 assert.equal(sha(source),r.afterSHA256,'exact scene fix side clearance before arc preservation: '+path);
 assert.equal(sha(r.before),r.beforeSHA256,'immutable R05 predecessor: '+path);
 return r.before;
}
