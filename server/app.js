/* ============================================================
   Verday — sync + accounts backend (Express app).

   This module builds and exports the Express app WITHOUT calling
   listen(), so it can run two ways from the same code:
   - as a long-running server (see server.js, for local dev)
   - as a serverless function (see ../api/index.js, for Vercel)

   To stay serverless-friendly there is NO top-level await: the
   storage backend and signing secret are initialized lazily on
   first use and cached for the lifetime of the instance.

   - email/password accounts, passwords hashed with bcrypt
     (the plain password is NEVER stored or logged)
   - stateless sessions via JWT
   - one state blob per user, with a monotonic `rev` so the
     client can tell when another device pushed newer data
   - storage is pluggable (see storage.js): a local JSON file in
     dev, or cloud Postgres when DATABASE_URL is set.
   ============================================================ */

import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";
import { createStore } from "./storage.js";

const TOKEN_TTL = "30d";

/* ---------- lazy singletons (no top-level await) ---------- */

let _storePromise = null;
function getStore() {
  return (_storePromise ??= createStore());
}

let _secretPromise = null;
async function getSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  return (_secretPromise ??= getStore().then((s) => s.getSecret()));
}

/* ---------- helpers ---------- */

const normEmail = (e) => String(e || "").trim().toLowerCase();
const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
// a valid-format bcrypt hash that nothing matches, used to keep
// login timing constant whether or not the email exists
const DUMMY_HASH = bcrypt.hashSync(randomBytes(16).toString("hex"), 10);

async function sign(email) {
  return jwt.sign({ sub: email }, await getSecret(), { expiresIn: TOKEN_TTL });
}

async function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) return res.status(401).json({ error: "no_token" });
  try {
    const secret = await getSecret();
    req.email = jwt.verify(token, secret).sub;
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
    const store = await getStore();
    if (await store.getUser(email))
      return res.status(409).json({ error: "exists" });
    const passHash = await bcrypt.hash(password, 10);
    await store.createUser(email, passHash);
    res.json({ token: await sign(email), email });
  } catch (e) {
    console.error("register failed:", e.message);
    res.status(500).json({ error: "server_error" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const email = normEmail(req.body?.email);
    const password = String(req.body?.password || "");
    const store = await getStore();
    const user = await store.getUser(email);
    // compare even when the user is missing, to avoid leaking which
    // emails exist via response timing
    const ok = await bcrypt.compare(password, user?.passHash || DUMMY_HASH);
    if (!user || !ok)
      return res.status(401).json({ error: "bad_credentials" });
    res.json({ token: await sign(email), email });
  } catch (e) {
    console.error("login failed:", e.message);
    res.status(500).json({ error: "server_error" });
  }
});

app.get("/api/state", auth, async (req, res) => {
  try {
    const entry = await (await getStore()).getState(req.email);
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
    const { rev, updatedAt } = await (await getStore()).putState(
      req.email,
      state
    );
    res.json({ rev, updatedAt });
  } catch (e) {
    console.error("put state failed:", e.message);
    res.status(500).json({ error: "server_error" });
  }
});

app.delete("/api/account", auth, async (req, res) => {
  try {
    await (await getStore()).deleteUser(req.email);
    res.json({ ok: true });
  } catch (e) {
    console.error("delete account failed:", e.message);
    res.status(500).json({ error: "server_error" });
  }
});

export default app;
