import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

function extractMitreIds(xml: string): string[] {
  // Format standard Wazuh : <mitre><id>T1234.001</id></mitre>
  const fromMitre = [...xml.matchAll(/<id>(T\d+(?:\.\d+)?)<\/id>/g)].map((m) => m[1]);
  if (fromMitre.length) return [...new Set(fromMitre)];
  // Format groupe : <group>cyberlab,T1234.001,</group>
  const m = xml.match(/<group[^>]*>([^<]+)<\/group>/);
  if (!m) return [];
  return m[1].split(",").map((s) => s.trim()).filter((s) => /^T\d{4}(?:\.\d+)?/.test(s));
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
