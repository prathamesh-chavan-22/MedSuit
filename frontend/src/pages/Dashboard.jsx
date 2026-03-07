import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Users,
  Bed,
  ClipboardList,
  AlertTriangle,
  Siren,
  Clock3,
  UserCog,
  Shield,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api";

function getRoleTitle(role) {
  if (role === "admin") return "Admin Command Center";
  if (role === "doctor") return "Doctor Dashboard";
  return "Nurse Dashboard";
}

export default function Dashboard() {
  const { user } = useAuth();

  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: () => api.get("/patients/").then((r) => r.data),
  });
  const { data: beds = [] } = useQuery({
    queryKey: ["beds"],
    queryFn: () => api.get("/beds/").then((r) => r.data),
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.get("/tasks/").then((r) => r.data),
  });
  const { data: alerts = [] } = useQuery({
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

  const pendingTasks = tasks.filter((t) => t.status === "pending").length;
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress").length;
  const occupiedBeds = beds.filter((b) => b.status === "occupied").length;
  const availableBeds = beds.filter((b) => b.status === "available").length;
  const seriousPatients = patients.filter((p) => p.is_serious);

  const cardsByRole = {
    admin: [
      {
        label: "Total Users",
        value: users.length,
        icon: <UserCog size={24} color="#0369a1" />,
        to: "/users",
        bg: "#f0f9ff",
      },
      {
        label: "Total Patients",
        value: patients.length,
        icon: <Users size={24} color="#3b82f6" />,
        to: "/patients",
        bg: "#eff6ff",
      },
      {
        label: "Occupied Beds",
        value: `${occupiedBeds} / ${beds.length}`,
        icon: <Bed size={24} color="#10b981" />,
        to: "/beds",
        bg: "#ecfdf5",
      },
      {
        label: "Unread Alerts",
        value: alerts.length,
        icon: <AlertTriangle size={24} color="#ef4444" />,
        to: "/",
        bg: "#fef2f2",
      },
    ],
    doctor: [
      {
        label: "My Patients Pool",
        value: patients.length,
        icon: <Users size={24} color="#3b82f6" />,
        to: "/patients",
        bg: "#eff6ff",
      },
      {
        label: "Serious Cases",
        value: seriousPatients.length,
        icon: <Siren size={24} color="#dc2626" />,
        to: "/patients",
        bg: "#fef2f2",
      },
      {
        label: "Pending Tasks",
        value: pendingTasks,
        icon: <ClipboardList size={24} color="#f59e0b" />,
        to: "/tasks",
        bg: "#fffbeb",
      },
      {
        label: "Unread Alerts",
        value: alerts.length,
        icon: <AlertTriangle size={24} color="#ef4444" />,
        to: "/",
        bg: "#fef2f2",
      },
    ],
    nurse: [
      {
        label: "Pending Tasks",
        value: pendingTasks,
        icon: <ClipboardList size={24} color="#f59e0b" />,
        to: "/tasks",
        bg: "#fffbeb",
      },
      {
        label: "In Progress",
        value: inProgressTasks,
        icon: <Clock3 size={24} color="#2563eb" />,
        to: "/tasks",
        bg: "#eff6ff",
      },
      {
        label: "Available Beds",
        value: availableBeds,
        icon: <Bed size={24} color="#10b981" />,
        to: "/beds",
        bg: "#ecfdf5",
      },
      {
        label: "Unread Alerts",
        value: alerts.length,
        icon: <AlertTriangle size={24} color="#ef4444" />,
        to: "/",
        bg: "#fef2f2",
      },
    ],
  };

  const cards = cardsByRole[user?.role || "nurse"];

  return (
    <div style={styles.page}>
      <h2 style={styles.heading}>{getRoleTitle(user?.role)}</h2>

      <div style={styles.grid}>
        {cards.map((c) => (
          <Link to={c.to} key={c.label} style={{ textDecoration: "none" }}>
            <div style={{ ...styles.card, background: c.bg }}>
              <div style={styles.cardIcon}>{c.icon}</div>
              <div>
                <div style={styles.cardValue}>{c.value}</div>
                <div style={styles.cardLabel}>{c.label}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {user?.role === "admin" && (
        <div style={styles.section}>
          <div style={styles.priorityHeader}>
            <h3 style={styles.sectionTitle}>Administration Summary</h3>
            <span style={styles.priorityMeta}>
              <Shield size={14} /> Access and operations overview
            </span>
          </div>
          <div style={styles.summaryGrid}>
            <div style={styles.summaryCard}>
              <div style={styles.summaryValue}>{users.filter((u) => u.role === "admin").length}</div>
              <div style={styles.summaryLabel}>Admins</div>
            </div>
            <div style={styles.summaryCard}>
              <div style={styles.summaryValue}>{users.filter((u) => u.role === "doctor").length}</div>
              <div style={styles.summaryLabel}>Doctors</div>
            </div>
            <div style={styles.summaryCard}>
              <div style={styles.summaryValue}>{users.filter((u) => u.role === "nurse").length}</div>
              <div style={styles.summaryLabel}>Nurses</div>
            </div>
          </div>
        </div>
      )}

      {user?.role === "doctor" && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Serious Patients</h3>
          {seriousPatients.length === 0 ? (
            <p style={styles.empty}>No serious patients currently.</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  {["Name", "Age", "Diagnosis", "Allergies", "Mental Status", ""].map((h) => (
                    <th key={h} style={styles.th}>
                      {h}
                    </th>
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
                      <Link to={`/patients/${p.id}`} style={styles.link}>
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div style={{ ...styles.section, ...styles.prioritySection }}>
        <div style={styles.priorityHeader}>
          <h3 style={styles.sectionTitle}>
            {user?.role === "nurse" ? "Shift Priorities" : "Smart Rounding Priorities"}
          </h3>
          <span style={styles.priorityMeta}>
            <Siren size={14} /> AI-assisted ordering
          </span>
        </div>

        {priorities.length === 0 ? (
          <p style={styles.empty}>No high-priority patients right now.</p>
        ) : (
          priorities.map((p, idx) => (
            <div key={p.patient_id} style={styles.priorityRow}>
              <div style={styles.priorityRank}>{idx + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={styles.priorityName}>{p.patient_name}</div>
                <div style={styles.priorityReasons}>{p.reasons.join(" | ")}</div>
              </div>
              <div style={styles.priorityStats}>
                <span style={styles.scoreChip}>Score {p.score}</span>
                <span style={styles.detailChip}>
                  <Clock3 size={12} /> {p.overdue_tasks} overdue
                </span>
              </div>
              <Link to={`/patients/${p.patient_id}`} style={styles.link}>
                Open
              </Link>
            </div>
          ))
        )}
      </div>

      {alerts.length > 0 && (
        <div style={styles.section}>
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

const styles = {
  page: {
    padding: "28px 32px",
    maxWidth: 1100,
    margin: "0 auto",
    background:
      "radial-gradient(circle at 10% 10%, rgba(59,130,246,0.08), transparent 32%), radial-gradient(circle at 90% 0%, rgba(245,158,11,0.08), transparent 28%)",
  },
  heading: {
    margin: "0 0 20px",
    fontSize: 22,
    fontWeight: 700,
    color: "#1e3a5f",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 16,
    marginBottom: 28,
  },
  card: {
    borderRadius: 12,
    padding: "20px 18px",
    display: "flex",
    alignItems: "center",
    gap: 14,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  cardIcon: { flexShrink: 0 },
  cardValue: { fontSize: 26, fontWeight: 700, color: "#111827" },
  cardLabel: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  section: {
    background: "#fff",
    borderRadius: 12,
    padding: "20px 22px",
    marginBottom: 20,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  sectionTitle: {
    margin: "0 0 14px",
    fontSize: 16,
    fontWeight: 600,
    color: "#1e3a5f",
  },
  empty: { color: "#9ca3af", fontSize: 14 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    padding: "8px 10px",
    fontSize: 12,
    color: "#6b7280",
    borderBottom: "1px solid #e5e7eb",
  },
  td: {
    padding: "10px 10px",
    fontSize: 14,
    color: "#111827",
    borderBottom: "1px solid #f3f4f6",
  },
  link: { color: "#3b82f6", textDecoration: "none", fontWeight: 500 },
  alertItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 0",
    borderBottom: "1px solid #f3f4f6",
  },
  dot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  alertMsg: { fontSize: 13, color: "#111827", flex: 1 },
  alertTime: { fontSize: 12, color: "#9ca3af" },
  prioritySection: {
    border: "1px solid #e5e7eb",
  },
  priorityHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  priorityMeta: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    color: "#6b7280",
    background: "#f3f4f6",
    borderRadius: 999,
    padding: "4px 10px",
  },
  priorityRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    border: "1px solid #eef2f7",
    borderRadius: 10,
    padding: "10px 12px",
    marginBottom: 10,
    background: "#fcfdff",
  },
  priorityRank: {
    width: 26,
    height: 26,
    borderRadius: "50%",
    background: "#1f2937",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
  },
  priorityName: {
    fontSize: 14,
    fontWeight: 600,
    color: "#111827",
  },
  priorityReasons: {
    marginTop: 2,
    fontSize: 12,
    color: "#6b7280",
  },
  priorityStats: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  scoreChip: {
    fontSize: 12,
    fontWeight: 700,
    color: "#b45309",
    background: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: 999,
    padding: "4px 8px",
  },
  detailChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 12,
    color: "#374151",
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: 999,
    padding: "4px 8px",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 12,
  },
  summaryCard: {
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    background: "#f8fafc",
    padding: "10px 12px",
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 700,
    color: "#0f172a",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#64748b",
  },
};
