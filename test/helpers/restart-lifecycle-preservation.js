import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const fixture=JSON.parse(readFileSync(new URL('../fixtures/restart-lifecycle-deltas.json',import.meta.url)));
const sha=value=>createHash('sha256').update(value).digest('hex');
// Invert only the exact restart repair before existing fixed historical checks.
// Never advance old baselines or ignore an unexpected byte in a changed file.
export function stripRestartLifecycle(path,source) {
  const record=fixture.records[path];if(!record)return source;
  const text=source.toString();assert.equal(sha(text),record.afterSHA256,'bound restart lifecycle change: '+path);
  const lines=text.split('\n');
  for(const h of [...record.hunks].reverse()) {
    assert.deepEqual(lines.slice(h.at,h.at+h.added.length),h.added,path);
    lines.splice(h.at,h.added.length,...h.removed);
  }
  const before=lines.join('\n');assert.equal(sha(before),record.beforeSHA256,'fixed PR60 baseline: '+path);
  return before;
}
