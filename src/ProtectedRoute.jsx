// src/ProtectedRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

export default function ProtectedRoute({ children }) {
  const [checking, setChecking] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    let ignore = false;

    supabase.auth.getSession().then(({ data, error }) => {
      if (ignore) return;
      if (error) {
        console.error("Error getting session:", error);
        setSession(null);
      } else {
        setSession(data?.session || null);
      }
      setChecking(false);
    });

    // optional: subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (!ignore) setSession(sess);
    });

    return () => {
      ignore = true;
      subscription.unsubscribe();
    };
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B1020] text-white">
        Checking session…
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/" replace />;
  }

  return children;
}
