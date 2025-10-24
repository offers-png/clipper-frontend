import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./Login";
import Clipper from "./Clipper";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function App() {
  const [session, setSession] = useState(null);

  // ✅ Check login status and listen for changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <Router>
      <Routes>
        {!session ? (
          <Route path="/" element={<Login />} />
        ) : (
          <Route path="/" element={<Clipper />} />
        )}
      </Routes>
    </Router>
  );
}
