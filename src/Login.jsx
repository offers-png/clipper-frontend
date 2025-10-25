import React, { useState } from "react"
import { supabase } from "./supabaseClient"

export default function AuthForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleSignup = async () => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      console.error("Signup error:", error.message)
      alert(error.message)
    } else {
      alert("Signup successful! Check your email to confirm.")
      console.log("Data:", data)
    }
  }

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error("Login error:", error.message)
      alert(error.message)
    } else {
  alert("Login successful!");
  console.log("Data:", data);
  window.location.href = "/clipper";  // redirect to Clipper page
}
  }

  return (
    <div>
      <h2>Sign In to Clipper Studio</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleLogin}>Login</button>
      <button onClick={handleSignup}>Sign Up</button>
    </div>
  )
}
