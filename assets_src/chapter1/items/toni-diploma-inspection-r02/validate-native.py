import bpy,hashlib,json
from pathlib import Path
r=Path(__file__).resolve().parent;bpy.ops.wm.open_mainfile(filepath=str(r/'toni-diploma.blend'))
objects=bpy.context.scene.objects;grades=[o for o in objects if o.type=='FONT'and o.name.startswith('Grade ')]
assert len(grades)==18 and all(o.data.body=='Среден 3.00'for o in grades);assert objects['Diploma holder'].data.body=='ТОНЧО КАРАБАНОВ';assert objects['Overall grade'].data.body=='Среден / 3.00 /'
image=bpy.data.images['toni-portrait.png'];assert image.packed_file
packedSHA=hashlib.sha256(bytes(image.packed_file.data)).hexdigest();fileSHA=hashlib.sha256((r/'toni-portrait.png').read_bytes()).hexdigest();assert packedSHA==fileSHA
(r/'native-validation.json').write_text(json.dumps({'passed':True,'holder':'ТОНЧО КАРАБАНОВ','assessmentEntries':18,'allGrades':'Среден 3.00','overall':'Среден / 3.00 /','packedPortraitSHA256':packedSHA,'exactSourceCropBytesPacked':True,'portraitPixels':list(image.size)},ensure_ascii=False,indent=2),encoding='utf-8');print('NATIVE_YOUNG_PHOTO_AND_GRADES_VALIDATED')
