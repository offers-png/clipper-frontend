import Dashboard from "./Dashboard";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AuthForm from "./AuthForm";
import Clipper from "./Clipper";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AuthForm />} />
        <Route path="/clipper" element={<Clipper />} />
      </Routes>
    </Router>
  );
}

export default App;
