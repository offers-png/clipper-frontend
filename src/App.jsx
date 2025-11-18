import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Clipper from "./Clipper";
import ProtectedRoute from "./ProtectedRoute";
import LoginPage from "./LoginPage";
import { useEffect } from "react";
import { supabase } from "./supabaseClient";

useEffect(() => {
  const { data: listener } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (event === "SIGNED_IN") {
        console.log("User signed in:", session?.user);
      }
      if (event === "SIGNED_OUT") {
        console.log("User signed out");
        window.location.href = "/";
      }
    }
  );

  return () => {
    listener.subscription.unsubscribe();
  };
}, []);

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route */}
        <Route path="/" element={<LoginPage />} />

        {/* Protected Route */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <Clipper />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
