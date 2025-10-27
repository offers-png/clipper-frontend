import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import AuthForm from "./AuthForm";
import Clipper from "./Clipper";

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) =>
      setUser(session?.user)
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  if (!user) return <AuthForm />;
  return <Clipper />;
}
