import React, { useState } from "react";
import { Users, Activity, CheckCircle2, Clock } from "lucide-react";
import { useQueue } from "../context/QueueContext";
import { StatCard, Card, Skeleton } from "../components/ui";
import AddPatientForm from "../components/dashboard/AddPatientForm";
import QueueTable from "../components/dashboard/QueueTable";
import EditPatientModal from "../components/dashboard/EditPatientModal";
import ActivityFeed from "../components/dashboard/ActivityFeed";
import QueueControls from "../components/dashboard/QueueControls";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const { patients, paused, activity, departments, doctors, settings, loading } = useQueue();
  const [editing, setEditing] = useState(null);

  const canManage = user?.role === "admin" || user?.role === "receptionist";
  const avgTime = Number(settings.avg_consult_minutes || 10);

  const totalToday = patients.length;
  const activeQueue = patients.filter((p) => p.status === "waiting" || p.status === "active").length;
  const completed = patients.filter((p) => p.status === "completed").length;
  const activeNow = patients.find((p) => p.status === "active");
  const avgWait = patients.filter((p) => p.status === "waiting").length * avgTime;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-page-in">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={Users} label="Total patients" value={totalToday} tone="primary" delay={0} />
        <StatCard icon={Activity} label="Active queue" value={activeQueue} tone="info" delay={60} />
        <StatCard icon={CheckCircle2} label="Completed" value={completed} tone="success" delay={120} />
        <StatCard icon={Clock} label="Avg. wait time" value={avgWait} suffix=" min" tone="warning" delay={180} />
      </div>

      {canManage && (
        <QueueControls paused={paused} avgTime={avgTime} voiceOn={settings.voice_enabled === "true"} />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr_300px]">
        {canManage && <AddPatientForm departments={departments} doctors={doctors} />}
        <QueueTable
          patients={patients} departments={departments} doctors={doctors}
          paused={paused} onEdit={setEditing} canManage={canManage || user?.role === "doctor"}
        />
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="font-display text-base font-semibold text-[var(--text)] mb-3">Now serving</h3>
            {activeNow ? (
              <div className="rounded-xl border border-[var(--primary)]/25 bg-[var(--primary-soft)] p-4">
                <p className="font-display text-3xl font-bold tabular-nums text-[var(--primary)]">#{activeNow.token}</p>
                <p className="mt-1 text-sm font-medium text-[var(--text)]">{activeNow.name}</p>
                <p className="text-xs text-[var(--text-muted)]">{activeNow.doctor_room}</p>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--border-strong)] p-4 text-center text-sm text-[var(--text-muted)]">
                No patient currently in consultation.
              </div>
            )}
          </Card>
          <ActivityFeed items={activity} />
        </div>
      </div>

      <Card className="flex flex-col gap-2 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[var(--text-muted)]">
          <span>Waiting: <strong className="text-[var(--text)]">{patients.filter((p) => p.status === "waiting").length}</strong></span>
          <span>Skipped: <strong className="text-[var(--text)]">{patients.filter((p) => p.status === "skipped").length}</strong></span>
          <span>Cancelled: <strong className="text-[var(--text)]">{patients.filter((p) => p.status === "cancelled").length}</strong></span>
          <span>Emergency: <strong className="text-[var(--text)]">{patients.filter((p) => p.priority).length}</strong></span>
        </div>
        <div className="flex items-center gap-1.5 text-[var(--success)]">
          <span className="relative flex h-2 w-2"><span className="absolute h-2 w-2 animate-ping-slow rounded-full bg-[var(--success)]" /><span className="h-2 w-2 rounded-full bg-[var(--success)]" /></span>
          System operational
        </div>
      </Card>

      {editing && (
        <EditPatientModal patient={editing} departments={departments} doctors={doctors} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
