import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setOk(!!session);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div style={{padding: 24}}>Checking session…</div>;
  if (!ok) return <Navigate to="/login" replace />;
  return children;
}
