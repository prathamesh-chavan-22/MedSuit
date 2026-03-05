import { useState, useRef } from "react";
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

export default function PatientDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [recording, setRecording] = useState(false);
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

  const mockVitalMut = useMutation({
    mutationFn: () => api.post(`/vitals/mock/${id}`),
    onSuccess: () => qc.invalidateQueries(["vitals", id]),
  });

  // Audio recording
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    mediaRef.current = mr;
    chunksRef.current = [];
    mr.ondataavailable = (e) => chunksRef.current.push(e.data);
    mr.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("file", blob, "checkup.webm");
      await api.post(`/audio/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      qc.invalidateQueries(["audio", id]);
    };
    mr.start();
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    setRecording(false);
  };

  // Prepare chart data (reverse for chronological order)
  const chartData = [...vitals].reverse().map((v, i) => ({
    name: `#${i + 1}`,
    "HR (bpm)": v.heart_rate,
    "SpO2 (%)": v.spo2,
    "Temp (°C)": v.temperature,
  }));

  if (isLoading) return <div style={{ padding: 40 }}>Loading…</div>;
  if (!patient) return <div style={{ padding: 40 }}>Patient not found.</div>;

  return (
    <div style={styles.page}>
      {/* Patient header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.name}>{patient.full_name}</h2>
          <p style={styles.meta}>
            {patient.age ? `${patient.age} yrs` : ""}{" "}
            {patient.gender ? `· ${patient.gender}` : ""}
            {patient.diagnosis ? ` · ${patient.diagnosis}` : ""}
          </p>
        </div>
        <div style={styles.tags}>
          {patient.is_serious && (
            <span style={styles.badgeDanger}>Serious</span>
          )}
          {patient.infection_risk && (
            <span style={styles.badgeWarn}>Infection Risk</span>
          )}
          {patient.allergies && (
            <span style={styles.badgeInfo}>Allergy: {patient.allergies}</span>
          )}
          {patient.mental_status && (
            <span style={styles.badgeGray}>
              Mental: {patient.mental_status}
            </span>
          )}
        </div>
      </div>

      <div style={styles.columns}>
        {/* Left: Audio notes */}
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
          {notes.length === 0 ? (
            <p style={styles.empty}>No audio notes yet.</p>
          ) : (
            notes.map((n) => (
              <div key={n.id} style={styles.noteCard}>
                <div style={styles.noteDate}>
                  {new Date(n.created_at).toLocaleString()}
                </div>
                <div style={styles.noteTranscript}>
                  {n.transcript || "Transcribing…"}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right: Vitals */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <span style={styles.panelTitle}>Vital Signs</span>
            <button
              style={styles.btnRefresh}
              onClick={() => mockVitalMut.mutate()}
              disabled={mockVitalMut.isPending}
            >
              <RefreshCw size={14} />{" "}
              {mockVitalMut.isPending ? "…" : "Simulate"}
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
                [
                  "Temp",
                  vitals[0].temperature,
                  "°C",
                  vitals[0].temperature > 38,
                ],
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
                <Line
                  type="monotone"
                  dataKey="HR (bpm)"
                  stroke="#3b82f6"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="SpO2 (%)"
                  stroke="#10b981"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="Temp (°C)"
                  stroke="#f59e0b"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p style={styles.empty}>
              No vitals recorded. Click Simulate to add a reading.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { padding: "28px 32px", maxWidth: 1100 },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  name: { margin: 0, fontSize: 22, fontWeight: 700, color: "#1e3a5f" },
  meta: { margin: "4px 0 0", color: "#6b7280", fontSize: 14 },
  tags: { display: "flex", gap: 8, flexWrap: "wrap" },
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
  columns: { display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 20 },
  panel: {
    background: "#fff",
    borderRadius: 12,
    padding: "20px 22px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  panelTitle: { fontWeight: 600, fontSize: 15, color: "#1e3a5f" },
  btnRecord: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    background: "#3b82f6",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "7px 12px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnStop: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    background: "#ef4444",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "7px 12px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnRefresh: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    background: "#f3f4f6",
    color: "#374151",
    border: "none",
    borderRadius: 8,
    padding: "7px 12px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  empty: { color: "#9ca3af", fontSize: 14 },
  noteCard: {
    background: "#f9fafb",
    borderRadius: 8,
    padding: "12px 14px",
    marginBottom: 10,
  },
  noteDate: { fontSize: 11, color: "#9ca3af", marginBottom: 4 },
  noteTranscript: { fontSize: 14, color: "#111827", lineHeight: 1.5 },
  latestVitals: {
    display: "grid",
    gridTemplateColumns: "repeat(4,1fr)",
    gap: 10,
    marginBottom: 16,
  },
  vitalBox: {
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "10px 12px",
    textAlign: "center",
  },
  vitalValue: { fontSize: 18, fontWeight: 700 },
  vitalUnit: { fontSize: 12, fontWeight: 400, color: "#6b7280" },
  vitalLabel: { fontSize: 12, color: "#6b7280", marginTop: 2 },
};
