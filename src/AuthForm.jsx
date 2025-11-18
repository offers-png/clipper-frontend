// src/AuthForm.jsx   (or Login.jsx / LoginPage.jsx – use the name your project uses)
import React, { useState } from "react";
import { supabase } from "./supabaseClient";

export default function AuthForm() {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!email.trim() || !password.trim()) {
        setError("Email and password are required.");
        return;
      }

      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        // Go to main app after sign in
        window.location.href = "/clipper";
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        // Let user know what to do next
        alert("Signup successful! Check your email to confirm, then Sign In.");
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: "https://clipper-frontend.onrender.com/clipper",
        },
      });
      if (error) throw error;
      // Supabase will redirect; no further action here.
    } catch (err) {
      setError(err.message || "Google sign-in failed.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050815] text-white px-4">
      <div className="w-full max-w-md bg-[#0B1020] p-8 rounded-2xl border border-[#27324A] shadow-xl">
        <h1 className="text-2xl font-semibold mb-2 text-center">ClipForge AI</h1>
        <p className="text-sm text-center text-white/50 mb-6">
          {mode === "signin" ? "Sign in to continue" : "Create a new account"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              className="w-full bg-[#050815] border border-[#27324A] rounded px-3 py-2 text-white"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Password</label>
            <input
              type="password"
              className="w-full bg-[#050815] border border-[#27324A] rounded px-3 py-2 text-white"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#6C5CE7] hover:bg-[#5A4ED1] disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg py-2 mt-2"
          >
            {loading
              ? mode === "signin"
                ? "Signing in..."
                : "Signing up..."
              : mode === "signin"
              ? "Sign In"
              : "Sign Up"}
          </button>
        </form>

        <div className="flex items-center gap-2 my-4">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-white/40">OR</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white text-[#050815] font-medium rounded-lg py-2 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <img
            src="https://www.svgrepo.com/show/355037/google.svg"
            alt="Google"
            className="w-4 h-4"
          />
          Continue with Google
        </button>

        <div className="mt-4 text-center text-xs text-white/50">
          {mode === "signin" ? (
            <>
              Don’t have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="text-[#6C5CE7] hover:underline"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="text-[#6C5CE7] hover:underline"
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
