import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, CheckCircle, Circle, Clock, X } from "lucide-react";
import api from "../api";

/* ---------- SVG Illustrations ---------- */

function AllCaughtUpSvg() {
  return (
    <svg width="140" height="100" viewBox="0 0 140 100" fill="none">
      <rect x="30" y="12" width="80" height="70" rx="14" fill="#f0fdfa" stroke="#99f6e4" strokeWidth="2" />
      <circle cx="70" cy="40" r="16" fill="#ccfbf1" stroke="#0d9488" strokeWidth="2" />
      <polyline points="62,40 68,46 78,34" fill="none" stroke="#0d9488" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="48" y1="68" x2="92" y2="68" stroke="#ccfbf1" strokeWidth="2" strokeLinecap="round" />
      <circle cx="110" cy="20" r="3" fill="#99f6e4" />
      <circle cx="30" cy="78" r="2.5" fill="#99f6e4" />
    </svg>
  );
}

const priorityLabel = { 1: "Low", 2: "Medium", 3: "High" };
const priorityColor = { 1: "#10b981", 2: "#f59e0b", 3: "#ef4444" };
const priorityBg = { 1: "#d1fae5", 2: "#fef3c7", 3: "#fee2e2" };

const statusIcon = {
  pending: <Circle size={17} color="#94a3b8" />,
  in_progress: <Clock size={17} color="#0d9488" />,
  done: <CheckCircle size={17} color="#10b981" />,
};

const EMPTY = {
  patient_id: "",
  assigned_to: "",
  shift_id: "",
  title: "",
  description: "",
  priority: 1,
};

