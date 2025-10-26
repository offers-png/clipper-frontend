import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export default function Dashboard() {
  const [records, setRecords] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data?.session?.user ?? null);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("transcriptions")
        .select("*")
        .eq("user_email", user.email)
        .order("created_at", { ascending: false });

      if (error) console.error("Error loading records:", error);
      else setRecords(data);

      setLoading(false);
    };

    fetchData();
  }, [user]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-600 text-lg">Please log in to view your dashboard.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center pt-12">
      <h1 className="text-3xl font-bold mb-6">🧾 My Transcriptions</h1>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : records.length === 0 ? (
        <p className="text-gray-500">No transcriptions yet. Try uploading one!</p>
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
