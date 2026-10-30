import React,{useEffect,useRef,useState} from 'react';
import './studios.css';
import StudioNav from './StudioNav.jsx';
import {studioSettings} from './studioSettings.mjs';
const settings=studioSettings(import.meta.env,location.hostname),api=settings.api;
const frameKey=key=>key==='generator'?'editor':key;
const views={generator:'legacy.html',editor:'legacy.html',auto:'studio.html',transcript:'transcript.html',thumbnails:'thumbnails.html'};
const section=()=>location.pathname.split('/')[2] in views?location.pathname.split('/')[2]:'auto';
export default function StudioWorkspace({accessToken=null}){
  const [active,setActive]=useState(section),[visited,setVisited]=useState(()=>new Set([frameKey(section())]));
  const refs=useRef({});
  const [backend,setBackend]=useState('checking');
  const [capabilities,setCapabilities]=useState(null);
  useEffect(()=>{if(active==='generator')setTimeout(()=>refs.current.editor?.contentWindow.postMessage({type:'clipforge-focus-generator'},location.origin),150)},[active]);
  const navigate=(key)=>{if(!views[key])return;setVisited(prev=>new Set([...prev,frameKey(key)]));setActive(key);history.pushState({},'',`/workspace/${key}`)};
  useEffect(()=>{
    const controller=new AbortController();
    fetch(api+'/health',{signal:controller.signal}).then(async r=>{const type=r.headers.get('content-type')||'';setBackend(r.ok&&type.includes('application/json')?'ready':r.status===404?'missing':'unavailable')}).catch(e=>{if(e.name!=='AbortError')setBackend('unavailable')});
    return()=>controller.abort();
  },[]);
  useEffect(()=>{
    if(backend!=='ready'||(!accessToken&&!settings.offline))return;
    const controller=new AbortController();
    fetch(api+'/studio/capabilities',{signal:controller.signal,headers:accessToken?{Authorization:'Bearer '+accessToken}:{}})
      .then(async response=>{if(response.ok)setCapabilities(await response.json());})
      .catch(()=>{});
    return()=>controller.abort();
  },[backend,accessToken]);
  const authenticateFrame=frame=>frame?.contentWindow.postMessage({type:'clipforge-studio-auth',api,accessToken,offline:settings.offline},location.origin);
  useEffect(()=>{Object.values(refs.current).forEach(authenticateFrame)},[accessToken]);
  useEffect(()=>{
    const receive=e=>{if(e.origin!==location.origin||!Object.values(refs.current).some(f=>f?.contentWindow===e.source))return;
      if(e.data?.type==='clipforge-studio-auth-request'&&e.data.api===api){authenticateFrame(Object.values(refs.current).find(f=>f?.contentWindow===e.source));return}
      if(e.data?.type==='clipforge-send-editor'&&typeof e.data.url==='string'){
        sessionStorage.setItem('clipforge-editor-import',JSON.stringify({url:e.data.url}));navigate('editor');
        setTimeout(()=>refs.current.editor?.contentWindow.postMessage({type:'editor-import-ready'},location.origin),100);
      }else if(e.data?.type==='clipforge-navigate')navigate(e.data.section);
    };
    const back=()=>{setVisited(prev=>new Set([...prev,frameKey(section())]));setActive(section())};
    window.addEventListener('message',receive);window.addEventListener('popstate',back);
    return()=>{window.removeEventListener('message',receive);window.removeEventListener('popstate',back)};
  },[accessToken]);
  useEffect(()=>{for(const [key,f] of Object.entries(refs.current)){if(key!==frameKey(active))try{f?.contentDocument?.querySelectorAll('video,audio').forEach(v=>v.pause())}catch{}}},[active]);
  return <div className="studio-workspace"><header><strong>CF · ClipForge Unified Workspace</strong><span>{settings.offline?'LOCAL DEVELOPMENT':'Your creative workspace'}</span></header>
    <StudioNav active={active} navigate={navigate}/>
    {backend==='missing'&&<p role="alert" className="studio-api-notice">Studio processing is not enabled on this server yet. Manual thumbnail editing remains available; uploads and rendering need the Studio backend.</p>}
    {backend==='unavailable'&&<p role="alert" className="studio-api-notice">The Studio backend could not be reached. Your original ClipForge tools are still available.</p>}
    <main>{[...visited].map(key=><iframe key={key} hidden={frameKey(active)!==key} ref={el=>refs.current[key]=el} title={key==='editor'?'Video Editing Workspace':key+' Studio'} src={`/studios/${views[key]}?api=${encodeURIComponent(api)}&v=phone-20261030-1`} onLoad={()=>{authenticateFrame(refs.current[key]);if(active==='generator')refs.current[key]?.contentWindow.postMessage({type:'clipforge-focus-generator'},location.origin);refs.current[key]?.contentWindow.postMessage({type:'editor-import-ready'},location.origin)}}/>)}</main>
  </div>;
}
