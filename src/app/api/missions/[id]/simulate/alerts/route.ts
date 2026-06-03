import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import pool from "@/lib/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

function toMysqlDatetime(iso: string): string {
  return new Date(iso).toISOString().replace("T", " ").replace("Z", "").slice(0, 19);
}

// POST — save Wazuh alerts for a mission attack (same logic as lab-attack/alerts)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (isNaN(Number(id))) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const { idAttaque, alerts } = await req.json() as {
    idAttaque: number;
    alerts:    {
      wazuhRuleId:  number;
      titre:        string;
      niveau:       number;
      severite:     string;
      message:      string;
      dateDetection: string;
    }[];
  };

  if (!idAttaque || !alerts?.length) {
    return NextResponse.json({ error: "idAttaque and alerts are required" }, { status: 400 });
  }

  const db = await pool.getConnection();
  try {
    await db.beginTransaction();

    for (const alert of alerts) {
      // Find or create the SIEM rule
      const [existing] = await db.query<RowDataPacket[]>(
        "SELECT IdRegle FROM RegleSIEM WHERE wazuhRuleId = ?",
        [alert.wazuhRuleId]
      );

      let idRegle: number;
      if (existing.length > 0) {
        idRegle = existing[0].IdRegle as number;
      } else {
        const [rd] = await db.execute<ResultSetHeader>(
          "INSERT INTO RegleDeDetection () VALUES ()"
        );
        idRegle = rd.insertId;
        await db.execute(
          "INSERT INTO RegleSIEM (IdRegle, wazuhRuleId, titre, niveau) VALUES (?, ?, ?, ?)",
          [idRegle, alert.wazuhRuleId, alert.titre ?? null, alert.niveau ?? null]
        );
      }

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
  } catch (err: any) {
    await db.rollback();
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    db.release();
  }
}

// GET — list alerts for all attacks of a mission
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const missionId = Number(id);
  if (isNaN(missionId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
       al.IdAlerte       AS id,
       al.severite,
       al.message,
       al.dateDetection,
       al.statut,
       al.estFauxPositif AS isFalsePositive,
       rs.wazuhRuleId,
       rs.titre          AS ruleTitle,
       a.IdAttaque       AS attackId,
       a.DateExecution   AS attackDate
     FROM Alerte al
     JOIN Attaque a ON al.IdAttaque = a.IdAttaque
     LEFT JOIN RegleSIEM rs ON al.IdRegle = rs.IdRegle
     WHERE al.IdAttaque IN (
       SELECT DISTINCT lm.IdAttaque FROM LabMission lm WHERE lm.IdMission = ?
     )
     ORDER BY al.dateDetection DESC`,
    [missionId]
  );

  return NextResponse.json(rows);
}
