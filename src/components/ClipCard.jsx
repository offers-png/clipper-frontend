// src/components/ClipCard.jsx
import React, { useState } from "react";

export default function ClipCard({
  index,
  start,
  end,
  durationSec,
  thumbUrl,
  previewUrl,
  finalUrl,
  onPreview,
  onDownload,
  onTranscript,
  onSave,
  onDelete,
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="bg-[#12182B] border border-[#27324A] rounded-lg p-3 text-white">
        {/* Thumbnail + Duration */}
        <div
          className="relative cursor-pointer"
          onClick={() => setOpen(true)}
        >
          {thumbUrl ? (
            <img
              src={thumbUrl}
              alt="thumb"
              className="w-full h-40 object-cover rounded"
            />
          ) : (
            <div className="w-full h-40 bg-[#1C2539] flex items-center justify-center text-gray-400">
              No Thumbnail
            </div>
          )}
          <div className="absolute bottom-1 right-1 bg-black/70 text-xs px-2 py-0.5 rounded">
            {durationSec ? `${durationSec.toFixed(1)}s` : ""}
          </div>
        </div>

        {/* Info */}
        <div className="mt-2 text-sm">
          <div className="font-semibold">Clip {index + 1}</div>
          <div className="text-gray-400 text-xs">
            {start} → {end}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap gap-2 mt-3 text-xs">
          <button
            onClick={() => setOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 px-2 py-1 rounded"
          >
            Preview
          </button>

          {previewUrl && (
            <button
              onClick={() => onDownload(previewUrl, start, end)}
              className="bg-emerald-600 hover:bg-emerald-700 px-2 py-1 rounded"
            >
              Download
            </button>
          )}

          {previewUrl && (
            <button
              onClick={() => onTranscript(previewUrl)}
              className="bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded"
            >
              Transcript
            </button>
          )}

          {onSave && (
            <button
              onClick={onSave}
              className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
            >
              Save
            </button>
          )}

          {onDelete && (
            <button
              onClick={onDelete}
              className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-[#0B1020] p-3 rounded-lg max-w-xl w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-2">
              <div className="font-semibold text-sm">
                Clip {index + 1} Preview
              </div>
              <button
                className="text-gray-300 hover:text-white"
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </div>

            {previewUrl ? (
              <video
                src={previewUrl}
                controls
                autoPlay
                className="w-full rounded"
              />
            ) : (
              <div className="text-gray-400 text-center py-8">
                No preview available
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
