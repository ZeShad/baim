from pathlib import Path
from PIL import Image,ImageEnhance
import json,hashlib
r=Path(__file__).resolve().parent;im=Image.open(r/'owner-diploma-reference.jpg');assert im.size==(2560,1756)
box=(64,66,414,534);portrait=im.crop(box);portrait.save(r/'toni-portrait.png')
paper=Image.open(r/'aged-paper-pattern.png');ImageEnhance.Brightness(paper).enhance(.76).save(r/'paper-back.png')
(r/'portrait-provenance.json').write_text(json.dumps({'source':'owner-diploma-reference.jpg','sourceSHA256':hashlib.sha256((r/'owner-diploma-reference.jpg').read_bytes()).hexdigest(),'cropNativePixels':box,'sourceDimensions':im.size,'portraitSHA256':hashlib.sha256((r/'toni-portrait.png').read_bytes()).hexdigest(),'modification':'Exact young-man photograph crop from owner reference; no generated identity, retouch or age change.'},indent=2),encoding='utf-8');print('Original young portrait cropped unchanged from owner reference.')
