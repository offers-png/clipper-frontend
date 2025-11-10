// src/components/ClipCard.jsx
import React, { useState } from "react";

export default function ClipCard({ item, apiBase, onDelete }) {
  const [open, setOpen] = useState(false);
  const [txBusy, setTxBusy] = useState(false);
  const [tx, setTx] = useState("");

  const start = item.start;
  const end = item.end;
  const dur = item.duration_text || `${Math.round(item.duration_seconds || 0)}s`;
  const previewUrl = item.preview_url;
  const thumbUrl = item.thumb_url;

  async function download(url, name = "clip.mp4") {
    const res = await fetch(url);
    const blob = await res.blob();
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u; a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(u);
  }

  async function fetchTranscript() {
    try {
      setTxBusy(true);
      setTx("");
      const fd = new FormData();
      fd.append("url", previewUrl);
      const res = await fetch(`${apiBase}/transcribe`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Transcript failed");
      setTx(data.text || "(no text)");
    } catch (e) {
      setTx(`Error: ${e.message}`);
    } finally {
      setTxBusy(false);
    }
  }

  return (
    <div className="border border-[#27324A] bg-[#12182B] rounded-lg p-3">
      <div className="flex items-center gap-3">
        <img
          src={thumbUrl || ""}
          onClick={() => setOpen(true)}
          className={`w-32 h-18 object-cover rounded cursor-pointer ${thumbUrl ? "" : "opacity-40"}`}
          alt="thumb"
        />
        <div className="flex-1">
          <div className="text-white/90 font-medium">
            Clip ({start} → {end}) • {dur}
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            <button onClick={()=>setOpen(true)} className="px-3 py-1 rounded bg-[#6C5CE7] hover:bg-[#5A4ED1]">▶ Preview</button>
            <button onClick={()=>download(previewUrl)} className="px-3 py-1 rounded bg-[#24304A] hover:bg-[#2c3b5c]">⬇ Download</button>
            <button onClick={fetchTranscript} disabled={txBusy} className="px-3 py-1 rounded bg-[#24304A] hover:bg-[#2c3b5c]">
              {txBusy ? "Transcribing…" : "📝 Transcript"}
            </button>
            <button onClick={onDelete} className="px-3 py-1 rounded bg-red-600 hover:bg-red-700">🗑 Delete</button>
            {/* Save: wire to your Supabase later */}
            <button disabled className="px-3 py-1 rounded bg-slate-600 opacity-70 cursor-not-allowed">💾 Save</button>
          </div>
        </div>
      </div>

      {!!tx && (
        <div className="mt-3 text-xs text-gray-300 bg-[#0F172A] rounded p-2 whitespace-pre-wrap max-h-48 overflow-auto">
          {tx}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={()=>setOpen(false)} />
          <div className="relative bg-[#0B1020] border border-[#27324A] rounded-xl w-[92%] max-w-3xl p-3 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold text-white/90">Preview • {start} → {end}</div>
              <button onClick={()=>setOpen(false)} className="px-3 py-1 rounded bg-[#24304A] hover:bg-[#2c3b5c]">Close</button>
            </div>
            <video src={previewUrl} controls className="w-full rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
}
