// Visual Video Editing Workspace: a live preview of the timeline (video, text, image overlays, music
// and sound effects drawn in the browser exactly where the export puts them), a timeline of thumbnail
// strips with a draggable playhead, drag-to-trim/move/reorder, and a settings panel. Export renders
// the same timeline on the server (editor.py), so the finished MP4 matches the preview.
import {requestJson} from './request-json.js?v=pricing-20261026-1';
const $=id=>document.getElementById(id);
const api=requestJson;
const post=body=>({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
const SIZES={'16:9':[1280,720],'9:16':[720,1280],'1:1':[720,720]};
const FONTS=['Arial','Impact','Georgia','Verdana','Courier New'];
const LINE={Arial:1.118,Impact:1.22,Georgia:1.137,Verdana:1.216,'Courier New':1.134};  // ascent+descent: the export's line height
const ROWS=[['video','Video',58],['text','Text',36],['overlay','Overlays',36],['music','Music',36],['effect','Sound FX',36]];
const MIN=.1;
let library=[],segments=[],tracks=[],overlays=[],texts=[],rendering=false;
let selected=null,time=0,playing=false,clock=0,pps=40,drag=null,audioContext=null;

// ---------- helpers ----------
const asset=id=>library.find(a=>a.id===id);
const total=()=>segments.reduce((sum,s)=>sum+s.end-s.start,0);
const canvas=()=>SIZES[$('editor-ratio').value];
const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
const round=v=>Math.round(v*100)/100;
const fmt=t=>`${Math.floor(t/60)}:${(t%60).toFixed(1).padStart(4,'0')}`;
const typing=e=>['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName);
function fail(e){$('editor-error').textContent=e?.message||String(e||'')}
function changed(){$('editor-status').textContent=`${segments.length} clips · ${fmt(total())}. The preview is live; render to export the MP4.`}
const blobs=new Map();  // media fetched once through the signed-in bridge, then reused by every preview element
function blobURL(path){
 if(!blobs.has(path))blobs.set(path,fetch(path).then(r=>{if(!r.ok)throw Error('Media unavailable');return r.blob()}).then(b=>URL.createObjectURL(b)).catch(e=>{blobs.delete(path);throw e}));
 return blobs.get(path);
}
function show(img,path){blobURL(path).then(url=>{img.src=url}).catch(()=>{})}
function segmentAt(t){let offset=0;for(const [index,s] of segments.entries()){const d=s.end-s.start;if(t<offset+d||index===segments.length-1)return {s,index,offset};offset+=d}return null}
function offsetOf(s){let offset=0;for(const x of segments){if(x===s)return offset;offset+=x.end-x.start}return 0}
function element(tag,className,text){const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e}

// Keep every timed item inside the timeline and the canvas, as the export requires.
function fit(){
 const T=total(),[W,H]=canvas();
 for(const t of tracks){t.start=round(clamp(t.start,0,Math.max(0,T-MIN)));t.duration=round(clamp(t.duration,MIN,Math.max(MIN,T-t.start)))}
 for(const o of [...texts,...overlays]){o.end=round(clamp(o.end,MIN,Math.max(MIN,T)));o.start=round(clamp(o.start,0,o.end-MIN));o.x=clamp(Math.round(o.x),0,W-1);o.y=clamp(Math.round(o.y),0,H-1)}
 time=clamp(time,0,T);
}
function update(){fit();paintTimeline();paintInspector();draw();changed()}

// ---------- media library ----------
function addAsset(a){if(!library.some(x=>x.id===a.id))library.push(a);paintBin();return a}
function append(a){
 if(!['video','image'].includes(a.kind))throw Error('Choose a video or still image');
 const s={asset_id:a.id,start:0,end:a.kind==='image'?3:round(a.duration),volume:1,mute:false};
 segments.push(s);select('segment',s);update();
}
function addTrack(a,role){
 if(!a.audio)throw Error('Choose an audio file or a video with sound');
 const T=total();if(!T)throw Error('Add a video or image to the timeline first');
 const start=role==='music'?0:round(Math.min(time,T-MIN));
 const t={asset_id:a.id,start,duration:round(Math.min(a.duration,T-start)),volume:role==='music'?.3:.7,loop:false,role};
 tracks.push(t);select('track',t);update();
}
function addOverlay(a){
 const T=total(),[W]=canvas();if(!T)throw Error('Add a video or image to the timeline first');
 const width=Math.round(W*.3),start=round(Math.min(time,T-MIN));
 const o={asset_id:a.id,start,end:round(Math.min(T,start+3)),x:Math.round(W*.05),y:Math.round(W*.05),width,height:Math.round(width*(a.height||1)/(a.width||1))};
 overlays.push(o);select('overlay',o);update();
}
function addText(){
 const T=total(),[W,H]=canvas();if(!T)throw Error('Add a video or image to the timeline first');
 const start=round(Math.min(time,T-MIN));
 const t={text:'Your text',start,end:round(Math.min(T,start+3)),x:Math.round(W*.08),y:Math.round(H*.72),size:Math.round(H*.07),color:'#ffffff',font:'Arial'};
 texts.push(t);select('text',t);update();
}
function paintBin(){
 const bin=$('ve-bin');bin.replaceChildren();
 if(!library.length){bin.append(element('p','', 'Import media above. Each file appears here with buttons to add it to the timeline.'));return}
 for(const a of library){
  const card=element('div','ve-card');
  if(a.kind==='audio')card.append(element('div','ve-icon','♪'));
  else{const img=document.createElement('img');img.alt='';show(img,a.kind==='image'?`/editor/assets/${a.id}`:`/editor/assets/${a.id}/frame?t=${round(a.duration*.1)}&h=144`);card.append(img)}
  card.append(element('strong','',a.name),element('span','',`${a.kind}${a.duration?' · '+fmt(a.duration):''}`),document.createElement('br'));
  const add=(label,fn)=>{const b=element('button','',label);b.type='button';b.onclick=()=>{try{fail('');fn()}catch(e){fail(e)}};card.append(b)};
  if(a.kind!=='audio')add('+ Timeline',()=>append(a));
  if(a.kind==='image')add('+ Overlay',()=>addOverlay(a));
  if(a.audio){add('+ Music',()=>addTrack(a,'music'));add('+ Sound FX',()=>addTrack(a,'effect'))}
  bin.append(card);
 }
}

// ---------- live preview ----------
const players=new Map(),sounds=new Map(),textEls=new Map(),overlayEls=new Map(),gains=new WeakMap();
let scale=1;
function gain(el,value){
 // Web Audio so volumes above 100% sound like the export; plain volume if it is unavailable.
 try{
  if(!audioContext)audioContext=new AudioContext();
  if(!gains.has(el)){const node=audioContext.createGain();audioContext.createMediaElementSource(el).connect(node).connect(audioContext.destination);gains.set(el,node)}
  el.volume=1;gains.get(el).gain.value=value;
 }catch{el.volume=clamp(value,0,1)}
}
function player(a){
 if(players.has(a.id))return players.get(a.id);
 const el=a.kind==='video'?document.createElement('video'):element('img','ve-still');
 if(a.kind==='video'){el.playsInline=true;el.preload='auto'}
 el.hidden=true;$('ve-stage').insertBefore(el,$('ve-overlay-layer'));players.set(a.id,el);
 blobURL(`/editor/assets/${a.id}`).then(url=>{el.src=url;el.addEventListener('loadeddata',draw,{once:true})}).catch(fail);
 return el;
}
function sound(t){
 if(sounds.has(t))return sounds.get(t);
 const el=document.createElement('audio');el.preload='auto';sounds.set(t,el);
 blobURL(`/editor/assets/${t.asset_id}`).then(url=>{el.src=url}).catch(fail);
 return el;
}
function layoutStage(){
 const [W,H]=canvas(),box=$('ve-stage-box'),width=Math.max(200,box.clientWidth-20);
 const height=Math.min(width*H/W,Math.max(240,window.innerHeight*.55),560);
 scale=height/H;$('ve-stage').style.width=Math.round(W*scale)+'px';$('ve-stage').style.height=Math.round(H*scale)+'px';
}
function draw(){
 const T=total(),at=segmentAt(time),original=$('editor-mute').checked?0:Number($('editor-original-volume').value)||0;
 $('ve-empty').hidden=!!segments.length;
 const active=at?player(asset(at.s.asset_id)||{}):null;
 for(const el of players.values()){
  if(el!==active){el.hidden=true;if(el.tagName==='VIDEO'&&!el.paused)el.pause();continue}
  el.hidden=false;
  if(el.tagName!=='VIDEO')continue;
  const want=at.s.start+(time-at.offset),drift=Math.abs(el.currentTime-want);
  gain(el,at.s.mute?0:at.s.volume*original);
  if(playing){if(el.paused){el.currentTime=want;el.play().catch(()=>{})}else if(drift>.3)el.currentTime=want}
  else{if(!el.paused)el.pause();if(drift>.04&&!el.seeking&&el.readyState)el.currentTime=want}
 }
 for(const [t,el] of sounds){
  if(!tracks.includes(t)){el.pause();sounds.delete(t);continue}
  const length=asset(t.asset_id)?.duration||t.duration;let local=time-t.start;
  if(t.loop)local%=length;
  const on=playing&&time>=t.start&&time<t.start+t.duration&&local<length;
  gain(el,t.volume);
  if(on){if(el.paused){el.currentTime=local;el.play().catch(()=>{})}else if(Math.abs(el.currentTime-local)>.3)el.currentTime=local}
  else if(!el.paused)el.pause();
 }
 for(const t of tracks)sound(t);
 // Image overlays: scaled to fit their box, top-left at x,y (the export's scale + overlay).
 for(const [o,el] of overlayEls)if(!overlays.includes(o)){el.remove();overlayEls.delete(o)}
 for(const o of overlays){
  let el=overlayEls.get(o);
  if(!el){el=element('div','ve-ov');const img=document.createElement('img');img.alt='';img.onload=draw;show(img,`/editor/assets/${o.asset_id}`);el.append(img,element('div','ve-corner'));el.onpointerdown=e=>stageDrag(e,'overlay',o,e.target.classList.contains('ve-corner'));$('ve-overlay-layer').append(el);overlayEls.set(o,el)}
  const img=el.firstChild,nw=img.naturalWidth||o.width,nh=img.naturalHeight||o.height,r=Math.min(o.width/nw,o.height/nh);
  Object.assign(el.style,{left:o.x*scale+'px',top:o.y*scale+'px',width:nw*r*scale+'px',height:nh*r*scale+'px'});
  el.hidden=!(time>=o.start&&time<o.end);el.classList.toggle('ve-picked',selected?.item===o);el.lastChild.hidden=selected?.item!==o;
 }
 // Text: the export's drawtext with an 8px box border, at x,y.
 for(const [t,el] of textEls)if(!texts.includes(t)){el.remove();textEls.delete(t)}
 for(const t of texts){
  let el=textEls.get(t);
  if(!el){el=element('div','ve-text');el.onpointerdown=e=>stageDrag(e,'text',t,false);$('ve-text-layer').append(el);textEls.set(t,el)}
  el.textContent=t.text;
  Object.assign(el.style,{left:(t.x-8)*scale+'px',top:(t.y-8)*scale+'px',padding:8*scale+'px',fontSize:t.size*scale+'px',color:t.color,fontFamily:`"${t.font||'Arial'}"`,lineHeight:LINE[t.font]||1.118});
  el.hidden=!(time>=t.start&&time<t.end);el.classList.toggle('ve-picked',selected?.item===t);
 }
 const fadeIn=Number($('editor-fade-in').value)||0,fadeOut=Number($('editor-fade-out').value)||0;
 $('ve-fade').style.opacity=T?Math.max(fadeIn&&time<fadeIn?1-time/fadeIn:0,fadeOut&&time>T-fadeOut?(time-(T-fadeOut))/fadeOut:0):0;
 $('ve-time').textContent=`${fmt(time)} / ${fmt(T)}`;
 const head=$('ve-content').querySelector('.ve-playhead');if(head)head.style.left=time*pps+'px';
}
function tick(){
 if(playing){time=(performance.now()-clock)/1000;if(time>=total()){time=total();pause()}draw();keepPlayheadVisible()}
 requestAnimationFrame(tick);
}
function play(){if(!segments.length)return;if(time>=total()-.05)time=0;audioContext?.resume();playing=true;clock=performance.now()-time*1000;$('ve-play').textContent='❚❚ Pause'}
function pause(){playing=false;$('ve-play').textContent='▶ Play';draw()}
function seek(t){time=clamp(t,0,total());if(playing)clock=performance.now()-time*1000;draw()}
function keepPlayheadVisible(){const box=$('ve-scroll'),x=time*pps;if(x<box.scrollLeft||x>box.scrollLeft+box.clientWidth-40)box.scrollLeft=x-40}
function stageDrag(e,type,item,resize){
 e.preventDefault();e.stopPropagation();select(type,item);paintTimeline();
 const [W,H]=canvas(),start={x:e.clientX,y:e.clientY,ox:item.x,oy:item.y,w:item.width,h:item.height};
 const move=ev=>{const dx=(ev.clientX-start.x)/scale,dy=(ev.clientY-start.y)/scale;
  if(resize){const k=Math.max(16/start.w,(start.w+dx)/start.w);item.width=Math.round(clamp(start.w*k,16,1280));item.height=Math.round(clamp(start.h*k,16,1280))}
  else{item.x=Math.round(clamp(start.ox+dx,0,W-1));item.y=Math.round(clamp(start.oy+dy,0,H-1))}
  draw()};
 const up=()=>{removeEventListener('pointermove',move);removeEventListener('pointerup',up);paintInspector();changed()};
 addEventListener('pointermove',move);addEventListener('pointerup',up);
}

// ---------- timeline ----------
function select(type,item){selected=item?{type,item}:null;paintInspector()}
function rowOf(type,item){return type==='segment'?'video':type==='track'?item.role:type}
function paintTimeline(){
 const content=$('ve-content'),labels=$('ve-labels'),T=total(),width=Math.max(T+6,20)*pps;
 const scroll=$('ve-scroll').scrollLeft;
 content.replaceChildren();labels.replaceChildren();content.style.width=width+'px';
 labels.append(Object.assign(element('div','','Time'),{style:'--h:26px'}));
 const ruler=element('div','ve-ruler');const step=[.5,1,2,5,10,15,30,60,120].find(s=>s*pps>=60)||300;
 for(let t=0;t<=width/pps;t+=step){const tickEl=element('span','',fmt(t).replace(/\.0$/,''));tickEl.style.left=t*pps+'px';ruler.append(tickEl)}
 ruler.onpointerdown=scrub;content.append(ruler);
 for(const [key,label,height] of ROWS){
  labels.append(Object.assign(element('div','',label),{style:`--h:${height}px`}));
  const row=element('div','ve-row');row.style.setProperty('--h',height+'px');row.dataset.row=key;
  row.onpointerdown=e=>{if(e.target===row){select(null);paintTimeline();draw();scrub(e)}};
  content.append(row);
  if(key==='video'){let offset=0;for(const s of segments){row.append(clipBlock(s,offset,height));offset+=s.end-s.start}}
  else if(key==='text')texts.forEach(t=>row.append(block('text',t,t.start,t.end,t.text)));
  else if(key==='overlay')overlays.forEach(o=>row.append(block('overlay',o,o.start,o.end,asset(o.asset_id)?.name||'Image')));
  else tracks.filter(t=>t.role===key).forEach(t=>row.append(block('track',t,t.start,t.start+t.duration,(t.loop?'⟲ ':'')+(asset(t.asset_id)?.name||'Audio'),'ve-kind-'+key)));
 }
 const head=element('div','ve-playhead');head.style.left=time*pps+'px';content.append(head);
 $('ve-scroll').scrollLeft=scroll;
}
function clipBlock(s,offset,height){
 const a=asset(s.asset_id)||{},el=block('segment',s,offset,offset+s.end-s.start,a.name||'Missing media');
 const strip=element('div','ve-strip'),px=(s.end-s.start)*pps,tall=height-12,tileW=Math.max(24,Math.round(tall*((a.width&&a.height)?a.width/a.height:16/9)));
 const step=Math.max(.5,Math.round(tileW/pps*2)/2);
 for(let i=0;i*tileW<px&&i<200;i++){
  const img=document.createElement('img');img.alt='';img.style.width=tileW+'px';
  if(a.kind==='image')show(img,`/editor/assets/${a.id}`);
  else{const t=Math.min(s.end-.05,s.start+(i+.5)*tileW/pps);show(img,`/editor/assets/${a.id}/frame?t=${(Math.round(t/step)*step).toFixed(1)}&h=72`)}
  strip.append(img);
 }
 el.prepend(strip);return el;
}
function block(type,item,start,end,label,kind){
 const el=element('div','ve-item '+(kind||'ve-kind-'+type));
 el.style.left=start*pps+'px';el.style.width=Math.max(10,(end-start)*pps)+'px';
 el.classList.toggle('ve-sel',selected?.item===item);el.title=label;
 el.append(element('span','ve-name',label),element('div','ve-h l'),element('div','ve-h r'));
 el.onpointerdown=e=>startDrag(e,type,item,e.target.classList.contains('l')?'left':e.target.classList.contains('r')?'right':'move',el);
 return el;
}
function scrub(e){
 e.preventDefault();const rect=$('ve-content').getBoundingClientRect();
 const at=ev=>seek((ev.clientX-rect.left)/pps);at(e);
 const up=()=>{removeEventListener('pointermove',at);removeEventListener('pointerup',up)};
 addEventListener('pointermove',at);addEventListener('pointerup',up);
}
function startDrag(e,type,item,mode,el){
 e.preventDefault();e.stopPropagation();
 drag={type,item,mode,el,x:e.clientX,moved:false,orig:structuredClone(item),index:segments.indexOf(item)};
 addEventListener('pointermove',onDrag);addEventListener('pointerup',endDrag);
}
function onDrag(e){
 const d=drag,dt=(e.clientX-d.x)/pps;if(Math.abs(e.clientX-d.x)>3)d.moved=true;if(!d.moved)return;
 const o=d.orig,item=d.item,T=total(),a=asset(item.asset_id);
 if(d.type==='segment'){
  if(d.mode==='move'){  // reorder: follow the pointer, show where it will land
   d.el.style.transform=`translateX(${e.clientX-d.x}px)`;d.el.style.opacity=.75;d.el.style.zIndex=3;
   const centre=offsetOf(item)+dt+(item.end-item.start)/2;let landing=0,place=0;
   for(const s of segments){if(s===item)continue;const len=s.end-s.start;if(landing+len/2<centre){landing+=len;place++}else break}
   d.target=place;let marker=$('ve-content').querySelector('.ve-drop');if(!marker){marker=element('div','ve-drop');$('ve-content').append(marker)}marker.style.left=landing*pps+'px';
   return;
  }
  if(a?.kind==='image'){item.end=round(clamp(o.end+(d.mode==='right'?dt:-dt),MIN,600))}  // stills: either edge sets how long they show
  else if(d.mode==='right')item.end=round(clamp(o.end+dt,item.start+MIN,a?.duration??o.end));
  else item.start=round(clamp(o.start+dt,0,item.end-MIN));
 }else{
  const [s0,e0]=d.type==='track'?[o.start,o.start+o.duration]:[o.start,o.end];
  let s1=s0,e1=e0;
  if(d.mode==='move'){const len=e0-s0;s1=clamp(s0+dt,0,Math.max(0,T-len));e1=s1+len}
  else if(d.mode==='left')s1=clamp(s0+dt,0,e0-MIN);
  else{e1=clamp(e0+dt,s0+MIN,T);if(d.type==='track'&&!item.loop)e1=Math.min(e1,s0+(a?.duration??e1))}
  item.start=round(s1);if(d.type==='track')item.duration=round(e1-s1);else item.end=round(e1);
 }
 paintTimeline();if(d.type!=='segment'||d.mode!=='move')draw();
}
function endDrag(){
 removeEventListener('pointermove',onDrag);removeEventListener('pointerup',endDrag);
 const d=drag;drag=null;
 if(d.type==='segment'&&d.mode==='move'&&d.moved&&d.target!==undefined){segments.splice(d.index,1);segments.splice(d.target,0,d.item)}
 select(d.type,d.item);update();
}
function split(){
 const at=segmentAt(time);if(!at)throw Error('Add a clip to the timeline first');
 const s=at.s,local=round(time-at.offset),length=s.end-s.start;
 if(local<MIN||length-local<MIN)throw Error('Move the playhead inside a clip (not at its edge) to split it');
 const kind=asset(s.asset_id)?.kind;
 const parts=kind==='image'?[{...s,end:local},{...s,end:round(length-local)}]:[{...s,end:round(s.start+local)},{...s,start:round(s.start+local)}];
 segments.splice(at.index,1,...parts);select('segment',parts[1]);update();
}
function remove(){
 if(!selected)throw Error('Click a clip, text, overlay or audio item first');
 const list={segment:segments,track:tracks,text:texts,overlay:overlays}[selected.type];
 list.splice(list.indexOf(selected.item),1);select(null);update();
}

// ---------- settings panel ----------
function paintInspector(){
 const box=$('ve-inspector');box.replaceChildren();
 if(!selected){box.append(element('h3','','Settings'),element('p','','Click a clip, text, overlay or audio item on the timeline (or text and images on the preview) to change it here.'),
  element('p','','Drag clip edges to trim, drag clips to reorder, drag the red playhead to scrub. Keys: Space plays, S splits, Delete removes.'));return}
 const {type,item}=selected,a=asset(item.asset_id);
 const title={segment:a?.kind==='image'?'Image clip':'Video clip',track:item.role==='music'?'Music':'Sound effect',text:'Text',overlay:'Image overlay'}[type];
 box.append(element('h3','',title));if(a)box.append(element('p','',a.name));
 const control=(parent,label,input,apply)=>{const l=element('label','',label);l.append(document.createElement('br'),input);input.oninput=()=>{apply(input);fit();paintTimeline();draw();changed()};parent.append(l);return input};
 const number=(parent,label,key,step=.01)=>control(parent,label,Object.assign(document.createElement('input'),{type:'number',value:item[key],step,min:0}),i=>{if(i.value!=='')item[key]=Number(i.value)});
 const volume=key=>{const out=element('span','',` ${Math.round(item[key]*100)}%`);const l=control(box,'Volume',Object.assign(document.createElement('input'),{type:'range',min:0,max:2,step:.05,value:item[key]}),i=>{item[key]=Number(i.value);out.textContent=` ${Math.round(item[key]*100)}%`});l.parentElement.firstChild.after(out)};
 const check=(label,key)=>{const l=element('label');const c=Object.assign(document.createElement('input'),{type:'checkbox',checked:item[key]});c.onchange=()=>{item[key]=c.checked;fit();paintTimeline();draw()};l.append(c,' '+label);box.append(l)};
 const exact=element('details');exact.append(element('summary','','Exact numbers (seconds / pixels)'));
 if(type==='segment'){
  if(a?.kind==='video'){volume('volume');check('Mute this clip','mute');number(exact,'Start in source','start');number(exact,'End in source','end')}
  else number(exact,'Show for (seconds)','end');
 }else if(type==='track'){volume('volume');check('Loop until the end of its bar','loop');number(exact,'Starts at','start');number(exact,'Length','duration')}
 else if(type==='text'){
  const area=Object.assign(document.createElement('textarea'),{rows:3,maxLength:500,value:item.text});control(box,'Text',area,i=>{item.text=i.value||' '});
  const font=document.createElement('select');for(const f of FONTS)font.append(new Option(f,f));font.value=item.font||'Arial';control(box,'Font',font,i=>item.font=i.value);
  control(box,'Size',Object.assign(document.createElement('input'),{type:'range',min:12,max:150,value:item.size}),i=>item.size=Number(i.value));
  control(box,'Color',Object.assign(document.createElement('input'),{type:'color',value:item.color}),i=>item.color=i.value);
  box.append(element('p','','Drag the text on the preview to move it.'));
  for(const [label,key,step] of [['Starts at','start',.01],['Ends at','end',.01],['X','x',1],['Y','y',1]])number(exact,label,key,step);
 }else{
  box.append(element('p','','Drag the image on the preview to move it; drag its yellow corner to resize.'));
  for(const [label,key,step] of [['Starts at','start',.01],['Ends at','end',.01],['X','x',1],['Y','y',1],['Width','width',1],['Height','height',1]])number(exact,label,key,step);
 }
 box.append(exact);
 const actions=element('div','actions');
 if(type==='segment'){const b=element('button','','✂ Split at playhead');b.type='button';b.onclick=()=>{try{fail('');split()}catch(e){fail(e)}};actions.append(b)}
 const del=element('button','','🗑 Delete');del.type='button';del.onclick=()=>{try{remove()}catch(e){fail(e)}};actions.append(del);box.append(actions);
}

// ---------- import, export, save ----------
function timeline(){return {segments:structuredClone(segments),tracks:structuredClone(tracks),overlays:structuredClone(overlays),texts:structuredClone(texts),ratio:$('editor-ratio').value,original_volume:Number($('editor-original-volume').value),mute_original:$('editor-mute').checked,fade_in:Number($('editor-fade-in').value),fade_out:Number($('editor-fade-out').value)}}
$('editor-add-link').onclick=async()=>{const link=$('editor-link').value.trim();if(!link)return;const button=$('editor-add-link');button.disabled=true;try{fail('');$('editor-import-status').textContent='Downloading the video from the link…';addAsset(await api('/editor/assets/url',post({link})));$('editor-link').value='';$('editor-import-status').textContent='Video added to your media below. Click "+ Timeline" to use it.'}catch(e){$('editor-import-status').textContent='';fail(e)}finally{button.disabled=false}};
$('editor-upload').onchange=async e=>{try{fail('');for(const file of e.target.files){$('editor-import-status').textContent='Importing '+file.name+'…';const form=new FormData();form.append('file',file);addAsset(await api('/editor/assets',{method:'POST',body:form}))}$('editor-import-status').textContent='Media imported. Use the buttons under each file to add it.'}catch(e){$('editor-import-status').textContent='';fail(e)}finally{e.target.value=''}};
async function render(){if(rendering)return;pause();rendering=true;$('editor-render').disabled=true;fail('');try{const j=await api('/editor/jobs',post(timeline()));let result;do{await new Promise(r=>setTimeout(r,700));result=await api('/editor/jobs/'+j.id);$('editor-progress').value=result.progress;$('editor-status').textContent=result.stage}while(['queued','running'].includes(result.status));if(result.status==='failed')throw Error(result.error);$('editor-preview').src=result.url;$('editor-download').href=result.download_url;$('editor-result').hidden=false;$('editor-status').textContent='Export ready. Watch or download it below.';return result}catch(e){fail(e);throw e}finally{rendering=false;$('editor-render').disabled=false}}
$('editor-render').onclick=()=>render().catch(()=>{});
$('editor-save').onclick=()=>{try{localStorage.setItem('clipforge-local-timeline',JSON.stringify({library,timeline:timeline()}));$('editor-status').textContent='Timeline saved in this browser. Media stays in the local workspace.'}catch(e){fail(e)}};
function restore(data){library=data.library;const t=data.timeline;segments=t.segments;tracks=t.tracks;overlays=t.overlays;texts=t.texts.map(x=>({font:'Arial',...x}));$('editor-ratio').value=t.ratio;$('editor-original-volume').value=t.original_volume;$('editor-mute').checked=t.mute_original;$('editor-fade-in').value=t.fade_in;$('editor-fade-out').value=t.fade_out;select(null);paintBin();layoutStage();update()}
$('editor-load').onclick=()=>{try{const value=localStorage.getItem('clipforge-local-timeline');if(!value)throw Error('No saved timeline');restore(JSON.parse(value))}catch(e){fail(e)}};
async function incoming(){const item=sessionStorage.getItem('clipforge-editor-import');if(!item)return;sessionStorage.removeItem('clipforge-editor-import');try{const a=await api('/editor/import',post(JSON.parse(item)));addAsset(a);append(a);$('editor-import-status').textContent='Video received from ClipForge and added to the timeline.';$('video-editor').scrollIntoView({behavior:'smooth'})}catch(e){fail(e)}}
window.addEventListener('message',e=>{if(e.origin===location.origin&&e.data?.type==='editor-import-ready')incoming()});

// ---------- controls ----------
const guarded=fn=>()=>{try{fail('');fn()}catch(e){fail(e)}};
$('ve-play').onclick=()=>playing?pause():play();
$('ve-split').onclick=guarded(split);$('ve-delete').onclick=guarded(remove);$('ve-add-text').onclick=guarded(addText);
$('ve-zoom').oninput=()=>{pps=Number($('ve-zoom').value);paintTimeline();draw()};
$('editor-ratio').onchange=()=>{layoutStage();update()};
for(const id of ['editor-original-volume','editor-mute','editor-fade-in','editor-fade-out'])$(id).addEventListener('input',draw);
document.addEventListener('keydown',e=>{if(typing(e)||!segments.length)return;
 if(e.code==='Space'){e.preventDefault();playing?pause():play()}
 else if(e.key==='s'||e.key==='S')guarded(split)();
 else if((e.key==='Delete'||e.key==='Backspace')&&selected){e.preventDefault();guarded(remove)()}});
addEventListener('resize',()=>{layoutStage();draw()});
window.clipforgeEditor={getTimeline:timeline,getLibrary:()=>structuredClone(library),addAsset,append,restore,render,importPending:incoming};
paintBin();layoutStage();update();requestAnimationFrame(tick);incoming();
export {addAsset,append};
