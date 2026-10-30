import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('thumbnail document and module have matching deployment cache versions',()=>{
  const document=read('public/studios/thumbnails.html'),workspace=read('src/StudioWorkspace.jsx');
  const version=document.match(/thumbnail-generator\.js\?v=([\w-]+)/)?.[1];
  assert.ok(version,'thumbnail module must invalidate older cached scripts');
  assert.ok(workspace.includes('&v='+version),'iframe HTML and module versions must match');
});
test('every independently loaded Studio document receives the same theme and preview controls',()=>{
  for(const name of ['studio.html','transcript.html','thumbnails.html','legacy.html']){
    const html=read('public/studios/'+name);
    assert.match(html,/href="\/studios\/light-theme.css(?:\?v=[\w-]+)?"/,name);
    assert.match(html,/src="\/studios\/preview-modal.js"/,name);
  }
});
test('navigation shows the five tools; the Video Editor page stays reachable only through AI Video Generator',()=>{
  const source=read('src/StudioNav.jsx'),workspace=read('src/StudioWorkspace.jsx');
  for(const [label,path] of [['ClipForge Classic','/clipper'],['AI Auto Clips','/workspace/auto'],['Text-to-Clip','/workspace/transcript'],['Thumbnail Creator','/workspace/thumbnails'],['AI Video Generator','/workspace/generator']]){
    assert.ok(source.includes(label));assert.ok(source.includes(path));
  }
  assert.doesNotMatch(source,/'Video Editor'|\/workspace\/editor/);
  assert.match(workspace,/editor:'legacy.html'/);  // the old /workspace/editor link still opens the same page
});

test('AI Video Generator page has no bulk clip section; its transcript keeps its own video picker',()=>{
  const html=read('public/studios/legacy.html'),script=read('public/studios/editor.js');
  assert.doesNotMatch(html,/Upload once|id="generate"|id="gallery"|Clip All|local-original\/manual/);
  for(const text of ['Transcript & local assistant','Editing history','id="upload"','id="source-link"','/api/videos/url'])assert.ok(html.includes(text),text);
  assert.match(script,/main section:nth-of-type\(1\)/);  // generator and editing workspace stay above the transcript
});

test('production transcript workflow has no stale credential-free fixture controls',()=>{
  const html=read('public/studios/transcript.html');
  assert.doesNotMatch(html,/Isolated test interface|No authentication|fetch\('\/fixture'\)|id="fixture"/);
  assert.match(html,/existing account access/);
  assert.match(html,/id="file"/);assert.match(html,/id="create"/);
});

test('AI Video Generator adds both modes while sharing the existing editor frame',()=>{
 const html=read('public/studios/editor-panel.html'),workspace=read('src/StudioWorkspace.jsx'),nav=read('src/StudioNav.jsx'),script=read('public/studios/editor.js');
 for(const label of ['AI Video Generator','Text-to-Video','Image-to-Video','Send to Video Editor'])assert.ok(html.includes(label));
 assert.match(nav,/\/workspace\/generator/);assert.match(workspace,/key==='generator'\?'editor':key/);
 assert.match(script,/confirmPaid\(api,'\/video-generator\/quote'/);
 assert.match(script,/post\(\{\.\.\.body,\.\.\.spending\}\)/);
 assert.match(script,/selectedPrice/);
 for(const id of ['iv-resolution','iv-audio','iv-allowance','iv-pricing-source'])assert.ok(html.includes(id));
});

test('Video Editing Workspace is visual: live preview, thumbnail timeline, drag editing, settings panel',()=>{
 const html=read('public/studios/editor-panel.html'),script=read('public/studios/timeline-editor.js'),host=read('public/studios/editor.js');
 for(const id of ['ve-stage','ve-text-layer','ve-overlay-layer','ve-play','ve-split','ve-timeline','ve-inspector','ve-bin','editor-render','editor-upload','editor-link'])assert.ok(html.includes(`id="${id}"`),id);
 assert.ok(html.indexOf('id="ve-stage"')<html.indexOf('id="ve-timeline"'));  // player above the timeline
 for(const row of ['Video','Text','Overlays','Music','Sound FX'])assert.ok(script.includes(`'${row}'`),row);
 assert.match(script,/\/editor\/assets\/\$\{a\.id\}\/frame\?t=/);  // frame-thumbnail strips
 for(const fn of ['function split(','function startDrag(','function scrub(','function stageDrag(','function paintInspector('])assert.ok(script.includes(fn),fn);
 assert.match(script,/Exact numbers/);  // typed numbers stay as an option
 assert.match(host,/import\('\.\/timeline-editor\.js/);
 assert.doesNotMatch(host,/function paint\(\)|editor-segments/);  // the old number-only editor is gone
});

test('Thumbnail Creator has AI thumbnails: style gallery with bundled previews, quality prices, cost confirm',()=>{
 const script=read('public/studios/ai-thumbnails.js'),host=read('public/studios/thumbnail-generator.js');
 assert.match(host,/import \{aiThumbnails\} from '\.\/ai-thumbnails\.js/);
 for(const text of ['Generate AI thumbnail','Confirm','/thumbnail-ai/ai-styles','confirmed_total_usd','per image','click to use'])assert.ok(script.includes(text),text);
 // One full-frame image layer + one outlined title layer; swapping replaces the image instead of stacking.
 assert.match(script,/\{id: 'ai-image', type: 'image', asset: key, x: 0, y: 0, w: W, h: H, fit: 'cover'/);
 assert.match(script,/strokeWidth:16/);assert.match(script,/item\.title_side/);
 assert.doesNotMatch(script,/addImage|renderConcept/);
 assert.match(script,/× \$\{money\(price\(\)\)\} = \$\{money\(total\(\)\)\}/);  // "3 styles × $0.04 = $0.12"
 for(const slug of ['anime','80s-flashback','comic','collectors-tin','hyperreal-wallpaper'])assert.ok(existsSync(new URL(`../public/studios/thumbnail-styles/${slug}.jpg`,import.meta.url)),slug);
});
