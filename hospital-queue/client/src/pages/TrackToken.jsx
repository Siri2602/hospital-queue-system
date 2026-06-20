import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Stethoscope, Search, Clock, Users, ArrowRightLeft, Pause } from "lucide-react";
import axios from "axios";
import { API_BASE } from "../lib/api";
import { Card, Badge, Spinner } from "../components/ui";

export default function TrackToken() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(token || "");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!!token);

  useEffect(() => {
    if (!token) return;
    let active = true;
    const load = () => {
      axios
        .get(`${API_BASE}/api/public/token/${token}`)
        .then((res) => { if (active) { setData(res.data); setError(""); } })
        .catch((err) => { if (active) setError(err.response?.data?.error || "Could not load your token status."); })
        .finally(() => active && setLoading(false));
    };
    load();
    const interval = setInterval(load, 5000);
    return () => { active = false; clearInterval(interval); };
  }, [token]);

  const submit = (e) => {
    e.preventDefault();
    if (input.trim()) navigate(`/track/${input.trim().replace(/\D/g, "")}`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4 py-10 text-[var(--text)]">
      <div className="w-full max-w-md animate-rise">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary)] text-white"><Stethoscope size={22} /></div>
          <h1 className="font-display text-xl font-semibold">{data?.hospital_name || "Track your token"}</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Enter your token number to check live queue status</p>
        </div>

        <Card className="p-5">
          <form onSubmit={submit} className="mb-4 flex gap-2">
            <div className="relative flex-1">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                value={input} onChange={(e) => setInput(e.target.value.replace(/\D/g, ""))}
                placeholder="e.g. 24" inputMode="numeric" className="input pl-9" aria-label="Token number"
              />
            </div>
            <button type="submit" className="btn-primary">Check</button>
          </form>

          {loading && (
            <div className="flex items-center justify-center py-8 text-[var(--text-muted)]"><Spinner size={20} /></div>
          )}

          {!loading && error && (
            <p className="text-center text-sm text-[var(--danger)] animate-fade-in" role="alert">{error}</p>
          )}

          {!loading && data && !error && (
            <div className="space-y-3 animate-fade-in">
              {data.queue_paused && (
                <div className="flex items-center gap-2 rounded-xl border border-[var(--warning)]/30 bg-[var(--warning-soft)] px-3.5 py-2 text-xs font-medium text-[var(--warning)]">
                  <Pause size={13} /> The queue is currently paused.
                </div>
              )}
              <div className="rounded-xl bg-[var(--primary-soft)] p-4 text-center">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--primary)]">Your token</p>
                <p className="font-display text-4xl font-bold tabular-nums text-[var(--primary)]">#{data.patient.token}</p>
                <p className="mt-1 text-sm text-[var(--text)]">{data.patient.name}</p>
                <Badge tone={statusTone(data.patient.status)}>{statusLabel(data.patient.status)}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Stat icon={ArrowRightLeft} label="Now serving" value={data.now_serving ? `#${data.now_serving}` : "—"} />
                <Stat icon={Users} label="Your position" value={data.patient.position ? `#${data.patient.position}` : "—"} />
                <Stat icon={Clock} label="Estimated wait" value={data.patient.eta_minutes != null ? `${data.patient.eta_minutes} min` : "—"} />
                <Stat icon={Stethoscope} label="Doctor / Room" value={`${data.patient.doctor || "—"}${data.patient.room ? ` · ${data.patient.room}` : ""}`} />
              </div>

              <p className="text-center text-xs text-[var(--text-muted)]">This page refreshes automatically every few seconds.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-[var(--text-muted)]"><Icon size={13} /> {label}</div>
      <p className="text-sm font-semibold text-[var(--text)]">{value}</p>
    </div>
  );
}

function statusLabel(s) {
  return { waiting: "Waiting", active: "In Consultation", completed: "Completed", skipped: "Skipped", cancelled: "Cancelled" }[s] || s;
}
function statusTone(s) {
  return { waiting: "info", active: "primary", completed: "success", skipped: "warning", cancelled: "danger" }[s] || "neutral";
}
