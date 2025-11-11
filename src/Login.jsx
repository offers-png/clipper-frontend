// src/LoginPage.jsx
import React, { useState } from "react";
import { supabase } from "./supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Enter your email.");
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + "/app" },
    });

    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B1020] text-white px-4">
      <div className="w-full max-w-md bg-[#12182B] p-8 rounded-xl border border-[#27324A] shadow-xl">
        <h1 className="text-2xl font-semibold mb-6 text-center">ClipForge AI</h1>

        {sent ? (
          <p className="text-center text-green-400 text-sm">
            ✅ Magic link sent! Check your email to continue.
          </p>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input
                type="email"
                className="w-full bg-[#0B1020] border border-[#27324A] rounded px-3 py-2 text-white"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <button
              type="submit"
              className="w-full bg-[#6C5CE7] hover:bg-[#5A4ED1] text-white rounded-lg py-2"
            >
              Send Magic Link
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
