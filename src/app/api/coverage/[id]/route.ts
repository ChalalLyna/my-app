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

    return NextResponse.json({ rules });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
