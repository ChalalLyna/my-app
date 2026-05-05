import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    const [rows] = await pool.query(
      `SELECT IdGuide AS id, titre, description, contenu, categorie, DateCreation AS dateCreation
       FROM Guide WHERE IdGuide = ?`,
      [id]
    );

    const list = rows as any[];
    if (list.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const row = list[0];
    return NextResponse.json({
      id:           Number(row.id),
      titre:        row.titre ?? "",
      description:  row.description ?? "",
      contenu:      row.contenu ?? "",
      categorie:    row.categorie ?? "",
      dateCreation: row.dateCreation ?? null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
