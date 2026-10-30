import {requestJson} from './request-json.js?v=pricing-20261026-1';
import {confirmPaid} from './paid-confirm.js?v=pricing-20261026-1';
import {selectedPrice,usdFromCredits,audioLabel} from './video-pricing.js?v=pricing-20261026-1';
const $=id=>document.getElementById(id);
const response=await fetch('/studios/editor-panel.html?v=links-20261030-1');
const host=document.createElement('div');host.innerHTML=await response.text();
document.querySelector('main').insertBefore(host,document.querySelector('main section:nth-of-type(2)'));
const style=document.createElement('style');style.textContent='#video-editor .row{align-items:flex-end}#video-editor label{margin:3px 8px 3px 0}#video-editor input[type=number]{width:86px}#video-editor textarea{min-width:200px}#video-editor .row strong{max-width:250px;overflow-wrap:anywhere}#video-editor h3{margin-top:24px}#video-editor input[type=checkbox]{width:auto}#image-video-panel label:has(textarea){display:block;width:100%}#image-video-panel textarea{display:block;width:100%}#video-editor label,#image-video-panel label{max-width:100%}#video-editor input,#video-editor select,#image-video-panel input{max-width:100%}#editor-library{width:100%;max-width:650px}#editor-progress{accent-color:#235840}#image-video-panel img[hidden]{display:none!important}';document.head.append(style);
let library=[],segments=[],tracks=[],overlays=[],texts=[],rendering=false,ivImage=null,ivGenerated=null;
const api=requestJson;
const post=body=>({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
function fail(e){$('editor-error').textContent=e.message||String(e)}
function selected(){const a=library.find(a=>a.id===$('editor-library').value);if(!a)throw Error('Select an uploaded asset from the media library');return a}
function asset(aid){return library.find(a=>a.id===aid)}
function addAsset(a){if(!library.some(x=>x.id===a.id))library.push(a);paintLibrary();$('editor-library').value=a.id;return a}
function paintLibrary(){const current=$('editor-library').value;$('editor-library').replaceChildren(new Option('Choose local media',''));for(const a of library)$('editor-library').append(new Option(`${a.name} (${a.kind}${a.duration?' - '+a.duration.toFixed(2)+'s':''})`,a.id));$('editor-library').value=current}
function append(a,position){if(!['video','image'].includes(a.kind))throw Error('Choose a video or still image');const s={asset_id:a.id,start:0,end:a.kind==='image'?3:a.duration,volume:1,mute:false};position==='beginning'?segments.unshift(s):segments.push(s);paint()}
function total(){return segments.reduce((sum,s)=>sum+s.end-s.start,0)}
function field(row,name,value,onchange,options={}){const label=document.createElement('label');label.textContent=name;const input=document.createElement('input');input.type=options.type||'number';if(input.type==='checkbox')input.checked=value;else input.value=value;for(const [k,v] of Object.entries(options))if(k!=='type')input[k]=v;input.onchange=()=>{onchange(input.type==='checkbox'?input.checked:input.type==='number'?Number(input.value):input.value);$('editor-status').textContent='Timeline changed. Render again to preview these changes.'};label.append(document.createElement('br'),input);row.append(label);return input}
function button(row,text,fn){const b=document.createElement('button');b.textContent=text;b.onclick=()=>{try{fn()}catch(e){fail(e)}};row.append(b);return b}
function remove(row,list,i){button(row,'Remove',()=>{list.splice(i,1);paint()})}
function paint(){
 $('editor-segments').replaceChildren();segments.forEach((s,i)=>{const row=document.createElement('div');row.className='row';const title=document.createElement('strong');title.textContent=`${i+1}. ${asset(s.asset_id)?.name||'Missing asset'}`;row.append(title);field(row,'Start (s)',s.start,v=>{s.start=v;paint()},{min:0,step:.01});field(row,'End (s)',s.end,v=>{s.end=v;paint()},{min:.1,step:.01});field(row,'Clip volume',s.volume,v=>s.volume=v,{min:0,max:2,step:.1});field(row,'Mute',s.mute,v=>s.mute=v,{type:'checkbox'});button(row,'Move up',()=>{if(i){[segments[i-1],segments[i]]=[segments[i],segments[i-1]];paint()}});button(row,'Move down',()=>{if(i<segments.length-1){[segments[i+1],segments[i]]=[segments[i],segments[i+1]];paint()}});const split=field(row,'Split at source second',Number(((s.start+s.end)/2).toFixed(2)),()=>{},{step:.01,min:0});button(row,'Split',()=>{const t=Number(split.value);if(asset(s.asset_id)?.kind!=='video'||t<=s.start||t>=s.end)throw Error('Choose a split point inside a video segment');segments.splice(i,1,{...s,end:t},{...s,start:t});paint()});remove(row,segments,i);$('editor-segments').append(row)});
 $('editor-tracks').replaceChildren();tracks.forEach((t,i)=>{const row=document.createElement('div');row.className='row';const title=document.createElement('strong');title.textContent=`${t.role}: ${asset(t.asset_id)?.name}`;row.append(title);for(const [name,key,step,max] of [['Timeline start (s)','start',.01,600],['Duration (s)','duration',.01,600],['Track volume','volume',.1,2]])field(row,name,t[key],v=>t[key]=v,{min:0,step,max});field(row,'Loop audio',t.loop,v=>t.loop=v,{type:'checkbox'});remove(row,tracks,i);$('editor-tracks').append(row)});
 for(const [list,id] of [[overlays,'editor-overlays'],[texts,'editor-texts']]){$(id).replaceChildren();list.forEach((o,i)=>{const row=document.createElement('div');row.className='row';if(id==='editor-texts')field(row,'Caption text',o.text,v=>o.text=v,{type:'text',maxLength:500});else{const title=document.createElement('strong');title.textContent=asset(o.asset_id)?.name;row.append(title)}for(const key of ['start','end','x','y',...(id==='editor-overlays'?['width','height']:['size'])])field(row,key,o[key],v=>o[key]=v,{min:0,step:key==='start'||key==='end'?.01:1});if(id==='editor-texts')field(row,'Color',o.color,v=>o.color=v,{type:'color'});remove(row,list,i);$(id).append(row)})}
 $('editor-status').textContent=`${segments.length} timeline segments, ${Math.max(0,total()).toFixed(2)} seconds. Render to apply edits.`;
}
function timeline(){return {segments:structuredClone(segments),tracks:structuredClone(tracks),overlays:structuredClone(overlays),texts:structuredClone(texts),ratio:$('editor-ratio').value,original_volume:Number($('editor-original-volume').value),mute_original:$('editor-mute').checked,fade_in:Number($('editor-fade-in').value),fade_out:Number($('editor-fade-out').value)}}
$('editor-add-link').onclick=async()=>{const link=$('editor-link').value.trim();if(!link)return;const button=$('editor-add-link');button.disabled=true;try{$('editor-error').textContent='';$('editor-import-status').textContent='Downloading the video from the link…';addAsset(await api('/editor/assets/url',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({link})}));$('editor-link').value='';$('editor-import-status').textContent='Video added. Choose it and add it to the timeline.'}catch(e){$('editor-import-status').textContent='';fail(e)}finally{button.disabled=false}};
$('editor-upload').onchange=async e=>{try{$('editor-error').textContent='';for(const file of e.target.files){const form=new FormData();form.append('file',file);addAsset(await api('/editor/assets',{method:'POST',body:form}))}$('editor-import-status').textContent='Media imported. Choose an asset and add it to the timeline or audio/overlay tracks.'}catch(e){fail(e)}};
for(const [id,fn] of [
 ['editor-add-video',()=>append(selected())],
 ['editor-prepend-image',()=>{const a=selected();if(a.kind!=='image')throw Error('Choose an image');append(a,'beginning')}],
 ['editor-append-image',()=>{const a=selected();if(a.kind!=='image')throw Error('Choose an image');append(a)}],
 ['editor-add-music',()=>audio('music')],['editor-add-effect',()=>audio('effect')],
 ['editor-add-overlay',()=>{const a=selected();if(a.kind!=='image')throw Error('Choose an image');overlays.push({asset_id:a.id,start:0,end:Math.min(3,total()||3),x:30,y:30,width:200,height:200});paint()}],
 ['editor-add-text',()=>{texts.push({text:'Your caption',start:0,end:Math.min(3,total()||3),x:40,y:550,size:38,color:'#ffffff'});paint()}]
])$(id).onclick=()=>{try{$('editor-error').textContent='';fn()}catch(e){fail(e)}};
function audio(role){const a=selected();if(!a.audio)throw Error('Choose an audio file or video with audio');tracks.push({asset_id:a.id,start:0,duration:Math.min(a.duration,total()||a.duration),volume:role==='music'?.3:.7,loop:false,role});paint()}
async function render(){if(rendering)return;rendering=true;$('editor-render').disabled=true;$('editor-error').textContent='';try{const j=await api('/editor/jobs',post(timeline()));let result;do{await new Promise(r=>setTimeout(r,700));result=await api('/editor/jobs/'+j.id);$('editor-progress').value=result.progress;$('editor-status').textContent=result.stage}while(['queued','running'].includes(result.status));if(result.status==='failed')throw Error(result.error);$('editor-preview').src=result.url;$('editor-download').href=result.download_url;$('editor-result').hidden=false;$('editor-status').textContent='Rendered MP4 ready. Preview or download below.';return result}catch(e){fail(e);throw e}finally{rendering=false;$('editor-render').disabled=false}}
$('editor-render').onclick=()=>render().catch(()=>{});
$('editor-save').onclick=()=>{try{localStorage.setItem('clipforge-local-timeline',JSON.stringify({library,timeline:timeline()}));$('editor-status').textContent='Timeline saved in this browser. Media stays in the local workspace.'}catch(e){fail(e)}};
function restore(data){library=data.library;const t=data.timeline;segments=t.segments;tracks=t.tracks;overlays=t.overlays;texts=t.texts;$('editor-ratio').value=t.ratio;$('editor-original-volume').value=t.original_volume;$('editor-mute').checked=t.mute_original;$('editor-fade-in').value=t.fade_in;$('editor-fade-out').value=t.fade_out;paintLibrary();paint()}
$('editor-load').onclick=()=>{try{const value=localStorage.getItem('clipforge-local-timeline');if(!value)throw Error('No saved timeline');restore(JSON.parse(value))}catch(e){fail(e)}};
async function incoming(){const item=sessionStorage.getItem('clipforge-editor-import');if(!item)return;sessionStorage.removeItem('clipforge-editor-import');try{const a=await api('/editor/import',post(JSON.parse(item)));addAsset(a);append(a);$('editor-import-status').textContent='Video received from ClipForge and appended to the timeline.';$('video-editor').scrollIntoView({behavior:'smooth'})}catch(e){fail(e)}}
window.addEventListener('message',e=>{if(e.origin===location.origin&&e.data?.type==='editor-import-ready')incoming()});
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
$('iv-send').onclick=()=>{if(ivGenerated){addAsset(ivGenerated);append(ivGenerated);window.top.postMessage({type:'clipforge-navigate',section:'editor'},location.origin);$('video-editor').scrollIntoView({behavior:'smooth'})}};
window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===parent&&e.data?.type==='clipforge-focus-generator')$('image-video-panel').scrollIntoView({block:'start'})});
window.clipforgeEditor={getTimeline:timeline,getLibrary:()=>structuredClone(library),addAsset,append,restore,render,importPending:incoming};
paint();ivCapabilities().catch(e=>$('iv-error').textContent=e.message);incoming();
