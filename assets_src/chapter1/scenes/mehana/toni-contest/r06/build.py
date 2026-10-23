"""Owner-requested Blender glass and bottle-angle artwork. Original r07 is read-only."""
import bpy,bmesh,math,json,hashlib
from pathlib import Path
from mathutils import Matrix,Vector
ROOT=next(p for p in Path(__file__).resolve().parents if (p/'BAIM-WORKSPACE-INDEX.md').exists())
OUT=Path(__file__).resolve().parent/'renders';OUT.mkdir(parents=True,exist_ok=True)
SOURCE=ROOT/'extraFixes/blender-workshop/rakia-oil-200ml/blender-r07/kiro-bottle-shared-1L-r07.blend'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
original_hash=sha(SOURCE)
bpy.ops.wm.open_mainfile(filepath=str(SOURCE));scene=bpy.context.scene;scene.frame_set(3)
scene.render.resolution_x=600;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.cycles.samples=64;scene.cycles.use_denoising=True
prefs=bpy.context.preferences.addons['cycles'].preferences
try:
 prefs.compute_device_type='OPTIX';prefs.get_devices()
 for d in prefs.devices:d.use=d.type=='OPTIX'
 scene.cycles.device='GPU' if any(d.type=='OPTIX' for d in prefs.devices) else 'CPU'
except Exception:scene.cycles.device='CPU'
meshes=[o for o in scene.objects if o.type=='MESH']
for o in meshes:o.animation_data_clear()
water=next(o for o in meshes if o.name.startswith('Yellow water'))
oil=next(o for o in meshes if o.name.startswith('Sunflower oil'))
shell=[o for o in meshes if o not in [water,oil]]
for o in meshes:o.hide_render=True

def mesh(name,verts,faces,mat):
 m=bpy.data.meshes.new(name);m.from_pydata(verts,[],faces);m.update()
 bm=bmesh.new();bm.from_mesh(m);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-8);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(m);bm.free()
 ob=bpy.data.objects.new(name,m);scene.collection.objects.link(ob);m.materials.append(mat)
 for p in m.polygons:p.use_smooth=True
 return ob
def lathe(name,profile,mat,waves=False):
 n=192;verts=[]
 for z,r in profile:
  for a in range(n):
   theta=a*2*math.pi/n
   envelope=max(0,min(1,(z-.111)/.003,(.168-z)/.003)) if waves else 0
   ripple=.00065*math.sin((z-.111)/.008*2*math.pi+.7*math.sin(theta*7))*envelope if r>0 else 0
   radius=max(0,r+ripple)
   verts.append((radius*math.cos(theta),radius*math.sin(theta),z))
 faces=[(j*n+a,j*n+(a+1)%n,(j+1)*n+(a+1)%n,(j+1)*n+a)for j in range(len(profile)-1)for a in range(n)]
 return mesh(name,verts,faces,mat)
def fluid(name,color,alpha=.7):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF')
 p.inputs['Base Color'].default_value=(*color,1);p.inputs['Transmission Weight'].default_value=.35;p.inputs['Roughness'].default_value=.055;p.inputs['IOR'].default_value=1.36;p.inputs['Alpha'].default_value=alpha
 return m
# Half of the actual approved shoulder-fill mesh volume, rather than height/2.
groups={}
for v in water.data.vertices:groups.setdefault(round(v.co.z,8),[]).append(v.co.copy())
profile=sorted((z,sum(math.hypot(v.x,v.y)for v in vs)/len(vs))for z,vs in groups.items())
def clip(h):
 p=[(z,r)for z,r in profile if z<h]
 for (z0,r0),(z1,r1)in zip(profile,profile[1:]):
  if z0<=h<=z1:p.append((h,r0+(r1-r0)*(h-z0)/(z1-z0)));break
 return p
def volume(p):return sum((z1-z0)*(r0*r0+r0*r1+r1*r1)/3*math.pi for(z0,r0),(z1,r1)in zip(p,p[1:]))
lo,hi=profile[0][0],profile[-1][0]
for _ in range(60):
 h=(lo+hi)/2
 if volume(clip(h))<volume(profile)/2:lo=h
 else:hi=h
half_profile=clip((lo+hi)/2)
half=lathe('R06 half shoulder-fill rakia',[(half_profile[0][0],0)]+half_profile+[(half_profile[-1][0],0)],fluid('R06 pale rakia',(.368,.376,.192),.9))
half.data.materials[0].node_tree.nodes.get('Principled BSDF').inputs['Transmission Weight'].default_value=.35
# Match the retained olive-brown fountain-water direction, without altering inventory art.
water.data=water.data.copy();water.data.materials.clear();water.data.materials.append(fluid('R06 olive fountain water',(.26,.27,.09),.9))
initial={o.name:o.matrix_world.copy()for o in shell+[water,half]}
bottle_cam=scene.camera.matrix_world.copy();bottle_scale=scene.camera.data.ortho_scale

