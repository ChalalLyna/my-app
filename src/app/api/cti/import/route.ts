import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import pool from "@/lib/db";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

const execFileAsync = promisify(execFile);

const SCRIPTS_DIR    = path.join(process.cwd(), "scripts");
const ALL_CATEGORIES = ["windows", "linux", "macos", "network", "cloud", "web"];

// Try "python" first (Windows), fall back to "python3" (Linux/Mac)
async function runPython(args: string[], cwd: string): Promise<void> {
  try {
    await execFileAsync("python", args, { cwd, timeout: 600_000 });
  } catch (err: any) {
    if (err.code === "ENOENT") {
      await execFileAsync("python3", args, { cwd, timeout: 600_000 });
    } else {
      throw err;
    }
  }
}

function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") return null;
  return payload;
}

function parseDate(val: unknown): string | null {
  if (!val || String(val).trim() === "" || String(val) === "N/A") return null;
  const s = String(val).trim();
  // Accept YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // Accept YYYY/MM/DD
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(s)) return s.replace(/\//g, "-");
  return null;
}

function parseLevel(val: unknown): number | null {
  const n = parseInt(String(val));
  return isNaN(n) ? null : n;
}

export async function POST(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  let category: string;
  try {
    ({ category } = await req.json());
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  if (!ALL_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Catégorie invalide." }, { status: 400 });
  }

  try {
    // ── 1. Run Python import script ─────────────────────────────
    await runPython(["refresh_db.py", category], SCRIPTS_DIR);

    // ── 2. Read generated JSON ───────────────────────────────────
    const jsonPath = path.join(SCRIPTS_DIR, `${category}_cti_db.json`);
    const rawData  = await fs.readFile(jsonPath, "utf-8");
    const entries  = JSON.parse(rawData) as any[];

    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: "Aucune règle trouvée dans le JSON généré." }, { status: 422 });
    }

    // ── 3. Delete existing rules for this category ───────────────
    // Handles both:
    //   - new format : Categorie = category  (e.g. 'windows')
    //   - old format : Produit   = category  (logsource.product before SousCategorie existed)
    const [existing] = await pool.query(
      "SELECT IdRegle FROM RegleCTI WHERE Categorie = ? OR Produit = ?",
      [category, category]
    ) as any;

    const ids: number[] = (existing as any[]).map((r: any) => r.IdRegle);

    if (ids.length > 0) {
      const ph = ids.map(() => "?").join(",");
      await pool.query(`DELETE FROM CouvertureDetection WHERE IdRegle IN (${ph})`, ids);
      await pool.query(`DELETE FROM RegleExportee WHERE IdRegleCTI IN (${ph})`, ids);
      await pool.query(`DELETE FROM RegleCTI WHERE IdRegle IN (${ph})`, ids);
      await pool.query(`DELETE FROM RegleDeDetection WHERE IdRegle IN (${ph})`, ids);
    }

    // ── 4. Insert new rules in a transaction ─────────────────────
    const conn = await pool.getConnection();
    let count  = 0;

    try {
      await conn.beginTransaction();

      for (const entry of entries) {
        const m = entry.metadata ?? {};

        const [r1] = await conn.execute(
          "INSERT INTO RegleDeDetection (IdRegle) VALUES (NULL)"
        ) as any;
        const idRegle: number = r1.insertId;

        await conn.execute(
          `INSERT INTO RegleCTI
             (IdRegle, IdSigma, Titre, Description, Auteur,
              DateAjout, DerniereModification,
              TechniquesMitre, Severite, NiveauWazuh,
              Produit, Categorie, SousCategorie, YamlSigmaOriginal, XmlWazuh)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            idRegle,
            m.sigma_id            ?? null,
            m.title               ?? null,
            m.description         ?? null,
            m.author              ?? null,
            parseDate(m.date_added),
            parseDate(m.last_modified),
            Array.isArray(m.mitre_techniques) && m.mitre_techniques.length
              ? JSON.stringify(m.mitre_techniques)
              : null,
            m.severity            ?? null,
            parseLevel(m.wazuh_level),
            m.product             ?? null,
            m.category            ?? category,
            m.sub_category        ?? null,
            m.original_sigma_yaml ?? null,
            entry.wazuh_xml       ?? null,
          ]
        );

        count++;
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    return NextResponse.json({ ok: true, count });
  } catch (err: any) {
    const message = err?.stderr
      ? `Script Python : ${err.stderr.slice(0, 300)}`
      : (err?.message ?? "Erreur inconnue");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}