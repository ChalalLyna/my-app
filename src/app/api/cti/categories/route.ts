import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

const ALL_CATEGORIES = ["windows", "linux", "macos", "network", "cloud"] as const;

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(req: NextRequest) {
  if (!requireAuth(req)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  try {
    const [rows] = await pool.query(
      "SELECT Categorie, COUNT(*) AS count FROM RegleCTI GROUP BY Categorie"
    ) as any;

    const imported: { name: string; count: number }[] = (rows as any[]).map((r) => ({
      name:  r.Categorie,
      count: Number(r.count),
    }));

    const importedNames = new Set(imported.map((i) => i.name));
    const available     = ALL_CATEGORIES.filter((c) => !importedNames.has(c));

    return NextResponse.json({ imported, available, all: ALL_CATEGORIES });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}