import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const recipe=JSON.parse(readFileSync('assets_src/chapter1/scenes/village_square/fountain-perimeter-mask-r01.json'));
const bytes=readFileSync(recipe.source);
if(createHash('sha256').update(bytes).digest('hex')!==recipe.sourceSha256)throw Error('Fountain source painting differs from approved mask input');
const svg=Buffer.from(`<svg width="${recipe.width}" height="${recipe.height}" xmlns="http://www.w3.org/2000/svg">${recipe.paths.map(d=>`<path d="${d}" fill="white"/>`).join('')}</svg>`);
await sharp(bytes).ensureAlpha().composite([{input:svg,blend:'dest-in'}]).png().toFile(recipe.output);
