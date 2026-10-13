// Task authoring pass. Generated runtime modules are built by the existing tools.
import {readFileSync,writeFileSync} from 'node:fs';
const dir='assets_src/chapter1/scenes/village_square/';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const write=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const polygon=coords=>coords.map(([x,y])=>({x,y}));
const shapes={
 'exit.square.to_apartment':[[356,85],[446,57],[596,94],[580,237],[350,259]],
 'exit.square.to_mehana':[[7,241],[145,251],[148,533],[43,550],[7,510]],
 'exit.square.to_municipality':[[856,245],[944,239],[944,378],[853,378]],
 'hotspot.square.empty_envelope':[[1148,474],[1194,483],[1190,507],[1147,498]],
 'hotspot.square.poster_board':[[1032,246],[1100,241],[1115,416],[1046,421]],
 'hotspot.square.fountain':[[391,460],[444,441],[461,445],[459,483],[555,500],[568,444],[690,434],[819,443],[910,460],[931,485],[922,526],[859,551],[736,570],[565,574],[454,565],[405,548],[387,515]],
 'hotspot.square.statue':[[475,265],[492,249],[509,250],[510,266],[497,280],[510,292],[531,319],[550,332],[567,332],[565,356],[555,362],[552,435],[550,489],[537,504],[469,497],[460,482],[469,435],[479,394],[483,369],[473,343],[468,319],[470,300],[480,287],[480,277]],
 'hotspot.square.kiosk':[[1126,331],[1238,326],[1243,443],[1125,443]],
 'hotspot.square.old_men_bench':[[581,326],[661,326],[662,417],[580,417]],
 'hotspot.square.election_notice':[[271,317],[301,316],[299,371],[272,372]],
 'hotspot.square.mehana_menu':[[166,324],[220,325],[226,437],[163,438]]
};
const geometry=read(dir+'object-geometry-v1.json');
geometry.sourceBackground.path='assets/chapter1/scenes/village_square/background-redesign-c05.png';
for(const object of geometry.objects)if(shapes[object.id])object.polygon=polygon(shapes[object.id]);
write(dir+'object-geometry-v1.json',geometry);
const walk=read(dir+'walk-geometry-v1.json');walk.sourceBackground.path=geometry.sourceBackground.path;
// Foot positions: broad connected paving routes around, never inside, the basin.
const floor=polygon([[178,426],[246,420],[288,426],[320,435],[374,432],[392,422],[434,419],[445,432],[396,448],[374,470],[376,524],[396,552],[442,578],[567,592],[756,589],[886,566],[938,537],[950,482],[934,456],[900,438],[831,423],[789,416],[788,407],[850,407],[855,377],[941,377],[947,414],[988,428],[1022,433],[1025,560],[1060,590],[1080,624],[1235,656],[1225,688],[150,688],[91,637],[128,575],[178,539],[185,478]]);
const inside=(p,poly)=>{let v=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)v=!v;}return v;};
walk.raster.rows=Array.from({length:36},(_,y)=>Array.from({length:64},(_,x)=>inside({x:x*20+10,y:y*20+10},floor)?'c':'.').join(''));
write(dir+'walk-geometry-v1.json',walk);
const layers=read(dir+'layers.json');layers.sourceBackground=geometry.sourceBackground.path;
const fountain=layers.layers.find(l=>l.asset==='fountainForeground');fountain.output='assets/chapter1/scenes/village_square/fountain-foreground-c05.png';
const chorus=layers.layers.find(l=>l.asset==='oldMenChorusSeated');chorus.left=580;chorus.top=322;
const poster=layers.layers.find(l=>l.asset==='campaignPoster');poster.output='assets/chapter1/scenes/village_square/campaign-poster-c05.png';
for(const layer of [
 {id:'layer.square.shallow_water',enabled:true,asset:'fountainShallowWater',output:'assets/chapter1/scenes/village_square/fountain-shallow-water-c05.png',left:0,top:0,zIndex:41,visibleWhenFlag:'fountainRepaired'},
 {id:'layer.square.kiosk_counter',enabled:true,asset:'kioskCounterC05',output:'assets/chapter1/scenes/village_square/kiosk-counter-c05.png',left:0,top:0,zIndex:30}
]){const i=layers.layers.findIndex(l=>l.id===layer.id);if(i<0)layers.layers.push(layer);else layers.layers[i]=layer;}
write(dir+'layers.json',layers);
const campaign='src/content/localization/chapter1Campaign.js';
writeFileSync(campaign,readFileSync(campaign,'utf8').replaceAll('Дочева','Пепа').replaceAll('Docheva','Pepa').replace('Между вестниците се виждат очила и молив.','С подпряна буза тя следи площада над вестниците.').replace('Glasses and a pencil peek through the newspapers.','Chin in hand, she watches the square over the newspapers.'));
