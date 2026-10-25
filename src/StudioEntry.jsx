import React, { Suspense, lazy } from 'react';
const Original=lazy(()=>import('./App.jsx'));
const Studios=lazy(()=>import('./StudioWorkspace.jsx'));
const GuardedStudios=lazy(()=>import('./StudioGuard.jsx'));
export default function StudioEntry(){
  const enabled=import.meta.env.VITE_ENABLE_STUDIOS==='true';
  const workspace=enabled&&location.pathname.startsWith('/workspace');
  const offline=import.meta.env.VITE_STUDIOS_LOCAL_ONLY==='true';
  return <Suspense fallback={<p>Opening ClipForge…</p>}>
    {!workspace&&enabled&&<a href="/workspace/auto" style={{display:'block',padding:12,background:'#163528',color:'#fff'}}>Open ClipForge Studios · Auto clips, transcripts, thumbnails and video editor</a>}
    {workspace?(offline?<Studios/>:<GuardedStudios/>):<Original/>}
  </Suspense>;
}
