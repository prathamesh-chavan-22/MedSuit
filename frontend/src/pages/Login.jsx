import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Activity } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      navigate("/");
    } catch {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <Activity size={32} color="#3b82f6" />
          <h1 style={styles.title}>MedSuite IPD</h1>
        </div>
        <p style={styles.subtitle}>Hospital In-Patient Department System</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Email</label>
          <input
            type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input} placeholder="doctor@hospital.com"
          />
          <label style={styles.label}>Password</label>
          <input
            type="password" required value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input} placeholder="••••••••"
          />
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh", display: "flex", alignItems: "center",
    justifyContent: "center", background: "#f0f4f8",
  },
  card: {
    background: "#fff", borderRadius: 12, padding: "40px 36px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.08)", width: "100%", maxWidth: 400,
  },
  logo: { display: "flex", alignItems: "center", gap: 10, marginBottom: 4 },
  title: { margin: 0, fontSize: 22, fontWeight: 700, color: "#1e3a5f" },
  subtitle: { color: "#6b7280", fontSize: 14, marginBottom: 28 },
  form: { display: "flex", flexDirection: "column", gap: 12 },
  label: { fontSize: 13, fontWeight: 500, color: "#374151" },
  input: {
    border: "1px solid #d1d5db", borderRadius: 8, padding: "10px 12px",
    fontSize: 14, outline: "none",
  },
  error: { color: "#ef4444", fontSize: 13, margin: 0 },
  btn: {
    background: "#3b82f6", color: "#fff", border: "none",
    borderRadius: 8, padding: "11px 0", fontSize: 15,
    fontWeight: 600, cursor: "pointer", marginTop: 4,
  },
};
