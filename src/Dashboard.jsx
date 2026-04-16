import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export default function Dashboard() {
  const [records, setRecords] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        setErrorMsg("Authentication error. Please log in again.");
        setLoading(false);
        return;
      }
      setUser(user);

      // history table uses user_id = email (set by backend as user.email)
      const { data, error: fetchErr } = await supabase
        .from("history")
        .select("*")
        .eq("user_id", user.email)
        .order("created_at", { ascending: false });

      if (fetchErr) {
        console.error("History fetch error:", fetchErr);
        setErrorMsg("Error loading history.");
      } else {
        setRecords(data || []);
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0B1020] to-[#1C2450] flex items-center justify-center">
        <p className="text-white/60 text-sm">Loading your history...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0B1020] to-[#1C2450] flex items-center justify-center">
        <p className="text-red-400 text-sm">{errorMsg}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B1020] via-[#12182B] to-[#1C2450] text-white">
      {/* Header */}
      <div className="border-b border-[#27324A] bg-[#0B1020] sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-wide">📋 My History</h1>
          <div className="flex gap-3 text-sm">
            <span className="text-white/40">{user?.email}</span>
            <a href="/clipper" className="bg-[#6C5CE7] hover:bg-[#5A4ED1] px-3 py-1 rounded text-white">
              ← Back to Clipper
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {records.length === 0 ? (
          <div className="text-center py-20 text-white/40">
            <p className="text-4xl mb-4">🎬</p>
            <p className="text-lg">No history yet.</p>
            <p className="text-sm mt-1">Transcribe a video to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-white/40 mb-4">{records.length} job{records.length !== 1 ? "s" : ""} found</p>
            {records.map((r) => (
              <div
                key={r.id}
                className="border border-[#27324A] rounded-lg bg-[#12182B] overflow-hidden"
              >
                {/* Row header */}
                <button
                  className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-[#1a2235] transition-colors"
                  onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs bg-[#27324A] text-white/60 px-2 py-0.5 rounded shrink-0">
                      {r.job_type || "transcript"}
                    </span>
                    <span className="text-sm font-medium truncate">
                      {r.source_name || "Untitled"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="text-xs text-white/40">
                      {new Date(r.created_at).toLocaleDateString(undefined, {
                        month: "short", day: "numeric", year: "numeric"
                      })}
                    </span>
                    <span className="text-white/40 text-xs">{expanded === r.id ? "▲" : "▼"}</span>
                  </div>
                </button>

                {/* Expanded content */}
                {expanded === r.id && (
                  <div className="border-t border-[#27324A] px-4 py-4 space-y-4">
                    {r.transcript && (
                      <div>
                        <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Transcript</p>
                        <p className="text-sm text-white/80 whitespace-pre-wrap leading-6 max-h-48 overflow-auto bg-[#0B1020] rounded p-3">
                          {r.transcript}
                        </p>
                      </div>
                    )}
                    {r.summary && (
                      <div>
                        <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Summary</p>
                        <p className="text-sm text-white/80 whitespace-pre-wrap bg-[#0B1020] rounded p-3">{r.summary}</p>
                      </div>
                    )}
                    {r.titles && (
                      <div>
                        <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Titles</p>
                        <p className="text-sm text-white/80 whitespace-pre-wrap bg-[#0B1020] rounded p-3">{r.titles}</p>
                      </div>
                    )}
                    {r.hooks && (
                      <div>
                        <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Hooks</p>
                        <p className="text-sm text-white/80 whitespace-pre-wrap bg-[#0B1020] rounded p-3">{r.hooks}</p>
                      </div>
                    )}
                    {r.hashtags && (
                      <div>
                        <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Hashtags</p>
                        <p className="text-sm text-white/80 whitespace-pre-wrap bg-[#0B1020] rounded p-3">{r.hashtags}</p>
                      </div>
                    )}
                    {r.preview_url && (
                      <div>
                        <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Preview</p>
                        <a href={r.preview_url} target="_blank" rel="noreferrer"
                          className="text-indigo-400 hover:underline text-sm">
                          Watch preview ↗
                        </a>
                      </div>
                    )}
                    {r.final_url && (
                      <div>
                        <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Download</p>
                        <a href={r.final_url} target="_blank" rel="noreferrer"
                          className="text-emerald-400 hover:underline text-sm">
                          Download final clip ↗
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
