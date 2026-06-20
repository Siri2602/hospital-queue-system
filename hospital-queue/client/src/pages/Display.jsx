import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Stethoscope, Building2, Activity, Users, Clock, ArrowRightLeft,
  Heart, Megaphone, Pause, QrCode,
} from "lucide-react";
import { useQueue } from "../context/QueueContext";
import { Card, Badge, Skeleton, cx } from "../components/ui";

const HEALTH_TIPS = [
  "Stay hydrated — aim for 8 glasses of water a day.",
  "A short walk after meals supports healthy digestion.",
  "Wash your hands regularly to prevent infections.",
  "7–8 hours of sleep helps your body recover and heal.",
  "Carry your previous prescriptions for faster consultations.",
];

const ANNOUNCEMENTS = [
  "Please keep your phone on silent inside consultation rooms.",
  "Pharmacy is located on the ground floor, next to reception.",
  "Visiting hours: 10:00 AM – 1:00 PM and 5:00 PM – 7:00 PM.",
];

export default function Display() {
  const { patients, paused, doctors, settings, loading } = useQueue();
  const [tipIndex, setTipIndex] = useState(0);
  const [annIndex, setAnnIndex] = useState(0);
  const [now, setNow] = useState(new Date());

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { const t = setInterval(() => setTipIndex((i) => (i + 1) % HEALTH_TIPS.length), 6000); return () => clearInterval(t); }, []);
  useEffect(() => { const t = setInterval(() => setAnnIndex((i) => (i + 1) % ANNOUNCEMENTS.length), 8000); return () => clearInterval(t); }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64" />
        <div className="grid grid-cols-3 gap-4"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
      </div>
    );
  }

  const active = patients.find((p) => p.status === "active");
  const waiting = patients.filter((p) => p.status === "waiting").sort((a, b) => {
    if (a.priority !== b.priority) return a.priority ? -1 : 1;
    return a.created_at - b.created_at;
  });
  const next = waiting[0];
  const waitingCount = waiting.length;
  const estWait = active ? (next?.eta_minutes ?? waitingCount * Number(settings.avg_consult_minutes || 10)) : 0;
  const hospitalName = settings.hospital_name || "Hospital";
  const trackUrl = `${window.location.origin}/track`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary)] text-white"><Stethoscope size={20} /></div>
          <div>
            <p className="font-display text-lg font-semibold text-[var(--text)] leading-tight">{hospitalName}</p>
            <p className="text-xs text-[var(--text-muted)]">{settings.hospital_tagline || "Outpatient Queue Display"}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-semibold tabular-nums text-[var(--text)]">{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
          <p className="text-xs text-[var(--text-muted)]">{now.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
      </div>

      {paused && (
        <div className="flex items-center gap-2 rounded-xl border border-[var(--warning)]/30 bg-[var(--warning-soft)] px-4 py-2.5 text-sm font-medium text-[var(--warning)] animate-fade-in">
          <Pause size={15} /> The queue is currently paused. New tokens will not be called.
        </div>
      )}

      <Card className="relative overflow-hidden p-8 sm:p-10">
        <div className="hero-glow" aria-hidden="true" />
        <div className="relative grid gap-8 sm:grid-cols-2 sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Now serving</p>
            <div key={active?.token || "none"} className="mt-2 animate-token-in">
              <span className="font-display font-bold tabular-nums text-[var(--primary)] text-[5.5rem] leading-none sm:text-[7rem]">
                {active ? `#${active.token}` : "—"}
              </span>
            </div>
            <p className="mt-3 text-lg font-medium text-[var(--text)]">{active?.name || "Waiting for next patient"}</p>
          </div>
          <div className="space-y-3">
            <InfoRow icon={Stethoscope} label="Doctor" value={active?.doctor_name || next?.doctor_name || "—"} />
            <InfoRow icon={Building2} label="Room" value={active?.doctor_room || next?.doctor_room || "—"} />
            <InfoRow icon={Activity} label="Queue status" value={paused ? "Paused" : "Running"} valueTone={paused ? "warning" : "success"} />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DisplayStat label="Next token" value={next ? `#${next.token}` : "—"} icon={ArrowRightLeft} />
        <DisplayStat label="Patients waiting" value={String(waitingCount)} icon={Users} />
        <DisplayStat label="Estimated wait" value={`${estWait} min`} icon={Clock} />
      </div>

      <Card className="p-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-[var(--text)]">Queue progress</span>
          <span className="text-[var(--text-muted)]">{patients.filter((p) => p.status === "completed").length} of {patients.length} seen today</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
          <div
            className="h-full rounded-full bg-[var(--primary)] transition-all duration-700 ease-out"
            style={{ width: `${patients.length ? (patients.filter((p) => p.status === "completed").length / patients.length) * 100 : 0}%` }}
          />
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5 overflow-hidden sm:col-span-2">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--success)]"><Heart size={15} /> Health tip</div>
          <p key={tipIndex} className="text-[var(--text)] animate-fade-in min-h-[3rem]">{HEALTH_TIPS[tipIndex]}</p>
        </Card>
        <Card className="p-5 overflow-hidden sm:col-span-2">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--info)]"><Megaphone size={15} /> Hospital announcement</div>
          <p key={annIndex} className="text-[var(--text)] animate-fade-in min-h-[3rem]">{ANNOUNCEMENTS[annIndex]}</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
        <Card className="p-5">
          <h3 className="font-display text-base font-semibold text-[var(--text)] mb-3">Doctor availability</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {doctors.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2.5">
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">{d.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{d.department_name} · {d.room}</p>
                </div>
                <Badge tone={d.available ? "success" : "neutral"}>{d.available ? "Available" : "Unavailable"}</Badge>
              </div>
            ))}
          </div>
        </Card>
        <Card className="flex flex-col items-center justify-center gap-3 p-5 text-center">
          <div className="rounded-xl bg-white p-2"><QRCodeSVG value={trackUrl} size={120} /></div>
          <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--text)]"><QrCode size={14} /> Track your token</p>
          <p className="text-xs text-[var(--text-muted)]">Scan to check your position and wait time on your phone.</p>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, valueTone }) {
  const toneMap = { success: "text-[var(--success)]", warning: "text-[var(--warning)]" };
  return (
    <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
      <span className="flex items-center gap-2 text-sm text-[var(--text-muted)]"><Icon size={15} /> {label}</span>
      <span className={cx("font-display text-base font-semibold", valueTone ? toneMap[valueTone] : "text-[var(--text)]")}>{value}</span>
    </div>
  );
}

function DisplayStat({ label, value, icon: Icon }) {
  return (
    <Card className="p-5 flex items-center gap-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]"><Icon size={18} /></div>
      <div>
        <p className="text-xs text-[var(--text-muted)]">{label}</p>
        <p className="font-display text-2xl font-semibold tabular-nums text-[var(--text)]">{value}</p>
      </div>
    </Card>
  );
}
