import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const fixture=JSON.parse(readFileSync(new URL('../fixtures/mitko-idle-restoration.json',import.meta.url)));
const sha=value=>createHash('sha256').update(value).digest('hex');
export function stripMitkoIdleRestoration(path,source){
 const record=fixture.records[path];if(!record)return source;
 source=String(source).replaceAll('\r\n','\n');
 if(sha(source)===record.beforeSHA256)return source;
 assert.equal(sha(source),record.afterSHA256,'exact scene fix idle restoration inverse: '+path);
 const lines=String(source).split('\n');
 for(const h of [...record.inverse].reverse()) lines.splice(h.start,h.remove,...h.lines);
 const before=lines.join('\n');
 assert.equal(sha(before),record.beforeSHA256,'unchanged PR73 bytes: '+path);
 return before;
}
