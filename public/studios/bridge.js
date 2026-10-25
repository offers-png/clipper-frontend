// Same-origin Studio views talk only to the explicitly configured API prefix.
(()=>{
 const configured=new URL(location.href).searchParams.get('api');
 if(!configured)return;
 let base;try{base=new URL(configured);if(!['http:','https:'].includes(base.protocol))return}catch{return}
 const api=base.href.replace(/\/$/,'');
 function localPath(value){return typeof value==='string'&&value.startsWith(api+'/')?value.slice(api.length):value}
 const routes={'/auto':'auto','/transcript':'transcript','/original':'editor'};
 function mapped(value){if(typeof value!=='string')return value;return value.startsWith('/')&&!value.startsWith('/studios/')&&!routes[value]?api+value:value}
 const nativeFetch=window.fetch.bind(window);
 window.fetch=(input,options)=>nativeFetch(typeof input==='string'?mapped(input):input,options);
 const open=XMLHttpRequest.prototype.open;
 XMLHttpRequest.prototype.open=function(method,url,...rest){return open.call(this,method,mapped(url),...rest)};
 for(const [type,property] of [[HTMLMediaElement,'src'],[HTMLImageElement,'src'],[HTMLSourceElement,'src'],[HTMLAnchorElement,'href']]){
  const descriptor=Object.getOwnPropertyDescriptor(type.prototype,property);
  if(descriptor?.set)Object.defineProperty(type.prototype,property,{...descriptor,set(value){descriptor.set.call(this,mapped(value))}});
 }
 const set=Element.prototype.setAttribute;
 Element.prototype.setAttribute=function(name,value){if(['VIDEO','AUDIO','IMG','SOURCE','A'].includes(this.tagName)&&['src','href'].includes(name))value=mapped(value);return set.call(this,name,value)};
 document.addEventListener('click',e=>{const a=e.target.closest('a');if(a&&routes[a.getAttribute('href')]){e.preventDefault();top.postMessage({type:'clipforge-navigate',section:routes[a.getAttribute('href')]},location.origin)}},true);
 window.studioBridge={localPath,api};
})();
