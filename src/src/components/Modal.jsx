// src/components/ClipModal.jsx
import React, { useEffect, useRef, useState } from "react";

export default function ClipModal({
  open,
  onClose,
  clip,                 // { start, end, previewUrl, finalUrl, transcript? }
  apiBase,              // API_BASE
  globalTranscript,     // full transcript string (GLOBAL memory)
  askAI,                // (message, extraTranscript?) => Promise<string>
  onTranscribeClip,     // (clipUrl) => Promise<void>
}) {
  const videoRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [aiMsgs, setAiMsgs] = useState([]);
  const [aiInput, setAiInput] = useState("");
  const [clipTranscript, setClipTranscript] = useState(clip?.transcript || "");

  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  useEffect(() => {
    setClipTranscript(clip?.transcript || "");
    setAiMsgs([]);
    setAiInput("");
  }, [clip?.previewUrl]);

  if (!open) return null;

  const playUrl = clip?.previewUrl || clip?.finalUrl || "";

  async function runAI(template) {
    if (!template) return;
    try {
      setBusy(true);
      // GLOBAL memory: include full transcript + this clip transcript if present
      const extra =
        (clipTranscript ? `\n\n[Clip Transcript]\n${clipTranscript}` : "") +
        (globalTranscript ? `\n\n[Full Transcript]\n${globalTranscript}` : "");
      const reply = await askAI(template, extra);
      setAiMsgs((m) => [...m, { role: "assistant", content: reply || "(no reply)" }]);
    } catch (e) {
      setAiMsgs((m) => [...m, { role: "assistant", content: "AI error. Check backend key or CORS." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Modal container: left video (60%), right AI (40%) */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-[1200px] bg-[#0B1020] border border-[#27324A] rounded-2xl overflow-hidden shadow-2xl flex">
          {/* Left: Video */}
          <div className="w-[60%] p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-white/90 font-semibold text-sm">
                Preview {clip?.start} → {clip?.end}
              </div>
              <button
                onClick={onClose}
                className="text-xs px-2 py-1 rounded bg-[#24304A] hover:bg-[#2c3b5c]"
              >
                Close
              </button>
            </div>

            <div className="rounded-lg overflow-hidden border border-[#27324A]">
              {playUrl ? (
                <video
                  ref={videoRef}
                  src={playUrl}
                  className="w-full h-auto bg-black"
                  controls
                  playsInline
                />
              ) : (
                <div className="aspect-video flex items-center justify-center text-white/50 text-sm">
                  No preview URL
                </div>
              )}
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => onTranscribeClip?.(playUrl)}
                disabled={!playUrl || busy}
                className="px-3 py-1 rounded bg-[#24304A] hover:bg-[#2c3b5c] disabled:opacity-50 text-sm"
              >
                Transcribe Clip
              </button>
            </div>

            {!!clipTranscript && (
              <div className="mt-4 p-3 rounded border border-[#27324A] bg-[#12182B] max-h-48 overflow-auto text-sm leading-6">
                <div className="font-semibold mb-1">Clip Transcript</div>
                <pre className="whitespace-pre-wrap">{clipTranscript}</pre>
              </div>
            )}
          </div>

          {/* Right: AI (width ~40%) */}
          <div className="w-[40%] border-l border-[#27324A] bg-[#12182B] flex flex-col">
            <div className="p-3 border-b border-[#27324A] flex items-center justify-between">
              <div className="font-semibold">🤖 AI Tools</div>
              <div className="text-xs text-white/60">GLOBAL memory</div>
            </div>

            {/* Tool buttons */}
            <div className="p-3 border-b border-[#27324A] flex flex-wrap gap-2">
              <button
                onClick={() => runAI("Write 5 viral, punchy titles (max 60 chars) for this clip.")}
                disabled={busy}
                className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-sm"
              >
                ✍️ Titles
              </button>
              <button
                onClick={() => runAI("Give 7 short opening hooks (under 80 chars) tailored for Shorts/TikTok based on this clip.")}
                disabled={busy}
                className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-sm"
              >
                💬 Hooks
              </button>
              <button
                onClick={() => runAI("Suggest 10 relevant hashtags and 10 SEO keywords based on this clip.")}
                disabled={busy}
                className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-sm"
              >
                #️⃣ Hashtags
              </button>
              <button
                onClick={() => runAI("Summarize this clip in 5 bullet points with key takeaways.")}
                disabled={busy}
                className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-sm"
              >
                📝 Summary
              </button>
              <button
                onClick={() => runAI("Suggest up to 3 improved timestamp ranges (10–45s each) for this clip with brief reasons. Return JSON with {clips:[{start,end,reason}]} only.")}
                disabled={busy}
                className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-sm"
              >
                🎬 Auto-Cut
              </button>
            </div>

            {/* Chat area */}
            <div className="flex-1 overflow-auto p-3 space-y-2">
              {aiMsgs.length === 0 && (
                <div className="text-white/60 text-sm">
                  Use the buttons above or type your own prompt.
                </div>
              )}
              {aiMsgs.map((m, i) => (
                <div key={i} className={`text-sm leading-6 ${m.role === 'assistant' ? 'text-white' : 'text-indigo-300'}`}>
                  {m.content}
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-[#27324A]">
              <div className="flex gap-2">
                <input
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder="Ask AI about this clip…"
                  className="flex-1 bg-[#0B1020] border border-[#27324A] rounded p-2 text-sm"
                />
                <button
                  onClick={async () => {
                    if (!aiInput.trim()) return;
                    const msg = aiInput.trim();
                    setAiInput("");
                    setBusy(true);
                    try {
                      const extra =
                        (clipTranscript ? `\n\n[Clip Transcript]\n${clipTranscript}` : "") +
                        (globalTranscript ? `\n\n[Full Transcript]\n${globalTranscript}` : "");
                      const reply = await askAI(msg, extra);
                      setAiMsgs((m) => [
                        ...m,
                        { role: "user", content: msg },
                        { role: "assistant", content: reply || "(no reply)" },
                      ]);
                    } finally {
                      setBusy(false);
                    }
                  }}
                  disabled={busy}
                  className="px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  Ask
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
