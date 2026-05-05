import { NextResponse } from "next/server";
import pool from "@/lib/db";

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

export async function POST(req: Request) {
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
