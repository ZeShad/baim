import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const paths=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(p=>p&&existsSync(p));
const files={};for(const p of paths)files[p]=createHash('sha256').update(readFileSync(p)).digest('hex');
const tests=readdirSync('test').filter(p=>p.endsWith('.test.js')).map(p=>'test/'+p).sort();
writeFileSync('../extraFixes/photo-pepa-diploma-20261022/verification-binding.json',JSON.stringify({repo:resolve('.'),base:'975fff594177c7af48167406c11878d41d8d3d06',files,tests},null,2));
console.log(JSON.stringify({frozenFiles:paths.length,testFiles:tests.length}));
