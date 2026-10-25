import React,{useEffect,useRef,useState} from 'react';
import './studios.css';
const api=(import.meta.env.VITE_STUDIOS_API_BASE||'').replace(/\/$/,'');
const views={editor:'legacy.html',auto:'studio.html',transcript:'transcript.html',thumbnails:'thumbnails.html'};
const section=()=>location.pathname.split('/')[2] in views?location.pathname.split('/')[2]:'auto';
export default function StudioWorkspace(){
  const [active,setActive]=useState(section),[visited,setVisited]=useState(()=>new Set([section()]));
  const refs=useRef({});
  const navigate=(key)=>{if(!views[key])return;setVisited(prev=>new Set([...prev,key]));setActive(key);history.pushState({},'',`/workspace/${key}`)};
  useEffect(()=>{
    const receive=e=>{if(e.origin!==location.origin||!Object.values(refs.current).some(f=>f?.contentWindow===e.source))return;
      if(e.data?.type==='clipforge-send-editor'&&typeof e.data.url==='string'){
        sessionStorage.setItem('clipforge-editor-import',JSON.stringify({url:e.data.url}));navigate('editor');
        setTimeout(()=>refs.current.editor?.contentWindow.postMessage({type:'editor-import-ready'},location.origin),100);
      }else if(e.data?.type==='clipforge-navigate')navigate(e.data.section);
    };
    const back=()=>{setVisited(prev=>new Set([...prev,section()]));setActive(section())};
    window.addEventListener('message',receive);window.addEventListener('popstate',back);
    return()=>{window.removeEventListener('message',receive);window.removeEventListener('popstate',back)};
  },[]);
  useEffect(()=>{for(const [key,f] of Object.entries(refs.current)){if(key!==active)try{f?.contentDocument?.querySelectorAll('video,audio').forEach(v=>v.pause())}catch{}}},[active]);
  return <div className="studio-workspace"><header><strong>CF · ClipForge Unified Workspace</strong><span>FEATURE BRANCH · NO PRODUCTION DEPLOYMENT</span></header>
    <nav aria-label="ClipForge sections"><a href="/clipper">Original ClipForge</a>{[['auto','Auto Clip Studio'],['transcript','Transcript Clip Studio'],['thumbnails','Thumbnail Studio']].map(([key,label])=><a key={key} href={`/workspace/${key}`} aria-current={active===key?'page':undefined} onClick={e=>{if(!e.ctrlKey&&!e.metaKey){e.preventDefault();navigate(key)}}}>{label}</a>)}<button onClick={()=>navigate('editor')} aria-pressed={active==='editor'}>Video Editor / Image-to-Video</button></nav>
    {!api?<p role="alert">Studio API is not configured. Set the public VITE_STUDIOS_API_BASE URL for your local backend; no production URL is guessed.</p>:<main>{[...visited].map(key=><iframe key={key} hidden={active!==key} ref={el=>refs.current[key]=el} title={key==='editor'?'Video Editing Workspace':key+' Studio'} src={`/studios/${views[key]}?api=${encodeURIComponent(api)}`} onLoad={()=>refs.current[key]?.contentWindow.postMessage({type:'editor-import-ready'},location.origin)}/>)}</main>}
  </div>;
}
