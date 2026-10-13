// Owner-selected Hydra c14; preserve all 36 native frames and 122ms timing.
import sharp from 'sharp';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const root='assets_src/chapter1/scenes/village_square/redesign-c05',dir=root+'/pepa-kiosk-breathing-5s-animate-hydra-c14';
const sheet=readFileSync(dir+'/original.png'),spec=JSON.parse(readFileSync(dir+'/original.json'));
if(sha(sheet)!=='301f37aa4599100700a340a926f513a4197fe1add068f7d48ca61aba17512f4d')throw Error('Selected sheet changed');
const frames=Object.entries(spec.frames).sort(([a],[b])=>a.localeCompare(b)).map(([,v])=>v);
if(frames.length!==36||frames.some(f=>f.duration!==122))throw Error('Unexpected source timing');
const original=readFileSync(root+'/square-redesign-static-c05.png'),meta=await sharp(original).metadata();
const mask=JSON.parse(readFileSync(root+'/animation-reference-masks-r04.json')).pepaReference;
const svg=Buffer.from(`<svg width="${meta.width}" height="${meta.height}" xmlns="http://www.w3.org/2000/svg"><path fill="white" transform="translate(${mask.crop.x} ${mask.crop.y}) scale(${1/mask.reviewScale})" d="${mask.path}"/></svg>`);
const actorMask=await sharp(svg).resize(1280,720,{fit:'fill'}).png().toBuffer();
// The old smoke is outside the original actor silhouette. Restore this bounded
// kiosk area from the existing approved empty cleanplate, not generated artwork.
const smokeMask=Buffer.from('<svg width="1280" height="720"><path fill="white" d="M1128 317H1169V382H1128Z"/></svg>');
const fullMask=await sharp(actorMask).composite([{input:smokeMask}]).png().toBuffer();
const clean=readFileSync(root+'/animation-cleanplate-edit-r01.png');
const cleanPatch=await sharp(clean).resize(1280,720,{fit:'fill'}).ensureAlpha().composite([{input:fullMask,blend:'dest-in'}]).png().toBuffer();
// Reuse white newspaper edges, rather than the dark cleanplate above the stack.
const paperTexture=await sharp('assets/chapter1/scenes/village_square/background-redesign-c05.png').extract({left:1160,top:435,width:80,height:25}).png().toBuffer();
const paperShape=Buffer.from('<svg width="80" height="25"><path fill="white" d="M0 10L22 6L56 6L66 7L60 15L40 19L0 15Z"/></svg>');
const paperCutout=await sharp(paperTexture).ensureAlpha().composite([{input:paperShape,blend:'dest-in'}]).png().toBuffer();
const paper=await sharp({create:{width:1280,height:720,channels:4,background:'#00000000'}}).composite([{input:paperCutout,left:1160,top:429}]).png().toBuffer();
// Owner-marked outer sleeve belongs behind the vertical newspaper rack too.
const rackMask=Buffer.from('<svg width="1280" height="720"><path fill="white" d="M1242 370L1236 379L1233 393L1232 419L1230 445L1227 450H1256V370Z"/></svg>');
const rack=await sharp(clean).resize(1280,720,{fit:'fill'}).ensureAlpha().composite([{input:rackMask,blend:'dest-in'}]).png().toBuffer();
// One fixed crop across the whole animation: no per-frame recentering or stretching.
const crop={left:19,top:211,width:468,height:474},patch={left:1120,top:315,width:140,height:140},actor={left:1127,top:325,width:120,height:120},tiles=[];
for(let i=0;i<frames.length;i++){
 const f=frames[i].frame;
 const sprite=await sharp(sheet).extract({left:f.x+crop.left,top:f.y+crop.top,width:crop.width,height:crop.height}).modulate({brightness:0.92,saturation:0.76}).resize(120,120,{fit:'contain',background:'#00000000'}).png().toBuffer();
 // Periodic flowing displacement; opacity fades towards the top, with no reset.
 const phase=i/frames.length*Math.PI*2,segments=[];
 for(let j=0;j<34;j++){const t=j/34,u=(j+1)/34,x=t=>1145+Math.sin(t*9-phase)*t*3.5+Math.sin(t*4+phase)*t*1.2,y=t=>370-t*40;segments.push(`<path d="M${x(t)} ${y(t)} L${x(u)} ${y(u)}" stroke="#c4bbaa" stroke-width="${0.8+t*1.6}" opacity="${0.5*Math.pow(1-t,1.4)}"/>`);}
 const smoke=Buffer.from(`<svg width="1280" height="720"><g fill="none" stroke-linecap="round">${segments.join('')}</g></svg>`);
 const full=await sharp(cleanPatch).composite([{input:sprite,left:actor.left,top:actor.top},{input:smoke},{input:paper},{input:rack}]).png().toBuffer();
 const tile=await sharp(full).extract(patch).png().toBuffer();tiles.push({input:tile,left:i%6*140,top:Math.floor(i/6)*140});
}
const output='assets/chapter1/scenes/village_square/pepa-idle-hydra-c14-r03.png',still='assets/chapter1/scenes/village_square/pepa-idle-hydra-c14-r03-static.png';
await sharp({create:{width:840,height:840,channels:4,background:'#00000000'}}).composite(tiles).png().toFile(output);
await sharp(output).extract({left:0,top:0,width:140,height:140}).png().toFile(still);
const provenance={candidate:'pepa-kiosk-breathing-5s-animate-hydra-c14',status:'runtime_review',ownerSelection:'12 October 2026: implement this animation; supplied sheet hash exactly matches c14',sourcePngSha256:sha(sheet),sourceJsonSha256:sha(readFileSync(dir+'/original.json')),frameCount:36,frameDurationMs:122,durationMs:4392,frameRange:[0,35],crop,patch,actor,output,still,outputSha256:sha(readFileSync(output)),staticOutputSha256:sha(readFileSync(still)),notes:'Native eye closure and painted motion preserved. No smoke added, interpolation, retiming or loop repair. Speaking art not implemented.'};
provenance.derivative='composite-r03';provenance.colorGrade={brightness:0.92,saturation:0.76};provenance.smoke='Old background smoke covered from existing cleanplate; periodic thin warm-grey wisp,36 phases';provenance.occlusion='Existing newspaper edge texture fitted over lower screen-right arm';provenance.notes='Actor motion/timing/source preserved; uniform grade, bounded background restoration, looping smoke and newspaper occlusion only.';
writeFileSync(dir+'/runtime-provenance-r03.json',JSON.stringify(provenance,null,2)+'\n');
console.log(JSON.stringify(provenance));
