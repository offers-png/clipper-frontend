import React, { useState } from "react";
import { supabase } from "./supabaseClient";

export default function Clipper() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [user, setUser] = useState(null);

  // Load Supabase user session
  React.useEffect(() => {
    const session = supabase.auth.getSession().then(({ data }) => {
      setUser(data?.session?.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Upload & Transcribe Function
  const handleUpload = async () => {
    if (!file) return alert("Please choose a file first!");
    if (!user) return alert("You must log in first.");

    setLoading(true);

    try {
      // Send file to FastAPI backend
      const formData = new FormData();
      formData.append("file", file);
      formData.append("user_email", user.email);

      const response = await fetch(
        "https://clipper-api-final-1.onrender.com/transcribe",
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to transcribe");

      const transcriptText = result.text || result.transcript || "";

      // ✅ Save to Supabase
      const { error } = await supabase.from("transcriptions").insert([
        {
          user_email: user.email,
          file_name: file.name,
          transcript_text: transcriptText,
          created_at: new Date(),
        },
      ]);

      if (error) {
        console.error("❌ Supabase insert error:", error);
        alert("Error saving to Supabase.");
      } else {
        alert("✅ Transcription saved successfully!");
      }

      setTranscript(transcriptText);
    } catch (err) {
      console.error("Error:", err);
      alert("Error during transcription.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-md w-96 text-center">
        <h1 className="text-2xl font-bold mb-2">🎧 PTSEL Clipper Studio</h1>
        <p className="text-gray-600 mb-4">
          Upload any audio or video file and let AI transcribe it instantly.
        </p>

        <input
          type="file"
          accept="audio/*,video/*"
          onChange={(e) => setFile(e.target.files[0])}
          className="mb-4"
        />

        <button
          onClick={handleUpload}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg w-full disabled:opacity-50"
        >
          {loading ? "Transcribing..." : "Upload & Transcribe"}
        </button>

        {transcript && (
          <div className="mt-6 text-left bg-gray-100 p-4 rounded-lg">
            <h2 className="font-semibold mb-2">📝 Transcript:</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{transcript}</p>
          </div>
        )}
      </div>
    </div>
  );
}
