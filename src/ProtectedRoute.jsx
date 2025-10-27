import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

export default function ProtectedRoute({ children }) {
  const [status, setStatus] = useState({ loading: true, authed: false });

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      setStatus({ loading: false, authed: !!session });
    })();
    // keep in sync if auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setStatus({ loading: false, authed: !!session });
    });
    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  if (status.loading) return null; // or a spinner
  if (!status.authed) return <Navigate to="/" replace />;
  return children;
}
