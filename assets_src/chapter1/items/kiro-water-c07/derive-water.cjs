const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../../..'),sharp=require('node:module').createRequire(path.join(root,'package.json'))('sharp');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const out=path.join(root,'assets_src/chapter1/items/kiro-water-c07');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const w=2048,h=1024,data=Buffer.alloc(w*h*4);let seed=707;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const colour=[152,184,160];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=(y*w+x)*4,n=(random()-.5)*3+1.4*Math.sin(x/170)*Math.cos(y/120),sediment=Math.max(0,(y/h-.987)/.013)*.06;
  for(let c=0;c<3;c++)data[i+c]=Math.round(colour[c]*(1-sediment)+[126,116,80][c]*sediment+n);data[i+3]=255;
 }
 for(let dot=0;dot<240;dot++){
  const cx=Math.floor(random()*w),cy=Math.floor(random()*h),radius=1.5+random()*1.7;
  for(let y=Math.max(0,Math.floor(cy-radius));y<=Math.min(h-1,Math.ceil(cy+radius));y++)for(let x=Math.max(0,Math.floor(cx-radius));x<=Math.min(w-1,Math.ceil(cx+radius));x++){
   const weight=Math.max(0,1-Math.hypot(x-cx,y-cy)/radius)*.24,i=(y*w+x)*4;
   for(let c=0;c<3;c++)data[i+c]=Math.round(data[i+c]*(1-weight)+[100,102,72][c]*weight);
  }
 }
 const texture=await sharp(data,{raw:{width:w,height:h,channels:4}}).png().toBuffer();fs.writeFileSync(path.join(out,'water-silt-texture.png'),texture);
 const source=path.join(root,'assets/chapter1/items/kiro-bottle/yellow-water-full-r08.glb'),original=fs.readFileSync(source),jsonLength=original.readUInt32LE(12),gltf=JSON.parse(original.toString('utf8',20,20+jsonLength));
 const binaryOffset=20+jsonLength+8,binary=original.subarray(binaryOffset,binaryOffset+original.readUInt32LE(20+jsonLength));
 const water=gltf.meshes.find(m=>m.name.includes('water')),primitive=water.primitives[0],accessor=gltf.accessors[primitive.attributes.POSITION],view=gltf.bufferViews[accessor.bufferView],uv=Buffer.alloc(accessor.count*8);
 const points=[];for(let i=0;i<accessor.count;i++){
  const at=(view.byteOffset||0)+(accessor.byteOffset||0)+i*(view.byteStride||12);points.push([binary.readFloatLE(at),binary.readFloatLE(at+4),binary.readFloatLE(at+8)]);
 }
 const min=Math.min(...points.map(p=>p[1])),max=Math.max(...points.map(p=>p[1]));
 for(let i=0;i<points.length;i++){const [x,y,z]=points[i];uv.writeFloatLE((Math.atan2(z,x)+Math.PI)/(Math.PI*2),i*8);uv.writeFloatLE(1-(y-min)/(max-min),i*8+4);}
 const uvView=gltf.bufferViews.length;gltf.bufferViews.push({buffer:0,byteOffset:binary.length,byteLength:uv.length,target:34962});
 primitive.attributes.TEXCOORD_0=gltf.accessors.length;gltf.accessors.push({bufferView:uvView,componentType:5126,count:accessor.count,type:'VEC2'});
 const imageView=gltf.bufferViews.length;gltf.bufferViews.push({buffer:0,byteOffset:binary.length+uv.length,byteLength:texture.length});
 const imageIndex=gltf.images.length;gltf.images.push({name:'c07 blue-green-yellow water with fine silt',bufferView:imageView,mimeType:'image/png'});
 const textureIndex=gltf.textures.length;gltf.textures.push({source:imageIndex,sampler:gltf.textures[0].sampler});
 const m=gltf.materials[primitive.material];m.name='Fountain water c07 blue-green with faint yellow warmth and fine silt';m.pbrMetallicRoughness.baseColorFactor=[1,1,1,.78];m.pbrMetallicRoughness.baseColorTexture={index:textureIndex};
 let bin=Buffer.concat([binary,uv,texture]);gltf.buffers[0].byteLength=bin.length;bin=Buffer.concat([bin,Buffer.alloc((4-bin.length%4)%4)]);
 let json=Buffer.from(JSON.stringify(gltf));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
 const header=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+bin.length,8);jh.writeUInt32LE(json.length);jh.writeUInt32LE(0x4e4f534a,4);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);
 const output=Buffer.concat([header,jh,json,bh,bin]);fs.writeFileSync(path.join(root,'assets/chapter1/items/kiro-bottle/fountain-water-c07.glb'),output);
 const report={source:path.relative(root,source).replaceAll(String.fromCharCode(92),'/'),sourceSHA256:sha(original),originalBinarySHA256:sha(binary),originalBinaryBytes:binary.length,originalBinaryPreserved:output.subarray(20+json.length+8,20+json.length+8+binary.length).equals(binary),waterColourSRGB:colour,textureWidth:w,textureHeight:h,seed:707,textureSHA256:sha(texture),outputSHA256:sha(output),positionAccessorUnchanged:primitive.attributes.POSITION,normalAccessorUnchanged:primitive.attributes.NORMAL,indicesAccessorUnchanged:primitive.indices,fillBoundsY:[min,max],ownerReference:'kiro-fountain-water-look-c07',note:'Append only UVs and embedded water texture; original geometry/index/normal and label image bytes remain identical. Other materials/nodes/transforms unchanged.'};
 fs.writeFileSync(path.join(out,'derivation.json'),JSON.stringify(report,null,2)+'\n');console.log(report);
})().catch(e=>{console.error(e);process.exitCode=1;});
