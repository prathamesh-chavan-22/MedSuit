import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, LogOut, Activity } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const wsRef = useRef(null);

  // WebSocket for real-time alerts
  useEffect(() => {
    const token = localStorage.getItem("token");
    const ws = new WebSocket(`ws://localhost:8000/alerts/ws?token=${token}`);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      const alert = JSON.parse(e.data);
      setAlerts((prev) => [alert, ...prev].slice(0, 20));
    };

    return () => ws.close();
  }, []);

  // Load existing unread alerts on mount
  useEffect(() => {
    api.get("/alerts/?unread_only=true").then((res) => setAlerts(res.data));
  }, []);

  const unreadCount = alerts.filter((a) => !a.is_read).length;

  const markRead = async (id) => {
    await api.patch(`/alerts/${id}/read`);
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, is_read: true } : a)));
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.brand}>
        <Activity size={22} color="#3b82f6" />
        <span style={styles.brandText}>MedSuite IPD</span>
      </div>

      <div style={styles.links}>
        <Link to="/" style={styles.link}>Dashboard</Link>
        <Link to="/patients" style={styles.link}>Patients</Link>
        <Link to="/beds" style={styles.link}>Beds</Link>
        <Link to="/tasks" style={styles.link}>Tasks</Link>
      </div>

      <div style={styles.actions}>
        {/* Alert bell */}
        <div style={{ position: "relative" }}>
          <button style={styles.iconBtn} onClick={() => setShowAlerts(!showAlerts)}>
            <Bell size={20} />
            {unreadCount > 0 && (
              <span style={styles.badge}>{unreadCount}</span>
            )}
          </button>

          {showAlerts && (
            <div style={styles.alertDropdown}>
              <div style={styles.alertHeader}>Alerts</div>
              {alerts.length === 0 && (
                <div style={styles.alertEmpty}>No new alerts</div>
              )}
              {alerts.slice(0, 10).map((a) => (
                <div
                  key={a.id}
                  style={{
                    ...styles.alertItem,
                    background: a.is_read ? "#f9fafb" : "#eff6ff",
                  }}
                  onClick={() => markRead(a.id)}
                >
                  <span
                    style={{
                      ...styles.severityDot,
                      background:
                        a.severity === "critical" ? "#ef4444"
                          : a.severity === "warning" ? "#f59e0b"
                          : "#3b82f6",
                    }}
                  />
                  <div>
                    <div style={styles.alertMsg}>{a.message}</div>
                    <div style={styles.alertTime}>
                      {new Date(a.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <span style={styles.userLabel}>
          {user?.full_name} ({user?.role})
        </span>
        <button style={styles.iconBtn} onClick={handleLogout} title="Logout">
          <LogOut size={18} />
        </button>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    position: "fixed", top: 0, left: 0, right: 0, height: 64, zIndex: 100,
    background: "#fff", borderBottom: "1px solid #e5e7eb",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0 24px", gap: 16,
  },
  brand: { display: "flex", alignItems: "center", gap: 8 },
  brandText: { fontWeight: 700, fontSize: 18, color: "#1e3a5f" },
  links: { display: "flex", gap: 24 },
  link: { textDecoration: "none", color: "#374151", fontWeight: 500, fontSize: 15 },
  actions: { display: "flex", alignItems: "center", gap: 12 },
  iconBtn: {
    background: "none", border: "none", cursor: "pointer",
    position: "relative", padding: 6, borderRadius: 8,
    display: "flex", alignItems: "center",
  },
  badge: {
    position: "absolute", top: -2, right: -2,
    background: "#ef4444", color: "#fff", borderRadius: "50%",
    fontSize: 10, width: 16, height: 16,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  userLabel: { fontSize: 13, color: "#6b7280" },
  alertDropdown: {
    position: "absolute", top: 40, right: 0, width: 320,
    background: "#fff", border: "1px solid #e5e7eb",
    borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    zIndex: 200, maxHeight: 400, overflowY: "auto",
  },
  alertHeader: {
    padding: "10px 14px", fontWeight: 600, fontSize: 14,
    borderBottom: "1px solid #e5e7eb",
  },
  alertEmpty: { padding: "12px 14px", color: "#9ca3af", fontSize: 13 },
  alertItem: {
    display: "flex", alignItems: "flex-start", gap: 10,
    padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #f3f4f6",
  },
  severityDot: { width: 8, height: 8, borderRadius: "50%", marginTop: 4, flexShrink: 0 },
  alertMsg: { fontSize: 13, color: "#111827" },
  alertTime: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
};
