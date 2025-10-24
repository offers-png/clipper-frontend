import React, { useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Connect to Supabase
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function Login() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) setMessage(error.message);
    else setMessage("✅ Check your email for the login link!");
  };

  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      <h2>Sign In to PTSEL Multi-Clip Studio</h2>
      <input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{
          padding: "10px",
          width: "280px",
          marginTop: "20px",
          borderRadius: "6px",
          border: "1px solid #ccc",
        }}
      />
      <br />
      <button
        onClick={handleLogin}
        style={{
          marginTop: "20px",
          background: "#6c63ff",
          color: "white",
          padding: "10px 25px",
          borderRadius: "8px",
          border: "none",
          cursor: "pointer",
        }}
      >
        Sign In
      </button>
      <p style={{ marginTop: "20px", color: "gray" }}>{message}</p>
    </div>
  );
}
