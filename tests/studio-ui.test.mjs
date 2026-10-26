import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
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
test('renamed navigation retains every existing deep link',()=>{
  const source=read('src/StudioNav.jsx');
  for(const [label,path] of [['ClipForge Classic','/clipper'],['AI Auto Clips','/workspace/auto'],['Text-to-Clip','/workspace/transcript'],['Thumbnail Creator','/workspace/thumbnails'],['Video Editor','/workspace/editor']]){
    assert.ok(source.includes(label));assert.ok(source.includes(path));
  }
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
 assert.match(script,/credits_per_second/);
});
