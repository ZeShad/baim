from pathlib import Path
from PIL import Image
r=Path(__file__).resolve().parent;im=Image.open(r/'toni-diploma-closeup.png');im.crop(im.getbbox()).save(r/'document-front.png')
