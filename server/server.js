/* ============================================================
   Verday — sync + accounts backend.

   Deliberately small and self-contained:
   - email/password accounts, passwords hashed with bcrypt
     (the plain password is NEVER stored or logged)
   - stateless sessions via JWT
   - one state blob per user, with a monotonic `rev` so the
     client can tell when another device pushed newer data
   - storage is pluggable (see storage.js): a local JSON file for
     development, or a cloud Postgres database in production.

   This server is OPTIONAL. The planner works fully offline on
   its own; this only adds cross-device sync.

   Run locally:  npm install && npm start
   In the cloud: set DATABASE_URL (Postgres) and JWT_SECRET.
   ============================================================ */

import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";
import { createStore } from "./storage.js";

const PORT = process.env.PORT || 8787;
const TOKEN_TTL = "30d";

const store = await createStore();
const SECRET = process.env.JWT_SECRET || (await store.getSecret());

/* ---------- helpers ---------- */

const normEmail = (e) => String(e || "").trim().toLowerCase();
const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
// a valid-format bcrypt hash that nothing matches, used to keep
// login timing constant whether or not the email exists
const DUMMY_HASH = bcrypt.hashSync(randomBytes(16).toString("hex"), 10);

function sign(email) {
  return jwt.sign({ sub: email }, SECRET, { expiresIn: TOKEN_TTL });
}

function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) return res.status(401).json({ error: "no_token" });
  try {
    req.email = jwt.verify(token, SECRET).sub;
    next();
  } catch {
    return res.status(401).json({ error: "bad_token" });
  }
}

/* ---------- app ---------- */

const app = express();
app.use(cors());
app.use(express.json({ limit: "8mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.post("/api/register", async (req, res) => {
  try {
    const email = normEmail(req.body?.email);
    const password = String(req.body?.password || "");
    if (!isEmail(email)) return res.status(400).json({ error: "bad_email" });
    if (password.length < 8)
      return res.status(400).json({ error: "weak_password" });
    if (await store.getUser(email))
      return res.status(409).json({ error: "exists" });
    const passHash = await bcrypt.hash(password, 10);
    await store.createUser(email, passHash);
    res.json({ token: sign(email), email });
  } catch (e) {
    console.error("register failed:", e.message);
    res.status(500).json({ error: "server_error" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const email = normEmail(req.body?.email);
    const password = String(req.body?.password || "");
    const user = await store.getUser(email);
    // compare even when the user is missing, to avoid leaking which
    // emails exist via response timing
    const ok = await bcrypt.compare(password, user?.passHash || DUMMY_HASH);
    if (!user || !ok)
      return res.status(401).json({ error: "bad_credentials" });
    res.json({ token: sign(email), email });
  } catch (e) {
    console.error("login failed:", e.message);
    res.status(500).json({ error: "server_error" });
  }
});

app.get("/api/state", auth, async (req, res) => {
  try {
    const entry = await store.getState(req.email);
    res.json({
      state: entry?.state ?? null,
      rev: entry?.rev ?? 0,
      updatedAt: entry?.updatedAt ?? null,
    });
  } catch (e) {
    console.error("get state failed:", e.message);
    res.status(500).json({ error: "server_error" });
  }
});

app.put("/api/state", auth, async (req, res) => {
  try {
    const state = req.body?.state;
    if (!state || typeof state !== "object")
      return res.status(400).json({ error: "bad_state" });
    const { rev, updatedAt } = await store.putState(req.email, state);
    res.json({ rev, updatedAt });
  } catch (e) {
    console.error("put state failed:", e.message);
    res.status(500).json({ error: "server_error" });
  }
});

app.delete("/api/account", auth, async (req, res) => {
  try {
    await store.deleteUser(req.email);
    res.json({ ok: true });
  } catch (e) {
    console.error("delete account failed:", e.message);
    res.status(500).json({ error: "server_error" });
  }
});

app.listen(PORT, () => {
  console.log(`Planner sync server listening on http://localhost:${PORT}`);
});
