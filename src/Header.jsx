import React from "react";
import logo from "../assets/clipforge-logo.png";

export default function Header({ user, onLogout, wmOn, setWmOn, wmText, setWmText }) {
  return (
    <header className="flex justify-between items-center px-6 py-3 bg-[#0B1020] border-b border-[#1E2A4A] shadow-md">
      <div className="flex items-center gap-3">
        <img src={logo} alt="ClipForge AI" className="h-8 w-8 rounded-md" />
        <h1 className="text-xl font-bold text-white tracking-wide">ClipForge AI</h1>
      </div>

      <div className="flex items-center gap-4 text-white/70 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={wmOn} onChange={e => setWmOn(e.target.checked)} />
          Watermark
        </label>

        {wmOn && (
          <input
            value={wmText}
            onChange={e => setWmText(e.target.value)}
            placeholder="@YourHandle"
            className="bg-[#12182B] border border-[#27324A] text-white text-sm rounded-md px-2 py-1 w-40 outline-none"
          />
        )}

        <button
          onClick={onLogout}
          className="bg-[#6C5CE7] hover:bg-[#5A4ED1] text-white px-3 py-1 rounded-md transition-all duration-150"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
