import React, { useEffect, useState } from "react";
import { Plus, Trash2, Save, Building2, Stethoscope, Volume2, Monitor } from "lucide-react";
import api, { apiErrorMessage } from "../lib/api";
import { useQueue } from "../context/QueueContext";
import { Card, Field, Select, Toggle, Spinner, EmptyState } from "../components/ui";
import { useToast } from "../components/ToastContext";

export default function SettingsPage() {
  const { departments, doctors, settings } = useQueue();
  const showToast = useToast();

  return (
    <div className="space-y-6 animate-page-in">
      <h2 className="font-display text-lg font-semibold text-[var(--text)]">Settings</h2>
      <HospitalInfo settings={settings} showToast={showToast} />
      <div className="grid gap-6 lg:grid-cols-2">
        <DepartmentManager departments={departments} showToast={showToast} />
        <DoctorManager departments={departments} doctors={doctors} showToast={showToast} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <DisplaySettings settings={settings} showToast={showToast} />
        <VoiceSettings settings={settings} showToast={showToast} />
      </div>
    </div>
  );
}

function SectionCard({ icon: Icon, title, children }) {
  return (
    <Card className="p-5">
      <h3 className="font-display text-base font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
        <Icon size={16} className="text-[var(--primary)]" /> {title}
      </h3>
      {children}
    </Card>
  );
}

function HospitalInfo({ settings, showToast }) {
  const [name, setName] = useState(settings.hospital_name || "");
  const [tagline, setTagline] = useState(settings.hospital_tagline || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(settings.hospital_name || "");
    setTagline(settings.hospital_tagline || "");
  }, [settings.hospital_name, settings.hospital_tagline]);

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/settings", { hospital_name: name.trim(), hospital_tagline: tagline.trim() });
      showToast("Hospital information updated", "success");
    } catch (err) {
      showToast(apiErrorMessage(err), "danger");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard icon={Building2} title="Hospital information">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Hospital name"><input value={name} onChange={(e) => setName(e.target.value)} className="input" /></Field>
        <Field label="Display tagline"><input value={tagline} onChange={(e) => setTagline(e.target.value)} className="input" /></Field>
      </div>
      <button onClick={save} disabled={saving} className="btn-primary mt-4">{saving ? <Spinner size={15} /> : <><Save size={15} /> Save</>}</button>
    </SectionCard>
  );
}

