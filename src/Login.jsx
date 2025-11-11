import React, { useState } from "react";
import { supabase } from "./supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  const signIn = async (e) => {
    e.preventDefault();
    setMsg("Sending magic link…");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + "/" },
    });
    if (error) setMsg(error.message);
    else setMsg("Check your email for the link.");
  };

  return (
    <div style={{maxWidth: 420, margin: "80px auto", padding: 24, border: "1px solid #333", borderRadius: 12}}>
      <h2>Sign in</h2>
      <p style={{opacity:.7}}>Enter your email to get a magic link.</p>
      <form onSubmit={signIn} style={{marginTop: 16}}>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={e=>setEmail(e.target.value)}
          required
          style={{width: "100%", padding: 10, borderRadius: 8, border: "1px solid #444"}}
        />
        <button type="submit" style={{marginTop: 12, width:"100%", padding: 10, borderRadius: 8, background:"#6C5CE7", color:"#fff", border:0}}>
          Send Link
        </button>
      </form>
      {!!msg && <p style={{marginTop: 10}}>{msg}</p>}
    </div>
  );
}
