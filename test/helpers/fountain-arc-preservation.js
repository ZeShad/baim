import assert from 'node:assert/strict';
import {stripFountainSideClearance} from './fountain-side-clearance-preservation.js';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const fixture=JSON.parse(readFileSync(new URL('../fixtures/fountain-arc-deltas.json',import.meta.url)));
const sha=b=>createHash('sha256').update(b).digest('hex');
export function stripFountainArc(path,source){
 source=stripFountainSideClearance(path,source);
 const r=fixture.records[path];if(!r)return source;
 assert.equal(sha(source),r.afterSHA256,'exact scene fix arc before Affinity preservation: '+path);
 assert.equal(sha(r.before),r.beforeSHA256,'immutable Affinity R04b predecessor: '+path);
 return r.before;
}
