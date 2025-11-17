import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./Login";
import Clipper from "./Clipper";
import ProtectedRoute from "./ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

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
