import assert from 'node:assert/strict';
import {stripTurningPilot} from './turning-pilot-preservation.js';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const fixture=JSON.parse(readFileSync(new URL('../fixtures/long-distance-deltas.json',import.meta.url)));
const sha=value=>createHash('sha256').update(value).digest('hex');
export function stripLongDistance(path,source){
 source=stripTurningPilot(path,source);
 const record=fixture.records[path];if(!record)return source;
 assert.equal(sha(source),record.afterSHA256,'exact long-distance candidate: '+path);
 assert.equal(sha(record.before),record.beforeSHA256,'immutable PR66 input: '+path);
 return record.before;
}
