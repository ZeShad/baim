// Mechanical EOL repair in this fresh task checkout only, not the dirty owner preview.
// Restore canonical EOL bytes only where content is otherwise EXACTLY equivalent.
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {basename} from 'node:path';
import {createHash} from 'node:crypto';
if(basename(process.cwd())!=='baim-photo-pepa-diploma')throw Error('Wrong checkout');
const ref='975fff594177c7af48167406c11878d41d8d3d06',sha=b=>createHash('sha256').update(b).digest('hex');
const paths=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(p=>/\.(?:js|mjs|cjs|json|md|css|html|py|txt|yml|yaml)$|(?:^|\/)\.gitkeep$/.test(p));
const records=[];
for(const p of paths){if(!existsSync(p))continue;const current=readFileSync(p);const old=execFileSync('git',['show',`${ref}:${p}`],{maxBuffer:20*1024*1024});
 if(current.equals(old))continue;
 if(current.toString('utf8').replaceAll('\r\n','\n')!==old.toString('utf8').replaceAll('\r\n','\n'))continue;
 writeFileSync(p,old);records.push({path:p,before:sha(current),after:sha(old)});
}
mkdirSync('target/photo-quest-review',{recursive:true});writeFileSync('target/photo-quest-review/eol-formatting.json',JSON.stringify({ref,records},null,2));
console.log(`Canonical EOL formatting only: ${records.length} text files; no artwork or content changes.`);
