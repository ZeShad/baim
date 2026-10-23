import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const root='target/photo-quest-review';mkdirSync(root,{recursive:true});
const browser=await chromium.launch({headless:true}),report=[];
try {
 for(const lang of ['bg','en']){
  const context=await browser.newContext({viewport:{width:1280,height:720},serviceWorkers:'block'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:5173/?play=1&animationFit=1&proof=1');
  await page.locator('.hud-verb').waitFor();
  // The shipped HUD paints before bootstrap/preload binds canvas input.
  // Read actual readiness; do not click early and misdiagnose a lost boot-time click as a quest defect.
  await page.waitForFunction(()=>window.__comradeCandidateAnimationFit?.game.inputBound===true);
  const actual=await page.evaluate(()=>{const g=window.__comradeCandidateAnimationFit?.game;return {scene:g?.currentScene?.id,puzzles:g?.currentScene?.interactables?.filter(t=>t.puzzleId).map(t=>t.id),gameHasPuzzle:String(g?.useTarget).includes('photo_cupboard')};});
  console.log(JSON.stringify(actual));
  if(!actual.puzzles?.length)throw Error('Bookmark is serving a different source checkout; leave listener untouched until ownership is verified');
  if(lang==='en')await page.getByRole('button',{name:'EN',exact:true}).click();
  const use=lang==='bg'?'Използвай':'Use';
  for(let i=0;i<4;i++){if((await page.locator('.hud-verb').textContent()).trim()===use)break;await page.locator('.hud-verb').click();}
  await page.locator('#game').click({position:{x:900,y:320}});
  try {await page.locator('.photo-puzzle-view[data-model-state=ready]').waitFor({timeout:30000});}
  catch(error){await page.screenshot({path:`${root}/normal-failure-${lang}.png`});console.log(JSON.stringify({lang,verb:await page.locator('.hud-verb').textContent().catch(()=>null),canvas:await page.locator('#game').boundingBox(),modal:await page.locator('.photo-puzzle-screen').count(),errors,debug:await page.evaluate(()=>{const g=window.__comradeCandidateAnimationFit.game;return {puzzleOpen:g.puzzleOpen,feet:g.player.position,animation:g.player.animation,target:g.player.target,pending:g.player.pendingInteraction,ready:g.locomotionArtReady(),sceneAction:g.sceneAction.active,selected:g.selectedVerb,hit:g.sceneTargetAt({x:900,y:320})?.id};}),body:(await page.locator('body').innerText()).slice(-1800)}));throw error;}
  await page.screenshot({path:`${root}/normal-preview-${lang}.png`});
  await page.keyboard.press('Escape');await page.waitForTimeout(2200);
  await page.screenshot({path:`${root}/normal-after-puzzle-${lang}.png`});
  report.push({lang,puzzle:true,closed:(await page.locator('.photo-puzzle-screen').count())===0,errors});
  await context.close();
 }
}finally{await browser.close();writeFileSync(`${root}/normal-preview.json`,JSON.stringify({url:'http://127.0.0.1:5173/?play=1&animationFit=1&proof=1',isolatedBrowserStorage:true,report},null,2));}
if(report.length!==2||report.some(r=>r.errors.length||!r.closed))throw Error('Preview verification failed');
console.log(JSON.stringify(report));
