// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Clipper from "./Clipper";

// If you already have auth routing, keep it. For now we render Clipper.
// Replace with your ProtectedRoute if you want to gate it.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Clipper />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
