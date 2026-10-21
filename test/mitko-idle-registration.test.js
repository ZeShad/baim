import test from 'node:test';
import assert from 'node:assert/strict';
import {standingIdleRegistration,stableExternalVisualBounds,externalFrameVisualBounds} from '../src/engine/Renderer.js';
import {characterDefinitions} from '../src/content/art/characters.js';
import {externalAnimationV1} from '../src/content/art/externalAnimationRuntime.generated.js';
const definition=characterDefinitions['npc.bai_mitko'],stop=definition.animations.walk.parts.east.stop;
const rest=externalFrameVisualBounds(stop,stop.frameCount-1),ground=stableExternalVisualBounds(definition,true);
for(const facing of ['east','west'])for(const frame of externalAnimationV1.idleVariants[facing]){
 test(facing+' '+frame.idleKey+' has one original-rest registration across every pose',()=>{
  const registration=standingIdleRegistration(frame,definition);
  assert.deepEqual(registration,{visualHeight:rest.h,baselineY:ground.baselineY});
  // Constant registration preserves rather than fits away the head/body motion.
  for(let i=0;i<frame.frameCount;i++)assert.deepEqual(standingIdleRegistration(frame,definition),registration);
  for(const height of [109,188,300]){
   const scale=height/registration.visualHeight,first=externalFrameVisualBounds(frame,0);
   const last=externalFrameVisualBounds(frame,frame.frameCount-1);
   assert.ok(Math.abs(first.y-rest.y)*scale<=1,'head entry matches original standing pose');
   assert.ok(Math.abs(first.y+first.h-rest.y-rest.h)*scale<=1,'sole entry under one logical pixel');
   assert.ok(Math.abs(first.x-rest.x)*scale<=1,'horizontal entry under one logical pixel');
   assert.ok(Math.abs(last.y+last.h-rest.y-rest.h)*scale<=1,'sole exit under one logical pixel');
   assert.ok(Math.abs(last.y-rest.y)*scale<=1,'head exit under one logical pixel');
  }
 });
}
test('locomotion and incompatible artwork receive no idle transform',()=>{
 for(const parts of Object.values(definition.animations.walk.parts))for(const frame of Object.values(parts))assert.equal(standingIdleRegistration(frame,definition),null);
 const f=externalAnimationV1.idleVariants.east[0];assert.equal(standingIdleRegistration({...f,frameWidth:f.frameWidth+1},definition),null);
 assert.equal(standingIdleRegistration(f,{}),null);
});
test('original gesture height variation remains present rather than normalized away',()=>{
 const frame=externalAnimationV1.idleVariants.east[1],reg=standingIdleRegistration(frame,definition);
 const heights=frame.sourceFrameContentBounds.map(b=>b.h*300/reg.visualHeight);
 assert.ok(Math.max(...heights)-Math.min(...heights)>8);
});
