// src/Clipper.jsx — Option A (Preview only, stable Multi-Clip)
import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import logo from "./assets/react.svg";
import ClipCard from "./components/ClipCard";

const API_BASE = import.meta.env.VITE_API_BASE || "https://clipper-api-final-1.onrender.com";
const VIDEO_DURATION = 300;

function timeToSeconds(t) {
  if (!t) return 0;
  const p = t.split(":").map(Number);
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
  if (p.length === 2) return p[0] * 60 + p[1];
  return Number(t) || 0;
}
function secondsToLabel(s) {
  s = Math.max(0, Math.floor(s));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(ss)}` : `${pad(m)}:${pad(ss)}`;
}

export default function Clipper() {
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) window.location.href = "/";
    })();
  }, []);

  const [mode, setMode] = useState("clip");
  const [file, setFile] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");
  const [clipMsg, setClipMsg] = useState("");

  const [clips, setClips] = useState([{ start: "00:00:00", end: "00:00:10" }]);
  const [results, setResults] = useState([]);
  const [watermarkOn, setWatermarkOn] = useState(true);
  const [wmText, setWmText] = useState("@ClippedBySal");
  const [fastMode, setFastMode] = useState(true);
  const [previewSpeed, setPreviewSpeed] = useState(1);

  function resetMessages(){ setError(""); setClipMsg(""); }
  function addClip(){ if (clips.length<5) setClips([...clips, { start:"00:00:00", end:"00:00:10" }]); }
  function updateClip(i, k, v){ const n=[...clips]; n[i][k]=v; setClips(n); }
  function cancelClip(i){ setClips(clips.filter((_,idx)=>idx!==i)); }
  function cancelAll(){ setClips([]); setClipMsg(""); }

  function deriveFilename(original, start, end){
    const base = (original||"video").replace(/\.[^.]+$/,"");
    return `${base}_${start.replaceAll(":","-")}-${end.replaceAll(":","-")}.mp4`;
  }

  async function handleClipSingle(i){
    try{
      resetMessages();
      if(!file) return setError("Select a video first.");
      const c = clips[i]; if(!c?.start || !c?.end) return setError("Enter start & end.");
      setIsBusy(true);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("start", c.start.trim());
      fd.append("end", c.end.trim());
      fd.append("watermark", watermarkOn ? "1" : "0");
      fd.append("wm_text", wmText);
      const res  = await fetch(`${API_BASE}/clip`, { method:"POST", body: fd });
      const data = await res.json();
      if(!res.ok || !data.ok) throw new Error(data.error || "Clip failed");
      const duration = timeToSeconds(c.end)-timeToSeconds(c.start);
      setResults(r => [...r, {
        preview_url: data.preview_url,
        start: c.start, end: c.end,
        durationLabel: `${secondsToLabel(duration)} • preview`,
        filename: deriveFilename(file.name, c.start, c.end)
      }]);
      setClipMsg(`✅ Clip ${i+1} ready`);
    }catch(e){ setError(e.message); }
    finally{ setIsBusy(false); }
  }

  async function handleClipAll(){
    try{
      resetMessages();
      if(!file) return setError("Select a video first.");
      if(clips.length===0) return setError("No clips added.");
      setIsBusy(true);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("sections", JSON.stringify(clips.map(({start,end})=>({start,end}))));
      fd.append("watermark", watermarkOn ? "1" : "0");
      fd.append("wm_text", wmText);

      const res  = await fetch(`${API_BASE}/clip_multi`, { method:"POST", body: fd });
      const data = await res.json();
      if(!res.ok || !data.ok) throw new Error(data.error || "Multi-clip failed");

      const newItems = (data.items||[]).map((it, idx) => {
        const s = it.start || clips[idx]?.start || "00:00:00";
        const e = it.end   || clips[idx]?.end   || "00:00:10";
        const duration = timeToSeconds(e)-timeToSeconds(s);
        return {
          preview_url: it.preview_url,
          start: s, end: e,
          durationLabel: `${secondsToLabel(duration)} • preview`,
          filename: deriveFilename(file.name, s, e)
        };
      });
      setResults(r => [...r, ...newItems]);
      setClipMsg("✅ All clips processed — preview & download below.");
    }catch(e){ setError(e.message); }
    finally{ setIsBusy(false); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B1020] via-[#12182B] to-[#1C2450] text-white">
      {/* Header */}
      <div className="border-b border-[#27324A] bg-[#0B1020] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="ClipForge AI" className="h-8 w-8" />
            <div className="text-lg font-semibold tracking-wide">ClipForge AI</div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={watermarkOn} onChange={e=>setWatermarkOn(e.target.checked)} />
              Watermark
            </label>
            {watermarkOn && (
              <input
                value={wmText}
                onChange={e=>setWmText(e.target.value)}
                placeholder="@YourHandle"
                className="bg-[#12182B] border border-[#27324A] text-white text-xs rounded-md px-2 py-1 w-40 outline-none"
              />
            )}
            <button onClick={async ()=>{ await supabase.auth.signOut(); window.location.href="/"; }} className="bg-[#6C5CE7] hover:bg-[#5A4ED1] px-3 py-1 rounded text-white">
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            className={`px-4 py-2 rounded-lg border ${mode==="clip" ? "bg-[#6C5CE7] border-[#6C5CE7]" : "border-[#27324A] bg-[#12182B]"}`}
            onClick={()=>setMode("clip")}
          >Clip</button>
        </div>

        {/* Speed row */}
        <div className="flex flex-wrap items-center gap-6 mb-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={fastMode} onChange={e=>setFastMode(e.target.checked)} />
            Instant clip (fast mode)
          </label>
          <label className="flex items-center gap-2">
            Preview speed
            <select
              value={previewSpeed}
              onChange={e=>setPreviewSpeed(Number(e.target.value))}
              className="bg-[#12182B] border border-[#27324A] rounded-md px-2 py-1"
            >
              {[0.5,0.75,1,1.25,1.5,2].map(v=><option key={v} value={v}>{v}×</option>)}
            </select>
          </label>
        </div>

        {/* File picker */}
        <div className="mb-4">
          <input type="file" accept="audio/*,video/*" onChange={e=>setFile(e.target.files?.[0]||null)} />
          {file && <p className="text-xs text-gray-400 mt-1">Selected: {file.name}</p>}
        </div>

        {/* Clip blocks */}
        <div className="mb-3 text-sm text-gray-400">Add up to 5 clip segments. Clip individually or all at once.</div>

        {clips.map((c, idx)=>(
          <div key={idx} className="border border-[#27324A] rounded-lg p-3 mb-3 bg-[#12182B]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-sm text-white/80">🎬 Clip {idx+1}</h3>
              <div className="flex gap-2">
                <button
                  onClick={()=>handleClipSingle(idx)}
                  disabled={isBusy}
                  className="text-xs bg-[#6C5CE7] hover:bg-[#5A4ED1] text-white px-3 py-1 rounded disabled:opacity-60"
                >Clip This</button>
                <button
                  onClick={()=>cancelClip(idx)}
                  disabled={isBusy}
                  className="text-xs bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded"
                >Remove</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <input
                type="text"
                value={c.start}
                onChange={e=>updateClip(idx,"start",e.target.value)}
                placeholder="Start (HH:MM:SS)"
                className="rounded border border-[#27324A] bg-[#0B1020] text-sm px-2 py-1 text-white"
              />
              <input
                type="text"
                value={c.end}
                onChange={e=>updateClip(idx,"end",e.target.value)}
                placeholder="End (HH:MM:SS)"
                className="rounded border border-[#27324A] bg-[#0B1020] text-sm px-2 py-1 text-white"
              />
            </div>

            <div className="relative h-2 bg-[#27324A] rounded-full overflow-hidden mb-2">
              {(() => {
                const s = timeToSeconds(c.start);
                const e = timeToSeconds(c.end);
                const total = VIDEO_DURATION;
                const sp = Math.min((s/total)*100, 100);
                const ep = Math.min((e/total)*100, 100);
                const w  = Math.max(ep - sp, 2);
                return <div className="absolute h-full bg-[#6C5CE7]" style={{ left:`${sp}%`, width:`${w}%` }} />;
              })()}
            </div>

            <p className="text-xs text-gray-400 text-center">{c.start} → {c.end}</p>
          </div>
        ))}

        <div className="flex justify-between items-center mb-4">
          <button onClick={addClip} disabled={clips.length>=5} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded disabled:opacity-50">
            + Add Clip
          </button>
          <button onClick={cancelAll} className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded">
            Cancel All
          </button>
        </div>

        <button
          onClick={handleClipAll}
          disabled={isBusy || clips.length===0}
          className="w-full bg-[#6C5CE7] hover:bg-[#5A4ED1] text-white rounded-lg py-2 disabled:opacity-60"
        >
          {isBusy ? "Clipping..." : "Clip All"}
        </button>

        {!!clipMsg && <p className="text-green-400 text-sm mt-3">{clipMsg}</p>}
        {!!error && <p className="text-red-400 text-sm mt-3">{error}</p>}

        {/* Result cards */}
        {results.length>0 && (
          <div className="mt-6">
            {results.map((it, i)=>(
              <ClipCard
                key={`${it.preview_url}-${i}`}
                idx={i}
                item={it}
                onDelete={()=> setResults(rs => rs.filter((_,idx)=>idx!==i))}
                onSave={()=> alert("Saved (wire to Supabase later).")}
              />
            ))}
          </div>
        )}

        <div className="mt-10 text-center text-[10px] text-gray-500 select-none">
          © {new Date().getFullYear()} ClipForge AI • Watermark: {watermarkOn ? wmText : "off"}
        </div>
      </div>
    </div>
  );
}
