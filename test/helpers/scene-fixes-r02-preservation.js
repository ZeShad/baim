import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const fixture=JSON.parse(readFileSync(new URL('../fixtures/scene-fixes-r02-deltas.json',import.meta.url)));
const sha=b=>createHash('sha256').update(b).digest('hex');
export function stripSceneFixesR02(path,source){
 const r=fixture.records[path];if(!r)return source;
 assert.equal(sha(source),r.afterSHA256,'exact scene fix r02 before r01 preservation: '+path);
 assert.equal(sha(r.before),r.beforeSHA256,'immutable scene fix r01 predecessor: '+path);
 return r.before;
}
