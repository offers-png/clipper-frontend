import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const API_BASE = import.meta.env.VITE_API_BASE || "https://clipper-api-final-1.onrender.com";
const VIDEO_DURATION = 300;

const absUrl = (u) => (!u ? "" : u.startsWith("http") ? u : `${API_BASE}${u}`);
const t2s = (t)=>{
  if(!t) return 0; const p=t.split(":").map(Number);
  if(p.length===3) return p[0]*3600+p[1]*60+p[2];
  if(p.length===2) return p[0]*60+p[1];
  return Number(t)||0;
};

export default function Clipper(){
  // session guard
  useEffect(()=>{ (async ()=>{
    const { data:{session} } = await supabase.auth.getSession();
    if(!session) window.location.href="/";
  })(); }, []);

  // global
  const [isBusy,setIsBusy]=useState(false);
  const [error,setError]=useState(""); const [msg,setMsg]=useState("");

  // file/url/transcript
  const [file,setFile]=useState(null);
  const [url,setUrl]=useState("");
  const [transcript,setTranscript]=useState("");

  // AI
  const [aiInput,setAiInput]=useState("");
  const [aiBusy,setAiBusy]=useState(false);
  const [aiMsgs,setAiMsgs]=useState([]);

  // clip builder
  const [clips,setClips]=useState([{start:"00:00:00",end:"00:00:10"}]);
  const [previews,setPreviews]=useState([]);

  // options
  const [preview480,setPreview480]=useState(true);
  const [final1080,setFinal1080]=useState(false);
  const [watermark,setWatermark]=useState(true);
  const [wmText,setWmText]=useState("@ClipForge");

  const reset=()=>{ setError(""); setMsg(""); };

  // ---------- TRANSCRIBE ----------
  async function handleTranscribe(){
    try{
      reset(); setIsBusy(true);
      const fd = new FormData();
      if(url.trim()){ fd.append("url", url.trim()); }
      else{
        if(!file) { setError("Choose a file or paste a URL."); setIsBusy(false); return; }
        fd.append("file", file);
      }
      const r = await fetch(`${API_BASE}/transcribe`, {method:"POST", body:fd});
      const data = await r.json();
      if(!r.ok||!data.ok) throw new Error(data.error||"Transcription failed");
      setTranscript(data.text || "(no text)");
      setMsg("✅ Transcription complete.");
    }catch(e){ setError(e.message); } finally{ setIsBusy(false); }
  }

  // ---------- AI Helper ----------
  async function askAI(message){
    try{
      setAiBusy(true);
      const fd=new FormData();
      fd.append("user_message", message);
      fd.append("transcript", transcript||"");
      fd.append("history", JSON.stringify(aiMsgs));
      const r=await fetch(`${API_BASE}/ai_chat`,{method:"POST",body:fd});
      const data=await r.json();
      if(!r.ok||!data.ok) throw new Error(data.error||"AI error");
      setAiMsgs(m=>[...m,{role:"user",content:message},{role:"assistant",content:data.reply||"(no reply)"}]);
    }catch(e){ setError(e.message); } finally{ setAiBusy(false); }
  }
  async function autoBestMoments(){
    try{
      if(!transcript) return setError("Transcribe first or paste a URL.");
      setAiBusy(true);
      const fd=new FormData(); fd.append("transcript",transcript); fd.append("max_clips","3");
      const r=await fetch(`${API_BASE}/auto_clip`,{method:"POST",body:fd});
      const data=await r.json();
      if(!r.ok||!data.ok) throw new Error(data.error||"Auto-clip failed");
      if(Array.isArray(data.clips)&&data.clips.length){
        setClips(data.clips.map(c=>({start:c.start||"00:00:00",end:c.end||"00:00:10"})));
        setAiMsgs(m=>[...m,{role:"assistant",content:`Loaded ${data.clips.length} moments into your Clip list.`}]);
      } else {
        setAiMsgs(m=>[...m,{role:"assistant",content:"No clear moments found. Adjust the ranges manually."}]);
      }
    }catch(e){ setError(e.message); } finally{ setAiBusy(false); }
  }
  const tplTitles = ()=> transcript ? askAI("Write 5 viral, punchy titles (≤60 chars) based on this transcript.") : setError("Transcribe first.");
  const tplHooks  = ()=> transcript ? askAI("Give me 7 short opening hooks (≤80 chars) for Shorts/TikTok.") : setError("Transcribe first.");
  const tplTags   = ()=> transcript ? askAI("Suggest 10 hashtags + 10 SEO keywords for this content.") : setError("Transcribe first.");
  const tplSum    = ()=> transcript ? askAI("Summarize the transcript into 5 bullet key takeaways.") : setError("Transcribe first.");

  // ---------- Clip building ----------
  function updateClip(i,k,v){ const n=[...clips]; n[i][k]=v; setClips(n); }
  function addClip(){ if(clips.length<5) setClips([...clips,{start:"00:00:00",end:"00:00:10"}]); }
  function removeClip(i){ setClips(clips.filter((_,x)=>x!==i)); }

  function appendPreview({preview_url, final_url, start, end}){
    setPreviews(p=>[{
      id:`${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      url:absUrl(preview_url), finalUrl:absUrl(final_url),
      start,end,ts:new Date().toISOString()
    }, ...p]);
  }

  async function buildOne(i){
    try{
      reset();
      if(!file) return setError("Pick a video first.");
      const c=clips[i]; if(!c.start||!c.end) return setError("Enter start & end.");
      setIsBusy(true);
      const fd=new FormData();
      fd.append("file",file);
      fd.append("start",c.start.trim()); fd.append("end",c.end.trim());
      fd.append("preview_480",preview480?"1":"0");
      fd.append("final_1080",final1080?"1":"0");
      fd.append("watermark",watermark?"1":"0"); fd.append("wm_text",wmText);
      const r=await fetch(`${API_BASE}/clip`,{method:"POST",body:fd});
      const data=await r.json();
      if(!r.ok||!data.ok) throw new Error(data.error||"Clip failed");
      appendPreview(data); setMsg("✅ Preview ready.");
    }catch(e){ setError(e.message); } finally{ setIsBusy(false); }
  }

  async function buildAll(){
    try{
      reset();
      if(!file) return setError("Pick a video first.");
      if(!clips.length) return setError("No clips.");
      setIsBusy(true);
      const fd=new FormData();
      fd.append("file",file); fd.append("sections",JSON.stringify(clips));
      fd.append("preview_480",preview480?"1":"0"); fd.append("final_1080",final1080?"1":"0");
      fd.append("watermark",watermark?"1":"0"); fd.append("wm_text",wmText);
      const r=await fetch(`${API_BASE}/clip_multi`,{method:"POST",body:fd});
      const data=await r.json();
      if(!r.ok||!data.ok) throw new Error(data.error||"Multi-clip failed");
      (data.items||[]).forEach(appendPreview);
      setMsg("✅ All previews ready.");
    }catch(e){ setError(e.message); } finally{ setIsBusy(false); }
  }

  async function downloadURL(u,name){
    const r=await fetch(u); const b=await r.blob();
    const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download=name||"clip.mp4";
    document.body.appendChild(a); a.click(); a.remove();
  }

  return (
    <div className="min-h-screen bg-[#0B1020] text-white">
      {/* Header */}
      <div className="border-b border-[#27324A]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-xl font-semibold">ClipForge AI</div>
          <div className="flex items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={watermark} onChange={e=>setWatermark(e.target.checked)} />
              Watermark
            </label>
            {watermark &&
              <input value={wmText} onChange={e=>setWmText(e.target.value)}
                placeholder="@YourHandle"
                className="bg-[#12182B] border border-[#27324A] text-white text-xs rounded-md px-2 py-1 w-40 outline-none" />
            }
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Transcribe + Clips */}
        <div className="lg:col-span-1 space-y-6">
          {/* Transcribe block */}
          <div className="bg-[#12182B] border border-[#27324A] rounded-xl p-4">
            <div className="mb-3">
              <input type="file" accept="video/*,audio/*" onChange={e=>setFile(e.target.files?.[0]||null)} />
              {file && <p className="text-xs text-gray-400 mt-1">Selected: {file.name}</p>}
            </div>

            <div className="mb-3">
              <input
                type="url"
                value={url}
                onChange={e=>setUrl(e.target.value)}
                placeholder="Or paste a URL (YouTube/TikTok/MP3/MP4)…"
                className="w-full bg-[#0B1020] border border-[#27324A] rounded px-3 py-2 text-sm"
              />
              <p className="text-[11px] text-white/50 mt-1">If a URL is provided, the file picker is ignored.</p>
            </div>

            <button
              onClick={handleTranscribe}
              disabled={isBusy}
              className="w-full bg-[#6C5CE7] hover:bg-[#5A4ED1] text-white rounded-lg py-2 disabled:opacity-60"
            >{isBusy? "Processing…" : "Upload & Transcribe"}</button>

            {!!transcript && (
              <div className="mt-4">
                <div className="font-semibold mb-1">📝 Transcript</div>
                <div className="text-sm whitespace-pre-wrap leading-6 max-h-48 overflow-auto bg-[#0B1020] border border-[#27324A] rounded p-2">
                  {transcript}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button onClick={autoBestMoments} disabled={aiBusy} className="px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-sm">🎬 Best 3 Moments</button>
                  <button onClick={tplTitles} disabled={aiBusy} className="px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 text-sm">✍️ Titles</button>
                  <button onClick={tplHooks} disabled={aiBusy} className="px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 text-sm">💬 Hooks</button>
                  <button onClick={tplTags} disabled={aiBusy} className="px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 text-sm">#️⃣ Hashtags</button>
                  <button onClick={tplSum} disabled={aiBusy} className="col-span-2 px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 text-sm">📝 Summary</button>
                </div>

                <div className="mt-3">
                  <textarea
                    value={aiInput}
                    onChange={e=>setAiInput(e.target.value)}
                    placeholder="Ask something about your transcript…"
                    rows={2}
                    className="w-full bg-[#0B1020] border border-[#27324A] rounded p-2 text-sm"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={()=>{ if(aiInput.trim()) { askAI(aiInput.trim()); setAiInput(""); } }}
                      disabled={aiBusy}
                      className="px-4 py-2 rounded bg-[#6C5CE7] hover:bg-[#5A4ED1] disabled:opacity-60"
                    >{aiBusy?"Thinking…":"Ask AI"}</button>
                  </div>
                  <div className="mt-2 text-xs bg-black/20 rounded p-2 max-h-32 overflow-auto">
                    {aiMsgs.length===0 ? <div className="text-white/50">AI chat will appear here.</div> :
                      aiMsgs.map((m,i)=><div key={i} className={m.role==="assistant"?"text-white":"text-indigo-300"}><b className="opacity-70 mr-1">{m.role==="assistant"?"AI:":"You:"}</b>{m.content}</div>)
                    }
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Clip builder */}
          <div className="bg-[#12182B] border border-[#27324A] rounded-xl p-4">
            <div className="flex items-center gap-6 mb-3 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={preview480} onChange={e=>setPreview480(e.target.checked)} />
                Preview (480p / fast)
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={final1080} onChange={e=>setFinal1080(e.target.checked)} />
                Export (1080p)
              </label>
            </div>

            {clips.map((c,idx)=>(
              <div key={idx} className="border border-[#27324A] rounded-lg p-3 mb-3 bg-[#0B1020]">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium">🎬 Clip {idx+1}</div>
                  <div className="flex gap-2">
                    <button onClick={()=>buildOne(idx)} disabled={isBusy||!file} className="text-xs bg-[#6C5CE7] hover:bg-[#5A4ED1] px-3 py-1 rounded disabled:opacity-60">Build Preview</button>
                    <button onClick={()=>removeClip(idx)} disabled={isBusy} className="text-xs bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded">Remove</button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-2">
                  <input value={c.start} onChange={e=>updateClip(idx,"start",e.target.value)} className="rounded border border-[#27324A] bg-[#0B1020] text-sm px-2 py-1" placeholder="Start (HH:MM:SS)" />
                  <input value={c.end}   onChange={e=>updateClip(idx,"end",e.target.value)}   className="rounded border border-[#27324A] bg-[#0B1020] text-sm px-2 py-1" placeholder="End (HH:MM:SS)" />
                </div>

                <div className="relative h-2 bg-[#27324A] rounded-full overflow-hidden">
                  {(()=>{
                    const s=t2s(c.start), e=t2s(c.end), total=VIDEO_DURATION;
                    const sp=Math.min((s/total)*100,100), ep=Math.min((e/total)*100,100);
                    return <div className="absolute h-full bg-[#6C5CE7]" style={{left:`${sp}%`, width:`${Math.max(ep-sp,2)}%`}} />;
                  })()}
                </div>
                <p className="text-xs text-white/60 text-center mt-1">{c.start} → {c.end}</p>
              </div>
            ))}

            <div className="flex justify-between">
              <button onClick={addClip} disabled={clips.length>=5} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded disabled:opacity-50">+ Add Clip</button>
              <button onClick={buildAll} disabled={isBusy||!file||clips.length===0} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded">Build All Previews</button>
            </div>

            {!!msg && <p className="text-emerald-400 text-sm mt-3">{msg}</p>}
            {!!error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          </div>
        </div>

        {/* Right: Previews */}
        <div className="lg:col-span-2">
          <h3 className="text-lg font-semibold mb-3">Previews</h3>
          {previews.length===0 ? (
            <div className="border border-dashed border-[#27324A] rounded-xl p-6 text-center text-white/70">
              No previews yet. Build one with <b>Build Preview</b> or <b>Build All Previews</b>.
            </div>
          ) : (
            <div className="space-y-4 max-h-[75vh] overflow-auto pr-1">
              {previews.map(p=>(
                <div key={p.id} className="bg-[#12182B] border border-[#27324A] rounded-xl p-4">
                  <div className="flex gap-4 flex-col md:flex-row">
                    <div className="md:w-2/3 w-full">
                      <video src={p.url} controls preload="metadata" className="w-full rounded-lg border border-[#27324A]" />
                    </div>
                    <div className="md:w-1/3 w-full">
                      <div className="text-sm font-semibold mb-1">{p.start} → {p.end}</div>
                      <div className="text-xs text-white/60 mb-3">{new Date(p.ts).toLocaleString()}</div>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={()=>downloadURL(p.url, `clip_${p.start.replaceAll(':','-')}-${p.end.replaceAll(':','-')}_preview.mp4`)} className="col-span-2 px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-sm">⬇️ Download Preview</button>
                        {p.finalUrl && <button onClick={()=>downloadURL(p.finalUrl, `clip_${p.start.replaceAll(':','-')}-${p.end.replaceAll(':','-')}_1080.mp4`)} className="col-span-2 px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-sm">⬇️ Download 1080p</button>}
                        <button onClick={()=>setPreviews(prev=>prev.filter(x=>x.id!==p.id))} className="col-span-2 px-3 py-2 rounded bg-[#2c334a] hover:bg-[#3a4160] text-sm">🗑️ Delete</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-10 text-center text-[10px] text-gray-500 select-none">
            © {new Date().getFullYear()} ClipForge AI • Watermark: {watermark ? wmText : "off"}
          </div>
        </div>
      </div>
    </div>
  );
}
