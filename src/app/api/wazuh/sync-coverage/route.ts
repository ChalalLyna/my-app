import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import pool from "@/lib/db";
import { getWazuhManagerToken } from "../lib";

// GET /api/wazuh/sync-coverage?debug=true
// Retourne les 10 premières règles brutes pour inspecter la structure
export async function GET(req: NextRequest) {
  const debug = req.nextUrl.searchParams.get("debug") === "true";
  if (!debug) return NextResponse.json({ hint: "Ajoutez ?debug=true" });

  try {
    const { token, baseUrl } = await getWazuhManagerToken();
    const res = await fetch(`${baseUrl}/rules?limit=10&offset=0`, {
      headers: { Authorization: `Bearer ${token}` },
      cache:   "no-store",
      signal:  AbortSignal.timeout(15000),
    });
    const data = await res.json();
    const items = data?.data?.affected_items ?? [];
    return NextResponse.json({
      total:   data?.data?.total_affected_items,
      sample:  items.slice(0, 5),
      fields:  items[0] ? Object.keys(items[0]) : [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

const PAGE_SIZE = 500;

export async function POST() {
  try {
    const { token, baseUrl } = await getWazuhManagerToken();

    // ── 1. Paginer à travers toutes les règles Wazuh ──────────────────────
    let offset = 0;
    let total  = Infinity;
    const rulesWithMitre: any[] = [];

    while (offset < total) {
      const res = await fetch(
        `${baseUrl}/rules?limit=${PAGE_SIZE}&offset=${offset}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache:   "no-store",
          signal:  AbortSignal.timeout(20000),
        }
      );
      if (!res.ok) throw new Error(`Wazuh API ${res.status}`);

      const data  = await res.json();
      const items = (data?.data?.affected_items ?? []) as any[];
      total        = data?.data?.total_affected_items ?? 0;

      for (const rule of items) {
        const mitreIds: string[] = rule.mitre?.id ?? [];
        if (mitreIds.length > 0) rulesWithMitre.push(rule);
      }

      offset += PAGE_SIZE;
    }

    if (rulesWithMitre.length === 0)
      return NextResponse.json({ success: true, rulesProcessed: 0, coverageEntries: 0 });

    // ── 2. Charger l'état actuel de la DB en mémoire ──────────────────────
    const [existingSIEM] = await pool.query<RowDataPacket[]>(
      "SELECT IdRegle, wazuhRuleId FROM RegleSIEM"
    );
    const siemMap = new Map<number, number>(
      existingSIEM.map((r) => [r.wazuhRuleId as number, r.IdRegle as number])
    );

    const [existingCoverage] = await pool.query<RowDataPacket[]>(
      "SELECT IdRegle, IdTechnique FROM CouvertureDetection"
    );
    const coverageSet = new Set<string>(
      existingCoverage.map((r) => `${r.IdRegle}-${r.IdTechnique}`)
    );

    const [techniques] = await pool.query<RowDataPacket[]>(
      "SELECT IdTechnique, mitreID FROM Technique"
    );
    const techniqueMap = new Map<string, number>(
      techniques.map((t) => [t.mitreID as string, t.IdTechnique as number])
    );

    // ── 3. Insérer RegleSIEM + CouvertureDetection ────────────────────────
    const db = await pool.getConnection();
    let rulesProcessed = 0;
    let coverageEntries = 0;

    try {
      await db.beginTransaction();

      for (const rule of rulesWithMitre) {
        const wazuhRuleId          = rule.id as number;
        const mitreIds: string[]   = rule.mitre?.id ?? [];

        // Upsert RegleSIEM
        let idRegle = siemMap.get(wazuhRuleId);
        if (!idRegle) {
          const [rd] = await db.execute<ResultSetHeader>(
            "INSERT INTO RegleDeDetection () VALUES ()"
          );
          idRegle = rd.insertId;
          await db.execute(
            `INSERT INTO RegleSIEM (IdRegle, wazuhRuleId, titre, niveau)
             VALUES (?, ?, ?, ?)`,
            [idRegle, wazuhRuleId, rule.description ?? null, rule.level ?? null]
          );
          siemMap.set(wazuhRuleId, idRegle);
        }
        rulesProcessed++;

        // Insérer CouvertureDetection pour chaque technique MITRE de la règle
        for (const mitreId of mitreIds) {
          const idTechnique = techniqueMap.get(mitreId);
          if (!idTechnique) continue; // technique absente de notre DB

          const key = `${idRegle}-${idTechnique}`;
          if (coverageSet.has(key)) continue;

          await db.execute(
            "INSERT INTO CouvertureDetection (IdRegle, IdTechnique) VALUES (?, ?)",
            [idRegle, idTechnique]
          );
          coverageSet.add(key);
          coverageEntries++;
        }
      }

      await db.commit();
    } catch (err) {
      await db.rollback();
      throw err;
    } finally {
      db.release();
    }

    return NextResponse.json({ success: true, rulesProcessed, coverageEntries });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
