import bpy,math,json,hashlib,random
from pathlib import Path
from mathutils import Vector
r=Path(__file__).resolve().parent;random.seed(3)
bpy.ops.wm.read_factory_settings(use_empty=True);s=bpy.context.scene
s.render.engine='CYCLES';s.cycles.samples=48;s.cycles.use_denoising=True;s.render.film_transparent=True;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA'
try:
 prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='OPTIX';prefs.get_devices()
 for d in prefs.devices:d.use=d.type=='OPTIX'
 s.cycles.device='GPU' if any(d.type=='OPTIX' for d in prefs.devices)else'CPU'
except Exception:s.cycles.device='CPU'
s.world=bpy.data.worlds.new('Warm document studio');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.60,.52,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.15
s.view_settings.view_transform='Standard'
S=.0001;W=2900;H=2000;slope=.013
def point(x,y,lift=0):return ((x-W/2)*S,(H/2-y)*S,abs((x-W/2)*S)*slope+lift)
def mat(name,color):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=.85;return m
ink=mat('Faded charcoal print',(.10,.085,.075));purple=mat('Old violet school ink',(.22,.13,.33));blue=mat('Blue ink signatures',(.14,.20,.34));line=mat('Pale ruled lines',(.52,.40,.32))
paper=mat('Ornamental aged paper',(.75,.62,.49));nodes=paper.node_tree.nodes;links=paper.node_tree.links;tex=nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(r/'aged-paper-pattern.png'));tex.image.pack();links.new(tex.outputs['Color'],nodes['Principled BSDF'].inputs['Base Color'])
# A real shallow-fold paper mesh with thickness and a shared UV map.
nx,ny=60,40;verts=[point(W*i/nx,H*j/ny)for j in range(ny+1)for i in range(nx+1)];faces=[(j*(nx+1)+i,j*(nx+1)+i+1,(j+1)*(nx+1)+i+1,(j+1)*(nx+1)+i)for j in range(ny)for i in range(nx)]
m=bpy.data.meshes.new('Two-page folded paper');m.from_pydata(verts,[],faces);m.materials.append(paper);m.update();uv=m.uv_layers.new()
for poly in m.polygons:
 for li in poly.loop_indices:
  v=m.vertices[m.loops[li].vertex_index].co;uv.data[li].uv=((v.x+.145)/.29,(v.y+.10)/.20)
o=bpy.data.objects.new('Diploma paper with central fold',m);s.collection.objects.link(o);solid=o.modifiers.new('Paper thickness','SOLIDIFY');solid.thickness=.00022
font=bpy.data.fonts.load('C:/Windows/Fonts/georgia.ttf');bold=bpy.data.fonts.load('C:/Windows/Fonts/georgiab.ttf');italic=bpy.data.fonts.load('C:/Windows/Fonts/georgiai.ttf')
texts=[]
def text(name,body,x,y,size,maxwidth=None,material=ink,boldface=False,italics=False):
 c=bpy.data.curves.new(name,'FONT');c.body=body;c.font=bold if boldface else italic if italics else font;c.size=size*S;c.space_character=1.03;c.resolution_u=8
 ob=bpy.data.objects.new(name,c);s.collection.objects.link(ob);ob.location=point(x,y,.00032);ob.rotation_euler[1]=math.atan(slope)if x<W/2 else -math.atan(slope);c.materials.append(material);bpy.context.view_layer.update()
 if maxwidth and ob.dimensions.x>maxwidth*S:ob.scale.x=maxwidth*S/ob.dimensions.x
 texts.append(ob);return ob
def curve(name,points,material=line,width=.4,closed=False):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=width*S;c.bevel_resolution=1;sp=c.splines.new('POLY');sp.points.add(len(points)-1)
 for v,(x,y)in zip(sp.points,points):v.co=(*point(x,y,.00019),1)
 sp.use_cyclic_u=closed;ob=bpy.data.objects.new(name,c);s.collection.objects.link(ob);c.materials.append(material);return ob
