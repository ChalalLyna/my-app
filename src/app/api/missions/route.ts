import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import pool from "@/lib/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = user.role === "admin";

  let sql = `
    SELECT
      m.IdMission                       AS id,
      m.titre                           AS name,
      m.type,
      m.client                          AS target,
      m.statut                          AS status,
      m.taches                          AS tasks,
      m.description,
      m.DateDebut                       AS createdAt,
      m.DateFin                         AS completedAt,
      CONCAT(u.prenom, ' ', u.nom)      AS createdBy,
      rm.rapport                        AS reportJson,
      rm.description                    AS reportDescription,
      (SELECT COUNT(*) FROM LabMission lm WHERE lm.IdMission = m.IdMission) AS attackCount
    FROM Mission m
    JOIN Utilisateur u ON m.IdConsultant = u.IdUtilisateur
    LEFT JOIN ResultatMission rm ON m.IdResultatMission = rm.IdResultatMission
  `;
  const params: (string | number)[] = [];
  if (!isAdmin) {
    sql += " WHERE m.IdConsultant = ?";
    params.push(user.idUtilisateur);
  }
  sql += " ORDER BY m.DateDebut DESC, m.IdMission DESC";

  const [rows] = await pool.query<RowDataPacket[]>(sql, params);

  const missions = rows.map((row) => ({
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
    report:      row.reportJson ? JSON.parse(row.reportJson as string) : null,
    attackCount: Number(row.attackCount),
  }));

  return NextResponse.json(missions);
}

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "consultant" && user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as {
    name:        string;
    type:        "Red Team" | "Purple Team";
    target?:     string;
    tasks?:      string[];
    description?: string;
  };

  const { name, type, target, tasks, description } = body;
  if (!name?.trim() || !type) {
    return NextResponse.json({ error: "name and type are required" }, { status: 400 });
  }

  const db = await pool.getConnection();
  try {
    await db.beginTransaction();

    const [rm] = await db.execute<ResultSetHeader>(
      "INSERT INTO ResultatMission (description) VALUES (?)",
      [""]
    );
    const idResultatMission = rm.insertId;

    const [m] = await db.execute<ResultSetHeader>(
      `INSERT INTO Mission
         (titre, type, client, statut, taches, description, DateDebut, IdConsultant, IdResultatMission)
       VALUES (?, ?, ?, 'Planned', ?, ?, CURDATE(), ?, ?)`,
      [
        name.trim(),
        type,
        target?.trim() || null,
        tasks?.length ? JSON.stringify(tasks) : null,
        description?.trim() || null,
        user.idUtilisateur,
        idResultatMission,
      ]
    );

    await db.commit();
    return NextResponse.json({ success: true, id: String(m.insertId) }, { status: 201 });
  } catch (err: any) {
    await db.rollback();
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    db.release();
  }
}
