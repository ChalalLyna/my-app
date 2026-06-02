import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT rangeStart, rangeEnd FROM Utilisateur WHERE IdUtilisateur = ?",
    [payload.idUtilisateur]
  );
  const row = rows[0];

  return NextResponse.json({
    ...payload,
    rangeStart: row?.rangeStart ?? null,
    rangeEnd:   row?.rangeEnd   ?? null,
  });
}
