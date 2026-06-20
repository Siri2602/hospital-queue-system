const { db } = require("./db");

/**
 * Calculates live queue metrics: position, estimated wait and
 * department-level summaries used by the dashboard and display board.
 *
 * Factors considered:
 *  - number of patients ahead in the same department queue
 *  - emergency / priority insertions (counted ahead regardless of arrival order)
 *  - department average consultation time
 *  - whether the doctor for that department is available
 *  - whether the overall queue is paused
 */
function getQueueSnapshot(queueDate) {
  const paused = getSetting("queue_paused") === "true";

  const patients = db
    .prepare(
      `SELECT p.*, d.name AS department_name, d.avg_consult_minutes,
              doc.name AS doctor_name, doc.room AS doctor_room, doc.available AS doctor_available
       FROM patients p
       JOIN departments d ON d.id = p.department_id
       LEFT JOIN doctors doc ON doc.id = p.doctor_id
       WHERE p.queue_date = ?
       ORDER BY p.priority DESC, p.created_at ASC`
    )
    .all(queueDate);

  // group waiting patients per department to compute position & ETA
  const waitingByDept = {};
  for (const p of patients) {
    if (p.status !== "waiting") continue;
    (waitingByDept[p.department_id] = waitingByDept[p.department_id] || []).push(p);
  }

  const enriched = patients.map((p) => {
    if (p.status !== "waiting") return { ...p, position: null, eta_minutes: null };
    const queue = waitingByDept[p.department_id];
    const position = queue.findIndex((x) => x.id === p.id) + 1;
    const baseTime = p.avg_consult_minutes || 10;
    const availabilityFactor = p.doctor_available ? 1 : 1.5; // doctor unavailable slows things down
    const pausedPenalty = paused ? 0 : 1;
    const eta = pausedPenalty === 0 ? null : Math.round((position - 1) * baseTime * availabilityFactor + baseTime * 0.5);
    return { ...p, position, eta_minutes: eta };
  });

  return { patients: enriched, paused };
}

function getSetting(key) {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  return row ? row.value : null;
}

function setSetting(key, value) {
  db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(key, String(value));
}

function getAllSettings() {
  const rows = db.prepare("SELECT key, value FROM settings").all();
  return rows.reduce((acc, r) => ({ ...acc, [r.key]: r.value }), {});
}

module.exports = { getQueueSnapshot, getSetting, setSetting, getAllSettings };
