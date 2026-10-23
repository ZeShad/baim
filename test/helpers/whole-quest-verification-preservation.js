import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {stripSuiteFollowup} from './suite-followup-preservation.js';
const fixture = JSON.parse(readFileSync(new URL('../fixtures/whole-quest-verification-deltas.json', import.meta.url)));
const sha = value => createHash('sha256').update(value).digest('hex');
export function stripWholeQuestVerification(path, source, allowOtherHistory = false) {
  source=stripSuiteFollowup(path,source,allowOtherHistory);
  const record = fixture.records[path];
  if (!record || sha(source) === record.beforeSHA256) return source;
  if (allowOtherHistory && sha(source) !== record.afterSHA256) return source;
  assert.equal(sha(source), record.afterSHA256, 'exact scene fix whole quest verification inverse: ' + path);
  assert.equal(sha(record.before), record.beforeSHA256);
  return record.before;
}
