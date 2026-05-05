import { NextResponse } from "next/server";
import pool from "@/lib/db";

type Context = { params: Promise<{ id: string }> };

async function parseId(params: Context["params"]) {
  const { id } = await params;
  const n = Number(id);
  return isNaN(n) ? null : n;
}

export async function GET(_req: Request, { params }: Context) {
  const id = await parseId(params);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    const [rows] = await pool.query(
      `SELECT IdScenario AS id, titre, description, objectif, niveau,
              bruit_recommande AS bruitRecommande, contenu, DateCreation AS dateCreation
       FROM Scenario WHERE IdScenario = ?`,
      [id]
    );
    const list = rows as any[];
    if (list.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const row = list[0];
    return NextResponse.json({
      id:              Number(row.id),
      titre:           row.titre ?? "",
      description:     row.description ?? "",
      objectif:        row.objectif ?? "",
      niveau:          row.niveau ?? "beginner",
      bruitRecommande: Boolean(row.bruitRecommande),
      contenu:         row.contenu ?? "",
      dateCreation:    row.dateCreation ?? null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: Context) {
  const id = await parseId(params);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    const { titre, description, objectif, niveau, bruitRecommande, contenu } = await req.json();
    if (!titre || !contenu) {
      return NextResponse.json({ error: "titre et contenu requis" }, { status: 400 });
    }

    await pool.query(
      `UPDATE Scenario SET titre=?, description=?, objectif=?, niveau=?, bruit_recommande=?, contenu=?
       WHERE IdScenario=?`,
      [titre, description ?? "", objectif ?? "", niveau ?? "beginner", bruitRecommande ? 1 : 0, contenu, id]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Context) {
  const id = await parseId(params);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    await pool.query(`DELETE FROM Scenario WHERE IdScenario = ?`, [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
