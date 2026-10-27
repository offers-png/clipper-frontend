import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../public/studios/video-pricing.js',import.meta.url),'utf8');
const {selectedPrice,usdFromCredits}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
test('fractional credits display precise USD without rounding to cents',()=>{
 assert.equal(usdFromCredits('22.5'),'0.1125');assert.equal(usdFromCredits('8.8'),'0.044');assert.equal(usdFromCredits('0'),'0');
});
test('unsupported selections never interpolate prices or substitute variants',()=>{
 const model={prices:[{duration:5,resolution:'720p',audio:'off',credits:'20'}]};
 assert.equal(selectedPrice(model,5,'720p','off').credits,'20');
 for(const [duration,res,audio] of [[10,'720p','off'],[5,'1080p','off'],[5,'720p','on']])assert.equal(selectedPrice(model,duration,res,audio),null);
});
