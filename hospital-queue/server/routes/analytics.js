const express = require("express");
const { db } = require("../db");
const { authenticate, authorize } = require("../auth");

const router = express.Router();
const today = () => db.prepare("SELECT date('now') AS d").get().d;

// GET /api/analytics/summary?date=YYYY-MM-DD
router.get("/summary", authenticate, (req, res) => {
  const date = req.query.date || today();

  const totals = db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
         SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) AS skipped,
         SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
         SUM(CASE WHEN status IN ('waiting','active') THEN 1 ELSE 0 END) AS active_queue,
         SUM(CASE WHEN priority = 1 THEN 1 ELSE 0 END) AS emergency
       FROM patients WHERE queue_date = ?`
    )
    .get(date);

  const avgConsult = db
    .prepare(
      `SELECT AVG(completed_at - called_at) AS avg_seconds
       FROM patients
       WHERE queue_date = ? AND status = 'completed' AND called_at IS NOT NULL AND completed_at IS NOT NULL`
    )
    .get(date);

  const avgWait = db
    .prepare(
      `SELECT AVG(called_at - created_at) AS avg_seconds
       FROM patients
       WHERE queue_date = ? AND called_at IS NOT NULL`
    )
    .get(date);

  const hourly = db
    .prepare(
      `SELECT CAST(strftime('%H', created_at, 'unixepoch') AS INTEGER) AS hour,
              COUNT(*) AS patients,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
       FROM patients WHERE queue_date = ?
       GROUP BY hour ORDER BY hour`
    )
    .all(date);

  const byDepartment = db
    .prepare(
      `SELECT d.name AS department, COUNT(*) AS patients,
              SUM(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END) AS completed
       FROM patients p JOIN departments d ON d.id = p.department_id
       WHERE p.queue_date = ?
       GROUP BY d.name ORDER BY patients DESC`
    )
    .all(date);

  const byDoctor = db
    .prepare(
      `SELECT doc.name AS doctor, COUNT(*) AS patients,
              SUM(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END) AS completed,
              AVG(CASE WHEN p.status = 'completed' AND p.called_at IS NOT NULL AND p.completed_at IS NOT NULL
                       THEN (p.completed_at - p.called_at) END) AS avg_consult_seconds
       FROM patients p LEFT JOIN doctors doc ON doc.id = p.doctor_id
       WHERE p.queue_date = ? AND doc.id IS NOT NULL
       GROUP BY doc.name ORDER BY patients DESC`
    )
    .all(date);

  const trend = db
    .prepare(
      `SELECT queue_date AS date,
              COUNT(*) AS total,
              AVG(CASE WHEN called_at IS NOT NULL THEN (called_at - created_at) END) AS avg_wait_seconds
       FROM patients
       WHERE queue_date >= date(?, '-6 days')
       GROUP BY queue_date ORDER BY queue_date`
    )
    .all(date);

  const efficiency = totals.total ? Math.round((totals.completed / totals.total) * 100) : 0;

  res.json({
    date,
    totals: { ...totals, efficiency },
    averages: {
      avg_consult_minutes: avgConsult.avg_seconds ? Math.round(avgConsult.avg_seconds / 60) : null,
      avg_wait_minutes: avgWait.avg_seconds ? Math.round(avgWait.avg_seconds / 60) : null,
    },
    hourly,
    byDepartment,
    byDoctor,
    trend: trend.map((t) => ({
      date: t.date,
      total: t.total,
      avg_wait_minutes: t.avg_wait_seconds ? Math.round(t.avg_wait_seconds / 60) : 0,
    })),
  });
});

module.exports = router;
