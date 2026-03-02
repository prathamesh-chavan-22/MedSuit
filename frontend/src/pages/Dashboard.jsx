import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Users, Bed, ClipboardList, AlertTriangle } from "lucide-react";
import api from "../api";

export default function Dashboard() {
  const { data: patients = [] } = useQuery({ queryKey: ["patients"], queryFn: () => api.get("/patients/").then(r => r.data) });
  const { data: beds = [] } = useQuery({ queryKey: ["beds"], queryFn: () => api.get("/beds/").then(r => r.data) });
  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: () => api.get("/tasks/").then(r => r.data) });
  const { data: alerts = [] } = useQuery({ queryKey: ["alerts"], queryFn: () => api.get("/alerts/?unread_only=true").then(r => r.data) });

  const cards = [
    { label: "Total Patients", value: patients.length, icon: <Users size={24} color="#3b82f6" />, to: "/patients", bg: "#eff6ff" },
    { label: "Occupied Beds", value: beds.filter(b => b.status === "occupied").length + " / " + beds.length, icon: <Bed size={24} color="#10b981" />, to: "/beds", bg: "#ecfdf5" },
    { label: "Pending Tasks", value: tasks.filter(t => t.status === "pending").length, icon: <ClipboardList size={24} color="#f59e0b" />, to: "/tasks", bg: "#fffbeb" },
    { label: "Unread Alerts", value: alerts.length, icon: <AlertTriangle size={24} color="#ef4444" />, to: "/", bg: "#fef2f2" },
  ];

  const seriousPatients = patients.filter(p => p.is_serious);

  return (
    <div style={styles.page}>
      <h2 style={styles.heading}>Ward Overview</h2>

      {/* Stats grid */}
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

      {/* Serious patients panel */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Serious Patients</h3>
        {seriousPatients.length === 0
          ? <p style={styles.empty}>No serious patients currently.</p>
          : (
            <table style={styles.table}>
              <thead>
                <tr>
                  {["Name", "Age", "Diagnosis", "Allergies", "Mental Status", ""].map(h => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {seriousPatients.map(p => (
                  <tr key={p.id}>
                    <td style={styles.td}>{p.full_name}</td>
                    <td style={styles.td}>{p.age}</td>
                    <td style={styles.td}>{p.diagnosis}</td>
                    <td style={styles.td}>{p.allergies || "—"}</td>
                    <td style={styles.td}>{p.mental_status || "—"}</td>
                    <td style={styles.td}>
                      <Link to={`/patients/${p.id}`} style={styles.link}>View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {/* Recent alerts */}
      {alerts.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Recent Alerts</h3>
          {alerts.slice(0, 5).map(a => (
            <div key={a.id} style={styles.alertItem}>
              <span style={{ ...styles.dot, background: a.severity === "critical" ? "#ef4444" : "#f59e0b" }} />
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
  page: { padding: "28px 32px", maxWidth: 1100 },
  heading: { margin: "0 0 20px", fontSize: 22, fontWeight: 700, color: "#1e3a5f" },
  grid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 },
  card: { borderRadius: 12, padding: "20px 18px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  cardIcon: { flexShrink: 0 },
  cardValue: { fontSize: 26, fontWeight: 700, color: "#111827" },
  cardLabel: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  section: { background: "#fff", borderRadius: 12, padding: "20px 22px", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  sectionTitle: { margin: "0 0 14px", fontSize: 16, fontWeight: 600, color: "#1e3a5f" },
  empty: { color: "#9ca3af", fontSize: 14 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "8px 10px", fontSize: 12, color: "#6b7280", borderBottom: "1px solid #e5e7eb" },
  td: { padding: "10px 10px", fontSize: 14, color: "#111827", borderBottom: "1px solid #f3f4f6" },
  link: { color: "#3b82f6", textDecoration: "none", fontWeight: 500 },
  alertItem: { display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f3f4f6" },
  dot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  alertMsg: { fontSize: 13, color: "#111827", flex: 1 },
  alertTime: { fontSize: 12, color: "#9ca3af" },
};
