/* ============================================================
   Storage backend — picks itself based on the environment:

   - DATABASE_URL set  -> Postgres (persistent cloud DB, e.g. Neon).
     Use this in production so data survives restarts and lives
     in the cloud, not on one machine.
   - otherwise          -> a local db.json file (zero-setup local
     development).

   Both expose the same small async interface, so server.js never
   needs to know which one is active.
   ============================================================ */

import {
  readFileSync,
  writeFileSync,
  renameSync,
  existsSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomBytes } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ---------------- local JSON-file backend ---------------- */

function createFileStore() {
  const DB_PATH = join(__dirname, "db.json");

  const load = () => {
    if (!existsSync(DB_PATH)) {
      return {
        meta: { secret: randomBytes(48).toString("hex") },
        users: {},
        states: {},
      };
    }
    try {
      const db = JSON.parse(readFileSync(DB_PATH, "utf8"));
      db.meta ??= {};
      db.meta.secret ??= randomBytes(48).toString("hex");
      db.users ??= {};
      db.states ??= {};
      return db;
    } catch (e) {
      console.error("db read failed, starting fresh:", e.message);
      return {
        meta: { secret: randomBytes(48).toString("hex") },
        users: {},
        states: {},
      };
    }
  };

  const db = load();

  const save = () => {
    // temp file + rename so a crash mid-write can't corrupt the DB
    const tmp = DB_PATH + ".tmp";
    writeFileSync(tmp, JSON.stringify(db));
    renameSync(tmp, DB_PATH);
  };
  save(); // persist a freshly generated secret on first run

  return {
    kind: "file",
    async getSecret() {
      return db.meta.secret;
    },
    async getUser(email) {
      return db.users[email] ?? null;
    },
    async createUser(email, passHash) {
      db.users[email] = {
        email,
        passHash,
        createdAt: new Date().toISOString(),
      };
      save();
    },
    async deleteUser(email) {
      delete db.users[email];
      delete db.states[email];
      save();
    },
    async getState(email) {
      return db.states[email] ?? null;
    },
    async putState(email, state) {
      const prev = db.states[email];
      const rev = (prev?.rev ?? 0) + 1;
      const updatedAt = new Date().toISOString();
      db.states[email] = { state, rev, updatedAt };
      save();
      return { rev, updatedAt };
    },
  };
}

/* ---------------- Postgres backend (cloud) ---------------- */

async function createPgStore() {
  const pg = (await import("pg")).default;
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    // managed providers (Neon, Render, Supabase, …) require SSL
    ssl: { rejectUnauthorized: false },
    max: 5,
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      email      TEXT PRIMARY KEY,
      pass_hash  TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS states (
      email      TEXT PRIMARY KEY REFERENCES users(email) ON DELETE CASCADE,
      state      JSONB NOT NULL,
      rev        INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  return {
    kind: "postgres",
    async getSecret() {
      const r = await pool.query("SELECT value FROM meta WHERE key='secret'");
      if (r.rows[0]) return r.rows[0].value;
      const secret = randomBytes(48).toString("hex");
      // ON CONFLICT guards against two instances racing on first boot
      await pool.query(
        "INSERT INTO meta(key,value) VALUES('secret',$1) ON CONFLICT (key) DO NOTHING",
        [secret]
      );
      const again = await pool.query(
        "SELECT value FROM meta WHERE key='secret'"
      );
      return again.rows[0].value;
    },
    async getUser(email) {
      const r = await pool.query(
        "SELECT email, pass_hash FROM users WHERE email=$1",
        [email]
      );
      if (!r.rows[0]) return null;
      return { email: r.rows[0].email, passHash: r.rows[0].pass_hash };
    },
    async createUser(email, passHash) {
      await pool.query(
        "INSERT INTO users(email, pass_hash) VALUES($1,$2)",
        [email, passHash]
      );
    },
    async deleteUser(email) {
      await pool.query("DELETE FROM users WHERE email=$1", [email]);
    },
    async getState(email) {
      const r = await pool.query(
        "SELECT state, rev, updated_at FROM states WHERE email=$1",
        [email]
      );
      if (!r.rows[0]) return null;
      return {
        state: r.rows[0].state,
        rev: r.rows[0].rev,
        updatedAt: r.rows[0].updated_at,
      };
    },
    async putState(email, state) {
      const r = await pool.query(
        `INSERT INTO states(email, state, rev, updated_at)
         VALUES($1, $2, 1, now())
         ON CONFLICT (email) DO UPDATE
           SET state = EXCLUDED.state,
               rev = states.rev + 1,
               updated_at = now()
         RETURNING rev, updated_at`,
        [email, state]
      );
      return { rev: r.rows[0].rev, updatedAt: r.rows[0].updated_at };
    },
  };
}

export async function createStore() {
  if (process.env.DATABASE_URL) {
    const store = await createPgStore();
    console.log("Storage: Postgres (cloud)");
    return store;
  }
  const store = createFileStore();
  console.log("Storage: local db.json file");
  return store;
}
