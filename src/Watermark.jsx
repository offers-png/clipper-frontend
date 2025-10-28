import React from "react";

if watermark_text and watermark_text.strip():
    draw = [
        "-vf",
        f"drawtext=text='{watermark_text}':x=w-tw-20:y=h-th-20:"
        "fontcolor=white:fontsize=24:box=1:boxcolor=black@0.4:boxborderw=8"
    ]

export default function Watermark() {
  return (
    <div className="fixed bottom-3 right-4 text-xs text-gray-400 select-none opacity-70">
      © PTSEL AI Tools 2025 — <span className="text-blue-500">@ClippedBySal</span>
    </div>
  );
}