function DepartmentManager({ departments, showToast }) {
  const [name, setName] = useState("");
  const [time, setTime] = useState(10);
  const [busy, setBusy] = useState(false);

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await api.post("/departments", { name: name.trim(), avg_consult_minutes: Number(time) });
      setName(""); setTime(10);
      showToast("Department added", "success");
    } catch (err) {
      showToast(apiErrorMessage(err), "danger");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/departments/${id}`);
      showToast("Department removed", "primary");
    } catch (err) {
      showToast(apiErrorMessage(err), "danger");
    }
  };

  const updateTime = async (id, minutes) => {
    try {
      await api.put(`/departments/${id}`, { avg_consult_minutes: Number(minutes) });
    } catch (err) {
      showToast(apiErrorMessage(err), "danger");
    }
  };

  return (
    <SectionCard icon={Building2} title="Department management">
      <form onSubmit={add} className="mb-4 flex flex-wrap gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New department name" className="input flex-1 min-w-[140px]" />
        <input type="number" min={1} max={60} value={time} onChange={(e) => setTime(e.target.value)} className="input w-24" aria-label="Average consultation time" />
        <button type="submit" disabled={busy} className="btn-primary"><Plus size={15} /> Add</button>
      </form>
      <div className="space-y-2">
        {departments.length === 0 && <EmptyState title="No departments yet" />}
        {departments.map((d) => (
          <div key={d.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2.5">
            <span className="text-sm font-medium text-[var(--text)]">{d.name}</span>
            <div className="flex items-center gap-2">
              <input
                type="number" min={1} max={60} defaultValue={d.avg_consult_minutes}
                onBlur={(e) => updateTime(d.id, e.target.value)}
                className="input w-16 px-2 py-1 text-center text-xs" aria-label={`Average consultation time for ${d.name}`}
              />
              <span className="text-xs text-[var(--text-muted)]">min</span>
              <button onClick={() => remove(d.id)} className="rounded-lg p-1.5 text-[var(--danger)] hover:bg-[var(--danger-soft)]" aria-label={`Remove ${d.name}`}><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function DoctorManager({ departments, doctors, showToast }) {
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [room, setRoom] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (departments.length && !departmentId) setDepartmentId(String(departments[0].id));
  }, [departments]); // eslint-disable-line

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim() || !room.trim() || !departmentId) return;
    setBusy(true);
    try {
      await api.post("/doctors", { name: name.trim(), department_id: Number(departmentId), room: room.trim() });
      setName(""); setRoom("");
      showToast("Doctor added", "success");
    } catch (err) {
      showToast(apiErrorMessage(err), "danger");
    } finally {
      setBusy(false);
    }
  };

  const toggleAvailable = async (doc) => {
    try {
      await api.put(`/doctors/${doc.id}`, { available: !doc.available });
    } catch (err) {
      showToast(apiErrorMessage(err), "danger");
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/doctors/${id}`);
      showToast("Doctor removed", "primary");
    } catch (err) {
      showToast(apiErrorMessage(err), "danger");
    }
  };

  return (
    <SectionCard icon={Stethoscope} title="Doctor management">
      <form onSubmit={add} className="mb-4 flex flex-wrap gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Doctor name" className="input flex-1 min-w-[140px]" />
        <Select value={departmentId} onChange={setDepartmentId} options={departments} getValue={(d) => String(d.id)} getLabel={(d) => d.name} />
        <input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Room" className="input w-24" />
        <button type="submit" disabled={busy} className="btn-primary"><Plus size={15} /> Add</button>
      </form>
      <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
        {doctors.length === 0 && <EmptyState title="No doctors yet" />}
        {doctors.map((d) => (
          <div key={d.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2.5">
            <div>
              <p className="text-sm font-medium text-[var(--text)]">{d.name}</p>
              <p className="text-xs text-[var(--text-muted)]">{d.department_name} · {d.room}</p>
            </div>
            <div className="flex items-center gap-2">
              <Toggle checked={!!d.available} onChange={() => toggleAvailable(d)} label={`Toggle availability for ${d.name}`} />
              <button onClick={() => remove(d.id)} className="rounded-lg p-1.5 text-[var(--danger)] hover:bg-[var(--danger-soft)]" aria-label={`Remove ${d.name}`}><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function DisplaySettings({ settings, showToast }) {
  const [theme, setTheme] = useState(settings.display_theme || "light");

  useEffect(() => setTheme(settings.display_theme || "light"), [settings.display_theme]);

  const update = async (value) => {
    setTheme(value);
    try {
      await api.put("/settings", { display_theme: value });
      showToast("Display settings updated", "success");
    } catch (err) {
      showToast(apiErrorMessage(err), "danger");
    }
  };

  return (
    <SectionCard icon={Monitor} title="Display settings">
      <Field label="Patient display board default theme" hint="Controls the default appearance of the waiting room screen.">
        <Select value={theme} onChange={update} options={["light", "dark"]} getLabel={(o) => o === "light" ? "Light" : "Dark"} />
      </Field>
    </SectionCard>
  );
}

function VoiceSettings({ settings, showToast }) {
  const [enabled, setEnabled] = useState(settings.voice_enabled === "true");
  const [language, setLanguage] = useState(settings.voice_language || "en-US");
  const [volume, setVolume] = useState(Number(settings.voice_volume ?? 1));
  const [autoRepeat, setAutoRepeat] = useState(settings.voice_auto_repeat === "true");

  useEffect(() => {
    setEnabled(settings.voice_enabled === "true");
    setLanguage(settings.voice_language || "en-US");
    setVolume(Number(settings.voice_volume ?? 1));
    setAutoRepeat(settings.voice_auto_repeat === "true");
  }, [settings]);

  const update = async (payload) => {
    try {
      await api.put("/settings", payload);
    } catch (err) {
      showToast(apiErrorMessage(err), "danger");
    }
  };

  const LANGS = [
    { code: "en-US", label: "English (US)" },
    { code: "en-IN", label: "English (India)" },
    { code: "hi-IN", label: "Hindi" },
    { code: "es-ES", label: "Spanish" },
  ];

  return (
    <SectionCard icon={Volume2} title="Voice announcement settings">
      <div className="space-y-4">
        <label className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2.5 cursor-pointer">
          <span className="text-sm font-medium text-[var(--text)]">Enable voice announcements</span>
          <Toggle checked={enabled} onChange={(v) => { setEnabled(v); update({ voice_enabled: String(v) }); }} label="Enable voice announcements" />
        </label>

        <Field label="Language">
          <Select value={language} onChange={(v) => { setLanguage(v); update({ voice_language: v }); }} options={LANGS} getValue={(l) => l.code} getLabel={(l) => l.label} />
        </Field>

        <Field label={`Volume — ${Math.round(volume * 100)}%`}>
          <input
            type="range" min={0} max={1} step={0.05} value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            onMouseUp={(e) => update({ voice_volume: e.target.value })}
            onTouchEnd={(e) => update({ voice_volume: e.target.value })}
            className="w-full accent-[var(--primary)]"
          />
        </Field>

        <label className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2.5 cursor-pointer">
          <span className="text-sm font-medium text-[var(--text)]">Auto repeat announcement</span>
          <Toggle checked={autoRepeat} onChange={(v) => { setAutoRepeat(v); update({ voice_auto_repeat: String(v) }); }} label="Auto repeat announcement" />
        </label>
      </div>
    </SectionCard>
  );
}
