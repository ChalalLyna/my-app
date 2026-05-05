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
