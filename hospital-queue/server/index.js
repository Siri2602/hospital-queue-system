require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth");
const metaRoutes = require("./routes/meta");
const patientRoutes = require("./routes/patients");
const analyticsRoutes = require("./routes/analytics");
const exportRoutes = require("./routes/export");
const publicRoutes = require("./routes/public");

const app = express();
const server = http.createServer(app);

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, methods: ["GET", "POST"] },
});

/* ------------------------------------------------------------------ */
/*  Global middleware                                                   */
/* ------------------------------------------------------------------ */

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json({ limit: "1mb" }));

// Generic API rate limiter — protects auth & write endpoints from abuse
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down and try again shortly." },
});
app.use("/api", apiLimiter);

// Stricter limiter for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please wait a few minutes before trying again." },
});
app.use("/api/auth/login", loginLimiter);

/* ------------------------------------------------------------------ */
/*  Realtime broadcast helper                                           */
/* ------------------------------------------------------------------ */

app.set("emitUpdate", (event, payload) => {
  io.emit(event, payload);
});

io.on("connection", (socket) => {
  socket.join("queue-room");
  socket.on("disconnect", () => {});
});

/* ------------------------------------------------------------------ */
/*  Routes                                                              */
/* ------------------------------------------------------------------ */

app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

app.use("/api/auth", authRoutes);
app.use("/api", metaRoutes);
app.use("/api", patientRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/public", publicRoutes);

/* ------------------------------------------------------------------ */
/*  Error handling                                                      */
/* ------------------------------------------------------------------ */

app.use((req, res) => {
  res.status(404).json({ error: "The requested resource was not found." });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on our end. Please try again." });
});

/* ------------------------------------------------------------------ */

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Hospital Queue API listening on http://localhost:${PORT}`);
  console.log(`Allowing client origin: ${CLIENT_ORIGIN}`);
});
