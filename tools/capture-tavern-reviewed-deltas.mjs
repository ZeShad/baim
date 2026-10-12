import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const baseline='5931bc03094b5b06ce936830e73bc8a9395de36c';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:16*1024*1024});
if(git('rev-parse','HEAD').trim()!==baseline)throw Error('Fixed baseline changed');
const sha=x=>createHash('sha256').update(x).digest('hex'),records={};
for(const path of git('diff','--name-only').trim().split('\n').filter(Boolean)){
 if(path==='test/helpers/effect-repair-preservation.js'||path.startsWith('docs/'))continue;
 const before=git('show',baseline+':'+path),after=readFileSync(path,'utf8'),hunks=[];let h;
 for(const line of git('diff','--no-ext-diff','--unified=0','HEAD','--',path).split('\n')){
  const m=line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
  if(m){h={at:Number(m[1])-(m[2]==='0'?0:1),removed:[],added:[]};hunks.push(h);}
  else if(h&&line.startsWith('+'))h.added.push(line.slice(1));else if(h&&line.startsWith('-'))h.removed.push(line.slice(1));
 }
 const restored=after.split('\n');for(const patch of [...hunks].reverse())restored.splice(patch.at,patch.added.length,...patch.removed);
 if(restored.join('\n')!==before)throw Error('Cannot exactly invert '+path);
 records[path]={beforeSHA256:sha(before),afterSHA256:sha(after),hunks};
}
writeFileSync('test/fixtures/tavern-reviewed-deltas.json',JSON.stringify({baseline,status:'owner accepted revision3 gameplay and approved publication on2026-10-12',records},null,2)+'\n');
console.log(JSON.stringify({baseline,files:Object.keys(records).length}));
