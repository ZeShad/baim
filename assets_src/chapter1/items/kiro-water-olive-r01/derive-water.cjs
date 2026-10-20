// Deterministic clipping of the accepted liquid only. Original GLB payload remains intact.
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const root=path.resolve(__dirname,'../../../..'),repo=root;
const sharp=require(path.join(repo,'node_modules/sharp'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 const source='assets/chapter1/items/kiro-bottle/fountain-water-c07.glb',b=fs.readFileSync(path.join(repo,source)),n=b.readUInt32LE(12),j=JSON.parse(b.toString('utf8',20,20+n)),bin=b.subarray(28+n,28+n+b.readUInt32LE(20+n));
 const mesh=j.meshes.find(m=>m.name.includes('water')),old=structuredClone(mesh.primitives[0]),p=mesh.primitives[0],cut=.153;
 const read=id=>{const a=j.accessors[id],v=j.bufferViews[a.bufferView],dim={SCALAR:1,VEC2:2,VEC3:3}[a.type],size={5123:2,5125:4,5126:4}[a.componentType],rows=[];for(let i=0;i<a.count;i++){const row=[];for(let k=0;k<dim;k++){const at=(v.byteOffset||0)+(a.byteOffset||0)+i*(v.byteStride||size*dim)+k*size;row.push(a.componentType===5126?bin.readFloatLE(at):a.componentType===5123?bin.readUInt16LE(at):bin.readUInt32LE(at));}rows.push(row);}return rows;};
 const pos=read(p.attributes.POSITION),normal=read(p.attributes.NORMAL),uv=read(p.attributes.TEXCOORD_0),indices=read(p.indices).flat(),vertices=[],normals=[],uvs=[],rim=new Map();
 const vertex=id=>({p:pos[id],n:normal[id],uv:uv[id]});
 const cross=(a,b)=>{const t=(cut-a.p[1])/(b.p[1]-a.p[1]),mix=(x,y)=>x.map((v,i)=>v+(y[i]-v)*t);const v={p:mix(a.p,b.p),n:mix(a.n,b.n),uv:mix(a.uv,b.uv)};v.p[1]=cut;rim.set([v.p[0].toFixed(7),v.p[2].toFixed(7)].join(','),v.p);return v;};
 const add=v=>{vertices.push(...v.p);normals.push(...v.n);uvs.push(...v.uv);};
 for(let i=0;i<indices.length;i+=3){const tri=indices.slice(i,i+3).map(vertex),poly=[];for(let k=0;k<3;k++){const a=tri[k],c=tri[(k+1)%3],ai=a.p[1]<=cut,ci=c.p[1]<=cut;if(ai)poly.push(a);if(ai!==ci)poly.push(cross(a,c));}for(let k=1;k+1<poly.length;k++)for(const v of [poly[0],poly[k],poly[k+1]])add(v);}
 // Close the horizontal cross section, facing upward; no geometry above the line.
 const ring=[...rim.values()].sort((a,b)=>Math.atan2(a[2],a[0])-Math.atan2(b[2],b[0]));assert.ok(ring.length>100);
 for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length];for(const q of [[0,cut,0],b,a])add({p:q,n:[0,1,0],uv:[.5,1-(cut-.009879570454359055)/(.1667681634426117-.009879570454359055)]});}
 let chunks=[bin],length=bin.length;
 const append=(data,target)=>{const pad=Buffer.alloc((4-length%4)%4);chunks.push(pad,data);length+=pad.length;const id=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:length,byteLength:data.length,...(target?{target}:{})});length+=data.length;return id;};
 const floats=(array,dim)=>{const data=Buffer.alloc(array.length*4);array.forEach((v,i)=>data.writeFloatLE(v,i*4));const view=append(data,34962),id=j.accessors.length,a={bufferView:view,componentType:5126,count:array.length/dim,type:'VEC'+dim};if(dim===3){a.min=[0,1,2].map(k=>{let x=Infinity;for(let i=k;i<array.length;i+=3)x=Math.min(x,array[i]);return x;});a.max=[0,1,2].map(k=>{let x=-Infinity;for(let i=k;i<array.length;i+=3)x=Math.max(x,array[i]);return x;});}j.accessors.push(a);return id;};
 p.attributes={POSITION:floats(vertices,3),NORMAL:floats(normals,3),TEXCOORD_0:floats(uvs,2)};delete p.indices;
 // Same deterministic fine-silt pattern, coloured for the actual olive/brown basin.
 const w=1024,h=512,data=Buffer.alloc(w*h*4),colour=[91,76,29];let seed=707;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,n=(random()-.5)*3+1.4*Math.sin(x/85)*Math.cos(y/60);for(let c=0;c<3;c++)data[i+c]=Math.round(colour[c]+n);data[i+3]=255;}
 const texture=await sharp(data,{raw:{width:w,height:h,channels:4}}).png().toBuffer(),view=append(texture),image=j.images.length;j.images.push({name:'Fountain muddy olive brown fine silt',bufferView:view,mimeType:'image/png'});const tid=j.textures.length;j.textures.push({source:image,sampler:j.textures[0].sampler});
 const mat=j.materials[p.material];mat.name='Fountain water muddy olive brown lower shoulder r01';mat.pbrMetallicRoughness.baseColorTexture={index:tid};
 j.buffers[0].byteLength=length;let binary=Buffer.concat(chunks);binary=Buffer.concat([binary,Buffer.alloc((4-binary.length%4)%4)]);let json=Buffer.from(JSON.stringify(j));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);const head=Buffer.alloc(20),bh=Buffer.alloc(8);head.write('glTF');head.writeUInt32LE(2,4);head.writeUInt32LE(28+json.length+binary.length,8);head.writeUInt32LE(json.length,12);head.writeUInt32LE(0x4e4f534a,16);bh.writeUInt32LE(binary.length);bh.writeUInt32LE(0x004e4942,4);const result=Buffer.concat([head,json,bh,binary]);
 const output='assets/chapter1/items/kiro-bottle/fountain-water-olive-r01.glb';fs.writeFileSync(path.join(repo,output),result);
 fs.writeFileSync(path.join(__dirname,'water-derivation.json'),JSON.stringify({source,sourceSHA256:sha(b),output,outputSHA256:sha(result),originalBinaryBytes:bin.length,originalBinaryPreserved:binary.subarray(0,bin.length).equals(bin),oldPrimitive:old,newPrimitive:p,fillYBefore:j.accessors[old.attributes.POSITION].max[1],fillYAfter:cut,colourSRGB:colour,rimVertices:ring.length,triangles:vertices.length/9,note:'Only liquid primitive/material references replaced. All original bytes, nonliquid meshes/materials/nodes and embedded label retained. Clip intersects the existing cross section; new upward cap closes at Y=.153m. Reference normalized red line 237 versus bottle103..529 maps to .153m; visual review required.'},null,2));
 console.log({output,cut,triangles:vertices.length/9});
})();
