// Images + Voice -> Video (a section of the AI Video Generator page): upload a voiceover and images,
// review scenes (drag images to swap, drag boundaries to retime, preview with the audio), then render.
import {requestJson} from './request-json.js?v=pricing-20261026-1';
const $ = id => document.getElementById(id);
const api = requestJson;
const post = body => ({method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
const WHISPER_PER_MINUTE = 0.006, MIN_SCENE = 1;
let project = null, scenes = [], gaps = [], quote = null, rendering = false, shown = -1, front = 0;

const fmt = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
function element(tag, text, style) { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; if (style) e.style = style; return e; }
function status(text) { $('ss-status').textContent = text || ''; }
function fail(e) { $('ss-error').textContent = e?.message || ''; }
const blobs = new Map();
function blobURL(path) {
 if (!blobs.has(path)) blobs.set(path, fetch(path).then(r => { if (!r.ok) throw Error('Image unavailable'); return r.blob(); }).then(b => URL.createObjectURL(b)).catch(e => { blobs.delete(path); throw e; }));
 return blobs.get(path);
}
const imageURL = (id, thumb) => `/slideshow/projects/${project.id}/images/${id}${thumb ? '?thumb=1' : ''}`;
const imageName = id => project.images.find(i => i.id === id)?.name || '';
const wordsIn = s => project.words.filter(w => w.start >= s.start - .01 && w.start < s.end).map(w => w.word).join(' ');

const panel = element('section'); panel.id = 'slideshow-panel';
panel.innerHTML = `<style>
#slideshow-panel .ss-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,420px);gap:16px;align-items:start}
#slideshow-panel .ss-stage{position:relative;overflow:hidden;background:#000;border-radius:8px;width:100%}
#slideshow-panel .ss-stage img{position:absolute;inset:0;width:100%;height:100%;transition:opacity .5s linear}
#slideshow-panel .ss-stage img.bg{object-fit:cover;filter:blur(24px) brightness(.85);transform:scale(1.15)}
#slideshow-panel .ss-stage img.fg{object-fit:contain}
#slideshow-panel .ss-stage .ss-layer{position:absolute;inset:0;transition:opacity .5s linear}
#slideshow-panel .ss-cap{position:absolute;left:0;right:0;bottom:12%;text-align:center;color:#fff;font:900 clamp(16px,3.4vw,34px)/1.1 Arial;text-transform:uppercase;-webkit-text-stroke:2px #000;paint-order:stroke;text-shadow:0 3px 6px #000}
#slideshow-panel .ss-bar{position:relative;height:46px;border-radius:6px;overflow:hidden;background:#e2e8f0;margin:10px 0;user-select:none;touch-action:none}
#slideshow-panel .ss-seg{position:absolute;top:0;bottom:0;background-size:cover;background-position:center;border-right:1px solid #fff;box-sizing:border-box}
#slideshow-panel .ss-handle{position:absolute;top:0;bottom:0;width:10px;margin-left:-5px;cursor:ew-resize;z-index:2}
#slideshow-panel .ss-handle::after{content:"";position:absolute;left:4px;top:0;bottom:0;width:3px;background:#fbbf24;box-shadow:0 0 0 1px #0006}
#slideshow-panel .ss-head{position:absolute;top:0;bottom:0;width:2px;background:#ef4444;z-index:3;pointer-events:none}
#slideshow-panel .ss-list{max-height:560px;overflow:auto;border:1px solid #cbd5df;border-radius:8px}
#slideshow-panel .ss-row{display:grid;grid-template-columns:30px 112px minmax(0,1fr);gap:10px;align-items:start;padding:8px;border-bottom:1px solid #e2e8f0;font-size:13px}
#slideshow-panel .ss-row.now{background:#eff6ff}
#slideshow-panel .ss-row img{width:112px;aspect-ratio:16/9;object-fit:cover;border-radius:5px;cursor:grab;background:#e2e8f0}
#slideshow-panel .ss-row img.over{outline:3px solid #2563eb}
#slideshow-panel .ss-row small{color:#64748b;display:block;margin-bottom:3px}
#slideshow-panel textarea{width:100%}
@media (max-width:820px){#slideshow-panel .ss-grid{grid-template-columns:1fr}}
</style>
<h2>Images + Voice → Video</h2>
<p>Upload a voiceover and the images for it. The voiceover is transcribed (OpenAI) and split into one scene per image at sentence ends; review and adjust, then render a video where each image shows exactly while its words are spoken.</p>
<div class="actions"><label>Voiceover (MP3 / WAV)<br><input id="ss-audio" type="file" accept="audio/mpeg,audio/wav,audio/x-wav,.mp3,.wav,.m4a"></label>
<label>Images (PNG, JPG, WebP)<br><input id="ss-images" type="file" multiple accept="image/png,image/jpeg,image/webp"></label></div>
<label style="display:block">Script (optional: paste it for exact words)<textarea id="ss-script" rows="3" placeholder="Paste the voiceover script here if you have it"></textarea></label>
<button type="button" id="ss-upload" disabled>Upload &amp; transcribe</button> <span id="ss-estimate"></span>
<p id="ss-status" role="status" aria-live="polite"></p><p id="ss-error" class="error" role="alert"></p>
<div id="ss-review" hidden>
<h3>Match images to scenes</h3>
<div class="actions"><label><input type="radio" name="ss-match" value="order" checked> In order (by file name)</label><label><input type="radio" name="ss-match" value="ai"> AI match (OpenAI vision)</label>
<button type="button" id="ss-apply">Apply matching</button><span id="ss-quote"></span></div>
<h3>Review before rendering</h3>
<p>Drag a picture onto another scene's picture to swap them. Drag the yellow lines on the bar to move a scene boundary (it snaps to pauses between words).</p>
<div class="ss-grid"><div><div class="ss-stage" id="ss-stage"><div class="ss-layer" id="ss-a"><img class="bg" alt=""><img class="fg" alt=""></div><div class="ss-layer" id="ss-b" style="opacity:0"><img class="bg" alt=""><img class="fg" alt=""></div><div class="ss-cap" id="ss-cap"></div></div>
<audio id="ss-player" controls preload="auto" style="width:100%;margin-top:8px"></audio>
<div class="ss-bar" id="ss-bar"></div><p id="ss-summary"></p>
<div class="actions"><label>Format<select id="ss-ratio"><option value="16:9">16:9 (YouTube)</option><option value="9:16">9:16 (TikTok / Reels)</option></select></label>
<label><input id="ss-captions" type="checkbox" checked> Captions (Auto Clips style)</label><button type="button" id="ss-render">Render video</button></div>
<progress id="ss-progress" value="0" max="1" style="width:100%" hidden></progress>
<div id="ss-result" hidden><video id="ss-video" controls style="width:100%;max-height:420px;background:#000"></video><a id="ss-download" class="button" download="images-voice-video.mp4">Download MP4</a></div></div>
<div class="ss-list" id="ss-list"></div></div></div>`;
($('image-video-panel') || document.querySelector('main section')).after(panel);

// ---------- upload ----------
function ready() { $('ss-upload').disabled = !$('ss-audio').files[0] || !$('ss-images').files.length; }
$('ss-images').onchange = ready;
$('ss-audio').onchange = () => {
 ready(); const file = $('ss-audio').files[0]; $('ss-estimate').textContent = '';
 if (!file) return;
 const probe = new Audio(URL.createObjectURL(file));
 probe.onloadedmetadata = () => { $('ss-estimate').textContent = `${fmt(probe.duration)} of audio · transcription about $${(probe.duration / 60 * WHISPER_PER_MINUTE).toFixed(3)}`; URL.revokeObjectURL(probe.src); };
};
$('ss-upload').onclick = async () => {
 fail(null); $('ss-upload').disabled = true;
 try {
  const form = new FormData();
  form.append('audio', $('ss-audio').files[0]);
  for (const file of $('ss-images').files) form.append('images', file);
  form.append('script', $('ss-script').value);
  status(`Uploading the voiceover and ${$('ss-images').files.length} images…`);
  project = await api('/slideshow/projects', {method: 'POST', body: form});
  status('Transcribing the voiceover with OpenAI and splitting it into scenes…');
  while (project.status === 'transcribing') { await new Promise(r => setTimeout(r, 2000)); project = await api('/slideshow/projects/' + project.id); }
  if (project.status === 'failed') throw Error(project.error);
  await loaded();
 } catch (e) { fail(e); status(''); } finally { ready(); }
};

async function loaded() {
 scenes = project.scenes.map(s => ({image: s.image, start: s.start, end: s.end}));
 gaps = project.words.slice(0, -1).map((w, i) => (w.end + project.words[i + 1].start) / 2);
 const spent = Object.values(project.cost_usd || {}).reduce((a, b) => a + b, 0);
 status(`${project.images.length} images · ${scenes.length} scenes · ${fmt(project.audio.duration)} · ${project.words.length} words. Cost so far $${spent.toFixed(3)}.`);
 $('ss-review').hidden = false;
 $('ss-player').src = `/slideshow/projects/${project.id}/audio`;
 quote = null; $('ss-quote').textContent = '';
 shown = -1; paint(); layout();
}

// ---------- matching ----------
document.querySelectorAll('input[name=ss-match]').forEach(r => r.onchange = async () => {
 $('ss-quote').textContent = '';
 if (r.value === 'ai' && r.checked && project) {
  quote = await api(`/slideshow/projects/${project.id}/match-quote`).catch(fail);
  if (quote) $('ss-quote').textContent = `Describes ${quote.images} images and matches them: about $${quote.usd.toFixed(4)} (${quote.model}).`;
 }
});
$('ss-apply').onclick = async () => {
 const mode = document.querySelector('input[name=ss-match]:checked').value; fail(null);
 if (mode === 'ai' && (!quote || !confirm(`AI match costs about $${quote.usd.toFixed(4)}. Run it?`))) return;
 $('ss-apply').disabled = true; status(mode === 'ai' ? 'Describing the images and matching them to the narration…' : 'Putting images in file-name order…');
 try {
  const timing = scenes.map(s => ({start: s.start, end: s.end}));
  project = await api(`/slideshow/projects/${project.id}/match`, post({mode, confirmed_usd: mode === 'ai' ? quote.usd : null}));
  scenes = project.scenes.map((s, i) => ({image: s.image, ...timing[i]}));  // keep any timing changes
  shown = -1; paint(); status(mode === 'ai' ? `AI match done (cost $${(project.cost_usd?.ai_match || 0).toFixed(4)}).` : 'Images are in file-name order.');
 } catch (e) { fail(e); status(''); } finally { $('ss-apply').disabled = false; }
};

// ---------- review list and timing bar ----------
let dragged = null;
function paint() {
 const list = $('ss-list'); list.replaceChildren();
 scenes.forEach((s, i) => {
  const row = element('div'); row.className = 'ss-row'; row.dataset.scene = i;
  const img = new Image(); img.alt = imageName(s.image); img.title = `${imageName(s.image)} — drag onto another scene to swap`; img.draggable = true;
  blobURL(imageURL(s.image, true)).then(u => img.src = u).catch(() => {});
  img.ondragstart = e => { dragged = i; e.dataTransfer.effectAllowed = 'move'; };
  img.ondragover = e => { e.preventDefault(); img.classList.add('over'); };
  img.ondragleave = () => img.classList.remove('over');
  img.ondrop = e => { e.preventDefault(); img.classList.remove('over'); if (dragged === null || dragged === i) return; [scenes[dragged].image, scenes[i].image] = [scenes[i].image, scenes[dragged].image]; dragged = null; shown = -1; paint(); };
  const text = element('div'); text.append(element('small', `${fmt(s.start)} – ${fmt(s.end)} · ${(s.end - s.start).toFixed(1)} s · ${imageName(s.image)}`), element('span', wordsIn(s) || '(no words: music or silence)'));
  row.append(element('strong', String(i + 1)), img, text);
  row.onclick = e => { if (e.target !== img) { $('ss-player').currentTime = s.start + .01; tick(); } };
  list.append(row);
 });
 bar();
 $('ss-summary').textContent = `${scenes.length} scenes · each image shows while its words are spoken · video length ${fmt(project.audio.duration)} (same as the voiceover).`;
}
function bar() {
 const box = $('ss-bar'), total = project.audio.duration; box.replaceChildren();
 scenes.forEach((s, i) => {
  const seg = element('div'); seg.className = 'ss-seg'; seg.style.left = s.start / total * 100 + '%'; seg.style.width = (s.end - s.start) / total * 100 + '%'; seg.title = `Scene ${i + 1}: ${fmt(s.start)}–${fmt(s.end)}`;
  blobURL(imageURL(s.image, true)).then(u => seg.style.backgroundImage = `url("${u}")`).catch(() => {});
  box.append(seg);
  if (i) { const handle = element('div'); handle.className = 'ss-handle'; handle.style.left = s.start / total * 100 + '%'; handle.title = 'Drag to move this scene boundary'; handle.onpointerdown = e => boundary(e, i); box.append(handle); }
 });
 const head = element('div'); head.className = 'ss-head'; head.id = 'ss-head'; box.append(head);
 box.onpointerdown = e => { if (e.target.classList.contains('ss-handle')) return; const r = box.getBoundingClientRect(); $('ss-player').currentTime = (e.clientX - r.left) / r.width * total; tick(); };
}
function boundary(e, i) {
 e.preventDefault(); e.stopPropagation();
 const box = $('ss-bar'), rect = box.getBoundingClientRect(), total = project.audio.duration;
 const lo = scenes[i - 1].start + MIN_SCENE, hi = scenes[i].end - MIN_SCENE;
 const move = ev => {
  const want = (ev.clientX - rect.left) / rect.width * total;
  const choices = gaps.filter(g => g >= lo && g <= hi);  // snap to a pause between words
  const t = choices.length ? choices.reduce((a, b) => Math.abs(b - want) < Math.abs(a - want) ? b : a) : Math.min(hi, Math.max(lo, want));
  scenes[i - 1].end = scenes[i].start = Math.round(t * 1000) / 1000; bar();
 };
 const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); paint(); };
 addEventListener('pointermove', move); addEventListener('pointerup', up);
}

