const express = require("express");
const { db, nextToken } = require("../db");
const { authenticate, authorize } = require("../auth");
const { getQueueSnapshot, getSetting, setSetting } = require("../wait-engine");

const router = express.Router();

const today = () => db.prepare("SELECT date('now') AS d").get().d;

function logActivity(text, tone = "primary") {
  db.prepare("INSERT INTO activity_log (text, tone) VALUES (?, ?)").run(text, tone);
}

function broadcast(req, extra = {}) {
  const snapshot = getQueueSnapshot(today());
  const activity = db
    .prepare("SELECT * FROM activity_log ORDER BY id DESC LIMIT 30")
    .all();
  req.app.get("emitUpdate")("queue-updated", { ...snapshot, activity, ...extra });
  return snapshot;
}

/* GET /api/queue --------------------------------------------------- */
// Full snapshot for dashboard / display board (any authenticated role)
router.get("/queue", authenticate, (req, res) => {
  const snapshot = getQueueSnapshot(req.query.date || today());
  const activity = db.prepare("SELECT * FROM activity_log ORDER BY id DESC LIMIT 30").all();
  res.json({ ...snapshot, activity });
});

/* POST /api/patients -------------------------------------------------- */
// Add new patient — receptionist/admin only
router.post("/patients", authenticate, authorize("admin", "receptionist"), (req, res) => {
  const { name, phone, department_id, doctor_id, notes, priority, manual_token } = req.body || {};

  if (!name?.trim()) return res.status(400).json({ error: "Patient name is required." });
  if (!phone?.trim() || phone.trim().replace(/\D/g, "").length < 7) {
    return res.status(400).json({ error: "Enter a valid phone number." });
  }
  if (!department_id) return res.status(400).json({ error: "Department is required." });

  const dept = db.prepare("SELECT * FROM departments WHERE id = ?").get(department_id);
  if (!dept) return res.status(400).json({ error: "Selected department does not exist." });

  let token;
  if (manual_token) {
    const n = Number(manual_token);
    if (!Number.isInteger(n) || n <= 0) {
      return res.status(400).json({ error: "Manual token must be a positive whole number." });
    }
    const clash = db
      .prepare("SELECT 1 FROM patients WHERE token = ? AND queue_date = ? AND status != 'cancelled'")
      .get(n, today());
    if (clash) return res.status(409).json({ error: `Token #${n} is already in use today.` });
    token = n;
  } else {
    token = nextToken();
  }

  const info = db
    .prepare(
      `INSERT INTO patients (token, name, phone, department_id, doctor_id, notes, status, priority, queue_date)
       VALUES (?, ?, ?, ?, ?, ?, 'waiting', ?, ?)`
    )
    .run(token, name.trim(), phone.trim(), department_id, doctor_id || null, (notes || "").trim(), priority ? 1 : 0, today());

  logActivity(
    `New patient ${name.trim()} registered — token #${token}${priority ? " (Emergency)" : ""}.`,
    priority ? "danger" : "info"
  );

  const snapshot = broadcast(req);
  const patient = snapshot.patients.find((p) => p.id === info.lastInsertRowid);
  res.status(201).json({ patient });
});

/* PUT /api/patients/:id ------------------------------------------------ */
// Edit patient details
router.put("/patients/:id", authenticate, authorize("admin", "receptionist"), (req, res) => {
  const existing = db.prepare("SELECT * FROM patients WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Patient not found." });

  const { name, phone, department_id, doctor_id, notes, priority } = req.body || {};
  if (name !== undefined && !name.trim()) return res.status(400).json({ error: "Patient name cannot be empty." });
  if (phone !== undefined && phone.trim().replace(/\D/g, "").length < 7) {
    return res.status(400).json({ error: "Enter a valid phone number." });
  }

  db.prepare(
    `UPDATE patients SET
       name = ?, phone = ?, department_id = ?, doctor_id = ?, notes = ?, priority = ?
     WHERE id = ?`
  ).run(
    name?.trim() ?? existing.name,
    phone?.trim() ?? existing.phone,
    department_id ?? existing.department_id,
    doctor_id !== undefined ? doctor_id : existing.doctor_id,
    notes !== undefined ? notes.trim() : existing.notes,
    priority !== undefined ? (priority ? 1 : 0) : existing.priority,
    req.params.id
  );

  logActivity(`Patient record for token #${existing.token} (${name?.trim() || existing.name}) was updated.`, "primary");
  const snapshot = broadcast(req);
  res.json({ patient: snapshot.patients.find((p) => p.id === Number(req.params.id)) });
});

