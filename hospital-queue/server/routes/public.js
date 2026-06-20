const express = require("express");
const { db } = require("../db");
const { getQueueSnapshot, getAllSettings } = require("../wait-engine");

const router = express.Router();
const today = () => db.prepare("SELECT date('now') AS d").get().d;

// GET /api/public/token/:token — used by the QR "track my token" page
router.get("/token/:token", (req, res) => {
  const date = req.query.date || today();
  const snapshot = getQueueSnapshot(date);
  const patient = snapshot.patients.find((p) => p.token === Number(req.params.token));
  if (!patient) return res.status(404).json({ error: "We couldn't find this token for today's queue." });

  const settings = getAllSettings();
  const activePatient = snapshot.patients.find((p) => p.status === "active" && p.department_id === patient.department_id);

  res.json({
    hospital_name: settings.hospital_name,
    queue_paused: snapshot.paused,
    patient: {
      token: patient.token,
      name: patient.name,
      department: patient.department_name,
      doctor: patient.doctor_name,
      room: patient.doctor_room,
      status: patient.status,
      position: patient.position,
      eta_minutes: patient.eta_minutes,
    },
    now_serving: activePatient ? activePatient.token : null,
  });
});

// GET /api/public/board — read-only data for the patient display screen
router.get("/board", (req, res) => {
  const date = req.query.date || today();
  const snapshot = getQueueSnapshot(date);
  const settings = getAllSettings();
  res.json({ ...snapshot, settings });
});

module.exports = router;
