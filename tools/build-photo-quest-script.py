"""Export the current script and bilingual quest lines; never overwrite earlier editions."""
from pathlib import Path
import json, subprocess, html
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, KeepTogether
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT.parent/'output/pdf/BAIM-chapter1-script-2026-10-22.pdf'
OUT.parent.mkdir(parents=True,exist_ok=True)
pdfmetrics.registerFont(TTFont('Script','C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('ScriptBold','C:/Windows/Fonts/arialbd.ttf'))
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='Copy',fontName='Script',fontSize=10.5,leading=15,spaceAfter=10,textColor=colors.HexColor('#302b24')))
styles.add(ParagraphStyle(name='Section',fontName='ScriptBold',fontSize=17,leading=22,spaceBefore=14,spaceAfter=12,textColor=colors.HexColor('#805423'),keepWithNext=True))
styles.add(ParagraphStyle(name='TitleScript',fontName='ScriptBold',fontSize=25,leading=31,spaceAfter=20,textColor=colors.HexColor('#65431f')))
styles.add(ParagraphStyle(name='CaptionScript',fontName='Script',fontSize=8.5,leading=12,spaceAfter=7,textColor=colors.HexColor('#786b58'),keepWithNext=True))
story=[]
for block in (ROOT/'docs/chapter1-script-2026-10-22.md').read_text(encoding='utf8').split('\n\n'):
    block=block.strip()
    if not block: continue
    style='TitleScript' if block.startswith('# ') else 'Section' if block.startswith('## ') else 'Copy'
    story.append(Paragraph(html.escape(block.lstrip('# ')).replace('\n',' '),styles[style]))
data=json.loads(subprocess.check_output(['C:/Program Files/nodejs/node.exe','--input-type=module','-e',"import {photoQuestBg,photoQuestEn} from './src/content/localization/chapter1PhotoQuest.js'; console.log(JSON.stringify({bg:photoQuestBg,en:photoQuestEn}));"],cwd=ROOT,text=True,encoding='utf8'))
selected=['pepa_start','pepa_requirements','music_done','poster_done','tony_proud','diploma_guarded','contest_result','tony_sleeping','diploma_taken','diploma_done','bills_not_diploma']
for lang,title in [('bg','Dialogue - Bulgarian'),('en','Dialogue - English')]:
    story.append(PageBreak()); story.append(Paragraph(title,styles['TitleScript']))
    story.append(Paragraph('Exact local quest lines. These accompany the current story, not the superseded bills recipe.',styles['CaptionScript']))
    for key in selected:
        story.append(KeepTogether([Paragraph(key.replace('_',' ').title(),styles['CaptionScript']),Paragraph(html.escape(data[lang]['photoquest.'+key]),styles['Copy'])]))
def footer(canvas,doc):
    canvas.setStrokeColor(colors.HexColor('#d6c8b0'));canvas.line(46,43,549,43)
    canvas.setFont('Script',8);canvas.setFillColor(colors.HexColor('#80705a'))
    canvas.drawString(46,29,'BAIM | Current story revision | 22 October 2026 | Local review')
    canvas.drawRightString(549,29,str(doc.page))
doc=SimpleDocTemplate(str(OUT),pagesize=(595,842),leftMargin=46,rightMargin=46,topMargin=42,bottomMargin=57,title='BAIM Chapter 1 - 22 October 2026',author='BAIM development')
doc.build(story,onFirstPage=footer,onLaterPages=footer)
from pypdf import PdfReader
reader=PdfReader(str(OUT)); assert len(reader.pages)>4
assert 'Pepa' in ''.join(p.extract_text() for p in reader.pages)
print(json.dumps({'pdf':str(OUT),'pages':len(reader.pages)},ensure_ascii=False))
