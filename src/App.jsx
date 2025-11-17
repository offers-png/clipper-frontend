// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Clipper from "./Clipper";
import ProtectedRoute from "./ProtectedRoute";
import LoginPage from "./Login";

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
