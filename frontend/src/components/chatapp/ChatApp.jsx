import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
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

      {/* Thinking rings */}
      {isThinking && (
        <>
          <circle cx="50" cy="50" r="47" stroke="#2dd4bf" strokeWidth="2"
            strokeDasharray="16 8" className="nurse-think-ring" />
          <circle cx="50" cy="50" r="43" stroke="#0d9488" strokeWidth="1"
            strokeDasharray="6 12 18 12" className="nurse-think-ring-inner" />
        </>
      )}

      {/* Hair (back) */}
      <path d="M30 45 Q26 65 38 75 Q50 82 62 75 Q74 65 70 45 Z" fill="#4a2c17" opacity="0.8" />

      {/* Uniform body (Animated breathing) */}
      <g className="nurse-avatar-body">
        <path d="M15 100 Q15 65 30 58 Q40 54 50 54 Q60 54 70 58 Q85 65 85 100Z"
          fill="url(#nurseGrad)" />
        <path d="M15 100 Q15 65 30 58 Q40 54 50 54 Q60 54 70 58 Q85 65 85 100Z"
          fill="url(#nurseGradDark)" opacity="0.4" style={{ mixBlendMode: 'multiply' }} />

        {/* White lapels/collar */}
        <path d="M40 60 L50 78 L60 60 Q55 57 50 56 Q45 57 40 60Z"
          fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
        <path d="M30 58 Q40 65 42 75 L40 60 Z" fill="#e2e8f0" />
        <path d="M70 58 Q60 65 58 75 L60 60 Z" fill="#e2e8f0" />

        {/* Name Badge */}
        <rect x="62" y="68" width="10" height="6" rx="1" fill="#f1f5f9" transform="rotate(5 67 71)" />
        <rect x="63" y="70" width="8" height="2" rx="0.5" fill="#94a3b8" transform="rotate(5 67 71)" />
        
        {/* Stethoscope around neck */}
        <path d="M36 68 Q32 80 40 85 Q48 90 54 84"
          stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <circle cx="55" cy="83" r="4" fill="#cbd5e1" stroke="#334155" strokeWidth="1.5" />
        <circle cx="55" cy="83" r="1.5" fill="#f1f5f9" />
      </g>

      {/* Head */}
      <ellipse cx="50" cy="45" rx="16" ry="19" fill="url(#skinGrad)" />

      {/* Hair (front) */}
      <path d="M34 40 Q32 20 50 20 Q68 20 66 40 Q63 32 50 30 Q37 32 34 40Z"
        fill="#5a361d" />
      {/* Hair highlights */}
      <path d="M38 34 Q45 23 50 26" stroke="#7a4b2b" strokeWidth="1.5" fill="none" strokeLinecap="round" />

      {/* Nurse cap */}
      <path d="M30 32 Q30 14 50 14 Q70 14 70 32 C68 32 68 22 50 22 C32 22 32 32 30 32Z"
        fill="url(#capGrad)" />
      <rect x="33" y="29" width="34" height="6" rx="2" fill="#ffffff" />
      {/* Red Cross */}
      <rect x="44" y="21" width="12" height="3" rx="1" fill="#ef4444" />
      <rect x="48.5" y="16.5" width="3" height="12" rx="1" fill="#ef4444" />

      {/* Face features */}
      {/* Brows */}
      <path d="M40 38 Q43 36 46 38" stroke="#3d2110" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M54 38 Q57 36 60 38" stroke="#3d2110" strokeWidth="1" fill="none" strokeLinecap="round" />

      {/* Animated Eyes */}
      <g className="nurse-avatar-eyes">
        {/* Eye whites */}
        <ellipse cx="43" cy="43" rx="3.5" ry="4" fill="#ffffff" />
        <ellipse cx="57" cy="43" rx="3.5" ry="4" fill="#ffffff" />
        {/* Irises */}
        <ellipse cx="43" cy="43" rx="2" ry="2.5" fill="#1e3a8a" />
        <ellipse cx="57" cy="43" rx="2" ry="2.5" fill="#1e3a8a" />
        {/* Highlights */}
        <circle cx="43.5" cy="42" r="0.8" fill="#ffffff" />
        <circle cx="57.5" cy="42" r="0.8" fill="#ffffff" />
      </g>

      {/* Nose */}
      <path d="M49 48 L50 51 L52 50" stroke="#d5855f" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round" />

      {/* Cheeks */}
      <ellipse cx="38" cy="50" rx="3" ry="2" fill="#ef4444" opacity="0.2" />
      <ellipse cx="62" cy="50" rx="3" ry="2" fill="#ef4444" opacity="0.2" />

      {/* Smile */}
      <path d="M44 55 Q50 60 56 55" stroke="#b95842" strokeWidth="1.5"
        strokeLinecap="round" fill="transparent" />
      <path d="M46 56 Q50 62 54 56 Z" fill="#ffffff" opacity="0.8" />
    </svg>
  );
}

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
    '<ul class="chat-list">$1</ul>',
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
    initialStateRef.current.activeSessionId,
  );

  // ── Voice state ────────────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false); // auto-play TTS
  const [isPlayingTts, setIsPlayingTts] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioPlayerRef = useRef(null);

  const patientId = usePatientIdFromUrl();

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) || sessions[0],
    [sessions, activeSessionId],
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
        s.id === activeSession.id ? { ...s, title: nextName.trim() || s.title } : s,
      ),
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
      }),
    );
  }

  // ── Voice helpers ──────────────────────────────────────────────────────────
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
      // Re-use the first available patient endpoint; for general chat we still need a patient_id
      // so we use the generic audio endpoint tied to patient 0 (server will 404 for unknown patient)
      // Instead, we directly call the STT route which doesn't need a patient:
      const response = await api.post("/audio/stt", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const text = response.data?.transcript || "";
      if (text.trim()) {
        setDraft(text.trim());
      }
    } catch (err) {
      console.error("Transcription error:", err);
    } finally {
      setIsTranscribing(false);
    }
  }

  async function playTts(text) {
    if (!text || !voiceMode) return;
    // Stop any currently playing audio
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    setIsPlayingTts(true);
    try {
      const response = await api.post(
        "/audio/tts",
        { text },
        { responseType: "blob" },
      );
      const url = URL.createObjectURL(response.data);
      const audio = new Audio(url);
      audioPlayerRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setIsPlayingTts(false);
        audioPlayerRef.current = null;
      };
      audio.onerror = () => {
        setIsPlayingTts(false);
        audioPlayerRef.current = null;
      };
      await audio.play();
    } catch (err) {
      console.error("TTS error:", err);
      setIsPlayingTts(false);
    }
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

      // Auto-play TTS if voice mode is active
      playTts(data.reply);
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
            <div className="chatapp-header-info" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <NurseAvatar isThinking={isLoading} size="normal" />
            <div>
            <strong style={{ display: "flex", alignItems: "center", fontSize: 15.5, fontWeight: 700, letterSpacing: "-0.01em" }}>
              MedSuite AI Co-Pilot
            </strong>
              <p style={{ margin: "3px 0 0", fontSize: 12, opacity: 0.88, fontWeight: 500 }}>
                {patientId ? (
                  <>
                    <Link2
                      size={12}
                      style={{
                        display: "inline",
                        verticalAlign: "middle",
                        marginRight: 4,
                      }}
                    />
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
                <button
                  type="button"
                  className="chatapp-risk-btn"
                  onClick={handleRiskScan}
                  disabled={isScanning}
                  title="AI Risk Scan"
                >
                  {isScanning ? (
                    <Loader2 size={13} className="chatapp-spin-icon" />
                  ) : (
                    <ShieldAlert size={13} />
                  )}{" "}
                  Risk Scan
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
            <div className="chatapp-session-selector">
              <MessageSquare size={14} className="chatapp-session-icon" />
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
            </div>
            <div className="chatapp-session-actions">
              <button
                type="button"
                onClick={addSession}
                title="New session"
                className="chatapp-icon-btn"
              >
                <Plus size={15} />
              </button>
              <button
                type="button"
                onClick={renameSession}
                title="Rename session"
                className="chatapp-icon-btn"
              >
                <Pencil size={13} />
              </button>
              <button
                type="button"
                className="chatapp-icon-btn chatapp-icon-btn--danger"
                onClick={deleteSession}
                disabled={sessions.length === 1}
                title={
                  sessions.length === 1
                    ? "At least one session must exist"
                    : "Delete session"
                }
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {/* Risk Scan Panel */}
          {showRiskPanel && (
            <div className="chatapp-risk-panel">
              <div className="chatapp-risk-panel-header">
                <strong>
                  <ShieldAlert
                    size={14}
                    style={{
                      display: "inline",
                      verticalAlign: "middle",
                      marginRight: 5,
                    }}
                  />
                  AI Risk Scan Results
                </strong>
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
                    <span></span>
                    <span></span>
                    <span></span>
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
                        <div
                          className="chatapp-risk-card-title"
                          style={{ display: "flex", alignItems: "center", gap: 7 }}
                        >
                          <span
                            style={{
                              display: "inline-block",
                              width: 9,
                              height: 9,
                              borderRadius: "50%",
                              background: sty.dotColor,
                              flexShrink: 0,
                            }}
                          />
                          {flag.title}
                        </div>
                        <div className="chatapp-risk-card-msg">{flag.message}</div>
                        {flag.recommendation && (
                          <div
                            className="chatapp-risk-card-rec"
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 5,
                            }}
                          >
                            <Lightbulb
                              size={11}
                              style={{ marginTop: 1, flexShrink: 0 }}
                            />
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
            <span>
              AI responses are for support only and may be inaccurate. Do not rely on them
              as a substitute for professional medical judgment.
            </span>
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
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </article>
            )}
          </div>

          <form className="chatapp-input" onSubmit={submitMessage}>
            {/* Voice mode toggle */}
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
                {isPlayingTts && (
                  <span className="chatapp-tts-playing-dot" title="Playing audio" />
                )}
              </button>
            </div>

            <div className="chatapp-input-wrapper">
              {/* Microphone button */}
              <button
                type="button"
                className={`chatapp-mic-btn${
                  isRecording ? " chatapp-mic-btn--recording" : ""
                }`}
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
                    : "Speak or type anything..."
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
                {isLoading ? (
                  <Loader2 size={16} className="chatapp-spin-icon" />
                ) : (
                  <Send size={16} />
                )}
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
    </div>
  );
}
