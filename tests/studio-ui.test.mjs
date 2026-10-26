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
    assert.match(html,/href="\/studios\/light-theme.css"/,name);
    assert.match(html,/src="\/studios\/preview-modal.js"/,name);
  }
});
test('renamed navigation retains every existing deep link',()=>{
  const source=read('src/StudioNav.jsx');
  for(const [label,path] of [['ClipForge Classic','/clipper'],['AI Auto Clips','/workspace/auto'],['Text-to-Clip','/workspace/transcript'],['Thumbnail Creator','/workspace/thumbnails'],['Video Editor','/workspace/editor']]){
    assert.ok(source.includes(label));assert.ok(source.includes(path));
  }
});
