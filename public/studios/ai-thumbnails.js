// AI thumbnails: pick styles from a gallery of bundled previews, choose a quality, confirm the total,
// then OpenAI draws one 1280x720 image per style from the video's topic and best face frame.
// The chosen image becomes the editor's only image layer (full frame) with one title layer on the side
// away from the face; past generations stay in a strip to swap back.
import {requestJson} from './request-json.js?v=pricing-20261026-1';
const $ = id => document.getElementById(id);
const api = requestJson;
const post = body => ({method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
const money = usd => '$' + usd.toFixed(3).replace(/0$/, '');
const W = 1280, H = 720, TITLE = {font:'Impact', size:96, fill:'#ffffff', stroke:'#000000', strokeWidth:16, width:560, margin:56};
let info = null, job = null, chosen = new Set(), quality = 'standard', batch = null, working = false, confirming = false, titleIndex = 0, current = null;

function element(tag, text, style) { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; if (style) e.style = style; return e; }
function fail(e) { const box = $('ai-error'); if (box) box.textContent = e?.message || ''; }
function price() { return info.qualities.find(q => q.key === quality).price_usd; }
function total() { return Number((chosen.size * price()).toFixed(3)); }
// Every image made for this video, newest first.
function generations() { return Object.values(job?.ai_batches || {}).reverse().flatMap(b => b.items.filter(i => i.url)); }

export async function aiThumbnails(next) {
 if (next?.id !== job?.id) { batch = null; current = null; }
 job = next;
 let box = $('ai-thumbnails');
 if (!box) {
  box = element('section'); box.id = 'ai-thumbnails';
  box.style = 'margin-top:24px;border:1px solid #CBD5E1;border-radius:12px;padding:16px;background:#FFFFFF';
  ($('designed-thumbnails') || $('concept-gallery')).after(box);
 }
 if (!info) { try { info = await api('/thumbnail-ai/ai-styles'); } catch (e) { box.replaceChildren(element('h2', 'AI thumbnails'), element('p', e.message)); return; } }
 paint(box);
}

// ---------- the editor project: one full-frame image layer + one title layer ----------
function titleText() { return job?.analysis?.concepts?.[titleIndex]?.title || 'Your title'; }
function titleLayer(text, side, keep) {
 // Wrap like the editor (1.17 line height) to centre the block vertically on the open side.
 const context = document.createElement('canvas').getContext('2d'), size = keep?.size || TITLE.size, font = keep?.font || TITLE.font;
 context.font = `bold ${size}px ${font}`;
 const rows = []; let row = '';
 for (const word of text.split(/\s+/)) { const next = row ? row + ' ' + word : word; if (context.measureText(next).width > TITLE.width && row) { rows.push(row); row = word; } else row = next; }
 rows.push(row);
 const height = rows.length * size * 1.17;
 return {id: 'ai-title', type: 'text', text, font, size, fill: keep?.fill || TITLE.fill, stroke: keep?.stroke || TITLE.stroke,
  strokeWidth: keep?.strokeWidth || TITLE.strokeWidth, bold: true, shadow: true, align: side === 'right' ? 'right' : 'left',
  x: side === 'right' ? W - TITLE.margin - TITLE.width : TITLE.margin, y: Math.max(24, Math.round((H - height) / 2)),
  w: TITLE.width, h: Math.min(H - 48, Math.round(height + size * .4)), opacity: 1};
}
async function dataURL(url) {
 const response = await fetch(url); if (!response.ok) throw Error('Image unavailable');
 const blob = await response.blob();
 return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(Error('Could not read image')); reader.readAsDataURL(blob); });
}
async function useImage(item) {
 // Replaces the image (never stacks a new layer) and cleans the project to one image + one title.
 const studio = window.thumbnailStudio, before = studio.getProject();
 const keep = before.layers.find(l => l.id === 'ai-title') || null;  // the user's own title edits survive a swap
 const text = keep?.text || titleText(), side = item.title_side || 'left';
 const key = 'ai-image';
 await studio.restore({version: 1, width: W, height: H, background: '#000000', assets: {[key]: await dataURL(item.url)}, layers: [
  {id: 'ai-image', type: 'image', asset: key, x: 0, y: 0, w: W, h: H, fit: 'cover', opacity: 1},
  titleLayer(text, side, keep)]});
 current = item.url; paint($('ai-thumbnails'));
 $('canvas')?.scrollIntoView({behavior: 'smooth', block: 'center'});
}

