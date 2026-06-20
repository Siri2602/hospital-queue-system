import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import api, { apiErrorMessage } from "../../lib/api";
import { Field, Select, Toggle, Spinner } from "../ui";
import { useToast } from "../ToastContext";

export default function EditPatientModal({ patient, departments, doctors, onClose }) {
  const showToast = useToast();
  const [name, setName] = useState(patient.name);
  const [phone, setPhone] = useState(patient.phone);
  const [departmentId, setDepartmentId] = useState(String(patient.department_id));
  const [doctorId, setDoctorId] = useState(patient.doctor_id ? String(patient.doctor_id) : "");
  const [notes, setNotes] = useState(patient.notes || "");
  const [priority, setPriority] = useState(!!patient.priority);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const deptDoctors = doctors.filter((d) => d.department_id === Number(departmentId));

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError("Patient name is required.");
    if (phone.trim().replace(/\D/g, "").length < 7) return setError("Enter a valid phone number.");
    setError("");
    setSaving(true);
    try {
      await api.put(`/patients/${patient.id}`, {
        name: name.trim(), phone: phone.trim(),
        department_id: Number(departmentId),
        doctor_id: doctorId ? Number(doctorId) : null,
        notes: notes.trim(), priority,
      });
      showToast(`Token #${patient.token} updated`, "success");
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not save changes."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" role="dialog" aria-modal="true" aria-label="Edit patient">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-card-hover)] animate-expand">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-base font-semibold text-[var(--text)]">Edit patient — Token #{patient.token}</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"><X size={18} /></button>
        </div>

        <form onSubmit={submit} className="space-y-3.5" noValidate>
          <Field label="Full name" htmlFor="e-name">
            <input id="e-name" value={name} onChange={(e) => setName(e.target.value)} className="input" />
          </Field>
          <Field label="Phone number" htmlFor="e-phone">
            <input id="e-phone" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d+ ]/g, ""))} className="input" inputMode="tel" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Department" htmlFor="e-dept">
              <Select id="e-dept" value={departmentId} onChange={setDepartmentId} options={departments} getValue={(d) => String(d.id)} getLabel={(d) => d.name} />
            </Field>
            <Field label="Doctor" htmlFor="e-doc">
              <Select id="e-doc" value={doctorId} onChange={setDoctorId} options={deptDoctors} getValue={(d) => String(d.id)} getLabel={(d) => d.name} placeholder="Unassigned" />
            </Field>
          </div>
          <Field label="Notes" htmlFor="e-notes">
            <textarea id="e-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="input resize-none" />
          </Field>
          <label className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2.5 cursor-pointer">
            <span className="text-sm font-medium text-[var(--text)]">Emergency priority</span>
            <Toggle checked={priority} onChange={setPriority} label="Emergency priority" />
          </label>

          {error && <p className="text-sm text-[var(--danger)] animate-fade-in" role="alert">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? <Spinner size={15} /> : "Save changes"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