/* DELETE /api/patients/:id --------------------------------------------- */
router.delete("/patients/:id", authenticate, authorize("admin", "receptionist"), (req, res) => {
  const existing = db.prepare("SELECT * FROM patients WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Patient not found." });

  db.prepare("DELETE FROM patients WHERE id = ?").run(req.params.id);
  logActivity(`Token #${existing.token} (${existing.name}) was removed from records.`, "danger");
  broadcast(req);
  res.json({ success: true });
});

/* ------------------------------------------------------------------- */
/*  Queue actions                                                        */
/* ------------------------------------------------------------------- */

function requirePatient(req, res) {
  const patient = db.prepare("SELECT * FROM patients WHERE id = ?").get(req.params.id);
  if (!patient) {
    res.status(404).json({ error: "Patient not found." });
    return null;
  }
  return patient;
}

// POST /api/patients/:id/call — call this patient into consultation
router.post("/patients/:id/call", authenticate, authorize("admin", "receptionist", "doctor"), (req, res) => {
  if (getSetting("queue_paused") === "true") {
    return res.status(409).json({ error: "The queue is paused. Resume the queue before calling patients." });
  }
  const patient = requirePatient(req, res);
  if (!patient) return;
  if (patient.status !== "waiting" && patient.status !== "skipped") {
    return res.status(409).json({ error: "Only waiting or skipped patients can be called." });
  }

  const tx = db.transaction(() => {
    // Complete any other patient currently active in the same department
    db.prepare(
      "UPDATE patients SET status = 'completed', completed_at = strftime('%s','now') WHERE department_id = ? AND status = 'active' AND queue_date = ?"
    ).run(patient.department_id, today());

    db.prepare("UPDATE patients SET status = 'active', called_at = strftime('%s','now') WHERE id = ?").run(patient.id);
  });
  tx();

  const doctor = patient.doctor_id ? db.prepare("SELECT * FROM doctors WHERE id = ?").get(patient.doctor_id) : null;
  logActivity(`Token #${patient.token} (${patient.name}) called to ${doctor?.room || "consultation"}.`, "primary");

  const snapshot = broadcast(req, {
    announcement: { token: patient.token, room: doctor?.room || "the consultation room" },
  });
  res.json({ patient: snapshot.patients.find((p) => p.id === patient.id) });
});

// POST /api/patients/:id/skip
router.post("/patients/:id/skip", authenticate, authorize("admin", "receptionist", "doctor"), (req, res) => {
  const patient = requirePatient(req, res);
  if (!patient) return;
  if (patient.status !== "waiting" && patient.status !== "active") {
    return res.status(409).json({ error: "Only waiting or active patients can be skipped." });
  }
  db.prepare("UPDATE patients SET status = 'skipped' WHERE id = ?").run(patient.id);
  logActivity(`Token #${patient.token} (${patient.name}) was skipped.`, "warning");
  const snapshot = broadcast(req);
  res.json({ patient: snapshot.patients.find((p) => p.id === patient.id) });
});

// POST /api/patients/:id/recall — return a skipped patient to the back of the queue
router.post("/patients/:id/recall", authenticate, authorize("admin", "receptionist", "doctor"), (req, res) => {
  const patient = requirePatient(req, res);
  if (!patient) return;
  if (patient.status !== "skipped") {
    return res.status(409).json({ error: "Only skipped patients can be recalled." });
  }
  db.prepare("UPDATE patients SET status = 'waiting', created_at = strftime('%s','now') WHERE id = ?").run(patient.id);
  logActivity(`Token #${patient.token} (${patient.name}) recalled to the queue.`, "primary");
  const snapshot = broadcast(req);
  res.json({ patient: snapshot.patients.find((p) => p.id === patient.id) });
});