// ---------- panel ----------
function paint(box) {
 const ready = job?.status === 'completed', concepts = job?.analysis?.concepts || [];
 const heading = element('h2', 'AI thumbnails');
 const note = element('p', `Uses your video's topic and transcript, and sends the best face frame from the video so the person looks like themselves (no face: a scene from the topic). OpenAI ${info.model}, 1280×720 filling the whole frame; the title goes on top of the image, on the side away from the face.`);
 const qualities = element('div', undefined, 'display:flex;flex-wrap:wrap;gap:14px;margin:8px 0');
 for (const q of info.qualities) {
  const label = element('label', undefined, 'cursor:pointer'), radio = Object.assign(document.createElement('input'), {type:'radio', name:'ai-quality', value:q.key, checked:q.key === quality});
  radio.onchange = () => { quality = q.key; confirming = false; paint(box); };
  label.append(radio, ` ${q.label} — ${money(q.price_usd)} per image`); qualities.append(label);
 }
 const gallery = element('div', undefined, 'display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin:10px 0');
 gallery.setAttribute('role', 'group'); gallery.setAttribute('aria-label', 'AI thumbnail styles');
 for (const s of info.styles) {
  const on = chosen.has(s.name), tile = element('button', undefined,
   `padding:0;border:3px solid ${on ? '#2563EB' : 'transparent'};border-radius:12px;background:#F1F5F9;overflow:hidden;cursor:pointer;text-align:left;position:relative;color:#0F172A`);
  tile.type = 'button'; tile.setAttribute('aria-pressed', String(on)); tile.title = s.name;
  const img = Object.assign(new Image(), {src: s.preview, alt: '', loading: 'lazy'}); img.style = 'width:100%;aspect-ratio:16/9;object-fit:cover;display:block';
  tile.append(img, element('span', s.name, `display:block;padding:6px 8px;font-size:13px;font-weight:600;background:${on ? '#2563EB' : '#F1F5F9'};color:${on ? '#FFFFFF' : '#0F172A'}`));
  if (on) tile.append(element('span', '✓', 'position:absolute;top:6px;right:6px;background:#2563EB;color:#fff;border-radius:50%;width:24px;height:24px;display:grid;place-items:center;font-weight:700'));
  tile.onclick = () => {
   fail(null); confirming = false;
   if (on) chosen.delete(s.name); else if (chosen.size >= info.max_styles) return fail(Error(`Choose up to ${info.max_styles} styles at a time`)); else chosen.add(s.name);
   paint(box);
  };
  gallery.append(tile);
 }
 const titleLabel = element('label', 'Title ');
 const title = document.createElement('select');
 concepts.forEach((c, i) => title.append(new Option(c.title, i))); title.value = titleIndex; title.disabled = !concepts.length;
 title.onchange = async () => {
  titleIndex = Number(title.value);
  const project = window.thumbnailStudio.getProject(), layer = project.layers.find(l => l.id === 'ai-title');
  if (layer) { const side = layer.align === 'right' ? 'right' : 'left'; project.layers = project.layers.map(l => l.id === 'ai-title' ? titleLayer(titleText(), side, l) : l); await window.thumbnailStudio.restore(project).catch(fail); }
 };
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
  yes.onclick = () => generate(box).catch(e => { working = false; paint(box); fail(e); });
  no.onclick = () => { confirming = false; paint(box); };
  confirm.append(element('strong', `${chosen.size} style${chosen.size > 1 ? 's' : ''} × ${money(price())} = ${money(total())}`), element('span', `(${info.qualities.find(q => q.key === quality).label} quality, charged to your OpenAI key)`), yes, no);
 }
 const status = element('p', working ? batch?.stage || 'Starting…' : batch?.status === 'completed' ? resultNote() : '', 'font-weight:600');
 const error = element('p', '', 'color:#B91C1C'); error.id = 'ai-error';
 box.replaceChildren(heading, note, qualities, gallery, titleLabel, actions, confirm, status, error, strip());
}

function resultNote() {
 const spent = (batch.cost_usd?.images || 0) + (batch.cost_usd?.brief || 0);
 return `${batch.items.filter(i => i.url).length} AI image(s) made · actual cost ${money(spent)}${batch.brief?.has_person ? ' · from the best face frame' : ' · no clear face: a scene from the topic'}. Click one below to use it.`;
}

// Past generations: click to swap the editor's image (no new layers).
function strip() {
 const items = generations(), wrap = element('div');
 if (!items.length) return wrap;
 wrap.append(element('h3', 'Your AI images (click to use)', 'margin:14px 0 6px;font-size:15px'));
 const row = element('div', undefined, 'display:flex;gap:10px;overflow-x:auto;padding-bottom:6px');
 for (const item of items) {
  const on = item.url === current, card = element('button', undefined,
   `flex:0 0 168px;padding:0;border:3px solid ${on ? '#2563EB' : '#CBD5E1'};border-radius:10px;overflow:hidden;background:#F1F5F9;cursor:pointer;text-align:left`);
  card.type = 'button'; card.title = `Use the ${item.style} image`; card.setAttribute('aria-pressed', String(on));
  const img = Object.assign(new Image(), {src: item.url, alt: `${item.style} AI image`}); img.style = 'width:100%;aspect-ratio:16/9;object-fit:cover;display:block';
  card.append(img, element('span', `${on ? '✓ ' : ''}${item.style}`, `display:block;padding:4px 7px;font-size:12px;font-weight:600;background:${on ? '#2563EB' : '#F1F5F9'};color:${on ? '#fff' : '#0F172A'}`));
  card.onclick = () => useImage(item).catch(fail);
  row.append(card);
 }
 wrap.append(row);
 return wrap;
}

async function generate(box) {
 working = true; confirming = false; fail(null);
 batch = await api(`/thumbnail-ai/jobs/${job.id}/ai-thumbnails`, post({styles: [...chosen], quality, confirmed_total_usd: total()}));
 paint(box);
 while (batch.status === 'running') {
  await new Promise(r => setTimeout(r, 2000));
  batch = await api(`/thumbnail-ai/jobs/${job.id}/ai-thumbnails/${batch.id}`); paint(box);
 }
 working = false;
 job.ai_batches = {...(job.ai_batches || {}), [batch.id]: batch};
 if (batch.status === 'failed') { paint(box); throw Error(batch.error || 'AI thumbnails failed'); }
 const first = batch.items.find(i => i.url);
 if (first) await useImage(first);  // the new image replaces the current one
 paint(box);
}
