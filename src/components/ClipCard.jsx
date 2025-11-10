// src/components/ClipCard.jsx
import React from "react";

export default function ClipCard({
  index,
  start,
  end,
  durationSec,
  previewUrl,
  finalUrl,
  onPreview,      // () => void
  onDownload,     // (url, start, end) => void
  onTranscript,   // (url) => void
  onSave,         // optional, Part 2
  onDelete,       // optional, Part 2
}) {
  const duration =
    typeof durationSec === "number" && durationSec > 0
      ? `${Math.floor(durationSec)}s`
      : (start && end) ? `${start} → ${end}` : "—";

  return (
    <div className="border border-[#27324A] rounded-lg p-3 bg-[#12182B]">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold text-white/90">Clip {index + 1}</div>
        <div className="text-xs text-gray-400">{duration}</div>
      </div>

      {/* Thumbnail substitute */}
      <div className="relative aspect-video bg-[#0B1020] rounded mb-3 flex items-center justify-center text-white/40 text-xs">
        {previewUrl ? "Preview Ready" : "No Preview"}
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <button
          onClick={onPreview}
          disabled={!previewUrl}
          className="px-3 py-1 rounded bg-[#6C5CE7] hover:bg-[#5A4ED1] disabled:opacity-50"
        >
          Preview
        </button>

        <button
          onClick={() => onDownload(previewUrl || finalUrl, start, end)}
          disabled={!previewUrl && !finalUrl}
          className="px-3 py-1 rounded bg-[#24304A] hover:bg-[#2c3b5c] disabled:opacity-50"
        >
          Download
        </button>

        <button
          onClick={() => onTranscript(previewUrl || finalUrl)}
          disabled={!previewUrl && !finalUrl}
          className="px-3 py-1 rounded bg-[#24304A] hover:bg-[#2c3b5c] disabled:opacity-50"
        >
          Transcript
        </button>

        <button
          onClick={onSave}
          disabled={!onSave}
          className="px-3 py-1 rounded bg-[#24304A] hover:bg-[#2c3b5c] disabled:opacity-50"
          title={onSave ? "" : "Coming in Part 2"}
        >
          Save
        </button>

        <button
          onClick={onDelete}
          disabled={!onDelete}
          className="px-3 py-1 rounded bg-[#4B5563] hover:bg-[#6B7280] disabled:opacity-50"
          title={onDelete ? "" : "Coming in Part 2"}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
