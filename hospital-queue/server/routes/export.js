const express = require("express");
const { db } = require("../db");
const { authenticate, authorize } = require("../auth");

const router = express.Router();
const today = () => db.prepare("SELECT date('now') AS d").get().d;

function toCSV(rows, columns) {
  const header = columns.map((c) => `"${c.label}"`).join(",");
  const body = rows
    .map((r) => columns.map((c) => `"${String(c.value(r) ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  return `${header}\n${body}`;
}

const PATIENT_COLUMNS = [
  { label: "Token", value: (r) => r.token },
  { label: "Name", value: (r) => r.name },
  { label: "Phone", value: (r) => r.phone },
  { label: "Department", value: (r) => r.department },
  { label: "Doctor", value: (r) => r.doctor || "Unassigned" },
  { label: "Status", value: (r) => r.status },
  { label: "Priority", value: (r) => (r.priority ? "Emergency" : "Normal") },
  { label: "Registered At", value: (r) => new Date(r.created_at * 1000).toLocaleString() },
  { label: "Called At", value: (r) => (r.called_at ? new Date(r.called_at * 1000).toLocaleString() : "") },
  { label: "Completed At", value: (r) => (r.completed_at ? new Date(r.completed_at * 1000).toLocaleString() : "") },
];

// GET /api/export/csv?date=YYYY-MM-DD  (defaults to today — daily report)
router.get("/csv", authenticate, authorize("admin", "receptionist"), (req, res) => {
  const date = req.query.date || today();
  const rows = db
    .prepare(
      `SELECT p.*, d.name AS department, doc.name AS doctor
       FROM patients p
       JOIN departments d ON d.id = p.department_id
       LEFT JOIN doctors doc ON doc.id = p.doctor_id
       WHERE p.queue_date = ?
       ORDER BY p.token ASC`
    )
    .all(date);

  const csv = toCSV(rows, PATIENT_COLUMNS);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="queue-report-${date}.csv"`);
  res.send(csv);
});

// GET /api/export/monthly-csv?month=YYYY-MM
router.get("/monthly-csv", authenticate, authorize("admin", "receptionist"), (req, res) => {
  const month = req.query.month || today().slice(0, 7);
  const rows = db
    .prepare(
      `SELECT p.*, d.name AS department, doc.name AS doctor
       FROM patients p
       JOIN departments d ON d.id = p.department_id
       LEFT JOIN doctors doc ON doc.id = p.doctor_id
       WHERE strftime('%Y-%m', p.queue_date) = ?
       ORDER BY p.queue_date ASC, p.token ASC`
    )
    .all(month);

  const columns = [{ label: "Date", value: (r) => r.queue_date }, ...PATIENT_COLUMNS];
  const csv = toCSV(rows, columns);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="monthly-report-${month}.csv"`);
  res.send(csv);
});

module.exports = router;