// POST /api/patients/:id/cancel
router.post("/patients/:id/cancel", authenticate, authorize("admin", "receptionist"), (req, res) => {
  const patient = requirePatient(req, res);
  if (!patient) return;
  if (["completed", "cancelled"].includes(patient.status)) {
    return res.status(409).json({ error: "This patient's visit is already closed." });
  }
  db.prepare("UPDATE patients SET status = 'cancelled' WHERE id = ?").run(patient.id);
  logActivity(`Token #${patient.token} (${patient.name}) was cancelled.`, "danger");
  const snapshot = broadcast(req);
  res.json({ patient: snapshot.patients.find((p) => p.id === patient.id) });
});

// POST /api/patients/:id/complete
router.post("/patients/:id/complete", authenticate, authorize("admin", "receptionist", "doctor"), (req, res) => {
  const patient = requirePatient(req, res);
  if (!patient) return;
  if (patient.status !== "active") {
    return res.status(409).json({ error: "Only the patient currently in consultation can be marked complete." });
  }
  db.prepare("UPDATE patients SET status = 'completed', completed_at = strftime('%s','now') WHERE id = ?").run(patient.id);
  logActivity(`Consultation completed for token #${patient.token} (${patient.name}).`, "success");
  const snapshot = broadcast(req);
  res.json({ patient: snapshot.patients.find((p) => p.id === patient.id) });
});

// POST /api/patients/:id/transfer — { department_id, doctor_id }
router.post("/patients/:id/transfer", authenticate, authorize("admin", "receptionist"), (req, res) => {
  const patient = requirePatient(req, res);
  if (!patient) return;
  const { department_id, doctor_id } = req.body || {};
  if (!department_id) return res.status(400).json({ error: "Target department is required." });
  if (!["waiting", "skipped"].includes(patient.status)) {
    return res.status(409).json({ error: "Only waiting or skipped patients can be transferred." });
  }

  const dept = db.prepare("SELECT * FROM departments WHERE id = ?").get(department_id);
  if (!dept) return res.status(400).json({ error: "Target department does not exist." });

  let resolvedDoctorId = doctor_id || null;
  if (!resolvedDoctorId) {
    const fallback = db.prepare("SELECT id FROM doctors WHERE department_id = ? ORDER BY available DESC LIMIT 1").get(department_id);
    resolvedDoctorId = fallback?.id || null;
  }

  db.prepare("UPDATE patients SET department_id = ?, doctor_id = ?, status = 'waiting' WHERE id = ?").run(
    department_id,
    resolvedDoctorId,
    patient.id
  );
  logActivity(`Token #${patient.token} (${patient.name}) transferred to ${dept.name}.`, "primary");
  const snapshot = broadcast(req);
  res.json({ patient: snapshot.patients.find((p) => p.id === patient.id) });
});

/* ------------------------------------------------------------------- */
/*  Global queue controls                                                */
/* ------------------------------------------------------------------- */

// POST /api/queue/pause
router.post("/queue/pause", authenticate, authorize("admin", "receptionist"), (req, res) => {
  setSetting("queue_paused", "true");
  logActivity("Queue paused by receptionist.", "warning");
  const snapshot = broadcast(req);
  res.json({ paused: true, snapshot });
});

// POST /api/queue/resume
router.post("/queue/resume", authenticate, authorize("admin", "receptionist"), (req, res) => {
  setSetting("queue_paused", "false");
  logActivity("Queue resumed.", "success");
  const snapshot = broadcast(req);
  res.json({ paused: false, snapshot });
});

// POST /api/queue/reset — re-open all waiting/skipped/active patients for today,
// without touching completed/cancelled history
router.post("/queue/reset", authenticate, authorize("admin", "receptionist"), (req, res) => {
  db.prepare(
    `UPDATE patients SET status = 'waiting', called_at = NULL
     WHERE queue_date = ? AND status IN ('active','skipped')`
  ).run(today());
  setSetting("queue_paused", "false");
  logActivity("Queue has been reset.", "primary");
  const snapshot = broadcast(req);
  res.json({ snapshot });
});

module.exports = router;
