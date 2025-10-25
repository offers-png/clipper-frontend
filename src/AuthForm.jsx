import React, { useState } from "react";
import { supabase } from "./supabaseClient";

export default function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignup = async () => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Signup successful! Check your email to confirm.");
    }
  };

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Login successful!");
      // ✅ redirect to Clipper dashboard after login
      window.location.href = "/clipper";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="p-6 bg-white shadow-lg rounded-xl w-80 text-center">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          Sign In to Clipper Studio
        </h2>

        <input
          type="email"
          placeholder="Email"
          className="w-full p-2 mb-3 border rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full p-2 mb-3 border rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex justify-between mt-3">
          <button
            onClick={handleLogin}
            className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
          >
            Login
          </button>
          <button
            onClick={handleSignup}
            className="bg-gray-300 px-3 py-2 rounded hover:bg-gray-400"
          >
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
}
