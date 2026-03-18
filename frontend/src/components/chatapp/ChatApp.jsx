import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ShieldAlert,
  Loader2,
  Lightbulb,
  X,
  Link2,
  AlertTriangle,
  Send,
  Plus,
  Pencil,
  Trash2,
  MessageSquare,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import api from "../../api";
import "./ChatApp.css";

/* ── Female Nurse SVG Avatar ─────────────────────────────────────────────── */
function NurseAvatar({ isThinking = false, size = "normal" }) {
  const s = size === "small" ? 28 : 44;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 100 100"
      fill="none"
      className={`nurse-avatar${isThinking ? " nurse-avatar--thinking" : ""}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="nurseGrad" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="60%" stopColor="#0d9488" />
          <stop offset="100%" stopColor="#0f766e" />
        </radialGradient>
        <radialGradient id="nurseGradDark" cx="50%" cy="80%" r="50%">
          <stop offset="0%" stopColor="#0d9488" />
          <stop offset="100%" stopColor="#042f2e" />
        </radialGradient>
        <radialGradient id="skinGrad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#ffe4c4" />
          <stop offset="60%" stopColor="#fab088" />
          <stop offset="100%" stopColor="#e3956a" />
        </radialGradient>
        <linearGradient id="capGrad" x1="50" y1="18" x2="50" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
      </defs>

      {isThinking && (
        <>
          <circle cx="50" cy="50" r="47" stroke="#2dd4bf" strokeWidth="2"
            strokeDasharray="16 8" className="nurse-think-ring" />
          <circle cx="50" cy="50" r="43" stroke="#0d9488" strokeWidth="1"
            strokeDasharray="6 12 18 12" className="nurse-think-ring-inner" />
        </>
      )}

      <path d="M30 45 Q26 65 38 75 Q50 82 62 75 Q74 65 70 45 Z" fill="#4a2c17" opacity="0.8" />

      <g className="nurse-avatar-body">
        <path d="M15 100 Q15 65 30 58 Q40 54 50 54 Q60 54 70 58 Q85 65 85 100Z"
          fill="url(#nurseGrad)" />
        <path d="M15 100 Q15 65 30 58 Q40 54 50 54 Q60 54 70 58 Q85 65 85 100Z"
          fill="url(#nurseGradDark)" opacity="0.4" style={{ mixBlendMode: 'multiply' }} />
        <path d="M40 60 L50 78 L60 60 Q55 57 50 56 Q45 57 40 60Z"
          fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
        <path d="M30 58 Q40 65 42 75 L40 60 Z" fill="#e2e8f0" />
        <path d="M70 58 Q60 65 58 75 L60 60 Z" fill="#e2e8f0" />
        <rect x="62" y="68" width="10" height="6" rx="1" fill="#f1f5f9" transform="rotate(5 67 71)" />
        <rect x="63" y="70" width="8" height="2" rx="0.5" fill="#94a3b8" transform="rotate(5 67 71)" />
        <path d="M36 68 Q32 80 40 85 Q48 90 54 84"
          stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <circle cx="55" cy="83" r="4" fill="#cbd5e1" stroke="#334155" strokeWidth="1.5" />
        <circle cx="55" cy="83" r="1.5" fill="#f1f5f9" />
      </g>

      <ellipse cx="50" cy="45" rx="16" ry="19" fill="url(#skinGrad)" />
      <path d="M34 40 Q32 20 50 20 Q68 20 66 40 Q63 32 50 30 Q37 32 34 40Z"
        fill="#5a361d" />
      <path d="M38 34 Q45 23 50 26" stroke="#7a4b2b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M30 32 Q30 14 50 14 Q70 14 70 32 C68 32 68 22 50 22 C32 22 32 32 30 32Z"
        fill="url(#capGrad)" />
      <rect x="33" y="29" width="34" height="6" rx="2" fill="#ffffff" />
      <rect x="44" y="21" width="12" height="3" rx="1" fill="#ef4444" />
      <rect x="48.5" y="16.5" width="3" height="12" rx="1" fill="#ef4444" />

      <path d="M40 38 Q43 36 46 38" stroke="#3d2110" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M54 38 Q57 36 60 38" stroke="#3d2110" strokeWidth="1" fill="none" strokeLinecap="round" />

      <g className="nurse-avatar-eyes">
        <ellipse cx="43" cy="43" rx="3.5" ry="4" fill="#ffffff" />
        <ellipse cx="57" cy="43" rx="3.5" ry="4" fill="#ffffff" />
        <ellipse cx="43" cy="43" rx="2" ry="2.5" fill="#1e3a8a" />
        <ellipse cx="57" cy="43" rx="2" ry="2.5" fill="#1e3a8a" />
        <circle cx="43.5" cy="42" r="0.8" fill="#ffffff" />
        <circle cx="57.5" cy="42" r="0.8" fill="#ffffff" />
      </g>

      <path d="M49 48 L50 51 L52 50" stroke="#d5855f" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx="38" cy="50" rx="3" ry="2" fill="#ef4444" opacity="0.2" />
      <ellipse cx="62" cy="50" rx="3" ry="2" fill="#ef4444" opacity="0.2" />
      <path d="M44 55 Q50 60 56 55" stroke="#b95842" strokeWidth="1.5"
        strokeLinecap="round" fill="transparent" />
      <path d="M46 56 Q50 62 54 56 Z" fill="#ffffff" opacity="0.8" />
    </svg>
  );
}

/** Parse patient ID from the URL, e.g. /patients/3 → 3 */
function usePatientIdFromUrl() {
  const location = useLocation();
  const match = location.pathname.match(/^\/patients\/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

const SEVERITY_STYLES = {
  critical: { bg: "#fef2f2", border: "#fca5a5", color: "#991b1b", dotColor: "#ef4444" },
  warning:  { bg: "#fffbeb", border: "#fcd34d", color: "#92400e", dotColor: "#f59e0b" },
  info:     { bg: "#eff6ff", border: "#93c5fd", color: "#1e40af", dotColor: "#3b82f6" },
};

/** Markdown components wired to ChatApp CSS classes */
const MARKDOWN_COMPONENTS = {
  code({ inline, children, ...props }) {
    if (inline) {
      return <code className="chat-inline-code" {...props}>{children}</code>;
    }
    return (
      <pre className="chat-code-block" {...props}>
        <code>{children}</code>
      </pre>
    );
  },
  ul({ children }) {
    return <ul className="chat-list">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="chat-list chat-list--ol">{children}</ol>;
  },
  li({ children }) {
    return <li className="chat-list-item">{children}</li>;
  },
  table({ children }) {
    return <div className="chat-table-wrapper"><table className="chat-table">{children}</table></div>;
  },
  blockquote({ children }) {
    return <blockquote className="chat-blockquote">{children}</blockquote>;
  },
  a({ href, children }) {
    return <a href={href} className="chat-link" target="_blank" rel="noopener noreferrer">{children}</a>;
  },
};

export default function ChatApp() {
  const patientId = usePatientIdFromUrl();
  const [isMounted, setIsMounted] = useState(false);

  // ── Session state ───────────────────────────────────────────────────────────
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [riskFlags, setRiskFlags] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [showRiskPanel, setShowRiskPanel] = useState(false);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // ── Voice state ─────────────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [isPlayingTts, setIsPlayingTts] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioPlayerRef = useRef(null);

  // ── Load sessions from backend ──────────────────────────────────────────────
  async function fetchSessions() {
    setSessionsLoading(true);
    try {
      const { data } = await api.get("/ai/sessions");
      setSessions(data);
      if (data.length > 0 && !activeSessionId) {
        setActiveSessionId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to load sessions:", err);
    } finally {
      setSessionsLoading(false);
    }
  }

  // ── Load messages for active session ───────────────────────────────────────
  async function fetchMessages(sessionId) {
    if (!sessionId) return;
    try {
      const { data } = await api.get(`/ai/sessions/${sessionId}/messages`);
      setMessages(data);
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  }

  // Initial load
  useEffect(() => {
    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When active session changes, load its messages
  useEffect(() => {
    if (activeSessionId) fetchMessages(activeSessionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId]);

  // Auto-scroll on new messages
  useEffect(() => {
    const box = scrollRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [messages.length, isOpen, showRiskPanel]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ── Session management ──────────────────────────────────────────────────────
  async function addSession() {
    try {
      const { data } = await api.post("/ai/sessions", {
        title: `Session ${sessions.length + 1}`,
        patient_id: patientId || null,
      });
      setSessions((prev) => [data, ...prev]);
      setActiveSessionId(data.id);
      setMessages([]);
      setRiskFlags([]);
      setShowRiskPanel(false);
      setIsOpen(true);
      await fetchMessages(data.id);
    } catch (err) {
      console.error("Failed to create session:", err);
    }
  }

  async function renameSession() {
    if (!activeSessionId) return;
    const current = sessions.find((s) => s.id === activeSessionId);
    const nextName = window.prompt("Rename session", current?.title || "");
    if (!nextName?.trim()) return;
    try {
      const { data } = await api.patch(`/ai/sessions/${activeSessionId}`, { title: nextName.trim() });
      setSessions((prev) => prev.map((s) => (s.id === activeSessionId ? data : s)));
    } catch (err) {
      console.error("Failed to rename session:", err);
    }
  }

  async function deleteSession() {
    if (!activeSessionId || sessions.length === 1) return;
    const current = sessions.find((s) => s.id === activeSessionId);
    if (!window.confirm(`Delete "${current?.title}"?`)) return;
    try {
      await api.delete(`/ai/sessions/${activeSessionId}`);
      const remaining = sessions.filter((s) => s.id !== activeSessionId);
      setSessions(remaining);
      const nextId = remaining[0]?.id || null;
      setActiveSessionId(nextId);
      setMessages([]);
      setRiskFlags([]);
      setShowRiskPanel(false);
      if (nextId) fetchMessages(nextId);
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  }

  // ── Voice helpers ───────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (isRecording || isTranscribing) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await sendAudioForTranscription(blob);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone permission denied:", err);
    }
  }, [isRecording, isTranscribing]);

  const stopRecording = useCallback(() => {
    if (!isRecording || !mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }, [isRecording]);

  async function sendAudioForTranscription(blob) {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("file", blob, "recording.webm");
      const response = await api.post("/audio/stt", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const text = response.data?.transcript || "";
      if (text.trim()) setDraft(text.trim());
    } catch (err) {
      console.error("Transcription error:", err);
    } finally {
      setIsTranscribing(false);
    }
  }

  async function playTts(text) {
    if (!text || !voiceMode) return;
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    setIsPlayingTts(true);
    try {
      const response = await api.post("/audio/tts", { text }, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const audio = new Audio(url);
      audioPlayerRef.current = audio;
      audio.onended = () => { URL.revokeObjectURL(url); setIsPlayingTts(false); audioPlayerRef.current = null; };
      audio.onerror = () => { setIsPlayingTts(false); audioPlayerRef.current = null; };
      await audio.play();
    } catch (err) {
      console.error("TTS error:", err);
      setIsPlayingTts(false);
    }
  }

  // ── Send message ────────────────────────────────────────────────────────────
  async function submitMessage(event) {
    event.preventDefault();
    if (!draft.trim() || isLoading) return;

    const userText = draft.trim();
    const tempUserMsg = { id: `tmp_${Date.now()}`, role: "user", text: userText, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, tempUserMsg]);
    setDraft("");
    setIsLoading(true);

    try {
      const endpoint = patientId ? `/ai/chat/${patientId}` : "/ai/chat";
      const { data } = await api.post(endpoint, {
        message: userText,
        session_id: activeSessionId || undefined,
      });

      // If this was the first message (no session yet), session was created by backend
      if (data.session_id && data.session_id !== activeSessionId) {
        setActiveSessionId(data.session_id);
        // Refresh sessions list to show the new one
        fetchSessions();
      }

      const assistantMsg = {
        id: `tmp_a_${Date.now()}`,
        role: "assistant",
        text: data.reply,
        created_at: new Date().toISOString(),
      };
      // Replace optimistic messages with fresh load from backend
      await fetchMessages(data.session_id || activeSessionId);
      playTts(data.reply);
    } catch (err) {
      const errorMsg = {
        id: `tmp_err_${Date.now()}`,
        role: "assistant",
        text: `**Error:** ${err?.response?.data?.detail || err.message || "Failed to reach AI service."}`,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
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
      setRiskFlags([{
        severity: "warning",
        title: "Scan Failed",
        message: err?.response?.data?.detail || "Could not complete risk scan.",
        recommendation: "Try again later.",
      }]);
    } finally {
      setIsScanning(false);
    }
  }

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  if (!isMounted) return null;

  return createPortal(
    <div className="chatapp-root">
      {isOpen && (
        <section className="chatapp-panel" aria-label="AI Clinical Co-Pilot">
          {/* ── Header ─────────────────────────────────────────────────────── */}
          <header className="chatapp-header">
            <div className="chatapp-header-info" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <NurseAvatar isThinking={isLoading} size="normal" />
              <div>
                <strong style={{ display: "flex", alignItems: "center", fontSize: 15.5, fontWeight: 700, letterSpacing: "-0.01em" }}>
                  Vitalis AI Co-Pilot
                </strong>
                <p style={{ margin: "3px 0 0", fontSize: 12, opacity: 0.88, fontWeight: 500 }}>
                  {patientId ? (
                    <>
                      <Link2 size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                      Patient #{patientId} context active
                    </>
                  ) : (
                    "General mode — open a patient for context"
                  )}
                </p>
              </div>
            </div>
            <div className="chatapp-header-actions">
              {patientId && (
                <button type="button" className="chatapp-risk-btn" onClick={handleRiskScan}
                  disabled={isScanning} title="AI Risk Scan">
                  {isScanning ? <Loader2 size={13} className="chatapp-spin-icon" /> : <ShieldAlert size={13} />}{" "}
                  Risk Scan
                </button>
              )}
              <button type="button" className="chatapp-close" onClick={() => setIsOpen(false)} aria-label="Close chat">
                <X size={14} />
              </button>
            </div>
          </header>

          {/* ── Session Selector ───────────────────────────────────────────── */}
          <div className="chatapp-session-controls">
            <div className="chatapp-session-selector">
              <MessageSquare size={14} className="chatapp-session-icon" />
              <select
                value={activeSessionId || ""}
                onChange={(e) => {
                  const id = parseInt(e.target.value, 10);
                  setActiveSessionId(id);
                  setShowRiskPanel(false);
                  setRiskFlags([]);
                }}
                aria-label="Select chat session"
              >
                {sessionsLoading && <option value="">Loading sessions…</option>}
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
                {!sessionsLoading && sessions.length === 0 && (
                  <option value="">No sessions — click + to start</option>
                )}
              </select>
            </div>
            <div className="chatapp-session-actions">
              <button type="button" onClick={addSession} title="New session" className="chatapp-icon-btn">
                <Plus size={15} />
              </button>
              <button type="button" onClick={renameSession} title="Rename session" className="chatapp-icon-btn">
                <Pencil size={13} />
              </button>
              <button
                type="button"
                className="chatapp-icon-btn chatapp-icon-btn--danger"
                onClick={deleteSession}
                disabled={sessions.length <= 1}
                title={sessions.length <= 1 ? "At least one session must exist" : "Delete session"}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {/* ── Risk Scan Panel ─────────────────────────────────────────────── */}
          {showRiskPanel && (
            <div className="chatapp-risk-panel">
              <div className="chatapp-risk-panel-header">
                <strong>
                  <ShieldAlert size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 5 }} />
                  AI Risk Scan Results
                </strong>
                <button type="button" className="chatapp-risk-dismiss" onClick={() => setShowRiskPanel(false)}>
                  <X size={13} />
                </button>
              </div>
              {isScanning ? (
                <div className="chatapp-risk-loading">
                  <div className="chatapp-typing-dots"><span /><span /><span /></div>
                  <span>Analyzing patient data…</span>
                </div>
              ) : (
                <div className="chatapp-risk-flags">
                  {riskFlags.map((flag, i) => {
                    const sty = SEVERITY_STYLES[flag.severity] || SEVERITY_STYLES.info;
                    return (
                      <div key={i} className="chatapp-risk-card"
                        style={{ background: sty.bg, borderColor: sty.border, color: sty.color }}>
                        <div className="chatapp-risk-card-title" style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: sty.dotColor, flexShrink: 0 }} />
                          {flag.title}
                        </div>
                        <div className="chatapp-risk-card-msg">{flag.message}</div>
                        {flag.recommendation && (
                          <div className="chatapp-risk-card-rec" style={{ display: "flex", alignItems: "flex-start", gap: 5 }}>
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

          {/* ── Disclaimer ──────────────────────────────────────────────────── */}
          <div className="chatapp-disclaimer">
            <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              AI responses are for clinical support only. Always verify with a licensed clinician. Vitalis AI will not answer questions unrelated to healthcare.
            </span>
          </div>

          {/* ── Messages ────────────────────────────────────────────────────── */}
          <div className="chatapp-messages" ref={scrollRef}>
            {sessions.length === 0 && !sessionsLoading && (
              <div className="chatapp-empty-state">
                <NurseAvatar size="normal" />
                <p>No sessions yet. Click <strong>+</strong> to start your first conversation.</p>
              </div>
            )}
            {messages.map((msg) => (
              <article key={msg.id} className={`chatapp-bubble chatapp-bubble-${msg.role}`}>
                {msg.role === "assistant" ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={MARKDOWN_COMPONENTS}
                  >
                    {msg.text}
                  </ReactMarkdown>
                ) : (
                  <span>{msg.text}</span>
                )}
              </article>
            ))}
            {isLoading && (
              <article className="chatapp-bubble chatapp-bubble-assistant">
                <div className="chatapp-typing-dots"><span /><span /><span /></div>
              </article>
            )}
          </div>

          {/* ── Input Form ──────────────────────────────────────────────────── */}
          <form className="chatapp-input" onSubmit={submitMessage}>
            <div className="chatapp-voice-bar">
              <button
                type="button"
                className={`chatapp-voice-mode-btn${voiceMode ? " chatapp-voice-mode-btn--active" : ""}`}
                onClick={() => {
                  setVoiceMode((v) => !v);
                  if (isPlayingTts && audioPlayerRef.current) {
                    audioPlayerRef.current.pause();
                    setIsPlayingTts(false);
                  }
                }}
                title={voiceMode ? "Voice mode ON – Click to disable auto-play" : "Enable voice mode"}
              >
                {voiceMode ? <Volume2 size={13} /> : <VolumeX size={13} />}
                {voiceMode ? "Voice mode ON" : "Voice mode OFF"}
                {isPlayingTts && <span className="chatapp-tts-playing-dot" title="Playing audio" />}
              </button>
            </div>

            <div className="chatapp-input-wrapper">
              <button
                type="button"
                className={`chatapp-mic-btn${isRecording ? " chatapp-mic-btn--recording" : ""}`}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isLoading || isTranscribing}
                aria-label={isRecording ? "Stop recording" : "Start voice input"}
                title={isRecording ? "Stop recording" : "Speak your message"}
              >
                {isTranscribing ? (
                  <Loader2 size={16} className="chatapp-spin-icon" />
                ) : isRecording ? (
                  <MicOff size={16} />
                ) : (
                  <Mic size={16} />
                )}
              </button>

              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={
                  isRecording
                    ? "🎙 Listening..."
                    : isTranscribing
                    ? "Transcribing..."
                    : patientId
                    ? "Speak or type about this patient..."
                    : "Ask a clinical question..."
                }
                aria-label="Type your message"
                disabled={isLoading || isRecording || isTranscribing}
              />
              <button
                type="submit"
                className="chatapp-send-btn"
                disabled={!draft.trim() || isLoading}
                aria-label="Send"
              >
                {isLoading ? <Loader2 size={16} className="chatapp-spin-icon" /> : <Send size={16} />}
              </button>
            </div>
          </form>
        </section>
      )}

      <button
        type="button"
        className={`chatapp-fab${isOpen ? " chatapp-fab--open" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? "Minimize chat" : "Open AI Co-Pilot"}
      >
        {isOpen ? (
          <X size={20} />
        ) : (
          <>
            <NurseAvatar size="small" />
            <span style={{ marginLeft: 8 }}>AI Co-Pilot</span>
          </>
        )}
      </button>
    </div>,
    document.body
  );
}
