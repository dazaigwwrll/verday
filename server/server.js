/* ============================================================
   Local long-running entry point for the Verday sync server.

   The actual app lives in app.js (shared with the serverless
   deployment in ../api/index.js). This file just starts a real
   HTTP listener for local development:  npm start
   ============================================================ */

import app from "./app.js";

const PORT = process.env.PORT || 8787;

app.listen(PORT, () => {
  console.log(`Verday sync server listening on http://localhost:${PORT}`);
});
