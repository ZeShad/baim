import fs from 'node:fs';
import {pointInPolygon} from '../src/engine/SceneGeometry.js';
const base='assets_src/chapter1/scenes/mehana/',geometry=JSON.parse(fs.readFileSync(base+'walk-geometry-v1.json'));
// Ground clearance uses the current painted chair feet, not its tabletop silhouette.
// The left rear alcove is separate from the chair footprint; its only entry is
// through the clear aisle to the right. The upper strip stays below the bar base.
const polygons=[
 [[65,445],[190,445],[190,715],[65,715]],
 [[65,650],[620,650],[620,715],[65,715]],
 [[640,530],[700,530],[700,610],[660,650],[610,650],[650,610],[650,570],[640,570]],
 [[610,530],[650,530],[650,560],[610,560]],
 [[650,530],[820,530],[820,550],[650,550]],
 [[720,540],[760,540],[760,590],[720,590]]
].map(p=>p.map(([x,y])=>({x,y})));
geometry.legacyWalkPolygons=polygons.map((points,i)=>({id:i?'walk.chapter1.mehana.aisle_'+i:geometry.id,points}));
geometry.raster.rows=Array.from({length:72},(_,y)=>Array.from({length:128},(_,x)=>polygons.some(p=>pointInPolygon({x:x*10+5,y:y*10+5},p))?'c':'.').join(''));
fs.writeFileSync(base+'walk-geometry-v1.json',JSON.stringify(geometry,null,2)+'\n');
const layers=JSON.parse(fs.readFileSync(base+'layers.json'));
// Separate object planes: central-aisle player z15 is in front of left z20,
// behind right z10, and always in front of the bartender's counter z45.
layers.layers.find(l=>l.id==='layer.mehana.tony_table_occluder').zIndex=10;
fs.writeFileSync(base+'layers.json',JSON.stringify(layers,null,2)+'\n');
console.log(JSON.stringify({walkableCells:geometry.raster.rows.join('').replaceAll('.','').length}));
