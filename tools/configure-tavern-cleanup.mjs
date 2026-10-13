import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p));
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const base='assets_src/chapter1/scenes/mehana/';
const layers=read(base+'layers.json');
layers.sourceBackground='assets/chapter1/scenes/mehana/background-clean-occlusion-v1.png';
for(const layer of layers.layers)if(['rear_chairs','table_group_left','table_group_right','kaliakra_oil','water_jug','newspaper_left_table'].includes(layer.id.replace('layer.mehana.','')))layer.enabled=false;
if(!layers.layers.some(l=>l.id==='layer.mehana.tony_table_occluder'))layers.layers.push({id:'layer.mehana.tony_table_occluder',enabled:true,asset:'tonyTableOccluder',output:'assets/chapter1/scenes/mehana/tony-table-occluder-v1.png',zIndex:20,top:0,left:0});
layers.layers.find(l=>l.id==='layer.mehana.counter_front').output='assets/chapter1/scenes/mehana/kiro-counter-occluder-v1.png';
const variation=layers.layers.find(l=>l.id==='layer.mehana.waiter_idle').idleVariation.animation;
Object.assign(variation,{frameWidth:262,frameHeight:614,frameDurationMs:125,contentBounds:{x:0,y:0,w:262,h:614},registrationBounds:{x:46,y:102,w:170,h:512}});
write(base+'layers.json',layers);
const geometry=read(base+'walk-geometry-v1.json');
geometry.sourceBackground.path=layers.sourceBackground;
// Feet stay in the visible left aisle, foreground floor and central aisle.
// The 10px raster keeps the narrow route between the accepted furniture connected.
const polygons=[
 [{x:65,y:445},{x:190,y:445},{x:190,y:715},{x:65,y:715}],
 [{x:65,y:650},{x:610,y:650},{x:610,y:715},{x:65,y:715}],
 [{x:600,y:510},{x:630,y:510},{x:610,y:650},{x:560,y:650}]
];
const inside=(x,y,p)=>{let result=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)result=!result;}return result;};
geometry.legacyWalkPolygons=polygons.map((points,i)=>({id:i?'walk.chapter1.mehana.aisle_'+i:geometry.id,points}));
geometry.raster={width:128,height:72,cellSize:10,rows:Array.from({length:72},(_,y)=>Array.from({length:128},(_,x)=>polygons.some(p=>inside(x*10+5,y*10+5,p))?'c':'.').join(''))};
write(base+'walk-geometry-v1.json',geometry);
const objects=read(base+'object-geometry-v1.json');
// Disabled stable hotspot IDs remain available to historical saves/tools, but cannot intercept clicks.
write(base+'object-geometry-v1.json',objects);
