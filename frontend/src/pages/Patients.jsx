import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, Search, ShieldAlert, Bug, AlertTriangle } from "lucide-react";
import api from "../api";

/* ---------- SVG Illustrations ---------- */

function NoPatientsSvg() {
  return (
    <svg width="140" height="100" viewBox="0 0 140 100" fill="none">
      <defs>
        <linearGradient id="nopt-bd" x1="0" y1="0" x2="140" y2="100">
          <stop offset="0%" stopColor="#f0fdfa" />
          <stop offset="100%" stopColor="#ccfbf1" />
        </linearGradient>
        <filter id="nopt-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#0d9488" floodOpacity="0.1" />
        </filter>
      </defs>
      <style>
        {`
          @keyframes nopt-float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-4px); }
          }
          @keyframes nopt-draw {
            to { stroke-dashoffset: 0; }
          }
          .nopt-anim { animation: nopt-float 4s ease-in-out infinite; transform-origin: center; }
          .nopt-check { stroke-dasharray: 24; stroke-dashoffset: 24; animation: nopt-draw 1s ease-out forwards 0.3s; }
        `}
      </style>
      <rect x="25" y="10" width="90" height="74" rx="14" fill="url(#nopt-bd)" stroke="#5eead4" strokeWidth="2" filter="url(#nopt-glow)" className="nopt-anim" />
      <g className="nopt-anim">
        <circle cx="70" cy="35" r="14" fill="#14b8a6" stroke="#fff" strokeWidth="2" />
        <path d="M64 35l4 4 8-8" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="nopt-check" />
        <line x1="45" y1="60" x2="95" y2="60" stroke="#99f6e4" strokeWidth="3" strokeLinecap="round" />
        <line x1="55" y1="68" x2="85" y2="68" stroke="#99f6e4" strokeWidth="3" strokeLinecap="round" />
      </g>
      <circle cx="120" cy="22" r="4" fill="#5eead4" style={{ animation: "nopt-float 3s infinite 1s" }} />
      <circle cx="20" cy="80" r="3" fill="#2dd4bf" style={{ animation: "nopt-float 3s infinite 0.5s" }} />
    </svg>
  );
}

function SeriousSvg() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }}>
      <style>
        {`
          @keyframes srs-pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.1); }
          }
          .srs-anim { animation: srs-pulse 1.5s infinite; transform-origin: center; }
        `}
      </style>
      <circle cx="8" cy="8" r="7" fill="#fef2f2" stroke="#ef4444" strokeWidth="1.5" className="srs-anim" />
      <line x1="8" y1="4" x2="8" y2="9" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" className="srs-anim" />
      <circle cx="8" cy="12" r="1.2" fill="#ef4444" className="srs-anim" />
    </svg>
  );
}

function InfectionSvg() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }}>
      <style>
        {`
          @keyframes inf-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .inf-anim { animation: inf-spin 6s linear infinite; transform-origin: 8px 8px; }
        `}
      </style>
      <g className="inf-anim">
        <circle cx="8" cy="8" r="5" fill="#fffbeb" stroke="#d97706" strokeWidth="1.5" />
        <circle cx="8" cy="8" r="2" fill="#d97706" />
        <circle cx="8" cy="1.5" r="1.5" fill="#d97706" />
        <circle cx="14.5" cy="8" r="1.5" fill="#d97706" />
        <circle cx="8" cy="14.5" r="1.5" fill="#d97706" />
        <circle cx="1.5" cy="8" r="1.5" fill="#d97706" />
      </g>
    </svg>
  );
}

function FallRiskSvg() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }}>
      <style>
        {`
          @keyframes fall-shake {
            0%, 100% { transform: rotate(0deg); }
            25% { transform: rotate(-10deg); }
            75% { transform: rotate(10deg); }
          }
          .fall-anim { animation: fall-shake 2s ease-in-out infinite; transform-origin: center 10px; }
        `}
      </style>
      <g className="fall-anim">
        <path d="M8 1L1 14h14L8 1z" fill="#f8fafc" stroke="#64748b" strokeWidth="1.5" strokeLinejoin="round" />
        <line x1="8" y1="6" x2="8" y2="10" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="12" r="1" fill="#64748b" />
      </g>
    </svg>
  );
}

