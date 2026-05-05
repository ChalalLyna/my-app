import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const [rows] = await pool.query(`
      SELECT
        IdGuide      AS id,
        titre        AS titre,
        description,
        contenu,
        categorie,
        DateCreation AS dateCreation
      FROM Guide
      ORDER BY categorie, titre
    `);

    const guides = (rows as any[]).map((row) => ({
      id:           Number(row.id),
      titre:        row.titre ?? "",
      description:  row.description ?? "",
      contenu:      row.contenu ?? "",
      categorie:    row.categorie ?? "",
      dateCreation: row.dateCreation ?? null,
    }));

    return NextResponse.json(guides);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { titre, description, contenu, categorie } = await req.json();
    if (!titre || !contenu) {
      return NextResponse.json({ error: "titre et contenu requis" }, { status: 400 });
    }

    const [result] = await pool.query(
      `INSERT INTO Guide (titre, description, contenu, categorie) VALUES (?, ?, ?, ?)`,
      [titre, description ?? "", contenu, categorie ?? ""]
    );

    const insertId = (result as any).insertId;
    return NextResponse.json({ id: insertId }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
