import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { ShieldAlert, Loader2, Lightbulb, X, Link2, Bot, AlertTriangle } from "lucide-react";
import api from "../../api";
import "./ChatApp.css";

const STORAGE_KEY = "medsuit.chat.sessions.v2";
const ACTIVE_SESSION_KEY = "medsuit.chat.activeSession.v2";

function createSession(title = "New Session") {
  const now = new Date().toISOString();
  return {
    id: `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title,
    createdAt: now,
    updatedAt: now,
    patientId: null,
    messages: [
      {
        id: `m_${Date.now()}_welcome`,
        role: "assistant",
        text: "Hello! I'm your **MedSuite AI Co-Pilot** powered by Mistral AI.\n\nOpen a patient's profile to ask context-aware clinical questions, or ask me anything about general medical workflows.",
        createdAt: now,
      },
    ],
  };
}

function loadSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch (e) {
    console.warn("Unable to parse saved chat sessions", e);
  }
  return [createSession("Session 1")];
}

function loadInitialState() {
  const initialSessions = loadSessions();
  const savedActive = localStorage.getItem(ACTIVE_SESSION_KEY);
  const hasSaved = initialSessions.some((s) => s.id === savedActive);
  return {
    sessions: initialSessions,
    activeSessionId: hasSaved ? savedActive : initialSessions[0].id,
  };
}

/** Parse patient ID from the URL, e.g. /patients/3 → 3 */
function usePatientIdFromUrl() {
  const location = useLocation();
  const match = location.pathname.match(/^\/patients\/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/** Minimal markdown: **bold**, *italic*, `code`, newlines → <br>, bullet lists */
function renderMarkdown(text) {
  if (!text) return "";
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code blocks (triple backtick)
  html = html.replace(/```([\s\S]*?)```/g, '<pre class="chat-code-block">$1</pre>');
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="chat-inline-code">$1</code>');
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Italic
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // Bullet lists
  html = html.replace(/^[-•] (.+)$/gm, '<li class="chat-list-item">$1</li>');
  html = html.replace(
    /(<li class="chat-list-item">[\s\S]*?<\/li>)/g,
    '<ul class="chat-list">$1</ul>'
  );
  // Collapse consecutive <ul> tags
  html = html.replace(/<\/ul>\s*<ul class="chat-list">/g, "");
  // Newlines
  html = html.replace(/\n/g, "<br/>");

  return html;
}

const SEVERITY_STYLES = {
  critical: { bg: "#fef2f2", border: "#fca5a5", color: "#991b1b", dotColor: "#ef4444" },
  warning: { bg: "#fffbeb", border: "#fcd34d", color: "#92400e", dotColor: "#f59e0b" },
  info: { bg: "#eff6ff", border: "#93c5fd", color: "#1e40af", dotColor: "#3b82f6" },
};

export default function ChatApp() {
  const initialStateRef = useRef(null);
  if (!initialStateRef.current) {
    initialStateRef.current = loadInitialState();
  }

  const [isOpen, setIsOpen] = useState(false);
  const [sessions, setSessions] = useState(initialStateRef.current.sessions);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [riskFlags, setRiskFlags] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [showRiskPanel, setShowRiskPanel] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const [activeSessionId, setActiveSessionId] = useState(
    initialStateRef.current.activeSessionId
  );

  const patientId = usePatientIdFromUrl();

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) || sessions[0],
    [sessions, activeSessionId]
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (activeSessionId) localStorage.setItem(ACTIVE_SESSION_KEY, activeSessionId);
  }, [activeSessionId]);

  useEffect(() => {
    const box = scrollRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [activeSession?.messages?.length, isOpen, showRiskPanel]);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  function addSession() {
    const next = createSession(`Session ${sessions.length + 1}`);
    setSessions((prev) => [next, ...prev]);
    setActiveSessionId(next.id);
    setRiskFlags([]);
    setShowRiskPanel(false);
    setIsOpen(true);
  }

  function renameSession() {
    if (!activeSession) return;
    const nextName = window.prompt("Rename session", activeSession.title);
    if (!nextName) return;
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSession.id ? { ...s, title: nextName.trim() || s.title } : s
      )
    );
  }

  function deleteSession() {
    if (!activeSession || sessions.length === 1) return;
    if (!window.confirm(`Delete "${activeSession.title}"?`)) return;
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== activeSession.id);
      if (filtered.length === 0) {
        const fallback = createSession("Session 1");
        setActiveSessionId(fallback.id);
        return [fallback];
      }
      setActiveSessionId(filtered[0].id);
      return filtered;
    });
    setRiskFlags([]);
    setShowRiskPanel(false);
  }

  function updateActiveSession(updater) {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== activeSession.id) return s;
        const updated = updater(s);
        return { ...updated, updatedAt: new Date().toISOString() };
      })
    );
  }

  async function submitMessage(event) {
    event.preventDefault();
    if (!activeSession || !draft.trim() || isLoading) return;

    const now = new Date().toISOString();
    const userMessage = {
      id: `m_${Date.now()}_user`,
      role: "user",
      text: draft.trim(),
      createdAt: now,
    };

    // Add user message + typing indicator
    updateActiveSession((s) => ({ ...s, messages: [...s.messages, userMessage] }));
    const userText = draft.trim();
    setDraft("");
    setIsLoading(true);

    try {
      // Build history from session (skip first welcome message)
      const history = activeSession.messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role, text: m.text }));

      const endpoint = patientId ? `/ai/chat/${patientId}` : "/ai/chat";
      const { data } = await api.post(endpoint, {
        message: userText,
        history,
      });

      const assistantMessage = {
        id: `m_${Date.now()}_assistant`,
        role: "assistant",
        text: data.reply,
        createdAt: new Date().toISOString(),
      };

      updateActiveSession((s) => ({
        ...s,
        messages: [...s.messages, userMessage, assistantMessage],
        patientId: patientId,
      }));
    } catch (err) {
      const errorMsg = {
        id: `m_${Date.now()}_error`,
        role: "assistant",
        text: `**Error:** ${err?.response?.data?.detail || err.message || "Failed to reach AI service."}`,
        createdAt: new Date().toISOString(),
      };
      updateActiveSession((s) => ({
        ...s,
        messages: [...s.messages, userMessage, errorMsg],
      }));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRiskScan() {
    if (!patientId || isScanning) return;
    setIsScanning(true);
    setShowRiskPanel(true);
    setRiskFlags([]);

    try {
      const { data } = await api.post(`/ai/risk-scan/${patientId}`);
      setRiskFlags(data.flags || []);
    } catch (err) {
      setRiskFlags([
        {
          severity: "warning",
          title: "Scan Failed",
          message: err?.response?.data?.detail || "Could not complete risk scan.",
          recommendation: "Try again later.",
        },
      ]);
    } finally {
      setIsScanning(false);
    }
  }

  return (
    <div className="chatapp-root">
      {isOpen && (
        <section className="chatapp-panel" aria-label="AI Clinical Co-Pilot">
          <header className="chatapp-header">
            <div>
              <strong>MedSuite AI Co-Pilot</strong>
              <p>
                {patientId
                  ? <><Link2 size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Patient #{patientId} context active</>
                  : "General mode — open a patient for context"}
              </p>
            </div>
            <div className="chatapp-header-actions">
              {patientId && (
                <button
                  type="button"
                  className="chatapp-risk-btn"
                  onClick={handleRiskScan}
                  disabled={isScanning}
                  title="AI Risk Scan"
                >
                  {isScanning ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <ShieldAlert size={13} />} Risk Scan
                </button>
              )}
              <button
                type="button"
                className="chatapp-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
              >
                <X size={14} />
              </button>
            </div>
          </header>

          <div className="chatapp-session-controls">
            <select
              value={activeSession?.id}
              onChange={(e) => {
                setActiveSessionId(e.target.value);
                setShowRiskPanel(false);
                setRiskFlags([]);
              }}
              aria-label="Select chat session"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
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
              title={sessions.length === 1 ? "At least one session must exist" : "Delete"}
            >
              Delete
            </button>
          </div>

          {/* Risk Scan Panel */}
          {showRiskPanel && (
            <div className="chatapp-risk-panel">
              <div className="chatapp-risk-panel-header">
                <strong><ShieldAlert size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }} />AI Risk Scan Results</strong>
                <button
                  type="button"
                  className="chatapp-risk-dismiss"
                  onClick={() => setShowRiskPanel(false)}
                >
                  <X size={13} />
                </button>
              </div>
              {isScanning ? (
                <div className="chatapp-risk-loading">
                  <div className="chatapp-typing-dots">
                    <span></span><span></span><span></span>
                  </div>
                  <span>Analyzing patient data...</span>
                </div>
              ) : (
                <div className="chatapp-risk-flags">
                  {riskFlags.map((flag, i) => {
                    const sty = SEVERITY_STYLES[flag.severity] || SEVERITY_STYLES.info;
                    return (
                      <div
                        key={i}
                        className="chatapp-risk-card"
                        style={{
                          background: sty.bg,
                          borderColor: sty.border,
                          color: sty.color,
                        }}
                      >
                        <div className="chatapp-risk-card-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: sty.dotColor, flexShrink: 0 }} />
                          {flag.title}
                        </div>
                        <div className="chatapp-risk-card-msg">{flag.message}</div>
                        {flag.recommendation && (
                          <div className="chatapp-risk-card-rec" style={{ display: 'flex', alignItems: 'flex-start', gap: 5 }}>
                            <Lightbulb size={11} style={{ marginTop: 1, flexShrink: 0 }} />
                            {flag.recommendation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="chatapp-disclaimer">
            <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>AI responses are for support only and may be inaccurate. Do not rely on them as a substitute for professional medical judgment.</span>
          </div>

          <div className="chatapp-messages" ref={scrollRef}>
            {activeSession?.messages.map((msg) => (
              <article
                key={msg.id}
                className={`chatapp-bubble chatapp-bubble-${msg.role}`}
              >
                {msg.role === "assistant" ? (
                  <span
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdown(msg.text),
                    }}
                  />
                ) : (
                  <span>{msg.text}</span>
                )}
              </article>
            ))}
            {isLoading && (
              <article className="chatapp-bubble chatapp-bubble-assistant">
                <div className="chatapp-typing-dots">
                  <span></span><span></span><span></span>
                </div>
              </article>
            )}
          </div>

          <form className="chatapp-input" onSubmit={submitMessage}>
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                patientId
                  ? "Ask about this patient..."
                  : "Ask anything about workflows, medicine..."
              }
              aria-label="Type your message"
              disabled={isLoading}
            />
            <button type="submit" disabled={!draft.trim() || isLoading}>
              {isLoading ? "..." : "Send"}
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className="chatapp-fab"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? "Minimize chat" : "Open AI Co-Pilot"}
      >
        {isOpen ? "Hide" : <><Bot size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />AI Co-Pilot</>}
      </button>
    </div>
  );
}
