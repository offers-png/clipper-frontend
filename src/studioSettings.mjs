// Keep the same existing backend fallback as Original ClipForge.
export const DEFAULT_BACKEND='https://clipper-api-final-1.onrender.com';
export const isLoopback=host=>['localhost','127.0.0.1','[::1]','::1'].includes(host);
export function studioSettings(env={},host=''){
  const original=(env.VITE_API_BASE||DEFAULT_BACKEND).replace(/\/+$/,'');
  let base=(env.VITE_STUDIOS_API_BASE||original).replace(/\/+$/,'');
  if(!isLoopback(host)){
    try{if(isLoopback(new URL(base).hostname))base=original}catch{base=original}
  }
  if(!base.endsWith('/studios-api'))base+='/studios-api';
  return {api:base,offline:env.VITE_STUDIOS_LOCAL_ONLY==='true'&&isLoopback(host)};
}
