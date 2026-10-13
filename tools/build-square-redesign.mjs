// Deterministic runtime sizing and authored alpha masks; never regenerates c05.
import sharp from 'sharp';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root='assets_src/chapter1/scenes/village_square/redesign-c05';
const out='assets/chapter1/scenes/village_square';
const source=readFileSync(root+'/square-redesign-static-c05.png');
const hash=createHash('sha256').update(source).digest('hex');
if(hash!=='e787244e68ac05e1b752931cca18d048ba9d4f444df417b8675ed6b1d3706df6')throw Error('Approved c05 source changed');
const meta=await sharp(source).metadata();
const c05=await sharp(source).resize(1280,720,{fit:'fill'}).png().toBuffer();
// Restore the original board and its immediate edge pixels at ORIGINAL coordinates.
// Only the final name region comes from the generated text edit. No generated
// architecture, lettering elsewhere, or UI pixels can enter the runtime scene.
const original=await sharp(out+'/background.png').ensureAlpha().raw().toBuffer();
const edited=await sharp(root+'/original-sign-kiro-edit-r01.png').resize(1280,720,{fit:'fill'}).ensureAlpha().raw().toBuffer();
const nameMask=await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><path fill="white" d="M 133,105 L 198,123 L 200,163 L 131,145 Z"/></svg>')).ensureAlpha().raw().toBuffer();
await sharp(nameMask,{raw:{width:1280,height:720,channels:4}}).png().toFile(root+'/sign-name-mask-r01.png');
const signMask=await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><path fill="white" d="M 0,31 L 26,31 L 39,39 L 167,75 L 180,73 L 190,83 L 212,90 L 214,105 L 209,171 L 201,185 L 0,147 Z"/></svg>')).ensureAlpha().raw().toBuffer();
await sharp(signMask,{raw:{width:1280,height:720,channels:4}}).png().toFile(root+'/sign-restore-mask-r01.png');
const raw=await sharp(c05).ensureAlpha().raw().toBuffer();
for(let y=24;y<185;y++)for(let x=0;x<218;x++){
 const i=(y*1280+x)*4;if(!signMask[i+3])continue;
 const input=nameMask[i+3]?edited:original;
 for(let c=0;c<4;c++)raw[i+c]=input[i+c];
}
const image=await sharp(raw,{raw:{width:1280,height:720,channels:4}}).png().toBuffer();
mkdirSync(out,{recursive:true});
writeFileSync(out+'/background-redesign-c05.png',image);
const masks=JSON.parse(readFileSync(root+'/masks.json','utf8'));
const inventory=[];
for(const [name,spec] of Object.entries(masks)){
 const svg=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><path d="${spec.path}" fill="white"/></svg>`);
 const input=spec.source?await sharp(spec.source).resize(1280,720,{fit:'fill'}).png().toBuffer():image;
 const masked=await sharp(input).ensureAlpha().composite([{input:svg,blend:'dest-in'}]).png().toBuffer();
 let pipeline=sharp(masked);
 if(spec.crop)pipeline=pipeline.extract(spec.crop);
 const dest=spec.output;mkdirSync(dest.slice(0,dest.lastIndexOf('/')),{recursive:true});
 const bytes=await pipeline.png().toBuffer();writeFileSync(dest,bytes);
 inventory.push({name,path:dest,sha256:createHash('sha256').update(bytes).digest('hex'),crop:spec.crop||null});
}
writeFileSync(root+'/derivatives.json',JSON.stringify({sourceSha256:hash,sourceWidth:meta.width,sourceHeight:meta.height,runtimeWidth:1280,runtimeHeight:720,mapping:'x * 1280 / sourceWidth; y * 720 / sourceHeight; whole canvas, no crop',derivatives:inventory},null,2)+'\n');
// Re-register the existing approved campaign artwork on the new notice panel.
const poster=await sharp(out+'/campaign-poster-v2.png').extract({left:1050,top:249,width:66,height:168}).resize(60,153).png().toBuffer();
await sharp({create:{width:1280,height:720,channels:4,background:'#00000000'}}).composite([{input:poster,left:1047,top:255}]).png().toFile(out+'/campaign-poster-c05.png');
console.log(JSON.stringify({sourceWidth:meta.width,sourceHeight:meta.height,derivatives:inventory.length}));
await sharp(image).extract({left:0,top:24,width:218,height:161}).resize(872,644).png().toFile(root+'/sign-runtime-review-r01.png');
