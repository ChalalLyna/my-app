import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import pool from "@/lib/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

const SELECT_REVIEW = `
  SELECT
    rapa.IdRegle                    AS id,
    rapa.nom                        AS ruleName,
    rapa.XmlWazuh                   AS xml,
    rapa.filename,
    rapa.action,
    rapa.statut                     AS status,
    rapa.dateCreation               AS submittedAt,
    rapa.dateRevision               AS reviewedAt,
    rapa.commentaire                AS comment,
    rapa.IdApprenant                AS submittedById,
    CONCAT(ua.prenom, ' ', ua.nom)  AS submittedBy,
    CONCAT(uc.prenom, ' ', uc.nom)  AS reviewedBy
  FROM RegleAjouteeParApprenant rapa
  JOIN  Utilisateur ua ON rapa.IdApprenant  = ua.IdUtilisateur
  LEFT JOIN Utilisateur uc ON rapa.IdConsultant = uc.IdUtilisateur
`;

export async function GET(req: NextRequest) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const mine   = req.nextUrl.searchParams.get("mine") === "true";
  const status = req.nextUrl.searchParams.get("status");

  const conditions: string[] = [];
  const params: unknown[]    = [];

  if (mine) {
    conditions.push("rapa.IdApprenant = ?");
    params.push(payload.idUtilisateur);
  }
  if (status) {
    conditions.push("rapa.statut = ?");
    params.push(status);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [rows] = await pool.query<RowDataPacket[]>(
    `${SELECT_REVIEW} ${where} ORDER BY rapa.dateCreation DESC`,
    params
  );

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { ruleName, xml, filename, action } = body;

  if (!ruleName || !xml || !filename || !action) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [r1] = await conn.execute<ResultSetHeader>(
      "INSERT INTO RegleDeDetection () VALUES ()"
    );
    const idRegle = r1.insertId;

    await conn.execute(
      `INSERT INTO RegleAjouteeParApprenant
         (IdRegle, IdApprenant, nom, XmlWazuh, filename, action)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [idRegle, payload.idUtilisateur, ruleName, xml, filename, action]
    );

    await conn.commit();

    return NextResponse.json(
      {
        id:           idRegle,
        ruleName,
        xml,
        filename,
        action,
        status:       "pending",
        submittedBy:  `${payload.prenom} ${payload.nom}`,
        submittedById: payload.idUtilisateur,
        submittedAt:  new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (err) {
    await conn.rollback();
    console.error("POST /api/rule-reviews:", err);
    return NextResponse.json({ error: "Database error." }, { status: 500 });
  } finally {
    conn.release();
  }
}