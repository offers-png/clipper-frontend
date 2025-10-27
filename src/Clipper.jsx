import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

const API_BASE = import.meta.env.VITE_API_BASE || "https://clipper-api-final-1.onrender.com";

function timeToSeconds(t) {
  if (!t) return 0;
  const p = t.split(":").map(Number);
  if (p.length === 3) return p[0]*3600 + p[1]*60 + p[2];
  if (p.length === 2) return p[0]*60 + p[1];
  return Number(t) || 0;
}

const VIDEO_DURATION = 300;

export default function Clipper() {
  const [mode, setMode] = useState("transcribe");
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");
  const [clipMsg, setClipMsg] = useState("");
  const [clips, setClips] = useState([{ start: "00:00:00", end: "00:00:10" }]);
  const [watermark, setWatermark] = useState(true);

  useEffect(() => {
    // small guard: if no session, kick to /
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) window.location.href = "/";
    })();
  }, []);

  const resetMessages = () => { setError(""); setClipMsg(""); };

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  async function handleTranscribe() {
    try {
      resetMessages(); setIsBusy(true);
      const fd = new FormData();
      if (url.trim()) fd.append("url", url.trim());
      else {
        if (!file) { setError("Choose a file or paste a URL."); setIsBusy(false); return; }
        fd.append("file", file);
      }
      const res = await fetch(`${API_BASE}/transcribe`, { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json()).error || "Transcription failed");
      const data = await res.json();
      setTranscript(data.text || "(no text)");
    } catch (e) { setError(e.message); }
    finally { setIsBusy(false); }
  }

  function addClip() {
    if (clips.length >= 5) return;
    setClips([...clips, { start: "00:00:00", end: "00:00:10" }]);
  }
  function updateClip(i, k, v) { const n=[...clips]; n[i][k]=v; setClips(n); }
  function cancelClip(i) { setClips(clips.filter((_, idx) => idx !== i)); }
  function cancelAll() { setClips([]); setClipMsg(""); }

  function deriveDownloadName(original, start, end) {
    const base = (original || "video").replace(/\.[^.]+$/, "");
    return `${base}_${start.replaceAll(":","-")}-${end.replaceAll(":","-")}.mp4`;
  }
  function downloadBlob(blob, filename) {
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u; a.download = filename || "download.bin"; document.body.appendChild(a);
    a.click(); a.remove(); URL.revokeObjectURL(u);
  }

  async function clipSingleSection({ start, end }) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("start", start.trim());
    fd.append("end", end.trim());
    fd.append("watermark", watermark ? "1" : "0");
    const res = await fetch(`${API_BASE}/clip`, { method: "POST", body: fd });
    if (!res.ok) throw new Error("Clip failed");
    return res.blob();
  }

  async function handleClipSingle(i) {
    try {
      resetMessages();
      if (!file) return setError("Select a video first.");
      const c = clips[i];
      if (!c?.start || !c?.end) return setError("Enter start & end times.");
      setIsBusy(true);
      const blob = await clipSingleSection(c);
      downloadBlob(blob, deriveDownloadName(file.name, c.start, c.end));
      setClipMsg(`✅ Clip ${i + 1} ready`);
    } catch (e) { setError(e.message); }
    finally { setIsBusy(false); }
  }

  async function handleClipAll() {
    try {
      resetMessages();
      if (!file) return setError("Select a video first.");
      if (clips.length === 0) return setError("No clips added.");
      setIsBusy(true);

      // Use multi endpoint (more efficient) and include watermark flag
      const fd = new FormData();
      fd.append("file", file);
      fd.append("sections", JSON.stringify(clips));
      fd.append("watermark", watermark ? "1" : "0");

      const res = await fetch(`${API_BASE}/clip_multi`, { method: "POST", body: fd });
      if (!res.ok) throw new Error("Multi-clip failed");
      const blob = await res.blob();
      downloadBlob(blob, "clips_bundle.zip");
      setClipMsg("✅ All clips processed — ZIP downloaded.");
    } catch (e) { setError(e.message); }
    finally { setIsBusy(false); }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="border-b bg-white">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="font-semibold">🎧 PTSEL Clipper Studio</div>
          <div className="flex items-center gap-3">
            <label className="text-sm flex items-center gap-2">
              <input type="checkbox" checked={watermark} onChange={(e)=>setWatermark(e.target.checked)} />
              Watermark
            </label>
            <button onClick={handleLogout} className="text-sm text-white bg-gray-800 px-3 py-1 rounded">
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            className={`px-4 py-2 rounded-lg border ${mode==="transcribe" ? "bg-blue-600 text-white border-blue-600":""}`}
            onClick={()=>setMode("transcribe")}
          >Transcribe</button>
          <button
            className={`px-4 py-2 rounded-lg border ${mode==="clip" ? "bg-blue-600 text-white border-blue-600":""}`}
            onClick={()=>setMode("clip")}
          >Clip</button>
        </div>

        {/* Shared file picker */}
        <div className="mb-4">
          <input type="file" accept="audio/*,video/*" onChange={(e)=>setFile(e.target.files?.[0]||null)} />
          {file && <p className="text-xs text-gray-500 mt-1">Selected: {file.name}</p>}
        </div>

        {/* Mode: Transcribe */}
        {mode==="transcribe" && (
          <>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Or paste a URL (YouTube/TikTok/MP3/MP4)</label>
              <input
                type="url" value={url} onChange={(e)=>setUrl(e.target.value)}
                placeholder="https://..." className="w-full rounded border px-3 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">If a URL is provided, the file picker is ignored.</p>
            </div>
            <button
              onClick={handleTranscribe} disabled={isBusy}
              className="w-full bg-blue-600 text-white rounded-lg py-2 disabled:opacity-60"
            >{isBusy ? "Processing..." : "Upload & Transcribe"}</button>

            {!!transcript && (
              <div className="mt-5 border rounded-lg p-3 bg-white">
                <div className="font-semibold mb-1">📝 Transcript</div>
                <div className="text-sm whitespace-pre-wrap leading-6 max-h-64 overflow-auto">{transcript}</div>
              </div>
            )}
          </>
        )}

        {/* Mode: Clip */}
        {mode==="clip" && (
          <>
            <div className="mb-3 text-sm text-gray-600">
              Add up to 5 clip segments. Clip individually or all at once.
            </div>

            {clips.map((c, idx)=>(
              <div key={idx} className="border rounded-lg p-3 mb-3 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-sm">🎬 Clip {idx+1}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={()=>handleClipSingle(idx)}
                      disabled={isBusy}
                      className="text-xs bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-60"
                    >Clip This</button>
                    <button
                      onClick={()=>cancelClip(idx)}
                      disabled={isBusy}
                      className="text-xs bg-gray-300 px-2 py-1 rounded hover:bg-gray-400"
                    >Cancel</button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <input
                    type="text" value={c.start}
                    onChange={(e)=>updateClip(idx,"start",e.target.value)}
                    placeholder="Start (HH:MM:SS)"
                    className="rounded border px-2 py-1 text-sm"
                  />
                  <input
                    type="text" value={c.end}
                    onChange={(e)=>updateClip(idx,"end",e.target.value)}
                    placeholder="End (HH:MM:SS)"
                    className="rounded border px-2 py-1 text-sm"
                  />
                </div>

                {/* Timeline */}
                <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                  {(() => {
                    const s = timeToSeconds(c.start);
                    const e = timeToSeconds(c.end);
                    const total = VIDEO_DURATION;
                    const sp = Math.min((s/total)*100, 100);
                    const ep = Math.min((e/total)*100, 100);
                    const w = Math.max(ep - sp, 2);
                    return <div className="absolute h-full bg-blue-500" style={{ left:`${sp}%`, width:`${w}%` }} />;
                  })()}
                </div>
                <p className="text-xs text-gray-500 text-center">{c.start} → {c.end}</p>

                {/* Snippet from transcript (simple substring demo) */}
                <div className="mt-3 text-xs text-gray-600 bg-gray-50 rounded p-2">
                  <div className="font-semibold mb-1">Snippet</div>
                  <div className="line-clamp-3">
                    {transcript ? transcript.slice(0, 240) : "— No transcript available for this range —"}
                  </div>
                </div>
              </div>
            ))}

            <div className="flex justify-between items-center mb-4">
              <button onClick={addClip} disabled={clips.length>=5} className="bg-emerald-600 text-white px-4 py-2 rounded disabled:opacity-50">
                + Add Clip
              </button>
              <button onClick={cancelAll} className="bg-gray-400 text-white px-3 py-2 rounded">
                Cancel All
              </button>
            </div>

            <button
              onClick={handleClipAll}
              disabled={isBusy || clips.length===0}
              className="w-full bg-indigo-600 text-white rounded-lg py-2 disabled:opacity-60"
            >{isBusy ? "Clipping..." : "Clip All & Download ZIP"}</button>

            {!!clipMsg && <p className="text-green-700 text-sm mt-3">{clipMsg}</p>}
            {!!error && <p className="text-red-600 text-sm mt-3">{error}</p>}
          </>
        )}

        {/* subtle watermark footer */}
        <div className="mt-10 text-center text-[10px] text-gray-400 select-none">
          © {new Date().getFullYear()} PTSEL • Watermark: @{watermark ? "ClippedBySal" : "disabled"}
        </div>
      </div>
    </div>
  );
}
