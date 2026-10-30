import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../public/studios/paid-confirm.js',import.meta.url),'utf8');
const {confirmPaid}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.disabled=false;}
 setAttribute(){} append(...items){this.children.push(...items)}
 showModal(){} focus(){} remove(){} close(){this.onclose?.()}
}
function setup(){const body=new Element('body');globalThis.document={body,createElement:tag=>new Element(tag)};return body;}
const quote={quote_id:'a'.repeat(32),kind:'images',count:3,cost_credits:12,cost_usd:'0.060',balance_credits:'100',remaining_usd:'0.600',spending_limit_usd:'1.000',can_submit:true,reason:'Confirm credit spending.'};
test('canceling or Escape never grants spending confirmation',async()=>{
 for(const action of ['cancel','escape','outside']){
  const body=setup(),calls=[];const promise=confirmPaid(async(...args)=>{calls.push(args);return quote},'/quote');await Promise.resolve();
  const dialog=body.children[0],buttons=dialog.children.at(-1).children;
  if(action==='cancel')buttons[0].onclick();else if(action==='outside')dialog.onclick({target:dialog});else dialog.close();
  assert.equal(await promise,null);assert.equal(calls.length,1);assert.equal(calls[0][0],'/quote');
 }
});
test('confirmation returns only the server quote ticket; no generation HTTP is performed',async()=>{
 const body=setup();let calls=0;const promise=confirmPaid(async()=>{calls++;return quote},'/quote');await Promise.resolve();
 body.children[0].children.at(-1).children[1].onclick();
 assert.deepEqual(await promise,{quote_id:quote.quote_id,confirm_spend:true});assert.equal(calls,1);
});
test('insufficient credits disable confirmation and show the balance',async()=>{
 const body=setup();const promise=confirmPaid(async()=>({...quote,can_submit:false,balance_credits:'0',reason:'Insufficient credits.'}),'/quote');await Promise.resolve();
 const dialog=body.children[0],confirm=dialog.children.at(-1).children[1];assert.equal(confirm.disabled,true);
 confirm.onclick();assert.match(dialog.children[3].textContent,/balance: 0/);dialog.close();assert.equal(await promise,null);
});

test('video review lists every priced selection and post-spend allowance',async()=>{
 const body=setup();const promise=confirmPaid(async()=>({...quote,kind:'video',count:1,model_name:'PixVerse V6',duration:5,resolution:'720p',audio:'on',pricing_updated:'2026-10-26',remaining_after_usd:'0.360'}),'/quote');await Promise.resolve();
 const text=body.children[0].children.map(e=>e.textContent||'').join(' ');
 for(const value of ['PixVerse V6','5s','720p','on','12 KIE credits','$0.060','$0.600','$0.360','2026-10-26'])assert.ok(text.includes(value),value);
 body.children[0].close();assert.equal(await promise,null);
});
