import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mic, MicOff, RefreshCw, Bot, ShieldAlert, Loader2, Lightbulb, AlertTriangle, CheckCircle } from "lucide-react";
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

/* ---------- SVG Components ---------- */

function PatientAvatar() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      <defs>
        <linearGradient id="avatarGrad" x1="0" y1="0" x2="52" y2="52">
          <stop stopColor="#0d9488" />
          <stop offset="1" stopColor="#2dd4bf" />
        </linearGradient>
        <filter id="avatarGlow">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#0d9488" floodOpacity="0.4" />
        </filter>
      </defs>
      <style>
        {`
          @keyframes av-pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          .av-anim { animation: av-pulse 4s ease-in-out infinite; transform-origin: center; filter: url(#avatarGlow); }
        `}
      </style>
      <rect className="av-anim" width="52" height="52" rx="16" fill="url(#avatarGrad)" />
      <circle cx="26" cy="20" r="8" fill="rgba(255,255,255,0.2)" stroke="#fff" strokeWidth="2" />
      <path d="M14 44c0-7 5-12 12-12s12 5 12 12" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function VitalWaveform({ color = "#0d9488" }) {
  return (
    <svg style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: 30, opacity: 0.15, pointerEvents: "none" }} viewBox="0 0 200 30" preserveAspectRatio="none">
      <style>
        {`
          @keyframes wave-slide {
            0% { transform: translateX(0); }
            100% { transform: translateX(-100px); }
          }
          .wave-anim { animation: wave-slide 4s linear infinite; }
          @keyframes glow-pulse {
            0%, 100% { box-shadow: 0 4px 24px rgba(239, 68, 68, 0.25), inset 0 0 0 1px rgba(239, 68, 68, 0.5); }
            50% { box-shadow: 0 4px 32px rgba(239, 68, 68, 0.5), inset 0 0 0 2px rgba(239, 68, 68, 0.6); }
          }
          .vital-warn {
            animation: glow-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
        `}
      </style>
      <g className="wave-anim">
        <polyline points="0,20 20,20 30,15 40,25 50,10 60,22 70,18 80,20 100,20 120,20 130,12 140,28 150,8 160,22 170,18 180,20 200,20 220,20 230,15 240,25 250,10 260,22 270,18 280,20 300,20"
          fill="none" stroke={color} strokeWidth="2" />
      </g>
    </svg>
  );
}
import { useAuth } from "../context/AuthContext";

/* ─────────────────────────────────────────────────────────────────────────────
   PatientTimeline — Jira-style grouped timeline
   ───────────────────────────────────────────────────────────────────────────── */

