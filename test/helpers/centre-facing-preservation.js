import assert from 'node:assert/strict';
import {stripLongDistance} from './long-distance-preservation.js';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const fixture = JSON.parse(readFileSync(new URL('../fixtures/centre-facing-deltas.json', import.meta.url)));
const sha = source => createHash('sha256').update(source).digest('hex');
export function stripCentreFacing(path, source) {
  source = stripLongDistance(path, source);
  const r = fixture.records[path];
  if (!r) return source;
  assert.equal(sha(source), r.afterSHA256, 'exact centre-facing change: ' + path);
  assert.equal(sha(r.before), r.beforeSHA256, 'fixed PR65 source: ' + path);
  return r.before;
}
