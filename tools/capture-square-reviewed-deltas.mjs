import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {assetManifest} from '../src/content/art/assetManifest.js';
const baseline='5931bc03094b5b06ce936830e73bc8a9395de36c';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:16*1024*1024});
if(git('rev-parse','HEAD').trim()!==baseline)throw Error('Fixed baseline changed');
const sha=x=>createHash('sha256').update(x).digest('hex');
const records={};
for(const path of git('diff','--name-only').trim().split('\n').filter(Boolean)){
 const before=git('show',baseline+':'+path),after=readFileSync(path,'utf8');
 const hunks=[];let h;
 for(const line of git('diff','--no-ext-diff','--unified=0','HEAD','--',path).split('\n')){
  const m=line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
  if(m){h={at:Number(m[1])-(m[2]==='0'?0:1),removed:[],added:[]};hunks.push(h);}
  else if(h&&line.startsWith('+'))h.added.push(line.slice(1));
  else if(h&&line.startsWith('-'))h.removed.push(line.slice(1));
 }
 const restored=after.split('\n');for(const patch of [...hunks].reverse())restored.splice(patch.at,patch.added.length,...patch.removed);
 if(restored.join('\n')!==before)throw Error('Cannot exactly invert '+path);
 records[path]={beforeSHA256:sha(before),afterSHA256:sha(after),hunks};
}
const square='scene.chapter1.village_square';
const originalManifest=git('show',baseline+':src/content/art/assetManifest.js');
const originalSquare=Function('return ({'+originalManifest.split('"scene.chapter1.village_square": {')[1].split('\n    },')[0]+'})')();
const parseLayers=text=>JSON.parse(text.split('export const sceneLayerGeometry = ')[1].trim().replace(/;$/,''));
const snapshots={manifest:{before:originalSquare,afterSHA256:sha(JSON.stringify(assetManifest.scenes[square]))},runtime:{before:parseLayers(git('show',baseline+':src/content/chapter1/sceneLayers.generated.js'))[square],afterSHA256:sha(JSON.stringify(parseLayers(readFileSync('src/content/chapter1/sceneLayers.generated.js','utf8'))[square]))}};
writeFileSync('test/fixtures/square-redesign-reviewed-deltas.json',JSON.stringify({baseline,status:'local_review; final owner runtime/publication approval pending',records,snapshots},null,2)+'\n');
console.log(JSON.stringify({fixedBaseline:baseline,files:Object.keys(records).length}));
