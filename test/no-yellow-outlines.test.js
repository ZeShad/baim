import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';
import{stripNoYellowOutlines}from'./helpers/no-yellow-outlines-preservation.js';
const sha=b=>createHash('sha256').update(b).digest('hex');
const fixture=JSON.parse(readFileSync('test/fixtures/no-yellow-outlines-deltas.json'));
test('hover-only inverse restores exact PR76 source and test without altering historical baselines',()=>{
 for(const [file,record]of Object.entries(fixture.records)){
 const source=readFileSync(file),old=stripNoYellowOutlines(file,source);
 assert.equal(sha(old),record.beforeSHA256);assert.equal(stripNoYellowOutlines(file,old),old);
 assert.throws(()=>stripNoYellowOutlines(file,Buffer.concat([source,Buffer.from('\n')])) ,/exact scene fix no yellow outlines/);
 }
 const unrelated=Buffer.from('unchanged');assert.equal(stripNoYellowOutlines('src/engine/Game.js',unrelated),unrelated);
});
