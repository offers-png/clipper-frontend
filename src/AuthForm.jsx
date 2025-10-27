import React, { useState } from "react";
import { supabase } from "./supabaseClient";

export default function AuthForm() {
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleEmailAuth(e) {
    e.preventDefault();
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) return alert(error.message);
      alert("Signup successful. Check your email to confirm.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return alert(error.message);
      window.location.href = "/clipper";
    }
  }

  async function handleGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/clipper` }
    });
    if (error) alert(error.message);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-emerald-50">
      <div className="w-full max-w-md bg-white/90 backdrop-blur rounded-2xl shadow p-6">
        <div className="text-center mb-4">
          <div className="text-2xl font-bold">🎧 PTSEL Clipper Studio</div>
          <div className="text-gray-500 text-sm">Sign in to continue</div>
        </div>

        <div className="flex gap-2 justify-center mb-4">
          <button
            className={`px-4 py-2 rounded-lg border ${mode === "signin" ? "bg-blue-600 text-white border-blue-600" : ""}`}
            onClick={() => setMode("signin")}
          >
            Sign In
          </button>
          <button
            className={`px-4 py-2 rounded-lg border ${mode === "signup" ? "bg-blue-600 text-white border-blue-600" : ""}`}
            onClick={() => setMode("signup")}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            className="w-full border rounded px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full border rounded px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button className="w-full bg-blue-600 text-white rounded-lg py-2">
            {mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px bg-gray-200 flex-1" />
          <div className="text-xs text-gray-400">OR</div>
          <div className="h-px bg-gray-200 flex-1" />
        </div>

        <button
          onClick={handleGoogle}
          className="w-full border rounded-lg py-2 hover:bg-gray-50"
        >
          Continue with Google
        </button>

        <div className="mt-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} PTSEL • All rights reserved
        </div>
      </div>
    </div>
  );
}
