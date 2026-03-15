import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { LogOut, Activity } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useIsMobile } from "../hooks/useWindowWidth";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const navLinks = [
    { to: "/", label: "Dashboard", roles: ["admin", "doctor", "nurse"] },
    { to: "/patients", label: "Patients", roles: ["admin", "doctor", "nurse"] },
    { to: "/beds", label: "Beds", roles: ["admin", "doctor", "nurse"] },
    { to: "/tasks", label: "Tasks", roles: ["admin", "doctor", "nurse"] },
    { to: "/users", label: "Users", roles: ["admin"] },
  ].filter((link) => link.roles.includes(user?.role));

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    navigate("/login");
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.brand}>
        <Activity size={22} color="#3b82f6" />
        <span style={styles.brandText}>MedSuite IPD</span>
      </div>

      <div style={isMobile ? { ...styles.links, ...styles.linksMobile } : styles.links}>
        {navLinks.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            style={
              location.pathname === item.to
                ? { ...styles.link, ...styles.linkActive }
                : styles.link
            }
          >
            {item.label}
          </Link>
        ))}
      </div>

      {/* Desktop actions */}
        <div style={styles.actions}>
          {!isMobile && (
            <span style={styles.userLabel}>
              {user?.full_name} ({user?.role})
            </span>
          )}
          <button style={styles.iconBtn} onClick={handleLogout} title="Logout" disabled={isLoggingOut}>
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
  linksMobile: {
    flexWrap: "nowrap",
    overflowX: "auto",
    gap: 10,
    paddingBottom: 2,
    scrollbarWidth: "thin",
  },
  link: {
    textDecoration: "none",
    color: "#374151",
    fontWeight: 600,
    fontSize: 15,
    padding: "8px 10px",
    borderRadius: 8,
    borderBottom: "2px solid transparent",
    transition: "background-color 120ms ease, color 120ms ease, border-color 120ms ease",
  },
  linkActive: {
    color: "#1e3a5f",
    background: "#eaf2fb",
    borderBottom: "2px solid #2563eb",
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
