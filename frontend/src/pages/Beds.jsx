import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Heart, Activity } from "lucide-react";
import api from "../api";

const statusColor = {
  available: "#10b981",
  occupied: "#3b82f6",
  maintenance: "#f59e0b",
};

const statusBg = {
  available: "#dcfce7",
  occupied: "#dbeafe",
  maintenance: "#fef3c7",
};

const EMPTY = { bed_number: "", ward: "", notes: "" };

export default function Beds() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const { data: beds = [] } = useQuery({
    queryKey: ["beds"],
    queryFn: () => api.get("/beds/").then((r) => r.data),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: () => api.get("/patients/").then((r) => r.data),
  });

  // Poll latest vitals for all patients every 2 seconds
  const { data: latestVitals = [] } = useQuery({
    queryKey: ["vitals-latest"],
    queryFn: () => api.get("/vitals/latest").then((r) => r.data),
    refetchInterval: 2000,
  });

  // Build a quick lookup: patient_id -> latest vital reading
  const vitalsMap = {};
  latestVitals.forEach((v) => {
    vitalsMap[v.patient_id] = v;
  });

  const createMut = useMutation({
    mutationFn: (payload) => api.post("/beds/", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["beds"] });
      setShowForm(false);
      setForm(EMPTY);
    },
  });

  const assignMut = useMutation({
    mutationFn: ({ bedId, patientId }) =>
      api.patch(`/beds/${bedId}/assign`, { patient_id: patientId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["beds"] }),
  });

  const wards = [...new Set(beds.map((b) => b.ward))];
  const unassignedPatients = patients.filter(
    (p) => !beds.some((b) => b.patient_id === p.id),
  );

  const totalBeds = beds.length;
  const occupiedBeds = beds.filter((b) => b.status === "occupied").length;
  const availableBeds = beds.filter((b) => b.status === "available").length;

  return (
    <div className="page-pad" style={styles.page}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.heading}>Bed Management</h2>
          <p style={styles.subText}>Organize beds by ward and assign patients quickly.</p>
        </div>
        <button style={styles.btn} onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} /> Add Bed
        </button>
      </div>

      <div style={styles.statsRow}>
        <div style={{ ...styles.statCard, background: "#eff6ff" }}>
          <div style={styles.statValue}>{totalBeds}</div>
          <div style={styles.statLabel}>Total Beds</div>
        </div>
        <div style={{ ...styles.statCard, background: "#ecfdf5" }}>
          <div style={styles.statValue}>{availableBeds}</div>
          <div style={styles.statLabel}>Available</div>
        </div>
        <div style={{ ...styles.statCard, background: "#dbeafe" }}>
          <div style={styles.statValue}>{occupiedBeds}</div>
          <div style={styles.statLabel}>Occupied</div>
        </div>
      </div>

      {showForm && (
        <div style={styles.formCard}>
          <h3 style={styles.formTitle}>Add New Bed</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMut.mutate(form);
            }}
            style={styles.formGrid}
          >
            <div style={styles.field}>
              <label style={styles.label}>Bed Number *</label>
              <input
                required
                value={form.bed_number}
                onChange={(e) => setForm((p) => ({ ...p, bed_number: e.target.value }))}
                style={styles.input}
                placeholder="e.g. ICU-01"
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Ward *</label>
              <input
                required
                value={form.ward}
                onChange={(e) => setForm((p) => ({ ...p, ward: e.target.value }))}
                style={styles.input}
                placeholder="e.g. ICU, General"
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Notes</label>
              <input
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                style={styles.input}
                placeholder="Optional notes"
              />
            </div>
            <div style={styles.formActions}>
              <button
                type="button"
                style={styles.btnSecondary}
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
              <button type="submit" style={styles.btn} disabled={createMut.isPending}>
                {createMut.isPending ? "Saving..." : "Save Bed"}
              </button>
            </div>
          </form>
        </div>
      )}

      {wards.length === 0 && (
        <div style={styles.emptyWrap}>
          <p style={styles.empty}>No beds configured yet. Add one to start.</p>
        </div>
      )}

      {wards.map((ward) => {
        const wardBeds = beds.filter((b) => b.ward === ward);
        return (
          <section key={ward} style={styles.wardSection}>
            <div style={styles.wardHeader}>
              <h3 style={styles.wardTitle}>{ward} Ward</h3>
              <span style={styles.wardMeta}>{wardBeds.length} beds</span>
            </div>

            <div style={styles.bedGrid}>
              {wardBeds.map((bed) => {
                const patient = patients.find((p) => p.id === bed.patient_id);
                const vital = bed.patient_id ? vitalsMap[bed.patient_id] : null;
                return (
                  <article
                    key={bed.id}
                    style={{
                      ...styles.bedCard,
                      borderTopColor: statusColor[bed.status] || "#cbd5e1",
                    }}
                  >
                    <div style={styles.bedTop}>
                      <div style={styles.bedNum}>Bed {bed.bed_number}</div>
                      <span
                        style={{
                          ...styles.statusBadge,
                          background: statusBg[bed.status] || "#f1f5f9",
                          color: statusColor[bed.status] || "#334155",
                        }}
                      >
                        {bed.status}
                      </span>
                    </div>

                    <div style={styles.patientBlock}>
                      <div style={styles.patientLabel}>Patient</div>
                      {patient ? (
                        <>
                          <div style={styles.patientName}>{patient.full_name}</div>
                          {patient.allergies && (
                            <div style={styles.allergyTag}>Allergy: {patient.allergies}</div>
                          )}
                        </>
                      ) : (
                        <div style={styles.patientEmpty}>No patient assigned</div>
                      )}
                    </div>

                    {/* ─── Live Vitals Strip ─────────────────────────── */}
                    {patient && vital && (
                      <div style={styles.vitalsStrip}>
                        <div
                          style={{
                            ...styles.vitalChip,
                            borderColor:
                              vital.heart_rate > 100 || vital.heart_rate < 60
                                ? "#ef4444"
                                : "#e2e8f0",
                            background:
                              vital.heart_rate > 100 || vital.heart_rate < 60
                                ? "#fef2f2"
                                : "#f0fdf4",
                          }}
                        >
                          <Heart
                            size={13}
                            style={{
                              color:
                                vital.heart_rate > 100 || vital.heart_rate < 60
                                  ? "#ef4444"
                                  : "#10b981",
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              ...styles.vitalVal,
                              color:
                                vital.heart_rate > 100 || vital.heart_rate < 60
                                  ? "#dc2626"
                                  : "#166534",
                            }}
                          >
                            {vital.heart_rate?.toFixed(0) ?? "—"}
                          </span>
                          <span style={styles.vitalUnit}>bpm</span>
                        </div>

                        <div
                          style={{
                            ...styles.vitalChip,
                            borderColor: vital.spo2 < 95 ? "#ef4444" : "#e2e8f0",
                            background: vital.spo2 < 95 ? "#fef2f2" : "#eff6ff",
                          }}
                        >
                          <Activity
                            size={13}
                            style={{
                              color: vital.spo2 < 95 ? "#ef4444" : "#3b82f6",
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              ...styles.vitalVal,
                              color: vital.spo2 < 95 ? "#dc2626" : "#1e40af",
                            }}
                          >
                            {vital.spo2?.toFixed(1) ?? "—"}
                          </span>
                          <span style={styles.vitalUnit}>% SpO₂</span>
                        </div>
                      </div>
                    )}

                    {patient && !vital && (
                      <div style={styles.vitalsStripEmpty}>
                        <span style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic" }}>
                          No vitals data
                        </span>
                      </div>
                    )}

                    <div style={styles.assignRow}>
                      <label style={styles.assignLabel}>Assign / Change Patient</label>
                      <select
                        style={styles.select}
                        value={bed.patient_id || ""}
                        onChange={(e) =>
                          assignMut.mutate({
                            bedId: bed.id,
                            patientId: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                      >
                        <option value="">-- Unoccupied --</option>
                        {patient && <option value={patient.id}>{patient.full_name}</option>}
                        {unassignedPatients
                          .filter((p) => p.id !== bed.patient_id)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.full_name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

const styles = {
  page: {
    padding: "24px 8px 28px",
    maxWidth: "1240px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
    marginBottom: 16,
  },
  heading: { margin: 0, fontSize: 22, fontWeight: 700, color: "#1e3a5f" },
  subText: { margin: "4px 0 0", color: "#64748b", fontSize: 13 },
  btn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 16px",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: 14,
  },
  btnSecondary: {
    background: "#f8fafc",
    color: "#334155",
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    padding: "10px 16px",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: 14,
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    borderRadius: 12,
    padding: "14px 16px",
    border: "1px solid #dbe3ee",
  },
  statValue: { fontSize: 24, fontWeight: 700, color: "#1e3a5f", lineHeight: 1.1 },
  statLabel: {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.03em",
    color: "#64748b",
    textTransform: "uppercase",
    marginTop: 4,
  },
  formCard: {
    background: "#fff",
    borderRadius: 12,
    padding: "18px 20px",
    marginBottom: 18,
    border: "1px solid #dbe3ee",
    boxShadow: "0 4px 14px rgba(30, 58, 95, 0.08)",
  },
  formTitle: { margin: "0 0 14px", fontSize: 16, fontWeight: 600, color: "#1e3a5f" },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "12px 14px",
    alignItems: "end",
  },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 13, fontWeight: 500, color: "#334155" },
  input: {
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 14,
    outline: "none",
    background: "#fff",
  },
  formActions: {
    gridColumn: "1 / -1",
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
  },
  emptyWrap: {
    border: "1px solid #dbe3ee",
    borderRadius: 12,
    background: "#f8fafc",
    padding: "20px 16px",
    marginBottom: 18,
  },
  empty: { margin: 0, color: "#64748b" },
  wardSection: { marginBottom: 24 },
  wardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    borderBottom: "1px solid #e2e8f0",
    paddingBottom: 8,
  },
  wardTitle: {
    fontSize: 17,
    fontWeight: 700,
    color: "#1e3a5f",
    margin: 0,
  },
  wardMeta: { fontSize: 12, color: "#64748b", fontWeight: 600 },
  bedGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 14,
  },
  bedCard: {
    background: "#fff",
    borderRadius: 12,
    padding: "14px 14px 12px",
    border: "1px solid #e2e8f0",
    borderTop: "4px solid #e2e8f0",
    boxShadow: "0 2px 8px rgba(30, 58, 95, 0.06)",
  },
  bedTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 10,
  },
  bedNum: { fontWeight: 700, fontSize: 15, color: "#1e3a5f" },
  statusBadge: {
    borderRadius: 999,
    padding: "3px 9px",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "capitalize",
  },
  patientBlock: {
    borderTop: "1px solid #f1f5f9",
    borderBottom: "1px solid #f1f5f9",
    padding: "10px 0",
  },
  patientLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  patientName: {
    fontSize: 14,
    fontWeight: 600,
    color: "#0f172a",
  },
  patientEmpty: {
    fontSize: 13,
    color: "#94a3b8",
    fontStyle: "italic",
  },
  allergyTag: {
    marginTop: 6,
    fontSize: 12,
    color: "#b45309",
    background: "#fef3c7",
    padding: "4px 8px",
    borderRadius: 6,
    display: "inline-block",
  },
  // ── Live vitals strip ──────────────────────────────────────────
  vitalsStrip: {
    display: "flex",
    gap: 8,
    padding: "8px 0 4px",
    flexWrap: "wrap",
  },
  vitalsStripEmpty: {
    padding: "8px 0 4px",
  },
  vitalChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    padding: "4px 9px",
    fontSize: 13,
    lineHeight: 1.2,
  },
  vitalVal: {
    fontWeight: 700,
    fontSize: 14,
  },
  vitalUnit: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: 600,
  },
  // ────────────────────────────────────────────────────────────────
  assignRow: { marginTop: 10 },
  assignLabel: {
    display: "block",
    fontSize: 11,
    color: "#64748b",
    fontWeight: 700,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  select: {
    width: "100%",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 13,
    background: "#fff",
    outline: "none",
  },
};
