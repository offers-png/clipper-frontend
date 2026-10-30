// AI thumbnails: pick styles from a gallery of bundled previews, choose a quality, confirm the total,
// then OpenAI draws one 1280x720 image per style from the video's topic and best face frame.
// Results open in the existing editor, which adds the title on top.
import {requestJson} from './request-json.js?v=pricing-20261026-1';
const $ = id => document.getElementById(id);
const api = requestJson;
const post = body => ({method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
const money = usd => '$' + usd.toFixed(3).replace(/0$/, '');
let info = null, job = null, chosen = new Set(), quality = 'standard', batch = null, working = false, confirming = false, titleIndex = 0;
const results = new Map();  // style -> object URL with the title drawn on

function element(tag, text, style) { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; if (style) e.style = style; return e; }
function fail(e) { $('ai-error').textContent = e?.message || ''; }
function price() { return info.qualities.find(q => q.key === quality).price_usd; }
function total() { return Number((chosen.size * price()).toFixed(3)); }

export async function aiThumbnails(current) {
 if (current?.id !== job?.id) { batch = null; results.clear(); }
 job = current;
 if (!batch && job?.ai_batches) batch = Object.values(job.ai_batches).at(-1) || null;  // the last results stay after a reload
 let box = $('ai-thumbnails');
 if (!box) {
  box = element('section'); box.id = 'ai-thumbnails';
  box.style = 'margin-top:24px;border:1px solid #CBD5E1;border-radius:12px;padding:16px;background:#FFFFFF';
  ($('designed-thumbnails') || $('concept-gallery')).after(box);
 }
 if (!info) { try { info = await api('/thumbnail-ai/ai-styles'); } catch (e) { box.replaceChildren(element('h2', 'AI thumbnails'), element('p', e.message)); return; } }
 paint(box);
}

function paint(box) {
 const ready = job?.status === 'completed', concepts = job?.analysis?.concepts || [];
 const heading = element('h2', 'AI thumbnails');
 const note = element('p', `Uses your video's topic and transcript, and sends the best face frame from the video so the person looks like themselves (no face: a scene from the topic). OpenAI ${info.model}, 1280×720, with the top third kept clear for your title.`);
 // Quality with the current price per image.
 const qualities = element('div', undefined, 'display:flex;flex-wrap:wrap;gap:14px;margin:8px 0');
 for (const q of info.qualities) {
  const label = element('label', undefined, 'cursor:pointer'), radio = Object.assign(document.createElement('input'), {type:'radio', name:'ai-quality', value:q.key, checked:q.key === quality});
  radio.onchange = () => { quality = q.key; confirming = false; paint(box); };
  label.append(radio, ` ${q.label} — ${money(q.price_usd)} per image`); qualities.append(label);
 }
 // Style gallery: bundled preview pictures, several can be selected.
 const gallery = element('div', undefined, 'display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin:10px 0');
 gallery.setAttribute('role', 'group'); gallery.setAttribute('aria-label', 'AI thumbnail styles');
 for (const s of info.styles) {
  const on = chosen.has(s.name), tile = element('button', undefined,
   `padding:0;border:3px solid ${on ? '#2563EB' : 'transparent'};border-radius:12px;background:#F1F5F9;overflow:hidden;cursor:pointer;text-align:left;position:relative;color:#0F172A`);
  tile.type = 'button'; tile.setAttribute('aria-pressed', String(on)); tile.title = s.name;
  const img = Object.assign(new Image(), {src: s.preview, alt: '', loading: 'lazy'}); img.style = 'width:100%;aspect-ratio:16/9;object-fit:cover;display:block';
  const name = element('span', s.name, `display:block;padding:6px 8px;font-size:13px;font-weight:600;background:${on ? '#2563EB' : '#F1F5F9'};color:${on ? '#FFFFFF' : '#0F172A'}`);
  tile.append(img, name);
  if (on) tile.append(element('span', '✓', 'position:absolute;top:6px;right:6px;background:#2563EB;color:#fff;border-radius:50%;width:24px;height:24px;display:grid;place-items:center;font-weight:700'));
  tile.onclick = () => {
   fail(null); confirming = false;
   if (on) chosen.delete(s.name); else if (chosen.size >= info.max_styles) return fail(Error(`Choose up to ${info.max_styles} styles at a time`)); else chosen.add(s.name);
   paint(box);
  };
  gallery.append(tile);
 }
 // Title used when previewing/editing the results (the editor draws it on top).
 const titleLabel = element('label', 'Title on top ');
 const title = document.createElement('select');
 concepts.forEach((c, i) => title.append(new Option(c.title, i))); title.value = titleIndex; title.disabled = !concepts.length;
 title.onchange = () => { titleIndex = Number(title.value); results.clear(); paint(box); };
 titleLabel.append(title);
 const actions = element('div', undefined, 'display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:8px');
 const go = element('button', 'Generate AI thumbnail'); go.type = 'button';
 go.disabled = working || !ready || !chosen.size || !info.available;
 go.onclick = () => { confirming = true; paint(box); };
 actions.append(go, element('span', !info.available ? info.reason : !ready ? 'Analyze a video first.' : chosen.size ? `${chosen.size} style${chosen.size > 1 ? 's' : ''} selected: ${[...chosen].join(', ')}` : 'Select one or more styles above.', 'font-size:13px;color:#475569'));
 const confirm = element('div', undefined, 'display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:10px;padding:12px;border-radius:10px;background:#EFF6FF');
 confirm.hidden = !confirming;
 if (confirming) {
  const yes = element('button', 'Confirm'), no = element('button', 'Cancel'); yes.type = no.type = 'button';
  yes.onclick = () => generate(box).catch(e => { working = false; fail(e); paint(box); });
  no.onclick = () => { confirming = false; paint(box); };
  confirm.append(element('strong', `${chosen.size} style${chosen.size > 1 ? 's' : ''} × ${money(price())} = ${money(total())}`), element('span', `(${info.qualities.find(q => q.key === quality).label} quality, charged to your OpenAI key)`), yes, no);
 }
 const status = element('p', working ? batch?.stage || 'Starting…' : batch?.status === 'completed' ? resultNote() : '', 'font-weight:600');
 const error = element('p', $('ai-error')?.textContent || '', 'color:#B91C1C'); error.id = 'ai-error';
 box.replaceChildren(heading, note, qualities, gallery, titleLabel, actions, confirm, status, error, resultsGrid());
}

function resultNote() {
 const spent = (batch.cost_usd?.images || 0) + (batch.cost_usd?.brief || 0);
 return `${batch.items.filter(i => i.url).length} AI thumbnail(s) ready · actual cost ${money(spent)}${batch.brief?.has_person ? ' · made from the best face frame' : ' · no clear face: drawn as a scene from the topic'}`;
}

function resultsGrid() {
 const grid = element('div', undefined, 'display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:16px;margin-top:10px');
 for (const item of batch?.items || []) {
  const figure = element('figure', undefined, 'margin:0');
  if (item.error) { figure.append(element('figcaption', `${item.style}: ${item.error}`, 'color:#B91C1C')); grid.append(figure); continue; }
  const concept = {...job.analysis.concepts[titleIndex], id: 0}, img = new Image();  // the editor's title-band-on-top layout
  img.alt = `${item.style} AI thumbnail with title: ${concept.title}`; img.style = 'width:100%;aspect-ratio:16/9;display:block;border-radius:8px;background:#E2E8F0';
  if (results.has(item.style)) img.src = results.get(item.style);
  else window.thumbnailStudio.renderConcept(concept, item.url, 'image/jpeg').then(blob => { const url = URL.createObjectURL(blob); results.set(item.style, url); img.src = url; }).catch(fail);
  const edit = element('button', 'Edit with title'), save = element('button', 'Download'); edit.type = save.type = 'button';
  edit.onclick = () => window.thumbnailStudio.loadConcept(concept, item.url).catch(fail);
  save.onclick = async () => { const r = await fetch(item.url); if (!r.ok) return fail(Error('Download failed')); const a = document.createElement('a'), url = URL.createObjectURL(await r.blob()); a.href = url; a.download = `ai-thumbnail-${item.slug}.jpg`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000); };
  figure.append(img, element('figcaption', `${item.style}${item.cost_usd ? ' · ' + money(item.cost_usd) : ''}`, 'font-weight:600;margin:6px 0'), edit, ' ', save);
  grid.append(figure);
 }
 return grid;
}

async function generate(box) {
 working = true; confirming = false; fail(null); results.clear();
 batch = await api(`/thumbnail-ai/jobs/${job.id}/ai-thumbnails`, post({styles: [...chosen], quality, confirmed_total_usd: total()}));
 paint(box);
 while (batch.status === 'running') {
  await new Promise(r => setTimeout(r, 2000));
  batch = await api(`/thumbnail-ai/jobs/${job.id}/ai-thumbnails/${batch.id}`); paint(box);
 }
 working = false;
 if (batch.status === 'failed') throw Error(batch.error || 'AI thumbnails failed');
 paint(box);
}
