import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {stripInspectionCopy} from './inspection-copy-preservation.js';
const fixture=JSON.parse(readFileSync(new URL('../fixtures/inspection-bounds-deltas.json',import.meta.url))),sha=b=>createHash('sha256').update(b).digest('hex');
export function stripInspectionBounds(path,source,allowOtherHistory=false){source=stripInspectionCopy(path,source,allowOtherHistory);const r=fixture.records[path];if(!r||sha(source)===r.beforeSHA256)return source;if(allowOtherHistory&&sha(source)!==r.afterSHA256)return source;assert.equal(sha(source),r.afterSHA256,'exact scene fix inspection bounds inverse: '+path);assert.equal(sha(r.before),r.beforeSHA256);return r.before;}
