import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const fixture=JSON.parse(readFileSync(new URL('../fixtures/mitko-pocket-deltas.json',import.meta.url)));
const sha=v=>createHash('sha256').update(v).digest('hex');
// Restore only the exact pocket-transition delta before prior fixed release checks.
export function stripMitkoPocket(path,source){
 const r=fixture.records[path];if(!r)return source;
 assert.equal(sha(source),r.afterSHA256,'exact pocket-transition change: '+path);
 assert.equal(sha(r.before),r.beforeSHA256,'fixed PR64 source: '+path);
 return r.before;
}
