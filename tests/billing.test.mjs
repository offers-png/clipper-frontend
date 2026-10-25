import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sessionHeaders, verifyBilling, verifiedPaid, billingAction} from '../src/billingClient.mjs';

const auth={getSession:async()=>({data:{session:{access_token:'contract-test'}}})};
test('verified paid accounts display paid status instead of an upgrade action',()=>{
  assert.equal(billingAction({allowed:true,plan:'active',payment_verified:true}),'paid');
});
test('existing Stripe trials display trial status without inventing payment',()=>{
  const trial={plan:'trial',allowed:true,existing_subscription:true,subscription_status:'trialing',payment_verified:false};
  assert.equal(billingAction(trial),'trial');assert.equal(verifiedPaid(trial),false);
  assert.equal(billingAction({...trial,allowed:false}),'trial');
});
test('unknown, unverified and pending accounts request verification, never another payment',()=>{
  for (const state of [null,{plan:'active',allowed:true},{plan:'unknown'},{plan:'payment_pending'}]) {
    assert.equal(billingAction(state),'verify');
  }
});
test('known unpaid plans retain the existing upgrade option',()=>{
  for (const plan of ['trial','expired','cancelled']) assert.equal(billingAction({plan}),'upgrade');
});
test('billing requests use the current session and no caller email',async()=>{
  let call;
  const result=await verifyBilling(auth,'http://localhost:8000','cs_fixture',async(url,options)=>{
    call={url,...options};return {ok:true,json:async()=>({ok:true,allowed:true,plan:'active',payment_verified:true})};
  });
  assert.equal(call.headers.Authorization,'Bearer contract-test');
  assert.ok(call.body instanceof URLSearchParams);
  assert.equal(call.body.get('session_id'),'cs_fixture');
  assert.equal(call.body.has('email'),false);
  assert.equal(verifiedPaid(result),true);
});
test('login verification without checkout reference uses a non-multipart request',async()=>{
  await verifyBilling(auth,'http://localhost:8000',null,async(_url,options)=>{
    assert.ok(options.body instanceof URLSearchParams);
    assert.equal(options.body.toString(),'');
    return {ok:true,json:async()=>({ok:true})};
  });
});
test('missing session never queries billing',async()=>{
  let queried=false;
  await assert.rejects(verifyBilling({getSession:async()=>({data:{session:null}})},'http://localhost',null,async()=>{queried=true}),/sign in/i);
  assert.equal(queried,false);
});
test('hung billing fetch stops waiting and aborts without granting access',async()=>{
  let signal;
  await assert.rejects(verifyBilling(auth,'http://localhost',null,async(_url,options)=>{
    signal=options.signal;return new Promise(()=>{});
  },10),/timed out.*do not pay again/i);
  assert.equal(signal.aborted,true);
});
test('hung session lookup also has a deadline and sends no request',async()=>{
  let queried=false;
  await assert.rejects(verifyBilling({getSession:()=>new Promise(()=>{})},'http://localhost',null,async()=>{queried=true},10),/timed out/i);
  assert.equal(queried,false);
});
test('hung response body is bounded by the verification deadline',async()=>{
  await assert.rejects(verifyBilling(auth,'http://localhost',null,async()=>({ok:true,json:()=>new Promise(()=>{})}),10),/timed out/i);
});
test('paid flags require explicit verified payment',()=>{
  for(const result of [null,{plan:'active',allowed:true},{plan:'trial',allowed:true,payment_verified:true},{plan:'active',allowed:false,payment_verified:true}]) {
    assert.equal(verifiedPaid(result),false);
  }
});
test('verification outages preserve retry messages without claiming an upgrade',async()=>{
  await assert.rejects(verifyBilling(auth,'http://localhost',null,async()=>({ok:false,json:async()=>({error:'Could not verify. Do not pay again.'})})),/Do not pay again/);
});
test('each reload or login check uses a fresh session',async()=>{
  let token='first',tokens=[];
  const changing={getSession:async()=>({data:{session:{access_token:token}}})};
  const fetcher=async(_url,opts)=>{tokens.push(opts.headers.Authorization);return {ok:true,json:async()=>({ok:true})}};
  await verifyBilling(changing,'http://localhost',null,fetcher);
  token='second';await verifyBilling(changing,'http://localhost',null,fetcher);
  assert.deepEqual(tokens,['Bearer first','Bearer second']);
});
test('success banner cannot be enabled by the return URL alone; original tabs remain',()=>{
  const source=readFileSync(new URL('../src/Clipper.jsx',import.meta.url),'utf8');
  assert.match(source,/\{verifiedPaid\(billing\) &&/);
  assert.doesNotMatch(source,/get\("upgrade"\) === "success"/);
  assert.match(source,/onAuthStateChange/);
  assert.match(source,/Transcribe/);assert.match(source,/Clip/);
  assert.match(source,/sessionHeaders\(supabase.auth\)/);
});
