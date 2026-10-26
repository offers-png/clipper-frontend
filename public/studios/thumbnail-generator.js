const $ = id => document.getElementById(id);
let job = null, busy = false;
async function api(url, options) {
 const r = await fetch(url, options), data = await r.json();
 if (!r.ok) throw Error(typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail));
 return data;
}
const post = body => ({method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
const delay = () => new Promise(resolve => setTimeout(resolve, 1200));
function error(e) { $('concept-error').textContent = e.message; }
function download(blob, name) {
 const a = document.createElement('a'), url = URL.createObjectURL(blob);
 a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000);
}
function preview(concept, url) {
 const dialog = document.createElement('dialog'), img = new Image(), close = document.createElement('button');
 img.src = url; img.alt = concept.title; img.style = 'max-width:85vw;max-height:75vh;display:block';
 close.textContent = 'Close preview'; close.onclick = () => dialog.close();
 dialog.onclick = e => { if (e.target === dialog) dialog.close(); };
 dialog.append(img, close); dialog.onclose = () => dialog.remove();
 document.body.append(dialog); dialog.showModal();
}
function gallery() {
 $('concept-gallery').replaceChildren();
 for (const c of job.analysis.concepts) {
  const generated = job.generated?.find(item => item.id === c.id), url = generated?.url || c.reference.url;
  const card = document.createElement('article'); card.style = 'min-width:0;border:1px solid #CBD5E1;padding:14px;border-radius:12px;background:#FFFFFF';
  const heading = document.createElement('h2'); heading.textContent = c.approach;
  const img = new Image(); img.src = url; img.alt = generated ? c.title : 'Actual video reference frame; not AI-generated';
  img.style = 'width:100%;aspect-ratio:16/9;object-fit:contain;background:#F8FAFC';
  const title = document.createElement('h3'); title.textContent = c.title;
  const label = document.createElement('p'); label.textContent = generated ? 'AI-generated image' : 'Actual video reference — NOT an AI-generated image';
  const rationale = document.createElement('p'); rationale.textContent = c.rationale;
  const details = document.createElement('details'), summary = document.createElement('summary'), prompt = document.createElement('p');
  summary.textContent = 'Proposed image-generation brief'; prompt.textContent = c.image_prompt; details.append(summary, prompt);
  const evidence = document.createElement('p'); evidence.textContent = `Source moment: ${c.time.toFixed(2)}–${(c.end ?? c.time).toFixed(2)}s. ${c.evidence_kind === 'visual' ? 'AI observation of the actual frame' : 'Transcript'}: “${c.evidence}”`;
  const actions = document.createElement('div'); actions.className = 'actions';
  const choices = [
   ['Preview', () => preview(c, url)],
   ['Select', () => { for (const child of $('concept-gallery').children) child.style.borderColor = '#CBD5E1'; card.style.borderColor = '#2563EB'; $('concept-progress').textContent = `Selected: ${c.approach}. Use Edit to load it.`; }],
   [generated ? 'Edit' : 'Edit reference composition', async () => { if (confirm('Load this concept into the editor? Save your current draft first if needed.')) await window.thumbnailStudio.loadConcept(c, url); }],
   [generated ? 'Download' : 'Download reference', async () => { const r = await fetch(url); if (!r.ok) throw Error('Download failed'); download(await r.blob(), generated ? `ai-thumbnail-${c.id + 1}.jpg` : `video-reference-${c.id + 1}.jpg`); }]
  ];
  for (const [name, fn] of choices) { const b = document.createElement('button'); b.textContent = name; b.onclick = () => Promise.resolve().then(fn).catch(error); actions.append(b); }
  card.append(heading, img, label, title, rationale, details, evidence, actions); $('concept-gallery').append(card);
 }
}
async function capabilities() {
 const c = await api('/thumbnail-ai/capabilities'), messages = [];
 if (c.transcription && !c.transcription.ready) messages.push('Speech model or transcription library is missing.');
 if (!c.text_analysis.ready) messages.push('Text-analysis model/runtime is missing.');
 if (!c.semantic_vision) messages.push('Visual subject analysis is unavailable; any concepts use dialogue only.');
 messages.push(c.image_generation.reason || `Image provider: ${c.image_generation.name}`);
 $('generator-capability').textContent = messages.join(' ');
 $('analyze-video').disabled = busy || !c.text_analysis.ready || (c.transcription && !c.transcription.ready);
 return c;
}
async function buttons() {
 const c = await capabilities();
 $('generate-images').disabled = busy || !job || !c.image_generation.available || ['queued','running','failed','completed'].includes(job?.generation_status);
}
function summary() {
 const observations = (job.observations || []).map(o => `${o.time.toFixed(2)}s: ${o.description}`).join(' ');
 $('concept-analysis').textContent = `Main topic (${job.subject_basis || 'dialogue analysis'}): ${job.analysis.topic}. ${job.visual_analysis} Scene changes: ${job.scene_changes.length}. ${observations} ${job.warnings.join(' ')}`;
}
async function poll(id) {
 do {
  job = await api('/thumbnail-ai/jobs/' + id);
  $('concept-progress').textContent = ['queued','running'].includes(job.generation_status) ? `Generating thumbnails: ${job.generated?.length || 0} / 3 ready` : job.stage;
  if (job.analysis && job.generated?.length) gallery();
  if (['queued','running'].includes(job.status) || ['queued','running'].includes(job.generation_status)) await delay();
  else break;
 } while (true);
 if (job.status === 'failed') throw Error(job.error);
 summary(); gallery();
 if (job.generation_status === 'failed') throw Error(job.generation_error);
}
$('analyze-video').onclick = async () => {
 if (busy) return;
 const file = $('concept-video').files[0]; if (!file) return error(Error('Choose a video first'));
 busy = true; $('analyze-video').disabled = true; $('generate-images').disabled = true;
 $('concept-error').textContent = ''; $('concept-gallery').replaceChildren(); job = null;
 try {
  $('concept-progress').textContent = 'Uploading video to your workspace…';
  const form = new FormData(); form.append('file', file);
  const source = await api('/studio/sources', {method:'POST', body:form});
  const created = await api('/thumbnail-ai/jobs', post({source_id:source.id}));
  sessionStorage.setItem('clipforge-thumbnail-job', created.job_id); await poll(created.job_id);
 } catch (e) { error(e); } finally { busy = false; await buttons().catch(error); }
};
$('generate-images').onclick = async () => {
 if (!job || busy || ['failed','completed','queued','running'].includes(job.generation_status)) return;
 busy = true; $('generate-images').disabled = true;
 try {
  $('concept-progress').textContent = 'Generating three images on the backend…';
  const result = await api(`/thumbnail-ai/jobs/${job.id}/generate`, post({}));
  if (result.images) { job.generated = result.images; job.generation_status = 'completed'; gallery(); }
  else await poll(job.id);
  $('concept-progress').textContent = 'Three generated images ready. Select, edit, or download.';
 } catch (e) { job.generation_status = 'failed'; error(e); }
 finally { busy = false; await buttons().catch(error); }
};
async function resume() {
 await capabilities();
 const id = sessionStorage.getItem('clipforge-thumbnail-job');
 if (!/^[a-f0-9]{32}$/.test(id || '')) return;
 busy = true;
 try { await poll(id); } catch (e) { error(e); }
 finally { busy = false; await buttons().catch(error); }
}
resume().catch(error);
