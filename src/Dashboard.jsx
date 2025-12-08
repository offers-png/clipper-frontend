import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export default function Dashboard() {
  const [records, setRecords] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Load current user
  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Auth error:", error);
        setErrorMsg("Authentication error. Try logging in again.");
      } else {
        console.log("User session:", data?.session?.user);
        setUser(data?.session?.user ?? null);
      }
    };
    getUser();
  }, []);
  
 useEffect(() => {
  const loadHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setHistory(data);
  };

  loadHistory();
}, []);

  // Fetch data when user is loaded
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      console.log("Fetching records for user:", user.email);

      const { data, error } = await supabase
        .from("transcriptions")
        .select("*")
        .eq("user_email", user.email)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase fetch error:", error);
        setErrorMsg("Error loading transcriptions.");
      } else {
        console.log("Records:", data);
        setRecords(data || []);
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  // UI rendering
  if (errorMsg) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-red-600">
        <p>{errorMsg}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-500">Loading your transcriptions...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-600 text-lg">
          You must log in first to view your dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center pt-12">
      <h1 className="text-3xl font-bold mb-6">🧾 My Transcriptions</h1>

      {records.length === 0 ? (
        <p className="text-gray-500">No transcriptions found yet.</p>
      ) : (
        <div className="w-3/4 max-w-3xl bg-white rounded-2xl shadow p-6">
          {records.map((r) => (
            <div key={r.id} className="border-b border-gray-200 pb-4 mb-4">
              <h2 className="font-semibold">{r.file_name}</h2>
              <p className="text-sm text-gray-600 mb-2">
                {new Date(r.created_at).toLocaleString()}
              </p>
              <p className="text-gray-800 whitespace-pre-wrap">{r.transcript_text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
