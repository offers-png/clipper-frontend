import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthForm from "./AuthForm";
import Clipper from "./Clipper";
import ProtectedRoute from "./ProtectedRoute";
// src/App.jsx
import React from "react";
import Clipper from "./Clipper";

export default function App() {
  return <Clipper />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuthForm />} />
        <Route
          path="/clipper"
          element={
            <ProtectedRoute>
              <Clipper />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
