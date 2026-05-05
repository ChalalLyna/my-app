import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token   = req.cookies.get(COOKIE_NAME)?.value;
  const payload = token ? verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const userId = payload.idUtilisateur;

  try {
    const [rows] = await pool.query(
      `SELECT
         COUNT(DISTINCT la.IdAttaque)   AS attackCount,
         COUNT(DISTINCT la.IdTechnique) AS techniqueCount
       FROM LabApprentissage la
       WHERE la.IdUtilisateur = ?`,
      [userId]
    );

    const row = (rows as any[])[0];
    return NextResponse.json({
      attackCount:    Number(row.attackCount),
      techniqueCount: Number(row.techniqueCount),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
