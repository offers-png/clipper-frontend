// src/components/ClipCard.jsx
import React from "react";

export default function ClipCard({
  index,
  start,
  end,
  durationSec,
  previewUrl,
  finalUrl,
  onPreview,
  onDownload,
  onTranscript,
  onSave,
  onDelete,
}) {
  const title = `Clip ${index !== null && index !== undefined ? index + 1 : ""}`.trim();
  const thumb = previewUrl || finalUrl || "";

  function fmtDur(s) {
    if (!s && s !== 0) return "—";
    const d = Math.max(0, Math.round(Number(s)));
    const m = Math.floor(d/60);
    const ss = (d % 60).toString().padStart(2,"0");
    return `${m}:${ss}`;
  }

  return (
    <div className="border border-[#27324A] rounded-lg overflow-hidden bg-[#12182B]">
      {/* Simple thumb */}
      <div className="aspect-video bg-[#0B1020] flex items-center justify-center text-xs text-white/60">
        {thumb ? (
          <video
            src={thumb}
            className="w-full h-full object-cover"
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          <span>No preview</span>
        )}
      </div>

      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-sm">{title || "Clip"}</div>
          <div className="text-xs text-white/60">{fmtDur(durationSec)}</div>
        </div>
        <div className="text-[11px] text-white/60">{start} → {end}</div>

        <div className="flex flex-wrap gap-2 pt-1">
          {previewUrl && onPreview && (
            <button onClick={()=>onPreview(previewUrl)} className="text-xs bg-[#24304A] hover:bg-[#2c3b5c] px-2 py-1 rounded">
              Preview
            </button>
          )}
          {(previewUrl || finalUrl) && onDownload && (
            <button
              onClick={()=>onDownload(previewUrl || finalUrl, start, end)}
              className="text-xs bg-[#24304A] hover:bg-[#2c3b5c] px-2 py-1 rounded"
            >
              Download
            </button>
          )}
          {onTranscript && (previewUrl || finalUrl) && (
            <button
              onClick={()=>onTranscript(previewUrl || finalUrl)}
              className="text-xs bg-[#24304A] hover:bg-[#2c3b5c] px-2 py-1 rounded"
            >
              Transcript
            </button>
          )}
          {onSave && (
            <button onClick={onSave} className="text-xs bg-emerald-600 hover:bg-emerald-700 px-2 py-1 rounded">
              Save
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} className="text-xs bg-rose-600 hover:bg-rose-700 px-2 py-1 rounded">
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
