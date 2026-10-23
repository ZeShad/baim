import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const fixture=JSON.parse(readFileSync(new URL('../fixtures/no-yellow-outlines-deltas.json',import.meta.url)));
const sha=b=>createHash('sha256').update(b).digest('hex');
export function stripNoYellowOutlines(path,source,allowOtherHistory=false){
 const record=fixture.records[path];
 if(!record||sha(source)===record.beforeSHA256)return source;
 if(allowOtherHistory&&sha(source)!==record.afterSHA256)return source;
 assert.equal(sha(source),record.afterSHA256,'exact scene fix no yellow outlines inverse: '+path);
 assert.equal(sha(record.before),record.beforeSHA256);
 return record.before;
}