const EMPTY_FORM = {
  full_name: "",
  age: "",
  gender: "",
  blood_group: "",
  weight_kg: "",
  height_cm: "",
  diagnosis: "",
  comorbidities: "",
  medications: "",
  allergies: "",
  mental_status: "",
  primary_phone: "",
  secondary_phone: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  emergency_contact_relationship: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  insurance_provider: "",
  insurance_policy_no: "",
  mrn: "",
  admission_type: "planned",
  patient_status: "admitted",
  admission_at: "",
  discharge_at: "",
  discharge_summary: "",
  fall_risk: false,
  infection_risk: false,
  is_serious: false,
};

export default function Patients() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ["patients"],
    queryFn: () => api.get("/patients/").then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: (data) => api.post("/patients/", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      setShowForm(false);
      setForm(EMPTY_FORM);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/patients/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["patients"] }),
  });

  const filtered = patients.filter(
    (p) =>
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.diagnosis || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.mrn || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.uhid || "").toLowerCase().includes(search.toLowerCase()),
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    createMut.mutate({
      ...form,
      age: Number(form.age) || null,
      weight_kg: Number(form.weight_kg) || null,
      height_cm: Number(form.height_cm) || null,
      admission_at: form.admission_at || null,
      discharge_at: form.discharge_at || null,
      discharge_summary: form.discharge_summary || null,
    });
  };

  return (
    <div className="page-pad" style={styles.page}>
      <div className="anim-slide-up" style={styles.header}>
        <div>
          <h2 style={styles.heading}>Patients</h2>
          <p style={styles.subText}>Manage admissions, profiles, and risk flags</p>
        </div>
        <button style={styles.btn} onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> Add Patient
        </button>
      </div>

      {showForm && (
        <div className="anim-fade-scale" style={styles.formCard}>
          <h3 style={styles.formTitle}>New Patient</h3>
          <form onSubmit={handleSubmit} className="grid-2col" style={styles.grid2}>
            {[
              ["full_name", "Full Name", "text", true],
              ["mrn", "MRN", "text", false],
              ["age", "Age", "number", false],
              ["gender", "Gender", "text", false],
              ["blood_group", "Blood Group", "text", false],
              ["weight_kg", "Weight (kg)", "number", false],
              ["height_cm", "Height (cm)", "number", false],
              ["diagnosis", "Diagnosis", "text", false],
              ["comorbidities", "Comorbidities", "text", false],
              ["medications", "Current Medications", "text", false],
              ["allergies", "Allergies", "text", false],
              ["mental_status", "Mental Status", "text", false],
              ["primary_phone", "Primary Phone", "text", false],
              ["secondary_phone", "Secondary Phone", "text", false],
              ["emergency_contact_name", "Emergency Contact Name", "text", false],
              ["emergency_contact_phone", "Emergency Contact Phone", "text", false],
              ["emergency_contact_relationship", "Emergency Contact Relationship", "text", false],
              ["city", "City", "text", false],
              ["state", "State", "text", false],
              ["pincode", "Pincode", "text", false],
              ["insurance_provider", "Insurance Provider", "text", false],
              ["insurance_policy_no", "Insurance Policy No", "text", false],
            ].map(([key, label, type, required]) => (
              <div key={key} style={styles.field}>
                <label style={styles.label}>{label}</label>
                <input
                  type={type}
                  required={required}
                  value={form[key]}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  style={styles.input}
                />
              </div>
            ))}

            <div style={{ ...styles.field, gridColumn: "1/-1" }}>
              <label style={styles.label}>Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, address: e.target.value }))
                }
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Admission Type</label>
              <select
                value={form.admission_type}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, admission_type: e.target.value }))
                }
                style={styles.input}
              >
                <option value="planned">Planned</option>
                <option value="emergency">Emergency</option>
                <option value="transfer">Transfer</option>
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Patient Status</label>
              <select
                value={form.patient_status}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, patient_status: e.target.value }))
                }
                style={styles.input}
              >
                <option value="admitted">Admitted</option>
                <option value="in_observation">In Observation</option>
                <option value="discharged">Discharged</option>
                <option value="deceased">Deceased</option>
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Admission At</label>
              <input
                type="datetime-local"
                value={form.admission_at}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, admission_at: e.target.value }))
                }
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Discharge At</label>
              <input
                type="datetime-local"
                value={form.discharge_at}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, discharge_at: e.target.value }))
                }
                style={styles.input}
              />
            </div>

            <div style={{ ...styles.field, gridColumn: "1/-1" }}>
              <label style={styles.label}>Discharge Summary</label>
              <input
                type="text"
                value={form.discharge_summary}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, discharge_summary: e.target.value }))
                }
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={form.fall_risk}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, fall_risk: e.target.checked }))
                  }
                />{" "}
                Fall Risk
              </label>
            </div>

            <div style={styles.field}>
              <label style={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={form.infection_risk}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, infection_risk: e.target.checked }))
                  }
                />{" "}
                Infection Risk
              </label>
            </div>

            <div style={styles.field}>
              <label style={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={form.is_serious}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, is_serious: e.target.checked }))
                  }
                />{" "}
                Serious
              </label>
            </div>

            <div
              style={{
                gridColumn: "1/-1",
                display: "flex",
                gap: 10,
                marginTop: 4,
              }}
            >
              <button type="submit" style={styles.btn} disabled={createMut.isPending}>
                {createMut.isPending ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                style={styles.btnSecondary}
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="anim-fade-in" style={styles.searchBox}>
        <Search size={16} color="#94a3b8" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, MRN, UHID, or diagnosis..."
          style={styles.searchInput}
        />
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="empty-state anim-fade-scale">
          <NoPatientsSvg />
          <p>No patients found</p>
        </div>
      ) : (
        <div className="table-scroll anim-slide-up">
          <table style={styles.table}>
            <thead>
              <tr>
                {[
                  "Name",
                  "UHID",
                  "MRN",
                  "Age",
                  "Gender",
                  "Diagnosis",
                  "Status",
                  "Allergies",
                  "Risk Flags",
                  "Actions",
                ].map((h) => (
                  <th key={h} style={styles.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} style={styles.row}>
                  <td style={styles.td}>
                    <Link to={`/patients/${p.id}`} style={styles.link}>
                      {p.full_name}
                    </Link>
                  </td>
                  <td style={styles.td}><span style={styles.uhidBadge}>{p.uhid || "-"}</span></td>
                  <td style={styles.td}>{p.mrn || "-"}</td>
                  <td style={styles.td}>{p.age || "-"}</td>
                  <td style={styles.td}>{p.gender || "-"}</td>
                  <td style={styles.td}>{p.diagnosis || "-"}</td>
                  <td style={styles.td}>
                    <span style={styles.statusBadge}>{p.patient_status || "admitted"}</span>
                  </td>
                  <td style={styles.td}>{p.allergies || "-"}</td>
                  <td style={styles.td}>
                    {p.is_serious && <span style={styles.badgeDanger}><SeriousSvg />Serious</span>}
                    {p.infection_risk && (
                      <span style={styles.badgeWarn}><InfectionSvg />Infection</span>
                    )}
                    {p.fall_risk && <span style={styles.badgeGray}><FallRiskSvg />Fall</span>}
                    {!p.is_serious && !p.infection_risk && !p.fall_risk && (
                      <span style={styles.badgeOk}>Stable</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <button
                      style={styles.btnDanger}
                      onClick={() => {
                        if (window.confirm(`Remove ${p.full_name}? This cannot be undone.`)) {
                          deleteMut.mutate(p.id);
                        }
                      }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
    marginBottom: 20,
    flexWrap: "wrap",
    gap: 12,
  },
  heading: { margin: 0, fontSize: 24, fontWeight: 700, color: "#134e4a", letterSpacing: "-0.02em" },
  subText: { margin: "4px 0 0", color: "#64748b", fontSize: 13 },
  btn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "linear-gradient(135deg, #0d9488, #14b8a6)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 18px",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: 14,
    boxShadow: "0 4px 12px rgba(13,148,136,0.2)",
    transition: "transform 0.15s ease",
  },
  btnSecondary: {
    background: "#f8fafc",
    color: "#475569",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: "10px 18px",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: 14,
  },
  btnDanger: {
    background: "none",
    color: "#ef4444",
    border: "1px solid #fecaca",
    borderRadius: 8,
    padding: "7px 12px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    transition: "all 0.15s ease",
  },
  formCard: {
    background: "rgba(255,255,255,0.9)",
    backdropFilter: "blur(10px)",
    borderRadius: 14,
    padding: "22px 24px",
    marginBottom: "16px",
    border: "1px solid rgba(226, 232, 240, 0.7)",
    boxShadow: "0 4px 14px rgba(30, 58, 95, 0.06)",
  },
  formTitle: { margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "#134e4a" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 13, fontWeight: 600, color: "#475569" },
  checkLabel: { fontSize: 13, fontWeight: 500, color: "#475569", display: "flex", alignItems: "center", gap: 6 },
  input: {
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 14,
    outline: "none",
    background: "rgba(255,255,255,0.7)",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "rgba(255,255,255,0.9)",
    backdropFilter: "blur(8px)",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "11px 14px",
    marginBottom: "18px",
    maxWidth: "480px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
  },
  searchInput: { border: "none", outline: "none", fontSize: 14, flex: 1, background: "transparent" },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    background: "rgba(255,255,255,0.92)",
    borderRadius: 14,
    overflow: "hidden",
    boxShadow: "0 4px 14px rgba(30, 58, 95, 0.06)",
  },
  th: {
    textAlign: "left",
    padding: "12px 14px",
    fontSize: 11,
    color: "#64748b",
    borderBottom: "1px solid #e2e8f0",
    background: "#f8fafb",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  td: {
    padding: "14px 14px",
    fontSize: 14,
    color: "#0f172a",
    borderBottom: "1px solid #f1f5f9",
    transition: "background 0.12s",
  },
  row: {
    transition: "background 0.12s ease",
  },
  link: { color: "#0d9488", textDecoration: "none", fontWeight: 600 },
  badgeDanger: {
    background: "#fee2e2",
    color: "#ef4444",
    borderRadius: 99,
    padding: "3px 10px",
    fontSize: 12,
    fontWeight: 600,
    marginRight: 4,
    display: "inline-flex",
    alignItems: "center",
  },
  badgeWarn: {
    background: "#fef3c7",
    color: "#d97706",
    borderRadius: 99,
    padding: "3px 10px",
    fontSize: 12,
    fontWeight: 600,
    marginRight: 4,
    display: "inline-flex",
    alignItems: "center",
  },
  badgeGray: {
    background: "#f1f5f9",
    color: "#475569",
    borderRadius: 99,
    padding: "3px 10px",
    fontSize: 12,
    fontWeight: 600,
    marginRight: 4,
    display: "inline-flex",
    alignItems: "center",
  },
  badgeOk: {
    background: "#d1fae5",
    color: "#059669",
    borderRadius: 99,
    padding: "3px 10px",
    fontSize: 12,
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
  },
  statusBadge: {
    background: "#f0fdfa",
    color: "#0d9488",
    borderRadius: 99,
    padding: "3px 10px",
    fontSize: 12,
    fontWeight: 600,
    textTransform: "capitalize",
  },
  uhidBadge: {
    background: "#f0fdfa",
    color: "#134e4a",
    borderRadius: 6,
    padding: "2px 8px",
    fontSize: 12,
    fontWeight: 700,
    fontFamily: "monospace",
  },
};
