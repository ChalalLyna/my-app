import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import pool from "@/lib/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// GET — list rules already exported for this mission
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
       re.IdRegle     AS id,
       re.DateExport  AS dateExport,
       -- resolve sub-type: CTI, consultant, or apprenant
       COALESCE(cti.Titre,   rapc.nom,   rapa.nom)        AS titre,
       COALESCE(cti.Severite, rapc.severite, rapa.severite) AS severite,
       COALESCE(cti.Categorie, NULL, NULL)                  AS categorie,
       CASE
         WHEN cti.IdRegle  IS NOT NULL THEN 'cti'
         WHEN rapc.IdRegle IS NOT NULL THEN 'consultant'
         WHEN rapa.IdRegle IS NOT NULL THEN 'apprenant'
         ELSE 'unknown'
       END AS sourceType
     FROM RegleExportee re
     LEFT JOIN RegleCTI                 cti  ON re.IdRegle = cti.IdRegle
     LEFT JOIN RegleAjouteParConsultant rapc ON re.IdRegle = rapc.IdRegle
     LEFT JOIN RegleAjouteeParApprenant rapa ON re.IdRegle = rapa.IdRegle
     WHERE re.IdMission = ?
     ORDER BY re.DateExport DESC`,
    [missionId]
  );

  return NextResponse.json(rows);
}

// POST — export rules to the client (create RegleExportee entries)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "consultant") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const missionId = Number(id);
  if (isNaN(missionId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json() as { ruleIds: number[] };
  if (!body.ruleIds?.length) {
    return NextResponse.json({ error: "ruleIds is required" }, { status: 400 });
  }

  const db = await pool.getConnection();
  try {
    await db.beginTransaction();

    let inserted = 0;
    for (const ruleId of body.ruleIds) {
      // INSERT IGNORE avoids duplicates if already exported
      const [res] = await db.execute<ResultSetHeader>(
        `INSERT IGNORE INTO RegleExportee (IdMission, IdRegle, DateExport)
         VALUES (?, ?, CURDATE())`,
        [missionId, ruleId]
      );
      inserted += res.affectedRows;
    }

    await db.commit();
    return NextResponse.json({ success: true, inserted }, { status: 201 });
  } catch (err: any) {
    await db.rollback();
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    db.release();
  }
}
