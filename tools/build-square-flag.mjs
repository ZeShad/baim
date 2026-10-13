// Preserve native motion/timing; confine cleanplate pixels to the original cloth.
import sharp from 'sharp';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const source='assets_src/chapter1/scenes/village_square/redesign-c05';
const dir=source+'/square-flag-wind-4s-web-c01';
const sha=b=>createHash('sha256').update(b).digest('hex');
const png=readFileSync(dir+'/original.png'),spec=JSON.parse(readFileSync(dir+'/original.json'));
if(sha(png)!=='6aafc71fa212419b0a15ff6a84bcb14596b355bd3be0568dc8d0f40e24c51acc')throw Error('Original export changed');
const frames=Object.entries(spec.frames).sort(([a],[b])=>a.localeCompare(b));
if(frames.length!==64||frames.some(([,s])=>s.duration!==57||s.rotated||s.trimmed||s.frame.w!==504||s.frame.h!==896))throw Error('Timing/geometry changed');
const original=readFileSync(source+'/square-redesign-static-c05.png');
if(sha(original)!=='e787244e68ac05e1b752931cca18d048ba9d4f444df417b8675ed6b1d3706df6')throw Error('c05 source changed');
const mask=JSON.parse(readFileSync(source+'/animation-reference-masks-r04.json')).flagReference;
const meta=await sharp(original).metadata();
const svg=Buffer.from(`<svg width="${meta.width}" height="${meta.height}" xmlns="http://www.w3.org/2000/svg"><path fill="white" transform="translate(${mask.crop.x} ${mask.crop.y}) scale(${1/mask.reviewScale})" d="${mask.path}"/></svg>`);
const fullMask=await sharp(svg).resize(1280,720,{fit:'fill'}).png().toBuffer();
const clean=await sharp(source+'/animation-cleanplate-edit-r01.png').resize(1280,720,{fit:'fill'}).ensureAlpha().toBuffer();
const masked=await sharp(clean).composite([{input:fullMask,blend:'dest-in'}]).png().toBuffer();
const patch={left:850,top:35,width:80,height:90};
const {data,info}=await sharp(png).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const tiles=[],review=[];
const bg=readFileSync('assets/chapter1/scenes/village_square/background-redesign-c05.png');
for(const [i,[,s]] of frames.entries()){
 const f=s.frame,raw=Buffer.alloc(f.w*f.h*4);for(let y=0;y<f.h;y++)data.copy(raw,y*f.w*4,((f.y+y)*info.width+f.x)*4,((f.y+y)*info.width+f.x+f.w)*4);
 // One fixed transform for every frame: no per-frame recentering or retiming.
 const flag=await sharp(raw,{raw:{width:504,height:896,channels:4}}).resize(55,98,{fit:'fill'}).png().toBuffer();
 const full=await sharp(masked).composite([{input:flag,left:860,top:26}]).png().toBuffer();
 const tile=await sharp(full).extract(patch).png().toBuffer();
 tiles.push({input:tile,left:i%8*80,top:Math.floor(i/8)*90});
 if([0,16,32,48,63].includes(i))review.push({index:i,path:dir+`/context-frame-${i}.png`,bytes:await sharp(bg).composite([{input:tile,left:patch.left,top:patch.top}]).png().toBuffer()});
}
const output='assets/chapter1/scenes/village_square/flag-wind-c01.png';
mkdirSync(dir,{recursive:true});
await sharp({create:{width:640,height:720,channels:4,background:'#00000000'}}).composite(tiles).png().toFile(output);
for(const r of review)writeFileSync(r.path,r.bytes);
writeFileSync(dir+'/runtime-provenance.json',JSON.stringify({candidate:'square-flag-wind-4s-web-c01',sourcePngSha256:sha(png),sourceJsonSha256:sha(readFileSync(dir+'/original.json')),frameRange:[0,63],frameCount:64,frameDurationMs:57,durationMs:3648,timingOrigin:'native Ludo JSON; GIF rounded to50ms, not used for runtime',transform:{width:55,height:98,left:860,top:26},patch,cleanplateMask:'exact original native cloth contour resized to runtime; background asset unchanged',cleanplateSha256:sha(readFileSync(source+'/animation-cleanplate-edit-r01.png')),output,outputSha256:sha(readFileSync(output)),reviewStatus:'local review pending; no publication'},null,2)+'\n');
console.log(JSON.stringify({output,durationMs:3648,frameCount:64}));
