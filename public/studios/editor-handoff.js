// Additive output actions; source generation and selection logic remain unchanged.
const sent=new WeakSet();
function scan(){for(const video of document.querySelectorAll('video')){
 if(sent.has(video))continue;
 const source=window.studioBridge?.sourceURL(video)||video.getAttribute('src')||'';
 const raw=window.studioBridge?.localPath(source)||source;
 if(!/^\/(media\/(previews|exports)|studio\/files)\/.+\.mp4(?:\?.*)?$/.test(raw))continue;
 sent.add(video);const button=document.createElement('button');button.textContent='Send to Video Editor';button.type='button';button.style='margin:8px 5px;padding:9px 12px';
 button.onclick=()=>{if(window.clipforgeEditor){sessionStorage.setItem('clipforge-editor-import',JSON.stringify({url:raw}));window.clipforgeEditor.importPending()}else window.top.postMessage({type:'clipforge-send-editor',url:raw},location.origin)};
 video.insertAdjacentElement('afterend',button);
}}
new MutationObserver(scan).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});scan();