const EVENT_CONFIG = {
  vital: {
    label: "Vitals",
    color: "#0ea5e9",
    bg: "#f0f9ff",
    border: "#bae6fd",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  alert: {
    label: "Alert",
    color: "#ef4444",
    bg: "#fef2f2",
    border: "#fecaca",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  task: {
    label: "Task",
    color: "#8b5cf6",
    bg: "#faf5ff",
    border: "#d8b4fe",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
  },
  medication: {
    label: "Medication",
    color: "#0d9488",
    bg: "#f0fdfa",
    border: "#99f6e4",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="8" y="1" width="8" height="4" rx="1.5" />
        <path d="M17 5H7a4 4 0 00-4 4v10a4 4 0 004 4h10a4 4 0 004-4V9a4 4 0 00-4-4z" />
        <line x1="12" y1="10" x2="12" y2="18" />
        <line x1="8" y1="14" x2="16" y2="14" />
      </svg>
    ),
  },
  food: {
    label: "Food",
    color: "#f59e0b",
    bg: "#fffbeb",
    border: "#fde68a",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2" />
        <path d="M7 2v20" />
        <path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
      </svg>
    ),
  },
  lab: {
    label: "Lab",
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#c4b5fd",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2v17.5c0 1.4-1.1 2.5-2.5 2.5h0c-1.4 0-2.5-1.1-2.5-2.5V2" />
        <path d="M8.5 2h7" />
        <path d="M14.5 16h-5" />
      </svg>
    ),
  },
  audio_note: {
    label: "Audio Note",
    color: "#ec4899",
    bg: "#fdf4ff",
    border: "#f5d0fe",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2c-1.7 0-3 1.2-3 2.6v6.8C9 12.8 10.3 14 12 14c1.7 0 3-1.2 3-2.6V4.6C15 3.2 13.7 2 12 2z" />
        <path d="M19 10v2a7 7 0 01-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    ),
  },
  clinical_note: {
    label: "Clinical Note",
    color: "#2563eb",
    bg: "#eff6ff",
    border: "#bfdbfe",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  consent: {
    label: "Consent",
    color: "#059669",
    bg: "#ecfdf5",
    border: "#a7f3d0",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
};

function formatRelativeDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMins = Math.round((d - now) / 60000);
  const diffHours = Math.round((d - now) / 3600000);
  const diffDays = Math.round((d - now) / 86400000);
  if (Math.abs(diffMins) < 1) return "just now";
  if (diffMins > 0) {
    if (diffMins < 60) return `in ${diffMins}m`;
    if (diffHours < 24) return `in ${diffHours}h`;
    return `in ${diffDays}d`;
  } else {
    if (Math.abs(diffMins) < 60) return `${Math.abs(diffMins)}m ago`;
    if (Math.abs(diffHours) < 24) return `${Math.abs(diffHours)}h ago`;
    return `${Math.abs(diffDays)}d ago`;
  }
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function TimelineEventCard({ evt }) {
  const cfg = EVENT_CONFIG[evt.event_type] || {
    label: evt.event_type,
    color: "#6b7280",
    bg: "#f9fafb",
    border: "#e5e7eb",
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /></svg>,
  };
  const isFuture = evt.metadata?.is_future;
  const isWarning = evt.severity === "warning" || evt.severity === "critical";
  const severityColor = evt.severity === "critical" ? "#ef4444" : evt.severity === "warning" ? "#f59e0b" : null;
  const dotColor = isWarning ? (severityColor || cfg.color) : cfg.color;

  const chips = [];
  const m = evt.metadata || {};
  if (evt.event_type === "vital") {
    if (m.heart_rate != null) chips.push({ label: "HR", val: `${m.heart_rate} bpm` });
    if (m.spo2 != null) chips.push({ label: "SpO2", val: `${m.spo2}%` });
    if (m.temperature != null) chips.push({ label: "Temp", val: `${m.temperature}\u00b0C` });
    if (m.blood_pressure_sys != null) chips.push({ label: "BP", val: `${m.blood_pressure_sys}/${m.blood_pressure_dia} mmHg` });
  } else if (evt.event_type === "task") {
    if (m.status) chips.push({ label: "Status", val: m.status });
    if (m.priority != null) chips.push({ label: "Priority", val: m.priority === 3 ? "High" : m.priority === 2 ? "Medium" : "Low" });
    if (m.due_at) chips.push({ label: "Due", val: new Date(m.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
  } else if (evt.event_type === "medication") {
    if (m.dosage) chips.push({ label: "Dose", val: m.dosage });
    if (m.route) chips.push({ label: "Route", val: m.route });
    if (m.notes) chips.push({ label: "Notes", val: m.notes, wide: true });
  } else if (evt.event_type === "food") {
    if (m.quantity) chips.push({ label: "Qty", val: m.quantity });
    if (m.meal_type) chips.push({ label: "Meal", val: m.meal_type });
    if (m.calories != null) chips.push({ label: "kcal", val: m.calories });
  } else if (evt.event_type === "lab") {
    if (m.value != null) chips.push({ label: "Value", val: `${m.value}${m.unit ? ` ${m.unit}` : ""}` });
    if (m.abnormal) chips.push({ label: "\u26a0 Abnormal", val: null, warn: true });
  } else if (evt.event_type === "clinical_note") {
    if (m.note_type) chips.push({ label: "Type", val: m.note_type });
    if (m.confidence != null) chips.push({ label: "Confidence", val: `${Math.round(m.confidence * 100)}%` });
    if (m.subjective_preview) chips.push({ label: "Preview", val: m.subjective_preview, wide: true });
  } else if (evt.event_type === "audio_note") {
    if (m.transcript_preview) chips.push({ label: "Transcript", val: m.transcript_preview, wide: true });
  } else if (evt.event_type === "consent") {
    if (m.basis) chips.push({ label: "Basis", val: m.basis });
    if (m.expires_at) chips.push({ label: "Expires", val: new Date(m.expires_at).toLocaleDateString() });
  }

  return (
    <div style={{
      background: isFuture ? `linear-gradient(135deg, ${cfg.bg}, #f8faff)` : "#ffffff",
      border: `1px solid ${isWarning ? (severityColor || cfg.border) + "99" : cfg.border}`,
      borderLeft: `4px solid ${isFuture ? dotColor + "66" : dotColor}`,
      borderRadius: 12,
      padding: "10px 14px",
      boxShadow: isWarning ? `0 2px 12px ${dotColor}22` : "0 1px 6px rgba(0,0,0,0.04)",
      transition: "box-shadow 0.2s ease, transform 0.2s ease",
      marginBottom: 12,
    }}>
      {/* Header row: badge + time */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "0.07em",
          textTransform: "uppercase", color: dotColor,
          background: cfg.bg, border: `1px solid ${cfg.border}`,
          borderRadius: 5, padding: "2px 7px",
        }}>{cfg.label}</span>

        {isFuture && (
          <span style={{
            fontSize: 10, fontWeight: 700, textTransform: "uppercase",
            color: "#7c3aed", background: "#f5f3ff",
            border: "1px solid #c4b5fd", borderRadius: 5, padding: "2px 7px",
            letterSpacing: "0.07em",
          }}>Scheduled</span>
        )}
        {evt.severity && (
          <span style={{
            fontSize: 10, fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "0.07em", borderRadius: 5, padding: "2px 7px",
            color: evt.severity === "critical" ? "#991b1b" : evt.severity === "warning" ? "#92400e" : "#1e40af",
            background: evt.severity === "critical" ? "#fee2e2" : evt.severity === "warning" ? "#fef3c7" : "#dbeafe",
          }}>{evt.severity}</span>
        )}

        <span style={{ marginLeft: "auto", fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap", flexShrink: 0 }}>
          {new Date(evt.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      {/* Title */}
      <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: chips.length > 0 ? 8 : 0, lineHeight: 1.4 }}>
        {evt.title}
      </div>

      {/* Chips */}
      {chips.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {chips.map((chip, i) => (
            <span key={i} style={{
              fontSize: 11,
              color: chip.warn ? "#92400e" : "#475569",
              background: chip.warn ? "#fef3c7" : "#f1f5f9",
              border: `1px solid ${chip.warn ? "#fcd34d" : "#e2e8f0"}`,
              borderRadius: 6, padding: "2px 8px",
              maxWidth: chip.wide ? "100%" : "230px",
              overflow: "hidden", textOverflow: "ellipsis",
              whiteSpace: chip.wide ? "normal" : "nowrap",
              fontFamily: "monospace",
            }}>
              <strong style={{ fontFamily: "inherit" }}>{chip.label}</strong>
              {chip.val != null ? `: ${chip.val}` : ""}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   InteractiveBodyMap — clickable anatomical SVG
   ───────────────────────────────────────────────────────────────────────────── */

const BODY_REGIONS = [
  { id: "head",     label: "Head",       keywords: ["head", "brain", "skull", "eye", "ear", "nose", "throat", "migraine", "headache", "facial"] },
  { id: "chest",    label: "Chest",      keywords: ["chest", "heart", "lung", "pulmonary", "cardiac", "breath", "respiratory", "cough", "thorax", "rib"] },
  { id: "abdomen",  label: "Abdomen",    keywords: ["abdomen", "stomach", "liver", "kidney", "bowel", "gut", "nausea", "vomit", "abdominal", "gastro", "renal", "pancrea"] },
  { id: "left_arm", label: "Left Arm",   keywords: ["left arm", "left hand", "left wrist", "left elbow", "left shoulder", "left upper"] },
  { id: "right_arm",label: "Right Arm",  keywords: ["right arm", "right hand", "right wrist", "right elbow", "right shoulder", "right upper"] },
  { id: "left_leg", label: "Left Leg",   keywords: ["left leg", "left knee", "left ankle", "left foot", "left lower", "left hip", "left thigh"] },
  { id: "right_leg",label: "Right Leg",  keywords: ["right leg", "right knee", "right ankle", "right foot", "right lower", "right hip", "right thigh"] },
];

function BodyMapPanel({ region, timeline, clinicalNotes }) {
  if (!region) {
    return (
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 12, padding: "32px 24px", color: "#94a3b8",
        textAlign: "center",
      }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>Click a body region to see related events</p>
      </div>
    );
  }

  const cfg = BODY_REGIONS.find(r => r.id === region);
  const keywords = cfg?.keywords || [];

  const matchEvent = (evt) => {
    const haystack = [
      evt.title || "",
      evt.event_type || "",
      JSON.stringify(evt.metadata || {}),
    ].join(" ").toLowerCase();
    return keywords.some(k => haystack.includes(k));
  };

  const matchNote = (note) => {
    const haystack = [
      note.subjective || "", note.objective || "",
      note.assessment || "", note.plan || "",
    ].join(" ").toLowerCase();
    return keywords.some(k => haystack.includes(k));
  };

  const relEvents = timeline.filter(matchEvent);
  const relNotes  = clinicalNotes.filter(matchNote);
  const hasItems  = relEvents.length > 0 || relNotes.length > 0;

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      overflowY: "auto", padding: "14px 16px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div style={{
          width: 10, height: 10, borderRadius: "50%", background: "#0d9488", flexShrink: 0,
        }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{cfg?.label} Region</span>
        <span style={{
          marginLeft: "auto", fontSize: 11, background: "#f0fdfa",
          border: "1px solid #99f6e4", borderRadius: 10, padding: "1px 8px",
          color: "#0d9488", fontWeight: 600,
        }}>{relEvents.length + relNotes.length} events</span>
      </div>

      {!hasItems ? (
        <div style={{
          padding: "20px 0", textAlign: "center", color: "#94a3b8",
          fontSize: 13, fontWeight: 500,
        }}>
          No recorded events for {cfg?.label} region
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {relEvents.map((evt, i) => {
            const evtCfg = EVENT_CONFIG[evt.event_type];
            return (
              <div key={i} style={{
                border: `1px solid ${evtCfg?.border || "#e2e8f0"}`,
                borderLeft: `3px solid ${evtCfg?.color || "#0d9488"}`,
                borderRadius: 10, padding: "8px 12px",
                background: evtCfg?.bg || "#f8fafc",
                fontSize: 12,
              }}>
                <div style={{ fontWeight: 700, color: evtCfg?.color || "#0d9488", marginBottom: 2, textTransform: "uppercase", fontSize: 10 }}>
                  {evt.event_type}
                </div>
                <div style={{ fontWeight: 600, color: "#1e293b", marginBottom: 2 }}>{evt.title}</div>
                <div style={{ color: "#64748b", fontSize: 11 }}>
                  {new Date(evt.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            );
          })}
          {relNotes.map((note, i) => (
            <div key={`note-${i}`} style={{
              border: "1px solid #bfdbfe", borderLeft: "3px solid #2563eb",
              borderRadius: 10, padding: "8px 12px",
              background: "#eff6ff", fontSize: 12,
            }}>
              <div style={{ fontWeight: 700, color: "#2563eb", marginBottom: 2, textTransform: "uppercase", fontSize: 10 }}>
                clinical note
              </div>
              <div style={{ fontWeight: 600, color: "#1e293b", marginBottom: 2 }}>
                {note.note_type || "Note"} — {new Date(note.created_at).toLocaleDateString()}
              </div>
              {note.assessment && (
                <div style={{ color: "#3730a3", fontSize: 11, fontStyle: "italic" }}>
                  {note.assessment.slice(0, 80)}{note.assessment.length > 80 ? "…" : ""}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InteractiveBodyMap({ timeline, clinicalNotes, selectedRegion, onSelectRegion, diseaseLocations = [] }) {
  const [hoveredRegion, setHoveredRegion] = useState(null);

  const isDiseasedRegion = (id) => diseaseLocations.includes(id);

  const regionFill = (id) => {
    if (id === selectedRegion) return "rgba(20, 184, 166, 0.3)";
    if (isDiseasedRegion(id)) return "rgba(239, 68, 68, 0.18)";
    if (id === hoveredRegion) return "rgba(45, 212, 191, 0.15)";
    return "rgba(255, 255, 255, 0.03)";
  };

  const regionStroke = (id) => {
    if (id === selectedRegion) return "#14b8a6";
    if (isDiseasedRegion(id)) return "#ef4444";
    if (id === hoveredRegion) return "#2dd4bf";
    return "rgba(203, 213, 225, 0.4)";
  };

  const regionStrokeW = (id) => (id === selectedRegion || id === hoveredRegion || isDiseasedRegion(id)) ? 2 : 1;

  const regionProps = (id) => ({
    fill: regionFill(id),
    stroke: regionStroke(id),
    strokeWidth: regionStrokeW(id),
    className: `bodymap-region${id === selectedRegion ? ' selected' : ''}${isDiseasedRegion(id) ? ' diseased' : ''}`,
    style: { cursor: "pointer", transition: "fill 0.3s ease, stroke 0.3s ease" },
    onMouseEnter: () => setHoveredRegion(id),
    onMouseLeave: () => setHoveredRegion(null),
    onClick: () => onSelectRegion(id === selectedRegion ? null : id),
  });

  // Compute dot count per region for badge
  const regionCounts = {};
  BODY_REGIONS.forEach(({ id, keywords }) => {
    const c = timeline.filter(evt => {
      const h = [evt.title, evt.event_type, JSON.stringify(evt.metadata || {})].join(" ").toLowerCase();
      return keywords.some(k => h.includes(k));
    }).length + clinicalNotes.filter(n => {
      const h = [n.subjective, n.objective, n.assessment, n.plan].join(" ").toLowerCase();
      return keywords.some(k => h.includes(k));
    }).length;
    regionCounts[id] = c;
  });

  return (
    <div style={{
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", // High-tech dark background
      borderRadius: 14, border: "1px solid rgba(45,212,191,0.2)",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2), inset 0 0 20px rgba(20,184,166,0.05)",
      padding: "18px 20px 20px", marginBottom: 24, position: "relative", overflow: "hidden"
    }}>
      <style>{`
        .bodymap-region:hover { filter: drop-shadow(0 0 8px rgba(45,212,191,0.5)); }
        .bodymap-region.selected { filter: drop-shadow(0 0 12px rgba(20,184,166,0.8)); }
        @keyframes heartbeatPulse {
          0% { transform: scale(1); opacity: 0.6; }
          15% { transform: scale(1.15); opacity: 1; }
          30% { transform: scale(1); opacity: 0.8; }
          45% { transform: scale(1.15); opacity: 1; }
          60%, 100% { transform: scale(1); opacity: 0.6; }
        }
        .bodymap-heart { animation: heartbeatPulse 1.2s infinite ease-out; transform-origin: center; }
        @keyframes scanlineDrop {
          0% { transform: translateY(-340px); opacity: 0; }
          10% { opacity: 0.5; }
          90% { opacity: 0.5; }
          100% { transform: translateY(340px); opacity: 0; }
        }
        .bodymap-scanner { animation: scanlineDrop 4s linear infinite; pointer-events: none; }
        @keyframes diseasePulse {
          0%, 100% { filter: drop-shadow(0 0 4px rgba(239,68,68,0.4)); }
          50% { filter: drop-shadow(0 0 14px rgba(239,68,68,0.9)); }
        }
        .bodymap-region.diseased { animation: diseasePulse 1.8s ease-in-out infinite; }
        .bodymap-region.diseased.selected { animation: none; filter: drop-shadow(0 0 14px rgba(20,184,166,0.8)); }
      `}</style>

      {/* Grid Background Pattern */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.1, pointerEvents: "none",
        backgroundImage: 'linear-gradient(rgba(45,212,191,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(45,212,191,0.3) 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }} />

      <div style={{ marginBottom: 16, position: "relative", zIndex: 2 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#f8fafc" }}>Interactive Body Map</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>
            <span style={{color: "#2dd4bf", marginRight: 5}}>● LIVE SCAN</span>
            Click a region to view specific clinical events
          </p>
          {diseaseLocations.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
                textTransform: "uppercase", color: "#ef4444",
                background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.4)",
                borderRadius: 99, padding: "2px 8px",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
                Primary Disease Site
              </span>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 30, alignItems: "flex-start", flexWrap: "wrap", position: "relative", zIndex: 2 }}>
        {/* SVG Body (Tech HUD Style) */}
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, position: "relative" }}>
          <svg width="180" height="340" viewBox="0 0 180 340" fill="none">
            <defs>
              <radialGradient id="techGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="180" height="340" fill="url(#techGlow)" pointerEvents="none" />

            {/* Glowing scan line */}
            <rect x="10" y="0" width="160" height="2" fill="#2dd4bf" className="bodymap-scanner" />

            <g transform="translate(10, 0)">
              {/* ── HEAD ── */}
              <g {...regionProps("head")}>
                {/* More realistic head shape: wider top, narrower jaw */}
                <path d="M80 15 C 60 15, 50 30, 50 45 C 50 65, 65 75, 80 75 C 95 75, 110 65, 110 45 C 110 30, 100 15, 80 15 Z" />
                {/* HUD rings instead of eyes */}
                <circle cx="68" cy="44" r="4" stroke={selectedRegion === "head" || hoveredRegion === "head" ? "#2dd4bf" : "rgba(203,213,225,0.3)"} strokeWidth="1" fill="none" />
                <circle cx="92" cy="44" r="4" stroke={selectedRegion === "head" || hoveredRegion === "head" ? "#2dd4bf" : "rgba(203,213,225,0.3)"} strokeWidth="1" fill="none" />
                {/* Neural link dots */}
                <circle cx="80" cy="30" r="1.5" fill={selectedRegion === "head" || hoveredRegion === "head" ? "#2dd4bf" : "transparent"} />
              </g>

              {/* ── NECK connector (fused into chest/head nicely) ── */}
              <path d="M70 73 L70 88 C 70 88, 80 92, 90 88 L90 73 Z" fill="rgba(255,255,255,0.02)" stroke="rgba(203,213,225,0.2)" strokeWidth="1" />

              {/* ── CHEST ── */}
              <g {...regionProps("chest")}>
                {/* Broad shoulders, tapering down */}
                <path d="M35 95 C 45 88, 60 85, 80 85 C 100 85, 115 88, 125 95 C 130 100, 128 120, 120 150 C 115 165, 95 170, 80 170 C 65 170, 45 165, 40 150 C 32 120, 30 100, 35 95 Z" />
                
                {/* Ribcage HUD lines */}
                <path d="M55 110 Q 80 120 105 110 M55 125 Q 80 135 105 125 M60 140 Q 80 148 100 140" stroke="rgba(45,212,191,0.2)" strokeWidth="1" fill="none" strokeDasharray="4 2" />

                {/* Animated Heart */}
                <g className="bodymap-heart" style={{ transformOrigin: "80px 115px" }}>
                  <path d="M75 112 C 71 106, 62 106, 62 114 C 62 121, 75 130, 75 130 C 75 130, 88 121, 88 114 C 88 106, 79 106, 75 112 Z" 
                    fill="#f43f5e" filter="drop-shadow(0 0 5px rgba(244,63,94,0.6))" />
                </g>
              </g>

              {/* ── ABDOMEN ── */}
              <g {...regionProps("abdomen")}>
                {/* Tapering from chest to hips */}
                <path d="M41 168 C 47 165, 65 172, 80 172 C 95 172, 113 165, 119 168 C 117 190, 115 220, 110 240 C 105 248, 95 252, 80 252 C 65 252, 55 248, 50 240 C 45 220, 43 190, 41 168 Z" />
                {/* Center axis UI line */}
                <line x1="80" y1="172" x2="80" y2="245" stroke="rgba(45,212,191,0.2)" strokeWidth="1" strokeDasharray="2 4" />
                <circle cx="80" cy="210" r="4" fill="transparent" stroke={selectedRegion === "abdomen" || hoveredRegion === "abdomen" ? "#2dd4bf" : "rgba(203,213,225,0.3)"} />
              </g>

              {/* ── LEFT ARM (Patient's Right = Our Left Visually) ── */}
              <g {...regionProps("left_arm")}>
                {/* Tapered upper and lower arm */}
                <path d="M34 94 C 20 100, 18 120, 15 140 C 12 165, 8 185, 15 190 C 22 195, 28 175, 30 150 C 32 130, 36 105, 40 98 Z" />
                {/* Joint markers */}
                <circle cx="23" cy="142" r="3" fill="rgba(45,212,191,0.3)" />
              </g>

              {/* ── RIGHT ARM (Patient's Left = Our Right Visually) ── */}
              <g {...regionProps("right_arm")}>
                <path d="M126 94 C 140 100, 142 120, 145 140 C 148 165, 152 185, 145 190 C 138 195, 132 175, 130 150 C 128 130, 124 105, 120 98 Z" />
                <circle cx="137" cy="142" r="3" fill="rgba(45,212,191,0.3)" />
              </g>

              {/* ── LEFT LEG (Our Left Visually) ── */}
              <g {...regionProps("left_leg")}>
                {/* Tapered thigh and calf */}
                <path d="M52 249 C 45 270, 42 300, 38 325 C 36 335, 52 335, 55 325 C 60 300, 65 270, 68 250 Z" />
                <circle cx="53" cy="285" r="3" fill="rgba(45,212,191,0.3)" />
              </g>

              {/* ── RIGHT LEG (Our Right Visually) ── */}
              <g {...regionProps("right_leg")}>
                <path d="M108 249 C 115 270, 118 300, 122 325 C 124 335, 108 335, 105 325 C 100 300, 95 270, 92 250 Z" />
                <circle cx="107" cy="285" r="3" fill="rgba(45,212,191,0.3)" />
              </g>

              {/* Event count badges */}
              {BODY_REGIONS.map(({ id }) => {
                const count = regionCounts[id];
                if (!count) return null;
                // Badge anchor points per region
                const positions = {
                  head: [120, 20], chest: [125, 110], abdomen: [125, 205],
                  left_arm: [-2, 130], right_arm: [162, 130],
                  left_leg: [20, 290], right_leg: [140, 290],
                };
                const [bx, by] = positions[id] || [0, 0];
                return (
                  <g key={id} style={{ pointerEvents: 'none' }}>
                    <circle cx={bx} cy={by} r="12" fill="#0f172a" stroke="#2dd4bf" strokeWidth="1.5" />
                    <text x={bx} y={by + 4} textAnchor="middle" fontSize="11" fill="#2dd4bf" fontWeight="700">{count}</text>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Legend strip */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", maxWidth: 160 }}>
            {BODY_REGIONS.map(r => (
              <button key={r.id} onClick={() => onSelectRegion(r.id === selectedRegion ? null : r.id)}
                style={{
                  border: `1px solid ${r.id === selectedRegion ? "#2dd4bf" : isDiseasedRegion(r.id) ? "rgba(239,68,68,0.6)" : "rgba(203,213,225,0.2)"}`,
                  borderRadius: 99, padding: "2px 10px", fontSize: 10, fontWeight: 600,
                  cursor: "pointer",
                  background: r.id === selectedRegion ? "rgba(45,212,191,0.2)" : isDiseasedRegion(r.id) ? "rgba(239,68,68,0.15)" : "rgba(15,23,42,0.5)",
                  color: r.id === selectedRegion ? "#2dd4bf" : isDiseasedRegion(r.id) ? "#f87171" : "#94a3b8",
                  transition: "all 0.2s",
                }}>
                {isDiseasedRegion(r.id) ? "⚠ " : ""}{r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Events panel */}
        <div style={{
          flex: 1, minWidth: 220, maxHeight: 360,
          border: "1px solid rgba(45,212,191,0.2)", borderRadius: 12,
          background: "rgba(15,23,42,0.8)", display: "flex", flexDirection: "column",
          overflowY: "auto",
        }}>
          <BodyMapPanel
            region={selectedRegion}
            timeline={timeline}
            clinicalNotes={clinicalNotes}
          />
        </div>
      </div>
    </div>
  );
}

function PatientTimeline({ timeline }) {

  if (!timeline.length) {
    return (
      <div style={{
        padding: "48px 0", textAlign: "center", color: "#94a3b8",
        background: "rgba(255,255,255,0.9)", borderRadius: 14,
        border: "1px solid rgba(204,251,241,0.6)",
      }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: "0 auto 12px", display: "block", opacity: 0.3 }}>
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>No timeline events yet.</p>
      </div>
    );
  }

  // 1. Group events by Date String (YYYY-MM-DD)
  const groupedEvents = {};
  timeline.forEach(e => {
    let dtLabel = "Unknown Date";
    try {
      const ms = Date.parse(e.created_at);
      if (!isNaN(ms)) {
        const d = new Date(ms);
        dtLabel = d.toLocaleDateString('en-CA'); // 'YYYY-MM-DD'
      }
    } catch {}
    if (!groupedEvents[dtLabel]) groupedEvents[dtLabel] = [];
    groupedEvents[dtLabel].push(e);
  });

  // 2. Sort the dates (e.g., most recent to oldest or oldest to newest)
  const sortedDates = Object.keys(groupedEvents).sort((a, b) => new Date(a) - new Date(b));

  const now = new Date();
  const futureCount = timeline.filter(e => new Date(e.created_at) > now).length;
  const todayCount = timeline.filter(e => isSameDay(new Date(e.created_at), now)).length;

  return (
    <div style={{
      background: "rgba(255,255,255,0.9)",
      backdropFilter: "blur(8px)",
      borderRadius: 14,
      padding: "20px 0 24px",
      boxShadow: "0 4px 14px rgba(13, 148, 136, 0.05)",
      border: "1px solid rgba(204,251,241,0.6)",
      overflow: "hidden", // Keep the outer box neat
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 20, padding: "0 20px 14px", borderBottom: "1px solid #e2e8f0",
        flexWrap: "wrap", gap: 10,
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Patient Timeline</h3>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "#64748b" }}>
            {timeline.length} event{timeline.length !== 1 ? "s" : ""}
            {futureCount > 0 ? ` · ${futureCount} upcoming` : ""}
            {todayCount > 0 ? ` · ${todayCount} today` : ""}
          </p>
        </div>
        {/* Legend */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {Object.entries(EVENT_CONFIG).map(([key, cfg]) => (
            <span key={key} title={cfg.label} style={{
              width: 26, height: 26, borderRadius: 7,
              background: cfg.bg, border: `1px solid ${cfg.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: cfg.color, flexShrink: 0,
            }}>{cfg.icon}</span>
          ))}
        </div>
      </div>

      {/* Horizontal Scroll Area */}
      <div style={{
        overflowX: "auto",
        display: "flex",
        padding: "0 20px 20px",
        scrollBehavior: "smooth",
      }}>
        <div style={{
          display: "flex",
          position: "relative",
          minWidth: "min-content",
        }}>
          {/* Continuous Horizontal Track line under headers */}
          <div style={{
             position: "absolute",
             top: 40, 
             left: 10,
             right: 10,
             height: 3,
             background: "linear-gradient(90deg, #ccfbf1, #99f6e4, #0d9488)",
             borderRadius: 2,
             zIndex: 0,
             boxShadow: "0 1px 3px rgba(13, 148, 136, 0.2)",
          }} />

          {/* Render columns (one per date) */}
          {sortedDates.map((dateStr, dIdx) => {
            const dayEvents = groupedEvents[dateStr];
            
            // Format nice display date
            const dt = new Date(dateStr);
            const isToday = isSameDay(dt, now);
            const displayDate = isToday 
              ? "TODAY" 
              : dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

            return (
              <div key={dateStr} style={{
                width: 300, // Fixed width for each column stack
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                position: "relative",
                marginRight: 24, // spacing between columns
                zIndex: 1,
              }}>
                {/* Node Top area (Date Header + Dot) */}
                <div style={{
                  display: "flex", flexDirection: "column", 
                  marginBottom: 16, height: 50, position: "relative"
                }}>
                  {/* Date label */}
                  <span style={{ 
                    fontSize: 12, fontWeight: 700, color: isToday ? "#0d9488" : "#475569", 
                    textTransform: "uppercase", letterSpacing: "0.05em",
                    marginLeft: 14,
                    display: "flex", alignItems: "baseline", gap: 6,
                  }}>
                    {displayDate}
                    <span style={{ fontSize: 10, background: "#f1f5f9", padding: "1px 6px", borderRadius: 10, color: "#64748b" }}>
                      {dayEvents.length}
                    </span>
                  </span>

                  {/* Axis Node / Dot matching the styling */}
                  <div style={{
                    width: 14, height: 14, borderRadius: "50%",
                    background: isToday ? "#14b8a6" : "#ffffff",
                    border: `3px solid ${isToday ? "#ffffff" : "#99f6e4"}`,
                    boxShadow: `0 0 0 3px ${isToday ? "#14b8a6" : "transparent"}`,
                    position: "absolute",
                    top: 35, // Centered vertically on the horizontal line (y=40)
                    left: 20, 
                    zIndex: 2,
                  }} />
                </div>

                {/* Vertical Event Cards Stack */}
                <div style={{ display: "flex", flexDirection: "column", paddingLeft: 10 }}>
                  {dayEvents.map((evt, i) => (
                    <TimelineEventCard key={`${evt.event_type}-${i}`} evt={evt} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "notes", label: "Clinical Notes" },
  { id: "labs", label: "Labs" },
  { id: "timeline", label: "Timeline" },
  { id: "ai-insights", label: "AI Insights" },
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

  // Body Map state
  const [selectedRegion, setSelectedRegion] = useState(null);

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
      <div className="anim-slide-up" style={styles.headerCard}>
        <div style={styles.headerTop}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <PatientAvatar />
            <div>
              <h2 style={styles.name}>{patient.full_name}</h2>
              <p style={styles.meta}>
                {patient.age ? `${patient.age} yrs` : ""}
                {patient.gender ? ` · ${patient.gender}` : ""}
                {patient.diagnosis ? ` · ${patient.diagnosis}` : ""}
              </p>
            </div>
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
                      className={warn ? "vital-warn" : ""}
                      style={{
                        ...styles.vitalBox,
                        borderColor: warn ? "rgba(239, 68, 68, 0.5)" : "rgba(255, 255, 255, 0.4)",
                        background: warn ? "rgba(254, 226, 226, 0.5)" : "rgba(255, 255, 255, 0.25)",
                      }}
                    >
                      <VitalWaveform color={warn ? "#ef4444" : "#0d9488"} />
                      <div
                        style={{
                          ...styles.vitalValue,
                          color: warn ? "#ef4444" : "#0f172a",
                        }}
                      >
                        {val} <span style={{ ...styles.vitalUnit, color: warn ? "#f87171" : "#64748b" }}>{unit}</span>
                      </div>
                      <div style={{ ...styles.vitalLabel, color: warn ? "#ef4444" : "#64748b" }}>{label}</div>
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
                <p style={styles.empty}>No vitals recorded.</p>
              )}
            </div>
          </div>

          <InteractiveBodyMap
            timeline={timeline}
            clinicalNotes={clinicalNotes}
            selectedRegion={selectedRegion}
            onSelectRegion={setSelectedRegion}
            diseaseLocations={(patient?.disease_locations || "").split(",").map(s => s.trim()).filter(Boolean)}
          />
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

      {activeTab === "timeline" && <PatientTimeline timeline={timeline} />}

      {activeTab === "ai-insights" && (
        <div style={styles.panelWide}>
          <div style={styles.panelHeader}>
            <span style={styles.panelTitle}><Bot size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />AI Clinical Decision Support</span>
            <button
              style={{
                ...styles.btnRecord,
                background: aiScanning ? "#9ca3af" : "linear-gradient(135deg, #0d9488, #14b8a6)",
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
              {aiScanning ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Scanning...</> : <><ShieldAlert size={14} /> Run Risk Scan</>}
            </button>
          </div>

          {/* Risk Flags */}
          {aiScanning && (
            <div style={{ padding: "20px 0", textAlign: "center", color: "#64748b", fontSize: 14 }}>
              Analyzing patient data with Mistral AI...
            </div>
          )}

          {/* AI Disclaimer */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#fefce8', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', marginBottom: 18, fontSize: 12, color: '#92400e', lineHeight: 1.5 }}>
            <AlertTriangle size={14} style={{ marginTop: 1, flexShrink: 0, color: '#d97706' }} />
            <span>AI analysis is for informational support only. It can make mistakes and must not replace professional clinical judgment. Please verify all findings independently.</span>
          </div>

          {aiRiskFlags.length > 0 && (
            <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
              {aiRiskFlags.map((flag, i) => {
                const severityStyles = {
                  critical: { bg: "#fef2f2", border: "#fca5a5", text: "#991b1b", dotColor: "#ef4444" },
                  warning: { bg: "#fffbeb", border: "#fcd34d", text: "#92400e", dotColor: "#f59e0b" },
                  info: { bg: "#eff6ff", border: "#93c5fd", text: "#1e40af", dotColor: "#3b82f6" },
                };
                const c = severityStyles[flag.severity] || severityStyles.info;
                return (
                  <div key={i} style={{
                    background: c.bg,
                    border: `1px solid ${c.border}`,
                    borderRadius: 12,
                    padding: "12px 16px",
                    color: c.text,
                  }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: c.dotColor, flexShrink: 0 }} />
                      {flag.title}
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 4 }}>
                      {flag.message}
                    </div>
                    {flag.recommendation && (
                      <div style={{ fontSize: 12, fontStyle: "italic", opacity: 0.85, display: 'flex', alignItems: 'flex-start', gap: 5 }}>
                        <Lightbulb size={12} style={{ marginTop: 1, flexShrink: 0 }} />
                        {flag.recommendation}
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
                    { role: "assistant", text: `Error: ${err?.response?.data?.detail || err.message}` },
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
    background: "linear-gradient(140deg, rgba(255,255,255,0.92) 0%, rgba(240,253,250,0.8) 100%)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(204,251,241,0.6)",
    borderRadius: 16,
    padding: "20px 22px",
    boxShadow: "0 10px 30px rgba(13, 148, 136, 0.06)",
    transition: "all 220ms ease",
  },
  headerTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
  },
  name: { margin: 0, fontSize: 24, fontWeight: 700, color: "#134e4a", letterSpacing: "-0.02em" },
  meta: { margin: "4px 0 0", color: "#64748b", fontSize: 14 },
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
    border: "1px solid #ccfbf1",
    background: "rgba(255,255,255,0.85)",
    borderRadius: 10,
    padding: "8px 10px",
    display: "flex",
    flexDirection: "column",
    fontSize: 13,
    color: "#0f172a",
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
    color: "#134e4a",
    fontSize: 13,
  },
  tabButton: {
    border: "1px solid #ccfbf1",
    background: "rgba(255,255,255,0.8)",
    color: "#475569",
    borderRadius: 999,
    padding: "7px 14px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 160ms ease",
  },
  tabActive: {
    border: "1px solid #0d9488",
    background: "linear-gradient(135deg, #0d9488, #14b8a6)",
    color: "#ffffff",
    borderRadius: 999,
    padding: "7px 14px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(13,148,136,0.25)",
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
    background: "#f0fdfa",
    color: "#0d9488",
    borderRadius: 99,
    padding: "4px 10px",
    fontSize: 12,
    fontWeight: 600,
  },
  badgeGray: {
    background: "#f1f5f9",
    color: "#64748b",
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
    background: "rgba(255,255,255,0.9)",
    backdropFilter: "blur(8px)",
    borderRadius: 14,
    padding: "18px 18px",
    boxShadow: "0 4px 14px rgba(13, 148, 136, 0.05)",
    border: "1px solid rgba(204,251,241,0.6)",
    transition: "all 180ms ease",
  },
  panelWide: {
    background: "rgba(255,255,255,0.9)",
    backdropFilter: "blur(8px)",
    borderRadius: 14,
    padding: "18px 20px",
    boxShadow: "0 4px 14px rgba(13, 148, 136, 0.05)",
    border: "1px solid rgba(204,251,241,0.6)",
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
  panelTitle: { fontWeight: 700, fontSize: 15, color: "#134e4a" },
  btnRecord: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "linear-gradient(135deg, #0d9488, #14b8a6)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(13,148,136,0.2)",
  },
  btnStop: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  btnRefresh: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "#f0fdfa",
    color: "#134e4a",
    border: "1px solid #ccfbf1",
    borderRadius: 10,
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  empty: { color: "#94a3b8", fontSize: 14 },
  noteCard: {
    background: "rgba(240,253,250,0.5)",
    borderRadius: 12,
    padding: "14px 16px",
    marginBottom: 10,
    border: "1px solid #ccfbf1",
  },
  noteFormCard: {
    background: "#f0fdfa",
    borderRadius: 12,
    padding: "16px",
    marginBottom: 16,
    border: "1px solid #99f6e4",
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
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: "8px 12px",
    fontSize: 13,
    outline: "none",
    width: "100%",
    background: "rgba(255,255,255,0.7)",
    transition: "border-color 0.2s, box-shadow 0.2s",
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
    background: "linear-gradient(135deg, #0d9488, #14b8a6)",
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 0.2,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 8px 20px rgba(13, 148, 136, 0.25)",
    transition: "transform 0.15s ease",
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
    gap: 12,
    marginBottom: 16,
  },
  vitalBox: {
    border: "1px solid rgba(255, 255, 255, 0.4)",
    borderRadius: 16,
    padding: "16px",
    textAlign: "center",
    background: "rgba(255, 255, 255, 0.25)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05), inset 0 0 0 1px rgba(255, 255, 255, 0.5)",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    position: "relative",
    overflow: "hidden",
  },
  vitalValue: { 
    fontSize: 28, 
    fontWeight: 800, 
    letterSpacing: "-0.03em",
    position: "relative", 
    zIndex: 1,
    textShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },
  vitalUnit: { 
    fontSize: 13, 
    fontWeight: 600, 
    marginLeft: 4,
  },
  vitalLabel: { 
    fontSize: 13, 
    fontWeight: 600,
    marginTop: 6, 
    position: "relative", 
    zIndex: 1,
    letterSpacing: "0.02em",
    textTransform: "uppercase",
  },
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
    boxShadow: "0 0 0 2px #ccfbf1",
  },
  timelineLine: {
    position: "absolute",
    left: -24,
    top: 12,
    width: 0,
    height: 32,
    borderLeft: "2px solid #ccfbf1",
  },
  timelineContent: {
    flex: 1,
    background: "rgba(240,253,250,0.5)",
    borderRadius: 10,
    padding: "10px 14px",
    borderLeft: "3px solid #99f6e4",
  },
  textarea: {
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: "8px 12px",
    fontSize: 13,
    outline: "none",
    width: "100%",
    background: "rgba(255,255,255,0.7)",
    resize: "vertical",
    fontFamily: "inherit",
  },
};
