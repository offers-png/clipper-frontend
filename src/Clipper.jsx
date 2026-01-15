// src/Clipper.jsx – Netflix grid, modal preview, per-clip transcript, AI helper (S1 foundation)
import React, { useEffect, useState, useRef } from "react";
import { supabase } from "./supabaseClient";
import logo from "./assets/react.svg";
import ClipCard from "./components/ClipCard.jsx";
import AssistantChat from "./components/AssistantChat.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "https://clipper-api-final-1.onrender.com";
const VIDEO_DURATION = 300; // visual ruler only

function timeToSeconds(t) {
  if (!t) return 0;
  const p = t.split(":").map(Number);
  if (p.length === 3) return p[0]*3600 + p[1]*60 + p[2];
  if (p.length === 2) return p[0]*60 + p[1];
  return Number(t) || 0;
}

export default function Clipper() {
  // ---------- auth guard ----------
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) window.location.href = "/";
    })();
  }, []);

  // ---------- state ----------
  const [mode, setMode] = useState("transcribe");
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [currentRecordId, setCurrentRecordId] = useState(null); // ✅ FIXED: Only one declaration
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");
  const [clipMsg, setClipMsg] = useState("");

  const [clips, setClips] = useState([{ start: "00:00:00", end: "00:00:10", summary: "" }]);
  const [watermarkOn, setWatermarkOn] = useState(true);
  const [wmText, setWmText] = useState("@ClippedBySal");

  // results from /clip_multi
  const [generated, setGenerated] = useState([]); // [{start,end,preview_url,final_url,thumb_url,duration_text,duration_seconds}]

  // modal preview
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSrc, setPreviewSrc] = useState("");

  // AI helper (S1)
  const [aiOpen, setAiOpen] = useState(true);
  const [aiMsgs, setAiMsgs] = useState([]);
  const [aiInput, setAiInput] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const aiBottomRef = useRef(null);
  useEffect(() => { aiBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [aiMsgs]);

  const [copied, setCopied] = useState(false);

  const resetMessages = () => { setError(""); setClipMsg(""); };

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  // ---------- transcribe (file or URL) ----------
  async function handleTranscribe() {
    try {
      resetMessages();
      setIsBusy(true);

      const fd = new FormData();
      
      // ✅ Get user info from Supabase
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.email || "@ClippedBySal";
      
      fd.append("user_id", userId);

      // ✅ If we already generated clips, transcribe the FIRST preview clip
      if (generated.length > 0 && generated[0].preview_url) {
        fd.append("url", generated[0].preview_url);
      }
      // ✅ Otherwise allow raw upload / URL
      else if (url.trim()) {
        fd.append("url", url.trim()); 
      }
      else {
        if (!file) {
          setError("Choose a file or paste a URL.");
          setIsBusy(false);
          return;
        }
        fd.append("file", file);
      }

      const res = await fetch(`${API_BASE}/transcribe`, {
        method: "POST",
        body: fd
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Transcription failed");

      setTranscript(data.text || "(no text)");
      
      // ✅ Get the latest record ID from history
      if (data.saved_to_db) {
        const historyRes = await fetch(`${API_BASE}/history/${userId}?limit=1`);
        const historyData = await historyRes.json();
        if (historyData.history && historyData.history.length > 0) {
          setCurrentRecordId(historyData.history[0].id);
          console.log("✅ Record ID saved:", historyData.history[0].id);
        }
      }

      setAiMsgs(m => [
        ...m,
        { role: "assistant", content: "📝 Transcript is ready. Ask for titles, hooks, or best moments." }
      ]);

    } catch (e) {
      setError(e.message);
    } finally {
      setIsBusy(false);
    }
  }

  // ---------- clip helpers ----------
  function addClip() {
    if (clips.length >= 5) return;
    setClips([...clips, { start: "00:00:00", end: "00:00:10", summary: "" }]);
  }
  function updateClip(i, k, v) { const n=[...clips]; n[i][k]=v; setClips(n); }
  function cancelClip(i) { setClips(clips.filter((_, idx) => idx !== i)); }
  function cancelAll() { setClips([]); setClipMsg(""); }

  function deriveDownloadName(original, start, end) {
    const base = (original || "video").replace(/\.[^.]+$/, "");
    return `${base}_${start.replaceAll(":","-")}-${end.replaceAll(":","-")}.mp4`;
  }
  function downloadUrl(href, filename) {
    const a = document.createElement("a");
    a.href = href;
    a.download = filename || "clip.mp4";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function handleClipAll() {
    try {
      resetMessages();
      if (!file && !url) return setError("Select a video OR paste a URL first.");
      if (clips.length === 0) return setError("No clips added.");
      setIsBusy(true);

      const fd = new FormData();
      if (file) fd.append("file", file);
      if (!file && url) fd.append("url", url.trim());
      fd.append("sections", JSON.stringify(clips.map(({start,end})=>({start, end}))));
      fd.append("watermark", watermarkOn ? "1" : "0");
      fd.append("wm_text", wmText);
      fd.append("preview_480", "1");
      fd.append("final_1080", "0");

      const res = await fetch(`${API_BASE}/clip_multi`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Multi-clip failed");

      setGenerated(Array.isArray(data.items) ? data.items : []);
      setClipMsg("✅ All clips processed.");
      setMode("clip"); // jump to clip view
    } catch (e) { setError(e.message); }
    finally { setIsBusy(false); }
  }

  // per-clip transcript (URL → Whisper)
  async function transcribeClipByUrl(clipUrl) {
    try {
      if (!clipUrl) throw new Error("No clip URL provided.");
      setIsBusy(true);

      const fd = new FormData();
      fd.append("clip_url", clipUrl);

      const res = await fetch(`${API_BASE}/transcribe_clip`, {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Clip transcription failed");

      setClipMsg("📝 Clip transcript ready (see Transcript panel)");
      setTranscript(data.text || "(no text)");
      setMode("transcribe");
    } catch (e) {
      setError(e.message);
    } finally {
      setIsBusy(false);
    }
  }

  // ✅ Save AI insights to database
  async function saveAIInsights(type, content) {
    try {
      if (!currentRecordId) {
        console.log("⚠️ No record ID - skipping save");
        return;
      }

      const fd = new FormData();
      fd.append("record_id", currentRecordId);
      fd.append(type, content);

      const res = await fetch(`${API_BASE}/history/update`, {
        method: "POST",
        body: fd
      });

      const data = await res.json();
      if (data.ok) {
        console.log(`✅ Saved ${type} to database`);
      }
    } catch (e) {
      console.error("Error saving to DB:", e);
    }
  }

  // ---------- AI helper (S1) ----------
  async function askAI(message, insightType = null) {
    if (!message.trim()) return;
    try {
      setAiBusy(true);
      const fd = new FormData();
      fd.append("user_message", message);
      fd.append("transcript", transcript || "");
      fd.append("history", JSON.stringify(aiMsgs));

      const res = await fetch(`${API_BASE}/ai_chat`, {
        method: "POST",
        body: fd
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "AI helper failed");

      const aiReply = data.reply || "(no reply)";

      setAiMsgs(m => [
        ...m,
        { role: "user", content: message },
        { role: "assistant", content: aiReply },
      ]);

      // ✅ Auto-save AI responses to database
      if (insightType && currentRecordId) {
        await saveAIInsights(insightType, aiReply);
      }

    } catch (e) {
      setError(e.message);
    } finally {
      setAiBusy(false);
    }
  }

  function tplSummarize() {
    if (!transcript) return setError("Transcribe first or paste a URL.");
    askAI("Summarize the transcript into 5 bullet points with key takeaways.", "summary");
  }

  function tplTitles() {
    if (!transcript) return setError("Transcribe first or paste a URL.");
    askAI("Write 5 viral, punchy titles (max 60 chars each) based on this transcript.", "titles");
  }

  function tplHooks() {
    if (!transcript) return setError("Transcribe first or paste a URL.");
    askAI("Give me 7 short opening hooks (under 80 chars) tailored for Shorts/TikTok.", "hooks");
  }

  function tplHashtags() {
    if (!transcript) return setError("Transcribe first or paste a URL.");
    askAI("Suggest 10 relevant hashtags + 10 SEO keywords for this content.", "hashtags");
  }

  async function tplBestMoments() {
    try {
      if (!transcript) return setError("Transcribe first or paste a URL.");
      setAiBusy(true);
      const fd = new FormData();
      fd.append("transcript", transcript);
      fd.append("max_clips", "3");
      const res = await fetch(`${API_BASE}/auto_clip`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Auto-clip failed");
      if (Array.isArray(data.clips) && data.clips.length) {
        setClips(
          data.clips.slice(0, 5).map(c => ({
            start: c.start || "00:00:00",
            end: c.end || "00:00:10",
            summary: c.summary || "",
          }))
        );
        setAiMsgs(m => [...m, { role: "assistant", content: `🎯 Loaded ${Math.min(5, data.clips.length)} suggested moments into your clip list.` }]);
        setMode("clip");
      } else {
        setAiMsgs(m => [...m, { role: "assistant", content: "I couldn't find clear moments. Try a different video or longer transcript." }]);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setAiBusy(false);
    }
  }

  function TemplateBar() {
    return (
      <div className="flex flex-wrap gap-2">
        <button onClick={tplBestMoments} disabled={aiBusy} className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">🎬 Best 3 Moments</button>
        <button onClick={tplTitles} disabled={aiBusy} className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50">✏️ Viral Titles</button>
        <button onClick={tplHooks} disabled={aiBusy} className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50">💬 Hooks</button>
        <button onClick={tplHashtags} disabled={aiBusy} className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50">#️⃣ Hashtags</button>
        <button onClick={tplSummarize} disabled={aiBusy} className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50">📄 Summary</button>
      </div>
    );
  }

  // ... REST OF YOUR UI CODE STAYS EXACTLY THE SAME ...
  // (Keep everything from line 350 onwards unchanged)
