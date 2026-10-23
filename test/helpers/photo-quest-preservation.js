import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {stripToniTable,restoreToniTableSnapshot} from './toni-table-preservation.js';
const fixture=JSON.parse(readFileSync(new URL('../fixtures/photo-quest-deltas.json',import.meta.url)));
const sha=value=>createHash('sha256').update(value).digest('hex');
export function stripPhotoQuest(path,source,allowOtherHistory=false) {
  source=stripToniTable(path,source,allowOtherHistory);
  const r=fixture.records[path];if(!r)return source;
  if(sha(source)===r.beforeSHA256)return source;
  if(allowOtherHistory && sha(source)!==r.afterSHA256)return source; // Unchanged older gates reject unknown bytes themselves.
  assert.equal(sha(source),r.afterSHA256,'exact scene fix photo quest inverse: '+path);
  assert.equal(sha(r.before),r.beforeSHA256,'immutable PR75 photo quest predecessor: '+path);
  return r.before;
}
export function restorePhotoQuestSnapshot(kind,value) {
  value=restoreToniTableSnapshot(kind,value);
  const r=fixture.snapshots[kind];if(!r)return value;
  const hash=sha(JSON.stringify(value)); if(hash===r.beforeSHA256)return value;
  assert.equal(hash,r.afterSHA256,'exact scene fix snapshot (photo quest): '+kind);
  assert.equal(sha(JSON.stringify(r.before)),r.beforeSHA256,'immutable PR75 photo quest snapshot: '+kind);
  return structuredClone(r.before);
}
