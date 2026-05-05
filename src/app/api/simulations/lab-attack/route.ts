import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import pool from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { userId, assetIds, ttpMitreIds, status, description } = await req.json() as {
      userId:      number;
      assetIds:    string[];
      ttpMitreIds: string[];
      status:      string;
      description: string;
    };

    if (!userId) return NextResponse.json({ error: "userId manquant" }, { status: 400 });
    const idUtilisateur = userId;

    // Resolve MITRE IDs → DB IdTechnique
    let techniqueIds: number[] = [];
    if (ttpMitreIds?.length) {
      const ph = ttpMitreIds.map(() => "?").join(",");
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT IdTechnique FROM Technique WHERE mitreID IN (${ph})`,
        ttpMitreIds
      );
      techniqueIds = rows.map((r) => r.IdTechnique as number);
    }

    const db = await pool.getConnection();
    try {
      await db.beginTransaction();

      // 1. ResultatAttaque
      const [ra] = await db.execute<ResultSetHeader>(
        "INSERT INTO ResultatAttaque (description) VALUES (?)",
        [description ?? ""]
      );
      const idResultatAttaque = ra.insertId;

      // 2. Attaque
      const [att] = await db.execute<ResultSetHeader>(
        `INSERT INTO Attaque (DateExecution, statut, type, IdResultatAttaque)
         VALUES (CURDATE(), ?, 'apprentissage', ?)`,
        [status, idResultatAttaque]
      );
      const idAttaque = att.insertId;

      // 3. LabApprentissage — une ligne par (actif × technique)
      if (assetIds?.length && techniqueIds.length) {
        const [[{ nextId }]] = await db.query<RowDataPacket[]>(
          "SELECT COALESCE(MAX(IdLabApprentissage), 0) + 1 AS nextId FROM LabApprentissage"
        );
        const idLab = nextId as number;

        for (const assetId of assetIds) {
          for (const techId of techniqueIds) {
            await db.execute(
              `INSERT INTO LabApprentissage
                 (IdLabApprentissage, IdUtilisateur, IdActif, IdTechnique, IdAttaque)
               VALUES (?, ?, ?, ?, ?)`,
              [idLab, idUtilisateur, Number(assetId), techId, idAttaque]
            );
          }
        }
      }

      await db.commit();
      return NextResponse.json({ success: true, idAttaque });
    } catch (err) {
      await db.rollback();
      throw err;
    } finally {
      db.release();
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}