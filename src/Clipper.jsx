// src/Clipper.jsx — Netflix grid, modal preview, per-clip transcript, AI helper (S1 foundation)
import { useEffect, useState, useRef } from "react";
import { supabase } from "./supabaseClient";
import logo from "./assets/react.svg";
import ClipCard from "./components/ClipCard.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "https://clipper-api-final-1.onrender.com";
const VIDEO_DURATION = 300; // visual ruler only

function timeToSeconds(t) {
  if (!t) return 0;
  const p = t.split(":").map(Number);
  if (p.length === 3) return p[0]*3600 + p[1]*60 + p[2];
  if (p.length === 2) return p[0]*60 + p[1];
  return Number(t) || 0;
}

export default function Clipper() {
  // ---------- auth guard ----------
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) window.location.href = "/";
    })();
  }, []);

  // ---------- state ----------
  const [mode, setMode] = useState("transcribe");
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [currentRecordId, setCurrentRecordId] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");
  const [clipMsg, setClipMsg] = useState("");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState("");
  const [upgrading, setUpgrading] = useState(false);

  const [clips, setClips] = useState([{ start: "00:00:00", end: "00:00:30", summary: "" }]);
  const [watermarkOn, setWatermarkOn] = useState(true);
  const [wmText, setWmText] = useState("@ClippedBySal");

  // results from /clip_multi
  const [generated, setGenerated] = useState([]); // [{start,end,preview_url,final_url,thumb_url,duration_text,duration_seconds}]

  // modal preview
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSrc, setPreviewSrc] = useState("");

  // AI helper (S1)
  const [aiOpen, setAiOpen] = useState(true);
  const [aiMsgs, setAiMsgs] = useState([]);
  const [aiInput, setAiInput] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const aiBottomRef = useRef(null);
  useEffect(() => { aiBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [aiMsgs]);

  const [copied, setCopied] = useState(false);

  const resetMessages = () => { setError(""); setClipMsg(""); };

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  async function handleUpgrade() {
    try {
      setUpgrading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const fd = new FormData();
      fd.append("email", user?.email || "");
      const res = await fetch(`${API_BASE}/billing/checkout`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.ok && data.url) {
        window.location.href = data.url;
      } else {
        setError("Could not start checkout. Please try again.");
        setShowUpgradeModal(false);
      }
    } catch (e) {
      setError("Checkout failed: " + e.message);
      setShowUpgradeModal(false);
    } finally {
      setUpgrading(false);
    }
  }

  // ---------- transcribe (file or URL) ----------
  async function handleTranscribe() {
  try {
    resetMessages();
    setIsBusy(true);

    const fd = new FormData();
    
    // ✅ Get user info from Supabase
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.email || "@ClippedBySal";
    
    fd.append("user_id", userId);

    // ✅ If we already generated clips, transcribe the FIRST preview clip
    if (generated.length > 0 && generated[0].preview_url) {
      fd.append("url", generated[0].preview_url);
    }
    // ✅ Otherwise allow raw upload / URL
    else if (url.trim()) {
      fd.append("url", url.trim()); 
    }
    else {
      if (!file) {
        setError("Upload a video or audio file first.");
        setIsBusy(false);
        return;
      }
      fd.append("file", file);
    }

    const res = await fetch(`${API_BASE}/transcribe`, {
      method: "POST",
      body: fd
    });

    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || "Transcription failed");

    setTranscript(data.text || "(no text)");
    
    // ✅ Set record ID directly from response
    if (data.record_id) {
      setCurrentRecordId(data.record_id);
      console.log("✅ Record ID saved:", data.record_id);
    }

    setAiMsgs(m => [
      ...m,
      { role: "assistant", content: "📝 Transcript is ready. Ask for titles, hooks, or best moments." }
    ]);

  } catch (e) {
    setError(e.message);
  } finally {
    setIsBusy(false);
  }
}

  // ---------- clip helpers ----------
  function secsToHMS(s) {
    s = Math.max(0, Math.round(s));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(r).padStart(2,"0")}`;
  }

  function addClip() {
    if (clips.length >= 5) return;
    // Start new clip from where the last one ends
    const lastEnd = clips.length > 0 ? timeToSeconds(clips[clips.length - 1].end) : 0;
    const newStart = lastEnd;
    const newEnd = newStart + 30;
    setClips([...clips, { start: secsToHMS(newStart), end: secsToHMS(newEnd), summary: "" }]);
  }
  function updateClip(i, k, v) {
    const n = [...clips];
    n[i][k] = v;
    // If start was changed and now end <= start, push end to start + 30s
    if (k === "start") {
      const startSec = timeToSeconds(v);
      const endSec = timeToSeconds(n[i].end);
      if (endSec <= startSec) {
        n[i].end = secsToHMS(startSec + 30);
      }
    }
    setClips(n);
  }
  function cancelClip(i) { setClips(clips.filter((_, idx) => idx !== i)); }
  function cancelAll() { setClips([]); setClipMsg(""); }

  function deriveDownloadName(original, start, end) {
    const base = (original || "video").replace(/\.[^.]+$/, "");
    return `${base}_${start.replaceAll(":","-")}-${end.replaceAll(":","-")}.mp4`;
  }
  function downloadUrl(href, filename) {
    const a = document.createElement("a");
    a.href = href;
    a.download = filename || "clip.mp4";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function handleClipAll() {
    try {
      resetMessages();
      if (!file && !url) return setError("Select a video file or paste a URL first.");
      if (clips.length === 0) return setError("No clips added.");
      setIsBusy(true);

      const fd = new FormData();
      if (file) fd.append("file", file);
      if (!file && url) fd.append("url", url.trim());
      fd.append("sections", JSON.stringify(clips.map(({start,end})=>({start, end}))));
      fd.append("watermark", watermarkOn ? "1" : "0");
      fd.append("wm_text", wmText);
      fd.append("preview_480", "1");
      fd.append("final_1080", "0");

      // send user identity for history logging
      const { data: { user: clipUser } } = await supabase.auth.getUser();
      fd.append("user_id", clipUser?.email || "anonymous");

      const res = await fetch(`${API_BASE}/clip_multi`, { method: "POST", body: fd });
      const data = await res.json();
      if (res.status === 403 && data.upgrade) {
        setUpgradeMsg(data.error || "Upgrade to continue clipping.");
        setShowUpgradeModal(true);
        setIsBusy(false);
        return;
      }
      if (!res.ok || !data.ok) throw new Error(data.error || "Multi-clip failed");

      setGenerated(Array.isArray(data.items) ? data.items : []);
      if (data.record_id) {
        setCurrentRecordId(data.record_id);
        console.log("✅ Clip record ID:", data.record_id);
      }
      setClipMsg("✅ All clips processed.");
      setMode("clip"); // jump to clip view
    } catch (e) { setError(e.message); }
    finally { setIsBusy(false); }
  }

  // per-clip transcript (URL → Whisper)
async function transcribeClipByUrl(clipUrl) {
  try {
    if (!clipUrl) throw new Error("No clip URL provided.");
    setIsBusy(true);

    const fd = new FormData();
    fd.append("clip_url", clipUrl);   // <-- NEW PARAM NAME

    const res = await fetch(`${API_BASE}/transcribe_clip`, {  // <-- NEW ENDPOINT
      method: "POST",
      body: fd,
    });

    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || "Clip transcription failed");

    setClipMsg("📝 Clip transcript ready (see Transcript panel)");
    setTranscript(data.text || "(no text)");
    setMode("transcribe");
  } catch (e) {
    setError(e.message);
  } finally {
    setIsBusy(false);
  }
}
  async function saveAIInsights(type, content) {
  try {
    if (!currentRecordId) {
      console.log("⚠️ No record ID - skipping save");
      return;
    }

    const fd = new FormData();
    fd.append("record_id", currentRecordId);
    fd.append(type, content);

    const res = await fetch(`${API_BASE}/history/update`, {
      method: "POST",
      body: fd
    });

    const data = await res.json();
    if (data.ok) {
      console.log(`✅ Saved ${type} to database`);
    }
  } catch (e) {
    console.error("Error saving to DB:", e);
  }
}
  // ---------- AI helper (S1) ----------
 async function askAI(message, insightType = null) {
  if (!message.trim()) return;
  try {
    setAiBusy(true);
    const fd = new FormData();
    fd.append("user_message", message);
    fd.append("transcript", transcript || "");
    fd.append("history", JSON.stringify(aiMsgs));

    const res = await fetch(`${API_BASE}/ai_chat`, {
      method: "POST",
      body: fd
    });

    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || "AI helper failed");

    const aiReply = data.reply || "(no reply)";

    setAiMsgs(m => [
      ...m,
      { role: "user", content: message },
      { role: "assistant", content: aiReply },
    ]);

    // ✅ Auto-save AI responses to database
    if (insightType && currentRecordId) {
      await saveAIInsights(insightType, aiReply);
    }

  } catch (e) {
    setError(e.message);
  } finally {
    setAiBusy(false);
  }
}

  function tplSummarize() {
  if (!transcript) return setError("Transcribe your video first.");
  askAI("Summarize the transcript into 5 bullet points with key takeaways.", "summary");
}

function tplTitles() {
  if (!transcript) return setError("Transcribe your video first.");
  askAI("Write 5 viral, punchy titles (max 60 chars each) based on this transcript.", "titles");
}

function tplHooks() {
  if (!transcript) return setError("Transcribe your video first.");
  askAI("Give me 7 short opening hooks (under 80 chars) tailored for Reels & Shorts.", "hooks");
}

function tplHashtags() {
  if (!transcript) return setError("Transcribe your video first.");
  askAI("Suggest 10 relevant hashtags + 10 SEO keywords for this content.", "hashtags");
}
  async function tplBestMoments() {
    try {
      if (!transcript) return setError("Transcribe your video first.");
      setAiBusy(true);
      const fd = new FormData();
      fd.append("transcript", transcript);
      fd.append("max_clips", "3");
      const res = await fetch(`${API_BASE}/auto_clip`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Auto-clip failed");
      if (Array.isArray(data.clips) && data.clips.length) {
        setClips(
          data.clips.slice(0, 5).map(c => ({
            start: c.start || "00:00:00",
            end: c.end || "00:00:10",
            summary: c.summary || "",
          }))
        );
        setAiMsgs(m => [...m, { role: "assistant", content: `🎯 Loaded ${Math.min(5, data.clips.length)} suggested moments into your clip list.` }]);
        setMode("clip");
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
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-indigo-50 to-slate-200 text-slate-800">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="ClipForge AI" className="h-8 w-8" />
            <div className="text-lg font-semibold tracking-wide text-slate-800">ClipForge AI</div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <label className="flex items-center gap-2 text-slate-600">
              <input type="checkbox" checked={watermarkOn} onChange={e=>setWatermarkOn(e.target.checked)} />
              Watermark
            </label>
            {watermarkOn && (
              <input
                value={wmText}
                onChange={e=>setWmText(e.target.value)}
                placeholder="@YourHandle"
                className="bg-slate-100 border border-slate-300 text-slate-800 text-xs rounded-md px-2 py-1 w-40 outline-none"
              />
            )}
            <button
              onClick={()=>setAiOpen(v=>!v)}
              className="bg-slate-100 hover:bg-slate-200 border border-slate-300 px-3 py-1 rounded text-slate-700"
              title={aiOpen ? "Hide AI Assistant" : "Show AI Assistant"}
            >
              {aiOpen ? "Hide Assistant" : "Show Assistant"}
            </button>
            <a
              href="/dashboard"
              className="bg-slate-100 hover:bg-slate-200 border border-slate-300 px-3 py-1 rounded text-slate-700"
            >
              📋 History
            </a>
            <button
              onClick={() => { setUpgradeMsg("Unlock unlimited clips for $9.99/month."); setShowUpgradeModal(true); }}
              className="bg-emerald-500 hover:bg-emerald-600 px-3 py-1 rounded text-white font-medium"
            >
              ⚡ Upgrade
            </button>
            <button onClick={handleLogout} className="bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded text-slate-800">
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-6">
        {/* LEFT */}
        <div className="flex-1">
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              className={`px-4 py-2 rounded-lg border font-medium ${mode==="transcribe" ? "bg-indigo-600 border-indigo-600 text-slate-800" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"}`}
              onClick={()=>setMode("transcribe")}
            >Transcribe</button>
            <button
              className={`px-4 py-2 rounded-lg border font-medium ${mode==="clip" ? "bg-indigo-600 border-indigo-600 text-slate-800" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"}`}
              onClick={()=>setMode("clip")}
            >Clip</button>
          </div>

          {/* File upload */}
          <div className="mb-4">
            <label className="block w-full border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors bg-white">
              <div className="text-2xl mb-1">📁</div>
              <div className="text-sm font-medium text-slate-700">{file ? file.name : "Click to upload video or audio"}</div>
              <div className="text-xs text-slate-400 mt-1">MP4, MOV, MP3, WAV supported</div>
              <input type="file" accept="audio/*,video/*" onChange={e=>setFile(e.target.files?.[0]||null)} className="hidden" />
            </label>
          </div>

          {/* === TRANSCRIBE MODE === */}
          {mode==="transcribe" && (
            <>
              <div className="mb-3">
                <label className="block text-sm font-medium text-slate-700 mb-1">Or paste a direct video/audio URL (MP4, MP3, TikTok, etc.)</label>
                <input
                  type="url"
                  value={url}
                  onChange={e=>setUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-400"
                />
                <p className="text-xs text-slate-400 mt-1">If a URL is provided, the file picker is ignored.</p>
              </div>

              <div className="mb-4">
                <TemplateBar />
              </div>

              <button
                onClick={handleTranscribe}
                disabled={isBusy}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 disabled:opacity-60"
              >{isBusy ? "Processing..." : "Upload & Transcribe"}</button>

              {!!transcript && (
                <div className="mt-5 border border-slate-200 rounded-lg p-3 bg-white relative">
                  <div className="font-semibold mb-1 pr-24">📝 Transcript</div>
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(transcript);
                        setCopied(true);
                        setTimeout(()=>setCopied(false), 1500);
                      } catch {
                        setError("Clipboard blocked — select text and copy manually.");
                      }
                    }}
                    className="absolute top-3 right-3 text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded"
                    title="Copy transcript"
                  >
                    {copied ? "Copied ✅" : "Copy"}
                  </button>
                  <div className="text-sm whitespace-pre-wrap leading-6 max-h-64 overflow-auto">{transcript}</div>
                </div>
              )}
            </>
          )}

          {/* === CLIP MODE === */}
          {mode==="clip" && (
            <>
              <div className="mb-3">
                <label className="block text-sm font-medium text-slate-700 mb-1">Or paste a direct video/audio URL (MP4, MP3, TikTok, etc.)</label>
                <input
                  type="url"
                  value={url}
                  onChange={e=>setUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-400"
                />
                <p className="text-xs text-slate-400 mt-1">If a URL is provided, the file picker is ignored.</p>
              </div>

              <div className="mb-3 text-sm text-slate-400">
                Add up to 5 clip segments. Clip all at once to get previews (no page change).
              </div>

              <div className="mb-4">
                <TemplateBar />
              </div>

              {/* form for creating sections */}
              {clips.map((c, idx)=>(
                <div key={idx} className="border border-slate-200 rounded-lg p-3 mb-3 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-sm text-slate-700">🎬 Clip {idx+1}</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={()=>cancelClip(idx)}
                        disabled={isBusy}
                        className="text-xs bg-gray-500 hover:bg-gray-600 text-slate-800 px-2 py-1 rounded"
                      >Cancel</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <input
                      type="text"
                      value={c.start}
                      onChange={e=>updateClip(idx,"start",e.target.value)}
                      placeholder="Start (HH:MM:SS)"
                      className="rounded border border-slate-200 bg-slate-50 text-sm px-2 py-1 text-slate-800"
                    />
                    <input
                      type="text"
                      value={c.end}
                      onChange={e=>updateClip(idx,"end",e.target.value)}
                      placeholder="End (HH:MM:SS)"
                      className="rounded border border-slate-200 bg-slate-50 text-sm px-2 py-1 text-slate-800"
                    />
                  </div>

                  <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden mb-2">
                    {(() => {
                      const s = timeToSeconds(c.start);
                      const e = timeToSeconds(c.end);
                      const total = VIDEO_DURATION;
                      const sp = Math.min((s/total)*100, 100);
                      const ep = Math.min((e/total)*100, 100);
                      const w = Math.max(ep - sp, 2);
                      return <div className="absolute h-full bg-indigo-600" style={{ left:`${sp}%`, width:`${w}%` }} />;
                    })()}
                  </div>
                  <p className="text-xs text-slate-400 text-center">{c.start} → {c.end}</p>

                  <div className="mt-3 text-xs text-gray-300 bg-slate-50 rounded p-2">
                    <div className="font-semibold mb-1">Snippet</div>
                    <div className="line-clamp-3">
                      {c.summary || (transcript ? transcript.slice(0, 240) : "— No transcript available for this range —")}
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex justify-between items-center mb-4">
                <button onClick={addClip} disabled={clips.length>=5} className="bg-emerald-600 hover:bg-emerald-700 text-slate-800 px-4 py-2 rounded disabled:opacity-50">
                  + Add Clip
                </button>
                <button onClick={cancelAll} className="bg-gray-500 hover:bg-gray-600 text-slate-800 px-3 py-2 rounded">
                  Cancel All
                </button>
              </div>

              <button
                onClick={handleClipAll}
                disabled={isBusy || clips.length===0}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 disabled:opacity-60"
              >{isBusy ? "Clipping..." : "Clip All"}</button>

              {!!clipMsg && <p className="text-emerald-600 text-sm mt-3">{clipMsg}</p>}
              {!!error && <p className="text-red-500 text-sm mt-3">{error}</p>}

              {/* Generated Clips — Netflix grid */}
              {generated.length > 0 && (
                <div className="mt-8">
                  <h3 className="font-semibold mb-3">Generated Clips</h3>
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {generated.map((g, i) => (
                      <ClipCard
                        key={`${g.preview_url || g.final_url || i}`}
                        index={i}
                        start={g.start}
                        end={g.end}
                        durationSec={g.duration_seconds}
                        durationText={g.duration_text}
                        thumbUrl={g.thumb_url}
                        previewUrl={g.preview_url}
                        finalUrl={g.final_url}
                        onPreview={(src) => { setPreviewSrc(src); setPreviewOpen(true); }}
                        onDownload={(u, s, e) => downloadUrl(u, deriveDownloadName(file?.name || "clip", s, e))}
                        onTranscript={(u) => transcribeClipByUrl(u)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="mt-10 text-center text-[10px] text-slate-400 select-none">
            © {new Date().getFullYear()} ClipForge AI • Watermark: {watermarkOn ? wmText : "off"}
          </div>
        </div>

        {/* RIGHT: AI assistant */}
        <div className={`${aiOpen ? "w-full md:w-[32rem]" : "w-0 md:w-0"} overflow-hidden transition-all duration-300`}>
          <div className="border border-slate-200 bg-white rounded-lg h-full flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="font-semibold">🤖 ClipForge Assistant</div>
              <button
                onClick={()=>setAiOpen(false)}
                className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded"
              >Hide</button>
            </div>

            <div className="p-3 border-b border-slate-200">
              <div className="flex flex-wrap gap-2">
                <button onClick={tplBestMoments} disabled={aiBusy} className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-sm">🎬 Moments</button>
                <button onClick={tplTitles}      disabled={aiBusy} className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-sm">✍️ Titles</button>
                <button onClick={tplHooks}       disabled={aiBusy} className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-sm">💬 Hooks</button>
                <button onClick={tplHashtags}    disabled={aiBusy} className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-sm">#️⃣ Hashtags</button>
                <button onClick={tplSummarize}   disabled={aiBusy} className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-sm">📝 Summary</button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-3">
              {aiMsgs.length === 0 && (
                <div className="text-slate-500 text-sm">
                  Ask for summaries, titles, hooks—or “find the best 3 moments”.
                </div>
              )}
              {aiMsgs.map((m, i) => (
                <div key={i} className={`text-sm leading-6 ${m.role === 'assistant' ? 'text-slate-800' : 'text-indigo-700'}`}>
                  <span className="opacity-70 mr-1">{m.role === 'assistant' ? 'AI:' : 'You:'}</span>
                  {m.content}
                </div>
              ))}
              <div ref={aiBottomRef} />
            </div>

            <div className="p-3 border-t border-slate-200">
              <div className="flex gap-2">
                <textarea
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  placeholder="Ask something about your transcript…"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded p-2 text-sm"
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
                  className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded"
                >
                  Clear Chat
                </button>
                <button
                  onClick={()=>setAiOpen(false)}
                  className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded"
                >
                  Collapse
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade success banner */}
      {new URLSearchParams(window.location.search).get("upgrade") === "success" && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-6 py-3 rounded-xl shadow-lg font-medium">
          🎉 You're now on ClipForge Pro! Unlimited clips unlocked.
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">⚡</div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Upgrade to Pro</h2>
              <p className="text-slate-500 text-sm">{upgradeMsg}</p>
            </div>

            <div className="bg-indigo-50 rounded-xl p-4 mb-6 border border-indigo-100">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-slate-800">ClipForge Pro</span>
                <span className="text-2xl font-bold text-indigo-600">$9.99<span className="text-sm font-normal text-slate-500">/mo</span></span>
              </div>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> 7-day free trial — no charge today</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Unlimited clips per day</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> AI hooks, titles & hashtags</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Full transcript history</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Cancel anytime</li>
              </ul>
            </div>

            <button
              onClick={handleUpgrade}
              disabled={upgrading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl mb-3 transition-colors"
            >
              {upgrading ? "Redirecting to checkout..." : "Start Free Trial →"}
            </button>
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="w-full text-slate-400 hover:text-slate-600 text-sm py-2"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}

      {/* Modal Preview (same page) */}
      {previewOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 w-[90vw] max-w-3xl">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">Preview</div>
              <button
                onClick={()=>{ setPreviewOpen(false); setPreviewSrc(""); }}
                className="px-2 py-1 text-sm rounded bg-slate-100 hover:bg-slate-200"
              >
                Close
              </button>
            </div>
            <video
              key={previewSrc}
              src={previewSrc}
              controls
              playsInline
              className="w-full rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
}
