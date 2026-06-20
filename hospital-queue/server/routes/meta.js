const express = require("express");
const { db } = require("../db");
const { authenticate, authorize } = require("../auth");
const { getAllSettings, setSetting } = require("../wait-engine");

const router = express.Router();

/* Departments ------------------------------------------------------- */

router.get("/departments", authenticate, (req, res) => {
  const rows = db.prepare("SELECT * FROM departments ORDER BY name").all();
  res.json({ departments: rows });
});

router.post("/departments", authenticate, authorize("admin"), (req, res) => {
  const { name, avg_consult_minutes } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: "Department name is required." });
  try {
    const info = db
      .prepare("INSERT INTO departments (name, avg_consult_minutes) VALUES (?, ?)")
      .run(name.trim(), Number(avg_consult_minutes) || 10);
    const dept = db.prepare("SELECT * FROM departments WHERE id = ?").get(info.lastInsertRowid);
    req.app.get("emitUpdate")("departments-updated", { department: dept });
    res.status(201).json({ department: dept });
  } catch (e) {
    res.status(409).json({ error: "A department with this name already exists." });
  }
});

router.put("/departments/:id", authenticate, authorize("admin"), (req, res) => {
  const { name, avg_consult_minutes } = req.body || {};
  const existing = db.prepare("SELECT * FROM departments WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Department not found." });

  db.prepare("UPDATE departments SET name = ?, avg_consult_minutes = ? WHERE id = ?").run(
    name?.trim() || existing.name,
    Number(avg_consult_minutes) || existing.avg_consult_minutes,
    req.params.id
  );
  const updated = db.prepare("SELECT * FROM departments WHERE id = ?").get(req.params.id);
  req.app.get("emitUpdate")("departments-updated", { department: updated });
  res.json({ department: updated });
});

router.delete("/departments/:id", authenticate, authorize("admin"), (req, res) => {
  const inUse = db.prepare("SELECT COUNT(*) AS c FROM doctors WHERE department_id = ?").get(req.params.id).c;
  if (inUse > 0) {
    return res.status(409).json({ error: "Cannot delete a department that still has doctors assigned." });
  }
  db.prepare("DELETE FROM departments WHERE id = ?").run(req.params.id);
  req.app.get("emitUpdate")("departments-updated", { deletedId: Number(req.params.id) });
  res.json({ success: true });
});

/* Doctors ------------------------------------------------------------ */

router.get("/doctors", authenticate, (req, res) => {
  const rows = db
    .prepare(
      `SELECT doc.*, d.name AS department_name
       FROM doctors doc JOIN departments d ON d.id = doc.department_id
       ORDER BY d.name, doc.name`
    )
    .all();
  res.json({ doctors: rows });
});

router.post("/doctors", authenticate, authorize("admin"), (req, res) => {
  const { name, department_id, room } = req.body || {};
  if (!name?.trim() || !department_id || !room?.trim()) {
    return res.status(400).json({ error: "Doctor name, department and room are required." });
  }
  const info = db
    .prepare("INSERT INTO doctors (name, department_id, room, available) VALUES (?, ?, ?, 1)")
    .run(name.trim(), department_id, room.trim());
  const doctor = db.prepare("SELECT * FROM doctors WHERE id = ?").get(info.lastInsertRowid);
  req.app.get("emitUpdate")("doctors-updated", { doctor });
  res.status(201).json({ doctor });
});

router.put("/doctors/:id", authenticate, authorize("admin", "receptionist"), (req, res) => {
  const existing = db.prepare("SELECT * FROM doctors WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Doctor not found." });

  const { name, department_id, room, available } = req.body || {};
  db.prepare(
    "UPDATE doctors SET name = ?, department_id = ?, room = ?, available = ? WHERE id = ?"
  ).run(
    name?.trim() || existing.name,
    department_id ?? existing.department_id,
    room?.trim() || existing.room,
    available !== undefined ? (available ? 1 : 0) : existing.available,
    req.params.id
  );
  const updated = db.prepare("SELECT * FROM doctors WHERE id = ?").get(req.params.id);
  req.app.get("emitUpdate")("doctors-updated", { doctor: updated });
  res.json({ doctor: updated });
});

router.delete("/doctors/:id", authenticate, authorize("admin"), (req, res) => {
  db.prepare("DELETE FROM doctors WHERE id = ?").run(req.params.id);
  req.app.get("emitUpdate")("doctors-updated", { deletedId: Number(req.params.id) });
  res.json({ success: true });
});

/* Settings ------------------------------------------------------------ */

router.get("/settings", authenticate, (req, res) => {
  res.json({ settings: getAllSettings() });
});

router.put("/settings", authenticate, authorize("admin", "receptionist"), (req, res) => {
  const updates = req.body || {};
  for (const [key, value] of Object.entries(updates)) {
    setSetting(key, value);
  }
  const settings = getAllSettings();
  req.app.get("emitUpdate")("settings-updated", { settings });
  res.json({ settings });
});

module.exports = router;
