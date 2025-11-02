import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import logo from "./assets/react.svg";

const API_BASE = import.meta.env.VITE_API_BASE || "https://clipper-api-final-1.onrender.com";
const ACCEPT = "video/mp4,video/quicktime,video/x-matroska,video/webm,audio/*";
const VIDEO_DURATION = 300; // UI bar only

function timeToSeconds(t) {
  if (!t) return 0;
  const p = t.split(":").map(Number);
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
  if (p.length === 2) return p[0] * 60 + p[1];
  return Number(t) || 0;
}

export default function Clipper() {
  // --- auth guard ---
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) window.location.href = "/";
    })();
  }, []);

  // --- global state ---
  const [file, setFile] = useState(null);           // one uploader for all modes
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState("transcribe");   // "transcribe" | "autoclip" | "cliponly"

  // ux controls
  const [fastMode, setFastMode] = useState(true);
  const [previewSpeed, setPreviewSpeed] = useState(1);
  const [watermark, setWatermark] = useState(true);
  const [wmText, setWmText] = useState("@ClippedBySal");

  // results & AI
  const [transcript, setTranscript] = useState("");
  const [clips, setClips] = useState([{ start: "00:00:00", end: "00:00:10" }]);
  const [aiMsgs, setAiMsgs] = useState([]);
  const [aiInput, setAiInput] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  // op state
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");
  const [clipMsg, setClipMsg] = useState("");

  // previews: index -> {url, name}
  const [previews, setPreviews] = useState({});

  // processing log (side panel)
  const [log, setLog] = useState([]);
  const logRef = useRef(null);
  function pushLog(msg) {
    setLog(l => [...l, `${new Date().toLocaleTimeString()}  •  ${msg}`]);
  }
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  function resetMsgs() { setError(""); setClipMsg(""); }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  // =============== TRANSCRIBE / AUTOCLIP ===============
  async function actionUpload() {
    resetMsgs();
    setIsBusy(true);
    setLog([]);

    try {
      if (!file && !url.trim()) {
        setError("Choose a file or paste a URL.");
        return;
      }

      // 1) Transcribe (for transcribe or autoclip)
      if (mode === "transcribe" || mode === "autoclip") {
        pushLog("Uploading for transcription…");
        const fd = new FormData();
        if (url.trim()) fd.append("url", url.trim());
        else fd.append("file", file);

        const res = await fetch(`${API_BASE}/transcribe`, { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Transcription failed");
        setTranscript(data.text || "(no text)");
        pushLog("Transcription complete.");
      }

      // 2) If autoclip: call auto_clip and preload moments
      if (mode === "autoclip") {
        pushLog("Finding best moments…");
        const ac = new FormData();
        ac.append("transcript", transcript || "");
        ac.append("max_clips", "3");
        const r = await fetch(`${API_BASE}/auto_clip`, { method: "POST", body: ac });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Auto-clip failed");

        if (Array.isArray(j.clips) && j.clips.length) {
          setClips(j.clips.slice(0, 5).map(c => ({
            start: c.start || "00:00:00",
            end:   c.end   || "00:00:10",
            summary: c.summary || ""
          })));
          pushLog(`Loaded ${j.clips.length} suggested moments into your Clips list.`);
        } else {
          pushLog("No strong moments found. You can still set ranges manually.");
        }
      }

      // 3) If cliponly: do nothing here, user uses Clip buttons below
      if (mode === "cliponly") {
        pushLog("Clip-only flow: set your time ranges below, then Clip or Export as ZIP.");
      }
    } catch (e) {
      setError(e.message);
      pushLog(`⚠️ ${e.message}`);
    } finally {
      setIsBusy(false);
    }
  }

  // =============== AI HELPER ===============
  async function askAI(message) {
    try {
      setAiBusy(true);
      const fd = new FormData();
      fd.append("user_message", message);
      fd.append("transcript", transcript || "");
      fd.append("history", JSON.stringify(aiMsgs));
      const res = await fetch(`${API_BASE}/ai_chat`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI helper failed");

      setAiMsgs(m => [...m, { role: "user", content: message }, { role: "assistant", content: data.reply || "(no reply)" }]);
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
            summary: c.summary || ""
          }))
        );
        setAiMsgs(m => [...m, { role: "assistant", content: `I found ${data.clips.length} strong moments. Loaded into your Clip list.` }]);
      } else {
        setAiMsgs(m => [...m, { role: "assistant", content: "I couldn't find clear cut moments. Try another video." }]);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setAiBusy(false);
    }
  }

  // =============== CLIPPING ===============
  function addClip() {
    if (clips.length >= 5) return;
    setClips([...clips, { start: "00:00:00", end: "00:00:10" }]);
  }
  function updateClip(i, k, v) {
    const n = [...clips];
    n[i][k] = v;
    setClips(n);
  }
  function removeClip(i) {
    setClips(clips.filter((_, idx) => idx !== i));
    setPreviews(p => {
      const cp = { ...p };
      delete cp[i];
      return cp;
    });
  }
  function clearAll() {
    setClips([]);
    setPreviews({});
    setClipMsg("");
  }

  function downloadBlob(blob, filename) {
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u;
    a.download = filename || "download.bin";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(u);
  }
  function fname(original, start, end) {
    const base = (original || "video").replace(/\.[^.]+$/, "");
    return `${base}_${start.replaceAll(":", "-")}-${end.replaceAll(":", "-")}.mp4`;
  }

  async function clipOne(i) {
    try {
      resetMsgs();
      if (!file) return setError("Select or paste a video first.");
      const c = clips[i];
      if (!c?.start || !c?.end) return setError("Enter start & end times.");
      setIsBusy(true);
      pushLog(`Clipping segment ${i + 1}…`);

      const fd = new FormData();
      fd.append("file", file);
      fd.append("start", c.start.trim());
      fd.append("end", c.end.trim());
      fd.append("watermark", watermark ? wmText : "");
      fd.append("fast", fastMode ? "1" : "0");

      const res = await fetch(`${API_BASE}/clip`, { method: "POST", body: fd });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Clip failed");
      }
      const blob = await res.blob();

      // Preview first, user can download or discard
      const url = URL.createObjectURL(blob);
      setPreviews(p => ({ ...p, [i]: { url, name: fname(file?.name, c.start, c.end) } }));
      setClipMsg(`✅ Preview ready for clip ${i + 1}.`);
      pushLog(`Preview ready for clip ${i + 1}.`);
    } catch (e) {
      setError(e.message);
      pushLog(`⚠️ ${e.message}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function exportZip() {
    try {
      resetMsgs();
      if (!file) return setError("Select a video first.");
      if (clips.length === 0) return setError("No clips added.");
      setIsBusy(true);
      pushLog("Exporting all clips as ZIP…");

      const fd = new FormData();
      fd.append("file", file);
      fd.append("sections", JSON.stringify(clips));
      fd.append("watermark", watermark ? wmText : "");
      fd.append("fast", fastMode ? "1" : "0");

      const res = await fetch(`${API_BASE}/clip_multi`, { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Multi-clip failed");
      }
      const blob = await res.blob();
      downloadBlob(blob, "clips_bundle.zip");
      setClipMsg("✅ All clips processed — ZIP downloaded.");
      pushLog("ZIP download complete.");
    } catch (e) {
      setError(e.message);
      pushLog(`⚠️ ${e.message}`);
    } finally {
      setIsBusy(false);
    }
  }

  // UI helpers
  const headerButtons = useMemo(() => ([
    { key: "transcribe", label: "Transcribe" },
    { key: "autoclip",   label: "Auto Clip" },
    { key: "cliponly",   label: "Clip Only" },
  ]), []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B1020] via-[#12182B] to-[#1C2450] text-white">
      {/* Header */}
      <div className="border-b border-[#27324A] bg-[#0B1020]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="ClipForge AI" className="h-8 w-8" />
            <div className="text-lg font-semibold tracking-wide">ClipForge AI</div>
          </div>
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
      <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Left column */}
        <div>
          {/* Controls Row */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input
              type="file"
              accept={ACCEPT}
              onChange={e => setFile(e.target.files?.[0] || null)}
              className="block text-sm"
            />
            {file && <span className="text-xs text-gray-300">Selected: {file.name}</span>}
          </div>

          {/* Action buttons (Layout 1) */}
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {headerButtons.map(b => (
              <button
                key={b.key}
                onClick={() => setMode(b.key)}
                className={`px-3 py-2 rounded-lg border ${
                  mode === b.key ? "bg-[#6C5CE7] border-[#6C5CE7]" : "border-[#27324A] bg-[#12182B]"
                }`}
              >
                {b.label}
              </button>
            ))}

            <div className="ml-auto flex items-center gap-4 text-sm">
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
                  {[0.5,0.75,1,1.25,1.5,2].map(v=> <option key={v} value={v}>{v}×</option>)}
                </select>
              </label>
            </div>
          </div>

          {/* URL input (for transcribe/autoclip) */}
          {(mode !== "cliponly") && (
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Or paste a URL (YouTube/TikTok/MP3/MP4)</label>
              <input
                type="url"
                value={url}
                onChange={e=>setUrl(e.target.value)}
                placeholder="https://…"
                className="w-full bg-[#12182B] border border-[#27324A] rounded px-3 py-2 text-white"
              />
              <p className="text-xs text-gray-400 mt-1">If a URL is provided, the file picker is ignored.</p>
            </div>
          )}

          <button
            onClick={actionUpload}
            disabled={isBusy}
            className="w-full bg-[#6C5CE7] hover:bg-[#5A4ED1] text-white rounded-lg py-2 disabled:opacity-60"
          >
            {isBusy ? "Processing..." :
              mode === "transcribe" ? "Upload & Transcribe" :
              mode === "autoclip"   ? "Upload & Auto Clip" :
              "Use For Clip Only"
            }
          </button>

          {/* Transcript panel */}
          {(transcript && (mode !== "cliponly")) && (
            <div className="mt-5 border border-[#27324A] rounded-lg p-3 bg-[#12182B]">
              <div className="font-semibold mb-1">📝 Transcript</div>
              <div className="text-sm whitespace-pre-wrap leading-6 max-h-64 overflow-auto">{transcript}</div>
            </div>
          )}

          {/* Quick AI templates */}
          <div className="mt-6 flex flex-wrap gap-2">
            <button onClick={tplBestMoments} className="px-3 py-2 rounded bg-[#2B2F4A] hover:bg-[#3A3F63]">🎬 Best 3 Moments</button>
            <button onClick={tplTitles} className="px-3 py-2 rounded bg-[#2B2F4A] hover:bg-[#3A3F63]">✍️ Viral Titles</button>
            <button onClick={tplHooks} className="px-3 py-2 rounded bg-[#2B2F4A] hover:bg-[#3A3F63]">💬 Hooks</button>
            <button onClick={tplHashtags} className="px-3 py-2 rounded bg-[#2B2F4A] hover:bg-[#3A3F63]">#️⃣ Hashtags</button>
            <button onClick={tplSummarize} className="px-3 py-2 rounded bg-[#2B2F4A] hover:bg-[#3A3F63]">📝 Summary</button>
          </div>

          {/* Clips editor */}
          <div className="mt-6">
            <div className="mb-2 text-sm text-gray-300">Add up to 5 clip segments. Build previews then download or export ZIP.</div>

            {clips.map((c, idx) => (
              <div key={idx} className="border border-[#27324A] rounded-lg p-3 mb-4 bg-[#12182B]">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-sm text-white/80">🎬 Clip {idx + 1}</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => clipOne(idx)}
                      disabled={isBusy}
                      className="text-xs bg-[#6C5CE7] hover:bg-[#5A4ED1] text-white px-3 py-1 rounded disabled:opacity-60"
                    >Rebuild Preview</button>
                    <button
                      onClick={() => removeClip(idx)}
                      className="text-xs bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded"
                    >Delete</button>
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

                {/* timeline bar */}
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

                {/* snippet */}
                <div className="mt-3 text-xs text-gray-300 bg-[#0F172A] rounded p-2">
                  <div className="font-semibold mb-1">Snippet</div>
                  <div className="line-clamp-3">
                    {transcript ? transcript.slice(0, 240) : "— No transcript available for this range —"}
                  </div>
                </div>

                {/* Preview / Download */}
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                  <div className="text-xs text-gray-400">
                    {previews[idx]?.url ? (
                      <div className="space-y-2">
                        <video
                          src={previews[idx].url}
                          controls
                          playbackRate={previewSpeed}
                          className="w-full rounded-lg border border-[#27324A] bg-black"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              fetch(previews[idx].url).then(() =>
                                downloadBlob(new Blob([], { type:"application/octet-stream" })))
                            }}
                            className="hidden"
                          />
                          <button
                            onClick={() => {
                              // fetch blob from object URL to download properly
                              fetch(previews[idx].url)
                                .then(r => r.blob())
                                .then(b => downloadBlob(b, previews[idx].name || "clip.mp4"));
                            }}
                            className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700"
                          >
                            Download
                          </button>
                          <button
                            onClick={() => setPreviews(p => {
                              const cp = { ...p }; delete cp[idx]; return cp;
                            })}
                            className="px-3 py-1 rounded bg-gray-600 hover:bg-gray-700"
                          >
                            Discard Preview
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="italic">No preview yet — click “Rebuild Preview”.</div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <div className="flex flex-wrap items-center gap-2">
              <button onClick={addClip} disabled={clips.length>=5} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded disabled:opacity-50">
                + Add Clip
              </button>
              <button onClick={clearAll} className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded">Clear All</button>
              <button onClick={exportZip} disabled={isBusy || clips.length===0} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded disabled:opacity-60">
                Export All as ZIP
              </button>
            </div>

            {!!clipMsg && <p className="text-green-400 text-sm mt-3">{clipMsg}</p>}
            {!!error && <p className="text-red-400 text-sm mt-3">{error}</p>}
          </div>

          <div className="mt-10 text-center text-[10px] text-gray-500 select-none">
            © {new Date().getFullYear()} ClipForge AI • Watermark: {watermark ? wmText : "off"}
          </div>
        </div>

        {/* Right column: AI + Processing Log */}
        <div className="space-y-6">
          {/* AI Assistant */}
          <div className="border border-[#27324A] bg-[#12182B] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-lg">🤖 ClipForge Assistant</div>
              <div className="flex gap-2">
                <button onClick={tplBestMoments} className="px-3 py-1.5 rounded bg-[#2B2F4A] hover:bg-[#3A3F63]">🎬 Moments</button>
                <button onClick={tplTitles} className="px-3 py-1.5 rounded bg-[#2B2F4A] hover:bg-[#3A3F63]">✍️ Titles</button>
                <button onClick={tplHooks} className="px-3 py-1.5 rounded bg-[#2B2F4A] hover:bg-[#3A3F63]">💬 Hooks</button>
                <button onClick={tplHashtags} className="px-3 py-1.5 rounded bg-[#2B2F4A] hover:bg-[#3A3F63]">#️⃣ Hashtags</button>
                <button onClick={tplSummarize} className="px-3 py-1.5 rounded bg-[#2B2F4A] hover:bg-[#3A3F63]">📝 Summary</button>
              </div>
            </div>

            <div className="space-y-2 max-h-44 overflow-auto bg-black/20 rounded p-3">
              {aiMsgs.length === 0 && (
                <div className="text-white/60 text-sm">
                  Ask ClipForge AI to summarize, propose titles, find moments, or write hooks.
                </div>
              )}
              {aiMsgs.map((m, i) => (
                <div key={i} className={`text-sm leading-6 ${m.role === 'assistant' ? 'text-white' : 'text-indigo-300'}`}>
                  <span className="opacity-70 mr-1">{m.role === 'assistant' ? 'AI:' : 'You:'}</span>{m.content}
                </div>
              ))}
            </div>

            <div className="mt-3 flex gap-2">
              <textarea
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                placeholder="Ask something about your transcript…"
                className="flex-1 bg-black/30 border border-white/10 rounded p-2 text-sm"
                rows={2}
              />
              <button
                onClick={() => { if (aiInput.trim()) { askAI(aiInput.trim()); setAiInput(""); } }}
                disabled={aiBusy}
                className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 h-[42px] self-end"
              >
                {aiBusy ? "Thinking…" : "Ask AI"}
              </button>
            </div>
          </div>

          {/* Processing Log */}
          <div className="border border-[#27324A] bg-[#12182B] rounded-lg p-4">
            <div className="font-semibold text-lg mb-2">⚙️ Processing Log</div>
            <div ref={logRef} className="text-xs bg-black/20 rounded p-3 h-56 overflow-auto whitespace-pre-wrap leading-6">
              {log.length === 0 ? (
                <span className="opacity-60">Actions and status messages will appear here.</span>
              ) : log.join("\n")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
