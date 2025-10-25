import React, { useState } from "react";

export default function Clipper() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [transcription, setTranscription] = useState("");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setTranscription("");
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file first!");
      return;
    }

    setStatus("⏳ Uploading file to Clipper AI...");
    const formData = new FormData();
    formData.append("file", file);

    try {
      // ✅ your live API endpoint
      const response = await fetch("https://clipper-api-final-1.onrender.com/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Transcription failed. Please try again.");
      }

      const data = await response.json();
      setTranscription(data.text || "(no text returned)");
      setStatus("✅ Transcription complete!");
    } catch (error) {
      console.error("Error:", error);
      setStatus("❌ Error during transcription.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6">
      <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">
          🎧 PTSEL Clipper Studio
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Upload any audio or video file and let AI transcribe it instantly.
        </p>

        <input
          type="file"
          accept="audio/*,video/*"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-700 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none mb-4"
        />

        <button
          onClick={handleUpload}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          Upload & Transcribe
        </button>

        {status && <p className="mt-4 text-gray-700">{status}</p>}

        {transcription && (
          <div className="mt-6 text-left bg-gray-50 p-4 rounded-xl shadow-inner">
            <h2 className="font-semibold mb-2 text-gray-800">📝 Transcription:</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{transcription}</p>
          </div>
        )}
      </div>
    </div>
  );
}
