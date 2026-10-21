import test from 'node:test';
import assert from 'node:assert/strict';
import {game,sid,Game} from './helpers/restart-lifecycle-fixture.js';
import {AssetLoader} from '../src/engine/AssetLoader.js';

function fixture(){
 const g=game(),loads=[];
 g.player.id='npc.bai_mitko';g.bootstrapCharacterSlots=()=>[];
 g.assets=new AssetLoader({scenes:{[g.currentScene.id]:{background:'outgoing.png'},[sid('mehana')]:{handover:'handover.png'},[sid('village_square')]:{background:'square.png'}},characters:{},items:{}});
 g.assets.preloadSceneAssets=id=>new Promise((resolve,reject)=>loads.push({id,resolve,reject}));
 g.protectCurrentAssetWorkingSet=Game.prototype.protectCurrentAssetWorkingSet;
 return {g,loads};
}

test('idle protection refresh cannot evict incoming handover art during scene preload',async()=>{
 const {g,loads}=fixture(),pending=g.changeScene(sid('mehana'));
 const image={dataset:{loaded:'true'},naturalWidth:100,naturalHeight:100,src:'handover.png'};
 g.assets.images.set('handover.png',image);g.assets.decodedImageBudgetBytes=0;
 // Actual helper called by an idle selection/finish while the scene await is pending.
 g.protectCurrentAssetWorkingSet();
 assert.equal(g.assets.images.get('handover.png'),image,'incoming approved art must remain pinned');
 assert.equal(image.src,'handover.png');
 loads[0].resolve();await pending;
 assert.equal(g.currentScene.id,sid('mehana'));assert.equal(g.pendingSceneAssetId,null);
 assert.deepEqual([...g.assets.protectedPaths],['handover.png']);
});

test('superseded and rejected scene loads release only their own protection',async()=>{
 const {g,loads}=fixture(),first=g.changeScene(sid('mehana')),latest=g.changeScene(sid('village_square'));
 loads[0].resolve();await first;
 g.protectCurrentAssetWorkingSet();assert.ok(g.assets.protectedPaths.has('square.png'));
 assert.equal(g.pendingSceneAssetId,sid('village_square'));
 loads[1].reject(new Error('bounded fixture load failure'));await assert.rejects(latest,/bounded fixture/);
 assert.equal(g.sceneTransitionPending,false);assert.equal(g.pendingSceneAssetId,null);
 assert.equal(g.assets.protectedPaths.has('square.png'),false);
});
