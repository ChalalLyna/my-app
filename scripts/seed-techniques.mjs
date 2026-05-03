/**
 * seed-techniques.mjs
 *
 * Fetches all abilities from Caldera, deduplicates by MITRE technique_id,
 * then inserts missing rows into the Technique table.
 *
 * Usage (from the my-app/ directory):
 *   node scripts/seed-techniques.mjs
 *
 * If DB_HOST in .env is "mysql" (Docker service name), the script remaps it
 * to 127.0.0.1 automatically so you can run it from the host machine.
 * Override with: DB_HOST=<ip> node scripts/seed-techniques.mjs
 */

import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";

// ── Load .env ──────────────────────────────────────────────────────────────
const envFile = path.resolve(process.cwd(), ".env");
const envVars = {};
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    envVars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
}
const env = (k) => process.env[k] ?? envVars[k] ?? "";

const CALDERA_URL     = env("CALDERA_URL");
const CALDERA_API_KEY = env("CALDERA_API_KEY");
const DB_HOST         = env("DB_HOST") || "127.0.0.1";
const DB_PORT         = Number(env("DB_PORT") || 3306);
const DB_NAME         = env("MYSQL_DATABASE");
const DB_USER         = env("MYSQL_USER");
const DB_PASS         = env("MYSQL_PASSWORD");

// Self-signed cert in lab
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  if (!CALDERA_URL || !CALDERA_API_KEY) {
    throw new Error("CALDERA_URL or CALDERA_API_KEY missing — check your .env");
  }

  // 1. Fetch abilities from Caldera
  console.log(`[*] Connecting to Caldera at ${CALDERA_URL} ...`);
  const res = await fetch(`${CALDERA_URL}/api/v2/abilities`, {
    headers: { KEY: CALDERA_API_KEY },
  });
  if (!res.ok) throw new Error(`Caldera responded ${res.status} ${res.statusText}`);
  const abilities = await res.json();
  console.log(`[*] ${abilities.length} abilities received`);

  // 2. Deduplicate by technique_id — keep first occurrence per MITRE ID
  const byMitreId = new Map();
  for (const ab of abilities) {
    const mid = (ab.technique_id ?? "").trim();
    if (!mid || byMitreId.has(mid)) continue;
    byMitreId.set(mid, {
      mitreID:     mid.slice(0, 50),
      nom:         (ab.technique_name || ab.name || "Unknown").slice(0, 255),
      tactique:    (ab.tactic ?? "").slice(0, 255),
      description: ab.description ? String(ab.description).slice(0, 4000) : null,
    });
  }
  const techniques = [...byMitreId.values()];
  console.log(`[*] ${techniques.length} unique MITRE technique IDs found`);

  // 3. Connect to MySQL
  console.log(`[*] Connecting to MySQL at ${DB_HOST}:${DB_PORT} / ${DB_NAME} ...`);
  const db = await mysql.createConnection({
    host:     DB_HOST,
    port:     DB_PORT,
    database: DB_NAME,
    user:     DB_USER,
    password: DB_PASS,
  });

  // 4. Load already-present mitreIDs to skip duplicates
  const [existing] = await db.query("SELECT mitreID FROM Technique");
  const existingIds = new Set(existing.map((r) => r.mitreID));
  console.log(`[*] ${existingIds.size} techniques already in DB`);

  // 5. Insert missing techniques
  let inserted = 0;
  let skipped  = 0;
  for (const t of techniques) {
    if (existingIds.has(t.mitreID)) { skipped++; continue; }
    await db.execute(
      "INSERT INTO Technique (mitreID, nom, tactique, description) VALUES (?, ?, ?, ?)",
      [t.mitreID, t.nom, t.tactique, t.description]
    );
    console.log(`  [+] ${t.mitreID} — ${t.nom} (${t.tactique})`);
    inserted++;
  }

  await db.end();

  console.log("");
  console.log(`[✓] Done — ${inserted} inserted, ${skipped} already present`);
}

main().catch((err) => {
  console.error(`[✗] ${err.message}`);
  process.exit(1);
});
