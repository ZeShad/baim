import {readFileSync,copyFileSync,mkdirSync,existsSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
const preview=resolve('../baim-local-active'),recovery=resolve('../extraFixes/photo-pepa-diploma-20261022/preview-before');
const sha=b=>createHash('sha256').update(b).digest('hex');
const paths=['assets/chapter1/items/mitko-photo.png','assets/chapter1/items/tony-diploma.png','assets/chapter1/items/pepa-mitko-diploma.png','assets/chapter1/puzzles/photo-cupboard-c01.glb'];
for(const p of paths)if(existsSync(resolve(preview,p))&&sha(readFileSync(resolve(preview,p)))!==sha(readFileSync(p)))throw Error(`Asset conflict: ${p}`);
const manifest=resolve(preview,'target/runtime-assets/manifest.json');
if(existsSync(manifest)&&!existsSync(resolve(recovery,'runtime-manifest-before.json')))copyFileSync(manifest,resolve(recovery,'runtime-manifest-before.json'));
const records=[];
for(const p of paths){const dest=resolve(preview,p);if(!dest.startsWith(preview+'/')&&!dest.startsWith(preview+'\\'))throw Error('Unsafe destination');mkdirSync(dirname(dest),{recursive:true});copyFileSync(p,dest);records.push({path:p,sha256:sha(readFileSync(dest))});}
writeFileSync(resolve(recovery,'added-assets.json'),JSON.stringify({preview,records},null,2));console.log(JSON.stringify({copied:records.length,preview}));
