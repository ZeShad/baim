import bpy,bmesh,json
from pathlib import Path
base=Path(__file__).resolve().parent
repo=base.parents[3]
source=base.parent/'kiro-water-c07/water-c07.blend'
bpy.ops.wm.open_mainfile(filepath=str(source))
scene=bpy.context.scene;scene.frame_set(3)
water=next(o for o in scene.objects if o.type=='MESH' and 'water' in o.name.lower())
bm=bmesh.new();bm.from_mesh(water.data)
result=bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=1e-7,plane_co=(0,0,.153),plane_no=(0,0,1),clear_outer=True,clear_inner=False)
edges=[e for e in bm.edges if e.is_boundary and all(abs(v.co.z-.153)<1e-6 for v in e.verts)]
assert len(edges)>100
bmesh.ops.holes_fill(bm,edges=edges,sides=0);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));assert all(e.is_manifold for e in bm.edges)
bm.to_mesh(water.data);bm.free()
water.name='Fountain water olive brown lower shoulder r01'
mat=water.data.materials[0];mat.name='Fountain water olive brown r01'
node=next(n for n in mat.node_tree.nodes if n.type=='TEX_IMAGE')
# Reuse the accepted fine-silt texture with the same channel ratios as the GLB.
image=node.image.copy();image.name='water-olive-fine-silt-r01';pix=list(image.pixels)
def linear(c):
 s=c/255
 return s/12.92 if s<=.04045 else ((s+.055)/1.055)**2.4
old=[linear(c) for c in [152,184,160]];new=[linear(c) for c in [91,76,29]]
for i in range(0,len(pix),4):
 for c in range(3):pix[i+c]*=new[c]/old[c]
image.pixels=pix;image.pack();node.image=image
shader=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
shader.inputs['Transmission Weight'].default_value=0
shader.inputs['Alpha'].default_value=1
shader.inputs['Roughness'].default_value=.2
output=next(n for n in mat.node_tree.nodes if n.type=='OUTPUT_MATERIAL')
for link in list(output.inputs['Volume'].links):mat.node_tree.links.remove(link)
water['fill_height_m']=.153
out=base
scene.render.filepath=str(repo/'assets/chapter1/items/kiro-bottle/fountain-water-olive-r02.png')
scene.cycles.samples=48
scene.render.resolution_percentage=100
bpy.ops.wm.save_as_mainfile(filepath=str(out/'water-olive-r02.blend'))
prefs=bpy.context.preferences.addons['cycles'].preferences
try:
 prefs.compute_device_type='OPTIX';prefs.get_devices()
 for d in prefs.devices:d.use=d.type=='OPTIX'
 scene.cycles.device='GPU'
except:pass
bpy.ops.render.render(write_still=True)
print('OLIVE_NATIVE_COMPLETE')