def rule(x0,x1,y):curve('Printed ruled line',[(x0,y),(x1,y)],width=.45)
def stamp(cx,cy,rad,label):
 for rr in [rad,rad-8,rad-37]:curve('Violet school seal',[(cx+rr*math.cos(i*math.tau/144),cy+rr*math.sin(i*math.tau/144))for i in range(144)],purple,.9,True)
 text('Fictional school stamp',label,cx-rad+35,cy-20,29,2*rad-70,purple,boldface=True)
 text('Fictional archive stamp','УЧИЛИЩЕН АРХИВ',cx-rad+22,cy+26,23,2*rad-44,purple)
 text('Seal center','СЕЛОТО',cx-rad+65,cy+68,28,2*rad-130,purple,boldface=True)
def signature(x,y):
 points=[(x+i*3,y-35*math.sin(i*.38)*math.exp(-i/65)-i*.18)for i in range(70)];curve('Handwritten signature',points,blue,1.3)
text('Main title','Д И П Л О М А',555,190,112,820,boldface=True)
text('Secondary title','ЗА СРЕДНО ОБРАЗОВАНИЕ',555,292,53,820,boldface=True)
text('School','СУ „СВЕТЛО БЪДЕЩЕ“',555,397,38,800)
text('Archive series','Серия СБ • № 0003',555,490,39,800)
text('Registration','Рег. № 003 / 25.06.1989 г.',555,575,36,800)
name=text('Diploma holder','ТОНЧО КАРАБАНОВ',90,780,63,1230)
for y in [806,910,1010,1125]:rule(75,1380,y)
text('Holder description','завърши средно общообразователно училище',85,876,37,1280)
text('Study profile','Профил: общообразователна подготовка',85,974,36,1280)
text('Study year','Учебна година 1988 / 1989',85,1071,36,1250)
text('Overall label','С общ успех:',250,1225,39,400)
text('Overall grade','Среден / 3.00 /',650,1232,61,650,italics=True)
text('Commission text','С решение на зрелостната изпитна комисия',85,1360,35,1260)
text('Education recognition','се признава СРЕДНО ОБРАЗОВАНИЕ.',220,1425,36,1120)
text('Committee','ЗРЕЛОСТНА КОМИСИЯ:',85,1615,31,650,boldface=True)
text('Director','ДИРЕКТОР:',790,1615,31,500,boldface=True)
signature(100,1690);signature(790,1695);stamp(1070,1750,166,'СВЕТЛО БЪДЕЩЕ')
text('Prop footer','Другарят Кандидат • училищен реквизит',200,1930,25,1160)
stamp(430,590,146,'СВЕТЛО БЪДЕЩЕ')
# Portrait has its own editable plane and packed source image.
portraitmat=mat('Toni archive photograph',(.5,.5,.5));pn=portraitmat.node_tree.nodes;pt=pn.new('ShaderNodeTexImage');toni_image=bpy.data.images.load(str(r/'toni-portrait.png'));toni_image.pack();mitko_image=bpy.data.images.load(str(r/'mitko-portrait.png'));mitko_image.pack();pt.image=toni_image;portraitmat.node_tree.links.new(pt.outputs['Color'],pn['Principled BSDF'].inputs['Base Color'])
pm=bpy.data.meshes.new('ID photograph');pm.from_pydata([point(75,95,.00023),point(470,95,.00023),point(470,615,.00023),point(75,615,.00023)],[],[(0,1,2,3)]);pm.materials.append(portraitmat);pm.uv_layers.new()
for li,coord in zip(pm.polygons[0].loop_indices,[(0,1),(1,1),(1,0),(0,0)]):pm.uv_layers.active.data[li].uv=coord
po=bpy.data.objects.new('Portrait of diploma holder',pm);s.collection.objects.link(po)
# Every assessment uses the requested grade, including overall and exam results.
grades=[]
def grade_row(subject,y):
 text('Subject '+subject,subject,1530,y,35,800);grades.append(text('Grade '+subject+' '+str(y),'Среден 3.00',2390,y,45,420,italics=True));rule(1515,2835,y+18)