// ---------- preview player ----------
function layout() { const [w, h] = $('ss-ratio').value === '9:16' ? [9, 16] : [16, 9]; const stage = $('ss-stage'); stage.style.aspectRatio = `${w}/${h}`; stage.style.maxWidth = w < h ? '320px' : ''; }
$('ss-ratio').onchange = layout;
function show(index, at) {
 const s = scenes[index], layer = [$('ss-a'), $('ss-b')][front ^= 1], other = [$('ss-a'), $('ss-b')][front ^ 1];
 blobURL(imageURL(s.image)).then(url => {
  for (const img of layer.querySelectorAll('img')) img.src = url;
  // Slow zoom/pan like the render: alternate zoom in / out over the scene's length.
  const fg = layer.querySelector('.fg'), length = Math.max(.5, s.end - Math.max(s.start, at)), zoomIn = index % 2 === 0;
  fg.style.transition = 'none'; fg.style.transform = `scale(${zoomIn ? 1 : 1.08})`; void fg.offsetWidth;
  fg.style.transition = `transform ${length}s linear`; fg.style.transform = `scale(${zoomIn ? 1.08 : 1})`;
  layer.style.opacity = 1; other.style.opacity = 0;
 }).catch(() => {});
}
function tick() {
 if (!project || $('ss-review').hidden) return;
 const t = $('ss-player').currentTime, index = Math.max(0, scenes.findIndex(s => t >= s.start && t < s.end));
 if (index !== shown) {
  shown = index; show(index, t);
  for (const row of $('ss-list').children) row.classList.toggle('now', Number(row.dataset.scene) === index);
  $('ss-list').children[index]?.scrollIntoView({block: 'nearest'});
 }
 const head = $('ss-head'); if (head) head.style.left = t / project.audio.duration * 100 + '%';
 // Caption preview: the 3-word group being spoken.
 const k = project.words.findIndex(w => w.start <= t && t < w.end + .25);
 $('ss-cap').textContent = $('ss-captions').checked && k >= 0 ? project.words.slice(k - k % 3, k - k % 3 + 3).map(w => w.word).join(' ') : '';
}
(function loop() { tick(); requestAnimationFrame(loop); })();
$('ss-captions').onchange = tick;

// ---------- render ----------
$('ss-render').onclick = async () => {
 if (rendering) return; rendering = true; fail(null); $('ss-render').disabled = true; $('ss-progress').hidden = false; $('ss-result').hidden = true;
 try {
  let job = await api(`/slideshow/projects/${project.id}/renders`, post({scenes, ratio: $('ss-ratio').value, captions: $('ss-captions').checked}));
  while (job.status === 'running') { await new Promise(r => setTimeout(r, 1500)); job = await api(`/slideshow/projects/${project.id}/renders/${job.id}`); status(job.stage); $('ss-progress').value = job.progress || 0; }
  if (job.status === 'failed') throw Error(job.error);
  $('ss-video').src = job.url; $('ss-download').href = job.url + '?download=1'; $('ss-result').hidden = false;
  status(`Video ready: ${fmt(job.duration)} long (voiceover ${fmt(job.audio_duration)}). Rendering is free; it runs on the ClipForge server.`);
 } catch (e) { fail(e); } finally { rendering = false; $('ss-render').disabled = false; $('ss-progress').hidden = true; }
};
window.clipforgeSlideshow = {open: async id => { project = await api('/slideshow/projects/' + id); if (project.status === 'ready') await loaded(); return project; }, scenes: () => scenes};
