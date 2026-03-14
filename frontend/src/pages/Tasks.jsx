import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, CheckCircle, Circle, Clock } from "lucide-react";
import api from "../api";

const priorityLabel = { 1: "Low", 2: "Medium", 3: "High" };
const priorityColor = { 1: "#6b7280", 2: "#f59e0b", 3: "#ef4444" };

const statusIcon = {
  pending: <Circle size={16} color="#9ca3af" />,
  in_progress: <Clock size={16} color="#3b82f6" />,
  done: <CheckCircle size={16} color="#10b981" />,
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

  const filtered =
    filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  const nextStatus = {
    pending: "in_progress",
    in_progress: "done",
    done: "pending",
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2 style={styles.heading}>Shift Tasks</h2>
        <button style={styles.btn} onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> New Task
        </button>
      </div>

      {showForm && (
        <div style={styles.formCard}>
          <h3 style={styles.formTitle}>New Task</h3>
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
            style={styles.grid2}
          >
            <div style={styles.field}>
              <label style={styles.label}>Patient *</label>
              <select
                required
                value={form.patient_id}
                onChange={(e) =>
                  setForm((p) => ({ ...p, patient_id: e.target.value }))
                }
                style={styles.input}
              >
                <option value="">Select patient…</option>
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
                onChange={(e) =>
                  setForm((p) => ({ ...p, shift_id: e.target.value }))
                }
                style={styles.input}
              >
                <option value="">Any shift</option>
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.start_time}–{s.end_time})
                  </option>
                ))}
              </select>
            </div>
            <div style={{ ...styles.field, gridColumn: "1/-1" }}>
              <label style={styles.label}>Task Title *</label>
              <input
                required
                value={form.title}
                onChange={(e) =>
                  setForm((p) => ({ ...p, title: e.target.value }))
                }
                style={styles.input}
                placeholder="e.g. Check vital signs"
              />
            </div>
            <div style={{ ...styles.field, gridColumn: "1/-1" }}>
              <label style={styles.label}>Description</label>
              <input
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                style={styles.input}
                placeholder="Optional details…"
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Priority</label>
              <select
                value={form.priority}
                onChange={(e) =>
                  setForm((p) => ({ ...p, priority: e.target.value }))
                }
                style={styles.input}
              >
                <option value={1}>Low</option>
                <option value={2}>Medium</option>
                <option value={3}>High</option>
              </select>
            </div>
            <div style={{ gridColumn: "1/-1", display: "flex", gap: 10 }}>
              <button
                type="submit"
                style={styles.btn}
                disabled={createMut.isPending}
              >
                {createMut.isPending ? "Saving…" : "Save"}
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

      {/* Filter tabs */}
      <div style={styles.tabs}>
        {["all", "pending", "in_progress", "done"].map((s) => (
          <button
            key={s}
            style={{ ...styles.tab, ...(filter === s ? styles.tabActive : {}) }}
            onClick={() => setFilter(s)}
          >
            {s === "all"
              ? "All"
              : s === "in_progress"
                ? "In Progress"
                : s.charAt(0).toUpperCase() + s.slice(1)}
            <span style={styles.tabCount}>
              {s === "all"
                ? tasks.length
                : tasks.filter((t) => t.status === s).length}
            </span>
          </button>
        ))}
      </div>

      {/* Task list */}
      <div style={styles.list}>
        {filtered.length === 0 && <p style={styles.empty}>No tasks.</p>}
        {filtered.map((task) => {
          const patient = patients.find((p) => p.id === task.patient_id);
          return (
            <div
              key={task.id}
              style={{
                ...styles.taskCard,
                opacity: task.status === "done" ? 0.6 : 1,
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
              <div style={{ flex: 1 }}>
                <div style={styles.taskTitle}>{task.title}</div>
                {task.description && (
                  <div style={styles.taskDesc}>{task.description}</div>
                )}
                <div style={styles.taskMeta}>
                  Patient: <b>{patient?.full_name || task.patient_id}</b>
                  {" · "}
                  <span style={{ color: priorityColor[task.priority] }}>
                    {priorityLabel[task.priority]} priority
                  </span>
                </div>
              </div>
              <button
                style={styles.btnDanger}
                onClick={() => deleteMut.mutate(task.id)}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  page: { padding: "28px 32px", maxWidth: 900, margin: "0 auto" },
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
  btnSecondary: {
    background: "#f3f4f6",
    color: "#374151",
    border: "none",
    borderRadius: 8,
    padding: "9px 16px",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: 14,
  },
  btnDanger: {
    background: "none",
    color: "#9ca3af",
    border: "none",
    cursor: "pointer",
    fontSize: 16,
    padding: 4,
  },
  iconBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 4,
    display: "flex",
    alignItems: "center",
  },
  formCard: {
    background: "#fff",
    borderRadius: 12,
    padding: "22px 24px",
    marginBottom: 20,
    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
  },
  formTitle: { margin: "0 0 14px", fontSize: 16, fontWeight: 600 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px" },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 13, fontWeight: 500, color: "#374151" },
  input: {
    border: "1px solid #d1d5db",
    borderRadius: 8,
    padding: "9px 11px",
    fontSize: 14,
    outline: "none",
  },
  tabs: { display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  tab: {
    background: "#f3f4f6",
    border: "none",
    borderRadius: 8,
    padding: "7px 14px",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  tabActive: { background: "#3b82f6", color: "#fff" },
  tabCount: {
    background: "rgba(0,0,0,0.12)",
    borderRadius: 99,
    padding: "1px 6px",
    fontSize: 11,
  },
  list: { display: "flex", flexDirection: "column", gap: 10 },
  empty: { color: "#9ca3af" },
  taskCard: {
    background: "#fff",
    borderRadius: 10,
    padding: "14px 16px",
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  taskTitle: { fontWeight: 600, fontSize: 15, color: "#111827" },
  taskDesc: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  taskMeta: { fontSize: 12, color: "#9ca3af", marginTop: 4 },
};
