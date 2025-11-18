// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthForm from "./AuthForm";        // or "./Login" / "./LoginPage" if you used that name
import Clipper from "./Clipper";
import ProtectedRoute from "./ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login / Signup page */}
        <Route path="/" element={<AuthForm />} />

        {/* Main app (requires auth) */}
        <Route
          path="/clipper"
          element={
            <ProtectedRoute>
              <Clipper />
            </ProtectedRoute>
          }
        />

        {/* Anything unknown -> back to login instead of blank page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
