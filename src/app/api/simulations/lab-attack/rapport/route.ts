import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { idAttaque, rapport } = await req.json() as {
      idAttaque: number;
      rapport:   string;
    };

    if (!idAttaque || !rapport)
      return NextResponse.json({ error: "idAttaque et rapport requis" }, { status: 400 });

    const [result] = await pool.execute(
      `UPDATE ResultatAttaque ra
       INNER JOIN Attaque a ON a.IdResultatAttaque = ra.IdResultatAttaque
       SET ra.rapport = ?
       WHERE a.IdAttaque = ?`,
      [rapport, idAttaque]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
