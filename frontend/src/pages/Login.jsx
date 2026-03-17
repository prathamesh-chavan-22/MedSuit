import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/* ---------- inline SVG components ---------- */

function MedicalLogo() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="40" y2="40">
          <stop stopColor="#0d9488" />
          <stop offset="1" stopColor="#2dd4bf" />
        </linearGradient>
        <filter id="logoGlow">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#0d9488" floodOpacity="0.4" />
        </filter>
      </defs>
      <style>
        {`
          @keyframes logo-pulse {
            0%, 100% { transform: scale(1); filter: url(#logoGlow); }
            50% { transform: scale(1.05); filter: drop-shadow(0 6px 10px rgba(13,148,136,0.6)); }
          }
          .login-logo { animation: logo-pulse 3s ease-in-out infinite; transform-origin: center; }
        `}
      </style>
      <rect className="login-logo" width="40" height="40" rx="12" fill="url(#logoGrad)" />
      <g className="login-logo">
        <path d="M20 10v20M10 20h20" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
      </g>
      <path d="M14 14l12 12M26 14L14 26" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

function BackgroundPattern() {
  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.045, pointerEvents: "none" }}
      viewBox="0 0 800 600"
      preserveAspectRatio="xMidYMid slice"
    >
      <style>
        {`
          @keyframes dash-draw-bg {
            to { stroke-dashoffset: 0; }
          }
          @keyframes float-bg {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          .bg-float-1 { animation: float-bg 6s ease-in-out infinite; }
          .bg-float-2 { animation: float-bg 8s ease-in-out infinite 1s; }
          .bg-float-3 { animation: float-bg 5s ease-in-out infinite 2s; }
        `}
      </style>
      {/* Heartbeat / ECG line */}
      <polyline
        points="0,300 120,300 140,300 160,250 180,360 200,280 220,300 800,300"
        fill="none"
        stroke="#0d9488"
        strokeWidth="2"
        strokeDasharray="1200"
        strokeDashoffset="1200"
        style={{ animation: "dash-draw-bg 3s ease-out forwards" }}
      />
      {/* Cross markers */}
      {[{x:100,y:120, c:"bg-float-1"},{x:650,y:100, c:"bg-float-2"},{x:400,y:480, c:"bg-float-3"},{x:700,y:420, c:"bg-float-1"},{x:180,y:500, c:"bg-float-2"},{x:520,y:160, c:"bg-float-3"}].map((p,i) => (
        <g key={i} transform={`translate(${p.x},${p.y})`} opacity="0.5" className={p.c}>
          <line x1="-10" y1="0" x2="10" y2="0" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" />
          <line x1="0" y1="-10" x2="0" y2="10" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" />
        </g>
      ))}
      {/* Circles / atoms */}
      {[{x:300,y:80,r:40, c:"bg-float-2"},{x:600,y:500,r:55, c:"bg-float-3"},{x:80,y:400,r:30, c:"bg-float-1"}].map((c,i) => (
        <circle key={i} cx={c.x} cy={c.y} r={c.r} fill="none" stroke="#0d9488" strokeWidth="1" strokeDasharray="6 4" className={c.c} />
      ))}
      {/* DNA helix hint */}
      <path d="M720 0 Q740 100 720 200 Q700 300 720 400 Q740 500 720 600" fill="none" stroke="#0d9488" strokeWidth="1.5" strokeDasharray="8 6" className="bg-float-1" />
      <path d="M740 0 Q720 100 740 200 Q760 300 740 400 Q720 500 740 600" fill="none" stroke="#0d9488" strokeWidth="1.5" strokeDasharray="8 6" className="bg-float-2" />
    </svg>
  );
}

/* ---------- component ---------- */

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(username, password);
      navigate("/");
    } catch {
      setError("Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <BackgroundPattern />

      {/* floating decorative blobs */}
      <div style={styles.blobTopRight} />
      <div style={styles.blobBottomLeft} />

      <div style={styles.card} className="anim-fade-scale">
        <div style={styles.logo}>
          <MedicalLogo />
          <div>
            <h1 style={styles.title}>MedSuite IPD</h1>
            <p style={styles.subtitle}>Hospital In-Patient Department</p>
          </div>
        </div>

        <div style={styles.divider} />

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              placeholder="e.g. rushil.dhube"
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="••••••••"
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p style={styles.footer}>Secure clinical-grade access</p>
      </div>
    </div>
  );
}

/* ---------- styles ---------- */

const styles = {
  container: {
    position: "relative",
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    overflow: "hidden",
    background: "linear-gradient(145deg, #e8f5f3 0%, #eef3f9 40%, #f1f5f9 100%)",
  },
  blobTopRight: {
    position: "absolute",
    top: "-10%",
    right: "-8%",
    width: 420,
    height: 420,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(13,148,136,0.12), transparent 70%)",
    filter: "blur(60px)",
    pointerEvents: "none",
    animation: "float 6s ease-in-out infinite",
  },
  blobBottomLeft: {
    position: "absolute",
    bottom: "-12%",
    left: "-6%",
    width: 360,
    height: 360,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(45,212,191,0.10), transparent 70%)",
    filter: "blur(50px)",
    pointerEvents: "none",
    animation: "float 7s ease-in-out infinite 1s",
  },
  card: {
    position: "relative",
    zIndex: 2,
    background: "rgba(255,255,255,0.82)",
    backdropFilter: "blur(20px) saturate(1.6)",
    WebkitBackdropFilter: "blur(20px) saturate(1.6)",
    border: "1px solid rgba(255,255,255,0.55)",
    borderRadius: 20,
    padding: "44px 38px 36px",
    boxShadow:
      "0 20px 60px -12px rgba(13,148,136,0.12), 0 4px 16px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.6)",
    width: "100%",
    maxWidth: 420,
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    marginBottom: 4,
  },
  title: {
    margin: 0,
    fontSize: 24,
    fontWeight: 700,
    color: "#134e4a",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    margin: "2px 0 0",
    color: "#64748b",
    fontSize: 13,
  },
  divider: {
    height: 1,
    background: "linear-gradient(90deg, transparent, #d1d5db, transparent)",
    margin: "22px 0 26px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: "#475569",
  },
  input: {
    border: "1px solid #d1d5db",
    borderRadius: 10,
    padding: "11px 14px",
    fontSize: 14,
    outline: "none",
    background: "rgba(255,255,255,0.7)",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  error: {
    color: "#ef4444",
    fontSize: 13,
    margin: 0,
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 8,
    padding: "8px 12px",
  },
  btn: {
    background: "linear-gradient(135deg, #0d9488, #14b8a6)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "12px 0",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 4,
    transition: "transform 0.15s, box-shadow 0.15s",
    boxShadow: "0 4px 14px rgba(13,148,136,0.25)",
  },
  footer: {
    textAlign: "center",
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 20,
    marginBottom: 0,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
};
