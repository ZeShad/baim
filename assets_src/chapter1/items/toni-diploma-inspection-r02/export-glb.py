import bpy,math,json,hashlib
from pathlib import Path
r=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(r/'toni-diploma.blend'))
for ob in bpy.context.scene.objects:ob.hide_set(True);ob.hide_render=True;ob.select_set(False)
def material(name,file):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes['Principled BSDF'];p.inputs['Roughness'].default_value=1
 tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(r/file));tex.image.pack();m.node_tree.links.new(tex.outputs['Color'],p.inputs['Base Color']);return m
front=material('document_front','document-front.png');back=material('document_back','paper-back.png')
edge=bpy.data.materials.new('document_paper_edge');edge.diffuse_color=(.63,.55,.45,1)
nx,ny=40,28;verts=[(-.145+i*.29/nx,-.1+j*.2/ny,.0019*abs(-.145+i*.29/nx)/.145)for j in range(ny+1)for i in range(nx+1)]
faces=[(j*(nx+1)+i,j*(nx+1)+i+1,(j+1)*(nx+1)+i+1,(j+1)*(nx+1)+i)for j in range(ny)for i in range(nx)]
exports=[]
def mesh(name,v,f,mat,uv=False):
 m=bpy.data.meshes.new(name);m.from_pydata(v,[],f);m.materials.append(mat);m.update()
 if uv:
  m.uv_layers.new()
  for poly in m.polygons:
   for li in poly.loop_indices:
    p=m.vertices[m.loops[li].vertex_index].co;m.uv_layers.active.data[li].uv=((p.x+.145)/.29,(p.y+.1)/.2)
 o=bpy.data.objects.new(name,m);bpy.context.scene.collection.objects.link(o);o.rotation_euler[0]=math.pi/2;o.select_set(True);exports.append(o);return o
mesh('Diploma front',[(x,y,z+.00018)for x,y,z in verts],faces,front,True)
mesh('Diploma back',[(x,y,z-.00018)for x,y,z in verts],[tuple(reversed(f))for f in faces],back,True)
perimeter=list(range(nx+1))+[j*(nx+1)+nx for j in range(1,ny+1)]+[ny*(nx+1)+i for i in range(nx-1,-1,-1)]+[j*(nx+1)for j in range(ny-1,0,-1)]
ev=[(verts[i][0],verts[i][1],verts[i][2]+delta)for delta in [-.00018,.00018]for i in perimeter];n=len(perimeter);ef=[(i,(i+1)%n,(i+1)%n+n,i+n)for i in range(n)];mesh('Diploma paper thickness',ev,ef,edge)
bpy.context.view_layer.objects.active=exports[0]
bpy.ops.wm.save_as_mainfile(filepath=str(r/'toni-diploma-inspection.blend'))
bpy.ops.export_scene.gltf(filepath=str(r/'toni-diploma-inspection.glb'),export_format='GLB',use_selection=True,export_animations=False,export_cameras=False,export_lights=False,export_yup=True)
b=(r/'toni-diploma-inspection.glb').read_bytes();size=int.from_bytes(b[12:16],'little');g=json.loads(b[20:20+size]);assert len(g['meshes'])==3 and len(g['images'])==2;assert all('bufferView'in i for i in g['images']);assert not g.get('animations')and not g.get('cameras')
(r/'glb-validation.json').write_text(json.dumps({'meshCount':3,'embeddedImages':2,'animations':False,'cameras':False,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'geometry':'40x28 folded front/back grids plus real0.36mm paper edge; UV print and separate patterned back; BlenderY-up export','portrait':'exact young owner-reference crop embedded in front render'},indent=2),encoding='utf-8');print('DIPLOMA_GLB_VALIDATED')
