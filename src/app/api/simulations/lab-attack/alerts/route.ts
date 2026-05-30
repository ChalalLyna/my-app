import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import pool from "@/lib/db";

interface WazuhAlertPayload {
  wazuhRuleId: number;
  titre:       string;
  niveau:      number;
  severite:    string;
  message:     string;
  dateDetection: string;
}

function toMysqlDatetime(iso: string): string {
  return new Date(iso).toISOString().replace("T", " ").replace("Z", "").slice(0, 19);
}

export async function POST(req: NextRequest) {
  try {
    const { idAttaque, alerts } = await req.json() as {
      idAttaque: number;
      alerts:    WazuhAlertPayload[];
    };

    if (!idAttaque || !alerts?.length)
      return NextResponse.json({ error: "idAttaque ou alerts manquants" }, { status: 400 });

    const db = await pool.getConnection();
    try {
      await db.beginTransaction();

      for (const alert of alerts) {
        // 1. Cherche si cette règle Wazuh est déjà dans RegleSIEM
        const [existing] = await db.query<RowDataPacket[]>(
          "SELECT IdRegle FROM RegleSIEM WHERE wazuhRuleId = ?",
          [alert.wazuhRuleId]
        );

        let idRegle: number;

        if (existing.length > 0) {
          idRegle = existing[0].IdRegle as number;
        } else {
          // 2. Crée l'entrée parente dans RegleDeDetection
          const [rd] = await db.execute<ResultSetHeader>(
            "INSERT INTO RegleDeDetection () VALUES ()"
          );
          idRegle = rd.insertId;

          // 3. Crée l'entrée dans RegleSIEM
          await db.execute(
            `INSERT INTO RegleSIEM (IdRegle, wazuhRuleId, titre, niveau)
             VALUES (?, ?, ?, ?)`,
            [idRegle, alert.wazuhRuleId, alert.titre ?? null, alert.niveau ?? null]
          );
        }

        // 4. Insère l'alerte liée à l'attaque et à la règle
        await db.execute(
          `INSERT INTO Alerte (IdAttaque, IdRegle, severite, message, dateDetection, statut)
           VALUES (?, ?, ?, ?, ?, 'new')`,
          [
            idAttaque,
            idRegle,
            alert.severite ?? null,
            alert.message ?? null,
            toMysqlDatetime(alert.dateDetection ?? new Date().toISOString()),
          ]
        );
      }

      await db.commit();
      return NextResponse.json({ success: true, saved: alerts.length });
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
