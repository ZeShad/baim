import {freemem,totalmem,loadavg} from 'node:os';
import {readFileSync,readdirSync} from 'node:fs';

// No commands/arguments, credentials, new image requests, waits or retries.
export function decodeResources(){
 const result={at:Date.now(),freeBytes:freemem(),totalBytes:totalmem(),load:loadavg(),nodeRSS:process.memoryUsage().rss};
 if(process.platform!=='linux')return result;
 try{
  const rows=[];for(const pid of readdirSync('/proc').filter(p=>/^\d+$/.test(p)))try{const s=readFileSync('/proc/'+pid+'/status','utf8'),value=k=>s.match(new RegExp('^'+k+':\\s+(.*)$','m'))?.[1];rows.push({pid:Number(pid),ppid:Number(value('PPid')),name:value('Name'),rssBytes:Number(value('VmRSS')?.split(/\s+/)[0]||0)*1024});}catch{}
  const selected=new Set([process.pid]);let changed=true;while(changed){changed=false;for(const row of rows)if(selected.has(row.ppid)&&!selected.has(row.pid)){selected.add(row.pid);changed=true;}}
  result.taskProcesses=rows.filter(row=>selected.has(row.pid));
  result.memory=readFileSync('/proc/meminfo','utf8').split('\n').filter(l=>/^(MemAvailable|SwapFree|SwapTotal):/.test(l));
 }catch(e){result.observationError=String(e.message);}
 return result;
}

export async function installDecodeLifecycle(page){
 await page.addInitScript(()=>{
  const prefix='BAIM_TARGET_LIFECYCLE ',target=s=>String(s||'').includes('kiro-spitting-fixed-owner-export-c01'),ids=new WeakMap();let next=0,count=0,scheduledFrames=0,completedFrames=0,gameDraws=0,activeDecodes=0,totalDecodeCalls=0;
  const raf=window.requestAnimationFrame;window.requestAnimationFrame=function(callback){scheduledFrames++;return raf.call(this,time=>{completedFrames++;return callback(time);});};
  const draw=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(...args){if(this.canvas.id==='game')gameDraws++;return draw.apply(this,args);};
  const row=(kind,image,extra={})=>{if(count++>=300)return;if(image&&!ids.has(image))ids.set(image,++next);console.debug(prefix+JSON.stringify({at:performance.now(),kind,id:image?ids.get(image):null,src:image?.getAttribute('src'),currentSrc:image?.currentSrc,complete:image?.complete,width:image?.naturalWidth,height:image?.naturalHeight,status:image?.dataset.loaded,ready:document.readyState,visibility:document.visibilityState,scheduledFrames,completedFrames,gameDraws,activeDecodes,totalDecodeCalls,...extra}));};
  const descriptor=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');Object.defineProperty(HTMLImageElement.prototype,'src',{...descriptor,set(value){const watched=target(value)||target(descriptor.get.call(this));if(watched)row('src-before',this,{next:String(value),stack:new Error().stack});const result=descriptor.set.call(this,value);if(watched)row('src-after',this);return result;}});
  const decode=HTMLImageElement.prototype.decode;HTMLImageElement.prototype.decode=function(...args){const watched=target(this.src);totalDecodeCalls++;activeDecodes++;if(watched)row('decode-called',this,{stack:new Error().stack});const result=decode.apply(this,args);result.then(()=>{activeDecodes--;if(watched)row('decode-fulfilled',this);},e=>{activeDecodes--;if(watched)row('decode-rejected',this,{error:{name:e.name,message:e.message}});});return result;};
  const NativeImage=window.Image;window.Image=new Proxy(NativeImage,{construct(ctor,args,newTarget){const image=Reflect.construct(ctor,args,newTarget);for(const name of ['load','error'])image.addEventListener(name,()=>{if(target(image.src))row(name,image);});return image;}});
  for(const name of ['DOMContentLoaded','load','beforeunload','pagehide','visibilitychange'])window.addEventListener(name,()=>row('page-'+name,null));
 });
}
