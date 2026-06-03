import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import pool from "@/lib/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

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

  const { assetIds, ttpMitreIds, status, description, calderaOperationId } = await req.json() as {
    assetIds:           string[];
    ttpMitreIds:        string[];
    status:             string;
    description?:       string;
    calderaOperationId?: string | null;
  };

  if (!assetIds?.length || !ttpMitreIds?.length) {
    return NextResponse.json({ error: "assetIds and ttpMitreIds are required" }, { status: 400 });
  }

  // Resolve mission → IdResultatMission
  const [[mission]] = await pool.query<RowDataPacket[]>(
    "SELECT IdResultatMission FROM Mission WHERE IdMission = ?",
    [missionId]
  );
  if (!mission) return NextResponse.json({ error: "Mission not found" }, { status: 404 });

  // Resolve MITRE IDs → DB technique IDs
  const ph = ttpMitreIds.map(() => "?").join(",");
  const [techRows] = await pool.query<RowDataPacket[]>(
    `SELECT IdTechnique FROM Technique WHERE mitreID IN (${ph})`,
    ttpMitreIds
  );
  const techniqueIds = techRows.map((r) => r.IdTechnique as number);

  if (!techniqueIds.length) {
    return NextResponse.json({ error: "No matching techniques found" }, { status: 400 });
  }

  const db = await pool.getConnection();
  try {
    await db.beginTransaction();

    // 1. ResultatAttaque linked to the mission's ResultatMission
    const [ra] = await db.execute<ResultSetHeader>(
      "INSERT INTO ResultatAttaque (description, IdResultatMission) VALUES (?, ?)",
      [description ?? "", mission.IdResultatMission]
    );
    const idResultatAttaque = ra.insertId;

    // 2. Attaque (type = 'mission')
    const [att] = await db.execute<ResultSetHeader>(
      `INSERT INTO Attaque (DateExecution, statut, type, IdResultatAttaque, calderaOperationId)
       VALUES (NOW(), ?, 'mission', ?, ?)`,
      [status, idResultatAttaque, calderaOperationId ?? null]
    );
    const idAttaque = att.insertId;

    // 3. LabMission entries for each (asset, technique) pair
    for (const assetId of assetIds) {
      for (const techId of techniqueIds) {
        await db.execute(
          `INSERT INTO LabMission (IdMission, IdUtilisateur, IdActif, IdTechnique, IdAttaque)
           VALUES (?, ?, ?, ?, ?)`,
          [missionId, user.idUtilisateur, Number(assetId), techId, idAttaque]
        );
      }
    }

    // 4. Set mission status to In Progress if still Planned
    await db.execute(
      `UPDATE Mission SET statut = 'In Progress'
       WHERE IdMission = ? AND statut = 'Planned'`,
      [missionId]
    );

    await db.commit();
    return NextResponse.json({ success: true, idAttaque }, { status: 201 });
  } catch (err: any) {
    await db.rollback();
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    db.release();
  }
}
