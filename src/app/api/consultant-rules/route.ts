import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(req: NextRequest) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
       rapc.IdRegle                    AS id,
       rapc.nom,
       rapc.description,
       rapc.wazuhRuleId,
       rapc.severite,
       rapc.dateCreation,
       rapc.XmlWazuh                   AS xml,
       CONCAT(u.prenom, ' ', u.nom)    AS consultantName
     FROM RegleAjouteParConsultant rapc
     JOIN Utilisateur u ON rapc.IdConsultant = u.IdUtilisateur
     ORDER BY rapc.dateCreation DESC`
  );

  return NextResponse.json(rows);
}