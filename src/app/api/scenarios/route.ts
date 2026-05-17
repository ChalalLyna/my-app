import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.role === "admin" ? payload : null;
}

export async function GET() {
  try {
    const [rows] = await pool.query(`
      SELECT
        IdScenario       AS id,
        titre,
        description,
        objectif,
        niveau,
        bruit_recommande AS bruitRecommande,
        contenu,
        DateCreation     AS dateCreation
      FROM Scenario
      ORDER BY
        FIELD(niveau, 'beginner', 'intermediate', 'advanced'),
        titre
    `);

    const scenarios = (rows as any[]).map((row) => ({
      id:              Number(row.id),
      titre:           row.titre ?? "",
      description:     row.description ?? "",
      objectif:        row.objectif ?? "",
      niveau:          row.niveau ?? "beginner",
      bruitRecommande: Boolean(row.bruitRecommande),
      contenu:         row.contenu ?? "",
      dateCreation:    row.dateCreation ?? null,
    }));

    return NextResponse.json(scenarios);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  try {
    const { titre, description, objectif, niveau, bruitRecommande, contenu } = await req.json();
    if (!titre || !contenu) {
      return NextResponse.json({ error: "titre et contenu requis" }, { status: 400 });
    }

    const [result] = await pool.query(
      `INSERT INTO Scenario (titre, description, objectif, niveau, bruit_recommande, contenu)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [titre, description ?? "", objectif ?? "", niveau ?? "beginner", bruitRecommande ? 1 : 0, contenu]
    );

    return NextResponse.json({ id: (result as any).insertId }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
