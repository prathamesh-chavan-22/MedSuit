import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, CheckCircle, Circle, Clock } from "lucide-react";
import api from "../api";

const priorityLabel = { 1: "Low", 2: "Medium", 3: "High" };
const priorityColor = { 1: "#16a34a", 2: "#d97706", 3: "#dc2626" };
const priorityBg = { 1: "#dcfce7", 2: "#fef3c7", 3: "#fee2e2" };

const statusIcon = {
  pending: <Circle size={17} color="#9ca3af" />,
  in_progress: <Clock size={17} color="#2563eb" />,
  done: <CheckCircle size={17} color="#16a34a" />,
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
      <div style={styles.header}>
        <div>
          <h2 style={styles.heading}>Shift Tasks</h2>
          <p style={styles.subText}>Create, assign, and track care tasks by shift.</p>
        </div>
        <button style={styles.btn} onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} /> New Task
        </button>
      </div>

      <div style={styles.statsRow}>
        <div style={{ ...styles.statCard, background: "#eff6ff" }}>
          <div style={styles.statValue}>{counts.all}</div>
          <div style={styles.statLabel}>Total</div>
        </div>
        <div style={{ ...styles.statCard, background: "#f8fafc" }}>
          <div style={styles.statValue}>{counts.pending}</div>
          <div style={styles.statLabel}>Pending</div>
        </div>
        <div style={{ ...styles.statCard, background: "#dbeafe" }}>
          <div style={styles.statValue}>{counts.in_progress}</div>
          <div style={styles.statLabel}>In Progress</div>
        </div>
        <div style={{ ...styles.statCard, background: "#ecfdf5" }}>
          <div style={styles.statValue}>{counts.done}</div>
          <div style={styles.statLabel}>Done</div>
        </div>
      </div>

      {showForm && (
        <div style={styles.formCard}>
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
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
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
              <button
                type="button"
                style={styles.btnSecondary}
                onClick={() => setShowForm(false)}
              >
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
          <div style={styles.emptyWrap}>
            <p style={styles.empty}>No tasks found for this filter.</p>
          </div>
        )}

        {filtered.map((task) => {
          const patient = patients.find((p) => p.id === task.patient_id);
          const pColor = priorityColor[task.priority] || "#64748b";
          const pBg = priorityBg[task.priority] || "#e2e8f0";

          return (
            <article
              key={task.id}
              style={{
                ...styles.taskCard,
                borderLeftColor: pColor,
                opacity: task.status === "done" ? 0.7 : 1,
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

              <button style={styles.btnDanger} onClick={() => deleteMut.mutate(task.id)}>
                x
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
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
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
    marginBottom: "16px",
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
  tabs: { display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" },
  tab: {
    background: "#f8fafc",
    border: "1px solid #dbe3ee",
    borderRadius: 10,
    padding: "8px 12px",
    fontSize: 13,
    fontWeight: 600,
    color: "#334155",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  tabActive: {
    background: "#dbeafe",
    borderColor: "#93c5fd",
    color: "#1d4ed8",
  },
  tabCount: {
    borderRadius: 999,
    padding: "1px 8px",
    fontSize: 11,
    background: "rgba(255,255,255,0.8)",
    border: "1px solid #dbe3ee",
    fontWeight: 700,
  },
  list: { display: "flex", flexDirection: "column", gap: 10 },
  emptyWrap: {
    border: "1px solid #dbe3ee",
    borderRadius: 12,
    background: "#f8fafc",
    padding: "18px 16px",
  },
  empty: { margin: 0, color: "#64748b" },
  taskCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    border: "1px solid #e2e8f0",
    borderLeft: "4px solid #e2e8f0",
    borderRadius: 12,
    padding: "12px 14px",
    background: "#fff",
    boxShadow: "0 2px 8px rgba(30, 58, 95, 0.06)",
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
    padding: "2px 8px",
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
  btnDanger: {
    background: "none",
    color: "#cbd5e1",
    border: "none",
    cursor: "pointer",
    fontSize: 16,
    padding: 4,
    lineHeight: 1,
    borderRadius: 6,
  },
};
