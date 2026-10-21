import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const sha=s=>createHash('sha256').update(s).digest('hex');
const before='3ca77774eb0210ad7e23743eedb8dfd3224e23e9468276b3b2d2b5908a0d6881';
const after='f3969c6989a3104b9a3b23cb41842c9c7eb47640ceba8a55389f2d3069a20327';
export function stripSceneLoadingProtection(path,source){
 if(path!=='src/engine/Game.js')return source;
 source=String(source).replaceAll('\r\n','\n');
 if(sha(source)!==after)return source; // Older inverses still reject every unknown edit.
 const lines=source.split('\n');
 for(const h of [
  {start:2028,remove:1,lines:[]},
  {start:2003,remove:5,lines:['      if (this.sceneLoadToken === sceneLoadToken) this.sceneTransitionPending = false;']},
  {start:1955,remove:1,lines:[]},
  {start:198,remove:2,lines:['      sceneIds,']}
 ])lines.splice(h.start,h.remove,...h.lines);
 const result=lines.join('\n');assert.equal(sha(result),before,'exact PR74 predecessor, no historic baseline advancement');return result;
}
