import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import logo from "./assets/react.svg";

const API_BASE = import.meta.env.VITE_API_BASE || "https://clipper-api-final-1.onrender.com";
const VIDEO_DURATION = 300;

function timeToSeconds(t) {
  if (!t) return 0;
  const p = t.split(":").map(Number);
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
  if (p.length === 2) return p[0] * 60 + p[1];
  return Number(t) || 0;
}

export default function Clipper() {
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [clips, setClips] = useState([
    { start: "00:00:00", end: "00:00:10", summary: "", previewUrl: "", exporting: false },
  ]);

  const [watermarkOn, setWatermarkOn] = useState(true);
  const [wmText, setWmText] = useState("@ClippedBySal");
  const [fastMode, setFastMode] = useState(true);
  const [exportHD, setExportHD] = useState(false);
  const [previewSpeed, setPreviewSpeed] = useState(1);

  const [aiMsgs, setAiMsgs] = useState([]);
  const [aiInput, setAiInput] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  const videoRefs = useRef({});

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) window.location.href = "/";
    })();
  }, []);

  function resetMessages() {
    setError("");
    setNotice("");
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  async function handleTranscribe() {
    try {
      resetMessages();
      setIsBusy(true);
      const fd = new FormData();
      if (url.trim()) {
        fd.append("url", url.trim());
      } else {
        if (!file) {
          setError("Choose a file or paste a URL.");
          setIsBusy(false);
          return;
        }
        fd.append("file", file);
      }
      const res = await fetch(`${API_BASE}/transcribe`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transcription failed");
      setTranscript(data.text || "(no text)");
      setNotice("Transcript ready.");
    } catch (e) {
      setError(e.message || "Transcription error");
    } finally {
      setIsBusy(false);
    }
  }

  function addClip() {
    if (clips.length >= 5) return;
    setClips((c) => [
      ...c,
      { start: "00:00:00", end: "00:00:10", summary: "", previewUrl: "", exporting: false },
    ]);
  }

  function updateClip(i, key, val) {
    setClips((prev) => {
      const n = [...prev];
      n[i] = { ...n[i], [key]: val };
      return n;
    });
  }

  function removeClip(i) {
    setClips((prev) => prev.filter((_, idx) => idx !== i));
  }

  function clearAllClips() {
    setClips([]);
    setNotice("");
  }

  function deriveName(original, start, end, suffix = ".mp4") {
    const base = (original || "video").replace(/\.[^.]+$/, "");
    return `${base}_${start.replaceAll(":", "-")}-${end.replaceAll(":", "-")}${suffix}`;
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

  async function requestClipBlob({ start, end }) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("start", start.trim());
    fd.append("end", end.trim());
    fd.append("watermark", watermarkOn ? "1" : "0");
    fd.append("wm_text", wmText);
    fd.append("fast", fastMode ? "1" : "0");
    fd.append("hd", exportHD ? "1" : "0");
    const res = await fetch(`${API_BASE}/clip`, { method: "POST", body: fd });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Clip failed");
    }
    return res.blob();
  }

  async function handlePreview(i) {
    try {
      resetMessages();
      if (!file) {
        setError("Select a video first.");
        return;
      }
      const c = clips[i];
      if (!c?.start || !c?.end) {
        setError("Enter start and end times.");
        return;
      }
      updateClip(i, "exporting", true);
      const blob = await requestClipBlob(c);
      const url = URL.createObjectURL(blob);
      updateClip(i, "previewUrl", url);
      setNotice(`Preview ready for clip ${i + 1}.`);
      setTimeout(() => {
        const v = videoRefs.current[i];
        if (v) {
          v.playbackRate = previewSpeed || 1;
        }
      }, 50);
    } catch (e) {
      setError(e.message);
    } finally {
      updateClip(i, "exporting", false);
    }
  }

  async function handleDownload(i) {
    try {
      resetMessages();
      const c = clips[i];
      if (!file) {
        setError("Select a video first.");
        return;
      }
      if (!c?.start || !c?.end) {
        setError("Enter start and end times.");
        return;
      }
      updateClip(i, "exporting", true);
      if (c.previewUrl) {
        const r = await fetch(c.previewUrl);
        const b = await r.blob();
        downloadBlob(b, deriveName(file?.name, c.start, c.end));
      } else {
        const blob = await requestClipBlob(c);
        downloadBlob(blob, deriveName(file?.name, c.start, c.end));
      }
      setNotice(`Downloaded clip ${i + 1}.`);
    } catch (e) {
      setError(e.message);
    } finally {
      updateClip(i, "exporting", false);
    }
  }

  function discardPreview(i) {
    const c = clips[i];
    if (c?.previewUrl) {
      URL.revokeObjectURL(c.previewUrl);
    }
    updateClip(i, "previewUrl", "");
  }

  async function handleZipAll() {
    try {
      resetMessages();
      if (!file) {
        setError("Select a video first.");
        return;
      }
      if (clips.length === 0) {
        setError("Add at least one clip.");
        return;
      }
      setIsBusy(true);
      const fd = new FormData();
      fd.append("file", file);
      fd.append(
        "sections",
        JSON.stringify(
          clips.map(({ start, end }) => ({ start: start.trim(), end: end.trim() }))
        )
      );
      fd.append("watermark", watermarkOn ? "1" : "0");
      fd.append("wm_text", wmText);
      fd.append("fast", fastMode ? "1" : "0");
      fd.append("hd", exportHD ? "1" : "0");
      const res = await fetch(`${API_BASE}/clip_multi`, { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "ZIP export failed");
      }
      const blob = await res.blob();
      downloadBlob(blob, "clips_bundle.zip");
      setNotice("ZIP downloaded.");
    } catch (e) {
      setError(e.message);
    } finally {
      setIsBusy(false);
    }
  }

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
      setAiMsgs((m) => [...m, { role: "user", content: message }, { role: "assistant", content: data.reply || "(no reply)" }]);
    } catch (e) {
      setError(e.message);
    } finally {
      setAiBusy(false);
    }
  }

  async function tplBestMoments() {
    try {
      if (!transcript) {
        setError("Transcribe first or paste a URL.");
        return;
      }
      setAiBusy(true);
      const fd = new FormData();
      fd.append("transcript", transcript);
      fd.append("max_clips", "3");
      const res = await fetch(`${API_BASE}/auto_clip`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Auto-clip failed");
      if (Array.isArray(data.clips) && data.clips.length) {
        setClips(
          data.clips.slice(0, 5).map((c) => ({
            start: c.start || "00:00:00",
            end: c.end || "00:00:10",
            summary: c.summary || "",
            previewUrl: "",
            exporting: false,
          }))
        );
        setAiMsgs((m) => [...m, { role: "assistant", content: `Loaded ${Math.min(5, data.clips.length)} suggested moments into your list.` }]);
      } else {
        setAiMsgs((m) => [...m, { role: "assistant", content: "I couldn't find clear moments. Try a longer or different transcript." }]);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setAiBusy(false);
    }
  }

  function tplTitles() {
    if (!transcript) {
      setError("Transcribe first or paste a URL.");
      return;
    }
    askAI("Write 5 viral, punchy titles (max 60 chars each) based on this transcript.");
  }

  function tplHooks() {
    if (!transcript) {
      setError("Transcribe first or paste a URL.");
      return;
    }
    askAI("Give me 7 short opening hooks (under 80 chars) tailored for Shorts/TikTok.");
  }

  function tplHashtags() {
    if (!transcript) {
      setError("Transcribe first or paste a URL.");
      return;
    }
    askAI("Suggest 10 relevant hashtags + 10 SEO keywords for this content.");
  }

  function tplSummarize() {
    if (!transcript) {
      setError("Transcribe first or paste a URL.");
      return;
    }
    askAI("Summarize the transcript into 5 bullet points with key takeaways.");
  }

  const layoutTwoCols = useMemo(() => true, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B1020] via-[#12182B] to-[#1C2450] text-white">
      <div className="border-b border-[#27324A] bg-[#0B1020]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="ClipForge AI" className="h-8 w-8" />
            <div className="text-lg font-semibold tracking-wide">ClipForge AI</div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={watermarkOn} onChange={(e) => setWatermarkOn(e.target.checked)} />
              Watermark
            </label>
            {watermarkOn && (
              <input
                value={wmText}
                onChange={(e) => setWmText(e.target.value)}
                placeholder="@YourHandle"
                className="bg-[#12182B] border border-[#27324A] text-white text-xs rounded-md px-2 py-1 w-40 outline-none"
              />
            )}
            <button onClick={logout} className="bg-[#6C5CE7] hover:bg-[#5A4ED1] px-3 py-1 rounded text-white">
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <div className={layoutTwoCols ? "grid grid-cols-1 lg:grid-cols-[1.6fr,1fr] gap-6" : ""}>
          <div className="space-y-6">
            <div className="border border-[#27324A] rounded-xl p-4 bg-[#12182B]">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="text-base font-semibold">Transcript</div>
                <div className="flex items-center gap-5 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={fastMode} onChange={(e) => setFastMode(e.target.checked)} />
                    Instant clip
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={exportHD} onChange={(e) => setExportHD(e.target.checked)} />
                    Export 1080p
                  </label>
                  <label className="flex items-center gap-2">
                    Preview speed
                    <select
                      value={previewSpeed}
                      onChange={(e) => setPreviewSpeed(Number(e.target.value))}
                      className="bg-[#0B1020] border border-[#27324A] rounded-md px-2 py-1"
                    >
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map((v) => (
                        <option key={v} value={v}>
                          {v}×
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-[1fr,auto]">
                <input
                  type="file"
                  accept="audio/*,video/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-xs"
                />
                <button
                  onClick={handleTranscribe}
                  disabled={isBusy}
                  className="bg-[#6C5CE7] hover:bg-[#5A4ED1] text-white px-4 py-2 rounded disabled:opacity-60"
                >
                  {isBusy ? "Processing…" : "Upload & Transcribe"}
                </button>
              </div>

              <div className="mt-3">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Or paste a URL (YouTube/TikTok/MP3/MP4)…"
                  className="w-full bg-[#0B1020] border border-[#27324A] rounded px-3 py-2 text-white text-sm"
                />
              </div>

              {transcript && (
                <div className="mt-4 border border-[#27324A] rounded-lg p-3 bg-[#0B1020] max-h-56 overflow-auto text-sm whitespace-pre-wrap leading-6">
                  {transcript}
                </div>
              )}
            </div>

            <div className="border border-[#27324A] rounded-xl p-4 bg-[#12182B]">
              <div className="flex items-center justify-between mb-3">
                <div className="text-base font-semibold">Clips</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={addClip}
                    disabled={clips.length >= 5}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded disabled:opacity-50 text-sm"
                  >
                    + Add Clip
                  </button>
                  <button onClick={clearAllClips} className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm">
                    Clear All
                  </button>
                  <button
                    onClick={handleZipAll}
                    disabled={isBusy || clips.length === 0 || !file}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded disabled:opacity-60 text-sm"
                  >
                    Export All as ZIP
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {clips.map((c, idx) => {
                  const s = timeToSeconds(c.start);
                  const e = timeToSeconds(c.end);
                  const sp = Math.min((s / VIDEO_DURATION) * 100, 100);
                  const ep = Math.min((e / VIDEO_DURATION) * 100, 100);
                  const w = Math.max(ep - sp, 2);
                  return (
                    <div key={idx} className="border border-[#27324A] rounded-lg p-3 bg-[#0B1020]">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium opacity-80">🎬 Clip {idx + 1}</div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handlePreview(idx)}
                            disabled={c.exporting || !file}
                            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded disabled:opacity-60"
                          >
                            {c.exporting ? "Processing…" : c.previewUrl ? "Rebuild Preview" : "Preview"}
                          </button>
                          <button
                            onClick={() => handleDownload(idx)}
                            disabled={c.exporting || !file}
                            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded disabled:opacity-60"
                          >
                            Download
                          </button>
                          <button
                            onClick={() => discardPreview(idx)}
                            disabled={!c.previewUrl}
                            className="text-xs bg-slate-600 hover:bg-slate-700 text-white px-3 py-1.5 rounded disabled:opacity-50"
                          >
                            Discard Preview
                          </button>
                          <button
                            onClick={() => removeClip(idx)}
                            className="text-xs bg-gray-500 hover:bg-gray-600 text-white px-3 py-1.5 rounded"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        <input
                          type="text"
                          value={c.start}
                          onChange={(e) => updateClip(idx, "start", e.target.value)}
                          placeholder="Start (HH:MM:SS)"
                          className="rounded border border-[#27324A] bg-[#0B1020] text-sm px-2 py-2 text-white"
                        />
                        <input
                          type="text"
                          value={c.end}
                          onChange={(e) => updateClip(idx, "end", e.target.value)}
                          placeholder="End (HH:MM:SS)"
                          className="rounded border border-[#27324A] bg-[#0B1020] text-sm px-2 py-2 text-white"
                        />
                      </div>

                      <div className="relative h-2 bg-[#27324A] rounded-full overflow-hidden my-3">
                        <div className="absolute h-full bg-[#6C5CE7]" style={{ left: `${sp}%`, width: `${w}%` }} />
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-[1fr,0.9fr] gap-3">
                        <div className="text-xs text-gray-300 bg-[#12182B] rounded p-2">
                          <div className="font-semibold mb-1">Snippet</div>
                          <div className="line-clamp-3">
                            {transcript ? transcript.slice(0, 280) : "— No transcript available —"}
                          </div>
                        </div>

                        <div className="bg-black/30 rounded p-2">
                          {c.previewUrl ? (
                            <video
                              ref={(el) => (videoRefs.current[idx] = el)}
                              src={c.previewUrl}
                              controls
                              className="w-full rounded"
                              onLoadedMetadata={(ev) => {
                                try {
                                  ev.currentTarget.playbackRate = previewSpeed || 1;
                                } catch {}
                              }}
                            />
                          ) : (
                            <div className="text-xs text-white/60 h-full grid place-items-center">
                              No preview yet. Click Preview.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="border border-[#27324A] rounded-xl p-4 bg-[#12182B]">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-lg flex items-center gap-2">🤖 AI Helper</div>
                <div className="hidden md:flex gap-2">
                  <button
                    onClick={tplBestMoments}
                    className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                    disabled={aiBusy}
                  >
                    🎬 Best 3 Moments
                  </button>
                  <button
                    onClick={tplTitles}
                    className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50"
                    disabled={aiBusy}
                  >
                    ✍️ Viral Titles
                  </button>
                  <button
                    onClick={tplHooks}
                    className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50"
                    disabled={aiBusy}
                  >
                    💬 Hooks
                  </button>
                  <button
                    onClick={tplHashtags}
                    className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50"
                    disabled={aiBusy}
                  >
                    #️⃣ Hashtags
                  </button>
                  <button
                    onClick={tplSummarize}
                    className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50"
                    disabled={aiBusy}
                  >
                    📝 Summary
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-56 overflow-auto bg-black/20 rounded p-3">
                {aiMsgs.length === 0 && <div className="text-white/60 text-sm">Ask ClipForge AI to summarize, propose titles, find moments, or write hooks.</div>}
                {aiMsgs.map((m, i) => (
                  <div key={i} className={`text-sm leading-6 ${m.role === "assistant" ? "text-white" : "text-indigo-300"}`}>
                    <span className="opacity-70 mr-1">{m.role === "assistant" ? "AI:" : "You:"}</span>
                    {m.content}
                  </div>
                ))}
              </div>

              <div className="mt-3 flex gap-2">
                <textarea
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder="Ask something about your transcript…"
                  className="flex-1 bg-black/30 border border-white/10 rounded p-2 text-sm"
                  rows={2}
                />
                <button
                  onClick={() => {
                    if (aiInput.trim()) {
                      askAI(aiInput.trim());
                      setAiInput("");
                    }
                  }}
                  disabled={aiBusy}
                  className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 h-[42px] self-end"
                >
                  {aiBusy ? "Thinking…" : "Ask AI"}
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 md:hidden">
                <button onClick={tplBestMoments} className="px-3 py-2 rounded bg-indigo-600">
                  🎬 Moments
                </button>
                <button onClick={tplTitles} className="px-3 py-2 rounded bg-slate-700">
                  ✍️ Titles
                </button>
                <button onClick={tplHooks} className="px-3 py-2 rounded bg-slate-700">
                  💬 Hooks
                </button>
                <button onClick={tplHashtags} className="px-3 py-2 rounded bg-slate-700">
                  #️⃣ Hashtags
                </button>
                <button onClick={tplSummarize} className="px-3 py-2 rounded bg-slate-700 col-span-2">
                  📝 Summary
                </button>
              </div>
            </div>

            <div className="text-xs text-white/60">
              {notice && <div className="text-emerald-400 mb-1">{notice}</div>}
              {error && <div className="text-red-400">{error}</div>}
            </div>

            <div className="text-center text-[10px] text-gray-500 select-none pt-2">
              © {new Date().getFullYear()} ClipForge AI • Watermark: {watermarkOn ? wmText : "off"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
