import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../public/studios/request-json.js',import.meta.url),'utf8');
const {requestJson}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const response=(status,data)=>({status,ok:status===200,json:async()=>data});
test('transient status failures retry read-only GET once',async()=>{
 let calls=0;const result=await requestJson('/capabilities',{},async()=>++calls===1?response(503,{}):response(200,{ready:true}),async()=>{});
 assert.deepEqual(result,{ready:true});assert.equal(calls,2);
});
test('paid generation submissions never retry, including network uncertainty',async()=>{
 let calls=0;await assert.rejects(requestJson('/image-video/jobs',{method:'POST'},async()=>{calls++;throw new TypeError('Connection lost')},async()=>{}));assert.equal(calls,1);
});
test('repeated invalid sessions remain rejected',async()=>{
 let calls=0;await assert.rejects(requestJson('/capabilities',{},async()=>{calls++;return response(401,{detail:'Session expired'})},async()=>{}),/Session expired/);assert.equal(calls,2);
});
test('access denials and quote POST requests do not retry',async()=>{
 for(const options of [{},{method:'POST'}]){let calls=0;await assert.rejects(requestJson('/quote',options,async()=>{calls++;return response(403,{detail:'Access denied'})},async()=>{}));assert.equal(calls,1);}
});
