/* ============================================================
   Netlify Functions entry point.

   Wraps the shared Express app (../../server/app.js) with
   serverless-http so every /api/* request runs as a serverless
   function. State lives in Postgres (Neon), so running statelessly
   per-request is fine.

   Netlify's bundler can wrap the ESM default export one or more
   levels deep (observed: app at module.default.default), so we dig
   through the `.default` chain to find the real Express app — a
   function that has a `.handle` method — instead of assuming a
   fixed shape.
   ============================================================ */

import serverless from "serverless-http";
import * as appModule from "../../server/app.js";

function findExpressApp(mod) {
  let cur = mod;
  for (let i = 0; i < 6 && cur != null; i++) {
    if (typeof cur === "function" && typeof cur.handle === "function") return cur;
    cur = cur.default;
  }
  // last resort: return whatever default we can, let serverless-http try
  return mod?.default ?? mod;
}

export const handler = serverless(findExpressApp(appModule));
