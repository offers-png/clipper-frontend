import React, { useState } from "react";

// Convert HH:MM:SS to total seconds
function timeToSeconds(t) {
  if (!t) return 0;
  const parts = t.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(t) || 0;
}

// Estimate max video duration (optional manual override later)
const VIDEO_DURATION = 300; // 5 minutes default, adjust dynamically later

// Change this if you keep a .env value like VITE_API_BASE
const API_BASE =
  import.meta.env.VITE_API_BASE || "https://clipper-api-final-1.onrender.com";

export default function Clipper() {
  const [mode, setMode] = useState("transcribe"); // 'transcribe' | 'clip'
  const [file, setFile] = useState(null);

  // Transcription state
  const [url, setUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");

  // Clip state
  const [clipMsg, setClipMsg] = useState("");
  const [clips, setClips] = useState([{ start: "00:00:00", end: "00:00:10" }]);

  const resetMessages = () => {
    setError("");
    setTranscript("");
    setClipMsg("");
  };

  // ---------- Transcribe ----------
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

      const res = await fetch(`${API_BASE}/transcribe`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Request failed (${res.status})`);
      }

      const data = await res.json();
      setTranscript(data.text || "(no text)");
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setIsBusy(false);
    }
  };

  // ---------- Single Clip ----------
  const handleClip = async () => {
    try {
      resetMessages();
      if (!file) return setError("Please choose a video file to clip.");

      const first = clips[0];
      if (!first.start || !first.end)
        return setError("Enter start and end times.");

      setIsBusy(true);

      const fd = new FormData();
      fd.append("file", file);
      fd.append("start", first.start.trim());
      fd.append("end", first.end.trim());

      const res = await fetch(`${API_BASE}/clip`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) throw new Error("Clipping failed");

      const blob = await res.blob();
      const name = deriveDownloadName(file.name, first.start, first.end);
      downloadBlob(blob, name);
      setClipMsg("✅ Clip ready — your download should start automatically.");
    } catch (e) {
      setError(e.message || "Clipping failed.");
    } finally {
      setIsBusy(false);
    }
  };

  // ---------- Multi-clip handlers ----------
  function addClip() {
    if (clips.length >= 5) return;
    setClips([...clips, { start: "00:00:00", end: "00:00:10" }]);
  }

  function updateClip(index, key, value) {
    const newClips = [...clips];
    newClips[index][key] = value;
    setClips(newClips);
  }

  function cancelClip(index) {
    setClips(clips.filter((_, i) => i !== index));
  }

  function cancelAll() {
    setClips([]);
    setClipMsg("");
  }

  async function handleClipSingle(index) {
    try {
      resetMessages();
      if (!file) return setError("Select a video first.");

      const c = clips[index];
      if (!c.start || !c.end) return setError("Enter valid start and end.");

      setIsBusy(true);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("start", c.start);
      fd.append("end", c.end);

      const res = await fetch(`${API_BASE}/clip`, { method: "POST", body: fd });
      if (!res.ok) throw new Error("Clip failed");
      const blob = await res.blob();
      downloadBlob(blob, deriveDownloadName(file.name, c.start, c.end));
      setClipMsg(`✅ Clip ${index + 1} complete`);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleClipAll() {
    try {
      resetMessages();
      if (!file) return setError("Select a video first.");
      if (clips.length === 0) return setError("No clips added.");

      setIsBusy(true);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("sections", JSON.stringify(clips));

      const res = await fetch(`${API_BASE}/clip_multi`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error("Multi-clip failed");

      const blob = await res.blob();
      downloadBlob(blob, "clips_bundle.zip");
      setClipMsg("✅ All clips processed — ZIP downloaded.");
    } catch (e) {
      setError(e.message);
    } finally {
      setIsBusy(false);
    }
  }

  // ---------- Helpers ----------
  function deriveDownloadName(original, start, end) {
    const base = (original || "video").replace(/\.[^.]+$/, "");
    return `${base}_${start.replaceAll(":", "-")}-${end.replaceAll(
      ":",
      "-"
    )}.mp4`;
  }

  function downloadBlob(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "download.bin";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  // ---------- UI ----------
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow p-6">
        <h1 className="text-2xl font-semibold text-center mb-4">
          🎧 PTSEL Clipper Studio
        </h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 justify-center">
          <button
            className={`px-4 py-2 rounded-lg border ${
              mode === "transcribe"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white"
            }`}
            onClick={() => setMode("transcribe")}
          >
            Transcribe
          </button>
          <button
            className={`px-4 py-2 rounded-lg border ${
              mode === "clip"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white"
            }`}
            onClick={() => setMode("clip")}
          >
            Clip
          </button>
        </div>

        {/* Shared file picker */}
        <div className="mb-4">
          <input
            type="file"
            accept="audio/*,video/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          {file && (
            <p className="text-xs text-gray-500 mt-1">Selected: {file.name}</p>
          )}
        </div>

        {/* Mode: Transcribe */}
        {mode === "transcribe" && (
          <>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">
                Or paste a URL (YouTube, TikTok, MP3, MP4, etc.)
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded border px-3 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                If a URL is provided, the file picker is ignored.
              </p>
            </div>

            <button
              onClick={handleTranscribe}
              disabled={isBusy}
              className="w-full bg-blue-600 text-white rounded-lg py-2 disabled:opacity-60"
            >
              {isBusy ? "Processing..." : "Upload & Transcribe"}
            </button>

            {!!transcript && (
              <div className="mt-5 border rounded-lg p-3 bg-gray-50">
                <div className="font-semibold mb-1">📝 Transcript:</div>
                <div className="text-sm whitespace-pre-wrap leading-6">
                  {transcript}
                </div>
              </div>
            )}
          </>
        )}

        {/* Mode: Clip */}
        {mode === "clip" && (
          <>
            <div className="mb-3 text-center">
              <p className="text-sm text-gray-600">
                Add up to 5 clip segments. Enter start & end times, then clip
                individually or all at once.
              </p>
            </div>

            {clips.map((c, idx) => (
              <div
                key={idx}
                className="border rounded-lg p-3 mb-2 bg-gray-50"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-sm">🎬 Clip {idx + 1}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleClipSingle(idx)}
                      disabled={isBusy}
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
                <div className="grid grid-cols-2 gap-3 mb-3">
  <input
    type="text"
    value={c.start}
    onChange={(e) => updateClip(idx, "start", e.target.value)}
    placeholder="Start (HH:MM:SS)"
    className="rounded border px-2 py-1 text-sm"
  />
  <input
    type="text"
    value={c.end}
    onChange={(e) => updateClip(idx, "end", e.target.value)}
    placeholder="End (HH:MM:SS)"
    className="rounded border px-2 py-1 text-sm"
  />
</div>

{/* 🎥 Visual Timeline */}
<div className="relative h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
  {(() => {
    const startSec = timeToSeconds(c.start);
    const endSec = timeToSeconds(c.end);
    const total = VIDEO_DURATION;
    const startPercent = Math.min((startSec / total) * 100, 100);
    const endPercent = Math.min((endSec / total) * 100, 100);
    const width = Math.max(endPercent - startPercent, 2);
    return (
      <div
        className="absolute h-full bg-blue-500 transition-all duration-300"
        style={{
          left: `${startPercent}%`,
          width: `${width}%`,
        }}
      ></div>
    );
  })()}
</div>

<p className="text-xs text-gray-500 text-center">
  {c.start} → {c.end}
</p>
               </div> {/* ✅ closes clip container */}
            ))}

            <div className="flex justify-between items-center mb-4">
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
              disabled={isBusy || clips.length === 0}
              className="w-full bg-blue-600 text-white rounded-lg py-2 disabled:opacity-60"
            >
              {isBusy ? "Clipping..." : "Clip All & Download ZIP"}
            </button>

            {!!clipMsg && (
              <p className="text-green-700 text-sm mt-3">{clipMsg}</p>
            )}
          </>
        )}

        {!!error && (
          <p className="text-red-600 text-sm mt-4">{error}</p>
        )}
      </div> {/* ✅ closes white box */}
    </div>   {/* ✅ closes full-screen wrapper */}
  );
}
