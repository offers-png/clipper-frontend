import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

export default function AssistantChat({ transcript }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    if (!input.trim()) return;

    const userMsg = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    const res = await fetch(`${API_URL}/ask-ai`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    prompt: input,
    transcript: transcript || "",  // <-- VERY IMPORTANT
  }),
});

      const data = await res.json();
      const botMsg = { sender: "assistant", text: data.reply };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: "assistant", text: "Error contacting AI." },
      ]);
    }

    setInput("");
    setLoading(false);
  }

  return (
    <div style={{ padding: "1rem" }}>
      <div style={{ height: "250px", overflowY: "auto", marginBottom: "1rem" }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: "10px" }}>
            <b>{msg.sender === "user" ? "You" : "AI"}:</b> {msg.text}
          </div>
        ))}
      </div>

      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask something..."
        style={{ width: "80%", marginRight: "10px" }}
      />

      <button onClick={sendMessage} disabled={loading}>
        {loading ? "Thinking..." : "Send"}
      </button>
    </div>
  );
}