export default function Tasks() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [filter, setFilter] = useState("all");

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.get("/tasks/").then((r) => r.data),
  });
  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: () => api.get("/patients/").then((r) => r.data),
  });
  const { data: shifts = [] } = useQuery({
    queryKey: ["shifts"],
    queryFn: () => api.get("/tasks/shifts").then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: (d) => api.post("/tasks/", d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setShowForm(false);
      setForm(EMPTY);
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/tasks/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
    onError: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const filtered = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  const counts = {
    all: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length,
  };

  const nextStatus = {
    pending: "in_progress",
    in_progress: "done",
    done: "pending",
  };

  return (
    <div className="page-pad" style={styles.page}>
      <div className="anim-slide-up" style={styles.header}>
        <div>
          <h2 style={styles.heading}>Shift Tasks</h2>
          <p style={styles.subText}>Create, assign, and track care tasks by shift.</p>
        </div>
        <button style={styles.btn} onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} /> New Task
        </button>
      </div>

      <div className="anim-fade-in" style={styles.statsRow}>
        {[
          { key: "all", label: "Total", bg: "#f0fdfa", border: "#ccfbf1" },
          { key: "pending", label: "Pending", bg: "#f8fafc", border: "#e2e8f0" },
          { key: "in_progress", label: "In Progress", bg: "#f0fdfa", border: "#99f6e4" },
          { key: "done", label: "Done", bg: "#ecfdf5", border: "#a7f3d0" },
        ].map((s) => (
          <div key={s.key} style={{ ...styles.statCard, background: s.bg, borderColor: s.border }}>
            <div style={styles.statValue}>{counts[s.key]}</div>
            <div style={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="anim-fade-scale" style={styles.formCard}>
          <h3 style={styles.formTitle}>Add New Task</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMut.mutate({
                ...form,
                patient_id: Number(form.patient_id),
                assigned_to: form.assigned_to ? Number(form.assigned_to) : null,
                shift_id: form.shift_id ? Number(form.shift_id) : null,
                priority: Number(form.priority),
              });
            }}
            style={styles.formGrid}
          >
            <div style={styles.field}>
              <label style={styles.label}>Patient *</label>
              <select
                required
                value={form.patient_id}
                onChange={(e) => setForm((p) => ({ ...p, patient_id: e.target.value }))}
                style={styles.input}
              >
                <option value="">Select patient...</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Shift</label>
              <select
                value={form.shift_id}
                onChange={(e) => setForm((p) => ({ ...p, shift_id: e.target.value }))}
                style={styles.input}
              >
                <option value="">Any shift</option>
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.start_time}-{s.end_time})
                  </option>
                ))}
              </select>
            </div>
            <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
              <label style={styles.label}>Task Title *</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                style={styles.input}
                placeholder="e.g. Monitor blood pressure"
              />
            </div>
            <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
              <label style={styles.label}>Description</label>
              <input
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                style={styles.input}
                placeholder="Optional details"
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
                style={styles.input}
              >
                <option value={1}>Low</option>
                <option value={2}>Medium</option>
                <option value={3}>High</option>
              </select>
            </div>
            <div style={styles.formActions}>
              <button type="button" style={styles.btnSecondary} onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" style={styles.btn} disabled={createMut.isPending}>
                {createMut.isPending ? "Saving..." : "Create Task"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={styles.tabs}>
        {[
          ["all", "All"],
          ["pending", "Pending"],
          ["in_progress", "In Progress"],
          ["done", "Done"],
        ].map(([key, label]) => (
          <button
            key={key}
            style={{ ...styles.tab, ...(filter === key ? styles.tabActive : {}) }}
            onClick={() => setFilter(key)}
          >
            {label}
            <span style={styles.tabCount}>{counts[key]}</span>
          </button>
        ))}
      </div>

      <div style={styles.list}>
        {filtered.length === 0 && (
          <div className="empty-state anim-fade-scale" style={styles.emptyWrap}>
            <AllCaughtUpSvg />
            <p>All caught up! No tasks for this filter.</p>
          </div>
        )}

        {filtered.map((task) => {
          const patient = patients.find((p) => p.id === task.patient_id);
          const pColor = priorityColor[task.priority] || "#64748b";
          const pBg = priorityBg[task.priority] || "#e2e8f0";

          return (
            <article
              key={task.id}
              className="anim-slide-up"
              style={{
                ...styles.taskCard,
                borderLeftColor: pColor,
                opacity: task.status === "done" ? 0.65 : 1,
              }}
            >
              <button
                style={styles.iconBtn}
                onClick={() =>
                  updateMut.mutate({
                    id: task.id,
                    status: nextStatus[task.status],
                  })
                }
                title="Cycle status"
              >
                {statusIcon[task.status]}
              </button>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.taskHead}>
                  <div style={styles.taskTitle}>{task.title}</div>
                  <span style={{ ...styles.priorityBadge, background: pBg, color: pColor }}>
                    {priorityLabel[task.priority]} priority
                  </span>
                </div>

                {task.description && <div style={styles.taskDesc}>{task.description}</div>}

                <div style={styles.taskMeta}>
                  Patient: <b>{patient?.full_name || task.patient_id}</b>
                </div>
              </div>

              <button style={styles.btnDelete} onClick={() => deleteMut.mutate(task.id)} title="Delete">
                <X size={14} />
              </button>
            </article>
          );
        })}
      </div>
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
  heading: { margin: 0, fontSize: 24, fontWeight: 700, color: "#134e4a", letterSpacing: "-0.02em" },
  subText: { margin: "4px 0 0", color: "#64748b", fontSize: 13 },
  btn: {
    display: "inline-flex",
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
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    borderRadius: 12,
    padding: "16px 18px",
    border: "1px solid #e2e8f0",
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
  },
  statValue: { fontSize: 26, fontWeight: 700, color: "#134e4a", lineHeight: 1.1 },
  statLabel: {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.03em",
    color: "#64748b",
    textTransform: "uppercase",
    marginTop: 4,
  },
  formCard: {
    background: "rgba(255,255,255,0.9)",
    backdropFilter: "blur(10px)",
    borderRadius: 14,
    padding: "20px 22px",
    marginBottom: "16px",
    border: "1px solid rgba(226, 232, 240, 0.7)",
    boxShadow: "0 4px 14px rgba(30, 58, 95, 0.06)",
  },
  formTitle: { margin: "0 0 14px", fontSize: 16, fontWeight: 700, color: "#134e4a" },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "12px 14px",
    alignItems: "end",
  },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 13, fontWeight: 600, color: "#475569" },
  input: {
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 14,
    outline: "none",
    background: "rgba(255,255,255,0.7)",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  formActions: {
    gridColumn: "1 / -1",
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
  },
  tabs: { display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" },
  tab: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 600,
    color: "#475569",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 8,
    transition: "all 0.15s ease",
  },
  tabActive: {
    background: "#f0fdfa",
    borderColor: "#99f6e4",
    color: "#0d9488",
  },
  tabCount: {
    borderRadius: 999,
    padding: "1px 8px",
    fontSize: 11,
    background: "rgba(255,255,255,0.9)",
    border: "1px solid #e2e8f0",
    fontWeight: 700,
  },
  list: { display: "flex", flexDirection: "column", gap: 10 },
  emptyWrap: {
    border: "1px solid #ccfbf1",
    borderRadius: 14,
    background: "#f0fdfa",
    padding: "24px 16px",
  },
  taskCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    border: "1px solid #e2e8f0",
    borderLeft: "4px solid #e2e8f0",
    borderRadius: 12,
    padding: "14px 16px",
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(6px)",
    boxShadow: "0 2px 8px rgba(30, 58, 95, 0.04)",
    transition: "transform 0.18s ease, box-shadow 0.18s ease",
  },
  iconBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 2,
    display: "flex",
    alignItems: "center",
    marginTop: 1,
  },
  taskHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  taskTitle: {
    fontWeight: 700,
    fontSize: 15,
    color: "#0f172a",
  },
  priorityBadge: {
    borderRadius: 999,
    padding: "3px 10px",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "capitalize",
    whiteSpace: "nowrap",
  },
  taskDesc: {
    marginTop: 4,
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.45,
  },
  taskMeta: {
    marginTop: 6,
    color: "#475569",
    fontSize: 12,
  },
  btnDelete: {
    background: "none",
    color: "#94a3b8",
    border: "1px solid #e2e8f0",
    cursor: "pointer",
    padding: 5,
    lineHeight: 1,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.12s ease",
  },
};
