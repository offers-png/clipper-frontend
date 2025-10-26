import React, { useState } from "react";

// Change this if you keep a .env value like VITE_API_BASE
const API_BASE = import.meta.env.VITE_API_BASE || "https://clipper-api-final-1.onrender.com";

export default function Clipper() {
  const [mode, setMode] = useState("transcribe"); // 'transcribe' | 'clip'
  const [file, setFile] = useState(null);

  // Transcription state
  const [url, setUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");

  // Clip state
  const [start, setStart] = useState("00:00:00");
  const [end, setEnd] = useState("00:00:10");
  const [clipMsg, setClipMsg] = useState("");

  const resetMessages = () => {
    setError("");
    setTranscript("");
    setClipMsg("");
  };

  // ---------- Transcribe: file or URL ----------
  const handleTranscribe = async () => {
    try {
      resetMessages();
      setIsBusy(true);

      const fd = new FormData();

      if (url.trim()) {
        // URL mode (no file required)
        fd.append("url", url.trim());
      } else {
        // File mode
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

  // ---------- Single clip ----------
  const handleClip = async () => {
    try {
      resetMessages();
      if (!file) {
        setError("Please choose a video file to clip.");
        return;
      }
      if (!start || !end) {
        setError("Please enter start and end times (HH:MM:SS).");
        return;
      }

      setIsBusy(true);

      const fd = new FormData();
      fd.append("file", file);
      fd.append("start", start.trim());
      fd.append("end", end.trim());

      const res = await fetch(`${API_BASE}/clip`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Clipping failed (${res.status})`);
      }

      // Download the returned MP4
      const blob = await res.blob();
      const name = deriveDownloadName(file?.name, start, end);
      downloadBlob(blob, name);
      setClipMsg("✅ Clip ready — your download should start automatically.");
    } catch (e) {
      setError(e.message || "Clipping failed.");
    } finally {
      setIsBusy(false);
    }
  };

  // Helpers
  function deriveDownloadName(original, start, end) {
    const base = (original || "video").replace(/\.[^.]+$/, "");
    return `${base}_${start.replaceAll(":", "-")}-${end.replaceAll(":", "-")}.mp4`;
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow p-6">
        <h1 className="text-2xl font-semibold text-center mb-4">🎧 PTSEL Clipper Studio</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 justify-center">
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

        {/* Shared file picker */}
        <div className="mb-4">
          <input
            type="file"
            accept="audio/*,video/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          {file && <p className="text-xs text-gray-500 mt-1">Selected: {file.name}</p>}
        </div>

        {/* Mode: Transcribe */}
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

            {/* Output */}
            {!!transcript && (
              <div className="mt-5 border rounded-lg p-3 bg-gray-50">
                <div className="font-semibold mb-1">📝 Transcript:</div>
                <div className="text-sm whitespace-pre-wrap leading-6">{transcript}</div>
              </div>
            )}
          </>
        )}

        // Mode: Clip
{mode === "clip" && (
  <>
    <div className="mb-3 text-center">
      <p className="text-sm text-gray-600">
        Add up to 5 clip segments. Enter start & end times, then clip individually or all at once.
      </p>
    </div>

    {clips.map((c, idx) => (
      <div key={idx} className="border rounded-lg p-3 mb-2 bg-gray-50">
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
        <div className="grid grid-cols-2 gap-3">
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
      </div>
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

    {!!clipMsg && <p className="text-green-700 text-sm mt-3">{clipMsg}</p>}
  </>
)}
