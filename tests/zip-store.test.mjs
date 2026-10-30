import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdtempSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {makeZip, crc32, fileSlug} from '../public/studios/zip-store.js';

test('crc32 matches the standard check value',()=>{
  assert.equal(crc32(new TextEncoder().encode('123456789')),0xCBF43926);
});

const python=process.env.PYTHON||'python';
const hasPython=(()=>{try{execFileSync(python,['--version']);return true}catch{return false}})();

test('the zip opens with a standard unzip tool and holds the exact files',{skip:!hasPython&&'Python not found to verify the zip'},()=>{
  const files=[1,2,3].map(i=>({name:`thumbnail-${i}-why-memory-lies.png`,bytes:Uint8Array.from({length:1000*i},(_,j)=>(j*i)%256)}));
  const folder=mkdtempSync(join(tmpdir(),'cf-zip-'));const path=join(folder,'all.zip');
  writeFileSync(path,makeZip(files));
  const check=`import zipfile,sys,json
z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None
print(json.dumps({n:list(z.read(n)[:5]) + [len(z.read(n))] for n in z.namelist()}))`;
  const listed=JSON.parse(execFileSync(python,['-c',check,path],{encoding:'utf8'}));
  assert.deepEqual(Object.keys(listed),files.map(f=>f.name));
  for(const f of files)assert.deepEqual(listed[f.name],[...f.bytes.slice(0,5),f.bytes.length]);
});

test('file names are safe and readable',()=>{
  assert.equal(fileSlug("A Story That Wasn't Yours"),'a-story-that-wasn-t-yours');
  assert.equal(fileSlug('Who Told It?'),'who-told-it');
  assert.equal(fileSlug('???'),'thumbnail');
});

test('the page has the one-click button wired to finished renders',()=>{
  const page=readFileSync(new URL('../public/studios/thumbnails.html',import.meta.url),'utf8');
  const script=readFileSync(new URL('../public/studios/thumbnail-generator.js',import.meta.url),'utf8');
  assert.match(page,/<button id="download-all" disabled>Download all 3 thumbnails<\/button>/);
  assert.match(page,/renderConcept/);assert.match(page,/function conceptProject/);
  assert.match(script,/window\.thumbnailStudio\.renderConcept\(c, url\)/);
  assert.match(script,/makeZip\(files\)/);
});
