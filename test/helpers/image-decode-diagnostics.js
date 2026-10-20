import {createHash} from 'node:crypto';

// Observe the original requests. Do not fetch, decode, delay or retry an image.
export function observeImageDecode(page,{origin,language,browserVersion}){
 const requests=[],pending=[],started=Date.now();let stage='normal-page-created';
 const allowed=raw=>{try{const u=new URL(raw);return u.origin===origin&&(u.pathname==='/target/runtime-assets/manifest.json'||/\/kiro-spitting-fixed-owner-export-c01(?:\.[a-f0-9]{12})?\.webp$/.test(u.pathname));}catch{return false;}};
 const publicURL=raw=>{const u=new URL(raw);return {url:u.origin+u.pathname,exactURL:!u.username&&!u.password&&!u.search,queryRedacted:Boolean(u.search)};};
 const rowFor=request=>{let row=requests.find(r=>r.request===request);if(!row){row={request,sequence:requests.length,stage,atMs:Date.now()-started,...publicURL(request.url()),resourceType:request.resourceType(),method:request.method(),status:null,mime:null,responseBytes:null,responseSHA256:null,bodyState:'not-available'};requests.push(row);}return row;};
 const onRequest=request=>{if(allowed(request.url()))rowFor(request);};
 const onFinished=request=>{if(allowed(request.url())){const row=rowFor(request);row.finishedAtMs=Date.now()-started;try{row.timing=request.timing();}catch(e){row.timingError=String(e.message);}}};
 const onFailed=request=>{if(allowed(request.url())){const row=rowFor(request);row.failure=request.failure()?.errorText||'unknown';row.failedAtMs=Date.now()-started;}};
 const onResponse=response=>{if(!allowed(response.url()))return;const row=rowFor(response.request()),headers=response.headers();Object.assign(row,{responseURL:publicURL(response.url()),status:response.status(),mime:headers['content-type']||null,contentLength:headers['content-length']||null,contentEncoding:headers['content-encoding']||null,fromServiceWorker:response.fromServiceWorker(),bodyState:'pending'});const task=response.body().then(bytes=>{row.responseBytes=bytes.length;row.responseSHA256=createHash('sha256').update(bytes).digest('hex');row.bodyState='captured';},error=>{row.bodyState='unavailable';row.bodyError=String(error.message);});pending.push(task);};
 page.on('request',onRequest);page.on('requestfinished',onFinished);page.on('requestfailed',onFailed);page.on('response',onResponse);
 return {mark(value){stage=value;},snapshot(){return {language,browserVersion,viewport:page.viewportSize(),stage,requests:requests.map(({request,...row})=>({...row})),scope:'Only local manifest/target-atlas requests; no cookies, auth headers, save state or duplicate requests.'};},async flush(){await Promise.allSettled(pending);},detach(){page.off('request',onRequest);page.off('requestfinished',onFinished);page.off('requestfailed',onFailed);page.off('response',onResponse);}};
}
