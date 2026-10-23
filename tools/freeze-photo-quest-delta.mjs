// Explicit candidate freeze. Never rewrite any historical fixture or baseline hash.
import { execFileSync } from 'node:child_process';
import { readFileSync,writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { chapter1 } from '../src/content/chapter1/index.js';
import { assetManifest } from '../src/content/art/assetManifest.js';
import { chapter1 as beforeChapter } from '../../baim/src/content/chapter1/index.js';
import { assetManifest as beforeManifest } from '../../baim/src/content/art/assetManifest.js';
const baseline='975fff594177c7af48167406c11878d41d8d3d06';
const git=(...a)=>execFileSync('git',a,{encoding:'utf8'});
if(git('-C','../baim','rev-parse','HEAD').trim()!==baseline)throw Error('Wrong reference checkout');
const sha=s=>createHash('sha256').update(s).digest('hex');
const changed=git('-c','core.safecrlf=false','diff','--name-only').trim().split('\n').filter(p=>p.startsWith('src/')||p.startsWith('assets_src/')||p.startsWith('test/'));
const records={};
for(const path of changed){
  const before=git('show',`${baseline}:${path}`),after=readFileSync(path,'utf8');
  if(before!==after)records[path]={before,beforeSHA256:sha(before),afterSHA256:sha(after)};
}
const snapshots={};
for(const [kind,before,after] of [['scenes',beforeChapter.scenes,chapter1.scenes],['manifest',beforeManifest,assetManifest]]){
  snapshots[kind]={before,beforeSHA256:sha(JSON.stringify(before)),afterSHA256:sha(JSON.stringify(after))};
}
writeFileSync('test/fixtures/photo-quest-deltas.json',JSON.stringify({baseline,records,snapshots},null,2)+'\n');
console.log(JSON.stringify({baseline,records:Object.keys(records),snapshots:Object.keys(snapshots)}));
