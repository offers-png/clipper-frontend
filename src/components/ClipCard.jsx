import React, { useState } from "react";

export default function ClipCard({
  index,
  start,
  end,
  durationSec,
  previewUrl,
  finalUrl,
  onDownload,
  onTranscript,
  onSave,      // (future)
  onDelete     // (future)
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-[#27324A] rounded-lg overflow-hidden bg-[#12182B]">
      <div className="p-3 flex items-center gap-3">
        <div className="text-sm opacity-80">Clip {index + 1}</div>
        <div className="text-xs text-gray-400 ml-auto">{start} → {end} • {durationSec ? `${Math.round(durationSec)}s` : ""}</div>
      </div>

      {/* Thumbnail substitute (simple bar) */}
      <div className="h-20 bg-[#0B1020] flex items-center justify-center text-xs text-gray-500">
        {previewUrl ? "Preview Ready" : "—"}
      </div>

      <div className="p-3 flex flex-wrap gap-2">
        <button
          onClick={() => setOpen(true)}
          disabled={!previewUrl}
          className="px-3 py-1 text-sm rounded bg-[#24304A] disabled:opacity-50"
          title="Preview"
        >
          Preview
        </button>

        <button
          onClick={() => onDownload?.(previewUrl || finalUrl, start, end)}
          disabled={!previewUrl && !finalUrl}
          className="px-3 py-1 text-sm rounded bg-[#24304A] disabled:opacity-50"
          title="Download"
        >
          Download
        </button>

        <button
          onClick={() => onTranscript?.(previewUrl || finalUrl)}
          disabled={!previewUrl && !finalUrl}
          className="px-3 py-1 text-sm rounded bg-[#24304A] disabled:opacity-50"
          title="Transcript this clip"
        >
          Transcript
        </button>

        <button
          onClick={onSave}
          className="px-3 py-1 text-sm rounded bg-[#24304A]"
          title="Save (coming next)"
        >
          Save
        </button>

        <button
          onClick={onDelete}
          className="px-3 py-1 text-sm rounded bg-[#24304A]"
          title="Delete (coming next)"
        >
          Delete
        </button>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#0B1020] border border-[#27324A] rounded-xl w-[92vw] max-w-3xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm opacity-80">Preview • {start} → {end}</div>
              <button onClick={() => setOpen(false)} className="text-xs px-2 py-1 rounded bg-[#24304A]">Close</button>
            </div>
            {previewUrl ? (
              <video
                src={previewUrl}
                controls
                style={{width:"100%", borderRadius: 10}}
                playsInline
              />
            ) : (
              <div className="text-sm text-gray-400">No preview available.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
