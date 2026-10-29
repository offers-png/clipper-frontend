import React, { Suspense, lazy, useEffect, useState } from 'react';
import StudioNav from './StudioNav.jsx';
import {studioSettings} from './studioSettings.mjs';
import {supabaseConfigError} from './supabaseConfig.mjs';
import {detectDevBypass, devBypassActive, loopbackHost, DEV_USER} from './devBypass.mjs';
import './studios.css';
const Original=lazy(()=>import('./App.jsx'));
const Studios=lazy(()=>import('./StudioWorkspace.jsx'));
const GuardedStudios=lazy(()=>import('./StudioGuard.jsx'));
export default function StudioEntry(){
  // Local test mode is decided before any code that creates the Supabase client loads.
  const [checked,setChecked]=useState(!loopbackHost(location.hostname));
  useEffect(()=>{if(!checked)detectDevBypass(import.meta.env.VITE_API_BASE,location.hostname).then(()=>setChecked(true))},[]);
  if(!checked)return <p>Opening ClipForge…</p>;
  // Discoverability is not a build-time feature flag. API authorization is server-side.
  const workspace=/^\/workspace(?:\/|$)/.test(location.pathname);
  const {offline}=studioSettings(import.meta.env,location.hostname);
  const bypass=devBypassActive();
  // Offline loopback Studios and local test mode never sign in; everything else needs Supabase.
  const configError=bypass||(workspace&&offline)?null:supabaseConfigError(import.meta.env);
  if(configError)return <div style={{minHeight:'100vh',background:'#f8fafc',color:'#0f172a',fontFamily:'system-ui,sans-serif'}}>
    <main role="alert" style={{maxWidth:560,margin:'0 auto',padding:'15vh 16px 0'}}>
      <h1 style={{fontSize:22,fontWeight:700,marginBottom:8}}>ClipForge isn't configured</h1>
      <p style={{lineHeight:1.5}}>{configError}</p>
    </main>
  </div>;
  return <>
    {bypass&&<div role="status" style={{position:'fixed',left:0,right:0,bottom:0,zIndex:1000,background:'#fef3c7',color:'#78350f',borderTop:'1px solid #f59e0b',padding:'6px 16px',fontSize:13,fontFamily:'system-ui,sans-serif',textAlign:'center'}}>
      Local test mode: signed in as {DEV_USER.email}. Sign-in is skipped on this computer only.
    </div>}
    <Suspense fallback={<p>Opening ClipForge…</p>}>
      {workspace?(offline?<Studios/>:<GuardedStudios/>):<div className="clipforge-original-shell"><StudioNav/><Original/></div>}
    </Suspense>
  </>;
}
