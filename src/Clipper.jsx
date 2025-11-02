import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import logo from "./assets/react.svg";

const API_BASE = import.meta.env.VITE_API_BASE || "https://clipper-api-final-1.onrender.com";
const VIDEO_DURATION_FALLBACK = 300; // seconds, just for the timeline bar

// ---------- Small helpers ----------
function timeToSeconds(t) {
  if (!t) return 0;
  const p = t.split(":").map(Number);
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
  if (p.length === 2) return p[0] * 60 + p[1];
  return Number(t) || 0;
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
function fileBase(name) {
  return (name || "video").replace(/\.[^.]+$/, "");
}

// ---------- Modal ----------
function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0B1020] p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-md bg-white/10 px-2 py-1 text-sm text-white hover:bg-white/20"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------- Right-side Assistant Buttons ----------
function AssistantButtons({ onClick }) {
  const defs = [
    { k: "moments", label: "Moments", emoji: "🎬" },
    { k: "titles", label: "Titles", emoji: "📝" },
    { k: "hooks", label: "Hooks", emoji: "💬" },
    { k: "hashtags", label: "Hashtags", emoji: "🏷️" },
    { k: "summary", label: "Summary", emoji: "🧠" },
  ];
  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {defs.map((d) => (
        <button
          key={d.k}
          onClick={() => onClick(d.k)}
          className="rounded-md bg-[#151B33] px-3 py-1.5 text-sm text-white hover:bg-[#1B2240] border border-white/10"
        >
          <span className="mr-1">{d.emoji}</span>
          {d.label}
        </button>
      ))}
    </div>
  );
}

