// src/Clipper.jsx
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

export default function Clipper() {
  const [mode, setMode] = useState("clip"); // default to clip screen
  const [file, setFile] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");
  const [clipMsg, setClipMsg] = useState("");

  const [clips, setClips] = useState([{ start: "00:00:00", end: "00:00:10" }]);

  // preview list state (results returned from backend)
  const [previews, setPreviews] = useState([]); // [{id,url,finalUrl?,start,end,createdAt}]

  // watermark & speed controls
  const [watermark, setWatermark] = useState(true);
  const [wmText, setWmText] = useState("@ClipForge");
  const [preview480, setPreview480] = useState(true);   // we want preview files
  const [final1080, setFinal1080] = useState(false);    // optional — user can toggle if needed

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) window.location.href = "/";
    })();
  }, []);

  const resetMessages = () => { setError(""); setClipMsg(""); };

  function addClip() {
    if (clips.length >= 5) return;
    setClips([...clips, { start: "00:00:00", end: "00:00:10" }]);
  }
  function updateClip(i, k, v) { const n=[...clips]; n[i][k]=v; setClips(n); }
  function cancelClip(i) { setClips(clips.filter((_, idx) => idx !== i)); }
  function cancelAll() { setClips([]); setClipMsg(""); }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  // -------- Helpers for preview list --------
  function toAbs(url) {
    // backend returns "/media/previews/....mp4" -> need absolute
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${API_BASE}${url}`;
  }
  function addPreviewItem({ preview_url, final_url, start, end }) {
    const item = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      url: toAbs(preview_url),
      finalUrl: toAbs(final_url),
      start, end,
      createdAt: new Date().toISOString()
    };
    setPreviews(list => [item, ...list]);
  }
  async function downloadURL(u, name) {
    const res = await fetch(u);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name || "clip.mp4";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  }

  // --------- Call /clip for a single card ---------
  async function handleClipSingle(i) {
    try {
      resetMessages();
      if (!file) return setError("Select a video first.");
      const c = clips[i];
      if (!c?.start || !c?.end) return setError("Enter start & end times.");
      setIsBusy(true);

      const fd = new FormData();
      fd.append("file", file);
      fd.append("start", c.start.trim());
      fd.append("end", c.end.trim());
      fd.append("watermark", watermark ? "1" : "0");
      fd.append("wm_text", wmText);
      fd.append("preview_480", preview480 ? "1" : "0");
      fd.append("final_1080", final1080 ? "1" : "0");

      const res = await fetch(`${API_BASE}/clip`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Clip failed");

      // push into preview list
      addPreviewItem({
        preview_url: data.preview_url,
        final_url: data.final_url,
        start: c.start, end: c.end
      });

      setClipMsg("✅ Preview ready below.");
    } catch (e) {
      setError(e.message);
    } finally {
      setIsBusy(false);
    }
  }

  // --------- Call /clip_multi and list all previews ---------
  async function handleClipAll() {
    try {
      resetMessages();
      if (!file) return setError("Select a video first.");
      if (clips.length === 0) return setError("No clips added.");
      setIsBusy(true);

      const fd = new FormData();
      fd.append("file", file);
      fd.append("sections", JSON.stringify(clips));
      fd.append("watermark", watermark ? "1" : "0");
      fd.append("wm_text", wmText);
      fd.append("preview_480", preview480 ? "1" : "0");
      fd.append("final_1080", final1080 ? "1" : "0");

      const res = await fetch(`${API_BASE}/clip_multi`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Multi-clip failed");

      // Add each item to the list
      (data.items || []).forEach(it => {
        addPreviewItem({
          preview_url: it.preview_url,
          final_url: it.final_url,
          start: it.start, end: it.end
        });
      });

      setClipMsg("✅ All previews ready below.");
      if (data.zip_url) {
        // Optionally show a “Download All (ZIP)” toast/link if you enabled final_1080
        console.log("ZIP ready:", toAbs(data.zip_url));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B1020] via-[#12182B] to-[#1C2450] text-white">
      {/* Header */}
      <div className="border-b border-[#27324A] bg-[#0B1020]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-lg font-semibold tracking-wide">ClipForge AI</div>
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
                className="bg-[#12182B] border border-[#27324A] text-white text-xs rounded-md px-2 py-1 w-36 outline-none"
              />
            )}
            <button onClick={handleLogout} className="bg-[#6C5CE7] hover:bg-[#5A4ED1] px-3 py-1 rounded text-white">
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="max-w-5xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Controls */}
        <div className="lg:col-span-1">
          <div className="mb-4">
            <input type="file" accept="video/*" onChange={e=>setFile(e.target.files?.[0]||null)} />
            {file && <p className="text-xs text-gray-400 mt-1">Selected: {file.name}</p>}
          </div>

          {/* tabs (only Clip shown, but keeping structure) */}
          <div className="flex gap-2 mb-4">
            <button
              className={`px-4 py-2 rounded-lg border ${mode==="clip" ? "bg-[#6C5CE7] border-[#6C5CE7]" : "border-[#27324A] bg-[#12182B]"}`}
              onClick={()=>setMode("clip")}
            >
              Clip
            </button>
          </div>

          {/* Options */}
          <div className="flex items-center gap-4 mb-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={preview480} onChange={e=>setPreview480(e.target.checked)} />
              Preview (480p)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={final1080} onChange={e=>setFinal1080(e.target.checked)} />
              Export (1080p)
            </label>
          </div>

          {/* Clip cards (inputs) */}
          <div className="space-y-3">
            {clips.map((c, idx)=>(
              <div key={idx} className="border border-[#27324A] rounded-lg p-3 bg-[#12182B]">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-sm text-white/80">🎬 Clip {idx+1}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={()=>handleClipSingle(idx)}
                      disabled={isBusy || !file}
                      className="text-xs bg-[#6C5CE7] hover:bg-[#5A4ED1] text-white px-3 py-1 rounded disabled:opacity-60"
                    >
                      Build Preview
                    </button>
                    <button
                      onClick={()=>cancelClip(idx)}
                      disabled={isBusy}
                      className="text-xs bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {/* inputs */}
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

                {/* progress bar (static visual) */}
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

            <div className="flex justify-between items-center">
              <button onClick={addClip} disabled={clips.length>=5} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded disabled:opacity-50">
                + Add Clip
              </button>
              <button onClick={handleClipAll} disabled={isBusy || !file || clips.length===0} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded">
                Build All Previews
              </button>
            </div>

            {!!clipMsg && <p className="text-emerald-400 text-sm mt-2">{clipMsg}</p>}
            {!!error && <p className="text-red-400 text-sm mt-1">{error}</p>}
          </div>
        </div>

        {/* Right: Preview list (Medium Cards) */}
        <div className="lg:col-span-2">
          <h3 className="text-lg font-semibold mb-3">Previews</h3>

          {previews.length === 0 && (
            <div className="border border-dashed border-[#27324A] rounded-xl p-6 text-center text-white/70">
              No previews yet. Build one with **Build Preview** or **Build All Previews**.
            </div>
          )}

          <div className="space-y-4 max-h-[70vh] overflow-auto pr-1">
            {previews.map((p) => (
              <div key={p.id} className="bg-[#12182B] border border-[#27324A] rounded-xl p-4">
                <div className="flex gap-4 flex-col md:flex-row">
                  {/* Video (no autoplay) */}
                  <div className="md:w-2/3 w-full">
                    <video
                      src={p.url || ""}
                      className="w-full rounded-lg border border-[#27324A]"
                      controls
                      preload="metadata"
                    />
                  </div>

                  {/* Details + Actions */}
                  <div className="md:w-1/3 w-full flex flex-col justify-between">
                    <div>
                      <div className="text-sm text-white/90 font-semibold mb-1">
                        {p.start} → {p.end}
                      </div>
                      <div className="text-xs text-white/60">
                        Created: {new Date(p.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          // replay from start – using the DOM video element
                          const el = document.querySelector(`video[src="${p.url}"]`);
                          if (el) { el.currentTime = 0; el.play(); }
                        }}
                        className="px-3 py-2 rounded bg-[#6C5CE7] hover:bg-[#5A4ED1] text-sm"
                      >
                        ▶️ Play
                      </button>
                      <button
                        onClick={() => setPreviews(prev => prev.filter(x => x.id !== p.id))}
                        className="px-3 py-2 rounded bg-[#2c334a] hover:bg-[#3a4160] text-sm"
                      >
                        🗑️ Delete
                      </button>
                      <button
                        onClick={() => downloadURL(p.url, `clip_${p.start.replaceAll(':','-')}-${p.end.replaceAll(':','-')}_preview.mp4`)}
                        className="col-span-2 px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-sm"
                      >
                        ⬇️ Download Preview
                      </button>

                      {p.finalUrl && (
                        <button
                          onClick={() => downloadURL(p.finalUrl, `clip_${p.start.replaceAll(':','-')}-${p.end.replaceAll(':','-')}_1080.mp4`)}
                          className="col-span-2 px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-sm"
                        >
                          ⬇️ Download 1080p
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center text-[10px] text-gray-500 select-none">
            © {new Date().getFullYear()} ClipForge AI • Watermark: {watermark ? wmText : "off"}
          </div>
        </div>
      </div>
    </div>
  );
}