glassmat=bpy.data.materials['Warm clear reused glass'].copy();glassmat.name='R06 source-derived clear pressed glass'
p=next(n for n in glassmat.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Base Color'].default_value=(.985,.99,1,1);p.inputs['Roughness'].default_value=.04;p.inputs['Transmission Weight'].default_value=1;p.inputs['IOR'].default_value=1.52
output=next(n for n in glassmat.node_tree.nodes if n.type=='OUTPUT_MATERIAL')
for link in list(output.inputs['Volume'].links):glassmat.node_tree.links.remove(link)
# Closed outer shell, rounded rim, hollow interior, thick12mm glass base.
outer=[(.100,0),(.100,.0198),(.1007,.0205),(.102,.0208)]
outer += [(z,.0208+(z-.102)/.067*.0082)for z in [.102+i*.0004 for i in range(168)]]
rim=[(.1693,.029),(.170,.0288),(.1703,.0282),(.170,.0263),(.1693,.026)]
inner=[(z,.0178+(z-.113)/.0563*.0082)for z in [.1689-i*.0004 for i in range(140)]]
glass=lathe('R06 reference wavy pressed rakia glass',outer+rim+inner+[(.112,.0175),(.112,0)],glassmat,True)
rakia=lathe('R06 half glass rakia',[(.1123,0),(.1123,.0172),(.140,.0212),(.140,0)],fluid('R06 clear glass rakia',(.48,.496,.256),.65))
murky=lathe('R06 half glass fountain water',[(.1123,0),(.1123,.0172),(.140,.0212),(.140,0)],fluid('R06 murky glass water',(.40,.42,.17),.65))
new=[glass,rakia,murky,half];allmeshes=shell+[water,oil]+new
for o in allmeshes:o.hide_render=True
def bottle_state(angle,liquid):
 rot=Matrix.Rotation(math.radians(angle),4,'Z')
 for o in shell+[water,half]:o.matrix_world=rot@initial[o.name]
 scene.camera.matrix_world=bottle_cam;scene.camera.data.ortho_scale=bottle_scale
 return shell+([liquid]if liquid else [])
def glass_state(liquid):
 scene.camera.location=Vector((.10,-.20,.205));direction=Vector((0,0,.135))-scene.camera.location;scene.camera.rotation_euler=direction.to_track_quat('-Z','Y').to_euler();scene.camera.data.ortho_scale=.091
 return [glass]+([liquid]if liquid else [])
states=[('rakia-half',lambda:bottle_state(19,half)),('water-bottle',lambda:bottle_state(-26,water)),('empty-bottle',lambda:bottle_state(-26,None)),('glass-empty',lambda:glass_state(None)),('glass-half',lambda:glass_state(rakia)),('glass-water',lambda:glass_state(murky))]
scene.frame_start=1;scene.frame_end=6
for frame,(name,setup)in enumerate(states,1):
 scene.frame_set(frame);visible=setup()
 for o in allmeshes:
  o.hide_render=o not in visible;o.keyframe_insert('hide_render',frame=frame)
  for prop in ['location','rotation_euler','scale']:o.keyframe_insert(prop,frame=frame)
 scene.camera.keyframe_insert('location',frame=frame);scene.camera.keyframe_insert('rotation_euler',frame=frame);scene.camera.data.keyframe_insert('ortho_scale',frame=frame)
 scene.timeline_markers.new(name,frame=frame)
 scene.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
scene.frame_set(4)
for o in allmeshes:o.hide_set(o.hide_render)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT.parent/'toni-table-props-r06.blend'))
bm=bmesh.new();bm.from_mesh(glass.data);nonmanifold=sum(not e.is_manifold for e in bm.edges);bm.free()
assert nonmanifold==0,nonmanifold
assert sha(SOURCE)==original_hash,'Original source must remain unchanged'
(OUT.parent/'provenance.json').write_text(json.dumps({'source':str(SOURCE),'sourceSHA256':original_hash,'sourceUnchanged':True,'glass':'Owner photograph: tapered, thick base, seven wavy horizontal pressed ribs; closed hollow manifold mesh','glassHeightM':.0703,'glassTopDiameterM':.058,'glassBaseThicknessM':.012,'glassNonmanifoldEdges':nonmanifold,'halfBottleVolumeRatio':volume(half_profile)/volume(profile),'bottleZAnglesDegrees':{'toniRakia':19,'mitkoWaterAndEmpty':-26},'states':{str(i+1):name for i,(name,_)in enumerate(states)},'render':'Cycles transparent RGBA; inherited r07 camera/light rig for bottles, same lights with closer glass camera; no inventory/animation asset edits','renders':{p.name:{'sha256':sha(p),'bytes':p.stat().st_size}for p in OUT.glob('*.png')}},indent=2))
print('R06_COMPLETE: editable blend, six renders, closed glass mesh; original preserved.')

