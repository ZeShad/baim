import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const baseline='e2d361e2b010a7d4b7e40f0db008b1e552631e9d';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:16*1024*1024});
if(git('rev-parse','HEAD').trim()!==baseline)throw Error('Fixed PR57 baseline changed');
const sha=x=>createHash('sha256').update(x).digest('hex'),records={};
for(const path of git('diff','--name-only').trim().split('\n').filter(Boolean)){
 if(!path.startsWith('src/')&&!path.startsWith('assets_src/'))continue;
 const before=git('show',baseline+':'+path),after=readFileSync(path,'utf8'),hunks=[];let h;
 for(const line of git('diff','--no-ext-diff','--unified=0',baseline,'--',path).split('\n')){
  const m=line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
  if(m){h={at:Number(m[1])-(m[2]==='0'?0:1),removed:[],added:[]};hunks.push(h);}
  else if(h&&line.startsWith('+'))h.added.push(line.slice(1));else if(h&&line.startsWith('-'))h.removed.push(line.slice(1));
 }
 const restored=after.split('\n');for(const patch of [...hunks].reverse())restored.splice(patch.at,patch.added.length,...patch.removed);
 if(restored.join('\n')!==before)throw Error('Cannot exactly invert '+path);
 records[path]={beforeSHA256:sha(before),afterSHA256:sha(after),hunks};
}
writeFileSync('test/fixtures/tavern-clipping-boundary-deltas.json',JSON.stringify({baseline,status:'local clipping correction pending visual review; no publication approval',records},null,2)+'\n');
console.log(JSON.stringify({baseline,files:Object.keys(records).length}));
