/* ============================================================
   Netlify Functions entry point.

   Wraps the shared Express app (../../server/app.js) so every
   /api/* request runs as a serverless function. State lives in
   Postgres (Neon), so running statelessly per-request is fine.
   ============================================================ */

import serverless from "serverless-http";
import app from "../../server/app.js";

export const handler = serverless(app);
