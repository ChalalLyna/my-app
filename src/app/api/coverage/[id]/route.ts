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
         s.wazuhRuleId,
         s.titre,
         s.niveau,
         CASE
           WHEN s.niveau >= 12 THEN 'Critical'
           WHEN s.niveau >= 8  THEN 'High'
           WHEN s.niveau >= 4  THEN 'Medium'
           ELSE 'Low'
         END AS severite
       FROM CouvertureDetection cd
       JOIN RegleSIEM s ON s.IdRegle = cd.IdRegle
       WHERE cd.IdTechnique = ?
       ORDER BY s.niveau DESC`,
      [idTechnique]
    );

    // Rules that actually fired during simulations targeting this technique
    const [firedRules] = await pool.query<RowDataPacket[]>(
      `SELECT rs.wazuhRuleId, rs.titre, rs.niveau,
         CASE
           WHEN rs.niveau >= 12 THEN 'Critical'
           WHEN rs.niveau >= 8  THEN 'High'
           WHEN rs.niveau >= 4  THEN 'Medium'
           ELSE 'Low'
         END AS severite,
         COUNT(al.IdAlerte) AS alertCount
       FROM Alerte al
       JOIN RegleSIEM rs ON rs.IdRegle = al.IdRegle
       JOIN (
         SELECT IdAttaque FROM LabApprentissage WHERE IdTechnique = ?
         UNION
         SELECT IdAttaque FROM LabAmelioration WHERE IdTechnique = ?
       ) atq ON atq.IdAttaque = al.IdAttaque
       GROUP BY rs.wazuhRuleId, rs.titre, rs.niveau
       ORDER BY alertCount DESC`,
      [idTechnique, idTechnique]
    );

    return NextResponse.json({ rules, firedRules });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
