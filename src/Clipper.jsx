import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./Login";
import Clipper from "./Clipper"; // rename your main tool file to Clipper.jsx
import { useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);

  return (
    <Router>
      <Routes>
        {!loggedIn ? (
          <Route path="/" element={<Login onLogin={() => setLoggedIn(true)} />} />
        ) : (
          <Route path="/" element={<Clipper />} />
        )}
      </Routes>
    </Router>
  );
}
