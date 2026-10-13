import fs from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const root='assets_src/characters/mehana_waiter/spitting-fixed-owner-export-c01';
const name='sprite--9px-frames-36-rows-6-cols-6';
const metadata=JSON.parse(fs.readFileSync(`${root}/${name}.json`));
const sheet=fs.readFileSync(`${root}/${name}.png`);
const width=262,height=614,columns=6;
const pieces=[];
for(const [index,frame]of Object.values(metadata.frames).entries()){
 const r=frame.frame;
 const image=await sharp(sheet).extract({left:r.x,top:r.y,width:r.w,height:r.h}).resize(width,height,{fit:'fill'}).png().toBuffer();
 pieces.push({input:image,left:index%columns*width,top:Math.floor(index/columns)*height});
}
const output='assets/chapter1/characters/mehana_waiter/kiro-spitting-fixed-owner-export-c01.webp';
await sharp({create:{width:width*6,height:height*6,channels:4,background:'#00000000'}}).composite(pieces).webp({lossless:true,effort:6}).toFile(output);
console.log(JSON.stringify({output,sha256:createHash('sha256').update(fs.readFileSync(output)).digest('hex'),frameWidth:width,frameHeight:height,frameDurationMs:125,durationMs:4500}));
