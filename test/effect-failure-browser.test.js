import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {browserAvailable} from './helpers/browser-availability.js';

// Deliberately invalid guard fixtures, exercised through the real dialogue UI.
// These do not claim the ordinary bottle quest produced conflicting inventory.
test('BG/EN failed effect choices keep UI/state/save and suppress success presentation', {timeout:90000},async t=>{
  if(!browserAvailable(t,chromium.executablePath()))return;
  const port=await new Promise(resolve=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
  const server=spawn(process.execPath,['tools/dev-server.mjs'],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
  let output='',browser;server.stdout.on('data',s=>output+=s);server.stderr.on('data',s=>output+=s);
  const root=process.env.BAIM_EFFECT_REVIEW_DIR||('target/effect-failure-review-'+Date.now());mkdirSync(root,{recursive:true});
  const results=[];
  try {
    let ready=false;for(let i=0;i<100;i++){try{ready=(await fetch(`http://127.0.0.1:${port}/`)).ok;}catch{}if(ready)break;await new Promise(r=>setTimeout(r,100));}assert.ok(ready,output);
    browser=await chromium.launch({headless:true});
    for(const language of ['bg','en']) {
      const context=await browser.newContext({viewport:{width:1280,height:720},serviceWorkers:'block'}),page=await context.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(String(e)));
      await page.addInitScript(()=>window.requestAnimationFrame=()=>0);
      await page.goto(`http://127.0.0.1:${port}/?play=1&testHarness=1`);await page.evaluate(()=>window.__comradeCandidateTest.ready);
      for(const conflict of ['missing','held','dropped']) {
        const before=await page.evaluate(async({language,conflict})=>{
          const g=window.__comradeCandidateTest.game;
          await g.changeScene('scene.chapter1.mehana');g.setLanguage(language);
          g.state.inventory=conflict==='missing'?[]:['item.sunflower_oil'];
          if(conflict==='held')g.state.inventory.push('item.empty_rakia_bottle');
          g.state.droppedItems=conflict==='dropped'?[{itemId:'item.empty_rakia_bottle',sceneId:g.currentScene.id,position:{x:700,y:550}}]:[];
          const choice={textKey:'fountain.kiro.choice.refill',next:'reward',effect:{
            effects:[{type:'setFlag',key:'earlyFailureFixture'}, {type:'adjustState',key:'influence',amount:10},
              {type:'startQuest',questId:'quest.chapter1.baba_vote'},
              {type:'replaceItem',itemId:'item.sunflower_oil',withItemId:'item.empty_rakia_bottle'},
              {type:'setState',key:'tonyVote',value:true}],
            messageKey:'bottle.filled',soundCue:'success',sceneTransition:{sceneId:'scene.chapter1.village_square'}}};
          g.content.dialogues['dialogue.failure_fixture']={npcId:'npc.mehana_waiter',nodes:{
            start:{lineKey:'dialogue.waiter.start',choices:[choice]},reward:{lineKey:'bottle.filled',choices:[]}}};
          g.dialogue.start('dialogue.failure_fixture');g.renderUi();g.tick(g.lastTime+16);g.save();
          window.__effectCalls=[];
          for(const name of ['save','setStatusMessage','setNpcSpeechMessage','changeScene']){
            const original=g[name].bind(g);g[name]=(...args)=>{window.__effectCalls.push(name);return original(...args);};
          }
          const play=g.audio.play.bind(g.audio);g.audio.play=(...args)=>{window.__effectCalls.push('sound');return play(...args);};
          return {state:structuredClone(g.state),saved:JSON.stringify({...localStorage}),scene:g.currentScene.id};
        },{language,conflict});
        const button=page.locator('.dialogue-choice-list button');await button.click();await button.click();
        const after=await page.evaluate(()=>{const g=window.__comradeCandidateTest.game;return {
          state:structuredClone(g.state),saved:JSON.stringify({...localStorage}),scene:g.currentScene.id,
          node:g.dialogue.current?.nodeId,calls:window.__effectCalls};});
        assert.deepEqual(after.state,before.state);assert.equal(after.saved,before.saved);assert.equal(after.scene,before.scene);
        assert.equal(after.node,'start');assert.deepEqual(after.calls,[]);assert.equal(await button.count(),1);
        if(conflict==='held')await page.screenshot({path:`${root}/${language}-blocked-choice.png`});
        results.push({language,conflict,stateUnchanged:true,saveUnchanged:true,node:after.node,calls:after.calls});
      }
      const worldBefore=await page.evaluate(async()=>{
        const g=window.__comradeCandidateTest.game;g.dialogue.close();await g.changeScene('scene.chapter1.village_square');
        g.state.inventory=['item.sunflower_oil','item.empty_rakia_bottle'];g.state.droppedItems=[];g.state.flags={};
        g.renderUi();g.tick(g.lastTime+16);g.save();window.__effectCalls=[];window.__worldApplications=[];
        const apply=g.applyContentEffect.bind(g);g.applyContentEffect=(definition,...args)=>{
          const result=apply(definition,...args);window.__worldApplications.push({messageKey:definition.messageKey,result});return result;
        };
        return {state:structuredClone(g.state),saved:JSON.stringify({...localStorage})};
      });
      await page.locator('[data-item-id="item.sunflower_oil"]').click();
      const useLabel=await page.evaluate(()=>window.__comradeCandidateTest.game.t('ui.inventory.use'));
      await page.locator('.inventory-item-actions').getByRole('button',{name:useLabel,exact:true}).click();
      const point=await page.evaluate(async()=>{
        const g=window.__comradeCandidateTest.game,{findTargetAt}=await import('/src/engine/SceneGeometry.js'),points=[];
        for(let y=80;y<580;y+=8)for(let x=16;x<1260;x+=8)
          if(findTargetAt(g.currentScene,{x,y},t=>g.targetAvailable(t))?.id==='hotspot.square.statue')points.push({x,y});
        if(!points.length)throw Error('No exposed fountain');return points[Math.floor(points.length/2)];
      });
      await page.locator('#game').click({position:point});
      for(let i=0;i<160;i++){
        const settled=await page.evaluate(()=>{const g=window.__comradeCandidateTest.game;for(let j=0;j<5;j++)g.tick(g.lastTime+50);return !g.player.pendingInteraction&&!g.player.actionSequence&&!g.sceneTransitionPending&&!g.sceneAction.active;});
        if(settled)break;await page.waitForTimeout(10);if(i===159)throw Error('Fountain interaction did not settle');
      }
      const worldAfter=await page.evaluate(()=>{const g=window.__comradeCandidateTest.game;return {state:structuredClone(g.state),saved:JSON.stringify({...localStorage}),calls:window.__effectCalls,applications:window.__worldApplications,item:g.inventoryUseItemId};});
      assert.deepEqual(worldAfter.state,worldBefore.state);assert.equal(worldAfter.saved,worldBefore.saved);assert.deepEqual(worldAfter.calls,[]);
      assert.equal(worldAfter.applications.length,1);assert.equal(worldAfter.applications[0].result,true);assert.equal(worldAfter.item,null);
      assert.equal(await page.locator('.inventory-use-indicator').count(),0);
      results.push({language,conflict:'authored-fountain-held',actualClicks:true,stateUnchanged:true,saveUnchanged:true,applications:worldAfter.applications,indicatorCleared:true});
      assert.deepEqual(errors,[]);await context.close();
    }
    writeFileSync(root+'/results.json',JSON.stringify({guardFixtures:true,results},null,2));
  }catch(error){writeFileSync(root+'/failure.json',JSON.stringify({error:String(error),stack:error.stack,results,serverOutput:output},null,2));throw error;}
  finally{await browser?.close();server.kill();writeFileSync(root+'/server.log',output);}
});
