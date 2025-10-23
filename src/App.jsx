import { useState, useRef } from "react";

/** Helpers **/
const toSecs = (t) => {
  // supports "HH:MM:SS", "MM:SS" or "SS"
  const parts = t.trim().split(":").map(Number);
  if (parts.some((n) => Number.isNaN(n))) return 0;
  let s = 0;
  for (let i = 0; i < parts.length; i++) s = s * 60 + parts[i];
  return s;
};
const estTime = (start, end) => {
  const dur = Math.max(0, toSecs(end) - toSecs(start));
  // rough estimate: ~ 0.6x realtime, floor to min 3s
  return Math.max(3, Math.round(dur * 0.6));
};

export default function App() {
  const API_BASE =
    import.meta.env.VITE_API_BASE || "https://clipper-api-final-1.onrender.com";

  /** Tabs **/
  const [tab, setTab] = useState("multi"); // 'multi' | 'transcribe'

  /** Multi-clip state **/
  const [file, setFile] = useState(null);
  const [sections, setSections] = useState([{ start: "", end: "" }]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(""); // e.g., "Processing 2/5…"
  const [results, setResults] = useState([]); // [{start,end,videoUrl,transcript}]
  const abortRef = useRef(null);
  const canceledRef = useRef(false);

  /** Transcribe-only state **/
  const [tFile, setTFile] = useState(null);
  const [tUrl, setTUrl] = useState("");
  const [tLoading, setTLoading] = useState(false);
  const [tText, setTText] = useState("");

  /** Multi-clip UI handlers **/
  const addSection = () => {
    if (sections.length >= 5) return alert("Maximum 5 sections allowed");
    setSections([...sections, { start: "", end: "" }]);
  };
  const removeSection = (i) =>
    setSections(sections.filter((_, idx) => idx !== i));
  const updateSection = (i, field, val) => {
    const copy = [...sections];
    copy[i][field] = val;
    setSections(copy);
  };
  const cancelAll = () => {
    canceledRef.current = true;
    if (abortRef.current) abortRef.current.abort();
    setLoading(false);
    setStatus("Canceled.");
  };

  /** Core: process each section one-by-one, show video + transcript */
  const handleClipAll = async () => {
    if (!file) return alert("Choose a video first.");
    if (sections.some((s) => !s.start || !s.end))
      return alert("Fill start and end for every section.");

    setLoading(true);
    setResults([]);
    setStatus("");
    canceledRef.current = false;

    for (let i = 0; i < sections.length; i++) {
      if (canceledRef.current) break;

      const sec = sections[i];
      const estimate = estTime(sec.start, sec.end);
      setStatus(`Processing ${i + 1}/${sections.length} (~${estimate}s)…`);

      // 1) Trim this section -> /clip (returns video blob)
      try {
        abortRef.current = new AbortController();
        const fd = new FormData();
        fd.append("file", file);
        fd.append("start", sec.start);
        fd.append("end", sec.end);

        const clipRes = await fetch(`${API_BASE}/clip`, {
          method: "POST",
          body: fd,
          signal: abortRef.current.signal,
        });
        if (!clipRes.ok) throw new Error("Clip failed");
        const clipBlob = await clipRes.blob();
        const videoUrl = URL.createObjectURL(clipBlob);

        // push placeholder result
        setResults((prev) => [
          ...prev,
          { start: sec.start, end: sec.end, videoUrl, transcript: "Transcribing…" },
        ]);

        // 2) Transcribe the newly trimmed clip -> /transcribe (file)
        const clipFile = new File([clipBlob], `clip_${i + 1}.mp4`, {
          type: "video/mp4",
        });
        const tf = new FormData();
        tf.append("file", clipFile);

        const tRes = await fetch(`${API_BASE}/transcribe`, {
          method: "POST",
          body: tf,
          signal: abortRef.current.signal,
        });
        const tJson = await tRes.json();
        const text =
          (tJson && (tJson.text || tJson.status)) ||
          "(no transcript returned)";

        // update this result's transcript
        setResults((prev) => {
          const copy = [...prev];
          copy[i] = { ...copy[i], transcript: text };
          return copy;
        });
      } catch (err) {
        if (err.name === "AbortError") break;
        setResults((prev) => {
          const copy = [...prev];
          copy[i] = {
            start: sec.start,
            end: sec.end,
            videoUrl: copy[i]?.videoUrl,
            transcript: "❌ Error processing this section.",
          };
          return copy;
        });
      }
    }

    setLoading(false);
    if (!canceledRef.current) setStatus("Done.");
  };

  /** Transcribe-only tab **/
  const handleTranscribeOnly = async () => {
    if (!tFile && !tUrl) return alert("Upload a file or paste a URL.");
    setTLoading(true);
    setTText("");

    try {
      const fd = new FormData();
      if (tFile) fd.append("file", tFile);
      if (tUrl) fd.append("url", tUrl);

      const res = await fetch(`${API_BASE}/transcribe`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      setTText(data.text || data.error || "(no text)");
    } catch (e) {
      setTText("❌ Error: " + e.message);
    } finally {
      setTLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-8 text-gray-800">
      <h1 className="text-4xl font-bold mb-6 text-center">🎬 PTSEL Multi-Clip Studio</h1>

      {/* Tabs */}
      <div className="flex mb-4 space-x-2">
        <button
          className={`px-4 py-2 rounded-lg ${tab === "multi" ? "bg-indigo-600 text-white" : "bg-gray-200"}`}
          onClick={() => setTab("multi")}
        >
          ✂️ Clip + Transcript
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${tab === "transcribe" ? "bg-green-600 text-white" : "bg-gray-200"}`}
          onClick={() => setTab("transcribe")}
        >
          🎙️ Transcribe Only
        </button>
      </div>

      {/* Panel */}
      <div className="bg-white shadow-xl rounded-2xl p-6 w-full max-w-3xl space-y-4">
        {tab === "multi" ? (
          <>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setFile(e.target.files[0])}
              className="block w-full p-2 border rounded"
            />

            {sections.map((s, i) => (
              <div key={i} className="flex items-center space-x-2">
                <input
                  placeholder="Start (00:00:05)"
                  value={s.start}
                  onChange={(e) => updateSection(i, "start", e.target.value)}
                  className="flex-1 p-2 border rounded"
                />
                <input
                  placeholder="End (00:00:10)"
                  value={s.end}
                  onChange={(e) => updateSection(i, "end", e.target.value)}
                  className="flex-1 p-2 border rounded"
                />
                <button
                  className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                  onClick={() => removeSection(i)}
                >
                  ❌
                </button>
              </div>
            ))}

            <div className="flex justify-between items-center">
              <button
                onClick={addSection}
                className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
              >
                ➕ Add Section
              </button>
              <div className="space-x-2">
                <button
                  onClick={handleClipAll}
                  disabled={loading}
                  className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? "Processing…" : "🎞️ Clip All (+ transcripts)"}
                </button>
                <button
                  onClick={cancelAll}
                  disabled={!loading}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
                >
                  ❌ Cancel All
                </button>
              </div>
            </div>

            {status && (
              <div className="text-sm text-gray-600">{status}</div>
            )}

            {/* Results */}
            {results.length > 0 && (
              <div className="space-y-6 pt-2">
                {results.map((r, i) => (
                  <div key={i} className="border rounded-lg p-4">
                    <div className="mb-2 font-semibold">
                      Clip {i + 1}: {r.start} → {r.end}
                    </div>
                    {r.videoUrl ? (
                      <video controls src={r.videoUrl} className="w-full rounded-lg" />
                    ) : (
                      <div className="text-sm text-gray-500">No preview</div>
                    )}
                    <div className="mt-3">
                      <div className="text-sm font-semibold mb-1">Transcript</div>
                      <pre className="bg-gray-50 p-3 rounded text-sm whitespace-pre-wrap">
                        {r.transcript || "…"}
                      </pre>
                    </div>
                    {r.videoUrl && (
                      <a
                        href={r.videoUrl}
                        download={`clip_${i + 1}.mp4`}
                        className="inline-block mt-3 text-blue-600 underline"
                      >
                        ⬇️ Download this clip
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <input
              type="file"
              accept="audio/*,video/*"
              onChange={(e) => setTFile(e.target.files[0])}
              className="block w-full p-2 border rounded"
            />
            <input
              placeholder="Or paste audio/video URL"
              value={tUrl}
              onChange={(e) => setTUrl(e.target.value)}
              className="block w-full p-2 border rounded"
            />
            <div className="flex justify-end">
              <button
                onClick={handleTranscribeOnly}
                disabled={tLoading}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {tLoading ? "Transcribing…" : "Transcribe"}
              </button>
            </div>
            {tText && (
              <div className="mt-4">
                <div className="text-sm font-semibold mb-1">Transcript</div>
                <pre className="bg-gray-50 p-3 rounded text-sm whitespace-pre-wrap">
                  {tText}
                </pre>
              </div>
            )}
          </>
        )}
      </div>

      <p className="text-gray-500 mt-6 text-sm text-center">
        Connected to {API_BASE}
      </p>
    </div>
  );
}
