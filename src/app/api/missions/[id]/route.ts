import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const missionId = Number(id);
  if (isNaN(missionId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const [[row]] = await pool.query<RowDataPacket[]>(
    `SELECT
       m.IdMission                     AS id,
       m.titre                         AS name,
       m.type,
       m.client                        AS target,
       m.statut                        AS status,
       m.taches                        AS tasks,
       m.description,
       m.DateDebut                     AS createdAt,
       m.DateFin                       AS completedAt,
       CONCAT(u.prenom, ' ', u.nom)    AS createdBy,
       rm.IdResultatMission,
       rm.rapport                      AS reportJson,
       rm.description                  AS reportDescription
     FROM Mission m
     JOIN Utilisateur u  ON m.IdConsultant      = u.IdUtilisateur
     LEFT JOIN ResultatMission rm ON m.IdResultatMission = rm.IdResultatMission
     WHERE m.IdMission = ?`,
    [missionId]
  );

  if (!row) return NextResponse.json({ error: "Mission not found" }, { status: 404 });

  // Attacks that belong to this mission
  const [attacks] = await pool.query<RowDataPacket[]>(
    `SELECT DISTINCT
       a.IdAttaque        AS id,
       a.DateExecution    AS date,
       a.statut,
       a.calderaOperationId,
       ra.rapport         AS rapport
     FROM LabMission lm
     JOIN Attaque a           ON lm.IdAttaque = a.IdAttaque
     JOIN ResultatAttaque ra  ON a.IdResultatAttaque = ra.IdResultatAttaque
     WHERE lm.IdMission = ?
     ORDER BY a.DateExecution DESC`,
    [missionId]
  );

  // Techniques used (distinct)
  const [techniques] = await pool.query<RowDataPacket[]>(
    `SELECT DISTINCT t.mitreID
     FROM LabMission lm
     JOIN Technique t ON lm.IdTechnique = t.IdTechnique
     WHERE lm.IdMission = ?`,
    [missionId]
  );

  // Alert count
  const [[{ alertCount }]] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS alertCount
     FROM Alerte al
     WHERE al.IdAttaque IN (
       SELECT DISTINCT lm.IdAttaque FROM LabMission lm WHERE lm.IdMission = ?
     )`,
    [missionId]
  );

  const mission = {
    id:          String(row.id),
    name:        row.name,
    type:        row.type,
    target:      row.target ?? "—",
    status:      row.status,
    tasks:       row.tasks ? JSON.parse(row.tasks as string) : [],
    description: row.description ?? "",
    createdAt:   row.createdAt,
    completedAt: row.completedAt ?? null,
    createdBy:   row.createdBy,
    idResultatMission: row.IdResultatMission,
    attacks:     attacks.map((a) => ({
      id:                 a.id,
      date:               a.date,
      statut:             a.statut,
      calderaOperationId: a.calderaOperationId,
      rapport:            a.rapport ?? null,
    })),
    ttpsUsed:        techniques.map((t) => t.mitreID as string),
    alertsGenerated: Number(alertCount),
    report:          row.reportJson ? JSON.parse(row.reportJson as string) : null,
  };

  return NextResponse.json(mission);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const missionId = Number(id);
  if (isNaN(missionId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json() as {
    statut?:  string;
    rapport?: object;
  };

  const db = await pool.getConnection();
  try {
    await db.beginTransaction();

    if (body.statut) {
      const dateFin = body.statut === "Completed" || body.statut === "Failed"
        ? "CURDATE()"
        : "NULL";
      await db.execute(
        `UPDATE Mission SET statut = ?, DateFin = ${dateFin} WHERE IdMission = ?`,
        [body.statut, missionId]
      );
    }

    if (body.rapport !== undefined) {
      await db.execute(
        `UPDATE ResultatMission rm
         JOIN Mission m ON m.IdResultatMission = rm.IdResultatMission
         SET rm.rapport = ?, rm.description = ?
         WHERE m.IdMission = ?`,
        [
          JSON.stringify(body.rapport),
          (body.rapport as any).summary ?? "",
          missionId,
        ]
      );
    }

    await db.commit();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    await db.rollback();
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    db.release();
  }
}
