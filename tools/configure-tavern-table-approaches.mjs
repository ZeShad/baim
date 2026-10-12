import fs from 'node:fs';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {pointInPolygon} from '../src/engine/SceneGeometry.js';

const base='assets_src/chapter1/scenes/mehana/';
const read=p=>JSON.parse(fs.readFileSync(p));
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const source='assets/chapter1/scenes/mehana/background-clean-occlusion-v1.png';
// Trace the CURRENT painting, never the retired furniture overlays. Independent
// silhouettes leave the floor and gaps between chair/table legs transparent.
const shapes={
 left:[
  [[224,452],[238,406],[405,383],[585,392],[596,414],[605,454],[596,467],[578,452],[568,478],[442,487],[429,514],[410,520],[397,495],[324,487],[263,479],[234,486]],
  [[237,416],[245,410],[310,417],[320,425],[328,467],[322,480],[312,484],[252,475],[244,464]],
  [[253,490],[304,483],[364,495],[380,504],[376,515],[350,521],[272,511],[260,505]],
  [[534,405],[574,400],[581,405],[580,417],[557,477],[548,485],[499,481],[508,451],[522,414]],
  [[451,482],[498,476],[546,483],[551,493],[540,501],[481,502],[449,494]],
  [[270,510],[280,512],[252,603],[239,604]],
  [[351,516],[360,516],[394,597],[385,599]],
  [[311,515],[319,516],[321,600],[314,601]],
  [[249,470],[256,475],[279,553],[272,555]],
  [[449,497],[456,500],[443,587],[436,589]],
  [[536,499],[543,496],[550,592],[543,593]],
  [[567,460],[574,459],[582,572],[575,574]],
  [[493,502],[499,502],[487,562],[481,563]],
  [[267,480],[283,484],[281,564],[269,566]],
  [[405,511],[419,516],[417,592],[407,594]],
  [[570,459],[583,463],[583,540],[574,543]]
 ],
 right:[
  [[672,544],[697,467],[839,429],[1117,463],[1129,474],[1125,543],[1102,563],[1068,583],[1043,613],[1018,645],[996,643],[982,619],[895,598],[747,558],[690,580]],
  [[751,483],[759,475],[819,488],[833,501],[851,589],[846,601],[775,583],[762,574]],
  [[780,590],[845,589],[903,608],[914,630],[903,645],[879,652],[805,635],[777,617]],
  [[1121,489],[1179,469],[1187,471],[1190,482],[1157,583],[1149,594],[1084,608],[1097,550],[1113,500]],
  [[1061,601],[1118,580],[1158,590],[1158,606],[1126,620],[1071,631],[1053,619]],
  [[776,611],[788,619],[770,720],[758,720]],
  [[890,644],[900,641],[925,720],[914,720]],
  [[839,645],[847,645],[850,720],[841,720]],
  [[1058,625],[1067,626],[1053,720],[1044,720]],
  [[1149,610],[1157,606],[1183,720],[1173,720]],
  [[1136,620],[1144,619],[1133,702],[1125,706]],
  [[714,558],[731,562],[731,679],[713,676]],
  [[987,628],[1006,634],[1006,720],[989,720]]
 ]
};
const provenance={source,sourceSHA256:sha(source),method:'Exact painting RGB with independently traced furniture silhouettes; no repainting, old masks or animation edits',tables:{}};
for(const [name,polygons] of Object.entries(shapes)){
 const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(!polygons.some(p=>pointInPolygon({x:x+.5,y:y+.5},p.map(([x,y])=>({x,y})))))data.fill(0,(y*info.width+x)*4,(y*info.width+x)*4+4);
 const output=`assets/chapter1/scenes/mehana/${name}-table-player-occluder-v1.png`;
 await sharp(data,{raw:info}).png().toFile(output);
 provenance.tables[name]={output,outputSHA256:sha(output),polygons};
}
write(base+'table-player-occluders-v1.json',provenance);
const layers=read(base+'layers.json');
// Keep the existing bounded Tony mask and its approval intact; replace its active
// layer with the current complete silhouette needed by both Tony and Mitko.
layers.layers.find(l=>l.id==='layer.mehana.tony_table_occluder').asset='rightTablePlayerOccluder';
layers.layers.find(l=>l.id==='layer.mehana.tony_table_occluder').output=provenance.tables.right.output;
if(!layers.layers.some(l=>l.id==='layer.mehana.left_table_player_occluder'))layers.layers.push({id:'layer.mehana.left_table_player_occluder',enabled:true,asset:'leftTablePlayerOccluder',output:provenance.tables.left.output,zIndex:20,left:0,top:0});
write(base+'layers.json',layers);
const geometry=read(base+'walk-geometry-v1.json');
const polygons=[
 [[65,445],[190,445],[190,715],[65,715]],
 [[65,650],[610,650],[610,715],[65,715]],
 [[600,510],[680,510],[620,650],[560,650]],
 // Back-of-table floor is projected under its painted silhouette. Foreground
 // occlusion covers the actor there; table centres and the bar remain blocked.
 [[540,530],[610,530],[610,600],[540,600]],
 [[630,500],[820,500],[820,530],[650,530]],
 // Owner r03: extend only Tony's standing bay another30px downward.
 [[720,520],[760,520],[760,590],[720,590]]
].map(p=>p.map(([x,y])=>({x,y})));
geometry.legacyWalkPolygons=polygons.map((points,i)=>({id:i?'walk.chapter1.mehana.aisle_'+i:geometry.id,points}));
geometry.raster.rows=Array.from({length:72},(_,y)=>Array.from({length:128},(_,x)=>polygons.some(p=>pointInPolygon({x:x*10+5,y:y*10+5},p))?'c':'.').join(''));
write(base+'walk-geometry-v1.json',geometry);
console.log(JSON.stringify({source:provenance.sourceSHA256,tables:provenance.tables}));
