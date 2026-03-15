import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import api from "../api";

const statusColor = {
  available: "#10b981",
  occupied: "#3b82f6",
  maintenance: "#f59e0b",
};
const statusBg = {
  available: "#d1fae5",
  occupied: "#eff6ff",
  maintenance: "#fef3c7",
};

export default function Beds() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ bed_number: "", ward: "", notes: "" });

  const { data: beds = [] } = useQuery({
    queryKey: ["beds"],
    queryFn: () => api.get("/beds/").then((r) => r.data),
  });
  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: () => api.get("/patients/").then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: (d) => api.post("/beds/", d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["beds"] });
      setShowForm(false);
      setForm({ bed_number: "", ward: "", notes: "" });
    },
  });

  const assignMut = useMutation({
    mutationFn: ({ bedId, patientId }) =>
      api.patch(`/beds/${bedId}/assign`, { patient_id: patientId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["beds"] }),
  });

  // Group by ward
  const wards = [...new Set(beds.map((b) => b.ward))];
  const unassignedPatients = patients.filter(
    (p) => !beds.some((b) => b.patient_id === p.id),
  );

  return (
    <div className="page-pad" style={styles.page}>
      <div style={styles.header}>
        <h2 style={styles.heading}>Bed Management</h2>
        <button style={styles.btn} onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> Add Bed
        </button>
      </div>

      {showForm && (
        <div style={styles.formCard}>
          <h3 style={styles.formTitle}>New Bed</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMut.mutate(form);
            }}
            style={styles.row}
          >
            <div style={styles.field}>
              <label style={styles.label}>Bed Number</label>
              <input
                required
                value={form.bed_number}
                onChange={(e) =>
                  setForm((p) => ({ ...p, bed_number: e.target.value }))
                }
                style={styles.input}
                placeholder="A-101"
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Ward</label>
              <input
                required
                value={form.ward}
                onChange={(e) =>
                  setForm((p) => ({ ...p, ward: e.target.value }))
                }
                style={styles.input}
                placeholder="General"
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Notes</label>
              <input
                value={form.notes}
                onChange={(e) =>
                  setForm((p) => ({ ...p, notes: e.target.value }))
                }
                style={styles.input}
                placeholder="Optional"
              />
            </div>
            <button
              type="submit"
              style={styles.btn}
              disabled={createMut.isPending}
            >
              Save
            </button>
          </form>
        </div>
      )}

      {wards.length === 0 && (
        <p style={{ color: "#9ca3af" }}>No beds configured. Add one above.</p>
      )}

      {wards.map((ward) => (
        <div key={ward} style={styles.wardSection}>
          <h3 style={styles.wardTitle}>{ward} Ward</h3>
          <div style={styles.bedGrid}>
            {beds
              .filter((b) => b.ward === ward)
              .map((bed) => {
                const patient = patients.find((p) => p.id === bed.patient_id);
                return (
                  <div
                    key={bed.id}
                    style={{
                      ...styles.bedCard,
                      borderTopColor: statusColor[bed.status],
                    }}
                  >
                    <div style={styles.bedNum}>Bed {bed.bed_number}</div>
                    <span
                      style={{
                        ...styles.statusBadge,
                        background: statusBg[bed.status],
                        color: statusColor[bed.status],
                      }}
                    >
                      {bed.status}
                    </span>
                    {patient && (
                      <div style={styles.patientName}>{patient.full_name}</div>
                    )}
                    {patient?.allergies && (
                      <div style={styles.allergyTag}>⚠ {patient.allergies}</div>
                    )}
                    <div style={styles.assignRow}>
                      <select
                        style={styles.select}
                        value={bed.patient_id || ""}
                        onChange={(e) =>
                          assignMut.mutate({
                            bedId: bed.id,
                            patientId: e.target.value
                              ? Number(e.target.value)
                              : null,
                          })
                        }
                      >
                        <option value="">— Unoccupied —</option>
                        {patient && (
                          <option value={patient.id}>
                            {patient.full_name}
                          </option>
                        )}
                        {unassignedPatients
                          .filter((p) => p.id !== bed.patient_id)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.full_name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}

const styles = {
  page: { padding: "28px 32px", maxWidth: 1100, margin: "0 auto" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  heading: { margin: 0, fontSize: 22, fontWeight: 700, color: "#1e3a5f" },
  btn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "#3b82f6",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "9px 16px",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: 14,
  },
  formCard: {
    background: "#fff",
    borderRadius: 12,
    padding: "20px 24px",
    marginBottom: 20,
    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
  },
  formTitle: { margin: "0 0 14px", fontSize: 16, fontWeight: 600 },
  row: { display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 13, fontWeight: 500, color: "#374151" },
  input: {
    border: "1px solid #d1d5db",
    borderRadius: 8,
    padding: "9px 11px",
    fontSize: 14,
    outline: "none",
  },
  wardSection: { marginBottom: 28 },
  wardTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 12,
  },
  bedGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: 14,
  },
  bedCard: {
    background: "#fff",
    borderRadius: 10,
    padding: "14px 16px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    borderTop: "3px solid #e5e7eb",
  },
  bedNum: { fontWeight: 700, fontSize: 15, color: "#1e3a5f", marginBottom: 6 },
  statusBadge: {
    borderRadius: 99,
    padding: "2px 8px",
    fontSize: 11,
    fontWeight: 600,
  },
  patientName: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: 600,
    color: "#111827",
  },
  allergyTag: { fontSize: 12, color: "#d97706", marginTop: 3 },
  assignRow: { marginTop: 10 },
  select: {
    width: "100%",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    padding: "6px 8px",
    fontSize: 13,
    outline: "none",
  },
};
