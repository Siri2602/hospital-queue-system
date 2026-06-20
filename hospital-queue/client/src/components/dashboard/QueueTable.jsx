import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Search, PhoneCall, SkipForward, XCircle, CheckCircle2, RotateCcw,
  ArrowRightLeft, Trash2, Edit3, AlertTriangle, Users, Pause,
} from "lucide-react";
import api, { apiErrorMessage } from "../../lib/api";
import { Card, Badge, IconButton, EmptyState, cx } from "../ui";
import { useToast } from "../ToastContext";

const STATUS_META = {
  waiting: { label: "Waiting", tone: "info" },
  active: { label: "In Consultation", tone: "primary" },
  completed: { label: "Completed", tone: "success" },
  skipped: { label: "Skipped", tone: "warning" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "waiting", label: "Waiting" },
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
  { id: "skipped", label: "Skipped" },
  { id: "cancelled", label: "Cancelled" },
];

const ORDER = { active: 0, waiting: 1, skipped: 2, completed: 3, cancelled: 4 };

export default function QueueTable({ patients, departments, doctors, paused, onEdit, canManage }) {
  const showToast = useToast();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [busyId, setBusyId] = useState(null);

  const filtered = useMemo(() => {
    return patients
      .filter((p) => {
        if (filter !== "all" && p.status !== filter) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          return p.name.toLowerCase().includes(q) || String(p.token).includes(q) || p.phone.includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        if (ORDER[a.status] !== ORDER[b.status]) return ORDER[a.status] - ORDER[b.status];
        if (a.priority !== b.priority) return a.priority ? -1 : 1;
        return a.created_at - b.created_at;
      });
  }, [patients, search, filter]);

  const act = async (action, patient, payload) => {
    setBusyId(patient.id);
    try {
      if (action === "delete") {
        await api.delete(`/patients/${patient.id}`);
      } else if (action === "transfer") {
        await api.post(`/patients/${patient.id}/transfer`, payload);
        showToast(`Token #${patient.token} transferred`, "primary");
      } else {
        await api.post(`/patients/${patient.id}/${action}`);
        const messages = {
          call: `Calling token #${patient.token}`,
          skip: `Token #${patient.token} skipped`,
          recall: `Token #${patient.token} recalled`,
          cancel: `Token #${patient.token} cancelled`,
          complete: `Token #${patient.token} completed`,
        };
        showToast(messages[action], action === "cancel" ? "danger" : action === "skip" ? "warning" : "primary");
      }
    } catch (err) {
      showToast(apiErrorMessage(err, "Action could not be completed."), "danger");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-base font-semibold text-[var(--text)]">Live queue</h3>
          {paused && <Badge tone="warning"><Pause size={11} /> Paused</Badge>}
        </div>
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:justify-end">
          <div className="relative flex-1 sm:max-w-[220px]">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, token, phone" className="input pl-9" aria-label="Search patients" />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 sm:pb-0">
            {FILTERS.map((f) => (
              <button
                key={f.id} onClick={() => setFilter(f.id)}
                className={cx(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
                  filter === f.id ? "bg-[var(--primary)] text-white shadow-sm" : "bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)]"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
              <th className="px-4 py-3">Token</th>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3 hidden md:table-cell">Department / Doctor</th>
              <th className="px-4 py-3 hidden lg:table-cell">Phone</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 hidden xl:table-cell">Wait</th>
              {canManage && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={canManage ? 7 : 6}><EmptyState icon={Users} title="No patients match this view" description="Try a different filter or search term." /></td></tr>
            )}
            {filtered.map((p, i) => (
              <tr key={p.id} className="border-b border-[var(--border)] last:border-0 animate-row-in transition-colors duration-200 hover:bg-[var(--surface-2)]" style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-base font-semibold tabular-nums text-[var(--text)]">#{p.token}</span>
                    {!!p.priority && <AlertTriangle size={14} className="text-[var(--danger)]" aria-label="Emergency" />}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-[var(--text)]">{p.name}</div>
                  {p.notes && <div className="text-xs text-[var(--text-muted)] line-clamp-1 max-w-[180px]">{p.notes}</div>}
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <div className="text-[var(--text)]">{p.department_name}</div>
                  <div className="text-xs text-[var(--text-muted)]">{p.doctor_name || "Unassigned"}</div>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-[var(--text-muted)] tabular-nums">{p.phone}</td>
                <td className="px-4 py-3"><Badge tone={STATUS_META[p.status].tone}>{STATUS_META[p.status].label}</Badge></td>
                <td className="px-4 py-3 hidden xl:table-cell text-[var(--text-muted)] tabular-nums">
                  {p.status === "waiting" ? `#${p.position} · ${p.eta_minutes ?? "—"} min` : "—"}
                </td>
                {canManage && (
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {p.status === "waiting" && (
                        <>
                          <IconButton icon={PhoneCall} label="Call patient" tone="primary" disabled={busyId === p.id || paused} onClick={() => act("call", p)} />
                          <IconButton icon={SkipForward} label="Skip patient" tone="warning" disabled={busyId === p.id} onClick={() => act("skip", p)} />
                          <IconButton icon={XCircle} label="Cancel patient" tone="danger" disabled={busyId === p.id} onClick={() => act("cancel", p)} />
                        </>
                      )}
                      {p.status === "active" && (
                        <IconButton icon={CheckCircle2} label="Mark complete" tone="success" disabled={busyId === p.id} onClick={() => act("complete", p)} />
                      )}
                      {p.status === "skipped" && (
                        <IconButton icon={RotateCcw} label="Recall patient" tone="primary" disabled={busyId === p.id || paused} onClick={() => act("recall", p)} />
                      )}
                      {(p.status === "waiting" || p.status === "skipped") && (
                        <TransferMenu departments={departments} current={p.department_id} onTransfer={(deptId) => act("transfer", p, { department_id: deptId })} />
                      )}
                      <IconButton icon={Edit3} label="Edit patient" onClick={() => onEdit(p)} />
                      <IconButton icon={Trash2} label="Delete patient" tone="danger" disabled={busyId === p.id} onClick={() => act("delete", p)} />
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function TransferMenu({ departments, current, onTransfer }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <IconButton icon={ArrowRightLeft} label="Transfer department" onClick={() => setOpen((o) => !o)} />
      {open && (
        <div className="absolute right-0 top-10 z-20 w-48 origin-top-right rounded-xl border border-[var(--border)] bg-[var(--card)] p-1.5 shadow-[var(--shadow-card-hover)] animate-expand">
          <p className="px-2.5 py-1 text-xs font-medium text-[var(--text-muted)]">Transfer to department</p>
          {departments.filter((d) => d.id !== current).map((d) => (
            <button key={d.id} onClick={() => { onTransfer(d.id); setOpen(false); }} className="block w-full rounded-lg px-2.5 py-1.5 text-left text-sm text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors">
              {d.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