export default function Clipper() {
  // ---------- Auth guard ----------
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) window.location.href = "/";
    })();
  }, []);

  // ---------- Top-level UI state ----------
  const [mode, setMode] = useState("transcribe"); // 'transcribe' | 'auto' | 'clip'
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");
  const [log, setLog] = useState([]); // processing log entries
  const [instant, setInstant] = useState(true); // fast stream-copy when possible
  const [previewSpeed, setPreviewSpeed] = useState(1);

  // watermark controls
  const [wmOn, setWmOn] = useState(true);
  const [wmText, setWmText] = useState("@ClippedBySal");

  // clips state
  const [clips, setClips] = useState([
    { start: "00:00:00", end: "00:00:10", previewUrl: "", summary: "" },
  ]);

  // auto-clip modal
  const [autoClipsModalOpen, setAutoClipsModalOpen] = useState(false);
  const pendingAutoClipsRef = useRef([]); // store suggested clips waiting for user confirmation

  // assistant chat
  const [aiMsgs, setAiMsgs] = useState([]);
  const [aiInput, setAiInput] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  const timelineTotal = useMemo(
    () => (clips.length ? Math.max(...clips.map(c => timeToSeconds(c.end))) || VIDEO_DURATION_FALLBACK : VIDEO_DURATION_FALLBACK),
    [clips]
  );

  const resetFlash = () => {
    setError("");
  };
  const pushLog = (s) => {
    setLog((l) => [...l, `${new Date().toLocaleTimeString()}  •  ${s}`].slice(-100));
  };

  // ---------- API calls ----------
  async function callTranscribe() {
    resetFlash();
    if (!file && !url.trim()) {
      setError("Choose a file or paste a URL.");
      return null;
    }
    setIsBusy(true);
    try {
      pushLog("Uploading for transcription...");
      const fd = new FormData();
      if (url.trim()) fd.append("url", url.trim());
      else fd.append("file", file);
      const res = await fetch(`${API_BASE}/transcribe`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transcription failed");
      setTranscript(data.text || "");
      pushLog("Transcription complete.");
      return data.text || "";
    } catch (e) {
      setError(e.message);
      pushLog(`Transcription error: ${e.message}`);
      return null;
    } finally {
      setIsBusy(false);
    }
  }

  async function callAutoClip(text, max = 3) {
    resetFlash();
    setIsBusy(true);
    try {
      pushLog("Finding best moments...");
      const fd = new FormData();
      fd.append("transcript", text || transcript);
      fd.append("max_clips", String(max));
      const res = await fetch(`${API_BASE}/auto_clip`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Auto-clip failed");
      const list = Array.isArray(data.clips) ? data.clips : [];
      pushLog(list.length ? `Found ${list.length} moments.` : "No strong moments found.");
      return list;
    } catch (e) {
      setError(e.message);
      pushLog(`Auto-clip error: ${e.message}`);
      return [];
    } finally {
      setIsBusy(false);
    }
  }

  // Build a (low-res) preview by calling /clip
  async function buildPreview(i) {
    const c = clips[i];
    if (!file || !c?.start || !c?.end) {
      setError("Select a video and set start & end times.");
      return;
    }
    try {
      setClips((arr) => {
        const n = [...arr];
        n[i].previewUrl = "loading";
        return n;
      });
      const fd = new FormData();
      fd.append("file", file);
      fd.append("start", c.start.trim());
      fd.append("end", c.end.trim());
      // fast path + watermark flags
      fd.append("fast", instant ? "1" : "0");
      fd.append("watermark", wmOn ? "1" : "0");
      fd.append("wm_text", wmText);
      // preview hint (backend may ignore, it’s fine)
      fd.append("preview", "1");
      fd.append("scale", "540p"); // <— low-res preview hint

      const res = await fetch(`${API_BASE}/clip`, { method: "POST", body: fd });
      if (!res.ok) throw new Error("Preview build failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      setClips((arr) => {
        const n = [...arr];
        n[i].previewUrl = url;
        return n;
      });
      pushLog(`Preview ready for clip ${i + 1}.`);
    } catch (e) {
      setClips((arr) => {
        const n = [...arr];
        n[i].previewUrl = "";
        return n;
      });
      setError(e.message);
      pushLog(`Preview error: ${e.message}`);
    }
  }

  // Download a high-quality clip (same call as preview, but user intends to save)
  async function downloadClip(i) {
    const c = clips[i];
    if (!file || !c?.start || !c?.end) {
      setError("Select a video and set start & end times.");
      return;
    }
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("start", c.start.trim());
      fd.append("end", c.end.trim());
      fd.append("fast", instant ? "1" : "0");
      fd.append("watermark", wmOn ? "1" : "0");
      fd.append("wm_text", wmText);

      const res = await fetch(`${API_BASE}/clip`, { method: "POST", body: fd });
      if (!res.ok) throw new Error("Clip export failed");
      const blob = await res.blob();

      const name = `${fileBase(file?.name)}_${c.start.replaceAll(":", "-")}-${c.end.replaceAll(":", "-")}.mp4`;
      downloadBlob(blob, name);
      pushLog(`Downloaded: ${name}`);
    } catch (e) {
      setError(e.message);
      pushLog(`Download error: ${e.message}`);
    }
  }

  async function downloadAllZip() {
    if (!file || clips.length === 0) {
      setError("Select a video and add clips.");
      return;
    }
    try {
      setIsBusy(true);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("sections", JSON.stringify(clips.map(({ start, end }) => ({ start, end }))));
      fd.append("watermark", wmOn ? "1" : "0");
      fd.append("wm_text", wmText);
      const res = await fetch(`${API_BASE}/clip_multi`, { method: "POST", body: fd });
      const blob = await res.blob();
      if (!res.ok) {
        const t = await blob.text().catch(() => "");
        throw new Error(t || "Multi-clip export failed");
      }
      downloadBlob(blob, "clips_bundle.zip");
      pushLog("ZIP downloaded.");
    } catch (e) {
      setError(e.message);
      pushLog(`ZIP error: ${e.message}`);
    } finally {
      setIsBusy(false);
    }
  }

  // ---------- AI Assistant ----------
  function tpl(k) {
    switch (k) {
      case "summary":
        return "Summarize the transcript into 5 bullet points with key takeaways.";
      case "titles":
        return "Write 5 viral, punchy titles (max 60 chars each) based on this transcript.";
      case "hooks":
        return "Give me 7 short opening hooks (under 80 chars) tailored for Shorts/TikTok.";
      case "hashtags":
        return "Suggest 10 relevant hashtags + 10 SEO keywords for this content.";
      case "moments":
        return "Find the best 3 high-impact 10–45s moments with HH:MM:SS start/end and a one-line reason.";
      default:
        return "";
    }
  }
  async function askAI(message) {
    if (!message.trim()) return;
    setAiBusy(true);
    try {
      const fd = new FormData();
      fd.append("user_message", message.trim());
      fd.append("transcript", transcript || "");
      fd.append("history", JSON.stringify(aiMsgs));
      const res = await fetch(`${API_BASE}/ai_chat`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI helper failed");
      setAiMsgs((m) => [...m, { role: "user", content: message.trim() }, { role: "assistant", content: data.reply || "(no reply)" }]);
    } catch (e) {
      setError(e.message);
    } finally {
      setAiBusy(false);
    }
  }
  async function handleAssistantButton(k) {
    if (!transcript && k !== "moments") {
      setError("Transcribe first (or paste a URL) to use the assistant.");
      return;
    }
    if (k === "moments") {
      const list = await callAutoClip(transcript, 3);
      if (!list.length) return;
      // push readable reply, not altering clip list automatically here
      const readable = list
        .map((c, i) => `${i + 1}. ${c.start}–${c.end} — ${c.summary || ""}`)
        .join("\n");
      setAiMsgs((m) => [
        ...m,
        { role: "user", content: "Find the best 3 moments." },
        { role: "assistant", content: readable || "(no moments)" },
      ]);
      return;
    }
    askAI(tpl(k));
  }

  // ---------- UI Handlers ----------
  function addClip() {
    if (clips.length >= 5) return;
    setClips((arr) => [...arr, { start: "00:00:00", end: "00:00:10", previewUrl: "", summary: "" }]);
  }
  function updateClip(i, k, v) {
    setClips((arr) => {
      const n = [...arr];
      n[i] = { ...n[i], [k]: v };
      return n;
    });
  }
  function deleteClip(i) {
    setClips((arr) => arr.filter((_, idx) => idx !== i));
  }
  function clearAllClips() {
    setClips([]);
  }

  // Top actions
  async function onTranscribeClick() {
    setMode("transcribe");
    const text = await callTranscribe();
    if (!text) return;
    // don't show modal in pure transcribe
  }
  async function onAutoClipClick() {
    setMode("auto");
    const text = await callTranscribe();
    if (!text) return;
    const list = await callAutoClip(text, 3);
    pendingAutoClipsRef.current = list || [];
    // show modal to confirm loading the clips
    setAutoClipsModalOpen(true);
  }
  function onClipOnlyClick() {
    setMode("clip");
    // user will manually set times & build previews/exports
  }

  function acceptAutoClipsAndBuild() {
    const list = pendingAutoClipsRef.current || [];
    if (!list.length) {
      setAutoClipsModalOpen(false);
      return;
    }
    setClips(
      list.slice(0, 5).map((c) => ({
        start: (c.start || "00:00:00").trim(),
        end: (c.end || "00:00:10").trim(),
        summary: (c.summary || "").trim(),
        previewUrl: "",
      }))
    );
    setAutoClipsModalOpen(false);
    // auto-generate low-res previews for each
    setTimeout(() => {
      for (let i = 0; i < Math.min(5, list.length); i++) buildPreview(i);
    }, 50);
  }

  // ---------- Render ----------
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B1020] via-[#12182B] to-[#1C2450] text-white">
      {/* Header */}
      <div className="border-b border-[#27324A] bg-[#0B1020]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="ClipForge AI" className="h-8 w-8" />
            <div className="text-lg font-semibold tracking-wide">ClipForge AI</div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={wmOn} onChange={(e) => setWmOn(e.target.checked)} />
              Watermark
            </label>
            {wmOn && (
              <input
                value={wmText}
                onChange={(e) => setWmText(e.target.value)}
                placeholder="@YourHandle"
                className="w-40 rounded-md border border-[#27324A] bg-[#12182B] px-2 py-1 text-xs outline-none"
              />
            )}
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/";
              }}
              className="rounded bg-[#6C5CE7] px-3 py-1 text-white hover:bg-[#5A4ED1]"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[1fr,380px]">
        {/* LEFT: Controls */}
        <div>
          {/* Upload row */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input
              type="file"
              accept="audio/*,video/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="text-sm"
            />
            {file && <span className="text-xs text-white/70">Selected: {file.name}</span>}
          </div>

          {/* Mode buttons */}
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={onTranscribeClick}
              disabled={isBusy}
              className={`rounded-lg border px-4 py-2 ${
                mode === "transcribe" ? "border-[#6C5CE7] bg-[#6C5CE7]" : "border-[#27324A] bg-[#12182B]"
              }`}
            >
              Transcribe
            </button>
            <button
              onClick={onAutoClipClick}
              disabled={isBusy}
              className={`rounded-lg border px-4 py-2 ${
                mode === "auto" ? "border-[#6C5CE7] bg-[#6C5CE7]" : "border-[#27324A] bg-[#12182B]"
              }`}
            >
              Auto Clip
            </button>
            <button
              onClick={onClipOnlyClick}
              disabled={isBusy}
              className={`rounded-lg border px-4 py-2 ${
                mode === "clip" ? "border-[#6C5CE7] bg-[#6C5CE7]" : "border-[#27324A] bg-[#12182B]"
              }`}
            >
              Clip Only
            </button>

            {/* fast + preview speed */}
            <label className="ml-auto flex items-center gap-2 text-sm">
              <input type="checkbox" checked={instant} onChange={(e) => setInstant(e.target.checked)} />
              Instant clip (fast mode)
            </label>
            <label className="flex items-center gap-2 text-sm">
              Preview speed
              <select
                value={previewSpeed}
                onChange={(e) => setPreviewSpeed(Number(e.target.value))}
                className="rounded-md border border-[#27324A] bg-[#12182B] px-2 py-1"
              >
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((v) => (
                  <option key={v} value={v}>
                    {v}×
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* URL input */}
          <div className="mb-4">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Or paste a URL (YouTube/TikTok/MP3/MP4)…"
              className="w-full rounded-lg border border-[#27324A] bg-[#12182B] px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-white/50">If a URL is provided, the file picker is ignored.</p>
          </div>

          {/* Big call-to-action (adapts to current mode) */}
          <button
            disabled={isBusy}
            onClick={() => {
              if (mode === "auto") return onAutoClipClick();
              if (mode === " clip") return onClipOnlyClick();
              return onTranscribeClick();
            }}
            className="mb-6 w-full rounded-lg bg-[#6C5CE7] py-2 text-white hover:bg-[#5A4ED1] disabled:opacity-60"
          >
            {mode === "auto" ? "Upload & Auto Clip" : mode === "clip" ? "Clip Actions" : "Upload & Transcribe"}
          </button>

          {/* Transcript */}
          {!!transcript && (
            <div className="mb-6 rounded-lg border border-[#27324A] bg-[#12182B] p-3">
              <div className="mb-1 font-semibold">📝 Transcript</div>
              <div className="max-h-60 whitespace-pre-wrap text-sm leading-6 text-white/90 scrollbar-thin">
                {transcript}
              </div>
            </div>
          )}

          {/* Clips List */}
          <div className="rounded-lg border border-[#27324A] bg-[#12182B] p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-lg font-semibold">Clips</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={addClip}
                  className="rounded bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-700"
                >
                  + Add Clip
                </button>
                <button onClick={clearAllClips} className="rounded bg-gray-600 px-3 py-1.5 text-white hover:bg-gray-700">
                  Clear All
                </button>
                <button
                  onClick={downloadAllZip}
                  disabled={isBusy || clips.length === 0}
                  className="rounded bg-indigo-600 px-3 py-1.5 text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  Export All as ZIP
                </button>
              </div>
            </div>

            {clips.map((c, idx) => {
              const s = timeToSeconds(c.start);
              const e = timeToSeconds(c.end);
              const sp = Math.min((s / (timelineTotal || VIDEO_DURATION_FALLBACK)) * 100, 100);
              const ep = Math.min((e / (timelineTotal || VIDEO_DURATION_FALLBACK)) * 100, 100);
              const w = Math.max(ep - sp, 2);

              return (
                <div key={idx} className="mb-4 rounded-lg border border-white/10 bg-[#0F1426] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm text-white/80">🎬 Clip {idx + 1}</div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => buildPreview(idx)}
                        className="rounded bg-[#2B365E] px-3 py-1.5 text-sm text-white hover:bg-[#344070]"
                      >
                        Rebuild Preview
                      </button>
                      <button
                        onClick={() => deleteClip(idx)}
                        className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mb-3 grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={c.start}
                      onChange={(e) => updateClip(idx, "start", e.target.value)}
                      placeholder="Start (HH:MM:SS)"
                      className="rounded border border-[#27324A] bg-[#0B1020] px-2 py-2 text-sm"
                    />
                    <input
                      type="text"
                      value={c.end}
                      onChange={(e) => updateClip(idx, "end", e.target.value)}
                      placeholder="End (HH:MM:SS)"
                      className="rounded border border-[#27324A] bg-[#0B1020] px-2 py-2 text-sm"
                    />
                  </div>

                  <div className="relative mb-2 h-2 rounded-full bg-[#27324A]">
                    <div className="absolute h-2 rounded-full bg-[#6C5CE7]" style={{ left: `${sp}%`, width: `${w}%` }} />
                  </div>
                  <p className="mb-3 text-center text-xs text-white/60">
                    {c.start} → {c.end}
                  </p>

                  {/* Snippet */}
                  <div className="mb-3 rounded bg-[#0D1222] p-2 text-xs text-white/80">
                    <div className="mb-1 font-semibold">Snippet</div>
                    <div className="line-clamp-3">
                      {transcript ? c.summary || transcript.slice(0, 240) : "— No transcript available —"}
                    </div>
                  </div>

                  {/* Preview + Actions */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded border border-white/10 bg-black/20 p-2">
                      <div className="mb-1 text-xs text-white/60">Preview</div>
                      <div className="aspect-video w-full overflow-hidden rounded bg-black/60">
                        {c.previewUrl === "loading" && (
                          <div className="flex h-full w-full items-center justify-center text-white/60">Building…</div>
                        )}
                        {c.previewUrl && c.previewUrl !== "loading" && (
                          <video
                            src={c.previewUrl}
                            controls
                            playbackRate={previewSpeed}
                            className="h-full w-full"
                          />
                        )}
                        {!c.previewUrl && c.previewUrl !== "loading" && (
                          <div className="flex h-full w-full items-center justify-center text-white/40">
                            No preview yet
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col justify-between">
                      <div className="space-y-2">
                        <button
                          onClick={() => buildPreview(idx)}
                          className="w-full rounded bg-[#2B365E] px-3 py-2 text-sm text-white hover:bg-[#344070]"
                        >
                          Rebuild Preview (540p)
                        </button>
                        <button
                          onClick={() => downloadClip(idx)}
                          className="w-full rounded bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700"
                        >
                          Download Clip
                        </button>
                      </div>
                      <p className="mt-3 text-[11px] text-white/50">
                        Previews are low-res for speed. Final downloads use your selected settings.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* errors */}
          {!!error && <p className="mt-4 text-sm text-red-400">{error}</p>}
        </div>

        {/* RIGHT: Assistant + Log */}
        <div className="space-y-6">
          {/* Assistant */}
          <div className="rounded-lg border border-[#27324A] bg-[#12182B] p-4">
            <div className="mb-2 text-lg font-semibold">🤖 ClipForge Assistant</div>
            <AssistantButtons onClick={handleAssistantButton} />
            <textarea
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="Ask something about your transcript…"
              className="mb-2 w-full rounded-lg border border-[#27324A] bg-[#0B1020] p-2 text-sm"
              rows={2}
            />
            <div className="mb-3 flex gap-2">
              <button
                onClick={() => {
                  if (!aiInput.trim()) return;
                  askAI(aiInput.trim());
                  setAiInput("");
                }}
                disabled={aiBusy}
                className="rounded bg-[#6C5CE7] px-3 py-2 text-white hover:bg-[#5A4ED1] disabled:opacity-60"
              >
                {aiBusy ? "Thinking…" : "Ask AI"}
              </button>
              <button
                onClick={() => setAiMsgs([])}
                className="rounded bg-white/10 px-3 py-2 text-white hover:bg-white/20"
              >
                Clear Chat
              </button>
            </div>
            <div className="max-h-56 space-y-2 overflow-auto rounded bg-black/20 p-3 text-sm">
              {aiMsgs.length === 0 && (
                <div className="text-white/60">Ask me to summarize, find moments, write hooks or titles.</div>
              )}
              {aiMsgs.map((m, i) => (
                <div
                  key={i}
                  className={m.role === "assistant" ? "text-white leading-6" : "text-indigo-300 leading-6"}
                >
                  <span className="mr-1 opacity-70">{m.role === "assistant" ? "AI:" : "You:"}</span>
                  {m.content}
                </div>
              ))}
            </div>
          </div>

          {/* Processing log */}
          <div className="rounded-lg border border-[#27324A] bg-[#12182B] p-4">
            <div className="mb-2 text-lg font-semibold">🧾 Processing Log</div>
            <div className="max-h-64 overflow-auto text-sm leading-7 text-white/85">
              {log.length === 0 ? <div className="text-white/50">No logs yet.</div> : log.map((l, i) => <div key={i}>{l}</div>)}
            </div>
          </div>
        </div>
      </div>

      {/* Auto-Clip Confirmation Modal */}
      <Modal
        open={autoClipsModalOpen}
        title="🚀 Boom! I found viral-worthy moments"
        onClose={() => setAutoClipsModalOpen(false)}
      >
        <p className="mb-4 text-white/80">
          I found up to <span className="font-semibold text-white">3</span> high-impact moments in your video.
          Want me to load them so you can preview & download?
        </p>
        <div className="flex gap-2">
          <button
            onClick={acceptAutoClipsAndBuild}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
          >
            Load Clips
          </button>
          <button
            onClick={() => setAutoClipsModalOpen(false)}
            className="rounded-lg bg-white/10 px-4 py-2 text-white hover:bg-white/20"
          >
            Review Transcript First
          </button>
        </div>
      </Modal>

      {/* Footer */}
      <div className="pb-10 pt-6 text-center text-[10px] text-white/40 select-none">
        © {new Date().getFullYear()} ClipForge AI • Watermark: {wmOn ? wmText : "off"}
      </div>
    </div>
  );
}
