# Hospital Queue & Patient Flow Management System

A full-stack queue management platform for hospitals and clinics: receptionist
dashboard, real-time patient display board, wait-time prediction, analytics,
voice announcements and QR-based token tracking.

## Stack

- **Server**: Node.js, Express, Socket.IO, better-sqlite3, JWT auth
- **Client**: React (Vite), Tailwind CSS, Recharts, qrcode.react

## Project structure

```
hospital-queue/
├── server/        Express API, SQLite database, Socket.IO realtime layer
└── client/        React dashboard, patient display & analytics UI
```

## Demo accounts

| Role          | Email                     | Password       |
|---------------|---------------------------|----------------|
| Administrator | admin@hospital.test       | Admin@123      |
| Receptionist  | reception@hospital.test   | Reception@123  |
| Doctor        | doctor@hospital.test      | Doctor@123     |
| Display       | display@hospital.test     | Display@123    |

## Key features

- Patient registration with auto/manual token numbers and emergency priority
- Queue controls: call, skip, recall, cancel, complete, transfer, pause/resume/reset
- Live wait-time engine based on queue position, department average consult
  time and doctor availability
- Real-time sync across all screens via Socket.IO — no page refresh required
- Patient display board with health tips, announcements and doctor availability
- QR code linking to a public token-tracking page (`/track/:token`)
- Analytics dashboard with live stats, charts and CSV exports (daily/monthly)
- Department and doctor management, voice announcement and display settings
- Light/dark themes with persistence and system detection
- JWT authentication, role-based authorization and rate limiting

## Live Demo
https://hospital-queue-system-frontend.onrender.com
