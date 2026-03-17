import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useIsMobile } from "../hooks/useWindowWidth";

/* Custom SVG logo matching the login page */
function MedSuiteLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="12" fill="url(#navLogoGrad)" />
      <path d="M20 10v20M10 20h20" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M14 14l12 12M26 14L14 26" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      <defs>
        <linearGradient id="navLogoGrad" x1="0" y1="0" x2="40" y2="40">
          <stop stopColor="#0d9488" />
          <stop offset="1" stopColor="#2dd4bf" />
        </linearGradient>
      </defs>
    </svg>
  );
}

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
        <MedSuiteLogo />
        <span style={styles.brandText}>MedSuite IPD</span>
      </div>

      <div style={isMobile ? { ...styles.links, ...styles.linksMobile } : styles.links}>
        {navLinks.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              style={isActive ? { ...styles.link, ...styles.linkActive } : styles.link}
            >
              {item.label}
              {isActive && <span style={styles.activeDot} />}
            </Link>
          );
        })}
      </div>

      <div style={styles.actions}>
        {!isMobile && (
          <span style={styles.userLabel}>
            {user?.full_name}
            <span style={styles.roleBadge}>{user?.role}</span>
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
    background: "rgba(255, 255, 255, 0.88)",
    backdropFilter: "blur(14px) saturate(1.5)",
    WebkitBackdropFilter: "blur(14px) saturate(1.5)",
    borderBottom: "1px solid rgba(226, 232, 240, 0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 max(12px, calc((100vw - 1220px) / 2))",
    gap: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  brand: { display: "flex", alignItems: "center", gap: 10 },
  brandText: {
    fontWeight: 700,
    fontSize: 18,
    color: "#134e4a",
    letterSpacing: "-0.02em",
  },
  links: { display: "flex", gap: 6, flexWrap: "wrap" },
  linksMobile: {
    flexWrap: "nowrap",
    overflowX: "auto",
    gap: 4,
    paddingBottom: 2,
    scrollbarWidth: "thin",
  },
  link: {
    position: "relative",
    textDecoration: "none",
    color: "#64748b",
    fontWeight: 600,
    fontSize: 14,
    padding: "8px 14px",
    borderRadius: 10,
    transition: "all 0.18s ease",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  linkActive: {
    color: "#0d9488",
    background: "rgba(13, 148, 136, 0.08)",
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: "50%",
    background: "#0d9488",
    display: "inline-block",
  },
  actions: { display: "flex", alignItems: "center", gap: 12 },
  iconBtn: {
    background: "none",
    border: "1px solid #e2e8f0",
    cursor: "pointer",
    padding: 8,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    color: "#64748b",
    transition: "all 0.15s ease",
  },
  userLabel: {
    fontSize: 13,
    color: "#475569",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  roleBadge: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: "#0d9488",
    background: "rgba(13, 148, 136, 0.08)",
    borderRadius: 6,
    padding: "2px 8px",
  },
};
