// Session tokens stay in memory and only travel to the configured ClipForge API.
(()=>{
 const configured=new URL(location.href).searchParams.get('api');
 if(!configured)return;
 let base;try{base=new URL(configured);if(!['http:','https:'].includes(base.protocol))return}catch{return}
 const api=base.href.replace(/\/$/,'');
 const routes={'/auto':'auto','/transcript':'transcript','/original':'editor'};
 const loopback=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
 let token=null,offline=false,resolveReady;
 const ready=new Promise(resolve=>resolveReady=resolve);
 window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==parent||event.data?.type!=='clipforge-studio-auth'||event.data.api!==api)return;
  token=typeof event.data.accessToken==='string'?event.data.accessToken:null;
  offline=loopback&&event.data.offline===true;
  if(token||offline)resolveReady();
 });
 if(parent!==window)parent.postMessage({type:'clipforge-studio-auth-request',api},location.origin);
 async function auth(){
  let timer;
  try{await Promise.race([ready,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('Sign in to use Studio processing.')),15000))])}finally{clearTimeout(timer)}
  if(!token&&!offline)throw Error('Your session ended. Sign in again.');
  return token;
 }
 function mapped(value){
  if(typeof value!=='string')return value;
  if(value.startsWith(location.origin+'/'))value=value.slice(location.origin.length);
  return value.startsWith('/')&&!value.startsWith('/studios/')&&!routes[value]?api+value:value;
 }
 const isApi=url=>typeof url==='string'&&(url===api||url.startsWith(api+'/'));
 const nativeFetch=window.fetch.bind(window);
 window.fetch=async(input,options={})=>{
  const target=mapped(typeof input==='string'?input:input.url);
  if(!isApi(target))return nativeFetch(input,options);
  const accessToken=await auth();
  const headers=new Headers(options.headers||(input instanceof Request?input.headers:undefined));
  if(accessToken)headers.set('Authorization','Bearer '+accessToken);
  return nativeFetch(typeof input==='string'?target:new Request(target,input),{...options,headers,credentials:'omit'});
 };
 const open=XMLHttpRequest.prototype.open,send=XMLHttpRequest.prototype.send;
 const xhrTargets=new WeakMap();
 XMLHttpRequest.prototype.open=function(method,url,...rest){const target=mapped(url);xhrTargets.set(this,target);return open.call(this,method,target,...rest)};
 XMLHttpRequest.prototype.send=function(body){if(!isApi(xhrTargets.get(this)))return send.call(this,body);auth().then(value=>{if(value)this.setRequestHeader('Authorization','Bearer '+value);send.call(this,body)}).catch(()=>this.dispatchEvent(new Event('error')))};
 const sources=new WeakMap(),pending=new WeakMap(),ownedURLs=new WeakMap(),allURLs=new Set();
 function mediaSource(element,value,native){
  const target=mapped(value);pending.get(element)?.abort();
  const old=ownedURLs.get(element);if(old){URL.revokeObjectURL(old);allURLs.delete(old);ownedURLs.delete(element)}
  if(!isApi(target)){sources.delete(element);return native.call(element,value)}
  sources.set(element,target);const controller=new AbortController();pending.set(element,controller);
  window.fetch(target,{signal:controller.signal}).then(async response=>{if(!response.ok)throw Error('Protected media unavailable');const blob=await response.blob();if(controller.signal.aborted)return;const url=URL.createObjectURL(blob);ownedURLs.set(element,url);allURLs.add(url);native.call(element,url)}).catch(error=>{if(error.name!=='AbortError'){element.dataset.mediaError='Protected media unavailable. Check your session and Studio backend.';element.dispatchEvent(new Event('error'))}});
 }
 for(const type of [HTMLMediaElement,HTMLImageElement,HTMLSourceElement]){
  const descriptor=Object.getOwnPropertyDescriptor(type.prototype,'src');
  if(descriptor?.set)Object.defineProperty(type.prototype,'src',{...descriptor,set(value){mediaSource(this,value,descriptor.set)}});
 }
 const poster=Object.getOwnPropertyDescriptor(HTMLVideoElement.prototype,'poster'),posters=new WeakMap();
 if(poster?.set)Object.defineProperty(HTMLVideoElement.prototype,'poster',{...poster,set(value){const target=mapped(value),old=posters.get(this);if(old){URL.revokeObjectURL(old);allURLs.delete(old)}if(!isApi(target))return poster.set.call(this,value);window.fetch(target).then(async r=>{if(!r.ok)return;const url=URL.createObjectURL(await r.blob());posters.set(this,url);allURLs.add(url);poster.set.call(this,url)}).catch(()=>{})}});
 const href=Object.getOwnPropertyDescriptor(HTMLAnchorElement.prototype,'href');
 if(href?.set)Object.defineProperty(HTMLAnchorElement.prototype,'href',{...href,set(value){href.set.call(this,mapped(value))}});
 const set=Element.prototype.setAttribute;
 Element.prototype.setAttribute=function(name,value){if(['VIDEO','AUDIO','IMG','SOURCE'].includes(this.tagName)&&name==='src'){this.src=value;return}if(this.tagName==='A'&&name==='href')value=mapped(value);return set.call(this,name,value)};
 document.addEventListener('click',async event=>{
  const a=event.target.closest('a');if(!a)return;const path=a.getAttribute('href');
  if(routes[path]){event.preventDefault();top.postMessage({type:'clipforge-navigate',section:routes[path]},location.origin);return}
  const target=mapped(path);if(!isApi(target))return;event.preventDefault();
  try{const response=await window.fetch(target);if(!response.ok)throw Error('Protected download unavailable');const blob=await response.blob(),url=URL.createObjectURL(blob),download=document.createElement('a');let name=target.split('?')[0].split('/').pop()||'clipforge-download';if(!name.includes('.'))name=blob.type.includes('zip')?'clipforge-clips.zip':name+(blob.type.includes('video')?'.mp4':blob.type.includes('image')?'.jpg':'.bin');download.href=url;download.download=a.download||name;download.click();setTimeout(()=>URL.revokeObjectURL(url),10000)}catch{alert('Download unavailable. Check your session and Studio backend.')}
 },true);
 window.addEventListener('pagehide',()=>{for(const url of allURLs)URL.revokeObjectURL(url);allURLs.clear()});
 window.studioBridge={localPath:value=>typeof value==='string'&&value.startsWith(api+'/')?value.slice(api.length):value,sourceURL:element=>sources.get(element),api};
})();
