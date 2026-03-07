import { createContext, useContext, useState, useEffect } from "react";
import api from "../api";

const AuthContext = createContext(null);
const ACCESS_TOKEN_KEY = "token";
const REFRESH_TOKEN_KEY = "refresh_token";
const SESSION_ID_KEY = "session_id";

function clearStoredAuth() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(SESSION_ID_KEY);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) {
      api
        .get("/auth/me")
        .then((res) => setUser(res.data))
        .catch(() => clearStoredAuth())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const form = new URLSearchParams();
    form.append("username", username);
    form.append("password", password);
    const res = await api.post("/auth/login", form);
    localStorage.setItem(ACCESS_TOKEN_KEY, res.data.access_token);
    if (res.data.refresh_token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, res.data.refresh_token);
    }
    if (res.data.session_id) {
      localStorage.setItem(SESSION_ID_KEY, res.data.session_id);
    }
    const meRes = await api.get("/auth/me");
    setUser(meRes.data);
    return meRes.data;
  };

  const logout = async () => {
    const sessionId = localStorage.getItem(SESSION_ID_KEY);
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (sessionId && token) {
      try {
        await api.post("/auth/logout", { session_id: sessionId });
      } catch {
        // Ignore network errors during logout cleanup.
      }
    }
    clearStoredAuth();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
