const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const path = require("path");

const db = new Database(path.join(__dirname, "hospital.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

/* ------------------------------------------------------------------ */
/*  Schema                                                              */
/* ------------------------------------------------------------------ */

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','receptionist','doctor','display')),
  doctor_id INTEGER,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  avg_consult_minutes INTEGER NOT NULL DEFAULT 10
);

CREATE TABLE IF NOT EXISTS doctors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  department_id INTEGER NOT NULL REFERENCES departments(id),
  room TEXT NOT NULL,
  available INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS patients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token INTEGER NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  department_id INTEGER NOT NULL REFERENCES departments(id),
  doctor_id INTEGER REFERENCES doctors(id),
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting','active','completed','skipped','cancelled')),
  priority INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  called_at INTEGER,
  completed_at INTEGER,
  queue_date TEXT NOT NULL DEFAULT (date('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  tone TEXT NOT NULL DEFAULT 'primary',
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_patients_date ON patients(queue_date);
CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(status);
`);

/* ------------------------------------------------------------------ */
/*  Seed default data (idempotent)                                      */
/* ------------------------------------------------------------------ */

const defaultSettings = {
  hospital_name: "Aarogya Multispecialty Hospital",
  hospital_tagline: "Outpatient Queue Display",
  avg_consult_minutes: "10",
  voice_enabled: "true",
  voice_language: "en-US",
  voice_volume: "1",
  voice_auto_repeat: "false",
  queue_paused: "false",
  display_theme: "light",
};

const seed = db.transaction(() => {
  // settings
  const insertSetting = db.prepare(
    "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)"
  );
  for (const [k, v] of Object.entries(defaultSettings)) insertSetting.run(k, v);

  // departments
  const deptCount = db.prepare("SELECT COUNT(*) AS c FROM departments").get().c;
  if (deptCount === 0) {
    const insertDept = db.prepare(
      "INSERT INTO departments (name, avg_consult_minutes) VALUES (?, ?)"
    );
    const depts = [
      ["General Medicine", 8],
      ["Cardiology", 15],
      ["Orthopedics", 12],
      ["Pediatrics", 10],
      ["Dermatology", 8],
      ["ENT", 10],
    ];
    depts.forEach(([name, t]) => insertDept.run(name, t));
  }

  // doctors
  const docCount = db.prepare("SELECT COUNT(*) AS c FROM doctors").get().c;
  if (docCount === 0) {
    const deptRows = db.prepare("SELECT id, name FROM departments").all();
    const deptId = (name) => deptRows.find((d) => d.name === name).id;
    const insertDoc = db.prepare(
      "INSERT INTO doctors (name, department_id, room, available) VALUES (?, ?, ?, ?)"
    );
    insertDoc.run("Dr. Aanya Mehta", deptId("General Medicine"), "Room 1", 1);
    insertDoc.run("Dr. Rohan Kapoor", deptId("Cardiology"), "Room 2", 1);
    insertDoc.run("Dr. Sara Iqbal", deptId("Orthopedics"), "Room 3", 1);
    insertDoc.run("Dr. Vikram Nair", deptId("Pediatrics"), "Room 4", 0);
    insertDoc.run("Dr. Leela Pillai", deptId("Dermatology"), "Room 5", 1);
    insertDoc.run("Dr. Imran Sheikh", deptId("ENT"), "Room 6", 1);
  }

  // users
  const userCount = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
  if (userCount === 0) {
    const insertUser = db.prepare(
      "INSERT INTO users (name, email, password_hash, role, doctor_id) VALUES (?, ?, ?, ?, ?)"
    );
    const hash = (pw) => bcrypt.hashSync(pw, 10);
    insertUser.run("System Administrator", "admin@hospital.test", hash("Admin@123"), "admin", null);
    insertUser.run("Front Desk", "reception@hospital.test", hash("Reception@123"), "receptionist", null);
    insertUser.run("Dr. Aanya Mehta", "doctor@hospital.test", hash("Doctor@123"), "doctor", 1);
    insertUser.run("Lobby Display", "display@hospital.test", hash("Display@123"), "display", null);
  }

  // demo patients for today
  const today = db.prepare("SELECT date('now') AS d").get().d;
  const patientCount = db
    .prepare("SELECT COUNT(*) AS c FROM patients WHERE queue_date = ?")
    .get(today).c;
  if (patientCount === 0) {
    const deptRows = db.prepare("SELECT id, name FROM departments").all();
    const docRows = db.prepare("SELECT id, department_id FROM doctors").all();
    const insertPatient = db.prepare(`
      INSERT INTO patients (token, name, phone, department_id, doctor_id, notes, status, priority, created_at, queue_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const names = [
      "Arjun Sharma", "Priya Verma", "Kabir Khan", "Meera Joshi",
      "Imran Sheikh", "Tanvi Rao", "Sunita Pillai", "Rakesh Gupta",
    ];
    const statuses = ["completed", "completed", "skipped", "waiting", "waiting", "active", "waiting", "cancelled"];
    const now = Math.floor(Date.now() / 1000);
    names.forEach((name, i) => {
      const dept = deptRows[i % deptRows.length];
      const doc = docRows.find((d) => d.department_id === dept.id) || docRows[0];
      insertPatient.run(
        18 + i,
        name,
        `98${(10000000 + i * 1111).toString().slice(0, 8)}`,
        dept.id,
        doc.id,
        "",
        statuses[i],
        i === 6 ? 1 : 0,
        now - (8 - i) * 360,
        today
      );
    });
  }
});

seed();

/* ------------------------------------------------------------------ */
/*  Token sequence helper                                               */
/* ------------------------------------------------------------------ */

function nextToken() {
  const today = db.prepare("SELECT date('now') AS d").get().d;
  const row = db
    .prepare("SELECT MAX(token) AS maxToken FROM patients WHERE queue_date = ?")
    .get(today);
  return (row.maxToken || 0) + 1;
}

module.exports = { db, nextToken };
