import React,{useEffect,useState} from 'react';
import ProtectedRoute from './ProtectedRoute.jsx';
import { BrowserRouter,Routes,Route } from 'react-router-dom';
import StudioWorkspace from './StudioWorkspace.jsx';
import {supabase} from './supabaseClient.js';
// Reuse the original guard without editing its authentication/session behavior.
export default function StudioGuard(){
 const [session,setSession]=useState(null);
 useEffect(()=>{let active=true;supabase.auth.getSession().then(({data})=>{if(active)setSession(data.session||null)});const {data}=supabase.auth.onAuthStateChange((_event,value)=>setSession(value||null));return()=>{active=false;data.subscription?.unsubscribe()}},[]);
 return <BrowserRouter><Routes><Route path="/workspace/*" element={<ProtectedRoute><StudioWorkspace key={session?.user?.id||'loading'} accessToken={session?.access_token||null}/></ProtectedRoute>}/><Route path="*" element={<ReturnToOriginal/>}/></Routes></BrowserRouter>;
}
function ReturnToOriginal(){useEffect(()=>{location.replace(location.pathname+location.search)},[]);return <p>Opening Original ClipForge…</p>}
