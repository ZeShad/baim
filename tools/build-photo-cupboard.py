"""Blender background authoring; preserves originals and exports editable source + runtime GLB."""
import bpy, math, os
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/chapter1/puzzles'
SRC = ROOT / 'assets_src/chapter1/puzzles'
OUT.mkdir(parents=True, exist_ok=True); SRC.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
def mat(name, color):
    m = bpy.data.materials.new(name); m.diffuse_color = (*color, 1)
    m.use_nodes = True; p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1); p.inputs['Roughness'].default_value = .64
    return m
wood = mat('warm worn oak', (.32,.18,.075)); dark = mat('recessed oak', (.11,.056,.024))
colors = { 'blue': mat('blue paint', (.025,.40,.68)), 'red': mat('red paint', (.65,.025,.07)), 'yellow': mat('yellow paint', (.95,.64,.015)) }
def box(name, loc, size, material, bevel=.002):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o=bpy.context.object; o.name=name
    o.dimensions=size; bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material)
    b=o.modifiers.new('soft worn edges','BEVEL'); b.width=bevel; b.segments=3
    o.modifiers.new('weighted normals','WEIGHTED_NORMAL'); return o
box('tray', (0,0,-.007), (.192,.232,.014), dark)
box('frame_left',(-.089,0,.009),(.014,.232,.028),wood)
box('frame_right',(.089,0,.009),(.014,.232,.028),wood)
box('frame_top',(0,.109,.009),(.164,.014,.028),wood)
for x in [-.06,.06]: box('exit_edge',(x,-.109,.009),(.044,.014,.028),wood)
# Authored positions are the six-move beginner layout. Local Z becomes glTF Y.
pieces=[('blue',2,2,1,2),('yellow1',1,2,0,1),('yellow2',1,2,3,0),('yellow3',1,2,0,3),('yellow4',1,2,3,3),('yellow5',2,1,1,0),('red1',1,1,1,1),('red2',1,1,2,1),('red3',1,1,1,4),('red4',1,1,2,4)]
for name,w,h,x,y in pieces:
    root=bpy.data.objects.new('piece_'+name,None); bpy.context.collection.objects.link(root); root['pieceId']=name
    root.location=((x+w/2-2)*.04,(2.5-y-h/2)*.04,.01)
    body=box(name+'_wood',(0,0,0),(w*.04-.003,h*.04-.003,.018),wood); body.parent=root
    # Grain is real shallow geometry, exported without reliance on unsupported procedural shaders.
    for i in range(4):
        grain=box(name+'_grain',( (i-1.5)*(w*.04-.009)/4,0,.0091),(.00035,h*.04-.008,.00015),dark,.00005); grain.parent=root
    bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=.010, depth=.0008, location=(0,0,.0098))
    badge=bpy.context.object; badge.name=name+'_paint'; badge.data.materials.append(colors['blue' if name=='blue' else name.rstrip('12345')]); badge.parent=root
# Preview camera and lights remain in editable source, not needed by runtime.
bpy.ops.object.camera_add(location=(.03,-.27,.44)); camera=bpy.context.object
from mathutils import Vector
camera.rotation_euler=(Vector((0,0,0))-camera.location).to_track_quat('-Z','Y').to_euler(); bpy.context.scene.camera=camera
camera.data.type='ORTHO'; camera.data.ortho_scale=.31
for loc,power,size in [((-.2,-.15,.4),3,.3),((.2,.1,.3),1.5,.2)]:
    bpy.ops.object.light_add(type='AREA',location=loc); lamp=bpy.context.object; lamp.data.energy=power; lamp.data.shape='DISK'; lamp.data.size=size
    lamp.rotation_euler=(Vector((0,0,0))-lamp.location).to_track_quat('-Z','Y').to_euler()
scene=bpy.context.scene; scene.render.engine='CYCLES'; scene.cycles.samples=24
scene.render.resolution_x=900; scene.render.resolution_y=1000; scene.render.resolution_percentage=100
scene.world.color=(.18,.14,.10)
bpy.ops.wm.save_as_mainfile(filepath=str(SRC/'photo-cupboard-c01.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'photo-cupboard-c01.glb'),export_format='GLB',export_extras=True,export_apply=True,export_cameras=False,export_lights=False)
scene.render.filepath=str(SRC/'photo-cupboard-c01.png'); bpy.ops.render.render(write_still=True)
