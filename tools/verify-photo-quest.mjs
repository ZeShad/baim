import {spawnSync,execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root='target/photo-quest-review';mkdirSync(root,{recursive:true});
const files=['photo-quest','chapter1-campaign','content-effects','chapter1-registration','engine','scene-action-sequence','tavern-table-approaches','northeast-kiosk','tony-talk-animation','tony-skeptical-animation','tony-chuckle-animation','tony-approving-nod-animation','tony-anger-animation','mitko-idle-restoration','size-matched-turns','turn-pocket','arrival-turn','bottle-arrival-water','kiro-talking-polishing','scene-entry-fountain','scene-loading-cache','restart-lifecycle-preservation','restart-lifecycle','walking-side-interactions','walking-catalog-promotion'].map(n=>`test/${n}.test.js`);
for(const p of files)if(!existsSync(p))throw Error('Missing explicit verification: '+p);
const r=spawnSync(process.execPath,['--test',...files],{encoding:'utf8',timeout:180000,maxBuffer:8*1024*1024});
writeFileSync(`${root}/scoped-tests.log`,(r.stdout||'')+(r.stderr||''));
const source=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(p=>/^(src|test)\//.test(p)&&existsSync(p));
const hashes=Object.fromEntries(source.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));
writeFileSync(`${root}/scoped-tests.json`,JSON.stringify({scope:files,exitCode:r.status,error:r.error?.message,fullSuite:false,securityPreflight:'EPERM both sandbox and host; no fixture skipped or full-suite pass claimed',hashes},null,2));
console.log((r.stdout||'').split('\n').slice(-10).join('\n'));if(r.status!==0){console.log((r.stdout||'').slice(-8000));process.exitCode=1;}
