import React, { useState } from "react";
import { supabase } from "./supabaseClient";

export default function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignup = async () => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert("Signup successful! Check your email to confirm.");
  };

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else window.location.href = "/clipper";
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: "https://clipper-frontend.onrender.com/clipper" },
    });
    if (error) alert(error.message);
  };

  return (
    <div className="auth-bg">
      <div className="auth-card text-center">
        <h2 className="text-2xl font-bold mb-2 text-white">ClipForge AI</h2>
        <p className="text-sm text-white/50 mb-6">Sign in to continue</p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="mt-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={handleLogin} className="btn-primary">Sign In</button>
        <button onClick={handleSignup} className="btn-primary bg-[#FF4D4D] hover:bg-[#e63e3e]">Sign Up</button>

        <div className="mt-4 text-white/50 text-sm">OR</div>
        <button onClick={handleGoogleLogin} className="btn-google">
          <img src="https://www.svgrepo.com/show/355037/google.svg" alt="Google" />
          Continue with Google
        </button>

        <div className="footer">© 2025 ClipForge AI • All rights reserved</div>
      </div>
    </div>
  );
}
