import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Bell, LogOut, Activity, Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useIsMobile } from "../hooks/useWindowWidth";
import api from "../api";

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const apiBaseUrl = rawApiBaseUrl.replace(/\/$/, "");
const wsBaseUrl =
  (import.meta.env.VITE_WS_BASE_URL ||
    apiBaseUrl.replace("https://", "wss://").replace("http://", "ws://")).replace(/\/$/, "");

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const wsRef = useRef(null);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // WebSocket for real-time alerts
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return undefined;

    let ws;
    let retryTimeout;
    let isCancelled = false;

    const connect = () => {
      if (isCancelled) return;
      ws = new WebSocket(`${wsBaseUrl}/alerts/ws?token=${token}`);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        const alert = JSON.parse(e.data);
        setAlerts((prev) => [alert, ...prev].slice(0, 20));
      };

      ws.onerror = () => {
        ws.close();
      };

      ws.onclose = () => {
        if (!isCancelled) {
          retryTimeout = setTimeout(connect, 5000);
        }
      };
    };

    connect();

    return () => {
      isCancelled = true;
      clearTimeout(retryTimeout);
      if (ws) ws.close();
    };
  }, []);

  // Load existing unread alerts on mount
  useEffect(() => {
    api.get("/alerts/?unread_only=true")
      .then((res) => setAlerts(res.data))
      .catch(() => {});
  }, []);

  const unreadCount = alerts.filter((a) => !a.is_read).length;

  const navLinks = [
    { to: "/", label: "Dashboard", roles: ["admin", "doctor", "nurse"] },
    { to: "/patients", label: "Patients", roles: ["admin", "doctor", "nurse"] },
    { to: "/beds", label: "Beds", roles: ["admin", "doctor", "nurse"] },
    { to: "/tasks", label: "Tasks", roles: ["admin", "doctor", "nurse"] },
    { to: "/users", label: "Users", roles: ["admin"] },
  ].filter((link) => link.roles.includes(user?.role));

  const markRead = async (id) => {
    await api.patch(`/alerts/${id}/read`);
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, is_read: true } : a)),
    );
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.brand}>
        <Activity size={22} color="#3b82f6" />
        <span style={styles.brandText}>MedSuite IPD</span>
      </div>

      <button className="nav-hamburger" onClick={() => setMenuOpen(m => !m)}>
        {menuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      <div
        className={
          isMobile ? (menuOpen ? "nav-mobile-open" : "nav-links-mobile-hidden") : ""
        }
        style={isMobile && menuOpen ? { ...styles.links, flexDirection: "column", gap: 0 } : styles.links}
      >
        {navLinks.map((item) => (
          <Link key={item.to} to={item.to} style={styles.link}>
            {item.label}
          </Link>
        ))}

        {/* Mobile actions menu */}
        {isMobile && menuOpen && (
          <div
            style={{
              borderTop: "1px solid #dbe3ee",
              paddingTop: 12,
              marginTop: 12,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            {/* Alert bell */}
            <div style={{ position: "relative" }}>
              <button
                style={styles.iconBtn}
                onClick={() => setShowAlerts(!showAlerts)}
              >
                <Bell size={20} />
                {unreadCount > 0 && <span style={styles.badge}>{unreadCount}</span>}
              </button>

              {showAlerts && (
                <div className="alert-dropdown-mobile" style={styles.alertDropdown}>
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
                            a.severity === "critical"
                              ? "#ef4444"
                              : a.severity === "warning"
                                ? "#f59e0b"
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
        )}
      </div>

      {/* Desktop actions */}
      <div
        className="nav-actions-mobile-hidden"
        style={styles.actions}
      >
        {/* Alert bell */}
        <div style={{ position: "relative" }}>
          <button
            style={styles.iconBtn}
            onClick={() => setShowAlerts(!showAlerts)}
          >
            <Bell size={20} />
            {unreadCount > 0 && <span style={styles.badge}>{unreadCount}</span>}
          </button>

          {showAlerts && (
            <div className="alert-dropdown-mobile" style={styles.alertDropdown}>
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
                        a.severity === "critical"
                          ? "#ef4444"
                          : a.severity === "warning"
                            ? "#f59e0b"
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
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: 70,
    zIndex: 100,
    background: "rgba(255, 255, 255, 0.92)",
    backdropFilter: "blur(8px)",
    borderBottom: "1px solid #dbe3ee",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 max(12px, calc((100vw - 1220px) / 2))",
    gap: 16,
  },
  brand: { display: "flex", alignItems: "center", gap: 8 },
  brandText: { fontWeight: 700, fontSize: 18, color: "#1e3a5f" },
  links: { display: "flex", gap: 20, flexWrap: "wrap" },
  link: {
    textDecoration: "none",
    color: "#374151",
    fontWeight: 500,
    fontSize: 15,
  },
  actions: { display: "flex", alignItems: "center", gap: 12 },
  iconBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    position: "relative",
    padding: 6,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    background: "#ef4444",
    color: "#fff",
    borderRadius: "50%",
    fontSize: 10,
    width: 16,
    height: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  userLabel: { fontSize: 13, color: "#6b7280" },
  alertDropdown: {
    position: "absolute",
    top: 40,
    right: 0,
    width: 320,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    zIndex: 200,
    maxHeight: 400,
    overflowY: "auto",
  },
  alertHeader: {
    padding: "10px 14px",
    fontWeight: 600,
    fontSize: 14,
    borderBottom: "1px solid #e5e7eb",
  },
  alertEmpty: { padding: "12px 14px", color: "#9ca3af", fontSize: 13 },
  alertItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: "10px 14px",
    cursor: "pointer",
    borderBottom: "1px solid #f3f4f6",
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    marginTop: 4,
    flexShrink: 0,
  },
  alertMsg: { fontSize: 13, color: "#111827" },
  alertTime: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
};
