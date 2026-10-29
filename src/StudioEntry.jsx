import React, { Suspense, lazy } from 'react';
import StudioNav from './StudioNav.jsx';
import {studioSettings} from './studioSettings.mjs';
import {supabaseConfigError} from './supabaseConfig.mjs';
import './studios.css';
const Original=lazy(()=>import('./App.jsx'));
const Studios=lazy(()=>import('./StudioWorkspace.jsx'));
const GuardedStudios=lazy(()=>import('./StudioGuard.jsx'));
export default function StudioEntry(){
  // Discoverability is not a build-time feature flag. API authorization is server-side.
  const workspace=/^\/workspace(?:\/|$)/.test(location.pathname);
  const {offline}=studioSettings(import.meta.env,location.hostname);
  // Offline loopback Studios never sign in; everything else needs Supabase.
  const configError=workspace&&offline?null:supabaseConfigError(import.meta.env);
  if(configError)return <div style={{minHeight:'100vh',background:'#f8fafc',color:'#0f172a',fontFamily:'system-ui,sans-serif'}}>
    <main role="alert" style={{maxWidth:560,margin:'0 auto',padding:'15vh 16px 0'}}>
      <h1 style={{fontSize:22,fontWeight:700,marginBottom:8}}>ClipForge isn't configured</h1>
      <p style={{lineHeight:1.5}}>{configError}</p>
    </main>
  </div>;
  return <Suspense fallback={<p>Opening ClipForge…</p>}>
    {workspace?(offline?<Studios/>:<GuardedStudios/>):<div className="clipforge-original-shell"><StudioNav/><Original/></div>}
  </Suspense>;
}
