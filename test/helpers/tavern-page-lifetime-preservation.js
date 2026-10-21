import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const sha=s=>createHash('sha256').update(s).digest('hex');
const original='f6c6642058a7cf606e74a77436f8679a211f5e75359f2c7ef1696cc635304b4c';
const candidate='855bc128d687a386f878afc68c28fa2ab6e095562ec10e89cba5437d62663b58';
const addition="   // The harness has finished. Release its decoded atlases before booting another game;\n   // keep the context so the normal page still uses the exact earned save.\n   await page.waitForLoadState('networkidle');await page.close();assert.equal(page.isClosed(),true);\n";
export function stripTavernPageLifetime(source){
 source=String(source).replaceAll('\r\n','\n');
 if(sha(source)===original)return source;
 assert.equal(sha(source),candidate,'exact tavern page-lifetime follow-up');
 assert.equal(source.split(addition).length,2);const before=source.replace(addition,'');
 assert.equal(sha(before),original,'unchanged historical diagnostic source/assertions');return before;
}
