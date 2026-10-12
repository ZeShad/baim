import fs from 'node:fs';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
const source='assets/chapter1/scenes/mehana/table-group-right-redesign-v1.png';
const output='assets/chapter1/scenes/mehana/tony-table-occluder-v1.png';
// Only seated Tony needs the painted table in front of his lower body.
// Preserve exact source RGBA inside this bounded region; omit old chair/floor masks.
const rect={left:840,top:420,width:300,height:200};
const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(x<rect.left||x>=rect.left+rect.width||y<rect.top||y>=rect.top+rect.height)data.fill(0,(y*info.width+x)*4,(y*info.width+x)*4+4);
await sharp(data,{raw:info}).png().toFile(output);
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
fs.writeFileSync('assets_src/chapter1/scenes/mehana/tony-table-occluder-v1.json',JSON.stringify({source,sourceSHA256:sha(source),output,outputSHA256:sha(output),rect,role:'Only Tony lower-body table occlusion; no old furniture masks across player aisles',preservation:'Original assets remain unchanged. Exact retained RGBA, no repainting.'},null,2)+'\n');
const painting='assets_src/chapter1/scenes/mehana/redesign-v1/accepted-room-v13.png';
const background='assets/chapter1/scenes/mehana/background-clean-occlusion-v1.png';
await sharp(painting).resize(1280,720,{fit:'fill'}).ensureAlpha().png().toFile(background);
const counterSource='assets/chapter1/scenes/mehana/counter-front-redesign-v1.png';
const counterOutput='assets/chapter1/scenes/mehana/kiro-counter-occluder-v1.png';
const counterRect={left:690,top:343,width:160,height:162};
const counter=await sharp(counterSource).ensureAlpha().raw().toBuffer();
for(let y=0;y<720;y++)for(let x=0;x<1280;x++)if(x<690||x>=850||y<343||y>=505)counter.fill(0,(y*1280+x)*4,(y*1280+x)*4+4);
await sharp(counter,{raw:{width:1280,height:720,channels:4}}).png().toFile(counterOutput);
fs.writeFileSync('assets_src/chapter1/scenes/mehana/kiro-counter-occluder-v1.json',JSON.stringify({painting,paintingSHA256:sha(painting),background,backgroundSHA256:sha(background),source:counterSource,sourceSHA256:sha(counterSource),output:counterOutput,outputSHA256:sha(counterOutput),rect:counterRect,role:'Only Kiro lower-body counter occlusion; static background restores every original furniture pixel',preservation:'Same accepted painting resize. Exact retained counter RGBA; no repainting or original overwrite.'},null,2)+'\n');
