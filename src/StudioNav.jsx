import React,{useEffect,useRef} from 'react';
const links=[['original','Original ClipForge','/clipper'],['auto','Auto Clip Studio','/workspace/auto'],['transcript','Transcript Clip Studio','/workspace/transcript'],['thumbnails','Thumbnail Studio','/workspace/thumbnails'],['editor','Video Editor','/workspace/editor']];
export default function StudioNav({active='original',navigate}){
 const ref=useRef(null);
 useEffect(()=>{const update=()=>document.documentElement.style.setProperty('--clipforge-studio-nav-height',ref.current?.getBoundingClientRect().height+'px');const observer=new ResizeObserver(update);observer.observe(ref.current);update();return()=>observer.disconnect()},[]);
 return <nav ref={ref} className="clipforge-studio-nav" aria-label="ClipForge workspaces">{links.map(([key,label,path])=><a key={key} href={path} aria-current={active===key?'page':undefined} onClick={e=>{if(navigate&&key!=='original'&&!e.ctrlKey&&!e.metaKey){e.preventDefault();navigate(key)}}}>{label}</a>)}</nav>;
}
