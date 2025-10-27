import React, { useMemo, useState } from "react";

// API base (override with VITE_API_BASE)
const API_BASE = import.meta.env.VITE_API_BASE || "https://clipper-api-final-1.onrender.com";

// Helpers
function hhmmssToSeconds(t) {
  if (!t) return 0;
  const parts = t.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(t) || 0;
}
function secondsToHHMMSS(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [h, m, s].map(v => String(v).padStart(2, "0")).join(":");
}
function overlap(aStart, aEnd, bStart, bEnd) {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}
function deriveClipName(original, start, end) {
  const base = (original || "video").replace(/\.[^.]+$/, "");
  return `${base}_${start.replaceAll(":", "-")}-${end.replaceAll(":", "-")}.mp4`;
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "download.bin";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function Clipper() {
  const [mode, setMode] = useState("transcribe"); // 'transcribe' | 'clip'
  const [file, setFile] = useState(null);

  // Transcription
  const [url, setUrl] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");
  const [transcriptText, setTranscriptText] = useState("");
  const [segments, setSegments] = useState([]); // [{start,end,text}]
  const [duration, setDuration] = useState(300); // seconds (fallback 5 mins)

  // Clip cards
  const [clips, setClips] = useState([{ start: "00:00:00", end: "00:00:10" }]);
  const [clipMsg, setClipMsg] = useState("");

  const resetMessages = () => {
    setError("");
    setClipMsg("");
  };

  // ===== Transcribe =====
  const handleTranscribe = async () => {
    try {
      resetMessages();
      setIsBusy(true);

      const fd = new FormData();
      if (url.trim()) {
        fd.append("url", url.trim());
      } else {
        if (!file) {
          setError("Choose a file or enter a URL.");
          setIsBusy(false);
          return;
        }
        fd.append("file", file);
      }

      const res = await fetch(`${API_BASE}/transcribe`, { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Transcription failed (${res.status})`);
      }
      const data = await res.json();

      setTranscriptText(data.text || "");
      setSegments(Array.isArray(data.segments) ? data.segments : []);
      setDuration(Math.max( Math.floor(Number(data.duration || 0)), 1) || 300);

      // Switch to Clip mode automatically if you want:
      // setMode("clip");
    } catch (e) {
      setError(e.message || "Transcription failed.");
    } finally {
      setIsBusy(false);
    }
  };

  // ===== Clip Single (first card quick action) =====
  const handleClipFirst = async () => {
    if (!file) return setError("Please choose a video file.");
    if (!clips[0]?.start || !clips[0]?.end) return setError("Enter start and end.");

    await clipOne(clips[0].start, clips[0].end);
  };

  // Generic single clip helper (also used per-card)
  const clipOne = async (start, end) => {
    try {
      resetMessages();
      setIsBusy(true);

      const fd = new FormData();
      fd.append("file", file);
      fd.append("start", start.trim());
      fd.append("end", end.trim());

      const res = await fetch(`${API_BASE}/clip`, { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Clipping failed");
      }

      const blob = await res.blob();
      downloadBlob(blob, deriveClipName(file?.name, start, end));
      setClipMsg("✅ Clip ready — your download should start automatically.");
    } catch (e) {
      setError(e.message || "Clipping failed.");
    } finally {
      setIsBusy(false);
    }
  };

  // ===== Multi-clip (ZIP) =====
  const handleClipAll = async () => {
    try {
      resetMessages();
      if (!file) return setError("Select a video first.");
      if (clips.length === 0) return setError("No clips added.");

      setIsBusy(true);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("sections", JSON.stringify(clips));

      const res = await fetch(`${API_BASE}/clip_multi`, { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Multi-clip failed");
      }

      const blob = await res.blob();
      downloadBlob(blob, "clips_bundle.zip");
      setClipMsg("✅ All clips processed — ZIP downloaded.");
    } catch (e) {
      setError(e.message || "Multi-clip failed.");
    } finally {
      setIsBusy(false);
    }
  };

  // ===== Clip list handlers =====
  const addClip = () => {
    if (clips.length >= 5) return;
    const lastEndSec = hhmmssToSeconds(clips.at(-1)?.end || "00:00:10");
    const nStart = secondsToHHMMSS(Math.min(lastEndSec, duration - 1));
    const nEnd = secondsToHHMMSS(Math.min(lastEndSec + 10, duration));
    setClips([...clips, { start: nStart, end: nEnd }]);
  };
  const updateClip = (idx, key, value) => {
    const arr = [...clips];
    arr[idx][key] = value;
    setClips(arr);
  };
  const cancelClip = (idx) => setClips(clips.filter((_, i) => i !== idx));
  const cancelAll = () => {
    setClips([]);
    setClipMsg("");
  };

  // ===== Per-clip transcript snippet (from segments) =====
  const clipSnippets = useMemo(() => {
    // For each clip, collect overlapping segment texts
    return clips.map(({ start, end }) => {
      const s = hhmmssToSeconds(start);
      const e = hhmmssToSeconds(end);
      if (!segments?.length) return "";
      const texts = [];
      for (const seg of segments) {
        const segS = Number(seg.start || 0);
        const segE = Number(seg.end || 0);
        if (overlap(s, e, segS, segE) > 0) {
          texts.push((seg.text || "").trim());
        }
      }
      return texts.join(" ").replace(/\s+/g, " ").trim();
    });
  }, [clips, segments]);

  // ===== UI =====
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow p-6">
        <h1 className="text-2xl font-semibold text-center mb-4">🎧 PTSEL Clipper Studio</h1>

        <div className="flex gap-2 mb-5 justify-center">
          <button
            className={`px-4 py-2 rounded-lg border ${mode === "transcribe" ? "bg-blue-600 text-white border-blue-600" : "bg-white"}`}
            onClick={() => setMode("transcribe")}
          >
            Transcribe
          </button>
          <button
            className={`px-4 py-2 rounded-lg border ${mode === "clip" ? "bg-blue-600 text-white border-blue-600" : "bg-white"}`}
            onClick={() => setMode("clip")}
          >
            Clip
          </button>
        </div>

        {/* Shared input */}
        <div className="mb-4">
          <input
            type="file"
            accept="audio/*,video/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          {file && <p className="text-xs text-gray-500 mt-1">Selected: {file.name}</p>}
        </div>

        {mode === "transcribe" && (
          <>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Or paste a URL (YouTube, TikTok, MP3, MP4, etc.)</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded border px-3 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">If a URL is provided, the file picker is ignored.</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleTranscribe}
                disabled={isBusy}
                className="flex-1 bg-blue-600 text-white rounded-lg py-2 disabled:opacity-60"
              >
                {isBusy ? "Processing..." : "Upload / URL → Transcribe"}
              </button>
              {transcriptText && (
                <button
                  className="px-4 py-2 rounded-lg border"
                  onClick={() => setMode("clip")}
                >
                  Use Transcript in Clip →
                </button>
              )}
            </div>

            {!!transcriptText && (
              <div className="mt-5 border rounded-lg p-3 bg-gray-50 max-h-72 overflow-auto">
                <div className="font-semibold mb-2">📝 Transcript:</div>
                <div className="text-sm whitespace-pre-wrap leading-6">{transcriptText}</div>
              </div>
            )}
          </>
        )}

        {mode === "clip" && (
          <>
            <div className="mb-4 grid md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Estimated Duration (sec)</label>
                <input
                  type="number"
                  min={1}
                  value={duration}
                  onChange={(e) => setDuration(Math.max(1, Number(e.target.value || 1)))}
                  className="w-full rounded border px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Auto-set from transcript; you can override for timeline scale.
                </p>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleClipFirst}
                  disabled={isBusy || !file}
                  className="w-full bg-green-600 text-white rounded-lg py-2 disabled:opacity-60"
                >
                  {isBusy ? "Clipping..." : "Quick Clip (First Row)"}
                </button>
              </div>
            </div>

            {/* Clip rows */}
            {clips.map((c, idx) => {
              const s = hhmmssToSeconds(c.start);
              const e = hhmmssToSeconds(c.end);
              const startPct = Math.min((s / duration) * 100, 100);
              const endPct = Math.min((e / duration) * 100, 100);
              const widthPct = Math.max(endPct - startPct, 2);
              const snippet = clipSnippets[idx];

              return (
                <div key={idx} className="border rounded-lg p-3 mb-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-sm">🎬 Clip {idx + 1}</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => clipOne(c.start, c.end)}
                        disabled={isBusy || !file}
                        className="text-xs bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-60"
                      >
                        Clip This
                      </button>
                      <button
                        onClick={() => cancelClip(idx)}
                        disabled={isBusy}
                        className="text-xs bg-gray-300 px-2 py-1 rounded hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-3 mb-3">
                    <input
                      type="text"
                      value={c.start}
                      onChange={(e) => updateClip(idx, "start", e.target.value)}
                      placeholder="Start (HH:MM:SS)"
                      className="rounded border px-2 py-2 text-sm"
                    />
                    <input
                      type="text"
                      value={c.end}
                      onChange={(e) => updateClip(idx, "end", e.target.value)}
                      placeholder="End (HH:MM:SS)"
                      className="rounded border px-2 py-2 text-sm"
                    />
                  </div>

                  {/* Timeline */}
                  <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                    <div
                      className="absolute h-full bg-blue-500 transition-all duration-300"
                      style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-center mb-2">
                    {c.start} → {c.end}
                  </p>

                  {/* Snippet */}
                  <div className="text-xs bg-white border rounded p-2">
                    <div className="font-semibold mb-1">Snippet</div>
                    <div className="text-gray-700">
                      {snippet || "— No transcript available for this range —"}
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="flex justify-between items-center mb-3">
              <button
                onClick={addClip}
                disabled={clips.length >= 5}
                className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                + Add Clip
              </button>
              <button
                onClick={cancelAll}
                className="bg-gray-400 text-white px-3 py-2 rounded"
              >
                Cancel All
              </button>
            </div>

            <button
              onClick={handleClipAll}
              disabled={isBusy || clips.length === 0 || !file}
              className="w-full bg-blue-600 text-white rounded-lg py-2 disabled:opacity-60"
            >
              {isBusy ? "Clipping..." : "Clip All & Download ZIP"}
            </button>

            {!!clipMsg && <p className="text-green-700 text-sm mt-3">{clipMsg}</p>}
          </>
        )}
         <Watermark />

        {!!error && (
          <div className="mt-4 p-3 rounded bg-red-50 text-red-700 text-sm border border-red-200">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
