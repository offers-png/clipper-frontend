const API_URL = "https://clipper-api-final-1.onrender.com";

export async function sendMagicLink(email) {
  const res = await fetch(`${API_URL}/auth/send-magic-link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) throw new Error("Failed to send magic link");

  return res.json();
}
