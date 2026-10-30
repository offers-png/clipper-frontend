import {requestJson} from './request-json.js?v=pricing-20261026-1';
import {confirmPaid} from './paid-confirm.js?v=pricing-20261026-1';
import {selectedPrice,usdFromCredits,audioLabel} from './video-pricing.js?v=pricing-20261026-1';
const $=id=>document.getElementById(id);
const response=await fetch('/studios/editor-panel.html?v=visual-20261031-1');
const host=document.createElement('div');host.innerHTML=await response.text();
document.querySelector('main').insertBefore(host,document.querySelector('main section:nth-of-type(1)'));
const style=document.createElement('style');style.textContent='#image-video-panel label:has(textarea){display:block;width:100%}#image-video-panel textarea{display:block;width:100%}#image-video-panel label{max-width:100%}#image-video-panel input{max-width:100%}#editor-progress{accent-color:#235840}#image-video-panel img[hidden]{display:none!important}';document.head.append(style);
// The Video Editing Workspace below the generator (visual timeline editor).
const editor=await import('./timeline-editor.js?v=visual-20261031-1');
let ivImage=null,ivGenerated=null;
const api=requestJson;
const post=body=>({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
let ivMode='text',ivCaps=null;
function ivControls(){
 const model=ivCaps?.models?.find(m=>m.id===$('iv-model').value);
 $('iv-image-fields').hidden=ivMode!=='image';$('iv-motion-field').hidden=ivMode!=='image';
 for(const mode of ['text','image'])$('iv-tab-'+mode).setAttribute('aria-selected',String(ivMode===mode));
 $('iv-generate').disabled=!ivCaps?.available||!model||(ivMode==='image'&&!ivImage);
 if(model){
  const fill=(id,values,label)=>{const current=$(id).value;$(id).replaceChildren(...values.map(v=>new Option(label(v),v)));$(id).value=values.map(String).includes(current)?current:values.includes('720p')?'720p':String(values[0]);};
  fill('iv-resolution',model.resolutions,v=>v);
  fill('iv-audio',[...new Set(model.prices.filter(p=>p.resolution===$('iv-resolution').value).map(p=>p.audio))],v=>v==='model'?audioLabel(model.audio):audioLabel(v));
  const durations=[...new Set(model.prices.filter(p=>p.resolution===$('iv-resolution').value&&p.audio===$('iv-audio').value).map(p=>p.duration))].sort((a,b)=>a-b);
  fill('iv-duration',[5,10,...durations.filter(n=>![5,10].includes(n))].filter(n=>durations.includes(n)),v=>v+' seconds');
  fill('iv-ratio',model.ratios,v=>v);$('iv-prompt').maxLength=model.prompt_limit;
  const price=selectedPrice(model,$('iv-duration').value,$('iv-resolution').value,$('iv-audio').value);
  $('iv-generate').disabled||=!price;
  $('iv-cost').textContent=price?`Estimated total: ${price.credits} KIE credits / $${usdFromCredits(price.credits)} USD. ${model.name}, ${$('iv-duration').value}s, ${price.resolution}, ${price.audio==='model'?audioLabel(model.audio):audioLabel(price.audio)}.`:'No verified price for these options.';
  $('iv-pricing-source').textContent=`Official KIE pricing snapshot verified ${model.pricing_updated}. USD uses $0.005 per credit, excluding top-up bonuses. No documented pricing API is available.`;
  $('iv-pricing-source').href=model.pricing_source;
  $('iv-model-details').textContent=`${model.name} (${model.provider_model}) | ${model.resolutions.join(', ')} | ${model.durations.join(', ')} seconds | ${audioLabel(model.audio==='optional'?'on':model.audio)}${model.audio==='optional'?' optional':''}`;
 }
 $('iv-allowance').textContent=ivCaps?.remaining_usd!==undefined?`Your KIE allowance: $${ivCaps.remaining_usd} USD remaining of $${ivCaps.spending_limit_usd}; $${ivCaps.committed_usd} committed. Quotes do not spend credits.`:'Generation allowance is available only to enabled accounts.';
}
function ivModels(){
 const current=$('iv-model').value;const models=(ivCaps?.models||[]).filter(m=>m.mode===ivMode);
 $('iv-model').replaceChildren(...models.map(m=>{const o=document.createElement('option');o.value=m.id;o.textContent=m.name;return o}));
 if(models.some(m=>m.id===current))$('iv-model').value=current;ivControls();
}
async function ivCapabilities(){ivCaps=await api('/video-generator/capabilities');$('iv-capability').textContent=ivCaps.reason||'Provider connected';$('iv-excluded').textContent=(ivCaps.excluded_models||[]).map(m=>m.model+': '+m.reason).join('\n');ivModels();return ivCaps}
for(const mode of ['text','image'])$('iv-tab-'+mode).onclick=()=>{ivMode=mode;ivModels()};
for(const id of ['iv-model','iv-duration','iv-resolution','iv-audio','iv-ratio'])$(id).onchange=ivControls;
$('iv-image').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;const f=new FormData();f.append('file',file);ivImage=await api('/editor/assets',{method:'POST',body:f});if(ivImage.kind!=='image')throw Error('Choose a PNG, JPEG or WebP image');$('iv-reference').src='/editor/assets/'+ivImage.id;$('iv-reference').hidden=false;$('iv-error').textContent='';ivControls()}catch(e){ivImage=null;ivControls();$('iv-error').textContent=e.message}};
$('iv-generate').onclick=async()=>{if(ivMode==='image'&&!ivImage)return;$('iv-generate').disabled=true;$('iv-error').textContent='';try{const body={mode:ivMode,model:$('iv-model').value,image_id:ivMode==='image'?ivImage.id:null,prompt:$('iv-prompt').value,duration:Number($('iv-duration').value),resolution:$('iv-resolution').value,audio:$('iv-audio').value,ratio:$('iv-ratio').value,motion:ivMode==='text'?'Custom prompt':$('iv-motion').value};const spending=await confirmPaid(api,'/video-generator/quote',body);if(!spending)return;const j=await api('/video-generator/jobs',post({...body,...spending}));let result;do{await new Promise(r=>setTimeout(r,1500));result=await api('/video-generator/jobs/'+j.id);$('iv-status').textContent=result.stage}while(['queued','running'].includes(result.status));if(result.status==='failed')throw Error(result.error);ivGenerated=result.asset;$('iv-preview').src=result.url;$('iv-download').href=result.url+'?download=1';$('iv-result').hidden=false}catch(e){$('iv-error').textContent=e.message}finally{await ivCapabilities()}};
$('iv-send').onclick=()=>{if(ivGenerated){editor.addAsset(ivGenerated);editor.append(ivGenerated);window.top.postMessage({type:'clipforge-navigate',section:'editor'},location.origin);$('video-editor').scrollIntoView({behavior:'smooth'})}};
window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===parent&&e.data?.type==='clipforge-focus-generator')$('image-video-panel').scrollIntoView({block:'start'})});
ivCapabilities().catch(e=>$('iv-error').textContent=e.message);
