import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import pool from "@/lib/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// GET — list client rules imported for this mission
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
       rc.IdRegle      AS id,
       rc.nom,
       rc.description,
       rc.severite,
       rc.dateImport,
       rc.XmlWazuh     AS xml
     FROM RegleClient rc
     WHERE rc.IdMission = ?
     ORDER BY rc.dateImport DESC`,
    [missionId]
  );

  return NextResponse.json(rows);
}

// POST — import a client rule into this mission
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

  const body = await req.json() as {
    rules: {
      nom?:         string;
      description?: string;
      severite?:    string;
      xml?:         string;
    }[];
  };

  if (!body.rules?.length) {
    return NextResponse.json({ error: "No rules provided" }, { status: 400 });
  }

  // Verify mission exists and is Purple Team
  const [[mission]] = await pool.query<RowDataPacket[]>(
    "SELECT IdMission, type FROM Mission WHERE IdMission = ?",
    [missionId]
  );
  if (!mission) return NextResponse.json({ error: "Mission not found" }, { status: 404 });
  if (mission.type !== "Purple Team") {
    return NextResponse.json(
      { error: "Client rule import is only available for Purple Team missions" },
      { status: 403 }
    );
  }

  const db = await pool.getConnection();
  try {
    await db.beginTransaction();

    const inserted: number[] = [];
    for (const rule of body.rules) {
      // Create base RegleDeDetection entry
      const [rd] = await db.execute<ResultSetHeader>(
        "INSERT INTO RegleDeDetection () VALUES ()"
      );
      const idRegle = rd.insertId;

      // Create RegleClient entry
      await db.execute(
        `INSERT INTO RegleClient (IdRegle, IdMission, nom, description, severite, XmlWazuh, dateImport)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          idRegle,
          missionId,
          rule.nom?.trim() || null,
          rule.description?.trim() || null,
          rule.severite || null,
          rule.xml || null,
        ]
      );
      inserted.push(idRegle);
    }

    await db.commit();
    return NextResponse.json({ success: true, inserted: inserted.length }, { status: 201 });
  } catch (err: any) {
    await db.rollback();
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    db.release();
  }
}