text('Maturity heading','УСПЕХ ОТ ЗРЕЛОСТНИ ИЗПИТИ',1780,125,39,1000,boldface=True)
grade_row('Български език и литература',210);grade_row('История',285)
text('Mandatory heading','УСПЕХ ОТ ЗАДЪЛЖИТЕЛНА ПОДГОТОВКА',1630,445,36,1190,boldface=True)
subjects=['Български език и литература','Руски език','Немски език','Математика','Информатика','История','Философия','Физика и астрономия','Химия','Биология','География','Изобразително изкуство','Музика','Технологии','Физическа култура']
for i,subject in enumerate(subjects):grade_row(subject,535+i*69)
text('Profile heading','УСПЕХ ОТ ПРОФИЛИРАЩАТА ПОДГОТОВКА',1570,1700,35,1250,boldface=True)
grade_row('Общообразователен профил',1790)
for x0,x1,y in [(50,1395,45),(1505,2850,45),(50,1395,1960),(1505,2850,1960)]:rule(x0,x1,y)
for x in [50,1395,1505,2850]:curve('Page border',[(x,45),(x,1960)],line,.6)
# Large soft area lights preserve print readability while revealing paper fold/thickness.
for label,loc,power,size in [('Left softbox',(-.22,-.12,.42),1.2,.4),('Right fill',(.25,.18,.35),.7,.35)]:
 d=bpy.data.lights.new(label,'AREA');d.energy=power;d.shape='DISK';d.size=size;ob=bpy.data.objects.new(label,d);s.collection.objects.link(ob);ob.location=loc;ob.rotation_euler=(Vector((0,0,0))-ob.location).to_track_quat('-Z','Y').to_euler()
cd=bpy.data.cameras.new('Diploma camera');cam=bpy.data.objects.new('Diploma camera',cd);s.collection.objects.link(cam);s.camera=cam;cd.type='ORTHO';cd.ortho_scale=.307
def camera(loc):cam.location=loc;cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler()
def render(file,loc,w,h):
 camera(loc);s.render.resolution_x=w;s.render.resolution_y=h;s.render.resolution_percentage=100;s.render.filepath=str(r/file);bpy.ops.render.render(write_still=True)
assert len(grades)==18;assert all(ob.data.body=='Среден 3.00'for ob in grades)
render('toni-diploma-closeup.png',(0,0,.6),2320,1600)
bpy.ops.wm.save_as_mainfile(filepath=str(r/'toni-diploma.blend'))
render('toni-diploma-table.png',(0,-.5,.2487),1600,800)
# Pepa's copy uses the same document and grades, preserving its established holder label.
name.data.body='БАЙ МИТКО';pt.image=mitko_image
render('pepa-mitko-diploma-closeup.png',(0,0,.6),2320,1600)
bpy.ops.wm.save_as_mainfile(filepath=str(r/'pepa-mitko-diploma.blend'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
(r/'provenance.json').write_text(json.dumps({'reference':'owner-diploma-reference.jpg','holder':'Тончо Карабанов','derivedHolder':'БАЙ МИТКО (existing game copy label)','assessmentEntries':len(grades),'gradeEveryEntry':'Среден 3.00','overall':'Среден / 3.00 /','sourcePortrait':'Exact young photograph crop from owner054-scaled.jpg; no retouch or age change','school':'fictional СУ Светло бъдеще; no source-photo holder, personal IDs or official seals reused','construction':'folded thick paper mesh, editable Cyrillic font objects and curves for rulings/seals/signatures, packed paper/portrait textures; native Cycles renders','fonts':'installed Windows Georgia, external font references; no standalone font redistribution','renders':{p.name:{'sha256':sha(p),'bytes':p.stat().st_size}for p in r.glob('*.png')}},ensure_ascii=False,indent=2))
print('DIPLOMA_COMPLETE: both editable Blender sources and renders;18 assessment entries allСреден3.00 plus overall3.00.')
