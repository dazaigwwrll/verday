# Planner sync server

Optional backend for cross-device sync + accounts. **The planner works
fully offline without this.** Running it just lets you sign in and keep
the same data on your phone and computer.

- Free, no external service required.
- Passwords are hashed with bcrypt (never stored as plain text).
- Sessions are JWT tokens.
- Storage is pluggable: a local `db.json` file by default, or a cloud
  Postgres database when `DATABASE_URL` is set (see below).

> Want to put this online for free so anyone can use it and the data
> lives in the cloud? See **[../DEPLOY.md](../DEPLOY.md)** for a complete
> free, no-credit-card walkthrough (Neon + Render + Cloudflare Pages).

## Run it

```bash
cd server
npm install
npm start
```

You should see: `Planner sync server listening on http://localhost:8787`

Leave it running, then open the app. In **Settings → حساب کاربری** create an
account and turn on sync.

## Configuration (optional)

Environment variables:

- `PORT` — port to listen on (default `8787`).
- `DATABASE_URL` — a Postgres connection string. If set, the server uses
  Postgres (cloud, persistent) instead of the local `db.json` file. Tables
  are created automatically on first run.
- `JWT_SECRET` — secret for signing sessions. If unset, a random one is
  generated on first run and stored (in `db.json` locally, or the `meta`
  table in Postgres), so sessions survive restarts automatically.

## Pointing the app at a server

The web app reads `VITE_API_URL` at build time and falls back to
`http://localhost:8787`. To use a deployed server, build the app with:

```bash
# from the project root
VITE_API_URL="https://your-server.example.com" npm run build
```

(On Windows PowerShell: `$env:VITE_API_URL="https://..."; npm run build`)

## Backup

In local mode everything is in `db.json` — copy that file to back up all
accounts and their data; deleting it resets the server. In cloud mode the
data lives in your Postgres database (e.g. Neon), managed from there.
