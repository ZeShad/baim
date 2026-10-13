import fs from 'node:fs';
import {pointInPolygon} from '../src/engine/SceneGeometry.js';

const filename='assets_src/chapter1/scenes/mehana/walk-geometry-v1.json';
const geometry=JSON.parse(fs.readFileSync(filename));
// The painted door is above the floor. Preserve the grounded entry at120,530
// and every other aisle while preventing free clicks from climbing the door.
geometry.legacyWalkPolygons[0].points=[
 {x:65,y:530},{x:190,y:530},{x:190,y:715},{x:65,y:715}
];
geometry.raster.rows=Array.from({length:72},(_,y)=>Array.from({length:128},(_,x)=>
 geometry.legacyWalkPolygons.some(p=>pointInPolygon({x:x*10+5,y:y*10+5},p.points))?'c':'.'
).join(''));
fs.writeFileSync(filename,JSON.stringify(geometry,null,2)+'\n');
console.log(JSON.stringify({doorFloorTop:530,walkableCells:geometry.raster.rows.join('').replaceAll('.','').length}));
