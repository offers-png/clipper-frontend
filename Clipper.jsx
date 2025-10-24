import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./Login";
import Clipper from "./Clipper"; // rename your main tool file to Clipper.jsx

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
