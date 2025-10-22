import { useState } from "react";

function App() {
  const API_BASE = import.meta.env.VITE_API_BASE || "https://clipper-api-final-1.onrender.com";

  const [file, setFile] = useState(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [output, setOutput] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("clip"); // 'clip' or 'transcribe'

  const handleUpload = async () => {
    if (!file) return alert("Please choose a file first.");
    setLoading(true);
    setOutput(null);
    setTranscript("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      let endpoint = "";
      if (mode === "clip") {
        if (!start || !end) return alert("Enter start and end times (e.g. 00:00:05 and 00:00:10)");
        formData.append("start", start);
        formData.append("end", end);
        endpoint = "/clip";
      } else {
        endpoint = "/transcribe";
      }

      const res = await fetch(`${API_BASE}${endpoint}`, { method: "POST", body: formData });

      if (!res.ok) throw new Error("Server error");
      if (mode === "clip") {
        // download trimmed video
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setOutput(url);
      } else {
        const data = await res.json();
        setTranscript(data.text || "(No text detected)");
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-8 text-gray-800">
      <h1 className="text-4xl font-bold mb-6">🎬 PTSEL Clipper AI</h1>

      <div className="bg-white shadow-lg rounded-2xl p-6 w-full max-w-xl space-y-4">
        <div className="flex space-x-2 justify-center">
          <button
            className={`px-4 py-2 rounded-lg ${mode === "clip" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
            onClick={() => setMode("clip")}
          >
            ✂️ Clip Video
          </button>
          <button
            className={`px-4 py-2 rounded-lg ${mode === "transcribe" ? "bg-green-600 text-white" : "bg-gray-200"}`}
            onClick={() => setMode("transcribe")}
          >
            🎙️ Transcribe Audio
          </button>
        </div>

        <input
          type="file"
          accept="video/*,audio/*"
          onChange={(e) => setFile(e.target.files[0])}
          className="block w-full p-2 border rounded"
        />

        {mode === "clip" && (
          <div className="flex space-x-2">
            <input
              placeholder="Start (00:00:05)"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="flex-1 p-2 border rounded"
            />
            <input
              placeholder="End (00:00:10)"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="flex-1 p-2 border rounded"
            />
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={loading}
          className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Processing..." : mode === "clip" ? "Trim Video" : "Transcribe Audio"}
        </button>

        {/* --- Output section --- */}
        {output && (
          <div className="mt-4">
            <h2 className="font-semibold mb-2">Trimmed Result 🎞️</h2>
            <video controls src={output} className="w-full rounded-lg" />
          </div>
        )}

        {transcript && (
          <div className="mt-4">
            <h2 className="font-semibold mb-2">Transcription 📝</h2>
            <pre className="bg-gray-50 p-3 rounded text-sm whitespace-pre-wrap">{transcript}</pre>
          </div>
        )}
      </div>

      <p className="text-gray-500 mt-6 text-sm">Connected to {API_BASE}</p>
    </div>
  );
}

export default App;
