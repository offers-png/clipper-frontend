// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Clipper from "./Clipper";
import ProtectedRoute from "./ProtectedRoute";
import LoginPage from "./Login"; // <-- correct import

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default Route → Login */}
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

        {/* Catch-all routes redirect to Login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
