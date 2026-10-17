import assert from 'node:assert/strict';
import {restoreTurningSnapshot} from './turning-pilot-preservation.js';
import {stripWalkingSide} from './walking-side-preservation.js';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {stripMitkoPocket} from './mitko-pocket-preservation.js';
const fixture=JSON.parse(readFileSync(new URL('../fixtures/mitko-directional-deltas.json',import.meta.url)));
const catalogPromotion=JSON.parse(readFileSync(new URL('../fixtures/walking-catalog-promotion.json',import.meta.url)));
const sha=v=>createHash('sha256').update(v).digest('hex');
// Invert only the exact newest catalog edit before the older directional gate.
export function stripWalkingCatalogPromotion(path,source){
 const r=catalogPromotion.metadata;if(path!==r.path)return source;
 assert.equal(sha(source),r.afterSHA256,'exact bound walking catalog promotion: '+path);
 assert.equal(sha(r.before),r.beforeSHA256,'fixed input before walking catalog promotion: '+path);
 return r.before;
}
// Only invert the exact reviewed directional change before older fixed checks.
export function stripMitkoDirectional(path,source){
 source=stripWalkingCatalogPromotion(path,source);
 source=stripWalkingSide(path,source);
 source=stripMitkoPocket(path,source);
 const r=fixture.records[path];if(!r)return source;
 assert.equal(sha(source),r.afterSHA256,'exact bound Mitko directional change: '+path);
 assert.equal(sha(r.before),r.beforeSHA256,'fixed pre-directional source: '+path);
 return r.before;
}

export function restoreMitkoDirectionalSnapshot(kind,value){
 value=restoreTurningSnapshot(kind,value);
 const r=fixture.snapshots?.[kind];if(!r)return value;
 assert.equal(sha(JSON.stringify(value)),r.afterSHA256,'exact bound Mitko directional snapshot: '+kind);
 assert.equal(sha(JSON.stringify(r.before)),r.beforeSHA256,'fixed pre-directional snapshot: '+kind);
 return structuredClone(r.before);
}
