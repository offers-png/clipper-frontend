// src/ClipCard.jsx
import React from "react";

export default function ClipCard({
  index,
  start,
  end,
  durationSec,
  durationText,
  thumbUrl,
  previewUrl,
  finalUrl,
  onPreview,        // () => void (should open modal with previewUrl)
  onDownload,       // (url, start, end) => void
  onTranscript,     // (url) => void
  onSave,           // optional (future; no-op now)
  onDelete,         // optional (future; no-op now)
}) {
  const showPreview = () => {
    if (typeof onPreview === "function" && previewUrl) onPreview(previewUrl);
  };
  const doDownload = () => {
    const url = finalUrl || previewUrl;
    if (url && typeof onDownload === "function") onDownload(url, start, end);
  };
  const doTranscript = () => {
    const url = finalUrl || previewUrl;
    if (url && typeof onTranscript === "function") onTranscript(url);
  };

  return (
    <div className="border border-[#27324A] rounded-lg bg-[#12182B] overflow-hidden">
      {/* Thumb + duration overlay */}
      <div className="relative">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={`Clip ${index + 1}`}
            className="w-full h-40 object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-40 bg-[#0B1020] flex items-center justify-center text-white/40">
            No thumbnail
          </div>
        )}
        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
          {durationText || (durationSec ? `${Math.round(durationSec)}s` : "--")}
        </div>
      </div>

      {/* Meta */}
      <div className="p-3 text-sm">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-white/90">Clip {index + 1}</div>
          <div className="text-white/60">{start} → {end}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-3 pb-3 flex flex-wrap gap-2">
        <button
          onClick={showPreview}
          className="px-3 py-1.5 rounded bg-[#24304A] hover:bg-[#2c3b5c]"
          disabled={!previewUrl}
          title="Preview clip"
        >
          Preview
        </button>

        <button
          onClick={doDownload}
          className="px-3 py-1.5 rounded bg-[#6C5CE7] hover:bg-[#5A4ED1]"
          disabled={!previewUrl && !finalUrl}
          title="Download clip"
        >
          Download
        </button>

        <button
          onClick={doTranscript}
          className="px-3 py-1.5 rounded bg-[#24304A] hover:bg-[#2c3b5c]"
          disabled={!previewUrl && !finalUrl}
          title="Transcribe this clip"
        >
          Transcript
        </button>

        {/* placeholders for later wiring */}
        <button
          onClick={() => (onSave ? onSave() : null)}
          className="px-3 py-1.5 rounded bg-[#1E293B] hover:bg-[#24364A]"
          title="Save (coming next)"
        >
          Save
        </button>
        <button
          onClick={() => (onDelete ? onDelete() : null)}
          className="px-3 py-1.5 rounded bg-[#ef4444] hover:bg-[#dc2626]"
          title="Delete (coming next)"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
