import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api";

const ROLE_OPTIONS = ["admin", "doctor", "nurse"];

function UsersSvg() {
  return (
    <svg width="120" height="80" viewBox="0 0 120 80" fill="none" style={{ opacity: 0.5 }}>
      <circle cx="40" cy="28" r="10" fill="#ccfbf1" stroke="#0d9488" strokeWidth="2" />
      <path d="M22 66c0-10 8-18 18-18s18 8 18 18" fill="#ccfbf1" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" />
      <circle cx="75" cy="30" r="8" fill="#99f6e4" stroke="#0d9488" strokeWidth="1.5" />
      <path d="M61 62c0-8 6-14 14-14s14 6 14 14" fill="#99f6e4" stroke="#0d9488" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="100" cy="34" r="5" fill="#f0fdfa" stroke="#0d9488" strokeWidth="1" strokeDasharray="3 2" />
    </svg>
  );
}

export default function Users() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get("/auth/users").then((r) => r.data),
    enabled: user?.role === "admin",
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => api.patch(`/auth/users/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.username.localeCompare(b.username)),
    [users],
  );

  if (user?.role !== "admin") {
    return (
      <div className="page-pad" style={styles.page}>
        <div style={styles.denied}>Only admin users can manage accounts.</div>
      </div>
    );
  }

  return (
    <div className="page-pad" style={styles.page}>
      <div className="anim-slide-up" style={styles.header}>
        <div>
          <h2 style={styles.heading}>User Management</h2>
          <p style={styles.subText}>Manage roles, access, and staff accounts</p>
        </div>
        <div style={styles.badge}>
          <ShieldCheck size={14} /> Admin Controls
        </div>
      </div>

      <div className="anim-fade-scale" style={styles.card}>
        {isLoading ? (
          <div className="empty-state">
            <UsersSvg />
            <p>Loading users...</p>
          </div>
        ) : sortedUsers.length === 0 ? (
          <div className="empty-state">
            <UsersSvg />
            <p>No users found.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Username</th>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Role</th>
                  <th style={styles.th}>Active</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((row) => {
                  const loading = updateMut.isPending && updateMut.variables?.id === row.id;
                  return (
                    <tr key={row.id}>
                      <td style={styles.td}>
                        <span style={styles.usernameBadge}>{row.username}</span>
                      </td>
                      <td style={styles.td}>{row.full_name}</td>
                      <td style={styles.td}>{row.email}</td>
                      <td style={styles.td}>
                        <select
                          style={styles.select}
                          value={row.role}
                          disabled={loading}
                          onChange={(e) =>
                            updateMut.mutate({
                              id: row.id,
                              payload: { role: e.target.value },
                            })
                          }
                        >
                          {ROLE_OPTIONS.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={styles.td}>
                        <label style={styles.toggleLabel}>
                          <input
                            type="checkbox"
                            checked={row.is_active}
                            disabled={loading}
                            onChange={(e) =>
                              updateMut.mutate({
                                id: row.id,
                                payload: { is_active: e.target.checked },
                              })
                            }
                          />
                          <span style={{ color: row.is_active ? "#10b981" : "#94a3b8" }}>
                            {row.is_active ? "Enabled" : "Disabled"}
                          </span>
                        </label>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {updateMut.isError && (
        <div style={styles.error}>
          {updateMut.error?.response?.data?.detail || "Failed to update user."}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { padding: "24px 8px 28px", maxWidth: "1240px", margin: "0 auto" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    flexWrap: "wrap",
    gap: 12,
  },
  heading: { margin: 0, fontSize: 24, fontWeight: 700, color: "#134e4a", letterSpacing: "-0.02em" },
  subText: { margin: "4px 0 0", fontSize: 13, color: "#64748b" },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    color: "#0d9488",
    border: "1px solid #ccfbf1",
    background: "#f0fdfa",
    borderRadius: 999,
    padding: "6px 12px",
    fontWeight: 600,
  },
  card: {
    background: "rgba(255,255,255,0.9)",
    backdropFilter: "blur(10px)",
    borderRadius: 14,
    padding: "16px 18px",
    border: "1px solid rgba(226,232,240,0.7)",
    boxShadow: "0 4px 14px rgba(30, 58, 95, 0.06)",
    overflowX: "auto",
  },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    fontSize: 11,
    color: "#64748b",
    padding: "12px",
    borderBottom: "1px solid #e2e8f0",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  td: {
    padding: "12px",
    fontSize: 14,
    color: "#0f172a",
    borderBottom: "1px solid #f1f5f9",
    transition: "background 0.12s",
  },
  select: {
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: "8px 10px",
    fontSize: 13,
    background: "rgba(255,255,255,0.7)",
    outline: "none",
    transition: "border-color 0.2s",
  },
  toggleLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    fontWeight: 500,
  },
  usernameBadge: {
    background: "#f0fdfa",
    color: "#134e4a",
    borderRadius: 6,
    padding: "2px 8px",
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "monospace",
  },
  error: {
    marginTop: 10,
    color: "#b91c1c",
    fontSize: 13,
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 10,
    padding: "8px 14px",
  },
  denied: {
    border: "1px solid #ccfbf1",
    borderRadius: 14,
    padding: "20px",
    color: "#64748b",
    background: "#f0fdfa",
    textAlign: "center",
  },
};
