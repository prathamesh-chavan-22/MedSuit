import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api";

const ROLE_OPTIONS = ["admin", "doctor", "nurse"];

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
      <div style={styles.page}>
        <div style={styles.denied}>Only admin users can manage accounts.</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2 style={styles.heading}>User Management</h2>
        <div style={styles.badge}>
          <ShieldCheck size={14} /> Admin Controls
        </div>
      </div>

      <div style={styles.card}>
        {isLoading ? (
          <p style={styles.empty}>Loading users...</p>
        ) : sortedUsers.length === 0 ? (
          <p style={styles.empty}>No users found.</p>
        ) : (
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
                    <td style={styles.td}>{row.username}</td>
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
                        <span>{row.is_active ? "Enabled" : "Disabled"}</span>
                      </label>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
  page: { padding: "28px 32px", maxWidth: 1100, margin: "0 auto" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  heading: { margin: 0, fontSize: 22, fontWeight: 700, color: "#1e3a5f" },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    color: "#334155",
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    borderRadius: 999,
    padding: "6px 10px",
  },
  card: {
    background: "#fff",
    borderRadius: 12,
    padding: "14px 16px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    overflowX: "auto",
  },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    fontSize: 12,
    color: "#6b7280",
    padding: "10px",
    borderBottom: "1px solid #e5e7eb",
  },
  td: {
    padding: "10px",
    fontSize: 14,
    color: "#111827",
    borderBottom: "1px solid #f3f4f6",
  },
  select: {
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 13,
    background: "#fff",
  },
  toggleLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
  },
  empty: { margin: 0, color: "#94a3b8" },
  error: {
    marginTop: 10,
    color: "#b91c1c",
    fontSize: 13,
  },
  denied: {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "14px",
    color: "#64748b",
    background: "#f8fafc",
  },
};
