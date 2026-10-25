const $=id=>document.getElementById(id);
let job=null,busy=false;
async function api(url,options){const r=await fetch(url,options),d=await r.json();if(!r.ok)throw Error(typeof d.detail==='string'?d.detail:JSON.stringify(d.detail));return d}
const post=body=>({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
function error(e){$('concept-error').textContent=e.message}
function download(blob,name){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000)}
async function preview(concept,url){const dialog=document.createElement('dialog'),image=new Image(),close=document.createElement('button');image.src=url;image.alt=concept.title;image.style='max-width:85vw;max-height:75vh;display:block';close.textContent='Close preview';close.onclick=()=>dialog.close();dialog.append(image,close);dialog.onclose=()=>dialog.remove();document.body.append(dialog);dialog.showModal()}
function gallery(){
 $('concept-gallery').replaceChildren();
 for(const c of job.analysis.concepts){
  const generated=job.generated?.find(i=>i.id===c.id),url=generated?.url||c.reference.url;
  const card=document.createElement('article');card.style='min-width:0;border:1px solid #42574e;padding:14px;border-radius:4px';
  const h=document.createElement('h2');h.textContent=c.approach;
  const img=new Image();img.src=url;img.alt=generated?c.title:'Actual video reference frame; not AI-generated';img.style='width:100%;aspect-ratio:16/9;object-fit:contain;background:#0b1012';
  const title=document.createElement('h3');title.textContent=c.title;
  const label=document.createElement('p');label.textContent=generated?'AI-generated image':'Actual video reference • NOT an AI-generated image';
  const description=document.createElement('p');description.textContent=c.rationale;
  const details=document.createElement('details'),summary=document.createElement('summary'),prompt=document.createElement('p');summary.textContent='Proposed image-generation brief';prompt.textContent=c.image_prompt;details.append(summary,prompt);
  const evidence=document.createElement('p');evidence.textContent=`Transcript evidence (${c.time.toFixed(2)}s): “${c.evidence}”`;
  const actions=document.createElement('div');actions.className='actions';
  for(const [name,fn] of [
   ['Preview',()=>preview(c,url)],
   ['Select',()=>{for(const child of $('concept-gallery').children)child.style.borderColor='#42574e';card.style.borderColor='#baf0d0';$('concept-progress').textContent=`Selected: ${c.approach}. Use Edit to load it; existing canvas work is preserved until then.`;}],
   [generated?'Edit':'Edit reference composition',async()=>{if(!confirm('Load this concept into the editor? Save your current draft first if needed.'))return;await window.thumbnailStudio.loadConcept(c,url)}],
   [generated?'Download':'Download reference',async()=>{const r=await fetch(url);if(!r.ok)throw Error('Download failed');download(await r.blob(),generated?`ai-thumbnail-${c.id+1}.jpg`:`video-reference-${c.id+1}.jpg`)}]
  ]){const b=document.createElement('button');b.textContent=name;b.onclick=()=>Promise.resolve(fn()).catch(error);actions.append(b)}
  card.append(h,img,label,title,description,details,evidence,actions);$('concept-gallery').append(card);
 }
}
async function capabilities(){const d=await api('/thumbnail-ai/capabilities');$('generator-capability').textContent=d.image_generation.reason||`Image provider: ${d.image_generation.name}`;return d}
$('analyze-video').onclick=async()=>{
 if(busy)return;const file=$('concept-video').files[0];if(!file){error(Error('Choose a video first'));return}
 busy=true;$('analyze-video').disabled=true;$('generate-images').disabled=true;$('concept-error').textContent='';$('concept-gallery').replaceChildren();job=null;
 try{
  $('concept-progress').textContent='Uploading to local workspace…';const form=new FormData();form.append('file',file);
  const source=await api('/studio/sources',{method:'POST',body:form});const created=await api('/thumbnail-ai/jobs',post({source_id:source.id}));
  do{await new Promise(r=>setTimeout(r,1000));job=await api('/thumbnail-ai/jobs/'+created.job_id);$('concept-progress').textContent=job.stage}while(['queued','running'].includes(job.status));
  if(job.status==='failed')throw Error(job.error);
  $('concept-analysis').textContent=`Topic (dialogue analysis): ${job.analysis.topic}. ${job.visual_analysis} Detected scene changes: ${job.scene_changes.length}. ${job.warnings.join(' ')}`;
  gallery();$('generate-images').disabled=!(await capabilities()).image_generation.available;
 }catch(e){error(e)}finally{busy=false;$('analyze-video').disabled=false}
};
$('generate-images').onclick=async()=>{if(!job||busy)return;busy=true;$('generate-images').disabled=true;try{
 $('concept-progress').textContent='Generating three images on the backend…';
 const r=await api(`/thumbnail-ai/jobs/${job.id}/generate`,post({}));
 if(r.images){job.generated=r.images}else{
  let result;
  do{await new Promise(resolve=>setTimeout(resolve,1500));result=await api(`/thumbnail-ai/jobs/${job.id}`);$('concept-progress').textContent=`Generating thumbnails: ${result.generated?.length||0} / 3 ready`;if(result.generated?.length){job.generated=result.generated;gallery()}}while(['queued','running'].includes(result.generation_status));
  if(result.generation_status!=='completed')throw Error(result.generation_error||'Thumbnail generation stopped. No automatic paid retry was attempted.');
  job.generated=result.generated;
 }
 gallery();$('concept-progress').textContent='Three generated images ready.';
}catch(e){error(e)}finally{busy=false;$('generate-images').disabled=!(await capabilities()).image_generation.available}};
capabilities().catch(error);
