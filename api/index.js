/* ============================================================
   Vercel serverless entry point.

   Vercel turns files under /api into serverless functions. This
   one simply hands every /api/* request to the shared Express app
   (see ../server/app.js). The state lives in Postgres (Neon), so
   running statelessly per-request is fine.
   ============================================================ */

export { default } from "../server/app.js";
