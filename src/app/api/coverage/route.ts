import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import pool from "@/lib/db";

export type TechniqueStatus = "detected" | "triggered" | "covered" | "not_covered";

export interface TechniqueCoverage {
  idTechnique: number;
  mitreID:     string;
  nom:         string;
  tactique:    string;
  status:      TechniqueStatus;
}

export interface CoverageResponse {
  techniques: TechniqueCoverage[];
  stats: {
    total:       number;
    detected:    number;
    triggered:   number;
    covered:     number;
    not_covered: number;
  };
}

export async function GET() {
  try {
    const [allTechniques] = await pool.query<RowDataPacket[]>(
      `SELECT IdTechnique, mitreID, nom, tactique FROM Technique ORDER BY tactique, mitreID`
    );

    // Level 1 — rules configured to cover the technique (CouvertureDetection)
    const [covered] = await pool.query<RowDataPacket[]>(
      `SELECT DISTINCT cd.IdTechnique FROM CouvertureDetection cd`
    );
    const coveredSet = new Set(covered.map((r) => r.IdTechnique as number));

    // Level 2a — "detected": alert fired by a rule specifically tagged for this technique
    const [detected] = await pool.query<RowDataPacket[]>(
      `SELECT DISTINCT la.IdTechnique
       FROM LabApprentissage la
       JOIN Alerte al ON al.IdAttaque = la.IdAttaque
       JOIN RegleSIEM rs ON rs.IdRegle = al.IdRegle
       JOIN CouvertureDetection cd ON cd.IdRegle = rs.IdRegle AND cd.IdTechnique = la.IdTechnique

       UNION

       SELECT DISTINCT lam.IdTechnique
       FROM LabAmelioration lam
       JOIN Alerte al ON al.IdAttaque = lam.IdAttaque
       JOIN RegleSIEM rs ON rs.IdRegle = al.IdRegle
       JOIN CouvertureDetection cd ON cd.IdRegle = rs.IdRegle AND cd.IdTechnique = lam.IdTechnique`
    );
    const detectedSet = new Set(detected.map((r) => r.IdTechnique as number));

    // Level 2b — "triggered": attack simulated AND any alert fired (rule not tagged for the technique)
    const [triggered] = await pool.query<RowDataPacket[]>(
      `SELECT DISTINCT la.IdTechnique
       FROM LabApprentissage la
       JOIN Alerte al ON al.IdAttaque = la.IdAttaque

       UNION

       SELECT DISTINCT lam.IdTechnique
       FROM LabAmelioration lam
       JOIN Alerte al ON al.IdAttaque = lam.IdAttaque`
    );
    const triggeredSet = new Set(triggered.map((r) => r.IdTechnique as number));

    const techniques: TechniqueCoverage[] = allTechniques.map((t) => {
      const id = t.IdTechnique as number;
      let status: TechniqueStatus;

      if      (detectedSet.has(id))  status = "detected";
      else if (triggeredSet.has(id)) status = "triggered";
      else if (coveredSet.has(id))   status = "covered";
      else                            status = "not_covered";

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
      detected:    techniques.filter((t) => t.status === "detected").length,
      triggered:   techniques.filter((t) => t.status === "triggered").length,
      covered:     techniques.filter((t) => t.status === "covered").length,
      not_covered: techniques.filter((t) => t.status === "not_covered").length,
    };

    return NextResponse.json({ techniques, stats } satisfies CoverageResponse);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}