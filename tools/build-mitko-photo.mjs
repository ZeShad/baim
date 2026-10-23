// Derive a paper photograph from approved original pixels, without generating a new face.
import sharp from 'sharp';
const portrait=await sharp('assets/chapter1/characters/bai_mitko/idle_south.png').extract({left:220,top:140,width:350,height:460}).resize(210,276).png().toBuffer();
const frame=Buffer.from('<svg width="250" height="320" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="246" height="316" rx="3" fill="#e5d5ae" stroke="#8c713e" stroke-width="3"/><rect x="20" y="16" width="210" height="276" fill="#7a6855"/></svg>');
await sharp(frame).composite([{input:portrait,left:20,top:16}]).png().toFile('assets/chapter1/items/mitko-photo.png');
const tony=await sharp('assets/chapter1/characters/tony_fridge/seated-v1.png').extract({left:350,top:20,width:250,height:260}).resize(66,69).png().toBuffer();
await sharp('assets/chapter1/items/tony-diploma.svg').composite([{input:tony,left:34,top:132}]).png().toFile('assets/chapter1/items/tony-diploma.png');
const diploma=Buffer.from('<svg width="420" height="280" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="412" height="272" fill="#dcc895" stroke="#714521" stroke-width="8"/><text x="210" y="55" text-anchor="middle" font-family="serif" font-size="32" fill="#492a18">ДИПЛОМА</text><text x="240" y="110" text-anchor="middle" font-family="serif" font-size="28" fill="#492a18">БАЙ МИТКО</text><path d="M160 145h220M160 170h200M160 195h220" stroke="#806c49" stroke-width="3"/><circle cx="290" cy="232" r="18" fill="none" stroke="#9d4038" stroke-width="4"/></svg>');
await sharp(diploma).composite([{input:await sharp(portrait).resize(95,125).toBuffer(),left:40,top:90}]).png().toFile('assets/chapter1/items/pepa-mitko-diploma.png');
