import React, { useState } from "react";
import { createClient } from "@supabase/supabase-js";

// connect to Supabase
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setMessage(error.message);
    else {
      setMessage("✅ Logged in!");
      onLogin(); // move to dashboard
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) setMessage(error.message);
    else setMessage("🎉 Check your email to confirm your account!");
  };

  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      <h2>Sign In to Clipper Studio</h2>
      <form style={{ marginTop: "20px" }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: "10px", width: "280px", marginBottom: "10px" }}
        />
        <br />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: "10px", width: "280px" }}
        />
        <br />
        <button
          onClick={handleLogin}
          style={{
            marginTop: "15px",
            background: "#6c63ff",
            color: "white",
            padding: "10px 25px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
          }}
        >
          Login
        </button>
        <button
          onClick={handleSignup}
          style={{
            marginTop: "15px",
            marginLeft: "10px",
            background: "#4CAF50",
            color: "white",
            padding: "10px 25px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
          }}
        >
          Sign Up
        </button>
      </form>
      <p style={{ marginTop: "15px", color: "gray" }}>{message}</p>
    </div>
  );
}
