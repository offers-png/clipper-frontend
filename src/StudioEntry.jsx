import React, { Suspense, lazy } from 'react';
import StudioNav from './StudioNav.jsx';
import {studioSettings} from './studioSettings.mjs';
import './studios.css';
const Original=lazy(()=>import('./App.jsx'));
const Studios=lazy(()=>import('./StudioWorkspace.jsx'));
const GuardedStudios=lazy(()=>import('./StudioGuard.jsx'));
export default function StudioEntry(){
  // Discoverability is not a build-time feature flag. API authorization is server-side.
  const workspace=/^\/workspace(?:\/|$)/.test(location.pathname);
  const {offline}=studioSettings(import.meta.env,location.hostname);
  return <Suspense fallback={<p>Opening ClipForge…</p>}>
    {workspace?(offline?<Studios/>:<GuardedStudios/>):<div className="clipforge-original-shell"><StudioNav/><Original/></div>}
  </Suspense>;
}
