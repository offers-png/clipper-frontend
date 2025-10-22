import { useEffect, useState } from "react";

function App() {
  const [status, setStatus] = useState("Checking backend...");

  useEffect(() => {
    const API = import.meta.env.VITE_API_BASE;
    console.log("Backend API:", API);
    fetch(`${API}/api/health`)
      .then((r) => r.json())
      .then(() => setStatus("✅ Connected to your backend!"))
      .catch(() => setStatus("❌ Cannot reach backend"));
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-gray-800">
      <h1 className="text-4xl font-bold">Clipper Frontend is Live!</h1>
      <p className="mt-4 text-lg">{status}</p>
    </div>
  );
}

export default App;
