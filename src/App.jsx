import { useState, useRef } from "react";

function App() {
  const API_BASE = import.meta.env.VITE_API_BASE || "https://clipper-api-final-1.onrender.com";

  const [file, setFile] = useState(null);
  const [sections, setSections] = useState([{ start: "", end: "" }]);
  const [loading, setLoading] = useState(false);
  const [outputUrl, setOutputUrl] = useState(null);
  const abortController = useRef(null);

  const addSection = () => {
    if (sections.length >= 5) return alert("Maximum 5 sections allowed");
    setSections([...sections, { start: "", end: "" }]);
  };

  const removeSection = (index) => {
    const updated = sections.filter((_, i) => i !== index);
    setSections(updated);
  };

  const updateSection = (index, field, value) => {
    const updated = [...sections];
    updated[index][field] = value;
    setSections(updated);
  };

  const cancelAll = () => {
    if (abortController.current) {
      abortController.current.abort();
      alert("⛔ Clipping canceled.");
      setLoading(false);
    }
  };

  const handleClipAll = async () => {
    if (!file) return alert("Please select a file first!");
    if (sections.some(s => !s.start || !s.end)) return alert("All sections need start and end times.");

    setLoading(true);
    setOutputUrl(null);
    abortController.current = new AbortController();

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sections", JSON.stringify(sections));

      const res = await fetch(`${API_BASE}/clip_multi`, {
        method: "POST",
        body: formData,
        signal: abortController.current.signal
      });

      if (!res.ok) throw new Error("Server error");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setOutputUrl(url);
    } catch (err) {
      if (err.name !== "AbortError") alert("❌ Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-8 text-gray-800">
      <h1 className="text-4xl font-bold mb-6">🎬 PTSEL Multi-Clip Studio</h1>

      <div className="bg-white shadow-xl rounded-2xl p-6 w-full max-w-2xl space-y-4">
        <input
          type="file"
          accept="video/*"
          onChange={(e) => setFile(e.target.files[0])}
          className="block w-full p-2 border rounded"
        />

        {sections.map((section, i) => (
          <div key={i} className="flex items-center space-x-2">
            <input
              placeholder="Start (00:00:05)"
              value={section.start}
              onChange={(e) => updateSection(i, "start", e.target.value)}
              className="flex-1 p-2 border rounded"
            />
            <input
              placeholder="End (00:00:10)"
              value={section.end}
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
              {loading ? "Processing..." : "🎞️ Clip All"}
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

        {outputUrl && (
          <div className="mt-6">
            <h2 className="font-semibold mb-2">🎁 Download Your Clips (ZIP)</h2>
            <a
              href={outputUrl}
              download="clips_bundle.zip"
              className="text-blue-600 underline"
            >
              Download ZIP
            </a>
          </div>
        )}
      </div>

      <p className="text-gray-500 mt-6 text-sm">Connected to {API_BASE}</p>
    </div>
  );
}

export default App;
