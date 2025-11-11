// src/ClipCard.jsx — S3 Professional Dark Neon
import React from "react";

/**
 * Props
 * - index?: number
 * - start: string "HH:MM:SS"
 * - end: string "HH:MM:SS"
 * - durationSec?: number
 * - durationText?: string
 * - thumbUrl?: string | null
 * - previewUrl?: string | null
 * - finalUrl?: string | null
 * - onPreview?: (src: string) => void
 * - onDownload?: (url: string, start: string, end: string) => void
 * - onTranscript?: (url: string) => void
 * - onSave?: () => void
 * - onDelete?: () => void
 */

function fmtDuration(sec) {
  if (sec == null || Number.isNaN(sec)) return "—";
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h > 0
    ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function ActionButton({ title, onClick, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={[
        "px-2.5 py-1.5 rounded-md text-xs font-medium",
        "transition-all duration-150 outline-none",
        disabled
          ? "bg-[#1b2440] text-white/30 border border-white/10 cursor-not-allowed"
          : "bg-[#1b2440]/70 hover:bg-[#22305a] border border-[#3550a1]/40 hover:border-[#4b6ee8]/70 text-white",
        "shadow-[0_0_0_1px_rgba(80,120,255,0.15),0_8px_20px_-10px_rgba(80,120,255,0.35)]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function ClipCard({
  index,
  start,
  end,
  durationSec,
  durationText,
  thumbUrl,
  previewUrl,
  finalUrl,
  onPreview,
  onDownload,
  onTranscript,
  onSave,
  onDelete,
}) {
  const canPreview = Boolean(previewUrl && onPreview);
  const canDownload = Boolean((previewUrl || finalUrl) && onDownload);
  const canTranscript = Boolean((previewUrl || finalUrl) && onTranscript);
  const canSave = Boolean(onSave);
  const canDelete = Boolean(onDelete);

  const durText =
    (durationText && durationText.trim()) ||
    (typeof durationSec === "number" ? fmtDuration(durationSec) : "—");

  return (
    <div
      className={[
        "group relative overflow-hidden rounded-2xl",
        "border border-[#26355e] bg-gradient-to-b from-[#0B1020] via-[#0f1730] to-[#121a3a]",
        "shadow-[inset_0_0_0_1px_rgba(80,120,255,0.08),0_20px_40px_-20px_rgba(30,60,150,0.55)]",
      ].join(" ")}
    >
      {/* Top: Thumbnail */}
      <div className="relative">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={`Clip ${index != null ? index + 1 : ""} thumbnail`}
            className="w-full h-40 object-cover select-none pointer-events-none"
            draggable="false"
          />
        ) : (
          <div className="w-full h-40 bg-[radial-gradient(1200px_400px_at_-200px_-200px,#243B76_0%,#111833_45%,#0B1020_90%)]" />
        )}

        {/* Play overlay for preview */}
        <button
          type="button"
          disabled={!canPreview}
          onClick={() => canPreview && onPreview(previewUrl)}
          className={[
            "absolute inset-0 grid place-items-center",
            "bg-black/0 group-hover:bg-black/25 transition-colors",
          ].join(" ")}
          title={canPreview ? "Preview" : "No preview available"}
        >
          <div
            className={[
              "scale-95 group-hover:scale-100 transition-transform",
              "rounded-full p-3",
              canPreview
                ? "bg-white/10 backdrop-blur-md ring-1 ring-white/20"
                : "bg-white/[0.04] ring-1 ring-white/[0.06]",
            ].join(" ")}
          >
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              className={canPreview ? "fill-white" : "fill-white/30"}
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </button>

        {/* Duration pill */}
        <div className="absolute right-2 bottom-2">
          <span className="px-2 py-0.5 text-[11px] rounded-md bg-black/60 border border-white/15 text-white/90">
            {durText}
          </span>
        </div>
      </div>

      {/* Meta */}
      <div className="px-3.5 pt-3">
        <div className="flex items-center justify-between">
          <div className="text-[13px] text-white/80 font-medium tracking-wide">
            {index != null ? `Clip ${index + 1}` : "Clip"}
          </div>
          <div className="text-[11px] text-white/40">Start → End</div>
        </div>
        <div className="mt-1 text-[12px] text-white/70 font-mono">
          {start || "00:00:00"} <span className="text-white/30">→</span> {end || "00:00:10"}
        </div>
      </div>

      {/* Actions */}
      <div className="px-3.5 pb-3.5 pt-3">
        <div className="flex flex-wrap gap-1.5">
          <ActionButton
            title="Preview"
            onClick={() => canPreview && onPreview(previewUrl)}
            disabled={!canPreview}
          >
            Preview
          </ActionButton>

          <ActionButton
            title="Download"
            onClick={() =>
              canDownload && onDownload(previewUrl || finalUrl, start, end)
            }
            disabled={!canDownload}
          >
            Download
          </ActionButton>

          <ActionButton
            title="Transcript"
            onClick={() => canTranscript && onTranscript(previewUrl || finalUrl)}
            disabled={!canTranscript}
          >
            Transcript
          </ActionButton>

          <div className="mx-1 h-6 w-px bg-white/10 self-center" />

          <ActionButton
            title={canSave ? "Save to Library" : "Save (connect coming soon)"}
            onClick={() => canSave && onSave()}
            disabled={!canSave}
          >
            Save
          </ActionButton>

          <ActionButton
            title={canDelete ? "Delete Clip" : "Delete (coming soon)"}
            onClick={() => canDelete && onDelete()}
            disabled={!canDelete}
          >
            Delete
          </ActionButton>

          {/* Copy Link (fast utility) */}
          <ActionButton
            title="Copy Preview Link"
            onClick={async () => {
              try {
                const link = previewUrl || finalUrl;
                if (!link) return;
                await navigator.clipboard.writeText(link);
              } catch (_) {}
            }}
            disabled={!previewUrl && !finalUrl}
          >
            Copy Link
          </ActionButton>
        </div>
      </div>

      {/* Neon edge on hover */}
      <div
        className={[
          "pointer-events-none absolute inset-0 rounded-2xl",
          "ring-1 ring-transparent group-hover:ring-[#6C5CE7]/40",
          "shadow-[0_0_0_0_rgba(108,92,231,0)] group-hover:shadow-[0_0_40px_0_rgba(108,92,231,0.25)]",
          "transition-all duration-300",
        ].join(" ")}
      />
    </div>
  );
}
