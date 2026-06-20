import React, { useEffect, useState } from "react";
import { Plus, CheckCircle2, AlertTriangle } from "lucide-react";
import api, { apiErrorMessage } from "../../lib/api";
import { Card, Field, Select, Toggle, Spinner } from "../ui";
import { useToast } from "../ToastContext";

export default function AddPatientForm({ departments, doctors }) {
  const showToast = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState(false);
  const [manualToken, setManualToken] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    if (departments.length && !departmentId) setDepartmentId(String(departments[0].id));
  }, [departments]); // eslint-disable-line

  const deptDoctors = doctors.filter((d) => d.department_id === Number(departmentId));

  useEffect(() => {
    if (deptDoctors.length && !deptDoctors.find((d) => d.id === Number(doctorId))) {
      setDoctorId(String(deptDoctors[0].id));
    } else if (!deptDoctors.length) {
      setDoctorId("");
    }
  }, [departmentId, doctors]); // eslint-disable-line

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError("Patient name is required.");
    if (phone.trim().replace(/\D/g, "").length < 7) return setError("Enter a valid phone number.");
    if (manualToken && (!Number.isInteger(+manualToken) || +manualToken <= 0)) {
      return setError("Token override must be a positive number.");
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await api.post("/patients", {
        name: name.trim(),
        phone: phone.trim(),
        department_id: Number(departmentId),
        doctor_id: doctorId ? Number(doctorId) : null,
        notes: notes.trim(),
        priority,
        manual_token: manualToken || undefined,
      });
      setName(""); setPhone(""); setNotes(""); setManualToken(""); setPriority(false);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1400);
      showToast(`Token #${res.data.patient.token} issued to ${res.data.patient.name}`, "success");
    } catch (err) {
      setError(apiErrorMessage(err, "Could not add patient. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-base font-semibold text-[var(--text)]">Add new patient</h3>
        {justAdded && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--success)] animate-fade-in">
            <CheckCircle2 size={14} /> Token issued
          </span>
        )}
      </div>

      <form onSubmit={submit} className="space-y-3.5" noValidate>
        <Field label="Full name" htmlFor="p-name">
          <input id="p-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Asha Reddy" className="input" autoComplete="off" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone number" htmlFor="p-phone">
            <input
              id="p-phone" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d+ ]/g, ""))}
              placeholder="9876543210" className="input" inputMode="tel"
            />
          </Field>
          <Field label="Manual token (optional)" htmlFor="p-token">
            <input
              id="p-token" value={manualToken} onChange={(e) => setManualToken(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="auto" className="input" inputMode="numeric"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Department" htmlFor="p-dept">
            <Select id="p-dept" value={departmentId} onChange={setDepartmentId} options={departments} getValue={(d) => String(d.id)} getLabel={(d) => d.name} />
          </Field>
          <Field label="Doctor" htmlFor="p-doc">
            <Select
              id="p-doc" value={doctorId} onChange={setDoctorId}
              options={deptDoctors} getValue={(d) => String(d.id)}
              getLabel={(d) => `${d.name}${d.available ? "" : " (Unavailable)"}`}
              placeholder={deptDoctors.length ? undefined : "No doctors available"}
            />
          </Field>
        </div>

        <Field label="Notes (optional)" htmlFor="p-notes">
          <textarea id="p-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason for visit, allergies, etc." rows={2} className="input resize-none" />
        </Field>

        <label className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2.5 cursor-pointer">
          <span className="flex items-center gap-2 text-sm font-medium text-[var(--text)]">
            <AlertTriangle size={15} className="text-[var(--danger)]" /> Emergency priority
          </span>
          <Toggle checked={priority} onChange={setPriority} label="Emergency priority" />
        </label>

        {error && <p className="text-sm text-[var(--danger)] animate-fade-in" role="alert">{error}</p>}

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? <Spinner size={15} /> : <><Plus size={16} /> Generate token &amp; add to queue</>}
        </button>
      </form>
    </Card>
  );
}
