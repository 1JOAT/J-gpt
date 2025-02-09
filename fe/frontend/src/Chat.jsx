import { useState, useEffect, useRef } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import "./index.css";

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get("http://localhost:3000/chat/history");
        setMessages(res.data.history);
      } catch (error) {
        console.error("Error loading chat history:", error);
      }
    };
    fetchHistory();
  }, []);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newUserMessage = { role: "user", text: input };
    setMessages((prev) => [...prev, newUserMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post("http://localhost:3000/chat", { prompt: input });
      const botMessage = { role: "model", text: res.data.response };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage = { role: "model", text: "Oops! Something went wrong." };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };
  const clearChat = async () => {
    try {
      await axios.delete("http://localhost:3000/chat/clear");
      setMessages([]); 
    } catch (error) {
      console.error("Error clearing chat:", error);
    }
  };
  const chatEndRef = useRef(null);

    useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);
  
  return (
    <div className="chat-container">
        <button className="clear-chat-btn" onClick={clearChat}>Clear Chat</button>
      <div className="chat-header">J-gpt</div>
      <div className="chat-box">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            <div ref={chatEndRef}></div>
            {msg.role === "model" ? (
              <ReactMarkdown>{msg.text}</ReactMarkdown>
            ) : (
              msg.text
            )}
          </div>
        ))}
        {loading && (
          <div className="message bot">
            <div className="loading-message">
              <span>Generating response</span>
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="input-container">
        <input
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}
