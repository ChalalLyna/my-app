import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import pool from "@/lib/db";

export type TechniqueStatus = "tested" | "covered" | "not_covered";

export interface TechniqueCoverage {
  idTechnique: number;
  mitreID:     string;
  nom:         string;
  tactique:    string;
  status:      TechniqueStatus;
}

export interface CoverageResponse {
  techniques:   TechniqueCoverage[];
  stats: {
    total:       number;
    tested:      number;
    covered:     number;
    not_covered: number;
  };
}

export async function GET() {
  try {
    // ── Toutes les techniques ─────────────────────────────────────────────
    const [allTechniques] = await pool.query<RowDataPacket[]>(
      `SELECT IdTechnique, mitreID, nom, tactique FROM Technique ORDER BY tactique, mitreID`
    );

    // ── Techniques couvertes (niveau 1) ───────────────────────────────────
    const [covered] = await pool.query<RowDataPacket[]>(
      `SELECT DISTINCT cd.IdTechnique
       FROM CouvertureDetection cd`
    );
    const coveredSet = new Set(covered.map((r) => r.IdTechnique as number));

    // ── Techniques testées (niveau 2) ─────────────────────────────────────
    // Une technique est "testée" si une simulation l'a ciblée ET a généré une alerte
    const [tested] = await pool.query<RowDataPacket[]>(
      `SELECT DISTINCT la.IdTechnique
       FROM LabApprentissage la
       JOIN Alerte al ON al.IdAttaque = la.IdAttaque

       UNION

       SELECT DISTINCT lam.IdTechnique
       FROM LabAmelioration lam
       JOIN Alerte al ON al.IdAttaque = lam.IdAttaque`
    );
    const testedSet = new Set(tested.map((r) => r.IdTechnique as number));

    // ── Calculer le statut de chaque technique ────────────────────────────
    const techniques: TechniqueCoverage[] = allTechniques.map((t) => {
      const id = t.IdTechnique as number;
      let status: TechniqueStatus;

      if (testedSet.has(id))       status = "tested";
      else if (coveredSet.has(id)) status = "covered";
      else                          status = "not_covered";

      return {
        idTechnique: id,
        mitreID:     t.mitreID  as string,
        nom:         t.nom      as string,
        tactique:    t.tactique as string ?? "Unknown",
        status,
      };
    });

    const stats = {
      total:       techniques.length,
      tested:      techniques.filter((t) => t.status === "tested").length,
      covered:     techniques.filter((t) => t.status === "covered").length,
      not_covered: techniques.filter((t) => t.status === "not_covered").length,
    };

    return NextResponse.json({ techniques, stats } satisfies CoverageResponse);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
