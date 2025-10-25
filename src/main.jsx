console.log("✅ Vite env:", import.meta.env);
console.log("✅ Starting React app...");
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

function ErrorBoundary({ children }) {
  try {
    return children;
  } catch (err) {
    console.error("❌ App crashed:", err);
    return <div style={{ color: "red", textAlign: "center" }}>App crashed: {err.message}</div>;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
