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
         t.tactique,
         COUNT(DISTINCT la.IdTechnique) AS techniqueCount,
         COUNT(la.IdAttaque)            AS attackCount
       FROM LabApprentissage la
       JOIN Technique t ON la.IdTechnique = t.IdTechnique
       WHERE la.IdUtilisateur = ?
       GROUP BY t.tactique
       ORDER BY attackCount DESC`,
      [userId]
    );

    const tactics = (rows as any[]).map((r) => ({
      tactique:       r.tactique ?? "Unknown",
      techniqueCount: Number(r.techniqueCount),
      attackCount:    Number(r.attackCount),
    }));

    return NextResponse.json(tactics);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
