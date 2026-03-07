import axios from "axios";

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const apiBaseUrl = rawApiBaseUrl.replace(/\/$/, "");

const api = axios.create({
  baseURL: apiBaseUrl,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, clear token and redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;
