import { useEffect, useMemo, useRef, useState } from "react";
import "./ChatApp.css";

const STORAGE_KEY = "medsuit.chat.sessions.v1";
const ACTIVE_SESSION_KEY = "medsuit.chat.activeSession.v1";

function createSession(title = "New Session") {
  const now = new Date().toISOString();
  return {
    id: `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title,
    createdAt: now,
    updatedAt: now,
    messages: [
      {
        id: `m_${Date.now()}_welcome`,
        role: "assistant",
        text: "Hi, I am your MedSuit assistant. Mistral integration will be enabled soon.",
        createdAt: now,
      },
    ],
  };
}

function loadSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (error) {
    console.warn("Unable to parse saved chat sessions", error);
  }
  return [createSession("Session 1")];
}

function loadInitialState() {
  const initialSessions = loadSessions();
  const savedActive = localStorage.getItem(ACTIVE_SESSION_KEY);
  const hasSaved = initialSessions.some((session) => session.id === savedActive);

  return {
    sessions: initialSessions,
    activeSessionId: hasSaved ? savedActive : initialSessions[0].id,
  };
}

export default function ChatApp() {
  const initialStateRef = useRef(null);
  if (!initialStateRef.current) {
    initialStateRef.current = loadInitialState();
  }

  const [isOpen, setIsOpen] = useState(false);
  const [sessions, setSessions] = useState(initialStateRef.current.sessions);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef(null);
  const [activeSessionId, setActiveSessionId] = useState(
    initialStateRef.current.activeSessionId
  );

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) || sessions[0],
    [sessions, activeSessionId]
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem(ACTIVE_SESSION_KEY, activeSessionId);
    }
  }, [activeSessionId]);

  useEffect(() => {
    const box = scrollRef.current;
    if (box) {
      box.scrollTop = box.scrollHeight;
    }
  }, [activeSession, isOpen]);

  function addSession() {
    const nextIndex = sessions.length + 1;
    const next = createSession(`Session ${nextIndex}`);
    setSessions((prev) => [next, ...prev]);
    setActiveSessionId(next.id);
    setIsOpen(true);
  }

  function renameSession() {
    if (!activeSession) return;
    const nextName = window.prompt("Rename session", activeSession.title);
    if (!nextName) return;

    setSessions((prev) =>
      prev.map((session) =>
        session.id === activeSession.id
          ? { ...session, title: nextName.trim() || session.title }
          : session
      )
    );
  }

  function deleteSession() {
    if (!activeSession || sessions.length === 1) return;
    const ok = window.confirm(
      `Delete \"${activeSession.title}\"? This will remove all messages in this session.`
    );
    if (!ok) return;

    setSessions((prev) => {
      const filtered = prev.filter((session) => session.id !== activeSession.id);
      if (filtered.length === 0) {
        const fallback = createSession("Session 1");
        setActiveSessionId(fallback.id);
        return [fallback];
      }
      setActiveSessionId(filtered[0].id);
      return filtered;
    });
  }

  function updateActiveSession(updater) {
    setSessions((prev) =>
      prev.map((session) => {
        if (session.id !== activeSession.id) return session;
        const updated = updater(session);
        return { ...updated, updatedAt: new Date().toISOString() };
      })
    );
  }

  function submitMessage(event) {
    event.preventDefault();
    if (!activeSession || !draft.trim()) return;

    const now = new Date().toISOString();
    const userMessage = {
      id: `m_${Date.now()}_user`,
      role: "user",
      text: draft.trim(),
      createdAt: now,
    };
    const placeholderReply = {
      id: `m_${Date.now()}_assistant`,
      role: "assistant",
      text: "[Placeholder] Mistral response will appear here once backend wiring is complete.",
      createdAt: now,
    };

    updateActiveSession((session) => ({
      ...session,
      messages: [...session.messages, userMessage, placeholderReply],
    }));
    setDraft("");
  }

  return (
    <div className="chatapp-root">
      {isOpen && (
        <section className="chatapp-panel" aria-label="Chat assistant">
          <header className="chatapp-header">
            <div>
              <strong>MedSuit Assistant</strong>
              <p>Live chat UI (Mistral hookup pending)</p>
            </div>
            <button
              type="button"
              className="chatapp-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
            >
              x
            </button>
          </header>

          <div className="chatapp-session-controls">
            <select
              value={activeSession?.id}
              onChange={(e) => setActiveSessionId(e.target.value)}
              aria-label="Select chat session"
            >
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.title}
                </option>
              ))}
            </select>
            <button type="button" onClick={addSession} title="New session">
              New
            </button>
            <button type="button" onClick={renameSession} title="Rename session">
              Rename
            </button>
            <button
              type="button"
              onClick={deleteSession}
              disabled={sessions.length === 1}
              title={
                sessions.length === 1
                  ? "At least one session must exist"
                  : "Delete session"
              }
            >
              Delete
            </button>
          </div>

          <div className="chatapp-messages" ref={scrollRef}>
            {activeSession?.messages.map((message) => (
              <article
                key={message.id}
                className={`chatapp-bubble chatapp-bubble-${message.role}`}
              >
                <span>{message.text}</span>
              </article>
            ))}
          </div>

          <form className="chatapp-input" onSubmit={submitMessage}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask anything about patients, beds, tasks..."
              aria-label="Type your message"
            />
            <button type="submit" disabled={!draft.trim()}>
              Send
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className="chatapp-fab"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? "Minimize chat" : "Open chat"}
      >
        {isOpen ? "Hide chat" : "Chat with AI"}
      </button>
    </div>
  );
}
