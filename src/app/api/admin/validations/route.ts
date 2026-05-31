import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { RowDataPacket } from "mysql2";

function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") return null;
  return payload;
}

export async function GET(req: NextRequest) {
  if (!requireAdmin(req))
    return NextResponse.json({ error: "Access denied." }, { status: 403 });

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
       rapa.IdRegle                    AS id,
       rapa.nom                        AS ruleName,
       rapa.filename,
       rapa.action,
       rapa.statut                     AS status,
       rapa.dateCreation,
       rapa.dateRevision,
       rapa.commentaire,
       rapa.XmlWazuh                   AS xml,
       rapa.severite,
       CONCAT(ua.prenom, ' ', ua.nom)  AS apprenantName,
       CONCAT(uc.prenom, ' ', uc.nom)  AS consultantName
     FROM RegleAjouteeParApprenant rapa
     JOIN Utilisateur ua ON rapa.IdApprenant  = ua.IdUtilisateur
     JOIN Utilisateur uc ON rapa.IdConsultant = uc.IdUtilisateur
     WHERE rapa.statut IN ('approved', 'rejected')
     ORDER BY rapa.dateRevision DESC`
  );

  return NextResponse.json(rows);
}