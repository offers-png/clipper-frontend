// src/LoginPage.jsx
import React, { useState } from "react";
import { supabase } from "./supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const login = async () => {
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setError(error.message);
    window.location.href = "/app";
  };

  const signup = async () => {
    setError("");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return setError(error.message);
    alert("Signup successful! Check your email to confirm.");
  };

  const googleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/app" }
    });
    if (error) setError(error.message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B1020] text-white px-4">
      <div className="w-full max-w-md bg-[#12182B] p-8 rounded-xl border border-[#27324A] shadow-xl">
        <h1 className="text-2xl font-semibold mb-6 text-center">ClipForge AI</h1>

        <div className="space-y-4">
          <input
            className="w-full bg-[#0B1020] border border-[#27324A] rounded px-3 py-2"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            className="w-full bg-[#0B1020] border border-[#27324A] rounded px-3 py-2"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button onClick={login} className="w-full bg-[#6C5CE7] py-2 rounded-lg">Sign In</button>
          <button onClick={signup} className="w-full bg-[#FF4D4D] py-2 rounded-lg">Sign Up</button>

          <button onClick={googleLogin} className="w-full bg-white text-black py-2 rounded-lg flex items-center justify-center gap-2">
            <img src="https://www.svgrepo.com/show/355037/google.svg" className="w-5" />
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
}
