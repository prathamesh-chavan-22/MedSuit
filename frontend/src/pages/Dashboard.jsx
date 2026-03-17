import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Clock3,
  Siren,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import AnimatedNumber from "../components/AnimatedNumber";

/* ========== Inline SVG Illustrations for stat cards ========== */

function PatientsSvg() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="pat-g1" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="#f0fdfa" />
          <stop offset="100%" stopColor="#ccfbf1" />
        </linearGradient>
        <linearGradient id="pat-g2" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="#ccfbf1" />
          <stop offset="100%" stopColor="#99f6e4" />
        </linearGradient>
      </defs>
      <style>
        {`
          @keyframes pat-float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-2px); }
          }
          .pat-anim1 { animation: pat-float 3s ease-in-out infinite; transform-origin: center; }
          .pat-anim2 { animation: pat-float 3s ease-in-out infinite 0.5s; transform-origin: center; }
        `}
      </style>
      <g className="pat-anim2">
        <circle cx="36" cy="16" r="5" fill="url(#pat-g2)" stroke="#14b8a6" strokeWidth="1.5" />
        <path d="M44 38c0-5-3-9-8-9" fill="url(#pat-g2)" stroke="#14b8a6" strokeWidth="1.5" strokeLinecap="round" />
      </g>
      <g className="pat-anim1">
        <circle cx="20" cy="14" r="8" fill="url(#pat-g1)" stroke="#0f766e" strokeWidth="2" />
        <path d="M6 42c0-8 6-14 14-14s14 6 14 14" fill="url(#pat-g1)" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function BedsSvg() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="bed-g" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="#f0fdfa"/>
          <stop offset="100%" stopColor="#ccfbf1"/>
        </linearGradient>
      </defs>
      <style>
        {`
          @keyframes bed-pulse {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
          }
          @keyframes bed-float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-2px); }
          }
          .bed-anim { animation: bed-float 3s ease-in-out infinite; }
          .bed-pulse-anim { animation: bed-pulse 2s infinite; }
        `}
      </style>
      <g className="bed-anim">
        <rect x="4" y="24" width="40" height="12" rx="3" fill="url(#bed-g)" stroke="#0d9488" strokeWidth="2"/>
        <rect x="8" y="18" width="14" height="8" rx="2" fill="#99f6e4" stroke="#0d9488" strokeWidth="1.5"/>
        <line x1="8" y1="36" x2="8" y2="40" stroke="#0d9488" strokeWidth="2" strokeLinecap="round"/>
        <line x1="40" y1="36" x2="40" y2="40" stroke="#0d9488" strokeWidth="2" strokeLinecap="round"/>
      </g>
      <circle cx="38" cy="10" r="4" fill="none" stroke="#2dd4bf" strokeWidth="1.5" className="bed-pulse-anim" />
      <line x1="38" y1="14" x2="38" y2="22" stroke="#2dd4bf" strokeWidth="1.5" className="bed-pulse-anim" />
    </svg>
  );
}

function TasksSvg() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="tsk-g" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="#f0fdfa"/>
          <stop offset="100%" stopColor="#ccfbf1"/>
        </linearGradient>
      </defs>
      <style>
        {`
          @keyframes tsk-draw {
            to { stroke-dashoffset: 0; }
          }
          .tsk-check { stroke-dasharray: 20; stroke-dashoffset: 20; animation: tsk-draw 1s ease-out forwards 0.5s; }
          .tsk-hover:hover { transform: scale(1.05); transition: transform 0.2s; }
        `}
      </style>
      <g className="tsk-hover" style={{ transformOrigin: 'center' }}>
        <rect x="8" y="4" width="32" height="40" rx="4" fill="url(#tsk-g)" stroke="#0d9488" strokeWidth="2"/>
        <line x1="16" y1="16" x2="32" y2="16" stroke="#0f766e" strokeWidth="2" strokeLinecap="round"/>
        <line x1="16" y1="24" x2="28" y2="24" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
        <line x1="16" y1="32" x2="24" y2="32" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
        <polyline points="32,20 36,24 44,14" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="tsk-check"/>
      </g>
    </svg>
  );
}

function AlertsSvg() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="alt-g" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="#fef3c7"/>
          <stop offset="100%" stopColor="#fde68a"/>
        </linearGradient>
        <filter id="alt-glow">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#f59e0b" floodOpacity="0.3" />
        </filter>
      </defs>
      <style>
        {`
          @keyframes alt-pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
          .alt-anim { animation: alt-pulse 2s infinite; transform-origin: center; }
        `}
      </style>
      <path d="M24 4L4 40h40L24 4z" fill="url(#alt-g)" stroke="#f59e0b" strokeWidth="2" strokeLinejoin="round" filter="url(#alt-glow)"/>
      <line x1="24" y1="16" x2="24" y2="28" stroke="#d97706" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="24" cy="34" r="2.5" fill="#d97706" className="alt-anim"/>
    </svg>
  );
}

