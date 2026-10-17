import fs from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const source='assets_src/characters/bai_mitko/turning_pilot_20261016/';
const sha=b=>createHash('sha256').update(b).digest('hex');
const expected={'original-export.zip':'476abe3b02de7e97b0dbbd15bece46f8d2fbbfeb292ef9614ae9d50b13c76405','original-preview.gif':'cc5e1133eb707ccd30529de29552a67682128eca0ca96fc4bd9e49389e6390a3','sheet.png':'5ac5e4fea6f83cd327128dbc6e28da6103d1df54cffbc60c28168f47b6f96d27','sheet.json':'25c361f7989181f1de995f0d7a17d55d93bd89b51145e1fcd226aec0b5e022b4'};
for(const [name,hash]of Object.entries(expected))if(sha(fs.readFileSync(source+name))!==hash)throw Error('Source changed: '+name);
const frames=Object.values(JSON.parse(fs.readFileSync(source+'sheet.json')).frames);
if(frames.length!==36||frames.some(f=>f.duration!==76))throw Error('Unexpected native timing');
const asset='assets/chapter1/characters/bai_mitko/turn-front-east-c01.webp';
const bytes=await sharp(source+'sheet.png').resize(1728,3072).webp({lossless:true,effort:6}).toBuffer();
const selected=frames.slice(0,21); // Complete pivot, before the already-side-facing corrective shuffle.
const frame={slot:'turn_front_east_c01',facing:'south',role:'stop',loop:false,frameCount:21,fps:20,initialFrame:0,frameWidth:288,frameHeight:512,usesOriginalLudoLayout:true,anchor:{x:.5,y:.98},contentBounds:{x:45,y:37,w:206,h:426},registration:{visualHeight:426,baselineY:463},frameRects:selected.map((f,index)=>({x:f.frame.x/2,y:f.frame.y/2,w:288,h:512,duration:76,sourceFrameIndex:index})),movementSpeedMultipliers:selected.map(()=>0)};
const metadata={id:'mitko-turn-front-to-east-c01',from:'south',to:'east',entryFrameIndices:[0],exitSourceFrame:8,pocketFps:20,nativeDurationMs:2736,selectedNativeDurationMs:1596,runtimeDurationMs:1050,sourceRange:[0,20],reviewStatus:'runtime_review',pocketJoin:{visualHeight:426,baselineY:497,anchorX:(183.36363636363637+4.5)/399,turnContact:{x:139.5,y:474},pocketContact:{x:183.36363636363637,y:508},method:'One constant source registration matching the lowest boot contact at turn20 to pocket8; same uniform pixel scale throughout each segment.'},frame};
const module=`// Generated from accepted c01. Original full atlas preserved; complete pivot0–20 at published locomotion20fps.\nexport const mitkoTurnPilot = ${JSON.stringify(metadata,null,2)};\nexport const mitkoTurnAssets = ${JSON.stringify({[frame.slot]:asset},null,2)};\n`;
for(const [file,data]of [[asset,bytes],['src/content/art/mitkoTurnPilot.generated.js',Buffer.from(module)]]){
 if(process.argv.includes('--check')){if(!fs.existsSync(file)||sha(fs.readFileSync(file))!==sha(data))throw Error('Derivative stale: '+file);}
 else fs.writeFileSync(file,data);
}
console.log(JSON.stringify({asset,bytes:bytes.length,sha256:sha(bytes),frames:36,nativeMs:2736,registration:frame.registration}));
