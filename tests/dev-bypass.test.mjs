import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {detectDevBypass, devBypassActive, devSupabase, DEV_TOKEN} from '../src/devBypass.mjs';

const answering=enabled=>async(url,options)=>({ok:true,json:async()=>({enabled,url,options})});

test('deployed hostnames never ask the backend about local test mode',async()=>{
  for(const host of ['clipper-frontend.onrender.com','clipforge.dealdily.com','192.168.1.5']){
    let called=false;
    assert.equal(await detectDevBypass('http://localhost:8000',host,async()=>{called=true;return {ok:true,json:async()=>({enabled:true})}}),false);
    assert.equal(called,false);assert.equal(devBypassActive(),false);
  }
});

test('localhost turns on test mode only when the backend confirms it',async()=>{
  let seen;
  assert.equal(await detectDevBypass('http://localhost:8000','localhost',async(url,options)=>{seen={url,options};return {ok:true,json:async()=>({enabled:true})}}),true);
  assert.equal(seen.url,'http://localhost:8000/dev/bypass');
  assert.equal(seen.options.headers.Authorization,`Bearer ${DEV_TOKEN}`);
  assert.equal(await detectDevBypass('http://localhost:8000','127.0.0.1',answering(false)),false);
  assert.equal(await detectDevBypass('http://localhost:8000','localhost',async()=>{throw new Error('backend down')}),false);
  assert.equal(devBypassActive(),false);
});

test('the fake session sends the local token and history comes back empty',async()=>{
  const client=devSupabase();
  assert.equal((await client.auth.getSession()).data.session.access_token,DEV_TOKEN);
  assert.equal((await client.auth.getUser()).data.user.email,'dev@localhost.test');
  assert.deepEqual(await client.from('history').select('*').eq('user_id','x').order('created_at'),{data:[],error:null});
});

test('the decision is made before the Supabase client module loads',()=>{
  const entry=readFileSync(new URL('../src/StudioEntry.jsx',import.meta.url),'utf8');
  assert.ok(entry.indexOf('detectDevBypass')<entry.indexOf('<Suspense'));
  assert.match(readFileSync(new URL('../src/supabaseClient.js',import.meta.url),'utf8'),/devBypassActive\(\) \? devSupabase\(\)/);
});
