import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {EventEmitter} from 'node:events';
import {stripNortheastKiosk} from './helpers/northeast-kiosk-preservation.js';
import {stripCentreFacing} from './helpers/centre-facing-preservation.js';
import {observeImageDecode} from './helpers/image-decode-diagnostics.js';
const sha=value=>createHash('sha256').update(value).digest('hex');
const contract=JSON.parse(readFileSync('test/fixtures/verification-repair-contract.json'));

test('exact stop-test inverse reaches the unchanged historical catalog inventory through the full chain',()=>{
 const record=contract.checkedStopTest,file=record.file,current=readFileSync(file),restored=stripNortheastKiosk(file,current),catalogBytes=readFileSync('test/fixtures/walking-catalog-promotion.json'),catalog=JSON.parse(catalogBytes);
 assert.equal(sha(catalogBytes),record.oldCatalogFixtureSHA256,'Historical inventory itself stays immutable');
 assert.equal(sha(current),record.afterSHA256);assert.equal(sha(restored),record.beforeSHA256);
 assert.equal(sha(stripCentreFacing(file,current)),catalog.acceptedRuntimeSHA256[file]);
 assert.equal(Buffer.from(restored).toString().replaceAll('{x:430,y:430}','{x:442.5,y:477.5}').replaceAll('{x:1090,y:630}','{x:1077.5,y:655}'),current.toString());
});

test('stop-test inverse rejects extra bytes, different stop values and already-old unbound input',()=>{
 const r=contract.checkedStopTest,bytes=readFileSync(r.file),old=stripNortheastKiosk(r.file,bytes);
 for(const bad of [Buffer.concat([bytes,Buffer.from('\n// unbound edit')]),bytes.toString().replace('{x:442.5,y:477.5}','{x:442.6,y:477.5}'),old])assert.throws(()=>stripCentreFacing(r.file,bad),/exact scene fix northeast kiosk inverse/);
 const unrelated=Buffer.from('unchanged');assert.equal(stripNortheastKiosk('unrelated/test.js',unrelated),unrelated);
});

test('diagnostic harness retains every original assertion, readiness block and one independent decode',()=>{
 const r=contract.diagnosticHarness,source=readFileSync(r.file,'utf8');assert.equal(sha(source),r.afterSHA256,'Instrumentation has its own explicit current binding');
 assert.deepEqual(source.match(/assert\.[\s\S]*?;/g)||[],r.originalAssertions);assert.ok(source.includes(r.readinessBlock));
 assert.equal((source.match(/await im\.decode\(\)/g)||[]).length,r.decodeCallsPerLanguage);assert.ok(source.includes('{timeout:'+r.timeoutMs+'}'));
 assert.ok(source.includes("normal.goto(origin+'/?play=1')"));assert.ok(source.includes('throw error;'));
});

const fakePage=()=>{const page=new EventEmitter();page.viewportSize=()=>({width:1280,height:720});Object.defineProperty(page,'request',{get(){throw Error('Observer must not initiate network requests');}});return page;};
const request=url=>({url:()=>url,method:()=> 'GET',resourceType:()=> 'image',timing:()=>({startTime:1,responseEnd:2}),failure:()=>({errorText:'net::ERR_FAILED'})});
const response=(req,body,headers={})=>({url:req.url,request:()=>req,status:()=>200,headers:()=>({'content-type':'image/webp','content-length':'3',...headers}),fromServiceWorker:()=>false,body});

test('decode observer binds existing request response bytes/hash/MIME and stage without a duplicate request',async()=>{
 const page=fakePage(),observer=observeImageDecode(page,{origin:'http://127.0.0.1:5173',language:'bg',browserVersion:'test'}),req=request('http://127.0.0.1:5173/target/runtime-assets/kiro-spitting-fixed-owner-export-c01.123456abcdef.webp');observer.mark('independent-decode');page.emit('request',req);page.emit('response',response(req,async()=>Buffer.from('abc')));page.emit('requestfinished',req);await observer.flush();const record=observer.snapshot().requests[0];assert.equal(record.stage,'independent-decode');assert.equal(record.status,200);assert.equal(record.responseBytes,3);assert.equal(record.responseSHA256,sha('abc'));assert.equal(record.mime,'image/webp');assert.equal(record.bodyState,'captured');assert.equal(record.exactURL,true);assert.deepEqual(record.timing,{startTime:1,responseEnd:2});observer.detach();assert.equal(page.listenerCount('response'),0);
});

test('decode observer preserves request failure/body-unavailable evidence and excludes sensitive headers/queries',async()=>{
 const page=fakePage(),observer=observeImageDecode(page,{origin:'http://127.0.0.1:5173',language:'en',browserVersion:'test'}),req=request('http://127.0.0.1:5173/target/runtime-assets/manifest.json?secret=do-not-log');page.emit('request',req);page.emit('response',response(req,async()=>{throw Error('Body unavailable');},{authorization:'do-not-log','set-cookie':'do-not-log'}));page.emit('requestfailed',req);await observer.flush();const snapshot=observer.snapshot(),record=snapshot.requests[0];assert.equal(record.failure,'net::ERR_FAILED');assert.equal(record.bodyState,'unavailable');assert.equal(record.bodyError,'Body unavailable');assert.equal(record.queryRedacted,true);assert.equal(record.exactURL,false);assert.ok(!JSON.stringify(snapshot).includes('do-not-log'));observer.detach();
});
