import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const API_BASE = import.meta.env.VITE_API_BASE || "https://clipper-api-final-1.onrender.com";
const VIDEO_DURATION = 300;

function timeToSeconds(t) {
  if (!t) return 0;
  const p = t.split(":").map(Number);
  if (p.length === 3) return p[0]*3600 + p[1]*60 + p[2];
  if (p.length === 2) return p[0]*60 + p[1];
  return Number(t) || 0;
}
function absUrl(u){ if(!u) return ""; return u.startsWith("http")?u:`${API_BASE}${u}`; }

export default function Clipper() {
  const [file, setFile] = useState(null);
  const [clips, setClips] = useState([{ start: "00:00:00", end: "00:00:10" }]);
  const [previews, setPreviews] = useState([]); // {id,url,finalUrl,start,end,ts}
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  // Options
  const [watermark, setWatermark] = useState(true);
  const [wmText, setWmText] = useState("@ClipForge");
  const [preview480, setPreview480] = useState(true);
  const [final1080, setFinal1080] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) window.location.href = "/";
    })();
  }, []);

  const reset = () => { setError(""); setMsg(""); };

  function updateClip(i,k,v){ const n=[...clips]; n[i][k]=v; setClips(n); }
  function addClip(){ if (clips.length<5) setClips([...clips,{start:"00:00:00",end:"00:00:10"}]); }
  function removeClip(i){ setClips(clips.filter((_,x)=>x!==i)); }

  function appendPreview({preview_url, final_url, start, end}) {
    setPreviews(p => [{
      id: `${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      url: absUrl(preview_url),
      finalUrl: absUrl(final_url),
      start, end, ts: new Date().toISOString()
    }, ...p]);
  }

  async function downloadURL(u, name){
    const r = await fetch(u); const b = await r.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b); a.download = name || "clip.mp4";
    document.body.appendChild(a); a.click(); a.remove();
  }

  async function buildOne(i){
    try{
      reset();
      if(!file) return setError("Pick a video first.");
      const c = clips[i];
      if(!c.start || !c.end) return setError("Enter start & end.");

      setIsBusy(true);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("start", c.start.trim());
      fd.append("end", c.end.trim());
      fd.append("preview_480", preview480 ? "1" : "0");
      fd.append("final_1080",  final1080 ? "1" : "0");
      fd.append("watermark",   watermark ? "1" : "0");
      fd.append("wm_text",     wmText);

      const res = await fetch(`${API_BASE}/clip`, { method:"POST", body: fd });
      const data = await res.json();
      if(!res.ok || !data.ok) throw new Error(data.error || "Clip failed");

      appendPreview(data);
      setMsg("✅ Preview ready.");
    }catch(e){ setError(e.message); } finally{ setIsBusy(false); }
  }

  async function buildAll(){
    try{
      reset();
      if(!file) return setError("Pick a video first.");
      if(!clips.length) return setError("No clips.");

      setIsBusy(true);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("sections", JSON.stringify(clips));
      fd.append("preview_480", preview480 ? "1" : "0");
      fd.append("final_1080",  final1080 ? "1" : "0");
      fd.append("watermark",   watermark ? "1" : "0");
      fd.append("wm_text",     wmText);

      const res = await fetch(`${API_BASE}/clip_multi`, { method:"POST", body: fd });
      const data = await res.json();
      if(!res.ok || !data.ok) throw new Error(data.error || "Multi-clip failed");

      (data.items||[]).forEach(appendPreview);
      setMsg("✅ All previews ready.");
    }catch(e){ setError(e.message); } finally{ setIsBusy(false); }
  }

  return (
    <div className="min-h-screen bg-[#0B1020] text-white">
      <div className="border-b border-[#27324A] bg-[#0B1020]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-xl font-semibold">ClipForge AI</div>
          <div className="flex items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={watermark} onChange={e=>setWatermark(e.target.checked)} />
              Watermark
            </label>
            {watermark && (
              <input
                value={wmText}
                onChange={e=>setWmText(e.target.value)}
                placeholder="@YourHandle"
                className="bg-[#12182B] border border-[#27324A] text-white text-xs rounded-md px-2 py-1 w-40 outline-none"
              />
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: controls */}
        <div className="lg:col-span-1">
          <div className="mb-4">
            <input type="file" accept="video/*" onChange={e=>setFile(e.target.files?.[0]||null)} />
            {file && <p className="text-xs text-gray-400 mt-1">Selected: {file.name}</p>}
          </div>

          <div className="flex items-center gap-6 mb-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={preview480} onChange={e=>setPreview480(e.target.checked)} />
              Preview (480p / fast)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={final1080} onChange={e=>setFinal1080(e.target.checked)} />
              Export (1080p)
            </label>
          </div>

          <div className="space-y-3">
            {clips.map((c, idx)=>(
              <div key={idx} className="border border-[#27324A] rounded-lg p-3 bg-[#12182B]">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-sm">🎬 Clip {idx+1}</div>
                  <div className="flex gap-2">
                    <button
                      onClick={()=>buildOne(idx)}
                      disabled={isBusy || !file}
                      className="text-xs bg-[#6C5CE7] hover:bg-[#5A4ED1] text-white px-3 py-1 rounded disabled:opacity-60"
                    >Build Preview</button>
                    <button
                      onClick={()=>removeClip(idx)}
                      disabled={isBusy}
                      className="text-xs bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded"
                    >Remove</button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <input
                    className="rounded border border-[#27324A] bg-[#0B1020] text-sm px-2 py-1"
                    placeholder="Start (HH:MM:SS)"
                    value={c.start}
                    onChange={e=>updateClip(idx,"start",e.target.value)}
                  />
                  <input
                    className="rounded border border-[#27324A] bg-[#0B1020] text-sm px-2 py-1"
                    placeholder="End (HH:MM:SS)"
                    value={c.end}
                    onChange={e=>updateClip(idx,"end",e.target.value)}
                  />
                </div>

                <div className="relative h-2 bg-[#27324A] rounded-full overflow-hidden mb-2">
                  {(() => {
                    const s = timeToSeconds(c.start);
                    const e = timeToSeconds(c.end);
                    const total = VIDEO_DURATION;
                    const sp = Math.min((s/total)*100, 100);
                    const ep = Math.min((e/total)*100, 100);
                    const w = Math.max(ep - sp, 2);
                    return <div className="absolute h-full bg-[#6C5CE7]" style={{ left:`${sp}%`, width:`${w}%` }} />;
                  })()}
                </div>
                <p className="text-xs text-gray-400 text-center">{c.start} → {c.end}</p>
              </div>
            ))}

            <div className="flex justify-between">
              <button onClick={addClip} disabled={clips.length>=5} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded disabled:opacity-50">
                + Add Clip
              </button>
              <button onClick={buildAll} disabled={isBusy || !file || clips.length===0} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded">
                Build All Previews
              </button>
            </div>

            {!!msg && <p className="text-emerald-400 text-sm mt-2">{msg}</p>}
            {!!error && <p className="text-red-400 text-sm mt-1">{error}</p>}
          </div>
        </div>

        {/* Right column: previews */}
        <div className="lg:col-span-2">
          <h3 className="text-lg font-semibold mb-3">Previews</h3>
          {previews.length === 0 ? (
            <div className="border border-dashed border-[#27324A] rounded-xl p-6 text-center text-white/70">
              No previews yet. Build one with <b>Build Preview</b> or <b>Build All Previews</b>.
            </div>
          ) : (
            <div className="space-y-4 max-h-[72vh] overflow-auto pr-1">
              {previews.map(p=>(
                <div key={p.id} className="bg-[#12182B] border border-[#27324A] rounded-xl p-4">
                  <div className="flex gap-4 flex-col md:flex-row">
                    <div className="md:w-2/3 w-full">
                      <video
                        src={p.url}
                        controls
                        preload="metadata"
                        className="w-full rounded-lg border border-[#27324A]"
                      />
                    </div>
                    <div className="md:w-1/3 w-full flex flex-col justify-between">
                      <div>
                        <div className="text-sm font-semibold mb-1">
                          {p.start} → {p.end}
                        </div>
                        <div className="text-xs text-white/60">
                          {new Date(p.ts).toLocaleString()}
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <button
                          onClick={()=>{
                            const el = document.querySelector(`video[src="${p.url}"]`);
                            if(el){ el.currentTime = 0; el.play(); }
                          }}
                          className="px-3 py-2 rounded bg-[#6C5CE7] hover:bg-[#5A4ED1] text-sm"
                        >▶️ Play</button>
                        <button
                          onClick={()=>setPreviews(prev=>prev.filter(x=>x.id!==p.id))}
                          className="px-3 py-2 rounded bg-[#2c334a] hover:bg-[#3a4160] text-sm"
                        >🗑️ Delete</button>
                        <button
                          onClick={()=>downloadURL(p.url, `clip_${p.start.replaceAll(':','-')}-${p.end.replaceAll(':','-')}_preview.mp4`)}
                          className="col-span-2 px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-sm"
                        >⬇️ Download Preview</button>
                        {p.finalUrl && (
                          <button
                            onClick={()=>downloadURL(p.finalUrl, `clip_${p.start.replaceAll(':','-')}-${p.end.replaceAll(':','-')}_1080.mp4`)}
                            className="col-span-2 px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-sm"
                          >⬇️ Download 1080p</button>
                        )}
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
