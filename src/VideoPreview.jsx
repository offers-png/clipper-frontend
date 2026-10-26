import {useEffect,useRef} from 'react';

export default function VideoPreview({src,onClose}) {
  const dialog=useRef(null),video=useRef(null);
  useEffect(()=>{
    const opener=document.activeElement,previous=document.body.style.overflow;
    dialog.current.showModal();document.body.style.overflow='hidden';
    return()=>{video.current?.pause();dialog.current?.close();document.body.style.overflow=previous;opener?.focus?.({preventScroll:true});};
  },[]);
  return <dialog ref={dialog} className="cf-preview-dialog" aria-labelledby="cf-preview-title"
    onCancel={event=>{event.preventDefault();onClose();}}
    onClick={event=>{if(event.target===event.currentTarget)onClose();}}>
    <div className="cf-preview-panel"><header><strong id="cf-preview-title">Video preview</strong>
      <button type="button" onClick={onClose} aria-label="Close video preview" autoFocus>×</button></header>
      <video ref={video} src={src} controls playsInline preload="metadata"/>
    </div>
  </dialog>;
}
