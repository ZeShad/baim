import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const fixture=JSON.parse(readFileSync(new URL('../fixtures/effect-repair-reviewed-deltas.json',import.meta.url)));
const sha=value=>createHash('sha256').update(value).digest('hex');
// Normalize only this exact repair before the immutable PR54/older comparisons.
export function stripEffectRepair(path,source) {
  const record=fixture.records[path];if(!record)return source;
  source=source.toString();assert.equal(sha(source),record.afterSHA256,'bound effect repair: '+path);
  const lines=source.split('\n');
  for(const h of [...record.hunks].reverse()) {
    assert.deepEqual(lines.slice(h.at,h.at+h.added.length),h.added,path);
    lines.splice(h.at,h.added.length,...h.removed);
  }
  const original=lines.join('\n');assert.equal(sha(original),record.beforeSHA256,'fixed PR54 baseline: '+path);
  return original;
}
