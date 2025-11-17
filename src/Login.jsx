import React, { useState } from "react";
import { supabase } from "./supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function loginEmail() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return setError(error.message);
    window.location.href = "/app";
  }

  async function signupEmail() {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) return setError(error.message);
    alert("Check your email to confirm your account.");
  }

  async function loginGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "https://ptsel-frontend.onrender.com/app",
      },
    });
    if (error) return setError(error.message);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B1020] text-white px-4">
      <div className="w-full max-w-md bg-[#12182B] p-8 rounded-xl border border-[#27324A] shadow-xl">

        <h1 className="text-2xl font-semibold mb-6 text-center">ClipForge AI</h1>

        <div className="space-y-4">
          {error && <p className="text-red-400 text-sm">{error}</p>}

          <input
            className="w-full bg-[#0B1020] border border-[#27324A] rounded px-3 py-2"
            placeholder="Email"
            onChange={(e) => setEmail(e.target.value)}
            value={email}
          />

          <input
            type="password"
            className="w-full bg-[#0B1020] border border-[#27324A] rounded px-3 py-2"
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
            value={password}
          />

          <button
            onClick={loginEmail}
            className="w-full bg-[#6C5CE7] hover:bg-[#5947d4] rounded-lg py-2"
          >
            Log In
          </button>

          <button
            onClick={signupEmail}
            className="w-full bg-[#FF4444] hover:bg-[#dd3535] rounded-lg py-2"
          >
            Sign Up
          </button>

          <div className="text-center text-sm text-gray-400">OR</div>

          <button
            onClick={loginGoogle}
            className="w-full bg-white text-black rounded-lg py-2 flex items-center justify-center gap-2"
          >
            <img
              src="https://www.svgrepo.com/show/355037/google.svg"
              alt="Google"
              className="w-5 h-5"
            />
            Continue with Google
          </button>

          <div className="flex items-center gap-2 mt-3 text-sm text-gray-400">
            <input type="checkbox" /> Remember me
          </div>
        </div>
      </div>
    </div>
  );
}
