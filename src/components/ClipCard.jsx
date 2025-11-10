// src/components/ClipCard.jsx
import React from "react";

export default function ClipCard({ idx, item, onDelete, onSave }) {
  const { preview_url, start, end, durationLabel, filename } = item;

  return (
    <div className="border border-[#27324A] bg-[#12182B] rounded-lg p-3 mb-3">
      <div className="flex items-center gap-3">
        <video
          src={preview_url}
          className="w-40 h-24 rounded object-cover bg-black"
          preload="metadata"
          controls
        />
        <div className="flex-1">
          <div className="text-white/90 text-sm font-semibold">
            Clip {idx + 1} <span className="text-white/60">({start} → {end})</span>
          </div>
          <div className="text-xs text-white/60 mt-0.5">{durationLabel}</div>

          <div className="mt-2 flex flex-wrap gap-2">
            <a
              className="text-xs bg-[#24304A] hover:bg-[#2c3b5c] px-2 py-1 rounded"
              href={preview_url}
              target="_blank"
              rel="noreferrer"
            >
              Preview
            </a>
            <a
              className="text-xs bg-[#24304A] hover:bg-[#2c3b5c] px-2 py-1 rounded"
              href={preview_url}
              download={filename || "clip.mp4"}
            >
              Download
            </a>
            <button
              className="text-xs bg-[#24304A] hover:bg-[#2c3b5c] px-2 py-1 rounded"
              onClick={() => alert("Transcript for this clip: coming soon")}
            >
              Transcript
            </button>
            <button
              className="text-xs bg-emerald-600 hover:bg-emerald-700 px-2 py-1 rounded"
              onClick={onSave}
            >
              Save
            </button>
            <button
              className="text-xs bg-rose-600 hover:bg-rose-700 px-2 py-1 rounded"
              onClick={onDelete}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
