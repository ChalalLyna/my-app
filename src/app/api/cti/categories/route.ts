import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

const ALL_CATEGORIES = ["windows", "linux", "macos", "network", "cloud", "web"] as const;

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(req: NextRequest) {
  if (!requireAuth(req)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const filterCategory = req.nextUrl.searchParams.get("category") ?? "";

  try {
    const [catRows] = await pool.query(
      "SELECT Categorie, COUNT(*) AS count FROM RegleCTI GROUP BY Categorie"
    ) as any;

    const imported: { name: string; count: number }[] = (catRows as any[]).map((r) => ({
      name:  r.Categorie,
      count: Number(r.count),
    }));

    const importedNames = new Set(imported.map((i) => i.name));
    const available     = ALL_CATEGORIES.filter((c) => !importedNames.has(c));

    // Subcategories — filtered by category if provided
    const subParams: unknown[] = [];
    let subWhere = "SousCategorie IS NOT NULL AND SousCategorie != ''";
    if (filterCategory) {
      subWhere += " AND Categorie = ?";
      subParams.push(filterCategory);
    }

    const [subRows] = await pool.query(
      `SELECT SousCategorie, COUNT(*) AS count
       FROM RegleCTI
       WHERE ${subWhere}
       GROUP BY SousCategorie
       ORDER BY SousCategorie ASC`,
      subParams
    ) as any;

    const subcategories: { name: string; count: number }[] = (subRows as any[]).map((r) => ({
      name:  r.SousCategorie,
      count: Number(r.count),
    }));

    return NextResponse.json({ imported, available, all: ALL_CATEGORIES, subcategories });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}