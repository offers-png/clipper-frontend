import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";  // <-- Must match filename exactly
import "./index.css";         // Optional if you use Tailwind

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
