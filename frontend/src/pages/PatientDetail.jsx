import { useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, Mic, MicOff, RefreshCw } from "lucide-react";
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
];

export default function PatientDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const { user } = useAuth();

  const [recording, setRecording] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [consentFeedback, setConsentFeedback] = useState("");
  const [consentForm, setConsentForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    relationship: "guardian",
    address: "",
    basis: "clinical-care",
    notes: "",
    expires_at: "",
  });

  const mediaRef = useRef(null);
  const chunksRef = useRef([]);

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
  });
  const { data: consent } = useQuery({
    queryKey: ["consent", id],
    queryFn: () => api.get(`/consents/patients/${id}`).then((r) => r.data),
    retry: false,
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

  const canManageConsent = useMemo(
    () => ["admin", "doctor", "nurse"].includes(user?.role),
    [user?.role]
  );
  const canRevokeConsent = useMemo(
    () => ["admin", "doctor"].includes(user?.role),
    [user?.role]
  );
  const canFinalizeNotes = useMemo(
    () => ["admin", "doctor"].includes(user?.role),
    [user?.role]
  );

  const grantConsentMut = useMutation({
    mutationFn: () =>
      api.post(`/consents/patients/${id}`, {
        basis: "clinical-care",
      }),
    onSuccess: () => qc.invalidateQueries(["consent", id]),
  });

  const revokeConsentMut = useMutation({
    mutationFn: () => api.post(`/consents/patients/${id}/revoke`),
    onSuccess: () => qc.invalidateQueries(["consent", id]),
  });

  const requestConsentEmailMut = useMutation({
    mutationFn: (payload) => api.post(`/consents/patients/${id}/request-email`, payload),
    onSuccess: (res) => {
      qc.invalidateQueries(["consent", id]);
      setConsentFeedback(
        res.data?.email_sent
          ? `Consent action email sent to ${res.data.action_url_sent_to}.`
          : "Consent created but email was not sent. Check SMTP settings."
      );
    },
    onError: (err) => {
      setConsentFeedback(
        err?.response?.data?.detail || "Failed to send consent action email."
      );
    },
  });

  const createDraftMut = useMutation({
    mutationFn: () => api.post(`/clinical-notes/patients/${id}/draft-from-latest-audio`),
    onSuccess: () => qc.invalidateQueries(["clinical-notes", id]),
  });
  const finalizeNoteMut = useMutation({
    mutationFn: (noteId) => api.post(`/clinical-notes/${noteId}/finalize`),
    onSuccess: () => qc.invalidateQueries(["clinical-notes", id]),
  });

  const addLabMut = useMutation({
    mutationFn: (payload) => api.post(`/labs/patients/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries(["lab-summary", id]);
      qc.invalidateQueries(["timeline", id]);
    },
  });

  const mockVitalMut = useMutation({
    mutationFn: () => api.post(`/vitals/mock/${id}`),
    onSuccess: () => qc.invalidateQueries(["vitals", id]),
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
          qc.invalidateQueries(["audio", id]);
          qc.invalidateQueries(["timeline", id]);
        } catch (err) {
          setConsentFeedback(
            err?.response?.data?.detail || "Audio upload failed. Consent may be missing."
          );
        }
      };
      mr.start();
      setRecording(true);
    } catch {
      setConsentFeedback("Microphone access is required for recording.");
    }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    setRecording(false);
  };

  const chartData = [...vitals].reverse().map((v, i) => ({
    name: `#${i + 1}`,
    "HR (bpm)": v.heart_rate,
    "SpO2 (%)": v.spo2,
    "Temp (deg C)": v.temperature,
  }));

  const handleConsentInputChange = (field, value) => {
    setConsentForm((prev) => ({ ...prev, [field]: value }));
  };

  const submitConsentRequest = (e) => {
    e.preventDefault();
    setConsentFeedback("");
    requestConsentEmailMut.mutate({
      ...consentForm,
      expires_at: consentForm.expires_at || null,
      notes: consentForm.notes || null,
    });
  };

  if (isLoading) return <div style={{ padding: 40 }}>Loading...</div>;
  if (!patient) return <div style={{ padding: 40 }}>Patient not found.</div>;

  return (
    <div style={styles.page}>
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
          <div style={styles.columns}>
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

              <div style={styles.consentBox}>
                <div style={styles.consentTitle}>Recording Consent</div>
                <div style={styles.consentStatusRow}>
                  <span
                    style={{
                      ...styles.consentBadge,
                      background:
                        consent?.status === "active"
                          ? "#dcfce7"
                          : consent?.status === "pending"
                            ? "#fef9c3"
                            : "#fee2e2",
                      color:
                        consent?.status === "active"
                          ? "#166534"
                          : consent?.status === "pending"
                            ? "#854d0e"
                            : "#b91c1c",
                    }}
                  >
                    {consent?.status || "missing"}
                  </span>
                  {consent?.expires_at && (
                    <span style={styles.consentMeta}>
                      Expires: {new Date(consent.expires_at).toLocaleString()}
                    </span>
                  )}
                </div>

                {(consent?.contact_first_name || consent?.contact_email) && (
                  <div style={styles.consentMetaGrid}>
                    <span>
                      Contact: {consent?.contact_first_name || ""} {consent?.contact_last_name || ""}
                    </span>
                    <span>Email: {consent?.contact_email || "N/A"}</span>
                    <span>Phone: {consent?.contact_phone || "N/A"}</span>
                    <span>Relationship: {consent?.relationship || "N/A"}</span>
                  </div>
                )}

                {canManageConsent && (
                  <div style={styles.consentActions}>
                    <button
                      style={styles.btnRefresh}
                      onClick={() => grantConsentMut.mutate()}
                      disabled={grantConsentMut.isPending}
                    >
                      {grantConsentMut.isPending ? "Granting..." : "Grant Consent"}
                    </button>
                    {canRevokeConsent && (
                      <button
                        style={styles.btnStop}
                        onClick={() => revokeConsentMut.mutate()}
                        disabled={revokeConsentMut.isPending}
                      >
                        {revokeConsentMut.isPending ? "Revoking..." : "Revoke Consent"}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {canManageConsent && (
                <form onSubmit={submitConsentRequest} style={styles.formCard}>
                  <div style={styles.formHeader}>
                    <Mail size={14} /> Send Consent Email Action
                  </div>

                  <div style={styles.formGrid2}>
                    <input
                      required
                      placeholder="First name"
                      value={consentForm.first_name}
                      onChange={(e) => handleConsentInputChange("first_name", e.target.value)}
                      style={styles.input}
                    />
                    <input
                      required
                      placeholder="Last name"
                      value={consentForm.last_name}
                      onChange={(e) => handleConsentInputChange("last_name", e.target.value)}
                      style={styles.input}
                    />
                    <input
                      required
                      type="email"
                      placeholder="Email"
                      value={consentForm.email}
                      onChange={(e) => handleConsentInputChange("email", e.target.value)}
                      style={styles.input}
                    />
                    <input
                      required
                      placeholder="Phone"
                      value={consentForm.phone}
                      onChange={(e) => handleConsentInputChange("phone", e.target.value)}
                      style={styles.input}
                    />
                    <input
                      required
                      placeholder="Relationship"
                      value={consentForm.relationship}
                      onChange={(e) => handleConsentInputChange("relationship", e.target.value)}
                      style={styles.input}
                    />
                    <input
                      type="datetime-local"
                      value={consentForm.expires_at}
                      onChange={(e) => handleConsentInputChange("expires_at", e.target.value)}
                      style={styles.input}
                    />
                  </div>

                  <input
                    required
                    placeholder="Address"
                    value={consentForm.address}
                    onChange={(e) => handleConsentInputChange("address", e.target.value)}
                    style={{ ...styles.input, marginTop: 8 }}
                  />

                  <div style={styles.formGrid2}>
                    <input
                      placeholder="Consent basis"
                      value={consentForm.basis}
                      onChange={(e) => handleConsentInputChange("basis", e.target.value)}
                      style={styles.input}
                    />
                    <input
                      placeholder="Notes (optional)"
                      value={consentForm.notes}
                      onChange={(e) => handleConsentInputChange("notes", e.target.value)}
                      style={styles.input}
                    />
                  </div>

                  <div style={styles.formActions}>
                    <button
                      type="submit"
                      style={styles.btnRecord}
                      disabled={requestConsentEmailMut.isPending}
                    >
                      {requestConsentEmailMut.isPending ? "Sending..." : "Send Yes/No Email"}
                    </button>
                  </div>
                </form>
              )}

              {consentFeedback && <div style={styles.feedback}>{consentFeedback}</div>}

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
          {clinicalNotes.length === 0 ? (
            <p style={styles.empty}>No clinical notes yet.</p>
          ) : (
            clinicalNotes.map((note) => (
              <div key={note.id} style={styles.noteCard}>
                <div style={styles.consentStatusRow}>
                  <strong>#{note.id}</strong>
                  <span style={styles.badgeInfo}>{note.status}</span>
                  <span style={styles.consentMeta}>
                    confidence: {Math.round((note.confidence || 0) * 100)}%
                  </span>
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
            timeline.slice(0, 20).map((evt, idx) => (
              <div key={`${evt.event_type}-${idx}`} style={styles.alertItemLike}>
                <span style={styles.badgeGray}>{evt.event_type}</span>
                <span style={{ flex: 1 }}>{evt.title}</span>
                <span style={styles.consentMeta}>{new Date(evt.created_at).toLocaleString()}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    padding: "26px 24px 34px",
    maxWidth: 1200,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: 18,
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
    boxShadow: "0 2px 12px rgba(15, 23, 42, 0.08)",
    border: "1px solid #e7eef5",
    transition: "all 180ms ease",
  },
  panelWide: {
    background: "#fff",
    borderRadius: 12,
    padding: "18px 20px",
    boxShadow: "0 2px 12px rgba(15, 23, 42, 0.08)",
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
  noteDate: { fontSize: 11, color: "#9ca3af", marginBottom: 4 },
  noteTranscript: { fontSize: 14, color: "#111827", lineHeight: 1.45 },
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
};
