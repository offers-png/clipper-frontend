// src/components/Modal.jsx
import React from "react";

export default function Modal({ open, onClose, children, title }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-[#0B1020] border border-[#27324A] rounded-xl max-w-3xl w-[92%] p-4 shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold text-white/90">{title}</div>
          <button onClick={onClose} className="px-3 py-1 rounded bg-[#24304A] hover:bg-[#2c3b5c]">
            Close
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
