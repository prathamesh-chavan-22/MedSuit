import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { LogOut, Sun, Moon } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useIsMobile } from "../hooks/useWindowWidth";

/* Custom SVG logo matching the login page */
function MedSuiteLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
      <defs>
        <linearGradient id="navLogoGrad" x1="0" y1="0" x2="40" y2="40">
          <stop stopColor="#0d9488" />
          <stop offset="1" stopColor="#2dd4bf" />
        </linearGradient>
      </defs>
      <style>
        {`
          .logo-cross { transform-origin: center; transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
          svg:hover .logo-cross { transform: rotate(90deg); }
        `}
      </style>
      <rect width="40" height="40" rx="12" fill="url(#navLogoGrad)" />
      <g className="logo-cross">
        <path d="M20 10v20M10 20h20" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
      </g>
      <path d="M14 14l12 12M26 14L14 26" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isDark = theme === "dark";

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

  const navStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: 70,
    zIndex: 100,
    background: isDark
      ? "rgba(11, 15, 25, 0.82)"
      : "rgba(255, 255, 255, 0.88)",
    backdropFilter: "blur(20px) saturate(1.8)",
    WebkitBackdropFilter: "blur(20px) saturate(1.8)",
    borderBottom: isDark
      ? "1px solid rgba(255, 255, 255, 0.08)"
      : "1px solid rgba(226, 232, 240, 0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 max(12px, calc((100vw - 1220px) / 2))",
    gap: 16,
    boxShadow: isDark
      ? "0 1px 30px rgba(0, 240, 255, 0.04)"
      : "0 1px 3px rgba(0,0,0,0.04)",
    transition: "all 0.4s ease",
  };

  const brandTextStyle = {
    fontWeight: 700,
    fontSize: 18,
    color: isDark ? "#e0f7fa" : "#134e4a",
    letterSpacing: "-0.02em",
    transition: "color 0.3s ease",
  };

  const linkStyle = {
    position: "relative",
    textDecoration: "none",
    color: isDark ? "rgba(255,255,255,0.55)" : "#64748b",
    fontWeight: 600,
    fontSize: 14,
    padding: "8px 14px",
    borderRadius: 10,
    transition: "all 0.18s ease",
    display: "flex",
    alignItems: "center",
    gap: 6,
  };

  const linkActiveStyle = {
    color: isDark ? "#00f0ff" : "#0d9488",
    background: isDark ? "rgba(0, 240, 255, 0.08)" : "rgba(13, 148, 136, 0.08)",
    textShadow: isDark ? "0 0 12px rgba(0, 240, 255, 0.5)" : "none",
  };

  const activeDotStyle = {
    width: 5,
    height: 5,
    borderRadius: "50%",
    background: isDark ? "#00f0ff" : "#0d9488",
    display: "inline-block",
    boxShadow: isDark ? "0 0 6px #00f0ff" : "none",
  };

  const iconBtnStyle = {
    background: "none",
    border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e2e8f0",
    cursor: "pointer",
    padding: 8,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    color: isDark ? "rgba(255,255,255,0.6)" : "#64748b",
    transition: "all 0.2s ease",
  };

  const themeBtnStyle = {
    ...iconBtnStyle,
    color: isDark ? "#00f0ff" : "#f59e0b",
    borderColor: isDark ? "rgba(0, 240, 255, 0.25)" : "rgba(245, 158, 11, 0.3)",
    boxShadow: isDark ? "0 0 10px rgba(0, 240, 255, 0.12)" : "none",
  };

  const userLabelStyle = {
    fontSize: 13,
    color: isDark ? "rgba(255,255,255,0.55)" : "#475569",
    display: "flex",
    alignItems: "center",
    gap: 8,
    transition: "color 0.3s ease",
  };

  const roleBadgeStyle = {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: isDark ? "#00f0ff" : "#0d9488",
    background: isDark ? "rgba(0, 240, 255, 0.1)" : "rgba(13, 148, 136, 0.08)",
    borderRadius: 6,
    padding: "2px 8px",
    border: isDark ? "1px solid rgba(0, 240, 255, 0.2)" : "none",
    boxShadow: isDark ? "0 0 8px rgba(0,240,255,0.1)" : "none",
    transition: "all 0.3s ease",
  };

  return (
    <nav style={navStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <MedSuiteLogo />
        <span style={brandTextStyle}>MedSuite IPD</span>
      </div>

      <div style={{ display: "flex", gap: isMobile ? 4 : 6, flexWrap: isMobile ? "nowrap" : "wrap", overflowX: isMobile ? "auto" : "unset" }}>
        {navLinks.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              style={isActive ? { ...linkStyle, ...linkActiveStyle } : linkStyle}
            >
              {item.label}
              {isActive && <span style={activeDotStyle} />}
            </Link>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {!isMobile && (
          <span style={userLabelStyle}>
            {user?.full_name}
            <span style={roleBadgeStyle}>{user?.role}</span>
          </span>
        )}

        {/* Wellness Mode Toggle */}
        <button
          style={themeBtnStyle}
          onClick={toggleTheme}
          title={isDark ? "Switch to Light Mode" : "Wellness Mode: Optimized for night shifts"}
          aria-label="Toggle theme"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button style={iconBtnStyle} onClick={handleLogout} title="Logout" disabled={isLoggingOut}>
          <LogOut size={18} />
        </button>
      </div>
    </nav>
  );
}