function UsersSvg() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="usrs-g1" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="#f0fdfa"/>
          <stop offset="100%" stopColor="#ccfbf1"/>
        </linearGradient>
      </defs>
      <style>
        {`
          @keyframes usrs-slide {
            0%, 100% { transform: translateX(0); }
            50% { transform: translateX(2px); }
          }
          .usrs-anim { animation: usrs-slide 3s ease-in-out infinite; }
        `}
      </style>
      <g className="usrs-anim">
        <circle cx="16" cy="14" r="6" fill="url(#usrs-g1)" stroke="#0d9488" strokeWidth="2"/>
        <path d="M4 38c0-7 5-12 12-12s12 5 12 12" fill="url(#usrs-g1)" stroke="#0d9488" strokeWidth="2" strokeLinecap="round"/>
      </g>
      <circle cx="34" cy="18" r="5" fill="#99f6e4" stroke="#14b8a6" strokeWidth="1.5"/>
      <path d="M44 38c0-5-4-10-8-10" fill="none" stroke="#14b8a6" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function EmptyStateSvg() {
  return (
    <svg width="120" height="90" viewBox="0 0 120 90" fill="none">
      <defs>
        <linearGradient id="es-g" x1="0" y1="0" x2="120" y2="90">
          <stop offset="0%" stopColor="#f8fafc"/>
          <stop offset="100%" stopColor="#f1f5f9"/>
        </linearGradient>
      </defs>
      <style>
        {`
          @keyframes es-float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-4px); }
          }
          .es-anim { animation: es-float 4s ease-in-out infinite; }
        `}
      </style>
      <rect x="20" y="15" width="80" height="60" rx="8" fill="url(#es-g)" stroke="#cbd5e1" strokeWidth="2" className="es-anim"/>
      <circle cx="60" cy="40" r="10" fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 3"/>
      <line x1="45" y1="58" x2="75" y2="58" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" className="es-anim"/>
      <path d="M55 40l4 4 8-8" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ========== Helpers ========== */

function getRoleTitle(role) {
  if (role === "admin") return "Admin Command Center";
  if (role === "doctor") return "Doctor Dashboard";
  return "Nurse Dashboard";
}

function getRoleSubtitle(role) {
  if (role === "admin") return "Full operational overview of your IPD system";
  if (role === "doctor") return "Quick view of your patients and clinical priorities";
  return "Your shift overview and care priorities";
}

const svgMap = {
  "Total Users": <UsersSvg />,
  "Total Patients": <PatientsSvg />,
  "My Patients Pool": <PatientsSvg />,
  "Bed Occupancy": <BedsSvg />,
  "Occupied Beds": <BedsSvg />,
  "Available Beds": <BedsSvg />,
  "Unread Alerts": <AlertsSvg />,
  "Pending Tasks": <TasksSvg />,
  "In Progress": <TasksSvg />,
  "Serious Cases": <AlertsSvg />,
};

/* ========== Component ========== */

export default function Dashboard() {
  const { user } = useAuth();

  const { data: patients = [], isError: patientsError } = useQuery({
    queryKey: ["patients"],
    queryFn: () => api.get("/patients/").then((r) => r.data),
  });
  const { data: beds = [], isError: bedsError } = useQuery({
    queryKey: ["beds"],
    queryFn: () => api.get("/beds/").then((r) => r.data),
  });
  const { data: tasks = [], isError: tasksError } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.get("/tasks/").then((r) => r.data),
  });
  const { data: alerts = [], isError: alertsError } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => api.get("/alerts/?unread_only=true").then((r) => r.data),
  });
  const { data: priorities = [] } = useQuery({
    queryKey: ["rounding-priorities"],
    queryFn: () => api.get("/rounding/priorities?limit=6").then((r) => r.data),
  });
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get("/auth/users").then((r) => r.data),
    enabled: user?.role === "admin",
  });

  const hasError = patientsError || bedsError || tasksError || alertsError;
  const pendingTasks = tasks.filter((t) => t.status === "pending").length;
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress").length;
  const occupiedBeds = beds.filter((b) => b.status === "occupied").length;
  const availableBeds = beds.filter((b) => b.status === "available").length;
  const seriousPatients = patients.filter((p) => p.is_serious);

  const bedOccupancyPct =
    beds.length > 0 ? Math.round((occupiedBeds / beds.length) * 100) : 0;

  const cardsByRole = {
    admin: [
      { label: "Total Users", value: users.length, to: "/users" },
      { label: "Total Patients", value: patients.length, to: "/patients" },
      { label: "Bed Occupancy", value: bedOccupancyPct, suffix: "%", to: "/beds" },
      { label: "Unread Alerts", value: alerts.length, to: "/" },
    ],
    doctor: [
      { label: "My Patients Pool", value: patients.length, to: "/patients" },
      { label: "Serious Cases", value: seriousPatients.length, to: "/patients" },
      { label: "Pending Tasks", value: pendingTasks, to: "/tasks" },
      { label: "Unread Alerts", value: alerts.length, to: "/" },
    ],
    nurse: [
      { label: "Pending Tasks", value: pendingTasks, to: "/tasks" },
      { label: "In Progress", value: inProgressTasks, to: "/tasks" },
      { label: "Available Beds", value: availableBeds, to: "/beds" },
      { label: "Unread Alerts", value: alerts.length, to: "/" },
    ],
  };

  const cards = cardsByRole[user?.role || "nurse"];

  return (
    <div className="page-pad" style={styles.page}>
      {/* Header */}
      <div className="anim-slide-up" style={styles.headerBlock}>
        <h2 style={styles.heading}>{getRoleTitle(user?.role)}</h2>
        <p style={styles.subheading}>{getRoleSubtitle(user?.role)}</p>
      </div>

      {hasError && (
        <div style={styles.errorBanner}>
          Some dashboard data could not be loaded. Please refresh the page.
        </div>
      )}

      {/* Stat cards */}
      <div style={styles.grid}>
        {cards.map((c, idx) => (
          <Link to={c.to} key={c.label} style={{ textDecoration: "none" }}>
            <div className={`anim-slide-up stagger-${idx + 1}`} style={styles.card}>
              <div style={styles.cardSvg}>{svgMap[c.label]}</div>
              <div>
                <div style={styles.cardValue}>
                  {typeof c.value === "number" ? (
                    <AnimatedNumber value={c.value} suffix={c.suffix || ""} />
                  ) : (
                    c.value
                  )}
                </div>
                <div style={styles.cardLabel}>{c.label}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Admin Summary */}
      {user?.role === "admin" && (
        <div className="anim-slide-up stagger-5" style={styles.section}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>Administration Summary</h3>
            <span style={styles.badge}>
              <UsersSvg /> Staff Overview
            </span>
          </div>
          <div style={styles.summaryGrid}>
            {[
              { label: "Admins", val: users.filter((u) => u.role === "admin").length },
              { label: "Doctors", val: users.filter((u) => u.role === "doctor").length },
              { label: "Nurses", val: users.filter((u) => u.role === "nurse").length },
            ].map((s) => (
              <div key={s.label} style={styles.summaryCard}>
                <div style={styles.summaryValue}>
                  <AnimatedNumber value={s.val} />
                </div>
                <div style={styles.summaryLabel}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Doctor: Serious Patients */}
      {user?.role === "doctor" && (
        <div className="anim-slide-up" style={styles.section}>
          <h3 style={styles.sectionTitle}>Serious Patients</h3>
          {seriousPatients.length === 0 ? (
            <div className="empty-state">
              <EmptyStateSvg />
              <p>No serious patients currently.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table style={styles.table}>
                <thead>
                  <tr>
                    {["Name", "Age", "Diagnosis", "Allergies", "Mental Status", ""].map((h) => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {seriousPatients.map((p) => (
                    <tr key={p.id}>
                      <td style={styles.td}>{p.full_name}</td>
                      <td style={styles.td}>{p.age}</td>
                      <td style={styles.td}>{p.diagnosis}</td>
                      <td style={styles.td}>{p.allergies || "-"}</td>
                      <td style={styles.td}>{p.mental_status || "-"}</td>
                      <td style={styles.td}>
                        <Link to={`/patients/${p.id}`} style={styles.link}>View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Smart Rounding Priorities */}
      <div className="anim-slide-up" style={{ ...styles.section, ...styles.prioritySection }}>
        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>
            {user?.role === "nurse" ? "Shift Priorities" : "Smart Rounding Priorities"}
          </h3>
          <span style={styles.badge}>
            <Siren size={14} /> AI-assisted ordering
          </span>
        </div>

        {priorities.length === 0 ? (
          <div className="empty-state">
            <EmptyStateSvg />
            <p>No high-priority patients right now.</p>
          </div>
        ) : (
          priorities.map((p, idx) => (
            <div key={p.patient_id} style={styles.priorityRow}>
              <div style={styles.priorityRank}>{idx + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={styles.priorityName}>{p.patient_name}</div>
                <div style={styles.priorityReasons}>{p.reasons.join(" · ")}</div>
              </div>
              <div style={styles.priorityStats}>
                <span style={styles.scoreChip}>Score {p.score}</span>
                <span style={styles.detailChip}>
                  <Clock3 size={12} /> {p.overdue_tasks} overdue
                </span>
              </div>
              <Link to={`/patients/${p.patient_id}`} style={styles.link}>Open</Link>
            </div>
          ))
        )}
      </div>

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <div className="anim-slide-up" style={styles.section}>
          <h3 style={styles.sectionTitle}>Recent Alerts</h3>
          {alerts.slice(0, 5).map((a) => (
            <div key={a.id} style={styles.alertItem}>
              <span
                style={{
                  ...styles.dot,
                  background: a.severity === "critical" ? "#ef4444" : "#f59e0b",
                }}
              />
              <span style={styles.alertMsg}>{a.message}</span>
              <span style={styles.alertTime}>{new Date(a.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ========== Styles ========== */

const styles = {
  page: {
    padding: "24px 8px 28px",
    maxWidth: "1240px",
    margin: "0 auto",
  },
  headerBlock: {
    marginBottom: 24,
  },
  heading: {
    margin: "0 0 4px",
    fontSize: 24,
    fontWeight: 700,
    color: "#134e4a",
    letterSpacing: "-0.02em",
  },
  subheading: {
    margin: 0,
    fontSize: 14,
    color: "#64748b",
  },
  errorBanner: {
    background: "#fef2f2",
    border: "1px solid #fca5a5",
    borderRadius: 10,
    padding: "10px 16px",
    marginBottom: 16,
    color: "#dc2626",
    fontSize: 14,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },
  card: {
    borderRadius: 14,
    padding: "22px 20px",
    display: "flex",
    alignItems: "center",
    gap: 16,
    background: "rgba(255,255,255,0.85)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(226, 232, 240, 0.7)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    cursor: "pointer",
  },
  cardSvg: {
    flexShrink: 0,
    width: 56,
    height: 56,
    borderRadius: 14,
    background: "linear-gradient(135deg, #f0fdfa, #ccfbf1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cardValue: { fontSize: 28, fontWeight: 700, color: "#0f172a", lineHeight: 1.1 },
  cardLabel: { fontSize: 13, color: "#64748b", marginTop: 4, fontWeight: 500 },
  section: {
    background: "rgba(255,255,255,0.88)",
    backdropFilter: "blur(8px)",
    borderRadius: 14,
    padding: "20px 22px",
    marginBottom: "16px",
    border: "1px solid rgba(226, 232, 240, 0.7)",
    boxShadow: "0 4px 14px rgba(30, 58, 95, 0.06)",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    flexWrap: "wrap",
    gap: 8,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: "#134e4a",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    color: "#64748b",
    background: "#f0fdfa",
    borderRadius: 999,
    padding: "4px 12px",
    border: "1px solid #ccfbf1",
    fontWeight: 600,
  },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    padding: "10px 12px",
    fontSize: 12,
    color: "#64748b",
    borderBottom: "1px solid #e2e8f0",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  td: {
    padding: "12px 12px",
    fontSize: 14,
    color: "#0f172a",
    borderBottom: "1px solid #f1f5f9",
  },
  link: { color: "#0d9488", textDecoration: "none", fontWeight: 600, fontSize: 14 },
  prioritySection: {
    border: "1px solid rgba(204, 251, 241, 0.6)",
  },
  priorityRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    border: "1px solid #f0fdfa",
    borderRadius: 12,
    padding: "12px 14px",
    marginBottom: 10,
    background: "#fafffe",
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
  },
  priorityRank: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #134e4a, #0d9488)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
  },
  priorityName: {
    fontSize: 14,
    fontWeight: 600,
    color: "#0f172a",
  },
  priorityReasons: {
    marginTop: 2,
    fontSize: 12,
    color: "#64748b",
  },
  priorityStats: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  scoreChip: {
    fontSize: 12,
    fontWeight: 700,
    color: "#92400e",
    background: "#fef3c7",
    border: "1px solid #fde68a",
    borderRadius: 999,
    padding: "4px 10px",
  },
  detailChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 12,
    color: "#475569",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 999,
    padding: "4px 10px",
  },
  alertItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 0",
    borderBottom: "1px solid #f1f5f9",
  },
  dot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  alertMsg: { fontSize: 13, color: "#0f172a", flex: 1 },
  alertTime: { fontSize: 12, color: "#94a3b8" },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 12,
  },
  summaryCard: {
    border: "1px solid #ccfbf1",
    borderRadius: 12,
    background: "#f0fdfa",
    padding: "14px 16px",
  },
  summaryValue: {
    fontSize: 26,
    fontWeight: 700,
    color: "#134e4a",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
    fontWeight: 500,
  },
};
