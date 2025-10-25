import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./Login";
import Clipper from "./Clipper";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/clipper" element={<Clipper />} />
      </Routes>
    </BrowserRouter>
  );
}
