import React, { useEffect, useState, useRef } from "react";
import { supabase } from "./supabaseClient";
import logo from "./assets/react.svg"; // safe default; replace with your logo when ready

const API_BASE =
  import.meta.env.VITE_API_BASE || "https://clipper-api-final-1.onrender.com";
const VIDEO_DURATION = 300; // timeline scale for the bar

function timeToSeconds(t) {
  if (!t) return 0;
  const p = t.split(":").map(Number);
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
  if (p.length === 2) return p[0] * 60 + p[1];
  return Number(t) || 0;
}

export default function Clipper() {
  // auth guard
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) window.location.href = "/";
    })();
  }, []);

  // app state
  const [mode, setMode] = useState("transcribe"); // 'transcribe' | 'clip'
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");
  const [clipMsg, setClipMsg] = useState("");
  const [clips, setClips] = useState([{ start: "00:00:00", end: "00:00:10", summary: "" }]);

  // watermark + speed
  const [watermarkOn, setWatermarkOn] = useState(true);
  const [wmText, setWmText] = useState("@ClippedBySal");
  const [fastMode, setFastMode] = useState(true);
  const [previewSpeed, setPreviewSpeed] = useState(1);

  // AI assistant (right sidebar)
  const [aiOpen, setAiOpen] = useState(true); // collapsible sidebar default open
  const [aiMsgs, setAiMsgs] = useState([]);   // [{role:'user'|'assistant', content:'...'}]
  const [aiInput, setAiInput] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const aiBottomRef = useRef(null);
  useEffect(() => { aiBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [aiMsgs]);

  const resetMessages = () => { setError(""); setClipMsg(""); };

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  // ---------- Transcribe ----------
  async function handleTranscribe() {
    try {
      resetMessages(); setIsBusy(true);
      const fd = new FormData();
      if (url.trim()) {
        fd.append("url", url.trim());
      } else {
        if (!file) { setError("Choose a file or paste a URL."); setIsBusy(false); return; }
        fd.append("file", file);
      }
      const res = await fetch(`${API_BASE}/transcribe`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transcription failed");
      setTranscript(data.text || "(no text)");
      // drop a system note in AI panel
      setAiMsgs(m => [...m, { role: "assistant", content: "📝 Transcript is ready. Ask for titles, hooks, or best moments." }]);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsBusy(false);
    }
  }

  // ---------- Clip helpers ----------
  function addClip() {
    if (clips.length >= 5) return;
    setClips([...clips, { start: "00:00:00", end: "00:00:10", summary: "" }]);
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
    a.href = u; a.download = filename || "download.bin";
    document.body.appendChild(a);
    a.click(); a.remove(); URL.revokeObjectURL(u);
  }

  async function clipSingleSection({ start, end }) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("start", start.trim());
    fd.append("end", end.trim());
    // backend expects watermark text in "watermark" (empty for off)
    fd.append("watermark", watermarkOn ? wmText : "");
    fd.append("fast", fastMode ? "1" : "0");
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
      const fd = new FormData();
      fd.append("file", file);
      fd.append("sections", JSON.stringify(clips.map(({start,end})=>({start,end}))));
      fd.append("watermark", watermarkOn ? wmText : "");
      fd.append("fast", fastMode ? "1" : "0");
      const res = await fetch(`${API_BASE}/clip_multi`, { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json().catch(()=>({})); 
        throw new Error(d.error || "Multi-clip failed");
      }
      const blob = await res.blob();
      downloadBlob(blob, "clips_bundle.zip");
      setClipMsg("✅ All clips processed — ZIP downloaded.");
    } catch (e) { setError(e.message); }
    finally { setIsBusy(false); }
  }

  // ---------- AI: chat + templates ----------
  async function askAI(message) {
    if (!message.trim()) return;
    try {
      setAiBusy(true);
      const fd = new FormData();
      fd.append("user_message", message);
      fd.append("transcript", transcript || "");
      fd.append("history", JSON.stringify(aiMsgs));
      const res = await fetch(`${API_BASE}/ai_chat`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI helper failed");
      setAiMsgs(m => [
        ...m,
        { role: "user", content: message },
        { role: "assistant", content: data.reply || "(no reply)" },
      ]);
    } catch (e) {
      setError(e.message);
    } finally {
      setAiBusy(false);
    }
  }

  function tplSummarize() {
    if (!transcript) return setError("Transcribe first or paste a URL.");
    askAI("Summarize the transcript into 5 bullet points with key takeaways.");
  }
  function tplTitles() {
    if (!transcript) return setError("Transcribe first or paste a URL.");
    askAI("Write 5 viral, punchy titles (max 60 chars each) based on this transcript.");
  }
  function tplHooks() {
    if (!transcript) return setError("Transcribe first or paste a URL.");
    askAI("Give me 7 short opening hooks (under 80 chars) tailored for Shorts/TikTok.");
  }
  function tplHashtags() {
    if (!transcript) return setError("Transcribe first or paste a URL.");
    askAI("Suggest 10 relevant hashtags + 10 SEO keywords for this content.");
  }
  async function tplBestMoments() {
    try {
      if (!transcript) return setError("Transcribe first or paste a URL.");
      setAiBusy(true);
      const fd = new FormData();
      fd.append("transcript", transcript);
      fd.append("max_clips", "3");
      const res = await fetch(`${API_BASE}/auto_clip`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Auto-clip failed");
      if (Array.isArray(data.clips) && data.clips.length) {
        setClips(
          data.clips.slice(0, 5).map(c => ({
            start: c.start || "00:00:00",
            end: c.end || "00:00:10",
            summary: c.summary || "",
          }))
        );
        setAiMsgs(m => [...m, { role: "assistant", content: `🎯 Loaded ${Math.min(5, data.clips.length)} suggested moments into your clip list.` }]);
      } else {
        setAiMsgs(m => [...m, { role: "assistant", content: "I couldn't find clear moments. Try a different video or longer transcript." }]);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setAiBusy(false);
    }
  }

  function TemplateBar() {
    return (
      <div className="flex flex-wrap gap-2">
        <button onClick={tplBestMoments} disabled={aiBusy} className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">🎬 Best 3 Moments</button>
        <button onClick={tplTitles} disabled={aiBusy} className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50">✍️ Viral Titles</button>
        <button onClick={tplHooks} disabled={aiBusy} className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50">💬 Hooks</button>
        <button onClick={tplHashtags} disabled={aiBusy} className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50">#️⃣ Hashtags</button>
        <button onClick={tplSummarize} disabled={aiBusy} className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50">📝 Summary</button>
      </div>
    );
  }

  // ---------- UI ----------
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
            <button
              onClick={()=>setAiOpen(v=>!v)}
              className="bg-[#24304A] hover:bg-[#2c3b5c] px-3 py-1 rounded"
              title={aiOpen ? "Hide AI Assistant" : "Show AI Assistant"}
            >
              {aiOpen ? "Hide Assistant" : "Show Assistant"}
            </button>
            <button onClick={handleLogout} className="bg-[#6C5CE7] hover:bg-[#5A4ED1] px-3 py-1 rounded text-white">
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main two-column layout */}
      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-6">
        {/* LEFT: main workspace */}
        <div className={`flex-1 transition-all`}>
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              className={`px-4 py-2 rounded-lg border ${mode==="transcribe" ? "bg-[#6C5CE7] border-[#6C5CE7]" : "border-[#27324A] bg-[#12182B]"}`}
              onClick={()=>setMode("transcribe")}
            >Transcribe</button>
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

          {/* === TRANSCRIBE MODE === */}
          {mode==="transcribe" && (
            <>
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Or paste a URL (YouTube/TikTok/MP3/MP4)</label>
                <input
                  type="url"
                  value={url}
                  onChange={e=>setUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-[#12182B] border border-[#27324A] rounded px-3 py-2 text-white"
                />
                <p className="text-xs text-gray-400 mt-1">If a URL is provided, the file picker is ignored.</p>
              </div>

              <div className="mb-4">
                <TemplateBar />
              </div>

              <button
                onClick={handleTranscribe}
                disabled={isBusy}
                className="w-full bg-[#6C5CE7] hover:bg-[#5A4ED1] text-white rounded-lg py-2 disabled:opacity-60"
              >{isBusy ? "Processing..." : "Upload & Transcribe"}</button>

              {!!transcript && (
                <div className="mt-5 border border-[#27324A] rounded-lg p-3 bg-[#12182B]">
                  <div className="font-semibold mb-1">📝 Transcript</div>
                  <div className="text-sm whitespace-pre-wrap leading-6 max-h-64 overflow-auto">{transcript}</div>
                </div>
              )}
            </>
          )}

          {/* === CLIP MODE === */}
          {mode==="clip" && (
            <>
              <div className="mb-3 text-sm text-gray-400">
                Add up to 5 clip segments. Clip individually or all at once.
              </div>

              <div className="mb-4">
                <TemplateBar />
              </div>

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
                      >Cancel</button>
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

                  {/* timeline */}
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

                  {/* snippet preview (simple) */}
                  <div className="mt-3 text-xs text-gray-300 bg-[#0F172A] rounded p-2">
                    <div className="font-semibold mb-1">Snippet</div>
                    <div className="line-clamp-3">
                      {c.summary || (transcript ? transcript.slice(0, 240) : "— No transcript available for this range —")}
                    </div>
                  </div>
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
              >{isBusy ? "Clipping..." : "Clip All & Download ZIP"}</button>

              {!!clipMsg && <p className="text-green-400 text-sm mt-3">{clipMsg}</p>}
              {!!error && <p className="text-red-400 text-sm mt-3">{error}</p>}
            </>
          )}

          {/* footer */}
          <div className="mt-10 text-center text-[10px] text-gray-500 select-none">
            © {new Date().getFullYear()} ClipForge AI • Watermark: {watermarkOn ? wmText : "off"}
          </div>
        </div>

        {/* RIGHT: Collapsible AI assistant */}
        <div className={`${aiOpen ? "w-full md:w-[32rem]" : "w-0 md:w-0"} overflow-hidden transition-all duration-300`}>
          <div className="border border-[#27324A] bg-[#12182B] rounded-lg h-full flex flex-col">
            <div className="p-4 border-b border-[#27324A] flex items-center justify-between">
              <div className="font-semibold">🤖 ClipForge Assistant</div>
              <button
                onClick={()=>setAiOpen(false)}
                className="text-xs bg-[#24304A] hover:bg-[#2c3b5c] px-2 py-1 rounded"
              >Hide</button>
            </div>

            {/* template shortcuts in sidebar too */}
            <div className="p-3 border-b border-[#27324A]">
              <div className="flex flex-wrap gap-2">
                <button onClick={tplBestMoments} disabled={aiBusy} className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-sm">🎬 Moments</button>
                <button onClick={tplTitles} disabled={aiBusy} className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-sm">✍️ Titles</button>
                <button onClick={tplHooks} disabled={aiBusy} className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-sm">💬 Hooks</button>
                <button onClick={tplHashtags} disabled={aiBusy} className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-sm">#️⃣ Hashtags</button>
                <button onClick={tplSummarize} disabled={aiBusy} className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-sm">📝 Summary</button>
              </div>
            </div>

            {/* chat stream */}
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {aiMsgs.length === 0 && (
                <div className="text-white/60 text-sm">
                  Ask for summaries, titles, hooks—or “find the best 3 moments”.
                </div>
              )}
              {aiMsgs.map((m, i) => (
                <div key={i} className={`text-sm leading-6 ${m.role === 'assistant' ? 'text-white' : 'text-indigo-300'}`}>
                  <span className="opacity-70 mr-1">{m.role === 'assistant' ? 'AI:' : 'You:'}</span>
                  {m.content}
                </div>
              ))}
              <div ref={aiBottomRef} />
            </div>

            {/* input */}
            <div className="p-3 border-t border-[#27324A]">
              <div className="flex gap-2">
                <textarea
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  placeholder="Ask something about your transcript…"
                  className="flex-1 bg-[#0B1020] border border-[#27324A] rounded p-2 text-sm"
                  rows={2}
                />
                <button
                  onClick={() => { if (aiInput.trim()) { askAI(aiInput.trim()); setAiInput(""); } }}
                  disabled={aiBusy}
                  className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 h-[42px] self-end"
                >
                  {aiBusy ? 'Thinking…' : 'Ask AI'}
                </button>
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={()=>setAiMsgs([])}
                  className="text-xs bg-[#24304A] hover:bg-[#2c3b5c] px-2 py-1 rounded"
                >
                  Clear Chat
                </button>
                <button
                  onClick={()=>setAiOpen(false)}
                  className="text-xs bg-[#24304A] hover:bg-[#2c3b5c] px-2 py-1 rounded"
                >
                  Collapse
                </button>
              </div>
            </div>
          </div>
        </div>
        {!aiOpen && (
          <button
            onClick={()=>setAiOpen(true)}
            className="fixed right-4 bottom-4 md:right-6 md:bottom-6 bg-[#6C5CE7] hover:bg-[#5A4ED1] px-3 py-2 rounded-lg shadow-lg"
          >
            🤖 Open Assistant
          </button>
        )}
      </div>
    </div>
  );
}
