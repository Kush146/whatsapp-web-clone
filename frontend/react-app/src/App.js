import { useEffect, useState } from "react";
import "./styles.css";
import bg from "./assets/background.jpg";
import { getConversations, getMessagesByUser, sendMessage, deleteMessage } from "./api";



export default function App() {
  const [convos, setConvos] = useState([]);
  const [active, setActive] = useState(null); // wa_id
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (active) loadMessages(active);
  }, [active]);

  const loadConversations = async () => {
    const { data } = await getConversations();
    setConvos(data);
    if (data?.length && !active) setActive(data[0]._id);
  };

  const loadMessages = async (wa_id) => {
    const { data } = await getMessagesByUser(wa_id);
    setMsgs(data);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !active) return;
    await sendMessage({ wa_id: active, message: text, status: "sent" });
    setText("");
    await loadMessages(active);
    await loadConversations();
  };

  const handleDelete = async (id) => {
  if (!window.confirm('Delete this message?')) return;
  await deleteMessage(id);
  await loadMessages(active);
  await loadConversations();
};


return (
  <div className="app">
    <aside className="sidebar">
      <div className="sidebar-header">Chats</div>

      {/* Search (optional filter later) */}
      <div className="search">
        <input placeholder="Search or start a new chat" />
      </div>

      <div className="chat-list">
        {convos.map((c) => (
          <button
            key={c._id}
            className={"chat-item " + (active === c._id ? "active" : "")}
            onClick={() => setActive(c._id)}
          >
            <div className="avatar">
              {(c.name?.[0] || (c._id || "?").toString().slice(-2))}
            </div>
            <div className="chat-meta">
              <div className="chat-title">{c.name || c._id}</div>
              <div className="chat-sub">
                {c.lastMessage} • {new Date(c.lastTime).toLocaleString()}
              </div>
            </div>
            {/* Optional unread badge if you track counts */}
            {/* <span className="badge">2</span> */}
          </button>
        ))}
        {!convos.length && <div className="empty">No conversations yet</div>}
      </div>
    </aside>

    <main className="chat">
      <div className="chat-header">
        {active
          ? `${(convos.find(c => c._id === active)?.name || msgs[0]?.name || 'Contact')} • ${active}`
          : "Select a chat"}
      </div>

      {/* Messages with background */}
      <div
        className="messages"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.07), rgba(255,255,255,.07)), url(${bg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {msgs.map((m) => (
          <div
            key={m._id}
            className={"bubble " + (m.wa_id === active ? "incoming" : "outgoing")}
            title={`Status: ${m.status}`}
          >
            {/* hover actions */}
            <div className="bubble-actions">
              <button
                className="action"
                onClick={() => handleDelete(m._id)}
                title="Delete message"
              >
                🗑
              </button>
            </div>

            <div className="bubble-text">{m.message}</div>

            <div className="bubble-meta">
              {new Date(m.timestamp).toLocaleString()}
              <span
                className={
                  "tick " +
                  (m.status === "read"
                    ? "double read"
                    : m.status === "delivered"
                    ? "double"
                    : "")
                }
              >
                {m.status === "sent" ? "✓" : "✓✓"}
              </span>
            </div>
          </div>
        ))}

        {!msgs.length && active && (
          <div className="empty mid">No messages yet. Send one below.</div>
        )}
      </div>

      <form className="composer" onSubmit={handleSend}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message"
        />
        <button type="submit">Send</button>
      </form>
    </main>
  </div>
);
}