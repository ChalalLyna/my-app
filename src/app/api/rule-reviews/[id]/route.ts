import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import pool from "@/lib/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { syncCoverage } from "@/lib/coverage-sync";

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (payload.role !== "consultant" && payload.role !== "admin") {
    return NextResponse.json({ error: "Forbidden — consultants only." }, { status: 403 });
  }

  const { id }           = await params;
  const { status, comment } = await req.json();

  if (status !== "approved" && status !== "rejected") {
    return NextResponse.json({ error: "Status must be 'approved' or 'rejected'." }, { status: 400 });
  }

  // UPDATE only if still pending — the WHERE clause acts as the concurrency guard
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE RegleAjouteeParApprenant
     SET statut = ?, IdConsultant = ?, dateRevision = NOW(), commentaire = ?
     WHERE IdRegle = ? AND statut = 'pending'`,
    [status, payload.idUtilisateur, comment ?? null, id]
  );

  if (result.affectedRows === 0) {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT IdRegle FROM RegleAjouteeParApprenant WHERE IdRegle = ?",
      [id]
    );
    if (!rows.length) {
      return NextResponse.json({ error: "Review not found." }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Cette soumission a déjà été traitée et ne peut plus être modifiée." },
      { status: 409 }
    );
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
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
     WHERE rapa.IdRegle = ?`,
    [id]
  );

  if (status === "approved" && rows[0]?.xml)
    syncCoverage(rows[0].id as number, rows[0].xml as string)
      .catch((e) => console.error("Coverage sync:", e));

  return NextResponse.json(rows[0]);
}