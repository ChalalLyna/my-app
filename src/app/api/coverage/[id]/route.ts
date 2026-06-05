import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import pool from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idTechnique = parseInt(id, 10);
  if (isNaN(idTechnique))
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    const [rules] = await pool.query<RowDataPacket[]>(
      `SELECT
         COALESCE(s1.wazuhRuleId, s2.wazuhRuleId, s3.wazuhRuleId) AS wazuhRuleId,
         COALESCE(s1.titre, s2.nom, s3.nom)                        AS titre,
         COALESCE(s1.niveau, 0)                                    AS niveau,
         CASE
           WHEN COALESCE(s1.niveau, 0) >= 12 THEN 'Critical'
           WHEN COALESCE(s1.niveau, 0) >= 8  THEN 'High'
           WHEN COALESCE(s1.niveau, 0) >= 4  THEN 'Medium'
           ELSE 'Low'
         END AS severite
       FROM CouvertureDetection cd
       LEFT JOIN RegleSIEM               s1 ON s1.IdRegle = cd.IdRegle
       LEFT JOIN RegleAjouteParConsultant s2 ON s2.IdRegle = cd.IdRegle
       LEFT JOIN RegleAjouteeParApprenant s3 ON s3.IdRegle = cd.IdRegle
       WHERE cd.IdTechnique = ?
       ORDER BY COALESCE(s1.niveau, 0) DESC`,
      [idTechnique]
    );

    // Rules that actually fired during simulations targeting this technique
    const [firedRules] = await pool.query<RowDataPacket[]>(
      `SELECT
         ANY_VALUE(COALESCE(s1.wazuhRuleId, s2.wazuhRuleId, s3.wazuhRuleId)) AS wazuhRuleId,
         ANY_VALUE(COALESCE(s1.titre, s2.nom, s3.nom))                        AS titre,
         ANY_VALUE(COALESCE(s1.niveau, 0))                                    AS niveau,
         CASE
           WHEN ANY_VALUE(COALESCE(s1.niveau, 0)) >= 12 THEN 'Critical'
           WHEN ANY_VALUE(COALESCE(s1.niveau, 0)) >= 8  THEN 'High'
           WHEN ANY_VALUE(COALESCE(s1.niveau, 0)) >= 4  THEN 'Medium'
           ELSE 'Low'
         END AS severite,
         COUNT(al.IdAlerte) AS alertCount
       FROM Alerte al
       LEFT JOIN RegleSIEM               s1 ON s1.IdRegle = al.IdRegle
       LEFT JOIN RegleAjouteParConsultant s2 ON s2.IdRegle = al.IdRegle
       LEFT JOIN RegleAjouteeParApprenant s3 ON s3.IdRegle = al.IdRegle
       JOIN (
         SELECT IdAttaque FROM LabApprentissage WHERE IdTechnique = ?
         UNION
         SELECT IdAttaque FROM LabAmelioration WHERE IdTechnique = ?
       ) atq ON atq.IdAttaque = al.IdAttaque
       GROUP BY al.IdRegle
       ORDER BY alertCount DESC`,
      [idTechnique, idTechnique]
    );

    return NextResponse.json({ rules, firedRules });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
