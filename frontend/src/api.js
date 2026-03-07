import axios from "axios";

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const apiBaseUrl = rawApiBaseUrl.replace(/\/$/, "");

const ACCESS_TOKEN_KEY = "token";
const REFRESH_TOKEN_KEY = "refresh_token";
const SESSION_ID_KEY = "session_id";

function clearSessionStorage() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(SESSION_ID_KEY);
}

const api = axios.create({
  baseURL: apiBaseUrl,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, try refresh once before forcing sign-out.
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config || {};
    const isAuthRoute =
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/refresh");

    if (err.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (refreshToken) {
        originalRequest._retry = true;
        try {
          const refreshRes = await axios.post(`${apiBaseUrl}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          localStorage.setItem(ACCESS_TOKEN_KEY, refreshRes.data.access_token);
          localStorage.setItem(REFRESH_TOKEN_KEY, refreshRes.data.refresh_token);
          if (refreshRes.data.session_id) {
            localStorage.setItem(SESSION_ID_KEY, refreshRes.data.session_id);
          }
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${refreshRes.data.access_token}`;
          return api(originalRequest);
        } catch {
          clearSessionStorage();
          window.location.href = "/login";
          return Promise.reject(err);
        }
      }
    }

    if (err.response?.status === 401) {
      clearSessionStorage();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;
