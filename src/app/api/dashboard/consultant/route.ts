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
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "consultant") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = user.idUtilisateur;

  const [
    [missionStats],
    [attackStats],
    [reviewStats],
    [exportStats],
    recentMissions,
    recentAttacks,
    pendingReviews,
    recentExports,
  ] = await Promise.all([

    // ── Mission stats ──────────────────────────────────────────────
    pool.query<RowDataPacket[]>(
      `SELECT
         COUNT(*)                                                          AS total,
         SUM(statut = 'In Progress')                                       AS enCours,
         SUM(statut = 'Completed')                                         AS terminees,
         SUM(statut = 'Planned')                                           AS planifiees
       FROM Mission WHERE IdConsultant = ?`,
      [id]
    ),

    // ── Lab attack stats (LabAmelioration = consultant hors mission) ─
    pool.query<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT lam.IdAttaque) AS total
       FROM LabAmelioration lam WHERE lam.IdUtilisateur = ?`,
      [id]
    ),

    // ── Rule review stats (all pending = to do; reviewed by me) ──────
    pool.query<RowDataPacket[]>(
      `SELECT
         SUM(statut = 'pending')                                           AS pending,
         SUM(statut != 'pending' AND IdConsultant = ${id})                 AS reviewedByMe
       FROM RegleAjouteeParApprenant`
    ),

    // ── Rules exported to clients across all my missions ─────────────
    pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM RegleExportee re
       JOIN Mission m ON re.IdMission = m.IdMission
       WHERE m.IdConsultant = ?`,
      [id]
    ),

    // ── Recent missions (5) ───────────────────────────────────────────
    pool.query<RowDataPacket[]>(
      `SELECT
         m.IdMission   AS id,
         m.titre       AS name,
         m.type,
         m.client      AS target,
         m.statut      AS status,
         m.DateDebut   AS createdAt,
         m.DateFin     AS completedAt,
         (SELECT COUNT(*) FROM LabMission lm WHERE lm.IdMission = m.IdMission) AS attackCount
       FROM Mission m
       WHERE m.IdConsultant = ?
       ORDER BY m.DateDebut DESC, m.IdMission DESC
       LIMIT 5`,
      [id]
    ),

    // ── Recent lab attacks (5) ────────────────────────────────────────
    pool.query<RowDataPacket[]>(
      `SELECT
         a.IdAttaque       AS id,
         a.DateExecution   AS date,
         a.statut,
         t.mitreID,
         t.nom             AS techniqueName,
         act.nom           AS actifNom
       FROM LabAmelioration lam
       JOIN Attaque   a   ON lam.IdAttaque   = a.IdAttaque
       JOIN Technique t   ON lam.IdTechnique = t.IdTechnique
       JOIN Actif     act ON lam.IdActif     = act.IdActif
       WHERE lam.IdUtilisateur = ?
       ORDER BY a.DateExecution DESC
       LIMIT 5`,
      [id]
    ),

    // ── Pending rule reviews (5 most recent) ─────────────────────────
    pool.query<RowDataPacket[]>(
      `SELECT
         rapa.IdRegle           AS id,
         rapa.nom               AS ruleName,
         rapa.dateCreation,
         rapa.severite,
         CONCAT(u.prenom, ' ', u.nom) AS submittedBy
       FROM RegleAjouteeParApprenant rapa
       JOIN Utilisateur u ON rapa.IdApprenant = u.IdUtilisateur
       WHERE rapa.statut = 'pending'
       ORDER BY rapa.dateCreation DESC
       LIMIT 5`
    ),

    // ── Recent exports (5) ────────────────────────────────────────────
    pool.query<RowDataPacket[]>(
      `SELECT
         re.DateExport,
         m.titre AS missionName,
         COALESCE(cti.Titre, rapc.nom, rapa.nom) AS ruleTitle,
         COALESCE(cti.Severite, rapc.severite, rapa.severite) AS severite
       FROM RegleExportee re
       JOIN Mission m ON re.IdMission = m.IdMission
       LEFT JOIN RegleCTI                 cti  ON re.IdRegle = cti.IdRegle
       LEFT JOIN RegleAjouteParConsultant rapc ON re.IdRegle = rapc.IdRegle
       LEFT JOIN RegleAjouteeParApprenant rapa ON re.IdRegle = rapa.IdRegle
       WHERE m.IdConsultant = ?
       ORDER BY re.DateExport DESC
       LIMIT 5`,
      [id]
    ),
  ]);

  const ms  = (missionStats as RowDataPacket[])[0];
  const as_ = (attackStats  as RowDataPacket[])[0];
  const rs  = (reviewStats  as RowDataPacket[])[0];
  const es  = (exportStats  as RowDataPacket[])[0];

  return NextResponse.json({
    stats: {
      missions:    { total: Number(ms.total), enCours: Number(ms.enCours ?? 0), terminees: Number(ms.terminees ?? 0), planifiees: Number(ms.planifiees ?? 0) },
      labAttacks:  Number(as_.total ?? 0),
      pendingReviews: Number(rs.pending ?? 0),
      reviewedByMe:   Number(rs.reviewedByMe ?? 0),
      rulesExported:  Number(es.total ?? 0),
    },
    recentMissions:  (recentMissions  as RowDataPacket[]),
    recentAttacks:   (recentAttacks   as RowDataPacket[]),
    pendingReviews:  (pendingReviews  as RowDataPacket[]),
    recentExports:   (recentExports   as RowDataPacket[]),
  });
}
