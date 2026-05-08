import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(req: NextRequest) {
  if (!requireAuth(req)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const search   = req.nextUrl.searchParams.get("search")   ?? "";
  const category = req.nextUrl.searchParams.get("category") ?? "";
  const severity = req.nextUrl.searchParams.get("severity") ?? "";
  const limit    = Math.min(parseInt(req.nextUrl.searchParams.get("limit")  ?? "50"), 200);
  const offset   = Math.max(parseInt(req.nextUrl.searchParams.get("offset") ?? "0"),  0);

  try {
    const conditions: string[] = [];
    const params: unknown[]    = [];

    if (search) {
      conditions.push("(Titre LIKE ? OR Description LIKE ? OR Auteur LIKE ? OR TechniquesMitre LIKE ?)");
      const q = `%${search}%`;
      params.push(q, q, q, q);
    }
    if (category) {
      conditions.push("Categorie = ?");
      params.push(category);
    }
    if (severity) {
      conditions.push("Severite = ?");
      params.push(severity);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `SELECT IdRegle, IdSigma, Titre, Description, Auteur,
              DateAjout, DerniereModification,
              TechniquesMitre, Severite, NiveauWazuh, Produit, Categorie
       FROM RegleCTI ${where}
       ORDER BY Titre ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total FROM RegleCTI ${where}`,
      params
    ) as any;

    return NextResponse.json({ rules: rows, total: countRow.total });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
