import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mic, MicOff, RefreshCw } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import api from "../api";
import { useAuth } from "../context/AuthContext";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "notes", label: "Clinical Notes" },
  { id: "labs", label: "Labs" },
  { id: "timeline", label: "Timeline" },
  { id: "ai-insights", label: "🤖 AI Insights" },
];

export default function PatientDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const { user } = useAuth();

  const [recording, setRecording] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [audioFeedback, setAudioFeedback] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [noteType, setNoteType] = useState("general");
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingSoapFields, setEditingSoapFields] = useState({});
  const [savingNoteId, setSavingNoteId] = useState(null);

  // AI Insights state
  const [aiRiskFlags, setAiRiskFlags] = useState([]);
  const [aiScanning, setAiScanning] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiChatHistory, setAiChatHistory] = useState([]);
  const [aiChatLoading, setAiChatLoading] = useState(false);

  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const transcriptTextareaRef = useRef(null);

  useEffect(() => {
    const el = transcriptTextareaRef.current;
    if (!el) return;

    el.style.height = "auto";
    el.style.height = `${Math.max(96, el.scrollHeight)}px`;
  }, [transcript]);

  const { data: patient, isLoading } = useQuery({
    queryKey: ["patient", id],
    queryFn: () => api.get(`/patients/${id}`).then((r) => r.data),
  });
  const { data: notes = [] } = useQuery({
    queryKey: ["audio", id],
    queryFn: () => api.get(`/audio/${id}`).then((r) => r.data),
  });
  const { data: vitals = [] } = useQuery({
    queryKey: ["vitals", id],
    queryFn: () => api.get(`/vitals/${id}`).then((r) => r.data),
    refetchInterval: 500,
  });
  const { data: clinicalNotes = [] } = useQuery({
    queryKey: ["clinical-notes", id],
    queryFn: () => api.get(`/clinical-notes/patients/${id}`).then((r) => r.data),
  });
  const { data: labSummary = [] } = useQuery({
    queryKey: ["lab-summary", id],
    queryFn: () => api.get(`/labs/patients/${id}/summary`).then((r) => r.data),
  });
  const { data: timeline = [] } = useQuery({
    queryKey: ["timeline", id],
    queryFn: () => api.get(`/patients/${id}/timeline?limit=20`).then((r) => r.data),
  });

  const canFinalizeNotes = useMemo(
    () => ["admin", "doctor"].includes(user?.role),
    [user?.role]
  );

  const showFeedback = (msg) => {
    setAudioFeedback(msg);
    setTimeout(() => setAudioFeedback(""), 5000);
  };

  const createDraftMut = useMutation({
    mutationFn: () => api.post(`/clinical-notes/patients/${id}/draft-from-latest-audio`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clinical-notes", id] }),
  });
  const createFromTextMut = useMutation({
    mutationFn: (data) => api.post(`/clinical-notes/patients/${id}/from-text`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clinical-notes", id] });
      setTranscript("");
      setNoteType("general");
    },
  });
  const updateNoteMut = useMutation({
    mutationFn: (data) => api.patch(`/clinical-notes/${data.noteId}`, data.updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clinical-notes", id] });
      setEditingNoteId(null);
      setEditingSoapFields({});
      setSavingNoteId(null);
    },
  });
  const finalizeNoteMut = useMutation({
    mutationFn: (noteId) => api.post(`/clinical-notes/${noteId}/finalize`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clinical-notes", id] }),
  });

  const addLabMut = useMutation({
    mutationFn: (payload) => api.post(`/labs/patients/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lab-summary", id] });
      qc.invalidateQueries({ queryKey: ["timeline", id] });
    },
  });

  const mockVitalMut = useMutation({
    mutationFn: () => api.post(`/vitals/mock/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vitals", id] }),
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = async () => {
        try {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const formData = new FormData();
          formData.append("file", blob, "checkup.webm");
          await api.post(`/audio/${id}`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          qc.invalidateQueries({ queryKey: ["audio", id] });
          qc.invalidateQueries({ queryKey: ["timeline", id] });
        } catch (err) {
          showFeedback(
            err?.response?.data?.detail || "Audio upload failed. Consent may be missing."
          );
        }
      };
      mr.start();
      setRecording(true);
    } catch {
      showFeedback("Microphone access is required for recording.");
    }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    setRecording(false);
  };

  const startDictation = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(
        "Speech recognition not supported in this browser. Try Chrome, Edge, or Safari."
      );
      return;
    }
    const r = new SpeechRecognition();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";
    r.onresult = (e) => {
      const text = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(" ");
      setTranscript(text);
    };
    r.onend = () => setIsListening(false);
    recognitionRef.current = r;
    r.start();
    setIsListening(true);
  };

  const stopDictation = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const handleSubmitDictation = () => {
    if (!transcript.trim()) {
      alert("Please record or paste a transcript first");
      return;
    }
    createFromTextMut.mutate({
      transcript: transcript.trim(),
      note_type: noteType,
    });
  };

  const handleStartEditNote = (note) => {
    setEditingNoteId(note.id);
    setEditingSoapFields({
      subjective: note.subjective,
      objective: note.objective,
      assessment: note.assessment,
      plan: note.plan,
    });
  };

  const handleSaveNoteChanges = (noteId) => {
    setSavingNoteId(noteId);
    updateNoteMut.mutate({
      noteId,
      updates: editingSoapFields,
    });
  };

  const chartData = [...vitals].reverse().map((v, i) => ({
    name: `#${i + 1}`,
    "HR (bpm)": v.heart_rate,
    "SpO2 (%)": v.spo2,
    "Temp (deg C)": v.temperature,
  }));

  if (isLoading) return <div style={{ padding: "40px" }}>Loading...</div>;
  if (!patient) return <div style={{ padding: "40px" }}>Patient not found.</div>;

  return (
    <div className="page-pad" style={styles.page}>
      <div style={styles.headerCard}>
        <div style={styles.headerTop}>
          <div>
            <h2 style={styles.name}>{patient.full_name}</h2>
            <p style={styles.meta}>
              {patient.age ? `${patient.age} yrs` : ""}
              {patient.gender ? ` · ${patient.gender}` : ""}
              {patient.diagnosis ? ` · ${patient.diagnosis}` : ""}
            </p>
          </div>
          <div style={styles.tags}>
            {patient.is_serious && <span style={styles.badgeDanger}>Serious</span>}
            {patient.infection_risk && <span style={styles.badgeWarn}>Infection Risk</span>}
            {patient.allergies && (
              <span style={styles.badgeInfo}>Allergy: {patient.allergies}</span>
            )}
            {patient.mental_status && (
              <span style={styles.badgeGray}>Mental: {patient.mental_status}</span>
            )}
          </div>
        </div>

        <div style={styles.tabRow}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={activeTab === tab.id ? styles.tabActive : styles.tabButton}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={styles.profileGrid}>
          <div style={styles.profileItem}><span style={styles.profileKey}>UHID</span><span style={styles.uhidValue}>{patient.uhid || "N/A"}</span></div>
          <div style={styles.profileItem}><span style={styles.profileKey}>MRN</span><span>{patient.mrn || "N/A"}</span></div>
          <div style={styles.profileItem}><span style={styles.profileKey}>Blood Group</span><span>{patient.blood_group || "N/A"}</span></div>
          <div style={styles.profileItem}><span style={styles.profileKey}>Primary Phone</span><span>{patient.primary_phone || "N/A"}</span></div>
          <div style={styles.profileItem}><span style={styles.profileKey}>Emergency Contact</span><span>{patient.emergency_contact_name || "N/A"}</span></div>
          <div style={styles.profileItem}><span style={styles.profileKey}>Admission Type</span><span>{patient.admission_type || "planned"}</span></div>
          <div style={styles.profileItem}><span style={styles.profileKey}>Patient Status</span><span>{patient.patient_status || "admitted"}</span></div>
        </div>
      </div>

      {activeTab === "overview" && (
        <>
          <div className="detail-columns" style={styles.columns}>
            <div style={styles.panel}>
              <div style={styles.panelHeader}>
                <span style={styles.panelTitle}>Doctor Audio Notes</span>
                <button
                        style={recording ? styles.btnStop : styles.btnRecord}
                        onClick={recording ? stopRecording : startRecording}
                      >
                        {recording ? (
                          <>
                            <MicOff size={14} /> Stop
                          </>
                        ) : (
                          <>
                            <Mic size={14} /> Record
                          </>
                        )}
                      </button>
              </div>

              {audioFeedback && <div style={styles.feedback}>{audioFeedback}</div>}

              {notes.length === 0 ? (
                <p style={styles.empty}>No audio notes yet.</p>
              ) : (
                notes.map((n) => (
                  <div key={n.id} style={styles.noteCard}>
                    <div style={styles.noteDate}>{new Date(n.created_at).toLocaleString()}</div>
                    <div style={styles.noteTranscript}>{n.transcript || "Transcribing..."}</div>
                  </div>
                ))
              )}
            </div>

            <div style={styles.panel}>
              <div style={styles.panelHeader}>
                <span style={styles.panelTitle}>Vital Signs</span>
                <button
                  style={styles.btnRefresh}
                  onClick={() => mockVitalMut.mutate()}
                  disabled={mockVitalMut.isPending}
                >
                  <RefreshCw size={14} /> {mockVitalMut.isPending ? "..." : "Simulate"}
                </button>
              </div>

              {vitals.length > 0 && (
                <div style={styles.latestVitals}>
                  {[
                    [
                      "Heart Rate",
                      vitals[0].heart_rate,
                      "bpm",
                      vitals[0].heart_rate > 100 || vitals[0].heart_rate < 60,
                    ],
                    ["SpO2", vitals[0].spo2, "%", vitals[0].spo2 < 95],
                    ["Temp", vitals[0].temperature, "deg C", vitals[0].temperature > 38],
                    [
                      "BP",
                      `${vitals[0].blood_pressure_sys}/${vitals[0].blood_pressure_dia}`,
                      "mmHg",
                      false,
                    ],
                  ].map(([label, val, unit, warn]) => (
                    <div
                      key={label}
                      style={{
                        ...styles.vitalBox,
                        borderColor: warn ? "#ef4444" : "#e5e7eb",
                      }}
                    >
                      <div
                        style={{
                          ...styles.vitalValue,
                          color: warn ? "#ef4444" : "#111827",
                        }}
                      >
                        {val} <span style={styles.vitalUnit}>{unit}</span>
                      </div>
                      <div style={styles.vitalLabel}>{label}</div>
                    </div>
                  ))}
                </div>
              )}

              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="HR (bpm)" stroke="#3b82f6" dot={false} />
                    <Line type="monotone" dataKey="SpO2 (%)" stroke="#10b981" dot={false} />
                    <Line type="monotone" dataKey="Temp (deg C)" stroke="#f59e0b" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p style={styles.empty}>No vitals recorded. Click Simulate to add a reading.</p>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === "notes" && (
        <div style={styles.panelWide}>
          <div style={styles.panelHeader}>
            <span style={styles.panelTitle}>Clinical Notes (SOAP)</span>
            {canFinalizeNotes && (
              <button
                style={styles.btnRefresh}
                onClick={() => createDraftMut.mutate()}
                disabled={createDraftMut.isPending}
              >
                {createDraftMut.isPending ? "Generating..." : "Draft From Latest Audio"}
              </button>
            )}
          </div>

          {canFinalizeNotes && (
            <div style={styles.noteFormCard}>
              <div style={{ marginBottom: 12, fontWeight: 600, color: "#1e3a5f" }}>
                Create New Note with Voice Dictation
              </div>
              <div style={styles.dictationControlsRow}>
                <select
                  value={noteType}
                  onChange={(e) => setNoteType(e.target.value)}
                  style={{ ...styles.input, ...styles.dictationSelect }}
                >
                  <option value="general">General</option>
                  <option value="intake">Intake</option>
                  <option value="rounds">Rounds</option>
                  <option value="discharge">Discharge</option>
                </select>
                <button
                  onClick={isListening ? stopDictation : startDictation}
                  style={{
                    ...styles.dictationToggleBtn,
                    background: isListening ? "#ef4444" : "#3b82f6",
                  }}
                >
                  {isListening ? (
                    <>
                      <MicOff size={16} /> Stop
                    </>
                  ) : (
                    <>
                      <Mic size={16} /> Start Dictating
                    </>
                  )}
                </button>
              </div>
              <textarea
                ref={transcriptTextareaRef}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Transcript will appear here or paste manually..."
                style={styles.transcriptTextarea}
              />
              {transcript.trim() && (
                <button
                  onClick={handleSubmitDictation}
                  disabled={createFromTextMut.isPending || isListening}
                  style={{
                    ...styles.structureBtn,
                    opacity: createFromTextMut.isPending || isListening ? 0.6 : 1,
                  }}
                >
                  {createFromTextMut.isPending
                    ? "Processing with Mistral AI..."
                    : "Structure with Mistral AI"}
                </button>
              )}
            </div>
          )}

          {clinicalNotes.length === 0 ? (
            <p style={styles.empty}>No clinical notes yet.</p>
          ) : (
            clinicalNotes.map((note) => (
              <div key={note.id} style={styles.noteCard}>
                <div style={styles.consentStatusRow}>
                  <strong>#{note.id}</strong>
                  <span style={styles.badgeInfo}>{note.status}</span>
                  <span
                    style={{
                      ...styles.badgeInfo,
                      background:
                        note.note_type === "intake"
                          ? "#3b82f6"
                          : note.note_type === "rounds"
                            ? "#10b981"
                            : note.note_type === "discharge"
                              ? "#f97316"
                              : "#6b7280",
                    }}
                  >
                    {note.note_type}
                  </span>
                  <span style={styles.consentMeta}>
                    confidence: {Math.round((note.confidence || 0) * 100)}%
                  </span>
                  {canFinalizeNotes &&
                    note.status !== "finalized" &&
                    editingNoteId !== note.id && (
                      <button
                        style={styles.btnRefresh}
                        onClick={() => handleStartEditNote(note)}
                      >
                        Edit
                      </button>
                    )}
                  {canFinalizeNotes &&
                    note.status !== "finalized" &&
                    editingNoteId === note.id && (
                      <button
                        style={{
                          ...styles.btnRefresh,
                          background: "#10b981",
                          color: "white",
                        }}
                        onClick={() => handleSaveNoteChanges(note.id)}
                        disabled={savingNoteId === note.id}
                      >
                        {savingNoteId === note.id ? "Saving..." : "Save"}
                      </button>
                    )}
                  {canFinalizeNotes && note.status !== "finalized" && (
                    <button
                      style={styles.btnRefresh}
                      onClick={() => finalizeNoteMut.mutate(note.id)}
                      disabled={finalizeNoteMut.isPending}
                    >
                      Finalize
                    </button>
                  )}
                </div>

                {editingNoteId === note.id ? (
                  <>
                    <div style={{ marginTop: 12 }}>
                      <label style={styles.fieldLabel}>Subjective (S)</label>
                      <textarea
                        value={editingSoapFields.subjective || ""}
                        onChange={(e) =>
                          setEditingSoapFields((prev) => ({
                            ...prev,
                            subjective: e.target.value,
                          }))
                        }
                        style={{ ...styles.textarea, minHeight: 60 }}
                      />
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <label style={styles.fieldLabel}>Objective (O)</label>
                      <textarea
                        value={editingSoapFields.objective || ""}
                        onChange={(e) =>
                          setEditingSoapFields((prev) => ({
                            ...prev,
                            objective: e.target.value,
                          }))
                        }
                        style={{ ...styles.textarea, minHeight: 60 }}
                      />
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <label style={styles.fieldLabel}>Assessment (A)</label>
                      <textarea
                        value={editingSoapFields.assessment || ""}
                        onChange={(e) =>
                          setEditingSoapFields((prev) => ({
                            ...prev,
                            assessment: e.target.value,
                          }))
                        }
                        style={{ ...styles.textarea, minHeight: 60 }}
                      />
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <label style={styles.fieldLabel}>Plan (P)</label>
                      <textarea
                        value={editingSoapFields.plan || ""}
                        onChange={(e) =>
                          setEditingSoapFields((prev) => ({
                            ...prev,
                            plan: e.target.value,
                          }))
                        }
                        style={{ ...styles.textarea, minHeight: 60 }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div style={styles.noteTranscript}>
                      <strong>S:</strong> {note.subjective}
                    </div>
                    <div style={styles.noteTranscript}>
                      <strong>O:</strong> {note.objective}
                    </div>
                    <div style={styles.noteTranscript}>
                      <strong>A:</strong> {note.assessment}
                    </div>
                    <div style={styles.noteTranscript}>
                      <strong>P:</strong> {note.plan}
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "labs" && (
        <div style={styles.panelWide}>
          <div style={styles.panelHeader}>
            <span style={styles.panelTitle}>Lab Summary</span>
            {canManageConsent && (
              <button
                style={styles.btnRefresh}
                onClick={() =>
                  addLabMut.mutate({
                    test_name: "CRP",
                    value: Number((Math.random() * 15 + 1).toFixed(1)),
                    unit: "mg/L",
                    reference_low: 0,
                    reference_high: 5,
                  })
                }
                disabled={addLabMut.isPending}
              >
                {addLabMut.isPending ? "Adding..." : "Add Mock Lab"}
              </button>
            )}
          </div>
          {labSummary.length === 0 ? (
            <p style={styles.empty}>No lab data yet.</p>
          ) : (
            <div style={styles.latestVitals}>
              {labSummary.map((lab) => (
                <div key={lab.test_name} style={styles.vitalBox}>
                  <div
                    style={{
                      ...styles.vitalValue,
                      color: lab.is_abnormal ? "#ef4444" : "#111827",
                    }}
                  >
                    {lab.latest_value} <span style={styles.vitalUnit}>{lab.unit || ""}</span>
                  </div>
                  <div style={styles.vitalLabel}>
                    {lab.test_name} ({lab.trend})
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "timeline" && (
        <div style={styles.panelWide}>
          <div style={styles.panelHeader}>
            <span style={styles.panelTitle}>Patient Timeline</span>
          </div>
          {timeline.length === 0 ? (
            <p style={styles.empty}>No timeline events yet.</p>
          ) : (
            <div style={styles.timelineContainer}>
              {timeline.slice(0, 20).map((evt, idx) => {
                const dotColor =
                  evt.event_type === "admission"
                    ? "#10b981"
                    : evt.event_type === "discharge"
                      ? "#ef4444"
                      : evt.event_type === "clinical_note"
                        ? "#3b82f6"
                        : evt.event_type === "vitals"
                          ? "#9ca3af"
                          : "#6b7280";

                return (
                  <div key={`${evt.event_type}-${idx}`} style={styles.timelineItem}>
                    <div
                      style={{
                        ...styles.timelineDot,
                        background: dotColor,
                      }}
                    />
                    {idx < timeline.length - 1 && (
                      <div
                        style={{
                          ...styles.timelineLine,
                          borderLeftColor: dotColor,
                        }}
                      />
                    )}
                    <div style={styles.timelineContent}>
                      <div style={styles.consentStatusRow}>
                        <span
                          style={{
                            ...styles.badgeGray,
                            background:
                              evt.event_type === "clinical_note"
                                ? "#eff6ff"
                                : "#f3f4f6",
                            color:
                              evt.event_type === "clinical_note"
                                ? "#1e40af"
                                : "#374151",
                          }}
                        >
                          {evt.event_type}
                        </span>
                        <span style={styles.consentMeta}>
                          {new Date(evt.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div style={{ fontSize: 14, color: "#111827", marginTop: 6 }}>
                        {evt.title}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "ai-insights" && (
        <div style={styles.panelWide}>
          <div style={styles.panelHeader}>
            <span style={styles.panelTitle}>🤖 AI Clinical Decision Support</span>
            <button
              style={{
                ...styles.btnRecord,
                background: aiScanning ? "#9ca3af" : "linear-gradient(135deg, #1d4ed8, #3b82f6)",
              }}
              onClick={async () => {
                setAiScanning(true);
                setAiRiskFlags([]);
                try {
                  const { data } = await api.post(`/ai/risk-scan/${id}`);
                  setAiRiskFlags(data.flags || []);
                } catch (err) {
                  setAiRiskFlags([{
                    severity: "warning",
                    title: "Scan Failed",
                    message: err?.response?.data?.detail || "Could not complete risk scan.",
                    recommendation: "Try again later.",
                  }]);
                } finally {
                  setAiScanning(false);
                }
              }}
              disabled={aiScanning}
            >
              {aiScanning ? "⏳ Scanning..." : "🛡️ Run Risk Scan"}
            </button>
          </div>

          {/* Risk Flags */}
          {aiScanning && (
            <div style={{ padding: "20px 0", textAlign: "center", color: "#64748b", fontSize: 14 }}>
              Analyzing patient data with Mistral AI...
            </div>
          )}

          {aiRiskFlags.length > 0 && (
            <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
              {aiRiskFlags.map((flag, i) => {
                const colors = {
                  critical: { bg: "#fef2f2", border: "#fca5a5", text: "#991b1b", icon: "🔴" },
                  warning: { bg: "#fffbeb", border: "#fcd34d", text: "#92400e", icon: "🟡" },
                  info: { bg: "#eff6ff", border: "#93c5fd", text: "#1e40af", icon: "🔵" },
                };
                const c = colors[flag.severity] || colors.info;
                return (
                  <div key={i} style={{
                    background: c.bg,
                    border: `1px solid ${c.border}`,
                    borderRadius: 12,
                    padding: "12px 16px",
                    color: c.text,
                  }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                      {c.icon} {flag.title}
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 4 }}>
                      {flag.message}
                    </div>
                    {flag.recommendation && (
                      <div style={{ fontSize: 12, fontStyle: "italic", opacity: 0.85 }}>
                        💡 {flag.recommendation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Inline AI Chat */}
          <div style={{
            border: "1px solid #dbe5f0",
            borderRadius: 12,
            background: "#f8fbff",
            padding: 16,
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#1e3a5f", marginBottom: 12 }}>
              Ask AI about this patient
            </div>

            <div style={{
              maxHeight: 300,
              overflowY: "auto",
              marginBottom: 12,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}>
              {aiChatHistory.length === 0 && (
                <div style={{ color: "#9ca3af", fontSize: 13, fontStyle: "italic" }}>
                  Try: "Summarize this patient's status" or "Any drug interactions to watch for?"
                </div>
              )}
              {aiChatHistory.map((msg, i) => (
                <div key={i} style={{
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  background: msg.role === "user" ? "#dbeafe" : "#ffffff",
                  border: `1px solid ${msg.role === "user" ? "#a5c4e8" : "#e2e8f0"}`,
                  borderRadius: 12,
                  padding: "10px 14px",
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: "#1e293b",
                  whiteSpace: "pre-wrap",
                }}>
                  {msg.text}
                </div>
              ))}
              {aiChatLoading && (
                <div style={{
                  alignSelf: "flex-start",
                  background: "#f1f5f9",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: "10px 14px",
                  fontSize: 13,
                  color: "#64748b",
                }}>
                  Thinking...
                </div>
              )}
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!aiQuestion.trim() || aiChatLoading) return;
                const q = aiQuestion.trim();
                setAiQuestion("");
                setAiChatHistory((prev) => [...prev, { role: "user", text: q }]);
                setAiChatLoading(true);
                try {
                  const history = aiChatHistory.map((m) => ({ role: m.role, text: m.text }));
                  const { data } = await api.post(`/ai/chat/${id}`, {
                    message: q,
                    history,
                  });
                  setAiChatHistory((prev) => [...prev, { role: "assistant", text: data.reply }]);
                } catch (err) {
                  setAiChatHistory((prev) => [
                    ...prev,
                    { role: "assistant", text: `⚠ Error: ${err?.response?.data?.detail || err.message}` },
                  ]);
                } finally {
                  setAiChatLoading(false);
                }
              }}
              style={{ display: "flex", gap: 8 }}
            >
              <input
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                placeholder="Ask a clinical question..."
                style={{ ...styles.input, flex: 1 }}
                disabled={aiChatLoading}
              />
              <button
                type="submit"
                disabled={!aiQuestion.trim() || aiChatLoading}
                style={{
                  ...styles.btnRecord,
                  opacity: !aiQuestion.trim() || aiChatLoading ? 0.5 : 1,
                }}
              >
                {aiChatLoading ? "..." : "Ask AI"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    padding: "24px 8px 28px",
    maxWidth: "1240px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  headerCard: {
    background: "linear-gradient(140deg, #ffffff 0%, #f8fbff 100%)",
    border: "1px solid #dbe5f0",
    borderRadius: 14,
    padding: "18px 20px",
    boxShadow: "0 10px 30px rgba(30, 58, 95, 0.08)",
    transition: "all 220ms ease",
  },
  headerTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
  },
  name: { margin: 0, fontSize: 24, fontWeight: 700, color: "#1e3a5f" },
  meta: { margin: "4px 0 0", color: "#6b7280", fontSize: 14 },
  tags: { display: "flex", gap: 8, flexWrap: "wrap" },
  tabRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 14,
  },
  profileGrid: {
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: 8,
  },
  profileItem: {
    border: "1px solid #dde7f2",
    background: "#ffffff",
    borderRadius: 10,
    padding: "8px 10px",
    display: "flex",
    flexDirection: "column",
    fontSize: 13,
    color: "#1f2937",
  },
  profileKey: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    color: "#64748b",
    fontWeight: 700,
  },
  uhidValue: {
    fontFamily: "monospace",
    fontWeight: 700,
    color: "#1e40af",
    fontSize: 13,
  },
  tabButton: {
    border: "1px solid #c7d7ea",
    background: "#ffffff",
    color: "#1e3a5f",
    borderRadius: 999,
    padding: "7px 14px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 160ms ease",
  },
  tabActive: {
    border: "1px solid #1e3a5f",
    background: "#1e3a5f",
    color: "#ffffff",
    borderRadius: 999,
    padding: "7px 14px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  badgeDanger: {
    background: "#fee2e2",
    color: "#ef4444",
    borderRadius: 99,
    padding: "4px 10px",
    fontSize: 12,
    fontWeight: 600,
  },
  badgeWarn: {
    background: "#fef3c7",
    color: "#d97706",
    borderRadius: 99,
    padding: "4px 10px",
    fontSize: 12,
    fontWeight: 600,
  },
  badgeInfo: {
    background: "#eff6ff",
    color: "#3b82f6",
    borderRadius: 99,
    padding: "4px 10px",
    fontSize: 12,
    fontWeight: 600,
  },
  badgeGray: {
    background: "#f3f4f6",
    color: "#6b7280",
    borderRadius: 99,
    padding: "4px 10px",
    fontSize: 12,
    fontWeight: 600,
  },
  columns: {
    display: "grid",
    gridTemplateColumns: "1fr 1.1fr",
    gap: 16,
  },
  panel: {
    background: "#fff",
    borderRadius: 12,
    padding: "18px 18px",
    boxShadow: "0 4px 14px rgba(30, 58, 95, 0.08)",
    border: "1px solid #e7eef5",
    transition: "all 180ms ease",
  },
  panelWide: {
    background: "#fff",
    borderRadius: 12,
    padding: "18px 20px",
    boxShadow: "0 4px 14px rgba(30, 58, 95, 0.08)",
    border: "1px solid #e7eef5",
    transition: "all 180ms ease",
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    gap: 10,
    flexWrap: "wrap",
  },
  panelTitle: { fontWeight: 700, fontSize: 15, color: "#1e3a5f" },
  btnRecord: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  btnStop: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  btnRefresh: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "#eef4fb",
    color: "#27435f",
    border: "1px solid #d2dfed",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  empty: { color: "#9ca3af", fontSize: 14 },
  noteCard: {
    background: "#f9fbfe",
    borderRadius: 10,
    padding: "12px 14px",
    marginBottom: 10,
    border: "1px solid #e5edf7",
  },
  noteFormCard: {
    background: "#f0f9ff",
    borderRadius: 10,
    padding: "14px",
    marginBottom: 16,
    border: "1px solid #bfdbfe",
    maxWidth: "100%",
    overflow: "hidden",
    boxSizing: "border-box",
  },
  noteDate: { fontSize: 11, color: "#9ca3af", marginBottom: 4 },
  noteTranscript: { fontSize: 14, color: "#111827", lineHeight: 1.45, marginBottom: 8 },
  fieldLabel: {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 6,
  },
  consentBox: {
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: "10px 12px",
    marginBottom: 12,
    background: "#f9fafb",
  },
  consentTitle: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontWeight: 700,
  },
  consentStatusRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  consentBadge: {
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
  },
  consentMeta: {
    fontSize: 12,
    color: "#6b7280",
  },
  consentMetaGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 6,
    fontSize: 12,
    color: "#4b5563",
    marginBottom: 8,
  },
  consentActions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  formCard: {
    border: "1px solid #dbe8f5",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    background: "#f7fbff",
  },
  formHeader: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    fontWeight: 700,
    color: "#1e3a5f",
    marginBottom: 8,
  },
  formGrid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    marginBottom: 8,
  },
  input: {
    border: "1px solid #cdd9e7",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 13,
    outline: "none",
    width: "100%",
    background: "#fff",
  },
  dictationControlsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
    width: "100%",
    alignItems: "center",
    minWidth: 0,
  },
  dictationSelect: {
    flex: "1 1 220px",
    minWidth: 0,
    minHeight: 44,
  },
  dictationToggleBtn: {
    flex: "0 0 auto",
    minHeight: 44,
    minWidth: 150,
    maxWidth: "100%",
    border: "none",
    borderRadius: 10,
    color: "#fff",
    padding: "0 14px",
    fontSize: 13,
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  transcriptTextarea: {
    display: "block",
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    minHeight: 96,
    borderRadius: 12,
    padding: "12px 14px",
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 14,
    lineHeight: 1.6,
    color: "#0f172a",
    background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
    border: "1px solid #bfdbfe",
    boxShadow: "inset 0 1px 1px rgba(37, 99, 235, 0.04)",
    resize: "none",
    overflow: "hidden",
  },
  structureBtn: {
    marginTop: 10,
    width: "100%",
    minHeight: 42,
    border: "none",
    borderRadius: 10,
    background: "linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)",
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 0.2,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 8px 20px rgba(37, 99, 235, 0.25)",
  },
  formActions: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  feedback: {
    border: "1px solid #d6e6f5",
    background: "#f0f8ff",
    borderRadius: 8,
    padding: "8px 10px",
    color: "#1f3a56",
    fontSize: 13,
    marginBottom: 10,
  },
  alertItemLike: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 10px",
    borderBottom: "1px solid #f3f4f6",
    fontSize: 13,
  },
  latestVitals: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
    gap: 10,
    marginBottom: 16,
  },
  vitalBox: {
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "10px 12px",
    textAlign: "center",
    background: "#fff",
  },
  vitalValue: { fontSize: 18, fontWeight: 700 },
  vitalUnit: { fontSize: 12, fontWeight: 400, color: "#6b7280" },
  vitalLabel: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  timelineContainer: {
    position: "relative",
    paddingLeft: 30,
  },
  timelineItem: {
    position: "relative",
    paddingBottom: 20,
    display: "flex",
    gap: 12,
  },
  timelineDot: {
    position: "absolute",
    left: -30,
    top: 0,
    width: 12,
    height: 12,
    borderRadius: "50%",
    border: "2px solid white",
    boxShadow: "0 0 0 2px #e5e7eb",
  },
  timelineLine: {
    position: "absolute",
    left: -24,
    top: 12,
    width: 0,
    height: 32,
    borderLeft: "2px solid #e5e7eb",
  },
  timelineContent: {
    flex: 1,
    background: "#f9fafb",
    borderRadius: 8,
    padding: "10px 12px",
    borderLeft: "3px solid #e5e7eb",
  },
};
