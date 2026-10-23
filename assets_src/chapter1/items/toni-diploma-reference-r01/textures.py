from pathlib import Path
from PIL import Image,ImageDraw,ImageOps,ImageFilter
import numpy as np
r=Path(__file__).resolve().parent;root=r.parents[2];r.mkdir(exist_ok=True)
tony=Image.open(root/'baim-photo-pepa-diploma/assets/chapter1/characters/tony_fridge/seated-v1.png').convert('RGB').crop((315,0,700,485))
mitko=Image.open(root/'baim-photo-pepa-diploma/assets/chapter1/items/mitko-photo.png').convert('RGB').crop((20,15,230,280))
for name,im in [('toni',tony),('mitko',mitko)]:
 im=ImageOps.fit(im,(400,520),method=Image.Resampling.LANCZOS);im=ImageOps.grayscale(im);im=ImageOps.colorize(im,'#24201d','#e9e3d4');im.save(r/(name+'-portrait.png'))
w,h=2900,2000;rng=np.random.default_rng(3);noise=rng.normal(0,1.8,(h,w,1));base=np.array([223,204,185])[None,None,:];pixels=np.clip(base+noise,0,255).astype(np.uint8);paper=Image.fromarray(pixels,'RGB');draw=ImageDraw.Draw(paper)
# Repeating pale printed security-paper ornament, drawn afresh rather than copied.
for y in range(-40,h+70,52):
 for x in range(-50,w+90,62):
  draw.ellipse((x-18,y-30,x+18,y+30),outline=(239,224,207),width=3)
  draw.arc((x-34,y-17,x+34,y+17),0,360,fill=(236,220,202),width=2)
for x in range(w):
 edge=max(0,1-min(x,w-1-x)/70);fold=max(0,1-abs(x-w/2)/18)
 if edge or fold:draw.line((x,0,x,h),fill=tuple(int(c*(1-.07*edge-.11*fold))for c in [223,204,185]))
paper.save(r/'aged-paper-pattern.png');print('Packed portrait textures and fresh ornamental paper pattern prepared.')
