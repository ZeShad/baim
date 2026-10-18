import fs from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {chromium} from 'playwright';
import {mitkoTurnPocket} from '../src/content/art/mitkoTurnPocket.generated.js';

// Reproduce the owner-reviewed r02 registration in sprite coordinates. No renderer
// or movement changes; uniform transforms scale naturally with scene perspective.
const sha=b=>createHash('sha256').update(b).digest('hex');
const dir='assets_src/characters/bai_mitko/rear_west_c12_size_match_20261018/';
const provenance=JSON.parse(fs.readFileSync(dir+'provenance.json'));
for(const [p,h]of Object.entries(provenance.originalHashes))assert.equal(sha(fs.readFileSync(dir+p)),h,p);
const receipt=JSON.parse(fs.readFileSync(dir+'source-receipt.json'));
const meta=JSON.parse(fs.readFileSync(dir+'sheet.json'));
const scale=913/367;
const rearFrame={slot:'turn_rear_west_c12',facing:'north',role:'stop',loop:false,
 frameWidth:576,frameHeight:1056,frameCount:36,fps:20,initialFrame:0,
 anchor:{x:(295+4*scale)/576,y:1},contentBounds:receipt.frames[0].bounds,
 registration:{visualHeight:376*scale,baselineY:986+8*scale},
 frameRects:Object.values(meta.frames).map((x,i)=>({...x.frame,duration:x.duration,sourceFrameIndex:i})),
 frameContentBounds:receipt.frames.map(x=>x.bounds),movementSpeedMultipliers:Array(36).fill(0),flipX:false};
assert.equal(rearFrame.frameRects.length,36);assert.ok(rearFrame.frameRects.every(r=>r.duration===73));
const rear={id:'mitko-turn-rear-to-west-c12',from:'north',to:'west',entryFrameIndices:[0],continuous:false,
 exitSourceFrame:6,pocketFps:20,pocketJoin:{visualHeight:442,baselineY:508,anchorX:.5},
 nativeDurationMs:2628,selectedNativeDurationMs:2628,runtimeDurationMs:2300,sourceRange:[0,35],
 reviewStatus:'owner_visual_approved_local_review',frame:rearFrame};
const jobs=[
 {kind:'front',source:'assets/chapter1/characters/bai_mitko/turn-front-west-pocket-c05.webp',asset:'assets/chapter1/characters/bai_mitko/turn-front-west-size-matched-c05.webp',frame:mitkoTurnPocket.frame,endScale:306/308,sourceX:198.5,sourceY:435,referenceScale:203.69977865718693/288},
 {kind:'rear',source:dir+'sheet.png',asset:'assets/chapter1/characters/bai_mitko/turn-rear-west-size-matched-c12.webp',frame:rearFrame,endScale:306/289,sourceX:195.5,sourceY:422,referenceScale:190.98426702600594/576}
];
const browser=await chromium.launch({headless:true});const bindings=[];
try{
 const page=await browser.newPage();
 for(const job of jobs){
  const source=fs.readFileSync(job.source),input=await sharp(source).metadata();
  const png=Buffer.from(await page.evaluate(async({data,job,width,height})=>{
   const image=new Image();image.src='data:image/'+(job.kind==='front'?'webp':'png')+';base64,'+data;await image.decode();
   const out=document.createElement('canvas');out.width=width;out.height=height;const ctx=out.getContext('2d');
   // Preserve unselected c05 cells too; only selected pivot cells are transformed.
   ctx.drawImage(image,0,0);
   for(let i=0;i<job.frame.frameCount;i++){
    const r=job.frame.frameRects[i],u=i/(job.frame.frameCount-1),a=u*u*(3-2*u),factor=1+(job.endScale-1)*a;
    const dx=198.5-job.endScale*job.sourceX-200*(1-job.endScale);
    const dy=436-job.endScale*job.sourceY-435*(1-job.endScale);
    const tx=(1-factor)*job.frame.anchor.x*job.frame.frameWidth+a*dx/job.referenceScale;
    const ty=(1-factor)*job.frame.registration.baselineY+a*dy/job.referenceScale;
    ctx.clearRect(r.x,r.y,r.w,r.h);ctx.save();ctx.beginPath();ctx.rect(r.x,r.y,r.w,r.h);ctx.clip();
    ctx.drawImage(image,r.x,r.y,r.w,r.h,r.x+tx,r.y+ty,r.w*factor,r.h*factor);ctx.restore();
   }
   return out.toDataURL('image/png').split(',')[1];
  },{data:source.toString('base64'),job,width:input.width,height:input.height}),'base64');
  const bytes=await sharp(png).webp({lossless:true,effort:4}).toBuffer();
  if(process.argv.includes('--check'))assert.equal(sha(fs.readFileSync(job.asset)),sha(bytes),'Stale corrected atlas '+job.asset);
  else fs.writeFileSync(job.asset,bytes);
  bindings.push({kind:job.kind,source:job.source,sourceSHA256:sha(source),asset:job.asset,sha256:sha(bytes),bytes:bytes.length,frameCount:job.frame.frameCount,endScale:job.endScale,referenceScale:job.referenceScale});
 }
}finally{await browser.close();}
const assets=Object.fromEntries(jobs.map(j=>[j.frame.slot,j.asset]));
const module=`// Owner-approved r02 uniform registration; original source poses and timing retained.\nimport {mitkoTurnPocket} from './mitkoTurnPocket.generated.js';\nexport const mitkoSizeMatchedFront=mitkoTurnPocket;\nexport const mitkoSizeMatchedRear=${JSON.stringify(rear,null,2)};\nexport const mitkoSizeMatchedAssets=${JSON.stringify(assets,null,2)};\n`;
const outputs=[['src/content/art/mitkoSizeMatchedTurns.generated.js',module],[dir+'runtime-derivation.json',JSON.stringify({method:'Canvas uniform scale/translation per original source pose, first unchanged; smoothstep registration to original pocket6. No new poses, morph/alpha blend, source cropping, timing/controller changes. Derived atlases; originals remain intact.',ownerReviewSHA256:provenance.reviewArtifactSHA256,bindings},null,2)+'\n']];
for(const[p,b]of outputs)if(process.argv.includes('--check'))assert.equal(sha(fs.readFileSync(p)),sha(b),p);else fs.writeFileSync(p,b);
console.log(JSON.stringify({bindings,check:process.argv.includes('--check')}));
