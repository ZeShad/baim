// Read-only conflict check and apply_patch preparation. Does not edit preview source.
import {execFileSync} from 'node:child_process';
import {readFileSync,existsSync,mkdirSync,copyFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve('.'), preview=resolve('../baim-local-active'), recovery=resolve('../extraFixes/photo-pepa-diploma-20261022/preview-before');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','ignore']});
const norm=s=>s.replaceAll('\r\n','\n'),sha=b=>createHash('sha256').update(b).digest('hex');
const tracked=git('diff','--name-only').trim().split('\n').filter(p=>p.startsWith('src/')||p.startsWith('assets_src/chapter1/scenes/'));
const added=git('ls-files','--others','--exclude-standard').trim().split('\n').filter(p=>p.startsWith('src/'));
const report=[]; let patch='*** Begin Patch\n';
for(const p of tracked){
 const original=readFileSync(join(preview,p)),candidate=readFileSync(p,'utf8'),baseline=git('show',`HEAD:${p}`);
 if(norm(original.toString())!==norm(baseline)&&norm(original.toString())!==norm(candidate))throw Error(`Preview conflict: ${p}`);
 report.push({path:p,before:sha(original),after:sha(Buffer.from(candidate))});
 if(norm(original.toString())===norm(candidate))continue;
 const dest=join(recovery,p);mkdirSync(resolve(dest,'..'),{recursive:true});copyFileSync(join(preview,p),dest);
 const diff=git('diff','--no-ext-diff','--unified=3','--',p).split('\n');
 const at=diff.findIndex(l=>l.startsWith('@@'));
 if(at<0)throw Error(`Missing diff: ${p}`);
 const hunks=diff.slice(at).filter(l=>!l.startsWith('\\ No newline')).map(l=>l.startsWith('@@')?'@@':l).join('\n').trimEnd();
 patch+=`*** Update File: ${join(preview,p).replaceAll('\\','/')}\n${hunks}\n`;
}
for(const p of added){
 const dest=join(preview,p),source=readFileSync(p,'utf8');
 if(existsSync(dest)){if(norm(readFileSync(dest,'utf8'))!==norm(source))throw Error(`New preview file conflict: ${p}`);continue;}
 patch+=`*** Add File: ${dest.replaceAll('\\','/')}\n${source.trimEnd().split('\n').map(l=>'+'+l).join('\n')}\n`;
 report.push({path:p,before:null,after:sha(Buffer.from(source))});
}
patch+='*** End Patch\n';
mkdirSync(recovery,{recursive:true});writeFileSync(join(recovery,'receipt.json'),JSON.stringify({root,preview,report},null,2));
console.log(JSON.stringify({patch,files:report.length,preview,recovery}));
