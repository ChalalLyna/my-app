import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

function extractMitreIds(xml: string): string[] {
  return [...xml.matchAll(/<id>(T\d+(?:\.\d+)?)<\/id>/g)].map((m) => m[1]);
}

export async function syncCoverage(idRegle: number, xml: string): Promise<void> {
  const mitreIds = extractMitreIds(xml);

  await pool.execute("DELETE FROM CouvertureDetection WHERE IdRegle = ?", [idRegle]);

  if (!mitreIds.length) return;

  const placeholders = mitreIds.map(() => "?").join(",");
  const [techniques] = await pool.query<RowDataPacket[]>(
    `SELECT IdTechnique FROM Technique WHERE mitreID IN (${placeholders})`,
    mitreIds
  );

  for (const t of techniques) {
    await pool.execute(
      "INSERT IGNORE INTO CouvertureDetection (IdRegle, IdTechnique) VALUES (?, ?)",
      [idRegle, t.IdTechnique]
    );
  }
}
