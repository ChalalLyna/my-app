import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

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

  try {
    const [rows] = await pool.query(
      `SELECT
         a.IdAttaque                      AS id,
         a.DateExecution                  AS dateExecution,
         a.statut,
         a.type,
         t.mitreID,
         t.nom                            AS techniqueName,
         t.tactique,
         MIN(act.nom)                     AS actifNom,
         MIN(act.\`catégorie\`)           AS actifCategorie,
         MIN(mv.IP)                       AS actifIP,
         MIN(mv.OS)                       AS actifOS,
         ra.description                   AS resultatDescription,
         ra.rapport,
         u.nom                            AS userNom,
         u.prenom                         AS userPrenom,
         u.role                           AS userRole
       FROM LabApprentissage la
       JOIN Attaque          a   ON la.IdAttaque   = a.IdAttaque
       JOIN Technique        t   ON la.IdTechnique = t.IdTechnique
       JOIN Actif            act ON la.IdActif     = act.IdActif
       JOIN MachineVirtuelle mv  ON act.IdVM       = mv.IdVM
       JOIN ResultatAttaque  ra  ON a.IdResultatAttaque = ra.IdResultatAttaque
       JOIN Utilisateur      u   ON la.IdUtilisateur    = u.IdUtilisateur
       GROUP BY a.IdAttaque, a.DateExecution, a.statut, a.type,
                t.mitreID, t.nom, t.tactique,
                ra.description, ra.rapport,
                u.nom, u.prenom, u.role
       ORDER BY a.DateExecution DESC`
    );

    const attacks = (rows as any[]).map((r) => ({
      id:                  Number(r.id),
      dateExecution:       r.dateExecution ?? null,
      statut:              r.statut ?? "",
      type:                r.type ?? "",
      mitreID:             r.mitreID ?? "",
      techniqueName:       r.techniqueName ?? "",
      tactique:            r.tactique ?? "",
      actifNom:            r.actifNom ?? "",
      actifCategorie:      r.actifCategorie ?? "",
      actifIP:             r.actifIP ?? "",
      actifOS:             r.actifOS ?? "",
      resultatDescription: r.resultatDescription ?? "",
      rapport:             r.rapport ?? null,
      userNom:             r.userNom ?? "",
      userPrenom:          r.userPrenom ?? "",
      userRole:            r.userRole ?? "",
    }));

    return NextResponse.json(attacks);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
