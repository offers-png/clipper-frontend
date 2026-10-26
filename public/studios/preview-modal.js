// Shared, local preview UI. Does not replace media, forms, timelines or auth.
(()=>{
  let dialog,player,source,opener;
  function close(){dialog?.close();}
  function open(video,button){
    if(!dialog){
      dialog=document.createElement('dialog');dialog.className='cf-preview-dialog';
      dialog.setAttribute('aria-label','Video preview');
      const panel=document.createElement('div');panel.className='cf-preview-panel';
      const head=document.createElement('header'),title=document.createElement('strong'),exit=document.createElement('button');
      title.textContent='Video preview';exit.textContent='×';exit.type='button';exit.setAttribute('aria-label','Close video preview');exit.onclick=close;
      head.append(title,exit);player=document.createElement('video');player.controls=true;player.playsInline=true;
      panel.append(head,player);dialog.append(panel);document.body.append(dialog);
      dialog.onclick=e=>{if(e.target===dialog)close();};
      dialog.addEventListener('close',()=>{if(source&&Number.isFinite(player.currentTime))source.currentTime=player.currentTime;player.pause();player.removeAttribute('src');player.load();opener?.focus({preventScroll:true});});
    }
    source=video;opener=button;source.pause();player.src=source.currentSrc||source.src;
    player.onloadedmetadata=()=>{player.currentTime=source.currentTime||0;};
    dialog.showModal();dialog.querySelector('button').focus();
  }
  const add=()=>document.querySelectorAll('video:not(.cf-preview-dialog video)').forEach(video=>{
    if(video.dataset.cfPreview)return;video.dataset.cfPreview='ready';
    const button=document.createElement('button');button.type='button';button.className='cf-open-preview';button.textContent='Open preview';
    button.onclick=()=>{if(video.currentSrc||video.src)open(video,button);};video.after(button);
  });
  new MutationObserver(add).observe(document.body,{childList:true,subtree:true});add();
})();
