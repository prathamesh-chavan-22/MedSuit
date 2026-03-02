import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import api from "../api";

const EMPTY_FORM = {
  full_name: "", age: "", gender: "", diagnosis: "",
  allergies: "", mental_status: "", infection_risk: false, is_serious: false,
};

export default function Patients() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ["patients"],
    queryFn: () => api.get("/patients/").then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: (data) => api.post("/patients/", data),
    onSuccess: () => { qc.invalidateQueries(["patients"]); setShowForm(false); setForm(EMPTY_FORM); },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/patients/${id}`),
    onSuccess: () => qc.invalidateQueries(["patients"]),
  });

  const filtered = patients.filter(p =>
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (p.diagnosis || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    createMut.mutate({ ...form, age: Number(form.age) || null });
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2 style={styles.heading}>Patients</h2>
        <button style={styles.btn} onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> Add Patient
        </button>
      </div>

      {/* Add patient form */}
      {showForm && (
        <div style={styles.formCard}>
          <h3 style={styles.formTitle}>New Patient</h3>
          <form onSubmit={handleSubmit} style={styles.grid2}>
            {[
              ["full_name", "Full Name", "text", true],
              ["age", "Age", "number", false],
              ["gender", "Gender", "text", false],
              ["diagnosis", "Diagnosis", "text", false],
              ["allergies", "Allergies", "text", false],
              ["mental_status", "Mental Status", "text", false],
            ].map(([key, label, type, required]) => (
              <div key={key} style={styles.field}>
                <label style={styles.label}>{label}</label>
                <input
                  type={type} required={required} value={form[key]}
                  onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                  style={styles.input}
                />
              </div>
            ))}
            <div style={styles.field}>
              <label style={styles.label}>
                <input type="checkbox" checked={form.infection_risk}
                  onChange={e => setForm(prev => ({ ...prev, infection_risk: e.target.checked }))} />
                {" "}Infection Risk
              </label>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>
                <input type="checkbox" checked={form.is_serious}
                  onChange={e => setForm(prev => ({ ...prev, is_serious: e.target.checked }))} />
                {" "}Serious
              </label>
            </div>
            <div style={{ gridColumn: "1/-1", display: "flex", gap: 10, marginTop: 4 }}>
              <button type="submit" style={styles.btn} disabled={createMut.isPending}>
                {createMut.isPending ? "Saving…" : "Save"}
              </button>
              <button type="button" style={styles.btnSecondary} onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div style={styles.searchBox}>
        <Search size={16} color="#9ca3af" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or diagnosis…" style={styles.searchInput} />
      </div>

      {isLoading ? <p>Loading…</p> : (
        <table style={styles.table}>
          <thead>
            <tr>
              {["Name", "Age", "Gender", "Diagnosis", "Allergies", "Status", "Actions"].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <td style={styles.td}>
                  <Link to={`/patients/${p.id}`} style={styles.link}>{p.full_name}</Link>
                </td>
                <td style={styles.td}>{p.age || "—"}</td>
                <td style={styles.td}>{p.gender || "—"}</td>
                <td style={styles.td}>{p.diagnosis || "—"}</td>
                <td style={styles.td}>{p.allergies || "—"}</td>
                <td style={styles.td}>
                  {p.is_serious && <span style={styles.badgeDanger}>Serious</span>}
                  {p.infection_risk && <span style={styles.badgeWarn}>Infection Risk</span>}
                  {!p.is_serious && !p.infection_risk && <span style={styles.badgeOk}>Stable</span>}
                </td>
                <td style={styles.td}>
                  <button style={styles.btnDanger} onClick={() => deleteMut.mutate(p.id)}>Remove</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ ...styles.td, color: "#9ca3af", textAlign: "center" }}>No patients found</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

const styles = {
  page: { padding: "28px 32px", maxWidth: 1100 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  heading: { margin: 0, fontSize: 22, fontWeight: 700, color: "#1e3a5f" },
  btn: { display: "flex", alignItems: "center", gap: 6, background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontWeight: 600, cursor: "pointer", fontSize: 14 },
  btnSecondary: { background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 8, padding: "9px 16px", fontWeight: 600, cursor: "pointer", fontSize: 14 },
  btnDanger: { background: "none", color: "#ef4444", border: "1px solid #ef4444", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 13 },
  formCard: { background: "#fff", borderRadius: 12, padding: "22px 24px", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" },
  formTitle: { margin: "0 0 16px", fontSize: 16, fontWeight: 600 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px" },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 13, fontWeight: 500, color: "#374151" },
  input: { border: "1px solid #d1d5db", borderRadius: 8, padding: "9px 11px", fontSize: 14, outline: "none" },
  searchBox: { display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", marginBottom: 16, maxWidth: 360 },
  searchInput: { border: "none", outline: "none", fontSize: 14, flex: 1 },
  table: { width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  th: { textAlign: "left", padding: "10px 14px", fontSize: 12, color: "#6b7280", borderBottom: "1px solid #e5e7eb", background: "#f9fafb" },
  td: { padding: "12px 14px", fontSize: 14, color: "#111827", borderBottom: "1px solid #f3f4f6" },
  link: { color: "#3b82f6", textDecoration: "none", fontWeight: 600 },
  badgeDanger: { background: "#fee2e2", color: "#ef4444", borderRadius: 99, padding: "2px 8px", fontSize: 12, fontWeight: 600, marginRight: 4 },
  badgeWarn: { background: "#fef3c7", color: "#d97706", borderRadius: 99, padding: "2px 8px", fontSize: 12, fontWeight: 600, marginRight: 4 },
  badgeOk: { background: "#d1fae5", color: "#059669", borderRadius: 99, padding: "2px 8px", fontSize: 12, fontWeight: 600 },
};
