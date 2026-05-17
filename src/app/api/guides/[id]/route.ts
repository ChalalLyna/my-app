import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.role === "admin" ? payload : null;
}

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

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    const { titre, description, contenu, categorie } = await req.json();
    if (!titre || !contenu) {
      return NextResponse.json({ error: "titre et contenu requis" }, { status: 400 });
    }

    await pool.query(
      `UPDATE Guide SET titre = ?, description = ?, contenu = ?, categorie = ? WHERE IdGuide = ?`,
      [titre, description ?? "", contenu, categorie ?? "", id]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    await pool.query(`DELETE FROM Guide WHERE IdGuide = ?`, [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
